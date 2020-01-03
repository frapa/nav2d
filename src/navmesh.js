import { uuid } from "uuidv4";
import inside from "point-in-polygon";
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
        const component =
            dot(direction, point_vec) /
            (direction.length() * direction.length());
        return (
            isclose(cross(direction, point_vec), 0) &&
            // test that it's not only collinear, but falls between p1 and p2
            component >= 0 &&
            component <= 1
        );
    }
}

export class Polygon {
    constructor(points) {
        this._uuid = uuid();
        this.points = points.map(_normalizePoint);
    }

    _toPointArray(point) {
        return [point.x, point.y];
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

    onEdge(point) {
        point = _normalizePoint(point);
        for (const edge of this.edges()) {
            if (edge.onEdge(point)) return true;
        }

        return false;
    }
}

export class NavMesh {
    constructor(polygons) {
        this._uuid = uuid();
        this.polygons = polygons.map(points => new Polygon(points));
        this._buildNeighbors();
    }

    _buildNeighbors() {
        this.polygons.forEach(polygon => (polygon.neighbors = []));

        for (let i = 0; i < this.polygons.length; i++) {
            const poly1 = this.polygons[i];
            for (const poly2 of this.polygons.slice(i + 1)) {
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
}
