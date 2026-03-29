import * as XLSX from "xlsx"

async function main() {
  const response = await fetch(
    "https://www.ssga.com/library-content/products/fund-data/etfs/emea/holdings-daily-emea-en-spyd-gy.xlsx"
  )

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined
  const firstRows = worksheet
    ? XLSX.utils.sheet_to_json(worksheet, { header: 1 }).slice(0, 10)
    : []

  console.log("status:", response.status)
  console.log("content-type:", response.headers.get("content-type"))
  console.log("byte length:", buffer.byteLength)
  console.log("sheet names:", workbook.SheetNames)
  console.log("first sheet name:", firstSheetName)
  console.log("first 10 rows of first sheet:", firstRows)
}

main().catch((error) => {
  console.error("SPDR HOLDINGS FILE TEST ERROR:", error)
  process.exit(1)
})
