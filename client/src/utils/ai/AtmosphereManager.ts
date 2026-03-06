import * as PIXI from 'pixi.js';

export type ParticleType = 'sakura' | 'snow' | 'glitter' | 'fireflies' | 'bubbles';

export class AtmosphereManager {
    private app: PIXI.Application;
    private container: PIXI.Container;
    private particles: PIXI.Sprite[] = [];
    private type: ParticleType | null = null;
    private density: number = 20;
    private isActive: boolean = false;

    constructor(app: PIXI.Application) {
        this.app = app;
        this.container = new PIXI.Container();
        this.container.eventMode = 'none';
        // Add at the top layer
        this.app.stage.addChild(this.container);
    }

    public setEffect(type: ParticleType | null, density: number = 20) {
        if (this.type === type && this.density === density) return;
        
        this.clear();
        this.type = type;
        this.density = density;
        
        if (type) {
            this.isActive = true;
            this.createParticles();
        } else {
            this.isActive = false;
        }
    }

    private clear() {
        this.container.removeChildren();
        this.particles = [];
        this.isActive = false;
    }

    private createParticles() {
        if (!this.type) return;

        for (let i = 0; i < this.density; i++) {
            const particle = this.createParticle(this.type);
            this.container.addChild(particle);
            this.particles.push(particle);
        }
    }

    private createParticle(type: ParticleType): PIXI.Sprite {
        const graphics = new PIXI.Graphics();
        
        switch (type) {
            case 'sakura':
                graphics.beginFill(0xffb7c5);
                graphics.drawEllipse(0, 0, 4, 6);
                graphics.endFill();
                break;
            case 'snow':
                graphics.beginFill(0xffffff);
                graphics.drawCircle(0, 0, 2);
                graphics.endFill();
                break;
            case 'glitter':
                graphics.beginFill(0xfff5b1);
                // Draw a simple diamond shape since drawStar is not available
                graphics.drawPolygon([-1.5, 0, 0, -3, 1.5, 0, 0, 3]);
                graphics.endFill();
                break;
            case 'fireflies':
                graphics.beginFill(0xe1ff00);
                graphics.drawCircle(0, 0, 1.5);
                graphics.endFill();
                break;
            case 'bubbles':
                graphics.lineStyle(1, 0xffffff, 0.5);
                graphics.drawCircle(0, 0, 5);
                break;
        }

        const tex = this.app.renderer.generateTexture(graphics);
        const sprite = new PIXI.Sprite(tex);
        
        sprite.anchor.set(0.5);
        this.resetParticle(sprite);
        
        // Random start position
        sprite.x = Math.random() * this.app.screen.width;
        sprite.y = Math.random() * this.app.screen.height;
        
        return sprite;
    }

    private resetParticle(p: any) {
        p.x = Math.random() * this.app.screen.width;
        p.y = -20;
        p.scale.set(0.5 + Math.random() * 0.5);
        p.alpha = 0.4 + Math.random() * 0.6;
        
        // Particle specific behavior
        p.vx = (Math.random() - 0.5) * 2;
        p.vy = 1 + Math.random() * 2;
        p.vr = (Math.random() - 0.5) * 0.1;
        
        if (this.type === 'fireflies') {
            p.y = Math.random() * this.app.screen.height;
            p.vy = (Math.random() - 0.5) * 0.5;
        }
    }

    public update(delta: number, intensity: number = 1.0) {
        if (!this.isActive) return;

        this.particles.forEach(p => {
            const pp = p as any;
            p.x += pp.vx * delta * intensity;
            p.y += pp.vy * delta * intensity;
            p.rotation += pp.vr * delta;
            
            // Sway for sakura
            if (this.type === 'sakura') {
                p.x += Math.sin(Date.now() * 0.002 + p.y * 0.01) * 0.5;
            }

            // Life cycle
            if (p.y > this.app.screen.height + 20 || p.x < -20 || p.x > this.app.screen.width + 20) {
                this.resetParticle(p);
            }
            
            // Fireflies pulse
            if (this.type === 'fireflies') {
                p.alpha = 0.3 + Math.abs(Math.sin(Date.now() * 0.001 + p.x)) * 0.7;
            }
        });
    }

    public destroy() {
        this.clear();
        this.app.stage.removeChild(this.container);
        this.container.destroy({ children: true });
    }
}
