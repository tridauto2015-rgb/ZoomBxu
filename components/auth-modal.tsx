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
import { UserPlus, Loader2, ArrowLeft } from "lucide-react"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import { toast } from "sonner"
import { auth } from "@/lib/firebase"
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth"

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const { login } = useAuth()
    const [name, setName] = useState("")
    const [phone, setPhone] = useState("")
    const [otp, setOtp] = useState("")
    const [showOtp, setShowOtp] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
    const recaptchaContainerRef = useRef<HTMLDivElement>(null)

    // Reset form when modal closes
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setTimeout(() => {
                setName("")
                setPhone("")
                setOtp("")
                setShowOtp(false)
                setIsLoading(false)
                setConfirmationResult(null)
            }, 300)
        }
        onClose()
    }

    const setupRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                },
                'expired-callback': () => {
                    // Response expired. Ask user to solve reCAPTCHA again.
                    toast.error("Recaptcha expired, please try again.")
                }
            });
        }
    }

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name || !phone) {
            toast.error("Please fill in all fields")
            return
        }

        // Format phone number to E.164 format (+63...)
        let formattedPhone = phone.trim()
        if (formattedPhone.startsWith("0")) {
            formattedPhone = "+63" + formattedPhone.substring(1)
        } else if (!formattedPhone.startsWith("+")) {
            // Handle cases where user might enter without 0 or +63
            // Assuming local format if no country code
            formattedPhone = "+63" + formattedPhone
        }


        setIsLoading(true)
        try {
            setupRecaptcha()
            const appVerifier = window.recaptchaVerifier

            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier)
            setConfirmationResult(confirmation)
            setShowOtp(true)
            toast.success("Verification code sent!")
        } catch (error: any) {
            console.error("Error sending OTP:", error)
            toast.error("Failed to send verification code: " + error.message)
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear()
                window.recaptchaVerifier = undefined
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        if (otp.length !== 6 || !confirmationResult) return

        setIsLoading(true)
        try {
            await confirmationResult.confirm(otp)
            login(name, phone)
            toast.success("Account Created Successfully!")
            onClose()
            if (onSuccess) onSuccess()
        } catch (error: any) {
            console.error("Error verifying OTP:", error)
            toast.error("Invalid verification code")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <UserPlus className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-2xl font-bold">
                        {showOtp ? "Verify Phone Number" : "Create Account"}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {showOtp
                            ? `Enter the 6-digit code sent to ${phone}`
                            : "Register using your phone number to start shopping."}
                    </DialogDescription>
                </DialogHeader>

                {!showOtp ? (
                    <form onSubmit={handleSendOtp} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="Your Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={isLoading}
                                className="h-12 text-lg"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="0912 345 6789"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                disabled={isLoading}
                                className="h-12 text-lg"
                            />
                            <p className="text-xs text-muted-foreground">Format: 09XXXXXXXXX</p>
                        </div>

                        {/* Hidden ReCAPTCHA container */}
                        <div id="recaptcha-container"></div>

                        <Button
                            type="submit"
                            className="w-full py-6 text-lg font-bold"
                            disabled={isLoading || !name || !phone}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Sending Code...
                                </>
                            ) : (
                                "Send Verification Code"
                            )}
                        </Button>
                    </form>
                ) : (
                    <div className="space-y-6 pt-4">
                        <div className="flex justify-center py-4">
                            <InputOTP
                                maxLength={6}
                                value={otp}
                                onChange={(value) => setOtp(value)}
                                disabled={isLoading}
                            >
                                <InputOTPGroup>
                                    <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                                    <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                                    <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                                </InputOTPGroup>
                                <div className="w-4" /> {/* Spacer */}
                                <InputOTPGroup>
                                    <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                                    <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                                    <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={handleVerify}
                                className="w-full py-6 text-lg font-bold"
                                disabled={isLoading || otp.length !== 6}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify & Create Account"
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                className="w-full text-muted-foreground hover:text-foreground"
                                onClick={() => setShowOtp(false)}
                                disabled={isLoading}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Details
                            </Button>
                        </div>
                    </div>
                )}

                <div className="mt-4 text-center text-xs text-muted-foreground px-4">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                    Standard message rates may apply.
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Add types for window.recaptchaVerifier
declare global {
    interface Window {
        recaptchaVerifier: RecaptchaVerifier | undefined;
    }
}
