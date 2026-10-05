# POST /api/auth/recuperar/confirmar

Ruta pública; token de recuperación como credencial. Valida JSON, token y contraseña (mínimo
8 caracteres). Busca hash del token y selecciona sólo correo/rol del usuario para auditar.

Tras hashear contraseña fuera de la transacción, reclama token mediante updateMany condicional
(usedAt null y expiresAt > fecha del servidor). Si perdió la carrera, aborta sin cambiar nada.
Invalida otros tokens del usuario, escribe password/passwordChangedAt y auditoría EDITAR en
la misma transacción. La auditoría redacta password. No retorna hashes ni tokens.

Token inexistente/usado/expirado: 400 con «Enlace inválido o expirado». Fallo de persistencia:
500 genérico mediante apiError. Éxito: { ok: true }. No envía correos al confirmar.
