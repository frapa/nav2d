import { v4 as uuidv4 } from "uuid";
import inside from "point-in-polygon";
import earcut from "earcut";
import QuadTree from "simple-quadtree";
import TinyQueue from "tinyqueue";

import { Vector, isclose, cross, dot } from "./math";

function _normalizePoint(point) {
    if (point instanceof Array) {
        return new Vector(...point);
    } else if (point instanceof Vector) {
        return point;
    } else if (point.hasOwnProperty("x") && point.hasOwnProperty("y")) {
        return new Vector(point.x, point.y);
    }
}

export class Edge {
    constructor(p1, p2) {
        this._uuid = uuidv4();
        this.p1 = _normalizePoint(p1);
        this.p2 = _normalizePoint(p2);
    }

    length() {
        return this.p1.sub(this.p2).length();
    }

    direction() {
        return this.p1.sub(this.p2);
    }

    onEdge(point) {
        point = _normalizePoint(point);
        const pointVec = this.p1.sub(point);

        if (!this.parallel(pointVec)) return false;

        // test that it's not only collinear, but falls between p1 and p2
        const direction = this.direction();
        const len = this.length();
        const component = dot(direction, pointVec) / (len * len);
        return component >= 0 && component <= 1;
    }

    parallel(other) {
        const otherDirection =
            other instanceof Vector ? other : other.p1.sub(other.p2);
        return isclose(cross(this.direction(), otherDirection), 0);
    }

    collinear(other) {
        const direction = this.direction();
        const otherVec1 = this.p1.sub(other.p1);
        const otherVec2 = this.p1.sub(other.p2);
        return (
            isclose(cross(direction, otherVec1), 0) &&
            isclose(cross(direction, otherVec2), 0)
        );
    }

    overlap(other) {
        if (!this.collinear(other)) {
            throw new Error(
                "Cannot compute overlap of two non-collinear edges."
            );
        }

        let endpoints = [];

        if (this.onEdge(other.p1)) endpoints.push(other.p1);
        if (this.onEdge(other.p2)) endpoints.push(other.p2);
        if (other.onEdge(this.p1)) endpoints.push(this.p1);
        if (other.onEdge(this.p2)) endpoints.push(this.p2);

        // enpoints can also be the an array with twice the same point,
        // which is fine as it yields a zero-length edge
        if (endpoints.length > 2) {
            endpoints = endpoints.filter(
                (p, i) => endpoints.findIndex((op) => op.equals(p)) === i
            );
        }

        if (!endpoints.length) {
            return null;
        } else if (endpoints.length == 1) {
            endpoints = [endpoints[0], endpoints[0]];
        }

        return new Edge(...endpoints);
    }

    equals(other) {
        return (
            (this.p1.equals(other.p1) && this.p2.equals(other.p2)) ||
            (this.p1.equals(other.p2) && this.p2.equals(other.p1))
        );
    }
}

export class Polygon {
    constructor(points) {
        this._uuid = uuidv4();
        this.points = points.map(_normalizePoint);
        this.bounds = this._computeBounds();
    }

    _computeBounds() {
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
            .div(this.points.length);
    }

    centroidDistance(other) {
        const centroidVector = this.centroid().sub(other.centroid());
        return centroidVector.length();
    }

    contains(point) {
        point = _normalizePoint(point);
        const polyPoints = this.points.map(this._toPointArray);
        return (
            inside(this._toPointArray(point), polyPoints) ||
            !!this.onEdge(point)
        );
    }

    _toPointArray(point) {
        return [point.x, point.y];
    }

    onEdge(point) {
        point = _normalizePoint(point);
        for (const edge of this.edges()) {
            if (edge.onEdge(point)) return edge;
        }

        return null;
    }

    touches(otherEdge) {
        for (const edge of this.edges()) {
            if (
                (edge.onEdge(otherEdge.p1) || edge.onEdge(otherEdge.p2)) &&
                edge.collinear(otherEdge)
            ) {
                return edge;
            }
        }

        return null;
    }

    boundsSize() {
        const [minx, miny, maxx, maxy] = this.bounds;
        return { x: minx, y: miny, w: maxx - minx, h: maxy - miny };
    }
}

