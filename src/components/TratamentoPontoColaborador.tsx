import { mensagemDoErro } from "../utils/mensagemDoErro";
import {
  formatarRegistro,
  offsetDoNavegador,
  paraInputNoOffset,
  resolverFusoDoAjuste,
  rotuloUtc,
} from "../utils/fusoHorario";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  anexarEvidenciaTratamento,
  baixarEvidenciaTratamento,
  createTratamento,
  obterUrlEvidenciaTratamento,
} from "../api/tratamentos";
import { EvidenciasAnexo } from "../components/EvidenciasAnexo";
import { LancarJornadaInteira } from "../components/LancarJornadaInteira";
import { baixarCsvTabela, imprimirTabela } from "../utils/exportarTabelaModal";
import { ControlesListaPaginada } from "../components/ControlesListaPaginada";
import { useListaPaginada } from "../hooks/useListaPaginada";
import type { Motorista, RegistroJornada, TipoEvento, TratamentoPonto } from "../api/types";
import { tiposEventoDaFuncao } from "../api/types";
import { TextoLongo } from "../components/TextoLongo";

/**
 * "Tratamento de ponto" do colaborador, tirado de MotoristaDetailPage (era a seção
 * `somente="tratamento"`, usada só no Fechamento). Mesmo comportamento; o formulário, as evidências
 * e a lista de tratamentos vivem aqui. `onAtualizar` relê os dados da ficha depois de lançar.
 */
