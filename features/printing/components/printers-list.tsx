"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Printer as PrinterIcon,
  Plus,
  Trash2,
  Play,
  Edit3,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

import {
  usePrinters,
  useCreatePrinter,
  useUpdatePrinter,
  useDeletePrinter,
  PRINTER_TYPE_LABEL,
  PRINTER_INTERFACE_LABEL,
} from "@/features/printing"
import { ConfirmDialog, EmptyState, ErrorState } from "@/components/shared"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Printer } from "./types"
import type { QZTrayState } from "./hooks/use-qz-tray"

const PRINTER_TYPE_OPTIONS = Object.keys(PRINTER_TYPE_LABEL)
const PRINTER_INTERFACE_OPTIONS = Object.keys(PRINTER_INTERFACE_LABEL)

const printerSchema = z.object({
  name: z.string().min(2, "Informe um nome (mínimo de 2 caracteres)").max(120),
  type: z.enum(
    [
      "KITCHEN",
      "BAR",
      "CONFECTIONERY",
      "CASHIER",
      "FISCAL",
      "DELIVERY",
      "EXPEDITION",
      "GENERAL",
    ],
    { error: "Selecione um tipo" },
  ),
  model: z
    .string()
    .max(120, "Máximo de 120 caracteres")
    .nullable()
    .optional(),
  interface: z.enum(
    ["USB", "NETWORK", "BLUETOOTH", "SERIAL", "VIRTUAL"],
    { error: "Selecione uma interface" },
  ),
  address: z
    .string()
    .max(255, "Máximo de 255 caracteres")
    .nullable()
    .optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

type PrinterFormValues = z.infer<typeof printerSchema>

interface PrintersListProps {
  /** Whether the store user is allowed to mutate printers. */
  canEdit?: boolean
  /** Hoisted QZ Tray handle (kept single-instance) for test prints. */
  qz?: QZTrayState
}

/** Form used for both create and edit of a printer. */
function PrinterFormDialog({
  open,
  onOpenChange,
  editing,
  isPending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Printer | null
  isPending: boolean
  onSubmit: (values: PrinterFormValues) => void
}) {
  const isEdit = Boolean(editing)
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PrinterFormValues>({
    resolver: zodResolver(printerSchema),
    defaultValues: {
      name: "",
      type: "KITCHEN",
      model: null,
      interface: "NETWORK",
      address: null,
      isDefault: false,
      isActive: true,
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        name: editing?.name ?? "",
        type: (editing?.type as PrinterFormValues["type"]) ?? "KITCHEN",
        model: editing?.model ?? null,
        interface:
          (editing?.interface as PrinterFormValues["interface"]) ?? "NETWORK",
        address: editing?.address ?? null,
        isDefault: editing?.isDefault ?? false,
        isActive: editing?.isActive ?? true,
      })
    }
    // Only re-run when the dialog opens / the record being edited changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, reset])

  const submit = handleSubmit((values) => {
    onSubmit(values)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar impressora" : "Nova impressora"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados desta impressora."
              : "Cadastre uma nova impressora para esta loja."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="printer-name">Nome</FieldLabel>
                <Input
                  id="printer-name"
                  aria-invalid={!!errors.name}
                  placeholder="Ex: Cozinha"
                  {...register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="printer-interface">Interface</FieldLabel>
                <Controller
                  control={control}
                  name="interface"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="printer-interface" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRINTER_INTERFACE_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {PRINTER_INTERFACE_LABEL[opt] ?? opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.interface]} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="printer-type">Tipo</FieldLabel>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="printer-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRINTER_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {PRINTER_TYPE_LABEL[opt] ?? opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.type]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="printer-model">Modelo (opcional)</FieldLabel>
              <Input
                id="printer-model"
                aria-invalid={!!errors.model}
                placeholder="Ex: Epson TM-T20"
                {...register("model", {
                  setValueAs: (v) =>
                    v === "" || v === null || v === undefined ? null : v,
                })}
              />
              <FieldError errors={[errors.model]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="printer-address">Endereço (opcional)</FieldLabel>
              <Input
                id="printer-address"
                aria-invalid={!!errors.address}
                placeholder="IP, porta ou porta serial"
                {...register("address", {
                  setValueAs: (v) =>
                    v === "" || v === null || v === undefined ? null : v,
                })}
              />
              <FieldError errors={[errors.address]} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="flex items-end">
                <Controller
                  control={control}
                  name="isDefault"
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
                      <Controller
                        control={control}
                        name="isDefault"
                        render={({ field: inner }) => (
                          <input
                            type="checkbox"
                            className="size-4 rounded border-input accent-primary"
                            checked={inner.value}
                            onChange={inner.onChange}
                          />
                        )}
                      />
                      Impressora padrão
                    </label>
                  )}
                />
              </Field>
              <Field className="flex items-end justify-end">
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input accent-primary"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                      Ativa
                    </label>
                  )}
                />
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? "Salvar" : "Criar impressora"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Full CRUD list for store printers. */
export function PrintersList({ canEdit, qz }: PrintersListProps) {
  const printers = usePrinters()
  const create = useCreatePrinter()
  const update = useUpdatePrinter()
  const del = useDeletePrinter()

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Printer | null>(null)
  const [deleting, setDeleting] = React.useState<Printer | null>(null)
  const pending = create.isPending || update.isPending || del.isPending

  const handleOpenCreate = () => {
    setEditing(null)
    setOpen(true)
  }
  const handleOpenEdit = (printer: Printer) => {
    setEditing(printer)
    setOpen(true)
  }
  const handleOpenDelete = (printer: Printer) => {
    setDeleting(printer)
  }
  const handleCloseForm = (next: boolean) => {
    setOpen(next)
    if (!next) setEditing(null)
  }

  const handleFormSubmit = async (values: PrinterFormValues) => {
    const payload = {
      name: values.name,
      type: values.type,
      model: values.model ?? null,
      interface: values.interface,
      address: values.address ?? null,
      isDefault: values.isDefault,
      isActive: values.isActive,
    }
    try {
      if (editing) {
        await update.mutateAsync({ printerId: editing.id, data: payload })
        toast.success("Impressora atualizada.")
      } else {
        await create.mutateAsync(payload)
        toast.success("Impressora criada.")
      }
      setOpen(false)
      setEditing(null)
    } catch {
      toast.error("Não foi possível salvar a impressora.")
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast.success("Impressora excluída.")
    } catch {
      toast.error("Erro ao excluir impressora.")
    } finally {
      setDeleting(null)
    }
  }

  const handleTest = async (name: string) => {
    if (!qz) return
    try {
      await qz.testPrint(name)
      toast.success(`Teste enviado para ${name}.`)
    } catch {
      toast.error(
        "Erro ao testar impressão. Verifique a conexão com o MarginFlow Print Service.",
      )
    }
  }

  if (printers.isLoading)
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  if (printers.isError)
    return <ErrorState error={printers.error} onRetry={() => printers.refetch()} />

  const data = printers.data ?? []

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus data-icon="inline-start" /> Adicionar impressora
          </Button>
        </div>
      )}

      <PrinterFormDialog
        open={open}
        onOpenChange={handleCloseForm}
        editing={editing}
        isPending={pending}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir impressora?"
        description={
          deleting
            ? `A impressora "${deleting.name}" será removida. Esta ação não pode ser desfeita.`
            : undefined
        }
        variant="destructive"
        isLoading={del.isPending}
        onConfirm={handleDeleteConfirm}
      />

      {data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((printer) => (
            <Card
              key={printer.id}
              className={`relative ${!printer.isActive ? "opacity-60" : ""}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <PrinterIcon className="size-4 text-muted-foreground" />
                    <CardTitle className="text-sm">{printer.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {printer.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        Padrão
                      </Badge>
                    )}
                    {!printer.isActive && (
                      <Badge variant="outline" className="text-xs">
                        Inativa
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>
                  Tipo:{" "}
                  <span className="text-foreground">
                    {PRINTER_TYPE_LABEL[printer.type] ?? printer.type}
                  </span>
                </p>
                <p>
                  Interface:{" "}
                  <span className="text-foreground">
                    {PRINTER_INTERFACE_LABEL[printer.interface] ??
                      printer.interface}
                  </span>
                </p>
                {printer.model ? (
                  <p>
                    Modelo:{" "}
                    <span className="text-foreground">{printer.model}</span>
                  </p>
                ) : null}
                {printer.address ? (
                  <p>
                    Endereço:{" "}
                    <span className="font-mono text-foreground">
                      {printer.address}
                    </span>
                  </p>
                ) : null}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleTest(printer.name)}
                    disabled={qz?.status !== "connected"}
                    title={
                      qz?.status !== "connected"
                        ? "Conecte o MarginFlow Print Service para testar"
                        : undefined
                    }
                  >
                    <Play className="size-3" /> Testar
                  </Button>
                  {canEdit && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(printer)}
                      >
                        <Edit3 className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleOpenDelete(printer)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>

              {!canEdit ? null : (
                <RefreshCw className="absolute top-2 right-2 hidden size-3 cursor-pointer text-muted-foreground hover:text-foreground md:group-hover/block" />
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={PrinterIcon}
          title="Nenhuma impressora cadastrada"
          description="Adicione impressoras para habilitar a impressão automática de pedidos, comprovantes e etiquetas."
          action={
            canEdit ? (
              <Button size="sm" onClick={handleOpenCreate}>
                <Plus data-icon="inline-start" />
                Adicionar impressora
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  )
}
