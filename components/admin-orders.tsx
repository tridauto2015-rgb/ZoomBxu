"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShoppingBag, XCircle, CheckCircle2, Phone, User, Clock, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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

        // Real-time subscription to order updates
        const channel = supabase
            .channel('orders_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchOrders()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchOrders = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) setOrders(data)
        setIsLoading(false)
    }

    const updateStatus = async (id: string, newStatus: Order['status']) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', id)

        if (error) {
            toast.error("Failed to update order status")
        } else {
            const statusMsg = newStatus === 'processing' ? 'Order is now being processed' : `Order marked as ${newStatus}`
            toast.success(statusMsg)
            fetchOrders()
        }
    }

    const deleteOrder = async (id: string) => {
        if (!confirm("Are you sure you want to delete this order record?")) return

        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error("Failed to delete order")
        } else {
            toast.success("Order deleted")
            fetchOrders()
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ShoppingBag className="h-6 w-6 text-primary" />
                        Order Management
                    </h2>
                    <p className="text-sm text-muted-foreground">View and manage all customer checkout requests.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchOrders} disabled={isLoading}>
                    <Clock className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {isLoading && orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="font-medium">Loading orders...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-bold">No orders yet</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                        Customer orders will appear here automatically when they proceed to checkout.
                    </p>
                </div>
            ) : (
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[200px]">Customer</TableHead>
                                <TableHead>Items Ordered</TableHead>
                                <TableHead>Total Price</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order.id} className="transition-colors hover:bg-muted/30">
                                    <TableCell className="align-top">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 font-bold">
                                                <User className="h-3.5 w-3.5 text-primary" />
                                                {order.customer_name}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Phone className="h-3.5 w-3.5" />
                                                {order.customer_phone}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground/60 block pt-1">
                                                Ref: {order.id.split('-')[0].toUpperCase()}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {new Date(order.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <div className="space-y-1">
                                            {order.items.map((item: any, idx: number) => (
                                                <div key={idx} className="text-sm flex justify-between gap-10">
                                                    <span className="font-medium">{item.name}</span>
                                                    <span className="text-muted-foreground text-xs whitespace-nowrap">x{item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top font-bold text-primary">
                                        {order.total_price}
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Badge
                                            className={cn(
                                                "capitalize border-none px-3 py-1 font-bold shadow-sm",
                                                order.status === 'pending' && "bg-amber-100 text-amber-700 hover:bg-amber-100",
                                                order.status === 'processing' && "bg-blue-100 text-blue-700 hover:bg-blue-100",
                                                order.status === 'completed' && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
                                                order.status === 'cancelled' && "bg-rose-100 text-rose-700 hover:bg-rose-100"
                                            )}
                                        >
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right align-top">
                                        <div className="flex justify-end gap-2">
                                            {order.status === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    className="h-8 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold shadow-lg shadow-indigo-200 border-none transition-all active:scale-95"
                                                    onClick={() => updateStatus(order.id, 'processing')}
                                                >
                                                    <Loader2 className="mr-1.5 h-3.5 w-3.5" />
                                                    Process
                                                </Button>
                                            )}
                                            {order.status === 'processing' && (
                                                <Button
                                                    size="sm"
                                                    className="h-8 bg-[#10b981] hover:bg-[#059669] text-white font-bold shadow-lg shadow-emerald-200 border-none transition-all active:scale-95"
                                                    onClick={() => updateStatus(order.id, 'completed')}
                                                >
                                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                                    Complete
                                                </Button>
                                            )}
                                            {(order.status === 'pending' || order.status === 'processing') && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-bold"
                                                    onClick={() => updateStatus(order.id, 'cancelled')}
                                                >
                                                    <XCircle className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => deleteOrder(order.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
