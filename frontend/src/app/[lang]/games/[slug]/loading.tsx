import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <main className="flex-grow bg-[#0f121e] py-8">
            <div className="max-w-[1400px] mx-auto px-4">
                {/* Breadcrumbs Skeleton */}
                <div className="flex gap-2 mb-6">
                    <Skeleton className="h-4 w-24 bg-gray-800" />
                    <Skeleton className="h-4 w-4 bg-gray-800" />
                    <Skeleton className="h-4 w-32 bg-gray-800" />
                </div>

                {/* Title Skeleton */}
                <div className="mb-8">
                    <Skeleton className="h-10 w-3/4 max-w-2xl bg-gray-800 mb-4" />
                    <Skeleton className="h-4 w-full max-w-3xl bg-gray-800" />
                </div>

                {/* Content Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Sidebar / Image Skeleton */}
                    <div className="md:col-span-1 space-y-4">
                        <Skeleton className="h-[300px] w-full bg-gray-800 rounded-lg" />
                        <Skeleton className="h-12 w-full bg-gray-800 rounded" />
                        <Skeleton className="h-12 w-full bg-gray-800 rounded" />
                    </div>

                    {/* Main Content / List Skeleton */}
                    <div className="md:col-span-3">
                        {/* Filters Toolbar */}
                        <div className="flex gap-4 mb-6">
                            <Skeleton className="h-10 w-32 bg-gray-800 rounded" />
                            <Skeleton className="h-10 w-32 bg-gray-800 rounded" />
                            <Skeleton className="h-10 w-full bg-gray-800 rounded" />
                        </div>

                        {/* List Items */}
                        <div className="space-y-4">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="h-24 bg-gray-800 rounded-lg w-full flex p-4 gap-4">
                                    <Skeleton className="h-16 w-16 bg-gray-700 rounded" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-5 w-1/2 bg-gray-700" />
                                        <Skeleton className="h-4 w-1/4 bg-gray-700" />
                                    </div>
                                    <Skeleton className="h-8 w-24 bg-gray-700" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
