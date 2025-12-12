"use client";

import { useEffect, useState } from "react";
import { getListings } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
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

export default function ListingsTable({ productId }: { productId: number }) {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const { currency } = useCurrency();

    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        async function fetchListings() {
            const { data, isStale } = await getListings(productId);
            setListings(data);
            setLoading(false);

            if (isStale) {
                setIsUpdating(true);
                // Poll again in 5 seconds
                timeoutId = setTimeout(fetchListings, 5000);
            } else {
                setIsUpdating(false);
            }
        }
        fetchListings();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [productId]);

    if (loading) {
        return <div className="text-gray-400 text-center py-4">Loading offers...</div>;
    }

    if (listings.length === 0) {
        return <div className="text-gray-400 text-center py-4">No offers found.</div>;
    }

    return (
        <div className="bg-[#1f2533] border border-[#2a3142] rounded overflow-hidden">
            {/* Header removed as requested */}
            {isUpdating && (
                <div className="bg-[#2a3142] text-xs text-blue-400 px-4 py-1 text-center animate-pulse">
                    Updating offers in background...
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-[#151922] text-xs uppercase font-medium">
                        <tr>
                            <th className="px-4 py-3">Image</th>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Seller</th>
                            <th className="px-4 py-3">Condition</th>
                            <th className="px-4 py-3 text-right">Price</th>
                            <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a3142]">
                        {listings.map((item) => (
                            <tr key={item.id} className="hover:bg-[#2a3142] transition-colors">
                                <td className="px-4 py-3">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.title} className="w-12 h-12 object-cover rounded" />
                                    ) : (
                                        <div className="w-12 h-12 bg-[#0f121e] rounded flex items-center justify-center text-xs">No Pic</div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-white font-medium max-w-xs truncate" title={item.title}>
                                    {item.title}
                                    {item.is_good_deal && (
                                        <span className="ml-2 bg-green-500/20 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-green-500/50 uppercase tracking-wide">
                                            🔥 Bonne Affaire
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-gray-300">
                                    {item.seller_name || item.source}
                                </td>
                                <td className="px-4 py-3">
                                    {item.condition || "Used"}
                                </td>
                                <td className="px-4 py-3 text-right text-white font-bold">
                                    {/* 
                                       We assume incoming listings might be in mixed currencies. 
                                       Ideally, backend should normalize first, but formatPrice handles generic numeric display. 
                                       If backend sends EUR/USD distinction, we'd need smarter logic. 
                                       For now, apply simple formatting. 
                                    */}
                                    {/* Using formatPrice will force conversion to target locale currency */}
                                    {formatPrice(item.price, currency)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-[#007bff] hover:bg-[#0056b3] text-white text-xs font-bold py-1.5 px-3 rounded inline-block transition-colors"
                                    >
                                        BUY
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
