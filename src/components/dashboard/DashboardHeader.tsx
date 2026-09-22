export interface DashboardHeaderProps {
  title: string;
  subtitle: string;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  return (
    <header className="relative flex flex-col gap-4 border-b border-border bg-card px-4 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground lg:text-2xl">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <img
          src="/logo-prefeitura-natal.png"
          alt="Prefeitura de Natal"
          className="h-14 w-auto lg:h-16"
        />
        <span className="h-10 w-px bg-border" aria-hidden />
        <img src="/logo-metadata-footer.png" alt="Metadata" className="h-6 w-auto lg:h-7" />
      </div>
      <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-primary/50 via-primary/10 to-transparent" />
    </header>
  );
}
