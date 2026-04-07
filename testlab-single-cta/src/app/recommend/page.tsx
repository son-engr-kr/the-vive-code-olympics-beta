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
        <p className="text-lg text-gray-600 mt-2">Answer a quick question and we will suggest the perfect book for you.</p>
      </header>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">What genre interests you most?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href={`${baseUrl}/recommend/dystopian`} className="block p-6 border-2 border-gray-200 rounded-xl text-center hover:border-blue-500 hover:shadow-lg transition-all">
            <h3 className="text-xl font-bold text-gray-900 mt-2">Dystopian</h3>
            <p className="text-gray-600 mt-1">Dark futures and cautionary tales</p>
          </a>
          <a href={`${baseUrl}/recommend/classic`} className="block p-6 border-2 border-gray-200 rounded-xl text-center hover:border-blue-500 hover:shadow-lg transition-all">
            <h3 className="text-xl font-bold text-gray-900 mt-2">Classic Literature</h3>
            <p className="text-gray-600 mt-1">Timeless stories that defined literature</p>
          </a>
          <a href={`${baseUrl}/recommend/fantasy`} className="block p-6 border-2 border-gray-200 rounded-xl text-center hover:border-blue-500 hover:shadow-lg transition-all">
            <h3 className="text-xl font-bold text-gray-900 mt-2">Fantasy</h3>
            <p className="text-gray-600 mt-1">Epic adventures in imaginary worlds</p>
          </a>
          <a href={`${baseUrl}/recommend/scifi`} className="block p-6 border-2 border-gray-200 rounded-xl text-center hover:border-blue-500 hover:shadow-lg transition-all">
            <h3 className="text-xl font-bold text-gray-900 mt-2">Science Fiction</h3>
            <p className="text-gray-600 mt-1">Mind-bending futures and alien worlds</p>
          </a>
        </div>
      </section>
    </main>
  );
}
