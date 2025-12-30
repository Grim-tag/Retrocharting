import AdminDashboardClient from './AdminClient';

export async function generateStaticParams() {
    return [{ lang: 'en' }, { lang: 'fr' }];
}

export default function AdminDashboardPage() {
    return <AdminDashboardClient />;
}
