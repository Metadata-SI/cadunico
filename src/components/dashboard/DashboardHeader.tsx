import { Link } from "@tanstack/react-router";
import { LogOut, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export interface DashboardHeaderProps {
  title: string;
  subtitle: string;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const { user, role, signOut } = useAuth();

  return (
    <header className="relative flex flex-col gap-4 border-b border-border bg-card px-4 py-5 lg:h-[105px] lg:flex-row lg:items-center lg:justify-between lg:py-0 lg:px-8">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground lg:text-2xl">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3.5">
        <img src="/logo-cadunico.png" alt="Cadastro Único" className="h-9 w-auto lg:h-9" />
        <span className="h-5 w-px bg-border/50" aria-hidden />
        <img
          src="/logo-prefeitura-natal.png"
          alt="Prefeitura de Natal"
          className="h-10 w-auto lg:h-14"
        />
        <span className="h-5 w-px bg-border/50" aria-hidden />
        <img src="/logo-metadata-footer.png" alt="Metadata" className="h-6 w-auto lg:h-6" />
        {user ? (
          <>
            <span className="h-6 w-px bg-border/50" aria-hidden />
            <div className="flex items-center gap-2">
              {role === "admin" ? (
                <Button variant="ghost" size="icon" aria-label="Usuários" title="Usuários" asChild>
                  <Link to="/usuarios">
                    <UserCog className="size-4" aria-hidden />
                  </Link>
                </Button>
              ) : null}
              <Button variant="ghost" size="icon" aria-label="Sair" onClick={() => signOut()}>
                <LogOut className="size-4" aria-hidden />
              </Button>
            </div>
          </>
        ) : null}
      </div>
      <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-primary/50 via-primary/10 to-transparent" />
    </header>
  );
}
