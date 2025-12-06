import { getDictionary } from '@/lib/get-dictionary';
import ProfilePage from '@/components/ProfilePage';

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);
    return <ProfilePage dict={dict} lang={lang} />;
}
