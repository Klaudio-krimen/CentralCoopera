# Variables de Entorno

## Archivo `.env.local` (desarrollo)

```
# Base de datos
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="una-cadena-aleatoria-muy-larga-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Almacenamiento de fotos
UPLOAD_DIR="./public/uploads"
MAX_PHOTO_SIZE_MB=1
MAX_PHOTOS_PER_ORDER=5

# Umbral de discrepancia (porcentaje)
DISCREPANCY_THRESHOLD_PERCENT=2

# Prospección — enriquecimiento de correos (ver PROSPECCION_OUTREACH.md)
APIFY_TOKEN="tu-token-de-apify"

# Prospección — motor de envío vía SMTP de Hostinger (ver PROSPECCION_OUTREACH.md §8 y §12)
# El correo de Coopera Pro está hosteado en Hostinger, no en Microsoft 365 —
# por eso SMTP directo y no Microsoft Graph. Datos en el dashboard de correos
# de Hostinger, sección "Configuración" / "Conectar dispositivos".
# Estrategia de dos buzones: se autentica y envía desde SMTP_USER
# (operaciones@) para que SPF/DKIM calcen con quien manda de verdad, pero
# las respuestas del prospecto van a SMTP_REPLY_TO (contacto@) — así un
# antispam que marque la casilla de envío no arrastra a la casilla pública.
SMTP_HOST="gtxm1185.siteground.biz"
SMTP_PORT=465                # 465 = SSL directo, 587 = STARTTLS
SMTP_USER="operaciones@cooperapro.cl"
SMTP_PASSWORD=
SMTP_FROM_NAME="Coopera Pro"
SMTP_REPLY_TO="contacto@cooperapro.cl"

# Prospección — cron y cumplimiento legal (ver PROSPECCION_OUTREACH.md §9)
CRON_SECRET=                 # Vercel lo manda solo como "Authorization: Bearer $CRON_SECRET"
OUTREACH_DAILY_CAP=25
OUTREACH_PUBLIC_URL=         # base para armar el link de desuscripción, ej: https://intranet.cooperapro.cl
OUTREACH_PDF_BLOB_URL=       # URL del PDF único en Vercel Blob (ver scripts/seed-outreach-campaigns.ts)

# Prospección — pie de correo obligatorio por Ley 19.496 art. 28 B (Chile)
OUTREACH_SENDER_LEGAL_NAME=  # razón social exacta
OUTREACH_SENDER_RUT=
OUTREACH_SENDER_ADDRESS=
```

## Archivo `.env.production` (producción)

```
# Base de datos PostgreSQL
DATABASE_URL="postgresql://usuario:contraseña@host:5432/trackresiduos"

# NextAuth
NEXTAUTH_SECRET="cadena-secreta-de-produccion-distinta"
NEXTAUTH_URL="https://tu-dominio.com"

# Almacenamiento (si se migra a S3)
# STORAGE_PROVIDER="s3"
# AWS_BUCKET_NAME=""
# AWS_REGION=""
# AWS_ACCESS_KEY_ID=""
# AWS_SECRET_ACCESS_KEY=""

# Por defecto almacena en sistema de archivos local
UPLOAD_DIR="/var/www/track-residuos/uploads"
MAX_PHOTO_SIZE_MB=1
MAX_PHOTOS_PER_ORDER=5
DISCREPANCY_THRESHOLD_PERCENT=2
```

## Notas

- El archivo `.env.local` NUNCA debe subirse al repositorio (está en `.gitignore`)
- `NEXTAUTH_SECRET` debe ser una cadena aleatoria de al menos 32 caracteres
- `DISCREPANCY_THRESHOLD_PERCENT` es el porcentaje de diferencia que activa una alerta (default: 2%)
- Si el `DATABASE_URL` empieza con `file:`, Prisma usará SQLite. Si empieza con `postgresql:`, usará PostgreSQL
