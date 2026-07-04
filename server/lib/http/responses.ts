import "server-only"
import { NextResponse } from "next/server"

/** Mirrors API_SPEC.md's "Response Envelope" pagination block exactly. */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/** Computes the pagination envelope fields from page/limit/total. Pure arithmetic — no query. */
export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

/** 200 OK — single resource envelope: `{ data }`. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, { status: 200, ...init })
}

/** 201 Created — single resource envelope: `{ data }`. */
export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 })
}

/** 204 No Content — no body. */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/** Collection envelope: `{ data, pagination }`. */
export function paginated<T>(data: T[], pagination: PaginationMeta): NextResponse {
  return NextResponse.json({ data, pagination }, { status: 200 })
}
