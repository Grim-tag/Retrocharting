'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        try {
            // Default logic
            let targetLang = 'fr';

            // 1. Check local storage
            const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('rc_lang') : null;
            if (stored && (stored === 'fr' || stored === 'en')) {
                targetLang = stored;
            } else if (typeof navigator !== 'undefined') {
                // 2. Check browser
                if (navigator.language.toLowerCase().startsWith('en')) {
                    targetLang = 'en';
                }
            }

            console.log("Redirecting to", targetLang);
            router.replace(`/${targetLang}`);
        } catch (e) {
            console.error("Redirect error", e);
            // Fallback
            router.replace('/fr');
        }
    }, [router]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-[#1f2533] text-white">
            {/* Simple Logo or Spinner */}
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-orange-500 mb-4"></div>
            <p className="font-sans text-sm text-gray-400">Loading / Chargement...</p>
        </div>
    );
}
