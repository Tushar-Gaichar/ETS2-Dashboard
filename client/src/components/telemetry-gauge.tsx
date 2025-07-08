import { cn } from "@/lib/utils";

interface TelemetryGaugeProps {
  value: number;
  maxValue: number;
  unit: string;
  label: string;
  color?: string;
  className?: string;
}

export default function TelemetryGauge({
  value,
  maxValue,
  unit,
  label,
  color = "hsl(207, 90%, 54%)",
  className,
}: TelemetryGaugeProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const strokeDasharray = `${percentage}, 100`;

  return (
    <div className={cn("bg-surface rounded-lg p-4 text-center", className)}>
      <div className="relative w-24 h-24 mx-auto mb-2">
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
