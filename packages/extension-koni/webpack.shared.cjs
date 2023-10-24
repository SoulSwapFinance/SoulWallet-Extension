// Copyright 2019-2022 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');

const CopyPlugin = require('copy-webpack-plugin');
const ManifestPlugin = require('webpack-extension-manifest-plugin');

const pkgJson = require('./package.json');
const manifest = require('./manifest.json');
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

const envPath = mode === 'production' ? '.env' : '.env.local';

dotenv.config({ path: `../../${envPath}` });

console.log('You are using ' + mode + ' mode.');

const packages = [
  'extension-base',
  'extension-chains',
  'extension-dapp',
  'extension-inject',
  'extension-koni',
  'extension-koni-ui'
];

const _additionalEnv = {
  TRANSAK_API_KEY: JSON.stringify(process.env.TRANSAK_API_KEY),
  COINBASE_PAY_ID: JSON.stringify(process.env.COINBASE_PAY_ID),
  TRANSAK_TEST_MODE: mode === 'production' ? JSON.stringify(false) : JSON.stringify(true),
  BANXA_TEST_MODE: mode === 'production' ? JSON.stringify(false) : JSON.stringify(true)
};

const additionalEnvDict = {
  extension: _additionalEnv
};

module.exports = (entry, alias = {}, useSplitChunk = false) => {
  const additionalEnv = {};

  Object.keys(entry).forEach((key) => {
    Object.assign(additionalEnv, additionalEnvDict[key] || {});
  });

  const result = {
    context: __dirname,
    devtool: false,
    entry,
    module: {
      rules: [
        {
          exclude: /(node_modules)/,
          test: /\.(js|mjs|ts|tsx)$/,
          use: [
            {
              loader: require.resolve('babel-loader'),
              options: require('@polkadot/dev/config/babel-config-webpack.cjs')
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
      chunkFilename: '[name].js',
      filename: '[name].js',
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
      new webpack.IgnorePlugin({
        contextRegExp: /moment$/,
        resourceRegExp: /^\.\/locale$/
      }),
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(mode),
          PKG_NAME: JSON.stringify(pkgJson.name),
          PKG_VERSION: JSON.stringify(pkgJson.version),
          TARGET_ENV: JSON.stringify('extension'),
          ID_PREDIX: JSON.stringify('sw-ext-'),
          ...additionalEnv
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
      new ManifestPlugin({
        config: {
          base: manifest,
          extend: {
            version: pkgJson.version.split('-')[0] // remove possible -beta.xx
          }
        }
      }),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: 'public/index.html',
        chunks: ['extension']
      }),
      new HtmlWebpackPlugin({
        filename: 'notification.html',
        template: 'public/notification.html',
        chunks: ['extension']
      }),
      new HtmlWebpackPlugin({
        filename: 'background.html',
        template: 'public/background.html',
        chunks: ['background']
      })
    ],
    resolve: {
      alias: packages.reduce((alias, p) => ({
        ...alias,
        [`@soul-wallet/${p}`]: path.resolve(__dirname, `../${p}/src`)
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
        // http: false,
        // zlib: require.resolve("browserify-zlib"),
        // url: require.resolve("url/")
      }
    },
    watch: false,
    experiments: {
      asyncWebAssembly: true
    }
  };

  if (useSplitChunk) {
    result.optimization = {
      splitChunks: {
        chunks: 'all',
        maxSize: 2000000,
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10
          },
          default: {
            priority: -20,
            reuseExistingChunk: true
          }
        }
      }
    };
  }

  return result;
};
