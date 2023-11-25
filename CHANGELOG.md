# Changelog

## 1.4.0

- Changed interface from `NavMesh(polygons, costFunc, heuristicFunc)` 
  to `NavMesh(polygons, options?)`. The previous signature is accepted 
  for backward compatibility until version 2.0.0, but please update.
- Added new `triangulate = true|false` option, which allows disabling
  automatic triangulation.
- Added new `pointQuerySize` (previously was only an attribute),
  to allow customizing the behavior more easily.
- Added TypeScript annotation file to enable typing.
- Updated all dependencies and solved all vulnerabilities.
- Fixed some routing bugs.

## 1.3.1

-   Reduce package size by keeping out unnecessary files from the package.
-   Bumped dependency version (due to vulnerability).

## 1.3.0

-   The funnel finding algorithm has been rewritten (thanks [@abentkamp](https://github.com/abentkamp)). The new
    implementation should be stabler and is much faster, leading to 25-30% faster
    pathfinding in general. The code maintainability has also improved.

## 1.2.1

-   Fixed bug that would break path finding in certain cases when the path points where close
    to the mesh edges. This was due to wrong querying of the underlying quad-tree.
    A new `NavMesh.pointQuerySize` parameter was introduced to allow users to customize
    query performance depending on the navigation mesh scale.
-   Fixed deprecation warnings.

## 1.2.0

-   Added minified bundles to the package, so that the package can be included from unpkg
    directly. Also added bundles including all dependencies (marked with `_deps` in the name),
    so that it is possible to include the package and all dependencies with one script tag from
    the CDN.

## 1.1.1

-   Fixed bug causing the path to be wrong in some situations.

## 1.1.0

-   New function `clip(a, b, v)` that clips the value of `v` between `a` and `b`.
-   Bugfix: certain floating-point values caused the `angle` function among
    two vectors to return `NaN` due to the arccos function.
-   Updated documentation.

## 1.0.0

-   Implemented high-performance A\* instead of breadth first search.
    A\*, in contrast to breadth first search, correctly takes distances
    among polygons into account and not only the number of steps.
    This allows the path finding to correctly handle areas with different
    polygon densities and avoid weird paths is in cases.
    Distances are approximated using the polygon centroid-to-centroid
    distance by default. A\* is also fast, because it avoid computing paths
    to polygons in "wrong" directions, and therefore typically converges faster.
-   Cost and heuristic functions can be customized.
-   More tests.
-   Updated documentation.

## 0.2.0

-   Added linting.
-   Added function to calculate centroid distance among polygons.
-   Drastically improved performances of the funnel algorithm (100x speedup or more).
    This brings execution speed from about 500 ms to 1 ms (in an example test)
    for this part of the algorithm.
-   Use quadtree also for locating start and end polygon and not only
    for building the neighbors graph. This leads to a 2 order of magnitude
    speed-up for this part of path finding. This brings execution speed from
    30 ms to < 1 ms for an example test case.
-   Execution speed reduced by 50 times for an example test case with about 1000 polygons.

## 0.1.5 - Jan 14, 2020

-   Fixed bug in the removal of duplicate points from list.
    This caused some polygons not to be recognized as neighbors.

## 0.1.4 - Jan 14, 2020

-   Fixed bug causing polygons touching each other in only one point to break the navigation mesh.

## 0.1.3 - Jan 12, 2020

-   Fixed bug that caused some kinds of polygon input to throw an error.

## 0.1.2 - Jan 8, 2020

-   Reduced bundle size by removing dependencies.

## 0.1.1 - Jan 8, 2020

-   Added UMD module loader.

## 0.1.0 - Jan 6, 2020

-   First release which includes:
    -   Simple breath-first search algorithm
    -   Simple stupid funnel algorithm
    -   Automatic mesh triangulation with fast algorithm from the earcut package
    -   Automatic polygon neighbor search with use of quad-tree to improve
        performances. The neighbor search algorithm is linear and takes
        about 2 seconds for 1000 polygons.
-   Some performance optimizations were already implemented (i.e. quad-tree
    neighbor search) to make the package decently fast when the polygon count
    is below about 1000.
-   Due to breadth-first search the package is not yet very fast, for a 1000 polygon
    mash the search can take up to 500 ms. Expect this to improve as we switch to
    more efficient search algorithms.
