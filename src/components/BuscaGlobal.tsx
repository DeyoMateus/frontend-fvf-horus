import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarColaboradoresParaSeletor } from "../api/motoristas";
import type { Motorista } from "../api/types";

interface ItemTela {
  to: string;
  label: string;
}

interface Resultado {
  chave: string;
  titulo: string;
  detalhe: string;
  to: string;
}

const LIMITE_RESULTADOS = 8;

/** Compara sem acento e sem diferenciar maiúsculas ("joao" acha "João"). */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Busca global do painel (Ctrl+K ou o botão ao lado do sino). Leva direto a uma
 * tela do menu ou à ficha de um colaborador, por nome ou CPF. A lista de colaboradores é a
 * mesma dos seletores (já filtrada pelo grupo no servidor) e só é pedida ao abrir a busca.
 */
export function BuscaGlobal({ telas }: { telas: ItemTela[] }) {
  const navigate = useNavigate();
  const [aberta, setAberta] = useState(false);
  const [termo, setTermo] = useState("");
  const [selecionado, setSelecionado] = useState(0);
  const [colaboradores, setColaboradores] = useState<Motorista[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberta((a) => !a);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  useEffect(() => {
    if (!aberta) return;
    setTermo("");
    setSelecionado(0);
    inputRef.current?.focus();
    let ativo = true;
    listarColaboradoresParaSeletor()
      .then((lista) => ativo && setColaboradores(lista))
      .catch(() => ativo && setColaboradores([]));
    return () => {
      ativo = false;
    };
  }, [aberta]);

  const resultados = useMemo<Resultado[]>(() => {
    const t = normalizar(termo.trim());
    const digitos = termo.replace(/\D/g, "");
    const deTelas = telas
      .filter((tela) => !t || normalizar(tela.label).includes(t))
      .map((tela) => ({ chave: `tela:${tela.to}`, titulo: tela.label, detalhe: "Tela", to: tela.to }));
    if (!t) return deTelas.slice(0, LIMITE_RESULTADOS);
    const dePessoas = colaboradores
      .filter(
        (c) =>
          normalizar(c.nome).includes(t) ||
          (digitos.length >= 3 && c.cpf.replace(/\D/g, "").includes(digitos)),
      )
      .map((c) => ({
        chave: `colaborador:${c.id}`,
        titulo: c.nome,
        detalhe: c.funcao === "AJUDANTE" ? "Ajudante" : "Motorista",
        to: `/motoristas/${c.id}`,
      }));
    return [...dePessoas, ...deTelas].slice(0, LIMITE_RESULTADOS);
  }, [termo, telas, colaboradores]);

  function abrir(r: Resultado | undefined) {
    if (!r) return;
    setAberta(false);
    navigate(r.to);
  }

  function aoTeclarNoCampo(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") setAberta(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelecionado((s) => Math.min(s + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelecionado((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      abrir(resultados[selecionado]);
    }
  }

  return (
    <>
      <button
        type="button"
        className="busca-global-botao"
        onClick={() => setAberta(true)}
        aria-label="Buscar tela ou colaborador (Ctrl+K)"
        title="Buscar tela ou colaborador (Ctrl+K)"
      >
        Buscar <kbd>Ctrl K</kbd>
      </button>
      {aberta && (
        <div className="busca-global-fundo" onClick={() => setAberta(false)}>
          <div
            className="busca-global-caixa"
            role="dialog"
            aria-modal="true"
            aria-label="Busca global"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              className="busca-global-campo"
              placeholder="Nome ou CPF do colaborador, ou nome da tela"
              value={termo}
              maxLength={60}
              onChange={(e) => {
                setTermo(e.target.value);
                setSelecionado(0);
              }}
              onKeyDown={aoTeclarNoCampo}
              aria-label="Buscar"
            />
            <ul className="busca-global-lista" role="listbox">
              {resultados.map((r, i) => (
                <li
                  key={r.chave}
                  role="option"
                  aria-selected={i === selecionado}
                  className={i === selecionado ? "busca-global-item ativo" : "busca-global-item"}
                  onMouseEnter={() => setSelecionado(i)}
                  onClick={() => abrir(r)}
                >
                  <span>{r.titulo}</span>
                  <span className="busca-global-detalhe">{r.detalhe}</span>
                </li>
              ))}
              {resultados.length === 0 && (
                <li className="busca-global-vazio">
                  Nada encontrado. Confira o nome ou digite ao menos 3 números do CPF.
                </li>
              )}
            </ul>
            <div className="busca-global-rodape">↑ ↓ para escolher · Enter para abrir · Esc para fechar</div>
          </div>
        </div>
      )}
    </>
  );
}
