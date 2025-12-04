import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-[#0f121e] border-t border-[#1f2533] text-gray-400 py-12 mt-auto">
            <div className="max-w-[1400px] mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">

                {/* Brand */}
                <div>
                    <Link href="/" className="flex items-center gap-2 mb-4">
                        <span className="text-2xl font-bold text-white tracking-tight">
                            Retro<span className="text-[#ff6600]">Charting</span>
                        </span>
                    </Link>
                    <p className="text-sm">
                        The ultimate price guide for video games, consoles, and collectibles. Track your collection value in real-time.
                    </p>
                </div>

                {/* Links */}
                <div>
                    <h3 className="text-white font-bold uppercase mb-4">Quick Links</h3>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="/video-games" className="hover:text-white transition-colors">Video Games</Link></li>
                        <li><Link href="/consoles" className="hover:text-white transition-colors">Consoles</Link></li>
                        <li><Link href="/accessories" className="hover:text-white transition-colors">Accessories</Link></li>
                        <li><Link href="/collectibles" className="hover:text-white transition-colors">Collectibles</Link></li>
                    </ul>
                </div>

                {/* Support */}
                <div>
                    <h3 className="text-white font-bold uppercase mb-4">Support</h3>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                        <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                        <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                        <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                    </ul>
                </div>

                {/* Social / Newsletter */}
                <div>
                    <h3 className="text-white font-bold uppercase mb-4">Stay Updated</h3>
                    <p className="text-sm mb-4">Subscribe to our newsletter for the latest price trends.</p>
                    <div className="flex">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="bg-[#1f2533] border border-[#2a3142] text-white px-4 py-2 rounded-l focus:outline-none focus:border-[#ff6600] w-full"
                        />
                        <button className="bg-[#ff6600] text-white px-4 py-2 rounded-r font-bold hover:bg-[#e65c00] transition-colors">
                            GO
                        </button>
                    </div>
                </div>
            </div>
            <div className="max-w-[1400px] mx-auto px-4 mt-12 pt-8 border-t border-[#1f2533] text-center text-xs">
                &copy; {new Date().getFullYear()} RetroCharting. All rights reserved.
            </div>
        </footer>
    );
}
