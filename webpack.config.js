module.exports = {
  entry: './public/src/app.js',
  
  output: {
    filename: 'bundle.js',
    publicPath: 'http://localhost:8080/public/dist'
  },

  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader'
      }
    ]
  }
};
