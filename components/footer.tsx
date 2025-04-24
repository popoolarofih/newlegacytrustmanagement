export function Footer() {
  return (
    <footer className="bg-gray-100 py-6">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-gray-600">
          &copy; {new Date().getFullYear()} The Fresh Express powered by Executive Tech. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
