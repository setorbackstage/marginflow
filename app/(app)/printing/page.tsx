"use client"

import * as React from "react"
import { Printer as PrinterIcon, ListChecks, Clock, FileText, Plus, Trash2, RefreshCw, XCircle, Wifi, WifiOff, Loader2, Play } from "lucide-react"
import { toast } from "sonner"

import { useCan } from "@/features/auth"
import { usePrinters, usePrintRules, usePrintJobs, usePrintTemplates, useUpdatePrintJob, useDeletePrinter, useDeletePrintRule, useQZTray, PRINTER_TYPE_LABEL, PRINTER_INTERFACE_LABEL, PRINT_JOB_STATUS_LABEL, PRINT_JOB_STATUS_COLOR, PRINT_EVENT_LABEL, PRINT_TEMPLATE_TYPE_LABEL } from "@/features/printing"

import { PageHeader } from "@/components/app-shell/page-container"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState, ErrorState, PaginationBar } from "@/components/shared"
import { formatDateTime } from "@/lib/format"

// ---------- Status badge ----------
function JobStatusBadge({ status }: { status: string }) {
  const label = PRINT_JOB_STATUS_LABEL[status] ?? status
  const color = PRINT_JOB_STATUS_COLOR[status] ?? "bg-muted text-muted-foreground"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

// ---------- QZ Tray status bar ----------
function PrintServiceStatus() {
  const qz = useQZTray()
  return (
    <div className="flex items-center gap-3 rounded-lg border px-4 py-2">
      {qz.status === "connected" ? (
        <Wifi className="size-4 text-green-500" />
      ) : qz.status === "connecting" ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : (
        <WifiOff className="size-4 text-muted-foreground" />
      )}
      <div className="flex-1">
        <p className="text-sm font-medium">
          MarginFlow Print Service
          {qz.status === "connected" && (
            <span className="ml-2 text-xs text-green-600 dark:text-green-400">● Conectado</span>
          )}
          {qz.status === "connecting" && (
            <span className="ml-2 text-xs text-muted-foreground">Conectando…</span>
          )}
          {qz.status === "disconnected" && (
            <span className="ml-2 text-xs text-muted-foreground">● Desconectado</span>
          )}
          {qz.status === "error" && (
            <span className="ml-2 text-xs text-destructive">● Erro de conexão</span>
          )}
        </p>
        {qz.error && <p className="text-xs text-destructive">{qz.error}</p>}
      </div>
      {qz.status !== "connected" ? (
        <Button size="sm" variant="outline" onClick={() => qz.connect()} disabled={qz.status === "connecting"}>
          Conectar
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => qz.disconnect()}>
          Desconectar
        </Button>
      )}
    </div>
  )
}

