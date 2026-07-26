import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d0c",
    theme_color: "#0d0d0c",
    orientation: "portrait-primary",
    categories: ["education", "developer", "productivity"],
    icons: [
      {
        src: "/image.png",
        sizes: "1200x630",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/image.png",
        sizes: "1200x630",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
