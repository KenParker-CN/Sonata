import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge Tailwind classes — later classes override earlier conflicting ones
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
