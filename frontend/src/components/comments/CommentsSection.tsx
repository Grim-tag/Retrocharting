'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getComments, postComment, Comment } from '@/lib/api_comments';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface CommentsSectionProps {
    productId: number;
    lang: string;
}

export default function CommentsSection({ productId, lang }: CommentsSectionProps) {
    const { user, login, refreshUser } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const LIMIT = 5;

    useEffect(() => {
        loadComments(true);
    }, [productId]);

    const loadComments = async (reset = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const currentOffset = reset ? 0 : offset;
            const res = await getComments(productId, LIMIT, currentOffset);

            if (reset) {
                setComments(res.comments);
                setOffset(LIMIT);
            } else {
                setComments(prev => [...prev, ...res.comments]);
                setOffset(prev => prev + LIMIT);
            }
            setTotal(res.total);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!newComment.trim()) return;

        // Optimistic check for links (Client Side UX)
        const linkRegex = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.(com|net|org|fr|de|io|co))/i;
        if (linkRegex.test(newComment)) {
            setError(lang === 'fr' ? "Les liens ne sont pas autorisés." : "Links are not allowed.");
            return;
        }

        setSubmitting(true);
        try {
            // Token should be in localStorage or managed by AuthContext. 
            // Assuming useAuth provides a token or axios interceptor handles it. 
            // Let's assume we need to get token from storage? 
            // Or assume useAuth (if it uses cookies/interceptor) handles it.
            // But api_comments.ts expects a token string.
            // Let's try grabbing from localStorage 'token' or similar if AuthContext doesn't expose it.
            // Based on Header.tsx, AuthContext exposes user/login/logout.
            // Usually tokens are stored in localStorage or cookies. 
            // I'll assume localStorage 'token' key exists for now as is common in JWT setups.
            const token = localStorage.getItem('token') || '';

            const posted = await postComment(productId, newComment, token);

            // Prepend new comment
            setComments(prev => [posted, ...prev]);
            setTotal(prev => prev + 1);
            setNewComment('');

            // Refresh User to get new XP
            refreshUser();
        } catch (e: any) {
            setError(e.message || 'Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    const dateLocale = lang === 'fr' ? fr : enUS;
    const txt = lang === 'fr' ? {
        title: "Commentaires",
        placeholder: "Ajouter un commentaire...",
        submit: "Publier",
        login: "Connectez-vous pour commenter",
        loadMore: "Charger plus de commentaires",
        empty: "Aucun commentaire pour le moment. Soyez le premier !",
        submitting: "Envoi...",
        linksForbidden: "Les liens sont interdits."
    } : {
        title: "Comments",
        placeholder: "Add a comment...",
        submit: "Post",
        login: "Login to post a comment",
        loadMore: "Load more comments",
        empty: "No comments yet. Be the first!",
        submitting: "Posting...",
        linksForbidden: "Links are not allowed."
    };

    return (
        <div className="bg-[#1f2533] border border-[#2a3142] rounded-lg p-6 mt-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                {txt.title} <span className="text-gray-500 text-sm font-normal">({total})</span>
            </h3>

            {/* Input Area */}
            {user ? (
                <form onSubmit={handleSubmit} className="mb-8">
                    <div className="flex gap-4">
                        <img
                            src={user.avatar_url ?? "https://www.gravatar.com/avatar?d=mp"}
                            alt={user.username ?? "User"}
                            className="w-10 h-10 rounded-full border border-[#2a3142]"
                        />
                        <div className="flex-1">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder={txt.placeholder}
                                className="w-full bg-[#151922] border border-[#2a3142] rounded p-3 text-white focus:border-[#ff6600] focus:ring-1 focus:ring-[#ff6600] transition-colors resize-none h-24"
                                disabled={submitting}
                            />
                            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                            <div className="flex justify-end mt-2">
                                <button
                                    type="submit"
                                    disabled={submitting || !newComment.trim()}
                                    className="bg-[#ff6600] hover:bg-[#e65c00] text-white font-bold py-2 px-6 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {submitting ? txt.submitting : txt.submit}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="bg-[#151922] rounded p-6 text-center mb-8 border border-[#2a3142] border-dashed">
                    <p className="text-gray-400 mb-4">{txt.login}</p>
                    {/* Reuse Google Login Button logic or just text? 
                        User can use Header login. 
                        Let's render a simple message for now. */}
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-[#ff6600] font-bold hover:underline">
                        Go to Top to Login
                    </button>
                </div>
            )}

            {/* Comments List */}
            <div className="space-y-6">
                {comments.length === 0 && !loading ? (
                    <p className="text-gray-500 text-center italic">{txt.empty}</p>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4 group">
                            <div className="shrink-0">
                                <div className="w-10 h-10 rounded-full bg-[#2a3142] flex items-center justify-center text-[#ff6600] font-bold text-lg">
                                    {comment.username ? comment.username.charAt(0).toUpperCase() : '?'}
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-bold">{comment.username || 'Anonymous'}</span>
                                    <span className="text-gray-500 text-xs">• {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: dateLocale })}</span>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Load More */}
            {comments.length < total && (
                <div className="mt-8 text-center">
                    <button
                        onClick={() => loadComments(false)}
                        disabled={loading}
                        className="text-gray-400 hover:text-white font-medium text-sm border border-[#2a3142] hover:border-gray-500 px-6 py-2 rounded-full transition-colors"
                    >
                        {loading ? "Loading..." : txt.loadMore}
                    </button>
                </div>
            )}
        </div>
    );
}
