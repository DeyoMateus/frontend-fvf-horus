import { useCallback, useEffect, useState } from "react";
import {
  atualizarRegraFolga,
  criarRegraFolga,
  excluirRegraFolga,
  listarRegrasFolga,
  vincularRegraFolga,
} from "../api/regrasFolga";
import type { RegraFolga } from "../api/regrasFolga";
import type { FolgaDashboard } from "../api/folgaDashboard";
import { useConfirm } from "./ConfirmProvider";
import { useToast } from "./ToastProvider";

const LIMITE_REGRAS = 10;

function mensagemDoErro(err: unknown, padrao: string): string {
  const msg = (err as { response?: { data?: { message?: unknown } } })?.response
    ?.data?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  return typeof msg === "string" && msg ? msg : padrao;
}

interface Formulario {
  id: string | null;
  nome: string;
  diasTrabalho: string;
  toleranciaDias: string;
  limiteFolgasVencidas: string;
}

const FORM_VAZIO: Formulario = {
  id: null,
  nome: "",
  diasTrabalho: "",
  toleranciaDias: "0",
  limiteFolgasVencidas: "1",
};

/**
 * Rodada 278: regras de folga. Ficam salvas no grupo, podem ser abertas,
 * editadas e excluídas, e cada CNPJ tem no máximo uma regra vinculada por
 * vez (vincular outra troca a anterior; "Desvincular" deixa o CNPJ sem
 * regra). O motorista é tratado pela regra do CNPJ em que está cadastrado.
 */
