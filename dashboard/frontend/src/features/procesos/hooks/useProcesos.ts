import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as procesosApi from "../api";
import type { EstadoComercial } from "../../../types/proceso";

const PROCESOS_KEY = ["procesos"];

export function useProcesos(filtros: procesosApi.FiltrosProcesos = {}) {
  return useQuery({
    queryKey: [...PROCESOS_KEY, filtros],
    queryFn: () => procesosApi.listarProcesos(filtros),
  });
}

export function useProceso(id: string | null) {
  return useQuery({
    queryKey: [...PROCESOS_KEY, id],
    queryFn: () => procesosApi.obtenerProceso(id!),
    enabled: Boolean(id),
  });
}

export function useActualizarEstadoComercial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estadoComercial }: { id: string; estadoComercial: EstadoComercial }) =>
      procesosApi.actualizarEstadoComercial(id, estadoComercial),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROCESOS_KEY }),
  });
}

export function useActualizarNotas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notasComerciales }: { id: string; notasComerciales: string }) =>
      procesosApi.actualizarNotas(id, notasComerciales),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROCESOS_KEY }),
  });
}

export function useActualizarContacto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: procesosApi.DatosContacto }) =>
      procesosApi.actualizarContacto(id, datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROCESOS_KEY }),
  });
}