export class NavMesh {
    constructor(polygons, costFunc = null, heuristicFunc = null) {
        this._uuid = uuidv4();
        this.polygons = this._triangulate(polygons).map(
            (points) => new Polygon(points)
        );
        this.costFunc = costFunc;
        this.heuristicFunc = heuristicFunc;

        this._buildQuadtree();
        this._buildNeighbors();
    }

    _triangulate(polygons) {
        const triangles = [];
        for (const poly of polygons) {
            const trianglesIndices = earcut(this._flatten(poly));
            for (let i = 0; i < trianglesIndices.length / 3; i++) {
                const indices = trianglesIndices.slice(i * 3, i * 3 + 3);
                triangles.push(indices.map((j) => poly[j]));
            }
        }
        return triangles;
    }

    _flatten(points) {
        const flatPoints = [];
        for (const point of points) {
            if (point instanceof Array) {
                flatPoints.push(...point);
            } else {
                flatPoints.push(point.x, point.y);
            }
        }
        return flatPoints;
    }

    _buildQuadtree() {
        // Use quad tree because the naive approach of iterating
        // with two nested for loops over the polygons has performance
        // n*lon(n), which for a 30x30 grid already takes a minute.
        // This thing, for the same grid, takes 1 second, and scales linearly.
        this.qt = QuadTree(-Infinity, -Infinity, Infinity, Infinity);
        for (const poly of this.polygons) {
            this.qt.put({
                ...poly.boundsSize(),
                polygon: poly,
            });
        }
    }

    _buildNeighbors() {
        this.polygons.forEach((polygon) => (polygon.neighbors = {}));

        for (let i = 0; i < this.polygons.length; i++) {
            const poly1 = this.polygons[i];

            for (const poly2wrap of this.qt.get(poly1.boundsSize())) {
                const poly2 = poly2wrap.polygon;

                if (poly1 === poly2) continue;
                if (poly1.neighbors.hasOwnProperty(poly2._uuid)) continue;

                const portal = this._computePortal(poly1, poly2);
                if (portal !== null && portal.length() > 0) {
                    poly1.neighbors[poly2._uuid] = { polygon: poly2, portal };
                    poly2.neighbors[poly1._uuid] = { polygon: poly1, portal };
                }
            }
        }
    }

    _computePortal(poly1, poly2) {
        for (const edge1 of poly1.edges()) {
            const edge2 = poly2.touches(edge1);
            if (edge2 !== null) {
                return edge1.overlap(edge2);
            }
        }

        return null;
    }

    findPath(from, to) {
        from = _normalizePoint(from);
        to = _normalizePoint(to);

        const path = this._findPath(from, to);
        return path && this._funnel(from, to, path);
    }

    _findPath(from, to) {
        // This is the A* algorithm
        const fromPoly = this._findContainingPolygon(from);
        const toPoly = this._findContainingPolygon(to);

        if (fromPoly === null || toPoly === null) return null;

        const frontier = new TinyQueue(
            [{ cost: 0, polygon: fromPoly }],
            (a, b) => a.cost - b.cost
        );
        const cameFrom = { [fromPoly._uuid]: null };
        const cost = { [fromPoly._uuid]: 0 };

        while (frontier.length) {
            const current = frontier.pop().polygon;

            if (current._uuid === toPoly._uuid) {
                break;
            }

            for (const { polygon: next } of Object.values(current.neighbors)) {
                const nextCost =
                    cost[current._uuid] + this._computeCost(current, next);

                if (
                    // node not yet visited
                    !cost.hasOwnProperty(next._uuid) ||
                    // this path to node has lower cost
                    nextCost < cost[next._uuid]
                ) {
                    frontier.push({
                        cost: nextCost + this._heuristic(next, toPoly),
                        polygon: next,
                    });
                    cost[next._uuid] = nextCost;
                    cameFrom[next._uuid] = current;
                }
            }
        }

        return this._reconstructPath(toPoly, cameFrom);
    }

    _computeDistance(a, b) {
        return a.centroidDistance(b);
    }

