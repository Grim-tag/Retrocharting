import Link from "next/link";
import { getRegion } from "@/lib/utils";

interface SystemListProps {
    systems: string[];
    basePath: string;
}

export default function SystemList({ systems, basePath }: SystemListProps) {
    let lastRegion = "";

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {systems.map((system, index) => {
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
                            href={`${basePath}/${system.toLowerCase().replace(/ /g, '-')}`}
                            className="bg-[#1f2533] p-4 rounded border border-[#2a3142] hover:border-[#ff6600] hover:bg-[#252b3b] transition-all group"
                        >
                            <h3 className="font-medium text-gray-300 group-hover:text-white truncate" title={system}>
                                {system}
                            </h3>
                        </Link>
                    </div>
                );
            })}
        </div>
    );
}
