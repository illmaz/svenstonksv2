import { buildPortfolioFromTransactions } from "./buildPortfolio"
import { TransactionRow } from "./types"

console.log("TEST 1 — PARTIAL SELL")

const transactions: TransactionRow[] = [
  {
    assetKey: "ticker:TEST",
    ticker: "TEST",
    isin: null,
    productName: "Test Asset",
    exchange: "XNAS",
    timestamp: new Date("2023-01-01T10:00:00Z"),
    quantity: 10,
    price: 100,
    source: "DEGIRO",
  },
  {
    assetKey: "ticker:TEST",
    ticker: "TEST",
    isin: null,
    productName: "Test Asset",
    exchange: "XNAS",
    timestamp: new Date("2023-02-01T10:00:00Z"),
    quantity: 10,
    price: 120,
    source: "DEGIRO",
  },
  {
    assetKey: "ticker:TEST",
    ticker: "TEST",
    isin: null,
    productName: "Test Asset",
    exchange: "XNAS",
    timestamp: new Date("2023-03-01T10:00:00Z"),
    quantity: -15,
    price: 130,
    source: "DEGIRO",
  },
]

const result1 = buildPortfolioFromTransactions(transactions)

console.log("RESULT 1:")
console.dir(result1, { depth: null })

// --------------------------------------------

console.log("\nTEST 2 — FULLY CLOSED (this fixes your FCELL issue)")

const fullyClosedTransactions: TransactionRow[] = [
  {
    assetKey: "ticker:FCELL",
    ticker: "FCELL",
    isin: null,
    productName: "FuelCell Energy",
    exchange: "XNAS",
    timestamp: new Date("2023-01-01T10:00:00Z"),
    quantity: 100,
    price: 10,
    source: "DEGIRO",
  },
  {
    assetKey: "ticker:FCELL",
    ticker: "FCELL",
    isin: null,
    productName: "FuelCell Energy",
    exchange: "XNAS",
    timestamp: new Date("2023-02-01T10:00:00Z"),
    quantity: -100,
    price: 8,
    source: "DEGIRO",
  },
]

const result2 = buildPortfolioFromTransactions(fullyClosedTransactions)

console.log("RESULT 2:")
console.dir(result2, { depth: null })