/// <reference path="../../_libs.ts" />
/// <reference path="../../components/operational/flown/OperationalFlownController.ts" />
/// <reference path="../../components/operational/services/OperationalService.ts" />
/// <reference path="../../components/mis/services/FilteredListService.ts" />



class SettingOptController extends OperationalFlownController {
	public static $inject = ['$state', '$scope', '$ionicLoading', '$filter',
    'OperationalService', '$ionicSlideBoxDelegate', '$timeout', '$window', 'ReportSvc', 'FilteredListService', 'UserService', '$ionicHistory', 'GRAPH_COLORS', 'TABS', '$ionicPopup'];

	constructor (private $state: angular.ui.IStateService, private $scope: ng.IScope,
            private $ionicLoading: Ionic.ILoading,
             private $filter: ng.IFilterService,
            private operationalService: OperationalService,
            private $ionicSlideBoxDelegate: Ionic.ISlideBoxDelegate,
            private $timeout: ng.ITimeoutService, private $window: ng.IWindowService,
            private reportSvc: ReportSvc, private filteredListService: FilteredListService,
            private userService: UserService, private $ionicHistory: any, private GRAPH_COLORS: string, private TABS: string, private $ionicPopup: Ionic.IPopup) {
                 super($state, $scope, $ionicLoading, $filter, operationalService, $ionicSlideBoxDelegate, $timeout, $window, reportSvc, filteredListService, userService, $ionicHistory, GRAPH_COLORS, TABS, $ionicPopup);
	        }
	
}