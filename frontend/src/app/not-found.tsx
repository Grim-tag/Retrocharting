'use client';

// Standard 404 Page (Client Component)
// Integrated with Legacy Fallback
import Link from 'next/link';
import { Suspense } from 'react';
import LegacyFallbackLoader from '@/components/LegacyFallbackLoader'; // We'll name it properly

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f121e] text-white px-4">
            <Suspense fallback={null}>
                <LegacyFallbackLoader />
            </Suspense>

            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
                404
            </h1>
            <h2 className="text-2xl font-bold mb-6">Page Not Found</h2>
            <p className="text-gray-400 text-center max-w-md mb-8">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>

            <div className="flex gap-4">
                <Link
                    href="/"
                    className="px-6 py-3 bg-[#ff6600] rounded hover:bg-[#ff8533] transition-colors font-medium"
                >
                    Go Home
                </Link>
                <Link
                    href="/games"
                    className="px-6 py-3 bg-white/10 rounded hover:bg-white/20 transition-colors font-medium"
                >
                    Browse Games
                </Link>
            </div>
        </div>
    );
}
