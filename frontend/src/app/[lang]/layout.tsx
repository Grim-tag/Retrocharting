import Header from "@/components/Header";
import Footer from "@/components/Footer";
import React from "react";
import { getDictionary } from "@/lib/get-dictionary";

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
        <div className="flex flex-col min-h-screen">
            {/* 
         We pass 'lang' to Header if it needs to generate language links.
         For now, Header might not accept props, but we prepare for it.
       */}
            <Header dict={dict} />

            <div className="flex-grow">
                {children}
            </div>

            <Footer dict={dict} />
        </div>
    );
}
