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

/// <reference path="../../../_libs.ts" />
/// <reference path="../../../common/services/DataProviderService.ts" />
var MisService = (function () {
    function MisService(dataProviderService, $q) {
        this.dataProviderService = dataProviderService;
        this.$q = $q;
    }
    MisService.prototype.getMetricSnapshot = function (reqdata) {
        var requestUrl = '/paxflnmis/metricsnapshot';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            var result = response.data;
            def.resolve(result);
        }, function (error) {
            console.log('an error occured');
        });
        return def.promise;
    };
    MisService.prototype.getTargetVsActual = function (reqdata) {
        var requestUrl = '/paxflnmis/targetvsactual';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            var result = response.data;
            def.resolve(result);
        }, function (error) {
            console.log('an error occured');
        });
        return def.promise;
    };
    MisService.prototype.getRevenueAnalysis = function (reqdata) {
        var requestUrl = '/paxflnmis/revenueanalysis';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            var result = response.data;
            def.resolve(result);
        }, function (error) {
            console.log('an error occured');
        });
        return def.promise;
    };
    MisService.prototype.getRouteRevenue = function (reqdata) {
        var requestUrl = '/paxflnmis/routerevenue';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            var result = response.data;
            def.resolve(result);
        }, function (error) {
            console.log('an error occured');
        });
        return def.promise;
    };
    MisService.prototype.getSectorCarrierAnalysis = function (reqdata) {
        var requestUrl = '/paxflnmis/sectorcarrieranalysis';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            var result = response.data;
            def.resolve(result);
        }, function (error) {
            console.log('an error occured');
        });
        return def.promise;
    };
    MisService.prototype.getPaxFlownMisHeader = function (reqdata) {
        var requestUrl = '/paxflnmis/paxflownmisheader';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            var result = response.data;
            def.resolve(result);
        }, function (error) {
            console.log('an error occured');
        });
        return def.promise;
    };
    MisService.prototype.getRouteRevenueDrillDown = function (reqdata) {
        var requestUrl = '/paxflnmis/routerevenuedrill';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            var result = response.data;
            def.resolve(result);
        }, function (error) {
            console.log('an error occured');
        });
        return def.promise;
    };
    MisService.prototype.getBarDrillDown = function (reqdata) {
        var requestUrl = '/paxflnmis/mspaxnetrevdrill';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            var result = response.data;
            def.resolve(result);
        }, function (error) {
            console.log('an error occured');
        });
        return def.promise;
    };
    MisService.$inject = ['DataProviderService', '$q'];
    return MisService;
})();

/// <reference path="../../../_libs.ts" />
var ChartoptionService = (function () {
    function ChartoptionService($rootScope) {
    }
    ChartoptionService.prototype.lineChartOptions = function () {
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
    };
    ChartoptionService.prototype.multiBarChartOptions = function () {
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
    };
    ChartoptionService.prototype.metricBarChartOptions = function (misCtrl) {
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
                discretebar: {
                    dispatch: {
                        elementDblClick: function (e) {
                            misCtrl.openBarDrillDownPopover(d3.event, e, -1);
                        }
                    }
                },
                tooltip: {
                    enabled: true
                },
                showYAxis: false,
                showXAxis: false,
                duration: 700
            }
        };
    };
    ChartoptionService.prototype.targetBarChartOptions = function () {
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
    };
    ChartoptionService.$inject = ['$rootScope'];
    return ChartoptionService;
})();

/// <reference path="../../../_libs.ts" />
var FilteredListService = (function () {
    function FilteredListService() {
    }
    FilteredListService.prototype.searched = function (valLists, toSearch, level) {
        return _.filter(valLists, function (i) {
            /* Search Text in all 3 fields */
            return searchUtil(i, toSearch, level);
        });
    };
    FilteredListService.prototype.paged = function (valLists, pageSize) {
        var retVal = [];
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
    };
    FilteredListService.$inject = [];
    return FilteredListService;
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

/// <reference path="../../../_libs.ts" />
/// <reference path="../../../common/services/DataProviderService.ts" />
var OperationalService = (function () {
    function OperationalService(dataProviderService, $q) {
        this.dataProviderService = dataProviderService;
        this.$q = $q;
    }
    OperationalService.prototype.getPaxFlownOprHeader = function (reqdata) {
        var requestUrl = '/paxflnopr/paxflownoprheader';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            var result = response.data;
            def.resolve(result);
        }, function (error) {
            console.log('an error occured');
        });
        return def.promise;
    };
    OperationalService.prototype.getOprFlightProcStatus = function (reqdata) {
        var requestUrl = '/paxflnopr/flightprocessingstatus';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            var result = response.data;
            def.resolve(result);
        }, function (error) {
            console.log('an error occured');
        });
        return def.promise;
    };
    OperationalService.prototype.getOprFlightCountByReason = function (reqdata) {
        var requestUrl = '/paxflnopr/flightcountbyreason';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            var result = response.data;
            def.resolve(result);
        }, function (error) {
            console.log('an error occured');
        });
        return def.promise;
    };
    OperationalService.prototype.getOprCouponCountByException = function (reqdata) {
        var requestUrl = '/paxflnopr/couponcountbyexception';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            var result = response.data;
            def.resolve(result);
        }, function (error) {
            console.log('an error occured');
        });
        return def.promise;
    };
    OperationalService.$inject = ['DataProviderService', '$q'];
    return OperationalService;
})();

/// <reference path="../../../_libs.ts" />
/// <reference path="../../../common/services/DataProviderService.ts" />
/// <reference path="../../../common/services/LocalStorageService.ts" />
var UserService = (function () {
    function UserService(dataProviderService, $q, localStorageService, $window) {
        this.dataProviderService = dataProviderService;
        this.$q = $q;
        this.localStorageService = localStorageService;
        this.$window = $window;
    }
    UserService.prototype.setUser = function (user) {
        if (this.$window.localStorage) {
            this.$window.localStorage.setItem('rapidMobile.user', JSON.stringify(user));
        }
    };
    UserService.prototype.logout = function () {
        this.localStorageService.setObject('rapidMobile.user', null);
        this._user = null;
    };
    UserService.prototype.isLoggedIn = function () {
        return this._user ? true : false;
    };
    UserService.prototype.getUser = function () {
        return this._user;
    };
    UserService.prototype.login = function (_userName, _password) {
        var _this = this;
        var requestUrl = '/user/login';
        var def = this.$q.defer();
        var requestObj = {
            userId: _userName,
            password: _password
        };
        this.setUser({ username: "" });
        this.dataProviderService.postData(requestUrl, requestObj).then(function (response) {
            var data = response.data;
            if (data.response.status == "success") {
                var req = {
                    userId: _userName
                };
                _this.getUserProfile(req).then(function (profile) {
                    var userName = {
                        username: profile.response.data.userInfo.userName
                    };
                    _this.setUser(userName);
                }, function (error) {
                    console.log('an error occured on loading user profile');
                    def.reject(error);
                });
            }
            def.resolve(data);
        }, function (error) {
            console.log('an error occured on log in');
            def.reject(error);
        });
        return def.promise;
    };
    UserService.prototype.getUserProfile = function (reqdata) {
        var requestUrl = '/user/userprofile';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            if (typeof response.data === 'object') {
                def.resolve(response.data);
            }
            else {
                def.reject(response.data);
            }
        }, function (error) {
            console.log('an error occured on UserProfile');
            def.reject(error);
        });
        return def.promise;
    };
    UserService.$inject = ['DataProviderService', '$q', '$window', 'LocalStorageService'];
    return UserService;
})();

/// <reference path="../../_libs.ts" />
/// <reference path="../../components/mis/services/MisService.ts" />
/// <reference path="../../components/mis/services/FilteredListService.ts" />
/// <reference path="../../components/mis/services/ChartoptionService.ts" />
var MisController = (function () {
    function MisController($scope, $ionicLoading, $timeout, $window, $ionicPopover, $filter, misService, chartoptionService, filteredListService, reportSvc) {
        var _this = this;
        this.$scope = $scope;
        this.$ionicLoading = $ionicLoading;
        this.$timeout = $timeout;
        this.$window = $window;
        this.$ionicPopover = $ionicPopover;
        this.$filter = $filter;
        this.misService = misService;
        this.chartoptionService = chartoptionService;
        this.filteredListService = filteredListService;
        this.reportSvc = reportSvc;
        this.pageSize = 4;
        this.currentPage = [];
        this.selectedDrill = [];
        this.groups = [];
        this.orientationChange = function () {
            _this.onSlideMove({ index: _this.header.tabIndex });
        };
        this.that = this;
        this.tabs = [
            { title: 'My Dashboard', names: 'MyDashboard', icon: 'iconon-home' },
            { title: 'Metric Snapshot', names: 'MetricSnapshot', icon: 'ion-home' },
            { title: 'Target Vs Actual', names: 'TargetVsActual', icon: 'ion-home' },
            { title: 'Revenue Analysis', names: 'RevenueAnalysis', icon: 'ion-home' },
            { title: 'Sector & Carrier Analysis', names: 'SectorAndCarrierAnalysis', icon: 'ion-home' },
            { title: 'Route Revenue', names: 'RouteRevenue', icon: 'ion-home' }
        ];
        this.toggle = {
            monthOrYear: 'month',
            targetRevOrPax: 'revenue',
            sectorOrder: 'top5',
            sectorRevOrPax: 'revenue',
            chartOrTable: 'chart'
        };
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
        this.$scope.$on('onSlideMove', function (event, response) {
            _this.$scope.MisCtrl.onSlideMove(response);
        });
        //this.$scope.$watch('MisCtrl.header.surcharge', () => { this.onSlideMove({index:this.header.tabIndex}); }, true);
        this.initData();
    }
    MisController.prototype.initData = function () {
        var that = this;
        this.$ionicPopover.fromTemplateUrl('components/mis/infotooltip.html', {
            scope: that.$scope
        }).then(function (infopopover) {
            that.infopopover = infopopover;
        });
        this.$ionicPopover.fromTemplateUrl('components/mis/drildown.html', {
            scope: that.$scope
        }).then(function (drillpopover) {
            that.drillpopover = drillpopover;
        });
        this.$ionicPopover.fromTemplateUrl('components/mis/bardrildown.html', {
            scope: that.$scope
        }).then(function (drillBarpopover) {
            that.drillBarpopover = drillBarpopover;
        });
        this.options = {
            metric: this.chartoptionService.metricBarChartOptions(this),
            targetLineChart: this.chartoptionService.lineChartOptions(),
            targetBarChart: this.chartoptionService.targetBarChartOptions(),
            passengerChart: this.chartoptionService.multiBarChartOptions()
        };
        this.misService.getPaxFlownMisHeader({ userId: 'Victor' }).then(function (data) {
            that.subHeader = data.response.data;
            that.header.flownMonth = that.subHeader.paxFlownMisMonths[0].flowMonth;
        }, function (error) {
            console.log('an error occured');
        });
        this.onSlideMove({ index: 0 });
    };
    MisController.prototype.openinfoPopover = function ($event, index) {
        if (typeof index == "undefined" || index == "") {
            this.infodata = 'No info available';
        }
        else {
            this.infodata = index;
        }
        console.log(index);
        this.infopopover.show($event);
    };
    ;
    MisController.prototype.closePopover = function () {
        this.graphpopover.hide();
    };
    ;
    MisController.prototype.closesBarPopover = function () {
        this.drillBarpopover.hide();
    };
    MisController.prototype.closeInfoPopover = function () {
        this.infopopover.hide();
    };
    MisController.prototype.updateHeader = function () {
        var flownMonth = this.header.flownMonth;
        this.header.headerIndex = _.findIndex(this.subHeader.paxFlownMisMonths, function (chr) {
            return chr.flowMonth == flownMonth;
        });
        console.log(this.header.headerIndex);
        this.onSlideMove({ index: this.header.headerIndex });
    };
    MisController.prototype.onSlideMove = function (data) {
        console.log('hello');
        this.header.tabIndex = data.index;
        switch (this.header.tabIndex) {
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
    ;
    MisController.prototype.toggleMetric = function (val) {
        this.toggle.monthOrYear = val;
        this.onSlideMove({ index: this.header.tabIndex });
    };
    MisController.prototype.toggleSurcharge = function () {
        this.onSlideMove({ index: this.header.tabIndex });
    };
    MisController.prototype.toggleTarget = function (val) {
        this.toggle.targetRevOrPax = val;
    };
    MisController.prototype.toggleSector = function (val) {
        this.toggle.sectorRevOrPax = val;
    };
    MisController.prototype.callMetricSnapshot = function () {
        var that = this;
        var reqdata = {
            flownMonth: this.header.flownMonth,
            includeSurcharge: (this.header.surcharge) ? 'Y' : 'N',
            userId: this.header.username,
            toggle1: this.toggle.monthOrYear,
            fullDataFlag: 'N'
        };
        this.ionicLoadingShow();
        this.misService.getMetricSnapshot(reqdata)
            .then(function (data) {
            // fav Items to display in dashboard
            that.metricResult = _.sortBy(data.response.data.metricSnapshotCharts, function (u) {
                if (u)
                    return [u.favoriteChartPosition];
            });
            _.forEach(that.metricResult, function (n, value) {
                n.values[0].color = '#4A90E2';
                n.values[1].color = '#50E3C2';
                if (n.values[2])
                    n.values[2].color = '#B8E986';
            });
            that.favMetricResult = _.filter(that.metricResult, function (u) {
                if (u)
                    return u.favoriteInd == 'Y';
            });
            that.metricLegends = data.response.data.legends;
            if (that.header.tabIndex == 0) {
                that.metricResult = that.favMetricResult;
            }
            that.ionicLoadingHide();
        }, function (error) {
        });
    };
    MisController.prototype.callTargetVsActual = function () {
        var that = this;
        var reqdata = {
            flownMonth: this.header.flownMonth,
            includeSurcharge: (this.header.surcharge) ? 'Y' : 'N',
            userId: this.header.username,
            toggle1: '',
            fullDataFlag: ''
        };
        this.ionicLoadingShow();
        this.misService.getTargetVsActual(reqdata)
            .then(function (data) {
            // fav Items to display in dashboard
            that.favTargetLineResult = _.filter(data.response.data.lineCharts, function (u) {
                if (u)
                    return u.favoriteInd == 'Y';
            });
            that.favTargetBarResult = _.filter(data.response.data.verBarCharts, function (u) {
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
            that.targetActualData = {
                horBarChart: data.response.data.verBarCharts,
                lineChart: data.response.data.lineCharts
            };
            that.ionicLoadingHide();
        }, function (error) {
            console.log('Error ');
            that.ionicLoadingHide();
        });
    };
    MisController.prototype.callRouteRevenue = function () {
        var that = this;
        var routeRevRequest = {
            flownMonth: this.header.flownMonth,
            includeSurcharge: (this.header.surcharge) ? 'Y' : 'N',
            userId: this.header.username
        };
        this.misService.getRouteRevenue(routeRevRequest)
            .then(function (data) {
            that.routeRevData = data.response.data;
        }, function (error) {
            console.log('Error ');
        });
    };
    MisController.prototype.callRevenueAnalysis = function () {
        var that = this;
        var reqdata = {
            flownMonth: this.header.flownMonth,
            includeSurcharge: (this.header.surcharge) ? 'Y' : 'N',
            userId: this.header.username,
            toggle1: '',
            fullDataFlag: ''
        };
        this.ionicLoadingShow();
        this.misService.getRevenueAnalysis(reqdata)
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
            var barColors = ['#4A90E2', '#50E3C2'];
            _.merge(jsonObj.multibarCharts[1], barColors);
            _.forEach(jsonObj.multibarCharts, function (n, value) {
                n.color = barColors[value];
            });
            var pieColors = [{ "color": "#28b6f6" }, { "color": "#7bd4fc" }, { "color": "#C6E5FA" }];
            _.forEach(jsonObj.pieCharts[0].data, function (n, value) {
                n.label = n.xval;
                n.value = n.yval;
            });
            _.merge(jsonObj.pieCharts[0].data, pieColors);
            that.revenueData = {
                revenuePieChart: jsonObj.pieCharts[0],
                revenueBarChart: jsonObj.multibarCharts[1].multibarChartItems,
                revenueHorBarChart: jsonObj.multibarCharts[2].multibarChartItems
            };
            that.ionicLoadingHide();
        }, function (error) {
            this.ionicLoadingHide();
            console.log('Error ');
        });
    };
    MisController.prototype.openDrillDown = function (regionData, selFindLevel) {
        var that = this;
        this.selectedDrill[selFindLevel] = regionData;
        this.selectedDrill[selFindLevel + 1] = '';
        if (selFindLevel != '3') {
            var drillLevel = (selFindLevel + 2);
            this.regionName = (regionData.regionName) ? regionData.regionName : regionData.cahrtName;
            var countryFromTo = (regionData.countryFrom && regionData.countryTo) ? regionData.countryFrom + '-' + regionData.countryTo : "";
            var sectorFromTo = (regionData.flownSector && drillLevel >= 3) ? regionData.flownSector : "";
            var flightNumber = (regionData.flightNumber && drillLevel == 4) ? regionData.flightNumber : "";
            this.ionicLoadingShow();
            var reqdata = {
                "flownMonth": this.header.flownMonth,
                "includeSurcharge": (this.header.surcharge) ? 'Y' : 'N',
                "userId": this.header.username,
                "fullDataFlag": "",
                "drillLevel": drillLevel,
                "pageNumber": 0,
                "regionName": (this.regionName) ? this.regionName : "North America",
                "countryFromTo": countryFromTo,
                "sectorFromTo": sectorFromTo,
                "flightNumber": flightNumber,
                "flightDate": 0
            };
            this.misService.getRouteRevenueDrillDown(reqdata)
                .then(function (data) {
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
                }
                else {
                    that.shownGroup = findLevel;
                    that.clearDrill(findLevel);
                }
            }, function (error) {
                that.ionicLoadingHide();
                that.closesPopover();
                console.log(error);
                alert('Server Error');
            });
        }
    };
    MisController.prototype.clearDrill = function (level) {
        var i;
        for (var i = level; i <= 3; i++) {
            this.groups[i].items.splice(0, 1);
            this.groups[i].orgItems.splice(0, 1);
            this.sort('paxCount', i, false);
        }
    };
    MisController.prototype.openBarDrillDown = function (data, selFindLevel) {
        selFindLevel = Number(selFindLevel);
        var that = this;
        this.selectedDrill[selFindLevel] = data;
        this.selectedDrill[selFindLevel + 1] = '';
        if (selFindLevel != '3') {
            var drillLevel = (selFindLevel + 2);
            if (data.label) {
                this.drillBarLabel = data.label;
            }
            var drillBar;
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
                .then(function (data) {
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
                }
                else {
                    that.shownGroup = findLevel;
                    that.clearDrill(findLevel);
                }
            }, function (error) {
                that.ionicLoadingHide();
                that.closesPopover();
                console.log(error);
                alert('Server Error');
            });
        }
    };
    MisController.prototype.initiateArray = function (drilltabs) {
        for (var i in drilltabs) {
            this.groups[i] = {
                id: i,
                name: this.drilltabs[i],
                items: [],
                orgItems: [],
                ItemsByPage: []
            };
        }
    };
    MisController.prototype.openBarDrillDownPopover = function ($event, selData, selFindLevel) {
        this.drillType = 'bar';
        this.drillBarpopover.show($event);
        this.drilltabs = ['Route Level', 'Sector Level', 'Data Level', 'Flight Level'];
        this.initiateArray(this.drilltabs);
        this.openBarDrillDown(selData.point, selFindLevel);
    };
    ;
    MisController.prototype.openPopover = function ($event, index, charttype) {
        var that = this;
        $event.preventDefault();
        this.charttype = charttype;
        this.graphindex = index;
        this.$ionicPopover.fromTemplateUrl('components/mis/graph-popover.html', {
            scope: that.$scope
        }).then(function (popover) {
            that.popovershown = true;
            that.graphpopover = popover;
            that.graphpopover.show($event);
        });
    };
    MisController.prototype.openSectorPopover = function ($event, index, charttype) {
        var that = this;
        this.charttype = charttype;
        this.graphindex = index;
        this.$ionicPopover.fromTemplateUrl('components/mis/sector-graph-popover.html', {
            scope: that.$scope
        }).then(function (popover) {
            that.popovershown = true;
            that.graphpopover = popover;
            that.graphpopover.show($event);
        });
    };
    MisController.prototype.callSectorCarrierAnalysis = function () {
        var that = this;
        var reqdata = {
            flownMonth: this.header.flownMonth,
            includeSurcharge: (this.header.surcharge) ? 'Y' : 'N',
            userId: this.header.username,
            toggle1: '',
            toggle2: '',
            fullDataFlag: 'N'
        };
        this.ionicLoadingShow();
        this.misService.getSectorCarrierAnalysis(reqdata)
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
            that.SectorCarrierAnalysisCharts = jsonObj.SectorCarrierAnalysisCharts;
            that.ionicLoadingHide();
        }, function (error) {
            that.ionicLoadingHide();
            console.log('Error ');
        });
    };
    MisController.prototype.targetActualFilter = function (that) {
        return function (item) {
            return item.toggle1 == that.toggle.targetRevOrPax;
        };
    };
    MisController.prototype.sectorCarrierFilter = function (that) {
        that = this.that;
        return function (item) {
            return item.toggle1 == that.toggle.sectorOrder && item.toggle2 == that.toggle.sectorRevOrPax;
        };
    };
    MisController.prototype.revenueAnalysisFilter = function (item) {
        var surchargeFlag = (this.header.surcharge) ? "Y" : "N";
        // console.log(surchargeFlag+' : '+item);
        if (item.surchargeFlag == surchargeFlag) {
            return true;
        }
        return false;
    };
    MisController.prototype.getFlownFavorites = function () {
        this.callMetricSnapshot();
        this.callTargetVsActual();
        this.callRevenueAnalysis();
    };
    MisController.prototype.ionicLoadingShow = function () {
        this.$ionicLoading.show({
            template: '<ion-spinner class="spinner-calm"></ion-spinner>'
        });
    };
    ;
    MisController.prototype.ionicLoadingHide = function () {
        this.$ionicLoading.hide();
    };
    ;
    MisController.prototype.openDrillDownPopover = function ($event, regionData, selFindLevel) {
        this.drillType = 'route';
        this.drillpopover.show($event);
        this.drilltabs = ['Country Level', 'Sector Level', 'Flight Level', 'Document Level'];
        this.initiateArray(this.drilltabs);
        this.openDrillDown(regionData, selFindLevel);
    };
    ;
    MisController.prototype.closesPopover = function () {
        this.drillpopover.hide();
    };
    ;
    MisController.prototype.isDrillRowSelected = function (level, obj) {
        return this.selectedDrill[level] == obj;
    };
    MisController.prototype.searchResults = function (level, obj) {
        this.groups[level].items[0] = this.filteredListService.searched(this.groups[level].orgItems[0], obj.searchText, level);
        if (obj.searchText == '') {
            this.resetAll(level);
            this.groups[level].items[0] = this.groups[level].orgItems[0];
        }
        this.currentPage[level] = 0;
        this.pagination(level);
    };
    MisController.prototype.pagination = function (level) {
        this.groups[level].ItemsByPage = this.filteredListService.paged(this.groups[level].items[0], this.pageSize);
    };
    ;
    MisController.prototype.setPage = function (level) {
        this.currentPage[level] = this.n;
    };
    ;
    MisController.prototype.lastPage = function (level) {
        this.currentPage[level] = this.groups[level].ItemsByPage.length - 1;
    };
    ;
    MisController.prototype.resetAll = function (level) {
        this.currentPage[level] = 0;
    };
    MisController.prototype.sort = function (sortBy, level, order) {
        this.resetAll(level);
        this.columnToOrder = sortBy;
        //$Filter - Standard Service
        this.groups[level].items[0] = this.$filter('orderBy')(this.groups[level].items[0], this.columnToOrder, order);
        this.pagination(level);
    };
    ;
    MisController.prototype.range = function (input, total) {
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
    MisController.prototype.toggleGroup = function (group) {
        if (this.isGroupShown(group)) {
            this.shownGroup = null;
        }
        else {
            this.shownGroup = group;
        }
    };
    MisController.prototype.isGroupShown = function (group) {
        return this.shownGroup == group;
    };
    MisController.prototype.toggleChartOrTableView = function (val) {
        this.toggle.chartOrTable = 'chart';
    };
    MisController.prototype.runReport = function (chartTitle, monthOrYear, flownMonth) {
        //if no cordova, then running in browser and need to use dataURL and iframe
        if (!window.cordova) {
            this.reportSvc.runReportDataURL(chartTitle, monthOrYear, flownMonth)
                .then(function (dataURL) {
                //set the iframe source to the dataURL created
                //console.log(dataURL);
                //document.getElementById('pdfImage').src = dataURL;
            });
            return true;
        }
        else {
            this.reportSvc.runReportAsync(chartTitle, monthOrYear, flownMonth)
                .then(function (filePath) {
                //log the file location for debugging and oopen with inappbrowser
                console.log('report run on device using File plugin');
                console.log('ReportCtrl: Opening PDF File (' + filePath + ')');
                var fileName = "/mnt/sdcard/" + chartTitle + ".pdf";
                if (device.platform == "Android")
                    window.openPDF(fileName);
                else
                    window.open(filePath, '_blank', 'location=no,closebuttoncaption=Close,enableViewportScale=yes');
            });
            return true;
        }
    };
    MisController.$inject = ['$scope', '$ionicLoading', '$timeout', '$window', '$ionicPopover', '$filter', 'MisService', 'ChartoptionService', 'FilteredListService', 'ReportSvc'];
    return MisController;
})();

/// <reference path="../../../_libs.ts" />
/// <reference path="../services/OperationalService.ts" />
var OperationalFlownController = (function () {
    function OperationalFlownController($scope, $ionicLoading, $ionicPopover, $filter, operationalService, $ionicSlideBoxDelegate, $timeout, reportSvc) {
        this.$scope = $scope;
        this.$ionicLoading = $ionicLoading;
        this.$ionicPopover = $ionicPopover;
        this.$filter = $filter;
        this.operationalService = operationalService;
        this.$ionicSlideBoxDelegate = $ionicSlideBoxDelegate;
        this.$timeout = $timeout;
        this.reportSvc = reportSvc;
        this.carouselIndex = 0;
        this.threeBarChartColors = ['#4EB2F9', '#FFC300', '#5C6BC0'];
        this.fourBarChartColors = ['#7ED321', '#4EB2F9', '#FFC300', '#5C6BC0'];
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
    OperationalFlownController.prototype.initData = function () {
        var that = this;
        this.$ionicPopover.fromTemplateUrl('components/operational/flown/infotooltip.html', {
            scope: that.$scope
        }).then(function (infopopover) {
            that.infopopover = infopopover;
        });
        this.operationalService.getPaxFlownOprHeader({ userId: 'Victor' }).then(function (data) {
            that.subHeader = data.response.data;
            // console.log(that.subHeader.paxFlownOprMonths);
            that.header.flownMonth = that.subHeader.defaultMonth;
            // console.log(that.header.flownMonth);
        }, function (error) {
            console.log('an error occured');
        });
        this.onSlideMove({ index: 0 });
    };
    OperationalFlownController.prototype.onSlideMove = function (data) {
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
    ;
    OperationalFlownController.prototype.callMyDashboard = function () {
        this.callFlightProcStatus();
        this.callFlightCountByReason();
        this.callCouponCountByException();
    };
    OperationalFlownController.prototype.callFlightProcStatus = function () {
        var that = this;
        var reqdata = {
            flownMonth: 'Jul-2015',
            userId: '',
            toggle1: '',
            fullDataFlag: 'N'
        };
        this.ionicLoadingShow();
        this.operationalService.getOprFlightProcStatus(reqdata)
            .then(function (data) {
            var otherChartColors = [{ "color": "#7ED321" }, { "color": "#4EB2F9" },
                { "color": "#FFC300" }, { "color": "#5C6BC0" }];
            var pieChartColors = [{ "color": "#4EB2F9" }, { "color": "#FFC300" }, { "color": "#5C6BC0" }];
            var jsonObj = that.applyChartColorCodes(data.response.data, pieChartColors, otherChartColors);
            that.flightProcSection = jsonObj.sectionName;
            var pieCharts = _.filter(jsonObj.pieCharts, function (u) {
                if (u)
                    return u.favoriteInd == 'Y';
            });
            var multiCharts = _.filter(jsonObj.multibarCharts, function (u) {
                if (u)
                    return u.favoriteInd == 'Y';
            });
            var stackCharts = _.filter(jsonObj.stackedBarCharts, function (u) {
                if (u)
                    return u.favoriteInd == 'Y';
            });
            // console.log(stackCharts);
            if (that.header.tabIndex == 0) {
                that.flightProcStatus = {
                    pieChart: pieCharts[0],
                    weekData: multiCharts[0].multibarChartItems,
                    stackedChart: (stackCharts.length) ? stackCharts[0] : []
                };
            }
            else {
                that.flightProcStatus = {
                    pieChart: jsonObj.pieCharts[0],
                    weekData: jsonObj.multibarCharts[0].multibarChartItems,
                    stackedChart: jsonObj.stackedBarCharts[0]
                };
            }
            // console.log(stackCharts);
            that.$timeout(function () {
                that.$ionicSlideBoxDelegate.$getByHandle('oprfWeekData').update();
            }, 500);
            // console.log(JSON.stringify(that.flightProcStatus.weekData));
            that.ionicLoadingHide();
        }, function (error) {
        });
    };
    OperationalFlownController.prototype.callFlightCountByReason = function () {
        var that = this;
        var reqdata = {
            flownMonth: 'Jul-2015',
            userId: '',
            toggle1: 'open',
            fullDataFlag: 'N'
        };
        this.ionicLoadingShow();
        this.operationalService.getOprFlightCountByReason(reqdata)
            .then(function (data) {
            // console.log(jsonObj.pieCharts[0]);
            var otherChartColors = [{ "color": "#28AEFD" }, { "color": "#FFC300" }, { "color": "#5C6BC0" }];
            var pieChartColors = [{ "color": "#4EB2F9" }, { "color": "#FFC300" }, { "color": "#5C6BC0" }];
            var jsonObj = that.applyChartColorCodes(data.response.data, pieChartColors, otherChartColors);
            that.flightCountSection = jsonObj.sectionName;
            if (that.header.tabIndex == 0) {
                that.flightCountReason = that.getFavoriteItems(jsonObj);
            }
            else {
                that.flightCountReason = {
                    pieChart: jsonObj.pieCharts[0],
                    weekData: jsonObj.multibarCharts[0].multibarChartItems,
                    stackedChart: jsonObj.stackedBarCharts[0]
                };
            }
            that.$timeout(function () {
                that.$ionicSlideBoxDelegate.$getByHandle('oprfWeekData').update();
            }, 700);
            that.ionicLoadingHide();
        }, function (error) {
            that.ionicLoadingHide();
        });
    };
    OperationalFlownController.prototype.callCouponCountByException = function () {
        var that = this;
        var reqdata = {
            flownMonth: 'Jul-2015',
            userId: '',
            toggle1: '',
            fullDataFlag: 'N'
        };
        this.ionicLoadingShow();
        this.operationalService.getOprCouponCountByException(reqdata)
            .then(function (data) {
            var otherChartColors = [{ "color": "#4EB2F9" }, { "color": "#FFC300" }, { "color": "#5C6BC0" }];
            var pieChartColors = [{ "color": "#4EB2F9" }, { "color": "#FFC300" }, { "color": "#5C6BC0" }];
            var jsonObj = that.applyChartColorCodes(data.response.data, pieChartColors, otherChartColors);
            that.couponCountSection = jsonObj.sectionName;
            if (that.header.tabIndex == 0) {
                that.couponCountException = that.getFavoriteItems(jsonObj);
            }
            else {
                that.couponCountException = {
                    pieChart: jsonObj.pieCharts[0],
                    weekData: jsonObj.multibarCharts[0].multibarChartItems,
                    stackedChart: jsonObj.stackedBarCharts[0]
                };
            }
            that.$timeout(function () {
                that.$ionicSlideBoxDelegate.$getByHandle('oprfWeekData').update();
            }, 500);
            that.ionicLoadingHide();
        }, function (error) {
            that.ionicLoadingHide();
        });
    };
    OperationalFlownController.prototype.ionicLoadingShow = function () {
        this.$ionicLoading.show({
            template: '<ion-spinner class="spinner-calm"></ion-spinner>'
        });
    };
    ;
    OperationalFlownController.prototype.applyChartColorCodes = function (jsonObj, pieChartColors, otherChartColors) {
        _.forEach(jsonObj.pieCharts[0].data, function (n, value) {
            n.label = n.xval;
            n.value = n.yval;
        });
        _.merge(jsonObj.pieCharts[0].data, pieChartColors);
        _.merge(jsonObj.stackedBarCharts[0].stackedBarchartItems, otherChartColors);
        _.merge(jsonObj.multibarCharts[0].multibarChartItems, otherChartColors);
        return jsonObj;
    };
    OperationalFlownController.prototype.getFavoriteItems = function (jsonObj) {
        var pieCharts = _.filter(jsonObj.pieCharts, function (u) {
            if (u)
                return u.favoriteInd == 'Y';
        });
        var multiCharts = _.filter(jsonObj.multibarCharts, function (u) {
            if (u)
                return u.favoriteInd == 'Y';
        });
        var stackCharts = _.filter(jsonObj.stackedBarCharts, function (u) {
            if (u)
                return u.favoriteInd == 'Y';
        });
        return {
            pieChart: pieCharts[0],
            weekData: (multiCharts.length) ? multiCharts.multibarCharts[0].multibarChartItems : [],
            stackedChart: (stackCharts.length) ? stackCharts[0] : []
        };
    };
    OperationalFlownController.prototype.colorFunction = function () {
        var that = this;
        return function (d, i) {
            return that.threeBarChartColors[i];
        };
    };
    OperationalFlownController.prototype.fourBarColorFunction = function () {
        var that = this;
        return function (d, i) {
            return that.fourBarChartColors[i];
        };
    };
    OperationalFlownController.prototype.openinfoPopover = function ($event, index) {
        if (typeof index == "undefined" || index == "") {
            this.infodata = 'No info available';
        }
        else {
            this.infodata = index;
        }
        console.log(index);
        this.infopopover.show($event);
    };
    ;
    OperationalFlownController.prototype.closeInfoPopover = function () {
        this.infopopover.hide();
    };
    OperationalFlownController.prototype.toggleCount = function (val) {
        this.toggle.openOrClosed = val;
        this.onSlideMove({ index: this.header.tabIndex });
    };
    OperationalFlownController.prototype.ionicLoadingHide = function () {
        this.$ionicLoading.hide();
    };
    ;
    OperationalFlownController.prototype.lockSlide = function () {
        console.log('in lockSlide mehtod..');
        this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekData').enableSlide(false);
    };
    ;
    OperationalFlownController.prototype.weekDataPrev = function () {
        this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekData').previous();
    };
    ;
    OperationalFlownController.prototype.weekDataNext = function () {
        this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekData').next();
    };
    OperationalFlownController.prototype.toggleChartOrTableView = function (val) {
        this.toggle.chartOrTable = 'chart';
    };
    OperationalFlownController.prototype.runReport = function (chartTitle, monthOrYear, flownMonth) {
        //if no cordova, then running in browser and need to use dataURL and iframe
        if (!window.cordova) {
            this.reportSvc.runReportDataURL(chartTitle, monthOrYear, flownMonth)
                .then(function (dataURL) {
                //set the iframe source to the dataURL created
                //console.log(dataURL);
                //document.getElementById('pdfImage').src = dataURL;
            });
            return true;
        }
        else {
            this.reportSvc.runReportAsync(chartTitle, monthOrYear, flownMonth)
                .then(function (filePath) {
                //log the file location for debugging and oopen with inappbrowser
                console.log('report run on device using File plugin');
                console.log('ReportCtrl: Opening PDF File (' + filePath + ')');
                var fileName = "/mnt/sdcard/" + chartTitle + ".pdf";
                if (device.platform == "Android")
                    window.openPDF(fileName);
                else
                    window.open(filePath, '_blank', 'location=no,closebuttoncaption=Close,enableViewportScale=yes');
            });
            return true;
        }
    };
    OperationalFlownController.$inject = ['$scope', '$ionicLoading', '$ionicPopover', '$filter',
        'OperationalService', '$ionicSlideBoxDelegate', '$timeout', 'ReportSvc'];
    return OperationalFlownController;
})();

/// <reference path="../../_libs.ts" />
var LoginController = (function () {
    function LoginController($scope, $state, userService) {
        this.$scope = $scope;
        this.$state = $state;
        this.userService = userService;
        this.invalidMessage = false;
    }
    LoginController.prototype.clearError = function () {
        this.invalidMessage = false;
    };
    LoginController.prototype.logout = function () {
        this.$state.go("app.login");
    };
    LoginController.prototype.doLogin = function (loginForm) {
        var _this = this;
        if (!loginForm) {
            if (!angular.isDefined(this.username) || !angular.isDefined(this.password) || !angular.isDefined(this.ipaddress) || this.username.trim() == "" || this.password.trim() == "" || this.ipaddress.trim() == "") {
                this.invalidMessage = true;
            }
            //SERVER_URL = 'http://' + this.ipaddress + '/' + 'rapid-ws/services/rest';
            this.userService.login(this.username, this.password).then(function (result) {
                if (result.response.status == "success") {
                    _this.$state.go("app.mis-flown");
                }
                else {
                    _this.invalidMessage = true;
                    _this.eroormessage = "Please check your credentials";
                }
            }, function (error) {
                _this.invalidMessage = true;
                _this.eroormessage = "Please check your network connection";
            });
        }
        else {
            this.invalidMessage = true;
            this.eroormessage = "Please check your credentials";
        }
    };
    LoginController.$inject = ['$scope', '$state', 'UserService'];
    return LoginController;
})();

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
    .controller('LoginController', LoginController);
// .directive('fetchList', FetchList.factory())
ionic.Platform.ready(function () {
    if (window.cordova && window.cordova.plugins.Keyboard) {
    }
    // StatusBar.overlaysWebView(false);
    //    StatusBar.backgroundColorByHexString('#209dc2');
    //    StatusBar.styleLightContent();
    _.defer(function () {
        // angular.bootstrap(document, ['rapidMobile']);
    });
});



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
                    .classed("horizontal-bar-graph-icon icon ion-chevron-down no-border sectorCustomClass", true)
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
                    angular.element(this).removeClass('sectorCustomClass');
                    angular.element(document.querySelectorAll(".sectorCustomClass")).removeClass('ion-chevron-up');
                    angular.element(document.querySelectorAll(".sectorCustomClass")).addClass('ion-chevron-down');
                    angular.element(document.querySelectorAll(".sectorCustomClass")).next().removeClass('show');
                    angular.element(document.querySelectorAll(".sectorCustomClass")).next().addClass('hide');
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
                    angular.element(this).addClass('sectorCustomClass');
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
            searched: function (valLists, toSearch, level, drilltype) {
                return _.filter(valLists, function (i) {
                    /* Search Text in all 3 fields */
                    return searchUtil(i, toSearch, level, drilltype);
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
function searchUtil(item, toSearch, level, drilltype) {
    /* Search Text in all 3 fields */
    if (drilltype == 'route') {
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
    if (drilltype == 'bar') {
        if (item.routeCode && level == 0) {
            return (item.routeCode.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flownSector && level == 1) {
            return (item.flownSector.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flightNumber && level == 2) {
            return (item.flightNumber.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else {
            return false;
        }
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

/* (function () {
  angular.module('rapidMobile').factory('MisService', function (DataProviderService, $q) {
     return {
        getMetricSnapshot: function(reqdata) {
          // the $http API is based on the deferred/promise APIs exposed by the $q service
          // so it returns a promise for us by default

      return DataProviderService.postData('/paxflnmis/metricsnapshot', reqdata)
          .then(function(response) {
            if (typeof response.data === 'object') {
              return response.data;
            } else {
              // invalid response
              return $q.reject(response.data);
            }
          }, function(response) {
            // something went wrong
            return $q.reject(response.data);
          });
        },

        getTargetVsActual: function(reqdata) {
      return DataProviderService.postData('/paxflnmis/targetvsactual', reqdata)
          .then(function(response) {
            if (typeof response.data === 'object') {
              return response.data;
            } else {
              // invalid response
              return $q.reject(response.data);
            }
          }, function(response) {
            // something went wrong
            return $q.reject(response.data);
          });
        },

        getRevenueAnalysis: function(reqdata) {
      return DataProviderService.postData('/paxflnmis/revenueanalysis', reqdata)
          .then(function(response) {
            if (typeof response.data === 'object') {
              return response.data;
            } else {
              // invalid response
              return $q.reject(response.data);
            }
          }, function(response) {
            // something went wrong
            return $q.reject(response.data);
          });
        },

        getRouteRevenue: function(reqdata) {
          return DataProviderService.postData('/paxflnmis/routerevenue',reqdata)
          .then(function(response) {
            if (typeof response.data === 'object') {
              return response.data;
            } else {
              // invalid response
              return $q.reject(response.data);
            }
          }, function(response) {
            // something went wrong
            return $q.reject(response.data);
          });
        },

        getSectorCarrierAnalysis: function(reqdata) {
          return DataProviderService.postData('/paxflnmis/sectorcarrieranalysis',reqdata)
          .then(function(response) {
            if (typeof response.data === 'object') {
              return response.data;
            } else {
              // invalid response
              return $q.reject(response.data);
            }
          }, function(response) {
            // something went wrong
            return $q.reject(response.data);
          });
        },

        getPaxFlownMisHeader: function(reqdata) {
      return DataProviderService.postData('/paxflnmis/paxflownmisheader', reqdata)
          .then(function(response) {
            if (typeof response.data === 'object') {
              return response.data;
            } else {
              // invalid response
              return $q.reject(response.data);
            }
          }, function(response) {
            // something went wrong
            return $q.reject(response.data);
          });
        },

        getRouteRevenueDrillDown: function(reqdata) {
          return DataProviderService.postData('/paxflnmis/routerevenuedrill',reqdata)
          .then(function(response) {
            if (typeof response.data === 'object') {
              return response.data;
            } else {
              // invalid response
              return $q.reject(response.data);
            }
          }, function(response) {
            // something went wrong
            return $q.reject(response.data);
          });
        }

      };
    });
})(); */ 

(function () {
    'use strict';
    // attach the factories and service to the [starter.services] module in angular
    angular.module('rapidMobile')
        .service('ReportBuilderSvc', reportBuilderService);
    function reportBuilderService() {
        var self = this;
        self.generateReport = _generateReport;
        function _generateReport(param, chartTitle, flownMonth) {
            var title = "";
            if (param == "metricSnapshot")
                title = "METRIC SNAPSHOT -" + flownMonth + " " + chartTitle.toUpperCase() + "- VIEW";
            else if (param == "targetActual")
                title = "TARGET VS ACTUAL - " + ((chartTitle == "revenue") ? "NET REVENUE" : "PAX Count") + " " + flownMonth + " - VIEW";
            else
                title = chartTitle + " " + flownMonth + " - VIEW";
            var svgNode = d3.selectAll("." + param).selectAll("svg");
            var content = [];
            var imageColumn = [];
            var textColumn = [];
            var imagesObj = {};
            var textObj = {};
            content.push(title);
            var nodeExists = [];
            angular.forEach(svgNode, function (value, key) {
                console.log(key + ': ' + svgNode[key][0].outerHTML);
                //textObj['alignment'] = 'center'				
                if (nodeExists.indexOf(svgNode[key].parentNode.getAttribute("data-item-flag")) == -1) {
                    var html = svgNode[key][0].outerHTML;
                    canvg(document.getElementById('canvas'), html);
                    var test = document.getElementById('canvas');
                    var imgsrc = test.toDataURL();
                    var text = "\n" + svgNode[key].parentNode.getAttribute("data-item-title") + "\n";
                    textObj['text'] = text;
                    textColumn.push(textObj);
                    imagesObj['image'] = imgsrc;
                    imageColumn.push(imagesObj);
                    var imgTemp = {}, txtTemp = {};
                    txtTemp['columns'] = textColumn;
                    imgTemp['alignment'] = 'center';
                    imgTemp['columns'] = imageColumn;
                    content.push(txtTemp);
                    content.push(imgTemp);
                    imageColumn = [];
                    textColumn = [];
                    imagesObj = {};
                    textObj = {};
                    imgTemp = {};
                    txtTemp = {};
                    nodeExists.push(svgNode[key].parentNode.getAttribute("data-item-flag"));
                }
            });
            return {
                content: content,
                styles: {
                    header: {
                        fontSize: 18,
                        bold: true
                    },
                    bigger: {
                        fontSize: 15,
                        italics: true,
                    }
                },
                defaultStyle: {
                    columnGap: 20,
                }
            };
        }
        ;
    }
})();

(function () {
    'use strict';
    // attach the service to the [rapidMobile] module in angular
    angular.module('rapidMobile')
        .service('ReportSvc', ['$q', '$timeout', 'ReportBuilderSvc',
        reportSvc]);
    // genReportDef --> genReportDoc --> buffer[] --> Blob() --> saveFile --> return filePath
    function reportSvc($q, $timeout, ReportBuilderSvc) {
        this.runReportAsync = _runReportAsync;
        this.runReportDataURL = _runReportDataURL;
        // RUN ASYNC: runs the report async mode w/ progress updates and delivers a local fileUrl for use
        function _runReportAsync(statusFlag, title, flownMonth) {
            var deferred = $q.defer();
            //showLoading('1.Processing Transcript');
            generateReportDef(statusFlag, title, flownMonth).then(function (docDef) {
                //showLoading('2. Generating Report');
                return generateReportDoc(docDef);
            }).then(function (pdfDoc) {
                //showLoading('3. Buffering Report');
                return generateReportBuffer(pdfDoc);
            }).then(function (buffer) {
                //showLoading('4. Saving Report File');
                return generateReportBlob(buffer);
            }).then(function (pdfBlob) {
                //showLoading('5. Opening Report File');
                return saveFile(pdfBlob, statusFlag);
            }).then(function (filePath) {
                //hideLoading();
                deferred.resolve(filePath);
            }, function (error) {
                //hideLoading();
                console.log('Error: ' + error.toString());
                deferred.reject(error);
            });
            return deferred.promise;
        }
        // RUN DATAURL: runs the report async mode w/ progress updates and stops w/ pdfDoc -> dataURL string conversion
        function _runReportDataURL(statusFlag, title, flownMonth) {
            var deferred = $q.defer();
            //showLoading('1.Processing Transcript');
            generateReportDef(statusFlag, title, flownMonth).then(function (docDef) {
                //showLoading('2. Generating Report');
                return generateReportDoc(docDef);
            }).then(function (pdfDoc) {
                //showLoading('3. Convert to DataURL');
                return getDataURL(pdfDoc);
            }).then(function (outDoc) {
                //hideLoading();
                deferred.resolve(outDoc);
            }, function (error) {
                //hideLoading();
                console.log('Error: ' + error.toString());
                deferred.reject(error);
            });
            return deferred.promise;
        }
        // 1.GenerateReportDef: use currentTranscript to craft reportDef JSON for pdfMake to generate report
        function generateReportDef(statusFlag, title, flownMonth) {
            var deferred = $q.defer();
            // removed specifics of code to process data for drafting the doc
            // layout based on player, transcript, courses, etc.
            // currently mocking this and returning a pre-built JSON doc definition
            //use rpt service to generate the JSON data model for processing PDF
            // had to use the $timeout to put a short delay that was needed to 
            // properly generate the doc declaration
            $timeout(function () {
                var dd = {};
                dd = ReportBuilderSvc.generateReport(statusFlag, title, flownMonth);
                deferred.resolve(dd);
            }, 100);
            return deferred.promise;
        }
        // 2.GenerateRptFileDoc: take JSON from rptSvc, create pdfmemory buffer, and save as a local file
        function generateReportDoc(docDefinition) {
            //use the pdfmake lib to create a pdf from the JSON created in the last step
            var deferred = $q.defer();
            try {
                //use the pdfMake library to create in memory pdf from the JSON
                var pdfDoc = pdfMake.createPdf(docDefinition);
                deferred.resolve(pdfDoc);
            }
            catch (e) {
                deferred.reject(e);
            }
            return deferred.promise;
        }
        // 3.GenerateRptBuffer: pdfKit object pdfDoc --> buffer array of pdfDoc
        function generateReportBuffer(pdfDoc) {
            //use the pdfmake lib to get a buffer array of the pdfDoc object
            var deferred = $q.defer();
            try {
                //get the buffer from the pdfDoc
                pdfDoc.getBuffer(function (buffer) {
                    $timeout(function () {
                        deferred.resolve(buffer);
                    }, 100);
                });
            }
            catch (e) {
                deferred.reject(e);
            }
            return deferred.promise;
        }
        // 3b.getDataURL: pdfKit object pdfDoc --> encoded dataUrl
        function getDataURL(pdfDoc) {
            //use the pdfmake lib to create a pdf from the JSON created in the last step
            var deferred = $q.defer();
            try {
                //use the pdfMake library to create in memory pdf from the JSON
                pdfDoc.getDataUrl(function (outDoc) {
                    deferred.resolve(outDoc);
                });
            }
            catch (e) {
                deferred.reject(e);
            }
            return deferred.promise;
        }
        // 4.GenerateReportBlob: buffer --> new Blob object
        function generateReportBlob(buffer) {
            //use the global Blob object from pdfmake lib to creat a blob for file processing
            var deferred = $q.defer();
            try {
                //process the input buffer as an application/pdf Blob object for file processing
                var pdfBlob = new Blob([buffer], { type: 'application/pdf' });
                $timeout(function () {
                    deferred.resolve(pdfBlob);
                }, 100);
            }
            catch (e) {
                deferred.reject(e);
            }
            return deferred.promise;
        }
        // 5.SaveFile: use the File plugin to save the pdfBlob and return a filePath to the client
        function saveFile(pdfBlob, title) {
            var deferred = $q.defer();
            var fileName = title + ".pdf";
            var filePath = "";
            try {
                console.log('SaveFile: requestFileSystem');
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, fail);
            }
            catch (e) {
                console.error('SaveFile_Err: ' + e.message);
                deferred.reject(e);
                throw ({ code: -1401, message: 'unable to save report file' });
            }
            function gotFS(fileSystem) {
                console.error('SaveFile: gotFS --> getFile');
                fileSystem.root.getFile(fileName, { create: true, exclusive: false }, gotFileEntry, fail);
            }
            function gotFileEntry(fileEntry) {
                console.error('SaveFile: gotFileEntry --> (filePath) --> createWriter');
                filePath = fileEntry.toURL();
                fileEntry.createWriter(gotFileWriter, fail);
            }
            function gotFileWriter(writer) {
                console.error('SaveFile: gotFileWriter --> write --> onWriteEnd(resolve)');
                writer.onwriteend = function (evt) {
                    $timeout(function () {
                        deferred.resolve(filePath);
                    }, 100);
                };
                writer.onerror = function (e) {
                    console.log('writer error: ' + e.toString());
                    deferred.reject(e);
                };
                writer.write(pdfBlob);
            }
            function fail(error) {
                console.log(error.code);
                deferred.reject(error);
            }
            return deferred.promise;
        }
    }
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9saWJzLnRzIiwiY29tbW9uL3V0aWxzL1V0aWxzLnRzIiwiY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvQ29yZG92YVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvTmV0U2VydmljZS50cyIsImNvbW1vbi9zZXJ2aWNlcy9FcnJvckhhbmRsZXJTZXJ2aWNlLnRzIiwiY29tbW9uL3NlcnZpY2VzL0lTZXNzaW9uSHR0cFByb21pc2UuanMiLCJjb21tb24vc2VydmljZXMvU2Vzc2lvblNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1Jlc3BvbnNlLmpzIiwiY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHMiLCJjb21tb24vYXBwL0FwcENvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvc2VydmljZXMvT3BlcmF0aW9uYWxTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvTWlzQ29udHJvbGxlci50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL3VzZXIvTG9naW5Db250cm9sbGVyLnRzIiwiYXBwLnRzIiwiY29tbW9uL3NlcnZpY2VzL0dlbmVyaWNSZXF1ZXN0LmpzIiwiY29tcG9uZW50cy9taXMvcHJvZ3Jlc3MtYmFyLmRpcmVjdGl2ZS50cyIsImNvbXBvbmVudHMvbWlzL3JldmVudWUtcHJvZ3Jlc3MtYmFyLmRpcmVjdGl2ZS50cyIsImNvbXBvbmVudHMvc2VydmljZXMvZHJpbGxkb3duLnNlcnZpY2UudHMiLCJjb21wb25lbnRzL3NlcnZpY2VzL2xvZ2luLnNlcnZpY2UudHMiLCJjb21wb25lbnRzL3NlcnZpY2VzL21pcy5zZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvcmVwb3J0QnVpbGRlclN2Yy50cyIsImNvbXBvbmVudHMvbWlzL3NlcnZpY2VzL3JlcG9ydFNlcnZpY2UudHMiLCJjb21wb25lbnRzL3NlcnZpY2VzL2NvbW1vbi9jaGFydG9wdGlvbnMuc2VydmljZS50cyIsImNvbXBvbmVudHMvc2VydmljZXMvY29tbW9uL2RhdGFwcm92aWRlci5zZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9zZXJ2aWNlcy9jb21tb24vbmV0LnNlcnZpY2UudHMiXSwibmFtZXMiOlsiVXRpbHMiLCJVdGlscy5jb25zdHJ1Y3RvciIsIlV0aWxzLmlzTm90RW1wdHkiLCJVdGlscy5pc0xhbmRzY2FwZSIsIlV0aWxzLmdldFRvZGF5RGF0ZSIsIlV0aWxzLmlzSW50ZWdlciIsIkxvY2FsU3RvcmFnZVNlcnZpY2UiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTG9jYWxTdG9yYWdlU2VydmljZS5zZXQiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldCIsIkxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0T2JqZWN0IiwiTG9jYWxTdG9yYWdlU2VydmljZS5nZXRPYmplY3QiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmlzUmVjZW50RW50cnlBdmFpbGFibGUiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmFkZFJlY2VudEVudHJ5IiwiQ29yZG92YVNlcnZpY2UiLCJDb3Jkb3ZhU2VydmljZS5jb25zdHJ1Y3RvciIsIkNvcmRvdmFTZXJ2aWNlLmV4ZWMiLCJDb3Jkb3ZhU2VydmljZS5leGVjdXRlUGVuZGluZyIsIk5ldFNlcnZpY2UiLCJOZXRTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTmV0U2VydmljZS5nZXREYXRhIiwiTmV0U2VydmljZS5wb3N0RGF0YSIsIk5ldFNlcnZpY2UuZGVsZXRlRGF0YSIsIk5ldFNlcnZpY2UudXBsb2FkRmlsZSIsIk5ldFNlcnZpY2UuY2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkiLCJOZXRTZXJ2aWNlLnNlcnZlcklzQXZhaWxhYmxlIiwiTmV0U2VydmljZS5jYW5jZWxBbGxVcGxvYWREb3dubG9hZCIsIk5ldFNlcnZpY2UuYWRkTWV0YUluZm8iLCJlcnJvcmhhbmRsZXIiLCJFcnJvckhhbmRsZXJTZXJ2aWNlIiwiRXJyb3JIYW5kbGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkVycm9ySGFuZGxlclNlcnZpY2UudmFsaWRhdGVSZXNwb25zZSIsIkVycm9ySGFuZGxlclNlcnZpY2UuaXNOb1Jlc3VsdEZvdW5kIiwiRXJyb3JIYW5kbGVyU2VydmljZS5pc1Nlc3Npb25JbnZhbGlkIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNIYXJkRXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNTb2Z0RXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNFcnJvcnMiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc05vUmVzdWx0RXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0hhcmRFcnJvciIsIkVycm9ySGFuZGxlclNlcnZpY2UuaGFzU29mdEVycm9yIiwic2Vzc2lvbnNlcnZpY2UiLCJTZXNzaW9uU2VydmljZSIsIlNlc3Npb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiU2Vzc2lvblNlcnZpY2UucmVzb2x2ZVByb21pc2UiLCJTZXNzaW9uU2VydmljZS5hZGRBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyIiwiU2Vzc2lvblNlcnZpY2UucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lciIsIlNlc3Npb25TZXJ2aWNlLnNldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLnNldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLmNsZWFyTGlzdGVuZXJzIiwiU2Vzc2lvblNlcnZpY2UucmVmcmVzaFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkIiwiU2Vzc2lvblNlcnZpY2UuYWNjZXNzVG9rZW5SZWZyZXNoZWQiLCJkYXRhcHJvdmlkZXIiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlIiwiRGF0YVByb3ZpZGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkRhdGFQcm92aWRlclNlcnZpY2UuZ2V0RGF0YSIsIkRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmRlbGV0ZURhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiRGF0YVByb3ZpZGVyU2VydmljZS5hZGRNZXRhSW5mbyIsIkRhdGFQcm92aWRlclNlcnZpY2UuaXNMb2dvdXRTZXJ2aWNlIiwiQXBwQ29udHJvbGxlciIsIkFwcENvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJBcHBDb250cm9sbGVyLmlzTm90RW1wdHkiLCJBcHBDb250cm9sbGVyLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiQXBwQ29udHJvbGxlci5sb2dvdXQiLCJNaXNTZXJ2aWNlIiwiTWlzU2VydmljZS5jb25zdHJ1Y3RvciIsIk1pc1NlcnZpY2UuZ2V0TWV0cmljU25hcHNob3QiLCJNaXNTZXJ2aWNlLmdldFRhcmdldFZzQWN0dWFsIiwiTWlzU2VydmljZS5nZXRSZXZlbnVlQW5hbHlzaXMiLCJNaXNTZXJ2aWNlLmdldFJvdXRlUmV2ZW51ZSIsIk1pc1NlcnZpY2UuZ2V0U2VjdG9yQ2FycmllckFuYWx5c2lzIiwiTWlzU2VydmljZS5nZXRQYXhGbG93bk1pc0hlYWRlciIsIk1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlRHJpbGxEb3duIiwiTWlzU2VydmljZS5nZXRCYXJEcmlsbERvd24iLCJDaGFydG9wdGlvblNlcnZpY2UiLCJDaGFydG9wdGlvblNlcnZpY2UuY29uc3RydWN0b3IiLCJDaGFydG9wdGlvblNlcnZpY2UubGluZUNoYXJ0T3B0aW9ucyIsIkNoYXJ0b3B0aW9uU2VydmljZS5tdWx0aUJhckNoYXJ0T3B0aW9ucyIsIkNoYXJ0b3B0aW9uU2VydmljZS5tZXRyaWNCYXJDaGFydE9wdGlvbnMiLCJDaGFydG9wdGlvblNlcnZpY2UudGFyZ2V0QmFyQ2hhcnRPcHRpb25zIiwiRmlsdGVyZWRMaXN0U2VydmljZSIsIkZpbHRlcmVkTGlzdFNlcnZpY2UuY29uc3RydWN0b3IiLCJGaWx0ZXJlZExpc3RTZXJ2aWNlLnNlYXJjaGVkIiwiRmlsdGVyZWRMaXN0U2VydmljZS5wYWdlZCIsInNlYXJjaFV0aWwiLCJPcGVyYXRpb25hbFNlcnZpY2UiLCJPcGVyYXRpb25hbFNlcnZpY2UuY29uc3RydWN0b3IiLCJPcGVyYXRpb25hbFNlcnZpY2UuZ2V0UGF4Rmxvd25PcHJIZWFkZXIiLCJPcGVyYXRpb25hbFNlcnZpY2UuZ2V0T3ByRmxpZ2h0UHJvY1N0YXR1cyIsIk9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJGbGlnaHRDb3VudEJ5UmVhc29uIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckNvdXBvbkNvdW50QnlFeGNlcHRpb24iLCJVc2VyU2VydmljZSIsIlVzZXJTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiVXNlclNlcnZpY2Uuc2V0VXNlciIsIlVzZXJTZXJ2aWNlLmxvZ291dCIsIlVzZXJTZXJ2aWNlLmlzTG9nZ2VkSW4iLCJVc2VyU2VydmljZS5nZXRVc2VyIiwiVXNlclNlcnZpY2UubG9naW4iLCJVc2VyU2VydmljZS5nZXRVc2VyUHJvZmlsZSIsIk1pc0NvbnRyb2xsZXIiLCJNaXNDb250cm9sbGVyLmNvbnN0cnVjdG9yIiwiTWlzQ29udHJvbGxlci5pbml0RGF0YSIsIk1pc0NvbnRyb2xsZXIub3BlbmluZm9Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jbG9zZVBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3Nlc0JhclBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3NlSW5mb1BvcG92ZXIiLCJNaXNDb250cm9sbGVyLnVwZGF0ZUhlYWRlciIsIk1pc0NvbnRyb2xsZXIub25TbGlkZU1vdmUiLCJNaXNDb250cm9sbGVyLnRvZ2dsZU1ldHJpYyIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlU3VyY2hhcmdlIiwiTWlzQ29udHJvbGxlci50b2dnbGVUYXJnZXQiLCJNaXNDb250cm9sbGVyLnRvZ2dsZVNlY3RvciIsIk1pc0NvbnRyb2xsZXIuY2FsbE1ldHJpY1NuYXBzaG90IiwiTWlzQ29udHJvbGxlci5jYWxsVGFyZ2V0VnNBY3R1YWwiLCJNaXNDb250cm9sbGVyLmNhbGxSb3V0ZVJldmVudWUiLCJNaXNDb250cm9sbGVyLmNhbGxSZXZlbnVlQW5hbHlzaXMiLCJNaXNDb250cm9sbGVyLm9wZW5EcmlsbERvd24iLCJNaXNDb250cm9sbGVyLmNsZWFyRHJpbGwiLCJNaXNDb250cm9sbGVyLm9wZW5CYXJEcmlsbERvd24iLCJNaXNDb250cm9sbGVyLmluaXRpYXRlQXJyYXkiLCJNaXNDb250cm9sbGVyLm9wZW5CYXJEcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5vcGVuUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblNlY3RvclBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNhbGxTZWN0b3JDYXJyaWVyQW5hbHlzaXMiLCJNaXNDb250cm9sbGVyLnRhcmdldEFjdHVhbEZpbHRlciIsIk1pc0NvbnRyb2xsZXIuc2VjdG9yQ2FycmllckZpbHRlciIsIk1pc0NvbnRyb2xsZXIucmV2ZW51ZUFuYWx5c2lzRmlsdGVyIiwiTWlzQ29udHJvbGxlci5nZXRGbG93bkZhdm9yaXRlcyIsIk1pc0NvbnRyb2xsZXIuaW9uaWNMb2FkaW5nU2hvdyIsIk1pc0NvbnRyb2xsZXIuaW9uaWNMb2FkaW5nSGlkZSIsIk1pc0NvbnRyb2xsZXIub3BlbkRyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3Nlc1BvcG92ZXIiLCJNaXNDb250cm9sbGVyLmlzRHJpbGxSb3dTZWxlY3RlZCIsIk1pc0NvbnRyb2xsZXIuc2VhcmNoUmVzdWx0cyIsIk1pc0NvbnRyb2xsZXIucGFnaW5hdGlvbiIsIk1pc0NvbnRyb2xsZXIuc2V0UGFnZSIsIk1pc0NvbnRyb2xsZXIubGFzdFBhZ2UiLCJNaXNDb250cm9sbGVyLnJlc2V0QWxsIiwiTWlzQ29udHJvbGxlci5zb3J0IiwiTWlzQ29udHJvbGxlci5yYW5nZSIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlR3JvdXAiLCJNaXNDb250cm9sbGVyLmlzR3JvdXBTaG93biIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlQ2hhcnRPclRhYmxlVmlldyIsIk1pc0NvbnRyb2xsZXIucnVuUmVwb3J0IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jb25zdHJ1Y3RvciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmluaXREYXRhIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub25TbGlkZU1vdmUiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jYWxsTXlEYXNoYm9hcmQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jYWxsRmxpZ2h0UHJvY1N0YXR1cyIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNhbGxGbGlnaHRDb3VudEJ5UmVhc29uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2FsbENvdXBvbkNvdW50QnlFeGNlcHRpb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pb25pY0xvYWRpbmdTaG93IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuYXBwbHlDaGFydENvbG9yQ29kZXMiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5nZXRGYXZvcml0ZUl0ZW1zIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY29sb3JGdW5jdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmZvdXJCYXJDb2xvckZ1bmN0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbmluZm9Qb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2xvc2VJbmZvUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUNvdW50IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaW9uaWNMb2FkaW5nSGlkZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmxvY2tTbGlkZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLndlZWtEYXRhUHJldiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLndlZWtEYXRhTmV4dCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUNoYXJ0T3JUYWJsZVZpZXciLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5ydW5SZXBvcnQiLCJMb2dpbkNvbnRyb2xsZXIiLCJMb2dpbkNvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJMb2dpbkNvbnRyb2xsZXIuY2xlYXJFcnJvciIsIkxvZ2luQ29udHJvbGxlci5sb2dvdXQiLCJMb2dpbkNvbnRyb2xsZXIuZG9Mb2dpbiIsInJlcG9ydEJ1aWxkZXJTZXJ2aWNlIiwicmVwb3J0QnVpbGRlclNlcnZpY2UuX2dlbmVyYXRlUmVwb3J0IiwicmVwb3J0U3ZjIiwicmVwb3J0U3ZjLl9ydW5SZXBvcnRBc3luYyIsInJlcG9ydFN2Yy5fcnVuUmVwb3J0RGF0YVVSTCIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERlZiIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERvYyIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydEJ1ZmZlciIsInJlcG9ydFN2Yy5nZXREYXRhVVJMIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0QmxvYiIsInJlcG9ydFN2Yy5zYXZlRmlsZSIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGUyIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGaWxlRW50cnkiLCJyZXBvcnRTdmMuc2F2ZUZpbGUuZ290RmlsZVdyaXRlciIsInJlcG9ydFN2Yy5zYXZlRmlsZS5mYWlsIiwibGluZUNoYXJ0T3B0aW9ucyIsIm11bHRpQmFyQ2hhcnRPcHRpb25zIiwibWV0cmljQmFyQ2hhcnRPcHRpb25zIiwidGFyZ2V0QmFyQ2hhcnRPcHRpb25zIl0sIm1hcHBpbmdzIjoiQUFBQSw0Q0FBNEM7QUFDNUMsNkNBQTZDO0FBQzdDLDhDQUE4QztBQUM5QyxnREFBZ0Q7QUFDaEQsb0RBQW9EOztBQ0pwRCx1Q0FBdUM7QUFFdkM7SUFBQUE7SUE2QkFDLENBQUNBO0lBNUJjRCxnQkFBVUEsR0FBeEJBO1FBQXlCRSxnQkFBbUJBO2FBQW5CQSxXQUFtQkEsQ0FBbkJBLHNCQUFtQkEsQ0FBbkJBLElBQW1CQTtZQUFuQkEsK0JBQW1CQTs7UUFDM0NBLElBQUlBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBO1FBQ3RCQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxFQUFFQSxVQUFDQSxLQUFLQTtZQUN2QkEsVUFBVUEsR0FBR0EsVUFBVUEsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsS0FBS0EsS0FBS0EsSUFBSUEsSUFBSUEsS0FBS0EsS0FBS0EsRUFBRUE7bUJBQ2xGQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNuRkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDSEEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0E7SUFDbkJBLENBQUNBO0lBRWFGLGlCQUFXQSxHQUF6QkE7UUFDQ0csSUFBSUEsV0FBV0Es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QSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUN6Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7SUFDOUZBLENBQUNBO0lBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1FBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtJQUMvRkEsQ0FBQ0E7SUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDMUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO0lBQy9GQSxDQUFDQTtJQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtRQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtJQUNmQSxDQUFDQTtBQUVIQSxDQUFDQTs7QUM5Q0QsMENBQTBDO0FBQzFDLHdFQUF3RTtBQUV4RTtJQUlDQyw0QkFBb0JBLG1CQUF3Q0EsRUFBVUEsRUFBZ0JBO1FBQWxFQyx3QkFBbUJBLEdBQW5CQSxtQkFBbUJBLENBQXFCQTtRQUFVQSxPQUFFQSxHQUFGQSxFQUFFQSxDQUFjQTtJQUFJQSxDQUFDQTtJQUUzRkQsaURBQW9CQSxHQUFwQkEsVUFBcUJBLE9BQU9BO1FBQzNCRSxJQUFJQSxVQUFVQSxHQUFXQSw4QkFBOEJBLENBQUNBO1FBQ3hEQSxJQUFJQSxHQUFHQSxHQUFzQkEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7UUFDN0NBLElBQUlBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsVUFBVUEsRUFBRUEsT0FBT0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FDMURBLFVBQUNBLFFBQVFBO1lBQ1JBLElBQUlBLE1BQU1BLEdBQVFBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBO1lBQ2hDQSxHQUFHQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUNyQkEsQ0FBQ0EsRUFDREEsVUFBQ0EsS0FBS0E7WUFDTEEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxDQUFDQTtRQUNqQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFFSkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsT0FBT0EsQ0FBQ0E7SUFDcEJBLENBQUNBO0lBRURGLG1EQUFzQkEsR0FBdEJBLFVBQXVCQSxPQUFPQTtRQUM3QkcsSUFBSUEsVUFBVUEsR0FBV0EsbUNBQW1DQSxDQUFDQTtRQUM3REEsSUFBSUEsR0FBR0EsR0FBc0JBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO1FBQzdDQSxJQUFJQSxDQUFDQSxtQkFBbUJBLENBQUNBLFFBQVFBLENBQUNBLFVBQVVBLEVBQUVBLE9BQU9BLENBQUNBLENBQUNBLElBQUlBLENBQzFEQSxVQUFDQSxRQUFRQTtZQUNSQSxJQUFJQSxNQUFNQSxHQUFRQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUNoQ0EsR0FBR0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFDckJBLENBQUNBLEVBQ0RBLFVBQUNBLEtBQUtBO1lBQ0xBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGtCQUFrQkEsQ0FBQ0EsQ0FBQ0E7UUFDakNBLENBQUNBLENBQUNBLENBQUNBO1FBRUpBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLE9BQU9BLENBQUNBO0lBQ3BCQSxDQUFDQTtJQUVESCxzREFBeUJBLEdBQXpCQSxVQUEwQkEsT0FBT0E7UUFDaENJLElBQUlBLFVBQVVBLEdBQVdBLGdDQUFnQ0EsQ0FBQ0E7UUFDMURBLElBQUlBLEdBQUdBLEdBQXNCQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxLQUFLQSxFQUFFQSxDQUFDQTtRQUM3Q0EsSUFBSUEsQ0FBQ0EsbUJBQW1CQSxDQUFDQSxRQUFRQSxDQUFDQSxVQUFVQSxFQUFFQSxPQUFPQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUMxREEsVUFBQ0EsUUFBUUE7WUFDUkEsSUFBSUEsTUFBTUEsR0FBUUEsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7WUFDaENBLEdBQUdBLENBQUNBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBQ3JCQSxDQUFDQSxFQUNEQSxVQUFDQSxLQUFLQTtZQUNMQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxrQkFBa0JBLENBQUNBLENBQUNBO1FBQ2pDQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNKQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxPQUFPQSxDQUFDQTtJQUNwQkEsQ0FBQ0E7SUFFREoseURBQTRCQSxHQUE1QkEsVUFBNkJBLE9BQU9BO1FBQ25DSyxJQUFJQSxVQUFVQSxHQUFXQSxtQ0FBbUNBLENBQUNBO1FBQzdEQSxJQUFJQSxHQUFHQSxHQUFzQkEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7UUFDN0NBLElBQUlBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsVUFBVUEsRUFBRUEsT0FBT0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FDMURBLFVBQUNBLFFBQVFBO1lBQ1JBLElBQUlBLE1BQU1BLEdBQVFBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBO1lBQ2hDQSxHQUFHQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUNyQkEsQ0FBQ0EsRUFDREEsVUFBQ0EsS0FBS0E7WUFDTEEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxDQUFDQTtRQUNqQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDSkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsT0FBT0EsQ0FBQ0E7SUFDcEJBLENBQUNBO0lBNURhTCwwQkFBT0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtJQThEdkRBLHlCQUFDQTtBQUFEQSxDQWhFQSxBQWdFQ0EsSUFBQTs7QUNuRUQsMENBQTBDO0FBQzFDLHdFQUF3RTtBQUN4RSx3RUFBd0U7QUFFeEU7SUFHQ00scUJBQW9CQSxtQkFBd0NBLEVBQVVBLEVBQWdCQSxFQUFVQSxtQkFBd0NBLEVBQVVBLE9BQTBCQTtRQUF4SkMsd0JBQW1CQSxHQUFuQkEsbUJBQW1CQSxDQUFxQkE7UUFBVUEsT0FBRUEsR0FBRkEsRUFBRUEsQ0FBY0E7UUFBVUEsd0JBQW1CQSxHQUFuQkEsbUJBQW1CQSxDQUFxQkE7UUFBVUEsWUFBT0EsR0FBUEEsT0FBT0EsQ0FBbUJBO0lBRTVLQSxDQUFDQTtJQUVERCw2QkFBT0EsR0FBUEEsVUFBUUEsSUFBSUE7UUFDWEUsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDL0JBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLFlBQVlBLENBQUNBLE9BQU9BLENBQUNBLGtCQUFrQkEsRUFBRUEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDN0VBLENBQUNBO0lBQ0ZBLENBQUNBO0lBRURGLDRCQUFNQSxHQUFOQTtRQUNDRyxJQUFJQSxDQUFDQSxtQkFBbUJBLENBQUNBLFNBQVNBLENBQUNBLGtCQUFrQkEsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7UUFDN0RBLElBQUlBLENBQUNBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBO0lBQ25CQSxDQUFDQTtJQUVESCxnQ0FBVUEsR0FBVkE7UUFDQ0ksTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7SUFDbENBLENBQUNBO0lBRURKLDZCQUFPQSxHQUFQQTtRQUNDSyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQTtJQUNuQkEsQ0FBQ0E7SUFFREwsMkJBQUtBLEdBQUxBLFVBQU1BLFNBQWlCQSxFQUFFQSxTQUFpQkE7UUFBMUNNLGlCQXFDQ0E7UUFwQ0FBLElBQUlBLFVBQVVBLEdBQVdBLGFBQWFBLENBQUNBO1FBQ3ZDQSxJQUFJQSxHQUFHQSxHQUFzQkEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7UUFDN0NBLElBQUlBLFVBQVVBLEdBQUdBO1lBQ2hCQSxNQUFNQSxFQUFFQSxTQUFTQTtZQUNqQkEsUUFBUUEsRUFBRUEsU0FBU0E7U0FDbkJBLENBQUFBO1FBRURBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLEVBQUVBLFFBQVFBLEVBQUVBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBO1FBRS9CQSxJQUFJQSxDQUFDQSxtQkFBbUJBLENBQUNBLFFBQVFBLENBQUNBLFVBQVVBLEVBQUVBLFVBQVVBLENBQUNBLENBQUNBLElBQUlBLENBQzdEQSxVQUFDQSxRQUFRQTtZQUNSQSxJQUFJQSxJQUFJQSxHQUFRQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUM5QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsSUFBSUEsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3ZDQSxJQUFJQSxHQUFHQSxHQUFHQTtvQkFDVEEsTUFBTUEsRUFBRUEsU0FBU0E7aUJBQ2pCQSxDQUFBQTtnQkFDREEsS0FBSUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FDNUJBLFVBQUNBLE9BQU9BO29CQUNQQSxJQUFJQSxRQUFRQSxHQUFHQTt3QkFDZEEsUUFBUUEsRUFBRUEsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsUUFBUUE7cUJBQ2pEQSxDQUFBQTtvQkFDREEsS0FBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3hCQSxDQUFDQSxFQUNEQSxVQUFDQSxLQUFLQTtvQkFDTEEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsMENBQTBDQSxDQUFDQSxDQUFDQTtvQkFDeERBLEdBQUdBLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO2dCQUNuQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTEEsQ0FBQ0E7WUFDREEsR0FBR0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7UUFDbkJBLENBQUNBLEVBQ0RBLFVBQUNBLEtBQUtBO1lBQ0xBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLDRCQUE0QkEsQ0FBQ0EsQ0FBQ0E7WUFDMUNBLEdBQUdBLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO1FBQ25CQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUVKQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxPQUFPQSxDQUFDQTtJQUNwQkEsQ0FBQ0E7SUFFT04sb0NBQWNBLEdBQXRCQSxVQUF1QkEsT0FBT0E7UUFDN0JPLElBQUlBLFVBQVVBLEdBQVdBLG1CQUFtQkEsQ0FBQ0E7UUFDN0NBLElBQUlBLEdBQUdBLEdBQXNCQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxLQUFLQSxFQUFFQSxDQUFDQTtRQUM3Q0EsSUFBSUEsQ0FBQ0EsbUJBQW1CQSxDQUFDQSxRQUFRQSxDQUFDQSxVQUFVQSxFQUFFQSxPQUFPQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUMxREEsVUFBQ0EsUUFBUUE7WUFDUkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsUUFBUUEsQ0FBQ0EsSUFBSUEsS0FBS0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3ZDQSxHQUFHQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUM1QkEsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ1BBLEdBQUdBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQzNCQSxDQUFDQTtRQUNGQSxDQUFDQSxFQUNEQSxVQUFDQSxLQUFLQTtZQUNMQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxpQ0FBaUNBLENBQUNBLENBQUNBO1lBQy9DQSxHQUFHQSxDQUFDQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtRQUNuQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDSkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsT0FBT0EsQ0FBQ0E7SUFDcEJBLENBQUNBO0lBaEZhUCxtQkFBT0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxFQUFFQSxJQUFJQSxFQUFFQSxTQUFTQSxFQUFFQSxxQkFBcUJBLENBQUNBLENBQUNBO0lBaUZ6RkEsa0JBQUNBO0FBQURBLENBbEZBLEFBa0ZDQSxJQUFBOztBQ3RGRCx1Q0FBdUM7QUFDdkMsb0VBQW9FO0FBQ3BFLDZFQUE2RTtBQUM3RSw0RUFBNEU7QUEwQjVFO0lBOENJUSx1QkFBb0JBLE1BQWlCQSxFQUFVQSxhQUE2QkEsRUFBVUEsUUFBNEJBLEVBQVVBLE9BQTBCQSxFQUMxSUEsYUFBNkJBLEVBQVVBLE9BQTBCQSxFQUFVQSxVQUFzQkEsRUFBVUEsa0JBQXNDQSxFQUNqSkEsbUJBQXdDQSxFQUFVQSxTQUFvQkE7UUFoRHRGQyxpQkFtckJDQTtRQXJvQnVCQSxXQUFNQSxHQUFOQSxNQUFNQSxDQUFXQTtRQUFVQSxrQkFBYUEsR0FBYkEsYUFBYUEsQ0FBZ0JBO1FBQVVBLGFBQVFBLEdBQVJBLFFBQVFBLENBQW9CQTtRQUFVQSxZQUFPQSxHQUFQQSxPQUFPQSxDQUFtQkE7UUFDMUlBLGtCQUFhQSxHQUFiQSxhQUFhQSxDQUFnQkE7UUFBVUEsWUFBT0EsR0FBUEEsT0FBT0EsQ0FBbUJBO1FBQVVBLGVBQVVBLEdBQVZBLFVBQVVBLENBQVlBO1FBQVVBLHVCQUFrQkEsR0FBbEJBLGtCQUFrQkEsQ0FBb0JBO1FBQ2pKQSx3QkFBbUJBLEdBQW5CQSxtQkFBbUJBLENBQXFCQTtRQUFVQSxjQUFTQSxHQUFUQSxTQUFTQSxDQUFXQTtRQXJDMUVBLGFBQVFBLEdBQUdBLENBQUNBLENBQUNBO1FBQ2JBLGdCQUFXQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUNqQkEsa0JBQWFBLEdBQUdBLEVBQUVBLENBQUNBO1FBQ25CQSxXQUFNQSxHQUFHQSxFQUFFQSxDQUFDQTtRQW1IcEJBLHNCQUFpQkEsR0FBR0E7WUFDaEJBLEtBQUlBLENBQUNBLFdBQVdBLENBQUNBLEVBQUVBLEtBQUtBLEVBQUVBLEtBQUlBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLEVBQUVBLENBQUNBLENBQUNBO1FBQ3REQSxDQUFDQSxDQUFBQTtRQWpGR0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFFakJBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBO1lBQ1pBLEVBQUVBLEtBQUtBLEVBQUVBLGNBQWNBLEVBQUVBLEtBQUtBLEVBQUVBLGFBQWFBLEVBQUVBLElBQUlBLEVBQUdBLGFBQWFBLEVBQUVBO1lBQ3JFQSxFQUFFQSxLQUFLQSxFQUFFQSxpQkFBaUJBLEVBQUVBLEtBQUtBLEVBQUVBLGdCQUFnQkEsRUFBRUEsSUFBSUEsRUFBR0EsVUFBVUEsRUFBRUE7WUFDeEVBLEVBQUVBLEtBQUtBLEVBQUVBLGtCQUFrQkEsRUFBRUEsS0FBS0EsRUFBRUEsZ0JBQWdCQSxFQUFFQSxJQUFJQSxFQUFHQSxVQUFVQSxFQUFFQTtZQUN6RUEsRUFBRUEsS0FBS0EsRUFBRUEsa0JBQWtCQSxFQUFFQSxLQUFLQSxFQUFFQSxpQkFBaUJBLEVBQUVBLElBQUlBLEVBQUdBLFVBQVVBLEVBQUNBO1lBQ3pFQSxFQUFFQSxLQUFLQSxFQUFFQSwyQkFBMkJBLEVBQUVBLEtBQUtBLEVBQUVBLDBCQUEwQkEsRUFBRUEsSUFBSUEsRUFBR0EsVUFBVUEsRUFBRUE7WUFDNUZBLEVBQUVBLEtBQUtBLEVBQUVBLGVBQWVBLEVBQUVBLEtBQUtBLEVBQUVBLGNBQWNBLEVBQUVBLElBQUlBLEVBQUdBLFVBQVVBLEVBQUVBO1NBQ25FQSxDQUFDQTtRQUVGQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQTtZQUNWQSxXQUFXQSxFQUFHQSxPQUFPQTtZQUNyQkEsY0FBY0EsRUFBRUEsU0FBU0E7WUFDekJBLFdBQVdBLEVBQUVBLE1BQU1BO1lBQ25CQSxjQUFjQSxFQUFFQSxTQUFTQTtZQUNsQ0EsWUFBWUEsRUFBRUEsT0FBT0E7U0FDZkEsQ0FBQUE7UUFHREEsSUFBSUEsQ0FBQ0EsTUFBTUEsR0FBR0E7WUFDVkEsVUFBVUEsRUFBRUEsRUFBRUE7WUFDZEEsU0FBU0EsRUFBR0EsS0FBS0E7WUFDakJBLFFBQVFBLEVBQUVBLENBQUNBO1lBQ1hBLFdBQVdBLEVBQUVBLENBQUNBO1lBQ2RBLFFBQVFBLEVBQUVBLEVBQUVBO1NBQ2ZBLENBQUNBO1FBRUZBOzs7Y0FHTUE7UUFDTkEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsbUJBQW1CQSxFQUFFQSxJQUFJQSxDQUFDQSxpQkFBaUJBLENBQUNBLENBQUNBO1FBQzFFQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxhQUFhQSxFQUFFQSxVQUFDQSxLQUFVQSxFQUFFQSxRQUFhQTtZQUNyREEsS0FBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsV0FBV0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7UUFDOUNBLENBQUNBLENBQUNBLENBQUNBO1FBRUhBLGtIQUFrSEE7UUFDbEhBLElBQUlBLENBQUNBLFFBQVFBLEVBQUVBLENBQUNBO0lBRXBCQSxDQUFDQTtJQUNERCxnQ0FBUUEsR0FBUkE7UUFDSUUsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDaEJBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLGVBQWVBLENBQUNBLGlDQUFpQ0EsRUFBRUE7WUFDbEVBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BO1NBQ3JCQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFTQSxXQUFXQTtZQUN4QixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUNuQyxDQUFDLENBQUNBLENBQUNBO1FBRUhBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLGVBQWVBLENBQUNBLDhCQUE4QkEsRUFBRUE7WUFDL0RBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BO1NBQ3JCQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFTQSxZQUFZQTtZQUN6QixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUNyQyxDQUFDLENBQUNBLENBQUNBO1FBRUhBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLGVBQWVBLENBQUNBLGlDQUFpQ0EsRUFBRUE7WUFDbEVBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BO1NBQ3JCQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFTQSxlQUFlQTtZQUM1QixJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUMzQyxDQUFDLENBQUNBLENBQUNBO1FBRUhBLElBQUlBLENBQUNBLE9BQU9BLEdBQUdBO1lBQ1hBLE1BQU1BLEVBQUVBLElBQUlBLENBQUNBLGtCQUFrQkEsQ0FBQ0EscUJBQXFCQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUMzREEsZUFBZUEsRUFBRUEsSUFBSUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxnQkFBZ0JBLEVBQUVBO1lBQzNEQSxjQUFjQSxFQUFFQSxJQUFJQSxDQUFDQSxrQkFBa0JBLENBQUNBLHFCQUFxQkEsRUFBRUE7WUFDL0RBLGNBQWNBLEVBQUVBLElBQUlBLENBQUNBLGtCQUFrQkEsQ0FBQ0Esb0JBQW9CQSxFQUFFQTtTQUNqRUEsQ0FBQ0E7UUFHRkEsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxFQUFDQSxNQUFNQSxFQUFFQSxRQUFRQSxFQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUNyREEsVUFBQ0EsSUFBSUE7WUFDREEsSUFBSUEsQ0FBQ0EsU0FBU0EsR0FBR0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7WUFDcENBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsU0FBU0EsQ0FBQ0E7UUFDM0VBLENBQUNBLEVBQ0RBLFVBQUNBLEtBQUtBO1lBQ0ZBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGtCQUFrQkEsQ0FBQ0EsQ0FBQ0E7UUFDcENBLENBQUNBLENBQUNBLENBQUNBO1FBQ1hBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEVBQUNBLEtBQUtBLEVBQUVBLENBQUNBLEVBQUNBLENBQUNBLENBQUNBO0lBQ2pDQSxDQUFDQTtJQUlERix1Q0FBZUEsR0FBZkEsVUFBaUJBLE1BQU1BLEVBQUVBLEtBQUtBO1FBQzFCRyxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxLQUFLQSxJQUFJQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUM3Q0EsSUFBSUEsQ0FBQ0EsUUFBUUEsR0FBR0EsbUJBQW1CQSxDQUFDQTtRQUN4Q0EsQ0FBQ0E7UUFDREEsSUFBSUEsQ0FBQUEsQ0FBQ0E7WUFDREEsSUFBSUEsQ0FBQ0EsUUFBUUEsR0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDeEJBLENBQUNBO1FBQ0RBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO1FBQ25CQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtJQUNsQ0EsQ0FBQ0E7O0lBQ0RILG9DQUFZQSxHQUFaQTtRQUNJSSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtJQUM3QkEsQ0FBQ0E7O0lBQ0RKLHdDQUFnQkEsR0FBaEJBO1FBQ0lLLElBQUlBLENBQUNBLGVBQWVBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO0lBQ2hDQSxDQUFDQTtJQUNETCx3Q0FBZ0JBLEdBQWhCQTtRQUNJTSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtJQUM1QkEsQ0FBQ0E7SUFFRE4sb0NBQVlBLEdBQVpBO1FBQ0ZPLElBQUlBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBO1FBQ2xDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxpQkFBaUJBLEVBQUVBLFVBQVNBLEdBQVFBO1lBQ3JGLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxJQUFJLFVBQVUsQ0FBQztRQUN2QyxDQUFDLENBQUNBLENBQUNBO1FBQ0hBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLENBQUNBO1FBQzNDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxFQUFDQSxLQUFLQSxFQUFFQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxFQUFDQSxDQUFDQSxDQUFDQTtJQUNqREEsQ0FBQ0E7SUFFRFAsbUNBQVdBLEdBQVhBLFVBQVlBLElBQVNBO1FBQ2pCUSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQTtRQUNyQkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDbENBLE1BQU1BLENBQUFBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLENBQUFBLENBQUNBO1lBQ3pCQSxLQUFLQSxDQUFDQTtnQkFDTkEsSUFBSUEsQ0FBQ0EsaUJBQWlCQSxFQUFFQSxDQUFDQTtnQkFDekJBLEtBQUtBLENBQUNBO1lBQ05BLEtBQUtBLENBQUNBO2dCQUNOQSxJQUFJQSxDQUFDQSxrQkFBa0JBLEVBQUVBLENBQUNBO2dCQUMxQkEsS0FBS0EsQ0FBQ0E7WUFDTkEsS0FBS0EsQ0FBQ0E7Z0JBQ05BLElBQUlBLENBQUNBLGtCQUFrQkEsRUFBRUEsQ0FBQ0E7Z0JBQzFCQSxLQUFLQSxDQUFDQTtZQUNOQSxLQUFLQSxDQUFDQTtnQkFDTkEsSUFBSUEsQ0FBQ0EsbUJBQW1CQSxFQUFFQSxDQUFDQTtnQkFDM0JBLEtBQUtBLENBQUNBO1lBQ05BLEtBQUtBLENBQUNBO2dCQUNOQSxJQUFJQSxDQUFDQSx5QkFBeUJBLEVBQUVBLENBQUNBO2dCQUNqQ0EsS0FBS0EsQ0FBQ0E7WUFDTkEsS0FBS0EsQ0FBQ0E7Z0JBQ05BLElBQUlBLENBQUNBLGdCQUFnQkEsRUFBRUEsQ0FBQ0E7Z0JBQ3hCQSxLQUFLQSxDQUFDQTtRQUNWQSxDQUFDQTtJQUNMQSxDQUFDQTs7SUFFRFIsb0NBQVlBLEdBQVpBLFVBQWNBLEdBQUdBO1FBQ2JTLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLEdBQUdBLENBQUNBO1FBQzlCQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxFQUFDQSxLQUFLQSxFQUFFQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxFQUFDQSxDQUFDQSxDQUFDQTtJQUNwREEsQ0FBQ0E7SUFDRFQsdUNBQWVBLEdBQWZBO1FBQ0lVLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEVBQUNBLEtBQUtBLEVBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLEVBQUNBLENBQUNBLENBQUNBO0lBQ25EQSxDQUFDQTtJQUNEVixvQ0FBWUEsR0FBWkEsVUFBYUEsR0FBR0E7UUFDWlcsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0EsR0FBR0EsQ0FBQ0E7SUFDckNBLENBQUNBO0lBRURYLG9DQUFZQSxHQUFaQSxVQUFhQSxHQUFHQTtRQUNaWSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxHQUFHQSxDQUFDQTtJQUNyQ0EsQ0FBQ0E7SUFFRFosMENBQWtCQSxHQUFsQkE7UUFDSWEsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDaEJBLElBQUlBLE9BQU9BLEdBQUdBO1lBQ1ZBLFVBQVVBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBO1lBQ2xDQSxnQkFBZ0JBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUNBLEdBQUdBO1lBQ25EQSxNQUFNQSxFQUFFQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQTtZQUM1QkEsT0FBT0EsRUFBRUEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0E7WUFDaENBLFlBQVlBLEVBQUVBLEdBQUdBO1NBQ3BCQSxDQUFDQTtRQUNGQSxJQUFJQSxDQUFDQSxnQkFBZ0JBLEVBQUVBLENBQUNBO1FBQ3hCQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxpQkFBaUJBLENBQUNBLE9BQU9BLENBQUNBO2FBQ3pDQSxJQUFJQSxDQUFDQSxVQUFTQSxJQUFJQTtZQUVmLG9DQUFvQztZQUNwQyxJQUFJLENBQUMsWUFBWSxHQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsVUFBUyxDQUFNO2dCQUNsRixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDNUMsQ0FBQyxDQUFDLENBQUM7WUFFSCxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFNLEVBQUUsS0FBVTtnQkFDckQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO2dCQUM5QixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7Z0JBQzlCLEVBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO1lBQ2xELENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsVUFBUyxDQUFNO2dCQUM5RCxFQUFFLENBQUEsQ0FBQyxDQUFDLENBQUM7b0JBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDaEQsRUFBRSxDQUFBLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0IsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDO1lBQzdDLENBQUM7WUFDRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUM1QixDQUFDLEVBQUVBLFVBQVNBLEtBQUtBO1FBQ2pCLENBQUMsQ0FBQ0EsQ0FBQ0E7SUFDUEEsQ0FBQ0E7SUFFRGIsMENBQWtCQSxHQUFsQkE7UUFDSWMsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDaEJBLElBQUlBLE9BQU9BLEdBQUdBO1lBQ1ZBLFVBQVVBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBO1lBQ2xDQSxnQkFBZ0JBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUNBLEdBQUdBO1lBQ25EQSxNQUFNQSxFQUFFQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQTtZQUM1QkEsT0FBT0EsRUFBRUEsRUFBRUE7WUFDWEEsWUFBWUEsRUFBRUEsRUFBRUE7U0FDbkJBLENBQUNBO1FBQ0ZBLElBQUlBLENBQUNBLGdCQUFnQkEsRUFBRUEsQ0FBQ0E7UUFFeEJBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7YUFDekNBLElBQUlBLENBQUNBLFVBQVNBLElBQUlBO1lBQ2Ysb0NBQW9DO1lBQ3BDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFTLENBQU07Z0JBQzlFLEVBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQztvQkFBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsSUFBSSxHQUFHLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsVUFBUyxDQUFNO2dCQUMvRSxFQUFFLENBQUEsQ0FBQyxDQUFDLENBQUM7b0JBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxDQUFDO1lBQ0gsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFNLEVBQUUsS0FBVTtnQkFDbkUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO2dCQUM5QixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7WUFDbEMsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLFVBQVUsR0FBRyxDQUFDLEVBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUM7Z0JBQzVFLEVBQUMsT0FBTyxFQUFFLFNBQVMsRUFBQyxFQUFDLEVBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUcsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1lBRTVFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBTSxFQUFFLEtBQVU7Z0JBQ2pFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUMxQyxDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFM0MsSUFBSSxDQUFDLGdCQUFnQixHQUFHO2dCQUNwQixXQUFXLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWTtnQkFDNUMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVU7YUFDM0MsQ0FBQztZQUVGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQzVCLENBQUMsRUFBRUEsVUFBU0EsS0FBS0E7WUFDYixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQzVCLENBQUMsQ0FBQ0EsQ0FBQ0E7SUFDUEEsQ0FBQ0E7SUFFRGQsd0NBQWdCQSxHQUFoQkE7UUFDSWUsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDaEJBLElBQUlBLGVBQWVBLEdBQUdBO1lBQ2xCQSxVQUFVQSxFQUFFQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQTtZQUNsQ0EsZ0JBQWdCQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFDQSxHQUFHQTtZQUNuREEsTUFBTUEsRUFBRUEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUE7U0FDL0JBLENBQUNBO1FBQ0ZBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLGVBQWVBLENBQUNBLGVBQWVBLENBQUNBO2FBQy9DQSxJQUFJQSxDQUFDQSxVQUFTQSxJQUFJQTtZQUNmLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDM0MsQ0FBQyxFQUFFQSxVQUFTQSxLQUFLQTtZQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDQSxDQUFDQTtJQUNQQSxDQUFDQTtJQUdEZiwyQ0FBbUJBLEdBQW5CQTtRQUNJZ0IsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDaEJBLElBQUlBLE9BQU9BLEdBQUdBO1lBQ1ZBLFVBQVVBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBO1lBQ2xDQSxnQkFBZ0JBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUNBLEdBQUdBO1lBQ25EQSxNQUFNQSxFQUFFQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQTtZQUM1QkEsT0FBT0EsRUFBRUEsRUFBRUE7WUFDWEEsWUFBWUEsRUFBRUEsRUFBRUE7U0FDbkJBLENBQUNBO1FBQ0ZBLElBQUlBLENBQUNBLGdCQUFnQkEsRUFBRUEsQ0FBQ0E7UUFDeEJBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLGtCQUFrQkEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7YUFDMUNBLElBQUlBLENBQUNBLFVBQVNBLElBQUlBO1lBQ2Ysb0NBQW9DO1lBQ3BDLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1lBQ2pDLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxVQUFTLENBQU07Z0JBQzdELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUM1QyxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsVUFBUyxDQUFNO2dCQUMxRCxFQUFFLENBQUEsQ0FBQyxDQUFDLENBQUM7b0JBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFVBQVMsQ0FBTTtnQkFDeEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQzVDLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxtQkFBbUIsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxVQUFTLENBQU07Z0JBQzFELEVBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQztvQkFBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsSUFBSSxHQUFHLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLFNBQVMsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN2QyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDOUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLFVBQVMsQ0FBTSxFQUFFLEtBQVU7Z0JBQ3pELENBQUMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQy9CLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUMsRUFBQyxFQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUMsRUFBQyxFQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUMsQ0FBQyxDQUFDO1lBQ2pGLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFNLEVBQUUsS0FBVTtnQkFDN0QsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNqQixDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDckIsQ0FBQyxDQUFDLENBQUM7WUFFSCxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBRTlDLElBQUksQ0FBQyxXQUFXLEdBQUc7Z0JBQ2YsZUFBZSxFQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUN0QyxlQUFlLEVBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0I7Z0JBQzlELGtCQUFrQixFQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCO2FBQ3BFLENBQUE7WUFFRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUM1QixDQUFDLEVBQUVBLFVBQVNBLEtBQUtBO1lBQ2IsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUNBLENBQUNBO0lBQ1BBLENBQUNBO0lBRURoQixxQ0FBYUEsR0FBYkEsVUFBY0EsVUFBVUEsRUFBQ0EsWUFBWUE7UUFDakNpQixJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUNoQkEsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsR0FBR0EsVUFBVUEsQ0FBQ0E7UUFDOUNBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLFlBQVlBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLEVBQUVBLENBQUNBO1FBQzFDQSxFQUFFQSxDQUFBQSxDQUFDQSxZQUFZQSxJQUFJQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNyQkEsSUFBSUEsVUFBVUEsR0FBR0EsQ0FBQ0EsWUFBWUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDcENBLElBQUlBLENBQUNBLFVBQVVBLEdBQUdBLENBQUNBLFVBQVVBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLFVBQVVBLENBQUNBLFVBQVVBLEdBQUdBLFVBQVVBLENBQUNBLFNBQVNBLENBQUNBO1lBQ3pGQSxJQUFJQSxhQUFhQSxHQUFHQSxDQUFDQSxVQUFVQSxDQUFDQSxXQUFXQSxJQUFJQSxVQUFVQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxVQUFVQSxDQUFDQSxXQUFXQSxHQUFHQSxHQUFHQSxHQUFHQSxVQUFVQSxDQUFDQSxTQUFTQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUNoSUEsSUFBSUEsWUFBWUEsR0FBR0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsV0FBV0EsSUFBSUEsVUFBVUEsSUFBSUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsVUFBVUEsQ0FBQ0EsV0FBV0EsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDN0ZBLElBQUlBLFlBQVlBLEdBQUdBLENBQUNBLFVBQVVBLENBQUNBLFlBQVlBLElBQUlBLFVBQVVBLElBQUlBLENBQUNBLENBQUNBLEdBQUdBLFVBQVVBLENBQUNBLFlBQVlBLEdBQUdBLEVBQUVBLENBQUNBO1lBQy9GQSxJQUFJQSxDQUFDQSxnQkFBZ0JBLEVBQUVBLENBQUNBO1lBRXhCQSxJQUFJQSxPQUFPQSxHQUFHQTtnQkFDVkEsWUFBWUEsRUFBRUEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUE7Z0JBQ3BDQSxrQkFBa0JBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUNBLEdBQUdBO2dCQUNyREEsUUFBUUEsRUFBRUEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUE7Z0JBQzlCQSxjQUFjQSxFQUFFQSxFQUFFQTtnQkFDbEJBLFlBQVlBLEVBQUVBLFVBQVVBO2dCQUN4QkEsWUFBWUEsRUFBRUEsQ0FBQ0E7Z0JBQ2ZBLFlBQVlBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEdBQUVBLElBQUlBLENBQUNBLFVBQVVBLEdBQUdBLGVBQWVBO2dCQUNsRUEsZUFBZUEsRUFBRUEsYUFBYUE7Z0JBQzlCQSxjQUFjQSxFQUFFQSxZQUFZQTtnQkFDNUJBLGNBQWNBLEVBQUVBLFlBQVlBO2dCQUM1QkEsWUFBWUEsRUFBRUEsQ0FBQ0E7YUFDbEJBLENBQUNBO1lBRUZBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLHdCQUF3QkEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7aUJBQ2hEQSxJQUFJQSxDQUFDQSxVQUFTQSxJQUFJQTtnQkFDZixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztnQkFDekIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEIsSUFBSSxTQUFTLEdBQUcsVUFBVSxHQUFHLENBQUMsQ0FBQztnQkFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3pCLEVBQUUsQ0FBQSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksU0FBUyxDQUFDLENBQUEsQ0FBQztvQkFDekIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQ2pELElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO29CQUNwRCxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztvQkFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUMsU0FBUyxFQUFDLEtBQUssQ0FBQyxDQUFDO29CQUN0QyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNoQyxDQUFDO2dCQUFBLElBQUksQ0FBQSxDQUFDO29CQUNGLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO29CQUM1QixJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUMvQixDQUFDO1lBQ0wsQ0FBQyxFQUFDQSxVQUFTQSxLQUFLQTtnQkFDWixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNyQixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNuQixLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDMUIsQ0FBQyxDQUFDQSxDQUFDQTtRQUNQQSxDQUFDQTtJQUNMQSxDQUFDQTtJQUNEakIsa0NBQVVBLEdBQVZBLFVBQVdBLEtBQWFBO1FBQ3BCa0IsSUFBSUEsQ0FBU0EsQ0FBQ0E7UUFDZEEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsS0FBS0EsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0E7WUFDOUJBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO1lBQ2xDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNyQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsRUFBQ0EsQ0FBQ0EsRUFBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7UUFDbENBLENBQUNBO0lBQ0xBLENBQUNBO0lBRURsQix3Q0FBZ0JBLEdBQWhCQSxVQUFpQkEsSUFBSUEsRUFBRUEsWUFBWUE7UUFDL0JtQixZQUFZQSxHQUFHQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtRQUNwQ0EsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDaEJBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLFlBQVlBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBO1FBQ3hDQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxZQUFZQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUMxQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsWUFBWUEsSUFBSUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDdEJBLElBQUlBLFVBQVVBLEdBQUdBLENBQUNBLFlBQVlBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO1lBQ3BDQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDYkEsSUFBSUEsQ0FBQ0EsYUFBYUEsR0FBR0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7WUFDcENBLENBQUNBO1lBRURBLElBQUlBLFFBQWdCQSxDQUFDQTtZQUNyQkEsUUFBUUEsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsS0FBS0EsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDMUNBLElBQUlBLFNBQVNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLEdBQUdBLEVBQUVBLENBQUNBO1lBQ3ZEQSxJQUFJQSxNQUFNQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUN4REEsSUFBSUEsWUFBWUEsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFFaEVBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUNaQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQTtnQkFDOUJBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO1lBQzFCQSxDQUFDQTtZQUNEQSxJQUFJQSxDQUFDQSxnQkFBZ0JBLEVBQUVBLENBQUNBO1lBRXhCQSxJQUFJQSxPQUFPQSxHQUFHQTtnQkFDVkEsWUFBWUEsRUFBRUEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUE7Z0JBQ3BDQSxrQkFBa0JBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBO2dCQUN2REEsUUFBUUEsRUFBRUEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUE7Z0JBQzlCQSxjQUFjQSxFQUFFQSxFQUFFQTtnQkFDbEJBLFlBQVlBLEVBQUVBLFVBQVVBO2dCQUN4QkEsWUFBWUEsRUFBRUEsQ0FBQ0E7Z0JBQ2ZBLFVBQVVBLEVBQUVBLFFBQVFBO2dCQUNwQkEsV0FBV0EsRUFBRUEsU0FBU0E7Z0JBQ3RCQSxRQUFRQSxFQUFFQSxNQUFNQTtnQkFDaEJBLGNBQWNBLEVBQUVBLFlBQVlBO2FBQy9CQSxDQUFDQTtZQUVGQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxlQUFlQSxDQUFDQSxPQUFPQSxDQUFDQTtpQkFDbkNBLElBQUlBLENBQUNBLFVBQVNBLElBQUlBO2dCQUNmLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN4QixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO2dCQUN6QixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNsQixJQUFJLFNBQVMsR0FBRyxVQUFVLEdBQUcsQ0FBQyxDQUFDO2dCQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDekIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztvQkFDakQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQ3BELElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO29CQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ3hDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ2hDLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ0osSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7b0JBQzVCLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQy9CLENBQUM7WUFDTCxDQUFDLEVBQUVBLFVBQVNBLEtBQUtBO2dCQUNiLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3JCLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ25CLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUMxQixDQUFDLENBQUNBLENBQUNBO1FBQ1hBLENBQUNBO0lBQ0xBLENBQUNBO0lBQ0RuQixxQ0FBYUEsR0FBYkEsVUFBY0EsU0FBU0E7UUFDbkJvQixHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxJQUFJQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN0QkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0E7Z0JBQ2JBLEVBQUVBLEVBQUVBLENBQUNBO2dCQUNMQSxJQUFJQSxFQUFFQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDdkJBLEtBQUtBLEVBQUVBLEVBQUVBO2dCQUNUQSxRQUFRQSxFQUFFQSxFQUFFQTtnQkFDWkEsV0FBV0EsRUFBRUEsRUFBRUE7YUFDbEJBLENBQUNBO1FBQ05BLENBQUNBO0lBQ0xBLENBQUNBO0lBQ0RwQiwrQ0FBdUJBLEdBQXZCQSxVQUF3QkEsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsWUFBWUE7UUFDakRxQixJQUFJQSxDQUFDQSxTQUFTQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUN2QkEsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFDbENBLElBQUlBLENBQUNBLFNBQVNBLEdBQUdBLENBQUNBLGFBQWFBLEVBQUVBLGNBQWNBLEVBQUVBLFlBQVlBLEVBQUVBLGNBQWNBLENBQUNBLENBQUNBO1FBQy9FQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUNuQ0EsSUFBSUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxFQUFFQSxZQUFZQSxDQUFDQSxDQUFDQTtJQUN2REEsQ0FBQ0E7O0lBR0RyQixtQ0FBV0EsR0FBWEEsVUFBYUEsTUFBTUEsRUFBRUEsS0FBS0EsRUFBRUEsU0FBU0E7UUFDakNzQixJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUNoQkEsTUFBTUEsQ0FBQ0EsY0FBY0EsRUFBRUEsQ0FBQ0E7UUFDeEJBLElBQUlBLENBQUNBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBO1FBQzNCQSxJQUFJQSxDQUFDQSxVQUFVQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUN4QkEsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsbUNBQW1DQSxFQUFFQTtZQUNwRUEsS0FBS0EsRUFBRUEsSUFBSUEsQ0FBQ0EsTUFBTUE7U0FDckJBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFVBQVNBLE9BQU9BO1lBQ3BCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDO1lBQzVCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25DLENBQUMsQ0FBQ0EsQ0FBQ0E7SUFDUEEsQ0FBQ0E7SUFFRHRCLHlDQUFpQkEsR0FBakJBLFVBQW1CQSxNQUFNQSxFQUFDQSxLQUFLQSxFQUFDQSxTQUFTQTtRQUNyQ3VCLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBO1FBQ2hCQSxJQUFJQSxDQUFDQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQTtRQUMzQkEsSUFBSUEsQ0FBQ0EsVUFBVUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDeEJBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLGVBQWVBLENBQUNBLDBDQUEwQ0EsRUFBRUE7WUFDM0VBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BO1NBQ3JCQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFTQSxPQUFPQTtZQUNwQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztZQUN6QixJQUFJLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQztZQUM1QixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuQyxDQUFDLENBQUNBLENBQUNBO0lBQ1BBLENBQUNBO0lBRUR2QixpREFBeUJBLEdBQXpCQTtRQUNJd0IsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDaEJBLElBQUlBLE9BQU9BLEdBQUdBO1lBQ1ZBLFVBQVVBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBO1lBQ2xDQSxnQkFBZ0JBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUNBLEdBQUdBO1lBQ25EQSxNQUFNQSxFQUFFQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQTtZQUM1QkEsT0FBT0EsRUFBRUEsRUFBRUE7WUFDWEEsT0FBT0EsRUFBRUEsRUFBRUE7WUFDWEEsWUFBWUEsRUFBRUEsR0FBR0E7U0FDcEJBLENBQUNBO1FBRUZBLElBQUlBLENBQUNBLGdCQUFnQkEsRUFBRUEsQ0FBQ0E7UUFFeEJBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLHdCQUF3QkEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7YUFDaERBLElBQUlBLENBQUNBLFVBQVNBLElBQUlBO1lBQ2Ysb0NBQW9DO1lBQ3BDLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1lBQ2pDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLDJCQUEyQixFQUFFLFVBQVMsR0FBUSxFQUFFLENBQVM7Z0JBQ3ZFLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1QyxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLDJCQUEyQixFQUFFLFVBQVMsQ0FBTTtnQkFDMUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQzVDLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxzQkFBc0IsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxVQUFTLENBQU07Z0JBQzdELEVBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQztvQkFBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsSUFBSSxHQUFHLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsMkJBQTJCLEdBQUcsT0FBTyxDQUFDLDJCQUEyQixDQUFDO1lBQ3ZFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQzVCLENBQUMsRUFBRUEsVUFBU0EsS0FBS0E7WUFDYixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFCLENBQUMsQ0FBQ0EsQ0FBQ0E7SUFDUEEsQ0FBQ0E7SUFFRHhCLDBDQUFrQkEsR0FBbEJBLFVBQW1CQSxJQUFtQkE7UUFDbEN5QixNQUFNQSxDQUFDQSxVQUFTQSxJQUFTQTtZQUNyQixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQztRQUN0RCxDQUFDLENBQUFBO0lBQ0xBLENBQUNBO0lBRUR6QiwyQ0FBbUJBLEdBQW5CQSxVQUFvQkEsSUFBbUJBO1FBQ3BDMEIsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7UUFDakJBLE1BQU1BLENBQUNBLFVBQVNBLElBQVNBO1lBQ3BCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUM7UUFDbkcsQ0FBQyxDQUFBQTtJQUVIQSxDQUFDQTtJQUVEMUIsNkNBQXFCQSxHQUFyQkEsVUFBc0JBLElBQVNBO1FBQzNCMkIsSUFBSUEsYUFBYUEsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0E7UUFDeERBLHlDQUF5Q0E7UUFDekNBLEVBQUVBLENBQUFBLENBQUVBLElBQUlBLENBQUNBLGFBQWFBLElBQUlBLGFBQWFBLENBQUNBLENBQUNBLENBQUNBO1lBQ3RDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtRQUNoQkEsQ0FBQ0E7UUFDREEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7SUFDakJBLENBQUNBO0lBRUQzQix5Q0FBaUJBLEdBQWpCQTtRQUNJNEIsSUFBSUEsQ0FBQ0Esa0JBQWtCQSxFQUFFQSxDQUFDQTtRQUMxQkEsSUFBSUEsQ0FBQ0Esa0JBQWtCQSxFQUFFQSxDQUFDQTtRQUMxQkEsSUFBSUEsQ0FBQ0EsbUJBQW1CQSxFQUFFQSxDQUFDQTtJQUMvQkEsQ0FBQ0E7SUFFRDVCLHdDQUFnQkEsR0FBaEJBO1FBQ0k2QixJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUNwQkEsUUFBUUEsRUFBRUEsa0RBQWtEQTtTQUMvREEsQ0FBQ0EsQ0FBQ0E7SUFDUEEsQ0FBQ0E7O0lBRUQ3Qix3Q0FBZ0JBLEdBQWhCQTtRQUNJOEIsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7SUFDOUJBLENBQUNBOztJQUVEOUIsNENBQW9CQSxHQUFwQkEsVUFBcUJBLE1BQU1BLEVBQUNBLFVBQVVBLEVBQUNBLFlBQVlBO1FBQy9DK0IsSUFBSUEsQ0FBQ0EsU0FBU0EsR0FBR0EsT0FBT0EsQ0FBQ0E7UUFDekJBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBQy9CQSxJQUFJQSxDQUFDQSxTQUFTQSxHQUFHQSxDQUFDQSxlQUFlQSxFQUFFQSxjQUFjQSxFQUFFQSxjQUFjQSxFQUFFQSxnQkFBZ0JBLENBQUNBLENBQUNBO1FBQ3JGQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUNuQ0EsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsVUFBVUEsRUFBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7SUFDaERBLENBQUNBOztJQUVEL0IscUNBQWFBLEdBQWJBO1FBQ0lnQyxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtJQUM3QkEsQ0FBQ0E7O0lBRURoQywwQ0FBa0JBLEdBQWxCQSxVQUFtQkEsS0FBS0EsRUFBQ0EsR0FBR0E7UUFDeEJpQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxHQUFHQSxDQUFDQTtJQUM1Q0EsQ0FBQ0E7SUFDRGpDLHFDQUFhQSxHQUFiQSxVQUFlQSxLQUFLQSxFQUFDQSxHQUFHQTtRQUNwQmtDLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsVUFBVUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7UUFDdkhBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLFVBQVVBLElBQUlBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO1lBQ3ZCQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtZQUNyQkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDakVBLENBQUNBO1FBQ0RBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQzVCQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtJQUMzQkEsQ0FBQ0E7SUFDRGxDLGtDQUFVQSxHQUFWQSxVQUFZQSxLQUFLQTtRQUNibUMsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsV0FBV0EsR0FBR0EsSUFBSUEsQ0FBQ0EsbUJBQW1CQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxFQUFFQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFFQSxDQUFDQTtJQUNqSEEsQ0FBQ0E7O0lBRURuQywrQkFBT0EsR0FBUEEsVUFBU0EsS0FBS0E7UUFDVm9DLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO0lBQ3JDQSxDQUFDQTs7SUFDRHBDLGdDQUFRQSxHQUFSQSxVQUFTQSxLQUFLQTtRQUNWcUMsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsV0FBV0EsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7SUFDeEVBLENBQUNBOztJQUNEckMsZ0NBQVFBLEdBQVJBLFVBQVNBLEtBQUtBO1FBQ1ZzQyxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtJQUNoQ0EsQ0FBQ0E7SUFDRHRDLDRCQUFJQSxHQUFKQSxVQUFLQSxNQUFNQSxFQUFDQSxLQUFLQSxFQUFDQSxLQUFLQTtRQUNuQnVDLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO1FBQ3JCQSxJQUFJQSxDQUFDQSxhQUFhQSxHQUFHQSxNQUFNQSxDQUFDQTtRQUM1QkEsNEJBQTRCQTtRQUM1QkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsSUFBSUEsQ0FBQ0EsYUFBYUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7UUFDOUdBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO0lBQzNCQSxDQUFDQTs7SUFDRHZDLDZCQUFLQSxHQUFMQSxVQUFNQSxLQUFLQSxFQUFFQSxLQUFLQTtRQUNkd0MsSUFBSUEsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0E7UUFDYkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDVEEsS0FBS0EsR0FBR0EsS0FBS0EsQ0FBQ0E7WUFDZEEsS0FBS0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDZEEsQ0FBQ0E7UUFDREEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsS0FBS0EsRUFBRUEsQ0FBQ0EsR0FBR0EsS0FBS0EsRUFBRUEsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0E7WUFDakNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1FBQ2hCQSxDQUFDQTtRQUNEQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQTtJQUNmQSxDQUFDQTtJQUVEeEMsbUNBQVdBLEdBQVhBLFVBQWFBLEtBQUtBO1FBQ2R5QyxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMzQkEsSUFBSUEsQ0FBQ0EsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDM0JBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ0pBLElBQUlBLENBQUNBLFVBQVVBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzVCQSxDQUFDQTtJQUNMQSxDQUFDQTtJQUNEekMs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QUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNoQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBR0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzVNQSxJQUFJQSxDQUFDQSxjQUFjQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUM1QkEsQ0FBQ0E7WUFDREEsMkVBQTJFQTtZQUMzRUEsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsRUFBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FDdkRBLFVBQUNBLE1BQU1BO2dCQUNOQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxJQUFJQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDekNBLEtBQUlBLENBQUNBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO2dCQUNqQ0EsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNQQSxLQUFJQSxDQUFDQSxjQUFjQSxHQUFHQSxJQUFJQSxDQUFDQTtvQkFDM0JBLEtBQUlBLENBQUNBLFlBQVlBLEdBQUdBLCtCQUErQkEsQ0FBQ0E7Z0JBQ3JEQSxDQUFDQTtZQUNGQSxDQUFDQSxFQUNEQSxVQUFDQSxLQUFLQTtnQkFDTEEsS0FBSUEsQ0FBQ0EsY0FBY0EsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQzNCQSxLQUFJQSxDQUFDQSxZQUFZQSxHQUFHQSxzQ0FBc0NBLENBQUNBO1lBQzVEQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNMQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxJQUFJQSxDQUFDQSxjQUFjQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUMzQkEsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsK0JBQStCQSxDQUFDQTtRQUNyREEsQ0FBQ0E7SUFDRkEsQ0FBQ0E7SUEzQ2FKLHVCQUFPQSxHQUFHQSxDQUFDQSxRQUFRQSxFQUFFQSxRQUFRQSxFQUFFQSxhQUFhQSxDQUFDQSxDQUFDQTtJQTRDN0RBLHNCQUFDQTtBQUFEQSxDQTdDQSxBQTZDQ0EsSUFBQTs7QUMvQ0QsbUNBQW1DO0FBRW5DLHNEQUFzRDtBQUV0RCw0REFBNEQ7QUFDNUQsaUVBQWlFO0FBQ2pFLDJEQUEyRDtBQUMzRCxnRUFBZ0U7QUFDaEUsK0RBQStEO0FBQy9ELHVFQUF1RTtBQUN2RSx3RUFBd0U7QUFDeEUsK0VBQStFO0FBQy9FLGlFQUFpRTtBQUNqRSx5REFBeUQ7QUFDekQsb0ZBQW9GO0FBQ3BGLDREQUE0RDtBQUU1RCxJQUFJLFVBQVUsR0FBRyxpREFBaUQsQ0FBQztBQUNuRSxPQUFPLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FFcEYsR0FBRyxDQUFDLFVBQUMsY0FBK0IsRUFBRSxLQUFLO0lBQzNDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO0lBQzVDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxrQkFBa0IsQ0FBQztJQUNuRSxjQUFjLENBQUMsS0FBSyxDQUFDO1FBQ3BCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sU0FBUyxDQUFDLGFBQWEsS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ3JELENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQztLQUNGLE1BQU0sQ0FBQyxVQUFDLGNBQXlDLEVBQUUsa0JBQWlELEVBQ3BHLG9CQUEyQztJQUMzQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFbkQsY0FBYyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUU7UUFDM0IsR0FBRyxFQUFFLE1BQU07UUFDWCxRQUFRLEVBQUUsSUFBSTtRQUNkLFdBQVcsRUFBRSxnQ0FBZ0M7UUFDN0MsVUFBVSxFQUFFLDBCQUEwQjtLQUN0QyxDQUFDO1NBQ0QsS0FBSyxDQUFDLE9BQU8sRUFBRTtRQUNmLEdBQUcsRUFBRSxRQUFRO1FBQ2IsV0FBVyxFQUFFLDRCQUE0QjtRQUN6QyxVQUFVLEVBQUUsOEJBQThCO0tBQzFDLENBQUM7U0FDRCxLQUFLLENBQUMsZUFBZSxFQUFFO1FBQ3ZCLEdBQUcsRUFBRSxZQUFZO1FBQ2pCLEtBQUssRUFBRTtZQUNOLGFBQWEsRUFBRTtnQkFDZCxXQUFXLEVBQUUsMkJBQTJCO2dCQUN4QyxVQUFVLEVBQUUsMEJBQTBCO2FBQ3RDO1NBQ0Q7S0FDRCxDQUFDO1NBQ0QsS0FBSyxDQUFDLHVCQUF1QixFQUFFO1FBQy9CLEdBQUcsRUFBRSxvQkFBb0I7UUFDekIsS0FBSyxFQUFFO1lBQ04sYUFBYSxFQUFFO2dCQUNkLFdBQVcsRUFBRSx5Q0FBeUM7Z0JBQ3RELFVBQVUsRUFBRSx1Q0FBdUM7YUFDbkQ7U0FDRDtLQUNELENBQUMsQ0FBQztJQUVILGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUM7S0FFRCxPQUFPLENBQUMscUJBQXFCLEVBQUUsbUJBQW1CLENBQUM7S0FDbkQsT0FBTyxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUM7S0FDakMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLG1CQUFtQixDQUFDO0tBQ25ELE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLENBQUM7S0FDekMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGNBQWMsQ0FBQztLQUN6QyxPQUFPLENBQUMscUJBQXFCLEVBQUUsbUJBQW1CLENBQUM7S0FDbkQsT0FBTyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUM7S0FFbkMsT0FBTyxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUM7S0FDakMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLGtCQUFrQixDQUFDO0tBQ2pELE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxtQkFBbUIsQ0FBQztLQUNuRCxPQUFPLENBQUMsb0JBQW9CLEVBQUUsa0JBQWtCLENBQUM7S0FFakQsVUFBVSxDQUFDLGVBQWUsRUFBRSxhQUFhLENBQUM7S0FDMUMsVUFBVSxDQUFDLGVBQWUsRUFBRSxhQUFhLENBQUM7S0FDMUMsVUFBVSxDQUFDLDRCQUE0QixFQUFFLDBCQUEwQixDQUFDO0tBQ3BFLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxlQUFlLENBQUMsQ0FBQTtBQUUvQywrQ0FBK0M7QUFHL0MsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7SUFDcEIsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFDRCxvQ0FBb0M7SUFDcEMsc0RBQXNEO0lBQ3RELG9DQUFvQztJQUNwQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ1AsZ0RBQWdEO0lBQ2pELENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7O0FDL0ZIO0FBQ0E7QUNEQSxDQUFDO0lBQ0MsWUFBWSxDQUFDO0lBQ2IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUM7U0FDNUIsU0FBUyxDQUFDLGVBQWUsRUFBRTtRQUMxQixJQUFJLHlCQUF5QixHQUFHO1lBQzlCLFFBQVEsRUFBRSxHQUFHO1lBQ2IsT0FBTyxFQUFFLEtBQUs7WUFDZCxLQUFLLEVBQUUsRUFBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUM7WUFDeEQsSUFBSSxFQUFFLFVBQVUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLO2dCQUNuQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRTtxQkFDZCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFVBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUNuRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFMUIsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQ3JCLFNBQVMsQ0FBQywrQkFBK0IsQ0FBQztxQkFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7cUJBQ2hCLEtBQUssRUFBRTtxQkFDUCxNQUFNLENBQUMsS0FBSyxDQUFDO3FCQUNiLE9BQU8sQ0FBQyw4QkFBOEIsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFFNUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsNEJBQTRCLEVBQUUsSUFBSSxDQUFDO3FCQUN6RCxJQUFJLENBQUMsVUFBUyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFNUMsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsNEJBQTRCLEVBQUUsSUFBSSxDQUFDO3FCQUN6RCxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLGtDQUFrQyxFQUFFLElBQUksQ0FBQztxQkFDL0QsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFFdkYsVUFBVTtxQkFDRixLQUFLLENBQUMsa0JBQWtCLEVBQUUsVUFBUyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUEsQ0FBQyxDQUFDLENBQUM7cUJBQ3pELFVBQVUsRUFBRTtxQkFDWixRQUFRLENBQUMsSUFBSSxDQUFDO3FCQUNkLEtBQUssQ0FBQyxXQUFXLEVBQUUsVUFBUyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFeEUsSUFBSSxVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0NBQWdDLEVBQUUsSUFBSSxDQUFDO3FCQUM5RCxJQUFJLENBQUMsVUFBUyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEYsRUFBRSxDQUFBLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxNQUFNLENBQUM7b0JBQUMsTUFBTSxDQUFDO2dCQUN4QyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztxQkFDaEIsT0FBTyxDQUFDLDZFQUE2RSxFQUFFLElBQUksQ0FBQztxQkFDNUYsT0FBTyxDQUFDLE1BQU0sRUFBRSxVQUFTLENBQUM7b0JBQ3pCLEVBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQzt3QkFBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxHQUFHLENBQUM7Z0JBQ2xDLENBQUMsQ0FBQyxDQUFDO2dCQUMzQixJQUFJLGNBQWMsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztxQkFDYixPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQztxQkFDeEIsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbkQsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLElBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDL0QsSUFBSSxLQUFLLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDM0MsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDL0IsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2xDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUVuQyxJQUFJLEVBQUUsR0FBSSxLQUFLO3FCQUNGLE1BQU0sQ0FBQyxPQUFPLENBQUM7cUJBQ2YsU0FBUyxDQUFDLElBQUksQ0FBQztxQkFDZixJQUFJLENBQUMsVUFBUyxDQUFDLElBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQSxDQUFBLENBQUMsQ0FBQztxQkFDNUMsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUVsQyxJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztxQkFDbkIsSUFBSSxDQUFDLFVBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRWpELElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO3FCQUNwQixJQUFJLENBQUMsVUFBUyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFbEQsVUFBVSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUU7b0JBQ3JCLCtCQUErQjtvQkFDckMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQztvQkFDdkQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO29CQUMvRixPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUM7b0JBQzlGLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQzVGLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBRW5GLEVBQUUsQ0FBQSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDakQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzt3QkFDcEQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQzt3QkFDbkQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQ2pELE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNoRCxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNOLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUM7d0JBQ3RELE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUM7d0JBQ2pELE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO3dCQUNqRCxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDaEQsQ0FBQztvQkFDUCxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2dCQUdoRCxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7U0FDRixDQUFDO1FBQ0YsTUFBTSxDQUFDLHlCQUF5QixDQUFDO0lBQ25DLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLEVBQUUsQ0FBQzs7QUN6RkwsQ0FBQztJQUNDLFlBQVksQ0FBQztJQUNiLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDO1NBQzVCLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRTtRQUNqQyxJQUFJLFlBQVksR0FBRztZQUNqQixRQUFRLEVBQUUsR0FBRztZQUNiLE9BQU8sRUFBRSxLQUFLO1lBQ2QsS0FBSyxFQUFFLEVBQUMsSUFBSSxFQUFFLFlBQVksRUFBQztZQUMzQixJQUFJLEVBQUUsVUFBVSxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUs7Z0JBQ25DLDJCQUEyQjtnQkFDM0IsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBUyxRQUFRLEVBQUUsUUFBUTtvQkFDOUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQzt3QkFDYixxQ0FBcUM7d0JBQ3JDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFOzZCQUNkLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsVUFBUyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzZCQUMvRCxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFFMUIsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7NkJBQ3JCLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQzs2QkFDdkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7NkJBQ2hCLEtBQUssRUFBRTs2QkFDUCxNQUFNLENBQUMsS0FBSyxDQUFDOzZCQUNiLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFFekQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDOzZCQUN0RCxJQUFJLENBQUMsVUFBUyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFFNUMsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDOzZCQUN0RCxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQzs2QkFDNUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsRUFBRSxJQUFJLENBQUM7NkJBQzFELE9BQU8sQ0FBQyw2QkFBNkIsRUFBRSxJQUFJLENBQUM7NkJBQzVDLElBQUksQ0FBQyxVQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUUvRCxVQUFVOzZCQUNGLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxVQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQSxDQUFDLENBQUMsQ0FBQzs2QkFDekQsVUFBVSxFQUFFOzZCQUNaLFFBQVEsQ0FBQyxJQUFJLENBQUM7NkJBQ2QsS0FBSyxDQUFDLFdBQVcsRUFBRSxVQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFFdEUsQ0FBQztnQkFDSCxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDWCxDQUFDO1NBQ0YsQ0FBQztRQUNGLE1BQU0sQ0FBQyxZQUFZLENBQUM7SUFDdEIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsRUFBRSxDQUFDOztBQzdDTCxDQUFDO0lBQ0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsVUFBVSxtQkFBbUIsRUFBRSxFQUFFO1FBQzNGLE1BQU0sQ0FBQztZQUNOLFFBQVEsRUFBRSxVQUFVLFFBQVEsRUFBQyxRQUFRLEVBQUMsS0FBSyxFQUFFLFNBQVM7Z0JBQ3BELE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFDdEIsVUFBVSxDQUFDO29CQUNULGlDQUFpQztvQkFDakMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDbkQsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDO1lBQ0QsS0FBSyxFQUFFLFVBQVUsUUFBUSxFQUFDLFFBQVE7Z0JBQ2hDLE1BQU0sR0FBRyxFQUFFLENBQUM7Z0JBQ1osRUFBRSxDQUFBLENBQUMsUUFBUSxDQUFDLENBQUEsQ0FBQztvQkFDYixHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO3dCQUN6QyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ25ELENBQUM7d0JBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ04sTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNyRCxDQUFDO29CQUNILENBQUM7Z0JBQ0gsQ0FBQztnQkFDQyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2hCLENBQUM7U0FDRixDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsRUFBRSxDQUFDO0FBRUwsb0JBQW9CLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFNBQVM7SUFDaERsRixpQ0FBaUNBO0lBQ25DQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUN4QkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDcERBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ3BLQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN6Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDOUZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDMUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQy9GQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUNEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUN0QkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDaENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFD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VSxDQUFDO1lBQ3RCLENBQUM7U0FFRCxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsRUFBRSxDQUFDIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9pb25pYy5kLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9TY3JlZW4uZC50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvSXNUYWJsZXQuZC50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvSW5BcHBCcm93c2VyLmQudHNcIiAvPiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5jbGFzcyBVdGlscyB7XHJcblx0cHVibGljIHN0YXRpYyBpc05vdEVtcHR5KC4uLnZhbHVlczogT2JqZWN0W10pOiBib29sZWFuIHtcclxuXHRcdHZhciBpc05vdEVtcHR5ID0gdHJ1ZTtcclxuXHRcdF8uZm9yRWFjaCh2YWx1ZXMsICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRpc05vdEVtcHR5ID0gaXNOb3RFbXB0eSAmJiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpICYmIHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSAnJ1xyXG5cdFx0XHRcdCYmICEoKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc09iamVjdCh2YWx1ZSkpICYmIF8uaXNFbXB0eSh2YWx1ZSkpICYmIHZhbHVlICE9IDApO1xyXG5cdFx0fSk7XHJcblx0XHRyZXR1cm4gaXNOb3RFbXB0eTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgaXNMYW5kc2NhcGUoKTogYm9vbGVhbiB7XHJcblx0XHR2YXIgaXNMYW5kc2NhcGU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRcdGlmICh3aW5kb3cgJiYgd2luZG93LnNjcmVlbiAmJiB3aW5kb3cuc2NyZWVuLm9yaWVudGF0aW9uKSB7XHJcblx0XHRcdHZhciB0eXBlOiBzdHJpbmcgPSA8c3RyaW5nPihfLmlzU3RyaW5nKHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24pID8gd2luZG93LnNjcmVlbi5vcmllbnRhdGlvbiA6IHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24udHlwZSk7XHJcblx0XHRcdGlmICh0eXBlKSB7XHJcblx0XHRcdFx0aXNMYW5kc2NhcGUgPSB0eXBlLmluZGV4T2YoJ2xhbmRzY2FwZScpID49IDA7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBpc0xhbmRzY2FwZTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgZ2V0VG9kYXlEYXRlKCk6IERhdGUge1xyXG5cdFx0dmFyIHRvZGF5RGF0ZSA9IG5ldyBEYXRlKCk7XHJcblx0XHR0b2RheURhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblx0XHRyZXR1cm4gdG9kYXlEYXRlO1xyXG5cdH1cclxuXHRwcml2YXRlIHN0YXRpYyBpc0ludGVnZXIobnVtYmVyOiBCaWdKc0xpYnJhcnkuQmlnSlMpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBwYXJzZUludChudW1iZXIudG9TdHJpbmcoKSkgPT0gK251bWJlcjtcclxuXHR9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuaW50ZXJmYWNlIFBvaW50T2JqZWN0IHtcclxuXHRjb2RlOiBzdHJpbmcsXHJcblx0ZGVzY3JpcHRpb246IHN0cmluZ1xyXG59XHJcblxyXG5pbnRlcmZhY2UgSUxvY2FsU3RvcmFnZVNlcnZpY2Uge1xyXG5cdHNldChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogc3RyaW5nKTogdm9pZDtcclxuXHRnZXQoa2V5SWQ6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBzdHJpbmcpOiBzdHJpbmc7XHJcblx0c2V0T2JqZWN0KGtleUlkOiBzdHJpbmcsIGtleXZhbHVlOiBhbnlbXSk6IHZvaWQ7XHJcblx0Z2V0T2JqZWN0KGtleUlkOiBzdHJpbmcpOiBhbnk7XHJcblx0aXNSZWNlbnRFbnRyeUF2YWlsYWJsZShvcmdpbk9iamVjdDogUG9pbnRPYmplY3QsIHR5cGU6IHN0cmluZyk6IHZvaWQ7XHJcblx0YWRkUmVjZW50RW50cnkoZGF0YTogYW55LCB0eXBlOiBzdHJpbmcpOiB2b2lkO1xyXG59XHJcblxyXG5jbGFzcyBMb2NhbFN0b3JhZ2VTZXJ2aWNlIGltcGxlbWVudHMgSUxvY2FsU3RvcmFnZVNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyR3aW5kb3cnXTtcclxuXHRwcml2YXRlIHJlY2VudEVudHJpZXM6IFtQb2ludE9iamVjdF07XHJcblxyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcclxuXHR9XHJcblxyXG5cdHNldChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogc3RyaW5nKTogdm9pZCB7XHJcblx0XHR0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSA9IGtleXZhbHVlO1xyXG5cdH1cclxuXHRnZXQoa2V5SWQ6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdIHx8IGRlZmF1bHRWYWx1ZTtcclxuXHR9XHJcblx0c2V0T2JqZWN0KGtleUlkOiBzdHJpbmcsIGtleXZhbHVlOiBhbnlbXSk6IHZvaWQge1xyXG5cdFx0dGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gPSAgSlNPTi5zdHJpbmdpZnkoa2V5dmFsdWUpO1xyXG5cdH1cclxuXHRnZXRPYmplY3Qoa2V5SWQ6IHN0cmluZyk6IGFueSB7XHJcblx0XHRyZXR1cm4gdGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gPyBKU09OLnBhcnNlKHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdKSA6IHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdGlzUmVjZW50RW50cnlBdmFpbGFibGUob3JnaW5PYmplY3Q6IFBvaW50T2JqZWN0LCB0eXBlOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMucmVjZW50RW50cmllcyA9IHRoaXMuZ2V0T2JqZWN0KHR5cGUpID8gdGhpcy5nZXRPYmplY3QodHlwZSkgOiBbXTtcclxuXHRcdHJldHVybiB0aGlzLnJlY2VudEVudHJpZXMuZmlsdGVyKGZ1bmN0aW9uIChlbnRyeSkgeyByZXR1cm4gZW50cnkuY29kZSA9PT0gb3JnaW5PYmplY3QuY29kZSB9KTtcclxuXHR9XHJcblxyXG5cdGFkZFJlY2VudEVudHJ5KGRhdGE6IGFueSwgdHlwZTogc3RyaW5nKSB7XHJcblx0XHR2YXIgb3JnaW5PYmplY3Q6IFBvaW50T2JqZWN0XHQ9XHRkYXRhID8gZGF0YS5vcmlnaW5hbE9iamVjdCA6IHVuZGVmaW5lZDtcclxuXHJcblx0XHRpZiAob3JnaW5PYmplY3QpIHtcclxuXHRcdFx0aWYgKHRoaXMuaXNSZWNlbnRFbnRyeUF2YWlsYWJsZShvcmdpbk9iamVjdCwgdHlwZSkubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0dGhpcy5yZWNlbnRFbnRyaWVzID0gdGhpcy5nZXRPYmplY3QodHlwZSkgPyB0aGlzLmdldE9iamVjdCh0eXBlKSA6IFtdO1xyXG5cdFx0XHRcdCh0aGlzLnJlY2VudEVudHJpZXMubGVuZ3RoID09IDMpID8gdGhpcy5yZWNlbnRFbnRyaWVzLnBvcCgpIDogdGhpcy5yZWNlbnRFbnRyaWVzO1xyXG5cdFx0XHRcdHRoaXMucmVjZW50RW50cmllcy51bnNoaWZ0KG9yZ2luT2JqZWN0KTtcclxuXHRcdFx0XHR0aGlzLnNldE9iamVjdCh0eXBlLCB0aGlzLnJlY2VudEVudHJpZXMpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5pbnRlcmZhY2UgSUNvcmRvdmFDYWxsIHtcclxuXHQoKTogdm9pZDtcclxufVxyXG5cclxuY2xhc3MgQ29yZG92YVNlcnZpY2Uge1xyXG5cclxuXHRwcml2YXRlIGNvcmRvdmFSZWFkeTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHByaXZhdGUgcGVuZGluZ0NhbGxzOiBJQ29yZG92YUNhbGxbXSA9IFtdO1xyXG5cclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZXJlYWR5JywgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmNvcmRvdmFSZWFkeSA9IHRydWU7XHJcblx0XHRcdHRoaXMuZXhlY3V0ZVBlbmRpbmcoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0ZXhlYyhmbjogSUNvcmRvdmFDYWxsLCBhbHRlcm5hdGl2ZUZuPzogSUNvcmRvdmFDYWxsKSB7XHJcblx0XHRpZiAodGhpcy5jb3Jkb3ZhUmVhZHkpIHtcclxuXHRcdFx0Zm4oKTtcclxuXHRcdH0gZWxzZSBpZiAoIWFsdGVybmF0aXZlRm4pIHtcclxuXHRcdFx0dGhpcy5wZW5kaW5nQ2FsbHMucHVzaChmbik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRhbHRlcm5hdGl2ZUZuKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGV4ZWN1dGVQZW5kaW5nKCkge1xyXG5cdFx0dGhpcy5wZW5kaW5nQ2FsbHMuZm9yRWFjaCgoZm4pID0+IHtcclxuXHRcdFx0Zm4oKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucGVuZGluZ0NhbGxzID0gW107XHJcblx0fVxyXG5cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi90eXBpbmdzL2FuZ3VsYXJqcy9hbmd1bGFyLmQudHNcIi8+XHJcblxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxyXG5cclxuaW50ZXJmYWNlIElOZXRTZXJ2aWNlIHtcclxuXHRnZXREYXRhKGZyb21Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xyXG5cdHBvc3REYXRhKHRvVXJsOiBzdHJpbmcsIGRhdGE6IGFueSk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xyXG5cdGRlbGV0ZURhdGEodG9Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xyXG5cdGNoZWNrU2VydmVyQXZhaWxhYmlsaXR5KCk6IG5nLklQcm9taXNlPGJvb2xlYW4+O1xyXG59XHJcblxyXG5jbGFzcyBOZXRTZXJ2aWNlIGltcGxlbWVudHMgSU5ldFNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRodHRwJywgJ0NvcmRvdmFTZXJ2aWNlJywgJyRxJywgJ1VSTF9XUycsICdPV05FUl9DQVJSSUVSX0NPREUnXTtcclxuXHRwcml2YXRlIGZpbGVUcmFuc2ZlcjogRmlsZVRyYW5zZmVyO1xyXG5cdHByaXZhdGUgaXNTZXJ2ZXJBdmFpbGFibGU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkaHR0cDogbmcuSUh0dHBTZXJ2aWNlLCBwcml2YXRlIGNvcmRvdmFTZXJ2aWNlOiBDb3Jkb3ZhU2VydmljZSwgcHJvdGVjdGVkICRxOiBuZy5JUVNlcnZpY2UsIHB1YmxpYyBVUkxfV1M6IHN0cmluZywgcHJpdmF0ZSBPV05FUl9DQVJSSUVSX0NPREU6IHN0cmluZykge1xyXG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy50aW1lb3V0ID0gNjAwMDA7XHJcblx0XHRjb3Jkb3ZhU2VydmljZS5leGVjKCgpID0+IHtcclxuXHRcdFx0dGhpcy5maWxlVHJhbnNmZXIgPSBuZXcgRmlsZVRyYW5zZmVyKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGdldERhdGEoZnJvbVVybDogc3RyaW5nKTogbmcuSUh0dHBQcm9taXNlPGFueT4ge1xyXG5cdFx0dmFyIHVybDogc3RyaW5nID0gdGhpcy5VUkxfV1MgKyBmcm9tVXJsO1xyXG5cdFx0cmV0dXJuIHRoaXMuJGh0dHAuZ2V0KHVybCk7XHJcblx0fVxyXG5cclxuXHRwb3N0RGF0YSh0b1VybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IG5nLklSZXF1ZXN0U2hvcnRjdXRDb25maWcpOiBuZy5JSHR0cFByb21pc2U8YW55PiB7XHJcblx0XHRyZXR1cm4gdGhpcy4kaHR0cC5wb3N0KHRoaXMuVVJMX1dTICsgdG9VcmwsIHRoaXMuYWRkTWV0YUluZm8oZGF0YSksIGNvbmZpZyk7XHJcblx0fVxyXG5cclxuXHRkZWxldGVEYXRhKHRvVXJsOiBzdHJpbmcpOiBuZy5JSHR0cFByb21pc2U8YW55PiB7XHJcblx0XHRyZXR1cm4gdGhpcy4kaHR0cC5kZWxldGUodGhpcy5VUkxfV1MgKyB0b1VybCk7XHJcblx0fVxyXG5cclxuXHR1cGxvYWRGaWxlKFxyXG5cdFx0dG9Vcmw6IHN0cmluZywgdXJsRmlsZTogc3RyaW5nLFxyXG5cdFx0b3B0aW9uczogRmlsZVVwbG9hZE9wdGlvbnMsIHN1Y2Nlc3NDYWxsYmFjazogKHJlc3VsdDogRmlsZVVwbG9hZFJlc3VsdCkgPT4gdm9pZCxcclxuXHRcdGVycm9yQ2FsbGJhY2s6IChlcnJvcjogRmlsZVRyYW5zZmVyRXJyb3IpID0+IHZvaWQsIHByb2dyZXNzQ2FsbGJhY2s/OiAocHJvZ3Jlc3NFdmVudDogUHJvZ3Jlc3NFdmVudCkgPT4gdm9pZCkge1xyXG5cdFx0aWYgKCF0aGlzLmZpbGVUcmFuc2Zlcikge1xyXG5cdFx0XHR0aGlzLmZpbGVUcmFuc2ZlciA9IG5ldyBGaWxlVHJhbnNmZXIoKTtcclxuXHRcdH1cclxuXHRcdGNvbnNvbGUubG9nKG9wdGlvbnMucGFyYW1zKTtcclxuXHRcdHRoaXMuZmlsZVRyYW5zZmVyLm9ucHJvZ3Jlc3MgPSBwcm9ncmVzc0NhbGxiYWNrO1xyXG5cdFx0dmFyIHVybDogc3RyaW5nID0gdGhpcy5VUkxfV1MgKyB0b1VybDtcclxuXHRcdHRoaXMuZmlsZVRyYW5zZmVyLnVwbG9hZCh1cmxGaWxlLCB1cmwsIHN1Y2Nlc3NDYWxsYmFjaywgZXJyb3JDYWxsYmFjaywgb3B0aW9ucyk7XHJcblx0fVxyXG5cclxuXHRjaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpOiBuZy5JUHJvbWlzZTxib29sZWFuPiB7XHJcblx0XHR2YXIgYXZhaWxhYmlsaXR5OiBib29sZWFuID0gdHJ1ZTtcclxuXHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8Ym9vbGVhbj4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblxyXG5cdFx0dGhpcy5jb3Jkb3ZhU2VydmljZS5leGVjKCgpID0+IHtcclxuXHRcdFx0aWYgKHdpbmRvdy5uYXZpZ2F0b3IpIHsgLy8gb24gZGV2aWNlXHJcblx0XHRcdFx0dmFyIG5hdmlnYXRvcjogTmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcclxuXHRcdFx0XHRpZiAobmF2aWdhdG9yLmNvbm5lY3Rpb24gJiYgKChuYXZpZ2F0b3IuY29ubmVjdGlvbi50eXBlID09IENvbm5lY3Rpb24uTk9ORSkgfHwgKG5hdmlnYXRvci5jb25uZWN0aW9uLnR5cGUgPT0gQ29ubmVjdGlvbi5VTktOT1dOKSkpIHtcclxuXHRcdFx0XHRcdGF2YWlsYWJpbGl0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRkZWYucmVzb2x2ZShhdmFpbGFiaWxpdHkpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0c2VydmVySXNBdmFpbGFibGUoKTogYm9vbGVhbiB7XHJcblx0XHR2YXIgdGhhdDogTmV0U2VydmljZSA9IHRoaXM7XHJcblxyXG5cdFx0dmFyIHNlcnZlcklzQXZhaWxhYmxlID0gdGhpcy5jaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpLnRoZW4oKHJlc3VsdDogYm9vbGVhbikgPT4ge1xyXG5cdFx0XHR0aGF0LmlzU2VydmVyQXZhaWxhYmxlID0gcmVzdWx0O1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuaXNTZXJ2ZXJBdmFpbGFibGU7XHJcblx0fVxyXG5cclxuXHRjYW5jZWxBbGxVcGxvYWREb3dubG9hZCgpIHtcclxuXHRcdGlmICh0aGlzLmZpbGVUcmFuc2Zlcikge1xyXG5cdFx0XHR0aGlzLmZpbGVUcmFuc2Zlci5hYm9ydCgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0YWRkTWV0YUluZm8ocmVxdWVzdERhdGE6IGFueSk6IGFueSB7XHJcblx0XHR2YXIgZGV2aWNlOiBJb25pYy5JRGV2aWNlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKClcclxuXHRcdHZhciBtb2RlbDogc3RyaW5nID0gJyc7XHJcblx0XHR2YXIgb3NUeXBlOiBzdHJpbmcgPSAnJztcclxuXHRcdHZhciBvc1ZlcnNpb246IHN0cmluZyA9ICcnO1xyXG5cdFx0dmFyIGRldmljZVRva2VuOiBzdHJpbmcgPSAnJztcclxuXHRcdGlmIChkZXZpY2UpIHtcclxuXHRcdFx0bW9kZWwgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5tb2RlbDtcclxuXHRcdFx0b3NUeXBlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkucGxhdGZvcm07XHJcblx0XHRcdG9zVmVyc2lvbiA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLnZlcnNpb247XHJcblx0XHR9XHJcblx0XHR2YXIgbWV0YUluZm8gPSB7XHJcblx0XHRcdCdjaGFubmVsSWRlbnRpZmllcic6ICdNT0InLFxyXG5cdFx0XHQnZGF0ZVRpbWVTdGFtcCc6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG5cdFx0XHQnb3duZXJDYXJyaWVyQ29kZSc6IHRoaXMuT1dORVJfQ0FSUklFUl9DT0RFLFxyXG5cdFx0XHQnYWRkaXRpb25hbEluZm8nOiB7XHJcblx0XHRcdFx0J2RldmljZVR5cGUnOiB3aW5kb3cuaXNUYWJsZXQgPyAnVGFibGV0JyA6ICdQaG9uZScsXHJcblx0XHRcdFx0J21vZGVsJzogbW9kZWwsXHJcblx0XHRcdFx0J29zVHlwZSc6IG9zVHlwZSxcclxuXHRcdFx0XHQnb3NWZXJzaW9uJzogb3NWZXJzaW9uLFxyXG5cdFx0XHRcdCdkZXZpY2VUb2tlbic6IGRldmljZVRva2VuLFxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xyXG5cdFx0XHQnbWV0YUluZm8nOiBtZXRhSW5mbyxcclxuXHRcdFx0J3JlcXVlc3REYXRhJzogcmVxdWVzdERhdGFcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gcmVxdWVzdE9iajtcclxuXHR9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk5ldFNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxyXG5cclxubW9kdWxlIGVycm9yaGFuZGxlciB7XHJcblx0ZXhwb3J0IGNvbnN0IFNUQVRVU19GQUlMOiBzdHJpbmcgPSAnZmFpbCc7XHJcblx0ZXhwb3J0IGNvbnN0IFNFVkVSSVRZX0VSUk9SX0hBUkQ6IHN0cmluZyA9ICdIQVJEJztcclxuXHRleHBvcnQgY29uc3QgU0VWRVJJVFlfRVJST1JfU09GVDogc3RyaW5nID0gJ1NPRlQnO1xyXG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX0lOVkFMSURfU0VTU0lPTl9UT0tFTiA9ICdTRUMuMDI1JztcclxuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT04gPSAnU0VTLjAwNCc7XHJcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfVE9LRU5fRVhQSVJFRCA9ICdTRUMuMDM4JztcclxuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9JTlZBTElEX1VTRVJfU0VTU0lPTl9FWFBJUkVEID0gJ1NFUy4wMDMnO1xyXG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX05PX1JFU1VMVCA9ICdDT00uMTExJztcclxuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9OT19ST1VURSA9ICdGTFQuMDEwJztcclxufVxyXG5cclxuY2xhc3MgRXJyb3JIYW5kbGVyU2VydmljZSB7XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnTmV0U2VydmljZScsICdDb3Jkb3ZhU2VydmljZScsICckcScsICckcm9vdFNjb3BlJ107XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBuZXRTZXJ2aWNlOiBOZXRTZXJ2aWNlLCBwcml2YXRlIGNvcmRvdmFTZXJ2aWNlOiBDb3Jkb3ZhU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLFxyXG5cdFx0cHJpdmF0ZSAkcm9vdFNjb3BlOiBuZy5JU2NvcGUpIHtcclxuXHR9XHJcblxyXG5cdHZhbGlkYXRlUmVzcG9uc2UocmVzcG9uc2U6IGFueSkge1xyXG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xyXG5cdFx0aWYgKHRoaXMuaGFzRXJyb3JzKGVycm9ycykgfHwgZXJyb3JoYW5kbGVyLlNUQVRVU19GQUlMID09IHJlc3BvbnNlLnN0YXR1cykge1xyXG5cdFx0XHRpZiAoIXRoaXMuaGFzSW52YWxpZFNlc3Npb25FcnJvcihlcnJvcnMpICYmICF0aGlzLmhhc05vUmVzdWx0RXJyb3IoZXJyb3JzKSkge1xyXG5cdFx0XHRcdC8vIGJyb2FkY2FzdCB0byBhcHBjb250cm9sbGVyIHNlcnZlciBlcnJvclxyXG5cdFx0XHRcdHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdzZXJ2ZXJFcnJvcicsIHJlc3BvbnNlKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0aXNOb1Jlc3VsdEZvdW5kKHJlc3BvbnNlOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcclxuXHRcdHJldHVybiB0aGlzLmhhc05vUmVzdWx0RXJyb3IoZXJyb3JzKTtcclxuXHR9XHJcblxyXG5cdGlzU2Vzc2lvbkludmFsaWQocmVzcG9uc2U6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xyXG5cdFx0cmV0dXJuIHRoaXMuaGFzSW52YWxpZFNlc3Npb25FcnJvcihlcnJvcnMpO1xyXG5cdH1cclxuXHJcblx0aGFzSGFyZEVycm9ycyhyZXNwb25zZTogYW55KTogYm9vbGVhbiB7XHJcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XHJcblx0XHRyZXR1cm4gdGhpcy5oYXNIYXJkRXJyb3IoZXJyb3JzKTtcclxuXHR9XHJcblxyXG5cdGhhc1NvZnRFcnJvcnMocmVzcG9uc2U6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xyXG5cdFx0cmV0dXJuIHRoaXMuaGFzU29mdEVycm9yKGVycm9ycyk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhc0Vycm9ycyhlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIGVycm9ycy5sZW5ndGggPiAwO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYXNJbnZhbGlkU2Vzc2lvbkVycm9yKGVycm9yczogYW55KTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gXy5zb21lKGVycm9ycywgKGVycm9yOiBhbnkpID0+IHtcclxuXHRcdFx0cmV0dXJuIGVycm9yICYmIGVycm9yaGFuZGxlci5TRVZFUklUWV9FUlJPUl9IQVJEID09IGVycm9yLnNldmVyaXR5ICYmXHJcblx0XHRcdChlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT05fVE9LRU4gPT0gZXJyb3IuY29kZSB8fFxyXG5cdFx0XHRcdGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX0lOVkFMSURfU0VTU0lPTiA9PSBlcnJvci5jb2RlIHx8XHJcblx0XHRcdFx0ZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfSU5WQUxJRF9VU0VSX1NFU1NJT05fRVhQSVJFRCA9PSBlcnJvci5jb2RlIHx8XHJcblx0XHRcdFx0ZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfVE9LRU5fRVhQSVJFRCA9PSBlcnJvci5jb2RlKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYXNOb1Jlc3VsdEVycm9yKGVycm9yczogYW55KTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gXy5zb21lKGVycm9ycywgKGVycm9yOiBhbnkpID0+IHtcclxuXHRcdFx0cmV0dXJuIGVycm9yICYmIGVycm9yaGFuZGxlci5TRVZFUklUWV9FUlJPUl9IQVJEID09IGVycm9yLnNldmVyaXR5ICYmXHJcblx0XHRcdChlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9OT19SRVNVTFQgPT0gZXJyb3IuY29kZSB8fFxyXG5cdFx0XHRcdGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX05PX1JPVVRFID09IGVycm9yLmNvZGUpO1xyXG5cdFx0fSkgJiYgZXJyb3JzLmxlbmd0aCA9PSAxO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYXNIYXJkRXJyb3IoZXJyb3JzOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBfLnNvbWUoZXJyb3JzLCAoZXJyb3I6IGFueSkgPT4ge1xyXG5cdFx0XHRyZXR1cm4gZXJyb3IgJiYgZXJyb3JoYW5kbGVyLlNFVkVSSVRZX0VSUk9SX0hBUkQgPT0gZXJyb3Iuc2V2ZXJpdHk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFzU29mdEVycm9yKGVycm9yczogYW55KTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gXy5zb21lKGVycm9ycywgKGVycm9yOiBhbnkpID0+IHtcclxuXHRcdFx0cmV0dXJuIGVycm9yICYmIGVycm9yaGFuZGxlci5TRVZFUklUWV9FUlJPUl9TT0ZUID09IGVycm9yLnNldmVyaXR5O1xyXG5cdFx0fSk7XHJcblx0fVxyXG59IixudWxsLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk5ldFNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiRXJyb3JIYW5kbGVyU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJJU2Vzc2lvbkh0dHBQcm9taXNlLnRzXCIgLz5cclxuXHJcbm1vZHVsZSBzZXNzaW9uc2VydmljZSB7XHJcblx0ZXhwb3J0IGNvbnN0IEhFQURFUl9SRUZSRVNIX1RPS0VOX0tFWTogc3RyaW5nID0gJ3gtcmVmcmVzaC10b2tlbic7XHJcblx0ZXhwb3J0IGNvbnN0IEhFQURFUl9BQ0NFU1NfVE9LRU5fS0VZOiBzdHJpbmcgPSAneC1hY2Nlc3MtdG9rZW4nO1xyXG5cdGV4cG9ydCBjb25zdCBSRUZSRVNIX1NFU1NJT05fSURfVVJMOiBzdHJpbmcgPSAnL3VzZXIvZ2V0QWNjZXNzVG9rZW4nO1xyXG59XHJcblxyXG5jbGFzcyBTZXNzaW9uU2VydmljZSB7XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnTmV0U2VydmljZScsICdFcnJvckhhbmRsZXJTZXJ2aWNlJywgJyRxJywgJyRyb290U2NvcGUnLCAnJGh0dHAnXTtcclxuXHJcblx0cHJpdmF0ZSBhY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlczogSUFjY2Vzc1Rva2VuUmVmcmVzaGVkSGFuZGxlcltdO1xyXG5cdHByaXZhdGUgc2Vzc2lvbklkOiBzdHJpbmc7XHJcblx0cHJpdmF0ZSBjcmVkZW50aWFsSWQ6IHN0cmluZztcclxuXHRwcml2YXRlIGlzUmVmcmVzaFNlc3Npb25JZEluUHJvZ3Jlc3M6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIG5ldFNlcnZpY2U6IE5ldFNlcnZpY2UsIHByaXZhdGUgZXJyb3JIYW5kbGVyU2VydmljZTogRXJyb3JIYW5kbGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLFxyXG5cdFx0cHJpdmF0ZSAkcm9vdFNjb3BlOiBuZy5JU2NvcGUsIHByaXZhdGUgJGh0dHA6IG5nLklIdHRwU2VydmljZSkge1xyXG5cdFx0dGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcyA9IFtdO1xyXG5cdFx0dGhpcy5zZXNzaW9uSWQgPSBudWxsO1xyXG5cdFx0dGhpcy5jcmVkZW50aWFsSWQgPSBudWxsO1xyXG5cdH1cclxuXHJcblx0cmVzb2x2ZVByb21pc2UocHJvbWlzZTogSVNlc3Npb25IdHRwUHJvbWlzZSkge1xyXG5cdFx0cHJvbWlzZS5yZXNwb25zZS50aGVuKChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRpZiAoIXRoaXMuZXJyb3JIYW5kbGVyU2VydmljZS5oYXNIYXJkRXJyb3JzKHJlc3BvbnNlKSB8fCB0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaXNTZXNzaW9uSW52YWxpZChyZXNwb25zZSkpIHtcclxuXHRcdFx0XHRpZiAoIXRoaXMuZXJyb3JIYW5kbGVyU2VydmljZS5pc1Nlc3Npb25JbnZhbGlkKHJlc3BvbnNlKSkge1xyXG5cdFx0XHRcdFx0cHJvbWlzZS5kZWZmZXJlZC5yZXNvbHZlKHByb21pc2UucmVzcG9uc2UpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Nlc3Npb24gaXMgdmFsaWQnKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhpcy5hZGRBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKHByb21pc2UpO1xyXG5cdFx0XHRcdFx0aWYgKCF0aGlzLmlzUmVmcmVzaFNlc3Npb25JZEluUHJvZ3Jlc3MpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3JlZnJlc2hpbmcgc2Vzc2lvbiB0b2tlbicpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJlZnJlc2hTZXNzaW9uSWQoKS50aGVuKFxyXG5cdFx0XHRcdFx0XHRcdCh0b2tlblJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0hhcmRFcnJvcnModG9rZW5SZXNwb25zZSkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRTZXNzaW9uSWQobnVsbCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgcmVzcG9uc2VIZWFkZXIgPSB0b2tlblJlc3BvbnNlLmhlYWRlcnMoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIGFjY2Vzc1Rva2VuOiBzdHJpbmcgPSByZXNwb25zZUhlYWRlcltzZXNzaW9uc2VydmljZS5IRUFERVJfQUNDRVNTX1RPS0VOX0tFWV07XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuc2V0U2Vzc2lvbklkKGFjY2Vzc1Rva2VuKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCF0aGlzLmdldFNlc3Npb25JZCgpKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuYWNjZXNzVG9rZW5Ob3RSZWZyZXNoZWQoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWQoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2Vycm9yIG9uIGFjY2VzcyB0b2tlbiByZWZyZXNoJyk7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnNldFNlc3Npb25JZChudWxsKTtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICh0aGlzLmdldENyZWRlbnRpYWxJZCgpKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuYWNjZXNzVG9rZW5Ob3RSZWZyZXNoZWQoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHByb21pc2UuZGVmZmVyZWQucmVqZWN0KCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmlzUmVmcmVzaFNlc3Npb25JZEluUHJvZ3Jlc3MgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cHJvbWlzZS5kZWZmZXJlZC5yZWplY3QoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRhZGRBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKGxpc3RlbmVyOiBJQWNjZXNzVG9rZW5SZWZyZXNoZWRIYW5kbGVyKSB7XHJcblx0XHR0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLnB1c2gobGlzdGVuZXIpO1xyXG5cdH1cclxuXHJcblx0cmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lclRvUmVtb3ZlOiBJQWNjZXNzVG9rZW5SZWZyZXNoZWRIYW5kbGVyKSB7XHJcblx0XHRfLnJlbW92ZSh0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLCAobGlzdGVuZXIpID0+IHtcclxuXHRcdFx0cmV0dXJuIGxpc3RlbmVyID09IGxpc3RlbmVyVG9SZW1vdmU7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHNldENyZWRlbnRpYWxJZChjcmVkSWQ6IHN0cmluZykge1xyXG5cdFx0dGhpcy5jcmVkZW50aWFsSWQgPSBjcmVkSWQ7XHJcblx0XHR0aGlzLiRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uW3Nlc3Npb25zZXJ2aWNlLkhFQURFUl9SRUZSRVNIX1RPS0VOX0tFWV0gPSBjcmVkSWQ7XHJcblx0fVxyXG5cclxuXHRzZXRTZXNzaW9uSWQoc2Vzc2lvbklkOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMuc2Vzc2lvbklkID0gc2Vzc2lvbklkO1xyXG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vbltzZXNzaW9uc2VydmljZS5IRUFERVJfQUNDRVNTX1RPS0VOX0tFWV0gPSBzZXNzaW9uSWQ7XHJcblx0fVxyXG5cclxuXHRnZXRTZXNzaW9uSWQoKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiB0aGlzLnNlc3Npb25JZCA/IHRoaXMuc2Vzc2lvbklkIDogbnVsbDtcclxuXHR9XHJcblxyXG5cdGdldENyZWRlbnRpYWxJZCgpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHRoaXMuY3JlZGVudGlhbElkID8gdGhpcy5jcmVkZW50aWFsSWQgOiBudWxsO1xyXG5cdH1cclxuXHJcblx0Y2xlYXJMaXN0ZW5lcnMoKSB7XHJcblx0XHR0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzID0gW107XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlZnJlc2hTZXNzaW9uSWQoKTogbmcuSUh0dHBQcm9taXNlPGFueT4ge1xyXG5cdFx0dGhpcy5pc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzID0gdHJ1ZTtcclxuXHRcdHZhciBhY2Nlc3NUb2tlblJlcXVlc3Q6IGFueSA9IHtcclxuXHRcdFx0cmVmcmVzaFRva2VuOiB0aGlzLmNyZWRlbnRpYWxJZFxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMubmV0U2VydmljZS5wb3N0RGF0YShzZXNzaW9uc2VydmljZS5SRUZSRVNIX1NFU1NJT05fSURfVVJMLCBhY2Nlc3NUb2tlblJlcXVlc3QpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhY2Nlc3NUb2tlbk5vdFJlZnJlc2hlZCgpIHtcclxuXHRcdF8uZm9yRWFjaCh0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLCAobGlzdGVuZXIpID0+IHtcclxuXHRcdFx0aWYgKGxpc3RlbmVyLm9uVG9rZW5GYWlsZWQpIHtcclxuXHRcdFx0XHRsaXN0ZW5lci5vblRva2VuRmFpbGVkKGxpc3RlbmVyKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLnJlbW92ZUFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzdGVuZXIobGlzdGVuZXIpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFjY2Vzc1Rva2VuUmVmcmVzaGVkKCkge1xyXG5cdFx0Xy5mb3JFYWNoKHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMsIChsaXN0ZW5lcikgPT4ge1xyXG5cdFx0XHRpZiAobGlzdGVuZXIpIHtcclxuXHRcdFx0XHRpZiAobGlzdGVuZXIub25Ub2tlblJlZnJlc2hlZCkge1xyXG5cdFx0XHRcdFx0bGlzdGVuZXIub25Ub2tlblJlZnJlc2hlZChsaXN0ZW5lcik7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShsaXN0ZW5lcikpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnTGVuZ3RoID0gJywgdGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcy5sZW5ndGgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lcik7XHJcblx0XHR9KTtcclxuXHR9XHJcbn0iLG51bGwsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTmV0U2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJDb3Jkb3ZhU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJTZXNzaW9uU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJFcnJvckhhbmRsZXJTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIklTZXNzaW9uSHR0cFByb21pc2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiR2VuZXJpY1Jlc3BvbnNlLnRzXCIgLz5cclxuXHJcbm1vZHVsZSBkYXRhcHJvdmlkZXIge1xyXG5cdGV4cG9ydCBjb25zdCBTRVJWSUNFX1VSTF9MT0dPVVQgPSAnL3VzZXIvbG9nb3V0JztcclxufVxyXG5cclxuY2xhc3MgRGF0YVByb3ZpZGVyU2VydmljZSB7XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnTmV0U2VydmljZScsICdDb3Jkb3ZhU2VydmljZScsICckcScsICckcm9vdFNjb3BlJywgJ0Vycm9ySGFuZGxlclNlcnZpY2UnLCAnU2Vzc2lvblNlcnZpY2UnLCAnT1dORVJfQ0FSUklFUl9DT0RFJ107XHJcblxyXG5cdHByaXZhdGUgaXNDb25uZWN0ZWRUb05ldHdvcms6IGJvb2xlYW4gPSB0cnVlO1xyXG5cdHByaXZhdGUgbmF2aWdhdG9yOiBOYXZpZ2F0b3I7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBuZXRTZXJ2aWNlOiBOZXRTZXJ2aWNlLCBwcml2YXRlIGNvcmRvdmFTZXJ2aWNlOiBDb3Jkb3ZhU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLFxyXG5cdFx0cHJpdmF0ZSAkcm9vdFNjb3BlOiBuZy5JU2NvcGUsIHByaXZhdGUgZXJyb3JIYW5kbGVyU2VydmljZTogRXJyb3JIYW5kbGVyU2VydmljZSxcclxuXHRcdHByaXZhdGUgc2Vzc2lvblNlcnZpY2U6IFNlc3Npb25TZXJ2aWNlLCBwcml2YXRlIE9XTkVSX0NBUlJJRVJfQ09ERTogc3RyaW5nKSB7XHJcblxyXG5cdFx0dGhpcy5jb3Jkb3ZhU2VydmljZS5leGVjKCgpID0+IHtcclxuXHRcdFx0aWYgKHdpbmRvdy5jb3Jkb3ZhICYmIHdpbmRvdy5kb2N1bWVudCkgeyAvLyBvbiBkZXZpY2VcclxuXHRcdFx0XHRuYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xyXG5cdFx0XHRcdHRoaXMuaXNDb25uZWN0ZWRUb05ldHdvcmsgPSBuYXZpZ2F0b3Iub25MaW5lO1xyXG5cdFx0XHRcdHdpbmRvdy5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFxyXG5cdFx0XHRcdFx0J29ubGluZScsXHJcblx0XHRcdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCd1c2VyIG9ubGluZScpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrID0gdHJ1ZTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRmYWxzZSk7XHJcblx0XHRcdFx0d2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXHJcblx0XHRcdFx0XHQnb2ZmbGluZScsXHJcblx0XHRcdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCd1c2VyIG9mZmxpbmUnKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5pc0Nvbm5lY3RlZFRvTmV0d29yayA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdGZhbHNlKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRnZXREYXRhKHJlcTogc3RyaW5nKTogbmcuSVByb21pc2U8YW55PiB7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHJcblx0XHRpZiAodGhpcy5oYXNOZXR3b3JrQ29ubmVjdGlvbigpKSB7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHRoaXMubmV0U2VydmljZS5nZXREYXRhKHJlcSkpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ1NlcnZlciB1bmF2YWlsYWJsZScpO1xyXG5cdFx0XHQvLyB0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnbm9OZXR3b3JrJyk7XHJcblx0XHRcdGRlZi5yZWplY3QoKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRwb3N0RGF0YShyZXE6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBuZy5JUmVxdWVzdFNob3J0Y3V0Q29uZmlnKTogbmcuSVByb21pc2U8YW55PiB7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHJcblx0XHR2YXIgcmVzcG9uc2U6IG5nLklQcm9taXNlPGFueT4gPSB0aGlzLm5ldFNlcnZpY2UucG9zdERhdGEocmVxLCBkYXRhLCBjb25maWcpO1xyXG5cclxuXHRcdGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcclxuXHRcdFx0cmVzcG9uc2UudGhlbihcclxuXHRcdFx0KGh0dHBSZXNwb25zZSkgPT4ge1xyXG5cclxuXHRcdFx0fSxcclxuXHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ1NlcnZlciB1bmF2YWlsYWJsZScpO1xyXG5cdFx0XHRcdC8vIGJyb2FkY2FzdCBzZXJ2ZXIgaXMgdW5hdmFpbGFibGVcclxuXHRcdFx0XHR0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnc2VydmVyTm90QXZhaWxhYmxlJyk7XHJcblx0XHRcdFx0ZGVmLnJlamVjdCgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGRlZi5yZWplY3QoKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRkZWxldGVEYXRhKHJlcTogc3RyaW5nKTogbmcuSVByb21pc2U8YW55PiB7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHJcblx0XHRpZiAodGhpcy5oYXNOZXR3b3JrQ29ubmVjdGlvbigpKSB7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHRoaXMubmV0U2VydmljZS5kZWxldGVEYXRhKHJlcSkpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ1NlcnZlciB1bmF2YWlsYWJsZScpO1xyXG5cdFx0XHRkZWYucmVqZWN0KCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0aGFzTmV0d29ya0Nvbm5lY3Rpb24oKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gKG5hdmlnYXRvci5vbkxpbmUgfHwgdGhpcy5pc0Nvbm5lY3RlZFRvTmV0d29yayk7XHJcblx0fVxyXG5cclxuXHJcblx0Ly8gVE9ETzogcmVtb3ZlIHRoaXMgdGVtcCBtZXRob2QgYW5kIHVzZSBnZW5lcmljc1xyXG5cdGFkZE1ldGFJbmZvKHJlcXVlc3REYXRhOiBhbnkpOiBhbnkge1xyXG5cdFx0dmFyIGRldmljZTogSW9uaWMuSURldmljZSA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpXHJcblx0XHR2YXIgbW9kZWw6IHN0cmluZyA9ICcnO1xyXG5cdFx0dmFyIG9zVHlwZTogc3RyaW5nID0gJyc7XHJcblx0XHR2YXIgb3NWZXJzaW9uOiBzdHJpbmcgPSAnJztcclxuXHRcdHZhciBkZXZpY2VUb2tlbjogc3RyaW5nID0gJyc7XHJcblx0XHRpZiAoZGV2aWNlKSB7XHJcblx0XHRcdG1vZGVsID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkubW9kZWw7XHJcblx0XHRcdG9zVHlwZSA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLnBsYXRmb3JtO1xyXG5cdFx0XHRvc1ZlcnNpb24gPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS52ZXJzaW9uO1xyXG5cdFx0fVxyXG5cdFx0dmFyIG1ldGFJbmZvID0ge1xyXG5cdFx0XHQnY2hhbm5lbElkZW50aWZpZXInOiAnTU9CJyxcclxuXHRcdFx0J2RhdGVUaW1lU3RhbXAnOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcclxuXHRcdFx0J293bmVyQ2FycmllckNvZGUnOiB0aGlzLk9XTkVSX0NBUlJJRVJfQ09ERSxcclxuXHRcdFx0J2FkZGl0aW9uYWxJbmZvJzoge1xyXG5cdFx0XHRcdCdkZXZpY2VUeXBlJzogd2luZG93LmlzVGFibGV0ID8gJ1RhYmxldCcgOiAnUGhvbmUnLFxyXG5cdFx0XHRcdCdtb2RlbCc6IG1vZGVsLFxyXG5cdFx0XHRcdCdvc1R5cGUnOiBvc1R5cGUsXHJcblx0XHRcdFx0J29zVmVyc2lvbic6IG9zVmVyc2lvbixcclxuXHRcdFx0XHQnZGV2aWNlVG9rZW4nOiBkZXZpY2VUb2tlbixcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR2YXIgcmVxdWVzdE9iaiA9IHtcclxuXHRcdFx0J21ldGFJbmZvJzogbWV0YUluZm8sXHJcblx0XHRcdCdyZXF1ZXN0RGF0YSc6IHJlcXVlc3REYXRhXHJcblx0XHR9O1xyXG5cdFx0cmV0dXJuIHJlcXVlc3RPYmo7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGlzTG9nb3V0U2VydmljZShyZXF1ZXN0VXJsOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBkYXRhcHJvdmlkZXIuU0VSVklDRV9VUkxfTE9HT1VUID09IHJlcXVlc3RVcmw7XHJcblx0fVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdXRpbHMvVXRpbHMudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tbW9uL3NlcnZpY2VzL0Vycm9ySGFuZGxlclNlcnZpY2UudHNcIiAvPlxyXG5cclxuY2xhc3MgQXBwQ29udHJvbGxlciB7XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHN0YXRlJywgJyRzY29wZScsICdEYXRhUHJvdmlkZXJTZXJ2aWNlJyxcclxuXHRcdCckaW9uaWNNb2RhbCcsICckaW9uaWNQbGF0Zm9ybScsICdMb2NhbFN0b3JhZ2VTZXJ2aWNlJywgJyRpb25pY1BvcHVwJyxcclxuXHRcdCckaW9uaWNMb2FkaW5nJywgJyRpb25pY0hpc3RvcnknLCAnRXJyb3JIYW5kbGVyU2VydmljZSddO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByb3RlY3RlZCAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSwgcHJvdGVjdGVkICRzY29wZTogbmcuSVNjb3BlLCBwcm90ZWN0ZWQgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgJGlvbmljUGxhdGZvcm06IElvbmljLklQbGF0Zm9ybSxcclxuXHRcdHByaXZhdGUgbG9jYWxTdG9yYWdlU2VydmljZTogTG9jYWxTdG9yYWdlU2VydmljZSwgcHJpdmF0ZSAkaW9uaWNQb3B1cDogSW9uaWMuSVBvcHVwLFxyXG5cdFx0cHJpdmF0ZSAkaW9uaWNMb2FkaW5nOiBJb25pYy5JTG9hZGluZyxcclxuXHRcdHByaXZhdGUgJGlvbmljSGlzdG9yeTogYW55LCBwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UpIHtcclxuXHJcblx0XHR2YXIgdGhhdDogQXBwQ29udHJvbGxlciA9IHRoaXM7XHJcblx0fVxyXG5cclxuXHRpc05vdEVtcHR5KHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBVdGlscy5pc05vdEVtcHR5KHZhbHVlKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBoYXNOZXR3b3JrQ29ubmVjdGlvbigpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiB0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UuaGFzTmV0d29ya0Nvbm5lY3Rpb24oKTtcclxuXHR9XHJcblxyXG5cdGxvZ291dCgpIHtcclxuXHRcdHRoaXMuJHN0YXRlLmdvKFwibG9naW5cIik7XHJcblx0fVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9EYXRhUHJvdmlkZXJTZXJ2aWNlLnRzXCIgLz5cclxuXHJcbmNsYXNzIE1pc1NlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ0RhdGFQcm92aWRlclNlcnZpY2UnLCAnJHEnXTtcclxuXHRcclxuXHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSBkYXRhUHJvdmlkZXJTZXJ2aWNlOiBEYXRhUHJvdmlkZXJTZXJ2aWNlLCBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UpIHsgfVxyXG5cclxuXHRnZXRNZXRyaWNTbmFwc2hvdCAocmVxZGF0YSl7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvbWV0cmljc25hcHNob3QnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0VGFyZ2V0VnNBY3R1YWwgKHJlcWRhdGEpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3RhcmdldHZzYWN0dWFsJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdH0sXHJcblx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldFJldmVudWVBbmFseXNpcyAocmVxZGF0YSl7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvcmV2ZW51ZWFuYWx5c2lzJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdH0sXHJcblx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldFJvdXRlUmV2ZW51ZSAocmVxZGF0YSl7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvcm91dGVyZXZlbnVlJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdH0sXHJcblx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldFNlY3RvckNhcnJpZXJBbmFseXNpcyAocmVxZGF0YSl7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvc2VjdG9yY2FycmllcmFuYWx5c2lzJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdH0sXHJcblx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldFBheEZsb3duTWlzSGVhZGVyIChyZXFkYXRhKTogYW55IHtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9wYXhmbG93bm1pc2hlYWRlcic7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRSb3V0ZVJldmVudWVEcmlsbERvd24gKHJlcWRhdGEpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3JvdXRlcmV2ZW51ZWRyaWxsJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdH0sXHJcblx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldEJhckRyaWxsRG93biAocmVxZGF0YSl7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvbXNwYXhuZXRyZXZkcmlsbCc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5jbGFzcyBDaGFydG9wdGlvblNlcnZpY2Uge1xyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHJvb3RTY29wZSddO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCRyb290U2NvcGU6IG5nLklTY29wZSkgeyB9XHJcblxyXG4gICAgbGluZUNoYXJ0T3B0aW9ucygpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjaGFydDoge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2xpbmVDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IDUsXHJcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDUwLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogNTBcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXsgcmV0dXJuIGQueHZhbDsgfSxcclxuICAgICAgICAgICAgICAgIHk6IGZ1bmN0aW9uKGQpeyByZXR1cm4gZC55dmFsOyB9LFxyXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkaXNwYXRjaDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlQ2hhbmdlOiBmdW5jdGlvbihlKXsgY29uc29sZS5sb2coXCJzdGF0ZUNoYW5nZVwiKTsgfSxcclxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VTdGF0ZTogZnVuY3Rpb24oZSl7IGNvbnNvbGUubG9nKFwiY2hhbmdlU3RhdGVcIik7IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbHRpcFNob3c6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcInRvb2x0aXBTaG93XCIpOyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBIaWRlOiBmdW5jdGlvbihlKXsgY29uc29sZS5sb2coXCJ0b29sdGlwSGlkZVwiKTsgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGlja0Zvcm1hdDogZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMudGltZS5mb3JtYXQoJyViJykobmV3IERhdGUoZCkpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHlBeGlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICB0aWNrRm9ybWF0OiBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLjAyZicpKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsRGlzdGFuY2U6IC0xMFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTsgIFxyXG4gICAgfVxyXG5cclxuICAgIG11bHRpQmFyQ2hhcnRPcHRpb25zKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnbXVsdGlCYXJDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgIHdpZHRoOiAzMDAsXHJcbiAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAxMCxcclxuICAgICAgICAgICAgICAgICAgICByaWdodDogMjUsXHJcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiAzMCxcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiAyNVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNob3dMZWdlbmQgOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpe3JldHVybiBkLmxhYmVsO30sXHJcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXtyZXR1cm4gZC52YWx1ZSArICgxZS0xMCk7fSxcclxuICAgICAgICAgICAgICAgIHNob3dWYWx1ZXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICByZWR1Y2VYVGlja3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc2hvd0NvbnRyb2xzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlRm9ybWF0OiBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLC40ZicpKGQpO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsRGlzdGFuY2U6IDMwXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHNob3dYQXhpczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA3MDBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07ICBcclxuICAgIH1cclxuXHJcbiAgICBtZXRyaWNCYXJDaGFydE9wdGlvbnMobWlzQ3RybCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY3JldGVCYXJDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDIwMCxcclxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IDIwLFxyXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiAyNSxcclxuICAgICAgICAgICAgICAgICAgICBib3R0b206IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMjVcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXtyZXR1cm4gZC5sYWJlbDt9LFxyXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWV9LFxyXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzaG93VmFsdWVzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdmFsdWVGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJywuMmYnKShkKTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBkaXNjcmV0ZWJhcjoge1xyXG4gICAgICAgICAgICAgICAgICAgIGRpc3BhdGNoOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnREYmxDbGljazogZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlzQ3RybC5vcGVuQmFyRHJpbGxEb3duUG9wb3ZlcihkMy5ldmVudCwgZSwgLTEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHRvb2x0aXA6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHNob3dYQXhpczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNzAwXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9OyAgXHJcbiAgICB9XHJcblxyXG4gICAgdGFyZ2V0QmFyQ2hhcnRPcHRpb25zKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY3JldGVCYXJDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IDIwLFxyXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiA1MCxcclxuICAgICAgICAgICAgICAgICAgICBib3R0b206IDIwLFxyXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDc1XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXtyZXR1cm4gZC5sYWJlbDt9LFxyXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWUgKyAoMWUtMTApO30sXHJcbiAgICAgICAgICAgICAgICBzaG93VmFsdWVzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlRm9ybWF0OiBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuZm9ybWF0KCcsLjJmJykoZCk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDcwMFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTsgIFxyXG4gICAgfVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5jbGFzcyBGaWx0ZXJlZExpc3RTZXJ2aWNlIHtcclxuXHJcbiAgICBwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHsgfVxyXG5cclxuICAgIHNlYXJjaGVkICh2YWxMaXN0cywgdG9TZWFyY2gsIGxldmVsKSB7XHJcbiAgICAgIHJldHVybiBfLmZpbHRlcih2YWxMaXN0cywgXHJcbiAgICAgICAgZnVuY3Rpb24gKGkpIHtcclxuICAgICAgICAgIC8qIFNlYXJjaCBUZXh0IGluIGFsbCAzIGZpZWxkcyAqL1xyXG4gICAgICAgICAgcmV0dXJuIHNlYXJjaFV0aWwoaSwgdG9TZWFyY2gsbGV2ZWwpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHBhZ2VkICh2YWxMaXN0cyxwYWdlU2l6ZSkge1xyXG4gICAgICB2YXIgcmV0VmFsID0gW107XHJcbiAgICAgIGlmKHZhbExpc3RzKXtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbExpc3RzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICBpZiAoaSAlIHBhZ2VTaXplID09PSAwKSB7XHJcbiAgICAgICAgICAgIHJldFZhbFtNYXRoLmZsb29yKGkgLyBwYWdlU2l6ZSldID0gW3ZhbExpc3RzW2ldXTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldFZhbFtNYXRoLmZsb29yKGkgLyBwYWdlU2l6ZSldLnB1c2godmFsTGlzdHNbaV0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcmV0VmFsO1xyXG4gICAgfVxyXG5cclxuICAgXHJcbn1cclxuZnVuY3Rpb24gc2VhcmNoVXRpbChpdGVtLCB0b1NlYXJjaCwgbGV2ZWwpIHtcclxuICAgIC8qIFNlYXJjaCBUZXh0IGluIGFsbCAzIGZpZWxkcyAqL1xyXG4gIGlmKGl0ZW0uY291bnRyeUZyb20gJiYgaXRlbS5jb3VudHJ5VG8gJiYgbGV2ZWwgPT0gMCkge1xyXG4gICAgcmV0dXJuIChpdGVtLmNvdW50cnlGcm9tLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xIHx8IGl0ZW0uY291bnRyeVRvLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgfSBlbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgcmV0dXJuIChpdGVtLmZsb3duU2VjdG9yLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICB9IGVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMikge1xyXG4gICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgfSBlbHNlIGlmKGl0ZW1bJ2RvY3VtZW50IyddICYmIGxldmVsID09IDIpIHtcclxuICAgIHJldHVybiAoaXRlbVsnZG9jdW1lbnQjJ10udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XHJcblxyXG5jbGFzcyBPcGVyYXRpb25hbFNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ0RhdGFQcm92aWRlclNlcnZpY2UnLCAnJHEnXTtcclxuXHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSBkYXRhUHJvdmlkZXJTZXJ2aWNlOiBEYXRhUHJvdmlkZXJTZXJ2aWNlLCBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UpIHsgfVxyXG5cclxuXHRnZXRQYXhGbG93bk9wckhlYWRlcihyZXFkYXRhKTogYW55IHtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm9wci9wYXhmbG93bm9wcmhlYWRlcic7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldE9wckZsaWdodFByb2NTdGF0dXMocmVxZGF0YSkge1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4Zmxub3ByL2ZsaWdodHByb2Nlc3NpbmdzdGF0dXMnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRPcHJGbGlnaHRDb3VudEJ5UmVhc29uKHJlcWRhdGEpIHtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm9wci9mbGlnaHRjb3VudGJ5cmVhc29uJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdFx0fSk7XHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRPcHJDb3Vwb25Db3VudEJ5RXhjZXB0aW9uKHJlcWRhdGEpIHtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm9wci9jb3Vwb25jb3VudGJ5ZXhjZXB0aW9uJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdFx0fSk7XHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxufVxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHNcIiAvPlxyXG5cclxuY2xhc3MgVXNlclNlcnZpY2Uge1xyXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnRGF0YVByb3ZpZGVyU2VydmljZScsICckcScsICckd2luZG93JywgJ0xvY2FsU3RvcmFnZVNlcnZpY2UnXTtcclxuXHRwcml2YXRlIF91c2VyOiBib29sZWFuO1xyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLCBwcml2YXRlIGxvY2FsU3RvcmFnZVNlcnZpY2U6IExvY2FsU3RvcmFnZVNlcnZpY2UsIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcclxuXHJcblx0fVxyXG5cclxuXHRzZXRVc2VyKHVzZXIpIHtcclxuXHRcdGlmICh0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlKSB7XHJcblx0XHRcdHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicsIEpTT04uc3RyaW5naWZ5KHVzZXIpKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGxvZ291dCgpIHtcclxuXHRcdHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5zZXRPYmplY3QoJ3JhcGlkTW9iaWxlLnVzZXInLCBudWxsKTtcclxuXHRcdHRoaXMuX3VzZXIgPSBudWxsO1xyXG5cdH1cclxuXHJcblx0aXNMb2dnZWRJbigpIHtcclxuXHRcdHJldHVybiB0aGlzLl91c2VyID8gdHJ1ZSA6IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Z2V0VXNlcigpIHtcclxuXHRcdHJldHVybiB0aGlzLl91c2VyO1xyXG5cdH1cclxuXHJcblx0bG9naW4oX3VzZXJOYW1lOiBzdHJpbmcsIF9wYXNzd29yZDogc3RyaW5nKSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy91c2VyL2xvZ2luJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dmFyIHJlcXVlc3RPYmogPSB7XHJcblx0XHRcdHVzZXJJZDogX3VzZXJOYW1lLFxyXG5cdFx0XHRwYXNzd29yZDogX3Bhc3N3b3JkXHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5zZXRVc2VyKHsgdXNlcm5hbWU6IFwiXCIgfSk7XHJcblxyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcXVlc3RPYmopLnRoZW4oXHJcblx0XHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdHZhciBkYXRhOiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRcdGlmIChkYXRhLnJlc3BvbnNlLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1xyXG5cdFx0XHRcdFx0dmFyIHJlcSA9IHtcclxuXHRcdFx0XHRcdFx0dXNlcklkOiBfdXNlck5hbWVcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHRoaXMuZ2V0VXNlclByb2ZpbGUocmVxKS50aGVuKFxyXG5cdFx0XHRcdFx0XHQocHJvZmlsZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHZhciB1c2VyTmFtZSA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdHVzZXJuYW1lOiBwcm9maWxlLnJlc3BvbnNlLmRhdGEudXNlckluZm8udXNlck5hbWVcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zZXRVc2VyKHVzZXJOYW1lKTtcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQgb24gbG9hZGluZyB1c2VyIHByb2ZpbGUnKTtcclxuXHRcdFx0XHRcdFx0XHRkZWYucmVqZWN0KGVycm9yKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGRlZi5yZXNvbHZlKGRhdGEpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCBvbiBsb2cgaW4nKTtcclxuXHRcdFx0XHRkZWYucmVqZWN0KGVycm9yKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRVc2VyUHJvZmlsZShyZXFkYXRhKSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy91c2VyL3VzZXJwcm9maWxlJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcclxuXHRcdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3BvbnNlLmRhdGEpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRkZWYucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQgb24gVXNlclByb2ZpbGUnKTtcclxuXHRcdFx0XHRkZWYucmVqZWN0KGVycm9yKTtcclxuXHRcdFx0fSk7XHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbXBvbmVudHMvbWlzL3NlcnZpY2VzL01pc1NlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9DaGFydG9wdGlvblNlcnZpY2UudHNcIiAvPlxyXG5cclxuXHJcblxyXG5pbnRlcmZhY2UgdGFiT2JqZWN0IHtcclxuICAgIHRpdGxlOiBzdHJpbmcsXHJcbiAgICBuYW1lczogc3RyaW5nLFxyXG4gICAgaWNvbjogc3RyaW5nXHJcbn1cclxuXHJcbmludGVyZmFjZSB0b2dnbGVPYmplY3Qge1xyXG4gICAgbW9udGhPclllYXI6IHN0cmluZyxcclxuICAgIHRhcmdldFJldk9yUGF4OiBzdHJpbmcsXHJcbiAgICBzZWN0b3JPcmRlcjogc3RyaW5nLFxyXG4gICAgc2VjdG9yUmV2T3JQYXg6IHN0cmluZyxcclxuICAgIGNoYXJ0T3JUYWJsZTogc3RyaW5nXHJcbn1cclxuXHJcbmludGVyZmFjZSBoZWFkZXJPYmplY3Qge1xyXG4gICAgZmxvd25Nb250aDogc3RyaW5nLFxyXG4gICAgc3VyY2hhcmdlOiBib29sZWFuLFxyXG4gICAgdGFiSW5kZXg6IG51bWJlcixcclxuICAgIGhlYWRlckluZGV4OiBudW1iZXIsXHJcbiAgICB1c2VybmFtZTogc3RyaW5nXHJcbn1cclxuXHJcbmNsYXNzIE1pc0NvbnRyb2xsZXJ7XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckc2NvcGUnLCAnJGlvbmljTG9hZGluZycsICckdGltZW91dCcsICckd2luZG93JywgJyRpb25pY1BvcG92ZXInLCAnJGZpbHRlcicsICdNaXNTZXJ2aWNlJywgJ0NoYXJ0b3B0aW9uU2VydmljZScsICdGaWx0ZXJlZExpc3RTZXJ2aWNlJywgJ1JlcG9ydFN2YyddO1xyXG5cclxuICAgIHByaXZhdGUgdGFiczogW3RhYk9iamVjdF07XHJcbiAgICBwcml2YXRlIHRvZ2dsZTogdG9nZ2xlT2JqZWN0O1xyXG4gICAgcHJpdmF0ZSBoZWFkZXI6IGhlYWRlck9iamVjdDtcclxuICAgIHByaXZhdGUgc3ViSGVhZGVyOiBhbnk7XHJcbiAgICBwcml2YXRlIG9wdGlvbnM6IGFueTtcclxuICAgIHByaXZhdGUgZHJpbGx0YWJzOiBzdHJpbmdbXTtcclxuICAgIFxyXG4gICAgcHJpdmF0ZSBwYWdlU2l6ZSA9IDQ7XHJcbiAgICBwcml2YXRlIGN1cnJlbnRQYWdlID0gW107XHJcbiAgICBwcml2YXRlIHNlbGVjdGVkRHJpbGwgPSBbXTtcclxuICAgIHByaXZhdGUgZ3JvdXBzID0gW107XHJcblxyXG4gICAgcHJpdmF0ZSBpbmZvcG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XHJcbiAgICBwcml2YXRlIGRyaWxscG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XHJcbiAgICBwcml2YXRlIGdyYXBocG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XHJcbiAgICBwcml2YXRlIGRyaWxsQmFycG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XHJcblxyXG4gICAgcHJpdmF0ZSBpbmZvZGF0YTogc3RyaW5nO1xyXG4gICAgcHJpdmF0ZSByZWdpb25OYW1lOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIGNoYXJ0dHlwZTogc3RyaW5nO1xyXG4gICAgcHJpdmF0ZSBncmFwaGluZGV4OiBudW1iZXI7XHJcbiAgICBwcml2YXRlIGNvbHVtblRvT3JkZXI6IHN0cmluZztcclxuICAgIHByaXZhdGUgc2hvd25Hcm91cDogbnVtYmVyO1xyXG5cclxuICAgIHByaXZhdGUgbWV0cmljUmVzdWx0OiBhbnk7XHJcbiAgICBwcml2YXRlIG1ldHJpY0xlZ2VuZHM6IGFueTtcclxuICAgIHByaXZhdGUgZmF2TWV0cmljUmVzdWx0OiBhbnk7XHJcblxyXG4gICAgcHJpdmF0ZSB0YXJnZXRBY3R1YWxEYXRhOiBhbnk7XHJcbiAgICBwcml2YXRlIGZhdlRhcmdldEJhclJlc3VsdDogYW55O1xyXG4gICAgcHJpdmF0ZSBmYXZUYXJnZXRMaW5lUmVzdWx0OiBhbnk7XHJcblxyXG4gICAgcHJpdmF0ZSByb3V0ZVJldkRhdGE6IGFueTtcclxuXHJcbiAgICBwcml2YXRlIHJldmVudWVEYXRhOiBhbnk7XHJcbiAgICBwcml2YXRlIFNlY3RvckNhcnJpZXJBbmFseXNpc0NoYXJ0czogYW55O1xyXG4gICAgcHJpdmF0ZSBwb3BvdmVyc2hvd246IGJvb2xlYW47XHJcbiAgICBwcml2YXRlIGRyaWxsVHlwZTogc3RyaW5nO1xyXG4gICAgcHJpdmF0ZSBkcmlsbEJhckxhYmVsOiBzdHJpbmc7XHJcblxyXG4gICAgcHJpdmF0ZSB0aGF0OiBhbnk7XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSwgcHJpdmF0ZSAkaW9uaWNMb2FkaW5nOiBJb25pYy5JTG9hZGluZywgcHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLCBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxyXG4gICAgICAgIHByaXZhdGUgJGlvbmljUG9wb3ZlcjogSW9uaWMuSVBvcG92ZXIsIHByaXZhdGUgJGZpbHRlcjogbmcuSUZpbHRlclNlcnZpY2UsIHByaXZhdGUgbWlzU2VydmljZTogTWlzU2VydmljZSwgcHJpdmF0ZSBjaGFydG9wdGlvblNlcnZpY2U6IENoYXJ0b3B0aW9uU2VydmljZSxcclxuICAgICAgICBwcml2YXRlIGZpbHRlcmVkTGlzdFNlcnZpY2U6IEZpbHRlcmVkTGlzdFNlcnZpY2UsIHByaXZhdGUgcmVwb3J0U3ZjOiBSZXBvcnRTdmMpIHtcclxuXHJcbiAgICAgICAgdGhpcy50aGF0ID0gdGhpcztcclxuXHJcbiAgICAgICAgdGhpcy50YWJzID0gW1xyXG4gICAgICAgIHsgdGl0bGU6ICdNeSBEYXNoYm9hcmQnLCBuYW1lczogJ015RGFzaGJvYXJkJywgaWNvbiA6ICdpY29ub24taG9tZScgfSxcclxuICAgICAgICB7IHRpdGxlOiAnTWV0cmljIFNuYXBzaG90JywgbmFtZXM6ICdNZXRyaWNTbmFwc2hvdCcsIGljb24gOiAnaW9uLWhvbWUnIH0sXHJcbiAgICAgICAgeyB0aXRsZTogJ1RhcmdldCBWcyBBY3R1YWwnLCBuYW1lczogJ1RhcmdldFZzQWN0dWFsJywgaWNvbiA6ICdpb24taG9tZScgfSxcclxuICAgICAgICB7IHRpdGxlOiAnUmV2ZW51ZSBBbmFseXNpcycsIG5hbWVzOiAnUmV2ZW51ZUFuYWx5c2lzJywgaWNvbiA6ICdpb24taG9tZSd9LFxyXG4gICAgICAgIHsgdGl0bGU6ICdTZWN0b3IgJiBDYXJyaWVyIEFuYWx5c2lzJywgbmFtZXM6ICdTZWN0b3JBbmRDYXJyaWVyQW5hbHlzaXMnLCBpY29uIDogJ2lvbi1ob21lJyB9LFxyXG4gICAgICAgIHsgdGl0bGU6ICdSb3V0ZSBSZXZlbnVlJywgbmFtZXM6ICdSb3V0ZVJldmVudWUnLCBpY29uIDogJ2lvbi1ob21lJyB9XHJcbiAgICAgICAgXTtcclxuXHJcbiAgICAgICAgdGhpcy50b2dnbGUgPSB7XHJcbiAgICAgICAgICAgIG1vbnRoT3JZZWFyIDogJ21vbnRoJyxcclxuICAgICAgICAgICAgdGFyZ2V0UmV2T3JQYXg6ICdyZXZlbnVlJyxcclxuICAgICAgICAgICAgc2VjdG9yT3JkZXI6ICd0b3A1JyxcclxuICAgICAgICAgICAgc2VjdG9yUmV2T3JQYXg6ICdyZXZlbnVlJyxcclxuXHRcdFx0Y2hhcnRPclRhYmxlOiAnY2hhcnQnXHJcbiAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcblxyXG4gICAgICAgIHRoaXMuaGVhZGVyID0ge1xyXG4gICAgICAgICAgICBmbG93bk1vbnRoOiAnJyxcclxuICAgICAgICAgICAgc3VyY2hhcmdlIDogZmFsc2UsXHJcbiAgICAgICAgICAgIHRhYkluZGV4OiAwLFxyXG4gICAgICAgICAgICBoZWFkZXJJbmRleDogMCxcclxuICAgICAgICAgICAgdXNlcm5hbWU6ICcnXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLypcclxuICAgICAgICBhbmd1bGFyLmVsZW1lbnQod2luZG93KS5iaW5kKCdvcmllbnRhdGlvbmNoYW5nZScsIGZ1bmN0aW9uIChlLCBzY29wZSkge1xyXG4gICAgICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXh9KTtcclxuICAgICAgICB9KTsgKi9cclxuICAgICAgICBhbmd1bGFyLmVsZW1lbnQod2luZG93KS5iaW5kKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMub3JpZW50YXRpb25DaGFuZ2UpOyBcclxuICAgICAgICB0aGlzLiRzY29wZS4kb24oJ29uU2xpZGVNb3ZlJywgKGV2ZW50OiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuTWlzQ3RybC5vblNsaWRlTW92ZShyZXNwb25zZSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vdGhpcy4kc2NvcGUuJHdhdGNoKCdNaXNDdHJsLmhlYWRlci5zdXJjaGFyZ2UnLCAoKSA9PiB7IHRoaXMub25TbGlkZU1vdmUoe2luZGV4OnRoaXMuaGVhZGVyLnRhYkluZGV4fSk7IH0sIHRydWUpO1xyXG4gICAgICAgIHRoaXMuaW5pdERhdGEoKTtcclxuICAgICAgICBcclxuICAgIH1cclxuICAgIGluaXREYXRhKCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9pbmZvdG9vbHRpcC5odG1sJywge1xyXG4gICAgICAgICAgICBzY29wZTogdGhhdC4kc2NvcGVcclxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGluZm9wb3BvdmVyKSB7XHJcbiAgICAgICAgICAgIHRoYXQuaW5mb3BvcG92ZXIgPSBpbmZvcG9wb3ZlcjtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvZHJpbGRvd24uaHRtbCcsIHtcclxuICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXHJcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbihkcmlsbHBvcG92ZXIpIHtcclxuICAgICAgICAgICAgdGhhdC5kcmlsbHBvcG92ZXIgPSBkcmlsbHBvcG92ZXI7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvYmFyZHJpbGRvd24uaHRtbCcsIHtcclxuICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXHJcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbihkcmlsbEJhcnBvcG92ZXIpIHtcclxuICAgICAgICAgICAgdGhhdC5kcmlsbEJhcnBvcG92ZXIgPSBkcmlsbEJhcnBvcG92ZXI7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgbWV0cmljOiB0aGlzLmNoYXJ0b3B0aW9uU2VydmljZS5tZXRyaWNCYXJDaGFydE9wdGlvbnModGhpcyksXHJcbiAgICAgICAgICAgIHRhcmdldExpbmVDaGFydDogdGhpcy5jaGFydG9wdGlvblNlcnZpY2UubGluZUNoYXJ0T3B0aW9ucygpLFxyXG4gICAgICAgICAgICB0YXJnZXRCYXJDaGFydDogdGhpcy5jaGFydG9wdGlvblNlcnZpY2UudGFyZ2V0QmFyQ2hhcnRPcHRpb25zKCksXHJcbiAgICAgICAgICAgIHBhc3NlbmdlckNoYXJ0OiB0aGlzLmNoYXJ0b3B0aW9uU2VydmljZS5tdWx0aUJhckNoYXJ0T3B0aW9ucygpXHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuXHJcbiAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFBheEZsb3duTWlzSGVhZGVyKHt1c2VySWQ6ICdWaWN0b3InfSkudGhlbihcclxuICAgICAgICAgICAgICAgIChkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zdWJIZWFkZXIgPSBkYXRhLnJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5oZWFkZXIuZmxvd25Nb250aCA9IHRoYXQuc3ViSGVhZGVyLnBheEZsb3duTWlzTW9udGhzWzBdLmZsb3dNb250aDtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG4gICAgICAgICAgICAgICAgfSk7ICBcclxuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDogMH0pO1xyXG4gICAgfVxyXG4gICAgb3JpZW50YXRpb25DaGFuZ2UgPSAoKTogYm9vbGVhbiA9PiB7XHJcbiAgICAgICAgdGhpcy5vblNsaWRlTW92ZSh7IGluZGV4OiB0aGlzLmhlYWRlci50YWJJbmRleCB9KTtcclxuICAgIH0gXHJcbiAgICBvcGVuaW5mb1BvcG92ZXIgKCRldmVudCwgaW5kZXgpIHtcclxuICAgICAgICBpZiAodHlwZW9mIGluZGV4ID09IFwidW5kZWZpbmVkXCIgfHwgaW5kZXggPT0gXCJcIikge1xyXG4gICAgICAgICAgICB0aGlzLmluZm9kYXRhID0gJ05vIGluZm8gYXZhaWxhYmxlJztcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgdGhpcy5pbmZvZGF0YT1pbmRleDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc29sZS5sb2coaW5kZXgpO1xyXG4gICAgICAgIHRoaXMuaW5mb3BvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgfTtcclxuICAgIGNsb3NlUG9wb3ZlcigpIHtcclxuICAgICAgICB0aGlzLmdyYXBocG9wb3Zlci5oaWRlKCk7XHJcbiAgICB9O1xyXG4gICAgY2xvc2VzQmFyUG9wb3Zlcigpe1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLmhpZGUoKTtcclxuICAgIH1cclxuICAgIGNsb3NlSW5mb1BvcG92ZXIoKSB7XHJcbiAgICAgICAgdGhpcy5pbmZvcG9wb3Zlci5oaWRlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlSGVhZGVyKCkge1xyXG5cdFx0dmFyIGZsb3duTW9udGggPSB0aGlzLmhlYWRlci5mbG93bk1vbnRoO1xyXG4gICAgICAgIHRoaXMuaGVhZGVyLmhlYWRlckluZGV4ID0gXy5maW5kSW5kZXgodGhpcy5zdWJIZWFkZXIucGF4Rmxvd25NaXNNb250aHMsIGZ1bmN0aW9uKGNocjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjaHIuZmxvd01vbnRoID09IGZsb3duTW9udGg7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc29sZS5sb2codGhpcy5oZWFkZXIuaGVhZGVySW5kZXgpO1xyXG5cdFx0dGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6IHRoaXMuaGVhZGVyLmhlYWRlckluZGV4fSk7XHJcbiAgICB9XHJcblxyXG4gICAgb25TbGlkZU1vdmUoZGF0YTogYW55KSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2hlbGxvJyk7XHJcbiAgICAgICAgdGhpcy5oZWFkZXIudGFiSW5kZXggPSBkYXRhLmluZGV4OyAgICAgICAgICAgXHJcbiAgICAgICAgc3dpdGNoKHRoaXMuaGVhZGVyLnRhYkluZGV4KXtcclxuICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICB0aGlzLmdldEZsb3duRmF2b3JpdGVzKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgIHRoaXMuY2FsbE1ldHJpY1NuYXBzaG90KCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgIHRoaXMuY2FsbFRhcmdldFZzQWN0dWFsKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgIHRoaXMuY2FsbFJldmVudWVBbmFseXNpcygpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSA0OlxyXG4gICAgICAgICAgICB0aGlzLmNhbGxTZWN0b3JDYXJyaWVyQW5hbHlzaXMoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgNTpcclxuICAgICAgICAgICAgdGhpcy5jYWxsUm91dGVSZXZlbnVlKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgdG9nZ2xlTWV0cmljICh2YWwpIHtcclxuICAgICAgICB0aGlzLnRvZ2dsZS5tb250aE9yWWVhciA9IHZhbDtcclxuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXh9KTtcclxuICAgIH1cclxuICAgIHRvZ2dsZVN1cmNoYXJnZSgpIHtcclxuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDp0aGlzLmhlYWRlci50YWJJbmRleH0pO1xyXG4gICAgfVxyXG4gICAgdG9nZ2xlVGFyZ2V0KHZhbCkge1xyXG4gICAgICAgIHRoaXMudG9nZ2xlLnRhcmdldFJldk9yUGF4ID0gdmFsO1xyXG4gICAgfVxyXG5cclxuICAgIHRvZ2dsZVNlY3Rvcih2YWwpIHtcclxuICAgICAgICB0aGlzLnRvZ2dsZS5zZWN0b3JSZXZPclBheCA9IHZhbDtcclxuICAgIH1cclxuXHJcbiAgICBjYWxsTWV0cmljU25hcHNob3QoKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICAgICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXHJcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgIHRvZ2dsZTE6IHRoaXMudG9nZ2xlLm1vbnRoT3JZZWFyLFxyXG4gICAgICAgICAgICBmdWxsRGF0YUZsYWc6ICdOJ1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldE1ldHJpY1NuYXBzaG90KHJlcWRhdGEpXHJcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG5cclxuICAgICAgICAgICAgLy8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXHJcbiAgICAgICAgICAgIHRoYXQubWV0cmljUmVzdWx0ICA9IF8uc29ydEJ5KGRhdGEucmVzcG9uc2UuZGF0YS5tZXRyaWNTbmFwc2hvdENoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodSkgcmV0dXJuIFt1LmZhdm9yaXRlQ2hhcnRQb3NpdGlvbl07IFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIF8uZm9yRWFjaCh0aGF0Lm1ldHJpY1Jlc3VsdCwgZnVuY3Rpb24gKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgbi52YWx1ZXNbMF0uY29sb3IgPSAnIzRBOTBFMic7XHJcbiAgICAgICAgICAgICAgICBuLnZhbHVlc1sxXS5jb2xvciA9ICcjNTBFM0MyJztcclxuICAgICAgICAgICAgICAgIGlmKG4udmFsdWVzWzJdKSBuLnZhbHVlc1syXS5jb2xvciA9ICcjQjhFOTg2JztcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGF0LmZhdk1ldHJpY1Jlc3VsdCA9IF8uZmlsdGVyKHRoYXQubWV0cmljUmVzdWx0LCBmdW5jdGlvbih1OiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoYXQubWV0cmljTGVnZW5kcyA9IGRhdGEucmVzcG9uc2UuZGF0YS5sZWdlbmRzO1xyXG4gICAgICAgICAgICBpZih0aGF0LmhlYWRlci50YWJJbmRleCA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGF0Lm1ldHJpY1Jlc3VsdCA9IHRoYXQuZmF2TWV0cmljUmVzdWx0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY2FsbFRhcmdldFZzQWN0dWFsKCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgICAgICAgZnVsbERhdGFGbGFnOiAnJ1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcblxyXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRUYXJnZXRWc0FjdHVhbChyZXFkYXRhKVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgLy8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXHJcbiAgICAgICAgICAgIHRoYXQuZmF2VGFyZ2V0TGluZVJlc3VsdCA9IF8uZmlsdGVyKGRhdGEucmVzcG9uc2UuZGF0YS5saW5lQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHsgXHJcbiAgICAgICAgICAgICAgICBpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGF0LmZhdlRhcmdldEJhclJlc3VsdCA9IF8uZmlsdGVyKGRhdGEucmVzcG9uc2UuZGF0YS52ZXJCYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuICAgICAgICAgICAgICAgIGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIF8uZm9yRWFjaChkYXRhLnJlc3BvbnNlLmRhdGEudmVyQmFyQ2hhcnRzLCBmdW5jdGlvbiAobjogYW55LCB2YWx1ZTogYW55KSB7XHJcbiAgICAgICAgICAgICAgICBuLnZhbHVlc1swXS5jb2xvciA9ICcjNEE5MEUyJztcclxuICAgICAgICAgICAgICAgIG4udmFsdWVzWzFdLmNvbG9yID0gJyM1MEUzQzInO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdmFyIGxpbmVDb2xvcnMgPSBbe1wiY29sb3JcIjogXCIjNEE5MEUyXCIsIFwiY2xhc3NlZFwiOiBcImRhc2hlZFwiLFwic3Ryb2tlV2lkdGhcIjogMn0sXHJcbiAgICAgICAgICAgIHtcImNvbG9yXCI6IFwiIzUwRTNDMlwifSx7XCJjb2xvclwiOiBcIiNCOEU5ODZcIiwgXCJhcmVhXCIgOiB0cnVlLCBcImRpc2FibGVkXCI6IHRydWV9XTtcclxuXHJcbiAgICAgICAgICAgIF8uZm9yRWFjaChkYXRhLnJlc3BvbnNlLmRhdGEubGluZUNoYXJ0cywgZnVuY3Rpb24gKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgXy5tZXJnZShuLmxpbmVDaGFydEl0ZW1zLCBsaW5lQ29sb3JzKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhLnJlc3BvbnNlLmRhdGEubGluZUNoYXJ0cyk7XHJcblxyXG4gICAgICAgICAgICB0aGF0LnRhcmdldEFjdHVhbERhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBob3JCYXJDaGFydDogZGF0YS5yZXNwb25zZS5kYXRhLnZlckJhckNoYXJ0cyxcclxuICAgICAgICAgICAgICAgIGxpbmVDaGFydDogZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHNcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcclxuICAgICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY2FsbFJvdXRlUmV2ZW51ZSgpIHtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHJvdXRlUmV2UmVxdWVzdCA9IHtcclxuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlKHJvdXRlUmV2UmVxdWVzdClcclxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHRoYXQucm91dGVSZXZEYXRhID0gZGF0YS5yZXNwb25zZS5kYXRhO1xyXG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgY2FsbFJldmVudWVBbmFseXNpcygpIHtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcclxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VybmFtZSxcclxuICAgICAgICAgICAgdG9nZ2xlMTogJycsXHJcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJydcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRSZXZlbnVlQW5hbHlzaXMocmVxZGF0YSlcclxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxyXG4gICAgICAgICAgICB2YXIganNvbk9iaiA9IGRhdGEucmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAgICAgdmFyIHNvcnRlZERhdGEgPSBfLnNvcnRCeShqc29uT2JqLm11bHRpYmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHsgXHJcbiAgICAgICAgICAgICAgICBpZiAodSkgcmV0dXJuIFt1LmZhdm9yaXRlQ2hhcnRQb3NpdGlvbl07IFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdmFyIGZhdlJldmVudWVCYXJSZXN1bHQgPSBfLmZpbHRlcihzb3J0ZWREYXRhLCBmdW5jdGlvbih1OiBhbnkpIHsgXHJcbiAgICAgICAgICAgICAgICBpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB2YXIgc29ydGVkRGF0YSA9IF8uc29ydEJ5KGpzb25PYmoucGllQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHsgXHJcbiAgICAgICAgICAgICAgICBpZiAodSkgcmV0dXJuIFt1LmZhdm9yaXRlQ2hhcnRQb3NpdGlvbl07IFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdmFyIGZhdlJldmVudWVQaWVSZXN1bHQgPSBfLmZpbHRlcihzb3J0ZWREYXRhLCBmdW5jdGlvbih1OiBhbnkpIHsgXHJcbiAgICAgICAgICAgICAgICBpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdmFyIGJhckNvbG9ycyA9IFsnIzRBOTBFMicsICcjNTBFM0MyJ107XHJcbiAgICAgICAgICAgIF8ubWVyZ2UoanNvbk9iai5tdWx0aWJhckNoYXJ0c1sxXSwgYmFyQ29sb3JzKTtcclxuICAgICAgICAgICAgXy5mb3JFYWNoKGpzb25PYmoubXVsdGliYXJDaGFydHMsIGZ1bmN0aW9uKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgbi5jb2xvciA9IGJhckNvbG9yc1t2YWx1ZV07XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdmFyIHBpZUNvbG9ycyA9IFt7XCJjb2xvclwiOiBcIiMyOGI2ZjZcIn0se1wiY29sb3JcIjogXCIjN2JkNGZjXCJ9LHtcImNvbG9yXCI6IFwiI0M2RTVGQVwifV07XHJcbiAgICAgICAgICAgIF8uZm9yRWFjaChqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCBmdW5jdGlvbiAobjogYW55LCB2YWx1ZTogYW55KSB7XHJcbiAgICAgICAgICAgICAgICBuLmxhYmVsID0gbi54dmFsO1xyXG4gICAgICAgICAgICAgICAgbi52YWx1ZSA9IG4ueXZhbDtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBfLm1lcmdlKGpzb25PYmoucGllQ2hhcnRzWzBdLmRhdGEsIHBpZUNvbG9ycyk7XHJcblxyXG4gICAgICAgICAgICB0aGF0LnJldmVudWVEYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgcmV2ZW51ZVBpZUNoYXJ0IDoganNvbk9iai5waWVDaGFydHNbMF0sXHJcbiAgICAgICAgICAgICAgICByZXZlbnVlQmFyQ2hhcnQgOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzFdLm11bHRpYmFyQ2hhcnRJdGVtcyxcclxuICAgICAgICAgICAgICAgIHJldmVudWVIb3JCYXJDaGFydCA6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMl0ubXVsdGliYXJDaGFydEl0ZW1zXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgb3BlbkRyaWxsRG93bihyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsXSA9IHJlZ2lvbkRhdGE7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbCArIDFdID0gJyc7XHJcbiAgICAgICAgaWYoc2VsRmluZExldmVsICE9ICczJykge1xyXG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgICAgICAgdGhpcy5yZWdpb25OYW1lID0gKHJlZ2lvbkRhdGEucmVnaW9uTmFtZSkgPyByZWdpb25EYXRhLnJlZ2lvbk5hbWUgOiByZWdpb25EYXRhLmNhaHJ0TmFtZTtcclxuICAgICAgICAgICAgdmFyIGNvdW50cnlGcm9tVG8gPSAocmVnaW9uRGF0YS5jb3VudHJ5RnJvbSAmJiByZWdpb25EYXRhLmNvdW50cnlUbykgPyByZWdpb25EYXRhLmNvdW50cnlGcm9tICsgJy0nICsgcmVnaW9uRGF0YS5jb3VudHJ5VG8gOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgc2VjdG9yRnJvbVRvID0gKHJlZ2lvbkRhdGEuZmxvd25TZWN0b3IgJiYgZHJpbGxMZXZlbCA+PSAzKSA/IHJlZ2lvbkRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKHJlZ2lvbkRhdGEuZmxpZ2h0TnVtYmVyICYmIGRyaWxsTGV2ZWwgPT0gNCkgPyByZWdpb25EYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXHJcbiAgICAgICAgICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmhlYWRlci51c2VybmFtZSxcclxuICAgICAgICAgICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcclxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxyXG4gICAgICAgICAgICAgICAgXCJyZWdpb25OYW1lXCI6ICh0aGlzLnJlZ2lvbk5hbWUpPyB0aGlzLnJlZ2lvbk5hbWUgOiBcIk5vcnRoIEFtZXJpY2FcIixcclxuICAgICAgICAgICAgICAgIFwiY291bnRyeUZyb21Ub1wiOiBjb3VudHJ5RnJvbVRvLFxyXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JGcm9tVG9cIjogc2VjdG9yRnJvbVRvLFxyXG4gICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgXCJmbGlnaHREYXRlXCI6IDBcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRSb3V0ZVJldmVudWVEcmlsbERvd24ocmVxZGF0YSlcclxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGRhdGEucmVzcG9uc2U7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgIHZhciBmaW5kTGV2ZWwgPSBkcmlsbExldmVsIC0gMTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEuc3RhdHVzKTtcclxuICAgICAgICAgICAgICAgIGlmKGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJyl7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5pdGVtc1swXSA9IGRhdGEuZGF0YS5yb3dzO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0ub3JnSXRlbXNbMF0gPSBkYXRhLmRhdGEucm93cztcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zb3J0KCdwYXhDb3VudCcsZmluZExldmVsLGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZHJpbGxMZXZlbCk7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGZpbmRMZXZlbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sZnVuY3Rpb24oZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgICAgICAgICAgICB0aGF0LmNsb3Nlc1BvcG92ZXIoKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgICAgICAgICAgICAgIGFsZXJ0KCdTZXJ2ZXIgRXJyb3InKTtcclxuICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgIH0gXHJcbiAgICB9XHJcbiAgICBjbGVhckRyaWxsKGxldmVsOiBudW1iZXIpIHtcclxuICAgICAgICB2YXIgaTogbnVtYmVyO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSBsZXZlbDsgaSA8PSAzOyBpKyspIHtcclxuICAgICAgICAgICAgdGhpcy5ncm91cHNbaV0uaXRlbXMuc3BsaWNlKDAsIDEpO1xyXG4gICAgICAgICAgICB0aGlzLmdyb3Vwc1tpXS5vcmdJdGVtcy5zcGxpY2UoMCwgMSk7XHJcbiAgICAgICAgICAgIHRoaXMuc29ydCgncGF4Q291bnQnLGksZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBvcGVuQmFyRHJpbGxEb3duKGRhdGEsIHNlbEZpbmRMZXZlbCkge1xyXG4gICAgICAgIHNlbEZpbmRMZXZlbCA9IE51bWJlcihzZWxGaW5kTGV2ZWwpO1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsXSA9IGRhdGE7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbCArIDFdID0gJyc7XHJcbiAgICAgICAgaWYgKHNlbEZpbmRMZXZlbCAhPSAnMycpIHtcclxuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgICAgICAgIGlmIChkYXRhLmxhYmVsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhLmxhYmVsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgZHJpbGxCYXI6IHN0cmluZztcclxuICAgICAgICAgICAgZHJpbGxCYXIgPSAoZGF0YS5sYWJlbCkgPyBkYXRhLmxhYmVsIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIHJvdXRlQ29kZSA9IChkYXRhLnJvdXRlQ29kZSkgPyBkYXRhLnJvdXRlQ29kZSA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBzZWN0b3IgPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWRyaWxsQmFyKSB7XHJcbiAgICAgICAgICAgICAgICBkcmlsbEJhciA9IHRoaXMuZHJpbGxCYXJMYWJlbDtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRyaWxsQmFyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHJcbiAgICAgICAgICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWScgOiAnTicsXHJcbiAgICAgICAgICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmhlYWRlci51c2VybmFtZSxcclxuICAgICAgICAgICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcclxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbEJhclwiOiBkcmlsbEJhcixcclxuICAgICAgICAgICAgICAgIFwicm91dGVDb2RlXCI6IHJvdXRlQ29kZSxcclxuICAgICAgICAgICAgICAgIFwic2VjdG9yXCI6IHNlY3RvcixcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlclxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldEJhckRyaWxsRG93bihyZXFkYXRhKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gZGF0YS5yZXNwb25zZTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZmluZExldmVsID0gZHJpbGxMZXZlbCAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YS5zdGF0dXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnN0YXR1cyA9PSAnc3VjY2VzcycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5pdGVtc1swXSA9IGRhdGEuZGF0YS5yb3dzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gZGF0YS5kYXRhLnJvd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuc2hvd25Hcm91cCA9IGZpbmRMZXZlbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zb3J0KCdwYXhDb3VudCcsIGZpbmRMZXZlbCwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZHJpbGxMZXZlbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZmluZExldmVsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuY2xvc2VzUG9wb3ZlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICBhbGVydCgnU2VydmVyIEVycm9yJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpbml0aWF0ZUFycmF5KGRyaWxsdGFicykge1xyXG4gICAgICAgIGZvciAodmFyIGkgaW4gZHJpbGx0YWJzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IGksXHJcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLmRyaWxsdGFic1tpXSxcclxuICAgICAgICAgICAgICAgIGl0ZW1zOiBbXSxcclxuICAgICAgICAgICAgICAgIG9yZ0l0ZW1zOiBbXSxcclxuICAgICAgICAgICAgICAgIEl0ZW1zQnlQYWdlOiBbXVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIG9wZW5CYXJEcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAnYmFyJztcclxuICAgICAgICB0aGlzLmRyaWxsQmFycG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ1JvdXRlIExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdEYXRhIExldmVsJywgJ0ZsaWdodCBMZXZlbCddO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XHJcbiAgICAgICAgdGhpcy5vcGVuQmFyRHJpbGxEb3duKHNlbERhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICBvcGVuUG9wb3ZlciAoJGV2ZW50LCBpbmRleCwgY2hhcnR0eXBlKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHRoaXMuY2hhcnR0eXBlID0gY2hhcnR0eXBlO1xyXG4gICAgICAgIHRoaXMuZ3JhcGhpbmRleCA9IGluZGV4O1xyXG4gICAgICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL2dyYXBoLXBvcG92ZXIuaHRtbCcsIHtcclxuICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXHJcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbihwb3BvdmVyKSB7XHJcbiAgICAgICAgICAgIHRoYXQucG9wb3ZlcnNob3duID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIgPSBwb3BvdmVyO1xyXG4gICAgICAgICAgICB0aGF0LmdyYXBocG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgb3BlblNlY3RvclBvcG92ZXIgKCRldmVudCxpbmRleCxjaGFydHR5cGUpIHtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5jaGFydHR5cGUgPSBjaGFydHR5cGU7XHJcbiAgICAgICAgdGhpcy5ncmFwaGluZGV4ID0gaW5kZXg7XHJcbiAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvc2VjdG9yLWdyYXBoLXBvcG92ZXIuaHRtbCcsIHtcclxuICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXHJcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbihwb3BvdmVyKSB7XHJcbiAgICAgICAgICAgIHRoYXQucG9wb3ZlcnNob3duID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIgPSBwb3BvdmVyO1xyXG4gICAgICAgICAgICB0aGF0LmdyYXBocG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY2FsbFNlY3RvckNhcnJpZXJBbmFseXNpcyAoKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICAgICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXHJcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgIHRvZ2dsZTE6ICcnLFxyXG4gICAgICAgICAgICB0b2dnbGUyOiAnJyxcclxuICAgICAgICAgICAgZnVsbERhdGFGbGFnOiAnTidcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHJcbiAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFNlY3RvckNhcnJpZXJBbmFseXNpcyhyZXFkYXRhKVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgLy8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXHJcbiAgICAgICAgICAgIHZhciBqc29uT2JqID0gZGF0YS5yZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICBfLmZvckVhY2goanNvbk9iai5TZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHMsIGZ1bmN0aW9uKHZhbDogYW55LCBpOiBudW1iZXIpe1xyXG4gICAgICAgICAgICAgICAgdmFsWydvdGhlcnMnXSA9IHZhbC5pdGVtcy5zcGxpY2UoLTEsIDEpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdmFyIHNvcnRlZERhdGEgPSBfLnNvcnRCeShqc29uT2JqLlNlY3RvckNhcnJpZXJBbmFseXNpc0NoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7IFxyXG4gICAgICAgICAgICAgICAgaWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHZhciBmYXZTZWN0b3JDYXJyaWVyUmVzdWx0ID0gXy5maWx0ZXIoc29ydGVkRGF0YSwgZnVuY3Rpb24odTogYW55KSB7IFxyXG4gICAgICAgICAgICAgICAgaWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoYXQuU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzID0ganNvbk9iai5TZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHM7XHJcbiAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGFyZ2V0QWN0dWFsRmlsdGVyKHRoYXQ6IE1pc0NvbnRyb2xsZXIpIHtcclxuICAgICAgICByZXR1cm4gZnVuY3Rpb24oaXRlbTogYW55KXtcclxuICAgICAgICAgICAgcmV0dXJuIGl0ZW0udG9nZ2xlMSA9PSB0aGF0LnRvZ2dsZS50YXJnZXRSZXZPclBheDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VjdG9yQ2FycmllckZpbHRlcih0aGF0OiBNaXNDb250cm9sbGVyKSB7XHJcbiAgICAgICB0aGF0ID0gdGhpcy50aGF0O1xyXG4gICAgICAgcmV0dXJuIGZ1bmN0aW9uKGl0ZW06IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gaXRlbS50b2dnbGUxID09IHRoYXQudG9nZ2xlLnNlY3Rvck9yZGVyICYmIGl0ZW0udG9nZ2xlMiA9PSB0aGF0LnRvZ2dsZS5zZWN0b3JSZXZPclBheDsgXHJcbiAgICAgIH1cclxuICAgICBcclxuICAgIH1cclxuXHJcbiAgICByZXZlbnVlQW5hbHlzaXNGaWx0ZXIoaXRlbTogYW55KSB7XHJcbiAgICAgICAgdmFyIHN1cmNoYXJnZUZsYWcgPSAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/IFwiWVwiIDogXCJOXCI7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coc3VyY2hhcmdlRmxhZysnIDogJytpdGVtKTtcclxuICAgICAgICBpZiggaXRlbS5zdXJjaGFyZ2VGbGFnID09IHN1cmNoYXJnZUZsYWcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7IFxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Rmxvd25GYXZvcml0ZXMoKSB7XHJcbiAgICAgICAgdGhpcy5jYWxsTWV0cmljU25hcHNob3QoKTtcclxuICAgICAgICB0aGlzLmNhbGxUYXJnZXRWc0FjdHVhbCgpO1xyXG4gICAgICAgIHRoaXMuY2FsbFJldmVudWVBbmFseXNpcygpO1xyXG4gICAgfVxyXG5cclxuICAgIGlvbmljTG9hZGluZ1Nob3coKSB7XHJcbiAgICAgICAgdGhpcy4kaW9uaWNMb2FkaW5nLnNob3coe1xyXG4gICAgICAgICAgICB0ZW1wbGF0ZTogJzxpb24tc3Bpbm5lciBjbGFzcz1cInNwaW5uZXItY2FsbVwiPjwvaW9uLXNwaW5uZXI+J1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuXHJcbiAgICBpb25pY0xvYWRpbmdIaWRlKCkge1xyXG4gICAgICAgIHRoaXMuJGlvbmljTG9hZGluZy5oaWRlKCk7XHJcbiAgICB9O1xyXG5cclxuICAgIG9wZW5EcmlsbERvd25Qb3BvdmVyKCRldmVudCxyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCkge1xyXG4gICAgICAgIHRoaXMuZHJpbGxUeXBlID0gJ3JvdXRlJztcclxuICAgICAgICB0aGlzLmRyaWxscG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ0NvdW50cnkgTGV2ZWwnLCAnU2VjdG9yIExldmVsJywgJ0ZsaWdodCBMZXZlbCcsICdEb2N1bWVudCBMZXZlbCddO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XHJcbiAgICAgICAgdGhpcy5vcGVuRHJpbGxEb3duKHJlZ2lvbkRhdGEsc2VsRmluZExldmVsKTtcclxuICAgIH07XHJcblxyXG4gICAgY2xvc2VzUG9wb3ZlcigpIHtcclxuICAgICAgICB0aGlzLmRyaWxscG9wb3Zlci5oaWRlKCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGlzRHJpbGxSb3dTZWxlY3RlZChsZXZlbCxvYmopIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RlZERyaWxsW2xldmVsXSA9PSBvYmo7XHJcbiAgICB9XHJcbiAgICBzZWFyY2hSZXN1bHRzIChsZXZlbCxvYmopIHtcclxuICAgICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLmZpbHRlcmVkTGlzdFNlcnZpY2Uuc2VhcmNoZWQodGhpcy5ncm91cHNbbGV2ZWxdLm9yZ0l0ZW1zWzBdLCBvYmouc2VhcmNoVGV4dCwgbGV2ZWwpO1xyXG4gICAgICAgIGlmIChvYmouc2VhcmNoVGV4dCA9PSAnJykge1xyXG4gICAgICAgICAgICB0aGlzLnJlc2V0QWxsKGxldmVsKTsgXHJcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuZ3JvdXBzW2xldmVsXS5vcmdJdGVtc1swXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSAwO1xyXG4gICAgICAgIHRoaXMucGFnaW5hdGlvbihsZXZlbCk7IFxyXG4gICAgfVxyXG4gICAgcGFnaW5hdGlvbiAobGV2ZWwpIHtcclxuICAgICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UgPSB0aGlzLmZpbHRlcmVkTGlzdFNlcnZpY2UucGFnZWQodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLnBhZ2VTaXplICk7XHJcbiAgICB9O1xyXG5cclxuICAgIHNldFBhZ2UgKGxldmVsKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSB0aGlzLm47XHJcbiAgICB9O1xyXG4gICAgbGFzdFBhZ2UobGV2ZWwpIHtcclxuICAgICAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IHRoaXMuZ3JvdXBzW2xldmVsXS5JdGVtc0J5UGFnZS5sZW5ndGggLSAxO1xyXG4gICAgfTtcclxuICAgIHJlc2V0QWxsKGxldmVsKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSAwO1xyXG4gICAgfVxyXG4gICAgc29ydChzb3J0QnksbGV2ZWwsb3JkZXIpIHtcclxuICAgICAgICB0aGlzLnJlc2V0QWxsKGxldmVsKTtcclxuICAgICAgICB0aGlzLmNvbHVtblRvT3JkZXIgPSBzb3J0Qnk7IFxyXG4gICAgICAgIC8vJEZpbHRlciAtIFN0YW5kYXJkIFNlcnZpY2VcclxuICAgICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLiRmaWx0ZXIoJ29yZGVyQnknKSh0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0sIHRoaXMuY29sdW1uVG9PcmRlciwgb3JkZXIpOyBcclxuICAgICAgICB0aGlzLnBhZ2luYXRpb24obGV2ZWwpOyAgICBcclxuICAgIH07XHJcbiAgICByYW5nZShpbnB1dCwgdG90YWwpIHtcclxuICAgICAgICB2YXIgcmV0ID0gW107XHJcbiAgICAgICAgaWYgKCF0b3RhbCkge1xyXG4gICAgICAgICAgICB0b3RhbCA9IGlucHV0O1xyXG4gICAgICAgICAgICBpbnB1dCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZvciAodmFyIGkgPSBpbnB1dDsgaSA8IHRvdGFsOyBpKyspIHtcclxuICAgICAgICAgICAgcmV0LnB1c2goaSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXQ7XHJcbiAgICB9XHJcblxyXG4gICAgdG9nZ2xlR3JvdXAgKGdyb3VwKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaXNHcm91cFNob3duKGdyb3VwKSkge1xyXG4gICAgICAgICAgICB0aGlzLnNob3duR3JvdXAgPSBudWxsO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvd25Hcm91cCA9IGdyb3VwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlzR3JvdXBTaG93bihncm91cDogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2hvd25Hcm91cCA9PSBncm91cDtcclxuICAgIH1cclxuXHR0b2dnbGVDaGFydE9yVGFibGVWaWV3KHZhbDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUuY2hhcnRPclRhYmxlID0gJ2NoYXJ0JztcclxuICAgIH1cclxuXHRydW5SZXBvcnQoY2hhcnRUaXRsZTogc3RyaW5nLG1vbnRoT3JZZWFyOiBzdHJpbmcsZmxvd25Nb250aDogc3RyaW5nKXtcclxuXHRcdC8vaWYgbm8gY29yZG92YSwgdGhlbiBydW5uaW5nIGluIGJyb3dzZXIgYW5kIG5lZWQgdG8gdXNlIGRhdGFVUkwgYW5kIGlmcmFtZVxyXG5cdFx0aWYgKCF3aW5kb3cuY29yZG92YSkge1xyXG5cdFx0XHR0aGlzLnJlcG9ydFN2Yy5ydW5SZXBvcnREYXRhVVJMKGNoYXJ0VGl0bGUsbW9udGhPclllYXIsZmxvd25Nb250aClcclxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihkYXRhVVJMKSB7XHJcblx0XHRcdFx0XHQvL3NldCB0aGUgaWZyYW1lIHNvdXJjZSB0byB0aGUgZGF0YVVSTCBjcmVhdGVkXHJcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKGRhdGFVUkwpO1xyXG5cdFx0XHRcdFx0Ly9kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGRmSW1hZ2UnKS5zcmMgPSBkYXRhVVJMO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdC8vaWYgY29kcm92YSwgdGhlbiBydW5uaW5nIGluIGRldmljZS9lbXVsYXRvciBhbmQgYWJsZSB0byBzYXZlIGZpbGUgYW5kIG9wZW4gdy8gSW5BcHBCcm93c2VyXHJcblx0XHRlbHNlIHtcclxuXHRcdFx0dGhpcy5yZXBvcnRTdmMucnVuUmVwb3J0QXN5bmMoY2hhcnRUaXRsZSxtb250aE9yWWVhcixmbG93bk1vbnRoKVxyXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKGZpbGVQYXRoKSB7XHJcblx0XHRcdFx0XHQvL2xvZyB0aGUgZmlsZSBsb2NhdGlvbiBmb3IgZGVidWdnaW5nIGFuZCBvb3BlbiB3aXRoIGluYXBwYnJvd3NlclxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3JlcG9ydCBydW4gb24gZGV2aWNlIHVzaW5nIEZpbGUgcGx1Z2luJyk7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnUmVwb3J0Q3RybDogT3BlbmluZyBQREYgRmlsZSAoJyArIGZpbGVQYXRoICsgJyknKTtcclxuXHRcdFx0XHRcdHZhciBmaWxlTmFtZSA9IFwiL21udC9zZGNhcmQvXCIrY2hhcnRUaXRsZStcIi5wZGZcIjtcclxuXHRcdFx0XHRcdGlmKGRldmljZS5wbGF0Zm9ybSA9PVwiQW5kcm9pZFwiKVxyXG5cdFx0XHRcdFx0d2luZG93Lm9wZW5QREYoZmlsZU5hbWUpO1xyXG5cdFx0XHRcdFx0ZWxzZVxyXG5cdFx0XHRcdFx0d2luZG93Lm9wZW4oZmlsZVBhdGgsICdfYmxhbmsnLCAnbG9jYXRpb249bm8sY2xvc2VidXR0b25jYXB0aW9uPUNsb3NlLGVuYWJsZVZpZXdwb3J0U2NhbGU9eWVzJyk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9zZXJ2aWNlcy9PcGVyYXRpb25hbFNlcnZpY2UudHNcIiAvPlxyXG5cclxuXHJcbmludGVyZmFjZSB0YWJPYmplY3Qge1xyXG4gICAgdGl0bGU6IHN0cmluZyxcclxuICAgIG5hbWVzOiBzdHJpbmcsXHJcbiAgICBpY29uOiBzdHJpbmdcclxufVxyXG5cclxuaW50ZXJmYWNlIHRvZ2dsZU9iamVjdCB7XHJcbiAgICBtb250aE9yWWVhcjogc3RyaW5nLFxyXG5cdGNoYXJ0T3JUYWJsZTogc3RyaW5nLFxyXG4gICAgb3Blbk9yQ2xvc2VkOiBzdHJpbmdcclxufVxyXG5cclxuaW50ZXJmYWNlIGhlYWRlck9iamVjdCB7XHJcbiAgICBmbG93bk1vbnRoOiBzdHJpbmcsXHJcbiAgICB0YWJJbmRleDogbnVtYmVyLFxyXG4gICAgdXNlck5hbWU6IHN0cmluZ1xyXG59XHJcblxyXG5jbGFzcyBPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlciB7XHJcbiAgcHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckc2NvcGUnLCAnJGlvbmljTG9hZGluZycsICckaW9uaWNQb3BvdmVyJywgJyRmaWx0ZXInLFxyXG4gICAgJ09wZXJhdGlvbmFsU2VydmljZScsICckaW9uaWNTbGlkZUJveERlbGVnYXRlJywgJyR0aW1lb3V0JywgJ1JlcG9ydFN2YyddO1xyXG4gIHByaXZhdGUgdGFiczogW3RhYk9iamVjdF07XHJcbiAgcHJpdmF0ZSB0b2dnbGU6IHRvZ2dsZU9iamVjdDtcclxuICBwcml2YXRlIGhlYWRlcjogaGVhZGVyT2JqZWN0O1xyXG4gIHByaXZhdGUgc3ViSGVhZGVyOiBhbnk7XHJcbiAgcHJpdmF0ZSBmbGlnaHRQcm9jU3RhdHVzOiBhbnk7XHJcbiAgcHJpdmF0ZSBmYXZGbGlnaHRQcm9jUmVzdWx0OiBhbnk7XHJcbiAgcHJpdmF0ZSBjYXJvdXNlbEluZGV4OiBudW1iZXIgPSAwO1xyXG4gIHByaXZhdGUgZmxpZ2h0Q291bnRSZWFzb246IGFueTtcclxuICBwcml2YXRlIGNvdXBvbkNvdW50RXhjZXB0aW9uOiBhbnk7XHJcblxyXG4gIHByaXZhdGUgdGhyZWVCYXJDaGFydENvbG9yczogW3N0cmluZ10gPSBbJyM0RUIyRjknLCAnI0ZGQzMwMCcsICcjNUM2QkMwJ107XHJcbiAgcHJpdmF0ZSBmb3VyQmFyQ2hhcnRDb2xvcnM6IFtzdHJpbmddID0gWycjN0VEMzIxJywgJyM0RUIyRjknLCAnI0ZGQzMwMCcsICcjNUM2QkMwJ107XHJcblxyXG4gIHByaXZhdGUgaW5mb3BvcG92ZXI6IElvbmljLklQb3BvdmVyO1xyXG4gIHByaXZhdGUgaW5mb2RhdGE6IHN0cmluZztcclxuICBwcml2YXRlIGZsaWdodFByb2NTZWN0aW9uOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBmbGlnaHRDb3VudFNlY3Rpb246IHN0cmluZztcclxuICBwcml2YXRlIGNvdXBvbkNvdW50U2VjdGlvbjogc3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3Rvcihwcml2YXRlICRzY29wZTogbmcuSVNjb3BlLCBwcml2YXRlICRpb25pY0xvYWRpbmc6IElvbmljLklMb2FkaW5nLFxyXG4gICAgcHJpdmF0ZSAkaW9uaWNQb3BvdmVyOiBJb25pYy5JUG9wb3ZlciwgcHJpdmF0ZSAkZmlsdGVyOiBuZy5JRmlsdGVyU2VydmljZSxcclxuICAgIHByaXZhdGUgb3BlcmF0aW9uYWxTZXJ2aWNlOiBPcGVyYXRpb25hbFNlcnZpY2UsIHByaXZhdGUgJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZTogSW9uaWMuSVNsaWRlQm94RGVsZWdhdGUsXHJcbiAgICBwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsIHByaXZhdGUgcmVwb3J0U3ZjOiBSZXBvcnRTdmMpIHtcclxuICAgIHRoaXMudGFicyA9IFtcclxuICAgICAgeyB0aXRsZTogJ015IERhc2hib2FyZCcsIG5hbWVzOiAnTXlEYXNoYm9hcmQnLCBpY29uOiAnaWNvbm9uLWhvbWUnIH0sXHJcbiAgICAgIHsgdGl0bGU6ICdGbGlnaHQgUHJvY2VzcyBTdGF0dXMnLCBuYW1lczogJ0ZsaWdodFByb2Nlc3NTdGF0dXMnLCBpY29uOiAnaW9uLWhvbWUnIH0sXHJcbiAgICAgIHsgdGl0bGU6ICdGbGlnaHQgQ291bnQgYnkgUmVhc29uJywgbmFtZXM6ICdGbGlnaHRDb3VudGJ5UmVhc29uJywgaWNvbjogJ2lvbi1ob21lJyB9LFxyXG4gICAgICB7IHRpdGxlOiAnQ291cG9uIENvdW50IGJ5IEV4Y2VwdGlvbiBDYXRlZ29yeScsIG5hbWVzOiAnQ291cG9uQ291bnRieUV4Y2VwdGlvbkNhdGVnb3J5JywgaWNvbjogJ2lvbi1ob21lJyB9XHJcbiAgICBdO1xyXG5cclxuICAgIHRoaXMudG9nZ2xlID0ge1xyXG4gICAgICBtb250aE9yWWVhcjogJ21vbnRoJyxcclxuXHQgICBjaGFydE9yVGFibGU6ICdjaGFydCcsXHJcbiAgICAgIG9wZW5PckNsb3NlZDogJ09QRU4nXHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuaGVhZGVyID0ge1xyXG4gICAgICBmbG93bk1vbnRoOiAnJyxcclxuICAgICAgdGFiSW5kZXg6IDAsXHJcbiAgICAgIHVzZXJOYW1lOiAnJ1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmluaXREYXRhKCk7XHJcbiAgfVxyXG4gIGluaXREYXRhKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9pbmZvdG9vbHRpcC5odG1sJywge1xyXG4gICAgICBzY29wZTogdGhhdC4kc2NvcGVcclxuICAgIH0pLnRoZW4oZnVuY3Rpb24oaW5mb3BvcG92ZXIpIHtcclxuICAgICAgdGhhdC5pbmZvcG9wb3ZlciA9IGluZm9wb3BvdmVyO1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRQYXhGbG93bk9wckhlYWRlcih7IHVzZXJJZDogJ1ZpY3RvcicgfSkudGhlbihcclxuICAgICAgKGRhdGEpID0+IHtcclxuICAgICAgICB0aGF0LnN1YkhlYWRlciA9IGRhdGEucmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGF0LnN1YkhlYWRlci5wYXhGbG93bk9wck1vbnRocyk7XHJcbiAgICAgICAgdGhhdC5oZWFkZXIuZmxvd25Nb250aCA9IHRoYXQuc3ViSGVhZGVyLmRlZmF1bHRNb250aDtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGF0LmhlYWRlci5mbG93bk1vbnRoKTtcclxuICAgICAgfSxcclxuICAgICAgKGVycm9yKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuICAgICAgfSk7XHJcbiAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IDAgfSk7XHJcbiAgfVxyXG4gIG9uU2xpZGVNb3ZlKGRhdGE6IGFueSkge1xyXG4gICAgdGhpcy5oZWFkZXIudGFiSW5kZXggPSBkYXRhLmluZGV4O1xyXG4gICAgc3dpdGNoICh0aGlzLmhlYWRlci50YWJJbmRleCkge1xyXG4gICAgICBjYXNlIDA6XHJcbiAgICAgICAgdGhpcy5jYWxsTXlEYXNoYm9hcmQoKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAxOlxyXG4gICAgICAgIHRoaXMuY2FsbEZsaWdodFByb2NTdGF0dXMoKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAyOlxyXG4gICAgICAgIHRoaXMuY2FsbEZsaWdodENvdW50QnlSZWFzb24oKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAzOlxyXG4gICAgICAgIHRoaXMuY2FsbENvdXBvbkNvdW50QnlFeGNlcHRpb24oKTtcclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuICB9O1xyXG4gIGNhbGxNeURhc2hib2FyZCgpIHtcclxuICAgICAgICB0aGlzLmNhbGxGbGlnaHRQcm9jU3RhdHVzKCk7XHJcbiAgICAgICAgdGhpcy5jYWxsRmxpZ2h0Q291bnRCeVJlYXNvbigpO1xyXG4gICAgICAgIHRoaXMuY2FsbENvdXBvbkNvdW50QnlFeGNlcHRpb24oKTtcclxuICB9XHJcbiAgY2FsbEZsaWdodFByb2NTdGF0dXMoKSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgZmxvd25Nb250aDogJ0p1bC0yMDE1JywvL3RoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgIHVzZXJJZDogJycsXHJcbiAgICAgIHRvZ2dsZTE6ICcnLFxyXG4gICAgICBmdWxsRGF0YUZsYWc6ICdOJ1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckZsaWdodFByb2NTdGF0dXMocmVxZGF0YSlcclxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICB2YXIgb3RoZXJDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogXCIjN0VEMzIxXCIgfSwgeyBcImNvbG9yXCI6IFwiIzRFQjJGOVwiIH0sXHJcbiAgICAgICAgICB7IFwiY29sb3JcIjogXCIjRkZDMzAwXCIgfSwgeyBcImNvbG9yXCI6IFwiIzVDNkJDMFwiIH1dO1xyXG4gICAgICAgIHZhciBwaWVDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogXCIjNEVCMkY5XCIgfSwgeyBcImNvbG9yXCI6IFwiI0ZGQzMwMFwiIH0sIHsgXCJjb2xvclwiOiBcIiM1QzZCQzBcIiB9XTtcclxuXHJcbiAgICAgICAgdmFyIGpzb25PYmogPSB0aGF0LmFwcGx5Q2hhcnRDb2xvckNvZGVzKGRhdGEucmVzcG9uc2UuZGF0YSwgcGllQ2hhcnRDb2xvcnMsIG90aGVyQ2hhcnRDb2xvcnMpO1xyXG4gICAgICAgIHRoYXQuZmxpZ2h0UHJvY1NlY3Rpb24gPSBqc29uT2JqLnNlY3Rpb25OYW1lO1xyXG4gICAgICAgIHZhciBwaWVDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLnBpZUNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XHJcbiAgICAgICAgICBpZiAodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciBtdWx0aUNoYXJ0cyA9IF8uZmlsdGVyKGpzb25PYmoubXVsdGliYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xyXG4gICAgICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgICAgICB9KTtcclxuICAgICAgICB2YXIgc3RhY2tDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLnN0YWNrZWRCYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xyXG4gICAgICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgICAgICB9KTsgICAgICAgICAgXHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coc3RhY2tDaGFydHMpO1xyXG4gICAgICAgIGlmICh0aGF0LmhlYWRlci50YWJJbmRleCA9PSAwKSB7XHJcbiAgICAgICAgICB0aGF0LmZsaWdodFByb2NTdGF0dXMgPSB7XHJcbiAgICAgICAgICAgIHBpZUNoYXJ0OiBwaWVDaGFydHNbMF0sXHJcbiAgICAgICAgICAgIHdlZWtEYXRhOiBtdWx0aUNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsXHJcbiAgICAgICAgICAgIHN0YWNrZWRDaGFydDogKHN0YWNrQ2hhcnRzLmxlbmd0aCkgPyBzdGFja0NoYXJ0c1swXSA6IFtdXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoYXQuZmxpZ2h0UHJvY1N0YXR1cyA9IHtcclxuICAgICAgICAgICAgcGllQ2hhcnQ6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxyXG4gICAgICAgICAgICB3ZWVrRGF0YToganNvbk9iai5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsXHJcbiAgICAgICAgICAgIHN0YWNrZWRDaGFydDoganNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHN0YWNrQ2hhcnRzKTtcclxuICAgICAgICB0aGF0LiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgdGhhdC4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykudXBkYXRlKCk7XHJcbiAgICAgICAgfSwgNTAwKTtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0aGF0LmZsaWdodFByb2NTdGF0dXMud2Vla0RhdGEpKTtcclxuICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgfSk7XHJcbiAgfVxyXG4gIGNhbGxGbGlnaHRDb3VudEJ5UmVhc29uKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdmFyIHJlcWRhdGEgPSB7XHJcbiAgICAgIGZsb3duTW9udGg6ICdKdWwtMjAxNScsXHJcbiAgICAgIHVzZXJJZDogJycsXHJcbiAgICAgIHRvZ2dsZTE6ICdvcGVuJyxcclxuICAgICAgZnVsbERhdGFGbGFnOiAnTidcclxuICAgIH07XHJcbiAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckZsaWdodENvdW50QnlSZWFzb24ocmVxZGF0YSlcclxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGpzb25PYmoucGllQ2hhcnRzWzBdKTtcclxuICAgICAgdmFyIG90aGVyQ2hhcnRDb2xvcnMgPSBbeyBcImNvbG9yXCI6IFwiIzI4QUVGRFwiIH0sIHsgXCJjb2xvclwiOiBcIiNGRkMzMDBcIiB9LCB7IFwiY29sb3JcIjogXCIjNUM2QkMwXCIgfV07XHJcbiAgICAgIHZhciBwaWVDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogXCIjNEVCMkY5XCIgfSwgeyBcImNvbG9yXCI6IFwiI0ZGQzMwMFwiIH0sIHsgXCJjb2xvclwiOiBcIiM1QzZCQzBcIiB9XTtcclxuXHJcbiAgICAgICAgdmFyIGpzb25PYmogPSB0aGF0LmFwcGx5Q2hhcnRDb2xvckNvZGVzKGRhdGEucmVzcG9uc2UuZGF0YSwgcGllQ2hhcnRDb2xvcnMsIG90aGVyQ2hhcnRDb2xvcnMpO1xyXG4gICAgICAgIHRoYXQuZmxpZ2h0Q291bnRTZWN0aW9uID0ganNvbk9iai5zZWN0aW9uTmFtZTtcclxuICAgICAgICBpZiAodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xyXG4gICAgICAgICAgdGhhdC5mbGlnaHRDb3VudFJlYXNvbiA9IHRoYXQuZ2V0RmF2b3JpdGVJdGVtcyhqc29uT2JqKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhhdC5mbGlnaHRDb3VudFJlYXNvbiA9IHtcclxuICAgICAgICAgICAgcGllQ2hhcnQ6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxyXG4gICAgICAgICAgICB3ZWVrRGF0YToganNvbk9iai5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsXHJcbiAgICAgICAgICAgIHN0YWNrZWRDaGFydDoganNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGF0LiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgdGhhdC4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykudXBkYXRlKCk7XHJcbiAgICAgICAgfSwgNzAwKTtcclxuICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgfSk7XHJcbiAgfVxyXG4gIGNhbGxDb3Vwb25Db3VudEJ5RXhjZXB0aW9uKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdmFyIHJlcWRhdGEgPSB7XHJcbiAgICAgIGZsb3duTW9udGg6ICdKdWwtMjAxNScsXHJcbiAgICAgIHVzZXJJZDogJycsXHJcbiAgICAgIHRvZ2dsZTE6ICcnLFxyXG4gICAgICBmdWxsRGF0YUZsYWc6ICdOJ1xyXG4gICAgfTtcclxuICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG4gICAgdGhpcy5vcGVyYXRpb25hbFNlcnZpY2UuZ2V0T3ByQ291cG9uQ291bnRCeUV4Y2VwdGlvbihyZXFkYXRhKVxyXG4gICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgIHZhciBvdGhlckNoYXJ0Q29sb3JzID0gW3sgXCJjb2xvclwiOiBcIiM0RUIyRjlcIiB9LCB7IFwiY29sb3JcIjogXCIjRkZDMzAwXCIgfSwgeyBcImNvbG9yXCI6IFwiIzVDNkJDMFwiIH1dO1xyXG4gICAgICAgIHZhciBwaWVDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogXCIjNEVCMkY5XCIgfSwgeyBcImNvbG9yXCI6IFwiI0ZGQzMwMFwiIH0sIHsgXCJjb2xvclwiOiBcIiM1QzZCQzBcIiB9XTtcclxuXHJcbiAgICAgICAgdmFyIGpzb25PYmogPSB0aGF0LmFwcGx5Q2hhcnRDb2xvckNvZGVzKGRhdGEucmVzcG9uc2UuZGF0YSwgcGllQ2hhcnRDb2xvcnMsIG90aGVyQ2hhcnRDb2xvcnMpO1xyXG4gICAgICAgIHRoYXQuY291cG9uQ291bnRTZWN0aW9uID0ganNvbk9iai5zZWN0aW9uTmFtZTtcclxuICAgICAgICBpZiAodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xyXG4gICAgICAgICAgdGhhdC5jb3Vwb25Db3VudEV4Y2VwdGlvbiA9IHRoYXQuZ2V0RmF2b3JpdGVJdGVtcyhqc29uT2JqKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhhdC5jb3Vwb25Db3VudEV4Y2VwdGlvbiA9IHtcclxuICAgICAgICAgICAgcGllQ2hhcnQ6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxyXG4gICAgICAgICAgICB3ZWVrRGF0YToganNvbk9iai5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsXHJcbiAgICAgICAgICAgIHN0YWNrZWRDaGFydDoganNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoYXQuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICB0aGF0LiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGEnKS51cGRhdGUoKTtcclxuICAgICAgICB9LCA1MDApO1xyXG4gICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICB9KTtcclxuICB9XHJcbiAgaW9uaWNMb2FkaW5nU2hvdygpIHtcclxuICAgIHRoaXMuJGlvbmljTG9hZGluZy5zaG93KHtcclxuICAgICAgdGVtcGxhdGU6ICc8aW9uLXNwaW5uZXIgY2xhc3M9XCJzcGlubmVyLWNhbG1cIj48L2lvbi1zcGlubmVyPidcclxuICAgIH0pO1xyXG4gIH07XHJcbiAgYXBwbHlDaGFydENvbG9yQ29kZXMoanNvbk9iajogYW55LCBwaWVDaGFydENvbG9yczogYW55LCBvdGhlckNoYXJ0Q29sb3JzOiBhbnkpe1xyXG4gICAgXy5mb3JFYWNoKGpzb25PYmoucGllQ2hhcnRzWzBdLmRhdGEsIGZ1bmN0aW9uKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG4gICAgICAgICAgbi5sYWJlbCA9IG4ueHZhbDtcclxuICAgICAgICAgIG4udmFsdWUgPSBuLnl2YWw7XHJcbiAgICB9KTtcclxuICAgIF8ubWVyZ2UoanNvbk9iai5waWVDaGFydHNbMF0uZGF0YSwgcGllQ2hhcnRDb2xvcnMpO1xyXG4gICAgXy5tZXJnZShqc29uT2JqLnN0YWNrZWRCYXJDaGFydHNbMF0uc3RhY2tlZEJhcmNoYXJ0SXRlbXMsIG90aGVyQ2hhcnRDb2xvcnMpO1xyXG4gICAgXy5tZXJnZShqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzBdLm11bHRpYmFyQ2hhcnRJdGVtcywgb3RoZXJDaGFydENvbG9ycyk7XHJcbiAgICByZXR1cm4ganNvbk9iajtcclxuXHJcbiAgfVxyXG4gIGdldEZhdm9yaXRlSXRlbXMoanNvbk9iajogYW55KSB7XHJcbiAgICB2YXIgcGllQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5waWVDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xyXG4gICAgICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgIH0pO1xyXG4gICAgdmFyIG11bHRpQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5tdWx0aWJhckNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XHJcbiAgICAgICAgICBpZiAodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG4gICAgfSk7XHJcbiAgICB2YXIgc3RhY2tDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLnN0YWNrZWRCYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xyXG4gICAgICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcGllQ2hhcnQ6IHBpZUNoYXJ0c1swXSxcclxuICAgICAgd2Vla0RhdGE6IChtdWx0aUNoYXJ0cy5sZW5ndGgpID8gbXVsdGlDaGFydHMubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zIDogW10sXHJcbiAgICAgIHN0YWNrZWRDaGFydDogKHN0YWNrQ2hhcnRzLmxlbmd0aCkgPyBzdGFja0NoYXJ0c1swXSA6IFtdXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjb2xvckZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQsIGkpIHtcclxuICAgICAgcmV0dXJuIHRoYXQudGhyZWVCYXJDaGFydENvbG9yc1tpXTtcclxuICAgIH07XHJcbiAgfVxyXG4gIGZvdXJCYXJDb2xvckZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQsIGkpIHtcclxuICAgICAgcmV0dXJuIHRoYXQuZm91ckJhckNoYXJ0Q29sb3JzW2ldO1xyXG4gICAgfTtcclxuICB9XHJcbiAgb3BlbmluZm9Qb3BvdmVyKCRldmVudCwgaW5kZXgpIHtcclxuICAgIGlmICh0eXBlb2YgaW5kZXggPT0gXCJ1bmRlZmluZWRcIiB8fCBpbmRleCA9PSBcIlwiKSB7XHJcbiAgICAgIHRoaXMuaW5mb2RhdGEgPSAnTm8gaW5mbyBhdmFpbGFibGUnO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHRoaXMuaW5mb2RhdGEgPSBpbmRleDtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKGluZGV4KTtcclxuICAgIHRoaXMuaW5mb3BvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gIH07XHJcbiAgY2xvc2VJbmZvUG9wb3ZlcigpIHtcclxuICAgIHRoaXMuaW5mb3BvcG92ZXIuaGlkZSgpO1xyXG4gIH1cclxuICB0b2dnbGVDb3VudCh2YWwpIHtcclxuICAgIHRoaXMudG9nZ2xlLm9wZW5PckNsb3NlZCA9IHZhbDtcclxuICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XHJcbiAgfVxyXG4gIGlvbmljTG9hZGluZ0hpZGUoKSB7XHJcbiAgICB0aGlzLiRpb25pY0xvYWRpbmcuaGlkZSgpO1xyXG4gIH07XHJcbiAgbG9ja1NsaWRlKCkge1xyXG4gICAgY29uc29sZS5sb2coJ2luIGxvY2tTbGlkZSBtZWh0b2QuLicpO1xyXG4gICAgdGhpcy4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykuZW5hYmxlU2xpZGUoZmFsc2UpO1xyXG4gIH07XHJcbiAgd2Vla0RhdGFQcmV2KCkge1xyXG4gICAgdGhpcy4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykucHJldmlvdXMoKTtcclxuICB9O1xyXG4gIHdlZWtEYXRhTmV4dCgpIHtcclxuICAgIHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpLm5leHQoKTtcclxuICB9XHJcbiAgIHRvZ2dsZUNoYXJ0T3JUYWJsZVZpZXcodmFsOiBzdHJpbmcpIHtcclxuICAgIHRoaXMudG9nZ2xlLmNoYXJ0T3JUYWJsZSA9ICdjaGFydCc7XHJcbiAgfVxyXG4gIHJ1blJlcG9ydChjaGFydFRpdGxlOiBzdHJpbmcsbW9udGhPclllYXI6IHN0cmluZyxmbG93bk1vbnRoOiBzdHJpbmcpe1xyXG5cdC8vaWYgbm8gY29yZG92YSwgdGhlbiBydW5uaW5nIGluIGJyb3dzZXIgYW5kIG5lZWQgdG8gdXNlIGRhdGFVUkwgYW5kIGlmcmFtZVxyXG5cdGlmICghd2luZG93LmNvcmRvdmEpIHtcclxuXHRcdHRoaXMucmVwb3J0U3ZjLnJ1blJlcG9ydERhdGFVUkwoY2hhcnRUaXRsZSxtb250aE9yWWVhcixmbG93bk1vbnRoKVxyXG5cdFx0XHQudGhlbihmdW5jdGlvbihkYXRhVVJMKSB7XHJcblx0XHRcdFx0Ly9zZXQgdGhlIGlmcmFtZSBzb3VyY2UgdG8gdGhlIGRhdGFVUkwgY3JlYXRlZFxyXG5cdFx0XHRcdC8vY29uc29sZS5sb2coZGF0YVVSTCk7XHJcblx0XHRcdFx0Ly9kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGRmSW1hZ2UnKS5zcmMgPSBkYXRhVVJMO1xyXG5cdFx0XHR9KTtcclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHQvL2lmIGNvZHJvdmEsIHRoZW4gcnVubmluZyBpbiBkZXZpY2UvZW11bGF0b3IgYW5kIGFibGUgdG8gc2F2ZSBmaWxlIGFuZCBvcGVuIHcvIEluQXBwQnJvd3NlclxyXG5cdGVsc2Uge1xyXG5cdFx0dGhpcy5yZXBvcnRTdmMucnVuUmVwb3J0QXN5bmMoY2hhcnRUaXRsZSxtb250aE9yWWVhcixmbG93bk1vbnRoKVxyXG5cdFx0XHQudGhlbihmdW5jdGlvbihmaWxlUGF0aCkge1xyXG5cdFx0XHRcdC8vbG9nIHRoZSBmaWxlIGxvY2F0aW9uIGZvciBkZWJ1Z2dpbmcgYW5kIG9vcGVuIHdpdGggaW5hcHBicm93c2VyXHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ3JlcG9ydCBydW4gb24gZGV2aWNlIHVzaW5nIEZpbGUgcGx1Z2luJyk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ1JlcG9ydEN0cmw6IE9wZW5pbmcgUERGIEZpbGUgKCcgKyBmaWxlUGF0aCArICcpJyk7XHJcblx0XHRcdFx0dmFyIGZpbGVOYW1lID0gXCIvbW50L3NkY2FyZC9cIitjaGFydFRpdGxlK1wiLnBkZlwiO1xyXG5cdFx0XHRcdGlmKGRldmljZS5wbGF0Zm9ybSA9PVwiQW5kcm9pZFwiKVxyXG5cdFx0XHRcdHdpbmRvdy5vcGVuUERGKGZpbGVOYW1lKTtcclxuXHRcdFx0XHRlbHNlXHJcblx0XHRcdFx0d2luZG93Lm9wZW4oZmlsZVBhdGgsICdfYmxhbmsnLCAnbG9jYXRpb249bm8sY2xvc2VidXR0b25jYXB0aW9uPUNsb3NlLGVuYWJsZVZpZXdwb3J0U2NhbGU9eWVzJyk7XHJcblx0XHRcdH0pO1xyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG4gIH1cclxufVxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuY2xhc3MgTG9naW5Db250cm9sbGVyIHtcclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzY29wZScsICckc3RhdGUnLCAnVXNlclNlcnZpY2UnXTtcclxuXHRwcml2YXRlIGludmFsaWRNZXNzYWdlOiBib29sZWFuID0gZmFsc2U7XHJcblx0cHJpdmF0ZSB1c2VybmFtZTogc3RyaW5nO1xyXG5cdHByaXZhdGUgcGFzc3dvcmQ6IHN0cmluZztcclxuXHRwcml2YXRlIGlwYWRkcmVzczogc3RyaW5nO1xyXG5cdHByaXZhdGUgZXJvb3JtZXNzYWdlOiBzdHJpbmc7XHJcblxyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgJHNjb3BlOiBuZy5JU2NvcGUsIHByaXZhdGUgJHN0YXRlOiBhbmd1bGFyLnVpLklTdGF0ZVNlcnZpY2UsIFxyXG5cdFx0cHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UpIHtcclxuXHJcblx0fVxyXG5cclxuXHRjbGVhckVycm9yKCkge1xyXG5cdFx0dGhpcy5pbnZhbGlkTWVzc2FnZSA9IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0bG9nb3V0KCkge1xyXG5cdFx0dGhpcy4kc3RhdGUuZ28oXCJhcHAubG9naW5cIik7XHJcblx0fVxyXG5cclxuXHRkb0xvZ2luKGxvZ2luRm9ybTogYm9vbGVhbikge1xyXG5cdFx0aWYgKCFsb2dpbkZvcm0pIHtcclxuXHRcdFx0aWYgKCFhbmd1bGFyLmlzRGVmaW5lZCh0aGlzLnVzZXJuYW1lKSB8fCAhYW5ndWxhci5pc0RlZmluZWQodGhpcy5wYXNzd29yZCkgfHwgIWFuZ3VsYXIuaXNEZWZpbmVkKHRoaXMuaXBhZGRyZXNzKSB8fHRoaXMudXNlcm5hbWUudHJpbSgpID09IFwiXCIgfHwgdGhpcy5wYXNzd29yZC50cmltKCkgPT0gXCJcIiB8fCB0aGlzLmlwYWRkcmVzcy50cmltKCkgPT0gXCJcIikge1xyXG5cdFx0XHRcdHRoaXMuaW52YWxpZE1lc3NhZ2UgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vU0VSVkVSX1VSTCA9ICdodHRwOi8vJyArIHRoaXMuaXBhZGRyZXNzICsgJy8nICsgJ3JhcGlkLXdzL3NlcnZpY2VzL3Jlc3QnO1xyXG5cdFx0XHR0aGlzLnVzZXJTZXJ2aWNlLmxvZ2luKHRoaXMudXNlcm5hbWUsdGhpcy5wYXNzd29yZCkudGhlbihcclxuXHRcdFx0XHQocmVzdWx0KSA9PiB7XHJcblx0XHRcdFx0XHRpZiAocmVzdWx0LnJlc3BvbnNlLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1xyXG5cdFx0XHRcdFx0XHR0aGlzLiRzdGF0ZS5nbyhcImFwcC5taXMtZmxvd25cIik7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmludmFsaWRNZXNzYWdlID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lcm9vcm1lc3NhZ2UgPSBcIlBsZWFzZSBjaGVjayB5b3VyIGNyZWRlbnRpYWxzXCI7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaW52YWxpZE1lc3NhZ2UgPSB0cnVlO1xyXG5cdFx0XHRcdFx0dGhpcy5lcm9vcm1lc3NhZ2UgPSBcIlBsZWFzZSBjaGVjayB5b3VyIG5ldHdvcmsgY29ubmVjdGlvblwiO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fWVsc2Uge1xyXG5cdFx0XHR0aGlzLmludmFsaWRNZXNzYWdlID0gdHJ1ZTtcclxuXHRcdFx0dGhpcy5lcm9vcm1lc3NhZ2UgPSBcIlBsZWFzZSBjaGVjayB5b3VyIGNyZWRlbnRpYWxzXCI7XHJcblx0XHR9ICAgXHJcblx0fVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vX2xpYnMudHNcIiAvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL2FwcC9BcHBDb250cm9sbGVyLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9Db3Jkb3ZhU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9Mb2NhbFN0b3JhZ2VTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL3NlcnZpY2VzL1Nlc3Npb25TZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vc2VydmljZXMvRXJyb3JIYW5kbGVyU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvTWlzU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL29wZXJhdGlvbmFsL3NlcnZpY2VzL09wZXJhdGlvbmFsU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9NaXNDb250cm9sbGVyLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL09wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL3VzZXIvTG9naW5Db250cm9sbGVyLnRzXCIvPlxyXG5cclxudmFyIFNFUlZFUl9VUkwgPSAnaHR0cDovLzEwLjkxLjE1Mi45OTo4MDgyL3JhcGlkLXdzL3NlcnZpY2VzL3Jlc3QnO1xyXG5hbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnLCBbJ2lvbmljJywgJ3RhYlNsaWRlQm94JywgJ252ZDNDaGFydERpcmVjdGl2ZXMnLCAnbnZkMyddKVxyXG5cclxuXHQucnVuKCgkaW9uaWNQbGF0Zm9ybTogSW9uaWMuSVBsYXRmb3JtLCAkaHR0cCkgPT4ge1xyXG5cdFx0JGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb24udG9rZW4gPSAndG9rZW4nO1xyXG4gIFx0XHQkaHR0cC5kZWZhdWx0cy5oZWFkZXJzLnBvc3RbXCJDb250ZW50LVR5cGVcIl0gPSBcImFwcGxpY2F0aW9uL2pzb25cIjtcclxuXHRcdCRpb25pY1BsYXRmb3JtLnJlYWR5KCgpID0+IHtcclxuXHRcdFx0aWYgKHR5cGVvZiBuYXZpZ2F0b3IuZ2xvYmFsaXphdGlvbiAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0fVxyXG5cdFx0fSlcclxuXHR9KVxyXG4uY29uZmlnKCgkc3RhdGVQcm92aWRlcjogYW5ndWxhci51aS5JU3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyOiBhbmd1bGFyLnVpLklVcmxSb3V0ZXJQcm92aWRlcixcclxuXHQkaW9uaWNDb25maWdQcm92aWRlcjogSW9uaWMuSUNvbmZpZ1Byb3ZpZGVyKSA9PiB7XHJcblx0JGlvbmljQ29uZmlnUHJvdmlkZXIudmlld3Muc3dpcGVCYWNrRW5hYmxlZChmYWxzZSk7XHJcblxyXG5cdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhcHAnLCB7XHJcblx0XHR1cmw6ICcvYXBwJyxcclxuXHRcdGFic3RyYWN0OiB0cnVlLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3RlbXBsYXRlcy9tZW51Lmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjogJ0FwcENvbnRyb2xsZXIgYXMgYXBwQ3RybCdcclxuXHR9KVxyXG5cdC5zdGF0ZSgnbG9naW4nLCB7XHJcblx0XHR1cmw6ICcvbG9naW4nLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3VzZXIvbG9naW4uaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOiAnTG9naW5Db250cm9sbGVyIGFzIExvZ2luQ3RybCdcclxuXHR9KVxyXG5cdC5zdGF0ZSgnYXBwLm1pcy1mbG93bicsIHtcclxuXHRcdHVybDogJy9taXMvZmxvd24nLFxyXG5cdFx0dmlld3M6IHtcclxuXHRcdFx0J21lbnVDb250ZW50Jzoge1xyXG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9taXMvZmxvd24uaHRtbCcsXHJcblx0XHRcdFx0Y29udHJvbGxlcjogJ01pc0NvbnRyb2xsZXIgYXMgTWlzQ3RybCdcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pXHJcblx0LnN0YXRlKCdhcHAub3BlcmF0aW9uYWwtZmxvd24nLCB7XHJcblx0XHR1cmw6ICcvb3BlcmF0aW9uYWwvZmxvd24nLFxyXG5cdFx0dmlld3M6IHtcclxuXHRcdFx0J21lbnVDb250ZW50Jzoge1xyXG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9mbG93bi5odG1sJyxcclxuXHRcdFx0XHRjb250cm9sbGVyOiAnT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIgYXMgT3ByQ3RybCdcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHQkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvbG9naW4nKTtcclxufSlcclxuXHJcbi5zZXJ2aWNlKCdEYXRhUHJvdmlkZXJTZXJ2aWNlJywgRGF0YVByb3ZpZGVyU2VydmljZSlcclxuLnNlcnZpY2UoJ05ldFNlcnZpY2UnLCBOZXRTZXJ2aWNlKVxyXG4uc2VydmljZSgnRXJyb3JIYW5kbGVyU2VydmljZScsIEVycm9ySGFuZGxlclNlcnZpY2UpXHJcbi5zZXJ2aWNlKCdTZXNzaW9uU2VydmljZScsIFNlc3Npb25TZXJ2aWNlKVxyXG4uc2VydmljZSgnQ29yZG92YVNlcnZpY2UnLCBDb3Jkb3ZhU2VydmljZSlcclxuLnNlcnZpY2UoJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCBMb2NhbFN0b3JhZ2VTZXJ2aWNlKVxyXG4uc2VydmljZSgnVXNlclNlcnZpY2UnLCBVc2VyU2VydmljZSlcclxuXHJcbi5zZXJ2aWNlKCdNaXNTZXJ2aWNlJywgTWlzU2VydmljZSlcclxuLnNlcnZpY2UoJ09wZXJhdGlvbmFsU2VydmljZScsIE9wZXJhdGlvbmFsU2VydmljZSlcclxuLnNlcnZpY2UoJ0ZpbHRlcmVkTGlzdFNlcnZpY2UnLCBGaWx0ZXJlZExpc3RTZXJ2aWNlKVxyXG4uc2VydmljZSgnQ2hhcnRvcHRpb25TZXJ2aWNlJywgQ2hhcnRvcHRpb25TZXJ2aWNlKVxyXG5cclxuLmNvbnRyb2xsZXIoJ0FwcENvbnRyb2xsZXInLCBBcHBDb250cm9sbGVyKVxyXG4uY29udHJvbGxlcignTWlzQ29udHJvbGxlcicsIE1pc0NvbnRyb2xsZXIpXHJcbi5jb250cm9sbGVyKCdPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlcicsIE9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyKVxyXG4uY29udHJvbGxlcignTG9naW5Db250cm9sbGVyJywgTG9naW5Db250cm9sbGVyKVxyXG5cclxuLy8gLmRpcmVjdGl2ZSgnZmV0Y2hMaXN0JywgRmV0Y2hMaXN0LmZhY3RvcnkoKSlcclxuXHJcblxyXG5pb25pYy5QbGF0Zm9ybS5yZWFkeSgoKSA9PiB7XHJcblx0aWYgKHdpbmRvdy5jb3Jkb3ZhICYmIHdpbmRvdy5jb3Jkb3ZhLnBsdWdpbnMuS2V5Ym9hcmQpIHtcclxuXHR9XHJcblx0Ly8gU3RhdHVzQmFyLm92ZXJsYXlzV2ViVmlldyhmYWxzZSk7XHJcbiAvLyAgICBTdGF0dXNCYXIuYmFja2dyb3VuZENvbG9yQnlIZXhTdHJpbmcoJyMyMDlkYzInKTtcclxuIC8vICAgIFN0YXR1c0Jhci5zdHlsZUxpZ2h0Q29udGVudCgpO1xyXG5cdF8uZGVmZXIoKCkgPT4ge1xyXG5cdFx0Ly8gYW5ndWxhci5ib290c3RyYXAoZG9jdW1lbnQsIFsncmFwaWRNb2JpbGUnXSk7XHJcblx0fSk7XHJcbn0pO1xyXG4iLG51bGwsIihmdW5jdGlvbiAoKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG4gIGFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScpXHJcbiAgLmRpcmVjdGl2ZSgnaGVQcm9ncmVzc0JhcicsIGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBkaXJlY3RpdmVEZWZpbml0aW9uT2JqZWN0ID0ge1xyXG4gICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICByZXBsYWNlOiBmYWxzZSxcclxuICAgICAgc2NvcGU6IHtkYXRhOiAnPWNoYXJ0RGF0YScsIHNob3d0b29sdGlwOiAnQHNob3dUb29sdGlwJ30sXHJcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICB2YXIgeCA9IGQzLnNjYWxlLmxpbmVhcigpXHJcbiAgICAgICAgICAgICAgICAgIC5kb21haW4oWzAsIGQzLm1heChzY29wZS5kYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiArZC5wcm9ncmVzcyB9KV0pXHJcbiAgICAgICAgICAgICAgICAgIC5yYW5nZShbMCwgOTBdKTtcclxuXHJcbiAgICAgICAgdmFyIHNlZ21lbnQgPSBkMy5zZWxlY3QoZWxlbWVudFswXSlcclxuICAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbChcIi5ob3Jpem9udGFsLWJhci1ncmFwaC1zZWdtZW50XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5kYXRhKHNjb3BlLmRhdGEpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5lbnRlcigpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIilcclxuICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC1zZWdtZW50XCIsIHRydWUpO1xyXG5cclxuICAgICAgICBzZWdtZW50LmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtbGFiZWxcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5uYW1lIH0pO1xyXG5cclxuICAgICAgICB2YXIgYmFyU2VnbWVudCA9IHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZVwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXZhbHVlLXNjYWxlXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtdmFsdWUtYmFyXCIsIHRydWUpO1xyXG5cclxuICAgICAgICBiYXJTZWdtZW50XHJcbiAgICAgICAgICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jb2xvciB9KSAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKClcclxuICAgICAgICAgICAgICAgLmR1cmF0aW9uKDEwMDApXHJcbiAgICAgICAgICAgICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiB4KCtkLnByb2dyZXNzKSArIFwiJVwiIH0pO1xyXG5cclxuICAgICAgICB2YXIgYm94U2VnbWVudCA9IGJhclNlZ21lbnQuYXBwZW5kKFwic3BhblwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtdmFsdWUtYm94XCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5wcm9ncmVzcyA/IGQucHJvZ3Jlc3MgOiBcIlwiIH0pO1xyXG4gICAgICAgIGlmKHNjb3BlLnNob3d0b29sdGlwICE9PSAndHJ1ZScpIHJldHVybjsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICB2YXIgYnRuU2VnbWVudCA9IHNlZ21lbnQuYXBwZW5kKFwiYnV0dG9uXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC1pY29uIGljb24gaW9uLWNoZXZyb24tZG93biBuby1ib3JkZXIgc2VjdG9yQ3VzdG9tQ2xhc3NcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImhpZGVcIiwgZnVuY3Rpb24oZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihkKSByZXR1cm4gZC5kcmlsbEZsYWcgPT0gJ04nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pOyAgICAgICAgICAgIFxyXG4gICAgICAgIHZhciB0b29sdGlwU2VnbWVudCA9IHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwidG9vbHRpcFwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZCgnaGlkZScsIHRydWUpO1xyXG4gICAgICAgIHRvb2x0aXBTZWdtZW50LmFwcGVuZChcInBcIikudGV4dChmdW5jdGlvbihkKXsgcmV0dXJuIGQubmFtZTsgfSk7XHJcbiAgICAgICAgdmFyIHRhYmxlID0gdG9vbHRpcFNlZ21lbnQuYXBwZW5kKFwidGFibGVcIik7XHJcbiAgICAgICAgdmFyIHRoZWFkID0gdGFibGUuYXBwZW5kKCd0cicpO1xyXG4gICAgICAgIHRoZWFkLmFwcGVuZCgndGgnKS50ZXh0KCdTZWN0b3InKTtcclxuICAgICAgICB0aGVhZC5hcHBlbmQoJ3RoJykudGV4dCgnUmV2ZW51ZScpO1xyXG5cclxuICAgICAgICB2YXIgdHIgID0gdGFibGVcclxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKCd0Ym9keScpXHJcbiAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbChcInRyXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEoZnVuY3Rpb24oZCl7cmV0dXJuIGQuc2NBbmFseXNpc0RyaWxsc30pXHJcbiAgICAgICAgICAgICAgICAgICAgLmVudGVyKCkuYXBwZW5kKFwidHJcIik7XHJcblxyXG4gICAgICAgIHZhciBzZWN0b3JUZCA9IHRyLmFwcGVuZChcInRkXCIpXHJcbiAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc2VjdG9yIH0pO1xyXG5cclxuICAgICAgICB2YXIgcmV2ZW51ZVRkID0gdHIuYXBwZW5kKFwidGRcIilcclxuICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5yZXZlbnVlIH0pO1xyXG5cclxuICAgICAgICBidG5TZWdtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7ICAgICAgICAgICAgICBcclxuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRvb2x0aXBTZWdtZW50KTtcclxuXHRcdCAgYW5ndWxhci5lbGVtZW50KHRoaXMpLnJlbW92ZUNsYXNzKCdzZWN0b3JDdXN0b21DbGFzcycpO1xyXG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5zZWN0b3JDdXN0b21DbGFzc1wiKSkucmVtb3ZlQ2xhc3MoJ2lvbi1jaGV2cm9uLXVwJyk7XHJcblx0XHQgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlY3RvckN1c3RvbUNsYXNzXCIpKS5hZGRDbGFzcygnaW9uLWNoZXZyb24tZG93bicpO1xyXG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5zZWN0b3JDdXN0b21DbGFzc1wiKSkubmV4dCgpLnJlbW92ZUNsYXNzKCdzaG93Jyk7XHJcblx0XHQgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlY3RvckN1c3RvbUNsYXNzXCIpKS5uZXh0KCkuYWRkQ2xhc3MoJ2hpZGUnKTtcclxuXHRcdCAgXHJcbiAgICAgICAgICBpZihhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLmhhc0NsYXNzKCdzaG93JykpIHtcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLnJlbW92ZUNsYXNzKCdpb24tY2hldnJvbi11cCcpO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykuYWRkQ2xhc3MoJ2lvbi1jaGV2cm9uLWRvd24nKTtcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5yZW1vdmVDbGFzcygnc2hvdycpOyAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLmFkZENsYXNzKCdoaWRlJyk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykucmVtb3ZlQ2xhc3MoJ2lvbi1jaGV2cm9uLWRvd24nKTtcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLmFkZENsYXNzKCdpb24tY2hldnJvbi11cCcpO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLnJlbW92ZUNsYXNzKCdoaWRlJyk7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkuYWRkQ2xhc3MoJ3Nob3cnKTtcclxuICAgICAgICAgIH1cclxuXHRcdCAgYW5ndWxhci5lbGVtZW50KHRoaXMpLmFkZENsYXNzKCdzZWN0b3JDdXN0b21DbGFzcycpO1xyXG5cdFx0ICBcclxuXHRcdCAgXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgICByZXR1cm4gZGlyZWN0aXZlRGVmaW5pdGlvbk9iamVjdDtcclxuICB9KTtcclxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKVxyXG4gIC5kaXJlY3RpdmUoJ2hlUmV2ZW51ZVByb2dyZXNzQmFyJywgZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHJldkJhck9iamVjdCA9IHtcclxuICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgcmVwbGFjZTogZmFsc2UsXHJcbiAgICAgIHNjb3BlOiB7ZGF0YTogJz1jaGFydERhdGEnfSxcclxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHNjb3BlLmRhdGEpO1xyXG4gICAgICAgIHNjb3BlLiR3YXRjaCgnZGF0YScsIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCduZXdWYWx1ZScsIG5ld1ZhbHVlKTtcclxuICAgICAgICAgICAgdmFyIHggPSBkMy5zY2FsZS5saW5lYXIoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgLmRvbWFpbihbMCwgZDMubWF4KHNjb3BlLmRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudmFsdWUgfSldKVxyXG4gICAgICAgICAgICAgICAgICAgICAgLnJhbmdlKFswLCA5MF0pO1xyXG5cclxuICAgICAgICAgICAgdmFyIHNlZ21lbnQgPSBkMy5zZWxlY3QoZWxlbWVudFswXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoXCIubmV0LXJldi1iYXItZ3JhcGgtc2VnbWVudFwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmRhdGEoc2NvcGUuZGF0YSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgIC5lbnRlcigpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXNlZ21lbnRcIiwgdHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICBzZWdtZW50LmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtbGFiZWxcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQubmFtZSB9KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXJTZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlLXNjYWxlXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlLWJhclwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlLWJveFwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlOyB9KTtcclxuXHJcbiAgICAgICAgICAgIGJhclNlZ21lbnQgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuY29sb3IgfSkgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxyXG4gICAgICAgICAgICAgICAgICAgLmR1cmF0aW9uKDEwMDApXHJcbiAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLnZhbHVlKSArIFwiJVwiIH0pOyAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgIH0gICAgICAgICAgICAgICBcclxuICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICAgIHJldHVybiByZXZCYXJPYmplY3Q7XHJcbiAgfSk7XHJcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcclxuICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKS5mYWN0b3J5KCdGaWx0ZXJlZExpc3RTZXJ2aWNlJywgZnVuY3Rpb24gKERhdGFQcm92aWRlclNlcnZpY2UsICRxKSB7XHJcbiAgICAgcmV0dXJuIHtcclxuICAgICAgc2VhcmNoZWQ6IGZ1bmN0aW9uICh2YWxMaXN0cyx0b1NlYXJjaCxsZXZlbCwgZHJpbGx0eXBlKSB7XHJcbiAgICAgICAgcmV0dXJuIF8uZmlsdGVyKHZhbExpc3RzLCBcclxuICAgICAgICAgIGZ1bmN0aW9uIChpKSB7XHJcbiAgICAgICAgICAgIC8qIFNlYXJjaCBUZXh0IGluIGFsbCAzIGZpZWxkcyAqL1xyXG4gICAgICAgICAgICByZXR1cm4gc2VhcmNoVXRpbChpLCB0b1NlYXJjaCwgbGV2ZWwsIGRyaWxsdHlwZSk7XHJcbiAgICAgICAgICB9KTsgICAgICAgIFxyXG4gICAgICB9LFxyXG4gICAgICBwYWdlZDogZnVuY3Rpb24gKHZhbExpc3RzLHBhZ2VTaXplKSB7XHJcbiAgICAgICAgcmV0VmFsID0gW107XHJcbiAgICAgICAgaWYodmFsTGlzdHMpe1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsTGlzdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgIGlmIChpICUgcGFnZVNpemUgPT09IDApIHtcclxuICAgICAgICAgICAgcmV0VmFsW01hdGguZmxvb3IoaSAvIHBhZ2VTaXplKV0gPSBbdmFsTGlzdHNbaV1dO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0VmFsW01hdGguZmxvb3IoaSAvIHBhZ2VTaXplKV0ucHVzaCh2YWxMaXN0c1tpXSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJldFZhbDtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9KTtcclxufSkoKTtcclxuXHJcbmZ1bmN0aW9uIHNlYXJjaFV0aWwoaXRlbSwgdG9TZWFyY2gsIGxldmVsLCBkcmlsbHR5cGUpIHtcclxuICAgIC8qIFNlYXJjaCBUZXh0IGluIGFsbCAzIGZpZWxkcyAqL1xyXG4gIGlmKGRyaWxsdHlwZSA9PSAncm91dGUnKSB7XHJcbiAgICBpZihpdGVtLmNvdW50cnlGcm9tICYmIGl0ZW0uY291bnRyeVRvICYmIGxldmVsID09IDApIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmNvdW50cnlGcm9tLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xIHx8IGl0ZW0uY291bnRyeVRvLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbS5mbG93blNlY3RvciAmJiBsZXZlbCA9PSAxKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbG93blNlY3Rvci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMikge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtWydkb2N1bWVudCMnXSAmJiBsZXZlbCA9PSAyKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbVsnZG9jdW1lbnQjJ10udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuICBpZihkcmlsbHR5cGUgPT0gJ2JhcicpIHtcclxuICAgIGlmKGl0ZW0ucm91dGVDb2RlICYmIGxldmVsID09IDApIHtcclxuICAgICAgcmV0dXJuIChpdGVtLnJvdXRlQ29kZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfWVsc2UgaWYoaXRlbS5mbG93blNlY3RvciAmJiBsZXZlbCA9PSAxKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbG93blNlY3Rvci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfWVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMikge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxufSIsIihmdW5jdGlvbiAoKSB7XHJcbiAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJykuZmFjdG9yeSgnTG9naW5TZXJ2aWNlJywgZnVuY3Rpb24gKERhdGFQcm92aWRlclNlcnZpY2UsICRxLCR3aW5kb3cpIHtcclxuICAgIHZhciBfdXNlciA9IEpTT04ucGFyc2UoJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicpKTtcclxuICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKHVzZXIpIHtcclxuICAgICAgX3VzZXIgPSB1c2VyO1xyXG4gICAgICBpZigkd2luZG93LmxvY2FsU3RvcmFnZSkge1xyXG4gICAgICAgICR3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInLCBKU09OLnN0cmluZ2lmeShfdXNlcikpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIGNvbnNvbGUubG9nKF91c2VyKTtcclxuICAgIH1cclxuICAgICByZXR1cm4ge1xyXG4gICAgICAgIGdldExvZ2luVXNlcjogZnVuY3Rpb24ocmVxZGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm4gRGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YSgnL3VzZXIvbG9naW4nLHJlcWRhdGEpXHJcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGludmFsaWQgcmVzcG9uc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZS5kYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkIG9uIGxvZyBpbicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UuZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldFVzZXI6IHNldFVzZXIsXHJcbiAgICAgICAgaXNMb2dnZWRJbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICByZXR1cm4gX3VzZXIgPyB0cnVlIDogZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRVc2VyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgIHJldHVybiBfdXNlcjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGxvZ291dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAkd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdyYXBpZE1vYmlsZS51c2VyJywgbnVsbCk7XHJcbiAgICAgICAgIF91c2VyID0gbnVsbDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFVzZXJQcm9maWxlOiBmdW5jdGlvbihyZXFkYXRhKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBEYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKCcvdXNlci91c2VycHJvZmlsZScscmVxZGF0YSlcclxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW52YWxpZCByZXNwb25zZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZS5kYXRhKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICB9O1xyXG4gIH0pO1xyXG59KSgpOyIsIi8qIChmdW5jdGlvbiAoKSB7XHJcbiAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJykuZmFjdG9yeSgnTWlzU2VydmljZScsIGZ1bmN0aW9uIChEYXRhUHJvdmlkZXJTZXJ2aWNlLCAkcSkge1xyXG4gICAgIHJldHVybiB7XHJcbiAgICAgICAgZ2V0TWV0cmljU25hcHNob3Q6IGZ1bmN0aW9uKHJlcWRhdGEpIHtcclxuICAgICAgICAgIC8vIHRoZSAkaHR0cCBBUEkgaXMgYmFzZWQgb24gdGhlIGRlZmVycmVkL3Byb21pc2UgQVBJcyBleHBvc2VkIGJ5IHRoZSAkcSBzZXJ2aWNlXHJcbiAgICAgICAgICAvLyBzbyBpdCByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdXMgYnkgZGVmYXVsdFxyXG5cclxuICAgICAgcmV0dXJuIERhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEoJy9wYXhmbG5taXMvbWV0cmljc25hcHNob3QnLCByZXFkYXRhKVxyXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIC8vIGludmFsaWQgcmVzcG9uc2VcclxuICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9LCBmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xyXG4gICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0VGFyZ2V0VnNBY3R1YWw6IGZ1bmN0aW9uKHJlcWRhdGEpIHtcclxuICAgICAgcmV0dXJuIERhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEoJy9wYXhmbG5taXMvdGFyZ2V0dnNhY3R1YWwnLCByZXFkYXRhKVxyXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIC8vIGludmFsaWQgcmVzcG9uc2VcclxuICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9LCBmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xyXG4gICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0UmV2ZW51ZUFuYWx5c2lzOiBmdW5jdGlvbihyZXFkYXRhKSB7XHJcbiAgICAgIHJldHVybiBEYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKCcvcGF4ZmxubWlzL3JldmVudWVhbmFseXNpcycsIHJlcWRhdGEpXHJcbiAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgLy8gaW52YWxpZCByZXNwb25zZVxyXG4gICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UuZGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXHJcbiAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UuZGF0YSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXRSb3V0ZVJldmVudWU6IGZ1bmN0aW9uKHJlcWRhdGEpIHtcclxuICAgICAgICAgIHJldHVybiBEYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKCcvcGF4ZmxubWlzL3JvdXRlcmV2ZW51ZScscmVxZGF0YSlcclxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAvLyBpbnZhbGlkIHJlc3BvbnNlXHJcbiAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZS5kYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcclxuICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZS5kYXRhKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldFNlY3RvckNhcnJpZXJBbmFseXNpczogZnVuY3Rpb24ocmVxZGF0YSkge1xyXG4gICAgICAgICAgcmV0dXJuIERhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEoJy9wYXhmbG5taXMvc2VjdG9yY2FycmllcmFuYWx5c2lzJyxyZXFkYXRhKVxyXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIC8vIGludmFsaWQgcmVzcG9uc2VcclxuICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9LCBmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xyXG4gICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0UGF4Rmxvd25NaXNIZWFkZXI6IGZ1bmN0aW9uKHJlcWRhdGEpIHtcclxuICAgICAgcmV0dXJuIERhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEoJy9wYXhmbG5taXMvcGF4Zmxvd25taXNoZWFkZXInLCByZXFkYXRhKVxyXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIC8vIGludmFsaWQgcmVzcG9uc2VcclxuICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9LCBmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xyXG4gICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0Um91dGVSZXZlbnVlRHJpbGxEb3duOiBmdW5jdGlvbihyZXFkYXRhKSB7XHJcbiAgICAgICAgICByZXR1cm4gRGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YSgnL3BheGZsbm1pcy9yb3V0ZXJldmVudWVkcmlsbCcscmVxZGF0YSlcclxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAvLyBpbnZhbGlkIHJlc3BvbnNlXHJcbiAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZS5kYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcclxuICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZS5kYXRhKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgIH07XHJcbiAgICB9KTtcclxufSkoKTsgKi8iLCJcclxuKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG4gICAgLy8gYXR0YWNoIHRoZSBmYWN0b3JpZXMgYW5kIHNlcnZpY2UgdG8gdGhlIFtzdGFydGVyLnNlcnZpY2VzXSBtb2R1bGUgaW4gYW5ndWxhclxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcclxuICAgICAgICAuc2VydmljZSgnUmVwb3J0QnVpbGRlclN2YycsIHJlcG9ydEJ1aWxkZXJTZXJ2aWNlKTtcclxuICAgIFxyXG5cdGZ1bmN0aW9uIHJlcG9ydEJ1aWxkZXJTZXJ2aWNlKCkge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBcclxuICAgICAgICBzZWxmLmdlbmVyYXRlUmVwb3J0ID0gX2dlbmVyYXRlUmVwb3J0OyAgICAgICAgICAgIFxyXG4gICAgICAgIGZ1bmN0aW9uIF9nZW5lcmF0ZVJlcG9ydChwYXJhbSwgY2hhcnRUaXRsZSxmbG93bk1vbnRoKSB7XHJcblx0XHRcdHZhciB0aXRsZSA9IFwiXCI7XHJcblx0XHRcdGlmKHBhcmFtID09IFwibWV0cmljU25hcHNob3RcIilcclxuXHRcdFx0XHR0aXRsZSA9IFwiTUVUUklDIFNOQVBTSE9UIC1cIitmbG93bk1vbnRoK1wiIFwiK2NoYXJ0VGl0bGUudG9VcHBlckNhc2UoKStcIi0gVklFV1wiO1xyXG5cdFx0XHRlbHNlIGlmKHBhcmFtID09IFwidGFyZ2V0QWN0dWFsXCIpXHJcblx0XHRcdFx0dGl0bGUgPSBcIlRBUkdFVCBWUyBBQ1RVQUwgLSBcIisoKGNoYXJ0VGl0bGUgPT0gXCJyZXZlbnVlXCIpP1wiTkVUIFJFVkVOVUVcIjpcIlBBWCBDb3VudFwiKStcIiBcIitmbG93bk1vbnRoKyBcIiAtIFZJRVdcIjtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHRpdGxlID0gY2hhcnRUaXRsZStcIiBcIitmbG93bk1vbnRoK1wiIC0gVklFV1wiO1xyXG5cdFx0XHRcdFx0XHRcdFxyXG5cdFx0XHR2YXIgc3ZnTm9kZSA9IGQzLnNlbGVjdEFsbChcIi5cIitwYXJhbSkuc2VsZWN0QWxsKFwic3ZnXCIpO1xyXG5cdFx0XHR2YXIgY29udGVudCA9IFtdO1xyXG5cdFx0XHR2YXIgaW1hZ2VDb2x1bW4gPSBbXTtcclxuXHRcdFx0dmFyIHRleHRDb2x1bW4gPSBbXTtcclxuXHRcdFx0dmFyIGltYWdlc09iaiA9IHt9O1xyXG5cdFx0XHR2YXIgdGV4dE9iaiA9IHt9O1xyXG5cdFx0XHRjb250ZW50LnB1c2godGl0bGUpO1xyXG5cdFx0XHR2YXIgbm9kZUV4aXN0cyA9IFtdO1xyXG5cdFx0XHRhbmd1bGFyLmZvckVhY2goc3ZnTm9kZSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1x0XHRcdFx0XHJcblx0XHRcdFx0Y29uc29sZS5sb2coa2V5ICsgJzogJyArIHN2Z05vZGVba2V5XVswXS5vdXRlckhUTUwpO1xyXG5cdFx0XHRcdC8vdGV4dE9ialsnYWxpZ25tZW50J10gPSAnY2VudGVyJ1x0XHRcdFx0XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYobm9kZUV4aXN0cy5pbmRleE9mKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1mbGFnXCIpKSA9PSAtMSl7XHJcblx0XHRcdFx0XHR2YXIgaHRtbCA9IHN2Z05vZGVba2V5XVswXS5vdXRlckhUTUw7XHJcblx0XHRcdFx0XHRjYW52Zyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyksIGh0bWwpO1xyXG5cdFx0XHRcdFx0dmFyIHRlc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XHJcblx0XHRcdFx0XHR2YXIgaW1nc3JjID0gdGVzdC50b0RhdGFVUkwoKTtcclxuXHRcdFx0XHRcdHZhciAgdGV4dCA9IFwiXFxuXCIrc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLXRpdGxlXCIpK1wiXFxuXCI7XHJcblx0XHRcdFx0XHR0ZXh0T2JqWyd0ZXh0J10gPSB0ZXh0O1xyXG5cdFx0XHRcdFx0dGV4dENvbHVtbi5wdXNoKHRleHRPYmopO1xyXG5cdFx0XHRcdFx0aW1hZ2VzT2JqWydpbWFnZSddID0gaW1nc3JjO1xyXG5cdFx0XHRcdFx0aW1hZ2VDb2x1bW4ucHVzaChpbWFnZXNPYmopO1x0XHRcdFx0XHJcblx0XHRcdFx0XHR2YXIgaW1nVGVtcCA9e30sIHR4dFRlbXAgPXt9O1x0XHRcclxuXHRcdFx0XHRcdHR4dFRlbXBbJ2NvbHVtbnMnXSA9IHRleHRDb2x1bW47XHJcblx0XHRcdFx0XHRpbWdUZW1wWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInO1xyXG5cdFx0XHRcdFx0aW1nVGVtcFsnY29sdW1ucyddID0gaW1hZ2VDb2x1bW47XHJcblx0XHRcdFx0XHRjb250ZW50LnB1c2godHh0VGVtcCk7XHJcblx0XHRcdFx0XHRjb250ZW50LnB1c2goaW1nVGVtcCk7XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0aW1hZ2VDb2x1bW4gPSBbXTtcclxuXHRcdFx0XHRcdHRleHRDb2x1bW4gPSBbXTtcclxuXHRcdFx0XHRcdGltYWdlc09iaiA9IHt9O1xyXG5cdFx0XHRcdFx0dGV4dE9iaiA9IHt9O1xyXG5cdFx0XHRcdFx0aW1nVGVtcCA9IHt9O1xyXG5cdFx0XHRcdFx0dHh0VGVtcCA9e307XHJcblx0XHRcdFx0XHRub2RlRXhpc3RzLnB1c2goc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLWZsYWdcIikpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGNvbnRlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0c3R5bGVzOiB7XHJcblx0XHRcdFx0XHRoZWFkZXI6IHtcclxuXHRcdFx0XHRcdFx0Zm9udFNpemU6IDE4LFxyXG5cdFx0XHRcdFx0XHRib2xkOiB0cnVlXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0YmlnZ2VyOiB7XHJcblx0XHRcdFx0XHRcdGZvbnRTaXplOiAxNSxcclxuXHRcdFx0XHRcdFx0aXRhbGljczogdHJ1ZSxcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGRlZmF1bHRTdHlsZToge1xyXG5cdFx0XHRcdFx0Y29sdW1uR2FwOiAyMCxcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG4gICAgfVxyXG59KSgpOyIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuICAgIC8vIGF0dGFjaCB0aGUgc2VydmljZSB0byB0aGUgW3JhcGlkTW9iaWxlXSBtb2R1bGUgaW4gYW5ndWxhclxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcclxuXHQgXHQuc2VydmljZSgnUmVwb3J0U3ZjJywgWyckcScsICckdGltZW91dCcsICdSZXBvcnRCdWlsZGVyU3ZjJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG9ydFN2Y10pO1xyXG5cclxuXHQvLyBnZW5SZXBvcnREZWYgLS0+IGdlblJlcG9ydERvYyAtLT4gYnVmZmVyW10gLS0+IEJsb2IoKSAtLT4gc2F2ZUZpbGUgLS0+IHJldHVybiBmaWxlUGF0aFxyXG5cclxuXHQgZnVuY3Rpb24gcmVwb3J0U3ZjKCRxLCAkdGltZW91dCwgUmVwb3J0QnVpbGRlclN2Yykge1xyXG5cdFx0IHRoaXMucnVuUmVwb3J0QXN5bmMgPSBfcnVuUmVwb3J0QXN5bmM7XHJcblx0XHQgdGhpcy5ydW5SZXBvcnREYXRhVVJMID0gX3J1blJlcG9ydERhdGFVUkw7XHJcblxyXG5cdFx0Ly8gUlVOIEFTWU5DOiBydW5zIHRoZSByZXBvcnQgYXN5bmMgbW9kZSB3LyBwcm9ncmVzcyB1cGRhdGVzIGFuZCBkZWxpdmVycyBhIGxvY2FsIGZpbGVVcmwgZm9yIHVzZVxyXG5cclxuXHRcdCBmdW5jdGlvbiBfcnVuUmVwb3J0QXN5bmMoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKSB7XHJcbiAgICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHQgXHJcbiAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCcxLlByb2Nlc3NpbmcgVHJhbnNjcmlwdCcpO1xyXG4gICAgICAgICAgICAgZ2VuZXJhdGVSZXBvcnREZWYoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKS50aGVuKGZ1bmN0aW9uKGRvY0RlZikge1xyXG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzIuIEdlbmVyYXRpbmcgUmVwb3J0Jyk7XHJcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0RG9jKGRvY0RlZik7XHJcbiAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHBkZkRvYykge1xyXG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzMuIEJ1ZmZlcmluZyBSZXBvcnQnKTtcclxuICAgICAgICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVSZXBvcnRCdWZmZXIocGRmRG9jKTtcclxuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oYnVmZmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnNC4gU2F2aW5nIFJlcG9ydCBGaWxlJyk7XHJcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0QmxvYihidWZmZXIpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihwZGZCbG9iKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnNS4gT3BlbmluZyBSZXBvcnQgRmlsZScpO1xyXG4gICAgICAgICAgICAgICAgIHJldHVybiBzYXZlRmlsZShwZGZCbG9iLHN0YXR1c0ZsYWcpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihmaWxlUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgIC8vaGlkZUxvYWRpbmcoKTtcclxuICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGZpbGVQYXRoKTtcclxuICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9oaWRlTG9hZGluZygpO1xyXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJyArIGVycm9yLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgICAgICB9XHJcblxyXG5cdFx0Ly8gUlVOIERBVEFVUkw6IHJ1bnMgdGhlIHJlcG9ydCBhc3luYyBtb2RlIHcvIHByb2dyZXNzIHVwZGF0ZXMgYW5kIHN0b3BzIHcvIHBkZkRvYyAtPiBkYXRhVVJMIHN0cmluZyBjb252ZXJzaW9uXHJcblxyXG5cdFx0IGZ1bmN0aW9uIF9ydW5SZXBvcnREYXRhVVJMKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkge1xyXG4gICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdFx0IFxyXG4gICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMS5Qcm9jZXNzaW5nIFRyYW5zY3JpcHQnKTtcclxuICAgICAgICAgICAgIGdlbmVyYXRlUmVwb3J0RGVmKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkudGhlbihmdW5jdGlvbihkb2NEZWYpIHtcclxuICAgICAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCcyLiBHZW5lcmF0aW5nIFJlcG9ydCcpO1xyXG4gICAgICAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZVJlcG9ydERvYyhkb2NEZWYpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihwZGZEb2MpIHtcclxuICAgICAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCczLiBDb252ZXJ0IHRvIERhdGFVUkwnKTtcclxuICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0RGF0YVVSTChwZGZEb2MpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihvdXREb2MpIHtcclxuICAgICAgICAgICAgICAgICAvL2hpZGVMb2FkaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShvdXREb2MpO1xyXG4gICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAvL2hpZGVMb2FkaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgZXJyb3IudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbiAgICAgICAgIH1cclxuXHJcblx0XHQvLyAxLkdlbmVyYXRlUmVwb3J0RGVmOiB1c2UgY3VycmVudFRyYW5zY3JpcHQgdG8gY3JhZnQgcmVwb3J0RGVmIEpTT04gZm9yIHBkZk1ha2UgdG8gZ2VuZXJhdGUgcmVwb3J0XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnREZWYoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKSB7XHJcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XHJcblx0XHRcdFxyXG4gICAgICAgICAgICAvLyByZW1vdmVkIHNwZWNpZmljcyBvZiBjb2RlIHRvIHByb2Nlc3MgZGF0YSBmb3IgZHJhZnRpbmcgdGhlIGRvY1xyXG4gICAgICAgICAgICAvLyBsYXlvdXQgYmFzZWQgb24gcGxheWVyLCB0cmFuc2NyaXB0LCBjb3Vyc2VzLCBldGMuXHJcbiAgICAgICAgICAgIC8vIGN1cnJlbnRseSBtb2NraW5nIHRoaXMgYW5kIHJldHVybmluZyBhIHByZS1idWlsdCBKU09OIGRvYyBkZWZpbml0aW9uXHJcbiAgICAgICAgICAgIFxyXG5cdFx0XHQvL3VzZSBycHQgc2VydmljZSB0byBnZW5lcmF0ZSB0aGUgSlNPTiBkYXRhIG1vZGVsIGZvciBwcm9jZXNzaW5nIFBERlxyXG4gICAgICAgICAgICAvLyBoYWQgdG8gdXNlIHRoZSAkdGltZW91dCB0byBwdXQgYSBzaG9ydCBkZWxheSB0aGF0IHdhcyBuZWVkZWQgdG8gXHJcbiAgICAgICAgICAgIC8vIHByb3Blcmx5IGdlbmVyYXRlIHRoZSBkb2MgZGVjbGFyYXRpb25cclxuICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGQgPSB7fTtcclxuICAgICAgICAgICAgICAgIGRkID0gUmVwb3J0QnVpbGRlclN2Yy5nZW5lcmF0ZVJlcG9ydChzdGF0dXNGbGFnLHRpdGxlLGZsb3duTW9udGgpXHJcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShkZCk7XHJcbiAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyAyLkdlbmVyYXRlUnB0RmlsZURvYzogdGFrZSBKU09OIGZyb20gcnB0U3ZjLCBjcmVhdGUgcGRmbWVtb3J5IGJ1ZmZlciwgYW5kIHNhdmUgYXMgYSBsb2NhbCBmaWxlXHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnREb2MoZG9jRGVmaW5pdGlvbikge1xyXG5cdFx0XHQvL3VzZSB0aGUgcGRmbWFrZSBsaWIgdG8gY3JlYXRlIGEgcGRmIGZyb20gdGhlIEpTT04gY3JlYXRlZCBpbiB0aGUgbGFzdCBzdGVwXHJcblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XHJcblx0XHRcdHRyeSB7XHJcbiAgICAgICAgICAgICAgICAvL3VzZSB0aGUgcGRmTWFrZSBsaWJyYXJ5IHRvIGNyZWF0ZSBpbiBtZW1vcnkgcGRmIGZyb20gdGhlIEpTT05cclxuXHRcdFx0XHR2YXIgcGRmRG9jID0gcGRmTWFrZS5jcmVhdGVQZGYoIGRvY0RlZmluaXRpb24gKTtcclxuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocGRmRG9jKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXRjaCAoZSkge1xyXG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gMy5HZW5lcmF0ZVJwdEJ1ZmZlcjogcGRmS2l0IG9iamVjdCBwZGZEb2MgLS0+IGJ1ZmZlciBhcnJheSBvZiBwZGZEb2NcclxuXHJcblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydEJ1ZmZlcihwZGZEb2MpIHtcclxuXHRcdFx0Ly91c2UgdGhlIHBkZm1ha2UgbGliIHRvIGdldCBhIGJ1ZmZlciBhcnJheSBvZiB0aGUgcGRmRG9jIG9iamVjdFxyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHR0cnkge1xyXG4gICAgICAgICAgICAgICAgLy9nZXQgdGhlIGJ1ZmZlciBmcm9tIHRoZSBwZGZEb2NcclxuXHRcdFx0XHRwZGZEb2MuZ2V0QnVmZmVyKGZ1bmN0aW9uKGJ1ZmZlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdFx0ICAgZGVmZXJyZWQucmVzb2x2ZShidWZmZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDNiLmdldERhdGFVUkw6IHBkZktpdCBvYmplY3QgcGRmRG9jIC0tPiBlbmNvZGVkIGRhdGFVcmxcclxuXHJcblx0XHQgZnVuY3Rpb24gZ2V0RGF0YVVSTChwZGZEb2MpIHtcclxuXHRcdFx0Ly91c2UgdGhlIHBkZm1ha2UgbGliIHRvIGNyZWF0ZSBhIHBkZiBmcm9tIHRoZSBKU09OIGNyZWF0ZWQgaW4gdGhlIGxhc3Qgc3RlcFxyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHR0cnkge1xyXG4gICAgICAgICAgICAgICAgLy91c2UgdGhlIHBkZk1ha2UgbGlicmFyeSB0byBjcmVhdGUgaW4gbWVtb3J5IHBkZiBmcm9tIHRoZSBKU09OXHJcblx0XHRcdFx0cGRmRG9jLmdldERhdGFVcmwoZnVuY3Rpb24ob3V0RG9jKSB7XHJcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKG91dERvYyk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdFx0IH1cclxuXHJcblx0XHQvLyA0LkdlbmVyYXRlUmVwb3J0QmxvYjogYnVmZmVyIC0tPiBuZXcgQmxvYiBvYmplY3RcclxuXHJcblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydEJsb2IoYnVmZmVyKSB7XHJcblx0XHRcdC8vdXNlIHRoZSBnbG9iYWwgQmxvYiBvYmplY3QgZnJvbSBwZGZtYWtlIGxpYiB0byBjcmVhdCBhIGJsb2IgZm9yIGZpbGUgcHJvY2Vzc2luZ1xyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHR0cnkge1xyXG4gICAgICAgICAgICAgICAgLy9wcm9jZXNzIHRoZSBpbnB1dCBidWZmZXIgYXMgYW4gYXBwbGljYXRpb24vcGRmIEJsb2Igb2JqZWN0IGZvciBmaWxlIHByb2Nlc3NpbmdcclxuICAgICAgICAgICAgICAgIHZhciBwZGZCbG9iID0gbmV3IEJsb2IoW2J1ZmZlcl0sIHt0eXBlOiAnYXBwbGljYXRpb24vcGRmJ30pO1xyXG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShwZGZCbG9iKTtcclxuICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDUuU2F2ZUZpbGU6IHVzZSB0aGUgRmlsZSBwbHVnaW4gdG8gc2F2ZSB0aGUgcGRmQmxvYiBhbmQgcmV0dXJuIGEgZmlsZVBhdGggdG8gdGhlIGNsaWVudFxyXG5cclxuXHRcdGZ1bmN0aW9uIHNhdmVGaWxlKHBkZkJsb2IsdGl0bGUpIHtcclxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdFx0dmFyIGZpbGVOYW1lID0gdGl0bGUrXCIucGRmXCI7XHJcblx0XHRcdHZhciBmaWxlUGF0aCA9IFwiXCI7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ1NhdmVGaWxlOiByZXF1ZXN0RmlsZVN5c3RlbScpO1xyXG5cdFx0XHRcdHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbShMb2NhbEZpbGVTeXN0ZW0uUEVSU0lTVEVOVCwgMCwgZ290RlMsIGZhaWwpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcignU2F2ZUZpbGVfRXJyOiAnICsgZS5tZXNzYWdlKTtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdFx0dGhyb3coe2NvZGU6LTE0MDEsbWVzc2FnZTondW5hYmxlIHRvIHNhdmUgcmVwb3J0IGZpbGUnfSk7XHJcblx0XHRcdH1cdFx0XHRcclxuXHJcblx0XHRcdGZ1bmN0aW9uIGdvdEZTKGZpbGVTeXN0ZW0pIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdTYXZlRmlsZTogZ290RlMgLS0+IGdldEZpbGUnKTtcclxuXHRcdFx0XHRmaWxlU3lzdGVtLnJvb3QuZ2V0RmlsZShmaWxlTmFtZSwge2NyZWF0ZTogdHJ1ZSwgZXhjbHVzaXZlOiBmYWxzZX0sIGdvdEZpbGVFbnRyeSwgZmFpbCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZ1bmN0aW9uIGdvdEZpbGVFbnRyeShmaWxlRW50cnkpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdTYXZlRmlsZTogZ290RmlsZUVudHJ5IC0tPiAoZmlsZVBhdGgpIC0tPiBjcmVhdGVXcml0ZXInKTtcclxuXHRcdFx0XHRmaWxlUGF0aCA9IGZpbGVFbnRyeS50b1VSTCgpO1xyXG5cdFx0XHRcdGZpbGVFbnRyeS5jcmVhdGVXcml0ZXIoZ290RmlsZVdyaXRlciwgZmFpbCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZ1bmN0aW9uIGdvdEZpbGVXcml0ZXIod3JpdGVyKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcignU2F2ZUZpbGU6IGdvdEZpbGVXcml0ZXIgLS0+IHdyaXRlIC0tPiBvbldyaXRlRW5kKHJlc29sdmUpJyk7XHJcblx0XHRcdFx0d3JpdGVyLm9ud3JpdGVlbmQgPSBmdW5jdGlvbihldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShmaWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdHdyaXRlci5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZXIgZXJyb3I6ICcgKyBlLnRvU3RyaW5nKCkpO1xyXG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0d3JpdGVyLndyaXRlKHBkZkJsb2IpO1xyXG5cdFx0XHR9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBmYWlsKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coZXJyb3IuY29kZSk7XHJcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblx0XHR9XHJcblx0IH1cclxuICAgIFxyXG59KSgpOyIsIihmdW5jdGlvbigpe1xyXG5cdGFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScpLmZhY3RvcnkoJ0NoYXJ0T3B0aW9ucycsIGZ1bmN0aW9uKCkge1xyXG4gIFx0XHRyZXR1cm4ge1xyXG5cdFx0ICAgIGxpbmVDaGFydDoge1xyXG5cdFx0ICAgIFx0b3B0aW9uczogbGluZUNoYXJ0T3B0aW9uc1xyXG5cdFx0ICAgIH0sXHJcblx0XHQgICAgbWV0cmljQmFyQ2hhcnQ6IHtcclxuXHRcdCAgICBcdG9wdGlvbnM6IG1ldHJpY0JhckNoYXJ0T3B0aW9uc1xyXG5cdFx0ICAgIH0sXHJcblx0XHQgICAgdGFyZ2V0QmFyQ2hhcnQ6IHtcclxuXHRcdCAgICBcdG9wdGlvbnM6IHRhcmdldEJhckNoYXJ0T3B0aW9uc1xyXG5cdFx0ICAgIH0sXHJcblx0XHQgICAgcGFzc2VuZ2VyQ291bnRDaGFydDoge1xyXG5cdFx0ICAgIFx0b3B0aW9uczogbXVsdGlCYXJDaGFydE9wdGlvbnNcclxuXHRcdCAgICB9XHJcbiAgXHRcdH07XHJcbiAgXHRcdGZ1bmN0aW9uIGxpbmVDaGFydE9wdGlvbnMoKSB7XHJcblx0ICBcdFx0cmV0dXJuIHtcclxuXHQgICAgICAgICAgICBjaGFydDoge1xyXG5cdCAgICAgICAgICAgICAgICB0eXBlOiAnbGluZUNoYXJ0JyxcclxuXHQgICAgICAgICAgICAgICAgaGVpZ2h0OiAyNTAsXHJcblx0ICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuXHQgICAgICAgICAgICAgICAgICAgIHRvcDogNSxcclxuXHQgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiA1MCxcclxuXHQgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogNTAsXHJcblx0ICAgICAgICAgICAgICAgICAgICBsZWZ0OiA1MFxyXG5cdCAgICAgICAgICAgICAgICB9LFxyXG5cdCAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXsgcmV0dXJuIGQueHZhbDsgfSxcclxuXHQgICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7IHJldHVybiBkLnl2YWw7IH0sXHJcblx0ICAgICAgICAgICAgICAgIHVzZUludGVyYWN0aXZlR3VpZGVsaW5lOiB0cnVlLFxyXG5cdCAgICAgICAgICAgICAgICBkaXNwYXRjaDoge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgc3RhdGVDaGFuZ2U6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcInN0YXRlQ2hhbmdlXCIpOyB9LFxyXG5cdCAgICAgICAgICAgICAgICAgICAgY2hhbmdlU3RhdGU6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcImNoYW5nZVN0YXRlXCIpOyB9LFxyXG5cdCAgICAgICAgICAgICAgICAgICAgdG9vbHRpcFNob3c6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcInRvb2x0aXBTaG93XCIpOyB9LFxyXG5cdCAgICAgICAgICAgICAgICAgICAgdG9vbHRpcEhpZGU6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcInRvb2x0aXBIaWRlXCIpOyB9XHJcblx0ICAgICAgICAgICAgICAgIH0sXHJcblx0ICAgICAgICAgICAgICAgIHhBeGlzOiB7XHJcblx0ICAgICAgICAgICAgICAgICAgICB0aWNrRm9ybWF0OiBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFx0cmV0dXJuIGQzLnRpbWUuZm9ybWF0KCclYicpKG5ldyBEYXRlKGQpKVxyXG4gICAgICAgICAgICAgICAgICAgIFx0fVxyXG5cdCAgICAgICAgICAgICAgICB9LFxyXG5cdCAgICAgICAgICAgICAgICB5QXhpczoge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsOiAnJyxcclxuXHQgICAgICAgICAgICAgICAgICAgIHRpY2tGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xyXG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJy4wMmYnKShkKTtcclxuXHQgICAgICAgICAgICAgICAgICAgIH0sXHJcblx0ICAgICAgICAgICAgICAgICAgICBheGlzTGFiZWxEaXN0YW5jZTogLTEwXHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHRcdCAgICAgICAgfVxyXG5cdCAgICAgICAgfTsgIFxyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gbXVsdGlCYXJDaGFydE9wdGlvbnMoKSB7XHJcblx0ICBcdFx0cmV0dXJuIHtcclxuXHQgICAgICAgICAgICBjaGFydDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtdWx0aUJhckNoYXJ0JyxcclxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogMzAwLFxyXG4gICAgICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9wOiAxMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDI1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBib3R0b206IDMwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiAyNVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc2hvd0xlZ2VuZCA6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpe3JldHVybiBkLmxhYmVsO30sXHJcbiAgICAgICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWUgKyAoMWUtMTApO30sXHJcbiAgICAgICAgICAgICAgICAgICAgc2hvd1ZhbHVlczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICByZWR1Y2VYVGlja3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHNob3dDb250cm9sczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVGb3JtYXQ6IGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLC40ZicpKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgeEF4aXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgIGF4aXNMYWJlbERpc3RhbmNlOiAzMFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBzaG93WEF4aXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDcwMFxyXG4gICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgfTsgIFxyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gbWV0cmljQmFyQ2hhcnRPcHRpb25zKCkge1xyXG5cdCAgXHRcdHJldHVybiB7XHJcblx0ICAgICAgICAgICAgY2hhcnQ6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY3JldGVCYXJDaGFydCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAyMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgbWFyZ2luIDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3A6IDIwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodDogMjUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogMjVcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpe3JldHVybiBkLmxhYmVsO30sXHJcbiAgICAgICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWV9LFxyXG4gICAgICAgICAgICAgICAgICAgIHVzZUludGVyYWN0aXZlR3VpZGVsaW5lOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHNob3dWYWx1ZXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuZm9ybWF0KCcsLjJmJykoZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB0b29sdGlwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHNob3dZQXhpczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgc2hvd1hBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNzAwXHJcbiAgICAgICAgICAgICAgICB9XHJcblx0ICAgICAgICB9OyAgXHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiB0YXJnZXRCYXJDaGFydE9wdGlvbnMoKSB7XHJcblx0ICBcdFx0cmV0dXJuIHtcclxuICAgICAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY3JldGVCYXJDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IDIwLFxyXG4gICAgICAgICAgICAgICAgICByaWdodDogNTAsXHJcbiAgICAgICAgICAgICAgICAgIGJvdHRvbTogMjAsXHJcbiAgICAgICAgICAgICAgICAgIGxlZnQ6IDc1XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXtyZXR1cm4gZC5sYWJlbDt9LFxyXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWUgKyAoMWUtMTApO30sXHJcbiAgICAgICAgICAgICAgICBzaG93VmFsdWVzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlRm9ybWF0OiBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuZm9ybWF0KCcsLjJmJykoZCk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDcwMFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTsgIFxyXG5cdFx0fVxyXG4gIH0pO1xyXG59KSgpOyIsIihmdW5jdGlvbiAoKXtcclxuICAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJykuZmFjdG9yeSgnRGF0YVByb3ZpZGVyU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgJHEsICRyb290U2NvcGUsIE5ldFNlcnZpY2UpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgbmV0U2VydmljZTogTmV0U2VydmljZSxcclxuICAgICAgICAgJHE6ICRxLFxyXG4gICAgICAgICAkcm9vdFNjb3BlOiAkcm9vdFNjb3BlLFxyXG4gICAgICAgICBpc0Nvbm5lY3RlZFRvTmV0d29yazogdHJ1ZSxcclxuXHJcbiAgICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKHJlcSkge1xyXG4gICAgICAgICAgICB2YXIgZGVmID0gdGhpcy4kcS5kZWZlcigpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5oYXNOZXR3b3JrQ29ubmVjdGlvbigpKSB7XHJcbiAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKHRoaXMubmV0U2VydmljZS5nZXREYXRhKHJlcSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICB0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnbm9OZXR3b3JrJyk7XHJcbiAgICAgICAgICAgICAgIGRlZi5yZWplY3QoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZGVmLnByb21pc2U7XHJcbiAgICAgICAgIH0sXHJcbiAgICAgICAgIHBvc3REYXRhOiBmdW5jdGlvbiAocmVxLCBkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBkZWYgPSB0aGlzLiRxLmRlZmVyKCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcclxuICAgICAgICAgICAgICAgZGVmLnJlc29sdmUodGhpcy5uZXRTZXJ2aWNlLnBvc3REYXRhKHJlcSwgZGF0YSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XHJcbiAgICAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdub05ldHdvcmsnKTtcclxuICAgICAgICAgICAgICAgZGVmLnJlamVjdCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBkZWYucHJvbWlzZTtcclxuICAgICAgICAgfSxcclxuICAgICAgICAgZGVsZXRlRGF0YTogZnVuY3Rpb24gKHJlcSkge1xyXG4gICAgICAgICAgICB2YXIgZGVmID0gdGhpcy4kcS5kZWZlcigpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5oYXNOZXR3b3JrQ29ubmVjdGlvbigpKSB7XHJcbiAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKHRoaXMubmV0U2VydmljZS5kZWxldGVEYXRhKHJlcSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XHJcbiAgICAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdub05ldHdvcmsnKTtcclxuICAgICAgICAgICAgICAgZGVmLnJlamVjdCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBkZWYucHJvbWlzZTtcclxuICAgICAgICAgfSxcclxuICAgICAgICAgaGFzTmV0d29ya0Nvbm5lY3Rpb246IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIChuYXZpZ2F0b3Iub25MaW5lIHx8IHRoaXMuaXNDb25uZWN0ZWRUb05ldHdvcmspO1xyXG4gICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgIH0pO1xyXG59KSgpOyIsIihmdW5jdGlvbigpe1xyXG4gICAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJykuZmFjdG9yeSgnTmV0U2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgJHEsICRyb290U2NvcGUpIHtcclxuICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24gKGZyb21VcmwpIHtcclxuICAgICAgICAgICAgdmFyIHVybCA9IFNFUlZFUl9VUkwgKyBmcm9tVXJsO1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KHVybCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBwb3N0RGF0YTogZnVuY3Rpb24gKHRvVXJsLCBkYXRhKSB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuYWRkTWV0YUluZm8oZGF0YSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdChTRVJWRVJfVVJMICsgdG9VcmwsIHRoaXMuYWRkTWV0YUluZm8oZGF0YSkpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZGVsZXRlRGF0YTogZnVuY3Rpb24gKHRvVXJsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoU0VSVkVSX1VSTCArIHRvVXJsKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGFkZE1ldGFJbmZvOiBmdW5jdGlvbiAocmVxdWVzdERhdGEpIHtcclxuICAgICAgICAgICAgdmFyIG1ldGFJbmZvID0ge1xyXG4gICAgICAgICAgICAgICAgJ2NoYW5uZWxJZGVudGlmaWVyJzogJ01PQicsXHJcbiAgICAgICAgICAgICAgICAnZGF0ZVRpbWVTdGFtcCc6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG4gICAgICAgICAgICAgICAgJ293bmVyQ2FycmllckNvZGUnOiAnWFgnLFxyXG4gICAgICAgICAgICAgICAgJ2FkZGl0aW9uYWxJbmZvJzoge1xyXG4gICAgICAgICAgICAgICAgICAgICdkZXZpY2VUeXBlJzogJ1Bob25lJyxcclxuICAgICAgICAgICAgICAgICAgICAnbW9kZWwnOiAnZGV2aWNlIEluZm8nLFxyXG4gICAgICAgICAgICAgICAgICAgICdvc1R5cGUnOiAnaW9zJyxcclxuICAgICAgICAgICAgICAgICAgICAnb3NWZXJzaW9uJzogJzguNCcsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJkZXZpY2VUb2tlblwiOiBcInN0cmluZ1wiXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB2YXIgcmVxdWVzdE9iaiA9IHtcclxuICAgICAgICAgICAgICAgICdtZXRhSW5mbyc6IG1ldGFJbmZvLFxyXG4gICAgICAgICAgICAgICAgJ3JlcXVlc3REYXRhJzogcmVxdWVzdERhdGFcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RPYmo7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgIH07XHJcbiAgICB9KTtcclxufSkoKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
