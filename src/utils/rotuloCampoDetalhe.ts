// Rodada 324: nomes de campo legíveis nos "Detalhes" (auditoria e alertas).
// O `detalhes` é um JSON livre gravado pelo backend com chaves em camelCase
// (ex.: "deltaParedeMs"), que apareciam coladas na tela. Aqui há rótulos para
// os campos conhecidos e, para qualquer outro, uma conversão automática que
// separa as palavras e põe a unidade entre parênteses.

const ROTULOS_CONHECIDOS: Record<string, string> = {
  tipoEvento: "Tipo do evento",
  deltaParedeMs: "Tempo andado pelo relógio de parede (ms)",
  deltaMonotonicoMs: "Tempo andado pelo relógio interno (ms)",
  divergenciaMin: "Divergência entre os relógios (min)",
  deviceUuidUsado: "Aparelho usado",
  timestampEventoRecebido: "Horário do ponto recebido",
  timestampUltimoRegistro: "Horário do último registro",
  horaRecebimentoServidor: "Horário de recebimento no servidor",
  registroAnteriorId: "Registro anterior (comparado)",
  registroAtualId: "Registro atual (gerou o alerta)",
  registroId: "Registro",
  observacao: "Observação",
  motivo: "Motivo",
};

const PALAVRAS_ESPECIAIS: Record<string, string> = {
  id: "ID",
  uuid: "UUID",
  ip: "IP",
  cpf: "CPF",
  cnpj: "CNPJ",
  gps: "GPS",
  cnh: "CNH",
  cte: "CT-e",
  km: "km",
  kmh: "km/h",
};

const UNIDADES: Record<string, string> = {
  ms: "(ms)",
  min: "(min)",
  seg: "(s)",
  m: "(m)",
  metros: "(m)",
  kmh: "(km/h)",
};

export function rotuloCampoDetalhe(chave: string): string {
  if (ROTULOS_CONHECIDOS[chave]) return ROTULOS_CONHECIDOS[chave];
  const palavras = chave
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .map((p) => p.toLowerCase());
  if (palavras.length === 0 || palavras[0] === "") return chave;
  let unidade = "";
  const ultima = palavras[palavras.length - 1];
  if (palavras.length > 1 && UNIDADES[ultima]) {
    unidade = UNIDADES[ultima];
    palavras.pop();
  }
  const texto = palavras
    .map((p, i) => {
      if (PALAVRAS_ESPECIAIS[p]) return PALAVRAS_ESPECIAIS[p];
      return i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p;
    })
    .join(" ");
  return unidade ? `${texto} ${unidade}` : texto;
}
