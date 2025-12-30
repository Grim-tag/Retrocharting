import EditGameClient from './EditGameClient';

export async function generateStaticParams() {
    return [];
}

export default function Page() {
    return <EditGameClient />;
}
