import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  MODULOS_DO_TOUR,
  PASSOS_DO_TOUR,
  type PassoDoTour,
} from "./passosDoTour";
import { localizarAlvo, retanguloDe, type Retangulo } from "./localizarAlvo";

// Rodada 264 , tour guiado do primeiro acesso (e botão "Refazer tour").
// Mostra, passo a passo, um balão com seta apontando para cada campo, com
// Próximo e Voltar. Abre sozinho no primeiro acesso de cada usuário e pode
// ser refeito pelo menu lateral ou pela tela de Configuração.

interface TourContextValue {
  iniciarTour: () => void;
  tourAtivo: boolean;
}

const TourContext = createContext<TourContextValue>({
  iniciarTour: () => {},
  tourAtivo: false,
});

export function useTour(): TourContextValue {
  return useContext(TourContext);
}

const PREFIXO_CHAVE = "fvfhorus.tourConcluido.v1.";
const PREFIXO_MODULOS = "fvfhorus.tourModulos.v1.";
const LARGURA_BALAO = 360;
// Espaço entre o campo destacado e o balão: cabe a seta grossa (fora do balão).
const FOLGA = 46;

function lerVisto(chave: string): boolean {
  try {
    return localStorage.getItem(chave) === "1";
  } catch {
    return true; // sem localStorage não dá para lembrar, então não incomoda
  }
}

function gravarVisto(chave: string) {
  try {
    localStorage.setItem(chave, "1");
  } catch {
    // sem armazenamento, o tour só volta a abrir se o usuário pedir
  }
}

