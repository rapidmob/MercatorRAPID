/// <reference path="../../_libs.ts" />
/// <reference path="../../components/mis/services/MisService.ts" />
/// <reference path="../../components/mis/services/FilteredListService.ts" />
/// <reference path="../../components/mis/services/ChartoptionService.ts" />
/// <reference path="../../components/user/services/UserService.ts" />



interface tabObject {
    title: string,
    names: string,
    icon: string
}

interface toggleObject {
    monthOrYear: string,
    targetRevOrPax: string,
    sectorOrder: string,
    sectorRevOrPax: string,
    chartOrTable: string,
    targetView: string,
    revenueView: string,
    sectorView: string
}

interface headerObject {
    flownMonth: string,
    surcharge: boolean,
    tabIndex: number,
    headerIndex: number,
    username: string
}

class MisController{

    public static $inject = ['$state', '$scope', '$ionicLoading', '$timeout', '$window', '$ionicPopover',
        '$filter', 'MisService', 'ChartoptionService', 'FilteredListService', 'UserService', '$ionicHistory', 'ReportSvc', 'GRAPH_COLORS', 'TABS', '$ionicPopup'];

    private tabs: [tabObject];
    private toggle: toggleObject;
    private header: headerObject;
    private subHeader: any;
    private options: any;
    private drilltabs: string[];
    
    private pageSize = 4;
    private currentPage = [];
    private selectedDrill = [];
    private groups = [];

    private infopopover: Ionic.IPopover;
    private drillpopover: Ionic.IPopover;
    private graphpopover: Ionic.IPopover;
    private drillBarpopover: Ionic.IPopover;

    private infodata: string;
    private regionName: string;
    private chartType: string;
    private graphIndex: number;
    private columnToOrder: string;
    private shownGroup: number;

    private metricResult: any;
    private metricLegends: any;
    private favMetricResult: any;

    private targetActualData: any;
    private favTargetBarResult: any;
    private favTargetLineResult: any;

    private routeRevData: any;

    private revenueData: any;
    private SectorCarrierAnalysisCharts: any;
    private popovershown: boolean;
    private drillType: string;
    private drillBarLabel: string;
    private drillName: string;
    private firstColumns: string[];
    
    private that: any;

    constructor(private $state: angular.ui.IStateService, private $scope: ng.IScope,
        private $ionicLoading: Ionic.ILoading, private $timeout: ng.ITimeoutService,
        private $window: ng.IWindowService, private $ionicPopover: Ionic.IPopover,
        private $filter: ng.IFilterService, private misService: MisService,
        private chartoptionService: ChartoptionService, private filteredListService: FilteredListService,
        private userService: UserService, private $ionicHistory: any, private reportSvc: ReportSvc, private GRAPH_COLORS: string, private TABS: string, private $ionicPopup: Ionic.IPopup) {

            this.that = this;

            this.tabs = this.TABS.DB1_TABS;

            this.toggle = {
                monthOrYear : 'month',
                targetRevOrPax: 'revenue',
                sectorOrder: 'top5',
                sectorRevOrPax: 'revenue',
                chartOrTable: 'chart',
                targetView: 'chart',
                revenueView: 'chart',
                sectorView: 'chart'
            }
            this.header = {
                flownMonth: '',
                surcharge: false,
                tabIndex: 0,
                headerIndex: 0,
                username: ''
            };

            /*
            angular.element(window).bind('orientationchange', function (e, scope) {
                this.onSlideMove({index: this.header.tabIndex});
            }); */
            angular.element(window).bind('orientationchange', this.orientationChange); 
        
            //this.$scope.$watch('MisCtrl.header.surcharge', () => { this.onSlideMove({index:this.header.tabIndex}); }, true);
            this.initData();

            this.$scope.$on('onSlideMove', (event: any, response: any) => {
                this.$scope.MisCtrl.onSlideMove(response);
            });
            var self = this;
            this.$scope.$on('$ionicView.enter', () => {
                if (!self.userService.showDashboard('MIS')) {
                    self.$state.go("login");
                }
            });

            this.$scope.$on('openDrillPopup', (event: any, response: any) => {
                if (response.type == 'metric') {
                    console.log(response);
                    if(response.name=="Network Revenue"){
                        console.log('In network revene');
                        this.$scope.MisCtrl.openNetworkRevenueDrillDownPopover(response.event, { "point": response.data }, -1);
                    }else if(response.name=="Yield"){
                        this.$scope.MisCtrl.openYieldDrillDownPopover(response.event, { "point": response.data }, -1);
                    }else if(response.name=="RPKM"){
                        this.$scope.MisCtrl.openRPKMDrillDownPopover(response.event, { "point": response.data }, -1);
                    }else if(response.name=="ASKM"){
                        this.$scope.MisCtrl.openASKMDrillDownPopover(response.event, { "point": response.data }, -1);
                    }else{
                        this.$scope.MisCtrl.openBarDrillDownPopover(response.event, { "point": response.data }, -1);
                    }
                }
                if (response.type == 'target') {
                    this.$scope.MisCtrl.openTargetDrillDownPopover(response.event, { "point": response.data }, -1);
                }
                if (response.type == 'passenger-count') {
                    this.$scope.MisCtrl.openRevenuePassengerDrillDownPopover(response.event, { "point": response.data }, -1);
                }
                if (response.type == 'oal') {
                   this.$scope.MisCtrl.openOALContDrillDownPopover(response.event, { "point": response.data }, -1);
                }
            });
    }

