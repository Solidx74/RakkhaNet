export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "critical" | "success";
}) {
  const toneClass =
    tone === "critical"
      ? "text-risk-severe"
      : tone === "success"
        ? "text-risk-low"
        : "text-foreground";
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
