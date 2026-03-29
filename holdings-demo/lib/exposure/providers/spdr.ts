import * as XLSX from "xlsx"
import { EtfHoldingsSnapshot } from "../types"

type SpdrLookupInput = {
  ticker?: string | null
  isin?: string | null
}

type SpdrFundReference = {
  productUrl: string
  productId: string | null
}

const FETCH_TIMEOUT_MS = 10_000

function normalize(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

const SPDR_FUND_REFERENCE_MAP: Record<string, SpdrFundReference> = {
  "TICKER:USDV": {
    productUrl:
      "https://www.ssga.com/uk/en_gb/intermediary/etfs/spdr-sp-us-dividend-aristocrats-ucits-etf-dist-spyd-gy",
    productId: null,
  },
}

export function getSpdrFundReference(
  input: SpdrLookupInput
): SpdrFundReference | null {
  const isin = normalize(input.isin)
  if (isin) {
    const byIsin = SPDR_FUND_REFERENCE_MAP[`ISIN:${isin}`]
    if (byIsin) return byIsin
  }

  const ticker = normalize(input.ticker)
  if (ticker) {
    const byTicker = SPDR_FUND_REFERENCE_MAP[`TICKER:${ticker}`]
    if (byTicker) return byTicker
  }

  return null
}

export async function getSpdrHoldingsSnapshot(
  input: SpdrLookupInput
): Promise<EtfHoldingsSnapshot | null> {
  const fundReference = getSpdrFundReference(input)
  if (!fundReference) return null

  const xlsxUrl =
    "https://www.ssga.com/library-content/products/fund-data/etfs/emea/holdings-daily-emea-en-spyd-gy.xlsx"

  let response: Response
  try {
    response = await fetch(xlsxUrl, {
      headers: {
        "user-agent": "Mozilla/5.0",
        accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch {
    return null
  }

  if (!response.ok) return null

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return null

  const worksheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 })

  const HEADER_ROW_INDEX = 5
  const headerRow = rows[HEADER_ROW_INDEX] as string[] | undefined
  if (!headerRow) return null

  const isinCol = headerRow.indexOf("ISIN")
  const nameCol = headerRow.indexOf("Security Name")
  const weightCol = headerRow.indexOf("Percent of Fund")
  const countryCol = headerRow.indexOf("Trade Country Name")
  const sectorCol = headerRow.indexOf("Sector Classification")

  const constituents = rows
    .slice(HEADER_ROW_INDEX + 1)
    .flatMap((row) => {
      const r = row as unknown[]
      const isin = typeof r[isinCol] === "string" ? r[isinCol].trim() : null
      if (!isin) return []

      const name = typeof r[nameCol] === "string" ? r[nameCol].trim() : null
      if (!name) return []

      const rawWeight = r[weightCol]
      const weightPct =
        typeof rawWeight === "number"
          ? rawWeight
          : typeof rawWeight === "string"
          ? parseFloat(rawWeight)
          : 0

      const sector =
        typeof r[sectorCol] === "string" ? r[sectorCol].trim() : null
      const country =
        typeof r[countryCol] === "string" ? r[countryCol].trim() : null

      return [{ name, ticker: null, isin, weightPct, sector, country }]
    })

  return {
    etfTicker: normalize(input.ticker),
    etfIsin: normalize(input.isin),
    etfName: null,
    asOfDate: null,
    source: xlsxUrl,
    constituents,
  }
}
