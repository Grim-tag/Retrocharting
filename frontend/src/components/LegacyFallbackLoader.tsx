'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function LegacyFallbackLoader() {
    const pathname = usePathname();
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'checking' | 'found' | 'not-found'>('idle');

    useEffect(() => {
        // Only run checks if URL looks like a product (Clean URL format)
        // Format: /lang/section/slug-suffix
        // Suffixes: -prices-value (EN), -prix-cotes (FR)
        const isProductUrl = pathname.includes('-prices-value') || pathname.includes('-prix-cotes');

        if (!isProductUrl) return;

        setStatus('checking');

        const checkBackend = async () => {
            try {
                // Extract slug (last segment)
                // e.g. /en/accessories/asciiware-fight-pad-snes-prices-value -> asciiware-fight-pad-snes-prices-value
                const segments = pathname.split('/');
                const rawSlug = segments[segments.length - 1];

                // Identify Lang
                const lang = pathname.startsWith('/fr') ? 'fr' : 'en';

                // Call Backend Fuzzy Lookup directly (Public API)
                // This mimics what 'getGameBySlug' does on server
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://retro-collector-api.onrender.com';
                const response = await fetch(`${apiUrl}/api/v1/games/${rawSlug}`);

                if (response.ok) {
                    const game = await response.json();
                    if (game && game.slug) {
                        setStatus('found');
                        // REDIRECT to the Client-Side Renderer Route
                        // We use a query param 'fallback=true' to signal CSR mode if we reused the page?
                        // But we can't reuse the page because it's 404.

                        // Strategy: Redirect to `/context/view?slug=...`
                        // A new page: `app/[lang]/view/page.tsx` which is 'use client' and fetches data. 
                        router.replace(`/${lang}/view?slug=${game.slug}&type=legacy-rescue`);
                        return;
                    }
                }
            } catch (err) {
                console.error("Rescue check failed", err);
            }
            setStatus('not-found');
        };

        const timer = setTimeout(checkBackend, 500); // Small delay to allow hydration
        return () => clearTimeout(timer);

    }, [pathname, router]);

    if (status === 'checking') {
        return (
            <div className="fixed inset-0 bg-[#0f121e] z-50 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff6600] mb-4"></div>
                <p className="text-gray-300">Searching database...</p>
            </div>
        );
    }

    if (status === 'found') {
        return (
            <div className="fixed inset-0 bg-[#0f121e] z-50 flex flex-col items-center justify-center">
                <div className="text-green-500 mb-2">✓ Found!</div>
                <p className="text-gray-300">Redirecting to product...</p>
            </div>
        );
    }

    return null; // Render default 404
}
