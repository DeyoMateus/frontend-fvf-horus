import { useState } from "react";
import type { FormEvent } from "react";
import { responderSolicitacaoTitular } from "../api/privacidade";
import type {
  SolicitacaoTitularPainel,
  StatusSolicitacaoTitular,
} from "../api/privacidade";
import { TextoLongo } from "./TextoLongo";

export const ROTULO_TIPO_PEDIDO: Record<string, string> = {
  CONFIRMACAO_TRATAMENTO: "Confirmação de tratamento",
  ACESSO: "Acesso aos dados",
  CORRECAO: "Correção de dados",
  ANONIMIZACAO_ELIMINACAO: "Eliminação ou anonimização",
  PORTABILIDADE: "Portabilidade",
  INFORMACAO_COMPARTILHAMENTO: "Informação sobre compartilhamento",
  REVOGACAO_CONSENTIMENTO: "Revogação de consentimento",
  REVISAO_DECISAO_AUTOMATIZADA: "Revisão de decisão automática",
  OPOSICAO: "Questionamento ou oposição ao tratamento",
  ELIMINACAO: "Eliminação de dados",
  BLOQUEIO_ANONIMIZACAO: "Bloqueio ou anonimização de dados",
  DUVIDA_PRIVACIDADE: "Dúvida sobre privacidade",
};

export const ROTULO_STATUS_PEDIDO: Record<StatusSolicitacaoTitular, string> = {
  ABERTA: "Aberto",
  EM_ANALISE: "Em análise",
  ATENDIDA: "Atendido",
  NEGADA_COM_JUSTIFICATIVA: "Negado com justificativa",
};

