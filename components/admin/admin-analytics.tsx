"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useProducts } from "@/contexts/products-context"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { Activity, Package, ShoppingCart, TrendingUp } from "lucide-react"

interface Order {
    id: string
    created_at: string
    items: any[]
    total_price: number
    status: 'pending' | 'processing' | 'cancelled' | 'completed'
}

export function AdminAnalytics() {
    const { products } = useProducts()
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchOrders()
        const channel = supabase
            .channel('analytics_orders_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchOrders = async () => {
        setIsLoading(true)
        const { data } = await supabase
            .from('orders')
            .select('id, created_at, items, total_price, status')
        if (data) setOrders(data)
        setIsLoading(false)
    }

    // --- Metrics Computations ---
    const totalProducts = products.length

    // Valid orders = not cancelled
    const validOrders = useMemo(() => orders.filter(o => o.status !== 'cancelled'), [orders])
    const totalOrdersCount = validOrders.length

    const totalRevenue = useMemo(() => orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (Number(o.total_price) || 0), 0), [orders])

    // --- Chart Data Computations ---
    
    // Group by Date for Orders and Revenue
    const dailyData = useMemo(() => {
        const grouped: Record<string, { date: string; orders: number; revenue: number }> = {}
        
        validOrders.forEach(order => {
            const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            if (!grouped[dateStr]) {
                grouped[dateStr] = { date: dateStr, orders: 0, revenue: 0 }
            }
            grouped[dateStr].orders += 1
            if (order.status === 'completed') {
                grouped[dateStr].revenue += (Number(order.total_price) || 0)
            }
        })

        // Sort by date realistically (assuming recent data, sorting by string might be imperfect for cross-year, but good enough for short ranges)
        return Object.values(grouped).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }, [validOrders])

    // Top Selling Products
    const topProducts = useMemo(() => {
        const productCounts: Record<string, number> = {}
        
        validOrders.forEach(order => {
            if (Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (item.name) {
                        productCounts[item.name] = (productCounts[item.name] || 0) + (item.quantity || 1)
                    }
                })
            }
        })

        const sorted = Object.entries(productCounts)
            .map(([name, sales]) => ({ name, sales }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5) // Top 5
            
        return sorted
    }, [validOrders])

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <Activity className="w-8 h-8 text-[#f4a732] animate-pulse mb-4" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Syncing Telemetry...</span>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Revenue Card */}
                <div className="bg-[#181c27] border border-white/5 p-5 md:p-6 rounded-sm shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#f4a732]/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-[#f4a732]/10 transition-colors duration-500" />
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Revenue</h3>
                        <div className="w-8 h-8 rounded-full bg-[#f4a732]/10 flex items-center justify-center text-[#f4a732] border border-[#f4a732]/20">
                            <span className="font-black text-sm">₱</span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tighter text-white">₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                {/* Orders Card */}
                <div className="bg-[#181c27] border border-white/5 p-5 md:p-6 rounded-sm shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#4f8ef7]/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-[#4f8ef7]/10 transition-colors duration-500" />
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Orders</h3>
                        <div className="w-8 h-8 rounded-full bg-[#4f8ef7]/10 flex items-center justify-center text-[#4f8ef7] border border-[#4f8ef7]/20">
                            <ShoppingCart className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tighter text-white">{totalOrdersCount}</span>
                    </div>
                </div>

                {/* Products Card */}
                <div className="bg-[#181c27] border border-white/5 p-5 md:p-6 rounded-sm shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#34d399]/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-[#34d399]/10 transition-colors duration-500" />
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Products</h3>
                        <div className="w-8 h-8 rounded-full bg-[#34d399]/10 flex items-center justify-center text-[#34d399] border border-[#34d399]/20">
                            <Package className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tighter text-white">{totalProducts}</span>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                
                {/* Revenue Overview (Line Chart) */}
                <div className="bg-[#181c27] border border-white/5 p-5 md:p-6 rounded-sm shadow-xl flex flex-col min-h-[350px]">
                    <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                        <TrendingUp className="w-4 h-4 text-[#f4a732]" />
                        <h3 className="text-xs font-black uppercase tracking-[0.15em] text-white">Revenue Timeline</h3>
                    </div>
                    <div className="flex-1 w-full relative">
                        {dailyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis 
                                        dataKey="date" 
                                        stroke="#8892a4" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        dy={10}
                                    />
                                    <YAxis 
                                        stroke="#8892a4" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(value) => `₱${value}`}
                                        dx={-10}
                                    />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#11141d', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '12px' }}
                                        itemStyle={{ color: '#f4a732', fontWeight: 'bold' }}
                                        formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Revenue']}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="revenue" 
                                        stroke="#f4a732" 
                                        strokeWidth={3} 
                                        dot={{ fill: '#0f1117', stroke: '#f4a732', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, fill: '#f4a732', stroke: '#fff' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Insufficient Data</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Orders Overview (Line Chart) */}
                <div className="bg-[#181c27] border border-white/5 p-5 md:p-6 rounded-sm shadow-xl flex flex-col min-h-[350px]">
                    <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                        <Activity className="w-4 h-4 text-[#4f8ef7]" />
                        <h3 className="text-xs font-black uppercase tracking-[0.15em] text-white">Order Volume</h3>
                    </div>
                    <div className="flex-1 w-full relative">
                        {dailyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis 
                                        dataKey="date" 
                                        stroke="#8892a4" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        dy={10}
                                    />
                                    <YAxis 
                                        stroke="#8892a4" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        dx={-10}
                                        allowDecimals={false}
                                    />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#11141d', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '12px' }}
                                        itemStyle={{ color: '#4f8ef7', fontWeight: 'bold' }}
                                        formatter={(value: number) => [value, 'Orders']}
                                    />
                                    <Line 
                                        type="stepAfter" 
                                        dataKey="orders" 
                                        stroke="#4f8ef7" 
                                        strokeWidth={3} 
                                        dot={{ fill: '#0f1117', stroke: '#4f8ef7', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, fill: '#4f8ef7', stroke: '#fff' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Insufficient Data</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Selling Products (Bar Chart) */}
                <div className="bg-[#181c27] border border-white/5 p-5 md:p-6 rounded-sm shadow-xl flex flex-col min-h-[350px] lg:col-span-2">
                    <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                        <Package className="w-4 h-4 text-[#34d399]" />
                        <h3 className="text-xs font-black uppercase tracking-[0.15em] text-white">Asset Movement (Top Sellers)</h3>
                    </div>
                    <div className="flex-1 w-full relative">
                        {topProducts.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" stroke="#8892a4" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        stroke="#8892a4" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false}
                                        width={120}
                                        tick={{ fill: '#e8eaf0' }}
                                    />
                                    <RechartsTooltip 
                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                        contentStyle={{ backgroundColor: '#11141d', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '12px' }}
                                        itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                                        formatter={(value: number) => [value, 'Units Sold']}
                                    />
                                    <Bar dataKey="sales" fill="#34d399" radius={[0, 4, 4, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Insufficient Data</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
