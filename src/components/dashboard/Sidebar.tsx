import { Link } from "@tanstack/react-router";
import {
  Accessibility,
  Baby,
  BarChart3,
  Building2,
  CalendarClock,
  Database,
  GraduationCap,
  HandCoins,
  Home,
  LayoutDashboard,
  Map,
  Network,
  Tent,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/format";
import { FONTES_DADOS_ALLOWED_EMAIL, useAuth } from "@/lib/auth-context";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Menu único da aplicação — adicione novos módulos aqui. */
export const navItems: NavItem[] = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard },
  { to: "/mapas", label: "Mapas", icon: Map },
  { to: "/familias", label: "Famílias", icon: Home },
  { to: "/perfil-populacao", label: "Perfil da População", icon: Users },
  { to: "/renda-vulnerabilidade", label: "Renda e Vulnerabilidade", icon: Wallet },
  { to: "/domicilios", label: "Domicílios", icon: Building2 },
  { to: "/educacao", label: "Educação", icon: GraduationCap },
  { to: "/trabalho-renda", label: "Trabalho e Renda", icon: BarChart3 },
  { to: "/pessoas-com-deficiencia", label: "Pessoas com Deficiência", icon: Accessibility },
  { to: "/criancas-adolescentes", label: "Crianças e Adolescentes", icon: Baby },
  { to: "/beneficios-sociais", label: "Benefícios Sociais", icon: HandCoins },
  { to: "/grupos-especificos", label: "Grupos Específicos", icon: UsersRound },
  { to: "/situacao-rua", label: "Situação de Rua", icon: Tent },
  { to: "/rede-socioassistencial", label: "Rede Socioassistencial", icon: Network },
  { to: "/fontes-dados", label: "Fontes de Dados", icon: Database },
];

export interface SidebarProps {
  /** Chamado ao navegar (usado para fechar o menu no mobile). */
  onNavigate?: () => void;
  /** Quando true, exibe apenas os ícones (menu recolhido). */
  collapsed?: boolean;
  /** Data da última carga de dados (ISO), exibida no rodapé. */
  lastUpdate?: string;
}

export function Sidebar({ onNavigate, collapsed = false, lastUpdate }: SidebarProps) {
  const { user } = useAuth();
  const canSeeFontesDados = user?.email?.toLowerCase() === FONTES_DADOS_ALLOWED_EMAIL.toLowerCase();
  const items = canSeeFontesDados
    ? navItems
    : navItems.filter((item) => item.to !== "/fontes-dados");

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex h-[105px] items-center gap-3 border-b border-sidebar-border px-5",
          collapsed && "justify-center px-2",
        )}
      >
        <img src="/logo-icone-natal.png" alt="" className="h-10 w-auto shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight">Observatório Social</p>
            <p className="mt-1 truncate text-xs text-sidebar-foreground/70">
              Cadastro Único — Natal/RN
            </p>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Módulos do observatório">
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                activeOptions={{ exact: item.to === "/" }}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-l-2 border-transparent px-2.5 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2",
                )}
                activeProps={{
                  className:
                    "border-sidebar-primary bg-sidebar-primary/18 text-sidebar-accent-foreground",
                }}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {!collapsed && (
        <div className="border-t border-sidebar-border px-5 py-4">
          {lastUpdate && (
            <div className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <CalendarClock className="size-4 shrink-0 text-sidebar-primary" aria-hidden />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-sidebar-foreground/60">
                  Última atualização dos dados
                </p>
                <p className="truncate text-xs font-semibold tabular-nums text-sidebar-foreground">
                  {formatDate(lastUpdate)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
