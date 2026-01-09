'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

// Types for Product Fetch (Reused)
interface MockProduct {
    id: number;
    product_name: string;
    console_name: string;
    genre: string;
    description?: string;
    [key: string]: any;
}

export default function LegacyProductFallback() {
    const pathname = usePathname();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [foundProduct, setFoundProduct] = useState<MockProduct | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        // Only run for potential product URLs (contain -prices-value or -prix-cotes)
        const isProductUrl = pathname.includes('-prices-value') || pathname.includes('-prix-cotes');

        if (!isProductUrl) {
            setLoading(false);
            return;
        }

        const attemptFetch = async () => {
            try {
                // Extract Slug or ID logic
                // The frontend 'getProductBySlug' relies on ID if unified lookup fails.
                // Here we fetch directly from backend API for "Clean Slug" lookup?
                // The backend endpoint `GET /api/v1/games/{slug}` handles fuzzy lookup!

                // Extract slug from path
                const segments = pathname.split('/');
                const slug = segments[segments.length - 1];

                // 1. Try "Quick Game Lookup" from Backend
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/games/${slug}`);

                if (response.ok) {
                    const gameData = await response.json();

                    // IF we found it, we should probably redirect to the CLEAN Unified URL if different?
                    // OR just render it here?
                    // Rendering here is faster/smoother.

                    // We need to map it to "Product" structure for the View?
                    // Actually, if we found a GAME, we can redirect to the proper Game Page?
                    // BUT we are ON the proper URL (theoretically), just not generated SSG.
                    // So we should navigate (client-side) to the same URL? No that loops.

                    // If it's a 404, it means Next.js didn't have the HTML.
                    // If we redirect to the SAME url, it might try to fetch HTML again and 404?
                    // NO! Next.js Client Router handles dynamic states.
                    // BUT 'output: export' means NO ISR. 

                    // So we MUST render the content HERE inside the 404 page shell.
                    // Or we redirect to a dynamic route? No, we don't have Node server.

                    // SOLUTION: Set 'foundProduct' state and render a minimal Product View or Redirect to a special CSR route?
                    // Simplest: Redirect to `/product-csr/[slug]` (Client-only Route)
                    // Let's do that. It cleanly separates logic.
                    // Actually, let's just render a link "Click to load product" or auto-redirect??

                    // Let's try to fetch the minimal checks.
                    if (gameData) {
                        // It exists!
                        // Redirect to a dedicated client-side loader page to avoid 404 UI flickers
                        // We can create `src/app/[lang]/csr/[slug]/page.tsx` which is pure client side.
                        const lang = pathname.startsWith('/fr') ? 'fr' : 'en';
                        window.location.href = `/${lang}/games/${gameData.slug}`; // Force reload to see if it catches? No, that's SSG.

                        // We need a designated Client-Side rendering route.
                        // Let's assume we implement that next.
                    }
                }
            } catch (e) {
                console.error("CSR Fallback check failed", e);
            }
            setLoading(false);
        };

        attemptFetch();

    }, [pathname]);

    if (loading) return <div className="text-white text-center py-10">Checking availability...</div>;

    // If we reach here, it's a real 404.
    return null; // Parent 404 renders its UI
}
