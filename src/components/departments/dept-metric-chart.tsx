"use client";

import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { MetricDataPoint } from "@/types/department.types";

interface DeptMetricChartProps {
  data: MetricDataPoint[];
  kpiKey: string;
  targetValue?: number;
  chartType?: "line" | "bar" | "area";
  color?: string;
  height?: number;
}

export function DeptMetricChart({
  data,
  kpiKey,
  targetValue,
  chartType = "line",
  color = "#6366f1",
  height = 200,
}: DeptMetricChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        No data yet
      </div>
    );
  }

  const commonProps = {
    data,
    margin: { top: 5, right: 10, left: 0, bottom: 5 },
  };

  const renderChart = () => {
    if (chartType === "bar") {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={45} />
          <Tooltip />
          {targetValue && <ReferenceLine y={targetValue} stroke="#ef4444" strokeDasharray="4 2" />}
          <Bar dataKey={kpiKey} fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      );
    }
    if (chartType === "area") {
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={45} />
          <Tooltip />
          {targetValue && <ReferenceLine y={targetValue} stroke="#ef4444" strokeDasharray="4 2" />}
          <Area type="monotone" dataKey={kpiKey} stroke={color} fill={`${color}20`} strokeWidth={2} />
        </AreaChart>
      );
    }
    return (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} width={45} />
        <Tooltip />
        {targetValue && <ReferenceLine y={targetValue} stroke="#ef4444" strokeDasharray="4 2" />}
        <Line type="monotone" dataKey={kpiKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      {renderChart()}
    </ResponsiveContainer>
  );
}
