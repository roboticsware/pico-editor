// vue.config.cjs
module.exports = {
  transpileDependencies: true,
  parallel: false, // 빌드 시 병렬 처리를 꺼서 에러 위치를 정확히 잡습니다.
  configureWebpack: {
    resolve: {
      extensions: ['.ts', '.js', '.vue', '.json']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: { appendTsSuffixTo: [/\.vue$/] },
          exclude: /node_modules/
        }
      ]
    },
  }
}