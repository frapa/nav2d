declare module "nav2d" {
    export class Vector {
        constructor(x: number, y: number);

        add(other: Vector | number): Vector;
        sub(other: Vector | number): Vector;
        mul(other: Vector | number): Vector;
        div(other: Vector | number): Vector;
        length(): number;
        equals(other: Vector): boolean;
        angle(other: Vector): number;
        counterclockwiseAngle(other: Vector): number;
        toString(): string;
    }

    export function dot(a: Vector, b: Vector): number;
    export function cross(a: Vector, b: Vector): number;
    export function isclose(a: number, b: number, eps?: number): boolean;
    export function clip(a: number, b: number, v: number): number;

    export class Edge {
        constructor(p1: Point, p2: Point);

        p1: Vector;
        p2: Vector;

        length(): number;
        direction(): Vector;
        onEdge(point: Point): boolean;
        parallel(other: Edge): boolean;
        collinear(other: Edge): boolean;
        overlap(other: Edge): boolean | null;
        equals(other: Edge): boolean;
    }

    export class Polygon {
        constructor(points: Point[]);

        points: Vector[];
        bounds: [number, number, number, number];

        edges(): Edge[];
        centroid(): Vector;
        centroidDistance(other: Polygon): number;
        contains(point: Point): boolean;
        onEdge(point: Point): Edge | null;
        touches(otherEdge: Edge): Edge | null;
        boundsSize(): [number, number, number, number];
    }

    export class NavMesh {
        constructor(polygons: Point[][], options?: NavMeshOptions);

        polygons: Polygon[];
        pointQuerySize: number;

        findPath(from: Point, to: Point): Point[] | null;
    }

    export type Point = Vector | [number, number] | { x: number, y: number };
    export interface NavMeshOptions {
        triangulate?: boolean;
        pointQuerySize?: number;
        costFunc?: (polygon1: Polygon, polygon2: Polygon, portal: Edge) => number;
        heuristicFunc?: (poly: Polygon, to: Polygon) => number;
    }
}
