import { headers } from "next/headers";

export default async function FormTestPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return (
    <main className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Contact BookFinder</h1>
        <p className="text-lg text-gray-600 mt-2">Send us a message and we will get back to you.</p>
      </header>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Form</h2>
        <form action={`${baseUrl}/test-form/success`} method="GET" className="space-y-4 max-w-md">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input type="text" id="name" name="name" placeholder="Enter your name" required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input type="email" id="email" name="email" placeholder="you@example.com" required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea id="message" name="message" placeholder="Type your message here" rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg"></textarea>
          </div>
          <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium">Send Message</button>
        </form>
      </section>

      <a href={baseUrl} className="text-blue-600 font-medium">← Back to All Books</a>
    </main>
  );
}
