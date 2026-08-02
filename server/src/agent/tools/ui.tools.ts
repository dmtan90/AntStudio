/**
 * UI & Navigation Tools
 */

/**
 * Navigate to a specific path in the AntStudio application
 * @param path The relative path to navigate to (e.g., '/merchants', '/projects')
 */
export async function navigateTo({ path }: { path: string }) {
    console.log(`[UI Tool] Navigating to: ${path}`);
    return { 
        success: true, 
        action: 'navigate', 
        path,
        message: `Navigated to ${path}` 
    };
}
