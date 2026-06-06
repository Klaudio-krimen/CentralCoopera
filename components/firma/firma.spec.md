# Componente: FirmaCanvas

**Ubicación:** `components/firma/FirmaCanvas.tsx`

## Propósito
Canvas interactivo para capturar la firma digital del representante de la empresa cliente. Diseñado para uso táctil en celular.

## Props
- `onConfirm(signatureDataUrl: string, signerName: string): void` — callback con la imagen de la firma en base64 y el nombre del firmante
- `onCancel(): void` — callback si el usuario cancela

## Comportamiento
- Canvas de 400x200px (adapta al ancho del contenedor)
- Acepta eventos táctiles (`touchstart`, `touchmove`) y de mouse (`mousedown`, `mousemove`)
- Trazo negro sobre fondo blanco
- Botón "Limpiar" borra el canvas
- Botón "Confirmar" habilitado solo cuando:
  1. Hay al menos un trazo en el canvas
  2. El campo "Nombre del firmante" está relleno (mínimo 3 caracteres)
- Al confirmar, llama a `canvas.toDataURL('image/png')` para obtener la imagen
- La imagen se envía al servidor como parte del `PATCH /api/ordenes/{id}`

## Librería
- Usar `signature_pad` (npm) para manejar el canvas — es una librería liviana y probada para firmas
- No usar canvas nativo directamente

## Accesibilidad
- El campo nombre del firmante tiene label visible
- El canvas tiene un borde claro que delimita el área de firma
