/// <reference path="../../_libs.ts" />
/// <reference path="../../components/mis/services/MisService.ts" />
/// <reference path="../../components/mis/services/FilteredListService.ts" />
/// <reference path="../../components/mis/services/ChartoptionService.ts" />



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
    chartOrTable: string
}

interface headerObject {
    flownMonth: string,
    surcharge: boolean,
    tabIndex: number,
    headerIndex: number,
    username: string
}

class MisController{

    public static $inject = ['$scope', '$ionicLoading', '$timeout', '$window', '$ionicPopover', '$filter', 'MisService', 'ChartoptionService', 'FilteredListService', 'ReportSvc'];

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
    private charttype: string;
    private graphindex: number;
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

    private that: any;

    constructor(private $scope: ng.IScope, private $ionicLoading: Ionic.ILoading, private $timeout: ng.ITimeoutService, private $window: ng.IWindowService,
        private $ionicPopover: Ionic.IPopover, private $filter: ng.IFilterService, private misService: MisService, private chartoptionService: ChartoptionService,
        private filteredListService: FilteredListService, private reportSvc: ReportSvc) {

        this.that = this;

        this.tabs = [
        { title: 'My Dashboard', names: 'MyDashboard', icon : 'iconon-home' },
        { title: 'Metric Snapshot', names: 'MetricSnapshot', icon : 'ion-home' },
        { title: 'Target Vs Actual', names: 'TargetVsActual', icon : 'ion-home' },
        { title: 'Revenue Analysis', names: 'RevenueAnalysis', icon : 'ion-home'},
        { title: 'Sector & Carrier Analysis', names: 'SectorAndCarrierAnalysis', icon : 'ion-home' },
        { title: 'Route Revenue', names: 'RouteRevenue', icon : 'ion-home' }
        ];

        this.toggle = {
            monthOrYear : 'month',
            targetRevOrPax: 'revenue',
            sectorOrder: 'top5',
            sectorRevOrPax: 'revenue',
			chartOrTable: 'chart'
        }
                

        this.header = {
            flownMonth: '',
            surcharge : false,
            tabIndex: 0,
            headerIndex: 0,
            username: ''
        };

        /*
        angular.element(window).bind('orientationchange', function (e, scope) {
            this.onSlideMove({index: this.header.tabIndex});
        }); */
        angular.element(window).bind('orientationchange', this.orientationChange); 
        this.$scope.$on('onSlideMove', (event: any, response: any) => {
            this.$scope.MisCtrl.onSlideMove(response);
        });

        //this.$scope.$watch('MisCtrl.header.surcharge', () => { this.onSlideMove({index:this.header.tabIndex}); }, true);
        this.initData();
        
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
            targetBarChart: this.chartoptionService.targetBarChartOptions(),
            passengerChart: this.chartoptionService.multiBarChartOptions()
        };
        

