"use client";

import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { formatPrice } from '@/lib/currency';
import { useCurrency } from '@/context/CurrencyContext';

interface PriceCardProps {
    label: string;
    price: number | null | undefined;
    color?: string;
    definition: string;
    bestValue?: boolean;
}

export default function PriceCard({ label, price, color = "text-white", definition, bestValue }: PriceCardProps) {
    const hasPrice = price !== null && price !== undefined && price > 0;
    const { currency } = useCurrency();

    return (
        <div className={`bg-[#1f2533] border ${bestValue ? 'border-[#007bff] shadow-[0_0_15px_rgba(0,123,255,0.2)]' : 'border-[#2a3142]'} p-6 rounded text-center relative group transition-transform hover:-translate-y-1`}>
            {bestValue && (
                <div className="absolute top-0 right-0 bg-[#007bff] text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded-bl">
                    Best Value
                </div>
            )}

            {/* Header with Tooltip Trigger */}
            <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-gray-400 text-sm uppercase tracking-wider font-medium">{label}</div>
                <div className="relative group/tooltip cursor-help">
                    <InformationCircleIcon className="w-4 h-4 text-gray-600 hover:text-gray-400" />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black/90 text-white text-xs p-2 rounded shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10 pointer-events-none">
                        {definition}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                    </div>
                </div>
            </div>

            {/* Price Display */}
            <div className={`text-3xl font-bold ${hasPrice ? color : 'text-gray-600 text-xl'}`}>
                {hasPrice ? (
                    formatPrice(price, currency)
                ) : (
                    <span className="flex flex-col items-center">
                        <span className="text-lg">--</span>
                        <span className="text-[10px] text-gray-500 font-normal mt-1 uppercase">No Data</span>
                    </span>
                )}
            </div>

            {/* Conditional Subtext */}
            {hasPrice && (
                <div className="text-[10px] text-gray-500 mt-2 font-mono">
                    Based on recent sales
                </div>
            )}
        </div>
    );
}
