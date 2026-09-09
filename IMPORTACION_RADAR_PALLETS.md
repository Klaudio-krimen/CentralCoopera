# Importación Radar de Clientes Pallets + Segmento INDUSTRIA

> Spec derivada de entrevista. Complementa `PROSPECCION_OUTREACH.md`.
> Fuente: `Coopera_Pro_Radar_Clientes_Pallets_V7_FINAL.xlsx`
> Estado: **especificación aprobada, sin implementar.**
> Fecha: 2026-09-08

---

## 1. Objetivo del proceso

Incorporar al CRM de Central Coopera los prospectos con contacto verificado del
Radar de Clientes Pallets, sin duplicar lo ya cargado, enriqueciendo los
registros existentes, y habilitar un tercer segmento de outreach (`INDUSTRIA`)
para las empresas que no encajan en `LOGISTICA` ni `FARMACEUTICA`.

**No reemplaza nada.** Se suma a las ~120 empresas del import anterior (Apify).

## 2. Usuario o destinatario

Claudio, en solitario por ahora. Nadie más opera la importación ni el CRM en
esta etapa. Sin plazo definido.

---

## 3. Diagnóstico del archivo

7 pestañas. **Solo 3 entran al CRM** — las que tienen contacto real verificado
a mano. Las hojas grandes (RUT/DV, sin contacto) quedan fuera: no hay forma de
actuar sobre ellas.

| Pestaña                    | Filas | Identificador | Contacto                    | ¿Entra?          |
| -------------------------- | ----- | ------------- | --------------------------- | ---------------- |
| Resumen                    | 30    | —             | —                           | No (indicadores) |
| Grandes cuentas            | 200   | RUT + DV      | No                          | **No**           |
| Pymes medianas             | 200   | RUT + DV      | No                          | **No**           |
| Base clasificada           | 4.439 | RUT + DV      | No                          | **No**           |
| Prospectos verificados     | 74    | Nombre        | Teléfono + Correo (parcial) | **Sí**           |
| TOP 20 ataque comercial    | 28    | Nombre        | Solo teléfono               | **Sí**           |
| TOP 25 empresas abordables | 25    | Nombre        | Teléfono + Correo           | **Sí**           |

**Volumen bruto a importar: ~127 filas**, con solapamiento esperado entre las
tres hojas y con la base existente.

### Problemas de calidad detectados

- Ninguna hoja con contacto trae RUT ni `place_id` → **no sirve el criterio de
  deduplicación actual** (`place_id` de Google Maps).
- Teléfonos múltiples en una sola celda: `+56 2 2333 2126 / +56 9 9689 7446`.
- Correos vacíos (`None`) en parte de "Prospectos verificados".
- Casi todos los correos son genéricos (`info@`, `contacto@`, `ventas@`);
  nominativos prácticamente inexistentes.
- Los campos "Próximo paso" y "Observación" son **notas de investigación, no
  historial de contacto**. Nadie ha escrito ni llamado todavía.

---

## 4. Flujo paso a paso

1. Leer las 3 hojas con contacto y normalizar campos (`"sin dato"` → null,
   trim, separar teléfonos múltiples por `/`).
2. **Consolidar duplicados internos** entre las 3 hojas: la misma empresa puede
   aparecer en varias. Gana el registro **más completo** (mayor número de
   campos con valor).
3. **Deduplicar contra el CRM** por nombre de empresa **normalizado**:
   minúsculas, sin tildes, espacios colapsados, sin sufijos societarios
   (`S.A.`, `SPA`, `LTDA`, `SAC`).
4. Si la empresa **no existe** → crear `Company` + `Contact`.
5. Si la empresa **ya existe** → **enriquecer**: completar los campos vacíos
   (correo, teléfono, dirección). Si el correo entrante es distinto al que ya
   está guardado, **se conservan ambos** como contactos separados de la misma
   empresa.
6. **Clasificar el segmento** automáticamente leyendo "Tipo" / "Perfil
   operacional" / "Evidencia operacional" (reglas en §6).
7. Marcar como **prospecto de llamada** toda empresa con teléfono y sin correo.
8. Emitir resumen: creados / enriquecidos / duplicados / descartados, con
   desglose por segmento.

---

## 5. Inputs

- El archivo `.xlsx` (3 hojas relevantes).
- Base existente del CRM (`Company` / `Contact`).

## 6. Outputs esperados

### 6.1 Registros en el CRM

- `Company` + `Contact` nuevos o enriquecidos.
- Cada contacto con un segmento asignado: `LOGISTICA`, `FARMACEUTICA` o
  `INDUSTRIA`.

### 6.2 Reglas de clasificación (por palabras clave)

| Texto contiene                                                                | Segmento       |
| ----------------------------------------------------------------------------- | -------------- |
| farmacéutico, laboratorio, droguería, medicamento                             | `FARMACEUTICA` |
| operador logístico, almacenamiento, depósito, bodega, transporte              | `LOGISTICA`    |
| todo lo demás (alimentos, papel/cartón, insumos médicos, retail, manufactura) | `INDUSTRIA`    |

`INDUSTRIA` es el fallback: si ninguna regla matchea, cae ahí.

### 6.3 Campaña nueva

`OutreachCampaign` de segmento `INDUSTRIA`, con plantilla propia (propuesta de
valor a definir — no reutilizar la de LOGISTICA textual). Se crea con
`isActive=false`.

### 6.4 Estado de gestión telefónica

Campo nuevo en el modelo, editable desde el CRM, con ciclo:

`POR_LLAMAR → LLAMADA → SIN_RESPUESTA → CORREO_CONSEGUIDO`

No basta un filtro "sin correo, con teléfono" — Ventas necesita mover el estado
manualmente y llevar control.

