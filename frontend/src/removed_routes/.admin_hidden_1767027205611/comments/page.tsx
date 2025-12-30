'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getCommentsAdmin, updateCommentStatus, deleteRejectedComments, Comment } from '@/lib/api_comments';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

type Tab = 'pending' | 'approved' | 'rejected';

export default function AdminCommentsPage() {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('pending');

    useEffect(() => {
        if (user && user.is_admin) {
            loadComments();
        }
    }, [user, activeTab]);

    const loadComments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || '';
            const data = await getCommentsAdmin(activeTab, token);
            setComments(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: number, newStatus: Tab) => {
        try {
            const token = localStorage.getItem('token') || '';
            await updateCommentStatus(id, newStatus, token);
            // Remove from current list since it moved tab
            setComments(prev => prev.filter(c => c.id !== id));
        } catch (e) {
            alert("Erreur lors de la mise à jour");
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm("Voulez-vous vraiment supprimer TOUS les commentaires refusés ? Cette action est irréversible.")) return;
        try {
            const token = localStorage.getItem('token') || '';
            await deleteRejectedComments(token);
            loadComments(); // Reload
        } catch (e) {
            alert("Erreur lors de la suppression");
        }
    };

    if (!user || !user.is_admin) {
        return <div className="p-8 text-white">Accès refuse.</div>;
    }

    return (
        <main className="bg-[#0f121e] min-h-screen p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Modération des Commentaires</h1>
                    {activeTab === 'rejected' && comments.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"
                        >
                            <span>🗑️</span> Vider la corbeille
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-[#2a3142]">
                    <TabButton active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} label="En attente" count={null} />
                    <TabButton active={activeTab === 'approved'} onClick={() => setActiveTab('approved')} label="Validés" count={null} />
                    <TabButton active={activeTab === 'rejected'} onClick={() => setActiveTab('rejected')} label="Refusés" count={null} />
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">Chargement...</div>
                ) : comments.length === 0 ? (
                    <div className="bg-[#1f2533] p-12 rounded-lg text-center text-gray-400 border border-[#2a3142] border-dashed">
                        {activeTab === 'pending' && "Tout est propre ! Aucun commentaire en attente. ✨"}
                        {activeTab === 'approved' && "Aucun commentaire validé."}
                        {activeTab === 'rejected' && "Aucun commentaire refusé."}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map((comment) => (
                            <div key={comment.id} className="bg-[#1f2533] border border-[#2a3142] p-4 rounded-lg flex gap-4 transition-all hover:border-gray-600">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-[#2a3142] flex items-center justify-center text-[#ff6600] font-bold text-xs">
                                            {comment.username ? comment.username.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <span className="font-bold text-white">{comment.username}</span>
                                        <span className="text-gray-500 text-sm">
                                            • {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
                                        </span>
                                        <span className="text-gray-600 text-xs bg-[#0f121e] px-2 py-0.5 rounded">ID: {comment.id}</span>
                                    </div>
                                    <div className="bg-[#0f121e] p-3 rounded border border-[#2a3142] text-gray-200 whitespace-pre-wrap">
                                        {comment.content}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 justify-center w-32">
                                    {activeTab === 'pending' && (
                                        <>
                                            <ActionBtn onClick={() => handleStatusChange(comment.id, 'approved')} color="green" label="Valider" />
                                            <ActionBtn onClick={() => handleStatusChange(comment.id, 'rejected')} color="red" label="Refuser" />
                                        </>
                                    )}
                                    {activeTab === 'approved' && (
                                        <ActionBtn onClick={() => handleStatusChange(comment.id, 'rejected')} color="red" label="Refuser" />
                                    )}
                                    {activeTab === 'rejected' && (
                                        <ActionBtn onClick={() => handleStatusChange(comment.id, 'approved')} color="green" label="Réhabiliter" />
                                        // Individual delete could be added here if needed, but bulk exists.
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

function TabButton({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count: number | null }) {
    return (
        <button
            onClick={onClick}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${active
                    ? 'border-[#ff6600] text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
        >
            {label}
            {/* Count could be added later if API provides aggregation */}
        </button>
    );
}

function ActionBtn({ onClick, color, label }: { onClick: () => void, color: 'green' | 'red', label: string }) {
    const base = "px-3 py-1.5 rounded text-xs font-bold transition-colors w-full";
    const colors = color === 'green'
        ? "bg-green-600 hover:bg-green-700 text-white"
        : "bg-red-600 hover:bg-red-700 text-white";

    return (
        <button onClick={onClick} className={`${base} ${colors}`}>
            {label}
        </button>
    );
}
