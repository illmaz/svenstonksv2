import { prisma } from "@/lib/prisma"
import { getSessionUserId } from "@/lib/auth/session"

export async function getCurrentUser() {
  const userId = await getSessionUserId()
  if (!userId) return null
  return prisma.user.findUnique({ where: { id: userId } })
}
