const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

const dist = path.resolve(__dirname, "dist");

module.exports = {
  mode: "production",
  entry: {
    index: "./frontend/index.ts"
  },
  target: "web",
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ["source-map-loader"],
        exclude: [path.resolve(__dirname, "node_modules/excalibur")],
        enforce: "pre",
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", "wasm"],
  },
  output: {
    path: dist,
    filename: "[name].js"
  },
  devServer: {
    contentBase: dist,
  },
  experiments: {
    asyncWebAssembly: true
  },
  plugins: [
    new CopyPlugin([
      path.resolve(__dirname, "static")
    ]),

    new WasmPackPlugin({
      crateDirectory: path.resolve(__dirname, "backend")
    }),
  ]
};
