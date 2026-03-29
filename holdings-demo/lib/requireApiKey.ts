export function requireApiKey(request: Request): Response | null {
  const expectedApiKey = process.env.API_KEY

  if (!expectedApiKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = request.headers.get("x-api-key")

  if (!apiKey || apiKey !== expectedApiKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  return null
}
