import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth/currentUser"

export async function DELETE() {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    await prisma.holding.deleteMany({ where: { userId: user.id } })

    return Response.json({ success: true })
  } catch (error) {
    console.error("Clear holdings error:", error)

    return Response.json(
      { error: "Failed to clear holdings" },
      { status: 500 }
    )
  }
}