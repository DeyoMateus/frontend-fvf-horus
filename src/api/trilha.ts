import { api } from "./client";

/** Uma coleta de localização feita no aparelho durante a direção (1 por hora). */
export interface AmostraTrilha {
  id: string;
  latitude: string | number | null;
  longitude: string | number | null;
  precisaoGpsM: number | null;
  capturadoEm: string;
}

// Espelha TrilhaLocalizacaoController (ADMIN e GESTOR; cada consulta é auditada).
export function listarTrilha(motoristaId: string) {
  return api
    .get<AmostraTrilha[]>(`/amostras-localizacao/motorista/${motoristaId}`)
    .then((r) => r.data);
}
