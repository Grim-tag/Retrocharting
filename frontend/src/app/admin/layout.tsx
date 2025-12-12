'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Poppins } from "next/font/google";
import "../globals.css";
import { useAuth } from '@/context/AuthContext';
import { AuthProvider } from '@/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';

const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
});

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${poppins.variable} antialiased bg-[#0f121e] text-white font-sans flex h-screen`}>
                <CurrencyProvider>
                    <AuthProvider>
                        <AdminGuard>
                            {children}
                        </AdminGuard>
                    </AuthProvider>
                </CurrencyProvider>
            </body>
        </html>
    );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated || !user?.is_admin) {
            router.push('/');
        }
    }, [isAuthenticated, user, authLoading, router]);

    // Prevent hydration mismatch or flash of content
    if (!isClient || authLoading) {
        return <div className="min-h-screen bg-[#0f121e] flex items-center justify-center text-white">Loading...</div>;
    }

    if (!user?.is_admin) return null;

    return (
        <>
            <aside className="w-64 border-r border-[#2a3142] bg-[#1f2533] flex flex-col">
                <div className="p-6 border-b border-[#2a3142]">
                    <Link href="/" className="text-xl font-bold tracking-wider text-white notranslate" translate="no">
                        RETRO<span className="text-[#ff6600]">CHARTING</span>
                        <span className="block text-[10px] text-gray-500 mt-1">ADMIN CONSOLE</span>
                    </Link>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    <NavItem href="/admin/dashboard" label="Dashboard" />
                    <NavItem href="/admin/games" label="Games Catalog" />
                    <NavItem href="/admin/health" label="Catalog Health" />
                    <NavItem href="/admin/comments" label="Comments" />
                    <NavItem href="/admin/translations" label="Translations" />
                    <div className="pt-4 mt-4 border-t border-[#2a3142]">
                        <NavItem href="/" label="Back to Site" />
                    </div>
                </nav>

                <div className="p-4 border-t border-[#2a3142]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#ff6600] flex items-center justify-center font-bold">A</div>
                        <div className="text-sm">
                            <div className="font-medium">Admin</div>
                            <div className="text-xs text-gray-500">Super User</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-16 border-b border-[#2a3142] bg-[#1f2533] flex items-center justify-between px-8">
                    <h1 className="font-medium text-lg">Dashboard</h1>
                    {/* Future: Actions / Search */}
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </>
    );
}

function NavItem({ href, label }: { href: string; label: string }) {
    return (
        <Link
            href={href}
            className="block px-4 py-2 rounded text-gray-300 hover:bg-[#2a3142] hover:text-white transition-colors text-sm font-medium"
        >
            {label}
        </Link>
    );
}
