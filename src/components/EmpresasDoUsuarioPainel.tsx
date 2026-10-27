import { useEffect, useState } from "react";
import {
  definirEmpresasDoUsuario,
  obterEmpresasDoUsuario,
  type EmpresasDoUsuario,
} from "../api/usuariosEmpresa";

/**
 * Rodada 418 (N75): o ADMIN escolhe de quais empresas (CNPJ) um usuário recebe alertas
 * por WhatsApp. Nenhuma marcada = todas as empresas do grupo (comportamento anterior).
 * Por ora isso vale só para o WhatsApp; as listas do painel continuam por grupo.
 */
export function EmpresasDoUsuarioPainel({
  usuarioId,
  nome,
  onFechar,
}: {
  usuarioId: string;
  nome: string;
  onFechar: () => void;
}) {
  const [dados, setDados] = useState<EmpresasDoUsuario | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    let vivo = true;
    setDados(null);
    setErro(null);
    setSalvo(false);
    obterEmpresasDoUsuario(usuarioId)
      .then((d) => {
        if (!vivo) return;
        setDados(d);
        setMarcadas(new Set(d.empresaIds));
      })
      .catch(() => vivo && setErro("Não foi possível carregar as empresas."));
    return () => {
      vivo = false;
    };
  }, [usuarioId]);

  function alternar(id: string) {
    setSalvo(false);
    setMarcadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await definirEmpresasDoUsuario(usuarioId, [...marcadas]);
      setSalvo(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setErro(Array.isArray(msg) ? msg.join(" ") : (msg ?? "Não foi possível salvar."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h3 style={{ marginTop: 0 }}>Empresas de {nome}</h3>
      <p style={{ fontSize: 13 }}>
        Marque as empresas de que este usuário recebe alertas por WhatsApp. Sem nenhuma marcada,
        ele recebe de todas as empresas do grupo. Isto não muda o que ele enxerga no painel.
      </p>
      {!dados && !erro && <p>Carregando...</p>}
      {dados && (
        <div style={{ display: "grid", gap: 6 }}>
          {dados.empresas.map((e) => (
            <label key={e.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={marcadas.has(e.id)} onChange={() => alternar(e.id)} />
              {e.razaoSocial} ({e.cnpj})
            </label>
          ))}
          <p style={{ fontSize: 13, margin: "4px 0 0" }}>
            {marcadas.size === 0
              ? "Sem restrição: recebe de todas as empresas do grupo."
              : `Recebe só de ${marcadas.size} empresa(s).`}
          </p>
        </div>
      )}
      {erro && <p className="error-text">{erro}</p>}
      {salvo && <p style={{ fontSize: 13 }}>Salvo.</p>}
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button type="button" onClick={() => void salvar()} disabled={!dados || salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" className="secondary" onClick={onFechar}>
          Fechar
        </button>
      </div>
    </div>
  );
}
