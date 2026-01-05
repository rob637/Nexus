import { Scene, MeshBuilder, StandardMaterial, Color3, Animation, Mesh } from "@babylonjs/core";
import { PhysicsModule } from "../modules/physics/PhysicsModule";

export enum ScienceSector {
    PHYSICS = "physics",
    CHEMISTRY = "chemistry",
    ASTRONOMY = "astronomy"
}

export class Dashboard {
    private scene: Scene;
    private holoSphere: Mesh;
    private currentModule: any = null;

    constructor(scene: Scene) {
        this.scene = scene;
        this.holoSphere = MeshBuilder.CreateSphere("holoSphere", { diameter: 3 }, scene);
        this.setupHoloSphere();
    }

    private setupHoloSphere() {
        const mat = new StandardMaterial("holoMat", this.scene);
        mat.emissiveColor = Color3.FromHexString("#00f2ff"); // Brand Primary
        mat.alpha = 0.3;
        mat.wireframe = true;
        this.holoSphere.material = mat;
        this.holoSphere.position.y = 2;

        // Idle rotation
        this.scene.registerBeforeRender(() => {
            this.holoSphere.rotation.y += 0.002;
        });
    }

    public async loadModule(sector: ScienceSector) {
        console.log(`Motus99: Loading Sector ${sector}`);
        
        // Zoom Animation (The "Juice")
        await this.playZoomAnimation();

        // Hide Dashboard
        this.holoSphere.setEnabled(false);

        // Load Module
        if (sector === ScienceSector.PHYSICS) {
            this.currentModule = new PhysicsModule(this.scene);
            this.currentModule.load();
        }
        // Add other modules here
    }

    private playZoomAnimation(): Promise<void> {
        return new Promise((resolve) => {
            // Simple camera zoom simulation
            const camera = this.scene.activeCamera as any;
            if (camera) {
                const anim = new Animation("zoom", "radius", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
                const keys = [];
                keys.push({ frame: 0, value: camera.radius });
                keys.push({ frame: 60, value: 2 }); // Zoom way in
                anim.setKeys(keys);
                this.scene.beginDirectAnimation(camera, [anim], 0, 60, false, 1, () => {
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}
