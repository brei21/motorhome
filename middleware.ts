import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Config: Rutas públicas que no requieren PIN
  const publicPaths = ['/login', '/api/login', '/favicon.ico']
  
  // Si la ruta es pública, dejar pasar
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Verificar la cookie del PIN maestro
  const authCookie = request.cookies.get('motorhome_auth')
  
  if (!authCookie || authCookie.value !== 'authenticated') {
    // Si no está autenticado, redirigir al Login
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Si está autenticado, pasa
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
