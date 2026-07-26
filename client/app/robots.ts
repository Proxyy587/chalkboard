import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/docs", "/docs/", "/sign-in", "/sign-up"],
        disallow: [
          "/api/",
          "/settings",
          "/settings/",
          "/thread/",
          "/_next/",
        ],
      },
      {
        userAgent: "GPTBot",
        allow: ["/docs", "/docs/"],
        disallow: ["/api/", "/settings", "/thread/"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/docs", "/docs/"],
        disallow: ["/api/", "/settings", "/thread/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
