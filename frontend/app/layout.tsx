import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: "CEAM Auditor - Monitoreo de Fichas",
  description: "Plataforma de auditoría del Catálogo Electrónico de Acuerdos Marco",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-background text-text antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
