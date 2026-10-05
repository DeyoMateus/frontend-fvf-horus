import { useEffect, useState } from "react";

/**
 * Rodada 139 , duração digitada em HH:MM (510 min = "08:30"). O valor
 * que sobe/desce continua sempre em minutos (é o que a API guarda).
 */
export function minParaHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmParaMin(texto: string): number | null {
  const m = /^(\d{1,3}):([0-5]\d)$/.exec(texto.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

interface Props {
  valorMin: number | undefined;
  onChange: (min: number | undefined) => void;
  /** Permite campo vazio (opcional). */
  opcional?: boolean;
}

export function DuracaoInput({ valorMin, onChange, opcional }: Props) {
  const [texto, setTexto] = useState(
    valorMin === undefined ? "" : minParaHHMM(valorMin),
  );

  // Sincroniza quando o valor muda por fora (ex.: abriu outra regra).
  useEffect(() => {
    if (hhmmParaMin(texto) !== (valorMin ?? null)) {
      setTexto(valorMin === undefined ? "" : minParaHHMM(valorMin));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorMin]);

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="HH:MM (ex.: 08:30)"
      maxLength={6}
      value={texto}
      onChange={(e) => {
        let v = e.target.value.replace(/[^\d:]/g, "");
        // Digitou 2 dígitos seguidos sem ":" , já insere o ":".
        if (/^\d{2}$/.test(v) && v.length > texto.length) v += ":";
        setTexto(v);
        if (v === "") {
          onChange(opcional ? undefined : 0);
          return;
        }
        const min = hhmmParaMin(v);
        if (min !== null) onChange(min);
      }}
      onBlur={() => {
        if (texto === "") return;
        const min = hhmmParaMin(texto);
        // Inválido: volta pro último valor válido.
        setTexto(
          min !== null
            ? minParaHHMM(min)
            : valorMin === undefined
              ? ""
              : minParaHHMM(valorMin),
        );
      }}
    />
  );
}
