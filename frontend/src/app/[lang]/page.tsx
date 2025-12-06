import Link from "next/link";
import { getDictionary } from "@/lib/get-dictionary";
import { routeMap } from "@/lib/route-config";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  const getSlug = (key: string) => routeMap[key]?.[lang] || key;
  const getPath = (key: string) => {
    const slug = getSlug(key);
    if (lang === 'en') {
      return `/${slug}`;
    }
    return `/${lang}/${slug}`;
  };

  return (
    <main className="flex-grow">
      {/* Hero Section */}
      <section className="bg-[#1f2533] py-20 border-b border-[#2a3142]">
        <div className="max-w-[1400px] mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            {dict.home.hero.title_prefix} <span className="text-[#ff6600]">{dict.home.hero.title_highlight}</span> {dict.home.hero.title_suffix}
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            {dict.home.hero.description}
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href={getPath('games')}
              className="bg-[#ff6600] text-white px-8 py-3 rounded font-bold hover:bg-[#e65c00] transition-colors uppercase tracking-wide"
            >
              {dict.home.hero.cta_browse}
            </Link>
            <button className="bg-[#2a3142] text-white px-8 py-3 rounded font-bold hover:bg-[#353e54] transition-colors uppercase tracking-wide border border-[#353e54]">
              {dict.home.hero.cta_collection}
            </button>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 bg-[#0f121e]">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 border-l-4 border-[#ff6600] pl-4">{dict.home.categories.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href={getPath('games')}
              className="bg-[#1f2533] p-8 rounded border border-[#2a3142] hover:border-[#ff6600] transition-colors group"
            >
              <h3 className="text-2xl font-bold group-hover:text-[#ff6600] transition-colors">{dict.home.categories.items.video_games.title}</h3>
              <p className="text-gray-400 mt-2">{dict.home.categories.items.video_games.desc}</p>
            </Link>
            <Link
              href={getPath('consoles')}
              className="bg-[#1f2533] p-8 rounded border border-[#2a3142] hover:border-[#ff6600] transition-colors group"
            >
              <h3 className="text-2xl font-bold group-hover:text-[#ff6600] transition-colors">{dict.home.categories.items.consoles.title}</h3>
              <p className="text-gray-400 mt-2">{dict.home.categories.items.consoles.desc}</p>
            </Link>
            <Link
              href={getPath('accessories')}
              className="bg-[#1f2533] p-8 rounded border border-[#2a3142] hover:border-[#ff6600] transition-colors group"
            >
              <h3 className="text-2xl font-bold group-hover:text-[#ff6600] transition-colors">{dict.home.categories.items.accessories.title}</h3>
              <p className="text-gray-400 mt-2">{dict.home.categories.items.accessories.desc}</p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
