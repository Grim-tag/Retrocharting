import OnboardingPage from "@/components/OnboardingPage";

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    return <OnboardingPage lang={lang} />;
}
