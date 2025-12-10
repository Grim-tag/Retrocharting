import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { reverseRouteMap } from "@/lib/route-config";

// Supported locales
const locales = ["en", "fr"];
const defaultLocale = "en";

export function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // 1. Skip paths that should not be localized
    if (
        pathname.startsWith("/api") || // API routes
        pathname.startsWith("/_next") || // Next.js internals
        pathname.includes(".") || // Static files (images, favicon, etc.)
        pathname.startsWith("/admin") // Admin panel
    ) {
        return NextResponse.next();
    }

    // 2. Handle /en/ Redirects (Canonical: /en/x -> /x)
    // If the path starts with /en, we redirect to the root version to avoid duplicates.
    // CRITICAL: We must skip this if it's an internal rewrite (marked by param).
    const isInternalRewrite = request.nextUrl.searchParams.has('__next_rewrite');

    if ((pathname.startsWith('/en/') || pathname === '/en') && !isInternalRewrite) {
        const newPath = pathname.replace(/^\/en/, '');
        const url = new URL(newPath || '/', request.url);
        request.nextUrl.searchParams.forEach((value, key) => {
            url.searchParams.set(key, value);
        });
        return NextResponse.redirect(url, 301);
    }

    // 3. Determine properties
    const pathnameIsMissingLocale = locales.every(
        (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    );

    // 4. Handle Default Locale (Root) -> Rewrite to /en internal
    // If no locale in URL, we assume it's the intended default (English).
    // We REWRITE to /en/... so Next.js generic [lang] folder picks it up, but URL remains /.
    if (pathnameIsMissingLocale) {
        // Rewrite to internal /en path.
        // We append a sentinel param so the next pass knows it's a rewrite.
        const url = new URL(`/en${pathname}`, request.url);
        request.nextUrl.searchParams.forEach((value, key) => {
            url.searchParams.set(key, value);
        });
        url.searchParams.set('__next_rewrite', '1');
        const response = NextResponse.rewrite(url);
        // We need to return here for the rewrite logic to work correctly with Next.js params
        // But we should attach headers too? 
        // For simplicity and safety with Next.js internals, we let this one go as is usually,
        // BUT the audit wants global headers.
        addSecurityHeaders(response);
        return response;
    }

    // 5. Handle Other Locales (e.g. /fr)
    // Extract locale and path
    const match = pathname.match(/^\/([a-z]{2})(.*)/);
    const locale = match ? match[1] : defaultLocale;
    const pathBody = match ? match[2] : pathname;

    let response = NextResponse.next();

    // Handle Localized Path Rewrites (e.g. /fr/jeux-video -> /fr/video-games)
    if (reverseRouteMap[locale]) {
        const segments = pathBody.split('/').filter(Boolean);
        const internalSegments = segments.map(segment => reverseRouteMap[locale][segment] || segment);
        const internalPath = `/${locale}/${internalSegments.join('/')}`;

        if (internalPath !== pathname) {
            const url = new URL(internalPath, request.url);
            // Preserve search params
            request.nextUrl.searchParams.forEach((value, key) => {
                url.searchParams.set(key, value);
            });
            response = NextResponse.rewrite(url);
        }
    }

    // --- SECURITY HEADERS ---
    addSecurityHeaders(response);

    return response;
}

function addSecurityHeaders(response: NextResponse) {
    // 1. HSTS
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // 2. Anti-Clickjacking
    response.headers.set('X-Frame-Options', 'DENY');
    // 3. MIME Sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');
    // 4. Referrer Policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    // 5. Permissions Policy
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // 6. Content Security Policy
    const csp = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://accounts.google.com https://apis.google.com;
        style-src 'self' 'unsafe-inline' https://accounts.google.com;
        img-src * blob: data:;
        font-src 'self';
        connect-src 'self' https://retrocharting-frontend.onrender.com https://retrocharting.com https://accounts.google.com https://oauth2.googleapis.com;
        frame-src https://accounts.google.com;
        frame-ancestors 'none';
        upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    response.headers.set('Content-Security-Policy', csp);
}

export const config = {
    matcher: [
        // Skip all internal paths (_next)
        "/((?!_next).*)",
    ],
};
