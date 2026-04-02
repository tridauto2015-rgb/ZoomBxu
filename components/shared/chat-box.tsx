"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { MessageCircle, Send, X, User, ShieldCheck, Loader2, Paperclip, Image as ImageIcon, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { AuthModal } from "@/components/shared/auth-modal"
import { useAdmin } from "@/contexts/admin-context"
import { usePathname } from "next/navigation"

interface Message {
    id?: string
    created_at?: string
    content: string
    image_url?: string | null
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
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    // Unified identity: prioritize UUID, fallback to phone
    const userId = supabaseUser?.id || user?.phone || "anonymous"
    const userName = user?.name || "Guest"

    // Initialize audio and title handling
    useEffect(() => {
        audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3")
        audioRef.current.load()

        // Priming: Browsers require a user interaction to play sound.
        // We attempt to play silently or on first click to "unlock" the audio context.
        const unlockAudio = () => {
            if (audioRef.current) {
                audioRef.current.muted = true;
                audioRef.current.play().then(() => {
                    audioRef.current!.pause();
                    audioRef.current!.muted = false;
                    audioRef.current!.currentTime = 0;
                    window.removeEventListener('click', unlockAudio);
                }).catch(() => {});
            }
        };
        window.addEventListener('click', unlockAudio);
        return () => window.removeEventListener('click', unlockAudio);
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
        if (isAdmin) return;

        const channelName = `global-chat-notifs`; // Use a shared channel for all message inserts
        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
            }, (payload) => {
                const msg = payload.new as Message;
                
                // CATCH ALL: Listen for anything involving the user's UUID or Phone
                const myUUID = supabaseUser?.id;
                const myPhone = user?.phone;
                
                const isFromMe = (myUUID && msg.sender_id === myUUID) || (myPhone && msg.sender_id === myPhone);
                const isToMe = (myUUID && msg.recipient_id === myUUID) || (myPhone && msg.recipient_id === myPhone);
                
                if (!isFromMe && !isToMe) return;

                console.log("[ChatBox] Detected relevant event:", msg);

                // If sent to me by an Admin
                if (msg.is_admin && isToMe) {
                    setIsOpen(true);
                    if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play().catch(e => console.warn("Sound blocked", e));
                    }
                    toast.success("New message from Shop", { position: "top-right" });
                }

                // Add to messages list
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
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isAdmin, supabaseUser?.id, user?.phone]); 

    useEffect(() => {
        if (!isOpen) return
        fetchMessages()
        setUnreadCount(0)
    }, [isOpen, userId])

    useEffect(() => {
        if (scrollRef.current) {
            const timer = setTimeout(() => {
                scrollRef.current?.scrollIntoView({ behavior: messages.length <= 1 ? "auto" : "smooth" })
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [messages, isOpen])

    const fetchMessages = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${supabaseUser?.id},recipient_id.eq.${supabaseUser?.id},sender_id.eq.${user?.phone},recipient_id.eq.${user?.phone}`)
            .order('created_at', { ascending: true })

        if (data) {
            setMessages(prev => {
                // Merge data, but keep optimistic messages that haven't been resolved yet
                const incomingIds = new Set(data.map(m => m.id));
                const optimistic = prev.filter(m => m.id?.startsWith('temp-') && !data.some(d => d.content === m.content));
                return [...data, ...optimistic];
            })
        }
        setIsLoading(false)
    }
    
    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        // Show local preview
        const reader = new FileReader()
        reader.onload = (e) => setTempImageUrl(e.target?.result as string)
        reader.readAsDataURL(file)
        setSelectedFile(file)
    }
    
    const uploadImage = async (file: File): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${userId}/${Math.random()}.${fileExt}`
            const filePath = `chat-attachments/${fileName}`
            
            const { data, error } = await supabase.storage
                .from('chat-attachments')
                .upload(filePath, file)
                
            if (error) {
                // If bucket doesn't exist, this might fail. We should warn.
                if (error.message.includes('bucket not found')) {
                    toast.error("Storage bucket 'chat-attachments' not found. Please contact admin.")
                }
                throw error
            }
            
            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(filePath)
                
            return publicUrl
        } catch (error: any) {
            console.error("Upload error:", error)
            toast.error("Failed to upload image: " + error.message)
            return null
        }
    }

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!message.trim() && !selectedFile) return
        
        setIsUploading(true)
        let finalImageUrl = null
        
        if (selectedFile) {
            finalImageUrl = await uploadImage(selectedFile)
            if (!finalImageUrl) {
                setIsUploading(false)
                return // Stop if upload failed
            }
        }

        const msgContent = message
        const photoUrl = finalImageUrl
        
        setMessage("") // Optimistic: clear input
        setTempImageUrl(null)
        setSelectedFile(null)

        // Optimistic UI update
        const newMessage: Message = {
            id: 'temp-' + Math.random().toString(), // Temp ID
            content: msgContent,
            image_url: photoUrl,
            sender_id: userId,
            sender_name: userName,
            is_admin: false,
            recipient_id: 'admin',
            created_at: new Date().toISOString()
        }
        
        setMessages(prev => [...prev, newMessage])
        
        // Explicitly build the payload for total safety
        const payload: any = {
            content: newMessage.content,
            sender_id: newMessage.sender_id,
            sender_name: newMessage.sender_name,
            is_admin: newMessage.is_admin,
            recipient_id: newMessage.recipient_id,
        };
        
        if (newMessage.image_url) {
            payload.image_url = newMessage.image_url;
        }

        const { error } = await supabase.from('messages').insert([payload])

        setIsUploading(false)
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
            <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-96 h-[100dvh] sm:h-[650px] bg-background border-t sm:border border-border sm:rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
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
                                    {msg.image_url && (
                                        <div className="mb-2 relative rounded-lg overflow-hidden border border-white/10 shadow-sm max-w-[240px] mx-auto flex justify-center">
                                            <img 
                                                src={msg.image_url} 
                                                alt="Chat attachment" 
                                                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-300 cursor-zoom-in mx-auto"
                                                onClick={() => window.open(msg.image_url!, '_blank')}
                                            />
                                        </div>
                                    )}
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

                {/* Image Preview Overlay */}
                {tempImageUrl && (
                    <div className="mx-3 mb-2 p-2 bg-muted/50 rounded-xl flex items-center gap-3 relative animate-in slide-in-from-bottom-2">
                        <div className="h-14 w-14 rounded-lg overflow-hidden border border-border">
                            <img src={tempImageUrl} className="h-full w-full object-cover" alt="Preview" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold truncate">Image Ready to Send</p>
                            <p className="text-[9px] text-muted-foreground">Click send to upload</p>
                        </div>
                        <button 
                            onClick={() => {
                                setTempImageUrl(null)
                                setSelectedFile(null)
                            }}
                            className="p-1.5 hover:bg-background rounded-full text-muted-foreground hover:text-destructive transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-background flex gap-2 items-center">
                    <input 
                        type="file" 
                        id="chat-file-input"
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageSelect}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-xl shrink-0 text-muted-foreground hover:text-primary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!isAuthenticated || isUploading}
                    >
                        <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                        placeholder={isAuthenticated ? "Type a message..." : "Login to chat..."}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={!isAuthenticated || isLoading || isUploading}
                        className="flex-1 bg-muted/50 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!isAuthenticated || (!message.trim() && !selectedFile) || isLoading || isUploading}
                        className="rounded-xl shrink-0"
                    >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
