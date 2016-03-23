/// <reference path="../../../_libs.ts" />
/// <reference path="../services/OperationalService.ts" />
/// <reference path="../../mis/services/FilteredListService.ts" />

interface tabObject {
    title: string,
    names: string,
    icon: string
}

interface toggleObject {
    monthOrYear: string,
    openOrClosed: string,
    flightStatus: string,
    flightReason: string,
    ccException: string
}

interface headerObject {
    flownMonth: string,
    tabIndex: number,
    userName: string
}

class OperationalFlownController {
  public static $inject = ['$state', '$scope', '$ionicLoading', '$filter',
    'OperationalService', '$ionicSlideBoxDelegate', '$timeout', '$window', 'ReportSvc', 'FilteredListService', 'UserService', '$ionicHistory', 'GRAPH_COLORS', 'TABS', '$ionicPopup', '$ionicPopover'];
  private tabs: [tabObject];
  private toggle: toggleObject;
  private header: headerObject;
  private subHeader: any;
  private flightProcStatus: any;
  private orgflightProcStatus: any;
  private favFlightProcResult: any;
  private carouselIndex: number = 0;
  private flightCountReason: any;
  private orgFlightCountReason: any;
  private couponCountException: any;
  private orgCouponCountException: any;
  private charttype: string;
  private graphType: string;
  private graphpopover: Ionic.IPopover;
  private popovershown: boolean;
  private threeBarChartColors: [string] = this.GRAPH_COLORS.THREE_BARS_CHART;
  private fourBarChartColors: [string] = this.GRAPH_COLORS.FOUR_BARS_CHART;

  private infopopover: Ionic.IPopover;
  private infodata: string;
  private flightProcSection: string;
  private flightCountSection: string;
  private couponCountSection: string;
  private currentIndex: number;

  private pageSize = 4;
  private currentPage = [];
  private selectedDrill = [];
  private groups = [];
  private columnToOrder: string;
  private shownGroup: number;
  private drillType: string;
  private drillBarLabel: string;
  private exceptionCategory: string;
  private drilltabs: string[];
  private drillName: string;
  private firstColumns: string[];
  private drillpopover: Ionic.IPopover;
  
  private flightProcLegends: any;
  private flightReasonLegends: any;
  private flightCouponLegends: any;
  private format: any = d3.format(',.0f');

  constructor(private $state: angular.ui.IStateService, private $scope: ng.IScope,
    private $ionicLoading: Ionic.ILoading, private $filter: ng.IFilterService,
    private operationalService: OperationalService,
    private $ionicSlideBoxDelegate: Ionic.ISlideBoxDelegate,
    private $timeout: ng.ITimeoutService, private $window: ng.IWindowService,
    private reportSvc: ReportSvc, private filteredListService: FilteredListService,
    private userService: UserService, private $ionicHistory: any, private GRAPH_COLORS: string, private TABS: string, private $ionicPopup: Ionic.IPopup,
    private $ionicPopover: Ionic.IPopover) {
      
    this.tabs = this.TABS.DB2_TABS;

    this.toggle = {
      monthOrYear: 'month',
      openOrClosed: 'OPEN',
      flightStatus: 'chart',
      flightReason: 'chart',
      ccException: 'chart'
    };

    this.header = {
      flownMonth: '',
      tabIndex: 0,
      userName: ''
    };
	if (this.$window.localStorage) { 
		this.$window.localStorage.setItem('controller', 'OFS');
	}
  angular.element(window).bind('orientationchange', this.orientationChange); 
    this.initData();
    var that = this;

      this.$scope.$on('onOPRSlideMove', (event: any, response: any) => {
        if(this.$state.current.name == 'app.operational-flown'){
          that.$scope.OprCtrl.onSlideMove(response);
        }
      });

      this.$scope.$on('$ionicView.enter', () => {
        if (!that.userService.showDashboard('Operational')) {
          that.$state.go("login");
        }
      });

      this.$scope.$on('openDrillPopup1', (event: any, response: any) => {
        console.log(response.type);
        if (response.type == 'flight-process') {
          this.$scope.OprCtrl.openFlightProcessDrillPopover(response.event, { "point": response.data }, -1);
        }
        if (response.type == 'coupon-count') {
          this.$scope.OprCtrl.openCounponCountDrillPopover(response.event, { "point": response.data }, -1);
        }
        if (response.type == 'flight-count') {
          this.$scope.OprCtrl.openFlightCountDrillPopover(response.event, { "point": response.data }, -1);
        }
      });
  }

