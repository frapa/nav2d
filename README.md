# Nav2d

![Tests](https://github.com/frapa/nav2d/workflows/Tests/badge.svg)

This is a simple implementation of a 2D navigation mesh with pathfinding
and funneling (e.g. not only finding the nodes but also the real path coordinates).

## How to use

First create the navigation mesh, by passing an array of polygons,
each polygon being an array of points.
Polygons that are not triangles will be triangulated automatically.

```python
import { NavMesh } from "nav2d";

const navmesh = new NavMesh([
    [[0, 0], [0, 12], [12, 0]],
    [[12, 8], [12, 4], [16, 6]],
    [[12, 0], [6, 6], [12, 6]],
    [[100, 100], [110, 100], [100, 110]],
]);
```

You can pass points as arrays `[x, y]`, as objects `{x:x, y:y}` or
as `Point(x, y)` objects.
