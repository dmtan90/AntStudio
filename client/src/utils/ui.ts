import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class names using clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Creates an instance of a provided class/constructor.
 */
export function createInstance(constructor: any, ...args: any[]) {
    return new constructor(...args);
}

/**
 * Floor utility (proxy to Math.floor or similar for consistency).
 */
export function floor(value: number, precision: number = 0) {
    const factor = Math.pow(10, precision);
    return Math.floor(value * factor) / factor;
}
