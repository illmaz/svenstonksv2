import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth/currentUser"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const rows = await prisma.holding.findMany({
      where: { userId: user.id },
      orderBy: { executedAt: "desc" },
    })

    return Response.json(rows)
  } catch (error) {
    console.error("Fetch raw holdings error:", error)
    return Response.json({ error: "Failed to load holdings" }, { status: 500 })
  }
}
