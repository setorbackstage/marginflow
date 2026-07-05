"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { useCan } from "@/features/auth"
import { useStore, useUpdateStore, useStoreSettings, useUpdateStoreSettings, useRoles } from "@/features/stores"
import type { WeeklySchedule, DaySchedule } from "@/types/common"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ErrorState } from "@/components/shared"
import { useSyncedState } from "@/hooks"

const WEEKDAYS: { key: keyof WeeklySchedule; label: string }[] = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terça" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
]

function StoreInfoSection() {
  const canEdit = useCan("store:edit")
  const store = useStore()
  const update = useUpdateStore()
  const initialForm = React.useMemo(
    () => ({ name: store.data?.name ?? "", phone: store.data?.phone ?? "", email: store.data?.email ?? "" }),
    [store.data],
  )
  const [{ name, phone, email }, setForm] = useSyncedState(initialForm)
  const setName = (name: string) => setForm((f) => ({ ...f, name }))
  const setPhone = (phone: string) => setForm((f) => ({ ...f, phone }))
  const setEmail = (email: string) => setForm((f) => ({ ...f, email }))

  if (store.isLoading) return <Skeleton className="h-48 w-full" />
  if (store.isError || !store.data) return <ErrorState error={store.error} onRetry={() => store.refetch()} />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Dados da loja</CardTitle>
        <CardDescription>Informações básicas exibidas para clientes e usados nas notificações.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="store-name" className="mb-1.5">
              Nome
            </Label>
            <Input id="store-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <Label htmlFor="store-phone" className="mb-1.5">
              Telefone
            </Label>
            <Input id="store-phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="store-email" className="mb-1.5">
              E-mail
            </Label>
            <Input id="store-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!canEdit} />
          </div>
        </div>
        {canEdit ? (
          <Button size="sm" disabled={update.isPending} onClick={() => update.mutate({ name, phone, email })}>
            {update.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Salvar
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

function OperatingHoursSection() {
  const canEdit = useCan("store:edit")
  const store = useStore()
  const update = useUpdateStore()
  const [schedule, setSchedule] = useSyncedState<WeeklySchedule | null>(store.data?.operatingHours ?? null)

  if (store.isLoading || !schedule) return <Skeleton className="h-64 w-full" />

  const updateDay = (day: keyof WeeklySchedule, patch: Partial<DaySchedule>) => {
    setSchedule((prev) => (prev ? { ...prev, [day]: { ...prev[day], ...patch } } : prev))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Horário de funcionamento</CardTitle>
        <CardDescription>Um único período de abertura por dia.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {WEEKDAYS.map(({ key, label }) => {
          const day = schedule[key]
          const slot = day.slots[0] ?? { open: "09:00", close: "18:00" }
          return (
            <div key={key} className="flex flex-wrap items-center gap-3 rounded-lg border p-2.5">
              <Switch
                checked={day.isOpen}
                disabled={!canEdit}
                onCheckedChange={(checked) => updateDay(key, { isOpen: checked, slots: checked ? [slot] : [] })}
              />
              <span className="w-20 text-sm font-medium">{label}</span>
              {day.isOpen ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    className="w-28"
                    value={slot.open}
                    disabled={!canEdit}
                    onChange={(e) => updateDay(key, { slots: [{ ...slot, open: e.target.value }] })}
                  />
                  <span className="text-muted-foreground">até</span>
                  <Input
                    type="time"
                    className="w-28"
                    value={slot.close}
                    disabled={!canEdit}
                    onChange={(e) => updateDay(key, { slots: [{ ...slot, close: e.target.value }] })}
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Fechado</span>
              )}
            </div>
          )
        })}
        {canEdit ? (
          <Button size="sm" className="mt-2" disabled={update.isPending} onClick={() => schedule && update.mutate({ operatingHours: schedule })}>
            {update.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Salvar horários
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

const SETTINGS_TOGGLES: {
  key: "autoConfirmOrders" | "allowScheduledOrders" | "acceptsCash" | "acceptsCard" | "acceptsPix" | "acceptsVoucher" | "acceptsOnlinePayment"
  label: string
}[] = [
  { key: "autoConfirmOrders", label: "Confirmar pedidos automaticamente" },
  { key: "allowScheduledOrders", label: "Permitir pedidos agendados" },
  { key: "acceptsCash", label: "Aceita dinheiro" },
  { key: "acceptsCard", label: "Aceita cartão" },
  { key: "acceptsPix", label: "Aceita PIX" },
  { key: "acceptsVoucher", label: "Aceita vale" },
  { key: "acceptsOnlinePayment", label: "Aceita pagamento online" },
]

function StoreSettingsSection() {
  const canEdit = useCan("settings:edit")
  const settings = useStoreSettings()
  const update = useUpdateStoreSettings()

  if (settings.isLoading) return <Skeleton className="h-72 w-full" />
  if (settings.isError || !settings.data) return <ErrorState error={settings.error} onRetry={() => settings.refetch()} />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Configurações operacionais</CardTitle>
        <CardDescription>Regras de operação e métodos de pagamento aceitos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {SETTINGS_TOGGLES.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between rounded-lg border p-2.5">
            <Label htmlFor={`setting-${key}`} className="text-sm font-normal">
              {label}
            </Label>
            <Switch
              id={`setting-${key}`}
              checked={settings.data![key]}
              disabled={!canEdit || update.isPending}
              onCheckedChange={(checked) => update.mutate({ [key]: checked })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function RolesSection() {
  const roles = useRoles()

  if (roles.isLoading) return <Skeleton className="h-48 w-full" />
  if (roles.isError) return <ErrorState error={roles.error} onRetry={() => roles.refetch()} />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Papéis</CardTitle>
        <CardDescription>Papéis definem as permissões de cada membro da equipe.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {roles.data?.map((role) => (
          <div key={role.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{role.displayName}</p>
              <p className="text-xs text-muted-foreground">{role.permissions.length} permissões</p>
            </div>
            <Badge variant="secondary">
              {role.memberCount} {role.memberCount === 1 ? "membro" : "membros"}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configurações" description="Gerencie os dados, horários e papéis da sua loja." />

      <Tabs defaultValue="store">
        <TabsList>
          <TabsTrigger value="store">Loja</TabsTrigger>
          <TabsTrigger value="hours">Horários</TabsTrigger>
          <TabsTrigger value="operations">Operação</TabsTrigger>
          <TabsTrigger value="roles">Papéis</TabsTrigger>
        </TabsList>
        <TabsContent value="store" className="mt-4">
          <StoreInfoSection />
        </TabsContent>
        <TabsContent value="hours" className="mt-4">
          <OperatingHoursSection />
        </TabsContent>
        <TabsContent value="operations" className="mt-4">
          <StoreSettingsSection />
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <RolesSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
