import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
} from "react";
export function useLineupDrag(
  ids: number[],
  apply: (index: number, id: number) => void,
) {
  const [dragged, setDragged] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{
    id: number;
    x: number;
    y: number;
  } | null>(null);
  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    active: boolean;
    startX: number;
    startY: number;
    container: HTMLElement | null;
  } | null>(null);
  const suppress = useRef(0);
  const accept = (id: number, x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    const slot = element?.closest<HTMLElement>("[data-pitch-slot]");
    if (slot && !slot.hasAttribute("disabled")) {
      apply(Number(slot.dataset.pitchSlot), id);
      return;
    }
    const bench = element?.closest<HTMLElement>("[data-bench-player]");
    const index = ids.indexOf(id);
    if (bench && index >= 0 && !bench.hasAttribute("disabled"))
      apply(index, Number(bench.dataset.benchPlayer));
  };
  useEffect(() => {
    if (!ghost) return;
    let frame = 0;
    const scroll = () => {
      const p = pointer.current;
      if (p?.active) {
        const bounds = p.container?.getBoundingClientRect();
        const top = bounds?.top ?? 0,
          bottom = bounds?.bottom ?? window.innerHeight;
        const dy = p.y < top + 65 ? -12 : p.y > bottom - 65 ? 12 : 0;
        if (dy) {
          if (p.container) p.container.scrollBy(0, dy);
          else window.scrollBy(0, dy);
        }
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [!!ghost]);
  const nativeStart = (id: number, e: DragEvent) => {
    e.dataTransfer.setData("application/x-football-player", String(id));
    e.dataTransfer.setData("text/plain", String(id));
    e.dataTransfer.effectAllowed = "move";
    setDragged(id);
    suppress.current = Date.now() + 1000;
  };
  const nativeEnd = () => {
    setDragged(null);
    setOver(null);
    suppress.current = Date.now() + 350;
  };
  const dropSlot = (index: number, e: DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-football-player");
    if (raw) {
      const id = Number(raw);
      if (Number.isInteger(id)) apply(index, id);
    }
    nativeEnd();
  };
  const dropBench = (benchId: number, e: DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-football-player");
    if (raw) {
      const index = ids.indexOf(Number(raw));
      if (index >= 0) apply(index, benchId);
    }
    nativeEnd();
  };
  const down = (id: number, e: PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    pointer.current = {
      id,
      x: e.clientX,
      y: e.clientY,
      active: false,
      startX: e.clientX,
      startY: e.clientY,
      container: e.currentTarget.closest(".live-stadium"),
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* Synthetic accessibility/test pointer. */
    }
  };
  const move = (e: PointerEvent<HTMLElement>) => {
    const p = pointer.current;
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (!p.active && Math.hypot(p.x - p.startX, p.y - p.startY) < 7) return;
    p.active = true;
    suppress.current = Date.now() + 1000;
    setDragged(p.id);
    setGhost({ id: p.id, x: p.x, y: p.y });
    const slot = document
      .elementFromPoint(p.x, p.y)
      ?.closest<HTMLElement>("[data-pitch-slot]");
    setOver(slot ? Number(slot.dataset.pitchSlot) : null);
  };
  const up = (e: PointerEvent<HTMLElement>) => {
    const p = pointer.current;
    if (p?.active) {
      accept(p.id, e.clientX, e.clientY);
      suppress.current = Date.now() + 350;
    }
    pointer.current = null;
    setDragged(null);
    setGhost(null);
    setOver(null);
  };
  const cancel = () => {
    pointer.current = null;
    setDragged(null);
    setGhost(null);
    setOver(null);
  };
  return {
    dragged,
    hover: setOver,
    over,
    ghost,
    nativeStart,
    nativeEnd,
    dropSlot,
    dropBench,
    down,
    move,
    up,
    cancel,
    suppressClick: () => Date.now() < suppress.current,
  };
}
