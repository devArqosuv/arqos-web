import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "ARQOS Unidad de Valuación",
  "description": "Unidad de Valuación registrada ante la Sociedad Hipotecaria Federal con infraestructura de inteligencia artificial para avalúos hipotecarios, comerciales e industriales en México.",
  "url": "https://arqosuv.com",
  "logo": "https://arqosuv.com/images/logo-arqos-black.png",
  "telephone": "+524421221774",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Lic. Manuel Gómez Morin 3960, High Park Oficina 15H, Centro Sur",
    "addressLocality": "Santiago de Querétaro",
    "addressRegion": "Querétaro",
    "postalCode": "76090",
    "addressCountry": "MX"
  },
  "areaServed": {
    "@type": "Country",
    "name": "México"
  },
  "serviceType": [
    "Avalúos hipotecarios INFONAVIT",
    "Avalúos hipotecarios FOVISSSTE",
    "Avalúos para banca comercial",
    "Valuación de inmuebles comerciales",
    "Valuación de naves industriales",
    "Valuación de intangibles",
    "Consultoría inmobiliaria con inteligencia artificial"
  ],
  "knowsAbout": [
    "Valuación inmobiliaria",
    "Inteligencia artificial aplicada a valuación",
    "Normativa SHF",
    "Avalúos hipotecarios México",
    "Sistema Maestro de Avalúos"
  ],
  "sameAs": [
    "https://linkedin.com/company/arqos-uv",
    "https://instagram.com/arqos.uv"
  ]
};

export const metadata: Metadata = {
  title: "ARQOS UV | Unidad de Valuación con Inteligencia Artificial en México",
  description:
    "Unidad de Valuación registrada ante SHF. Avalúos hipotecarios para INFONAVIT, FOVISSSTE y banca comercial con agentes de inteligencia artificial. Querétaro, México.",
  keywords: [
    "unidad de valuación México",
    "avalúos hipotecarios INFONAVIT",
    "valuación inmobiliaria IA",
    "SHF unidad de valuación",
    "avalúos FOVISSSTE",
    "valuación inteligencia artificial México",
    "ARQOS valuación",
  ],
  authors: [{ name: "ARQOS" }],
  openGraph: {
    title: "ARQOS — La Unidad de Valuación con IA más avanzada de México",
    description:
      "Unidad de Valuación registrada ante SHF. Avalúos hipotecarios para INFONAVIT, FOVISSSTE y banca comercial con agentes de inteligencia artificial. Querétaro, México.",
    url: "https://arqosuv.com",
    siteName: "ARQOS",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ARQOS — La Unidad de Valuación con IA más avanzada de México",
    description:
      "Unidad de Valuación registrada ante SHF. Avalúos hipotecarios para INFONAVIT, FOVISSSTE y banca comercial con agentes de inteligencia artificial. Querétaro, México.",
  },
  metadataBase: new URL("https://arqosuv.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${playfair.variable} ${montserrat.variable} antialiased`}
      >
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
