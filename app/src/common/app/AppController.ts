/// <reference path="../../_libs.ts" />

/// <reference path="../utils/Utils.ts" />
/// <reference path="../../common/services/LocalStorageService.ts" />
/// <reference path="../../common/services/DataProviderService.ts" />
/// <reference path="../../common/services/ErrorHandlerService.ts" />

class AppController {

	public static $inject = ['$state', '$scope', 'DataProviderService', 'UserService',
		'$ionicPlatform', 'LocalStorageService', '$ionicPopup',
		'$ionicLoading', '$ionicHistory', 'ErrorHandlerService'];

	constructor(
		protected $state: angular.ui.IStateService,
		protected $scope: ng.IScope,
		protected dataProviderService: DataProviderService,
		private userService: UserService,
		private $ionicPlatform: Ionic.IPlatform,
		private localStorageService: LocalStorageService,
		private $ionicPopup: Ionic.IPopup,
		private $ionicLoading: Ionic.ILoading,
		private $ionicHistory: any,
		private errorHandlerService: ErrorHandlerService) {
	}

	isNotEmpty(value: string): boolean {
		return Utils.isNotEmpty(value);
	}

	public hasNetworkConnection(): boolean {
		return this.dataProviderService.hasNetworkConnection();
	}

	logout() {
		this.$ionicHistory.clearCache();
		this.userService.logout();
		this.$state.go("login");
	}

	getUserDefaultPage() {
		return this.userService.userProfile.userInfo.defaultPage;
	}

	showDashboard(name: string): boolean {
		return this.userService.showDashboard(name);
	}
}