import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Central Coopera",
    short_name: "Coopera",
    description: "Intranet de Coopera Pro",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "es-CL",
    theme_color: "#29354B",
    background_color: "#fafafa",
    icons: [
      {
        src: "/brand/coopera-pro-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/coopera-pro-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
