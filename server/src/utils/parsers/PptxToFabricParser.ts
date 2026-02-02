/**
 * PptxToFabricParser
 * 
 * Converts PPTX internal structure (from pptx-parser) into Fabric.js 
 * compatible JSON for AntFlow's template engine.
 */

export class PptxToFabricParser {
    private width: number = 1920;
    private height: number = 1080;

    constructor(canvasWidth?: number, canvasHeight?: number) {
        this.width = canvasWidth || 1920;
        this.height = canvasHeight || 1080;
    }

    /**
     * Parse a single PPTX slide into Fabric.js objects
     */
    parseSlide(slide: any): any {
        const fabricObjects: any[] = [];

        if (!slide || !Array.isArray(slide.elements)) {
            return { version: '5.4.0', objects: [] };
        }

        // PPTX elements are usually ordered by Z-index
        slide.elements.forEach((el: any) => {
            const object = this.mapElementToFabric(el);
            if (object) {
                fabricObjects.push(object);
            }
        });

        return {
            version: '5.4.0',
            objects: fabricObjects
        };
    }

    private mapElementToFabric(el: any): any {
        const base = {
            originX: 'left',
            originY: 'top',
            left: el.x || 0,
            top: el.y || 0,
            width: el.w || 100,
            height: el.h || 100,
            angle: el.rotation || 0,
            opacity: el.opacity !== undefined ? el.opacity : 1,
            visible: true,
            id: el.id
        };

        const type = String(el.type).toLowerCase();

        switch (type) {
            case 'text':
            case 'textbox':
            case 'shape': // Sometimes text is inside a shape
                if (!el.text) return null;
                return {
                    ...base,
                    type: 'textbox',
                    text: el.text,
                    fontFamily: el.fontFamily || 'Lato',
                    fontSize: el.fontSize || 24,
                    fill: el.color || '#000000',
                    textAlign: el.align || 'left',
                    fontWeight: el.bold ? 'bold' : 'normal',
                    fontStyle: el.italic ? 'italic' : 'normal',
                    underline: el.underline || false
                };

            case 'image':
            case 'picture':
                return {
                    ...base,
                    type: 'image',
                    src: el.src || el.url || '',
                    crossOrigin: 'anonymous'
                };

            case 'rect':
            case 'rectangle':
                return {
                    ...base,
                    type: 'rect',
                    fill: el.fill || '#cccccc',
                    stroke: el.stroke || null,
                    strokeWidth: el.strokeWidth || 0
                };

            case 'oval':
            case 'circle':
                return {
                    ...base,
                    type: 'circle',
                    radius: (el.w || 100) / 2,
                    fill: el.fill || '#cccccc'
                };

            default:
                // If it's a generic shape with text, treat as textbox
                if (el.text) {
                    return {
                        ...base,
                        type: 'textbox',
                        text: el.text,
                        fill: el.color || '#000000'
                    };
                }
                return null;
        }
    }
}
