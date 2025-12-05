import { getApiUrl } from "@/lib/api";

type AdminStats = {
    total_products: number;
    scraped_products: number;
    scraped_percentage: number;
    total_value: number;
};

async function getStats(): Promise<AdminStats | null> {
    try {
        const apiUrl = getApiUrl();
        const secretKey = process.env.ADMIN_SECRET_KEY || "admin_secret_123";

        const res = await fetch(`${apiUrl}/api/v1/admin/stats`, {
            cache: 'no-store', // Always fetch fresh data for admin
            headers: {
                'X-Admin-Key': secretKey
            }
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Failed to fetch admin stats", error);
        return null;
    }
}

export default async function AdminDashboard() {
    const stats = await getStats();

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
                label="Total Products"
                value={stats ? stats.total_products.toLocaleString() : "-"}
            />
            <StatCard
                label="Scraped Data"
                value={stats ? `${stats.scraped_percentage}%` : "-"}
                subtext={stats ? `${stats.scraped_products.toLocaleString()} items` : undefined}
            />
            <StatCard
                label="Total Value (CIB)"
                value={stats ? `$${stats.total_value.toLocaleString()}` : "-"}
                highlight
            />
            <StatCard
                label="System Status"
                value={stats ? "Online" : "Offline"}
                status={stats ? "green" : "red"}
            />

            <div className="col-span-full mt-8 p-6 bg-[#1f2533] border border-[#2a3142] rounded">
                <h2 className="text-xl font-bold mb-4">Welcome to RetroCharting Admin</h2>
                <p className="text-gray-400">
                    Your database is currently tracking <strong>{stats?.total_products.toLocaleString() ?? 0}</strong> items.
                </p>
            </div>
        </div>
    );
}

function StatCard({ label, value, subtext, highlight, status }: { label: string; value: string; subtext?: string; highlight?: boolean; status?: "green" | "red" }) {
    return (
        <div className="bg-[#1f2533] p-6 rounded border border-[#2a3142]">
            <div className="text-gray-400 text-sm uppercase tracking-wider mb-2 flex justify-between">
                {label}
                {status && (
                    <span className={`h-2 w-2 rounded-full ${status === "green" ? "bg-green-500" : "bg-red-500"}`}></span>
                )}
            </div>
            <div className={`text-3xl font-bold ${highlight ? "text-[#ff6600]" : "text-white"}`}>{value}</div>
            {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
        </div>
    );
}
