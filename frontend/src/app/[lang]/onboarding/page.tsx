import OnboardingPage from "@/components/OnboardingPage";

export async function generateStaticParams() {
    return [{ lang: 'en' }, { lang: 'fr' }];
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    return <OnboardingPage lang={lang} />;
}
