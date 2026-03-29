"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function AddHoldingPage() {
  const router = useRouter()

  const [ticker, setTicker] = useState("")
  const [shares, setShares] = useState("")
  const [avgPrice, setAvgPrice] = useState("")

  async function handleSubmit(action: "add-another" | "go-home") {

    if (!ticker || ticker.trim() === "") {
  alert("Asset name or ticker is required.")
  return
}

    if (Number(shares) <= 0) {
  alert("Shares must be greater than 0.")
  return
}

   if (Number(avgPrice) <= 0) {
  alert("Average price must be greater than 0.")
  return
}
    const res = await fetch("/api/holdings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticker,
        shares: Number(shares),
        avgPrice: Number(avgPrice),
      }),
    })

    if (!res.ok) {
      alert("Failed to save holding")
      return
    }

    if (action === "add-another") {
      setTicker("")
      setShares("")
      setAvgPrice("")
      alert("Holding saved!")
      return
    }

    router.push("/")
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Add Holding</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 300 }}>
        <input
          placeholder="Ticker"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
        />
        <input
          type="number"
          min="0"
          step="0.0001"
          placeholder="Shares"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Average Price"
          value={avgPrice}
          onChange={(e) => setAvgPrice(e.target.value)}
        />
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => handleSubmit("add-another")}>Save & Add Another</button>
          <button onClick={() => handleSubmit("go-home")}>Save & Go Home</button>
        </div>
      </div>
    </main>
  )
}