import { headers } from "next/headers";

const books: Record<string, { title: string; author: string; genre: string; year: number; rating: number; description: string; chapters: string[] }> = {
  "1984": {
    title: "1984", author: "George Orwell", genre: "Dystopian", year: 1949, rating: 4.7,
    description: "In a totalitarian surveillance state, one man dares to think forbidden thoughts and love a forbidden woman. A chilling prophecy of power, language, and truth that remains devastatingly relevant.",
    chapters: ["Part One: The World of Big Brother", "Part Two: The Forbidden Love", "Part Three: The Ministry of Love"],
  },
  "gatsby": {
    title: "The Great Gatsby", author: "F. Scott Fitzgerald", genre: "Classic", year: 1925, rating: 4.5,
    description: "Through the eyes of narrator Nick Carraway, we witness the rise and fall of mysterious millionaire Jay Gatsby and his obsessive pursuit of Daisy Buchanan across the glittering Long Island of the 1920s.",
    chapters: ["Chapter 1-3: Meeting Gatsby", "Chapter 4-6: The Dream Unravels", "Chapter 7-9: The Tragic End"],
  },
  "mockingbird": {
    title: "To Kill a Mockingbird", author: "Harper Lee", genre: "Classic", year: 1960, rating: 4.8,
    description: "Through young Scout Finch's eyes, we witness her father Atticus defend a Black man falsely accused of rape in Depression-era Alabama, confronting prejudice with dignity and courage.",
    chapters: ["Part One: Childhood in Maycomb", "Part Two: The Trial"],
  },
  "pride": {
    title: "Pride and Prejudice", author: "Jane Austen", genre: "Romance", year: 1813, rating: 4.6,
    description: "Elizabeth Bennet and Mr. Darcy must overcome their own pride and prejudice to find true love, in this sharp and witty portrait of Regency-era English society.",
    chapters: ["Volume I: First Impressions", "Volume II: Growing Understanding", "Volume III: Resolution"],
  },
  "hobbit": {
    title: "The Hobbit", author: "J.R.R. Tolkien", genre: "Fantasy", year: 1937, rating: 4.7,
    description: "Bilbo Baggins, a comfort-loving hobbit, is swept into an epic quest to help a company of dwarves reclaim their mountain home from the fearsome dragon Smaug.",
    chapters: ["An Unexpected Journey", "Riddles in the Dark", "The Lonely Mountain"],
  },
  "dune": {
    title: "Dune", author: "Frank Herbert", genre: "Sci-Fi", year: 1965, rating: 4.6,
    description: "On the desert planet Arrakis, young Paul Atreides must navigate deadly politics, giant sandworms, and his own destiny as he fights for control of the most valuable substance in the universe.",
    chapters: ["Book One: Dune", "Book Two: Muad'Dib", "Book Three: The Prophet"],
  },
};

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const book = books[id];

  if (!book) {
    return (
      <main className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-red-600">Book Not Found</h1>
        <a href={baseUrl} className="mt-4 inline-block text-blue-600 font-medium">← Back to All Books</a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      <a href={baseUrl} className="text-blue-600 font-medium mb-6 inline-block">← Back to All Books</a>

      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">{book.title}</h1>
        <p className="text-lg text-gray-500 mt-1">by {book.author} ({book.year})</p>
        <div className="flex gap-3 mt-3">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{book.genre}</span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">Rating: {book.rating}/5</span>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">About This Book</h2>
        <p className="text-gray-700 leading-relaxed text-lg">{book.description}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">Chapters</h2>
        <ol className="list-decimal list-inside space-y-2">
          {book.chapters.map((ch, i) => (
            <li key={i} className="text-gray-700 text-lg">{ch}</li>
          ))}
        </ol>
      </section>

      <div className="flex gap-4">
        <a href={baseUrl} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium">Browse More Books</a>
        <a href={`${baseUrl}/recommend`} className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium">Get a Recommendation</a>
      </div>
    </main>
  );
}
