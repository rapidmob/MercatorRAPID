/// <reference path="../../_libs.ts" />
/// <reference path="../../../common/services/DataProviderService.ts" />

class SettingService {
	public static $inject = ['DataProviderService', '$q'];
	
	constructor(private dataProviderService: DataProviderService, private $q: ng.IQService) { }
	
	updateFavoriteInd(reqdata): any {
		var requestUrl: string = '/user/saveuserprofile';
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