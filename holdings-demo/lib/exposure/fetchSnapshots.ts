import { OpenPosition } from "@/lib/portfolio/types"
import { EtfHoldingsSnapshot } from "@/lib/exposure/types"
import { getEtfProvider } from "@/lib/exposure/providers/registry"
import { getIsharesHoldingsSnapshot } from "@/lib/exposure/providers/ishares"
import { getVanguardHoldingsSnapshot } from "@/lib/exposure/providers/vanguard"
import { getInvescoHoldingsSnapshot } from "@/lib/exposure/providers/invesco"
import { getVaneckHoldingsSnapshot } from "@/lib/exposure/providers/vaneck"
import { getSpdrHoldingsSnapshot } from "@/lib/exposure/providers/spdr"

function isImplementedProvider(provider: string | null): boolean {
  return (
    provider === "ishares" ||
    provider === "vanguard" ||
    provider === "invesco" ||
    provider === "vaneck" ||
    provider === "spdr"
  )
}

export async function fetchSnapshots(
  openPositions: OpenPosition[]
): Promise<{
  snapshots: EtfHoldingsSnapshot[]
  failedProviders: { ticker: string | null; isin: string | null; provider: string }[]
}> {
  const settledSnapshotResults = await Promise.allSettled(
    openPositions.map(async (position) => {
      const provider = getEtfProvider({
        isin: position.isin,
        ticker: position.ticker,
      })

      if (provider === "ishares") {
        return {
          ticker: position.ticker,
          isin: position.isin,
          provider,
          snapshot: await getIsharesHoldingsSnapshot({
            isin: position.isin,
            ticker: position.ticker,
          }),
        }
      }

      if (provider === "vanguard") {
        return {
          ticker: position.ticker,
          isin: position.isin,
          provider,
          snapshot: await getVanguardHoldingsSnapshot({
            isin: position.isin,
            ticker: position.ticker,
          }),
        }
      }

      if (provider === "invesco") {
        return {
          ticker: position.ticker,
          isin: position.isin,
          provider,
          snapshot: await getInvescoHoldingsSnapshot({
            isin: position.isin,
            ticker: position.ticker,
          }),
        }
      }

      if (provider === "vaneck") {
        return {
          ticker: position.ticker,
          isin: position.isin,
          provider,
          snapshot: await getVaneckHoldingsSnapshot({
            isin: position.isin,
            ticker: position.ticker,
          }),
        }
      }

      if (provider === "spdr") {
        return {
          ticker: position.ticker,
          isin: position.isin,
          provider,
          snapshot: await getSpdrHoldingsSnapshot({
            isin: position.isin,
            ticker: position.ticker,
          }),
        }
      }

      // not supported yet
      return {
        ticker: position.ticker,
        isin: position.isin,
        provider,
        snapshot: null,
      }
    })
  )

  const rejectedIndices = new Set<number>()

  const snapshotResults = settledSnapshotResults.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value
    }

    const position = openPositions[index]
    const provider = getEtfProvider({
      isin: position?.isin,
      ticker: position?.ticker,
    })

    rejectedIndices.add(index)
    console.warn("provider request failed", {
      provider,
      ticker: position?.ticker ?? null,
      isin: position?.isin ?? null,
    })

    return {
      ticker: position?.ticker ?? null,
      isin: position?.isin ?? null,
      provider,
      snapshot: null,
    }
  })

  snapshotResults.forEach((result, index) => {
    if (
      !rejectedIndices.has(index) &&
      isImplementedProvider(result.provider) &&
      result.snapshot === null
    ) {
      console.warn("snapshot returned null", {
        provider: result.provider,
        ticker: result.ticker,
        isin: result.isin,
      })
    }
  })

  const snapshots = snapshotResults
    .map((result) => result.snapshot)
    .filter(
      (snapshot): snapshot is NonNullable<typeof snapshot> =>
        snapshot !== null
    )

  const failedProviders = snapshotResults
    .filter(
      (result) =>
        isImplementedProvider(result.provider) &&
        result.snapshot === null
    )
    .map((result) => ({
      ticker: result.ticker,
      isin: result.isin,
      provider: result.provider as string,
    }))

  return { snapshots, failedProviders }
}
