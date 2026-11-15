import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AbasTopo, useAbaAtiva, type AbaDef } from "../components/AbasTopo";
import { AlertasPontoAjudante } from "../components/AlertasPontoAjudante";
import { useConfirm } from "../components/ConfirmProvider";
import { usePrompt } from "../components/PromptProvider";
import {
  atualizarStatusAjudante,
  baixarEspelhoAjudantePdf,
  contarAlertasPendentesEspelho,
  excluirAjudante,
  getAjudante,
  obterEspelhoAjudante,
  reativarAjudante,
  revogarDispositivoAjudante,
  verificarIntegridadeAjudante,
  vincularDispositivoAjudante,
} from "../api/ajudantes";
import type { EspelhoAjudante, IntegridadeAjudante } from "../api/ajudantes";
import { listEmpresas } from "../api/empresas";
import type { Ajudante, Empresa, StatusMotorista } from "../api/types";
import { rotuloStatusMotorista } from "../utils/rotulos";
import { dataLocalIso } from "../utils/mascaras";

/**
 * Rodada 739: ficha do ajudante, no mesmo formato da ficha do motorista (abas no topo, na
 * linha do sino). O ajudante não tem veículo, CT-e/MDF-e, folgas nem tratamento de ponto;
 * por isso as abas são só Cadastro, Registros e Alertas.
 */
const ABAS_AJUDANTE: AbaDef[] = [
  { id: "cadastro", rotulo: "Cadastro" },
  { id: "registros", rotulo: "Registros" },
  { id: "alertas", rotulo: "Alertas" },
];

const ROTULO_EVENTO: Record<string, string> = {
  INICIO_JORNADA: "Início de jornada",
  INICIO_DESCANSO: "Início de descanso",
  FIM_DESCANSO: "Fim de descanso",
  INICIO_CARREGAMENTO: "Início de carregamento",
  FIM_CARREGAMENTO: "Fim de carregamento",
  INICIO_DESCARGA: "Início de descarga",
  FIM_DESCARGA: "Fim de descarga",
  FIM_JORNADA: "Fim de jornada",
};

const ROTULO_SINAL: Record<string, string> = {
  RELOGIO_RETROCEDIDO: "hora anterior ao ponto anterior",
  RELOGIO_ADIANTADO: "relógio adiantado",
  RELOGIO_MONOTONICO_DIVERGENTE: "relógio mexido entre dois pontos",
  POSICAO_MARCADA_COMO_FALSA: "localização possivelmente alterada",
  RELOGIO_INCERTO: "relógio do aparelho incerto",
  HORA_CORRIGIDA: "hora corrigida pelo gestor",
};

