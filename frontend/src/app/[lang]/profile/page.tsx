import ProfileClient from './ProfileClient';

export async function generateStaticParams() {
    return [{ lang: 'en' }, { lang: 'fr' }];
}

export default function ProfilePage() {
    return <ProfileClient />;
}