    initData() {
        var that = this;
        this.$ionicPopover.fromTemplateUrl('components/mis/infotooltip.html', {
            scope: that.$scope
        }).then(function(infopopover) {
            that.infopopover = infopopover;
        });

        this.$ionicPopover.fromTemplateUrl('components/mis/drildown.html', {
            scope: that.$scope
        }).then(function(drillpopover) {
            that.drillpopover = drillpopover;
        });
        
        this.$ionicPopover.fromTemplateUrl('components/mis/bardrildown.html', {
            scope: that.$scope
        }).then(function(drillBarpopover) {
            that.drillBarpopover = drillBarpopover;
        });

        this.options = {
            metric: this.chartoptionService.metricBarChartOptions(this),
            targetLineChart: this.chartoptionService.lineChartOptions(),
            targetBarChart: this.chartoptionService.targetBarChartOptions(this),
            passengerChart: this.chartoptionService.multiBarChartOptions()
        };

        var req = {
            userId: this.$window.localStorage.getItem('rapidMobile.user')
        }

        if(req.userId != "null") {
            this.misService.getPaxFlownMisHeader(req).then(
                (data) => {
                    that.subHeader = data.response.data;
                    that.header.flownMonth = that.subHeader.paxFlownMisMonths[0].flowMonth;

                    that.onSlideMove({ index: 0 });
                },
                (error) => {
                    console.log('an error occured');
                });
        }
	
		that.header.username = that.getProfileUserName();
    }

    getProfileUserName(): string {
        if (this.userService.isUserLoggedIn()) {
            var obj = this.$window.localStorage.getItem('rapidMobile.user');
            if (obj != 'null') {
                var profileUserName = JSON.parse(obj);
                return profileUserName.username;
            }
        }
    }

    selectedFlownMonth(month: string){
        return (month == this.header.flownMonth);
    }
    orientationChange = (): boolean => {
        var that = this;
        that.$timeout(function(){
            that.onSlideMove({ index: that.header.tabIndex });
        },200)
    } 
    openinfoPopover ($event, index) {
        if (typeof index == "undefined" || index == "") {
            this.infodata = 'No info available';
        }
        else{
            this.infodata=index;
        }
        console.log(index);
        this.infopopover.show($event);
    };

    closePopover() {
        this.graphpopover.hide();
    };
    closesBarPopover(){
        this.drillBarpopover.hide();
    }
    closeInfoPopover() {
        this.infopopover.hide();
    }

    updateHeader() {
		var flownMonth = this.header.flownMonth;
        this.header.headerIndex = _.findIndex(this.subHeader.paxFlownMisMonths, function(chr: any) {
            return chr.flowMonth == flownMonth;
        });
        console.log(this.header.headerIndex);
		this.onSlideMove({index: this.header.headerIndex});
    }

    onSlideMove(data: any) {
        this.header.tabIndex = data.index;
        switch(this.header.tabIndex){
            case 0:
            this.getFlownFavorites();
            break;
            case 1:
            this.callMetricSnapshot();
            break;
            case 2:
            this.callTargetVsActual();
            break;
            case 3:
            this.callRevenueAnalysis();
            break;
            case 4:
            this.callSectorCarrierAnalysis();
            break;
            case 5:
            this.callRouteRevenue();
            break;
        }
    };

    toggleMetric (val) {
        this.toggle.monthOrYear = val;
        this.onSlideMove({index: this.header.tabIndex});
    }
    toggleSurcharge() {
        this.onSlideMove({index:this.header.tabIndex});
    }
    toggleTarget(val) {
        this.toggle.targetRevOrPax = val;
    }

    toggleSector(val) {
        this.toggle.sectorRevOrPax = val;
    }

    callMetricSnapshot() {
        var that = this;
        var reqdata = {
            flownMonth: this.header.flownMonth,
            includeSurcharge: (this.header.surcharge) ? 'Y':'N',
            userId: this.header.username,
            toggle1: this.toggle.monthOrYear,
            fullDataFlag: 'N'
        };
        this.ionicLoadingShow();
        this.misService.getMetricSnapshot(reqdata)
        .then(function(data) {
			if(data.response.status === "success"){
				// fav Items to display in dashboard
				that.metricResult  = _.sortBy(data.response.data.metricSnapshotCharts, function(u: any) {
					if (u) return [u.favoriteChartPosition]; 
				});

				_.forEach(that.metricResult, function (n: any, value: any) {
					n.values[0].color = that.GRAPH_COLORS.METRIC[0];
					n.values[1].color = that.GRAPH_COLORS.METRIC[1];
					if(n.values[2]) n.values[2].color = that.GRAPH_COLORS.METRIC[2];
				});

				that.favMetricResult = _.filter(that.metricResult, function(u: any) {
					if(u) return u.favoriteInd == 'Y';
				});
				that.metricLegends = data.response.data.legends;
				if(that.header.tabIndex == 0) {
					that.metricResult = that.favMetricResult;
				}
				that.ionicLoadingHide();
			}else{
				that.ionicLoadingHide();
				  that.$ionicPopup.alert({
					title: 'Error',
					content: 'No Data Found for MetricSnapshot!!!'
				  }).then(function(res) {
					  console.log('done');
				  });
			}
        }, function(error) {
        });
    }

