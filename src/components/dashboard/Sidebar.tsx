import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Accessibility,
  Baby,
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  ChevronDown,
  Database,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  Home,
  LayoutDashboard,
  Map,
  Network,
  Scale,
  Tent,
  Users,
  UsersRound,
  Utensils,
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

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

/** Menu da aplicação, organizado por eixo temático — adicione novos módulos aqui. */
export const navGroups: NavGroup[] = [
  {
    id: "geral",
    label: "Geral",
    icon: HeartHandshake,
    items: [
      { to: "/", label: "Visão Geral", icon: LayoutDashboard },
      { to: "/mapas", label: "Mapas", icon: Map },
      { to: "/familias", label: "Famílias", icon: Home },
      { to: "/perfil-populacao", label: "Perfil da População", icon: Users },
      { to: "/renda-vulnerabilidade", label: "Renda e Vulnerabilidade", icon: Wallet },
      { to: "/domicilios", label: "Domicílios", icon: Building2 },
      { to: "/pessoas-com-deficiencia", label: "Pessoas com Deficiência", icon: Accessibility },
      { to: "/grupos-especificos", label: "Grupos Específicos", icon: UsersRound },
      { to: "/situacao-rua", label: "Situação de Rua", icon: Tent },
      { to: "/rede-socioassistencial", label: "Rede Socioassistencial", icon: Network },
    ],
  },
  {
    id: "primeira-infancia",
    label: "Primeira Infância",
    icon: Baby,
    items: [
      { to: "/criancas-adolescentes", label: "Crianças e Adolescentes", icon: Baby },
      { to: "/educacao", label: "Educação", icon: GraduationCap },
    ],
  },
  {
    id: "medidas-socioeducativas",
    label: "Medidas Socioeducativas",
    icon: Scale,
    items: [{ to: "/medidas-socioeducativas", label: "Panorama Socioeducativo", icon: Scale }],
  },
  {
    id: "seguranca-alimentar",
    label: "Segurança Alimentar",
    icon: Utensils,
    items: [{ to: "/beneficios-sociais", label: "Benefícios Sociais", icon: HandCoins }],
  },
  {
    id: "trabalho-renda",
    label: "Trabalho e Renda",
    icon: Briefcase,
    items: [{ to: "/trabalho-renda", label: "Trabalho e Renda", icon: BarChart3 }],
  },
];

/** Itens fora dos eixos temáticos, exibidos ao final do menu. */
export const extraNavItems: NavItem[] = [
  { to: "/fontes-dados", label: "Fontes de Dados", icon: Database },
];

/** Lista plana de todos os módulos (eixos + extras). */
export const navItems: NavItem[] = [...navGroups.flatMap((group) => group.items), ...extraNavItems];

function isItemActive(item: NavItem, pathname: string) {
  return item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
}

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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const canSeeFontesDados = user?.email?.toLowerCase() === FONTES_DADOS_ALLOWED_EMAIL.toLowerCase();
  const extraItems = canSeeFontesDados
    ? extraNavItems
    : extraNavItems.filter((item) => item.to !== "/fontes-dados");

  const activeGroupId = navGroups.find((group) =>
    group.items.some((item) => isItemActive(item, pathname)),
  )?.id;
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set([activeGroupId ?? "geral"]),
  );

  // Garante que o eixo da página atual fique sempre expandido
  useEffect(() => {
    if (!activeGroupId) return;
    setOpenGroups((current) =>
      current.has(activeGroupId) ? current : new Set(current).add(activeGroupId),
    );
  }, [activeGroupId]);

  const toggleGroup = (id: string) =>
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderItem = (item: NavItem, nested: boolean) => (
    <li key={item.to}>
      <Link
        to={item.to}
        onClick={onNavigate}
        activeOptions={{ exact: item.to === "/" }}
        title={collapsed ? item.label : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg border-l-2 border-transparent px-2.5 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          nested && !collapsed && "py-1.5 text-[13px]",
          collapsed && "justify-center px-2",
        )}
        activeProps={{
          className: "border-sidebar-primary bg-sidebar-primary/18 text-sidebar-accent-foreground",
        }}
      >
        <item.icon className="size-4 shrink-0" aria-hidden />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  );

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
          {navGroups.map((group, index) => {
            if (collapsed) {
              // Menu recolhido: exibe os ícones dos módulos, separados por eixo
              return (
                <li key={group.id} title={group.label}>
                  {index > 0 && <div className="mx-2 my-2 h-px bg-sidebar-border" aria-hidden />}
                  <ul className="flex flex-col gap-1">
                    {group.items.map((item) => renderItem(item, true))}
                  </ul>
                </li>
              );
            }
            const open = openGroups.has(group.id);
            const isActiveGroup = group.id === activeGroupId;
            return (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={open}
                  aria-controls={`nav-group-${group.id}`}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActiveGroup && "text-sidebar-accent-foreground",
                  )}
                >
                  <group.icon
                    className={cn("size-4 shrink-0", isActiveGroup && "text-sidebar-primary")}
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-sidebar-foreground/60 transition-transform",
                      open && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
                {open && (
                  <ul
                    id={`nav-group-${group.id}`}
                    className="mb-1 ml-4 mt-1 flex flex-col gap-0.5 border-l border-sidebar-border pl-2"
                  >
                    {group.items.map((item) => renderItem(item, true))}
                  </ul>
                )}
              </li>
            );
          })}
          {extraItems.length > 0 && (
            <li>
              <div className="mx-2 my-2 h-px bg-sidebar-border" aria-hidden />
              <ul className="flex flex-col gap-1">
                {extraItems.map((item) => renderItem(item, false))}
              </ul>
            </li>
          )}
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
