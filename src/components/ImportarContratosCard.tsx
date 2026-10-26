import { useState } from "react";
import { AxiosError } from "axios";
import { importarContratos } from "../api/dadosContrato";
import type { LinhaContratoImportacao, ResultadoImportacaoContrato } from "../api/dadosContrato";
import { lerCsvContrato } from "../utils/csvContrato";

const TAMANHO_LOTE = 500;

/**
 * Rodada 389: importação em lote dos dados de contrato (admissão, cargo,
 * matrícula, matrícula eSocial, horário) a partir de um CSV. Só ADMIN.
 * Campo vazio no arquivo não apaga o dado já cadastrado.
 */
export function ImportarContratosCard({ onConcluido }: { onConcluido?: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [linhas, setLinhas] = useState<LinhaContratoImportacao[]>([]);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacaoContrato | null>(null);

  async function aoEscolher(arquivo: File | undefined) {
    setResultado(null);
    setErro(null);
    if (!arquivo) return;
    setNomeArquivo(arquivo.name);
    const r = lerCsvContrato(await arquivo.text());
    setLinhas(r.linhas);
    setProblemas(r.problemas);
  }

  async function enviar() {
    setErro(null);
    setEnviando(true);
    try {
      // Em lotes de 500; os números de linha do servidor são somados ao deslocamento do lote.
      const total: ResultadoImportacaoContrato = { total: 0, atualizados: 0, erros: [] };
      for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
        const r = await importarContratos(linhas.slice(i, i + TAMANHO_LOTE));
        total.total += r.total;
        total.atualizados += r.atualizados;
        total.erros.push(...r.erros.map((e) => ({ ...e, linha: e.linha + i })));
      }
      setResultado(total);
      setLinhas([]);
      onConcluido?.();
    } catch (e) {
      const m = e instanceof AxiosError ? e.response?.data?.message : null;
      setErro(Array.isArray(m) ? String(m[0]) : typeof m === "string" ? m : "Não foi possível importar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Importar dados de contrato (CSV)</h3>
      {!aberto ? (
        <button type="button" className="secondary" onClick={() => setAberto(true)}>
          Importar planilha
        </button>
      ) : (
        <>
          <p style={{ fontSize: 13 }}>
            Arquivo CSV (separador ponto e vírgula ou vírgula) com títulos na primeira linha:{" "}
            <strong>cpf</strong>, admissao, cargo, matricula, matricula_esocial, horario. O motorista é
            identificado pelo CPF; "horario" é o código de um horário contratual já cadastrado. Células
            vazias não apagam o que já está cadastrado.
          </p>
          <input type="file" accept=".csv,text/csv" onChange={(e) => void aoEscolher(e.target.files?.[0])} />
          {nomeArquivo && (
            <p style={{ fontSize: 13 }}>
              {nomeArquivo}: {linhas.length} linha(s) válida(s)
              {problemas.length > 0 ? `, ${problemas.length} com problema` : ""}.
            </p>
          )}
          {problemas.length > 0 && (
            <ul style={{ fontSize: 12, color: "#b91c1c" }}>
              {problemas.slice(0, 20).map((p) => (
                <li key={p}>{p}</li>
              ))}
              {problemas.length > 20 && <li>… e mais {problemas.length - 20}.</li>}
            </ul>
          )}
          {erro && <p className="error-text">{erro}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={enviando || linhas.length === 0} onClick={() => void enviar()}>
              {enviando ? "Importando…" : `Importar ${linhas.length} linha(s)`}
            </button>
            <button type="button" className="secondary" onClick={() => setAberto(false)}>
              Fechar
            </button>
          </div>
        </>
      )}
      {resultado && (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <p>
            {resultado.atualizados} de {resultado.total} atualizado(s).
            {resultado.erros.length > 0 ? ` ${resultado.erros.length} com erro:` : ""}
          </p>
          {resultado.erros.length > 0 && (
            <ul>
              {resultado.erros.slice(0, 50).map((e) => (
                <li key={`${e.linha}-${e.cpf}`}>
                  Linha {e.linha + 1} (CPF final {e.cpf.replace("***", "")}): {e.motivo}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
