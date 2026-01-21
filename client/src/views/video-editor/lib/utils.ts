import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { cva, type VariantProps } from "class-variance-authority";

export function cn(...inputs: ClassValue[]) {
  const cls = clsx(inputs);
  // console.log("twMerge", inputs, cls);
  return twMerge(cls);
}

export function createInstance<T>(_class: new (...args: any[]) => T, ...args: any[]): T {
  return new _class(...args);
}

export function createMap<K, V>(iterable?: Iterable<readonly [K, V]> | null | undefined) {
  return new Map<K, V>(iterable);
}

export function createPromise<T>(callback: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
  return new Promise<T>(callback);
}

export function createUint8Array(buffer: ArrayBufferLike) {
  return new Uint8Array(buffer);
}

export function waitUntilEvent<K extends HTMLElement>(element: K, success: keyof HTMLElementEventMap, failure?: keyof HTMLElementEventMap) {
  return createPromise((resolve, reject) => {
    element.addEventListener(success, resolve, { once: true });
    if (failure) element.addEventListener(failure, reject, { once: true });
  });
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isVideoElement(element: HTMLElement): element is HTMLVideoElement {
  return element.tagName === "VIDEO";
}

export function isImageLoaded(element: HTMLImageElement) {
  return element.complete && !!element.naturalWidth;
}

export function createFileDownload(file: File | Blob, name: string) {
  const anchor = document.createElement("a");
  const href = URL.createObjectURL(file);
  anchor.download = name;
  anchor.href = href;
  anchor.click();
  URL.revokeObjectURL(href);
}

export function createFileDownloads(files: File[] | Blob[], name: string) {
  const options = { type: files[0].type, lastModified: new Date().getTime() };
  const file = new File(files, name, options);
  const anchor = document.createElement("a");
  const href = URL.createObjectURL(file);
  anchor.download = name;
  anchor.href = href;
  anchor.click();
  URL.revokeObjectURL(href);
}

export function createBase64Download(data: any, type: string, name: string) {
  const href = `data:${type};charset=utf-8,${encodeURIComponent(JSON.stringify(data))}`;
  const anchor = document.createElement("a");
  anchor.download = name;
  anchor.href = href;
  anchor.click();
}

export function createFormData(data: Record<string, any>, names?: Record<string, any>) {
  const formData = createInstance(FormData);
  for (const key in data) {
    const name = names?.[key];
    if (name) formData.append(key, data[key], name);
    else formData.append(key, data[key]);
  }
  return formData;
}

export const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-8 px-2",
        lg: "h-10 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
