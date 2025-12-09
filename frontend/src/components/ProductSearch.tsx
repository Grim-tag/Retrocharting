'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { searchProductsGrouped, GroupedProducts, Product } from '@/lib/api';
import { getGameUrl } from '@/lib/utils';

export default function ProductSearch({ placeholder, lang }: { placeholder: string; lang: string }) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<GroupedProducts>({});
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length > 2) {
                const results = await searchProductsGrouped(query);
                setSuggestions(results);
                setShowSuggestions(true);
            } else {
                setSuggestions({});
                setShowSuggestions(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [searchRef]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && query) {
            setShowSuggestions(false);
            // Optionally navigate to search results page if you have one
            // router.push(`/${lang}/search?q=${query}`);
        }
    };

    const handleSuggestionClick = (product: Product) => {
        setQuery('');
        setShowSuggestions(false);
        const url = getGameUrl(product, lang);
        router.push(url);
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4 relative z-40 my-6" ref={searchRef}>
            <div className="relative group">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query.length > 2 && setShowSuggestions(true)}
                    placeholder={placeholder}
                    className="w-full bg-[#151922] text-white border border-[#2a3142] rounded-full px-6 py-4 pl-12 shadow-lg focus:outline-none focus:border-[#ff6600] focus:ring-1 focus:ring-[#ff6600] transition-all text-lg placeholder-gray-500"
                />
                <MagnifyingGlassIcon className="h-6 w-6 text-gray-400 absolute left-4 top-4 group-focus-within:text-[#ff6600] transition-colors" />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && Object.keys(suggestions).length > 0 && (
                <div className="absolute top-full left-4 right-4 bg-[#1f2533] border border-[#2a3142] rounded-xl shadow-2xl mt-2 overflow-hidden max-h-[60vh] overflow-y-auto z-50">
                    {Object.entries(suggestions).map(([console, products]) => (
                        <div key={console} className="border-b border-[#2a3142] last:border-0">
                            <div className="bg-[#151922] px-4 py-2 text-xs font-bold text-[#ff6600] uppercase tracking-wider sticky top-0">
                                {console}
                            </div>
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    onClick={() => handleSuggestionClick(product)}
                                    className="p-3 hover:bg-[#2a3142] cursor-pointer flex items-center gap-4 transition-colors"
                                >
                                    <div className="relative flex-shrink-0">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.product_name} className="w-12 h-12 object-cover rounded-md shadow-sm" />
                                        ) : (
                                            <div className="w-12 h-12 bg-[#0f121e] rounded-md flex items-center justify-center text-xs text-gray-500">No Img</div>
                                        )}
                                        {product.region && (
                                            <span className={`absolute -bottom-1 -right-1 text-[9px] px-1.5 py-0.5 rounded font-bold shadow-sm ${product.region.includes('EU') ? 'bg-blue-600 text-white' :
                                                product.region.includes('JP') ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                                                }`}>
                                                {product.region.includes('EU') ? 'EU' : product.region.includes('JP') ? 'JP' : 'US'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-white font-medium text-base truncate">{product.product_name}</div>
                                        <div className="text-gray-400 text-xs flex gap-2 items-center mt-1">
                                            <span className="bg-[#2a3142] px-2 py-0.5 rounded">{product.console_name}</span>
                                            {product.genre && <span className="text-gray-500">• {product.genre}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
