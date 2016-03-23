/// <reference path="../../_libs.ts" />
/// <reference path="../../components/mis/MisController.ts" />
/// <reference path="../../components/mis/services/MisService.ts" />
/// <reference path="../../components/mis/services/FilteredListService.ts" />
/// <reference path="../../components/mis/services/ChartoptionService.ts" />
/// <reference path="../../components/user/services/UserService.ts" />



class SettingMisController extends MisController {
	public static $inject = ['$state', '$scope', '$ionicLoading', '$timeout', '$window', '$ionicPopover',
        '$filter', 'MisService', 'ChartoptionService', 'FilteredListService', 'UserService', '$ionicHistory', 'ReportSvc', 'GRAPH_COLORS', 'TABS', '$ionicPopup'];

	constructor(public $state: angular.ui.IStateService, private $scope: ng.IScope,
        private $ionicLoading: Ionic.ILoading, private $timeout: ng.ITimeoutService,
        private $window: ng.IWindowService, private $ionicPopover: Ionic.IPopover,
        private $filter: ng.IFilterService, private misService: MisService,
        private chartoptionService: ChartoptionService, private filteredListService: FilteredListService,
        private userService: UserService, private $ionicHistory: any, private reportSvc: ReportSvc, private GRAPH_COLORS: string, private TABS: string, private $ionicPopup: Ionic.IPopup) {
                 super($state, $scope, $ionicLoading, $timeout, $window, $filter, misService, chartoptionService, filteredListService, userService, $ionicHistory, reportSvc, GRAPH_COLORS, TABS, $ionicPopup);
         }
}