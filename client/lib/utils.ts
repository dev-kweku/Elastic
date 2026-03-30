import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function formatPrice(price:number,currency="USD"):string{
  return new Intl.NumberFormat('en-US',{style:'currency',currency})
  .format(price)
}

export function formatNumber(n:number):string{
  return new Intl.NumberFormat('en-US').format(n)
}

export function renderStars(rating: number): string {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty)
}
  
  // export function clsx(...classes: (string | boolean | undefined | null)[]): string {
  //   return classes.filter(Boolean).join(' ')
  // }
  
  export function discount(original: number, current: number): number {
    return Math.round(((original - current) / original) * 100)
  }
  
  export function truncate(str: string, n: number): string {
    return str.length > n ? str.slice(0, n) + '…' : str
  }
  
