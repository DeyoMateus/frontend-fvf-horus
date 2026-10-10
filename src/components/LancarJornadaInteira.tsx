import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  anexarEvidenciaTratamento,
  createJornadaTratamento,
} from "../api/tratamentos";
import type { TipoEvento } from "../api/types";
import {
  instanteDaParede,
  resolverFusoDoAjuste,
  rotuloUtc,
} from "../utils/fusoHorario";

const ROTULOS: Record<TipoEvento, string> = {
  INICIO_JORNADA: "Início de jornada",
  FIM_JORNADA: "Fim de jornada",
  INICIO_DIRECAO: "Início de direção",
  FIM_DIRECAO: "Fim de direção",
  INICIO_DESCANSO: "Início de descanso",
  FIM_DESCANSO: "Fim de descanso",
  ESPERA_CARGA_DESCARGA: "Início de espera (carga/descarga)",
  FIM_ESPERA_CARGA_DESCARGA: "Fim de espera (carga/descarga)",
  FIM_DESCARREGAMENTO: "Fim de descarregamento",
  OUTRO: "Aguardando documentação",
};

/** Mesma máquina de estados do app e do servidor: o que pode vir depois de cada evento. */
const PROXIMOS: Record<TipoEvento, TipoEvento[]> = {
  INICIO_JORNADA: [
    "INICIO_DIRECAO",
    "INICIO_DESCANSO",
    "ESPERA_CARGA_DESCARGA",
    "OUTRO",
    "FIM_JORNADA",
  ],
  FIM_DIRECAO: [
    "INICIO_DIRECAO",
    "INICIO_DESCANSO",
    "ESPERA_CARGA_DESCARGA",
    "OUTRO",
    "FIM_JORNADA",
  ],
  FIM_DESCANSO: [
    "INICIO_DIRECAO",
    "INICIO_DESCANSO",
    "ESPERA_CARGA_DESCARGA",
    "OUTRO",
    "FIM_JORNADA",
  ],
  FIM_ESPERA_CARGA_DESCARGA: [
    "INICIO_DIRECAO",
    "INICIO_DESCANSO",
    "ESPERA_CARGA_DESCARGA",
    "OUTRO",
    "FIM_JORNADA",
  ],
  FIM_DESCARREGAMENTO: [
    "INICIO_DIRECAO",
    "INICIO_DESCANSO",
    "ESPERA_CARGA_DESCARGA",
    "OUTRO",
    "FIM_JORNADA",
  ],
  INICIO_DIRECAO: ["FIM_DIRECAO"],
  INICIO_DESCANSO: ["FIM_DESCANSO"],
  ESPERA_CARGA_DESCARGA: ["FIM_ESPERA_CARGA_DESCARGA", "FIM_DESCARREGAMENTO"],
  FIM_JORNADA: ["INICIO_JORNADA"],
  OUTRO: ["INICIO_DIRECAO", "INICIO_DESCANSO", "ESPERA_CARGA_DESCARGA", "FIM_JORNADA"],
};

interface Linha {
  id: number;
  tipo: TipoEvento;
  hora: string; // HH:mm
}

let proximoId = 1;
const novaLinha = (tipo: TipoEvento, hora = ""): Linha => ({
  id: proximoId++,
  tipo,
  hora,
});

const modeloInicial = (): Linha[] => [
  novaLinha("INICIO_JORNADA"),
  novaLinha("INICIO_DIRECAO"),
  novaLinha("FIM_DIRECAO"),
  novaLinha("FIM_JORNADA"),
];

