import type { MetadataRoute } from "next"
import { APP_NAME, APP_DESCRIPTION } from "@/config"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1c6fd2",
    icons: [
      { src: "/logo-mark.png", sizes: "any", type: "image/png" },
      { src: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  }
}
