"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { ShoppingBag, XCircle, CheckCircle2, Phone, User, Clock, Trash2, Loader2, Zap, PackageCheck, Ban, MapPin, Play, ChevronDown, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { cn, formatCurrency, calculateDistance, STORE_LOCATION } from "@/lib/utils"
import dynamic from "next/dynamic"

const OrderTrackingMap = dynamic(() => import('./order-tracking-map'), { 
    ssr: false,
    loading: () => <div className="h-[200px] w-full mt-4 flex items-center justify-center bg-muted/20 animate-pulse border border-border rounded-xl text-xs text-muted-foreground uppercase tracking-widest">Loading Admin Viewer...</div>
})

// ── Unique admin status toasts ─────────────────────────────────
function showStatusToast(status: string) {
    const configs: Record<string, {
        icon: React.ReactNode
        title: string
        description: string
        accent: string
        bg: string
    }> = {
        processing: {
            icon: <Zap className="h-5 w-5" style={{ color: '#4f8ef7' }} />,
            title: 'Now Processing',
            description: 'This order has been picked up and is being prepared.',
            accent: '#4f8ef7',
            bg: 'rgba(79,142,247,0.10)',
        },
        completed: {
            icon: <PackageCheck className="h-5 w-5" style={{ color: '#34d399' }} />,
            title: 'Order Complete',
            description: 'Great job! This order has been fulfilled successfully.',
            accent: '#34d399',
            bg: 'rgba(52,211,153,0.10)',
        },
        cancelled: {
            icon: <Ban className="h-5 w-5" style={{ color: '#f87171' }} />,
            title: 'Order Cancelled',
            description: 'This order has been cancelled and the customer notified.',
            accent: '#f87171',
            bg: 'rgba(248,113,113,0.10)',
        },
    }

    const c = configs[status]
    if (!c) return

    toast.custom((t) => (
        <div
            className="animate-in fade-in zoom-in-95 duration-500"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 20px',
                borderRadius: '16px',
                background: 'rgba(24, 28, 39, 0.85)',
                border: `1.5px solid ${c.accent}40`,
                boxShadow: `0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px ${c.accent}15`,
                minWidth: '320px',
                maxWidth: '420px',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            }}
        >
            {/* Icon */}
            <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: c.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: `1px solid ${c.accent}30`,
            }}>
                {c.icon}
            </div>
            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: '#e8eaf0',
                    letterSpacing: '-0.02em',
                    margin: 0,
                }}>{c.title}</p>
                <p style={{
                    fontSize: '0.775rem',
                    color: '#8892a4',
                    marginTop: '3px',
                    lineHeight: 1.4,
                }}>{c.description}</p>
            </div>
            {/* Dismiss */}
            <button
                onClick={() => toast.dismiss(t)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8892a4',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    lineHeight: 1,
                    padding: '2px',
                    flexShrink: 0,
                }}
                aria-label="Dismiss"
            >✕</button>
        </div>
    ), {
        duration: 4000,
        // Strip Sonner's default wrapper entirely
        className: '!p-0 !bg-transparent !border-none !shadow-none !rounded-none !w-auto',
        style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
    })
}

function showDeleteToast() {
    toast.custom((t) => (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#181c27',
                border: '1px solid rgba(248,113,113,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                minWidth: '260px',
                maxWidth: '340px',
            }}
        >
            <Trash2 style={{ color: '#f87171', width: 16, height: 16, flexShrink: 0 }} />
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#e8eaf0', margin: 0, flex: 1 }}>
                Order record deleted
            </p>
            <button
                onClick={() => toast.dismiss(t)}
                style={{ background: 'transparent', border: 'none', color: '#8892a4', cursor: 'pointer', fontSize: '0.9rem' }}
                aria-label="Dismiss"
            >✕</button>
        </div>
    ), {
        duration: 3000,
        className: '!p-0 !bg-transparent !border-none !shadow-none !rounded-none !w-auto',
        style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
    })
}

interface Order {
    id: string
    created_at: string
    customer_name: string
    customer_phone: string
    items: any[]
    total_price: string
    status: 'pending' | 'processing' | 'cancelled' | 'completed'
    customer_lat?: number
    customer_lng?: number
    location_name?: string
    user_id?: string
}

