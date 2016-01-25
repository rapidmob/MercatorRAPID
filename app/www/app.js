/// <reference path="../typings/tsd.d.ts" />
/// <reference path="./typings/ionic.d.ts" />
/// <reference path="./typings/Screen.d.ts" />
/// <reference path="./typings/IsTablet.d.ts" />
/// <reference path="./typings/InAppBrowser.d.ts" /> 

/// <reference path="../../_libs.ts" />
var Utils = (function () {
    function Utils() {
    }
    Utils.isNotEmpty = function () {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i - 0] = arguments[_i];
        }
        var isNotEmpty = true;
        _.forEach(values, function (value) {
            isNotEmpty = isNotEmpty && (angular.isDefined(value) && value !== null && value !== ''
                && !((_.isArray(value) || _.isObject(value)) && _.isEmpty(value)) && value != 0);
        });
        return isNotEmpty;
    };
    Utils.isLandscape = function () {
        var isLandscape = false;
        if (window && window.screen && window.screen.orientation) {
            var type = (_.isString(window.screen.orientation) ? window.screen.orientation : window.screen.orientation.type);
            if (type) {
                isLandscape = type.indexOf('landscape') >= 0;
            }
        }
        return isLandscape;
    };
    Utils.getTodayDate = function () {
        var todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        return todayDate;
    };
    Utils.isInteger = function (number) {
        return parseInt(number.toString()) == +number;
    };
    return Utils;
})();

/// <reference path="../../_libs.ts" />
var LocalStorageService = (function () {
    function LocalStorageService($window) {
        this.$window = $window;
    }
    LocalStorageService.prototype.set = function (keyId, keyvalue) {
        this.$window.localStorage[keyId] = keyvalue;
    };
    LocalStorageService.prototype.get = function (keyId, defaultValue) {
        return this.$window.localStorage[keyId] || defaultValue;
    };
    LocalStorageService.prototype.setObject = function (keyId, keyvalue) {
        this.$window.localStorage[keyId] = JSON.stringify(keyvalue);
    };
    LocalStorageService.prototype.getObject = function (keyId) {
        return this.$window.localStorage[keyId] ? JSON.parse(this.$window.localStorage[keyId]) : undefined;
    };
    LocalStorageService.prototype.isRecentEntryAvailable = function (orginObject, type) {
        this.recentEntries = this.getObject(type) ? this.getObject(type) : [];
        return this.recentEntries.filter(function (entry) { return entry.code === orginObject.code; });
    };
    LocalStorageService.prototype.addRecentEntry = function (data, type) {
        var orginObject = data ? data.originalObject : undefined;
        if (orginObject) {
            if (this.isRecentEntryAvailable(orginObject, type).length === 0) {
                this.recentEntries = this.getObject(type) ? this.getObject(type) : [];
                (this.recentEntries.length == 3) ? this.recentEntries.pop() : this.recentEntries;
                this.recentEntries.unshift(orginObject);
                this.setObject(type, this.recentEntries);
            }
        }
    };
    LocalStorageService.$inject = ['$window'];
    return LocalStorageService;
})();

/// <reference path="../../_libs.ts" />
var CordovaService = (function () {
    function CordovaService() {
        var _this = this;
        this.cordovaReady = false;
        this.pendingCalls = [];
        document.addEventListener('deviceready', function () {
            _this.cordovaReady = true;
            _this.executePending();
        });
    }
    CordovaService.prototype.exec = function (fn, alternativeFn) {
        if (this.cordovaReady) {
            fn();
        }
        else if (!alternativeFn) {
            this.pendingCalls.push(fn);
        }
        else {
            alternativeFn();
        }
    };
    CordovaService.prototype.executePending = function () {
        this.pendingCalls.forEach(function (fn) {
            fn();
        });
        this.pendingCalls = [];
    };
    return CordovaService;
})();

/// <reference path="../../_libs.ts" />
/// <reference path="../../../typings/angularjs/angular.d.ts"/>
/// <reference path="CordovaService.ts" />
var NetService = (function () {
    function NetService($http, cordovaService, $q, URL_WS, OWNER_CARRIER_CODE) {
        var _this = this;
        this.$http = $http;
        this.cordovaService = cordovaService;
        this.$q = $q;
        this.URL_WS = URL_WS;
        this.OWNER_CARRIER_CODE = OWNER_CARRIER_CODE;
        this.isServerAvailable = false;
        this.$http.defaults.timeout = 60000;
        cordovaService.exec(function () {
            _this.fileTransfer = new FileTransfer();
        });
    }
    NetService.prototype.getData = function (fromUrl) {
        var url = this.URL_WS + fromUrl;
        return this.$http.get(url);
    };
    NetService.prototype.postData = function (toUrl, data, config) {
        return this.$http.post(this.URL_WS + toUrl, this.addMetaInfo(data), config);
    };
    NetService.prototype.deleteData = function (toUrl) {
        return this.$http.delete(this.URL_WS + toUrl);
    };
    NetService.prototype.uploadFile = function (toUrl, urlFile, options, successCallback, errorCallback, progressCallback) {
        if (!this.fileTransfer) {
            this.fileTransfer = new FileTransfer();
        }
        console.log(options.params);
        this.fileTransfer.onprogress = progressCallback;
        var url = this.URL_WS + toUrl;
        this.fileTransfer.upload(urlFile, url, successCallback, errorCallback, options);
    };
    NetService.prototype.checkServerAvailability = function () {
        var availability = true;
        var def = this.$q.defer();
        this.cordovaService.exec(function () {
            if (window.navigator) {
                var navigator = window.navigator;
                if (navigator.connection && ((navigator.connection.type == Connection.NONE) || (navigator.connection.type == Connection.UNKNOWN))) {
                    availability = false;
                }
            }
            def.resolve(availability);
        });
        return def.promise;
    };
    NetService.prototype.serverIsAvailable = function () {
        var that = this;
        var serverIsAvailable = this.checkServerAvailability().then(function (result) {
            that.isServerAvailable = result;
        });
        return this.isServerAvailable;
    };
    NetService.prototype.cancelAllUploadDownload = function () {
        if (this.fileTransfer) {
            this.fileTransfer.abort();
        }
    };
    NetService.prototype.addMetaInfo = function (requestData) {
        var device = ionic.Platform.device();
        var model = '';
        var osType = '';
        var osVersion = '';
        var deviceToken = '';
        if (device) {
            model = ionic.Platform.device().model;
            osType = ionic.Platform.device().platform;
            osVersion = ionic.Platform.device().version;
        }
        var metaInfo = {
            'channelIdentifier': 'MOB',
            'dateTimeStamp': new Date().getTime(),
            'ownerCarrierCode': this.OWNER_CARRIER_CODE,
            'additionalInfo': {
                'deviceType': window.isTablet ? 'Tablet' : 'Phone',
                'model': model,
                'osType': osType,
                'osVersion': osVersion,
                'deviceToken': deviceToken,
            }
        };
        var requestObj = {
            'metaInfo': metaInfo,
            'requestData': requestData
        };
        return requestObj;
    };
    NetService.$inject = ['$http', 'CordovaService', '$q', 'URL_WS', 'OWNER_CARRIER_CODE'];
    return NetService;
})();

/// <reference path="../../_libs.ts" />
/// <reference path="NetService.ts" />
/// <reference path="CordovaService.ts" />
var errorhandler;
(function (errorhandler) {
    errorhandler.STATUS_FAIL = 'fail';
    errorhandler.SEVERITY_ERROR_HARD = 'HARD';
    errorhandler.SEVERITY_ERROR_SOFT = 'SOFT';
    errorhandler.HARD_ERROR_INVALID_SESSION_TOKEN = 'SEC.025';
    errorhandler.HARD_ERROR_INVALID_SESSION = 'SES.004';
    errorhandler.HARD_ERROR_TOKEN_EXPIRED = 'SEC.038';
    errorhandler.HARD_ERROR_INVALID_USER_SESSION_EXPIRED = 'SES.003';
    errorhandler.HARD_ERROR_NO_RESULT = 'COM.111';
    errorhandler.HARD_ERROR_NO_ROUTE = 'FLT.010';
})(errorhandler || (errorhandler = {}));
var ErrorHandlerService = (function () {
    function ErrorHandlerService(netService, cordovaService, $q, $rootScope) {
        this.netService = netService;
        this.cordovaService = cordovaService;
        this.$q = $q;
        this.$rootScope = $rootScope;
    }
    ErrorHandlerService.prototype.validateResponse = function (response) {
        var errors = response.data.response ? response.data.response.errors : [];
        if (this.hasErrors(errors) || errorhandler.STATUS_FAIL == response.status) {
            if (!this.hasInvalidSessionError(errors) && !this.hasNoResultError(errors)) {
                // broadcast to appcontroller server error
                this.$rootScope.$broadcast('serverError', response);
            }
        }
    };
    ErrorHandlerService.prototype.isNoResultFound = function (response) {
        var errors = response.data.response ? response.data.response.errors : [];
        return this.hasNoResultError(errors);
    };
    ErrorHandlerService.prototype.isSessionInvalid = function (response) {
        var errors = response.data.response ? response.data.response.errors : [];
        return this.hasInvalidSessionError(errors);
    };
    ErrorHandlerService.prototype.hasHardErrors = function (response) {
        var errors = response.data.response ? response.data.response.errors : [];
        return this.hasHardError(errors);
    };
    ErrorHandlerService.prototype.hasSoftErrors = function (response) {
        var errors = response.data.response ? response.data.response.errors : [];
        return this.hasSoftError(errors);
    };
    ErrorHandlerService.prototype.hasErrors = function (errors) {
        return errors.length > 0;
    };
    ErrorHandlerService.prototype.hasInvalidSessionError = function (errors) {
        return _.some(errors, function (error) {
            return error && errorhandler.SEVERITY_ERROR_HARD == error.severity &&
                (errorhandler.HARD_ERROR_INVALID_SESSION_TOKEN == error.code ||
                    errorhandler.HARD_ERROR_INVALID_SESSION == error.code ||
                    errorhandler.HARD_ERROR_INVALID_USER_SESSION_EXPIRED == error.code ||
                    errorhandler.HARD_ERROR_TOKEN_EXPIRED == error.code);
        });
    };
    ErrorHandlerService.prototype.hasNoResultError = function (errors) {
        return _.some(errors, function (error) {
            return error && errorhandler.SEVERITY_ERROR_HARD == error.severity &&
                (errorhandler.HARD_ERROR_NO_RESULT == error.code ||
                    errorhandler.HARD_ERROR_NO_ROUTE == error.code);
        }) && errors.length == 1;
    };
    ErrorHandlerService.prototype.hasHardError = function (errors) {
        return _.some(errors, function (error) {
            return error && errorhandler.SEVERITY_ERROR_HARD == error.severity;
        });
    };
    ErrorHandlerService.prototype.hasSoftError = function (errors) {
        return _.some(errors, function (error) {
            return error && errorhandler.SEVERITY_ERROR_SOFT == error.severity;
        });
    };
    ErrorHandlerService.$inject = ['NetService', 'CordovaService', '$q', '$rootScope'];
    return ErrorHandlerService;
})();



/// <reference path="../../_libs.ts" />
/// <reference path="NetService.ts" />
/// <reference path="CordovaService.ts" />
/// <reference path="ErrorHandlerService.ts" />
/// <reference path="ISessionHttpPromise.ts" />
var sessionservice;
(function (sessionservice) {
    sessionservice.HEADER_REFRESH_TOKEN_KEY = 'x-refresh-token';
    sessionservice.HEADER_ACCESS_TOKEN_KEY = 'x-access-token';
    sessionservice.REFRESH_SESSION_ID_URL = '/user/getAccessToken';
})(sessionservice || (sessionservice = {}));
var SessionService = (function () {
    function SessionService(netService, errorHandlerService, $q, $rootScope, $http) {
        this.netService = netService;
        this.errorHandlerService = errorHandlerService;
        this.$q = $q;
        this.$rootScope = $rootScope;
        this.$http = $http;
        this.isRefreshSessionIdInProgress = false;
        this.accessTokenRefreshedLisnteres = [];
        this.sessionId = null;
        this.credentialId = null;
    }
    SessionService.prototype.resolvePromise = function (promise) {
        var _this = this;
        promise.response.then(function (response) {
            if (!_this.errorHandlerService.hasHardErrors(response) || _this.errorHandlerService.isSessionInvalid(response)) {
                if (!_this.errorHandlerService.isSessionInvalid(response)) {
                    promise.deffered.resolve(promise.response);
                    console.log('session is valid');
                }
                else {
                    _this.addAccessTokenRefreshedListener(promise);
                    if (!_this.isRefreshSessionIdInProgress) {
                        console.log('refreshing session token');
                        _this.refreshSessionId().then(function (tokenResponse) {
                            if (_this.errorHandlerService.hasHardErrors(tokenResponse)) {
                                _this.setSessionId(null);
                            }
                            else {
                                var responseHeader = tokenResponse.headers();
                                var accessToken = responseHeader[sessionservice.HEADER_ACCESS_TOKEN_KEY];
                                _this.setSessionId(accessToken);
                            }
                            _this.isRefreshSessionIdInProgress = false;
                            if (!_this.getSessionId()) {
                                _this.accessTokenNotRefreshed();
                            }
                            else {
                                _this.accessTokenRefreshed();
                            }
                        }, function (error) {
                            console.log('error on access token refresh');
                            _this.setSessionId(null);
                            if (_this.getCredentialId()) {
                                _this.accessTokenNotRefreshed();
                            }
                            else {
                                promise.deffered.reject();
                            }
                            _this.isRefreshSessionIdInProgress = false;
                        });
                    }
                }
            }
            else {
                promise.deffered.reject();
            }
        });
    };
    SessionService.prototype.addAccessTokenRefreshedListener = function (listener) {
        this.accessTokenRefreshedLisnteres.push(listener);
    };
    SessionService.prototype.removeAccessTokenRefreshedListener = function (listenerToRemove) {
        _.remove(this.accessTokenRefreshedLisnteres, function (listener) {
            return listener == listenerToRemove;
        });
    };
    SessionService.prototype.setCredentialId = function (credId) {
        this.credentialId = credId;
        this.$http.defaults.headers.common[sessionservice.HEADER_REFRESH_TOKEN_KEY] = credId;
    };
    SessionService.prototype.setSessionId = function (sessionId) {
        this.sessionId = sessionId;
        this.$http.defaults.headers.common[sessionservice.HEADER_ACCESS_TOKEN_KEY] = sessionId;
    };
    SessionService.prototype.getSessionId = function () {
        return this.sessionId ? this.sessionId : null;
    };
    SessionService.prototype.getCredentialId = function () {
        return this.credentialId ? this.credentialId : null;
    };
    SessionService.prototype.clearListeners = function () {
        this.accessTokenRefreshedLisnteres = [];
    };
    SessionService.prototype.refreshSessionId = function () {
        this.isRefreshSessionIdInProgress = true;
        var accessTokenRequest = {
            refreshToken: this.credentialId
        };
        return this.netService.postData(sessionservice.REFRESH_SESSION_ID_URL, accessTokenRequest);
    };
    SessionService.prototype.accessTokenNotRefreshed = function () {
        var _this = this;
        _.forEach(this.accessTokenRefreshedLisnteres, function (listener) {
            if (listener.onTokenFailed) {
                listener.onTokenFailed(listener);
            }
            _this.removeAccessTokenRefreshedListener(listener);
        });
    };
    SessionService.prototype.accessTokenRefreshed = function () {
        var _this = this;
        _.forEach(this.accessTokenRefreshedLisnteres, function (listener) {
            if (listener) {
                if (listener.onTokenRefreshed) {
                    listener.onTokenRefreshed(listener);
                    console.log(JSON.stringify(listener));
                }
            }
            else {
                console.log('Length = ', _this.accessTokenRefreshedLisnteres.length);
            }
            _this.removeAccessTokenRefreshedListener(listener);
        });
    };
    SessionService.$inject = ['NetService', 'ErrorHandlerService', '$q', '$rootScope', '$http'];
    return SessionService;
})();



/// <reference path="../../_libs.ts" />
/// <reference path="NetService.ts" />
/// <reference path="CordovaService.ts" />
/// <reference path="SessionService.ts" />
/// <reference path="ErrorHandlerService.ts" />
/// <reference path="ISessionHttpPromise.ts" />
/// <reference path="GenericResponse.ts" />
var dataprovider;
(function (dataprovider) {
    dataprovider.SERVICE_URL_LOGOUT = '/user/logout';
})(dataprovider || (dataprovider = {}));
var DataProviderService = (function () {
    function DataProviderService(netService, cordovaService, $q, $rootScope, errorHandlerService, sessionService, OWNER_CARRIER_CODE) {
        var _this = this;
        this.netService = netService;
        this.cordovaService = cordovaService;
        this.$q = $q;
        this.$rootScope = $rootScope;
        this.errorHandlerService = errorHandlerService;
        this.sessionService = sessionService;
        this.OWNER_CARRIER_CODE = OWNER_CARRIER_CODE;
        this.isConnectedToNetwork = true;
        this.cordovaService.exec(function () {
            if (window.cordova && window.document) {
                navigator = window.navigator;
                _this.isConnectedToNetwork = navigator.onLine;
                window.document.addEventListener('online', function () {
                    console.log('user online');
                    _this.isConnectedToNetwork = true;
                }, false);
                window.document.addEventListener('offline', function () {
                    console.log('user offline');
                    _this.isConnectedToNetwork = false;
                }, false);
            }
        });
    }
    DataProviderService.prototype.getData = function (req) {
        var def = this.$q.defer();
        if (this.hasNetworkConnection()) {
            def.resolve(this.netService.getData(req));
        }
        else {
            console.log('Server unavailable');
            // this.$rootScope.$broadcast('noNetwork');
            def.reject();
        }
        return def.promise;
    };
    DataProviderService.prototype.postData = function (req, data, config) {
        var _this = this;
        var def = this.$q.defer();
        var response = this.netService.postData(req, data, config);
        if (this.hasNetworkConnection()) {
            response.then(function (httpResponse) {
            }, function (error) {
                console.log('Server unavailable');
                // broadcast server is unavailable
                _this.$rootScope.$broadcast('serverNotAvailable');
                def.reject();
            });
        }
        else {
            def.reject();
        }
        return def.promise;
    };
    DataProviderService.prototype.deleteData = function (req) {
        var def = this.$q.defer();
        if (this.hasNetworkConnection()) {
            def.resolve(this.netService.deleteData(req));
        }
        else {
            console.log('Server unavailable');
            def.reject();
        }
        return def.promise;
    };
    DataProviderService.prototype.hasNetworkConnection = function () {
        return (navigator.onLine || this.isConnectedToNetwork);
    };
    // TODO: remove this temp method and use generics
    DataProviderService.prototype.addMetaInfo = function (requestData) {
        var device = ionic.Platform.device();
        var model = '';
        var osType = '';
        var osVersion = '';
        var deviceToken = '';
        if (device) {
            model = ionic.Platform.device().model;
            osType = ionic.Platform.device().platform;
            osVersion = ionic.Platform.device().version;
        }
        var metaInfo = {
            'channelIdentifier': 'MOB',
            'dateTimeStamp': new Date().getTime(),
            'ownerCarrierCode': this.OWNER_CARRIER_CODE,
            'additionalInfo': {
                'deviceType': window.isTablet ? 'Tablet' : 'Phone',
                'model': model,
                'osType': osType,
                'osVersion': osVersion,
                'deviceToken': deviceToken,
            }
        };
        var requestObj = {
            'metaInfo': metaInfo,
            'requestData': requestData
        };
        return requestObj;
    };
    DataProviderService.prototype.isLogoutService = function (requestUrl) {
        return dataprovider.SERVICE_URL_LOGOUT == requestUrl;
    };
    DataProviderService.$inject = ['NetService', 'CordovaService', '$q', '$rootScope', 'ErrorHandlerService', 'SessionService', 'OWNER_CARRIER_CODE'];
    return DataProviderService;
})();

/// <reference path="../../_libs.ts" />
/// <reference path="../utils/Utils.ts" />
/// <reference path="../../common/services/LocalStorageService.ts" />
/// <reference path="../../common/services/DataProviderService.ts" />
/// <reference path="../../common/services/ErrorHandlerService.ts" />
var AppController = (function () {
    function AppController($state, $scope, dataProviderService, $ionicPlatform, localStorageService, $ionicPopup, $ionicLoading, $ionicHistory, errorHandlerService) {
        this.$state = $state;
        this.$scope = $scope;
        this.dataProviderService = dataProviderService;
        this.localStorageService = localStorageService;
        this.$ionicPopup = $ionicPopup;
        this.$ionicLoading = $ionicLoading;
        this.$ionicHistory = $ionicHistory;
        this.errorHandlerService = errorHandlerService;
        var that = this;
    }
    AppController.prototype.isNotEmpty = function (value) {
        return Utils.isNotEmpty(value);
    };
    AppController.prototype.hasNetworkConnection = function () {
        return this.dataProviderService.hasNetworkConnection();
    };
    AppController.prototype.logout = function () {
        this.$state.go("login");
    };
    AppController.$inject = ['$state', '$scope', 'DataProviderService',
        '$ionicModal', '$ionicPlatform', 'LocalStorageService', '$ionicPopup',
        '$ionicLoading', '$ionicHistory', 'ErrorHandlerService'];
    return AppController;
})();

