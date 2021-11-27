import type { InputTypeDTO, SamplerNode } from "sobaka-sample-web-audio"

export type Disconnect = () => void;

export type OutputSocket = (module_id: number) => void;
export type InputSocket = (module_id: number, input: InputTypeDTO) => void;

export const patch = (context: SamplerNode): [OutputSocket, InputSocket] => {
	let module_a: number
	let module_b: number
	let module_b_input: InputTypeDTO
	let disconnect: Disconnect

	const connect = (module_source_id, module_destination_id, input) => {
		let patch_id = context.client.request({
			method: 'module/connect',
			params: [module_source_id, module_destination_id, input]
		})

		return async () => {
			context.client.request({
				method: 'module/disconnect',
				params: [await patch_id]
			})
		}
	}

	let maybe_connect = () => {
		if (module_a !== undefined && module_b_input !== undefined && module_b !== undefined) {
			disconnect?.() // @todo patch destroy does not work properly
			disconnect = connect(module_a, module_b, module_b_input);
		}
	}

	let from_callback: OutputSocket = (module_id) => {
		if (module_a !== module_id) {
			module_a = module_id;
			maybe_connect()
		}
	}
	let to_callback: InputSocket = (module_id, input) => {
		if (module_a !== module_id || input !== module_b_input) {
			module_b = module_id;
			module_b_input = input;
			maybe_connect()
		}
	}

	return [from_callback, to_callback]
}