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

        // Simulate a "Snap" when loaded (Juice)
        HapticManager.triggerSnap();
    }


    public unload() {
        this.rootMesh.dispose();
        // Clean up meshes
    }
}
