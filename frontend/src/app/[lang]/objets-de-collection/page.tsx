import CollectiblesPage, { generateStaticParams as baseParams } from "../collectibles/page";

export async function generateStaticParams() {
    return baseParams();
}



export default function Page(props: any) {
    return <CollectiblesPage {...props} />;
}
