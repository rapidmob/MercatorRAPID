/// <reference path="../../../_libs.ts" />
/// <reference path="../../../common/services/DataProviderService.ts" />

class MisService {

	public static $inject = ['DataProviderService', '$q'];
	

	constructor(private dataProviderService: DataProviderService, private $q: ng.IQService) { }

	getMetricSnapshot (reqdata){
		var requestUrl: string = '/paxflnmis/metricsnapshot';
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

	getTargetVsActual (reqdata){
		var requestUrl: string = '/paxflnmis/targetvsactual';
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

	getRevenueAnalysis (reqdata){
		var requestUrl: string = '/paxflnmis/revenueanalysis';
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

	getRouteRevenue (reqdata){
		var requestUrl: string = '/paxflnmis/routerevenue';
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

	getSectorCarrierAnalysis (reqdata){
		var requestUrl: string = '/paxflnmis/sectorcarrieranalysis';
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

	getPaxFlownMisHeader (reqdata): any {
		var requestUrl: string = '/paxflnmis/paxflownmisheader';
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

	getRouteRevenueDrillDown (reqdata){
		var requestUrl: string = '/paxflnmis/routerevenuedrill';
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

	getBarDrillDown (reqdata){
		var requestUrl: string = '/paxflnmis/mspaxnetrevdrill';
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
}
