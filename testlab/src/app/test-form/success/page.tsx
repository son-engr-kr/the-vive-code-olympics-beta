import { headers } from "next/headers";

export default async function FormSuccessPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return (
    <main className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-green-600">Message Sent!</h1>
        <p className="text-lg text-gray-600 mt-2">Thank you for contacting us. We will respond within 24 hours.</p>
      </header>

      <div className="flex gap-4">
        <a href={baseUrl} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium">Browse Books</a>
        <a href={`${baseUrl}/test-form`} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium">Send Another Message</a>
      </div>
    </main>
  );
}
