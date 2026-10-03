import { useState } from "react";
import type {
  FiltroDocumentosCarga,
  StatusCargaViagem,
  TipoDocumentoCarga,
} from "../api/documentosCarga";
import type { Motorista } from "../api/types";

/**
 * Popup dedicado de busca de "Documentos de carga" (pedido do usuário:
 * "abre um poup up dedicado com as buscas"), igual em espírito ao
 * `PaginacaoPopup.tsx` já usado no painel , os filtros só se aplicam
 * quando o usuário clica "Buscar" (não a cada tecla), pra não disparar
 * uma requisição nova a cada caractere digitado.
 */
interface BuscaDocumentosCargaPopupProps {
  filtroInicial: FiltroDocumentosCarga;
  motoristas: Motorista[];
  onBuscar: (filtro: FiltroDocumentosCarga) => void;
  onFechar: () => void;
}

export function BuscaDocumentosCargaPopup({
  filtroInicial,
  motoristas,
  onBuscar,
  onFechar,
}: BuscaDocumentosCargaPopupProps) {
  const [tipo, setTipo] = useState<TipoDocumentoCarga | "">(
    filtroInicial.tipo ?? "",
  );
  const [statusCarga, setStatusCarga] = useState<StatusCargaViagem | "">(
    filtroInicial.statusCarga ?? "",
  );
  const [motoristaId, setMotoristaId] = useState(
    filtroInicial.motoristaId ?? "",
  );
  const [numero, setNumero] = useState(filtroInicial.numero ?? "");
  const [chaveAcesso, setChaveAcesso] = useState(
    filtroInicial.chaveAcesso ?? "",
  );

  function buscar() {
    onBuscar({
      tipo: tipo || undefined,
      statusCarga: statusCarga || undefined,
      motoristaId: motoristaId || undefined,
      numero: numero || undefined,
      chaveAcesso: chaveAcesso || undefined,
    });
    onFechar();
  }

  function limpar() {
    onBuscar({});
    onFechar();
  }

  return (
    <div
      onClick={onFechar}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: 420,
          maxWidth: "92vw",
          maxHeight: "80vh",
          overflowY: "auto",
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Buscar documentos</h3>
          <button className="secondary" onClick={onFechar} title="Fechar">
            ×
          </button>
        </div>

        <label>Número</label>
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="Número do CT-e/MDF-e"
        />

        <label>Chave de acesso</label>
        <input
          value={chaveAcesso}
          onChange={(e) => setChaveAcesso(e.target.value)}
          placeholder="Parte ou toda a chave de acesso"
        />

        <label>Tipo</label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoDocumentoCarga | "")}
        >
          <option value="">Todos</option>
          <option value="CTE">CT-e</option>
          <option value="MDFE">MDF-e</option>
        </select>

        <label>Status da carga</label>
        <select
          value={statusCarga}
          onChange={(e) =>
            setStatusCarga(e.target.value as StatusCargaViagem | "")
          }
        >
          <option value="">Todos</option>
          <option value="CARREGADO">Carregado</option>
          <option value="VAZIO">Vazio</option>
        </select>

        <label>Motorista</label>
        <select
          value={motoristaId}
          onChange={(e) => setMotoristaId(e.target.value)}
        >
          <option value="">Todos</option>
          {motoristas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button type="button" onClick={buscar}>
            Buscar
          </button>
          <button type="button" className="secondary" onClick={limpar}>
            Limpar filtros
          </button>
        </div>
      </div>
    </div>
  );
}
