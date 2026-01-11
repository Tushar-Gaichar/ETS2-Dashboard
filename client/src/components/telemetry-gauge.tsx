import { cn } from "@/lib/utils";

interface TelemetryGaugeProps {
  value: number;
  maxValue: number;
  unit: string;
  label: string;
  color?: string;
  className?: string;
  // Optional size for the gauge circle
  size?: "sm" | "md" | "lg" | "xl";
}

export default function TelemetryGauge({
  value,
  maxValue,
  unit,
  label,
  color = "hsl(207, 90%, 54%)",
  className,
  size = "md",
}: TelemetryGaugeProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const strokeDasharray = `${percentage}, 100`;

  const sizeClass =
    size === "sm"
      ? "w-20 h-20"
      : size === "lg"
      ? "w-32 h-32 md:w-40 md:h-40"
      : size === "xl"
      ? "w-40 h-40 md:w-56 md:h-56 lg:w-64 lg:h-64"
      : "w-24 h-24"; // md (default)

  return (
    <div className={cn("bg-surface rounded-lg p-4 text-center", className)}>
      <div className={cn("relative mx-auto mb-2", sizeClass)}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="hsl(240, 3.7%, 15.9%)"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            style={{
              transition: "stroke-dasharray 0.3s ease-in-out",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round(value)}</div>
            <div className="text-xs text-muted-foreground">{unit}</div>
          </div>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
