/**
 * Central export for all AntStudio Agent tools
 * Creates ADK FunctionTool objects from raw functions
 */

import { FunctionTool } from '@google/adk';
import { setAuthToken } from './product.tools.js';
import { setProjectAuthToken } from './project.tools.js';
import { setInfluencerAuthToken } from './influencer.tools.js';
import { setPlatformAuthToken } from './platform.tools.js';
import { setLiveAuthToken } from './live.tools.js';
import * as uiFns from './ui.tools.js';

export { navigateTo } from './ui.tools.js';

export {
    // Product tools
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    extractProductFromUrl,
    getCommerceReport,
    getCommerceStats,
} from './product.tools.js';

export {
    // Project tools
    listProjects,
    getProject,
    createProject,
    deleteProject,
    generateScript,
    analyzeProjectScript,
    generateStoryboard,
    convertToLiveScript,
    createVideoPreview,
    chatAboutProject,
} from './project.tools.js';

export {
    // Influencer tools
    listInfluencers,
    getInfluencer,
    updateInfluencer,
    deleteInfluencer,
    listVoices,
    getInfluencerAnalytics,
    generateProductVideo,
    getSalesPlaylist,
} from './influencer.tools.js';

export {
    // Platform tools
    listPlatforms,
    getPlatformAuthUrl,
    disconnectPlatform,
    getPlatformStats,
    listPlatformVideos,
    getLiveStreamInfo,
} from './platform.tools.js';

export {
    // Live & orchestration tools
    listLiveSessions,
    getLiveSession,
    showProductInLive,
    switchLiveScene,
    sendMessageToStream,
    playAudioInStream,
    highlightComment,
    syncProjectInventory,
    getAgentInventory,
    triggerFlashSale,
} from './live.tools.js';

/**
 * Set auth token for all tool groups simultaneously
 */
export function setAllAuthTokens(token: string) {
    setAuthToken(token);
    setProjectAuthToken(token);
    setInfluencerAuthToken(token);
    setPlatformAuthToken(token);
    setLiveAuthToken(token);
}

export { getLastActiveProduct, clearLastActiveProduct } from './product.tools.js';
export { getLastActiveProject, clearLastActiveProject } from './project.tools.js';
export { getLastActiveInfluencer, clearLastActiveInfluencer } from './influencer.tools.js';
export { getLastActiveLiveSession, clearLastActiveLiveSession } from './live.tools.js';

import * as productFns from './product.tools.js';
import * as projectFns from './project.tools.js';
import * as influencerFns from './influencer.tools.js';
import * as platformFns from './platform.tools.js';
import * as liveFns from './live.tools.js';

// Filter only actual tool functions (exclude setters and apiCall)
const excludedFns = new Set([
    'setAuthToken', 'apiCall', 
    'setProjectAuthToken', 'setInfluencerAuthToken', 
    'setPlatformAuthToken', 'setLiveAuthToken',
    'getLastActiveProduct', 'clearLastActiveProduct',
    'getLastActiveProject', 'clearLastActiveProject',
    'getLastActiveInfluencer', 'clearLastActiveInfluencer',
    'getLastActiveLiveSession', 'clearLastActiveLiveSession'
]);

function toFunctionTools(module: Record<string, any>): FunctionTool[] {
    return Object.entries(module)
        .filter(([name, fn]) => 
            typeof fn === 'function' && 
            !excludedFns.has(name) &&
            // Filter out internal setters or helpers that don't have proper metadata
            fn.length >= 0
        )
        .map(([name, fn]) => {
            try {
                // Determine a readable description from the function name
                const description = name.replace(/([A-Z])/g, ' $1').toLowerCase();
                return new FunctionTool({
                    name: name,
                    description: `Tool to ${description}`,
                    execute: async (args: any) => await fn(args)
                });
            } catch (e) {
                console.error(`Failed to register tool: ${name}`, e);
                return null;
            }
        })
        .filter((tool): tool is FunctionTool => tool !== null);
}

/**
 * All tools as ADK FunctionTool instances
 */
export const allTools: FunctionTool[] = [
    ...toFunctionTools(productFns),
    ...toFunctionTools(projectFns),
    ...toFunctionTools(influencerFns),
    ...toFunctionTools(platformFns),
    ...toFunctionTools(liveFns),
    ...toFunctionTools(uiFns),
];
