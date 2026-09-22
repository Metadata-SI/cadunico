import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Plus, Power, PowerOff, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import {
  activateUser,
  createUser,
  deactivateUser,
  deleteUser,
  listUsers,
  resetPassword,
  type ManagedUser,
} from "@/lib/admin-users-api";
import { SectionTitle } from "@/components/dashboard/SectionTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/utils/format";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Observatório do Cadastro Único de Natal/RN" }] }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { role } = useAuth();

  if (role !== "admin") {
    return (
      <div className="panel flex flex-col items-center gap-3 p-10 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" aria-hidden />
        <h1 className="text-lg font-semibold text-foreground">Acesso restrito</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Esta área é exclusiva para administradores do observatório.
        </p>
      </div>
    );
  }

  return <UsuariosAdmin />;
}

function UsuariosAdmin() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: listUsers,
  });

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          title="Usuários"
          description="Contas com acesso ao painel. Cadastros novos recebem a senha padrão 123456."
        />
        <CreateUserDialog onCreated={invalidate} />
      </section>

      <section className="panel overflow-x-auto p-5">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Carregando usuários...
          </div>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-destructive">
            Não foi possível carregar os usuários
            {error instanceof Error && error.message ? `: ${error.message}` : "."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum usuário cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                data?.users.map((managedUser) => (
                  <UserRow
                    key={managedUser.id}
                    managedUser={managedUser}
                    isSelf={managedUser.id === currentUser?.id}
                    onChanged={invalidate}
                  />
                ))
              )}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function UserRow({
  managedUser,
  isSelf,
  onChanged,
}: {
  managedUser: ManagedUser;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const toggleMutation = useMutation({
    mutationFn: () =>
      managedUser.active ? deactivateUser(managedUser.id) : activateUser(managedUser.id),
    onSuccess: () => {
      toast.success(managedUser.active ? "Acesso desativado." : "Acesso reativado.");
      onChanged();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetPassword(managedUser.id),
    onSuccess: () => toast.success("Senha redefinida para 123456."),
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(managedUser.id),
    onSuccess: () => {
      toast.success("Usuário excluído.");
      onChanged();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <TableRow>
      <TableCell className="font-medium text-foreground">
        {managedUser.email}
        {isSelf ? <span className="ml-2 text-xs text-muted-foreground">(você)</span> : null}
      </TableCell>
      <TableCell>
        <Badge variant={managedUser.role === "admin" ? "default" : "secondary"}>
          {managedUser.role === "admin" ? "Admin" : "Usuário"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={managedUser.active ? "outline" : "destructive"}>
          {managedUser.active ? "Ativo" : "Desativado"}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(managedUser.createdAt)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {managedUser.lastSignInAt ? formatDate(managedUser.lastSignInAt) : "Nunca"}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1.5">
          <Button
            variant="outline"
            size="icon"
            aria-label="Redefinir senha para 123456"
            title="Redefinir senha para 123456"
            disabled={resetMutation.isPending}
            onClick={() => resetMutation.mutate()}
          >
            <KeyRound className="size-4" aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={managedUser.active ? "Desativar acesso" : "Reativar acesso"}
            title={managedUser.active ? "Desativar acesso" : "Reativar acesso"}
            disabled={isSelf || toggleMutation.isPending}
            onClick={() => toggleMutation.mutate()}
          >
            {managedUser.active ? (
              <PowerOff className="size-4" aria-hidden />
            ) : (
              <Power className="size-4" aria-hidden />
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Excluir usuário"
                title="Excluir usuário"
                disabled={isSelf || deleteMutation.isPending}
              >
                <Trash2 className="size-4 text-destructive" aria-hidden />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir <strong>{managedUser.email}</strong>? Essa ação não
                  pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteMutation.mutate()}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CreateUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "usuario">("usuario");

  const mutation = useMutation({
    mutationFn: () => createUser(email, role),
    onSuccess: () => {
      toast.success(`Usuário criado. Senha padrão: 123456`);
      setOpen(false);
      setEmail("");
      setRole("usuario");
      onCreated();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) mutation.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden />
          Novo usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>
              Informe o e-mail e o nível de acesso. A senha inicial será <strong>123456</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-user-email">E-mail</Label>
              <Input
                id="new-user-email"
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="pessoa@natal.rn.gov.br"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-user-role">Nível de acesso</Label>
              <Select value={role} onValueChange={(value) => setRole(value as "admin" | "usuario")}>
                <SelectTrigger id="new-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Criando...
                </>
              ) : (
                "Criar usuário"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
