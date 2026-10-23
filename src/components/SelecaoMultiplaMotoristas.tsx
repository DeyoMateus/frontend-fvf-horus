import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Rodada 338: seleção de um ou vários motoristas (lista com caixas e busca).
 * Nenhum marcado = todos os motoristas.
 */
export function SelecaoMultiplaMotoristas({
  motoristas,
  selecionados,
  onChange,
}: {
  motoristas: { id: string; nome: string }[];
  selecionados: string[];
  onChange: (ids: string[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  const marcados = useMemo(() => new Set(selecionados), [selecionados]);
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo
      ? motoristas.filter((m) => m.nome.toLowerCase().includes(termo))
      : motoristas;
  }, [motoristas, busca]);

  const resumo =
    selecionados.length === 0
      ? "Todos os motoristas"
      : selecionados.length === 1
        ? (motoristas.find((m) => m.id === selecionados[0])?.nome ?? "1 motorista")
        : `${selecionados.length} motoristas`;

  function alternar(id: string) {
    const novo = new Set(marcados);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    onChange([...novo]);
  }

  return (
    <div ref={raiz} style={{ position: "relative", minWidth: 190 }}>
      <button
        type="button"
        className="secondary"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          fontWeight: 400,
        }}
      >
        <span>{resumo}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {aberto && (
        <div
          className="card"
          style={{
            position: "absolute",
            zIndex: 60,
            top: "calc(100% + 4px)",
            left: 0,
            width: 280,
            padding: 10,
            boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
          }}
        >
          <input
            type="search"
            placeholder="Buscar motorista"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <button
              type="button"
              className="secondary"
              style={{ padding: "2px 8px", fontSize: 12 }}
              onClick={() => onChange(visiveis.map((m) => m.id))}
            >
              Marcar {busca.trim() ? "os da busca" : "todos"}
            </button>
            <button
              type="button"
              className="secondary"
              style={{ padding: "2px 8px", fontSize: 12 }}
              onClick={() => onChange([])}
            >
              Limpar
            </button>
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {visiveis.length === 0 ? (
              <p style={{ fontSize: 12, margin: 4 }}>Nenhum motorista encontrado.</p>
            ) : (
              visiveis.map((m) => (
                <label
                  key={m.id}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 2px", fontSize: 13, cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={marcados.has(m.id)}
                    onChange={() => alternar(m.id)}
                  />
                  {m.nome}
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
