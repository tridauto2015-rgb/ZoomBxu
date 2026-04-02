"use client"

import { useState } from "react"
import { useAdmin } from "@/contexts/admin-context"
import { Eye, EyeOff, Lock, Hexagon, TerminalSquare } from "lucide-react"
import { cn } from "@/lib/utils"

export function AdminLogin() {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAdmin()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (login(password)) {
      setError("")
    } else {
      setError("Invalid password")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] p-4 relative overflow-hidden font-sans selection:bg-[#f4a732]/30">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#181c27] to-transparent pointer-events-none opacity-50" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#f4a732]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 flex items-center justify-center bg-[#f4a732] text-black shadow-[4px_4px_0px_rgba(255,255,255,0.05)] border border-[#c8841a] mb-6 hover:scale-105 transition-transform duration-500">
                <Hexagon strokeWidth={2.5} className="w-10 h-10 fill-current" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">ZoomBXU</h1>
            <p className="mt-2 text-[10px] text-[#f4a732] uppercase tracking-[0.25em] font-bold">Control Center Access</p>
        </div>

        {/* Login Container */}
        <div className="bg-[#181c27] border border-white/5 p-6 md:p-8 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#f4a732] via-[#f4a732]/50 to-transparent" />
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center gap-2 mb-2 text-slate-400">
                    <TerminalSquare strokeWidth={1.5} className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em]">Authentication Required</span>
                </div>

                <div className="space-y-2">
                    <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                        Admin Protocol Key
                    </label>
                    <div className="relative group">
                        <Lock strokeWidth={1.5} className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-[#f4a732] transition-colors" />
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#0f1117] border border-white/10 text-white pl-10 pr-10 py-3 text-sm font-mono tracking-widest focus:outline-none focus:ring-0 focus:border-[#f4a732] rounded-sm transition-colors"
                            placeholder="••••••••••••"
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff strokeWidth={1.5} className="h-4 w-4" /> : <Eye strokeWidth={1.5} className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-center animate-in slide-in-from-top-2 duration-200">
                        Authentication Failed
                    </div>
                )}

                <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#f4a732] hover:bg-[#d89128] text-black font-black text-xs uppercase tracking-[0.15em] transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-[4px_4px_0_rgba(255,255,255,0.1)] border border-[#a46e1d] rounded-sm mt-8"
                >
                    <Lock strokeWidth={2.5} className="w-4 h-4" />
                    Bypass Protocol
                </button>
            </form>
        </div>

        {/* System Footer Notice */}
        <p className="text-center text-[9px] font-black text-slate-600 uppercase tracking-widest mt-8">
             Restricted System. Unauthorized access is monitored.
        </p>
      </div>
    </div>
  )
}