    callTargetVsActual() {
        var that = this;
        var reqdata = {
            flownMonth: this.header.flownMonth,
            includeSurcharge: (this.header.surcharge) ? 'Y':'N',
            userId: this.header.username,
            toggle1: '',
            fullDataFlag: ''
        };
        this.ionicLoadingShow();

        this.misService.getTargetVsActual(reqdata)
        .then(function(data) {
			if(data.response.status === "success"){
				// fav Items to display in dashboard
				that.favTargetLineResult = _.filter(data.response.data.lineCharts, function(u: any) { 
					if(u) return u.favoriteInd == 'Y';
				});
				that.favTargetBarResult = _.filter(data.response.data.verBarCharts, function(u: any) { 
					if(u) return u.favoriteInd == 'Y';
				});
				_.forEach(data.response.data.verBarCharts, function (n: any, value: any) {
					n.values[0].color = that.GRAPH_COLORS.verBarCharts[0];
					n.values[1].color = that.GRAPH_COLORS.verBarCharts[1];
				});

				var lineColors = [{"color": that.GRAPH_COLORS.LINE[0], "classed": "dashed","strokeWidth": 2},
				{"color": that.GRAPH_COLORS.LINE[1]},{"color": that.GRAPH_COLORS.LINE[2], "area" : true, "disabled": true}];

				_.forEach(data.response.data.lineCharts, function (n: any, value: any) {
					_.merge(n.lineChartItems, lineColors);
				});

				console.log(data.response.data.lineCharts);

				that.targetActualData = {
					horBarChart: data.response.data.verBarCharts,
					lineChart: data.response.data.lineCharts
				};

				that.ionicLoadingHide();
			}else{
				that.ionicLoadingHide();
				  that.$ionicPopup.alert({
					title: 'Error',
					content: 'No Data Found for TargetVsActual!!!'
				  }).then(function(res) {
					  console.log('done');
				  });
			}
        }, function(error) {
            console.log('Error ');
            that.ionicLoadingHide();
        });
    }

    callRouteRevenue() {
        var that = this;
        var routeRevRequest = {
            flownMonth: this.header.flownMonth,
            includeSurcharge: (this.header.surcharge) ? 'Y':'N',
            userId: this.header.username
        };
        this.misService.getRouteRevenue(routeRevRequest)
        .then(function(data) {
			if(data.response.status === "success"){
				that.routeRevData = data.response.data;
			}else{
				that.ionicLoadingHide();
				  that.$ionicPopup.alert({
					title: 'Error',
					content: 'No Data Found RouteRevenue!!!'
				  }).then(function(res) {
					  console.log('done');
				  });
			}
        }, function(error) {
            console.log('Error ');
        });
    }


    callRevenueAnalysis() {
        var that = this;
        var reqdata = {
            flownMonth: this.header.flownMonth,
            includeSurcharge: (this.header.surcharge) ? 'Y':'N',
            userId: this.header.username,
            toggle1: '',
            fullDataFlag: ''
        };
        this.ionicLoadingShow();
        this.misService.getRevenueAnalysis(reqdata)
        .then(function(data) {
			if(data.response.status === "success"){
				// fav Items to display in dashboard
				var jsonObj = data.response.data;
				var sortedData = _.sortBy(jsonObj.multibarCharts, function(u: any) { 
					if (u) return [u.favoriteChartPosition]; 
				});
				var favRevenueBarResult = _.filter(sortedData, function(u: any) { 
					if(u) return u.favoriteInd == 'Y';
				});
				var sortedData = _.sortBy(jsonObj.pieCharts, function(u: any) { 
					if (u) return [u.favoriteChartPosition]; 
				});
				var favRevenuePieResult = _.filter(sortedData, function(u: any) { 
					if(u) return u.favoriteInd == 'Y';
				});

				var barColors = [that.GRAPH_COLORS.BAR[0], that.GRAPH_COLORS.BAR[1]];
				_.merge(jsonObj.multibarCharts[1], barColors);
				_.forEach(jsonObj.multibarCharts, function(n: any, value: any) {
					n.color = barColors[value];
				});

				var pieColors = [{"color": that.GRAPH_COLORS.PIE[0]},{"color": that.GRAPH_COLORS.PIE[1]},{"color": that.GRAPH_COLORS.PIE[2]}];
				_.forEach(jsonObj.pieCharts[0].data, function (n: any, value: any) {
					n.label = n.xval;
					n.value = n.yval;
				});

				_.merge(jsonObj.pieCharts[0].data, pieColors);

				that.revenueData = {
					revenuePieChart : jsonObj.pieCharts[0],
					revenueBarChart : jsonObj.multibarCharts[1],
					revenueHorBarChart : jsonObj.multibarCharts[2].multibarChartItems
				}

				that.ionicLoadingHide();
			}else{
				that.ionicLoadingHide();
				  that.$ionicPopup.alert({
					title: 'Error',
					content: 'No Data Found For RevenueAnalysis!!!'
				  }).then(function(res) {
					  console.log('done');
				  });
			}
        }, function(error) {
            this.ionicLoadingHide();
            console.log('Error ');
        });
    }

