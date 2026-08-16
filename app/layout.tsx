import "./globals.css";
import { SearchProvider } from "@/app/components/SearchContext";
import PwaRegister from "@/app/components/PwaRegister";

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
        <PwaRegister />
        <SearchProvider>
          {children}
        </SearchProvider>
      </body>
    </html>
  );
}
