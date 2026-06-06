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
