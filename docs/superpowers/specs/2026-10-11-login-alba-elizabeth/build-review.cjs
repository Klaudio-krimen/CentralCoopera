// Maqueta derivada de la referencia de Claude. No modifica su fuente ni la aplicación.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "../../../..");
let code = fs.readFileSync(
  path.join(__dirname, "../2026-10-11-login-alba/maqueta.js"),
  "utf8"
);
const replace = (before, after) => {
  if (!code.includes(before))
    throw new Error("La referencia cambió: " + before.slice(0, 80));
  code = code.replace(before, after);
};
const source = fs.readFileSync(
  path.join(root, "lib/login-escena/operaria.ts"),
  "utf8"
);
let sprite = ts
  .transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
    },
  })
  .outputText.replace(/^import .*;\r?\n/gm, "")
  .replace(/\bexport /g, "");
const monitorSource = fs.readFileSync(
  path.join(root, "lib/login-escena/rendimiento.ts"),
  "utf8"
);
const monitorJs = ts
  .transpileModule(monitorSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
    },
  })
  .outputText.replace(/\bexport /g, "");
replace("  // alba.ts", monitorJs + "\n  // alba.ts");
replace(
  "const reducido2 = opciones.reducido;",
  "let reducido2=opciones.reducido,monitor=crearMonitor(),frozen=false;"
);
replace(
  "const dt = Math.min(50, now - last);",
  "const raw=now-last;const dt=Math.min(50,raw);"
);
replace(
  "if (!reducido2 && fijo === void 0) raf = requestAnimationFrame(frame);",
  "stage.dataset.motion=reducido2?(frozen?'performance-static':'reduced'):'animated';if(!reducido2){monitor=registrarFrame(monitor,now,Math.max(raw,performance.now()-frameStart));if(monitor.estatico){const foco=s.foco,terminal=s.fase==='EXITO';reducido2=true;frozen=true;s=crearEstado2(false,true);if(foco)s=transicion2(s,foco==='correo'?'FOCO_CORREO':'FOCO_CLAVE');if(terminal)s=transicion2(s,'EXITO');frame(now);return}}if(!reducido2&&fijo===void 0)raf=requestAnimationFrame(frame);"
);
for (const [start, end, dawn] of [
  ["  // escena/operaria.ts", "  // escena/lampara.ts", false],
  ["  // dawn/operaria.ts", "  // dawn/lampara.ts", true],
]) {
  let segment = sprite;
  if (dawn)
    for (const name of [
      "GROUND",
      "ELIZABETH",
      "dibujarOperaria",
      "R",
      "line",
      "C",
    ])
      segment = segment.replace(
        new RegExp("\\b" + name + "\\b", "g"),
        name + "2"
      );
  const a = code.indexOf(start),
    z = code.indexOf(end, a);
  if (a < 0 || z < 0) throw new Error("No se encontró el sprite");
  code = code.slice(0, a) + start + "\n" + segment + "\n" + code.slice(z);
}
replace("var SEAT2 = 128;", "var SEAT2 = 294;");
replace("var LEVER_X2 = 199;", "var LEVER_X2 = 243;");
replace(
  "var DISCO = { cx: 184, cy: 98, r: 46 };",
  "var DISCO = { cx: 184, cy: 94, r: 50 };"
);
replace("const L = 24,", "const L = 20,");
replace("Math.sin(s.lamp.a) * 24", "Math.sin(s.lamp.a) * 20");
replace("Math.cos(s.lamp.a) * 24", "Math.cos(s.lamp.a) * 20");
// La geometría de la maqueta ahora coincide con el spec; caja de control a la derecha.
replace(
  "R2(g, 205, 12, 1, 112, C2.metalDark);",
  "R2(g, 249, 12, 1, 112, C2.metalDark);"
);
replace(
  "R2(g, 202, 124, 7, 10, C2.leverBox);",
  "R2(g, 246, 124, 7, 10, C2.leverBox);"
);
replace(
  "R2(g, 203, 125, 5, 8, C2.leverBoxIn);",
  "R2(g, 247, 125, 5, 8, C2.leverBoxIn);\n    R2(g,248,123,3,2,C2.lever);\n    for(let k=0;k<3;k++) pallet(g,282,142-k*5,28);"
);
replace("box(g, 10, 40, 14, 12);", "box(g, 10, 40, 9, 12);");
replace(
  "R2(ctx, 206, ey - 1, 3, 2, C2.lever);",
  "R2(ctx, 250, ey - 1, 3, 2, C2.lever);"
);
replace(
  "line2(ctx, 205, 128, 207, ey, C2.metalHi, 1);",
  "line2(ctx, 249, 128, 251, ey, C2.metalHi, 1);"
);
// Se retira la cadena: el encendido acciona el interruptor de pared.
const chainStart = code.indexOf(
  "const cx = X + 5,",
  code.indexOf("// dawn/lampara.ts")
);
const chainEnd = code.indexOf("\n  }", chainStart);
code = code.slice(0, chainStart) + code.slice(chainEnd);
replace("brazo2(ch, 189, 126 + lamp.pull)", "brazo2(ch, 251, 124)");
replace(
  "brazo2(ch, 207, 120 + 14 * s.lever)",
  "brazo2(ch, 251, 120 + 14 * s.lever)"
);
// Caras correctas: mira el disco y gira al lado opuesto al escribir la contraseña.
const dawnStart = code.indexOf("// dawn/maquina.ts");
let dawnCode = code.slice(dawnStart);
dawnCode = dawnCode
  .replace(
    'case "ILUMINADO":\n        ch.face = 1;',
    'case "ILUMINADO":\n        ch.face = -1;'
  )
  .replace(
    'case "MIRA":\n        ch.face = 1;',
    'case "MIRA":\n        ch.face = -1;'
  )
  .replace(
    'case "TAPA_OJOS":\n        ch.face = -1;',
    'case "TAPA_OJOS":\n        ch.face = 1;'
  );
