# Instrucciones para Claude Code

Este documento es el punto de entrada para que Claude Code implemente el proyecto TrackResiduos.

## ¿Qué es este proyecto?
Una app web (Next.js 14) para Coopera Pro que registra la cadena de custodia de materiales reciclables, previniendo el robo hormiga en los retiros de choferes.

## Lee estos archivos en orden antes de escribir código

1. **README.md** — Visión general del proyecto
2. **ESQUEMA_BASE_DATOS.md** — Modelos de Prisma (empieza por aquí)
3. **FLUJOS_DE_USUARIO.md** — Cómo fluye la app para cada actor
4. **ESPECIFICACION_API.md** — Endpoints del backend
5. **ARQUITECTURA.md** — Decisiones técnicas y seguridad
6. **VARIABLES_ENTORNO.md** — Configuración de entorno

Cada carpeta tiene archivos `.spec.md` que describen qué debe hacer cada componente/ruta.

## Orden de implementación recomendado

### Fase 1 — Base
1. Inicializar proyecto Next.js 14 con App Router y TypeScript
2. Instalar dependencias: `prisma`, `@prisma/client`, `next-auth`, `bcryptjs`, `signature_pad`, `sharp`, `tailwindcss`
3. Crear `prisma/schema.prisma` según `prisma/schema.spec.md` y `ESQUEMA_BASE_DATOS.md`
4. Ejecutar `npx prisma db push` y `npx prisma db seed`
5. Configurar NextAuth en `lib/auth.ts` y middleware en `middleware.ts`

### Fase 2 — Backend (API Routes)
6. `/api/auth/[...nextauth]`
7. `/api/empresas`
8. `/api/ordenes` (GET y POST)
9. `/api/ordenes/[id]` (GET y PATCH)
10. `/api/evidencias` (POST y DELETE)
11. `/api/discrepancias`
12. `/api/usuarios`
13. `/api/reportes`

### Fase 3 — Frontend Chofer (prioridad máxima)
14. Layout y Login
15. Dashboard del chofer
16. Wizard nueva orden (el flujo más complejo — ver `nueva-orden/page.spec.md`)
17. Componente FirmaCanvas
18. Componente EvidenciaUploader
19. Detalle de orden e historial

### Fase 4 — Frontend Recepción
20. Dashboard de recepción
21. Página de registro de recepción con cálculo de discrepancias en tiempo real

### Fase 5 — Frontend Admin
22. Dashboard admin
23. Gestión de discrepancias
24. Gestión de choferes y empresas
25. Reportes con export CSV

## Reglas de implementación

- **Mobile-first** para todo lo que use el chofer
- **Validación en servidor** — nunca confiar solo en la validación del cliente
- **Timestamp del servidor** — nunca del cliente para fotos y firmas
- **Transacciones Prisma** para operaciones que modifican múltiples tablas
- **No exponer contraseñas** — jamás retornar el campo `password` en respuestas API
- **Manejo de errores** — todas las API routes deben retornar errores con la función `apiError()` de `lib/utils.ts`

## Dependencias necesarias (package.json)

```
next: 14+
react: 18+
typescript: 5+
prisma: latest
@prisma/client: latest
next-auth: ^4
bcryptjs: latest
@types/bcryptjs: latest
signature_pad: latest
sharp: latest
tailwindcss: latest
postcss: latest
autoprefixer: latest
```
