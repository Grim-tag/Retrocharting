'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
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
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

    // Contribution Modal State
    const [selectedItem, setSelectedItem] = useState<ScannedItem | null>(null);

    // Refs
    // Note: BrowserMultiFormatReader is stateful for the session
    const codeReader = useRef<BrowserMultiFormatReader | null>(null);
    const mountedRef = useRef(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // --- 1. INITIALIZATION ---
    useEffect(() => {
        mountedRef.current = true;
        // Init audio if possible (browser policy might block auto-creation without interaction, but usually ok inside useEffect)
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio('/sounds/beep.mp3');
        }

        // 1. Initialize Reader
        codeReader.current = new BrowserMultiFormatReader();

        // 2. Load devices
        initScanner();

        return () => {
            mountedRef.current = false;
            stopScanner();
        };
    }, []);

    const playBeep = () => {
        try {
            if (audioRef.current) {
                audioRef.current.play().catch(() => {
                    // Auto-play policy might block this
                });
            } else {
                // Fallback synth
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = ctx.createOscillator();
                osc.connect(ctx.destination);
                osc.frequency.value = 800;
                osc.start();
                setTimeout(() => osc.stop(), 100);
            }
        } catch (e) { }
    };

    const initScanner = async () => {
        try {
            // Check HTTPS
            if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
                throw new Error("HTTPS requis pour la caméra");
            }

            // 1. Request Permission FIRST (vital for mobile)
            // This triggers the browser prompt if not already granted.
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });

            // 2. List devices now that we have permission
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const devices = allDevices.filter(d => d.kind === 'videoinput');
            setVideoDevices(devices);

            // Stop the initial stream, we'll start a new one with the specific device ID
            stream.getTracks().forEach(t => t.stop());

            // 3. Auto-select Back Camera
            let deviceId = devices[0]?.deviceId;
            const backCamera = devices.find(d =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('environment') ||
                d.label.toLowerCase().includes('arrière')
            );
            if (backCamera) deviceId = backCamera.deviceId;

            if (devices.length > 0) {
                setSelectedDeviceId(deviceId || devices[0].deviceId);
                startScanning(deviceId || devices[0].deviceId);
            } else {
                setPermissionError("Aucune caméra détectée (Permission OK pourtant).");
            }

        } catch (err: any) {
            console.error("Init Error", err);
            // Handle specifically NotAllowedError
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionError("Permission caméra refusée. Débloquez-la via l'icône 🔒.");
            } else if (err.name === 'NotFoundError') {
                setPermissionError("Aucune caméra trouvée sur cet appareil.");
            } else {
                setPermissionError(`${err.name}: ${err.message}`);
            }
        }
    };

    const startScanning = async (deviceId: string) => {
        if (!codeReader.current) return;

        try {
            // Reset previous
            codeReader.current.reset();

            // Start Decode
            // decodeFromVideoDevice(deviceId, videoElementId, callback)
            await codeReader.current.decodeFromVideoDevice(
                deviceId,
                'videoElement',
                (result, err) => {
                    if (result) {
                        handleScan(result.getText());
                    }
                    if (err && !(err instanceof NotFoundException)) {
                        // Real error (not just "no code found")
                        console.warn("Scan Error", err);
                    }
                }
            );
            setPermissionError(null);
        } catch (err: any) {
            console.error("Start Error", err);
            setPermissionError(`${err.name}: ${err.message}`);
        }
    };

    const stopScanner = () => {
        if (codeReader.current) {
            codeReader.current.reset();
        }
    };

    const handleNativeScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !codeReader.current) return;

        try {
            // Decode from image file
            const url = URL.createObjectURL(file);
            const result = await codeReader.current.decodeFromImageUrl(url);
            URL.revokeObjectURL(url); // Cleanup

            if (result) {
                handleScan(result.getText());
            }
        } catch (err) {
            alert("Aucun code-barres trouvé dans l'image. Essayez de vous rapprocher.");
        }
    };

    // --- 2. BUSINESS LOGIC ---

    const handleScan = (ean: string) => {
        setItems(prev => {
            // Check duplicates in last 2 seconds to prevent rapid-fire of same code
            if (prev.length > 0 && prev[0].ean === ean && (Date.now() - prev[0].timestamp < 2000)) {
                return prev;
            }
            if (prev.find(i => i.ean === ean)) return prev; // Dedup entire session if desired, currently yes

            playBeep();

            const newItem: ScannedItem = { ean, status: 'loading', timestamp: Date.now() };
            fetchProduct(ean);
            return [newItem, ...prev];
        });
    };

    const fetchProduct = async (ean: string) => {
        try {
            const res = await apiClient.get(`/products/isbn/${ean}`);
            updateItemStatus(ean, 'found', res.data);
        } catch (e: any) {
            updateItemStatus(ean, 'unknown');
        }
    };

    const updateItemStatus = (ean: string, status: ScanStatus, product?: any) => {
        setItems(prev => prev.map(item =>
            item.ean === ean ? { ...item, status, product } : item
        ));
    };

    // --- 3. CONTRIBUTION LOGIC ---
    const handleContribute = async (formData: FormData) => {
        try {
            const res = await apiClient.post(`/products/contribute`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const { product, gamification } = res.data;

            const ean = formData.get('ean') as string;
            setItems(prev => prev.map(item =>
                item.ean === ean ? { ...item, status: 'contributed', product } : item
            ));

            const pts = gamification?.points_earned || 0;
            alert(`Jeu ajouté ! +${pts} XP`);
            setSelectedItem(null);
        } catch (e) {
            alert("Erreur lors de l'ajout.");
        }
    };

    // --- RENDER ---
    return (
        <div className="flex flex-col h-screen bg-black text-white overflow-hidden">

            {/* TOP: CAMERA VIEWPORT (40%) */}
            <div className="relative h-[40%] bg-gray-900 border-b border-gray-800 overflow-hidden">
                <video
                    id="videoElement"
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(1)' }}
                />

                {/* Overlay Elements */}
                {permissionError ? (
                    <div className="absolute inset-0 z-50 bg-gray-900 flex items-center justify-center p-6 text-center">
                        <div className="max-w-xs w-full">
                            <p className="text-red-500 text-4xl mb-4">🔒 Accès Bloqué</p>

                            <div className="bg-red-900/20 border border-red-500/30 p-3 rounded text-left text-xs text-red-200 mb-6">
                                <p className="font-bold mb-1">Dernière chance :</p>
                                <p>Le système (Android/iOS) bloque peut-être Chrome. Essayez de scanner par photo ci-dessous.</p>
                            </div>

                            <label className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg shadow-lg cursor-pointer mb-3 flex items-center justify-center gap-2">
                                <span>📸 Scanner via Photo</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handleNativeScan}
                                />
                            </label>

                            <button onClick={() => window.location.reload()} className="text-gray-500 text-xs underline">Réessayer le Live</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="absolute inset-0 pointer-events-none border-2 border-red-500/50 m-12 rounded-lg opacity-50 pulse-ring"></div>
                        <div className="absolute bottom-2 right-2 flex gap-2 z-10">
                            <span className="px-2 py-1 bg-black/60 rounded text-[10px] text-green-400 font-mono self-center">ZXING LIVE</span>
                            {videoDevices.length > 0 && (
                                <select
                                    className="bg-black/60 text-white text-[10px] rounded px-1 max-w-[150px]"
                                    value={selectedDeviceId}
                                    onChange={(e) => {
                                        setSelectedDeviceId(e.target.value);
                                        startScanning(e.target.value);
                                    }}
                                >
                                    {videoDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Caméra ${d.deviceId.slice(0, 5)}...`}</option>)}
                                </select>
                            )}
                        </div>
                    </>
                )}

                <Link href={`/${params.lang}`} className="absolute top-4 left-4 bg-black/50 p-2 rounded-full z-20">✕</Link>
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
                            <p className="text-sm">Scannez un code-barres.</p>
                        </div>
                    )}
                    {items.map((item) => (
                        <div key={item.ean} className="bg-gray-900 rounded-lg p-3 flex gap-3 border border-gray-800">
                            <div className="flex-shrink-0 pt-1">
                                {item.status === 'loading' && <span className="animate-spin block">⏳</span>}
                                {item.status === 'found' && <span>✅</span>}
                                {item.status === 'contributed' && <span>🏆</span>}
                                {item.status === 'unknown' && <span className="text-red-500">❓</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                                {item.status === 'loading' && <p className="text-gray-400 text-sm italic">Recherche...</p>}
                                {(item.status === 'found' || item.status === 'contributed') && item.product && (
                                    <div>
                                        <p className="font-bold text-white text-sm truncate">{item.product.product_name}</p>
                                        <p className="text-gray-500 text-xs">{item.product.console_name}</p>
                                    </div>
                                )}
                                {item.status === 'unknown' && (
                                    <div>
                                        <p className="font-mono text-orange-400 text-sm">{item.ean}</p>
                                        <p className="text-gray-500 text-xs mb-2">Inconnu</p>
                                        <button onClick={() => setSelectedItem(item)} className="text-xs bg-gray-800 border-gray-600 border px-3 py-1.5 rounded text-white w-full">+ Ajouter</button>
                                    </div>
                                )}
                            </div>
                            {(item.status === 'found' || item.status === 'contributed') && item.product && item.product.image_url && (
                                <img src={item.product.image_url} className="w-12 h-16 object-cover rounded bg-gray-800" alt="" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* CONTRIBUTION MODAL */}
            {selectedItem && (
                <ContributeModal item={selectedItem} onClose={() => setSelectedItem(null)} onSubmit={handleContribute} />
            )}
        </div>
    );
}

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
                <div className="p-4 border-b border-gray-800 bg-gray-900 sticky top-0 rounded-t-xl z-20 flex justify-between">
                    <h3 className="font-bold text-white">Ajouter</h3>
                    <button onClick={onClose}>✕</button>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto">
                    <p className="text-orange-300 text-center font-mono">{item.ean}</p>
                    <input className="w-full bg-black border border-gray-700 rounded p-3 text-white" placeholder="Nom" value={name} onChange={e => setName(e.target.value)} />
                    <input className="w-full bg-black border border-gray-700 rounded p-3 text-white" placeholder="Console" value={consoleName} onChange={e => setConsoleName(e.target.value)} />
                    <div className="grid grid-cols-2 gap-3">
                        <PhotoInput label="Avant" file={front} setFile={setFront} />
                        <PhotoInput label="Arrière" file={back} setFile={setBack} />
                    </div>
                    <button disabled={!name || !consoleName || loading} onClick={handleSubmit} className="w-full bg-green-600 py-3 rounded font-bold text-white">
                        {loading ? '...' : 'Valider'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function PhotoInput({ label, file, setFile }: { label: string, file: File | null, setFile: (f: File | null) => void }) {
    return (
        <label className={`block w-full aspect-square rounded border-2 border-dashed flex items-center justify-center cursor-pointer ${file ? 'border-green-500' : 'border-gray-700'}`}>
            {file ? <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" /> : <span>📷 {label}</span>}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
    );
}
