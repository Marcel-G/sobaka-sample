const webpack = require('webpack');

module.exports = {
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: 'asset/resource'
      },
      {
        test: /\.worklet\.(js|ts)$/,
        use: "worklet-loader",
      },
    ],
  }
};
