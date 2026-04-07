import { headers } from "next/headers";

export default async function RecommendPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return (
    <main className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      <a href={baseUrl} className="text-blue-600 font-medium mb-6 inline-block">← Back to All Books</a>
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Get a Book Recommendation</h1>
        <p className="text-lg text-gray-600 mt-2">Tell us your preferences and we will find the perfect book.</p>
      </header>
      <section>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Choose Your Genre</h2>
        <form action={`${baseUrl}/recommend/result`} method="GET" className="space-y-4 max-w-md">
          <div>
            <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-2">Select a genre:</label>
            <select id="genre" name="genre" className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg" required>
              <option value="dystopian">Dystopian — Dark futures and cautionary tales</option>
              <option value="classic">Classic — Timeless stories that defined literature</option>
              <option value="fantasy">Fantasy — Epic adventures in imaginary worlds</option>
              <option value="scifi">Sci-Fi — Mind-bending futures and alien worlds</option>
            </select>
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Your name (optional):</label>
            <input type="text" id="name" name="name" placeholder="Enter your name" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
          </div>
          <button type="submit" className="px-8 py-4 bg-green-600 text-white rounded-xl font-bold text-xl w-full">Get My Recommendation</button>
        </form>
      </section>
    </main>
  );
}
