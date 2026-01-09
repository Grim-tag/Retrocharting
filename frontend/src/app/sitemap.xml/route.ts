import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
    const BASE_URL = 'https://retrocharting.com';

    // NUCLEAR MODE: SITEMAP INDEX
    // Disable Backend Fetch to prevent timeouts.
    // Just generate 1 sitemap (sitemap/0.xml) which will contain static routes.
    let total = 0;
    // try {
    //     // Direct fetch to backend to avoid "import" issues if any
    //     const res = await fetch("https://retrocharting-backend.onrender.com/api/v1/games/count", { next: { revalidate: 60 } });
    //     if (res.ok) {
    //         total = await res.json();
    //     }
    // } catch (e) {
    //     console.error("Sitemap Index Error:", e);
    // }

    // Just 1 sitemap for now
    const numSitemaps = 1;

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
