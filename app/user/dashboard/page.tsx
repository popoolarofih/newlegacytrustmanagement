"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, onSnapshot, doc, getDoc, addDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import Image from "next/image"

interface CartItem {
  id: string
  productId: string
  quantity: number
  product?: {
    name: string
    price: number
    imageUrl: string
  }
}

interface Order {
  id: string
  createdAt: any
  total: number
  status: string
}

export default function CustomerDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [returnPolicy, setReturnPolicy] = useState("")
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    address: "",
  })

  // Form states
  const [returnOrderId, setReturnOrderId] = useState("")
  const [returnReason, setReturnReason] = useState("")
  const [reviewProductId, setReviewProductId] = useState("")
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState("")

  useEffect(() => {
    // Redirect if not user
    if (user && user.role !== "user") {
      router.push("/")
      return
    }

    if (!user) return

    // Load profile data
    const loadProfileData = async () => {
      const profileDocRef = doc(db, "users", user.uid)
      const profileSnap = await getDoc(profileDocRef)
      if (profileSnap.exists()) {
        const data = profileSnap.data()
        setProfile({
          name: data.name || "",
          email: data.email || "",
          address: data.address || "",
        })
      }
    }

    // Load cart items
    const cartQuery = query(collection(db, "carts"), where("userId", "==", user.uid))
    const unsubscribeCart = onSnapshot(cartQuery, async (snapshot) => {
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
          }
        }

        items.push(item)
      }

      setCartItems(items)
    })

    // Load order history
    const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid))
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersList: Order[] = []
      snapshot.forEach((doc) => {
        ordersList.push({ id: doc.id, ...doc.data() } as Order)
      })
      setOrders(ordersList)
    })

    // Load return policy
    const loadReturnPolicy = async () => {
      const policyDocRef = doc(db, "returnPolicy", "defaultPolicy")
      const policySnap = await getDoc(policyDocRef)
      if (policySnap.exists()) {
        setReturnPolicy(policySnap.data().text || "")
      } else {
        setReturnPolicy("No return policy defined.")
      }
    }

    loadProfileData()
    loadReturnPolicy()

    return () => {
      unsubscribeCart()
      unsubscribeOrders()
    }
  }, [user, router])

  const handleUpdateProfile = async () => {
    if (!user) return

    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: profile.name,
        email: profile.email,
        address: profile.address,
      })

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      })

      setIsProfileDialogOpen(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      })
    }
  }

  const handleSubmitReturnRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    if (orders.length === 0) {
      toast({
        title: "Error",
        description: "You must place an order before submitting a return request.",
        variant: "destructive",
      })
      return
    }

    try {
      await addDoc(collection(db, "returnRequests"), {
        userId: user.uid,
        orderId: returnOrderId,
        reason: returnReason,
        status: "Pending",
        timestamp: new Date(),
      })

      toast({
        title: "Success",
        description: "Return request submitted!",
      })

      setReturnOrderId("")
      setReturnReason("")
    } catch (error) {
      console.error("Error submitting return request:", error)
      toast({
        title: "Error",
        description: "Failed to submit return request.",
        variant: "destructive",
      })
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    if (orders.length === 0) {
      toast({
        title: "Error",
        description: "You must place an order before submitting a review.",
        variant: "destructive",
      })
      return
    }

    try {
      const reviewData = {
        productId: reviewProductId,
        rating: reviewRating,
        text: reviewText,
        userId: user.uid,
        timestamp: new Date(),
      }

      await addDoc(collection(db, "reviews"), reviewData)

      toast({
        title: "Success",
        description: "Review submitted successfully!",
      })

      setReviewProductId("")
      setReviewRating(5)
      setReviewText("")
    } catch (error) {
      console.error("Error submitting review:", error)
      toast({
        title: "Error",
        description: "Failed to submit review.",
        variant: "destructive",
      })
    }
  }

  const calculateCartTotal = () => {
    return cartItems.reduce((total, item) => {
      const itemPrice = item.product?.price || 0
      return total + itemPrice * item.quantity
    }, 0)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 py-8">
        <div className="container px-4">
          <h1 className="mb-6 text-3xl font-bold text-center">Customer Dashboard</h1>

          <div className="grid gap-6 md:grid-cols-4">
            {/* Left Column: Profile & Cart */}
            <div className="md:col-span-1 space-y-6">
              {/* Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p>
                      <strong>Name:</strong> {profile.name || "Not set"}
                    </p>
                    <p>
                      <strong>Email:</strong> {profile.email || "Not set"}
                    </p>
                    <p>
                      <strong>Address:</strong> {profile.address || "Not set"}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setIsProfileDialogOpen(true)}>
                      Update Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Cart Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Cart</CardTitle>
                </CardHeader>
                <CardContent>
                  {cartItems.length === 0 ? (
                    <p className="text-muted-foreground text-center py-2">No items in cart.</p>
                  ) : (
                    <div>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead>Qty</TableHead>
                              <TableHead>Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cartItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center">
                                    <div className="relative h-8 w-8 mr-2">
                                      <Image
                                        src={item.product?.imageUrl || "/placeholder.svg?height=32&width=32"}
                                        alt={item.product?.name || "Product"}
                                        fill
                                        className="rounded-md object-cover"
                                      />
                                    </div>
                                    <span>{item.product?.name || "Unknown Product"}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>₦{((item.product?.price || 0) * item.quantity).toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="text-right mt-4">
                        <strong>Total: ₦{calculateCartTotal().toFixed(2)}</strong>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Order History, Reviews & Return Requests */}
            <div className="md:col-span-3 space-y-6">
              {/* Order History Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Order History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Total (₦)</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center">
                              No orders yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          orders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">
                                {order.id ? order.id.substring(0, 8) + "..." : "Unknown"}
                              </TableCell>
                              <TableCell>
                                {order.createdAt?.seconds
                                  ? new Date(order.createdAt.seconds * 1000).toLocaleDateString()
                                  : "N/A"}
                              </TableCell>
                              <TableCell>₦{order.total.toFixed(2)}</TableCell>
                              <TableCell>{order.status}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Return Policy & Request Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Return Policy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-gray-50 rounded-md mb-6">{returnPolicy}</div>

                  <h3 className="text-lg font-medium mb-4">Request a Return</h3>
                  <form onSubmit={handleSubmitReturnRequest} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="returnOrderId">Order ID</Label>
                      <Input
                        id="returnOrderId"
                        placeholder="Enter your Order ID"
                        value={returnOrderId}
                        onChange={(e) => setReturnOrderId(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="returnReason">Reason for Return</Label>
                      <Textarea
                        id="returnReason"
                        placeholder="Please explain why you want to return this order"
                        rows={3}
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        required
                      />
                    </div>

                    <Button type="submit" variant="outline">
                      Submit Return Request
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Review Submission Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Submit a Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reviewProductId">Product ID</Label>
                      <Input
                        id="reviewProductId"
                        placeholder="e.g. prod123"
                        value={reviewProductId}
                        onChange={(e) => setReviewProductId(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reviewRating">Rating (1-5)</Label>
                      <Input
                        id="reviewRating"
                        type="number"
                        min={1}
                        max={5}
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number.parseInt(e.target.value))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reviewText">Review</Label>
                      <Textarea
                        id="reviewText"
                        placeholder="Write your review here"
                        rows={3}
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        required
                      />
                    </div>

                    <Button type="submit" variant="default">
                      Submit Review
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Update Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
