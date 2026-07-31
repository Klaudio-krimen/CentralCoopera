"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

type Placement = "below" | "above";
type Align = "left" | "right";

// `top`/`bottom` are mutually exclusive depending on `placement`, but kept as a flat
// optional shape (rather than a discriminated union) so callers can spread it straight
// into a React `style` object — React drops `undefined` style properties automatically.
type Pos = { left: number; top?: number; bottom?: number } | null;

interface UseDropdownPositionOptions {
  /** "below" mirrors today's `top-8` menus, "above" mirrors today's `bottom-8` menus. */
  placement: Placement;
  /** mirrors today's `right-0` (default) / `left-0` alignment against the trigger. */
  align?: Align;
  /** px — matches the menu's Tailwind width class (w-44 = 176, w-48 = 192). */
  menuWidth: number;
  /** px — the menu's actual rendered height (or a safe upper-bound estimate from its
   *  content, e.g. item count × ~40px + container padding). Used only to decide
   *  whether to flip to the opposite side when the preferred side is too tight —
   *  never used to size or position the menu itself, so a slight overestimate is
   *  harmless. Without this, a menu can render partially off the bottom (or top)
   *  of the viewport for a trigger near that edge — the exact "no se ve completo"
   *  symptom this hook exists to prevent, just via the viewport edge instead of an
   *  overflow-hidden ancestor. */
  menuHeight: number;
  /** px gap between trigger and menu. 4px reproduces today's `top-8`/`bottom-8` spacing
   *  relative to the `w-7`/`w-9` trigger buttons. */
  gap?: number;
  /** called when the trigger scrolls or the viewport resizes while the menu is open,
   *  so the caller can close it instead of leaving a stale-positioned menu on screen. */
  onDismiss: () => void;
}

/**
 * Computes a `position: fixed` screen coordinate for a trigger-anchored menu that
 * needs to render in a React portal (at document.body) instead of as an `absolute`
 * child of a `relative` wrapper — so it isn't clipped by an ancestor with
 * `overflow-hidden` (the same technique already used for modals in this codebase,
 * e.g. NuevoUsuarioModal.tsx, via createPortal + document.body).
 *
 * Deliberately does NOT track the trigger continuously while scrolling — it closes
 * the menu instead. That keeps this hook simple and correct for a short-lived
 * row/header action menu, which isn't expected to stay open while the page scrolls
 * underneath it.
 */
export function useDropdownPosition(
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean,
  {
    placement,
    align = "right",
    menuWidth,
    menuHeight,
    gap = 4,
    onDismiss,
  }: UseDropdownPositionOptions
): Pos {
  const [pos, setPos] = useState<Pos>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Same visual anchor as today's `right-0`/`left-0`, clamped so the menu
    // never runs off either edge for rows near the table's border.
    let left = align === "right" ? rect.right - menuWidth : rect.left;
    left = Math.min(Math.max(left, 8), vw - menuWidth - 8);

    // Flip to whichever side has more room if the preferred side can't fit
    // menuHeight — e.g. a "below" menu near the bottom of a long table, or
    // an "above" menu near the top of the viewport. Only flips when the
    // OTHER side genuinely has more room, so a menu that's tight on both
    // sides (very short viewport) still picks the least-bad option instead
    // of flipping back and forth.
    const needed = menuHeight + gap;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const effectivePlacement =
      (placement === "below" &&
        spaceBelow < needed &&
        spaceAbove > spaceBelow) ||
      (placement === "above" && spaceAbove < needed && spaceBelow > spaceAbove)
        ? placement === "below"
          ? "above"
          : "below"
        : placement;

    setPos(
      effectivePlacement === "below"
        ? { left, top: rect.bottom + gap }
        : // Anchored via `bottom` (not `top` minus a measured/estimated height) so we
          // never need to know the menu's height up front — CSS does that math.
          { left, bottom: vh - rect.top + gap }
    );

    const dismiss = () => onDismiss();
    window.addEventListener("scroll", dismiss, true); // capture: also catches the table's own scroll container
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align, menuWidth, menuHeight, gap]);

  return pos;
}
