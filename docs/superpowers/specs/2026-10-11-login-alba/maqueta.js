(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // dawn/escala.ts
  var WIDTH = 320;
  var HEIGHT = 180;

  // escena/maquina.ts
  var maquina_exports = {};
  __export(maquina_exports, {
    HOME: () => HOME,
    INTRO: () => INTRO,
    LEVER_X: () => LEVER_X,
    RMAX: () => RMAX,
    SEAT: () => SEAT,
    SUCCESS_MS: () => SUCCESS_MS,
    crearEstado: () => crearEstado,
    paso: () => paso,
    transicion: () => transicion,
  });
  var INTRO = /* @__PURE__ */ new Set([
    "OSCURO",
    "ENTRA",
    "BUSCA",
    "ENCIENDE",
    "REVELA",
  ]);
  var HOME = 185;
  var SEAT = 128;
  var LEVER_X = 199;
  var RMAX = 172;
  var SUCCESS_MS = 700;
  function crearEstado(primera = false, reducido2 = false) {
    return {
      fase: reducido2 ? "ILUMINADO" : "OSCURO",
      elapsed: 0,
      reloj: 0,
      inactividad: 0,
      primera,
      reducido: reducido2,
      foco: null,
      ch: {
        x: primera && !reducido2 ? -14 : HOME,
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
      light: { I: reducido2 ? 1 : 0, R: reducido2 ? RMAX : 0, sweep: 0 },
      lever: 0,
      formOp: reducido2 ? 1 : 0.35,
      x0: HOME,
      dW: 0,
    };
  }
  function copiar(s) {
    return {
      ...s,
      ch: { ...s.ch, armF: { ...s.ch.armF }, armB: { ...s.ch.armB } },
      lamp: { ...s.lamp },
      light: { ...s.light },
    };
  }
  function foco(s) {
    return s.foco === "correo"
      ? "MIRA"
      : s.foco === "clave"
        ? "TAPA_OJOS"
        : "ILUMINADO";
  }
  function ir(s, fase) {
    s.fase = fase;
    s.elapsed = 0;
    if (fase !== "SENTADA") s.ch.sit = false;
    if (fase === "ENCIENDE") s.lamp.A = s.reducido ? 0 : 0.12;
  }
  function iluminar(s) {
    s.ch.x = HOME;
    s.ch.torch = false;
    s.lamp.pull = 0;
    s.light.I = 1;
    s.light.R = RMAX;
    s.formOp = 1;
    ir(s, foco(s));
  }
  function brazo(ch, tx, ty) {
    const dx = (tx - (Math.round(ch.x) + ch.face * (1 + ch.lean))) * ch.face;
    const dy = ty - (150 - 19 + ch.bob);
    return { a: Math.atan2(dx, dy), l: Math.min(9, Math.hypot(dx, dy)) };
  }
  function transicion(estado, evento) {
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
    else if (evento === "FOCO_CORREO" || evento === "FOCO_CLAVE")
      ir(s, foco(s));
    else if (evento === "BLUR" && s.fase !== "ERROR") ir(s, foco(s));
    else if (s.fase === "SENTADA") ir(s, foco(s));
    return paso(s, 0);
  }
  function paso(estado, dt) {
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
      s.inactividad >= 3e4
    )
      ir(s, "SENTADA");
    switch (s.fase) {
      case "OSCURO":
        light.I = 0;
        ch.torch = s.primera;
        if (e >= (s.primera ? 1e3 : 300))
          ir(s, s.primera ? "ENTRA" : "ENCIENDE");
        break;
      case "ENTRA": {
        const k = Math.min(1, e / 2e3);
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

  // escena/escala.ts
  var WIDTH2 = 320;
  var HEIGHT2 = 180;

  // escena/pincel.ts
  function R(p, x, y, w, h, color) {
    const left = Math.max(0, Math.trunc(x)),
      top = Math.max(0, Math.trunc(y));
    const right = Math.min(WIDTH2, Math.trunc(x) + w),
      bottom = Math.min(HEIGHT2, Math.trunc(y) + h);
    if (right > left && bottom > top)
      p.rect(left, top, right - left, bottom - top, color);
  }
  function line(p, x0, y0, x1, y1, color, t = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0),
      dy = -Math.abs(y1 - y0),
      sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      R(p, x0, y0, t, t, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) {
        e += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        e += dx;
        y0 += sy;
      }
    }
  }
  function crearPincel(buffer) {
    const cache = /* @__PURE__ */ new Map();
    return {
      rect(x, y, w, h, color) {
        let packed = cache.get(color);
        if (packed === void 0) {
          const n = parseInt(color.slice(1), 16);
          packed =
            (4278190080 |
              ((n & 255) << 16) |
              (n & 65280) |
              ((n >>> 16) & 255)) >>>
            0;
          cache.set(color, packed);
        }
        for (let row = y; row < y + h; row++)
          buffer.fill(packed, row * WIDTH2 + x, row * WIDTH2 + x + w);
      },
    };
  }

  // escena/paleta.ts
  var C = {
    sky: "#18264a",
    skyLow: "#2a4272",
    moon: "#efe9c8",
    star: "#c9d6ea",
    wallA: "#3b4252",
    wallB: "#333947",
    beam: "#4d5566",
    beamDark: "#252a35",
    floor: "#56585e",
    floorLine: "#494b51",
    floorHi: "#616369",
    safety: "#e0b434",
    rackPost: "#c4562c",
    rackBeam: "#2f5f8c",
    wood: "#b3844e",
    woodDark: "#7c5832",
    woodLight: "#d0a66c",
    gap: "#2b2219",
    bale: "#9f7d52",
    baleDark: "#7b603f",
    strap: "#30343b",
    box: "#b08d5e",
    tape: "#d8c08a",
    board: "#2a344d",
    boardFrame: "#5b4229",
    boardLight: "#7b5b39",
    bolt: "#9aa39e",
    green: "#2f9e5f",
    greenDark: "#22744a",
    skin: "#e2a97f",
    skinDark: "#bb815b",
    hair: "#3a2318",
    helmet: "#f2c230",
    helmetHi: "#ffe383",
    vest: "#f07a22",
    vestDark: "#c95e14",
    reflect: "#e4ebee",
    pants: "#2c3c5f",
    pantsDark: "#202c46",
    boots: "#4b3020",
    belt: "#26221f",
    metal: "#86948c",
    metalDark: "#525c58",
    metalHi: "#b4c0b9",
    cord: "#1b1c20",
    bulbOff: "#7d775f",
    bulb: "#fff4c8",
    glow: "#ffe39a",
    lever: "#c93b2c",
    leverBox: "#5e6772",
    leverBoxIn: "#444c56",
    tube: "#f3f9ff",
    dust: "#ffe6a8",
    eye: "#141414",
    // Emblema de Coopera Pro (logo oficial)
    brandBlue: "#2a344d",
    brandRim: "#1a2132",
    brandGreen: "#5bbd2f",
    brandCream: "#efe9cf",
    neon: "#8ae85a",
  };

  // escena/fuente.ts
  var GLYPHS = {
    A: "010101111101101",
    B: "110101110101110",
    C: "011100100100011",
    D: "110101101101110",
    E: "111100110100111",
    G: "011100101101011",
    O: "010101101101010",
    P: "110101110100100",
    R: "110101110101101",
    2: "110001010100111",
    " ": "000000000000000",
  };
  function texto(p, str, x, y, color) {
    for (const ch of str) {
      const glyph = GLYPHS[ch];
      if (glyph) {
        for (let i = 0; i < 15; i++)
          if (glyph[i] === "1")
            R(p, x + (i % 3), y + ((i / 3) | 0), 1, 1, color);
      }
      x += 4;
    }
  }

  // escena/emblema.ts
  var EMBLEMA = { cx: 106, cy: 36, r: 21 };
  var ICONO_RECICLAJE = [
    "........GG........",
    ".......GGGG.......",
    "......GG..GG.G....",
    ".....GG...GGGG....",
    "....GG....GGGGG...",
    "..........GGGG....",
    "..................",
    "..G...............",
    ".GGGG.........GG..",
    "GGGGG.........GG..",
    ".GGG...........GG.",
    ".GG............GG.",
    "GG..............GG",
    "GG.........G....GG",
    "GGGGGGG...GGGGGGGG",
    ".GGGGGG...GGGGGGG.",
    "...........GG.....",
  ];
  function dibujarEmblema(p, neon = false) {
    const { cx, cy, r } = EMBLEMA;
    if (neon) {
      const inner = (r + 0.5) * (r + 0.5),
        outer = (r + 1.6) * (r + 1.6);
      for (let y = -r - 2; y <= r + 2; y++)
        for (let x = -r - 2; x <= r + 2; x++) {
          const d = x * x + y * y;
          if (d > inner && d <= outer) R(p, cx + x, cy + y, 1, 1, C.brandGreen);
        }
    } else {
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++) {
          const d = x * x + y * y;
          if (d <= r * r + r * 0.6)
            R(
              p,
              cx + x,
              cy + y,
              1,
              1,
              d >= (r - 1) * (r - 1) ? C.brandRim : C.brandBlue
            );
        }
    }
    const ix = cx - 9,
      iy = cy - 16,
      green = neon ? C.neon : C.brandGreen;
    ICONO_RECICLAJE.forEach((row, j) => {
      for (let i = 0; i < row.length; i++)
        if (row[i] === "G") R(p, ix + i, iy + j, 1, 1, green);
    });
    if (!neon) {
      texto(p, "COOPERA", cx - 20, cy + 2, C.brandCream);
      texto(p, "PRO", cx + 8, cy + 2, C.brandGreen);
    }
  }

  // escena/fondo.ts
  var FIX = [26, 140, 236];
  function dibujarFondo(g) {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    function pallet(ctx, x, yb, w) {
      R(ctx, x, yb - 5, w, 2, C.wood);
      R(ctx, x, yb - 5, w, 1, C.woodLight);
      for (let i = 6; i < w - 1; i += 7)
        R(ctx, x + i, yb - 5, 1, 2, C.woodDark);
      R(ctx, x, yb - 3, w, 2, C.gap);
      for (const bx of [0, (w >> 1) - 1, w - 3])
        R(ctx, x + bx, yb - 3, 3, 2, C.woodDark);
      R(ctx, x, yb - 1, w, 1, C.wood);
    }
    function bale(ctx, x, y, w, h) {
      R(ctx, x, y, w, h, C.bale);
      for (let j = 1; j < h; j += 2) {
        let px = x;
        while (px < x + w) {
          const len = 2 + ((rnd() * 5) | 0);
          if (rnd() < 0.5)
            R(ctx, px, y + j, Math.min(len, x + w - px), 1, C.baleDark);
          px += len;
        }
      }
      R(ctx, x, y, w, 1, C.tape);
      R(ctx, x + 4, y, 1, h, C.strap);
      R(ctx, x + w - 5, y, 1, h, C.strap);
    }
    function box(ctx, x, y, w, h) {
      R(ctx, x, y, w, h, C.box);
      R(ctx, x, y, w, 1, C.tape);
      R(ctx, x + (w >> 1), y, 1, h, C.tape);
      R(ctx, x + w - 1, y, 1, h, C.baleDark);
    }
    R(g, 0, 0, WIDTH2, 142, C.wallA);
    for (let x = 0; x < WIDTH2; x += 4) R(g, x, 12, 2, 130, C.wallB);
    R(g, 0, 0, WIDTH2, 12, C.beamDark);
    R(g, 0, 10, WIDTH2, 2, C.beam);
    R(g, 0, 1, WIDTH2, 1, C.beam);
    for (let i = 0; i < WIDTH2; i += 16) {
      line(g, i, 10, i + 8, 2, C.beam);
      line(g, i + 8, 2, i + 16, 10, C.beam);
    }
    for (const fx of FIX) {
      R(g, fx, 13, 24, 1, C.metalDark);
      R(g, fx + 1, 14, 22, 2, C.metal);
    }
    R(g, 20, 22, 44, 28, C.beamDark);
    R(g, 22, 24, 40, 24, C.sky);
    R(g, 22, 41, 40, 7, C.skyLow);
    for (const [sx, sy] of [
      [25, 26],
      [31, 30],
      [37, 25],
      [47, 27],
      [59, 34],
      [27, 38],
      [50, 39],
      [35, 44],
    ])
      R(g, sx, sy, 1, 1, C.star);
    R(g, 41, 24, 2, 24, C.beamDark);
    R(g, 22, 35, 40, 2, C.beamDark);
    R(g, 18, 50, 48, 2, C.beam);
    dibujarEmblema(g);
    texto(g, "BODEGA 2", 91, 62, C.safety);
    for (const px of [6, 40, 74]) R(g, px, 52, 3, 90, C.rackPost);
    for (const by of [52, 82, 112]) R(g, 6, by, 71, 3, C.rackBeam);
    box(g, 10, 40, 14, 12);
    box(g, 26, 44, 11, 8);
    box(g, 46, 42, 16, 10);
    box(g, 10, 70, 12, 12);
    box(g, 23, 74, 13, 8);
    pallet(g, 44, 82, 28);
    bale(g, 46, 66, 24, 11);
    pallet(g, 9, 112, 29);
    box(g, 11, 98, 12, 9);
    box(g, 24, 100, 12, 7);
    bale(g, 44, 95, 27, 17);
    for (let k = 0; k < 5; k++) pallet(g, 9, 142 - k * 5, 29);
    for (let k = 0; k < 3; k++) pallet(g, 44, 142 - k * 5, 28);
    R(g, 0, 142, WIDTH2, 38, C.floor);
    R(g, 0, 142, WIDTH2, 1, C.floorLine);
    R(g, 0, 143, WIDTH2, 1, C.floorHi);
    R(g, 0, 156, WIDTH2, 1, C.floorLine);
    R(g, 0, 172, WIDTH2, 1, C.floorLine);
    for (let x = 20; x < WIDTH2; x += 52) {
      R(g, x, 143, 1, 13, C.floorLine);
      R(g, x - 10, 157, 1, 15, C.floorLine);
    }
    for (let x = 0; x < WIDTH2; x += 12) R(g, x, 164, 8, 2, C.safety);
    for (let k = 0; k < 11; k++) pallet(g, 84, 142 - k * 5, 28);
    pallet(g, 118, 142, 26);
    pallet(g, 118, 137, 26);
    bale(g, 176, 128, 22, 14);
    bale(g, 177, 114, 20, 14);
    R(g, 205, 12, 1, 112, C.metalDark);
    R(g, 202, 124, 7, 10, C.leverBox);
    R(g, 203, 125, 5, 8, C.leverBoxIn);
    R(g, 214, 22, 96, 114, C.boardFrame);
    R(g, 214, 22, 96, 1, C.boardLight);
    R(g, 214, 22, 1, 114, C.boardLight);
    R(g, 217, 25, 90, 108, C.board);
    for (const [bx, by] of [
      [215, 23],
      [308, 23],
      [215, 134],
      [308, 134],
    ])
      R(g, bx, by, 1, 1, C.bolt);
    R(g, 230, 136, 2, 6, C.boardFrame);
    R(g, 292, 136, 2, 6, C.boardFrame);
  }

  // escena/operaria.ts
  var GROUND = 150;
  function dibujarOperaria(ctx, ch) {
    const f = ch.face,
      X = Math.round(ch.x),
      Y = GROUND,
      b = ch.bob,
      l = ch.lean;
    const P = (dx, dy, w, h, c) =>
      R(ctx, f === 1 ? X + dx : X - dx - w + 1, Y + dy, w, h, c);
    const T = (dx, dy, w, h, c) => P(dx + l, dy + b, w, h, c);
    const LN = (ax, ay, bx, by, c, t) =>
      line(ctx, X + ax * f, Y + ay, X + bx * f, Y + by, c, t);
    const arm = (sx, a, len, sleeve, sleeveLen) => {
      const ox = sx + l,
        oy = -19 + b;
      const mx = ox + Math.sin(a) * sleeveLen,
        my = oy + Math.cos(a) * sleeveLen;
      const ex = ox + Math.sin(a) * len,
        ey2 = oy + Math.cos(a) * len;
      LN(ox, oy, mx, my, sleeve, 2);
      LN(mx, my, ex, ey2, C.skin, 2);
      return [X + Math.round(ex) * f, Y + Math.round(ey2)];
    };
    if (!ch.sit) R(ctx, X - 3, Y, 8, 1, C.floorLine);
    arm(0, ch.armB.a, ch.armB.l, C.greenDark, 3);
    if (ch.sit) {
      P(-1, -11, 7, 2, C.pants);
      P(4, -10, 2, 8, C.pants);
      P(4, -2, 4, 2, C.boots);
    } else {
      let fF = 0,
        fB = 0,
        lF = 0,
        lB = 0;
      if (ch.walk !== null) {
        const s = Math.sin(ch.walk * 2 * Math.PI);
        fF = Math.round(s * 3);
        fB = -fF;
        lF = s < -0.3 ? 1 : 0;
        lB = s > 0.3 ? 1 : 0;
      }
      LN(0, -11, fB, -3 - lB, C.pantsDark, 2);
      P(fB - 1, -2 - lB, 4, 2, C.boots);
      LN(1, -11, fF + 1, -3 - lF, C.pants, 2);
      P(fF, -2 - lF, 4, 2, C.boots);
    }
    T(-2, -20, 6, 9, C.green);
    T(-2, -20, 5, 7, C.vest);
    T(-2, -20, 1, 7, C.vestDark);
    T(-2, -16, 5, 1, C.reflect);
    T(-2, -12, 6, 1, C.belt);
    T(0, -21, 2, 1, C.skinDark);
    T(-2, -26, 5, 5, C.skin);
    T(-2, -26, 2, 5, C.hair);
    const pt =
      ch.walk !== null ? (Math.sin(ch.walk * 4 * Math.PI) > 0 ? 1 : 0) : 0;
    T(-4, -25 + pt, 2, 2, C.hair);
    T(-3, -24, 1, 1, C.hair);
    const ey = ch.head === "up" ? -25 : ch.head === "down" ? -23 : -24;
    T(3, ey + 1, 1, 1, C.skin);
    if (!ch.blink) T(1, ey, 1, 1, C.eye);
    if (ch.head === "down") T(1, -22, 2, 1, C.skinDark);
    T(-3, -28, 7, 2, C.helmet);
    T(-2, -29, 5, 1, C.helmet);
    T(4, -27, 1, 1, C.helmet);
    T(0, -29, 1, 1, C.helmetHi);
    T(-2, -28, 1, 1, C.green);
    const hand = arm(1, ch.armF.a, ch.armF.l, C.green, 3);
    if (ch.torch) {
      R(ctx, f === 1 ? hand[0] : hand[0] - 1, hand[1], 2, 2, C.metalDark);
    }
    return { x: hand[0] + f, y: hand[1] };
  }

  // escena/lampara.ts
  var lampara_exports = {};
  __export(lampara_exports, {
    dibujarLampara: () => dibujarLampara,
    dibujarPalanca: () => dibujarPalanca,
  });
  var LAMP_ANCHOR = 184;
  function dibujarLampara(ctx, lamp) {
    const L = 52,
      lx = LAMP_ANCHOR + Math.sin(lamp.a) * L,
      ly = 12 + Math.cos(lamp.a) * L;
    line(ctx, LAMP_ANCHOR, 12, lx, ly, C.cord, 1);
    const X = Math.round(lx),
      Y = Math.round(ly);
    R(ctx, X - 1, Y, 3, 1, C.metalDark);
    R(ctx, X - 3, Y + 1, 7, 1, C.metalDark);
    R(ctx, X - 4, Y + 2, 9, 1, C.metal);
    R(ctx, X - 3, Y + 2, 2, 1, C.metalHi);
    R(ctx, X - 5, Y + 3, 11, 1, C.metal);
    R(ctx, X - 6, Y + 4, 13, 1, C.metal);
    R(ctx, X - 7, Y + 5, 15, 1, C.metalDark);
    R(ctx, X - 2, Y + 6, 4, 2, C.bulbOff);
    const cx = X + 5,
      bot = 124 + lamp.pull;
    for (let y = Y + 6; y <= bot; y++)
      R(ctx, cx, y, 1, 1, y & 1 ? C.metal : C.metalDark);
    R(ctx, cx - 1, bot + 1, 3, 2, C.lever);
  }
  function dibujarPalanca(ctx, avance) {
    const ey = 120 + 14 * avance;
    line(ctx, 205, 128, 207, ey, C.metalHi, 1);
    R(ctx, 206, ey - 1, 3, 2, C.lever);
  }

  // escena/luz.ts
  var luz_exports = {};
  __export(luz_exports, {
    BAYER: () => BAYER,
    aplicarLuz: () => aplicarLuz,
    crearTablaSombreado: () => crearTablaSombreado,
    dibujarEmisivos: () => dibujarEmisivos,
    mapaLuna: () => mapaLuna,
    nivelLuz: () => nivelLuz,
    posicionLuz: () => posicionLuz,
  });
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
    (v) => v / 16
  );
  var LV = [
    [0.16, 0.18, 0.3],
    [0.42, 0.45, 0.6],
    [1, 0.91, 0.74],
    [1, 1, 1],
  ];
  function crearTablaSombreado() {
    const cache = /* @__PURE__ */ new Map();
    return (color) => {
      const existing = cache.get(color);
      if (existing) return existing;
      const r = color & 255,
        g = (color >>> 8) & 255,
        b = (color >>> 16) & 255;
      const shades = new Uint32Array(4);
      for (let i = 0; i < 4; i++)
        shades[i] =
          (4278190080 |
            (Math.floor(b * LV[i][2]) << 16) |
            (Math.floor(g * LV[i][1]) << 8) |
            Math.floor(r * LV[i][0])) >>>
          0;
      cache.set(color, shades);
      return shades;
    };
  }
  function mapaLuna() {
    const map = new Float32Array(WIDTH2 * HEIGHT2);
    for (let y = 0; y < HEIGHT2; y++)
      for (let x = 0; x < WIDTH2; x++) {
        if (x >= 22 && x < 62 && y >= 24 && y < 48) map[y * WIDTH2 + x] = 0.55;
        else if (
          y >= 50 &&
          x >= 22 + (y - 48) * 0.55 &&
          x <= 62 + (y - 48) * 0.85
        )
          map[y * WIDTH2 + x] = y > 142 ? 0.26 : 0.3;
      }
    return map;
  }
  function posicionLuz(s) {
    return {
      x: Math.round(184 + Math.sin(s.lamp.a) * 52),
      y: Math.round(12 + Math.cos(s.lamp.a) * 52) + 7,
    };
  }
  function nivelLuz(x, y, s, moon, hand, lamp = posicionLuz(s)) {
    if (x < s.light.sweep) return 3;
    let v = moon;
    if (s.light.I > 0 && s.light.R > 0) {
      const dx = x - lamp.x,
        dy = y - lamp.y;
      const d2 = dx * dx + dy * dy * (dy < 0 ? 5 : 0.75);
      if (d2 < s.light.R * s.light.R)
        v = Math.max(v, (1 - Math.sqrt(d2) / s.light.R) * s.light.I * 1.7);
    }
    if (s.ch.torch && s.light.I < 0.9) {
      const tx = x - hand.x,
        ty = y - hand.y;
      if (tx * s.ch.face > -2)
        v = Math.max(v, (1 - Math.sqrt(tx * tx + ty * ty * 1.6) / 38) * 1.45);
    }
    return Math.max(
      0,
      Math.min(2, Math.floor(v * 2 + BAYER[(y & 3) * 4 + (x & 3)]))
    );
  }
  function aplicarLuz(pixels, s, moon, hand, shades) {
    const lamp = posicionLuz(s);
    for (let y = 0; y < HEIGHT2; y++)
      for (let x = 0; x < WIDTH2; x++) {
        const i = y * WIDTH2 + x;
        pixels[i] = shades(pixels[i])[nivelLuz(x, y, s, moon[i], hand, lamp)];
      }
  }
  function dibujarEmisivos(p, s, hand) {
    for (let yy = -3; yy <= 3; yy++)
      for (let xx = -3; xx <= 3; xx++)
        if (xx * xx + yy * yy <= 9.5) R(p, 54 + xx, 30 + yy, 1, 1, C.moon);
    const lamp = posicionLuz(s);
    if (s.light.I > 0.6) {
      R(p, lamp.x - 2, lamp.y - 1, 4, 2, C.bulb);
      R(p, lamp.x - 1, lamp.y + 1, 2, 1, C.glow);
    }
    if (s.ch.torch && s.light.I < 0.9) R(p, hand.x, hand.y, 1, 1, C.bulb);
    for (const x of FIX) if (s.light.sweep > x) R(p, x + 1, 14, 22, 2, C.tube);
    if (s.light.sweep > EMBLEMA.cx + EMBLEMA.r) dibujarEmblema(p, true);
    if (!s.reducido && s.light.I > 0)
      for (let i = 0; i < 34; i++) {
        const x = Math.round(
          120 + ((i * 37) % 170) + Math.sin(s.reloj / 1400 + i) * 2
        );
        const y = Math.round(
          150 - ((i * 19 + s.reloj * 4e-3 * (0.6 + (i % 8) / 10)) % 116)
        );
        if (x < 214 && nivelLuz(x, y, s, 0, hand, lamp) >= 2)
          R(p, x, y, 1, 1, C.dust);
      }
  }

  // dawn/maquina.ts
  var INTRO2 = /* @__PURE__ */ new Set([
    "OSCURO",
    "ENTRA",
    "BUSCA",
    "ENCIENDE",
    "REVELA",
  ]);
  var HOME2 = 262;
  var SEAT2 = 128;
  var LEVER_X2 = 199;
  var RMAX2 = 172;
  var SUCCESS_MS2 = 700;
  function crearEstado2(primera = false, reducido2 = false) {
    return {
      fase: reducido2 ? "ILUMINADO" : "OSCURO",
      elapsed: 0,
      reloj: 0,
      inactividad: 0,
      primera,
      reducido: reducido2,
      foco: null,
      ch: {
        x: primera && !reducido2 ? -14 : HOME2,
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
      light: { I: reducido2 ? 1 : 0, R: reducido2 ? RMAX2 : 0, sweep: 0 },
      lever: 0,
      formOp: reducido2 ? 1 : 0.35,
      x0: HOME2,
      dW: 0,
    };
  }
  function copiar2(s) {
    return {
      ...s,
      ch: { ...s.ch, armF: { ...s.ch.armF }, armB: { ...s.ch.armB } },
      lamp: { ...s.lamp },
      light: { ...s.light },
    };
  }
  function foco2(s) {
    return s.foco === "correo"
      ? "MIRA"
      : s.foco === "clave"
        ? "TAPA_OJOS"
        : "ILUMINADO";
  }
  function ir2(s, fase) {
    s.fase = fase;
    s.elapsed = 0;
    if (fase !== "SENTADA") s.ch.sit = false;
    if (fase === "ENCIENDE") s.lamp.A = s.reducido ? 0 : 0.12;
  }
  function iluminar2(s) {
    s.ch.x = HOME2;
    s.ch.torch = false;
    s.lamp.pull = 0;
    s.light.I = 1;
    s.light.R = RMAX2;
    s.formOp = 1;
    ir2(s, foco2(s));
  }
  function brazo2(ch, tx, ty) {
    const dx = (tx - (Math.round(ch.x) + ch.face * (1 + ch.lean))) * ch.face;
    const dy = ty - (150 - 19 + ch.bob);
    return { a: Math.atan2(dx, dy), l: Math.min(9, Math.hypot(dx, dy)) };
  }
  function transicion2(estado, evento) {
    if (estado.fase === "EXITO") return estado;
    const s = copiar2(estado);
    s.inactividad = 0;
    if (evento === "FOCO_CORREO") s.foco = "correo";
    if (evento === "FOCO_CLAVE") s.foco = "clave";
    if (evento === "BLUR") s.foco = null;
    if (INTRO2.has(s.fase)) iluminar2(s);
    if (evento === "EXITO") {
      s.x0 = s.ch.x;
      s.dW = s.reducido ? 0 : Math.min(300, Math.abs(LEVER_X2 - s.ch.x) / 0.25);
      ir2(s, "EXITO");
      if (s.reducido) {
        s.ch.x = LEVER_X2;
        s.lever = 1;
        s.light.sweep = 330;
      }
    } else if (evento === "ERROR") ir2(s, s.reducido ? foco2(s) : "ERROR");
    else if (evento === "FOCO_CORREO" || evento === "FOCO_CLAVE")
      ir2(s, foco2(s));
    else if (evento === "BLUR" && s.fase !== "ERROR") ir2(s, foco2(s));
    else if (s.fase === "SENTADA") ir2(s, foco2(s));
    return paso2(s, 0);
  }
  function paso2(estado, dt) {
    const s = copiar2(estado),
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
      s.inactividad >= 3e4
    )
      ir2(s, "SENTADA");
    switch (s.fase) {
      case "OSCURO":
        light.I = 0;
        ch.torch = s.primera;
        if (e >= (s.primera ? 1e3 : 300))
          ir2(s, s.primera ? "ENTRA" : "ENCIENDE");
        break;
      case "ENTRA": {
        const k = Math.min(1, e / 2e3);
        ch.x = -14 + (HOME2 + 14) * k;
        ch.face = 1;
        ch.walk = (e / 330) % 1;
        ch.torch = true;
        if (k >= 1) ir2(s, "BUSCA");
        break;
      }
      case "BUSCA":
        ch.face = e < 380 ? -1 : 1;
        ch.head = e < 380 ? "normal" : "up";
        ch.torch = true;
        ch.armF = { a: e < 380 ? 1.35 : 2.35, l: 7 };
        if (e >= 760) ir2(s, "ENCIENDE");
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
        ch.armF = brazo2(ch, 189, 126 + lamp.pull);
        light.R = 40;
        light.I = s.primera
          ? p < 0.2 || (p >= 0.42 && p < 0.58) || p >= 0.76
            ? 1
            : 0.35
          : p < 0.36 || p >= 0.6
            ? 1
            : 0.4;
        if (e >= duration) ir2(s, "REVELA");
        break;
      }
      case "REVELA": {
        const k = Math.min(1, e / (s.primera ? 800 : 600)),
          ease = 1 - Math.pow(1 - k, 3);
        light.I = 1;
        light.R = 40 + (RMAX2 - 40) * ease;
        s.formOp = 0.35 + 0.65 * ease;
        ch.head = k < 0.5 ? "up" : "normal";
        if (k >= 1) ir2(s, foco2(s));
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
          ir2(s, foco2(s));
        }
        break;
      case "SENTADA": {
        const dx = SEAT2 - ch.x;
        if (s.reducido || Math.abs(dx) < 0.6) {
          ch.x = SEAT2;
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
          ch.x = s.x0 + (LEVER_X2 - s.x0) * (e / s.dW);
          ch.face = LEVER_X2 >= s.x0 ? 1 : -1;
          ch.walk = (now / 330) % 1;
        } else {
          ch.x = LEVER_X2;
          ch.face = 1;
          s.lever = s.reducido ? 1 : Math.min(1, (e - s.dW) / 200);
          ch.armF = brazo2(ch, 207, 120 + 14 * s.lever);
          light.sweep = s.reducido
            ? 330
            : Math.max(
                0,
                Math.min(
                  330,
                  ((e - s.dW - 200) / Math.max(150, SUCCESS_MS2 - s.dW - 200)) *
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
    if (!INTRO2.has(s.fase)) s.formOp = 1;
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

  // dawn/pincel.ts
  function R2(p, x, y, w, h, color) {
    const left = Math.max(0, Math.trunc(x)),
      top = Math.max(0, Math.trunc(y));
    const right = Math.min(WIDTH, Math.trunc(x) + w),
      bottom = Math.min(HEIGHT, Math.trunc(y) + h);
    if (right > left && bottom > top)
      p.rect(left, top, right - left, bottom - top, color);
  }
  function line2(p, x0, y0, x1, y1, color, t = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0),
      dy = -Math.abs(y1 - y0),
      sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      R2(p, x0, y0, t, t, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) {
        e += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        e += dx;
        y0 += sy;
      }
    }
  }
  function crearPincel2(buffer) {
    const cache = /* @__PURE__ */ new Map();
    return {
      rect(x, y, w, h, color) {
        let packed = cache.get(color);
        if (packed === void 0) {
          const n = parseInt(color.slice(1), 16);
          packed =
            (4278190080 |
              ((n & 255) << 16) |
              (n & 65280) |
              ((n >>> 16) & 255)) >>>
            0;
          cache.set(color, packed);
        }
        for (let row = y; row < y + h; row++)
          buffer.fill(packed, row * WIDTH + x, row * WIDTH + x + w);
      },
    };
  }

  // dawn/paleta.ts
  var C2 = {
    sky: "#18264a",
    skyLow: "#2a4272",
    moon: "#efe9c8",
    star: "#c9d6ea",
    wallA: "#3b4252",
    wallB: "#333947",
    beam: "#4d5566",
    beamDark: "#252a35",
    floor: "#56585e",
    floorLine: "#494b51",
    floorHi: "#616369",
    safety: "#e0b434",
    rackPost: "#c4562c",
    rackBeam: "#2f5f8c",
    wood: "#b3844e",
    woodDark: "#7c5832",
    woodLight: "#d0a66c",
    gap: "#2b2219",
    bale: "#9f7d52",
    baleDark: "#7b603f",
    strap: "#30343b",
    box: "#b08d5e",
    tape: "#d8c08a",
    board: "#2a344d",
    boardFrame: "#5b4229",
    boardLight: "#7b5b39",
    bolt: "#9aa39e",
    green: "#2f9e5f",
    greenDark: "#22744a",
    skin: "#e2a97f",
    skinDark: "#bb815b",
    hair: "#3a2318",
    helmet: "#f2c230",
    helmetHi: "#ffe383",
    vest: "#f07a22",
    vestDark: "#c95e14",
    reflect: "#e4ebee",
    pants: "#2c3c5f",
    pantsDark: "#202c46",
    boots: "#4b3020",
    belt: "#26221f",
    metal: "#86948c",
    metalDark: "#525c58",
    metalHi: "#b4c0b9",
    cord: "#1b1c20",
    bulbOff: "#7d775f",
    bulb: "#fff4c8",
    glow: "#ffe39a",
    lever: "#c93b2c",
    leverBox: "#5e6772",
    leverBoxIn: "#444c56",
    tube: "#f3f9ff",
    dust: "#ffe6a8",
    eye: "#141414",
    // Emblema de Coopera Pro (logo oficial)
    brandBlue: "#2a344d",
    brandRim: "#1a2132",
    brandGreen: "#5bbd2f",
    brandCream: "#efe9cf",
    neon: "#8ae85a",
  };

  // dawn/fuente.ts
  var GLYPHS2 = {
    A: "010101111101101",
    B: "110101110101110",
    C: "011100100100011",
    D: "110101101101110",
    E: "111100110100111",
    G: "011100101101011",
    O: "010101101101010",
    P: "110101110100100",
    R: "110101110101101",
    2: "110001010100111",
    " ": "000000000000000",
  };
  function texto2(p, str, x, y, color) {
    for (const ch of str) {
      const glyph = GLYPHS2[ch];
      if (glyph) {
        for (let i = 0; i < 15; i++)
          if (glyph[i] === "1")
            R2(p, x + (i % 3), y + ((i / 3) | 0), 1, 1, color);
      }
      x += 4;
    }
  }

  // dawn/emblema.ts
  var EMBLEMA2 = { cx: 106, cy: 36, r: 21 };
  var ICONO_RECICLAJE2 = [
    "........GG........",
    ".......GGGG.......",
    "......GG..GG.G....",
    ".....GG...GGGG....",
    "....GG....GGGGG...",
    "..........GGGG....",
    "..................",
    "..G...............",
    ".GGGG.........GG..",
    "GGGGG.........GG..",
    ".GGG...........GG.",
    ".GG............GG.",
    "GG..............GG",
    "GG.........G....GG",
    "GGGGGGG...GGGGGGGG",
    ".GGGGGG...GGGGGGG.",
    "...........GG.....",
  ];
  function dibujarEmblema2(p, neon = false) {
    const { cx, cy, r } = EMBLEMA2;
    if (neon) {
      const inner = (r + 0.5) * (r + 0.5),
        outer = (r + 1.6) * (r + 1.6);
      for (let y = -r - 2; y <= r + 2; y++)
        for (let x = -r - 2; x <= r + 2; x++) {
          const d = x * x + y * y;
          if (d > inner && d <= outer)
            R2(p, cx + x, cy + y, 1, 1, C2.brandGreen);
        }
    } else {
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++) {
          const d = x * x + y * y;
          if (d <= r * r + r * 0.6)
            R2(
              p,
              cx + x,
              cy + y,
              1,
              1,
              d >= (r - 1) * (r - 1) ? C2.brandRim : C2.brandBlue
            );
        }
    }
    const ix = cx - 9,
      iy = cy - 16,
      green = neon ? C2.neon : C2.brandGreen;
    ICONO_RECICLAJE2.forEach((row, j) => {
      for (let i = 0; i < row.length; i++)
        if (row[i] === "G") R2(p, ix + i, iy + j, 1, 1, green);
    });
    if (!neon) {
      texto2(p, "COOPERA", cx - 20, cy + 2, C2.brandCream);
      texto2(p, "PRO", cx + 8, cy + 2, C2.brandGreen);
    }
  }

  // dawn/fondo.ts
  var FIX2 = [26, 140, 236];
  function dibujarFondo2(g) {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    function pallet(ctx, x, yb, w) {
      R2(ctx, x, yb - 5, w, 2, C2.wood);
      R2(ctx, x, yb - 5, w, 1, C2.woodLight);
      for (let i = 6; i < w - 1; i += 7)
        R2(ctx, x + i, yb - 5, 1, 2, C2.woodDark);
      R2(ctx, x, yb - 3, w, 2, C2.gap);
      for (const bx of [0, (w >> 1) - 1, w - 3])
        R2(ctx, x + bx, yb - 3, 3, 2, C2.woodDark);
      R2(ctx, x, yb - 1, w, 1, C2.wood);
    }
    function bale(ctx, x, y, w, h) {
      R2(ctx, x, y, w, h, C2.bale);
      for (let j = 1; j < h; j += 2) {
        let px = x;
        while (px < x + w) {
          const len = 2 + ((rnd() * 5) | 0);
          if (rnd() < 0.5)
            R2(ctx, px, y + j, Math.min(len, x + w - px), 1, C2.baleDark);
          px += len;
        }
      }
      R2(ctx, x, y, w, 1, C2.tape);
      R2(ctx, x + 4, y, 1, h, C2.strap);
      R2(ctx, x + w - 5, y, 1, h, C2.strap);
    }
    function box(ctx, x, y, w, h) {
      R2(ctx, x, y, w, h, C2.box);
      R2(ctx, x, y, w, 1, C2.tape);
      R2(ctx, x + (w >> 1), y, 1, h, C2.tape);
      R2(ctx, x + w - 1, y, 1, h, C2.baleDark);
    }
    R2(g, 0, 0, WIDTH, 142, C2.wallA);
    for (let x = 0; x < WIDTH; x += 4) R2(g, x, 12, 2, 130, C2.wallB);
    R2(g, 0, 0, WIDTH, 12, C2.beamDark);
    R2(g, 0, 10, WIDTH, 2, C2.beam);
    R2(g, 0, 1, WIDTH, 1, C2.beam);
    for (let i = 0; i < WIDTH; i += 16) {
      line2(g, i, 10, i + 8, 2, C2.beam);
      line2(g, i + 8, 2, i + 16, 10, C2.beam);
    }
    for (const fx of FIX2) {
      R2(g, fx, 13, 24, 1, C2.metalDark);
      R2(g, fx + 1, 14, 22, 2, C2.metal);
    }
    R2(g, 20, 22, 44, 28, C2.beamDark);
    R2(g, 22, 24, 40, 24, "#ff00ff");
    R2(g, 41, 24, 2, 24, C2.beamDark);
    R2(g, 22, 35, 40, 2, C2.beamDark);
    R2(g, 18, 50, 48, 2, C2.beam);
    dibujarEmblema2(g);
    texto2(g, "BODEGA 2", 91, 62, C2.safety);
    for (const px of [6, 40, 74]) R2(g, px, 52, 3, 90, C2.rackPost);
    for (const by of [52, 82, 112]) R2(g, 6, by, 71, 3, C2.rackBeam);
    box(g, 10, 40, 14, 12);
    box(g, 64, 44, 10, 8);
    box(g, 10, 70, 12, 12);
    box(g, 23, 74, 13, 8);
    pallet(g, 44, 82, 28);
    bale(g, 46, 66, 24, 11);
    pallet(g, 9, 112, 29);
    box(g, 11, 98, 12, 9);
    box(g, 24, 100, 12, 7);
    bale(g, 44, 95, 27, 17);
    for (let k = 0; k < 5; k++) pallet(g, 9, 142 - k * 5, 29);
    for (let k = 0; k < 3; k++) pallet(g, 44, 142 - k * 5, 28);
    R2(g, 0, 142, WIDTH, 38, C2.floor);
    R2(g, 0, 142, WIDTH, 1, C2.floorLine);
    R2(g, 0, 143, WIDTH, 1, C2.floorHi);
    R2(g, 0, 156, WIDTH, 1, C2.floorLine);
    R2(g, 0, 172, WIDTH, 1, C2.floorLine);
    for (let x = 20; x < WIDTH; x += 52) {
      R2(g, x, 143, 1, 13, C2.floorLine);
      R2(g, x - 10, 157, 1, 15, C2.floorLine);
    }
    for (let x = 0; x < WIDTH; x += 12) R2(g, x, 164, 8, 2, C2.safety);
    for (let k = 0; k < 11; k++) pallet(g, 84, 142 - k * 5, 28);
    pallet(g, 118, 142, 26);
    pallet(g, 118, 137, 26);
    bale(g, 176, 128, 22, 14);
    bale(g, 177, 114, 20, 14);
    R2(g, 205, 12, 1, 112, C2.metalDark);
    R2(g, 202, 124, 7, 10, C2.leverBox);
    R2(g, 203, 125, 5, 8, C2.leverBoxIn);
  }

  // dawn/operaria.ts
  var GROUND2 = 150;
  function dibujarOperaria2(ctx, ch) {
    const f = ch.face,
      X = Math.round(ch.x),
      Y = GROUND2,
      b = ch.bob,
      l = ch.lean;
    const P = (dx, dy, w, h, c) =>
      R2(ctx, f === 1 ? X + dx : X - dx - w + 1, Y + dy, w, h, c);
    const T = (dx, dy, w, h, c) => P(dx + l, dy + b, w, h, c);
    const LN = (ax, ay, bx, by, c, t) =>
      line2(ctx, X + ax * f, Y + ay, X + bx * f, Y + by, c, t);
    const arm = (sx, a, len, sleeve, sleeveLen) => {
      const ox = sx + l,
        oy = -19 + b;
      const mx = ox + Math.sin(a) * sleeveLen,
        my = oy + Math.cos(a) * sleeveLen;
      const ex = ox + Math.sin(a) * len,
        ey2 = oy + Math.cos(a) * len;
      LN(ox, oy, mx, my, sleeve, 2);
      LN(mx, my, ex, ey2, C2.skin, 2);
      return [X + Math.round(ex) * f, Y + Math.round(ey2)];
    };
    if (!ch.sit) R2(ctx, X - 3, Y, 8, 1, C2.floorLine);
    arm(0, ch.armB.a, ch.armB.l, C2.greenDark, 3);
    if (ch.sit) {
      P(-1, -11, 7, 2, C2.pants);
      P(4, -10, 2, 8, C2.pants);
      P(4, -2, 4, 2, C2.boots);
    } else {
      let fF = 0,
        fB = 0,
        lF = 0,
        lB = 0;
      if (ch.walk !== null) {
        const s = Math.sin(ch.walk * 2 * Math.PI);
        fF = Math.round(s * 3);
        fB = -fF;
        lF = s < -0.3 ? 1 : 0;
        lB = s > 0.3 ? 1 : 0;
      }
      LN(0, -11, fB, -3 - lB, C2.pantsDark, 2);
      P(fB - 1, -2 - lB, 4, 2, C2.boots);
      LN(1, -11, fF + 1, -3 - lF, C2.pants, 2);
      P(fF, -2 - lF, 4, 2, C2.boots);
    }
    T(-2, -20, 6, 9, C2.green);
    T(-2, -20, 5, 7, C2.vest);
    T(-2, -20, 1, 7, C2.vestDark);
    T(-2, -16, 5, 1, C2.reflect);
    T(-2, -12, 6, 1, C2.belt);
    T(0, -21, 2, 1, C2.skinDark);
    T(-2, -26, 5, 5, C2.skin);
    T(-2, -26, 2, 5, C2.hair);
    const pt =
      ch.walk !== null ? (Math.sin(ch.walk * 4 * Math.PI) > 0 ? 1 : 0) : 0;
    T(-4, -25 + pt, 2, 2, C2.hair);
    T(-3, -24, 1, 1, C2.hair);
    const ey = ch.head === "up" ? -25 : ch.head === "down" ? -23 : -24;
    T(3, ey + 1, 1, 1, C2.skin);
    if (!ch.blink) T(1, ey, 1, 1, C2.eye);
    if (ch.head === "down") T(1, -22, 2, 1, C2.skinDark);
    T(-3, -28, 7, 2, C2.helmet);
    T(-2, -29, 5, 1, C2.helmet);
    T(4, -27, 1, 1, C2.helmet);
    T(0, -29, 1, 1, C2.helmetHi);
    T(-2, -28, 1, 1, C2.green);
    const hand = arm(1, ch.armF.a, ch.armF.l, C2.green, 3);
    if (ch.torch) {
      R2(ctx, f === 1 ? hand[0] : hand[0] - 1, hand[1], 2, 2, C2.metalDark);
    }
    return { x: hand[0] + f, y: hand[1] };
  }

  // dawn/lampara.ts
  var LAMP_ANCHOR2 = 184;
  function dibujarLampara2(ctx, lamp) {
    const L = 24,
      lx = LAMP_ANCHOR2 + Math.sin(lamp.a) * L,
      ly = 12 + Math.cos(lamp.a) * L;
    line2(ctx, LAMP_ANCHOR2, 12, lx, ly, C2.cord, 1);
    const X = Math.round(lx),
      Y = Math.round(ly);
    R2(ctx, X - 1, Y, 3, 1, C2.metalDark);
    R2(ctx, X - 3, Y + 1, 7, 1, C2.metalDark);
    R2(ctx, X - 4, Y + 2, 9, 1, C2.metal);
    R2(ctx, X - 3, Y + 2, 2, 1, C2.metalHi);
    R2(ctx, X - 5, Y + 3, 11, 1, C2.metal);
    R2(ctx, X - 6, Y + 4, 13, 1, C2.metal);
    R2(ctx, X - 7, Y + 5, 15, 1, C2.metalDark);
    R2(ctx, X - 2, Y + 6, 4, 2, C2.bulbOff);
    const cx = X + 5,
      bot = 124 + lamp.pull;
    for (let y = Y + 6; y <= bot; y++)
      R2(ctx, cx, y, 1, 1, y & 1 ? C2.metal : C2.metalDark);
    R2(ctx, cx - 1, bot + 1, 3, 2, C2.lever);
  }
  function dibujarPalanca2(ctx, avance) {
    const ey = 120 + 14 * avance;
    line2(ctx, 205, 128, 207, ey, C2.metalHi, 1);
    R2(ctx, 206, ey - 1, 3, 2, C2.lever);
  }

  // dawn/luz.ts
  var BAYER2 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
    (v) => v / 16
  );
  var LV2 = [
    [0.36, 0.3, 0.44],
    [0.8, 0.66, 0.7],
    [1, 0.92, 0.76],
    [1, 1, 1],
    [1, 0.72, 0.56],
    // 4: rayo de sol que entra por la ventana
  ];
  function crearTablaSombreado2() {
    const cache = /* @__PURE__ */ new Map();
    return (color) => {
      const existing = cache.get(color);
      if (existing) return existing;
      const r = color & 255,
        g = (color >>> 8) & 255,
        b = (color >>> 16) & 255;
      const shades = new Uint32Array(5);
      for (let i = 0; i < 5; i++)
        shades[i] =
          (4278190080 |
            (Math.floor(b * LV2[i][2]) << 16) |
            (Math.floor(g * LV2[i][1]) << 8) |
            Math.floor(r * LV2[i][0])) >>>
          0;
      cache.set(color, shades);
      return shades;
    };
  }
  function mapaLuna2() {
    const map = new Float32Array(WIDTH * HEIGHT);
    for (let y = 0; y < HEIGHT; y++)
      for (let x = 0; x < WIDTH; x++) {
        if (x >= 22 && x < 62 && y >= 24 && y < 48) map[y * WIDTH + x] = 0.55;
        else if (
          y >= 50 &&
          x >= 22 + (y - 48) * 0.55 &&
          x <= 62 + (y - 48) * 0.85
        )
          map[y * WIDTH + x] = y > 142 ? 0.26 : 0.3;
      }
    return map;
  }
  function posicionLuz2(s) {
    return {
      x: Math.round(184 + Math.sin(s.lamp.a) * 24),
      y: Math.round(12 + Math.cos(s.lamp.a) * 24) + 7,
    };
  }
  function nivelLuz2(x, y, s, moon, hand, lamp = posicionLuz2(s)) {
    if (x < s.light.sweep) return 3;
    let v = moon;
    if (s.light.I > 0 && s.light.R > 0) {
      const dx = x - lamp.x,
        dy = y - lamp.y;
      const d2 = dx * dx + dy * dy * (dy < 0 ? 5 : 0.75);
      if (d2 < s.light.R * s.light.R)
        v = Math.max(v, (1 - Math.sqrt(d2) / s.light.R) * s.light.I * 1.7);
    }
    if (s.ch.torch && s.light.I < 0.9) {
      const tx = x - hand.x,
        ty = y - hand.y;
      if (tx * s.ch.face > -2)
        v = Math.max(v, (1 - Math.sqrt(tx * tx + ty * ty * 1.6) / 38) * 1.45);
    }
    return Math.max(
      0,
      Math.min(2, Math.floor(v * 2 + BAYER2[(y & 3) * 4 + (x & 3)]))
    );
  }
  function aplicarLuz2(pixels, s, moon, hand, shades) {
    const lamp = posicionLuz2(s);
    for (let y = 0; y < HEIGHT; y++)
      for (let x = 0; x < WIDTH; x++) {
        const i = y * WIDTH + x;
        {
          const n = nivelLuz2(x, y, s, moon[i], hand, lamp);
          pixels[i] = shades(pixels[i])[n === 1 && moon[i] > 0 ? 4 : n];
        }
      }
  }
  function dibujarEmisivos2(p, s, hand) {
    const lamp = posicionLuz2(s);
    if (s.light.I > 0.6) {
      R2(p, lamp.x - 2, lamp.y - 1, 4, 2, C2.bulb);
      R2(p, lamp.x - 1, lamp.y + 1, 2, 1, C2.glow);
    }
    if (s.ch.torch && s.light.I < 0.9) R2(p, hand.x, hand.y, 1, 1, C2.bulb);
    for (const x of FIX2)
      if (s.light.sweep > x) R2(p, x + 1, 14, 22, 2, C2.tube);
    if (s.light.sweep > EMBLEMA2.cx + EMBLEMA2.r) dibujarEmblema2(p, true);
    if (!s.reducido && s.light.I > 0)
      for (let i = 0; i < 34; i++) {
        const x = Math.round(
          120 + ((i * 37) % 170) + Math.sin(s.reloj / 1400 + i) * 2
        );
        const y = Math.round(
          150 - ((i * 19 + s.reloj * 4e-3 * (0.6 + (i % 8) / 10)) % 116)
        );
        if (x < 214 && nivelLuz2(x, y, s, 0, hand, lamp) >= 2)
          R2(p, x, y, 1, 1, C2.dust);
      }
  }

  // alba.ts
  var hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  var mix = (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
  var BAYER3 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
    (v) => v / 16 - 0.47
  );
  var bay = (x, y) => BAYER3[(y & 3) * 4 + (x & 3)];
  function pack(c, x, y) {
    const d = bay(x, y) * 14;
    const q = (v) => Math.max(0, Math.min(255, Math.round((v + d) / 15) * 15));
    return (4278190080 | (q(c[2]) << 16) | (q(c[1]) << 8) | q(c[0])) >>> 0;
  }
  var smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  var PRE = [
    "#121534",
    "#1c1f47",
    "#2b2656",
    "#433066",
    "#61386a",
    "#7c4468",
  ].map(hx);
  var SOL = [
    "#39407c",
    "#62549a",
    "#a8679f",
    "#e9848a",
    "#ffac78",
    "#ffd596",
  ].map(hx);
  var PANE = { x0: 22, x1: 62, y0: 24, y1: 48 };
  var SUN_X = 50;
  var RIDGE = new Int8Array(64);
  for (let x = 0; x < 64; x++)
    RIDGE[x] = Math.round(
      44.6 -
        (2.3 * Math.sin(x * 0.29 + 0.6) +
          1.3 * Math.sin(x * 0.83 + 2) +
          0.7 * Math.sin(x * 2.1))
    );
  RIDGE[SUN_X - 1] = Math.max(RIDGE[SUN_X - 1], 44);
  var STARS = [
    [25, 26, 0.2],
    [31, 30, 0.35],
    [37, 25, 0.1],
    [47, 27, 0.25],
    [59, 29, 0.4],
    [55, 25, 0.15],
  ];
  function cielo(px, mask, p, t) {
    const pal = PRE.map((c, i) => mix(c, SOL[i], p));
    const sunY = 50 - 11 * smooth(0.08, 1, p);
    const sunR = 4.6;
    const cloudX = (t / 1e3) * 0.35;
    for (let y = PANE.y0; y < PANE.y1; y++) {
      const ty =
        ((y - PANE.y0) / (PANE.y1 - PANE.y0 - 1)) ** 0.62 * (pal.length - 1);
      const i = Math.min(pal.length - 2, Math.floor(ty));
      const base = mix(pal[i], pal[i + 1], ty - i);
      for (let x = PANE.x0; x < PANE.x1; x++) {
        const k = y * WIDTH + x;
        if (!mask[k]) continue;
        let c = base;
        const dx = x - SUN_X,
          dy = y - sunY,
          d = Math.hypot(dx, dy * 1.25);
        c = mix(c, hx("#ffd7a0"), Math.max(0, 1 - d / 16) ** 2 * 0.75 * p);
        for (const [cy, len, off] of [
          [29, 13, 0],
          [33, 9, 21],
          [27, 7, 11],
        ]) {
          const cx = PANE.x0 + ((off + cloudX) % 46) - 6;
          if (x >= cx && x < cx + len - Math.abs(y - cy) * 3) {
            if (y === cy) c = mix(hx("#5a4a86"), hx("#c88aa8"), p);
            if (y === cy + 1) c = mix(hx("#7a4c78"), hx("#ffb38a"), p);
          }
        }
        if (d < sunR) c = mix(hx("#ffe9b8"), hx("#fff6dc"), 1 - d / sunR);
        for (const [sx, sy, fade] of STARS)
          if (x === sx && y === sy && p < 0.75 - fade + bay(x, y) * 0.3)
            c = mix(c, hx("#e6e0ff"), 1 - p);
        const ridge = RIDGE[x];
        if (y >= ridge) {
          const far = mix(hx("#2a2148"), hx("#6a4a7e"), p * 0.65);
          c =
            y === ridge
              ? mix(far, hx("#ff9fa8"), smooth(0.25, 1, p) * 0.85)
              : mix(far, base, 0.18);
        }
        px[k] = pack(c, x, y);
      }
    }
  }
  var DISCO = { cx: 184, cy: 98, r: 46 };
  function disco(px, t) {
    const { cx, cy, r } = DISCO;
    const rim = hx("#141a29"),
      rimHi = hx("#5a6890");
    const sweep = ((t / 2600) % 1) * Math.PI * 2 - Math.PI / 2;
    for (let y = cy - r - 8; y <= cy + r + 8; y++)
      for (let x = cx - r - 8; x <= cx + r + 8; x++) {
        if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) continue;
        const k = y * WIDTH + x;
        const d = Math.hypot(x - cx, y - cy);
        if (d > r) {
          if (Math.hypot(x - cx - 3, y - cy - 5) <= r + 0.5) {
            const v = px[k];
            const f = 0.58;
            px[k] =
              (4278190080 |
                ((((v >>> 16) & 255) * f) << 16) |
                ((((v >>> 8) & 255) * f) << 8) |
                ((v & 255) * f)) >>>
              0;
          }
          continue;
        }
        const lit = Math.max(
          0,
          1 - Math.hypot(x - cx, y - (cy - r * 0.95)) / (r * 1.7)
        );
        let c = mix(hx("#1e263b"), hx("#3b4870"), lit ** 1.4);
        if (d > r - 2.2) c = rim;
        else if (d > r - 3.2 && y < cy - r * 0.35)
          c = mix(rim, rimHi, smooth(cy - r * 0.35, cy - r, y));
        else if (d > r - 6 && d <= r - 5) {
          const a = Math.atan2(y - cy, x - cx);
          let da = Math.abs(a - sweep);
          if (da > Math.PI) da = Math.PI * 2 - da;
          c = mix(hx("#3f8f22"), hx("#b6ff8a"), Math.max(0, 1 - da / 0.5) ** 2);
          if (da > 0.5) c = mix(hx("#3f8f22"), hx("#5bbd2f"), lit);
        }
        px[k] = pack(c, x, y);
      }
  }
  var SHAFT = [
    [22, 48],
    [62, 48],
    [62 + 94 * 0.85, 142],
    [22 + 94 * 0.55, 142],
  ];
  function enHaz(x, y) {
    if (y < 48 || y > 142) return 0;
    const l = 22 + (y - 48) * 0.55,
      r = 62 + (y - 48) * 0.85;
    if (x < l || x > r) return 0;
    return Math.min(1, (x - l) / 6, (r - x) / 6) * (1 - (y - 48) / 110);
  }
  function iniciarAlba(stage, out, opciones) {
    const reducido2 = opciones.reducido;
    let s = crearEstado2(false, true);
    s.reducido = reducido2;
    s.ch.face = -1;
    const bg = new Uint32Array(WIDTH * HEIGHT),
      px = new Uint32Array(WIDTH * HEIGHT);
    dibujarFondo2(crearPincel2(bg));
    const mask = new Uint8Array(WIDTH * HEIGHT);
    const magenta = (4278190080 | (255 << 16) | 255) >>> 0;
    for (let i = 0; i < bg.length; i++) mask[i] = bg[i] === magenta ? 1 : 0;
    const brush = crearPincel2(px),
      moon = mapaLuna2(),
      shades = crearTablaSombreado2();
    const low = document.createElement("canvas");
    low.width = WIDTH;
    low.height = HEIGHT;
    const lctx = low.getContext("2d");
    const img = new ImageData(new Uint8ClampedArray(px.buffer), WIDTH, HEIGHT);
    const bright = document.createElement("canvas");
    bright.width = WIDTH;
    bright.height = HEIGHT;
    const bctx = bright.getContext("2d");
    const bpx = new Uint32Array(WIDTH * HEIGHT);
    const bimg = new ImageData(
      new Uint8ClampedArray(bpx.buffer),
      WIDTH,
      HEIGHT
    );
    const b1 = Object.assign(document.createElement("canvas"), {
      width: 160,
      height: 90,
    });
    const b2 = Object.assign(document.createElement("canvas"), {
      width: 80,
      height: 45,
    });
    const b1c = b1.getContext("2d"),
      b2c = b2.getContext("2d");
    const grain = Object.assign(document.createElement("canvas"), {
      width: 256,
      height: 256,
    });
    {
      const g = grain.getContext("2d"),
        d = g.createImageData(256, 256);
      let seed2 = 99;
      for (let i = 0; i < d.data.length; i += 4) {
        seed2 = (seed2 * 16807) % 2147483647;
        const v = (seed2 / 2147483647) * 255;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
        d.data[i + 3] = 255;
      }
      g.putImageData(d, 0, 0);
    }
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const motas = Array.from({ length: 90 }, () => ({
      x: 22 + rnd() * 120,
      y: 48 + rnd() * 94,
      vx: (rnd() - 0.5) * 2,
      vy: -0.6 - rnd() * 1.2,
      ph: rnd() * 6.28,
    }));
    const ctx = out.getContext("2d");
    let S = 4,
      t0 = performance.now(),
      last = t0,
      raf = 0;
    const DURACION = 14e3;
    function resize() {
      S = Math.max(
        3,
        Math.min(
          Math.floor(innerWidth / WIDTH),
          Math.floor(innerHeight / HEIGHT)
        )
      );
      out.width = WIDTH * S;
      out.height = HEIGHT * S;
      stage.style.setProperty("--s", String(S));
    }
    resize();
    addEventListener("resize", () => {
      resize();
      if (reducido2 || opciones.tFijo !== void 0) frame(performance.now());
    });
    function frame(now) {
      const dt = Math.min(50, now - last);
      last = now;
      const fijo = opciones.tFijo;
      const t = fijo ?? now - t0;
      const p =
        reducido2 && fijo === void 0
          ? 1
          : 0.12 + 0.88 * smooth(0, 1, t / DURACION);
      const shaftI = smooth(0.3, 1, p);
      s = paso2(s, reducido2 ? 0 : dt);
      s.ch.face = -1;
      px.set(bg);
      dibujarPalanca2(brush, s.lever);
      dibujarLampara2(brush, s.lamp);
      const hand = dibujarOperaria2(brush, s.ch);
      aplicarLuz2(px, s, moon, hand, shades);
      cielo(px, mask, p, reducido2 ? 0 : t);
      dibujarEmisivos2(brush, s, hand);
      disco(px, reducido2 ? 1300 : t);
      lctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.filter = "none";
      ctx.drawImage(low, 0, 0, WIDTH * S, HEIGHT * S);
      const X = (v) => v * S;
      {
        const g = ctx.createLinearGradient(0, 0, 0, X(HEIGHT));
        g.addColorStop(0, `rgba(120,110,190,${0.32 - 0.1 * p})`);
        g.addColorStop(0.55, `rgba(200,140,150,${0.18 + 0.12 * p})`);
        g.addColorStop(1, `rgba(255,170,120,${0.12 + 0.18 * p})`);
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, X(WIDTH), X(HEIGHT));
      }
      ctx.globalCompositeOperation = "screen";
      {
        const g = ctx.createLinearGradient(X(42), X(40), X(110), X(142));
        g.addColorStop(0, `rgba(255,196,140,${0.3 * shaftI})`);
        g.addColorStop(0.6, `rgba(255,160,120,${0.16 * shaftI})`);
        g.addColorStop(1, "rgba(255,150,120,0)");
        ctx.fillStyle = g;
        ctx.filter = `blur(${S * 2}px)`;
        ctx.beginPath();
        SHAFT.forEach(([x, y], i) =>
          i ? ctx.lineTo(X(x), X(y)) : ctx.moveTo(X(x), X(y))
        );
        ctx.closePath();
        ctx.fill();
        for (let i = 0; i < 7; i++) {
          const u = (i + 0.5) / 7;
          const a =
            0.07 *
            shaftI *
            (0.55 + 0.45 * Math.sin(t / (1900 + i * 370) + i * 2.1));
          const x0 = 22 + 40 * u,
            w0 = 1.2 + (i % 3);
          const gx = ctx.createLinearGradient(0, X(48), 0, X(142));
          gx.addColorStop(0, `rgba(255,220,170,${a})`);
          gx.addColorStop(1, "rgba(255,220,170,0)");
          ctx.fillStyle = gx;
          ctx.beginPath();
          ctx.moveTo(X(x0), X(48));
          ctx.lineTo(X(x0 + w0), X(48));
          ctx.lineTo(
            X(22 + 94 * 0.55 + (40 + 94 * 0.3) * u + w0 * 2.4),
            X(142)
          );
          ctx.lineTo(X(22 + 94 * 0.55 + (40 + 94 * 0.3) * u), X(142));
          ctx.closePath();
          ctx.fill();
        }
        ctx.filter = "none";
        const fp = ctx.createRadialGradient(
          X(118),
          X(146),
          0,
          X(118),
          X(146),
          X(48)
        );
        fp.addColorStop(0, `rgba(255,190,130,${0.28 * shaftI})`);
        fp.addColorStop(1, "rgba(255,190,130,0)");
        ctx.fillStyle = fp;
        ctx.save();
        ctx.translate(0, X(146));
        ctx.scale(1, 0.32);
        ctx.translate(0, -X(146));
        ctx.fillRect(X(60), X(100), X(120), X(92));
        ctx.restore();
      }
      ctx.globalCompositeOperation = "lighter";
      for (const m of motas) {
        if (!reducido2) {
          m.ph += dt / 900;
          m.x += ((m.vx * 0.6 + Math.sin(m.ph) * 0.8) * dt) / 1e3;
          m.y += ((m.vy * dt) / 1e3) * 0.8;
          if (m.y < 48) {
            m.y = 142;
            m.x = 22 + rnd() * 120;
          }
        }
        const a =
          enHaz(m.x, m.y) * shaftI * (0.55 + 0.45 * Math.sin(m.ph * 2.3));
        if (a <= 0.02) continue;
        ctx.fillStyle = `rgba(255,214,160,${a})`;
        ctx.fillRect(X(Math.round(m.x)), X(Math.round(m.y)), S, S);
      }
      const L = posicionLuz2(s);
      {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, X(WIDTH), X(HEIGHT));
        ctx.arc(X(DISCO.cx), X(DISCO.cy), X(DISCO.r - 0.5), 0, Math.PI * 2);
        ctx.clip("evenodd");
        ctx.filter = `blur(${S * 1.5}px)`;
        ctx.globalCompositeOperation = "screen";
        const cone = ctx.createLinearGradient(0, X(L.y), 0, X(DISCO.cy + 20));
        cone.addColorStop(0, "rgba(255,222,160,0.30)");
        cone.addColorStop(1, "rgba(255,222,160,0)");
        ctx.filter = `blur(${S * 2}px)`;
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(X(L.x - 5), X(L.y - 1));
        ctx.lineTo(X(L.x + 5), X(L.y - 1));
        ctx.lineTo(X(L.x + 40), X(DISCO.cy + 30));
        ctx.lineTo(X(L.x - 40), X(DISCO.cy + 30));
        ctx.closePath();
        ctx.fill();
        ctx.filter = "none";
        ctx.globalCompositeOperation = "lighter";
        const glow = ctx.createRadialGradient(
          X(L.x),
          X(L.y),
          0,
          X(L.x),
          X(L.y),
          X(22)
        );
        glow.addColorStop(0, "rgba(255,236,190,0.55)");
        glow.addColorStop(0.25, "rgba(255,200,130,0.18)");
        glow.addColorStop(1, "rgba(255,180,110,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(X(L.x - 22), X(L.y - 22), X(44), X(44));
        ctx.globalCompositeOperation = "screen";
        const ring = ctx.createRadialGradient(
          X(DISCO.cx),
          X(DISCO.cy),
          X(DISCO.r - 2),
          X(DISCO.cx),
          X(DISCO.cy),
          X(DISCO.r + 16)
        );
        ring.addColorStop(0, "rgba(255,206,150,0.30)");
        ring.addColorStop(1, "rgba(255,206,150,0)");
        ctx.fillStyle = ring;
        ctx.fillRect(X(DISCO.cx - 70), X(DISCO.cy - 70), X(140), X(140));
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.arc(X(DISCO.cx), X(DISCO.cy), X(DISCO.r - 3), 0, Math.PI * 2);
        ctx.clip();
        ctx.globalCompositeOperation = "screen";
        const top = ctx.createRadialGradient(
          X(DISCO.cx),
          X(DISCO.cy - DISCO.r),
          0,
          X(DISCO.cx),
          X(DISCO.cy - DISCO.r),
          X(DISCO.r * 1.1)
        );
        top.addColorStop(0, "rgba(255,226,170,0.16)");
        top.addColorStop(1, "rgba(255,226,170,0)");
        ctx.fillStyle = top;
        ctx.fillRect(
          X(DISCO.cx - DISCO.r),
          X(DISCO.cy - DISCO.r),
          X(DISCO.r * 2),
          X(DISCO.r * 2)
        );
        ctx.restore();
      }
      ctx.globalCompositeOperation = "screen";
      const haze = ctx.createLinearGradient(0, X(120), 0, X(HEIGHT));
      haze.addColorStop(0, "rgba(255,180,150,0)");
      haze.addColorStop(1, `rgba(255,170,140,${0.06 + 0.06 * p})`);
      ctx.fillStyle = haze;
      ctx.fillRect(0, X(120), X(WIDTH), X(60));
      ctx.globalCompositeOperation = "multiply";
      const vig = ctx.createRadialGradient(
        X(165),
        X(88),
        X(90),
        X(165),
        X(88),
        X(215)
      );
      vig.addColorStop(0, "rgba(255,255,255,1)");
      vig.addColorStop(1, "rgba(92,70,110,1)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, X(WIDTH), X(HEIGHT));
      ctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        low,
        PANE.x0 + 2,
        PANE.y0,
        PANE.x1 - PANE.x0 - 2,
        PANE.y1 - PANE.y0,
        X(PANE.x0 + 2),
        X(PANE.y0),
        X(PANE.x1 - PANE.x0 - 2),
        X(PANE.y1 - PANE.y0)
      );
      for (let i = 0; i < px.length; i++) {
        const v = px[i],
          r = v & 255,
          g = (v >>> 8) & 255,
          b = (v >>> 16) & 255;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        bpx[i] = lum > 168 ? v : 0;
      }
      bctx.putImageData(bimg, 0, 0);
      b1c.clearRect(0, 0, 160, 90);
      b1c.filter = "blur(1.5px)";
      b1c.drawImage(bright, 0, 0, 160, 90);
      b2c.clearRect(0, 0, 80, 45);
      b2c.filter = "blur(2px)";
      b2c.drawImage(bright, 0, 0, 80, 45);
      ctx.imageSmoothingEnabled = true;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.38;
      ctx.drawImage(b1, 0, 0, X(WIDTH), X(HEIGHT));
      ctx.globalAlpha = 0.32;
      ctx.drawImage(b2, 0, 0, X(WIDTH), X(HEIGHT));
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.05;
      const ox = reducido2 ? 0 : (t * 0.37) % 256,
        oy = reducido2 ? 0 : (t * 0.61) % 256;
      ctx.fillStyle = ctx.createPattern(grain, "repeat");
      ctx.save();
      ctx.translate(-ox, -oy);
      ctx.fillRect(ox, oy, X(WIDTH), X(HEIGHT));
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      stage.dataset.alba = p.toFixed(2);
      if (!reducido2 && fijo === void 0) raf = requestAnimationFrame(frame);
    }
    if (opciones.tFijo !== void 0) {
      for (let k = 0; k < 120; k++) {
        s = paso2(s, 16);
      }
      for (let k = 0; k < 600; k++)
        for (const m of motas) {
          m.ph += 16 / 900;
          m.x += (m.vx * 0.6 + Math.sin(m.ph) * 0.8) * 0.016;
          m.y += m.vy * 0.016 * 0.8;
          if (m.y < 48) {
            m.y = 142;
            m.x = 22 + rnd() * 120;
          }
        }
      frame(performance.now());
    } else raf = requestAnimationFrame(frame);
    return {
      enviar(e) {
        s = transicion2(s, e);
        if (reducido2) requestAnimationFrame(frame);
      },
      reiniciar() {
        t0 = performance.now();
      },
      detener() {
        cancelAnimationFrame(raf);
      },
    };
  }

  // entry.ts
  function render(canvasId, M, pincel, fondo, op, La, Lz, dawn) {
    const ctx = document.getElementById(canvasId).getContext("2d");
    const s = M.crearEstado(false, true);
    const bg = new Uint32Array(WIDTH * HEIGHT),
      px = new Uint32Array(WIDTH * HEIGHT);
    const brush = pincel(px);
    fondo(pincel(bg));
    px.set(bg);
    La.dibujarPalanca(brush, s.lever);
    La.dibujarLampara(brush, s.lamp);
    const hand = op(brush, s.ch);
    Lz.aplicarLuz(px, s, Lz.mapaLuna(), hand, Lz.crearTablaSombreado());
    Lz.dibujarEmisivos(brush, s, hand);
    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(px.buffer), WIDTH, HEIGHT),
      0,
      0
    );
  }
  render(
    "c0",
    maquina_exports,
    crearPincel,
    dibujarFondo,
    dibujarOperaria,
    lampara_exports,
    luz_exports,
    false
  );
  var reducido =
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    location.hash.includes("estatico");
  var alba = iniciarAlba(
    document.getElementById("stage"),
    document.getElementById("c1"),
    {
      reducido: reducido || /t=\d+/.test(location.hash),
      tFijo: ((m) => (m ? +m[1] : void 0))(location.hash.match(/t=(\d+)/)),
    }
  );
  window.alba = alba;
  var correo = document.getElementById("correo");
  var clave = document.getElementById("clave");
  correo.addEventListener("focus", () => alba.enviar("FOCO_CORREO"));
  clave.addEventListener("focus", () => alba.enviar("FOCO_CLAVE"));
  for (const el of [correo, clave])
    el.addEventListener("blur", () =>
      setTimeout(() => {
        if (
          document.activeElement !== correo &&
          document.activeElement !== clave
        )
          alba.enviar("BLUR");
      }, 0)
    );
  document
    .getElementById("repetir")
    .addEventListener("click", () => alba.reiniciar());
  document.title = "Maqueta \xB7 Login al alba";
})();
