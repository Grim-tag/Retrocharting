"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function AmazonStats() {
    const { token } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) fetchStats();
    }, [token]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://retrocharting.com'}/api/v1/admin/amazon-stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setStats(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-gray-400 p-8 text-center">Loading Amazon Data...</div>;

    if (!stats) return <div className="text-red-400 p-8 text-center">Failed to load Amazon stats.</div>;

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-[#ff6600]">Amazon Regional Coverage</h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Total Listings" value={stats.total_products_with_amazon} highlight />
                <StatCard label="NTSC (US/CA)" value={stats.region_counts.NTSC} />
                <StatCard label="PAL (Europe)" value={stats.region_counts.PAL} />
                <StatCard label="JP (Japan)" value={stats.region_counts.JP} />
            </div>

            <div className="bg-[#1f2533] p-4 rounded border border-[#2a3142]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Recent Listings</h3>
                    <div className="text-sm text-gray-400">Products with EAN: {stats.products_with_ean}</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-400 border-b border-[#2a3142]">
                            <tr>
                                <th className="py-2 px-4">Region</th>
                                <th className="py-2 px-4">Product</th>
                                <th className="py-2 px-4">Console</th>
                                <th className="py-2 px-4">Price</th>
                                <th className="py-2 px-4">Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recent_listings.map((item: any, i: number) => (
                                <tr key={i} className="border-b border-[#2a3142] hover:bg-[#2a3142]/50">
                                    <td className="py-2 px-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${item.region === 'NTSC' ? 'bg-blue-900 text-blue-200' :
                                                item.region === 'PAL' ? 'bg-green-900 text-green-200' :
                                                    'bg-red-900 text-red-200'
                                            }`}>
                                            {item.region}
                                        </span>
                                    </td>
                                    <td className="py-2 px-4 font-medium text-white">{item.product_name || item.amazon_title?.substring(0, 40)}</td>
                                    <td className="py-2 px-4 text-gray-400">{item.console_name}</td>
                                    <td className="py-2 px-4 text-[#ff6600] font-bold">
                                        {item.price} {item.currency}
                                    </td>
                                    <td className="py-2 px-4">
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                                            View
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, highlight = false }: any) {
    return (
        <div className="bg-[#1f2533] p-6 rounded border border-[#2a3142]">
            <div className="text-gray-400 text-sm mb-1">{label}</div>
            <div className={`text-2xl font-bold ${highlight ? 'text-[#ff6600]' : 'text-white'}`}>
                {value !== undefined ? value : '-'}
            </div>
        </div>
    );
}
