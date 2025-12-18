"use client";

import { useEffect, useState } from "react";
import { getListings } from "@/lib/api";
import { formatPrice, convertPriceToUSD } from "@/lib/currency";
import { useCurrency } from "@/context/CurrencyContext";

interface Listing {
    id: number;
    source: string;
    title: string;
    price: number;
    currency: string;
    condition: string;
    url: string;
    image_url?: string;
    seller_name?: string;
    is_good_deal?: boolean;
}

export default function ListingsTable({ productId, dict, genre }: { productId: number; dict: any; genre?: string }) {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'games' | 'extras'>('games');
    const { currency } = useCurrency();

    const [isUpdating, setIsUpdating] = useState(false);

    // Determine Main Tab Label based on Genre
    const isConsole = genre && ['Systems', 'Console', 'Consoles'].includes(genre);
    const mainTabLabel = isConsole
        ? (dict.product.listings.tabs?.consoles || "Consoles")
        : (dict.product.listings.tabs?.games || "Games");
    const extrasTabLabel = dict.product.listings.tabs?.extras || "Extras";

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        let retryCount = 0;
        const MAX_RETRIES = 10; // 30 seconds max

        async function fetchListings() {
            setLoading(true);
            try {
                const { data, isStale, status } = await getListings(productId);

                if (status === 202) {
                    // Cache Miss - Server is scraping in background
                    if (retryCount < MAX_RETRIES) {
                        retryCount++;
                        // Keep loading true, wait 3s and retry
                        timeoutId = setTimeout(fetchListings, 3000);
                    } else {
                        // Timeout
                        setLoading(false);
                        setListings([]);
                    }
                } else {
                    // Success (200) or Error
                    setListings(data);
                    setLoading(false);

                    if (isStale) {
                        // Data is old, background refresh triggered?
                        // If api returns stale data + 200, it usually means "here is old data, refreshing in background"
                        // So we might want to poll once more in 10s? or just let it be.
                        // Current logic was: poll once in 5s.
                        setIsUpdating(true);
                        timeoutId = setTimeout(async () => {
                            // One-off refresh attempt
                            const refreshed = await getListings(productId);
                            setListings(refreshed.data);
                            setIsUpdating(false);
                        }, 5000);
                    } else {
                        setIsUpdating(false);
                    }
                }
            } catch (e) {
                setLoading(false);
            }
        }

        // Initial fetch
        fetchListings();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [productId]);

    // Split listings
    const gameListings = listings
        .filter(l => !['BOX_ONLY', 'MANUAL_ONLY', 'PARTS'].includes(l.condition))
        .sort((a, b) => convertPriceToUSD(a.price, a.currency) - convertPriceToUSD(b.price, b.currency));

    // Sort logic: low to high based on normalized USD price

    const extraListings = listings
        .filter(l => ['BOX_ONLY', 'MANUAL_ONLY'].includes(l.condition))
        .sort((a, b) => convertPriceToUSD(a.price, a.currency) - convertPriceToUSD(b.price, b.currency));

    // We could hide PARTS or put them in extras? Let's assume extras for now.

    // Determine which to show
    const currentListings = activeTab === 'games' ? gameListings : extraListings;

    if (loading) {
        return <div className="text-gray-400 text-center py-4">{dict.product.listings.table.loading}</div>;
    }

    if (listings.length === 0) {
        return <div className="text-gray-400 text-center py-4">{dict.product.listings.table.empty}</div>;
    }

    return (
        <div className="bg-[#1f2533] border border-[#2a3142] rounded overflow-hidden">
            <div className="flex border-b border-[#2a3142]">
                <button
                    onClick={() => setActiveTab('games')}
                    className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'games'
                        ? 'bg-[#2a3142] text-white border-b-2 border-[#ff6600]'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-[#252b3b]'
                        }`}
                >
                    {mainTabLabel} ({gameListings.length})
                </button>
                <button
                    onClick={() => setActiveTab('extras')}
                    className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'extras'
                        ? 'bg-[#2a3142] text-white border-b-2 border-[#ff6600]'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-[#252b3b]'
                        }`}
                >
                    {extrasTabLabel} ({extraListings.length})
                </button>
            </div>

            {isUpdating && (
                <div className="bg-[#151922] text-xs text-blue-400 px-4 py-1 text-center animate-pulse border-b border-[#2a3142]">
                    Updating offers...
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-[#151922] text-xs uppercase font-medium">
                        <tr>
                            <th className="px-4 py-3">{dict.product.listings.table.image}</th>
                            <th className="px-4 py-3">{dict.product.listings.table.title}</th>
                            <th className="px-4 py-3">{dict.product.listings.table.seller}</th>
                            <th className="px-4 py-3">{dict.product.listings.table.condition}</th>
                            <th className="px-4 py-3 text-right">{dict.product.listings.table.price}</th>
                            <th className="px-4 py-3 text-center">{dict.product.listings.table.action || ""}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a3142]">
                        {currentListings.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">No listings in this category.</td></tr>
                        ) : (
                            currentListings.map((item) => (
                                <tr key={item.id} className="hover:bg-[#2a3142] transition-colors">
                                    <td className="px-4 py-3">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.title} className="w-12 h-12 object-cover rounded" />
                                        ) : (
                                            <div className="w-12 h-12 bg-[#0f121e] rounded flex items-center justify-center text-xs">{dict.product.listings.table.no_pic}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-white font-medium max-w-xs">
                                        <div className="flex flex-col gap-1">
                                            <span className="truncate" title={item.title}>{item.title}</span>
                                            {item.is_good_deal && (
                                                <div className="flex items-center">
                                                    <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-green-500/50 uppercase tracking-wide flex items-center gap-1">
                                                        🔥 {dict.product.listings.table.good_deal}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">
                                        <div className="flex flex-col">
                                            {item.source === 'Amazon' ? (
                                                <span className="text-[#FF9900] font-bold flex items-center gap-1">
                                                    <span className="text-white bg-[#FF9900] px-1 rounded text-[10px]">a</span>
                                                    Amazon
                                                </span>
                                            ) : item.source === 'eBay' ? (
                                                <span className="text-[#e53238] font-bold">eBay</span>
                                            ) : (
                                                item.source
                                            )}
                                            {item.seller_name && item.seller_name !== item.source && (
                                                <span className="text-[10px] text-gray-500 truncate max-w-[100px]">{item.seller_name}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.condition === 'MANUAL_ONLY' ? <span className="text-yellow-500">{dict.product.listings.table.manual_only}</span> :
                                            item.condition === 'BOX_ONLY' ? <span className="text-orange-500">{dict.product.listings.table.box_only}</span> :
                                                item.condition || "Used"}
                                    </td>
                                    <td className="px-4 py-3 text-right text-white font-bold">
                                        {formatPrice(item.price, currency)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-[#007bff] hover:bg-[#0056b3] text-white text-xs font-bold py-1.5 px-3 rounded inline-block transition-colors"
                                        >
                                            {dict.product.listings.table.buy}
                                        </a>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
