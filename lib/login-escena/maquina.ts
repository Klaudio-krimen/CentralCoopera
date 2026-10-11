export type EventoEscena =
  | "FOCO_CORREO"
  | "FOCO_CLAVE"
  | "BLUR"
  | "ACTIVIDAD"
  | "ERROR"
  | "EXITO"
  | "SALTAR";
export type Fase =
  | "OSCURO"
  | "ENTRA"
  | "BUSCA"
  | "ENCIENDE"
  | "REVELA"
  | "ILUMINADO"
  | "MIRA"
  | "TAPA_OJOS"
  | "ERROR"
  | "SENTADA"
  | "EXITO";
export interface Brazo {
  a: number;
  l: number;
}
export interface Operaria {
  x: number;
  face: number;
  walk: number | null;
  head: "normal" | "up" | "down";
  lean: number;
  bob: number;
  blink: boolean;
  sit: boolean;
  torch: boolean;
  armF: Brazo;
  armB: Brazo;
}
export interface Lampara {
  a: number;
  A: number;
  pull: number;
}
export interface EstadoEscena {
  fase: Fase;
  elapsed: number;
  reloj: number;
  inactividad: number;
  primera: boolean;
  reducido: boolean;
  foco: "correo" | "clave" | null;
  ch: Operaria;
  lamp: Lampara;
  light: { I: number; R: number; sweep: number };
  lever: number;
  formOp: number;
  x0: number;
  dW: number;
}
export const INTRO: ReadonlySet<Fase> = new Set([
  "OSCURO",
  "ENTRA",
  "BUSCA",
  "ENCIENDE",
  "REVELA",
]);
export const HOME = 185,
  SEAT = 128,
  LEVER_X = 199,
  RMAX = 172;
export const SUCCESS_MS = 700;

