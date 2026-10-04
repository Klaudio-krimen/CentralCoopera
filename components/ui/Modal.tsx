"use client";

import { type ReactElement, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/** Diálogo neutro: Base UI gobierna foco, Escape, portal y bloqueo del fondo. */
export default function Modal({
  open,
  onOpenChange,
  trigger,
  title,
  children,
  busy = false,
  size = "md",
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement;
  title: string;
  children: ReactNode;
  busy?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (!nextOpen && busy) {
          details.cancel();
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <Dialog.Trigger render={trigger} />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 transition-opacity duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 text-zinc-900 shadow-xl outline-none transition-[opacity,transform] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 motion-reduce:transition-none motion-reduce:data-[starting-style]:scale-100 motion-reduce:data-[ending-style]:scale-100",
            size === "lg" ? "max-w-lg" : "max-w-md",
            className
          )}
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <Dialog.Title className="text-lg font-semibold">
              {title}
            </Dialog.Title>
            <Dialog.Close
              disabled={busy}
              aria-label="Cerrar diálogo"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
