import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { documentosPublicos } from "../api/privacidade";
import type { DocumentosPublicos } from "../api/privacidade";

/** Rodada 206 (LGPD art. 9º): política pública, sem login. */
export function PrivacidadePublicaPage() {
  const [dados, setDados] = useState<DocumentosPublicos | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    documentosPublicos().then(setDados).catch(() => setErro(true));
  }, []);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 24 }}>
      <h1>FVF Hórus , Privacidade</h1>
      {erro && <p>Não foi possível carregar o documento agora.</p>}
      {dados?.documentos.map((d) => (
        <div key={d.tipo} className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>{d.titulo}</h2>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 14 }}>
            {d.texto}
          </div>
        </div>
      ))}
      <p style={{ fontSize: 13 }}>
        <Link to="/login">Voltar ao login</Link>
      </p>
    </div>
  );
}
