import Header from "@/components/Header";
import Footer from "@/components/Footer";
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

    return {
        title: "RetroCharting",
        description: "Track video game prices and collections",
        metadataBase: new URL(baseUrl),
        alternates: {
            canonical: lang === 'en' ? '/' : `/${lang}`,
            languages: {
                'en': '/',
                'fr': '/fr',
                'x-default': '/',
            },
        },
    };
}

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
                <Header dict={dict} lang={lang} />

                <div className="flex-grow">
                    {children}
                </div>

                <Footer dict={dict} lang={lang} />
            </body>
        </html>
    );
}
