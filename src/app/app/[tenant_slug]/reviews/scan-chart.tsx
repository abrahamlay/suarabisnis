"use client";

type Props = {
  // Array of scan counts, length = number of days (oldest → newest)
  series: number[];
};

export default function ScanChart({ series }: Props) {
  const data = series.length ? series : Array(30).fill(0);
  const max = Math.max(1, ...data);
  const W = 600;
  const H = 160;
  const PAD_X = 24;
  const PAD_Y = 12;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const barWidth = innerW / data.length;
  const total = data.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-700">Scan 30 Hari Terakhir</h3>
        <span className="text-xs text-slate-500">Total: {total}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-32"
        preserveAspectRatio="none"
        aria-label="Grafik scan QR 30 hari terakhir"
      >
        {/* Baseline */}
        <line
          x1={PAD_X}
          y1={H - PAD_Y}
          x2={W - PAD_X}
          y2={H - PAD_Y}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        {data.map((v, i) => {
          const h = (v / max) * innerH;
          const x = PAD_X + i * barWidth;
          const y = H - PAD_Y - h;
          return (
            <rect
              key={i}
              x={x + 1}
              y={y}
              width={Math.max(0, barWidth - 2)}
              height={h}
              fill="#0ea5e9"
              rx={2}
              opacity={v === 0 ? 0.25 : 0.9}
            >
              <title>{`${v} scan`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
        <span>30 hari lalu</span>
        <span>Hari ini</span>
      </div>
    </div>
  );
}
