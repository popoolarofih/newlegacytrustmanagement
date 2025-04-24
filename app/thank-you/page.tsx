"use client"

import { useState } from "react"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { CheckCircle, ShoppingBag, Home } from "lucide-react"
import { ConfettiExplosion } from "@/components/confetti-explosion"

export default function ThankYouPage() {
  const [orderNumber] = useState(`ORD-${Math.floor(100000 + Math.random() * 900000)}`)

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 flex items-center justify-center py-12 bg-gray-50">
        <ConfettiExplosion />
        <div className="container max-w-md px-4">
          <Card className="shadow-lg border-green-100">
            <CardContent className="pt-6 pb-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-green-600 mb-2">Thank You!</h1>
              <p className="text-xl mb-6">Your order has been placed successfully.</p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Order Number</p>
                <p className="text-lg font-semibold">{orderNumber}</p>
              </div>

              <p className="text-gray-600 mb-6">
                You will receive an email confirmation shortly with your order details.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/catalog">
                  <Button variant="outline" className="w-full">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Continue Shopping
                  </Button>
                </Link>
                <Link href="/">
                  <Button className="w-full">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
