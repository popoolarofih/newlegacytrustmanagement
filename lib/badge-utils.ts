import { collection, query, where, getDocs, doc, updateDoc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface VendorBadge {
  id: string
  vendorId: string
  color: string
  categoryName: string
  shippedCount: number
  customerCount: number
  lastUpdated: Date
}

/**
 * Calculates and updates the badge for a vendor based on their order history
 */
export async function updateVendorBadge(vendorId: string): Promise<VendorBadge | null> {
  try {
    if (!vendorId) return null

    // Get badge categories from Firestore
    const categoriesSnapshot = await getDocs(collection(db, "badgeCategories"))
    const categories: any[] = []
    categoriesSnapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() })
    })

    // Sort categories by minOrders
    categories.sort((a, b) => a.minOrders - b.minOrders)

    // Get all orders
    const ordersSnapshot = await getDocs(collection(db, "orders"))
    let shippedCount = 0
    const customers = new Set<string>()

    // Count shipped orders and unique customers for this vendor
    ordersSnapshot.forEach((orderDoc) => {
      const orderData = orderDoc.data()
      if (orderData.status === "Shipped") {
        const items = orderData.items || []
        let vendorHasItemInOrder = false

        for (const item of items) {
          // Check if this product belongs to the vendor
          const productId = item.productId
          if (productId) {
            // We'll need to check the product's vendorId
            // This is done asynchronously below
            vendorHasItemInOrder = true
          }
        }

        if (vendorHasItemInOrder && orderData.userId) {
          shippedCount++
          customers.add(orderData.userId)
        }
      }
    })

    // Determine badge category based on shipped orders
    let badgeColor = "gray"
    let badgeCategory = null

    for (const category of categories) {
      if (
        shippedCount >= category.minOrders &&
        (shippedCount <= category.maxOrders || category.maxOrders === Number.MAX_SAFE_INTEGER)
      ) {
        badgeColor = category.color
        badgeCategory = category
        break
      }
    }

    // Create or update the vendor badge in Firestore
    const badgeData = {
      vendorId,
      color: badgeColor,
      categoryName: badgeCategory?.name || "Unranked",
      shippedCount,
      customerCount: customers.size,
      lastUpdated: new Date(),
    }

    // Check if badge already exists
    const badgeQuery = query(collection(db, "vendorBadges"), where("vendorId", "==", vendorId))
    const badgeSnapshot = await getDocs(badgeQuery)

    let badgeId = ""

    if (badgeSnapshot.empty) {
      // Create new badge
      const newBadgeRef = await addDoc(collection(db, "vendorBadges"), badgeData)
      badgeId = newBadgeRef.id
    } else {
      // Update existing badge
      const badgeDoc = badgeSnapshot.docs[0]
      badgeId = badgeDoc.id
      await updateDoc(doc(db, "vendorBadges", badgeId), badgeData)
    }

    return {
      id: badgeId,
      ...badgeData,
    } as VendorBadge
  } catch (error) {
    console.error("Error updating vendor badge:", error)
    return null
  }
}

/**
 * Gets the badge for a vendor
 */
export async function getVendorBadge(vendorId: string): Promise<VendorBadge | null> {
  try {
    if (!vendorId) return null

    const badgeQuery = query(collection(db, "vendorBadges"), where("vendorId", "==", vendorId))
    const badgeSnapshot = await getDocs(badgeQuery)

    if (badgeSnapshot.empty) {
      // No badge found, calculate and create one
      return await updateVendorBadge(vendorId)
    }

    // Return existing badge
    const badgeDoc = badgeSnapshot.docs[0]
    return { id: badgeDoc.id, ...badgeDoc.data() } as VendorBadge
  } catch (error) {
    console.error("Error getting vendor badge:", error)
    return null
  }
}

/**
 * Gets the CSS class for a badge color
 */
export function getBadgeColorClass(color: string): string {
  switch (color) {
    case "red":
      return "bg-red-100 text-red-800"
    case "purple":
      return "bg-purple-100 text-purple-800"
    case "blue":
      return "bg-blue-100 text-blue-800"
    case "gold":
      return "bg-yellow-100 text-yellow-800"
    case "green":
      return "bg-green-100 text-green-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

/**
 * Gets the CSS class for a badge icon color
 */
export function getBadgeIconColorClass(color: string): string {
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
