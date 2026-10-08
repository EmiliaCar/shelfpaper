"use client";

import { useState, type FormEvent } from "react";

export default function Home() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedQuery = query.trim();

    if (!cleanedQuery) {
      return;
    }

    setSubmittedQuery(cleanedQuery);
  }

  return (
    <main className="min-h-screen bg-[#f4efe6] text-[#2c2118]">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
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
          Add your first book
        </button>

        {isSearchOpen && (
          <div className="mt-8 max-w-xl rounded-3xl border border-[#d8cbbb] bg-white/60 p-6 shadow-sm">
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
                className="rounded-full bg-[#8b5e3c] px-6 py-3 font-semibold text-white transition hover:bg-[#70482d]"
              >
                Search
              </button>
            </form>

            {submittedQuery && (
              <p className="mt-5 text-sm text-[#65584d]">
                Searching for:{" "}
                <strong className="text-[#2c2118]">
                  {submittedQuery}
                </strong>
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}