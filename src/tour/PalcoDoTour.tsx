import { useLayoutEffect, useState, type ReactNode } from "react";

// Rodada 347 , "palco" do tour guiado.
//
// Uma empresa nova não tem motorista, alerta nem pedido nenhum, então o tour
// não teria o que mostrar. O palco é um teatro visual: telas de exemplo com
// dados inventados, desenhadas por cima da página real só enquanto o passo
// do tour pede. Nada aqui lê ou grava dado da empresa, nenhum botão funciona
// (tudo é só para o tour apontar a seta) e nada disso fica guardado.

export type TipoDePalco = "motoristas" | "ficha" | "folgas" | "ciencia";

function Aviso() {
  return (
    <p
      style={{
        margin: "0 0 12px",
        padding: "8px 12px",
        background: "#fef9c3",
        border: "1px solid #fde047",
        borderRadius: 6,
        fontSize: 13,
        color: "#000",
      }}
    >
      Tela de exemplo do passeio. Os nomes, números e datas abaixo são
      inventados e não fazem parte da sua empresa.
    </p>
  );
}

const semAcao = (e: { preventDefault: () => void }) => e.preventDefault();

function Campo({
  rotulo,
  valor,
  tipo,
}: {
  rotulo: string;
  valor: string;
  tipo?: string;
}) {
  return (
    <div>
      <label>{rotulo}</label>
      <input type={tipo ?? "text"} value={valor} readOnly tabIndex={-1} />
    </div>
  );
}

function Rotulos({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: 13, color: "#000", margin: "4px 0 8px" }}>
      {children}
    </p>
  );
}

