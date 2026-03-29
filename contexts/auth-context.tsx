"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface User {
    name: string
    phone: string
    email: string
}

interface AuthContextType {
    user: User | null
    supabaseUser: SupabaseUser | null
    login: (name: string, phone: string, email: string) => void
    logout: () => Promise<void>
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)

    useEffect(() => {
        // Check current session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setSupabaseUser(session.user)
                setUser({
                    name: session.user.user_metadata.full_name || session.user.user_metadata.name || "User",
                    phone: session.user.user_metadata.phone || session.user.phone || session.user.email || "",
                    email: session.user.email || "",
                })
            }
        })

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setSupabaseUser(session.user)
                setUser({
                    name: session.user.user_metadata.full_name || session.user.user_metadata.name || "User",
                    phone: session.user.user_metadata.phone || session.user.phone || session.user.email || "",
                    email: session.user.email || "",
                })
            } else {
                setSupabaseUser(null)
                setUser(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const login = (name: string, phone: string, email: string) => {
        // Called after Supabase auth succeeds (from auth-modal)
        setUser({ name, phone, email })
    }

    const logout = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setSupabaseUser(null)
    }

    return (
        <AuthContext.Provider value={{
            user,
            supabaseUser,
            login,
            logout,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
