"use client"

import * as React from "react"
import { ClipboardList, Download } from "lucide-react"

import { useCan } from "@/features/auth"
import { useAuditLogs, AUDIT_ACTION_LABEL, AUDIT_ENTITY_LABEL } from "@/features/audit"
import { auditApi } from "@/features/audit"
import { useActiveStoreId } from "@/features/auth"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState, ErrorState, PaginationBar } from "@/components/shared"
import { formatDateTime } from "@/lib/format"
import { toast } from "sonner"

const ACTION_OPTIONS: Record<string, string> = {
  ALL:                "Todas as ações",
  "product.created":  "Produto criado",
  "product.updated":  "Produto atualizado",
  "product.deleted":  "Produto excluído",
  "user.invited":     "Usuário convidado",
  "settings.updated": "Configurações alteradas",
  "payment.refunded": "Reembolso processado",
}

const ENTITY_OPTIONS: Record<string, string> = {
  ALL:      "Todos os tipos",
  Product:  "Produto",
  User:     "Usuário",
  Settings: "Configurações",
  Payment:  "Pagamento",
  Order:    "Pedido",
}

function ActionBadge({ action }: { action: string }) {
  const label = AUDIT_ACTION_LABEL[action] ?? action
  const colorClass =
    action.endsWith(".deleted")  ? "bg-destructive/10 text-destructive" :
    action.endsWith(".created")  ? "bg-green-500/10 text-green-700 dark:text-green-400" :
    action.endsWith(".refunded") ? "bg-orange-500/10 text-orange-700 dark:text-orange-400" :
    "bg-muted text-muted-foreground"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}

export default function AuditPage() {
  const storeId   = useActiveStoreId()
  const canExport = useCan("reports:export")

  const [page,       setPage]       = React.useState(1)
  const [action,     setAction]     = React.useState("ALL")
  const [entityType, setEntityType] = React.useState("ALL")
  const [from,       setFrom]       = React.useState("")
  const [to,         setTo]         = React.useState("")
  const [exporting,  setExporting]  = React.useState(false)

  const params = {
    page,
    limit:      50,
    action:     action !== "ALL" ? action : undefined,
    entityType: entityType !== "ALL" ? entityType : undefined,
    from:       from || undefined,
    to:         to   || undefined,
  }

  const logs = useAuditLogs(params)

  const handleFilterChange = (key: "action" | "entityType", value: string | null) => {
    if (!value) return
    if (key === "action")     setAction(value)
    if (key === "entityType") setEntityType(value)
    setPage(1)
  }

  const handleExportCsv = async () => {
    if (!canExport) return
    setExporting(true)
    try {
      // Fetch all records (up to 5000) for export
      const data = await auditApi.list(storeId, { ...params, page: 1, limit: 5000 })
      const rows = data.items.map((log) => [
        formatDateTime(log.createdAt),
        log.user?.name  ?? "Sistema",
        log.user?.email ?? "—",
        AUDIT_ACTION_LABEL[log.action] ?? log.action,
        AUDIT_ENTITY_LABEL[log.entityType] ?? log.entityType,
        log.entityRef ?? "—",
        log.entityId  ?? "—",
      ])

      const header = ["Data/Hora", "Usuário", "E-mail", "Ação", "Tipo", "Referência", "ID da Entidade"]
      const csvContent = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n")

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
      const url  = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href     = url
      link.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Erro ao exportar log de auditoria.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Auditoria"
        description="Registro imutável de todas as ações significativas do sistema."
        actions={
          canExport ? (
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exporting}>
              <Download data-icon="inline-start" />
              {exporting ? "Exportando…" : "Exportar CSV"}
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={action} onValueChange={(v) => handleFilterChange("action", v)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ACTION_OPTIONS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityType} onValueChange={(v) => handleFilterChange("entityType", v)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ENTITY_OPTIONS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1) }}
          className="w-40"
          placeholder="De"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1) }}
          className="w-40"
          placeholder="Até"
        />
        {(action !== "ALL" || entityType !== "ALL" || from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setAction("ALL"); setEntityType("ALL"); setFrom(""); setTo(""); setPage(1) }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {logs.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : logs.isError ? (
        <ErrorState error={logs.error} onRetry={() => logs.refetch()} />
      ) : logs.data && logs.data.items.length > 0 ? (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Data/hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Referência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.data.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{log.user?.name ?? <span className="text-muted-foreground">Sistema</span>}</p>
                      {log.user?.email && (
                        <p className="text-xs text-muted-foreground">{log.user.email}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={log.action} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {AUDIT_ENTITY_LABEL[log.entityType] ?? log.entityType}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.entityRef ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar pagination={logs.data.pagination} onPageChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum registro de auditoria"
          description="As ações do sistema aparecem aqui conforme forem executadas — criação de produtos, reembolsos, convites de usuário e alterações de configuração."
        />
      )}
    </div>
  )
}
