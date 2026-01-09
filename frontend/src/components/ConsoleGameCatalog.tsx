'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Product, getGamesByConsole, getProductsByConsole } from '@/lib/api';
import { getGameUrl } from '@/lib/utils';
import JsonLd, { generateItemListSchema } from '@/components/seo/JsonLd';
import { generateConsoleSeo, FaqItem } from '@/lib/seo-utils';
import {
    MagnifyingGlassIcon,
    Squares2X2Icon,
    ListBulletIcon,
    ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import TableActions from '@/components/ui/TableActions';
import { useCurrency } from '@/context/CurrencyContext';
import { formatPrice } from '@/lib/currency';


interface ConsoleGameCatalogProps {
    products: Product[];
    genres: string[];
    systemName: string;
    lang: string;
    gamesSlug: string;
    systemSlug: string;
    h1Title?: string;
    introText?: string;
    faq?: FaqItem[];
    productType?: 'game' | 'console' | 'accessory';
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
    h1Title: initialH1,
    introText: initialIntro,
    faq: initialFaq,
    productType = 'game'
}: ConsoleGameCatalogProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { currency } = useCurrency();

    // -- State --
    const [allProducts, setAllProducts] = useState<Product[]>(products);

    // Filtering State
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [selectedGenre, setSelectedGenre] = useState(searchParams.get('genre') || '');
    const [sortBy, setSortBy] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'title_asc');
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    // Pagination State
    const LOAD_INCREMENT = 50;
    const [visibleCount, setVisibleCount] = useState(LOAD_INCREMENT);
    const [isLoadingFull, setIsLoadingFull] = useState(true);

    // -- Sync Props --
    useEffect(() => {
        setAllProducts(products);
    }, [products]);

    // -- HYDRATION: Progressive Loading --
    useEffect(() => {
        // If we already have a large list from props (e.g. dev mode or previous nav), skip.
        if (products.length > 100) return;

        let isMounted = true;

        const fetchProgressively = async () => {
            let useLegacyApi = false;
            try {
                setIsLoadingFull(true);

                // --- STEP 1: Fast Chunk (First 200) ---
                // Try Unified Games API first
                // Determine Genre Filter based on productType
                let genreFilter: string | undefined = undefined;
                if (productType === 'console') genreFilter = 'Systems';
                else if (productType === 'accessory') genreFilter = 'Accessories';
                // If productType is 'game', we might want to EXCLUDE systems?
                // For now, 'undefined' usually returns mostly games if the DB is dominated by games.
                // But typically we don't want consoles in the game list either. 
                // However, 'read_games' filter is 'ilike %genre%'. Excluding is harder without a specific flag.
                // Let's assume 'game' type implies no specific filter, or maybe we should filter 'Game'?
                // For now, fixing the Console tab (Systems) is the priority.

                // Match type for backend
                const apiType = (productType === 'accessory' || productType === 'game') ? productType : undefined;

                let fastChunk: any[] = await getGamesByConsole(systemName, 200, genreFilter, undefined, 40, undefined, apiType);

                // Fallback Detection
                if (!fastChunk || fastChunk.length === 0) {
                    console.warn("Games API returned 0 items. Falling back to Legacy Products API.");
                    useLegacyApi = true;
                    // Fetch legacy products matching the type
                    fastChunk = await getProductsByConsole(systemName, 200, undefined, productType, undefined, 40, undefined);
                }

                if (!isMounted) return;

                if (fastChunk && fastChunk.length > 0) {
                    setAllProducts(prev => {
                        // Adapt Games/Products to unified structure
                        const adapted: Product[] = fastChunk.map((g: any) => ({
                            id: g.id,
                            pricecharting_id: 0,
                            product_name: useLegacyApi ? g.product_name : g.title,
                            console_name: useLegacyApi ? g.console_name : g.console,
                            loose_price: useLegacyApi ? g.loose_price : (g.min_price || 0),
                            cib_price: useLegacyApi ? g.cib_price : (g.cib_price || 0),
                            new_price: useLegacyApi ? g.new_price : (g.new_price || 0),
                            image_url: g.image_url,
                            genre: g.genre || "",
                            game_slug: useLegacyApi ? undefined : g.slug // Only Games have slugs
                        }));

                        // Deduplicate & Prioritize Unified Items
                        // Strategies:
                        // 1. If ID exists -> Skip (unless we want to update? But ID is unique usually)
                        // 2. If Name exists -> Check if we have a better version (e.g. Unified vs Legacy). 
                        //    Unified items have 'game_slug'. Legacy items might not (or might be raw products).
                        //    We want to PREFER items with game_slug.

                        // Map of Name -> Product
                        const productMap = new Map<string, Product>();

                        // Initialize with previous items
                        prev.forEach(p => productMap.set(p.product_name, p));

                        // Process new items (Adapted Games)
                        adapted.forEach(newItem => {
                            const existing = productMap.get(newItem.product_name);
                            if (!existing) {
                                productMap.set(newItem.product_name, newItem);
                            } else {
                                // Collision. Choose the "Better" one.
                                // If new item has game_slug and existing doesn't, take new.
                                if (newItem.game_slug && !existing.game_slug) {
                                    productMap.set(newItem.product_name, newItem);
                                }
                                // Else keep existing (preserving order or data)
                            }
                        });

                        // Convert back to array, preserving original order as much as possible?
                        // Actually, map iteration order is insertion order. 
                        // But we want to append new items?
                        // Let's just return values.
                        return Array.from(productMap.values());
                    });
                } else {
                    // If absolutely nothing found even after fallback
                    setIsLoadingFull(false);
                    return;
                }

                // --- STEP 2: Background Loop ---
                let currentOffset = 240;
                const BATCH_SIZE = 500;
                let hasNextBatch = true;

                while (hasNextBatch && isMounted) {
                    let batch: any[] = [];

                    if (useLegacyApi) {
                        batch = await getProductsByConsole(systemName, BATCH_SIZE, undefined, productType, undefined, currentOffset, undefined);
                    } else {
                        batch = await getGamesByConsole(systemName, BATCH_SIZE, genreFilter, undefined, currentOffset, undefined, apiType);
                    }

                    if (!isMounted) break;

                    if (batch && batch.length > 0) {
                        setAllProducts(prev => {
                            const adapted: Product[] = batch.map((g: any) => ({
                                id: g.id,
                                pricecharting_id: 0,
                                product_name: useLegacyApi ? g.product_name : g.title,
                                console_name: useLegacyApi ? g.console_name : g.console,
                                loose_price: useLegacyApi ? g.loose_price : (g.min_price || 0),
                                cib_price: useLegacyApi ? g.cib_price : (g.cib_price || 0),
                                new_price: useLegacyApi ? g.new_price : (g.new_price || 0),
                                image_url: g.image_url,
                                genre: g.genre || "",
                                game_slug: useLegacyApi ? undefined : g.slug
                            }));
                            // Deduplicate & Prioritize Unified Items (Map Logic)
                            const productMap = new Map<string, Product>();

                            // Initialize with previous items
                            prev.forEach(p => productMap.set(p.product_name, p));

                            // Process new items (Adapted Games)
                            adapted.forEach(newItem => {
                                const existing = productMap.get(newItem.product_name);
                                if (!existing) {
                                    productMap.set(newItem.product_name, newItem);
                                } else {
                                    // Collision. Preseve Unified.
                                    if (newItem.game_slug && !existing.game_slug) {
                                        productMap.set(newItem.product_name, newItem);
                                    }
                                }
                            });

                            return Array.from(productMap.values());
                        });
                        currentOffset += BATCH_SIZE;
                        if (batch.length < BATCH_SIZE) hasNextBatch = false;
                    } else {
                        hasNextBatch = false;
                    }

                    // Throttle
                    await new Promise(r => setTimeout(r, 100));
                }

            } catch (err) {
                console.error("Failed to hydrate catalog progressively", err);
            } finally {
                if (isMounted) setIsLoadingFull(false);
            }
        };

        fetchProgressively();

        return () => { isMounted = false; };
    }, [systemName, products.length]);


    // -- URL Synchronization Helper --
    const updateUrl = (search: string, genre: string, sort: string) => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (genre) params.set('genre', genre);
        if (sort) params.set('sort', sort);

        // Shallow update to avoid full reload/scroll (English = root, French = /fr/ prefix)
        const langPrefix = lang === 'en' ? '' : `/${lang}`;
        router.push(`${langPrefix}/${gamesSlug}/${systemSlug}?${params.toString()}`, { scroll: false });
    };

    // -- Handlers --

    // Instant Search
    const handleSearch = (term: string) => {
        setSearchTerm(term);
        setVisibleCount(LOAD_INCREMENT); // Reset pagination on search
    };

    const executeSearch = () => {
        updateUrl(searchTerm, selectedGenre, sortBy);
    };

    // Instant Filter
    const handleGenreClick = (genre: string) => {
        const newGenre = genre === selectedGenre ? '' : genre;
        setSelectedGenre(newGenre);
        setVisibleCount(LOAD_INCREMENT);
        updateUrl(searchTerm, newGenre, sortBy);
    };

    // Instant Sort
    const handleSortChange = (newSort: SortOption) => {
        setSortBy(newSort);
        updateUrl(searchTerm, selectedGenre, newSort); // Update URL immediately for sort
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            executeSearch(); // Explicitly update URL on Enter
            (e.target as HTMLInputElement).blur();
        }
    };

    // Load More (Client-Side)
    const handleLoadMore = () => {
        setVisibleCount(prev => prev + LOAD_INCREMENT);
    };

    // -- Filtering Logic (Memoized for Performance) --
    const filteredProducts = useMemo(() => {
        let result = [...allProducts];

        // 1. Genre
        if (selectedGenre) {
            result = result.filter(p => p.genre === selectedGenre);
        }

        // 2. Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(p => p.product_name.toLowerCase().includes(lowerTerm));
        }

        // 3. Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'title_asc': return a.product_name.localeCompare(b.product_name);
                case 'title_desc': return b.product_name.localeCompare(a.product_name);

                case 'loose_asc': return (a.loose_price || 0) - (b.loose_price || 0);
                case 'loose_desc': return (b.loose_price || 0) - (a.loose_price || 0);

                case 'cib_asc': return (a.cib_price || 0) - (b.cib_price || 0);
                case 'cib_desc': return (b.cib_price || 0) - (a.cib_price || 0);

                case 'new_asc': return (a.new_price || 0) - (b.new_price || 0);
                case 'new_desc': return (b.new_price || 0) - (a.new_price || 0);

                default: return 0;
            }
        });

        return result;
    }, [allProducts, selectedGenre, searchTerm, sortBy]);

    // Slice for display
    const displayedProducts = filteredProducts.slice(0, visibleCount);
    const hasMore = visibleCount < filteredProducts.length;

    // Helper for table Sort Headers
    const SortHeader = ({ label, fieldKey, alignRight = false }: { label: string, fieldKey: 'title' | 'loose' | 'cib' | 'new', alignRight?: boolean }) => {
        const isAsc = sortBy === `${fieldKey}_asc`;

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

    // -- DYNAMIC SEO (Client-Side) --
    // Recalculate H1 and Intro based on current filters (Instant Feedback)
    const dynamicSeo = useMemo(() => {
        // We need the count of items that match the filters (but ignoring sort)
        // Note: filteredProducts includes sort, but sort doesn't affect count.
        // To be perfectly accurate (and avoid circular dependency if we moved things), we trust filteredProducts.length.

        return generateConsoleSeo(
            systemName,
            selectedGenre || undefined,
            sortBy || undefined,
            filteredProducts.length,
            lang
        );
    }, [systemName, selectedGenre, sortBy, filteredProducts.length, lang]);

    // Schema.org
    const itemListSchema = generateItemListSchema(
        `${systemName} Games Catalog`,
        displayedProducts.map((p, idx) => ({
            name: p.product_name,
            url: getGameUrl(p, lang),
            image: p.image_url,
            position: idx + 1
        }))
    );

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
                    {/* Dynamic H2 (Was H1) based on Client-Side Filters or Props */}
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {initialH1 || dynamicSeo.h1}
                    </h2>
                    {/* Dynamic Intro */}
                    <p className="text-gray-400 text-sm max-w-3xl">
                        {initialIntro || dynamicSeo.intro}
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
                                                    <img src={product.image_url} alt={`${product.product_name} ${product.console_name}`} className="w-full h-full object-contain" loading="lazy" />
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
                                            {formatPrice(product.loose_price, currency)}
                                        </td>
                                        <td className="py-2 px-4 text-right text-sm font-mono text-[#007bff] font-bold">
                                            {formatPrice(product.cib_price, currency)}
                                        </td>
                                        <td className="py-2 px-4 text-right text-sm font-mono text-[#00ff00] font-bold">
                                            {formatPrice(product.new_price, currency)}
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
                                        alt={`${product.product_name} ${product.console_name}`}
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
                                        {formatPrice(product.loose_price, currency)}
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
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedGenre('');
                            updateUrl('', '', sortBy);
                        }}
                        className="mt-4 text-[#ff6600] hover:underline"
                    >
                        Clear All Filters
                    </button>
                </div>
            )}

            {/* Load More (Pagination) */}
            {hasMore && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleLoadMore}
                        className="bg-[#2a3142] hover:bg-[#343b4d] text-white px-8 py-3 rounded-full font-bold transition-colors"
                    >
                        Load More ({filteredProducts.length - displayedProducts.length} remaining)
                    </button>
                </div>
            )}

            {/* FAQ Section */}
            {(initialFaq || dynamicSeo.faq) && (initialFaq || dynamicSeo.faq).length > 0 && (
                <div className="mt-16 border-t border-[#2a3142] pt-8">
                    <h3 className="text-xl font-bold text-white mb-6">Frequently Asked Questions</h3>
                    <div className="grid gap-6 md:grid-cols-2">
                        {(initialFaq || dynamicSeo.faq).map((item, idx) => (
                            <div key={idx} className="bg-[#151922] p-6 rounded border border-[#2a3142]">
                                <h4 className="font-bold text-white mb-2">{item.question}</h4>
                                <p className="text-gray-400 text-sm leading-relaxed">{item.answer}</p>
                            </div>
                        ))}
                    </div>
                    {/* FAQ Schema */}
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                "@context": "https://schema.org",
                                "@type": "FAQPage",
                                "mainEntity": (initialFaq || dynamicSeo.faq).map(item => ({
                                    "@type": "Question",
                                    "name": item.question,
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": item.answer
                                    }
                                }))
                            })
                        }}
                    />
                </div>
            )}
        </div>
    );
}
