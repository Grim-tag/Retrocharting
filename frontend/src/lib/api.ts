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
    sales_count?: number;
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
        const response = await axios.get(`${API_URL}/products/`, {
            params: {
                console: consoleName,
                limit,
                genre,
                type
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
}

export async function getGenres(consoleName?: string): Promise<string[]> {
    try {
        const response = await axios.get(`${API_URL}/products/genres`, {
            params: {
                console: consoleName
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching genres:", error);
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

export interface GroupedProducts {
    [console: string]: (Product & { region?: string })[];
}

export async function searchProductsGrouped(query: string): Promise<GroupedProducts> {
    try {
        const response = await axios.get(`${API_URL}/products/search/grouped`, {
            params: { query }
        });
        return response.data;
    } catch (error) {
        console.error("Error searching products grouped:", error);
        return {};
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

export async function getSitemapProducts(limit: number = 10000): Promise<any[]> {
    try {
        const response = await axios.get(`${API_URL}/products/sitemap?limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching sitemap products:", error);
        return [];
    }
}

// --- Auth APIs ---

export async function loginWithGoogle(credential: string): Promise<{ access_token: string, token_type: string } | null> {
    try {
        const response = await axios.post(`${API_URL}/auth/google`, { credential });
        return response.data;
    } catch (error) {
        console.error("Google Login failed", error);
        return null;
    }
}

export async function fetchMe(token: string): Promise<any> {
    try {
        const response = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        return null;
    }
}

// --- Collection APIs ---

export interface CollectionItem {
    id: number;
    product_id: number;
    condition: 'LOOSE' | 'CIB' | 'NEW' | 'GRADED';
    notes?: string;
    product_name: string;
    console_name: string;
    image_url?: string;
    estimated_value?: number;
}

export async function getCollection(token: string): Promise<CollectionItem[]> {
    try {
        const response = await axios.get(`${API_URL}/collection/`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch collection", error);
        return [];
    }
}

export async function addToCollection(token: string, productId: number, condition: string, notes?: string): Promise<CollectionItem> {
    try {
        const response = await axios.post(`${API_URL}/collection/`, {
            product_id: productId,
            condition,
            notes
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error: any) {
        console.error("Failed to add to collection", error);
        throw new Error(error.response?.data?.detail || "Failed to add to collection");
    }
}

export async function deleteFromCollection(token: string, itemId: number): Promise<boolean> {
    try {
        await axios.delete(`${API_URL}/collection/${itemId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return true;
    } catch (error) {
        console.error("Failed to delete item", error);
        return false;
    }
}

export async function updateUser(token: string, data: { username?: string, full_name?: string }): Promise<any> {
    try {
        const response = await axios.put(`${API_URL}/auth/me`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export async function getRecentlyScrapedProducts(limit: number = 10, token: string): Promise<any[]> {
    try {
        const response = await axios.get(`${API_URL}/products/stats/recently-scraped`, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { limit }
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch recently scraped products", error);
        return [];
    }
}
// --- Portfolio APIs ---

export async function getPortfolioSummary(token: string): Promise<any> {
    try {
        const response = await axios.get(`${API_URL}/portfolio/summary`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch portfolio summary", error);
        return { total_value: 0, item_count: 0, console_count: 0, top_items: [] };
    }
}

export async function getPortfolioHistory(token: string, days = 30): Promise<any[]> {
    try {
        const response = await axios.get(`${API_URL}/portfolio/history`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { range_days: days }
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch portfolio history", error);
        return [];
    }
}

export async function getPortfolioMovers(token: string, days = 30): Promise<any> {
    try {
        const response = await axios.get(`${API_URL}/portfolio/movers`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { days }
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch portfolio movers", error);
        return { gainers: [], losers: [] };
    }
}
