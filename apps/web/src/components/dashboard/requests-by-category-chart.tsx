"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReliefRequest } from "@rakkhanet/shared-types";

const CATEGORY_LABELS: Record<ReliefRequest["category"], string> = {
  food: "Food",
  medical: "Medical",
  rescue: "Rescue",
  shelter: "Shelter",
  other: "Other",
};

export function RequestsByCategoryChart({
  requests,
}: {
  requests: ReliefRequest[];
}) {
  const counts = (
    Object.keys(CATEGORY_LABELS) as ReliefRequest["category"][]
  ).map((key) => ({
    category: CATEGORY_LABELS[key],
    count: requests.filter((r) => r.category === key).length,
  }));

  return (
    <div className="h-64 rounded-lg border p-4">
      <p className="mb-2 text-sm font-medium">Requests by category</p>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={counts}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="category" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#12294B" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
