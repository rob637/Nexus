import { Scene, MeshBuilder, StandardMaterial, Color3, Mesh, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";
import { HapticManager } from "../../utils/HapticManager";
import { Vehicle } from "./Vehicle";

export class PhysicsModule {
    private scene: Scene;
    private rootMesh: Mesh;
    private vehicle: Vehicle | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
        this.rootMesh = new Mesh("PhysicsModuleRoot", scene);
    }

    public load() {
        console.log("Motus99: Loading Physics Module (The Workshop)");
        
        // Create the "Floor" (The Hangar)
        const ground = MeshBuilder.CreateGround("ground", {width: 100, height: 100}, this.scene);
        const groundMat = new StandardMaterial("groundMat", this.scene);
        groundMat.diffuseColor = Color3.FromHexString("#2a2a35"); // Lighter industrial floor
        groundMat.specularColor = new Color3(0.1, 0.1, 0.1); 
        ground.material = groundMat;
        
        // V2 Physics: Aggregate for Static Ground
        new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, restitution: 0.5, friction: 0.8 }, this.scene);

        // Initialize the Vehicle
        this.vehicle = new Vehicle(this.scene);
        this.vehicle.build();

        // Create Obstacles (The "Fun" Part)
        this.createObstacles();

        // Simulate a "Snap" when loaded (Juice)
        HapticManager.triggerSnap();
    }

    private createObstacles() {
        // 1. A Ramp
        const ramp = MeshBuilder.CreateBox("ramp", { width: 10, height: 1, depth: 10 }, this.scene);
        ramp.position.set(0, 1, 20);
        ramp.rotation.x = -Math.PI / 8; // 22.5 degrees
        const rampMat = new StandardMaterial("rampMat", this.scene);
        rampMat.diffuseColor = Color3.Yellow();
        ramp.material = rampMat;
        new PhysicsAggregate(ramp, PhysicsShapeType.BOX, { mass: 0, friction: 1.0 }, this.scene);

        // 2. Some crashable boxes
        for (let i = 0; i < 5; i++) {
            const box = MeshBuilder.CreateBox(`crashBox_${i}`, { size: 2 }, this.scene);
            box.position.set(Math.random() * 10 - 5, 5 + i * 2, 40);
            const boxMat = new StandardMaterial(`boxMat_${i}`, this.scene);
            boxMat.diffuseColor = Color3.Red();
            box.material = boxMat;
            new PhysicsAggregate(box, PhysicsShapeType.BOX, { mass: 10, restitution: 0.5 }, this.scene);
        }
    }


    public unload() {
        this.rootMesh.dispose();
        // Clean up meshes
    }
}
