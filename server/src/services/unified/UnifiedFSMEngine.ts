/**
 * UnifiedFSMEngine.ts
 * Single FSM State Machine Engine on Server.
 * Generates script & triggers AI agent actions during live streams.
 * Listens to ServerEventBus for start/stop directives.
 */

import { UnifiedWSEvent, WSEventMessage, StreamStartPayload } from './UnifiedWSEventTypes.js';
import { serverEventBus } from './ServerEventBus.js';

export interface FSMState {
  stepIndex: number;
  isRunning: boolean;
  activeProductId?: string;
  activeScript?: string;
  currentPhase: 'GREETING' | 'PITCHING' | 'SPOTLIGHT' | 'QNA' | 'CLOSING' | 'IDLE';
}

export class UnifiedFSMEngine {
  private static instance: UnifiedFSMEngine;
  private state: FSMState = {
    stepIndex: 0,
    isRunning: false,
    currentPhase: 'IDLE'
  };
  private scriptLoopTimer: NodeJS.Timeout | null = null;
  private currentStreamId: string | null = null;

  private constructor() {
    this.registerEventHandlers();
  }

  public static getInstance(): UnifiedFSMEngine {
    if (!UnifiedFSMEngine.instance) {
      UnifiedFSMEngine.instance = new UnifiedFSMEngine();
    }
    return UnifiedFSMEngine.instance;
  }

  private registerEventHandlers(): void {
    // Listen for livestream start / stop and FSM control events
    serverEventBus.subscribe<StreamStartPayload>(UnifiedWSEvent.LIVESTREAM_START, (msg: WSEventMessage<StreamStartPayload>) => {
      this.startFSM(msg.payload.streamId, msg.payload.productIds);
    });

    serverEventBus.subscribe(UnifiedWSEvent.LIVESTREAM_STOP, () => {
      this.stopFSM();
    });

    serverEventBus.subscribe(UnifiedWSEvent.FSM_START, (msg: WSEventMessage<any>) => {
      this.startFSM(msg.sessionId || 'fsm_stream', msg.payload?.productIds);
    });

    serverEventBus.subscribe(UnifiedWSEvent.FSM_STOP, () => {
      this.stopFSM();
    });
  }

  /**
   * Start FSM Script Generation Loop
   */
  public startFSM(streamId: string, productIds?: string[]): void {
    if (this.state.isRunning) {
      console.log(`[UnifiedFSMEngine] FSM is already running for stream: ${this.currentStreamId}`);
      return;
    }

    this.currentStreamId = streamId;
    this.state = {
      stepIndex: 0,
      isRunning: true,
      currentPhase: 'GREETING'
    };

    console.log(`🚀 [UnifiedFSMEngine] Started FSM Engine for stream: ${streamId}`);

    // Emit initial FSM state change
    this.broadcastStateChange('GREETING', 'Welcome to our live broadcast! We are showcasing awesome deals today.');

    // Start tick loop (e.g., script step every 15 seconds)
    this.runNextStep(productIds);
  }

  /**
   * Stop FSM Script Generation Loop Immediately
   */
  public stopFSM(): void {
    if (!this.state.isRunning) return;

    if (this.scriptLoopTimer) {
      clearTimeout(this.scriptLoopTimer);
      this.scriptLoopTimer = null;
    }

    this.state.isRunning = false;
    this.state.currentPhase = 'IDLE';

    console.log(`🛑 [UnifiedFSMEngine] Stopped FSM Engine for stream: ${this.currentStreamId}`);
    this.currentStreamId = null;

    this.broadcastStateChange('IDLE', 'Livestream script generation stopped.');
  }

  private runNextStep(productIds?: string[]): void {
    if (!this.state.isRunning) return;

    const phases: FSMState['currentPhase'][] = ['PITCHING', 'SPOTLIGHT', 'QNA', 'CLOSING'];
    const nextPhase = phases[this.state.stepIndex % phases.length];
    this.state.currentPhase = nextPhase;
    this.state.stepIndex++;

    const sampleProduct = productIds && productIds.length > 0 ? productIds[this.state.stepIndex % productIds.length] : undefined;
    this.state.activeProductId = sampleProduct;

    const scriptText = `[Step ${this.state.stepIndex}] Current phase: ${nextPhase}. Check out product ${sampleProduct || 'featured item'}!`;

    // Publish script trigger event
    serverEventBus.publish(UnifiedWSEvent.FSM_SCRIPT_TRIGGER, {
      phase: nextPhase,
      stepIndex: this.state.stepIndex,
      productId: sampleProduct,
      scriptText
    });

    // Schedule next script step after 15 seconds
    this.scriptLoopTimer = setTimeout(() => {
      this.runNextStep(productIds);
    }, 15000);
  }

  private broadcastStateChange(phase: FSMState['currentPhase'], text: string): void {
    serverEventBus.publish(UnifiedWSEvent.FSM_STATE_CHANGE, {
      phase,
      isRunning: this.state.isRunning,
      text
    });
  }

  public getState(): Readonly<FSMState> {
    return this.state;
  }
}

export const unifiedFSMEngine = UnifiedFSMEngine.getInstance();
