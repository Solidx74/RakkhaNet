import { WifiOff } from "lucide-react";

export function OfflineBanner({ cachedAt }: { cachedAt: number | null }) {
  if (!cachedAt) return null;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-risk-medium/40 bg-risk-medium/10 px-3 py-2 text-sm">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        Showing saved data from{" "}
        <strong>{new Date(cachedAt).toLocaleString()}</strong> -- you appear to
        be offline.
      </span>
    </div>
  );
}
