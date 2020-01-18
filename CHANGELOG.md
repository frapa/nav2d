# Changelog

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
-   Due to breath-first search the package is not yet very fast, for a 1000 polygon
    mash the search can take up to 500 ms. Expect this to improve as we switch to
    more efficient search algorithms.