export function crearEstado(primera = false, reducido = false): EstadoEscena {
  return {
    fase: reducido ? "ILUMINADO" : "OSCURO",
    elapsed: 0,
    reloj: 0,
    inactividad: 0,
    primera,
    reducido,
    foco: null,
    ch: {
      x: primera && !reducido ? -14 : HOME,
      face: 1,
      walk: null,
      head: "normal",
      lean: 0,
      bob: 0,
      blink: false,
      sit: false,
      torch: false,
      armF: { a: 0.15, l: 8 },
      armB: { a: -0.12, l: 8 },
    },
    lamp: { a: 0, A: 0.025, pull: 0 },
    light: { I: reducido ? 1 : 0, R: reducido ? RMAX : 0, sweep: 0 },
    lever: 0,
    formOp: reducido ? 1 : 0.35,
    x0: HOME,
    dW: 0,
  };
}
function copiar(s: EstadoEscena): EstadoEscena {
  return {
    ...s,
    ch: { ...s.ch, armF: { ...s.ch.armF }, armB: { ...s.ch.armB } },
    lamp: { ...s.lamp },
    light: { ...s.light },
  };
}
function foco(s: EstadoEscena): Fase {
  return s.foco === "correo"
    ? "MIRA"
    : s.foco === "clave"
      ? "TAPA_OJOS"
      : "ILUMINADO";
}
function ir(s: EstadoEscena, fase: Fase) {
  s.fase = fase;
  s.elapsed = 0;
  if (fase !== "SENTADA") s.ch.sit = false;
  if (fase === "ENCIENDE") s.lamp.A = s.reducido ? 0 : 0.12;
}
function iluminar(s: EstadoEscena) {
  s.ch.x = HOME;
  s.ch.torch = false;
  s.lamp.pull = 0;
  s.light.I = 1;
  s.light.R = RMAX;
  s.formOp = 1;
  ir(s, foco(s));
}
function brazo(ch: Operaria, tx: number, ty: number): Brazo {
  const dx = (tx - (Math.round(ch.x) + ch.face * (1 + ch.lean))) * ch.face;
  const dy = ty - (150 - 19 + ch.bob);
  return { a: Math.atan2(dx, dy), l: Math.min(9, Math.hypot(dx, dy)) };
}
export function transicion(
  estado: EstadoEscena,
  evento: EventoEscena
): EstadoEscena {
  if (estado.fase === "EXITO") return estado;
  const s = copiar(estado);
  s.inactividad = 0;
  if (evento === "FOCO_CORREO") s.foco = "correo";
  if (evento === "FOCO_CLAVE") s.foco = "clave";
  if (evento === "BLUR") s.foco = null;
  if (INTRO.has(s.fase)) iluminar(s);
  if (evento === "EXITO") {
    s.x0 = s.ch.x;
    s.dW = s.reducido ? 0 : Math.min(300, Math.abs(LEVER_X - s.ch.x) / 0.25);
    ir(s, "EXITO");
    if (s.reducido) {
      s.ch.x = LEVER_X;
      s.lever = 1;
      s.light.sweep = 330;
    }
  } else if (evento === "ERROR") ir(s, s.reducido ? foco(s) : "ERROR");
  else if (evento === "FOCO_CORREO" || evento === "FOCO_CLAVE") ir(s, foco(s));
  else if (evento === "BLUR" && s.fase !== "ERROR") ir(s, foco(s));
  else if (s.fase === "SENTADA") ir(s, foco(s));
  return paso(s, 0);
}
export function paso(estado: EstadoEscena, dt: number): EstadoEscena {
  const s = copiar(estado),
    delta = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  s.elapsed += delta;
  s.reloj += delta;
  s.inactividad += delta;
  const ch = s.ch,
    lamp = s.lamp,
    light = s.light,
    e = s.elapsed,
    now = s.reloj;
  ch.walk = null;
  ch.head = "normal";
  ch.lean = 0;
  ch.torch = false;
  ch.armF = { a: 0.15, l: 8 };
  ch.armB = { a: -0.12, l: 8 };
  ch.blink = !s.reducido && now % 3400 < 130;
  ch.bob = !s.reducido && Math.floor(now / 850) % 2 === 1 ? -1 : 0;
  if (
    ["ILUMINADO", "MIRA", "TAPA_OJOS"].includes(s.fase) &&
    s.inactividad >= 30000
  )
    ir(s, "SENTADA");
  switch (s.fase) {
    case "OSCURO":
      light.I = 0;
      ch.torch = s.primera;
      if (e >= (s.primera ? 1000 : 300))
        ir(s, s.primera ? "ENTRA" : "ENCIENDE");
      break;
    case "ENTRA": {
      const k = Math.min(1, e / 2000);
      ch.x = -14 + (HOME + 14) * k;
      ch.face = 1;
      ch.walk = (e / 330) % 1;
      ch.torch = true;
      if (k >= 1) ir(s, "BUSCA");
      break;
    }
    case "BUSCA":
      ch.face = e < 380 ? -1 : 1;
      ch.head = e < 380 ? "normal" : "up";
      ch.torch = true;
      ch.armF = { a: e < 380 ? 1.35 : 2.35, l: 7 };
      if (e >= 760) ir(s, "ENCIENDE");
      break;
    case "ENCIENDE": {
      const duration = s.primera ? 700 : 520,
        p = e / duration;
      ch.face = 1;
      ch.head = "up";
      lamp.pull =
        e < 180
          ? Math.round((e / 180) * 3)
          : Math.max(0, Math.round(3 - (e - 180) / 70));
      ch.armF = brazo(ch, 189, 126 + lamp.pull);
      light.R = 40;
      light.I = s.primera
        ? p < 0.2 || (p >= 0.42 && p < 0.58) || p >= 0.76
          ? 1
          : 0.35
        : p < 0.36 || p >= 0.6
          ? 1
          : 0.4;
      if (e >= duration) ir(s, "REVELA");
      break;
    }
    case "REVELA": {
      const k = Math.min(1, e / (s.primera ? 800 : 600)),
        ease = 1 - Math.pow(1 - k, 3);
      light.I = 1;
      light.R = 40 + (RMAX - 40) * ease;
      s.formOp = 0.35 + 0.65 * ease;
      ch.head = k < 0.5 ? "up" : "normal";
      if (k >= 1) ir(s, foco(s));
      break;
    }
    case "ILUMINADO":
      ch.face = 1;
      break;
    case "MIRA":
      ch.face = 1;
      ch.head = "up";
      ch.lean = 1;
      ch.armF = { a: 0.35, l: 8 };
      break;
    case "TAPA_OJOS":
      ch.face = -1;
      ch.head = "down";
      ch.armF = { a: 2.75, l: 6 };
      ch.armB = { a: 2.55, l: 6 };
      ch.bob = 0;
      break;
    case "ERROR":
      ch.face = 1;
      ch.head = "down";
      ch.armF = { a: Math.PI - 0.12 + 0.18 * Math.sin(e / 55), l: 9 };
      light.I = e > 60 && e < 220 ? 0.45 : 1;
      if (e >= 1200) {
        light.I = 1;
        ir(s, foco(s));
      }
      break;
    case "SENTADA": {
      const dx = SEAT - ch.x;
      if (s.reducido || Math.abs(dx) < 0.6) {
        ch.x = SEAT;
        ch.sit = true;
      } else {
        ch.face = dx > 0 ? 1 : -1;
        ch.x += Math.sign(dx) * Math.min(Math.abs(dx), delta * 0.05);
        ch.walk = (now / 330) % 1;
      }
      if (ch.sit) {
        ch.face = 1;
        ch.head = "down";
        ch.armF = { a: 0.95, l: 7 };
        ch.armB = { a: 0.6, l: 7 };
      }
      break;
    }
    case "EXITO":
      if (e < s.dW) {
        ch.x = s.x0 + (LEVER_X - s.x0) * (e / s.dW);
        ch.face = LEVER_X >= s.x0 ? 1 : -1;
        ch.walk = (now / 330) % 1;
      } else {
        ch.x = LEVER_X;
        ch.face = 1;
        s.lever = s.reducido ? 1 : Math.min(1, (e - s.dW) / 200);
        ch.armF = brazo(ch, 207, 120 + 14 * s.lever);
        light.sweep = s.reducido
          ? 330
          : Math.max(
              0,
              Math.min(
                330,
                ((e - s.dW - 200) / Math.max(150, SUCCESS_MS - s.dW - 200)) *
                  330
              )
            );
      }
      break;
  }
  if (ch.walk !== null && !ch.sit) {
    const k = Math.sin(ch.walk * 2 * Math.PI);
    ch.armF = ch.torch ? { a: 1.3, l: 7 } : { a: 0.45 * k, l: 8 };
    ch.armB = { a: -0.45 * k, l: 8 };
    ch.bob = Math.sin(ch.walk * 4 * Math.PI) > 0.2 ? -1 : 0;
  }
  if (!INTRO.has(s.fase)) s.formOp = 1;
  else if (s.fase !== "REVELA") s.formOp = 0.35;
  if (s.reducido) {
    lamp.a = 0;
    s.formOp = 1;
    ch.blink = false;
    ch.bob = 0;
  } else {
    lamp.A += (0.025 - lamp.A) * Math.min(1, delta / 1400);
    lamp.a = lamp.A * Math.sin((now / 1700) * 2 * Math.PI);
  }
  return s;
}
