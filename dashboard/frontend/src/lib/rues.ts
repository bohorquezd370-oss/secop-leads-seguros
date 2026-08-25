// RUES (rues.org.co) no soporta deep-linking a la ficha de una empresa — verificado en vivo
// (2026-08-25): la URL de detalle no lleva NIT ni ningún identificador, y los query params
// ?nit=/?identificacion= no prellenan el formulario de búsqueda. Como no se puede saltar el
// paso manual, al menos se copia el NIT al portapapeles para que solo haya que pegarlo.
export async function abrirBusquedaRues(urlRues: string, nit: string | null) {
  if (nit) {
    try {
      await navigator.clipboard.writeText(nit);
    } catch {
      // Portapapeles no disponible (permiso denegado, contexto no seguro, etc.) — no bloquea
      // la apertura de RUES, el usuario solo tendrá que escribir el NIT a mano.
    }
  }
  window.open(urlRues, "_blank", "noopener,noreferrer");
}
