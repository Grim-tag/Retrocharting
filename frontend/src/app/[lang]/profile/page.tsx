'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPortfolioDashboard } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import ProfileHeader from '@/components/profile/ProfileHeader';
import KpiGrid from '@/components/profile/KpiGrid';
import CollectionGrid from '@/components/profile/CollectionGrid';
import TopAssetsSidebar from '@/components/profile/TopAssetsSidebar';

export default function ProfilePage() {
    const { token, isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'COLLECTION' | 'WISHLIST' | 'ANALYTICS'>('COLLECTION');
    const params = useParams();
    const lang = (params?.lang as string) || 'en';

    useEffect(() => {
        if (!isAuthenticated) return;

        async function loadDashboard() {
            if (!token) return;
            setLoading(true);
            const dashboard = await getPortfolioDashboard(token);
            setData(dashboard);
            setLoading(false);
        }
        loadDashboard();
    }, [token, isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#0f121e] flex flex-col items-center justify-center text-white px-4">
                <h1 className="text-3xl font-bold mb-4">Profile Access</h1>
                <p className="text-gray-400 mb-8">Please log in to view your profile and collection.</p>
                <a href="/login" className="bg-[#ff6600] text-white px-6 py-3 rounded-full font-bold hover:bg-[#ff8533]">Login</a>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f121e] flex items-center justify-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff6600]"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-[#0f121e] flex items-center justify-center text-white">
                <p>Failed to load profile data.</p>
            </div>
        );
    }

    const copyPublicLink = () => {
        const url = `${window.location.origin}/u/${data.user.username}`;
        navigator.clipboard.writeText(url);
        alert("Public profile link copied to clipboard!");
    };

    return (
        <main className="min-h-screen bg-[#0f121e] py-8 pb-20">
            <div className="max-w-[1400px] mx-auto px-4">

                {/* 1. Header (Identity) */}
                <ProfileHeader user={data.user} />

                {/* 2. KPIs */}
                <KpiGrid kpis={data.kpis} />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Main Content (Tabs + Grid) */}
                    <div className="lg:col-span-9">

                        {/* Tabs */}
                        <div className="flex items-center gap-1 mb-6 border-b border-[#2a3142]">
                            <button
                                onClick={() => setActiveTab('COLLECTION')}
                                className={`px-6 py-3 font-bold text-sm uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'COLLECTION'
                                    ? 'border-[#ff6600] text-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                Collection
                            </button>
                            <button
                                onClick={() => setActiveTab('WISHLIST')}
                                className={`px-6 py-3 font-bold text-sm uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'WISHLIST'
                                    ? 'border-[#ff6600] text-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                Wishlist
                            </button>
                            <button
                                onClick={() => setActiveTab('ANALYTICS')}
                                className={`px-6 py-3 font-bold text-sm uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'ANALYTICS'
                                    ? 'border-[#ff6600] text-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                Analytics
                            </button>
                        </div>

                        {/* Content Switcher */}
                        {activeTab === 'ANALYTICS' ? (
                            <div className="bg-[#1f2533] rounded-xl border border-[#2a3142] p-8 text-center">
                                <h3 className="text-2xl font-bold text-white mb-4">Analytics Dashboard</h3>
                                <p className="text-gray-400">Detailed charts coming soon in Phase 3!</p>
                            </div>
                        ) : (
                            <CollectionGrid
                                items={activeTab === 'COLLECTION' ? data.collection : data.wishlist}
                                type={activeTab}
                            />
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-3">
                        <TopAssetsSidebar items={data.top_items} />

                        {/* Future Social Share / Badges? */}
                        <div className="mt-6 bg-[#1f2533] p-6 rounded-xl border border-[#2a3142]">
                            <h3 className="font-bold text-white mb-2">Share Profile</h3>
                            <p className="text-xs text-gray-500 mb-4">Show off your collection to the world.</p>
                            <button
                                onClick={copyPublicLink}
                                className="w-full bg-[#2a3142] hover:bg-[#353e54] text-white font-bold py-2 px-4 rounded border border-[#3a4152] transition-colors flex items-center justify-center gap-2"
                            >
                                <span>🔗</span> Copy Public Link
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}
