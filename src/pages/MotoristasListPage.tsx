import { FormEvent, useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import { TelefoneInput } from "../components/TelefoneInput";
import { Link, useNavigate } from "react-router-dom";
import { createMotorista, listMotoristas } from "../api/motoristas";
import type { CreateMotoristaInput } from "../api/motoristas";
import { listEmpresas } from "../api/empresas";
import {
  aprovarTrocaDispositivo,
  listarSolicitacoesTroca,
  rejeitarTrocaDispositivo,
} from "../api/dispositivos";
import { listarDiasSemInteracao } from "../api/autorrelatoFolga";
import type { MotoristaSemInteracao } from "../api/autorrelatoFolga";
import { useAuth } from "../context/AuthContext";
import { aplicarMascaraCpf, somenteDigitos } from "../utils/mascaras";
import type {
  Empresa,
  Motorista,
  SolicitacaoTrocaDispositivo,
} from "../api/types";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { ControlesListaPaginada } from "../components/ControlesListaPaginada";
import { usePrompt } from "../components/PromptProvider";

export function MotoristasListPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const prompt = usePrompt();
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnh, setCnh] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [placa, setPlaca] = useState("");
  const [idRastreador, setIdRastreador] = useState("");
  const [tecnologiaRastreador, setTecnologiaRastreador] = useState("");
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [criando, setCriando] = useState(false);
  // Rodada 96 , pedido do usuário: formulário de cadastro minimizado por
  // padrão, só abre ao clicar em "+ Novo motorista" (a lista de
  // motoristas é o que mais se usa no dia a dia; o formulário ocupava
  // espaço acima dela o tempo todo).
  const [formAberto, setFormAberto] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const [solicitacoes, setSolicitacoes] = useState<
    SolicitacaoTrocaDispositivo[]
  >([]);
  const [processandoSolicitacao, setProcessandoSolicitacao] = useState<
    string | null
  >(null);
  const [novaChavePorSolicitacao, setNovaChavePorSolicitacao] = useState<
    Record<string, string>
  >({});
  const [semInteracao, setSemInteracao] = useState<MotoristaSemInteracao[]>([]);

  // Rodada 65 , busca por nome/CPF (inclusive de cadastros excluídos,
  // se a caixa "mostrar excluídos" estiver marcada): "Excluir cadastro"
  // tira o motorista da listagem normal, mas pesquisando o nome dele
  // aqui (com essa caixa marcada) ainda é possível achar o cadastro ,
  // e, a partir dele, todo o histórico continua intacto.
  const [busca, setBusca] = useState("");
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false);

  // Rodada 99 , pedido do usuário: digitar na busca ou marcar "mostrar
  // excluídos" não pode "piscar" a tela inteira trocando a lista por
  // "Carregando…" , mesmo padrão já usado em
  // MotoristaDetailPage.tsx/DocumentosCargaPage.tsx desde a Rodada 77.
  // Só a carga INICIAL (ref `primeiraCargaFeita`) passa pela tela
  // cheia; busca, filtro, e as atualizações depois de aprovar/rejeitar
  // troca ou cadastrar motorista só trocam a lista no lugar.
  async function carregar(comCarregamentoTelaCheia = false) {
    if (!usuario) return;
    if (comCarregamentoTelaCheia) setCarregando(true);
    try {
      const [
        paginaMotoristas,
        solicitacoesCarregadas,
        semInteracaoCarregado,
        empresasCarregadas,
      ] = await Promise.all([
        listMotoristas(1, 200, busca, mostrarExcluidos),
        listarSolicitacoesTroca(),
        listarDiasSemInteracao(),
        listEmpresas(),
      ]);
      setMotoristas(paginaMotoristas.dados);
      setSolicitacoes(solicitacoesCarregadas);
      setSemInteracao(semInteracaoCarregado);
      setEmpresas(empresasCarregadas);
      // Se o grupo só tem um CNPJ (o caso comum), já pré-seleciona pra
      // não obrigar quem cadastra a escolher algo óbvio; com mais de um
      // CNPJ, deixa em branco pra forçar a escolha explícita.
      setEmpresaId(
        (atual) =>
          atual ||
          (empresasCarregadas.length === 1 ? empresasCarregadas[0].id : ""),
      );
      setErro(null);
    } catch {
      setErro("Não foi possível carregar os motoristas.");
    } finally {
      setCarregando(false);
    }
  }

  async function onAprovarTroca(solicitacaoId: string) {
    setProcessandoSolicitacao(solicitacaoId);
    try {
      const resultado = await aprovarTrocaDispositivo(solicitacaoId);
      setNovaChavePorSolicitacao((prev) => ({
        ...prev,
        [solicitacaoId]: resultado.deviceApiKey,
      }));
      await carregar();
    } finally {
      setProcessandoSolicitacao(null);
    }
  }

  async function onRejeitarTroca(solicitacaoId: string) {
    const motivo = await prompt("Motivo da rejeição:", {
      titulo: "Rejeitar troca de dispositivo",
      placeholder: "Motivo (mínimo 10 caracteres)",
      multilinha: true,
      textoConfirmar: "Rejeitar",
      perigo: true,
      validar: (v) =>
        v.trim().length < 10 ? "Informe pelo menos 10 caracteres." : null,
    });
    if (!motivo || motivo.trim().length < 10) return;
    setProcessandoSolicitacao(solicitacaoId);
    try {
      await rejeitarTrocaDispositivo(solicitacaoId, motivo.trim());
      await carregar();
    } finally {
      setProcessandoSolicitacao(null);
    }
  }

  const primeiraCargaFeita = useRef(false);

  useEffect(() => {
    carregar(!primeiraCargaFeita.current);
    primeiraCargaFeita.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.grupoId]);

  // Busca com um pequeno debounce , evita disparar uma chamada a cada
  // tecla digitada.
  useEffect(() => {
    const id = setTimeout(() => {
      carregar(!primeiraCargaFeita.current);
      primeiraCargaFeita.current = true;
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, mostrarExcluidos]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!usuario) return;
    if (!empresaId) {
      setErroForm("Selecione a empresa (CNPJ) a que este motorista pertence.");
      return;
    }
    if (!telefone.trim()) {
      setErroForm("Informe o telefone de contato do motorista.");
      return;
    }
    setErroForm(null);
    setCriando(true);
    try {
      await createMotorista({
        nome,
        cpf,
        cnh,
        empresaId,
        telefone: telefone.trim(),
        placa: placa.trim() || undefined,
        idRastreador: idRastreador.trim() || undefined,
        tecnologiaRastreador: (tecnologiaRastreador ||
          undefined) as CreateMotoristaInput["tecnologiaRastreador"],
      });
      setNome("");
      setCpf("");
      setCnh("");
      setTelefone("");
      setPlaca("");
      setIdRastreador("");
      setTecnologiaRastreador("");
      setFormAberto(false);
      await carregar();
    } catch (erro) {
      // Rodada 42 , antes qualquer falha (inclusive um erro 500 de
      // servidor, ex.: coluna nova faltando no banco) caía nessa
      // mesma mensagem genérica de "CPF/CNH inválidos", escondendo o
      // problema real. Agora só mostra essa mensagem pra erro de
      // validação (400/409); erro de servidor mostra algo que deixa
      // claro que não é a pessoa que errou o preenchimento.
      if (
        erro instanceof AxiosError &&
        erro.response?.status &&
        erro.response.status < 500
      ) {
        setErroForm(
          "Não foi possível cadastrar (CPF/CNH inválidos, placa em formato inválido, ou CPF/CNH já cadastrado).",
        );
      } else {
        setErroForm(
          "Erro no servidor ao cadastrar. Tente novamente em instantes; se persistir, avise o suporte técnico.",
        );
      }
    } finally {
      setCriando(false);
    }
  }

  // Rodada 108 , pedido do usuário: ordenar, filtrar por período e
  // paginar com popup dedicado em toda tabela de listagem do painel.
  const paginacaoSolicitacoes = useListaPaginada(
    solicitacoes,
    (s) => s.criadoEm,
  );
  const paginacaoMotoristas = useListaPaginada(motoristas, (m) => m.createdAt);

  return (
    <div>
      <h2>Motoristas</h2>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: formAberto ? 12 : 0,
          }}
        >
          <h3 style={{ margin: 0 }}>Cadastrar motorista</h3>
          <button
            type="button"
            className={formAberto ? "secondary" : ""}
            onClick={() => setFormAberto((atual) => !atual)}
          >
            {formAberto ? "Cancelar" : "+ Novo motorista"}
          </button>
        </div>
        {formAberto && (
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
            <label>CNH</label>
            <input
              value={cnh}
              onChange={(e) => setCnh(e.target.value)}
              required
            />
            <label>Telefone de contato</label>
            <TelefoneInput value={telefone} onChange={setTelefone} required />
            <label>
              Placa do veículo de tração (cavalo mecânico), opcional
            </label>
            <input
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="ABC1234 ou ABC1D23 (opcional)"
              maxLength={7}
            />
            <label>ID do rastreador (opcional)</label>
            <input
              value={idRastreador}
              onChange={(e) => setIdRastreador(e.target.value)}
            />
            <p
              style={{
                fontSize: 12,
                color: "#92400e",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 6,
                padding: "8px 10px",
                marginTop: -6,
              }}
            >
              Aviso: hoje o sistema só guarda o vínculo do rastreador, a captura
              do sinal real dele ainda não está implementada. Cada veículo só
              pode estar vinculado a um motorista por vez.
            </p>
            <label>Tecnologia do rastreador (opcional)</label>
            <select
              value={tecnologiaRastreador}
              onChange={(e) => setTecnologiaRastreador(e.target.value)}
            >
              <option value="">Nenhuma</option>
              <option value="GPS">GPS</option>
              <option value="SATELITAL">Satelital</option>
              <option value="CELULAR">Celular</option>
              <option value="RFID">RFID</option>
              <option value="HIBRIDO">Híbrido (GPS + satélite)</option>
              <option value="OUTRO">Outro</option>
            </select>
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
        )}
      </div>

      {semInteracao.length > 0 && (
        <div
          className="card"
          style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
        >
          <h3 style={{ marginTop: 0 }}>
            Radar: dias sem interação (últimos 7 dias)
          </h3>
          <p style={{ fontSize: 13, color: "#1e3a8a" }}>
            Dias em que o motorista não bateu nenhum ponto e também não avisou
            folga pelo app. Pode ser falta de sinal, esquecimento, ou algo mais
            grave que vale confirmar direto com ele.
          </p>
          <ul style={{ fontSize: 13 }}>
            {semInteracao.map((m) => (
              <li key={m.motoristaId}>
                <Link to={`/motoristas/${m.motoristaId}`}>{m.nome}</Link>:{" "}
                {m.diasSemInteracao
                  .map((d) => new Date(d).toLocaleDateString("pt-BR"))
                  .join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {solicitacoes.length > 0 && (
        <div
          className="card"
          style={{ background: "#fffbeb", borderColor: "#fde68a" }}
        >
          <h3 style={{ marginTop: 0 }}>
            Solicitações de troca de aparelho pendentes
          </h3>
          <p style={{ fontSize: 13, color: "#92400e" }}>
            O motorista perdeu, quebrou ou trocou de celular e pediu direto pelo
            app. Nada foi vinculado ainda, só você (ADMIN/GESTOR) pode aprovar
            ou rejeitar.
          </p>
          <ControlesListaPaginada
            ordem={paginacaoSolicitacoes.ordem}
            onAlternarOrdem={paginacaoSolicitacoes.alternarOrdem}
            qtdPorPagina={paginacaoSolicitacoes.qtdPorPagina}
            onMudarQtdPorPagina={paginacaoSolicitacoes.mudarQtdPorPagina}
            pagina={paginacaoSolicitacoes.pagina}
            totalPaginas={paginacaoSolicitacoes.totalPaginas}
            popupAberto={paginacaoSolicitacoes.popupAberto}
            onAbrirPopup={paginacaoSolicitacoes.abrirPopup}
            onFecharPopup={paginacaoSolicitacoes.fecharPopup}
            onSelecionarPagina={paginacaoSolicitacoes.irParaPagina}
            filtroData={{
              dataInicio: paginacaoSolicitacoes.dataInicio,
              onDataInicio: paginacaoSolicitacoes.setDataInicio,
              dataFim: paginacaoSolicitacoes.dataFim,
              onDataFim: paginacaoSolicitacoes.setDataFim,
              rotulo: "data do pedido",
            }}
 tituloPopup="Solicitações de ajuste pendentes"
>
          <table>
            <thead>
              <tr>
                <th>Motorista</th>
                <th>Aparelho novo (UUID)</th>
                <th>Modelo / SO</th>
                <th>Observação</th>
                <th>Pedido em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginacaoSolicitacoes.itensExibidos.map((s) => (
                <tr key={s.id}>
                  <td>{s.motorista?.nome ?? s.motoristaId}</td>
                  <td style={{ fontSize: 11 }}>{s.deviceUuidSolicitado}</td>
                  <td style={{ fontSize: 12 }}>
                    {s.modeloAparelho ?? ","} · {s.sistemaOperacional ?? ","}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {s.observacaoMotorista ?? ","}
                  </td>
                  <td>{new Date(s.criadoEm).toLocaleString("pt-BR")}</td>
                  <td>
                    {novaChavePorSolicitacao[s.id] ? (
                      <div>
                        <strong style={{ fontSize: 12 }}>
                          Nova device key (só agora):
                        </strong>
                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            fontSize: 11,
                          }}
                        >
                          {novaChavePorSolicitacao[s.id]}
                        </pre>
                        <p style={{ fontSize: 11, color: "#92400e" }}>
                          Repasse ao motorista agora, não aparece de novo.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => onAprovarTroca(s.id)}
                          disabled={processandoSolicitacao === s.id}
                        >
                          Aprovar
                        </button>
                        <button
                          className="danger"
                          onClick={() => onRejeitarTroca(s.id)}
                          disabled={processandoSolicitacao === s.id}
                        >
                          Rejeitar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</ControlesListaPaginada>
        </div>
      )}

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
          <input
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
            <ControlesListaPaginada
              ordem={paginacaoMotoristas.ordem}
              onAlternarOrdem={paginacaoMotoristas.alternarOrdem}
              qtdPorPagina={paginacaoMotoristas.qtdPorPagina}
              onMudarQtdPorPagina={paginacaoMotoristas.mudarQtdPorPagina}
              pagina={paginacaoMotoristas.pagina}
              totalPaginas={paginacaoMotoristas.totalPaginas}
              popupAberto={paginacaoMotoristas.popupAberto}
              onAbrirPopup={paginacaoMotoristas.abrirPopup}
              onFecharPopup={paginacaoMotoristas.fecharPopup}
              onSelecionarPagina={paginacaoMotoristas.irParaPagina}
              filtroData={{
                dataInicio: paginacaoMotoristas.dataInicio,
                onDataInicio: paginacaoMotoristas.setDataInicio,
                dataFim: paginacaoMotoristas.dataFim,
                onDataFim: paginacaoMotoristas.setDataFim,
                rotulo: "data de cadastro",
              }}
 tituloPopup="Motoristas"
>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Status</th>
                  <th>Placa</th>
                  <th>Dispositivo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginacaoMotoristas.itensExibidos.map((m) => (
                  <tr
                    key={m.id}
                    style={m.excluidoEm ? { opacity: 0.6 } : undefined}
                  >
                    <td>
                      {m.nome}
                      {m.excluidoEm && (
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
                    <td>{m.cpf}</td>
                    <td>{m.status}</td>
                    <td>
                      {m.veiculoVinculado?.placa ?? (
                        <span
                          className="badge"
                          style={{ background: "#fee2e2", color: "#b91c1c" }}
                        >
                          sem placa
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${m.dispositivoVinculado ? "ok" : "neutro"}`}
                      >
                        {m.dispositivoVinculado ? "vinculado" : "sem vínculo"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="secondary"
                        style={{ fontSize: 12, padding: "4px 10px" }}
                        onClick={() => navigate(`/motoristas/${m.id}`)}
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
                {paginacaoMotoristas.itensExibidos.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ color: "#000000" }}>
                      {busca
                        ? "Nenhum motorista encontrado para essa busca."
                        : "Nenhum motorista cadastrado ainda."}
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
