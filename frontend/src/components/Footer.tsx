import Link from 'next/link';
import { routeMap } from '@/lib/route-config';

export default function Footer({ dict, lang }: { dict: any; lang: string }) {
    // Helper for localized path
    // Helper for localized path
    const getSlug = (key: string) => routeMap[key]?.[lang] || key;
    const getPath = (key: string) => {
        const slug = getSlug(key);
        if (lang === 'en') {
            return `/${slug}`;
        }
        return `/${lang}/${slug}`;
    };

    return (
        <footer className="bg-[#0f121e] border-t border-[#1f2533] text-gray-400 py-12 mt-auto">
            <div className="max-w-[1400px] mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">

                {/* Brand */}
                <div>
                    <Link href={lang === 'en' ? '/' : `/${lang}`} className="flex items-center gap-2 mb-4">
                        <span className="text-2xl font-bold text-white tracking-tight">
                            Retro<span className="text-[#ff6600]">Charting</span>
                        </span>
                    </Link>
                    <p className="text-sm">
                        {dict.footer.tagline}
                    </p>
                </div>

                {/* Links */}
                <div>
                    <h3 className="text-white font-bold uppercase mb-4">{dict.footer.links.title}</h3>
                    <ul className="space-y-2 text-sm">
                        <li><Link href={getPath("video-games")} className="hover:text-white transition-colors">{dict.footer.links.video_games}</Link></li>
                        <li><Link href={getPath("consoles")} className="hover:text-white transition-colors">{dict.footer.links.consoles}</Link></li>
                        <li><Link href={getPath("accessories")} className="hover:text-white transition-colors">{dict.footer.links.accessories}</Link></li>
                        <li><Link href={getPath("collectibles")} className="hover:text-white transition-colors">{dict.footer.links.collectibles}</Link></li>
                    </ul>
                </div>

                {/* Support */}
                <div>
                    <h3 className="text-white font-bold uppercase mb-4">{dict.footer.support.title}</h3>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="#" className="hover:text-white transition-colors">{dict.footer.support.contact}</Link></li>
                        <li><Link href="#" className="hover:text-white transition-colors">{dict.footer.support.faq}</Link></li>
                        <li><Link href="#" className="hover:text-white transition-colors">{dict.footer.support.privacy}</Link></li>
                        <li><Link href="#" className="hover:text-white transition-colors">{dict.footer.support.terms}</Link></li>
                    </ul>
                </div>

                {/* Social / Newsletter */}
                <div>
                    <h3 className="text-white font-bold uppercase mb-4">{dict.footer.newsletter.title}</h3>
                    <p className="text-sm mb-4">{dict.footer.newsletter.text}</p>
                    <div className="flex">
                        <input
                            type="email"
                            placeholder={dict.footer.newsletter.placeholder}
                            className="bg-[#1f2533] border border-[#2a3142] text-white px-4 py-2 rounded-l focus:outline-none focus:border-[#ff6600] w-full"
                        />
                        <button className="bg-[#ff6600] text-white px-4 py-2 rounded-r font-bold hover:bg-[#e65c00] transition-colors">
                            {dict.footer.newsletter.button}
                        </button>
                    </div>
                </div>
            </div>
            <div className="max-w-[1400px] mx-auto px-4 mt-12 pt-8 border-t border-[#1f2533] text-center text-xs">
                &copy; {new Date().getFullYear()} {dict.footer.copyright}
            </div>
        </footer>
    );
}
