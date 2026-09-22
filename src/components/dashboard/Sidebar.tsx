import { Link } from "@tanstack/react-router";
import {
  Accessibility,
  Baby,
  BarChart3,
  Building2,
  Database,
  GraduationCap,
  HandCoins,
  Home,
  LayoutDashboard,
  Map,
  Network,
  PanelLeft,
  PanelLeftClose,
  Tent,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  /** Exibe o botão de recolher/expandir quando informado. */
  onToggleCollapse?: () => void;
}

export function Sidebar({ onNavigate, collapsed = false, onToggleCollapse }: SidebarProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border px-5 py-5",
          collapsed ? "justify-center px-2" : "justify-between gap-2",
        )}
      >
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight">Observatório Social</p>
            <p className="mt-1 truncate text-xs text-sidebar-foreground/70">Cadastro Único — Natal/RN</p>
          </div>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-expanded={!collapsed}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? (
              <PanelLeft className="size-4" aria-hidden />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden />
            )}
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Módulos do observatório">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                activeOptions={{ exact: item.to === "/" }}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2",
                )}
                activeProps={{
                  className:
                    "bg-sidebar-primary/18 text-sidebar-accent-foreground ring-1 ring-sidebar-border",
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
        <p className="border-t border-sidebar-border px-5 py-4 text-xs leading-relaxed text-sidebar-foreground/60">
          Dados agregados. Nenhuma informação individual é exibida.
        </p>
      )}
    </div>
  );
}
