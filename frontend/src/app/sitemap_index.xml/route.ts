
import { NextResponse } from 'next/server';
import { getProductsCount } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = 'https://retrocharting.com';
  const CHUNK_SIZE = 4000;

  // Safe default if API fails
  let total = 0;
  try {
    total = await getProductsCount();
  } catch (e) {
    console.error("Failed to fetch product count for sitemap index", e);
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

  xml += `
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
    },
  });
}
