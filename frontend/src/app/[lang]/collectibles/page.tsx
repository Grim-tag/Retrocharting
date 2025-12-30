import { getSitemapProducts } from "@/lib/api";

type Props = {
    params: Promise<{ lang: string }>;
};

export async function generateStaticParams() {
    return [{ lang: 'en' }, { lang: 'fr' }];
}

export default async function CollectiblesPage({ params }: Props) {
    const { lang } = await params;
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-white mb-8">Collectibles</h1>
            <p className="text-gray-400">Page under construction.</p>
        </div>
    );
}
