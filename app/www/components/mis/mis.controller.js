(function () {
    'use strict';
    angular.module('rapidMobile').controller('MisController', ['$scope', 
                                                         'MisService', 'ChartOptions',
                                                         '$ionicLoading', '$timeout', '$window',
                                                         '$ionicPopover', 'FilteredListService', 
                                                         '$filter', 'LoginService',
                                                          MisController]);

    function MisController($scope, MisService, ChartOptions,
                          $ionicLoading, $timeout, $window,
                          $ionicPopover, FilteredListService, 
                          $filter, LoginService) {

        $scope.tabs=[{
             title: 'My Dashboard',             
             names: 'MyDashboard',
             icon : 'iconon-home'
           },
           {
             title: 'Metric Snapshot',             
             names: 'MetricSnapshot',
             icon : 'ion-home'
           },
           {
             title: 'Target Vs Actual',             
             names: 'TargetVsActual',
             icon : 'ion-home'
           },
           {
             title: 'Revenue Analysis',
             names: 'RevenueAnalysis',
             icon : 'ion-home'
           },
           {
             title: 'Sector & Carrier Analysis',             
             names: 'SectorAndCarrierAnalysis',
             icon : 'ion-home'
           },
           {
             title: 'Route Revenue',             
             names: 'RouteRevenue',
             icon : 'ion-home'
           }
        ];
        $scope.toggle = {
            monthOrYear : 'month',
            targetRevOrPax: 'revenue',
            sectorOrder: 'top5',
            sectorRevOrPax: 'revenue'
        }
        $scope.options = {
            metric: ChartOptions.metricBarChart.options(),
            targetLineChart: ChartOptions.lineChart.options(),
            targetBarChart: ChartOptions.targetBarChart.options(),
            passengerChart: ChartOptions.passengerCountChart.options()
        };
        $scope.header = {
                flownMonth: '',
                surcharge : false,
                tabIndex: 0,
                headerIndex: 0,
                username: LoginService.getUser().username
            };
        MisService.getPaxFlownMisHeader({userId: $scope.header.username})
        .then(function(data) {
            $scope.subHeader = data.response.data;
            console.log($scope.subHeader);
            $scope.header.flownMonth = $scope.subHeader.paxFlownMisMonths[0].flowMonth;
        }, function(error) {
            console.log('Error ');
        });
        $scope.$watchCollection('[header.flownMonth, header.surcharge]', function(newVal, oldVal){
            $scope.onSlideMove({index: $scope.header.tabIndex});
        });
        $scope.updateHeader = function(){
            $scope.header.headerIndex = _.findIndex($scope.subHeader.paxFlownMisMonths, function(chr) {
                return chr.flowMonth == $scope.header.flownMonth;
            });
        }
        $scope.onSlideMove = function(data){
            $scope.header.tabIndex = data.index;            
            switch($scope.header.tabIndex){
                case 0:
                    $scope.getFlownFavorites();
                    break;
                case 1:                   
                    $scope.callMetricSnapshot();
                    break;
                case 2:                    
                    $scope.callTargetVsActual();
                    break;
                case 3:              
                    $scope.callRevenueAnalysis();
                    break;
                case 4:
                    $scope.callSectorCarrierAnalysis();
                    break;
                case 5:
                    $scope.callRouteRevenue();
                    break;
            }
        };
        $scope.toggleMetric = function(val) {
            $scope.toggle.monthOrYear = val;
            $scope.onSlideMove({index: $scope.header.tabIndex});
        }
        $scope.toggleTarget = function(val){
            $scope.toggle.targetRevOrPax = val;
        }
        $scope.toggleSector = function(val){
            $scope.toggle.sectorRevOrPax = val;
        }
        $scope.callMetricSnapshot = function() {
            var reqdata = {
                flownMonth: $scope.header.flownMonth,
                includeSurcharge: ($scope.header.surcharge) ? 'Y':'N',
                userId: $scope.header.username,
                toggle1: $scope.toggle.monthOrYear,
                fullDataFlag: 'N'
            };
            $scope.ionicLoadingShow();
            MisService.getMetricSnapshot(reqdata)
            .then(function(data) {
                // fav Items to display in dashboard
                $scope.metricResult  = _.sortBy(data.response.data.MetricSnapshotCharts, function(u) {
                                    if (u) return [u.favoriteChartPosition]; 
                                 });
                _.forEach($scope.metricResult, function (n, value) {
                    n.values[0].color = '#4A90E2';
                    n.values[1].color = '#50E3C2';
                    if(n.values[2]) n.values[2].color = '#B8E986';
                });
                $scope.favMetricResult = _.filter($scope.metricResult, function(u) {
                                        if(u) return u.favoriteInd == 'Y';
                                    });
                $scope.metricLegends = data.response.data.legends;
                
                if($scope.header.tabIndex == 0)
                    $scope.metricResult = $scope.favMetricResult;
                $scope.ionicLoadingHide();
            }, function(error) {

            });
        }
        $scope.callTargetVsActual = function() {
            var reqdata = {
                flownMonth: $scope.header.flownMonth,
                includeSurcharge: ($scope.header.surcharge) ? 'Y':'N',
                userId: $scope.header.username,
                toggle1: 'string',
                fullDataFlag: 'string'
            };
            $scope.ionicLoadingShow();
            MisService.getTargetVsActual(reqdata)
            .then(function(data) {
                // fav Items to display in dashboard
                $scope.favTargetLineResult = _.filter(data.response.data.lineCharts, function(u) { 
                                            if(u) return u.favoriteInd == 'Y';
                                        });
                $scope.favTargetBarResult = _.filter(data.response.data.verBarCharts, function(u) { 
                                            if(u) return u.favoriteInd == 'Y';
                                        });
                _.forEach(data.response.data.verBarCharts, function (n, value) {
                    n.values[0].color = '#4A90E2';
                    n.values[1].color = '#50E3C2';
                });
                $scope.targetActualData = {
                    horBarChart: data.response.data.verBarCharts,
                    lineChart: data.response.data.lineCharts
                };
                $scope.ionicLoadingHide();
            }, function(error) {
                console.log('Error ');
                $scope.ionicLoadingHide();
            });
        }
        $scope.callRouteRevenue = function() {
            var routeRevRequest = {
                flownMonth: $scope.header.flownMonth,
                includeSurcharge: ($scope.header.surcharge) ? 'Y':'N',
                userId: $scope.header.username
            };
            MisService.getRouteRevenue(routeRevRequest)
            .then(function(data) {
                $scope.routeRevData = data.response.data;
            }, function(error) {
                console.log('Error ');
            });
        }
        $scope.callRevenueAnalysis = function() {
            var reqdata = {
                flownMonth: $scope.header.flownMonth,
                includeSurcharge: ($scope.header.surcharge) ? 'Y':'N',
                userId: $scope.header.username,
                toggle1: '',
                fullDataFlag: 'N'
            };
            $scope.ionicLoadingShow();
            MisService.getRevenueAnalysis(reqdata)
            .then(function(data) {
                // fav Items to display in dashboard
                var jsonObj = data.response.data;
                var sortedData = _.sortBy(jsonObj.multibarCharts, function(u) { 
                                    if (u) return [u.favoriteChartPosition]; 
                                });
                var favRevenueBarResult = _.filter(sortedData, function(u) { 
                                            if(u) return u.favoriteInd == 'Y';
                                        });

                var sortedData = _.sortBy(jsonObj.pieCharts, function(u) { 
                                    if (u) return [u.favoriteChartPosition]; 
                                });
                var favRevenuePieResult = _.filter(sortedData, function(u) { 
                                            if(u) return u.favoriteInd == 'Y';
                                        });  
                
                _.forEach(jsonObj.multibarCharts, function (n, value) {
                    n.multibarChartItems[0].color = '#4A90E2';
                    n.multibarChartItems[1].color = '#50E3C2';
                });
                var pieColors = [{"color": "#28b6f6"},{"color": "#7bd4fc"},{"color": "#C6E5FA"}];
                _.forEach(jsonObj.pieCharts[0].data, function (n, value) {
                    n.label = n.xval;
                    n.value = n.yval;
                });
                _.merge(jsonObj.pieCharts[0].data, pieColors);                
                $scope.revenueData = {
                    revenuePieChart : jsonObj.pieCharts[0].data,
                    revenueBarChart : jsonObj.multibarCharts[1].multibarChartItems,
                    revenueHorBarChart : jsonObj.multibarCharts[2].multibarChartItems
                }
                $scope.ionicLoadingHide();               
            }, function(error) {
                $scope.ionicLoadingHide();
                console.log('Error ');
            });
        }
        $scope.openDrillDown = function(regionData,selFindLevel) {  
            if(selFindLevel != '3') {
                $scope.regionName = (regionData.regionName) ? regionData.regionName : regionData.heading1;
                var countryFromTo = (regionData.countryFrom && regionData.countryTo) ? regionData.countryFrom + '-' + regionData.countryTo : "Canada-Indonesia";
                var drillLevel = (selFindLevel + 2);
                var reqdata = {
                    "flownMonth": $scope.header.flownMonth,
                    "includeSurcharge": ($scope.header.surcharge) ? 'Y':'N',
                    "userId": $scope.header.username,
                    "fullDataFlag": "string",
                    "drillLevel": drillLevel,
                    "pageNumber": 0,
                    "regionName": ($scope.regionName)? $scope.regionName : "North America",
                    "countryFromTo": countryFromTo,
                    "sectorFromTo": "YYC-CGK",
                    "flightNumber": "511",
                    "flightDate": 0
                };
                
                MisService.getRouteRevenueDrillDown(reqdata)
                 .then(function(data) {
                    var data = data.response;
                    console.log(data);
                    var findLevel = data.data.drillLevel - 1;
                    $scope.groups[findLevel].items.push(data.data.rows);
                    $scope.groups[findLevel].orgItems.push(data.data.rows);
                    $scope.shownGroup = findLevel;
                    $scope.sort('paxCount',findLevel,false);
                },function(error){
                    console.log("drillLevel",error);
                }); 
            } 
        }
        $scope.callSectorCarrierAnalysis = function() {
            var reqdata = {
                flownMonth: $scope.header.flownMonth,
                includeSurcharge: ($scope.header.surcharge) ? 'Y':'N',
                userId: $scope.header.username,
                toggle1: 'string',
                toggle2: 'string',
                fullDataFlag: 'N'
            };            
            $scope.ionicLoadingShow();
            MisService.getSectorCarrierAnalysis(reqdata)
            .then(function(data) {
                // fav Items to display in dashboard
                var jsonObj = data.response.data;
                _.forEach(jsonObj.SectorCarrierAnalysisCharts, function(val, i){
                    val['others'] = val.items.splice(-1, 1);
                });
                var sortedData = _.sortBy(jsonObj.SectorCarrierAnalysisCharts, function(u) { 
                                    if (u) return [u.favoriteChartPosition]; 
                                });
                var favSectorCarrierResult = _.filter(sortedData, function(u) { 
                                                if(u) return u.favoriteInd == 'Y';
                                            });                
                $scope.SectorCarrierAnalysisCharts = jsonObj.SectorCarrierAnalysisCharts;
                $scope.ionicLoadingHide();
            }, function(error) {
                $scope.ionicLoadingHide();
                console.log('Error ');
            });
        }
        $scope.targetActualFilter = function(item) {
            if( item.toggle1 == $scope.toggle.targetRevOrPax ) {
                return true; 
            }
            return false;
        }
        $scope.sectorCarrierFilter = function(item) {
            // console.log(item);
            if( item.toggle1 == $scope.toggle.sectorOrder && 
                item.toggle2 == $scope.toggle.sectorRevOrPax
                ) {
                return true; 
            }
            return false;
        }
        $scope.getFlownFavorites = function(){            
            $scope.callMetricSnapshot();
            $scope.callTargetVsActual();
            $scope.callRevenueAnalysis();
        }
        $scope.ionicLoadingShow = function(){
            $ionicLoading.show({
                template: '<ion-spinner class="spinner-calm"></ion-spinner>'
            });
        };
        $scope.ionicLoadingHide = function(){
            $ionicLoading.hide();
        };
        //refresh charts
        angular.element(window).on('resize', function(e, scope) {
            $scope.onSlideMove({index: $scope.header.tabIndex});
        });
        /* drilldown */
        $ionicPopover.fromTemplateUrl('components/mis/drildown.html', {
            scope: $scope
        }).then(function(drillpopover) {
            $scope.drillpopover = drillpopover;
        });
        $scope.drilltabs = ['Country Level','Sector Level','Flight Level','Document Level'];
        $scope.openDrillDownPopover = function($event,regionData,selFindLevel) {
            $scope.drillpopover.show($event);
            $scope.openDrillDown(regionData,selFindLevel); 
        };
        $scope.closesDrillDownPopover = function() {
            $scope.drillpopover.hide();
        };
        $scope.pageSize = 4;
        $scope.groups = [];
        for (var i=0; i<=3; i++) {
            $scope.groups[i] = {
                id: i,
                name: $scope.drilltabs[i],
                items: [],
                orgItems: [],
                ItemsByPage: []
            };
        }
        $scope.searchResults = function (level,obj) {
            $scope.groups[level].items[0] = FilteredListService.searched($scope.groups[level].orgItems[0], obj.searchText);
            if (obj.searchText == '') {
                $scope.resetAll(level); 
                $scope.groups[level].items[0] = $scope.groups[level].orgItems[0];
            }
            $scope.currentPage = 0;
            $scope.pagination(level); 
        }
        $scope.pagination = function (level) {
            $scope.groups[level].ItemsByPage = FilteredListService.paged($scope.groups[level].items[0], $scope.pageSize );
        };
        $scope.setPage = function () {
            $scope.currentPage = this.n;
        };
        $scope.firstPage = function () {
            $scope.currentPage = 0;
        };
        $scope.lastPage = function (level) {
            $scope.currentPage = $scope.groups[level].ItemsByPage.length - 1;
        };
        $scope.resetAll = function (level) {
            $scope.currentPage = 0;
        }
        $scope.sort = function(sortBy,level,order){
            $scope.resetAll(level);
            $scope.columnToOrder = sortBy; 
            //$Filter - Standard Service
            $scope.groups[level].items[0] = $filter('orderBy')($scope.groups[level].items[0], $scope.columnToOrder, order); 
            $scope.pagination(level);    
        }; 
        $scope.range = function (input, total) {
            var ret = [];
            if (!total) {
                total = input;
                input = 0;
            }
            for (var i = input; i < total; i++) {
                ret.push(i);
            }
            return ret;
        };
        $scope.toggleGroup = function(group) {
            if ($scope.isGroupShown(group)) {
                $scope.shownGroup = null;
            } else {
                $scope.shownGroup = group;
            }
        };
        $scope.isGroupShown = function(group) {
            return $scope.shownGroup === group;
        };        
    };    
})();