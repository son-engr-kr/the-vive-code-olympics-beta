import { headers } from "next/headers";

export default async function NonSemanticPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return (
    <div className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="text-4xl font-bold text-gray-900 mb-2">BookFinder</div>
        <div className="text-lg text-gray-600">Discover your next favorite book.</div>
      </div>

      <div className="flex gap-4 mb-8">
        <a href={`${baseUrl}/recommend`} className="px-4 py-2 bg-green-600 text-white rounded-lg">Get a Recommendation</a>
        <a href={`${baseUrl}/about`} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">About Us</a>
      </div>

      <div className="mb-4">
        <div className="text-2xl font-semibold text-gray-800 mb-4">All Books</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border border-gray-200 rounded-xl">
            <div className="text-xl font-bold text-gray-900">1984</div>
            <div className="text-sm text-gray-500">by George Orwell (1949)</div>
            <div className="text-sm text-blue-600">Dystopian | Rating: 4.7/5</div>
            <div className="text-gray-700 mt-2">In a totalitarian surveillance state, one man dares to think forbidden thoughts.</div>
          </div>
          <div className="p-6 border border-gray-200 rounded-xl">
            <div className="text-xl font-bold text-gray-900">Dune</div>
            <div className="text-sm text-gray-500">by Frank Herbert (1965)</div>
            <div className="text-sm text-blue-600">Sci-Fi | Rating: 4.6/5</div>
            <div className="text-gray-700 mt-2">On the desert planet Arrakis, young Paul Atreides must navigate deadly politics and giant sandworms.</div>
          </div>
          <div className="p-6 border border-gray-200 rounded-xl">
            <div className="text-xl font-bold text-gray-900">The Hobbit</div>
            <div className="text-sm text-gray-500">by J.R.R. Tolkien (1937)</div>
            <div className="text-sm text-blue-600">Fantasy | Rating: 4.7/5</div>
            <div className="text-gray-700 mt-2">Bilbo Baggins is swept into an epic quest to reclaim a mountain home from a dragon.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
