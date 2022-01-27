import {Car} from "../entities/Car";
import {Renderer} from "./Renderer";
import {Skybox} from "../entities/Skybox";
import {Buildings} from "../entities/Buildings";
import {Scenery} from "../entities/Scenery";
import {CrossState, TrafficManager} from "../managers/TrafficManager";
import {stat} from "fs";
import {Scene} from "three";

/**
 * Root for all scene logic
 */
export class SceneManager {

    /**
     * Current crossroads state
     * @private
     */
    private static crossRoadConfig = [
        [CrossState.Vertical, 15.0],
        [CrossState.AllStop, 2.0],
        [CrossState.Horiziontal, 15.0],
        [CrossState.AllStop, 2.0],
    ]

    private static crossRoadCounter = 0;

    private static crossRoadCounterMax = 0;

    /**
     * Resource precaching
     */
    public static async loadResources() {
        await Promise.all([
            Skybox.loadResources(),
            Car.loadResources(),
            Buildings.loadResources(),
            Scenery.loadResources(),
        ])
    }

    /**
     * Initializing scene
     */
    public static init() {
        TrafficManager.init();
        TrafficManager.setCrossState(CrossState.Horiziontal);
        for (let i = 0; i < 128; i++) {
            TrafficManager.simulate(5);
        }
        for (let conf of this.crossRoadConfig) {
            this.crossRoadCounterMax += conf[1];
        }
    }

    /**
     * Updating scene
     * @param tween
     */
    public static update(tween: number) {

        // Handling camera movement
        Renderer.getCamera().position.set(-2.1, 1.7, 6);
        Renderer.getCamera().lookAt(1.2, 1, -8);

        // Simulating car traffic
        this.crossRoadCounter = (this.crossRoadCounter + 0.01 * tween) % this.crossRoadCounterMax;
        let val = 0;
        for (let idx = 0; idx < this.crossRoadConfig.length; idx++) {
            const [state, len] = this.crossRoadConfig[idx];
            if (len + val > this.crossRoadCounter) {
                TrafficManager.setCrossState(state);
                switch (idx) {

                    // Vertical lane
                    case 0:
                        let timer = len - this.crossRoadCounter;
                        if (timer < 2.45) {
                            Scenery.setLightStatus((timer % 0.7) > 0.35 ? 0 : 1);
                        } else {
                            Scenery.setLightStatus(1);
                        }
                        break;

                    case 1:
                        Scenery.setLightStatus(2);
                        break;

                    // Horizontal lane
                    case 2:
                        Scenery.setLightStatus(3);
                        break;

                    case 3:
                        Scenery.setLightStatus(4);
                        break;

                }
                break;
            }
            val += len;
        }
        TrafficManager.simulate(tween);

        // Updating all necessary stuff
        Skybox.update();
    }

    /**
     * Prepare uniforms for shadow pass
     */
    public static shadowPass(prescaler: number) {
        Buildings.shadowPass(prescaler);
        Scenery.shadowPass(prescaler);
        Skybox.shadowPass();
        TrafficManager.shadowPass(prescaler);
    }

    /**
     * Prepare uniforms for default rendering
     */
    public static defaultPass() {
        Buildings.defaultPass();
        Scenery.defaultPass();
        Skybox.defaultPass();
        TrafficManager.defaultPass();
    }

}
