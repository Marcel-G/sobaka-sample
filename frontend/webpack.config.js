const path = require("path");
const { merge } = require("webpack-merge");
const webAudioPartial = require("sobaka-sample-web-audio/webpack.partial");

const CopyPlugin = require("copy-webpack-plugin");

const dist = path.resolve(__dirname, "dist");

module.exports = merge(webAudioPartial, {
  mode: "production",
  entry: {
    index: "./src/index.ts",
  },
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ["source-map-loader"],
        enforce: "pre",
      },
      {
        test: /\.(ts|js)x?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    publicPath: "",
    path: dist,
    filename: "[name].js",
  },
  devServer: {
    contentBase: dist,
  },
  plugins: [new CopyPlugin([path.resolve(__dirname, "static")])],
});
