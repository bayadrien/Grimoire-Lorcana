"use client";

import { Suspense } from "react";
import OpeningResultContent from "./OpeningResultContent";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Chargement...</div>}>
      <OpeningResultContent />
    </Suspense>
  );
}