
import { notFound } from "next/navigation";
import { getPublicProfile, getPublicCollection, getDictionary } from "@/lib/api"; // Note: getDictionary handled differently in server components usually
import Link from "next/link";
import { getGameUrl } from "@/lib/utils";

// Helper to get dictionary
import { getDictionary as fetchDict } from "@/lib/get-dictionary";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    return {
        title: `${username}'s Profile - RetroCharting`,
    };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ lang: string; username: string }> }) {
    const { lang, username } = await params;
    const dict = await fetchDict(lang);
    const profile = await getPublicProfile(username);

    if (!profile) {
        notFound();
    }

    // Only fetch collection if public
    let collectionItems: any[] = [];
    let isPrivate = false;

    if (profile.is_collection_public) {
        collectionItems = await getPublicCollection(username);
    } else {
        isPrivate = true;
    }

    // Stats
    const totalItems = collectionItems.length;
    const topConsole = collectionItems.length > 0
        ? Object.entries(collectionItems.reduce((acc: any, item: any) => {
            acc[item.console_name] = (acc[item.console_name] || 0) + 1;
            return acc;
        }, {})).sort((a: any, b: any) => b[1] - a[1])[0]?.[0]
        : "N/A";

    return (
        <div className="min-h-screen bg-[#0f121e] text-white py-12">
            <div className="max-w-[1200px] mx-auto px-4">

                {/* --- Profile Header --- */}
                <div className="bg-[#1f2533] border border-[#2a3142] rounded-lg p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-xl">

                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#ff6600] shadow-2xl bg-[#0f121e]">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-bold bg-gradient-to-br from-gray-700 to-gray-900 text-gray-400">
                                    {profile.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-[#ff6600] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                            {profile.rank}
                        </div>
                    </div>

                    {/* Bio & Stats */}
                    <div className="flex-grow text-center md:text-left">
                        <h1 className="text-4xl font-bold mb-2">{profile.username}</h1>
                        <p className="text-gray-400 text-sm mb-4">Member since {new Date(profile.created_at).toLocaleDateString()}</p>

                        {profile.bio && (
                            <p className="text-gray-300 italic mb-6 max-w-2xl">"{profile.bio}"</p>
                        )}

                        <div className="flex flex-wrap justify-center md:justify-start gap-6">
                            <div className="bg-[#161b22] px-6 py-3 rounded border border-[#2a3142] text-center min-w-[120px]">
                                <span className="block text-2xl font-bold text-white">{profile.xp}</span>
                                <span className="text-xs text-gray-500 uppercase tracking-widest">XP</span>
                            </div>
                            <div className="bg-[#161b22] px-6 py-3 rounded border border-[#2a3142] text-center min-w-[120px]">
                                <span className="block text-2xl font-bold text-white">{totalItems}</span>
                                <span className="text-xs text-gray-500 uppercase tracking-widest">Games</span>
                            </div>
                            <div className="bg-[#161b22] px-6 py-3 rounded border border-[#2a3142] text-center min-w-[120px]">
                                <span className="block text-xl font-bold text-[#ff6600] mt-1">{String(topConsole)}</span>
                                <span className="text-xs text-gray-500 uppercase tracking-widest block mt-1">Top Console</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Collection Grid --- */}
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="bg-[#ff6600] w-2 h-8 rounded-full inline-block"></span>
                    Public Collection
                </h2>

                {isPrivate ? (
                    <div className="bg-[#1f2533] border border-[#2a3142] rounded-lg p-12 text-center text-gray-400 italic">
                        🚫 This user has chosen to keep their collection private.
                    </div>
                ) : collectionItems.length === 0 ? (
                    <div className="bg-[#1f2533] border border-[#2a3142] rounded-lg p-12 text-center text-gray-400 italic">
                        This user hasn't added any games yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {collectionItems.map((item, idx) => (
                            <Link
                                href={getGameUrl({
                                    id: item.product_id,
                                    product_name: item.product_name,
                                    console_name: item.console_name
                                }, lang)}
                                key={idx}
                                className="group block bg-[#1f2533] border border-[#2a3142] rounded hover:border-[#ff6600] transition-colors overflow-hidden"
                            >
                                <div className="aspect-[3/4] p-4 flex items-center justify-center bg-[#161b22] relative">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.product_name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                        <span className="text-gray-600 text-xs">No Image</span>
                                    )}
                                    <div className="absolute top-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase border border-gray-700">
                                        {item.condition}
                                    </div>
                                </div>
                                <div className="p-3">
                                    <h3 className="text-xs font-bold text-gray-200 line-clamp-1 group-hover:text-[#ff6600] transition-colors">{item.product_name}</h3>
                                    <p className="text-[10px] text-gray-500 mt-1">{item.console_name}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}
