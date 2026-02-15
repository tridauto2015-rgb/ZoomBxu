"use client"

import { useCart } from "@/contexts/cart-context"
import { ShoppingCart, Minus, Plus, Trash2, X } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export function Cart() {
    const { cart, removeFromCart, updateQuantity, getCartTotal, getCartCount } = useCart()
    const itemCount = getCartCount()

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative h-12 w-12 rounded-xl border-border bg-background transition-all hover:bg-muted">
                    <ShoppingCart className="h-6 w-6" />
                    {itemCount > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground animate-in zoom-in">
                            {itemCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
                <SheetHeader className="space-y-2.5 pr-6">
                    <SheetTitle className="text-2xl font-bold">Shopping Cart</SheetTitle>
                    <Separator />
                </SheetHeader>

                {itemCount === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center space-y-4">
                        <div className="rounded-full bg-muted p-6">
                            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <p className="text-xl font-medium text-muted-foreground">Your cart is empty</p>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-1 pr-6">
                            <div className="space-y-6 pt-4">
                                {cart.map((item) => (
                                    <div key={item.id} className="flex gap-4">
                                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-border">
                                            <Image
                                                src={item.images[0] || "/placeholder.svg"}
                                                alt={item.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>

                                        <div className="flex flex-1 flex-col justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-bold leading-none text-foreground">{item.name}</h4>
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{item.price}</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-md"
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-md"
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        <div className="space-y-4 pt-6">
                            <Separator />
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span>{getCartTotal()}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Shipping and taxes calculated at checkout.
                                </p>
                            </div>
                            <SheetFooter>
                                <Button className="w-full py-6 text-lg font-bold" size="lg">
                                    Proceed to Checkout
                                </Button>
                            </SheetFooter>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}
