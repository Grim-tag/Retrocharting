'use client';

import React, { useEffect, useState } from 'react';
import TranslationsEditor from "@/components/admin/TranslationsEditor";
import { apiClient } from "@/lib/client";

// Import dictionaries directly for Client Side usage
import enDict from '@/dictionaries/en.json';
import frDict from '@/dictionaries/fr.json';

function flattenObject(obj: any, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            const nested = flattenObject(obj[key], prefix + key + '.');
            Object.assign(result, nested);
        } else {
            result[prefix + key] = String(obj[key]);
        }
    }
    return result;
}

const setNestedValue = (obj: any, path: string, value: string) => {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) current[key] = {};
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
};

export default function AdminTranslationsPage() {
    const [loading, setLoading] = useState(true);
    const [flatEn, setFlatEn] = useState<Record<string, string>>({});
    const [flatFr, setFlatFr] = useState<Record<string, string>>({});

    const adminKey = "admin_secret_123"; // Client-side fallback, ideally fetched or handled via auth

    useEffect(() => {
        const load = async () => {
            try {
                // Fetch DB overrides
                const [resEn, resFr] = await Promise.all([
                    apiClient.get('/translations/en').catch(() => ({ data: {} })),
                    apiClient.get('/translations/fr').catch(() => ({ data: {} }))
                ]);

                // Merge EN
                const mergedEn = JSON.parse(JSON.stringify(enDict));
                Object.entries(resEn.data).forEach(([key, value]) => {
                    setNestedValue(mergedEn, key, value as string);
                });

                // Merge FR
                const mergedFr = JSON.parse(JSON.stringify(frDict));
                Object.entries(resFr.data).forEach(([key, value]) => {
                    setNestedValue(mergedFr, key, value as string);
                });

                setFlatEn(flattenObject(mergedEn));
                setFlatFr(flattenObject(mergedFr));
            } catch (e) {
                console.error("Failed to load translations", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return <div className="text-white p-8">Loading translations...</div>;
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-white uppercase tracking-wider">Translation Management (Client Mode)</h2>
            <TranslationsEditor
                initialEn={flatEn}
                initialFr={flatFr}
                adminKey={adminKey}
            />
        </div>
    );
}
