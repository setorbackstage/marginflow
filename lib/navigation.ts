/**
 * Barrel re-export — maintains backward compatibility.
 *
 * Types live in:   @/types/navigation
 * Data lives in:   @/constants/navigation
 *
 * Prefer importing directly from those paths in new code.
 * This file exists so existing imports from @/lib/navigation keep working.
 */
export type { NavItem, NavGroup } from "@/types/navigation"
export { navGroups } from "@/constants/navigation"
