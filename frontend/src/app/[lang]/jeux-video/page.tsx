import GamesPage, { generateStaticParams as baseParams, generateMetadata as baseMetadata } from "../games/page";

export async function generateStaticParams() {
    return baseParams();
}

export async function generateMetadata(props: any) {
    return baseMetadata(props);
}

export default function Page(props: any) {
    return <GamesPage {...props} />;
}
