import GamesPage from "../../[lang]/games/page";

export default function Page() {
    return <GamesPage params={Promise.resolve({ lang: 'en' })} />;
}