    openDrillDown(regionData,selFindLevel) {
        selFindLevel = Number(selFindLevel);
        var that = this;
        this.selectedDrill[selFindLevel] = regionData;
        this.selectedDrill[selFindLevel + 1] = '';
        if(selFindLevel != '3') {
            var drillLevel = (selFindLevel + 2);
            this.regionName = (regionData.regionName) ? regionData.regionName : regionData.chartName;
            var countryFromTo = (regionData.countryFrom && regionData.countryTo) ? regionData.countryFrom + '-' + regionData.countryTo : "";
            var sectorFromTo = (regionData.flownSector && drillLevel >= 3) ? regionData.flownSector : "";
            var flightNumber = (regionData.flightNumber && drillLevel == 4) ? regionData.flightNumber : "";
            this.ionicLoadingShow();

            var reqdata = {
                "flownMonth": this.header.flownMonth,
                "includeSurcharge": (this.header.surcharge) ? 'Y':'N',
                "userId": this.header.username,
                "fullDataFlag": "",
                "drillLevel": drillLevel,
                "pageNumber": 0,
                "regionName": (this.regionName)? this.regionName : "North America",
                "countryFromTo": countryFromTo,
                "sectorFromTo": sectorFromTo,
                "flightNumber": flightNumber,
                "flightDate": 0
            };

            this.misService.getRouteRevenueDrillDown(reqdata)
            .then(function(data) {
                that.ionicLoadingHide();
                var data = data.response;
                console.log(data);
                var findLevel = drillLevel - 1;
                console.log(data.status);
                if(data.status == 'success'){
                    that.groups[findLevel].items[0] = data.data.rows;
                    that.groups[findLevel].orgItems[0] = data.data.rows;
                    that.shownGroup = findLevel;
                    that.sort('paxCount',findLevel,false);
                    that.clearDrill(drillLevel);
                }else{
                    that.shownGroup = findLevel;
                    that.clearDrill(findLevel);
                }
            },function(error){
                that.ionicLoadingHide();
                that.closesPopover();
                console.log(error);
                alert('Server Error');
            }); 
        } 
    }
    clearDrill(level: number) {
        var i: number;
        for (var i = level; i < this.groups.length; i++) {
            this.groups[i].items.splice(0, 1);
            this.groups[i].orgItems.splice(0, 1);
            this.sort('paxCount',i,false);
            this.selectedDrill[i] = '';
        }
    }
    drillDownRequest (drillType, selFindLevel, data){
        var reqdata;
        if(drillType == 'bar') {
            var drillLevel = (selFindLevel + 2);
            if (data.label) {
                this.drillBarLabel = data.label;
            }

            var drillBar: string;
            drillBar = (data.label) ? data.label : "";
            var routeCode = (data.routeCode) ? data.routeCode : "";
            var sector = (data.flownSector) ? data.flownSector : "";
            var flightNumber = (data.flightNumber) ? data.flightNumber : "";

            if (!drillBar) {
                drillBar = this.drillBarLabel;
                console.log(drillBar);
            }
            this.ionicLoadingShow();

            reqdata = {
                "flownMonth": this.header.flownMonth,
                "includeSurcharge": (this.header.surcharge) ? 'Y' : 'N',
                "userId": this.header.username,
                "fullDataFlag": "",
                "drillLevel": drillLevel,
                "pageNumber": 0,
                "drillBar": drillBar,
                "routeCode": routeCode,
                "sector": sector,
                "flightNumber": flightNumber
            };  
        }


        if(drillType == 'target') {
            var drillLevel = (selFindLevel + 2);
            if (data.label) {
                this.drillBarLabel = data.label;
            }

            var routetype: string;
            routetype = (data.routetype) ? data.routetype : "";

            this.ionicLoadingShow();

            reqdata = {
                "flownMonth": this.header.flownMonth,
                "includeSurcharge": (this.header.surcharge) ? 'Y' : 'N',
                "userId": this.header.username,
                "fullDataFlag": "string",
                "drillLevel": drillLevel,
                "pageNumber": 0,
                "routetype": routetype
            };  
        }

        if(drillType == 'analysis') {
            var drillLevel = (selFindLevel + 2);
            
            var regionName;
            var countryFromTo;
            var ownOalFlag;
            var sectorFromTo;
            var flightNumber;

            if (drillLevel > 1) {
                console.log(data);
                regionName = (data.regionName) ? data.regionName : "";
                countryFromTo = (data.countryFrom && data.countryTo) ? data.countryFrom + '-' + data.countryTo : "";
                ownOalFlag = (data.ownOal) ? data.ownOal : "";
                sectorFromTo = (data.flownSector) ? data.flownSector : "";
                flightNumber = (data.flightNumber) ? data.flightNumber : "";
            }
            this.ionicLoadingShow();

            reqdata = {
                "flownMonth": this.header.flownMonth,
                "includeSurcharge": (this.header.surcharge) ? 'Y' : 'N',
                "userId": this.header.username,
                "fullDataFlag": "string",
                "drillLevel": drillLevel,
                "pageNumber": 0,
                "regionName": regionName,
                "countryFromTo": countryFromTo,
                "ownOalFlag": ownOalFlag,
                "sectorFromTo": sectorFromTo,
                "flightNumber": flightNumber,
                "flightDate": 0
            };  
        }
        if(drillType == 'passenger-count') {
            var drillLevel = (selFindLevel + 2);
            
            
            var toggle1 = (data.toggle1) ? data.toggle1 : "";
            var toggle2: any = (data.toggle2) ? data.toggle2 : "";
            var routeCode = (data.routeCode) ? data.routeCode : "";
            var sector  = (data.flownSector) ? data.flownSector : "";
            var flightNumber  = (data.flightNumber) ? data.flightNumber : "";

            this.ionicLoadingShow();console.log(data);

            reqdata = {
                "flownMonth": this.header.flownMonth,
                "includeSurcharge": (this.header.surcharge) ? 'Y' : 'N',
                "userId": this.header.username,
                "fullDataFlag": "string",
                "drillLevel": drillLevel,
                "pageNumber": 0,
                "toggle1": toggle1,
                "toggle2": toggle2,
                "routeCode": routeCode,
                "sector": sector,
                "flightNumber": flightNumber
            };  
        }

        if(drillType == 'network-Revenue') {
            var drillLevel = (selFindLevel + 2);
            
            if (data.label) {
                this.drillBarLabel = data.label;
            }
            console.log(data);
            var drillBar: string;
            drillBar = (data.label) ? data.label : "";
            var toggle1 = (data.toggle1) ? data.toggle1 : "";
            var POSCountry = (data.POScountry) ? data.POScountry : "";
            var POSRegion = (data.POSregion) ? data.POSregion : "";
            var POSCity = (data.POScity) ? data.POScity : "";
            var documentType = (data.documentType) ? data.documentType : "";
            var sector = (data.sector) ? data.sector : "";

            if (!drillBar) {
                drillBar = this.drillBarLabel;
                console.log(drillBar);
            }

            this.ionicLoadingShow();

            reqdata = {
                "flownMonth": this.header.flownMonth,
                "includeSurcharge": (this.header.surcharge) ? 'Y' : 'N',
                "userId": this.header.username,
                "fullDataFlag": "string",
                "drillLevel": drillLevel,
                "drillBar": drillBar,
                "pageNumber": 0,
                "toggle1": toggle1,
                "POSRegion": POSRegion,
                "POSCountry": POSCountry,
                "POSCity": POSCity,
                "documentType": documentType,
                "sector": sector
            };  
        }

        if(drillType == 'yield') {
            var drillLevel = (selFindLevel + 2);
            
            if (data.label) {
                this.drillBarLabel = data.label;
            }
            console.log(data);
            var drillBar: string;
            drillBar = (data.label) ? data.label : "";
            var toggle1 = (data.toggle1) ? data.toggle1 : "";
            var routeCode = (data.routeCode) ? data.routeCode : "";
            var sector = (data.flownSector) ? data.flownSector : "";
            var flightNumber = (data.flightNumber) ? data.flightNumber : "";

            if (!drillBar) {
                drillBar = this.drillBarLabel;
                console.log(drillBar);
            }

            this.ionicLoadingShow();

            reqdata = {
                "flownMonth": this.header.flownMonth,
                "includeSurcharge": (this.header.surcharge) ? 'Y' : 'N',
                "userId": this.header.username,
                "fullDataFlag": "string",
                "drillLevel": drillLevel,
                "drillBar": drillBar,
                "pageNumber": 0,
                "toggle1": toggle1,
                "routeCode": routeCode,
                "sector": sector,
                "flightNumber": flightNumber
            };  
        }

        if(drillType == 'rpkm') {
            var drillLevel = (selFindLevel + 2);
            
            if (data.label) {
                this.drillBarLabel = data.label;
            }
            console.log(data);
            var drillBar: string;
            drillBar = (data.label) ? data.label : "";
            var toggle1 = (data.toggle1) ? data.toggle1 : "";
            var aircrafttype = (data.aircrafttype) ? data.aircrafttype : "";
            var aircraftregno = (data.aircraftregno) ? data.aircraftregno : "";
            var aircraftleg = (data.aircraftleg) ? data.aircraftleg : "";

            if (!drillBar) {
                drillBar = this.drillBarLabel;
                console.log(drillBar);
            }

            this.ionicLoadingShow();

            reqdata = {
                "flownMonth": this.header.flownMonth,
                "includeSurcharge": (this.header.surcharge) ? 'Y' : 'N',
                "userId": this.header.username,
                "fullDataFlag": "string",
                "drillLevel": drillLevel,
                "drillBar": drillBar,
                "pageNumber": 0,
                "toggle1": toggle1,
                "aircrafttype": aircrafttype,
                "aircraftregno": aircraftregno,
                "aircraftleg": aircraftleg
            };  
        }

        if(drillType == 'askm') {
            var drillLevel = (selFindLevel + 2);
            
            if (data.label) {
                this.drillBarLabel = data.label;
            }
            console.log(data);
            var drillBar: string;
            drillBar = (data.label) ? data.label : "";
            var toggle1 = (data.toggle1) ? data.toggle1 : "";
            var aircrafttype = (data.aircrafttype) ? data.aircrafttype : "";
            var aircraftregno = (data.aircraftregno) ? data.aircraftregno : "";
            var aircraftleg = (data.aircraftleg) ? data.aircraftleg : "";

            if (!drillBar) {
                drillBar = this.drillBarLabel;
                console.log(drillBar);
            }

            this.ionicLoadingShow();

            reqdata = {
                "flownMonth": this.header.flownMonth,
                "includeSurcharge": (this.header.surcharge) ? 'Y' : 'N',
                "userId": this.header.username,
                "fullDataFlag": "string",
                "drillLevel": drillLevel,
                "drillBar": drillBar,
                "pageNumber": 0,
                "toggle1": toggle1,
                "aircrafttype": aircrafttype,
                "aircraftregno": aircraftregno,
                "aircraftleg": aircraftleg
            };  
        }

        if(drillType == 'oal-cont') {
            var drillLevel = (selFindLevel + 2);
            
            if (data.label) {
                this.drillBarLabel = data.label;
            }
            console.log(data);
            var drillBar: string;
            drillBar = (data.label) ? data.label : "";
            var toggle1 = (data.toggle1) ? data.toggle1 : "";
            var toggle2 = (data.toggle2) ? data.toggle2 : "";
            var carrierCode = (data.carrierCode) ? data.carrierCode : "";
            var sector = (data.sector) ? data.sector : "";
            var flightNumber = (data.flightNumber) ? data.flightNumber : "";
            var flightDate = (data.flightDate) ? data.flightDate : "";

            if (!drillBar) {
                drillBar = this.drillBarLabel;
                console.log(drillBar);
            }

            this.ionicLoadingShow();

            reqdata = {
                "flownMonth": this.header.flownMonth,
                "includeSurcharge": (this.header.surcharge) ? 'Y' : 'N',
                "userId": this.header.username,
                "fullDataFlag": "string",
                "drillLevel": drillLevel,
                "drillBar": drillBar,
                "pageNumber": 0,
                "toggle1": toggle1,
                "toggle2": toggle2,
                "carrierCode": carrierCode,
                "sector": sector,
                "flightNumber": flightNumber,
                "flightDate": flightDate
            };  
        }
        return reqdata;
    }
    getDrillDownURL (drilDownType) {
        var url
        switch(drilDownType){
            case 'bar':
                url = "/paxflnmis/mspaxnetrevdrill";
            break;
            case 'target':
                url = "/paxflnmis/tgtvsactdrill";
            break;
            case 'analysis':
                url = "/paxflnmis/netrevenueownoaldrill";
            break;
            case 'passenger-count':
                url = "/paxflnmis/mspaxcntctadrill";
            break;
            case 'network-Revenue':
                url = "/paxflnmis/msnetrevdrill";
            break;
            case 'yield':
                url = "/paxflnmis/mspaxnetylddrill";
            break;
            case 'rpkm':
                url = "/paxflnmis/mspaxrpkmrevdrill";
            break;
            case 'askm':
                url = "/paxflnmis/mspaxaskmrevdrill";
            break;
            case 'oal-cont':
                url = "/paxflnmis/oalcarrieranalysisdrill";
            break;
        }
        return url;
    }
    openBarDrillDown(data, selFindLevel) {
        selFindLevel = Number(selFindLevel);
        var that = this;
        this.selectedDrill[selFindLevel] = data;
        this.selectedDrill[selFindLevel + 1] = '';
        
        if (selFindLevel != (this.groups.length - 1)) {
            var drillLevel = (selFindLevel + 2);
            this.ionicLoadingShow();
            var reqdata = this.drillDownRequest(this.drillType, selFindLevel, data);
            var URL = this.getDrillDownURL(this.drillType);
            this.misService.getDrillDown(reqdata, URL)
                .then(function(data) {
                    that.ionicLoadingHide();
                    var data = data.response;
                    console.log(data);
                    var findLevel = drillLevel - 1;

                    if (data.status == 'success') {
                        if(that.drillType == 'oal-cont'){
                            if(that.toggle.sectorRevOrPax == "paxcount"){
                                that.groups[findLevel].items[0] = data.data.paxcountrows;
                                that.groups[findLevel].orgItems[0] = data.data.paxcountrows;
                            }else{
                                that.groups[findLevel].items[0] = data.data.revenuerows;
                                that.groups[findLevel].orgItems[0] = data.data.revenuerows;    
                            }
                            
                        }else{
                            that.groups[findLevel].items[0] = data.data.rows;
                            that.groups[findLevel].orgItems[0] = data.data.rows;    
                        }
                        
                        that.shownGroup = findLevel;
                        that.sort('paxCount', findLevel, false);
                        that.clearDrill(drillLevel);
                    } else {
                        that.shownGroup = findLevel;
                        that.clearDrill(findLevel);
                    }
                }, function(error) {
                    that.ionicLoadingHide();
                    that.closesPopover();
                    console.log(error);
                    alert('Server Error');
                });
        }
    }
    initiateArray(drilltabs) {
        this.groups = [];
        for (var i in drilltabs) {
            this.groups[i] = {
                id: i,
                name: this.drilltabs[i],
                items: [],
                orgItems: [],
                ItemsByPage: [],
                firstColumns: this.firstColumns[i]
            };
        }
    }
    openBarDrillDownPopover($event, selData, selFindLevel) {
        this.drillName = 'METRIC SNAPSHOT REPORT - ' + selData.point.label;
        this.drillType = 'bar';
        this.groups = [];
        this.drilltabs = ['Route Level', 'Sector Level', 'Data Level', 'Flight Level'];
        this.firstColumns = ['routeCode', 'flownSector', 'flightNumber', 'flightDate'];
        this.initiateArray(this.drilltabs);
        var that = this;
        this.$timeout(function() {
          that.drillBarpopover.show($event);
        }, 50);
        this.openBarDrillDown(selData.point, selFindLevel);
    };

