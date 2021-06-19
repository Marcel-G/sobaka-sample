/**
 * NOTE! At the moment, this (worklet-loader) is basically just a fork of worker-loader and probably shouldn't be used. It's possible that, at some point, worker-loader will support worklets and this loader will be obsolete. It's also possible that there are worker-specific things that this package does that breaks worklets for one reason or another. So be careful!
 * 
 * See: https://github.com/reklawnos/worklet-loader/blob/5f5e02e99a6df2e65d71a8071c9226f8a737d508/README.md#integrating-with-typescript
 */
declare module "*.worklet.ts" {
  const exportString: string;
  export default exportString;
}