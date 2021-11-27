import { AbstractStatefulModule } from ".";
import { ModuleType, ParameterState } from "../../pkg/sobaka_sample_web_audio_rpc";
import { SamplerNode } from "../sampler.node";

export class Parameter extends AbstractStatefulModule<ModuleType.Parameter, ParameterState> {
	constructor(context: SamplerNode) {
		super(context, ModuleType.Parameter)
	}
}