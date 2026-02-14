export interface DirectorDecisions {
    cameraPath: string | null;
    lightingPreset: string;
    particleType: 'sakura' | 'snow' | 'glitter' | null;
    isCut: boolean; // True if a significant change just occurred
}

export class VRMDirector {
    private lastCutTime = 0;
    private cutCooldown = 3000; // MS between major camera cuts
    private energyLevel = 0; // 0 to 1 (smoothed volume)
    private mood = 'neutral'; // neutral, high, calm
    
    private currentDecisions: DirectorDecisions = {
        cameraPath: null,
        lightingPreset: 'studio',
        particleType: null,
        isCut: false
    };

    update(vol: number, pitch: number, deltaTime: number): DirectorDecisions {
        const now = Date.now();
        this.currentDecisions.isCut = false;

        // 1. Smooth Energy Level
        this.energyLevel = this.energyLevel * 0.95 + vol * 0.05;

        // 2. Identify Mood
        if (this.energyLevel > 0.4) this.mood = 'high';
        else if (this.energyLevel < 0.05) this.mood = 'calm';
        else this.mood = 'neutral';

        // 3. Autonomous Decisions (The "Director" logic)
        
        // CAMERA CUTS
        if (now - this.lastCutTime > this.cutCooldown) {
            // Chance to cut on high energy or sudden spikes
            const cutChance = this.mood === 'high' ? 0.02 : 0.005;
            
            if (Math.random() < cutChance || (vol > 0.6 && Math.random() < 0.1)) {
                this.executeCameraCut();
                this.lastCutTime = now;
                this.currentDecisions.isCut = true;
            }
        }

        // LIGHTING & ATMOSPHERE (Update based on Mood)
        this.updateStageMood();

        return this.currentDecisions;
    }

    private executeCameraCut() {
        const paths = ['orbit', 'slow_zoom', 'side_sweep', 'dramatic_low'];
        // Pick a random path, different from current if possible
        let nextPath = paths[Math.floor(Math.random() * paths.length)];
        if (nextPath === this.currentDecisions.cameraPath) {
            nextPath = paths[(paths.indexOf(nextPath) + 1) % paths.length];
        }
        this.currentDecisions.cameraPath = nextPath;
    }

    private updateStageMood() {
        if (this.mood === 'high') {
            this.currentDecisions.lightingPreset = 'neon';
            this.currentDecisions.particleType = 'glitter';
        } else if (this.mood === 'calm') {
            this.currentDecisions.lightingPreset = 'dramatic';
            this.currentDecisions.particleType = 'snow';
        } else {
            this.currentDecisions.lightingPreset = 'studio';
            this.currentDecisions.particleType = null;
        }
    }

    reset() {
        this.lastCutTime = 0;
        this.energyLevel = 0;
        this.currentDecisions = {
            cameraPath: null,
            lightingPreset: 'studio',
            particleType: null,
            isCut: false
        };
    }
}
