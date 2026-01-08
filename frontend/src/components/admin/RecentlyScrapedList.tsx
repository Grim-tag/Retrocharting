"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRecentlyScrapedProducts } from '@/lib/api';

interface RecentlyScrapedListProps {
    token: string;
    refreshTrigger: number;
}

export default function RecentlyScrapedList({ token, refreshTrigger }: RecentlyScrapedListProps) {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRecent = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const data = await getRecentlyScrapedProducts(10, token);
                setProducts(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchRecent();
    }, [token, refreshTrigger]);

    if (products.length === 0 && !loading) return null;

    return (
        <div className="bg-[#1f2533] border border-[#2a3142] rounded overflow-hidden mb-8">
            <div className="p-4 border-b border-[#2a3142] flex justify-between items-center bg-[#2a3142]">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <span>🕒</span> Recently Updated
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-[#151922] text-gray-400 text-xs uppercase">
                        <tr>
                            <th className="p-3">Time</th>
                            <th className="p-3">ID</th>
                            <th className="p-3">Product</th>
                            <th className="p-3">Console</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a3142] text-sm">
                        {products.map(p => (
                            <tr key={p.id} className="hover:bg-[#252b3b] transition-colors">
                                <td className="p-3 text-gray-400 font-mono text-xs">
                                    {p.last_scraped ? new Date(p.last_scraped).toLocaleTimeString() : '-'}
                                </td>
                                <td className="p-3 text-gray-500">{p.id}</td>
                                <td className="p-3 font-bold text-white max-w-[200px] truncate" title={p.product_name}>
                                    {p.product_name}
                                </td>
                                <td className="p-3 text-gray-400">{p.console_name}</td>
                                <td className="p-3 text-center">
                                    <Link
                                        href={`/admin/games/${p.id}/edit`}
                                        className="text-[#ff6600] hover:text-white text-xs font-bold uppercase"
                                        prefetch={false}
                                    >
                                        Edit
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {loading && products.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-4 text-center text-gray-500">Loading...</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
