import "server-only"
import type { DbClient } from "../db"
import type { KitchenTicket, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/**
 * Pure data access for the `kitchen_tickets` table. No business rules
 * here. No delete method — tickets are never removed, only transitioned
 * to CANCELLED via `update`.
 */
export const kitchenTicketRepository = {
  findById(db: DbClient, id: string): Promise<KitchenTicket | null> {
    return db.kitchenTicket.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.kitchenTicket.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  findByIdWithItems(db: DbClient, id: string) {
    return db.kitchenTicket.findUnique({ where: { id }, include: { items: true } })
  },

  /** `order_id` is unique — one Kitchen Ticket per Order. */
  findByOrderId(db: DbClient, orderId: string): Promise<KitchenTicket | null> {
    return db.kitchenTicket.findUnique({ where: { orderId } })
  },

  findManyByStore(
    db: DbClient,
    storeId: string,
    params: PaginationParams & {
      where?: Prisma.KitchenTicketWhereInput
      orderBy?: Prisma.KitchenTicketOrderByWithRelationInput
    } = {},
  ) {
    return db.kitchenTicket.findMany({
      where: { storeId, ...params.where },
      orderBy: params.orderBy ?? { queuedAt: "asc" },
      skip: params.skip,
      take: params.take,
      include: { items: true },
    })
  },

  count(db: DbClient, storeId: string, where: Prisma.KitchenTicketWhereInput = {}): Promise<number> {
    return db.kitchenTicket.count({ where: { storeId, ...where } })
  },

  create(db: DbClient, data: Prisma.KitchenTicketCreateInput): Promise<KitchenTicket> {
    return db.kitchenTicket.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.KitchenTicketUpdateInput): Promise<KitchenTicket> {
    return db.kitchenTicket.update({ where: { id }, data })
  },
}
