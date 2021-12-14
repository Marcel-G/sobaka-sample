export interface Persistant<S> {
	save(): S
	load(state: S): void
}

export const local_storage = (state: Persistant<any>) => {
	const previous = { json: "", id: null };
	const save = () => {
		const data = JSON.stringify(state.save());
		if (previous.json !== data) {
			const id = Math.random().toString(36).substr(2, 9);
			localStorage.setItem(id, data);

			previous.json = data;
			previous.id = id;

			return id
		}
		
		return previous.id
	}
	const load = (id: string): boolean => {
		try {
			const data = JSON.parse(localStorage.getItem(id));
			state.load(data);
			return true
		} catch (error) {
			return false
		}
	}

	return {
		save,
		load
	}
}