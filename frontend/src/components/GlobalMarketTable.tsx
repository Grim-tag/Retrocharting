"use client";

import React from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import { formatPrice, convertPriceToUSD } from '@/lib/currency';

interface Variant {
    id: number;
    region: string;
    product_name: string;
    prices: {
        loose?: number;
        cib?: number;
        new?: number;
        currency?: string; // Source currency (e.g. EUR, JPY)
    };
}

interface GlobalMarketTableProps {
    variants: Variant[];
}

export default function GlobalMarketTable({ variants }: GlobalMarketTableProps) {
    const { currency } = useCurrency(); // User's selected currency (Target)

    const renderPrice = (price: number | undefined | null, sourceCurrency: string = 'USD') => {
        if (price === undefined || price === null) return '-';

        // 1. Convert Source -> USD (Pivot)
        const priceInUsd = convertPriceToUSD(price, sourceCurrency);

        // 2. Format USD -> Target Currency
        return formatPrice(priceInUsd, currency);
    };

    return (
        <div className="mb-8 bg-[#1f2533] border border-[#2a3142] rounded p-4">
            <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                <span>🌍</span> Global Market Prices
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-[#0f121e]">
                        <tr>
                            <th className="px-4 py-3">Region</th>
                            <th className="px-4 py-3">Loose</th>
                            <th className="px-4 py-3">CIB</th>
                            <th className="px-4 py-3">New</th>
                        </tr>
                    </thead>
                    <tbody>
                        {variants.map((v) => (
                            <tr key={v.id} className="border-b border-[#2a3142] hover:bg-[#2a3142]/50">
                                <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                                    {v.region.includes("PAL") ? "🇪🇺 PAL" : v.region.includes("JP") ? "🇯🇵 JP" : (v.region === "Standard" || v.region.includes("NTSC")) ? "🇺🇸 NTSC" : v.region}
                                    <span className="text-xs text-gray-500">({v.product_name})</span>
                                </td>
                                <td className="px-4 py-3">{renderPrice(v.prices.loose, v.prices.currency)}</td>
                                <td className="px-4 py-3">{renderPrice(v.prices.cib, v.prices.currency)}</td>
                                <td className="px-4 py-3">{renderPrice(v.prices.new, v.prices.currency)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
