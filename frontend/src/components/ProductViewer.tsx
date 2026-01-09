'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import GameDetailView from '@/components/GameDetailView';

export default function ProductViewer({ lang }: { lang: string }) {
    const searchParams = useSearchParams();
    const slug = searchParams.get('slug');

    const [productData, setProductData] = useState<any>(null);
    const [history, setHistory] = useState<any>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;

        const fetchData = async () => {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://retrocharting-backend.onrender.com';
            try {
                // 1. Fetch Game/Product Data
                const res = await fetch(`${apiUrl}/api/v1/games/${slug}`);
                if (res.ok) {
                    const game = await res.json();

                    // Determine Main Variant
                    const variant = game.variants?.[0]; // Simplified

                    setProductData(game);

                    // 2. Fetch History
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
        header: { nav: { games: "Games", consoles: "Consoles", accessories: "Accessories" } }
    };

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
