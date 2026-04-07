export default function RecommendPage() {
  return (
    <main className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      <a href="/" className="text-blue-600 font-medium mb-6 inline-block">← Back</a>
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Pick Your Genre</h1>
      </header>
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href="/recommend/dystopian" className="block p-6 border-2 border-gray-200 rounded-xl text-center">
          <h2 className="text-xl font-bold">Dystopian</h2>
        </a>
        <a href="/recommend/fantasy" className="block p-6 border-2 border-gray-200 rounded-xl text-center">
          <h2 className="text-xl font-bold">Fantasy</h2>
        </a>
        <a href="/recommend/classic" className="block p-6 border-2 border-gray-200 rounded-xl text-center">
          <h2 className="text-xl font-bold">Classic</h2>
        </a>
        <a href="/recommend/scifi" className="block p-6 border-2 border-gray-200 rounded-xl text-center">
          <h2 className="text-xl font-bold">Sci-Fi</h2>
        </a>
      </section>
    </main>
  );
}
