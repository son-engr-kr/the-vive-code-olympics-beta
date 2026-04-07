import { headers } from "next/headers";

export default async function SingleCTAPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return (
    <main className="min-h-screen bg-white p-8 max-w-3xl mx-auto">
      <header className="mb-10 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">BookFinder</h1>
        <p className="text-xl text-gray-600">
          Discover your next favorite book. Tell us what genre you love and we will recommend the perfect read.
        </p>
      </header>

      <section className="text-center mb-12">
        <a
          href={`${baseUrl}/test-single-cta/pick`}
          className="inline-block px-10 py-5 bg-green-600 text-white rounded-2xl font-bold text-2xl shadow-lg hover:bg-green-700 transition-colors"
        >
          Get Your Book Recommendation
        </a>
      </section>

      <section aria-label="How it works">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">How It Works</h2>
        <ol className="space-y-4 max-w-md mx-auto">
          <li className="flex gap-4 items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
            <p className="text-gray-700 text-lg">Choose your favorite genre</p>
          </li>
          <li className="flex gap-4 items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
            <p className="text-gray-700 text-lg">Get a personalized book recommendation</p>
          </li>
          <li className="flex gap-4 items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
            <p className="text-gray-700 text-lg">Read the full description and start reading</p>
          </li>
        </ol>
      </section>

      <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500">
        <p>BookFinder — Helping readers discover great books since 2026</p>
      </footer>
    </main>
  );
}