    openRPKMDrillDownPopover($event, selData, selFindLevel) {
        this.drillName = 'RPKM';
        this.drillType = 'rpkm';
        this.groups = [];
        this.drilltabs = ['RPKM at Aircraft Type Level', 'RPKM at Aircraft  Registration Number Level', 'RPKM at Aircraft Leg Level', 'RPKM at Flight Number and Date Level'];
        this.firstColumns = ['aircrafttype', 'aircraftregno', 'aircraftleg', 'flightNumber'];
        this.initiateArray(this.drilltabs);
        var that = this;
        this.$timeout(function() {
          that.drillBarpopover.show($event);
        }, 50);
        this.openBarDrillDown(selData.point, selFindLevel);
    }
    openASKMDrillDownPopover($event, selData, selFindLevel) {
        this.drillName = 'ASKM';
        this.drillType = 'askm';
        this.groups = [];
        this.drilltabs = ['ASKM at Aircraft Type Level', 'ASKM at Aircraft  Registration Number Level', 'ASKM at Aircraft Leg Level', 'ASKM at Flight Number and Date Level'];
        this.firstColumns = ['aircrafttype', 'aircraftregno', 'aircraftleg', 'flightNumber'];
        this.initiateArray(this.drilltabs);
        var that = this;
        this.$timeout(function() {
          that.drillBarpopover.show($event);
        }, 50);
        this.openBarDrillDown(selData.point, selFindLevel);
    }
    openOALContDrillDownPopover($event, selData, selFindLevel) {
        this.drillName = 'Top 5 OAL Contribution';
        this.drillType = 'oal-cont';
        this.groups = [];
        if(this.toggle.sectorRevOrPax == "paxcount") { 
            this.drilltabs = ['Pax Count at Sector Level - From Carrier EK', 'Pax Count at Flight Number Level - From Carrier EK', 'Pax Count at Flight Date Level - From Carrier EK', 'Pax Count at Document type Level - From Carrier EK'];
        } else {
            this.drilltabs = ['Revenue at Sector Level', 'Revenue at Flight Number Level - From Carrier EK', 'Revenue at Flight Date Level - From Carrier EK', 'Revenue at Doctype Level - From Carrier EK'];            
        }
        this.firstColumns = ['sector', 'flightNumber', 'flightDate', 'documentType'];
        this.initiateArray(this.drilltabs);
        var that = this;
        this.$timeout(function() {
          that.drillBarpopover.show($event);
        }, 50);
        this.openBarDrillDown(selData.point, selFindLevel);
    }
    openYieldDrillDownPopover($event, selData, selFindLevel) {
        this.drillName = 'Yield';
        this.drillType = 'yield';
        this.groups = [];
        this.drilltabs = ['Yield at Route Level', 'Yield at Sector Level', 'Yield at Flight Level', 'Yield at Flight Date Level'];
        this.firstColumns = ['routeCode', 'flownSector', 'flightNumber', 'flightDate'];
        this.initiateArray(this.drilltabs);
        var that = this;
        this.$timeout(function() {
          that.drillBarpopover.show($event);
        }, 50);
        this.openBarDrillDown(selData.point, selFindLevel);
    };
    openNetworkRevenueDrillDownPopover($event, selData, selFindLevel) {
        this.drillName = 'Network Revenue';
        this.drillType = 'network-Revenue';
        this.groups = [];
        this.drilltabs = ['Network Revenue at Region POS Level', 'Network Revenue by Country of POS', 'Network Revenue by City of POS', 'Network Revenue by Document Type', 'Network Revenue by Sector','Network Revenue by Flight Number'];
        this.firstColumns = ['POSregion', 'POScountry', 'POScity', 'documentType', 'sector', 'flightnumber'];
        this.initiateArray(this.drilltabs);
        var that = this;
        this.$timeout(function() {
          that.drillBarpopover.show($event);
        }, 50);
        this.openBarDrillDown(selData.point, selFindLevel);
    };
    openTargetDrillDownPopover($event, selData, selFindLevel) {
        this.drillName = 'Target Vs Actual';
        this.drillType = 'target';
        this.groups = [];
        this.drilltabs = ['Route Type', 'Route code'];
        this.firstColumns = ['routetype', 'routecode'];
        this.initiateArray(this.drilltabs);
        var that = this;
        this.$timeout(function() {
          that.drillBarpopover.show($event);
        }, 50);
        this.openBarDrillDown(selData.point, selFindLevel);
    };

