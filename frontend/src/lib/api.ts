import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : 'http://127.0.0.1:8000/api/v1';

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
    release_date?: string; // ISO date string
}

export interface PriceHistoryPoint {
    id: number;
    product_id: number;
    date: string;
    price: number;
    condition: string;
}

export async function getProductsByConsole(consoleName: string, limit = 50, genre?: string): Promise<Product[]> {
    try {
        let url = `${API_URL}/products/?console=${encodeURIComponent(consoleName)}&limit=${limit}`;
        if (genre) {
            url += `&genre=${encodeURIComponent(genre)}`;
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

export async function getListings(id: number) {
    try {
        const response = await axios.get(`${API_URL}/products/${id}/listings`);
        return response.data;
    } catch (error) {
        console.error("Error fetching listings:", error);
        return [];
    }
}
