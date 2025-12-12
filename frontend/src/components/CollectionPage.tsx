'use client';

import { useAuth } from '@/context/AuthContext';
import { CollectionItem, getCollection, deleteFromCollection } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CollectionItemModal from './CollectionItemModal';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { formatPrice, convertPrice } from '@/lib/currency';
import { useCurrency } from '@/context/CurrencyContext';

export default function CollectionPage({ dict, lang }: { dict: any; lang: string }) {
    const { user, token, isAuthenticated } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<CollectionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editItem, setEditItem] = useState<CollectionItem | null>(null);

    const { currency } = useCurrency();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push(lang === 'en' ? '/' : `/${lang}`);
        }
    }, [isAuthenticated, loading, lang, router]);

    useEffect(() => {
        if (token) {
            getCollection(token).then(data => {
                setItems(data);
                setLoading(false);
            });
        } else {
            setTimeout(() => setLoading(false), 1000);
        }
    }, [token]);

    const handleDelete = async (id: number) => {
        if (confirm("Remove this item?")) {
            const success = await deleteFromCollection(token!, id);
            if (success) {
                setItems(items.filter(i => i.id !== id));
            }
        }
    };

    const handleUpdate = (updatedItem: CollectionItem) => {
        setItems(items.map(i => i.id === updatedItem.id ? updatedItem : i));
    };

    const [activeTab, setActiveTab] = useState<'collection' | 'wishlist'>('collection');

    const collectionItems = items.filter(i => i.condition !== 'WISHLIST');
    const wishlistItems = items.filter(i => i.condition === 'WISHLIST');

    const displayedItems = activeTab === 'collection' ? collectionItems : wishlistItems;

    const totalValueUSD = displayedItems.reduce((sum, item) => sum + (item.estimated_value || 0), 0);
    // Convert USD Total to Selected Currency
    const totalValueLocalized = convertPrice(totalValueUSD, currency);
    const totalItems = displayedItems.length;

    if (loading) return <div className="min-h-screen bg-[#1f2533] flex items-center justify-center text-white">Loading...</div>;

    if (!isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-[#1f2533] text-white">
            <CollectionItemModal
                isOpen={!!editItem}
                item={editItem}
                onClose={() => setEditItem(null)}
                // Optimistic update
                onSave={handleUpdate}
                lang={lang}
            />

            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* Profile Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                    <div className="flex items-center gap-4">
                        <img src={user?.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-[#ff6600]" />
                        <div>
                            <h1 className="text-2xl font-bold">{user?.full_name || 'My Profile'}</h1>
                            <p className="text-gray-400 text-sm">{user?.email}</p>
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="bg-[#2a3142] rounded-lg p-4 flex gap-8 items-center border border-[#3a4152] shadow-lg">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-[#ff6600]">{totalItems}</div>
                            <div className="text-xs uppercase tracking-wide text-gray-400">{activeTab === 'collection' ? 'Games Owned' : 'Wished'}</div>
                        </div>
                        <div className="w-px h-10 bg-[#3a4152]"></div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-400">
                                {formatPrice(totalValueUSD, currency)}
                            </div>
                            <div className="text-xs uppercase tracking-wide text-gray-400">Est. Value</div>
                        </div>
                    </div>
                </div>

                {/* Tabs & Actions */}
                <div className="flex items-center justify-between border-b border-[#3a4152] mb-6">
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('collection')}
                            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'collection'
                                    ? 'border-[#ff6600] text-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            Collection ({collectionItems.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('wishlist')}
                            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'wishlist'
                                    ? 'border-[#ff6600] text-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            Wishlist ({wishlistItems.length})
                        </button>
                    </div>

                    {activeTab === 'collection' && (
                        <button
                            onClick={() => router.push(`/${lang}/import`)}
                            className="text-gray-400 hover:text-white flex items-center gap-2 text-sm pb-4"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                            Import CSV
                        </button>
                    )}
                </div>

                {/* Grid */}
                {displayedItems.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 bg-[#2a3142]/20 rounded-lg border border-dashed border-[#3a4152]">
                        <p className="text-xl font-medium mb-2">
                            {activeTab === 'collection' ? "Your collection is empty." : "Your wishlist is empty."}
                        </p>
                        <p className="text-sm">
                            {activeTab === 'collection'
                                ? "Start adding games you own to track your portfolio!"
                                : "Browse the catalog and add games you want to buy!"}
                        </p>
                        <button
                            onClick={() => router.push(`/${lang}/games`)}
                            className="mt-6 bg-[#ff6600] text-white px-6 py-2 rounded-full font-bold hover:bg-[#e65c00] transition-colors"
                        >
                            Browse Games
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-[#2a3142] rounded-lg shadow border border-[#3a4152]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#1a202c] text-gray-400 text-xs uppercase tracking-wider">
                                    <th className="p-4">Game</th>
                                    <th className="p-4">Console</th>
                                    <th className="p-4">Condition</th>
                                    {activeTab === 'collection' && <th className="p-4 text-right">Paid</th>}
                                    <th className="p-4 text-right">Value</th>
                                    {activeTab === 'collection' && <th className="p-4 text-right">Profit</th>}
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#3a4152]">
                                {displayedItems.map(item => {
                                    const valueUSD = item.estimated_value || 0;
                                    const paidUSD = item.paid_price;
                                    const profitUSD = paidUSD !== null && paidUSD !== undefined ? valueUSD - paidUSD : null;

                                    return (
                                        <tr key={item.id} className="hover:bg-[#32394d] transition-colors">
                                            <td className="p-4 flex items-center gap-3">
                                                <div
                                                    onClick={() => router.push(`/${lang}/games/${item.console_name.toLowerCase().replace(/ /g, '-')}/${item.product_name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '')}-${item.product_id}`)}
                                                    className="flex items-center gap-3 cursor-pointer group"
                                                >
                                                    {item.image_url ? (
                                                        <img src={item.image_url} className="w-10 h-10 object-cover rounded group-hover:opacity-80 transition-opacity" />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-500">?</div>
                                                    )}
                                                    <span className="font-medium text-white group-hover:text-[#ff6600] transition-colors">{item.product_name}</span>
                                                </div>
                                                {item.user_images && <span className="text-[10px] bg-gray-700 px-1 rounded" title="Initial Import">☁️</span>}
                                            </td>
                                            <td className="p-4 text-gray-300">{item.console_name}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold 
                                                    ${item.condition === 'NEW' ? 'bg-green-900 text-green-300' :
                                                        item.condition === 'CIB' ? 'bg-blue-900 text-blue-300' :
                                                            item.condition === 'WISHLIST' ? 'bg-purple-900 text-purple-300' :
                                                                'bg-gray-700 text-gray-300'}`}>
                                                    {item.condition}
                                                </span>
                                            </td>
                                            {activeTab === 'collection' && (
                                                <td className="p-4 text-right font-mono text-gray-300">
                                                    {formatPrice(paidUSD, currency)}
                                                </td>
                                            )}
                                            <td className="p-4 text-right font-mono text-green-400">
                                                {formatPrice(valueUSD, currency)}
                                            </td>
                                            {activeTab === 'collection' && (
                                                <td className="p-4 text-right font-mono">
                                                    {profitUSD !== null ? (
                                                        <span className={profitUSD >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                            {profitUSD > 0 ? '+' : ''}{formatPrice(Math.abs(profitUSD), currency)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-600">-</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setEditItem(item)}
                                                        className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                                                        title="Edit Item"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1.5 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                                                        title="Delete Item"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
