async function main() {
  const response = await fetch("http://localhost:3000/api/exposure/lookthrough")

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  const data: any = await response.json()
  const failedProviders = Array.isArray(data?.failedProviders)
    ? data.failedProviders
    : undefined

  console.log(`failedProviders exists: ${Array.isArray(failedProviders)}`)
  console.log(`failedProviders length: ${failedProviders?.length ?? 0}`)
  console.log(failedProviders ?? [])
}

main().catch((error) => {
  console.error("FAILED PROVIDERS TEST ERROR:", error)
  process.exit(1)
})
