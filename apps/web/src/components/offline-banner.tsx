import { WifiOff } from "lucide-react";

export function OfflineBanner({ cachedAt }: { cachedAt: number | null }) {
  if (!cachedAt) return null;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-risk-medium/40 bg-risk-medium/10 px-3 py-2 text-sm">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        Couldn&apos;t reach the server, so this is saved data from{" "}
        <strong>{new Date(cachedAt).toLocaleString()}</strong>. You may be
        offline or the server may be down, so it may be out of date.
      </span>
    </div>
  );
}
