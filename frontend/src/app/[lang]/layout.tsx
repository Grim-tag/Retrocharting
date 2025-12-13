import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductSearch from "@/components/ProductSearch";
import React from "react";
import { getDictionary } from "@/lib/get-dictionary";
import { Poppins } from "next/font/google";
import "../globals.css";
import { Metadata } from "next";

const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
});

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
    const { lang } = await params;
    const baseUrl = 'https://retrocharting.com';
    // If lang is en, canonical is /, if fr, canonical is /fr

    // Actually, for SEO canonical:
    // en -> https://retrocharting.com/
    // fr -> https://retrocharting.com/fr

    // We can just construct it.

    if (lang === 'fr') {
        return {
            title: "RetroCharting | Cote Argus Jeux Vidéo & Gestion de Collection",
            description: "Suivez la cote de vos jeux vidéo, estimez la valeur de votre collection et trouvez les meilleures affaires pour Nintendo, PlayStation, Xbox et Sega.",
            metadataBase: new URL(baseUrl),
            alternates: {
                canonical: '/fr',
                languages: {
                    'en': '/',
                    'fr': '/fr',
                    'x-default': '/',
                },
            },
        };
    }

    return {
        title: "RetroCharting | Video Game Price Guide & Collection Tracker",
        description: "Track video game prices, monitor your collection value, and find the best deals for Nintendo, PlayStation, Xbox, and Sega games.",
        metadataBase: new URL(baseUrl),
        alternates: {
            canonical: '/',
            languages: {
                'en': '/',
                'fr': '/fr',
                'x-default': '/',
            },
        },
    };
}

import { AuthProvider } from "@/context/AuthContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { LanguageAlternateProvider } from "@/context/LanguageAlternateContext";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export default async function PublicLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ lang: string }>;
}) {
    const { lang } = await params;
    const dict = await getDictionary(lang);

    return (
        <html lang={lang}>
            <body className={`${poppins.variable} antialiased bg-[#1f2533] text-white font-sans flex flex-col min-h-screen`}>
                <GoogleAnalytics gaId="G-RZP4756CJS" />
                <CurrencyProvider>
                    <LanguageAlternateProvider>
                        <AuthProvider>
                            <Header dict={dict} lang={lang} />

                            <ProductSearch placeholder={dict.header.search_placeholder} lang={lang} />

                            <main className="flex-grow">
                                {children}
                            </main>

                            <Footer dict={dict} lang={lang} />
                        </AuthProvider>
                    </LanguageAlternateProvider>
                </CurrencyProvider>
            </body>
        </html>
    );
}
