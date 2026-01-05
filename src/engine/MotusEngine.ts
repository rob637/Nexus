import { Engine, Scene, Vector3, Color3, Color4, HemisphericLight, ArcRotateCamera, WebGPUEngine } from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";

export class MotusEngine {
    private canvas: HTMLCanvasElement;
    private engine: Engine | WebGPUEngine;
    private scene: Scene;
    private havokInstance: any;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!this.canvas) {
            throw new Error("Canvas not found");
        }
        // Engine will be initialized in init()
        this.engine = null as any; 
        this.scene = null as any;
    }

    public async init() {
        // Try to initialize WebGPU, fallback to WebGL
        const webGPUSupported = await WebGPUEngine.IsSupportedAsync;
        if (webGPUSupported) {
            const webGPUEngine = new WebGPUEngine(this.canvas);
            await webGPUEngine.initAsync();
            this.engine = webGPUEngine;
            console.log("Motus99: WebGPU Engine Initialized");
        } else {
            this.engine = new Engine(this.canvas, true);
            console.log("Motus99: WebGL Engine Initialized");
        }

        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0.04, 0.04, 0.05, 1); // Deep Obsidian #0a0a0c

        // Initialize Havok Physics
        try {
            this.havokInstance = await HavokPhysics();
            const havokPlugin = new HavokPlugin(true, this.havokInstance);
            this.scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);
            console.log("Motus99: Havok Physics Initialized");
        } catch (e) {
            console.error("Motus99: Failed to initialize Havok Physics", e);
        }

        // Basic Lighting
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;

        // Basic Camera (Cinematic feel)
        const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 10, Vector3.Zero(), this.scene);
        camera.attachControl(this.canvas, true);
        camera.wheelPrecision = 50;

        // Matrix View Toggle (M key)
        this.setupMatrixView();

        // Render Loop
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        // Resize
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    private setupMatrixView() {
        let matrixMode = false;
        this.scene.onKeyboardObservable.add((kbInfo) => {
            if (kbInfo.type === 1 && kbInfo.event.key === "m") { // 1 is KEYDOWN
                matrixMode = !matrixMode;
                console.log(`Motus99: Matrix View ${matrixMode ? "Enabled" : "Disabled"}`);
                
                this.scene.meshes.forEach(m => {
                    m.renderOutline = matrixMode;
                    m.outlineColor = Color3.FromHexString("#00f2ff"); // Electric Cyan
                    m.outlineWidth = 0.02;
                    
                    // In a real implementation, we would swap materials here 
                    // to show stress heat-maps and wireframes
                });
            }
        });
    }

    public getScene(): Scene {
        return this.scene;
    }
}
