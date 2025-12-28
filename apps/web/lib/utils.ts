import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ImageSize = 200 | 400 | 600 | 800 | 1000;

// URL for missing/placeholder images from TCGPlayer CDN
// const MISSING_IMAGE_URL = 'https://tcgplayer-cdn.tcgplayer.com/product/image-missing.svg';
const LOCAL_PLACEHOLDER = '/card-placeholder.svg';

/**
 * Parse image_urls field and extract URL for specific size
 * Format: "defaultUrl|url 200w,url 400w,url 600w,url 800w,url 1000w"
 */
export function getImageUrl(imageField: string | null, size: ImageSize = 400): string | null {
  if (!imageField) {
    return null;
  }

  const [defaultUrl, srcset] = imageField.split("|");
  
  if (!srcset) {
    const url = defaultUrl?.trim() ?? null;
    // Check if the URL is the missing image placeholder
    if (url && url.includes('image-missing.svg')) {
      return LOCAL_PLACEHOLDER;
    }
    return url;
  }

  // Parse srcset to find the requested size
  const srcsetParts = srcset.split(",").map(s => s.trim());
  for (const part of srcsetParts) {
    const match = part.match(/^(.+)\s+(\d+)w$/);
    if (match && parseInt(match[2], 10) === size) {
      const url = match[1].trim();
      // Check if the URL is the missing image placeholder
      if (url.includes('image-missing.svg')) {
        return LOCAL_PLACEHOLDER;
      }
      return url;
    }
  }

  // Fallback to default URL if size not found
  const url = defaultUrl?.trim() ?? null;
  // Check if the URL is the missing image placeholder
  if (url && url.includes('image-missing.svg')) {
    return LOCAL_PLACEHOLDER;
  }
  return url;
}

/**
 * Get primary image URL (highest resolution for detail views)
 */
export function getPrimaryImageUrl(imageField: string | null): string | null {
  return getImageUrl(imageField, 1000);
}

/**
 * Get thumbnail image URL (high resolution for grid views)
 */
export function getThumbnailImageUrl(imageField: string | null): string | null {
  return getImageUrl(imageField, 600);
}

const currencyLocaleMap: Record<string, string> = {
  CNY: "zh-CN",
  USD: "en-US",
  JPY: "ja-JP",
  EUR: "de-DE",
};

type CurrencyFormatOptions = Pick<Intl.NumberFormatOptions, "minimumFractionDigits" | "maximumFractionDigits">;

export function formatCurrency(
  value: number | null | undefined,
  currency: keyof typeof currencyLocaleMap | string = "CNY",
  options?: CurrencyFormatOptions
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  const normalizedCurrency = typeof currency === "string" ? currency.toUpperCase() : currency;
  const resolvedCurrency =
    normalizedCurrency in currencyLocaleMap ? (normalizedCurrency as keyof typeof currencyLocaleMap) : "CNY";
  const locale = currencyLocaleMap[resolvedCurrency];

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: resolvedCurrency,
    minimumFractionDigits: value < 1 ? 2 : 0,
    maximumFractionDigits: value < 1 ? 2 : 0,
    ...options,
  });

  return formatter.format(value);
}