    openRevenueDrillDownPopover($event, selData, selFindLevel) {
        console.log(selData);
        this.drillName = 'Net Revenue by OWN and OAL';
        this.drillType = 'analysis';
        this.groups = [];
        this.drilltabs = ['Country Level', 'Sector Level', 'Flight Level', 'Document Level'];
        this.firstColumns = ['countryFrom', 'flownSector', 'flightNumber', 'netRevenue'];
        this.initiateArray(this.drilltabs);
        this.drillBarpopover.show($event);
        this.openBarDrillDown(selData.point, selFindLevel);
    };

    openRevenuePassengerDrillDownPopover($event, selData, selFindLevel) {
        console.log(selData);
        this.drillName = 'Passenger Count by Class of Travel';
        this.drillType = 'passenger-count';
        this.groups = [];
        this.drilltabs = ['Pax Count at Route Level', 'Pax Count at Sector Level', 'Pax Count at Flight Number Level', 'Pax Count at Flight Date Level'];
        this.firstColumns = ['routeCode', 'flownSector', 'flightNumber', 'flightDate'];
        this.initiateArray(this.drilltabs);
        this.drillBarpopover.show($event);
        this.openBarDrillDown(selData.point, selFindLevel);
    };

    openPopover ($event, index, charttype) {
        var that = this;
        $event.preventDefault();
        this.chartType = charttype;
        this.graphIndex = index;
        this.$ionicPopover.fromTemplateUrl('components/mis/graph-popover.html', {
            scope: that.$scope
        }).then(function(popover) {
            that.popovershown = true;
            that.graphpopover = popover;
            that.graphpopover.show($event);
        });
    }

