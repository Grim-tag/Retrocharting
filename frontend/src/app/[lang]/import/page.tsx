import ImportClient from './ImportClient';

export async function generateStaticParams() {
    return [{ lang: 'en' }, { lang: 'fr' }];
}

export default async function ImportPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    return <ImportClient lang={lang} />;
}
