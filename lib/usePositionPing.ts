"use client";

import { useEffect, useRef } from "react";

const PING_INTERVAL_MS = 90_000; // 90 s entre envíos

/**
 * Mientras `enabled` sea true y el navegador conceda permiso de geolocalización,
 * envía la posición a /api/posiciones cada ~90 s. Degrada limpio si se niega el permiso.
 */
export function usePositionPing(enabled: boolean) {
  const lastSent = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    // Reiniciar el throttle al abrir turno: `lastSent` sobrevive al ciclo
    // enable→disable→enable, así que sin esto un chofer que termina y reinicia
    // turno dentro de 90 s no aparecería en el mapa hasta que venza el intervalo.
    lastSent.current = 0;

    const send = (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastSent.current < PING_INTERVAL_MS) return;
      lastSent.current = now;

      fetch("/api/posiciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: "phone",
        }),
      }).catch(() => {
        // Sin red: el próximo watchPosition reintentará
      });
    };

    const watchId = navigator.geolocation.watchPosition(
      send,
      () => {
        // Permiso negado o error: degrada limpio, sin UI molesta
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 30_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);
}
