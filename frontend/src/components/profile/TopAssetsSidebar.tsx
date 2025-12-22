'use client';

import React from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import { convertPrice, formatPrice } from '@/lib/currency';
import Link from 'next/link';

interface TopItem {
    name: string;
    console: string;
    value: number;
    image?: string;
    pct_change?: number; // Optional if we add it later
}

export default function TopAssetsSidebar({ items }: { items: TopItem[] }) {
    const { currency } = useCurrency();

    if (!items || items.length === 0) return null;

    return (
        <div className="bg-[#1f2533] p-6 rounded-xl border border-[#2a3142]">
            <h3 className="text-xl font-bold mb-6 text-white">Top Assets</h3>
            <div className="flex flex-col gap-4">
                {items.map((item, i) => {
                    const valueLoc = convertPrice(item.value, currency);

                    return (
                        <div key={i} className="flex items-center gap-4 group">
                            {/* Mini Image */}
                            <div className="w-12 h-16 bg-black rounded overflow-hidden shrink-0 border border-gray-800">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-600">NO IMG</div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-white truncate group-hover:text-[#ff6600] transition-colors" title={item.name}>
                                    {item.name}
                                </div>
                                <div className="text-xs text-gray-500 truncate">{item.console}</div>
                            </div>

                            <div className="text-right">
                                <div className="font-bold text-[#22c55e]">
                                    {formatPrice(valueLoc, currency)}
                                </div>
                                {/* Placeholder for change */}
                                {/* <div className="text-[10px] text-green-500">+12%</div> */}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
