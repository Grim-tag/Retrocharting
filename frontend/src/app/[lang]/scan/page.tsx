import BatchScanClient from './ScanClient';

export async function generateStaticParams() {
    return [{ lang: 'en' }, { lang: 'fr' }];
}

export default async function ScanPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    return <BatchScanClient lang={lang} />;
}