/// <reference path="./_libs.ts" />
/// <reference path="./common/app/AppController.ts" />
/// <reference path="./common/services/CordovaService.ts" />
/// <reference path="./common/services/LocalStorageService.ts" />
/// <reference path="./common/services/SessionService.ts"/>
/// <reference path="./common/services/ErrorHandlerService.ts"/>
var SERVER_URL = 'http://10.91.152.99:8082/rapid-ws/services/rest';
angular.module('rapidMobile', ['ionic', 'tabSlideBox', 'nvd3ChartDirectives', 'nvd3'])
    .run(function ($ionicPlatform, $http) {
    $http.defaults.headers.common.token = 'token';
    $http.defaults.headers.post["Content-Type"] = "application/json";
    $ionicPlatform.ready(function () {
        if (typeof navigator.globalization !== 'undefined') {
        }
    });
})
    .config(function ($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
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
        controller: 'LoginController'
    })
        .state('app.mis-flown', {
        url: '/mis/flown',
        views: {
            'menuContent': {
                templateUrl: 'components/mis/flown.html',
                controller: 'MisController'
            }
        }
    })
        .state('app.operational-flown', {
        url: '/operational/flown',
        views: {
            'menuContent': {
                templateUrl: 'components/operational/flown/flown.html',
                controller: 'OperationalFlownController'
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
    .controller('AppController', AppController);
// .directive('fetchList', FetchList.factory())
ionic.Platform.ready(function () {
    if (window.cordova && window.cordova.plugins.Keyboard) {
    }
    _.defer(function () {
        angular.bootstrap(document, ['rapidMobile']);
    });
});



(function () {
    'use strict';
    angular.module('rapidMobile').controller('MisController', ['$scope',
        'MisService', 'ChartOptions',
        '$ionicLoading', '$timeout', '$window',
        '$ionicPopover', 'FilteredListService',
        '$filter', 'LoginService',
        MisController]);
    function MisController($scope, MisService, ChartOptions, $ionicLoading, $timeout, $window, $ionicPopover, FilteredListService, $filter, LoginService) {
        $scope.tabs = [{
                title: 'My Dashboard',
                names: 'MyDashboard',
                icon: 'iconon-home'
            },
            {
                title: 'Metric Snapshot',
                names: 'MetricSnapshot',
                icon: 'ion-home'
            },
            {
                title: 'Target Vs Actual',
                names: 'TargetVsActual',
                icon: 'ion-home'
            },
            {
                title: 'Revenue Analysis',
                names: 'RevenueAnalysis',
                icon: 'ion-home'
            },
            {
                title: 'Sector & Carrier Analysis',
                names: 'SectorAndCarrierAnalysis',
                icon: 'ion-home'
            },
            {
                title: 'Route Revenue',
                names: 'RouteRevenue',
                icon: 'ion-home'
            }
        ];
        $scope.toggle = {
            monthOrYear: 'month',
            targetRevOrPax: 'revenue',
            sectorOrder: 'top5',
            sectorRevOrPax: 'revenue'
        };
        $scope.options = {
            metric: ChartOptions.metricBarChart.options(),
            targetLineChart: ChartOptions.lineChart.options(),
            targetBarChart: ChartOptions.targetBarChart.options(),
            passengerChart: ChartOptions.passengerCountChart.options()
        };
        $scope.header = {
            flownMonth: '',
            surcharge: false,
            tabIndex: 0,
            headerIndex: 0,
            username: LoginService.getUser().username
        };
        MisService.getPaxFlownMisHeader({ userId: $scope.header.username })
            .then(function (data) {
            $scope.subHeader = data.response.data;
            console.log($scope.subHeader);
            $scope.header.flownMonth = $scope.subHeader.paxFlownMisMonths[0].flowMonth;
        }, function (error) {
            console.log('Error ');
        });
        $scope.$watchCollection('[header.flownMonth, header.surcharge]', function (newVal, oldVal) {
            $scope.onSlideMove({ index: $scope.header.tabIndex });
        });
        $scope.updateHeader = function () {
            $scope.header.headerIndex = _.findIndex($scope.subHeader.paxFlownMisMonths, function (chr) {
                return chr.flowMonth == $scope.header.flownMonth;
            });
        };
        $scope.onSlideMove = function (data) {
            $scope.header.tabIndex = data.index;
            switch ($scope.header.tabIndex) {
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
        $scope.toggleMetric = function (val) {
            $scope.toggle.monthOrYear = val;
            $scope.onSlideMove({ index: $scope.header.tabIndex });
        };
        $scope.toggleTarget = function (val) {
            $scope.toggle.targetRevOrPax = val;
        };
        $scope.toggleSector = function (val) {
            $scope.toggle.sectorRevOrPax = val;
        };
        $scope.callMetricSnapshot = function () {
            var reqdata = {
                flownMonth: $scope.header.flownMonth,
                includeSurcharge: ($scope.header.surcharge) ? 'Y' : 'N',
                userId: $scope.header.username,
                toggle1: $scope.toggle.monthOrYear,
                fullDataFlag: 'N'
            };
            $scope.ionicLoadingShow();
            MisService.getMetricSnapshot(reqdata)
                .then(function (data) {
                // fav Items to display in dashboard
                $scope.metricResult = _.sortBy(data.response.data.MetricSnapshotCharts, function (u) {
                    if (u)
                        return [u.favoriteChartPosition];
                });
                _.forEach($scope.metricResult, function (n, value) {
                    n.values[0].color = '#4A90E2';
                    n.values[1].color = '#50E3C2';
                    if (n.values[2])
                        n.values[2].color = '#B8E986';
                });
                $scope.favMetricResult = _.filter($scope.metricResult, function (u) {
                    if (u)
                        return u.favoriteInd == 'Y';
                });
                $scope.metricLegends = data.response.data.legends;
                if ($scope.header.tabIndex == 0)
                    $scope.metricResult = $scope.favMetricResult;
                $scope.ionicLoadingHide();
            }, function (error) {
            });
        };
        $scope.callTargetVsActual = function () {
            var reqdata = {
                flownMonth: $scope.header.flownMonth,
                includeSurcharge: ($scope.header.surcharge) ? 'Y' : 'N',
                userId: $scope.header.username,
                toggle1: 'string',
                fullDataFlag: 'string'
            };
            $scope.ionicLoadingShow();
            MisService.getTargetVsActual(reqdata)
                .then(function (data) {
                // fav Items to display in dashboard
                $scope.favTargetLineResult = _.filter(data.response.data.lineCharts, function (u) {
                    if (u)
                        return u.favoriteInd == 'Y';
                });
                $scope.favTargetBarResult = _.filter(data.response.data.verBarCharts, function (u) {
                    if (u)
                        return u.favoriteInd == 'Y';
                });
                _.forEach(data.response.data.verBarCharts, function (n, value) {
                    n.values[0].color = '#4A90E2';
                    n.values[1].color = '#50E3C2';
                });
                var lineColors = [{ "color": "#4A90E2", "classed": "dashed", "strokeWidth": 2 },
                    { "color": "#50E3C2" }, { "color": "#B8E986", "area": true, "disabled": true }];
                _.forEach(data.response.data.lineCharts, function (n, value) {
                    _.merge(n.lineChartItems, lineColors);
                });
                console.log(data.response.data.lineCharts);
                $scope.targetActualData = {
                    horBarChart: data.response.data.verBarCharts,
                    lineChart: data.response.data.lineCharts
                };
                $scope.ionicLoadingHide();
            }, function (error) {
                console.log('Error ');
                $scope.ionicLoadingHide();
            });
        };
        $scope.callRouteRevenue = function () {
            var routeRevRequest = {
                flownMonth: $scope.header.flownMonth,
                includeSurcharge: ($scope.header.surcharge) ? 'Y' : 'N',
                userId: $scope.header.username
            };
            MisService.getRouteRevenue(routeRevRequest)
                .then(function (data) {
                $scope.routeRevData = data.response.data;
            }, function (error) {
                console.log('Error ');
            });
        };
        $scope.callRevenueAnalysis = function () {
            var reqdata = {
                flownMonth: $scope.header.flownMonth,
                includeSurcharge: ($scope.header.surcharge) ? 'Y' : 'N',
                userId: $scope.header.username,
                toggle1: '',
                fullDataFlag: 'N'
            };
            $scope.ionicLoadingShow();
            MisService.getRevenueAnalysis(reqdata)
                .then(function (data) {
                // fav Items to display in dashboard
                var jsonObj = data.response.data;
                var sortedData = _.sortBy(jsonObj.multibarCharts, function (u) {
                    if (u)
                        return [u.favoriteChartPosition];
                });
                var favRevenueBarResult = _.filter(sortedData, function (u) {
                    if (u)
                        return u.favoriteInd == 'Y';
                });
                var sortedData = _.sortBy(jsonObj.pieCharts, function (u) {
                    if (u)
                        return [u.favoriteChartPosition];
                });
                var favRevenuePieResult = _.filter(sortedData, function (u) {
                    if (u)
                        return u.favoriteInd == 'Y';
                });
                _.forEach(jsonObj.multibarCharts, function (n, value) {
                    n.multibarChartItems[0].color = '#4A90E2';
                    n.multibarChartItems[1].color = '#50E3C2';
                });
                var pieColors = [{ "color": "#28b6f6" }, { "color": "#7bd4fc" }, { "color": "#C6E5FA" }];
                _.forEach(jsonObj.pieCharts[0].data, function (n, value) {
                    n.label = n.xval;
                    n.value = n.yval;
                });
                _.merge(jsonObj.pieCharts[0].data, pieColors);
                $scope.revenueData = {
                    revenuePieChart: jsonObj.pieCharts[0],
                    revenueBarChart: jsonObj.multibarCharts[1].multibarChartItems,
                    revenueHorBarChart: jsonObj.multibarCharts[2].multibarChartItems
                };
                $scope.ionicLoadingHide();
            }, function (error) {
                $scope.ionicLoadingHide();
                console.log('Error ');
            });
        };
        $scope.openDrillDown = function (regionData, selFindLevel) {
            $scope.selectedDrill[selFindLevel] = regionData;
            $scope.selectedDrill[selFindLevel + 1] = '';
            if (selFindLevel != '3') {
                var drillLevel = (selFindLevel + 2);
                $scope.regionName = (regionData.regionName) ? regionData.regionName : regionData.heading1;
                var countryFromTo = (regionData.countryFrom && regionData.countryTo) ? regionData.countryFrom + '-' + regionData.countryTo : "";
                var sectorFromTo = (regionData.flownSector && drillLevel >= 3) ? regionData.flownSector : "";
                var flightNumber = (regionData.flightNumber && drillLevel == 4) ? regionData.flightNumber : "";
                $scope.ionicLoadingShow();
                var reqdata = {
                    "flownMonth": $scope.header.flownMonth,
                    "includeSurcharge": ($scope.header.surcharge) ? 'Y' : 'N',
                    "userId": $scope.header.username,
                    "fullDataFlag": "string",
                    "drillLevel": drillLevel,
                    "pageNumber": 0,
                    "regionName": ($scope.regionName) ? $scope.regionName : "North America",
                    "countryFromTo": countryFromTo,
                    "sectorFromTo": sectorFromTo,
                    "flightNumber": flightNumber,
                    "flightDate": 0
                };
                MisService.getRouteRevenueDrillDown(reqdata)
                    .then(function (data) {
                    $scope.ionicLoadingHide();
                    var data = data.response;
                    console.log(data);
                    var findLevel = drillLevel - 1;
                    console.log(data.status);
                    if (data.status == 'success') {
                        $scope.groups[findLevel].items[0] = data.data.rows;
                        $scope.groups[findLevel].orgItems[0] = data.data.rows;
                        $scope.shownGroup = findLevel;
                        $scope.sort('paxCount', findLevel, false);
                        $scope.clearDrill(drillLevel);
                    }
                    else {
                        $scope.shownGroup = findLevel;
                        $scope.clearDrill(findLevel);
                    }
                }, function (error) {
                    $scope.ionicLoadingHide();
                    $scope.closesPopover();
                    console.log(error);
                    alert('Server Error');
                });
            }
        };
        $scope.clearDrill = function (level) {
            for (i = level; i <= 3; i++) {
                $scope.groups[i].items.splice(0, 1);
                $scope.groups[i].orgItems.splice(0, 1);
                $scope.sort('paxCount', i, false);
            }
            console.log($scope.groups);
        };
        $scope.openPopover = function ($event, index, charttype) {
            $event.preventDefault();
            $scope.charttype = charttype;
            $scope.graphindex = index;
            $ionicPopover.fromTemplateUrl('components/mis/graph-popover.html', {
                scope: $scope
            }).then(function (popover) {
                $scope.popovershown = true;
                $scope.graphpopover = popover;
                $scope.graphpopover.show($event);
            });
        };
        $scope.openSectorPopover = function ($event, index, charttype) {
            $scope.charttype = charttype;
            $scope.graphindex = index;
            $ionicPopover.fromTemplateUrl('components/mis/sector-graph-popover.html', {
                scope: $scope
            }).then(function (popover) {
                $scope.popovershown = true;
                $scope.graphpopover = popover;
                $scope.graphpopover.show($event);
            });
        };
        $scope.callSectorCarrierAnalysis = function () {
            var reqdata = {
                flownMonth: $scope.header.flownMonth,
                includeSurcharge: ($scope.header.surcharge) ? 'Y' : 'N',
                userId: $scope.header.username,
                toggle1: 'string',
                toggle2: 'string',
                fullDataFlag: 'N'
            };
            $scope.ionicLoadingShow();
            MisService.getSectorCarrierAnalysis(reqdata)
                .then(function (data) {
                // fav Items to display in dashboard
                var jsonObj = data.response.data;
                _.forEach(jsonObj.SectorCarrierAnalysisCharts, function (val, i) {
                    val['others'] = val.items.splice(-1, 1);
                });
                var sortedData = _.sortBy(jsonObj.SectorCarrierAnalysisCharts, function (u) {
                    if (u)
                        return [u.favoriteChartPosition];
                });
                var favSectorCarrierResult = _.filter(sortedData, function (u) {
                    if (u)
                        return u.favoriteInd == 'Y';
                });
                $scope.SectorCarrierAnalysisCharts = jsonObj.SectorCarrierAnalysisCharts;
                $scope.ionicLoadingHide();
            }, function (error) {
                $scope.ionicLoadingHide();
                console.log('Error ');
            });
        };
        $scope.targetActualFilter = function (item) {
            if (item.toggle1 == $scope.toggle.targetRevOrPax) {
                //$scope.$index = 1;
                return true;
            }
            return false;
        };
        $scope.sectorCarrierFilter = function (item) {
            // console.log(item);
            if (item.toggle1 == $scope.toggle.sectorOrder &&
                item.toggle2 == $scope.toggle.sectorRevOrPax) {
                return true;
            }
            return false;
        };
        $scope.revenueAnalysisFilter = function (item) {
            var surchargeFlag = ($scope.header.surcharge) ? "Y" : "N";
            // console.log(surchargeFlag+' : '+item);
            if (item.surchargeFlag == surchargeFlag) {
                return true;
            }
            return false;
        };
        $scope.getFlownFavorites = function () {
            $scope.callMetricSnapshot();
            $scope.callTargetVsActual();
            $scope.callRevenueAnalysis();
        };
        $scope.ionicLoadingShow = function () {
            $ionicLoading.show({
                template: '<ion-spinner class="spinner-calm"></ion-spinner>'
            });
        };
        $scope.ionicLoadingHide = function () {
            $ionicLoading.hide();
        };
        //refresh charts
        /* angular.element(window).on('resize', function(e, scope) {
             $event.preventDefault();
             $scope.onSlideMove({index: $scope.header.tabIndex});
         });*/
        angular.element(window).bind('orientationchange', function (e, scope) {
            $scope.onSlideMove({ index: $scope.header.tabIndex });
        });
        /* -------- Info popover ----*/
        $ionicPopover.fromTemplateUrl('components/mis/infotooltip.html', {
            scope: $scope
        }).then(function (infopopover) {
            $scope.infopopover = infopopover;
        });
        $scope.openinfoPopover = function ($event, index) {
            if (typeof index == "undefined" || index == "") {
                $scope.infodata = 'No info available';
            }
            else {
                $scope.infodata = index;
            }
            console.log(index);
            $scope.infopopover.show($event);
        };
        $scope.closePopover = function () {
            $scope.graphpopover.hide();
        };
        $scope.closeInfoPopover = function () {
            $scope.infopopover.hide();
        };
        /* drilldown */
        $ionicPopover.fromTemplateUrl('components/mis/drildown.html', {
            scope: $scope
        }).then(function (drillpopover) {
            $scope.drillpopover = drillpopover;
        });
        $scope.drilltabs = ['Country Level', 'Sector Level', 'Flight Level', 'Document Level'];
        $scope.openDrillDownPopover = function ($event, regionData, selFindLevel) {
            $scope.drillpopover.show($event);
            $scope.openDrillDown(regionData, selFindLevel);
        };
        $scope.closesPopover = function () {
            $scope.drillpopover.hide();
        };
        $scope.pageSize = 4;
        $scope.currentPage = [];
        $scope.selectedDrill = [];
        $scope.groups = [];
        for (var i = 0; i <= 3; i++) {
            $scope.groups[i] = {
                id: i,
                name: $scope.drilltabs[i],
                items: [],
                orgItems: [],
                ItemsByPage: []
            };
        }
        $scope.isDrillRowSelected = function (level, obj) {
            return $scope.selectedDrill[level] == obj;
        };
        $scope.searchResults = function (level, obj) {
            $scope.groups[level].items[0] = FilteredListService.searched($scope.groups[level].orgItems[0], obj.searchText, level);
            if (obj.searchText == '') {
                $scope.resetAll(level);
                $scope.groups[level].items[0] = $scope.groups[level].orgItems[0];
            }
            $scope.currentPage[level] = 0;
            $scope.pagination(level);
        };
        $scope.pagination = function (level) {
            $scope.groups[level].ItemsByPage = FilteredListService.paged($scope.groups[level].items[0], $scope.pageSize);
        };
        $scope.setPage = function (level) {
            $scope.currentPage[level] = this.n;
        };
        $scope.firstPage = function () {
            $scope.currentPage = 0;
        };
        $scope.lastPage = function (level) {
            $scope.currentPage[level] = $scope.groups[level].ItemsByPage.length - 1;
        };
        $scope.resetAll = function (level) {
            $scope.currentPage[level] = 0;
        };
        $scope.sort = function (sortBy, level, order) {
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
        $scope.toggleGroup = function (group) {
            if ($scope.isGroupShown(group)) {
                $scope.shownGroup = null;
            }
            else {
                $scope.shownGroup = group;
            }
        };
        $scope.isGroupShown = function (group) {
            return $scope.shownGroup === group;
        };
    }
    ;
})();

(function () {
    'use strict';
    angular.module('rapidMobile')
        .directive('heProgressBar', function () {
        var directiveDefinitionObject = {
            restrict: 'E',
            replace: false,
            scope: { data: '=chartData', showtooltip: '@showTooltip' },
            link: function (scope, element, attrs) {
                var x = d3.scale.linear()
                    .domain([0, d3.max(scope.data, function (d) { return +d.progress; })])
                    .range([0, 90]);
                var segment = d3.select(element[0])
                    .selectAll(".horizontal-bar-graph-segment")
                    .data(scope.data)
                    .enter()
                    .append("div")
                    .classed("horizontal-bar-graph-segment", true);
                segment.append("div").classed("horizontal-bar-graph-label", true)
                    .text(function (d) { return d.name; });
                var barSegment = segment.append("div").classed("horizontal-bar-graph-value", true)
                    .append("div").classed("horizontal-bar-graph-value-scale", true)
                    .append("div").classed("horizontal-bar-graph-value-bar", true);
                barSegment
                    .style("background-color", function (d) { return d.color; })
                    .transition()
                    .duration(1000)
                    .style("min-width", function (d) { return x(+d.progress) + "%"; });
                var boxSegment = barSegment.append("span").classed("horizontal-bar-graph-value-box", true)
                    .text(function (d) { return d.progress ? d.progress : ""; });
                if (scope.showtooltip !== 'true')
                    return;
                var btnSegment = segment.append("button")
                    .classed("horizontal-bar-graph-icon icon ion-chevron-down no-border", true)
                    .classed("hide", function (d) {
                    if (d)
                        return d.drillFlag == 'N';
                });
                var tooltipSegment = segment.append("div")
                    .classed("tooltip", true)
                    .classed('hide', true);
                tooltipSegment.append("p").text(function (d) { return d.name; });
                var table = tooltipSegment.append("table");
                var thead = table.append('tr');
                thead.append('th').text('Sector');
                thead.append('th').text('Revenue');
                var tr = table
                    .append('tbody')
                    .selectAll("tr")
                    .data(function (d) { return d.scAnalysisDrills; })
                    .enter().append("tr");
                var sectorTd = tr.append("td")
                    .text(function (d) { return d.sector; });
                var revenueTd = tr.append("td")
                    .text(function (d) { return d.revenue; });
                btnSegment.on('click', function () {
                    // console.log(tooltipSegment);
                    if (angular.element(this).next().hasClass('show')) {
                        angular.element(this).removeClass('ion-chevron-up');
                        angular.element(this).addClass('ion-chevron-down');
                        angular.element(this).next().removeClass('show');
                        angular.element(this).next().addClass('hide');
                    }
                    else {
                        angular.element(this).removeClass('ion-chevron-down');
                        angular.element(this).addClass('ion-chevron-up');
                        angular.element(this).next().removeClass('hide');
                        angular.element(this).next().addClass('show');
                    }
                });
            }
        };
        return directiveDefinitionObject;
    });
})();

(function () {
    'use strict';
    angular.module('rapidMobile')
        .directive('heRevenueProgressBar', function () {
        var revBarObject = {
            restrict: 'E',
            replace: false,
            scope: { data: '=chartData' },
            link: function (scope, element, attrs) {
                // console.log(scope.data);
                scope.$watch('data', function (newValue, oldValue) {
                    if (newValue) {
                        // console.log('newValue', newValue);
                        var x = d3.scale.linear()
                            .domain([0, d3.max(scope.data, function (d) { return d.value; })])
                            .range([0, 90]);
                        var segment = d3.select(element[0])
                            .selectAll(".net-rev-bar-graph-segment")
                            .data(scope.data)
                            .enter()
                            .append("div")
                            .classed("net-rev-bar-graph-segment", true);
                        segment.append("div").classed("net-rev-bar-graph-label", true)
                            .text(function (d) { return d.name; });
                        var barSegment = segment.append("div").classed("net-rev-bar-graph-value", true)
                            .append("div").classed("net-rev-bar-graph-value-scale", true)
                            .append("div").classed("net-rev-bar-graph-value-bar", true)
                            .classed("net-rev-bar-graph-value-box", true)
                            .text(function (d) { return d.value; });
                        barSegment
                            .style("background-color", function (d) { return d.color; })
                            .transition()
                            .duration(1000)
                            .style("min-width", function (d) { return x(d.value) + "%"; });
                    }
                }, true);
            }
        };
        return revBarObject;
    });
})();

(function () {
    angular.module('rapidMobile').factory('FilteredListService', function (DataProviderService, $q) {
        return {
            searched: function (valLists, toSearch, level) {
                return _.filter(valLists, function (i) {
                    /* Search Text in all 3 fields */
                    return searchUtil(i, toSearch, level);
                });
            },
            paged: function (valLists, pageSize) {
                retVal = [];
                if (valLists) {
                    for (var i = 0; i < valLists.length; i++) {
                        if (i % pageSize === 0) {
                            retVal[Math.floor(i / pageSize)] = [valLists[i]];
                        }
                        else {
                            retVal[Math.floor(i / pageSize)].push(valLists[i]);
                        }
                    }
                }
                return retVal;
            }
        };
    });
})();
function searchUtil(item, toSearch, level) {
    /* Search Text in all 3 fields */
    if (item.countryFrom && item.countryTo && level == 0) {
        return (item.countryFrom.toLowerCase().indexOf(toSearch.toLowerCase()) > -1 || item.countryTo.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
    }
    else if (item.flownSector && level == 1) {
        return (item.flownSector.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
    }
    else if (item.flightNumber && level == 2) {
        return (item.flightNumber.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
    }
    else if (item['document#'] && level == 2) {
        return (item['document#'].toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
    }
    else {
        return false;
    }
}

(function () {
    angular.module('rapidMobile').factory('LoginService', function (DataProviderService, $q, $window) {
        var _user = JSON.parse($window.localStorage.getItem('rapidMobile.user'));
        var setUser = function (user) {
            _user = user;
            if ($window.localStorage) {
                $window.localStorage.setItem('rapidMobile.user', JSON.stringify(_user));
            }
            // console.log(_user);
        };
        return {
            getLoginUser: function (reqdata) {
                return DataProviderService.postData('/user/login', reqdata)
                    .then(function (response) {
                    if (typeof response.data === 'object') {
                        return response.data;
                    }
                    else {
                        // invalid response
                        return $q.reject(response.data);
                    }
                }, function (response) {
                    // something went wrong
                    console.log('an error occured on log in');
                    return $q.reject(response.data);
                });
            },
            setUser: setUser,
            isLoggedIn: function () {
                return _user ? true : false;
            },
            getUser: function () {
                return _user;
            },
            logout: function () {
                $window.localStorage.setItem('rapidMobile.user', null);
                _user = null;
            },
            getUserProfile: function (reqdata) {
                return DataProviderService.postData('/user/userprofile', reqdata)
                    .then(function (response) {
                    if (typeof response.data === 'object') {
                        return response.data;
                    }
                    else {
                        // invalid response
                        return $q.reject(response.data);
                    }
                }, function (response) {
                    // something went wrong
                    return $q.reject(response.data);
                });
            }
        };
    });
})();

(function () {
    angular.module('rapidMobile').factory('MisService', function (DataProviderService, $q) {
        return {
            getMetricSnapshot: function (reqdata) {
                // the $http API is based on the deferred/promise APIs exposed by the $q service
                // so it returns a promise for us by default
                return DataProviderService.postData('/paxflnmis/metricsnapshot', reqdata)
                    .then(function (response) {
                    if (typeof response.data === 'object') {
                        return response.data;
                    }
                    else {
                        // invalid response
                        return $q.reject(response.data);
                    }
                }, function (response) {
                    // something went wrong
                    return $q.reject(response.data);
                });
            },
            getTargetVsActual: function (reqdata) {
                return DataProviderService.postData('/paxflnmis/targetvsactual', reqdata)
                    .then(function (response) {
                    if (typeof response.data === 'object') {
                        return response.data;
                    }
                    else {
                        // invalid response
                        return $q.reject(response.data);
                    }
                }, function (response) {
                    // something went wrong
                    return $q.reject(response.data);
                });
            },
            getRevenueAnalysis: function (reqdata) {
                return DataProviderService.postData('/paxflnmis/revenueanalysis', reqdata)
                    .then(function (response) {
                    if (typeof response.data === 'object') {
                        return response.data;
                    }
                    else {
                        // invalid response
                        return $q.reject(response.data);
                    }
                }, function (response) {
                    // something went wrong
                    return $q.reject(response.data);
                });
            },
            getRouteRevenue: function (reqdata) {
                return DataProviderService.postData('/paxflnmis/routerevenue', reqdata)
                    .then(function (response) {
                    if (typeof response.data === 'object') {
                        return response.data;
                    }
                    else {
                        // invalid response
                        return $q.reject(response.data);
                    }
                }, function (response) {
                    // something went wrong
                    return $q.reject(response.data);
                });
            },
            getSectorCarrierAnalysis: function (reqdata) {
                return DataProviderService.postData('/paxflnmis/sectorcarrieranalysis', reqdata)
                    .then(function (response) {
                    if (typeof response.data === 'object') {
                        return response.data;
                    }
                    else {
                        // invalid response
                        return $q.reject(response.data);
                    }
                }, function (response) {
                    // something went wrong
                    return $q.reject(response.data);
                });
            },
            getPaxFlownMisHeader: function (reqdata) {
                return DataProviderService.postData('/paxflnmis/paxflownmisheader', reqdata)
                    .then(function (response) {
                    if (typeof response.data === 'object') {
                        return response.data;
                    }
                    else {
                        // invalid response
                        return $q.reject(response.data);
                    }
                }, function (response) {
                    // something went wrong
                    return $q.reject(response.data);
                });
            },
            getRouteRevenueDrillDown: function (reqdata) {
                return DataProviderService.postData('/paxflnmis/routerevenuedrill', reqdata)
                    .then(function (response) {
                    if (typeof response.data === 'object') {
                        return response.data;
                    }
                    else {
                        // invalid response
                        return $q.reject(response.data);
                    }
                }, function (response) {
                    // something went wrong
                    return $q.reject(response.data);
                });
            }
        };
    });
})();

(function () {
    angular.module('rapidMobile')
        .controller('LoginController', function ($scope, $state, LoginService) {
        // Form data for the login modal
        $scope.loginData = {};
        $scope.invalidMessage = false;
        $scope.logout = function () {
            LoginService.logout();
            $state.go("login");
        };
        $scope.clearError = function () {
            $scope.invalidMessage = false;
        };
        // Perform the login action when the user submits the login form
        $scope.doLogin = function (loginForm) {
            if (loginForm.$valid) {
                // LoginService.setUser({username: ""});
                if (!angular.isDefined($scope.loginData.username) || !angular.isDefined($scope.loginData.password) || $scope.loginData.username.trim() == "" || $scope.loginData.password.trim() == "") {
                    $scope.invalidMessage = true;
                }
                reqdata = {
                    userId: $scope.loginData.username,
                    password: $scope.loginData.password
                };
                // SERVER_URL = 'http://'+$scope.loginData.ipaddress+'/v1/api';
                // console.log(SERVER_URL);
                LoginService.getLoginUser(reqdata)
                    .then(function (data) {
                    if (data.response.status == "success") {
                        var req = {
                            userId: $scope.loginData.username
                        };
                        LoginService.getUserProfile(req)
                            .then(function (data) {
                            LoginService.setUser({
                                username: data.response.data.userInfo.userName
                            });
                            $state.go("app.mis-flown");
                        }, function (error) {
                            console.log(error);
                        });
                    }
                    else {
                        $scope.invalidMessage = true;
                        $scope.eroormessage = "Please check your credentials";
                    }
                }, function (error) {
                    $scope.invalidMessage = true;
                    $scope.eroormessage = "Please check your network connection";
                });
            }
            else {
                $scope.invalidMessage = true;
                $scope.eroormessage = "Please check your credentials";
            }
        };
    });
})();

(function () {
    angular.module('rapidMobile').factory('ChartOptions', function () {
        return {
            lineChart: {
                options: lineChartOptions
            },
            metricBarChart: {
                options: metricBarChartOptions
            },
            targetBarChart: {
                options: targetBarChartOptions
            },
            passengerCountChart: {
                options: multiBarChartOptions
            }
        };
        function lineChartOptions() {
            return {
                chart: {
                    type: 'lineChart',
                    height: 250,
                    margin: {
                        top: 5,
                        right: 50,
                        bottom: 50,
                        left: 50
                    },
                    x: function (d) { return d.xval; },
                    y: function (d) { return d.yval; },
                    useInteractiveGuideline: true,
                    dispatch: {
                        stateChange: function (e) { console.log("stateChange"); },
                        changeState: function (e) { console.log("changeState"); },
                        tooltipShow: function (e) { console.log("tooltipShow"); },
                        tooltipHide: function (e) { console.log("tooltipHide"); }
                    },
                    xAxis: {
                        tickFormat: function (d) {
                            return d3.time.format('%b')(new Date(d));
                        }
                    },
                    yAxis: {
                        axisLabel: '',
                        tickFormat: function (d) {
                            return d3.format('.02f')(d);
                        },
                        axisLabelDistance: -10
                    }
                }
            };
        }
        function multiBarChartOptions() {
            return {
                chart: {
                    type: 'multiBarChart',
                    height: 250,
                    width: 300,
                    margin: {
                        top: 10,
                        right: 25,
                        bottom: 30,
                        left: 25
                    },
                    showLegend: false,
                    x: function (d) { return d.label; },
                    y: function (d) { return d.value + (1e-10); },
                    showValues: true,
                    reduceXTicks: false,
                    showControls: false,
                    valueFormat: function (d) {
                        return d3.format(',.4f')(d);
                    },
                    xAxis: {
                        axisLabelDistance: 30
                    },
                    showYAxis: false,
                    showXAxis: true,
                    duration: 700
                }
            };
        }
        function metricBarChartOptions() {
            return {
                chart: {
                    type: 'discreteBarChart',
                    height: 200,
                    margin: {
                        top: 20,
                        right: 25,
                        bottom: 0,
                        left: 25
                    },
                    x: function (d) { return d.label; },
                    y: function (d) { return d.value; },
                    useInteractiveGuideline: true,
                    showValues: true,
                    valueFormat: function (d) {
                        return d3.format(',.2f')(d);
                    },
                    tooltip: {
                        enabled: true
                    },
                    showYAxis: false,
                    showXAxis: false,
                    duration: 700
                }
            };
        }
        function targetBarChartOptions() {
            return {
                chart: {
                    type: 'discreteBarChart',
                    height: 250,
                    margin: {
                        top: 20,
                        right: 50,
                        bottom: 20,
                        left: 75
                    },
                    useInteractiveGuideline: true,
                    x: function (d) { return d.label; },
                    y: function (d) { return d.value + (1e-10); },
                    showValues: true,
                    showYAxis: false,
                    valueFormat: function (d) {
                        return d3.format(',.2f')(d);
                    },
                    duration: 700
                }
            };
        }
    });
})();

(function () {
    angular.module('rapidMobile').factory('DataProviderService', function ($http, $q, $rootScope, NetService) {
        return {
            netService: NetService,
            $q: $q,
            $rootScope: $rootScope,
            isConnectedToNetwork: true,
            getData: function (req) {
                var def = this.$q.defer();
                if (this.hasNetworkConnection()) {
                    def.resolve(this.netService.getData(req));
                }
                else {
                    this.$rootScope.$broadcast('noNetwork');
                    def.reject();
                }
                return def.promise;
            },
            postData: function (req, data) {
                var def = this.$q.defer();
                if (this.hasNetworkConnection()) {
                    def.resolve(this.netService.postData(req, data));
                }
                else {
                    console.log('Server unavailable');
                    this.$rootScope.$broadcast('noNetwork');
                    def.reject();
                }
                return def.promise;
            },
            deleteData: function (req) {
                var def = this.$q.defer();
                if (this.hasNetworkConnection()) {
                    def.resolve(this.netService.deleteData(req));
                }
                else {
                    console.log('Server unavailable');
                    this.$rootScope.$broadcast('noNetwork');
                    def.reject();
                }
                return def.promise;
            },
            hasNetworkConnection: function () {
                return (navigator.onLine || this.isConnectedToNetwork);
            }
        };
    });
})();

(function () {
    angular.module('rapidMobile').factory('NetService', function ($http, $q, $rootScope) {
        return {
            getData: function (fromUrl) {
                var url = SERVER_URL + fromUrl;
                return $http.get(url);
            },
            postData: function (toUrl, data) {
                // console.log(this.addMetaInfo(data));
                return $http.post(SERVER_URL + toUrl, this.addMetaInfo(data));
            },
            deleteData: function (toUrl) {
                return $http.delete(SERVER_URL + toUrl);
            },
            addMetaInfo: function (requestData) {
                var metaInfo = {
                    'channelIdentifier': 'MOB',
                    'dateTimeStamp': new Date().getTime(),
                    'ownerCarrierCode': 'XX',
                    'additionalInfo': {
                        'deviceType': 'Phone',
                        'model': 'device Info',
                        'osType': 'ios',
                        'osVersion': '8.4',
                        "deviceToken": "string"
                    }
                };
                var requestObj = {
                    'metaInfo': metaInfo,
                    'requestData': requestData
                };
                return requestObj;
            }
        };
    });
})();

(function () {
    'use strict';
    angular.module('rapidMobile').controller('OperationalFlownController', ['$scope',
        'ChartOptions',
        '$ionicLoading', '$timeout', '$window',
        '$ionicPopover', 'FilteredListService',
        '$filter', 'LoginService',
        OperationalFlownController]);
    function OperationalFlownController($scope, ChartOptions, $ionicLoading, $timeout, $window, $ionicPopover, FilteredListService, $filter, LoginService) {
    }
    ;
})();

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9saWJzLnRzIiwiY29tbW9uL3V0aWxzL1V0aWxzLnRzIiwiY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvQ29yZG92YVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvTmV0U2VydmljZS50cyIsImNvbW1vbi9zZXJ2aWNlcy9FcnJvckhhbmRsZXJTZXJ2aWNlLnRzIiwiY29tbW9uL3NlcnZpY2VzL0lTZXNzaW9uSHR0cFByb21pc2UuanMiLCJjb21tb24vc2VydmljZXMvU2Vzc2lvblNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1Jlc3BvbnNlLmpzIiwiY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHMiLCJjb21tb24vYXBwL0FwcENvbnRyb2xsZXIudHMiLCJhcHAudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1JlcXVlc3QuanMiLCJjb21wb25lbnRzL21pcy9taXMuY29udHJvbGxlci50cyIsImNvbXBvbmVudHMvbWlzL3Byb2dyZXNzLWJhci5kaXJlY3RpdmUudHMiLCJjb21wb25lbnRzL21pcy9yZXZlbnVlLXByb2dyZXNzLWJhci5kaXJlY3RpdmUudHMiLCJjb21wb25lbnRzL3NlcnZpY2VzL2RyaWxsZG93bi5zZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9zZXJ2aWNlcy9sb2dpbi5zZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9zZXJ2aWNlcy9taXMuc2VydmljZS50cyIsImNvbXBvbmVudHMvdXNlci9sb2dpbi1jb250cm9sbGVyLnRzIiwiY29tcG9uZW50cy9zZXJ2aWNlcy9jb21tb24vY2hhcnRvcHRpb25zLnNlcnZpY2UudHMiLCJjb21wb25lbnRzL3NlcnZpY2VzL2NvbW1vbi9kYXRhcHJvdmlkZXIuc2VydmljZS50cyIsImNvbXBvbmVudHMvc2VydmljZXMvY29tbW9uL25ldC5zZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9mbG93bi5jb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbIlV0aWxzIiwiVXRpbHMuY29uc3RydWN0b3IiLCJVdGlscy5pc05vdEVtcHR5IiwiVXRpbHMuaXNMYW5kc2NhcGUiLCJVdGlscy5nZXRUb2RheURhdGUiLCJVdGlscy5pc0ludGVnZXIiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlIiwiTG9jYWxTdG9yYWdlU2VydmljZS5jb25zdHJ1Y3RvciIsIkxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0IiwiTG9jYWxTdG9yYWdlU2VydmljZS5nZXQiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldE9iamVjdCIsIkxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0T2JqZWN0IiwiTG9jYWxTdG9yYWdlU2VydmljZS5pc1JlY2VudEVudHJ5QXZhaWxhYmxlIiwiTG9jYWxTdG9yYWdlU2VydmljZS5hZGRSZWNlbnRFbnRyeSIsIkNvcmRvdmFTZXJ2aWNlIiwiQ29yZG92YVNlcnZpY2UuY29uc3RydWN0b3IiLCJDb3Jkb3ZhU2VydmljZS5leGVjIiwiQ29yZG92YVNlcnZpY2UuZXhlY3V0ZVBlbmRpbmciLCJOZXRTZXJ2aWNlIiwiTmV0U2VydmljZS5jb25zdHJ1Y3RvciIsIk5ldFNlcnZpY2UuZ2V0RGF0YSIsIk5ldFNlcnZpY2UucG9zdERhdGEiLCJOZXRTZXJ2aWNlLmRlbGV0ZURhdGEiLCJOZXRTZXJ2aWNlLnVwbG9hZEZpbGUiLCJOZXRTZXJ2aWNlLmNoZWNrU2VydmVyQXZhaWxhYmlsaXR5IiwiTmV0U2VydmljZS5zZXJ2ZXJJc0F2YWlsYWJsZSIsIk5ldFNlcnZpY2UuY2FuY2VsQWxsVXBsb2FkRG93bmxvYWQiLCJOZXRTZXJ2aWNlLmFkZE1ldGFJbmZvIiwiZXJyb3JoYW5kbGVyIiwiRXJyb3JIYW5kbGVyU2VydmljZSIsIkVycm9ySGFuZGxlclNlcnZpY2UuY29uc3RydWN0b3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLnZhbGlkYXRlUmVzcG9uc2UiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmlzTm9SZXN1bHRGb3VuZCIsIkVycm9ySGFuZGxlclNlcnZpY2UuaXNTZXNzaW9uSW52YWxpZCIsIkVycm9ySGFuZGxlclNlcnZpY2UuaGFzSGFyZEVycm9ycyIsIkVycm9ySGFuZGxlclNlcnZpY2UuaGFzU29mdEVycm9ycyIsIkVycm9ySGFuZGxlclNlcnZpY2UuaGFzRXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNJbnZhbGlkU2Vzc2lvbkVycm9yIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNOb1Jlc3VsdEVycm9yIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNIYXJkRXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc1NvZnRFcnJvciIsInNlc3Npb25zZXJ2aWNlIiwiU2Vzc2lvblNlcnZpY2UiLCJTZXNzaW9uU2VydmljZS5jb25zdHJ1Y3RvciIsIlNlc3Npb25TZXJ2aWNlLnJlc29sdmVQcm9taXNlIiwiU2Vzc2lvblNlcnZpY2UuYWRkQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lciIsIlNlc3Npb25TZXJ2aWNlLnJlbW92ZUFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzdGVuZXIiLCJTZXNzaW9uU2VydmljZS5zZXRDcmVkZW50aWFsSWQiLCJTZXNzaW9uU2VydmljZS5zZXRTZXNzaW9uSWQiLCJTZXNzaW9uU2VydmljZS5nZXRTZXNzaW9uSWQiLCJTZXNzaW9uU2VydmljZS5nZXRDcmVkZW50aWFsSWQiLCJTZXNzaW9uU2VydmljZS5jbGVhckxpc3RlbmVycyIsIlNlc3Npb25TZXJ2aWNlLnJlZnJlc2hTZXNzaW9uSWQiLCJTZXNzaW9uU2VydmljZS5hY2Nlc3NUb2tlbk5vdFJlZnJlc2hlZCIsIlNlc3Npb25TZXJ2aWNlLmFjY2Vzc1Rva2VuUmVmcmVzaGVkIiwiZGF0YXByb3ZpZGVyIiwiRGF0YVByb3ZpZGVyU2VydmljZSIsIkRhdGFQcm92aWRlclNlcnZpY2UuY29uc3RydWN0b3IiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmdldERhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhIiwiRGF0YVByb3ZpZGVyU2VydmljZS5kZWxldGVEYXRhIiwiRGF0YVByb3ZpZGVyU2VydmljZS5oYXNOZXR3b3JrQ29ubmVjdGlvbiIsIkRhdGFQcm92aWRlclNlcnZpY2UuYWRkTWV0YUluZm8iLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmlzTG9nb3V0U2VydmljZSIsIkFwcENvbnRyb2xsZXIiLCJBcHBDb250cm9sbGVyLmNvbnN0cnVjdG9yIiwiQXBwQ29udHJvbGxlci5pc05vdEVtcHR5IiwiQXBwQ29udHJvbGxlci5oYXNOZXR3b3JrQ29ubmVjdGlvbiIsIkFwcENvbnRyb2xsZXIubG9nb3V0IiwiTWlzQ29udHJvbGxlciIsInNlYXJjaFV0aWwiLCJsaW5lQ2hhcnRPcHRpb25zIiwibXVsdGlCYXJDaGFydE9wdGlvbnMiLCJtZXRyaWNCYXJDaGFydE9wdGlvbnMiLCJ0YXJnZXRCYXJDaGFydE9wdGlvbnMiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlciJdLCJtYXBwaW5ncyI6IkFBQUEsNENBQTRDO0FBQzVDLDZDQUE2QztBQUM3Qyw4Q0FBOEM7QUFDOUMsZ0RBQWdEO0FBQ2hELG9EQUFvRDs7QUNKcEQsdUNBQXVDO0FBRXZDO0lBQUFBO0lBNkJBQyxDQUFDQTtJQTVCY0QsZ0JBQVVBLEdBQXhCQTtRQUF5QkUsZ0JBQW1CQTthQUFuQkEsV0FBbUJBLENBQW5CQSxzQkFBbUJBLENBQW5CQSxJQUFtQkE7WUFBbkJBLCtCQUFtQkE7O1FBQzNDQSxJQUFJQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUN0QkEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsRUFBRUEsVUFBQ0EsS0FBS0E7WUFDdkJBLFVBQVVBLEdBQUdBLFVBQVVBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLFNBQVNBLENBQUNBLEtBQUtBLENBQUNBLElBQUlBLEtBQUtBLEtBQUtBLElBQUlBLElBQUlBLEtBQUtBLEtBQUtBLEVBQUVBO21CQUNsRkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0Es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Q0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckUsQ0FBQztZQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0IsQ0FBQyxDQUFBQTtRQUNEQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxVQUFVQSxLQUFLQTtZQUMvQixNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBRSxDQUFDO1FBQ2xILENBQUMsQ0FBQ0E7UUFDRkEsTUFBTUEsQ0FBQ0EsT0FBT0EsR0FBR0EsVUFBVUEsS0FBS0E7WUFDNUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLENBQUMsQ0FBQ0E7UUFDRkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0E7WUFDZixNQUFNLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztRQUMzQixDQUFDLENBQUNBO1FBQ0ZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFVBQVVBLEtBQUtBO1lBQzdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUM1RSxDQUFDLENBQUNBO1FBQ0ZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFVBQVVBLEtBQUtBO1lBQzdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLENBQUMsQ0FBQUE7UUFDREEsTUFBTUEs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QSxDQUFDQSxDQUFDQSxDQUFDQTtRQUN6Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7SUFDOUZBLENBQUNBO0lBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1FBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtJQUMvRkEsQ0FBQ0E7SUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDMUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO0lBQy9GQSxDQUFDQTtJQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtRQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtJQUNmQSxDQUFDQTtBQUVIQSxDQUFDQTs7QUN6Q0QsQ0FBQztJQUNDLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFB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QVksRUFDL0IsYUFBYSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQ2hDLGFBQWEsRUFBRSxtQkFBbUIsRUFDbEMsT0FBTyxFQUFFLFlBQVk7SUFDMUNDLENBQUNBO0lBQUEsQ0FBQztBQUNSLENBQUMsQ0FBQyxFQUFFLENBQUMiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi90eXBpbmdzL2lvbmljLmQudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi90eXBpbmdzL1NjcmVlbi5kLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9Jc1RhYmxldC5kLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9JbkFwcEJyb3dzZXIuZC50c1wiIC8+IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbmNsYXNzIFV0aWxzIHtcclxuXHRwdWJsaWMgc3RhdGljIGlzTm90RW1wdHkoLi4udmFsdWVzOiBPYmplY3RbXSk6IGJvb2xlYW4ge1xyXG5cdFx0dmFyIGlzTm90RW1wdHkgPSB0cnVlO1xyXG5cdFx0Xy5mb3JFYWNoKHZhbHVlcywgKHZhbHVlKSA9PiB7XHJcblx0XHRcdGlzTm90RW1wdHkgPSBpc05vdEVtcHR5ICYmIChhbmd1bGFyLmlzRGVmaW5lZCh2YWx1ZSkgJiYgdmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09ICcnXHJcblx0XHRcdFx0JiYgISgoXy5pc0FycmF5KHZhbHVlKSB8fCBfLmlzT2JqZWN0KHZhbHVlKSkgJiYgXy5pc0VtcHR5KHZhbHVlKSkgJiYgdmFsdWUgIT0gMCk7XHJcblx0XHR9KTtcclxuXHRcdHJldHVybiBpc05vdEVtcHR5O1xyXG5cdH1cclxuXHJcblx0cHVibGljIHN0YXRpYyBpc0xhbmRzY2FwZSgpOiBib29sZWFuIHtcclxuXHRcdHZhciBpc0xhbmRzY2FwZTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdFx0aWYgKHdpbmRvdyAmJiB3aW5kb3cuc2NyZWVuICYmIHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24pIHtcclxuXHRcdFx0dmFyIHR5cGU6IHN0cmluZyA9IDxzdHJpbmc+KF8uaXNTdHJpbmcod2luZG93LnNjcmVlbi5vcmllbnRhdGlvbikgPyB3aW5kb3cuc2NyZWVuLm9yaWVudGF0aW9uIDogd2luZG93LnNjcmVlbi5vcmllbnRhdGlvbi50eXBlKTtcclxuXHRcdFx0aWYgKHR5cGUpIHtcclxuXHRcdFx0XHRpc0xhbmRzY2FwZSA9IHR5cGUuaW5kZXhPZignbGFuZHNjYXBlJykgPj0gMDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGlzTGFuZHNjYXBlO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHN0YXRpYyBnZXRUb2RheURhdGUoKTogRGF0ZSB7XHJcblx0XHR2YXIgdG9kYXlEYXRlID0gbmV3IERhdGUoKTtcclxuXHRcdHRvZGF5RGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHRcdHJldHVybiB0b2RheURhdGU7XHJcblx0fVxyXG5cdHByaXZhdGUgc3RhdGljIGlzSW50ZWdlcihudW1iZXI6IEJpZ0pzTGlicmFyeS5CaWdKUyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHBhcnNlSW50KG51bWJlci50b1N0cmluZygpKSA9PSArbnVtYmVyO1xyXG5cdH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5pbnRlcmZhY2UgUG9pbnRPYmplY3Qge1xyXG5cdGNvZGU6IHN0cmluZyxcclxuXHRkZXNjcmlwdGlvbjogc3RyaW5nXHJcbn1cclxuXHJcbmludGVyZmFjZSBJTG9jYWxTdG9yYWdlU2VydmljZSB7XHJcblx0c2V0KGtleUlkOiBzdHJpbmcsIGtleXZhbHVlOiBzdHJpbmcpOiB2b2lkO1xyXG5cdGdldChrZXlJZDogc3RyaW5nLCBkZWZhdWx0VmFsdWU6IHN0cmluZyk6IHN0cmluZztcclxuXHRzZXRPYmplY3Qoa2V5SWQ6IHN0cmluZywga2V5dmFsdWU6IGFueVtdKTogdm9pZDtcclxuXHRnZXRPYmplY3Qoa2V5SWQ6IHN0cmluZyk6IGFueTtcclxuXHRpc1JlY2VudEVudHJ5QXZhaWxhYmxlKG9yZ2luT2JqZWN0OiBQb2ludE9iamVjdCwgdHlwZTogc3RyaW5nKTogdm9pZDtcclxuXHRhZGRSZWNlbnRFbnRyeShkYXRhOiBhbnksIHR5cGU6IHN0cmluZyk6IHZvaWQ7XHJcbn1cclxuXHJcbmNsYXNzIExvY2FsU3RvcmFnZVNlcnZpY2UgaW1wbGVtZW50cyBJTG9jYWxTdG9yYWdlU2VydmljZSB7XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHdpbmRvdyddO1xyXG5cdHByaXZhdGUgcmVjZW50RW50cmllczogW1BvaW50T2JqZWN0XTtcclxuXHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSkge1xyXG5cdH1cclxuXHJcblx0c2V0KGtleUlkOiBzdHJpbmcsIGtleXZhbHVlOiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdID0ga2V5dmFsdWU7XHJcblx0fVxyXG5cdGdldChrZXlJZDogc3RyaW5nLCBkZWZhdWx0VmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gdGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gfHwgZGVmYXVsdFZhbHVlO1xyXG5cdH1cclxuXHRzZXRPYmplY3Qoa2V5SWQ6IHN0cmluZywga2V5dmFsdWU6IGFueVtdKTogdm9pZCB7XHJcblx0XHR0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSA9ICBKU09OLnN0cmluZ2lmeShrZXl2YWx1ZSk7XHJcblx0fVxyXG5cdGdldE9iamVjdChrZXlJZDogc3RyaW5nKTogYW55IHtcclxuXHRcdHJldHVybiB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSA/IEpTT04ucGFyc2UodGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0pIDogdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0aXNSZWNlbnRFbnRyeUF2YWlsYWJsZShvcmdpbk9iamVjdDogUG9pbnRPYmplY3QsIHR5cGU6IHN0cmluZykge1xyXG5cdFx0dGhpcy5yZWNlbnRFbnRyaWVzID0gdGhpcy5nZXRPYmplY3QodHlwZSkgPyB0aGlzLmdldE9iamVjdCh0eXBlKSA6IFtdO1xyXG5cdFx0cmV0dXJuIHRoaXMucmVjZW50RW50cmllcy5maWx0ZXIoZnVuY3Rpb24gKGVudHJ5KSB7IHJldHVybiBlbnRyeS5jb2RlID09PSBvcmdpbk9iamVjdC5jb2RlIH0pO1xyXG5cdH1cclxuXHJcblx0YWRkUmVjZW50RW50cnkoZGF0YTogYW55LCB0eXBlOiBzdHJpbmcpIHtcclxuXHRcdHZhciBvcmdpbk9iamVjdDogUG9pbnRPYmplY3RcdD1cdGRhdGEgPyBkYXRhLm9yaWdpbmFsT2JqZWN0IDogdW5kZWZpbmVkO1xyXG5cclxuXHRcdGlmIChvcmdpbk9iamVjdCkge1xyXG5cdFx0XHRpZiAodGhpcy5pc1JlY2VudEVudHJ5QXZhaWxhYmxlKG9yZ2luT2JqZWN0LCB0eXBlKS5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHR0aGlzLnJlY2VudEVudHJpZXMgPSB0aGlzLmdldE9iamVjdCh0eXBlKSA/IHRoaXMuZ2V0T2JqZWN0KHR5cGUpIDogW107XHJcblx0XHRcdFx0KHRoaXMucmVjZW50RW50cmllcy5sZW5ndGggPT0gMykgPyB0aGlzLnJlY2VudEVudHJpZXMucG9wKCkgOiB0aGlzLnJlY2VudEVudHJpZXM7XHJcblx0XHRcdFx0dGhpcy5yZWNlbnRFbnRyaWVzLnVuc2hpZnQob3JnaW5PYmplY3QpO1xyXG5cdFx0XHRcdHRoaXMuc2V0T2JqZWN0KHR5cGUsIHRoaXMucmVjZW50RW50cmllcyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbmludGVyZmFjZSBJQ29yZG92YUNhbGwge1xyXG5cdCgpOiB2b2lkO1xyXG59XHJcblxyXG5jbGFzcyBDb3Jkb3ZhU2VydmljZSB7XHJcblxyXG5cdHByaXZhdGUgY29yZG92YVJlYWR5OiBib29sZWFuID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBwZW5kaW5nQ2FsbHM6IElDb3Jkb3ZhQ2FsbFtdID0gW107XHJcblxyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlcmVhZHknLCAoKSA9PiB7XHJcblx0XHRcdHRoaXMuY29yZG92YVJlYWR5ID0gdHJ1ZTtcclxuXHRcdFx0dGhpcy5leGVjdXRlUGVuZGluZygpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRleGVjKGZuOiBJQ29yZG92YUNhbGwsIGFsdGVybmF0aXZlRm4/OiBJQ29yZG92YUNhbGwpIHtcclxuXHRcdGlmICh0aGlzLmNvcmRvdmFSZWFkeSkge1xyXG5cdFx0XHRmbigpO1xyXG5cdFx0fSBlbHNlIGlmICghYWx0ZXJuYXRpdmVGbikge1xyXG5cdFx0XHR0aGlzLnBlbmRpbmdDYWxscy5wdXNoKGZuKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGFsdGVybmF0aXZlRm4oKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZXhlY3V0ZVBlbmRpbmcoKSB7XHJcblx0XHR0aGlzLnBlbmRpbmdDYWxscy5mb3JFYWNoKChmbikgPT4ge1xyXG5cdFx0XHRmbigpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5wZW5kaW5nQ2FsbHMgPSBbXTtcclxuXHR9XHJcblxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL3R5cGluZ3MvYW5ndWxhcmpzL2FuZ3VsYXIuZC50c1wiLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJDb3Jkb3ZhU2VydmljZS50c1wiIC8+XHJcblxyXG5pbnRlcmZhY2UgSU5ldFNlcnZpY2Uge1xyXG5cdGdldERhdGEoZnJvbVVybDogc3RyaW5nKTogbmcuSUh0dHBQcm9taXNlPGFueT47XHJcblx0cG9zdERhdGEodG9Vcmw6IHN0cmluZywgZGF0YTogYW55KTogbmcuSUh0dHBQcm9taXNlPGFueT47XHJcblx0ZGVsZXRlRGF0YSh0b1VybDogc3RyaW5nKTogbmcuSUh0dHBQcm9taXNlPGFueT47XHJcblx0Y2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkoKTogbmcuSVByb21pc2U8Ym9vbGVhbj47XHJcbn1cclxuXHJcbmNsYXNzIE5ldFNlcnZpY2UgaW1wbGVtZW50cyBJTmV0U2VydmljZSB7XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJGh0dHAnLCAnQ29yZG92YVNlcnZpY2UnLCAnJHEnLCAnVVJMX1dTJywgJ09XTkVSX0NBUlJJRVJfQ09ERSddO1xyXG5cdHByaXZhdGUgZmlsZVRyYW5zZmVyOiBGaWxlVHJhbnNmZXI7XHJcblx0cHJpdmF0ZSBpc1NlcnZlckF2YWlsYWJsZTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlICRodHRwOiBuZy5JSHR0cFNlcnZpY2UsIHByaXZhdGUgY29yZG92YVNlcnZpY2U6IENvcmRvdmFTZXJ2aWNlLCBwcm90ZWN0ZWQgJHE6IG5nLklRU2VydmljZSwgcHVibGljIFVSTF9XUzogc3RyaW5nLCBwcml2YXRlIE9XTkVSX0NBUlJJRVJfQ09ERTogc3RyaW5nKSB7XHJcblx0XHR0aGlzLiRodHRwLmRlZmF1bHRzLnRpbWVvdXQgPSA2MDAwMDtcclxuXHRcdGNvcmRvdmFTZXJ2aWNlLmV4ZWMoKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmZpbGVUcmFuc2ZlciA9IG5ldyBGaWxlVHJhbnNmZXIoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Z2V0RGF0YShmcm9tVXJsOiBzdHJpbmcpOiBuZy5JSHR0cFByb21pc2U8YW55PiB7XHJcblx0XHR2YXIgdXJsOiBzdHJpbmcgPSB0aGlzLlVSTF9XUyArIGZyb21Vcmw7XHJcblx0XHRyZXR1cm4gdGhpcy4kaHR0cC5nZXQodXJsKTtcclxuXHR9XHJcblxyXG5cdHBvc3REYXRhKHRvVXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcclxuXHRcdHJldHVybiB0aGlzLiRodHRwLnBvc3QodGhpcy5VUkxfV1MgKyB0b1VybCwgdGhpcy5hZGRNZXRhSW5mbyhkYXRhKSwgY29uZmlnKTtcclxuXHR9XHJcblxyXG5cdGRlbGV0ZURhdGEodG9Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcclxuXHRcdHJldHVybiB0aGlzLiRodHRwLmRlbGV0ZSh0aGlzLlVSTF9XUyArIHRvVXJsKTtcclxuXHR9XHJcblxyXG5cdHVwbG9hZEZpbGUoXHJcblx0XHR0b1VybDogc3RyaW5nLCB1cmxGaWxlOiBzdHJpbmcsXHJcblx0XHRvcHRpb25zOiBGaWxlVXBsb2FkT3B0aW9ucywgc3VjY2Vzc0NhbGxiYWNrOiAocmVzdWx0OiBGaWxlVXBsb2FkUmVzdWx0KSA9PiB2b2lkLFxyXG5cdFx0ZXJyb3JDYWxsYmFjazogKGVycm9yOiBGaWxlVHJhbnNmZXJFcnJvcikgPT4gdm9pZCwgcHJvZ3Jlc3NDYWxsYmFjaz86IChwcm9ncmVzc0V2ZW50OiBQcm9ncmVzc0V2ZW50KSA9PiB2b2lkKSB7XHJcblx0XHRpZiAoIXRoaXMuZmlsZVRyYW5zZmVyKSB7XHJcblx0XHRcdHRoaXMuZmlsZVRyYW5zZmVyID0gbmV3IEZpbGVUcmFuc2ZlcigpO1xyXG5cdFx0fVxyXG5cdFx0Y29uc29sZS5sb2cob3B0aW9ucy5wYXJhbXMpO1xyXG5cdFx0dGhpcy5maWxlVHJhbnNmZXIub25wcm9ncmVzcyA9IHByb2dyZXNzQ2FsbGJhY2s7XHJcblx0XHR2YXIgdXJsOiBzdHJpbmcgPSB0aGlzLlVSTF9XUyArIHRvVXJsO1xyXG5cdFx0dGhpcy5maWxlVHJhbnNmZXIudXBsb2FkKHVybEZpbGUsIHVybCwgc3VjY2Vzc0NhbGxiYWNrLCBlcnJvckNhbGxiYWNrLCBvcHRpb25zKTtcclxuXHR9XHJcblxyXG5cdGNoZWNrU2VydmVyQXZhaWxhYmlsaXR5KCk6IG5nLklQcm9taXNlPGJvb2xlYW4+IHtcclxuXHRcdHZhciBhdmFpbGFiaWxpdHk6IGJvb2xlYW4gPSB0cnVlO1xyXG5cclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxib29sZWFuPiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHJcblx0XHR0aGlzLmNvcmRvdmFTZXJ2aWNlLmV4ZWMoKCkgPT4ge1xyXG5cdFx0XHRpZiAod2luZG93Lm5hdmlnYXRvcikgeyAvLyBvbiBkZXZpY2VcclxuXHRcdFx0XHR2YXIgbmF2aWdhdG9yOiBOYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xyXG5cdFx0XHRcdGlmIChuYXZpZ2F0b3IuY29ubmVjdGlvbiAmJiAoKG5hdmlnYXRvci5jb25uZWN0aW9uLnR5cGUgPT0gQ29ubmVjdGlvbi5OT05FKSB8fCAobmF2aWdhdG9yLmNvbm5lY3Rpb24udHlwZSA9PSBDb25uZWN0aW9uLlVOS05PV04pKSkge1xyXG5cdFx0XHRcdFx0YXZhaWxhYmlsaXR5ID0gZmFsc2U7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGRlZi5yZXNvbHZlKGF2YWlsYWJpbGl0eSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRzZXJ2ZXJJc0F2YWlsYWJsZSgpOiBib29sZWFuIHtcclxuXHRcdHZhciB0aGF0OiBOZXRTZXJ2aWNlID0gdGhpcztcclxuXHJcblx0XHR2YXIgc2VydmVySXNBdmFpbGFibGUgPSB0aGlzLmNoZWNrU2VydmVyQXZhaWxhYmlsaXR5KCkudGhlbigocmVzdWx0OiBib29sZWFuKSA9PiB7XHJcblx0XHRcdHRoYXQuaXNTZXJ2ZXJBdmFpbGFibGUgPSByZXN1bHQ7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5pc1NlcnZlckF2YWlsYWJsZTtcclxuXHR9XHJcblxyXG5cdGNhbmNlbEFsbFVwbG9hZERvd25sb2FkKCkge1xyXG5cdFx0aWYgKHRoaXMuZmlsZVRyYW5zZmVyKSB7XHJcblx0XHRcdHRoaXMuZmlsZVRyYW5zZmVyLmFib3J0KCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRhZGRNZXRhSW5mbyhyZXF1ZXN0RGF0YTogYW55KTogYW55IHtcclxuXHRcdHZhciBkZXZpY2U6IElvbmljLklEZXZpY2UgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKVxyXG5cdFx0dmFyIG1vZGVsOiBzdHJpbmcgPSAnJztcclxuXHRcdHZhciBvc1R5cGU6IHN0cmluZyA9ICcnO1xyXG5cdFx0dmFyIG9zVmVyc2lvbjogc3RyaW5nID0gJyc7XHJcblx0XHR2YXIgZGV2aWNlVG9rZW46IHN0cmluZyA9ICcnO1xyXG5cdFx0aWYgKGRldmljZSkge1xyXG5cdFx0XHRtb2RlbCA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLm1vZGVsO1xyXG5cdFx0XHRvc1R5cGUgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5wbGF0Zm9ybTtcclxuXHRcdFx0b3NWZXJzaW9uID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkudmVyc2lvbjtcclxuXHRcdH1cclxuXHRcdHZhciBtZXRhSW5mbyA9IHtcclxuXHRcdFx0J2NoYW5uZWxJZGVudGlmaWVyJzogJ01PQicsXHJcblx0XHRcdCdkYXRlVGltZVN0YW1wJzogbmV3IERhdGUoKS5nZXRUaW1lKCksXHJcblx0XHRcdCdvd25lckNhcnJpZXJDb2RlJzogdGhpcy5PV05FUl9DQVJSSUVSX0NPREUsXHJcblx0XHRcdCdhZGRpdGlvbmFsSW5mbyc6IHtcclxuXHRcdFx0XHQnZGV2aWNlVHlwZSc6IHdpbmRvdy5pc1RhYmxldCA/ICdUYWJsZXQnIDogJ1Bob25lJyxcclxuXHRcdFx0XHQnbW9kZWwnOiBtb2RlbCxcclxuXHRcdFx0XHQnb3NUeXBlJzogb3NUeXBlLFxyXG5cdFx0XHRcdCdvc1ZlcnNpb24nOiBvc1ZlcnNpb24sXHJcblx0XHRcdFx0J2RldmljZVRva2VuJzogZGV2aWNlVG9rZW4sXHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dmFyIHJlcXVlc3RPYmogPSB7XHJcblx0XHRcdCdtZXRhSW5mbyc6IG1ldGFJbmZvLFxyXG5cdFx0XHQncmVxdWVzdERhdGEnOiByZXF1ZXN0RGF0YVxyXG5cdFx0fTtcclxuXHRcdHJldHVybiByZXF1ZXN0T2JqO1xyXG5cdH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTmV0U2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJDb3Jkb3ZhU2VydmljZS50c1wiIC8+XHJcblxyXG5tb2R1bGUgZXJyb3JoYW5kbGVyIHtcclxuXHRleHBvcnQgY29uc3QgU1RBVFVTX0ZBSUw6IHN0cmluZyA9ICdmYWlsJztcclxuXHRleHBvcnQgY29uc3QgU0VWRVJJVFlfRVJST1JfSEFSRDogc3RyaW5nID0gJ0hBUkQnO1xyXG5cdGV4cG9ydCBjb25zdCBTRVZFUklUWV9FUlJPUl9TT0ZUOiBzdHJpbmcgPSAnU09GVCc7XHJcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OX1RPS0VOID0gJ1NFQy4wMjUnO1xyXG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX0lOVkFMSURfU0VTU0lPTiA9ICdTRVMuMDA0JztcclxuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9UT0tFTl9FWFBJUkVEID0gJ1NFQy4wMzgnO1xyXG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX0lOVkFMSURfVVNFUl9TRVNTSU9OX0VYUElSRUQgPSAnU0VTLjAwMyc7XHJcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfTk9fUkVTVUxUID0gJ0NPTS4xMTEnO1xyXG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX05PX1JPVVRFID0gJ0ZMVC4wMTAnO1xyXG59XHJcblxyXG5jbGFzcyBFcnJvckhhbmRsZXJTZXJ2aWNlIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydOZXRTZXJ2aWNlJywgJ0NvcmRvdmFTZXJ2aWNlJywgJyRxJywgJyRyb290U2NvcGUnXTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIG5ldFNlcnZpY2U6IE5ldFNlcnZpY2UsIHByaXZhdGUgY29yZG92YVNlcnZpY2U6IENvcmRvdmFTZXJ2aWNlLCBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UsXHJcblx0XHRwcml2YXRlICRyb290U2NvcGU6IG5nLklTY29wZSkge1xyXG5cdH1cclxuXHJcblx0dmFsaWRhdGVSZXNwb25zZShyZXNwb25zZTogYW55KSB7XHJcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XHJcblx0XHRpZiAodGhpcy5oYXNFcnJvcnMoZXJyb3JzKSB8fCBlcnJvcmhhbmRsZXIuU1RBVFVTX0ZBSUwgPT0gcmVzcG9uc2Uuc3RhdHVzKSB7XHJcblx0XHRcdGlmICghdGhpcy5oYXNJbnZhbGlkU2Vzc2lvbkVycm9yKGVycm9ycykgJiYgIXRoaXMuaGFzTm9SZXN1bHRFcnJvcihlcnJvcnMpKSB7XHJcblx0XHRcdFx0Ly8gYnJvYWRjYXN0IHRvIGFwcGNvbnRyb2xsZXIgc2VydmVyIGVycm9yXHJcblx0XHRcdFx0dGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3NlcnZlckVycm9yJywgcmVzcG9uc2UpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRpc05vUmVzdWx0Rm91bmQocmVzcG9uc2U6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xyXG5cdFx0cmV0dXJuIHRoaXMuaGFzTm9SZXN1bHRFcnJvcihlcnJvcnMpO1xyXG5cdH1cclxuXHJcblx0aXNTZXNzaW9uSW52YWxpZChyZXNwb25zZTogYW55KTogYm9vbGVhbiB7XHJcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XHJcblx0XHRyZXR1cm4gdGhpcy5oYXNJbnZhbGlkU2Vzc2lvbkVycm9yKGVycm9ycyk7XHJcblx0fVxyXG5cclxuXHRoYXNIYXJkRXJyb3JzKHJlc3BvbnNlOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcclxuXHRcdHJldHVybiB0aGlzLmhhc0hhcmRFcnJvcihlcnJvcnMpO1xyXG5cdH1cclxuXHJcblx0aGFzU29mdEVycm9ycyhyZXNwb25zZTogYW55KTogYm9vbGVhbiB7XHJcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XHJcblx0XHRyZXR1cm4gdGhpcy5oYXNTb2Z0RXJyb3IoZXJyb3JzKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFzRXJyb3JzKGVycm9yczogYW55KTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gZXJyb3JzLmxlbmd0aCA+IDA7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhc0ludmFsaWRTZXNzaW9uRXJyb3IoZXJyb3JzOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBfLnNvbWUoZXJyb3JzLCAoZXJyb3I6IGFueSkgPT4ge1xyXG5cdFx0XHRyZXR1cm4gZXJyb3IgJiYgZXJyb3JoYW5kbGVyLlNFVkVSSVRZX0VSUk9SX0hBUkQgPT0gZXJyb3Iuc2V2ZXJpdHkgJiZcclxuXHRcdFx0KGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX0lOVkFMSURfU0VTU0lPTl9UT0tFTiA9PSBlcnJvci5jb2RlIHx8XHJcblx0XHRcdFx0ZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OID09IGVycm9yLmNvZGUgfHxcclxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1VTRVJfU0VTU0lPTl9FWFBJUkVEID09IGVycm9yLmNvZGUgfHxcclxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9UT0tFTl9FWFBJUkVEID09IGVycm9yLmNvZGUpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhc05vUmVzdWx0RXJyb3IoZXJyb3JzOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBfLnNvbWUoZXJyb3JzLCAoZXJyb3I6IGFueSkgPT4ge1xyXG5cdFx0XHRyZXR1cm4gZXJyb3IgJiYgZXJyb3JoYW5kbGVyLlNFVkVSSVRZX0VSUk9SX0hBUkQgPT0gZXJyb3Iuc2V2ZXJpdHkgJiZcclxuXHRcdFx0KGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX05PX1JFU1VMVCA9PSBlcnJvci5jb2RlIHx8XHJcblx0XHRcdFx0ZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfTk9fUk9VVEUgPT0gZXJyb3IuY29kZSk7XHJcblx0XHR9KSAmJiBlcnJvcnMubGVuZ3RoID09IDE7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhc0hhcmRFcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XHJcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfSEFSRCA9PSBlcnJvci5zZXZlcml0eTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYXNTb2Z0RXJyb3IoZXJyb3JzOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBfLnNvbWUoZXJyb3JzLCAoZXJyb3I6IGFueSkgPT4ge1xyXG5cdFx0XHRyZXR1cm4gZXJyb3IgJiYgZXJyb3JoYW5kbGVyLlNFVkVSSVRZX0VSUk9SX1NPRlQgPT0gZXJyb3Iuc2V2ZXJpdHk7XHJcblx0XHR9KTtcclxuXHR9XHJcbn0iLG51bGwsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTmV0U2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJDb3Jkb3ZhU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJFcnJvckhhbmRsZXJTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIklTZXNzaW9uSHR0cFByb21pc2UudHNcIiAvPlxyXG5cclxubW9kdWxlIHNlc3Npb25zZXJ2aWNlIHtcclxuXHRleHBvcnQgY29uc3QgSEVBREVSX1JFRlJFU0hfVE9LRU5fS0VZOiBzdHJpbmcgPSAneC1yZWZyZXNoLXRva2VuJztcclxuXHRleHBvcnQgY29uc3QgSEVBREVSX0FDQ0VTU19UT0tFTl9LRVk6IHN0cmluZyA9ICd4LWFjY2Vzcy10b2tlbic7XHJcblx0ZXhwb3J0IGNvbnN0IFJFRlJFU0hfU0VTU0lPTl9JRF9VUkw6IHN0cmluZyA9ICcvdXNlci9nZXRBY2Nlc3NUb2tlbic7XHJcbn1cclxuXHJcbmNsYXNzIFNlc3Npb25TZXJ2aWNlIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydOZXRTZXJ2aWNlJywgJ0Vycm9ySGFuZGxlclNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZScsICckaHR0cCddO1xyXG5cclxuXHRwcml2YXRlIGFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzOiBJQWNjZXNzVG9rZW5SZWZyZXNoZWRIYW5kbGVyW107XHJcblx0cHJpdmF0ZSBzZXNzaW9uSWQ6IHN0cmluZztcclxuXHRwcml2YXRlIGNyZWRlbnRpYWxJZDogc3RyaW5nO1xyXG5cdHByaXZhdGUgaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzczogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgbmV0U2VydmljZTogTmV0U2VydmljZSwgcHJpdmF0ZSBlcnJvckhhbmRsZXJTZXJ2aWNlOiBFcnJvckhhbmRsZXJTZXJ2aWNlLCBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UsXHJcblx0XHRwcml2YXRlICRyb290U2NvcGU6IG5nLklTY29wZSwgcHJpdmF0ZSAkaHR0cDogbmcuSUh0dHBTZXJ2aWNlKSB7XHJcblx0XHR0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzID0gW107XHJcblx0XHR0aGlzLnNlc3Npb25JZCA9IG51bGw7XHJcblx0XHR0aGlzLmNyZWRlbnRpYWxJZCA9IG51bGw7XHJcblx0fVxyXG5cclxuXHRyZXNvbHZlUHJvbWlzZShwcm9taXNlOiBJU2Vzc2lvbkh0dHBQcm9taXNlKSB7XHJcblx0XHRwcm9taXNlLnJlc3BvbnNlLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdGlmICghdGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0hhcmRFcnJvcnMocmVzcG9uc2UpIHx8IHRoaXMuZXJyb3JIYW5kbGVyU2VydmljZS5pc1Nlc3Npb25JbnZhbGlkKHJlc3BvbnNlKSkge1xyXG5cdFx0XHRcdGlmICghdGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmlzU2Vzc2lvbkludmFsaWQocmVzcG9uc2UpKSB7XHJcblx0XHRcdFx0XHRwcm9taXNlLmRlZmZlcmVkLnJlc29sdmUocHJvbWlzZS5yZXNwb25zZSk7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnc2Vzc2lvbiBpcyB2YWxpZCcpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0aGlzLmFkZEFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzdGVuZXIocHJvbWlzZSk7XHJcblx0XHRcdFx0XHRpZiAoIXRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcykge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVmcmVzaGluZyBzZXNzaW9uIHRva2VuJyk7XHJcblx0XHRcdFx0XHRcdHRoaXMucmVmcmVzaFNlc3Npb25JZCgpLnRoZW4oXHJcblx0XHRcdFx0XHRcdFx0KHRva2VuUmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICh0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaGFzSGFyZEVycm9ycyh0b2tlblJlc3BvbnNlKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnNldFNlc3Npb25JZChudWxsKTtcclxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHZhciByZXNwb25zZUhlYWRlciA9IHRva2VuUmVzcG9uc2UuaGVhZGVycygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgYWNjZXNzVG9rZW46IHN0cmluZyA9IHJlc3BvbnNlSGVhZGVyW3Nlc3Npb25zZXJ2aWNlLkhFQURFUl9BQ0NFU1NfVE9LRU5fS0VZXTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRTZXNzaW9uSWQoYWNjZXNzVG9rZW4pO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5pc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoIXRoaXMuZ2V0U2Vzc2lvbklkKCkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5hY2Nlc3NUb2tlbk5vdFJlZnJlc2hlZCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZXJyb3Igb24gYWNjZXNzIHRva2VuIHJlZnJlc2gnKTtcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuc2V0U2Vzc2lvbklkKG51bGwpO1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuZ2V0Q3JlZGVudGlhbElkKCkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5hY2Nlc3NUb2tlbk5vdFJlZnJlc2hlZCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cHJvbWlzZS5kZWZmZXJlZC5yZWplY3QoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRwcm9taXNlLmRlZmZlcmVkLnJlamVjdCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGFkZEFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzdGVuZXIobGlzdGVuZXI6IElBY2Nlc3NUb2tlblJlZnJlc2hlZEhhbmRsZXIpIHtcclxuXHRcdHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMucHVzaChsaXN0ZW5lcik7XHJcblx0fVxyXG5cclxuXHRyZW1vdmVBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKGxpc3RlbmVyVG9SZW1vdmU6IElBY2Nlc3NUb2tlblJlZnJlc2hlZEhhbmRsZXIpIHtcclxuXHRcdF8ucmVtb3ZlKHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMsIChsaXN0ZW5lcikgPT4ge1xyXG5cdFx0XHRyZXR1cm4gbGlzdGVuZXIgPT0gbGlzdGVuZXJUb1JlbW92ZTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0c2V0Q3JlZGVudGlhbElkKGNyZWRJZDogc3RyaW5nKSB7XHJcblx0XHR0aGlzLmNyZWRlbnRpYWxJZCA9IGNyZWRJZDtcclxuXHRcdHRoaXMuJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bc2Vzc2lvbnNlcnZpY2UuSEVBREVSX1JFRlJFU0hfVE9LRU5fS0VZXSA9IGNyZWRJZDtcclxuXHR9XHJcblxyXG5cdHNldFNlc3Npb25JZChzZXNzaW9uSWQ6IHN0cmluZykge1xyXG5cdFx0dGhpcy5zZXNzaW9uSWQgPSBzZXNzaW9uSWQ7XHJcblx0XHR0aGlzLiRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uW3Nlc3Npb25zZXJ2aWNlLkhFQURFUl9BQ0NFU1NfVE9LRU5fS0VZXSA9IHNlc3Npb25JZDtcclxuXHR9XHJcblxyXG5cdGdldFNlc3Npb25JZCgpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHRoaXMuc2Vzc2lvbklkID8gdGhpcy5zZXNzaW9uSWQgOiBudWxsO1xyXG5cdH1cclxuXHJcblx0Z2V0Q3JlZGVudGlhbElkKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gdGhpcy5jcmVkZW50aWFsSWQgPyB0aGlzLmNyZWRlbnRpYWxJZCA6IG51bGw7XHJcblx0fVxyXG5cclxuXHRjbGVhckxpc3RlbmVycygpIHtcclxuXHRcdHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMgPSBbXTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVmcmVzaFNlc3Npb25JZCgpOiBuZy5JSHR0cFByb21pc2U8YW55PiB7XHJcblx0XHR0aGlzLmlzUmVmcmVzaFNlc3Npb25JZEluUHJvZ3Jlc3MgPSB0cnVlO1xyXG5cdFx0dmFyIGFjY2Vzc1Rva2VuUmVxdWVzdDogYW55ID0ge1xyXG5cdFx0XHRyZWZyZXNoVG9rZW46IHRoaXMuY3JlZGVudGlhbElkXHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5uZXRTZXJ2aWNlLnBvc3REYXRhKHNlc3Npb25zZXJ2aWNlLlJFRlJFU0hfU0VTU0lPTl9JRF9VUkwsIGFjY2Vzc1Rva2VuUmVxdWVzdCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkKCkge1xyXG5cdFx0Xy5mb3JFYWNoKHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMsIChsaXN0ZW5lcikgPT4ge1xyXG5cdFx0XHRpZiAobGlzdGVuZXIub25Ub2tlbkZhaWxlZCkge1xyXG5cdFx0XHRcdGxpc3RlbmVyLm9uVG9rZW5GYWlsZWQobGlzdGVuZXIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lcik7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYWNjZXNzVG9rZW5SZWZyZXNoZWQoKSB7XHJcblx0XHRfLmZvckVhY2godGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcywgKGxpc3RlbmVyKSA9PiB7XHJcblx0XHRcdGlmIChsaXN0ZW5lcikge1xyXG5cdFx0XHRcdGlmIChsaXN0ZW5lci5vblRva2VuUmVmcmVzaGVkKSB7XHJcblx0XHRcdFx0XHRsaXN0ZW5lci5vblRva2VuUmVmcmVzaGVkKGxpc3RlbmVyKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGxpc3RlbmVyKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdMZW5ndGggPSAnLCB0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLmxlbmd0aCk7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5yZW1vdmVBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKGxpc3RlbmVyKTtcclxuXHRcdH0pO1xyXG5cdH1cclxufSIsbnVsbCwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOZXRTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkNvcmRvdmFTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIlNlc3Npb25TZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkVycm9ySGFuZGxlclNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiSVNlc3Npb25IdHRwUHJvbWlzZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJHZW5lcmljUmVzcG9uc2UudHNcIiAvPlxyXG5cclxubW9kdWxlIGRhdGFwcm92aWRlciB7XHJcblx0ZXhwb3J0IGNvbnN0IFNFUlZJQ0VfVVJMX0xPR09VVCA9ICcvdXNlci9sb2dvdXQnO1xyXG59XHJcblxyXG5jbGFzcyBEYXRhUHJvdmlkZXJTZXJ2aWNlIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydOZXRTZXJ2aWNlJywgJ0NvcmRvdmFTZXJ2aWNlJywgJyRxJywgJyRyb290U2NvcGUnLCAnRXJyb3JIYW5kbGVyU2VydmljZScsICdTZXNzaW9uU2VydmljZScsICdPV05FUl9DQVJSSUVSX0NPREUnXTtcclxuXHJcblx0cHJpdmF0ZSBpc0Nvbm5lY3RlZFRvTmV0d29yazogYm9vbGVhbiA9IHRydWU7XHJcblx0cHJpdmF0ZSBuYXZpZ2F0b3I6IE5hdmlnYXRvcjtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIG5ldFNlcnZpY2U6IE5ldFNlcnZpY2UsIHByaXZhdGUgY29yZG92YVNlcnZpY2U6IENvcmRvdmFTZXJ2aWNlLCBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UsXHJcblx0XHRwcml2YXRlICRyb290U2NvcGU6IG5nLklTY29wZSwgcHJpdmF0ZSBlcnJvckhhbmRsZXJTZXJ2aWNlOiBFcnJvckhhbmRsZXJTZXJ2aWNlLFxyXG5cdFx0cHJpdmF0ZSBzZXNzaW9uU2VydmljZTogU2Vzc2lvblNlcnZpY2UsIHByaXZhdGUgT1dORVJfQ0FSUklFUl9DT0RFOiBzdHJpbmcpIHtcclxuXHJcblx0XHR0aGlzLmNvcmRvdmFTZXJ2aWNlLmV4ZWMoKCkgPT4ge1xyXG5cdFx0XHRpZiAod2luZG93LmNvcmRvdmEgJiYgd2luZG93LmRvY3VtZW50KSB7IC8vIG9uIGRldmljZVxyXG5cdFx0XHRcdG5hdmlnYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3I7XHJcblx0XHRcdFx0dGhpcy5pc0Nvbm5lY3RlZFRvTmV0d29yayA9IG5hdmlnYXRvci5vbkxpbmU7XHJcblx0XHRcdFx0d2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXHJcblx0XHRcdFx0XHQnb25saW5lJyxcclxuXHRcdFx0XHRcdCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3VzZXIgb25saW5lJyk7XHJcblx0XHRcdFx0XHRcdHRoaXMuaXNDb25uZWN0ZWRUb05ldHdvcmsgPSB0cnVlO1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdGZhbHNlKTtcclxuXHRcdFx0XHR3aW5kb3cuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcclxuXHRcdFx0XHRcdCdvZmZsaW5lJyxcclxuXHRcdFx0XHRcdCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3VzZXIgb2ZmbGluZScpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrID0gZmFsc2U7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0ZmFsc2UpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGdldERhdGEocmVxOiBzdHJpbmcpOiBuZy5JUHJvbWlzZTxhbnk+IHtcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cclxuXHRcdGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcclxuXHRcdFx0ZGVmLnJlc29sdmUodGhpcy5uZXRTZXJ2aWNlLmdldERhdGEocmVxKSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XHJcblx0XHRcdC8vIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdub05ldHdvcmsnKTtcclxuXHRcdFx0ZGVmLnJlamVjdCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdHBvc3REYXRhKHJlcTogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IG5nLklSZXF1ZXN0U2hvcnRjdXRDb25maWcpOiBuZy5JUHJvbWlzZTxhbnk+IHtcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cclxuXHRcdHZhciByZXNwb25zZTogbmcuSVByb21pc2U8YW55PiA9IHRoaXMubmV0U2VydmljZS5wb3N0RGF0YShyZXEsIGRhdGEsIGNvbmZpZyk7XHJcblxyXG5cdFx0aWYgKHRoaXMuaGFzTmV0d29ya0Nvbm5lY3Rpb24oKSkge1xyXG5cdFx0XHRyZXNwb25zZS50aGVuKFxyXG5cdFx0XHQoaHR0cFJlc3BvbnNlKSA9PiB7XHJcblxyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XHJcblx0XHRcdFx0Ly8gYnJvYWRjYXN0IHNlcnZlciBpcyB1bmF2YWlsYWJsZVxyXG5cdFx0XHRcdHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdzZXJ2ZXJOb3RBdmFpbGFibGUnKTtcclxuXHRcdFx0XHRkZWYucmVqZWN0KCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0ZGVmLnJlamVjdCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGRlbGV0ZURhdGEocmVxOiBzdHJpbmcpOiBuZy5JUHJvbWlzZTxhbnk+IHtcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cclxuXHRcdGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcclxuXHRcdFx0ZGVmLnJlc29sdmUodGhpcy5uZXRTZXJ2aWNlLmRlbGV0ZURhdGEocmVxKSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XHJcblx0XHRcdGRlZi5yZWplY3QoKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRoYXNOZXR3b3JrQ29ubmVjdGlvbigpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiAobmF2aWdhdG9yLm9uTGluZSB8fCB0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrKTtcclxuXHR9XHJcblxyXG5cclxuXHQvLyBUT0RPOiByZW1vdmUgdGhpcyB0ZW1wIG1ldGhvZCBhbmQgdXNlIGdlbmVyaWNzXHJcblx0YWRkTWV0YUluZm8ocmVxdWVzdERhdGE6IGFueSk6IGFueSB7XHJcblx0XHR2YXIgZGV2aWNlOiBJb25pYy5JRGV2aWNlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKClcclxuXHRcdHZhciBtb2RlbDogc3RyaW5nID0gJyc7XHJcblx0XHR2YXIgb3NUeXBlOiBzdHJpbmcgPSAnJztcclxuXHRcdHZhciBvc1ZlcnNpb246IHN0cmluZyA9ICcnO1xyXG5cdFx0dmFyIGRldmljZVRva2VuOiBzdHJpbmcgPSAnJztcclxuXHRcdGlmIChkZXZpY2UpIHtcclxuXHRcdFx0bW9kZWwgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5tb2RlbDtcclxuXHRcdFx0b3NUeXBlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkucGxhdGZvcm07XHJcblx0XHRcdG9zVmVyc2lvbiA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLnZlcnNpb247XHJcblx0XHR9XHJcblx0XHR2YXIgbWV0YUluZm8gPSB7XHJcblx0XHRcdCdjaGFubmVsSWRlbnRpZmllcic6ICdNT0InLFxyXG5cdFx0XHQnZGF0ZVRpbWVTdGFtcCc6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG5cdFx0XHQnb3duZXJDYXJyaWVyQ29kZSc6IHRoaXMuT1dORVJfQ0FSUklFUl9DT0RFLFxyXG5cdFx0XHQnYWRkaXRpb25hbEluZm8nOiB7XHJcblx0XHRcdFx0J2RldmljZVR5cGUnOiB3aW5kb3cuaXNUYWJsZXQgPyAnVGFibGV0JyA6ICdQaG9uZScsXHJcblx0XHRcdFx0J21vZGVsJzogbW9kZWwsXHJcblx0XHRcdFx0J29zVHlwZSc6IG9zVHlwZSxcclxuXHRcdFx0XHQnb3NWZXJzaW9uJzogb3NWZXJzaW9uLFxyXG5cdFx0XHRcdCdkZXZpY2VUb2tlbic6IGRldmljZVRva2VuLFxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xyXG5cdFx0XHQnbWV0YUluZm8nOiBtZXRhSW5mbyxcclxuXHRcdFx0J3JlcXVlc3REYXRhJzogcmVxdWVzdERhdGFcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gcmVxdWVzdE9iajtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaXNMb2dvdXRTZXJ2aWNlKHJlcXVlc3RVcmw6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIGRhdGFwcm92aWRlci5TRVJWSUNFX1VSTF9MT0dPVVQgPT0gcmVxdWVzdFVybDtcclxuXHR9XHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi91dGlscy9VdGlscy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvTG9jYWxTdG9yYWdlU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvRXJyb3JIYW5kbGVyU2VydmljZS50c1wiIC8+XHJcblxyXG5jbGFzcyBBcHBDb250cm9sbGVyIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckc3RhdGUnLCAnJHNjb3BlJywgJ0RhdGFQcm92aWRlclNlcnZpY2UnLFxyXG5cdFx0JyRpb25pY01vZGFsJywgJyRpb25pY1BsYXRmb3JtJywgJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCAnJGlvbmljUG9wdXAnLFxyXG5cdFx0JyRpb25pY0xvYWRpbmcnLCAnJGlvbmljSGlzdG9yeScsICdFcnJvckhhbmRsZXJTZXJ2aWNlJ107XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJvdGVjdGVkICRzdGF0ZTogYW5ndWxhci51aS5JU3RhdGVTZXJ2aWNlLCBwcm90ZWN0ZWQgJHNjb3BlOiBuZy5JU2NvcGUsIHByb3RlY3RlZCBkYXRhUHJvdmlkZXJTZXJ2aWNlOiBEYXRhUHJvdmlkZXJTZXJ2aWNlLCAkaW9uaWNQbGF0Zm9ybTogSW9uaWMuSVBsYXRmb3JtLFxyXG5cdFx0cHJpdmF0ZSBsb2NhbFN0b3JhZ2VTZXJ2aWNlOiBMb2NhbFN0b3JhZ2VTZXJ2aWNlLCBwcml2YXRlICRpb25pY1BvcHVwOiBJb25pYy5JUG9wdXAsXHJcblx0XHRwcml2YXRlICRpb25pY0xvYWRpbmc6IElvbmljLklMb2FkaW5nLFxyXG5cdFx0cHJpdmF0ZSAkaW9uaWNIaXN0b3J5OiBhbnksIHByaXZhdGUgZXJyb3JIYW5kbGVyU2VydmljZTogRXJyb3JIYW5kbGVyU2VydmljZSkge1xyXG5cclxuXHRcdHZhciB0aGF0OiBBcHBDb250cm9sbGVyID0gdGhpcztcclxuXHR9XHJcblxyXG5cdGlzTm90RW1wdHkodmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIFV0aWxzLmlzTm90RW1wdHkodmFsdWUpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGhhc05ldHdvcmtDb25uZWN0aW9uKCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5oYXNOZXR3b3JrQ29ubmVjdGlvbigpO1xyXG5cdH1cclxuXHJcblx0bG9nb3V0KCkge1xyXG5cdFx0dGhpcy4kc3RhdGUuZ28oXCJsb2dpblwiKTtcclxuXHR9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9fbGlicy50c1wiIC8+XHJcblxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vYXBwL0FwcENvbnRyb2xsZXIudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vc2VydmljZXMvQ29yZG92YVNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vc2VydmljZXMvTG9jYWxTdG9yYWdlU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9TZXNzaW9uU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL3NlcnZpY2VzL0Vycm9ySGFuZGxlclNlcnZpY2UudHNcIi8+XHJcblxyXG52YXIgU0VSVkVSX1VSTCA9ICdodHRwOi8vMTAuOTEuMTUyLjk5OjgwODIvcmFwaWQtd3Mvc2VydmljZXMvcmVzdCc7XHJcbmFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScsIFsnaW9uaWMnLCAndGFiU2xpZGVCb3gnLCAnbnZkM0NoYXJ0RGlyZWN0aXZlcycsICdudmQzJ10pXHJcblxyXG5cdC5ydW4oKCRpb25pY1BsYXRmb3JtOiBJb25pYy5JUGxhdGZvcm0sICRodHRwKSA9PiB7XHJcblx0XHQkaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vbi50b2tlbiA9ICd0b2tlbic7XHJcbiAgXHRcdCRodHRwLmRlZmF1bHRzLmhlYWRlcnMucG9zdFtcIkNvbnRlbnQtVHlwZVwiXSA9IFwiYXBwbGljYXRpb24vanNvblwiO1xyXG5cdFx0JGlvbmljUGxhdGZvcm0ucmVhZHkoKCkgPT4ge1xyXG5cdFx0XHRpZiAodHlwZW9mIG5hdmlnYXRvci5nbG9iYWxpemF0aW9uICE9PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHR9XHJcblx0XHR9KVxyXG5cdH0pXHJcbi5jb25maWcoKCRzdGF0ZVByb3ZpZGVyOiBhbmd1bGFyLnVpLklTdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXI6IGFuZ3VsYXIudWkuSVVybFJvdXRlclByb3ZpZGVyLFxyXG5cdCRpb25pY0NvbmZpZ1Byb3ZpZGVyOiBJb25pYy5JQ29uZmlnUHJvdmlkZXIpID0+IHtcclxuXHQkaW9uaWNDb25maWdQcm92aWRlci52aWV3cy5zd2lwZUJhY2tFbmFibGVkKGZhbHNlKTtcclxuXHJcblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2FwcCcsIHtcclxuXHRcdHVybDogJy9hcHAnLFxyXG5cdFx0YWJzdHJhY3Q6IHRydWUsXHJcblx0XHR0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdGVtcGxhdGVzL21lbnUuaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOiAnQXBwQ29udHJvbGxlciBhcyBhcHBDdHJsJ1xyXG5cdH0pXHJcblx0LnN0YXRlKCdsb2dpbicsIHtcclxuXHRcdHVybDogJy9sb2dpbicsXHJcblx0XHR0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdXNlci9sb2dpbi5odG1sJyxcclxuXHRcdGNvbnRyb2xsZXI6ICdMb2dpbkNvbnRyb2xsZXInXHJcblx0fSlcclxuXHQuc3RhdGUoJ2FwcC5taXMtZmxvd24nLCB7XHJcblx0XHR1cmw6ICcvbWlzL2Zsb3duJyxcclxuXHRcdHZpZXdzOiB7XHJcblx0XHRcdCdtZW51Q29udGVudCc6IHtcclxuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvbWlzL2Zsb3duLmh0bWwnLFxyXG5cdFx0XHRcdGNvbnRyb2xsZXI6ICdNaXNDb250cm9sbGVyJ1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSlcclxuXHQuc3RhdGUoJ2FwcC5vcGVyYXRpb25hbC1mbG93bicsIHtcclxuXHRcdHVybDogJy9vcGVyYXRpb25hbC9mbG93bicsXHJcblx0XHR2aWV3czoge1xyXG5cdFx0XHQnbWVudUNvbnRlbnQnOiB7XHJcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL2Zsb3duLmh0bWwnLFxyXG5cdFx0XHRcdGNvbnRyb2xsZXI6ICdPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlcidcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHQkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvbG9naW4nKTtcclxufSlcclxuXHJcbi5zZXJ2aWNlKCdEYXRhUHJvdmlkZXJTZXJ2aWNlJywgRGF0YVByb3ZpZGVyU2VydmljZSlcclxuLnNlcnZpY2UoJ05ldFNlcnZpY2UnLCBOZXRTZXJ2aWNlKVxyXG4uc2VydmljZSgnRXJyb3JIYW5kbGVyU2VydmljZScsIEVycm9ySGFuZGxlclNlcnZpY2UpXHJcbi5zZXJ2aWNlKCdTZXNzaW9uU2VydmljZScsIFNlc3Npb25TZXJ2aWNlKVxyXG4uc2VydmljZSgnQ29yZG92YVNlcnZpY2UnLCBDb3Jkb3ZhU2VydmljZSlcclxuLnNlcnZpY2UoJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCBMb2NhbFN0b3JhZ2VTZXJ2aWNlKVxyXG5cclxuLmNvbnRyb2xsZXIoJ0FwcENvbnRyb2xsZXInLCBBcHBDb250cm9sbGVyKVxyXG5cclxuLy8gLmRpcmVjdGl2ZSgnZmV0Y2hMaXN0JywgRmV0Y2hMaXN0LmZhY3RvcnkoKSlcclxuXHJcblxyXG5pb25pYy5QbGF0Zm9ybS5yZWFkeSgoKSA9PiB7XHJcblx0aWYgKHdpbmRvdy5jb3Jkb3ZhICYmIHdpbmRvdy5jb3Jkb3ZhLnBsdWdpbnMuS2V5Ym9hcmQpIHtcclxuXHR9XHJcblxyXG5cdF8uZGVmZXIoKCkgPT4ge1xyXG5cdFx0YW5ndWxhci5ib290c3RyYXAoZG9jdW1lbnQsIFsncmFwaWRNb2JpbGUnXSk7XHJcblx0fSk7XHJcbn0pO1xyXG4iLG51bGwsIihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcbiAgICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKS5jb250cm9sbGVyKCdNaXNDb250cm9sbGVyJywgWyckc2NvcGUnLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ01pc1NlcnZpY2UnLCAnQ2hhcnRPcHRpb25zJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRpb25pY0xvYWRpbmcnLCAnJHRpbWVvdXQnLCAnJHdpbmRvdycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckaW9uaWNQb3BvdmVyJywgJ0ZpbHRlcmVkTGlzdFNlcnZpY2UnLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRmaWx0ZXInLCAnTG9naW5TZXJ2aWNlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1pc0NvbnRyb2xsZXJdKTtcclxuXHJcbiAgICBmdW5jdGlvbiBNaXNDb250cm9sbGVyKCRzY29wZSwgTWlzU2VydmljZSwgQ2hhcnRPcHRpb25zLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRpb25pY0xvYWRpbmcsICR0aW1lb3V0LCAkd2luZG93LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRpb25pY1BvcG92ZXIsIEZpbHRlcmVkTGlzdFNlcnZpY2UsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRmaWx0ZXIsIExvZ2luU2VydmljZSkge1xyXG5cclxuICAgICAgICAkc2NvcGUudGFicz1be1xyXG4gICAgICAgICAgICAgdGl0bGU6ICdNeSBEYXNoYm9hcmQnLCAgICAgICAgICAgICBcclxuICAgICAgICAgICAgIG5hbWVzOiAnTXlEYXNoYm9hcmQnLFxyXG4gICAgICAgICAgICAgaWNvbiA6ICdpY29ub24taG9tZSdcclxuICAgICAgICAgICB9LFxyXG4gICAgICAgICAgIHtcclxuICAgICAgICAgICAgIHRpdGxlOiAnTWV0cmljIFNuYXBzaG90JywgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICBuYW1lczogJ01ldHJpY1NuYXBzaG90JyxcclxuICAgICAgICAgICAgIGljb24gOiAnaW9uLWhvbWUnXHJcbiAgICAgICAgICAgfSxcclxuICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICB0aXRsZTogJ1RhcmdldCBWcyBBY3R1YWwnLCAgICAgICAgICAgICBcclxuICAgICAgICAgICAgIG5hbWVzOiAnVGFyZ2V0VnNBY3R1YWwnLFxyXG4gICAgICAgICAgICAgaWNvbiA6ICdpb24taG9tZSdcclxuICAgICAgICAgICB9LFxyXG4gICAgICAgICAgIHtcclxuICAgICAgICAgICAgIHRpdGxlOiAnUmV2ZW51ZSBBbmFseXNpcycsXHJcbiAgICAgICAgICAgICBuYW1lczogJ1JldmVudWVBbmFseXNpcycsXHJcbiAgICAgICAgICAgICBpY29uIDogJ2lvbi1ob21lJ1xyXG4gICAgICAgICAgIH0sXHJcbiAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgdGl0bGU6ICdTZWN0b3IgJiBDYXJyaWVyIEFuYWx5c2lzJywgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICBuYW1lczogJ1NlY3RvckFuZENhcnJpZXJBbmFseXNpcycsXHJcbiAgICAgICAgICAgICBpY29uIDogJ2lvbi1ob21lJ1xyXG4gICAgICAgICAgIH0sXHJcbiAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgdGl0bGU6ICdSb3V0ZSBSZXZlbnVlJywgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICBuYW1lczogJ1JvdXRlUmV2ZW51ZScsXHJcbiAgICAgICAgICAgICBpY29uIDogJ2lvbi1ob21lJ1xyXG4gICAgICAgICAgIH1cclxuICAgICAgICBdO1xyXG4gICAgICAgICRzY29wZS50b2dnbGUgPSB7XHJcbiAgICAgICAgICAgIG1vbnRoT3JZZWFyIDogJ21vbnRoJyxcclxuICAgICAgICAgICAgdGFyZ2V0UmV2T3JQYXg6ICdyZXZlbnVlJyxcclxuICAgICAgICAgICAgc2VjdG9yT3JkZXI6ICd0b3A1JyxcclxuICAgICAgICAgICAgc2VjdG9yUmV2T3JQYXg6ICdyZXZlbnVlJ1xyXG4gICAgICAgIH1cclxuICAgICAgICAkc2NvcGUub3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgbWV0cmljOiBDaGFydE9wdGlvbnMubWV0cmljQmFyQ2hhcnQub3B0aW9ucygpLFxyXG4gICAgICAgICAgICB0YXJnZXRMaW5lQ2hhcnQ6IENoYXJ0T3B0aW9ucy5saW5lQ2hhcnQub3B0aW9ucygpLFxyXG4gICAgICAgICAgICB0YXJnZXRCYXJDaGFydDogQ2hhcnRPcHRpb25zLnRhcmdldEJhckNoYXJ0Lm9wdGlvbnMoKSxcclxuICAgICAgICAgICAgcGFzc2VuZ2VyQ2hhcnQ6IENoYXJ0T3B0aW9ucy5wYXNzZW5nZXJDb3VudENoYXJ0Lm9wdGlvbnMoKVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLmhlYWRlciA9IHtcclxuICAgICAgICAgICAgICAgIGZsb3duTW9udGg6ICcnLFxyXG4gICAgICAgICAgICAgICAgc3VyY2hhcmdlIDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICB0YWJJbmRleDogMCxcclxuICAgICAgICAgICAgICAgIGhlYWRlckluZGV4OiAwLFxyXG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6IExvZ2luU2VydmljZS5nZXRVc2VyKCkudXNlcm5hbWVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICBNaXNTZXJ2aWNlLmdldFBheEZsb3duTWlzSGVhZGVyKHt1c2VySWQ6ICRzY29wZS5oZWFkZXIudXNlcm5hbWV9KVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgJHNjb3BlLnN1YkhlYWRlciA9IGRhdGEucmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLnN1YkhlYWRlcik7XHJcbiAgICAgICAgICAgICRzY29wZS5oZWFkZXIuZmxvd25Nb250aCA9ICRzY29wZS5zdWJIZWFkZXIucGF4Rmxvd25NaXNNb250aHNbMF0uZmxvd01vbnRoO1xyXG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbignW2hlYWRlci5mbG93bk1vbnRoLCBoZWFkZXIuc3VyY2hhcmdlXScsIGZ1bmN0aW9uKG5ld1ZhbCwgb2xkVmFsKXtcclxuICAgICAgICAgICAgJHNjb3BlLm9uU2xpZGVNb3ZlKHtpbmRleDogJHNjb3BlLmhlYWRlci50YWJJbmRleH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgICRzY29wZS51cGRhdGVIZWFkZXIgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAkc2NvcGUuaGVhZGVyLmhlYWRlckluZGV4ID0gXy5maW5kSW5kZXgoJHNjb3BlLnN1YkhlYWRlci5wYXhGbG93bk1pc01vbnRocywgZnVuY3Rpb24oY2hyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hyLmZsb3dNb250aCA9PSAkc2NvcGUuaGVhZGVyLmZsb3duTW9udGg7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICAkc2NvcGUub25TbGlkZU1vdmUgPSBmdW5jdGlvbihkYXRhKXtcclxuICAgICAgICAgICAgJHNjb3BlLmhlYWRlci50YWJJbmRleCA9IGRhdGEuaW5kZXg7ICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHN3aXRjaCgkc2NvcGUuaGVhZGVyLnRhYkluZGV4KXtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZ2V0Rmxvd25GYXZvcml0ZXMoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMTogICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNhbGxNZXRyaWNTbmFwc2hvdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAyOiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNhbGxUYXJnZXRWc0FjdHVhbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAzOiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNhbGxSZXZlbnVlQW5hbHlzaXMoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNDpcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2FsbFNlY3RvckNhcnJpZXJBbmFseXNpcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OlxyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jYWxsUm91dGVSZXZlbnVlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS50b2dnbGVNZXRyaWMgPSBmdW5jdGlvbih2YWwpIHtcclxuICAgICAgICAgICAgJHNjb3BlLnRvZ2dsZS5tb250aE9yWWVhciA9IHZhbDtcclxuICAgICAgICAgICAgJHNjb3BlLm9uU2xpZGVNb3ZlKHtpbmRleDogJHNjb3BlLmhlYWRlci50YWJJbmRleH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICAkc2NvcGUudG9nZ2xlVGFyZ2V0ID0gZnVuY3Rpb24odmFsKXtcclxuICAgICAgICAgICAgJHNjb3BlLnRvZ2dsZS50YXJnZXRSZXZPclBheCA9IHZhbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgJHNjb3BlLnRvZ2dsZVNlY3RvciA9IGZ1bmN0aW9uKHZhbCl7XHJcbiAgICAgICAgICAgICRzY29wZS50b2dnbGUuc2VjdG9yUmV2T3JQYXggPSB2YWw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgICRzY29wZS5jYWxsTWV0cmljU25hcHNob3QgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBmbG93bk1vbnRoOiAkc2NvcGUuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAoJHNjb3BlLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcclxuICAgICAgICAgICAgICAgIHVzZXJJZDogJHNjb3BlLmhlYWRlci51c2VybmFtZSxcclxuICAgICAgICAgICAgICAgIHRvZ2dsZTE6ICRzY29wZS50b2dnbGUubW9udGhPclllYXIsXHJcbiAgICAgICAgICAgICAgICBmdWxsRGF0YUZsYWc6ICdOJ1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAkc2NvcGUuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG4gICAgICAgICAgICBNaXNTZXJ2aWNlLmdldE1ldHJpY1NuYXBzaG90KHJlcWRhdGEpXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLm1ldHJpY1Jlc3VsdCAgPSBfLnNvcnRCeShkYXRhLnJlc3BvbnNlLmRhdGEuTWV0cmljU25hcHNob3RDaGFydHMsIGZ1bmN0aW9uKHUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goJHNjb3BlLm1ldHJpY1Jlc3VsdCwgZnVuY3Rpb24gKG4sIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbi52YWx1ZXNbMF0uY29sb3IgPSAnIzRBOTBFMic7XHJcbiAgICAgICAgICAgICAgICAgICAgbi52YWx1ZXNbMV0uY29sb3IgPSAnIzUwRTNDMic7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYobi52YWx1ZXNbMl0pIG4udmFsdWVzWzJdLmNvbG9yID0gJyNCOEU5ODYnO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuZmF2TWV0cmljUmVzdWx0ID0gXy5maWx0ZXIoJHNjb3BlLm1ldHJpY1Jlc3VsdCwgZnVuY3Rpb24odSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICRzY29wZS5tZXRyaWNMZWdlbmRzID0gZGF0YS5yZXNwb25zZS5kYXRhLmxlZ2VuZHM7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmKCRzY29wZS5oZWFkZXIudGFiSW5kZXggPT0gMClcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubWV0cmljUmVzdWx0ID0gJHNjb3BlLmZhdk1ldHJpY1Jlc3VsdDtcclxuICAgICAgICAgICAgICAgICRzY29wZS5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcblxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgJHNjb3BlLmNhbGxUYXJnZXRWc0FjdHVhbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIGZsb3duTW9udGg6ICRzY29wZS5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICgkc2NvcGUuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICAgICAgdXNlcklkOiAkc2NvcGUuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICAgICAgdG9nZ2xlMTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICBmdWxsRGF0YUZsYWc6ICdzdHJpbmcnXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICRzY29wZS5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICAgICAgICAgIE1pc1NlcnZpY2UuZ2V0VGFyZ2V0VnNBY3R1YWwocmVxZGF0YSlcclxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgLy8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuZmF2VGFyZ2V0TGluZVJlc3VsdCA9IF8uZmlsdGVyKGRhdGEucmVzcG9uc2UuZGF0YS5saW5lQ2hhcnRzLCBmdW5jdGlvbih1KSB7IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLmZhdlRhcmdldEJhclJlc3VsdCA9IF8uZmlsdGVyKGRhdGEucmVzcG9uc2UuZGF0YS52ZXJCYXJDaGFydHMsIGZ1bmN0aW9uKHUpIHsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goZGF0YS5yZXNwb25zZS5kYXRhLnZlckJhckNoYXJ0cywgZnVuY3Rpb24gKG4sIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbi52YWx1ZXNbMF0uY29sb3IgPSAnIzRBOTBFMic7XHJcbiAgICAgICAgICAgICAgICAgICAgbi52YWx1ZXNbMV0uY29sb3IgPSAnIzUwRTNDMic7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHZhciBsaW5lQ29sb3JzID0gW3tcImNvbG9yXCI6IFwiIzRBOTBFMlwiLCBcImNsYXNzZWRcIjogXCJkYXNoZWRcIixcInN0cm9rZVdpZHRoXCI6IDJ9LFxyXG4gICAgICAgICAgICAgICAge1wiY29sb3JcIjogXCIjNTBFM0MyXCJ9LHtcImNvbG9yXCI6IFwiI0I4RTk4NlwiLCBcImFyZWFcIiA6IHRydWUsIFwiZGlzYWJsZWRcIjogdHJ1ZX1dO1xyXG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGRhdGEucmVzcG9uc2UuZGF0YS5saW5lQ2hhcnRzLCBmdW5jdGlvbiAobiwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgXy5tZXJnZShuLmxpbmVDaGFydEl0ZW1zLCBsaW5lQ29sb3JzKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHMpO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnRhcmdldEFjdHVhbERhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaG9yQmFyQ2hhcnQ6IGRhdGEucmVzcG9uc2UuZGF0YS52ZXJCYXJDaGFydHMsXHJcbiAgICAgICAgICAgICAgICAgICAgbGluZUNoYXJ0OiBkYXRhLnJlc3BvbnNlLmRhdGEubGluZUNoYXJ0c1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICRzY29wZS5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgJHNjb3BlLmNhbGxSb3V0ZVJldmVudWUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIHJvdXRlUmV2UmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgICAgIGZsb3duTW9udGg6ICRzY29wZS5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICgkc2NvcGUuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICAgICAgdXNlcklkOiAkc2NvcGUuaGVhZGVyLnVzZXJuYW1lXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIE1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlKHJvdXRlUmV2UmVxdWVzdClcclxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnJvdXRlUmV2RGF0YSA9IGRhdGEucmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgICRzY29wZS5jYWxsUmV2ZW51ZUFuYWx5c2lzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgZmxvd25Nb250aDogJHNjb3BlLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKCRzY29wZS5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXHJcbiAgICAgICAgICAgICAgICB1c2VySWQ6ICRzY29wZS5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICRzY29wZS5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICAgICAgICAgIE1pc1NlcnZpY2UuZ2V0UmV2ZW51ZUFuYWx5c2lzKHJlcWRhdGEpXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxyXG4gICAgICAgICAgICAgICAgdmFyIGpzb25PYmogPSBkYXRhLnJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICB2YXIgc29ydGVkRGF0YSA9IF8uc29ydEJ5KGpzb25PYmoubXVsdGliYXJDaGFydHMsIGZ1bmN0aW9uKHUpIHsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1KSByZXR1cm4gW3UuZmF2b3JpdGVDaGFydFBvc2l0aW9uXTsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgZmF2UmV2ZW51ZUJhclJlc3VsdCA9IF8uZmlsdGVyKHNvcnRlZERhdGEsIGZ1bmN0aW9uKHUpIHsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIHNvcnRlZERhdGEgPSBfLnNvcnRCeShqc29uT2JqLnBpZUNoYXJ0cywgZnVuY3Rpb24odSkgeyBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHZhciBmYXZSZXZlbnVlUGllUmVzdWx0ID0gXy5maWx0ZXIoc29ydGVkRGF0YSwgZnVuY3Rpb24odSkgeyBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTsgIFxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goanNvbk9iai5tdWx0aWJhckNoYXJ0cywgZnVuY3Rpb24gKG4sIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbi5tdWx0aWJhckNoYXJ0SXRlbXNbMF0uY29sb3IgPSAnIzRBOTBFMic7XHJcbiAgICAgICAgICAgICAgICAgICAgbi5tdWx0aWJhckNoYXJ0SXRlbXNbMV0uY29sb3IgPSAnIzUwRTNDMic7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHZhciBwaWVDb2xvcnMgPSBbe1wiY29sb3JcIjogXCIjMjhiNmY2XCJ9LHtcImNvbG9yXCI6IFwiIzdiZDRmY1wifSx7XCJjb2xvclwiOiBcIiNDNkU1RkFcIn1dO1xyXG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGpzb25PYmoucGllQ2hhcnRzWzBdLmRhdGEsIGZ1bmN0aW9uIChuLCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG4ubGFiZWwgPSBuLnh2YWw7XHJcbiAgICAgICAgICAgICAgICAgICAgbi52YWx1ZSA9IG4ueXZhbDtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgXy5tZXJnZShqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCBwaWVDb2xvcnMpOyAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnJldmVudWVEYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldmVudWVQaWVDaGFydCA6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgIHJldmVudWVCYXJDaGFydCA6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMV0ubXVsdGliYXJDaGFydEl0ZW1zLFxyXG4gICAgICAgICAgICAgICAgICAgIHJldmVudWVIb3JCYXJDaGFydCA6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMl0ubXVsdGliYXJDaGFydEl0ZW1zXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLmlvbmljTG9hZGluZ0hpZGUoKTsgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICAkc2NvcGUub3BlbkRyaWxsRG93biA9IGZ1bmN0aW9uKHJlZ2lvbkRhdGEsc2VsRmluZExldmVsKSB7ICBcclxuICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsXSA9IHJlZ2lvbkRhdGE7XHJcbiAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbCArIDFdID0gJyc7XHJcbiAgICAgICAgICAgIGlmKHNlbEZpbmRMZXZlbCAhPSAnMycpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlZ2lvbk5hbWUgPSAocmVnaW9uRGF0YS5yZWdpb25OYW1lKSA/IHJlZ2lvbkRhdGEucmVnaW9uTmFtZSA6IHJlZ2lvbkRhdGEuaGVhZGluZzE7XHJcbiAgICAgICAgICAgICAgICB2YXIgY291bnRyeUZyb21UbyA9IChyZWdpb25EYXRhLmNvdW50cnlGcm9tICYmIHJlZ2lvbkRhdGEuY291bnRyeVRvKSA/IHJlZ2lvbkRhdGEuY291bnRyeUZyb20gKyAnLScgKyByZWdpb25EYXRhLmNvdW50cnlUbyA6IFwiXCI7XHJcbiAgICAgICAgICAgICAgICB2YXIgc2VjdG9yRnJvbVRvID0gKHJlZ2lvbkRhdGEuZmxvd25TZWN0b3IgJiYgZHJpbGxMZXZlbCA+PSAzKSA/IHJlZ2lvbkRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xyXG4gICAgICAgICAgICAgICAgdmFyIGZsaWdodE51bWJlciA9IChyZWdpb25EYXRhLmZsaWdodE51bWJlciAmJiBkcmlsbExldmVsID09IDQpID8gcmVnaW9uRGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgICAgICAgICAgICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiAkc2NvcGUuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICgkc2NvcGUuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICAgICAgICAgIFwidXNlcklkXCI6ICRzY29wZS5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJzdHJpbmdcIixcclxuICAgICAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcclxuICAgICAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICAgICAgICAgICAgICBcInJlZ2lvbk5hbWVcIjogKCRzY29wZS5yZWdpb25OYW1lKT8gJHNjb3BlLnJlZ2lvbk5hbWUgOiBcIk5vcnRoIEFtZXJpY2FcIixcclxuICAgICAgICAgICAgICAgICAgICBcImNvdW50cnlGcm9tVG9cIjogY291bnRyeUZyb21UbyxcclxuICAgICAgICAgICAgICAgICAgICBcInNlY3RvckZyb21Ub1wiOiBzZWN0b3JGcm9tVG8sXHJcbiAgICAgICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiAwXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBNaXNTZXJ2aWNlLmdldFJvdXRlUmV2ZW51ZURyaWxsRG93bihyZXFkYXRhKVxyXG4gICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gZGF0YS5yZXNwb25zZTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZmluZExldmVsID0gZHJpbGxMZXZlbCAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YS5zdGF0dXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5ncm91cHNbZmluZExldmVsXS5pdGVtc1swXSA9IGRhdGEuZGF0YS5yb3dzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZ3JvdXBzW2ZpbmRMZXZlbF0ub3JnSXRlbXNbMF0gPSBkYXRhLmRhdGEucm93cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zb3J0KCdwYXhDb3VudCcsZmluZExldmVsLGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNsZWFyRHJpbGwoZHJpbGxMZXZlbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd25Hcm91cCA9IGZpbmRMZXZlbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jbGVhckRyaWxsKGZpbmRMZXZlbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgfSxmdW5jdGlvbihlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2xvc2VzUG9wb3ZlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICBhbGVydCgnU2VydmVyIEVycm9yJyk7XHJcbiAgICAgICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgICAgIH0gXHJcbiAgICAgICAgfVxyXG4gICAgICAgICRzY29wZS5jbGVhckRyaWxsID0gZnVuY3Rpb24obGV2ZWwpe1xyXG4gICAgICAgICAgICBmb3IoaT1sZXZlbDtpPD0zO2krKyl7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuZ3JvdXBzW2ldLml0ZW1zLnNwbGljZSgwLCAxKTtcclxuICAgICAgICAgICAgICAgICRzY29wZS5ncm91cHNbaV0ub3JnSXRlbXMuc3BsaWNlKDAsIDEpO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNvcnQoJ3BheENvdW50JyxpLGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5ncm91cHMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAgJHNjb3BlLm9wZW5Qb3BvdmVyID0gZnVuY3Rpb24oJGV2ZW50LGluZGV4LGNoYXJ0dHlwZSkge1xyXG4gICAgICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICRzY29wZS5jaGFydHR5cGUgPSBjaGFydHR5cGU7XHJcbiAgICAgICAgICAgICAkc2NvcGUuZ3JhcGhpbmRleCA9IGluZGV4O1xyXG4gICAgICAgICAgICAgJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL2dyYXBoLXBvcG92ZXIuaHRtbCcsIHtcclxuICAgICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZVxyXG4gICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xyXG4gICAgICAgICAgICAgICAgICRzY29wZS5wb3BvdmVyc2hvd24gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAkc2NvcGUuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcclxuICAgICAgICAgICAgICAgICAgJHNjb3BlLmdyYXBocG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAkc2NvcGUub3BlblNlY3RvclBvcG92ZXIgPSBmdW5jdGlvbigkZXZlbnQsaW5kZXgsY2hhcnR0eXBlKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5jaGFydHR5cGUgPSBjaGFydHR5cGU7XHJcbiAgICAgICAgICAgICAkc2NvcGUuZ3JhcGhpbmRleCA9IGluZGV4O1xyXG4gICAgICAgICAgICAgJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL3NlY3Rvci1ncmFwaC1wb3BvdmVyLmh0bWwnLCB7XHJcbiAgICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGVcclxuICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHBvcG92ZXIpIHtcclxuICAgICAgICAgICAgICAgICAkc2NvcGUucG9wb3ZlcnNob3duID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgJHNjb3BlLmdyYXBocG9wb3ZlciA9IHBvcG92ZXI7XHJcbiAgICAgICAgICAgICAgICAgICRzY29wZS5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICAkc2NvcGUuY2FsbFNlY3RvckNhcnJpZXJBbmFseXNpcyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIGZsb3duTW9udGg6ICRzY29wZS5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICgkc2NvcGUuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICAgICAgdXNlcklkOiAkc2NvcGUuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICAgICAgdG9nZ2xlMTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICB0b2dnbGUyOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXHJcbiAgICAgICAgICAgIH07ICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICRzY29wZS5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICAgICAgICAgIE1pc1NlcnZpY2UuZ2V0U2VjdG9yQ2FycmllckFuYWx5c2lzKHJlcWRhdGEpXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxyXG4gICAgICAgICAgICAgICAgdmFyIGpzb25PYmogPSBkYXRhLnJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goanNvbk9iai5TZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHMsIGZ1bmN0aW9uKHZhbCwgaSl7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsWydvdGhlcnMnXSA9IHZhbC5pdGVtcy5zcGxpY2UoLTEsIDEpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgc29ydGVkRGF0YSA9IF8uc29ydEJ5KGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzLCBmdW5jdGlvbih1KSB7IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodSkgcmV0dXJuIFt1LmZhdm9yaXRlQ2hhcnRQb3NpdGlvbl07IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgdmFyIGZhdlNlY3RvckNhcnJpZXJSZXN1bHQgPSBfLmZpbHRlcihzb3J0ZWREYXRhLCBmdW5jdGlvbih1KSB7IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7ICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLlNlY3RvckNhcnJpZXJBbmFseXNpc0NoYXJ0cyA9IGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICAkc2NvcGUudGFyZ2V0QWN0dWFsRmlsdGVyID0gZnVuY3Rpb24oaXRlbSkge1xyXG4gICAgICAgICAgICBpZiggaXRlbS50b2dnbGUxID09ICRzY29wZS50b2dnbGUudGFyZ2V0UmV2T3JQYXggKSB7XHJcbiAgICAgICAgICAgICAgICAvLyRzY29wZS4kaW5kZXggPSAxO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7IFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgJHNjb3BlLnNlY3RvckNhcnJpZXJGaWx0ZXIgPSBmdW5jdGlvbihpdGVtKSB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGl0ZW0pO1xyXG4gICAgICAgICAgICBpZiggaXRlbS50b2dnbGUxID09ICRzY29wZS50b2dnbGUuc2VjdG9yT3JkZXIgJiYgXHJcbiAgICAgICAgICAgICAgICBpdGVtLnRvZ2dsZTIgPT0gJHNjb3BlLnRvZ2dsZS5zZWN0b3JSZXZPclBheFxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTsgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICAkc2NvcGUucmV2ZW51ZUFuYWx5c2lzRmlsdGVyID0gZnVuY3Rpb24oaXRlbSkge1xyXG4gICAgICAgICAgICB2YXIgc3VyY2hhcmdlRmxhZyA9ICgkc2NvcGUuaGVhZGVyLnN1cmNoYXJnZSkgPyBcIllcIiA6IFwiTlwiO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzdXJjaGFyZ2VGbGFnKycgOiAnK2l0ZW0pO1xyXG4gICAgICAgICAgICBpZiggaXRlbS5zdXJjaGFyZ2VGbGFnID09IHN1cmNoYXJnZUZsYWcpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlOyBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgICRzY29wZS5nZXRGbG93bkZhdm9yaXRlcyA9IGZ1bmN0aW9uKCl7ICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICRzY29wZS5jYWxsTWV0cmljU25hcHNob3QoKTtcclxuICAgICAgICAgICAgJHNjb3BlLmNhbGxUYXJnZXRWc0FjdHVhbCgpO1xyXG4gICAgICAgICAgICAkc2NvcGUuY2FsbFJldmVudWVBbmFseXNpcygpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAkc2NvcGUuaW9uaWNMb2FkaW5nU2hvdyA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICRpb25pY0xvYWRpbmcuc2hvdyh7XHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogJzxpb24tc3Bpbm5lciBjbGFzcz1cInNwaW5uZXItY2FsbVwiPjwvaW9uLXNwaW5uZXI+J1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS5pb25pY0xvYWRpbmdIaWRlID0gZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgJGlvbmljTG9hZGluZy5oaWRlKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvL3JlZnJlc2ggY2hhcnRzXHJcblxyXG4gICAgICAgLyogYW5ndWxhci5lbGVtZW50KHdpbmRvdykub24oJ3Jlc2l6ZScsIGZ1bmN0aW9uKGUsIHNjb3BlKSB7XHJcbiAgICAgICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpOyAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAkc2NvcGUub25TbGlkZU1vdmUoe2luZGV4OiAkc2NvcGUuaGVhZGVyLnRhYkluZGV4fSk7XHJcbiAgICAgICAgfSk7Ki9cclxuXHJcbiAgICAgICAgYW5ndWxhci5lbGVtZW50KHdpbmRvdykuYmluZCgnb3JpZW50YXRpb25jaGFuZ2UnLCBmdW5jdGlvbihlLCBzY29wZSkge1xyXG4gICAgICAgICAgICAkc2NvcGUub25TbGlkZU1vdmUoe2luZGV4OiAkc2NvcGUuaGVhZGVyLnRhYkluZGV4fSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgLyogLS0tLS0tLS0gSW5mbyBwb3BvdmVyIC0tLS0qL1xyXG4gICAgICAgIFxyXG4gICAgICAgICAkaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvaW5mb3Rvb2x0aXAuaHRtbCcsIHtcclxuICAgICAgICAgICAgc2NvcGU6ICRzY29wZVxyXG4gICAgICAgICAgfSkudGhlbihmdW5jdGlvbihpbmZvcG9wb3Zlcikge1xyXG4gICAgICAgICAgICAkc2NvcGUuaW5mb3BvcG92ZXIgPSBpbmZvcG9wb3ZlcjtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAkc2NvcGUub3BlbmluZm9Qb3BvdmVyID0gZnVuY3Rpb24oJGV2ZW50LGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgIGlmICh0eXBlb2YgaW5kZXg9PVwidW5kZWZpbmVkXCIgfHwgaW5kZXg9PVwiXCIpIHtcclxuICAgICAgICAgICAgICAkc2NvcGUuaW5mb2RhdGE9J05vIGluZm8gYXZhaWxhYmxlJztcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAkc2NvcGUuaW5mb2RhdGE9aW5kZXg7XHJcbiAgICAgICAgICB9IFxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhpbmRleCk7XHJcbiAgICAgICAgICAgICRzY29wZS5pbmZvcG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS5jbG9zZVBvcG92ZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmdyYXBocG9wb3Zlci5oaWRlKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUuY2xvc2VJbmZvUG9wb3ZlciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuaW5mb3BvcG92ZXIuaGlkZSgpO1xyXG4gICAgICAgIH07XHJcbiAgICBcclxuICAgICAgICAvKiBkcmlsbGRvd24gKi9cclxuICAgICAgICAkaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvZHJpbGRvd24uaHRtbCcsIHtcclxuICAgICAgICAgICAgc2NvcGU6ICRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oZHJpbGxwb3BvdmVyKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5kcmlsbHBvcG92ZXIgPSBkcmlsbHBvcG92ZXI7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgJHNjb3BlLmRyaWxsdGFicyA9IFsnQ291bnRyeSBMZXZlbCcsJ1NlY3RvciBMZXZlbCcsJ0ZsaWdodCBMZXZlbCcsJ0RvY3VtZW50IExldmVsJ107XHJcbiAgICAgICAgJHNjb3BlLm9wZW5EcmlsbERvd25Qb3BvdmVyID0gZnVuY3Rpb24oJGV2ZW50LHJlZ2lvbkRhdGEsc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5kcmlsbHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgICAgICAkc2NvcGUub3BlbkRyaWxsRG93bihyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCk7IFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLmNsb3Nlc1BvcG92ZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmRyaWxscG9wb3Zlci5oaWRlKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUucGFnZVNpemUgPSA0O1xyXG4gICAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IFtdO1xyXG4gICAgICAgICRzY29wZS5zZWxlY3RlZERyaWxsID0gW107XHJcbiAgICAgICAgJHNjb3BlLmdyb3VwcyA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaTw9MzsgaSsrKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5ncm91cHNbaV0gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogaSxcclxuICAgICAgICAgICAgICAgIG5hbWU6ICRzY29wZS5kcmlsbHRhYnNbaV0sXHJcbiAgICAgICAgICAgICAgICBpdGVtczogW10sXHJcbiAgICAgICAgICAgICAgICBvcmdJdGVtczogW10sXHJcbiAgICAgICAgICAgICAgICBJdGVtc0J5UGFnZTogW11cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICAgICAgJHNjb3BlLmlzRHJpbGxSb3dTZWxlY3RlZCA9IGZ1bmN0aW9uKGxldmVsLG9iail7XHJcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc2VsZWN0ZWREcmlsbFtsZXZlbF0gPT0gb2JqO1xyXG4gICAgICAgIH1cclxuICAgICAgICAkc2NvcGUuc2VhcmNoUmVzdWx0cyA9IGZ1bmN0aW9uIChsZXZlbCxvYmopIHtcclxuICAgICAgICAgICAgJHNjb3BlLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSBGaWx0ZXJlZExpc3RTZXJ2aWNlLnNlYXJjaGVkKCRzY29wZS5ncm91cHNbbGV2ZWxdLm9yZ0l0ZW1zWzBdLCBvYmouc2VhcmNoVGV4dCwgbGV2ZWwpO1xyXG4gICAgICAgICAgICBpZiAob2JqLnNlYXJjaFRleHQgPT0gJycpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5yZXNldEFsbChsZXZlbCk7IFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSAkc2NvcGUuZ3JvdXBzW2xldmVsXS5vcmdJdGVtc1swXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcclxuICAgICAgICAgICAgJHNjb3BlLnBhZ2luYXRpb24obGV2ZWwpOyBcclxuICAgICAgICB9XHJcbiAgICAgICAgJHNjb3BlLnBhZ2luYXRpb24gPSBmdW5jdGlvbiAobGV2ZWwpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UgPSBGaWx0ZXJlZExpc3RTZXJ2aWNlLnBhZ2VkKCRzY29wZS5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCAkc2NvcGUucGFnZVNpemUgKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS5zZXRQYWdlID0gZnVuY3Rpb24gKGxldmVsKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5jdXJyZW50UGFnZVtsZXZlbF0gPSB0aGlzLm47XHJcbiAgICAgICAgfTtcclxuICAgICAgICAkc2NvcGUuZmlyc3RQYWdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSAwO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLmxhc3RQYWdlID0gZnVuY3Rpb24gKGxldmVsKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5jdXJyZW50UGFnZVtsZXZlbF0gPSAkc2NvcGUuZ3JvdXBzW2xldmVsXS5JdGVtc0J5UGFnZS5sZW5ndGggLSAxO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLnJlc2V0QWxsID0gZnVuY3Rpb24gKGxldmVsKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5jdXJyZW50UGFnZVtsZXZlbF0gPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICAkc2NvcGUuc29ydCA9IGZ1bmN0aW9uKHNvcnRCeSxsZXZlbCxvcmRlcil7XHJcbiAgICAgICAgICAgICRzY29wZS5yZXNldEFsbChsZXZlbCk7XHJcbiAgICAgICAgICAgICRzY29wZS5jb2x1bW5Ub09yZGVyID0gc29ydEJ5OyBcclxuICAgICAgICAgICAgLy8kRmlsdGVyIC0gU3RhbmRhcmQgU2VydmljZVxyXG4gICAgICAgICAgICAkc2NvcGUuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9ICRmaWx0ZXIoJ29yZGVyQnknKSgkc2NvcGUuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSwgJHNjb3BlLmNvbHVtblRvT3JkZXIsIG9yZGVyKTsgXHJcbiAgICAgICAgICAgICRzY29wZS5wYWdpbmF0aW9uKGxldmVsKTsgICAgXHJcbiAgICAgICAgfTsgXHJcbiAgICAgICAgJHNjb3BlLnJhbmdlID0gZnVuY3Rpb24gKGlucHV0LCB0b3RhbCkge1xyXG4gICAgICAgICAgICB2YXIgcmV0ID0gW107XHJcbiAgICAgICAgICAgIGlmICghdG90YWwpIHtcclxuICAgICAgICAgICAgICAgIHRvdGFsID0gaW5wdXQ7XHJcbiAgICAgICAgICAgICAgICBpbnB1dCA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IGlucHV0OyBpIDwgdG90YWw7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgcmV0LnB1c2goaSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHJldDtcclxuICAgICAgICB9O1xyXG4gICAgICAgICRzY29wZS50b2dnbGVHcm91cCA9IGZ1bmN0aW9uKGdyb3VwKSB7XHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUuaXNHcm91cFNob3duKGdyb3VwKSkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNob3duR3JvdXAgPSBudWxsO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNob3duR3JvdXAgPSBncm91cDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgJHNjb3BlLmlzR3JvdXBTaG93biA9IGZ1bmN0aW9uKGdyb3VwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc2hvd25Hcm91cCA9PT0gZ3JvdXA7XHJcbiAgICAgICAgfTsgICAgICAgIFxyXG4gICAgfTsgICAgXHJcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcclxuICAndXNlIHN0cmljdCc7XHJcbiAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcclxuICAuZGlyZWN0aXZlKCdoZVByb2dyZXNzQmFyJywgZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGRpcmVjdGl2ZURlZmluaXRpb25PYmplY3QgPSB7XHJcbiAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgIHJlcGxhY2U6IGZhbHNlLFxyXG4gICAgICBzY29wZToge2RhdGE6ICc9Y2hhcnREYXRhJywgc2hvd3Rvb2x0aXA6ICdAc2hvd1Rvb2x0aXAnfSxcclxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcclxuICAgICAgICAgICAgICAgICAgLmRvbWFpbihbMCwgZDMubWF4KHNjb3BlLmRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuICtkLnByb2dyZXNzIH0pXSlcclxuICAgICAgICAgICAgICAgICAgLnJhbmdlKFswLCA5MF0pO1xyXG5cclxuICAgICAgICB2YXIgc2VnbWVudCA9IGQzLnNlbGVjdChlbGVtZW50WzBdKVxyXG4gICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKFwiLmhvcml6b250YWwtYmFyLWdyYXBoLXNlZ21lbnRcIilcclxuICAgICAgICAgICAgICAgICAgICAgLmRhdGEoc2NvcGUuZGF0YSlcclxuICAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcclxuICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXNlZ21lbnRcIiwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC1sYWJlbFwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWUgfSk7XHJcblxyXG4gICAgICAgIHZhciBiYXJTZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXZhbHVlXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtdmFsdWUtc2NhbGVcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZS1iYXJcIiwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIGJhclNlZ21lbnRcclxuICAgICAgICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmNvbG9yIH0pICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxyXG4gICAgICAgICAgICAgICAuZHVyYXRpb24oMTAwMClcclxuICAgICAgICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoK2QucHJvZ3Jlc3MpICsgXCIlXCIgfSk7XHJcblxyXG4gICAgICAgIHZhciBib3hTZWdtZW50ID0gYmFyU2VnbWVudC5hcHBlbmQoXCJzcGFuXCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZS1ib3hcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnByb2dyZXNzID8gZC5wcm9ncmVzcyA6IFwiXCIgfSk7XHJcbiAgICAgICAgaWYoc2NvcGUuc2hvd3Rvb2x0aXAgIT09ICd0cnVlJykgcmV0dXJuOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgIHZhciBidG5TZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJidXR0b25cIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLWljb24gaWNvbiBpb24tY2hldnJvbi1kb3duIG5vLWJvcmRlclwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwiaGlkZVwiLCBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGQpIHJldHVybiBkLmRyaWxsRmxhZyA9PSAnTic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7ICAgICAgICAgICAgXHJcbiAgICAgICAgdmFyIHRvb2x0aXBTZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJkaXZcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJ0b29sdGlwXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKCdoaWRlJywgdHJ1ZSk7XHJcbiAgICAgICAgdG9vbHRpcFNlZ21lbnQuYXBwZW5kKFwicFwiKS50ZXh0KGZ1bmN0aW9uKGQpeyByZXR1cm4gZC5uYW1lOyB9KTtcclxuICAgICAgICB2YXIgdGFibGUgPSB0b29sdGlwU2VnbWVudC5hcHBlbmQoXCJ0YWJsZVwiKTtcclxuICAgICAgICB2YXIgdGhlYWQgPSB0YWJsZS5hcHBlbmQoJ3RyJyk7XHJcbiAgICAgICAgdGhlYWQuYXBwZW5kKCd0aCcpLnRleHQoJ1NlY3RvcicpO1xyXG4gICAgICAgIHRoZWFkLmFwcGVuZCgndGgnKS50ZXh0KCdSZXZlbnVlJyk7XHJcblxyXG4gICAgICAgIHZhciB0ciAgPSB0YWJsZVxyXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ3Rib2R5JylcclxuICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKFwidHJcIilcclxuICAgICAgICAgICAgICAgICAgICAuZGF0YShmdW5jdGlvbihkKXtyZXR1cm4gZC5zY0FuYWx5c2lzRHJpbGxzfSlcclxuICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKS5hcHBlbmQoXCJ0clwiKTtcclxuXHJcbiAgICAgICAgdmFyIHNlY3RvclRkID0gdHIuYXBwZW5kKFwidGRcIilcclxuICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5zZWN0b3IgfSk7XHJcblxyXG4gICAgICAgIHZhciByZXZlbnVlVGQgPSB0ci5hcHBlbmQoXCJ0ZFwiKVxyXG4gICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnJldmVudWUgfSk7XHJcblxyXG4gICAgICAgIGJ0blNlZ21lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKXsgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gY29uc29sZS5sb2codG9vbHRpcFNlZ21lbnQpO1xyXG4gICAgICAgICAgaWYoYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5oYXNDbGFzcygnc2hvdycpKSB7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5yZW1vdmVDbGFzcygnaW9uLWNoZXZyb24tdXAnKTtcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLmFkZENsYXNzKCdpb24tY2hldnJvbi1kb3duJyk7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkucmVtb3ZlQ2xhc3MoJ3Nob3cnKTsgICAgICAgICAgICBcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5hZGRDbGFzcygnaGlkZScpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLnJlbW92ZUNsYXNzKCdpb24tY2hldnJvbi1kb3duJyk7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5hZGRDbGFzcygnaW9uLWNoZXZyb24tdXAnKTtcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5yZW1vdmVDbGFzcygnaGlkZScpO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLmFkZENsYXNzKCdzaG93Jyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgICByZXR1cm4gZGlyZWN0aXZlRGVmaW5pdGlvbk9iamVjdDtcclxuICB9KTtcclxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKVxyXG4gIC5kaXJlY3RpdmUoJ2hlUmV2ZW51ZVByb2dyZXNzQmFyJywgZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHJldkJhck9iamVjdCA9IHtcclxuICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgcmVwbGFjZTogZmFsc2UsXHJcbiAgICAgIHNjb3BlOiB7ZGF0YTogJz1jaGFydERhdGEnfSxcclxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHNjb3BlLmRhdGEpO1xyXG4gICAgICAgIHNjb3BlLiR3YXRjaCgnZGF0YScsIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCduZXdWYWx1ZScsIG5ld1ZhbHVlKTtcclxuICAgICAgICAgICAgdmFyIHggPSBkMy5zY2FsZS5saW5lYXIoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgLmRvbWFpbihbMCwgZDMubWF4KHNjb3BlLmRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudmFsdWUgfSldKVxyXG4gICAgICAgICAgICAgICAgICAgICAgLnJhbmdlKFswLCA5MF0pO1xyXG5cclxuICAgICAgICAgICAgdmFyIHNlZ21lbnQgPSBkMy5zZWxlY3QoZWxlbWVudFswXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoXCIubmV0LXJldi1iYXItZ3JhcGgtc2VnbWVudFwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmRhdGEoc2NvcGUuZGF0YSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgIC5lbnRlcigpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXNlZ21lbnRcIiwgdHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICBzZWdtZW50LmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtbGFiZWxcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQubmFtZSB9KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXJTZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlLXNjYWxlXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlLWJhclwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlLWJveFwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlOyB9KTtcclxuXHJcbiAgICAgICAgICAgIGJhclNlZ21lbnQgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuY29sb3IgfSkgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxyXG4gICAgICAgICAgICAgICAgICAgLmR1cmF0aW9uKDEwMDApXHJcbiAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLnZhbHVlKSArIFwiJVwiIH0pOyAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgIH0gICAgICAgICAgICAgICBcclxuICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICAgIHJldHVybiByZXZCYXJPYmplY3Q7XHJcbiAgfSk7XHJcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcclxuICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKS5mYWN0b3J5KCdGaWx0ZXJlZExpc3RTZXJ2aWNlJywgZnVuY3Rpb24gKERhdGFQcm92aWRlclNlcnZpY2UsICRxKSB7XHJcbiAgICAgcmV0dXJuIHtcclxuICAgICAgc2VhcmNoZWQ6IGZ1bmN0aW9uICh2YWxMaXN0cyx0b1NlYXJjaCxsZXZlbCkge1xyXG4gICAgICAgIHJldHVybiBfLmZpbHRlcih2YWxMaXN0cywgXHJcbiAgICAgICAgICBmdW5jdGlvbiAoaSkge1xyXG4gICAgICAgICAgICAvKiBTZWFyY2ggVGV4dCBpbiBhbGwgMyBmaWVsZHMgKi9cclxuICAgICAgICAgICAgcmV0dXJuIHNlYXJjaFV0aWwoaSwgdG9TZWFyY2gsbGV2ZWwpO1xyXG4gICAgICAgICAgfSk7ICAgICAgICBcclxuICAgICAgfSxcclxuICAgICAgcGFnZWQ6IGZ1bmN0aW9uICh2YWxMaXN0cyxwYWdlU2l6ZSkge1xyXG4gICAgICAgIHJldFZhbCA9IFtdO1xyXG4gICAgICAgIGlmKHZhbExpc3RzKXtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbExpc3RzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICBpZiAoaSAlIHBhZ2VTaXplID09PSAwKSB7XHJcbiAgICAgICAgICAgIHJldFZhbFtNYXRoLmZsb29yKGkgLyBwYWdlU2l6ZSldID0gW3ZhbExpc3RzW2ldXTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldFZhbFtNYXRoLmZsb29yKGkgLyBwYWdlU2l6ZSldLnB1c2godmFsTGlzdHNbaV0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXRWYWw7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfSk7XHJcbn0pKCk7XHJcblxyXG5mdW5jdGlvbiBzZWFyY2hVdGlsKGl0ZW0sIHRvU2VhcmNoLCBsZXZlbCkge1xyXG4gICAgLyogU2VhcmNoIFRleHQgaW4gYWxsIDMgZmllbGRzICovXHJcbiAgaWYoaXRlbS5jb3VudHJ5RnJvbSAmJiBpdGVtLmNvdW50cnlUbyAmJiBsZXZlbCA9PSAwKSB7XHJcbiAgICByZXR1cm4gKGl0ZW0uY291bnRyeUZyb20udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgfHwgaXRlbS5jb3VudHJ5VG8udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICB9IGVsc2UgaWYoaXRlbS5mbG93blNlY3RvciAmJiBsZXZlbCA9PSAxKSB7XHJcbiAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gIH0gZWxzZSBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAyKSB7XHJcbiAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICB9IGVsc2UgaWYoaXRlbVsnZG9jdW1lbnQjJ10gJiYgbGV2ZWwgPT0gMikge1xyXG4gICAgcmV0dXJuIChpdGVtWydkb2N1bWVudCMnXS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG59IiwiKGZ1bmN0aW9uICgpIHtcclxuICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKS5mYWN0b3J5KCdMb2dpblNlcnZpY2UnLCBmdW5jdGlvbiAoRGF0YVByb3ZpZGVyU2VydmljZSwgJHEsJHdpbmRvdykge1xyXG4gICAgdmFyIF91c2VyID0gSlNPTi5wYXJzZSgkd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdyYXBpZE1vYmlsZS51c2VyJykpO1xyXG4gICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAodXNlcikge1xyXG4gICAgICBfdXNlciA9IHVzZXI7XHJcbiAgICAgIGlmKCR3aW5kb3cubG9jYWxTdG9yYWdlKSB7XHJcbiAgICAgICAgJHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicsIEpTT04uc3RyaW5naWZ5KF91c2VyKSk7XHJcbiAgICAgIH1cclxuICAgICAgLy8gY29uc29sZS5sb2coX3VzZXIpO1xyXG4gICAgfVxyXG4gICAgIHJldHVybiB7XHJcbiAgICAgICAgZ2V0TG9naW5Vc2VyOiBmdW5jdGlvbihyZXFkYXRhKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBEYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKCcvdXNlci9sb2dpbicscmVxZGF0YSlcclxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW52YWxpZCByZXNwb25zZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQgb24gbG9nIGluJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZS5kYXRhKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0VXNlcjogc2V0VXNlcixcclxuICAgICAgICBpc0xvZ2dlZEluOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgIHJldHVybiBfdXNlciA/IHRydWUgOiBmYWxzZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFVzZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgcmV0dXJuIF91c2VyO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbG9nb3V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICR3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInLCBudWxsKTtcclxuICAgICAgICAgX3VzZXIgPSBudWxsO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0VXNlclByb2ZpbGU6IGZ1bmN0aW9uKHJlcWRhdGEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIERhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEoJy91c2VyL3VzZXJwcm9maWxlJyxyZXFkYXRhKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpbnZhbGlkIHJlc3BvbnNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UuZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgIH07XHJcbiAgfSk7XHJcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcclxuICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKS5mYWN0b3J5KCdNaXNTZXJ2aWNlJywgZnVuY3Rpb24gKERhdGFQcm92aWRlclNlcnZpY2UsICRxKSB7XHJcbiAgICAgcmV0dXJuIHtcclxuICAgICAgICBnZXRNZXRyaWNTbmFwc2hvdDogZnVuY3Rpb24ocmVxZGF0YSkge1xyXG4gICAgICAgICAgLy8gdGhlICRodHRwIEFQSSBpcyBiYXNlZCBvbiB0aGUgZGVmZXJyZWQvcHJvbWlzZSBBUElzIGV4cG9zZWQgYnkgdGhlICRxIHNlcnZpY2VcclxuICAgICAgICAgIC8vIHNvIGl0IHJldHVybnMgYSBwcm9taXNlIGZvciB1cyBieSBkZWZhdWx0XHJcblxyXG4gICAgICByZXR1cm4gRGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YSgnL3BheGZsbm1pcy9tZXRyaWNzbmFwc2hvdCcsIHJlcWRhdGEpXHJcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgLy8gaW52YWxpZCByZXNwb25zZVxyXG4gICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UuZGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXHJcbiAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UuZGF0YSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXRUYXJnZXRWc0FjdHVhbDogZnVuY3Rpb24ocmVxZGF0YSkge1xyXG4gICAgICByZXR1cm4gRGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YSgnL3BheGZsbm1pcy90YXJnZXR2c2FjdHVhbCcsIHJlcWRhdGEpXHJcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgLy8gaW52YWxpZCByZXNwb25zZVxyXG4gICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UuZGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXHJcbiAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UuZGF0YSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXRSZXZlbnVlQW5hbHlzaXM6IGZ1bmN0aW9uKHJlcWRhdGEpIHtcclxuICAgICAgcmV0dXJuIERhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEoJy9wYXhmbG5taXMvcmV2ZW51ZWFuYWx5c2lzJywgcmVxZGF0YSlcclxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAvLyBpbnZhbGlkIHJlc3BvbnNlXHJcbiAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZS5kYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcclxuICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZS5kYXRhKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldFJvdXRlUmV2ZW51ZTogZnVuY3Rpb24ocmVxZGF0YSkge1xyXG4gICAgICAgICAgcmV0dXJuIERhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEoJy9wYXhmbG5taXMvcm91dGVyZXZlbnVlJyxyZXFkYXRhKVxyXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIC8vIGludmFsaWQgcmVzcG9uc2VcclxuICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9LCBmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xyXG4gICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0U2VjdG9yQ2FycmllckFuYWx5c2lzOiBmdW5jdGlvbihyZXFkYXRhKSB7XHJcbiAgICAgICAgICByZXR1cm4gRGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YSgnL3BheGZsbm1pcy9zZWN0b3JjYXJyaWVyYW5hbHlzaXMnLHJlcWRhdGEpXHJcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgLy8gaW52YWxpZCByZXNwb25zZVxyXG4gICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UuZGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXHJcbiAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UuZGF0YSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXRQYXhGbG93bk1pc0hlYWRlcjogZnVuY3Rpb24ocmVxZGF0YSkge1xyXG4gICAgICByZXR1cm4gRGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YSgnL3BheGZsbm1pcy9wYXhmbG93bm1pc2hlYWRlcicsIHJlcWRhdGEpXHJcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgLy8gaW52YWxpZCByZXNwb25zZVxyXG4gICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UuZGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXHJcbiAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UuZGF0YSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXRSb3V0ZVJldmVudWVEcmlsbERvd246IGZ1bmN0aW9uKHJlcWRhdGEpIHtcclxuICAgICAgICAgIHJldHVybiBEYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKCcvcGF4ZmxubWlzL3JvdXRlcmV2ZW51ZWRyaWxsJyxyZXFkYXRhKVxyXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIC8vIGludmFsaWQgcmVzcG9uc2VcclxuICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9LCBmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xyXG4gICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgfTtcclxuICAgIH0pO1xyXG59KSgpOyIsIihmdW5jdGlvbigpe1xyXG4gIGFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScpXHJcblxyXG4gIC5jb250cm9sbGVyKCdMb2dpbkNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZSwgTG9naW5TZXJ2aWNlKSB7XHJcbiAgICAvLyBGb3JtIGRhdGEgZm9yIHRoZSBsb2dpbiBtb2RhbFxyXG4gICAgJHNjb3BlLmxvZ2luRGF0YSA9IHt9O1xyXG4gICAgJHNjb3BlLmludmFsaWRNZXNzYWdlID0gZmFsc2U7XHJcbiAgICAkc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgIExvZ2luU2VydmljZS5sb2dvdXQoKTtcclxuICAgICAgJHN0YXRlLmdvKFwibG9naW5cIik7XHJcbiAgICB9O1xyXG4gICAgIFxyXG4gICAgJHNjb3BlLmNsZWFyRXJyb3IgPSBmdW5jdGlvbigpIHtcclxuICAgICAgJHNjb3BlLmludmFsaWRNZXNzYWdlID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgICAvLyBQZXJmb3JtIHRoZSBsb2dpbiBhY3Rpb24gd2hlbiB0aGUgdXNlciBzdWJtaXRzIHRoZSBsb2dpbiBmb3JtXHJcbiAgICAkc2NvcGUuZG9Mb2dpbiA9IGZ1bmN0aW9uKGxvZ2luRm9ybSkge1xyXG4gICAgICBpZihsb2dpbkZvcm0uJHZhbGlkKSB7XHJcbiAgICAgIC8vIExvZ2luU2VydmljZS5zZXRVc2VyKHt1c2VybmFtZTogXCJcIn0pO1xyXG4gICAgICBpZighYW5ndWxhci5pc0RlZmluZWQoJHNjb3BlLmxvZ2luRGF0YS51c2VybmFtZSkgfHwgIWFuZ3VsYXIuaXNEZWZpbmVkKCRzY29wZS5sb2dpbkRhdGEucGFzc3dvcmQpIHx8ICRzY29wZS5sb2dpbkRhdGEudXNlcm5hbWUudHJpbSgpID09IFwiXCIgfHwgJHNjb3BlLmxvZ2luRGF0YS5wYXNzd29yZC50cmltKCkgPT0gXCJcIil7XHJcbiAgICAgICAgJHNjb3BlLmludmFsaWRNZXNzYWdlID0gdHJ1ZTtcclxuICAgICAgfSAgXHJcbiAgICAgIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICB1c2VySWQgOiAkc2NvcGUubG9naW5EYXRhLnVzZXJuYW1lLFxyXG4gICAgICAgICAgcGFzc3dvcmQgOiAkc2NvcGUubG9naW5EYXRhLnBhc3N3b3JkXHJcbiAgICAgIH1cclxuICAgICAgLy8gU0VSVkVSX1VSTCA9ICdodHRwOi8vJyskc2NvcGUubG9naW5EYXRhLmlwYWRkcmVzcysnL3YxL2FwaSc7XHJcbiAgICAgIC8vIGNvbnNvbGUubG9nKFNFUlZFUl9VUkwpO1xyXG4gICAgICBMb2dpblNlcnZpY2UuZ2V0TG9naW5Vc2VyKHJlcWRhdGEpXHJcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgaWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcclxuICAgICAgICAgICAgICB2YXIgcmVxID0ge1xyXG4gICAgICAgICAgICAgICAgICB1c2VySWQgOiAkc2NvcGUubG9naW5EYXRhLnVzZXJuYW1lXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIExvZ2luU2VydmljZS5nZXRVc2VyUHJvZmlsZShyZXEpXHJcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKXtcclxuICAgICAgICAgICAgICAgICAgTG9naW5TZXJ2aWNlLnNldFVzZXIoe1xyXG4gICAgICAgICAgICAgICAgICAgICB1c2VybmFtZTogZGF0YS5yZXNwb25zZS5kYXRhLnVzZXJJbmZvLnVzZXJOYW1lXHJcbiAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKFwiYXBwLm1pcy1mbG93blwiKTtcclxuICAgICAgICAgICAgICAgIH0gLGZ1bmN0aW9uKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgJHNjb3BlLmludmFsaWRNZXNzYWdlPSB0cnVlO1xyXG4gICAgICAgICAgICAgICRzY29wZS5lcm9vcm1lc3NhZ2UgPSBcIlBsZWFzZSBjaGVjayB5b3VyIGNyZWRlbnRpYWxzXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgJHNjb3BlLmludmFsaWRNZXNzYWdlPSB0cnVlO1xyXG4gICAgICAgICAgICAgICRzY29wZS5lcm9vcm1lc3NhZ2UgPSBcIlBsZWFzZSBjaGVjayB5b3VyIG5ldHdvcmsgY29ubmVjdGlvblwiO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgICRzY29wZS5pbnZhbGlkTWVzc2FnZT0gdHJ1ZTtcclxuICAgICAgICAkc2NvcGUuZXJvb3JtZXNzYWdlID0gXCJQbGVhc2UgY2hlY2sgeW91ciBjcmVkZW50aWFsc1wiO1xyXG4gICAgICB9ICAgICAgXHJcbiAgICB9ICBcclxuICB9KVxyXG59KSgpOyIsIihmdW5jdGlvbigpe1xyXG5cdGFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScpLmZhY3RvcnkoJ0NoYXJ0T3B0aW9ucycsIGZ1bmN0aW9uKCkge1xyXG4gIFx0XHRyZXR1cm4ge1xyXG5cdFx0ICAgIGxpbmVDaGFydDoge1xyXG5cdFx0ICAgIFx0b3B0aW9uczogbGluZUNoYXJ0T3B0aW9uc1xyXG5cdFx0ICAgIH0sXHJcblx0XHQgICAgbWV0cmljQmFyQ2hhcnQ6IHtcclxuXHRcdCAgICBcdG9wdGlvbnM6IG1ldHJpY0JhckNoYXJ0T3B0aW9uc1xyXG5cdFx0ICAgIH0sXHJcblx0XHQgICAgdGFyZ2V0QmFyQ2hhcnQ6IHtcclxuXHRcdCAgICBcdG9wdGlvbnM6IHRhcmdldEJhckNoYXJ0T3B0aW9uc1xyXG5cdFx0ICAgIH0sXHJcblx0XHQgICAgcGFzc2VuZ2VyQ291bnRDaGFydDoge1xyXG5cdFx0ICAgIFx0b3B0aW9uczogbXVsdGlCYXJDaGFydE9wdGlvbnNcclxuXHRcdCAgICB9XHJcbiAgXHRcdH07XHJcbiAgXHRcdGZ1bmN0aW9uIGxpbmVDaGFydE9wdGlvbnMoKSB7XHJcblx0ICBcdFx0cmV0dXJuIHtcclxuXHQgICAgICAgICAgICBjaGFydDoge1xyXG5cdCAgICAgICAgICAgICAgICB0eXBlOiAnbGluZUNoYXJ0JyxcclxuXHQgICAgICAgICAgICAgICAgaGVpZ2h0OiAyNTAsXHJcblx0ICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuXHQgICAgICAgICAgICAgICAgICAgIHRvcDogNSxcclxuXHQgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiA1MCxcclxuXHQgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogNTAsXHJcblx0ICAgICAgICAgICAgICAgICAgICBsZWZ0OiA1MFxyXG5cdCAgICAgICAgICAgICAgICB9LFxyXG5cdCAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXsgcmV0dXJuIGQueHZhbDsgfSxcclxuXHQgICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7IHJldHVybiBkLnl2YWw7IH0sXHJcblx0ICAgICAgICAgICAgICAgIHVzZUludGVyYWN0aXZlR3VpZGVsaW5lOiB0cnVlLFxyXG5cdCAgICAgICAgICAgICAgICBkaXNwYXRjaDoge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgc3RhdGVDaGFuZ2U6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcInN0YXRlQ2hhbmdlXCIpOyB9LFxyXG5cdCAgICAgICAgICAgICAgICAgICAgY2hhbmdlU3RhdGU6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcImNoYW5nZVN0YXRlXCIpOyB9LFxyXG5cdCAgICAgICAgICAgICAgICAgICAgdG9vbHRpcFNob3c6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcInRvb2x0aXBTaG93XCIpOyB9LFxyXG5cdCAgICAgICAgICAgICAgICAgICAgdG9vbHRpcEhpZGU6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcInRvb2x0aXBIaWRlXCIpOyB9XHJcblx0ICAgICAgICAgICAgICAgIH0sXHJcblx0ICAgICAgICAgICAgICAgIHhBeGlzOiB7XHJcblx0ICAgICAgICAgICAgICAgICAgICB0aWNrRm9ybWF0OiBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFx0cmV0dXJuIGQzLnRpbWUuZm9ybWF0KCclYicpKG5ldyBEYXRlKGQpKVxyXG4gICAgICAgICAgICAgICAgICAgIFx0fVxyXG5cdCAgICAgICAgICAgICAgICB9LFxyXG5cdCAgICAgICAgICAgICAgICB5QXhpczoge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsOiAnJyxcclxuXHQgICAgICAgICAgICAgICAgICAgIHRpY2tGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xyXG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJy4wMmYnKShkKTtcclxuXHQgICAgICAgICAgICAgICAgICAgIH0sXHJcblx0ICAgICAgICAgICAgICAgICAgICBheGlzTGFiZWxEaXN0YW5jZTogLTEwXHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHRcdCAgICAgICAgfVxyXG5cdCAgICAgICAgfTsgIFxyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gbXVsdGlCYXJDaGFydE9wdGlvbnMoKSB7XHJcblx0ICBcdFx0cmV0dXJuIHtcclxuXHQgICAgICAgICAgICBjaGFydDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtdWx0aUJhckNoYXJ0JyxcclxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogMzAwLFxyXG4gICAgICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9wOiAxMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDI1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBib3R0b206IDMwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiAyNVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc2hvd0xlZ2VuZCA6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpe3JldHVybiBkLmxhYmVsO30sXHJcbiAgICAgICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWUgKyAoMWUtMTApO30sXHJcbiAgICAgICAgICAgICAgICAgICAgc2hvd1ZhbHVlczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICByZWR1Y2VYVGlja3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHNob3dDb250cm9sczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVGb3JtYXQ6IGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLC40ZicpKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeEF4aXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgIGF4aXNMYWJlbERpc3RhbmNlOiAzMFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBzaG93WEF4aXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDcwMFxyXG4gICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgfTsgIFxyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gbWV0cmljQmFyQ2hhcnRPcHRpb25zKCkge1xyXG5cdCAgXHRcdHJldHVybiB7XHJcblx0ICAgICAgICAgICAgY2hhcnQ6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY3JldGVCYXJDaGFydCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAyMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgbWFyZ2luIDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3A6IDIwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodDogMjUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogMjVcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpe3JldHVybiBkLmxhYmVsO30sXHJcbiAgICAgICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWV9LFxyXG4gICAgICAgICAgICAgICAgICAgIHVzZUludGVyYWN0aXZlR3VpZGVsaW5lOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHNob3dWYWx1ZXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuZm9ybWF0KCcsLjJmJykoZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB0b29sdGlwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHNob3dZQXhpczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgc2hvd1hBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNzAwXHJcbiAgICAgICAgICAgICAgICB9XHJcblx0ICAgICAgICB9OyAgXHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiB0YXJnZXRCYXJDaGFydE9wdGlvbnMoKSB7XHJcblx0ICBcdFx0cmV0dXJuIHtcclxuICAgICAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY3JldGVCYXJDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IDIwLFxyXG4gICAgICAgICAgICAgICAgICByaWdodDogNTAsXHJcbiAgICAgICAgICAgICAgICAgIGJvdHRvbTogMjAsXHJcbiAgICAgICAgICAgICAgICAgIGxlZnQ6IDc1XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXtyZXR1cm4gZC5sYWJlbDt9LFxyXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWUgKyAoMWUtMTApO30sXHJcbiAgICAgICAgICAgICAgICBzaG93VmFsdWVzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlRm9ybWF0OiBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuZm9ybWF0KCcsLjJmJykoZCk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDcwMFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTsgIFxyXG5cdFx0fVxyXG4gIH0pO1xyXG59KSgpOyIsIihmdW5jdGlvbiAoKXtcclxuICAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJykuZmFjdG9yeSgnRGF0YVByb3ZpZGVyU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgJHEsICRyb290U2NvcGUsIE5ldFNlcnZpY2UpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgbmV0U2VydmljZTogTmV0U2VydmljZSxcclxuICAgICAgICAgJHE6ICRxLFxyXG4gICAgICAgICAkcm9vdFNjb3BlOiAkcm9vdFNjb3BlLFxyXG4gICAgICAgICBpc0Nvbm5lY3RlZFRvTmV0d29yazogdHJ1ZSxcclxuXHJcbiAgICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKHJlcSkge1xyXG4gICAgICAgICAgICB2YXIgZGVmID0gdGhpcy4kcS5kZWZlcigpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5oYXNOZXR3b3JrQ29ubmVjdGlvbigpKSB7XHJcbiAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKHRoaXMubmV0U2VydmljZS5nZXREYXRhKHJlcSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICB0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnbm9OZXR3b3JrJyk7XHJcbiAgICAgICAgICAgICAgIGRlZi5yZWplY3QoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZGVmLnByb21pc2U7XHJcbiAgICAgICAgIH0sXHJcbiAgICAgICAgIHBvc3REYXRhOiBmdW5jdGlvbiAocmVxLCBkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBkZWYgPSB0aGlzLiRxLmRlZmVyKCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcclxuICAgICAgICAgICAgICAgZGVmLnJlc29sdmUodGhpcy5uZXRTZXJ2aWNlLnBvc3REYXRhKHJlcSwgZGF0YSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XHJcbiAgICAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdub05ldHdvcmsnKTtcclxuICAgICAgICAgICAgICAgZGVmLnJlamVjdCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBkZWYucHJvbWlzZTtcclxuICAgICAgICAgfSxcclxuICAgICAgICAgZGVsZXRlRGF0YTogZnVuY3Rpb24gKHJlcSkge1xyXG4gICAgICAgICAgICB2YXIgZGVmID0gdGhpcy4kcS5kZWZlcigpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5oYXNOZXR3b3JrQ29ubmVjdGlvbigpKSB7XHJcbiAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKHRoaXMubmV0U2VydmljZS5kZWxldGVEYXRhKHJlcSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XHJcbiAgICAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdub05ldHdvcmsnKTtcclxuICAgICAgICAgICAgICAgZGVmLnJlamVjdCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBkZWYucHJvbWlzZTtcclxuICAgICAgICAgfSxcclxuICAgICAgICAgaGFzTmV0d29ya0Nvbm5lY3Rpb246IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIChuYXZpZ2F0b3Iub25MaW5lIHx8IHRoaXMuaXNDb25uZWN0ZWRUb05ldHdvcmspO1xyXG4gICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgIH0pO1xyXG59KSgpOyIsIihmdW5jdGlvbigpe1xyXG4gICAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJykuZmFjdG9yeSgnTmV0U2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgJHEsICRyb290U2NvcGUpIHtcclxuICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24gKGZyb21VcmwpIHtcclxuICAgICAgICAgICAgdmFyIHVybCA9IFNFUlZFUl9VUkwgKyBmcm9tVXJsO1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KHVybCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBwb3N0RGF0YTogZnVuY3Rpb24gKHRvVXJsLCBkYXRhKSB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuYWRkTWV0YUluZm8oZGF0YSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdChTRVJWRVJfVVJMICsgdG9VcmwsIHRoaXMuYWRkTWV0YUluZm8oZGF0YSkpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZGVsZXRlRGF0YTogZnVuY3Rpb24gKHRvVXJsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoU0VSVkVSX1VSTCArIHRvVXJsKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGFkZE1ldGFJbmZvOiBmdW5jdGlvbiAocmVxdWVzdERhdGEpIHtcclxuICAgICAgICAgICAgdmFyIG1ldGFJbmZvID0ge1xyXG4gICAgICAgICAgICAgICAgJ2NoYW5uZWxJZGVudGlmaWVyJzogJ01PQicsXHJcbiAgICAgICAgICAgICAgICAnZGF0ZVRpbWVTdGFtcCc6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG4gICAgICAgICAgICAgICAgJ293bmVyQ2FycmllckNvZGUnOiAnWFgnLFxyXG4gICAgICAgICAgICAgICAgJ2FkZGl0aW9uYWxJbmZvJzoge1xyXG4gICAgICAgICAgICAgICAgICAgICdkZXZpY2VUeXBlJzogJ1Bob25lJyxcclxuICAgICAgICAgICAgICAgICAgICAnbW9kZWwnOiAnZGV2aWNlIEluZm8nLFxyXG4gICAgICAgICAgICAgICAgICAgICdvc1R5cGUnOiAnaW9zJyxcclxuICAgICAgICAgICAgICAgICAgICAnb3NWZXJzaW9uJzogJzguNCcsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJkZXZpY2VUb2tlblwiOiBcInN0cmluZ1wiXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB2YXIgcmVxdWVzdE9iaiA9IHtcclxuICAgICAgICAgICAgICAgICdtZXRhSW5mbyc6IG1ldGFJbmZvLFxyXG4gICAgICAgICAgICAgICAgJ3JlcXVlc3REYXRhJzogcmVxdWVzdERhdGFcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RPYmo7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgIH07XHJcbiAgICB9KTtcclxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKS5jb250cm9sbGVyKCdPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlcicsIFsnJHNjb3BlJywgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDaGFydE9wdGlvbnMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckaW9uaWNMb2FkaW5nJywgJyR0aW1lb3V0JywgJyR3aW5kb3cnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRpb25pY1BvcG92ZXInLCAnRmlsdGVyZWRMaXN0U2VydmljZScsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRmaWx0ZXInLCAnTG9naW5TZXJ2aWNlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlcl0pO1xyXG4gXHJcbiAgZnVuY3Rpb24gT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIoJHNjb3BlLCBDaGFydE9wdGlvbnMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICRpb25pY0xvYWRpbmcsICR0aW1lb3V0LCAkd2luZG93LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAkaW9uaWNQb3BvdmVyLCBGaWx0ZXJlZExpc3RTZXJ2aWNlLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgJGZpbHRlciwgTG9naW5TZXJ2aWNlKSB7XHJcbiAgICAgIH07XHJcbn0pKCk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
