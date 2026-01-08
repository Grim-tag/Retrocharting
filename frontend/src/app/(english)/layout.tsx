import React from "react";
import "../globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { getDictionary } from "@/lib/get-dictionary";

export const metadata = {
    title: 'RetroCharting - Video Game Price Guide',
    description: 'Track your video game collection value'
};

import { LanguageAlternateProvider } from "@/context/LanguageAlternateContext";
// ... imports

export default async function EnglishLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Determine language from route group or default to 'en'
    const lang = 'en';
    const dict = await getDictionary(lang);

    return (
        <html lang={lang}>
            <body className="bg-[#0f121e] text-white min-h-screen flex flex-col font-sans">
                <AuthProvider>
                    <CurrencyProvider>
                        <LanguageAlternateProvider>
                            <Header dict={dict} lang={lang} />
                            <main className="flex-grow">
                                {children}
                            </main>
                            <Footer dict={dict} lang={lang} />
                        </LanguageAlternateProvider>
                    </CurrencyProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
