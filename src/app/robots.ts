import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/aviso-de-privacidad"],
        disallow: ["/arqos-data"],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/arqos-data"],
      },
      {
        userAgent: "Claude-Web",
        allow: "/",
        disallow: ["/arqos-data"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/arqos-data"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/arqos-data"],
      },
    ],
    sitemap: "https://arqosuv.com/sitemap.xml",
  };
}
