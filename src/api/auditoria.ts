import { api } from "./client";
import { superAdminApi } from "./superAdminClient";
import type { ActorType, OcorrenciaAuditoria, PaginaAuditoria } from "./types";

// Espelha AuditoriaController (painel ADMIN/GESTOR , sempre restrito
// ao próprio grupo) e o pedaço de auditoria em SuperAdminController
// (painel super admin , sem restrição de grupo por padrão, ou filtrado
// por um grupo específico via `grupoId`). Rodada 66.
export interface FiltroAuditoria {
  page?: number;
  pageSize?: number;
  actorType?: ActorType;
  acoes?: string[];
  entidade?: string;
  entidadeId?: string;
  dataInicio?: string;
  dataFim?: string;
  /** Rodada 108 , ordenar do mais recente pro mais antigo, ou o inverso. Default (não informado): 'desc'. */
  ordem?: "asc" | "desc";
}

function paramsDoFiltro(filtro: FiltroAuditoria) {
  return {
    page: filtro.page,
    pageSize: filtro.pageSize,
    actorType: filtro.actorType || undefined,
    acoes: filtro.acoes && filtro.acoes.length > 0 ? filtro.acoes : undefined,
    entidade: filtro.entidade || undefined,
    entidadeId: filtro.entidadeId || undefined,
    dataInicio: filtro.dataInicio || undefined,
    dataFim: filtro.dataFim || undefined,
    ordem: filtro.ordem || undefined,
  };
}

export function listarAuditoria(filtro: FiltroAuditoria) {
  return api
    .get<PaginaAuditoria>("/auditoria", { params: paramsDoFiltro(filtro) })
    .then((r) => r.data);
}

export function listarOcorrenciasAuditoria() {
  return api
    .get<OcorrenciaAuditoria[]>("/auditoria/ocorrencias")
    .then((r) => r.data);
}

export function listarAuditoriaSuperAdmin(
  filtro: FiltroAuditoria & { grupoId?: string },
) {
  return superAdminApi
    .get<PaginaAuditoria>("/super-admin/auditoria", {
      params: {
        ...paramsDoFiltro(filtro),
        grupoId: filtro.grupoId || undefined,
      },
    })
    .then((r) => r.data);
}

export function listarOcorrenciasAuditoriaSuperAdmin(grupoId?: string) {
  return superAdminApi
    .get<
      OcorrenciaAuditoria[]
    >("/super-admin/auditoria/ocorrencias", { params: { grupoId: grupoId || undefined } })
    .then((r) => r.data);
}
