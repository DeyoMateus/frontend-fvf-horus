import { Fragment, FormEvent, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { TelefoneInput } from "../components/TelefoneInput";
import { useConfirm } from "../components/ConfirmProvider";
import { usePrompt } from "../components/PromptProvider";
import {
  atualizarStatusAjudante,
  baixarEspelhoAjudantePdf,
  createAjudante,
  excluirAjudante,
  getAlertasJornadaAbertaAjudantes,
  type AlertaJornadaAbertaAjudante,
  listAjudantes,
  revogarDispositivoAjudante,
  vincularDispositivoAjudante,
} from "../api/ajudantes";
import { listEmpresas } from "../api/empresas";
import { useAuth } from "../context/AuthContext";
import { aplicarMascaraCpf, dataLocalIso, somenteDigitos } from "../utils/mascaras";
import type { Ajudante, Empresa, StatusMotorista } from "../api/types";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { ControlesListaPaginada } from "../components/ControlesListaPaginada";

/**
 * Cadastro e gestão de Ajudantes (Rodada 66) , cadastro SEPARADO do
 * Motorista (sem CNH, sem veículo , decisão confirmada com o usuário).
 * Mesma integridade legal por trás (cadeia de hash + assinatura
 * digital + device binding + soft-delete), só um conjunto de eventos
 * bem mais restrito no app: início de jornada, início de descanso, fim
 * de descanso e fim de jornada.
 */
export function AjudantesPage() {
  const [alertasAbertos, setAlertasAbertos] = useState<AlertaJornadaAbertaAjudante[]>([]);
  useEffect(() => {
    getAlertasJornadaAbertaAjudantes().then(setAlertasAbertos).catch(() => setAlertasAbertos([]));
  }, []);
  const confirm = useConfirm();
  const prompt = usePrompt();
  const { usuario } = useAuth();
  const [ajudantes, setAjudantes] = useState<Ajudante[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [criando, setCriando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Rodada 491: periodo do espelho de ponto (PDF) do ajudante.
  const [espInicio, setEspInicio] = useState(() => {
    const d = new Date();
    return dataLocalIso(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [espFim, setEspFim] = useState(() => dataLocalIso(new Date()));
  const [espelhoBaixando, setEspelhoBaixando] = useState<string | null>(null);
  async function onEspelho(a: Ajudante) {
    setEspelhoBaixando(a.id);
    try {
      await baixarEspelhoAjudantePdf(
        a.id,
        a.nome,
        new Date(`${espInicio}T00:00:00`).toISOString(),
        new Date(`${espFim}T23:59:59.999`).toISOString(),
      );
    } catch {
      setErro("Não foi possível gerar o espelho de ponto agora (confira o período e tente de novo).");
    } finally {
      setEspelhoBaixando(null);
    }
  }
  const [busca, setBusca] = useState("");
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false);
  const [novaChavePorAjudante, setNovaChavePorAjudante] = useState<
    Record<string, string>
  >({});

  async function carregar() {
    if (!usuario) return;
    setCarregando(true);
    try {
      const [pagina, empresasCarregadas] = await Promise.all([
        listAjudantes(1, 200, busca, mostrarExcluidos),
        listEmpresas(),
      ]);
      setAjudantes(pagina.dados);
      setEmpresas(empresasCarregadas);
      setEmpresaId(
        (atual) =>
          atual ||
          (empresasCarregadas.length === 1 ? empresasCarregadas[0].id : ""),
      );
      setErro(null);
    } catch {
      setErro("Não foi possível carregar os ajudantes.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.grupoId]);

  useEffect(() => {
    const id = setTimeout(() => carregar(), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, mostrarExcluidos]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!empresaId) {
      setErroForm("Selecione a empresa (CNPJ) a que este ajudante pertence.");
      return;
    }
    setErroForm(null);
    setCriando(true);
    try {
      await createAjudante({
        nome,
        cpf,
        empresaId,
        telefone: telefone.trim() || undefined,
      });
      setNome("");
      setCpf("");
      setTelefone("");
      await carregar();
    } catch (erro) {
      if (
        erro instanceof AxiosError &&
        erro.response?.status &&
        erro.response.status < 500
      ) {
        setErroForm(
          "Não foi possível cadastrar (CPF inválido, ou CPF já cadastrado).",
        );
      } else {
        setErroForm(
          "Erro no servidor ao cadastrar. Tente novamente em instantes.",
        );
      }
    } finally {
      setCriando(false);
    }
  }

  async function onAlterarStatus(a: Ajudante, status: StatusMotorista) {
    await atualizarStatusAjudante(a.id, status);
    await carregar();
  }

  async function onVincularDispositivo(a: Ajudante) {
    const deviceUuid = await prompt(
      "UUID do aparelho (gerado pelo próprio app do ajudante na primeira instalação):",
      { titulo: `Vincular dispositivo de ${a.nome}` },
    );
    if (!deviceUuid) return;
    const resultado = await vincularDispositivoAjudante(
      a.id,
      deviceUuid.trim(),
    );
    setNovaChavePorAjudante((prev) => ({
      ...prev,
      [a.id]: resultado.deviceApiKey,
    }));
    await carregar();
  }

  async function onRevogarDispositivo(a: Ajudante) {
    if (
      !(await confirm(
        `Revogar o vínculo de dispositivo de ${a.nome}? O aparelho para de bater ponto imediatamente.`,
        { perigo: true, textoConfirmar: "Revogar" },
      ))
    )
      return;
    await revogarDispositivoAjudante(a.id);
    await carregar();
  }

  async function onExcluirCadastro(a: Ajudante) {
    const confirmacao = await prompt(
      `Para excluir o cadastro de ${a.nome}, digite EXCLUIR (o histórico de registros de jornada dele continua intacto e pesquisável):`,
      { titulo: "Excluir cadastro", perigo: true, textoConfirmar: "Excluir" },
    );
    if (confirmacao !== "EXCLUIR") return;
    const motivo =
      (await prompt("Motivo (opcional):", {
        titulo: "Excluir cadastro",
        placeholder: "Motivo (opcional)",
        multilinha: true,
      })) ?? undefined;
    await excluirAjudante(a.id, motivo || undefined);
    await carregar();
  }

  // Rodada 108 , pedido do usuário: ordenar, filtrar por período e
  // paginar com popup dedicado em toda tabela de listagem do painel.
  const paginacao = useListaPaginada(ajudantes, (a) => a.createdAt);

  return (
    <div>
      <h2>Ajudantes</h2>
      <p style={{ fontSize: 13, color: "#000000", marginTop: -8 }}>
        Cadastro separado do motorista (sem CNH, sem veículo), usando o mesmo
        app, mas com apenas 4 eventos disponíveis: início de jornada, início de
        descanso, fim de descanso e fim de jornada.
      </p>

      {alertasAbertos.length > 0 && (
        <div className="card" style={{ borderLeft: "4px solid #b45309" }}>
          <h3 style={{ marginTop: 0 }}>Jornada aberta há muito tempo</h3>
          <p style={{ fontSize: 13, marginTop: -8 }}>
            Ajudantes que iniciaram a jornada e não registraram o fim dentro do limite da regra
            da empresa (provável esquecimento).
          </p>
          <ul>
            {alertasAbertos.map((a) => (
              <li key={a.ajudanteId}>
                {a.nome} ({a.empresa}): aberta há {Math.floor(a.minutosAbertos / 60)} h{" "}
                {String(a.minutosAbertos % 60).padStart(2, "0")} min, desde{" "}
                {new Date(a.inicio).toLocaleString("pt-BR")} (limite {Math.floor(a.limiteMin / 60)} h)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Cadastrar ajudante</h3>
        <form onSubmit={onSubmit}>
          <label>Nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={60}
            required
          />
          <label>CPF (11 dígitos)</label>
          <input
            value={aplicarMascaraCpf(cpf)}
            onChange={(e) => setCpf(somenteDigitos(e.target.value))}
            pattern="\d{3}\.\d{3}\.\d{3}-\d{2}"
            maxLength={14}
            inputMode="numeric"
            required
          />
          <label>Telefone de contato (opcional)</label>
          <TelefoneInput value={telefone} onChange={setTelefone} />
          {empresas.length > 1 && (
            <>
              <label>Empresa (CNPJ)</label>
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.razaoSocial} ({emp.cnpj})
                  </option>
                ))}
              </select>
            </>
          )}
          {erroForm && <p className="error-text">{erroForm}</p>}
          <button type="submit" disabled={criando}>
            {criando ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <input maxLength={80}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CPF..."
            style={{ flex: 1, minWidth: 220 }}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            <input
              type="checkbox"
              checked={mostrarExcluidos}
              onChange={(e) => setMostrarExcluidos(e.target.checked)}
            />
            Mostrar excluídos
          </label>
        </div>
        {carregando && <p>Carregando...</p>}
        {erro && <p className="error-text">{erro}</p>}
        {!carregando && !erro && (
          <>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 8 }}>
              <label>
                Espelho de ponto: início
                <br />
                <input type="date" value={espInicio} max={espFim} onChange={(e) => setEspInicio(e.target.value)} />
              </label>
              <label>
                fim
                <br />
                <input type="date" value={espFim} min={espInicio} onChange={(e) => setEspFim(e.target.value)} />
              </label>
              <span style={{ fontSize: 12 }}>Use o botão "Espelho (PDF)" na linha do ajudante.</span>
            </div>
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
                rotulo: "data de cadastro",
              }}
 tituloPopup="Ajudantes"
>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Status</th>
                  <th>Dispositivo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginacao.itensExibidos.map((a) => (
                  <Fragment key={a.id}>
                    <tr style={a.excluidoEm ? { opacity: 0.6 } : undefined}>
                      <td>
                        {a.nome}
                        {a.excluidoEm && (
                          <span
                            className="badge"
                            style={{
                              background: "#fee2e2",
                              color: "#b91c1c",
                              marginLeft: 6,
                            }}
                          >
                            excluído
                          </span>
                        )}
                      </td>
                      <td>{a.cpf}</td>
                      <td>
                        {a.excluidoEm ? (
                          a.status
                        ) : (
                          <select
                            value={a.status}
                            onChange={(e) =>
                              onAlterarStatus(
                                a,
                                e.target.value as StatusMotorista,
                              )
                            }
                          >
                            <option value="ATIVO">ATIVO</option>
                            <option value="INATIVO">INATIVO</option>
                            <option value="SUSPENSO">SUSPENSO</option>
                          </select>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${a.dispositivoVinculado ? "ok" : "neutro"}`}
                        >
                          {a.dispositivoVinculado ? "vinculado" : "sem vínculo"}
                        </span>
                      </td>
                      <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          className="secondary"
                          disabled={espelhoBaixando === a.id}
                          onClick={() => void onEspelho(a)}
                        >
                          {espelhoBaixando === a.id ? "Gerando..." : "Espelho (PDF)"}
                        </button>
                        {!a.excluidoEm && (
                          <>
                            {a.dispositivoVinculado ? (
                              <button
                                className="secondary"
                                onClick={() => onRevogarDispositivo(a)}
                              >
                                Revogar dispositivo
                              </button>
                            ) : (
                              <button onClick={() => onVincularDispositivo(a)}>
                                Vincular dispositivo
                              </button>
                            )}
                            <button
                              className="danger"
                              onClick={() => onExcluirCadastro(a)}
                            >
                              Excluir cadastro
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                    {novaChavePorAjudante[a.id] && (
                      <tr>
                        <td colSpan={5} style={{ background: "#fffbeb" }}>
                          <div style={{ padding: "8px 12px" }}>
                            <strong style={{ fontSize: 12 }}>
                              Nova device key (só aparece agora):
                            </strong>
                            <pre
                              style={{
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-all",
                                fontSize: 11,
                              }}
                            >
                              {novaChavePorAjudante[a.id]}
                            </pre>
                            <p style={{ fontSize: 11, color: "#92400e" }}>
                              Repasse ao ajudante agora, junto do ID {a.id}. Não
                              aparece de novo.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {paginacao.itensExibidos.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ color: "#000000" }}>
                      {busca
                        ? "Nenhum ajudante encontrado para essa busca."
                        : "Nenhum ajudante cadastrado ainda."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
</ControlesListaPaginada>
          </>
        )}
      </div>
    </div>
  );
}
