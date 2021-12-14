import type { Link } from "./links"
import links from "./links"
import modules, { Module } from "./modules"
import { local_storage as local_storage_adapter } from "./persist"

export interface Global {
	modules: Module[]
	links: Link[]
}

export const global_state = () => {
	const save = (): Global => {
		return {
			modules: modules.save(),
			links: links.save()
		}
	}

	const load = (state) => {
		modules.load(state.modules)
		links.load(state.links)
	}

	return {
		load,
		save
	}
}

export const throttle = (fn, wait) => { // @todo import throttle form somewhere
  let inThrottle, lastFn, lastTime;
  return function() {
    const context = this,
      args = arguments;
    if (!inThrottle) {
      fn.apply(context, args);
      lastTime = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFn);
      lastFn = setTimeout(function() {
        if (Date.now() - lastTime >= wait) {
          fn.apply(context, args);
          lastTime = Date.now();
        }
      }, Math.max(wait - (Date.now() - lastTime), 0));
    }
  };
};


const global = global_state();

export const persistant = local_storage_adapter(global);

const commit = throttle(() => {
	
	const id = persistant.save()
	history.pushState({}, '', `/workspace/${id}`)
}, 2000);

modules.store().subscribe(commit)
links.store().subscribe(commit)
