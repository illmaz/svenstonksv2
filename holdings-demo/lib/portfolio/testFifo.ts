import { buildPositionsFromTransactions } from "./fifo"
import { TransactionRow } from "./types"

type TestCase = {
  name: string
  run: () => void
}

function tx(
  timestamp: string,
  quantity: number,
  price: number
): TransactionRow {
  return {
    assetKey: "TEST:ASSET",
    ticker: "TEST",
    isin: null,
    productName: "Test Asset",
    exchange: "TESTEX",
    timestamp: new Date(timestamp),
    quantity,
    price,
    source: "DEGIRO",
  }
}

function assertEqual(actual: number, expected: number, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} (expected ${expected}, got ${actual})`)
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

const tests: TestCase[] = [
  {
    name: "Case 1 - simple buy -> sell",
    run: () => {
      const result = buildPositionsFromTransactions([
        tx("2024-01-01T10:00:00.000Z", 10, 100),
        tx("2024-01-02T10:00:00.000Z", -10, 120),
      ])

      assertEqual(result.closedTrades.length, 1, "closed trade count")
      assertEqual(result.closedTrades[0].realizedPnL, 200, "realizedPnL")
      assert(result.openPosition === null, "openPosition should be null")
    },
  },
  {
    name: "Case 2 - partial sell",
    run: () => {
      const result = buildPositionsFromTransactions([
        tx("2024-01-01T10:00:00.000Z", 10, 100),
        tx("2024-01-02T10:00:00.000Z", -5, 120),
      ])

      assertEqual(result.closedTrades.length, 1, "closed trade count")
      assertEqual(result.closedTrades[0].realizedPnL, 100, "realizedPnL")
      assert(result.openPosition !== null, "openPosition should exist")
      assertEqual(result.openPosition?.sharesOpen ?? 0, 5, "remaining shares")
      assertEqual(result.openPosition?.avgCost ?? 0, 100, "remaining avgCost")
    },
  },
  {
    name: "Case 3 - multiple lots FIFO",
    run: () => {
      const result = buildPositionsFromTransactions([
        tx("2024-01-01T10:00:00.000Z", 10, 100),
        tx("2024-01-02T10:00:00.000Z", 10, 200),
        tx("2024-01-03T10:00:00.000Z", -15, 150),
      ])

      // FIFO expectation:
      // First 10 shares: +50 each = +500
      // Next 5 shares:  -50 each = -250
      // Total realizedPnL = +250
      assertEqual(result.closedTrades.length, 1, "closed trade count")
      assertEqual(result.closedTrades[0].realizedPnL, 250, "realizedPnL")
      assert(result.openPosition !== null, "openPosition should exist")
      assertEqual(result.openPosition?.sharesOpen ?? 0, 5, "remaining shares")
      assertEqual(result.openPosition?.avgCost ?? 0, 200, "remaining avgCost")
    },
  },
  {
    name: "Case 4 - full close then reopen",
    run: () => {
      const result = buildPositionsFromTransactions([
        tx("2024-01-01T10:00:00.000Z", 10, 100),
        tx("2024-01-02T10:00:00.000Z", -10, 120),
        tx("2024-01-03T10:00:00.000Z", 5, 130),
      ])

      assertEqual(result.closedTrades.length, 1, "closed trade count")
      assertEqual(result.closedTrades[0].realizedPnL, 200, "closed trade realizedPnL")
      assert(result.openPosition !== null, "new openPosition should exist")
      assertEqual(result.openPosition?.sharesOpen ?? 0, 5, "new position shares")
      assertEqual(result.openPosition?.avgCost ?? 0, 130, "new position avgCost")
      assertEqual(result.openPosition?.investedValue ?? 0, 650, "new position investedValue")
    },
  },
  {
    name: "Case 5 - sell across multiple lots with exact depletion",
    run: () => {
      const result = buildPositionsFromTransactions([
        tx("2024-01-01T10:00:00.000Z", 5, 100),
        tx("2024-01-02T10:00:00.000Z", 5, 110),
        tx("2024-01-03T10:00:00.000Z", -10, 120),
      ])

      assertEqual(result.closedTrades.length, 1, "closed trade count")
      assertEqual(result.closedTrades[0].sharesClosed, 10, "sharesClosed")
      assert(result.openPosition === null, "openPosition should be null")
    },
  },
  {
    name: "Case 6 - full close then partial reopen",
    run: () => {
      const result = buildPositionsFromTransactions([
        tx("2024-01-01T10:00:00.000Z", 10, 100),
        tx("2024-01-02T10:00:00.000Z", -10, 120),
        tx("2024-01-03T10:00:00.000Z", 10, 130),
        tx("2024-01-04T10:00:00.000Z", -4, 140),
      ])

      assertEqual(result.closedTrades.length, 2, "closed trade count")
      assertEqual(result.closedTrades[0].realizedPnL, 200, "first trade realizedPnL")
      assertEqual(result.closedTrades[0].sharesClosed, 10, "first trade sharesClosed")
      assertEqual(result.closedTrades[1].realizedPnL, 40, "reopened trade realizedPnL")
      assertEqual(result.closedTrades[1].sharesClosed, 4, "reopened trade sharesClosed")
      assert(result.openPosition !== null, "openPosition should exist")
      assertEqual(result.openPosition?.sharesOpen ?? 0, 6, "remaining shares")
      assertEqual(result.openPosition?.avgCost ?? 0, 130, "remaining avgCost")
    },
  },
  {
    name: "Case 7 - fractional shares",
    run: () => {
      const result = buildPositionsFromTransactions([
        tx("2024-01-01T10:00:00.000Z", 1.5, 100),
        tx("2024-01-02T10:00:00.000Z", -0.5, 120),
      ])

      assertEqual(result.closedTrades.length, 1, "closed trade count")
      assertEqual(result.closedTrades[0].realizedPnL, 10, "realizedPnL")
      assert(result.openPosition !== null, "openPosition should exist")
      assertEqual(result.openPosition?.sharesOpen ?? 0, 1, "remaining shares")
    },
  },
  {
    name: "Case 8 - invalid oversell behavior",
    run: () => {
      const result = buildPositionsFromTransactions([
        tx("2024-01-01T10:00:00.000Z", 5, 100),
        tx("2024-01-02T10:00:00.000Z", -10, 120),
      ])

      const attemptedToSell = 10
      const sold = result.closedTrades.reduce((sum, trade) => sum + trade.sharesClosed, 0)
      let behavior = "unknown"

      if (sold === 0) {
        behavior = "rejected"
      } else if (sold < attemptedToSell) {
        behavior = "partially filled; excess ignored"
      } else if (sold === attemptedToSell) {
        behavior = "fully executed"
      } else {
        behavior = "broken output (sold more than requested)"
      }

      console.log("INFO: Case 8 oversell behavior", {
        attemptedToSell,
        sold,
        closedTradeCount: result.closedTrades.length,
        openPosition: result.openPosition,
        behavior,
      })
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
