"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { ShoppingBag, XCircle, CheckCircle2, Phone, User, Clock, Trash2, Loader2, Zap, PackageCheck, Ban } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: '#181c27',
                border: `1px solid ${c.accent}33`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${c.accent}22`,
                minWidth: '300px',
                maxWidth: '380px',
                backdropFilter: 'blur(12px)',
                overflow: 'hidden',
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
}

export function AdminOrders() {
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)

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

    return (
        <div className="ord-wrap">
            {/* Header */}
            <div className="ord-header">
                <div>
                    <h2 className="ord-title">
                        <ShoppingBag className="h-5 w-5" />
                        Order Management
                    </h2>
                    <p className="ord-subtitle">View and manage all customer checkout requests.</p>
                </div>
                <button className="ord-refresh-btn" onClick={fetchOrders} disabled={isLoading}>
                    <Clock className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {/* Loading */}
            {isLoading && orders.length === 0 && (
                <div className="ord-empty">
                    <Loader2 className="h-10 w-10 animate-spin" style={{ color: 'var(--adm-amber)' }} />
                    <p>Loading orders…</p>
                </div>
            )}

            {/* Empty */}
            {!isLoading && orders.length === 0 && (
                <div className="ord-empty">
                    <ShoppingBag className="h-12 w-12" style={{ color: 'var(--adm-muted)' }} />
                    <h3 style={{ fontWeight: 700, marginTop: '0.5rem' }}>No orders yet</h3>
                    <p style={{ color: 'var(--adm-muted)', fontSize: '0.875rem' }}>Customer orders will appear here when they checkout.</p>
                </div>
            )}

            {/* Orders list */}
            {orders.length > 0 && (
                <div className="ord-list">
                    {/* Table head */}
                    <div className="ord-list-head">
                        <span>Customer</span>
                        <span>Items</span>
                        <span>Total</span>
                        <span>Status</span>
                        <span className="ord-col-actions-head">Actions</span>
                    </div>

                    {orders.map((order) => (
                        <div key={order.id} className="ord-row">
                            {/* Customer */}
                            <div className="ord-cell ord-customer">
                                <div className="ord-avatar">
                                    <User className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="ord-customer-name">{order.customer_name}</p>
                                    <p className="ord-customer-phone">
                                        <Phone className="h-3 w-3" />
                                        {order.customer_phone}
                                    </p>
                                    <p className="ord-ref">#{order.id.split('-')[0].toUpperCase()} · {new Date(order.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="ord-cell ord-items">
                                {order.items.map((item: any, idx: number) => (
                                    <div key={idx} className="ord-item-row">
                                        <span className="ord-item-name">{item.name}</span>
                                        <span className="ord-item-qty">×{item.quantity}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Total */}
                            <div className="ord-cell">
                                <span className="ord-total">{order.total_price}</span>
                            </div>

                            {/* Status */}
                            <div className="ord-cell">
                                <span className={statusClass(order.status)}>{order.status}</span>
                            </div>

                            {/* Actions */}
                            <div className="ord-cell ord-actions">
                                {order.status === 'pending' && (
                                    <button
                                        className="ord-btn ord-btn--process"
                                        onClick={() => updateStatus(order.id, 'processing')}
                                    >
                                        <Loader2 className="h-3.5 w-3.5" />
                                        Process
                                    </button>
                                )}
                                {order.status === 'processing' && (
                                    <button
                                        className="ord-btn ord-btn--complete"
                                        onClick={() => updateStatus(order.id, 'completed')}
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Complete
                                    </button>
                                )}
                                {(order.status === 'pending' || order.status === 'processing') && (
                                    <button
                                        className="ord-btn ord-btn--cancel"
                                        onClick={() => updateStatus(order.id, 'cancelled')}
                                        aria-label="Cancel order"
                                    >
                                        <XCircle className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                <button
                                    className="ord-btn ord-btn--delete"
                                    onClick={() => deleteOrder(order.id)}
                                    aria-label="Delete order"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
