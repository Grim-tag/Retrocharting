import { NextResponse } from 'next/server';
import { apiClient } from '@/lib/client'; // Use direct client for error capturing

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = 'https://retrocharting.com';
  const CHUNK_SIZE = 4000;

  let total = 0;
  let debugError = "";

  try {
    // Call directly to catch error details
    const response = await apiClient.get('/products/count');
    total = response.data;
  } catch (e: any) {
    console.error("Failed to fetch product count for sitemap index", e);
    // Capture error for debug sitemap entry
    debugError = e.message || String(e);
    if (e.response) {
      debugError += ` (Status: ${e.response.status})`;
    }
  }

  const numChunks = Math.ceil(total / CHUNK_SIZE);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap/static.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;

  for (let i = 0; i < numChunks; i++) {
    xml += `
  <sitemap>
    <loc>${baseUrl}/sitemap/${i}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;
  }

  // Inject Debug Entry if Error Occurred
  if (debugError) {
    xml += `
  <sitemap>
    <loc>${baseUrl}/debug/sitemap_error?msg=${encodeURIComponent(debugError)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;
  }

  xml += `
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
