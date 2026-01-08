'use client';

import React from 'react';

interface ProfileHeaderProps {
    user: {
        username: string;
        avatar_url?: string;
        rank: string;
        xp: number;
        next_level_xp: number;
        progress: number;
    };
}

export default function ProfileHeader({ user }: ProfileHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#ff6600] to-orange-500 p-1">
                    <img
                        src={user.avatar_url || "https://api.dicebear.com/7.x/pixel-art/svg?seed=" + user.username}
                        alt={user.username}
                        className="w-full h-full rounded-full bg-[#0f121e] object-cover"
                    />
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-[#0f121e]"></div>
            </div>

            <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-white mb-1">{user.username}</h1>
                <div className="flex items-center justify-center md:justify-start gap-2 text-[#ff6600] font-bold uppercase tracking-wider text-sm mb-4">
                    <span>🏆 {user.rank}</span>
                    <span className="text-gray-600">•</span>
                    <span>Lvl {Math.floor(user.xp / 1000) + 1}</span>
                </div>

                {/* XP Bar */}
                <div className="w-full max-w-md">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>XP Progress</span>
                        <span>{user.progress}%</span>
                    </div>
                    <div className="h-3 bg-[#1f2533] rounded-full overflow-hidden border border-[#2a3142]">
                        <div
                            className="h-full bg-gradient-to-r from-orange-600 to-[#ff6600] transition-all duration-1000 ease-out"
                            style={{ width: `${user.progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Badges Placeholder */}
            {/* <div className="flex gap-2 opacity-50 grayscale hover:grayscale-0 transition-all">
                <div className="w-12 h-12 bg-[#1f2533] rounded-full border border-[#2a3142] flex items-center justify-center text-2xl">
                    🕹️
                </div>
                <div className="w-12 h-12 bg-[#1f2533] rounded-full border border-[#2a3142] flex items-center justify-center text-2xl">
                    💾
                </div>
            </div> */}
        </div>
    );
}
