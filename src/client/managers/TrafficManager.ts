import {
    Vector2,
    Vector3
} from "three";
import {Renderer} from "../modules/Renderer";
import {Car} from "../entities/Car";

type CarWaypoint = {
    position: Vector2,      // Coordinates
    next: string[],         // Connected waypoints
    open: boolean,          // Flag that waypoint is passable

    isSpawner: boolean,     // Flag that this is waypoint
    nextDistance: number[]  // Cached distance to next waypoint
    speedFactor: number
}

type CarWaypointCollection = {
    [key: string]: CarWaypoint
}

type CarDriver = {
    car: Car,
    path: string[],
    pathLength: number,

    speed: number,
    maxSpeed: number,
    acceleration: number,

    position: number,
    size: number,

    spawner: CarSpawner,
    positionShift: Vector3,
}

type CarSpawner = {
    waypoint: string,
    checkPath: string[],
    timer: number,
    activeCars: CarDriver[],
}

export enum CrossState {
    AllStop,
    Horiziontal,
    Vertical
}

export class TrafficManager {

    /**
     * All waypoints
     * @private
     */
    private static waypoints: CarWaypointCollection = {

        // South (from near)
        south_spawn: {
            position: new Vector2(0.4, 8),
            next: [
                'south_cross'
            ],
            open: true,
            isSpawner: true,
            speedFactor: 1,
            nextDistance: []
        },
        south_cross: {
            position: new Vector2(0.4, 2),
            next: [
                'south_bend_1',
                'east_cross_end'
            ],
            open: false,
            isSpawner: false,
            speedFactor: 1,
            nextDistance: []
        },
        ...this.waypointArc(
            'south_bend', 'south_cross_end',
            -Math.PI * 0.5, 0,
            new Vector2(1.7, 1.7), new Vector2(1.3, 1.3)
        ),
        south_cross_end: {
            position: new Vector2(1.7, 0.4),
            next: [
                'south_end',
            ],
            open: true,
            isSpawner: false,
            speedFactor: 1,
            nextDistance: []
        },
        south_end: {
            position: new Vector2(10, 0.4),
            next: [],
            open: true,
            isSpawner: false,
            speedFactor: 1,
            nextDistance: []
        },

        // North (from far)
        north_spawn: {
            position: new Vector2(10, -21.4),
            next: [
                'north_start_bend_1'
            ],
            open: true,
            isSpawner: true,
            speedFactor: 1,
            nextDistance: []
        },
        ...this.waypointArc(
            'north_start_bend', 'north_cross',
            0, -Math.PI * 0.5,
            new Vector2(0.5, -20.4),
            new Vector2(1, 1),
        ),
        north_cross: {
            position: new Vector2(-0.4, -2),
            next: [
                'north_bend_1',
                'west_cross_end'
            ],
            open: false,
            isSpawner: false,
            speedFactor: 1,
            nextDistance: []
        },
        ...this.waypointArc(
            'north_bend', 'north_cross_end',
            Math.PI * 0.5, Math.PI,
            new Vector2(-1.7, -1.7), new Vector2(1.3, 1.3)
        ),
        north_cross_end: {
            position: new Vector2(-1.7, -0.4),
            next: [
                'north_end',
            ],
            open: true,
            isSpawner: false,
            speedFactor: 1,
            nextDistance: []
        },
        north_end: {
            position: new Vector2(-12, -0.4),
            next: [],
            open: true,
            isSpawner: false,
            speedFactor: 1,
            nextDistance: []
        },

        // East (from right)
        east_spawn: {
            position: new Vector2(12, -0.4),
            next: [
                'east_cross'
            ],
            open: true,
            isSpawner: true,
            speedFactor: 1,
            nextDistance: []
        },
        east_cross: {
            position: new Vector2(2, -0.4),
            next: [
                'east_bend_1',
                'north_cross_end'
            ],
            open: true,
            isSpawner: false,
            speedFactor: 1,
            nextDistance: []
        },
        ...this.waypointArc(
            'east_bend', 'east_cross_end',
            Math.PI, Math.PI * 1.5,
            new Vector2(1.7, -1.7), new Vector2(1.3, 1.3)
        ),
        east_cross_end: {
            position: new Vector2(0.4, -2),
            next: [
                'east_end_bend_1',
            ],
            open: true,
            isSpawner: false,
            speedFactor: 1,
            nextDistance: []
        },
        ...this.waypointArc(
            'east_end_bend', 'east_end',
            -Math.PI * 0.5, 0,
            new Vector2(1.7, -19.2), new Vector2(1.3, 1.3)
        ),
        east_end: {
            position: new Vector2(4, -20.5),
            next: [],
            open: true,
            isSpawner: false,
            speedFactor: 1,
            nextDistance: []
        },

        // West (from left)
        west_spawn: {
            position: new Vector2(-12, 0.4),
            next: [
                'west_cross'
            ],
            open: true,
            isSpawner: true,
            speedFactor: 1,
            nextDistance: []
        },
        west_cross: {
            position: new Vector2(-2, 0.4),
            next: [
                'west_bend_1',
                'south_cross_end'
            ],
            open: true,
            isSpawner: false,
            speedFactor: 1,
            nextDistance: []
        },
        ...this.waypointArc(
            'west_bend', 'west_cross_end',
            0, Math.PI * 0.5,
            new Vector2(-1.7, 1.7), new Vector2(1.3, 1.3)
        ),
        west_cross_end: {
            position: new Vector2(-0.4, 2),
            next: [
                'west_end',
            ],
            open: true,
            isSpawner: false,
            speedFactor: 1,
            nextDistance: []
        },
        west_end: {
            position: new Vector2(-0.4, 8),
            next: [],
            open: true,
            isSpawner: false,
            speedFactor: 1,
            nextDistance: []
        },

    };

