import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Search } from 'lucide-react';
import { supabase, Message } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type ConversationWithDetails = {
    id: string;
    other_user: {
        id: string;
        full_name: string;
        email: string;
    };
    last_message?: Message;
    unread_count: number;
    updated_at: string;
};

type MessagesModalProps = {
    onClose: () => void;
};

export default function MessagesModal({ onClose }: MessagesModalProps) {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) {
            fetchConversations();
            fetchUsers();
        }
    }, [user]);

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation);
            markAsRead(selectedConversation);
        }
    }, [selectedConversation]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Realtime subscription for messages
    useEffect(() => {
        if (!selectedConversation) return;

        const messageSubscription = supabase
            .channel(`messages-${selectedConversation}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${selectedConversation}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new as Message]);
                markAsRead(selectedConversation);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(messageSubscription);
        };
    }, [selectedConversation]);

    const fetchConversations = async () => {
        if (!user) return;

        const { data: participants } = await supabase
            .from('conversation_participants')
            .select('conversation_id, conversations(*)')
            .eq('user_id', user.id);

        if (!participants) return;

        const conversationDetails = await Promise.all(
            participants.map(async (p) => {
                // Get other participant
                const { data: otherParticipant } = await supabase
                    .from('conversation_participants')
                    .select('user_id, users(id, full_name, email)')
                    .eq('conversation_id', p.conversation_id)
                    .neq('user_id', user.id)
                    .single();

                // Get last message
                const { data: lastMessage } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', p.conversation_id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                // Count unread messages
                const { data: participant } = await supabase
                    .from('conversation_participants')
                    .select('last_read_at')
                    .eq('conversation_id', p.conversation_id)
                    .eq('user_id', user.id)
                    .single();

                const { count: unreadCount } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('conversation_id', p.conversation_id)
                    .neq('sender_id', user.id)
                    .gt('created_at', participant?.last_read_at || '1970-01-01');

                return {
                    id: p.conversation_id,
                    other_user: (otherParticipant?.users as any) || { id: '', full_name: 'Usuario', email: '' },
                    last_message: lastMessage || undefined,
                    unread_count: unreadCount || 0,
                    updated_at: (p.conversations as any)?.updated_at || ''
                };
            })
        );

        setConversations(conversationDetails.sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ));
        setLoading(false);
    };

    const fetchMessages = async (conversationId: string) => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (data) setMessages(data);
    };

    const fetchUsers = async () => {
        const { data } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('status', 'active')
            .neq('id', user?.id || '');

        if (data) setUsers(data);
    };

    const markAsRead = async (conversationId: string) => {
        if (!user) return;

        await supabase
            .from('conversation_participants')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .eq('user_id', user.id);

        fetchConversations();
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation || !user) return;

        const { error } = await supabase
            .from('messages')
            .insert([{
                conversation_id: selectedConversation,
                sender_id: user.id,
                content: newMessage.trim()
            }]);

        if (!error) {
            setNewMessage('');
        }
    };

    const startNewConversation = async (otherUserId: string) => {
        if (!user) return;

        // Check if conversation already exists
        const { data: existingParticipants } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user.id);

        if (existingParticipants) {
            for (const p of existingParticipants) {
                const { data: otherP } = await supabase
                    .from('conversation_participants')
                    .select('user_id')
                    .eq('conversation_id', p.conversation_id)
                    .eq('user_id', otherUserId)
                    .single();

                if (otherP) {
                    setSelectedConversation(p.conversation_id);
                    setShowNewChat(false);
                    return;
                }
            }
        }

        // Create new conversation
        const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert([{}])
            .select()
            .single();

        if (convError || !newConv) return;

        // Add participants
        await supabase
            .from('conversation_participants')
            .insert([
                { conversation_id: newConv.id, user_id: user.id },
                { conversation_id: newConv.id, user_id: otherUserId }
            ]);

        setSelectedConversation(newConv.id);
        setShowNewChat(false);
        fetchConversations();
    };

    const selectedConvDetails = conversations.find(c => c.id === selectedConversation);

    const filteredUsers = users.filter(u =>
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[600px] flex overflow-hidden">
                {/* Sidebar - Conversations List */}
                <div className="w-80 bg-[#f8f9fc] border-r border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-white">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-black text-[#002855] uppercase tracking-tight">Mensajes</h2>
                            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <button
                            onClick={() => setShowNewChat(true)}
                            className="w-full bg-[#002855] text-white py-2 rounded-lg font-bold text-sm hover:bg-[#003366] transition-colors flex items-center justify-center gap-2"
                        >
                            <MessageCircle size={16} />
                            Nuevo Chat
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-400 text-sm">Cargando...</div>
                        ) : conversations.length === 0 ? (
                            <div className="p-4 text-center text-gray-400 text-sm">No hay conversaciones</div>
                        ) : (
                            conversations.map((conv) => (
                                <div
                                    key={conv.id}
                                    onClick={() => setSelectedConversation(conv.id)}
                                    className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${selectedConversation === conv.id ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#002855] flex items-center justify-center text-white font-bold flex-shrink-0">
                                            {conv.other_user.full_name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="font-bold text-sm text-gray-800 truncate">{conv.other_user.full_name}</h3>
                                                {conv.unread_count > 0 && (
                                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                        {conv.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                            {conv.last_message && (
                                                <p className="text-xs text-gray-500 truncate">{conv.last_message.content}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col">
                    {showNewChat ? (
                        <div className="flex-1 flex flex-col">
                            <div className="p-4 border-b border-gray-200 bg-white">
                                <h3 className="font-bold text-gray-800 mb-3">Nuevo Chat</h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar usuario..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                {filteredUsers.map((u) => (
                                    <div
                                        key={u.id}
                                        onClick={() => startNewConversation(u.id)}
                                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-[#002855] flex items-center justify-center text-white font-bold">
                                            {u.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-800">{u.full_name}</p>
                                            <p className="text-xs text-gray-500">{u.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#002855] flex items-center justify-center text-white font-bold">
                                    {selectedConvDetails?.other_user.full_name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{selectedConvDetails?.other_user.full_name}</h3>
                                    <p className="text-xs text-gray-500">{selectedConvDetails?.other_user.email}</p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender_id === user?.id
                                                ? 'bg-[#002855] text-white'
                                                : 'bg-white text-gray-800 border border-gray-200'
                                                }`}
                                        >
                                            <p className="text-sm">{msg.content}</p>
                                            <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-blue-200' : 'text-gray-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="p-4 border-t border-gray-200 bg-white">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Escribe un mensaje..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!newMessage.trim()}
                                        className="bg-[#002855] text-white px-4 py-2 rounded-lg hover:bg-[#003366] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Selecciona una conversación o inicia un nuevo chat</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
