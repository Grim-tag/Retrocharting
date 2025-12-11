"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Types (simplified for admin view)
interface Product {
    id: number;
    product_name: string;
    console_name: string;
    image_url: string | null;
    loose_price: number | null;
    cib_price: number | null;
    new_price: number | null;
    genre: string | null;
}

export default function AdminGamesPage() {
    const [games, setGames] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [editingGame, setEditingGame] = useState<Product | null>(null);
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

    // Fetch Games
    useEffect(() => {
        const fetchGames = async () => {
            setIsLoading(true);
            try {
                // Determine URL based on search
                let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/products/?limit=50`;
                if (debouncedSearch) {
                    url += `&search=${encodeURIComponent(debouncedSearch)}`;
                }

                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setGames(data);
                }
            } catch (err) {
                console.error("Failed to fetch games for admin", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGames();
    }, [debouncedSearch]);


    const handleEdit = (game: Product) => {
        setEditingGame(game);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGame || !token) return;

        try {
            const { updateProduct } = await import('@/lib/api');

            // Sanitize data: convert null to undefined to match API types
            const payload = {
                ...editingGame,
                loose_price: editingGame.loose_price ?? undefined,
                cib_price: editingGame.cib_price ?? undefined,
                new_price: editingGame.new_price ?? undefined,
                image_url: editingGame.image_url ?? undefined,
                genre: editingGame.genre ?? undefined,
            };

            const updated = await updateProduct(editingGame.id, payload as any, token);

            if (updated) {
                // Merge updated data back into local state
                const updatedLocal: Product = {
                    ...updated,
                    loose_price: updated.loose_price ?? null,
                    cib_price: updated.cib_price ?? null,
                    new_price: updated.new_price ?? null,
                    image_url: updated.image_url ?? null,
                    console_name: updated.console_name ?? '',
                    product_name: updated.product_name ?? '',
                    genre: updated.genre ?? null
                };
                setGames(games.map(g => g.id === updated.id ? updatedLocal : g));
                setEditingGame(null);
            } else {
                alert("Failed to update product");
            }
        } catch (err) {
            console.error("Update failed", err);
            alert("Update failed");
        }
    };

    const handleChange = (field: keyof Product, value: any) => {
        if (!editingGame) return;
        setEditingGame({ ...editingGame, [field]: value });
    };

    return (
        <div className="text-white relative">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold uppercase tracking-wider">Games Catalog</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search games..."
                        className="bg-[#1f2533] border border-[#2a3142] text-white px-4 py-2 rounded focus:outline-none focus:border-[#ff6600] w-64"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button className="bg-[#ff6600] text-white px-4 py-2 rounded font-bold hover:bg-[#ff8533] transition-colors">
                        Add New Game
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
                            ) : games.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-400">No games found.</td>
                                </tr>
                            ) : (
                                games.map((game) => (
                                    <tr key={game.id} className="hover:bg-[#252b3b] transition-colors">
                                        <td className="p-4 text-gray-500 font-mono text-sm">{game.id}</td>
                                        <td className="p-4">
                                            {game.image_url ? (
                                                <img src={game.image_url} alt="" className="w-10 h-10 object-cover rounded border border-gray-700" />
                                            ) : (
                                                <div className="w-10 h-10 bg-gray-800 rounded border border-gray-700 flex items-center justify-center text-xs text-gray-600">N/A</div>
                                            )}
                                        </td>
                                        <td className="p-4 font-bold text-white max-w-xs truncate" title={game.product_name}>
                                            {game.product_name}
                                        </td>
                                        <td className="p-4 text-gray-300 text-sm">
                                            {game.console_name}
                                        </td>
                                        <td className="p-4 text-right font-mono text-[#ff6600]">
                                            {game.loose_price ? `$${game.loose_price.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-4 text-right font-mono text-[#007bff]">
                                            {game.cib_price ? `$${game.cib_price.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-4 text-right font-mono text-[#00ff00]">
                                            {game.new_price ? `$${game.new_price.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    onClick={() => handleEdit(game)}
                                                    className="bg-[#2a3142] hover:bg-[#353e54] text-gray-200 px-3 py-1 rounded text-xs border border-[#353e54]"
                                                >
                                                    Edit
                                                </button>
                                                <Link
                                                    href={`/admin/games/${game.id}/listings`}
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

            {/* Edit Modal */}
            {editingGame && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-[#1f2533] rounded-xl border border-[#2a3142] shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-[#2a3142] flex justify-between items-center bg-[#151922]">
                            <h3 className="text-xl font-bold text-white">Edit Game</h3>
                            <button
                                onClick={() => setEditingGame(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Product Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none"
                                    value={editingGame.product_name || ''}
                                    onChange={e => handleChange('product_name', e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Console</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none"
                                        value={editingGame.console_name || ''}
                                        onChange={e => handleChange('console_name', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Genre</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none"
                                        value={editingGame.genre || ''}
                                        onChange={e => handleChange('genre', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Image URL</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none"
                                    value={editingGame.image_url || ''}
                                    onChange={e => handleChange('image_url', e.target.value)}
                                />
                                {editingGame.image_url && (
                                    <img src={editingGame.image_url} alt="Preview" className="h-20 mt-2 rounded border border-[#333]" />
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-[#ff6600] font-bold mb-1">Loose Price</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#ff6600] outline-none"
                                        value={editingGame.loose_price || ''}
                                        onChange={e => handleChange('loose_price', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-[#007bff] font-bold mb-1">CIB Price</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#007bff] outline-none"
                                        value={editingGame.cib_price || ''}
                                        onChange={e => handleChange('cib_price', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-[#00ff00] font-bold mb-1">New Price</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:border-[#00ff00] outline-none"
                                        value={editingGame.new_price || ''}
                                        onChange={e => handleChange('new_price', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[#2a3142] mt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingGame(null)}
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
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
