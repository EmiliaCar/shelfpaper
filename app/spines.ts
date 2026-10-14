import { getImageProps } from "next/image";

export type SpineBook = {
  key: string;
  pages?: number;
  spineColor?: string;
};

export type SpineSize = {
  // Percent of the compartment width.
  width: number;
  // Percent of the compartment height.
  height: number;
};

// Cloth-binding colours used when a cover is missing or can't be read.
const FALLBACK_COLORS = [
  "#7a2e2a",
  "#2f4a3a",
  "#26395a",
  "#8a6a2f",
  "#4b2f4f",
  "#3d5560",
  "#6b3b24",
  "#2b2b33",
];

// Room left in each compartment for spines, in percent of its width.
const COMPARTMENT_CAPACITY = 96;

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

export function getFallbackColor(bookKey: string) {
  return FALLBACK_COLORS[hashString(bookKey) % FALLBACK_COLORS.length];
}

export function getSpineSize(book: SpineBook): SpineSize {
  const hash = hashString(book.key);
  // Books without a page count get a stable, made-up one.
  const pages = book.pages ?? 150 + (hash % 450);

  return {
    width: Math.min(11, Math.max(5.5, 5 + pages / 100)),
    height: 80 + (hash % 18),
  };
}

// Fills compartments left to right, moving to the next one when a spine
// no longer fits. Books that don't fit in any compartment are counted.
export function packSpines<T extends SpineBook>(
  books: T[],
  numberOfCompartments: number,
) {
  const compartments: { book: T; size: SpineSize }[][] = Array.from(
    { length: numberOfCompartments },
    () => [],
  );
  let compartmentIndex = 0;
  let usedWidth = 0;
  let hiddenCount = 0;

  for (const book of books) {
    const size = getSpineSize(book);

    if (usedWidth + size.width > COMPARTMENT_CAPACITY) {
      compartmentIndex += 1;
      usedWidth = 0;
    }

    if (compartmentIndex >= numberOfCompartments) {
      hiddenCount += 1;
      continue;
    }

    compartments[compartmentIndex].push({ book, size });
    usedWidth += size.width;
  }

  return { compartments, hiddenCount };
}

function rgbToHsl(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { hue: 0, saturation: 0, lightness };
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue: number;

  if (max === r) {
    hue = (g - b) / delta + (g < b ? 6 : 0);
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  return { hue: hue * 60, saturation, lightness };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = document.createElement("img");
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

// Reads the dominant colour of an Open Library cover. The image goes
// through the Next.js image optimizer so it's same-origin and the canvas
// can be read.
export async function extractSpineColor(coverId: number) {
  const { props } = getImageProps({
    src: `https://covers.openlibrary.org/b/id/${coverId}-S.jpg`,
    alt: "",
    width: 64,
    height: 96,
  });
  const image = await loadImage(props.src);

  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 36;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

  let red = 0;
  let green = 0;
  let blue = 0;
  let totalWeight = 0;

  for (let index = 0; index < data.length; index += 4) {
    const { saturation, lightness } = rgbToHsl(
      data[index],
      data[index + 1],
      data[index + 2],
    );

    // Skip paper-white and ink-black pixels, and favour colourful ones,
    // so the spine isn't a muddy average.
    if (lightness > 0.92 || lightness < 0.08) {
      continue;
    }

    const weight = 0.15 + saturation * saturation;
    red += data[index] * weight;
    green += data[index + 1] * weight;
    blue += data[index + 2] * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    throw new Error("The cover has no usable colour.");
  }

  const { hue, saturation, lightness } = rgbToHsl(
    red / totalWeight,
    green / totalWeight,
    blue / totalWeight,
  );

  // Keep spines in a bookish range: never washed out, never pitch black.
  const spineLightness = Math.min(0.6, Math.max(0.2, lightness));
  const spineSaturation = Math.min(0.75, saturation);

  return `hsl(${Math.round(hue)} ${Math.round(spineSaturation * 100)}% ${Math.round(spineLightness * 100)}%)`;
}

export function getSpineTextColor(color: string) {
  const lightness = color.startsWith("hsl")
    ? Number(color.match(/(\d+)%\)$/)?.[1] ?? 0) / 100
    : rgbToHsl(
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
      ).lightness;

  return lightness > 0.5 ? "#21160e" : "#f6ecdc";
}
