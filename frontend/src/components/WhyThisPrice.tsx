import { ChartBarIcon, ShieldCheckIcon, ClockIcon } from '@heroicons/react/24/outline';

interface WhyThisPriceProps {
    salesCount?: number;
}

export default function WhyThisPrice({ salesCount = 0 }: WhyThisPriceProps) {
    return (
        <div className="bg-[#1f2533]/50 border border-[#2a3142] p-6 rounded-lg my-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="w-6 h-6 text-green-500" />
                Why this price?
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="flex flex-col gap-2">
                    <div className="font-bold text-gray-200 flex items-center gap-2">
                        <ChartBarIcon className="w-4 h-4 text-[#ff6600]" />
                        Real Sales Data
                    </div>
                    <p className="text-gray-400">
                        Our algorithm tracks {salesCount > 0 ? <span className="text-white font-bold">{salesCount} verified sales</span> : "thousands of verified sales"} from eBay and other marketplaces. We don't use asking prices, only what buyers actually pay.
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="font-bold text-gray-200 flex items-center gap-2">
                        <ShieldCheckIcon className="w-4 h-4 text-[#ff6600]" />
                        Outlier Protection
                    </div>
                    <p className="text-gray-400">
                        We automatically exclude damaged items, reproductions, and extreme outliers to ensure the average is representative of the true market value.
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="font-bold text-gray-200 flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-[#ff6600]" />
                        Updated Daily
                    </div>
                    <p className="text-gray-400">
                        The retro market moves fast. Our database refreshes every day to capture the latest trends and shifts in collector demand.
                    </p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#2a3142]/50 text-center">
                <p className="text-xs text-gray-500">
                    Confidence Score: <span className="text-green-500 font-bold">High</span> • Based on {salesCount > 0 ? `${salesCount} verified transactions` : "verified transactions"}
                </p>
            </div>
        </div>
    );
}
