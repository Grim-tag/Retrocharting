'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/api';

export default function ImportPage({ params }: { params: { lang: string } }) {
    const { lang } = params;
    const router = useRouter();
    const { token } = useAuth();
    const [step, setStep] = useState(1);

    const handleDownloadTemplate = () => {
        // Direct download link
        window.open(`${API_URL}/import/template`, '_blank');
    };

    return (
        <div className="min-h-screen bg-[#0f121e] text-white p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Import Collection (CSV)</h1>
                    <button
                        onClick={() => router.push(`/${lang}/collection`)}
                        className="text-gray-400 hover:text-white"
                    >
                        ← Back to Collection
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Steps Sidebar */}
                    <div className="col-span-1 space-y-4">
                        <StepIndicator current={step} step={1} title="Download Template" />
                        <StepIndicator current={step} step={2} title="Upload CSV" />
                        <StepIndicator current={step} step={3} title="Review & Confirm" />
                    </div>

                    {/* Main Content */}
                    <div className="col-span-2 bg-[#1f2533] p-8 rounded-xl border border-[#2a3142]">
                        {step === 1 && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-[#ff6600]">Step 1: Get the Template</h2>
                                <p className="text-gray-300">
                                    To ensure your collection is imported correctly, please use our official CSV template.
                                    Fill it with your games data.
                                </p>

                                <div className="bg-[#2a3142] p-4 rounded text-sm text-gray-300 font-mono">
                                    Required Columns: Title, Platform<br />
                                    Optional: Condition, Paid Price, Currency, Notes
                                </div>

                                <button
                                    onClick={handleDownloadTemplate}
                                    className="w-full py-3 bg-[#ff6600] hover:bg-[#ff7b24] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Download CSV Template
                                </button>

                                <div className="pt-4 border-t border-[#2a3142]">
                                    <button
                                        onClick={() => setStep(2)}
                                        className="w-full py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded transition-colors"
                                    >
                                        I have my CSV ready →
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-[#ff6600]">Step 2: Upload CSV</h2>
                                <p className="text-gray-300">
                                    Upload your filled CSV file here. We will analyze it and try to match your games with our database.
                                </p>

                                <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center hover:border-[#ff6600] transition-colors cursor-pointer bg-[#1f2533]/50">
                                    <p className="text-gray-400">Drag & Drop your CSV file here</p>
                                    <p className="text-xs text-gray-500 mt-2">or click to browse</p>
                                    <input type="file" className="hidden" accept=".csv" />
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="flex-1 py-2 bg-transparent border border-gray-600 text-gray-300 hover:text-white rounded transition-colors"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        onClick={() => alert("Upload logic needed")}
                                        className="flex-1 py-2 bg-[#ff6600] hover:bg-[#ff7b24] text-white font-bold rounded transition-colors"
                                    >
                                        Analyze File
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-green-500">Step 3: Coming Soon</h2>
                                <p className="text-gray-300">
                                    Reconciliation interface will be implemented in the next step.
                                </p>
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-2 bg-transparent border border-gray-600 text-gray-300 hover:text-white rounded transition-colors"
                                >
                                    ← Back
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StepIndicator({ step, current, title }: { step: number; current: number; title: string }) {
    const isActive = step === current;
    const isCompleted = step < current;

    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-[#1f2533] border border-[#ff6600]' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                ${isActive ? 'bg-[#ff6600] text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}
            `}>
                {isCompleted ? '✓' : step}
            </div>
            <span className={`font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>{title}</span>
        </div>
    );
}
