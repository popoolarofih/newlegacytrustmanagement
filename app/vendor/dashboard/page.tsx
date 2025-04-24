"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, addDoc, updateDoc, doc, onSnapshot, query, where, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Award, CheckCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Image from "next/image"
import { getVendorBadge } from "@/lib/badge-utils"

interface Product {
  id: string
  name: string
  price: number
  category: string
  imageUrl: string
  description: string
}

interface Order {
  id: string
  status: string
}

interface ReturnRequest {
  id: string
  orderId: string
  reason: string
  status: string
}

interface VendorBadge {
  color: string
  shippedCount: number
  customerCount: number
  categoryName?: string
}

export default function VendorDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([])
  const [vendorBadge, setVendorBadge] = useState<VendorBadge>({ color: "", shippedCount: 0, customerCount: 0 })
  const [returnPolicy, setReturnPolicy] = useState("")

  // Form states
  const [productName, setProductName] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [productCategory, setProductCategory] = useState("Fruits")
  const [productImageURL, setProductImageURL] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [vendorName, setVendorName] = useState("")
  const [vendorEmail, setVendorEmail] = useState("")
  const [vendorAddress, setVendorAddress] = useState("")

  useEffect(() => {
    // Redirect if not vendor
    if (user && user.role !== "vendor") {
      router.push("/")
      return
    }

    if (!user) return

    // Load vendor profile
    const loadVendorProfile = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          const data = userDocSnap.data()
          setVendorName(data.name || "")
          setVendorEmail(data.email || "")
          setVendorAddress(data.address || "")
        }
      } catch (error) {
        console.error("Error loading vendor profile:", error)
      }
    }

    // Load vendor products
    const loadVendorProducts = () => {
      try {
        const productsQuery = query(
          collection(db, "products"),
          where("vendorId", "==", user.uid),
          where("removed", "==", false),
        )

        const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
          const productsList: Product[] = []
          snapshot.forEach((doc) => {
            productsList.push({ id: doc.id, ...doc.data() } as Product)
          })
          setProducts(productsList)
        })

        return unsubscribe
      } catch (error) {
        console.error("Error loading vendor products:", error)
        return () => {}
      }
    }

    // Load vendor orders
    const loadVendorOrders = () => {
      try {
        const unsubscribe = onSnapshot(collection(db, "orders"), async (snapshot) => {
          const ordersList: Order[] = []

          for (const orderDoc of snapshot.docs) {
            const orderData = orderDoc.data()
            const items = orderData.items || []
            let orderHasVendorProduct = false

            for (const item of items) {
              try {
                const productRef = doc(db, "products", item.productId)
                const productSnap = await getDoc(productRef)
                if (productSnap.exists() && productSnap.data().vendorId === user.uid) {
                  orderHasVendorProduct = true
                  break
                }
              } catch (error) {
                console.error("Error checking product:", error)
              }
            }

            if (orderHasVendorProduct) {
              ordersList.push({ id: orderDoc.id, ...orderData } as Order)
            }
          }

          setOrders(ordersList)
        })

        return unsubscribe
      } catch (error) {
        console.error("Error loading vendor orders:", error)
        return () => {}
      }
    }

    // Load vendor badge
    const loadVendorBadge = async () => {
      try {
        const badge = await getVendorBadge(user.uid)
        if (badge) {
          setVendorBadge({
            color: badge.color,
            shippedCount: badge.shippedCount,
            customerCount: badge.customerCount,
            categoryName: badge.categoryName,
          })
        }
      } catch (error) {
        console.error("Error loading vendor badge:", error)
      }
    }

    // Load return policy
    const loadReturnPolicy = async () => {
      try {
        const policyDocRef = doc(db, "returnPolicy", user.uid)
        const policySnap = await getDoc(policyDocRef)
        if (policySnap.exists()) {
          setReturnPolicy(policySnap.data().policy || "")
        }
      } catch (error) {
        console.error("Error loading return policy:", error)
      }
    }

    // Load return requests
    const loadReturnRequests = () => {
      try {
        const requestsQuery = query(
          collection(db, "returnRequests"),
          where("vendorId", "==", user.uid),
          where("status", "==", "Pending"),
        )

        const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
          const requestsList: ReturnRequest[] = []
          snapshot.forEach((doc) => {
            requestsList.push({ id: doc.id, ...doc.data() } as ReturnRequest)
          })
          setReturnRequests(requestsList)
        })

        return unsubscribe
      } catch (error) {
        console.error("Error loading return requests:", error)
        return () => {}
      }
    }

    loadVendorProfile()
    const unsubscribeProducts = loadVendorProducts()
    const unsubscribeOrders = loadVendorOrders()
    loadVendorBadge()
    loadReturnPolicy()
    const unsubscribeReturnRequests = loadReturnRequests()

    return () => {
      if (typeof unsubscribeProducts === "function") unsubscribeProducts()
      if (typeof unsubscribeOrders === "function") unsubscribeOrders()
      if (typeof unsubscribeReturnRequests === "function") unsubscribeReturnRequests()
    }
  }, [user, router])

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      await addDoc(collection(db, "products"), {
        name: productName,
        price: Number.parseFloat(productPrice),
        category: productCategory,
        vendorId: user.uid,
        imageUrl: productImageURL,
        description: productDescription,
        removed: false,
        createdAt: new Date(),
      })

      toast({
        title: "Success",
        description: "Product added successfully!",
      })

      // Reset form
      setProductName("")
      setProductPrice("")
      setProductCategory("Fruits")
      setProductImageURL("")
      setProductDescription("")
    } catch (error) {
      console.error("Error adding product:", error)
      toast({
        title: "Error",
        description: "Failed to add product.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
      await updateDoc(doc(db, "products", productId), { removed: true })
      toast({
        title: "Success",
        description: "Product removed successfully!",
      })
    } catch (error) {
      console.error("Error removing product:", error)
      toast({
        title: "Error",
        description: "Failed to remove product.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: vendorName,
        email: vendorEmail,
        address: vendorAddress,
      })

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      })
    }
  }

  const handleMarkShipped = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: "Shipped" })
      toast({
        title: "Success",
        description: "Order marked as shipped!",
      })
    } catch (error) {
      console.error("Error updating order:", error)
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      })
    }
  }

  const handleSaveReturnPolicy = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      await setDoc(
        doc(db, "returnPolicy", user.uid),
        {
          policy: returnPolicy,
          updatedAt: new Date(),
        },
        { merge: true },
      )

      toast({
        title: "Success",
        description: "Return policy updated!",
      })
    } catch (error) {
      console.error("Error updating return policy:", error)
      toast({
        title: "Error",
        description: "Failed to update return policy.",
        variant: "destructive",
      })
    }
  }

  const handleAcceptReturn = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "returnRequests", requestId), { status: "Accepted" })
      toast({
        title: "Success",
        description: "Return request accepted!",
      })
    } catch (error) {
      console.error("Error accepting return request:", error)
      toast({
        title: "Error",
        description: "Failed to accept return request.",
        variant: "destructive",
      })
    }
  }

  const getBadgeColor = (color: string) => {
    switch (color) {
      case "red":
        return "text-red-600"
      case "purple":
        return "text-purple-600"
      case "blue":
        return "text-blue-600"
      case "gold":
        return "text-yellow-600"
      case "green":
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 py-8">
        <div className="container px-4">
          <h1 className="mb-6 text-3xl font-bold text-center">Vendor Dashboard</h1>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column: Manage Products + Vendor Profile */}
            <div className="space-y-6">
              {/* Manage Products Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Manage Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddProduct} className="space-y-4 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="productName">Product Name</Label>
                      <Input
                        id="productName"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="productPrice">Price (₦)</Label>
                      <Input
                        id="productPrice"
                        type="number"
                        step="0.01"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="productCategory">Category</Label>
                      <Select value={productCategory} onValueChange={setProductCategory}>
                        <SelectTrigger id="productCategory">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fruits">Fruits</SelectItem>
                          <SelectItem value="Vegetables">Vegetables</SelectItem>
                          <SelectItem value="Dairy">Dairy</SelectItem>
                          <SelectItem value="Bakery">Bakery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="productImageURL">Product Image URL</Label>
                      <Input
                        id="productImageURL"
                        placeholder="https://example.com/image.jpg"
                        value={productImageURL}
                        onChange={(e) => setProductImageURL(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="productDescription">Product Description</Label>
                      <Textarea
                        id="productDescription"
                        placeholder="Enter product details here..."
                        rows={3}
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      Add Product
                    </Button>
                  </form>

                  <h3 className="text-lg font-medium mb-4">Your Products</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Price (₦)</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Image</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center">
                              No products added yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          products.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>₦{product.price.toFixed(2)}</TableCell>
                              <TableCell>{product.category}</TableCell>
                              <TableCell>
                                <div className="relative h-10 w-10">
                                  <Image
                                    src={product.imageUrl || "/placeholder.svg?height=40&width=40"}
                                    alt={product.name}
                                    fill
                                    className="rounded-md object-cover"
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Vendor Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Edit Vendor Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="vendorName">Store Name</Label>
                      <Input
                        id="vendorName"
                        value={vendorName}
                        onChange={(e) => setVendorName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vendorEmail">Email</Label>
                      <Input
                        id="vendorEmail"
                        type="email"
                        value={vendorEmail}
                        onChange={(e) => setVendorEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vendorAddress">Store Address</Label>
                      <Input
                        id="vendorAddress"
                        value={vendorAddress}
                        onChange={(e) => setVendorAddress(e.target.value)}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      Save Changes
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Orders, Trust Score, Vendor Badge, Return Policy & Requests */}
            <div className="space-y-6">
              {/* Orders Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center">
                              No orders yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          orders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">{order.id.substring(0, 8)}...</TableCell>
                              <TableCell>{order.status}</TableCell>
                              <TableCell>
                                {order.status !== "Shipped" && (
                                  <Button variant="secondary" size="sm" onClick={() => handleMarkShipped(order.id)}>
                                    Mark Shipped
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Trust Score & Badge Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Verification Badge</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold mb-2">Trust Score: {vendorBadge.shippedCount} shipped orders</p>
                  <div className="flex items-center">
                    <Award className={`h-8 w-8 mr-2 ${getBadgeColor(vendorBadge.color)}`} />
                    <span className="text-lg">
                      {vendorBadge.categoryName || vendorBadge.color.toUpperCase()} - {vendorBadge.shippedCount} Orders
                      / {vendorBadge.customerCount} Customers
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Return Policy & Requests Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Return Policy & Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveReturnPolicy} className="space-y-4 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="returnPolicy">Return Policy</Label>
                      <Textarea
                        id="returnPolicy"
                        placeholder="Enter your return policy"
                        rows={3}
                        value={returnPolicy}
                        onChange={(e) => setReturnPolicy(e.target.value)}
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      Save Return Policy
                    </Button>
                  </form>

                  <h3 className="text-lg font-medium mb-4">Pending Return Requests</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Request ID</TableHead>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returnRequests.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center">
                              No pending return requests
                            </TableCell>
                          </TableRow>
                        ) : (
                          returnRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell className="font-medium">{request.id.substring(0, 8)}...</TableCell>
                              <TableCell>{request.orderId}</TableCell>
                              <TableCell>{request.reason}</TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-green-500 text-green-600 hover:bg-green-50"
                                  onClick={() => handleAcceptReturn(request.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" /> Accept
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
