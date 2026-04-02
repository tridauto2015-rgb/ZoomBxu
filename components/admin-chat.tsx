"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { MessageSquare, Send, User, Loader2, Search, Trash2, ArrowLeft, TerminalSquare } from "lucide-react"
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
                        if (prev.some(m => m.id === msg.id)) return prev;
                        const tempIdx = prev.findIndex(m => m.id?.startsWith('temp-') && m.content === msg.content);
                        if (tempIdx !== -1) {
                            const updated = [...prev];
                            updated[tempIdx] = msg;
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
                    console.warn("Real-time for admin failed.")
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
                    if (!isUUID(existing.sender_id) && isUUID(session.sender_id)) {
                        existing.sender_id = session.sender_id;
                    }
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
        const msgObj: Message = {
            id: 'temp-' + Math.random().toString(),
            created_at: new Date().toISOString(),
            content,
            sender_id: 'admin',
            sender_name: 'Admin',
            is_admin: true,
            recipient_id: activeSession,
        }
        setMessages(prev => [...prev, msgObj])
        fetchSessions()
        const { id, ...supabaseData } = msgObj;
        const { error } = await supabase.from('messages').insert([supabaseData])
        if (error) {
            console.error("Admin Send Error:", error)
            toast.error(`Failed to send: ${error.message}`)
            setMessages(prev => prev.filter(m => m.id !== msgObj.id))
        }
    }

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm("Are you sure you want to delete this message?")) return
        const { error } = await supabase.from('messages').delete().eq('id', messageId)
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
        <div className="flex flex-col md:flex-row h-[calc(100vh-200px)] md:h-[calc(100vh-120px)] my-[10px] md:my-0 max-h-[850px] border border-white/5 bg-[#0f1117] shadow-2xl relative overflow-hidden rounded-xl">
            
            {/* Sidebar (List View) */}
            <div className={cn(
                "w-full md:w-[320px] shrink-0 border-r border-white/5 flex flex-col bg-[#181c27]",
                activeSession ? "hidden md:flex" : "flex h-full"
            )}>
                {/* Header & Search */}
                <div className="p-4 border-b border-white/5 bg-[#11141d] flex flex-col gap-4 sticky top-0 z-10">
                    <h3 className="flex items-center gap-2 font-black text-white text-sm tracking-widest uppercase">
                        <TerminalSquare className="w-4 h-4 text-[#f4a732]" />
                        Active Chats
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Query database..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0a0a0b] border border-white/10 text-white text-xs pl-9 pr-3 py-2.5 rounded-sm outline-none focus:ring-0 focus:border-[#f4a732] transition-colors"
                        />
                    </div>
                </div>

                {/* Session List */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 relative">
                    <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[#f4a732]/20 to-transparent" />
                    {filteredSessions.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center">
                            <TerminalSquare className="w-8 h-8 text-slate-700 mb-3" />
                            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">No Records Found</p>
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y divide-white/5">
                            {filteredSessions.map((session) => (
                                <button
                                    key={session.sender_id}
                                    onClick={() => handleSelectSession(session.sender_id)}
                                    className={cn(
                                        "w-full text-left p-4 hover:bg-white/[0.02] transition-colors group relative flex items-start gap-3",
                                        activeSession === session.sender_id && "bg-[#f4a732]/[0.05] border-r-2 border-[#f4a732]"
                                    )}
                                >
                                    <div className="w-8 h-8 shrink-0 bg-[#f4a732]/10 border border-[#f4a732]/20 flex items-center justify-center text-[#f4a732] group-hover:scale-105 transition-transform">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-bold text-sm text-white truncate pr-2">{session.sender_name}</span>
                                            <span className="text-[9px] text-slate-500 font-bold whitespace-nowrap tracking-wider">
                                                {new Date(session.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 truncate w-full">{session.last_message}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Thread Area */}
            <div className={cn(
                "flex-1 flex flex-col min-w-0 bg-[#0f1117]",
                !activeSession ? "hidden md:flex" : "flex h-full"
            )}>
                {activeSession ? (
                    <>
                        {/* Chat Header */}
                        <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-[#181c27]">
                            <button 
                                onClick={() => setActiveSession(null)} 
                                className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="w-8 h-8 shrink-0 bg-[#1e2336] border border-white/10 flex items-center justify-center text-slate-400">
                                <User className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm text-white truncate">
                                    {sessions.find((s) => s.sender_id === activeSession)?.sender_name}
                                </span>
                                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono truncate">
                                    ID: {activeSession.substring(0, 8)}...
                                </span>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-white/10 bg-[#0a0a0b] relative">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.02] to-transparent pointer-events-none" />
                            {isLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-[#f4a732]" />
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn("flex flex-col max-w-[85%] md:max-w-[75%] relative z-10", msg.is_admin ? "ml-auto items-end" : "items-start")}
                                    >
                                        <div className={cn(
                                            "p-3 text-sm relative group rounded-sm border",
                                            msg.is_admin 
                                                ? "bg-[#f4a732] text-black border-[#f4a732] rounded-br-none" 
                                                : "bg-[#181c27] text-[#e8eaf0] border-white/10 rounded-bl-none"
                                        )}>
                                            <div className="font-medium whitespace-pre-wrap break-words min-w-0 leading-relaxed">
                                                {(() => {
                                                    const lines = msg.content.split('\n');
                                                    return (
                                                        <div className="space-y-1 overflow-hidden">
                                                            {lines.map((line, idx) => {
                                                                const isHeader = line.includes("I would like to checkout");
                                                                const isSummaryLine = line.includes("(x") && line.includes("- ₱");
                                                                const isFeeLine = line.includes("Fee):") || line.includes("Delivery Fee:");
                                                                const isImageLabel = line.endsWith(":");

                                                                if (isHeader) return <p key={idx} className={cn("font-black border-b pb-1 mb-2 text-[10px] uppercase tracking-[0.15em]", msg.is_admin ? "border-black/20 text-black/80" : "border-white/10 text-white/80")}>{line}</p>;
                                                                
                                                                if (line.match(/https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)/i)) {
                                                                    const url = line.match(/https?:\/\/\S+/i)?.[0];
                                                                    return (
                                                                        <div key={idx} className="mt-2 p-1 bg-black/10 border border-black/5 rounded-sm">
                                                                            <img src={url} alt="Attachment" className="max-w-[200px] h-auto object-contain rounded-sm" />
                                                                        </div>
                                                                    );
                                                                }

                                                                if (isSummaryLine) return <div key={idx} className={cn("flex justify-between items-center px-2 py-1 rounded-sm text-[10px] md:text-xs font-mono font-bold mt-1", msg.is_admin ? "bg-black/10" : "bg-white/5 border border-white/5")}><span className="opacity-80 truncate mr-2">{line.split('-')[0]}</span><span>{line.split('-')[1]}</span></div>;
                                                                if (isFeeLine) return <div key={idx} className={cn("text-[9px] font-black uppercase tracking-widest mt-2 px-1", msg.is_admin ? "text-right" : "text-right text-slate-400")}>{line}</div>;
                                                                if (isImageLabel) return <p key={idx} className={cn("text-[9px] font-black uppercase tracking-[0.2em] mt-3 mb-1", msg.is_admin ? "text-black/60" : "text-white/40")}>{line}</p>;
                                                                
                                                                return line.trim() ? <div key={idx}>{line}</div> : null;
                                                            })}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Action Overlay */}
                                            {!msg.is_admin && (
                                                <button
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className="absolute -right-8 top-2 p-1.5 bg-red-500/10 hover:bg-red-500/30 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-red-500/20"
                                                    aria-label="Delete message"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 px-1">
                                            {new Date(msg.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))
                            )}
                            <div ref={scrollRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-white/5 bg-[#181c27] flex items-end gap-2 relative z-10">
                            <div className="flex-1 bg-[#0a0a0b] border border-white/10 rounded-sm focus-within:border-[#f4a732] transition-colors p-1">
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Execute command or transmit message..."
                                    className="w-full bg-transparent text-white text-xs px-3 py-2 outline-none focus:ring-0 resize-none h-10 max-h-32 min-h-10 scrollbar-thin font-medium"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            handleSendMessage(e)
                                        }
                                    }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="h-10 px-4 bg-[#f4a732] hover:bg-[#c8841a] text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center justify-center rounded-sm"
                                aria-label="Send"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0a0b] relative z-10 h-full">
                        <TerminalSquare strokeWidth={1} className="w-16 h-16 text-[#f4a732]/20 mb-4" />
                        <h3 className="text-white font-black uppercase tracking-widest text-sm mb-1">Communications Hub</h3>
                        <p className="text-slate-500 text-xs font-medium">Select a node to establish connection.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
