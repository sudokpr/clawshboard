"use client";
import { useState, useEffect, useCallback } from "react";

type Project = { id: string; name: string; description: string | null; color: string; progress: number; createdAt: string; updatedAt: string; owner: { name: string | null; email: string }; tasks: { id: string; status: string }[] };
type Task = { id: string; title: string; status: string; priority: string; projectId: string | null };

const COLUMNS = ["backlog", "in_progress", "in_review", "done"];
const STATUS_LABELS: Record<string, string> = { backlog: "Backlog", in_progress: "In Progress", in_review: "In Review", done: "Done" };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ name: "", description: "", color: "#6366f1" });
  const [editProgress, setEditProgress] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    const [p, t] = await Promise.all([fetch("/api/projects").then(r => r.ok ? r.json() : []), fetch("/api/tasks").then(r => r.ok ? r.json() : [])]);
    setProjects(p);
    setTasks(t);
    const prog: Record<string, number> = {};
    p.forEach((proj: Project) => { prog[proj.id] = proj.progress; });
    setEditProgress(prog);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function createProject() {
    if (!newProject.name.trim()) return;
    const res = await fetch("/api/projects", { method: "POST", body: JSON.stringify({ ...newProject, ownerId: "self" }) });
    if (res.ok) { setShowModal(false); setNewProject({ name: "", description: "", color: "#6366f1" }); fetchData(); }
  }

  async function updateProgress(projectId: string, progress: number) {
    await fetch("/api/projects", { method: "PATCH", body: JSON.stringify({ id: projectId, progress }) });
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, progress } : p));
  }

  async function deleteProject(projectId: string) {
    await fetch("/api/projects", { method: "DELETE", body: JSON.stringify({ id: projectId }) });
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (selectedProject?.id === projectId) setSelectedProject(null);
  }

  function getProjectTasks(projectId: string) {
    return {
      total: tasks.filter(t => t.projectId === projectId).length,
      done: tasks.filter(t => t.projectId === projectId && t.status === "done").length,
      byStatus: Object.fromEntries(COLUMNS.map(s => [s, tasks.filter(t => t.projectId === projectId && t.status === s).length])),
    };
  }

  if (loading) return <div style={{ color: "var(--text-muted)", padding: 40 }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Projects</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>{projects.length} projects</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "8px 16px", background: "var(--accent)", borderRadius: 8, fontWeight: 500, fontSize: 13 }}>+ New Project</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {projects.map(project => {
          const stats = getProjectTasks(project.id);
          return (
            <div key={project.id} onClick={() => setSelectedProject(project)}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: project.color, marginTop: 3, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{project.name}</div>
                  {project.description && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.4 }}>{project.description}</div>}
                </div>
                <button onClick={e => { e.stopPropagation(); deleteProject(project.id); }} style={{ color: "var(--text-subtle)", fontSize: 16, lineHeight: 1, padding: "0 4px" }}>×</button>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                  <span>Progress</span>
                  <span>{stats.total > 0 ? Math.round(stats.done / stats.total * 100) : project.progress}%</span>
                </div>
                <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${stats.total > 0 ? Math.round(stats.done / stats.total * 100) : project.progress}%`, background: project.color, borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {COLUMNS.map(s => stats.byStatus[s] > 0 && (
                  <span key={s} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "var(--surface-2)", color: "var(--text-muted)" }}>
                    {STATUS_LABELS[s]}: {stats.byStatus[s]}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ width: 420, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>New Project</h3>
            <input placeholder="Project name" value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 10 }} />
            <textarea placeholder="Description (optional)" value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 10, minHeight: 60, resize: "vertical" }} />
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Color</label>
              <input type="color" value={newProject.color} onChange={e => setNewProject(p => ({ ...p, color: e.target.value }))} style={{ width: 60, height: 36, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", border: "1px solid var(--border)", borderRadius: 8 }}>Cancel</button>
              <button onClick={createProject} style={{ flex: 1, padding: "10px", background: "var(--accent)", borderRadius: 8, fontWeight: 500 }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {selectedProject && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={e => e.target === e.currentTarget && setSelectedProject(null)}>
          <div style={{ width: 560, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: selectedProject.color, marginTop: 2 }} />
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600 }}>{selectedProject.name}</h3>
                {selectedProject.description && <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>{selectedProject.description}</p>}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24 }}>
              {COLUMNS.map(s => {
                const count = tasks.filter(t => t.projectId === selectedProject.id && t.status === s).length;
                return (
                  <div key={s} style={{ background: "var(--surface-2)", borderRadius: 8, padding: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>{count}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{STATUS_LABELS[s]}</div>
                  </div>
                );
              })}
            </div>

            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Tasks</h4>
              {tasks.filter(t => t.projectId === selectedProject.id).length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No tasks linked to this project.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {tasks.filter(t => t.projectId === selectedProject.id).map(t => (
                    <div key={t.id} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, flex: 1 }}>{t.title}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", padding: "2px 8px", background: "var(--surface)", borderRadius: 4 }}>{STATUS_LABELS[t.status]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}