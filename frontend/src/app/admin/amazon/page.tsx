'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from "@/lib/client";

type RegionCounts = {
    PAL: number;
    NTSC: number;
    JP: number;
};

type AmazonStats = {
    total_products_with_amazon: number;
    region_counts: RegionCounts;
    recent_listings: ListingRef[];
};

type ListingRef = {
    product_id: number;
    product_name: string;
    console_name: string;
    amazon_title: string;
    price: number;
    currency: string;
    url: string;
    region: "PAL" | "NTSC" | "JP";
};

export default function AmazonStatsPage() {
    const { token } = useAuth();
    const [stats, setStats] = useState<AmazonStats | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await apiClient.get('/admin/amazon-stats');
            setStats(res.data);
        } catch (error) {
            console.error("Failed to load amazon stats", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [token]);

    if (loading) {
        return <div className="text-white p-8 animate-pulse">Loading Amazon data...</div>;
    }

    if (!stats) return <div className="text-red-400 p-8">Failed to load data.</div>;

    const total = stats.total_products_with_amazon;
    const palPercent = total > 0 ? ((stats.region_counts.PAL / total) * 100).toFixed(1) : 0;
    const ntscPercent = total > 0 ? ((stats.region_counts.NTSC / total) * 100).toFixed(1) : 0;
    const jpPercent = total > 0 ? ((stats.region_counts.JP / total) * 100).toFixed(1) : 0;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    label="Total Covered"
                    value={total.toLocaleString()}
                    subtext="Products with at least 1 Amazon listing"
                    highlight
                />
                <StatCard
                    label="PAL Coverage"
                    value={stats.region_counts.PAL.toLocaleString()}
                    subtext={`${palPercent}% of covered items`}
                    status="blue"
                />
                <StatCard
                    label="NTSC Coverage"
                    value={stats.region_counts.NTSC.toLocaleString()}
                    subtext={`${ntscPercent}% of covered items`}
                    status="green"
                />
                <StatCard
                    label="JP Coverage"
                    value={stats.region_counts.JP.toLocaleString()}
                    subtext={`${jpPercent}% of covered items`}
                    status="red"
                />
            </div>

            {/* Recent Listings Table */}
            <div className="bg-[#1f2533] border border-[#2a3142] rounded-lg overflow-hidden">
                <div className="p-6 border-b border-[#2a3142] flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Recent Amazon Updates</h2>
                    <button
                        onClick={loadData}
                        className="px-4 py-2 text-sm bg-[#2a3142] hover:bg-[#343b4d] text-gray-300 rounded transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-[#2a3142] text-xs uppercase text-gray-200 font-medium">
                            <tr>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Console</th>
                                <th className="px-6 py-4">Region</th>
                                <th className="px-6 py-4">Amazon Price</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2a3142]">
                            {stats.recent_listings.map((item, idx) => (
                                <tr key={idx} className="hover:bg-[#2a3142]/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">
                                        {item.product_name}
                                        <div className="text-xs text-gray-500 font-normal truncate max-w-[200px]" title={item.amazon_title}>
                                            Matches: {item.amazon_title}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{item.console_name}</td>
                                    <td className="px-6 py-4">
                                        <RegionBadge region={item.region} />
                                    </td>
                                    <td className="px-6 py-4 text-white font-mono">
                                        {item.price} {item.currency}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[#ff6600] hover:text-[#ff8533] hover:underline"
                                        >
                                            View Offer
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {stats.recent_listings.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No listings found yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Components
function StatCard({ label, value, subtext, highlight, status }: { label: string; value: string; subtext?: string; highlight?: boolean; status?: "green" | "red" | "blue" }) {

    const statusColor = {
        "green": "bg-green-500",
        "red": "bg-red-500",
        "blue": "bg-blue-500"
    };

    return (
        <div className="bg-[#1f2533] p-6 rounded border border-[#2a3142] relative overflow-hidden group hover:border-[#3d455c] transition-colors">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex justify-between items-center">
                {label}
                {status && (
                    <span className={`h-2 w-2 rounded-full ${statusColor[status]}`}></span>
                )}
            </div>
            <div className={`text-3xl font-bold mb-1 ${highlight ? "text-[#ff6600]" : "text-white"}`}>{value}</div>
            {subtext && <div className="text-xs text-gray-500">{subtext}</div>}
        </div>
    );
}

function RegionBadge({ region }: { region: "PAL" | "NTSC" | "JP" }) {
    const styles = {
        "PAL": "bg-blue-900/40 text-blue-300 border-blue-800",
        "NTSC": "bg-green-900/40 text-green-300 border-green-800",
        "JP": "bg-red-900/40 text-red-300 border-red-800"
    };

    return (
        <span className={`px-2 py-1 rounded text-xs border ${styles[region]} font-medium`}>
            {region}
        </span>
    );
}
