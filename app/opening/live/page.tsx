"use client";

import { Suspense } from "react";
import OpeningLiveContent from "./OpeningLiveContent";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Chargement...</div>}>
      <OpeningLiveContent />
    </Suspense>
  );
}