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

export function AdminChat() {
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [activeSession, setActiveSession] = useState<string | null>(null)
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
                    setMessages((prev) => [...prev, msg])
                }
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [activeSession])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    const fetchSessions = async () => {
        const { data } = await supabase
            .from('messages')
            .select('sender_id, sender_name, content, created_at')
            .order('created_at', { ascending: false })
        if (data) {
            const uniqueSessions: Record<string, ChatSession> = {}
            data.forEach((msg: any) => {
                if (msg.sender_id !== 'admin' && !uniqueSessions[msg.sender_id]) {
                    uniqueSessions[msg.sender_id] = {
                        sender_id: msg.sender_id,
                        sender_name: msg.sender_name || 'Customer',
                        last_message: msg.content,
                        last_active: msg.created_at,
                    }
                }
            })
            setSessions(Object.values(uniqueSessions))
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
        const { error } = await supabase.from('messages').insert([{
            content,
            sender_id: 'admin',
            sender_name: 'Admin',
            is_admin: true,
            recipient_id: activeSession,
        }])
        if (error) toast.error("Failed to send message")
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
                                                {msg.content.split('\n').map((line, idx) => (
                                                    <div key={idx}>
                                                        {line.match(/https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)/i) ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <span>{line.split('http')[0]}</span>
                                                                <img
                                                                    src={line.match(/https?:\/\/\S+/i)?.[0]}
                                                                    alt="Attached photo"
                                                                    className="chat-bubble-img"
                                                                    onLoad={() => scrollRef.current?.scrollIntoView({ behavior: "smooth" })}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span style={{ wordBreak: 'break-word' }}>{line}</span>
                                                        )}
                                                    </div>
                                                ))}
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
