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

export const metadata: Metadata = {
  title: "ARQOS — Unidad de Valuación",
  description:
    "Unidad de Valuación con infraestructura de datos e inteligencia artificial para el sector hipotecario en México. Avalúos certificados, consultoría y tecnología.",
  keywords: [
    "valuación",
    "avalúos",
    "hipotecario",
    "INFONAVIT",
    "FOVISSSTE",
    "SHF",
    "inteligencia artificial",
    "México",
    "Querétaro",
    "ARQOS",
  ],
  authors: [{ name: "ARQOS" }],
  openGraph: {
    title: "ARQOS — Unidad de Valuación",
    description:
      "Unidad de Valuación con infraestructura de datos e inteligencia artificial para el sector hipotecario en México.",
    url: "https://arqos.mx",
    siteName: "ARQOS",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ARQOS — Unidad de Valuación",
    description:
      "Unidad de Valuación con infraestructura de datos e inteligencia artificial para el sector hipotecario en México.",
  },
  metadataBase: new URL("https://arqos.mx"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
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
