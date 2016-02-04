
interface ISessionHttpPromise extends IAccessTokenRefreshedHandler {
	request: any;
	requestURL: string;
	config?: ng.IRequestShortcutConfig;
	response: ng.IPromise<any>;
	deffered: ng.IDeferred<any>;
	options?: any;
}

interface IAccessTokenRefreshedHandler {
	onTokenRefreshed: (tokenListener: IAccessTokenRefreshedHandler) => void;
	onTokenFailed: (listener: IAccessTokenRefreshedHandler) => void;
}