    /**
     * Currently active drivers
     * @private
     */
    private static drivers: CarDriver[] = [];

    /**
     * Cached spawners
     * @private
     */
    private static spawners: CarSpawner[] = [];

    /**
     * Initializing traffic system
     */
    public static init() {

        // Caching distances and spawn points
        for (let key in this.waypoints) {
            const w = this.waypoints[key];
            for (let i = 0; i < w.next.length; i++) {
                const nw = this.waypoints[w.next[i]];
                if (nw) {
                    w.nextDistance[i] = nw.position.clone().sub(w.position).length();
                } else {
                    w.nextDistance[i] = 0;
                }
            }
            if (w.isSpawner) {
                const path = [key, w.next[0]];
                this.spawners.push({
                    waypoint: key,
                    checkPath: path,
                    activeCars: [],
                    timer: 0,
                })
            }
        }
    }

    /**
     * Updating logic simulation
     * @param tween
     */
    public static simulate(tween: number) {
        let tweenClamp = Math.min(tween, 32.0);
        const steps = Math.ceil(tweenClamp);
        for (let i = 0; i < steps; i++) {
            this.simulateStep(Math.min(tweenClamp - i, 1.0) * 0.8);
        }
    }

    /**
     * Making traffic simulation
     * @param tween
     */
    private static simulateStep(tween: number) {

        // First of all update all active drivers
        const obsoletteDrivers = [];
        for (let driver of this.drivers) {
            if (driver.position < driver.pathLength) {

                // Calculating nearest obstacle
                const nearestBlock = this.nearestObstacle(driver.path, driver.position, driver);
                let targetSpeed = 0.0;
                if (nearestBlock - driver.position > driver.size * 2.0) {
                    targetSpeed = driver.maxSpeed;
                }
                targetSpeed *= this.getSpeedFactor(driver.path, driver.position);

                // Updating velocity
                if (targetSpeed > driver.speed) {
                    driver.speed += driver.acceleration * tween;
                    if (driver.speed > targetSpeed) driver.speed = targetSpeed;
                } else if (targetSpeed < driver.speed) {
                    driver.speed -= driver.acceleration * tween;
                    if (driver.speed < targetSpeed) driver.speed = targetSpeed;
                }

                // Updating position
                driver.position += driver.speed * tween;
                const pos = this.getPathPoint(driver.position, driver.path);
                const lookPos = this.getPathPoint(driver.position + 0.55, driver.path);
                driver.car.visible = true;
                driver.car.position.copy(pos.clone().add(driver.positionShift));
                driver.car.rotation.set(0, Math.atan2(lookPos.x - pos.x, lookPos.z - pos.z), 0);

            } else {

                // Driver ended his path - destroy
                obsoletteDrivers.push(driver);

            }
        }
        if (obsoletteDrivers.length > 0) {
            for (let driver of obsoletteDrivers) {

                // Removing from list
                const index = this.drivers.indexOf(driver);
                if (index !== -1) {
                    this.drivers.splice(index, 1);
                }

                // Removing from spawner
                const indexSpawn = driver.spawner.activeCars.indexOf(driver);
                if (indexSpawn !== -1) {
                    driver.spawner.activeCars.splice(indexSpawn, 1);
                }

                // Destroying object
                Renderer.getScene().remove(driver.car);
                driver.car.dispose();

            }
        }

        // Updating spawners and create new cars
        for (let spawner of this.spawners) {
            let nearestPos = 99999.0;
            for (let driver of spawner.activeCars) {
                nearestPos = Math.min(nearestPos, driver.position);
            }
            if (nearestPos > 2.2) {
                spawner.timer -= tween * 0.5;
                if (spawner.timer <= 0) {
                    spawner.timer = Math.random() * 30.0 + 1;

                    // Creating new car
                    const size = 1;
                    const path = this.buildRandomPath(spawner.waypoint);
                    const d: CarDriver = {
                        car: Car.createRandom(),
                        path: path,
                        pathLength: this.getPathLength(path) - size,
                        speed: 0.04,
                        maxSpeed: 0.04,
                        position: 0,
                        size: size,
                        acceleration: 0.001,
                        spawner: spawner,
                        positionShift: new Vector3(Math.random() * 0.2 - 0.1, 0, Math.random() * 0.2 - 0.1)
                    }
                    d.speed = d.maxSpeed;
                    spawner.activeCars.push(d);
                    this.drivers.push(d);
                    d.car.visible = false;
                    Renderer.getScene().add(d.car);

                }
            }
        }

    }

