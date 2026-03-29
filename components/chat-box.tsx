"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { MessageCircle, Send, X, User, ShieldCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { AuthModal } from "./auth-modal"
import { useAdmin } from "@/contexts/admin-context"
import { usePathname } from "next/navigation"

interface Message {
    id?: string
    created_at?: string
    content: string
    sender_id: string
    sender_name: string
    is_admin: boolean
    recipient_id: string
}

export function ChatBox() {
    const { user, isAuthenticated, supabaseUser } = useAuth()
    const { isAdmin } = useAdmin()
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)

    const [message, setMessage] = useState("")
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const scrollRef = useRef<HTMLDivElement>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // Unified identity: prioritize UUID, fallback to phone
    const userId = supabaseUser?.id || user?.phone || "anonymous"
    const userName = user?.name || "Guest"

    // Initialize audio and title handling
    useEffect(() => {
        audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3")
        audioRef.current.load()
    }, [])

    useEffect(() => {
        if (unreadCount > 0) {
            const originalTitle = document.title
            const interval = setInterval(() => {
                document.title = document.title === originalTitle
                    ? `(${unreadCount}) New Message!`
                    : originalTitle
            }, 1000)
            return () => {
                clearInterval(interval)
                document.title = originalTitle
            }
        }
    }, [unreadCount])

    useEffect(() => {
        const handleOpenChat = () => {
            setIsOpen(true)
        }

        window.addEventListener('open-chat', handleOpenChat)

        return () => {
            window.removeEventListener('open-chat', handleOpenChat)
        }
    }, [])

    // Background Listener for Notifications
    useEffect(() => {
        if (isAdmin) return

        const channel = supabase
            .channel(`notifs:${userId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
                // Removed filter to rely on RLS and more robust ID matching
            }, (payload) => {
                const msg = payload.new as Message

                // Play sound for all incoming admin messages
                if (msg.is_admin) {
                    const playPromise = audioRef.current?.play()
                    if (playPromise !== undefined) {
                        playPromise.catch(e => {
                            console.log("Audio play blocked: Interaction required.")
                        })
                    }

                    // Increment unread count if chat is closed
                    if (!isOpen) {
                        setUnreadCount(prev => prev + 1)
                    }
                }

                // If chat is open and relevant to us, add to messages list
                if (isOpen && (msg.sender_id === userId || msg.recipient_id === userId)) {
                    setMessages((prev) => {
                        // Prevent exact duplicate by UUID
                        if (prev.some(m => m.id === msg.id)) return prev;
                        
                        // Swap temp for real if this is our own message coming back (sent from another tab maybe)
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
                    console.log(`Real-time listener armed for user: ${userId}`)
                }
                if (status === 'CHANNEL_ERROR') {
                    console.warn("Real-time for customer failed. Please check Supabase replication settings.")
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [isAdmin, userId, isOpen])

    useEffect(() => {
        if (!isOpen) return

        // When opening, fetch messages and clear unread
        fetchMessages()
        setUnreadCount(0)
    }, [isOpen])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    const fetchMessages = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
            .order('created_at', { ascending: true })

        if (data) setMessages(data)
        setIsLoading(false)
    }

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!message.trim()) return

        const msgContent = message
        setMessage("") // Optimistic: clear input

        // Optimistic UI update
        const newMessage: Message = {
            id: 'temp-' + Math.random().toString(), // Temp ID
            content: msgContent,
            sender_id: userId,
            sender_name: userName,
            is_admin: false,
            recipient_id: 'admin',
            created_at: new Date().toISOString()
        }
        
        setMessages(prev => [...prev, newMessage])

        const { error } = await supabase.from('messages').insert([
            {
                content: msgContent,
                sender_id: userId,
                sender_name: userName,
                is_admin: false,
                recipient_id: 'admin'
            }
        ])

        if (error) {
            console.error("Supabase Error:", error)
            toast.error(`Error: ${error.message || 'Failed to send'}`)
            // Rollback optimistic update
            setMessages(prev => prev.filter(m => m.id !== newMessage.id))
        }
    }

    if (isAdmin && pathname?.startsWith('/admin')) return null

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 p-0 overflow-visible"
            >
                <MessageCircle className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-background animate-in zoom-in duration-300">
                        {unreadCount}
                    </span>
                )}
            </Button>
        )
    }

    return (
        <>
            {/* Backdrop Blur */}
            <div
                className="fixed inset-0 bg-background/20 backdrop-blur-[2px] z-[45] animate-in fade-in duration-300"
                onClick={() => setIsOpen(false)}
            />
            <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-96 h-[100dvh] sm:h-[540px] bg-background border-t sm:border border-border sm:rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="bg-primary p-4 text-primary-foreground flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm text-white">Chat with Admin</p>
                            <p className="text-[10px] opacity-80 text-white">We're online to help</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                        <X className="h-5 w-5 text-white" />
                    </button>
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4 bg-muted/30">
                    <div className="space-y-4">
                        {messages.length === 0 && !isLoading && (
                            <div className="text-center py-8">
                                <p className="text-xs text-muted-foreground">Start a conversation with our admin regarding your order.</p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div
                                key={msg.id || i}
                                className={cn(
                                    "flex flex-col max-w-[85%]",
                                    msg.is_admin ? "items-start" : "items-end ml-auto"
                                )}
                            >
                                <div
                                    className={cn(
                                        "px-3 py-2 rounded-2xl text-sm shadow-sm",
                                        msg.is_admin
                                            ? "bg-white border border-border text-foreground rounded-tl-none"
                                            : "bg-primary text-primary-foreground rounded-tr-none"
                                    )}
                                >
                                    {(() => {
                                        const isOrderMessage = msg.content.includes("I would like to checkout");
                                        const lines = msg.content.split('\n');
                                        
                                        return (
                                            <div className="space-y-1">
                                                {lines.map((line, idx) => {
                                                    const isHeader = line.includes("I would like to checkout");
                                                    const isSummaryLine = line.includes("(x") && line.includes("- ₱");
                                                    const isFeeLine = line.includes("Fee):") || line.includes("Delivery Fee:");
                                                    const isImageLabel = line.endsWith(":");

                                                    if (isHeader) return <p key={idx} className="font-bold border-b border-primary-foreground/20 pb-1 mb-2 text-xs uppercase tracking-widest">{line}</p>;
                                                    
                                                    if (line.match(/https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)/i)) {
                                                        const url = line.match(/https?:\/\/\S+/i)?.[0];
                                                        return (
                                                            <div key={idx} className="mt-2 group/img relative overflow-hidden rounded-xl border border-white/10 shadow-lg">
                                                                <img src={url} alt="Order attachment" className="max-w-full h-auto object-cover transform transition-transform group-hover/img:scale-105 duration-500" />
                                                            </div>
                                                        );
                                                    }

                                                    if (isSummaryLine) return <div key={idx} className="flex justify-between items-center bg-black/10 px-2 py-1 rounded text-[11px] font-mono"><span className="opacity-80 truncate mr-2">{line.split('-')[0]}</span><span className="font-bold">{line.split('-')[1]}</span></div>;
                                                    if (isFeeLine) return <div key={idx} className="text-[10px] font-black uppercase tracking-tighter opacity-70 mt-2 text-right">{line}</div>;
                                                    if (isImageLabel) return <p key={idx} className="text-[9px] font-black uppercase tracking-[0.2em] mt-3 mb-1 text-primary-foreground/60">{line}</p>;
                                                    
                                                    return line.trim() ? <div key={idx} className="whitespace-pre-wrap break-words min-w-0">{line}</div> : null;
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                    {msg.is_admin ? "Admin" : "You"} • {new Date(msg.created_at || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-background flex gap-2 items-center">
                    <Input
                        placeholder={isAuthenticated ? "Type a message..." : "Login to chat..."}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={!isAuthenticated || isLoading}
                        className="flex-1 bg-muted/50 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!isAuthenticated || !message.trim() || isLoading}
                        className="rounded-xl shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
                {!isAuthenticated && (
                    <div
                        className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex items-center justify-center p-6 text-center z-20 cursor-pointer"
                        onClick={() => setIsOpen(false)}
                    >
                        <div
                            className="relative bg-background border border-border p-6 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 cursor-default"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute right-3 top-3 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <User className="h-8 w-8 mx-auto mb-2 text-primary" />
                            <h4 className="font-bold text-base mb-1">Authentication Required</h4>
                            <p className="text-xs text-muted-foreground mb-4">Please sign in to chat with our admin about your orders.</p>
                            <Button
                                onClick={() => setAuthModalOpen(true)}
                                className="w-full font-bold"
                                size="sm"
                            >
                                Sign In to Chat
                            </Button>
                        </div>
                    </div>
                )}
                <AuthModal
                    isOpen={authModalOpen}
                    onClose={() => setAuthModalOpen(false)}
                    onSuccess={() => setAuthModalOpen(false)}
                />
            </div>
        </>
    )
}
