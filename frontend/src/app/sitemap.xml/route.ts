import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
    const BASE_URL = 'https://retrocharting.com';

    // NUCLEAR MODE REMOVED: SITEMAP INDEX restored
    let total = 0;
    try {
        // Use 127.0.0.1 for local build
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const BASE_API = API_URL.endsWith('/api/v1') ? API_URL : API_URL + '/api/v1';

        const res = await fetch(`${BASE_API}/games/count`, { next: { revalidate: 60 } });
        if (res.ok) {
            total = await res.json();
            console.log(`[Sitemap] Total games: ${total}`);
        }
    } catch (e) {
        console.error("Sitemap Index Error:", e);
    }

    // 10000 items per sitemap
    const pageSize = 10000;
    const numSitemaps = Math.ceil(total / pageSize) || 1;

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
