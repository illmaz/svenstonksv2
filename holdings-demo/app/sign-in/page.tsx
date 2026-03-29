"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function SignInPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const username = form.get("username") as string
    const password = form.get("password") as string

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })

    setLoading(false)

    if (res.ok) {
      router.push("/dashboard")
    } else {
      setError("Invalid username or password.")
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "var(--color-bg)", fontFamily: "var(--font-sans)",
    }}>
      <div style={{
        backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, padding: "40px 36px", width: "100%", maxWidth: 360,
      }}>
        <p style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 24px" }}>
          intel<span style={{ color: "var(--color-accent)" }}>.</span>
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>
              Username
            </label>
            <input
              name="username"
              type="text"
              autoComplete="username"
              required
              style={{
                width: "100%", padding: "8px 12px", fontSize: 14,
                border: "1px solid var(--color-border)", borderRadius: 8,
                backgroundColor: "var(--color-bg)", color: "var(--color-text-primary)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>
              Password
            </label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              style={{
                width: "100%", padding: "8px 12px", fontSize: 14,
                border: "1px solid var(--color-border)", borderRadius: 8,
                backgroundColor: "var(--color-bg)", color: "var(--color-text-primary)",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: "var(--color-danger)", margin: "0 0 16px" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "9px 0", fontSize: 14, fontWeight: 500,
              backgroundColor: "var(--color-text-primary)", color: "var(--color-surface)",
              border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  )
}
