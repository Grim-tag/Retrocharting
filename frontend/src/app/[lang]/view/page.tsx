import { Suspense } from 'react';
import ProductViewer from '@/components/ProductViewer';

// Next.js 15: Page props are Promises
export default async function ViewPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;

    return (
        <Suspense fallback={<div className="text-white text-center py-20">Loading...</div>}>
            <ProductViewer lang={lang} />
        </Suspense>
    );
}
