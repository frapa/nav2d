import { uuid } from "uuidv4";
import inside from "point-in-polygon";
import earcut from "earcut";
import QuadTree from "simple-quadtree";

import { Vector, isclose, cross, dot } from "./math";

function _normalizePoint(point) {
    if (point instanceof Array) {
        return new Vector(...point);
    } else if (point instanceof Vector) {
        return point;
    } else if ("x" in point && "y" in point) {
        return new Vector(point.x, point.y);
    }
}

export class Edge {
    constructor(p1, p2) {
        this._uuid = uuid();
        this.p1 = _normalizePoint(p1);
        this.p2 = _normalizePoint(p2);
    }

    length() {
        return this.p1.subtract(this.p2).length();
    }

    onEdge(point) {
        point = _normalizePoint(point);
        const direction = this.p1.subtract(this.p2);
        const point_vec = this.p1.subtract(point);

        const is_collinear = isclose(cross(direction, point_vec), 0);
        if (!is_collinear) return false;

        // test that it's not only collinear, but falls between p1 and p2
        const len = direction.length();
        const component = dot(direction, point_vec) / (len * len);
        return component >= 0 && component <= 1;
    }
}

export class Polygon {
    constructor(points) {
        this._uuid = uuid();
        this.points = points.map(_normalizePoint);
        this.bounds = this._compute_bounds();
    }

    _compute_bounds() {
        return this.points.reduce(
            (a, p) => [
                Math.min(p.x, a[0]),
                Math.min(p.y, a[1]),
                Math.max(p.x, a[2]),
                Math.max(p.y, a[3]),
            ],
            [Infinity, Infinity, -Infinity, -Infinity]
        );
    }

    edges() {
        return this.points.map(
            (point, i) =>
                new Edge(
                    i == 0
                        ? this.points[this.points.length - 1]
                        : this.points[i - 1],
                    point
                )
        );
    }

    centroid() {
        return this.points
            .reduce((acc, point) => acc.add(point), new Vector(0, 0))
            .divide(this.points.length);
    }

    contains(point) {
        point = _normalizePoint(point);
        const poly_points = this.points.map(this._toPointArray);
        return (
            inside(this._toPointArray(point), poly_points) || this.onEdge(point)
        );
    }

    _toPointArray(point) {
        return [point.x, point.y];
    }

    onEdge(point) {
        point = _normalizePoint(point);
        for (const edge of this.edges()) {
            if (edge.onEdge(point)) return true;
        }

        return false;
    }

    boundsSize() {
        const [minx, miny, maxx, maxy] = this.bounds;
        return { x: minx, y: miny, w: maxx - minx, h: maxy - miny };
    }
}

export class NavMesh {
    constructor(polygons) {
        this._uuid = uuid();
        this.polygons = this._triangulate(polygons).map(
            points => new Polygon(points)
        );
        this._buildNeighbors();
    }

    _triangulate(polygons) {
        const triangles = [];
        for (const poly of polygons) {
            const triangles_indices = earcut(this._flatten(poly));
            for (let i = 0; i < triangles_indices.length / 3; i++) {
                const indices = triangles_indices.slice(i * 3, i * 3 + 3);
                triangles.push(indices.map(j => poly[j]));
            }
        }
        return triangles;
    }

    _flatten(points) {
        const flat_points = [];
        for (const point of points) {
            if (point instanceof Array) {
                flat_points.push(...point);
            } else if (point instanceof Vector) {
                flat_points.push(point.x, point.y);
            } else if ("x" in point && "y" in point) {
                flat_points.push(point.x, point.y);
            }
        }
        return flat_points;
    }

    _buildNeighbors() {
        this.polygons.forEach(polygon => (polygon.neighbors = []));

        // Use quad tree because the naive approach of iterating
        // with two nested for loops over the polygons has performance
        // n*lon(n), which for a 30x30 grid already takes a minute.
        // This thing, for the same grid, takes 1 second, and scales linearly.
        let qt = QuadTree(-Infinity, -Infinity, Infinity, Infinity);
        for (const poly of this.polygons) {
            qt.put({
                ...poly.boundsSize(),
                polygon: poly,
            });
        }

        for (let i = 0; i < this.polygons.length; i++) {
            const poly1 = this.polygons[i];

            for (const poly2wrap of qt.get(poly1.boundsSize())) {
                const poly2 = poly2wrap.polygon;

                if (poly1 === poly2) continue;
                if (poly1.neighbors.includes(poly2)) continue;

                if (this._areNeighbors(poly1, poly2)) {
                    poly1.neighbors.push(poly2);
                    poly2.neighbors.push(poly1);
                }
            }
        }
    }

    _areNeighbors(poly1, poly2) {
        for (const point of poly1.points) {
            if (poly2.onEdge(point)) return true;
        }

        for (const point of poly2.points) {
            if (poly1.onEdge(point)) return true;
        }

        return false;
    }

    findPath(from, to) {
        from = _normalizePoint(from);
        to = _normalizePoint(to);

        return this._findPath(from, to);
    }

    _findPath(from, to) {
        // This is the A* algorithm
        const from_poly = this._findContainingPolygon(from);
        const to_poly = this._findContainingPolygon(to);

        if (from_poly === null || to_poly === null) return null;

        const frontier = [from_poly];
        const came_from = { [from_poly._uuid]: null };

        while (frontier.length) {
            const current = frontier.pop();
            for (const next of current.neighbors) {
                if (!came_from.hasOwnProperty(next._uuid)) {
                    frontier.push(next);
                    came_from[next._uuid] = current;
                }
            }
        }

        return this._reconstructPath(to_poly, came_from);
    }

    _findContainingPolygon(point) {
        for (const poly of this.polygons) {
            if (poly.contains(point)) return poly;
        }

        return null;
    }

    _reconstructPath(to, came_from) {
        if (!came_from.hasOwnProperty(to._uuid)) {
            // Disconnected
            return null;
        }

        let current = to;

        const path = [];
        while (current !== null) {
            path.push(current);
            current = came_from[current._uuid];
        }

        return path.reverse();
    }

    _funnel() {}
}
