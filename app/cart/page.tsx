"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, doc, getDoc, deleteDoc, addDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react"
import Image from "next/image"
import { updateVendorBadge } from "@/lib/badge-utils"

interface CartItem {
  id: string
  productId: string
  quantity: number
  product?: {
    name: string
    price: number
    imageUrl: string
    vendorId?: string
  }
}

export default function CartPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  // Checkout form
  const [fullName, setFullName] = useState("")
  const [address, setAddress] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("card")

  useEffect(() => {
    // Redirect if not logged in
    if (!user && !isLoading) {
      router.push("/auth/login")
      return
    }

    if (!user) {
      setIsLoading(false)
      return
    }

    // Use onSnapshot to listen for real-time updates to the cart
    const cartQuery = query(collection(db, "carts"), where("userId", "==", user.uid))
    const unsubscribeCart = onSnapshot(cartQuery, async (snapshot) => {
      try {
        const items: CartItem[] = []

        for (const docSnap of snapshot.docs) {
          const item = { id: docSnap.id, ...docSnap.data() } as CartItem

          // Get product details
          const productRef = doc(db, "products", item.productId)
          const productSnap = await getDoc(productRef)

          if (productSnap.exists()) {
            const productData = productSnap.data()
            item.product = {
              name: productData.name,
              price: productData.price,
              imageUrl: productData.imageUrl,
              vendorId: productData.vendorId,
            }
          }

          items.push(item)
        }

        setCartItems(items)
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading cart items:", error)
        toast({
          title: "Error",
          description: "Failed to load cart items.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    })

    // Return the unsubscribe function
    return () => unsubscribeCart()
  }, [user, router, isLoading])

  const handleUpdateQuantity = async (cartId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    try {
      // In a real app, we would update the quantity in Firestore
      // For now, we'll just update the local state
      setCartItems(cartItems.map((item) => (item.id === cartId ? { ...item, quantity: newQuantity } : item)))
    } catch (error) {
      console.error("Error updating quantity:", error)
      toast({
        title: "Error",
        description: "Failed to update quantity.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveItem = async (cartId: string) => {
    try {
      await deleteDoc(doc(db, "carts", cartId))
      setCartItems(cartItems.filter((item) => item.id !== cartId))
      toast({
        title: "Success",
        description: "Item removed from cart.",
      })
    } catch (error) {
      console.error("Error removing item:", error)
      toast({
        title: "Error",
        description: "Failed to remove item.",
        variant: "destructive",
      })
    }
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to checkout.",
        variant: "destructive",
      })
      router.push("/auth/login")
      return
    }

    if (cartItems.length === 0) {
      toast({
        title: "Error",
        description: "Your cart is empty.",
        variant: "destructive",
      })
      setIsProcessing(false)
      return
    }

    try {
      const orderItems = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.product?.price || 0,
        vendorId: item.product?.vendorId || "",
      }))

      const total = calculateTotal()

      // Create the order
      const orderRef = await addDoc(collection(db, "orders"), {
        userId: user.uid,
        fullName,
        address,
        paymentMethod,
        items: orderItems,
        total,
        status: "Pending",
        createdAt: new Date(),
      })

      // Clear cart
      for (const item of cartItems) {
        await deleteDoc(doc(db, "carts", item.id))
      }

      // Update vendor badges for all vendors in this order
      const uniqueVendorIds = new Set<string>()
      cartItems.forEach((item) => {
        if (item.product?.vendorId) {
          uniqueVendorIds.add(item.product.vendorId)
        }
      })

      // Update badges for each vendor
      const badgePromises = Array.from(uniqueVendorIds).map((vendorId) => updateVendorBadge(vendorId))

      await Promise.all(badgePromises)

      toast({
        title: "Success",
        description: "Order placed successfully!",
      })

      // Redirect to thank you page
      router.push("/thank-you")
    } catch (error) {
      console.error("Error placing order:", error)
      toast({
        title: "Error",
        description: "Failed to place order.",
        variant: "destructive",
      })
      setIsProcessing(false)
    }
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const itemPrice = item.product?.price || 0
      return total + itemPrice * item.quantity
    }, 0)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <MainNav />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2">Loading your cart...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 py-8">
        <div className="container px-4">
          <h1 className="mb-6 text-3xl font-bold">Your Shopping Cart</h1>

          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">Your cart is empty</h2>
              <p className="mt-2 text-muted-foreground">Looks like you haven't added any products to your cart yet.</p>
              <Button onClick={() => router.push("/catalog")} className="mt-6">
                Browse Products
              </Button>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-3">
              {/* Cart Items */}
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Cart Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Subtotal</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cartItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="relative h-16 w-16 mr-4">
                                    <Image
                                      src={item.product?.imageUrl || "/placeholder.svg?height=64&width=64"}
                                      alt={item.product?.name || "Product"}
                                      fill
                                      className="rounded-md object-cover"
                                    />
                                  </div>
                                  <span className="font-medium">{item.product?.name || "Unknown Product"}</span>
                                </div>
                              </TableCell>
                              <TableCell>₦{(item.product?.price || 0).toFixed(2)}</TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span>{item.quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>₦{((item.product?.price || 0) * item.quantity).toFixed(2)}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end mt-4">
                      <div className="text-xl font-bold">Total: ₦{calculateTotal().toFixed(2)}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Checkout Form */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Checkout</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCheckout} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Shipping Address</Label>
                        <Textarea
                          id="address"
                          rows={3}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger id="paymentMethod">
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="card">Credit/Debit Card</SelectItem>
                            <SelectItem value="bank">Bank Transfer</SelectItem>
                            <SelectItem value="cod">Cash on Delivery</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button type="submit" className="w-full" disabled={isProcessing}>
                        {isProcessing ? "Processing..." : "Place Order"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
