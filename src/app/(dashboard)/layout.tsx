"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/tasks", label: "Tasks", icon: "◈" },
  { href: "/calendar", label: "Calendar", icon: "◇" },
  { href: "/projects", label: "Projects", icon: "◎" },
  { href: "/openclaw", label: "OpenClaw", icon: "⚡" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", padding: "16px 0" }}>
        <div style={{ padding: "0 16px 16px", borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
          <h1 style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.3px" }}>Clawshboard</h1>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Mission Control</p>
        </div>
        <nav style={{ flex: 1 }}>
          {nav.map(item => (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
              color: pathname === item.href ? "var(--text)" : "var(--text-muted)",
              background: pathname === item.href ? "var(--surface-2)" : "transparent",
              fontWeight: pathname === item.href ? 500 : 400,
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto" }}>
        {/* Top nav */}
        <header style={{ height: 48, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 24px", background: "var(--bg)", position: "sticky", top: 0, zIndex: 10 }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {nav.find(n => n.href === pathname)?.label || "Clawshboard"}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
            <button style={{ fontSize: 13, color: "var(--text-muted)" }}>Settings</button>
            <button onClick={() => { document.cookie = "next-auth-session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"; window.location.href = "/login"; }} style={{ fontSize: 13, color: "var(--text-muted)" }}>Sign out</button>
          </div>
        </header>
        <div style={{ padding: 24 }}>{children}</div>
      </main>
    </div>
  );
}