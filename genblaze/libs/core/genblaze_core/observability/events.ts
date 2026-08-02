export type StreamEventType =
    | 'pipeline.started'
    | 'pipeline.completed'
    | 'pipeline.failed'
    | 'step.queued'
    | 'step.started'
    | 'step.progress'
    | 'step.retried'
    | 'step.completed'
    | 'step.failed'
    | 'agent.iteration.started'
    | 'agent.iteration.evaluated'
    | 'agent.completed';

export interface BaseStreamEvent {
    type: StreamEventType;
    timestamp?: string;
}

export interface PipelineStartedEvent extends BaseStreamEvent {
    type: 'pipeline.started';
    runId: string;
    totalSteps: number;
    message?: string;
}

export interface PipelineCompletedEvent extends BaseStreamEvent {
    type: 'pipeline.completed';
    runId: string;
    runStatus?: string;
    manifestHash?: string;
}

export interface StepStartedEvent extends BaseStreamEvent {
    type: 'step.started';
    runId: string;
    stepId: string;
    stepIndex: number;
    totalSteps: number;
    provider: string;
    model: string;
}

export interface StepCompletedEvent extends BaseStreamEvent {
    type: 'step.completed';
    runId?: string;
    stepId: string;
    stepIndex: number;
    totalSteps: number;
    provider: string;
    model: string;
    elapsedSec: number;
}
