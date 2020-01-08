var path = require("path");

module.exports = {
    mode: "production",
    entry: "./src/nav2d.js",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "nav2d.bundle.js",
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
    devtool: "source-map",
};
