import { TituloComDownload } from "../components/MenuDownload";
import { DicaAoPassar } from "../components/DicaAoPassar";
import { inicioDoDiaLocalIso, fimDoDiaLocalIso } from "../utils/fusoHorario";
import { useEffect, useRef, useState } from "react";
import { useSelecao } from "../hooks/useSelecao";
import { baixarAfd, baixarAfdAssinado, listEmpresas } from "../api/empresas";
import {
  baixarRelatorioEsperaPdf,
  listarRelatorioEspera,
} from "../api/relatorioEspera";
import type { ItemRelatorioEspera } from "../api/relatorioEspera";
import { baixarEspelhosRepPFiscalizacaoPdf } from "../api/fechamentoFiscal";
import { useColaboradores } from "../hooks/useColaboradores";
import type { Empresa, Motorista } from "../api/types";
import { minParaHoras } from "../utils/formatarDuracao";
import { dataLocalIso } from '../utils/mascaras';

function hoje(): string {
  return dataLocalIso(new Date());
}
function inicioDoMes(): string {
  const d = new Date();
  return dataLocalIso(new Date(d.getFullYear(), d.getMonth(), 1));
}

/**
 * "Documentos para fiscalização" , pedido do usuário:
 *
 * 1. Relatório de espera (antes "dossiê de cobrança", renomeado na rodada 732): o motor
 *    já detecta a espera em carga/descarga acima do tempo configurado pela empresa e guarda os
 *    dados de apoio (ver JornadaLegalService), mas não havia como
 *    extrair isso. Agora tem: preview na tela + PDF.
 * 2. "Caso vá um fiscal na empresa ele precisa dos documentos
 *    assinados com os certificados" , o Espelho de Ponto Eletrônico
 *    (REP-P) já existia motorista por motorista; aqui é a extração da
 *    frota inteira de uma vez, e o AFD oficial (Portaria 671/2021),
 *    que já existia no backend mas nunca tinha um botão no painel.
 */
