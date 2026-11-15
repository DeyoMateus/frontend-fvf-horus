import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  baixarEspelhoAjudantePdf,
  getAjudante,
  obterEspelhoAjudante,
  verificarIntegridadeAjudante,
} from "../api/ajudantes";
import type { EspelhoAjudante, IntegridadeAjudante } from "../api/ajudantes";
import { listEmpresas } from "../api/empresas";
import type { Ajudante, Empresa } from "../api/types";
import { rotuloStatusMotorista } from "../utils/rotulos";
import { dataLocalIso } from "../utils/mascaras";

/**
 * Rodada 747: ficha do cadastro ANTIGO de ajudante, só para consulta. Ajudante novo é colaborador
 * (função Ajudante) e os antigos foram convertidos; aqui ficam os pontos antigos (espelho e PDF) e
 * a verificação de integridade da cadeia antiga. Sem aparelho, status, exclusão nem alertas.
 */

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

  const [ajudante, setAjudante] = useState<Ajudante | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

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
    void carregarEspelho();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ajudanteId, inicio, fim]);

  async function onBaixarEspelho() {
    if (!ajudante) return;
    setBaixandoPdf(true);
    try {
      const { inicioIso, fimIso } = periodoIso();
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

  return (
    <div>
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
      </p>
      {erro && <p className="error-text">{erro}</p>}

      {ajudante.excluidoEm && (
        <div className="card" style={{ background: "#fee2e2", borderColor: "#fecaca" }}>
          <strong style={{ color: "#b91c1c" }}>Cadastro excluído</strong>
          <p style={{ fontSize: 13, color: "#7f1d1d", margin: "4px 0 0" }}>
            Excluído em {new Date(ajudante.excluidoEm).toLocaleString("pt-BR")}
            {ajudante.motivoExclusao && <>, motivo: {ajudante.motivoExclusao}</>}. Todo o histórico
            continua intacto.
          </p>
        </div>
      )}

      {(
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
    </div>
  );
}
