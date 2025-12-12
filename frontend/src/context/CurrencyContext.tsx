
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { CurrencyCode } from "@/lib/currency";

interface CurrencyContextType {
    currency: CurrencyCode;
    setCurrency: (code: CurrencyCode) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load from storage on mount
        const saved = localStorage.getItem("retrocharting_currency");
        if (saved && (saved === 'USD' || saved === 'EUR' || saved === 'GBP')) {
            setCurrencyState(saved as CurrencyCode);
        } else {
            // Default based on browser locale? Optional.
            // keeping safe default USD for now.
        }
        setMounted(true);
    }, []);

    const setCurrency = (code: CurrencyCode) => {
        setCurrencyState(code);
        localStorage.setItem("retrocharting_currency", code);
    };

    if (!mounted) {
        return <>{children}</>;
        // Render children immediately to avoid hydration mismatch if possible, 
        // or return null if strict. Returning children with default USD corresponds to server render.
    }

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error("useCurrency must be used within a CurrencyProvider");
    }
    return context;
}
