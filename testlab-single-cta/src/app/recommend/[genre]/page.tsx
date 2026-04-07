import { headers } from "next/headers";

const recommendations: Record<string, { title: string; author: string; year: number; rating: number; bookId: string; reason: string; description: string; chapters: string[] }> = {
  dystopian: {
    title: "1984", author: "George Orwell", year: 1949, rating: 4.7, bookId: "1984",
    reason: "The definitive dystopian novel about surveillance, truth, and power.",
    description: "In a totalitarian surveillance state, one man dares to think forbidden thoughts and love a forbidden woman. A chilling prophecy of power, language, and truth that remains devastatingly relevant.",
    chapters: ["Part One: The World of Big Brother", "Part Two: The Forbidden Love", "Part Three: The Ministry of Love"],
  },
  classic: {
    title: "To Kill a Mockingbird", author: "Harper Lee", year: 1960, rating: 4.8, bookId: "mockingbird",
    reason: "A masterpiece about justice, compassion, and moral courage.",
    description: "Through young Scout Finch's eyes, we witness her father Atticus defend a Black man falsely accused of rape in Depression-era Alabama, confronting prejudice with dignity and courage.",
    chapters: ["Part One: Childhood in Maycomb", "Part Two: The Trial"],
  },
  fantasy: {
    title: "The Hobbit", author: "J.R.R. Tolkien", year: 1937, rating: 4.7, bookId: "hobbit",
    reason: "The perfect gateway into the world of Middle-earth.",
    description: "Bilbo Baggins, a comfort-loving hobbit, is swept into an epic quest to help a company of dwarves reclaim their mountain home from the fearsome dragon Smaug.",
    chapters: ["An Unexpected Journey", "Riddles in the Dark", "The Lonely Mountain"],
  },
  scifi: {
    title: "Dune", author: "Frank Herbert", year: 1965, rating: 4.6, bookId: "dune",
    reason: "The greatest science fiction epic ever written.",
    description: "On the desert planet Arrakis, young Paul Atreides must navigate deadly politics, giant sandworms, and his own destiny as he fights for control of the most valuable substance in the universe.",
    chapters: ["Book One: Dune", "Book Two: Muad'Dib", "Book Three: The Prophet"],
  },
};

export default async function GenreRecommendation({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const rec = recommendations[genre];

  if (!rec) {
    return (
      <main className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-red-600">Genre Not Found</h1>
        <a href={`${baseUrl}/recommend`} className="mt-4 inline-block text-blue-600 font-medium">← Back to Genres</a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      <a href={`${baseUrl}/recommend`} className="text-blue-600 font-medium mb-6 inline-block">← Back to Genres</a>

      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Your Recommendation</h1>
        <p className="text-lg text-gray-600 mt-2">Based on your interest in {genre}, we recommend:</p>
      </header>

      <article className="p-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl border border-blue-200">
        <h2 className="text-3xl font-bold text-gray-900">{rec.title}</h2>
        <p className="text-lg text-gray-500 mt-1">by {rec.author} ({rec.year})</p>
        <div className="flex gap-3 mt-3">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{genre}</span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">Rating: {rec.rating}/5</span>
        </div>
        <p className="text-gray-800 mt-4 text-lg font-medium">{rec.reason}</p>
        <p className="text-gray-700 mt-3 text-lg leading-relaxed">{rec.description}</p>
        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">Chapters</h3>
        <ol className="list-decimal list-inside space-y-1">
          {rec.chapters.map((ch, i) => (
            <li key={i} className="text-gray-700">{ch}</li>
          ))}
        </ol>
        <a href={`${baseUrl}/book/${rec.bookId}`} className="mt-6 inline-block px-8 py-3 bg-blue-600 text-white rounded-lg font-medium text-lg">
          View Full Book Page
        </a>
      </article>

      <div className="mt-8 flex gap-4">
        <a href={`${baseUrl}/recommend`} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium">Try Another Genre</a>
        <a href={baseUrl} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium">Browse All Books</a>
      </div>
    </main>
  );
}
