import { useState } from "react";
import { useProcesos } from "./features/procesos/hooks/useProcesos";
import { ProcesosTable } from "./features/procesos/components/ProcesosTable";
import { ProcesoDetail } from "./features/procesos/components/ProcesoDetail";
import { ESTADOS_COMERCIALES, ESTADOS_SECOP, ETIQUETAS_ESTADO_COMERCIAL, ETIQUETAS_ESTADO_SECOP } from "./types/proceso";

function formatM(valor: number) {
  if (valor >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `$${(valor / 1_000).toFixed(0)}K`;
  return `$${valor}`;
}

function App() {
  const [estadoSecop, setEstadoSecop] = useState<string>("");
  const [estadoComercial, setEstadoComercial] = useState<string>("");
  const { data: procesos = [], isLoading, error } = useProcesos({ estadoSecop, estadoComercial });
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  const valorTotal = procesos.reduce((acc, p) => acc + (p.valor ?? 0), 0);
  const conContacto = procesos.filter((p) => p.telefonoContacto || p.correoContacto || p.direccionContacto).length;
  const nuevos = procesos.filter((p) => p.estadoComercial === "nuevo").length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl shadow-sm">
              🛡️
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Leads SECOP II</h1>
              <p className="text-xs text-slate-400">Procesos adjudicados y celebrados · Prospección de seguros</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Scout cada 3 horas
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon="📋" title="Procesos" value={procesos.length.toString()} sub="en el tablero" />
          <StatCard icon="💰" title="Valor total" value={formatM(valorTotal)} sub="contratado" color="emerald" />
          <StatCard icon="📇" title="Con contacto" value={conContacto.toString()} sub="teléfono/correo registrado" />
          <StatCard icon="🆕" title="Sin gestionar" value={nuevos.toString()} sub="estado nuevo" color={nuevos > 0 ? "amber" : "default"} />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <select
            value={estadoSecop}
            onChange={(e) => setEstadoSecop(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"
          >
            <option value="">Todos los estados SECOP</option>
            {ESTADOS_SECOP.map((e) => (
              <option key={e} value={e}>
                {ETIQUETAS_ESTADO_SECOP[e]}
              </option>
            ))}
          </select>
          <select
            value={estadoComercial}
            onChange={(e) => setEstadoComercial(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"
          >
            <option value="">Todos los estados comerciales</option>
            {ESTADOS_COMERCIALES.map((e) => (
              <option key={e} value={e}>
                {ETIQUETAS_ESTADO_COMERCIAL[e]}
              </option>
            ))}
          </select>
        </div>

        {isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
            Cargando procesos...
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            No se pudo conectar con la API del dashboard.
          </div>
        )}

        {!isLoading && !error && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-800">Procesos detectados</h2>
              <p className="mt-0.5 text-xs text-slate-400">Haz clic en cualquier fila para ver el detalle y contactar</p>
            </div>
            <ProcesosTable procesos={procesos} onSeleccionar={setSeleccionado} />
          </div>
        )}
      </main>

      {seleccionado && <ProcesoDetail id={seleccionado} onCerrar={() => setSeleccionado(null)} />}
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  sub,
  color = "default",
}: {
  icon: string;
  title: string;
  value: string;
  sub: string;
  color?: "default" | "emerald" | "amber";
}) {
  const valueColor = color === "emerald" ? "text-emerald-600" : color === "amber" ? "text-amber-600" : "text-slate-900";
  const borderColor = color === "amber" ? "border-amber-200" : "border-slate-200";

  return (
    <div className={`rounded-xl border bg-white px-4 py-4 shadow-sm ${borderColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

export default App;
