"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { fetchMe, loginWithGoogle } from '../lib/api';

interface User {
    id: number;
    email: string;
    username: string | null;
    full_name: string;
    avatar_url: string;
    is_admin: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (credential: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // Load from local storage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('rc_token');
        if (storedToken) {
            setToken(storedToken);
            // Verify/Fetch User
            fetchMe(storedToken).then(u => {
                if (u) setUser(u);
                else logout(); // Invalid token
            });
        }
    }, []);

    const login = async (credential: string) => {
        const data = await loginWithGoogle(credential);
        if (data && data.access_token) {
            localStorage.setItem('rc_token', data.access_token);
            setToken(data.access_token);
            const u = await fetchMe(data.access_token);
            setUser(u);
        }
    };

    const logout = () => {
        localStorage.removeItem('rc_token');
        setToken(null);
        setUser(null);
    };

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

    if (!clientId) {
        console.error("CRITICAL: NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing. Google Login will fail.");
    }

    const refreshUser = async () => {
        if (token) {
            const u = await fetchMe(token);
            setUser(u);
        }
    };

    return (
        <GoogleOAuthProvider clientId={clientId}>
            <AuthContext.Provider value={{ user, token, login, logout, refreshUser, isAuthenticated: !!user }}>
                {children}
            </AuthContext.Provider>
        </GoogleOAuthProvider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
