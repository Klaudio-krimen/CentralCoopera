import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Rutas API sin token → 401 JSON (no redirect)
    if (pathname.startsWith('/api/')) {
      if (!token) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
      return NextResponse.next()
    }

    if (pathname.startsWith('/chofer') && token?.role !== 'CHOFER' && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    if (pathname.startsWith('/recepcion') && token?.role !== 'RECEPCION' && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/chofer/:path*',
    '/recepcion/:path*',
    '/admin/:path*',
    '/api/((?!auth).*)',
  ],
}
