import "server-only"
/**
 * Smart alert checker — called by the client every 5 minutes while the app
 * is in focus. Creates in-app (+ push) notifications for orders that have
 * been stuck too long:
 *   • PENDING  > 15 min → "Pedido sem confirmação"
 *   • CONFIRMED > 45 min → "Pedido sem atualização"
 *
 * Uses a Notification de-dup check: only fires once per orderId per type to
 * avoid notification spam. The check reads the existing "SYSTEM" notifications
 * for that storeId to see if an alert was already sent.
 */
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { notificationRepository, pushSubscriptionRepository } from "@/server/repositories"
import { requireAuth, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { sendPushToSubscription, isPushConfigured, type PushSubscriptionKeys } from "@/server/lib/push"
import { logger } from "@/server/lib/logger"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

const PENDING_THRESHOLD_MS  = 15 * 60 * 1000  // 15 minutes
const CONFIRMED_THRESHOLD_MS = 45 * 60 * 1000 // 45 minutes

async function handleCheckAlerts(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:view")

  const now = new Date()

  // Fetch stale PENDING orders
  const stuckPending = await prisma.order.findMany({
    where: {
      storeId,
      status: "PENDING",
      createdAt: { lte: new Date(now.getTime() - PENDING_THRESHOLD_MS) },
    },
    select: { id: true, number: true, createdAt: true },
    take: 10,
  })

  // Fetch stale CONFIRMED orders
  const stuckConfirmed = await prisma.order.findMany({
    where: {
      storeId,
      status: "CONFIRMED",
      createdAt: { lte: new Date(now.getTime() - CONFIRMED_THRESHOLD_MS) },
    },
    select: { id: true, number: true, createdAt: true },
    take: 10,
  })

  if (stuckPending.length === 0 && stuckConfirmed.length === 0) {
    return ok({ fired: 0 })
  }

  // Load existing SYSTEM notifications in the last 24 h to de-dup
  const recentAlerts = await prisma.notification.findMany({
    where: {
      storeId,
      type: "SYSTEM",
      createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    select: { metadata: true },
  })

  const alreadyAlerted = new Set<string>(
    recentAlerts
      .map((n) => (n.metadata as Record<string, unknown>)?.alertKey as string)
      .filter(Boolean),
  )

  let fired = 0

  const toFire: { title: string; body: string; link: string; alertKey: string; orderId: string }[] = []

  for (const order of stuckPending) {
    const alertKey = `pending-${order.id}`
    if (alreadyAlerted.has(alertKey)) continue
    const mins = Math.floor((now.getTime() - order.createdAt.getTime()) / 60_000)
    toFire.push({
      title:    `Pedido #${order.number} aguardando confirmação`,
      body:     `Sem confirmação há ${mins} minutos.`,
      link:     `/orders/${order.id}`,
      alertKey,
      orderId:  order.id,
    })
  }

  for (const order of stuckConfirmed) {
    const alertKey = `confirmed-${order.id}`
    if (alreadyAlerted.has(alertKey)) continue
    const mins = Math.floor((now.getTime() - order.createdAt.getTime()) / 60_000)
    toFire.push({
      title:    `Pedido #${order.number} sem atualização`,
      body:     `Confirmado há ${mins} minutos sem entrar em preparo.`,
      link:     `/orders/${order.id}`,
      alertKey,
      orderId:  order.id,
    })
  }

  if (toFire.length === 0) return ok({ fired: 0 })

  // Get push subscriptions once
  const pushSubs = isPushConfigured()
    ? await pushSubscriptionRepository.findByStore(prisma, storeId)
    : []

  await Promise.allSettled(
    toFire.map(async (alert) => {
      try {
        await notificationRepository.create(prisma, {
          storeId,
          type:  "SYSTEM",
          title: alert.title,
          body:  alert.body,
          link:  alert.link,
          metadata: { alertKey: alert.alertKey, orderId: alert.orderId },
        })
        fired++

        // Send push
        if (pushSubs.length > 0) {
          await Promise.allSettled(
            pushSubs.map(async (sub: PushSubscriptionKeys & { id: string }) => {
              const result = await sendPushToSubscription(sub, {
                title: alert.title,
                body:  alert.body,
                url:   alert.link,
                tag:   "alert",
              })
              if (result === "expired") {
                await pushSubscriptionRepository.deleteExpired(prisma, sub.id)
              }
            }),
          )
        }
      } catch (err) {
        logger.warn("alerts.check.fire", { alertKey: alert.alertKey, error: String(err) })
      }
    }),
  )

  return ok({ fired })
}

export const POST = compose(withRequestContext, withErrorHandling)(handleCheckAlerts)
