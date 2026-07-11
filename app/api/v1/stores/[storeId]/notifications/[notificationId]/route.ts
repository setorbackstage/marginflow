import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { notificationService, authorizationService } from "@/server/services"
import { requireAuth, requireUuidParams } from "@/server/lib"
import { NotFoundError } from "@/server/lib/errors"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; notificationId: string }>
}

async function handleMarkRead(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, notificationId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:view")

  const notification = await notificationService.markRead(prisma, notificationId, storeId)
  if (!notification) throw new NotFoundError("NOTIFICATION_NOT_FOUND", "Notificação não encontrada.")
  return ok(notification)
}

async function handleDelete(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, notificationId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:view")

  const deleted = await notificationService.delete(prisma, notificationId, storeId)
  if (!deleted) throw new NotFoundError("NOTIFICATION_NOT_FOUND", "Notificação não encontrada.")
  return ok(null)
}

export const PATCH = compose(withRequestContext, withErrorHandling)(handleMarkRead)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleDelete)
