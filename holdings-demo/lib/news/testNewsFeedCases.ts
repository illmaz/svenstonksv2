// Case 4 — Multi-ticker duplicate article
const openPositions4 = [{ ticker: "NVDA" }]
const underlyingExposure4 = [
  { ticker: "NVDA", exposurePctOfPortfolio: 2 },
  { ticker: "MSFT", exposurePctOfPortfolio: 3 }
]
const feed4 = getRelevantNews(openPositions4, underlyingExposure4)
const ids4 = feed4.map(item => item.id)
const hasDuplicates4 = new Set(ids4).size !== ids4.length
logResult(
  "Case 4 — Multi-ticker duplicate article",
  !hasDuplicates4,
  hasDuplicates4 ? `duplicate ids found: ${ids4}` : undefined
)
import { getRelevantNews } from "@/lib/news/getRelevantNews"

function logResult(caseName: string, pass: boolean, details?: string) {
  if (pass) {
    console.log(`PASS: ${caseName}`)
  } else {
    console.error(`FAIL: ${caseName}${details ? ' — ' + details : ''}`)
  }
}

// Case 1 — direct holding + ETF overlap
const openPositions1 = [{ ticker: "NVDA" }]
const underlyingExposure1 = [{ ticker: "NVDA", exposurePctOfPortfolio: 10 }]
const feed1 = getRelevantNews(openPositions1, underlyingExposure1)
const nvdaNews1 = feed1.find(item => item.tickers.includes("NVDA"))
logResult(
  "Case 1 — direct holding + ETF overlap",
  !!nvdaNews1 && nvdaNews1.relevance === 2 && feed1[0].tickers.includes("NVDA"),
  !nvdaNews1 ? "NVDA news missing" : nvdaNews1.relevance !== 2 ? `relevance=${nvdaNews1.relevance}` : !feed1[0].tickers.includes("NVDA") ? "NVDA not ranked at top" : undefined
)

// Case 2 — no matches
const openPositions2 = [{ ticker: "ZZZZ" }]
const underlyingExposure2 = [{ ticker: "YYYY", exposurePctOfPortfolio: 5 }]
const feed2 = getRelevantNews(openPositions2, underlyingExposure2)
logResult(
  "Case 2 — no matches",
  Array.isArray(feed2) && feed2.length === 0,
  feed2.length > 0 ? `feed not empty: ${JSON.stringify(feed2)}` : undefined
)

// Case 3 — ETF-only match
const openPositions3 = [{ ticker: "AAPL" }]
const underlyingExposure3 = [{ ticker: "NVDA", exposurePctOfPortfolio: 10 }]
const feed3 = getRelevantNews(openPositions3, underlyingExposure3)
const nvdaNews3 = feed3.find(item => item.tickers.includes("NVDA"))
logResult(
  "Case 3 — ETF-only match",
  !!nvdaNews3 && nvdaNews3.relevance === 1,
  !nvdaNews3 ? "NVDA news missing" : nvdaNews3.relevance !== 1 ? `relevance=${nvdaNews3.relevance}` : undefined
)
