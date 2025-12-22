'use client';

import React from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import { convertPrice, formatPrice } from '@/lib/currency';

interface KpiGridProps {
    kpis: {
        total_value: number;
        invested: number;
        item_count: number;
        wishlist_cost: number;
        wishlist_count: number;
    };
}

export default function KpiGrid({ kpis }: KpiGridProps) {
    const { currency } = useCurrency();

    // Helper for currency conversion
    const format = (val: number) => formatPrice(convertPrice(val, currency), currency);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Value */}
            <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] relative overflow-hidden group hover:border-[#ff6600] transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-6xl">💰</span>
                </div>
                <h3 className="text-gray-400 uppercase text-xs font-bold mb-2">Total Value</h3>
                <div className="text-3xl font-bold text-[#22c55e]">
                    {format(kpis.total_value)}
                </div>
                <div className="text-xs text-green-500/80 mt-1 flex items-center gap-1">
                    <span>▲ Market Value</span>
                </div>
            </div>

            {/* Invested */}
            <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] relative overflow-hidden group hover:border-[#ff6600] transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-6xl">💸</span>
                </div>
                <h3 className="text-gray-400 uppercase text-xs font-bold mb-2">Invested</h3>
                <div className="text-3xl font-bold text-red-400">
                    {format(kpis.invested)}
                </div>
                <div className="text-xs text-red-400/80 mt-1">
                    Cost Basis
                </div>
            </div>

            {/* Item Count */}
            <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] relative overflow-hidden group hover:border-[#ff6600] transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-6xl">🎮</span>
                </div>
                <h3 className="text-gray-400 uppercase text-xs font-bold mb-2">Collection Size</h3>
                <div className="text-3xl font-bold text-white">
                    {kpis.item_count}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                    Physical Items
                </div>
            </div>

            {/* Wishlist Cost */}
            <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142] relative overflow-hidden group hover:border-[#ff6600] transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-6xl">🛒</span>
                </div>
                <h3 className="text-gray-400 uppercase text-xs font-bold mb-2">Wishlist Value</h3>
                <div className="text-3xl font-bold text-orange-400">
                    {format(kpis.wishlist_cost)}
                </div>
                <div className="text-xs text-orange-400/80 mt-1">
                    {kpis.wishlist_count} wanted items
                </div>
            </div>
        </div>
    );
}
