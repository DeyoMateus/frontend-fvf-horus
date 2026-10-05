import { useEffect, useRef, useState } from "react";
import { baixarAfd, listEmpresas } from "../api/empresas";
import {
  baixarDossieCobrancaPdf,
  listarDossieCobranca,
} from "../api/dossieCobranca";
import type { ItemDossieCobranca } from "../api/dossieCobranca";
import { baixarEspelhosRepPFiscalizacaoPdf } from "../api/fechamentoFiscal";
import { listMotoristas } from "../api/motoristas";
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
 * "Documentos para fiscalização" (Rodada 66) , pedido do usuário:
 *
 * 1. "em fechamento precisa do recurso de extração do dossiê de
 *    cobrança" , o motor de limites legais já detecta o tempo de
 *    espera em carga/descarga acima do limiar legal de 5h e guarda os
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
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [inicio, setInicio] = useState(inicioDoMes());
  const [fim, setFim] = useState(hoje());

  const [empresaId, setEmpresaId] = useState("");
  const [gerandoAfd, setGerandoAfd] = useState(false);
  const [erroAfd, setErroAfd] = useState<string | null>(null);

  const [dossies, setDossies] = useState<ItemDossieCobranca[]>([]);
  const [carregandoDossie, setCarregandoDossie] = useState(false);
  const [gerandoDossiePdf, setGerandoDossiePdf] = useState(false);
  const [erroDossie, setErroDossie] = useState<string | null>(null);

  const [selecionadosRepP, setSelecionadosRepP] = useState<Set<string>>(
    new Set(),
  );
  const [gerandoRepP, setGerandoRepP] = useState(false);
  const [erroRepP, setErroRepP] = useState<string | null>(null);

  useEffect(() => {
    listEmpresas()
      .then((lista) => {
        setEmpresas(lista);
        setEmpresaId((atual) => atual || (lista.length > 0 ? lista[0].id : ""));
      })
      .catch(() => {});
    listMotoristas()
      .then((r) => setMotoristas(r.dados))
      .catch(() => {});
  }, []);

  // Rodada 99 , pedido do usuário: trocar o período (início/fim) não
  // pode "piscar" trocando a contagem por "Carregando…" toda vez , só
  // a carga INICIAL mostra esse texto; mudanças de período depois só
  // atualizam a contagem no lugar (mesmo padrão já usado em
  // MotoristaDetailPage.tsx/AuditoriaPage.tsx).
  const primeiraCargaDossieFeita = useRef(false);

  async function carregarDossies() {
    if (!primeiraCargaDossieFeita.current) setCarregandoDossie(true);
    setErroDossie(null);
    try {
      const lista = await listarDossieCobranca(
        new Date(inicio).toISOString(),
        new Date(`${fim}T23:59:59.999Z`).toISOString(),
      );
      setDossies(lista);
    } catch {
      setErroDossie("Não foi possível carregar o dossiê agora.");
    } finally {
      setCarregandoDossie(false);
      primeiraCargaDossieFeita.current = true;
    }
  }

  useEffect(() => {
    carregarDossies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicio, fim]);

  async function onBaixarAfd() {
    if (!empresaId) return;
    setErroAfd(null);
    setGerandoAfd(true);
    try {
      await baixarAfd(
        empresaId,
        new Date(inicio).toISOString(),
        new Date(`${fim}T23:59:59.999Z`).toISOString(),
      );
    } catch {
      setErroAfd(
        "Não foi possível gerar o AFD (confira se o CNPJ tem o registro INPI/AFD cadastrado, veja Empresas).",
      );
    } finally {
      setGerandoAfd(false);
    }
  }

  async function onBaixarDossiePdf() {
    setErroDossie(null);
    setGerandoDossiePdf(true);
    try {
      await baixarDossieCobrancaPdf(
        new Date(inicio).toISOString(),
        new Date(`${fim}T23:59:59.999Z`).toISOString(),
      );
    } catch {
      setErroDossie("Não foi possível gerar o PDF agora.");
    } finally {
      setGerandoDossiePdf(false);
    }
  }

  function alternarMotoristaRepP(id: string) {
    setSelecionadosRepP((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function onBaixarRepPLote() {
    setErroRepP(null);
    setGerandoRepP(true);
    try {
      await baixarEspelhosRepPFiscalizacaoPdf(
        new Date(inicio).toISOString(),
        new Date(`${fim}T23:59:59.999Z`).toISOString(),
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
      <h2>Documentos para fiscalização</h2>
      <p style={{ fontSize: 13, color: "#000000", marginTop: -8 }}>
        Extrações pensadas para quando um fiscal do trabalho chega na empresa,
        ou para faturar o tempo de espera em carga/descarga do embarcador, tudo
        assinado digitalmente ou no leiaute oficial exigido.
      </p>

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
        <h3 style={{ marginTop: 0 }}>AFD oficial (Portaria MTP 671/2021)</h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Arquivo Fonte de Dados no leiaute binário oficial exigido pela
          fiscalização. É o documento que a Portaria 671/2021 pede diretamente.
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
          <button onClick={onBaixarAfd} disabled={gerandoAfd || !empresaId}>
            {gerandoAfd ? "Gerando…" : "Baixar AFD (.txt)"}
          </button>
        </div>
        {erroAfd && <p style={{ color: "#b91c1c", fontSize: 13 }}>{erroAfd}</p>}
      </div>

      {/* ===== Dossiê de Cobrança ===== */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Dossiê de cobrança do tempo de espera</h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Ocorrências em que a espera em carga/descarga passou de 5h no mesmo
          dia (Lei 13.103/2015, art. 235-A §9º). Pode ser cobrado do
          embarcador/contratante do frete. Valor a cobrar não é calculado aqui
          (preencher na conferência com o faturamento).
        </p>
        {carregandoDossie ? (
          <p style={{ fontSize: 13 }}>Carregando…</p>
        ) : (
          <p style={{ fontSize: 13 }}>
            <strong>{dossies.length}</strong> ocorrência(s) neste período
            {dossies.length > 0 && (
              <>
                , no total de{" "}
                {minParaHoras(dossies.reduce((s, d) => s + d.minutosTotais, 0))}{" "}
                de espera acima do limiar
              </>
            )}
            .
          </p>
        )}
        <button onClick={onBaixarDossiePdf} disabled={gerandoDossiePdf}>
          {gerandoDossiePdf ? "Gerando…" : "Baixar dossiê de cobrança (PDF)"}
        </button>
        {erroDossie && (
          <p style={{ color: "#b91c1c", fontSize: 13 }}>{erroDossie}</p>
        )}
      </div>

      {/* ===== Espelhos REP-P assinados, em lote ===== */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>
          Espelhos de Ponto (REP-P) assinados da frota
        </h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Cada espelho é assinado digitalmente com o certificado do próprio
          motorista e traz a cadeia de hash do período. Nenhum marcado abaixo =
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
        <button onClick={onBaixarRepPLote} disabled={gerandoRepP}>
          {gerandoRepP
            ? "Gerando… (pode levar um pouco para a frota inteira)"
            : "Extrair documentos assinados (PDF)"}
        </button>
        {erroRepP && (
          <p style={{ color: "#b91c1c", fontSize: 13 }}>{erroRepP}</p>
        )}
      </div>
    </div>
  );
}
