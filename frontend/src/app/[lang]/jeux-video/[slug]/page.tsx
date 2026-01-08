import { generateStaticParams as baseParams, generateMetadata as baseMetadata } from "../../games/[slug]/page";
import ProductPageBody from '@/components/ProductPageBody';

export async function generateStaticParams() {
    const params = await baseParams();
    // Filter for FR only slugs, and map to just slug (since [lang] is parent)
    return params
        .filter((p: any) => p.lang === 'fr')
        .map((p: any) => ({ slug: p.slug }));
}

export async function generateMetadata(props: any) {
    return baseMetadata(props);
}

export default async function Page(props: any) {
    const params = await props.params;
    return <ProductPageBody params={params} />;
}
