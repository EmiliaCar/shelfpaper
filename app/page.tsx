"use client";
import Image from "next/image";
import { toPng } from "html-to-image";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  extractSpineColor,
  getFallbackColor,
  getSpineTextColor,
  packSpines,
} from "./spines";

type Book = {
  key: string;
  title: string;
  authors: string[];
  firstPublishYear?: number;
  coverId?: number;
  pages?: number;
  spineColor?: string;
};

type ShelfView = "covers" | "spines";

type OpenLibraryDocument = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
};

type OpenLibraryResponse = {
  docs: OpenLibraryDocument[];
};

export default function Home() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [author, setAuthor] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
   const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const NUMBER_OF_COMPARTMENTS = 12;
const BOOKS_PER_COMPARTMENT = 3;
const LIBRARY_STORAGE_KEY = "shelfscape-library";
const VIEW_STORAGE_KEY = "shelfscape-view";
const [shelfView, setShelfView] = useState<ShelfView>("covers");
const spineColorRequests = useRef(new Set<string>());
const wallpaperRef = useRef<HTMLDivElement>(null);
const [isExporting, setIsExporting] = useState(false);
useEffect(() => {
    const savedLibrary = window.localStorage.getItem(
      LIBRARY_STORAGE_KEY,
    );

    if (savedLibrary) {
      try {
        const parsedLibrary = JSON.parse(savedLibrary) as Book[];
        setLibraryBooks(parsedLibrary);
      } catch {
        window.localStorage.removeItem(LIBRARY_STORAGE_KEY);
      }
    }

    if (window.localStorage.getItem(VIEW_STORAGE_KEY) === "spines") {
      setShelfView("spines");
    }

    setIsLibraryLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLibraryLoaded) {
      return;
    }

    window.localStorage.setItem(
      LIBRARY_STORAGE_KEY,
      JSON.stringify(libraryBooks),
    );
  }, [libraryBooks, isLibraryLoaded]);

  useEffect(() => {
    if (isLibraryLoaded) {
      window.localStorage.setItem(VIEW_STORAGE_KEY, shelfView);
    }
  }, [shelfView, isLibraryLoaded]);

  // Work out each book's spine colour once and keep it with the library.
  useEffect(() => {
    for (const book of libraryBooks) {
      if (book.spineColor || spineColorRequests.current.has(book.key)) {
        continue;
      }

      spineColorRequests.current.add(book.key);

      const colorRequest = book.coverId
        ? extractSpineColor(book.coverId)
        : Promise.reject(new Error("No cover."));

      colorRequest
        .catch(() => getFallbackColor(book.key))
        .then((spineColor) => {
          setLibraryBooks((currentBooks) =>
            currentBooks.map((currentBook) =>
              currentBook.key === book.key
                ? { ...currentBook, spineColor }
                : currentBook,
            ),
          );
        });
    }
  }, [libraryBooks]);

  

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedTitle = query.trim();
const cleanedAuthor = author.trim();

