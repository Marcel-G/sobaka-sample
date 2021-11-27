import type { AbstractStatefulModule } from "sobaka-sample-web-audio";
import type { Writable } from "svelte/store";

export const as_writable = <
	T extends AbstractStatefulModule<any, any>,
	S extends ReturnType<T['from_dto']>
>(module: T): Writable<S> => {
	let last_value: S = null;

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