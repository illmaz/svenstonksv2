import { prisma } from '@/lib/prisma'
import { getCurrentUser } from "@/lib/auth/currentUser"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params

    await prisma.holding.delete({
      where: { id, userId: user.id },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error("Delete holding error:", error)
    return Response.json(
      { error: "Failed to delete holding" },
      { status: 500 }
    )
  }
}