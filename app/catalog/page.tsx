"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Award, Search } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { getBadgeColorClass, getBadgeIconColorClass } from "@/lib/badge-utils"

interface Product {
  id: string
  name: string
  price: number
  category: string
  imageUrl: string
  vendorId: string
  description?: string
}

interface VendorBadge {
  vendorId: string
  color: string
  categoryName: string
  shippedCount: number
  customerCount: number
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortOption, setSortOption] = useState("default")
  const [vendorBadges, setVendorBadges] = useState<Record<string, VendorBadge>>({})
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    const productsQuery = query(collection(db, "products"), where("removed", "==", false))

    const unsubscribe = onSnapshot(productsQuery, async (snapshot) => {
      const productsList: Product[] = []
      snapshot.forEach((doc) => {
        productsList.push({ id: doc.id, ...doc.data() } as Product)
      })
      setProducts(productsList)
      setFilteredProducts(productsList)

      // Load badge categories
      const categoriesSnapshot = await getDocs(collection(db, "badgeCategories"))
      const categoriesList: any[] = []
      categoriesSnapshot.forEach((doc) => {
        categoriesList.push({ id: doc.id, ...doc.data() })
      })
      // Sort by minOrders
      categoriesList.sort((a, b) => a.minOrders - b.minOrders)
      setCategories(categoriesList)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    // Load vendor badges from the vendorBadges collection
    const loadVendorBadges = async () => {
      const badges: Record<string, VendorBadge> = {}

      // Get unique vendor IDs from products
      const vendorIds = [...new Set(products.map((product) => product.vendorId))]

      // Get badges for each vendor
      const badgesSnapshot = await getDocs(collection(db, "vendorBadges"))

      badgesSnapshot.forEach((doc) => {
        const badgeData = doc.data() as VendorBadge
        if (vendorIds.includes(badgeData.vendorId)) {
          badges[badgeData.vendorId] = badgeData
        }
      })

      setVendorBadges(badges)
    }

    if (products.length > 0) {
      loadVendorBadges()
    }
  }, [products])

  useEffect(() => {
    // Filter and sort products
    let result = [...products]

    // Apply category filter
    if (selectedCategory !== "all") {
      result = result.filter((product) => product.category.toLowerCase() === selectedCategory.toLowerCase())
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((product) => product.name.toLowerCase().includes(query))
    }

    // Apply sorting
    switch (sortOption) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price)
        break
      case "price-desc":
        result.sort((a, b) => b.price - a.price)
        break
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name))
        break
    }

    setFilteredProducts(result)
  }, [products, selectedCategory, searchQuery, sortOption])

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 py-8">
        <div className="container px-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {/* Sidebar */}
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-lg font-medium">Search</h3>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="icon" variant="ghost">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-lg font-medium">Categories</h3>
                <div className="space-y-2">
                  <Button
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={selectedCategory === "fruits" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory("fruits")}
                  >
                    Fruits
                  </Button>
                  <Button
                    variant={selectedCategory === "vegetables" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory("vegetables")}
                  >
                    Vegetables
                  </Button>
                  <Button
                    variant={selectedCategory === "dairy" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory("dairy")}
                  >
                    Dairy
                  </Button>
                  <Button
                    variant={selectedCategory === "bakery" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory("bakery")}
                  >
                    Bakery
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-lg font-medium">Sort By</h3>
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="name-asc">Name: A-Z</SelectItem>
                    <SelectItem value="name-desc">Name: Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-2 text-lg font-medium">Badge Legend</h3>
                <ul className="space-y-2 text-sm">
                  {categories.length === 0 ? (
                    <li>No badge categories defined</li>
                  ) : (
                    categories.map((category) => (
                      <li key={category.id} className="flex items-center">
                        <Award className={`mr-2 h-4 w-4 ${getBadgeIconColorClass(category.color)}`} />
                        <span>
                          {category.name}: {category.minOrders} -{" "}
                          {category.maxOrders === Number.MAX_SAFE_INTEGER ? "∞" : category.maxOrders} shipped orders
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            {/* Product Grid */}
            <div className="md:col-span-3">
              {filteredProducts.length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
                  <p className="text-muted-foreground">No products found</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden">
                      <div className="aspect-square relative">
                        <Image
                          src={product.imageUrl || "/placeholder.svg?height=300&width=300"}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform hover:scale-105"
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="space-y-1">
                          <h3 className="font-medium">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">Category: {product.category}</p>
                          <p className="font-medium">₦{product.price.toFixed(2)}</p>
                        </div>
                        {vendorBadges[product.vendorId] && (
                          <div className="mt-2 flex items-center">
                            <Award
                              className={`mr-1 h-4 w-4 ${getBadgeIconColorClass(vendorBadges[product.vendorId].color)}`}
                            />
                            <Badge
                              variant="outline"
                              className={getBadgeColorClass(vendorBadges[product.vendorId].color)}
                            >
                              {vendorBadges[product.vendorId].categoryName} •{" "}
                              {vendorBadges[product.vendorId].shippedCount} Orders
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Link href={`/product/${product.id}`} className="w-full">
                          <Button variant="default" className="w-full">
                            View Details
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
