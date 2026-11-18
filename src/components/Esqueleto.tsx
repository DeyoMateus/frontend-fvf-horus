/**
 * Carregamento com "esqueleto" (barras cinzas pulsando) no lugar do texto solto
 * "Carregando...". O texto continua existindo para leitor de tela.
 */
export function Esqueleto({ linhas = 4 }: { linhas?: number }) {
  return (
    <div className="esqueleto" role="status" aria-live="polite">
      <span className="esqueleto-texto">Carregando...</span>
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="esqueleto-linha" style={{ width: `${95 - ((i * 17) % 45)}%` }} />
      ))}
    </div>
  );
}
