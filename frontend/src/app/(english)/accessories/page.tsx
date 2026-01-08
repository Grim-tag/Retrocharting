import AccessoriesPage from "../../[lang]/accessories/page";

export default function Page() {
    // Proxy to the English version
    return <AccessoriesPage params={Promise.resolve({ lang: 'en' })} />;
}
