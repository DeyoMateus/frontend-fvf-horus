import { useState } from "react";
import { baixarFechamentoPdf } from "../api/holerite";
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
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const todosSelecionados = selecionados.size === 0;
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

  async function onBaixar() {
    setErro(null);
    setGerando(true);
    try {
      await baixarFechamentoPdf(
        new Date(inicio).toISOString(),
        new Date(fim).toISOString(),
        todosSelecionados ? null : Array.from(selecionados),
        { direcaoEspera, normalExtra, adicionalNoturno },
      );
    } catch {
      setErro(
        "Não foi possível gerar o fechamento agora (confira o período e tente de novo).",
      );
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
        </div>

        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>
          Motoristas (
          {todosSelecionados
            ? `frota inteira, ${motoristas.length}`
            : selecionados.size}{" "}
          selecionado(s))
        </div>
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
          {motoristas.map((m) => (
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
            </label>
          ))}
        </div>

        {erro && <p style={{ color: "#b91c1c", fontSize: 13 }}>{erro}</p>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="secondary" onClick={onFechar}>
            Cancelar
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
