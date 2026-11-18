import { mensagemDoErro } from "../utils/mensagemDoErro";
import { useState } from "react";
import { useSelecao } from "../hooks/useSelecao";
import { Link } from "react-router-dom";
import { aprovarSolicitacao, rejeitarSolicitacao } from "../api/solicitacoesAjuste";
import { aprovarPedidoFolga, negarPedidoFolga } from "../api/solicitacoesFolga";
import { AbasTopo, useAbaAtiva, type AbaDef } from "../components/AbasTopo";
import { processarVencidosDoGrupo } from "../api/bancoHoras";
import { useAuth } from "../context/AuthContext";
import { minParaHoras } from "../utils/formatarDuracao";
import { useConfirm } from "../components/ConfirmProvider";
import { usePrompt } from "../components/PromptProvider";
import { useToast } from "../components/ToastProvider";
import { useFilaDePendencias, type ItemDaFila, type TipoItemDaFila } from "../components/penMenu";

const ROTULO_TIPO: Record<TipoItemDaFila, string> = {
  alerta: "Alerta de jornada",
  ajuste: "Ajuste de ponto",
  folga: "Pedido de folga",
  privacidade: "Privacidade (LGPD)",
  banco: "Banco de horas",
  radar: "Dia sem interação",
};

const ABAS: AbaDef[] = [
  { id: "todas", rotulo: "Todas" },
  { id: "alerta", rotulo: "Alertas" },
  { id: "ajuste", rotulo: "Ajustes" },
  { id: "folga", rotulo: "Folgas" },
  { id: "radar", rotulo: "Sem interação" },
  { id: "banco", rotulo: "Banco de horas" },
  { id: "privacidade", rotulo: "Privacidade" },
];

const LIMITE_MOTIVO = 500;

