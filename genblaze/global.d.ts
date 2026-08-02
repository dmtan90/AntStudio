declare module 'crypto' {
  const crypto: any;
  export default crypto;
}

declare module 'buffer' {
  export class Buffer {
    [index: number]: number;
    static from(data: any, encoding?: string): Buffer;
    static alloc(size: number): Buffer;
    static concat(list: readonly any[]): Buffer;
    subarray(start?: number, end?: number): Buffer;
    toString(encoding?: string, start?: number, end?: number): string;
    writeUInt32BE(value: number, offset?: number): number;
    writeUInt16BE(value: number, offset?: number): number;
    readUInt32BE(offset?: number): number;
    readUInt16BE(offset?: number): number;
    length: number;
  }
}

declare module 'process' {
  const process: any;
  export default process;
}

declare module 'fs' {
  const fs: any;
  export default fs;
}

declare module 'path' {
  const path: any;
  export default path;
}

declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void | Promise<void>): void;
declare function expect(actual: any): {
  toBe(expected: any): void;
  toEqual(expected: any): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(item: any): void;
  not: any;
};

