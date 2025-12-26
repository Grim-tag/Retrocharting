'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { routeMap, reverseRouteMap } from '@/lib/route-config';



import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';
import { useLanguageAlternate } from '@/context/LanguageAlternateContext';
import CurrencySelector from './CurrencySelector';
import ScannerModal from './ScannerModal';

export default function Header({ dict, lang }: { dict: any; lang: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, login, logout } = useAuth();
    const { alternates } = useLanguageAlternate();

    // Force Onboarding if username is missing
    useEffect(() => {
        if (user && !user.username && !pathname.includes('/onboarding')) {
            router.push(`/${lang}/onboarding`);
        }
    }, [user, pathname, router, lang]);

    // ... existing locale switch logic (restored) ...
    const switchLocale = (targetLang: string) => {
        // Priority 1: Check if dynamic page registered an alternate URL
        if (targetLang === 'en' && alternates.en) return alternates.en;
        if (targetLang === 'fr' && alternates.fr) return alternates.fr;

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
        // { id: 'collectibles', label: dict.header.nav.collectibles, href: getPath('collectibles') },
    ];

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    return (
        <header className="bg-[#1f2533] border-b border-[#2a3142] sticky top-0 z-50 shadow-lg font-sans">
            <div className="max-w-[1400px] mx-auto px-4">
                <div className="flex items-center justify-between h-16 gap-4">

                    {/* Left: Logo */}
                    <div className="flex items-center gap-4">
                        <Link href={lang === 'en' ? '/' : `/${lang}`} className="flex items-center gap-2 group">
                            <span className="text-2xl font-bold text-white tracking-tight notranslate" translate="no">
                                Retro<span className="text-[#ff6600]">Charting</span>
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-6 overflow-x-auto no-scrollbar">
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

                    {/* Center: Search Bar Removed */}
                    <div className="hidden md:block flex-1 max-w-xl mx-4 relative"></div>

                    {/* Right: Actions (Desktop) */}
                    <div className="hidden md:flex items-center gap-4">
                        <button
                            onClick={() => router.push(`/${lang}/collection`)}
                            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                        >
                            {dict.header.actions.collection}
                        </button>


                        {/* Auth Section */}
                        {user ? (
                            <div className="flex items-center gap-3 bg-[#2a3142] px-3 py-1.5 rounded-full border border-[#3a4152]">
                                {user.avatar_url && (
                                    <button onClick={() => router.push(`/${lang}/profile`)}>
                                        <img src={user.avatar_url} alt="User" className="w-8 h-8 rounded-full border border-[#ff6600]" />
                                    </button>
                                )}
                                <div className="text-sm flex flex-col leading-tight">
                                    <button
                                        onClick={() => router.push(`/${lang}/profile`)}
                                        className="font-bold text-white hover:text-[#ff6600] transition-colors flex items-center gap-1"
                                    >
                                        {user.username || "Choose Pseudo"}
                                        {user.rank && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold uppercase ${user.rank === 'Graded' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black' :
                                                user.rank === 'New' ? 'bg-green-500 text-white' :
                                                    user.rank === 'CIB' ? 'bg-blue-500 text-white' :
                                                        'bg-gray-600 text-gray-300'
                                                }`}>
                                                {user.rank}
                                            </span>
                                        )}
                                    </button>
                                    {user.xp !== undefined && (
                                        <div className="text-[10px] text-gray-400 font-mono">
                                            XP: {user.xp}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => router.push(`/${lang}/sniper`)}
                                    className="hidden lg:flex items-center gap-1 text-xs font-bold bg-[#09b1ba]/20 text-[#09b1ba] hover:bg-[#09b1ba] hover:text-white px-2 py-1 rounded border border-[#09b1ba]/30 transition-all"
                                    title="Sniper Mode"
                                >
                                    🎯 Sniper
                                </button>
                                {/* Portfolio Button Removed as per Phase 3 feedback (Unified into Profile) */}
                                <button
                                    onClick={logout}
                                    className="text-xs text-gray-400 hover:text-white border-l border-gray-600 pl-3 ml-1"
                                    title="Logout"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <div className="rounded overflow-visible p-1">
                                <GoogleLogin
                                    onSuccess={async (credentialResponse) => {
                                        if (credentialResponse.credential) {
                                            try {
                                                await login(credentialResponse.credential);
                                            } catch (e) {
                                                const msg = (e as any)?.message || "Erreur inconnue";
                                                alert(`Échec de la connexion (${msg}).`);
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

                        {/* Currency Selector */}
                        <div className="flex items-center gap-2 border-l border-[#2a3142] pl-4 ml-2">
                            <CurrencySelector />
                        </div>

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

                    {/* Mobile Menu Button + SCANNER */}
                    <div className="md:hidden flex items-center gap-4">
                        <button
                            onClick={() => setIsScannerOpen(true)}
                            className="text-white p-2 bg-[#2a3142] rounded-full hover:bg-gray-700 transition-colors"
                            aria-label="Scan Barcode"
                        >
                            <svg className="w-5 h-5 text-[#ff6600]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        </button>
                        <Link
                            href={switchLocale(lang === 'en' ? 'fr' : 'en')}
                            className="text-sm font-bold text-gray-400 hover:text-white uppercase"
                        >
                            {lang === 'en' ? 'FR' : 'EN'}
                        </Link>
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="text-white p-2"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />

            {/* Mobile Navigation Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-[#1f2533] border-b border-[#2a3142]">
                    <div className="px-4 pt-2 pb-4 space-y-1">
                        {menuItems.map((item) => (
                            <Link
                                key={item.id}
                                href={item.href}
                                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-[#2a3142] hover:text-[#ff6600]"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}

                        <div className="border-t border-[#2a3142] my-2 pt-2">
                            <Link
                                href={`/${lang}/collection`}
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-[#2a3142] hover:text-white"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {dict.header.actions.collection}
                            </Link>

                        </div>

                        {/* Mobile Auth */}
                        <div className="border-t border-[#2a3142] my-2 pt-4 px-3 flex items-center justify-between">
                            {user ? (
                                <div className="flex items-center gap-3 w-full">
                                    {user.avatar_url && (
                                        <img src={user.avatar_url} alt="User" className="w-8 h-8 rounded-full border border-[#ff6600]" />
                                    )}
                                    <div className="flex-1">
                                        <div className="font-bold text-white flex items-center gap-2">
                                            {user.username}
                                            {user.rank && (
                                                <span className="text-xs bg-[#ff6600] text-white px-2 py-0.5 rounded-full">
                                                    {user.rank}
                                                </span>
                                            )}
                                        </div>
                                        {user.xp !== undefined && <div className="text-xs text-gray-400">XP: {user.xp}</div>}
                                    </div>
                                    <button
                                        onClick={() => {
                                            logout();
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className="text-sm text-red-400 hover:text-red-300"
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <div className="flex justify-center w-full">
                                    <GoogleLogin
                                        onSuccess={async (credentialResponse) => {
                                            if (credentialResponse.credential) {
                                                await login(credentialResponse.credential);
                                                setIsMobileMenuOpen(false);
                                            }
                                        }}
                                        onError={() => console.log('Login Failed')}
                                        type="standard"
                                        theme="filled_black"
                                        size="large"
                                        text="signin_with"
                                        shape="pill"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header >
    );
}
