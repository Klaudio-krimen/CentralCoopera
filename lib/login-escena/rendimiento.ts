interface Muestra {
  instante: number;
  duracion: number;
}
export interface Monitor {
  inicio: number | null;
  muestras: Muestra[];
  estatico: boolean;
}
export function crearMonitor(): Monitor {
  return { inicio: null, muestras: [], estatico: false };
}
/** Ventana de tiempo real; el límite de dt de la animación no oculta frames lentos. */
export function registrarFrame(
  monitor: Monitor,
  instante: number,
  duracion: number
): Monitor {
  const inicio = monitor.inicio ?? instante;
  const muestras = [
    ...monitor.muestras.filter((m) => m.instante >= instante - 2000),
    { instante, duracion: Math.max(0, duracion) },
  ];
  const promedio =
    muestras.reduce((suma, muestra) => suma + muestra.duracion, 0) /
    muestras.length;
  return {
    inicio,
    muestras,
    estatico: instante - inicio >= 2000 && promedio > 50,
  };
}
