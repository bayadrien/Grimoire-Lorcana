"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PinPage() {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function submit() {
    setErr("");
    const r = await fetch("/api/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });

    if (!r.ok) {
      setErr("PIN incorrect 😅");
      return;
    }
    router.push("/choose");
  }

  return (
    <main style={{ maxWidth: 420, margin: "10vh auto", padding: 16 }}>
      <h1>🔐 Entrer le PIN</h1>
      <p style={{ opacity: 0.75 }}>Accès au Grimoire Lorcana.</p>

      <input
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        inputMode="numeric"
        placeholder="••••"
        style={{ width: "100%", padding: 12, borderRadius: 12, marginTop: 10 }}
      />

      <button
        onClick={submit}
        style={{ marginTop: 10, padding: 12, borderRadius: 12, width: "100%" }}
      >
        Ouvrir le grimoire ✨
      </button>

      {err && <p style={{ color: "crimson", marginTop: 10 }}>{err}</p>}
    </main>
  );
}