export function AdminOrders() {
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [viewingMapId, setViewingMapId] = useState<string | null>(null)
    const [broadcastingOrderId, setBroadcastingOrderId] = useState<string | null>(null)
    const watchIdRef = useRef<number | null>(null)

    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
        }
    }, [])

    useEffect(() => {
        fetchOrders()
        const channel = supabase
            .channel('orders_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchOrders = async () => {
        setIsLoading(true)
        const { data } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
        if (data) setOrders(data)
        setIsLoading(false)
    }

    const updateStatus = async (id: string, newStatus: Order['status']) => {
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id)
        if (error) {
            toast.error("Failed to update order status")
        } else {
            showStatusToast(newStatus)
            fetchOrders()
        }
    }

    const deleteOrder = async (id: string) => {
        if (!confirm("Are you sure you want to delete this order record?")) return
        const { error } = await supabase.from('orders').delete().eq('id', id)
        if (error) {
            toast.error("Failed to delete order")
        } else {
            showDeleteToast()
            fetchOrders()
        }
    }

    const statusClass = (status: Order['status']) => {
        if (status === 'pending') return 'ord-status ord-status--pending'
        if (status === 'processing') return 'ord-status ord-status--processing'
        if (status === 'completed') return 'ord-status ord-status--completed'
        return 'ord-status ord-status--cancelled'
    }

    const toggleBroadcastLocation = async (orderId: string) => {
        if (broadcastingOrderId === orderId) {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
            setBroadcastingOrderId(null)
            return
        }

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
        }
        
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your device/browser.")
            return
        }

        setBroadcastingOrderId(orderId)

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude: lat, longitude: lng } = position.coords
                
                await supabase.from('order_tracking').upsert({
                    order_id: orderId,
                    lat,
                    lng,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'order_id' })
            },
            (error) => {
                console.error("GPS Watch Error:", error)
                toast.error("Failed to retrieve GPS location. Ensure location permissions are granted.")
                if (watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current)
                    watchIdRef.current = null
                }
                setBroadcastingOrderId(null)
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 10000 // Require fresh location
            }
        )
    }

    const startDelivery = async (orderId: string) => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported. Cannot start delivery.")
            return
        }

        const loadToast = toast.loading("Acquiring GPS hardware lock...", { position: 'top-center' })

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                toast.dismiss(loadToast)
                const { latitude: lat, longitude: lng } = position.coords
                
                // 1. Save initial real location immediately
                await supabase.from('order_tracking').upsert({
                    order_id: orderId,
                    lat,
                    lng,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'order_id' })

                // 2. Set to processing only after GPS succeeds
                const { error } = await supabase.from('orders').update({ status: 'processing' }).eq('id', orderId)
                if (error) {
                    toast.error("Failed to update order status")
                    return
                }
                
                showStatusToast('processing')
                fetchOrders()

                // 3. Auto-open map and start broadcasting
                setViewingMapId(orderId)
                
                if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
                setBroadcastingOrderId(orderId)

                watchIdRef.current = navigator.geolocation.watchPosition(
                    async (pos) => {
                        await supabase.from('order_tracking').upsert({
                            order_id: orderId,
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'order_id' })
                    },
                    (err) => {
                        console.error("GPS Watch Error:", err)
                        toast.error("GPS connection lost tracking during delivery.")
                    },
                    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
                )
            },
            (error) => {
                toast.dismiss(loadToast)
                toast.error("Location permission denied/failed. Cannot initiate delivery without live tracking active.", { 
                    duration: 6000,
                    style: { background: '#f87171', color: 'white' }
                })
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
    }

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true,
            month: '2-digit', day: '2-digit', year: 'numeric'
        }).replace(',', '')
    }

    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

    const toggleExpand = (id: string) => {
        setExpandedOrderId(prev => prev === id ? null : id)
    }

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 border-b border-white/5 relative">
                <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter flex items-center gap-3 text-white font-russo-one uppercase italic">
                        <ShoppingBag className="h-8 w-8 text-primary" />
                        Order Management
                    </h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">High-Performance Logistics & Component Distribution</p>
                </div>
                <button 
                    className="group bg-white/10 hover:bg-primary/20 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all flex items-center gap-3 justify-center border border-white/10 shadow-xl active:scale-95 hover:border-primary/30" 
                    onClick={fetchOrders} 
                    disabled={isLoading}
                >
                    <div className="relative">
                        <Clock className={cn("h-4 w-4 text-primary transition-transform group-hover:rotate-180 duration-500", isLoading && "animate-spin")} />
                        {isLoading && <div className="absolute inset-0 bg-primary/20 blur-sm animate-pulse rounded-full" />}
                    </div>
                    Refresh Feed
                </button>
            </div>

            {/* Loading */}
            {isLoading && orders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Syncing Databanks...</p>
                </div>
            )}

            {/* Empty */}
            {!isLoading && orders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border/50 rounded-2xl bg-muted/10 animate-in fade-in zoom-in-95 duration-500">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                    <h3 className="text-xl font-black text-foreground">No orders yet</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm">New customer orders matching the routing criteria will populate here dynamically.</p>
                </div>
            )}

            {/* Orders List */}
            {orders.length > 0 && (
                <div className="space-y-3">
                    {/* Desktop Headers */}
                    <div className="hidden lg:grid lg:grid-cols-7 gap-4 px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground border-b border-border/50 mb-4">
                        <span className="col-span-1">Time</span>
                        <span className="col-span-1">Customer</span>
                        <span className="col-span-2">Items</span>
                        <span className="col-span-1">Location</span>
                        <span className="col-span-1 text-center">Status</span>
                        <span className="col-span-1 text-right">Expansion</span>
                    </div>

                    {orders.map((order) => {
                        const isExpanded = expandedOrderId === order.id;
                        const isBroadcasting = broadcastingOrderId === order.id;

                        // Admin Slate theme consistent coloring
                        let badgeColors = "bg-[var(--adm-surface2)] text-[var(--adm-muted)] border-[var(--adm-border2)]";
                        if (order.status === 'pending') badgeColors = "bg-[var(--adm-amber-bg)] text-[var(--adm-amber)] border-[var(--adm-amber)]/20";
                        if (order.status === 'processing') badgeColors = "bg-[var(--adm-blue-bg)] text-[var(--adm-blue)] border-[var(--adm-blue)]/20";
                        if (order.status === 'completed') badgeColors = "bg-[var(--adm-emerald-bg)] text-[var(--adm-emerald)] border-[var(--adm-emerald)]/20";
                        if (order.status === 'cancelled') badgeColors = "bg-[var(--adm-red-bg)] text-[var(--adm-red)] border-[var(--adm-red)]/20";

                        return (
                            <div 
                                key={order.id} 
                                className={cn(
                                    "bg-[var(--adm-surface)] border-[var(--adm-border2)] rounded-3xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.2,1,0.3,1)]",
                                    isExpanded 
                                        ? "border-primary/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] ring-1 ring-primary/20 scale-[1.01] z-10" 
                                        : "shadow-sm hover:border-[var(--adm-border2)] hover:shadow-2xl hover:bg-white/[0.01]"
                                )}
                            >
                                {/* Visible Row (Clickable) */}
                                <div 
                                    className="p-5 lg:px-8 lg:py-6 cursor-pointer relative group bg-transparent transition-colors"
                                    onClick={() => toggleExpand(order.id)}
                                >
                                    {/* Broadcasting Indicator Glow */}
                                    {isBroadcasting && (
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse" />
                                    )}

                                    {/* Mobile/Tablet View (Block Layout) */}
                                    <div className="flex flex-col gap-5 lg:hidden animate-in slide-in-from-top-4 duration-500">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2">
                                                <h3 className="font-black text-2xl leading-none font-russo-one italic text-white tracking-tight flex items-center gap-3">
                                                    {order.customer_name}
                                                    {isBroadcasting && <span className="flex h-2.5 w-2.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span></span>}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-[10px] font-black font-mono text-muted-foreground/60 uppercase tracking-tighter">{formatTime(order.created_at)}</span>
                                                    <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em]", badgeColors)}>
                                                        {order.status}
                                                    </div>
                                                    {order.location_name && (
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black font-mono text-muted-foreground/60 uppercase tracking-tighter truncate max-w-[150px]">
                                                            <MapPin className="h-3 w-3" />
                                                            {order.location_name}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronDown className={cn("h-7 w-7 text-muted-foreground/30 transition-transform duration-500 ease-[cubic-bezier(0.2,1,0.3,1)]", isExpanded && "rotate-180 text-primary")} />
                                        </div>
                                        <div className="flex justify-between items-center bg-white/[0.03] p-4 rounded-2xl border border-white/5 shadow-inner">
                                            <p className="text-[10px] font-black font-mono text-muted-foreground/60 uppercase tracking-tighter truncate pr-4">
                                                {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                            </p>
                                            <span className="text-sm font-black text-white font-russo-one italic ml-auto shrink-0">
                                                ₱ {(() => {
                                                    const val = typeof order.total_price === 'number' ? order.total_price : parseFloat(String(order.total_price).replace(/[^\d.-]/g, ''));
                                                    return isNaN(val) ? order.total_price : val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                })()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Desktop View (Grid Layout) */}
                                    <div className="hidden lg:grid lg:grid-cols-7 gap-4 items-center w-full">
                                        <div className="col-span-1 text-[10px] font-black font-mono text-muted-foreground/60 uppercase tracking-tighter">
                                            {formatTime(order.created_at)}
                                        </div>
                                        <div className="col-span-1 font-black text-lg flex items-center gap-2 tracking-tight text-white">
                                            {order.customer_name}
                                            {isBroadcasting && <span className="flex h-2.5 w-2.5 relative shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span></span>}
                                        </div>
                                        <div className="col-span-2 text-[10px] font-black font-mono text-muted-foreground/60 uppercase tracking-tighter truncate pr-4">
                                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                        </div>
                                        <div className="col-span-1">
                                            {order.location_name ? (
                                                <div className="flex items-center gap-2 text-[10px] font-black font-mono text-muted-foreground/60 uppercase tracking-tighter truncate max-w-[130px]" title={order.location_name}>
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    {order.location_name}
                                                </div>
                                            ) : order.customer_lat ? (
                                                <div className="flex items-center gap-2 text-[10px] font-black font-mono text-muted-foreground/60 uppercase tracking-tighter">
                                                    <MapPin className="h-3 w-3" />
                                                    Pinned
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black font-mono text-muted-foreground/60 uppercase tracking-tighter opacity-30">Manual</span>
                                            )}
                                        </div>
                                        <div className="col-span-1 flex justify-center">
                                            <span className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm whitespace-nowrap", badgeColors)}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="col-span-1 flex justify-end pr-2">
                                            <div className={cn(
                                                "h-8 w-8 rounded-full flex items-center justify-center transition-colors duration-300 group-hover:bg-primary/10",
                                                isExpanded && "bg-primary/10 text-primary"
                                            )}>
                                                <ChevronDown className={cn("h-5 w-5 text-muted-foreground/40 transition-transform duration-500 ease-[cubic-bezier(0.2,1,0.3,1)]", isExpanded && "rotate-180 text-primary")} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content View (Smooth CSS expansion) */}
                                <div className={cn(
                                    "grid transition-all duration-700 ease-[cubic-bezier(0.2,1,0.3,1)]",
                                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                )}>
                                    <div className="overflow-hidden">
                                        <div className="p-6 lg:p-10 border-t border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent relative">
                                            {/* Technical grid overlay */}
                                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--adm-text) 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
                                            
                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 relative">
                                                
                                                {/* Left Column: Details & Actions */}
                                                <div className="lg:col-span-5 space-y-6">
                                                    
                                                    {/* Contact Box */}
                                                    <div className="bg-[var(--adm-surface)] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6">
                                                        <div className="flex justify-between items-center">
                                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Logistics Contact</h4>
                                                            {order.customer_lat && (
                                                                <a 
                                                                    href={`https://www.google.com/maps?q=${order.customer_lat},${order.customer_lng}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-[9px] font-black text-blue-500 hover:text-blue-400 transition-colors uppercase flex items-center gap-1.5 bg-blue-500/5 px-2 py-1 rounded"
                                                                >
                                                                    Location <Play className="h-2 w-2 rotate-[-45deg]" />
                                                                </a>
                                                            )}
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-3">
                                                                <a 
                                                                    href={`tel:${order.customer_phone}`}
                                                                    className="flex-1 flex items-center gap-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 p-4 rounded-2xl transition-all group/call"
                                                                >
                                                                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover/call:bg-primary group-hover/call:text-black transition-all rotate-[-10deg] group-hover/call:rotate-0 shadow-lg shadow-primary/10"><Phone className="h-5 w-5"/></div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Dispatcher Link</span>
                                                                        <span className="font-mono text-sm font-black tracking-wider text-slate-200">{order.customer_phone}</span>
                                                                    </div>
                                                                </a>
                                                                <button 
                                                                    onClick={() => window.dispatchEvent(new CustomEvent('nav-to-chat', { detail: order.user_id || order.customer_phone }))}
                                                                    className="h-16 w-16 rounded-2xl flex items-center justify-center transition-all bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black shadow-lg shadow-amber-500/5 group/chat"
                                                                >
                                                                    <MessageCircle className="h-6 w-6 transition-transform group-hover/chat:scale-110" />
                                                                </button>
                                                            </div>
                                                            {order.location_name && (
                                                                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-start gap-4">
                                                                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 border border-blue-500/10"><MapPin className="h-5 w-5" /></div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Drop Point Coordinates</span>
                                                                        <span className="text-[11px] font-bold text-slate-200 leading-tight mt-1">{order.location_name}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Receipt Box */}
                                                    <div className="bg-[var(--adm-surface)] border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden group/receipt">
                                                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 transition-colors group-hover/receipt:bg-primary/10" />
                                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex justify-between items-center">
                                                            <span>Order Invoice</span>
                                                            <span className="font-mono text-primary bg-primary/20 px-2 py-0.5 rounded border border-primary/30">REF: {order.id.split('-')[0].toUpperCase()}</span>
                                                        </h4>
                                                        <div className="space-y-3 mb-6">
                                                            {order.items.map((item: any, idx: number) => (
                                                                <div key={idx} className="flex justify-between items-start text-sm animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${idx * 50}ms` }}>
                                                                    <div className="flex gap-3 text-slate-400">
                                                                        <span className="font-black text-white min-w-[24px]">{item.quantity}x</span>
                                                                        <span className="font-medium text-[13px] leading-tight text-slate-200">{item.name}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Fee Breakdown */}
                                                        <div className="space-y-2 py-4 border-t border-white/5">
                                                            <div className="flex justify-between text-[11px] font-bold">
                                                                <span className="text-slate-500 uppercase tracking-wider">Subtotal</span>
                                                                <span className="text-white font-mono">
                                                                    {(() => {
                                                                        const lat = order.customer_lat;
                                                                        const lng = order.customer_lng;
                                                                        const dist = (lat && lng) ? calculateDistance(STORE_LOCATION.lat, STORE_LOCATION.lng, lat, lng) : 0;
                                                                        const fee = dist * 5;
                                                                        const total = typeof order.total_price === 'string' ? parseFloat(order.total_price) : order.total_price;
                                                                        const subtotal = Math.max(0, total - fee);
                                                                        return "₱ " + subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                                    })()}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between text-[11px] font-bold">
                                                                <span className="text-slate-500 uppercase tracking-wider">Delivery Fee</span>
                                                                <span className="text-white font-mono">
                                                                    {(() => {
                                                                        const lat = order.customer_lat;
                                                                        const lng = order.customer_lng;
                                                                        const dist = (lat && lng) ? calculateDistance(STORE_LOCATION.lat, STORE_LOCATION.lng, lat, lng) : 0;
                                                                        const fee = dist * 5;
                                                                        return fee > 0 
                                                                            ? "₱ " + fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                                            : "₱ 0.00";
                                                                    })()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="pt-5 border-t border-dashed border-white/10 flex justify-between items-center">
                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</span>
                                                            <span className="text-2xl font-black text-white font-russo-one italic drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                                                ₱ {(() => {
                                                                    const val = typeof order.total_price === 'number' ? order.total_price : parseFloat(String(order.total_price).replace(/[^\d.-]/g, ''));
                                                                    return isNaN(val) ? order.total_price : val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                                })()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Mission Controls (Context-Aware Actions) */}
                                                    <div className="space-y-4">
                                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Mission Controls</h4>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {order.status === 'pending' && (
                                                                <button
                                                                    className="col-span-2 relative h-14 overflow-hidden rounded-2xl bg-primary text-black font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_20px_-5px_rgba(var(--primary),0.4)] group/btn"
                                                                    onClick={() => startDelivery(order.id)}
                                                                >
                                                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                                                                    <div className="relative flex items-center justify-center gap-3">
                                                                        <Zap className="h-4 w-4 fill-black" />
                                                                        Initiate Delivery
                                                                    </div>
                                                                </button>
                                                            )}

                                                            {order.status === 'processing' && (
                                                                <button
                                                                    className="col-span-2 relative h-14 overflow-hidden rounded-2xl bg-emerald-500 text-black font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_20px_-5px_rgba(16,185,129,0.4)] group/btn"
                                                                    onClick={() => {
                                                                        if (broadcastingOrderId === order.id && watchIdRef.current !== null) {
                                                                            navigator.geolocation.clearWatch(watchIdRef.current)
                                                                            setBroadcastingOrderId(null)
                                                                        }
                                                                        updateStatus(order.id, 'completed')
                                                                    }}
                                                                >
                                                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                                                                    <div className="relative flex items-center justify-center gap-3">
                                                                        <CheckCircle2 className="h-5 w-5 fill-black" />
                                                                        Confirm Delivered
                                                                    </div>
                                                                </button>
                                                            )}

                                                            {(order.status === 'pending' || order.status === 'processing') && (
                                                                <button
                                                                    className="h-12 rounded-xl bg-white/5 hover:bg-destructive/10 text-destructive font-black text-[10px] uppercase tracking-widest border border-white/5 hover:border-destructive/20 transition-all flex items-center justify-center gap-2"
                                                                    onClick={() => updateStatus(order.id, 'cancelled')}
                                                                >
                                                                    <XCircle className="h-4 w-4" />
                                                                    Cancel
                                                                </button>
                                                            )}
                                                            
                                                            <button
                                                                className={cn(
                                                                    "h-12 rounded-xl bg-white/5 hover:bg-destructive/10 text-destructive font-black text-[10px] uppercase tracking-widest border border-white/5 hover:border-destructive/20 transition-all flex items-center justify-center gap-2",
                                                                    (order.status === 'pending' || order.status === 'processing') ? "col-span-1" : "col-span-2"
                                                                )}
                                                                onClick={() => deleteOrder(order.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>

                                                </div>

                                                {/* Right Column: GPS Tracking */}
                                                <div className="lg:col-span-7">
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center justify-between">
                                                        <span>Routing & Telemetry</span>
                                                        {order.customer_lat && order.customer_lng && (
                                                            <span className="text-primary font-mono lowercase opacity-60 flex items-center gap-1">
                                                                <MapPin className="h-3 w-3"/>
                                                                {order.customer_lat.toFixed(4)}, {order.customer_lng.toFixed(4)}
                                                            </span>
                                                        )}
                                                    </h4>
                                                    
                                                    {order.customer_lat && order.customer_lng ? (
                                                        <div className="relative border border-border/80 rounded-2xl overflow-hidden shadow-sm bg-card group/map">
                                                            {/* Live Broadcast Toggle Overlay */}
                                                            {order.status === 'processing' && (
                                                                <div className="absolute top-3 right-3 z-[1000]">
                                                                    <button
                                                                        onClick={() => toggleBroadcastLocation(order.id)}
                                                                        className={cn(
                                                                            "flex items-center gap-2 font-black uppercase tracking-widest text-[10px] px-3 py-2 rounded-xl backdrop-blur-md transition-all shadow-lg active:scale-95 border",
                                                                            isBroadcasting 
                                                                                ? "bg-rose-500/20 text-rose-500 border-rose-500/30 hover:bg-rose-500/30" 
                                                                                : "bg-background/80 text-foreground border-border hover:bg-background"
                                                                        )}
                                                                    >
                                                                        {isBroadcasting ? (
                                                                            <>
                                                                                <span className="relative flex h-2 w-2">
                                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                                                                </span>
                                                                                Stop Broadcast
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Play className="h-3 w-3" />
                                                                                Live Broadcast
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            )}

                                                            <div className="h-[340px] w-full">
                                                                <OrderTrackingMap orderId={order.id} customerLocation={{ lat: order.customer_lat, lng: order.customer_lng }} />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-[340px] w-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/50 rounded-2xl bg-muted/10">
                                                            <div className="h-16 w-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                                                                <MapPin className="h-8 w-8 text-muted-foreground opacity-40" />
                                                            </div>
                                                            <h3 className="font-bold text-foreground mb-1">No Hardware Telemetry</h3>
                                                            <p className="text-sm text-muted-foreground w-full max-w-xs mx-auto leading-relaxed">
                                                                This is a legacy order missing precise GPS constraints. Cannot calculate a routing path.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
