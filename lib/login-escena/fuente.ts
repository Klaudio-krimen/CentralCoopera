import { R, type Pincel } from "./pincel";

// Fuente pixel de 3×5 para rótulos pintados en la escena (sólo los caracteres que se usan).
const GLYPHS: Record<string, string> = {
  A: "010101111101101",
  B: "110101110101110",
  C: "011100100100011",
  D: "110101101101110",
  E: "111100110100111",
  G: "011100101101011",
  O: "010101101101010",
  P: "110101110100100",
  R: "110101110101101",
  "2": "110001010100111",
  " ": "000000000000000",
};

export function texto(
  p: Pincel,
  str: string,
  x: number,
  y: number,
  color: string
) {
  for (const ch of str) {
    const glyph = GLYPHS[ch];
    if (glyph)
      for (let i = 0; i < 15; i++)
        if (glyph[i] === "1") R(p, x + (i % 3), y + ((i / 3) | 0), 1, 1, color);
    x += 4;
  }
}
