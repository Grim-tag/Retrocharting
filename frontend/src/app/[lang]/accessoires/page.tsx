import AccessoriesPage, { generateStaticParams as baseParams } from "../accessories/page";

export async function generateStaticParams() {
    return baseParams();
}



export default function Page(props: any) {
    return <AccessoriesPage {...props} />;
}
