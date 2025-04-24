"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Product {
  id: string
  name: string
  price: number
  vendorId: string
  removed: boolean
}

interface Order {
  id: string
  userId: string
  total: number
  status: string
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState({ name: "", email: "" })

  useEffect(() => {
    // Redirect if not admin
    if (user && user.role !== "admin") {
      router.push("/")
      return
    }

    // Load users
    const loadUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, "users"))
      const usersList: User[] = []
      usersSnapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() } as User)
      })
      setUsers(usersList)
    }

    // Load products
    const loadProducts = () => {
      const productsQuery = query(collection(db, "products"), where("removed", "==", false))
      const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
        const productsList: Product[] = []
        snapshot.forEach((doc) => {
          productsList.push({ id: doc.id, ...doc.data() } as Product)
        })
        setProducts(productsList)
      })
      return unsubscribe
    }

    // Load orders
    const loadOrders = () => {
      const unsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
        const ordersList: Order[] = []
        snapshot.forEach((doc) => {
          ordersList.push({ id: doc.id, ...doc.data() } as Order)
        })
        setOrders(ordersList)
      })
      return unsubscribe
    }

    if (user) {
      loadUsers()
      const unsubscribeProducts = loadProducts()
      const unsubscribeOrders = loadOrders()

      return () => {
        unsubscribeProducts()
        unsubscribeOrders()
      }
    }
  }, [user, router])

  const handlePromoteToVendor = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { role: "vendor" })
      toast({
        title: "Success",
        description: "User promoted to vendor successfully.",
      })
      // Update local state
      setUsers(users.map((user) => (user.id === userId ? { ...user, role: "vendor" } : user)))
    } catch (error) {
      console.error("Error promoting user:", error)
      toast({
        title: "Error",
        description: "Failed to promote user.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveProduct = async (productId: string) => {
    try {
      await updateDoc(doc(db, "products", productId), { removed: true })
      toast({
        title: "Success",
        description: "Product removed successfully.",
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

  const handleEditAdmin = () => {
    if (user) {
      setEditingAdmin({
        name: user.name || "",
        email: user.email || "",
      })
      setIsEditDialogOpen(true)
    }
  }

  const handleSaveAdminChanges = async () => {
    if (!user) return

    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: editingAdmin.name,
        email: editingAdmin.email,
      })
      toast({
        title: "Success",
        description: "Admin profile updated successfully.",
      })
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Error updating admin profile:", error)
      toast({
        title: "Error",
        description: "Failed to update admin profile.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 py-8">
        <div className="container px-4">
          <h1 className="mb-6 text-3xl font-bold text-center">Admin Panel</h1>

          <div className="mb-6 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => router.push("/admin/badges")}>
              Manage Badge Categories
            </Button>
            <Button variant="outline" onClick={() => router.push("/admin/trust")}>
              Go to Trust Management Dashboard
            </Button>
          </div>

          {/* Admin Details Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Admin Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <strong>Name:</strong> {user?.name || "Loading..."}
                </p>
                <p>
                  <strong>Email:</strong> {user?.email || "Loading..."}
                </p>
                <p>
                  <strong>Role:</strong> {user?.role || "Loading..."}
                </p>
                <Button variant="outline" size="sm" onClick={handleEditAdmin}>
                  Edit Admin Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Users & Vendors Management */}
            <Card>
              <CardHeader>
                <CardTitle>User/Vendor Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.id.substring(0, 8)}...</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell>
                            {user.role === "user" && (
                              <Button variant="secondary" size="sm" onClick={() => handlePromoteToVendor(user.id)}>
                                Promote to Vendor
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Products & Orders */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Curation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Price (₦)</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.vendorId.substring(0, 8)}...</TableCell>
                            <TableCell>₦{product.price.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button variant="destructive" size="sm" onClick={() => handleRemoveProduct(product.id)}>
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Total (₦)</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.id.substring(0, 8)}...</TableCell>
                            <TableCell>{order.userId.substring(0, 8)}...</TableCell>
                            <TableCell>₦{order.total.toFixed(2)}</TableCell>
                            <TableCell>{order.status}</TableCell>
                          </TableRow>
                        ))}
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

      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editingAdmin.name}
                onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={editingAdmin.email}
                onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdminChanges}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
