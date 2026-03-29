import { buildSectorExposure } from "./buildSectorExposure"
import { buildCountryExposure } from "./buildCountryExposure"
import { UnderlyingExposure } from "./types"

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

function checkSortedDescending(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) {
      return false
    }
  }
  return true
}

function runCheck(name: string, fn: () => void): boolean {
  try {
    fn()
    console.log(`PASS: ${name}`)
    return true
  } catch (error) {
    console.log(`FAIL: ${name}`)
    console.log(error instanceof Error ? error.message : String(error))
    return false
  }
}

function main() {
  const underlyingExposure: UnderlyingExposure[] = [
    {
      name: "A",
      ticker: "A",
      isin: "US0000000001",
      sector: "Technology",
      country: "United States",
      exposureValue: 300,
      exposurePctOfPortfolio: 30,
    },
    {
      name: "B",
      ticker: "B",
      isin: "US0000000002",
      sector: null,
      country: null,
      exposureValue: 100,
      exposurePctOfPortfolio: 10,
    },
    {
      name: "C",
      ticker: "C",
      isin: "US0000000003",
      sector: "Technology",
      country: "United States",
      exposureValue: 50,
      exposurePctOfPortfolio: 5,
    },
    {
      name: "D",
      ticker: "D",
      isin: "US0000000004",
      sector: "Healthcare",
      country: "Germany",
      exposureValue: 200,
      exposurePctOfPortfolio: 20,
    },
  ]

  const sectorRollup = buildSectorExposure(underlyingExposure)
  const countryRollup = buildCountryExposure(underlyingExposure)

  let passed = 0
  const totalChecks = 10

  if (
    runCheck("Sector grouping works", () => {
      assert(sectorRollup.length === 3, "Expected 3 grouped sectors")
      const keys = sectorRollup.map((row) => row.sector)
      assert(keys.includes("Technology"), "Missing Technology group")
      assert(keys.includes("Healthcare"), "Missing Healthcare group")
      assert(keys.includes("Other"), "Missing Other group")
    })
  ) {
    passed++
  }

  if (
    runCheck("Sector values sum correctly", () => {
      const technology = sectorRollup.find((row) => row.sector === "Technology")
      const healthcare = sectorRollup.find((row) => row.sector === "Healthcare")
      const other = sectorRollup.find((row) => row.sector === "Other")

      if (!technology) throw new Error("Technology row missing")
      if (!healthcare) throw new Error("Healthcare row missing")
      if (!other) throw new Error("Other row missing")

      assertClose(technology.exposureValue, 350, "Technology exposureValue")
      assertClose(healthcare.exposureValue, 200, "Healthcare exposureValue")
      assertClose(other.exposureValue, 100, "Other exposureValue")
    })
  ) {
    passed++
  }

  if (
    runCheck('Null sector maps to "Other"', () => {
      const other = sectorRollup.find((row) => row.sector === "Other")
      assert(other !== undefined, "Other sector group not found")
    })
  ) {
    passed++
  }

  if (
    runCheck("Sector output sorted descending", () => {
      const values = sectorRollup.map((row) => row.exposureValue)
      assert(checkSortedDescending(values), "Sector rollup is not sorted descending")
    })
  ) {
    passed++
  }

  if (
    runCheck("Country grouping works", () => {
      assert(countryRollup.length === 3, "Expected 3 grouped countries")
      const keys = countryRollup.map((row) => row.country)
      assert(keys.includes("United States"), "Missing United States group")
      assert(keys.includes("Germany"), "Missing Germany group")
      assert(keys.includes("Other"), "Missing Other group")
    })
  ) {
    passed++
  }

  if (
    runCheck("Country values sum correctly", () => {
      const unitedStates = countryRollup.find((row) => row.country === "United States")
      const germany = countryRollup.find((row) => row.country === "Germany")
      const other = countryRollup.find((row) => row.country === "Other")

      if (!unitedStates) throw new Error("United States row missing")
      if (!germany) throw new Error("Germany row missing")
      if (!other) throw new Error("Other row missing")

      assertClose(unitedStates.exposureValue, 350, "United States exposureValue")
      assertClose(germany.exposureValue, 200, "Germany exposureValue")
      assertClose(other.exposureValue, 100, "Other exposureValue")
    })
  ) {
    passed++
  }

  if (
    runCheck('Null country maps to "Other"', () => {
      const other = countryRollup.find((row) => row.country === "Other")
      assert(other !== undefined, "Other country group not found")
    })
  ) {
    passed++
  }

  if (
    runCheck("Country output sorted descending", () => {
      const values = countryRollup.map((row) => row.exposureValue)
      assert(checkSortedDescending(values), "Country rollup is not sorted descending")
    })
  ) {
    passed++
  }

  if (
    runCheck("Sector totals match underlying total", () => {
      const sourceTotal = underlyingExposure.reduce((sum, row) => sum + row.exposureValue, 0)
      const rollupTotal = sectorRollup.reduce((sum, row) => sum + row.exposureValue, 0)
      assertClose(rollupTotal, sourceTotal, "Sector total mismatch")
    })
  ) {
    passed++
  }

  if (
    runCheck("Country totals match underlying total", () => {
      const sourceTotal = underlyingExposure.reduce((sum, row) => sum + row.exposureValue, 0)
      const rollupTotal = countryRollup.reduce((sum, row) => sum + row.exposureValue, 0)
      assertClose(rollupTotal, sourceTotal, "Country total mismatch")
    })
  ) {
    passed++
  }

  console.log(`\nSummary: ${passed}/${totalChecks} passed`)

  if (passed !== totalChecks) {
    process.exit(1)
  }
}

main()
