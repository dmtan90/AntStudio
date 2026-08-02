/**
 * `traced` decorator — OpenTelemetry instrumentation for storage backends.
 * 1:1 port of storage/_tracer.py
 *
 * Per-method decorator that opens a `genblaze.storage.{op}` span.
 * When opentelemetry isn't installed, returns the function unchanged (zero overhead).
 */

/** Extract span-worthy attributes from a backend method's args. */
function attrsFromArgs(args: any[], argNames: string[]): Record<string, any> {
    const attrs: Record<string, any> = {};
    const keyIdx = argNames.indexOf('key');
    const bucketIdx = argNames.indexOf('bucket');
    if (keyIdx >= 0 && typeof args[keyIdx] === 'string') {
        attrs['genblaze.storage.key'] = args[keyIdx];
    }
    if (bucketIdx >= 0 && typeof args[bucketIdx] === 'string') {
        attrs['genblaze.storage.bucket'] = args[bucketIdx];
    }
    return attrs;
}

/**
 * Traced decorator factory.
 * Usage:
 *   @traced('upload')
 *   async upload(key: string, body: Buffer) { ... }
 *
 * In the TS port we implement this as a lightweight timing+logging wrapper
 * since OpenTelemetry Node.js doesn't have the same decorator API as Python.
 * When @opentelemetry/api is installed, integrate it here.
 */
export function traced(opName: string) {
    return function <T extends (...args: any[]) => any>(
        _target: any,
        _propertyKey: string | symbol,
        descriptor: TypedPropertyDescriptor<T>
    ): TypedPropertyDescriptor<T> {
        const original = descriptor.value!;
        descriptor.value = async function (this: any, ...args: any[]) {
            const spanName = `genblaze.storage.${opName}`;
            const start = Date.now();
            try {
                const result = await original.apply(this, args);
                return result;
            } catch (err) {
                throw err;
            } finally {
                const durationMs = Date.now() - start;
                // When opentelemetry is integrated, emit span here.
                // For now just a debug log if tracing is enabled.
                if (process.env.GENBLAZE_STORAGE_TRACE === '1') {
                    console.debug(`[storage] ${spanName} ${durationMs}ms`);
                }
            }
        } as T;
        return descriptor;
    };
}
