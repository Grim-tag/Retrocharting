'use client';

import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    basePath: string; // e.g. /fr/games/nintendo-64
}

export default function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
    if (totalPages <= 1) return null;

    const getPageUrl = (page: number) => {
        if (page === 1) return basePath;
        return `${basePath}/page/${page}`;
    };

    // Helper to generate page numbers
    const getPageNumbers = () => {
        const delta = 2; // Number of pages to show on each side
        const range = [];
        const rangeWithDots = [];

        range.push(1);

        if (currentPage <= delta + 1) {
            // Near start: 1, 2, 3, 4, 5 ...
            for (let i = 2; i <= Math.min(5, totalPages); i++) {
                range.push(i);
            }
        } else if (currentPage >= totalPages - delta) {
            // Near end: ... 96, 97, 98, 99, 100
            for (let i = Math.max(totalPages - 4, 2); i < totalPages; i++) {
                range.push(i);
            }
        } else {
            // Middle: ... 48, 49, 50, 51, 52 ...
            for (let i = currentPage - delta; i <= currentPage + delta; i++) {
                if (i > 1 && i < totalPages) {
                    range.push(i);
                }
            }
        }

        if (totalPages > 1 && !range.includes(totalPages)) {
            range.push(totalPages);
        }

        let l;
        for (let i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots;
    };

    return (
        <div className="flex justify-center items-center gap-2 mt-8">
            {/* Previous */}
            {currentPage > 1 ? (
                <Link
                    href={getPageUrl(currentPage - 1)}
                    className="p-2 rounded bg-[#1f2533] border border-[#2a3142] text-gray-400 hover:text-white hover:border-[#ff6600] transition-colors"
                    aria-label="Previous Page"
                >
                    <ChevronLeftIcon className="w-5 h-5" />
                </Link>
            ) : (
                <span className="p-2 rounded bg-[#151922] border border-[#2a3142] text-gray-600 cursor-not-allowed">
                    <ChevronLeftIcon className="w-5 h-5" />
                </span>
            )}

            {/* Numbers */}
            <div className="flex gap-2">
                {getPageNumbers().map((num, idx) => (
                    num === '...' ? (
                        <span key={`dots-${idx}`} className="px-3 py-2 text-gray-600">...</span>
                    ) : (
                        <Link
                            key={num}
                            href={getPageUrl(num as number)}
                            className={`px-4 py-2 rounded font-bold transition-colors border ${currentPage === num
                                    ? 'bg-[#ff6600] text-white border-[#ff6600]'
                                    : 'bg-[#1f2533] text-gray-400 border-[#2a3142] hover:text-white hover:border-gray-400'
                                }`}
                        >
                            {num}
                        </Link>
                    )
                ))}
            </div>

            {/* Next */}
            {currentPage < totalPages ? (
                <Link
                    href={getPageUrl(currentPage + 1)}
                    className="p-2 rounded bg-[#1f2533] border border-[#2a3142] text-gray-400 hover:text-white hover:border-[#ff6600] transition-colors"
                    aria-label="Next Page"
                >
                    <ChevronRightIcon className="w-5 h-5" />
                </Link>
            ) : (
                <span className="p-2 rounded bg-[#151922] border border-[#2a3142] text-gray-600 cursor-not-allowed">
                    <ChevronRightIcon className="w-5 h-5" />
                </span>
            )}
        </div>
    );
}
