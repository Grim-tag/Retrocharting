import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { groupedSystems } from "@/data/systems";

export default function VideoGamesPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />

            <main className="flex-grow bg-[#0f121e] py-8">
                <div className="max-w-[1400px] mx-auto px-4">

                    {/* Breadcrumbs */}
                    <div className="text-sm text-gray-400 mb-6">
                        <Link href="/" className="hover:text-white">Home</Link>
                        <span className="mx-2">/</span>
                        <span className="text-white">Video Games</span>
                    </div>

                    <h1 className="text-3xl font-bold mb-4 text-white">Video Game Price Guide</h1>
                    <p className="text-gray-400 mb-8 max-w-3xl">
                        Click on any Video Game Systems to see a Game list and their current value.
                        From there you can also add a Game to your collection or wishlist.
                        Go to any Game detail page to see current prices for different grades and historic prices too.
                    </p>

                    {/* Grouped Systems Grid */}
                    <div className="space-y-12">
                        {Object.entries(groupedSystems).map(([groupName, systems]) => (
                            <div key={groupName}>
                                <h2 className="text-2xl font-bold text-white mb-4 border-b border-[#2a3142] pb-2 flex items-center gap-2">
                                    <span className="text-[#ff6600]">#</span> {groupName}
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {systems.map((system) => (
                                        <Link
                                            key={system}
                                            href={`/video-games/${system.toLowerCase().replace(/ /g, '-')}`}
                                            className="bg-[#1f2533] p-4 rounded border border-[#2a3142] hover:border-[#ff6600] hover:bg-[#252b3b] transition-all group"
                                        >
                                            <h3 className="font-medium text-gray-300 group-hover:text-white truncate" title={system}>
                                                {system}
                                            </h3>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
