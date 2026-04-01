"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { MessageSquare, Send, User, Loader2, Search, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Message {
    id: string
    created_at: string
    content: string
    sender_id: string
    sender_name: string
    is_admin: boolean
    recipient_id: string
}

interface ChatSession {
    sender_id: string
    sender_name: string
    last_message: string
    last_active: string
}

export function AdminChat({ initialSessionId }: { initialSessionId?: string | null }) {
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [activeSession, setActiveSession] = useState<string | null>(initialSessionId || null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchSessions()
        const channel = supabase
            .channel('admin:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
                const msg = payload.new as Message
                fetchSessions()
                if (activeSession && (msg.sender_id === activeSession || msg.recipient_id === activeSession)) {
                    setMessages((prev) => {
                        // 1. Prevent exact duplicate by UUID
                        if (prev.some(m => m.id === msg.id)) return prev;
                        
                        // 2. Identify if this is a server-confirmation of a local 'temp' message
                        // We check for matching content and that the local one is a 'temp-' ID
                        const tempIdx = prev.findIndex(m => m.id?.startsWith('temp-') && m.content === msg.content);
                        
                        if (tempIdx !== -1) {
                            const updated = [...prev];
                            updated[tempIdx] = msg; // Swap temp for real UUID from server
                            return updated;
                        }
                        
                        return [...prev, msg];
                    });
                }
            })
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Subscribed to admin messages channel.`)
                }
                if (status === 'CHANNEL_ERROR') {
                    console.warn("Real-time for admin failed. Please check if 'Realtime' is enabled for 'messages' table in Supabase project dashboard.")
                }
            })
        return () => { supabase.removeChannel(channel) }
    }, [activeSession])

    useEffect(() => {
        if (initialSessionId) {
            handleSelectSession(initialSessionId)
        }
    }, [initialSessionId])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "auto" })
        }
    }, [messages])

    const fetchSessions = async () => {
        const { data } = await supabase
            .from('messages')
            .select('sender_id, sender_name, recipient_id, content, created_at')
            .order('created_at', { ascending: false })
            
        if (data) {
            // Priority 1: UUID string, Priority 2: Phone number, Priority 3: anonymous/other
            const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

            const idGroupMap: Record<string, ChatSession> = {}
            
            data.forEach((msg: any) => {
                const customerId = msg.sender_id === 'admin' ? msg.recipient_id : msg.sender_id;
                const customerName = msg.sender_id === 'admin' ? null : msg.sender_name;
                
                if (!customerId || customerId === 'admin') return;

                if (!idGroupMap[customerId]) {
                    idGroupMap[customerId] = {
                        sender_id: customerId,
                        sender_name: customerName || 'Customer',
                        last_message: msg.content,
                        last_active: msg.created_at,
                    }
                } else if (!idGroupMap[customerId].sender_name || idGroupMap[customerId].sender_name === 'Customer') {
                    if (customerName) idGroupMap[customerId].sender_name = customerName;
                }
            })

            const finalSessionsMap: Record<string, ChatSession> = {}
            
            Object.values(idGroupMap).forEach(session => {
                const name = session.sender_name;
                const isProfessionalName = name && !['Guest', 'anonymous', 'User', 'Customer'].includes(name);
                const mergeKey = isProfessionalName ? name : session.sender_id;

                if (!finalSessionsMap[mergeKey]) {
                    finalSessionsMap[mergeKey] = session;
                } else {
                    const existing = finalSessionsMap[mergeKey];
                    // Pick the best ID: UUID wins over anything else
                    if (!isUUID(existing.sender_id) && isUUID(session.sender_id)) {
                        existing.sender_id = session.sender_id;
                    }
                    // Keep most recent activity
                    if (new Date(session.last_active) > new Date(existing.last_active)) {
                        existing.last_active = session.last_active;
                        existing.last_message = session.last_message;
                    }
                }
            })

            setSessions(Object.values(finalSessionsMap).sort((a, b) => 
                new Date(b.last_active).getTime() - new Date(a.last_active).getTime()
            ))
        }
    }

    const fetchMessages = async (sessionId: string) => {
        setIsLoading(true)
        const { data } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${sessionId},recipient_id.eq.${sessionId}`)
            .order('created_at', { ascending: true })
        if (data) setMessages(data)
        setIsLoading(false)
    }

    const handleSelectSession = (id: string) => {
        setActiveSession(id)
        fetchMessages(id)
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || !activeSession) return
        const content = newMessage
        setNewMessage("")
        // Optimistic UI for admin
        const msgObj: Message = {
            id: 'temp-' + Math.random().toString(), // Use temp prefix for local 
            created_at: new Date().toISOString(),
            content,
            sender_id: 'admin',
            sender_name: 'Admin',
            is_admin: true,
            recipient_id: activeSession,
        }
        setMessages(prev => [...prev, msgObj])
        fetchSessions() // Update sidebar immediately

        // Prepare object for Supabase (Omit the temp ID to avoid UUID type error)
        const { id, ...supabaseData } = msgObj;

        const { error } = await supabase.from('messages').insert([supabaseData])
        if (error) {
            console.error("Admin Send Error:", error)
            toast.error(`Failed to send: ${error.message}`)
            setMessages(prev => prev.filter(m => m.id !== msgObj.id)) // Rollback
        }
    }

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm("Are you sure you want to delete this message?")) return
        
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId)
        
        if (error) {
            toast.error("Failed to delete message")
        } else {
            setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
            toast.success("Message deleted")
        }
    }

    const filteredSessions = sessions.filter((s) =>
        s.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.sender_id.includes(searchQuery)
    )

    return (
        <div className="chat-wrap">
            {/* Sidebar */}
            <div className="chat-sidebar">
                <div className="chat-sidebar-head">
                    <h3 className="chat-sidebar-title">
                        <MessageSquare className="h-4 w-4" />
                        Customer Chats
                    </h3>
                    <div className="chat-search-wrap">
                        <Search className="chat-search-icon h-3.5 w-3.5" />
                        <input
                            type="text"
                            placeholder="Search customer…"
                            className="chat-search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="chat-session-list">
                    {filteredSessions.length === 0 ? (
                        <div className="chat-empty-sidebar">
                            <p>No active chats found.</p>
                        </div>
                    ) : (
                        filteredSessions.map((session) => (
                            <button
                                key={session.sender_id}
                                onClick={() => handleSelectSession(session.sender_id)}
                                className={cn(
                                    "chat-session-btn",
                                    activeSession === session.sender_id && "chat-session-btn--active"
                                )}
                            >
                                <div className="chat-avatar">
                                    <User className="h-4 w-4" />
                                </div>
                                <div className="chat-session-info">
                                    <div className="chat-session-top">
                                        <span className="chat-session-name">{session.sender_name}</span>
                                        <span className="chat-session-time">
                                            {new Date(session.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="chat-session-preview">{session.last_message}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div className="chat-main">
                {activeSession ? (
                    <>
                        {/* Chat header */}
                        <div className="chat-main-head">
                            <div className="chat-avatar">
                                <User className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="chat-main-name">
                                    {sessions.find((s) => s.sender_id === activeSession)?.sender_name}
                                </p>
                                <p className="chat-main-id">ID: {activeSession}</p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="chat-messages">
                            {isLoading ? (
                                <div className="chat-loading">
                                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--adm-amber)' }} />
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn("chat-msg", msg.is_admin ? "chat-msg--admin" : "chat-msg--customer")}
                                    >
                                        <div className={cn("chat-bubble", msg.is_admin ? "chat-bubble--admin" : "chat-bubble--customer")}>
                                            <div className="chat-bubble-content">
                                                {(() => {
                                                    const lines = msg.content.split('\n');
                                                    
                                                    return (
                                                        <div className="space-y-1 w-full overflow-hidden">
                                                            {lines.map((line, idx) => {
                                                                const isHeader = line.includes("I would like to checkout");
                                                                const isSummaryLine = line.includes("(x") && line.includes("- ₱");
                                                                const isFeeLine = line.includes("Fee):") || line.includes("Delivery Fee:");
                                                                const isImageLabel = line.endsWith(":");

                                                                if (isHeader) return <p key={idx} className="font-bold border-b border-white/10 pb-1 mb-2 text-[10px] uppercase tracking-widest opacity-80">{line}</p>;
                                                                
                                                                if (line.match(/https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)/i)) {
                                                                    const url = line.match(/https?:\/\/\S+/i)?.[0];
                                                                    return (
                                                                        <div key={idx} className="mt-2 relative overflow-hidden rounded-lg border border-white/5 bg-black/5">
                                                                            <img src={url} alt="Order attachment" className="chat-bubble-img h-auto max-w-full rounded-lg object-contain m-0" />
                                                                        </div>
                                                                    );
                                                                }

                                                                if (isSummaryLine) return <div key={idx} className="flex justify-between items-center bg-white/5 border border-white/5 px-2 py-1 rounded text-[11px] font-mono"><span className="opacity-80 truncate mr-2">{line.split('-')[0]}</span><span className="font-bold">{line.split('-')[1]}</span></div>;
                                                                if (isFeeLine) return <div key={idx} className="text-[10px] font-black uppercase tracking-tighter opacity-50 mt-1 text-right">{line}</div>;
                                                                if (isImageLabel) return <p key={idx} className="text-[9px] font-black uppercase tracking-[0.2em] mt-3 mb-1 opacity-40">{line}</p>;
                                                                
                                                                return line.trim() ? <div key={idx} className="whitespace-pre-wrap break-words min-w-0">{line}</div> : null;
                                                            })}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            {!msg.is_admin && (
                                                <button
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className="chat-delete-btn"
                                                    aria-label="Delete message"
                                                    title="Delete message"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                        <span className="chat-msg-time">
                                            {new Date(msg.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))
                            )}
                            <div ref={scrollRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="chat-input-row">
                            <input
                                type="text"
                                placeholder="Type your reply…"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="chat-input"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="chat-send-btn"
                                aria-label="Send"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="chat-placeholder">
                        <div className="chat-placeholder-icon">
                            <MessageSquare className="h-8 w-8" />
                        </div>
                        <h3 className="chat-placeholder-title">Your Inbox</h3>
                        <p className="chat-placeholder-text">Select a customer from the left to start a conversation.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
