import { getEtfProvider } from "./providers/registry"

type TestPosition = {
  productName: string
  ticker: string | null
  isin: string | null
}

const positions: TestPosition[] = [
  {
    productName: "Invesco EQQQ NASDAQ-100 UCITS ETF Dist",
    ticker: "EQQQ",
    isin: "IE0032077012",
  },
  {
    productName: "iShares AEX UCITS ETF EUR (Dist)",
    ticker: "IAEX",
    isin: null,
  },
  {
    productName: "iShares Core MSCI Europe UCITS ETF EUR (Acc)",
    ticker: "IMEU",
    isin: null,
  },
  {
    productName: "iShares Core MSCI World UCITS ETF USD (Acc)",
    ticker: "IWDA",
    isin: "IE00B4L5Y983",
  },
  {
    productName: "iShares Euro Dividend UCITS ETF EUR Dist",
    ticker: "IDVY",
    isin: null,
  },
  {
    productName: "SPDR S&P US Dividend Aristocrats ETF",
    ticker: "USDV",
    isin: null,
  },
  {
    productName: "Vanguard S&P 500 UCITS ETF USD",
    ticker: "VUSA",
    isin: null,
  },
  {
    productName: "WisdomTree Europe Defence",
    ticker: null,
    isin: null,
  },
  {
    productName: "VanEck Semiconductor ETF / VVSM",
    ticker: "VVSM",
    isin: null,
  },
]

const supportedProviders = new Set(["ishares", "vanguard", "invesco", "vaneck"])

let supportedByExistingProviderFamily = 0
let newProviderLikelyNeeded = 0
let unknown = 0

for (const position of positions) {
  const provider = getEtfProvider({
    ticker: position.ticker,
    isin: position.isin,
  })

  console.log("productName:", position.productName)
  console.log("ticker:", position.ticker)
  console.log("isin:", position.isin)
  console.log("detected provider:", provider)

  if (provider && supportedProviders.has(provider)) {
    supportedByExistingProviderFamily += 1
  } else if (position.ticker || position.isin) {
    newProviderLikelyNeeded += 1
  } else {
    unknown += 1
  }
}

console.log("supported by existing provider family:", supportedByExistingProviderFamily)
console.log("new provider likely needed:", newProviderLikelyNeeded)
console.log("unknown:", unknown)
