'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Product, getProductsByConsole } from '@/lib/api';
import { getGameUrl } from '@/lib/utils';
import JsonLd, { generateItemListSchema } from '@/components/seo/JsonLd';
import {
    MagnifyingGlassIcon,
    Squares2X2Icon,
    ListBulletIcon,
    ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import TableActions from '@/components/ui/TableActions';
import Breadcrumbs from "@/components/seo/Breadcrumbs";

interface ConsoleGameCatalogProps {
    products: Product[];
    genres: string[];
    systemName: string;
    lang: string;
    gamesSlug: string;
    systemSlug: string;
    h1Title?: string;
    introText?: string;
}

type SortOption = 'title_asc' | 'title_desc' | 'loose_asc' | 'loose_desc' | 'cib_asc' | 'cib_desc' | 'new_asc' | 'new_desc';
type ViewMode = 'list' | 'grid';

export default function ConsoleGameCatalog({
    products,
    genres,
    systemName,
    lang,
    gamesSlug,
    systemSlug,
    h1Title,
    introText
}: ConsoleGameCatalogProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // -- State --
    const [allProducts, setAllProducts] = useState<Product[]>(products);
    const [loadingMore, setLoadingMore] = useState(false);

    // View State
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const sortParam = searchParams.get('sort');
    const [sortBy, setSortBy] = useState<SortOption>((sortParam as SortOption) || 'title_asc');

    // Search State
    const searchFromUrl = searchParams.get('search') || '';
    const [searchTerm, setSearchTerm] = useState(searchFromUrl);

    // -- Sync Props to State --
    // When URL params change (genre, sort, search) and page re-renders, reset list
    useEffect(() => {
        setAllProducts(products);
        setSearchTerm(searchParams.get('search') || '');
        // Sync sort state too
        const s = searchParams.get('sort');
        if (s) setSortBy(s as SortOption);
    }, [products, searchParams]);

    // -- Handlers --

    // Load More (Client updates List)
    const handleLoadMore = async () => {
        setLoadingMore(true);
        try {
            const currentCount = allProducts.length;
            const genre = searchParams.get('genre') || undefined;
            const sort = searchParams.get('sort') || undefined;
            const search = searchParams.get('search') || undefined; // Use URL param, not local state

            const moreProducts = await getProductsByConsole(
                systemName,
                50, // Limit
                genre,
                'game',
                sort,
                currentCount, // Skip
                search
            );

            if (moreProducts.length > 0) {
                setAllProducts(prev => [...prev, ...moreProducts]);
            }
        } catch (error) {
            console.error("Failed to load more products", error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSortChange = (newSort: SortOption) => {
        setSortBy(newSort);
        const params = new URLSearchParams(searchParams.toString());
        params.set('sort', newSort);
        router.push(`/${lang}/${gamesSlug}/${systemSlug}?${params.toString()}`, { scroll: false });
    };

    const handleGenreClick = (genre: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (genre) params.set('genre', genre);
        else params.delete('genre');
        router.push(`/${lang}/${gamesSlug}/${systemSlug}?${params.toString()}`, { scroll: false });
    };

    // Debounced Search (or Enter)
    const handleSearch = (term: string) => {
        setSearchTerm(term);
    };

    // Execute Search on Enter or simple debounce could be added. 
    // unique Search handler for simple "Enter" usage
    const executeSearch = () => {
        const params = new URLSearchParams(searchParams.toString());
        if (searchTerm) params.set('search', searchTerm);
        else params.delete('search');
        router.push(`/${lang}/${gamesSlug}/${systemSlug}?${params.toString()}`, { scroll: false });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            executeSearch();
        }
    };

    // Helper for table Sort Headers
    const SortHeader = ({ label, fieldKey, alignRight = false }: { label: string, fieldKey: 'title' | 'loose' | 'cib' | 'new', alignRight?: boolean }) => {
        const isAsc = sortBy === `${fieldKey}_asc`;
        // ... (Header logic)
        const toggleSort = () => {
            if (isAsc) handleSortChange(`${fieldKey}_desc` as SortOption);
            else handleSortChange(`${fieldKey}_asc` as SortOption);
        };
        return (
            <th
                className={`py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group select-none ${alignRight ? 'text-right' : 'text-left'}`}
                onClick={toggleSort}
            >
                <div className={`flex items-center gap-1 ${alignRight ? 'justify-end' : 'justify-start'}`}>
                    {label}
                    <ArrowsUpDownIcon className={`w-4 h-4 ${isAsc ? 'text-[#ff6600]' : 'text-gray-600 group-hover:text-gray-400'}`} />
                </div>
            </th>
        );
    };

    // Schema.org
    const itemListSchema = generateItemListSchema(
        `${systemName} Games Catalog`,
        allProducts.map((p, idx) => ({
            name: p.product_name,
            url: getGameUrl(p, lang),
            image: p.image_url,
            position: idx + 1
        }))
    );

    // Use `allProducts` directly for display
    const displayedProducts = allProducts;
    // We don't know true total count unless API returns it. 
    // Simple heuristic: if API returned fewer than limit (50) in current batch? 
    // Actually we don't know the last batch size here easily without tracking.
    // Assume hasMore = true unless we get 0 in loadMore? 
    // Better: check if PRODUCTS length is multiple of 50? 
    // Or just always show Load More until it returns 0. 
    // We'll use a simple "hasMore" state or just check if last fetch was full. 
    // Simpler: Just Show Load More button. If user clicks and 0 return, hide it?
    // Let's assume we always show it if count >= 50.
    const hasMore = displayedProducts.length >= 50 && displayedProducts.length % 50 === 0;

    const selectedGenre = searchParams.get('genre') || '';

    return (
        <div>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #151922; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #2a3142; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #3f485e; }
                .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #2a3142 #151922; }
            `}</style>
            <JsonLd data={itemListSchema} />

            {/* Header Area */}
            <div className="mb-6">
                <div className="mt-4">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {h1Title || `${systemName} Games`}
                    </h1>
                    <p className="text-gray-400 text-sm max-w-3xl">
                        {introText || (lang === 'fr'
                            ? `Retrouvez la liste complète des jeux ${systemName} avec leur cote actualisée.`
                            : `Complete list of ${systemName} games with current market prices.`
                        )}
                    </p>
                </div>
            </div>

            {/* Controls Toolbar */}
            <div className="bg-[#1f2533] p-4 rounded-lg border border-[#2a3142] mb-6 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-4 z-30 shadow-xl">

                {/* Search */}
                <div className="relative w-full md:w-96">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search games..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        // Add blur to search? 
                        onBlur={executeSearch}
                        className="w-full bg-[#151922] border border-[#2a3142] text-white pl-10 pr-4 py-2 rounded focus:outline-none focus:border-[#ff6600] transition-colors"
                    />
                </div>

                <div className="flex gap-4 w-full md:w-auto items-center">
                    {/* View Toggle */}
                    <div className="flex bg-[#151922] rounded p-1 border border-[#2a3142]">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-[#2a3142] text-[#ff6600]' : 'text-gray-400 hover:text-white'}`}
                            title="List View"
                        >
                            <ListBulletIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-[#2a3142] text-[#ff6600]' : 'text-gray-400 hover:text-white'}`}
                            title="Grid View"
                        >
                            <Squares2X2Icon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Sort Dropdown (Mobile friendly) */}
                    <select
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value as SortOption)}
                        className="bg-[#151922] border border-[#2a3142] text-white py-2 px-3 rounded focus:outline-none focus:border-[#ff6600] text-sm md:hidden"
                    >
                        <option value="title_asc">Title (A-Z)</option>
                        <option value="title_desc">Title (Z-A)</option>
                        <option value="loose_asc">Price Loose (Low)</option>
                        <option value="loose_desc">Price Loose (High)</option>
                        <option value="cib_asc">Price CIB (Low)</option>
                        <option value="cib_desc">Price CIB (High)</option>
                        <option value="new_asc">Price New (Low)</option>
                        <option value="new_desc">Price New (High)</option>
                    </select>
                </div>
            </div>

            {/* Filter Chips (Genres) */}
            <div className="mb-6 overflow-x-auto pb-2 custom-scrollbar">
                <div className="flex gap-2 min-w-max">
                    <button
                        onClick={() => handleGenreClick('')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${!selectedGenre
                            ? 'bg-[#ff6600] text-white border-[#ff6600]'
                            : 'bg-[#1f2533] text-gray-400 border-[#2a3142] hover:border-white hover:text-white'
                            }`}
                    >
                        All
                    </button>
                    {genres.filter(g => g !== 'Systems' && g !== 'Accessories').map(g => (
                        <button
                            key={g}
                            onClick={() => handleGenreClick(g)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedGenre === g
                                ? 'bg-[#ff6600] text-white border-[#ff6600]'
                                : 'bg-[#1f2533] text-gray-400 border-[#2a3142] hover:border-white hover:text-white'
                                }`}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            {/* PRODUCT LIST VIEW */}
            {viewMode === 'list' && (
                <div className="bg-[#1f2533] rounded-lg border border-[#2a3142] overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-[800px]">
                            <thead className="bg-[#151922] border-b border-[#2a3142]">
                                <tr>
                                    <th className="py-3 px-4 w-16"></th>
                                    <SortHeader label="Title" fieldKey="title" />
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Genre</th>
                                    <SortHeader label="Loose" fieldKey="loose" alignRight />
                                    <SortHeader label="CIB" fieldKey="cib" alignRight />
                                    <SortHeader label="New" fieldKey="new" alignRight />
                                    <th className="py-3 px-4 w-24"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2a3142]">
                                {displayedProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-[#252b3b] transition-colors group">
                                        <td className="py-2 px-4">
                                            <div className="w-10 h-10 bg-[#151922] rounded flex items-center justify-center overflow-hidden border border-[#2a3142]">
                                                {product.image_url ? (
                                                    <img src={product.image_url} alt="" className="w-full h-full object-contain" loading="lazy" />
                                                ) : <div className="w-2 h-2 bg-gray-700 rounded-full" />}
                                            </div>
                                        </td>
                                        <td className="py-2 px-4">
                                            <Link href={getGameUrl(product, lang)} className="font-bold text-white hover:text-[#ff6600] transition-colors block text-sm sm:text-base">
                                                {product.product_name}
                                            </Link>
                                        </td>
                                        <td className="py-2 px-4 text-sm text-gray-400 hidden lg:table-cell">
                                            {product.genre || '-'}
                                        </td>
                                        <td className="py-2 px-4 text-right text-sm font-mono text-gray-300">
                                            {product.loose_price ? `$${product.loose_price.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="py-2 px-4 text-right text-sm font-mono text-[#007bff] font-bold">
                                            {product.cib_price ? `$${product.cib_price.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="py-2 px-4 text-right text-sm font-mono text-[#00ff00] font-bold">
                                            {product.new_price ? `$${product.new_price.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="py-2 px-4 text-right">
                                            <TableActions productId={product.id} productName={product.product_name} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* GRID VIEW (Original) */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {displayedProducts.map((product) => (
                        <Link
                            key={product.id}
                            href={getGameUrl(product, lang)}
                            className="bg-[#1f2533] border border-[#2a3142] rounded overflow-hidden hover:border-[#ff6600] transition-all group flex flex-col"
                        >
                            <div className="aspect-[3/4] flex items-center justify-center bg-[#151922] relative p-4">
                                {product.image_url ? (
                                    <img
                                        src={product.image_url}
                                        alt={product.product_name}
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
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
                                <div className="flex justify-between items-end mt-auto pt-2 border-t border-[#2a3142]">
                                    <div className="text-xs text-gray-400">Loose</div>
                                    <div className="font-bold text-[#ff6600]">
                                        {product.loose_price ? `$${product.loose_price.toFixed(2)}` : '-'}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {displayedProducts.length === 0 && (
                <div className="text-center text-gray-400 py-12 bg-[#1f2533] rounded border border-[#2a3142]">
                    <p className="text-xl mb-2">No games found.</p>
                    <p className="text-sm">Try adjusting your filters or search query.</p>
                    {/* Clear all just resets URL */}
                    <button
                        onClick={() => router.push(`/${lang}/${gamesSlug}/${systemSlug}`)}
                        className="mt-4 text-[#ff6600] hover:underline"
                    >
                        Clear All Filters
                    </button>
                </div>
            )}

            {/* Load More */}
            {hasMore && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="bg-[#2a3142] hover:bg-[#343b4d] text-white px-8 py-3 rounded-full font-bold transition-colors disabled:opacity-50"
                    >
                        {loadingMore ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            )}
        </div>
    );
}
