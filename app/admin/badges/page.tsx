"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Award, Plus, Trash } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

interface BadgeCategory {
  id: string
  name: string
  color: string
  minOrders: number
  maxOrders: number
  description: string
}

export default function BadgeManagementPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [badgeCategories, setBadgeCategories] = useState<BadgeCategory[]>([])
  const [newCategory, setNewCategory] = useState<Omit<BadgeCategory, "id">>({
    name: "",
    color: "red",
    minOrders: 0,
    maxOrders: 0,
    description: "",
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Redirect if not admin
    if (user && user.role !== "admin") {
      router.push("/")
      return
    }

    const loadBadgeCategories = async () => {
      try {
        const categoriesSnapshot = await getDocs(collection(db, "badgeCategories"))
        const categoriesList: BadgeCategory[] = []

        categoriesSnapshot.forEach((doc) => {
          categoriesList.push({ id: doc.id, ...doc.data() } as BadgeCategory)
        })

        // Sort by minOrders
        categoriesList.sort((a, b) => a.minOrders - b.minOrders)
        setBadgeCategories(categoriesList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading badge categories:", error)
        toast({
          title: "Error",
          description: "Failed to load badge categories.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    if (user) {
      loadBadgeCategories()
    }
  }, [user, router])

  const handleAddCategory = async () => {
    try {
      // Validate inputs
      if (!newCategory.name || newCategory.minOrders < 0 || newCategory.maxOrders <= 0) {
        toast({
          title: "Validation Error",
          description: "Please fill all fields with valid values.",
          variant: "destructive",
        })
        return
      }

      // Check for overlapping ranges
      const hasOverlap = badgeCategories.some(
        (category) =>
          (newCategory.minOrders >= category.minOrders && newCategory.minOrders <= category.maxOrders) ||
          (newCategory.maxOrders >= category.minOrders && newCategory.maxOrders <= category.maxOrders) ||
          (newCategory.minOrders <= category.minOrders && newCategory.maxOrders >= category.maxOrders),
      )

      if (hasOverlap) {
        toast({
          title: "Validation Error",
          description: "The order range overlaps with an existing category.",
          variant: "destructive",
        })
        return
      }

      // Create a new document with auto-generated ID
      const newCategoryRef = doc(collection(db, "badgeCategories"))
      await setDoc(newCategoryRef, {
        ...newCategory,
        createdAt: new Date(),
      })

      // Update local state
      setBadgeCategories([...badgeCategories, { id: newCategoryRef.id, ...newCategory }])

      // Reset form
      setNewCategory({
        name: "",
        color: "red",
        minOrders: 0,
        maxOrders: 0,
        description: "",
      })

      toast({
        title: "Success",
        description: "Badge category added successfully!",
      })
    } catch (error) {
      console.error("Error adding badge category:", error)
      toast({
        title: "Error",
        description: "Failed to add badge category.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteDoc(doc(db, "badgeCategories", categoryId))

      // Update local state
      setBadgeCategories(badgeCategories.filter((category) => category.id !== categoryId))

      toast({
        title: "Success",
        description: "Badge category deleted successfully!",
      })
    } catch (error) {
      console.error("Error deleting badge category:", error)
      toast({
        title: "Error",
        description: "Failed to delete badge category.",
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <MainNav />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2">Loading badge categories...</p>
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
          <h1 className="mb-6 text-3xl font-bold text-center">Badge Management</h1>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Current Badge Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Current Badge Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {badgeCategories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No badge categories defined yet.</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Badge</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Order Range</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {badgeCategories.map((category) => (
                          <TableRow key={category.id}>
                            <TableCell>
                              <Award className={`h-6 w-6 ${getBadgeColor(category.color)}`} />
                            </TableCell>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell>
                              {category.minOrders} -{" "}
                              {category.maxOrders === Number.MAX_SAFE_INTEGER ? "∞" : category.maxOrders}
                            </TableCell>
                            <TableCell>{category.description}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCategory(category.id)}
                                className="text-destructive"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add New Badge Category */}
            <Card>
              <CardHeader>
                <CardTitle>Add New Badge Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input
                      id="categoryName"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder="e.g. Bronze, Silver, Gold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoryColor">Badge Color</Label>
                    <div className="flex items-center space-x-2">
                      <select
                        id="categoryColor"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={newCategory.color}
                        onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                      >
                        <option value="red">Red</option>
                        <option value="purple">Purple</option>
                        <option value="blue">Blue</option>
                        <option value="gold">Gold</option>
                        <option value="green">Green</option>
                      </select>
                      <Award className={`h-6 w-6 ${getBadgeColor(newCategory.color)}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minOrders">Min Orders</Label>
                      <Input
                        id="minOrders"
                        type="number"
                        min="0"
                        value={newCategory.minOrders}
                        onChange={(e) => setNewCategory({ ...newCategory, minOrders: Number.parseInt(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxOrders">Max Orders</Label>
                      <Input
                        id="maxOrders"
                        type="number"
                        min="0"
                        value={newCategory.maxOrders}
                        onChange={(e) => setNewCategory({ ...newCategory, maxOrders: Number.parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                      placeholder="e.g. Vendors with 5-9 shipped orders"
                    />
                  </div>

                  <Button onClick={handleAddCategory} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add Badge Category
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
