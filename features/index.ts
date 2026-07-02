/**
 * Features — self-contained vertical slices of the application.
 *
 * Each feature directory owns its own components, hooks, types, and utils.
 * Nothing inside a feature should be imported by another feature.
 * Shared code belongs in the top-level directories (components, hooks, lib, etc.).
 *
 * Pattern:
 *   features/
 *     orders/
 *       components/   ← order-specific components
 *       hooks/        ← order-specific hooks
 *       types/        ← order-specific types
 *       utils/        ← order-specific utilities
 *       index.ts      ← public API — only export what other layers need
 *     kitchen/
 *     inventory/
 *     customers/
 *     finance/
 */
