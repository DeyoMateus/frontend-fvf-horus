import { mensagemDoErro } from "../utils/mensagemDoErro";
import { useCallback, useEffect, useState } from "react";
import {
  listarEspera235c11,
  registrarEspera235c11,
  ROTULO_RESPOSTA,
  ROTULO_TIPO_ESPERA,
} from "../api/espera235c11";
import type {
  ConfirmacaoEspera11,
  RespostaRequisito,
  TipoEsperaConfirmada,
} from "../api/espera235c11";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

function duracao(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}m` : `${m}m`;
}

/**
 * Registro INFORMATIVO dos requisitos do art. 235-C §11 (espera acima de 2 h).
 * Não altera jornada, banco de horas, extras nem o que sai para a folha: toda espera continua
 * integrando a jornada. Serve só como evidência de que o gestor confirmou (ou não) os requisitos.
 */
export function Espera235c11Card({ motoristaId }: { motoristaId: string }) {
  const [itens, setItens] = useState<ConfirmacaoEspera11[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [tipo, setTipo] = useState<TipoEsperaConfirmada>("CARGA");
  const [permanencia, setPermanencia] = useState<RespostaRequisito>("NAO_CONFIRMADO");
  const [condicoes, setCondicoes] = useState<RespostaRequisito>("NAO_CONFIRMADO");
  const [evidencia, setEvidencia] = useState("");
  const [corrige, setCorrige] = useState<string | undefined>(undefined);

  const carregar = useCallback(() => {
    listarEspera235c11(motoristaId)
      .then((l) => {
        setItens(l);
        setErro(null);
      })
      .catch(() => setErro("Não foi possível carregar os registros."));
  }, [motoristaId]);

  useEffect(carregar, [carregar]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await registrarEspera235c11(motoristaId, {
        inicioEspera: new Date(inicio).toISOString(),
        fimEspera: new Date(fim).toISOString(),
        tipoEspera: tipo,
        permanenciaObrigatoria: permanencia,
        condicoesAdequadas: condicoes,
        evidencia: evidencia.trim() || undefined,
        substituiId: corrige,
      });
      setAberto(false);
      setCorrige(undefined);
      setEvidencia("");
      carregar();
    } catch (err) {
      setErro(mensagemDoErro(err, "Não foi possível registrar."));
    } finally {
      setSalvando(false);
    }
  }

  function iniciarCorrecao(i: ConfirmacaoEspera11) {
    const p = (n: number) => String(n).padStart(2, "0");
    const campo = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    setInicio(campo(i.inicioEspera));
    setFim(campo(i.fimEspera));
    setTipo(i.tipoEspera);
    setPermanencia(i.permanenciaObrigatoria);
    setCondicoes(i.condicoesAdequadas);
    setEvidencia(i.evidencia ?? "");
    setCorrige(i.id);
    setAberto(true);
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Requisitos do art. 235-C, §11 (registro informativo)</h3>
      <p style={{ fontSize: 13 }}>
        Para esperas acima de 2 horas, guarde aqui a confirmação dos requisitos do §11: permanência
        obrigatória junto ao veículo e condições adequadas do local. Este registro é só informativo:
        não desconta a espera da jornada, não vira descanso e não altera horas extras, banco de horas
        nem o que é exportado para a folha. Se algo estiver errado, faça um novo registro corrigindo o
        anterior; o original fica guardado.
      </p>

      {erro && <p style={{ color: "#c4161c" }}>{erro}</p>}

      {!aberto && (
        <button type="button" onClick={() => setAberto(true)}>
          Registrar confirmação
        </button>
      )}

      {aberto && (
        <form onSubmit={salvar} style={{ marginTop: 8, maxWidth: 520 }}>
          {corrige && <p style={{ fontSize: 13 }}>Este registro vai corrigir um anterior.</p>}
          <label>Início da espera</label>
          <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
          <label style={{ display: "block", marginTop: 8 }}>Fim da espera</label>
          <input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} required />
          <label style={{ display: "block", marginTop: 8 }}>Tipo de espera</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoEsperaConfirmada)}>
            {(Object.keys(ROTULO_TIPO_ESPERA) as TipoEsperaConfirmada[]).map((k) => (
              <option key={k} value={k}>
                {ROTULO_TIPO_ESPERA[k]}
              </option>
            ))}
          </select>
          <label style={{ display: "block", marginTop: 8 }}>
            A empresa exigia que o motorista ficasse junto ao veículo?
          </label>
          <select value={permanencia} onChange={(e) => setPermanencia(e.target.value as RespostaRequisito)}>
            {(Object.keys(ROTULO_RESPOSTA) as RespostaRequisito[]).map((k) => (
              <option key={k} value={k}>
                {ROTULO_RESPOSTA[k]}
              </option>
            ))}
          </select>
          <label style={{ display: "block", marginTop: 8 }}>O local oferecia condições adequadas?</label>
          <select value={condicoes} onChange={(e) => setCondicoes(e.target.value as RespostaRequisito)}>
            {(Object.keys(ROTULO_RESPOSTA) as RespostaRequisito[]).map((k) => (
              <option key={k} value={k}>
                {ROTULO_RESPOSTA[k]}
              </option>
            ))}
          </select>
          <label style={{ display: "block", marginTop: 8 }}>
            Evidência usada (documento, comprovante, foto), em poucas palavras
          </label>
          <textarea value={evidencia} onChange={(e) => setEvidencia(e.target.value)} maxLength={500} rows={3} />
          <div style={{ marginTop: 8 }}>
            <button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar registro"}
            </button>{" "}
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                setCorrige(undefined);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div style={{ marginTop: 12 }}>
        {itens === null && !erro && <p>Carregando...</p>}
        {itens && itens.length === 0 && <p style={{ fontSize: 13 }}>Nenhum registro ainda.</p>}
        {itens && itens.length > 0 && (
          <table style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th>Espera</th>
                <th>Duração</th>
                <th>Tipo</th>
                <th>Permanência</th>
                <th>Condições</th>
                <th>Registrado por</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.id} style={i.corrigidoPorOutroRegistro ? { opacity: 0.55 } : undefined}>
                  <td>
                    {fmt(i.inicioEspera)} a {fmt(i.fimEspera)}
                  </td>
                  <td>
                    {duracao(i.resumo.duracaoMin)}
                    {!i.resumo.duracaoSuperiorADuasHoras && " (até 2 h)"}
                  </td>
                  <td>{ROTULO_TIPO_ESPERA[i.tipoEspera]}</td>
                  <td>{ROTULO_RESPOSTA[i.permanenciaObrigatoria]}</td>
                  <td>{ROTULO_RESPOSTA[i.condicoesAdequadas]}</td>
                  <td>
                    {i.confirmadoPorNome ?? "-"}
                    <br />
                    {fmt(i.createdAt)}
                    {i.corrigidoPorOutroRegistro && <div>Corrigido por registro posterior</div>}
                  </td>
                  <td>
                    {!i.corrigidoPorOutroRegistro && (
                      <button type="button" onClick={() => iniciarCorrecao(i)}>
                        Corrigir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
