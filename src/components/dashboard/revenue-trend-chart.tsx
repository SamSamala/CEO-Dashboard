"use client";

import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type Point = { date: string; revenue: number; burn: number };

const PERIODS = [
  { label: "2M", months: 2 },
  { label: "3M", months: 3 },
  { label: "4M", months: 4 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
];

function fmtK(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;
}

export function RevenueTrendChart({ data }: { data: Point[] }) {
  const [selectedMonths, setSelectedMonths] = useState(6);

  if (data.length === 0) {
    return (
      <p className="text-center text-muted-foreground text-sm py-8">
        No revenue history yet — submit finance metrics to see trends
      </p>
    );
  }

  const filtered = data.slice(-selectedMonths);

  return (
    <div>
      {/* Period selector */}
      <div className="flex items-center gap-1 mb-3 justify-end">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            onClick={() => setSelectedMonths(p.months)}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
              selectedMonths === p.months
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={filtered} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradBurn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} width={48} />
          <Tooltip formatter={(v: unknown) => fmtK(Number(v))} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#10b981"
            fill="url(#gradRev)"
            strokeWidth={2}
            dot={{ r: 3, fill: "#10b981" }}
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="burn"
            name="Burn"
            stroke="#f97316"
            fill="url(#gradBurn)"
            strokeWidth={2}
            dot={{ r: 2, fill: "#f97316" }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
