/** Shared shape for `skip`/`take` pagination — reused across every repository's `findMany`. */
export interface PaginationParams {
  skip?: number
  take?: number
}
