"use client"

import { useState, useCallback, useEffect } from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel"

interface ProductImageCarouselProps {
  images: string[]
  productName: string
  isOpen: boolean
  onClose: () => void
  startIndex?: number
}

export function ProductImageCarousel({
  images,
  productName,
  isOpen,
  onClose,
  startIndex = 0,
}: ProductImageCarouselProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(startIndex)

  useEffect(() => {
    if (!api) return
    api.scrollTo(startIndex, true)
  }, [api, startIndex])

  useEffect(() => {
    if (!api) return

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap())
    }

    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api])

  const scrollTo = useCallback(
    (index: number) => {
      api?.scrollTo(index)
    },
    [api]
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl border-none bg-foreground/95 p-0 backdrop-blur-xl sm:rounded-2xl">
        <DialogTitle className="sr-only">
          {productName} - Image Gallery
        </DialogTitle>
        
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-background/20 text-background transition-all duration-200 hover:bg-background/40"
          aria-label="Close image gallery"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Counter */}
        <div className="absolute left-4 top-4 z-10 rounded-full bg-background/20 px-4 py-2 backdrop-blur-sm">
          <span className="text-lg font-semibold text-background">
            {current + 1} / {images.length}
          </span>
        </div>

        {/* Carousel */}
        <div className="relative px-4 py-16">
          <Carousel setApi={setApi} className="w-full">
            <CarouselContent>
              {images.map((image, index) => (
                <CarouselItem key={index}>
                  <div className="flex items-center justify-center p-2">
                    <div className="relative aspect-square w-full max-w-lg overflow-hidden rounded-xl">
                      <Image
                        src={image || "/placeholder.svg"}
                        alt={`${productName} - Image ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 90vw, 600px"
                      />
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 h-14 w-14 border-none bg-background/20 text-background hover:bg-background/40 hover:text-background disabled:opacity-30" />
            <CarouselNext className="right-2 h-14 w-14 border-none bg-background/20 text-background hover:bg-background/40 hover:text-background disabled:opacity-30" />
          </Carousel>
        </div>

        {/* Thumbnail strip */}
        <div className="flex items-center justify-center gap-3 border-t border-background/10 px-6 py-5">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollTo(index)}
              className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 transition-all duration-300 ${
                current === index
                  ? "border-primary ring-2 ring-primary/50 scale-110"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={image || "/placeholder.svg"}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
