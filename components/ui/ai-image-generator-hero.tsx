"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageCard {
  id: string
  src: string
  alt: string
  rotation: number
}

interface ImageCarouselHeroProps {
  title: string
  subtitle: string
  description: string
  ctaText: string
  onCtaClick?: () => void
  images: ImageCard[]
  features?: Array<{
    title: string
    description: string
  }>
}

export function ImageCarouselHero({
  title,
  subtitle,
  description,
  ctaText,
  onCtaClick,
  images,
  features = [
    {
      title: "Realistic Results",
      description: "Realistic Results Photos that look professionally crafted",
    },
    {
      title: "Fast Generation",
      description: "Turn ideas into images in seconds.",
    },
    {
      title: "Diverse Styles",
      description: "Choose from a wide range of artistic options.",
    },
  ],
}: ImageCarouselHeroProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const [rotatingCards, setRotatingCards] = useState<number[]>([])

  // Continuous rotation animation
  useEffect(() => {
    const interval = setInterval(() => {
      setRotatingCards((prev) => prev.map((_, i) => (prev[i] + 0.5) % 360))
    }, 50)

    return () => clearInterval(interval)
  }, [])

  // Initialize rotating cards
  useEffect(() => {
    setRotatingCards(images.map((_, i) => i * (360 / images.length)))
  }, [images.length])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    })
  }

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-b from-background via-background to-background overflow-hidden flex items-center justify-center">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 w-full py-20">
        {/* Carousel Container */}
        <div
          className="relative w-full max-w-5xl h-80 sm:h-96 mb-10 sm:mb-12"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Rotating Image Cards */}
          <div className="absolute inset-0 flex items-center justify-center perspective">
            {images.map((image, index) => {
              const totalCards = images.length
              const angle = (rotatingCards[index] || 0) * (Math.PI / 180)
              const radius = 140
              const x = Math.cos(angle) * radius
              const y = Math.sin(angle) * radius

              // 3D perspective effect based on mouse position
              const perspectiveX = (mousePosition.x - 0.5) * 20
              const perspectiveY = (mousePosition.y - 0.5) * 20

              return (
                <div
                  key={image.id}
                  className="absolute w-20 h-28 sm:w-28 sm:h-36 transition-all duration-300"
                  style={{
                    transform: `
                      translate(${x}px, ${y}px)
                      rotateX(${perspectiveY}deg)
                      rotateY(${perspectiveX}deg)
                      rotateZ(${image.rotation}deg)
                    `,
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div
                    className={cn(
                      "relative w-full h-full rounded-2xl overflow-hidden shadow-2xl",
                      "transition-all duration-300 hover:shadow-3xl hover:scale-110",
                      "cursor-pointer group",
                    )}
                    style={{
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <Image
                      src={image.src || "/placeholder.svg"}
                      alt={image.alt}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      priority={index < 3}
                    />
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Content Section */}
        <div className="relative z-20 text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-3 sm:mb-4 text-balance leading-tight">
            {title}
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground mb-6 text-balance">{description}</p>

          {/* CTA Button */}
          <button
            onClick={onCtaClick}
            className={cn(
              "inline-flex items-center gap-2 px-8 py-3 rounded-full",
              "bg-primary text-primary-foreground font-medium",
              "hover:shadow-lg hover:scale-105 transition-all duration-300",
              "active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "group",
            )}
          >
            {ctaText}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Features Section */}
        <div className="relative z-20 w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-10">
            {features.map((feature, index) => (
              <div
                key={index}
                className={cn(
                  "text-center p-4 rounded-xl",
                  "bg-card/50 backdrop-blur-sm border border-border/50",
                  "hover:bg-accent/50 hover:border-accent transition-all duration-300",
                  "group cursor-pointer",
                )}
              >
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
