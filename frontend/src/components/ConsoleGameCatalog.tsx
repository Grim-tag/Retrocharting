'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Product } from '@/lib/api';
import { getGameUrl } from '@/lib/utils';
import Image from 'next/image';

interface ConsoleGameCatalogProps {
    products: Product[];
    genres: string[];
    systemName: string;
    lang: string;
    gamesSlug: string;
    systemSlug: string;
}

export default function ConsoleGameCatalog({
    products,
    genres,
    systemName,
    lang,
    gamesSlug,
    systemSlug
}: ConsoleGameCatalogProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize genre from URL or default to empty (All Games)
    const initialGenre = searchParams.get('genre') || '';
    const [selectedGenre, setSelectedGenre] = useState(initialGenre);

    // Sync state with URL changes (e.g. back button)
    useEffect(() => {
        const genreFromUrl = searchParams.get('genre') || '';
        setSelectedGenre(genreFromUrl);
    }, [searchParams]);

    const handleGenreClick = (genre: string) => {
        setSelectedGenre(genre);

        // Update URL without full reload
        const params = new URLSearchParams(searchParams.toString());
        if (genre) {
            params.set('genre', genre);
        } else {
            params.delete('genre');
        }
        // Removed /console/ from path
        router.push(`/${lang}/${gamesSlug}/${systemSlug}?${params.toString()}`, { scroll: false });
    };

    // Filter products efficiently on client side
    const filteredProducts = useMemo(() => {
        if (!selectedGenre) return products;
        return products.filter(p => p.genre && p.genre.includes(selectedGenre));
    }, [products, selectedGenre]);

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-white">
                    {systemName} Games
                    {selectedGenre && <span className="text-gray-500 ml-2 text-xl font-normal">/ {selectedGenre}</span>}
                </h1>
                <div className="text-gray-400 text-sm">
                    Showing {filteredProducts.length} games
                </div>
            </div>

            {/* Filter Chips */}
            <div className="mb-8">
                <div className="flex flex-wrap justify-center gap-2">
                    <button
                        onClick={() => handleGenreClick('')}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-colors ${!selectedGenre
                            ? 'bg-[#ff6600] text-white border-[#ff6600]'
                            : 'bg-[#1f2533] text-gray-400 border-[#2a3142] hover:border-white hover:text-white'
                            }`}
                    >
                        All Games
                    </button>
                    {genres.filter(g => g !== 'Systems' && g !== 'Accessories').map(g => (
                        <button
                            key={g}
                            onClick={() => handleGenreClick(g)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-colors ${selectedGenre === g
                                ? 'bg-[#ff6600] text-white border-[#ff6600]'
                                : 'bg-[#1f2533] text-gray-400 border-[#2a3142] hover:border-white hover:text-white'
                                }`}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            {/* Game Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredProducts.map((product) => (
                    <Link
                        key={product.id}
                        href={getGameUrl(product, lang)}
                        className="bg-[#1f2533] border border-[#2a3142] rounded overflow-hidden hover:border-[#ff6600] transition-all group flex flex-col"
                    >
                        <div className="aspect-[3/4] p-4 flex items-center justify-center bg-[#151922] relative">
                            {product.image_url ? (
                                <img
                                    src={product.image_url}
                                    alt={product.product_name}
                                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="text-gray-600 text-xs">No Image</div>
                            )}
                        </div>
                        <div className="p-4 flex flex-col flex-grow">
                            <h3 className="font-bold text-white text-sm line-clamp-2 mb-1 group-hover:text-[#ff6600] transition-colors">
                                {product.product_name}
                            </h3>
                            {product.genre && (
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                                    {product.genre}
                                </div>
                            )}
                            <div className="flex justify-between items-end mt-auto">
                                <div className="text-xs text-gray-400">Loose</div>
                                <div className="font-bold text-[#ff6600]">
                                    {product.loose_price ? `$${product.loose_price.toFixed(2)}` : '-'}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {filteredProducts.length === 0 && (
                <div className="text-center text-gray-400 py-12 bg-[#1f2533] rounded border border-[#2a3142]">
                    <p className="text-xl mb-2">No games found for this filter.</p>
                    <button onClick={() => handleGenreClick('')} className="text-[#ff6600] hover:underline">
                        Clear Filters
                    </button>
                </div>
            )}
        </div>
    );
}
