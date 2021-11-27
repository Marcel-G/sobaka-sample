import { AbstractModule } from ".";
import { ModuleType } from "../../pkg/sobaka_sample_web_audio_rpc";
import { SamplerNode } from "../sampler.node";

export class Volume extends AbstractModule<ModuleType.Volume> {
	constructor(context: SamplerNode) {
		super(context, ModuleType.Volume)
	}
}