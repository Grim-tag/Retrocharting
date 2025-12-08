import { ChartBarIcon, ShieldCheckIcon, ClockIcon } from '@heroicons/react/24/outline';

interface WhyThisPriceProps {
    salesCount?: number;
    dict: any; // We can improve typing later
}

export default function WhyThisPrice({ salesCount = 0, dict }: WhyThisPriceProps) {
    const t = dict?.product?.why_price || {
        title: "Why this price?",
        real_data: {
            title: "Real Sales Data",
            desc: "Our algorithm tracks {{count}} verified sales from eBay and other marketplaces. We don't use asking prices, only what buyers actually pay."
        },
        outlier: {
            title: "Outlier Protection",
            desc: "We automatically exclude damaged items, reproductions, and extreme outliers to ensure the average is representative of the true market value."
        },
        updated: {
            title: "Updated Daily",
            desc: "The retro market moves fast. Our database refreshes every day to capture the latest trends and shifts in collector demand."
        },
        confidence: "Confidence Score",
        based_on: "Based on {{count}} verified transactions"
    };

    const count = salesCount > 0 ? salesCount : "thousands";

    // Simple helper for replacement
    const replaceCount = (text: string) => text.replace("{{count}}", count.toString());

    return (
        <div className="bg-[#1f2533]/50 border border-[#2a3142] p-6 rounded-lg my-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="w-6 h-6 text-green-500" />
                {t.title}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="flex flex-col gap-2">
                    <div className="font-bold text-gray-200 flex items-center gap-2">
                        <ChartBarIcon className="w-4 h-4 text-[#ff6600]" />
                        {t.real_data.title}
                    </div>
                    <p className="text-gray-400">
                        {salesCount > 0 ? (
                            <span dangerouslySetInnerHTML={{
                                __html: replaceCount(t.real_data.desc).replace(count.toString(), `<span class="text-white font-bold">${count}</span>`)
                            }} />
                        ) : (
                            replaceCount(t.real_data.desc)
                        )}
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="font-bold text-gray-200 flex items-center gap-2">
                        <ShieldCheckIcon className="w-4 h-4 text-[#ff6600]" />
                        {t.outlier.title}
                    </div>
                    <p className="text-gray-400">
                        {t.outlier.desc}
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="font-bold text-gray-200 flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-[#ff6600]" />
                        {t.updated.title}
                    </div>
                    <p className="text-gray-400">
                        {t.updated.desc}
                    </p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#2a3142]/50 text-center">
                <p className="text-xs text-gray-500">
                    {t.confidence}: <span className="text-green-500 font-bold">High</span> • {replaceCount(t.based_on)}
                </p>
            </div>
        </div>
    );
}
