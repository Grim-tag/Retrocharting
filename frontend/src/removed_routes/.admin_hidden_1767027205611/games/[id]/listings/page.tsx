import ListingsClient from './ListingsClient';

export async function generateStaticParams() {
    return [];
}

export default function Page() {
    return <ListingsClient />;
}
