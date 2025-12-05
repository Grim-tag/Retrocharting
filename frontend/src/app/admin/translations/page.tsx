export default function AdminTranslationsPage() {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-white uppercase tracking-wider">Translation Management</h2>
            <div className="bg-[#1f2533] p-8 rounded border border-[#2a3142] text-center">
                <p className="text-gray-400 mb-4">Translation management interface coming soon.</p>
                <div className="flex justify-center gap-4">
                    <div className="p-4 bg-[#0f121e] rounded border border-[#2a3142]">
                        <span className="block text-2xl font-bold text-white mb-1">EN</span>
                        <span className="text-xs text-gray-500">English</span>
                    </div>
                    <div className="p-4 bg-[#0f121e] rounded border border-[#2a3142]">
                        <span className="block text-2xl font-bold text-white mb-1">FR</span>
                        <span className="text-xs text-gray-500">French</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
