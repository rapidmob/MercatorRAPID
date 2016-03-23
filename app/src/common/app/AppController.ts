/// <reference path="../../_libs.ts" />

/// <reference path="../utils/Utils.ts" />
/// <reference path="../../common/services/LocalStorageService.ts" />
/// <reference path="../../common/services/DataProviderService.ts" />
/// <reference path="../../common/services/ErrorHandlerService.ts" />
/// <reference path="../../components/user/services/UserService.ts" />
/// <reference path="../../components/operational/services/OperationalService.ts" />
/// <reference path="../../components/mis/services/MisService.ts" />
/// <reference path="../../components/setting/SettingService.ts" />

class AppController {

	public static $inject = ['$state', '$scope', 'DataProviderService', 'UserService',
		'$ionicPlatform', 'LocalStorageService', '$ionicPopup',
		'$ionicLoading', '$ionicHistory', 'ErrorHandlerService', '$ionicPopover', 'MisService', 'OperationalService','SettingService', '$window', '$timeout'];

	private settingpopover: Ionic.IPopover;
	private shownGroup: number;
	private favItems: any = [];
	private metricFavItems: any = [];
	private targetBarFavItems: any = [];
	private targetLineFavItems: any = [];
	private routeRevFavItems: any = [];
	private revenueFavItems: any = [];
	private routeSectorFavItems: any = [];

	private FlightProcessFavItems: any = [];
	private FlightCntProcessFavItems: any = [];
	private CouponCntFavItems: any = [];

	private favemetricall: boolean;
	private favetargetall: boolean;
	private faverevenueall: boolean;
	private favesectorall: boolean;
	private faveRouteRevall: boolean;
	private selectSetting: string;

