/// <reference path="./_libs.ts" />

/// <reference path="./common/app/AppController.ts" />

/// <reference path="./common/services/CordovaService.ts" />
/// <reference path="./common/services/LocalStorageService.ts" />
/// <reference path="./common/services/SessionService.ts"/>
/// <reference path="./common/services/ErrorHandlerService.ts"/>
/// <reference path="./components/mis/services/MisService.ts"/>
/// <reference path="./components/mis/services/ChartoptionService.ts"/>
/// <reference path="./components/mis/services/FilteredListService.ts"/>
/// <reference path="./components/operational/services/OperationalService.ts"/>
/// <reference path="./components/user/services/UserService.ts"/>
/// <reference path="./components/mis/MisController.ts"/>
/// <reference path="./components/operational/flown/OperationalFlownController.ts"/>
/// <reference path="./components/user/LoginController.ts"/>

var SERVER_URL = 'http://10.91.152.99:8082/rapid-ws/services/rest';
angular.module('rapidMobile', ['ionic', 'rapidMobile.config', 'tabSlideBox', 'nvd3ChartDirectives', 'nvd3'])

	.run(($ionicPlatform: Ionic.IPlatform, $http: ng.IHttpService) => {
		$http.defaults.headers.common.token = 'token';
  		$http.defaults.headers.post["Content-Type"] = "application/json";
		$ionicPlatform.ready(() => {
			if (typeof navigator.globalization !== 'undefined') {
			}
		})
	})
.config(($stateProvider: angular.ui.IStateProvider, $urlRouterProvider: angular.ui.IUrlRouterProvider,
	$ionicConfigProvider: Ionic.IConfigProvider) => {
	$ionicConfigProvider.views.swipeBackEnabled(false);

	$stateProvider.state('app', {
		url: '/app',
		abstract: true,
		templateUrl: 'components/templates/menu.html',
		controller: 'AppController as appCtrl'
	})
	.state('login', {
		url: '/login',
		templateUrl: 'components/user/login.html',
		controller: 'LoginController as LoginCtrl'
	})
	.state('app.mis-flown', {
		url: '/mis/flown',
		views: {
			'menuContent': {
				templateUrl: 'components/mis/flown.html',
				controller: 'MisController as MisCtrl'
			}
		}
	})
	.state('app.operational-flown', {
		url: '/operational/flown',
		views: {
			'menuContent': {
				templateUrl: 'components/operational/flown/flown.html',
				controller: 'OperationalFlownController as OprCtrl'
			}
		}
	});

	$urlRouterProvider.otherwise('/login');
})

.service('DataProviderService', DataProviderService)
.service('NetService', NetService)
.service('ErrorHandlerService', ErrorHandlerService)
.service('SessionService', SessionService)
.service('CordovaService', CordovaService)
.service('LocalStorageService', LocalStorageService)
.service('UserService', UserService)

.service('MisService', MisService)
.service('OperationalService', OperationalService)
.service('FilteredListService', FilteredListService)
.service('ChartoptionService', ChartoptionService)

.controller('AppController', AppController)
.controller('MisController', MisController)
.controller('OperationalFlownController', OperationalFlownController)
.controller('LoginController', LoginController)

// .directive('fetchList', FetchList.factory())


ionic.Platform.ready(() => {
	if (window.cordova && window.cordova.plugins.Keyboard) {
	}
	// StatusBar.overlaysWebView(false);
 //    StatusBar.backgroundColorByHexString('#209dc2');
 //    StatusBar.styleLightContent();
	_.defer(() => {
		// angular.bootstrap(document, ['rapidMobile']);
	});
});
