// use webpack file-loader to bundle .wasm files
declare module '*.wasm' {
  const exportString: string
  export default exportString
}
