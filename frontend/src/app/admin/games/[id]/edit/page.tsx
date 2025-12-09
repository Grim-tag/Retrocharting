"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import PriceHistoryChart from '@/components/PriceHistoryChart';

export default function AdminGameEditPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [history, setHistory] = useState([]);
    const [formData, setFormData] = useState({
        product_name: '',
        console_name: '',
        description: '',
        image_url: '',
        publisher: '',
        developer: '',
        genre: '',
        players: '',
        release_date: '',
        loose_price: 0,
        cib_price: 0,
        new_price: 0
    });

    useEffect(() => {
        const fetchProduct = async () => {
            if (!id) return;
            try {
                // Fetch Product
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setFormData({
                        product_name: data.product_name || '',
                        console_name: data.console_name || '',
                        description: data.description || '',
                        image_url: data.image_url || '',
                        publisher: data.publisher || '',
                        developer: data.developer || '',
                        genre: data.genre || '',
                        players: data.players || '',
                        release_date: data.release_date || '',
                        loose_price: data.loose_price || 0,
                        cib_price: data.cib_price || 0,
                        new_price: data.new_price || 0
                    });
                }

                // Fetch History
                const resHistory = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/${id}/history`);
                if (resHistory.ok) {
                    setHistory(await resHistory.json());
                }

            } catch (error) {
                console.error("Failed to load product", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('rc_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert("Product updated successfully!");
                router.push('/admin/health'); // Go back to health or catalog
            } else {
                alert("Failed to update product.");
            }
        } catch (error) {
            console.error("Error updating", error);
            alert("Error updating product.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-white p-8">Loading...</div>;

    return (
        <div className="text-white max-w-4xl mx-auto p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/health" className="text-gray-400 hover:text-white">&larr; Back to Health</Link>
                <h1 className="text-2xl font-bold uppercase tracking-wider">Edit Product (ID: {id})</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-[#1f2533] p-8 rounded border border-[#2a3142] space-y-6">

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs uppercase text-gray-400 mb-1">Product Name</label>
                        <input name="product_name" value={formData.product_name} onChange={handleChange} className="w-full bg-[#0f121e] border border-[#2a3142] p-2 rounded text-white" />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-400 mb-1">Console</label>
                        <input name="console_name" value={formData.console_name} onChange={handleChange} className="w-full bg-[#0f121e] border border-[#2a3142] p-2 rounded text-white" />
                    </div>
                </div>

                {/* Image */}
                <div>
                    <label className="block text-xs uppercase text-gray-400 mb-1">Image URL</label>
                    <div className="flex gap-4">
                        <input name="image_url" value={formData.image_url} onChange={handleChange} className="flex-1 bg-[#0f121e] border border-[#2a3142] p-2 rounded text-white" />
                        {formData.image_url && <img src={formData.image_url} alt="Preview" className="h-10 w-10 object-cover rounded" />}
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs uppercase text-gray-400 mb-1">Description</label>
                    <textarea name="description" rows={5} value={formData.description} onChange={handleChange} className="w-full bg-[#0f121e] border border-[#2a3142] p-2 rounded text-white" />
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs uppercase text-gray-400 mb-1">Publisher</label>
                        <input name="publisher" value={formData.publisher} onChange={handleChange} className="w-full bg-[#0f121e] border border-[#2a3142] p-2 rounded text-white" />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-400 mb-1">Developer</label>
                        <input name="developer" value={formData.developer} onChange={handleChange} className="w-full bg-[#0f121e] border border-[#2a3142] p-2 rounded text-white" />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-400 mb-1">Genre</label>
                        <input name="genre" value={formData.genre} onChange={handleChange} className="w-full bg-[#0f121e] border border-[#2a3142] p-2 rounded text-white" />
                    </div>
                </div>

                {/* Prices */}
                <div className="p-4 bg-[#0f121e] rounded border border-[#2a3142]">
                    <h3 className="text-[#ff6600] font-bold mb-4 text-sm">Base Prices (Overrides Scraper)</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs uppercase text-gray-400 mb-1">Loose</label>
                            <input type="number" step="0.01" name="loose_price" value={formData.loose_price} onChange={handleChange} className="w-full bg-[#1f2533] border border-[#2a3142] p-2 rounded text-white" />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-400 mb-1">CIB</label>
                            <input type="number" step="0.01" name="cib_price" value={formData.cib_price} onChange={handleChange} className="w-full bg-[#1f2533] border border-[#2a3142] p-2 rounded text-white" />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-400 mb-1">New</label>
                            <input type="number" step="0.01" name="new_price" value={formData.new_price} onChange={handleChange} className="w-full bg-[#1f2533] border border-[#2a3142] p-2 rounded text-white" />
                        </div>
                    </div>
                </div>

                {/* Price History Visualization */}
                <div className="p-4 bg-[#0f121e] rounded border border-[#2a3142]">
                    <h3 className="text-white font-bold mb-4 text-sm uppercase">Price History Data</h3>
                    <div className="h-64">
                        {history.length > 0 ? (
                            <PriceHistoryChart history={history} />
                        ) : (
                            <p className="text-gray-500 text-sm">No history data available.</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Link href="/admin/health" className="px-6 py-2 rounded border border-[#2a3142] hover:bg-[#2a3142] transition-colors">
                        Cancel
                    </Link>
                    <button type="submit" disabled={saving} className="px-6 py-2 rounded bg-[#ff6600] hover:bg-[#ff8533] text-white font-bold transition-colors">
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
