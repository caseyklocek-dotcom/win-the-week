import React from "react";

export interface RadarAxis {
  label: string;
  value: number; // 0–100
}

// Lightweight SVG radar for the 8 Compass dimensions.
export function CompassRadar({
  axes,
  size = 320,
  showLabels = true,
  stroke = "#ff6b5e",
  fill = "rgba(255,107,94,0.16)",
}: {
  axes: RadarAxis[];
  size?: number;
  showLabels?: boolean;
  stroke?: string;
  fill?: string;
}) {
  const pad = showLabels ? 64 : 10;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - pad;
  const n = axes.length;

  const point = (i: number, frac: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * r * frac, cy + Math.sin(angle) * r * frac] as const;
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const gridPoly = (frac: number) =>
    axes.map((_, i) => point(i, frac).join(",")).join(" ");

  const valuePoly = axes
    .map((a, i) => point(i, Math.max(0, Math.min(100, a.value)) / 100).join(","))
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={`w-full ${showLabels ? "overflow-visible" : ""}`}
      role="img"
      aria-label="Compass scores"
    >
      {/* grid rings */}
      {rings.map((f) => (
        <polygon
          key={f}
          points={gridPoly(f)}
          fill="none"
          stroke="var(--color-charcoal-100)"
          strokeWidth={1}
        />
      ))}
      {/* spokes */}
      {axes.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e0d8" strokeWidth={1} />;
      })}
      {/* value polygon */}
      <polygon points={valuePoly} fill={fill} stroke={stroke} strokeWidth={2} />
      {/* value dots */}
      {axes.map((a, i) => {
        const [x, y] = point(i, Math.max(0, Math.min(100, a.value)) / 100);
        return <circle key={i} cx={x} cy={y} r={3.5} fill={stroke} />;
      })}
      {/* labels */}
      {showLabels &&
        axes.map((a, i) => {
          const [x, y] = point(i, 1.16);
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
          const anchor =
            Math.cos(angle) > 0.3 ? "start" : Math.cos(angle) < -0.3 ? "end" : "middle";
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-charcoal-600"
              style={{ fontSize: 10.5, fontWeight: 600 }}
            >
              {a.label}
            </text>
          );
        })}
    </svg>
  );
}
