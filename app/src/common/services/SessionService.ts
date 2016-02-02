/// <reference path="../../_libs.ts" />

/// <reference path="NetService.ts" />
/// <reference path="CordovaService.ts" />
/// <reference path="ErrorHandlerService.ts" />
/// <reference path="ISessionHttpPromise.ts" />

module sessionservice {
	export const HEADER_REFRESH_TOKEN_KEY: string = 'x-refresh-token';
	export const HEADER_ACCESS_TOKEN_KEY: string = 'x-access-token';
	export const REFRESH_SESSION_ID_URL: string = '/user/getAccessToken';
}

class SessionService {

	public static $inject = ['NetService', 'ErrorHandlerService', '$q', '$rootScope', '$http'];

	private accessTokenRefreshedLisnteres: IAccessTokenRefreshedHandler[];
	private sessionId: string;
	private credentialId: string;
	private isRefreshSessionIdInProgress: boolean = false;

	constructor(
		private netService: NetService, private errorHandlerService: ErrorHandlerService, private $q: ng.IQService,
		private $rootScope: ng.IScope, private $http: ng.IHttpService) {
		this.accessTokenRefreshedLisnteres = [];
		this.sessionId = null;
		this.credentialId = null;
	}

	resolvePromise(promise: ISessionHttpPromise) {
		promise.response.then((response) => {
			if (!this.errorHandlerService.hasHardErrors(response) || this.errorHandlerService.isSessionInvalid(response)) {
				if (!this.errorHandlerService.isSessionInvalid(response)) {
					promise.deffered.resolve(promise.response);
					console.log('session is valid');
				} else {
					this.addAccessTokenRefreshedListener(promise);
					if (!this.isRefreshSessionIdInProgress) {
						console.log('refreshing session token');
						this.refreshSessionId().then(
							(tokenResponse) => {
								if (this.errorHandlerService.hasHardErrors(tokenResponse)) {
									this.setSessionId(null);
								} else {
									var responseHeader = tokenResponse.headers();
									var accessToken: string = responseHeader[sessionservice.HEADER_ACCESS_TOKEN_KEY];
									this.setSessionId(accessToken);
								}
								this.isRefreshSessionIdInProgress = false;
								if (!this.getSessionId()) {
									this.accessTokenNotRefreshed();
								} else {
									this.accessTokenRefreshed();
								}
							},
							(error) => {
								console.log('error on access token refresh');
								this.setSessionId(null);
								if (this.getCredentialId()) {
									this.accessTokenNotRefreshed();
								} else {
									promise.deffered.reject();
								}
								this.isRefreshSessionIdInProgress = false;
							});
					}
				}
			} else {
				promise.deffered.reject();
			}
		});
	}

	addAccessTokenRefreshedListener(listener: IAccessTokenRefreshedHandler) {
		this.accessTokenRefreshedLisnteres.push(listener);
	}

	removeAccessTokenRefreshedListener(listenerToRemove: IAccessTokenRefreshedHandler) {
		_.remove(this.accessTokenRefreshedLisnteres, (listener) => {
			return listener == listenerToRemove;
		});
	}

	setCredentialId(credId: string) {
		this.credentialId = credId;
		this.$http.defaults.headers.common[sessionservice.HEADER_REFRESH_TOKEN_KEY] = credId;
	}

	setSessionId(sessionId: string) {
		this.sessionId = sessionId;
		this.$http.defaults.headers.common[sessionservice.HEADER_ACCESS_TOKEN_KEY] = sessionId;
	}

	getSessionId(): string {
		return this.sessionId ? this.sessionId : null;
	}

	getCredentialId(): string {
		return this.credentialId ? this.credentialId : null;
	}

	clearListeners() {
		this.accessTokenRefreshedLisnteres = [];
	}

	private refreshSessionId(): ng.IHttpPromise<any> {
		this.isRefreshSessionIdInProgress = true;
		var accessTokenRequest: any = {
			refreshToken: this.credentialId
		}
		return this.netService.postData(sessionservice.REFRESH_SESSION_ID_URL, accessTokenRequest);
	}

	private accessTokenNotRefreshed() {
		_.forEach(this.accessTokenRefreshedLisnteres, (listener) => {
			if (listener.onTokenFailed) {
				listener.onTokenFailed(listener);
			}
			this.removeAccessTokenRefreshedListener(listener);
		});
	}

	private accessTokenRefreshed() {
		_.forEach(this.accessTokenRefreshedLisnteres, (listener) => {
			if (listener) {
				if (listener.onTokenRefreshed) {
					listener.onTokenRefreshed(listener);
					console.log(JSON.stringify(listener));
				}
			} else {
				console.log('Length = ', this.accessTokenRefreshedLisnteres.length);
			}
			this.removeAccessTokenRefreshedListener(listener);
		});
	}
}