function PalcoMotoristas() {
  return (
    <div>
      <Aviso />
      <h2>Motoristas</h2>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>Cadastrar motorista</h3>
          <button type="button" className="secondary" onClick={semAcao}>
            Cancelar
          </button>
        </div>
        <form onSubmit={semAcao}>
          <Campo rotulo="Nome" valor="Carlos Eduardo Ferreira" />
          <Campo rotulo="CPF (11 dígitos)" valor="12345678909" />
          <Campo rotulo="CNH" valor="01234567890" />
          <Campo rotulo="Telefone de contato" valor="+55 11 91234-5678" />
          <Campo rotulo="ID do rastreador (opcional)" valor="RST-004512" />
          <Campo rotulo="Tecnologia do rastreador (opcional)" valor="Omnilink" />
          <Campo
            rotulo="Empresa (CNPJ)"
            valor="Transportes Exemplo Ltda (00.000.000/0001-91)"
          />
          <div style={{ marginTop: 12 }}>
            <button type="button" onClick={semAcao}>
              Cadastrar motorista
            </button>
          </div>
        </form>
      </div>

      <div
        className="card"
        style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
      >
        <h3 style={{ marginTop: 0 }}>
          Radar: dias sem interação (últimos 7 dias)
        </h3>
        <p style={{ fontSize: 13, color: "#000" }}>
          Dias em que o motorista não bateu nenhum ponto e também não avisou
          folga pelo app. Pode ser falta de sinal, esquecimento, ou algo mais
          grave que vale confirmar direto com ele.
        </p>
        <p style={{ fontSize: 13, color: "#000" }}>
          Clique em um dia para tratá-lo. Você informa se foi folga, falta,
          atestado, outro motivo, ou se o ponto deixou de ser registrado (sem
          sinal ou esquecimento) e então lança os horários no tratamento de
          ponto. O dia sai do radar depois de tratado.
        </p>
        <ul style={{ fontSize: 13 }}>
          <li style={{ marginBottom: 6 }}>
            Carlos Eduardo Ferreira:{" "}
            <button
              type="button"
              onClick={semAcao}
              style={{ fontSize: 12, padding: "2px 8px", marginRight: 6 }}
            >
              17/10/2026 · Tratar
            </button>
            <button
              type="button"
              onClick={semAcao}
              style={{ fontSize: 12, padding: "2px 8px", marginRight: 6 }}
            >
              19/10/2026 · Tratar
            </button>
          </li>
        </ul>
        <div
          style={{
            background: "#fff",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            padding: 12,
            maxWidth: 460,
          }}
        >
          <h4 style={{ margin: "0 0 6px" }}>Tratar o dia 17/10/2026</h4>
          <p style={{ fontSize: 13, color: "#000", margin: "0 0 8px" }}>
            Escolha o que aconteceu neste dia.
          </p>
          <div style={{ display: "grid", gap: 6, fontSize: 13, color: "#000" }}>
            <span>( ) Folga</span>
            <span>( ) Falta</span>
            <span>( ) Atestado</span>
            <span>( ) Outro motivo</span>
            <span>( ) Ponto não registrado (sem sinal ou esquecimento)</span>
          </div>
          <p style={{ fontSize: 12, color: "#000", marginBottom: 0 }}>
            Quem trata o dia fica registrado na auditoria, junto com a
            justificativa.
          </p>
        </div>
      </div>

      <div
        className="card"
        style={{ background: "#fffbeb", borderColor: "#fde68a" }}
      >
        <h3 style={{ marginTop: 0 }}>
          Solicitações de troca de aparelho pendentes
        </h3>
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
            <tr>
              <td>Marcos Antônio Lima</td>
              <td>a1b2c3d4-0000-4000-8000-123456789abc</td>
              <td>Samsung A54 / Android 15</td>
              <td>Celular antigo quebrou</td>
              <td>20/10/2026 08:12</td>
              <td>
                <button type="button" onClick={semAcao}>
                  Aprovar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Lista de motoristas</h3>
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
            <tr>
              <td>Carlos Eduardo Ferreira</td>
              <td>123.456.789-09</td>
              <td>ATIVO</td>
              <td>ABC1D23</td>
              <td>Vinculado</td>
              <td>
                <button type="button" onClick={semAcao}>
                  Ver detalhes
                </button>
              </td>
            </tr>
            <tr>
              <td>Marcos Antônio Lima</td>
              <td>987.654.321-00</td>
              <td>ATIVO</td>
              <td>
                <span style={{ color: "#b91c1c" }}>sem placa</span>
              </td>
              <td>
                <span style={{ color: "#b91c1c" }}>sem aparelho</span>
              </td>
              <td>
                <button type="button" onClick={semAcao}>
                  Ver detalhes
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PalcoFicha() {
  return (
    <div>
      <Aviso />
      <h2>Carlos Eduardo Ferreira</h2>
      <p style={{ color: "#000", marginTop: -8, lineHeight: 2.2 }}>
        CPF 123.456.789-09 · +55 11 91234-5678 · Transportes Exemplo Ltda
        (00.000.000/0001-91) · status ATIVO · cadastrado na plataforma em{" "}
        <strong>01/09/2026 09:30</strong>{" "}
        <button type="button" onClick={semAcao} style={{ fontSize: 12 }}>
          Editar
        </button>{" "}
        <button type="button" onClick={semAcao} style={{ fontSize: 12 }}>
          Reativar
        </button>{" "}
        <button type="button" onClick={semAcao} style={{ fontSize: 12 }}>
          Suspender
        </button>{" "}
        <button type="button" onClick={semAcao} style={{ fontSize: 12 }}>
          Inativar (arquivo morto)
        </button>{" "}
        <button
          type="button"
          className="danger"
          onClick={semAcao}
          style={{ fontSize: 12 }}
        >
          Excluir cadastro
        </button>
      </p>

      <div className="card" style={{ maxWidth: 480 }}>
        <h3 style={{ marginTop: 0 }}>Editar dados cadastrais</h3>
        <form onSubmit={semAcao}>
          <Campo rotulo="Nome" valor="Carlos Eduardo Ferreira" />
          <Campo rotulo="CPF" valor="123.456.789-09" />
          <Rotulos>CPF e CNH não podem ser editados, pois protegem a cadeia de registros.</Rotulos>
          <Campo rotulo="Telefone de contato" valor="+55 11 91234-5678" />
          <Campo
            rotulo="Empresa (CNPJ) vinculada"
            valor="Transportes Exemplo Ltda (00.000.000/0001-91)"
          />
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button type="button" onClick={semAcao}>
              Salvar alterações
            </button>
            <button type="button" className="secondary" onClick={semAcao}>
              Cancelar
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Dispositivo vinculado</h3>
        <p style={{ fontSize: 13, color: "#000" }}>
          Samsung A54 / Android 15, vinculado em 02/09/2026.
        </p>
        <button type="button" onClick={semAcao}>
          Vincular novo aparelho
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Veículo de tração vinculado</h3>
        <label>Placa</label>
        <input value="ABC1D23" readOnly tabIndex={-1} />
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={semAcao}>
            Salvar placa
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Integridade da cadeia de jornada</h3>
        <p style={{ fontSize: 13, color: "#000" }}>
          Cada registro é ligado ao anterior por um código de integridade (hash).
        </p>
        <button type="button" onClick={semAcao}>
          Verificar integridade
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Registros de jornada</h3>
        <table>
          <thead>
            <tr>
              <th>Data e hora</th>
              <th>Evento</th>
              <th>Localização</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>20/10/2026 06:00</td>
              <td>Início de jornada</td>
              <td>Campinas, SP</td>
            </tr>
            <tr>
              <td>20/10/2026 06:10</td>
              <td>Início de direção</td>
              <td>Campinas, SP</td>
            </tr>
            <tr>
              <td>20/10/2026 10:40</td>
              <td>Fim de direção</td>
              <td>Uberaba, MG</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Jornadas por dia</h3>
        <table>
          <thead>
            <tr>
              <th>Dia</th>
              <th>Direção</th>
              <th>Espera</th>
              <th>Descanso</th>
              <th>Direção do ciclo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>20/10/2026</td>
              <td>08:15</td>
              <td>01:30</td>
              <td>01:00</td>
              <td>08:15</td>
              <td>
                <button type="button" onClick={semAcao} style={{ fontSize: 12 }}>
                  Ver ciclo
                </button>
              </td>
            </tr>
            <tr>
              <td>21/10/2026</td>
              <td>07:40</td>
              <td>00:45</td>
              <td>01:15</td>
              <td>15:55</td>
              <td>
                <button type="button" onClick={semAcao} style={{ fontSize: 12 }}>
                  Ver ciclo
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Jornadas que compõem o ciclo</h3>
        <p style={{ fontSize: 13, marginTop: 0, color: "#000" }}>
          Jornadas encadeadas: menos de 11h de descanso entre o fim de uma e o
          início da seguinte.
        </p>
        <table>
          <thead>
            <tr>
              <th>Início</th>
              <th>Fim</th>
              <th>Descanso anterior</th>
              <th>Direção</th>
              <th>Acumulado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>20/10/2026 06:00</td>
              <td>20/10/2026 17:30</td>
              <td>-</td>
              <td>08:15</td>
              <td style={{ fontWeight: 600 }}>08:15</td>
            </tr>
            <tr style={{ background: "#fef3c7" }}>
              <td>21/10/2026 04:30</td>
              <td>21/10/2026 15:00</td>
              <td>11:00</td>
              <td>07:40</td>
              <td style={{ fontWeight: 600 }}>15:55</td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontSize: 12, marginBottom: 0, color: "#000" }}>
          A linha em destaque é a jornada em que você clicou.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Banco de horas</h3>
        <p style={{ fontSize: 13, color: "#000" }}>
          Quando a convenção coletiva ativa o banco de horas, a hora extra
          apurada vira crédito do motorista. O saldo do período é o crédito
          mais as correções do RH, menos os débitos lançados quando a hora é
          compensada em folga, paga ou corrigida. O alerta avisa quando o
          saldo passa do limite definido nas regras sindicais.
        </p>
        <table>
          <thead>
            <tr>
              <th>Período</th>
              <th>Crédito de hora extra</th>
              <th>Débitos (compensação ou pagamento)</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>09/2026</td>
              <td>+12:40</td>
              <td>-03:10</td>
              <td>+09:30</td>
            </tr>
            <tr>
              <td>10/2026</td>
              <td>+06:20</td>
              <td>-01:00</td>
              <td>+14:50</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Status de carga (CT-e / MDF-e)</h3>
        <table>
          <thead>
            <tr>
              <th>Documento</th>
              <th>Número</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CT-e</td>
              <td>000123456</td>
              <td>Em trânsito</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Folgas autorrelatadas</h3>
        <p style={{ fontSize: 13, color: "#000" }}>
          18/10/2026 , informada pelo motorista pelo aplicativo.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Folgas concedidas pelo RH</h3>
        <label>Dia da folga</label>
        <input type="date" value="2026-10-25" readOnly tabIndex={-1} />
        <label style={{ marginTop: 8, display: "block" }}>Motivo</label>
        <input value="Descanso após viagem longa" readOnly tabIndex={-1} />
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={semAcao}>
            Conceder folga
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Alertas de jornada (Lei do Motorista)</h3>
        <table>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Alerta</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>21/10/2026 11:20</td>
              <td>Direção contínua acima de 5h30</td>
              <td>Aberto</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Tratamento de ponto</h3>
        <label>Evento</label>
        <input value="Fim de jornada" readOnly tabIndex={-1} />
        <label style={{ marginTop: 8, display: "block" }}>Horário</label>
        <input type="datetime-local" value="2026-10-21T15:00" readOnly tabIndex={-1} />
        <label style={{ marginTop: 8, display: "block" }}>Motivo</label>
        <input value="Motorista esqueceu de encerrar a jornada" readOnly tabIndex={-1} />
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={semAcao}>
            Lançar tratamento
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Holerite (folha de ponto)</h3>
        <label>Data inicial</label>
        <input type="date" value="2026-10-01" readOnly tabIndex={-1} />
        <label style={{ marginTop: 8, display: "block" }}>Data final</label>
        <input type="date" value="2026-10-21" readOnly tabIndex={-1} />
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={semAcao}>
            Baixar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function PalcoFolgas() {
  return (
    <div>
      <Aviso />
      <h1>Pedidos de folga</h1>
      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>O que cada indicador mostra</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
          <li>De folga hoje, folgas concedidas para o dia de hoje.</li>
          <li>Folgas vencidas, motoristas que passaram do limite de dias de trabalho sem folgar.</li>
          <li>Folgas marcadas, folgas concedidas para dias futuros.</li>
          <li>Pedidos em aberto, pedidos que aguardam a decisão do RH.</li>
          <li>Pedidos negados e folgas não realizadas, dos últimos 90 dias.</li>
        </ul>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Aguardando decisão (1)</h2>
        <table>
          <thead>
            <tr>
              <th>Motorista</th>
              <th>Período</th>
              <th>Motivo do motorista</th>
              <th>Pedido em</th>
              <th>Decisão</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Carlos Eduardo Ferreira</td>
              <td>25/10/2026 a 26/10/2026</td>
              <td>Consulta médica da família</td>
              <td>21/10/2026 18:40</td>
              <td>
                <input placeholder="Justificativa" readOnly tabIndex={-1} />{" "}
                <button type="button" onClick={semAcao}>
                  Aprovar
                </button>{" "}
                <button type="button" className="danger" onClick={semAcao}>
                  Negar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Já decididos</h2>
        <table>
          <thead>
            <tr>
              <th>Motorista</th>
              <th>Período</th>
              <th>Resultado</th>
              <th>Justificativa</th>
              <th>Decidido por</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Marcos Antônio Lima</td>
              <td>12/10/2026</td>
              <td>Aprovada</td>
              <td>Escala em dia</td>
              <td>Ana (RH)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PalcoCiencia() {
  return (
    <div>
      <Aviso />
      <h2>Privacidade (LGPD)</h2>
      <p style={{ fontSize: 13, color: "#000" }}>
        Versão em vigor: <strong>2026-10</strong> · 1 motorista ainda sem
        ciência completa (o app dele fica bloqueado até dar).
      </p>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Motorista</th>
              <th>Política</th>
              <th>Dados pessoais</th>
              <th>Termo de GPS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Carlos Eduardo Ferreira</td>
              <td>02/09/2026 08:01</td>
              <td>02/09/2026 08:01</td>
              <td>02/09/2026 08:02</td>
            </tr>
            <tr>
              <td>Marcos Antônio Lima</td>
              <td>20/10/2026 07:30</td>
              <td>
                <span style={{ color: "#b91c1c" }}>pendente</span>
              </td>
              <td>
                <span style={{ color: "#b91c1c" }}>pendente</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PalcoDoTour({ tipo }: { tipo: TipoDePalco }) {
  // O palco cobre só a área de conteúdo, deixando o menu lateral à vista.
  const [esquerda, setEsquerda] = useState(0);
  useLayoutEffect(() => {
    const barra = document.querySelector<HTMLElement>(".sidebar");
    setEsquerda(barra ? Math.round(barra.getBoundingClientRect().width) : 0);
  }, [tipo]);

  return (
    <div
      data-tour-palco={tipo}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        right: 0,
        left: esquerda,
        zIndex: 9000,
        overflowY: "auto",
        background: "#f5f6f8",
        color: "#000",
        padding: 24,
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      {tipo === "motoristas" && <PalcoMotoristas />}
      {tipo === "ficha" && <PalcoFicha />}
      {tipo === "folgas" && <PalcoFolgas />}
      {tipo === "ciencia" && <PalcoCiencia />}
    </div>
  );
}
