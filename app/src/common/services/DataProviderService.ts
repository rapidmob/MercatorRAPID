/// <reference path="../../_libs.ts" />

/// <reference path="NetService.ts" />
/// <reference path="CordovaService.ts" />
/// <reference path="SessionService.ts" />
/// <reference path="ErrorHandlerService.ts" />
/// <reference path="ISessionHttpPromise.ts" />
/// <reference path="GenericResponse.ts" />

module dataprovider {
	export const SERVICE_URL_LOGOUT = '/user/logout';
}

class DataProviderService {

	public static $inject = ['NetService', 'CordovaService', '$q', '$rootScope', 'ErrorHandlerService', 'SessionService', 'OWNER_CARRIER_CODE'];

	private isConnectedToNetwork: boolean = true;
	private navigator: Navigator;

	constructor(
		private netService: NetService, private cordovaService: CordovaService, private $q: ng.IQService,
		private $rootScope: ng.IScope, private errorHandlerService: ErrorHandlerService,
		private sessionService: SessionService, private OWNER_CARRIER_CODE: string) {

		this.cordovaService.exec(() => {
			if (window.cordova && window.document) { // on device
				navigator = window.navigator;
				this.isConnectedToNetwork = navigator.onLine;
				window.document.addEventListener(
					'online',
					() => {
						console.log('user online');
						this.isConnectedToNetwork = true;
					},
					false);
				window.document.addEventListener(
					'offline',
					() => {
						console.log('user offline');
						this.isConnectedToNetwork = false;
					},
					false);
			}
		});
	}

	getData(req: string): ng.IPromise<any> {
		var def: ng.IDeferred<any> = this.$q.defer();

		if (this.hasNetworkConnection()) {
			def.resolve(this.netService.getData(req));
		} else {
			console.log('Server unavailable');
			// this.$rootScope.$broadcast('noNetwork');
			def.reject();
		}

		return def.promise;
	}

	postData(req: string, data: any, config?: ng.IRequestShortcutConfig): ng.IPromise<any> {
		var def: ng.IDeferred<any> = this.$q.defer();

		var response: ng.IPromise<any> = this.netService.postData(req, data, config);

		if (this.hasNetworkConnection()) {
			response.then(
			(httpResponse) => {

			},
			(error) => {
				console.log('Server unavailable');
				// broadcast server is unavailable
				this.$rootScope.$broadcast('serverNotAvailable');
				def.reject();
			});
		} else {
			def.reject();
		}

		return def.promise;
	}

	deleteData(req: string): ng.IPromise<any> {
		var def: ng.IDeferred<any> = this.$q.defer();

		if (this.hasNetworkConnection()) {
			def.resolve(this.netService.deleteData(req));
		} else {
			console.log('Server unavailable');
			def.reject();
		}

		return def.promise;
	}

	hasNetworkConnection(): boolean {
		return (navigator.onLine || this.isConnectedToNetwork);
	}


	// TODO: remove this temp method and use generics
	addMetaInfo(requestData: any): any {
		var device: Ionic.IDevice = ionic.Platform.device()
		var model: string = '';
		var osType: string = '';
		var osVersion: string = '';
		var deviceToken: string = '';
		if (device) {
			model = ionic.Platform.device().model;
			osType = ionic.Platform.device().platform;
			osVersion = ionic.Platform.device().version;
		}
		var metaInfo = {
			'channelIdentifier': 'MOB',
			'dateTimeStamp': new Date().getTime(),
			'ownerCarrierCode': this.OWNER_CARRIER_CODE,
			'additionalInfo': {
				'deviceType': window.isTablet ? 'Tablet' : 'Phone',
				'model': model,
				'osType': osType,
				'osVersion': osVersion,
				'deviceToken': deviceToken,
			}
		};

		var requestObj = {
			'metaInfo': metaInfo,
			'requestData': requestData
		};
		return requestObj;
	}

	private isLogoutService(requestUrl: string): boolean {
		return dataprovider.SERVICE_URL_LOGOUT == requestUrl;
	}
}
