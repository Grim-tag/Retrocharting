import AnalyticsClient from './AnalyticsClient';

export async function generateStaticParams() {
    return [{ lang: 'en' }, { lang: 'fr' }];
}

export default function AnalyticsPage() {
    return <AnalyticsClient />;
}
