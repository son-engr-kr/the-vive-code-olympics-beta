import { headers } from "next/headers";

export default async function AboutPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return (
    <main className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      <a href={baseUrl} className="text-blue-600 font-medium mb-6 inline-block">← Back to All Books</a>

      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">About BookFinder</h1>
        <p className="text-lg text-gray-600 mt-2">Helping readers discover great books since 2026.</p>
      </header>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">Our Mission</h2>
        <p className="text-gray-700 text-lg leading-relaxed">
          BookFinder is a simple platform to help people find their next favorite book.
          We curate a selection of timeless classics and modern favorites, providing
          descriptions, ratings, and personalized recommendations.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">Contact Us</h2>
        <p className="text-gray-700 text-lg">Email: hello@bookfinder.example.com</p>
        <p className="text-gray-700 text-lg">Twitter: @BookFinderApp</p>
      </section>

      <div className="flex gap-4">
        <a href={baseUrl} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium">Browse Books</a>
        <a href={`${baseUrl}/recommend`} className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium">Get a Recommendation</a>
      </div>
    </main>
  );
}
