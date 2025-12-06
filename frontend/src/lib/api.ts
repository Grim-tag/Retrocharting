import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : (process.env.NODE_ENV === 'production'
        ? 'https://retrocharting-backend.onrender.com'
        : 'http://127.0.0.1:8000');

const API_URL = `${BASE_URL}/api/v1`;

export function getApiUrl() {
    return BASE_URL;
}

export interface Product {
    id: number;
    pricecharting_id: number;
    product_name: string;
    console_name: string;
    loose_price: number;
    cib_price: number;
    new_price: number;
    image_url?: string;
    description?: string;
    publisher?: string;
    developer?: string;
    esrb_rating?: string;
    players?: string;
    genre?: string;
    ean?: string;
    gtin?: string;
    release_date?: string; // ISO date string
}

export interface PriceHistoryPoint {
    id: number;
    product_id: number;
    date: string;
    price: number;
    condition: string;
}

export async function getProductsByConsole(consoleName: string, limit = 50, genre?: string, type?: 'game' | 'console' | 'accessory'): Promise<Product[]> {
    try {
        let url = `${API_URL}/products/?console=${encodeURIComponent(consoleName)}&limit=${limit}`;
        if (genre) {
            url += `&genre=${encodeURIComponent(genre)}`;
        }
        if (type) {
            url += `&type=${encodeURIComponent(type)}`;
        }
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
}

export async function getProductById(id: number): Promise<Product | null> {
    try {
        const response = await axios.get(`${API_URL}/products/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching product ${id}:`, error);
        return null;
    }
}

export async function getProductHistory(id: number): Promise<PriceHistoryPoint[]> {
    try {
        const response = await axios.get(`${API_URL}/products/${id}/history`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching history for product ${id}:`, error);
        return [];
    }
}

export async function searchProducts(query: string): Promise<Product[]> {
    try {
        const response = await axios.get(`${API_URL}/products/`, {
            params: { search: query, limit: 5 }
        });
        return response.data;
    } catch (error) {
        console.error("Error searching products:", error);
        return [];
    }
}

export async function getListings(id: number): Promise<{ data: any[], isStale: boolean }> {
    try {
        const response = await axios.get(`${API_URL}/products/${id}/listings`);
        const isStale = response.headers['x-is-stale'] === 'true';
        return { data: response.data, isStale };
    } catch (error) {
        return { data: [], isStale: false };
    }
}

export async function getRelatedProducts(id: number): Promise<Product[]> {
    try {
        const response = await axios.get(`${API_URL}/products/${id}/related`);
        return response.data;
    } catch (error) {
        console.error("Error fetching related products:", error);
        return [];
    }
}

export async function getTranslations(locale: string): Promise<Record<string, string>> {
    try {
        const response = await axios.get(`${API_URL}/translations/${locale}`, {
            timeout: 2000 // Fast timeout
        });
        return response.data;
    } catch (error) {
        return {};
    }
}

export async function saveTranslation(locale: string, key: string, value: string, adminKey: string): Promise<boolean> {
    try {
        await axios.post(`${API_URL}/translations/`, {
            locale,
            key,
            value
        }, {
            headers: { 'X-Admin-Key': adminKey }
        });
        return true;
    } catch (error) {
        console.error("Failed to save translation", error);
        return false;
    }
}
