import React, { useEffect, useRef, useState } from "react";

type ResizablePanelsProps = {
  children: React.ReactNode;
  editMode: boolean;
  userId: number | null;
};

export default function ResizablePanels({ children, editMode, userId }: ResizablePanelsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [colPct, setColPct] = useState<number>(50);
  const draggingRef = useRef(false);

  useEffect(() => {
    // load saved panels for user
    if (!userId) return;
    fetch(`/api/layouts/${userId}`).then(r => r.json()).then(d => {
      const pct = d?.layout?.panels?.columnWidth;
      if (typeof pct === 'number') setColPct(pct);
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(10, Math.min(90, Math.round((x / rect.width) * 100)));
      setColPct(pct);
    }
    function onUp() {
      if (draggingRef.current) {
        draggingRef.current = false;
        // persist new column width
        if (userId) {
          // merge with existing layout
          fetch(`/api/layouts/${userId}`).then(r => r.json()).then(existing => {
            const newLayout = existing?.layout && typeof existing.layout === 'object' ? { ...existing.layout } : {};
            newLayout.panels = { ...(newLayout.panels || {}), columnWidth: colPct };
            return fetch(`/api/layouts/${userId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ layout: newLayout }) });
          }).catch(() => {});
        }
      }
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [colPct, userId]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `${colPct}% ${100 - colPct}%`, gap: 16 }}>
        {children}
      </div>

      {editMode && (
        <div
          onMouseDown={() => (draggingRef.current = true)}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `calc(${colPct}% - 6px)`,
            width: 12,
            cursor: 'col-resize',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden
        >
          <div style={{ width: 2, height: '60%', background: 'rgba(255,255,255,0.12)', borderRadius: 2 }} />
        </div>
      )}
    </div>
  );
}