function horas(min: number): string {
  const m = Math.max(0, Math.round(min));
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

function mensagemDoServidor(ex: unknown, padrao: string): string {
  const msg = (ex as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof msg === "string" && msg ? msg : padrao;
}

export function AjudanteDetailPage() {
  const { ajudanteId = "" } = useParams();
  const navigate = useNavigate();
  const confirmar = useConfirm();
  const prompt = usePrompt();
  const aba = useAbaAtiva(ABAS_AJUDANTE);

  const [ajudante, setAjudante] = useState<Ajudante | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [alterando, setAlterando] = useState(false);
  const [chaveGerada, setChaveGerada] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [inicio, setInicio] = useState(() => {
    const d = new Date();
    return dataLocalIso(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [fim, setFim] = useState(() => dataLocalIso(new Date()));
  const [espelho, setEspelho] = useState<EspelhoAjudante | null>(null);
  const [carregandoEspelho, setCarregandoEspelho] = useState(false);
  const [erroEspelho, setErroEspelho] = useState<string | null>(null);
  const [baixandoPdf, setBaixandoPdf] = useState(false);
  const [jornadaAberta, setJornadaAberta] = useState<string | null>(null);
  // Rodada 743: integridade da cadeia do cadastro antigo.
  const [integridade, setIntegridade] = useState<IntegridadeAjudante | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [erroIntegridade, setErroIntegridade] = useState<string | null>(null);
  async function onVerificarIntegridade() {
    setVerificando(true);
    setErroIntegridade(null);
    try {
      setIntegridade(await verificarIntegridadeAjudante(ajudanteId));
    } catch (ex) {
      setErroIntegridade(mensagemDoServidor(ex, "Não foi possível verificar a integridade agora."));
    } finally {
      setVerificando(false);
    }
  }

  const periodoIso = () => ({
    inicioIso: new Date(`${inicio}T00:00:00`).toISOString(),
    fimIso: new Date(`${fim}T23:59:59.999`).toISOString(),
  });

  async function carregar() {
    setCarregando(true);
    try {
      setAjudante(await getAjudante(ajudanteId));
      setErro(null);
    } catch (ex) {
      setErro(mensagemDoServidor(ex, "Não foi possível carregar o ajudante."));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
    listEmpresas()
      .then(setEmpresas)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ajudanteId]);

  async function carregarEspelho() {
    if (!inicio || !fim) return;
    setCarregandoEspelho(true);
    setErroEspelho(null);
    try {
      const { inicioIso, fimIso } = periodoIso();
      setEspelho(await obterEspelhoAjudante(ajudanteId, inicioIso, fimIso));
    } catch (ex) {
      setEspelho(null);
      setErroEspelho(mensagemDoServidor(ex, "Não foi possível carregar os registros do período."));
    } finally {
      setCarregandoEspelho(false);
    }
  }

  useEffect(() => {
    if (aba !== "registros") return;
    void carregarEspelho();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, ajudanteId, inicio, fim]);

  async function onAlterarStatus(status: StatusMotorista) {
    setAlterando(true);
    setErro(null);
    try {
      await atualizarStatusAjudante(ajudanteId, status);
      await carregar();
    } catch (ex) {
      setErro(mensagemDoServidor(ex, "Não foi possível alterar o status."));
    } finally {
      setAlterando(false);
    }
  }

  async function onExcluir() {
    if (!ajudante) return;
    const confirmacao = await prompt(
      `Para excluir o cadastro de ${ajudante.nome}, digite EXCLUIR (só é possível para quem nunca bateu ponto):`,
      { titulo: "Excluir cadastro", perigo: true, textoConfirmar: "Excluir" },
    );
    if (confirmacao !== "EXCLUIR") return;
    const motivo =
      (await prompt("Motivo (opcional):", {
        titulo: "Excluir cadastro",
        placeholder: "Motivo (opcional)",
        multilinha: true,
      })) ?? undefined;
    setAlterando(true);
    try {
      await excluirAjudante(ajudanteId, motivo || undefined);
      navigate("/ajudantes");
    } catch (ex) {
      setErro(mensagemDoServidor(ex, "Não foi possível excluir o cadastro."));
      setAlterando(false);
    }
  }

  async function onReativarCadastro() {
    setAlterando(true);
    try {
      await reativarAjudante(ajudanteId);
      await carregar();
    } catch (ex) {
      setErro(mensagemDoServidor(ex, "Não foi possível reativar o cadastro."));
    } finally {
      setAlterando(false);
    }
  }

  async function onVincular() {
    if (!ajudante) return;
    const deviceUuid = await prompt(
      "UUID do aparelho (gerado pelo próprio app do ajudante na primeira instalação):",
      { titulo: `Vincular dispositivo de ${ajudante.nome}` },
    );
    if (!deviceUuid) return;
    try {
      const r = await vincularDispositivoAjudante(ajudanteId, deviceUuid.trim());
      setChaveGerada(r.deviceApiKey);
      await carregar();
    } catch (ex) {
      setErro(mensagemDoServidor(ex, "Não foi possível vincular o aparelho."));
    }
  }

  async function onRevogar() {
    if (!ajudante) return;
    if (
      !(await confirmar(
        `Revogar o vínculo de dispositivo de ${ajudante.nome}? O aparelho para de bater ponto imediatamente.`,
        { perigo: true, textoConfirmar: "Revogar" },
      ))
    )
      return;
    try {
      await revogarDispositivoAjudante(ajudanteId);
      setChaveGerada(null);
      await carregar();
    } catch (ex) {
      setErro(mensagemDoServidor(ex, "Não foi possível revogar o aparelho."));
    }
  }

  async function onBaixarEspelho() {
    if (!ajudante) return;
    setBaixandoPdf(true);
    try {
      const { inicioIso, fimIso } = periodoIso();
      const pendentes = await contarAlertasPendentesEspelho(ajudanteId, inicioIso, fimIso).catch(() => 0);
      if (
        pendentes > 0 &&
        !(await confirmar(
          `${ajudante.nome} tem ${pendentes} alerta(s) de ponto não tratado(s) neste período. As horas do espelho podem mudar depois do tratamento. Baixar o espelho assim mesmo?`,
          { textoConfirmar: "Baixar assim mesmo" },
        ))
      ) {
        return;
      }
      await baixarEspelhoAjudantePdf(ajudanteId, ajudante.nome, inicioIso, fimIso);
    } catch {
      setErroEspelho("Não foi possível gerar o espelho de ponto agora (confira o período e tente de novo).");
    } finally {
      setBaixandoPdf(false);
    }
  }

  if (carregando && !ajudante) return <p>Carregando...</p>;
  if (!ajudante) {
    return (
      <div>
        <p className="error-text">{erro ?? "Ajudante não encontrado."}</p>
        <Link to="/ajudantes">Voltar para Ajudantes</Link>
      </div>
    );
  }

  const empresa = empresas.find((e) => e.id === ajudante.empresaId);
  const vinculo = ajudante.dispositivoVinculado;

  return (
    <div>
      <AbasTopo abas={ABAS_AJUDANTE} />

      <p style={{ fontSize: 13, marginBottom: 4 }}>
        <Link to="/ajudantes">Ajudantes</Link> / ficha
      </p>
      <h2>{ajudante.nome}</h2>
      {ajudante.convertidoEmColaboradorEm && (
        <div className="card" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
          <strong>Cadastro antigo, só para consulta.</strong>{" "}
          Em {new Date(ajudante.convertidoEmColaboradorEm).toLocaleDateString("pt-BR")} este ajudante
          passou a ser colaborador. Os pontos novos, o tratamento, as folgas e os fechamentos ficam
          na{" "}
          <Link to={`/motoristas/${ajudante.id}`}>ficha do colaborador</Link>. Os pontos abaixo
          foram batidos antes e continuam guardados.
        </div>
      )}
      <p style={{ color: "#000000", marginTop: -8 }}>
        CPF {ajudante.cpf} · {ajudante.cargo ?? "Ajudante"}
        {ajudante.telefone && <> · {ajudante.telefone}</>}
        {empresa && (
          <>
            {" "}
            · {empresa.razaoSocial} ({empresa.cnpj})
          </>
        )}{" "}
        ·{" "}
        <span
          style={{
            color:
              ajudante.status === "ATIVO"
                ? "#166534"
                : ajudante.status === "SUSPENSO"
                  ? "#b45309"
                  : "#000",
            fontWeight: 600,
          }}
        >
          status {rotuloStatusMotorista(ajudante.status)}
        </span>{" "}
        · cadastrado na plataforma em{" "}
        <strong>{new Date(ajudante.createdAt).toLocaleString("pt-BR")}</strong>
        {!ajudante.excluidoEm && !ajudante.convertidoEmColaboradorEm && (
          <>
            {ajudante.status !== "ATIVO" && (
              <button
                type="button"
                disabled={alterando}
                onClick={() => void onAlterarStatus("ATIVO")}
                style={{ fontSize: 12, marginLeft: 8, marginTop: 8 }}
              >
                Reativar
              </button>
            )}
            {ajudante.status !== "SUSPENSO" && (
              <button
                type="button"
                disabled={alterando}
                onClick={() => void onAlterarStatus("SUSPENSO")}
                style={{ fontSize: 12, marginLeft: 8, marginTop: 8 }}
              >
                Suspender
              </button>
            )}
            {ajudante.status !== "INATIVO" && (
              <button
                type="button"
                disabled={alterando}
                onClick={() => void onAlterarStatus("INATIVO")}
                style={{ fontSize: 12, marginLeft: 8, marginTop: 8 }}
              >
                Inativar (arquivo morto)
              </button>
            )}
            <button
              type="button"
              className="danger"
              disabled={alterando}
              onClick={() => void onExcluir()}
              style={{ fontSize: 12, marginLeft: 8, marginTop: 8 }}
            >
              Excluir cadastro
            </button>
          </>
        )}
      </p>
      {erro && <p className="error-text">{erro}</p>}

      {ajudante.excluidoEm && (
        <div className="card" style={{ background: "#fee2e2", borderColor: "#fecaca" }}>
          <strong style={{ color: "#b91c1c" }}>Cadastro excluído</strong>
          <p style={{ fontSize: 13, color: "#7f1d1d", margin: "4px 0 0" }}>
            Excluído em {new Date(ajudante.excluidoEm).toLocaleString("pt-BR")}
            {ajudante.motivoExclusao && <>, motivo: {ajudante.motivoExclusao}</>}. Não aparece
            mais na listagem normal, mas todo o histórico continua intacto.
          </p>
          <button
            type="button"
            style={{ marginTop: 8 }}
            disabled={alterando}
            onClick={() => void onReativarCadastro()}
          >
            Reativar cadastro
          </button>
        </div>
      )}

      {aba === "cadastro" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Dispositivo vinculado</h3>
          <p style={{ fontSize: 13, color: "#000000" }}>
            ID do ajudante (informe ao ajudante para ele completar o vínculo no app):
            <br />
            <code style={{ fontSize: 13 }}>{ajudante.id}</code>{" "}
            <button
              type="button"
              style={{ fontSize: 12 }}
              onClick={() => {
                void navigator.clipboard?.writeText(ajudante.id).then(() => {
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 1500);
                });
              }}
            >
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </p>
          {vinculo ? (
            <>
              <p style={{ fontSize: 13 }}>
                Aparelho vinculado: <code>{vinculo.deviceUuid}</code>
                {vinculo.vinculadoEm && (
                  <> desde {new Date(vinculo.vinculadoEm).toLocaleString("pt-BR")}</>
                )}
              </p>
              <button type="button" className="danger" onClick={() => void onRevogar()}>
                Revogar aparelho
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13 }}>Nenhum aparelho vinculado.</p>
              {!ajudante.excluidoEm && !ajudante.convertidoEmColaboradorEm && (
                <button type="button" onClick={() => void onVincular()}>
                  Vincular aparelho
                </button>
              )}
            </>
          )}
          {chaveGerada && (
            <p style={{ fontSize: 13, marginTop: 12 }}>
              Chave do aparelho (aparece só agora, informe ao ajudante):{" "}
              <code>{chaveGerada}</code>
            </p>
          )}
        </div>
      )}

      {aba === "registros" && (
        <>
          <div
            className="card"
            style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}
          >
            <label>
              Início
              <br />
              <input type="date" value={inicio} max={fim} onChange={(e) => setInicio(e.target.value)} />
            </label>
            <label>
              Fim
              <br />
              <input
                type="date"
                value={fim}
                min={inicio}
                max={dataLocalIso(new Date())}
                onChange={(e) => setFim(e.target.value)}
              />
            </label>
            <button type="button" disabled={baixandoPdf} onClick={() => void onBaixarEspelho()}>
              {baixandoPdf ? "Gerando..." : "Baixar espelho de ponto (PDF)"}
            </button>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Integridade da cadeia de jornada</h3>
            <p style={{ fontSize: 13 }}>
              Confere se algum ponto deste cadastro foi alterado, removido ou inserido depois de
              gravado (cada ponto é ligado ao anterior por um código de integridade).
            </p>
            <button type="button" disabled={verificando} onClick={() => void onVerificarIntegridade()}>
              {verificando ? "Verificando..." : "Verificar integridade"}
            </button>
            {erroIntegridade && <p className="error-text">{erroIntegridade}</p>}
            {integridade && (
              <p style={{ fontSize: 13, marginTop: 8, color: integridade.valido ? "#166534" : "#b91c1c" }}>
                {integridade.valido
                  ? `Cadeia íntegra: ${integridade.totalRegistros} ponto(s) conferido(s).`
                  : `Foram encontradas ${integridade.quebras.length} divergência(s) em ${integridade.totalRegistros} ponto(s): ` +
                    integridade.quebras.map((q) => `#${q.sequencial} (${q.motivo})`).join("; ")}
                {" "}· verificado em {new Date(integridade.verificadoEm).toLocaleString("pt-BR")}
              </p>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Jornadas por dia</h3>
            {erroEspelho && <p className="error-text">{erroEspelho}</p>}
            {carregandoEspelho && <p>Carregando...</p>}
            {espelho && !carregandoEspelho && (
              <table>
                <thead>
                  <tr>
                    <th>Início</th>
                    <th>Fim</th>
                    <th>Duração</th>
                    <th>Descanso</th>
                    <th>Carregamento</th>
                    <th>Descarga</th>
                    <th>Trabalhado</th>
                    <th>Sinais</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {espelho.jornadas.map((j) => (
                    <Fragment key={j.inicio}>
                      <tr>
                        <td>{new Date(j.inicio).toLocaleString("pt-BR")}</td>
                        <td>
                          {j.fim ? new Date(j.fim).toLocaleString("pt-BR") : "em aberto (sem fim de jornada)"}
                        </td>
                        <td>{horas(j.duracaoMin)}</td>
                        <td>{horas(j.descansoMin)}</td>
                        <td>{horas(j.carregamentoMin)}</td>
                        <td>{horas(j.descargaMin)}</td>
                        <td>{horas(j.trabalhadoMin)}</td>
                        <td style={{ fontSize: 12 }}>
                          {j.sinais.length > 0 ? j.sinais.map((s) => ROTULO_SINAL[s] ?? s).join("; ") : "nenhum"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="secondary"
                            style={{ fontSize: 12 }}
                            onClick={() => setJornadaAberta(jornadaAberta === j.inicio ? null : j.inicio)}
                          >
                            {jornadaAberta === j.inicio ? "Ocultar registros" : "Ver registros"}
                          </button>
                        </td>
                      </tr>
                      {jornadaAberta === j.inicio && (
                        <tr>
                          <td colSpan={9} style={{ background: "#f9fafb" }}>
                            <ul style={{ fontSize: 13, margin: 0 }}>
                              {j.eventos.map((e, i) => (
                                <li key={`${e.timestampEvento}-${i}`}>
                                  {new Date(e.timestampEvento).toLocaleString("pt-BR")}:{" "}
                                  {ROTULO_EVENTO[e.tipoEvento] ?? e.tipoEvento}
                                  {(e.flagsConfianca?.length ?? 0) > 0 && (
                                    <> ({e.flagsConfianca!.map((f) => ROTULO_SINAL[f] ?? f).join("; ")})</>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {espelho.jornadas.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ color: "#000000" }}>
                        Nenhuma jornada no período.
                      </td>
                    </tr>
                  )}
                  {espelho.jornadas.length > 0 && (
                    <tr style={{ fontWeight: 600 }}>
                      <td colSpan={2}>Total ({espelho.totais.jornadas} jornada(s))</td>
                      <td>{horas(espelho.totais.duracaoMin)}</td>
                      <td>{horas(espelho.totais.descansoMin)}</td>
                      <td>{horas(espelho.totais.carregamentoMin)}</td>
                      <td>{horas(espelho.totais.descargaMin)}</td>
                      <td>{horas(espelho.totais.trabalhadoMin)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {aba === "alertas" && <AlertasPontoAjudante key={ajudanteId} ajudanteId={ajudanteId} />}
    </div>
  );
}