function lerModulos(chave: string): string[] {
  try {
    const bruto = localStorage.getItem(chave);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function gravarModulos(chave: string, lista: string[]) {
  try {
    localStorage.setItem(chave, JSON.stringify(lista));
  } catch {
    // sem armazenamento, o progresso só vale enquanto a página estiver aberta
  }
}

function dormir(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function esperarAte<T>(
  fn: () => T | null | undefined | false,
  limiteMs: number,
  cancelado: () => boolean,
): Promise<T | null> {
  const fim = Date.now() + limiteMs;
  while (Date.now() < fim) {
    if (cancelado()) return null;
    const v = fn();
    if (v) return v;
    await dormir(100);
  }
  return null;
}

const ROTA_FICHA = /^\/motoristas\/[^/]+$/;

function acharBotaoVerDetalhes(): HTMLButtonElement | null {
  const b = Array.from(document.querySelectorAll("button")).find((x) =>
    (x.textContent ?? "").trim().toLowerCase().startsWith("ver detalhes"),
  );
  return (b as HTMLButtonElement) ?? null;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const chave = usuario ? `${PREFIXO_CHAVE}${usuario.sub}` : null;

  const chaveModulos = usuario ? `${PREFIXO_MODULOS}${usuario.sub}` : null;
  const ehAdmin = usuario?.papel === "ADMIN";

  const todosOsPassos = useMemo<PassoDoTour[]>(
    () => PASSOS_DO_TOUR.filter((p) => !p.somenteAdmin || ehAdmin),
    [ehAdmin],
  );
  const modulosVisiveis = useMemo(
    () => MODULOS_DO_TOUR.filter((m) => !m.somenteAdmin || ehAdmin),
    [ehAdmin],
  );

  const [moduloAtual, setModuloAtual] = useState<string | null>(null);
  const [seletor, setSeletor] = useState(false);
  const [concluidos, setConcluidos] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  // Passos do módulo escolhido (ou todos, quando a pessoa pede em sequência).
  const passos = useMemo<PassoDoTour[]>(
    () =>
      moduloAtual
        ? todosOsPassos.filter((p) => p.modulo === moduloAtual)
        : todosOsPassos,
    [todosOsPassos, moduloAtual],
  );

  useEffect(() => {
    setConcluidos(chaveModulos ? lerModulos(chaveModulos) : []);
  }, [chaveModulos]);

  const [ativo, setAtivo] = useState(false);
  const [indice, setIndice] = useState(0);
  const [semMotorista, setSemMotorista] = useState(false);
  const [retangulo, setRetangulo] = useState<Retangulo | null>(null);
  const [preparando, setPreparando] = useState(false);
  const direcao = useRef<1 | -1>(1);
  const elementosAlvo = useRef<HTMLElement[] | null>(null);

  const encerrar = useCallback(() => {
    setAtivo(false);
    setSeletor(false);
    setAviso(null);
    setRetangulo(null);
    elementosAlvo.current = null;
    if (chave) gravarVisto(chave);
  }, [chave]);

  // Abre a escolha de módulos (o tour é feito aos poucos, um módulo por vez).
  const iniciarTour = useCallback(() => {
    setAtivo(false);
    setRetangulo(null);
    elementosAlvo.current = null;
    setAviso(null);
    setSeletor(true);
  }, []);

  const iniciarModulo = useCallback((id: string | null) => {
    direcao.current = 1;
    setSemMotorista(false);
    setRetangulo(null);
    setModuloAtual(id);
    setIndice(0);
    setSeletor(false);
    setAviso(null);
    setAtivo(true);
  }, []);

  const concluirModulo = useCallback(() => {
    const ids = moduloAtual
      ? [moduloAtual]
      : modulosVisiveis.map((m) => m.id);
    const novos = Array.from(new Set([...concluidos, ...ids]));
    setConcluidos(novos);
    if (chaveModulos) gravarModulos(chaveModulos, novos);
    if (chave) gravarVisto(chave);
    const titulo = moduloAtual
      ? modulosVisiveis.find((m) => m.id === moduloAtual)?.titulo
      : null;
    setAviso(
      titulo
        ? `Módulo ${titulo} concluído. Escolha o próximo quando quiser, sem pressa.`
        : "Você viu o sistema inteiro. Parabéns!",
    );
    setAtivo(false);
    setRetangulo(null);
    elementosAlvo.current = null;
    setSeletor(true);
  }, [moduloAtual, modulosVisiveis, concluidos, chaveModulos, chave]);

  // Abre sozinho no primeiro acesso de cada usuário.
  useEffect(() => {
    if (!chave || lerVisto(chave)) return;
    const t = setTimeout(iniciarTour, 900);
    return () => clearTimeout(t);
  }, [chave, iniciarTour]);

  const passo = ativo ? passos[indice] : undefined;

  const irPara = useCallback(
    (delta: 1 | -1) => {
      direcao.current = delta;
      setIndice((i) => {
        let prox = i + delta;
        while (
          prox >= 0 &&
          prox < passos.length &&
          semMotorista &&
          passos[prox].detalheMotorista
        ) {
          prox += delta;
        }
        return prox;
      });
    },
    [passos, semMotorista],
  );

  const proximo = useCallback(() => {
    if (indice >= passos.length - 1) concluirModulo();
    else irPara(1);
  }, [indice, passos.length, concluirModulo, irPara]);

  const voltar = useCallback(() => {
    if (indice > 0) irPara(-1);
  }, [indice, irPara]);

  // Prepara o passo (navega, abre a ficha do motorista) e acha o alvo.
  useEffect(() => {
    if (!ativo || !passo) return;
    let cancelado = false;
    const foiCancelado = () => cancelado;

    (async () => {
      setPreparando(true);
      setRetangulo(null);
      elementosAlvo.current = null;

      if (passo.detalheMotorista) {
        if (!ROTA_FICHA.test(window.location.pathname)) {
          if (window.location.pathname !== "/motoristas") navigate("/motoristas");
          const botao = await esperarAte(
            () =>
              window.location.pathname === "/motoristas"
                ? acharBotaoVerDetalhes()
                : null,
            4000,
            foiCancelado,
          );
          if (cancelado) return;
          if (!botao) {
            // Nenhum motorista cadastrado , pula a parte da ficha.
            setSemMotorista(true);
            setPreparando(false);
            let prox = indice + direcao.current;
            while (
              prox >= 0 &&
              prox < passos.length &&
              passos[prox].detalheMotorista
            ) {
              prox += direcao.current;
            }
            if (prox >= passos.length) concluirModulo();
            else setIndice(Math.max(0, prox));
            return;
          }
          botao.click();
          await esperarAte(
            () => ROTA_FICHA.test(window.location.pathname),
            3000,
            foiCancelado,
          );
        }
      } else if (passo.rota && window.location.pathname !== passo.rota) {
        navigate(passo.rota);
        await esperarAte(
          () => window.location.pathname === passo.rota,
          2000,
          foiCancelado,
        );
      }
      if (cancelado) return;

      if (passo.alvo) {
        const els = await esperarAte(
          () => localizarAlvo(passo.alvo!),
          3500,
          foiCancelado,
        );
        if (cancelado) return;
        if (els && els.length > 0) {
          elementosAlvo.current = els;
          try {
            els[0].scrollIntoView({ block: "center", inline: "nearest" });
          } catch {
            // navegador antigo , segue sem rolar
          }
          await dormir(60);
        }
      }
      if (!cancelado) setPreparando(false);
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, indice]);

  // Acompanha o alvo a cada quadro (rolagem, redimensionamento, recarga).
  useEffect(() => {
    if (!ativo || preparando) return;
    let quadro = 0;
    const alvoExpr = passo?.alvo;
    function atualizar() {
      let els = elementosAlvo.current;
      if (els && els.some((e) => !e.isConnected) && alvoExpr) {
        els = localizarAlvo(alvoExpr);
        elementosAlvo.current = els;
      }
      const novo = els ? retanguloDe(els) : null;
      setRetangulo((antigo) => {
        if (!novo && !antigo) return antigo;
        if (!novo || !antigo) return novo;
        const igual =
          Math.abs(novo.top - antigo.top) < 0.5 &&
          Math.abs(novo.left - antigo.left) < 0.5 &&
          Math.abs(novo.width - antigo.width) < 0.5 &&
          Math.abs(novo.height - antigo.height) < 0.5;
        return igual ? antigo : novo;
      });
      quadro = requestAnimationFrame(atualizar);
    }
    quadro = requestAnimationFrame(atualizar);
    return () => cancelAnimationFrame(quadro);
  }, [ativo, preparando, passo?.alvo]);

  // Atalhos de teclado.
  useEffect(() => {
    if (!ativo && !seletor) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        encerrar();
        return;
      }
      if (!ativo) return;
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        proximo();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        voltar();
      } else if (e.key === "Escape") {
        e.preventDefault();
        encerrar();
      }
    }
    window.addEventListener("keydown", aoTeclar, true);
    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [ativo, seletor, proximo, voltar, encerrar]);

  const valor = useMemo(
    () => ({ iniciarTour, tourAtivo: ativo || seletor }),
    [iniciarTour, ativo, seletor],
  );

  const totalVisivel = passos.filter(
    (p) => !(semMotorista && p.detalheMotorista),
  ).length;
  const posicaoVisivel =
    passos.slice(0, indice + 1).filter((p) => !(semMotorista && p.detalheMotorista))
      .length;

  return (
    <TourContext.Provider value={valor}>
      {children}
      {ativo && passo
        ? createPortal(
            <CamadaDoTour
              passo={passo}
              retangulo={preparando ? null : retangulo}
              preparando={preparando}
              posicao={posicaoVisivel}
              total={totalVisivel}
              primeiro={indice === 0}
              ultimo={indice >= passos.length - 1}
              moduloTitulo={
                modulosVisiveis.find((m) => m.id === moduloAtual)?.titulo ?? null
              }
              onProximo={proximo}
              onVoltar={voltar}
              onModulos={iniciarTour}
              onFechar={encerrar}
            />,
            document.body,
          )
        : null}
      {seletor
        ? createPortal(
            <SeletorDeModulos
              modulos={modulosVisiveis.map((m) => ({
                ...m,
                passos: todosOsPassos.filter((p) => p.modulo === m.id).length,
                concluido: concluidos.includes(m.id),
              }))}
              aviso={aviso}
              onEscolher={iniciarModulo}
              onFechar={encerrar}
            />,
            document.body,
          )
        : null}
    </TourContext.Provider>
  );
}

type Lado = "baixo" | "cima" | "direita" | "esquerda" | "centro";

function CamadaDoTour(props: {
  passo: PassoDoTour;
  retangulo: Retangulo | null;
  preparando: boolean;
  posicao: number;
  total: number;
  primeiro: boolean;
  ultimo: boolean;
  moduloTitulo: string | null;
  onProximo: () => void;
  onVoltar: () => void;
  onModulos: () => void;
  onFechar: () => void;
}) {
  const { passo, retangulo, preparando, posicao, total, primeiro, ultimo } = props;
  const bolhaRef = useRef<HTMLDivElement>(null);
  const [altura, setAltura] = useState(240);
  const botaoProximoRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (bolhaRef.current) setAltura(bolhaRef.current.offsetHeight);
  }, [passo, preparando]);

  useEffect(() => {
    botaoProximoRef.current?.focus({ preventScroll: true });
  }, [passo]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const largura = Math.min(LARGURA_BALAO, vw - 24);

  const margemDestaque = 6;
  const destaque = retangulo
    ? {
        top: retangulo.top - margemDestaque,
        left: retangulo.left - margemDestaque,
        width: retangulo.width + margemDestaque * 2,
        height: retangulo.height + margemDestaque * 2,
      }
    : null;

  let lado: Lado = "centro";
  let topo = Math.max(12, (vh - altura) / 2);
  let esquerda = Math.max(12, (vw - largura) / 2);

  if (destaque && destaque.height < vh * 0.7) {
    const centroX = destaque.left + destaque.width / 2;
    const centroY = destaque.top + destaque.height / 2;
    const cabeAbaixo = destaque.top + destaque.height + FOLGA + altura <= vh - 12;
    const cabeAcima = destaque.top - FOLGA - altura >= 12;
    const cabeDireita = destaque.left + destaque.width + FOLGA + largura <= vw - 12;
    const cabeEsquerda = destaque.left - FOLGA - largura >= 12;
    const limitarX = (x: number) => Math.min(Math.max(12, x), vw - largura - 12);
    const limitarY = (y: number) => Math.min(Math.max(12, y), vh - altura - 12);

    if (cabeAbaixo) {
      lado = "baixo";
      topo = destaque.top + destaque.height + FOLGA;
      esquerda = limitarX(centroX - largura / 2);
    } else if (cabeAcima) {
      lado = "cima";
      topo = destaque.top - FOLGA - altura;
      esquerda = limitarX(centroX - largura / 2);
    } else if (cabeDireita) {
      lado = "direita";
      esquerda = destaque.left + destaque.width + FOLGA;
      topo = limitarY(centroY - altura / 2);
    } else if (cabeEsquerda) {
      lado = "esquerda";
      esquerda = destaque.left - FOLGA - largura;
      topo = limitarY(centroY - altura / 2);
    }
  }
  if (lado === "centro" && destaque) {
    // Alvo muito grande ou sem espaço , balão fixo no rodapé, sem seta.
    topo = Math.max(12, vh - altura - 20);
  }

  const lim = (v: number, max: number) => Math.min(Math.max(v, 22), max - 22);

  // Seta fora do balão (o balão tem overflow e cortava a seta antiga),
  // grossa, apontando para o campo, com um anel pulsando em volta.
  const TAM_SETA = 44;
  let seta: { cx: number; cy: number; giro: number } | null = null;
  if (destaque && lado !== "centro") {
    const centroX = destaque.left + destaque.width / 2;
    const centroY = destaque.top + destaque.height / 2;
    const limX = Math.min(Math.max(centroX, 24), vw - 24);
    const limY = Math.min(Math.max(centroY, 24), vh - 24);
    if (lado === "baixo") {
      seta = { cx: limX, cy: destaque.top + destaque.height + FOLGA / 2, giro: 0 };
    } else if (lado === "cima") {
      seta = { cx: limX, cy: destaque.top - FOLGA / 2, giro: 180 };
    } else if (lado === "direita") {
      seta = { cx: destaque.left + destaque.width + FOLGA / 2, cy: limY, giro: -90 };
    } else if (lado === "esquerda") {
      seta = { cx: destaque.left - FOLGA / 2, cy: limY, giro: 90 };
    }
  }

  const progresso = Math.round((posicao / Math.max(1, total)) * 100);

  return (
    <div data-tour-camada="1" role="dialog" aria-modal="true" aria-label="Tour guiado">
      <style>{`
        @keyframes fvf-tour-pulso {
          0%, 100% { box-shadow: 0 0 0 9999px rgba(8,12,24,.68), 0 0 0 3px rgba(96,165,250,.95); }
          50% { box-shadow: 0 0 0 9999px rgba(8,12,24,.68), 0 0 0 7px rgba(96,165,250,.45); }
        }
        @keyframes fvf-tour-seta {
          0%, 100% { transform: translateY(2px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes fvf-tour-anel {
          0% { transform: scale(.55); opacity: .95; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .fvf-tour-seta { animation: fvf-tour-seta 1s ease-in-out infinite; }
        .fvf-tour-anel { animation: fvf-tour-anel 1.4s ease-out infinite; }
        .fvf-tour-bolha button { font-family: inherit; }
        @media (prefers-reduced-motion: reduce) {
          .fvf-tour-seta, .fvf-tour-anel, .fvf-tour-destaque { animation: none !important; }
        }
      `}</style>

      {/* bloqueia cliques no resto da tela enquanto o tour está aberto */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 10000, background: destaque ? "transparent" : "rgba(8,12,24,.68)" }}
      />

      {destaque && (
        <div
          className="fvf-tour-destaque"
          style={{
            position: "fixed",
            zIndex: 10001,
            top: destaque.top,
            left: destaque.left,
            width: destaque.width,
            height: destaque.height,
            borderRadius: 8,
            pointerEvents: "none",
            transition: "all .2s ease",
            animation: "fvf-tour-pulso 1.8s ease-in-out infinite",
          }}
        />
      )}

      {seta && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            zIndex: 10003,
            left: seta.cx - TAM_SETA / 2,
            top: seta.cy - TAM_SETA / 2,
            width: TAM_SETA,
            height: TAM_SETA,
            pointerEvents: "none",
            transition: "left .2s ease, top .2s ease",
          }}
        >
          <span
            className="fvf-tour-anel"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "4px solid rgba(96,165,250,.95)",
            }}
          />
          <div style={{ position: "absolute", inset: 0, transform: `rotate(${seta.giro}deg)` }}>
            <svg
              className="fvf-tour-seta"
              width={TAM_SETA}
              height={TAM_SETA}
              viewBox="0 0 44 44"
              style={{ display: "block", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.45))" }}
            >
              <path
                d="M22 3 L38 21 L28 21 L28 40 L16 40 L16 21 L6 21 Z"
                fill="#1a56db"
                stroke="#fff"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}

      <div
        ref={bolhaRef}
        className="fvf-tour-bolha"
        style={{
          position: "fixed",
          zIndex: 10002,
          top: topo,
          left: esquerda,
          width: largura,
          boxSizing: "border-box",
          background: "#fff",
          color: "#1a1d23",
          border: "2px solid #1a56db",
          borderRadius: 12,
          padding: "16px 18px 14px",
          boxShadow: "0 12px 40px rgba(0,0,0,.35)",
          transition: "top .2s ease, left .2s ease",
          maxHeight: vh - 24,
          overflowY: "auto",
        }}
      >
        <button
          type="button"
          onClick={props.onFechar}
          aria-label="Fechar o tour"
          title="Fechar o tour"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            padding: 0,
            borderRadius: 14,
            background: "#e5e7eb",
            color: "#1f2937",
            fontSize: 16,
            lineHeight: "28px",
          }}
        >
          ×
        </button>
        <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 6, paddingRight: 30 }}>
          {props.moduloTitulo ? `${props.moduloTitulo} , ` : ""}passo {posicao} de {total}
        </div>
        <div style={{ height: 4, background: "#e5e7eb", borderRadius: 2, marginBottom: 12 }}>
          <div
            style={{ width: `${progresso}%`, height: "100%", background: "#1a56db", borderRadius: 2, transition: "width .2s" }}
          />
        </div>

        <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>{passo.titulo}</h3>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#1f2937" }}>
          {passo.texto}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
          <button
            type="button"
            onClick={props.onModulos}
            style={{ background: "transparent", color: "#1a56db", padding: "8px 4px", fontSize: 13, textDecoration: "underline" }}
          >
            Módulos
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" className="secondary" onClick={props.onVoltar} disabled={primeiro}>
            Voltar
          </button>
          <button type="button" ref={botaoProximoRef} onClick={props.onProximo}>
            {ultimo ? "Concluir módulo" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ModuloNaLista {
  id: string;
  titulo: string;
  descricao: string;
  passos: number;
  concluido: boolean;
}

function SeletorDeModulos(props: {
  modulos: ModuloNaLista[];
  aviso: string | null;
  onEscolher: (id: string | null) => void;
  onFechar: () => void;
}) {
  const { modulos } = props;
  const feitos = modulos.filter((m) => m.concluido).length;
  const proximoModulo = modulos.find((m) => !m.concluido) ?? null;
  const tudoFeito = feitos === modulos.length;

  return (
    <div data-tour-camada="1" role="dialog" aria-modal="true" aria-label="Escolha um módulo do tour">
      <div
        style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(8,12,24,.68)" }}
        onClick={props.onFechar}
      />
      <div
        style={{
          position: "fixed",
          zIndex: 10002,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(640px, calc(100vw - 24px))",
          maxHeight: "calc(100vh - 24px)",
          overflowY: "auto",
          boxSizing: "border-box",
          background: "#fff",
          color: "#1a1d23",
          border: "2px solid #1a56db",
          borderRadius: 12,
          padding: "20px 22px",
          boxShadow: "0 12px 40px rgba(0,0,0,.35)",
        }}
      >
        <button
          type="button"
          onClick={props.onFechar}
          aria-label="Fechar o tour"
          title="Fechar o tour"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 28,
            height: 28,
            padding: 0,
            borderRadius: 14,
            background: "#e5e7eb",
            color: "#1f2937",
            fontSize: 16,
            lineHeight: "28px",
          }}
        >
          ×
        </button>
        <h3 style={{ margin: "0 0 6px", fontSize: 19, paddingRight: 30 }}>
          Conheça o FVF Hórus aos poucos
        </h3>
        <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.5, color: "#1f2937" }}>
          O passeio é dividido em módulos curtos, um para cada parte do menu.
          Faça um agora e volte para os outros quando tiver um tempinho. O
          que você já viu fica marcado.
        </p>

        {props.aviso && (
          <p
            style={{
              margin: "0 0 12px",
              padding: "8px 12px",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: 8,
              fontSize: 14,
              color: "#065f46",
            }}
          >
            {props.aviso}
          </p>
        )}

        <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 4 }}>
          {feitos} de {modulos.length} módulos vistos
        </div>
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, marginBottom: 14 }}>
          <div
            style={{
              width: `${Math.round((feitos / Math.max(1, modulos.length)) * 100)}%`,
              height: "100%",
              background: "#16a34a",
              borderRadius: 3,
            }}
          />
        </div>

        {proximoModulo && (
          <button
            type="button"
            onClick={() => props.onEscolher(proximoModulo.id)}
            style={{ width: "100%", marginBottom: 12 }}
          >
            {feitos === 0 ? "Começar pelo primeiro módulo" : "Continuar com o próximo módulo"}
            {" , "}
            {proximoModulo.titulo}
          </button>
        )}

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
          {modulos.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => props.onEscolher(m.id)}
              style={{
                textAlign: "left",
                background: m.concluido ? "#f0fdf4" : "#f3f4f6",
                color: "#1f2937",
                border: `1px solid ${m.concluido ? "#86efac" : "#d1d5db"}`,
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {m.concluido ? "✓ " : ""}
                {m.titulo}
              </div>
              <div style={{ fontSize: 12, color: "#4b5563", margin: "2px 0" }}>{m.descricao}</div>
              <div style={{ fontSize: 12, color: "#1a56db" }}>
                {m.passos} passos , cerca de {Math.max(1, Math.round(m.passos / 4))} min
              </div>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <button
            type="button"
            onClick={() => props.onEscolher(null)}
            style={{ background: "transparent", color: "#4b5563", padding: "6px 2px", fontSize: 13, textDecoration: "underline" }}
          >
            {tudoFeito ? "Rever tudo em sequência" : "Prefiro ver tudo em sequência"}
          </button>
          <button type="button" className="secondary" onClick={props.onFechar}>
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
