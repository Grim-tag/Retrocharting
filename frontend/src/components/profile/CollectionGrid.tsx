'use client';

import React from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import { convertPrice, formatPrice } from '@/lib/currency';
import Link from 'next/link';

interface Item {
    id: number;
    product_id: number;
    product_name: string;
    console_name: string;
    image_url?: string;
    condition: string;
    value: number;
    paid_price?: number;
}

interface CollectionGridProps {
    items: Item[];
    type: 'COLLECTION' | 'WISHLIST';
}

export default function CollectionGrid({ items, type }: CollectionGridProps) {
    const { currency } = useCurrency();

    if (!items || items.length === 0) {
        return (
            <div className="text-center py-20 bg-[#1f2533] rounded-xl border border-[#2a3142] border-dashed">
                <div className="text-6xl mb-4 opacity-50">
                    {type === 'COLLECTION' ? '📦' : '🛒'}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                    {type === 'COLLECTION' ? 'Your collection is empty' : 'Your wishlist is empty'}
                </h3>
                <p className="text-gray-400 mb-6">
                    {type === 'COLLECTION'
                        ? 'Start tracking your games to see them here.'
                        : 'Add games you want to buy to track their cost.'}
                </p>
                <Link href="/games" className="bg-[#ff6600] text-white px-6 py-2 rounded-full font-bold hover:bg-[#ff8533] transition-colors">
                    Browse Games
                </Link>
            </div >
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => {
                const valueLoc = convertPrice(item.value, currency);

                return (
                    <div key={item.id} className="group relative bg-[#1f2533] rounded-lg overflow-hidden border border-[#2a3142] hover:border-[#ff6600] transition-all hover:shadow-lg hover:shadow-orange-900/20">
                        {/* Image */}
                        <div className="aspect-[3/4] relative">
                            {item.image_url ? (
                                <img
                                    src={item.image_url}
                                    alt={item.product_name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full bg-[#111] flex items-center justify-center text-gray-700 font-bold text-xs">
                                    NO IMAGE
                                </div>
                            )}

                            {/* Badge */}
                            <div className="absolute top-2 right-2 bg-black/80 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded border border-gray-700">
                                {item.condition}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-3">
                            <div className="text-xs text-gray-500 mb-1 truncate">{item.console_name}</div>
                            <Link href={`/${item.console_name.toLowerCase().replace(/ /g, '-')}/${item.product_name.toLowerCase().replace(/ /g, '-')}-${item.product_id}`} className="block">
                                <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 h-10 mb-2 group-hover:text-[#ff6600] transition-colors">
                                    {item.product_name}
                                </h3>
                            </Link>

                            <div className="flex items-center justify-between mt-auto">
                                <div className="text-[#22c55e] font-bold text-sm">
                                    {formatPrice(valueLoc, currency)}
                                </div>
                                {/* If paid price exists and logic matches */}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
