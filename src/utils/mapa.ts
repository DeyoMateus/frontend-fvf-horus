/** Abre o ponto no Google Maps, em outra aba (o mapa fica fora do sistema). */
export function abrirNoMapa(latitude: string | number, longitude: string | number): void {
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    "_blank",
    "noopener,noreferrer",
  );
}
