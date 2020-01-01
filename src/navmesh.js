import inside from 'point-in-polygon';
import { Vector, isclose, cross, dot } from './math';

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
        this.p1 = _normalizePoint(p1);
        this.p2 = _normalizePoint(p2);
    }

    length() {
        return this.p1.subtract(this.p2).length();
    }

    on_edge(point) {
        point = _normalizePoint(point);
        const direction = this.p1.subtract(this.p2);
        const point_vec = this.p1.subtract(point);
        const component = dot(direction, point_vec) / (direction.length() * direction.length());
        return (
            isclose(cross(direction, point_vec), 0)
            // test that it's not only collinear, but falls between p1 and p2
            && component >= 0 && component <= 1
        );
    }
}

export class Polygon {
    constructor(points) {
        this.points = points.map(_normalizePoint);
    }

    _toPointArray(point) {
        return [point.x, point.y];
    }

    edges() {
        return this.points.map(
            (point, i) => new Edge(
                i == 0 ? this.points[this.points.length - 1] : this.points[i - 1],
                point
            )
        )
    }

    centroid() {
        return this.points.reduce(
            (acc, point) => acc.add(point),
            new Vector(0, 0),
        ).divide(this.points.length);
    }

    contains(point) {
        point = _normalizePoint(point);
        const poly_points = this.points.map(this._toPointArray);
        return inside(this._toPointArray(point), poly_points) || this.on_edge(point);
    }

    on_edge(point) {
        point = _normalizePoint(point);
        for (const edge of this.edges()) {
            if (edge.on_edge(point)) return true;
        }

        return false;
    }
}

export class NavMesh {
    constructor(polygons) {
        this.polygons = polygons.map(points => Polygon(points));
        this._buildNeighbors()
    }

    _buildNeighbors() {
        this.polygons.forEach(polygon => polygon.neighbors = []);

        for (const i in this.polygons) {
            const poly1 = this.polygons[i];
            for (const j in this.polygons.slice(i)) {
                const poly2 = this.polygons[j];
                if (this._areNeighbors(poly1, poly2)) {
                    poly1.neighbors.push(poly2);
                    poly2.neighbors.push(poly1);
                }
            }
        }
    }

    _areNeighbors(poly1, poly2) {

    }


    findPath(from, to) {
        from = _normalizePoint(from);
        to = _normalizePoint(to);
    }
}
