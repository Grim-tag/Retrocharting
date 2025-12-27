'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { apiClient } from "@/lib/client";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type ViewState = 'scan' | 'error' | 'search' | 'create';

export default function ScanPage({ params }: { params: { lang: string } }) {
    const [view, setView] = useState<ViewState>('scan');
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [hasPermission, setHasPermission] = useState(false);

    // Debug Logs
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [minimalTestStatus, setMinimalTestStatus] = useState<string>("");

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Create State
    const [createForm, setCreateForm] = useState({ name: '', console: '' });
    const [frontImage, setFrontImage] = useState<File | null>(null);
    const [backImage, setBackImage] = useState<File | null>(null);

    const router = useRouter();
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const mountedRef = useRef(false);

    // Helper logging
    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setDebugLogs(prev => [...prev, `[${time}] ${msg}`]);
        console.log(`[ScanPage] ${msg}`);
    };

    // Reset when opening
    useEffect(() => {
        mountedRef.current = true;
        resetState();
        startScanner();

        return () => {
            mountedRef.current = false;
            stopScanner();
        };
    }, []);

    const resetState = () => {
        setView('scan');
        setScannedCode(null);
        setErrorMsg(null);
        setLoading(false);
        setSearchQuery("");
        setSearchResults([]);
        setCreateForm({ name: '', console: '' });
        setFrontImage(null);
        setBackImage(null);
        setDebugLogs([]);
        setMinimalTestStatus("");
        addLog("Page mounted. Starting scanner...");
    };

    const startScanner = async () => {
        // Wait a bit for UI to mount
        await new Promise(r => setTimeout(r, 500));

        // 0. Check Secure Context
        if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
            addLog("FATAL: Not in secure context (HTTPS/Localhost). Camera will fail.");
            setErrorMsg("Permission Denied (Insecure Context)");
            setView('error');
            return;
        }

        const elem = document.getElementById("reader");
        if (!elem) {
            addLog("ERROR: #reader element not found in DOM");
            return;
        }

        try {
            if (scannerRef.current) {
                addLog("Scanner instance already exists. Checking state...");
                try {
                    if (scannerRef.current.isScanning) {
                        await scannerRef.current.stop();
                        addLog("Stopped existing scan.");
                    }
                } catch (e) {
                    addLog("Error checking/stopping existing: " + e);
                }
            } else {
                addLog("Creating new Html5Qrcode instance.");
                scannerRef.current = new Html5Qrcode("reader");
            }

            const html5QrCode = scannerRef.current;
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.QR_CODE
                ]
            };

            const startConfig = { facingMode: "environment" };
            addLog(`Direct start with config: ${JSON.stringify(startConfig)}`);

            // WRAPPER: Timeout after 8 seconds if camera doesn't start
            const startPromise = html5QrCode.start(
                startConfig,
                config,
                (decodedText) => {
                    handleScanSuccess(decodedText);
                },
                (errorMessage) => {
                    // Ignore transient
                }
            );

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("ScannerStartTimeout")), 8000)
            );

            await Promise.race([startPromise, timeoutPromise]);

            addLog("Scanner started successfully!");
            if (mountedRef.current) {
                setHasPermission(true);
            }

        } catch (err: any) {
            addLog(`START FAIL: ${err.message || err}`);

            let msg = "Could not start camera.";
            if (err?.name === "NotAllowedError" || err?.message?.includes("permission")) {
                msg = "Permission denied. Check browser settings.";
            } else if (err?.name === "NotFoundError") {
                msg = "No camera found.";
            } else if (err?.message === "ScannerStartTimeout") {
                msg = "Camera is unresponsive (Time out).";
            } else if (typeof err === 'string') {
                msg = err;
            }

            if (mountedRef.current) {
                setErrorMsg(msg);
                setView('error');
            }
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                // Check if running before stop? html5-qrcode throws if not running
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (ignore) { }
            scannerRef.current = null;
        }
    };

    const handleScanSuccess = async (code: string) => {
        if (!mountedRef.current) return;
        addLog(`Barcode found: ${code}`);

        // Stop scanning
        await stopScanner();

        setScannedCode(code);
        setLoading(true);
        processCode(code);
    };

    const processCode = async (code: string) => {
        try {
            addLog(`Searching API for: ${code}`);
            const res = await apiClient.get(`/products?search=${code}`);
            const products = res.data;

            if (products && products.length > 0) {
                addLog("Product found! Redirecting.");
                const product = products[0];
                router.push(`/${params?.lang || 'en'}/products/${product.id}`);
            } else {
                addLog("Product not found via scan. Switching to Create Mode.");
                // AUTO-REDIRECT TO CREATE if not found
                if (confirm(`Jeu inconnu (Code: ${code}).\n\nVoulez-vous l'ajouter pour gagner +50 XP ?`)) {
                    setScannedCode(code);
                    setView('create');
                } else {
                    setErrorMsg(`Jeu inconnu (Code: ${code})`);
                    setView('error');
                }
                setLoading(false);
            }
        } catch (e) {
            console.error("Scan Error", e);
            addLog("API Error: " + e);
            setErrorMsg("Erreur réseau lors de la recherche.");
            setView('error');
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        addLog(`File selected: ${file.name} (${file.size} bytes)`);
        setLoading(true);

        try {
            // CRITICAL FIX: Ensure previous instance is cleared
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) {
                        await scannerRef.current.stop();
                    }
                    scannerRef.current.clear();
                } catch (e) { /* ignore */ }
                scannerRef.current = null;
            }

            // CRITICAL FIX: Use the HIDDEN, PERSISTENT div for file scanning
            // This ensures it works even if the main "reader" div is unmounted
            // Using "reader-hidden" which is rendered below
            const tempScanner = new Html5Qrcode("reader-hidden");
            addLog("Created scanner instance on hidden div.");

            const decodedText = await tempScanner.scanFile(file, true);
            addLog("File scan success: " + decodedText);

            // Clean up
            tempScanner.clear();

            handleScanSuccess(decodedText);
        } catch (err: any) {
            console.error("File Scan Error", err);
            addLog("File scan error: " + err);

            // Helpful error mapping
            let userMsg = "Code-barres illisible.";
            if (err?.toString().includes("No MultiFormat Readers")) {
                userMsg = "Aucun code-barres détecté sur l'image. Essayez de cadrer plus serré.";
            } else if (err?.toString().includes("reader element not found")) {
                userMsg = "Erreur technique (DOM).";
            }

            alert(`❌ ${userMsg}\n\nDétail: ${err?.message || err}`);
            setErrorMsg(userMsg);
            setView('error');
            setLoading(false);
        }
    };

    const runMinimalCameraTest = async () => {
        setMinimalTestStatus("Test en cours...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setMinimalTestStatus("✅ SUCCÈS ! Caméra accessible.");
            alert("✅ La caméra fonctionne !");
            stream.getTracks().forEach(track => track.stop());
        } catch (err: any) {
            setMinimalTestStatus(`❌ ÉCHEC : ${err.name}`);
            alert(`❌ Bloqué par le système : ${err.name}`);
        }
    };

    const createProduct = async () => {
        if (!scannedCode || !createForm.name || !createForm.console) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('product_name', createForm.name);
            formData.append('console_name', createForm.console);
            formData.append('ean', scannedCode);
            if (frontImage) formData.append('front_image', frontImage);
            if (backImage) formData.append('back_image', backImage);

            const res = await apiClient.post(`/products/contribute`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Gamification Feedback
            const { product, gamification } = res.data;
            const pts = gamification?.points_earned || 0;
            const newRank = gamification?.current_rank;
            const rankUp = gamification?.rank_up;

            let msg = `Jeu ajouté ! Vous gagnez +${pts} XP.`;
            if (rankUp) msg += `\n\n🎉 Félicitations ! Vous êtes maitenant "${newRank}" !`;

            alert(msg);

            const pid = product?.id || res.data.id;
            router.push(`/${params?.lang || 'en'}/products/${pid}`);
        } catch (e) {
            alert("Erreur lors de la création.");
            setLoading(false);
        }
    };

    const performSearch = async () => {
        if (searchQuery.length < 2) return;
        setLoading(true);
        try {
            const res = await apiClient.get(`/products?search=${searchQuery}&limit=5`);
            setSearchResults(res.data);
            setView('search');
        } catch (e) {
            alert("Search failed");
        }
        setLoading(false);
    };

    const linkProduct = async (productId: number) => {
        if (!scannedCode) return;
        if (!confirm("Link this barcode to this game?")) return;

        setLoading(true);
        try {
            await apiClient.post(`/products/${productId}/ean`, null, { params: { ean: scannedCode } });
            alert("Linked! Redirecting...");
            router.push(`/${params?.lang || 'en'}/products/${productId}`);
        } catch (e) {
            alert("Link failed");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* HIDDEN MOUNT POINT FOR FILE SCANNER IN ALL VIEWS */}
            <div id="reader-hidden" className="hidden"></div>

            {/* Header / Back Link */}
            <div className="absolute top-4 left-4 z-50">
                <Link href={`/${params?.lang || 'en'}`} className="bg-black/50 text-white p-2 rounded-full border border-gray-600">
                    ✕
                </Link>
            </div>

            {/* SCAN VIEW */}
            {view === 'scan' && (
                <div className="flex-1 flex flex-col relative">
                    <div id="reader" className="w-full flex-1 bg-black"></div>

                    {/* Fallback msg if taking too long */}
                    {!hasPermission && !errorMsg && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 z-10 pointer-events-none">
                            <div className="bg-black/80 p-6 rounded-xl border border-gray-700 text-center mb-8 pointer-events-auto">
                                <p className="mb-2 font-bold text-lg animate-pulse">Initialisation (Timeout 8s)...</p>
                                <div className="text-sm text-gray-400">Si ça bloque, utilisez le bouton ci-dessous.</div>
                            </div>

                            {/* PRIMARY FALLBACK: NATIVE CAMERA */}
                            <label className="block w-full max-w-sm bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold border-2 border-green-400 cursor-pointer text-center shadow-[0_0_25px_rgba(0,255,0,0.5)] animate-bounce pointer-events-auto">
                                <span className="text-2xl mr-2">📷</span>
                                Prendre une Photo (Rapide)
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                <p className="text-[10px] font-normal opacity-90 mt-1">Solution de secours immédiate</p>
                            </label>
                        </div>
                    )}

                    {hasPermission && (
                        <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                            <p className="text-white/90 font-bold bg-black/60 inline-block px-4 py-2 rounded-full text-sm animate-pulse border border-white/20">
                                SCANNER ACTIF
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ERROR VIEW */}
            {view === 'error' && (
                <div className="flex-1 bg-gray-900 p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-red-500 text-6xl mb-6">⚠️</div>
                    <h2 className="text-white text-2xl font-bold mb-2">Scanner Bloqué</h2>
                    <p className="text-gray-400 mb-8 max-w-xs mx-auto text-sm">
                        {errorMsg || "Impossible d'accéder à la caméra."}
                    </p>

                    {/* PRIMARY FALLBACK */}
                    <label className="block w-full max-w-sm bg-green-600 hover:bg-green-500 text-white py-6 rounded-xl font-bold border-2 border-green-400 cursor-pointer text-center shadow-lg mb-6">
                        {loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl z-20"><span className="text-3xl animate-spin">⏳</span></div>}
                        <span className="text-3xl mr-2">📷</span>
                        UTILISER L'APPAREIL PHOTO
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <p className="text-xs font-normal opacity-90 mt-2">Prenez une photo du code-barres, ça marche à tous les coups !</p>
                    </label>

                    {/* 2. MANUAL ENTRY FALLBACK */}
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 w-full max-w-sm text-left mb-6">
                        <p className="text-white font-bold mb-2 text-sm">2. Saisie Manuelle (Code EAN 13)</p>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Ex: 334854223..."
                                className="flex-1 bg-black text-white p-3 rounded-lg border border-gray-600 outline-none font-mono"
                                onChange={(e) => setScannedCode(e.target.value)}
                            />
                            <button
                                onClick={() => scannedCode && handleScanSuccess(scannedCode)}
                                className="bg-blue-600 text-white px-4 rounded-lg font-bold"
                            >
                                OK
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => { resetState(); startScanner(); }}
                        className="text-gray-500 underline text-sm"
                    >
                        Réessayer le scanner live
                    </button>

                </div>
            )}

            {/* CREATE VIEW */}
            {view === 'create' && (
                <div className="flex-1 bg-gray-900 p-6 overflow-y-auto">
                    <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-4 rounded-xl mb-6 text-center border border-yellow-500/30">
                        <p className="text-white font-bold text-lg">🏆 Nouvelle Contribution</p>
                        <p className="text-yellow-100 text-sm">Ajoutez ce jeu pour gagner <span className="font-bold text-white">+50 XP</span> !</p>
                    </div>

                    <div className="max-w-md mx-auto space-y-4">
                        <div>
                            <label className="text-gray-400 text-xs mb-1 block">Nom du Jeu * (Requis)</label>
                            <input className="w-full bg-gray-800 text-white p-4 border border-gray-700 rounded-xl focus:border-blue-500 outline-none text-lg" placeholder="Ex: Super Mario 64" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
                        </div>

                        <div>
                            <label className="text-gray-400 text-xs mb-1 block">Console * (Requis)</label>
                            <input className="w-full bg-gray-800 text-white p-4 border border-gray-700 rounded-xl focus:border-blue-500 outline-none text-lg" placeholder="Ex: Nintendo 64" value={createForm.console} onChange={e => setCreateForm({ ...createForm, console: e.target.value })} />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="text-gray-400 text-xs mb-2 block text-center">Photo Face 📷</label>
                                <label className={`block w-full aspect-square rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden relative ${frontImage ? 'border-green-500 bg-black' : 'border-gray-600 bg-gray-800'}`}>
                                    {frontImage ? (
                                        <img src={URL.createObjectURL(frontImage)} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-gray-500 text-3xl">+</span>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={e => setFrontImage(e.target.files?.[0] || null)} />
                                </label>
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-2 block text-center">Photo Dos 📷</label>
                                <label className={`block w-full aspect-square rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden relative ${backImage ? 'border-green-500 bg-black' : 'border-gray-600 bg-gray-800'}`}>
                                    {backImage ? (
                                        <img src={URL.createObjectURL(backImage)} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-gray-500 text-3xl">+</span>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={e => setBackImage(e.target.files?.[0] || null)} />
                                </label>
                            </div>
                        </div>

                        <button
                            onClick={createProduct}
                            disabled={!createForm.name || !createForm.console}
                            className={`w-full py-4 mt-6 rounded-xl font-bold shadow-lg text-lg transition-all ${(!createForm.name || !createForm.console) ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                        >
                            {loading ? "Envoi..." : "Créer le Jeu (+50 XP)"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
