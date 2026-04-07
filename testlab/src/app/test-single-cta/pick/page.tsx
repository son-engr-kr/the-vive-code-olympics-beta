import { headers } from "next/headers";

export default async function PickGenrePage() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return (
    <main className="min-h-screen bg-white p-8 max-w-3xl mx-auto">
      <a href={`${baseUrl}/test-single-cta`} className="text-blue-600 font-medium mb-6 inline-block">← Back</a>

      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900">Pick Your Genre</h1>
        <p className="text-lg text-gray-600 mt-2">Select the genre that interests you most.</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto" aria-label="Genre selection">
        <a href={`${baseUrl}/test-single-cta/result/dystopian`} className="block p-8 border-2 border-gray-200 rounded-2xl text-center hover:border-green-500 hover:shadow-lg transition-all">
          <h2 className="text-2xl font-bold text-gray-900">Dystopian</h2>
          <p className="text-gray-600 mt-2">Dark futures and cautionary tales</p>
        </a>
        <a href={`${baseUrl}/test-single-cta/result/classic`} className="block p-8 border-2 border-gray-200 rounded-2xl text-center hover:border-green-500 hover:shadow-lg transition-all">
          <h2 className="text-2xl font-bold text-gray-900">Classic</h2>
          <p className="text-gray-600 mt-2">Timeless stories that defined literature</p>
        </a>
        <a href={`${baseUrl}/test-single-cta/result/fantasy`} className="block p-8 border-2 border-gray-200 rounded-2xl text-center hover:border-green-500 hover:shadow-lg transition-all">
          <h2 className="text-2xl font-bold text-gray-900">Fantasy</h2>
          <p className="text-gray-600 mt-2">Epic adventures in imaginary worlds</p>
        </a>
        <a href={`${baseUrl}/test-single-cta/result/scifi`} className="block p-8 border-2 border-gray-200 rounded-2xl text-center hover:border-green-500 hover:shadow-lg transition-all">
          <h2 className="text-2xl font-bold text-gray-900">Sci-Fi</h2>
          <p className="text-gray-600 mt-2">Mind-bending futures and alien worlds</p>
        </a>
      </section>
    </main>
  );
}
