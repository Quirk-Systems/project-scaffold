import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  hookDensity: "Hook",
  commercial: "Commercial",
  funny: "Funny",
  weirdness: "Weird",
  emotionalCharge: "Emotion",
  spawnPotential: "Spawn",
  quality: "Quality",
};

export function ScoreBars({
  scores,
  className,
}: {
  scores: Record<string, number>;
  className?: string;
}) {
  const entries = Object.entries(scores).filter(
    ([, v]) => typeof v === "number",
  );
  if (entries.length === 0) return null;

  return (
    <div className={cn("grid gap-1", className)}>
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <span className="text-muted-foreground w-20 shrink-0 text-xs">
            {LABELS[key] ?? key}
          </span>
          <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${Math.round(clamp01(value) * 100)}%` }}
            />
          </div>
          <span className="text-muted-foreground w-8 shrink-0 text-right text-xs tabular-nums">
            {clamp01(value).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