  initData() {
    var that = this;
    if (this.$ionicPopover) {
      if (Object.keys(this.$ionicPopover).length) {
        this.$ionicPopover.fromTemplateUrl('components/operational/flown/drildown.html', {
          scope: that.$scope,
          animation: 'none'
        }).then(function(drillpopover) {
          that.drillpopover = drillpopover;
        });


        this.$ionicPopover.fromTemplateUrl('components/operational/flown/infotooltip.html', {
          scope: that.$scope,
          animation: 'none'
        }).then(function(infopopover) {
          that.infopopover = infopopover;
        });
      }
    }

    console.log(this.$window);
    var req = {
      userId: this.$window.localStorage.getItem('rapidMobile.user')
    }

    if (req.userId != "null") {
      this.operationalService.getPaxFlownOprHeader(req).then(
        (data) => {
          that.subHeader = data.response.data;
          that.header.flownMonth = that.subHeader.defaultMonth;
          that.onSlideMove({ index: 0 });
        },
        (error) => {
          console.log('an error occured');
        });
    }
    that.header.userName = that.getProfileUserName();
  }
  selectedFlownMonth(month: string) {
    return (month == this.header.flownMonth);
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
  
  orientationChange = (): boolean => {
    var that = this;
    var obj = this.$window.localStorage.getItem('controller');
      if (obj === 'OFS') {
		that.$timeout(function() {
		  that.onSlideMove({ index: that.header.tabIndex });
		}, 200)
	}
  }

  updateHeader() {
    var flownMonth = this.header.flownMonth;
    this.onSlideMove({ index: this.header.tabIndex });
  }

  onSlideMove(data: any) {
    this.header.tabIndex = data.index;
    if(this.graphpopover === undefined || this.graphpopover.isShown() == false){
      this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataFS').slide(0);
  	  this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataFC').slide(0);
  	  this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataCC').slide(0);
   }
    switch (this.header.tabIndex) {
      case 0:
        this.callMyDashboard();
        break;
      case 1:
        this.callFlightProcStatus();
        break;
      case 2:
        this.callFlightCountByReason();
        break;
      case 3:
        this.callCouponCountByException();
        break;
    }
  };
  callMyDashboard() {
    this.callFlightProcStatus();
    this.callFlightCountByReason();
    this.callCouponCountByException();
  }
  callFlightProcStatus() {
    var that = this;
    var reqdata = {
      flownMonth: this.header.flownMonth,
      userId: this.header.userName,
      toggle1: '',
      fullDataFlag: 'N'
    };

    this.ionicLoadingShow();
    this.operationalService.getOprFlightProcStatus(reqdata)
      .then(function(data) {
		if(data.response.status === "success" && data.response.data.hasOwnProperty('sectionName')){		  
			var jsonObj = that.applyChartColorCodes(data.response.data);
			that.flightProcSection = jsonObj.sectionName;
      that.flightProcLegends = data.response.data.legends.values;
      console.log(that.flightProcLegends);

      that.orgflightProcStatus = {
        pieChart: jsonObj.pieCharts[0],
        weekData: jsonObj.multibarCharts[0],
        stackedChart: jsonObj.stackedBarCharts[0]
        }

      if (that.header.tabIndex == 0) {
        that.flightProcStatus = that.getFavoriteItems(jsonObj);
			} else {
        that.flightProcStatus = {
        pieChart: jsonObj.pieCharts[0],
        weekData: jsonObj.multibarCharts[0].multibarChartItems,
        stackedChart: jsonObj.stackedBarCharts[0].stackedBarchartItems
        };
			}
      
			that.$timeout(function() {
			  that.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataFS').update();
			}, 0);
			that.ionicLoadingHide();
		}else{
			that.ionicLoadingHide();
			that.$ionicPopup.alert({
				title: 'Error',
				content: 'Data not found for Flights Processing Status!!!'
			}).then(function(res) {
				console.log('done');
			});

		}
      }, function(error) {
      });
  }
  callFlightCountByReason() {
    var that = this;
    var reqdata = {
      flownMonth: this.header.flownMonth,
      userId: this.header.userName,
      toggle1: this.toggle.openOrClosed.toLowerCase(),
      fullDataFlag: 'N'
    };
    this.ionicLoadingShow();
    this.operationalService.getOprFlightCountByReason(reqdata)
      .then(function(data) {
      if (data.response.status === "success" && data.response.data.hasOwnProperty('sectionName')) {	
			// console.log(jsonObj.pieCharts[0]);
      that.flightReasonLegends = data.response.data.legends;
      var jsonObj = that.applyChartColorCodes(data.response.data);
			that.flightCountSection = jsonObj.sectionName;

      that.orgFlightCountReason = {
        pieChart: jsonObj.pieCharts[0],
        weekData: jsonObj.multibarCharts[0],
        stackedChart: jsonObj.stackedBarCharts[0]
        }

			if (that.header.tabIndex == 0) {
			  that.flightCountReason = that.getFavoriteItems(jsonObj);
			} else {
        that.flightCountReason = {
        pieChart: jsonObj.pieCharts[0],
        weekData: jsonObj.multibarCharts[0].multibarChartItems,
        stackedChart: jsonObj.stackedBarCharts[0].stackedBarchartItems
        };
			}
console.log(that.orgFlightCountReason);
			that.$timeout(function() {
			  that.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataFC').update();
			}, 0);
			that.ionicLoadingHide();
		}else{
			that.ionicLoadingHide();
      that.$ionicPopup.alert({
        title: 'Error',
        content: 'Data not found for Flights Count by Reason!!!'
      }).then(function(res) {
          console.log('done');
      });

		}
      }, function(error) {
        that.ionicLoadingHide();
      });
  }

  callCouponCountByException() {
    var that = this;
    var reqdata = {
      flownMonth: this.header.flownMonth,
      userId: this.header.userName,
      toggle1: '',
      fullDataFlag: 'N'
    };
    this.ionicLoadingShow();
    this.operationalService.getOprCouponCountByException(reqdata)
      .then(function(data) {
      if (data.response.status === "success" && data.response.data.hasOwnProperty('sectionName')) {
			var jsonObj = that.applyChartColorCodes(data.response.data);
			that.couponCountSection = jsonObj.sectionName;
         that.flightCouponLegends = data.response.data.legends.values;

     that.orgCouponCountException = {
       pieChart: jsonObj.pieCharts[0],
       weekData: jsonObj.multibarCharts[0],
       stackedChart: jsonObj.stackedBarCharts[0]
     };

        	if (that.header.tabIndex == 0) {
			  that.couponCountException = that.getFavoriteItems(jsonObj);
			} else {
        that.couponCountException = {
        pieChart: jsonObj.pieCharts[0],
        weekData: jsonObj.multibarCharts[0].multibarChartItems,
        stackedChart: jsonObj.stackedBarCharts[0].stackedBarchartItems
        };
			}
			that.$timeout(function() {
			  that.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataCC').update();
			}, 0);
			that.ionicLoadingHide();		
		}else{
			that.ionicLoadingHide();
      that.$ionicPopup.alert({
        title: 'Error',
        content: 'Data not found for Coupon Count by Exception Category!!!'
      }).then(function(res) {
          console.log('done');
      });

		}
      }, function(error) {
        that.ionicLoadingHide();
      });
  }
  openPopover($event, charttype, index,oprfWeekData) {
    var that = this;
    var temp = this.$ionicSlideBoxDelegate.$getByHandle(oprfWeekData);
    that.currentIndex = temp.currentIndex();
    $event.preventDefault();
    this.charttype = charttype;
    this.graphType = index;
    this.$ionicPopover.fromTemplateUrl('components/operational/flown/graph-popover.html', {
      scope: that.$scope
    }).then(function(popover) {
      that.popovershown = true;
      that.graphpopover = popover;
      that.graphpopover.show($event);
    });
  }
  openPiePopover($event, charttype, index) {
    var that = this;
    $event.preventDefault();
    this.charttype = charttype;
    this.graphType = index;
    this.$ionicPopover.fromTemplateUrl('components/operational/flown/pie-popover.html', {
      scope: that.$scope
    }).then(function(popover) {
      that.popovershown = true;
      that.graphpopover = popover;
      that.graphpopover.show($event);
    });
  }

  closePopover() {
    this.graphpopover.hide();
  };
  ionicLoadingShow() {
    this.$ionicLoading.show({
      template: '<ion-spinner class="spinner-calm"></ion-spinner>'
    });
  };
  applyChartColorCodes(jsonObj: any) {
    var that = this;
    _.forEach(jsonObj.pieCharts[0].data, function(n: any, value: any) {
      n.label = n.xval;
      n.value = n.yval;
      n.color = that.GRAPH_COLORS.DB_TWO_PIE_COLORS1[value]
      console.log(value);
    });
   // _.merge(jsonObj.pieCharts[0].data, this.GRAPH_COLORS.DB_TWO_PIE_COLORS1); 
    return jsonObj;
  }
  getFavoriteItems(jsonObj: any) {
    var pieCharts = _.filter(jsonObj.pieCharts, function(u: any) {
      if (u) return u.favoriteInd == 'Y';
    });
    var multiCharts = _.filter(jsonObj.multibarCharts, function(u: any) {
      if (u) return u.favoriteInd == 'Y';
    });
    var stackCharts = _.filter(jsonObj.stackedBarCharts, function(u: any) {
      if (u) return u.favoriteInd == 'Y';
    });
    // console.log(jsonObj);
    // console.log(multiCharts[0]);
    return {
      pieChart: pieCharts[0],
      weekData: (multiCharts.length) ? multiCharts[0].multibarChartItems : [],
      stackedChart: (stackCharts.length) ? stackCharts[0].stackedBarchartItems : []
    }
  }

  colorFunction() {
    var that = this;
    return function(d, i) {
      return that.threeBarChartColors[i];
    };
  }
  fourBarColorFunction() {
    var that = this;
    return function(d, i) {
      return that.fourBarChartColors[i];
    };
  }
  valueFormatFunction() {
    var that = this;
    return function(d) {
      return d3.format(",")(d);
    }
  }
  toolTipContentFunction(){
    return function(key, x, y, e, graph) {
      return key +' '+ Math.ceil(y) + ' at ' + x
    }
  }
  yAxisTickFormatFunction(){
    return function(d){
      return d3.format(",")(d);
    }
  }
  openinfoPopover($event, index) {
    if (typeof index == "undefined" || index == "") {
      this.infodata = 'No info available';
    }
    else {
      this.infodata = index;
    }
    console.log(index);
    this.infopopover.show($event);
  };
  closeInfoPopover() {
    this.infopopover.hide();
  }
  toggleCount(val) {
    this.toggle.openOrClosed = val;
    this.onSlideMove({ index: this.header.tabIndex });
  }
  ionicLoadingHide() {
    this.$ionicLoading.hide();
  };
  tabLockSlide(tabname: string) {
    this.$ionicSlideBoxDelegate.$getByHandle(tabname).enableSlide(false);
  }
  weekDataPrev(oprfWeekData: any) {
    this.$ionicSlideBoxDelegate.$getByHandle(oprfWeekData).previous();
  };
  weekDataNext(oprfWeekData: any) {
    this.$ionicSlideBoxDelegate.$getByHandle(oprfWeekData).next();
  }
  toggleFlightStatusView(val: string) {
    this.toggle.flightStatus = val;
    this.onSlideMove({ index: this.header.tabIndex });
  }
  toggleFlightReasonView(val: string) {
    this.toggle.flightReason = val;
    if (this.toggle.flightReason == "chart")
    this.onSlideMove({ index: this.header.tabIndex });
  }
  toggleCCExceptionView(val: string) {
    this.toggle.ccException = val;
    this.onSlideMove({ index: this.header.tabIndex });
  }   
  runReport(chartTitle: string, monthOrYear: string, flownMonth: string) {
    var that = this; var newTab;
    var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
	var chartOrTable = "";
		if(chartTitle === "fpStatus")
			chartOrTable = that.toggle.flightStatus;
		else if(chartTitle === "fcReason")
			chartOrTable = that.toggle.flightReason;
		else if(chartTitle === "ccException")
			chartOrTable = that.toggle.ccException;
	
		if(chartOrTable === "chart"){
		if (isSafari) newTab = window.open("", "_system");
		//if no cordova, then running in browser and need to use dataURL and iframe
		if (!window.cordova) {
		  that.ionicLoadingShow();
		  this.reportSvc.runReportDataURL(chartTitle, monthOrYear, flownMonth)
			.then(function(dataURL) {
			  that.ionicLoadingHide();
			  //set the iframe source to the dataURL created
			  //console.log(dataURL);
			  //document.getElementById('pdfImage').src = dataURL;
        if (isSafari)
          newTab.location = dataURL;
        else
          window.open(dataURL, "_system");
			}, function(error) {
			  that.ionicLoadingHide();
			  console.log('Error ');
			});
		  return true;
		}
		//if codrova, then running in device/emulator and able to save file and open w/ InAppBrowser
		else {
		  that.ionicLoadingShow();
		  this.reportSvc.runReportAsync(chartTitle, monthOrYear, flownMonth)
			.then(function(filePath) {
			  that.ionicLoadingHide();
			  //log the file location for debugging and oopen with inappbrowser
			  console.log('report run on device using File plugin');
			  console.log('ReportCtrl: Opening PDF File (' + filePath + ')');
			  var lastPart = filePath.split("/").pop();
			  var fileName = "/mnt/sdcard/" + lastPart;
			  if (device.platform != "Android")
				fileName = filePath;
			  //window.openPDF(fileName);
			  //else
			  //window.open(filePath, '_blank', 'location=no,closebuttoncaption=Close,enableViewportScale=yes');*/
						
			  cordova.plugins.fileOpener2.open(
				fileName,
				'application/pdf',
				{
				  error: function(e) {
					console.log('Error status: ' + e.status + ' - Error message: ' + e.message);
				  },
				  success: function() {
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
	}else{
		that.$ionicPopup.alert({
			title: 'Info',
			content: 'Download option not available for table view!!!'
		  }).then(function(res) {
			  console.log('done');
		  });
	}
  }

  openFlightProcessDrillPopover($event, data, selFindLevel) {
    this.drillName = 'FLIGHT PROCESSING STATUS - ' + data.point[0] + '-' + this.header.flownMonth;
    this.drillType = 'flight-process';
    this.groups = [];
    this.drilltabs = ['Country Level', 'Sector Level', 'Flight Level', 'Document Level'];
    this.firstColumns = ['countryFrom', 'flownSector', 'flightNumber', 'carrierCode#'];
    this.initiateArray(this.drilltabs);
    var that = this;
    this.$timeout(function() {
      that.drillpopover.show($event);
      that.shownGroup = 0;
    }, 50);
    this.openDrillDown(data.point, selFindLevel);
  };

  openCounponCountDrillPopover($event, data, selFindLevel) {
    this.drillName = 'COUPON COUNT BY EXCEPTION CATEGORY ';
    this.drillType = 'coupon-count';
    this.groups = [];
    this.drilltabs = ['Coupon Count Flight Status', 'Document Level'];
    this.firstColumns = ['flightNumber', 'flownSector'];
    this.initiateArray(this.drilltabs);
    var that = this;
    this.$timeout(function() {
      that.drillpopover.show($event);
      that.shownGroup = 0;
    }, 50);
    this.openDrillDown(data.point, selFindLevel);
  };

  openFlightCountDrillPopover($event, data, selFindLevel) {
    var openclsTxt = (this.toggle.openOrClosed == 'OPEN')? 'Open' : 'Closed';
    this.drillName = 'LIST OF ' + openclsTxt + ' FLIGHTS FOR ' + data.point[0] + '-' + this.header.flownMonth + ' BY REASON ';
    this.drillType = 'flight-count';
    this.groups = [];
    this.drilltabs = [openclsTxt + ' Flight Status', 'Document Level'];
    this.firstColumns = ['flightNumber', 'carrierCode'];
    this.initiateArray(this.drilltabs);
    var that = this;
    this.$timeout(function() {
      that.drillpopover.show($event);
      that.shownGroup = 0;
    }, 50);
    this.openDrillDown(data.point, selFindLevel);
  };

  drillDownRequest(drillType, selFindLevel, data) {
    var reqdata;
    if (drillType == 'flight-process') {
      var drillLevel = (selFindLevel + 2);
      if (data.label) {
        this.drillBarLabel = data[0];
      }

      var flightDate;
      //flightDate = (data.flightDate && drillLevel > 1) ? String(data.flightDate) : String(data[0]);
      flightDate = (data.flightDate && drillLevel > 1) ? data.flightDate : data[0];
      var countryFromTo = (data.countryFrom && data.countryTo) ? data.countryFrom + '-' + data.countryTo : "";
      var sectorFromTo = (data.flownSector) ? data.flownSector : "";
      var flightNumber = (data.flightNumber) ? data.flightNumber : "";



      reqdata = {
        "flownMonth": this.header.flownMonth,
        "userId": this.getProfileUserName(),
        "fullDataFlag": "",
        "drillLevel": drillLevel,
        "pageNumber": 0,
        "flightDate": flightDate,
        "countryFromTo": countryFromTo,
        "sectorFromTo": sectorFromTo,
        "flightNumber": flightNumber
      };
    }


    if (drillType == 'coupon-count') {
      var drillLevel = (selFindLevel + 2);
      if (data.label) {
        this.drillBarLabel = data[0];
      }
      console.log(this.exceptionCategory);
      var flightDate;
      //flightDate = (data.flightDate && drillLevel > 1) ? String(data.flightDate) : String(data[0]);
      flightDate = (data.flightDate && drillLevel > 1) ? data.flightDate : data[0];
      var exceptionCategory = (this.exceptionCategory && drillLevel > 1) ? this.exceptionCategory : "";
      var flightSector = (data.flownSector) ? data.flownSector : "";
      var flightNumber = (data.flightNumber) ? data.flightNumber : "";



      reqdata = {
        "flownMonth": this.header.flownMonth,
        "userId": this.getProfileUserName(),
        "fullDataFlag": "",
        "drillLevel": drillLevel,
        "pageNumber": 0,
        "exceptionCategory": exceptionCategory,
        "flightNumber": flightNumber,
        "flightDate": flightDate,
        "flightSector": flightSector,
      };
    }

    if (drillType == 'flight-count') {
      var drillLevel = (selFindLevel + 2);
      if (data.label) {
        this.drillBarLabel = data[0];
      }
      var flightDate;
      //flightDate = (data.flightDate && drillLevel > 1) ? String(data.flightDate) : String(data[0]);
      flightDate = (data.flightDate && drillLevel > 1) ? data.flightDate : data[0];
      var toggle1 = this.toggle.openOrClosed.toLowerCase();
      var flightSector = (data.flownSector) ? data.flownSector : "";
      var flightNumber = (data.flightNumber) ? data.flightNumber : "";
      var flightStatus = (this.exceptionCategory && drillLevel > 1) ? this.exceptionCategory : "";


      reqdata = {
        "flownMonth": this.header.flownMonth,
        "userId": this.getProfileUserName(),
        "fullDataFlag": "",
        "drillLevel": drillLevel,
        "pageNumber": 0,
        "toggle1": toggle1,
        "flightStatus": flightStatus,
        "flightNumber": flightNumber,
        "flightDate": flightDate,
        "flightSector": flightSector,
      };
    }

    return reqdata;
  }

  getDrillDownURL(drilDownType) {
    var url
    switch (drilDownType) {
      case 'flight-process':
        url = "/paxflnopr/flightprocessingstatusdrill";
        break;
      case 'coupon-count':
        url = "/paxflnopr/couponcountbyexpdrill";
        break;
      case 'flight-count':
        url = "/paxflnopr/flightcountbyreasondrill";
        break;
    }
    return url;
  }
  tabSlideHasChanged(index) {
    var data = this.groups[0].completeData[0];
    this.groups[0].items[0] = data[index].values;
    this.groups[0].orgItems[0] = data[index].values;
    this.sort('', 0, false);
    this.exceptionCategory = data[index].key;
  }

  openDrillDown(data, selFindLevel) {
    selFindLevel = Number(selFindLevel);
    var that = this;
    this.selectedDrill[selFindLevel] = data;
    this.selectedDrill[selFindLevel + 1] = '';

    if (selFindLevel != (this.groups.length - 1)) {
      var drillLevel = (selFindLevel + 2);
      var reqdata = this.drillDownRequest(this.drillType, selFindLevel, data);
      var URL = this.getDrillDownURL(this.drillType);
      this.ionicLoadingShow();
      this.operationalService.getDrillDown(reqdata, URL)
        .then(function(data) {
          that.ionicLoadingHide();
          var data = data.response;
          console.log(data);
          var findLevel = drillLevel - 1;
          if (data.status == 'success') {
            var respResult;
            if (data.data.rows) {
              respResult = data.data.rows;
            } else {
              respResult = data.data;
            }

            if ((that.drillType == 'coupon-count' || that.drillType == 'flight-count') && data.data.rows) {
              that.groups[findLevel].items[0] = respResult[0].values;
              that.groups[findLevel].orgItems[0] = respResult[0].values;
              that.groups[findLevel].completeData[0] = respResult;
              that.exceptionCategory = respResult[0].key;
            } else {
              that.groups[findLevel].items[0] = respResult;
              that.groups[findLevel].orgItems[0] = respResult;
            }

            that.shownGroup = findLevel;
            that.sort('', findLevel, false);
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

  closeDrillPopover() {
    this.drillpopover.hide();
  }

  clearDrill(level: number) {
    var i: number;
    for (var i = level; i < this.drilltabs.length; i++) {
      this.groups[i].items.splice(0, 1);
      this.groups[i].orgItems.splice(0, 1);
      this.sort('', i, false);
      console.log(this.selectedDrill);
      this.selectedDrill[i] = '';
      console.log(this.selectedDrill);
    }
  }
  initiateArray(drilltabs) {
    for (var i in drilltabs) {
      this.groups[i] = {
        id: i,
        name: this.drilltabs[i],
        items: [],
        orgItems: [],
        ItemsByPage: [],
        completeData: [],
        firstColumns: this.firstColumns[i]
      };
    }
  }

  isDrillRowSelected(level, obj) {
    return this.selectedDrill[level] == obj;
  }
  searchResults(level, obj) {
    this.groups[level].items[0] = this.filteredListService.searched(this.groups[level].orgItems[0], obj.searchText, level, this.drillType);
    if (obj.searchText == '') {
      this.resetAll(level);
      this.groups[level].items[0] = this.groups[level].orgItems[0];
    }
    this.currentPage[level] = 0;
    this.pagination(level);
  }
  pagination(level) {
    this.groups[level].ItemsByPage = this.filteredListService.paged(this.groups[level].items[0], this.pageSize);
  };
  setPage(level, pageno) {
    this.currentPage[level] = pageno;
  };
  lastPage(level) {
    this.currentPage[level] = this.groups[level].ItemsByPage.length - 1;
  };
  resetAll(level) {
    this.currentPage[level] = 0;
  }
  sort(sortBy, level, order) {
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
    if (start < 0) {
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
  toggleGroup(group) {
    if (this.isGroupShown(group)) {
      this.shownGroup = null;
    } else {
      this.shownGroup = group;
    }
  }
  isGroupShown(group: number) {
    return this.shownGroup == group;
  }

}
