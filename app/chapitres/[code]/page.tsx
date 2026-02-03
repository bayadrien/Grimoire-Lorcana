"use client";
import { useParams } from "next/navigation";

export default function TestChapitre() {
  const params = useParams();

  return (
    <main style={{ padding: 40 }}>
      <h1>TEST CHAPITRE</h1>
      <pre>{JSON.stringify(params, null, 2)}</pre>
    </main>
  );
}
