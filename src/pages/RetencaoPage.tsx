import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { listEmpresas } from "../api/empresas";
import {
  atualizarParametrosRetencao,
  atualizarRetencaoMotorista,
  obterRelatorioRetencao,
} from "../api/retencao";
import type { RelatorioRetencao } from "../api/retencao";
import type { Empresa } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../components/ConfirmProvider";

function mensagemErro(e: unknown): string {
  const m = (e as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  if (Array.isArray(m)) return m.join(" ");
  return m ?? "Não foi possível concluir a operação.";
}

function numOuNull(v: string): number | null {
  return v.trim() === "" ? null : Number(v);
}

/**
 * Passo 45 (rodada 399): retenção de dados. Parâmetros por empresa (vazio =
 * mínimo da lei; nunca abaixo dele), data de desligamento do motorista,
 * bloqueio por processo (legal hold) e relatório informativo. Esta tela não
 * apaga nem anonimiza nada: o expurgo só será ligado após validação jurídica.
 */
export function RetencaoPage() {
  const { usuario } = useAuth();
  if (usuario?.papel !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return <RetencaoConteudo />;
}

function ParametrosEmpresa({
  empresa,
  onSalvo,
}: {
  empresa: Empresa;
  onSalvo: () => void;
}) {
  const [anos, setAnos] = useState(String(empresa.retencaoRegistroAnos ?? ""));
  const [meses, setMeses] = useState(
    String(empresa.retencaoPosDesligamentoMeses ?? ""),
  );
  const [margem, setMargem] = useState(
    String(empresa.retencaoMargemMeses ?? ""),
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setMsg(null);
    setErro(null);
    try {
      await atualizarParametrosRetencao(empresa.id, {
        retencaoRegistroAnos: numOuNull(anos),
        retencaoPosDesligamentoMeses: numOuNull(meses),
        retencaoMargemMeses: numOuNull(margem),
      });
      setMsg("Parâmetros salvos.");
      onSalvo();
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        {empresa.razaoSocial} ({empresa.cnpj})
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <div>
          <label>Anos de guarda dos registros (mínimo 5)</label>
          <input
            type="number"
            min={5}
            max={30}
            value={anos}
            onChange={(e) => setAnos(e.target.value)}
            placeholder="vazio = mínimo da lei"
          />
        </div>
        <div>
          <label>Meses de guarda após o desligamento (mínimo 24)</label>
          <input
            type="number"
            min={24}
            max={240}
            value={meses}
            onChange={(e) => setMeses(e.target.value)}
            placeholder="vazio = mínimo da lei"
          />
        </div>
        <div>
          <label>Margem de segurança (meses)</label>
          <input
            type="number"
            min={0}
            max={60}
            value={margem}
            onChange={(e) => setMargem(e.target.value)}
            placeholder="vazio = padrão"
          />
        </div>
      </div>
      {erro && <p className="error-text">{erro}</p>}
      {msg && <p style={{ color: "#000000" }}>{msg}</p>}
      <div style={{ marginTop: 8 }}>
        <button type="button" onClick={salvar}>
          Salvar parâmetros
        </button>
      </div>
    </div>
  );
}

function RetencaoConteudo() {
  const confirm = useConfirm();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [rel, setRel] = useState<RelatorioRetencao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [datas, setDatas] = useState<Record<string, string>>({});

  async function carregar() {
    setCarregando(true);
    try {
      const [e, r] = await Promise.all([
        listEmpresas(),
        obterRelatorioRetencao(),
      ]);
      setEmpresas(e);
      setRel(r);
      setErro(null);
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvarDesligamento(motoristaId: string, atual?: string | null) {
    const nova = datas[motoristaId];
    if (nova === undefined || nova === (atual ?? "").slice(0, 10)) return;
    try {
      await atualizarRetencaoMotorista(motoristaId, {
        dataDesligamento: nova === "" ? null : nova,
      });
      await carregar();
    } catch (err) {
      setErro(mensagemErro(err));
    }
  }

  async function bloquear(motoristaId: string, nome: string) {
    const processo = window.prompt(
      `Número do processo ou referência do litígio para ${nome}:`,
    );
    if (!processo || processo.trim().length < 3) return;
    try {
      await atualizarRetencaoMotorista(motoristaId, {
        bloqueado: true,
        processo: processo.trim(),
      });
      await carregar();
    } catch (err) {
      setErro(mensagemErro(err));
    }
  }

  async function liberar(motoristaId: string, nome: string) {
    const ok = await confirm(
      `Liberar o bloqueio de retenção de ${nome}? Os dados voltam a seguir o prazo normal.`,
    );
    if (!ok) return;
    try {
      await atualizarRetencaoMotorista(motoristaId, { bloqueado: false });
      await carregar();
    } catch (err) {
      setErro(mensagemErro(err));
    }
  }

  return (
    <div>
      <h2>Retenção de dados</h2>
      <p style={{ color: "#000000", fontSize: 13 }}>
        Define por quanto tempo os dados de ponto são guardados. Campos vazios
        usam o mínimo previsto em lei; nenhum valor abaixo dele é aceito. Esta
        tela não apaga nem anonimiza nenhum dado: o expurgo só será ligado
        depois de validação jurídica. Motorista com bloqueio por processo não
        entra em nenhum critério de expurgo.
      </p>
      {erro && <p className="error-text">{erro}</p>}
      {carregando && <p>Carregando...</p>}

      <h3>Parâmetros por empresa</h3>
      {empresas.map((e) => (
        <ParametrosEmpresa key={e.id} empresa={e} onSalvo={carregar} />
      ))}

      <h3>Motoristas</h3>
      {rel && (
        <>
          <p style={{ color: "#000000", fontSize: 13 }}>
            {rel.aviso} Registros que já cumpriram o prazo (informativo):{" "}
            {rel.totalElegiveis}.
          </p>
          <div className="card" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Motorista</th>
                  <th>Situação</th>
                  <th>Data de desligamento</th>
                  <th>Prazo após desligamento</th>
                  <th>Registros além do prazo</th>
                  <th>Bloqueio por processo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rel.motoristas.map((m) => {
                  const atual = (m.dataDesligamento ?? "").slice(0, 10);
                  const valor = datas[m.motoristaId] ?? atual;
                  return (
                    <tr key={m.motoristaId}>
                      <td>{m.nome}</td>
                      <td>{m.status}</td>
                      <td>
                        <input
                          type="date"
                          value={valor}
                          onChange={(e) =>
                            setDatas((d) => ({
                              ...d,
                              [m.motoristaId]: e.target.value,
                            }))
                          }
                          onBlur={() =>
                            salvarDesligamento(m.motoristaId, m.dataDesligamento)
                          }
                        />
                      </td>
                      <td>
                        {m.dataDesligamento
                          ? m.prazoPosDesligamentoVencido
                            ? "Vencido"
                            : "Em curso"
                          : "Sem desligamento"}
                      </td>
                      <td>{m.registrosElegiveisAoExpurgo}</td>
                      <td>
                        {m.bloqueado ? `Bloqueado (${m.processo ?? ""})` : "Não"}
                      </td>
                      <td>
                        {m.bloqueado ? (
                          <button
                            type="button"
                            onClick={() => liberar(m.motoristaId, m.nome)}
                          >
                            Liberar bloqueio
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => bloquear(m.motoristaId, m.nome)}
                          >
                            Bloquear por processo
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
