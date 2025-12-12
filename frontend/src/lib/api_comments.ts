import { apiClient, API_URL } from './client';

export interface Comment {
    id: number;
    user_id: number;
    username: string;
    content: string;
    created_at: string;
    parent_id?: number | null;
}

export interface CommentsResponse {
    total: number;
    comments: Comment[];
}

// Fetch comments for product
export async function getComments(productId: number, limit: number = 5, offset: number = 0): Promise<CommentsResponse> {
    try {
        const res = await apiClient.get(`/comments/product/${productId}`, {
            params: { limit, offset }
        });
        return res.data;
    } catch (e) {
        console.error(e);
        return { total: 0, comments: [] };
    }
}

// Post comment (Authenticated)
export async function postComment(productId: number, content: string, token: string, parentId?: number): Promise<Comment> {
    // Explicit header approach for safety, though interceptor might handle it if token in localStorage.
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    const res = await apiClient.post(`/comments/`, {
        product_id: productId,
        content,
        parent_id: parentId
    }, config);

    return res.data;
}

// --- Admin ---

export async function getCommentsAdmin(status?: 'pending' | 'approved' | 'rejected', token: string = ''): Promise<Comment[]> {
    const config = {
        headers: { Authorization: `Bearer ${token}`, "X-Admin-Key": "admin_secret_123" },
        params: status ? { status } : {}
    };
    const res = await apiClient.get(`/comments/admin/all`, config);
    return res.data;
}

export async function updateCommentStatus(commentId: number, status: 'approved' | 'rejected' | 'pending', token: string) {
    const config = { headers: { Authorization: `Bearer ${token}`, "X-Admin-Key": "admin_secret_123" } };
    await apiClient.patch(`/comments/${commentId}/status`, null, {
        ...config,
        params: { status_update: status }
    });
}

export async function deleteRejectedComments(token: string) {
    const config = { headers: { Authorization: `Bearer ${token}`, "X-Admin-Key": "admin_secret_123" } };
    await apiClient.delete(`/comments/admin/rejected`, config);
}
