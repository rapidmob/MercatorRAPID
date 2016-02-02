/// <reference path="../../../_libs.ts" />
/// <reference path="../services/OperationalService.ts" />


interface tabObject {
    title: string,
    names: string,
    icon: string
}

interface toggleObject {
    monthOrYear: string,
	chartOrTable: string,
    openOrClosed: string
}

interface headerObject {
    flownMonth: string,
    tabIndex: number,
    userName: string
}

class OperationalFlownController {
  public static $inject = ['$scope', '$ionicLoading', '$ionicPopover', '$filter',
    'OperationalService', '$ionicSlideBoxDelegate', '$timeout', 'ReportSvc'];
  private tabs: [tabObject];
  private toggle: toggleObject;
  private header: headerObject;
  private subHeader: any;
  private flightProcStatus: any;
  private favFlightProcResult: any;
  private carouselIndex: number = 0;
  private flightCountReason: any;
  private couponCountException: any;

  private threeBarChartColors: [string] = ['#4EB2F9', '#FFC300', '#5C6BC0'];
  private fourBarChartColors: [string] = ['#7ED321', '#4EB2F9', '#FFC300', '#5C6BC0'];

  private infopopover: Ionic.IPopover;
  private infodata: string;
  private flightProcSection: string;
  private flightCountSection: string;
  private couponCountSection: string;

  constructor(private $scope: ng.IScope, private $ionicLoading: Ionic.ILoading,
    private $ionicPopover: Ionic.IPopover, private $filter: ng.IFilterService,
    private operationalService: OperationalService, private $ionicSlideBoxDelegate: Ionic.ISlideBoxDelegate,
    private $timeout: ng.ITimeoutService, private reportSvc: ReportSvc) {
    this.tabs = [
      { title: 'My Dashboard', names: 'MyDashboard', icon: 'iconon-home' },
      { title: 'Flight Process Status', names: 'FlightProcessStatus', icon: 'ion-home' },
      { title: 'Flight Count by Reason', names: 'FlightCountbyReason', icon: 'ion-home' },
      { title: 'Coupon Count by Exception Category', names: 'CouponCountbyExceptionCategory', icon: 'ion-home' }
    ];

    this.toggle = {
      monthOrYear: 'month',
	   chartOrTable: 'chart',
      openOrClosed: 'OPEN'
    };

    this.header = {
      flownMonth: '',
      tabIndex: 0,
      userName: ''
    };

    this.initData();
  }
  initData() {
    var that = this;
    this.$ionicPopover.fromTemplateUrl('components/operational/flown/infotooltip.html', {
      scope: that.$scope
    }).then(function(infopopover) {
      that.infopopover = infopopover;
    });
    this.operationalService.getPaxFlownOprHeader({ userId: 'Victor' }).then(
      (data) => {
        that.subHeader = data.response.data;
        // console.log(that.subHeader.paxFlownOprMonths);
        that.header.flownMonth = that.subHeader.defaultMonth;
        // console.log(that.header.flownMonth);
      },
      (error) => {
        console.log('an error occured');
      });
    this.onSlideMove({ index: 0 });
  }
  onSlideMove(data: any) {
    this.header.tabIndex = data.index;
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
      flownMonth: 'Jul-2015',//this.header.flownMonth,
      userId: '',
      toggle1: '',
      fullDataFlag: 'N'
    };

