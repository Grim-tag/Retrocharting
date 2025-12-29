'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from "html5-qrcode";
import { apiClient } from "@/lib/client";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- TYPES ---
type ScanStatus = 'loading' | 'found' | 'unknown' | 'contributed';

interface ScannedItem {
    ean: string;
    status: ScanStatus;
    timestamp: number;
    product?: any;
    error?: string;
}

// --- MAIN PAGE COMPONENT ---
export default function BatchScanPage({ params }: { params: { lang: string } }) {
    const router = useRouter();
    const [items, setItems] = useState<ScannedItem[]>([]);
    const [scannerActive, setScannerActive] = useState(true);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    // Contribution Modal State
    const [selectedItem, setSelectedItem] = useState<ScannedItem | null>(null);

    // Refs
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const mountedRef = useRef(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);


    // --- 1. SCANNER LOGIC ---
    useEffect(() => {
        mountedRef.current = true;

        // Init Audio
        audioRef.current = new Audio('/sounds/beep.mp3'); // We'll need to make sure this exists or gracefully fail
        // Fallback or synthesised beep could be added here if no file

        startScanner();

        return () => {
            mountedRef.current = false;
            stopScanner();
        };
    }, []);

    const playBeep = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(() => { });
        } else {
            // Fallback synth beep?
            try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = ctx.createOscillator();
                osc.connect(ctx.destination);
                osc.frequency.value = 800;
                osc.start();
                setTimeout(() => osc.stop(), 100);
            } catch (e) { }
        }
    };

    const startScanner = async () => {
        // Permissions check
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setPermissionError("Votre navigateur ne supporte pas la caméra.");
            return;
        }

        try {
            if (scannerRef.current) await stopScanner();

            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => handleScan(decodedText),
                () => { } // Ignore errors
            );
        } catch (err: any) {
            console.error("Scanner Start Error", err);
            if (mountedRef.current) {
                setPermissionError(`${err.name}: ${err.message || "Erreur inconnue"}`);
            }
        }
    };

    const requestManualPermission = async () => {
        try {
            setPermissionError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(t => t.stop()); // Close immediately
            startScanner(); // Retry library start
        } catch (err: any) {
            setPermissionError(`Erreur directe: ${err.name} - ${err.message}`);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (e) { /* ignore */ }
            scannerRef.current = null;
        }
    };

    // --- 2. BUSINESS LOGIC ---

    const handleScan = (ean: string) => {
        // Debounce: verify if we JUST scanned this item (last 2 seconds)
        // OR simply if it's already in the list to avoid duplicates? 
        // Let's avoid duplicates for this session.
        setItems(prev => {
            if (prev.find(i => i.ean === ean)) return prev; // Already in list

            playBeep();

            // Add new item
            const newItem: ScannedItem = { ean, status: 'loading', timestamp: Date.now() };

            // Trigger fetch
            fetchProduct(ean);

            return [newItem, ...prev];
        });
    };

    const fetchProduct = async (ean: string) => {
        try {
            // Search by EAN directly
            const res = await apiClient.get(`/products/isbn/${ean}`);
            // If success
            updateItemStatus(ean, 'found', res.data);
        } catch (e: any) {
            // If 404
            console.log("Product not found", e);
            updateItemStatus(ean, 'unknown');
        }
    };

    const updateItemStatus = (ean: string, status: ScanStatus, product?: any) => {
        setItems(prev => prev.map(item =>
            item.ean === ean ? { ...item, status, product } : item
        ));
    };

    // --- 3. CONTRIBUTION LOGIC ---

    // Called when "Save" is clicked in modal
    const handleContribute = async (formData: FormData) => {
        try {
            const res = await apiClient.post(`/products/contribute`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const { product, gamification } = res.data;

            // Update item in list
            const ean = formData.get('ean') as string;
            setItems(prev => prev.map(item =>
                item.ean === ean ? { ...item, status: 'contributed', product } : item
            ));

            // Show alert or toast
            const pts = gamification?.points_earned || 0;
            alert(`Jeu ajouté ! +${pts} XP`);

            setSelectedItem(null); // Close modal
        } catch (e) {
            alert("Erreur lors de l'ajout.");
        }
    };


    // --- RENDER ---
    return (
        <div className="flex flex-col h-screen bg-black text-white overflow-hidden">

            {/* TOP: CAMERA VIEWPORT (40%) */}
            <div className="relative h-[40%] bg-gray-900 border-b border-gray-800">
                {permissionError ? (
                    <div className="h-full flex items-center justify-center text-center p-6 bg-gray-900 z-50 absolute inset-0">
                        <div className="max-w-xs">
                            <p className="text-red-500 text-4xl mb-4">🔒 Caméra Bloquée</p>

                            <div className="bg-gray-800 p-4 rounded-lg text-left mb-6 border border-gray-700">
                                <p className="text-white font-bold mb-2 text-sm">Comment débloquer :</p>
                                <ol className="list-decimal list-inside text-gray-300 text-xs space-y-2">
                                    <li>Cliquez sur l'icône 🔒 ou ⚙️ dans la barre d'adresse (en haut).</li>
                                    <li>Cherchez "Caméra" ou "Permissions".</li>
                                    <li>Choisissez <strong>Autoriser</strong> (Allow).</li>
                                    <li>Cliquez sur "Recharger" ci-dessous.</li>
                                </ol>
                            </div>

                            <p className="text-gray-500 text-[10px] font-mono mb-4 break-words">
                                Code erreur: {permissionError}
                            </p>

                            <button
                                onClick={() => window.location.reload()}
                                className="bg-blue-600 hover:bg-blue-500 w-full text-white px-4 py-3 rounded-lg font-bold shadow-lg"
                            >
                                🔄 Recharger la page
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div id="reader" className="w-full h-full object-cover"></div>
                        <div className="absolute inset-0 pointer-events-none border-2 border-red-500/50 m-12 rounded-lg opacity-50 pulse-ring"></div>
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-[10px] text-green-400 font-mono">
                            LIVE
                        </div>
                    </>
                )}

                {/* Close Button */}
                <Link href={`/${params.lang}`} className="absolute top-4 left-4 bg-black/50 p-2 rounded-full z-20">
                    ✕
                </Link>
            </div>

            {/* BOTTOM: SESSION LIST (60%) */}
            <div className="flex-1 bg-gray-950 flex flex-col min-h-0">
                <div className="p-3 bg-gray-900 border-b border-gray-800 flex justify-between items-center shadow-lg z-10">
                    <h2 className="font-bold text-gray-200 text-sm">Session ({items.length})</h2>
                    {items.length > 0 && (
                        <button
                            onClick={() => router.push(`/${params.lang}/collection`)}
                            className="text-xs bg-blue-600 px-3 py-1.5 rounded font-bold hover:bg-blue-500"
                        >
                            Terminer
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {items.length === 0 && (
                        <div className="text-center text-gray-600 mt-10">
                            <p className="text-4xl mb-2">⬆️</p>
                            <p className="text-sm">Scannez un code-barres pour commencer.</p>
                        </div>
                    )}

                    {items.map((item) => (
                        <div key={item.ean} className="bg-gray-900 rounded-lg p-3 flex gap-3 border border-gray-800 animate-in fade-in slide-in-from-top-2">
                            {/* Status Icon */}
                            <div className="flex-shrink-0 pt-1">
                                {item.status === 'loading' && <span className="animate-spin block">⏳</span>}
                                {item.status === 'found' && <span>✅</span>}
                                {item.status === 'contributed' && <span>🏆</span>}
                                {item.status === 'unknown' && <span className="text-red-500">❓</span>}
                            </div>

                            <div className="flex-1 min-w-0">
                                {item.status === 'loading' && (
                                    <p className="text-gray-400 text-sm italic">Recherche...</p>
                                )}

                                {(item.status === 'found' || item.status === 'contributed') && item.product && (
                                    <div>
                                        <p className="font-bold text-white text-sm truncate">{item.product.product_name}</p>
                                        <p className="text-gray-500 text-xs">{item.product.console_name}</p>
                                    </div>
                                )}

                                {item.status === 'unknown' && (
                                    <div>
                                        <p className="font-mono text-orange-400 text-sm">{item.ean}</p>
                                        <p className="text-gray-500 text-xs mb-2">Jeu inconnu.</p>
                                        <button
                                            onClick={() => setSelectedItem(item)}
                                            className="text-xs bg-gray-800 border border-gray-600 px-3 py-1.5 rounded text-white hover:bg-gray-700 w-full text-center"
                                        >
                                            + Ajouter (+50 XP)
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Image Thumbnail if found */}
                            {(item.status === 'found' || item.status === 'contributed') && item.product && item.product.image_url && (
                                <img src={item.product.image_url} className="w-12 h-16 object-cover rounded bg-gray-800" alt="" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* CONTRIBUTION MODAL */}
            {selectedItem && (
                <ContributeModal
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onSubmit={handleContribute}
                />
            )}

        </div>
    );
}


// --- SUB-COMPONENT: CONTRIBUTION FORM ---
function ContributeModal({ item, onClose, onSubmit }: { item: ScannedItem, onClose: () => void, onSubmit: (fd: FormData) => void }) {
    const [name, setName] = useState("");
    const [consoleName, setConsoleName] = useState("");
    const [front, setFront] = useState<File | null>(null);
    const [back, setBack] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = () => {
        if (!name || !consoleName) return;
        setLoading(true);

        const fd = new FormData();
        fd.append('ean', item.ean);
        fd.append('product_name', name);
        fd.append('console_name', consoleName);
        if (front) fd.append('front_image', front);
        if (back) fd.append('back_image', back);

        onSubmit(fd);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl w-full max-w-sm border border-orange-500/30 flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-800 bg-gray-900 sticky top-0 rounded-t-xl z-10 flex justify-between items-center">
                    <h3 className="font-bold text-white">Ajouter ce jeu</h3>
                    <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto">
                    <div className="bg-orange-900/20 p-3 rounded text-center">
                        <p className="text-orange-300 text-xs font-mono mb-1">{item.ean}</p>
                        <p className="text-gray-400 text-xs">Remplissez les infos pour gagner des points !</p>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Nom du Jeu *</label>
                        <input className="w-full bg-black border border-gray-700 rounded p-3 text-white outline-none focus:border-blue-500" placeholder="Ex: Halo" value={name} onChange={e => setName(e.target.value)} />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Console *</label>
                        <input className="w-full bg-black border border-gray-700 rounded p-3 text-white outline-none focus:border-blue-500" placeholder="Ex: Xbox" value={consoleName} onChange={e => setConsoleName(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <PhotoInput label="Face Avant" file={front} setFile={setFront} />
                        <PhotoInput label="Face Arrière" file={back} setFile={setBack} />
                    </div>
                </div>

                <div className="p-4 border-t border-gray-800 mt-auto">
                    <button
                        disabled={!name || !consoleName || loading}
                        onClick={handleSubmit}
                        className={`w-full py-3 rounded font-bold ${(!name || !consoleName) ? 'bg-gray-800 text-gray-500' : 'bg-green-600 text-white'}`}
                    >
                        {loading ? 'Envoi...' : 'Valider (+50 XP)'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function PhotoInput({ label, file, setFile }: { label: string, file: File | null, setFile: (f: File | null) => void }) {
    return (
        <div>
            <label className="text-xs text-gray-500 block mb-1 text-center">{label}</label>
            <label className={`block w-full aspect-square rounded border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden relative ${file ? 'border-green-500 bg-black' : 'border-gray-700 bg-gray-800'}`}>
                {file ? (
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-gray-500 text-2xl">📷</span>
                )}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
        </div>
    );
}