    openSectorPopover ($event,index,charttype) {
        var that = this;
        this.chartType = charttype;
        this.graphIndex = index;
        this.$ionicPopover.fromTemplateUrl('components/mis/sector-graph-popover.html', {
            scope: that.$scope
        }).then(function(popover) {
            that.popovershown = true;
            that.graphpopover = popover;
            that.graphpopover.show($event);
        });
    }

    callSectorCarrierAnalysis () {
        var that = this;
        var reqdata = {
            flownMonth: this.header.flownMonth,
            includeSurcharge: (this.header.surcharge) ? 'Y':'N',
            userId: this.header.username,
            toggle1: '',
            toggle2: '',
            fullDataFlag: 'N'
        };

        this.ionicLoadingShow();

        this.misService.getSectorCarrierAnalysis(reqdata)
        .then(function(data) {
            if (data.response.status === "success") {
                // fav Items to display in dashboard
                var jsonObj = data.response.data;
                _.forEach(jsonObj.SectorCarrierAnalysisCharts, function(val: any, i: number) {
                    val['others'] = val.items.splice(-1, 1);
                });
                var sortedData = _.sortBy(jsonObj.SectorCarrierAnalysisCharts, function(u: any) {
                    if (u) return [u.favoriteChartPosition];
                });
                var favSectorCarrierResult = _.filter(sortedData, function(u: any) {
                    if (u) return u.favoriteInd == 'Y';
                });

                that.SectorCarrierAnalysisCharts = jsonObj.SectorCarrierAnalysisCharts;
                that.ionicLoadingHide();
            }
            else {
                that.ionicLoadingHide();
                that.$ionicPopup.alert({
                    title: 'Error',
                    content: 'No Data Found For SectorCarrierAnalysis!!!'
                }).then(function(res) {
                    console.log('done');
                });
            }
        }, function(error) {
            that.ionicLoadingHide();
            console.log('Error ');
        });
    }