    /**
     * Changing crossroads state
     * @param state
     */
    public static setCrossState(state: CrossState) {
        const points = [
            ['north_cross', CrossState.Vertical],
            ['south_cross', CrossState.Vertical],
            ['east_cross', CrossState.Horiziontal],
            ['west_cross', CrossState.Horiziontal],
        ]
        for (let conf of points) {
            this.waypoints[conf[0]].open = conf[1] === state;
        }
    }

    /**
     * Preparing for shadow pass
     * @param prescaler
     */
    public static shadowPass(prescaler: number) {
        for (let driver of this.drivers) {
            driver.car.shadowPass(prescaler);
        }
    }

    /**
     * Preparing for default render pass
     */
    public static defaultPass() {
        for (let driver of this.drivers) {
            driver.car.defaultPass();
        }
    }

    /**
     * Calculating point on path
     * @param position Float position on path
     * @param path Selected path
     * @private
     */
    private static getPathPoint(position: number, path: string[]) {
        let pos = position;
        const out = new Vector2(0, 0);
        for (let i = 0; i < path.length - 1; i++) {
            const wp1 = this.waypoints[path[i]];
            const idx = wp1.next.indexOf(path[i + 1]);
            const dist = wp1.nextDistance[idx];
            if (dist > pos) {
                const wp2 = this.waypoints[path[i + 1]];
                out.copy(wp1.position.clone().add(wp2.position.clone().sub(wp1.position).multiplyScalar(pos / dist)))
                break;
            } else {
                pos -= dist;
            }
        }
        return new Vector3(out.x, 0, out.y);
    }

    /**
     * Calculating path length
     * @param path Selected path
     * @private
     */
    private static getPathLength(path: string[]) {
        let len = 0;
        for (let i = 0; i < path.length - 1; i++) {
            const wp1 = this.waypoints[path[i]];
            const wp2 = this.waypoints[path[i + 1]];
            len += wp1.position.clone().sub(wp2.position).length();
        }
        return len;
    }

