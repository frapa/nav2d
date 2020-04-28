function default_state() {
    return {
        path: [],
        new_poly: [],
        polygons: [],
    };
}

function default_view_state() {
    return {
        render_portals: false,
        scale: 1,
        origin_x: -400,
        origin_y: -100,
        drag: false,
        drag_origin_x: 0,
        drag_origin_y: 0,
        drag_start_state_x: 0,
        drag_start_state_x: 0,
        drag_points: null,
        drag_point_moved: true,
    };
}

let mesh = new nav2d.NavMesh([]);
let history = [];
let future_history = [];
let state = default_state();
let view_state = default_view_state();

function clone(x) {
    return JSON.parse(JSON.stringify(x));
}

function update_state(partial) {
    future_history = [];
    history.push(clone(state));
    state = {
        ...state,
        ...partial,
    };
}

function last(arr) {
    return arr[arr.length - 1];
}

function undo() {
    if (!history.length) return;

    let current_state = clone(state);
    let prev_state = last(history);

    future_history = [current_state, ...future_history];
    history = history.slice(0, -1);

    state = prev_state;
    mesh = new nav2d.NavMesh(state.polygons);

    set_stats(
        `Polygons: ${state.polygons.length} <br>Triangles: ${mesh.polygons.length}`
    );
    render();
}

function redo() {
    if (!future_history.length) return;

    let current_state = clone(state);
    let next_state = future_history[0];

    future_history = future_history.slice(1);
    history = [...history, current_state];

    state = next_state;
    mesh = new nav2d.NavMesh(state.polygons);

    set_stats(
        `Polygons: ${state.polygons.length} <br>Triangles: ${mesh.polygons.length}`
    );
    render();
}

function to_world_x(x) {
    return x / view_state.scale + view_state.origin_x;
}

function to_world_y(y) {
    return y / view_state.scale + view_state.origin_y;
}

function to_screen_x(x) {
    return (x - view_state.origin_x) * view_state.scale;
}

function to_screen_y(y) {
    return (y - view_state.origin_y) * view_state.scale;
}

function viewbox() {
    return [
        view_state.origin_x,
        view_state.origin_y,
        window.innerWidth / view_state.scale,
        window.innerHeight / view_state.scale,
    ];
}

function init() {
    const main = document.getElementById("main");

    paper = Raphael(document.getElementById("main"));
    paper.setViewBox(...viewbox(), true);
    main.addEventListener("resize", () => {
        paper.setViewBox(...viewbox(), true);
    });

    main.addEventListener("wheel", (event) => {
        const ratio_x = event.clientX / window.innerWidth;
        const ratio_y = event.clientY / window.innerHeight;

        const f = event.deltaY > 0 ? 1 / 1.1 : 1.1;

        const diff_x = (window.innerWidth / view_state.scale) * (1 - 1 / f);
        const diff_y = (window.innerHeight / view_state.scale) * (1 - 1 / f);
        view_state.origin_x += diff_x * ratio_x;
        view_state.origin_y += diff_y * ratio_y;
        view_state.scale *= f;

        paper.setViewBox(...viewbox(), true);
    });

    main.addEventListener("mousedown", (event) => {
        if (event.which === 3) {
            view_state.drag = true;
            event.preventDefault();
        }

        view_state.drag_origin_x = event.clientX;
        view_state.drag_origin_y = event.clientY;
        view_state.drag_start_state_x = view_state.origin_x;
        view_state.drag_start_state_y = view_state.origin_y;
    });

    main.addEventListener("mouseup", (event) => {
        if (event.which === 1 && event.shiftKey) {
            const sx = document.getElementById("sx");
            const sy = document.getElementById("sy");
            const ex = document.getElementById("ex");
            const ey = document.getElementById("ey");

            if (!sx.value && !sy.value) {
                sx.value = to_world_x(event.clientX);
                sy.value = to_world_y(event.clientY);
            } else if (!ex.value && !ey.value) {
                ex.value = to_world_x(event.clientX);
                ey.value = to_world_y(event.clientY);
                compute_path();
            }
            return;
        }

        if (event.which === 1 && view_state.drag_points !== null) {
            view_state.drag_points = null;
            view_state.snapping = null;
            render();
            return;
        }

        if (
            event.which === 1 &&
            // Guard against drag and release
            event.clientX - view_state.drag_origin_x < 10 &&
            event.clientY - view_state.drag_origin_y < 10
        ) {
            update_state({
                new_poly: [
                    ...state.new_poly,
                    {
                        x: to_world_x(event.clientX),
                        y: to_world_y(event.clientY),
                    },
                ],
            });
            render();
        }

        if (event.which === 3) {
            view_state.drag = false;
            event.preventDefault();
        }
    });

    main.addEventListener("mousemove", (event) => {
        if (view_state.drag) {
            view_state.origin_x =
                view_state.drag_start_state_x -
                (event.clientX - view_state.drag_origin_x) / view_state.scale;
            view_state.origin_y =
                view_state.drag_start_state_y -
                (event.clientY - view_state.drag_origin_y) / view_state.scale;
            paper.setViewBox(...viewbox(), true);
        }

        if (view_state.drag_points !== null) {
            // state was copied, modify in place to avoid
            // having a history point for each mousemove event
            let new_point = {
                x: to_world_x(event.clientX),
                y: to_world_y(event.clientY),
            };

            view_state.snapping = null;

            // Snapping
            for (let i = 0; i < state.polygons.length; i++) {
                const poly = state.polygons[i];

                // no snap to self
                if (
                    view_state.drag_points.findIndex(([ii, jj]) => {
                        return ii == i;
                    }) != -1
                ) {
                    continue;
                }

                br = false;
                for (let j = 0; j < poly.length; j++) {
                    const p1 = poly[j];
                    const p2 = poly[j + 1 == poly.length ? 0 : j + 1];
                    if (line_distance(new_point, p1, p2) < 10) {
                        possible_new_point = closest_distance(
                            new_point,
                            p1,
                            p2,
                            !event.ctrlKey
                        );
                        if (possible_new_point) {
                            new_point = possible_new_point;
                            view_state.snapping = [p1, p2];
                            br = true;
                            break;
                        }
                    }
                }

                if (br) break;
            }

            for (const [i, j] of view_state.drag_points) {
                state.polygons[i][j] = clone(new_point);
            }

            view_state.drag_point_moved = true;

            mesh = new nav2d.NavMesh(state.polygons);
            render();
        }

        const x = to_world_x(event.clientX)
            .toFixed(0)
            .toString()
            .padStart(5, " ");
        const y = to_world_y(event.clientY)
            .toFixed(0)
            .toString()
            .padStart(5, " ");
        set_status(`x: <b>${x}</b> y: <b>${y}</b>`);
    });

    set_stats(
        `Polygons: ${state.polygons.length} <br>Triangles: ${mesh.polygons.length}`
    );
}