        this.misService.getPaxFlownMisHeader({userId: 'Victor'}).then(
                (data) => {
                    that.subHeader = data.response.data;
                    that.header.flownMonth = that.subHeader.paxFlownMisMonths[0].flowMonth;
                },
                (error) => {
                    console.log('an error occured');
                });  
        this.onSlideMove({index: 0});
    }
    orientationChange = (): boolean => {
        this.onSlideMove({ index: this.header.tabIndex });
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
        console.log('hello');
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

            // fav Items to display in dashboard
            that.metricResult  = _.sortBy(data.response.data.metricSnapshotCharts, function(u: any) {
                if (u) return [u.favoriteChartPosition]; 
            });

            _.forEach(that.metricResult, function (n: any, value: any) {
                n.values[0].color = '#4A90E2';
                n.values[1].color = '#50E3C2';
                if(n.values[2]) n.values[2].color = '#B8E986';
            });

            that.favMetricResult = _.filter(that.metricResult, function(u: any) {
                if(u) return u.favoriteInd == 'Y';
            });
            that.metricLegends = data.response.data.legends;
            if(that.header.tabIndex == 0) {
                that.metricResult = that.favMetricResult;
            }
            that.ionicLoadingHide();
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
            // fav Items to display in dashboard
            that.favTargetLineResult = _.filter(data.response.data.lineCharts, function(u: any) { 
                if(u) return u.favoriteInd == 'Y';
            });
            that.favTargetBarResult = _.filter(data.response.data.verBarCharts, function(u: any) { 
                if(u) return u.favoriteInd == 'Y';
            });
            _.forEach(data.response.data.verBarCharts, function (n: any, value: any) {
                n.values[0].color = '#4A90E2';
                n.values[1].color = '#50E3C2';
            });
            var lineColors = [{"color": "#4A90E2", "classed": "dashed","strokeWidth": 2},
            {"color": "#50E3C2"},{"color": "#B8E986", "area" : true, "disabled": true}];

            _.forEach(data.response.data.lineCharts, function (n: any, value: any) {
                _.merge(n.lineChartItems, lineColors);
            });

            console.log(data.response.data.lineCharts);

            that.targetActualData = {
                horBarChart: data.response.data.verBarCharts,
                lineChart: data.response.data.lineCharts
            };

            that.ionicLoadingHide();
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
            that.routeRevData = data.response.data;
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

            var barColors = ['#4A90E2', '#50E3C2'];
            _.merge(jsonObj.multibarCharts[1], barColors);
            _.forEach(jsonObj.multibarCharts, function(n: any, value: any) {
                n.color = barColors[value];
            });

            var pieColors = [{"color": "#28b6f6"},{"color": "#7bd4fc"},{"color": "#C6E5FA"}];
            _.forEach(jsonObj.pieCharts[0].data, function (n: any, value: any) {
                n.label = n.xval;
                n.value = n.yval;
            });

            _.merge(jsonObj.pieCharts[0].data, pieColors);

            that.revenueData = {
                revenuePieChart : jsonObj.pieCharts[0],
                revenueBarChart : jsonObj.multibarCharts[1].multibarChartItems,
                revenueHorBarChart : jsonObj.multibarCharts[2].multibarChartItems
            }

            that.ionicLoadingHide();
        }, function(error) {
            this.ionicLoadingHide();
            console.log('Error ');
        });
    }

    openDrillDown(regionData,selFindLevel) {
        var that = this;
        this.selectedDrill[selFindLevel] = regionData;
        this.selectedDrill[selFindLevel + 1] = '';
        if(selFindLevel != '3') {
            var drillLevel = (selFindLevel + 2);
            this.regionName = (regionData.regionName) ? regionData.regionName : regionData.cahrtName;
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
        for (var i = level; i <= 3; i++) {
            this.groups[i].items.splice(0, 1);
            this.groups[i].orgItems.splice(0, 1);
            this.sort('paxCount',i,false);
        }
    }

    openBarDrillDown(data, selFindLevel) {
        selFindLevel = Number(selFindLevel);
        var that = this;
        this.selectedDrill[selFindLevel] = data;
        this.selectedDrill[selFindLevel + 1] = '';
        if (selFindLevel != '3') {
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

            var reqdata = {
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

            this.misService.getBarDrillDown(reqdata)
                .then(function(data) {
                    that.ionicLoadingHide();
                    var data = data.response;
                    console.log(data);
                    var findLevel = drillLevel - 1;
                    console.log(data.status);
                    if (data.status == 'success') {
                        that.groups[findLevel].items[0] = data.data.rows;
                        that.groups[findLevel].orgItems[0] = data.data.rows;
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
        for (var i in drilltabs) {
            this.groups[i] = {
                id: i,
                name: this.drilltabs[i],
                items: [],
                orgItems: [],
                ItemsByPage: []
            };
        }
    }
    openBarDrillDownPopover($event, selData, selFindLevel) {
        this.drillType = 'bar';
        this.drillBarpopover.show($event);
        this.drilltabs = ['Route Level', 'Sector Level', 'Data Level', 'Flight Level'];
        this.initiateArray(this.drilltabs);
        this.openBarDrillDown(selData.point, selFindLevel);
    };


    openPopover ($event, index, charttype) {
        var that = this;
        $event.preventDefault();
        this.charttype = charttype;
        this.graphindex = index;
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
        this.charttype = charttype;
        this.graphindex = index;
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
            // fav Items to display in dashboard
            var jsonObj = data.response.data;
            _.forEach(jsonObj.SectorCarrierAnalysisCharts, function(val: any, i: number){
                val['others'] = val.items.splice(-1, 1);
            });
            var sortedData = _.sortBy(jsonObj.SectorCarrierAnalysisCharts, function(u: any) { 
                if (u) return [u.favoriteChartPosition]; 
            });
            var favSectorCarrierResult = _.filter(sortedData, function(u: any) { 
                if(u) return u.favoriteInd == 'Y';
            });

            that.SectorCarrierAnalysisCharts = jsonObj.SectorCarrierAnalysisCharts;
            that.ionicLoadingHide();
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
        this.drillpopover.show($event);
        this.drilltabs = ['Country Level', 'Sector Level', 'Flight Level', 'Document Level'];
        this.initiateArray(this.drilltabs);
        this.openDrillDown(regionData,selFindLevel);
    };

    closesPopover() {
        this.drillpopover.hide();
    };

    isDrillRowSelected(level,obj) {
        return this.selectedDrill[level] == obj;
    }
    searchResults (level,obj) {
        this.groups[level].items[0] = this.filteredListService.searched(this.groups[level].orgItems[0], obj.searchText, level);
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

    setPage (level) {
        this.currentPage[level] = this.n;
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
    range(input, total) {
        var ret = [];
        if (!total) {
            total = input;
            input = 0;
        }
        for (var i = input; i < total; i++) {
            ret.push(i);
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
        this.toggle.chartOrTable = 'chart';
    }
	runReport(chartTitle: string,monthOrYear: string,flownMonth: string){
		//if no cordova, then running in browser and need to use dataURL and iframe
		if (!window.cordova) {
			this.reportSvc.runReportDataURL(chartTitle,monthOrYear,flownMonth)
				.then(function(dataURL) {
					//set the iframe source to the dataURL created
					//console.log(dataURL);
					//document.getElementById('pdfImage').src = dataURL;
				});
			return true;
		}
		//if codrova, then running in device/emulator and able to save file and open w/ InAppBrowser
		else {
			this.reportSvc.runReportAsync(chartTitle,monthOrYear,flownMonth)
				.then(function(filePath) {
					//log the file location for debugging and oopen with inappbrowser
					console.log('report run on device using File plugin');
					console.log('ReportCtrl: Opening PDF File (' + filePath + ')');
					var fileName = "/mnt/sdcard/"+chartTitle+".pdf";
					if(device.platform =="Android")
					window.openPDF(fileName);
					else
					window.open(filePath, '_blank', 'location=no,closebuttoncaption=Close,enableViewportScale=yes');
				});
			return true;
		}
	}
	
}