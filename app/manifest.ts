import type { MetadataRoute } from "next"
import { APP_NAME, APP_DESCRIPTION } from "@/config"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: "MarginFlow",
    description: APP_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "browser"],
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1c6fd2",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["business", "productivity", "food"],
    prefer_related_applications: false,
    icons: [
      { src: "/icon-32x32.png",  sizes: "32x32",  type: "image/png" },
      { src: "/icon-192.png",    sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192.png",    sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png",  sizes: "180x180", type: "image/png" },
      { src: "/logo-mark.png",   sizes: "any",     type: "image/png" },
    ],
    shortcuts: [
      {
        name: "Pedidos",
        short_name: "Pedidos",
        description: "Ver pedidos em aberto",
        url: "/orders",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Cozinha",
        short_name: "Cozinha",
        description: "Painel da cozinha",
        url: "/kitchen",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Finanças",
        short_name: "Finanças",
        description: "Caixa e pagamentos",
        url: "/finance",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  }
}
