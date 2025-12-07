'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { searchProducts, Product } from '@/lib/api';
import { routeMap, reverseRouteMap } from '@/lib/route-config';



import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';

export default function Header({ dict, lang }: { dict: any; lang: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, login, logout } = useAuth();
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Product[]>([]);

    // Force Onboarding if username is missing
    useEffect(() => {
        if (user && !user.username && !pathname.includes('/onboarding')) {
            router.push(`/${lang}/onboarding`);
        }
    }, [user, pathname, router, lang]);

    // ... existing locale switch logic ...
    const switchLocale = (targetLang: string) => {
        if (!pathname) return '/';
        const segments = pathname.split('/').filter(Boolean);
        const currentLocale = ['en', 'fr'].includes(segments[0]) ? segments[0] : 'en';
        const pathBodySegments = (currentLocale === 'en' || !['en', 'fr'].includes(segments[0]))
            ? segments
            : segments.slice(1);
        const internalSegments = pathBodySegments.map(segment => {
            const key = reverseRouteMap[currentLocale]?.[segment];
            return key || segment;
        });
        const targetSegments = internalSegments.map(key => {
            if (routeMap[key]) {
                return routeMap[key][targetLang] || key;
            }
            return key;
        });
        const newPath = `/${targetSegments.join('/')}`;
        if (targetLang === 'en') {
            return newPath || '/';
        }
        return `/${targetLang}${newPath}`;
    };

    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Helper for localized path
    const getSlug = (key: string) => routeMap[key]?.[lang] || key;
    const getPath = (key: string) => {
        const slug = getSlug(key);
        if (lang === 'en') {
            return `/${slug}`;
        }
        return `/${lang}/${slug}`;
    };

    // Dynamic Menu Items from Dictionary
    const menuItems = [
        {
            id: 'video-games',
            label: dict.header.nav.video_games,
            href: getPath('games'),
        },
        { id: 'consoles', label: dict.header.nav.consoles, href: getPath('consoles') },
        { id: 'accessories', label: dict.header.nav.accessories, href: getPath('accessories') },
        { id: 'collectibles', label: dict.header.nav.collectibles, href: getPath('collectibles') },
    ];

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length > 2) {
                const results = await searchProducts(query);
                setSuggestions(results);
                setShowSuggestions(true);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    // Close suggestions when clicking outside
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
        }
    };

    const handleSuggestionClick = (productId: number) => {
        setQuery('');
        setShowSuggestions(false);
        const gamesSlug = getSlug('games');
        if (lang === 'en') {
            router.push(`/${gamesSlug}/${productId}`);
        } else {
            router.push(`/${lang}/${gamesSlug}/${productId}`);
        }
    };

    return (
        <header className="bg-[#1f2533] border-b border-[#2a3142] sticky top-0 z-50 shadow-lg font-sans">
            <div className="max-w-[1400px] mx-auto px-4">
                <div className="flex items-center justify-between h-16 gap-4">

                    {/* Left: Logo */}
                    <div className="flex items-center gap-4">
                        <Link href={lang === 'en' ? '/' : `/${lang}`} className="flex items-center gap-2 group">
                            <span className="text-2xl font-bold text-white tracking-tight">
                                Retro<span className="text-[#ff6600]">Charting</span>
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                        {menuItems.map((item) => (
                            <Link
                                key={item.id}
                                href={item.href}
                                className="text-sm font-medium text-white hover:text-[#ff6600] transition-colors uppercase tracking-wide whitespace-nowrap"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Center: Search Bar */}
                    <div className="hidden md:block flex-1 max-w-xl mx-4 relative" ref={searchRef}>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => query.length > 2 && setShowSuggestions(true)}
                            placeholder={dict.header.search_placeholder}
                            className="w-full bg-[#0f121e] text-white border border-[#2a3142] rounded px-4 py-2 pl-10 focus:outline-none focus:border-[#ff6600] transition-colors"
                        />
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />

                        {/* Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-[#1f2533] border border-[#2a3142] rounded-b shadow-xl mt-1 z-50 max-h-96 overflow-y-auto">
                                {suggestions.map((product) => (
                                    <div
                                        key={product.id}
                                        onClick={() => handleSuggestionClick(product.id)}
                                        className="p-3 hover:bg-[#2a3142] cursor-pointer flex items-center gap-3 border-b border-[#2a3142] last:border-0"
                                    >
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.product_name} className="w-10 h-10 object-cover rounded" />
                                        ) : (
                                            <div className="w-10 h-10 bg-[#0f121e] rounded flex items-center justify-center text-xs text-gray-500">No Img</div>
                                        )}
                                        <div>
                                            <div className="text-white font-medium text-sm">{product.product_name}</div>
                                            <div className="text-gray-400 text-xs">{product.console_name}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-4">
                            <button
                                onClick={() => router.push(`/${lang}/collection`)}
                                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                            >
                                {dict.header.actions.collection}
                            </button>
                            <button className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                                {dict.header.actions.wishlist}
                            </button>

                            {/* Auth Section */}
                            {user ? (
                                <div className="flex items-center gap-3 bg-[#2a3142] px-3 py-1.5 rounded-full border border-[#3a4152]">
                                    {user.avatar_url && (
                                        <button onClick={() => router.push(`/${lang}/profile`)}>
                                            <img src={user.avatar_url} alt="User" className="w-8 h-8 rounded-full border border-[#ff6600]" />
                                        </button>
                                    )}
                                    <div className="hidden md:block text-sm">
                                        <button
                                            onClick={() => router.push(`/${lang}/profile`)}
                                            className="font-bold text-white hover:text-[#ff6600] transition-colors"
                                        >
                                            {user.username || "Choose Pseudo"}
                                        </button>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="text-xs text-gray-400 hover:text-white border-l border-gray-600 pl-3 ml-1"
                                        title="Logout"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <div className="rounded overflow-hidden">
                                    <GoogleLogin
                                        onSuccess={async (credentialResponse) => {
                                            if (credentialResponse.credential) {
                                                try {
                                                    await login(credentialResponse.credential);
                                                } catch (e) {
                                                    alert("Échec de la connexion. Vérifiez que le serveur est lancé.");
                                                }
                                            }
                                        }}
                                        onError={() => {
                                            console.log('Login Failed');
                                            alert("Échec de la connexion Google.");
                                        }}
                                        type="icon"
                                        theme="filled_black"
                                        size="medium"
                                        shape="circle"
                                    />
                                </div>
                            )}

                            {/* Language Switcher */}
                            <div className="flex items-center gap-2 border-l border-[#2a3142] pl-4 ml-2">
                                <Link
                                    href={switchLocale('en')}
                                    className={`text-sm font-bold ${lang === 'en' ? 'text-[#ff6600]' : 'text-gray-400 hover:text-white'}`}
                                >
                                    EN
                                </Link>
                                <span className="text-gray-600">/</span>
                                <Link
                                    href={switchLocale('fr')}
                                    className={`text-sm font-bold ${lang === 'fr' ? 'text-[#ff6600]' : 'text-gray-400 hover:text-white'}`}
                                >
                                    FR
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
