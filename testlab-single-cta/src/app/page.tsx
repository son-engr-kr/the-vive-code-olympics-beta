import { headers } from "next/headers";

const books = [
  { id: "1984", title: "1984", author: "George Orwell", genre: "Dystopian", year: 1949, rating: 4.7, description: "In a totalitarian surveillance state, one man dares to think forbidden thoughts and love a forbidden woman. A chilling prophecy of power, language, and truth that remains devastatingly relevant." },
  { id: "dune", title: "Dune", author: "Frank Herbert", genre: "Sci-Fi", year: 1965, rating: 4.6, description: "On the desert planet Arrakis, young Paul Atreides must navigate deadly politics, giant sandworms, and his own destiny." },
  { id: "hobbit", title: "The Hobbit", author: "J.R.R. Tolkien", genre: "Fantasy", year: 1937, rating: 4.7, description: "Bilbo Baggins is swept into an epic quest to reclaim a mountain home from a dragon." },
  { id: "mockingbird", title: "To Kill a Mockingbird", author: "Harper Lee", genre: "Classic", year: 1960, rating: 4.8, description: "Through young Scout Finch's eyes, we witness her father Atticus defend a Black man falsely accused of rape." },
];

export default async function Home() {
  return (
    <main className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">BookFinder</h1>
        <p className="text-lg text-gray-600">Discover your next favorite book.</p>
      </header>
      <nav className="flex gap-4 mb-8">
        <a href="/recommend" className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium text-lg">Get a Recommendation</a>
      </nav>
      <section>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">All Books</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {books.map((book) => (
            <article key={book.id} className="p-6 border border-gray-200 rounded-xl">
              <h3 className="text-xl font-bold text-gray-900">{book.title}</h3>
              <p className="text-sm text-gray-500 mt-1">by {book.author} ({book.year})</p>
              <p className="text-sm text-blue-600 font-medium mt-1">{book.genre} | Rating: {book.rating}/5</p>
              <p className="text-gray-700 mt-2">{book.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
