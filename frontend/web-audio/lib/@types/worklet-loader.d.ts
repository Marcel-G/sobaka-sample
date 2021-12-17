// use webpack file-loader to bundle .worklet files
declare module '*.worklet' {
  const exportString: string
  export default exportString
}
