import RedirectClient from './RedirectClient';

export async function generateStaticParams() {
    return [{ lang: 'en' }, { lang: 'fr' }];
}

export default function AdminDashboardRedirectPage() {
    return <RedirectClient />;
}