---

## 7. Reglas principales

1. Solo entran filas con **al menos un dato de contacto** (correo o teléfono).
2. Deduplicación **siempre** por nombre normalizado, nunca literal.
3. Ante duplicado: **enriquecer**, jamás pisar ni descartar.
4. Correos distintos para la misma empresa: **conservar todos**.
5. **Un solo correo por empresa** en el envío automático, aunque tenga varios
   contactos. Los demás quedan como respaldo manual para Ventas.
6. Elección del contacto de envío: **nominativo > genérico**; si todos son
   genéricos, el **primero cargado**.
7. **Tope global de 25 correos diarios** para todo el outreach, repartidos entre
   las tres campañas. _(Cambio respecto del comportamiento actual, que aplica el
   `dailyCap` por campaña.)_
8. Una empresa con **gestión telefónica registrada queda excluida** del correo
   automático, incluso si después se le carga un correo. Ese correo es para que
   Ventas escriba a mano con contexto.
9. Las campañas quedan en `isActive=false` hasta resolver los bloqueantes (§10).

---

## 8. Excepciones y casos límite

| Caso                                            | Resolución                                           |
| ----------------------------------------------- | ---------------------------------------------------- |
| Empresa en 2 o 3 hojas del Excel                | Gana la fila más completa                            |
| Empate en completitud                           | **Pendiente** — sin criterio de desempate definido   |
| Empresa ya en CRM sin correo, Excel trae correo | Enriquecer                                           |
| Empresa ya en CRM con correo distinto           | Guardar ambos contactos                              |
| Celda con 2 teléfonos (`x / y`)                 | Separar en dos teléfonos                             |
| Teléfono sin correo                             | Entra como prospecto de llamada, estado `POR_LLAMAR` |
| Sin teléfono y sin correo                       | Se descarta, se reporta                              |
| "Observación" sugiere contacto previo           | Se ignora — entra normal, desde cero                 |
| Ventas consigue correo por teléfono             | **No** entra al envío automático                     |

---

## 9. Criterios de calidad

- Correr la importación dos veces seguidas no crea un solo duplicado
  (idempotencia — mismo estándar que el importador anterior).
- Ninguna empresa recibe dos correos de campaña.
- El total diario de envíos nunca supera 25, sumando las tres campañas.
- Toda empresa importada queda con segmento asignado (ninguna sin clasificar).
- El resumen de importación permite responder: cuántas entraron, cuántas se
  enriquecieron, cuántas quedaron para llamar.

---

## 10. Riesgos y pendientes

### Bloqueantes para activar el envío (heredados, siguen vigentes)

**1. Datos legales del remitente** — Ley 19.496 art. 28 B. Faltan
`OUTREACH_SENDER_LEGAL_NAME`, `OUTREACH_SENDER_RUT`, `OUTREACH_SENDER_ADDRESS`.
El cron responde 200 sin enviar si faltan (guard deliberado). Son tres datos ya
disponibles — bloqueante fácil.

**2. SPF / DKIM / DMARC en `cooperapro.cl`** (NIC Chile):

- **SPF**: TXT declarando los servidores autorizados, incluyendo el de
  Hostinger/SiteGround (`gtxm1185.siteground.biz`). Un solo registro SPF por
  dominio.
- **DKIM**: par de llaves generado por Hostinger; publicar el TXT
  `selector._domainkey.cooperapro.cl`.
- **DMARC**: TXT en `_dmarc.cooperapro.cl`. Partir en `p=none`, observar
  reportes unas semanas, luego subir a `p=quarantine`.

Orden: publicar → esperar propagación (24-48h) → correo de prueba verificando
los tres → recién ahí `isActive=true`.

Gmail y Yahoo exigen autenticación desde 2024. Enviar en frío sin esto quema la
reputación del dominio completo, no solo de la campaña.

### Riesgos técnicos de esta importación

- **La normalización de nombres puede fallar en ambos sentidos**: unir dos
  empresas realmente distintas con nombres parecidos, o no detectar un duplicado
  con nombre comercial vs razón social. Sin RUT en las hojas de contacto no hay
  identificador fuerte. Conviene revisar el reporte de la primera corrida antes
  de dar por buena la carga.
- **La clasificación por palabras clave es heurística.** Revisar manualmente el
  reparto por segmento después de importar.
- **El cambio del `dailyCap` de por-campaña a global** toca el motor de envío ya
  construido y testeado. Falta definir cómo se reparten los 25 entre las tres
  campañas (prioridad, proporcional o rotativo).

### Decisiones sin tomar

1. Criterio de desempate cuando dos filas duplicadas tienen igual completitud.
2. Estrategia de reparto del cupo diario entre las tres campañas.
3. Contenido de la plantilla del segmento `INDUSTRIA`.
4. Nombres definitivos de los estados de gestión telefónica.

---

## 11. Siguiente acción recomendada

Orden sugerido:

1. Definir la propuesta de valor y plantilla del segmento `INDUSTRIA`
   (es contenido, no código — y bloquea la campaña).
2. Extender el modelo: campo de estado de gestión telefónica + enum `INDUSTRIA`
   en el segmento.
3. Escribir el importador del Excel con normalización, consolidación entre
   hojas y deduplicación contra el CRM. Correr en modo _dry-run_ primero,
   revisar el reporte, y recién después escribir en la base.
4. Ajustar la query de elegibilidad del cron: un contacto por empresa, tope
   global de 25, exclusión de empresas con gestión telefónica.
5. Vista de lista de llamadas en el CRM con el estado editable.
6. En paralelo y sin dependencia del código: reunir los tres datos legales y
   publicar SPF/DKIM/DMARC.
