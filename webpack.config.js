var path = require('path');
var webpack = require('webpack');

module.exports = {
    mode: 'production',
    entry: './src/nav2d.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'nav2d.bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
        ]
    },
};
