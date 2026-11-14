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
import { ControlesListaPaginada } from "../components/ControlesListaPaginada";
import { useConfirm } from "../components/ConfirmProvider";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { usePrompt } from "../components/PromptProvider";
import { rotuloStatusMotorista } from "../utils/rotulos";

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
 * apaga nem anonimiza nada: registros de ponto e jornadas são sempre mantidos
 * (decisão de 13/11/2026).
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

const SEM_MOTORISTAS: RelatorioRetencao["motoristas"] = [];

function RetencaoConteudo() {
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [rel, setRel] = useState<RelatorioRetencao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [datas, setDatas] = useState<Record<string, string>>({});
  // Rodada 678: a tabela de motoristas passa a ter "mostrar 10/20/50/100 por vez" como as demais telas.
  // Ordem fixa por nome (esta lista não tem uma data útil para ordenar ou filtrar).
  const lista = useListaPaginada(rel?.motoristas ?? SEM_MOTORISTAS, () => null, {
    qtdInicial: 10,
    comparador: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
  });

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
    const justificativa = await prompt(
      "Justificativa para alterar a data de desligamento (fica registrada na auditoria):",
      {
        titulo: "Alterar desligamento",
        textoConfirmar: "Salvar",
        validar: (v) => (v.trim().length < 10 ? "Informe ao menos 10 caracteres." : null),
      },
    );
    if (justificativa === null || justificativa.trim().length < 10) return;
    try {
      await atualizarRetencaoMotorista(motoristaId, {
        dataDesligamento: nova === "" ? null : nova,
        justificativa: justificativa.trim(),
      });
      await carregar();
    } catch (err) {
      setErro(mensagemErro(err));
    }
  }

  async function bloquear(motoristaId: string, nome: string) {
    const processo = await prompt(
      `Número do processo ou referência do litígio para ${nome}:`,
      {
        titulo: "Bloquear exclusão",
        textoConfirmar: "Bloquear",
        validar: (v) => (v.trim().length < 3 ? "Informe ao menos 3 caracteres." : null),
      },
    );
    if (processo === null || processo.trim().length < 3) return;
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
    const justificativa = await prompt("Justificativa para liberar o bloqueio (fica registrada na auditoria):", {
      titulo: "Liberar bloqueio",
      textoConfirmar: "Liberar",
      validar: (v) => (v.trim().length < 10 ? "Informe ao menos 10 caracteres." : null),
    });
    if (justificativa === null || justificativa.trim().length < 10) return;
    try {
      await atualizarRetencaoMotorista(motoristaId, { bloqueado: false, justificativa: justificativa.trim() });
      await carregar();
    } catch (err) {
      setErro(mensagemErro(err));
    }
  }

  return (
    <div>
      <h2>Retenção de dados</h2>
      <p style={{ color: "#000000", fontSize: 13 }}>
        Esta tela apresenta as referências de conservação dos dados, conforme
        sua categoria e finalidade. A data exibida representa uma previsão de
        revisão da necessidade de conservação e não determina, por si só, a
        eliminação automática: o sistema não apaga nada sozinho. Registros
        sujeitos a obrigação legal, fiscalização, contestação ou processo em
        andamento poderão ter sua conservação prolongada pelo tempo necessário,
        com justificativa e controle de acesso (o bloqueio por processo marca
        esses casos). As marcações originais de ponto são preservadas. Dados
        que não precisem mais ser conservados deverão ser avaliados para
        eliminação ou anonimização.
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
            {rel.aviso}
          </p>
          <ControlesListaPaginada
            ordem={lista.ordem}
            onAlternarOrdem={lista.alternarOrdem}
            qtdPorPagina={lista.qtdPorPagina}
            onMudarQtdPorPagina={lista.mudarQtdPorPagina}
            pagina={lista.pagina}
            totalPaginas={lista.totalPaginas}
            popupAberto={lista.popupAberto}
            onAbrirPopup={lista.abrirPopup}
            onFecharPopup={lista.fecharPopup}
            onSelecionarPagina={lista.irParaPagina}
            tituloPopup="Retenção: motoristas"
            semOrdem
          >
          <div className="card" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Motorista</th>
                  <th>Situação</th>
                  <th>Data de desligamento</th>
                  <th>Revisão da conservação</th>
                  <th>Bloqueio por processo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.itensExibidos.map((m) => {
                  const atual = (m.dataDesligamento ?? "").slice(0, 10);
                  const valor = datas[m.motoristaId] ?? atual;
                  return (
                    <tr key={m.motoristaId}>
                      <td>{m.nome}</td>
                      <td>{rotuloStatusMotorista(m.status)}</td>
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
          </ControlesListaPaginada>
        </>
      )}
    </div>
  );
}
