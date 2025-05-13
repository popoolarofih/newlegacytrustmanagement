"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, query, where, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { CheckCircle, Flag, Info, Play, ShieldCheck, Star, XCircle, TrendingUp, AlertTriangle } from "lucide-react"

interface TrustPolicy {
  id: string
  name: string
  rule: string
  createdAt: any
}

interface Review {
  id: string
  productId: string
  rating: number
  text: string
  userId: string
  timestamp: any
  adminReviewed?: boolean
  adminApproved?: boolean
  hidden?: boolean
}

interface TrustStats {
  avgRating: number
  flaggedCount: number
  trustScore: number
  totalReviews: number
  approvedReviews: number
  rejectedReviews: number
  trustOverTime: { date: string; score: number }[]
}

export default function TrustManagementPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [policies, setPolicies] = useState<TrustPolicy[]>([])
  const [flaggedReviews, setFlaggedReviews] = useState<Review[]>([])
  const [recentReviews, setRecentReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<TrustStats>({
    avgRating: 0,
    flaggedCount: 0,
    trustScore: 0,
    totalReviews: 0,
    approvedReviews: 0,
    rejectedReviews: 0,
    trustOverTime: [],
  })

  // Form states
  const [policyName, setPolicyName] = useState("")
  const [policyRule, setPolicyRule] = useState("")
  const [simulationRating, setSimulationRating] = useState(3)
  const [simulationText, setSimulationText] = useState("")
  const [simulationResult, setSimulationResult] = useState<{ passed: boolean; failedPolicies: string[] } | null>(null)
  const [testReviewProduct, setTestReviewProduct] = useState("")
  const [testReviewRating, setTestReviewRating] = useState(4)
  const [testReviewText, setTestReviewText] = useState("")
  const [showCalculationDetails, setShowCalculationDetails] = useState(false)

  useEffect(() => {
    // Redirect if not admin
    if (user && user.role !== "admin") {
      router.push("/")
      return
    }

    // Load trust policies
    const unsubscribePolicies = onSnapshot(collection(db, "trustPolicies"), (snapshot) => {
      const policiesList: TrustPolicy[] = []
      snapshot.forEach((doc) => {
        policiesList.push({ id: doc.id, ...doc.data() } as TrustPolicy)
      })
      setPolicies(policiesList)
    })

    // Find the flagged reviews query that's causing the error
    // Replace this query:
    // const flaggedQuery = query(
    //   collection(db, "reviews"),
    //   where("rating", "<=", 2),
    //   orderBy("timestamp", "desc"),
    //   limit(5),
    // )

    // With this modified query that avoids the need for a composite index:
    const flaggedQuery = query(collection(db, "reviews"), where("rating", "<=", 2), limit(5))

    const unsubscribeFlagged = onSnapshot(flaggedQuery, (snapshot) => {
      const reviewsList: Review[] = []
      snapshot.forEach((doc) => {
        reviewsList.push({ id: doc.id, ...doc.data() } as Review)
      })
      // Update the code to sort the reviews after fetching them
      // In the flaggedQuery onSnapshot callback, add this after creating the reviewsList:
      reviewsList.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0
        const timeB = b.timestamp?.seconds || 0
        return timeB - timeA // Sort in descending order (newest first)
      })
      setFlaggedReviews(reviewsList)
    })

    // Also fix the recent reviews query to avoid potential similar issues:
    // Replace this query:
    // const recentQuery = query(collection(db, "reviews"), orderBy("timestamp", "desc"), limit(5))

    // With this simpler query:
    const recentQuery = query(collection(db, "reviews"), limit(5))

    const unsubscribeRecent = onSnapshot(recentQuery, (snapshot) => {
      const reviewsList: Review[] = []
      snapshot.forEach((doc) => {
        reviewsList.push({ id: doc.id, ...doc.data() } as Review)
      })
      // Similarly, in the recentQuery onSnapshot callback, add this after creating the reviewsList:
      reviewsList.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0
        const timeB = b.timestamp?.seconds || 0
        return timeB - timeA // Sort in descending order (newest first)
      })
      setRecentReviews(reviewsList)
    })

    // Calculate analytics
    const unsubscribeAnalytics = onSnapshot(collection(db, "reviews"), async (snapshot) => {
      let totalRating = 0
      let count = 0
      let flaggedCount = 0
      let approvedCount = 0
      let rejectedCount = 0

      snapshot.forEach((doc) => {
        const data = doc.data()
        count++

        if (!data.hidden) {
          totalRating += data.rating
        }

        if (data.rating <= 2) {
          flaggedCount++
        }

        if (data.adminReviewed && data.adminApproved) {
          approvedCount++
        }

        if (data.adminReviewed && !data.adminApproved) {
          rejectedCount++
        }
      })

      const avgRating = count ? Number.parseFloat((totalRating / count).toFixed(1)) : 0

      // Trust score calculation: (approved reviews / total reviews) * 100
      // This represents the percentage of reviews that meet our trust standards
      const trustScore = count ? Number.parseInt((((count - flaggedCount) / count) * 100).toFixed(0)) : 0

      // Generate trust over time data (simulated for demonstration)
      const trustOverTime = await generateTrustOverTimeData()

      setStats({
        avgRating,
        flaggedCount,
        trustScore,
        totalReviews: count,
        approvedReviews: approvedCount,
        rejectedReviews: rejectedCount,
        trustOverTime,
      })
    })

    return () => {
      unsubscribePolicies()
      unsubscribeFlagged()
      unsubscribeRecent()
      unsubscribeAnalytics()
    }
  }, [user, router])

  // Simulate trust over time data
  const generateTrustOverTimeData = async () => {
    // In a real application, this would be calculated from historical data
    // For demonstration, we'll create simulated data
    const today = new Date()
    const data = []

    // Generate data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      // Base score that increases over time (simulating trust growth)
      // T = base_trust + (days_active * growth_factor)
      const baseScore = 70 // Starting trust score
      const daysActive = 30 + (6 - i) // Simulating the platform being active for 30+ days
      const growthFactor = 0.2 // How quickly trust grows over time

      // Calculate trust score with some random variation
      const score = Math.min(100, Math.round(baseScore + daysActive * growthFactor + (Math.random() * 5 - 2.5)))

      data.push({
        date: date.toLocaleDateString(),
        score,
      })
    }

    return data
  }

  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addDoc(collection(db, "trustPolicies"), {
        name: policyName,
        rule: policyRule,
        createdAt: new Date(),
      })

      toast({
        title: "Success",
        description: `Policy "${policyName}" has been added.`,
      })

      setPolicyName("")
      setPolicyRule("")
    } catch (error) {
      console.error("Error adding policy:", error)
      toast({
        title: "Error",
        description: "Failed to add policy.",
        variant: "destructive",
      })
    }
  }

  const handleDeletePolicy = async (policyId: string) => {
    if (confirm("Are you sure you want to delete this policy?")) {
      try {
        await deleteDoc(doc(db, "trustPolicies", policyId))
        toast({
          title: "Success",
          description: "Policy deleted successfully.",
        })
      } catch (error) {
        console.error("Error deleting policy:", error)
        toast({
          title: "Error",
          description: "Failed to delete policy.",
          variant: "destructive",
        })
      }
    }
  }

  const handleRunSimulation = (e: React.FormEvent) => {
    e.preventDefault()
    const rating = simulationRating
    const text = simulationText

    let allCompliant = true
    const failedPolicies: string[] = []

    policies.forEach((policy) => {
      try {
        // Create context for evaluation
        const context = { rating, text }

        // Safely evaluate the rule with Function constructor instead of eval
        const ruleFunction = new Function("rating", "text", `return ${policy.rule}`)
        const result = ruleFunction(rating, text)

        if (!result) {
          allCompliant = false
          failedPolicies.push(policy.name)
        }
      } catch (error) {
        console.error(`Error evaluating policy "${policy.name}":`, error)
        allCompliant = false
        failedPolicies.push(`${policy.name} (error: ${error})`)
      }
    })

    setSimulationResult({ passed: allCompliant, failedPolicies })
  }

  const handleSubmitTestReview = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const reviewData = {
        productId: testReviewProduct,
        rating: testReviewRating,
        text: testReviewText,
        userId: user?.uid || "admin-test",
        adminReviewed: false,
        timestamp: new Date(),
      }

      await addDoc(collection(db, "reviews"), reviewData)

      toast({
        title: "Success",
        description: "Test review submitted successfully.",
      })

      setTestReviewProduct("")
      setTestReviewRating(4)
      setTestReviewText("")
    } catch (error) {
      console.error("Error submitting review:", error)
      toast({
        title: "Error",
        description: "Failed to submit test review.",
        variant: "destructive",
      })
    }
  }

  const handleApproveReview = async (reviewId: string) => {
    try {
      await updateDoc(doc(db, "reviews", reviewId), {
        adminReviewed: true,
        adminApproved: true,
      })
      toast({
        title: "Success",
        description: "Review approved successfully.",
      })
    } catch (error) {
      console.error("Error approving review:", error)
      toast({
        title: "Error",
        description: "Failed to approve review.",
      })
    }
  }

  const handleRejectReview = async (reviewId: string) => {
    try {
      await updateDoc(doc(db, "reviews", reviewId), {
        adminReviewed: true,
        adminApproved: false,
        hidden: true,
      })
      toast({
        title: "Success",
        description: "Review rejected successfully.",
      })
    } catch (error) {
      console.error("Error rejecting review:", error)
      toast({
        title: "Error",
        description: "Failed to reject review.",
      })
    }
  }

  // Add default policies if none exist
  const addDefaultPolicies = async () => {
    if (policies.length === 0) {
      const defaultPolicies = [
        {
          name: "Minimum Rating",
          rule: "rating >= 1",
        },
        {
          name: "Minimum Review Length",
          rule: "text.length >= 10",
        },
        {
          name: "No Profanity",
          rule: "!text.toLowerCase().includes('profanity')",
        },
        {
          name: "Time-Based Trust",
          rule: "rating >= 3 || text.length >= 50",
        },
        {
          name: "Contextual Relevance",
          rule: "text.toLowerCase().includes('product') || text.toLowerCase().includes('service')",
        },
      ]

      try {
        for (const policy of defaultPolicies) {
          await addDoc(collection(db, "trustPolicies"), {
            name: policy.name,
            rule: policy.rule,
            createdAt: new Date(),
          })
        }
        toast({
          title: "Success",
          description: "Default policies added successfully.",
        })
      } catch (error) {
        console.error("Error adding default policies:", error)
        toast({
          title: "Error",
          description: "Failed to add default policies.",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 py-8">
        <div className="container px-4">
          <h1 className="mb-6 text-3xl font-bold text-center">Trust Management Dashboard</h1>

          {/* Trust Analytics Dashboard */}
          <div className="grid gap-6 mb-8 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Average Vendor Rating</p>
                  <p className="text-4xl font-bold text-primary">{stats.avgRating}</p>
                  <p className="text-xs text-muted-foreground mt-2">Based on all vendor reviews</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Flagged Reviews</p>
                  <p className="text-4xl font-bold text-primary">{stats.flaggedCount}</p>
                  <p className="text-xs text-muted-foreground mt-2">Reviews requiring attention</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Overall Trust Score</p>
                  <p className="text-4xl font-bold text-primary">{stats.trustScore}%</p>
                  <p className="text-xs text-muted-foreground mt-2">Platform trust health indicator</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trust Score Calculation Details */}
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Trust Score Calculation
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowCalculationDetails(!showCalculationDetails)}>
                {showCalculationDetails ? "Hide Details" : "Show Details"}
              </Button>
            </CardHeader>
            <CardContent>
              {showCalculationDetails ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-md">
                    <h3 className="font-medium mb-2">Platform Trust Score Formula:</h3>
                    <p className="font-mono bg-background p-2 rounded">
                      Trust Score = (Total Reviews - Flagged Reviews) / Total Reviews × 100%
                    </p>
                    <p className="mt-2">
                      = ({stats.totalReviews} - {stats.flaggedCount}) / {stats.totalReviews} × 100%
                    </p>
                    <p className="mt-1">
                      = {stats.totalReviews - stats.flaggedCount} / {stats.totalReviews} × 100%
                    </p>
                    <p className="mt-1">
                      = {((stats.totalReviews - stats.flaggedCount) / stats.totalReviews).toFixed(2)} × 100%
                    </p>
                    <p className="mt-1">= {stats.trustScore}%</p>
                  </div>

                  <div className="p-4 bg-muted rounded-md">
                    <h3 className="font-medium mb-2">Trust Over Time Formula:</h3>
                    <p className="font-mono bg-background p-2 rounded">
                      T = base_trust + (days_active × growth_factor)
                    </p>
                    <p className="mt-2">Where:</p>
                    <ul className="list-disc ml-6 mt-1 space-y-1">
                      <li>base_trust = Initial trust score (70%)</li>
                      <li>days_active = Number of days the platform has been active</li>
                      <li>growth_factor = Rate at which trust grows over time (0.2% per day)</li>
                    </ul>
                    <p className="mt-2">This formula reflects how trust is gained over time as the platform matures.</p>
                  </div>

                  <div className="p-4 bg-muted rounded-md">
                    <h3 className="font-medium mb-2">Review Statistics:</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p>Total Reviews: {stats.totalReviews}</p>
                        <p>Approved Reviews: {stats.approvedReviews}</p>
                        <p>Rejected Reviews: {stats.rejectedReviews}</p>
                      </div>
                      <div>
                        <p>Flagged Reviews: {stats.flaggedCount}</p>
                        <p>Average Rating: {stats.avgRating}</p>
                        <p>
                          Review Approval Rate:{" "}
                          {stats.totalReviews ? ((stats.approvedReviews / stats.totalReviews) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Trust Score Over Time:</h3>
                    <div className="rounded-md border p-4">
                      <div className="flex items-end h-40 space-x-2">
                        {stats.trustOverTime.map((item, index) => (
                          <div key={index} className="flex flex-col items-center flex-1">
                            <div className="bg-primary w-full rounded-t" style={{ height: `${item.score}%` }}></div>
                            <p className="text-xs mt-1">
                              {item.date.split("/")[1]}/{item.date.split("/")[0]}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-2">
                        <p className="text-xs">Last 7 Days</p>
                        <p className="text-xs">Trust grows over time</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p>Click "Show Details" to view the trust score calculation methodology and statistics.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column: Policy Configuration & Trust Rules */}
            <div className="space-y-6">
              {/* Policy Configuration Module */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShieldCheck className="mr-2 h-5 w-5" />
                    Policy Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">Create and manage trust policies for the marketplace</p>

                  <form onSubmit={handleAddPolicy} className="space-y-4 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="policyName">Policy Name</Label>
                      <Input
                        id="policyName"
                        placeholder="e.g. Minimum Review Rating"
                        value={policyName}
                        onChange={(e) => setPolicyName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="policyRule">Policy Rule (JS Expression)</Label>
                      <div className="flex">
                        <Input
                          id="policyRule"
                          placeholder="e.g. rating >= 3"
                          value={policyRule}
                          onChange={(e) => setPolicyRule(e.target.value)}
                          required
                        />
                        <Button variant="ghost" size="icon" type="button" className="ml-2">
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Example expressions: <code>rating &gt;= 3</code>, <code>text.length &gt; 10</code>
                      </p>
                    </div>

                    <div className="flex space-x-2">
                      <Button type="submit" className="flex-1">
                        Add Policy
                      </Button>
                      <Button type="button" variant="outline" onClick={addDefaultPolicies}>
                        Add Default Policies
                      </Button>
                    </div>
                  </form>

                  <h3 className="text-sm font-medium mb-2">Active Policies</h3>
                  <div className="space-y-2">
                    {policies.length === 0 ? (
                      <p className="text-muted-foreground text-center py-2">No policies created yet.</p>
                    ) : (
                      policies.map((policy) => (
                        <div key={policy.id} className="relative border rounded-md p-3 pr-10">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-8 w-8 text-destructive"
                            onClick={() => handleDeletePolicy(policy.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <p>
                            <strong>{policy.name}:</strong> {policy.rule}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Trust Rule Simulator */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Play className="mr-2 h-5 w-5" />
                    Trust Rule Simulator
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">Test if content meets your trust policies</p>

                  <form onSubmit={handleRunSimulation} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="simulationRating">Review Rating</Label>
                        <div className="flex">
                          <Input
                            id="simulationRating"
                            type="number"
                            min={1}
                            max={5}
                            value={simulationRating}
                            onChange={(e) => setSimulationRating(Number.parseInt(e.target.value))}
                            required
                          />
                          <span className="flex items-center justify-center px-3 border border-l-0 rounded-r-md">
                            ★
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="simulationText">Review Text</Label>
                        <Input
                          id="simulationText"
                          placeholder="Review content"
                          value={simulationText}
                          onChange={(e) => setSimulationText(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button type="submit" variant="secondary" className="w-full">
                      Run Simulation
                    </Button>
                  </form>

                  {simulationResult && (
                    <div
                      className={`mt-4 p-4 rounded-md ${simulationResult.passed ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}
                    >
                      {simulationResult.passed ? (
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          <p>
                            <strong>Passed:</strong> This content complies with all trust policies.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center">
                            <XCircle className="h-5 w-5 mr-2" />
                            <p>
                              <strong>Failed:</strong> This content violates the following policies:
                            </p>
                          </div>
                          <ul className="mt-2 ml-6 list-disc">
                            {simulationResult.failedPolicies.map((policy, index) => (
                              <li key={index}>{policy}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Review Submission & Flagged Reviews */}
            <div className="space-y-6">
              {/* Review & Rating Module */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="mr-2 h-5 w-5" />
                    Submit a Test Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">Create test reviews to check policy enforcement</p>

                  <form onSubmit={handleSubmitTestReview} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="testReviewProduct">Product ID</Label>
                        <Input
                          id="testReviewProduct"
                          placeholder="e.g. prod123"
                          value={testReviewProduct}
                          onChange={(e) => setTestReviewProduct(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="testReviewRating">Rating</Label>
                        <div className="flex">
                          <Input
                            id="testReviewRating"
                            type="number"
                            min={1}
                            max={5}
                            value={testReviewRating}
                            onChange={(e) => setTestReviewRating(Number.parseInt(e.target.value))}
                            required
                          />
                          <span className="flex items-center justify-center px-3 border border-l-0 rounded-r-md">
                            ★
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="testReviewText">Review Text</Label>
                      <Textarea
                        id="testReviewText"
                        placeholder="Write your review here"
                        rows={3}
                        value={testReviewText}
                        onChange={(e) => setTestReviewText(e.target.value)}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      Submit Review
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Review Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Flag className="mr-2 h-5 w-5" />
                    Review Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">Monitor and moderate flagged reviews that need attention</p>

                  <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800">Admin Review Guidelines</h4>
                        <p className="text-sm text-amber-700 mt-1">Reviews should be rejected if they:</p>
                        <ul className="list-disc ml-5 mt-1 text-sm text-amber-700">
                          <li>Contain offensive language or personal attacks</li>
                          <li>Are completely unrelated to the product</li>
                          <li>Appear to be spam or promotional content</li>
                          <li>Violate platform policies (rating ≤ 2 with no explanation)</li>
                          <li>Contain false or misleading information</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Tabs defaultValue="flagged">
                    <TabsList className="w-full">
                      <TabsTrigger value="flagged" className="flex-1">
                        Flagged Reviews
                      </TabsTrigger>
                      <TabsTrigger value="recent" className="flex-1">
                        Recent Reviews
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="flagged" className="mt-4 space-y-4">
                      {flaggedReviews.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No flagged reviews at this time.</p>
                      ) : (
                        flaggedReviews.map((review) => (
                          <div key={review.id} className="border-l-4 border-red-500 rounded-md p-4 bg-red-50">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium">Product: {review.productId}</h4>
                              <Badge variant="destructive">Rating: {review.rating}★</Badge>
                            </div>
                            <p className="mb-2">{review.text}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">
                                By: {review.userId ? review.userId.substring(0, 8) + "..." : "Unknown"} -{" "}
                                {new Date(review.timestamp?.seconds * 1000).toLocaleDateString()}
                              </span>
                              <div className="space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-500 text-green-600 hover:bg-green-50"
                                  onClick={() => handleApproveReview(review.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500 text-red-600 hover:bg-red-50"
                                  onClick={() => handleRejectReview(review.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" /> Reject
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="recent" className="mt-4 space-y-4">
                      {recentReviews.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No reviews submitted yet.</p>
                      ) : (
                        recentReviews.map((review) => {
                          const badgeVariant =
                            review.rating >= 4 ? "success" : review.rating === 3 ? "warning" : "destructive"

                          return (
                            <div
                              key={review.id}
                              className={`border-l-4 rounded-md p-4 ${
                                review.rating <= 2 ? "border-red-500 bg-red-50" : "border-green-500 bg-green-50"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">Product: {review.productId}</h4>
                                <Badge variant={badgeVariant}>Rating: {review.rating}★</Badge>
                              </div>
                              <p className="mb-2">{review.text}</p>
                              <span className="text-xs text-muted-foreground">
                                By: {review.userId ? review.userId.substring(0, 8) + "..." : "Unknown"} -{" "}
                                {new Date(review.timestamp?.seconds * 1000).toLocaleDateString()}
                              </span>
                            </div>
                          )
                        })
                      )}
                    </TabsContent>
                  </Tabs>
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
