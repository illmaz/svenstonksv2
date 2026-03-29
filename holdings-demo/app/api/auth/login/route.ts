import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/lib/auth/hash"
import { createSession } from "@/lib/auth/session"

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { username } })

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }

  await createSession(user.id)
  return NextResponse.json({ ok: true })
}