if (!cleanedTitle && !cleanedAuthor) {
  setError("Enter a book title, an author, or both.");
  return;
}

    setIsLoading(true);
    setHasSearched(true);
    setError("");

    try {
      const parameters = new URLSearchParams({
  fields:
    "key,title,author_name,first_publish_year,cover_i,number_of_pages_median",
  limit: "30",
});

if (cleanedTitle) {
  parameters.set("title", cleanedTitle);
}

if (cleanedAuthor) {
  parameters.set("author", cleanedAuthor);
}
      const response = await fetch(
        `https://openlibrary.org/search.json?${parameters}`,
      );

      if (!response.ok) {
        throw new Error("The book search could not be completed.");
      }

      const data: OpenLibraryResponse = await response.json();

      const formattedBooks: Book[] = data.docs
  .filter((book) => typeof book.cover_i === "number")
  .slice(0, 8)
  .map((book) => ({
    key: book.key,
    title: book.title,
    authors: book.author_name ?? ["Unknown author"],
    firstPublishYear: book.first_publish_year,
    coverId: book.cover_i,
    pages: book.number_of_pages_median,
  }));

      setBooks(formattedBooks);
    } catch {
      setBooks([]);
      setError("Something went wrong while searching. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }
  function addBook(book: Book) {
  setLibraryBooks((currentBooks) => {
    const bookAlreadyExists = currentBooks.some(
      (currentBook) => currentBook.key === book.key,
    );

    if (bookAlreadyExists) {
      return currentBooks;
    }

    return [...currentBooks, book];
  });
}

function removeBook(bookKey: string) {
  setLibraryBooks((currentBooks) =>
    currentBooks.filter((book) => book.key !== bookKey),
  );
}
async function downloadWallpaper() {
  if (!wallpaperRef.current) {
    return;
  }

  setIsExporting(true);
  setError("");

  try {
    const outputWidth = 3024;
    const outputHeight = 1964;

    const elementWidth = wallpaperRef.current.offsetWidth;
    const exportScale = outputWidth / elementWidth;

    const dataUrl = await toPng(wallpaperRef.current, {
      cacheBust: true,
      pixelRatio: exportScale,
      backgroundColor: "#6f3f22",
    });

    const downloadLink = document.createElement("a");
    downloadLink.download =
      `shelfpaper-${outputWidth}x${outputHeight}.png`;
    downloadLink.href = dataUrl;
    downloadLink.click();
  } catch (exportError) {
    console.error(exportError);
    setError("The wallpaper could not be generated.");
  } finally {
    setIsExporting(false);
  }
}
  const spineShelf = packSpines(libraryBooks, NUMBER_OF_COMPARTMENTS);
  const hiddenBookCount =
    shelfView === "spines"
      ? spineShelf.hiddenCount
      : Math.max(
          0,
          libraryBooks.length -
            NUMBER_OF_COMPARTMENTS * BOOKS_PER_COMPARTMENT,
        );

  return (
    <main className="min-h-screen bg-[#f4efe6] text-[#2c2118]">
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-[#8b5e3c]">
          Your personal reading room
        </p>

        <h1 className="text-6xl font-bold tracking-tight sm:text-8xl">
          Shelfpaper
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
          {isSearchOpen ? "Find another book" : "Add a book"}
        </button>

        {isSearchOpen && (
          <div className="mt-8 rounded-3xl border border-[#d8cbbb] bg-white/60 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Find a book</h2>

            <p className="mt-2 text-[#65584d]">
             Search by title, author, or combine both for better results.
            </p>

            <form
            
  onSubmit={handleSubmit}
  className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
>
  <label htmlFor="book-title" className="sr-only">
    Book title
  </label>

  <input
    id="book-title"
    type="search"
    value={query}
    onChange={(event) => setQuery(event.target.value)}
    placeholder="Book title - optional"
    className="min-w-0 rounded-full border border-[#b9aa98] bg-white px-5 py-3 outline-none transition focus:border-[#8b5e3c] focus:ring-2 focus:ring-[#8b5e3c]/20"
  />

  <label htmlFor="book-author" className="sr-only">
    Author
  </label>

  <input
    id="book-author"
    type="search"
    value={author}
    onChange={(event) => setAuthor(event.target.value)}
    placeholder="Author — optional"
    className="min-w-0 rounded-full border border-[#b9aa98] bg-white px-5 py-3 outline-none transition focus:border-[#8b5e3c] focus:ring-2 focus:ring-[#8b5e3c]/20"
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
                No books were found.
              </p>
            )}

            {books.length > 0 && (
  <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
    {books.map((book) => (
      <article
        key={book.key}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#ded3c5] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
        {book.coverId ? (
          <div className="relative aspect-[2/3] bg-[#e8ded2]">
            <Image
              src={`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`}
              alt={`Cover of ${book.title}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
             className="object-contain"
            />
          </div>
        ) : (
          <div className="flex aspect-[2/3] items-center justify-center bg-[#d9c5ae] p-6 text-center">
            <span className="text-lg font-semibold text-[#6f5038]">
              Cover unavailable
            </span>
          </div>
        )}

        <div className="flex flex-1 flex-col p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8b5e3c]">
            {book.firstPublishYear ?? "Year unknown"}
          </p>

          <h3 className="mt-3 text-lg font-bold leading-snug">
            {book.title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#65584d]">
            {book.authors.slice(0, 2).join(", ")}
          </p>
          <button
  type="button"
  onClick={() => addBook(book)}
  disabled={libraryBooks.some(
    (libraryBook) => libraryBook.key === book.key,
  )}
  className="mt-auto w-full rounded-full bg-[#2c2118] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8b5e3c] disabled:cursor-default disabled:bg-[#b9aa98]"
>
  {libraryBooks.some(
    (libraryBook) => libraryBook.key === book.key,
  )
    ? "Added"
    : "Add to shelf"}
</button>
        </div>
      </article>
    ))}
  </div>
)}
          </div>
        )}
        <div className="mt-16 flex flex-wrap items-center justify-end gap-3">
  <div
    role="group"
    aria-label="Shelf view"
    className="flex rounded-full border border-[#b9aa98] bg-white/60 p-1"
  >
    {(["covers", "spines"] as const).map((view) => (
      <button
        key={view}
        type="button"
        onClick={() => setShelfView(view)}
        aria-pressed={shelfView === view}
        className="rounded-full px-4 py-2 text-sm font-semibold capitalize text-[#65584d] transition hover:text-[#2c2118] aria-pressed:bg-[#2c2118] aria-pressed:text-white"
      >
        {view}
      </button>
    ))}
  </div>

  <button
    type="button"
    onClick={downloadWallpaper}
    disabled={isExporting || libraryBooks.length === 0}
    className="rounded-full bg-[#2c2118] px-6 py-3 font-semibold text-white transition hover:bg-[#8b5e3c] disabled:cursor-not-allowed disabled:opacity-50"
  >
    {isExporting ? "Creating wallpaper..." : "Download wallpaper"}
  </button>
</div>
        <div
 
  className="mt-16 bg-[#f4efe6] p-8"
>
  <div className="flex items-end justify-between gap-4">
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8b5e3c]">
        Your collection
      </p>

      <h2 className="mt-2 text-4xl font-bold">My library</h2>
    </div>

    <p className="text-right text-sm text-[#65584d]">
      {libraryBooks.length}{" "}
      {libraryBooks.length === 1 ? "book" : "books"}
      {hiddenBookCount > 0 && (
        <span className="block">
          {hiddenBookCount} don&apos;t fit on the shelf
          {shelfView === "covers" && " — try the spines view"}
        </span>
      )}
    </p>
  </div>

  <div ref={wallpaperRef} className="bookcase mt-8">
    {shelfView === "spines" &&
      spineShelf.compartments.map((compartmentSpines, compartmentIndex) => (
        <div
          key={compartmentIndex}
          className="bookcase-compartment bookcase-compartment-spines"
        >
          <div className="bookcase-spines">
            {compartmentSpines.map(({ book, size }) => {
              const spineColor =
                book.spineColor ?? getFallbackColor(book.key);

              return (
                <div
                  key={book.key}
                  className="bookcase-spine group"
                  title={`${book.title} — ${book.authors[0]}`}
                  style={{
                    width: `${size.width}%`,
                    height: `${size.height}%`,
                    fontSize: `${size.width * 0.42}cqw`,
                    backgroundColor: spineColor,
                    color: getSpineTextColor(spineColor),
                  }}
                >
                  <span className="bookcase-spine-title">{book.title}</span>
                  <span className="bookcase-spine-author">
                    {book.authors[0].split(" ").at(-1)}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeBook(book.key)}
                    aria-label={`Remove ${book.title} from shelf`}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#31180d] px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-md transition hover:bg-red-700 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

    {shelfView === "covers" && Array.from({ length: NUMBER_OF_COMPARTMENTS }).map(
      (_, compartmentIndex) => {
        const startingIndex =
          compartmentIndex * BOOKS_PER_COMPARTMENT;

        const compartmentBooks = libraryBooks.slice(
          startingIndex,
          startingIndex + BOOKS_PER_COMPARTMENT,
        );

        return (
          <div
            key={compartmentIndex}
            className="bookcase-compartment"
          >
            <div className="bookcase-books">
              {compartmentBooks.map((book) => (
                <div
                  key={book.key}
                  className="bookcase-book group relative"
                >
                  {book.coverId ? (
                    <div className="relative aspect-[2/3] overflow-hidden rounded-sm">
                      <Image
                        src={`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`}
                        alt={`Cover of ${book.title}`}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[2/3] items-center justify-center rounded-sm bg-[#d9c5ae] p-2 text-center text-xs font-semibold text-[#6f5038]">
                      {book.title}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removeBook(book.key)}
                    aria-label={`Remove ${book.title} from shelf`}
                    className="absolute -right-2 -top-2 rounded-full bg-[#31180d] px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-md transition hover:bg-red-700 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      },
    )}
  </div>
</div>

      </section>
    </main>
  );
}