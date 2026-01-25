"use client";
import { useRouter } from "next/navigation";

export default function Choose() {
  const router = useRouter();

  function pick(id: "adrien" | "angele") {
    localStorage.setItem("activeUser", id);
    router.push("/");
  }

  return (
    <main style={{ maxWidth: 600, margin: "8vh auto", padding: 16 }}>
      <h1>📖 Choisir un profil</h1>

      <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
        <button onClick={() => pick("adrien")} style={{ flex: 1, padding: 16, borderRadius: 16 }}>
          👤 Adrien
        </button>
        <button onClick={() => pick("angele")} style={{ flex: 1, padding: 16, borderRadius: 16 }}>
          👤 Angèle
        </button>
      </div>

      <p style={{ opacity: 0.75, marginTop: 14 }}>
        Tu pourras changer de profil depuis la page principale.
      </p>
    </main>
  );
}