	private favfltprcsall: boolean;
	private favfltcntprcsall: boolean;
	private favcouponcntprcsall: boolean;

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
		private errorHandlerService: ErrorHandlerService, 
		private $ionicPopover: Ionic.IPopover,
		private misService: MisService,
		private optService: OperationalService,
		private settingService: SettingService,
		private $window: ng.IWindowService, 
		private $timeout: ng.ITimeoutService) {
			
	}
	openSettings ($event) {
		var that = this;
		this.$ionicPopover.fromTemplateUrl('components/setting/setting.html', {
			scope: that.$scope,
			animation: 'slide-in-up'
		}).then(function(settingpopover) {
			that.settingpopover = settingpopover;
		});
		this.$timeout(function(){
			that.settingpopover.show($event);
			if(that.showDashboard('MIS')){
				that.selectSetting = 'd1';
			}else{
				that.selectSetting = 'd2';
			}
			
		},300)
        
        this.shownGroup = 0;
    };
    closeSettings() {
        this.settingpopover.hide();
    };
    storeFavourite(chartobj, favStatus){
		var indexVal = _.findIndex(this.favItems, function(res: any) { return (res == chartobj); });
		console.log(chartobj);
		console.log(favStatus);
		if (favStatus) {
			this.favItems[indexVal].status = true;
		}else{
			this.favemetricall = false;
			this.favetargetall = false;
			this.faverevenueall = false;
			this.favesectorall = false;
			this.faveRouteRevall = false;

			this.favfltprcsall = false;
			this.favfltcntprcsall = false;
			this.favcouponcntprcsall = false;
			this.favItems[indexVal].status = false;
		}
		
    }
    selectFavourite(obj, type) {
		var that = this;
    	angular.forEach(obj, function(value, key) {
    		if(value){
	    		if(value.chartId){
	    			var item = {'chartID': value.chartId,'chartName': value.chartName, 'status': (value.favoriteInd == 'Y')};
		    		var available = _.some(that.favItems, function(res: any) { return (res.chartID == value.chartId && res.chartName == value.chartName);});
					if (!available) {
		    			that.favItems.push(item);
		    			
		    			switch(type){
				            case 'metric':
				                that.metricFavItems.push(item);
				            break;
				            case 'target1':
				                that.targetBarFavItems.push(item);
				            break;
				            case 'target2':
				                that.targetLineFavItems.push(item);
				            break;
				            case 'revenue':
				                that.revenueFavItems.push(item);
				            break;
				            case 'routerev':
				               that.routeRevFavItems.push(item);
				            break;
				            case 'sector':
				            	that.routeSectorFavItems.push(item);
				            break;
				            case 'fltprcs':
				            	that.FlightProcessFavItems.push(item);
				            break;
				            case 'fltcntprcs':
				            	that.FlightCntProcessFavItems.push(item);
				            break;
				            case 'couponcntprcs':
				            	that.CouponCntFavItems.push(item);
				            break;
				        }
					}
				}
			}
    	});
		var result;
		switch(type){
			case 'metric':
			result = that.metricFavItems;
			break;
			case 'target1':
			result = that.targetBarFavItems;
			break;
			case 'target2':
			result = that.targetLineFavItems;
			break;
			case 'revenue':
			result = that.revenueFavItems;
			break;
			case 'routerev':
			result = that.routeRevFavItems;
			break;
			case 'sector':
			result = that.routeSectorFavItems;
			break;
			case 'fltprcs':
			result = that.FlightProcessFavItems;
			break;
			case 'fltcntprcs':
			result = that.FlightCntProcessFavItems;
			break;
			case 'couponcntprcs':
			result = that.CouponCntFavItems;
			break;
		}

		return result;
    }
    selectAll(obj, statusall) {
    	var that = this;
		angular.forEach(obj, function(value, key) {
			var indexVal = _.findIndex(that.favItems, function(res: any) { return (res.chartID == value.chartId && res.chartName == value.chartName); });
			if (indexVal > 0) {
				if (statusall) {
					that.favItems[indexVal].status = true;
				} else {
					that.favItems[indexVal].status = false;
				}
			}
    	});
    }
    changeSetting (){
    	this.favItems = [];
		this.metricFavItems = [];
		this.targetBarFavItems = [];
		this.targetLineFavItems = [];
		this.revenueFavItems = [];
		this.routeRevFavItems = [];
		this.routeSectorFavItems = [];
		this.FlightProcessFavItems = [];
		this.FlightCntProcessFavItems = [];
		this.CouponCntFavItems = [];
    }
    saveFavourite(){
		console.log(this.favItems);
		var sectionAccess = [];
		angular.forEach(this.favItems, function(value, key) {
			var chartObj = {
			"chartId": value.chartID,
			"chartName": value.chartName,
			"chartPos": 0,
			"chartAccess": value.status
			}
			sectionAccess.push(chartObj);
    	});
		
		var that = this;
		var requestObj = {
			"userId": that.getProfileUserName(),
			"userInfo": {
			  "userName": that.getProfileUserName(),
			  "amount": "",
			  "theme": "",
			  "language": "",
			  "defaultPage": "",
			  "rowsPerPage": 0
			},
			"userProfileSettings": [
			  {
				"dashBoardId": "",
				"dashBoardAccess": [
				  {
					"sectionId": "",
					"sectionName": "",
					"sectionPos": 0,
					"selectAll": true,
					"sectionAccessFlag": true,
					"sectionAccess": sectionAccess
				  }
				]
			  }
			]
		  };
		this.ionicLoadingShow();
        this.settingService.updateFavoriteInd(requestObj)
        .then(function(data) {
			if(data.response.status === "success"){
				// that.settingpopover.hide();
				that.$ionicPopup.alert({
					title: 'Sucess',
					content: 'Updated successfully!!!'
				}).then(function(res) {	});
				that.ionicLoadingHide();
			}else{
				that.ionicLoadingHide();				  
			}
        }, function(error) {
            this.ionicLoadingHide();
            console.log('Error ');
        });
    }
    toggleGroup (group) {
        if (this.isGroupShown(group)) {
            this.shownGroup = null;
        } else {
            this.shownGroup = group;
        }
    }
    isGroupShown(group: number) {
        return this.shownGroup == group;
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
	
	ionicLoadingShow() {
        this.$ionicLoading.show({
            template: '<ion-spinner class="spinner-calm"></ion-spinner>'
        });
    };

    ionicLoadingHide() {
        this.$ionicLoading.hide();
    };
	
	getProfileUserName(): string {
		if (this.userService.isUserLoggedIn()) {
		  var obj = this.$window.localStorage.getItem('rapidMobile.user');
		  if (obj != 'null') {
			var profileUserName = JSON.parse(obj);
			return profileUserName.username;
		  }
		}
	}
}