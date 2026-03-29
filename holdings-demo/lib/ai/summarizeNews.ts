
import { OpenAIApi, Configuration } from "openai"

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

// Simple in-memory cache: Map<cacheKey, summary>
const summaryCache = new Map<string, string>()

  title: string
  body: string
  tickers: string[]
  relevance: number
  isDirectMatch: boolean
  exposurePct?: number
  id?: string // optional news id for caching
}): Promise<{ summary: string }> {
  let context = ""
  if (item.isDirectMatch) {
    context = "This is a direct holding in the portfolio."
  } else if (typeof item.exposurePct === "number") {
    context = `This company is part of ETFs in the portfolio with ${item.exposurePct}% exposure.`
  }
  const prompt = `Explain why this news matters to this portfolio:\n- Direct holding: ${item.isDirectMatch}\n- Exposure: ${item.exposurePct ?? 0}%\n\nTitle: ${item.title}\nBody: ${item.body}\n${context}\n\nKeep it short (1–2 sentences).`

  // Use id + direct/underlying context as cache key if available
  const cacheKey = item.id
    ? `${item.id}|${item.isDirectMatch}|${item.exposurePct ?? 0}`
    : `${item.title}|${item.body}|${item.isDirectMatch}|${item.exposurePct ?? 0}`

  if (summaryCache.has(cacheKey)) {
    return { summary: summaryCache.get(cacheKey)! }
  }

  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a financial news summarizer." },
      { role: "user", content: prompt },
    ],
    max_tokens: 120,
    temperature: 0.7,
  })

  const summary = response.data.choices[0]?.message?.content?.trim() || ""
  summaryCache.set(cacheKey, summary)
  return { summary }
}