// ---------- Printers tab ----------
function PrintersTab({ canEdit }: { canEdit: boolean }) {
  const printers = usePrinters()
  const deletePrinter = useDeletePrinter()
  const qz = useQZTray()

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir impressora "${name}"?`)) return
    try {
      await deletePrinter.mutateAsync(id)
      toast.success("Impressora excluída.")
    } catch {
      toast.error("Erro ao excluir impressora.")
    }
  }

  const handleTest = async (name: string) => {
    try {
      await qz.testPrint(name)
      toast.success(`Teste enviado para ${name}.`)
    } catch {
      toast.error("Erro ao testar impressão. Verifique a conexão com o MarginFlow Print Service.")
    }
  }

  if (printers.isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
  if (printers.isError) return <ErrorState error={printers.error} onRetry={() => printers.refetch()} />

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" disabled>
            <Plus data-icon="inline-start" /> Adicionar Impressora
          </Button>
        </div>
      )}
      {printers.data && printers.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {printers.data.map((printer) => (
            <Card key={printer.id} className={!printer.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <PrinterIcon className="size-4 text-muted-foreground" />
                    <CardTitle className="text-sm">{printer.name}</CardTitle>
                  </div>
                  {printer.isDefault && <Badge variant="secondary" className="text-xs">Padrão</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <p>Tipo: <span className="text-foreground">{PRINTER_TYPE_LABEL[printer.type] ?? printer.type}</span></p>
                <p>Interface: <span className="text-foreground">{PRINTER_INTERFACE_LABEL[printer.interface] ?? printer.interface}</span></p>
                {printer.model && <p>Modelo: <span className="text-foreground">{printer.model}</span></p>}
                {printer.address && <p>Endereço: <span className="text-foreground font-mono">{printer.address}</span></p>}
                <p>Status: <span className={printer.isActive ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>{printer.isActive ? "Ativa" : "Inativa"}</span></p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleTest(printer.name)} disabled={qz.status !== "connected"}>
                    <Play className="size-3" /> Testar
                  </Button>
                  {canEdit && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(printer.id, printer.name)}>
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={PrinterIcon} title="Nenhuma impressora cadastrada" description="Adicione impressoras para habilitar a impressão automática de pedidos, comprovantes e etiquetas." />
      )}
    </div>
  )
}

// ---------- Rules tab ----------
function RulesTab({ canEdit }: { canEdit: boolean }) {
  const rules = usePrintRules()
  const deleteRule = useDeletePrintRule()

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta regra de impressão?")) return
    try {
      await deleteRule.mutateAsync(id)
      toast.success("Regra excluída.")
    } catch {
      toast.error("Erro ao excluir regra.")
    }
  }

  if (rules.isLoading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
  if (rules.isError) return <ErrorState error={rules.error} onRetry={() => rules.refetch()} />

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" disabled>
            <Plus data-icon="inline-start" /> Nova Regra
          </Button>
        </div>
      )}
      {rules.data && rules.data.length > 0 ? (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Impressora</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.data.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="text-sm font-medium">{PRINT_EVENT_LABEL[rule.event] ?? rule.event}</TableCell>
                  <TableCell className="text-sm">{rule.printer.name}</TableCell>
                  <TableCell className="text-sm">{rule.template.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{rule.sector ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={rule.isActive ? "default" : "secondary"}>{rule.isActive ? "Ativa" : "Inativa"}</Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(rule.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={ListChecks} title="Nenhuma regra de impressão" description="Configure regras para imprimir automaticamente quando eventos como 'Pedido confirmado' ou 'Pagamento recebido' ocorrerem." />
      )}
    </div>
  )
}

// ---------- Queue/History tab ----------
function JobsTab() {
  const [page, setPage] = React.useState(1)
  const [status, setStatus] = React.useState("ALL")
  const updateJob = useUpdatePrintJob()

  const jobs = usePrintJobs({
    page,
    limit: 50,
    status: status !== "ALL" ? status : undefined,
  })

  const handleAction = async (jobId: string, action: "retry" | "cancel") => {
    try {
      await updateJob.mutateAsync({ jobId, action })
      toast.success(action === "retry" ? "Job reiniciado." : "Job cancelado.")
    } catch {
      toast.error("Erro ao atualizar job.")
    }
  }

  if (jobs.isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
  if (jobs.isError) return <ErrorState error={jobs.error} onRetry={() => jobs.refetch()} />

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v ?? "ALL"); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="PENDING">Pendente</SelectItem>
            <SelectItem value="SENDING">Enviando</SelectItem>
            <SelectItem value="PRINTED">Impresso</SelectItem>
            <SelectItem value="ERROR">Erro</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {jobs.data && jobs.data.items.length > 0 ? (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Impressora</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.data.items.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(job.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">{job.type}</TableCell>
                    <TableCell className="text-sm">{job.printer.name}</TableCell>
                    <TableCell><JobStatusBadge status={job.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">{job.attempts}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {["ERROR", "CANCELLED"].includes(job.status) && (
                          <Button size="sm" variant="ghost" onClick={() => handleAction(job.id, "retry")} title="Retentar">
                            <RefreshCw className="size-3" />
                          </Button>
                        )}
                        {["PENDING", "ERROR"].includes(job.status) && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleAction(job.id, "cancel")} title="Cancelar">
                            <XCircle className="size-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar pagination={jobs.data.pagination} onPageChange={setPage} />
        </>
      ) : (
        <EmptyState icon={Clock} title="Nenhum job de impressão" description="Os jobs de impressão aparecem aqui conforme os pedidos e eventos forem processados." />
      )}
    </div>
  )
}

// ---------- Templates tab ----------
function TemplatesTab({ canEdit }: { canEdit: boolean }) {
  const templates = usePrintTemplates()

  if (templates.isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
  if (templates.isError) return <ErrorState error={templates.error} onRetry={() => templates.refetch()} />

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" disabled>
            <Plus data-icon="inline-start" /> Novo Template
          </Button>
        </div>
      )}
      {templates.data && templates.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.data.map((tpl) => (
            <Card key={tpl.id} className={!tpl.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <CardTitle className="text-sm">{tpl.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                <p>Tipo: <span className="text-foreground">{PRINT_TEMPLATE_TYPE_LABEL[tpl.type] ?? tpl.type}</span></p>
                <p>Status: <span className={tpl.isActive ? "text-green-600 dark:text-green-400" : ""}>{tpl.isActive ? "Ativo" : "Inativo"}</span></p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={FileText} title="Nenhum template cadastrado" description="Templates definem o layout dos documentos impressos (pedidos, comprovantes, etiquetas)." />
      )}
    </div>
  )
}

// ---------- Page ----------
export default function PrintingPage() {
  const canEdit = useCan("settings:edit")

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="MarginFlow Print"
        description="Gerencie impressoras, templates e a fila de impressão da sua loja."
      />

      <PrintServiceStatus />

      <Tabs defaultValue="printers">
        <TabsList>
          <TabsTrigger value="printers">
            <PrinterIcon className="size-4" /> Impressoras
          </TabsTrigger>
          <TabsTrigger value="rules">
            <ListChecks className="size-4" /> Regras
          </TabsTrigger>
          <TabsTrigger value="queue">
            <Clock className="size-4" /> Fila / Histórico
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="size-4" /> Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="printers" className="mt-6">
          <PrintersTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="rules" className="mt-6">
          <RulesTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="queue" className="mt-6">
          <JobsTab />
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <TemplatesTab canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
