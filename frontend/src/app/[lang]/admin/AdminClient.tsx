"use client";

import { useState, useEffect } from 'react';

export default function AdminDashboardClient() {
    const [stats, setStats] = useState<any>(null);
    const [fusionStats, setFusionStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [fusionResult, setFusionResult] = useState<any>(null);

    // Hardcoded Admin Key for now (as per backend logic)
    // Ideally this comes from Auth Context or Header
    const ADMIN_KEY = "admin_secret_123";

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const [statsRes, fusionRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://retrocharting.com'}/api/v1/admin/stats`, {
                    headers: { 'X-Admin-Key': ADMIN_KEY }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://retrocharting.com'}/api/v1/admin/consolidation/stats`, {
                    headers: { 'X-Admin-Key': ADMIN_KEY }
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
        setProcessing(true);
        setFusionResult(null);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://retrocharting.com'}/api/v1/admin/consolidation/run?dry_run=${dryRun}`, {
                method: 'POST',
                headers: { 'X-Admin-Key': ADMIN_KEY }
            });
            const data = await res.json();
            setFusionResult(data);
            // Refresh stats
            fetchStats();
        } catch (e) {
            alert("Error running fusion: " + e);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-8 text-white">Loading Admin...</div>;

    return (
        <div className="min-h-screen bg-[#0f121e] text-white p-8">
            <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

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
                    <div className="mt-6 p-4 bg-[#0f121e] rounded font-mono text-sm overflow-auto">
                        <h3 className="font-bold text-green-400 mb-2">
                            Result ({fusionResult.mode}):
                        </h3>
                        <pre>{JSON.stringify(fusionResult.stats, null, 2)}</pre>
                    </div>
                )}
            </section>
        </div>
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
