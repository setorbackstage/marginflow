"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { useAuth, useCan, useSetApprovalPassword } from "@/features/auth"
import {
  useStore,
  useUpdateStore,
  useStoreSettings,
  useUpdateStoreSettings,
  useRoles,
} from "@/features/stores"
import { TeamSection } from "@/features/team"
import type { WeeklySchedule, DaySchedule } from "@/types/common"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ErrorState, PhoneInput, ImageUploadInput } from "@/components/shared"
import { SharePanel } from "@/features/public-menu"
import { IntegrationsSection } from "@/features/integrations"
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

function BrandingSection() {
  const canEdit = useCan("store:edit")
  const canEditSettings = useCan("settings:edit")
  const store = useStore()
  const settings = useStoreSettings()
  const updateStore = useUpdateStore()
  const updateSettings = useUpdateStoreSettings()

  const initialForm = React.useMemo(
    () => ({
      name: store.data?.name ?? "",
      logoUrl: store.data?.logoUrl ?? "",
      primaryColor: settings.data?.primaryColor ?? "",
      secondaryColor: settings.data?.secondaryColor ?? "",
      menuBannerUrl: settings.data?.menuBannerUrl ?? "",
      description: settings.data?.description ?? "",
      instagramHandle: settings.data?.instagramHandle ?? "",
      whatsappNumber: settings.data?.whatsappNumber ?? "",
    }),
    [store.data, settings.data],
  )
  const [form, setForm] = useSyncedState(initialForm)
  const setField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((f) => ({ ...f, [key]: value }))

  if (store.isLoading || settings.isLoading)
    return <Skeleton className="h-96 w-full" />
  if (store.isError || !store.data)
    return <ErrorState error={store.error} onRetry={() => store.refetch()} />
  if (settings.isError || !settings.data)
    return (
      <ErrorState error={settings.error} onRetry={() => settings.refetch()} />
    )

  const isPending = updateStore.isPending || updateSettings.isPending
  const canSave = canEdit || canEditSettings

  const handleSave = () => {
    if (canEdit)
      updateStore.mutate({ name: form.name, logoUrl: form.logoUrl || null })
    if (canEditSettings) {
      updateSettings.mutate({
        primaryColor: form.primaryColor || null,
        secondaryColor: form.secondaryColor || null,
        menuBannerUrl: form.menuBannerUrl || null,
        description: form.description || null,
        instagramHandle: form.instagramHandle || null,
        whatsappNumber: form.whatsappNumber || null,
      })
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Identidade da loja</CardTitle>
          <CardDescription>
            Aparece no login, na barra lateral, no painel e no cardápio público.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="brand-name" className="mb-1.5">
                Nome fantasia
              </Label>
              <Input
                id="brand-name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label className="mb-1.5">Logo</Label>
              <ImageUploadInput
                storeId={store.data.id}
                type="logo"
                value={form.logoUrl || null}
                onChange={(url) => setField("logoUrl", url ?? "")}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="brand-primary-color" className="mb-1.5">
                Cor principal
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Selecionar cor principal"
                  className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-input disabled:cursor-not-allowed disabled:opacity-50"
                  value={
                    /^#[0-9A-Fa-f]{6}$/.test(form.primaryColor)
                      ? form.primaryColor
                      : "#1c6fd2"
                  }
                  onChange={(e) => setField("primaryColor", e.target.value)}
                  disabled={!canEditSettings}
                />
                <Input
                  id="brand-primary-color"
                  placeholder="#1c6fd2"
                  value={form.primaryColor}
                  onChange={(e) => setField("primaryColor", e.target.value)}
                  disabled={!canEditSettings}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="brand-secondary-color" className="mb-1.5">
                Cor secundária
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Selecionar cor secundária"
                  className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-input disabled:cursor-not-allowed disabled:opacity-50"
                  value={
                    /^#[0-9A-Fa-f]{6}$/.test(form.secondaryColor)
                      ? form.secondaryColor
                      : "#64748b"
                  }
                  onChange={(e) => setField("secondaryColor", e.target.value)}
                  disabled={!canEditSettings}
                />
                <Input
                  id="brand-secondary-color"
                  placeholder="#64748b"
                  value={form.secondaryColor}
                  onChange={(e) => setField("secondaryColor", e.target.value)}
                  disabled={!canEditSettings}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5">Banner do cardápio</Label>
              <ImageUploadInput
                storeId={store.data.id}
                type="banner"
                value={form.menuBannerUrl || null}
                onChange={(url) => setField("menuBannerUrl", url ?? "")}
                disabled={!canEditSettings}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="brand-description" className="mb-1.5">
                Descrição
              </Label>
              <Input
                id="brand-description"
                placeholder="Uma frase sobre a sua loja"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                disabled={!canEditSettings}
              />
            </div>
            <div>
              <Label htmlFor="brand-instagram" className="mb-1.5">
                Instagram
              </Label>
              <Input
                id="brand-instagram"
                placeholder="@sualoja"
                value={form.instagramHandle}
                onChange={(e) => setField("instagramHandle", e.target.value)}
                disabled={!canEditSettings}
              />
            </div>
            <div>
              <Label htmlFor="brand-whatsapp" className="mb-1.5">
                WhatsApp
              </Label>
              <PhoneInput
                id="brand-whatsapp"
                value={form.whatsappNumber}
                onChange={(value) => setField("whatsappNumber", value)}
                disabled={!canEditSettings}
              />
            </div>
          </div>
          {canSave ? (
            <Button size="sm" disabled={isPending} onClick={handleSave}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Salvar
            </Button>
          ) : null}
        </CardContent>
      </Card>
      <SharePanel slug={store.data.slug} />
    </>
  )
}

function StoreInfoSection() {
  const canEdit = useCan("store:edit")
  const store = useStore()
  const update = useUpdateStore()
  const initialForm = React.useMemo(
    () => ({ phone: store.data?.phone ?? "", email: store.data?.email ?? "" }),
    [store.data],
  )
  const [{ phone, email }, setForm] = useSyncedState(initialForm)
  const setPhone = (phone: string) => setForm((f) => ({ ...f, phone }))
  const setEmail = (email: string) => setForm((f) => ({ ...f, email }))

  if (store.isLoading) return <Skeleton className="h-48 w-full" />
  if (store.isError || !store.data)
    return <ErrorState error={store.error} onRetry={() => store.refetch()} />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Dados de contato</CardTitle>
        <CardDescription>
          Usados nas notificações e no atendimento ao cliente. O nome fantasia
          fica em Marca.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="store-phone" className="mb-1.5">
              Telefone
            </Label>
            <PhoneInput
              id="store-phone"
              value={phone}
              onChange={setPhone}
              disabled={!canEdit}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="store-email" className="mb-1.5">
              E-mail
            </Label>
            <Input
              id="store-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!canEdit}
            />
          </div>
        </div>
        {canEdit ? (
          <Button
            size="sm"
            disabled={update.isPending}
            onClick={() => update.mutate({ phone, email })}
          >
            {update.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Salvar
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: { isOpen: true, slots: [{ open: "09:00", close: "18:00" }] },
  tuesday: { isOpen: true, slots: [{ open: "09:00", close: "18:00" }] },
  wednesday: { isOpen: true, slots: [{ open: "09:00", close: "18:00" }] },
  thursday: { isOpen: true, slots: [{ open: "09:00", close: "18:00" }] },
  friday: { isOpen: true, slots: [{ open: "09:00", close: "18:00" }] },
  saturday: { isOpen: false, slots: [] },
  sunday: { isOpen: false, slots: [] },
}

function OperatingHoursSection() {
  const canEdit = useCan("store:edit")
  const store = useStore()
  const update = useUpdateStore()
  const [schedule, setSchedule] = useSyncedState<WeeklySchedule>(
    (store.data?.operatingHours as WeeklySchedule | null) ?? DEFAULT_SCHEDULE,
  )

  if (store.isLoading) return <Skeleton className="h-64 w-full" />

  const updateDay = (
    day: keyof WeeklySchedule,
    patch: Partial<DaySchedule>,
  ) => {
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }))
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
            <div
              key={key}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-2.5"
            >
              <Switch
                checked={day.isOpen}
                disabled={!canEdit}
                onCheckedChange={(checked) =>
                  updateDay(key, {
                    isOpen: checked,
                    slots: checked ? [slot] : [],
                  })
                }
              />
              <span className="w-20 text-sm font-medium">{label}</span>
              {day.isOpen ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    className="w-28"
                    value={slot.open}
                    disabled={!canEdit}
                    onChange={(e) =>
                      updateDay(key, {
                        slots: [{ ...slot, open: e.target.value }],
                      })
                    }
                  />
                  <span className="text-muted-foreground">até</span>
                  <Input
                    type="time"
                    className="w-28"
                    value={slot.close}
                    disabled={!canEdit}
                    onChange={(e) =>
                      updateDay(key, {
                        slots: [{ ...slot, close: e.target.value }],
                      })
                    }
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Fechado</span>
              )}
            </div>
          )
        })}
        {canEdit ? (
          <Button
            size="sm"
            className="mt-2"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({ operatingHours: schedule })
            }
          >
            {update.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Salvar horários
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

const SETTINGS_TOGGLES: {
  key:
    | "autoConfirmOrders"
    | "allowScheduledOrders"
    | "acceptsCash"
    | "acceptsCard"
    | "acceptsPix"
    | "acceptsVoucher"
    | "acceptsOnlinePayment"
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
  if (settings.isError || !settings.data)
    return (
      <ErrorState error={settings.error} onRetry={() => settings.refetch()} />
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Configurações operacionais</CardTitle>
        <CardDescription>
          Regras de operação e métodos de pagamento aceitos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {SETTINGS_TOGGLES.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border p-2.5"
          >
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

function ApprovalPasswordSection() {
  const setApprovalPassword = useSetApprovalPassword()
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newApprovalPassword, setNewApprovalPassword] = React.useState("")
  const [confirmApprovalPassword, setConfirmApprovalPassword] = React.useState("")

  const mismatch =
    confirmApprovalPassword.length > 0 && newApprovalPassword !== confirmApprovalPassword
  const canSubmit =
    currentPassword.length > 0 && newApprovalPassword.length >= 8 && !mismatch

  const handleSubmit = () => {
    setApprovalPassword.mutate(
      { currentPassword, newApprovalPassword },
      {
        onSuccess: () => {
          setCurrentPassword("")
          setNewApprovalPassword("")
          setConfirmApprovalPassword("")
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Senha de aprovação</CardTitle>
        <CardDescription>
          Usada apenas para aprovar no balcão o cancelamento de pedidos já em
          preparo (Regra de Negócio 46). É diferente da sua senha de login —
          nunca compartilhe esta última com a equipe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="approval-current-password" className="mb-1.5">
              Senha de login atual
            </Label>
            <Input
              id="approval-current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="approval-new-password" className="mb-1.5">
              Nova senha de aprovação
            </Label>
            <Input
              id="approval-new-password"
              type="password"
              autoComplete="new-password"
              value={newApprovalPassword}
              onChange={(e) => setNewApprovalPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="approval-confirm-password" className="mb-1.5">
              Confirmar senha de aprovação
            </Label>
            <Input
              id="approval-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmApprovalPassword}
              onChange={(e) => setConfirmApprovalPassword(e.target.value)}
            />
            {mismatch ? (
              <p className="mt-1 text-xs text-destructive">As senhas não coincidem.</p>
            ) : null}
          </div>
        </div>
        <Button
          size="sm"
          disabled={!canSubmit || setApprovalPassword.isPending}
          onClick={handleSubmit}
        >
          {setApprovalPassword.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          Salvar senha de aprovação
        </Button>
      </CardContent>
    </Card>
  )
}

function RolesSection() {
  const roles = useRoles()

  if (roles.isLoading) return <Skeleton className="h-48 w-full" />
  if (roles.isError)
    return <ErrorState error={roles.error} onRetry={() => roles.refetch()} />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Perfis disponíveis</CardTitle>
        <CardDescription>
          Cada perfil já vem com as permissões certas para a função.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {roles.data?.map((role) => (
          <div
            key={role.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div>
              <p className="text-sm font-medium">{role.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {role.permissions.length} permissões
              </p>
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

const RECEIPT_FORMAT_LABELS: Record<string, string> = {
  THERMAL_58MM: "58 mm (bobina pequena)",
  THERMAL_80MM: "80 mm (bobina padrão)",
  A4: "A4 (impressora comum)",
}

function PrintSettingsSection() {
  const canEdit = useCan("settings:edit")
  const settings = useStoreSettings()
  const update = useUpdateStoreSettings()

  if (settings.isLoading) return <Skeleton className="h-48 w-full" />
  if (settings.isError || !settings.data)
    return (
      <ErrorState error={settings.error} onRetry={() => settings.refetch()} />
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Configurações de impressão</CardTitle>
        <CardDescription>
          Defina a largura do papel da sua impressora e o comportamento de impressão automática.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="receipt-format" className="mb-1.5">
            Largura do papel
          </Label>
          <Select
            value={settings.data.receiptFormat}
            onValueChange={(val) => {
              if (!val) return
              update.mutate({ receiptFormat: val as "A4" | "THERMAL_80MM" | "THERMAL_58MM" })
            }}
            disabled={!canEdit || update.isPending}
            items={RECEIPT_FORMAT_LABELS}
          >
            <SelectTrigger id="receipt-format" className="w-56">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RECEIPT_FORMAT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            A impressora de cada dispositivo determina o tamanho real do papel. Configure aqui o formato do comprovante.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Impressão automática</p>
          <p className="text-xs text-muted-foreground">
            Quando ativado, abre o diálogo de impressão automaticamente ao chegar um novo pedido.
          </p>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor="print-kitchen" className="text-sm font-normal">
                Comanda da cozinha
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Itens, quantidades e observações em letra grande. Sem preços.
              </p>
            </div>
            <Switch
              id="print-kitchen"
              checked={settings.data.printKitchenTicketOnConfirm}
              disabled={!canEdit || update.isPending}
              onCheckedChange={(checked) =>
                update.mutate({ printKitchenTicketOnConfirm: checked })
              }
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor="print-receipt" className="text-sm font-normal">
                Comprovante do cliente
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Comprovante completo com itens, totais e informações do pedido.
              </p>
            </div>
            <Switch
              id="print-receipt"
              checked={settings.data.printReceiptOnConfirm}
              disabled={!canEdit || update.isPending}
              onCheckedChange={(checked) =>
                update.mutate({ printReceiptOnConfirm: checked })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface SoundPreferences {
  enabled: boolean
  volume: number
  newOrder: boolean
  payment: boolean
  delivery: boolean
  stockAlert: boolean
}

const DEFAULT_SOUNDS: SoundPreferences = {
  enabled: true,
  volume: 70,
  newOrder: true,
  payment: true,
  delivery: false,
  stockAlert: true,
}

function playAlertSound(volume: number) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime((volume / 100) * 0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.45)
    setTimeout(() => ctx.close(), 600)
  } catch {
    // AudioContext unavailable
  }
}

function NotificationsSoundsSection() {
  const canEdit = useCan("settings:edit")
  const settings = useStoreSettings()
  const update = useUpdateStoreSettings()

  const existingPrefs = settings.data?.notificationPreferences as { sounds?: SoundPreferences } | null | undefined
  const initialSounds: SoundPreferences = existingPrefs?.sounds ?? DEFAULT_SOUNDS
  const [sounds, setSounds] = useSyncedState<SoundPreferences>(initialSounds)

  if (settings.isLoading) return <Skeleton className="h-72 w-full" />
  if (settings.isError || !settings.data)
    return (
      <ErrorState error={settings.error} onRetry={() => settings.refetch()} />
    )

  const setField = <K extends keyof SoundPreferences>(key: K, value: SoundPreferences[K]) =>
    setSounds((prev) => ({ ...prev, [key]: value }))

  const handleSave = () => {
    update.mutate({
      notificationPreferences: {
        ...(settings.data.notificationPreferences ?? {}),
        sounds,
      } as Record<string, unknown>,
    })
  }

  const SOUND_TOGGLES: { key: keyof Omit<SoundPreferences, "enabled" | "volume">; label: string }[] = [
    { key: "newOrder", label: "Novo pedido" },
    { key: "payment", label: "Pagamento" },
    { key: "delivery", label: "Entrega" },
    { key: "stockAlert", label: "Estoque crítico" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Notificações & Sons</CardTitle>
        <CardDescription>
          Configure os sons de alerta para eventos importantes da loja.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-2.5">
          <Label htmlFor="sound-enabled" className="text-sm font-medium">
            Som ativado
          </Label>
          <Switch
            id="sound-enabled"
            checked={sounds.enabled}
            disabled={!canEdit || update.isPending}
            onCheckedChange={(checked) => setField("enabled", checked)}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alertas individuais</p>
          {SOUND_TOGGLES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-2.5">
              <Label htmlFor={`sound-${key}`} className="text-sm font-normal">
                {label}
              </Label>
              <Switch
                id={`sound-${key}`}
                checked={sounds[key]}
                disabled={!canEdit || !sounds.enabled || update.isPending}
                onCheckedChange={(checked) => setField(key, checked)}
              />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="sound-volume" className="text-sm">
              Volume
            </Label>
            <span className="text-sm tabular-nums text-muted-foreground">{sounds.volume}%</span>
          </div>
          <input
            id="sound-volume"
            type="range"
            min="0"
            max="100"
            value={sounds.volume}
            disabled={!canEdit || !sounds.enabled || update.isPending}
            onChange={(e) => setField("volume", Number(e.target.value))}
            className="w-full accent-primary disabled:opacity-50"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => playAlertSound(sounds.volume)}
          >
            Testar som
          </Button>
          {canEdit ? (
            <Button size="sm" disabled={update.isPending} onClick={handleSave}>
              {update.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Salvar
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const { isOwnerOrManagerAnywhere } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurações"
        description="Gerencie os dados, horários e equipe da sua loja."
      />

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">Marca</TabsTrigger>
          <TabsTrigger value="store">Loja</TabsTrigger>
          <TabsTrigger value="hours">Horários</TabsTrigger>
          <TabsTrigger value="operations">Operação</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
          <TabsTrigger value="print">Impressão</TabsTrigger>
          <TabsTrigger value="sounds">Sons</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          {isOwnerOrManagerAnywhere ? <TabsTrigger value="security">Segurança</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="branding" className="mt-4">
          <BrandingSection />
        </TabsContent>
        <TabsContent value="store" className="mt-4">
          <StoreInfoSection />
        </TabsContent>
        <TabsContent value="hours" className="mt-4">
          <OperatingHoursSection />
        </TabsContent>
        <TabsContent value="operations" className="mt-4">
          <StoreSettingsSection />
        </TabsContent>
        <TabsContent value="print" className="mt-4">
          <PrintSettingsSection />
        </TabsContent>
        <TabsContent value="sounds" className="mt-4">
          <NotificationsSoundsSection />
        </TabsContent>
        <TabsContent value="integrations" className="mt-4">
          <IntegrationsSection />
        </TabsContent>
        <TabsContent value="team" className="mt-4 space-y-4">
          <TeamSection />
          <RolesSection />
        </TabsContent>
        {isOwnerOrManagerAnywhere ? (
          <TabsContent value="security" className="mt-4">
            <ApprovalPasswordSection />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
