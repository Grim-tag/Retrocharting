import { NextResponse } from 'next/server';
import { routeMap } from '@/lib/route-config';
import { systems } from '@/data/systems';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    // Check for potential .xml extension if URL rewriting didn't strip it? 
    // Actually, [id] captures "0.xml".
    const idStr = params.id.replace('.xml', '');
    const id = parseInt(idStr);
    const BASE_URL = 'https://retrocharting.com';
    const limit = 10000;
    const skip = id * limit;

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // --- STATIC CONTENT (Only for ID 0) ---
    if (id === 0) {
        // Simple static routes (Homepage, Categories)
        // Hardcoded for robustness
        const staticUrls = [
            '/', '/en', '/fr',
            '/games', '/fr/jeux-video',
            '/consoles', '/fr/consoles',
        ];

        staticUrls.forEach(u => {
            xml += '  <url>\n';
            xml += `    <loc>${BASE_URL}${u}</loc>\n`;
            xml += '    <changefreq>daily</changefreq>\n';
            xml += '    <priority>0.9</priority>\n';
            xml += '  </url>\n';
        });
    }

    // --- DYNAMIC CONTENT (Games) ---
    try {
        const apiUrl = `https://retrocharting-backend.onrender.com/api/v1/games/sitemap/list?limit=${limit}&skip=${skip}`;
        const res = await fetch(apiUrl, { next: { revalidate: 3600 } });

        if (res.ok) {
            const games = await res.json();
            const langs = ['en', 'fr'];

            games.forEach((game: any) => {
                langs.forEach(lang => {
                    const gamesBase = routeMap['games']?.[lang] || 'games';
                    // routeMap might be client side lib, let's hardcode for safety if import fails? 
                    // No, import works in route handlers.

                    const path = lang === 'en'
                        ? `/games/${game.slug}`
                        : `/fr/jeux-video/${game.slug}`; // Hardcoded 'jeux-video' for safety

                    xml += '  <url>\n';
                    xml += `    <loc>${BASE_URL}${path}</loc>\n`;
                    xml += '    <changefreq>weekly</changefreq>\n';
                    xml += '  </url>\n';
                });
            });
        }
    } catch (e) {
        console.error(`Sitemap Child ${id} Error:`, e);
        // Return whatever static content we added
    }

    xml += '</urlset>';

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
}
