/** Runnable ABC — composable unit of work. 1:1 port of runnable/base.py */

import { RunnableConfig } from './config.js';

export abstract class Runnable<In = any, Out = any> {
    /** Run the runnable synchronously. */
    abstract invoke(input: In, config?: RunnableConfig | null): Out;

    /** Run the runnable asynchronously. Default wraps invoke(). */
    async ainvoke(input: In, config?: RunnableConfig | null): Promise<Out> {
        return this.invoke(input, config);
    }
}
