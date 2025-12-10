'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addToCollection, Product } from '@/lib/api';

export default function AddToWishlistButton({ product, lang, label }: { product: Product, lang: string, label: string }) {
    const { isAuthenticated, token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleAdd = async () => {
        if (!isAuthenticated) {
            alert("Please log in to use the wishlist.");
            return;
        }
        if (!token) return;

        setLoading(true);
        try {
            // Use 'WISHLIST' as the condition to distinguish it
            await addToCollection(token, product.id, 'WISHLIST', 'Added via Wishlist Button');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        } catch (error: any) {
            alert(error.message || "Failed to add to wishlist.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleAdd}
            disabled={loading || success}
            className={`flex-1 font-bold py-3 px-6 rounded transition-colors uppercase tracking-wide border border-[#353e54] ${success
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-[#2a3142] hover:bg-[#353e54] text-white'
                }`}
        >
            {loading ? 'Adding...' : success ? 'Added!' : label}
        </button>
    );
}
