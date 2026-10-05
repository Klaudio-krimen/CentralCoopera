# Configuración Vercel

`installCommand` usa `npm ci --legacy-peer-deps`, igual que la CI, con lockfile versionado.
NextAuth4 declara Nodemailer7 como peer opcional; este ERP usa CredentialsProvider y SMTP
directo con Nodemailer10. No habilitar EmailProvider sin revisar compatibilidad.
La configuración predeterminada `npm install` falla ERESOLVE al resolver ese peer opcional.

Mantener los cron existentes y la detección Next.js del proyecto track-residuos. No incluir
secretos ni variables reales en esta configuración. Preview requiere conexiones DB y secreto
de autenticación; publicar sólo después de build/CI/health verificados. Conserva la protección
Vercel del preview. Production reutiliza variables ya configuradas y sus dominios existentes.
