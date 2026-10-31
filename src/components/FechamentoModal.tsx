import { useState } from "react";
import { aplicarMascaraCpf, somenteDigitos } from "../utils/mascaras";
import {
  baixarFechamentoPdf,
  baixarEventosFolhaCsv,
  type MotoristaFechamentoBloqueado,
} from "../api/holerite";
import type { Motorista } from "../api/types";

/**
 * "Janela de fechamento" (Rodada 36) , pedido explícito do usuário:
 * o gestor extrair o holerite individual OU em grupo (fechar a frota
 * inteira de uma vez) num lugar só. Selecionar nenhum motorista =
 * fechamento da frota inteira; selecionar um ou mais = só esses.
 */
interface FechamentoModalProps {
  motoristas: Motorista[];
  inicioInicial: string;
  fimInicial: string;
  onFechar: () => void;
}

export function FechamentoModal({
  motoristas,
  inicioInicial,
  fimInicial,
  onFechar,
}: FechamentoModalProps) {
  const [inicio, setInicio] = useState(inicioInicial);
  const [fim, setFim] = useState(fimInicial);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [direcaoEspera, setDirecaoEspera] = useState(true);
  const [normalExtra, setNormalExtra] = useState(true);
  const [adicionalNoturno, setAdicionalNoturno] = useState(true);
  const [pdfUnico, setPdfUnico] = useState(false);
  const [busca, setBusca] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [bloqueados, setBloqueados] = useState<MotoristaFechamentoBloqueado[]>(
    [],
  );

  const todosSelecionados = selecionados.size === 0;
  // Busca por nome (sem acento/maiuscula) ou CPF (so digitos). A selecao dos que ficam
  // fora do filtro e mantida.
  const semAcento = (t: string) =>
    t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const termo = semAcento(busca.trim());
  const termoDigitos = somenteDigitos(busca);
  const motoristasFiltrados = termo
    ? motoristas.filter(
        (m) =>
          semAcento(m.nome).includes(termo) ||
          (termoDigitos !== "" && somenteDigitos(m.cpf ?? "").includes(termoDigitos)),
      )
    : motoristas;
  // Rodada 82: o rótulo do botão avisa quando o download vai sair como
  // .zip (mais de um motorista) , o backend só combina num PDF só
  // quando dá exatamente 1 motorista (ver `FechamentoHoleriteController`).
  const quantidadeEfetiva = todosSelecionados
    ? motoristas.length
    : selecionados.size;

  function alternarMotorista(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function onBaixarEventosCsv() {
    setErro(null);
    setBloqueados([]);
    setGerando(true);
    try {
      const naoFechados = await baixarEventosFolhaCsv(
        new Date(inicio).toISOString(),
        new Date(fim).toISOString(),
        todosSelecionados ? null : Array.from(selecionados),
        { direcaoEspera, normalExtra, adicionalNoturno },
      );
      setBloqueados(naoFechados);
    } catch (e) {
      let mensagem =
        "Não foi possível gerar o arquivo agora (confira o período e tente de novo).";
      try {
        const resp = (e as { response?: { status?: number; data?: Blob } }).response;
        if (resp?.status === 409 && resp.data) {
          const corpo = JSON.parse(await resp.data.text()) as { message?: string };
          if (corpo.message) mensagem = corpo.message;
        }
      } catch {
        /* mantém a mensagem padrão */
      }
      setErro(mensagem);
    } finally {
      setGerando(false);
    }
  }

  async function onBaixar() {
    setErro(null);
    setBloqueados([]);
    setGerando(true);
    try {
      const naoFechados = await baixarFechamentoPdf(
        new Date(inicio).toISOString(),
        new Date(fim).toISOString(),
        todosSelecionados ? null : Array.from(selecionados),
        { direcaoEspera, normalExtra, adicionalNoturno },
        pdfUnico,
      );
      setBloqueados(naoFechados);
    } catch (e) {
      // Rodada 453: 409 = ninguém pôde ser fechado (resposta vem como blob).
      let mensagem =
        "Não foi possível gerar o fechamento agora (confira o período e tente de novo).";
      try {
        const resp = (e as { response?: { status?: number; data?: Blob } })
          .response;
        if (resp?.status === 409 && resp.data) {
          const corpo = JSON.parse(await resp.data.text()) as {
            message?: string;
          };
          if (corpo.message) mensagem = corpo.message;
        }
      } catch {
        /* mantém a mensagem padrão */
      }
      setErro(mensagem);
    } finally {
      setGerando(false);
    }
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
          width: 560,
          maxWidth: "92vw",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Fechamento de jornada</h3>
          <button className="secondary" onClick={onFechar} title="Fechar">
            ×
          </button>
        </div>
        <p style={{ color: "#000000", marginTop: -8, fontSize: 13 }}>
          Individual (marque um motorista) ou da frota inteira (nenhum marcado =
          todos). Só horas, sem nenhum valor em R$: o RH decide o pagamento fora
          da plataforma com base nas horas completas e separadas.
        </p>

        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <label>
            Início
            <br />
            <input
              type="date"
              value={inicio}
              max={fim}
              onChange={(e) => setInicio(e.target.value)}
            />
          </label>
          <label>
            Fim
            <br />
            <input
              type="date"
              value={fim}
              min={inicio}
              onChange={(e) => setFim(e.target.value)}
            />
          </label>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <label>
            <input
              type="checkbox"
              checked={direcaoEspera}
              onChange={(e) => setDirecaoEspera(e.target.checked)}
            />{" "}
            Direção/espera
          </label>
          <label>
            <input
              type="checkbox"
              checked={normalExtra}
              onChange={(e) => setNormalExtra(e.target.checked)}
            />{" "}
            Normal/extra
          </label>
          <label>
            <input
              type="checkbox"
              checked={adicionalNoturno}
              onChange={(e) => setAdicionalNoturno(e.target.checked)}
            />{" "}
            Hora noturna
          </label>
          <label title="Gera um único PDF da frota (resumo + seção de cada motorista) em vez de um .zip">
            <input
              type="checkbox"
              checked={pdfUnico}
              onChange={(e) => setPdfUnico(e.target.checked)}
            />{" "}
            PDF único da frota
          </label>
        </div>

        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>
          Motoristas (
          {todosSelecionados
            ? `frota inteira, ${motoristas.length}`
            : selecionados.size}{" "}
          selecionado(s))
        </div>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar motorista por nome ou CPF"
          aria-label="Buscar motorista por nome ou CPF"
          style={{ width: "100%", boxSizing: "border-box", marginBottom: 8 }}
        />
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            maxHeight: 220,
            overflowY: "auto",
            padding: 8,
            marginBottom: 12,
          }}
        >
          {motoristas.length === 0 && (
            <p style={{ color: "#000000", fontSize: 13 }}>
              Nenhum motorista ativo encontrado.
            </p>
          )}
          {motoristas.length > 0 && motoristasFiltrados.length === 0 && (
            <p style={{ color: "#000000", fontSize: 13 }}>
              Nenhum motorista encontrado para essa busca.
            </p>
          )}
          {motoristasFiltrados.map((m) => (
            <label
              key={m.id}
              style={{ display: "block", padding: "2px 0", fontSize: 13 }}
            >
              <input
                type="checkbox"
                checked={selecionados.has(m.id)}
                onChange={() => alternarMotorista(m.id)}
              />{" "}
              {m.nome}
              {m.cpf ? (
                <span style={{ color: "#6b7280" }}> · {aplicarMascaraCpf(m.cpf)}</span>
              ) : null}
            </label>
          ))}
        </div>

        {erro && <p style={{ color: "#b91c1c", fontSize: 13 }}>{erro}</p>}
        {bloqueados.length > 0 && (
          <div
            style={{
              border: "1px solid #f59e0b",
              borderRadius: 6,
              padding: 8,
              marginBottom: 12,
              fontSize: 13,
            }}
          >
            <strong>
              {bloqueados.length} motorista(s) NÃO fechado(s) por divergência de
              relógio sem tratamento:
            </strong>
            <ul style={{ margin: "4px 0 0 16px" }}>
              {bloqueados.map((b) => (
                <li key={b.motoristaId}>
                  {b.nome}: {b.pendentes} ponto(s)
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 4 }}>
              Trate os alertas na ficha do motorista e gere o fechamento deles
              de novo. Os demais foram fechados normalmente.
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button
            className="secondary"
            onClick={onBaixarEventosCsv}
            disabled={gerando}
            title="Horas por evento (direção, espera, normais, extras, adicional noturno, interjornada) para importar na folha de pagamento da empresa. Só horas, sem valores em reais."
          >
            Baixar eventos para a folha (CSV)
          </button>
          <button onClick={onBaixar} disabled={gerando}>
            {gerando
              ? "Gerando…"
              : quantidadeEfetiva === 1
                ? "Baixar fechamento selecionado (PDF)"
                : `Baixar fechamento ${todosSelecionados ? "da frota" : "selecionado"} (.zip, 1 PDF por motorista)`}
          </button>
        </div>
      </div>
    </div>
  );
}
