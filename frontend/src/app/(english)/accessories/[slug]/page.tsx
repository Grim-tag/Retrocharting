import Page, { generateMetadata as baseMetadata } from "../../../[lang]/accessories/[slug]/page";

export async function generateMetadata(props: any) {
    const params = await props.params;
    return baseMetadata({ params: Promise.resolve({ ...params, lang: 'en' }) });
}

export async function generateStaticParams() {
    const { generateStaticParams: baseParams } = await import("../../../[lang]/accessories/[slug]/page");
    const params = await baseParams();
    return params.filter((p: any) => p.lang === 'en').map((p: any) => ({ slug: p.slug }));
}

export default async function EnglishAccessoryPage(props: any) {
    const params = await props.params;
    return <Page params={Promise.resolve({ ...params, lang: 'en' })} />;
}
