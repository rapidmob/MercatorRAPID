/// <reference path="../../_libs.ts" />
/// <reference path="../../../typings/angularjs/angular.d.ts"/>

/// <reference path="CordovaService.ts" />

interface INetService {
	getData(fromUrl: string): ng.IHttpPromise<any>;
	postData(toUrl: string, data: any): ng.IHttpPromise<any>;
	deleteData(toUrl: string): ng.IHttpPromise<any>;
	checkServerAvailability(): ng.IPromise<boolean>;
}

class NetService implements INetService {

	public static $inject = ['$http', 'CordovaService', '$q', 'URL_WS', 'OWNER_CARRIER_CODE'];
	private fileTransfer: FileTransfer;
	private isServerAvailable: boolean = false;

	constructor(private $http: ng.IHttpService, private cordovaService: CordovaService, protected $q: ng.IQService, public URL_WS: string, private OWNER_CARRIER_CODE: string) {
		this.$http.defaults.timeout = 60000;
		cordovaService.exec(() => {
			// this.fileTransfer = new FileTransfer();
		});
	}

	getData(fromUrl: string): ng.IHttpPromise<any> {
		var url: string = this.URL_WS + fromUrl;
		return this.$http.get(url);
	}

	postData(toUrl: string, data: any, config?: ng.IRequestShortcutConfig): ng.IHttpPromise<any> {
		return this.$http.post(this.URL_WS + toUrl, this.addMetaInfo(data));
	}

	deleteData(toUrl: string): ng.IHttpPromise<any> {
		return this.$http.delete(this.URL_WS + toUrl);
	}

	uploadFile(
		toUrl: string, urlFile: string,
		options: FileUploadOptions, successCallback: (result: FileUploadResult) => void,
		errorCallback: (error: FileTransferError) => void, progressCallback?: (progressEvent: ProgressEvent) => void) {
		if (!this.fileTransfer) {
			this.fileTransfer = new FileTransfer();
		}
		console.log(options.params);
		this.fileTransfer.onprogress = progressCallback;
		var url: string = this.URL_WS + toUrl;
		this.fileTransfer.upload(urlFile, url, successCallback, errorCallback, options);
	}

	checkServerAvailability(): ng.IPromise<boolean> {
		var availability: boolean = true;

		var def: ng.IDeferred<boolean> = this.$q.defer();

		this.cordovaService.exec(() => {
			if (window.navigator) { // on device
				var navigator: Navigator = window.navigator;
				if (navigator.connection && ((navigator.connection.type == Connection.NONE) || (navigator.connection.type == Connection.UNKNOWN))) {
					availability = false;
				}
			}
			def.resolve(availability);
		});

		return def.promise;
	}

	serverIsAvailable(): boolean {
		var that: NetService = this;

		var serverIsAvailable = this.checkServerAvailability().then((result: boolean) => {
			that.isServerAvailable = result;
		});

		return this.isServerAvailable;
	}

	cancelAllUploadDownload() {
		if (this.fileTransfer) {
			this.fileTransfer.abort();
		}
	}

	addMetaInfo(requestData: any): any {
		var device: Ionic.IDevice = ionic.Platform.device()
		var model: string = 'device Info';
		var osType: string = '8.4';
		var osVersion: string = 'ios';
		var deviceToken: string = 'string';
		if (device) {
			model = ionic.Platform.device().model;
			osType = ionic.Platform.device().platform;
			osVersion = ionic.Platform.device().version;
		}
		if (!model) {
			model = 'device Info';	
		}
		if (!osType) {
			osType = '8.4';	
		}
		if (!osVersion) {
			osVersion = 'ios';	
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
}