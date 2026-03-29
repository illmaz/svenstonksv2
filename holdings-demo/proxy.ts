import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = ["/sign-in", "/api/auth/login", "/api/auth/logout"]

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  // Allow Next.js internals and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(.+)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  const session = req.cookies.get("intel_session")
  if (!session?.value) {
    return NextResponse.redirect(new URL("/sign-in", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