export function TratamentoPontoColaborador({
  motoristaId,
  motorista,
  registros,
  tratamentos,
  carregando,
  onAtualizar,
}: {
  motoristaId: string;
  motorista: Motorista;
  registros: RegistroJornada[];
  tratamentos: TratamentoPonto[];
  carregando: boolean;
  onAtualizar: () => Promise<void>;
}) {
  const [searchParams] = useSearchParams();
  const cardTratamentoRef = useRef<HTMLDivElement | null>(null);
  const veioParaEncerrarJornada =
    searchParams.get("secao") === "encerrar-jornada";
  // Vindo do radar ("sem sinal ou esquecimento"), abre o
  // lançamento de jornada inteira já com a data do dia tratado.
  const veioParaLancarJornada = searchParams.get("secao") === "lancar-jornada";
  const dataParaLancarJornada = /^\d{4}-\d{2}-\d{2}$/.test(
    searchParams.get("data") ?? "",
  )
    ? (searchParams.get("data") ?? undefined)
    : undefined;
  useEffect(() => {
    if (carregando || !(veioParaEncerrarJornada || veioParaLancarJornada))
      return;
    cardTratamentoRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [carregando, veioParaEncerrarJornada, veioParaLancarJornada]);

  const [tipoEvento, setTipoEvento] = useState<TipoEvento>("FIM_JORNADA");
  const [timestampEvento, setTimestampEvento] = useState("");
  const [motivo, setMotivo] = useState("");
  const [registroReferenciaId, setRegistroReferenciaId] = useState("");
  const [lancandoTratamento, setLancandoTratamento] = useState(false);
  const [erroTratamento, setErroTratamento] = useState<string | null>(null);
  // Pedido do usuário: anexar evidência é escolhido JUNTO do
  // lançamento (adicionar/tirar antes de enviar), não depois , os
  // arquivos ficam só na memória do navegador até o "Lançar tratamento"
  // ser enviado, quando são subidos em seguida (o backend exige que o
  // tratamento já exista pra vincular a evidência a ele).
  const [evidenciasParaAnexar, setEvidenciasParaAnexar] = useState<File[]>([]);

  const MAXIMO_EVIDENCIAS_POR_TRATAMENTO = 4;
  const TAMANHO_MAXIMO_EVIDENCIA_BYTES = 25 * 1024 * 1024;

  /** Escolher arquivo no formulário só guarda na memória , nada sobe ainda (ver comentário do state). */
  function onEscolherEvidenciaParaAnexar(arquivo: File | undefined) {
    if (!arquivo) return;
    setErroTratamento(null);
    if (evidenciasParaAnexar.length >= MAXIMO_EVIDENCIAS_POR_TRATAMENTO) {
      setErroTratamento(
        `Limite de ${MAXIMO_EVIDENCIAS_POR_TRATAMENTO} evidências por tratamento.`,
      );
      return;
    }
    // Só imagem (JPG, PNG, WEBP, HEIC/HEIF do iPhone). O iPhone às vezes
    // não informa o tipo do HEIC, então confere também a extensão. O
    // servidor valida de novo pelo conteúdo do arquivo.
    const nomeMin = arquivo.name.toLowerCase();
    const ehImagemAceita =
      /^image\/(jpeg|png|webp|heic|heif)$/.test(arquivo.type) ||
      /\.(jpe?g|png|webp|heic|heif)$/.test(nomeMin);
    if (!ehImagemAceita) {
      setErroTratamento(
        "Só é possível anexar imagens (JPG, PNG, WEBP ou HEIC/HEIF do iPhone). PDF e outros arquivos não são aceitos: tire um print ou uma foto do documento e anexe a imagem.",
      );
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_EVIDENCIA_BYTES) {
      setErroTratamento("Arquivo muito grande, o limite é 25MB por imagem.");
      return;
    }
    setEvidenciasParaAnexar((atual) => [...atual, arquivo]);
  }

  function onTirarEvidenciaParaAnexar(indice: number) {
    setEvidenciasParaAnexar((atual) => atual.filter((_, i) => i !== indice));
  }

  async function onLancarTratamento(e: FormEvent) {
    e.preventDefault();
    setErroTratamento(null);
    setLancandoTratamento(true);
    try {
      // A hora digitada vale no fuso em que o motorista estava
      // naquele momento (não o do computador do gestor nem o de hoje).
      const fusoDoAjuste = resolverFusoDoAjuste(timestampEvento, registros);
      const novoTratamento = await createTratamento(motoristaId, {
        tipoEvento,
        timestampEvento: new Date(fusoDoAjuste.instanteMs).toISOString(),
        motivo,
        registroReferenciaId: registroReferenciaId || undefined,
        fusoOffsetMin: fusoDoAjuste.doMotorista
          ? fusoDoAjuste.offsetMin
          : undefined,
      });

      // Evidências escolhidas no formulário sobem logo em
      // seguida, já vinculadas a este tratamento recém-criado , o
      // motorista/gestor não precisa mais achar a linha na tabela
      // depois pra anexar. Se alguma falhar, o tratamento já foi
      // lançado (não tem como desfazer só por causa da evidência), mas
      // o aviso deixa claro quantas não subiram.
      let falhasEvidencia = 0;
      for (const arquivo of evidenciasParaAnexar) {
        try {
          await anexarEvidenciaTratamento(
            motoristaId,
            novoTratamento.id,
            arquivo,
          );
        } catch {
          falhasEvidencia++;
        }
      }

      setMotivo("");
      setRegistroReferenciaId("");
      setEvidenciasParaAnexar([]);
      await onAtualizar();

      if (falhasEvidencia > 0) {
        setErroTratamento(
          `Tratamento lançado, mas ${falhasEvidencia} evidência(s) não subiram. Confira sua internet e lance um novo tratamento anexando de novo se precisar da prova.`,
        );
      }
    } catch (erro) {
      // Mostra o motivo real devolvido pelo servidor (ex.:
      // o tipo escolhido não encaixa na jornada do motorista naquele
      // horário), em vez de sempre culpar o tamanho do motivo.
      setErroTratamento(mensagemDoErro(erro, "Não foi possível lançar (motivo precisa ter pelo menos 10 caracteres)."));
    } finally {
      setLancandoTratamento(false);
    }
  }

  // Tratamentos: filtro por período (De/Até, pelo horário do
  // ajuste), ordenação, "mostrar N por vez" (100 abre popup) e exportação do
  // que está filtrado.
  const listaTratamentos = useListaPaginada(
    tratamentos,
    (t) => t.timestampEvento,
  );

  function linhasRelatorioTratamentos(): string[][] {
    return listaTratamentos.itensFiltrados.map((t) => [
      t.tipoEvento,
      formatarRegistro(t.timestampEvento, t.fusoOffsetMin),
      t.motivo,
      t.usuario?.nome ?? t.usuarioId,
      new Date(t.createdAt).toLocaleString("pt-BR"),
      String(t.evidencias?.length ?? 0),
    ]);
  }
  const CABECALHOS_RELATORIO_TRATAMENTOS = [
    "Evento",
    "Horário do ajuste",
    "Motivo",
    "Lançado por",
    "Lançado em",
    "Evidências",
  ];
  function rotuloPeriodoTratamentos() {
    const { dataInicio, dataFim } = listaTratamentos;
    if (!dataInicio && !dataFim) return "todos os tratamentos";
    const f = (d: string) =>
      new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR");
    return `${dataInicio ? f(dataInicio) : "início"} a ${dataFim ? f(dataFim) : "hoje"}`;
  }
  function onBaixarCsvTratamentos() {
    baixarCsvTabela(
      `tratamentos-ponto-${motorista?.nome ?? motoristaId}.xlsx`.replace(
        /\s+/g,
        "-",
      ),
      CABECALHOS_RELATORIO_TRATAMENTOS,
      linhasRelatorioTratamentos(),
      {
        titulo: `Tratamentos de ponto - ${motorista?.nome ?? ""}`,
        subtitulo: `Período: ${rotuloPeriodoTratamentos()}`,
      },
    );
  }
  function onImprimirTratamentos() {
    imprimirTabela(
      `Tratamentos de ponto - ${motorista?.nome ?? ""}`,
      `Período: ${rotuloPeriodoTratamentos()}`,
      CABECALHOS_RELATORIO_TRATAMENTOS,
      linhasRelatorioTratamentos(),
    );
  }

  // Pedido do usuário: "deixe os [registros] que chegou
  // por último como o primeiro da listagem". `sequencial` é a ordem
  // real de chegada no ledger WORM (ver registros-jornada.service.ts),
  // critério melhor que `timestampEvento` (que é só o relógio do
  // aparelho no momento do evento, não quando ele de fato chegou/foi
  // processado no servidor).
  const registrosOrdenados = [...registros].sort(
    (a, b) => b.sequencial - a.sequencial,
  );


  return (
    <>
      <div className="card" ref={cardTratamentoRef}>
        <h3 style={{ marginTop: 0 }}>Tratamento de ponto</h3>
        {veioParaEncerrarJornada && (
          <p
            style={{
              fontSize: 13,
              color: "#b91c1c",
              fontWeight: 600,
              border: "1px solid #fca5a5",
              borderRadius: 6,
              padding: 8,
            }}
          >
            Esta jornada está aberta há mais de 14h. Para encerrá-la, deixe o
            evento "FIM_JORNADA", informe o horário em que o motorista realmente
            terminou, escreva a justificativa e anexe a evidência.
          </p>
        )}
        <p style={{ fontSize: 13, color: "#000000" }}>
          Lançado pelo RH/gestor quando o motorista esquece de bater um evento.
          Não altera nenhum registro, é só informativo, entra na conferência da
          folha de ponto.
        </p>
        <LancarJornadaInteira
          motoristaId={motoristaId}
          registros={registros}
          dataInicial={dataParaLancarJornada}
          abrirInicialmente={veioParaLancarJornada}
          onLancado={onAtualizar}
          funcao={motorista?.funcao}
        />
        <p style={{ fontSize: 13, fontWeight: 600, margin: "8px 0 0" }}>
          Ou lance um evento isolado:
        </p>
        <form onSubmit={onLancarTratamento}>
          <label>Evento</label>
          <select
            value={tipoEvento}
            onChange={(e) => setTipoEvento(e.target.value as TipoEvento)}
          >
            {/* Só os eventos da função do colaborador. */}
            {tiposEventoDaFuncao(motorista?.funcao).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <label>Registro de referência (opcional)</label>
          <select
            value={registroReferenciaId}
            onChange={(e) => {
              const id = e.target.value;
              setRegistroReferenciaId(id);
              // Sugere o horário do registro escolhido como ponto
              // de partida (o gestor ainda pode ajustar) em vez de deixar
              // "Horário considerado" do jeito que estava (frequentemente
              // vazio ou com "agora", que nunca corrige nada , ver comentário
              // de formatarParaInputDatetimeLocal acima).
              const registro = registros.find((r) => r.id === id);
              if (registro) {
                setTimestampEvento(
                  paraInputNoOffset(
                    registro.timestampEvento,
                    registro.fusoOffsetMin ?? offsetDoNavegador(),
                  ),
                );
              }
            }}
          >
            <option value="">Nenhum</option>
            {registrosOrdenados.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.sequencial} · {r.tipoEvento} ·{" "}
                {formatarRegistro(r.timestampEvento, r.fusoOffsetMin)}
              </option>
            ))}
          </select>
          {registroReferenciaId && (
            <p style={{ fontSize: 12, color: "#000000", marginTop: -4 }}>
              "Horário considerado" foi sugerido a partir do registro escolhido.
              Ajuste os minutos/segundos pro horário real que este evento
              deveria ter, se precisar. Isso NÃO altera o registro original (ele
              é permanente); só adiciona este ajuste à conferência da folha.
            </p>
          )}
          <label>Horário considerado</label>
          <input
            type="datetime-local"
            value={timestampEvento}
            onChange={(e) => setTimestampEvento(e.target.value)}
            required
          />
          {timestampEvento && (
            <p style={{ fontSize: 12, color: "#000000", marginTop: -4 }}>
              {(() => {
                const f = resolverFusoDoAjuste(timestampEvento, registros);
                return f.doMotorista
                  ? `Horário no fuso em que o motorista estava nesse momento (${rotuloUtc(f.offsetMin)}), não o do seu computador.`
                  : `Horário no fuso do seu computador (${rotuloUtc(f.offsetMin)}); o motorista ainda não tem ponto com fuso registrado.`;
              })()}
            </p>
          )}
          <label>Motivo (mínimo 10 caracteres)</label>
          <textarea
            maxLength={400}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            required
            minLength={10}
          />

          {/* Pedido do usuário: anexar evidência (adicionar/
              tirar) acontece AQUI, junto do lançamento , depois de
              lançado, o tratamento só permite abrir/ver a imagem (ver
              tabela abaixo, sem opção de anexar nem remover). */}
          <label>
            Evidências (opcional, até {MAXIMO_EVIDENCIAS_POR_TRATAMENTO})
          </label>
          {evidenciasParaAnexar.length > 0 && (
            <ul style={{ margin: "4px 0", paddingLeft: 18, fontSize: 13 }}>
              {evidenciasParaAnexar.map((arquivo, indice) => (
                <li
                  key={`${arquivo.name}-${indice}`}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  {arquivo.name}
                  <button
                    type="button"
                    className="secondary"
                    style={{ fontSize: 11, padding: "2px 6px" }}
                    onClick={() => onTirarEvidenciaParaAnexar(indice)}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          {evidenciasParaAnexar.length < MAXIMO_EVIDENCIAS_POR_TRATAMENTO && (
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
              onChange={(e) => {
                onEscolherEvidenciaParaAnexar(e.target.files?.[0]);
                e.target.value = "";
              }}
              style={{ fontSize: 12 }}
            />
          )}

          <p style={{ fontSize: 12, color: "#000000", margin: "4px 0" }}>
            Evidências: somente <strong>imagens</strong> (JPG, PNG, WEBP ou
            HEIC/HEIF, o formato das fotos do iPhone), até 25MB cada. PDF e
            outros arquivos não são aceitos, tire um print ou uma foto e anexe a
            imagem. HEIC não aparece na miniatura em alguns navegadores, mas é
            salvo normalmente e pode ser baixado.
          </p>
          {erroTratamento && <p className="error-text">{erroTratamento}</p>}
          <button type="submit" disabled={lancandoTratamento}>
            {lancandoTratamento ? "Lançando..." : "Lançar tratamento"}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 16,
            alignItems: "center",
          }}
        >
          <button
            type="button"
            className="secondary"
            style={{ fontSize: 13 }}
            disabled={listaTratamentos.itensFiltrados.length === 0}
            onClick={onBaixarCsvTratamentos}
          >
            Baixar relatório (CSV)
          </button>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: 13 }}
            disabled={listaTratamentos.itensFiltrados.length === 0}
            onClick={onImprimirTratamentos}
          >
            Imprimir / PDF
          </button>
          <span style={{ fontSize: 12, color: "#000000" }}>
            O relatório segue o período filtrado (agora:{" "}
            {rotuloPeriodoTratamentos()}).
          </span>
        </div>
        <ControlesListaPaginada
          ordem={listaTratamentos.ordem}
          onAlternarOrdem={listaTratamentos.alternarOrdem}
          qtdPorPagina={listaTratamentos.qtdPorPagina}
          onMudarQtdPorPagina={listaTratamentos.mudarQtdPorPagina}
          pagina={listaTratamentos.pagina}
          totalPaginas={listaTratamentos.totalPaginas}
          popupAberto={listaTratamentos.popupAberto}
          onAbrirPopup={listaTratamentos.abrirPopup}
          onFecharPopup={listaTratamentos.fecharPopup}
          onSelecionarPagina={listaTratamentos.irParaPagina}
          filtroData={{
            dataInicio: listaTratamentos.dataInicio,
            onDataInicio: listaTratamentos.setDataInicio,
            dataFim: listaTratamentos.dataFim,
            onDataFim: listaTratamentos.setDataFim,
            rotulo: "horário do ajuste",
          }}
          tituloPopup="Tratamentos de ponto"
        >
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Horário</th>
                <th>Motivo</th>
                <th>Lançado por</th>
                <th>Quando</th>
                <th>Evidências (prova do fechamento)</th>
              </tr>
            </thead>
            <tbody>
              {listaTratamentos.itensExibidos.map((t) => (
                <tr key={t.id}>
                  <td>{t.tipoEvento}</td>
                  <td>
                    {formatarRegistro(t.timestampEvento, t.fusoOffsetMin)}
                  </td>
                  <td style={{ maxWidth: 240 }}>
                    <TextoLongo
                      texto={t.motivo}
                      titulo="Motivo do tratamento"
                    />
                  </td>
                  <td>{t.usuario?.nome ?? t.usuarioId}</td>
                  <td>{new Date(t.createdAt).toLocaleString("pt-BR")}</td>
                  <td>
                    {/* Pedido do usuário: depois de lançado, evidência
                      é só pra abrir/ver (sem `remover`, sem input de anexar ,
                      isso agora só acontece no formulário, antes de lançar). */}
                    <EvidenciasAnexo
                      evidencias={t.evidencias ?? []}
                      obterUrl={(evidenciaId) =>
                        obterUrlEvidenciaTratamento(motoristaId, evidenciaId)
                      }
                      baixar={(evidenciaId, nomeArquivo) =>
                        baixarEvidenciaTratamento(
                          motoristaId,
                          evidenciaId,
                          nomeArquivo,
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
              {listaTratamentos.itensFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ color: "#000000" }}>
                    {tratamentos.length === 0
                      ? "Nenhum tratamento lançado."
                      : "Nenhum tratamento no período filtrado."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ControlesListaPaginada>
      </div>

    </>
  );
}
