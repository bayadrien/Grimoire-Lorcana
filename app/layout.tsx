import "./globals.css";
import { SearchProvider } from "@/app/components/SearchContext";

export const metadata = {
  title: "Grimoire Lorcana",
  description: "Collection Lorcana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <SearchProvider>
          {children}
        </SearchProvider>
      </body>
    </html>
  );
}
