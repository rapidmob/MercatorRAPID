/// <reference path="../../../_libs.ts" />
/// <reference path="../../../common/services/DataProviderService.ts" />

class OperationalService {

	public static $inject = ['DataProviderService', '$q'];
	private serverRequest: number;

	constructor(private dataProviderService: DataProviderService, private $q: ng.IQService) { }

	getPaxFlownOprHeader(reqdata): any {
		var requestUrl: string = '/paxflnopr/paxflownoprheader';
		var def: ng.IDeferred<any> = this.$q.defer();
		this.dataProviderService.postData(requestUrl, reqdata).then(
			(response) => {
				var result: any = response.data;
				def.resolve(result);
			},
			(error) => {
				console.log('an error occured');
			});

		return def.promise;
	}

	getOprFlightProcStatus(reqdata) {
		var requestUrl: string = '/paxflnopr/flightprocessingstatus';
		var def: ng.IDeferred<any> = this.$q.defer();
		this.dataProviderService.postData(requestUrl, reqdata).then(
			(response) => {
				var result: any = response.data;
				def.resolve(result);
			},
			(error) => {
				console.log('an error occured');
			});

		return def.promise;
	}

	getOprFlightCountByReason(reqdata) {
		var requestUrl: string = '/paxflnopr/flightcountbyreason';
		var def: ng.IDeferred<any> = this.$q.defer();
		this.dataProviderService.postData(requestUrl, reqdata).then(
			(response) => {
				var result: any = response.data;
				def.resolve(result);
			},
			(error) => {
				console.log('an error occured');
			});
		return def.promise;
	}

	getOprCouponCountByException(reqdata) {
		var requestUrl: string = '/paxflnopr/couponcountbyexception';
		var def: ng.IDeferred<any> = this.$q.defer();
		this.dataProviderService.postData(requestUrl, reqdata).then(
			(response) => {
				var result: any = response.data;
				def.resolve(result);
			},
			(error) => {
				console.log('an error occured');
			});
		return def.promise;
	}
	
	getDrillDown (reqdata, URL){
		var requestUrl: string = URL;
		var def: ng.IDeferred<any> = this.$q.defer();
		if(!this.serverRequest){
			this.serverRequest = 1;
			this.dataProviderService.postData(requestUrl, reqdata).then(
			(response) => {
				var result: any = response.data;
				def.resolve(result);
				this.serverRequest = 0;
			},
			(error) => {
				console.log('an error occured');
			});
		}
		return def.promise;
	}

}
