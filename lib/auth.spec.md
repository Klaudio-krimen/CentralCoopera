# Autenticación y sesiones

`lib/auth.ts`: NextAuth v4 Credentials, bcrypt y rate limit atómico por correo. Sólo admite
usuarios activos; nunca expone hash ni fecha de cambio de contraseña al cliente.

`authorize` devuelve ID, nombre, correo, rol, módulos y datos internos de sesión. El callback
JWT revalida en BD la actividad, permisos y passwordChangedAt, también al iniciar sesión.
Si la contraseña cambia entre validación y emisión, rechaza el inicio. Una sesión inválida
lanza error: NextAuth devuelve sesión vacía y elimina su cookie, sin conceder permisos parciales.
El JWT conserva la versión passwordChangedAt validada y exige igualdad con la BD; esto cubre
un cambio confirmado después de emitir JWT cuyo timestamp se tomó antes del login.

`lib/auth-session.ts` fija un vencimiento desde la autenticación: ocho horas sin recordar;
siete días recordando; ocho horas para FINANZAS o permisos FINANZAS/FINANZAS_LECTURA.
Agregar permiso financiero a una sesión larga reduce su límite, nunca lo extiende.
La fecha inicial en milisegundos persiste, independiente del iat que NextAuth renueva.
Los JWT anteriores conservan su exp, limitado además a ocho horas desde el iat original.

`lib/auth-jwt.ts` conserva la codificación estándar de NextAuth con exp fijo, compatible con
el decoder predeterminado del middleware. Refrescar sesión no amplía ese plazo. El cookie puede
durar siete días, pero el JWT y la sesión imponen el límite efectivo más corto. Cookie httpOnly,
sameSite lax y secure en producción. session.expires publica el vencimiento efectivo.

Cambiar contraseña por recuperación o administración escribe User.passwordChangedAt en
servidor. Un JWT emitido antes se revoca en la próxima validación de sesión. Middleware no
consulta BD: los handlers y páginas protegidas deben seguir validando la sesión en servidor.

Cerrar sesión cierra turnos GPS abiertos con razón LOGOUT. Un fallo de cierre de turno no
impide logout. Los logs sólo imprimen códigos genéricos, sin credenciales.
