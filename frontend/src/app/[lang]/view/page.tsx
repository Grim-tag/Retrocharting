'use client';

// Dynamic Client-Side Product Viewer
// Used by the Fallback Rescue system to display products that weren't statically generated.

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import GameDetailView from '@/components/GameDetailView';
import { getDictionary } from '@/lib/get-dictionary'; // Using client-side adapted version? 
// getDictionary is server-side usually. We need to fetch dictionary or pass it?
// Actually for Client Components, we should fetch dictionary via API or context.
// BUT for speed, since we are in 'view' mode, maybe we mock it or fetch it?

// To make this work smoothly, we'll fetch the product data AND use a default dict structure
// or fetch the dict JSON if available.
// For now, let's use a minimal dictionary fallback.

export default function ViewPage({ params }: { params: { lang: string } }) {
    return (
        <Suspense fallback={<div className="text-white text-center py-20">Loading...</div>}>
            <Viewer lang={params.lang} />
        </Suspense>
    );
}

function Viewer({ lang }: { lang: string }) {
    const searchParams = useSearchParams();
    const slug = searchParams.get('slug');

    const [productData, setProductData] = useState<any>(null);
    const [history, setHistory] = useState<any>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;

        const fetchData = async () => {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://retro-collector-api.onrender.com';
            try {
                // 1. Fetch Game/Product Data
                const res = await fetch(`${apiUrl}/api/v1/games/${slug}`);
                if (res.ok) {
                    const game = await res.json();

                    // We need to shape it for GameDetailView request
                    // GameDetailView expects: product, history, lang, dict, game(optional)

                    // Determine Main Variant
                    const variant = game.variants?.[0]; // Simplified

                    // We need full details if possible.
                    // Let's use the game object directly as much as possible.
                    setProductData(game);

                    // 2. Fetch History
                    // api/v1/games/{slug}/history doesn't exist? 
                    // Usually we use /products/{id}/history
                    // We need a variant ID.
                    if (variant?.id) {
                        const histRes = await fetch(`${apiUrl}/api/v1/products/${variant.id}/history`);
                        if (histRes.ok) setHistory(await histRes.json());
                    }
                }
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        fetchData();
    }, [slug]);

    if (loading) return <div className="min-h-screen bg-[#0f121e] text-white flex items-center justify-center">Loading product...</div>;

    if (!productData) return <div className="min-h-screen bg-[#0f121e] text-white flex items-center justify-center">Product not found.</div>;

    // Minimal Dictionary for View
    const dict = {
        common: { loading: "Loading...", error: "Error" },
        product: {
            details: "Details",
            market_value: "Market Value",
            current_listings: "Current Listings",
            description: "Description",
            search_amazon: "Search Amazon",
            search_ebay: "Search eBay",
            not_found: { title: "Not Found", back: "Back" },
            condition: { loose: "Loose", cib: "CIB", new: "New" }
        },
        // Add minimal structure to prevent crashes
        header: { nav: { games: "Games", consoles: "Consoles", accessories: "Accessories" } }
    };

    // Adapt Game Data to Product Interface for View
    // GameDetailView handles 'game' prop gracefully now.
    const mockProduct = {
        id: productData.results?.[0]?.id || 0, // Fallback
        product_name: productData.title,
        console_name: productData.console,
        game_slug: productData.slug,
        description: productData.description
    };

    return (
        <GameDetailView
            product={mockProduct}
            history={history}
            lang={lang as any}
            dict={dict as any}
            game={productData}
        />
    );
}
