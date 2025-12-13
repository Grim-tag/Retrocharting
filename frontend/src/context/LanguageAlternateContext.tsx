'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LanguageAlternates {
    en?: string;
    fr?: string;
}

interface LanguageAlternateContextType {
    alternates: LanguageAlternates;
    setAlternates: (alternates: LanguageAlternates) => void;
}

const LanguageAlternateContext = createContext<LanguageAlternateContextType | undefined>(undefined);

export function LanguageAlternateProvider({ children }: { children: ReactNode }) {
    const [alternates, setAlternates] = useState<LanguageAlternates>({});

    return (
        <LanguageAlternateContext.Provider value={{ alternates, setAlternates }}>
            {children}
        </LanguageAlternateContext.Provider>
    );
}

export function useLanguageAlternate() {
    const context = useContext(LanguageAlternateContext);
    if (!context) {
        throw new Error('useLanguageAlternate must be used within a LanguageAlternateProvider');
    }
    return context;
}
