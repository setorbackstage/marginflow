/**
 * Retry inteligente (ETAPA 4).
 *
 * Backoff progressivo, sem loop infinito. Após esgotar as tentativas, o job
 * vai para FAILED, gera notificação e registra auditoria (tratado no dispatcher).
 *
 * Sequência de espera entre tentativas:
 *   1ª falha  → 5s
 *   2ª falha  → 30s
 *   3ª falha  → 2min
 *   4ª falha  → 5min
 *   >=5 falhas → FAILED (sem novo retry)
 */

export const RETRY_SCHEDULE_SECONDS = [5, 30, 120, 300] as const
export const MAX_ATTEMPTS = RETRY_SCHEDULE_SECONDS.length + 1 // 5

/** Retorna o tempo de espera (ms) antes da próxima tentativa, ou null se esgotado. */
export function nextRetryDelayMs(attemptsSoFar: number): number | null {
  const idx = attemptsSoFar // tentativas já realizadas
  if (idx <= 0 || idx > RETRY_SCHEDULE_SECONDS.length) return null
  return RETRY_SCHEDULE_SECONDS[idx - 1] * 1000
}

/** Data/hora em que a próxima tentativa deve ocorrer (ou null se esgotado). */
export function nextRetryAt(attemptsSoFar: number): Date | null {
  const delay = nextRetryDelayMs(attemptsSoFar)
  if (delay === null) return null
  return new Date(Date.now() + delay)
}

export function isRetryExhausted(attemptsSoFar: number): boolean {
  return attemptsSoFar >= MAX_ATTEMPTS
}
