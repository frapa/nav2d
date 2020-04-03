var path = require("path");

module.exports = {
    mode: "production",
    entry: "./src/nav2d.js",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "nav2d.min.js",
        library: "nav2d",
        libraryTarget: "umd",
        globalObject: `(typeof self !== 'undefined' ? self : this)`,
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"],
                    },
                },
            },
        ],
    },
    externals: {
        uuidv4: {
            root: "uuidv4",
            amd: "uuidv4",
            commonjs2: "uuidv4",
            commonjs: "uuidv4",
        },
        "point-in-polygon": {
            root: "point-in-polygon",
            amd: "point-in-polygon",
            commonjs2: "point-in-polygon",
            commonjs: "point-in-polygon",
        },
        earcut: {
            root: "earcut",
            amd: "earcut",
            commonjs2: "earcut",
            commonjs: "earcut",
        },
        "simple-quadtree": {
            root: "simple-quadtree",
            amd: "simple-quadtree",
            commonjs2: "simple-quadtree",
            commonjs: "simple-quadtree",
        },
    },
    devtool: "source-map",
};
