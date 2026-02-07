type Props = {
  value: number; // 0 → 100
  size?: number;
  label?: string;
};

export default function ProgressCircle({
  value,
  size = 140,
  label,
}: Props) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,.15)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#grad)"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .8s ease" }}
        />
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6dd5fa" />
            <stop offset="100%" stopColor="#2980b9" />
          </linearGradient>
        </defs>
      </svg>

      <div style={{ marginTop: -90, fontSize: 28, fontWeight: 900 }}>
        {value}%
      </div>

      {label && (
        <div style={{ opacity: 0.8, marginTop: 6 }}>{label}</div>
      )}
    </div>
  );
}
