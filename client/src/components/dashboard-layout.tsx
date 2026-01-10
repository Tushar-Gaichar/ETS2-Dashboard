import React, { useEffect, useState } from "react";
import { useWebSocket } from "../hooks/use-websocket";
import { registry, availableWidgetTypes } from "./widgets";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

type WidgetItem = { id: string; type: string; title: string };

const DEFAULT_WIDGETS: WidgetItem[] = [
  { id: "speed-1", type: "speed", title: "Speed" },
  { id: "rpm-1", type: "rpm", title: "Engine RPM" },
];

export default function DashboardLayout() {
  const [userId, setUserId] = useState<number | null>(null);
  const [widgets, setWidgets] = useState<WidgetItem[]>(DEFAULT_WIDGETS);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const { telemetryData } = useWebSocket();
  const [newWidgetType, setNewWidgetType] = useState<string>(availableWidgetTypes[0].type);
  const [settingsOpen, setSettingsOpen] = useState<Record<string, boolean>>({});

  // Fetch userId on mount
  useEffect(() => {
    let mounted = true;

    const fetchUser = () => {
      fetch(`/api/user`)
        .then((r) => r.json())
        .then((data) => {
          if (!mounted) return;
          if (data?.userId && typeof data.userId === "number") {
            setUserId(data.userId);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) setLoadingUser(false);
        });
    };

    fetchUser();

    // Listen for user changes triggered by UserProfile
    const handler = () => {
      setLoadingUser(true);
      fetchUser();
    };

    window.addEventListener("ets2:user-changed", handler as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener("ets2:user-changed", handler as EventListener);
    };
  }, []);

  // Load layout when we have a userId
  useEffect(() => {
    if (userId == null) return;

    fetch(`/api/layouts/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.layout && Array.isArray(data.layout)) {
          // normalize old widget shape to new WidgetItem shape
          const normalized = data.layout.map((w: any, idx: number) => {
            if (w?.type) return w;
            // legacy: { id: 'speed', title: 'Speed' }
            const t = w.id || w.title?.toLowerCase() || `widget-${idx}`;
            return { id: `${t}-${idx}`, type: t.toString().split('-')[0], title: w.title ?? w.id };
          });
          setWidgets(normalized);
        }
      })
      .catch(() => {});
  }, [userId]);

  function onDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null) return;
    const copy = [...widgets];
    const [moved] = copy.splice(dragIndex, 1);
    copy.splice(index, 0, moved);
    setWidgets(copy);
    setDragIndex(null);
  }

  async function saveLayout() {
    if (userId == null) {
      setStatus("No user ID — cannot save");
      setTimeout(() => setStatus(""), 1500);
      return;
    }

    setStatus("Saving...");
    try {
      // merge with existing layout to preserve other keys (e.g., panels)
      const existing = await fetch(`/api/layouts/${userId}`).then(r => r.json()).catch(() => ({}));
      const base = existing?.layout && typeof existing.layout === 'object' ? { ...existing.layout } : {};
      base.widgets = widgets;
      const res = await fetch(`/api/layouts/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: base }),
      });
      if (res.ok) setStatus("Saved");
      else setStatus("Save failed");
    } catch {
      setStatus("Save failed");
    }
    setTimeout(() => setStatus(""), 1500);
  }

  function resetDefaults() {
    setWidgets(DEFAULT_WIDGETS);
  }

  function addWidget() {
    const t = newWidgetType;
    const idx = Date.now();
    const meta = availableWidgetTypes.find((a) => a.type === t);
    const title = meta?.title ?? t;
    const defaultSettings: Record<string, any> = t === 'speed' ? { unit: 'kmh' } : t === 'rpm' ? { warnAbove: 4000 } : {};
    const newWidget = { id: `${t}-${idx}`, type: t, title, settings: defaultSettings } as any;
    setWidgets((s) => {
      const next = [...s, newWidget];
      // auto-save when adding
      autoSaveLayout(next).catch(() => {});
      return next;
    });
  }

  function removeWidget(id: string) {
    setWidgets((s) => {
      const next = s.filter((w) => w.id !== id);
      // auto-save when removing
      autoSaveLayout(next).catch(() => {});
      return next;
    });
    setSettingsOpen(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  function toggleSettings(id: string) {
    setSettingsOpen(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function updateWidgetSettings(id: string, newSettings: Record<string, any>) {
    setWidgets(s => {
      const next = s.map(w => w.id === id ? { ...w, settings: { ...(w.settings || {}), ...newSettings } } : w);
      autoSaveLayout(next).catch(() => {});
      return next;
    });
  }

  async function autoSaveLayout(widgetsToSave: any[]) {
    if (userId == null) return;
    try {
      const existing = await fetch(`/api/layouts/${userId}`).then(r => r.json()).catch(() => ({}));
      const base = existing?.layout && typeof existing.layout === 'object' ? { ...existing.layout } : {};
      base.widgets = widgetsToSave;
      await fetch(`/api/layouts/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: base }),
      });
    } catch {
      // swallow errors for autosave
    }
  }

  async function deleteLayout() {
    if (userId == null) {
      setStatus("No user ID — cannot delete layout");
      setTimeout(() => setStatus(""), 1500);
      return;
    }
    const ok = window.confirm("Delete saved layout for this user? This cannot be undone.");
    if (!ok) return;
    try {
      const res = await fetch(`/api/layouts/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setStatus("Layout deleted");
        setWidgets(DEFAULT_WIDGETS);
      } else {
        setStatus("Delete failed");
      }
    } catch {
      setStatus("Delete failed");
    }
    setTimeout(() => setStatus(""), 1500);
  }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <button onClick={saveLayout} disabled={loadingUser || userId == null}>
          {loadingUser ? "Loading user..." : "Save layout"}
        </button>{" "}
        <button onClick={resetDefaults}>Reset</button>{" "}
        <button onClick={deleteLayout} disabled={loadingUser || userId == null}>Delete layout</button> <span>{status}</span>
      </div>

      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ minWidth: 200 }}>
          <Select onValueChange={(val) => setNewWidgetType(val)}>
            <SelectTrigger>
              <SelectValue>{availableWidgetTypes.find(a => a.type === newWidgetType)?.title ?? 'Widget'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableWidgetTypes.map((t) => (
                <SelectItem key={t.type} value={t.type}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={addWidget} disabled={loadingUser || userId == null} size="sm">Add widget</Button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 8,
        }}
      >
        {widgets.map((w, i) => {
          const Comp = registry[w.type];
          return (
            <div
              key={w.id}
              draggable
              onDragStart={(e) => onDragStart(e, i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDrop={(e) => onDrop(e, i)}
              style={{
                minHeight: 80,
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: 8,
                background: "#fff",
              }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{w.title}</strong>
                <Button size="sm" variant="outline" onClick={() => removeWidget(w.id)}>Remove</Button>
              </div>
              <div style={{ marginTop: 6 }}>
                {Comp ? <Comp telemetry={telemetryData ?? null} settings={w.settings} /> : <div style={{ fontSize: 12, color: '#666' }}>No widget for type {w.type}</div>}
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => toggleSettings(w.id)} style={{ fontSize: 12, marginRight: 8 }}>⚙ Settings</button>
                  {settingsOpen[w.id] ? (
                    <div style={{ marginTop: 6 }}>
                      {w.type === 'speed' && (
                        <div>
                          <label className="text-xs">Unit: </label>
                          <select value={w.settings?.unit ?? 'kmh'} onChange={(e) => updateWidgetSettings(w.id, { unit: e.target.value })}>
                            <option value="kmh">km/h</option>
                            <option value="mph">mph</option>
                          </select>
                        </div>
                      )}
                      {w.type === 'rpm' && (
                        <div>
                          <label className="text-xs">Warn above (rpm): </label>
                          <input type="number" value={w.settings?.warnAbove ?? ''} onChange={(e) => updateWidgetSettings(w.id, { warnAbove: Number(e.target.value) || null })} />
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
