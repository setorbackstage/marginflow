"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// ─── Formatting ────────────────────────────────────────────────────────────

function applyCpfMask(digits: string): string {
  // 000.000.000-00
  const d = digits.slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`
}

function applyCnpjMask(digits: string): string {
  // 00.000.000/0000-00
  const d = digits.slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

function formatDocument(digits: string): string {
  if (digits.length <= 11) return applyCpfMask(digits)
  return applyCnpjMask(digits)
}

// ─── Validation ────────────────────────────────────────────────────────────

export function validateCpf(digits: string): boolean {
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false // all same digit

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]!) * (10 - i)
  let rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  if (rem !== parseInt(digits[9]!)) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]!) * (11 - i)
  rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  return rem === parseInt(digits[10]!)
}

export function validateCnpj(digits: string): boolean {
  if (digits.length !== 14) return false
  if (/^(\d)\1{13}$/.test(digits)) return false // all same digit

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  let sum = 0
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]!) * weights1[i]!
  let rem = sum % 11
  const check1 = rem < 2 ? 0 : 11 - rem
  if (check1 !== parseInt(digits[12]!)) return false

  sum = 0
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]!) * weights2[i]!
  rem = sum % 11
  const check2 = rem < 2 ? 0 : 11 - rem
  return check2 === parseInt(digits[13]!)
}

export function validateCpfOrCnpj(digits: string): boolean {
  if (digits.length === 11) return validateCpf(digits)
  if (digits.length === 14) return validateCnpj(digits)
  return false
}

// ─── Component ────────────────────────────────────────────────────────────

interface CpfCnpjInputProps {
  id?: string
  value: string
  onChange: (digits: string) => void // emits raw digits only (no mask)
  onBlur?: () => void
  disabled?: boolean
  "aria-invalid"?: boolean
  className?: string
  placeholder?: string
}

/**
 * Auto-masking CPF/CNPJ input. Auto-detects type: 11 digits = CPF, 14 digits = CNPJ.
 * Emits raw digits (no punctuation) to the form so validation is straightforward.
 */
export function CpfCnpjInput({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  "aria-invalid": ariaInvalid,
  className,
  placeholder = "CPF ou CNPJ",
}: CpfCnpjInputProps) {
  const digits = value.replace(/\D/g, "").slice(0, 14)
  const displayed = digits ? formatDocument(digits) : ""

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      disabled={disabled}
      aria-invalid={ariaInvalid}
      placeholder={placeholder}
      value={displayed}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 14))}
      onBlur={onBlur}
      className={cn(className)}
    />
  )
}
