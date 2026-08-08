"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, ArrowLeft, ArrowRight } from "lucide-react"

// --- Types & Schemas ---------------------------------------------------------

const sizeSchema = z.object({
  name: z.string().min(1, "Informe o nome do tamanho"),
  price: z.preprocess((v) => Number(v), z.number().min(0)),
  skuSuffix: z.string().optional(),
})

const flavorSchema = z.object({
  name: z.string().min(1, "Informe o sabor"),
  maxSelections: z.preprocess((v) => Number(v), z.number().min(1).max(10)),
})

const addonSchema = z.object({
  name: z.string().min(1, "Informe o adicional"),
  price: z.preprocess((v) => Number(v), z.number().min(0)),
  quantity: z.preprocess((v) => Number(v), z.number().min(1)),
})

// --- Wizard Steps ---------------------------------------------------------------

type Step = "size" | "flavors" | "addons" | "review"

export interface ModifierWizardData {
  sizes: { name: string; price: number; skuSuffix?: string }[]
  flavors: { name: string; maxSelections: number }[]
  addons: { name: string; price: number; quantity: number }[]
}

// --- Step: Size Selector ------------------------------------------------------

function SizeStep({
  data,
  onNext,
}: {
  data: ModifierWizardData
  onNext: (data: ModifierWizardData) => void
}) {
  const [sizes, setSizes] = React.useState(data.sizes.length ? data.sizes : [{ name: "", price: 0 }])

  const handleSizeChange = (index: number, field: string, value: any) => {
    const newSizes = [...sizes]
    newSizes[index] = { ...newSizes[index], [field]: value }
    setSizes(newSizes)
  }

  const addSize = () => setSizes([...sizes, { name: "", price: 0 }])
  const removeSize = (index: number) => setSizes(sizes.filter((_, i) => i !== index))

  const canProceed = sizes.some((s) => s.name && s.price >= 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tamanhos (Obrigatório)</h3>
        <Button type="button" variant="outline" size="sm" onClick={addSize}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      {sizes.map((size, i) => (
        <div key={i} className="grid grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input
              placeholder="300ml"
              value={size.name}
              onChange={(e) => handleSizeChange(i, "name", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Preço (R$)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={size.price || ""}
              onChange={(e) => handleSizeChange(i, "price", Number(e.target.value))}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeSize(i)}
            disabled={sizes.length === 1}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        className="w-full"
        disabled={!canProceed}
        onClick={() => onNext({ ...data, sizes })}
      >
        <ArrowRight className="h-4 w-4 mr-2" /> Próximo: Sabores
      </Button>
    </div>
  )
}

// --- Step: Flavors ------------------------------------------------------------

function FlavorStep({
  data,
  onNext,
  onBack,
}: {
  data: ModifierWizardData
  onNext: (data: ModifierWizardData) => void
  onBack: () => void
}) {
  const [flavors, setFlavors] = React.useState(
    data.flavors.length
      ? data.flavors
      : [{ name: "", maxSelections: 1 }]
  )
  const [allowFlavors, setAllowFlavors] = React.useState(data.flavors.length > 0)

  const handleFlavorChange = (index: number, field: string, value: any) => {
    const newFlavors = [...flavors]
    newFlavors[index] = { ...newFlavors[index], [field]: value }
    setFlavors(newFlavors)
  }

  const addFlavor = () => setFlavors([...flavors, { name: "", maxSelections: 1 }])
  const removeFlavor = (index: number) => setFlavors(flavors.filter((_, i) => i !== index))

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Sabores/Bases (Obrigatório)</h3>
        <Label className="flex items-center gap-2">
          <Checkbox
            checked={allowFlavors}
            onCheckedChange={setAllowFlavors}
          />
          Permitir seleção de sabores
        </Label>
      </div>

      {allowFlavors && (
        <>
          {flavors.map((flavor, i) => (
            <div key={i} className="grid grid-cols-3 gap-3 items-end">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  placeholder="Açaí, Creme, Morango..."
                  value={flavor.name}
                  onChange={(e) => handleFlavorChange(i, "name", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Seleções máximas</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={flavor.maxSelections}
                  onChange={(e) => handleFlavorChange(i, "maxSelections", Number(e.target.value))}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFlavor(i)}
                disabled={flavors.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addFlavor}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar sabor
          </Button>
        </>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Button
          className="flex-1"
          onClick={() => onNext({ ...data, flavors: allowFlavors ? flavors : [] })}
        >
          Próximo: Adicionais <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

// --- Step: Addons ---------------------------------------------------------------

function AddonStep({
  data,
  onNext,
  onBack,
}: {
  data: ModifierWizardData
  onNext: (data: ModifierWizardData) => void
  onBack: () => void
}) {
  const [addons, setAddons] = React.useState(
    data.addons.length ? data.addons : [{ name: "", price: 0, quantity: 1 }]
  )
  const [allowAddons, setAllowAddons] = React.useState(data.addons.length > 0)

  const handleAddonChange = (index: number, field: string, value: any) => {
    const newAddons = [...addons]
    newAddons[index] = { ...newAddons[index], [field]: value }
    setAddons(newAddons)
  }

  const addAddon = () => setAddons([...addons, { name: "", price: 0, quantity: 1 }])
  const removeAddon = (index: number) => setAddons(addons.filter((_, i) => i !== index))

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Adicionais Pagos (Opcional)</h3>
        <Label className="flex items-center gap-2">
          <Checkbox checked={allowAddons} onCheckedChange={setAllowAddons} />
          Permitir adicionais pagos
        </Label>
      </div>

      {allowAddons && (
        <>
          {addons.map((addon, i) => (
            <div key={i} className="grid grid-cols-4 gap-3 items-end">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  placeholder="Nutella, Ninho, Leite..."
                  value={addon.name}
                  onChange={(e) => handleAddonChange(i, "name", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={addon.price || ""}
                  onChange={(e) => handleAddonChange(i, "price", Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label>Qtd.</Label>
                <Input
                  type="number"
                  min={1}
                  value={addon.quantity}
                  onChange={(e) => handleAddonChange(i, "quantity", Number(e.target.value))}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeAddon(i)}
                disabled={addons.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addAddon}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Button
          className="flex-1"
          onClick={() => onNext({ ...data, addons: allowAddons ? addons : [] })}
        >
          Revisar <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

// --- Step: Review ---------------------------------------------------------------

function ReviewStep({
  data,
  onBack,
  onComplete,
}: {
  data: ModifierWizardData
  onBack: () => void
  onComplete: (data: ModifierWizardData) => void
}) {
  const totalSizes = data.sizes.length
  const totalFlavors = data.flavors.length
  const totalAddons = data.addons.length

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Resumo do Produto</h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Tamanhos ({totalSizes})</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {data.sizes.map((s, i) => (
              <li key={i}>{s.name}  --  R$ {s.price.toFixed(2)}</li>
            ))}
          </ul>
        </div>

        {data.flavors.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Sabores ({totalFlavors})</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {data.flavors.map((f, i) => (
                <li key={i}>{f.name}  --  até {f.maxSelections} seleção(ões)</li>
              ))}
            </ul>
          </div>
        )}

        {data.addons.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Adicionais ({totalAddons})</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {data.addons.map((a, i) => (
                <li key={i}>{a.name}  --  R$ {a.price.toFixed(2)} (x{a.quantity})</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Button className="flex-1" onClick={() => onComplete(data)}>
          Salvar Configuração
        </Button>
      </div>
    </div>
  )
}

// --- Main Wizard ---------------------------------------------------------------

export function ModifierWizard({
  open,
  onOpenChange,
  productId,
  initialData,
  onComplete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId?: string
  initialData?: Partial<ModifierWizardData>
  onComplete?: (data: ModifierWizardData) => void
}) {
  const [step, setStep] = React.useState<Step>("size")
  const [data, setData] = React.useState<ModifierWizardData>({
    sizes: initialData?.sizes || [],
    flavors: initialData?.flavors || [],
    addons: initialData?.addons || [],
  })

  const handleStepChange = (newData: Partial<ModifierWizardData>) => {
    const updated = { ...data, ...newData }
    setData(updated)

    // Auto-advance through steps
    if (step === "size") {
      const nextData = { ...data, ...newData }
      if (nextData.sizes.length > 0) setStep("flavors")
    } else if (step === "flavors") {
      setStep("addons")
    } else if (step === "addons") {
      setStep("review")
    }
  }

  const handleNext = (newData: Partial<ModifierWizardData>) => {
    const updated = { ...data, ...newData }
    setData(updated)
    const steps: Step[] = ["size", "flavors", "addons", "review"]
    const nextIdx = steps.indexOf(step) + 1
    if (nextIdx < steps.length) setStep(steps[nextIdx])
  }

  const handleBack = () => {
    const steps: Step[] = ["size", "flavors", "addons", "review"]
    const prevIdx = steps.indexOf(step) - 1
    if (prevIdx >= 0) setStep(steps[prevIdx])
  }

  const handleComplete = (finalData: ModifierWizardData) => {
    setData(finalData)
    onComplete?.(finalData)
    onOpenChange(false)
  }

  const stepTitle: Record<Step, string> = {
    size: "Tamanho",
    flavors: "Sabores/Bases",
    addons: "Adicionais",
    review: "Revisar",
  }

  const progress = {
    size: 1,
    flavors: 2,
    addons: 3,
    review: 4,
  }[step]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Configurar Produto  --  Passo {progress}/4: {stepTitle[step]}
          </DialogTitle>
          <DialogDescription>
            {step === "size" && "Defina os tamanhos disponíveis (ex: 300ml, 500ml)"}
            {step === "flavors" && "Configure sabores/bases (máx seleções por sabor)"}
            {step === "addons" && "Adicione extras pagos (ex: Nutella +R$ 4,00)"}
            {step === "review" && "Confirme todas as configurações"}
          </DialogDescription>
        </DialogHeader>

        {step === "size" && (
          <SizeStep
            data={data}
            onNext={handleNext}
          />
        )}

        {step === "flavors" && (
          <FlavorStep
            data={data}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {step === "addons" && (
          <AddonStep
            data={data}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {step === "review" && (
          <ReviewStep
            data={data}
            onBack={handleBack}
            onComplete={handleComplete}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