    /**
     * Generating random path starting from specific node
     * @param start
     * @private
     */
    private static buildRandomPath(start: string) {
        let nodes = [];
        let index = start;
        let lenGuard = 64;
        while (lenGuard) {
            const wp = this.waypoints[index];
            if (!wp) break;
            nodes.push(index);
            if (wp.next.length === 0) break;
            index = wp.next[Math.floor(Math.random() * wp.next.length)];
            lenGuard--;
        }
        return nodes;
    }

    /**
     * Position on path to the nearest obstacle
     * @param path
     * @param startFrom
     * @param currentDriver
     * @private
     */
    private static nearestObstacle(path: string[], startFrom: number, currentDriver: CarDriver | null = null) {
        let nearest = 99999.0;

        // Nearest cross block
        let pos = 0.0;
        let point: CarWaypoint | null = null;
        let pointIndex = path.length - 1;
        for (let i = 0; i < path.length - 1; i++) {
            const wp = this.waypoints[path[i]];
            const wp2 = this.waypoints[path[i + 1]];
            const dist = wp.nextDistance[wp.next.indexOf(path[i + 1])];
            if (pos + dist > startFrom) {
                pointIndex = i;
                point = wp;
                if (!wp2.open) {
                    nearest = Math.min(nearest, pos + dist + 0.5);
                    break;
                }
            }
            pos += dist;
        }

        // Searching nearest car
        if (currentDriver) {
            const pos1 = this.getPathPoint(currentDriver.position, currentDriver.path);
            for (let driver of currentDriver.spawner.activeCars) {
                if (currentDriver !== driver) {
                    const pos2 = this.getPathPoint(driver.position, driver.path);
                    if (pos2.sub(pos1).length() <= currentDriver.size * 3) {
                        if (driver.position > startFrom) {
                            nearest = Math.min(nearest, driver.position);
                        }
                    }
                }
            }
        }
        return nearest;
    }

    /**
     * Calculate two waypoints on path where position is
     * @param path
     * @param position
     * @private
     */
    private static getWaypointsForPosition(path: string[], position: number) {
        let pos = 0.0;
        for (let i = 0; i < path.length - 1; i++) {
            const wp = this.waypoints[path[i]];
            const dist = wp.nextDistance[wp.next.indexOf(path[i + 1])];
            if (position >= pos && position < pos + dist) {
                return [
                    path[i], path[i + 1], position - pos
                ] as const;
            }
            pos += dist;
        }
        return [
            '', '', 0.0
        ] as const;
    }

    /**
     * Calculating speed factor for current waypoint
     * @param path
     * @param position
     * @private
     */
    private static getSpeedFactor(path: string[], position: number) {
        const [point] = this.getWaypointsForPosition(path, position);
        const wp = this.waypoints[point];
        if (wp) {
            return wp.speedFactor;
        }
        return 1.0;
    }

    /**
     * Helper method to generate waypoints arc
     * @param prefix
     * @param next
     * @param startAngle
     * @param endAngle
     * @param offset
     * @param size
     * @private
     */
    private static waypointArc(prefix: string, next: string, startAngle: number, endAngle: number, offset: Vector2, size: Vector2) {
        const points: CarWaypointCollection = {};
        const angleDist = Math.abs(endAngle - startAngle);
        const steps = Math.ceil(angleDist / (Math.PI * 0.05));
        const stepSize = angleDist / steps * Math.sign(endAngle - startAngle);
        let pos = startAngle;
        let index = 1;
        let lastPoint: CarWaypoint | null = null;
        for (let i = 0; i <= steps; i++) {
            const coords = new Vector2(
                Math.sin(pos) * size.x + offset.x,
                -Math.cos(pos) * size.y + offset.y,
            );
            lastPoint = {
                position: coords,
                next: [
                    prefix + '_' + (index + 1),
                ],
                open: true,
                isSpawner: false,
                speedFactor: 0.8,
                nextDistance: []
            }
            points[prefix + '_' + index] = lastPoint;
            pos += stepSize;
            index++;
        }
        if (lastPoint) {
            lastPoint.speedFactor = 1.0;
            lastPoint.next[0] = next;
        }
        return points;
    }

}
