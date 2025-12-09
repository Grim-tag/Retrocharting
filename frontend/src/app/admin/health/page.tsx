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
                    <h3 className="font-bold text-white">
                        Items with Missing {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} (First 50)
                    </h3>
                </div >
        {
            loadingItems?(
                    <div className = "p-8 text-center text-gray-400" > Loading details...</div>
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
    )
}
            </div >
        )
    }
        </div >
    );
}
