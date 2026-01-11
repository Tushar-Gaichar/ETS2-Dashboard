import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

type UserInfo = { userId: number; username?: string } | null;

const STORAGE_KEY = "ets2_user";

export default function UserProfile() {
  const [user, setUser] = useState<UserInfo>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<Array<{ id: number; username?: string }>>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Load from localStorage or fetch from server
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setUser(parsed);
        setName(parsed?.username ?? "");
        // continue to fetch users list even if we loaded a local user
      } catch {}
    }

    // fallback: request server to create/return default user
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        if (data?.userId) {
          const u = { userId: data.userId, username: data.username };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
          setUser(u);
          setName(u.username ?? "");
        }
      })
      .catch(() => {});

    // load users list once on mount
    fetch('/api/users')
      .then(r => r.json())
      .then(d => {
        if (d?.users && Array.isArray(d.users)) setUsers(d.users);
      })
      .catch(() => {});
  }, []);

  async function saveName() {
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/user?username=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data?.userId) {
        const u = { userId: data.userId, username: data.username ?? name };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        setUser(u);
        setEditing(false);

        // notify other components (e.g., DashboardLayout) that user changed
        window.dispatchEvent(new CustomEvent("ets2:user-changed", { detail: u }));

        // refresh users list after creating/renaming
        fetch('/api/users')
          .then(r => r.json())
          .then(d => { if (d?.users) setUsers(d.users); })
          .catch(() => {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser(targetUserId?: number) {
    const idToDelete = targetUserId ?? user?.userId;
    if (!idToDelete) return;
    const ok = window.confirm("Delete this user and their layout? This cannot be undone.");
    if (!ok) return;
    try {
      const res = await fetch(`/api/users/${idToDelete}`, { method: "DELETE" });
      if (res.ok) {
        // remove from local storage if it was the current user
        const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (current && current.userId === idToDelete) {
          localStorage.removeItem(STORAGE_KEY);
          setUser(null);
          setName("");
          window.dispatchEvent(new CustomEvent("ets2:user-changed", { detail: null }));
        }
        // refresh users list
        fetch('/api/users')
          .then(r => r.json())
          .then(d => { if (d?.users) setUsers(d.users); })
          .catch(() => {});
      } else {
        console.error('Failed to delete user');
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Fetch users list when opening the switcher to ensure it's fresh
  useEffect(() => {
    if (!showSwitcher) return;
    fetch('/api/users')
      .then(r => r.json())
      .then(d => { if (d?.users) setUsers(d.users); })
      .catch(() => {});
  }, [showSwitcher]);

  return (
    <div className="flex items-center space-x-3">
      <div className="text-sm text-muted-foreground">Profile</div>

      {/* Always-visible compact switch control */}
      {users.length > 0 && (
        <div className="flex items-center">
          <Button size="sm" variant="outline" className="mr-2 bg-[#2094f3ff] text-white hover:bg-[#1b82d8] border-transparent" onClick={() => setShowSwitcher(!showSwitcher)}>
            Switch
          </Button>
          {showSwitcher && (
            <div style={{ minWidth: 160 }}>
              <Select onValueChange={async (val) => {
                if (!val) return;
                try {
                  const res = await fetch(`/api/user?username=${encodeURIComponent(val)}`);
                  const d = await res.json();
                  if (d?.userId) {
                    const u = { userId: d.userId, username: d.username };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
                    setUser(u);
                    window.dispatchEvent(new CustomEvent("ets2:user-changed", { detail: u }));
                  }
                } catch (err) {
                  console.error(err);
                }
              }}>
                <SelectTrigger>
                  <SelectValue>{user?.username ?? 'Select user'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.username ?? `user-${u.id}`}>
                      {u.username ?? `user-${u.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {!editing ? (
        <div className="flex items-center space-x-2">
          <div className="font-medium">{user?.username ?? "Guest"}</div>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)} aria-label="Edit profile">
            Edit
          </Button>
          <Button size="sm" variant="destructive" className="ml-2" onClick={() => handleDeleteUser()} aria-label="Delete profile">
            Delete
          </Button>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <input
            className="px-2 py-1 rounded bg-surface border"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter username"
          />
          <button className="btn" onClick={saveName} disabled={saving || !name}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button className="text-sm text-muted-foreground" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
