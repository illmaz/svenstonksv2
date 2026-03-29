import { buildLookthroughExposure } from "./buildLookthroughExposure"
import { EtfHoldingsSnapshot } from "./types"

type MergeCase = {
  label: string
  leftName: string
  rightName: string
  expectMerged: boolean
}

function runCase(testCase: MergeCase) {
  const openPositions = [
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
      investedValue: 1000,
    },
  ]

  const snapshots: EtfHoldingsSnapshot[] = [
    {
      etfTicker: "ETF_A",
      etfIsin: "ETF_A_ISIN",
      etfName: "ETF A",
      asOfDate: null,
      constituents: [
        {
          name: testCase.leftName,
          ticker: null,
          isin: null,
          weightPct: 10,
          sector: "Technology",
          country: "United States",
        },
      ],
    },
    {
      etfTicker: "ETF_B",
      etfIsin: "ETF_B_ISIN",
      etfName: "ETF B",
      asOfDate: null,
      constituents: [
        {
          name: testCase.rightName,
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
  const merged = exposure.length === 1
  const status = merged ? "MERGED" : "SEPARATE"
  const expected = testCase.expectMerged ? "MERGED" : "SEPARATE"

  console.log(`${testCase.label}: ${status} (expected ${expected})`)
  console.log(`  names: "${testCase.leftName}" vs "${testCase.rightName}"`)
}

function main() {
  const cases: MergeCase[] = [
    {
      label: "Case 1 - NVIDIA USD suffix",
      leftName: "NVIDIA CORP",
      rightName: "NVIDIA CORP USD0.001",
      expectMerged: true,
    },
    {
      label: "Case 2 - ALPHABET class format",
      leftName: "ALPHABET INC CLASS A",
      rightName: "ALPHABET INC-CL A",
      expectMerged: true,
    },
    {
      label: "Case 3 - BROADCOM NPV suffix",
      leftName: "BROADCOM INC",
      rightName: "BROADCOM INC NPV",
      expectMerged: true,
    },
    {
      label: "Case 4 - negative (should not merge)",
      leftName: "APPLE INC",
      rightName: "MICROSOFT CORP",
      expectMerged: false,
    },
  ]

  for (const testCase of cases) {
    runCase(testCase)
  }
}

main()
