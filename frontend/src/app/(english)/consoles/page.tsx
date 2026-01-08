import ConsolesPage from "../../[lang]/consoles/page";

export default function Page() {
    return <ConsolesPage params={Promise.resolve({ lang: 'en' })} />;
}