function haQuanto(desde: string | undefined, agora: number): string {
  if (!desde) return "";
  const min = Math.max(0, Math.floor((agora - new Date(desde).getTime()) / 60000));
  if (Number.isNaN(min)) return "";
  if (min < 60) return `há ${min} min`;
  if (min < 60 * 24) return `há ${Math.floor(min / 60)} h`;
  const dias = Math.floor(min / (60 * 24));
  return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

/** Só pedido de ajuste e pedido de folga podem ser decididos daqui. */
function decidivel(i: ItemDaFila): boolean {
  return (i.tipo === "ajuste" || i.tipo === "folga") && Boolean(i.id);
}

/**
 * Ordem segura para decidir em lote: por colaborador e, nos ajustes, do evento mais antigo
 * para o mais novo (cada aprovação de ajuste depende da anterior já estar lançada).
 */
function ordenarParaDecidir(itens: ItemDaFila[]): ItemDaFila[] {
  return [...itens].sort(
    (a, b) =>
      (a.motoristaId ?? "").localeCompare(b.motoristaId ?? "") ||
      (a.ordem ?? a.desde ?? "").localeCompare(b.ordem ?? b.desde ?? ""),
  );
}

const mensagemDoErroDaDecisao = (e: unknown) =>
  mensagemDoErro(e, "não foi possível registrar a decisão");

/**
 * Fila única de pendências (arquivo chamado "FilaPen" porque o .gitignore do projeto
 * ignora nomes com "pendencia", de propósito), lida do que o sino já buscou (nenhuma consulta nova).
 * Pedidos de ajuste e de folga podem ser aprovados ou negados em lote. Cada pedido
 * continua sendo uma decisão separada no servidor (mesma rota, mesma permissão, mesma trilha de
 * auditoria); aqui só se evita abrir um por um. Se um falhar, os outros seguem e o erro aparece.
 */
export function FilaPenPage() {
  const filaCompleta = useFilaDePendencias();
  const aba = useAbaAtiva(ABAS);
  const confirm = useConfirm();
  const prompt = usePrompt();
  const toast = useToast();
  const { usuario } = useAuth();
  const ehAdmin = usuario?.papel === "ADMIN";
  const { selecionados: marcados, setSelecionados: setMarcados, alternar } = useSelecao();
  // Já decididos nesta tela: somem na hora, sem esperar a próxima consulta do sino.
  const [decididos, setDecididos] = useState<Set<string>>(new Set());
  const [processando, setProcessando] = useState(false);

  const agora = Date.now();
  const fila = filaCompleta.filter((i) => !decididos.has(i.chave));
  const contagem = (tipo: string) => fila.filter((i) => i.tipo === tipo).length;
  const itens = fila
    .filter((i) => aba === "todas" || i.tipo === aba)
    .sort((a, b) => (a.desde ?? "9999").localeCompare(b.desde ?? "9999"));
  const selecionaveis = itens.filter(decidivel);
  const selecionados = selecionaveis.filter((i) => marcados.has(i.chave));
  const todosMarcados = selecionaveis.length > 0 && selecionados.length === selecionaveis.length;


  async function processarVencidos() {
    if (processando) return;
    const ok = await confirm(
      "Processar créditos vencidos? O saldo vencido e não compensado de cada colaborador recebe uma baixa por vencimento no banco de horas. O lançamento é imutável e fica no arquivo de horas para a folha. Repetir não duplica.",
    );
    if (!ok) return;
    setProcessando(true);
    try {
      const r = await processarVencidosDoGrupo();
      if (r.motoristas === 0) toast.sucesso("Nenhum crédito vencido para baixar.");
      else
        toast.sucesso(
          `${r.motoristas} ${r.motoristas === 1 ? "colaborador" : "colaboradores"} com baixa por vencimento, ${minParaHoras(r.totalMin)} no total.`,
        );
      if (r.falhas.length > 0)
        toast.erro(`Não foi possível baixar: ${r.falhas.slice(0, 3).map((x) => x.nome).join(", ")}.`);
    } catch (e) {
      toast.erro(mensagemDoErroDaDecisao(e));
    } finally {
      setProcessando(false);
    }
  }

  async function decidirEmLote(aprovar: boolean) {
    if (selecionados.length === 0 || processando) return;
    const qtd = `${selecionados.length} ${selecionados.length === 1 ? "pedido" : "pedidos"}`;
    let motivo = "";
    if (aprovar) {
      const ok = await confirm(
        `Aprovar ${qtd}? Cada um é lançado como decisão sua, e os ajustes entram no ponto na ordem dos horários.`,
      );
      if (!ok) return;
    } else {
      const texto = await prompt(`Motivo para negar ${qtd} (o colaborador recebe este texto):`, {
        titulo: "Negar pedidos",
        multilinha: true,
        perigo: true,
        textoConfirmar: "Negar",
        validar: (v) =>
          !v.trim()
            ? "Informe o motivo."
            : v.length > LIMITE_MOTIVO
              ? `Use até ${LIMITE_MOTIVO} caracteres.`
              : null,
      });
      if (texto === null) return;
      motivo = texto.trim();
    }

    setProcessando(true);
    const feitos: string[] = [];
    const falhas: string[] = [];
    for (const item of ordenarParaDecidir(selecionados)) {
      try {
        if (item.tipo === "ajuste") {
          if (aprovar) await aprovarSolicitacao(item.id!);
          else await rejeitarSolicitacao(item.id!, motivo);
        } else {
          if (aprovar) await aprovarPedidoFolga(item.id!);
          else await negarPedidoFolga(item.id!, motivo);
        }
        feitos.push(item.chave);
      } catch (e) {
        falhas.push(`${item.quem}: ${mensagemDoErroDaDecisao(e)}`);
      }
    }
    setDecididos((atual) => new Set([...atual, ...feitos]));
    setMarcados(new Set());
    setProcessando(false);
    if (feitos.length > 0) {
      toast.sucesso(
        `${feitos.length} ${feitos.length === 1 ? "pedido" : "pedidos"} ${aprovar ? "aprovado(s)" : "negado(s)"}.`,
      );
    }
    if (falhas.length > 0) {
      toast.erro(`${falhas.length} não ${falhas.length === 1 ? "foi decidido" : "foram decididos"}. ${falhas.slice(0, 3).join(" | ")}`);
    }
  }

  return (
    <div>
      <AbasTopo
        abas={ABAS.map((a) => ({
          id: a.id,
          rotulo: `${a.rotulo} (${a.id === "todas" ? fila.length : contagem(a.id)})`,
        }))}
      />
      <h1>Pendências</h1>
      {ehAdmin && aba === "banco" && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ marginTop: 0 }}>
            Baixa, de uma vez, o saldo do banco de horas que venceu sem compensação. Cada colaborador recebe um lançamento de baixa por vencimento.
          </p>
          <button type="button" disabled={processando} onClick={() => void processarVencidos()}>
            {processando ? "Processando..." : "Processar créditos vencidos"}
          </button>
        </div>
      )}
      <div className="card">
        {itens.length === 0 ? (
          <p style={{ margin: 0 }}>
            {fila.length === 0
              ? "Nenhuma pendência agora. Quando chegar um alerta, pedido de ajuste, folga ou pedido de privacidade, ele aparece aqui."
              : "Nenhuma pendência deste tipo. Veja as outras abas."}
          </p>
        ) : (
          <>
            {selecionaveis.length > 0 && (
              <div className="pendencias-lote">
                <span>
                  {selecionados.length === 0
                    ? "Marque pedidos de ajuste ou de folga para decidir vários de uma vez."
                    : `${selecionados.length} selecionado(s)`}
                </span>
                <button
                  type="button"
                  disabled={selecionados.length === 0 || processando}
                  onClick={() => void decidirEmLote(true)}
                >
                  {processando ? "Registrando..." : "Aprovar selecionados"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={selecionados.length === 0 || processando}
                  onClick={() => void decidirEmLote(false)}
                >
                  Negar selecionados
                </button>
              </div>
            )}
            <table>
              <thead>
                <tr>
                  <th>
                    {selecionaveis.length > 0 && (
                      <input
                        type="checkbox"
                        aria-label="Selecionar todos os pedidos de ajuste e de folga desta lista"
                        checked={todosMarcados}
                        disabled={processando}
                        onChange={() =>
                          setMarcados(
                            todosMarcados ? new Set() : new Set(selecionaveis.map((i) => i.chave)),
                          )
                        }
                      />
                    )}
                  </th>
                  <th>Tipo</th>
                  <th>Colaborador</th>
                  <th>O que é</th>
                  <th>Aguardando</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {itens.map((i) => (
                  <tr key={i.chave}>
                    <td>
                      {decidivel(i) && (
                        <input
                          type="checkbox"
                          aria-label={`Selecionar ${ROTULO_TIPO[i.tipo]} de ${i.quem}`}
                          checked={marcados.has(i.chave)}
                          disabled={processando}
                          onChange={() => alternar(i.chave)}
                        />
                      )}
                    </td>
                    <td>{ROTULO_TIPO[i.tipo]}</td>
                    <td>{i.quem}</td>
                    <td>{i.descricao}</td>
                    <td>{haQuanto(i.desde, agora)}</td>
                    <td>
                      <Link to={i.to}>{decidivel(i) ? "Ver detalhes →" : "Tratar →"}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
