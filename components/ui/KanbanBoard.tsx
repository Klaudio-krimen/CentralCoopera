"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import KanbanColumn from "./KanbanColumn";
import DealCard, { type DealCardData } from "./DealCard";

export interface PipelineColumn {
  id: string;
  name: string;
  color: string;
  deals: DealCardData[];
}

export default function KanbanBoard({
  initialColumns,
}: {
  initialColumns: PipelineColumn[];
}) {
  const router = useRouter();
  const [columns, setColumns] = useState(initialColumns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const columnsSnapshot = useRef<PipelineColumn[]>(initialColumns);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeDeal = activeId
    ? columns.flatMap((c) => c.deals).find((d) => d.id === activeId)
    : null;

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveId(event.active.id as string);
      columnsSnapshot.current = columns;
      setError("");

      // Las DealCard son <Link>. dnd-kit captura el puntero durante el
      // drag, así que al soltar el navegador igual dispara un "click"
      // sobre el link original y navega a la ficha del deal. Se lo
      // tragamos una sola vez para que soltar la tarjeta no te saque
      // de la Pizarra.
      const swallowClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      };
      document.addEventListener("click", swallowClick, {
        capture: true,
        once: true,
      });
    },
    [columns]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeColumn = columns.find((c) =>
        c.deals.some((d) => d.id === activeId)
      );
      const overColumn =
        columns.find((c) => c.id === overId) ||
        columns.find((c) => c.deals.some((d) => d.id === overId));

      if (!activeColumn || !overColumn || activeColumn.id === overColumn.id)
        return;

      setColumns((prev) => {
        const deal = activeColumn.deals.find((d) => d.id === activeId);
        if (!deal) return prev;
        return prev.map((c) => {
          if (c.id === activeColumn.id)
            return { ...c, deals: c.deals.filter((d) => d.id !== activeId) };
          if (c.id === overColumn.id)
            return { ...c, deals: [...c.deals, deal] };
          return c;
        });
      });
    },
    [columns]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over) return;

      const activeId = active.id as string;

      // No recalculamos la columna destino desde over.id: closestCorners
      // es inestable en tableros multi-columna y en el instante del drop
      // puede resolver a un id distinto del que el usuario vio durante el
      // arrastre. handleDragOver ya movió la tarjeta a la columna correcta
      // en el estado local — esa es la fuente de verdad de a dónde va.
      const currentColumn = columns.find((c) =>
        c.deals.some((d) => d.id === activeId)
      );
      const originalColumn = columnsSnapshot.current.find((c) =>
        c.deals.some((d) => d.id === activeId)
      );
      if (!currentColumn || currentColumn.id === originalColumn?.id) return;

      try {
        const res = await fetch("/api/pipeline", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dealId: activeId, stageId: currentColumn.id }),
        });
        if (!res.ok) throw new Error();
        router.refresh();
      } catch {
        setColumns(columnsSnapshot.current);
        setError("No se pudo mover el deal. Se revirtió el cambio.");
      }
    },
    [columns, router]
  );

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-crm-destructive/10 border border-crm-destructive/20 text-sm text-crm-destructive">
          {error}
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          className="grid gap-3 overflow-x-auto pb-4"
          style={{
            gridTemplateColumns: `repeat(${columns.length}, minmax(240px, 1fr))`,
          }}
        >
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              name={col.name}
              color={col.color}
              deals={col.deals}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal ? <DealCard {...activeDeal} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
