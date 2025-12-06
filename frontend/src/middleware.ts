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
    if (pathname.startsWith('/en/') || pathname === '/en') {
        const newPath = pathname.replace(/^\/en/, '');
        const url = new URL(newPath || '/', request.url);
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
        // Rewrite to internal /en path
        return NextResponse.rewrite(new URL(`/en${pathname}`, request.url));
    }

    // 5. Handle Other Locales (e.g. /fr)
    // Extract locale and path
    const match = pathname.match(/^\/([a-z]{2})(.*)/);
    const locale = match ? match[1] : defaultLocale;
    const pathBody = match ? match[2] : pathname;

    // Handle Localized Path Rewrites (e.g. /fr/jeux-video -> /fr/video-games)
    // We ONLY need this for non-default locales (like fr), because default runs in step 4.
    if (reverseRouteMap[locale]) {
        const segments = pathBody.split('/').filter(Boolean);
        const internalSegments = segments.map(segment => reverseRouteMap[locale][segment] || segment);
        const internalPath = `/${locale}/${internalSegments.join('/')}`;

        if (internalPath !== pathname) {
            return NextResponse.rewrite(new URL(internalPath, request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Skip all internal paths (_next)
        "/((?!_next).*)",
    ],
};
