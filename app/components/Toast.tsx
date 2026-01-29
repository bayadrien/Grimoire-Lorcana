"use client";

import { useEffect } from "react";

export function Toast({ msg, onClose }: { msg: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [msg, onClose]);

  if (!msg) return null;

  return (
    <div className="toast">
      <span>{msg}</span>
      <button className="toastX" onClick={onClose} aria-label="Fermer">
        ×
      </button>
    </div>
  );
}
