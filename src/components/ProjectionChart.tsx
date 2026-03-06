"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ProjectionResult } from "@/lib/sroi";

interface Props {
  data: ProjectionResult[];
  mode: "annual" | "cumulative";
}

const COLORS = {
  Linear: "#2C6E49",
  Exponential: "#3b82f6",
  Logistic: "#f59e0b",
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xl px-4 py-3 text-sm min-w-[160px]">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-gray-500">{entry.name}</span>
          </div>
          <span className="font-bold" style={{ color: entry.color }}>
            {entry.value.toFixed(2)}x
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ProjectionChart({ data, mode }: Props) {
  const chartData = data.map((row) => ({
    year: `Tahun ${row.year}`,
    Linear: parseFloat(
      (mode === "annual" ? row.sroi_linear : row.cumSroi_linear).toFixed(3)
    ),
    Exponential: parseFloat(
      (mode === "annual" ? row.sroi_exponential : row.cumSroi_exponential).toFixed(3)
    ),
    Logistic: parseFloat(
      (mode === "annual" ? row.sroi_logistic : row.cumSroi_logistic).toFixed(3)
    ),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          {Object.entries(COLORS).map(([key, color]) => (
            <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 12, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}x`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 13, paddingTop: 12 }}
          iconType="circle"
          iconSize={8}
        />
        {Object.entries(COLORS).map(([key, color]) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#grad-${key})`}
            dot={{ r: 5, fill: color, strokeWidth: 2.5, stroke: "white" }}
            activeDot={{ r: 7, stroke: "white", strokeWidth: 2.5 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
