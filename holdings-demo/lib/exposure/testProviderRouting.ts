import { getEtfProvider } from "./providers/registry"
import { getIsharesHoldingsSnapshot } from "./providers/ishares"
import { getVanguardHoldingsSnapshot } from "./providers/vanguard"
import { getInvescoHoldingsSnapshot } from "./providers/invesco"
import { getVaneckHoldingsSnapshot } from "./providers/vaneck"
import { getSpdrHoldingsSnapshot } from "./providers/spdr"
import { buildLookthroughExposure } from "./buildLookthroughExposure"

function isImplementedProvider(provider: string | null): boolean {
  return (
    provider === "ishares" ||
    provider === "vanguard" ||
    provider === "invesco" ||
    provider === "vaneck" ||
    provider === "spdr"
  )
}

async function main() {
  const openPositions = [
    {
      ticker: "EQQQ",
      isin: "IE0032077012",
      productName: "Invesco EQQQ NASDAQ-100 UCITS ETF Dist",
      investedValue: 3000,
    },
    {
      ticker: "IAEX",
      isin: null,
      productName: "iShares AEX UCITS ETF EUR (Dist)",
      investedValue: 3000,
    },
    {
      ticker: null,
      isin: "IE00B1YZSC51",
      productName: "iShares Core MSCI Europe UCITS ETF EUR (Acc)",
      investedValue: 2500,
    },
    {
      ticker: "IWDA",
      isin: "IE00B4L5Y983",
      productName: "iShares Core MSCI World UCITS ETF USD (Acc)",
      investedValue: 10000,
    },
    {
      ticker: "IDVY",
      isin: null,
      productName: "iShares Euro Dividend UCITS ETF EUR Dist",
      investedValue: 1600,
    },
    {
      ticker: "VUSA",
      isin: null,
      productName: "Vanguard S&P 500 UCITS ETF USD",
      investedValue: 5000,
    },
    {
      ticker: "VVSM",
      isin: null,
      productName: "VanEck Semiconductor ETF / VVSM",
      investedValue: 2000,
    },
    {
      ticker: "USDV",
      isin: null,
      productName: "SPDR S&P US Dividend Aristocrats ETF",
      investedValue: 900,
    },
  ]

  const supportedPositions = openPositions.filter((position) => {
    const provider = getEtfProvider({
      isin: position.isin,
      ticker: position.ticker,
    })

    return isImplementedProvider(provider)
  })

  const unsupportedPositions = openPositions
    .map((position) => {
      const provider = getEtfProvider({
        isin: position.isin,
        ticker: position.ticker,
      })

      return {
        ticker: position.ticker,
        isin: position.isin,
        provider,
      }
    })
    .filter((position) => !isImplementedProvider(position.provider))

  const liveSnapshots = (
    await Promise.all(
      openPositions.map(async (position) => {
        const provider = getEtfProvider({
          isin: position.isin,
          ticker: position.ticker,
        })

        if (provider === "ishares") {
          return getIsharesHoldingsSnapshot({
            isin: position.isin,
            ticker: position.ticker,
          })
        }

        if (provider === "vanguard") {
          return getVanguardHoldingsSnapshot({
            isin: position.isin,
            ticker: position.ticker,
          })
        }

        if (provider === "invesco") {
          return getInvescoHoldingsSnapshot({
            isin: position.isin,
            ticker: position.ticker,
          })
        }

        if (provider === "vaneck") {
          return getVaneckHoldingsSnapshot({
            isin: position.isin,
            ticker: position.ticker,
          })
        }

        if (provider === "spdr") {
          return getSpdrHoldingsSnapshot({
            isin: position.isin,
            ticker: position.ticker,
          })
        }

        return null
      })
    )
  ).filter(
    (snapshot): snapshot is NonNullable<typeof snapshot> =>
      snapshot !== null
  )

  const exposure = buildLookthroughExposure(openPositions, liveSnapshots)

  console.log("supportedPositionCount:", supportedPositions.length)
  console.log("unsupportedPositions:", unsupportedPositions)
  console.log("liveSnapshotCount:", liveSnapshots.length)
  console.log("top exposure sample:")
  console.log(exposure.slice(0, 10))
}

main().catch((error) => {
  console.error("PROVIDER ROUTING TEST ERROR:", error)
  process.exit(1)
})