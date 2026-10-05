# Derivados de marca

- Recibe por argumento el PNG original; no contiene una ruta absoluta de otro proyecto.
- Detecta el círculo de fondo azul mediante muestras en los ejes centrales y elimina píxeles
  exteriores mediante alpha circular. Conserva el logo completo.
- Genera PNG de 512, 192, 180 y 96 px, incluido icon/apple-icon de Next.
- Verifica alpha exterior cero y tamaño del logo de 512 px máximo 80 KB.
- Sólo los derivados se versionan; el original permanece fuera del repositorio.
