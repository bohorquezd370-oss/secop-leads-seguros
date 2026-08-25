import type { Proceso } from "../../../types/proceso";
import { COLOR_ESTADO_COMERCIAL, COLOR_ESTADO_SECOP, ETIQUETAS_ESTADO_COMERCIAL, ETIQUETAS_ESTADO_SECOP } from "../../../types/proceso";
import { abrirBusquedaRues } from "../../../lib/rues";

function formatearMoneda(valor: number | null) {
  if (valor === null) return "—";
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric" });
}

interface ProcesosTableProps {
  procesos: Proceso[];
  onSeleccionar: (id: string) => void;
}

export function ProcesosTable({ procesos, onSeleccionar }: ProcesosTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="px-6 py-3">Estado SECOP</th>
            <th className="px-6 py-3">Entidad contratante</th>
            <th className="px-6 py-3">Objeto</th>
            <th className="px-6 py-3">Proveedor adjudicado</th>
            <th className="px-6 py-3">Contacto</th>
            <th className="px-6 py-3 text-right">Valor</th>
            <th className="px-6 py-3 text-center">Fecha</th>
            <th className="px-6 py-3">Estado comercial</th>
            <th className="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {procesos.map((proceso) => (
            <tr
              key={proceso.id}
              onClick={() => onSeleccionar(proceso.id)}
              className="cursor-pointer transition-colors hover:bg-slate-50"
            >
              <td className="px-6 py-4">
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${COLOR_ESTADO_SECOP[proceso.estadoSecop]}`}
                >
                  {ETIQUETAS_ESTADO_SECOP[proceso.estadoSecop]}
                </span>
              </td>
              <td className="px-6 py-4 max-w-[180px]">
                <p className="truncate font-medium text-slate-800">{proceso.entidad}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{proceso.idProceso}</p>
              </td>
              <td className="px-6 py-4 max-w-xs">
                <p className="truncate text-slate-500">{proceso.objeto}</p>
                {proceso.tipoContrato && <p className="text-xs text-slate-400 mt-0.5">{proceso.tipoContrato}</p>}
              </td>
              <td className="px-6 py-4 max-w-[180px]">
                <p className="truncate font-medium text-slate-800">{proceso.proveedorNombre ?? "—"}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{proceso.proveedorNit ?? ""}</p>
              </td>
              <td className="px-6 py-4 max-w-[180px]">
                {proceso.telefonoContacto || proceso.correoContacto || proceso.direccionContacto ? (
                  <div className="text-xs text-slate-600 space-y-0.5">
                    {proceso.telefonoContacto && <p>📞 {proceso.telefonoContacto}</p>}
                    {proceso.correoContacto && <p className="truncate">✉ {proceso.correoContacto}</p>}
                    {proceso.direccionContacto && <p className="truncate text-slate-400">{proceso.direccionContacto}</p>}
                  </div>
                ) : proceso.urlRues ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirBusquedaRues(proceso.urlRues!, proceso.proveedorNit);
                    }}
                    title="Copia el NIT y abre RUES — solo falta pegarlo y buscar"
                    className="text-xs font-medium text-indigo-500 hover:text-indigo-700"
                  >
                    Copiar NIT y buscar en RUES →
                  </button>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </td>
              <td className="px-6 py-4 text-right tabular-nums text-slate-700">{formatearMoneda(proceso.valor)}</td>
              <td className="px-6 py-4 text-center text-xs text-slate-500">
                {formatearFecha(proceso.fechaFirma ?? proceso.fechaAdjudicacion)}
              </td>
              <td className="px-6 py-4">
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${COLOR_ESTADO_COMERCIAL[proceso.estadoComercial]}`}
                >
                  {ETIQUETAS_ESTADO_COMERCIAL[proceso.estadoComercial]}
                </span>
              </td>
              <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                {proceso.urlProceso ? (
                  <a
                    href={proceso.urlProceso}
                    target="_blank"
                    rel="noreferrer"
                    className="whitespace-nowrap text-xs font-medium text-indigo-500 hover:text-indigo-700"
                  >
                    SECOP →
                  </a>
                ) : null}
              </td>
            </tr>
          ))}
          {procesos.length === 0 && (
            <tr>
              <td colSpan={9} className="py-16 text-center text-slate-400">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-sm font-medium">No hay procesos todavía</p>
                <p className="text-xs mt-1">El Agente Scout los irá agregando aquí cada 3 horas</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
