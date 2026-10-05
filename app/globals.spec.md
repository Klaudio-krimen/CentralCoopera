# Estilos globales

Tailwind 4 con configuración del proyecto. El reset universal de box-sizing, padding y margin
vive en `@layer base`, para que las capas components/utilities restauren su espaciado.
No declarar ese reset fuera de capas: anula py/px/margin aunque el selector sea menos específico.

Conserva Geist, paletas y estilos existentes. Login: padding horizontal móvil 24 px,
campos de 46 px y casilla con área mínima 44 px. Verificar también shell administrativo,
chofer y recepción al cambiar la cascada.
