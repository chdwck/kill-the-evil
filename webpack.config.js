const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: "./src/main.ts",
  module: {
    rules: [{
      test: /\.ts?$/,
      use: 'ts-loader',
      // use: [
      //   {
      //     loader: 'babel-loader', options: {
      //       presets: ['@babel/preset-env']
      //     }
      //   },
      //   {
      //     loader: 'ts-loader',
      //     options: {
      //       compilerOptions: {
      //         noEmit: false
      //       }
      //     }
      //   }
      // ],
      exclude: /node_modules/
    }]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: 'src/assets', to: './assets' },
      ]
    })
  ],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  mode: 'development',
  devServer: {
    static: path.join(__dirname, 'dist'),
    compress: true,
    port: 4000,
  }
};
