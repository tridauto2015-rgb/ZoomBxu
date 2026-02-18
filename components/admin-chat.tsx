"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { MessageSquare, Send, User, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
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

        // Subscribe to new messages globally for the admin
        const channel = supabase
            .channel('admin:messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                const msg = payload.new as Message
                fetchSessions() // Refresh sessions list

                if (activeSession && (msg.sender_id === activeSession || msg.recipient_id === activeSession)) {
                    setMessages((prev) => [...prev, msg])
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [activeSession])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    const fetchSessions = async () => {
        const { data, error } = await supabase
            .from('messages')
            .select('sender_id, sender_name, content, created_at')
            .order('created_at', { ascending: false })

        if (data) {
            // Group by sender_id to get unique chat sessions
            const uniqueSessions: Record<string, ChatSession> = {}
            data.forEach((msg: any) => {
                if (msg.sender_id !== 'admin' && !uniqueSessions[msg.sender_id]) {
                    uniqueSessions[msg.sender_id] = {
                        sender_id: msg.sender_id,
                        sender_name: msg.sender_name || 'Customer',
                        last_message: msg.content,
                        last_active: msg.created_at
                    }
                }
            })
            setSessions(Object.values(uniqueSessions))
        }
    }

    const fetchMessages = async (sessionId: string) => {
        setIsLoading(true)
        const { data, error } = await supabase
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

        const userName = sessions.find(s => s.sender_id === activeSession)?.sender_name || 'Customer'

        const { error } = await supabase.from('messages').insert([
            {
                content,
                sender_id: 'admin',
                sender_name: 'Admin',
                is_admin: true,
                recipient_id: activeSession
            }
        ])

        if (error) {
            console.error("Error sending message:", error)
            toast.error("Failed to send message")
        }
    }

    const filteredSessions = sessions.filter(s =>
        s.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.sender_id.includes(searchQuery)
    )

    return (
        <div className="flex bg-card border border-border rounded-xl overflow-hidden h-[600px] shadow-sm">
            {/* Sidebar: Chat List */}
            <div className="w-80 border-r border-border flex flex-col bg-muted/10">
                <div className="p-4 border-b border-border bg-background">
                    <h3 className="font-bold mb-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        Customer Chats
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search customer..."
                            className="pl-9 h-9 text-xs rounded-lg"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    {filteredSessions.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-xs text-muted-foreground">No active chats found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {filteredSessions.map((session) => (
                                <button
                                    key={session.sender_id}
                                    onClick={() => handleSelectSession(session.sender_id)}
                                    className={cn(
                                        "w-full p-4 text-left transition-colors hover:bg-primary/5 flex gap-3",
                                        activeSession === session.sender_id ? "bg-primary/10 border-r-2 border-primary" : ""
                                    )}
                                >
                                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                        <User className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className="font-bold text-sm truncate">{session.sender_name}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {new Date(session.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{session.last_message}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Main: Chat Area */}
            <div className="flex-1 flex flex-col bg-background">
                {activeSession ? (
                    <>
                        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                                    <User className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">
                                        {sessions.find(s => s.sender_id === activeSession)?.sender_name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">Device ID: {activeSession}</p>
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 p-6 bg-muted/5">
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex flex-col max-w-[75%]",
                                            msg.is_admin ? "items-end ml-auto" : "items-start"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                                                msg.is_admin
                                                    ? "bg-primary text-primary-foreground rounded-tr-none"
                                                    : "bg-white border border-border text-foreground rounded-tl-none"
                                            )}
                                        >
                                            {msg.content.split('\n').map((line, idx) => (
                                                <div key={idx}>
                                                    {line.match(/https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)/i) ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="break-words">{line.split('http')[0]}</span>
                                                            <img
                                                                src={line.match(/https?:\/\/\S+/i)?.[0]}
                                                                alt="Attached photo"
                                                                className="rounded-lg mt-1 max-w-sm w-full border border-black/5 shadow-sm"
                                                                onLoad={() => {
                                                                    if (scrollRef.current) {
                                                                        scrollRef.current.scrollIntoView({ behavior: "smooth" })
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="break-words">{line}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                            {new Date(msg.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-card flex gap-3">
                            <Input
                                placeholder="Type your reply..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="flex-1 rounded-xl h-12 bg-muted/30 border-none"
                            />
                            <Button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="h-12 w-12 rounded-xl p-0"
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                            <MessageSquare className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Your Inbox</h3>
                        <p className="text-muted-foreground max-w-sm">
                            Select a customer from the sidebar to view their order request and start a real-time conversation.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
