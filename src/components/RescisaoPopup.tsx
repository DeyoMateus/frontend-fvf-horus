import { useState } from "react";
import { PopupBase } from "./PopupBase";

function hojeLocalISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Rescisão (desligamento) do colaborador: data do fim do vínculo e motivo. A data inicia a
 * contagem do prazo de guarda pós-desligamento; o cadastro passa a inativo e nada é apagado.
 */
export function RescisaoPopup({
  modo = "rescisao",
  nome,
  dataAdmissao,
  dataMinima,
  salvando,
  erro,
  onConfirmar,
  onFechar,
}: {
  /** "readmissao": volta do colaborador com rescisão registrada. */
  modo?: "rescisao" | "readmissao";
  nome: string;
  dataAdmissao?: string | null;
  /** Menor data aceita (na readmissão, a data da rescisão). */
  dataMinima?: string | null;
  salvando: boolean;
  erro: string | null;
  onConfirmar: (dataDesligamento: string, motivo: string) => void;
  onFechar: () => void;
}) {
  const hoje = hojeLocalISO();
  const [data, setData] = useState(hoje);
  const [motivo, setMotivo] = useState("");
  const minimoBruto = modo === "readmissao" ? dataMinima : dataAdmissao;
  const minimo = minimoBruto ? minimoBruto.slice(0, 10) : undefined;
  const readmissao = modo === "readmissao";
  const invalido =
    !data || data > hoje || (minimo != null && data < minimo) || motivo.trim().length < 5;

  return (
    <PopupBase
      titulo={readmissao ? "Readmitir colaborador" : "Registrar rescisão"}
      onFechar={onFechar}
      largura={480}
      rodape={
        <>
          <button className="secondary" type="button" onClick={onFechar} disabled={salvando}>
            Cancelar
          </button>
          <button
            type="button"
            className={readmissao ? undefined : "danger"}
            disabled={salvando || invalido}
            onClick={() => onConfirmar(data, motivo.trim())}
          >
            {salvando ? "Registrando..." : readmissao ? "Readmitir" : "Registrar rescisão"}
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0, fontSize: 13 }}>
        {readmissao ? (
          <>
            Readmissão de <strong>{nome}</strong>. O cadastro volta a ativo e deixa de contar o prazo
            de guarda após o desligamento. A rescisão anterior e esta readmissão ficam na auditoria.
            O app volta a receber avisos quando o colaborador abrir o aplicativo.
          </>
        ) : (
          <>
            Rescisão de <strong>{nome}</strong>. O cadastro passa a inativo, o aparelho deixa de
            receber avisos e todo o histórico continua guardado. A data inicia o prazo de guarda
            após o desligamento.
          </>
        )}
      </p>
      <label style={{ display: "block", fontSize: 13, marginBottom: 10 }}>
        {readmissao ? "Data da readmissão" : "Data da rescisão"}
        <input
          type="date"
          value={data}
          min={minimo}
          max={hoje}
          onChange={(e) => setData(e.target.value)}
          style={{ display: "block", marginTop: 4 }}
        />
      </label>
      <label style={{ display: "block", fontSize: 13 }}>
        Motivo (fica registrado na auditoria)
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          maxLength={400}
          placeholder={readmissao ? "Ex.: recontratação, retorno de afastamento" : "Ex.: pedido de demissão, término de contrato, dispensa"}
          style={{ display: "block", width: "100%", marginTop: 4 }}
        />
      </label>
      {erro && <p style={{ color: "#b91c1c", fontSize: 13 }}>{erro}</p>}
    </PopupBase>
  );
}
