# LOGIN-004 — Alba vintage y Elizabeth

**Estado: EN REVISIÓN.** Solicitud del usuario de revisar y mejorar la propuesta gráfica de Claude.
Trabajo en copia aislada, rama codex/login-alba-elizabeth, base 9d692de, 2026-10-11.
El checkout principal conserva los archivos reservados por Claude; sólo se registra la coordinación.

Se entrega una maqueta interactiva refinada y el módulo puro del personaje listo para integración.
La maqueta conserva el amanecer, la cordillera y los rayos de la propuesta Alba, suaviza la trama,
añade textura vintage estable y presenta a Elizabeth con pelo largo castaño claro y visos rubios.
Es una interpretación estilizada, sin afirmar parecido facial preciso.

## Verificación

- Typecheck exit 0; Vitest exit 0: **36 archivos, 394 pruebas**; build exit 0: **79/79 páginas**.
- Build con DATABASE_URL/DIRECT_URL locales sintéticas; errores Prisma de autenticación esperados
  al consultar páginas de otros módulos y aviso ESM de Tailwind. No acredita conexión con BD real.
- El generador termina sin errores y maqueta.js pasa node --check.
- Chrome local: foco correo MIRA/face−1; contraseña TAPA_OJOS/face1; error visible y saludo oculto;
  mostrar clave conserva el foco; visor del personaje funciona; consola limpia en sesión final.
- Chrome con movimiento reducido: alba completa y canvas idéntico tras 500 ms.
- Lentitud simulada de 65 ms por callback: performance-static, alba 1, sin errores de script.
- Éxito de la maqueta: completa el alba en **699,1 ms**. No es una medida de navegación o autenticación.
- Firefox 155.0.1 headless: poses, error, color del disco y visor del personaje verificados.
- Escalas 3 (1024×700), 4 (1440×900) y 6 (1920×1144): formulario completo con error dentro del
  radio seguro de 44 píxeles lógicos. Radio máximo de su caja: 43,96 / 39,26 / 38,99.
- Color muestreado en centro del canvas: **RGBA 42,52,77,255** (#2a344d), también en Firefox.

| Texto                      | Contraste |
| -------------------------- | --------- |
| Título verde sobre azul    | 5,17:1    |
| Etiquetas sobre azul       | 8,92:1    |
| Texto de botón sobre verde | 6,74:1    |
| Error sobre azul           | 5,38:1    |
| Placeholder sobre campo    | 7,41:1    |

Chrome headless local, 90 frames durante el inicio del alba: coste de render medio 5,55 ms, máximo
7,6 ms; intervalo medio 5,99 ms. La frecuencia estimada refleja la ejecución headless del equipo
local: no constituye prueba de 60 fps en un PC de oficina ni medición independiente de la capa HD
≤4 ms. Firefox reporta 88 ms en una renderización estática con su propia ruta de dibujo; no se
midió allí la animación sostenida. La protección de rendimiento reduce ese riesgo, pero debe
medirse la versión integrada en equipos reales.

## Capturas y datos

- [Propuesta de Claude](LOGIN-004/alba-before.png).
- [Alba refinada](LOGIN-004/alba-after.png).
- [Elizabeth y sus poses](LOGIN-004/elizabeth-poses.png).
- [Error dentro del acceso](LOGIN-004/alba-error.png).
- [Escala mínima con error](LOGIN-004/alba-scale3.png).
- [Firefox](LOGIN-004/firefox-alba.png) y [personaje](LOGIN-004/firefox-elizabeth.png).
- [Escala 3](LOGIN-004/alba-qa-scale3.json), [4](LOGIN-004/alba-qa-scale4.json),
  [6](LOGIN-004/alba-qa-scale6.json), [rendimiento](LOGIN-004/alba-performance.json)
  y [resultado Firefox](LOGIN-004/firefox.json).

## Pendientes de integración

Claude debe revisar la variante de composición y copiar el personaje con sus pruebas desde la
copia aislada; después implementar LOGIN-003 en /login y medir su capa HD y chunk reales. El
generador de maqueta sirve para revisión visual y no sustituye una arquitectura de producción
con capas cacheadas. No se cambió la autenticación, la CSP, la app móvil ni sus dependencias.
No se probaron cuentas reales, dispositivos físicos ni producción. Sin commit, push ni despliegue.

Peso gzip: chunk de la aplicación con Elizabeth, **6.947 bytes**; bundle independiente de la
maqueta, **15.675 bytes**. Son artefactos distintos; el peso final de Alba integrada sigue pendiente.
Detalle en [bundle-metrics.json](LOGIN-004/bundle-metrics.json).
