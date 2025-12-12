'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPendingComments, approveComment, deleteComment, Comment } from '@/lib/api_comments';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminCommentsPage() {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && user.is_admin) {
            loadPending();
        }
    }, [user]);

    const loadPending = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || '';
            const data = await getPendingComments(token);
            setComments(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        try {
            const token = localStorage.getItem('token') || '';
            await approveComment(id, token);
            setComments(prev => prev.filter(c => c.id !== id));
        } catch (e) {
            alert("Erreur lors de l'approbation");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Supprimer ce commentaire ?")) return;
        try {
            const token = localStorage.getItem('token') || '';
            await deleteComment(id, token);
            setComments(prev => prev.filter(c => c.id !== id));
        } catch (e) {
            alert("Erreur lors de la suppression");
        }
    };

    if (!user || !user.is_admin) {
        return <div className="p-8 text-white">Accès refuse.</div>;
    }

    return (
        <main className="bg-[#0f121e] min-h-screen p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-8">Modération des Commentaires</h1>

                {loading ? (
                    <p className="text-gray-400">Chargement...</p>
                ) : comments.length === 0 ? (
                    <div className="bg-[#1f2533] p-8 rounded-lg text-center text-gray-400">
                        Aucun commentaire en attente. Tout est propre ! ✨
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map((comment) => (
                            <div key={comment.id} className="bg-[#1f2533] border border-[#2a3142] p-4 rounded-lg flex gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-bold text-[#ff6600]">{comment.username}</span>
                                        <span className="text-gray-500 text-sm">
                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
                                        </span>
                                        <span className="text-gray-600 text-xs">ID: {comment.id}</span>
                                    </div>
                                    <p className="text-gray-200 whitespace-pre-wrap">{comment.content}</p>
                                </div>
                                <div className="flex flex-col gap-2 justify-center">
                                    <button
                                        onClick={() => handleApprove(comment.id)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
                                    >
                                        Approuver
                                    </button>
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
