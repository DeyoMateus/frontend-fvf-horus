/**
 * Rodada 687: o servidor bloqueia TODAS as rotas (inclusive a da Política de Privacidade) enquanto a
 * senha for provisória ou o MFA exigido não estiver cadastrado; só a tela de perfil resolve isso. O
 * `PoliticaGate` abria antes do perfil e ficava preso no erro, então a pessoa nunca chegava ao
 * formulário de trocar a senha. Nesse caso, e só na tela de perfil, o gate deixa a tela abrir. O
 * servidor continua barrando todo o resto e a política volta a ser exigida no login seguinte.
 */
const CODIGOS_RESOLVIDOS_NO_PERFIL = new Set([
  "SENHA_PROVISORIA",
  "MFA_CADASTRO_PENDENTE",
  "MFA_EXPIRADO",
]);

export function liberarPerfilParaResolverPendencia(erro: unknown, caminho: string): boolean {
  const resposta = (erro as { response?: { status?: number; data?: { codigo?: string } } } | null)
    ?.response;
  if (resposta?.status !== 403) return false;
  if (!CODIGOS_RESOLVIDOS_NO_PERFIL.has(String(resposta.data?.codigo ?? ""))) return false;
  return caminho === "/perfil" || caminho.startsWith("/perfil/");
}
