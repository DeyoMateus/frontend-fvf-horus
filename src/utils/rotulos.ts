/** Rodada 512 (N198): rotulos em portugues para valores tecnicos que apareciam crus na tela. */
const SEVERIDADE: Record<string, string> = { CRITICO: "Crítico", ATENCAO: "Atenção", INFO: "Informativo" };
const PAPEL: Record<string, string> = { ADMIN: "Administrador", GESTOR: "Gestor", SUPER_ADMIN: "Super admin" };
const STATUS_MOTORISTA: Record<string, string> = { ATIVO: "Ativo", INATIVO: "Inativo", SUSPENSO: "Suspenso" };

export const rotuloSeveridade = (v?: string | null) => (v ? SEVERIDADE[v] ?? v : "");
export const rotuloPapel = (v?: string | null) => (v ? PAPEL[v] ?? v : "");
export const rotuloStatusMotorista = (v?: string | null) => (v ? STATUS_MOTORISTA[v] ?? v : "");