function line_distance({ x: px, y: py }, { x: x1, y: y1 }, { x: x2, y: y2 }) {
    return (
        Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1) /
        Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1))
    );
}

function closest_distance(
    { x: px, y: py },
    { x: x1, y: y1 },
    { x: x2, y: y2 },
    filter = true
) {
    const t =
        ((x2 - x1) * (px - x1) + (y2 - y1) * (py - y1)) /
        ((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    return !filter || (t >= 0 && t <= 1)
        ? { x: x1 * (1 - t) + x2 * t, y: y1 * (1 - t) + y2 * t }
        : null;
}

function set_status(status) {
    const status_element = document.getElementById("status");
    status_element.innerHTML = status;
}

function set_stats(stats) {
    const status_element = document.getElementById("stats");
    status_element.innerHTML = stats;
}

function load_mesh() {
    const file = document.getElementById("file").files[0];
    if (file) {
        const reader = new FileReader();
        reader.readAsText(file, "UTF-8");
        reader.onload = (evt) => {
            try {
                const polygons = JSON.parse(evt.target.result);
                update_state({
                    ...default_state(),
                    polygons: polygons.map((poly) =>
                        poly.map((point) => ({
                            x: point.x || point[0],
                            y: point.y || point[1],
                        }))
                    ),
                });
                mesh = new nav2d.NavMesh(polygons);
                set_stats(
                    `Polygons: ${polygons.length} <br>Triangles: ${mesh.polygons.length}`
                );
            } catch (exc) {
                alert(
                    "Error reading file: please check it's a " +
                        "JSON file and the content is well-formed."
                );
            }
            paper.setViewBox(...viewbox(), true);
            render();
        };
        reader.onerror = () => alert("Error reading file: please try again.");
    }
}

function toggle_portals(event) {
    view_state.render_portals = !view_state.render_portals;
    render();
}

function pointToPathString(points) {
    return points
        .map((p, i) => (i == 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
        .join("");
}

function render() {
    paper.clear();

    render_triangles();

    if (view_state.render_portals) {
        render_portals();
    }

    if (view_state.snapping) {
        render_snapping();
    }

    render_new();
    render_path();
}

function render_triangles() {
    for (const poly of mesh.polygons) {
        const pathString = pointToPathString([...poly.points, poly.points[0]]);
        const path = paper.path(pathString);
        path.node.setAttribute("class", "triangle");

        render_points(poly.points);
    }
}

function render_portals() {
    for (const poly of mesh.polygons) {
        for (const neighbor of Object.values(poly.neighbors)) {
            const pathString = pointToPathString([
                poly.centroid(),
                neighbor.polygon.centroid(),
            ]);
            const path = paper.path(pathString);
            path.node.setAttribute("class", "portal");
        }
    }
}

function render_snapping() {
    const pathString = pointToPathString([
        view_state.snapping[0],
        view_state.snapping[1],
    ]);
    const path = paper.path(pathString);
    path.node.setAttribute("class", "snapping");
}

function render_new() {
    const pathString = pointToPathString(state.new_poly);
    const path = paper.path(pathString);
    path.node.setAttribute("class", "new-poly");

    render_points(state.new_poly);
}

function render_path() {
    if (state.path === null) return;

    const pathString = pointToPathString(state.path);
    const path = paper.path(pathString);
    path.node.setAttribute("class", "path");
}

function render_points(points) {
    for (const point of points) {
        const circle = paper.circle(point.x, point.y, 4);
        circle.node.setAttribute("class", "node");

        let x = point.x.toFixed(0).toString().padStart(5, " ");
        let y = point.y.toFixed(0).toString().padStart(5, " ");
        circle.mousemove((event) => {
            if (view_state.drag_points === null) {
                set_status(`node - x: <b>${x}</b> y: <b>${y}</b>`);
                event.stopPropagation();
            }
        });
        circle.mousedown((event) => {
            if (event.which !== 1) return;
            event.stopPropagation();

            if (!state.new_poly.length) {
                view_state.drag_points = find_overlapping(point);
                view_state.drag_point_moved = false;
                // Make a copy of the state
                update_state({});
                return;
            }
        });

        circle.mouseup((event) => {
            if (event.which !== 1) return;
            event.stopPropagation();

            if (view_state.drag_points !== null) {
                view_state.drag_points = null;
                if (view_state.drag_point_moved) {
                    view_state.snapping = null;
                    render();
                    return;
                }
            }

            if (state.new_poly[0] == point) {
                const polygons = [...state.polygons, state.new_poly];
                update_state({
                    polygons,
                    new_poly: [],
                });
                mesh = new nav2d.NavMesh(polygons);
                set_stats(
                    `Polygons: ${polygons.length} <br>Triangles: ${mesh.polygons.length}`
                );
                render();
            } else {
                update_state({
                    new_poly: [
                        ...clone(state.new_poly),
                        {
                            x: point.x,
                            y: point.y,
                        },
                    ],
                });
                render();
            }
        });
    }
}

function compute_path() {
    try {
        const sx = parseFloat(document.getElementById("sx").value);
        const sy = parseFloat(document.getElementById("sy").value);
        const ex = parseFloat(document.getElementById("ex").value);
        const ey = parseFloat(document.getElementById("ey").value);

        update_state({
            path: mesh.findPath([sx, sy], [ex, ey]),
        });

        render();
    } catch (err) {
        console.error(err);
    }

    return false;
}

function clear_path() {
    update_state({
        path: [],
    });
}

function download(filename, text) {
    var element = document.createElement("a");
    element.style.display = "none";
    element.setAttribute(
        "href",
        "data:text/plain;charset=utf-8," + encodeURIComponent(text)
    );
    element.setAttribute("download", filename);
    document.body.appendChild(element);

    setTimeout(() => {
        element.click();
        document.body.removeChild(element);
    });
}

function download_polygons() {
    download("navmesh.json", JSON.stringify(state.polygons));
}

function find_overlapping({ x, y }) {
    const ps = [];
    for (let i = 0; i < state.polygons.length; i++) {
        for (let j = 0; j < state.polygons[i].length; j++) {
            const point = state.polygons[i][j];
            const overlapping =
                Math.abs(point.x - x) < 4 && Math.abs(point.y - y) < 4;
            if (overlapping) ps.push([i, j]);
        }
    }
    return ps;
}

// --- Keyboard shortcuts -----------
Mousetrap.bind("ctrl+s", (event) => {
    download_polygons();
    event.preventDefault();
});

Mousetrap.bind("ctrl+o", (event) => {
    document.querySelector('input[type="file"]').click();
    event.preventDefault();
});

Mousetrap.bind("ctrl+z", () => undo());

Mousetrap.bind("ctrl+y", () => redo());

window.addEventListener("keydown", (event) => {
    if (event.key == "h" && !event.repeat) {
        document.getElementById("help").classList.toggle("is-active");
    }
});
