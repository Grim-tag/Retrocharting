
import React, { useState, useEffect } from 'react';
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import { apiClient } from "@/lib/client";
import { useRouter } from 'next/navigation';

interface ScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ScannerModal({ isOpen, onClose }: ScannerModalProps) {
    const [data, setData] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setData(null);
            setError(null);
            setLoading(false);
        }
    }, [isOpen]);

    const handleScan = async (err: any, result: any) => {
        if (result && !data && !loading) {
            const code = result.text;
            setData(code);
            setLoading(true);

            try {
                // Search API for this code
                const res = await apiClient.get(`/products?search=${code}`);
                const products = res.data;

                if (products && products.length > 0) {
                    // Match found! Redirect to first match
                    const product = products[0];
                    onClose();
                    router.push(`/products/${product.id}`);
                } else {
                    setError(`Unknown Game (Code: ${code}). Coming soon: Add it manually!`);
                    setLoading(false);
                    // Clear data after delay to allow rescan?
                    setTimeout(() => setData(null), 3000);
                }
            } catch (e) {
                console.error("Scan Error", e);
                setError("Network Error checking code.");
                setLoading(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white p-2 bg-gray-800/50 rounded-full hover:bg-gray-700"
            >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="w-full max-w-sm bg-black rounded-xl overflow-hidden relative border border-gray-700 shadow-2xl">
                {/* Camera View */}
                {!loading && !error && (
                    <div className="relative aspect-[4/3]">
                        <BarcodeScannerComponent
                            width="100%"
                            height="100%"
                            onUpdate={handleScan}
                            videoConstraints={{ facingMode: 'environment' }}
                        />
                        {/* Overlay Box */}
                        <div className="absolute inset-0 border-2 border-red-500/50 m-12 rounded"></div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <p className="text-white/80 font-bold bg-black/50 px-2 rounded">SCAN BARCODE</p>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && !error && (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <h3 className="text-white text-lg font-bold">Checking Database...</h3>
                        <p className="text-gray-400 font-mono mt-2">{data}</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="p-8 text-center bg-gray-900">
                        <div className="text-red-500 text-4xl mb-4">⚠️</div>
                        <h3 className="text-white text-lg font-bold mb-2">Not Found</h3>
                        <p className="text-gray-400 mb-6">{error}</p>
                        <button
                            onClick={() => { setData(null); setError(null); setLoading(false); }}
                            className="bg-white text-black px-6 py-2 rounded font-bold hover:bg-gray-200"
                        >
                            Scan Again
                        </button>
                    </div>
                )}
            </div>

            <p className="text-gray-500 mt-8 text-sm text-center max-w-xs">
                Point any retro game barcode at the camera. Works best with good lighting.
            </p>
        </div>
    );
}
