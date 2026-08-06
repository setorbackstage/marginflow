/**
 * Helpers do dispatcher: renderiza o template e persiste o conteúdo no job.
 */
import "server-only"
import type { DbClient } from "../db"
import type { PrintContext, PrintDocumentType } from "./types"
import { renderTemplate } from "./template"
import { printJobRepository } from "./print-job.repository"
import { buildPrintContext } from "./jobs"

/** Renderiza o template do tipo e persiste em `content` (ETAPA 5/11). */
export async function renderAndPersist(
  documentType: PrintDocumentType,
  ctx: PrintContext,
): Promise<string> {
  return renderTemplate(documentType, ctx)
}

export { buildPrintContext }
