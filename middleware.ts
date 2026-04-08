// Middleware desactivado temporalmente — login simulado activo
// Reactivar cuando se conecte Supabase Auth real
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}