import { FormEvent, useEffect, useState } from "react";
import { listEmpresas } from "../api/empresas";
import {
  createFeriado,
  desativarFeriado,
  listFeriados,
  updateFeriado,
} from "../api/feriados";
import type { FeriadoInput } from "../api/feriados";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../components/ConfirmProvider";
import type { Empresa, Feriado } from "../api/types";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { ControlesListaPaginada } from "../components/ControlesListaPaginada";

const FERIADO_PADRAO: FeriadoInput = {
  data: "",
  descricao: "",
  empresaId: undefined,
  pagoComoDomingo: true,
};

/**
 * Cadastro de feriados aceitos pela empresa (Rodada 29). Diferente do
 * domingo (sempre calculável por dia da semana), um feriado varia de
 * cidade para cidade , o sistema não tem nenhuma base nacional/
 * municipal embutida, então é o RH quem decide o calendário e se cada
 * feriado paga com o percentual equivalente ao domingo (definido na
 * convenção coletiva) ou só fica registrado como informativo.
 *
 * Sem `empresaId`, o feriado vale para todos os CNPJs do grupo ,
 * preencha só quando o feriado for específico de um CNPJ/cidade.
 */
export function FeriadosPage() {
  const confirm = useConfirm();
  const { usuario } = useAuth();
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState<FeriadoInput>(FERIADO_PADRAO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const [fs, emps] = await Promise.all([listFeriados(), listEmpresas()]);
      setFeriados(fs);
      setEmpresas(emps);
      setErro(null);
    } catch {
      setErro("Não foi possível carregar os feriados.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.grupoId]);

  function onEditar(f: Feriado) {
    setEditandoId(f.id);
    setForm({
      data: f.data.slice(0, 10),
      descricao: f.descricao,
      empresaId: f.empresaId ?? undefined,
      pagoComoDomingo: f.pagoComoDomingo,
    });
  }

  function onCancelarEdicao() {
    setEditandoId(null);
    setForm(FERIADO_PADRAO);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErroForm(null);
    setSalvando(true);
    try {
      if (editandoId) {
        await updateFeriado(editandoId, form);
      } else {
        await createFeriado(form);
      }
      onCancelarEdicao();
      await carregar();
    } catch {
      setErroForm("Não foi possível salvar (confira a data e a descrição).");
    } finally {
      setSalvando(false);
    }
  }

  async function onDesativar(id: string) {
    if (
      !(await confirm(
        "Desativar este feriado? Relatórios (REP-P) já gerados não mudam, mas ele deixa de ser considerado nas próximas apurações.",
        { perigo: true, textoConfirmar: "Desativar" },
      ))
    ) {
      return;
    }
    await desativarFeriado(id);
    await carregar();
  }

  // Rodada 108 , pedido do usuário: ordenar, filtrar por período e
  // paginar com popup dedicado em toda tabela de listagem do painel.
  // Aqui a data relevante é a DATA DO FERIADO em si (`f.data`), não
  // quando o cadastro foi criado.
  const paginacao = useListaPaginada(feriados, (f) => f.data);

  return (
    <div>
      <h2>Feriados</h2>
      <p style={{ fontSize: 13, color: "#000000", marginTop: -8 }}>
        Um feriado varia de cidade para cidade, e o sistema não tem uma base
        nacional/municipal embutida. Cadastre aqui os feriados que a empresa
        aceita, e diga se cada um deve receber o mesmo percentual diferenciado
        que a convenção coletiva aplica a domingos ("Pago como
        domingo/feriado"), ou se é só informativo. Domingo continua sendo
        detectado sozinho, sem precisar de cadastro.
      </p>

      {usuario?.papel === "ADMIN" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            {editandoId ? "Editar feriado" : "Novo feriado"}
          </h3>
          <form onSubmit={onSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: 12,
              }}
            >
              <div>
                <label>Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, data: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label>Descrição</label>
                <input
                  value={form.descricao}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, descricao: e.target.value }))
                  }
                  placeholder="ex.: Aniversário do município, Corpus Christi"
                  required
                />
              </div>
            </div>

            <label>
              CNPJ (opcional, em branco vale para todos os CNPJs do grupo)
            </label>
            <select
              value={form.empresaId ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  empresaId: e.target.value || undefined,
                }))
              }
            >
              <option value="">Vale para todo o grupo</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.razaoSocial} ({emp.cnpj})
                </option>
              ))}
            </select>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
              }}
            >
              <input
                type="checkbox"
                checked={form.pagoComoDomingo ?? true}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pagoComoDomingo: e.target.checked }))
                }
              />
              Pago com o percentual equivalente a domingo/feriado (definido na
              convenção coletiva)
            </label>

            {erroForm && <p className="error-text">{erroForm}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="submit" disabled={salvando}>
                {salvando
                  ? "Salvando..."
                  : editandoId
                    ? "Salvar alterações"
                    : "Cadastrar feriado"}
              </button>
              {editandoId && (
                <button
                  type="button"
                  className="secondary"
                  onClick={onCancelarEdicao}
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {carregando && <p>Carregando...</p>}
        {erro && <p className="error-text">{erro}</p>}
        {!carregando && !erro && (
          <>
            <ControlesListaPaginada
              ordem={paginacao.ordem}
              onAlternarOrdem={paginacao.alternarOrdem}
              qtdPorPagina={paginacao.qtdPorPagina}
              onMudarQtdPorPagina={paginacao.mudarQtdPorPagina}
              pagina={paginacao.pagina}
              totalPaginas={paginacao.totalPaginas}
              popupAberto={paginacao.popupAberto}
              onAbrirPopup={paginacao.abrirPopup}
              onFecharPopup={paginacao.fecharPopup}
              onSelecionarPagina={paginacao.irParaPagina}
              filtroData={{
                dataInicio: paginacao.dataInicio,
                onDataInicio: paginacao.setDataInicio,
                dataFim: paginacao.dataFim,
                onDataFim: paginacao.setDataFim,
                rotulo: "data do feriado",
              }}
            />
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>CNPJ</th>
                  <th>Pago como domingo/feriado</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginacao.itensExibidos.map((f) => (
                  <tr key={f.id}>
                    <td>
                      {new Date(
                        `${f.data.slice(0, 10)}T00:00:00`,
                      ).toLocaleDateString("pt-BR")}
                    </td>
                    <td>{f.descricao}</td>
                    <td>
                      {f.empresa
                        ? `${f.empresa.razaoSocial} (${f.empresa.cnpj})`
                        : "Todo o grupo"}
                    </td>
                    <td>{f.pagoComoDomingo ? "Sim" : "Não (informativo)"}</td>
                    <td>{f.ativo ? "Ativo" : "Desativado"}</td>
                    <td>
                      {usuario?.papel === "ADMIN" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => onEditar(f)}>
                            Editar
                          </button>
                          {f.ativo && (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => onDesativar(f.id)}
                            >
                              Desativar
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {paginacao.itensExibidos.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ color: "#000000" }}>
                      Nenhum feriado cadastrado. Só domingos recebem o
                      percentual diferenciado (quando configurado na convenção
                      coletiva).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
