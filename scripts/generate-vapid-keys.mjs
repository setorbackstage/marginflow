/**
 * Generates VAPID key pair for Web Push notifications.
 * Run once and add the output to your .env.local / Vercel environment variables.
 *
 *   node scripts/generate-vapid-keys.mjs
 */
import webpush from "web-push"

const keys = webpush.generateVAPIDKeys()

console.log("\n🔑  VAPID Keys geradas:\n")
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log(`VAPID_EMAIL=mailto:admin@marginflow.app\n`)
console.log("Adicione as 4 variáveis acima ao Vercel → Settings → Environment Variables.")
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY deve ser exposta também ao cliente (prefixo NEXT_PUBLIC_).\n")
