import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  obterCiencias,
  obterEncarregados,
  listarSolicitacoesTitular,
  responderSolicitacaoTitular,
  salvarEncarregado,
} from "../api/privacidade";
import type {
  CienciasPainel,
  EmpresaEncarregado,
  SolicitacaoTitularPainel,
  StatusSolicitacaoTitular,
} from "../api/privacidade";
import { useAuth } from "../context/AuthContext";

const TIPOS: Record<string, string> = {
  CONFIRMACAO_TRATAMENTO: "Confirmação de tratamento",
  ACESSO: "Acesso aos dados",
  CORRECAO: "Correção de dados",
  ANONIMIZACAO_ELIMINACAO: "Eliminação/anonimização",
  PORTABILIDADE: "Portabilidade",
  INFORMACAO_COMPARTILHAMENTO: "Informação sobre compartilhamento",
  REVOGACAO_CONSENTIMENTO: "Revogação de consentimento",
  REVISAO_DECISAO_AUTOMATIZADA: "Revisão de decisão automática",
  OPOSICAO: "Oposição ao tratamento",
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR") : "-";

/** Rodada 206 (LGPD): pedidos dos titulares, encarregado (DPO) e ciências. */
export function PrivacidadePainelPage() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.papel === "ADMIN";
  const [pedidos, setPedidos] = useState<SolicitacaoTitularPainel[]>([]);
  const [ciencias, setCiencias] = useState<CienciasPainel | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaEncarregado[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [p, c, e] = await Promise.all([
      listarSolicitacoesTitular(),
      obterCiencias(),
      obterEncarregados(),
    ]);
    setPedidos(p);
    setCiencias(c);
    setEmpresas(e);
    const primeira = e.find((x) => x.encarregadoNome);
    if (primeira) {
      setNome(primeira.encarregadoNome ?? "");
      setEmail(primeira.encarregadoEmail ?? "");
      setTelefone(primeira.encarregadoTelefone ?? "");
    }
  }, []);

  useEffect(() => {
    carregar().catch(() => setMsg("Erro ao carregar os dados."));
  }, [carregar]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    try {
      await salvarEncarregado({
        nome,
        email,
        telefone: telefone || undefined,
      });
      setMsg(
        nome || email || telefone
          ? "Encarregado salvo para todos os CNPJs do grupo."
          : "Sem encarregado: os pedidos ficam com o gestor.",
      );
      await carregar();
    } catch {
      setMsg("Não foi possível salvar. Confira nome, e-mail e telefone (+55...).");
    }
  }

  async function responder(id: string, status: StatusSolicitacaoTitular) {
    try {
      await responderSolicitacaoTitular(id, status, respostas[id] ?? "");
      await carregar();
    } catch {
      setMsg("Informe a resposta ao titular para concluir ou negar.");
    }
  }

  const semCiencia =
    ciencias?.motoristas.filter(
      (m) => !m.politicaEm || !m.termoGpsEm || !m.termoDadosEm,
    ) ?? [];

  return (
    <div>
      <h1>Privacidade (LGPD)</h1>
      {msg && <p>{msg}</p>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Encarregado pelo tratamento de dados (DPO)</h2>
        <p style={{ fontSize: 13 }}>
          <strong>Opcional.</strong> Se a empresa não tem uma pessoa só para
          isso, deixe em branco: os pedidos dos motoristas chegam ao gestor
          (sininho e esta tela). Quando preenchido, aparece para o motorista no
          aplicativo. Vale para os {empresas.length} CNPJ(s) do grupo.
        </p>
        {ehAdmin ? (
          <form onSubmit={salvar}>
            <label>Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} />
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} />
            <label>Telefone (+5511999998888)</label>
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} maxLength={16} />
            <button type="submit">{nome || email || telefone ? "Salvar" : "Salvar sem encarregado"}</button>
          </form>
        ) : (
          <p>Somente o ADMIN pode alterar. Atual: {nome || "não informado"}</p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Pedidos dos titulares (prazo legal: 15 dias)</h2>
        {pedidos.length === 0 && <p>Nenhum pedido.</p>}
        {pedidos.map((p) => {
          const aberto = p.status === "ABERTA" || p.status === "EM_ANALISE";
          return (
            <div key={p.id} style={{ borderTop: "1px solid #e5e7eb", padding: "10px 0" }}>
              <strong>{p.motorista.nome}</strong> , {TIPOS[p.tipo] ?? p.tipo}{" "}
              <em>({p.status})</em>
              {p.vencida && <strong style={{ color: "#b91c1c" }}> , PRAZO VENCIDO</strong>}
              <div style={{ fontSize: 13 }}>
                Aberto em {fmt(p.createdAt)} , prazo {fmt(p.prazoEm)}
              </div>
              {p.descricao && <div style={{ fontSize: 13 }}>"{p.descricao}"</div>}
              {aberto ? (
                <>
                  <textarea
                    placeholder="Resposta ao titular"
                    value={respostas[p.id] ?? ""}
                    onChange={(e) => setRespostas((r) => ({ ...r, [p.id]: e.target.value }))}
                    maxLength={2000}
                    style={{ width: "100%", minHeight: 60 }}
                  />
                  <button type="button" onClick={() => responder(p.id, "EM_ANALISE")}>Marcar em análise</button>{" "}
                  <button type="button" onClick={() => responder(p.id, "ATENDIDA")}>Atendido</button>{" "}
                  <button type="button" onClick={() => responder(p.id, "NEGADA_COM_JUSTIFICATIVA")}>Negar com justificativa</button>
                </>
              ) : (
                <div style={{ fontSize: 13 }}>Resposta: {p.resposta}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2>Ciência da política (versão {ciencias?.versao})</h2>
        <p style={{ fontSize: 13 }}>
          {semCiencia.length === 0
            ? "Todos os motoristas ativos deram ciência."
            : `${semCiencia.length} motorista(s) ainda sem ciência completa.`}
        </p>
        <table>
          <thead>
            <tr><th>Motorista</th><th>Política</th><th>Dados pessoais</th><th>Termo de GPS</th></tr>
          </thead>
          <tbody>
            {ciencias?.motoristas.map((m) => (
              <tr key={m.id}>
                <td>{m.nome}</td>
                <td>{fmt(m.politicaEm)}</td>
                <td>{fmt(m.termoDadosEm)}</td>
                <td>{fmt(m.termoGpsEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
