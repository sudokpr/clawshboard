"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function sendOtp() {
    if (!email) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/otp/send", { method: "POST", body: JSON.stringify({ email }) });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setStep("otp");
    else setError(data.error || "Failed to send OTP");
  }

  async function verifyOtp() {
    if (!code) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/otp/verify", { method: "POST", body: JSON.stringify({ email, code }) });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      document.cookie = `next-auth-session-token=${data.token}; path=/; httpOnly`;
      router.push("/tasks");
    } else {
      setError(data.error || "Invalid code");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ width: 360, padding: 40, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Clawshboard</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>Operator dashboard — sign in to continue</p>

        {step === "email" ? (
          <>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendOtp()}
              style={{ width: "100%", padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12 }}
            />
            <button onClick={sendOtp} disabled={loading} style={{ width: "100%", padding: "10px", background: "var(--accent)", borderRadius: 8, fontWeight: 500, opacity: loading ? 0.6 : 1 }}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        ) : (
          <>
            <p style={{ color: "var(--text-muted)", marginBottom: 16, fontSize: 13 }}>Check your email — code sent to <strong style={{ color: "var(--text)" }}>{email}</strong></p>
            <input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && verifyOtp()}
              style={{ width: "100%", padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12, fontSize: 18, letterSpacing: 6, textAlign: "center" }}
            />
            <button onClick={verifyOtp} disabled={loading || code.length !== 6} style={{ width: "100%", padding: "10px", background: "var(--accent)", borderRadius: 8, fontWeight: 500, opacity: loading || code.length !== 6 ? 0.6 : 1 }}>
              {loading ? "Verifying..." : "Sign In"}
            </button>
            <button onClick={() => setStep("email")} style={{ width: "100%", marginTop: 8, color: "var(--text-muted)", fontSize: 13 }}>← Change email</button>
          </>
        )}
        {error && <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}