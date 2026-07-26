import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from "@/lib/seo";

/** Breadcrumb + docs SoftwareSourceCode hints for rich results */
export function docsJsonLd(page: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Docs",
            item: absoluteUrl("/docs"),
          },
          ...(page.path !== "/docs"
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: page.title,
                  item: absoluteUrl(page.path),
                },
              ]
            : []),
        ],
      },
      {
        "@type": "TechArticle",
        headline: `${page.title} · ${SITE_NAME}`,
        description: page.description || SITE_DESCRIPTION,
        mainEntityOfPage: absoluteUrl(page.path),
        author: { "@type": "Organization", name: SITE_NAME },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
          logo: {
            "@type": "ImageObject",
            url: absoluteUrl("/image.png"),
          },
        },
        inLanguage: "en-US",
      },
    ],
  };
}
