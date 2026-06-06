# Flujos de Usuario

## FLUJO 1 — Chofer: Registrar un retiro

**Actor:** Chofer  
**Dispositivo:** Celular (navegador)  
**Precondición:** El chofer tiene sesión activa y llega a una empresa cliente

### Pasos

1. **Abrir app y ver dashboard**
   - El chofer ve sus órdenes del día (si hay alguna programada) o el botón "Nueva orden"
   
2. **Crear nueva orden**
   - Selecciona la empresa cliente (lista desplegable de empresas activas)
   - El sistema genera automáticamente el `orderCode` (ej: RET-2026-0001)
   - Estado cambia a `EN_RETIRO`

3. **Agregar ítems de material**
   - Selecciona tipo de material del catálogo
   - Ingresa cantidad y unidad
   - Puede agregar múltiples ítems
   - Puede eliminar o editar ítems antes de confirmar

4. **Tomar fotos del material**
   - Abre la cámara desde la app
   - Toma mínimo 1 foto, máximo 5
   - Las fotos se suben inmediatamente con timestamp del servidor
   - El GPS del celular se registra junto a cada foto

5. **Obtener firma del representante de la empresa**
   - El chofer pasa el celular al representante de la empresa
   - El representante firma con el dedo en el canvas
   - Ingresa su nombre completo
   - Confirma la firma tocando "Firmar y confirmar"
   - Se guarda la firma como imagen PNG con timestamp

6. **Confirmar orden**
   - El chofer revisa el resumen: empresa, ítems, fotos, firma
   - Toca "Confirmar retiro"
   - Estado cambia a `EN_TRANSITO`
   - Se muestra el código de la orden (puede tomar captura de pantalla)

### Casos de error
- Sin conexión: los datos del formulario se guardan en localStorage como borrador
- Sin GPS: el campo de geolocalización queda vacío (no bloquea el flujo)
- El representante rechaza firmar: el chofer puede registrar la negativa en observaciones

---

## FLUJO 2 — Recepción: Registrar ingreso de materiales a bodega

**Actor:** Recepcionista / personal de bodega  
**Dispositivo:** Tablet o PC  
**Precondición:** El chofer llegó con materiales y tiene el código de la orden

### Pasos

1. **Abrir panel de recepción**
   - Ver lista de órdenes en tránsito esperando recepción

2. **Buscar la orden**
   - Por código de orden (el chofer lo muestra en pantalla)
   - O por nombre de empresa o fecha

3. **Ver detalle de la orden**
   - Ver qué declaró el chofer: empresa, ítems, fotos, firma del cliente
   
4. **Registrar lo que llegó físicamente**
   - Para cada ítem, ingresar la cantidad realmente recibida
   - Tomar fotos del material al llegar (evidencia de recepción)
   - El sistema calcula la diferencia por ítem automáticamente

5. **Confirmar recepción**
   - Si no hay discrepancias (diferencia ≤ 2%): estado cambia a `RECIBIDA`
   - Si hay discrepancia: estado cambia a `DISCREPANCIA` y se genera alerta para admin
   - Puede agregar observaciones antes de confirmar

### Cálculo de discrepancia
- Se compara `declaredQuantity` vs `receivedQuantity` por ítem
- Porcentaje de diferencia = `|declarado - recibido| / declarado * 100`
- Si algún ítem supera el 2%: se crea un registro `Discrepancy`
- Severidad: MENOR (<5%), MODERADA (5-20%), GRAVE (>20%)

---

## FLUJO 3 — Administrador: Gestionar discrepancias

**Actor:** Admin / supervisor  
**Dispositivo:** PC

### Pasos

1. **Ver dashboard con alertas**
   - Órdenes con estado `DISCREPANCIA` aparecen destacadas
   - Contador de discrepancias pendientes

2. **Abrir una discrepancia**
   - Ver el detalle completo: fotos de retiro, fotos de recepción, firma, cantidades
   - Ver el porcentaje de diferencia por ítem

3. **Investigar**
   - Puede contactar al chofer
   - Puede ver historial de órdenes de ese chofer
   - Puede cambiar estado a `EN_INVESTIGACION`

4. **Resolver**
   - Ingresa nota de resolución (ej: "El chofer perdió 10 kg de cartón, se aplica descuento")
   - Cambia estado a `RESUELTA`
   - La orden pasa a `CERRADA`

---

## FLUJO 4 — Administrador: Ver reportes

**Actor:** Admin  
**Dispositivo:** PC

### Tipos de reportes

1. **Reporte por chofer**
   - Todas las órdenes de un chofer en un período
   - Total de material retirado por tipo
   - Número de discrepancias y severidad

2. **Reporte por empresa**
   - Volumen de material retirado por empresa en un período
   - Historial de órdenes

3. **Reporte de discrepancias**
   - Todas las discrepancias en un período
   - Filtrable por chofer, empresa, severidad
   - Exportable a CSV

---

## FLUJO 5 — Administrador: Gestionar usuarios

**Actor:** Admin

### Acciones
- Crear chofer nuevo (nombre, email, contraseña temporal)
- Desactivar chofer (soft delete — sus órdenes quedan en el sistema)
- Crear usuario de recepción
- Editar datos de usuario

---

## FLUJO 6 — Administrador: Gestionar empresas cliente

**Actor:** Admin

### Acciones
- Agregar empresa nueva (nombre, dirección, contacto)
- Editar datos de empresa
- Desactivar empresa (no aparece más en el selector del chofer)
- Ver historial de órdenes de una empresa

---

## Estados de una orden y transiciones

```
BORRADOR ──── (chofer inicia) ────> EN_RETIRO
EN_RETIRO ─── (firma obtenida) ───> EN_TRANSITO
EN_TRANSITO ── (sin diferencia) ──> RECIBIDA
EN_TRANSITO ── (con diferencia) ──> DISCREPANCIA
DISCREPANCIA ─ (admin resuelve) ──> CERRADA
RECIBIDA ─────────────────────────> CERRADA (automático)
```
