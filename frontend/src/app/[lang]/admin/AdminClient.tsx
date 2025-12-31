"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import AmazonStats from './dashboard/AmazonStats';
import UsersTable from './dashboard/UsersTable';
import SystemTools from './dashboard/SystemTools';

type Tab = 'dashboard' | 'amazon' | 'users' | 'system';

export default function AdminDashboardClient() {
    const { user, token, loading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [stats, setStats] = useState<any>(null);
    const [fusionStats, setFusionStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [fusionResult, setFusionResult] = useState<any>(null);

    // Security Check
    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated || !user?.is_admin) {
                router.replace('/');
            }
        }
    }, [user, authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated && user?.is_admin && token) {
            fetchStats();
        }
    }, [isAuthenticated, user, token]);

    const fetchStats = async () => {
        if (!token) return;
        try {
            const [statsRes, fusionRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://retrocharting.com'}/api/v1/admin/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://retrocharting.com'}/api/v1/admin/consolidation/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (fusionRes.ok) setFusionStats(await fusionRes.json());

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const runFusion = async (dryRun: boolean) => {
        if (!token) return;
        setProcessing(true);
        setFusionResult(null);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://retrocharting.com'}/api/v1/admin/consolidation/run?dry_run=${dryRun}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setFusionResult(data);
            // Refresh stats
            fetchStats();
        } catch (e: any) {
            alert("Error running fusion: " + e.message);
        } finally {
            setProcessing(false);
        }
    };

    if (authLoading || (loading && isAuthenticated)) return <div className="p-8 text-white">Loading Admin Securely...</div>;
    if (!isAuthenticated || !user?.is_admin) return null; // Will redirect

    return (
        <div className="min-h-screen bg-[#0f121e] text-white p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold">Admin Dashboard</h1>
                <div className="text-sm text-gray-400">
                    Logged as <span className="text-[#ff6600]">{user.email}</span>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex space-x-4 border-b border-[#2a3142] mb-8 overflow-x-auto">
                <TabButton label="Dashboard & Fusion" id="dashboard" active={activeTab} onClick={setActiveTab} />
                <TabButton label="Amazon Market" id="amazon" active={activeTab} onClick={setActiveTab} />
                <TabButton label="User Management" id="users" active={activeTab} onClick={setActiveTab} />
                <TabButton label="System & Logs" id="system" active={activeTab} onClick={setActiveTab} />
            </div>

            {/* CONTENT AREA */}
            <div className="animate-fade-in">
                {activeTab === 'dashboard' && (
                    <>
                        {/* General Stats */}
                        <section className="mb-12">
                            <h2 className="text-2xl font-bold mb-4 text-[#ff6600]">Platform Health</h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <StatCard label="Total Products" value={stats?.total_products} />
                                <StatCard label="Scraped %" value={`${stats?.scraped_percentage}%`} />
                                <StatCard label="Pending Images" value={stats?.pending_image_migration} />
                                <StatCard label="Missing Descriptions" value={stats?.missing_description_count} />
                            </div>
                        </section>

                        {/* Fusion Center */}
                        <section className="bg-[#1f2533] p-6 rounded-lg border border-[#2a3142]">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-[#ff6600]">Fusion Center 🧬</h2>
                                    <p className="text-gray-400">Manage Game/Product consolidation.</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold">{fusionStats?.fusion_rate}%</div>
                                    <div className="text-sm text-gray-400">Consolidated</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <StatCard label="Total Products" value={fusionStats?.total_products} bg="bg-[#0f121e]" />
                                <StatCard label="Orphans (No Parent)" value={fusionStats?.orphans} bg="bg-[#0f121e]" highlight />
                                <StatCard label="Games Created" value={fusionStats?.games_created} bg="bg-[#0f121e]" />
                            </div>

                            <div className="border-t border-[#2a3142] pt-6 flex gap-4">
                                <button
                                    onClick={() => runFusion(true)}
                                    disabled={processing}
                                    className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded font-bold transition-colors disabled:opacity-50"
                                >
                                    {processing ? 'Running...' : 'Run Dry Test (Safe)'}
                                </button>

                                <button
                                    onClick={() => runFusion(false)}
                                    disabled={processing}
                                    className="px-6 py-2 bg-[#ff6600] hover:bg-[#e65c00] rounded font-bold transition-colors disabled:opacity-50"
                                >
                                    {processing ? 'Processing...' : '⚡ RUN LIVE FUSION'}
                                </button>
                            </div>

                            {fusionResult && (
                                <div className="mt-6 p-4 bg-[#0f121e] rounded font-mono text-sm overflow-auto max-h-96">
                                    <h3 className="font-bold text-green-400 mb-2">
                                        Result ({fusionResult.mode}):
                                    </h3>
                                    <pre className="whitespace-pre-wrap">
                                        {JSON.stringify(fusionResult.stats, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </section>
                    </>
                )}

                {activeTab === 'amazon' && <AmazonStats />}
                {activeTab === 'users' && <UsersTable />}
                {activeTab === 'system' && <SystemTools />}
            </div>
        </div>
    );
}

function TabButton({ label, id, active, onClick }: { label: string, id: Tab, active: Tab, onClick: (t: Tab) => void }) {
    return (
        <button
            onClick={() => onClick(id)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${active === id
                    ? 'border-[#ff6600] text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
        >
            {label}
        </button>
    );
}

function StatCard({ label, value, bg = 'bg-[#1f2533]', highlight = false }: any) {
    return (
        <div className={`${bg} p-6 rounded border border-[#2a3142]`}>
            <div className="text-gray-400 text-sm mb-1">{label}</div>
            <div className={`text-2xl font-bold ${highlight ? 'text-red-400' : 'text-white'}`}>
                {value !== undefined ? value : '-'}
            </div>
        </div>
    );
}
