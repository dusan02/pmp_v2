import { NextRequest, NextResponse } from 'next/server';
import { validateRequest, getClientIP, detectSuspiciousActivity, logSecurityEvent, securityHeaders } from './security';

// Rate limiting store (in-memory for now, should use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const key = `${ip}:${windowMs}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

export function middleware(request: NextRequest) {
  const ip = getClientIP(request);
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Apply security headers
  const response = NextResponse.next();
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value);
    }
  });

  // CORS headers
  response.headers.set('Access-Control-Allow-Origin', 
    process.env.NODE_ENV === 'production' 
      ? 'https://premarketprice.com' 
      : 'http://localhost:3002'
  );
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return response;
  }

  // Detect suspicious activity
  if (detectSuspiciousActivity(request)) {
    logSecurityEvent({
      type: 'suspicious_activity',
      ip,
      endpoint: request.url,
      userAgent: request.headers.get('User-Agent') || undefined,
    });
    
    // Return 403 for suspicious requests
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Rate limiting for different endpoints
  let rateLimitPassed = true;
  
  if (pathname.startsWith('/api/background/')) {
    // Background service endpoints: 10 requests per minute
    rateLimitPassed = checkRateLimit(ip, 10, 60 * 1000);
  } else if (pathname.startsWith('/api/')) {
    // General API endpoints: 100 requests per 15 minutes
    rateLimitPassed = checkRateLimit(ip, 100, 15 * 60 * 1000);
  } else if (pathname === '/') {
    // Main page: 200 requests per 15 minutes
    rateLimitPassed = checkRateLimit(ip, 200, 15 * 60 * 1000);
  }

  if (!rateLimitPassed) {
    logSecurityEvent({
      type: 'rate_limit_exceeded',
      ip,
      endpoint: request.url,
      userAgent: request.headers.get('User-Agent') || undefined,
    });
    
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'Retry-After': '900', // 15 minutes
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }
    });
  }

  // API key validation for protected endpoints
  if (pathname.startsWith('/api/background/') || pathname.startsWith('/api/admin/')) {
    const validation = validateRequest(request);
    
    if (!validation.isValid) {
      logSecurityEvent({
        type: 'invalid_api_key',
        ip,
        endpoint: request.url,
        userAgent: request.headers.get('User-Agent') || undefined,
      });
      
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  // Add rate limit headers to response
  const key = `${ip}:${15 * 60 * 1000}`;
  const record = rateLimitStore.get(key);
  
  if (record) {
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', Math.max(0, 100 - record.count).toString());
    response.headers.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 