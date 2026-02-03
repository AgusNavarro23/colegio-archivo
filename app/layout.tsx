import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Notaría Digital - Sistema de Gestión de Trámites",
  description: "Sistema moderno de gestión de trámites notariales con tecnología de punta",
  keywords: ["Notaría", "Trámites", "Gestión", "Legal", "Documentos", "Digital"],
  authors: [{ name: "Notaría Digital" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Notaría Digital",
    description: "Sistema de gestión de trámites notariales",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Notaría Digital",
    description: "Sistema de gestión de trámites notariales",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}