/** Orientação ao gestor sobre o que a LGPD espera em cada tipo de pedido. */
const ORIENTACAO: Record<string, string> = {
  CONFIRMACAO_TRATAMENTO:
    "Confirme ao motorista que o sistema trata os dados dele (cadastro, jornada, localização) e para quê.",
  ACESSO:
    "O motorista já pode baixar uma cópia dos próprios dados no aplicativo (Privacidade). Informe isso e, se ele precisar de algo além, anexe ou descreva.",
  CORRECAO:
    "Nome e telefone o motorista edita no Perfil. Outros dados (CPF, CNH) são corrigidos pelo RH no cadastro. Registros de jornada não são alterados: a correção é feita por ajuste de ponto.",
  ANONIMIZACAO_ELIMINACAO:
    "Analise cada categoria de dado separadamente. As marcações de ponto ainda sujeitas à preservação legal são mantidas. GPS, mensagens, informações de aparelhos e anexos que não sejam mais necessários devem ser avaliados para eliminação, bloqueio ou anonimização. Responda explicando o que foi atendido e o que precisou ser mantido, com a justificativa.",
  ELIMINACAO:
    "Analise cada categoria de dado separadamente. As marcações de ponto ainda sujeitas à preservação legal são mantidas. GPS, mensagens, informações de aparelhos e anexos que não sejam mais necessários devem ser avaliados para eliminação. Responda explicando o que foi atendido e o que precisou ser mantido, com a justificativa. Correção de ponto nunca apaga a marcação original.",
  BLOQUEIO_ANONIMIZACAO:
    "Identifique os dados indicados pelo motorista. Dados desnecessários, excessivos ou tratados em desconformidade devem ser avaliados para bloqueio ou anonimização. As marcações de ponto sujeitas à preservação legal são mantidas; explique ao motorista o que foi atendido e o que foi mantido.",
  DUVIDA_PRIVACIDADE:
    "Responda à dúvida do motorista com base na Política de Privacidade. Se a dúvida revelar um pedido (acesso, correção, eliminação), trate-o como tal.",
  PORTABILIDADE:
    "O motorista pode baixar os dados em formato estruturado (JSON) no aplicativo, em Privacidade.",
  INFORMACAO_COMPARTILHAMENTO:
    "Os dados são compartilhados com a empresa (gestores autorizados), a fiscalização do trabalho quando exigido e fornecedores de infraestrutura (veja a Política de Privacidade).",
  REVOGACAO_CONSENTIMENTO:
    "O tratamento dos dados de jornada é realizado com fundamento nas obrigações legais e na execução do contrato de trabalho, e não depende de consentimento. A retirada de uma permissão técnica do aparelho, como a localização em segundo plano, deve ser tratada separadamente e conforme as funcionalidades que dependem dessa permissão.",
  REVISAO_DECISAO_AUTOMATIZADA:
    "Os alertas são calculados automaticamente por regras legais e não punem sozinhos. Analise o caso e explique a decisão ao motorista.",
  OPOSICAO:
    "Analise o motivo apresentado pelo motorista e identifique qual tratamento de dados está sendo questionado. A oposição deve ser avaliada conforme a legislação e a base legal utilizada. Quando o tratamento for necessário ao cumprimento de obrigação legal ou à execução do contrato de trabalho, explique ao motorista os motivos pelos quais ele precisa ser mantido. Se houver tratamento desnecessário, excessivo ou em desconformidade com a legislação, encaminhe a solicitação para correção, bloqueio, anonimização ou eliminação, conforme o caso.",
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR") : "-";

/**
 * Popup dedicado para tratar um pedido do titular (LGPD): mostra o pedido
 * inteiro, uma orientação do que a lei espera e permite marcar em análise,
 * atender ou negar com justificativa (a resposta é obrigatória ao concluir).
 * Pedido já concluído abre só para leitura.
 */
export function TratarPedidoTitularModal({
  pedido,
  onFechar,
  onTratado,
}: {
  pedido: SolicitacaoTitularPainel;
  onFechar: () => void;
  onTratado: () => void;
}) {
  const aberto = pedido.status === "ABERTA" || pedido.status === "EM_ANALISE";
  const [resposta, setResposta] = useState(pedido.resposta ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(status: StatusSolicitacaoTitular, e?: FormEvent) {
    e?.preventDefault();
    const conclui = status === "ATENDIDA" || status === "NEGADA_COM_JUSTIFICATIVA";
    if (conclui && resposta.trim().length < 5) {
      setErro("Escreva a resposta ao motorista (obrigatória ao concluir ou negar).");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await responderSolicitacaoTitular(pedido.id, status, resposta.trim());
      onTratado();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      setErro(
        (Array.isArray(msg) ? msg.join(" ") : msg) ||
          "Não foi possível salvar. Tente novamente.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="confirm-overlay" role="presentation" onClick={onFechar}>
      <form
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Tratar pedido do titular"
        style={{ maxWidth: 600, width: "92vw", textAlign: "left" }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void enviar("ATENDIDA", e)}
      >
        <h3>
          {ROTULO_TIPO_PEDIDO[pedido.tipo] ?? pedido.tipo} , {pedido.motorista.nome}
        </h3>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          <div>
            <strong>Situação:</strong> {ROTULO_STATUS_PEDIDO[pedido.status]}
            {pedido.vencida && (
              <strong style={{ color: "#b91c1c" }}> , PRAZO VENCIDO</strong>
            )}
          </div>
          <div>
            <strong>Aberto em:</strong> {fmt(pedido.createdAt)}
          </div>
          <div>
            <strong>Prazo de resposta (15 dias):</strong> {fmt(pedido.prazoEm)}
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>O que o motorista escreveu:</strong>{" "}
            <TextoLongo texto={pedido.descricao} titulo="O que o motorista escreveu" vazio="(sem detalhes)" />
          </div>
        </div>

        <div
          style={{
            background: "#f3f4f6",
            borderRadius: 8,
            padding: 10,
            fontSize: 12.5,
            margin: "10px 0",
          }}
        >
          <strong>Orientação:</strong> {ORIENTACAO[pedido.tipo]}
        </div>

        {aberto ? (
          <>
            <label>Resposta ao motorista</label>
            <textarea
              rows={4}
              maxLength={2000}
              value={resposta}
              onChange={(e) => {
                setResposta(e.target.value);
                setErro(null);
              }}
              placeholder="Esta resposta aparece para o motorista no aplicativo."
            />
          </>
        ) : (
          <div style={{ fontSize: 13 }}>
            <div>
              <strong>Resposta:</strong> {pedido.resposta}
            </div>
            <div>
              <strong>Respondido em:</strong> {fmt(pedido.respondidaEm)}
              {pedido.respondidaPorNome ? ` por ${pedido.respondidaPorNome}` : ""}
            </div>
          </div>
        )}

        {erro && <p className="error-text">{erro}</p>}

        <div className="confirm-modal-acoes">
          <button type="button" className="secondary" onClick={onFechar}>
            {aberto ? "Cancelar" : "Fechar"}
          </button>
          {aberto && (
            <>
              {pedido.status === "ABERTA" && (
                <button
                  type="button"
                  className="secondary"
                  disabled={enviando}
                  onClick={() => void enviar("EM_ANALISE")}
                >
                  Marcar em análise
                </button>
              )}
              <button
                type="button"
                className="secondary"
                disabled={enviando}
                onClick={() => void enviar("NEGADA_COM_JUSTIFICATIVA")}
              >
                Negar com justificativa
              </button>
              <button type="submit" disabled={enviando}>
                {enviando ? "Salvando..." : "Atender"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
