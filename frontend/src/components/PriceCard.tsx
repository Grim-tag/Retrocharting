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

    // Helper for dynamic font size
    const formattedPrice = hasPrice ? formatPrice(price, currency) : "--";
    const isLongPrice = formattedPrice.length > 8; // e.g. €1,234.56 is 9 chars
    const isVeryLongPrice = formattedPrice.length > 10; // e.g. €10,234.56

    // Dynamic classes
    let fontSizeClass = "text-xl sm:text-3xl";
    if (isVeryLongPrice) fontSizeClass = "text-lg sm:text-xl";
    else if (isLongPrice) fontSizeClass = "text-lg sm:text-2xl";

    return (
        <div className={`bg-[#1f2533] border ${bestValue ? 'border-[#007bff] shadow-[0_0_15px_rgba(0,123,255,0.2)]' : 'border-[#2a3142]'} p-3 sm:p-6 rounded text-center relative group transition-transform hover:-translate-y-1 h-full flex flex-col justify-center overflow-hidden`}>
            {bestValue && (
                <div className="absolute top-0 right-0 bg-[#007bff] text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 uppercase tracking-wider rounded-bl">
                    Best
                </div>
            )}

            {/* Header with Tooltip Trigger */}
            <div className="flex items-center justify-center gap-1.5 mb-1 sm:gap-2 sm:mb-2">
                <div className="text-gray-400 text-xs sm:text-sm uppercase tracking-wider font-medium truncate">{label}</div>
                <div className="relative group/tooltip cursor-help hidden sm:block">
                    <InformationCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 hover:text-gray-400" />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black/90 text-white text-xs p-2 rounded shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none">
                        {definition}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                    </div>
                </div>
            </div>

            {/* Price Display */}
            <div className={`font-bold ${hasPrice ? color : 'text-gray-600'} ${fontSizeClass} transition-all duration-200`}>
                {hasPrice ? (
                    formattedPrice
                ) : (
                    <span className="flex flex-col items-center">
                        <span className="text-base sm:text-lg">--</span>
                    </span>
                )}
            </div>

            {/* Conditional Subtext */}
            {hasPrice && (
                <div className="text-[9px] sm:text-[10px] text-gray-500 mt-1 sm:mt-2 font-mono hidden sm:block">
                    Based on recent sales
                </div>
            )}
        </div>
    );
}
