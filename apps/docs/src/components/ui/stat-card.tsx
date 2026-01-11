
import { cn } from "@/lib/utils";

interface StatCardProps {
  value: number | string;
  label: string;
  suffix?: string;
  color?: "purple" | "blue" | "green" | "amber" | "violet" | "emerald" | "red" | "pink" | "cyan";
}

const colorMaps: Record<string, { border: string; text: string; bg: string }> = {
  purple: {
    border: "group-hover:border-purple-500/50",
    text: "text-purple-400",
    bg: "bg-purple-500",
  },
  blue: {
    border: "group-hover:border-blue-500/50",
    text: "text-blue-400",
    bg: "bg-blue-500",
  },
  green: {
    border: "group-hover:border-green-500/50",
    text: "text-green-400",
    bg: "bg-green-500",
  },
  amber: {
    border: "group-hover:border-amber-500/50",
    text: "text-amber-400",
    bg: "bg-amber-500",
  },
  violet: {
    border: "group-hover:border-violet-500/50",
    text: "text-violet-400",
    bg: "bg-violet-500",
  },
  emerald: {
    border: "group-hover:border-emerald-500/50",
    text: "text-emerald-400",
    bg: "bg-emerald-500",
  },
  red: {
    border: "group-hover:border-red-500/50",
    text: "text-red-400",
    bg: "bg-red-500",
  },
  pink: {
    border: "group-hover:border-pink-500/50",
    text: "text-pink-400",
    bg: "bg-pink-500",
  },
  cyan: {
    border: "group-hover:border-cyan-500/50",
    text: "text-cyan-400",
    bg: "bg-cyan-500",
  },
};

export function StatCard({ value, label, suffix = "", color = "violet" }: StatCardProps) {
  const styles = colorMaps[color] || colorMaps.violet;

  return (
    <div
      className={cn(
        "bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-5 relative overflow-hidden group transition-all duration-300",
        styles.border
      )}
    >
      <div
        className={cn(
          "absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity",
          styles.text
        )}
      >
        <div className="w-16 h-16 rounded-full bg-current blur-2xl" />
      </div>
      <div className={cn("text-3xl sm:text-4xl font-black mb-1", styles.text)}>
        {value}
        {suffix}
      </div>
      <div className="text-[#B8B8B8] text-sm font-medium">{label}</div>
    </div>
  );
}

