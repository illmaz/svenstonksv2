import { EtfHoldingsSnapshot, OverlapExposure } from "./types"

type OpenPositionLike = {
  ticker: string | null
  isin: string | null
  productName: string | null
  investedValue: number
}

function normalize(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

function normalizeName(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s*USD\s*\d+(?:\.\d+)?$/g, "")
    .replace(/[.-]/g, " ")
    .replace(/\bCL\s+A\b/g, "CLASS A")
    .replace(/\bCL\s+C\b/g, "CLASS C")
    .replace(/\s+NPV$/g, "")
    .replace(/\s+ADR$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function findMatchingEtfSnapshot(
  position: OpenPositionLike,
  snapshots: EtfHoldingsSnapshot[]
): EtfHoldingsSnapshot | null {
  const positionIsin = normalize(position.isin)
  const positionTicker = normalize(position.ticker)

  for (const snapshot of snapshots) {
    const snapshotIsin = normalize(snapshot.etfIsin)
    const snapshotTicker = normalize(snapshot.etfTicker)

    if (positionIsin && snapshotIsin && positionIsin === snapshotIsin) {
      return snapshot
    }

    if (positionTicker && snapshotTicker && positionTicker === snapshotTicker) {
      return snapshot
    }
  }

  return null
}

export function buildOverlapExposure(
  openPositions: OpenPositionLike[],
  snapshots: EtfHoldingsSnapshot[]
): OverlapExposure[] {
  const overlapMap = new Map<string, OverlapExposure>()

  const totalPortfolioInvested = openPositions.reduce(
    (sum, position) => sum + position.investedValue,
    0
  )

  for (const position of openPositions) {
    const snapshot = findMatchingEtfSnapshot(position, snapshots)

    if (!snapshot) continue

    const snapshotLabel =
      snapshot.etfTicker ||
      snapshot.etfIsin ||
      snapshot.etfName ||
      "Unknown ETF"

    for (const constituent of snapshot.constituents) {
      const exposureValue = position.investedValue * (constituent.weightPct / 100)

      const key =
        normalize(constituent.isin) ??
        normalize(constituent.ticker) ??
        constituent.name.trim().toUpperCase()

      let existingKey = key
      let existing = overlapMap.get(key)

      if (!existing) {
        const canonicalName = normalizeName(constituent.name)
        for (const [candidateKey, candidateEntry] of overlapMap.entries()) {
          if (normalizeName(candidateEntry.name) === canonicalName) {
            existingKey = candidateKey
            existing = candidateEntry
            break
          }
        }
      }

      if (!existing) {
        overlapMap.set(existingKey, {
          name: constituent.name,
          ticker: constituent.ticker,
          isin: constituent.isin,
          contributingEtfs: [snapshotLabel],
          contributingEtfCount: 1,
          exposureValue,
          exposurePctOfPortfolio:
            totalPortfolioInvested > 0
              ? (exposureValue / totalPortfolioInvested) * 100
              : 0,
        })
        continue
      }

      const nextEtfs = existing.contributingEtfs.includes(snapshotLabel)
        ? existing.contributingEtfs
        : [...existing.contributingEtfs, snapshotLabel]

      const nextExposureValue = existing.exposureValue + exposureValue

      overlapMap.set(existingKey, {
        ...existing,
        contributingEtfs: nextEtfs,
        contributingEtfCount: nextEtfs.length,
        exposureValue: nextExposureValue,
        exposurePctOfPortfolio:
          totalPortfolioInvested > 0
            ? (nextExposureValue / totalPortfolioInvested) * 100
            : 0,
      })
    }
  }

  return Array.from(overlapMap.values())
    .filter((row) => row.contributingEtfCount > 1)
    .sort((a, b) => b.exposureValue - a.exposureValue)
}