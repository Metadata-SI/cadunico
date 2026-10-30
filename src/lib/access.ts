/** Único e-mail com acesso à aba "Fontes de Dados" (download e atualização da base). */
export const FONTES_DADOS_ALLOWED_EMAIL = "dashboard@metadatasi.com.br";

export function canAccessFontesDados(email: string | null | undefined) {
  return email?.toLowerCase() === FONTES_DADOS_ALLOWED_EMAIL.toLowerCase();
}
