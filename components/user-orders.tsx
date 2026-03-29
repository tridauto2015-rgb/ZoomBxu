"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

export function UserOrders() {
    const { user, isAuthenticated } = useAuth()
    const [orders, setOrders] = useState<any[]>([])
    const [isBouncing, setIsBouncing] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!isAuthenticated || !user?.phone) {
            setOrders([])
            return
        }

        fetchUserOrders()

        const channel = supabase
            .channel(`user-orders-nav:${user.phone}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `customer_phone=eq.${user.phone}`
            }, () => {
                fetchUserOrders()
                setIsBouncing(true)
                setTimeout(() => setIsBouncing(false), 2000)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [isAuthenticated, user?.phone])

    const fetchUserOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select('status')
            .eq('customer_phone', user?.phone)

        if (data) setOrders(data)
    }

    const activeCount = orders.filter(o => o.status === 'pending' || o.status === 'processing').length

    if (!mounted || !user) return null

    return (
        <Link href="/orders">
            <Button variant="outline" size="icon" className={cn(
                "relative h-11 w-11 rounded-xl border-border bg-background transition-all hover:bg-muted shadow-sm",
                isBouncing && "animate-cart-bounce"
            )}>
                <ShoppingBag className="h-5 w-5" />
                {activeCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
                        {activeCount}
                    </span>
                )}
                <span className="sr-only">My Orders</span>
            </Button>
        </Link>
    )
}