export function RegrasDeFolga({
  empresas,
  aoAlterar,
}: {
  empresas: FolgaDashboard["empresas"];
  aoAlterar: () => void;
}) {
  const toast = useToast();
  const confirmar = useConfirm();
  const [regras, setRegras] = useState<RegraFolga[]>([]);
  const [form, setForm] = useState<Formulario | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setRegras(await listarRegrasFolga());
    } catch {
      toast.erro("Não foi possível carregar as regras de folga.");
    }
  }, [toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar() {
    if (!form) return;
    const dias = Number(form.diasTrabalho);
    const tol = Number(form.toleranciaDias);
    const lim = Number(form.limiteFolgasVencidas);
    if (form.nome.trim().length < 3) {
      toast.erro("Dê um nome à regra (mínimo 3 letras).");
      return;
    }
    if (!Number.isInteger(dias) || dias < 1 || dias > 60) {
      toast.erro("Dias de trabalho: informe um número inteiro entre 1 e 60.");
      return;
    }
    if (!Number.isInteger(tol) || tol < 0 || tol > 60) {
      toast.erro("Tolerância: informe um número inteiro entre 0 e 60.");
      return;
    }
    if (!Number.isInteger(lim) || lim < 1 || lim > 20) {
      toast.erro("Limite de folgas vencidas: informe um número entre 1 e 20.");
      return;
    }
    setSalvando(true);
    try {
      const dados = {
        nome: form.nome.trim(),
        diasTrabalho: dias,
        toleranciaDias: tol,
        limiteFolgasVencidas: lim,
      };
      if (form.id) await atualizarRegraFolga(form.id, dados);
      else await criarRegraFolga(dados);
      toast.sucesso("Regra de folga salva.");
      setForm(null);
      await carregar();
      aoAlterar();
    } catch (err) {
      toast.erro(mensagemDoErro(err, "Não foi possível salvar a regra de folga."));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(r: RegraFolga) {
    const ok = await confirmar(
      r.empresas.length > 0
        ? `A regra "${r.nome}" será excluída e os ${r.empresas.length} CNPJ(s) vinculados ficarão sem regra de folga. Continuar?`
        : `Excluir a regra "${r.nome}"?`,
      { titulo: "Excluir regra de folga", perigo: true },
    );
    if (!ok) return;
    try {
      await excluirRegraFolga(r.id);
      toast.sucesso("Regra excluída.");
      await carregar();
      aoAlterar();
    } catch {
      toast.erro("Não foi possível excluir a regra.");
    }
  }

  async function vincular(empresaId: string, regraId: string) {
    try {
      await vincularRegraFolga(empresaId, regraId || null);
      toast.sucesso(regraId ? "Regra vinculada ao CNPJ." : "Regra desvinculada.");
      await carregar();
      aoAlterar();
    } catch {
      toast.erro("Não foi possível alterar o vínculo.");
    }
  }

  const campo = (
    rotulo: string,
    chave: keyof Formulario,
    extra?: { type?: string; min?: number; max?: number; ajuda?: string },
  ) => (
    <label style={{ fontSize: 13, display: "block" }}>
      {rotulo}
      <input
        type={extra?.type ?? "text"}
        min={extra?.min}
        max={extra?.max}
        value={String(form?.[chave] ?? "")}
        onChange={(e) =>
          setForm((f) => (f ? { ...f, [chave]: e.target.value } : f))
        }
        style={{ display: "block", width: extra?.type === "number" ? 120 : "100%" }}
        maxLength={extra?.type === "number" ? undefined : 80}
      />
      {extra?.ajuda && (
        <span style={{ fontSize: 11, display: "block" }}>{extra.ajuda}</span>
      )}
    </label>
  );

  return (
    <div className="card" data-tour="folgas-regra">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <strong>Regras de folga</strong>
        <button
          type="button"
          style={{ padding: "4px 10px", fontSize: 12 }}
          disabled={regras.length >= LIMITE_REGRAS}
          title={
            regras.length >= LIMITE_REGRAS
              ? `Limite de ${LIMITE_REGRAS} regras atingido`
              : undefined
          }
          onClick={() => setForm({ ...FORM_VAZIO })}
        >
          Nova regra
        </button>
      </div>
      {regras.length >= LIMITE_REGRAS && (
        <p style={{ fontSize: 12, color: "#b45309", fontWeight: 600 }}>
          Limite de {LIMITE_REGRAS} regras de folga atingido. Exclua uma regra
          para criar outra.
        </p>
      )}
      <p style={{ fontSize: 12, marginTop: 4 }}>
        Cada CNPJ usa uma única regra por vez, e cada motorista é tratado pela
        regra do CNPJ em que está cadastrado. Com direito a folga a cada 6 dias,
        trabalhar 6 dias e não folgar no sétimo já é 1 folga vencida; com 13 dias
        são 2. O sistema procura folga nos últimos dias de direito + tolerância
        (ex.: 6 + 3 = 9); sem folga nessa janela, o alerta é crítico e urgente.
        Até o limite de folgas vencidas o alerta é de atenção, acima dele é
        crítico.
      </p>

      {form && (
        <div
          className="card"
          style={{ background: "#f9fafb", marginBottom: 12 }}
        >
          <strong>{form.id ? "Editar regra" : "Nova regra"}</strong>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginTop: 8,
            }}
          >
            {campo("Nome da regra", "nome")}
            {campo("Dias de trabalho para ter direito à folga", "diasTrabalho", {
              type: "number",
              min: 1,
              max: 60,
              ajuda: "ex.: 6",
            })}
            {campo("Tolerância (dias a mais)", "toleranciaDias", {
              type: "number",
              min: 0,
              max: 60,
              ajuda: "ex.: 3",
            })}
            {campo(
              "Folgas vencidas antes de ficar crítico",
              "limiteFolgasVencidas",
              {
                type: "number",
                min: 1,
                max: 20,
                ajuda: "até esse número o alerta é de atenção",
              },
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" disabled={salvando} onClick={() => void salvar()}>
              {salvando ? "Salvando..." : "Salvar regra"}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={salvando}
              onClick={() => setForm(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {regras.length === 0 ? (
        <p style={{ fontSize: 13, color: "#b45309", fontWeight: 600 }}>
          Nenhuma regra cadastrada. Sem regra vinculada, os motoristas do CNPJ
          não entram nos indicadores nem geram alertas de folga.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Regra</th>
              <th>Dias de trabalho</th>
              <th>Tolerância</th>
              <th>Limite de folgas vencidas</th>
              <th>CNPJs vinculados</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {regras.map((r) => (
              <tr key={r.id}>
                <td>{r.nome}</td>
                <td>{r.diasTrabalho}</td>
                <td>{r.toleranciaDias}</td>
                <td>{r.limiteFolgasVencidas}</td>
                <td style={{ fontSize: 12 }}>
                  {r.empresas.length === 0
                    ? "—"
                    : r.empresas
                        .map((e) => `${e.razaoSocial} (${e.cnpj})`)
                        .join(", ")}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      className="secondary"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() =>
                        setForm({
                          id: r.id,
                          nome: r.nome,
                          diasTrabalho: String(r.diasTrabalho),
                          toleranciaDias: String(r.toleranciaDias),
                          limiteFolgasVencidas: String(r.limiteFolgasVencidas),
                        })
                      }
                    >
                      Abrir / editar
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => void excluir(r)}
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <strong style={{ display: "block", marginTop: 16 }}>
        Regra de cada CNPJ
      </strong>
      <table>
        <thead>
          <tr>
            <th>Empresa</th>
            <th>CNPJ</th>
            <th>Regra vinculada</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {empresas.map((e) => {
            const regraAtual =
              regras.find((r) => r.empresas.some((x) => x.id === e.id)) ?? null;
            return (
            <tr key={e.id}>
              <td>{e.razaoSocial}</td>
              <td>{e.cnpj}</td>
              <td>
                <select
                  value={regraAtual?.id ?? ""}
                  onChange={(ev) => void vincular(e.id, ev.target.value)}
                  disabled={regras.length === 0}
                >
                  <option value="">Sem regra</option>
                  {regras.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome} ({r.diasTrabalho} dias)
                    </option>
                  ))}
                </select>
              </td>
              <td>
                {regraAtual && (
                  <button
                    type="button"
                    className="secondary"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={() => void vincular(e.id, "")}
                  >
                    Desvincular
                  </button>
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