function dataBr(iso: string): string {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

/**
 * Lança uma jornada INTEIRA de uma vez (do início ao fim), em vez de um
 * evento por vez. Cada linha vira um tratamento de ponto comum (mesma
 * ancoragem e mesmos relatórios); o servidor valida tudo antes de gravar
 * qualquer evento, então a jornada nunca fica pela metade.
 */
export function LancarJornadaInteira({
  motoristaId,
  registros,
  dataInicial,
  abrirInicialmente,
  onLancado,
}: {
  motoristaId: string;
  registros: { timestampEvento: string; fusoOffsetMin?: number | null }[];
  dataInicial?: string;
  abrirInicialmente?: boolean;
  onLancado: () => void | Promise<void>;
}) {
  const [aberto, setAberto] = useState(!!abrirInicialmente);
  const [data, setData] = useState(dataInicial ?? "");
  const [linhas, setLinhas] = useState<Linha[]>(modeloInicial);
  const [motivo, setMotivo] = useState("");
  const [evidencias, setEvidencias] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    if (abrirInicialmente) setAberto(true);
    if (dataInicial) setData(dataInicial);
  }, [abrirInicialmente, dataInicial]);

  // Calcula o instante de cada linha: a data vale para a primeira; se o
  // horário de uma linha for menor ou igual ao da anterior, a jornada
  // virou a noite e ela cai no dia seguinte.
  function calcularInstantes(): { ms: number[]; offsetMin: number; doMotorista: boolean } | null {
    if (!data || linhas.some((l) => !l.hora)) return null;
    const fuso = resolverFusoDoAjuste(`${data}T${linhas[0].hora}`, registros);
    const ms: number[] = [];
    let base = data;
    for (let i = 0; i < linhas.length; i++) {
      let m = instanteDaParede(`${base}T${linhas[i].hora}`, fuso.offsetMin);
      if (Number.isNaN(m)) return null;
      while (i > 0 && m <= ms[i - 1]) m += 24 * 3_600_000;
      ms.push(m);
    }
    return { ms, offsetMin: fuso.offsetMin, doMotorista: fuso.doMotorista };
  }

  const calculado = calcularInstantes();

  function rotuloDoInstante(ms: number, offsetMin: number): string {
    const d = new Date(ms + offsetMin * 60000);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mi = String(d.getUTCMinutes()).padStart(2, "0");
    return `${dd}/${mm} ${hh}:${mi}`;
  }

  function atualizar(id: number, parcial: Partial<Linha>) {
    setLinhas((atual) => atual.map((l) => (l.id === id ? { ...l, ...parcial } : l)));
    setErro(null);
  }

  function adicionarEventoAntesDoFim() {
    setLinhas((atual) => {
      const copia = [...atual];
      const fim =
        copia[copia.length - 1]?.tipo === "FIM_JORNADA" ? copia.pop() : null;
      const ultimo = copia[copia.length - 1]?.tipo ?? "INICIO_JORNADA";
      const sugerido =
        PROXIMOS[ultimo].find((t) => t !== "FIM_JORNADA") ?? "INICIO_DIRECAO";
      copia.push(novaLinha(sugerido));
      if (fim) copia.push(fim);
      return copia;
    });
  }

  function remover(id: number) {
    setLinhas((atual) => atual.filter((l) => l.id !== id));
  }

  function escolherEvidencia(arquivo: File | undefined) {
    if (!arquivo) return;
    const nome = arquivo.name.toLowerCase();
    const ok =
      /^image\/(jpeg|png|webp|heic|heif)$/.test(arquivo.type) ||
      /\.(jpe?g|png|webp|heic|heif)$/.test(nome);
    if (!ok) {
      setErro(
        "Só é possível anexar imagens (JPG, PNG, WEBP ou HEIC/HEIF do iPhone). PDF e outros arquivos não são aceitos: tire um print ou uma foto e anexe a imagem.",
      );
      return;
    }
    if (arquivo.size > 25 * 1024 * 1024) {
      setErro("Arquivo muito grande, o limite é 25MB por imagem.");
      return;
    }
    if (evidencias.length >= 4) {
      setErro("Limite de 4 evidências.");
      return;
    }
    setEvidencias((atual) => [...atual, arquivo]);
  }

  function validarLocal(): string | null {
    if (!data) return "Informe a data em que a jornada começou.";
    if (linhas.length < 2) return "A jornada precisa de pelo menos 2 eventos.";
    if (linhas[0].tipo !== "INICIO_JORNADA")
      return 'O primeiro evento precisa ser "Início de jornada".';
    if (linhas[linhas.length - 1].tipo !== "FIM_JORNADA")
      return 'O último evento precisa ser "Fim de jornada".';
    if (linhas.some((l) => !l.hora)) return "Preencha o horário de todos os eventos.";
    for (let i = 1; i < linhas.length; i++) {
      if (!PROXIMOS[linhas[i - 1].tipo].includes(linhas[i].tipo)) {
        return `Depois de "${ROTULOS[linhas[i - 1].tipo]}" não pode vir "${ROTULOS[linhas[i].tipo]}" (linha ${i + 1}). Permitido: ${PROXIMOS[linhas[i - 1].tipo].map((t) => ROTULOS[t]).join(", ")}.`;
      }
    }
    if (motivo.trim().length < 10) return "Escreva o motivo (mínimo 10 caracteres).";
    return null;
  }

  async function onLancar(e: FormEvent) {
    e.preventDefault();
    setSucesso(null);
    const problema = validarLocal();
    if (problema) {
      setErro(problema);
      return;
    }
    const calc = calcularInstantes();
    if (!calc) {
      setErro("Confira a data e os horários.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const criados = await createJornadaTratamento(motoristaId, {
        eventos: linhas.map((l, i) => ({
          tipoEvento: l.tipo,
          timestampEvento: new Date(calc.ms[i]).toISOString(),
        })),
        motivo: motivo.trim(),
        fusoOffsetMin: calc.doMotorista ? calc.offsetMin : undefined,
      });
      // Evidências sobem junto do primeiro evento da jornada.
      let falhas = 0;
      for (const arquivo of evidencias) {
        try {
          await anexarEvidenciaTratamento(motoristaId, criados[0].id, arquivo);
        } catch {
          falhas++;
        }
      }
      setSucesso(
        `Jornada lançada: ${criados.length} eventos registrados${falhas ? `, mas ${falhas} evidência(s) não subiram (anexe de novo em um lançamento da lista)` : ""}.`,
      );
      setLinhas(modeloInicial());
      setMotivo("");
      setEvidencias([]);
      await onLancado();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      setErro(
        (Array.isArray(msg) ? msg.join(" ") : msg) ||
          "Não foi possível lançar a jornada. Confira os dados.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid #bfdbfe",
        background: "#eff6ff",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <strong>Lançar jornada inteira</strong>
        <button
          type="button"
          className="secondary"
          style={{ fontSize: 12, padding: "2px 8px" }}
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? "Fechar" : "Abrir"}
        </button>
      </div>
      <p style={{ fontSize: 13, margin: "6px 0" }}>
        Use quando o motorista não registrou nenhum ponto de uma jornada (sem
        sinal, esquecimento, celular com defeito). Informe a data e os horários
        de cada evento, do início ao fim, de uma vez só. Cada evento é
        registrado como um tratamento de ponto normal, igual ao lançamento um a
        um, e não altera nenhum registro do motorista.
      </p>

      {aberto && (
        <form onSubmit={(e) => void onLancar(e)}>
          <label>Data em que a jornada começou</label>
          <input
            type="date"
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              setErro(null);
            }}
            required
          />

          <label>Eventos da jornada (em ordem)</label>
          <div style={{ display: "grid", gap: 6 }}>
            {linhas.map((l, i) => {
              const anterior = i > 0 ? linhas[i - 1].tipo : null;
              const opcoes = anterior
                ? PROXIMOS[anterior]
                : (["INICIO_JORNADA"] as TipoEvento[]);
              const travado = i === 0;
              return (
                <div
                  key={l.id}
                  style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
                >
                  <span style={{ width: 22, fontSize: 12 }}>{i + 1}.</span>
                  <select
                    value={l.tipo}
                    disabled={travado}
                    onChange={(e) => atualizar(l.id, { tipo: e.target.value as TipoEvento })}
                    style={{ minWidth: 230 }}
                  >
                    {(opcoes.includes(l.tipo) ? opcoes : [l.tipo, ...opcoes]).map((t) => (
                      <option key={t} value={t}>
                        {ROTULOS[t]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={l.hora}
                    onChange={(e) => atualizar(l.id, { hora: e.target.value })}
                    required
                  />
                  {calculado && (
                    <span style={{ fontSize: 11 }}>
                      {rotuloDoInstante(calculado.ms[i], calculado.offsetMin)}
                    </span>
                  )}
                  {i > 0 && i < linhas.length - 1 && (
                    <button
                      type="button"
                      className="secondary"
                      style={{ fontSize: 11, padding: "2px 6px" }}
                      onClick={() => remover(l.id)}
                    >
                      Remover
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: 12, marginTop: 6 }}
            onClick={adicionarEventoAntesDoFim}
          >
            + Adicionar evento (ex.: descanso, espera)
          </button>
          <p style={{ fontSize: 12, marginTop: 6 }}>
            Se a jornada passar da meia-noite, é só informar os horários em
            ordem: um horário menor que o anterior vale para o dia seguinte (a
            data e hora completas aparecem ao lado de cada evento para
            conferência).
            {calculado &&
              ` Horários no fuso ${
                calculado.doMotorista
                  ? "em que o motorista estava"
                  : "do seu computador (o motorista ainda não tem ponto com fuso registrado)"
              } (${rotuloUtc(calculado.offsetMin)}).`}
          </p>

          <label>Motivo (mínimo 10 caracteres)</label>
          <textarea
            maxLength={400}
            rows={3}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setErro(null);
            }}
            placeholder="Ex.: motorista ficou sem sinal na viagem; horários confirmados pelo rastreador."
            required
          />

          <label>Evidências (opcional, até 4 imagens)</label>
          {evidencias.length > 0 && (
            <ul style={{ fontSize: 12 }}>
              {evidencias.map((a, i) => (
                <li key={i}>
                  {a.name}{" "}
                  <button
                    type="button"
                    className="secondary"
                    style={{ fontSize: 11, padding: "2px 6px" }}
                    onClick={() =>
                      setEvidencias((atual) => atual.filter((_, j) => j !== i))
                    }
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          {evidencias.length < 4 && (
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
              onChange={(e) => {
                escolherEvidencia(e.target.files?.[0]);
                e.target.value = "";
              }}
              style={{ fontSize: 12 }}
            />
          )}
          <p style={{ fontSize: 12 }}>
            Somente imagens (JPG, PNG, WEBP ou HEIC/HEIF do iPhone), até 25MB
            cada. As imagens ficam anexadas ao primeiro evento da jornada.
          </p>

          {erro && <p className="error-text">{erro}</p>}
          {sucesso && (
            <p style={{ color: "#166534", fontWeight: 600, fontSize: 13 }}>{sucesso}</p>
          )}
          <button type="submit" disabled={enviando}>
            {enviando
              ? "Lançando..."
              : `Lançar jornada${data ? ` de ${dataBr(data)}` : ""}`}
          </button>
        </form>
      )}
    </div>
  );
}
