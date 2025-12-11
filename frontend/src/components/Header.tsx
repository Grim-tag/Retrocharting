'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { routeMap, reverseRouteMap } from '@/lib/route-config';



import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';

export default function Header({ dict, lang }: { dict: any; lang: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, login, logout } = useAuth();

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


    // ... logic above ...

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                                <div className="text-sm">
                                    <button
                                        onClick={() => router.push(`/${lang}/profile`)}
                                        className="font-bold text-white hover:text-[#ff6600] transition-colors"
                                    >
                                        {user.username || "Choose Pseudo"}
                                    </button>
                                </div>
                                <button
                                    onClick={() => router.push(`/${lang}/sniper`)}
                                    className="hidden lg:flex items-center gap-1 text-xs font-bold bg-[#09b1ba]/20 text-[#09b1ba] hover:bg-[#09b1ba] hover:text-white px-2 py-1 rounded border border-[#09b1ba]/30 transition-all"
                                    title="Sniper Mode"
                                >
                                    🎯 Sniper
                                </button>
                                <button
                                    onClick={() => router.push(`/${lang}/collection/analytics`)}
                                    className="hidden lg:flex items-center gap-1 text-xs font-bold bg-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e] hover:text-white px-2 py-1 rounded border border-[#22c55e]/30 transition-all ml-2"
                                    title="Portfolio Analytics"
                                >
                                    📈 Portfolio
                                </button>
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

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
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
                            <Link
                                href="#"
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-[#2a3142] hover:text-white"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {dict.header.actions.wishlist}
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
                                        <div className="font-bold text-white">{user.username}</div>
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
