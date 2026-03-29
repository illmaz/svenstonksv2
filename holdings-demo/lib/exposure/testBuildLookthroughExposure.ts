import { buildLookthroughExposure } from "./buildLookthroughExposure"
import { EtfHoldingsSnapshot } from "./types"

type OpenPosition = {
  ticker: string | null
  isin: string | null
  productName: string | null
  investedValue: number
}

type TestCase = {
  name: string
  run: () => void
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertClose(actual: number, expected: number, message: string, epsilon = 1e-9) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${message} (expected ${expected}, got ${actual})`)
  }
}

function findByIsinOrThrow(exposure: ReturnType<typeof buildLookthroughExposure>, isin: string) {
  const row = exposure.find((item) => item.isin?.toUpperCase() === isin.toUpperCase())
  if (!row) {
    throw new Error(`Could not find exposure row for ISIN ${isin}`)
  }
  return row
}

const tests: TestCase[] = [
  {
    name: "Case 1 - simple single ETF exposure",
    run: () => {
      const openPositions: OpenPosition[] = [
        {
          ticker: "ETF1",
          isin: "ETF1ISIN",
          productName: "ETF One",
          investedValue: 1000,
        },
      ]

      const snapshots: EtfHoldingsSnapshot[] = [
        {
          etfTicker: "ETF1",
          etfIsin: "ETF1ISIN",
          etfName: "ETF One",
          asOfDate: "2026-03-23",
          constituents: [
            {
              name: "APPLE INC",
              ticker: "AAPL",
              isin: "US0378331005",
              weightPct: 60,
              sector: "Technology",
              country: "United States",
            },
            {
              name: "MICROSOFT CORP",
              ticker: "MSFT",
              isin: "US5949181045",
              weightPct: 40,
              sector: "Technology",
              country: "United States",
            },
          ],
        },
      ]

      const exposure = buildLookthroughExposure(openPositions, snapshots)

      const apple = findByIsinOrThrow(exposure, "US0378331005")
      const microsoft = findByIsinOrThrow(exposure, "US5949181045")

      assertClose(apple.exposureValue, 600, "APPLE exposureValue")
      assertClose(apple.exposurePctOfPortfolio, 60, "APPLE exposurePctOfPortfolio")
      assertClose(microsoft.exposureValue, 400, "MICROSOFT exposureValue")
      assertClose(
        microsoft.exposurePctOfPortfolio,
        40,
        "MICROSOFT exposurePctOfPortfolio"
      )
    },
  },
  {
    name: "Case 2 - overlap across two ETFs by ISIN",
    run: () => {
      const openPositions: OpenPosition[] = [
        {
          ticker: "ETF_A",
          isin: "ETF_A_ISIN",
          productName: "ETF A",
          investedValue: 1000,
        },
        {
          ticker: "ETF_B",
          isin: "ETF_B_ISIN",
          productName: "ETF B",
          investedValue: 500,
        },
      ]

      const snapshots: EtfHoldingsSnapshot[] = [
        {
          etfTicker: "ETF_A",
          etfIsin: "ETF_A_ISIN",
          etfName: "ETF A",
          asOfDate: "2026-03-23",
          constituents: [
            {
              name: "COMPANY X",
              ticker: "CMPX",
              isin: "US0000000001",
              weightPct: 10,
              sector: "Tech",
              country: "United States",
            },
          ],
        },
        {
          etfTicker: "ETF_B",
          etfIsin: "ETF_B_ISIN",
          etfName: "ETF B",
          asOfDate: "2026-03-23",
          constituents: [
            {
              name: "COMPANY X",
              ticker: "CMPX",
              isin: "US0000000001",
              weightPct: 20,
              sector: "Tech",
              country: "United States",
            },
          ],
        },
      ]

      const exposure = buildLookthroughExposure(openPositions, snapshots)
      const companyXRows = exposure.filter(
        (row) => row.isin?.toUpperCase() === "US0000000001"
      )

      assert(companyXRows.length === 1, "COMPANY X should be merged into one row")
      assertClose(companyXRows[0].exposureValue, 200, "Merged COMPANY X exposureValue")
    },
  },
  {
    name: "Case 3 - fallback merge by normalized name",
    run: () => {
      const openPositions: OpenPosition[] = [
        {
          ticker: "ETF_N1",
          isin: "ETF_N1_ISIN",
          productName: "ETF N1",
          investedValue: 1000,
        },
        {
          ticker: "ETF_N2",
          isin: "ETF_N2_ISIN",
          productName: "ETF N2",
          investedValue: 1000,
        },
      ]

      const snapshots: EtfHoldingsSnapshot[] = [
        {
          etfTicker: "ETF_N1",
          etfIsin: "ETF_N1_ISIN",
          etfName: "ETF N1",
          asOfDate: "2026-03-23",
          constituents: [
            {
              name: "NVIDIA CORP",
              ticker: "NVDA",
              isin: "US67066G1040",
              weightPct: 10,
              sector: "Technology",
              country: "United States",
            },
          ],
        },
        {
          etfTicker: "ETF_N2",
          etfIsin: "ETF_N2_ISIN",
          etfName: "ETF N2",
          asOfDate: "2026-03-23",
          constituents: [
            {
              name: "NVIDIA CORP USD0.001",
              ticker: null,
              isin: null,
              weightPct: 5,
              sector: "Technology",
              country: "United States",
            },
          ],
        },
      ]

      const exposure = buildLookthroughExposure(openPositions, snapshots)
      const nvidiaRows = exposure.filter((row) => row.name.toUpperCase().includes("NVIDIA CORP"))

      assert(nvidiaRows.length === 1, "NVIDIA rows should merge into one entry")
      assertClose(nvidiaRows[0].exposureValue, 150, "Merged NVIDIA exposureValue")
    },
  },
  {
    name: "Case 4 - unsupported position dilution check",
    run: () => {
      const openPositions: OpenPosition[] = [
        {
          ticker: "ETF_MATCHED",
          isin: "ETF_MATCHED_ISIN",
          productName: "Matched ETF",
          investedValue: 1000,
        },
        {
          ticker: "ETF_UNSUPPORTED",
          isin: "ETF_UNSUPPORTED_ISIN",
          productName: "Unsupported ETF",
          investedValue: 1000,
        },
      ]

      const snapshots: EtfHoldingsSnapshot[] = [
        {
          etfTicker: "ETF_MATCHED",
          etfIsin: "ETF_MATCHED_ISIN",
          etfName: "Matched ETF",
          asOfDate: "2026-03-23",
          constituents: [
            {
              name: "ONLY HOLDING",
              ticker: "ONLY",
              isin: "US1111111111",
              weightPct: 100,
              sector: "Other",
              country: "United States",
            },
          ],
        },
      ]

      const exposure = buildLookthroughExposure(openPositions, snapshots)
      const onlyHolding = findByIsinOrThrow(exposure, "US1111111111")

      console.log("INFO: Case 4 dilution behavior", {
        matchedPositionInvestedValue: 1000,
        unsupportedPositionInvestedValue: 1000,
        holdingExposureValue: onlyHolding.exposureValue,
        holdingExposurePctOfPortfolio: onlyHolding.exposurePctOfPortfolio,
        note:
          "Current behavior includes unsupported positions in total portfolio denominator, which dilutes exposurePctOfPortfolio.",
      })

      assertClose(onlyHolding.exposureValue, 1000, "ONLY HOLDING exposureValue")
      assertClose(
        onlyHolding.exposurePctOfPortfolio,
        50,
        "ONLY HOLDING exposurePctOfPortfolio should reflect dilution"
      )
    },
  },
]

function main() {
  let passed = 0

  for (const test of tests) {
    try {
      test.run()
      passed += 1
      console.log(`PASS: ${test.name}`)
    } catch (error) {
      console.log(`FAIL: ${test.name}`)
      console.log(error instanceof Error ? error.message : String(error))
    }
  }

  console.log(`\nSummary: ${passed}/${tests.length} passed`)

  if (passed !== tests.length) {
    process.exit(1)
  }
}

main()
