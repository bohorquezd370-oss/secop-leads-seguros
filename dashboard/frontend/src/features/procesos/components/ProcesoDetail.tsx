import { useEffect, useState } from "react";
import { useProceso, useActualizarEstadoComercial, useActualizarNotas, useActualizarContacto } from "../hooks/useProcesos";
import {
  COLOR_ESTADO_COMERCIAL,
  COLOR_ESTADO_SECOP,
  ESTADOS_COMERCIALES,
  ETIQUETAS_ESTADO_COMERCIAL,
  ETIQUETAS_ESTADO_SECOP,
} from "../../../types/proceso";
import { abrirBusquedaRues } from "../../../lib/rues";

function fmt(valor: number | null) {
  if (valor === null) return "—";
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function fmtFecha(fecha: string | null) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric" });
}

function Campo({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-700">{value || "—"}</p>
    </div>
  );
}

interface ProcesoDetailProps {
  id: string;
  onCerrar: () => void;
}

export function ProcesoDetail({ id, onCerrar }: ProcesoDetailProps) {
  const { data: proceso, isLoading } = useProceso(id);
  const actualizarEstadoComercial = useActualizarEstadoComercial();
  const actualizarNotas = useActualizarNotas();
  const actualizarContacto = useActualizarContacto();
  const [notas, setNotas] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");

  useEffect(() => {
    setNotas(proceso?.notasComerciales ?? "");
    setTelefono(proceso?.telefonoContacto ?? "");
    setCorreo(proceso?.correoContacto ?? "");
    setDireccion(proceso?.direccionContacto ?? "");
  }, [proceso?.notasComerciales, proceso?.telefonoContacto, proceso?.correoContacto, proceso?.direccionContacto]);

  const contactoSinCambios =
    !!proceso &&
    telefono === (proceso.telefonoContacto ?? "") &&
    correo === (proceso.correoContacto ?? "") &&
    direccion === (proceso.direccionContacto ?? "");

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm" onClick={onCerrar} />

      {/* Panel lateral derecho */}
      <div className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-6 py-4">
          {isLoading || !proceso ? (
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-slate-400">{proceso.idProceso}</p>
                <h2 className="mt-0.5 text-base font-bold text-slate-900 leading-snug">{proceso.entidad}</h2>
                <p className="mt-1 text-sm text-slate-500 line-clamp-2">{proceso.objeto}</p>
                <span
                  className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${COLOR_ESTADO_SECOP[proceso.estadoSecop]}`}
                >
                  {ETIQUETAS_ESTADO_SECOP[proceso.estadoSecop]}
                </span>
              </div>
              <button
                onClick={onCerrar}
                className="flex-shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Cuerpo */}
        {!isLoading && proceso && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Datos del proceso */}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Proceso</h3>
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Modalidad" value={proceso.modalidad} />
                <Campo label="Tipo de contrato" value={proceso.tipoContrato} />
                <Campo label="Valor" value={fmt(proceso.valor)} />
                <Campo label="Fecha" value={fmtFecha(proceso.fechaFirma ?? proceso.fechaAdjudicacion)} />
                <Campo label="Departamento entidad" value={proceso.departamentoEntidad} />
                <Campo label="Ciudad entidad" value={proceso.ciudadEntidad} />
              </div>
              {proceso.urlProceso && (
                <a
                  href={proceso.urlProceso}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-xs font-medium text-indigo-500 hover:text-indigo-700"
                >
                  Ver proceso en SECOP II →
                </a>
              )}
            </section>

            {/* Empresa adjudicataria + contacto */}
            <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Empresa adjudicataria
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Nombre / Razón social" value={proceso.proveedorNombre} />
                <Campo label="NIT" value={proceso.proveedorNit} />
                <Campo label="Departamento" value={proceso.proveedorDepartamento} />
                <Campo label="Ciudad" value={proceso.proveedorCiudad} />
                <Campo label="Representante legal" value={proceso.representanteLegalNombre} />
                <Campo label="Domicilio rep. legal" value={proceso.representanteLegalDireccion} />
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Contacto</p>
                <p className="mb-2 text-xs text-slate-400">
                  RUES público no publica teléfono/correo — regístralo aquí cuando lo consigas (llamando a
                  la entidad, buscando la empresa, etc.).
                </p>
                {proceso.urlRues && (
                  <button
                    onClick={() => abrirBusquedaRues(proceso.urlRues!, proceso.proveedorNit)}
                    title="Copia el NIT y abre RUES — solo falta pegarlo y buscar"
                    className="mb-3 inline-block text-xs font-medium text-indigo-500 hover:text-indigo-700"
                  >
                    Copiar NIT y confirmar en RUES →
                  </button>
                )}
                <div className="space-y-2">
                  <input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Teléfono"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none"
                  />
                  <input
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="Correo"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none"
                  />
                  <input
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Dirección"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() =>
                    actualizarContacto.mutate({
                      id: proceso.id,
                      datos: { telefonoContacto: telefono, correoContacto: correo, direccionContacto: direccion },
                    })
                  }
                  disabled={actualizarContacto.isPending || contactoSinCambios}
                  className="mt-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {actualizarContacto.isPending ? "Guardando..." : "Guardar contacto"}
                </button>
              </div>
            </section>

            {/* Estado comercial */}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Seguimiento comercial
              </h3>
              <div className="flex flex-wrap gap-2">
                {ESTADOS_COMERCIALES.map((estado) => (
                  <button
                    key={estado}
                    onClick={() => actualizarEstadoComercial.mutate({ id: proceso.id, estadoComercial: estado })}
                    disabled={actualizarEstadoComercial.isPending}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      proceso.estadoComercial === estado
                        ? COLOR_ESTADO_COMERCIAL[estado]
                        : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {ETIQUETAS_ESTADO_COMERCIAL[estado]}
                  </button>
                ))}
              </div>

              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas de seguimiento comercial (llamadas, cotizaciones enviadas, próximos pasos...)"
                rows={4}
                className="mt-4 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-700 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none"
              />
              <button
                onClick={() => actualizarNotas.mutate({ id: proceso.id, notasComerciales: notas })}
                disabled={actualizarNotas.isPending || notas === (proceso.notasComerciales ?? "")}
                className="mt-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {actualizarNotas.isPending ? "Guardando..." : "Guardar notas"}
              </button>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
