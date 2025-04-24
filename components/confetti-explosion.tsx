"use client"

import { useEffect } from "react"
import confetti from "canvas-confetti"

interface ConfettiExplosionProps {
  duration?: number
  particleCount?: number
  spread?: number
  startVelocity?: number
  colors?: string[]
  origin?: {
    x?: number
    y?: number
  }
}

export function ConfettiExplosion({
  duration = 5000,
  particleCount = 100,
  spread = 70,
  startVelocity = 30,
  colors = ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"],
  origin = { y: 0.5 },
}: ConfettiExplosionProps) {
  useEffect(() => {
    const animationEnd = Date.now() + duration
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

    // Create a more elaborate confetti effect
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      // Since particles fall down, start a bit higher than the default
      confetti({
        particleCount: Math.floor(particleCount),
        spread: spread,
        startVelocity: startVelocity,
        ticks: 60,
        origin: {
          x: randomInRange(0.1, 0.9),
          // Start from the top of the screen
          y: Math.max(0.1, randomInRange(0.1, 0.3)),
        },
        colors: colors,
        shapes: ["circle", "square"],
        scalar: randomInRange(0.9, 1.2),
        zIndex: 1000,
      })

      // Add some confetti from the other side for more randomness
      confetti({
        particleCount: Math.floor(particleCount * 0.5),
        spread: spread * 1.2,
        startVelocity: startVelocity * 0.8,
        ticks: 60,
        origin: {
          x: randomInRange(0.1, 0.9),
          y: Math.max(0.1, randomInRange(0.1, 0.3)),
        },
        colors: colors,
        shapes: ["circle", "square"],
        scalar: randomInRange(0.9, 1.2),
        zIndex: 1000,
      })
    }, 250)

    return () => clearInterval(interval)
  }, [colors, duration, origin, particleCount, spread, startVelocity])

  return null
}