    targetActualFilter(that: MisController) {
        return function(item: any){
            return item.toggle1 == that.toggle.targetRevOrPax;
        }
    }

    sectorCarrierFilter(that: MisController) {
       that = this.that;
       return function(item: any) {
            return item.toggle1 == that.toggle.sectorOrder && item.toggle2 == that.toggle.sectorRevOrPax; 
      }
     
    }

    revenueAnalysisFilter(item: any) {
        var surchargeFlag = (this.header.surcharge) ? "Y" : "N";
        // console.log(surchargeFlag+' : '+item);
        if( item.surchargeFlag == surchargeFlag) {
            return true; 
        }
        return false;
    }

    getFlownFavorites() {
        this.callMetricSnapshot();
        this.callTargetVsActual();
        this.callRevenueAnalysis();
    }

    ionicLoadingShow() {
        this.$ionicLoading.show({
            template: '<ion-spinner class="spinner-calm"></ion-spinner>'
        });
    };

    ionicLoadingHide() {
        this.$ionicLoading.hide();
    };

    openDrillDownPopover($event,regionData,selFindLevel) {
        this.drillType = 'route';
        this.groups = [];
        this.drilltabs = ['Country Level', 'Sector Level', 'Flight Level', 'Document Level'];
        this.firstColumns = ['countryFrom','flownSector', 'flightNumber', 'document#'];
        this.initiateArray(this.drilltabs);
        this.drillpopover.show($event);
        this.openDrillDown(regionData,selFindLevel);
    };

    closesPopover() {
        this.drillpopover.hide();
    };

    isDrillRowSelected(level,obj) {
        return this.selectedDrill[level] == obj;
    }
    searchResults (level,obj) {
        this.groups[level].items[0] = this.filteredListService.searched(this.groups[level].orgItems[0], obj.searchText, level, this.drillType);
        if (obj.searchText == '') {
            this.resetAll(level); 
            this.groups[level].items[0] = this.groups[level].orgItems[0];
        }
        this.currentPage[level] = 0;
        this.pagination(level); 
    }
    pagination (level) {
        this.groups[level].ItemsByPage = this.filteredListService.paged(this.groups[level].items[0], this.pageSize );
    };

    setPage (level, pageno) {
        this.currentPage[level] = pageno;
    };
    lastPage(level) {
        this.currentPage[level] = this.groups[level].ItemsByPage.length - 1;
    };
    resetAll(level) {
        this.currentPage[level] = 0;
    }
    sort(sortBy,level,order) {
        this.resetAll(level);
        this.columnToOrder = sortBy; 
        //$Filter - Standard Service
        this.groups[level].items[0] = this.$filter('orderBy')(this.groups[level].items[0], this.columnToOrder, order); 
        this.pagination(level);    
    };
    range(total, level) {
        var ret = [];
        var start: number;
        start = 0;
        if(total > 5) {
            start = Number(this.currentPage[level]) - 2;
        }
        if(start < 0) {
          start = 0;
        }
        var k = 1;
        for (var i = start; i < total; i++) {
          ret.push(i);
          k++;
          if (k > 6) {
            break;
          }
        }
        return ret;
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
    toggleChartOrTableView(val: string) {
        this.toggle.chartOrTable = val;
        this.onSlideMove({ index: this.header.tabIndex });
    }
    toggleTargetView(val: string) {
        this.toggle.targetView = val;
        this.onSlideMove({ index: this.header.tabIndex });
    }
    toggleRevenueView(val: string) {
        this.toggle.revenueView = val;
        this.onSlideMove({ index: this.header.tabIndex });
    }
    toggleSectorView(val: string) {
        this.toggle.sectorView = val;
        this.onSlideMove({ index: this.header.tabIndex });
    }
	runReport(chartTitle: string,monthOrYear: string,flownMonth: string){
		var that = this;
		//if no cordova, then running in browser and need to use dataURL and iframe
		if (!window.cordova) {
			that.ionicLoadingShow();
			this.reportSvc.runReportDataURL(chartTitle,monthOrYear,flownMonth,that.header.tabIndex)
				.then(function(dataURL) {
					that.ionicLoadingHide();
					//set the iframe source to the dataURL created
					//console.log(dataURL);
					//document.getElementById('pdfImage').src = dataURL;
					window.open(dataURL,"_system");
				}, function(error) {
					that.ionicLoadingHide();
					console.log('Error ');
				});
			return true;
		}
		//if codrova, then running in device/emulator and able to save file and open w/ InAppBrowser
		else {
			that.ionicLoadingShow();
			this.reportSvc.runReportAsync(chartTitle,monthOrYear,flownMonth,that.header.tabIndex)
				.then(function(filePath) {
					that.ionicLoadingHide();
					//log the file location for debugging and oopen with inappbrowser
					console.log('report run on device using File plugin');
					console.log('ReportCtrl: Opening PDF File (' + filePath + ')');
					var lastPart = filePath.split("/").pop();
					var fileName = "/mnt/sdcard/"+lastPart;					
					if(device.platform !="Android")
					fileName = filePath;
					//window.openPDF(fileName);
					//else
					//window.open(filePath, '_blank', 'location=no,closebuttoncaption=Close,enableViewportScale=yes');*/
										
					cordova.plugins.fileOpener2.open(
						fileName, 
						'application/pdf', 
						{ 
							error : function(e) { 
								console.log('Error status: ' + e.status + ' - Error message: ' + e.message);
							},
							success : function () {
								console.log('file opened successfully');                
							}
						}
					);
				}, function(error) {
					that.ionicLoadingHide();
					console.log('Error ');
				});
			return true;
		}
	}
	
}