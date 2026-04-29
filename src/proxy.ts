import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME, clearAuthSessionCookie, verifySessionToken } from '@/lib/auth/session'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPublicAsset = /\.(?:ico|png|jpg|jpeg|svg|webp|avif|gif)$/i.test(path)

  if (
    path.startsWith('/login') ||
    path.startsWith('/api/login') ||
    path.startsWith('/api/logout') ||
    path.startsWith('/api/health') ||
    path.startsWith('/_next') ||
    isPublicAsset
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    if (path.startsWith('/api/')) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )

      clearAuthSessionCookie(response)
      return response
    }

    const loginUrl = new URL('/login', request.url)
    const nextPath = `${path}${request.nextUrl.search}`

    if (nextPath !== '/login') {
      loginUrl.searchParams.set('next', nextPath)
    }

    const response = NextResponse.redirect(loginUrl)
    clearAuthSessionCookie(response)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
