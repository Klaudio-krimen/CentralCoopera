import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
  const source = process.argv[2];
  if (!source || process.argv.length !== 3)
    throw new Error("Uso: npm run brand:assets -- <ruta-del-logo>");
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  function fondo(x: number, y: number) {
    const i = (y * info.width + x) * 4;
    return (
      data[i + 3] > 200 &&
      Math.abs(data[i] - 41) < 16 &&
      Math.abs(data[i + 1] - 53) < 16 &&
      Math.abs(data[i + 2] - 75) < 16
    );
  }
  const fila = Math.floor(info.height / 2),
    columna = Math.floor(info.width / 2);
  const xs = Array.from({ length: info.width }, (_, x) => x).filter((x) =>
    fondo(x, fila)
  );
  const ys = Array.from({ length: info.height }, (_, y) => y).filter((y) =>
    fondo(columna, y)
  );
  if (!xs.length || !ys.length)
    throw new Error("No se encontró el círculo azul de marca");
  const cx = (xs[0] + xs[xs.length - 1]) / 2,
    cy = (ys[0] + ys[ys.length - 1]) / 2;
  const radio =
    Math.floor(
      Math.min(xs[xs.length - 1] - xs[0], ys[ys.length - 1] - ys[0]) / 2
    ) - 1;
  const crop = {
    left: Math.round(cx - radio),
    top: Math.round(cy - radio),
    width: radio * 2,
    height: radio * 2,
  };

  async function derivado(size: number, target: string) {
    const raw = await sharp(source)
      .extract(crop)
      .resize(size, size)
      .ensureAlpha()
      .raw()
      .toBuffer();
    const centro = (size - 1) / 2,
      limite = size / 2 - 1;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const distancia = Math.hypot(x - centro, y - centro);
        const i = (y * size + x) * 4 + 3;
        raw[i] = Math.round(
          raw[i] * Math.max(0, Math.min(1, limite - distancia))
        );
      }
    const png = await sharp(raw, {
      raw: { width: size, height: size, channels: 4 },
    })
      .png({ palette: true, colours: 256, compressionLevel: 9 })
      .toBuffer();
    if (size === 512 && png.length > 80 * 1024)
      throw new Error("El logo supera 80 KB");
    const verificado = await sharp(png).ensureAlpha().raw().toBuffer();
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (
          Math.hypot(x - centro, y - centro) >= limite &&
          verificado[(y * size + x) * 4 + 3] !== 0
        )
          throw new Error("Píxel opaco fuera del círculo");
      }
    await writeFile(resolve(target), png);
    console.log(
      `${target}: ${size}×${size}, ${png.length} bytes, alpha verificado`
    );
  }
  await mkdir(resolve("public/brand"), { recursive: true });
  await derivado(512, "public/brand/coopera-pro-logo.png");
  await derivado(96, "public/brand/coopera-pro-logo-96.png");
  await derivado(192, "public/brand/coopera-pro-icon-192.png");
  await derivado(512, "app/icon.png");
  await derivado(180, "app/apple-icon.png");
}
main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "No se pudieron generar los derivados"
  );
  process.exitCode = 1;
});
