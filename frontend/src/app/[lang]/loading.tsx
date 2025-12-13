
export default function Loading() {
    return (
        <div className="flex-grow bg-[#0f121e] flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff6600]"></div>
                <p className="text-gray-400 animate-pulse">Loading RetroCharting...</p>
            </div>
        </div>
    );
}
