/// <reference path="../../_libs.ts" />

interface ICordovaCall {
	(): void;
}

class CordovaService {

	private cordovaReady: boolean = false;
	private pendingCalls: ICordovaCall[] = [];

	constructor() {
		document.addEventListener('deviceready', () => {
			this.cordovaReady = true;
			this.executePending();
		});
	}

	exec(fn: ICordovaCall, alternativeFn?: ICordovaCall) {
		if (this.cordovaReady) {
			fn();
		} else if (!alternativeFn) {
			this.pendingCalls.push(fn);
		} else {
			alternativeFn();
		}
	}

	private executePending() {
		this.pendingCalls.forEach((fn) => {
			fn();
		});

		this.pendingCalls = [];
	}

}