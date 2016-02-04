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
        var url = SERVER_URL + fromUrl;
        return this.$http.get(url);
    };
    NetService.prototype.postData = function (toUrl, data, config) {
        return this.$http.post(SERVER_URL + toUrl, this.addMetaInfo(data));
    };
    NetService.prototype.deleteData = function (toUrl) {
        return this.$http.delete(SERVER_URL + toUrl);
    };
    NetService.prototype.uploadFile = function (toUrl, urlFile, options, successCallback, errorCallback, progressCallback) {
        if (!this.fileTransfer) {
            this.fileTransfer = new FileTransfer();
        }
        console.log(options.params);
        this.fileTransfer.onprogress = progressCallback;
        var url = SERVER_URL + toUrl;
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
        var model = 'device Info';
        var osType = '8.4';
        var osVersion = 'ios';
        var deviceToken = 'string';
        if (device) {
            model = ionic.Platform.device().model;
            osType = ionic.Platform.device().platform;
            osVersion = ionic.Platform.device().version;
        }
        if (!model) {
            model = 'device Info';
        }
        if (!osType) {
            osType = '8.4';
        }
        if (!osVersion) {
            osVersion = 'ios';
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
                def.resolve(httpResponse);
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
    MisService.prototype.getDrillDown = function (reqdata, URL) {
        var requestUrl = URL;
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
                            // misCtrl.openBarDrillDownPopover(d3.event, e, -1);
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
    ChartoptionService.prototype.targetBarChartOptions = function (misCtrl) {
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
                discretebar: {
                    dispatch: {
                        elementDblClick: function (e) {
                            misCtrl.openTargetDrillDownPopover(d3.event, e, -1);
                        }
                    }
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
    FilteredListService.prototype.searched = function (valLists, toSearch, level, drilltype) {
        return _.filter(valLists, function (i) {
            /* Search Text in all 3 fields */
            return searchUtil(i, toSearch, level, drilltype);
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
    if (drilltype == 'flight-process') {
        if (item.countryFrom && item.countryTo && level == 0) {
            return (item.countryFrom.toLowerCase().indexOf(toSearch.toLowerCase()) > -1 || item.countryTo.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flownSector && level == 1) {
            return (item.flownSector.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flightNumber && level == 2) {
            return (item.flightNumber.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item['carrierCode#'] && level == 3) {
            return (item['carrierCode#'].toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else {
            return false;
        }
    }
    if (drilltype == 'flight-count') {
        if (item.flightNumber && level == 0) {
            return (item.flightNumber.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item['carrierCode'] && level == 1) {
            return (item['carrierCode'].toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else {
            return false;
        }
    }
    if (drilltype == 'coupon-count') {
        if (item.flightNumber && level == 0) {
            return (item.flightNumber.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item['flownSector'] && level == 1) {
            return (item['flownSector'].toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else {
            return false;
        }
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
    OperationalService.prototype.getDrillDown = function (reqdata, URL) {
        var requestUrl = URL;
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
        var requestUrl = '/user/login';
        var def = this.$q.defer();
        var requestObj = {
            userId: _userName,
            password: _password
        };
        this.setUser({ username: "" });
        this.dataProviderService.postData(requestUrl, requestObj).then(function (response) {
            if (typeof response.data === 'object') {
                def.resolve(response.data);
            }
            else {
                def.reject(response.data);
            }
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
    UserService.$inject = ['DataProviderService', '$q', 'LocalStorageService', '$window'];
    return UserService;
})();

/// <reference path="../../_libs.ts" />
/// <reference path="../../components/mis/services/MisService.ts" />
/// <reference path="../../components/mis/services/FilteredListService.ts" />
/// <reference path="../../components/mis/services/ChartoptionService.ts" />
/// <reference path="../../components/user/services/UserService.ts" />
var MisController = (function () {
    function MisController($scope, $ionicLoading, $timeout, $window, $ionicPopover, $filter, misService, chartoptionService, filteredListService, userService, reportSvc) {
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
        this.userService = userService;
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
        //this.$scope.$watch('MisCtrl.header.surcharge', () => { this.onSlideMove({index:this.header.tabIndex}); }, true);
        this.initData();
        this.$scope.$on('onSlideMove', function (event, response) {
            _this.$scope.MisCtrl.onSlideMove(response);
        });
        this.$scope.$on('openDrillPopup', function (event, response) {
            if (response.type == 'metric') {
                _this.$scope.MisCtrl.openBarDrillDownPopover(response.event, { "point": response.data }, -1);
            }
        });
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
            targetBarChart: this.chartoptionService.targetBarChartOptions(this),
            passengerChart: this.chartoptionService.multiBarChartOptions()
        };
        var req = {
            userId: this.$window.localStorage.getItem('rapidMobile.user')
        };
        this.misService.getPaxFlownMisHeader(req).then(function (data) {
            that.subHeader = data.response.data;
            that.header.flownMonth = that.subHeader.paxFlownMisMonths[0].flowMonth;
            that.onSlideMove({ index: 0 });
        }, function (error) {
            console.log('an error occured');
        });
        //
        that.header.username = that.getProfileUserName();
    };
    MisController.prototype.selectedFlownMonth = function (month) {
        return (month == this.header.flownMonth);
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
    MisController.prototype.getProfileUserName = function () {
        var obj = this.$window.localStorage.getItem('rapidMobile.user');
        var profileUserName = JSON.parse(obj);
        return profileUserName.username;
    };
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
        this.header.tabIndex = data.index;
        this.toggle.chartOrTable = "chart";
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
        selFindLevel = Number(selFindLevel);
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
        for (var i = level; i < this.groups.length; i++) {
            this.groups[i].items.splice(0, 1);
            this.groups[i].orgItems.splice(0, 1);
            this.sort('paxCount', i, false);
        }
    };
    MisController.prototype.drillDownRequest = function (drillType, selFindLevel, data) {
        var reqdata;
        if (drillType == 'bar') {
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
        if (drillType == 'target') {
            var drillLevel = (selFindLevel + 2);
            if (data.label) {
                this.drillBarLabel = data.label;
            }
            var routetype;
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
        return reqdata;
    };
    MisController.prototype.getDrillDownURL = function (drilDownType) {
        var url;
        switch (drilDownType) {
            case 'bar':
                url = "/paxflnmis/mspaxnetrevdrill";
                break;
            case 'target':
                url = "/paxflnmis/tgtvsactdrill";
                break;
        }
        return url;
    };
    MisController.prototype.openBarDrillDown = function (data, selFindLevel) {
        selFindLevel = Number(selFindLevel);
        var that = this;
        this.selectedDrill[selFindLevel] = data;
        this.selectedDrill[selFindLevel + 1] = '';
        if (selFindLevel != (this.groups.length - 1)) {
            var drillLevel = (selFindLevel + 2);
            var reqdata = this.drillDownRequest(this.drillType, selFindLevel, data);
            var URL = this.getDrillDownURL(this.drillType);
            this.misService.getDrillDown(reqdata, URL)
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
        this.groups = [];
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
        this.drillName = 'METRIC SNAPSHOT REPORT - ' + selData.point.label;
        this.drillType = 'bar';
        this.drillBarpopover.show($event);
        this.drilltabs = ['Route Level', 'Sector Level', 'Data Level', 'Flight Level'];
        this.initiateArray(this.drilltabs);
        this.openBarDrillDown(selData.point, selFindLevel);
    };
    ;
    MisController.prototype.openTargetDrillDownPopover = function ($event, selData, selFindLevel) {
        this.drillName = 'Target Vs Actual';
        this.drillType = 'target';
        this.drillBarpopover.show($event);
        this.drilltabs = ['Route Type', 'Route code'];
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
        this.groups[level].items[0] = this.filteredListService.searched(this.groups[level].orgItems[0], obj.searchText, level, this.drillType);
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
    MisController.prototype.setPage = function (level, pageno) {
        this.currentPage[level] = pageno;
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
    MisController.prototype.range = function (total, level) {
        var ret = [];
        var start;
        start = Number(this.currentPage[level]) - 2;
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
        this.toggle.chartOrTable = val;
    };
    MisController.prototype.runReport = function (chartTitle, monthOrYear, flownMonth) {
        var that = this;
        //if no cordova, then running in browser and need to use dataURL and iframe
        if (!window.cordova) {
            that.ionicLoadingShow();
            this.reportSvc.runReportDataURL(chartTitle, monthOrYear, flownMonth)
                .then(function (dataURL) {
                that.ionicLoadingHide();
                //set the iframe source to the dataURL created
                //console.log(dataURL);
                //document.getElementById('pdfImage').src = dataURL;
            }, function (error) {
                that.ionicLoadingHide();
                console.log('Error ');
            });
            return true;
        }
        else {
            that.ionicLoadingShow();
            this.reportSvc.runReportAsync(chartTitle, monthOrYear, flownMonth)
                .then(function (filePath) {
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
                cordova.plugins.fileOpener2.open(fileName, 'application/pdf', {
                    error: function (e) {
                        console.log('Error status: ' + e.status + ' - Error message: ' + e.message);
                    },
                    success: function () {
                        console.log('file opened successfully');
                    }
                });
            }, function (error) {
                that.ionicLoadingHide();
                console.log('Error ');
            });
            return true;
        }
    };
    MisController.$inject = ['$scope', '$ionicLoading', '$timeout', '$window', '$ionicPopover',
        '$filter', 'MisService', 'ChartoptionService', 'FilteredListService', 'UserService', 'ReportSvc'];
    return MisController;
})();

/// <reference path="../../../_libs.ts" />
/// <reference path="../services/OperationalService.ts" />
/// <reference path="../../mis/services/FilteredListService.ts" />
var OperationalFlownController = (function () {
    function OperationalFlownController($scope, $ionicLoading, $ionicPopover, $filter, operationalService, $ionicSlideBoxDelegate, $timeout, $window, reportSvc, filteredListService) {
        this.$scope = $scope;
        this.$ionicLoading = $ionicLoading;
        this.$ionicPopover = $ionicPopover;
        this.$filter = $filter;
        this.operationalService = operationalService;
        this.$ionicSlideBoxDelegate = $ionicSlideBoxDelegate;
        this.$timeout = $timeout;
        this.$window = $window;
        this.reportSvc = reportSvc;
        this.filteredListService = filteredListService;
        this.carouselIndex = 0;
        this.threeBarChartColors = ['#4EB2F9', '#FFC300', '#5C6BC0'];
        this.fourBarChartColors = ['#7ED321', '#4EB2F9', '#FFC300', '#5C6BC0'];
        this.pageSize = 4;
        this.currentPage = [];
        this.selectedDrill = [];
        this.groups = [];
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
        var that = this;
        this.$scope.$on('elementClick.directive', function (angularEvent, event) {
            if (that.header.tabIndex == 1 && !isNaN(event.point[0])) {
                that.openFlightProcessDrillPopover(event.e, event, -1);
            }
            if (that.header.tabIndex == 3 && !isNaN(event.point[0])) {
                that.openCounponCountDrillPopover(event.e, event, -1);
            }
            if (that.header.tabIndex == 2 && !isNaN(event.point[0])) {
                that.openFlightCountDrillPopover(event.e, event, -1);
            }
        });
    }
    OperationalFlownController.prototype.initData = function () {
        var that = this;
        this.$ionicPopover.fromTemplateUrl('components/operational/flown/drildown.html', {
            scope: that.$scope
        }).then(function (drillpopover) {
            that.drillpopover = drillpopover;
        });
        this.$ionicPopover.fromTemplateUrl('components/operational/flown/infotooltip.html', {
            scope: that.$scope
        }).then(function (infopopover) {
            that.infopopover = infopopover;
        });
        var req = {
            userId: that.$window.localStorage.getItem('rapidMobile.user')
        };
        this.operationalService.getPaxFlownOprHeader(req).then(function (data) {
            that.subHeader = data.response.data;
            // console.log(that.subHeader.paxFlownOprMonths);
            that.header.flownMonth = that.subHeader.defaultMonth;
            // console.log(that.header.flownMonth);
            that.onSlideMove({ index: 0 });
        }, function (error) {
            console.log('an error occured');
        });
        that.header.userName = that.getProfileUserName();
    };
    OperationalFlownController.prototype.selectedFlownMonth = function (month) {
        return (month == this.header.flownMonth);
    };
    OperationalFlownController.prototype.getProfileUserName = function () {
        var obj = this.$window.localStorage.getItem('rapidMobile.user');
        var profileUserName = JSON.parse(obj);
        return profileUserName.username;
    };
    OperationalFlownController.prototype.onSlideMove = function (data) {
        this.header.tabIndex = data.index;
        this.toggle.chartOrTable = "chart";
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
            flownMonth: this.header.flownMonth,
            userId: this.header.userName,
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
            flownMonth: this.header.flownMonth,
            userId: this.header.userName,
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
            flownMonth: this.header.flownMonth,
            userId: this.header.userName,
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
        this.toggle.chartOrTable = val;
    };
    OperationalFlownController.prototype.runReport = function (chartTitle, monthOrYear, flownMonth) {
        var that = this;
        //if no cordova, then running in browser and need to use dataURL and iframe
        if (!window.cordova) {
            that.ionicLoadingShow();
            this.reportSvc.runReportDataURL(chartTitle, monthOrYear, flownMonth)
                .then(function (dataURL) {
                that.ionicLoadingHide();
                //set the iframe source to the dataURL created
                //console.log(dataURL);
                //document.getElementById('pdfImage').src = dataURL;
            }, function (error) {
                that.ionicLoadingHide();
                console.log('Error ');
            });
            return true;
        }
        else {
            that.ionicLoadingShow();
            this.reportSvc.runReportAsync(chartTitle, monthOrYear, flownMonth)
                .then(function (filePath) {
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
                cordova.plugins.fileOpener2.open(fileName, 'application/pdf', {
                    error: function (e) {
                        console.log('Error status: ' + e.status + ' - Error message: ' + e.message);
                    },
                    success: function () {
                        console.log('file opened successfully');
                    }
                });
            }, function (error) {
                that.ionicLoadingHide();
                console.log('Error ');
            });
            return true;
        }
    };
    OperationalFlownController.prototype.openFlightProcessDrillPopover = function ($event, data, selFindLevel) {
        this.drillName = 'FLIGHT PROCESSING STATUS - ' + data.point[0] + '-' + this.header.flownMonth;
        this.drillType = 'flight-process';
        this.drillpopover.show($event);
        this.shownGroup = 0;
        this.groups = [];
        this.drilltabs = ['Country Level', 'Sector Level', 'Flight Level', 'Document Level'];
        this.initiateArray(this.drilltabs);
        this.openDrillDown(data.point, selFindLevel);
    };
    ;
    OperationalFlownController.prototype.openCounponCountDrillPopover = function ($event, data, selFindLevel) {
        this.drillName = 'COUPON COUNT BY EXCEPTION CATEGORY ';
        this.drillType = 'coupon-count';
        this.drillpopover.show($event);
        this.shownGroup = 0;
        this.groups = [];
        this.drilltabs = ['Coupon Count Flight Status', 'Document Level'];
        this.initiateArray(this.drilltabs);
        this.openDrillDown(data.point, selFindLevel);
    };
    ;
    OperationalFlownController.prototype.openFlightCountDrillPopover = function ($event, data, selFindLevel) {
        this.drillName = 'LIST OF OPEN FLIGHTS FOR ' + data.point[0] + '-' + this.header.flownMonth + ' BY REASON ';
        this.drillType = 'flight-count';
        this.drillpopover.show($event);
        this.shownGroup = 0;
        this.groups = [];
        this.drilltabs = ['Open Flight Status', 'Document Level'];
        this.initiateArray(this.drilltabs);
        this.openDrillDown(data.point, selFindLevel);
    };
    ;
    OperationalFlownController.prototype.drillDownRequest = function (drillType, selFindLevel, data) {
        var reqdata;
        if (drillType == 'flight-process') {
            var drillLevel = (selFindLevel + 2);
            if (data.label) {
                this.drillBarLabel = data[0];
            }
            var flightDate;
            //flightDate = (data.flightDate && drillLevel > 1) ? String(data.flightDate) : String(data[0]);
            flightDate = (data.flightDate && drillLevel > 1) ? data.flightDate : 1;
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
            flightDate = (data.flightDate && drillLevel > 1) ? data.flightDate : 1;
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
            flightDate = (data.flightDate && drillLevel > 1) ? data.flightDate : 1;
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
    };
    OperationalFlownController.prototype.getDrillDownURL = function (drilDownType) {
        var url;
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
    };
    OperationalFlownController.prototype.tabSlideHasChanged = function (index) {
        var data = this.groups[0].completeData[0];
        this.groups[0].items[0] = data[index].values;
        this.groups[0].orgItems[0] = data[index].values;
        this.sort('', 0, false);
        this.exceptionCategory = data[index].key;
    };
    OperationalFlownController.prototype.openDrillDown = function (data, selFindLevel) {
        selFindLevel = Number(selFindLevel);
        var that = this;
        this.selectedDrill[selFindLevel] = data;
        this.selectedDrill[selFindLevel + 1] = '';
        if (selFindLevel != (this.groups.length - 1)) {
            var drillLevel = (selFindLevel + 2);
            var reqdata = this.drillDownRequest(this.drillType, selFindLevel, data);
            var URL = this.getDrillDownURL(this.drillType);
            this.operationalService.getDrillDown(reqdata, URL)
                .then(function (data) {
                that.ionicLoadingHide();
                var data = data.response;
                console.log(data);
                var findLevel = drillLevel - 1;
                if (data.status == 'success') {
                    var respResult;
                    if (data.data.rows) {
                        respResult = data.data.rows;
                    }
                    else {
                        respResult = data.data;
                    }
                    if ((that.drillType == 'coupon-count' || that.drillType == 'flight-count') && data.data.rows) {
                        that.groups[findLevel].items[0] = respResult[0].values;
                        that.groups[findLevel].orgItems[0] = respResult[0].values;
                        that.groups[findLevel].completeData[0] = respResult;
                        that.exceptionCategory = respResult[0].key;
                    }
                    else {
                        that.groups[findLevel].items[0] = respResult;
                        that.groups[findLevel].orgItems[0] = respResult;
                    }
                    that.shownGroup = findLevel;
                    that.sort('', findLevel, false);
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
    OperationalFlownController.prototype.closeDrillPopover = function () {
        this.drillpopover.hide();
    };
    OperationalFlownController.prototype.clearDrill = function (level) {
        var i;
        for (var i = level; i < this.drilltabs.length; i++) {
            this.groups[i].items.splice(0, 1);
            this.groups[i].orgItems.splice(0, 1);
            this.sort('', i, false);
        }
    };
    OperationalFlownController.prototype.initiateArray = function (drilltabs) {
        for (var i in drilltabs) {
            this.groups[i] = {
                id: i,
                name: this.drilltabs[i],
                items: [],
                orgItems: [],
                ItemsByPage: [],
                completeData: []
            };
        }
    };
    OperationalFlownController.prototype.isDrillRowSelected = function (level, obj) {
        return this.selectedDrill[level] == obj;
    };
    OperationalFlownController.prototype.searchResults = function (level, obj) {
        this.groups[level].items[0] = this.filteredListService.searched(this.groups[level].orgItems[0], obj.searchText, level, this.drillType);
        if (obj.searchText == '') {
            this.resetAll(level);
            this.groups[level].items[0] = this.groups[level].orgItems[0];
        }
        this.currentPage[level] = 0;
        this.pagination(level);
    };
    OperationalFlownController.prototype.pagination = function (level) {
        this.groups[level].ItemsByPage = this.filteredListService.paged(this.groups[level].items[0], this.pageSize);
    };
    ;
    OperationalFlownController.prototype.setPage = function (level, pageno) {
        this.currentPage[level] = pageno;
    };
    ;
    OperationalFlownController.prototype.lastPage = function (level) {
        this.currentPage[level] = this.groups[level].ItemsByPage.length - 1;
    };
    ;
    OperationalFlownController.prototype.resetAll = function (level) {
        this.currentPage[level] = 0;
    };
    OperationalFlownController.prototype.sort = function (sortBy, level, order) {
        this.resetAll(level);
        this.columnToOrder = sortBy;
        //$Filter - Standard Service
        this.groups[level].items[0] = this.$filter('orderBy')(this.groups[level].items[0], this.columnToOrder, order);
        this.pagination(level);
    };
    ;
    OperationalFlownController.prototype.range = function (total, level) {
        var ret = [];
        var start;
        start = Number(this.currentPage[level]) - 2;
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
    };
    OperationalFlownController.prototype.toggleGroup = function (group) {
        if (this.isGroupShown(group)) {
            this.shownGroup = null;
        }
        else {
            this.shownGroup = group;
        }
    };
    OperationalFlownController.prototype.isGroupShown = function (group) {
        return this.shownGroup == group;
    };
    OperationalFlownController.$inject = ['$scope', '$ionicLoading', '$ionicPopover', '$filter',
        'OperationalService', '$ionicSlideBoxDelegate', '$timeout', '$window', 'ReportSvc', 'FilteredListService'];
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
            SERVER_URL = 'http://' + this.ipaddress + '/' + 'rapid-ws/services/rest';
            this.userService.login(this.username, this.password).then(function (result) {
                if (result.response.status == "success") {
                    var req = {
                        userId: _this.username
                    };
                    _this.userService.getUserProfile(req).then(function (profile) {
                        var userName = {
                            username: profile.response.data.userInfo.userName
                        };
                        _this.userService.setUser(userName);
                        _this.$state.go("app.mis-flown");
                    }, function (error) {
                        console.log('an error occured on loading user profile');
                    });
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

/// <reference path="../../_libs.ts" />
var ChartEvent = (function () {
    function ChartEvent($timeout, $rootScope) {
        var _this = this;
        this.$timeout = $timeout;
        this.$rootScope = $rootScope;
        this.restrict = 'E';
        this.scope = {
            type: "="
        };
        this.link = function ($scope, iElement, attributes, $sce) {
            var self = _this;
            var nvd3 = iElement.find('nvd3')[0];
            var selectedElem = angular.element(nvd3);
            self.$timeout(function () {
                selectedElem.ready(function (e) {
                    var childElem = selectedElem.find('g');
                    angular.forEach(childElem, function (elem, key) {
                        if (elem.attributes['class']) {
                            var className = elem.attributes['class'].value;
                            if (className == 'nv-bar positive') {
                                var rectElem = angular.element(elem);
                                console.log(rectElem);
                                rectElem.on('dblclick', function (event) {
                                    var type = attributes.type;
                                    self.$rootScope.$broadcast('openDrillPopup', { "data": rectElem[0]['__data__'], "type": type, "event": event });
                                });
                            }
                        }
                    });
                });
            }, 10);
        };
    }
    ;
    ChartEvent.factory = function () {
        var directive = function ($timeout, $rootScope) { return new ChartEvent($timeout, $rootScope); };
        directive.$inject = ['$timeout', '$rootScope'];
        return directive;
    };
    return ChartEvent;
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
/// <reference path="./common/chart-event/ChartEvent.ts" />
var SERVER_URL = 'http://10.91.152.99:8082/rapid-ws/services/rest';
angular.module('rapidMobile', ['ionic', 'rapidMobile.config', 'tabSlideBox', 'nvd3ChartDirectives', 'nvd3'])
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
    .controller('LoginController', LoginController)
    .directive('chartevent', ChartEvent.factory());
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
            var fileName = uniqueFileName(title) + ".pdf";
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
        function uniqueFileName(fileName) {
            var now = new Date();
            var timestamp = now.getFullYear().toString();
            timestamp += (now.getMonth() < 9 ? '0' : '') + now.getMonth().toString();
            timestamp += (now.getDate() < 10 ? '0' : '') + now.getDate().toString();
            timestamp += (now.getHours() < 10 ? '0' : '') + now.getHours().toString();
            timestamp += (now.getMinutes() < 10 ? '0' : '') + now.getMinutes().toString();
            timestamp += (now.getSeconds() < 10 ? '0' : '') + now.getSeconds().toString();
            return fileName.toUpperCase() + "_" + timestamp;
        }
    }
})();

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9saWJzLnRzIiwiY29tbW9uL3V0aWxzL1V0aWxzLnRzIiwiY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvQ29yZG92YVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvTmV0U2VydmljZS50cyIsImNvbW1vbi9zZXJ2aWNlcy9FcnJvckhhbmRsZXJTZXJ2aWNlLnRzIiwiY29tbW9uL3NlcnZpY2VzL0lTZXNzaW9uSHR0cFByb21pc2UuanMiLCJjb21tb24vc2VydmljZXMvU2Vzc2lvblNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1Jlc3BvbnNlLmpzIiwiY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHMiLCJjb21tb24vYXBwL0FwcENvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvc2VydmljZXMvT3BlcmF0aW9uYWxTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvTWlzQ29udHJvbGxlci50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL3VzZXIvTG9naW5Db250cm9sbGVyLnRzIiwiY29tbW9uL2NoYXJ0LWV2ZW50L0NoYXJ0RXZlbnQudHMiLCJhcHAudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1JlcXVlc3QuanMiLCJjb21wb25lbnRzL21pcy9wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvcmV2ZW51ZS1wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvcmVwb3J0QnVpbGRlclN2Yy50cyIsImNvbXBvbmVudHMvbWlzL3NlcnZpY2VzL3JlcG9ydFNlcnZpY2UudHMiXSwibmFtZXMiOlsiVXRpbHMiLCJVdGlscy5jb25zdHJ1Y3RvciIsIlV0aWxzLmlzTm90RW1wdHkiLCJVdGlscy5pc0xhbmRzY2FwZSIsIlV0aWxzLmdldFRvZGF5RGF0ZSIsIlV0aWxzLmlzSW50ZWdlciIsIkxvY2FsU3RvcmFnZVNlcnZpY2UiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTG9jYWxTdG9yYWdlU2VydmljZS5zZXQiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldCIsIkxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0T2JqZWN0IiwiTG9jYWxTdG9yYWdlU2VydmljZS5nZXRPYmplY3QiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmlzUmVjZW50RW50cnlBdmFpbGFibGUiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmFkZFJlY2VudEVudHJ5IiwiQ29yZG92YVNlcnZpY2UiLCJDb3Jkb3ZhU2VydmljZS5jb25zdHJ1Y3RvciIsIkNvcmRvdmFTZXJ2aWNlLmV4ZWMiLCJDb3Jkb3ZhU2VydmljZS5leGVjdXRlUGVuZGluZyIsIk5ldFNlcnZpY2UiLCJOZXRTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTmV0U2VydmljZS5nZXREYXRhIiwiTmV0U2VydmljZS5wb3N0RGF0YSIsIk5ldFNlcnZpY2UuZGVsZXRlRGF0YSIsIk5ldFNlcnZpY2UudXBsb2FkRmlsZSIsIk5ldFNlcnZpY2UuY2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkiLCJOZXRTZXJ2aWNlLnNlcnZlcklzQXZhaWxhYmxlIiwiTmV0U2VydmljZS5jYW5jZWxBbGxVcGxvYWREb3dubG9hZCIsIk5ldFNlcnZpY2UuYWRkTWV0YUluZm8iLCJlcnJvcmhhbmRsZXIiLCJFcnJvckhhbmRsZXJTZXJ2aWNlIiwiRXJyb3JIYW5kbGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkVycm9ySGFuZGxlclNlcnZpY2UudmFsaWRhdGVSZXNwb25zZSIsIkVycm9ySGFuZGxlclNlcnZpY2UuaXNOb1Jlc3VsdEZvdW5kIiwiRXJyb3JIYW5kbGVyU2VydmljZS5pc1Nlc3Npb25JbnZhbGlkIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNIYXJkRXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNTb2Z0RXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNFcnJvcnMiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc05vUmVzdWx0RXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0hhcmRFcnJvciIsIkVycm9ySGFuZGxlclNlcnZpY2UuaGFzU29mdEVycm9yIiwic2Vzc2lvbnNlcnZpY2UiLCJTZXNzaW9uU2VydmljZSIsIlNlc3Npb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiU2Vzc2lvblNlcnZpY2UucmVzb2x2ZVByb21pc2UiLCJTZXNzaW9uU2VydmljZS5hZGRBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyIiwiU2Vzc2lvblNlcnZpY2UucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lciIsIlNlc3Npb25TZXJ2aWNlLnNldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLnNldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLmNsZWFyTGlzdGVuZXJzIiwiU2Vzc2lvblNlcnZpY2UucmVmcmVzaFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkIiwiU2Vzc2lvblNlcnZpY2UuYWNjZXNzVG9rZW5SZWZyZXNoZWQiLCJkYXRhcHJvdmlkZXIiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlIiwiRGF0YVByb3ZpZGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkRhdGFQcm92aWRlclNlcnZpY2UuZ2V0RGF0YSIsIkRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmRlbGV0ZURhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiRGF0YVByb3ZpZGVyU2VydmljZS5hZGRNZXRhSW5mbyIsIkRhdGFQcm92aWRlclNlcnZpY2UuaXNMb2dvdXRTZXJ2aWNlIiwiQXBwQ29udHJvbGxlciIsIkFwcENvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJBcHBDb250cm9sbGVyLmlzTm90RW1wdHkiLCJBcHBDb250cm9sbGVyLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiQXBwQ29udHJvbGxlci5sb2dvdXQiLCJNaXNTZXJ2aWNlIiwiTWlzU2VydmljZS5jb25zdHJ1Y3RvciIsIk1pc1NlcnZpY2UuZ2V0TWV0cmljU25hcHNob3QiLCJNaXNTZXJ2aWNlLmdldFRhcmdldFZzQWN0dWFsIiwiTWlzU2VydmljZS5nZXRSZXZlbnVlQW5hbHlzaXMiLCJNaXNTZXJ2aWNlLmdldFJvdXRlUmV2ZW51ZSIsIk1pc1NlcnZpY2UuZ2V0U2VjdG9yQ2FycmllckFuYWx5c2lzIiwiTWlzU2VydmljZS5nZXRQYXhGbG93bk1pc0hlYWRlciIsIk1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlRHJpbGxEb3duIiwiTWlzU2VydmljZS5nZXRCYXJEcmlsbERvd24iLCJNaXNTZXJ2aWNlLmdldERyaWxsRG93biIsIkNoYXJ0b3B0aW9uU2VydmljZSIsIkNoYXJ0b3B0aW9uU2VydmljZS5jb25zdHJ1Y3RvciIsIkNoYXJ0b3B0aW9uU2VydmljZS5saW5lQ2hhcnRPcHRpb25zIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLm11bHRpQmFyQ2hhcnRPcHRpb25zIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLm1ldHJpY0JhckNoYXJ0T3B0aW9ucyIsIkNoYXJ0b3B0aW9uU2VydmljZS50YXJnZXRCYXJDaGFydE9wdGlvbnMiLCJGaWx0ZXJlZExpc3RTZXJ2aWNlIiwiRmlsdGVyZWRMaXN0U2VydmljZS5jb25zdHJ1Y3RvciIsIkZpbHRlcmVkTGlzdFNlcnZpY2Uuc2VhcmNoZWQiLCJGaWx0ZXJlZExpc3RTZXJ2aWNlLnBhZ2VkIiwic2VhcmNoVXRpbCIsIk9wZXJhdGlvbmFsU2VydmljZSIsIk9wZXJhdGlvbmFsU2VydmljZS5jb25zdHJ1Y3RvciIsIk9wZXJhdGlvbmFsU2VydmljZS5nZXRQYXhGbG93bk9wckhlYWRlciIsIk9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJGbGlnaHRQcm9jU3RhdHVzIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckZsaWdodENvdW50QnlSZWFzb24iLCJPcGVyYXRpb25hbFNlcnZpY2UuZ2V0T3ByQ291cG9uQ291bnRCeUV4Y2VwdGlvbiIsIk9wZXJhdGlvbmFsU2VydmljZS5nZXREcmlsbERvd24iLCJVc2VyU2VydmljZSIsIlVzZXJTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiVXNlclNlcnZpY2Uuc2V0VXNlciIsIlVzZXJTZXJ2aWNlLmxvZ291dCIsIlVzZXJTZXJ2aWNlLmlzTG9nZ2VkSW4iLCJVc2VyU2VydmljZS5nZXRVc2VyIiwiVXNlclNlcnZpY2UubG9naW4iLCJVc2VyU2VydmljZS5nZXRVc2VyUHJvZmlsZSIsIk1pc0NvbnRyb2xsZXIiLCJNaXNDb250cm9sbGVyLmNvbnN0cnVjdG9yIiwiTWlzQ29udHJvbGxlci5pbml0RGF0YSIsIk1pc0NvbnRyb2xsZXIuc2VsZWN0ZWRGbG93bk1vbnRoIiwiTWlzQ29udHJvbGxlci5vcGVuaW5mb1BvcG92ZXIiLCJNaXNDb250cm9sbGVyLmdldFByb2ZpbGVVc2VyTmFtZSIsIk1pc0NvbnRyb2xsZXIuY2xvc2VQb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jbG9zZXNCYXJQb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jbG9zZUluZm9Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci51cGRhdGVIZWFkZXIiLCJNaXNDb250cm9sbGVyLm9uU2xpZGVNb3ZlIiwiTWlzQ29udHJvbGxlci50b2dnbGVNZXRyaWMiLCJNaXNDb250cm9sbGVyLnRvZ2dsZVN1cmNoYXJnZSIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlVGFyZ2V0IiwiTWlzQ29udHJvbGxlci50b2dnbGVTZWN0b3IiLCJNaXNDb250cm9sbGVyLmNhbGxNZXRyaWNTbmFwc2hvdCIsIk1pc0NvbnRyb2xsZXIuY2FsbFRhcmdldFZzQWN0dWFsIiwiTWlzQ29udHJvbGxlci5jYWxsUm91dGVSZXZlbnVlIiwiTWlzQ29udHJvbGxlci5jYWxsUmV2ZW51ZUFuYWx5c2lzIiwiTWlzQ29udHJvbGxlci5vcGVuRHJpbGxEb3duIiwiTWlzQ29udHJvbGxlci5jbGVhckRyaWxsIiwiTWlzQ29udHJvbGxlci5kcmlsbERvd25SZXF1ZXN0IiwiTWlzQ29udHJvbGxlci5nZXREcmlsbERvd25VUkwiLCJNaXNDb250cm9sbGVyLm9wZW5CYXJEcmlsbERvd24iLCJNaXNDb250cm9sbGVyLmluaXRpYXRlQXJyYXkiLCJNaXNDb250cm9sbGVyLm9wZW5CYXJEcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5vcGVuVGFyZ2V0RHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5TZWN0b3JQb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jYWxsU2VjdG9yQ2FycmllckFuYWx5c2lzIiwiTWlzQ29udHJvbGxlci50YXJnZXRBY3R1YWxGaWx0ZXIiLCJNaXNDb250cm9sbGVyLnNlY3RvckNhcnJpZXJGaWx0ZXIiLCJNaXNDb250cm9sbGVyLnJldmVudWVBbmFseXNpc0ZpbHRlciIsIk1pc0NvbnRyb2xsZXIuZ2V0Rmxvd25GYXZvcml0ZXMiLCJNaXNDb250cm9sbGVyLmlvbmljTG9hZGluZ1Nob3ciLCJNaXNDb250cm9sbGVyLmlvbmljTG9hZGluZ0hpZGUiLCJNaXNDb250cm9sbGVyLm9wZW5EcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jbG9zZXNQb3BvdmVyIiwiTWlzQ29udHJvbGxlci5pc0RyaWxsUm93U2VsZWN0ZWQiLCJNaXNDb250cm9sbGVyLnNlYXJjaFJlc3VsdHMiLCJNaXNDb250cm9sbGVyLnBhZ2luYXRpb24iLCJNaXNDb250cm9sbGVyLnNldFBhZ2UiLCJNaXNDb250cm9sbGVyLmxhc3RQYWdlIiwiTWlzQ29udHJvbGxlci5yZXNldEFsbCIsIk1pc0NvbnRyb2xsZXIuc29ydCIsIk1pc0NvbnRyb2xsZXIucmFuZ2UiLCJNaXNDb250cm9sbGVyLnRvZ2dsZUdyb3VwIiwiTWlzQ29udHJvbGxlci5pc0dyb3VwU2hvd24iLCJNaXNDb250cm9sbGVyLnRvZ2dsZUNoYXJ0T3JUYWJsZVZpZXciLCJNaXNDb250cm9sbGVyLnJ1blJlcG9ydCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pbml0RGF0YSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnNlbGVjdGVkRmxvd25Nb250aCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmdldFByb2ZpbGVVc2VyTmFtZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9uU2xpZGVNb3ZlIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2FsbE15RGFzaGJvYXJkIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2FsbEZsaWdodFByb2NTdGF0dXMiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jYWxsRmxpZ2h0Q291bnRCeVJlYXNvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNhbGxDb3Vwb25Db3VudEJ5RXhjZXB0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaW9uaWNMb2FkaW5nU2hvdyIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmFwcGx5Q2hhcnRDb2xvckNvZGVzIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuZ2V0RmF2b3JpdGVJdGVtcyIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNvbG9yRnVuY3Rpb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5mb3VyQmFyQ29sb3JGdW5jdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5pbmZvUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNsb3NlSW5mb1BvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50b2dnbGVDb3VudCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmlvbmljTG9hZGluZ0hpZGUiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5sb2NrU2xpZGUiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci53ZWVrRGF0YVByZXYiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci53ZWVrRGF0YU5leHQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50b2dnbGVDaGFydE9yVGFibGVWaWV3IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIucnVuUmVwb3J0IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbkZsaWdodFByb2Nlc3NEcmlsbFBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vcGVuQ291bnBvbkNvdW50RHJpbGxQb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbkZsaWdodENvdW50RHJpbGxQb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuZHJpbGxEb3duUmVxdWVzdCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmdldERyaWxsRG93blVSTCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRhYlNsaWRlSGFzQ2hhbmdlZCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5EcmlsbERvd24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jbG9zZURyaWxsUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNsZWFyRHJpbGwiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pbml0aWF0ZUFycmF5IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaXNEcmlsbFJvd1NlbGVjdGVkIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuc2VhcmNoUmVzdWx0cyIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnBhZ2luYXRpb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5zZXRQYWdlIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIubGFzdFBhZ2UiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5yZXNldEFsbCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnNvcnQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5yYW5nZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUdyb3VwIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaXNHcm91cFNob3duIiwiTG9naW5Db250cm9sbGVyIiwiTG9naW5Db250cm9sbGVyLmNvbnN0cnVjdG9yIiwiTG9naW5Db250cm9sbGVyLmNsZWFyRXJyb3IiLCJMb2dpbkNvbnRyb2xsZXIubG9nb3V0IiwiTG9naW5Db250cm9sbGVyLmRvTG9naW4iLCJDaGFydEV2ZW50IiwiQ2hhcnRFdmVudC5jb25zdHJ1Y3RvciIsIkNoYXJ0RXZlbnQuZmFjdG9yeSIsInJlcG9ydEJ1aWxkZXJTZXJ2aWNlIiwicmVwb3J0QnVpbGRlclNlcnZpY2UuX2dlbmVyYXRlUmVwb3J0IiwicmVwb3J0U3ZjIiwicmVwb3J0U3ZjLl9ydW5SZXBvcnRBc3luYyIsInJlcG9ydFN2Yy5fcnVuUmVwb3J0RGF0YVVSTCIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERlZiIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERvYyIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydEJ1ZmZlciIsInJlcG9ydFN2Yy5nZXREYXRhVVJMIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0QmxvYiIsInJlcG9ydFN2Yy5zYXZlRmlsZSIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGUyIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGaWxlRW50cnkiLCJyZXBvcnRTdmMuc2F2ZUZpbGUuZ290RmlsZVdyaXRlciIsInJlcG9ydFN2Yy5zYXZlRmlsZS5mYWlsIiwicmVwb3J0U3ZjLnVuaXF1ZUZpbGVOYW1lIl0sIm1hcHBpbmdzIjoiQUFBQSw0Q0FBNEM7QUFDNUMsNkNBQTZDO0FBQzdDLDhDQUE4QztBQUM5QyxnREFBZ0Q7QUFDaEQsb0RBQW9EOztBQ0pwRCx1Q0FBdUM7QUFFdkM7SUFBQUE7SUE2QkFDLENBQUNBO0lBNUJjRCxnQkFBVUEsR0FBeEJBO1FBQXlCRSxnQkFBbUJBO2FBQW5CQSxXQUFtQkEsQ0FBbkJBLHNCQUFtQkEsQ0FBbkJBLElBQW1CQTtZQUFuQkEsK0JBQW1CQTs7UUFDM0NBLElBQUlBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBO1FBQ3RCQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxFQUFFQSxVQUFDQSxLQUFLQTtZQUN2QkEsVUFBVUEsR0FBR0EsVUFBVUEsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsS0FBS0EsS0FBS0EsSUFBSUEsSUFBSUEsS0FBS0EsS0FBS0EsRUFBRUE7bUJBQ2xGQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNuRkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFD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SUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDcEtBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUM5RkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDMUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQy9GQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMxQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO1FBQ2ZBLENBQUNBO0lBQ0hBLENBQUNBO0lBQ0RBLEVBQUVBLENBQUFBLENBQUNBLFNBQVNBLElBQUlBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO1FBQ3RCQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNoQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDN0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3hDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ2hHQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxnQkFBZ0JBLENBQUNBLENBQUNBLENBQUNBO1FBQ2pDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxJQUFJQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNwREEsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDcEtBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3hDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ2hHQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxjQUFjQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUM1Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDbkdBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO1FBQ2ZBLENBQUNBO0lBQ0hBLENBQUNBO0lBRURBLEVBQUVBLENBQUFBLENBQUNBLFNBQVNBLElBQUlBLGNBQWNBLENBQUNBLENBQUNBLENBQUNBO1FBQy9CQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNuQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDaEdBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzNDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNsR0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsY0FBY0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDL0JBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ25DQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNoR0EsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDM0NBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNB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Q0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsSUFBSUEsQ0FBQ0EsYUFBYUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7UUFDOUdBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO0lBQzNCQSxDQUFDQTs7SUFDRDVDLDZCQUFLQSxHQUFMQSxVQUFNQSxLQUFLQSxFQUFFQSxLQUFLQTtRQUNkNkMsSUFBSUEsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0E7UUFDYkEsSUFBSUEsS0FBYUEsQ0FBQ0E7UUFDbEJBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQzVDQSxFQUFFQSxDQUFBQSxDQUFDQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNiQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNaQSxDQUFDQTtRQUNEQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNWQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxLQUFLQSxFQUFFQSxDQUFDQSxHQUFHQSxLQUFLQSxFQUFFQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQTtZQUNuQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDWkEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7WUFDSkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1ZBLEtBQUtBLENBQUNBO1lBQ1JBLENBQUNBO1FBQ0hBLENBQUNBO1FBQ0RBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBO0lBQ2ZBLENBQUNBO0lBRUQ3QyxtQ0FBV0EsR0FBWEEsVUFBYUEsS0FBS0E7UUFDZDhDLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lB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QSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxRQUFRQSxFQUFFQSxHQUFHQSxFQUFFQSxHQUFHQSxHQUFHQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQTtZQUMxRUEsU0FBU0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBVUEsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsVUFBVUEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0E7WUFDOUVBLFNBQVNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLFVBQVVBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLFVBQVVBLEVBQUVBLENBQUNBLFFBQVFBLEVBQUVBLENBQUNBO1lBQzlFQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxHQUFDQSxHQUFHQSxHQUFDQSxTQUFTQSxDQUFDQTtRQUU3Q0EsQ0FBQ0E7SUFDRGIsQ0FBQ0E7QUFFSCxDQUFDLENBQUMsRUFBRSxDQUFDIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9pb25pYy5kLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9TY3JlZW4uZC50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvSXNUYWJsZXQuZC50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvSW5BcHBCcm93c2VyLmQudHNcIiAvPiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5jbGFzcyBVdGlscyB7XHJcblx0cHVibGljIHN0YXRpYyBpc05vdEVtcHR5KC4uLnZhbHVlczogT2JqZWN0W10pOiBib29sZWFuIHtcclxuXHRcdHZhciBpc05vdEVtcHR5ID0gdHJ1ZTtcclxuXHRcdF8uZm9yRWFjaCh2YWx1ZXMsICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRpc05vdEVtcHR5ID0gaXNOb3RFbXB0eSAmJiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpICYmIHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSAnJ1xyXG5cdFx0XHRcdCYmICEoKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc09iamVjdCh2YWx1ZSkpICYmIF8uaXNFbXB0eSh2YWx1ZSkpICYmIHZhbHVlICE9IDApO1xyXG5cdFx0fSk7XHJcblx0XHRyZXR1cm4gaXNOb3RFbXB0eTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgaXNMYW5kc2NhcGUoKTogYm9vbGVhbiB7XHJcblx0XHR2YXIgaXNMYW5kc2NhcGU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRcdGlmICh3aW5kb3cgJiYgd2luZG93LnNjcmVlbiAmJiB3aW5kb3cuc2NyZWVuLm9yaWVudGF0aW9uKSB7XHJcblx0XHRcdHZhciB0eXBlOiBzdHJpbmcgPSA8c3RyaW5nPihfLmlzU3RyaW5nKHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24pID8gd2luZG93LnNjcmVlbi5vcmllbnRhdGlvbiA6IHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24udHlwZSk7XHJcblx0XHRcdGlmICh0eXBlKSB7XHJcblx0XHRcdFx0aXNMYW5kc2NhcGUgPSB0eXBlLmluZGV4T2YoJ2xhbmRzY2FwZScpID49IDA7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBpc0xhbmRzY2FwZTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgZ2V0VG9kYXlEYXRlKCk6IERhdGUge1xyXG5cdFx0dmFyIHRvZGF5RGF0ZSA9IG5ldyBEYXRlKCk7XHJcblx0XHR0b2RheURhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblx0XHRyZXR1cm4gdG9kYXlEYXRlO1xyXG5cdH1cclxuXHRwcml2YXRlIHN0YXRpYyBpc0ludGVnZXIobnVtYmVyOiBCaWdKc0xpYnJhcnkuQmlnSlMpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBwYXJzZUludChudW1iZXIudG9TdHJpbmcoKSkgPT0gK251bWJlcjtcclxuXHR9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuaW50ZXJmYWNlIFBvaW50T2JqZWN0IHtcclxuXHRjb2RlOiBzdHJpbmcsXHJcblx0ZGVzY3JpcHRpb246IHN0cmluZ1xyXG59XHJcblxyXG5pbnRlcmZhY2UgSUxvY2FsU3RvcmFnZVNlcnZpY2Uge1xyXG5cdHNldChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogc3RyaW5nKTogdm9pZDtcclxuXHRnZXQoa2V5SWQ6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBzdHJpbmcpOiBzdHJpbmc7XHJcblx0c2V0T2JqZWN0KGtleUlkOiBzdHJpbmcsIGtleXZhbHVlOiBhbnlbXSk6IHZvaWQ7XHJcblx0Z2V0T2JqZWN0KGtleUlkOiBzdHJpbmcpOiBhbnk7XHJcblx0aXNSZWNlbnRFbnRyeUF2YWlsYWJsZShvcmdpbk9iamVjdDogUG9pbnRPYmplY3QsIHR5cGU6IHN0cmluZyk6IHZvaWQ7XHJcblx0YWRkUmVjZW50RW50cnkoZGF0YTogYW55LCB0eXBlOiBzdHJpbmcpOiB2b2lkO1xyXG59XHJcblxyXG5jbGFzcyBMb2NhbFN0b3JhZ2VTZXJ2aWNlIGltcGxlbWVudHMgSUxvY2FsU3RvcmFnZVNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyR3aW5kb3cnXTtcclxuXHRwcml2YXRlIHJlY2VudEVudHJpZXM6IFtQb2ludE9iamVjdF07XHJcblxyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcclxuXHR9XHJcblxyXG5cdHNldChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogc3RyaW5nKTogdm9pZCB7XHJcblx0XHR0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSA9IGtleXZhbHVlO1xyXG5cdH1cclxuXHRnZXQoa2V5SWQ6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdIHx8IGRlZmF1bHRWYWx1ZTtcclxuXHR9XHJcblx0c2V0T2JqZWN0KGtleUlkOiBzdHJpbmcsIGtleXZhbHVlOiBhbnlbXSk6IHZvaWQge1xyXG5cdFx0dGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gPSAgSlNPTi5zdHJpbmdpZnkoa2V5dmFsdWUpO1xyXG5cdH1cclxuXHRnZXRPYmplY3Qoa2V5SWQ6IHN0cmluZyk6IGFueSB7XHJcblx0XHRyZXR1cm4gdGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gPyBKU09OLnBhcnNlKHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdKSA6IHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdGlzUmVjZW50RW50cnlBdmFpbGFibGUob3JnaW5PYmplY3Q6IFBvaW50T2JqZWN0LCB0eXBlOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMucmVjZW50RW50cmllcyA9IHRoaXMuZ2V0T2JqZWN0KHR5cGUpID8gdGhpcy5nZXRPYmplY3QodHlwZSkgOiBbXTtcclxuXHRcdHJldHVybiB0aGlzLnJlY2VudEVudHJpZXMuZmlsdGVyKGZ1bmN0aW9uIChlbnRyeSkgeyByZXR1cm4gZW50cnkuY29kZSA9PT0gb3JnaW5PYmplY3QuY29kZSB9KTtcclxuXHR9XHJcblxyXG5cdGFkZFJlY2VudEVudHJ5KGRhdGE6IGFueSwgdHlwZTogc3RyaW5nKSB7XHJcblx0XHR2YXIgb3JnaW5PYmplY3Q6IFBvaW50T2JqZWN0XHQ9XHRkYXRhID8gZGF0YS5vcmlnaW5hbE9iamVjdCA6IHVuZGVmaW5lZDtcclxuXHJcblx0XHRpZiAob3JnaW5PYmplY3QpIHtcclxuXHRcdFx0aWYgKHRoaXMuaXNSZWNlbnRFbnRyeUF2YWlsYWJsZShvcmdpbk9iamVjdCwgdHlwZSkubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0dGhpcy5yZWNlbnRFbnRyaWVzID0gdGhpcy5nZXRPYmplY3QodHlwZSkgPyB0aGlzLmdldE9iamVjdCh0eXBlKSA6IFtdO1xyXG5cdFx0XHRcdCh0aGlzLnJlY2VudEVudHJpZXMubGVuZ3RoID09IDMpID8gdGhpcy5yZWNlbnRFbnRyaWVzLnBvcCgpIDogdGhpcy5yZWNlbnRFbnRyaWVzO1xyXG5cdFx0XHRcdHRoaXMucmVjZW50RW50cmllcy51bnNoaWZ0KG9yZ2luT2JqZWN0KTtcclxuXHRcdFx0XHR0aGlzLnNldE9iamVjdCh0eXBlLCB0aGlzLnJlY2VudEVudHJpZXMpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5pbnRlcmZhY2UgSUNvcmRvdmFDYWxsIHtcclxuXHQoKTogdm9pZDtcclxufVxyXG5cclxuY2xhc3MgQ29yZG92YVNlcnZpY2Uge1xyXG5cclxuXHRwcml2YXRlIGNvcmRvdmFSZWFkeTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHByaXZhdGUgcGVuZGluZ0NhbGxzOiBJQ29yZG92YUNhbGxbXSA9IFtdO1xyXG5cclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZXJlYWR5JywgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmNvcmRvdmFSZWFkeSA9IHRydWU7XHJcblx0XHRcdHRoaXMuZXhlY3V0ZVBlbmRpbmcoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0ZXhlYyhmbjogSUNvcmRvdmFDYWxsLCBhbHRlcm5hdGl2ZUZuPzogSUNvcmRvdmFDYWxsKSB7XHJcblx0XHRpZiAodGhpcy5jb3Jkb3ZhUmVhZHkpIHtcclxuXHRcdFx0Zm4oKTtcclxuXHRcdH0gZWxzZSBpZiAoIWFsdGVybmF0aXZlRm4pIHtcclxuXHRcdFx0dGhpcy5wZW5kaW5nQ2FsbHMucHVzaChmbik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRhbHRlcm5hdGl2ZUZuKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGV4ZWN1dGVQZW5kaW5nKCkge1xyXG5cdFx0dGhpcy5wZW5kaW5nQ2FsbHMuZm9yRWFjaCgoZm4pID0+IHtcclxuXHRcdFx0Zm4oKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucGVuZGluZ0NhbGxzID0gW107XHJcblx0fVxyXG5cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi90eXBpbmdzL2FuZ3VsYXJqcy9hbmd1bGFyLmQudHNcIi8+XHJcblxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxyXG5cclxuaW50ZXJmYWNlIElOZXRTZXJ2aWNlIHtcclxuXHRnZXREYXRhKGZyb21Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xyXG5cdHBvc3REYXRhKHRvVXJsOiBzdHJpbmcsIGRhdGE6IGFueSk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xyXG5cdGRlbGV0ZURhdGEodG9Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xyXG5cdGNoZWNrU2VydmVyQXZhaWxhYmlsaXR5KCk6IG5nLklQcm9taXNlPGJvb2xlYW4+O1xyXG59XHJcblxyXG5jbGFzcyBOZXRTZXJ2aWNlIGltcGxlbWVudHMgSU5ldFNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRodHRwJywgJ0NvcmRvdmFTZXJ2aWNlJywgJyRxJywgJ1VSTF9XUycsICdPV05FUl9DQVJSSUVSX0NPREUnXTtcclxuXHRwcml2YXRlIGZpbGVUcmFuc2ZlcjogRmlsZVRyYW5zZmVyO1xyXG5cdHByaXZhdGUgaXNTZXJ2ZXJBdmFpbGFibGU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkaHR0cDogbmcuSUh0dHBTZXJ2aWNlLCBwcml2YXRlIGNvcmRvdmFTZXJ2aWNlOiBDb3Jkb3ZhU2VydmljZSwgcHJvdGVjdGVkICRxOiBuZy5JUVNlcnZpY2UsIHB1YmxpYyBVUkxfV1M6IHN0cmluZywgcHJpdmF0ZSBPV05FUl9DQVJSSUVSX0NPREU6IHN0cmluZykge1xyXG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy50aW1lb3V0ID0gNjAwMDA7XHJcblx0XHRjb3Jkb3ZhU2VydmljZS5leGVjKCgpID0+IHtcclxuXHRcdFx0dGhpcy5maWxlVHJhbnNmZXIgPSBuZXcgRmlsZVRyYW5zZmVyKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGdldERhdGEoZnJvbVVybDogc3RyaW5nKTogbmcuSUh0dHBQcm9taXNlPGFueT4ge1xyXG5cdFx0dmFyIHVybDogc3RyaW5nID0gU0VSVkVSX1VSTCArIGZyb21Vcmw7XHJcblx0XHRyZXR1cm4gdGhpcy4kaHR0cC5nZXQodXJsKTtcclxuXHR9XHJcblxyXG5cdHBvc3REYXRhKHRvVXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcclxuXHRcdHJldHVybiB0aGlzLiRodHRwLnBvc3QoU0VSVkVSX1VSTCArIHRvVXJsLCB0aGlzLmFkZE1ldGFJbmZvKGRhdGEpKTtcclxuXHR9XHJcblxyXG5cdGRlbGV0ZURhdGEodG9Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcclxuXHRcdHJldHVybiB0aGlzLiRodHRwLmRlbGV0ZShTRVJWRVJfVVJMICsgdG9VcmwpO1xyXG5cdH1cclxuXHJcblx0dXBsb2FkRmlsZShcclxuXHRcdHRvVXJsOiBzdHJpbmcsIHVybEZpbGU6IHN0cmluZyxcclxuXHRcdG9wdGlvbnM6IEZpbGVVcGxvYWRPcHRpb25zLCBzdWNjZXNzQ2FsbGJhY2s6IChyZXN1bHQ6IEZpbGVVcGxvYWRSZXN1bHQpID0+IHZvaWQsXHJcblx0XHRlcnJvckNhbGxiYWNrOiAoZXJyb3I6IEZpbGVUcmFuc2ZlckVycm9yKSA9PiB2b2lkLCBwcm9ncmVzc0NhbGxiYWNrPzogKHByb2dyZXNzRXZlbnQ6IFByb2dyZXNzRXZlbnQpID0+IHZvaWQpIHtcclxuXHRcdGlmICghdGhpcy5maWxlVHJhbnNmZXIpIHtcclxuXHRcdFx0dGhpcy5maWxlVHJhbnNmZXIgPSBuZXcgRmlsZVRyYW5zZmVyKCk7XHJcblx0XHR9XHJcblx0XHRjb25zb2xlLmxvZyhvcHRpb25zLnBhcmFtcyk7XHJcblx0XHR0aGlzLmZpbGVUcmFuc2Zlci5vbnByb2dyZXNzID0gcHJvZ3Jlc3NDYWxsYmFjaztcclxuXHRcdHZhciB1cmw6IHN0cmluZyA9IFNFUlZFUl9VUkwgKyB0b1VybDtcclxuXHRcdHRoaXMuZmlsZVRyYW5zZmVyLnVwbG9hZCh1cmxGaWxlLCB1cmwsIHN1Y2Nlc3NDYWxsYmFjaywgZXJyb3JDYWxsYmFjaywgb3B0aW9ucyk7XHJcblx0fVxyXG5cclxuXHRjaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpOiBuZy5JUHJvbWlzZTxib29sZWFuPiB7XHJcblx0XHR2YXIgYXZhaWxhYmlsaXR5OiBib29sZWFuID0gdHJ1ZTtcclxuXHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8Ym9vbGVhbj4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblxyXG5cdFx0dGhpcy5jb3Jkb3ZhU2VydmljZS5leGVjKCgpID0+IHtcclxuXHRcdFx0aWYgKHdpbmRvdy5uYXZpZ2F0b3IpIHsgLy8gb24gZGV2aWNlXHJcblx0XHRcdFx0dmFyIG5hdmlnYXRvcjogTmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcclxuXHRcdFx0XHRpZiAobmF2aWdhdG9yLmNvbm5lY3Rpb24gJiYgKChuYXZpZ2F0b3IuY29ubmVjdGlvbi50eXBlID09IENvbm5lY3Rpb24uTk9ORSkgfHwgKG5hdmlnYXRvci5jb25uZWN0aW9uLnR5cGUgPT0gQ29ubmVjdGlvbi5VTktOT1dOKSkpIHtcclxuXHRcdFx0XHRcdGF2YWlsYWJpbGl0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRkZWYucmVzb2x2ZShhdmFpbGFiaWxpdHkpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0c2VydmVySXNBdmFpbGFibGUoKTogYm9vbGVhbiB7XHJcblx0XHR2YXIgdGhhdDogTmV0U2VydmljZSA9IHRoaXM7XHJcblxyXG5cdFx0dmFyIHNlcnZlcklzQXZhaWxhYmxlID0gdGhpcy5jaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpLnRoZW4oKHJlc3VsdDogYm9vbGVhbikgPT4ge1xyXG5cdFx0XHR0aGF0LmlzU2VydmVyQXZhaWxhYmxlID0gcmVzdWx0O1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuaXNTZXJ2ZXJBdmFpbGFibGU7XHJcblx0fVxyXG5cclxuXHRjYW5jZWxBbGxVcGxvYWREb3dubG9hZCgpIHtcclxuXHRcdGlmICh0aGlzLmZpbGVUcmFuc2Zlcikge1xyXG5cdFx0XHR0aGlzLmZpbGVUcmFuc2Zlci5hYm9ydCgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0YWRkTWV0YUluZm8ocmVxdWVzdERhdGE6IGFueSk6IGFueSB7XHJcblx0XHR2YXIgZGV2aWNlOiBJb25pYy5JRGV2aWNlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKClcclxuXHRcdHZhciBtb2RlbDogc3RyaW5nID0gJ2RldmljZSBJbmZvJztcclxuXHRcdHZhciBvc1R5cGU6IHN0cmluZyA9ICc4LjQnO1xyXG5cdFx0dmFyIG9zVmVyc2lvbjogc3RyaW5nID0gJ2lvcyc7XHJcblx0XHR2YXIgZGV2aWNlVG9rZW46IHN0cmluZyA9ICdzdHJpbmcnO1xyXG5cdFx0aWYgKGRldmljZSkge1xyXG5cdFx0XHRtb2RlbCA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLm1vZGVsO1xyXG5cdFx0XHRvc1R5cGUgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5wbGF0Zm9ybTtcclxuXHRcdFx0b3NWZXJzaW9uID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkudmVyc2lvbjtcclxuXHRcdH1cclxuXHRcdGlmICghbW9kZWwpIHtcclxuXHRcdFx0bW9kZWwgPSAnZGV2aWNlIEluZm8nO1x0XHJcblx0XHR9XHJcblx0XHRpZiAoIW9zVHlwZSkge1xyXG5cdFx0XHRvc1R5cGUgPSAnOC40JztcdFxyXG5cdFx0fVxyXG5cdFx0aWYgKCFvc1ZlcnNpb24pIHtcclxuXHRcdFx0b3NWZXJzaW9uID0gJ2lvcyc7XHRcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIG1ldGFJbmZvID0ge1xyXG5cdFx0XHQnY2hhbm5lbElkZW50aWZpZXInOiAnTU9CJyxcclxuXHRcdFx0J2RhdGVUaW1lU3RhbXAnOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcclxuXHRcdFx0J293bmVyQ2FycmllckNvZGUnOiB0aGlzLk9XTkVSX0NBUlJJRVJfQ09ERSxcclxuXHRcdFx0J2FkZGl0aW9uYWxJbmZvJzoge1xyXG5cdFx0XHRcdCdkZXZpY2VUeXBlJzogd2luZG93LmlzVGFibGV0ID8gJ1RhYmxldCcgOiAnUGhvbmUnLFxyXG5cdFx0XHRcdCdtb2RlbCc6IG1vZGVsLFxyXG5cdFx0XHRcdCdvc1R5cGUnOiBvc1R5cGUsXHJcblx0XHRcdFx0J29zVmVyc2lvbic6IG9zVmVyc2lvbixcclxuXHRcdFx0XHQnZGV2aWNlVG9rZW4nOiBkZXZpY2VUb2tlbixcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR2YXIgcmVxdWVzdE9iaiA9IHtcclxuXHRcdFx0J21ldGFJbmZvJzogbWV0YUluZm8sXHJcblx0XHRcdCdyZXF1ZXN0RGF0YSc6IHJlcXVlc3REYXRhXHJcblx0XHR9O1xyXG5cdFx0cmV0dXJuIHJlcXVlc3RPYmo7XHJcblx0fVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOZXRTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkNvcmRvdmFTZXJ2aWNlLnRzXCIgLz5cclxuXHJcbm1vZHVsZSBlcnJvcmhhbmRsZXIge1xyXG5cdGV4cG9ydCBjb25zdCBTVEFUVVNfRkFJTDogc3RyaW5nID0gJ2ZhaWwnO1xyXG5cdGV4cG9ydCBjb25zdCBTRVZFUklUWV9FUlJPUl9IQVJEOiBzdHJpbmcgPSAnSEFSRCc7XHJcblx0ZXhwb3J0IGNvbnN0IFNFVkVSSVRZX0VSUk9SX1NPRlQ6IHN0cmluZyA9ICdTT0ZUJztcclxuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT05fVE9LRU4gPSAnU0VDLjAyNSc7XHJcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OID0gJ1NFUy4wMDQnO1xyXG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX1RPS0VOX0VYUElSRUQgPSAnU0VDLjAzOCc7XHJcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfSU5WQUxJRF9VU0VSX1NFU1NJT05fRVhQSVJFRCA9ICdTRVMuMDAzJztcclxuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9OT19SRVNVTFQgPSAnQ09NLjExMSc7XHJcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfTk9fUk9VVEUgPSAnRkxULjAxMCc7XHJcbn1cclxuXHJcbmNsYXNzIEVycm9ySGFuZGxlclNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ05ldFNlcnZpY2UnLCAnQ29yZG92YVNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZSddO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgbmV0U2VydmljZTogTmV0U2VydmljZSwgcHJpdmF0ZSBjb3Jkb3ZhU2VydmljZTogQ29yZG92YVNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcclxuXHRcdHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVNjb3BlKSB7XHJcblx0fVxyXG5cclxuXHR2YWxpZGF0ZVJlc3BvbnNlKHJlc3BvbnNlOiBhbnkpIHtcclxuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcclxuXHRcdGlmICh0aGlzLmhhc0Vycm9ycyhlcnJvcnMpIHx8IGVycm9yaGFuZGxlci5TVEFUVVNfRkFJTCA9PSByZXNwb25zZS5zdGF0dXMpIHtcclxuXHRcdFx0aWYgKCF0aGlzLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IoZXJyb3JzKSAmJiAhdGhpcy5oYXNOb1Jlc3VsdEVycm9yKGVycm9ycykpIHtcclxuXHRcdFx0XHQvLyBicm9hZGNhc3QgdG8gYXBwY29udHJvbGxlciBzZXJ2ZXIgZXJyb3JcclxuXHRcdFx0XHR0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnc2VydmVyRXJyb3InLCByZXNwb25zZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGlzTm9SZXN1bHRGb3VuZChyZXNwb25zZTogYW55KTogYm9vbGVhbiB7XHJcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XHJcblx0XHRyZXR1cm4gdGhpcy5oYXNOb1Jlc3VsdEVycm9yKGVycm9ycyk7XHJcblx0fVxyXG5cclxuXHRpc1Nlc3Npb25JbnZhbGlkKHJlc3BvbnNlOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcclxuXHRcdHJldHVybiB0aGlzLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IoZXJyb3JzKTtcclxuXHR9XHJcblxyXG5cdGhhc0hhcmRFcnJvcnMocmVzcG9uc2U6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xyXG5cdFx0cmV0dXJuIHRoaXMuaGFzSGFyZEVycm9yKGVycm9ycyk7XHJcblx0fVxyXG5cclxuXHRoYXNTb2Z0RXJyb3JzKHJlc3BvbnNlOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcclxuXHRcdHJldHVybiB0aGlzLmhhc1NvZnRFcnJvcihlcnJvcnMpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYXNFcnJvcnMoZXJyb3JzOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBlcnJvcnMubGVuZ3RoID4gMDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFzSW52YWxpZFNlc3Npb25FcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XHJcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfSEFSRCA9PSBlcnJvci5zZXZlcml0eSAmJlxyXG5cdFx0XHQoZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OX1RPS0VOID09IGVycm9yLmNvZGUgfHxcclxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT04gPT0gZXJyb3IuY29kZSB8fFxyXG5cdFx0XHRcdGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX0lOVkFMSURfVVNFUl9TRVNTSU9OX0VYUElSRUQgPT0gZXJyb3IuY29kZSB8fFxyXG5cdFx0XHRcdGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX1RPS0VOX0VYUElSRUQgPT0gZXJyb3IuY29kZSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFzTm9SZXN1bHRFcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XHJcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfSEFSRCA9PSBlcnJvci5zZXZlcml0eSAmJlxyXG5cdFx0XHQoZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfTk9fUkVTVUxUID09IGVycm9yLmNvZGUgfHxcclxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9OT19ST1VURSA9PSBlcnJvci5jb2RlKTtcclxuXHRcdH0pICYmIGVycm9ycy5sZW5ndGggPT0gMTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFzSGFyZEVycm9yKGVycm9yczogYW55KTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gXy5zb21lKGVycm9ycywgKGVycm9yOiBhbnkpID0+IHtcclxuXHRcdFx0cmV0dXJuIGVycm9yICYmIGVycm9yaGFuZGxlci5TRVZFUklUWV9FUlJPUl9IQVJEID09IGVycm9yLnNldmVyaXR5O1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhc1NvZnRFcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XHJcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfU09GVCA9PSBlcnJvci5zZXZlcml0eTtcclxuXHRcdH0pO1xyXG5cdH1cclxufSIsbnVsbCwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOZXRTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkNvcmRvdmFTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkVycm9ySGFuZGxlclNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiSVNlc3Npb25IdHRwUHJvbWlzZS50c1wiIC8+XHJcblxyXG5tb2R1bGUgc2Vzc2lvbnNlcnZpY2Uge1xyXG5cdGV4cG9ydCBjb25zdCBIRUFERVJfUkVGUkVTSF9UT0tFTl9LRVk6IHN0cmluZyA9ICd4LXJlZnJlc2gtdG9rZW4nO1xyXG5cdGV4cG9ydCBjb25zdCBIRUFERVJfQUNDRVNTX1RPS0VOX0tFWTogc3RyaW5nID0gJ3gtYWNjZXNzLXRva2VuJztcclxuXHRleHBvcnQgY29uc3QgUkVGUkVTSF9TRVNTSU9OX0lEX1VSTDogc3RyaW5nID0gJy91c2VyL2dldEFjY2Vzc1Rva2VuJztcclxufVxyXG5cclxuY2xhc3MgU2Vzc2lvblNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ05ldFNlcnZpY2UnLCAnRXJyb3JIYW5kbGVyU2VydmljZScsICckcScsICckcm9vdFNjb3BlJywgJyRodHRwJ107XHJcblxyXG5cdHByaXZhdGUgYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXM6IElBY2Nlc3NUb2tlblJlZnJlc2hlZEhhbmRsZXJbXTtcclxuXHRwcml2YXRlIHNlc3Npb25JZDogc3RyaW5nO1xyXG5cdHByaXZhdGUgY3JlZGVudGlhbElkOiBzdHJpbmc7XHJcblx0cHJpdmF0ZSBpc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBuZXRTZXJ2aWNlOiBOZXRTZXJ2aWNlLCBwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcclxuXHRcdHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVNjb3BlLCBwcml2YXRlICRodHRwOiBuZy5JSHR0cFNlcnZpY2UpIHtcclxuXHRcdHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMgPSBbXTtcclxuXHRcdHRoaXMuc2Vzc2lvbklkID0gbnVsbDtcclxuXHRcdHRoaXMuY3JlZGVudGlhbElkID0gbnVsbDtcclxuXHR9XHJcblxyXG5cdHJlc29sdmVQcm9taXNlKHByb21pc2U6IElTZXNzaW9uSHR0cFByb21pc2UpIHtcclxuXHRcdHByb21pc2UucmVzcG9uc2UudGhlbigocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0aWYgKCF0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaGFzSGFyZEVycm9ycyhyZXNwb25zZSkgfHwgdGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmlzU2Vzc2lvbkludmFsaWQocmVzcG9uc2UpKSB7XHJcblx0XHRcdFx0aWYgKCF0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaXNTZXNzaW9uSW52YWxpZChyZXNwb25zZSkpIHtcclxuXHRcdFx0XHRcdHByb21pc2UuZGVmZmVyZWQucmVzb2x2ZShwcm9taXNlLnJlc3BvbnNlKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdzZXNzaW9uIGlzIHZhbGlkJyk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMuYWRkQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihwcm9taXNlKTtcclxuXHRcdFx0XHRcdGlmICghdGhpcy5pc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZWZyZXNoaW5nIHNlc3Npb24gdG9rZW4nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5yZWZyZXNoU2Vzc2lvbklkKCkudGhlbihcclxuXHRcdFx0XHRcdFx0XHQodG9rZW5SZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuZXJyb3JIYW5kbGVyU2VydmljZS5oYXNIYXJkRXJyb3JzKHRva2VuUmVzcG9uc2UpKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuc2V0U2Vzc2lvbklkKG51bGwpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHJlc3BvbnNlSGVhZGVyID0gdG9rZW5SZXNwb25zZS5oZWFkZXJzKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHZhciBhY2Nlc3NUb2tlbjogc3RyaW5nID0gcmVzcG9uc2VIZWFkZXJbc2Vzc2lvbnNlcnZpY2UuSEVBREVSX0FDQ0VTU19UT0tFTl9LRVldO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnNldFNlc3Npb25JZChhY2Nlc3NUb2tlbik7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmlzUmVmcmVzaFNlc3Npb25JZEluUHJvZ3Jlc3MgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICghdGhpcy5nZXRTZXNzaW9uSWQoKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdlcnJvciBvbiBhY2Nlc3MgdG9rZW4gcmVmcmVzaCcpO1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRTZXNzaW9uSWQobnVsbCk7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5nZXRDcmVkZW50aWFsSWQoKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRwcm9taXNlLmRlZmZlcmVkLnJlamVjdCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5pc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHByb21pc2UuZGVmZmVyZWQucmVqZWN0KCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0YWRkQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lcjogSUFjY2Vzc1Rva2VuUmVmcmVzaGVkSGFuZGxlcikge1xyXG5cdFx0dGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcy5wdXNoKGxpc3RlbmVyKTtcclxuXHR9XHJcblxyXG5cdHJlbW92ZUFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzdGVuZXIobGlzdGVuZXJUb1JlbW92ZTogSUFjY2Vzc1Rva2VuUmVmcmVzaGVkSGFuZGxlcikge1xyXG5cdFx0Xy5yZW1vdmUodGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcywgKGxpc3RlbmVyKSA9PiB7XHJcblx0XHRcdHJldHVybiBsaXN0ZW5lciA9PSBsaXN0ZW5lclRvUmVtb3ZlO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRzZXRDcmVkZW50aWFsSWQoY3JlZElkOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMuY3JlZGVudGlhbElkID0gY3JlZElkO1xyXG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vbltzZXNzaW9uc2VydmljZS5IRUFERVJfUkVGUkVTSF9UT0tFTl9LRVldID0gY3JlZElkO1xyXG5cdH1cclxuXHJcblx0c2V0U2Vzc2lvbklkKHNlc3Npb25JZDogc3RyaW5nKSB7XHJcblx0XHR0aGlzLnNlc3Npb25JZCA9IHNlc3Npb25JZDtcclxuXHRcdHRoaXMuJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bc2Vzc2lvbnNlcnZpY2UuSEVBREVSX0FDQ0VTU19UT0tFTl9LRVldID0gc2Vzc2lvbklkO1xyXG5cdH1cclxuXHJcblx0Z2V0U2Vzc2lvbklkKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gdGhpcy5zZXNzaW9uSWQgPyB0aGlzLnNlc3Npb25JZCA6IG51bGw7XHJcblx0fVxyXG5cclxuXHRnZXRDcmVkZW50aWFsSWQoKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiB0aGlzLmNyZWRlbnRpYWxJZCA/IHRoaXMuY3JlZGVudGlhbElkIDogbnVsbDtcclxuXHR9XHJcblxyXG5cdGNsZWFyTGlzdGVuZXJzKCkge1xyXG5cdFx0dGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcyA9IFtdO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZWZyZXNoU2Vzc2lvbklkKCk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcclxuXHRcdHRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcyA9IHRydWU7XHJcblx0XHR2YXIgYWNjZXNzVG9rZW5SZXF1ZXN0OiBhbnkgPSB7XHJcblx0XHRcdHJlZnJlc2hUb2tlbjogdGhpcy5jcmVkZW50aWFsSWRcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLm5ldFNlcnZpY2UucG9zdERhdGEoc2Vzc2lvbnNlcnZpY2UuUkVGUkVTSF9TRVNTSU9OX0lEX1VSTCwgYWNjZXNzVG9rZW5SZXF1ZXN0KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYWNjZXNzVG9rZW5Ob3RSZWZyZXNoZWQoKSB7XHJcblx0XHRfLmZvckVhY2godGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcywgKGxpc3RlbmVyKSA9PiB7XHJcblx0XHRcdGlmIChsaXN0ZW5lci5vblRva2VuRmFpbGVkKSB7XHJcblx0XHRcdFx0bGlzdGVuZXIub25Ub2tlbkZhaWxlZChsaXN0ZW5lcik7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5yZW1vdmVBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKGxpc3RlbmVyKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhY2Nlc3NUb2tlblJlZnJlc2hlZCgpIHtcclxuXHRcdF8uZm9yRWFjaCh0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLCAobGlzdGVuZXIpID0+IHtcclxuXHRcdFx0aWYgKGxpc3RlbmVyKSB7XHJcblx0XHRcdFx0aWYgKGxpc3RlbmVyLm9uVG9rZW5SZWZyZXNoZWQpIHtcclxuXHRcdFx0XHRcdGxpc3RlbmVyLm9uVG9rZW5SZWZyZXNoZWQobGlzdGVuZXIpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkobGlzdGVuZXIpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ0xlbmd0aCA9ICcsIHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMubGVuZ3RoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLnJlbW92ZUFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzdGVuZXIobGlzdGVuZXIpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59IixudWxsLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk5ldFNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiU2Vzc2lvblNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiRXJyb3JIYW5kbGVyU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJJU2Vzc2lvbkh0dHBQcm9taXNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkdlbmVyaWNSZXNwb25zZS50c1wiIC8+XHJcblxyXG5tb2R1bGUgZGF0YXByb3ZpZGVyIHtcclxuXHRleHBvcnQgY29uc3QgU0VSVklDRV9VUkxfTE9HT1VUID0gJy91c2VyL2xvZ291dCc7XHJcbn1cclxuXHJcbmNsYXNzIERhdGFQcm92aWRlclNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ05ldFNlcnZpY2UnLCAnQ29yZG92YVNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZScsICdFcnJvckhhbmRsZXJTZXJ2aWNlJywgJ1Nlc3Npb25TZXJ2aWNlJywgJ09XTkVSX0NBUlJJRVJfQ09ERSddO1xyXG5cclxuXHRwcml2YXRlIGlzQ29ubmVjdGVkVG9OZXR3b3JrOiBib29sZWFuID0gdHJ1ZTtcclxuXHRwcml2YXRlIG5hdmlnYXRvcjogTmF2aWdhdG9yO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgbmV0U2VydmljZTogTmV0U2VydmljZSwgcHJpdmF0ZSBjb3Jkb3ZhU2VydmljZTogQ29yZG92YVNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcclxuXHRcdHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVNjb3BlLCBwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UsXHJcblx0XHRwcml2YXRlIHNlc3Npb25TZXJ2aWNlOiBTZXNzaW9uU2VydmljZSwgcHJpdmF0ZSBPV05FUl9DQVJSSUVSX0NPREU6IHN0cmluZykge1xyXG5cclxuXHRcdHRoaXMuY29yZG92YVNlcnZpY2UuZXhlYygoKSA9PiB7XHJcblx0XHRcdGlmICh3aW5kb3cuY29yZG92YSAmJiB3aW5kb3cuZG9jdW1lbnQpIHsgLy8gb24gZGV2aWNlXHJcblx0XHRcdFx0bmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcclxuXHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrID0gbmF2aWdhdG9yLm9uTGluZTtcclxuXHRcdFx0XHR3aW5kb3cuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcclxuXHRcdFx0XHRcdCdvbmxpbmUnLFxyXG5cdFx0XHRcdFx0KCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygndXNlciBvbmxpbmUnKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5pc0Nvbm5lY3RlZFRvTmV0d29yayA9IHRydWU7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0ZmFsc2UpO1xyXG5cdFx0XHRcdHdpbmRvdy5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFxyXG5cdFx0XHRcdFx0J29mZmxpbmUnLFxyXG5cdFx0XHRcdFx0KCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygndXNlciBvZmZsaW5lJyk7XHJcblx0XHRcdFx0XHRcdHRoaXMuaXNDb25uZWN0ZWRUb05ldHdvcmsgPSBmYWxzZTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRmYWxzZSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Z2V0RGF0YShyZXE6IHN0cmluZyk6IG5nLklQcm9taXNlPGFueT4ge1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblxyXG5cdFx0aWYgKHRoaXMuaGFzTmV0d29ya0Nvbm5lY3Rpb24oKSkge1xyXG5cdFx0XHRkZWYucmVzb2x2ZSh0aGlzLm5ldFNlcnZpY2UuZ2V0RGF0YShyZXEpKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdTZXJ2ZXIgdW5hdmFpbGFibGUnKTtcclxuXHRcdFx0Ly8gdGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ25vTmV0d29yaycpO1xyXG5cdFx0XHRkZWYucmVqZWN0KCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0cG9zdERhdGEocmVxOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyk6IG5nLklQcm9taXNlPGFueT4ge1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblxyXG5cdFx0dmFyIHJlc3BvbnNlOiBuZy5JUHJvbWlzZTxhbnk+ID0gdGhpcy5uZXRTZXJ2aWNlLnBvc3REYXRhKHJlcSwgZGF0YSwgY29uZmlnKTtcclxuXHJcblx0XHRpZiAodGhpcy5oYXNOZXR3b3JrQ29ubmVjdGlvbigpKSB7XHJcblx0XHRcdHJlc3BvbnNlLnRoZW4oXHJcblx0XHRcdChodHRwUmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHRkZWYucmVzb2x2ZShodHRwUmVzcG9uc2UpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XHJcblx0XHRcdFx0Ly8gYnJvYWRjYXN0IHNlcnZlciBpcyB1bmF2YWlsYWJsZVxyXG5cdFx0XHRcdHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdzZXJ2ZXJOb3RBdmFpbGFibGUnKTtcclxuXHRcdFx0XHRkZWYucmVqZWN0KCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0ZGVmLnJlamVjdCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGRlbGV0ZURhdGEocmVxOiBzdHJpbmcpOiBuZy5JUHJvbWlzZTxhbnk+IHtcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cclxuXHRcdGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcclxuXHRcdFx0ZGVmLnJlc29sdmUodGhpcy5uZXRTZXJ2aWNlLmRlbGV0ZURhdGEocmVxKSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XHJcblx0XHRcdGRlZi5yZWplY3QoKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRoYXNOZXR3b3JrQ29ubmVjdGlvbigpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiAobmF2aWdhdG9yLm9uTGluZSB8fCB0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrKTtcclxuXHR9XHJcblxyXG5cclxuXHQvLyBUT0RPOiByZW1vdmUgdGhpcyB0ZW1wIG1ldGhvZCBhbmQgdXNlIGdlbmVyaWNzXHJcblx0YWRkTWV0YUluZm8ocmVxdWVzdERhdGE6IGFueSk6IGFueSB7XHJcblx0XHR2YXIgZGV2aWNlOiBJb25pYy5JRGV2aWNlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKClcclxuXHRcdHZhciBtb2RlbDogc3RyaW5nID0gJyc7XHJcblx0XHR2YXIgb3NUeXBlOiBzdHJpbmcgPSAnJztcclxuXHRcdHZhciBvc1ZlcnNpb246IHN0cmluZyA9ICcnO1xyXG5cdFx0dmFyIGRldmljZVRva2VuOiBzdHJpbmcgPSAnJztcclxuXHRcdGlmIChkZXZpY2UpIHtcclxuXHRcdFx0bW9kZWwgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5tb2RlbDtcclxuXHRcdFx0b3NUeXBlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkucGxhdGZvcm07XHJcblx0XHRcdG9zVmVyc2lvbiA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLnZlcnNpb247XHJcblx0XHR9XHJcblx0XHR2YXIgbWV0YUluZm8gPSB7XHJcblx0XHRcdCdjaGFubmVsSWRlbnRpZmllcic6ICdNT0InLFxyXG5cdFx0XHQnZGF0ZVRpbWVTdGFtcCc6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG5cdFx0XHQnb3duZXJDYXJyaWVyQ29kZSc6IHRoaXMuT1dORVJfQ0FSUklFUl9DT0RFLFxyXG5cdFx0XHQnYWRkaXRpb25hbEluZm8nOiB7XHJcblx0XHRcdFx0J2RldmljZVR5cGUnOiB3aW5kb3cuaXNUYWJsZXQgPyAnVGFibGV0JyA6ICdQaG9uZScsXHJcblx0XHRcdFx0J21vZGVsJzogbW9kZWwsXHJcblx0XHRcdFx0J29zVHlwZSc6IG9zVHlwZSxcclxuXHRcdFx0XHQnb3NWZXJzaW9uJzogb3NWZXJzaW9uLFxyXG5cdFx0XHRcdCdkZXZpY2VUb2tlbic6IGRldmljZVRva2VuLFxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xyXG5cdFx0XHQnbWV0YUluZm8nOiBtZXRhSW5mbyxcclxuXHRcdFx0J3JlcXVlc3REYXRhJzogcmVxdWVzdERhdGFcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gcmVxdWVzdE9iajtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaXNMb2dvdXRTZXJ2aWNlKHJlcXVlc3RVcmw6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIGRhdGFwcm92aWRlci5TRVJWSUNFX1VSTF9MT0dPVVQgPT0gcmVxdWVzdFVybDtcclxuXHR9XHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi91dGlscy9VdGlscy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvTG9jYWxTdG9yYWdlU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvRXJyb3JIYW5kbGVyU2VydmljZS50c1wiIC8+XHJcblxyXG5jbGFzcyBBcHBDb250cm9sbGVyIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckc3RhdGUnLCAnJHNjb3BlJywgJ0RhdGFQcm92aWRlclNlcnZpY2UnLFxyXG5cdFx0JyRpb25pY01vZGFsJywgJyRpb25pY1BsYXRmb3JtJywgJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCAnJGlvbmljUG9wdXAnLFxyXG5cdFx0JyRpb25pY0xvYWRpbmcnLCAnJGlvbmljSGlzdG9yeScsICdFcnJvckhhbmRsZXJTZXJ2aWNlJ107XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJvdGVjdGVkICRzdGF0ZTogYW5ndWxhci51aS5JU3RhdGVTZXJ2aWNlLCBwcm90ZWN0ZWQgJHNjb3BlOiBuZy5JU2NvcGUsIHByb3RlY3RlZCBkYXRhUHJvdmlkZXJTZXJ2aWNlOiBEYXRhUHJvdmlkZXJTZXJ2aWNlLCAkaW9uaWNQbGF0Zm9ybTogSW9uaWMuSVBsYXRmb3JtLFxyXG5cdFx0cHJpdmF0ZSBsb2NhbFN0b3JhZ2VTZXJ2aWNlOiBMb2NhbFN0b3JhZ2VTZXJ2aWNlLCBwcml2YXRlICRpb25pY1BvcHVwOiBJb25pYy5JUG9wdXAsXHJcblx0XHRwcml2YXRlICRpb25pY0xvYWRpbmc6IElvbmljLklMb2FkaW5nLFxyXG5cdFx0cHJpdmF0ZSAkaW9uaWNIaXN0b3J5OiBhbnksIHByaXZhdGUgZXJyb3JIYW5kbGVyU2VydmljZTogRXJyb3JIYW5kbGVyU2VydmljZSkge1xyXG5cclxuXHRcdHZhciB0aGF0OiBBcHBDb250cm9sbGVyID0gdGhpcztcclxuXHR9XHJcblxyXG5cdGlzTm90RW1wdHkodmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIFV0aWxzLmlzTm90RW1wdHkodmFsdWUpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGhhc05ldHdvcmtDb25uZWN0aW9uKCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5oYXNOZXR3b3JrQ29ubmVjdGlvbigpO1xyXG5cdH1cclxuXHJcblx0bG9nb3V0KCkge1xyXG5cdFx0dGhpcy4kc3RhdGUuZ28oXCJsb2dpblwiKTtcclxuXHR9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHNcIiAvPlxyXG5cclxuY2xhc3MgTWlzU2VydmljZSB7XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnRGF0YVByb3ZpZGVyU2VydmljZScsICckcSddO1xyXG5cdFxyXG5cclxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlIGRhdGFQcm92aWRlclNlcnZpY2U6IERhdGFQcm92aWRlclNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSkgeyB9XHJcblxyXG5cdGdldE1ldHJpY1NuYXBzaG90IChyZXFkYXRhKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9tZXRyaWNzbmFwc2hvdCc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRUYXJnZXRWc0FjdHVhbCAocmVxZGF0YSl7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvdGFyZ2V0dnNhY3R1YWwnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0UmV2ZW51ZUFuYWx5c2lzIChyZXFkYXRhKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9yZXZlbnVlYW5hbHlzaXMnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0Um91dGVSZXZlbnVlIChyZXFkYXRhKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9yb3V0ZXJldmVudWUnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0U2VjdG9yQ2FycmllckFuYWx5c2lzIChyZXFkYXRhKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9zZWN0b3JjYXJyaWVyYW5hbHlzaXMnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0UGF4Rmxvd25NaXNIZWFkZXIgKHJlcWRhdGEpOiBhbnkge1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3BheGZsb3dubWlzaGVhZGVyJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdH0sXHJcblx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldFJvdXRlUmV2ZW51ZURyaWxsRG93biAocmVxZGF0YSl7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvcm91dGVyZXZlbnVlZHJpbGwnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0QmFyRHJpbGxEb3duIChyZXFkYXRhKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9tc3BheG5ldHJldmRyaWxsJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdH0sXHJcblx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldERyaWxsRG93biAocmVxZGF0YSwgVVJMKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSBVUkw7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5jbGFzcyBDaGFydG9wdGlvblNlcnZpY2Uge1xyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHJvb3RTY29wZSddO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCRyb290U2NvcGU6IG5nLklTY29wZSkgeyB9XHJcblxyXG4gICAgbGluZUNoYXJ0T3B0aW9ucygpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjaGFydDoge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2xpbmVDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IDUsXHJcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDUwLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogNTBcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXsgcmV0dXJuIGQueHZhbDsgfSxcclxuICAgICAgICAgICAgICAgIHk6IGZ1bmN0aW9uKGQpeyByZXR1cm4gZC55dmFsOyB9LFxyXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkaXNwYXRjaDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlQ2hhbmdlOiBmdW5jdGlvbihlKXsgY29uc29sZS5sb2coXCJzdGF0ZUNoYW5nZVwiKTsgfSxcclxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VTdGF0ZTogZnVuY3Rpb24oZSl7IGNvbnNvbGUubG9nKFwiY2hhbmdlU3RhdGVcIik7IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbHRpcFNob3c6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcInRvb2x0aXBTaG93XCIpOyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBIaWRlOiBmdW5jdGlvbihlKXsgY29uc29sZS5sb2coXCJ0b29sdGlwSGlkZVwiKTsgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGlja0Zvcm1hdDogZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMudGltZS5mb3JtYXQoJyViJykobmV3IERhdGUoZCkpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHlBeGlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICB0aWNrRm9ybWF0OiBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLjAyZicpKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsRGlzdGFuY2U6IC0xMFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTsgIFxyXG4gICAgfVxyXG5cclxuICAgIG11bHRpQmFyQ2hhcnRPcHRpb25zKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnbXVsdGlCYXJDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgIHdpZHRoOiAzMDAsXHJcbiAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAxMCxcclxuICAgICAgICAgICAgICAgICAgICByaWdodDogMjUsXHJcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiAzMCxcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiAyNVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNob3dMZWdlbmQgOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpe3JldHVybiBkLmxhYmVsO30sXHJcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXtyZXR1cm4gZC52YWx1ZSArICgxZS0xMCk7fSxcclxuICAgICAgICAgICAgICAgIHNob3dWYWx1ZXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICByZWR1Y2VYVGlja3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc2hvd0NvbnRyb2xzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlRm9ybWF0OiBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLC40ZicpKGQpO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsRGlzdGFuY2U6IDMwXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHNob3dYQXhpczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA3MDBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07ICBcclxuICAgIH1cclxuXHJcbiAgICBtZXRyaWNCYXJDaGFydE9wdGlvbnMobWlzQ3RybCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY3JldGVCYXJDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDIwMCxcclxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IDIwLFxyXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiAyNSxcclxuICAgICAgICAgICAgICAgICAgICBib3R0b206IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMjVcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXtyZXR1cm4gZC5sYWJlbDt9LFxyXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWV9LFxyXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzaG93VmFsdWVzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdmFsdWVGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJywuMmYnKShkKTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBkaXNjcmV0ZWJhcjoge1xyXG4gICAgICAgICAgICAgICAgICAgIGRpc3BhdGNoOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnREYmxDbGljazogZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWlzQ3RybC5vcGVuQmFyRHJpbGxEb3duUG9wb3ZlcihkMy5ldmVudCwgZSwgLTEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHRvb2x0aXA6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHNob3dYQXhpczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNzAwXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9OyAgXHJcbiAgICB9XHJcblxyXG4gICAgdGFyZ2V0QmFyQ2hhcnRPcHRpb25zKG1pc0N0cmwpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjaGFydDoge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2Rpc2NyZXRlQmFyQ2hhcnQnLFxyXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAyNTAsXHJcbiAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAyMCxcclxuICAgICAgICAgICAgICAgICAgICByaWdodDogNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiAyMCxcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiA3NVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHVzZUludGVyYWN0aXZlR3VpZGVsaW5lOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgeDogZnVuY3Rpb24oZCl7cmV0dXJuIGQubGFiZWw7fSxcclxuICAgICAgICAgICAgICAgIHk6IGZ1bmN0aW9uKGQpe3JldHVybiBkLnZhbHVlICsgKDFlLTEwKTt9LFxyXG4gICAgICAgICAgICAgICAgc2hvd1ZhbHVlczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHNob3dZQXhpczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZUZvcm1hdDogZnVuY3Rpb24oZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLC4yZicpKGQpO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGRpc2NyZXRlYmFyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGlzcGF0Y2g6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudERibENsaWNrOiBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNDdHJsLm9wZW5UYXJnZXREcmlsbERvd25Qb3BvdmVyKGQzLmV2ZW50LCBlLCAtMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDcwMFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTsgIFxyXG4gICAgfVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5jbGFzcyBGaWx0ZXJlZExpc3RTZXJ2aWNlIHtcclxuXHJcbiAgICBwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHsgfVxyXG5cclxuICAgIHNlYXJjaGVkICh2YWxMaXN0cywgdG9TZWFyY2gsIGxldmVsLCBkcmlsbHR5cGUpIHtcclxuICAgICAgcmV0dXJuIF8uZmlsdGVyKHZhbExpc3RzLCBcclxuICAgICAgICBmdW5jdGlvbiAoaSkge1xyXG4gICAgICAgICAgLyogU2VhcmNoIFRleHQgaW4gYWxsIDMgZmllbGRzICovXHJcbiAgICAgICAgICByZXR1cm4gc2VhcmNoVXRpbChpLCB0b1NlYXJjaCwgbGV2ZWwsIGRyaWxsdHlwZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcGFnZWQgKHZhbExpc3RzLHBhZ2VTaXplKSB7XHJcbiAgICAgIHZhciByZXRWYWwgPSBbXTtcclxuICAgICAgaWYodmFsTGlzdHMpe1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsTGlzdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgIGlmIChpICUgcGFnZVNpemUgPT09IDApIHtcclxuICAgICAgICAgICAgcmV0VmFsW01hdGguZmxvb3IoaSAvIHBhZ2VTaXplKV0gPSBbdmFsTGlzdHNbaV1dO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0VmFsW01hdGguZmxvb3IoaSAvIHBhZ2VTaXplKV0ucHVzaCh2YWxMaXN0c1tpXSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiByZXRWYWw7XHJcbiAgICB9XHJcblxyXG4gICBcclxufVxyXG5mdW5jdGlvbiBzZWFyY2hVdGlsKGl0ZW0sIHRvU2VhcmNoLCBsZXZlbCwgZHJpbGx0eXBlKSB7XHJcbiAgICAvKiBTZWFyY2ggVGV4dCBpbiBhbGwgMyBmaWVsZHMgKi9cclxuICBpZihkcmlsbHR5cGUgPT0gJ3JvdXRlJykge1xyXG4gICAgaWYoaXRlbS5jb3VudHJ5RnJvbSAmJiBpdGVtLmNvdW50cnlUbyAmJiBsZXZlbCA9PSAwKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5jb3VudHJ5RnJvbS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSB8fCBpdGVtLmNvdW50cnlUby50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDIpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbVsnZG9jdW1lbnQjJ10gJiYgbGV2ZWwgPT0gMikge1xyXG4gICAgICByZXR1cm4gKGl0ZW1bJ2RvY3VtZW50IyddLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcbiAgaWYoZHJpbGx0eXBlID09ICdiYXInKSB7XHJcbiAgICBpZihpdGVtLnJvdXRlQ29kZSAmJiBsZXZlbCA9PSAwKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5yb3V0ZUNvZGUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDIpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYoZHJpbGx0eXBlID09ICdmbGlnaHQtcHJvY2VzcycpIHtcclxuICAgIGlmKGl0ZW0uY291bnRyeUZyb20gJiYgaXRlbS5jb3VudHJ5VG8gJiYgbGV2ZWwgPT0gMCkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uY291bnRyeUZyb20udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgfHwgaXRlbS5jb3VudHJ5VG8udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDIpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfWVsc2UgaWYoaXRlbVsnY2FycmllckNvZGUjJ10gJiYgbGV2ZWwgPT0gMykge1xyXG4gICAgICByZXR1cm4gKGl0ZW1bJ2NhcnJpZXJDb2RlIyddLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZihkcmlsbHR5cGUgPT0gJ2ZsaWdodC1jb3VudCcpIHtcclxuICAgIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDApIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfWVsc2UgaWYoaXRlbVsnY2FycmllckNvZGUnXSAmJiBsZXZlbCA9PSAxKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbVsnY2FycmllckNvZGUnXS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYoZHJpbGx0eXBlID09ICdjb3Vwb24tY291bnQnKSB7XHJcbiAgICBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAwKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW1bJ2Zsb3duU2VjdG9yJ10gJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW1bJ2Zsb3duU2VjdG9yJ10udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9EYXRhUHJvdmlkZXJTZXJ2aWNlLnRzXCIgLz5cclxuXHJcbmNsYXNzIE9wZXJhdGlvbmFsU2VydmljZSB7XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnRGF0YVByb3ZpZGVyU2VydmljZScsICckcSddO1xyXG5cclxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlIGRhdGFQcm92aWRlclNlcnZpY2U6IERhdGFQcm92aWRlclNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSkgeyB9XHJcblxyXG5cdGdldFBheEZsb3duT3BySGVhZGVyKHJlcWRhdGEpOiBhbnkge1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4Zmxub3ByL3BheGZsb3dub3ByaGVhZGVyJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0T3ByRmxpZ2h0UHJvY1N0YXR1cyhyZXFkYXRhKSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5vcHIvZmxpZ2h0cHJvY2Vzc2luZ3N0YXR1cyc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldE9wckZsaWdodENvdW50QnlSZWFzb24ocmVxZGF0YSkge1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4Zmxub3ByL2ZsaWdodGNvdW50YnlyZWFzb24nO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0XHR9KTtcclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldE9wckNvdXBvbkNvdW50QnlFeGNlcHRpb24ocmVxZGF0YSkge1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4Zmxub3ByL2NvdXBvbmNvdW50YnlleGNlcHRpb24nO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0XHR9KTtcclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblx0XHJcblx0Z2V0RHJpbGxEb3duIChyZXFkYXRhLCBVUkwpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9IFVSTDtcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdH0sXHJcblx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9jb21tb24vc2VydmljZXMvTG9jYWxTdG9yYWdlU2VydmljZS50c1wiIC8+XHJcblxyXG5jbGFzcyBVc2VyU2VydmljZSB7XHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJyRxJywgJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCAnJHdpbmRvdyddO1xyXG5cdHByaXZhdGUgX3VzZXI6IGJvb2xlYW47XHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSBkYXRhUHJvdmlkZXJTZXJ2aWNlOiBEYXRhUHJvdmlkZXJTZXJ2aWNlLCBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UsIHByaXZhdGUgbG9jYWxTdG9yYWdlU2VydmljZTogTG9jYWxTdG9yYWdlU2VydmljZSwgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSkge1xyXG5cclxuXHR9XHJcblxyXG5cdHNldFVzZXIodXNlcikge1xyXG5cdFx0aWYgKHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UpIHtcclxuXHRcdFx0dGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdyYXBpZE1vYmlsZS51c2VyJywgSlNPTi5zdHJpbmdpZnkodXNlcikpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0bG9nb3V0KCkge1xyXG5cdFx0dGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldE9iamVjdCgncmFwaWRNb2JpbGUudXNlcicsIG51bGwpO1xyXG5cdFx0dGhpcy5fdXNlciA9IG51bGw7XHJcblx0fVxyXG5cclxuXHRpc0xvZ2dlZEluKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3VzZXIgPyB0cnVlIDogZmFsc2U7XHJcblx0fVxyXG5cclxuXHRnZXRVc2VyKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3VzZXI7XHJcblx0fVxyXG5cclxuXHRsb2dpbihfdXNlck5hbWU6IHN0cmluZywgX3Bhc3N3b3JkOiBzdHJpbmcpIHtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3VzZXIvbG9naW4nO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR2YXIgcmVxdWVzdE9iaiA9IHtcclxuXHRcdFx0dXNlcklkOiBfdXNlck5hbWUsXHJcblx0XHRcdHBhc3N3b3JkOiBfcGFzc3dvcmRcclxuXHRcdH1cclxuXHRcdHRoaXMuc2V0VXNlcih7IHVzZXJuYW1lOiBcIlwiIH0pO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcXVlc3RPYmopLnRoZW4oXHJcblx0XHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcclxuXHRcdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3BvbnNlLmRhdGEpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRkZWYucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQgb24gbG9nIGluJyk7XHJcblx0XHRcdFx0ZGVmLnJlamVjdChlcnJvcik7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0VXNlclByb2ZpbGUocmVxZGF0YSkge1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvdXNlci91c2VycHJvZmlsZSc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHRpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdvYmplY3QnKSB7XHJcblx0XHRcdFx0XHRkZWYucmVzb2x2ZShyZXNwb25zZS5kYXRhKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0ZGVmLnJlamVjdChyZXNwb25zZS5kYXRhKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkIG9uIFVzZXJQcm9maWxlJyk7XHJcblx0XHRcdFx0ZGVmLnJlamVjdChlcnJvcik7XHJcblx0XHRcdH0pO1xyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbXBvbmVudHMvbWlzL3NlcnZpY2VzL0ZpbHRlcmVkTGlzdFNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbXBvbmVudHMvdXNlci9zZXJ2aWNlcy9Vc2VyU2VydmljZS50c1wiIC8+XHJcblxyXG5cclxuXHJcbmludGVyZmFjZSB0YWJPYmplY3Qge1xyXG4gICAgdGl0bGU6IHN0cmluZyxcclxuICAgIG5hbWVzOiBzdHJpbmcsXHJcbiAgICBpY29uOiBzdHJpbmdcclxufVxyXG5cclxuaW50ZXJmYWNlIHRvZ2dsZU9iamVjdCB7XHJcbiAgICBtb250aE9yWWVhcjogc3RyaW5nLFxyXG4gICAgdGFyZ2V0UmV2T3JQYXg6IHN0cmluZyxcclxuICAgIHNlY3Rvck9yZGVyOiBzdHJpbmcsXHJcbiAgICBzZWN0b3JSZXZPclBheDogc3RyaW5nLFxyXG4gICAgY2hhcnRPclRhYmxlOiBzdHJpbmdcclxufVxyXG5cclxuaW50ZXJmYWNlIGhlYWRlck9iamVjdCB7XHJcbiAgICBmbG93bk1vbnRoOiBzdHJpbmcsXHJcbiAgICBzdXJjaGFyZ2U6IGJvb2xlYW4sXHJcbiAgICB0YWJJbmRleDogbnVtYmVyLFxyXG4gICAgaGVhZGVySW5kZXg6IG51bWJlcixcclxuICAgIHVzZXJuYW1lOiBzdHJpbmdcclxufVxyXG5cclxuY2xhc3MgTWlzQ29udHJvbGxlcntcclxuXHJcbiAgICBwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzY29wZScsICckaW9uaWNMb2FkaW5nJywgJyR0aW1lb3V0JywgJyR3aW5kb3cnLCAnJGlvbmljUG9wb3ZlcicsXHJcbiAgICAgICAgJyRmaWx0ZXInLCAnTWlzU2VydmljZScsICdDaGFydG9wdGlvblNlcnZpY2UnLCAnRmlsdGVyZWRMaXN0U2VydmljZScsICdVc2VyU2VydmljZScsICdSZXBvcnRTdmMnXTtcclxuXHJcbiAgICBwcml2YXRlIHRhYnM6IFt0YWJPYmplY3RdO1xyXG4gICAgcHJpdmF0ZSB0b2dnbGU6IHRvZ2dsZU9iamVjdDtcclxuICAgIHByaXZhdGUgaGVhZGVyOiBoZWFkZXJPYmplY3Q7XHJcbiAgICBwcml2YXRlIHN1YkhlYWRlcjogYW55O1xyXG4gICAgcHJpdmF0ZSBvcHRpb25zOiBhbnk7XHJcbiAgICBwcml2YXRlIGRyaWxsdGFiczogc3RyaW5nW107XHJcbiAgICBcclxuICAgIHByaXZhdGUgcGFnZVNpemUgPSA0O1xyXG4gICAgcHJpdmF0ZSBjdXJyZW50UGFnZSA9IFtdO1xyXG4gICAgcHJpdmF0ZSBzZWxlY3RlZERyaWxsID0gW107XHJcbiAgICBwcml2YXRlIGdyb3VwcyA9IFtdO1xyXG5cclxuICAgIHByaXZhdGUgaW5mb3BvcG92ZXI6IElvbmljLklQb3BvdmVyO1xyXG4gICAgcHJpdmF0ZSBkcmlsbHBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xyXG4gICAgcHJpdmF0ZSBncmFwaHBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xyXG4gICAgcHJpdmF0ZSBkcmlsbEJhcnBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xyXG5cclxuICAgIHByaXZhdGUgaW5mb2RhdGE6IHN0cmluZztcclxuICAgIHByaXZhdGUgcmVnaW9uTmFtZTogc3RyaW5nO1xyXG4gICAgcHJpdmF0ZSBjaGFydHR5cGU6IHN0cmluZztcclxuICAgIHByaXZhdGUgZ3JhcGhpbmRleDogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSBjb2x1bW5Ub09yZGVyOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIHNob3duR3JvdXA6IG51bWJlcjtcclxuXHJcbiAgICBwcml2YXRlIG1ldHJpY1Jlc3VsdDogYW55O1xyXG4gICAgcHJpdmF0ZSBtZXRyaWNMZWdlbmRzOiBhbnk7XHJcbiAgICBwcml2YXRlIGZhdk1ldHJpY1Jlc3VsdDogYW55O1xyXG5cclxuICAgIHByaXZhdGUgdGFyZ2V0QWN0dWFsRGF0YTogYW55O1xyXG4gICAgcHJpdmF0ZSBmYXZUYXJnZXRCYXJSZXN1bHQ6IGFueTtcclxuICAgIHByaXZhdGUgZmF2VGFyZ2V0TGluZVJlc3VsdDogYW55O1xyXG5cclxuICAgIHByaXZhdGUgcm91dGVSZXZEYXRhOiBhbnk7XHJcblxyXG4gICAgcHJpdmF0ZSByZXZlbnVlRGF0YTogYW55O1xyXG4gICAgcHJpdmF0ZSBTZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHM6IGFueTtcclxuICAgIHByaXZhdGUgcG9wb3ZlcnNob3duOiBib29sZWFuO1xyXG4gICAgcHJpdmF0ZSBkcmlsbFR5cGU6IHN0cmluZztcclxuICAgIHByaXZhdGUgZHJpbGxCYXJMYWJlbDogc3RyaW5nO1xyXG4gICAgcHJpdmF0ZSBkcmlsbE5hbWU6IHN0cmluZ1tdO1xyXG5cclxuICAgIHByaXZhdGUgdGhhdDogYW55O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgJHNjb3BlOiBuZy5JU2NvcGUsIHByaXZhdGUgJGlvbmljTG9hZGluZzogSW9uaWMuSUxvYWRpbmcsIHByaXZhdGUgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSwgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcclxuICAgICAgICBwcml2YXRlICRpb25pY1BvcG92ZXI6IElvbmljLklQb3BvdmVyLCBwcml2YXRlICRmaWx0ZXI6IG5nLklGaWx0ZXJTZXJ2aWNlLCBwcml2YXRlIG1pc1NlcnZpY2U6IE1pc1NlcnZpY2UsIHByaXZhdGUgY2hhcnRvcHRpb25TZXJ2aWNlOiBDaGFydG9wdGlvblNlcnZpY2UsXHJcbiAgICAgICAgcHJpdmF0ZSBmaWx0ZXJlZExpc3RTZXJ2aWNlOiBGaWx0ZXJlZExpc3RTZXJ2aWNlLCBwcml2YXRlIHVzZXJTZXJ2aWNlOiBVc2VyU2VydmljZSwgcHJpdmF0ZSByZXBvcnRTdmM6IFJlcG9ydFN2Yykge1xyXG5cclxuICAgICAgICB0aGlzLnRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICB0aGlzLnRhYnMgPSBbXHJcbiAgICAgICAgeyB0aXRsZTogJ015IERhc2hib2FyZCcsIG5hbWVzOiAnTXlEYXNoYm9hcmQnLCBpY29uIDogJ2ljb25vbi1ob21lJyB9LFxyXG4gICAgICAgIHsgdGl0bGU6ICdNZXRyaWMgU25hcHNob3QnLCBuYW1lczogJ01ldHJpY1NuYXBzaG90JywgaWNvbiA6ICdpb24taG9tZScgfSxcclxuICAgICAgICB7IHRpdGxlOiAnVGFyZ2V0IFZzIEFjdHVhbCcsIG5hbWVzOiAnVGFyZ2V0VnNBY3R1YWwnLCBpY29uIDogJ2lvbi1ob21lJyB9LFxyXG4gICAgICAgIHsgdGl0bGU6ICdSZXZlbnVlIEFuYWx5c2lzJywgbmFtZXM6ICdSZXZlbnVlQW5hbHlzaXMnLCBpY29uIDogJ2lvbi1ob21lJ30sXHJcbiAgICAgICAgeyB0aXRsZTogJ1NlY3RvciAmIENhcnJpZXIgQW5hbHlzaXMnLCBuYW1lczogJ1NlY3RvckFuZENhcnJpZXJBbmFseXNpcycsIGljb24gOiAnaW9uLWhvbWUnIH0sXHJcbiAgICAgICAgeyB0aXRsZTogJ1JvdXRlIFJldmVudWUnLCBuYW1lczogJ1JvdXRlUmV2ZW51ZScsIGljb24gOiAnaW9uLWhvbWUnIH1cclxuICAgICAgICBdO1xyXG5cclxuICAgICAgICB0aGlzLnRvZ2dsZSA9IHtcclxuICAgICAgICAgICAgbW9udGhPclllYXIgOiAnbW9udGgnLFxyXG4gICAgICAgICAgICB0YXJnZXRSZXZPclBheDogJ3JldmVudWUnLFxyXG4gICAgICAgICAgICBzZWN0b3JPcmRlcjogJ3RvcDUnLFxyXG4gICAgICAgICAgICBzZWN0b3JSZXZPclBheDogJ3JldmVudWUnLFxyXG5cdFx0XHRjaGFydE9yVGFibGU6ICdjaGFydCdcclxuICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuXHJcbiAgICAgICAgdGhpcy5oZWFkZXIgPSB7XHJcbiAgICAgICAgICAgIGZsb3duTW9udGg6ICcnLFxyXG4gICAgICAgICAgICBzdXJjaGFyZ2UgOiBmYWxzZSxcclxuICAgICAgICAgICAgdGFiSW5kZXg6IDAsXHJcbiAgICAgICAgICAgIGhlYWRlckluZGV4OiAwLFxyXG4gICAgICAgICAgICB1c2VybmFtZTogJydcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKlxyXG4gICAgICAgIGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpLmJpbmQoJ29yaWVudGF0aW9uY2hhbmdlJywgZnVuY3Rpb24gKGUsIHNjb3BlKSB7XHJcbiAgICAgICAgICAgIHRoaXMub25TbGlkZU1vdmUoe2luZGV4OiB0aGlzLmhlYWRlci50YWJJbmRleH0pO1xyXG4gICAgICAgIH0pOyAqL1xyXG4gICAgICAgIGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpLmJpbmQoJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5vcmllbnRhdGlvbkNoYW5nZSk7IFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vdGhpcy4kc2NvcGUuJHdhdGNoKCdNaXNDdHJsLmhlYWRlci5zdXJjaGFyZ2UnLCAoKSA9PiB7IHRoaXMub25TbGlkZU1vdmUoe2luZGV4OnRoaXMuaGVhZGVyLnRhYkluZGV4fSk7IH0sIHRydWUpO1xyXG4gICAgICAgIHRoaXMuaW5pdERhdGEoKTtcclxuXHJcbiAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCdvblNsaWRlTW92ZScsIChldmVudDogYW55LCByZXNwb25zZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLk1pc0N0cmwub25TbGlkZU1vdmUocmVzcG9uc2UpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLiRzY29wZS4kb24oJ29wZW5EcmlsbFBvcHVwJywgKGV2ZW50OiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ21ldHJpYycpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLk1pc0N0cmwub3BlbkJhckRyaWxsRG93blBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG4gICAgaW5pdERhdGEoKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL2luZm90b29sdGlwLmh0bWwnLCB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oaW5mb3BvcG92ZXIpIHtcclxuICAgICAgICAgICAgdGhhdC5pbmZvcG9wb3ZlciA9IGluZm9wb3BvdmVyO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9kcmlsZG93bi5odG1sJywge1xyXG4gICAgICAgICAgICBzY29wZTogdGhhdC4kc2NvcGVcclxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGRyaWxscG9wb3Zlcikge1xyXG4gICAgICAgICAgICB0aGF0LmRyaWxscG9wb3ZlciA9IGRyaWxscG9wb3ZlcjtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9iYXJkcmlsZG93bi5odG1sJywge1xyXG4gICAgICAgICAgICBzY29wZTogdGhhdC4kc2NvcGVcclxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGRyaWxsQmFycG9wb3Zlcikge1xyXG4gICAgICAgICAgICB0aGF0LmRyaWxsQmFycG9wb3ZlciA9IGRyaWxsQmFycG9wb3ZlcjtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5vcHRpb25zID0ge1xyXG4gICAgICAgICAgICBtZXRyaWM6IHRoaXMuY2hhcnRvcHRpb25TZXJ2aWNlLm1ldHJpY0JhckNoYXJ0T3B0aW9ucyh0aGlzKSxcclxuICAgICAgICAgICAgdGFyZ2V0TGluZUNoYXJ0OiB0aGlzLmNoYXJ0b3B0aW9uU2VydmljZS5saW5lQ2hhcnRPcHRpb25zKCksXHJcbiAgICAgICAgICAgIHRhcmdldEJhckNoYXJ0OiB0aGlzLmNoYXJ0b3B0aW9uU2VydmljZS50YXJnZXRCYXJDaGFydE9wdGlvbnModGhpcyksXHJcbiAgICAgICAgICAgIHBhc3NlbmdlckNoYXJ0OiB0aGlzLmNoYXJ0b3B0aW9uU2VydmljZS5tdWx0aUJhckNoYXJ0T3B0aW9ucygpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHJlcSA9IHtcclxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFBheEZsb3duTWlzSGVhZGVyKHJlcSkudGhlbihcclxuICAgICAgICAgICAgICAgIChkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zdWJIZWFkZXIgPSBkYXRhLnJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5oZWFkZXIuZmxvd25Nb250aCA9IHRoYXQuc3ViSGVhZGVyLnBheEZsb3duTWlzTW9udGhzWzBdLmZsb3dNb250aDtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm9uU2xpZGVNb3ZlKHtpbmRleDogMH0pOyAgXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgLy9cclxuXHRcdFx0XHRcclxuXHRcdHRoYXQuaGVhZGVyLnVzZXJuYW1lID0gdGhhdC5nZXRQcm9maWxlVXNlck5hbWUoKTtcclxuICAgICAgICBcclxuICAgIH1cclxuICAgIHNlbGVjdGVkRmxvd25Nb250aChtb250aDogc3RyaW5nKXtcclxuICAgICAgICByZXR1cm4gKG1vbnRoID09IHRoaXMuaGVhZGVyLmZsb3duTW9udGgpO1xyXG4gICAgfVxyXG4gICAgb3JpZW50YXRpb25DaGFuZ2UgPSAoKTogYm9vbGVhbiA9PiB7XHJcbiAgICAgICAgdGhpcy5vblNsaWRlTW92ZSh7IGluZGV4OiB0aGlzLmhlYWRlci50YWJJbmRleCB9KTtcclxuICAgIH0gXHJcbiAgICBvcGVuaW5mb1BvcG92ZXIgKCRldmVudCwgaW5kZXgpIHtcclxuICAgICAgICBpZiAodHlwZW9mIGluZGV4ID09IFwidW5kZWZpbmVkXCIgfHwgaW5kZXggPT0gXCJcIikge1xyXG4gICAgICAgICAgICB0aGlzLmluZm9kYXRhID0gJ05vIGluZm8gYXZhaWxhYmxlJztcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgdGhpcy5pbmZvZGF0YT1pbmRleDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc29sZS5sb2coaW5kZXgpO1xyXG4gICAgICAgIHRoaXMuaW5mb3BvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgfTtcclxuXHJcbiAgICBnZXRQcm9maWxlVXNlck5hbWUoKTogc3RyaW5nIHtcclxuICAgICAgICB2YXIgb2JqID0gdGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdyYXBpZE1vYmlsZS51c2VyJyk7XHJcbiAgICAgICAgdmFyIHByb2ZpbGVVc2VyTmFtZSA9IEpTT04ucGFyc2Uob2JqKTtcclxuICAgICAgICByZXR1cm4gcHJvZmlsZVVzZXJOYW1lLnVzZXJuYW1lO1xyXG4gICAgfVxyXG5cclxuICAgIGNsb3NlUG9wb3ZlcigpIHtcclxuICAgICAgICB0aGlzLmdyYXBocG9wb3Zlci5oaWRlKCk7XHJcbiAgICB9O1xyXG4gICAgY2xvc2VzQmFyUG9wb3Zlcigpe1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLmhpZGUoKTtcclxuICAgIH1cclxuICAgIGNsb3NlSW5mb1BvcG92ZXIoKSB7XHJcbiAgICAgICAgdGhpcy5pbmZvcG9wb3Zlci5oaWRlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlSGVhZGVyKCkge1xyXG5cdFx0dmFyIGZsb3duTW9udGggPSB0aGlzLmhlYWRlci5mbG93bk1vbnRoO1xyXG4gICAgICAgIHRoaXMuaGVhZGVyLmhlYWRlckluZGV4ID0gXy5maW5kSW5kZXgodGhpcy5zdWJIZWFkZXIucGF4Rmxvd25NaXNNb250aHMsIGZ1bmN0aW9uKGNocjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjaHIuZmxvd01vbnRoID09IGZsb3duTW9udGg7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc29sZS5sb2codGhpcy5oZWFkZXIuaGVhZGVySW5kZXgpO1xyXG5cdFx0dGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6IHRoaXMuaGVhZGVyLmhlYWRlckluZGV4fSk7XHJcbiAgICB9XHJcblxyXG4gICAgb25TbGlkZU1vdmUoZGF0YTogYW55KSB7XHJcbiAgICAgICAgdGhpcy5oZWFkZXIudGFiSW5kZXggPSBkYXRhLmluZGV4O1xyXG5cdFx0dGhpcy50b2dnbGUuY2hhcnRPclRhYmxlID0gXCJjaGFydFwiO1xyXG4gICAgICAgIHN3aXRjaCh0aGlzLmhlYWRlci50YWJJbmRleCl7XHJcbiAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgdGhpcy5nZXRGbG93bkZhdm9yaXRlcygpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICB0aGlzLmNhbGxNZXRyaWNTbmFwc2hvdCgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICB0aGlzLmNhbGxUYXJnZXRWc0FjdHVhbCgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICB0aGlzLmNhbGxSZXZlbnVlQW5hbHlzaXMoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgNDpcclxuICAgICAgICAgICAgdGhpcy5jYWxsU2VjdG9yQ2FycmllckFuYWx5c2lzKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDU6XHJcbiAgICAgICAgICAgIHRoaXMuY2FsbFJvdXRlUmV2ZW51ZSgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHRvZ2dsZU1ldHJpYyAodmFsKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUubW9udGhPclllYXIgPSB2YWw7XHJcbiAgICAgICAgdGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4fSk7XHJcbiAgICB9XHJcbiAgICB0b2dnbGVTdXJjaGFyZ2UoKSB7XHJcbiAgICAgICAgdGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6dGhpcy5oZWFkZXIudGFiSW5kZXh9KTtcclxuICAgIH1cclxuICAgIHRvZ2dsZVRhcmdldCh2YWwpIHtcclxuICAgICAgICB0aGlzLnRvZ2dsZS50YXJnZXRSZXZPclBheCA9IHZhbDtcclxuICAgIH1cclxuXHJcbiAgICB0b2dnbGVTZWN0b3IodmFsKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUuc2VjdG9yUmV2T3JQYXggPSB2YWw7XHJcbiAgICB9XHJcblxyXG4gICAgY2FsbE1ldHJpY1NuYXBzaG90KCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICB0b2dnbGUxOiB0aGlzLnRvZ2dsZS5tb250aE9yWWVhcixcclxuICAgICAgICAgICAgZnVsbERhdGFGbGFnOiAnTidcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRNZXRyaWNTbmFwc2hvdChyZXFkYXRhKVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuXHJcbiAgICAgICAgICAgIC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxyXG4gICAgICAgICAgICB0aGF0Lm1ldHJpY1Jlc3VsdCAgPSBfLnNvcnRCeShkYXRhLnJlc3BvbnNlLmRhdGEubWV0cmljU25hcHNob3RDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBfLmZvckVhY2godGhhdC5tZXRyaWNSZXN1bHQsIGZ1bmN0aW9uIChuOiBhbnksIHZhbHVlOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIG4udmFsdWVzWzBdLmNvbG9yID0gJyM0QTkwRTInO1xyXG4gICAgICAgICAgICAgICAgbi52YWx1ZXNbMV0uY29sb3IgPSAnIzUwRTNDMic7XHJcbiAgICAgICAgICAgICAgICBpZihuLnZhbHVlc1syXSkgbi52YWx1ZXNbMl0uY29sb3IgPSAnI0I4RTk4Nic7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhhdC5mYXZNZXRyaWNSZXN1bHQgPSBfLmZpbHRlcih0aGF0Lm1ldHJpY1Jlc3VsdCwgZnVuY3Rpb24odTogYW55KSB7XHJcbiAgICAgICAgICAgICAgICBpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGF0Lm1ldHJpY0xlZ2VuZHMgPSBkYXRhLnJlc3BvbnNlLmRhdGEubGVnZW5kcztcclxuICAgICAgICAgICAgaWYodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhhdC5tZXRyaWNSZXN1bHQgPSB0aGF0LmZhdk1ldHJpY1Jlc3VsdDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxUYXJnZXRWc0FjdHVhbCgpIHtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcclxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VybmFtZSxcclxuICAgICAgICAgICAgdG9nZ2xlMTogJycsXHJcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJydcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cclxuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0VGFyZ2V0VnNBY3R1YWwocmVxZGF0YSlcclxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxyXG4gICAgICAgICAgICB0aGF0LmZhdlRhcmdldExpbmVSZXN1bHQgPSBfLmZpbHRlcihkYXRhLnJlc3BvbnNlLmRhdGEubGluZUNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7IFxyXG4gICAgICAgICAgICAgICAgaWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhhdC5mYXZUYXJnZXRCYXJSZXN1bHQgPSBfLmZpbHRlcihkYXRhLnJlc3BvbnNlLmRhdGEudmVyQmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHsgXHJcbiAgICAgICAgICAgICAgICBpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBfLmZvckVhY2goZGF0YS5yZXNwb25zZS5kYXRhLnZlckJhckNoYXJ0cywgZnVuY3Rpb24gKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgbi52YWx1ZXNbMF0uY29sb3IgPSAnIzRBOTBFMic7XHJcbiAgICAgICAgICAgICAgICBuLnZhbHVlc1sxXS5jb2xvciA9ICcjNTBFM0MyJztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHZhciBsaW5lQ29sb3JzID0gW3tcImNvbG9yXCI6IFwiIzRBOTBFMlwiLCBcImNsYXNzZWRcIjogXCJkYXNoZWRcIixcInN0cm9rZVdpZHRoXCI6IDJ9LFxyXG4gICAgICAgICAgICB7XCJjb2xvclwiOiBcIiM1MEUzQzJcIn0se1wiY29sb3JcIjogXCIjQjhFOTg2XCIsIFwiYXJlYVwiIDogdHJ1ZSwgXCJkaXNhYmxlZFwiOiB0cnVlfV07XHJcblxyXG4gICAgICAgICAgICBfLmZvckVhY2goZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHMsIGZ1bmN0aW9uIChuOiBhbnksIHZhbHVlOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIF8ubWVyZ2Uobi5saW5lQ2hhcnRJdGVtcywgbGluZUNvbG9ycyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHMpO1xyXG5cclxuICAgICAgICAgICAgdGhhdC50YXJnZXRBY3R1YWxEYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgaG9yQmFyQ2hhcnQ6IGRhdGEucmVzcG9uc2UuZGF0YS52ZXJCYXJDaGFydHMsXHJcbiAgICAgICAgICAgICAgICBsaW5lQ2hhcnQ6IGRhdGEucmVzcG9uc2UuZGF0YS5saW5lQ2hhcnRzXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XHJcbiAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxSb3V0ZVJldmVudWUoKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHZhciByb3V0ZVJldlJlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcclxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VybmFtZVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFJvdXRlUmV2ZW51ZShyb3V0ZVJldlJlcXVlc3QpXHJcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB0aGF0LnJvdXRlUmV2RGF0YSA9IGRhdGEucmVzcG9uc2UuZGF0YTtcclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGNhbGxSZXZlbnVlQW5hbHlzaXMoKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICAgICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXHJcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgIHRvZ2dsZTE6ICcnLFxyXG4gICAgICAgICAgICBmdWxsRGF0YUZsYWc6ICcnXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0UmV2ZW51ZUFuYWx5c2lzKHJlcWRhdGEpXHJcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAvLyBmYXYgSXRlbXMgdG8gZGlzcGxheSBpbiBkYXNoYm9hcmRcclxuICAgICAgICAgICAgdmFyIGpzb25PYmogPSBkYXRhLnJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgIHZhciBzb3J0ZWREYXRhID0gXy5zb3J0QnkoanNvbk9iai5tdWx0aWJhckNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7IFxyXG4gICAgICAgICAgICAgICAgaWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHZhciBmYXZSZXZlbnVlQmFyUmVzdWx0ID0gXy5maWx0ZXIoc29ydGVkRGF0YSwgZnVuY3Rpb24odTogYW55KSB7IFxyXG4gICAgICAgICAgICAgICAgaWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdmFyIHNvcnRlZERhdGEgPSBfLnNvcnRCeShqc29uT2JqLnBpZUNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7IFxyXG4gICAgICAgICAgICAgICAgaWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHZhciBmYXZSZXZlbnVlUGllUmVzdWx0ID0gXy5maWx0ZXIoc29ydGVkRGF0YSwgZnVuY3Rpb24odTogYW55KSB7IFxyXG4gICAgICAgICAgICAgICAgaWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXJDb2xvcnMgPSBbJyM0QTkwRTInLCAnIzUwRTNDMiddO1xyXG4gICAgICAgICAgICBfLm1lcmdlKGpzb25PYmoubXVsdGliYXJDaGFydHNbMV0sIGJhckNvbG9ycyk7XHJcbiAgICAgICAgICAgIF8uZm9yRWFjaChqc29uT2JqLm11bHRpYmFyQ2hhcnRzLCBmdW5jdGlvbihuOiBhbnksIHZhbHVlOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIG4uY29sb3IgPSBiYXJDb2xvcnNbdmFsdWVdO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBwaWVDb2xvcnMgPSBbe1wiY29sb3JcIjogXCIjMjhiNmY2XCJ9LHtcImNvbG9yXCI6IFwiIzdiZDRmY1wifSx7XCJjb2xvclwiOiBcIiNDNkU1RkFcIn1dO1xyXG4gICAgICAgICAgICBfLmZvckVhY2goanNvbk9iai5waWVDaGFydHNbMF0uZGF0YSwgZnVuY3Rpb24gKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgbi5sYWJlbCA9IG4ueHZhbDtcclxuICAgICAgICAgICAgICAgIG4udmFsdWUgPSBuLnl2YWw7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgXy5tZXJnZShqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCBwaWVDb2xvcnMpO1xyXG5cclxuICAgICAgICAgICAgdGhhdC5yZXZlbnVlRGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIHJldmVudWVQaWVDaGFydCA6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxyXG4gICAgICAgICAgICAgICAgcmV2ZW51ZUJhckNoYXJ0IDoganNvbk9iai5tdWx0aWJhckNoYXJ0c1sxXS5tdWx0aWJhckNoYXJ0SXRlbXMsXHJcbiAgICAgICAgICAgICAgICByZXZlbnVlSG9yQmFyQ2hhcnQgOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzJdLm11bHRpYmFyQ2hhcnRJdGVtc1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG9wZW5EcmlsbERvd24ocmVnaW9uRGF0YSxzZWxGaW5kTGV2ZWwpIHtcclxuICAgICAgICBzZWxGaW5kTGV2ZWwgPSBOdW1iZXIoc2VsRmluZExldmVsKTtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbF0gPSByZWdpb25EYXRhO1xyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWwgKyAxXSA9ICcnO1xyXG4gICAgICAgIGlmKHNlbEZpbmRMZXZlbCAhPSAnMycpIHtcclxuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgICAgICAgIHRoaXMucmVnaW9uTmFtZSA9IChyZWdpb25EYXRhLnJlZ2lvbk5hbWUpID8gcmVnaW9uRGF0YS5yZWdpb25OYW1lIDogcmVnaW9uRGF0YS5jYWhydE5hbWU7XHJcbiAgICAgICAgICAgIHZhciBjb3VudHJ5RnJvbVRvID0gKHJlZ2lvbkRhdGEuY291bnRyeUZyb20gJiYgcmVnaW9uRGF0YS5jb3VudHJ5VG8pID8gcmVnaW9uRGF0YS5jb3VudHJ5RnJvbSArICctJyArIHJlZ2lvbkRhdGEuY291bnRyeVRvIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIHNlY3RvckZyb21UbyA9IChyZWdpb25EYXRhLmZsb3duU2VjdG9yICYmIGRyaWxsTGV2ZWwgPj0gMykgPyByZWdpb25EYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIGZsaWdodE51bWJlciA9IChyZWdpb25EYXRhLmZsaWdodE51bWJlciAmJiBkcmlsbExldmVsID09IDQpID8gcmVnaW9uRGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xyXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHJcbiAgICAgICAgICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXHJcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICAgICAgICAgIFwicmVnaW9uTmFtZVwiOiAodGhpcy5yZWdpb25OYW1lKT8gdGhpcy5yZWdpb25OYW1lIDogXCJOb3J0aCBBbWVyaWNhXCIsXHJcbiAgICAgICAgICAgICAgICBcImNvdW50cnlGcm9tVG9cIjogY291bnRyeUZyb21UbyxcclxuICAgICAgICAgICAgICAgIFwic2VjdG9yRnJvbVRvXCI6IHNlY3RvckZyb21UbyxcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiAwXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlRHJpbGxEb3duKHJlcWRhdGEpXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBkYXRhLnJlc3BvbnNlO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgZmluZExldmVsID0gZHJpbGxMZXZlbCAtIDE7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhLnN0YXR1cyk7XHJcbiAgICAgICAgICAgICAgICBpZihkYXRhLnN0YXR1cyA9PSAnc3VjY2Vzcycpe1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSBkYXRhLmRhdGEucm93cztcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gZGF0YS5kYXRhLnJvd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuc29ydCgncGF4Q291bnQnLGZpbmRMZXZlbCxmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGRyaWxsTGV2ZWwpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuY2xlYXJEcmlsbChmaW5kTGV2ZWwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LGZ1bmN0aW9uKGVycm9yKXtcclxuICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhhdC5jbG9zZXNQb3BvdmVyKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgICAgICBhbGVydCgnU2VydmVyIEVycm9yJyk7XHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICB9IFxyXG4gICAgfVxyXG4gICAgY2xlYXJEcmlsbChsZXZlbDogbnVtYmVyKSB7XHJcbiAgICAgICAgdmFyIGk6IG51bWJlcjtcclxuICAgICAgICBmb3IgKHZhciBpID0gbGV2ZWw7IGkgPCB0aGlzLmdyb3Vwcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB0aGlzLmdyb3Vwc1tpXS5pdGVtcy5zcGxpY2UoMCwgMSk7XHJcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldLm9yZ0l0ZW1zLnNwbGljZSgwLCAxKTtcclxuICAgICAgICAgICAgdGhpcy5zb3J0KCdwYXhDb3VudCcsaSxmYWxzZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZHJpbGxEb3duUmVxdWVzdCAoZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpe1xyXG4gICAgICAgIHZhciByZXFkYXRhO1xyXG4gICAgICAgIGlmKGRyaWxsVHlwZSA9PSAnYmFyJykge1xyXG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgICAgICAgaWYgKGRhdGEubGFiZWwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGEubGFiZWw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBkcmlsbEJhcjogc3RyaW5nO1xyXG4gICAgICAgICAgICBkcmlsbEJhciA9IChkYXRhLmxhYmVsKSA/IGRhdGEubGFiZWwgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgcm91dGVDb2RlID0gKGRhdGEucm91dGVDb2RlKSA/IGRhdGEucm91dGVDb2RlIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIHNlY3RvciA9IChkYXRhLmZsb3duU2VjdG9yKSA/IGRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcclxuXHJcbiAgICAgICAgICAgIGlmICghZHJpbGxCYXIpIHtcclxuICAgICAgICAgICAgICAgIGRyaWxsQmFyID0gdGhpcy5kcmlsbEJhckxhYmVsO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZHJpbGxCYXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cclxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxyXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXHJcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICAgICAgICAgIFwiZHJpbGxCYXJcIjogZHJpbGxCYXIsXHJcbiAgICAgICAgICAgICAgICBcInJvdXRlQ29kZVwiOiByb3V0ZUNvZGUsXHJcbiAgICAgICAgICAgICAgICBcInNlY3RvclwiOiBzZWN0b3IsXHJcbiAgICAgICAgICAgICAgICBcImZsaWdodE51bWJlclwiOiBmbGlnaHROdW1iZXJcclxuICAgICAgICAgICAgfTsgIFxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGlmKGRyaWxsVHlwZSA9PSAndGFyZ2V0Jykge1xyXG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgICAgICAgaWYgKGRhdGEubGFiZWwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGEubGFiZWw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciByb3V0ZXR5cGU6IHN0cmluZztcclxuICAgICAgICAgICAgcm91dGV0eXBlID0gKGRhdGEucm91dGV0eXBlKSA/IGRhdGEucm91dGV0eXBlIDogXCJcIjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cclxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxyXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcInN0cmluZ1wiLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXHJcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICAgICAgICAgIFwicm91dGV0eXBlXCI6IHJvdXRldHlwZVxyXG4gICAgICAgICAgICB9OyAgXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXFkYXRhO1xyXG4gICAgfVxyXG4gICAgZ2V0RHJpbGxEb3duVVJMIChkcmlsRG93blR5cGUpIHtcclxuICAgICAgICB2YXIgdXJsXHJcbiAgICAgICAgc3dpdGNoKGRyaWxEb3duVHlwZSl7XHJcbiAgICAgICAgICAgIGNhc2UgJ2Jhcic6XHJcbiAgICAgICAgICAgICAgICB1cmwgPSBcIi9wYXhmbG5taXMvbXNwYXhuZXRyZXZkcmlsbFwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAndGFyZ2V0JzpcclxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy90Z3R2c2FjdGRyaWxsXCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHVybDtcclxuICAgIH1cclxuICAgIG9wZW5CYXJEcmlsbERvd24oZGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgc2VsRmluZExldmVsID0gTnVtYmVyKHNlbEZpbmRMZXZlbCk7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWxdID0gZGF0YTtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsICsgMV0gPSAnJztcclxuICAgICAgICBcclxuICAgICAgICBpZiAoc2VsRmluZExldmVsICE9ICh0aGlzLmdyb3Vwcy5sZW5ndGggLSAxKSkge1xyXG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgICAgICAgdmFyIHJlcWRhdGEgPSB0aGlzLmRyaWxsRG93blJlcXVlc3QodGhpcy5kcmlsbFR5cGUsIHNlbEZpbmRMZXZlbCwgZGF0YSk7XHJcbiAgICAgICAgICAgIHZhciBVUkwgPSB0aGlzLmdldERyaWxsRG93blVSTCh0aGlzLmRyaWxsVHlwZSk7XHJcbiAgICAgICAgICAgIHRoaXMubWlzU2VydmljZS5nZXREcmlsbERvd24ocmVxZGF0YSwgVVJMKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gZGF0YS5yZXNwb25zZTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZmluZExldmVsID0gZHJpbGxMZXZlbCAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YS5zdGF0dXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnN0YXR1cyA9PSAnc3VjY2VzcycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5pdGVtc1swXSA9IGRhdGEuZGF0YS5yb3dzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gZGF0YS5kYXRhLnJvd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuc2hvd25Hcm91cCA9IGZpbmRMZXZlbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zb3J0KCdwYXhDb3VudCcsIGZpbmRMZXZlbCwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZHJpbGxMZXZlbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZmluZExldmVsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuY2xvc2VzUG9wb3ZlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICBhbGVydCgnU2VydmVyIEVycm9yJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpbml0aWF0ZUFycmF5KGRyaWxsdGFicykge1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgaSBpbiBkcmlsbHRhYnMpIHtcclxuICAgICAgICAgICAgdGhpcy5ncm91cHNbaV0gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogaSxcclxuICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMuZHJpbGx0YWJzW2ldLFxyXG4gICAgICAgICAgICAgICAgaXRlbXM6IFtdLFxyXG4gICAgICAgICAgICAgICAgb3JnSXRlbXM6IFtdLFxyXG4gICAgICAgICAgICAgICAgSXRlbXNCeVBhZ2U6IFtdXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgb3BlbkJhckRyaWxsRG93blBvcG92ZXIoJGV2ZW50LCBzZWxEYXRhLCBzZWxGaW5kTGV2ZWwpIHtcclxuICAgICAgICB0aGlzLmRyaWxsTmFtZSA9ICdNRVRSSUMgU05BUFNIT1QgUkVQT1JUIC0gJyArIHNlbERhdGEucG9pbnQubGFiZWw7XHJcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAnYmFyJztcclxuICAgICAgICB0aGlzLmRyaWxsQmFycG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ1JvdXRlIExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdEYXRhIExldmVsJywgJ0ZsaWdodCBMZXZlbCddO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XHJcbiAgICAgICAgdGhpcy5vcGVuQmFyRHJpbGxEb3duKHNlbERhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XHJcbiAgICB9O1xyXG4gICAgb3BlblRhcmdldERyaWxsRG93blBvcG92ZXIoJGV2ZW50LCBzZWxEYXRhLCBzZWxGaW5kTGV2ZWwpIHtcclxuICAgICAgICB0aGlzLmRyaWxsTmFtZSA9ICdUYXJnZXQgVnMgQWN0dWFsJztcclxuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICd0YXJnZXQnO1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnUm91dGUgVHlwZScsICdSb3V0ZSBjb2RlJ107XHJcbiAgICAgICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcclxuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcclxuICAgIH07XHJcblxyXG4gICAgb3BlblBvcG92ZXIgKCRldmVudCwgaW5kZXgsIGNoYXJ0dHlwZSkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB0aGlzLmNoYXJ0dHlwZSA9IGNoYXJ0dHlwZTtcclxuICAgICAgICB0aGlzLmdyYXBoaW5kZXggPSBpbmRleDtcclxuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9ncmFwaC1wb3BvdmVyLmh0bWwnLCB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xyXG4gICAgICAgICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcclxuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG9wZW5TZWN0b3JQb3BvdmVyICgkZXZlbnQsaW5kZXgsY2hhcnR0eXBlKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuY2hhcnR0eXBlID0gY2hhcnR0eXBlO1xyXG4gICAgICAgIHRoaXMuZ3JhcGhpbmRleCA9IGluZGV4O1xyXG4gICAgICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL3NlY3Rvci1ncmFwaC1wb3BvdmVyLmh0bWwnLCB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xyXG4gICAgICAgICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcclxuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxTZWN0b3JDYXJyaWVyQW5hbHlzaXMgKCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgICAgICAgdG9nZ2xlMjogJycsXHJcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcblxyXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRTZWN0b3JDYXJyaWVyQW5hbHlzaXMocmVxZGF0YSlcclxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxyXG4gICAgICAgICAgICB2YXIganNvbk9iaiA9IGRhdGEucmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAgICAgXy5mb3JFYWNoKGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzLCBmdW5jdGlvbih2YWw6IGFueSwgaTogbnVtYmVyKXtcclxuICAgICAgICAgICAgICAgIHZhbFsnb3RoZXJzJ10gPSB2YWwuaXRlbXMuc3BsaWNlKC0xLCAxKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHZhciBzb3J0ZWREYXRhID0gXy5zb3J0QnkoanNvbk9iai5TZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuICAgICAgICAgICAgICAgIGlmICh1KSByZXR1cm4gW3UuZmF2b3JpdGVDaGFydFBvc2l0aW9uXTsgXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB2YXIgZmF2U2VjdG9yQ2FycmllclJlc3VsdCA9IF8uZmlsdGVyKHNvcnRlZERhdGEsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuICAgICAgICAgICAgICAgIGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGF0LlNlY3RvckNhcnJpZXJBbmFseXNpc0NoYXJ0cyA9IGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzO1xyXG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHRhcmdldEFjdHVhbEZpbHRlcih0aGF0OiBNaXNDb250cm9sbGVyKSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGl0ZW06IGFueSl7XHJcbiAgICAgICAgICAgIHJldHVybiBpdGVtLnRvZ2dsZTEgPT0gdGhhdC50b2dnbGUudGFyZ2V0UmV2T3JQYXg7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNlY3RvckNhcnJpZXJGaWx0ZXIodGhhdDogTWlzQ29udHJvbGxlcikge1xyXG4gICAgICAgdGhhdCA9IHRoaXMudGhhdDtcclxuICAgICAgIHJldHVybiBmdW5jdGlvbihpdGVtOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGl0ZW0udG9nZ2xlMSA9PSB0aGF0LnRvZ2dsZS5zZWN0b3JPcmRlciAmJiBpdGVtLnRvZ2dsZTIgPT0gdGhhdC50b2dnbGUuc2VjdG9yUmV2T3JQYXg7IFxyXG4gICAgICB9XHJcbiAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgcmV2ZW51ZUFuYWx5c2lzRmlsdGVyKGl0ZW06IGFueSkge1xyXG4gICAgICAgIHZhciBzdXJjaGFyZ2VGbGFnID0gKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyBcIllcIiA6IFwiTlwiO1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHN1cmNoYXJnZUZsYWcrJyA6ICcraXRlbSk7XHJcbiAgICAgICAgaWYoIGl0ZW0uc3VyY2hhcmdlRmxhZyA9PSBzdXJjaGFyZ2VGbGFnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlOyBcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEZsb3duRmF2b3JpdGVzKCkge1xyXG4gICAgICAgIHRoaXMuY2FsbE1ldHJpY1NuYXBzaG90KCk7XHJcbiAgICAgICAgdGhpcy5jYWxsVGFyZ2V0VnNBY3R1YWwoKTtcclxuICAgICAgICB0aGlzLmNhbGxSZXZlbnVlQW5hbHlzaXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBpb25pY0xvYWRpbmdTaG93KCkge1xyXG4gICAgICAgIHRoaXMuJGlvbmljTG9hZGluZy5zaG93KHtcclxuICAgICAgICAgICAgdGVtcGxhdGU6ICc8aW9uLXNwaW5uZXIgY2xhc3M9XCJzcGlubmVyLWNhbG1cIj48L2lvbi1zcGlubmVyPidcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgaW9uaWNMb2FkaW5nSGlkZSgpIHtcclxuICAgICAgICB0aGlzLiRpb25pY0xvYWRpbmcuaGlkZSgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBvcGVuRHJpbGxEb3duUG9wb3ZlcigkZXZlbnQscmVnaW9uRGF0YSxzZWxGaW5kTGV2ZWwpIHtcclxuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdyb3V0ZSc7XHJcbiAgICAgICAgdGhpcy5kcmlsbHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydDb3VudHJ5IExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdGbGlnaHQgTGV2ZWwnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcclxuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgICAgIHRoaXMub3BlbkRyaWxsRG93bihyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNsb3Nlc1BvcG92ZXIoKSB7XHJcbiAgICAgICAgdGhpcy5kcmlsbHBvcG92ZXIuaGlkZSgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBpc0RyaWxsUm93U2VsZWN0ZWQobGV2ZWwsb2JqKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0ZWREcmlsbFtsZXZlbF0gPT0gb2JqO1xyXG4gICAgfVxyXG4gICAgc2VhcmNoUmVzdWx0cyAobGV2ZWwsb2JqKSB7XHJcbiAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy5maWx0ZXJlZExpc3RTZXJ2aWNlLnNlYXJjaGVkKHRoaXMuZ3JvdXBzW2xldmVsXS5vcmdJdGVtc1swXSwgb2JqLnNlYXJjaFRleHQsIGxldmVsLCB0aGlzLmRyaWxsVHlwZSk7XHJcbiAgICAgICAgaWYgKG9iai5zZWFyY2hUZXh0ID09ICcnKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVzZXRBbGwobGV2ZWwpOyBcclxuICAgICAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy5ncm91cHNbbGV2ZWxdLm9yZ0l0ZW1zWzBdO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IDA7XHJcbiAgICAgICAgdGhpcy5wYWdpbmF0aW9uKGxldmVsKTsgXHJcbiAgICB9XHJcbiAgICBwYWdpbmF0aW9uIChsZXZlbCkge1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5JdGVtc0J5UGFnZSA9IHRoaXMuZmlsdGVyZWRMaXN0U2VydmljZS5wYWdlZCh0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0sIHRoaXMucGFnZVNpemUgKTtcclxuICAgIH07XHJcblxyXG4gICAgc2V0UGFnZSAobGV2ZWwsIHBhZ2Vubykge1xyXG4gICAgICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gcGFnZW5vO1xyXG4gICAgfTtcclxuICAgIGxhc3RQYWdlKGxldmVsKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UubGVuZ3RoIC0gMTtcclxuICAgIH07XHJcbiAgICByZXNldEFsbChsZXZlbCkge1xyXG4gICAgICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcclxuICAgIH1cclxuICAgIHNvcnQoc29ydEJ5LGxldmVsLG9yZGVyKSB7XHJcbiAgICAgICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XHJcbiAgICAgICAgdGhpcy5jb2x1bW5Ub09yZGVyID0gc29ydEJ5OyBcclxuICAgICAgICAvLyRGaWx0ZXIgLSBTdGFuZGFyZCBTZXJ2aWNlXHJcbiAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy4kZmlsdGVyKCdvcmRlckJ5JykodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLmNvbHVtblRvT3JkZXIsIG9yZGVyKTsgXHJcbiAgICAgICAgdGhpcy5wYWdpbmF0aW9uKGxldmVsKTsgICAgXHJcbiAgICB9O1xyXG4gICAgcmFuZ2UodG90YWwsIGxldmVsKSB7XHJcbiAgICAgICAgdmFyIHJldCA9IFtdO1xyXG4gICAgICAgIHZhciBzdGFydDogbnVtYmVyO1xyXG4gICAgICAgIHN0YXJ0ID0gTnVtYmVyKHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdKSAtIDI7XHJcbiAgICAgICAgaWYoc3RhcnQgPCAwKSB7XHJcbiAgICAgICAgICBzdGFydCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBrID0gMTtcclxuICAgICAgICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCB0b3RhbDsgaSsrKSB7XHJcbiAgICAgICAgICByZXQucHVzaChpKTtcclxuICAgICAgICAgIGsrKztcclxuICAgICAgICAgIGlmIChrID4gNikge1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJldDtcclxuICAgIH1cclxuXHJcbiAgICB0b2dnbGVHcm91cCAoZ3JvdXApIHtcclxuICAgICAgICBpZiAodGhpcy5pc0dyb3VwU2hvd24oZ3JvdXApKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvd25Hcm91cCA9IG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5zaG93bkdyb3VwID0gZ3JvdXA7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaXNHcm91cFNob3duKGdyb3VwOiBudW1iZXIpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zaG93bkdyb3VwID09IGdyb3VwO1xyXG4gICAgfVxyXG5cdHRvZ2dsZUNoYXJ0T3JUYWJsZVZpZXcodmFsOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLnRvZ2dsZS5jaGFydE9yVGFibGUgPSB2YWw7XHJcbiAgICB9XHRcclxuXHRydW5SZXBvcnQoY2hhcnRUaXRsZTogc3RyaW5nLG1vbnRoT3JZZWFyOiBzdHJpbmcsZmxvd25Nb250aDogc3RyaW5nKXtcclxuXHRcdHZhciB0aGF0ID0gdGhpcztcclxuXHRcdC8vaWYgbm8gY29yZG92YSwgdGhlbiBydW5uaW5nIGluIGJyb3dzZXIgYW5kIG5lZWQgdG8gdXNlIGRhdGFVUkwgYW5kIGlmcmFtZVxyXG5cdFx0aWYgKCF3aW5kb3cuY29yZG92YSkge1xyXG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHRcdFx0dGhpcy5yZXBvcnRTdmMucnVuUmVwb3J0RGF0YVVSTChjaGFydFRpdGxlLG1vbnRoT3JZZWFyLGZsb3duTW9udGgpXHJcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZGF0YVVSTCkge1xyXG5cdFx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0XHQvL3NldCB0aGUgaWZyYW1lIHNvdXJjZSB0byB0aGUgZGF0YVVSTCBjcmVhdGVkXHJcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKGRhdGFVUkwpO1xyXG5cdFx0XHRcdFx0Ly9kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGRmSW1hZ2UnKS5zcmMgPSBkYXRhVVJMO1xyXG5cdFx0XHRcdH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcblx0XHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdFcnJvciAnKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblx0XHQvL2lmIGNvZHJvdmEsIHRoZW4gcnVubmluZyBpbiBkZXZpY2UvZW11bGF0b3IgYW5kIGFibGUgdG8gc2F2ZSBmaWxlIGFuZCBvcGVuIHcvIEluQXBwQnJvd3NlclxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cdFx0XHR0aGlzLnJlcG9ydFN2Yy5ydW5SZXBvcnRBc3luYyhjaGFydFRpdGxlLG1vbnRoT3JZZWFyLGZsb3duTW9udGgpXHJcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZmlsZVBhdGgpIHtcclxuXHRcdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0XHRcdFx0Ly9sb2cgdGhlIGZpbGUgbG9jYXRpb24gZm9yIGRlYnVnZ2luZyBhbmQgb29wZW4gd2l0aCBpbmFwcGJyb3dzZXJcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXBvcnQgcnVuIG9uIGRldmljZSB1c2luZyBGaWxlIHBsdWdpbicpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1JlcG9ydEN0cmw6IE9wZW5pbmcgUERGIEZpbGUgKCcgKyBmaWxlUGF0aCArICcpJyk7XHJcblx0XHRcdFx0XHR2YXIgbGFzdFBhcnQgPSBmaWxlUGF0aC5zcGxpdChcIi9cIikucG9wKCk7XHJcblx0XHRcdFx0XHR2YXIgZmlsZU5hbWUgPSBcIi9tbnQvc2RjYXJkL1wiK2xhc3RQYXJ0O1x0XHRcdFx0XHRcclxuXHRcdFx0XHRcdGlmKGRldmljZS5wbGF0Zm9ybSAhPVwiQW5kcm9pZFwiKVxyXG5cdFx0XHRcdFx0ZmlsZU5hbWUgPSBmaWxlUGF0aDtcclxuXHRcdFx0XHRcdC8vd2luZG93Lm9wZW5QREYoZmlsZU5hbWUpO1xyXG5cdFx0XHRcdFx0Ly9lbHNlXHJcblx0XHRcdFx0XHQvL3dpbmRvdy5vcGVuKGZpbGVQYXRoLCAnX2JsYW5rJywgJ2xvY2F0aW9uPW5vLGNsb3NlYnV0dG9uY2FwdGlvbj1DbG9zZSxlbmFibGVWaWV3cG9ydFNjYWxlPXllcycpOyovXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRjb3Jkb3ZhLnBsdWdpbnMuZmlsZU9wZW5lcjIub3BlbihcclxuXHRcdFx0XHRcdFx0ZmlsZU5hbWUsIFxyXG5cdFx0XHRcdFx0XHQnYXBwbGljYXRpb24vcGRmJywgXHJcblx0XHRcdFx0XHRcdHsgXHJcblx0XHRcdFx0XHRcdFx0ZXJyb3IgOiBmdW5jdGlvbihlKSB7IFxyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0Vycm9yIHN0YXR1czogJyArIGUuc3RhdHVzICsgJyAtIEVycm9yIG1lc3NhZ2U6ICcgKyBlLm1lc3NhZ2UpO1xyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0c3VjY2VzcyA6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlIG9wZW5lZCBzdWNjZXNzZnVsbHknKTsgICAgICAgICAgICAgICAgXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcblx0XHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdFcnJvciAnKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3NlcnZpY2VzL09wZXJhdGlvbmFsU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50c1wiIC8+XHJcblxyXG5pbnRlcmZhY2UgdGFiT2JqZWN0IHtcclxuICAgIHRpdGxlOiBzdHJpbmcsXHJcbiAgICBuYW1lczogc3RyaW5nLFxyXG4gICAgaWNvbjogc3RyaW5nXHJcbn1cclxuXHJcbmludGVyZmFjZSB0b2dnbGVPYmplY3Qge1xyXG4gICAgbW9udGhPclllYXI6IHN0cmluZyxcclxuXHRjaGFydE9yVGFibGU6IHN0cmluZyxcclxuICAgIG9wZW5PckNsb3NlZDogc3RyaW5nXHJcbn1cclxuXHJcbmludGVyZmFjZSBoZWFkZXJPYmplY3Qge1xyXG4gICAgZmxvd25Nb250aDogc3RyaW5nLFxyXG4gICAgdGFiSW5kZXg6IG51bWJlcixcclxuICAgIHVzZXJOYW1lOiBzdHJpbmdcclxufVxyXG5cclxuY2xhc3MgT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIge1xyXG4gIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHNjb3BlJywgJyRpb25pY0xvYWRpbmcnLCAnJGlvbmljUG9wb3ZlcicsICckZmlsdGVyJyxcclxuICAgICdPcGVyYXRpb25hbFNlcnZpY2UnLCAnJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZScsICckdGltZW91dCcsICckd2luZG93JywgJ1JlcG9ydFN2YycsICdGaWx0ZXJlZExpc3RTZXJ2aWNlJ107XHJcbiAgcHJpdmF0ZSB0YWJzOiBbdGFiT2JqZWN0XTtcclxuICBwcml2YXRlIHRvZ2dsZTogdG9nZ2xlT2JqZWN0O1xyXG4gIHByaXZhdGUgaGVhZGVyOiBoZWFkZXJPYmplY3Q7XHJcbiAgcHJpdmF0ZSBzdWJIZWFkZXI6IGFueTtcclxuICBwcml2YXRlIGZsaWdodFByb2NTdGF0dXM6IGFueTtcclxuICBwcml2YXRlIGZhdkZsaWdodFByb2NSZXN1bHQ6IGFueTtcclxuICBwcml2YXRlIGNhcm91c2VsSW5kZXg6IG51bWJlciA9IDA7XHJcbiAgcHJpdmF0ZSBmbGlnaHRDb3VudFJlYXNvbjogYW55O1xyXG4gIHByaXZhdGUgY291cG9uQ291bnRFeGNlcHRpb246IGFueTtcclxuXHJcbiAgcHJpdmF0ZSB0aHJlZUJhckNoYXJ0Q29sb3JzOiBbc3RyaW5nXSA9IFsnIzRFQjJGOScsICcjRkZDMzAwJywgJyM1QzZCQzAnXTtcclxuICBwcml2YXRlIGZvdXJCYXJDaGFydENvbG9yczogW3N0cmluZ10gPSBbJyM3RUQzMjEnLCAnIzRFQjJGOScsICcjRkZDMzAwJywgJyM1QzZCQzAnXTtcclxuXHJcbiAgcHJpdmF0ZSBpbmZvcG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XHJcbiAgcHJpdmF0ZSBpbmZvZGF0YTogc3RyaW5nO1xyXG4gIHByaXZhdGUgZmxpZ2h0UHJvY1NlY3Rpb246IHN0cmluZztcclxuICBwcml2YXRlIGZsaWdodENvdW50U2VjdGlvbjogc3RyaW5nO1xyXG4gIHByaXZhdGUgY291cG9uQ291bnRTZWN0aW9uOiBzdHJpbmc7XHJcblxyXG4gIHByaXZhdGUgcGFnZVNpemUgPSA0O1xyXG4gIHByaXZhdGUgY3VycmVudFBhZ2UgPSBbXTtcclxuICBwcml2YXRlIHNlbGVjdGVkRHJpbGwgPSBbXTtcclxuICBwcml2YXRlIGdyb3VwcyA9IFtdO1xyXG4gIHByaXZhdGUgY29sdW1uVG9PcmRlcjogc3RyaW5nO1xyXG4gIHByaXZhdGUgc2hvd25Hcm91cDogbnVtYmVyO1xyXG4gIHByaXZhdGUgZHJpbGxUeXBlOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBkcmlsbEJhckxhYmVsOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBleGNlcHRpb25DYXRlZ29yeTogc3RyaW5nO1xyXG4gIHByaXZhdGUgZHJpbGx0YWJzOiBzdHJpbmdbXTtcclxuICBwcml2YXRlIGRyaWxsTmFtZTogc3RyaW5nW107XHJcbiAgcHJpdmF0ZSBkcmlsbHBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xyXG5cclxuICBjb25zdHJ1Y3Rvcihwcml2YXRlICRzY29wZTogbmcuSVNjb3BlLCBwcml2YXRlICRpb25pY0xvYWRpbmc6IElvbmljLklMb2FkaW5nLFxyXG4gICAgcHJpdmF0ZSAkaW9uaWNQb3BvdmVyOiBJb25pYy5JUG9wb3ZlciwgcHJpdmF0ZSAkZmlsdGVyOiBuZy5JRmlsdGVyU2VydmljZSxcclxuICAgIHByaXZhdGUgb3BlcmF0aW9uYWxTZXJ2aWNlOiBPcGVyYXRpb25hbFNlcnZpY2UsIHByaXZhdGUgJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZTogSW9uaWMuSVNsaWRlQm94RGVsZWdhdGUsXHJcbiAgICBwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsIHByaXZhdGUgcmVwb3J0U3ZjOiBSZXBvcnRTdmMsIHByaXZhdGUgZmlsdGVyZWRMaXN0U2VydmljZTogRmlsdGVyZWRMaXN0U2VydmljZSkge1xyXG4gICAgdGhpcy50YWJzID0gW1xyXG4gICAgICB7IHRpdGxlOiAnTXkgRGFzaGJvYXJkJywgbmFtZXM6ICdNeURhc2hib2FyZCcsIGljb246ICdpY29ub24taG9tZScgfSxcclxuICAgICAgeyB0aXRsZTogJ0ZsaWdodCBQcm9jZXNzIFN0YXR1cycsIG5hbWVzOiAnRmxpZ2h0UHJvY2Vzc1N0YXR1cycsIGljb246ICdpb24taG9tZScgfSxcclxuICAgICAgeyB0aXRsZTogJ0ZsaWdodCBDb3VudCBieSBSZWFzb24nLCBuYW1lczogJ0ZsaWdodENvdW50YnlSZWFzb24nLCBpY29uOiAnaW9uLWhvbWUnIH0sXHJcbiAgICAgIHsgdGl0bGU6ICdDb3Vwb24gQ291bnQgYnkgRXhjZXB0aW9uIENhdGVnb3J5JywgbmFtZXM6ICdDb3Vwb25Db3VudGJ5RXhjZXB0aW9uQ2F0ZWdvcnknLCBpY29uOiAnaW9uLWhvbWUnIH1cclxuICAgIF07XHJcblxyXG4gICAgdGhpcy50b2dnbGUgPSB7XHJcbiAgICAgIG1vbnRoT3JZZWFyOiAnbW9udGgnLFxyXG5cdCAgIGNoYXJ0T3JUYWJsZTogJ2NoYXJ0JyxcclxuICAgICAgb3Blbk9yQ2xvc2VkOiAnT1BFTidcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5oZWFkZXIgPSB7XHJcbiAgICAgIGZsb3duTW9udGg6ICcnLFxyXG4gICAgICB0YWJJbmRleDogMCxcclxuICAgICAgdXNlck5hbWU6ICcnXHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuaW5pdERhdGEoKTtcclxuXHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB0aGlzLiRzY29wZS4kb24oJ2VsZW1lbnRDbGljay5kaXJlY3RpdmUnLCBmdW5jdGlvbihhbmd1bGFyRXZlbnQsIGV2ZW50KSB7XHJcbiAgICAgIGlmICh0aGF0LmhlYWRlci50YWJJbmRleCA9PSAxICYmICFpc05hTihldmVudC5wb2ludFswXSkpIHtcclxuICAgICAgICB0aGF0Lm9wZW5GbGlnaHRQcm9jZXNzRHJpbGxQb3BvdmVyKGV2ZW50LmUsIGV2ZW50LCAtMSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh0aGF0LmhlYWRlci50YWJJbmRleCA9PSAzICYmICFpc05hTihldmVudC5wb2ludFswXSkpIHtcclxuICAgICAgICB0aGF0Lm9wZW5Db3VucG9uQ291bnREcmlsbFBvcG92ZXIoZXZlbnQuZSwgZXZlbnQsIC0xKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHRoYXQuaGVhZGVyLnRhYkluZGV4ID09IDIgJiYgIWlzTmFOKGV2ZW50LnBvaW50WzBdKSkge1xyXG4gICAgICAgIHRoYXQub3BlbkZsaWdodENvdW50RHJpbGxQb3BvdmVyKGV2ZW50LmUsIGV2ZW50LCAtMSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICB9KTtcclxuICB9XHJcbiAgaW5pdERhdGEoKSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9kcmlsZG93bi5odG1sJywge1xyXG4gICAgICBzY29wZTogdGhhdC4kc2NvcGVcclxuICAgIH0pLnRoZW4oZnVuY3Rpb24oZHJpbGxwb3BvdmVyKSB7XHJcbiAgICAgIHRoYXQuZHJpbGxwb3BvdmVyID0gZHJpbGxwb3BvdmVyO1xyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vaW5mb3Rvb2x0aXAuaHRtbCcsIHtcclxuICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXHJcbiAgICB9KS50aGVuKGZ1bmN0aW9uKGluZm9wb3BvdmVyKSB7XHJcbiAgICAgIHRoYXQuaW5mb3BvcG92ZXIgPSBpbmZvcG9wb3ZlcjtcclxuICAgIH0pO1xyXG5cclxuICAgIHZhciByZXEgPSB7XHJcbiAgICAgICAgdXNlcklkOiB0aGF0LiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInKVxyXG4gICAgfVxyXG4gICAgdGhpcy5vcGVyYXRpb25hbFNlcnZpY2UuZ2V0UGF4Rmxvd25PcHJIZWFkZXIocmVxKS50aGVuKFxyXG4gICAgICAoZGF0YSkgPT4ge1xyXG4gICAgICAgIHRoYXQuc3ViSGVhZGVyID0gZGF0YS5yZXNwb25zZS5kYXRhO1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHRoYXQuc3ViSGVhZGVyLnBheEZsb3duT3ByTW9udGhzKTtcclxuICAgICAgICB0aGF0LmhlYWRlci5mbG93bk1vbnRoID0gdGhhdC5zdWJIZWFkZXIuZGVmYXVsdE1vbnRoO1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHRoYXQuaGVhZGVyLmZsb3duTW9udGgpO1xyXG4gICAgICAgIHRoYXQub25TbGlkZU1vdmUoeyBpbmRleDogMCB9KTtcclxuICAgICAgfSxcclxuICAgICAgKGVycm9yKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuICAgICAgfSk7XHJcbiAgICB0aGF0LmhlYWRlci51c2VyTmFtZSA9IHRoYXQuZ2V0UHJvZmlsZVVzZXJOYW1lKCk7XHJcbiAgfVxyXG4gIHNlbGVjdGVkRmxvd25Nb250aChtb250aDogc3RyaW5nKXtcclxuICAgIHJldHVybiAobW9udGggPT0gdGhpcy5oZWFkZXIuZmxvd25Nb250aCk7XHJcbiAgfVxyXG4gIGdldFByb2ZpbGVVc2VyTmFtZSgpOiBzdHJpbmcge1xyXG4gICAgdmFyIG9iaiA9IHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicpO1xyXG4gICAgdmFyIHByb2ZpbGVVc2VyTmFtZSA9IEpTT04ucGFyc2Uob2JqKTtcclxuICAgIHJldHVybiBwcm9maWxlVXNlck5hbWUudXNlcm5hbWU7XHJcbiAgfVxyXG5cclxuICBcclxuICBvblNsaWRlTW92ZShkYXRhOiBhbnkpIHtcclxuICAgIHRoaXMuaGVhZGVyLnRhYkluZGV4ID0gZGF0YS5pbmRleDtcclxuXHR0aGlzLnRvZ2dsZS5jaGFydE9yVGFibGUgPSBcImNoYXJ0XCI7XHJcbiAgICBzd2l0Y2ggKHRoaXMuaGVhZGVyLnRhYkluZGV4KSB7XHJcbiAgICAgIGNhc2UgMDpcclxuICAgICAgICB0aGlzLmNhbGxNeURhc2hib2FyZCgpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDE6XHJcbiAgICAgICAgdGhpcy5jYWxsRmxpZ2h0UHJvY1N0YXR1cygpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDI6XHJcbiAgICAgICAgdGhpcy5jYWxsRmxpZ2h0Q291bnRCeVJlYXNvbigpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDM6XHJcbiAgICAgICAgdGhpcy5jYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbigpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH07XHJcbiAgY2FsbE15RGFzaGJvYXJkKCkge1xyXG4gICAgICAgIHRoaXMuY2FsbEZsaWdodFByb2NTdGF0dXMoKTtcclxuICAgICAgICB0aGlzLmNhbGxGbGlnaHRDb3VudEJ5UmVhc29uKCk7XHJcbiAgICAgICAgdGhpcy5jYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbigpO1xyXG4gIH1cclxuICBjYWxsRmxpZ2h0UHJvY1N0YXR1cygpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJOYW1lLFxyXG4gICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgZnVsbERhdGFGbGFnOiAnTidcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJGbGlnaHRQcm9jU3RhdHVzKHJlcWRhdGEpXHJcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgdmFyIG90aGVyQ2hhcnRDb2xvcnMgPSBbeyBcImNvbG9yXCI6IFwiIzdFRDMyMVwiIH0sIHsgXCJjb2xvclwiOiBcIiM0RUIyRjlcIiB9LFxyXG4gICAgICAgICAgeyBcImNvbG9yXCI6IFwiI0ZGQzMwMFwiIH0sIHsgXCJjb2xvclwiOiBcIiM1QzZCQzBcIiB9XTtcclxuICAgICAgICB2YXIgcGllQ2hhcnRDb2xvcnMgPSBbeyBcImNvbG9yXCI6IFwiIzRFQjJGOVwiIH0sIHsgXCJjb2xvclwiOiBcIiNGRkMzMDBcIiB9LCB7IFwiY29sb3JcIjogXCIjNUM2QkMwXCIgfV07XHJcblxyXG4gICAgICAgIHZhciBqc29uT2JqID0gdGhhdC5hcHBseUNoYXJ0Q29sb3JDb2RlcyhkYXRhLnJlc3BvbnNlLmRhdGEsIHBpZUNoYXJ0Q29sb3JzLCBvdGhlckNoYXJ0Q29sb3JzKTtcclxuICAgICAgICB0aGF0LmZsaWdodFByb2NTZWN0aW9uID0ganNvbk9iai5zZWN0aW9uTmFtZTtcclxuICAgICAgICB2YXIgcGllQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5waWVDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xyXG4gICAgICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgICAgICB9KTtcclxuICAgICAgICB2YXIgbXVsdGlDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLm11bHRpYmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcclxuICAgICAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdmFyIHN0YWNrQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcclxuICAgICAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcbiAgICAgICAgfSk7ICAgICAgICAgIFxyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHN0YWNrQ2hhcnRzKTtcclxuICAgICAgICBpZiAodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xyXG4gICAgICAgICAgdGhhdC5mbGlnaHRQcm9jU3RhdHVzID0ge1xyXG4gICAgICAgICAgICBwaWVDaGFydDogcGllQ2hhcnRzWzBdLFxyXG4gICAgICAgICAgICB3ZWVrRGF0YTogbXVsdGlDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxyXG4gICAgICAgICAgICBzdGFja2VkQ2hhcnQ6IChzdGFja0NoYXJ0cy5sZW5ndGgpID8gc3RhY2tDaGFydHNbMF0gOiBbXVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGF0LmZsaWdodFByb2NTdGF0dXMgPSB7XHJcbiAgICAgICAgICAgIHBpZUNoYXJ0OiBqc29uT2JqLnBpZUNoYXJ0c1swXSxcclxuICAgICAgICAgICAgd2Vla0RhdGE6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxyXG4gICAgICAgICAgICBzdGFja2VkQ2hhcnQ6IGpzb25PYmouc3RhY2tlZEJhckNoYXJ0c1swXVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhzdGFja0NoYXJ0cyk7XHJcbiAgICAgICAgdGhhdC4kdGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgIHRoYXQuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpLnVwZGF0ZSgpO1xyXG4gICAgICAgIH0sIDUwMCk7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodGhhdC5mbGlnaHRQcm9jU3RhdHVzLndlZWtEYXRhKSk7XHJcbiAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuICBjYWxsRmxpZ2h0Q291bnRCeVJlYXNvbigpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJOYW1lLFxyXG4gICAgICB0b2dnbGUxOiAnb3BlbicsXHJcbiAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXHJcbiAgICB9O1xyXG4gICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJGbGlnaHRDb3VudEJ5UmVhc29uKHJlcWRhdGEpXHJcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhqc29uT2JqLnBpZUNoYXJ0c1swXSk7XHJcbiAgICAgIHZhciBvdGhlckNoYXJ0Q29sb3JzID0gW3sgXCJjb2xvclwiOiBcIiMyOEFFRkRcIiB9LCB7IFwiY29sb3JcIjogXCIjRkZDMzAwXCIgfSwgeyBcImNvbG9yXCI6IFwiIzVDNkJDMFwiIH1dO1xyXG4gICAgICB2YXIgcGllQ2hhcnRDb2xvcnMgPSBbeyBcImNvbG9yXCI6IFwiIzRFQjJGOVwiIH0sIHsgXCJjb2xvclwiOiBcIiNGRkMzMDBcIiB9LCB7IFwiY29sb3JcIjogXCIjNUM2QkMwXCIgfV07XHJcblxyXG4gICAgICAgIHZhciBqc29uT2JqID0gdGhhdC5hcHBseUNoYXJ0Q29sb3JDb2RlcyhkYXRhLnJlc3BvbnNlLmRhdGEsIHBpZUNoYXJ0Q29sb3JzLCBvdGhlckNoYXJ0Q29sb3JzKTtcclxuICAgICAgICB0aGF0LmZsaWdodENvdW50U2VjdGlvbiA9IGpzb25PYmouc2VjdGlvbk5hbWU7XHJcbiAgICAgICAgaWYgKHRoYXQuaGVhZGVyLnRhYkluZGV4ID09IDApIHtcclxuICAgICAgICAgIHRoYXQuZmxpZ2h0Q291bnRSZWFzb24gPSB0aGF0LmdldEZhdm9yaXRlSXRlbXMoanNvbk9iaik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoYXQuZmxpZ2h0Q291bnRSZWFzb24gPSB7XHJcbiAgICAgICAgICAgIHBpZUNoYXJ0OiBqc29uT2JqLnBpZUNoYXJ0c1swXSxcclxuICAgICAgICAgICAgd2Vla0RhdGE6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxyXG4gICAgICAgICAgICBzdGFja2VkQ2hhcnQ6IGpzb25PYmouc3RhY2tlZEJhckNoYXJ0c1swXVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhhdC4kdGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgIHRoYXQuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpLnVwZGF0ZSgpO1xyXG4gICAgICAgIH0sIDcwMCk7XHJcbiAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuICBjYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbigpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJOYW1lLFxyXG4gICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgZnVsbERhdGFGbGFnOiAnTidcclxuICAgIH07XHJcbiAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckNvdXBvbkNvdW50QnlFeGNlcHRpb24ocmVxZGF0YSlcclxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICB2YXIgb3RoZXJDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogXCIjNEVCMkY5XCIgfSwgeyBcImNvbG9yXCI6IFwiI0ZGQzMwMFwiIH0sIHsgXCJjb2xvclwiOiBcIiM1QzZCQzBcIiB9XTtcclxuICAgICAgICB2YXIgcGllQ2hhcnRDb2xvcnMgPSBbeyBcImNvbG9yXCI6IFwiIzRFQjJGOVwiIH0sIHsgXCJjb2xvclwiOiBcIiNGRkMzMDBcIiB9LCB7IFwiY29sb3JcIjogXCIjNUM2QkMwXCIgfV07XHJcblxyXG4gICAgICAgIHZhciBqc29uT2JqID0gdGhhdC5hcHBseUNoYXJ0Q29sb3JDb2RlcyhkYXRhLnJlc3BvbnNlLmRhdGEsIHBpZUNoYXJ0Q29sb3JzLCBvdGhlckNoYXJ0Q29sb3JzKTtcclxuICAgICAgICB0aGF0LmNvdXBvbkNvdW50U2VjdGlvbiA9IGpzb25PYmouc2VjdGlvbk5hbWU7XHJcbiAgICAgICAgaWYgKHRoYXQuaGVhZGVyLnRhYkluZGV4ID09IDApIHtcclxuICAgICAgICAgIHRoYXQuY291cG9uQ291bnRFeGNlcHRpb24gPSB0aGF0LmdldEZhdm9yaXRlSXRlbXMoanNvbk9iaik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoYXQuY291cG9uQ291bnRFeGNlcHRpb24gPSB7XHJcbiAgICAgICAgICAgIHBpZUNoYXJ0OiBqc29uT2JqLnBpZUNoYXJ0c1swXSxcclxuICAgICAgICAgICAgd2Vla0RhdGE6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxyXG4gICAgICAgICAgICBzdGFja2VkQ2hhcnQ6IGpzb25PYmouc3RhY2tlZEJhckNoYXJ0c1swXVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGF0LiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgdGhhdC4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykudXBkYXRlKCk7XHJcbiAgICAgICAgfSwgNTAwKTtcclxuICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgfSk7XHJcbiAgfVxyXG4gIGlvbmljTG9hZGluZ1Nob3coKSB7XHJcbiAgICB0aGlzLiRpb25pY0xvYWRpbmcuc2hvdyh7XHJcbiAgICAgIHRlbXBsYXRlOiAnPGlvbi1zcGlubmVyIGNsYXNzPVwic3Bpbm5lci1jYWxtXCI+PC9pb24tc3Bpbm5lcj4nXHJcbiAgICB9KTtcclxuICB9O1xyXG4gIGFwcGx5Q2hhcnRDb2xvckNvZGVzKGpzb25PYmo6IGFueSwgcGllQ2hhcnRDb2xvcnM6IGFueSwgb3RoZXJDaGFydENvbG9yczogYW55KXtcclxuICAgIF8uZm9yRWFjaChqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCBmdW5jdGlvbihuOiBhbnksIHZhbHVlOiBhbnkpIHtcclxuICAgICAgICAgIG4ubGFiZWwgPSBuLnh2YWw7XHJcbiAgICAgICAgICBuLnZhbHVlID0gbi55dmFsO1xyXG4gICAgfSk7XHJcbiAgICBfLm1lcmdlKGpzb25PYmoucGllQ2hhcnRzWzBdLmRhdGEsIHBpZUNoYXJ0Q29sb3JzKTtcclxuICAgIF8ubWVyZ2UoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdLnN0YWNrZWRCYXJjaGFydEl0ZW1zLCBvdGhlckNoYXJ0Q29sb3JzKTtcclxuICAgIF8ubWVyZ2UoanNvbk9iai5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsIG90aGVyQ2hhcnRDb2xvcnMpO1xyXG4gICAgcmV0dXJuIGpzb25PYmo7XHJcblxyXG4gIH1cclxuICBnZXRGYXZvcml0ZUl0ZW1zKGpzb25PYmo6IGFueSkge1xyXG4gICAgdmFyIHBpZUNoYXJ0cyA9IF8uZmlsdGVyKGpzb25PYmoucGllQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcclxuICAgICAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcbiAgICB9KTtcclxuICAgIHZhciBtdWx0aUNoYXJ0cyA9IF8uZmlsdGVyKGpzb25PYmoubXVsdGliYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xyXG4gICAgICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgIH0pO1xyXG4gICAgdmFyIHN0YWNrQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcclxuICAgICAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHBpZUNoYXJ0OiBwaWVDaGFydHNbMF0sXHJcbiAgICAgIHdlZWtEYXRhOiAobXVsdGlDaGFydHMubGVuZ3RoKSA/IG11bHRpQ2hhcnRzLm11bHRpYmFyQ2hhcnRzWzBdLm11bHRpYmFyQ2hhcnRJdGVtcyA6IFtdLFxyXG4gICAgICBzdGFja2VkQ2hhcnQ6IChzdGFja0NoYXJ0cy5sZW5ndGgpID8gc3RhY2tDaGFydHNbMF0gOiBbXVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgY29sb3JGdW5jdGlvbigpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHJldHVybiBmdW5jdGlvbihkLCBpKSB7XHJcbiAgICAgIHJldHVybiB0aGF0LnRocmVlQmFyQ2hhcnRDb2xvcnNbaV07XHJcbiAgICB9O1xyXG4gIH1cclxuICBmb3VyQmFyQ29sb3JGdW5jdGlvbigpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHJldHVybiBmdW5jdGlvbihkLCBpKSB7XHJcbiAgICAgIHJldHVybiB0aGF0LmZvdXJCYXJDaGFydENvbG9yc1tpXTtcclxuICAgIH07XHJcbiAgfVxyXG4gIG9wZW5pbmZvUG9wb3ZlcigkZXZlbnQsIGluZGV4KSB7XHJcbiAgICBpZiAodHlwZW9mIGluZGV4ID09IFwidW5kZWZpbmVkXCIgfHwgaW5kZXggPT0gXCJcIikge1xyXG4gICAgICB0aGlzLmluZm9kYXRhID0gJ05vIGluZm8gYXZhaWxhYmxlJztcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB0aGlzLmluZm9kYXRhID0gaW5kZXg7XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZyhpbmRleCk7XHJcbiAgICB0aGlzLmluZm9wb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICB9O1xyXG4gIGNsb3NlSW5mb1BvcG92ZXIoKSB7XHJcbiAgICB0aGlzLmluZm9wb3BvdmVyLmhpZGUoKTtcclxuICB9XHJcbiAgdG9nZ2xlQ291bnQodmFsKSB7XHJcbiAgICB0aGlzLnRvZ2dsZS5vcGVuT3JDbG9zZWQgPSB2YWw7XHJcbiAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xyXG4gIH1cclxuICBpb25pY0xvYWRpbmdIaWRlKCkge1xyXG4gICAgdGhpcy4kaW9uaWNMb2FkaW5nLmhpZGUoKTtcclxuICB9O1xyXG4gIGxvY2tTbGlkZSgpIHtcclxuICAgIGNvbnNvbGUubG9nKCdpbiBsb2NrU2xpZGUgbWVodG9kLi4nKTtcclxuICAgIHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpLmVuYWJsZVNsaWRlKGZhbHNlKTtcclxuICB9O1xyXG4gIHdlZWtEYXRhUHJldigpIHtcclxuICAgIHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpLnByZXZpb3VzKCk7XHJcbiAgfTtcclxuICB3ZWVrRGF0YU5leHQoKSB7XHJcbiAgICB0aGlzLiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGEnKS5uZXh0KCk7XHJcbiAgfVxyXG4gICB0b2dnbGVDaGFydE9yVGFibGVWaWV3KHZhbDogc3RyaW5nKSB7XHJcbiAgICB0aGlzLnRvZ2dsZS5jaGFydE9yVGFibGUgPSB2YWw7XHJcbiAgfVxyXG4gIHJ1blJlcG9ydChjaGFydFRpdGxlOiBzdHJpbmcsbW9udGhPclllYXI6IHN0cmluZyxmbG93bk1vbnRoOiBzdHJpbmcpe1xyXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xyXG5cdFx0Ly9pZiBubyBjb3Jkb3ZhLCB0aGVuIHJ1bm5pbmcgaW4gYnJvd3NlciBhbmQgbmVlZCB0byB1c2UgZGF0YVVSTCBhbmQgaWZyYW1lXHJcblx0XHRpZiAoIXdpbmRvdy5jb3Jkb3ZhKSB7XHJcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cdFx0XHR0aGlzLnJlcG9ydFN2Yy5ydW5SZXBvcnREYXRhVVJMKGNoYXJ0VGl0bGUsbW9udGhPclllYXIsZmxvd25Nb250aClcclxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihkYXRhVVJMKSB7XHJcblx0XHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuXHRcdFx0XHRcdC8vc2V0IHRoZSBpZnJhbWUgc291cmNlIHRvIHRoZSBkYXRhVVJMIGNyZWF0ZWRcclxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coZGF0YVVSTCk7XHJcblx0XHRcdFx0XHQvL2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwZGZJbWFnZScpLnNyYyA9IGRhdGFVUkw7XHJcblx0XHRcdFx0fSxmdW5jdGlvbihlcnJvcikge1xyXG5cdFx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRXJyb3IgJyk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cdFx0Ly9pZiBjb2Ryb3ZhLCB0aGVuIHJ1bm5pbmcgaW4gZGV2aWNlL2VtdWxhdG9yIGFuZCBhYmxlIHRvIHNhdmUgZmlsZSBhbmQgb3BlbiB3LyBJbkFwcEJyb3dzZXJcclxuXHRcdGVsc2Uge1xyXG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHRcdFx0dGhpcy5yZXBvcnRTdmMucnVuUmVwb3J0QXN5bmMoY2hhcnRUaXRsZSxtb250aE9yWWVhcixmbG93bk1vbnRoKVxyXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKGZpbGVQYXRoKSB7XHJcblx0XHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuXHRcdFx0XHRcdC8vbG9nIHRoZSBmaWxlIGxvY2F0aW9uIGZvciBkZWJ1Z2dpbmcgYW5kIG9vcGVuIHdpdGggaW5hcHBicm93c2VyXHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVwb3J0IHJ1biBvbiBkZXZpY2UgdXNpbmcgRmlsZSBwbHVnaW4nKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdSZXBvcnRDdHJsOiBPcGVuaW5nIFBERiBGaWxlICgnICsgZmlsZVBhdGggKyAnKScpO1xyXG5cdFx0XHRcdFx0dmFyIGxhc3RQYXJ0ID0gZmlsZVBhdGguc3BsaXQoXCIvXCIpLnBvcCgpO1xyXG5cdFx0XHRcdFx0dmFyIGZpbGVOYW1lID0gXCIvbW50L3NkY2FyZC9cIitsYXN0UGFydDtcclxuXHRcdFx0XHRcdGlmKGRldmljZS5wbGF0Zm9ybSAhPVwiQW5kcm9pZFwiKVxyXG5cdFx0XHRcdFx0ZmlsZU5hbWUgPSBmaWxlUGF0aDtcclxuXHRcdFx0XHRcdC8vd2luZG93Lm9wZW5QREYoZmlsZU5hbWUpO1xyXG5cdFx0XHRcdFx0Ly9lbHNlXHJcblx0XHRcdFx0XHQvL3dpbmRvdy5vcGVuKGZpbGVQYXRoLCAnX2JsYW5rJywgJ2xvY2F0aW9uPW5vLGNsb3NlYnV0dG9uY2FwdGlvbj1DbG9zZSxlbmFibGVWaWV3cG9ydFNjYWxlPXllcycpOyovXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRjb3Jkb3ZhLnBsdWdpbnMuZmlsZU9wZW5lcjIub3BlbihcclxuXHRcdFx0XHRcdFx0ZmlsZU5hbWUsIFxyXG5cdFx0XHRcdFx0XHQnYXBwbGljYXRpb24vcGRmJywgXHJcblx0XHRcdFx0XHRcdHsgXHJcblx0XHRcdFx0XHRcdFx0ZXJyb3IgOiBmdW5jdGlvbihlKSB7IFxyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0Vycm9yIHN0YXR1czogJyArIGUuc3RhdHVzICsgJyAtIEVycm9yIG1lc3NhZ2U6ICcgKyBlLm1lc3NhZ2UpO1xyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0c3VjY2VzcyA6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlIG9wZW5lZCBzdWNjZXNzZnVsbHknKTsgICAgICAgICAgICAgICAgXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0sZnVuY3Rpb24oZXJyb3IpIHtcclxuXHRcdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG4gIG9wZW5GbGlnaHRQcm9jZXNzRHJpbGxQb3BvdmVyKCRldmVudCxkYXRhLHNlbEZpbmRMZXZlbCkge1xyXG4gICAgdGhpcy5kcmlsbE5hbWUgPSAnRkxJR0hUIFBST0NFU1NJTkcgU1RBVFVTIC0gJyArIGRhdGEucG9pbnRbMF0gKyAnLScgKyB0aGlzLmhlYWRlci5mbG93bk1vbnRoO1xyXG4gICAgdGhpcy5kcmlsbFR5cGUgPSAnZmxpZ2h0LXByb2Nlc3MnO1xyXG4gICAgdGhpcy5kcmlsbHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgdGhpcy5zaG93bkdyb3VwID0gMDtcclxuICAgIHRoaXMuZ3JvdXBzID0gW107XHJcbiAgICB0aGlzLmRyaWxsdGFicyA9IFsnQ291bnRyeSBMZXZlbCcsICdTZWN0b3IgTGV2ZWwnLCAnRmxpZ2h0IExldmVsJywgJ0RvY3VtZW50IExldmVsJ107XHJcbiAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgdGhpcy5vcGVuRHJpbGxEb3duKGRhdGEucG9pbnQsc2VsRmluZExldmVsKTtcclxuICB9O1xyXG5cclxuICBvcGVuQ291bnBvbkNvdW50RHJpbGxQb3BvdmVyKCRldmVudCxkYXRhLHNlbEZpbmRMZXZlbCkge1xyXG4gICAgdGhpcy5kcmlsbE5hbWUgPSAnQ09VUE9OIENPVU5UIEJZIEVYQ0VQVElPTiBDQVRFR09SWSAnO1xyXG4gICAgdGhpcy5kcmlsbFR5cGUgPSAnY291cG9uLWNvdW50JztcclxuICAgIHRoaXMuZHJpbGxwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgIHRoaXMuc2hvd25Hcm91cCA9IDA7XHJcbiAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgdGhpcy5kcmlsbHRhYnMgPSBbJ0NvdXBvbiBDb3VudCBGbGlnaHQgU3RhdHVzJywgJ0RvY3VtZW50IExldmVsJ107XHJcbiAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgdGhpcy5vcGVuRHJpbGxEb3duKGRhdGEucG9pbnQsc2VsRmluZExldmVsKTtcclxuICB9O1xyXG5cclxuICBvcGVuRmxpZ2h0Q291bnREcmlsbFBvcG92ZXIoJGV2ZW50LGRhdGEsc2VsRmluZExldmVsKSB7XHJcbiAgICB0aGlzLmRyaWxsTmFtZSA9ICdMSVNUIE9GIE9QRU4gRkxJR0hUUyBGT1IgJyArIGRhdGEucG9pbnRbMF0gKyAnLScgKyB0aGlzLmhlYWRlci5mbG93bk1vbnRoICsnIEJZIFJFQVNPTiAnO1xyXG4gICAgdGhpcy5kcmlsbFR5cGUgPSAnZmxpZ2h0LWNvdW50JztcclxuICAgIHRoaXMuZHJpbGxwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgIHRoaXMuc2hvd25Hcm91cCA9IDA7XHJcbiAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgdGhpcy5kcmlsbHRhYnMgPSBbJ09wZW4gRmxpZ2h0IFN0YXR1cycsICdEb2N1bWVudCBMZXZlbCddO1xyXG4gICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcclxuICAgIHRoaXMub3BlbkRyaWxsRG93bihkYXRhLnBvaW50LHNlbEZpbmRMZXZlbCk7XHJcbiAgfTtcclxuICBcclxuICBkcmlsbERvd25SZXF1ZXN0IChkcmlsbFR5cGUsIHNlbEZpbmRMZXZlbCwgZGF0YSl7XHJcbiAgICB2YXIgcmVxZGF0YTtcclxuICAgIGlmKGRyaWxsVHlwZSA9PSAnZmxpZ2h0LXByb2Nlc3MnKSB7XHJcbiAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xyXG4gICAgICBpZiAoZGF0YS5sYWJlbCkge1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGFbMF07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBmbGlnaHREYXRlO1xyXG4gICAgICAvL2ZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IFN0cmluZyhkYXRhLmZsaWdodERhdGUpIDogU3RyaW5nKGRhdGFbMF0pO1xyXG4gICAgICBmbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBkYXRhLmZsaWdodERhdGUgOiAxO1xyXG4gICAgICB2YXIgY291bnRyeUZyb21UbyA9IChkYXRhLmNvdW50cnlGcm9tICYmIGRhdGEuY291bnRyeVRvKSA/IGRhdGEuY291bnRyeUZyb20gKyAnLScgKyBkYXRhLmNvdW50cnlUbyA6IFwiXCI7XHJcbiAgICAgIHZhciBzZWN0b3JGcm9tVG8gPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcblxyXG4gICAgICBcclxuXHJcbiAgICAgIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5nZXRQcm9maWxlVXNlck5hbWUoKSxcclxuICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxyXG4gICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxyXG4gICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxyXG4gICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiBmbGlnaHREYXRlLFxyXG4gICAgICAgIFwiY291bnRyeUZyb21Ub1wiOiBjb3VudHJ5RnJvbVRvLFxyXG4gICAgICAgIFwic2VjdG9yRnJvbVRvXCI6IHNlY3RvckZyb21UbyxcclxuICAgICAgICBcImZsaWdodE51bWJlclwiOiBmbGlnaHROdW1iZXJcclxuICAgICAgfTsgIFxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBpZihkcmlsbFR5cGUgPT0gJ2NvdXBvbi1jb3VudCcpIHtcclxuICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgIGlmIChkYXRhLmxhYmVsKSB7XHJcbiAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YVswXTtcclxuICAgICAgfVxyXG4gICAgICBjb25zb2xlLmxvZyh0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5KTtcclxuICAgICAgdmFyIGZsaWdodERhdGU7XHJcbiAgICAgIC8vZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gU3RyaW5nKGRhdGEuZmxpZ2h0RGF0ZSkgOiBTdHJpbmcoZGF0YVswXSk7XHJcbiAgICAgIGZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IGRhdGEuZmxpZ2h0RGF0ZSA6IDE7XHJcbiAgICAgIHZhciBleGNlcHRpb25DYXRlZ29yeSA9ICh0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5ICYmIGRyaWxsTGV2ZWwgPiAxKSA/IHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkgOiBcIlwiO1xyXG4gICAgICB2YXIgZmxpZ2h0U2VjdG9yID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XHJcbiAgICAgIHZhciBmbGlnaHROdW1iZXIgPSAoZGF0YS5mbGlnaHROdW1iZXIpID8gZGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xyXG5cclxuICAgICAgXHJcblxyXG4gICAgICByZXFkYXRhID0ge1xyXG4gICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgIFwidXNlcklkXCI6IHRoaXMuZ2V0UHJvZmlsZVVzZXJOYW1lKCksXHJcbiAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJcIixcclxuICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcclxuICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICBcImV4Y2VwdGlvbkNhdGVnb3J5XCI6IGV4Y2VwdGlvbkNhdGVnb3J5LFxyXG4gICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcclxuICAgICAgICBcImZsaWdodERhdGVcIjogZmxpZ2h0RGF0ZSxcclxuICAgICAgICBcImZsaWdodFNlY3RvclwiOiBmbGlnaHRTZWN0b3IsXHJcbiAgICAgIH07ICBcclxuICAgIH1cclxuXHJcbiAgICBpZihkcmlsbFR5cGUgPT0gJ2ZsaWdodC1jb3VudCcpIHtcclxuICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgIGlmIChkYXRhLmxhYmVsKSB7XHJcbiAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YVswXTtcclxuICAgICAgfVxyXG4gICAgICB2YXIgZmxpZ2h0RGF0ZTtcclxuICAgICAgLy9mbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBTdHJpbmcoZGF0YS5mbGlnaHREYXRlKSA6IFN0cmluZyhkYXRhWzBdKTtcclxuICAgICAgZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gZGF0YS5mbGlnaHREYXRlIDogMTtcclxuICAgICAgdmFyIHRvZ2dsZTEgPSB0aGlzLnRvZ2dsZS5vcGVuT3JDbG9zZWQudG9Mb3dlckNhc2UoKTtcclxuICAgICAgdmFyIGZsaWdodFNlY3RvciA9IChkYXRhLmZsb3duU2VjdG9yKSA/IGRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xyXG4gICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcclxuICAgICAgdmFyIGZsaWdodFN0YXR1cyA9ICh0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5ICYmIGRyaWxsTGV2ZWwgPiAxKSA/IHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkgOiBcIlwiO1xyXG4gICAgICBcclxuXHJcbiAgICAgIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5nZXRQcm9maWxlVXNlck5hbWUoKSxcclxuICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxyXG4gICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxyXG4gICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxyXG4gICAgICAgIFwidG9nZ2xlMVwiOiB0b2dnbGUxLFxyXG4gICAgICAgIFwiZmxpZ2h0U3RhdHVzXCI6IGZsaWdodFN0YXR1cyxcclxuICAgICAgICBcImZsaWdodE51bWJlclwiOiBmbGlnaHROdW1iZXIsXHJcbiAgICAgICAgXCJmbGlnaHREYXRlXCI6IGZsaWdodERhdGUsXHJcbiAgICAgICAgXCJmbGlnaHRTZWN0b3JcIjogZmxpZ2h0U2VjdG9yLFxyXG4gICAgICB9OyAgXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlcWRhdGE7XHJcbiAgfVxyXG5cclxuICBnZXREcmlsbERvd25VUkwgKGRyaWxEb3duVHlwZSkge1xyXG4gICAgdmFyIHVybFxyXG4gICAgc3dpdGNoKGRyaWxEb3duVHlwZSl7XHJcbiAgICAgIGNhc2UgJ2ZsaWdodC1wcm9jZXNzJzpcclxuICAgICAgICB1cmwgPSBcIi9wYXhmbG5vcHIvZmxpZ2h0cHJvY2Vzc2luZ3N0YXR1c2RyaWxsXCI7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdjb3Vwb24tY291bnQnOlxyXG4gICAgICAgIHVybCA9IFwiL3BheGZsbm9wci9jb3Vwb25jb3VudGJ5ZXhwZHJpbGxcIjtcclxuICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgJ2ZsaWdodC1jb3VudCc6XHJcbiAgICAgICAgdXJsID0gXCIvcGF4Zmxub3ByL2ZsaWdodGNvdW50YnlyZWFzb25kcmlsbFwiO1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICAgIHJldHVybiB1cmw7XHJcbiAgfVxyXG4gIHRhYlNsaWRlSGFzQ2hhbmdlZChpbmRleCl7XHJcbiAgICB2YXIgZGF0YSA9IHRoaXMuZ3JvdXBzWzBdLmNvbXBsZXRlRGF0YVswXTtcclxuICAgIHRoaXMuZ3JvdXBzWzBdLml0ZW1zWzBdID0gZGF0YVtpbmRleF0udmFsdWVzO1xyXG4gICAgdGhpcy5ncm91cHNbMF0ub3JnSXRlbXNbMF0gPSBkYXRhW2luZGV4XS52YWx1ZXM7XHJcbiAgICB0aGlzLnNvcnQoJycsIDAsIGZhbHNlKTtcclxuICAgIHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkgPSBkYXRhW2luZGV4XS5rZXk7XHJcbiAgfVxyXG5cclxuICBvcGVuRHJpbGxEb3duKGRhdGEsIHNlbEZpbmRMZXZlbCkge1xyXG4gICAgc2VsRmluZExldmVsID0gTnVtYmVyKHNlbEZpbmRMZXZlbCk7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsXSA9IGRhdGE7XHJcbiAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsICsgMV0gPSAnJztcclxuICAgIFxyXG4gICAgaWYgKHNlbEZpbmRMZXZlbCAhPSAodGhpcy5ncm91cHMubGVuZ3RoIC0gMSkpIHtcclxuICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgIHZhciByZXFkYXRhID0gdGhpcy5kcmlsbERvd25SZXF1ZXN0KHRoaXMuZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpO1xyXG4gICAgICB2YXIgVVJMID0gdGhpcy5nZXREcmlsbERvd25VUkwodGhpcy5kcmlsbFR5cGUpO1xyXG4gICAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXREcmlsbERvd24ocmVxZGF0YSwgVVJMKVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgdmFyIGRhdGEgPSBkYXRhLnJlc3BvbnNlO1xyXG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICB2YXIgZmluZExldmVsID0gZHJpbGxMZXZlbCAtIDE7XHJcbiAgICAgICAgICBpZiAoZGF0YS5zdGF0dXMgPT0gJ3N1Y2Nlc3MnKSB7XHJcbiAgICAgICAgICAgIHZhciByZXNwUmVzdWx0O1xyXG4gICAgICAgICAgICBpZihkYXRhLmRhdGEucm93cyl7XHJcbiAgICAgICAgICAgICAgcmVzcFJlc3VsdCA9IGRhdGEuZGF0YS5yb3dzO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICByZXNwUmVzdWx0ID0gZGF0YS5kYXRhO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZigodGhhdC5kcmlsbFR5cGUgPT0gJ2NvdXBvbi1jb3VudCcgfHwgdGhhdC5kcmlsbFR5cGUgPT0gJ2ZsaWdodC1jb3VudCcpICYmIGRhdGEuZGF0YS5yb3dzKXtcclxuICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLml0ZW1zWzBdID0gcmVzcFJlc3VsdFswXS52YWx1ZXM7XHJcbiAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5vcmdJdGVtc1swXSA9IHJlc3BSZXN1bHRbMF0udmFsdWVzO1xyXG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uY29tcGxldGVEYXRhWzBdID0gcmVzcFJlc3VsdDtcclxuICAgICAgICAgICAgICB0aGF0LmV4Y2VwdGlvbkNhdGVnb3J5ID0gcmVzcFJlc3VsdFswXS5rZXk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSByZXNwUmVzdWx0O1xyXG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0ub3JnSXRlbXNbMF0gPSByZXNwUmVzdWx0O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XHJcbiAgICAgICAgICAgIHRoYXQuc29ydCgnJywgZmluZExldmVsLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIHRoYXQuY2xlYXJEcmlsbChkcmlsbExldmVsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoYXQuc2hvd25Hcm91cCA9IGZpbmRMZXZlbDtcclxuICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGZpbmRMZXZlbCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgdGhhdC5jbG9zZXNQb3BvdmVyKCk7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICBhbGVydCgnU2VydmVyIEVycm9yJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjbG9zZURyaWxsUG9wb3Zlcigpe1xyXG4gICAgdGhpcy5kcmlsbHBvcG92ZXIuaGlkZSgpO1xyXG4gIH1cclxuXHJcbiAgY2xlYXJEcmlsbChsZXZlbDogbnVtYmVyKSB7XHJcbiAgICB2YXIgaTogbnVtYmVyO1xyXG4gICAgZm9yICh2YXIgaSA9IGxldmVsOyBpIDwgdGhpcy5kcmlsbHRhYnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdGhpcy5ncm91cHNbaV0uaXRlbXMuc3BsaWNlKDAsIDEpO1xyXG4gICAgICB0aGlzLmdyb3Vwc1tpXS5vcmdJdGVtcy5zcGxpY2UoMCwgMSk7XHJcbiAgICAgIHRoaXMuc29ydCgnJyxpLGZhbHNlKTtcclxuICAgIH1cclxuICB9XHJcbiAgaW5pdGlhdGVBcnJheShkcmlsbHRhYnMpIHtcclxuICAgIGZvciAodmFyIGkgaW4gZHJpbGx0YWJzKSB7XHJcbiAgICAgIHRoaXMuZ3JvdXBzW2ldID0ge1xyXG4gICAgICAgIGlkOiBpLFxyXG4gICAgICAgIG5hbWU6IHRoaXMuZHJpbGx0YWJzW2ldLFxyXG4gICAgICAgIGl0ZW1zOiBbXSxcclxuICAgICAgICBvcmdJdGVtczogW10sXHJcbiAgICAgICAgSXRlbXNCeVBhZ2U6IFtdLFxyXG4gICAgICAgIGNvbXBsZXRlRGF0YTogW11cclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlzRHJpbGxSb3dTZWxlY3RlZChsZXZlbCxvYmopIHtcclxuICAgIHJldHVybiB0aGlzLnNlbGVjdGVkRHJpbGxbbGV2ZWxdID09IG9iajtcclxuICB9XHJcbiAgc2VhcmNoUmVzdWx0cyAobGV2ZWwsb2JqKSB7XHJcbiAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLmZpbHRlcmVkTGlzdFNlcnZpY2Uuc2VhcmNoZWQodGhpcy5ncm91cHNbbGV2ZWxdLm9yZ0l0ZW1zWzBdLCBvYmouc2VhcmNoVGV4dCwgbGV2ZWwsIHRoaXMuZHJpbGxUeXBlKTtcclxuICAgIGlmIChvYmouc2VhcmNoVGV4dCA9PSAnJykge1xyXG4gICAgICB0aGlzLnJlc2V0QWxsKGxldmVsKTsgXHJcbiAgICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuZ3JvdXBzW2xldmVsXS5vcmdJdGVtc1swXTtcclxuICAgIH1cclxuICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcclxuICAgIHRoaXMucGFnaW5hdGlvbihsZXZlbCk7IFxyXG4gIH1cclxuICBwYWdpbmF0aW9uIChsZXZlbCkge1xyXG4gICAgdGhpcy5ncm91cHNbbGV2ZWxdLkl0ZW1zQnlQYWdlID0gdGhpcy5maWx0ZXJlZExpc3RTZXJ2aWNlLnBhZ2VkKHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSwgdGhpcy5wYWdlU2l6ZSApO1xyXG4gIH07XHJcbiAgc2V0UGFnZSAobGV2ZWwsIHBhZ2Vubykge1xyXG4gICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSBwYWdlbm87XHJcbiAgfTtcclxuICBsYXN0UGFnZShsZXZlbCkge1xyXG4gICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UubGVuZ3RoIC0gMTtcclxuICB9O1xyXG4gIHJlc2V0QWxsKGxldmVsKSB7XHJcbiAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IDA7XHJcbiAgfVxyXG4gIHNvcnQoc29ydEJ5LGxldmVsLG9yZGVyKSB7XHJcbiAgICB0aGlzLnJlc2V0QWxsKGxldmVsKTtcclxuICAgIHRoaXMuY29sdW1uVG9PcmRlciA9IHNvcnRCeTsgXHJcbiAgICAvLyRGaWx0ZXIgLSBTdGFuZGFyZCBTZXJ2aWNlXHJcbiAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLiRmaWx0ZXIoJ29yZGVyQnknKSh0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0sIHRoaXMuY29sdW1uVG9PcmRlciwgb3JkZXIpOyBcclxuICAgIHRoaXMucGFnaW5hdGlvbihsZXZlbCk7XHJcbiAgfTtcclxuICByYW5nZSh0b3RhbCwgbGV2ZWwpIHtcclxuICAgIHZhciByZXQgPSBbXTtcclxuICAgIHZhciBzdGFydDogbnVtYmVyO1xyXG4gICAgc3RhcnQgPSBOdW1iZXIodGhpcy5jdXJyZW50UGFnZVtsZXZlbF0pIC0gMjtcclxuICAgIGlmKHN0YXJ0IDwgMCkge1xyXG4gICAgICBzdGFydCA9IDA7XHJcbiAgICB9XHJcbiAgICB2YXIgayA9IDE7XHJcbiAgICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCB0b3RhbDsgaSsrKSB7XHJcbiAgICAgIHJldC5wdXNoKGkpO1xyXG4gICAgICBrKys7XHJcbiAgICAgIGlmIChrID4gNikge1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0O1xyXG4gIH1cclxuICB0b2dnbGVHcm91cCAoZ3JvdXApIHtcclxuICAgIGlmICh0aGlzLmlzR3JvdXBTaG93bihncm91cCkpIHtcclxuICAgICAgdGhpcy5zaG93bkdyb3VwID0gbnVsbDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuc2hvd25Hcm91cCA9IGdyb3VwO1xyXG4gICAgfVxyXG4gIH1cclxuICBpc0dyb3VwU2hvd24oZ3JvdXA6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIHRoaXMuc2hvd25Hcm91cCA9PSBncm91cDtcclxuICB9XHJcblxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5jbGFzcyBMb2dpbkNvbnRyb2xsZXIge1xyXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHNjb3BlJywgJyRzdGF0ZScsICdVc2VyU2VydmljZSddO1xyXG5cdHByaXZhdGUgaW52YWxpZE1lc3NhZ2U6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRwcml2YXRlIHVzZXJuYW1lOiBzdHJpbmc7XHJcblx0cHJpdmF0ZSBwYXNzd29yZDogc3RyaW5nO1xyXG5cdHByaXZhdGUgaXBhZGRyZXNzOiBzdHJpbmc7XHJcblx0cHJpdmF0ZSBlcm9vcm1lc3NhZ2U6IHN0cmluZztcclxuXHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSwgcHJpdmF0ZSAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSwgXHJcblx0XHRwcml2YXRlIHVzZXJTZXJ2aWNlOiBVc2VyU2VydmljZSkge1xyXG5cclxuXHR9XHJcblxyXG5cdGNsZWFyRXJyb3IoKSB7XHJcblx0XHR0aGlzLmludmFsaWRNZXNzYWdlID0gZmFsc2U7XHJcblx0fVxyXG5cclxuXHRsb2dvdXQoKSB7XHJcblx0XHR0aGlzLiRzdGF0ZS5nbyhcImFwcC5sb2dpblwiKTtcclxuXHR9XHJcblxyXG5cdGRvTG9naW4obG9naW5Gb3JtOiBib29sZWFuKSB7XHJcblx0XHRpZiAoIWxvZ2luRm9ybSkge1xyXG5cdFx0XHRpZiAoIWFuZ3VsYXIuaXNEZWZpbmVkKHRoaXMudXNlcm5hbWUpIHx8ICFhbmd1bGFyLmlzRGVmaW5lZCh0aGlzLnBhc3N3b3JkKSB8fCAhYW5ndWxhci5pc0RlZmluZWQodGhpcy5pcGFkZHJlc3MpIHx8dGhpcy51c2VybmFtZS50cmltKCkgPT0gXCJcIiB8fCB0aGlzLnBhc3N3b3JkLnRyaW0oKSA9PSBcIlwiIHx8IHRoaXMuaXBhZGRyZXNzLnRyaW0oKSA9PSBcIlwiKSB7XHJcblx0XHRcdFx0dGhpcy5pbnZhbGlkTWVzc2FnZSA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0U0VSVkVSX1VSTCA9ICdodHRwOi8vJyArIHRoaXMuaXBhZGRyZXNzICsgJy8nICsgJ3JhcGlkLXdzL3NlcnZpY2VzL3Jlc3QnO1xyXG5cdFx0XHR0aGlzLnVzZXJTZXJ2aWNlLmxvZ2luKHRoaXMudXNlcm5hbWUsdGhpcy5wYXNzd29yZCkudGhlbihcclxuXHRcdFx0XHQocmVzdWx0KSA9PiB7XHJcblx0XHRcdFx0XHRpZiAocmVzdWx0LnJlc3BvbnNlLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1x0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2YXIgcmVxID0ge1xyXG5cdFx0XHRcdFx0XHRcdHVzZXJJZDogdGhpcy51c2VybmFtZVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHRoaXMudXNlclNlcnZpY2UuZ2V0VXNlclByb2ZpbGUocmVxKS50aGVuKFxyXG5cdFx0XHRcdFx0XHRcdChwcm9maWxlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHR2YXIgdXNlck5hbWUgPSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHVzZXJuYW1lOiBwcm9maWxlLnJlc3BvbnNlLmRhdGEudXNlckluZm8udXNlck5hbWVcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudXNlclNlcnZpY2Uuc2V0VXNlcih1c2VyTmFtZSk7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLiRzdGF0ZS5nbyhcImFwcC5taXMtZmxvd25cIik7XHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkIG9uIGxvYWRpbmcgdXNlciBwcm9maWxlJyk7XHJcblx0XHRcdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5pbnZhbGlkTWVzc2FnZSA9IHRydWU7XHJcblx0XHRcdFx0XHRcdHRoaXMuZXJvb3JtZXNzYWdlID0gXCJQbGVhc2UgY2hlY2sgeW91ciBjcmVkZW50aWFsc1wiO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmludmFsaWRNZXNzYWdlID0gdHJ1ZTtcclxuXHRcdFx0XHRcdHRoaXMuZXJvb3JtZXNzYWdlID0gXCJQbGVhc2UgY2hlY2sgeW91ciBuZXR3b3JrIGNvbm5lY3Rpb25cIjtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH1lbHNlIHtcclxuXHRcdFx0dGhpcy5pbnZhbGlkTWVzc2FnZSA9IHRydWU7XHJcblx0XHRcdHRoaXMuZXJvb3JtZXNzYWdlID0gXCJQbGVhc2UgY2hlY2sgeW91ciBjcmVkZW50aWFsc1wiO1xyXG5cdFx0fSAgIFxyXG5cdH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5jbGFzcyBDaGFydEV2ZW50IGltcGxlbWVudHMgbmcuSURpcmVjdGl2ZSB7XHJcblx0cmVzdHJpY3QgPSAnRSc7XHJcblx0c2NvcGUgPSB7XHJcblx0XHR0eXBlOiBcIj1cIlxyXG5cdH07XHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLCBwcml2YXRlICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlKSB7XHJcblx0fTtcclxuXHJcblx0bGluayA9ICgkc2NvcGU6IG5nLklTY29wZSwgaUVsZW1lbnQ6IEpRdWVyeSwgYXR0cmlidXRlczogbmcuSUF0dHJpYnV0ZXMsICRzY2U6IG5nLklTQ0VTZXJ2aWNlKTogdm9pZCA9PiB7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRcclxuXHRcdHZhciBudmQzID0gaUVsZW1lbnQuZmluZCgnbnZkMycpWzBdO1xyXG5cdFx0dmFyIHNlbGVjdGVkRWxlbSA9IGFuZ3VsYXIuZWxlbWVudChudmQzKTtcclxuXHRcdHNlbGYuJHRpbWVvdXQoXHJcblx0XHRcdCgpID0+IHtcclxuXHRcdFx0XHRzZWxlY3RlZEVsZW0ucmVhZHkoZnVuY3Rpb24oZSkge1xyXG5cdFx0XHRcdFx0dmFyIGNoaWxkRWxlbTogYW55ID0gc2VsZWN0ZWRFbGVtLmZpbmQoJ2cnKTtcclxuXHRcdFx0XHRcdGFuZ3VsYXIuZm9yRWFjaChjaGlsZEVsZW0sIGZ1bmN0aW9uKGVsZW0sIGtleSkge1xyXG5cdFx0XHRcdFx0XHRpZiAoZWxlbS5hdHRyaWJ1dGVzWydjbGFzcyddKSB7XHJcblx0XHRcdFx0XHRcdFx0dmFyIGNsYXNzTmFtZSA9IGVsZW0uYXR0cmlidXRlc1snY2xhc3MnXS52YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoY2xhc3NOYW1lID09ICdudi1iYXIgcG9zaXRpdmUnKSB7XHJcblx0XHRcdFx0XHRcdFx0XHR2YXIgcmVjdEVsZW0gPSBhbmd1bGFyLmVsZW1lbnQoZWxlbSk7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhyZWN0RWxlbSk7XHJcblx0XHRcdFx0XHRcdFx0XHRyZWN0RWxlbS5vbignZGJsY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHR5cGUgPSBhdHRyaWJ1dGVzLnR5cGU7IFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRzZWxmLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnb3BlbkRyaWxsUG9wdXAnLCB7XCJkYXRhXCIgOiByZWN0RWxlbVswXVsnX19kYXRhX18nXSwgXCJ0eXBlXCI6IHR5cGUsIFwiZXZlbnRcIjogZXZlbnR9KTtcclxuXHRcdFx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSxcclxuXHRcdFx0MTApO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIGZhY3RvcnkoKTogbmcuSURpcmVjdGl2ZUZhY3Rvcnkge1xyXG5cdFx0dmFyIGRpcmVjdGl2ZSA9ICgkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLCAkcm9vdFNjb3BlOiBuZy5JUm9vdFNjb3BlU2VydmljZSkgPT4gbmV3IENoYXJ0RXZlbnQoJHRpbWVvdXQsICRyb290U2NvcGUpXHJcblx0XHRkaXJlY3RpdmUuJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJHJvb3RTY29wZSddO1xyXG5cdFx0cmV0dXJuIGRpcmVjdGl2ZTtcclxuXHR9XHJcblx0XHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vX2xpYnMudHNcIiAvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL2FwcC9BcHBDb250cm9sbGVyLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9Db3Jkb3ZhU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9Mb2NhbFN0b3JhZ2VTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL3NlcnZpY2VzL1Nlc3Npb25TZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vc2VydmljZXMvRXJyb3JIYW5kbGVyU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvTWlzU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL29wZXJhdGlvbmFsL3NlcnZpY2VzL09wZXJhdGlvbmFsU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9NaXNDb250cm9sbGVyLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL09wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL3VzZXIvTG9naW5Db250cm9sbGVyLnRzXCIvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL2NoYXJ0LWV2ZW50L0NoYXJ0RXZlbnQudHNcIiAvPlxyXG5cclxudmFyIFNFUlZFUl9VUkwgPSAnaHR0cDovLzEwLjkxLjE1Mi45OTo4MDgyL3JhcGlkLXdzL3NlcnZpY2VzL3Jlc3QnO1xyXG5hbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnLCBbJ2lvbmljJywgJ3JhcGlkTW9iaWxlLmNvbmZpZycsICd0YWJTbGlkZUJveCcsICdudmQzQ2hhcnREaXJlY3RpdmVzJywgJ252ZDMnXSlcclxuXHJcblx0LnJ1bigoJGlvbmljUGxhdGZvcm06IElvbmljLklQbGF0Zm9ybSwgJGh0dHA6IG5nLklIdHRwU2VydmljZSkgPT4ge1xyXG5cdFx0JGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb24udG9rZW4gPSAndG9rZW4nO1xyXG4gIFx0XHQkaHR0cC5kZWZhdWx0cy5oZWFkZXJzLnBvc3RbXCJDb250ZW50LVR5cGVcIl0gPSBcImFwcGxpY2F0aW9uL2pzb25cIjtcclxuXHRcdCRpb25pY1BsYXRmb3JtLnJlYWR5KCgpID0+IHtcclxuXHRcdFx0aWYgKHR5cGVvZiBuYXZpZ2F0b3IuZ2xvYmFsaXphdGlvbiAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0fVxyXG5cdFx0fSlcclxuXHR9KVxyXG4uY29uZmlnKCgkc3RhdGVQcm92aWRlcjogYW5ndWxhci51aS5JU3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyOiBhbmd1bGFyLnVpLklVcmxSb3V0ZXJQcm92aWRlcixcclxuXHQkaW9uaWNDb25maWdQcm92aWRlcjogSW9uaWMuSUNvbmZpZ1Byb3ZpZGVyKSA9PiB7XHJcblx0JGlvbmljQ29uZmlnUHJvdmlkZXIudmlld3Muc3dpcGVCYWNrRW5hYmxlZChmYWxzZSk7XHJcblxyXG5cdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhcHAnLCB7XHJcblx0XHR1cmw6ICcvYXBwJyxcclxuXHRcdGFic3RyYWN0OiB0cnVlLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3RlbXBsYXRlcy9tZW51Lmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjogJ0FwcENvbnRyb2xsZXIgYXMgYXBwQ3RybCdcclxuXHR9KVxyXG5cdC5zdGF0ZSgnbG9naW4nLCB7XHJcblx0XHR1cmw6ICcvbG9naW4nLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3VzZXIvbG9naW4uaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOiAnTG9naW5Db250cm9sbGVyIGFzIExvZ2luQ3RybCdcclxuXHR9KVxyXG5cdC5zdGF0ZSgnYXBwLm1pcy1mbG93bicsIHtcclxuXHRcdHVybDogJy9taXMvZmxvd24nLFxyXG5cdFx0dmlld3M6IHtcclxuXHRcdFx0J21lbnVDb250ZW50Jzoge1xyXG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9taXMvZmxvd24uaHRtbCcsXHJcblx0XHRcdFx0Y29udHJvbGxlcjogJ01pc0NvbnRyb2xsZXIgYXMgTWlzQ3RybCdcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pXHJcblx0LnN0YXRlKCdhcHAub3BlcmF0aW9uYWwtZmxvd24nLCB7XHJcblx0XHR1cmw6ICcvb3BlcmF0aW9uYWwvZmxvd24nLFxyXG5cdFx0dmlld3M6IHtcclxuXHRcdFx0J21lbnVDb250ZW50Jzoge1xyXG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9mbG93bi5odG1sJyxcclxuXHRcdFx0XHRjb250cm9sbGVyOiAnT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIgYXMgT3ByQ3RybCdcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHQkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvbG9naW4nKTtcclxufSlcclxuXHJcbi5zZXJ2aWNlKCdEYXRhUHJvdmlkZXJTZXJ2aWNlJywgRGF0YVByb3ZpZGVyU2VydmljZSlcclxuLnNlcnZpY2UoJ05ldFNlcnZpY2UnLCBOZXRTZXJ2aWNlKVxyXG4uc2VydmljZSgnRXJyb3JIYW5kbGVyU2VydmljZScsIEVycm9ySGFuZGxlclNlcnZpY2UpXHJcbi5zZXJ2aWNlKCdTZXNzaW9uU2VydmljZScsIFNlc3Npb25TZXJ2aWNlKVxyXG4uc2VydmljZSgnQ29yZG92YVNlcnZpY2UnLCBDb3Jkb3ZhU2VydmljZSlcclxuLnNlcnZpY2UoJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCBMb2NhbFN0b3JhZ2VTZXJ2aWNlKVxyXG4uc2VydmljZSgnVXNlclNlcnZpY2UnLCBVc2VyU2VydmljZSlcclxuXHJcbi5zZXJ2aWNlKCdNaXNTZXJ2aWNlJywgTWlzU2VydmljZSlcclxuLnNlcnZpY2UoJ09wZXJhdGlvbmFsU2VydmljZScsIE9wZXJhdGlvbmFsU2VydmljZSlcclxuLnNlcnZpY2UoJ0ZpbHRlcmVkTGlzdFNlcnZpY2UnLCBGaWx0ZXJlZExpc3RTZXJ2aWNlKVxyXG4uc2VydmljZSgnQ2hhcnRvcHRpb25TZXJ2aWNlJywgQ2hhcnRvcHRpb25TZXJ2aWNlKVxyXG5cclxuLmNvbnRyb2xsZXIoJ0FwcENvbnRyb2xsZXInLCBBcHBDb250cm9sbGVyKVxyXG4uY29udHJvbGxlcignTWlzQ29udHJvbGxlcicsIE1pc0NvbnRyb2xsZXIpXHJcbi5jb250cm9sbGVyKCdPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlcicsIE9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyKVxyXG4uY29udHJvbGxlcignTG9naW5Db250cm9sbGVyJywgTG9naW5Db250cm9sbGVyKVxyXG5cclxuLmRpcmVjdGl2ZSgnY2hhcnRldmVudCcsIENoYXJ0RXZlbnQuZmFjdG9yeSgpKVxyXG4vLyAuZGlyZWN0aXZlKCdmZXRjaExpc3QnLCBGZXRjaExpc3QuZmFjdG9yeSgpKVxyXG5cclxuXHJcbmlvbmljLlBsYXRmb3JtLnJlYWR5KCgpID0+IHtcclxuXHRpZiAod2luZG93LmNvcmRvdmEgJiYgd2luZG93LmNvcmRvdmEucGx1Z2lucy5LZXlib2FyZCkge1xyXG5cdH1cclxuXHQvLyBTdGF0dXNCYXIub3ZlcmxheXNXZWJWaWV3KGZhbHNlKTtcclxuIC8vICAgIFN0YXR1c0Jhci5iYWNrZ3JvdW5kQ29sb3JCeUhleFN0cmluZygnIzIwOWRjMicpO1xyXG4gLy8gICAgU3RhdHVzQmFyLnN0eWxlTGlnaHRDb250ZW50KCk7XHJcblx0Xy5kZWZlcigoKSA9PiB7XHJcblx0XHQvLyBhbmd1bGFyLmJvb3RzdHJhcChkb2N1bWVudCwgWydyYXBpZE1vYmlsZSddKTtcclxuXHR9KTtcclxufSk7XHJcbiIsbnVsbCwiKGZ1bmN0aW9uICgpIHtcclxuICAndXNlIHN0cmljdCc7XHJcbiAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcclxuICAuZGlyZWN0aXZlKCdoZVByb2dyZXNzQmFyJywgZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGRpcmVjdGl2ZURlZmluaXRpb25PYmplY3QgPSB7XHJcbiAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgIHJlcGxhY2U6IGZhbHNlLFxyXG4gICAgICBzY29wZToge2RhdGE6ICc9Y2hhcnREYXRhJywgc2hvd3Rvb2x0aXA6ICdAc2hvd1Rvb2x0aXAnfSxcclxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcclxuICAgICAgICAgICAgICAgICAgLmRvbWFpbihbMCwgZDMubWF4KHNjb3BlLmRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuICtkLnByb2dyZXNzIH0pXSlcclxuICAgICAgICAgICAgICAgICAgLnJhbmdlKFswLCA5MF0pO1xyXG5cclxuICAgICAgICB2YXIgc2VnbWVudCA9IGQzLnNlbGVjdChlbGVtZW50WzBdKVxyXG4gICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKFwiLmhvcml6b250YWwtYmFyLWdyYXBoLXNlZ21lbnRcIilcclxuICAgICAgICAgICAgICAgICAgICAgLmRhdGEoc2NvcGUuZGF0YSlcclxuICAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcclxuICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXNlZ21lbnRcIiwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC1sYWJlbFwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWUgfSk7XHJcblxyXG4gICAgICAgIHZhciBiYXJTZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXZhbHVlXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtdmFsdWUtc2NhbGVcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZS1iYXJcIiwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIGJhclNlZ21lbnRcclxuICAgICAgICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmNvbG9yIH0pICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxyXG4gICAgICAgICAgICAgICAuZHVyYXRpb24oMTAwMClcclxuICAgICAgICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoK2QucHJvZ3Jlc3MpICsgXCIlXCIgfSk7XHJcblxyXG4gICAgICAgIHZhciBib3hTZWdtZW50ID0gYmFyU2VnbWVudC5hcHBlbmQoXCJzcGFuXCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZS1ib3hcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnByb2dyZXNzID8gZC5wcm9ncmVzcyA6IFwiXCIgfSk7XHJcbiAgICAgICAgaWYoc2NvcGUuc2hvd3Rvb2x0aXAgIT09ICd0cnVlJykgcmV0dXJuOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgIHZhciBidG5TZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJidXR0b25cIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLWljb24gaWNvbiBpb24tY2hldnJvbi1kb3duIG5vLWJvcmRlciBzZWN0b3JDdXN0b21DbGFzc1wiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwiaGlkZVwiLCBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGQpIHJldHVybiBkLmRyaWxsRmxhZyA9PSAnTic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7ICAgICAgICAgICAgXHJcbiAgICAgICAgdmFyIHRvb2x0aXBTZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJkaXZcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJ0b29sdGlwXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKCdoaWRlJywgdHJ1ZSk7XHJcbiAgICAgICAgdG9vbHRpcFNlZ21lbnQuYXBwZW5kKFwicFwiKS50ZXh0KGZ1bmN0aW9uKGQpeyByZXR1cm4gZC5uYW1lOyB9KTtcclxuICAgICAgICB2YXIgdGFibGUgPSB0b29sdGlwU2VnbWVudC5hcHBlbmQoXCJ0YWJsZVwiKTtcclxuICAgICAgICB2YXIgdGhlYWQgPSB0YWJsZS5hcHBlbmQoJ3RyJyk7XHJcbiAgICAgICAgdGhlYWQuYXBwZW5kKCd0aCcpLnRleHQoJ1NlY3RvcicpO1xyXG4gICAgICAgIHRoZWFkLmFwcGVuZCgndGgnKS50ZXh0KCdSZXZlbnVlJyk7XHJcblxyXG4gICAgICAgIHZhciB0ciAgPSB0YWJsZVxyXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ3Rib2R5JylcclxuICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKFwidHJcIilcclxuICAgICAgICAgICAgICAgICAgICAuZGF0YShmdW5jdGlvbihkKXtyZXR1cm4gZC5zY0FuYWx5c2lzRHJpbGxzfSlcclxuICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKS5hcHBlbmQoXCJ0clwiKTtcclxuXHJcbiAgICAgICAgdmFyIHNlY3RvclRkID0gdHIuYXBwZW5kKFwidGRcIilcclxuICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5zZWN0b3IgfSk7XHJcblxyXG4gICAgICAgIHZhciByZXZlbnVlVGQgPSB0ci5hcHBlbmQoXCJ0ZFwiKVxyXG4gICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnJldmVudWUgfSk7XHJcblxyXG4gICAgICAgIGJ0blNlZ21lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKXsgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gY29uc29sZS5sb2codG9vbHRpcFNlZ21lbnQpO1xyXG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQodGhpcykucmVtb3ZlQ2xhc3MoJ3NlY3RvckN1c3RvbUNsYXNzJyk7XHJcblx0XHQgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlY3RvckN1c3RvbUNsYXNzXCIpKS5yZW1vdmVDbGFzcygnaW9uLWNoZXZyb24tdXAnKTtcclxuXHRcdCAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc2VjdG9yQ3VzdG9tQ2xhc3NcIikpLmFkZENsYXNzKCdpb24tY2hldnJvbi1kb3duJyk7XHJcblx0XHQgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlY3RvckN1c3RvbUNsYXNzXCIpKS5uZXh0KCkucmVtb3ZlQ2xhc3MoJ3Nob3cnKTtcclxuXHRcdCAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc2VjdG9yQ3VzdG9tQ2xhc3NcIikpLm5leHQoKS5hZGRDbGFzcygnaGlkZScpO1xyXG5cdFx0ICBcclxuICAgICAgICAgIGlmKGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkuaGFzQ2xhc3MoJ3Nob3cnKSkge1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykucmVtb3ZlQ2xhc3MoJ2lvbi1jaGV2cm9uLXVwJyk7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5hZGRDbGFzcygnaW9uLWNoZXZyb24tZG93bicpO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLnJlbW92ZUNsYXNzKCdzaG93Jyk7ICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkuYWRkQ2xhc3MoJ2hpZGUnKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5yZW1vdmVDbGFzcygnaW9uLWNoZXZyb24tZG93bicpO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykuYWRkQ2xhc3MoJ2lvbi1jaGV2cm9uLXVwJyk7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkucmVtb3ZlQ2xhc3MoJ2hpZGUnKTtcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5hZGRDbGFzcygnc2hvdycpO1xyXG4gICAgICAgICAgfVxyXG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQodGhpcykuYWRkQ2xhc3MoJ3NlY3RvckN1c3RvbUNsYXNzJyk7XHJcblx0XHQgIFxyXG5cdFx0ICBcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICAgIHJldHVybiBkaXJlY3RpdmVEZWZpbml0aW9uT2JqZWN0O1xyXG4gIH0pO1xyXG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG4gIGFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScpXHJcbiAgLmRpcmVjdGl2ZSgnaGVSZXZlbnVlUHJvZ3Jlc3NCYXInLCBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgcmV2QmFyT2JqZWN0ID0ge1xyXG4gICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICByZXBsYWNlOiBmYWxzZSxcclxuICAgICAgc2NvcGU6IHtkYXRhOiAnPWNoYXJ0RGF0YSd9LFxyXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coc2NvcGUuZGF0YSk7XHJcbiAgICAgICAgc2NvcGUuJHdhdGNoKCdkYXRhJywgZnVuY3Rpb24obmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ25ld1ZhbHVlJywgbmV3VmFsdWUpO1xyXG4gICAgICAgICAgICB2YXIgeCA9IGQzLnNjYWxlLmxpbmVhcigpXHJcbiAgICAgICAgICAgICAgICAgICAgICAuZG9tYWluKFswLCBkMy5tYXgoc2NvcGUuZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZSB9KV0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAucmFuZ2UoWzAsIDkwXSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgc2VnbWVudCA9IGQzLnNlbGVjdChlbGVtZW50WzBdKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbChcIi5uZXQtcmV2LWJhci1ncmFwaC1zZWdtZW50XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZGF0YShzY29wZS5kYXRhKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtc2VnbWVudFwiLCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgIHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC1sYWJlbFwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5uYW1lIH0pO1xyXG5cclxuICAgICAgICAgICAgdmFyIGJhclNlZ21lbnQgPSBzZWdtZW50LmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtdmFsdWVcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtdmFsdWUtc2NhbGVcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtdmFsdWUtYmFyXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtdmFsdWUtYm94XCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudmFsdWU7IH0pO1xyXG5cclxuICAgICAgICAgICAgYmFyU2VnbWVudCAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jb2xvciB9KSAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbigpXHJcbiAgICAgICAgICAgICAgICAgICAuZHVyYXRpb24oMTAwMClcclxuICAgICAgICAgICAgICAgICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiB4KGQudmFsdWUpICsgXCIlXCIgfSk7ICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgfSAgICAgICAgICAgICAgIFxyXG4gICAgICAgIH0sIHRydWUpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIHJldkJhck9iamVjdDtcclxuICB9KTtcclxufSkoKTsiLCJcclxuKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG4gICAgLy8gYXR0YWNoIHRoZSBmYWN0b3JpZXMgYW5kIHNlcnZpY2UgdG8gdGhlIFtzdGFydGVyLnNlcnZpY2VzXSBtb2R1bGUgaW4gYW5ndWxhclxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcclxuICAgICAgICAuc2VydmljZSgnUmVwb3J0QnVpbGRlclN2YycsIHJlcG9ydEJ1aWxkZXJTZXJ2aWNlKTtcclxuICAgIFxyXG5cdGZ1bmN0aW9uIHJlcG9ydEJ1aWxkZXJTZXJ2aWNlKCkge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBcclxuICAgICAgICBzZWxmLmdlbmVyYXRlUmVwb3J0ID0gX2dlbmVyYXRlUmVwb3J0OyAgICAgICAgICAgIFxyXG4gICAgICAgIGZ1bmN0aW9uIF9nZW5lcmF0ZVJlcG9ydChwYXJhbSwgY2hhcnRUaXRsZSxmbG93bk1vbnRoKSB7XHJcblx0XHRcdHZhciB0aXRsZSA9IFwiXCI7XHJcblx0XHRcdGlmKHBhcmFtID09IFwibWV0cmljU25hcHNob3RcIilcclxuXHRcdFx0XHR0aXRsZSA9IFwiTUVUUklDIFNOQVBTSE9UIC1cIitmbG93bk1vbnRoK1wiIFwiK2NoYXJ0VGl0bGUudG9VcHBlckNhc2UoKStcIi0gVklFV1wiO1xyXG5cdFx0XHRlbHNlIGlmKHBhcmFtID09IFwidGFyZ2V0QWN0dWFsXCIpXHJcblx0XHRcdFx0dGl0bGUgPSBcIlRBUkdFVCBWUyBBQ1RVQUwgLSBcIisoKGNoYXJ0VGl0bGUgPT0gXCJyZXZlbnVlXCIpP1wiTkVUIFJFVkVOVUVcIjpcIlBBWCBDb3VudFwiKStcIiBcIitmbG93bk1vbnRoKyBcIiAtIFZJRVdcIjtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHRpdGxlID0gY2hhcnRUaXRsZStcIiBcIitmbG93bk1vbnRoK1wiIC0gVklFV1wiO1xyXG5cdFx0XHRcdFx0XHRcdFxyXG5cdFx0XHR2YXIgc3ZnTm9kZSA9IGQzLnNlbGVjdEFsbChcIi5cIitwYXJhbSkuc2VsZWN0QWxsKFwic3ZnXCIpO1xyXG5cdFx0XHR2YXIgY29udGVudCA9IFtdO1xyXG5cdFx0XHR2YXIgaW1hZ2VDb2x1bW4gPSBbXTtcclxuXHRcdFx0dmFyIHRleHRDb2x1bW4gPSBbXTtcclxuXHRcdFx0dmFyIGltYWdlc09iaiA9IHt9O1xyXG5cdFx0XHR2YXIgdGV4dE9iaiA9IHt9O1xyXG5cdFx0XHRjb250ZW50LnB1c2godGl0bGUpO1xyXG5cdFx0XHR2YXIgbm9kZUV4aXN0cyA9IFtdO1xyXG5cdFx0XHRhbmd1bGFyLmZvckVhY2goc3ZnTm9kZSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1x0XHRcdFx0XHJcblx0XHRcdFx0Y29uc29sZS5sb2coa2V5ICsgJzogJyArIHN2Z05vZGVba2V5XVswXS5vdXRlckhUTUwpO1xyXG5cdFx0XHRcdC8vdGV4dE9ialsnYWxpZ25tZW50J10gPSAnY2VudGVyJ1x0XHRcdFx0XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYobm9kZUV4aXN0cy5pbmRleE9mKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1mbGFnXCIpKSA9PSAtMSl7XHJcblx0XHRcdFx0XHR2YXIgaHRtbCA9IHN2Z05vZGVba2V5XVswXS5vdXRlckhUTUw7XHJcblx0XHRcdFx0XHRjYW52Zyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyksIGh0bWwpO1xyXG5cdFx0XHRcdFx0dmFyIHRlc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XHJcblx0XHRcdFx0XHR2YXIgaW1nc3JjID0gdGVzdC50b0RhdGFVUkwoKTtcclxuXHRcdFx0XHRcdHZhciAgdGV4dCA9IFwiXFxuXCIrc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLXRpdGxlXCIpK1wiXFxuXCI7XHJcblx0XHRcdFx0XHR0ZXh0T2JqWyd0ZXh0J10gPSB0ZXh0O1xyXG5cdFx0XHRcdFx0dGV4dENvbHVtbi5wdXNoKHRleHRPYmopO1xyXG5cdFx0XHRcdFx0aW1hZ2VzT2JqWydpbWFnZSddID0gaW1nc3JjO1xyXG5cdFx0XHRcdFx0aW1hZ2VDb2x1bW4ucHVzaChpbWFnZXNPYmopO1x0XHRcdFx0XHJcblx0XHRcdFx0XHR2YXIgaW1nVGVtcCA9e30sIHR4dFRlbXAgPXt9O1x0XHRcclxuXHRcdFx0XHRcdHR4dFRlbXBbJ2NvbHVtbnMnXSA9IHRleHRDb2x1bW47XHJcblx0XHRcdFx0XHRpbWdUZW1wWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInO1xyXG5cdFx0XHRcdFx0aW1nVGVtcFsnY29sdW1ucyddID0gaW1hZ2VDb2x1bW47XHJcblx0XHRcdFx0XHRjb250ZW50LnB1c2godHh0VGVtcCk7XHJcblx0XHRcdFx0XHRjb250ZW50LnB1c2goaW1nVGVtcCk7XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0aW1hZ2VDb2x1bW4gPSBbXTtcclxuXHRcdFx0XHRcdHRleHRDb2x1bW4gPSBbXTtcclxuXHRcdFx0XHRcdGltYWdlc09iaiA9IHt9O1xyXG5cdFx0XHRcdFx0dGV4dE9iaiA9IHt9O1xyXG5cdFx0XHRcdFx0aW1nVGVtcCA9IHt9O1xyXG5cdFx0XHRcdFx0dHh0VGVtcCA9e307XHJcblx0XHRcdFx0XHRub2RlRXhpc3RzLnB1c2goc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLWZsYWdcIikpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGNvbnRlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0c3R5bGVzOiB7XHJcblx0XHRcdFx0XHRoZWFkZXI6IHtcclxuXHRcdFx0XHRcdFx0Zm9udFNpemU6IDE4LFxyXG5cdFx0XHRcdFx0XHRib2xkOiB0cnVlXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0YmlnZ2VyOiB7XHJcblx0XHRcdFx0XHRcdGZvbnRTaXplOiAxNSxcclxuXHRcdFx0XHRcdFx0aXRhbGljczogdHJ1ZSxcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGRlZmF1bHRTdHlsZToge1xyXG5cdFx0XHRcdFx0Y29sdW1uR2FwOiAyMCxcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG4gICAgfVxyXG59KSgpOyIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuICAgIC8vIGF0dGFjaCB0aGUgc2VydmljZSB0byB0aGUgW3JhcGlkTW9iaWxlXSBtb2R1bGUgaW4gYW5ndWxhclxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcclxuXHQgXHQuc2VydmljZSgnUmVwb3J0U3ZjJywgWyckcScsICckdGltZW91dCcsICdSZXBvcnRCdWlsZGVyU3ZjJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG9ydFN2Y10pO1xyXG5cclxuXHQvLyBnZW5SZXBvcnREZWYgLS0+IGdlblJlcG9ydERvYyAtLT4gYnVmZmVyW10gLS0+IEJsb2IoKSAtLT4gc2F2ZUZpbGUgLS0+IHJldHVybiBmaWxlUGF0aFxyXG5cclxuXHQgZnVuY3Rpb24gcmVwb3J0U3ZjKCRxLCAkdGltZW91dCwgUmVwb3J0QnVpbGRlclN2Yykge1xyXG5cdFx0IHRoaXMucnVuUmVwb3J0QXN5bmMgPSBfcnVuUmVwb3J0QXN5bmM7XHJcblx0XHQgdGhpcy5ydW5SZXBvcnREYXRhVVJMID0gX3J1blJlcG9ydERhdGFVUkw7XHJcblxyXG5cdFx0Ly8gUlVOIEFTWU5DOiBydW5zIHRoZSByZXBvcnQgYXN5bmMgbW9kZSB3LyBwcm9ncmVzcyB1cGRhdGVzIGFuZCBkZWxpdmVycyBhIGxvY2FsIGZpbGVVcmwgZm9yIHVzZVxyXG5cclxuXHRcdCBmdW5jdGlvbiBfcnVuUmVwb3J0QXN5bmMoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKSB7XHJcbiAgICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHQgXHJcbiAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCcxLlByb2Nlc3NpbmcgVHJhbnNjcmlwdCcpO1xyXG4gICAgICAgICAgICAgZ2VuZXJhdGVSZXBvcnREZWYoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKS50aGVuKGZ1bmN0aW9uKGRvY0RlZikge1xyXG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzIuIEdlbmVyYXRpbmcgUmVwb3J0Jyk7XHJcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0RG9jKGRvY0RlZik7XHJcbiAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHBkZkRvYykge1xyXG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzMuIEJ1ZmZlcmluZyBSZXBvcnQnKTtcclxuICAgICAgICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVSZXBvcnRCdWZmZXIocGRmRG9jKTtcclxuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oYnVmZmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnNC4gU2F2aW5nIFJlcG9ydCBGaWxlJyk7XHJcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0QmxvYihidWZmZXIpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihwZGZCbG9iKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnNS4gT3BlbmluZyBSZXBvcnQgRmlsZScpO1xyXG4gICAgICAgICAgICAgICAgIHJldHVybiBzYXZlRmlsZShwZGZCbG9iLHN0YXR1c0ZsYWcpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihmaWxlUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgIC8vaGlkZUxvYWRpbmcoKTtcclxuICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGZpbGVQYXRoKTtcclxuICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9oaWRlTG9hZGluZygpO1xyXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJyArIGVycm9yLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgICAgICB9XHJcblxyXG5cdFx0Ly8gUlVOIERBVEFVUkw6IHJ1bnMgdGhlIHJlcG9ydCBhc3luYyBtb2RlIHcvIHByb2dyZXNzIHVwZGF0ZXMgYW5kIHN0b3BzIHcvIHBkZkRvYyAtPiBkYXRhVVJMIHN0cmluZyBjb252ZXJzaW9uXHJcblxyXG5cdFx0IGZ1bmN0aW9uIF9ydW5SZXBvcnREYXRhVVJMKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkge1xyXG4gICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdFx0IFxyXG4gICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMS5Qcm9jZXNzaW5nIFRyYW5zY3JpcHQnKTtcclxuICAgICAgICAgICAgIGdlbmVyYXRlUmVwb3J0RGVmKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkudGhlbihmdW5jdGlvbihkb2NEZWYpIHtcclxuICAgICAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCcyLiBHZW5lcmF0aW5nIFJlcG9ydCcpO1xyXG4gICAgICAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZVJlcG9ydERvYyhkb2NEZWYpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihwZGZEb2MpIHtcclxuICAgICAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCczLiBDb252ZXJ0IHRvIERhdGFVUkwnKTtcclxuICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0RGF0YVVSTChwZGZEb2MpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihvdXREb2MpIHtcclxuICAgICAgICAgICAgICAgICAvL2hpZGVMb2FkaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShvdXREb2MpO1xyXG4gICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAvL2hpZGVMb2FkaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgZXJyb3IudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbiAgICAgICAgIH1cclxuXHJcblx0XHQvLyAxLkdlbmVyYXRlUmVwb3J0RGVmOiB1c2UgY3VycmVudFRyYW5zY3JpcHQgdG8gY3JhZnQgcmVwb3J0RGVmIEpTT04gZm9yIHBkZk1ha2UgdG8gZ2VuZXJhdGUgcmVwb3J0XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnREZWYoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKSB7XHJcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XHJcblx0XHRcdFxyXG4gICAgICAgICAgICAvLyByZW1vdmVkIHNwZWNpZmljcyBvZiBjb2RlIHRvIHByb2Nlc3MgZGF0YSBmb3IgZHJhZnRpbmcgdGhlIGRvY1xyXG4gICAgICAgICAgICAvLyBsYXlvdXQgYmFzZWQgb24gcGxheWVyLCB0cmFuc2NyaXB0LCBjb3Vyc2VzLCBldGMuXHJcbiAgICAgICAgICAgIC8vIGN1cnJlbnRseSBtb2NraW5nIHRoaXMgYW5kIHJldHVybmluZyBhIHByZS1idWlsdCBKU09OIGRvYyBkZWZpbml0aW9uXHJcbiAgICAgICAgICAgIFxyXG5cdFx0XHQvL3VzZSBycHQgc2VydmljZSB0byBnZW5lcmF0ZSB0aGUgSlNPTiBkYXRhIG1vZGVsIGZvciBwcm9jZXNzaW5nIFBERlxyXG4gICAgICAgICAgICAvLyBoYWQgdG8gdXNlIHRoZSAkdGltZW91dCB0byBwdXQgYSBzaG9ydCBkZWxheSB0aGF0IHdhcyBuZWVkZWQgdG8gXHJcbiAgICAgICAgICAgIC8vIHByb3Blcmx5IGdlbmVyYXRlIHRoZSBkb2MgZGVjbGFyYXRpb25cclxuICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGQgPSB7fTtcclxuICAgICAgICAgICAgICAgIGRkID0gUmVwb3J0QnVpbGRlclN2Yy5nZW5lcmF0ZVJlcG9ydChzdGF0dXNGbGFnLHRpdGxlLGZsb3duTW9udGgpXHJcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShkZCk7XHJcbiAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyAyLkdlbmVyYXRlUnB0RmlsZURvYzogdGFrZSBKU09OIGZyb20gcnB0U3ZjLCBjcmVhdGUgcGRmbWVtb3J5IGJ1ZmZlciwgYW5kIHNhdmUgYXMgYSBsb2NhbCBmaWxlXHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnREb2MoZG9jRGVmaW5pdGlvbikge1xyXG5cdFx0XHQvL3VzZSB0aGUgcGRmbWFrZSBsaWIgdG8gY3JlYXRlIGEgcGRmIGZyb20gdGhlIEpTT04gY3JlYXRlZCBpbiB0aGUgbGFzdCBzdGVwXHJcblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XHJcblx0XHRcdHRyeSB7XHJcbiAgICAgICAgICAgICAgICAvL3VzZSB0aGUgcGRmTWFrZSBsaWJyYXJ5IHRvIGNyZWF0ZSBpbiBtZW1vcnkgcGRmIGZyb20gdGhlIEpTT05cclxuXHRcdFx0XHR2YXIgcGRmRG9jID0gcGRmTWFrZS5jcmVhdGVQZGYoIGRvY0RlZmluaXRpb24gKTtcclxuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocGRmRG9jKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXRjaCAoZSkge1xyXG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gMy5HZW5lcmF0ZVJwdEJ1ZmZlcjogcGRmS2l0IG9iamVjdCBwZGZEb2MgLS0+IGJ1ZmZlciBhcnJheSBvZiBwZGZEb2NcclxuXHJcblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydEJ1ZmZlcihwZGZEb2MpIHtcclxuXHRcdFx0Ly91c2UgdGhlIHBkZm1ha2UgbGliIHRvIGdldCBhIGJ1ZmZlciBhcnJheSBvZiB0aGUgcGRmRG9jIG9iamVjdFxyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHR0cnkge1xyXG4gICAgICAgICAgICAgICAgLy9nZXQgdGhlIGJ1ZmZlciBmcm9tIHRoZSBwZGZEb2NcclxuXHRcdFx0XHRwZGZEb2MuZ2V0QnVmZmVyKGZ1bmN0aW9uKGJ1ZmZlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdFx0ICAgZGVmZXJyZWQucmVzb2x2ZShidWZmZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDNiLmdldERhdGFVUkw6IHBkZktpdCBvYmplY3QgcGRmRG9jIC0tPiBlbmNvZGVkIGRhdGFVcmxcclxuXHJcblx0XHQgZnVuY3Rpb24gZ2V0RGF0YVVSTChwZGZEb2MpIHtcclxuXHRcdFx0Ly91c2UgdGhlIHBkZm1ha2UgbGliIHRvIGNyZWF0ZSBhIHBkZiBmcm9tIHRoZSBKU09OIGNyZWF0ZWQgaW4gdGhlIGxhc3Qgc3RlcFxyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHR0cnkge1xyXG4gICAgICAgICAgICAgICAgLy91c2UgdGhlIHBkZk1ha2UgbGlicmFyeSB0byBjcmVhdGUgaW4gbWVtb3J5IHBkZiBmcm9tIHRoZSBKU09OXHJcblx0XHRcdFx0cGRmRG9jLmdldERhdGFVcmwoZnVuY3Rpb24ob3V0RG9jKSB7XHJcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKG91dERvYyk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdFx0IH1cclxuXHJcblx0XHQvLyA0LkdlbmVyYXRlUmVwb3J0QmxvYjogYnVmZmVyIC0tPiBuZXcgQmxvYiBvYmplY3RcclxuXHJcblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydEJsb2IoYnVmZmVyKSB7XHJcblx0XHRcdC8vdXNlIHRoZSBnbG9iYWwgQmxvYiBvYmplY3QgZnJvbSBwZGZtYWtlIGxpYiB0byBjcmVhdCBhIGJsb2IgZm9yIGZpbGUgcHJvY2Vzc2luZ1xyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHR0cnkge1xyXG4gICAgICAgICAgICAgICAgLy9wcm9jZXNzIHRoZSBpbnB1dCBidWZmZXIgYXMgYW4gYXBwbGljYXRpb24vcGRmIEJsb2Igb2JqZWN0IGZvciBmaWxlIHByb2Nlc3NpbmdcclxuICAgICAgICAgICAgICAgIHZhciBwZGZCbG9iID0gbmV3IEJsb2IoW2J1ZmZlcl0sIHt0eXBlOiAnYXBwbGljYXRpb24vcGRmJ30pO1xyXG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShwZGZCbG9iKTtcclxuICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDUuU2F2ZUZpbGU6IHVzZSB0aGUgRmlsZSBwbHVnaW4gdG8gc2F2ZSB0aGUgcGRmQmxvYiBhbmQgcmV0dXJuIGEgZmlsZVBhdGggdG8gdGhlIGNsaWVudFxyXG5cclxuXHRcdGZ1bmN0aW9uIHNhdmVGaWxlKHBkZkJsb2IsdGl0bGUpIHtcclxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdFx0dmFyIGZpbGVOYW1lID0gdW5pcXVlRmlsZU5hbWUodGl0bGUpK1wiLnBkZlwiO1xyXG5cdFx0XHR2YXIgZmlsZVBhdGggPSBcIlwiO1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdTYXZlRmlsZTogcmVxdWVzdEZpbGVTeXN0ZW0nKTtcclxuXHRcdFx0XHR3aW5kb3cucmVxdWVzdEZpbGVTeXN0ZW0oTG9jYWxGaWxlU3lzdGVtLlBFUlNJU1RFTlQsIDAsIGdvdEZTLCBmYWlsKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXRjaCAoZSkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ1NhdmVGaWxlX0VycjogJyArIGUubWVzc2FnZSk7XHJcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xyXG5cdFx0XHRcdHRocm93KHtjb2RlOi0xNDAxLG1lc3NhZ2U6J3VuYWJsZSB0byBzYXZlIHJlcG9ydCBmaWxlJ30pO1xyXG5cdFx0XHR9XHRcdFx0XHJcblxyXG5cdFx0XHRmdW5jdGlvbiBnb3RGUyhmaWxlU3lzdGVtKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcignU2F2ZUZpbGU6IGdvdEZTIC0tPiBnZXRGaWxlJyk7XHJcblx0XHRcdFx0ZmlsZVN5c3RlbS5yb290LmdldEZpbGUoZmlsZU5hbWUsIHtjcmVhdGU6IHRydWUsIGV4Y2x1c2l2ZTogZmFsc2V9LCBnb3RGaWxlRW50cnksIGZhaWwpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmdW5jdGlvbiBnb3RGaWxlRW50cnkoZmlsZUVudHJ5KSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcignU2F2ZUZpbGU6IGdvdEZpbGVFbnRyeSAtLT4gKGZpbGVQYXRoKSAtLT4gY3JlYXRlV3JpdGVyJyk7XHJcblx0XHRcdFx0ZmlsZVBhdGggPSBmaWxlRW50cnkudG9VUkwoKTtcclxuXHRcdFx0XHRmaWxlRW50cnkuY3JlYXRlV3JpdGVyKGdvdEZpbGVXcml0ZXIsIGZhaWwpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmdW5jdGlvbiBnb3RGaWxlV3JpdGVyKHdyaXRlcikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ1NhdmVGaWxlOiBnb3RGaWxlV3JpdGVyIC0tPiB3cml0ZSAtLT4gb25Xcml0ZUVuZChyZXNvbHZlKScpO1xyXG5cdFx0XHRcdHdyaXRlci5vbndyaXRlZW5kID0gZnVuY3Rpb24oZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHR3cml0ZXIub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnd3JpdGVyIGVycm9yOiAnICsgZS50b1N0cmluZygpKTtcclxuXHRcdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdHdyaXRlci53cml0ZShwZGZCbG9iKTtcclxuXHRcdFx0fVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gZmFpbChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGVycm9yLmNvZGUpO1xyXG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlcnJvcik7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gdW5pcXVlRmlsZU5hbWUoZmlsZU5hbWUpe1xyXG5cdFx0XHR2YXIgbm93ID0gbmV3IERhdGUoKTtcclxuXHRcdFx0dmFyIHRpbWVzdGFtcCA9IG5vdy5nZXRGdWxsWWVhcigpLnRvU3RyaW5nKCk7XHJcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldE1vbnRoKCkgPCA5ID8gJzAnIDogJycpICsgbm93LmdldE1vbnRoKCkudG9TdHJpbmcoKTsgXHJcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldERhdGUoKSA8IDEwID8gJzAnIDogJycpICsgbm93LmdldERhdGUoKS50b1N0cmluZygpOyBcclxuXHRcdFx0dGltZXN0YW1wICs9IChub3cuZ2V0SG91cnMoKSA8IDEwID8gJzAnIDogJycpICsgbm93LmdldEhvdXJzKCkudG9TdHJpbmcoKTsgXHJcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldE1pbnV0ZXMoKSA8IDEwID8gJzAnIDogJycpICsgbm93LmdldE1pbnV0ZXMoKS50b1N0cmluZygpOyBcclxuXHRcdFx0dGltZXN0YW1wICs9IChub3cuZ2V0U2Vjb25kcygpIDwgMTAgPyAnMCcgOiAnJykgKyBub3cuZ2V0U2Vjb25kcygpLnRvU3RyaW5nKCk7XHJcblx0XHRcdHJldHVybiBmaWxlTmFtZS50b1VwcGVyQ2FzZSgpK1wiX1wiK3RpbWVzdGFtcDtcclxuXHRcdFxyXG5cdFx0fVxyXG5cdCB9XHJcbiAgICBcclxufSkoKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
