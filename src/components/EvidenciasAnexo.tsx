import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useConfirm } from "./ConfirmProvider";

/**
 * Rodada 73 , pedido do usuário: "add a opção de vê as imagens anexadas
 * em miniatura e clicar para expandir e baixar e a opção de remover que
 * tbm deve remover do banco de dados."
 *
 * Componente compartilhado pelas duas telas que têm evidência anexada
 * (Tratamento de ponto em MotoristaDetailPage e Solicitação de ajuste em
 * SolicitacoesAjustePage) , mesma UI, cada tela só passa suas próprias
 * funções de API (obterUrl/baixar/remover), que já sabem em qual rota
 * bater (tratamentos-ponto vs solicitacoes-ajuste-ponto).
 */

export interface EvidenciaAnexo {
  id: string;
  nomeArquivo: string;
  contentType: string;
  tamanhoBytes: number;
}

export interface EvidenciasAnexoProps {
  evidencias: EvidenciaAnexo[];
  obterUrl: (evidenciaId: string) => Promise<string>;
  baixar: (evidenciaId: string, nomeArquivo: string) => Promise<void>;
  /** Ausente = sem opção de remover (ex.: motorista vendo evidência já decidida). */
  remover?: (evidenciaId: string) => Promise<void>;
  onRemovido?: () => void;
}

function ehImagem(contentType: string): boolean {
  return contentType.startsWith("image/");
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Uma miniatura , busca a própria imagem (autenticada) só quando é imagem. */
function Miniatura({
  evidencia,
  obterUrl,
  onAbrir,
}: {
  evidencia: EvidenciaAnexo;
  obterUrl: (evidenciaId: string) => Promise<string>;
  onAbrir: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(ehImagem(evidencia.contentType));

  useEffect(() => {
    if (!ehImagem(evidencia.contentType)) return;
    let cancelado = false;
    let urlLocal: string | null = null;
    setCarregando(true);
    obterUrl(evidencia.id)
      .then((u) => {
        if (cancelado) {
          window.URL.revokeObjectURL(u);
          return;
        }
        urlLocal = u;
        setUrl(u);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
      if (urlLocal) window.URL.revokeObjectURL(urlLocal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidencia.id]);

  const estilo: CSSProperties = {
    width: 64,
    height: 64,
    borderRadius: 6,
    border: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    color: "#000000",
    cursor: "pointer",
    overflow: "hidden",
    background: "#f9fafb",
    flexShrink: 0,
  };

  if (ehImagem(evidencia.contentType) && url) {
    return (
      <img
        src={url}
        alt={evidencia.nomeArquivo}
        title={`${evidencia.nomeArquivo}, clique para expandir`}
        onClick={onAbrir}
        style={{ ...estilo, objectFit: "cover" }}
      />
    );
  }

  return (
    <div
      style={estilo}
      onClick={onAbrir}
      title={`${evidencia.nomeArquivo}, clique para abrir`}
    >
      {carregando ? "..." : "📄"}
    </div>
  );
}

export function EvidenciasAnexo({
  evidencias,
  obterUrl,
  baixar,
  remover,
  onRemovido,
}: EvidenciasAnexoProps) {
  const confirm = useConfirm();
  const [expandida, setExpandida] = useState<EvidenciaAnexo | null>(null);
  const [urlExpandida, setUrlExpandida] = useState<string | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!expandida) {
      setUrlExpandida(null);
      return;
    }
    let cancelado = false;
    let urlLocal: string | null = null;
    obterUrl(expandida.id).then((u) => {
      if (cancelado) {
        window.URL.revokeObjectURL(u);
        return;
      }
      urlLocal = u;
      setUrlExpandida(u);
    });
    return () => {
      cancelado = true;
      if (urlLocal) window.URL.revokeObjectURL(urlLocal);
    };
  }, [expandida, obterUrl]);

  async function onRemover(evidenciaId: string) {
    if (!remover) return;
    if (
      !(await confirm(
        "Remover esta evidência? Ela some do armazenamento e não pode ser recuperada.",
        { perigo: true, textoConfirmar: "Remover" },
      ))
    )
      return;
    setErro(null);
    setRemovendoId(evidenciaId);
    try {
      await remover(evidenciaId);
      setExpandida(null);
      onRemovido?.();
    } catch {
      setErro("Não foi possível remover a evidência agora.");
    } finally {
      setRemovendoId(null);
    }
  }

  if (evidencias.length === 0) {
    return (
      <span style={{ fontSize: 12, color: "#000000" }}>
        Nenhuma evidência anexada
      </span>
    );
  }

  return (
    <>
      {erro && (
        <p className="error-text" style={{ fontSize: 12 }}>
          {erro}
        </p>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {evidencias.map((ev) => (
          <Miniatura
            key={ev.id}
            evidencia={ev}
            obterUrl={obterUrl}
            onAbrir={() => setExpandida(ev)}
          />
        ))}
      </div>

      {expandida && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setExpandida(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: 16,
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "baseline",
              }}
            >
              <strong style={{ fontSize: 13 }}>
                {expandida.nomeArquivo}{" "}
                <span style={{ color: "#000000", fontWeight: 400 }}>
                  ({formatarTamanho(expandida.tamanhoBytes)})
                </span>
              </strong>
              <button
                type="button"
                onClick={() => setExpandida(null)}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>

            {ehImagem(expandida.contentType) ? (
              urlExpandida ? (
                <img
                  src={urlExpandida}
                  alt={expandida.nomeArquivo}
                  style={{
                    maxWidth: "80vw",
                    maxHeight: "65vh",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <p style={{ fontSize: 12, color: "#000000" }}>Carregando...</p>
              )
            ) : (
              <p style={{ fontSize: 12, color: "#000000" }}>
                Pré-visualização não disponível para este tipo de arquivo.
              </p>
            )}

            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                onClick={() => baixar(expandida.id, expandida.nomeArquivo)}
              >
                Baixar
              </button>
              {remover && (
                <button
                  type="button"
                  onClick={() => onRemover(expandida.id)}
                  disabled={removendoId === expandida.id}
                  style={{ color: "#b91c1c" }}
                >
                  {removendoId === expandida.id ? "Removendo..." : "Remover"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