export function FiscalizacaoPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const motoristas = useColaboradores();
  const [inicio, setInicio] = useState(inicioDoMes());
  const [fim, setFim] = useState(hoje());

  const [empresaId, setEmpresaId] = useState("");
  const [gerandoAfd, setGerandoAfd] = useState(false);
  const [erroAfd, setErroAfd] = useState<string | null>(null);
  const [avisoAfd, setAvisoAfd] = useState<string | null>(null);

  const [esperas, setEsperas] = useState<ItemRelatorioEspera[]>([]);
  const [carregandoEspera, setCarregandoEspera] = useState(false);
  const [gerandoEsperaPdf, setGerandoEsperaPdf] = useState(false);
  const [erroEspera, setErroEspera] = useState<string | null>(null);

  const { selecionados: selecionadosRepP, alternar: alternarMotoristaRepP } = useSelecao();
  const [gerandoRepP, setGerandoRepP] = useState(false);
  const [erroRepP, setErroRepP] = useState<string | null>(null);

  useEffect(() => {
    listEmpresas()
      .then((lista) => {
        setEmpresas(lista);
        setEmpresaId((atual) => atual || (lista.length > 0 ? lista[0].id : ""));
      })
      .catch(() => {});
  }, []);

  // Pedido do usuário: trocar o período (início/fim) não
  // pode "piscar" trocando a contagem por "Carregando…" toda vez , só
  // a carga INICIAL mostra esse texto; mudanças de período depois só
  // atualizam a contagem no lugar (mesmo padrão já usado em
  // MotoristaDetailPage.tsx/AuditoriaPage.tsx).
  const primeiraCargaEsperaFeita = useRef(false);

  async function carregarEsperas() {
    if (!primeiraCargaEsperaFeita.current) setCarregandoEspera(true);
    setErroEspera(null);
    try {
      const lista = await listarRelatorioEspera(
        inicioDoDiaLocalIso(inicio),
        fimDoDiaLocalIso(fim),
      );
      setEsperas(lista);
    } catch {
      setErroEspera("Não foi possível carregar o relatório de espera agora.");
    } finally {
      setCarregandoEspera(false);
      primeiraCargaEsperaFeita.current = true;
    }
  }

  useEffect(() => {
    carregarEsperas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicio, fim]);

  async function onBaixarAfd() {
    if (!empresaId) return;
    setErroAfd(null);
    setGerandoAfd(true);
    try {
      await baixarAfd(
        empresaId,
        inicioDoDiaLocalIso(inicio),
        fimDoDiaLocalIso(fim),
      );
    } catch {
      setErroAfd(
        "Não foi possível gerar o AFD (confira se o CNPJ tem o registro INPI/AFD cadastrado, veja Empresas).",
      );
    } finally {
      setGerandoAfd(false);
    }
  }

  async function onBaixarAfdAssinado() {
    if (!empresaId) return;
    setErroAfd(null);
    setAvisoAfd(null);
    setGerandoAfd(true);
    try {
      const aviso = await baixarAfdAssinado(
        empresaId,
        inicioDoDiaLocalIso(inicio),
        fimDoDiaLocalIso(fim),
      );
      setAvisoAfd(aviso);
    } catch (err) {
      const codigo = (err as { response?: { data?: { codigo?: string } } })?.response?.data?.codigo;
      setErroAfd(
        codigo === "CERTIFICADO_FVF_NAO_CONFIGURADO"
          ? "O certificado de assinatura da FVF ainda não está configurado neste ambiente. Baixe o AFD sem assinatura."
          : "Não foi possível gerar o AFD assinado (confira o registro INPI/AFD do CNPJ, veja Empresas).",
      );
    } finally {
      setGerandoAfd(false);
    }
  }

  async function onBaixarEsperaPdf() {
    setErroEspera(null);
    setGerandoEsperaPdf(true);
    try {
      await baixarRelatorioEsperaPdf(
        inicioDoDiaLocalIso(inicio),
        fimDoDiaLocalIso(fim),
      );
    } catch {
      setErroEspera("Não foi possível gerar o PDF agora.");
    } finally {
      setGerandoEsperaPdf(false);
    }
  }


  async function onBaixarRepPLote() {
    setErroRepP(null);
    setGerandoRepP(true);
    try {
      await baixarEspelhosRepPFiscalizacaoPdf(
        inicioDoDiaLocalIso(inicio),
        fimDoDiaLocalIso(fim),
        selecionadosRepP.size === 0 ? null : Array.from(selecionadosRepP),
      );
    } catch {
      setErroRepP(
        "Não foi possível gerar os espelhos agora (período muito longo pode demorar, tente um intervalo menor).",
      );
    } finally {
      setGerandoRepP(false);
    }
  }

  return (
    <div>
      <h2>
        Documentos para fiscalização
        <DicaAoPassar label="Sobre os documentos para fiscalização">
          Extrações pensadas para quando um fiscal do trabalho chega na
          empresa, ou para faturar o tempo de espera em carga/descarga do
          embarcador. Os arquivos oficiais seguem o leiaute exigido, mas ainda
          não levam a assinatura digital qualificada (ICP-Brasil), que depende
          do certificado da empresa.
        </DicaAoPassar>
      </h2>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <label>
          Início
          <br />
          <input
            type="date"
            value={inicio}
            max={fim}
            onChange={(e) => setInicio(e.target.value)}
          />
        </label>
        <label>
          Fim
          <br />
          <input
            type="date"
            value={fim}
            min={inicio}
            max={hoje()}
            onChange={(e) => setFim(e.target.value)}
          />
        </label>
      </div>

      {/* ===== AFD oficial ===== */}
      <div className="card" style={{ marginBottom: 16 }}>
        <TituloComDownload
          opcoes={[
            { rotulo: "Baixar AFD (.txt)", onClick: onBaixarAfd, carregando: gerandoAfd, desabilitado: !empresaId },
            {
              rotulo: "Baixar AFD assinado (.p7s)",
              onClick: onBaixarAfdAssinado,
              desabilitado: gerandoAfd || !empresaId,
              dica: "Baixa o AFD e a assinatura digital (.p7s) juntos",
            },
          ]}
        >
          <h3 style={{ marginTop: 0 }}>AFD oficial (Portaria MTP 671/2021)</h3>
        </TituloComDownload>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Arquivo Fonte de Dados (arquivo de texto) no leiaute oficial exigido
          pela fiscalização. A versão assinada baixa o arquivo e a assinatura digital (.p7s) da FVF juntos; o arquivo e o .p7s devem ser entregues lado a lado. É o documento que a Portaria 671/2021 pede diretamente.
          Sempre por CNPJ.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {empresas.length > 1 && (
            <label>
              CNPJ
              <br />
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
              >
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.razaoSocial} ({emp.cnpj})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {avisoAfd && <p style={{ color: "#b45309", fontSize: 13 }}>{avisoAfd}</p>}
        {erroAfd && <p style={{ color: "#b91c1c", fontSize: 13 }}>{erroAfd}</p>}
      </div>

      {/* ===== Relatório de Espera ===== */}
      <div className="card" style={{ marginBottom: 16 }}>
        <TituloComDownload
          opcoes={[
            { rotulo: "Baixar relatório de espera (PDF)", onClick: onBaixarEsperaPdf, carregando: gerandoEsperaPdf },
          ]}
        >
          <h3 style={{ marginTop: 0 }}>Relatório de espera em carga/descarga</h3>
        </TituloComDownload>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Esperas em carga/descarga que passaram do tempo configurado pela
          empresa, com data, horários e duração. É um registro que a empresa
          pode apresentar se entender necessário.
        </p>
        {carregandoEspera ? (
          <p style={{ fontSize: 13 }}>Carregando…</p>
        ) : (
          <p style={{ fontSize: 13 }}>
            <strong>{esperas.length}</strong> ocorrência(s) neste período
            {esperas.length > 0 && (
              <>
                , no total de{" "}
                {minParaHoras(esperas.reduce((s, d) => s + d.minutosTotais, 0))}{" "}
                de espera acima do limiar
              </>
            )}
            .
          </p>
        )}
        {erroEspera && (
          <p style={{ color: "#b91c1c", fontSize: 13 }}>{erroEspera}</p>
        )}
      </div>

      {/* ===== Espelhos REP-P assinados, em lote ===== */}
      <div className="card">
        <TituloComDownload
          opcoes={[
            { rotulo: "Extrair espelhos (PDF)", onClick: onBaixarRepPLote, carregando: gerandoRepP },
          ]}
        >
          <h3 style={{ marginTop: 0 }}>
            Espelhos de Ponto (REP-P) da frota
          </h3>
        </TituloComDownload>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Cada espelho traz a cadeia de hash do período e a assinatura interna
          do sistema em cada registro. Ainda não tem a assinatura digital
          qualificada (ICP-Brasil). Nenhum marcado abaixo =
          frota inteira (todos os motoristas ativos).
        </p>
        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>
          {selecionadosRepP.size === 0
            ? `Frota inteira: ${motoristas.length}`
            : `${selecionadosRepP.size} selecionado(s)`}
        </div>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            maxHeight: 180,
            overflowY: "auto",
            padding: 8,
            marginBottom: 12,
          }}
        >
          {motoristas.length === 0 && (
            <p style={{ color: "#000000", fontSize: 13 }}>
              Nenhum motorista encontrado.
            </p>
          )}
          {motoristas.map((m) => (
            <label
              key={m.id}
              style={{ display: "block", padding: "2px 0", fontSize: 13 }}
            >
              <input
                type="checkbox"
                checked={selecionadosRepP.has(m.id)}
                onChange={() => alternarMotoristaRepP(m.id)}
              />{" "}
              {m.nome}
            </label>
          ))}
        </div>
        {erroRepP && (
          <p style={{ color: "#b91c1c", fontSize: 13 }}>{erroRepP}</p>
        )}
      </div>
    </div>
  );
}
