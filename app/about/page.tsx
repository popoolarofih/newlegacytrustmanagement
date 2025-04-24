import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import Image from "next/image"
import { Heart, CheckCircle, Truck, Recycle, Users, Star } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 py-8">
        <div className="container px-4">
          <h2 className="text-3xl font-bold text-center mb-8">About The Fresh Express</h2>

          <div className="grid gap-12 md:grid-cols-2 mb-12">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold border-b-2 border-green-600 pb-2 mb-4">Our Story</h3>
              <p className="text-gray-700">
                The Fresh Express was born from a passion for fresh, high-quality groceries and a belief in the charm of
                traditional markets. We set out to reimagine grocery shopping by combining the best of local produce
                with modern convenience. Our mission is to deliver fresh, organic products right to your doorstep.
              </p>
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center">
                  <Heart className="h-5 w-5 text-green-600 mr-2" />
                  <span>Passion</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>Quality</span>
                </div>
                <div className="flex items-center">
                  <Truck className="h-5 w-5 text-green-600 mr-2" />
                  <span>Fast Delivery</span>
                </div>
              </div>
            </div>
            <div className="relative h-64 md:h-auto rounded-lg overflow-hidden">
              <Image src="/placeholder.svg?height=400&width=600" alt="Our Story" fill className="object-cover" />
            </div>
          </div>

          <div className="grid gap-12 md:grid-cols-2">
            <div className="relative h-64 md:h-auto rounded-lg overflow-hidden order-last md:order-first">
              <Image src="/placeholder.svg?height=400&width=600" alt="Our Values" fill className="object-cover" />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold border-b-2 border-green-600 pb-2 mb-4">Our Values</h3>
              <p className="text-gray-700">
                We are committed to sustainability, community, and excellence. From sourcing organic produce to ensuring
                responsible packaging, every step is designed with our customers and the planet in mind.
              </p>
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center">
                  <Recycle className="h-5 w-5 text-green-600 mr-2" />
                  <span>Sustainability</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-green-600 mr-2" />
                  <span>Community</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-green-600 mr-2" />
                  <span>Excellence</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
