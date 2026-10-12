import { DISCO, WIDTH, HEIGHT } from "../../lib/login-escena/escala";
import { posicionLuz } from "../../lib/login-escena/luz";
import type { EstadoEscena } from "../../lib/login-escena/maquina";
import {
  HAZ,
  crearGrano,
  crearMotas,
  debeRecachear,
  intensidadRayo,
  intensidadHaz,
  xMota,
  yMota,
  brilloMota,
  pulsoRayo,
} from "../../lib/login-escena/atmosfera";

interface Superficie {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}
export interface CapaLuz {
  presentar(
    ctx: CanvasRenderingContext2D,
    buffer: HTMLCanvasElement,
    estado: EstadoEscena,
    escala: number
  ): void;
  destruir(): void;
}

// Las capas suaves usan 2 px por píxel lógico, no una copia 4K por efecto.
// El canvas de presentación conserva la resolución CSS e integer scaling del arte.
const RES = 2;
function superficie(ancho: number, alto: number): Superficie {
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible para la luz");
  return { canvas, ctx };
}
function limpiar(s: Superficie, escala = RES) {
  s.ctx.setTransform(1, 0, 0, 1, 0, 0);
  s.ctx.globalAlpha = 1;
  s.ctx.globalCompositeOperation = "source-over";
  desenfoque(s.ctx, 0);
  s.ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
  s.ctx.setTransform(escala, 0, 0, escala, 0, 0);
}
function desenfoque(ctx: CanvasRenderingContext2D, px: number) {
  // Canvas.filter es opcional: el mismo efecto sigue operativo sin blur.
  if (typeof ctx.filter === "string")
    ctx.filter = px ? `blur(${px}px)` : "none";
}

