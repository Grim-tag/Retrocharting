'use client';

import { useMemo } from 'react';
import { Product } from '@/lib/api';
import { formatPrice } from '@/lib/currency';
import { useCurrency } from '@/context/CurrencyContext';
import { ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface ConsoleSeoStatsProps {
    products: Product[];
    systemName: string;
    region?: 'PAL' | 'NTSC' | 'JP' | 'NTSC-J';
}

export default function ConsoleSeoStats({ products, systemName, region = 'NTSC' }: ConsoleSeoStatsProps) {
    const { currency } = useCurrency();

    const stats = useMemo(() => {
        // Filter out items with no price for accurate stats
        const validProducts = products.filter(p => (p.loose_price || 0) > 0);

        if (validProducts.length === 0) return null;

        const prices = validProducts.map(p => p.loose_price || 0);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const total = prices.reduce((a, b) => a + b, 0);
        const avg = total / prices.length;

        const mostExpensive = validProducts.find(p => (p.loose_price || 0) === max);

        return { min, max, avg, count: validProducts.length, mostExpensive };
    }, [products]);

    if (!stats) return null;

    // --- Regional Text Logic ---
    let seoText = "";

    if (region === 'PAL') {
        seoText = `Sur le marché européen, la cote moyenne d'une console <strong>${systemName}</strong> (Version PAL) est de <strong>${formatPrice(stats.avg, currency)}</strong>. 
        Les collectionneurs recherchent souvent les modèles 50Hz/60Hz d'origine. Les prix débutent à <strong>${formatPrice(stats.min, currency)}</strong> pour une machine en loose, 
        et peuvent grimper jusqu'à <strong>${formatPrice(stats.max, currency)}</strong> pour des packs complets en parfait état.`;
    } else if (region === 'JP' || region === 'NTSC-J') {
        seoText = `Pour les amateurs d'import Japon, une console <strong>${systemName}</strong> (NTSC-J) se négocie en moyenne à <strong>${formatPrice(stats.avg, currency)}</strong>. 
         Le marché nippon offre souvent des éditions exclusives introuvables ailleurs. Comptez <strong>${formatPrice(stats.min, currency)}</strong> pour un modèle standard, 
         mais attention, les éditions limitées "Japan Only" peuvent atteindre <strong>${formatPrice(stats.max, currency)}</strong>.`;
    } else {
        // Default / NTSC
        seoText = `Actuellement, la valeur moyenne d'une console <strong>${systemName}</strong> est de <strong>${formatPrice(stats.avg, currency)}</strong>. 
        Les prix varient de <strong>${formatPrice(stats.min, currency)}</strong> pour les modèles les plus courants (ou en loose) 
        jusqu'à près de <strong>${formatPrice(stats.max, currency)}</strong> pour les éditions limitées ou neuves 
        ${stats.mostExpensive ? `(comme la ${stats.mostExpensive.product_name})` : ''}.`;
    }

    return (
        <div className="bg-[#1f2533] border border-[#2a3142] rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ChartBarIcon className="w-6 h-6 text-[#ff6600]" />
                Analyse du Marché : {systemName}
                {region === 'PAL' && <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded ml-2">EUR / PAL</span>}
                {(region === 'JP' || region === 'NTSC-J') && <span className="text-xs bg-red-600 text-white px-2 py-1 rounded ml-2">JAPON / IMPORT</span>}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Average Price Card */}
                <div className="bg-[#151922] p-4 rounded border border-[#2a3142] flex flex-col items-center text-center">
                    <span className="text-gray-400 text-sm mb-1">Prix Moyen</span>
                    <span className="text-2xl font-bold text-white">{formatPrice(stats.avg, currency)}</span>
                    <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <CurrencyDollarIcon className="w-3 h-3" />
                        Basé sur {stats.count} modèles
                    </div>
                </div>

                {/* Min Price Card */}
                <div className="bg-[#151922] p-4 rounded border border-[#2a3142] flex flex-col items-center text-center">
                    <span className="text-gray-400 text-sm mb-1">Prix Minimum</span>
                    <span className="text-2xl font-bold text-[#00ff00]">{formatPrice(stats.min, currency)}</span>
                    <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <ArrowTrendingDownIcon className="w-3 h-3" />
                        {region === 'JP' ? 'Bon plan Import' : 'Entrée de gamme'}
                    </div>
                </div>

                {/* Max Price Card */}
                <div className="bg-[#151922] p-4 rounded border border-[#2a3142] flex flex-col items-center text-center">
                    <span className="text-gray-400 text-sm mb-1">Prix Maximum</span>
                    <span className="text-2xl font-bold text-[#ff6600]">{formatPrice(stats.max, currency)}</span>
                    <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <ArrowTrendingUpIcon className="w-3 h-3" />
                        {region === 'JP' ? 'Éditions Rares' : 'Éditions Collector'}
                    </div>
                </div>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: seoText }} />
        </div>
    );
}
