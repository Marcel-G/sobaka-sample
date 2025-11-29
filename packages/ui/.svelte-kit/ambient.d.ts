
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const SHELL: string;
	export const LSCOLORS: string;
	export const npm_command: string;
	export const WINDOWID: string;
	export const npm_config_userconfig: string;
	export const NIX_CC_WRAPPER_TARGET_BUILD_arm64_apple_darwin: string;
	export const COLORTERM: string;
	export const __HM_SESS_VARS_SOURCED: string;
	export const XDG_CONFIG_DIRS: string;
	export const npm_config_cache: string;
	export const hardeningDisable: string;
	export const LESS: string;
	export const XPC_FLAGS: string;
	export const NIX_BINTOOLS_WRAPPER_TARGET_HOST_arm64_apple_darwin: string;
	export const TERM_PROGRAM_VERSION: string;
	export const configureFlags: string;
	export const mesonFlags: string;
	export const TMUX: string;
	export const PKG_CONFIG_PATH: string;
	export const DEVENV_TASK_FILE: string;
	export const __sandboxProfile: string;
	export const NODE: string;
	export const __CFBundleIdentifier: string;
	export const SSH_AUTH_SOCK: string;
	export const DIRENV_DIR: string;
	export const npm_package_engines_npm: string;
	export const STRINGS: string;
	export const LD_FOR_BUILD: string;
	export const COLOR: string;
	export const npm_config_local_prefix: string;
	export const NIX_CFLAGS_COMPILE_FOR_BUILD: string;
	export const KITTY_PID: string;
	export const npm_config_globalconfig: string;
	export const CONDA_CHANGEPS1: string;
	export const DIRENV_FILE: string;
	export const EDITOR: string;
	export const MACOSX_DEPLOYMENT_TARGET: string;
	export const PWD: string;
	export const NIX_PROFILES: string;
	export const SDKROOT: string;
	export const SOURCE_DATE_EPOCH: string;
	export const LOGNAME: string;
	export const NIX_ENFORCE_NO_NATIVE: string;
	export const __propagatedSandboxProfile: string;
	export const NIX_PATH: string;
	export const npm_config_init_module: string;
	export const NIX_CC_WRAPPER_TARGET_HOST_arm64_apple_darwin: string;
	export const __NIX_DARWIN_SET_ENVIRONMENT_DONE: string;
	export const CXX: string;
	export const AS_FOR_BUILD: string;
	export const NIX_APPLE_SDK_VERSION: string;
	export const _: string;
	export const FZF_TMUX: string;
	export const KITTY_PUBLIC_KEY: string;
	export const system: string;
	export const SIZE_FOR_BUILD: string;
	export const DEVENV_DOTFILE: string;
	export const COMMAND_MODE: string;
	export const IN_NIX_SHELL: string;
	export const HOME: string;
	export const NIX_BINTOOLS: string;
	export const LANG: string;
	export const LS_COLORS: string;
	export const NIX_DONT_SET_RPATH: string;
	export const npm_package_version: string;
	export const DEVENV_FLAKE_SHELL: string;
	export const cmakeFlags: string;
	export const CXX_FOR_BUILD: string;
	export const NIX_SSL_CERT_FILE: string;
	export const NIX_PKG_CONFIG_WRAPPER_TARGET_HOST_arm64_apple_darwin: string;
	export const LD_DYLD_PATH: string;
	export const VIRTUAL_ENV_DISABLE_PROMPT: string;
	export const KITTY_WINDOW_ID: string;
	export const NIX_STORE: string;
	export const TMPDIR: string;
	export const DEVENV_ROOT: string;
	export const LD: string;
	export const NM_FOR_BUILD: string;
	export const NIX_BINTOOLS_FOR_BUILD: string;
	export const RUST_SRC_PATH: string;
	export const DIRENV_DIFF: string;
	export const INIT_CWD: string;
	export const STRIP_FOR_BUILD: string;
	export const NIX_USER_PROFILE_DIR: string;
	export const npm_lifecycle_script: string;
	export const NIX_DONT_SET_RPATH_FOR_BUILD: string;
	export const npm_config_npm_version: string;
	export const __propagatedImpureHostDeps: string;
	export const TERM: string;
	export const TERMINFO: string;
	export const npm_package_name: string;
	export const NIX_NO_SELF_RPATH: string;
	export const PATH_LOCALE: string;
	export const SIZE: string;
	export const OBJCOPY_FOR_BUILD: string;
	export const npm_config_prefix: string;
	export const CC_FOR_BUILD: string;
	export const USER: string;
	export const TMUX_PANE: string;
	export const CARGO_INSTALL_ROOT: string;
	export const AR: string;
	export const AS: string;
	export const VISUAL: string;
	export const PROMPT_EOL_MARK: string;
	export const OBJDUMP_FOR_BUILD: string;
	export const DEVENV_TASKS: string;
	export const npm_lifecycle_event: string;
	export const SHLVL: string;
	export const DEVENV_RUNTIME: string;
	export const AR_FOR_BUILD: string;
	export const NM: string;
	export const NIX_LDFLAGS_FOR_BUILD: string;
	export const PAGER: string;
	export const __HM_ZSH_SESS_VARS_SOURCED: string;
	export const NIX_CFLAGS_COMPILE: string;
	export const __impureHostDeps: string;
	export const ZERO_AR_DATE: string;
	export const NIX_IGNORE_LD_THROUGH_GCC: string;
	export const XPC_SERVICE_NAME: string;
	export const npm_config_user_agent: string;
	export const TERMINFO_DIRS: string;
	export const npm_execpath: string;
	export const DEVENV_PROFILE: string;
	export const OBJCOPY: string;
	export const RANLIB_FOR_BUILD: string;
	export const npm_package_json: string;
	export const STRIP: string;
	export const XDG_DATA_DIRS: string;
	export const OBJDUMP: string;
	export const npm_config_noproxy: string;
	export const PATH: string;
	export const npm_config_node_gyp: string;
	export const CC: string;
	export const NIX_CC: string;
	export const STRINGS_FOR_BUILD: string;
	export const DIRENV_WATCHES: string;
	export const npm_config_global_prefix: string;
	export const NIX_BINTOOLS_WRAPPER_TARGET_BUILD_arm64_apple_darwin: string;
	export const DEVENV_STATE: string;
	export const DEVELOPER_DIR: string;
	export const CONFIG_SHELL: string;
	export const KITTY_INSTALLATION_DIR: string;
	export const npm_node_execpath: string;
	export const RANLIB: string;
	export const NIX_HARDENING_ENABLE: string;
	export const __darwinAllowLocalNetworking: string;
	export const OLDPWD: string;
	export const NIX_LDFLAGS: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const name: string;
	export const npm_package_engines_node: string;
	export const TERM_PROGRAM: string;
	export const NIX_CC_FOR_BUILD: string;
	export const PKG_CONFIG: string;
	export const NODE_ENV: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		SHELL: string;
		LSCOLORS: string;
		npm_command: string;
		WINDOWID: string;
		npm_config_userconfig: string;
		NIX_CC_WRAPPER_TARGET_BUILD_arm64_apple_darwin: string;
		COLORTERM: string;
		__HM_SESS_VARS_SOURCED: string;
		XDG_CONFIG_DIRS: string;
		npm_config_cache: string;
		hardeningDisable: string;
		LESS: string;
		XPC_FLAGS: string;
		NIX_BINTOOLS_WRAPPER_TARGET_HOST_arm64_apple_darwin: string;
		TERM_PROGRAM_VERSION: string;
		configureFlags: string;
		mesonFlags: string;
		TMUX: string;
		PKG_CONFIG_PATH: string;
		DEVENV_TASK_FILE: string;
		__sandboxProfile: string;
		NODE: string;
		__CFBundleIdentifier: string;
		SSH_AUTH_SOCK: string;
		DIRENV_DIR: string;
		npm_package_engines_npm: string;
		STRINGS: string;
		LD_FOR_BUILD: string;
		COLOR: string;
		npm_config_local_prefix: string;
		NIX_CFLAGS_COMPILE_FOR_BUILD: string;
		KITTY_PID: string;
		npm_config_globalconfig: string;
		CONDA_CHANGEPS1: string;
		DIRENV_FILE: string;
		EDITOR: string;
		MACOSX_DEPLOYMENT_TARGET: string;
		PWD: string;
		NIX_PROFILES: string;
		SDKROOT: string;
		SOURCE_DATE_EPOCH: string;
		LOGNAME: string;
		NIX_ENFORCE_NO_NATIVE: string;
		__propagatedSandboxProfile: string;
		NIX_PATH: string;
		npm_config_init_module: string;
		NIX_CC_WRAPPER_TARGET_HOST_arm64_apple_darwin: string;
		__NIX_DARWIN_SET_ENVIRONMENT_DONE: string;
		CXX: string;
		AS_FOR_BUILD: string;
		NIX_APPLE_SDK_VERSION: string;
		_: string;
		FZF_TMUX: string;
		KITTY_PUBLIC_KEY: string;
		system: string;
		SIZE_FOR_BUILD: string;
		DEVENV_DOTFILE: string;
		COMMAND_MODE: string;
		IN_NIX_SHELL: string;
		HOME: string;
		NIX_BINTOOLS: string;
		LANG: string;
		LS_COLORS: string;
		NIX_DONT_SET_RPATH: string;
		npm_package_version: string;
		DEVENV_FLAKE_SHELL: string;
		cmakeFlags: string;
		CXX_FOR_BUILD: string;
		NIX_SSL_CERT_FILE: string;
		NIX_PKG_CONFIG_WRAPPER_TARGET_HOST_arm64_apple_darwin: string;
		LD_DYLD_PATH: string;
		VIRTUAL_ENV_DISABLE_PROMPT: string;
		KITTY_WINDOW_ID: string;
		NIX_STORE: string;
		TMPDIR: string;
		DEVENV_ROOT: string;
		LD: string;
		NM_FOR_BUILD: string;
		NIX_BINTOOLS_FOR_BUILD: string;
		RUST_SRC_PATH: string;
		DIRENV_DIFF: string;
		INIT_CWD: string;
		STRIP_FOR_BUILD: string;
		NIX_USER_PROFILE_DIR: string;
		npm_lifecycle_script: string;
		NIX_DONT_SET_RPATH_FOR_BUILD: string;
		npm_config_npm_version: string;
		__propagatedImpureHostDeps: string;
		TERM: string;
		TERMINFO: string;
		npm_package_name: string;
		NIX_NO_SELF_RPATH: string;
		PATH_LOCALE: string;
		SIZE: string;
		OBJCOPY_FOR_BUILD: string;
		npm_config_prefix: string;
		CC_FOR_BUILD: string;
		USER: string;
		TMUX_PANE: string;
		CARGO_INSTALL_ROOT: string;
		AR: string;
		AS: string;
		VISUAL: string;
		PROMPT_EOL_MARK: string;
		OBJDUMP_FOR_BUILD: string;
		DEVENV_TASKS: string;
		npm_lifecycle_event: string;
		SHLVL: string;
		DEVENV_RUNTIME: string;
		AR_FOR_BUILD: string;
		NM: string;
		NIX_LDFLAGS_FOR_BUILD: string;
		PAGER: string;
		__HM_ZSH_SESS_VARS_SOURCED: string;
		NIX_CFLAGS_COMPILE: string;
		__impureHostDeps: string;
		ZERO_AR_DATE: string;
		NIX_IGNORE_LD_THROUGH_GCC: string;
		XPC_SERVICE_NAME: string;
		npm_config_user_agent: string;
		TERMINFO_DIRS: string;
		npm_execpath: string;
		DEVENV_PROFILE: string;
		OBJCOPY: string;
		RANLIB_FOR_BUILD: string;
		npm_package_json: string;
		STRIP: string;
		XDG_DATA_DIRS: string;
		OBJDUMP: string;
		npm_config_noproxy: string;
		PATH: string;
		npm_config_node_gyp: string;
		CC: string;
		NIX_CC: string;
		STRINGS_FOR_BUILD: string;
		DIRENV_WATCHES: string;
		npm_config_global_prefix: string;
		NIX_BINTOOLS_WRAPPER_TARGET_BUILD_arm64_apple_darwin: string;
		DEVENV_STATE: string;
		DEVELOPER_DIR: string;
		CONFIG_SHELL: string;
		KITTY_INSTALLATION_DIR: string;
		npm_node_execpath: string;
		RANLIB: string;
		NIX_HARDENING_ENABLE: string;
		__darwinAllowLocalNetworking: string;
		OLDPWD: string;
		NIX_LDFLAGS: string;
		__CF_USER_TEXT_ENCODING: string;
		name: string;
		npm_package_engines_node: string;
		TERM_PROGRAM: string;
		NIX_CC_FOR_BUILD: string;
		PKG_CONFIG: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
