"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TopicScore } from "@/lib/types";

export function TopicPerformanceChart({ data }: { data: TopicScore[] }) {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const apply = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-72 w-full rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="topic" stroke="#71717a" />
          <YAxis stroke="#71717a" />
          <Tooltip
            contentStyle={{
              background: isLight ? "#ffffff" : "#0f0f10",
              border: `1px solid ${isLight ? "#d4d4d8" : "#2a2a2a"}`,
              borderRadius: 12,
              color: isLight ? "#111827" : "#f4f4f5",
            }}
            cursor={{ fill: isLight ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.06)" }}
          />
          <Bar dataKey="accuracy" radius={[10, 10, 0, 0]}>
            {data.map((item) => (
              <Cell
                key={item.topic}
                fill={item.accuracy < 60 ? "#ef4444" : item.accuracy < 75 ? "#f59e0b" : "#34d399"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreDonut({ value }: { value: number }) {
  const data = [
    { name: "score", value },
    { name: "rest", value: 100 - value },
  ];

  return (
    <div className="relative h-64 w-full rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={70} outerRadius={95} dataKey="value" stroke="none">
            <Cell fill="#ef4444" />
            <Cell fill="#27272a" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-black text-white">{value}%</p>
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Accuracy</p>
      </div>
    </div>
  );
}