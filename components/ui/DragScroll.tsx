"use client";

import { useRef, useCallback } from "react";

export default function DragScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const didDrag = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, button")) return;
    isDragging.current = true;
    didDrag.current = false;
    startX.current = e.pageX - (ref.current?.offsetLeft ?? 0);
    scrollLeft.current = ref.current?.scrollLeft ?? 0;
    if (ref.current) {
      ref.current.style.cursor = "grabbing";
      ref.current.style.userSelect = "none";
    }
  }, []);

  const stopDragging = useCallback(() => {
    isDragging.current = false;
    if (ref.current) {
      ref.current.style.cursor = "grab";
      ref.current.style.userSelect = "";
    }
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !ref.current) return;
    e.preventDefault();
    didDrag.current = true;
    const x = e.pageX - ref.current.offsetLeft;
    const walk = x - startX.current;
    ref.current.scrollLeft = scrollLeft.current - walk;
  }, []);

  // 실제 드래그가 발생했으면 click 이벤트 차단 (capture phase)
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (didDrag.current) {
      e.stopPropagation();
      e.preventDefault();
      didDrag.current = false;
    }
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{ cursor: "grab" }}
      onMouseDown={onMouseDown}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
      onMouseMove={onMouseMove}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  );
}