/** Composición decorativa sin listeners, temporizadores, RAF ni valores del formulario. */
export function crearCapaLuz(): CapaLuz {
  const gradacion = superficie(WIDTH * RES, HEIGHT * RES);
  const ambiente = superficie(WIDTH * RES, HEIGHT * RES);
  const vineta = superficie(WIDTH * RES, HEIGHT * RES);
  const lampara = superficie(140 * RES, 144 * RES);
  const halo = superficie(64 * RES, 64 * RES);
  const fuente = superficie(WIDTH, HEIGHT);
  const bloomMedio = superficie(WIDTH / 2, HEIGHT / 2);
  const bloomLejano = superficie(WIDTH / 4, HEIGHT / 4);
  const grano = superficie(256, 256);
  const rayos = Array.from({ length: 7 }, () =>
    superficie(128 * RES, 104 * RES)
  );
  const superficies = [
    gradacion,
    ambiente,
    vineta,
    lampara,
    halo,
    fuente,
    bloomMedio,
    bloomLejano,
    grano,
    ...rayos,
  ];
  const motas = crearMotas();
  const ruido = crearGrano();
  const textura = grano.ctx.createImageData(256, 256);
  for (let i = 0; i < ruido.length; i++) {
    const k = i * 4;
    textura.data[k] = textura.data[k + 1] = textura.data[k + 2] = ruido[i];
    textura.data[k + 3] = 255;
  }
  grano.ctx.putImageData(textura, 0, 0);
  const patron = grano.ctx.createPattern(grano.canvas, "repeat");
  let escalaAnterior = 0,
    albaAnterior = NaN,
    eliminado = false;
  construirLampara();
  construirRayos();

  function construirLampara() {
    limpiar(lampara);
    const c = lampara.ctx;
    const cone = c.createLinearGradient(0, 22, 0, 107);
    cone.addColorStop(0, "rgba(255,222,160,.30)");
    cone.addColorStop(1, "rgba(255,222,160,0)");
    c.fillStyle = cone;
    desenfoque(c, 2 * RES);
    c.beginPath();
    c.moveTo(65, 21);
    c.lineTo(75, 21);
    c.lineTo(110, 107);
    c.lineTo(30, 107);
    c.closePath();
    c.fill();
    desenfoque(c, 0);
    limpiar(halo);
    const glow = halo.ctx.createRadialGradient(32, 32, 0, 32, 32, 22);
    glow.addColorStop(0, "rgba(255,236,190,.55)");
    glow.addColorStop(0.25, "rgba(255,200,130,.18)");
    glow.addColorStop(1, "rgba(255,180,110,0)");
    halo.ctx.fillStyle = glow;
    halo.ctx.fillRect(10, 10, 44, 44);
    const ring = c.createRadialGradient(
      70,
      77,
      DISCO.r - 2,
      70,
      77,
      DISCO.r + 16
    );
    ring.addColorStop(0, "rgba(255,206,150,.30)");
    ring.addColorStop(1, "rgba(255,206,150,0)");
    c.fillStyle = ring;
    c.fillRect(0, 7, 140, 137);
  }
  function construirRayos() {
    for (let i = 0; i < rayos.length; i++) {
      const s = rayos[i],
        c = s.ctx;
      limpiar(s);
      const u = (i + 0.5) / 7;
      const x = 40 * u,
        ancho = 1.2 + (i % 3);
      const final = 94 * 0.55 + (40 + 94 * 0.3) * u;
      const g = c.createLinearGradient(0, 0, 0, 94);
      g.addColorStop(0, "rgba(255,220,170,.07)");
      g.addColorStop(1, "rgba(255,220,170,0)");
      c.fillStyle = g;
      desenfoque(c, RES);
      c.beginPath();
      c.moveTo(x, 4);
      c.lineTo(x + ancho, 4);
      c.lineTo(final + ancho * 2.4, 98);
      c.lineTo(final, 98);
      c.closePath();
      c.fill();
      desenfoque(c, 0);
    }
  }
  function construir(alba: number, escala: number, buffer: HTMLCanvasElement) {
    limpiar(gradacion);
    let c = gradacion.ctx;
    const g = c.createLinearGradient(0, 0, 0, HEIGHT);
    g.addColorStop(0, `rgba(120,110,190,${0.32 - 0.1 * alba})`);
    g.addColorStop(0.55, `rgba(200,140,150,${0.18 + 0.12 * alba})`);
    g.addColorStop(1, `rgba(255,170,120,${0.12 + 0.18 * alba})`);
    c.fillStyle = g;
    c.fillRect(0, 0, WIDTH, HEIGHT);

    limpiar(ambiente);
    c = ambiente.ctx;
    const intensidad = intensidadRayo(alba);
    const haz = c.createLinearGradient(42, 40, 110, 142);
    haz.addColorStop(0, `rgba(255,196,140,${0.3 * intensidad})`);
    haz.addColorStop(0.6, `rgba(255,160,120,${0.16 * intensidad})`);
    haz.addColorStop(1, "rgba(255,150,120,0)");
    c.fillStyle = haz;
    desenfoque(c, 2 * RES);
    c.beginPath();
    HAZ.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fill();
    desenfoque(c, 0);
    const charco = c.createRadialGradient(118, 146, 0, 118, 146, 48);
    charco.addColorStop(0, `rgba(255,190,130,${0.28 * intensidad})`);
    charco.addColorStop(1, "rgba(255,190,130,0)");
    c.fillStyle = charco;
    c.save();
    c.translate(0, 146);
    c.scale(1, 0.32);
    c.translate(0, -146);
    c.fillRect(60, 100, 120, 92);
    c.restore();
    const bruma = c.createLinearGradient(0, 120, 0, HEIGHT);
    bruma.addColorStop(0, "rgba(255,180,150,0)");
    bruma.addColorStop(1, `rgba(255,170,140,${0.06 + 0.06 * alba})`);
    c.fillStyle = bruma;
    c.fillRect(0, 120, WIDTH, 60);

    limpiar(vineta);
    c = vineta.ctx;
    const v = c.createRadialGradient(165, 88, 90, 165, 88, 215);
    v.addColorStop(0, "rgba(255,255,255,1)");
    v.addColorStop(1, "rgba(92,70,110,1)");
    c.fillStyle = v;
    c.fillRect(0, 0, WIDTH, HEIGHT);

    // Bloom exclusivamente de la ventana. No se escanea la escena ni se difumina
    // a Elizabeth/el aro: la otra fuente, la ampolleta, usa su halo local cacheado.
    limpiar(fuente, 1);
    fuente.ctx.imageSmoothingEnabled = false;
    fuente.ctx.drawImage(buffer, 22, 24, 40, 24, 22, 24, 40, 24);
    const emision = fuente.ctx.getImageData(22, 24, 40, 24);
    for (let k = 0; k < emision.data.length; k += 4) {
      const luminancia =
        0.299 * emision.data[k] +
        0.587 * emision.data[k + 1] +
        0.114 * emision.data[k + 2];
      if (luminancia <= 168) emision.data[k + 3] = 0;
    }
    fuente.ctx.putImageData(emision, 22, 24);
    for (const [bloom, blur] of [
      [bloomMedio, 1.5],
      [bloomLejano, 2],
    ] as const) {
      limpiar(bloom, 1);
      bloom.ctx.imageSmoothingEnabled = true;
      desenfoque(bloom.ctx, blur);
      bloom.ctx.drawImage(
        fuente.canvas,
        0,
        0,
        bloom.canvas.width,
        bloom.canvas.height
      );
      desenfoque(bloom.ctx, 0);
    }
    escalaAnterior = escala;
    albaAnterior = alba;
  }

  return {
    presentar(ctx, buffer, estado, escala) {
      if (eliminado) return;
      const alba = Math.max(0, Math.min(1, estado.alba));
      if (debeRecachear(escala, alba, escalaAnterior, albaAnterior))
        construir(alba, escala, buffer);
      const ancho = WIDTH * escala,
        alto = HEIGHT * escala;
      const reloj = estado.reducido ? 0 : estado.reloj;
      const rayo = intensidadRayo(alba);
      const lamp = posicionLuz(estado);
      ctx.save();
      try {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        desenfoque(ctx, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(buffer, 0, 0, ancho, alto);

        ctx.imageSmoothingEnabled = true;
        ctx.globalCompositeOperation = "soft-light";
        ctx.drawImage(gradacion.canvas, 0, 0, ancho, alto);
        ctx.globalCompositeOperation = "screen";
        ctx.drawImage(ambiente.canvas, 0, 0, ancho, alto);
        for (let i = 0; i < rayos.length; i++) {
          ctx.globalAlpha = rayo * pulsoRayo(i, reloj);
          ctx.drawImage(
            rayos[i].canvas,
            22 * escala,
            44 * escala,
            128 * escala,
            104 * escala
          );
        }
        ctx.globalAlpha = estado.light.I * Math.min(1, estado.light.R / 85);
        ctx.drawImage(
          lampara.canvas,
          (lamp.x - 70) * escala,
          (lamp.y - 22) * escala,
          140 * escala,
          144 * escala
        );
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(
          halo.canvas,
          (lamp.x - 32) * escala,
          (lamp.y - 32) * escala,
          64 * escala,
          64 * escala
        );
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ffd6a0";
        for (const mota of motas) {
          const x = xMota(mota, reloj),
            y = yMota(mota, reloj);
          const alpha = intensidadHaz(x, y) * rayo * brilloMota(mota, reloj);
          if (alpha <= 0.02) continue;
          ctx.globalAlpha = alpha;
          ctx.fillRect(
            Math.round(x) * escala,
            Math.round(y) * escala,
            escala,
            escala
          );
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(vineta.canvas, 0, 0, ancho, alto);
        // El paño es una fuente de luz: su arte pixel se repone limpio.
        ctx.globalCompositeOperation = "source-over";
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          buffer,
          22,
          24,
          40,
          24,
          22 * escala,
          24 * escala,
          40 * escala,
          24 * escala
        );
        ctx.imageSmoothingEnabled = true;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.38;
        ctx.drawImage(bloomMedio.canvas, 0, 0, ancho, alto);
        ctx.globalAlpha = 0.32;
        ctx.drawImage(bloomLejano.canvas, 0, 0, ancho, alto);
        if (patron) {
          ctx.globalCompositeOperation = "overlay";
          ctx.globalAlpha = 0.022;
          ctx.fillStyle = patron;
          ctx.fillRect(0, 0, ancho, alto);
        }

        // Reposición final, acotada al disco: ninguna gradación, mota, bloom,
        // viñeta ni grano puede alterar el azul exacto o la lectura del formulario.
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.imageSmoothingEnabled = false;
        ctx.beginPath();
        ctx.arc(
          DISCO.cx * escala,
          DISCO.cy * escala,
          DISCO.r * escala,
          0,
          Math.PI * 2
        );
        ctx.clip();
        ctx.drawImage(
          buffer,
          DISCO.cx - DISCO.r,
          DISCO.cy - DISCO.r,
          DISCO.r * 2,
          DISCO.r * 2,
          (DISCO.cx - DISCO.r) * escala,
          (DISCO.cy - DISCO.r) * escala,
          DISCO.r * 2 * escala,
          DISCO.r * 2 * escala
        );
      } finally {
        ctx.restore();
      }
    },
    destruir() {
      eliminado = true;
      for (const s of superficies) {
        s.canvas.width = 0;
        s.canvas.height = 0;
      }
    },
  };
}
