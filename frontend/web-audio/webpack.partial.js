const webpack = require('webpack');

module.exports = {
  module: {
    rules: [
      {
        test: /\.wasm$/,
        use: "file-loader",
      },
      {
        test: /\.worklet\.(js|ts)$/,
        use: "worklet-loader",
      },
    ],
  }
};
