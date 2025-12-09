"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HealthStats {
    total_products: number;
    missing_images: number;
    missing_descriptions: number;
    missing_prices: number;
    missing_details: number;
    missing_history: number;
    last_activity?: string;
}

interface Product {
    id: number;
    product_name: string;
    console_name: string;
    image_url: string | null;
}

export default function AdminHealthPage() {
    const [stats, setStats] = useState<HealthStats | null>(null);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [items, setItems] = useState<Product[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem('rc_token');
            if (!token) {
                setError("No auth token found. Please log in.");
                return;
            }
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/stats/health`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setStats(await res.json());
                } else {
                    setError(`Failed to load stats: ${res.status}`);
                }
            } catch (err) {
                setError("Network error loading stats.");
            }
        };
        fetchStats();
    }, []);

    const fetchItems = async (type: string) => {
        setSelectedType(type);
        setLoadingItems(true);
        try {
            const token = localStorage.getItem('rc_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/incomplete?type=${type}&limit=50`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setItems(await res.json());
        } finally {
            setLoadingItems(false);
        }
    };

    if (error) return <div className="text-red-500 p-8">{error}</div>;
    if (!stats) return <div className="text-white p-8">Loading stats...</div>;

    const cards = [
        {
            id: 'image',
            title: 'Missing Images',
            count: stats.missing_images,
            color: 'bg-red-500',
            icon: '🖼️'
        },
        {
            id: 'description',
            title: 'Missing Descriptions',
            count: stats.missing_descriptions,
            color: 'bg-yellow-500',
            icon: '📝'
        },
        {
            id: 'price',
            title: 'Missing Prices',
            count: stats.missing_prices,
            color: 'bg-blue-500',
            icon: '💰'
        },
        {
            id: 'details',
            title: 'Missing Details',
            count: stats.missing_details,
            color: 'bg-teal-500',
            icon: 'ℹ️'
        },
        {
            id: 'history',
            title: 'No Price History',
                {
            cards.map(card => {
                const pct = ((card.count / stats.total_products) * 100).toFixed(1);
                const isSelected = selectedType === card.id;
                return (
                    <div
                        key={card.id}
                        onClick={() => fetchItems(card.id)}
                        className={`p-6 rounded border cursor-pointer transition-all ${isSelected ? 'border-white bg-[#2a3142]' : 'border-[#2a3142] bg-[#1f2533] hover:border-gray-500'}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-3xl">{card.icon}</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded text-white ${card.color}`}>
                                {pct}%
                            </span>
                        </div>
                        <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-1">{card.title}</h3>
                        <p className="text-3xl font-bold text-white">{card.count.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-2">items needing attention</p>
                    </div>
                );
            })
        }
            </div >

        {/* List */ }
    {
        selectedType && (
            <div className="bg-[#1f2533] border border-[#2a3142] rounded overflow-hidden">
                <div className="p-4 border-b border-[#2a3142] flex justify-between items-center bg-[#2a3142]">
                    <h3 className="font-bold text-white">
                        Items with Missing {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} (First 50)
                    </h3>
                </div>
                {loadingItems ? (
                    <div className="p-8 text-center text-gray-400">Loading details...</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-[#151922] text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="p-4">ID</th>
                                <th className="p-4">Name</th>
                                <th className="p-4">Console</th>
                                <th className="p-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2a3142] text-sm">
                            {items.map(item => (
                                <tr key={item.id} className="hover:bg-[#252b3b]">
                                    <td className="p-4 text-gray-500">{item.id}</td>
                                    <td className="p-4 font-bold text-white">{item.product_name}</td>
                                    <td className="p-4 text-gray-300">{item.console_name}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-3">
                                            <Link
                                                href={`/admin/games/${item.id}/edit`}
                                                className="text-gray-400 hover:text-[#ff6600] transition-colors"
                                                title="Edit Details"
                                            >
                                                ✎
                                            </Link>
                                            <Link
                                                href={`/admin/games/${item.id}/listings`}
                                                className="text-blue-400 hover:text-white"
                                                title="Manage Listings"
                                            >
                                                Listings
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        )
    }
        </div >
    );
}
