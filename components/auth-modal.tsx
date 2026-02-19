"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, LogIn, Mail, Lock, Phone, User } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const { login } = useAuth()
    const [mode, setMode] = useState<"signin" | "signup">("signup")
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [phone, setPhone] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Reset form when modal closes
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setTimeout(() => {
                setName("")
                setEmail("")
                setPassword("")
                setPhone("")
                setIsLoading(false)
                setMode("signup")
                setError(null)
            }, 300)
        }
        onClose()
    }



    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            if (mode === "signup") {
                if (!name || !email || !password || !phone) {
                    toast.error("Please fill in all fields")
                    setIsLoading(false)
                    return
                }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                            phone: phone
                        }
                    }
                })

                if (error) throw error

                if (data.user) {
                    login(name, phone, email) // Sync with our simple context
                    onClose()
                    if (onSuccess) onSuccess()
                }
            } else {
                // Sign In
                if (!email || !password) {
                    toast.error("Please enter email/phone and password")
                    setIsLoading(false)
                    return
                }

                // Check if input is email or phone
                const isEmailInput = email.includes("@")
                const signInCredentials = isEmailInput
                    ? { email, password }
                    : { phone: email.startsWith("+") ? email : `+63${email.replace(/^0/, '')}`, password }

                const { data, error } = await supabase.auth.signInWithPassword(signInCredentials)

                if (error) throw error

                if (data.user) {
                    // Get data from user metadata
                    const userName = data.user.user_metadata.full_name || "User"
                    const userPhone = data.user.user_metadata.phone || ""
                    const userEmail = data.user.email || email
                    login(userName, userPhone, userEmail)
                    onClose()
                    if (onSuccess) onSuccess()
                }
            }
        } catch (error: any) {
            console.error("Auth Error:", error)
            let msg = error.message
            if (msg.includes("rate limit")) {
                msg = "System is busy (Rate limit exceeded). Please wait a few minutes before trying again or use an existing account."
            }
            setError(msg)
            toast.error(msg)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                        {mode === "signup" ? (
                            <img 
                                src="/images/zoombxulogocircle.png" 
                                alt="ZoomBXU Logo" 
                                className="h-24 w-24 object-contain"
                            />
                        ) : (
                            <img 
                                src="/images/zoombxulogocircle.png" 
                                alt="ZoomBXU Logo" 
                                className="h-24 w-24 object-contain"
                            />
                        )}
                    </div>
                    <DialogTitle className="text-center text-2xl font-bold">
                        {mode === "signup" ? "Create Account" : "Sign In"}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {mode === "signup"
                            ? "Fill in your details to get started with Zoom BXU."
                            : "Welcome back! Please sign in to your account."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleAuth} className="space-y-4 pt-4">
                    {mode === "signup" && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <Input
                                        id="name"
                                        placeholder="Your Name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        className="h-12 pl-10"
                                    />
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <div className="relative">
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="09XXXXXXXXX"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        className="h-12 pl-10"
                                    />
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">{mode === "signup" ? "Email Address" : "Email or Phone"}</Label>
                        <div className="relative">
                            <Input
                                id="email"
                                type="text"
                                placeholder={mode === "signup" ? "name@example.com" : "Email or 09XXXXXXXXX"}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                className="h-12 pl-10"
                            />
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="h-12 pl-10"
                            />
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>

                    {error && (
                        <div className="text-destructive text-sm font-bold bg-destructive/10 p-3 rounded-lg border border-destructive/20 animate-in fade-in zoom-in duration-200">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full py-6 text-lg font-bold mt-2"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Please wait...
                            </>
                        ) : (
                            mode === "signup" ? "Create Account" : "Sign In"
                        )}
                    </Button>

                    <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setMode(mode === "signup" ? "signin" : "signup")
                                setError(null)
                            }}
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            {mode === "signup"
                                ? "Already have an account? Sign In"
                                : "Don't have an account? Create one"}
                        </button>
                    </div>
                </form>

                <div className="mt-4 text-center text-xs text-muted-foreground px-4">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                    Standard message rates may apply.
                </div>
            </DialogContent>
        </Dialog>
    )
}


