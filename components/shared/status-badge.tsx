import { cn } from "@/lib/utils";
import { TONE_STYLES, type StatusMeta } from "@/lib/status";

interface StatusBadgeProps {
  meta: StatusMeta;
  /** Mengganti label bawaan, mis. "3 hari lagi". */
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

/** Badge status dengan ikon + teks + warna (tidak bergantung pada warna saja). */
export function StatusBadge({ meta, label, size = "sm", className }: StatusBadgeProps) {
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-md font-medium whitespace-nowrap",
        size === "sm" ? "h-5 px-1.5 text-xs" : "h-6 px-2 text-xs",
        TONE_STYLES[meta.tone].soft,
        className
      )}
    >
      <Icon aria-hidden className={size === "sm" ? "size-3" : "size-3.5"} />
      {label ?? meta.label}
    </span>
  );
}