    _computeCost(a, b) {
        if (this.costFunc !== null) {
            const portal = a.neighbors[b._uuid].portal;
            return this.costFunc(a, b, portal);
        }
        return this._computeDistance(a, b);
    }

    _heuristic(poly, to) {
        if (poly._uuid == to._uuid) return 0;
        if (this.heuristicFunc !== null) return this.heuristicFunc(poly, to);
        return this._computeDistance(poly, to);
    }

    _findContainingPolygon(point) {
        const halfSize = point.x * 0.01;
        const bounds = {
            x: point.x * 0.99 - halfSize,
            y: point.y * 0.99 - halfSize,
            w: 2 * halfSize,
            h: 2 * halfSize,
        };
        for (const poly of this.qt.get(bounds)) {
            if (poly.polygon.contains(point)) return poly.polygon;
        }

        return null;
    }

    _reconstructPath(to, cameFrom) {
        if (!cameFrom.hasOwnProperty(to._uuid)) {
            // Disconnected
            return null;
        }

        let current = to;

        const path = [];
        while (current !== null) {
            path.push(current);
            current = cameFrom[current._uuid];
        }

        return path.reverse();
    }

    _funnel(from, to, path) {
        if (path.length === 0) {
            throw new Error("Path cannot be empty.");
        } else if (path.length === 1) {
            return [from, to];
        }

        const points = [from];
        let edge1 = null;
        let edge2 = null;

        for (let i = 0; i < path.length - 1; i++) {
            const poly = path[i];
            const next = path[i + 1];
            const portal = poly.neighbors[next._uuid].portal;

            // Calculate portal edges
            let [newEdge1, newEdge2] = this._pointPortalEdges(from, portal);

            if (edge1 !== null && edge2 !== null) {
                // Shrink funnel edges
                newEdge1 = this._funnelEdge(edge1, edge2, newEdge1);
                newEdge2 = this._funnelEdge(edge2, edge1, newEdge2);

                if (newEdge1 === null || newEdge2 === null) {
                    const edge = newEdge1 === null ? edge2 : edge1;
                    const newPath = this._splitAt(
                        // We only need to check the polygon up to now, not the future
                        // ones. This can have serious performance implications,
                        // as the function is recursive.
                        path.slice(i - 1),
                        edge.p2
                    );
                    points.push(...this._funnel(edge.p2, to, newPath));
                    break;
                }
            }

            edge1 = newEdge1;
            edge2 = newEdge2;

            // If we are at the end of the path,
            // just add the last edge, which is from -> to
            if (i === path.length - 2) {
                const toEdge = new Edge(from, to);
                let newToEdge = this._funnelEdge(edge1, edge2, toEdge);
                if (newToEdge === edge1) {
                    points.push(edge1.p2);
                } else if (newToEdge === null) {
                    points.push(edge2.p2);
                }

                points.push(to);
            }
        }

        return points;
    }

    _pointPortalEdges(point, portal) {
        const vec1 = portal.p1.sub(point);
        const vec2 = portal.p2.sub(point);
        // The funnel is between vec1 and vec2 in
        // counterclockwise direction, so the ordering counts.
        // and can be assessed with the sign of the
        // cross product.
        if (cross(vec1, vec2) < 0) {
            return [new Edge(point, portal.p2), new Edge(point, portal.p1)];
        } else {
            return [new Edge(point, portal.p1), new Edge(point, portal.p2)];
        }
    }

    _splitAt(path, point) {
        const newStartIndex = path.indexOf(
            // Reverse changes the array in-place
            [...path].reverse().find((p) => p.contains(point))
        );
        return path.slice(newStartIndex);
    }

    _funnelEdge(edge1, edge2, edge) {
        const vec1 = edge1.direction();
        const vec2 = edge2.direction();
        const vector = edge.direction();
        // If the cross product has different sign,
        // the vector would enlarge the funnel
        // -> return current vector as funnel edge.
        if (cross(vec1, vec2) * cross(vec1, vector) < 0) return edge1;
        // If the vector is inside the funnel, shrink funnel.
        if (vec1.angle(vector) <= vec1.angle(vec2)) return edge;
        // Vector would close the funnel, return null.
        return null;
    }
}
