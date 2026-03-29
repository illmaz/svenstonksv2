import { EtfHoldingsSnapshot, UnderlyingExposure } from "./types"

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

function normalizeHoldingName(value: string): string {
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

function chooseMergedDisplayName(
  left: string | null | undefined,
  right: string | null | undefined
): string {
  const leftTrimmed = left?.trim() ?? ""
  const rightTrimmed = right?.trim() ?? ""

  if (!leftTrimmed) return rightTrimmed
  if (!rightTrimmed) return leftTrimmed

  if (normalizeHoldingName(leftTrimmed) === normalizeHoldingName(rightTrimmed)) {
    return leftTrimmed.length <= rightTrimmed.length ? leftTrimmed : rightTrimmed
  }

  return leftTrimmed
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

export function buildLookthroughExposure(
  openPositions: OpenPositionLike[],
  snapshots: EtfHoldingsSnapshot[]
): UnderlyingExposure[] {
  const exposureMap = new Map<string, UnderlyingExposure>()

  const totalPortfolioInvested = openPositions.reduce(
    (sum, position) => sum + position.investedValue,
    0
  )

  for (const position of openPositions) {
    const snapshot = findMatchingEtfSnapshot(position, snapshots)

    if (!snapshot) {
      continue
    }

    for (const constituent of snapshot.constituents) {
      const exposureValue = position.investedValue * (constituent.weightPct / 100)
      const canonicalName = normalizeHoldingName(constituent.name)

      const key =
        normalize(constituent.isin) ??
        normalize(constituent.ticker) ??
        canonicalName

      let existingKey = key
      let existing = exposureMap.get(key)

      if (!existing) {
        for (const [candidateKey, candidateExposure] of exposureMap.entries()) {
          if (normalizeHoldingName(candidateExposure.name) === canonicalName) {
            existingKey = candidateKey
            existing = candidateExposure
            break
          }
        }
      }

      if (!existing) {
        exposureMap.set(key, {
          name: constituent.name,
          ticker: constituent.ticker,
          isin: constituent.isin,
          sector: constituent.sector,
          country: constituent.country,
          exposureValue,
          exposurePctOfPortfolio:
            totalPortfolioInvested > 0
              ? (exposureValue / totalPortfolioInvested) * 100
              : 0,
        })
        continue
      }

      const nextExposureValue = existing.exposureValue + exposureValue

      exposureMap.set(existingKey, {
        ...existing,
        name: chooseMergedDisplayName(existing.name, constituent.name),
        ticker: existing.ticker ?? constituent.ticker,
        isin: existing.isin ?? constituent.isin,
        sector: existing.sector ?? constituent.sector,
        country: existing.country ?? constituent.country,
        exposureValue: nextExposureValue,
        exposurePctOfPortfolio:
          totalPortfolioInvested > 0
            ? (nextExposureValue / totalPortfolioInvested) * 100
            : 0,
      })
    }
  }

  return Array.from(exposureMap.values()).sort(
    (a, b) => b.exposureValue - a.exposureValue
  )
}