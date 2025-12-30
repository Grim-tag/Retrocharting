"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Listing {
    id: number;
    source: string;
    title: string;
    price: number;
    currency: string;
    condition: string;
    url: string;
    image_url?: string;
    is_good_deal?: boolean;
    seller_name?: string;
}

export default function AdminListingsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id;

    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        url: '',
        price: '',
        currency: 'EUR',
        source: 'eBay',
        condition: 'Used',
        seller: ''
    });

    const fetchListings = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/${id}/listings`);
            if (res.ok) {
                const data = await res.json();
                setListings(data.data || data); // handle standard or wrapped response
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, [id]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('rc_token'); // Use auth
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/${id}/listings/manual`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    url: formData.url,
                    price: parseFloat(formData.price),
                    currency: formData.currency,
                    source: formData.source,
                    condition: formData.condition,
                    seller_name: formData.seller
                })
            });

            if (res.ok) {
                alert("Listing added!");
                setFormData({ ...formData, url: '', price: '' });
                fetchListings(); // Refresh
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail || 'Failed'}`);
            }
        } catch (e) {
            alert("Error adding listing");
        }
    };

    return (
        <div className="text-white p-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/games" className="text-gray-400 hover:text-white">&larr; Back to Catalog</Link>
                <h1 className="text-2xl font-bold uppercase tracking-wider">Manage Listings (ID: {id})</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="bg-[#1f2533] p-6 rounded border border-[#2a3142] h-fit">
                    <h3 className="text-xl font-bold mb-4 text-[#ff6600]">Add Listing</h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase text-gray-400 mb-1">URL</label>
                            <input
                                required
                                type="url"
                                className="w-full bg-[#0f121e] border border-[#2a3142] text-white p-2 rounded"
                                value={formData.url}
                                onChange={e => setFormData({ ...formData, url: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-400 mb-1">Price</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    className="w-full bg-[#0f121e] border border-[#2a3142] text-white p-2 rounded"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-400 mb-1">Currency</label>
                                <select
                                    className="w-full bg-[#0f121e] border border-[#2a3142] text-white p-2 rounded"
                                    value={formData.currency}
                                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                >
                                    <option value="EUR">EUR</option>
                                    <option value="USD">USD</option>
                                    <option value="GBP">GBP</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-400 mb-1">Source</label>
                                <select
                                    className="w-full bg-[#0f121e] border border-[#2a3142] text-white p-2 rounded"
                                    value={formData.source}
                                    onChange={e => setFormData({ ...formData, source: e.target.value })}
                                >
                                    <option value="eBay">eBay</option>
                                    <option value="Vinted">Vinted</option>
                                    <option value="Leboncoin">Leboncoin</option>
                                    <option value="Rakuten">Rakuten</option>
                                    <option value="Manual">Manual</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-400 mb-1">Condition</label>
                                <select
                                    className="w-full bg-[#0f121e] border border-[#2a3142] text-white p-2 rounded"
                                    value={formData.condition}
                                    onChange={e => setFormData({ ...formData, condition: e.target.value })}
                                >
                                    <option value="Used">Used</option>
                                    <option value="New">New</option>
                                    <option value="CIB">CIB</option>
                                    <option value="Loose">Loose</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-400 mb-1">Seller (Optional)</label>
                            <input
                                type="text"
                                className="w-full bg-[#0f121e] border border-[#2a3142] text-white p-2 rounded"
                                value={formData.seller}
                                onChange={e => setFormData({ ...formData, seller: e.target.value })}
                            />
                        </div>

                        <button type="submit" className="w-full bg-[#ff6600] hover:bg-[#ff8533] text-white font-bold py-2 rounded transition-colors">
                            Add Listing
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2 bg-[#1f2533] border border-[#2a3142] rounded overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-[#2a3142] text-gray-300 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Source</th>
                                <th className="p-4">Title</th>
                                <th className="p-4 text-right">Price</th>
                                <th className="p-4 text-center">Deal?</th>
                                <th className="p-4">Link</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2a3142] text-sm text-gray-300">
                            {loading ? (
                                <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
                            ) : listings.length === 0 ? (
                                <tr><td colSpan={5} className="p-4 text-center">No listings found.</td></tr>
                            ) : (
                                listings.map(l => (
                                    <tr key={l.id} className="hover:bg-[#252b3b]">
                                        <td className="p-4">{l.source}</td>
                                        <td className="p-4 max-w-xs truncate" title={l.title}>{l.title}</td>
                                        <td className="p-4 text-right font-bold text-white">
                                            {l.price.toFixed(2)} {l.currency}
                                        </td>
                                        <td className="p-4 text-center">
                                            {l.is_good_deal ? (
                                                <span className="text-green-500 font-bold">YES</span>
                                            ) : "-"}
                                        </td>
                                        <td className="p-4">
                                            <a href={l.url} target="_blank" className="text-blue-400 hover:underline">Open</a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
