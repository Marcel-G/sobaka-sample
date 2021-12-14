import type { AbstractStatefulModule } from "sobaka-sample-web-audio";
import type { Writable } from "svelte/store";

export const as_writable = <
	T extends AbstractStatefulModule<any, any>,
	S extends ReturnType<T['from_dto']>
>(module: T, initial_value?: S): Writable<S> => {
	let last_value: S = initial_value || null; // @todo find initial state from module

	module.subscribe((new_value) => {
		last_value = new_value;
	})

	const set = (value: S) => {
		module.update(value)
	}

	const update = (updater: (value: S) => S) => {
		set(updater(last_value))
	}

	const subscribe = (run) => {
		run(last_value);
		let async_unsubscribe = module.subscribe(run)
		return () => {
			async_unsubscribe
				.then((unsubscribe) => unsubscribe())
		}
	};
	
	return {
		set,
		update,
		subscribe
	}
}