import { MotusEngine } from "./engine/MotusEngine";
import { Dashboard, ScienceSector } from "./core/Dashboard";

async function initApp() {
    try {
        const engine = new MotusEngine("renderCanvas");
        await engine.init();

        const dashboard = new Dashboard(engine.getScene());

        // For development/demo purposes, we'll add a simple UI overlay to simulate selecting the Physics module
        const uiLayer = document.getElementById("ui-layer");
        if (uiLayer) {
            const startBtn = document.createElement("button");
            startBtn.innerText = "ENTER PHYSICS NEXUS";
            startBtn.style.position = "absolute";
            startBtn.style.bottom = "50px";
            startBtn.style.left = "50%";
            startBtn.style.transform = "translateX(-50%)";
            startBtn.style.padding = "15px 30px";
            startBtn.style.background = "var(--brand-primary)";
            startBtn.style.border = "none";
            startBtn.style.color = "black";
            startBtn.style.fontFamily = "var(--font-mono)";
            startBtn.style.fontWeight = "bold";
            startBtn.style.cursor = "pointer";
            startBtn.style.fontSize = "16px";
            
            startBtn.onclick = () => {
                dashboard.loadModule(ScienceSector.PHYSICS);
                startBtn.style.display = "none";
            };

            uiLayer.appendChild(startBtn);
        }

    } catch (error) {
        console.error("Motus99 Initialization Failed:", error);
    }
}

initApp();
