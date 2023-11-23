declare module "nav2d" {
    export class Vector {
        constructor(x: number, y: number);

        add(other: Vector): Vector;
        sub(other: Vector): Vector;
        mul(other: Vector): Vector;
        div(other: Vector): Vector;
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
        constructor(points: Point[])

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
        constructor(polygons: Point[][], costFunc?: (polygon1: any, polygon2: any, portal: any) => {}, heuristicFunc?: (poly: any, to: any) => {});

        polygons: Polygon[];
        pointQuerySize: number;

        findPath(from: Point, to: Point): Point[] | null
    }

    export type Point = Vector | [number, number] | { x: number, y: number }
}