    this.ionicLoadingShow();
    this.operationalService.getOprFlightProcStatus(reqdata)
      .then(function(data) {
      var otherChartColors = [{ "color": "#7ED321" }, { "color": "#4EB2F9" },
          { "color": "#FFC300" }, { "color": "#5C6BC0" }];
        var pieChartColors = [{ "color": "#4EB2F9" }, { "color": "#FFC300" }, { "color": "#5C6BC0" }];

        var jsonObj = that.applyChartColorCodes(data.response.data, pieChartColors, otherChartColors);
        that.flightProcSection = jsonObj.sectionName;
        var pieCharts = _.filter(jsonObj.pieCharts, function(u: any) {
          if (u) return u.favoriteInd == 'Y';
        });
        var multiCharts = _.filter(jsonObj.multibarCharts, function(u: any) {
          if (u) return u.favoriteInd == 'Y';
        });
        var stackCharts = _.filter(jsonObj.stackedBarCharts, function(u: any) {
          if (u) return u.favoriteInd == 'Y';
        });          
        // console.log(stackCharts);
        if (that.header.tabIndex == 0) {
          that.flightProcStatus = {
            pieChart: pieCharts[0],
            weekData: multiCharts[0].multibarChartItems,
            stackedChart: (stackCharts.length) ? stackCharts[0] : []
          }
        } else {
          that.flightProcStatus = {
            pieChart: jsonObj.pieCharts[0],
            weekData: jsonObj.multibarCharts[0].multibarChartItems,
            stackedChart: jsonObj.stackedBarCharts[0]
          }
        }
        // console.log(stackCharts);
        that.$timeout(function() {
          that.$ionicSlideBoxDelegate.$getByHandle('oprfWeekData').update();
        }, 500);
        // console.log(JSON.stringify(that.flightProcStatus.weekData));
        that.ionicLoadingHide();
      }, function(error) {
      });
  }
  callFlightCountByReason() {
    var that = this;
    var reqdata = {
      flownMonth: 'Jul-2015',
      userId: '',
      toggle1: 'open',
      fullDataFlag: 'N'
    };
    this.ionicLoadingShow();
    this.operationalService.getOprFlightCountByReason(reqdata)
      .then(function(data) {
        // console.log(jsonObj.pieCharts[0]);
      var otherChartColors = [{ "color": "#28AEFD" }, { "color": "#FFC300" }, { "color": "#5C6BC0" }];
      var pieChartColors = [{ "color": "#4EB2F9" }, { "color": "#FFC300" }, { "color": "#5C6BC0" }];

        var jsonObj = that.applyChartColorCodes(data.response.data, pieChartColors, otherChartColors);
        that.flightCountSection = jsonObj.sectionName;
        if (that.header.tabIndex == 0) {
          that.flightCountReason = that.getFavoriteItems(jsonObj);
        } else {
          that.flightCountReason = {
            pieChart: jsonObj.pieCharts[0],
            weekData: jsonObj.multibarCharts[0].multibarChartItems,
            stackedChart: jsonObj.stackedBarCharts[0]
          }
        }

        that.$timeout(function() {
          that.$ionicSlideBoxDelegate.$getByHandle('oprfWeekData').update();
        }, 700);
        that.ionicLoadingHide();
      }, function(error) {
        that.ionicLoadingHide();
      });
  }
  callCouponCountByException() {
    var that = this;
    var reqdata = {
      flownMonth: 'Jul-2015',
      userId: '',
      toggle1: '',
      fullDataFlag: 'N'
    };
    this.ionicLoadingShow();
    this.operationalService.getOprCouponCountByException(reqdata)
      .then(function(data) {
      var otherChartColors = [{ "color": "#4EB2F9" }, { "color": "#FFC300" }, { "color": "#5C6BC0" }];
        var pieChartColors = [{ "color": "#4EB2F9" }, { "color": "#FFC300" }, { "color": "#5C6BC0" }];

        var jsonObj = that.applyChartColorCodes(data.response.data, pieChartColors, otherChartColors);
        that.couponCountSection = jsonObj.sectionName;
        if (that.header.tabIndex == 0) {
          that.couponCountException = that.getFavoriteItems(jsonObj);
        } else {
          that.couponCountException = {
            pieChart: jsonObj.pieCharts[0],
            weekData: jsonObj.multibarCharts[0].multibarChartItems,
            stackedChart: jsonObj.stackedBarCharts[0]
          }
        }
        that.$timeout(function() {
          that.$ionicSlideBoxDelegate.$getByHandle('oprfWeekData').update();
        }, 500);
        that.ionicLoadingHide();
      }, function(error) {
        that.ionicLoadingHide();
      });
  }
  ionicLoadingShow() {
    this.$ionicLoading.show({
      template: '<ion-spinner class="spinner-calm"></ion-spinner>'
    });
  };
  applyChartColorCodes(jsonObj: any, pieChartColors: any, otherChartColors: any){
    _.forEach(jsonObj.pieCharts[0].data, function(n: any, value: any) {
          n.label = n.xval;
          n.value = n.yval;
    });
    _.merge(jsonObj.pieCharts[0].data, pieChartColors);
    _.merge(jsonObj.stackedBarCharts[0].stackedBarchartItems, otherChartColors);
    _.merge(jsonObj.multibarCharts[0].multibarChartItems, otherChartColors);
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
    return {
      pieChart: pieCharts[0],
      weekData: (multiCharts.length) ? multiCharts.multibarCharts[0].multibarChartItems : [],
      stackedChart: (stackCharts.length) ? stackCharts[0] : []
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
  lockSlide() {
    console.log('in lockSlide mehtod..');
    this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekData').enableSlide(false);
  };
  weekDataPrev() {
    this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekData').previous();
  };
  weekDataNext() {
    this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekData').next();
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
