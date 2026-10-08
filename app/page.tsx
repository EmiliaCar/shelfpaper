"use client";
import Image from "next/image";

import { useState, type FormEvent } from "react";

type Book = {
  key: string;
  title: string;
  authors: string[];
  firstPublishYear?: number;
  coverId?: number;
};

type OpenLibraryDocument = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
};

type OpenLibraryResponse = {
  docs: OpenLibraryDocument[];
};

export default function Home() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedQuery = query.trim();

    if (!cleanedQuery) {
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setError("");

    try {
      const parameters = new URLSearchParams({
        q: cleanedQuery,
        fields: "key,title,author_name,first_publish_year,cover_i",
        limit: "8",
      });

      const response = await fetch(
        `https://openlibrary.org/search.json?${parameters}`,
      );

      if (!response.ok) {
        throw new Error("The book search could not be completed.");
      }

      const data: OpenLibraryResponse = await response.json();

      const formattedBooks: Book[] = data.docs.map((book) => ({
        key: book.key,
        title: book.title,
        authors: book.author_name ?? ["Unknown author"],
        firstPublishYear: book.first_publish_year,
        coverId: book.cover_i,
      }));

      setBooks(formattedBooks);
    } catch {
      setBooks([]);
      setError("Something went wrong while searching. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4efe6] text-[#2c2118]">
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-[#8b5e3c]">
          Your personal reading room
        </p>

        <h1 className="text-6xl font-bold tracking-tight sm:text-8xl">
          Shelfscape
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-8 text-[#65584d]">
          Collect the books you have read, arrange their covers on a beautiful
          digital shelf, and turn your library into a desktop wallpaper.
        </p>

        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-expanded={isSearchOpen}
          className="mt-10 w-fit rounded-full bg-[#2c2118] px-6 py-3 font-semibold text-[#f4efe6] transition hover:bg-[#8b5e3c]"
        >
          {isSearchOpen ? "Find another book" : "Add your first book"}
        </button>

        {isSearchOpen && (
          <div className="mt-8 rounded-3xl border border-[#d8cbbb] bg-white/60 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Find a book</h2>

            <p className="mt-2 text-[#65584d]">
              Search using a title, author, or ISBN.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="For example: The Hobbit"
                className="min-w-0 flex-1 rounded-full border border-[#b9aa98] bg-white px-5 py-3 outline-none transition focus:border-[#8b5e3c] focus:ring-2 focus:ring-[#8b5e3c]/20"
              />

              <button
                type="submit"
                disabled={isLoading}
                className="rounded-full bg-[#8b5e3c] px-6 py-3 font-semibold text-white transition hover:bg-[#70482d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Searching..." : "Search"}
              </button>
            </form>

            {error && (
              <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">
                {error}
              </p>
            )}

            {hasSearched && !isLoading && !error && books.length === 0 && (
              <p className="mt-5 text-[#65584d]">
                No books were found. Try another title or an ISBN.
              </p>
            )}

            {books.length > 0 && (
  <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
    {books.map((book) => (
      <article
        key={book.key}
        className="overflow-hidden rounded-2xl border border-[#ded3c5] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
      >
        {book.coverId ? (
          <div className="relative aspect-[2/3] bg-[#e8ded2]">
            <Image
              src={`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`}
              alt={`Cover of ${book.title}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-[2/3] items-center justify-center bg-[#d9c5ae] p-6 text-center">
            <span className="text-lg font-semibold text-[#6f5038]">
              Cover unavailable
            </span>
          </div>
        )}

        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8b5e3c]">
            {book.firstPublishYear ?? "Year unknown"}
          </p>

          <h3 className="mt-3 text-lg font-bold leading-snug">
            {book.title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#65584d]">
            {book.authors.slice(0, 2).join(", ")}
          </p>
        </div>
      </article>
    ))}
  </div>
)}
          </div>
        )}
      </section>
    </main>
  );
}