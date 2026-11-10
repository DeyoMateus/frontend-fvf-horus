import { useCallback, useEffect, useState } from "react";
import { AxiosError } from "axios";
import {
  atualizarChaveApuracao,
  listarConfiguracaoApuracao,
  type ChaveApuracaoEstado,
  type ConfiguracaoApuracaoEmpresa,
} from "../api/configuracaoApuracao";
import { RegimeBancoHorasForm } from "./RegimeBancoHorasForm";

const ROTULO_REGIME: Record<string, string> = {
  NENHUM: "Nenhum (sem banco de horas)",
  ACORDO_INDIVIDUAL_6M: "Acordo individual (até 6 meses)",
  CONVENCAO_COLETIVA_12M: "Convenção/acordo coletivo (até 12 meses)",
  COMPENSACAO_NO_MES: "Compensação no mesmo mês",
};

function mensagemDeErro(ex: unknown, padrao: string) {
  const m = ex instanceof AxiosError ? ex.response?.data?.message : null;
  return Array.isArray(m) ? String(m[0]) : typeof m === "string" ? m : padrao;
}

/**
 * Rodada 692: apuração, alertas e regime do banco de horas são decisão da própria empresa,
 * junto com as regras sindicais (antes ficavam com o super admin). Só ADMIN altera; GESTOR consulta.
 */
export function ConfiguracaoApuracaoAba({ podeAlterar }: { podeAlterar: boolean }) {
  const [empresas, setEmpresas] = useState<ConfiguracaoApuracaoEmpresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [bancoEmpresaId, setBancoEmpresaId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setEmpresas(await listarConfiguracaoApuracao());
      setErro(null);
    } catch (ex) {
      setErro(mensagemDeErro(ex, "Não foi possível carregar as configurações."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function alternar(emp: ConfiguracaoApuracaoEmpresa, c: ChaveApuracaoEstado) {
    setErro(null);
    setAviso(null);
    const motivo = (motivos[emp.id] ?? "").trim();
    if (motivo.length < 10) {
      setErro("Escreva o motivo (mínimo de 10 caracteres) antes de mudar uma chave.");
      return;
    }
    // Ligar o que altera o valor pago pede uma segunda confirmação.
    const chaveConfirmacao = `${emp.id}:${c.chave}`;
    if (!c.ligada && c.atencao && confirmando !== chaveConfirmacao) {
      setConfirmando(chaveConfirmacao);
      return;
    }
    setConfirmando(null);
    setOcupada(chaveConfirmacao);
    try {
      await atualizarChaveApuracao(emp.id, { chave: c.chave, ligada: !c.ligada, motivo });
      setAviso(`"${c.rotulo}" ${c.ligada ? "desligada" : "ligada"} em ${emp.razaoSocial}.`);
      await carregar();
    } catch (ex) {
      setErro(mensagemDeErro(ex, "Não foi possível alterar."));
    } finally {
      setOcupada(null);
    }
  }

  if (carregando) return <p>Carregando…</p>;

  return (
    <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Apuração, alertas e banco de horas</h3>
        <p style={{ marginBottom: 0 }}>
          Aqui a própria empresa decide como a apuração é calculada, quais alertas ficam ligados e qual
          é o regime do banco de horas, junto com as regras sindicais. Cada mudança pede um motivo e fica
          registrada na auditoria. {podeAlterar ? "" : "Você pode consultar, mas só o administrador altera."}
        </p>
      </div>

      {erro && <p className="error-text">{erro}</p>}
      {aviso && <p role="status">{aviso}</p>}

      {empresas.map((emp) => (
        <div className="card" key={emp.id} style={{ display: "grid", gap: 10 }}>
          <h4 style={{ margin: 0 }}>
            {emp.razaoSocial} <small>({emp.cnpj})</small>
          </h4>

          {podeAlterar && (
            <>
              <label>Motivo da mudança (mín. 10 caracteres, vai para a auditoria)</label>
              <input
                maxLength={400}
                value={motivos[emp.id] ?? ""}
                onChange={(e) => setMotivos((m) => ({ ...m, [emp.id]: e.target.value }))}
              />
            </>
          )}

          <table>
            <thead>
              <tr>
                <th>Funcionalidade</th>
                <th>Situação</th>
                {podeAlterar && <th></th>}
              </tr>
            </thead>
            <tbody>
              {emp.chaves.map((c) => {
                const chaveId = `${emp.id}:${c.chave}`;
                return (
                  <tr key={c.chave}>
                    <td>
                      <strong>{c.rotulo}</strong>
                      <div style={{ fontSize: 12 }}>{c.descricao}</div>
                      {c.atencao && (
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#b45309" }}>{c.atencao}</div>
                      )}
                    </td>
                    <td>{c.ligada ? "Ligada" : "Desligada"}</td>
                    {podeAlterar && (
                      <td>
                        <button
                          type="button"
                          className="secondary"
                          disabled={ocupada !== null}
                          onClick={() => void alternar(emp, c)}
                        >
                          {c.ligada ? "Desligar" : confirmando === chaveId ? "Confirmar: ligar" : "Ligar"}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div>
            <strong>Banco de horas:</strong> {ROTULO_REGIME[emp.bancoHoras.regime] ?? emp.bancoHoras.regime}
            {emp.bancoHoras.regime !== "NENHUM" && (
              <>
                {" "}
                · fator {emp.bancoHoras.fator}
                {emp.bancoHoras.tetoMin ? ` · teto ${emp.bancoHoras.tetoMin / 60} h` : ""} · ativo
              </>
            )}
            {podeAlterar && (
              <button
                type="button"
                className="secondary"
                style={{ marginLeft: 12 }}
                onClick={() => setBancoEmpresaId(bancoEmpresaId === emp.id ? null : emp.id)}
              >
                {bancoEmpresaId === emp.id ? "Fechar" : "Editar banco de horas"}
              </button>
            )}
          </div>

          {podeAlterar && bancoEmpresaId === emp.id && (
            <RegimeBancoHorasForm
              key={emp.id}
              empresaId={emp.id}
              nome={emp.razaoSocial}
              inicial={emp.bancoHoras}
              onFechar={() => setBancoEmpresaId(null)}
              onSalvo={() => {
                setBancoEmpresaId(null);
                setAviso(`Banco de horas de ${emp.razaoSocial} atualizado.`);
                void carregar();
              }}
            />
          )}
        </div>
      ))}
      {empresas.length === 0 && <p>Nenhuma empresa cadastrada.</p>}
    </div>
  );
}
