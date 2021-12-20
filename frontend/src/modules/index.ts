import { ModuleType as ExternModuleType } from 'sobaka-sample-web-audio'

export enum CustomModule {
  Lfo = 'Lfo'
}

export type ModuleType = ExternModuleType | CustomModule

export const MODULES = {
  ...ExternModuleType,
  ...CustomModule
}
