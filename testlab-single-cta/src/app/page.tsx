// SSR page - no "use client"
import { headers } from "next/headers";

const books = [
  { id: "1984", title: "1984", author: "George Orwell", genre: "Dystopian", year: 1949, rating: 4.7, description: "In a totalitarian surveillance state, one man dares to think forbidden thoughts and love a forbidden woman. A chilling prophecy of power, language, and truth that remains devastatingly relevant." },
  { id: "gatsby", title: "The Great Gatsby", author: "F. Scott Fitzgerald", genre: "Classic", year: 1925, rating: 4.5, description: "Through the eyes of narrator Nick Carraway, we witness the rise and fall of mysterious millionaire Jay Gatsby and his obsessive pursuit of Daisy Buchanan across the glittering Long Island of the 1920s." },
  { id: "mockingbird", title: "To Kill a Mockingbird", author: "Harper Lee", genre: "Classic", year: 1960, rating: 4.8, description: "Through young Scout Finch's eyes, we witness her father Atticus defend a Black man falsely accused of rape in Depression-era Alabama, confronting prejudice with dignity and courage." },
  { id: "pride", title: "Pride and Prejudice", author: "Jane Austen", genre: "Romance", year: 1813, rating: 4.6, description: "Elizabeth Bennet and Mr. Darcy must overcome their own pride and prejudice to find true love, in this sharp and witty portrait of Regency-era English society." },
  { id: "hobbit", title: "The Hobbit", author: "J.R.R. Tolkien", genre: "Fantasy", year: 1937, rating: 4.7, description: "Bilbo Baggins, a comfort-loving hobbit, is swept into an epic quest to help a company of dwarves reclaim their mountain home from the fearsome dragon Smaug." },
  { id: "dune", title: "Dune", author: "Frank Herbert", genre: "Sci-Fi", year: 1965, rating: 4.6, description: "On the desert planet Arrakis, young Paul Atreides must navigate deadly politics, giant sandworms, and his own destiny as he fights for control of the most valuable substance in the universe." },
];

export default async function Home() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return (
    <main className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">BookFinder</h1>
        <p className="text-lg text-gray-600">
          Discover your next favorite book. Browse our collection of {books.length} curated titles,
          get personalized recommendations by genre, or explore detailed book descriptions.
        </p>
      </header>

      <nav className="flex gap-4 mb-8" aria-label="Main navigation">
        <a href={`${baseUrl}/recommend`} className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium text-lg">Get a Recommendation</a>
        <a href={`${baseUrl}/about`} className="px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium">About Us</a>
      </nav>

      <section id="all-books" aria-label="Book collection">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">All Books ({books.length} titles)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {books.map((book) => (
            <article key={book.id} className="p-6 border border-gray-200 rounded-xl">
              <h3 className="text-xl font-bold text-gray-900">{book.title}</h3>
              <p className="text-sm text-gray-500 mt-1">by {book.author} ({book.year})</p>
              <p className="text-sm text-blue-600 font-medium mt-1">{book.genre} | Rating: {book.rating}/5</p>
              <p className="text-gray-700 mt-2">{book.description}</p>
              <a href={`${baseUrl}/book/${book.id}`} className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm">View Full Details</a>
            </article>
          ))}
        </div>
      </section>

      <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500">
        <p>BookFinder — Built for VibeCode Olympics 2026</p>
        <p className="mt-1">
          <a href={`${baseUrl}/about`} className="text-blue-600">About</a>
          {" · "}
          <a href={`${baseUrl}/recommend`} className="text-blue-600">Recommendations</a>
        </p>
      </footer>
    </main>
  );
}
