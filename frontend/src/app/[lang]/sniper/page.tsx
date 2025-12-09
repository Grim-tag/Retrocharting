'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PlayIcon, StopIcon, ArrowTopRightOnSquareIcon, FireIcon } from '@heroicons/react/24/outline';
import { FireIcon as FireIconSolid } from '@heroicons/react/24/solid';

export default function SniperPage({ params }: { params: { lang: string } }) {
    // ... (rest of imports/state) ...

    // ... (inside map loop) ... 
    <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2 pr-4 min-w-0">
                <h3 className="text-white font-bold text-lg truncate group-hover:text-[#09b1ba] transition-colors">
                    {item.title}
                </h3>
                {item.is_potential_deal && (
                    <div className="flex items-center gap-1 bg-red-500/20 text-red-500 px-2 py-0.5 rounded border border-red-500/50 animate-pulse">
                        <FireIconSolid className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Deal</span>
                    </div>
                )}
            </div>

            {item.platform && item.platform !== "Unknown" && item.platform !== "Vinted" && (
                <span className="text-xs bg-[#2a3142] text-gray-300 px-2 py-1 rounded border border-gray-600 flex-shrink-0">
                    {item.platform}
                </span>
            )}
        </div>
        <div className="text-gray-400 text-sm mb-2">{item.created_at_ts || "Just now"}</div>

        <div className="flex items-center gap-4">
            {/* Main Price */}
            <div className="flex flex-col">
                <span className="text-2xl font-bold text-white leading-none">
                    {item.price?.amount || item.price} €
                </span>
                <span className="text-xs text-gray-500">Price</span>
            </div>

            {/* + Symbol */}
            <span className="text-gray-600 text-xl font-light">+</span>

            {/* Shipping */}
            <div className="flex flex-col">
                <span className="text-sm text-gray-300 font-medium">
                    {item.shipping?.amount ? `${item.shipping.amount} €` : "2.99 €"}
                </span>
                <span className="text-[10px] text-gray-500 uppercase">Ship</span>
            </div>

            {/* + Symbol */}
            <span className="text-gray-600 text-xl font-light">+</span>

            {/* Protection Fee (Shield) */}
            <div className="relative group/shield flex flex-col items-center cursor-help">
                <div className="flex items-center gap-1 text-sm text-gray-300 font-medium">
                    <span>
                        {item.fee?.amount ? `${item.fee.amount} €` : "0.70 €"}
                    </span>
                    <span className="text-[#09b1ba]">🛡️</span>
                </div>
                <span className="text-[10px] text-gray-500 uppercase">Prot.</span>

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/shield:block w-48 bg-black/90 text-white text-xs p-2 rounded z-10 border border-gray-700 shadow-xl">
                    Buyer Protection Fee included.
                    (0.70€ + 5% of item price)
                </div>
            </div>

            {/* = Symbol */}
            <span className="text-gray-500 text-xl font-light">=</span>

            {/* Total Estimate */}
            <div className="flex flex-col">
                <span className="text-xl font-bold text-[#09b1ba]">
                    {item.total_estimate?.amount
                        ? `${item.total_estimate.amount} €`
                        : `${((item.price?.amount || 0) + (item.fee?.amount || 0) + (item.shipping?.amount || 2.99)).toFixed(2)} €`}
                </span>
                <div className="relative group/total cursor-help">
                    <span className="text-[10px] text-[#09b1ba]/70 uppercase border-b border-dotted border-[#09b1ba]/50">Total Est.</span>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/total:block w-40 bg-black/90 text-white text-xs p-2 rounded z-10 border border-gray-700 shadow-xl whitespace-normal text-center">
                        Prix + Port (est.) + Protection
                    </div>
                </div>
            </div>
        </div>
    </div>

    {/* Actions */ }
    <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-[#2a3142] hover:bg-[#09b1ba] text-white p-3 rounded-full transition-colors flex-shrink-0"
    >
        <ArrowTopRightOnSquareIcon className="w-6 h-6" />
    </a>
                        </div >
                    ))
}

{
    results.length === 0 && !isRunning && (
        <div className="text-center py-20 text-gray-500">
            Ready to snipe. Enter a keyword above.
        </div>
    )
}
                </div >
            </div >
        </div >
    );
}
