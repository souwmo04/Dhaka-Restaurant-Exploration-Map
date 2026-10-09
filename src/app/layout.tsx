import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { CatalogUnavailable } from "@/components/feedback/CatalogUnavailable";
import { CatalogProvider } from "@/components/providers/CatalogProvider";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { VisitsProvider } from "@/components/providers/VisitsProvider";
import { ToastProvider } from "@/components/ui/Toaster";
import { siteConfig } from "@/config/site";
import { getCatalog } from "@/lib/catalog/repository";
import type { Catalog } from "@/types/domain";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — ${siteConfig.heroQuestion}`, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.tagline,
    siteName: siteConfig.name,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f1e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  let catalog: Catalog | null = null;
  try {
    catalog = await getCatalog();
  } catch (error) {
    console.error(error);
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full">
        <MotionProvider>
          <ToastProvider>
            <SessionProvider>
              {catalog ? (
                <CatalogProvider catalog={catalog}>
                  <VisitsProvider>{children}</VisitsProvider>
                </CatalogProvider>
              ) : (
                <CatalogUnavailable />
              )}
            </SessionProvider>
          </ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
