import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
        pathname.startsWith("/admin") // Admin panel (for now, maybe localize later)
    ) {
        return NextResponse.next();
    }

    // 2. Check if the pathname already has a locale
    const pathnameHasLocale = locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    if (pathnameHasLocale) return NextResponse.next();

    // 3. Redirect to default locale if missing
    // Future improvement: Detect browser language preference
    const locale = defaultLocale;

    const newUrl = new URL(`/${locale}${pathname}`, request.url);
    return NextResponse.redirect(newUrl);
}

export const config = {
    matcher: [
        // Skip all internal paths (_next)
        "/((?!_next).*)",
    ],
};
