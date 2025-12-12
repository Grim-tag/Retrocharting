import { apiClient, API_URL } from './client';

export function getApiUrl() {
    return API_URL;
}

export interface Product {
    id: number;
    pricecharting_id: number;
    product_name: string;
    console_name: string;
    loose_price: number;
    cib_price: number;
    new_price: number;
    box_only_price?: number; // Optional as not all products might have it
    manual_only_price?: number; // Optional
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
        const response = await apiClient.get(`/products/`, {
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
        const response = await apiClient.get(`/products/genres`, {
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
        const response = await apiClient.get(`/products/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching product ${id}:`, error);
        return null;
    }
}

export async function getProductHistory(id: number): Promise<PriceHistoryPoint[]> {
    try {
        const response = await apiClient.get(`/products/${id}/history`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching history for product ${id}:`, error);
        return [];
    }
}

export async function searchProducts(query: string): Promise<Product[]> {
    try {
        const response = await apiClient.get(`/products/`, {
            params: { search: query, limit: 5 }
        });
        return response.data;
    } catch (error) {
        console.error("Error searching products:", error);
        return [];
    }
}

export async function updateProduct(id: number, data: Partial<Product>, token: string): Promise<Product | null> {
    try {
        const response = await apiClient.put(`/products/${id}`, data);
        return response.data;
    } catch (error) {
        console.error(`Error updating product ${id}:`, error);
        return null;
    }
}

export interface GroupedProducts {
    [console: string]: (Product & { region?: string })[];
}

export async function searchProductsGrouped(query: string): Promise<GroupedProducts> {
    try {
        const response = await apiClient.get(`/products/search/grouped`, {
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
        const response = await apiClient.get(`/products/${id}/listings`);
        const isStale = response.headers['x-is-stale'] === 'true';
        return { data: response.data, isStale };
    } catch (error) {
        return { data: [], isStale: false };
    }
}

export async function getRelatedProducts(id: number): Promise<Product[]> {
    try {
        const response = await apiClient.get(`/products/${id}/related`);
        return response.data;
    } catch (error) {
        console.error("Error fetching related products:", error);
        return [];
    }
}

export async function getTranslations(locale: string): Promise<Record<string, string>> {
    try {
        const response = await apiClient.get(`/translations/${locale}`, {
            timeout: 2000 // Fast timeout
        });
        return response.data;
    } catch (error) {
        return {};
    }
}

export async function saveTranslation(locale: string, key: string, value: string, adminKey: string): Promise<boolean> {
    try {
        await apiClient.post(`/translations/`, {
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
        const response = await apiClient.get(`/products/sitemap?limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching sitemap products:", error);
        return [];
    }
}

// --- Auth APIs ---

export async function loginWithGoogle(credential: string): Promise<{ access_token: string, token_type: string } | null> {
    try {
        const response = await apiClient.post(`/auth/google`, { credential });
        return response.data;
    } catch (error: any) {
        console.error("Google Login failed", error);
        const msg = error.response?.data?.detail || error.message || "Login failed";
        throw new Error(msg);
    }
}

export async function fetchMe(token: string): Promise<any> {
    try {
        const response = await apiClient.get(`/auth/me`);
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
    paid_price?: number;
    purchase_date?: string; // ISO Date
    product_name: string;
    console_name: string;
    image_url?: string;
    estimated_value?: number;
    user_images?: string; // JSON string
}

export async function getCollection(token: string): Promise<CollectionItem[]> {
    try {
        const response = await apiClient.get(`/collection/`);
        return response.data;
    } catch (error) {
        console.error("Failed to fetch collection", error);
        return [];
    }
}

export async function addToCollection(token: string, productId: number, condition: string, notes?: string, paidPrice?: number): Promise<CollectionItem> {
    try {
        const response = await apiClient.post(`/collection/`, {
            product_id: productId,
            condition,
            paid_price: paidPrice,
            notes
        });
        return response.data;
    } catch (error: any) {
        console.error("Failed to add to collection", error);
        throw new Error(error.response?.data?.detail || "Failed to add to collection");
    }
}

export async function updateCollectionItem(token: string, itemId: number, data: { condition?: string, notes?: string, paid_price?: number, purchase_date?: string, user_images?: string }): Promise<CollectionItem> {
    try {
        const response = await apiClient.put(`/collection/${itemId}`, data);
        return response.data;
    } catch (error: any) {
        console.error("Failed to update collection item", error);
        throw new Error(error.response?.data?.detail || "Failed to update item");
    }
}

export async function deleteFromCollection(token: string, itemId: number): Promise<boolean> {
    try {
        await apiClient.delete(`/collection/${itemId}`);
        return true;
    } catch (error) {
        console.error("Failed to delete item", error);
        return false;
    }
}

export async function updateUser(token: string, data: { username?: string, full_name?: string }): Promise<any> {
    try {
        const response = await apiClient.put(`/auth/me`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export async function getRecentlyScrapedProducts(limit: number = 10, token: string): Promise<any[]> {
    try {
        const response = await apiClient.get(`/products/stats/recently-scraped`, {
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
        const response = await apiClient.get(`/portfolio/summary`);
        return response.data;
    } catch (error) {
        console.error("Failed to fetch portfolio summary", error);
        return { total_value: 0, item_count: 0, console_count: 0, top_items: [] };
    }
}

export async function getPortfolioHistory(token: string, days = 30): Promise<any[]> {
    try {
        const response = await apiClient.get(`/portfolio/history`, {
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
        const response = await apiClient.get(`/portfolio/movers`, {
            params: { days }
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch portfolio movers", error);
        return { gainers: [], losers: [] };
    }
}

export async function getPortfolioDebug(token: string): Promise<any> {
    try {
        const response = await apiClient.get(`/portfolio/debug`);
        return response.data;
    } catch (error) {
        console.error("Failed to fetch portfolio debug", error);
        return { error: "Failed to fetch debug info" };
    }
}

// --- Import APIs ---

export interface CSVMatchResult {
    item: {
        title: string;
        platform: string;
        condition: string;
        paid_price?: string;
        currency?: string;
        purchase_date?: string;
        comment?: string;
        csv_index: number;
    };
    match?: {
        id: number;
        product_name: string;
        console_name: string;
        image_url?: string;
        score: number;
    };
    best_guess?: {
        id: number;
        product_name: string;
        console_name: string;
        image_url?: string;
        score: number;
    };
    reason?: string;
}

export interface ImportAnalysisResult {
    matches: CSVMatchResult[];
    ambiguous: CSVMatchResult[];
    unmatched: CSVMatchResult[];
}

export async function uploadCsv(file: File, token: string): Promise<ImportAnalysisResult | null> {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await apiClient.post(`/import/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error: any) {
        console.error("CSV upload failed", error);
        throw new Error(error.response?.data?.detail || "Upload failed");
    }
}

export interface ImportItem {
    product_id: number;
    condition: string;
    paid_price?: number;
    currency?: string;
    purchase_date?: string;
    comment?: string;
}

export async function bulkImport(items: ImportItem[], token: string): Promise<{ imported: number, errors: number }> {
    try {
        const response = await apiClient.post(`/import/confirm`, { items });
        return response.data;
    } catch (error: any) {
        console.error("Bulk import failed", error);
        throw new Error(error.response?.data?.detail || "Import failed");
    }
}
