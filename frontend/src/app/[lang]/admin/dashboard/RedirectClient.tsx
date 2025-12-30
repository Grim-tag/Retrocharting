"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectClient() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f121e] text-white">
            <p>Redirecting to Fusion Center...</p>
        </div>
    );
}
