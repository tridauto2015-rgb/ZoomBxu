"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, LogIn } from "lucide-react"

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const { login } = useAuth()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (name && email) {
            login(name, email)
            onClose()
            if (onSuccess) onSuccess()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <UserPlus className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-2xl font-bold">Create Account</DialogTitle>
                    <DialogDescription className="text-center">
                        Register to start adding items to your cart and enjoy a faster checkout experience.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full py-6 text-lg font-bold">
                        Create Account & Continue
                    </Button>
                </form>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </div>
            </DialogContent>
        </Dialog>
    )
}
