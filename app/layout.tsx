import "./globals.css";
import type { Metadata } from "next";
import { SearchProvider } from "@/app/components/SearchContext";
import PwaRegister from "@/app/components/PwaRegister";

export const metadata: Metadata = {
  title: "Grimoire Lorcana",
  description: "Collection Lorcana",
  icons: {
    icon: [{ url: "/grimoire-icon.png", type: "image/png", sizes: "1280x1280" }],
    apple: [{ url: "/grimoire-icon.png", type: "image/png", sizes: "1280x1280" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <PwaRegister />
        <SearchProvider>
          {children}
        </SearchProvider>
      </body>
    </html>
  );
}
