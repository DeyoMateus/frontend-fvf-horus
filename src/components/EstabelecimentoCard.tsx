import { FormEvent, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { atualizarEstabelecimento } from "../api/dadosContrato";
import type { Empresa } from "../api/types";

/**
 * Rodada 382 (passo 27, interface): CAEPF/CNO e endereço do estabelecimento.
 * Saem no cabeçalho do AFD e do AEJ (CAEPF com 14 dígitos, CNO com 12) e no espelho.
 */
export function EstabelecimentoCard({
  empresas,
  onSalvo,
}: {
  empresas: Empresa[];
  onSalvo: () => void;
}) {
  const [id, setId] = useState(empresas[0]?.id ?? "");
  const atual = empresas.find((e) => e.id === id);
  const [caepfCno, setCaepfCno] = useState("");
  const [endereco, setEndereco] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setCaepfCno(atual?.caepfCno ?? "");
    setEndereco(atual?.enderecoEstabelecimento ?? "");
    setMsg(null);
    setErro(null);
  }, [id, atual?.caepfCno, atual?.enderecoEstabelecimento]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErro(null);
    const digitos = caepfCno.replace(/\D/g, "");
    if (digitos && digitos.length !== 12 && digitos.length !== 14) {
      setErro("O CNO tem 12 dígitos e o CAEPF tem 14. Confira o número.");
      return;
    }
    setSalvando(true);
    try {
      await atualizarEstabelecimento(id, {
        caepfCno: digitos || null,
        enderecoEstabelecimento: endereco.trim() || null,
      });
      setMsg("Dados do estabelecimento salvos.");
      onSalvo();
    } catch (ex) {
      const m = ex instanceof AxiosError ? ex.response?.data?.message : null;
      setErro(typeof m === "string" ? m : Array.isArray(m) ? String(m[0]) : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Dados do estabelecimento</h3>
      <p style={{ fontSize: 13 }}>
        Aparecem no AFD, no AEJ e no espelho de ponto. Deixe em branco se o
        estabelecimento não tem CAEPF nem CNO.
      </p>
      <form onSubmit={salvar} style={{ display: "grid", gap: 6, maxWidth: 480 }}>
        <label>Empresa</label>
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.razaoSocial}</option>
          ))}
        </select>
        <label>CAEPF (14 dígitos) ou CNO (12 dígitos)</label>
        <input inputMode="numeric" maxLength={20} value={caepfCno} onChange={(e) => setCaepfCno(e.target.value)} />
        <label>Endereço do estabelecimento</label>
        <input maxLength={300} value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        {erro && <p className="error-text">{erro}</p>}
        {msg && <p style={{ color: "#166534", fontSize: 13 }}>{msg}</p>}
        <div><button type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button></div>
      </form>
    </div>
  );
}
