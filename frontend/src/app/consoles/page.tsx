import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { groupedSystems } from "@/data/systems";
import { getRegion } from "@/lib/utils";

export default function ConsolesPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />

            <main className="flex-grow bg-[#0f121e] py-8">
                <div className="max-w-[1400px] mx-auto px-4">

                    {/* Breadcrumbs */}
                    <div className="text-sm text-gray-400 mb-6">
                        <Link href="/" className="hover:text-white">Home</Link>
                        <span className="mx-2">/</span>
                        <span className="text-white">Consoles</span>
                    </div>

                    <h1 className="text-3xl font-bold mb-4 text-white">Console Hardware Price Guide</h1>
                    <p className="text-gray-400 mb-8 max-w-3xl">
                        Browse video game consoles, controllers, and hardware.
                        Select a system to see available hardware and current market values.
                    </p>

                    {/* Grouped Systems Grid */}
                    <div className="space-y-12">
                        {Object.entries(groupedSystems).map(([groupName, systems]) => (
                            <div key={groupName}>
                                <h2 className="text-2xl font-bold text-white mb-4 border-b border-[#2a3142] pb-2 flex items-center gap-2">
                                    <span className="text-[#ff6600]">#</span> {groupName}
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {(() => {
                                        let lastRegion = "";
                                        return systems.map((system, index) => {
                                            const region = getRegion(system);
                                            const showSeparator = index > 0 && region !== lastRegion;
                                            lastRegion = region;

                                            return (
                                                <div key={system} className="contents">
                                                    {showSeparator && (
                                                        <div className="col-span-full h-px bg-[#2a3142] my-2 relative">
                                                            <span className="absolute left-0 -top-2 bg-[#0f121e] text-[10px] text-gray-500 px-2 uppercase tracking-widest font-bold">
                                                                {region === "JP" ? "Japan & Asia" : region === "PAL" ? "Europe (PAL)" : "North America (NTSC)"}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <Link
                                                        key={system}
                                                        href={`/consoles/${system.toLowerCase().replace(/ /g, '-')}`}
                                                        className="bg-[#1f2533] p-4 rounded border border-[#2a3142] hover:border-[#ff6600] hover:bg-[#252b3b] transition-all group"
                                                    >
                                                        <h3 className="font-medium text-gray-300 group-hover:text-white truncate" title={system}>
                                                            {system}
                                                        </h3>
                                                    </Link>
                                                </div>
                                            );
                                        });
                                    })()}
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
