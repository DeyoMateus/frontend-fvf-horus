import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listAjudantes } from "../api/ajudantes";
import type { Ajudante } from "../api/types";
import { rotuloStatusMotorista } from "../utils/rotulos";

/**
 * Rodada 747: "Ajudantes (histórico)". Só consulta do cadastro antigo de ajudante: ajudante novo é
 * colaborador com a função Ajudante, e os antigos foram convertidos (rodada 743). Cada linha abre a
 * ficha antiga (pontos antigos, espelho e integridade) e, quando convertido, a ficha do colaborador.
 */
export function AjudantesPage() {
  const [ajudantes, setAjudantes] = useState<Ajudante[]>([]);
  const [busca, setBusca] = useState("");
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const t = setTimeout(() => {
      setCarregando(true);
      listAjudantes(1, 200, busca, mostrarExcluidos)
        .then((r) => {
          if (!ativo) return;
          setAjudantes(r.dados);
          setErro(null);
        })
        .catch(() => {
          if (ativo) setErro("Não foi possível carregar o histórico de ajudantes.");
        })
        .finally(() => {
          if (ativo) setCarregando(false);
        });
    }, 300);
    return () => {
      ativo = false;
      clearTimeout(t);
    };
  }, [busca, mostrarExcluidos]);

  return (
    <div>
      <h2>Ajudantes (histórico)</h2>
      <div className="card" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
        Cadastro antigo, só para consulta. Para cadastrar ou acompanhar um ajudante, use{" "}
        <Link to="/motoristas?funcao=AJUDANTE">Colaboradores</Link> com a função Ajudante.
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <input
            maxLength={80}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CPF..."
            style={{ flex: 1, minWidth: 220 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, whiteSpace: "nowrap" }}>
            <input
              type="checkbox"
              checked={mostrarExcluidos}
              onChange={(e) => setMostrarExcluidos(e.target.checked)}
            />
            Mostrar excluídos
          </label>
        </div>
        {carregando && <p>Carregando...</p>}
        {erro && <p className="error-text">{erro}</p>}
        {!carregando && !erro && (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Status</th>
                <th>Cadastrado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ajudantes.map((a) => (
                <tr key={a.id}>
                  <td>{a.nome}</td>
                  <td>{a.cpf}</td>
                  <td>
                    {a.excluidoEm ? "Excluído" : rotuloStatusMotorista(a.status)}
                    {a.convertidoEmColaboradorEm && " · já é colaborador"}
                  </td>
                  <td>{new Date(a.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <Link to={`/ajudantes/${a.id}`}>Ver histórico</Link>
                    {a.convertidoEmColaboradorEm && (
                      <>
                        {" · "}
                        <Link to={`/motoristas/${a.id}`}>Abrir ficha do colaborador</Link>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {ajudantes.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    {busca ? "Nenhum ajudante encontrado para essa busca." : "Nenhum cadastro antigo de ajudante."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
