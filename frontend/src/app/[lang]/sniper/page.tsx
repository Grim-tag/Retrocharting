import SniperClient from './SniperClient';

export async function generateStaticParams() {
    return [{ lang: 'en' }, { lang: 'fr' }];
}

export default function SniperPage() {
    return <SniperClient />;
}
