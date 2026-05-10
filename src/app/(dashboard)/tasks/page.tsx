"use client";
import { useState, useEffect, useCallback } from "react";

type Task = { id: string; title: string; description: string | null; status: string; priority: string; assigneeId: string | null; projectId: string | null; createdAt: string; updatedAt: string; assignee: { name: string | null; email: string } | null; project: { name: string; color: string } | null };
type Column = { id: string; label: string; color: string };

const COLUMNS: Column[] = [
  { id: "backlog", label: "Backlog", color: "#71717a" },
  { id: "in_progress", label: "In Progress", color: "#f59e0b" },
  { id: "in_review", label: "In Review", color: "#8b5cf6" },
  { id: "done", label: "Done", color: "#22c55e" },
];

const PRIORITY_COLOR: Record<string, string> = { urgent: "#ef4444", high: "#f97316", medium: "#eab308", low: "#71717a" };

const STATUS_LABELS: Record<string, string> = { backlog: "Backlog", in_progress: "In Progress", in_review: "In Review", done: "Done" };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", status: "backlog", priority: "medium" });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function createTask() {
    if (!newTask.title.trim()) return;
    const res = await fetch("/api/tasks", { method: "POST", body: JSON.stringify(newTask) });
    if (res.ok) { setShowModal(false); setNewTask({ title: "", description: "", status: "backlog", priority: "medium" }); fetchTasks(); }
  }

  async function moveTask(taskId: string, newStatus: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await fetch("/api/tasks", { method: "PATCH", body: JSON.stringify({ id: taskId, status: newStatus }) });
  }

  async function deleteTask(taskId: string) {
    await fetch("/api/tasks", { method: "DELETE", body: JSON.stringify({ id: taskId }) });
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDragging(taskId);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault();
    setDragOver(colId);
  }
  function handleDrop(e: React.DragEvent, colId: string) {
    e.preventDefault();
    if (dragging) moveTask(dragging, colId);
    setDragging(null);
    setDragOver(null);
  }

  if (loading) return <div style={{ color: "var(--text-muted)", padding: 40 }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Tasks</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>{tasks.length} total</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "8px 16px", background: "var(--accent)", borderRadius: 8, fontWeight: 500, fontSize: 13 }}>
          + New Task
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(240px, 1fr))`, gap: 12, alignItems: "start" }}>
        {COLUMNS.map(col => (
          <div key={col.id} onDragOver={e => handleDragOver(e, col.id)} onDrop={e => handleDrop(e, col.id)}
            style={{ background: dragOver === col.id ? "var(--surface-2)" : "var(--surface)", borderRadius: 10, border: `1px solid ${dragOver === col.id ? "var(--accent)" : "var(--border)"}`, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, display: "inline-block" }} />
              <span style={{ fontWeight: 500, fontSize: 13 }}>{col.label}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", background: "var(--surface-2)", padding: "1px 8px", borderRadius: 10 }}>
                {tasks.filter(t => t.status === col.id).length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
              {tasks.filter(t => t.status === col.id).map(task => (
                <div key={task.id} draggable onDragStart={e => handleDragStart(e, task.id)}
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, cursor: "grab", opacity: dragging === task.id ? 0.5 : 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 13, lineHeight: 1.4, flex: 1 }}>{task.title}</span>
                    <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: "50%", marginTop: 4, background: PRIORITY_COLOR[task.priority] || "var(--text-muted)" }} />
                  </div>
                  {task.description && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>{task.description.slice(0, 60)}{task.description.length > 60 ? "..." : ""}</p>}
                  {task.project && (
                    <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, background: `${task.project.color}20`, fontSize: 11, color: task.project.color }}>
                      {task.project.name}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                    {task.assignee && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{task.assignee.name || task.assignee.email}</span>}
                    <button onClick={() => deleteTask(task.id)} style={{ fontSize: 11, color: "var(--text-subtle)", padding: "2px 4px" }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ width: 440, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>New Task</h3>
            <input placeholder="Title" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 10 }} />
            <textarea placeholder="Description (optional)" value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 10, minHeight: 80, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <select value={newTask.status} onChange={e => setNewTask(p => ({ ...p, status: e.target.value }))} style={{ flex: 1, padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }}>
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))} style={{ flex: 1, padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }}>
                {["low", "medium", "high", "urgent"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", border: "1px solid var(--border)", borderRadius: 8 }}>Cancel</button>
              <button onClick={createTask} style={{ flex: 1, padding: "10px", background: "var(--accent)", borderRadius: 8, fontWeight: 500 }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}