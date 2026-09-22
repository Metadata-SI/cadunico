import {
  Accessibility,
  AlertTriangle,
  Baby,
  BadgeHelp,
  Building2,
  CheckCircle2,
  Clock3,
  Gift,
  GraduationCap,
  HandHeart,
  HeartHandshake,
  HeartPulse,
  Home,
  Leaf,
  MapPinned,
  Network,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { formatValue, type ValueFormat } from "@/utils/format";
import { cn } from "@/lib/utils";

export type MetricIcon =
  | "users"
  | "home"
  | "handHeart"
  | "wallet"
  | "accessibility"
  | "alert"
  | "check"
  | "trending"
  | "baby"
  | "graduationCap"
  | "alertTriangle"
  | "heartHandshake"
  | "shieldCheck"
  | "zap"
  | "gift"
  | "leaf"
  | "mapPinned"
  | "badgeHelp"
  | "clock3"
  | "heartPulse"
  | "network"
  | "building2"
  | "shield";

const icons: Record<MetricIcon, LucideIcon> = {
  users: Users,
  home: Home,
  handHeart: HandHeart,
  wallet: Wallet,
  accessibility: Accessibility,
  alert: AlertTriangle,
  check: CheckCircle2,
  trending: TrendingUp,
  baby: Baby,
  graduationCap: GraduationCap,
  alertTriangle: AlertTriangle,
  heartHandshake: HeartHandshake,
  shieldCheck: ShieldCheck,
  zap: Zap,
  gift: Gift,
  leaf: Leaf,
  mapPinned: MapPinned,
  badgeHelp: BadgeHelp,
  clock3: Clock3,
  heartPulse: HeartPulse,
  network: Network,
  building2: Building2,
  shield: Shield,
};

export interface MetricCardProps {
  label: string;
  value: number;
  hint?: string;
  suffix?: string;
  format?: ValueFormat;
  icon?: MetricIcon;
  className?: string;
}

export function MetricCard({
  label,
  value,
  hint,
  suffix,
  format = "integer",
  icon = "users",
  className,
}: MetricCardProps) {
  const Icon = icons[icon];

  return (
    <article className={cn("panel group relative flex flex-col gap-3 overflow-hidden p-5", className)}>
      <span className="absolute inset-x-0 top-0 h-0.5 scale-x-0 bg-primary transition-transform duration-200 group-hover:scale-x-100" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug text-muted-foreground">{label}</p>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/10">
          <Icon className="size-4.5" aria-hidden />
        </span>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums lg:text-3xl">
        {formatValue(value, format)}
        {suffix ? <span className="ml-1 text-base font-medium text-muted-foreground">{suffix}</span> : null}
      </p>
      {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </article>
  );
}
