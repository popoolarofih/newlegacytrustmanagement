"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, ShoppingCart, Star, Users, Package, Calendar } from "lucide-react"
import Image from "next/image"
import { toast } from "@/components/ui/use-toast"
import { getVendorBadge, getBadgeColorClass, getBadgeIconColorClass, type VendorBadge } from "@/lib/badge-utils"

interface Product {
  id: string
  name: string
  price: number
  category: string
  imageUrl: string
  description: string
  vendorId: string
}

interface Vendor {
  name: string
  email: string
  address: string
}

interface Review {
  id: string
  userId: string
  rating: number
  text: string
  timestamp: any
}

export default function ProductPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [vendorBadge, setVendorBadge] = useState<VendorBadge | null>(null)
  const [loading, setLoading] = useState(true)
  const [badgeCategories, setBadgeCategories] = useState<any[]>([])

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return

      try {
        const productDoc = await getDoc(doc(db, "products", id as string))

        if (productDoc.exists()) {
          const productData = productDoc.data()
          setProduct({
            id: productDoc.id,
            ...productData,
          } as Product)

          // Load vendor details
          if (productData.vendorId) {
            const vendorDoc = await getDoc(doc(db, "users", productData.vendorId))
            if (vendorDoc.exists()) {
              setVendor(vendorDoc.data() as Vendor)
            }

            // Get vendor badge
            const badge = await getVendorBadge(productData.vendorId)
            setVendorBadge(badge)
          }

          // Load badge categories for reference
          const categoriesSnapshot = await getDocs(collection(db, "badgeCategories"))
          const categoriesList: any[] = []
          categoriesSnapshot.forEach((doc) => {
            categoriesList.push({ id: doc.id, ...doc.data() })
          })
          // Sort by minOrders
          categoriesList.sort((a, b) => a.minOrders - b.minOrders)
          setBadgeCategories(categoriesList)
        } else {
          toast({
            title: "Product not found",
            description: "The requested product could not be found.",
            variant: "destructive",
          })
          router.push("/catalog")
        }
      } catch (error) {
        console.error("Error loading product:", error)
        toast({
          title: "Error",
          description: "Failed to load product details.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadProduct()

    // Load reviews
    if (id) {
      const reviewsQuery = query(collection(db, "reviews"), where("productId", "==", id))

      const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
        const reviewsList: Review[] = []
        snapshot.forEach((doc) => {
          reviewsList.push({ id: doc.id, ...doc.data() } as Review)
        })
        setReviews(reviewsList)
      })

      return () => unsubscribe()
    }
  }, [id, router])

  const addToCart = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add items to your cart.",
        variant: "destructive",
      })
      router.push("/auth/login")
      return
    }

    if (!product) return

    try {
      await addDoc(collection(db, "carts"), {
        userId: user.uid,
        productId: product.id,
        quantity: 1,
        addedAt: new Date(),
      })

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      })
    } catch (error) {
      console.error("Error adding to cart:", error)
      toast({
        title: "Error",
        description: "Failed to add item to cart.",
        variant: "destructive",
      })
    }
  }

  // Get the next badge level information
  const getNextBadgeLevel = () => {
    if (!vendorBadge || badgeCategories.length === 0) return null

    // Find current badge category
    const currentCategoryIndex = badgeCategories.findIndex((category) => category.name === vendorBadge.categoryName)

    // If there's a next level
    if (currentCategoryIndex >= 0 && currentCategoryIndex < badgeCategories.length - 1) {
      const nextCategory = badgeCategories[currentCategoryIndex + 1]
      const ordersNeeded = nextCategory.minOrders - vendorBadge.shippedCount

      return {
        name: nextCategory.name,
        color: nextCategory.color,
        ordersNeeded,
      }
    }

    return null
  }

  const nextBadgeLevel = getNextBadgeLevel()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <MainNav />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2">Loading product details...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col">
        <MainNav />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p>Product not found</p>
            <Button onClick={() => router.push("/catalog")} className="mt-4">
              Back to Catalog
            </Button>
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
          <div className="grid gap-8 md:grid-cols-2">
            {/* Product Image */}
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={product.imageUrl || "/placeholder.svg?height=600&width=600"}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold">{product.name}</h1>
                <p className="text-sm text-muted-foreground">Product ID: {product.id}</p>
              </div>

              <p className="text-lg">{product.description}</p>

              <div>
                <p className="text-2xl font-bold">₦{product.price.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Category: {product.category}</p>
              </div>

              <Button onClick={addToCart} size="lg" className="w-full">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>

              {/* Vendor Info */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium mb-2">Vendor Details</h3>
                  {vendor ? (
                    <div className="space-y-2">
                      <p>
                        <strong>Name:</strong> {vendor.name}
                      </p>
                      <p>
                        <strong>Email:</strong> {vendor.email}
                      </p>
                      <p>
                        <strong>Location:</strong> {vendor.address}
                      </p>

                      {vendorBadge && (
                        <div className="mt-4 space-y-4">
                          <div className="flex items-center">
                            <Award className={`mr-2 h-5 w-5 ${getBadgeIconColorClass(vendorBadge.color)}`} />
                            <Badge className={getBadgeColorClass(vendorBadge.color)}>{vendorBadge.categoryName}</Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div className="flex flex-col items-center">
                              <Package className="h-5 w-5 text-gray-500 mb-1" />
                              <p className="text-sm text-gray-500">Orders Shipped</p>
                              <p className="font-bold">{vendorBadge.shippedCount}</p>
                            </div>
                            <div className="flex flex-col items-center">
                              <Users className="h-5 w-5 text-gray-500 mb-1" />
                              <p className="text-sm text-gray-500">Customers</p>
                              <p className="font-bold">{vendorBadge.customerCount}</p>
                            </div>
                          </div>

                          {nextBadgeLevel && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <p className="text-sm font-medium mb-2">Next Badge Level</p>
                              <div className="flex items-center">
                                <Award className={`mr-2 h-5 w-5 text-${nextBadgeLevel.color}-600`} />
                                <span>
                                  {nextBadgeLevel.name} - {nextBadgeLevel.ordersNeeded} more orders needed
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="text-xs text-gray-500 flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Last updated:{" "}
                            {vendorBadge.lastUpdated
                              ? new Date(vendorBadge.lastUpdated.seconds * 1000).toLocaleDateString()
                              : "N/A"}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>Vendor information not available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

            {reviews.length === 0 ? (
              <p className="text-muted-foreground">No reviews yet for this product.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">
                          {review.userId ? review.userId.substring(0, 8) + "..." : "Anonymous"}
                        </p>
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p>{review.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
