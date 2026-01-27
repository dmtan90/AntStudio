import { aiPerformanceService, PerformanceSnapshot } from './AIPerformanceService.js';

import { systemLogger } from '../../utils/systemLogger.js';

/**
 * Engine for autonomous A/B testing of stream styles and personas.
 */
export class StyleABTestingEngine {
    private activeExperimentsByProject: Map<string, {
        currentStyle: string;
        candidateStyles: string[];
        experimentStartTime: Date;
        retentionThreshold: number;
    }> = new Map();

    /**
     * Starts an optimization cycle for a stream.
     */
    public startOptimization(projectId: string, initialStyle: string, candidates: string[]) {
        this.activeExperimentsByProject.set(projectId, {
            currentStyle: initialStyle,
            candidateStyles: candidates,
            experimentStartTime: new Date(),
            retentionThreshold: 0.7 // Require at least 70% of peak retention
        });

        systemLogger.info(`🧪 [A/B Testing] Optimization cycle started for ${projectId}`, 'StyleABTestingEngine');
    }

    /**
     * Periodically called to evaluate current performance and switch if needed.
     */
    public async evaluate(projectId: string, currentSnapshot: PerformanceSnapshot) {
        const experiment = this.activeExperimentsByProject.get(projectId);
        if (!experiment) return;

        // Simple evaluation: If chat velocity drops significantly, try a candidate style
        if (currentSnapshot.chatVelocity < 2) {
            const nextStyle = experiment.candidateStyles[Math.floor(Math.random() * experiment.candidateStyles.length)];

            if (nextStyle !== experiment.currentStyle) {
                systemLogger.info(`⚖️ [A/B Testing] Performance dip detected (Chat: ${currentSnapshot.chatVelocity}). Switching style: ${experiment.currentStyle} -> ${nextStyle}`, 'StyleABTestingEngine');

                // Trigger AI Director to switch
                // await studioDirector.applyConfiguration(projectId, { style: nextStyle });

                experiment.currentStyle = nextStyle;
            }
        }
    }

    public stopOptimization(projectId: string) {
        this.activeExperimentsByProject.delete(projectId);
    }
}

export const styleABTestingEngine = new StyleABTestingEngine();
