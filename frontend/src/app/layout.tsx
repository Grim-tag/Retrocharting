import "./globals.css";
import React from "react";

export const metadata = {
    title: 'RetroCharting - Loading...',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="bg-[#1f2533]">{children}</body>
        </html>
    );
}
