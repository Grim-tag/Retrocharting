import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const BASE_URL = 'https://retrocharting.com';

    // Fetch Count
    let total = 0;
    try {
        // Direct fetch to backend to avoid "import" issues if any
        const res = await fetch("https://retrocharting-backend.onrender.com/api/v1/games/count", { next: { revalidate: 60 } });
        if (res.ok) {
            total = await res.json();
        }
    } catch (e) {
        console.error("Sitemap Index Error:", e);
    }

    // Fallback if count fails
    if (total === 0) total = 85000; // Approximate fallback to ensure at least some sitemaps exist

    const limit = 10000;
    const numSitemaps = Math.ceil(total / limit);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (let i = 0; i < numSitemaps; i++) {
        xml += '  <sitemap>\n';
        xml += `    <loc>${BASE_URL}/sitemap/${i}.xml</loc>\n`;
        xml += '  </sitemap>\n';
    }

    xml += '</sitemapindex>';

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
}
