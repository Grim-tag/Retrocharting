"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Expanded Interface including new fields
interface Product {
    id: number;
    product_name: string;
    console_name: string;
    image_url?: string | null;
    loose_price?: number | null;
    cib_price?: number | null;
    new_price?: number | null;
    genre?: string | null;
    description?: string | null;
    publisher?: string | null;
    developer?: string | null;
    ean?: string | null;
    asin?: string | null;
    players?: string | null;
}

interface ProductCatalogProps {
    type: 'game' | 'console' | 'accessory';
    title: string;
}

export default function ProductCatalog({ type, title }: ProductCatalogProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [token, setToken] = useState<string>('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Client-side only token access
    useEffect(() => {
        const t = localStorage.getItem('token');
        if (t) setToken(t);
    }, []);

    // Fetch Products
    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/products/?limit=50&type=${type}`;
                if (debouncedSearch) {
                    url += `&search=${encodeURIComponent(debouncedSearch)}`;
                }

                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data);
                }
            } catch (err) {
                console.error("Failed to fetch products for admin", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProducts();
    }, [debouncedSearch, type]);


    const handleEdit = async (product: Product) => {
        // Fetch full product details including description/EAN which might be deferred in list view
        try {
            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/products/${product.id}`;
            const res = await fetch(url);
            if (res.ok) {
                const fullData = await res.json();
                setEditingProduct(fullData);
            } else {
                // Fallback to list data if fetch fails
                setEditingProduct(product);
            }
        } catch (e) {
            setEditingProduct(product);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;
        if (!token) {
            alert("Error: No authentication token found. Please relogin.");
            return;
        }

        try {
            const { updateProduct } = await import('@/lib/api');

            // Sanitize payload
            const payload = {
                ...editingProduct,
                loose_price: editingProduct.loose_price ?? undefined,
                cib_price: editingProduct.cib_price ?? undefined,
                new_price: editingProduct.new_price ?? undefined,
                image_url: editingProduct.image_url ?? undefined,
                genre: editingProduct.genre ?? undefined,
                description: editingProduct.description ?? undefined,
                ean: editingProduct.ean ?? undefined,
                asin: editingProduct.asin ?? undefined,
                publisher: editingProduct.publisher ?? undefined,
                developer: editingProduct.developer ?? undefined,
            };

            const updated = await updateProduct(editingProduct.id, payload as any, token);

            if (updated) {
                // Update local list
                setProducts(products.map(p => p.id === updated.id ? { ...p, ...updated } : p));
                setEditingProduct(null);
            } else {
                alert("Failed to update product");
            }
        } catch (err: any) {
            console.error("Update failed", err);
            const msg = err.response?.data?.detail || err.message || "Unknown error";
            alert(`Update failed: ${msg}`);
        }
    };

    const handleChange = (field: keyof Product, value: any) => {
        if (!editingProduct) return;
        setEditingProduct({ ...editingProduct, [field]: value });
    };

    return (
        <div className="text-white relative">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold uppercase tracking-wider">{title}</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search by Name or ID..."
                        className="bg-[#1f2533] border border-[#2a3142] text-white px-4 py-2 rounded focus:outline-none focus:border-[#ff6600] w-64"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button className="bg-[#ff6600] text-white px-4 py-2 rounded font-bold hover:bg-[#ff8533] transition-colors">
                        Add New
                    </button>
                </div>
            </div>

            <div className="bg-[#1f2533] border border-[#2a3142] rounded overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#2a3142] text-gray-300 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="p-4 border-b border-[#353e54]">ID</th>
                                <th className="p-4 border-b border-[#353e54]">Cover</th>
                                <th className="p-4 border-b border-[#353e54]">Title</th>
                                <th className="p-4 border-b border-[#353e54]">Console</th>
                                <th className="p-4 border-b border-[#353e54] text-right">Loose</th>
                                <th className="p-4 border-b border-[#353e54] text-right">CIB</th>
                                <th className="p-4 border-b border-[#353e54] text-right">New</th>
                                <th className="p-4 border-b border-[#353e54] text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2a3142]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-400">Loading catalog...</td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-400">No products found.</td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className="hover:bg-[#252b3b] transition-colors">
                                        <td className="p-4 text-gray-500 font-mono text-sm">{product.id}</td>
                                        <td className="p-4">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt="" className="w-10 h-10 object-cover rounded border border-gray-700" />
                                            ) : (
                                                <div className="w-10 h-10 bg-gray-800 rounded border border-gray-700 flex items-center justify-center text-xs text-gray-600">N/A</div>
                                            )}
                                        </td>
                                        <td className="p-4 font-bold text-white max-w-xs truncate" title={product.product_name}>
                                            {product.product_name}
                                        </td>
                                        <td className="p-4 text-gray-300 text-sm">
                                            {product.console_name}
                                        </td>
                                        <td className="p-4 text-right font-mono text-[#ff6600]">
                                            {product.loose_price ? `$${product.loose_price.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-4 text-right font-mono text-[#007bff]">
                                            {product.cib_price ? `$${product.cib_price.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-4 text-right font-mono text-[#00ff00]">
                                            {product.new_price ? `$${product.new_price.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="bg-[#2a3142] hover:bg-[#353e54] text-gray-200 px-3 py-1 rounded text-xs border border-[#353e54]"
                                                >
                                                    Edit
                                                </button>
                                                <Link
                                                    href={`/admin/games/${product.id}/listings`}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold"
                                                >
                                                    Listings
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Expanded Edit Modal */}
            {editingProduct && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-[#1f2533] rounded-xl border border-[#2a3142] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-[#2a3142] flex justify-between items-center bg-[#151922]">
                            <div>
                                <h3 className="text-xl font-bold text-white">Edit Product #{editingProduct.id}</h3>
                                <p className="text-xs text-gray-500 mt-1">Make sure to save changes.</p>
                            </div>
                            <button
                                onClick={() => setEditingProduct(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Product Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none"
                                        value={editingProduct.product_name || ''}
                                        onChange={e => handleChange('product_name', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Console</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none"
                                        value={editingProduct.console_name || ''}
                                        onChange={e => handleChange('console_name', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Genre</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none"
                                        value={editingProduct.genre || ''}
                                        onChange={e => handleChange('genre', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Publisher</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none"
                                        value={editingProduct.publisher || ''}
                                        onChange={e => handleChange('publisher', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Developer</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none"
                                        value={editingProduct.developer || ''}
                                        onChange={e => handleChange('developer', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">ASIN (Amazon)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none font-mono text-sm"
                                        value={editingProduct.asin || ''}
                                        onChange={e => handleChange('asin', e.target.value)}
                                        placeholder="B0..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">EAN / Barcode</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none font-mono text-sm"
                                        value={editingProduct.ean || ''}
                                        onChange={e => handleChange('ean', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Description</label>
                                <textarea
                                    className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none h-32"
                                    value={editingProduct.description || ''}
                                    onChange={e => handleChange('description', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Image URL</label>
                                <div className="flex gap-4">
                                    <input
                                        type="text"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none"
                                        value={editingProduct.image_url || ''}
                                        onChange={e => handleChange('image_url', e.target.value)}
                                    />
                                    {editingProduct.image_url && (
                                        <img src={editingProduct.image_url} alt="Preview" className="h-10 w-10 object-cover rounded border border-[#333]" />
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#2a3142]">
                                <div>
                                    <label className="block text-xs uppercase text-[#ff6600] font-bold mb-1">Loose Price</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none"
                                        value={editingProduct.loose_price || ''}
                                        onChange={e => handleChange('loose_price', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-[#007bff] font-bold mb-1">CIB Price</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#007bff] outline-none"
                                        value={editingProduct.cib_price || ''}
                                        onChange={e => handleChange('cib_price', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-[#00ff00] font-bold mb-1">New Price</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#00ff00] outline-none"
                                        value={editingProduct.new_price || ''}
                                        onChange={e => handleChange('new_price', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t border-[#2a3142] flex justify-end gap-3 bg-[#151922]">
                            <button
                                type="button"
                                onClick={() => setEditingProduct(null)}
                                className="px-4 py-2 text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-[#ff6600] hover:bg-[#ff8533] text-white px-6 py-2 rounded font-bold"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
