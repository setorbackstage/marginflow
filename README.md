# MarginFlow OS

**Production build pipeline: GitHub Actions → Vercel**

## Development

```bash
pnpm install
pnpm dev
```

> Local development (WSL2) runs the dev server (`next dev`). The dev server uses Turbopack dev mode, which does NOT load the SWC native binary and works correctly.

## Production Build

> **⚠️ `npm run build` / `pnpm build` is NOT supported on this machine.**
>
> The AMD FX-8300 CPU lacks AVX2 instructions. The Next.js SWC compiler binary (`@next/swc`) is compiled with AVX2 and crashes with `Bus error (SIGBUS)` before any compilation starts. This is a hardware limitation — not a code issue.
>
> **Production builds run in GitHub Actions** on `ubuntu-latest` runners (which have modern CPUs with full AVX2 support).

### CI/CD Flow

1. **Push to `main`** → GitHub Actions workflow `.github/workflows/ci.yml` runs:
   - `pnpm install --frozen-lockfile`
   - `pnpm lint`
   - `pnpm test`
   - `pnpm build` (on Ubuntu — builds successfully)
   - `pnpm tsx scripts/check-api-docs-parity.ts`
2. **Vercel** auto-deploys on merge to `main` via `vercel.json` config

### Why not fix it locally?

| Attempt | Result |
|---------|--------|
| `@swc/core` install | Doesn't help — Next.js 16 uses its own `@next/swc` binary |
| `@swc/wasm` install | Unused by Next.js |
| `--webpack` / `--no-sourcemap-tradeoff` | Same SIGBUS |
| `--turbo` / `--turbopack` | Same SIGBUS |
| `SWC_USE_LOCAL_CLIP=1` | Same SIGBUS |
| `NODE_OPTIONS=--max-old-space-size=*` | Same SIGBUS (not a memory issue) |
| Standalone SWC CLI | Not integrated with Next.js 16 |

The root cause is the **native `.node` addon** `@next/swc-linux-x64-gnu/next-swc.linux-x64-gnu.node` which contains AVX2 instructions. No environment variable or flag can change the compiled binary's instruction set.

## Project Structure

- **Framework:** Next.js 16.2.6 / React 19 / TypeScript 5.7.3
- **PM:** pnpm
- **ORM:** Prisma 7.8 + PostgreSQL (local Docker / Supabase prod)
- **Deployment:** Vercel (auto-deploy on merge)
- **Integrations:** iFood, 99Food, OpenDelivery

## Environment Variables

See `.env.example` for required variables. The build needs `DATABASE_URL`, `SUPABASE_*`, and `JWT_*` (dummy values are set in CI).

## Testing

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

---

## For Future Developers

If you're on a machine without AVX2 (or get `Bus error` during `next build`):

1. **Use `pnpm dev` for local development** — it works fine
2. **Push to a branch and open a PR** — CI will run the build on Ubuntu
3. **Do NOT spend time on local SWC workarounds** — they don't work, the binary is compiled with AVX2
4. **To verify a build will pass:** check the GitHub Actions run for your commit