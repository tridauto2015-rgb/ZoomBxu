"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface User {
    name: string
    email: string
}

interface AuthContextType {
    user: User | null
    login: (name: string, email: string) => void
    logout: () => void
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
            setUser(JSON.parse(storedUser))
        }
    }, [])

    const login = (name: string, email: string) => {
        const newUser = { name, email }
        setUser(newUser)
        localStorage.setItem("user", JSON.stringify(newUser))
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem("user")
    }

    return (
        <AuthContext.Provider value={{
            user,
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
