import test from 'ava';

import { Vector, Edge, Polygon, isclose, dot, cross } from '../src/nav2d.js';

function vector() {
    return new Vector(5, 6);
}

function edge() {
    return new Edge([0, 0], [3, 4]);
}

function polygon() {
    return new Polygon([
        [0, 0],
        [0, 12],
        [12, 0],
    ]);
}

test('isclose', t => {
    t.true(isclose(5.456, 5.45600000001));
    t.true(isclose(-0, 0));
    t.false(isclose(5.456, 5.4561));
});

test('dot', t => {
    const prod = dot(vector(), vector());
    t.true(isclose(prod, 25 + 36));
});

test('cross', t => {
    const prod = cross(vector(), vector());
    t.true(isclose(prod, 0));
});

test('vector_error', t => {
    t.throws(() => { new Vector('a', null) });
});

test('vector_sum', t => {
    t.deepEqual(vector().add(vector()), new Vector(10, 12));
    t.deepEqual(vector().add(4), new Vector(9, 10));
});

test('vector_subtract', t => {
    t.deepEqual(vector().subtract(vector()), new Vector(0, 0));
    t.deepEqual(vector().subtract(4), new Vector(1, 2));
});

test('vector_mult', t => {
    t.deepEqual(vector().mult(vector()), new Vector(25, 36));
    t.deepEqual(vector().mult(4), new Vector(20, 24));
});

test('vector_divide', t => {
    t.deepEqual(vector().divide(vector()), new Vector(1, 1));
    t.deepEqual(vector().divide(2), new Vector(2.5, 3));
});

test('vector_length', t => {
    t.assert(isclose(
        vector().length(),
        Math.sqrt(25 + 36)
    ));
});

test('edge_length', t => {
    t.assert(edge().length() == 5);
});

test('edge_on_edge', t => {
    t.true(edge().on_edge([1.5, 2]));
    t.true(new Edge([0, 0], [0, 2]).on_edge([0.000000001, 1]));
    t.false(edge().on_edge([1, 2]));
    t.false(edge().on_edge([6, 8]));
});

test('construct_polygon_from_array', t => {
    new Polygon([
        [0, 0],
        [0, 12],
        [12, 0],
    ]);
    t.pass();
});

test('construct_polygon_from_object', t => {
    new Polygon([
        { x: 0, y: 0 },
        { x: 0, y: 12 },
        { x: 12, y: 0 },
    ]);
    t.pass();
});

test('construct_polygon_from_vector', t => {
    new Polygon([
        new Vector(0, 0),
        new Vector(0, 12),
        new Vector(12, 0),
    ]);
    t.pass();
});

test('polygon_edges', t => {
    const edges = polygon().edges();
    t.deepEqual(edges, [
        new Edge([12, 0], [0, 0]),
        new Edge([0, 0], [0, 12]),
        new Edge([0, 12], [12, 0]),
    ]);
});

test('polygon_centroid', t => {
    const centroid = polygon().centroid();
    t.deepEqual(centroid, new Vector(4, 4));
});

test('polygon_on_edge', t => {
    t.true(polygon().on_edge([6, 6]));
    t.false(polygon().on_edge([7, 7]));
    t.false(polygon().on_edge([3, 3]));
});

test('polygon_contains', t => {
    t.true(polygon().contains([0, 0]));
    t.true(polygon().contains([1, 0]));
    t.true(polygon().contains([1, 1]));
    t.true(polygon().contains([6, 6]));
    t.true(polygon().contains([0, 12]));
    t.true(new Polygon([[0, 0], [0, 12], [1, 0]]).contains([0, 12]));

    t.false(polygon().contains([-1, 0]));
    t.false(polygon().contains([6.1, 6]));
    t.false(polygon().contains([0, 12.001]));
});
