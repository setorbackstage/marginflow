import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import type { Pagination as PaginationMeta } from "@/lib/api"

/** Prev/next pager driven by the backend's pagination envelope. No page-number jump list — keeps it simple and correct for large result sets. */
export function PaginationBar({ pagination, onPageChange }: { pagination: PaginationMeta; onPageChange: (page: number) => void }) {
  if (pagination.totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Página {pagination.page} de {pagination.totalPages} · {pagination.total} itens
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              text="Anterior"
              aria-disabled={!pagination.hasPreviousPage}
              tabIndex={pagination.hasPreviousPage ? undefined : -1}
              className={!pagination.hasPreviousPage ? "pointer-events-none opacity-50" : undefined}
              onClick={(e) => {
                e.preventDefault()
                if (pagination.hasPreviousPage) onPageChange(pagination.page - 1)
              }}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              text="Próxima"
              aria-disabled={!pagination.hasNextPage}
              tabIndex={pagination.hasNextPage ? undefined : -1}
              className={!pagination.hasNextPage ? "pointer-events-none opacity-50" : undefined}
              onClick={(e) => {
                e.preventDefault()
                if (pagination.hasNextPage) onPageChange(pagination.page + 1)
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
