"use client";

import { useEffect } from "react";

export function Toast({
  msg,
  onClose,
  duration = 2200,
}: {
  msg: string | null;
  onClose: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [msg, duration, onClose]);

  if (!msg) return null;

  return (
    <div className="toast">
      {msg}
      <style jsx>{`
        .toast {
          position: fixed;
          bottom: 28px;
          right: 28px;
          background: #1f2933;
          color: #fff;
          padding: 12px 18px;
          border-radius: 14px;
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
          font-size: 14px;
          animation: slideIn 0.25s ease-out;
          z-index: 9999;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
