"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import DealCard, { type DealCardData } from "./DealCard";
import { formatCurrency } from "@/lib/utils";

export default function KanbanColumn({
  id,
  name,
  color,
  deals,
}: {
  id: string;
  name: string;
  color: string;
  deals: DealCardData[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-0 rounded-2xl border transition-colors ${
        isOver
          ? "bg-crm-secondary border-crm-primary/40"
          : "bg-crm-secondary/60 border-crm-border"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-3 border-b border-crm-border">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-sm font-medium text-crm-foreground flex-1 truncate">
          {name}
        </h3>
        <span className="text-[11px] text-crm-muted bg-crm-card rounded-full px-2 py-0.5 tabular-nums shrink-0">
          {deals.length}
        </span>
      </div>

      <div className="px-3 py-2 text-xs text-crm-muted text-center border-b border-crm-border font-mono tabular-nums">
        {formatCurrency(totalValue)}
      </div>

      <SortableContext
        items={deals.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 p-2 space-y-2 min-h-[80px] overflow-y-auto">
          {deals.map((deal) => (
            <DealCard key={deal.id} {...deal} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