code = code.slice(0, dawnStart) + dawnCode;
// Rampa de ocho tonos: reduce el damero invasivo sin borrar el lenguaje pixel.
const lvStart = code.indexOf("  var LV2 = ["),
  lvEnd = code.indexOf("  ];", lvStart) + 5;
code =
  code.slice(0, lvStart) +
  "  var LV2 = [[.25,.24,.34],[.36,.33,.42],[.48,.43,.49],[.60,.53,.55],[.72,.63,.61],[.84,.74,.67],[.94,.84,.72],[1,.92,.78],[1,1,1]];" +
  code.slice(lvEnd);
replace(
  "const shades = new Uint32Array(5);",
  "const shades = new Uint32Array(9);"
);
replace("for (let i = 0; i < 5; i++)", "for (let i = 0; i < 9; i++)");
const nStart = code.indexOf("  function nivelLuz2("),
  nEnd = code.indexOf("  function aplicarLuz2", nStart);
let n = code
  .slice(nStart, nEnd)
  .replace("return 3;", "return 8;")
  .replace(
    "Math.min(2, Math.floor(v * 2 + BAYER2[(y & 3) * 4 + (x & 3)]))",
    "Math.min(7, Math.floor(v * 7 + .5 + (BAYER2[(y & 3) * 4 + (x & 3)]-.5)*.65))"
  );
code = code.slice(0, nStart) + n + code.slice(nEnd);
replace(
  "shades(pixels[i])[n === 1 && moon[i] > 0 ? 4 : n]",
  "shades(pixels[i])[n]"
);
// Fondo del acceso tranquilo y uniforme: la atmósfera se concentra alrededor.
replace('mix(hx("#1e263b"), hx("#3b4870"), lit ** 1.4)', 'hx("#2a344d")');
const discStart = code.indexOf("  function disco("),
  discEnd = code.indexOf("  var SHAFT", discStart);
let discCode = code
  .slice(discStart, discEnd)
  .replace(
    "px[k] = pack(c, x, y);",
    "px[k]=(0xff000000|(Math.round(c[2])<<16)|(Math.round(c[1])<<8)|Math.round(c[0]))>>>0;"
  );
