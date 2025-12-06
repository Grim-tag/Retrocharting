import { getDictionary } from '@/lib/get-dictionary';
import CollectionPage from '@/components/CollectionPage';

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);
    return <CollectionPage dict={dict} lang={lang} />;
}
