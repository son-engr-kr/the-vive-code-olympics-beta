import { headers } from "next/headers";

const recommendations: Record<string, { title: string; author: string; year: number; rating: number; description: string }> = {
  dystopian: {
    title: "1984", author: "George Orwell", year: 1949, rating: 4.7,
    description: "In a totalitarian surveillance state, one man dares to think forbidden thoughts and love a forbidden woman. A chilling prophecy of power, language, and truth that remains devastatingly relevant.",
  },
  classic: {
    title: "To Kill a Mockingbird", author: "Harper Lee", year: 1960, rating: 4.8,
    description: "Through young Scout Finch's eyes, we witness her father Atticus defend a Black man falsely accused of rape in Depression-era Alabama, confronting prejudice with dignity and courage.",
  },
  fantasy: {
    title: "The Hobbit", author: "J.R.R. Tolkien", year: 1937, rating: 4.7,
    description: "Bilbo Baggins, a comfort-loving hobbit, is swept into an epic quest to help a company of dwarves reclaim their mountain home from the fearsome dragon Smaug.",
  },
  scifi: {
    title: "Dune", author: "Frank Herbert", year: 1965, rating: 4.6,
    description: "On the desert planet Arrakis, young Paul Atreides must navigate deadly politics, giant sandworms, and his own destiny as he fights for control of the most valuable substance in the universe.",
  },
};

export default async function ResultPage({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const rec = recommendations[genre];
  if (!rec) {
    return (
      <main className="min-h-screen bg-white p-8 max-w-3xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-red-600">Genre not found</h1>
        <a href={`${baseUrl}/test-single-cta/pick`} className="mt-4 inline-block text-blue-600 font-medium">← Try again</a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-8 max-w-3xl mx-auto">
      <a href={`${baseUrl}/test-single-cta/pick`} className="text-blue-600 font-medium mb-6 inline-block">← Pick a different genre</a>

      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-gray-900">Your Recommendation</h1>
        <p className="text-lg text-gray-600 mt-2">Based on your interest in {genre}, we recommend:</p>
      </header>

      <article className="p-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border border-green-200 text-center">
        <h2 className="text-3xl font-bold text-gray-900">{rec.title}</h2>
        <p className="text-lg text-gray-500 mt-1">by {rec.author} ({rec.year})</p>
        <p className="text-yellow-600 font-medium mt-2">Rating: {rec.rating}/5</p>
        <p className="text-gray-700 mt-4 text-lg leading-relaxed">{rec.description}</p>
      </article>

      <div className="mt-8 text-center">
        <a href={`${baseUrl}/test-single-cta/pick`} className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium">Try Another Genre</a>
      </div>
    </main>
  );
}
