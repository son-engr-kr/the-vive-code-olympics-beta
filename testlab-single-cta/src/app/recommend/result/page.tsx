import { headers } from "next/headers";

const recommendations: Record<string, { title: string; author: string; bookId: string; teaser: string }> = {
  dystopian: { title: "1984", author: "George Orwell", bookId: "1984", teaser: "A chilling prophecy of a totalitarian surveillance state." },
  classic: { title: "To Kill a Mockingbird", author: "Harper Lee", bookId: "mockingbird", teaser: "A masterpiece about justice, compassion, and moral courage." },
  fantasy: { title: "The Hobbit", author: "J.R.R. Tolkien", bookId: "hobbit", teaser: "An epic quest to reclaim a mountain home from a dragon." },
  scifi: { title: "Dune", author: "Frank Herbert", bookId: "dune", teaser: "Politics, giant sandworms, and destiny on a desert planet." },
};

export default async function ResultPage({ searchParams }: { searchParams: Promise<{ genre?: string; name?: string }> }) {
  const params = await searchParams;
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const genre = params.genre || "dystopian";
  const name = params.name || "Reader";
  const rec = recommendations[genre] || recommendations["dystopian"];

  return (
    <main className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      <a href={`${baseUrl}/recommend`} className="text-blue-600 font-medium mb-6 inline-block">← Try Again</a>
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Hello {name}! We Recommend:</h1>
      </header>
      <article className="p-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl border border-blue-200">
        <h2 className="text-3xl font-bold text-gray-900">{rec.title}</h2>
        <p className="text-lg text-gray-500 mt-1">by {rec.author}</p>
        <p className="text-gray-700 mt-4 text-lg">{rec.teaser}</p>
        <a href={`${baseUrl}/book/${rec.bookId}`} className="mt-6 inline-block px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-xl">
          Read Full Description →
        </a>
      </article>
    </main>
  );
}
