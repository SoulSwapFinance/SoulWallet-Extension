// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

const general = require('@polkadot/dev/config/babel-general.cjs');
const plugins = require('@polkadot/dev/config/babel-plugins.cjs');
const presets = require('@polkadot/dev/config/babel-presets.cjs');

module.exports = {
  ...general,
  plugins: plugins(false, false),
  presets: presets(false)
};

const path = require('path');
const webpack = require('webpack');

const CopyPlugin = require('copy-webpack-plugin');

const pkgJson = require('./package.json');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const args = process.argv.slice(2);
let mode = 'production';

if (args) {
  args.forEach((p, index) => {
    if (p === '--mode') {
      mode = args[index + 1] || mode;
    }
  });
}

console.log('You are using ' + mode + ' mode.');

const packages = [
  'extension-base',
  'extension-chains',
  'extension-dapp',
  'extension-inject',
  'extension-koni',
  'extension-koni-ui'
];

const polkadotDevOptions = require('@polkadot/dev/config/babel-config-webpack.cjs');
// Overwrite babel babel config from polkadot dev

const createConfig = (entry, alias = {}, useSplitChunk = false) => {
  const result = {
    context: __dirname,
    devtool: false,
    entry,
    devServer: {
      static: {
        directory: path.join(__dirname, 'build')
      },
      hot: false,
      liveReload: false,
      webSocketServer: false,
      compress: true,
      port: 9000
    },
    module: {
      rules: [
        {
          exclude: /(node_modules\/(?!(@equilab|@subwallet|@polkadot\/rpc-core)).*)/,
          test: /\.(js|mjs|ts|tsx)$/,
          use: [
            {
              loader: require.resolve('babel-loader'),
              options: polkadotDevOptions
            }
          ]
        },
        {
          test: [/\.svg$/, /\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.woff2?$/],
          use: [
            {
              loader: require.resolve('url-loader'),
              options: {
                esModule: false,
                limit: 10000,
                name: 'static/[name].[ext]'
              }
            }
          ]
        }
      ]
    },
    output: {
      chunkFilename: '[name]-[contenthash].js',
      filename: '[name]-[contenthash].js',
      globalObject: '(typeof self !== \'undefined\' ? self : this)',
      path: path.join(__dirname, 'build'),
      publicPath: ''
    },
    performance: {
      hints: false
    },
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser.js'
      }),
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(mode),
          PKG_NAME: JSON.stringify(pkgJson.name),
          PKG_VERSION: JSON.stringify(pkgJson.version),
          TARGET_ENV: JSON.stringify('webrunner')
        }
      }),
      new CopyPlugin({
        patterns: [{
          from: 'public',
          globOptions: {
            ignore: [
              '**/*.html'
            ]
          }
        }]
      }),
      new CopyPlugin({
        patterns: [{
          from: path.resolve(__dirname, './package.json'),
          to: path.resolve(__dirname, './build/package.json')
        }]
      }),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: 'public/index.html'
      })
    ],
    resolve: {
      alias: packages.reduce((alias, p) => ({
        ...alias,
        [`@subwallet/${p}`]: path.resolve(__dirname, `../${p}/src`)
      }), {
        ...alias,
        'react/jsx-runtime': require.resolve('react/jsx-runtime')
      }),
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      fallback: {
        crypto: require.resolve('crypto-browserify'),
        path: require.resolve('path-browserify'),
        stream: require.resolve('stream-browserify'),
        os: require.resolve('os-browserify/browser'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        assert: require.resolve('assert'),
        zlib: false,
        url: false
      }
    },
    watch: false,
    experiments: {
      asyncWebAssembly: true
    }
  };

  return result;
};

module.exports = createConfig({
  fallback: './src/fallback.ts',
  'web-runner': './src/webRunner.ts'
}, {
  'manta-extension-sdk': './manta-extension-sdk-empty.ts'
}, false);
