/// <reference path="../../../_libs.ts" />
/// <reference path="../../../common/services/DataProviderService.ts" />
/// <reference path="../../../common/services/LocalStorageService.ts" />

class UserService {
	public static $inject = ['DataProviderService', '$q', 'LocalStorageService', '$window'];
	public userProfile: any;
	public _user: boolean = false;
	private menuAccess = [];
	constructor(private dataProviderService: DataProviderService, private $q: ng.IQService, private localStorageService: LocalStorageService, private $window: ng.IWindowService) {

	}

	setUser(user) {
		if (this.$window.localStorage) {
			this.$window.localStorage.setItem('rapidMobile.user', JSON.stringify(user));
		}
	}

	logout() {
		this.localStorageService.setObject('rapidMobile.user', null);
		this.localStorageService.setObject('userPermissionMenu', []);
		this._user = false;
	}

	isLoggedIn() {
		return this._user ? true : false;
	}

	isUserLoggedIn(): boolean {
		if (this.localStorageService.getObject('rapidMobile.user', '') != null) {
			return true;
		} else {
			return false;
		}
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
					this._user = true;
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

	getUserProfile(reqdata) {
		var requestUrl: string = '/user/userprofile';
		var def: ng.IDeferred<any> = this.$q.defer();
		this.dataProviderService.postData(requestUrl, reqdata).then(
			(response) => {
				if (typeof response.data === 'object') {
					this.userProfile = response.data.response.data;
					this.localStorageService.setObject('userPermissionMenu', this.userProfile.menuAccess);
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

	showDashboard(name: string): boolean {
		if (this.isUserLoggedIn()) {
			if (typeof this.userProfile == 'undefined') {
				var data = this.localStorageService.getObject('userPermissionMenu', '');
				this.menuAccess = data;
			} else {
				this.menuAccess = this.userProfile.menuAccess;
			}
			for (var i = 0; i < this.menuAccess.length; i++) {
				if (this.menuAccess[i].menuName == name) {
					return this.menuAccess[i].menuAccess;
				}
			}
		} else {
			return this.isUserLoggedIn();
		}
	}

	checkMenuAccess(name: string): boolean {
		var data = this.localStorageService.getObject('userPermissionMenu', '');
		this.menuAccess = data;
		if (this.menuAccess) {
			for (var i = 0; i < this.menuAccess.length; i++) {
				if (this.menuAccess[i].menuName == name) {
					return this.menuAccess[i].menuAccess;
				}
			}
		} else {
			return false;
		}
	}
}