/// <reference path="../../../_libs.ts" />
/// <reference path="../../../common/services/DataProviderService.ts" />
/// <reference path="../../../common/services/LocalStorageService.ts" />

class UserService {
	public static $inject = ['DataProviderService', '$q', 'LocalStorageService', '$window'];
	private _user: boolean;
	constructor(private dataProviderService: DataProviderService, private $q: ng.IQService, private localStorageService: LocalStorageService, private $window: ng.IWindowService) {

	}

	setUser(user) {
		if (this.$window.localStorage) {
			this.$window.localStorage.setItem('rapidMobile.user', JSON.stringify(user));
		}
	}

	logout() {
		this.localStorageService.setObject('rapidMobile.user', null);
		this._user = null;
	}

	isLoggedIn() {
		return this._user ? true : false;
	}

	getUser() {
		return this._user;
	}

	login(_userName: string, _password: string) {
		var requestUrl: string = '/user/login';
		var def: ng.IDeferred<any> = this.$q.defer();
		var requestObj = {
			userId: _userName,
			password: _password
		}
		this.setUser({ username: "" });
		this.dataProviderService.postData(requestUrl, requestObj).then(
			(response) => {
				if (typeof response.data === 'object') {
					def.resolve(response.data);
				} else {
					def.reject(response.data);
				}
			},
			(error) => {
				console.log('an error occured on log in');
				def.reject(error);
			});

		return def.promise;
	}

	private getUserProfile(reqdata) {
		var requestUrl: string = '/user/userprofile';
		var def: ng.IDeferred<any> = this.$q.defer();
		this.dataProviderService.postData(requestUrl, reqdata).then(
			(response) => {
				if (typeof response.data === 'object') {
					def.resolve(response.data);
				} else {
					def.reject(response.data);
				}
			},
			(error) => {
				console.log('an error occured on UserProfile');
				def.reject(error);
			});
		return def.promise;
	}
}