'use client';

import { useState } from 'react';
import { HeartIcon, PlusCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '@/context/AuthContext';
import { addToCollection } from '@/lib/api';

interface TableActionsProps {
    productId: number;
    productName: string;
}

export default function TableActions({ productId, productName }: TableActionsProps) {
    const { isAuthenticated, token } = useAuth();

    // Local state for immediate feedback
    // In a real app, this should be synced with a global store or query cache
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [isInCollection, setIsInCollection] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);

    const handleAction = async (type: 'WISHLIST' | 'COLLECTION') => {
        if (!isAuthenticated || !token) {
            // Optional: You could trigger a login modal here
            alert("Please log in to manage your collection.");
            return;
        }

        setLoading(type);
        try {
            if (type === 'WISHLIST') {
                // If already wishlisted, we technically need a 'removeFromCollection' API
                // For now, we'll just handle adding to stay safe
                if (!isWishlisted) {
                    await addToCollection(token, productId, 'WISHLIST', `Added from catalog: ${productName}`);
                    setIsWishlisted(true);
                }
            } else {
                if (!isInCollection) {
                    // Default to LOOSE for quick add? Or maybe open a modal?
                    // Review request: "Add button directly integrated". 
                    // Let's assume simplest flow: Add as "LOOSE" or generic for now, 
                    // or just "LOOSE" as it's the base.
                    await addToCollection(token, productId, 'LOOSE');
                    setIsInCollection(true);
                }
            }
        } catch (error) {
            console.error(error);
            alert("Failed to update collection.");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex items-center justify-end gap-2">
            {/* Wishlist Button */}
            <button
                onClick={(e) => { e.preventDefault(); handleAction('WISHLIST'); }}
                disabled={!!loading}
                className={`p-1.5 rounded-full transition-colors ${isWishlisted
                        ? 'text-red-500 bg-red-500/10'
                        : 'text-gray-500 hover:text-red-400 hover:bg-[#2a3142]'
                    }`}
                title="Add to Wishlist"
            >
                {isWishlisted ? <HeartIconSolid className="w-5 h-5" /> : <HeartIcon className="w-5 h-5" />}
            </button>

            {/* Collection Button */}
            <button
                onClick={(e) => { e.preventDefault(); handleAction('COLLECTION'); }}
                disabled={!!loading}
                className={`p-1.5 rounded-full transition-colors ${isInCollection
                        ? 'text-green-500 bg-green-500/10'
                        : 'text-gray-500 hover:text-green-400 hover:bg-[#2a3142]'
                    }`}
                title="Add to Collection"
            >
                {isInCollection ? <CheckCircleIconSolid className="w-5 h-5" /> : <PlusCircleIcon className="w-5 h-5" />}
            </button>
        </div>
    );
}