code = code.slice(0, discStart) + discCode + code.slice(discEnd);
// Bloom acotado a ventana y lámpara; no difumina el cabello, el chaleco o el aro.
replace(
  "bpx[i] = lum > 168 ? v : 0;",
  "const bx=i%WIDTH,by=Math.floor(i/WIDTH);bpx[i]=lum>168 && ((bx>=22&&bx<62&&by>=24&&by<48)||Math.hypot(bx-L.x,by-L.y)<4) ? v : 0;"
);
// Grano fijo: textura de película, sin ruido que vibre mientras se lee.
replace("const ox = reducido2 ? 0 : (t * 0.37) % 256,", "const ox = 0,");
replace("oy = reducido2 ? 0 : (t * 0.61) % 256;", "oy = 0;");
replace("ctx.globalAlpha = 0.05;", "ctx.globalAlpha = 0.022;");
// Evitar que el frame sobreescriba TAPA_OJOS.
replace(
  "s = paso2(s, reducido2 ? 0 : dt);\n      s.ch.face = -1;",
  "s = paso2(s, reducido2 ? 0 : dt);"
);
// Métricas observables de la maqueta, sin datos del formulario.
replace(
  "function frame(now) {",
  "function frame(now) {\n      const frameStart=performance.now();"
);
replace(
  "const DURACION = 14e3;",
  "const DURACION=14000;let albaActual=.12,albaAlExito=.12;"
);
replace("const p =\n        reducido2", "let p =\n        reducido2");
replace(
  "const shaftI = smooth(0.3, 1, p);",
  "if(s.fase==='EXITO')p=Math.max(p,albaAlExito+(1-albaAlExito)*Math.min(1,s.elapsed/SUCCESS_MS2));albaActual=p;const shaftI=smooth(.3,1,p);"
);
replace(
  "enviar(e) {\n        s = transicion2(s, e);",
  "enviar(e) {\n        if(e==='EXITO')albaAlExito=albaActual;\n        s = transicion2(s, e);"
);
replace(
  "stage.dataset.alba = p.toFixed(2);",
  "ctx.save();ctx.beginPath();ctx.arc(X(DISCO.cx),X(DISCO.cy),X(DISCO.r),0,Math.PI*2);ctx.clip();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.drawImage(low,0,0,X(WIDTH),X(HEIGHT));ctx.restore();stage.dataset.alba=p.toFixed(2);stage.dataset.pose=s.fase;stage.dataset.face=String(s.ch.face);stage.dataset.renderMs=String(performance.now()-frameStart);"
);
replace(
  "if (reducido2) requestAnimationFrame(frame);",
  "if (reducido2) frame(performance.now());"
);
replace(
  'document.title = "Maqueta \\xB7 Login al alba";',
  'document.title = "Alba · Elizabeth — revisión gráfica";'
);
// Sólo tipos de evento, para la maqueta. No hay envío ni validación contra un servidor.
replace(
  "window.alba = alba;",
  'window.alba=alba;window.dibujarElizabeth=function(canvas,face,cover){const state=crearEstado2(false,true);state.ch.x=12;state.ch.face=face;state.ch.head=cover?"down":"normal";if(cover){state.ch.armF={a:2.75,l:6};state.ch.armB={a:2.55,l:6}}const pixels=new Uint32Array(320*180);dibujarOperaria2(crearPincel2(pixels),state.ch);const buffer=document.createElement("canvas");buffer.width=320;buffer.height=180;buffer.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(pixels.buffer),320,180),0,0);const target=canvas.getContext("2d");target.imageSmoothingEnabled=false;target.drawImage(buffer,2,119,24,33,0,0,canvas.width,canvas.height)};'
);
code += '\nwindow.addEventListener("pagehide",()=>window.alba.detener());\n';
fs.writeFileSync(path.join(__dirname, "maqueta.js"), code);
console.log("Maqueta Elizabeth generada sin dependencias nuevas.");
