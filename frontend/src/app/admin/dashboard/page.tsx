export default function AdminDashboard() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Total Games" value="Pending" />
            <StatCard label="Review Needed" value="0" />
            <StatCard label="System Status" value="Healthy" />

            <div className="col-span-full mt-8 p-6 bg-[#1f2533] border border-[#2a3142] rounded">
                <h2 className="text-xl font-bold mb-4">Welcome to RetroCharting Admin</h2>
                <p className="text-gray-400">
                    Select an option from the sidebar to manage content, translations, or game data.
                </p>
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-[#1f2533] p-6 rounded border border-[#2a3142]">
            <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">{label}</div>
            <div className="text-3xl font-bold text-white">{value}</div>
        </div>
    );
}
