const path = require("path");
const { merge } = require("webpack-merge");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webAudioPartial = require("sobaka-sample-audio-worklet/webpack.partial");
const sveltePreprocess = require("svelte-preprocess");

const dist = path.resolve(__dirname, "dist");

const mode = process.env.NODE_ENV || 'development';
const prod = mode === 'production';

module.exports = merge(webAudioPartial, {
  mode: "production",
  entry: {
    index: "./src/index.ts",
  },
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.(html|svelte)$/,
        use: {
          loader: 'svelte-loader',
          options: {
            compilerOptions: {
              dev: !prod
            },
            preprocess: sveltePreprocess({
              postcss: true
            }),
            emitCss: prod,
            hotReload: !prod
          }
        },
        exclude: /static/,
      },
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
      {
        test: /node_modules\/svelte\/.*\.mjs$/,
        resolve: {
          fullySpecified: false
        }
      }
    ],
  },
  resolve: {
    alias: {
      svelte: path.resolve('node_modules', 'svelte')
    },
    extensions: ['.ts', '.mjs', '.js', '.svelte'],
    mainFields: ['svelte', 'browser', 'module', 'main'],
  },
  output: {
    publicPath: "/",
    path: dist,
    filename: "[name].js",
  },
  devServer: {
    contentBase: dist,
    hot: !prod,
    historyApiFallback: true 
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './static/index.html'
    }),
  ]
});
