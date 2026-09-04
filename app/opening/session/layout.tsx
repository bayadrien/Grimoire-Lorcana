import { Suspense, type ReactNode } from "react";

export default function OpeningSessionLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div style={{ minHeight: "100vh", padding: 24 }}>Chargement…</div>}>{children}</Suspense>;
}
