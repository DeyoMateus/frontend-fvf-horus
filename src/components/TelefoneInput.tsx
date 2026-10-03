import { useEffect, useRef, useState } from 'react';
import { PAISES_TELEFONE, montarTelefone, separarTelefone, urlBandeira } from '../data/paisesTelefone';
import type { PaisTelefone } from '../data/paisesTelefone';

/**
 * Bandeira do país com fallback: se a imagem do flagcdn não carregar
 * (sem internet, CDN fora do ar), mostra a sigla em texto no lugar em
 * vez de deixar um ícone de imagem quebrada.
 */
function Bandeira({ pais }: { pais: PaisTelefone }) {
  const [falhou, setFalhou] = useState(false);
  if (falhou) {
    return <span className="bandeira-fallback">{pais.sigla}</span>;
  }
  return (
    <img
      className="bandeira-img"
      src={urlBandeira(pais.sigla)}
      alt={pais.sigla}
      width={20}
      height={15}
      onError={() => setFalhou(true)}
    />
  );
}

export function TelefoneInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (novoValorE164: string) => void;
  required?: boolean;
}) {
  const inicial = separarTelefone(value);
  const [pais, setPais] = useState<PaisTelefone>(inicial.pais);
  const [numeroLocal, setNumeroLocal] = useState(inicial.numeroLocal);
  const [listaAberta, setListaAberta] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const separado = separarTelefone(value);
    setPais(separado.pais);
    setNumeroLocal(separado.numeroLocal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!listaAberta) return;
    function aoClicarFora(ev: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setListaAberta(false);
      }
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [listaAberta]);

  function escolherPais(novoPais: PaisTelefone) {
    setPais(novoPais);
    setListaAberta(false);
    onChange(montarTelefone(novoPais.codigo, numeroLocal));
  }

  function atualizarNumero(texto: string) {
    const somenteDigitos = texto.replace(/\D/g, '');
    setNumeroLocal(somenteDigitos);
    onChange(montarTelefone(pais.codigo, somenteDigitos));
  }

  return (
    <div className="campo-telefone" ref={containerRef}>
      <button
        type="button"
        className="botao-pais-telefone"
        onClick={() => setListaAberta((a) => !a)}
        aria-haspopup="listbox"
        aria-expanded={listaAberta}
      >
        <Bandeira pais={pais} />
        <span>{pais.codigo}</span>
      </button>
      <input
        className="campo-telefone-numero"
        value={numeroLocal}
        onChange={(e) => atualizarNumero(e.target.value)}
        placeholder="DDD + número (ex.: 11999998888)"
        inputMode="numeric"
        maxLength={13}
        required={required}
      />

      {listaAberta && (
        <ul className="lista-pais-telefone" role="listbox">
          {PAISES_TELEFONE.map((item) => (
            <li key={`${item.sigla}-${item.codigo}`}>
              <button type="button" className="item-pais-telefone" onClick={() => escolherPais(item)}>
                <Bandeira pais={item} />
                <span>
                  {item.nome} ({item.codigo})
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
