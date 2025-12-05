import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-grow">
      {/* Hero Section */}
      <section className="bg-[#1f2533] py-20 border-b border-[#2a3142]">
        <div className="max-w-[1400px] mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            Track Your <span className="text-[#ff6600]">Collection</span> Value
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            The most accurate price guide for video games, consoles, and collectibles.
            Updated daily with real market data.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/video-games"
              className="bg-[#ff6600] text-white px-8 py-3 rounded font-bold hover:bg-[#e65c00] transition-colors uppercase tracking-wide"
            >
              Browse Games
            </Link>
            <button className="bg-[#2a3142] text-white px-8 py-3 rounded font-bold hover:bg-[#353e54] transition-colors uppercase tracking-wide border border-[#353e54]">
              My Collection
            </button>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 bg-[#0f121e]">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 border-l-4 border-[#ff6600] pl-4">Popular Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Video Games', 'Consoles', 'Accessories'].map((cat) => (
              <Link
                key={cat}
                href={`/${cat.toLowerCase().replace(' ', '-')}`}
                className="bg-[#1f2533] p-8 rounded border border-[#2a3142] hover:border-[#ff6600] transition-colors group"
              >
                <h3 className="text-2xl font-bold group-hover:text-[#ff6600] transition-colors">{cat}</h3>
                <p className="text-gray-400 mt-2">Browse prices and history for {cat}.</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
