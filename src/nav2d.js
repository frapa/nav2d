import { Vector, isclose, dot, cross } from "./math";
import { Edge, Polygon, NavMesh } from "./navmesh";

const Point = Vector;

export { Point, Vector, isclose, dot, cross, Edge, Polygon, NavMesh };

try {
    window.Point = Point;
    window.Vector = Vector;
    window.isclose = isclose;
    window.dot = dot;
    window.cross = cross;
    window.Edge = Edge;
    window.Polygon = Polygon;
    window.NavMesh = NavMesh;
} catch {}
