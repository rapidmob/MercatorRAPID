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
        this.$http = $http;
        this.cordovaService = cordovaService;
        this.$q = $q;
        this.URL_WS = URL_WS;
        this.OWNER_CARRIER_CODE = OWNER_CARRIER_CODE;
        this.isServerAvailable = false;
        this.$http.defaults.timeout = 60000;
        cordovaService.exec(function () {
            // this.fileTransfer = new FileTransfer();
        });
    }
    NetService.prototype.getData = function (fromUrl) {
        var url = this.URL_WS + fromUrl;
        return this.$http.get(url);
    };
    NetService.prototype.postData = function (toUrl, data, config) {
        return this.$http.post(this.URL_WS + toUrl, this.addMetaInfo(data));
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
    function AppController($state, $scope, dataProviderService, userService, $ionicPlatform, localStorageService, $ionicPopup, $ionicLoading, $ionicHistory, errorHandlerService) {
        this.$state = $state;
        this.$scope = $scope;
        this.dataProviderService = dataProviderService;
        this.userService = userService;
        this.$ionicPlatform = $ionicPlatform;
        this.localStorageService = localStorageService;
        this.$ionicPopup = $ionicPopup;
        this.$ionicLoading = $ionicLoading;
        this.$ionicHistory = $ionicHistory;
        this.errorHandlerService = errorHandlerService;
    }
    AppController.prototype.isNotEmpty = function (value) {
        return Utils.isNotEmpty(value);
    };
    AppController.prototype.hasNetworkConnection = function () {
        return this.dataProviderService.hasNetworkConnection();
    };
    AppController.prototype.logout = function () {
        this.$ionicHistory.clearCache();
        this.userService.logout();
        this.$state.go("login");
    };
    AppController.prototype.getUserDefaultPage = function () {
        return this.userService.userProfile.userInfo.defaultPage;
    };
    AppController.prototype.showDashboard = function (name) {
        return this.userService.showDashboard(name);
    };
    AppController.$inject = ['$state', '$scope', 'DataProviderService', 'UserService',
        '$ionicPlatform', 'LocalStorageService', '$ionicPopup',
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
        else if (item['document#'] && level == 3) {
            return (item['document#'].toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else {
            return false;
        }
    }
    if (drilltype == 'target') {
        if (item.routetype && level == 0) {
            return (item.routetype.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.routecode && level == 1) {
            return (item.routecode.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
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
        this._user = false;
        this.menuAccess = [];
    }
    UserService.prototype.setUser = function (user) {
        if (this.$window.localStorage) {
            this.$window.localStorage.setItem('rapidMobile.user', JSON.stringify(user));
        }
    };
    UserService.prototype.logout = function () {
        this.localStorageService.setObject('rapidMobile.user', null);
        this.localStorageService.setObject('userPermissionMenu', []);
        this._user = false;
    };
    UserService.prototype.isLoggedIn = function () {
        return this._user ? true : false;
    };
    UserService.prototype.isUserLoggedIn = function () {
        if (this.localStorageService.getObject('rapidMobile.user', '') != null) {
            return true;
        }
        else {
            return false;
        }
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
            if (typeof response.data === 'object') {
                _this._user = true;
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
        var _this = this;
        var requestUrl = '/user/userprofile';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            if (typeof response.data === 'object') {
                _this.userProfile = response.data.response.data;
                _this.localStorageService.setObject('userPermissionMenu', _this.userProfile.menuAccess);
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
    UserService.prototype.showDashboard = function (name) {
        if (this.isUserLoggedIn()) {
            if (typeof this.userProfile == 'undefined') {
                var data = this.localStorageService.getObject('userPermissionMenu', '');
                this.menuAccess = data;
            }
            else {
                this.menuAccess = this.userProfile.menuAccess;
            }
            for (var i = 0; i < this.menuAccess.length; i++) {
                if (this.menuAccess[i].menuName == name) {
                    return this.menuAccess[i].menuAccess;
                }
            }
        }
        else {
            return this.isUserLoggedIn();
        }
    };
    UserService.prototype.checkMenuAccess = function (name) {
        var data = this.localStorageService.getObject('userPermissionMenu', '');
        this.menuAccess = data;
        if (this.menuAccess) {
            for (var i = 0; i < this.menuAccess.length; i++) {
                if (this.menuAccess[i].menuName == name) {
                    return this.menuAccess[i].menuAccess;
                }
            }
        }
        else {
            return false;
        }
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
    function MisController($state, $scope, $ionicLoading, $timeout, $window, $ionicPopover, $filter, misService, chartoptionService, filteredListService, userService, $ionicHistory, reportSvc, $ionicPopup) {
        var _this = this;
        this.$state = $state;
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
        this.$ionicHistory = $ionicHistory;
        this.reportSvc = reportSvc;
        this.$ionicPopup = $ionicPopup;
        this.pageSize = 4;
        this.currentPage = [];
        this.selectedDrill = [];
        this.groups = [];
        this.orientationChange = function () {
            _this.onSlideMove({ index: _this.header.tabIndex });
        };
        if (!this.userService.checkMenuAccess('MIS')) {
            var self = this;
            self.$ionicPopup.alert({
                title: 'Error',
                content: 'You dont have acces to this Page!!!'
            }).then(function (res) {
                console.log('done');
                self.$state.go('app.mis-flown');
                // self.$ionicHistory.currentView(self.$ionicHistory.backView());
            });
        }
        else {
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
                chartOrTable: 'chart',
                targetView: 'chart',
                revenueView: 'chart',
                sectorView: 'chart'
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
            // var self = this;
            // this.$scope.$on('$ionicView.enter', () => {
            //     if (!self.userService.showDashboard('MIS')) {
            //         self.$state.go("login");
            //     }
            // });
            this.$scope.$on('openDrillPopup', function (event, response) {
                if (response.type == 'metric') {
                    _this.$scope.MisCtrl.openBarDrillDownPopover(response.event, { "point": response.data }, -1);
                }
                if (response.type == 'target') {
                    _this.$scope.MisCtrl.openTargetDrillDownPopover(response.event, { "point": response.data }, -1);
                }
            });
        }
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
        if (req.userId != "null") {
            this.misService.getPaxFlownMisHeader(req).then(function (data) {
                that.subHeader = data.response.data;
                that.header.flownMonth = that.subHeader.paxFlownMisMonths[0].flowMonth;
                that.onSlideMove({ index: 0 });
            }, function (error) {
                console.log('an error occured');
            });
        }
        that.header.username = that.getProfileUserName();
    };
    MisController.prototype.getProfileUserName = function () {
        if (this.userService.isUserLoggedIn()) {
            var obj = this.$window.localStorage.getItem('rapidMobile.user');
            if (obj != 'null') {
                var profileUserName = JSON.parse(obj);
                return profileUserName.username;
            }
        }
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
            this.regionName = (regionData.regionName) ? regionData.regionName : regionData.chartName;
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
            this.ionicLoadingShow();
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
                ItemsByPage: [],
                firstColumns: this.firstColumns[i]
            };
        }
    };
    MisController.prototype.openBarDrillDownPopover = function ($event, selData, selFindLevel) {
        this.drillName = 'METRIC SNAPSHOT REPORT - ' + selData.point.label;
        this.drillType = 'bar';
        this.groups = [];
        this.drilltabs = ['Route Level', 'Sector Level', 'Data Level', 'Flight Level'];
        this.firstColumns = ['routeCode', 'flownSector', 'flightNumber', 'flightDate'];
        this.initiateArray(this.drilltabs);
        this.drillBarpopover.show($event);
        this.openBarDrillDown(selData.point, selFindLevel);
    };
    ;
    MisController.prototype.openTargetDrillDownPopover = function ($event, selData, selFindLevel) {
        this.drillName = 'Target Vs Actual';
        this.drillType = 'target';
        this.groups = [];
        this.drilltabs = ['Route Type', 'Route code'];
        this.firstColumns = ['routetype', 'routecode'];
        this.initiateArray(this.drilltabs);
        this.drillBarpopover.show($event);
        this.openBarDrillDown(selData.point, selFindLevel);
    };
    ;
    MisController.prototype.openPopover = function ($event, index, charttype) {
        var that = this;
        $event.preventDefault();
        this.chartType = charttype;
        this.graphIndex = index;
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
        this.chartType = charttype;
        this.graphIndex = index;
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
        this.groups = [];
        this.drilltabs = ['Country Level', 'Sector Level', 'Flight Level', 'Document Level'];
        this.firstColumns = ['countryFrom', 'flownSector', 'flightNumber', 'document#'];
        this.initiateArray(this.drilltabs);
        this.drillpopover.show($event);
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
    MisController.prototype.toggleTargetView = function (val) {
        this.toggle.targetView = val;
    };
    MisController.prototype.toggleRevenueView = function (val) {
        this.toggle.revenueView = val;
    };
    MisController.prototype.toggleSectorView = function (val) {
        this.toggle.sectorView = val;
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
                window.open(dataURL, "_system");
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
    MisController.$inject = ['$state', '$scope', '$ionicLoading', '$timeout', '$window', '$ionicPopover',
        '$filter', 'MisService', 'ChartoptionService', 'FilteredListService', 'UserService', '$ionicHistory', 'ReportSvc', '$ionicPopup'];
    return MisController;
})();

/// <reference path="../../../_libs.ts" />
/// <reference path="../services/OperationalService.ts" />
/// <reference path="../../mis/services/FilteredListService.ts" />
var OperationalFlownController = (function () {
    function OperationalFlownController($state, $scope, $ionicLoading, $ionicPopover, $filter, operationalService, $ionicSlideBoxDelegate, $timeout, $window, reportSvc, filteredListService, userService, $ionicHistory, $ionicPopup) {
        var _this = this;
        this.$state = $state;
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
        this.userService = userService;
        this.$ionicHistory = $ionicHistory;
        this.$ionicPopup = $ionicPopup;
        this.carouselIndex = 0;
        this.threeBarChartColors = ['#4EB2F9', '#FFC300', '#5C6BC0'];
        this.fourBarChartColors = ['#7ED321', '#4EB2F9', '#FFC300', '#5C6BC0'];
        this.pageSize = 4;
        this.currentPage = [];
        this.selectedDrill = [];
        this.groups = [];
        if (!this.userService.checkMenuAccess('Operational')) {
            var self = this;
            self.$ionicPopup.alert({
                title: 'Error',
                content: 'You dont have acces to this Page!!!'
            }).then(function (res) {
                console.log('done');
                self.$state.go('app.mis-flown');
                // self.$ionicHistory.currentView(self.$ionicHistory.backView());
            });
        }
        else {
            this.tabs = [
                { title: 'My Dashboard', names: 'MyDashboard', icon: 'iconon-home' },
                { title: 'Flight Process Status', names: 'FlightProcessStatus', icon: 'ion-home' },
                { title: 'Flight Count by Reason', names: 'FlightCountbyReason', icon: 'ion-home' },
                { title: 'Coupon Count by Exception Category', names: 'CouponCountbyExceptionCategory', icon: 'ion-home' }
            ];
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
            this.initData();
            var that = this;
            //   this.$scope.$on('$ionicView.enter', () => {
            //       if (!that.userService.showDashboard('Operational')) {
            //           this.$ionicPopup.alert({
            //                     title: 'Error',
            //                     content: 'You dont have acces to this Page!!!'
            //           }).then(function(res) {
            //                     console.log('done');
            //           });
            //       } else {
            //       }
            // });
            this.$scope.$on('openDrillPopup1', function (event, response) {
                console.log(response.type);
                if (response.type == 'flight-process') {
                    _this.$scope.OprCtrl.openFlightProcessDrillPopover(response.event, { "point": response.data }, -1);
                }
                if (response.type == 'coupon-count') {
                    _this.$scope.OprCtrl.openCounponCountDrillPopover(response.event, { "point": response.data }, -1);
                }
                if (response.type == 'flight-count') {
                    _this.$scope.OprCtrl.openFlightCountDrillPopover(response.event, { "point": response.data }, -1);
                }
            });
        }
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
        if (req.userId != "null") {
            this.operationalService.getPaxFlownOprHeader(req).then(function (data) {
                that.subHeader = data.response.data;
                // console.log(that.subHeader.paxFlownOprMonths);
                that.header.flownMonth = that.subHeader.defaultMonth;
                // console.log(that.header.flownMonth);
                that.onSlideMove({ index: 0 });
            }, function (error) {
                console.log('an error occured');
            });
        }
        that.header.userName = that.getProfileUserName();
    };
    OperationalFlownController.prototype.selectedFlownMonth = function (month) {
        return (month == this.header.flownMonth);
    };
    OperationalFlownController.prototype.getProfileUserName = function () {
        if (this.userService.isUserLoggedIn()) {
            var obj = this.$window.localStorage.getItem('rapidMobile.user');
            if (obj != 'null') {
                var profileUserName = JSON.parse(obj);
                return profileUserName.username;
            }
        }
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
    OperationalFlownController.prototype.openPopover = function ($event, charttype, index) {
        var that = this;
        var temp = this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekData');
        that.currentIndex = temp.currentIndex();
        $event.preventDefault();
        this.charttype = charttype;
        this.graphType = index;
        this.$ionicPopover.fromTemplateUrl('components/operational/flown/graph-popover.html', {
            scope: that.$scope
        }).then(function (popover) {
            that.popovershown = true;
            that.graphpopover = popover;
            that.graphpopover.show($event);
        });
    };
    OperationalFlownController.prototype.closePopover = function () {
        this.graphpopover.hide();
    };
    ;
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
    OperationalFlownController.prototype.toggleFlightStatusView = function (val) {
        this.toggle.flightStatus = val;
    };
    OperationalFlownController.prototype.toggleFlightReasonView = function (val) {
        this.toggle.flightReason = val;
    };
    OperationalFlownController.prototype.toggleCCExceptionView = function (val) {
        this.toggle.ccException = val;
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
        this.groups = [];
        this.drilltabs = ['Country Level', 'Sector Level', 'Flight Level', 'Document Level'];
        this.firstColumns = ['countryFrom', 'flownSector', 'flightNumber', 'carrierCode#'];
        this.initiateArray(this.drilltabs);
        this.drillpopover.show($event);
        this.shownGroup = 0;
        this.openDrillDown(data.point, selFindLevel);
    };
    ;
    OperationalFlownController.prototype.openCounponCountDrillPopover = function ($event, data, selFindLevel) {
        this.drillName = 'COUPON COUNT BY EXCEPTION CATEGORY ';
        this.drillType = 'coupon-count';
        this.groups = [];
        this.drilltabs = ['Coupon Count Flight Status', 'Document Level'];
        this.firstColumns = ['flightNumber', 'flownSector'];
        this.initiateArray(this.drilltabs);
        this.drillpopover.show($event);
        this.shownGroup = 0;
        this.openDrillDown(data.point, selFindLevel);
    };
    ;
    OperationalFlownController.prototype.openFlightCountDrillPopover = function ($event, data, selFindLevel) {
        this.drillName = 'LIST OF OPEN FLIGHTS FOR ' + data.point[0] + '-' + this.header.flownMonth + ' BY REASON ';
        this.drillType = 'flight-count';
        this.groups = [];
        this.drilltabs = ['Open Flight Status', 'Document Level'];
        this.firstColumns = ['flightNumber', 'carrierCode'];
        this.initiateArray(this.drilltabs);
        this.drillpopover.show($event);
        this.shownGroup = 0;
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
            this.ionicLoadingShow();
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
                completeData: [],
                firstColumns: this.firstColumns[i]
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
    OperationalFlownController.$inject = ['$state', '$scope', '$ionicLoading', '$ionicPopover', '$filter',
        'OperationalService', '$ionicSlideBoxDelegate', '$timeout', '$window', 'ReportSvc', 'FilteredListService', 'UserService', '$ionicHistory', '$ionicPopup'];
    return OperationalFlownController;
})();

/// <reference path="../../_libs.ts" />
var LoginController = (function () {
    function LoginController($scope, $state, userService, $ionicHistory) {
        this.$scope = $scope;
        this.$state = $state;
        this.userService = userService;
        this.$ionicHistory = $ionicHistory;
        this.invalidMessage = false;
        if (this.userService.isLoggedIn()) {
            $ionicHistory.nextViewOptions({
                disableBack: true
            });
            console.log('navgating to mis-flown..');
            this.$state.go('app.mis-flown');
        }
    }
    LoginController.prototype.clearError = function () {
        this.invalidMessage = false;
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
                        _this.$ionicHistory.nextViewOptions({
                            disableBack: true
                        });
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
    };
    LoginController.$inject = ['$scope', '$state', 'UserService', '$ionicHistory'];
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
            var nvd3;
            if (attributes.type == 'metric' || attributes.type == 'target') {
                nvd3 = iElement.find('nvd3')[0];
            }
            if (attributes.type == 'flight-process' || attributes.type == 'flight-count' || attributes.type == 'coupon-count') {
                nvd3 = iElement.find('nvd3-multi-bar-chart')[0];
            }
            var selectedElem = angular.element(nvd3);
            self.$timeout(function () {
                selectedElem.ready(function (e) {
                    $scope.$watch(function () { return selectedElem.html(); }, function (newValue, oldValue) {
                        if (newValue) {
                            //console.log(newValue);
                            self.appendClick(selectedElem, attributes, self);
                        }
                    }, true);
                    //var childElem: any = selectedElem.find('rect').parent('g');
                    self.appendClick(selectedElem, attributes, self);
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
    ChartEvent.prototype.appendClick = function (selectedElem, attributes, self) {
        var dblClickInterval = 300;
        var firstClickTime;
        var waitingSecondClick = false;
        var childElem = selectedElem.find('rect');
        angular.forEach(childElem, function (elem, key) {
            if (elem.tagName == 'rect') {
                var rectElem = angular.element(elem);
                rectElem.on('click', function (event) {
                    if (!waitingSecondClick) {
                        // Single cllick
                        firstClickTime = (new Date()).getTime();
                        waitingSecondClick = true;
                        setTimeout(function () {
                            waitingSecondClick = false;
                            console.log(waitingSecondClick);
                        }, dblClickInterval);
                    }
                    else {
                        // Double cllick
                        waitingSecondClick = false;
                        var time = (new Date()).getTime();
                        if (time - firstClickTime < dblClickInterval) {
                            var type = attributes.type;
                            if (attributes.type == 'metric' || attributes.type == 'target') {
                                self.$rootScope.$broadcast('openDrillPopup', { "data": rectElem[0]['__data__'], "type": type, "event": event });
                            }
                            else {
                                console.log(rectElem);
                                self.$rootScope.$broadcast('openDrillPopup1', { "data": rectElem[0]['__data__'], "type": type, "event": event });
                            }
                        }
                    }
                });
            }
        });
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
                //textObj['alignment'] = 'center'				
                var html = "";
                if (nodeExists.indexOf(svgNode[key].parentNode.getAttribute("data-item-flag")) == -1 && svgNode[key].length >= 1) {
                    html = svgNode[key][0].outerHTML;
                    if (svgNode[key].parentNode.getAttribute("data-item-pdfFlag") === "dynamicWH") {
                        d3.select("." + param + "Flag").select("svg").attr("width", 1500);
                        d3.select("." + param + "Flag").select("svg").attr("height", 600);
                        var node = d3.select("." + param + "Flag").select("svg");
                        html = node[0][0].outerHTML;
                        imagesObj['width'] = 500;
                        imagesObj['height'] = 500;
                    }
                    if (svgNode[key].parentNode.getAttribute("data-item-pdfFlag") === "pdfFlag") {
                        imagesObj['width'] = 750;
                        imagesObj['height'] = 300;
                    }
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9saWJzLnRzIiwiY29tbW9uL3V0aWxzL1V0aWxzLnRzIiwiY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvQ29yZG92YVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvTmV0U2VydmljZS50cyIsImNvbW1vbi9zZXJ2aWNlcy9FcnJvckhhbmRsZXJTZXJ2aWNlLnRzIiwiY29tbW9uL3NlcnZpY2VzL0lTZXNzaW9uSHR0cFByb21pc2UuanMiLCJjb21tb24vc2VydmljZXMvU2Vzc2lvblNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1Jlc3BvbnNlLmpzIiwiY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHMiLCJjb21tb24vYXBwL0FwcENvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvc2VydmljZXMvT3BlcmF0aW9uYWxTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvTWlzQ29udHJvbGxlci50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL3VzZXIvTG9naW5Db250cm9sbGVyLnRzIiwiY29tbW9uL2NoYXJ0LWV2ZW50L0NoYXJ0RXZlbnQudHMiLCJhcHAudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1JlcXVlc3QuanMiLCJjb21wb25lbnRzL21pcy9wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvcmV2ZW51ZS1wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvcmVwb3J0QnVpbGRlclN2Yy50cyIsImNvbXBvbmVudHMvbWlzL3NlcnZpY2VzL3JlcG9ydFNlcnZpY2UudHMiXSwibmFtZXMiOlsiVXRpbHMiLCJVdGlscy5jb25zdHJ1Y3RvciIsIlV0aWxzLmlzTm90RW1wdHkiLCJVdGlscy5pc0xhbmRzY2FwZSIsIlV0aWxzLmdldFRvZGF5RGF0ZSIsIlV0aWxzLmlzSW50ZWdlciIsIkxvY2FsU3RvcmFnZVNlcnZpY2UiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTG9jYWxTdG9yYWdlU2VydmljZS5zZXQiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldCIsIkxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0T2JqZWN0IiwiTG9jYWxTdG9yYWdlU2VydmljZS5nZXRPYmplY3QiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmlzUmVjZW50RW50cnlBdmFpbGFibGUiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmFkZFJlY2VudEVudHJ5IiwiQ29yZG92YVNlcnZpY2UiLCJDb3Jkb3ZhU2VydmljZS5jb25zdHJ1Y3RvciIsIkNvcmRvdmFTZXJ2aWNlLmV4ZWMiLCJDb3Jkb3ZhU2VydmljZS5leGVjdXRlUGVuZGluZyIsIk5ldFNlcnZpY2UiLCJOZXRTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTmV0U2VydmljZS5nZXREYXRhIiwiTmV0U2VydmljZS5wb3N0RGF0YSIsIk5ldFNlcnZpY2UuZGVsZXRlRGF0YSIsIk5ldFNlcnZpY2UudXBsb2FkRmlsZSIsIk5ldFNlcnZpY2UuY2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkiLCJOZXRTZXJ2aWNlLnNlcnZlcklzQXZhaWxhYmxlIiwiTmV0U2VydmljZS5jYW5jZWxBbGxVcGxvYWREb3dubG9hZCIsIk5ldFNlcnZpY2UuYWRkTWV0YUluZm8iLCJlcnJvcmhhbmRsZXIiLCJFcnJvckhhbmRsZXJTZXJ2aWNlIiwiRXJyb3JIYW5kbGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkVycm9ySGFuZGxlclNlcnZpY2UudmFsaWRhdGVSZXNwb25zZSIsIkVycm9ySGFuZGxlclNlcnZpY2UuaXNOb1Jlc3VsdEZvdW5kIiwiRXJyb3JIYW5kbGVyU2VydmljZS5pc1Nlc3Npb25JbnZhbGlkIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNIYXJkRXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNTb2Z0RXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNFcnJvcnMiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc05vUmVzdWx0RXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0hhcmRFcnJvciIsIkVycm9ySGFuZGxlclNlcnZpY2UuaGFzU29mdEVycm9yIiwic2Vzc2lvbnNlcnZpY2UiLCJTZXNzaW9uU2VydmljZSIsIlNlc3Npb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiU2Vzc2lvblNlcnZpY2UucmVzb2x2ZVByb21pc2UiLCJTZXNzaW9uU2VydmljZS5hZGRBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyIiwiU2Vzc2lvblNlcnZpY2UucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lciIsIlNlc3Npb25TZXJ2aWNlLnNldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLnNldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLmNsZWFyTGlzdGVuZXJzIiwiU2Vzc2lvblNlcnZpY2UucmVmcmVzaFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkIiwiU2Vzc2lvblNlcnZpY2UuYWNjZXNzVG9rZW5SZWZyZXNoZWQiLCJkYXRhcHJvdmlkZXIiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlIiwiRGF0YVByb3ZpZGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkRhdGFQcm92aWRlclNlcnZpY2UuZ2V0RGF0YSIsIkRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmRlbGV0ZURhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiRGF0YVByb3ZpZGVyU2VydmljZS5hZGRNZXRhSW5mbyIsIkRhdGFQcm92aWRlclNlcnZpY2UuaXNMb2dvdXRTZXJ2aWNlIiwiQXBwQ29udHJvbGxlciIsIkFwcENvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJBcHBDb250cm9sbGVyLmlzTm90RW1wdHkiLCJBcHBDb250cm9sbGVyLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiQXBwQ29udHJvbGxlci5sb2dvdXQiLCJBcHBDb250cm9sbGVyLmdldFVzZXJEZWZhdWx0UGFnZSIsIkFwcENvbnRyb2xsZXIuc2hvd0Rhc2hib2FyZCIsIk1pc1NlcnZpY2UiLCJNaXNTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTWlzU2VydmljZS5nZXRNZXRyaWNTbmFwc2hvdCIsIk1pc1NlcnZpY2UuZ2V0VGFyZ2V0VnNBY3R1YWwiLCJNaXNTZXJ2aWNlLmdldFJldmVudWVBbmFseXNpcyIsIk1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlIiwiTWlzU2VydmljZS5nZXRTZWN0b3JDYXJyaWVyQW5hbHlzaXMiLCJNaXNTZXJ2aWNlLmdldFBheEZsb3duTWlzSGVhZGVyIiwiTWlzU2VydmljZS5nZXRSb3V0ZVJldmVudWVEcmlsbERvd24iLCJNaXNTZXJ2aWNlLmdldEJhckRyaWxsRG93biIsIk1pc1NlcnZpY2UuZ2V0RHJpbGxEb3duIiwiQ2hhcnRvcHRpb25TZXJ2aWNlIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLmxpbmVDaGFydE9wdGlvbnMiLCJDaGFydG9wdGlvblNlcnZpY2UubXVsdGlCYXJDaGFydE9wdGlvbnMiLCJDaGFydG9wdGlvblNlcnZpY2UubWV0cmljQmFyQ2hhcnRPcHRpb25zIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLnRhcmdldEJhckNoYXJ0T3B0aW9ucyIsIkZpbHRlcmVkTGlzdFNlcnZpY2UiLCJGaWx0ZXJlZExpc3RTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiRmlsdGVyZWRMaXN0U2VydmljZS5zZWFyY2hlZCIsIkZpbHRlcmVkTGlzdFNlcnZpY2UucGFnZWQiLCJzZWFyY2hVdGlsIiwiT3BlcmF0aW9uYWxTZXJ2aWNlIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldFBheEZsb3duT3BySGVhZGVyIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckZsaWdodFByb2NTdGF0dXMiLCJPcGVyYXRpb25hbFNlcnZpY2UuZ2V0T3ByRmxpZ2h0Q291bnRCeVJlYXNvbiIsIk9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJDb3Vwb25Db3VudEJ5RXhjZXB0aW9uIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldERyaWxsRG93biIsIlVzZXJTZXJ2aWNlIiwiVXNlclNlcnZpY2UuY29uc3RydWN0b3IiLCJVc2VyU2VydmljZS5zZXRVc2VyIiwiVXNlclNlcnZpY2UubG9nb3V0IiwiVXNlclNlcnZpY2UuaXNMb2dnZWRJbiIsIlVzZXJTZXJ2aWNlLmlzVXNlckxvZ2dlZEluIiwiVXNlclNlcnZpY2UuZ2V0VXNlciIsIlVzZXJTZXJ2aWNlLmxvZ2luIiwiVXNlclNlcnZpY2UuZ2V0VXNlclByb2ZpbGUiLCJVc2VyU2VydmljZS5zaG93RGFzaGJvYXJkIiwiVXNlclNlcnZpY2UuY2hlY2tNZW51QWNjZXNzIiwiTWlzQ29udHJvbGxlciIsIk1pc0NvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJNaXNDb250cm9sbGVyLmluaXREYXRhIiwiTWlzQ29udHJvbGxlci5nZXRQcm9maWxlVXNlck5hbWUiLCJNaXNDb250cm9sbGVyLnNlbGVjdGVkRmxvd25Nb250aCIsIk1pc0NvbnRyb2xsZXIub3BlbmluZm9Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jbG9zZVBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3Nlc0JhclBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3NlSW5mb1BvcG92ZXIiLCJNaXNDb250cm9sbGVyLnVwZGF0ZUhlYWRlciIsIk1pc0NvbnRyb2xsZXIub25TbGlkZU1vdmUiLCJNaXNDb250cm9sbGVyLnRvZ2dsZU1ldHJpYyIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlU3VyY2hhcmdlIiwiTWlzQ29udHJvbGxlci50b2dnbGVUYXJnZXQiLCJNaXNDb250cm9sbGVyLnRvZ2dsZVNlY3RvciIsIk1pc0NvbnRyb2xsZXIuY2FsbE1ldHJpY1NuYXBzaG90IiwiTWlzQ29udHJvbGxlci5jYWxsVGFyZ2V0VnNBY3R1YWwiLCJNaXNDb250cm9sbGVyLmNhbGxSb3V0ZVJldmVudWUiLCJNaXNDb250cm9sbGVyLmNhbGxSZXZlbnVlQW5hbHlzaXMiLCJNaXNDb250cm9sbGVyLm9wZW5EcmlsbERvd24iLCJNaXNDb250cm9sbGVyLmNsZWFyRHJpbGwiLCJNaXNDb250cm9sbGVyLmRyaWxsRG93blJlcXVlc3QiLCJNaXNDb250cm9sbGVyLmdldERyaWxsRG93blVSTCIsIk1pc0NvbnRyb2xsZXIub3BlbkJhckRyaWxsRG93biIsIk1pc0NvbnRyb2xsZXIuaW5pdGlhdGVBcnJheSIsIk1pc0NvbnRyb2xsZXIub3BlbkJhckRyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5UYXJnZXREcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5vcGVuUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblNlY3RvclBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNhbGxTZWN0b3JDYXJyaWVyQW5hbHlzaXMiLCJNaXNDb250cm9sbGVyLnRhcmdldEFjdHVhbEZpbHRlciIsIk1pc0NvbnRyb2xsZXIuc2VjdG9yQ2FycmllckZpbHRlciIsIk1pc0NvbnRyb2xsZXIucmV2ZW51ZUFuYWx5c2lzRmlsdGVyIiwiTWlzQ29udHJvbGxlci5nZXRGbG93bkZhdm9yaXRlcyIsIk1pc0NvbnRyb2xsZXIuaW9uaWNMb2FkaW5nU2hvdyIsIk1pc0NvbnRyb2xsZXIuaW9uaWNMb2FkaW5nSGlkZSIsIk1pc0NvbnRyb2xsZXIub3BlbkRyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3Nlc1BvcG92ZXIiLCJNaXNDb250cm9sbGVyLmlzRHJpbGxSb3dTZWxlY3RlZCIsIk1pc0NvbnRyb2xsZXIuc2VhcmNoUmVzdWx0cyIsIk1pc0NvbnRyb2xsZXIucGFnaW5hdGlvbiIsIk1pc0NvbnRyb2xsZXIuc2V0UGFnZSIsIk1pc0NvbnRyb2xsZXIubGFzdFBhZ2UiLCJNaXNDb250cm9sbGVyLnJlc2V0QWxsIiwiTWlzQ29udHJvbGxlci5zb3J0IiwiTWlzQ29udHJvbGxlci5yYW5nZSIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlR3JvdXAiLCJNaXNDb250cm9sbGVyLmlzR3JvdXBTaG93biIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlQ2hhcnRPclRhYmxlVmlldyIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlVGFyZ2V0VmlldyIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlUmV2ZW51ZVZpZXciLCJNaXNDb250cm9sbGVyLnRvZ2dsZVNlY3RvclZpZXciLCJNaXNDb250cm9sbGVyLnJ1blJlcG9ydCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pbml0RGF0YSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnNlbGVjdGVkRmxvd25Nb250aCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmdldFByb2ZpbGVVc2VyTmFtZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9uU2xpZGVNb3ZlIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2FsbE15RGFzaGJvYXJkIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2FsbEZsaWdodFByb2NTdGF0dXMiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jYWxsRmxpZ2h0Q291bnRCeVJlYXNvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNhbGxDb3Vwb25Db3VudEJ5RXhjZXB0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlblBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jbG9zZVBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pb25pY0xvYWRpbmdTaG93IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuYXBwbHlDaGFydENvbG9yQ29kZXMiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5nZXRGYXZvcml0ZUl0ZW1zIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY29sb3JGdW5jdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmZvdXJCYXJDb2xvckZ1bmN0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbmluZm9Qb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2xvc2VJbmZvUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUNvdW50IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaW9uaWNMb2FkaW5nSGlkZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmxvY2tTbGlkZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLndlZWtEYXRhUHJldiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLndlZWtEYXRhTmV4dCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUZsaWdodFN0YXR1c1ZpZXciLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50b2dnbGVGbGlnaHRSZWFzb25WaWV3IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudG9nZ2xlQ0NFeGNlcHRpb25WaWV3IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIucnVuUmVwb3J0IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbkZsaWdodFByb2Nlc3NEcmlsbFBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vcGVuQ291bnBvbkNvdW50RHJpbGxQb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbkZsaWdodENvdW50RHJpbGxQb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuZHJpbGxEb3duUmVxdWVzdCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmdldERyaWxsRG93blVSTCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRhYlNsaWRlSGFzQ2hhbmdlZCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5EcmlsbERvd24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jbG9zZURyaWxsUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNsZWFyRHJpbGwiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pbml0aWF0ZUFycmF5IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaXNEcmlsbFJvd1NlbGVjdGVkIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuc2VhcmNoUmVzdWx0cyIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnBhZ2luYXRpb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5zZXRQYWdlIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIubGFzdFBhZ2UiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5yZXNldEFsbCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnNvcnQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5yYW5nZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUdyb3VwIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaXNHcm91cFNob3duIiwiTG9naW5Db250cm9sbGVyIiwiTG9naW5Db250cm9sbGVyLmNvbnN0cnVjdG9yIiwiTG9naW5Db250cm9sbGVyLmNsZWFyRXJyb3IiLCJMb2dpbkNvbnRyb2xsZXIuZG9Mb2dpbiIsIkNoYXJ0RXZlbnQiLCJDaGFydEV2ZW50LmNvbnN0cnVjdG9yIiwiQ2hhcnRFdmVudC5mYWN0b3J5IiwiQ2hhcnRFdmVudC5hcHBlbmRDbGljayIsInJlcG9ydEJ1aWxkZXJTZXJ2aWNlIiwicmVwb3J0QnVpbGRlclNlcnZpY2UuX2dlbmVyYXRlUmVwb3J0IiwicmVwb3J0U3ZjIiwicmVwb3J0U3ZjLl9ydW5SZXBvcnRBc3luYyIsInJlcG9ydFN2Yy5fcnVuUmVwb3J0RGF0YVVSTCIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERlZiIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERvYyIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydEJ1ZmZlciIsInJlcG9ydFN2Yy5nZXREYXRhVVJMIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0QmxvYiIsInJlcG9ydFN2Yy5zYXZlRmlsZSIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGUyIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGaWxlRW50cnkiLCJyZXBvcnRTdmMuc2F2ZUZpbGUuZ290RmlsZVdyaXRlciIsInJlcG9ydFN2Yy5zYXZlRmlsZS5mYWlsIiwicmVwb3J0U3ZjLnVuaXF1ZUZpbGVOYW1lIl0sIm1hcHBpbmdzIjoiQUFBQSw0Q0FBNEM7QUFDNUMsNkNBQTZDO0FBQzdDLDhDQUE4QztBQUM5QyxnREFBZ0Q7QUFDaEQsb0RBQW9EOztBQ0pwRCx1Q0FBdUM7QUFFdkM7SUFBQUE7SUE2QkFDLENBQUNBO0lBNUJjRCxnQkFBVUEsR0FBeEJBO1FBQXlCRSxnQkFBbUJBO2FBQW5CQSxXQUFtQkEsQ0FBbkJBLHNCQUFtQkEsQ0FBbkJBLElBQW1CQTtZQUFuQkEsK0JBQW1CQTs7UUFDM0NBLElBQUlBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBO1FBQ3RCQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxFQUFFQSxVQUFDQSxLQUFLQTtZQUN2QkEsVUFBVUEsR0FBR0EsVUFBVUEsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsS0FBS0EsS0FBS0EsSUFBSUEsSUFBSUEsS0FBS0EsS0FBS0EsRUFBRUE7bUJBQ2xGQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNuRkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDSEEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0E7SUFDbkJBLENBQUNBO0lBRWFGLGlCQUFXQSxHQUF6QkE7UUFDQ0csSUFBSUEsV0FBV0EsR0FBWUEsS0FBS0EsQ0FBQ0E7UUFDakNBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLElBQUlBLE1BQU1BLENBQUNBLE1BQU1BLElBQUlBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLENBQUNBO1lBQzFEQSxJQUFJQSxJQUFJQSxHQUFtQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDaElBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO2dCQUNWQSxXQUFXQSxHQUFHQSxJ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LEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzlGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMxQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDekJBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2hDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUM3RkEsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDdENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUN0QkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDaENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNoR0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsZ0JBQWdCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNqQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDcERBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ3BLQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNoR0EsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDNUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ25HQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZ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QTtZQUNwQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsR0FBR0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsVUFBVUEsQ0FBQ0EsVUFBVUEsR0FBR0EsVUFBVUEsQ0FBQ0EsU0FBU0EsQ0FBQ0E7WUFDekZBLElBQUlBLGFBQWFBLEdBQUdBLENBQUNBLFVBQVVBLENBQUNBLFdBQVdBLElBQUlBLFVBQVVBLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLFVBQVVBLENBQUNBLFdBQVdBLEdBQUdBLEdBQUdBLEdBQUdBLFVBQVVBLENBQUNBLFNBQVNBLEdBQUdBLEVBQUVBLENBQUNBO1lBQ2hJQSxJQUFJQSxZQUFZQSxHQUFHQSxDQUFDQSxVQUFVQSxDQUFDQSxXQUFXQSxJQUFJQSxVQUFVQSxJQUFJQSxDQUFDQSxDQUFDQSxHQUFHQSxVQUFVQSxDQUFDQSxXQUFXQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUM3RkEsSUFBSUEsWUFBWUEsR0FBR0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsWUFBWUEsSUFBSUEsVUFBVUEsSUFBSUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsVUFBVUEsQ0FBQ0EsWUFBWUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDL0ZBLElBQUlBLENBQUNBLGdCQUFnQkEsRUFBRUEsQ0FBQ0E7WUFFeEJBLElBQUlBLE9BQU9BLEdBQUdBO2dCQUNWQSxZQUFZQSxFQUFFQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQTtnQkFDcENBLGtCQUFrQkEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBQ0EsR0FBR0E7Z0JBQ3JEQSxRQUFRQSxFQUFFQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQTtnQkFDOUJBLGNBQWNBLEVBQUVBLEVBQUVBO2dCQUNsQkEsWUFBWUEsRUFBRUEsVUFBVUE7Z0JBQ3hCQSxZQUFZQSxFQUFFQSxDQUFDQTtnQkFDZkEsWUFBWUEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBRUEs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QSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFVQSxFQUFFQSxHQUFHQSxFQUFFQSxHQUFHQSxHQUFHQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxVQUFVQSxFQUFFQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQTtZQUM5RUEsU0FBU0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBVUEsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsVUFBVUEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0E7WUFDOUVBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLEdBQUNBLEdBQUdBLEdBQUNBLFNBQVNBLENBQUNBO1FBRTdDQSxDQUFDQTtJQUNEYixDQUFDQTtBQUVILENBQUMsQ0FBQyxFQUFFLENBQUMiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9pb25pYy5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvU2NyZWVuLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9Jc1RhYmxldC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvSW5BcHBCcm93c2VyLmQudHNcIiAvPiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG5cbmNsYXNzIFV0aWxzIHtcblx0cHVibGljIHN0YXRpYyBpc05vdEVtcHR5KC4uLnZhbHVlczogT2JqZWN0W10pOiBib29sZWFuIHtcblx0XHR2YXIgaXNOb3RFbXB0eSA9IHRydWU7XG5cdFx0Xy5mb3JFYWNoKHZhbHVlcywgKHZhbHVlKSA9PiB7XG5cdFx0XHRpc05vdEVtcHR5ID0gaXNOb3RFbXB0eSAmJiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpICYmIHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSAnJ1xuXHRcdFx0XHQmJiAhKChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNPYmplY3QodmFsdWUpKSAmJiBfLmlzRW1wdHkodmFsdWUpKSAmJiB2YWx1ZSAhPSAwKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gaXNOb3RFbXB0eTtcblx0fVxuXG5cdHB1YmxpYyBzdGF0aWMgaXNMYW5kc2NhcGUoKTogYm9vbGVhbiB7XG5cdFx0dmFyIGlzTGFuZHNjYXBlOiBib29sZWFuID0gZmFsc2U7XG5cdFx0aWYgKHdpbmRvdyAmJiB3aW5kb3cuc2NyZWVuICYmIHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24pIHtcblx0XHRcdHZhciB0eXBlOiBzdHJpbmcgPSA8c3RyaW5nPihfLmlzU3RyaW5nKHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24pID8gd2luZG93LnNjcmVlbi5vcmllbnRhdGlvbiA6IHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24udHlwZSk7XG5cdFx0XHRpZiAodHlwZSkge1xuXHRcdFx0XHRpc0xhbmRzY2FwZSA9IHR5cGUuaW5kZXhPZignbGFuZHNjYXBlJykgPj0gMDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGlzTGFuZHNjYXBlO1xuXHR9XG5cblx0cHVibGljIHN0YXRpYyBnZXRUb2RheURhdGUoKTogRGF0ZSB7XG5cdFx0dmFyIHRvZGF5RGF0ZSA9IG5ldyBEYXRlKCk7XG5cdFx0dG9kYXlEYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuXHRcdHJldHVybiB0b2RheURhdGU7XG5cdH1cblx0cHJpdmF0ZSBzdGF0aWMgaXNJbnRlZ2VyKG51bWJlcjogQmlnSnNMaWJyYXJ5LkJpZ0pTKTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIHBhcnNlSW50KG51bWJlci50b1N0cmluZygpKSA9PSArbnVtYmVyO1xuXHR9XG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cblxuaW50ZXJmYWNlIFBvaW50T2JqZWN0IHtcblx0Y29kZTogc3RyaW5nLFxuXHRkZXNjcmlwdGlvbjogc3RyaW5nXG59XG5cbmludGVyZmFjZSBJTG9jYWxTdG9yYWdlU2VydmljZSB7XG5cdHNldChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogc3RyaW5nKTogdm9pZDtcblx0Z2V0KGtleUlkOiBzdHJpbmcsIGRlZmF1bHRWYWx1ZTogc3RyaW5nKTogc3RyaW5nO1xuXHRzZXRPYmplY3Qoa2V5SWQ6IHN0cmluZywga2V5dmFsdWU6IGFueVtdKTogdm9pZDtcblx0Z2V0T2JqZWN0KGtleUlkOiBzdHJpbmcpOiBhbnk7XG5cdGlzUmVjZW50RW50cnlBdmFpbGFibGUob3JnaW5PYmplY3Q6IFBvaW50T2JqZWN0LCB0eXBlOiBzdHJpbmcpOiB2b2lkO1xuXHRhZGRSZWNlbnRFbnRyeShkYXRhOiBhbnksIHR5cGU6IHN0cmluZyk6IHZvaWQ7XG59XG5cbmNsYXNzIExvY2FsU3RvcmFnZVNlcnZpY2UgaW1wbGVtZW50cyBJTG9jYWxTdG9yYWdlU2VydmljZSB7XG5cblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckd2luZG93J107XG5cdHByaXZhdGUgcmVjZW50RW50cmllczogW1BvaW50T2JqZWN0XTtcblxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlKSB7XG5cdH1cblxuXHRzZXQoa2V5SWQ6IHN0cmluZywga2V5dmFsdWU6IHN0cmluZyk6IHZvaWQge1xuXHRcdHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdID0ga2V5dmFsdWU7XG5cdH1cblx0Z2V0KGtleUlkOiBzdHJpbmcsIGRlZmF1bHRWYWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcblx0XHRyZXR1cm4gdGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gfHwgZGVmYXVsdFZhbHVlO1xuXHR9XG5cdHNldE9iamVjdChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogYW55W10pOiB2b2lkIHtcblx0XHR0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSA9ICBKU09OLnN0cmluZ2lmeShrZXl2YWx1ZSk7XG5cdH1cblx0Z2V0T2JqZWN0KGtleUlkOiBzdHJpbmcpOiBhbnkge1xuXHRcdHJldHVybiB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSA/IEpTT04ucGFyc2UodGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0pIDogdW5kZWZpbmVkO1xuXHR9XG5cblx0aXNSZWNlbnRFbnRyeUF2YWlsYWJsZShvcmdpbk9iamVjdDogUG9pbnRPYmplY3QsIHR5cGU6IHN0cmluZykge1xuXHRcdHRoaXMucmVjZW50RW50cmllcyA9IHRoaXMuZ2V0T2JqZWN0KHR5cGUpID8gdGhpcy5nZXRPYmplY3QodHlwZSkgOiBbXTtcblx0XHRyZXR1cm4gdGhpcy5yZWNlbnRFbnRyaWVzLmZpbHRlcihmdW5jdGlvbiAoZW50cnkpIHsgcmV0dXJuIGVudHJ5LmNvZGUgPT09IG9yZ2luT2JqZWN0LmNvZGUgfSk7XG5cdH1cblxuXHRhZGRSZWNlbnRFbnRyeShkYXRhOiBhbnksIHR5cGU6IHN0cmluZykge1xuXHRcdHZhciBvcmdpbk9iamVjdDogUG9pbnRPYmplY3RcdD1cdGRhdGEgPyBkYXRhLm9yaWdpbmFsT2JqZWN0IDogdW5kZWZpbmVkO1xuXG5cdFx0aWYgKG9yZ2luT2JqZWN0KSB7XG5cdFx0XHRpZiAodGhpcy5pc1JlY2VudEVudHJ5QXZhaWxhYmxlKG9yZ2luT2JqZWN0LCB0eXBlKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0dGhpcy5yZWNlbnRFbnRyaWVzID0gdGhpcy5nZXRPYmplY3QodHlwZSkgPyB0aGlzLmdldE9iamVjdCh0eXBlKSA6IFtdO1xuXHRcdFx0XHQodGhpcy5yZWNlbnRFbnRyaWVzLmxlbmd0aCA9PSAzKSA/IHRoaXMucmVjZW50RW50cmllcy5wb3AoKSA6IHRoaXMucmVjZW50RW50cmllcztcblx0XHRcdFx0dGhpcy5yZWNlbnRFbnRyaWVzLnVuc2hpZnQob3JnaW5PYmplY3QpO1xuXHRcdFx0XHR0aGlzLnNldE9iamVjdCh0eXBlLCB0aGlzLnJlY2VudEVudHJpZXMpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cblxuaW50ZXJmYWNlIElDb3Jkb3ZhQ2FsbCB7XG5cdCgpOiB2b2lkO1xufVxuXG5jbGFzcyBDb3Jkb3ZhU2VydmljZSB7XG5cblx0cHJpdmF0ZSBjb3Jkb3ZhUmVhZHk6IGJvb2xlYW4gPSBmYWxzZTtcblx0cHJpdmF0ZSBwZW5kaW5nQ2FsbHM6IElDb3Jkb3ZhQ2FsbFtdID0gW107XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlcmVhZHknLCAoKSA9PiB7XG5cdFx0XHR0aGlzLmNvcmRvdmFSZWFkeSA9IHRydWU7XG5cdFx0XHR0aGlzLmV4ZWN1dGVQZW5kaW5nKCk7XG5cdFx0fSk7XG5cdH1cblxuXHRleGVjKGZuOiBJQ29yZG92YUNhbGwsIGFsdGVybmF0aXZlRm4/OiBJQ29yZG92YUNhbGwpIHtcblx0XHRpZiAodGhpcy5jb3Jkb3ZhUmVhZHkpIHtcblx0XHRcdGZuKCk7XG5cdFx0fSBlbHNlIGlmICghYWx0ZXJuYXRpdmVGbikge1xuXHRcdFx0dGhpcy5wZW5kaW5nQ2FsbHMucHVzaChmbik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGFsdGVybmF0aXZlRm4oKTtcblx0XHR9XG5cdH1cblxuXHRwcml2YXRlIGV4ZWN1dGVQZW5kaW5nKCkge1xuXHRcdHRoaXMucGVuZGluZ0NhbGxzLmZvckVhY2goKGZuKSA9PiB7XG5cdFx0XHRmbigpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5wZW5kaW5nQ2FsbHMgPSBbXTtcblx0fVxuXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi90eXBpbmdzL2FuZ3VsYXJqcy9hbmd1bGFyLmQudHNcIi8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJDb3Jkb3ZhU2VydmljZS50c1wiIC8+XG5cbmludGVyZmFjZSBJTmV0U2VydmljZSB7XG5cdGdldERhdGEoZnJvbVVybDogc3RyaW5nKTogbmcuSUh0dHBQcm9taXNlPGFueT47XG5cdHBvc3REYXRhKHRvVXJsOiBzdHJpbmcsIGRhdGE6IGFueSk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xuXHRkZWxldGVEYXRhKHRvVXJsOiBzdHJpbmcpOiBuZy5JSHR0cFByb21pc2U8YW55Pjtcblx0Y2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkoKTogbmcuSVByb21pc2U8Ym9vbGVhbj47XG59XG5cbmNsYXNzIE5ldFNlcnZpY2UgaW1wbGVtZW50cyBJTmV0U2VydmljZSB7XG5cblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckaHR0cCcsICdDb3Jkb3ZhU2VydmljZScsICckcScsICdVUkxfV1MnLCAnT1dORVJfQ0FSUklFUl9DT0RFJ107XG5cdHByaXZhdGUgZmlsZVRyYW5zZmVyOiBGaWxlVHJhbnNmZXI7XG5cdHByaXZhdGUgaXNTZXJ2ZXJBdmFpbGFibGU6IGJvb2xlYW4gPSBmYWxzZTtcblxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlICRodHRwOiBuZy5JSHR0cFNlcnZpY2UsIHByaXZhdGUgY29yZG92YVNlcnZpY2U6IENvcmRvdmFTZXJ2aWNlLCBwcm90ZWN0ZWQgJHE6IG5nLklRU2VydmljZSwgcHVibGljIFVSTF9XUzogc3RyaW5nLCBwcml2YXRlIE9XTkVSX0NBUlJJRVJfQ09ERTogc3RyaW5nKSB7XG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy50aW1lb3V0ID0gNjAwMDA7XG5cdFx0Y29yZG92YVNlcnZpY2UuZXhlYygoKSA9PiB7XG5cdFx0XHQvLyB0aGlzLmZpbGVUcmFuc2ZlciA9IG5ldyBGaWxlVHJhbnNmZXIoKTtcblx0XHR9KTtcblx0fVxuXG5cdGdldERhdGEoZnJvbVVybDogc3RyaW5nKTogbmcuSUh0dHBQcm9taXNlPGFueT4ge1xuXHRcdHZhciB1cmw6IHN0cmluZyA9IHRoaXMuVVJMX1dTICsgZnJvbVVybDtcblx0XHRyZXR1cm4gdGhpcy4kaHR0cC5nZXQodXJsKTtcblx0fVxuXG5cdHBvc3REYXRhKHRvVXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcblx0XHRyZXR1cm4gdGhpcy4kaHR0cC5wb3N0KHRoaXMuVVJMX1dTICsgdG9VcmwsIHRoaXMuYWRkTWV0YUluZm8oZGF0YSkpO1xuXHR9XG5cblx0ZGVsZXRlRGF0YSh0b1VybDogc3RyaW5nKTogbmcuSUh0dHBQcm9taXNlPGFueT4ge1xuXHRcdHJldHVybiB0aGlzLiRodHRwLmRlbGV0ZSh0aGlzLlVSTF9XUyArIHRvVXJsKTtcblx0fVxuXG5cdHVwbG9hZEZpbGUoXG5cdFx0dG9Vcmw6IHN0cmluZywgdXJsRmlsZTogc3RyaW5nLFxuXHRcdG9wdGlvbnM6IEZpbGVVcGxvYWRPcHRpb25zLCBzdWNjZXNzQ2FsbGJhY2s6IChyZXN1bHQ6IEZpbGVVcGxvYWRSZXN1bHQpID0+IHZvaWQsXG5cdFx0ZXJyb3JDYWxsYmFjazogKGVycm9yOiBGaWxlVHJhbnNmZXJFcnJvcikgPT4gdm9pZCwgcHJvZ3Jlc3NDYWxsYmFjaz86IChwcm9ncmVzc0V2ZW50OiBQcm9ncmVzc0V2ZW50KSA9PiB2b2lkKSB7XG5cdFx0aWYgKCF0aGlzLmZpbGVUcmFuc2Zlcikge1xuXHRcdFx0dGhpcy5maWxlVHJhbnNmZXIgPSBuZXcgRmlsZVRyYW5zZmVyKCk7XG5cdFx0fVxuXHRcdGNvbnNvbGUubG9nKG9wdGlvbnMucGFyYW1zKTtcblx0XHR0aGlzLmZpbGVUcmFuc2Zlci5vbnByb2dyZXNzID0gcHJvZ3Jlc3NDYWxsYmFjaztcblx0XHR2YXIgdXJsOiBzdHJpbmcgPSB0aGlzLlVSTF9XUyArIHRvVXJsO1xuXHRcdHRoaXMuZmlsZVRyYW5zZmVyLnVwbG9hZCh1cmxGaWxlLCB1cmwsIHN1Y2Nlc3NDYWxsYmFjaywgZXJyb3JDYWxsYmFjaywgb3B0aW9ucyk7XG5cdH1cblxuXHRjaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpOiBuZy5JUHJvbWlzZTxib29sZWFuPiB7XG5cdFx0dmFyIGF2YWlsYWJpbGl0eTogYm9vbGVhbiA9IHRydWU7XG5cblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8Ym9vbGVhbj4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cblx0XHR0aGlzLmNvcmRvdmFTZXJ2aWNlLmV4ZWMoKCkgPT4ge1xuXHRcdFx0aWYgKHdpbmRvdy5uYXZpZ2F0b3IpIHsgLy8gb24gZGV2aWNlXG5cdFx0XHRcdHZhciBuYXZpZ2F0b3I6IE5hdmlnYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3I7XG5cdFx0XHRcdGlmIChuYXZpZ2F0b3IuY29ubmVjdGlvbiAmJiAoKG5hdmlnYXRvci5jb25uZWN0aW9uLnR5cGUgPT0gQ29ubmVjdGlvbi5OT05FKSB8fCAobmF2aWdhdG9yLmNvbm5lY3Rpb24udHlwZSA9PSBDb25uZWN0aW9uLlVOS05PV04pKSkge1xuXHRcdFx0XHRcdGF2YWlsYWJpbGl0eSA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRkZWYucmVzb2x2ZShhdmFpbGFiaWxpdHkpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0c2VydmVySXNBdmFpbGFibGUoKTogYm9vbGVhbiB7XG5cdFx0dmFyIHRoYXQ6IE5ldFNlcnZpY2UgPSB0aGlzO1xuXG5cdFx0dmFyIHNlcnZlcklzQXZhaWxhYmxlID0gdGhpcy5jaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpLnRoZW4oKHJlc3VsdDogYm9vbGVhbikgPT4ge1xuXHRcdFx0dGhhdC5pc1NlcnZlckF2YWlsYWJsZSA9IHJlc3VsdDtcblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzLmlzU2VydmVyQXZhaWxhYmxlO1xuXHR9XG5cblx0Y2FuY2VsQWxsVXBsb2FkRG93bmxvYWQoKSB7XG5cdFx0aWYgKHRoaXMuZmlsZVRyYW5zZmVyKSB7XG5cdFx0XHR0aGlzLmZpbGVUcmFuc2Zlci5hYm9ydCgpO1xuXHRcdH1cblx0fVxuXG5cdGFkZE1ldGFJbmZvKHJlcXVlc3REYXRhOiBhbnkpOiBhbnkge1xuXHRcdHZhciBkZXZpY2U6IElvbmljLklEZXZpY2UgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKVxuXHRcdHZhciBtb2RlbDogc3RyaW5nID0gJ2RldmljZSBJbmZvJztcblx0XHR2YXIgb3NUeXBlOiBzdHJpbmcgPSAnOC40Jztcblx0XHR2YXIgb3NWZXJzaW9uOiBzdHJpbmcgPSAnaW9zJztcblx0XHR2YXIgZGV2aWNlVG9rZW46IHN0cmluZyA9ICdzdHJpbmcnO1xuXHRcdGlmIChkZXZpY2UpIHtcblx0XHRcdG1vZGVsID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkubW9kZWw7XG5cdFx0XHRvc1R5cGUgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5wbGF0Zm9ybTtcblx0XHRcdG9zVmVyc2lvbiA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLnZlcnNpb247XG5cdFx0fVxuXHRcdGlmICghbW9kZWwpIHtcblx0XHRcdG1vZGVsID0gJ2RldmljZSBJbmZvJztcdFxuXHRcdH1cblx0XHRpZiAoIW9zVHlwZSkge1xuXHRcdFx0b3NUeXBlID0gJzguNCc7XHRcblx0XHR9XG5cdFx0aWYgKCFvc1ZlcnNpb24pIHtcblx0XHRcdG9zVmVyc2lvbiA9ICdpb3MnO1x0XG5cdFx0fVxuXHRcdFxuXHRcdHZhciBtZXRhSW5mbyA9IHtcblx0XHRcdCdjaGFubmVsSWRlbnRpZmllcic6ICdNT0InLFxuXHRcdFx0J2RhdGVUaW1lU3RhbXAnOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcblx0XHRcdCdvd25lckNhcnJpZXJDb2RlJzogdGhpcy5PV05FUl9DQVJSSUVSX0NPREUsXG5cdFx0XHQnYWRkaXRpb25hbEluZm8nOiB7XG5cdFx0XHRcdCdkZXZpY2VUeXBlJzogd2luZG93LmlzVGFibGV0ID8gJ1RhYmxldCcgOiAnUGhvbmUnLFxuXHRcdFx0XHQnbW9kZWwnOiBtb2RlbCxcblx0XHRcdFx0J29zVHlwZSc6IG9zVHlwZSxcblx0XHRcdFx0J29zVmVyc2lvbic6IG9zVmVyc2lvbixcblx0XHRcdFx0J2RldmljZVRva2VuJzogZGV2aWNlVG9rZW4sXG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xuXHRcdFx0J21ldGFJbmZvJzogbWV0YUluZm8sXG5cdFx0XHQncmVxdWVzdERhdGEnOiByZXF1ZXN0RGF0YVxuXHRcdH07XG5cdFx0cmV0dXJuIHJlcXVlc3RPYmo7XG5cdH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTmV0U2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxuXG5tb2R1bGUgZXJyb3JoYW5kbGVyIHtcblx0ZXhwb3J0IGNvbnN0IFNUQVRVU19GQUlMOiBzdHJpbmcgPSAnZmFpbCc7XG5cdGV4cG9ydCBjb25zdCBTRVZFUklUWV9FUlJPUl9IQVJEOiBzdHJpbmcgPSAnSEFSRCc7XG5cdGV4cG9ydCBjb25zdCBTRVZFUklUWV9FUlJPUl9TT0ZUOiBzdHJpbmcgPSAnU09GVCc7XG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX0lOVkFMSURfU0VTU0lPTl9UT0tFTiA9ICdTRUMuMDI1Jztcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OID0gJ1NFUy4wMDQnO1xuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9UT0tFTl9FWFBJUkVEID0gJ1NFQy4wMzgnO1xuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9JTlZBTElEX1VTRVJfU0VTU0lPTl9FWFBJUkVEID0gJ1NFUy4wMDMnO1xuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9OT19SRVNVTFQgPSAnQ09NLjExMSc7XG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX05PX1JPVVRFID0gJ0ZMVC4wMTAnO1xufVxuXG5jbGFzcyBFcnJvckhhbmRsZXJTZXJ2aWNlIHtcblxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ05ldFNlcnZpY2UnLCAnQ29yZG92YVNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZSddO1xuXG5cdGNvbnN0cnVjdG9yKFxuXHRcdHByaXZhdGUgbmV0U2VydmljZTogTmV0U2VydmljZSwgcHJpdmF0ZSBjb3Jkb3ZhU2VydmljZTogQ29yZG92YVNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcblx0XHRwcml2YXRlICRyb290U2NvcGU6IG5nLklTY29wZSkge1xuXHR9XG5cblx0dmFsaWRhdGVSZXNwb25zZShyZXNwb25zZTogYW55KSB7XG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xuXHRcdGlmICh0aGlzLmhhc0Vycm9ycyhlcnJvcnMpIHx8IGVycm9yaGFuZGxlci5TVEFUVVNfRkFJTCA9PSByZXNwb25zZS5zdGF0dXMpIHtcblx0XHRcdGlmICghdGhpcy5oYXNJbnZhbGlkU2Vzc2lvbkVycm9yKGVycm9ycykgJiYgIXRoaXMuaGFzTm9SZXN1bHRFcnJvcihlcnJvcnMpKSB7XG5cdFx0XHRcdC8vIGJyb2FkY2FzdCB0byBhcHBjb250cm9sbGVyIHNlcnZlciBlcnJvclxuXHRcdFx0XHR0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnc2VydmVyRXJyb3InLCByZXNwb25zZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aXNOb1Jlc3VsdEZvdW5kKHJlc3BvbnNlOiBhbnkpOiBib29sZWFuIHtcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XG5cdFx0cmV0dXJuIHRoaXMuaGFzTm9SZXN1bHRFcnJvcihlcnJvcnMpO1xuXHR9XG5cblx0aXNTZXNzaW9uSW52YWxpZChyZXNwb25zZTogYW55KTogYm9vbGVhbiB7XG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xuXHRcdHJldHVybiB0aGlzLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IoZXJyb3JzKTtcblx0fVxuXG5cdGhhc0hhcmRFcnJvcnMocmVzcG9uc2U6IGFueSk6IGJvb2xlYW4ge1xuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcblx0XHRyZXR1cm4gdGhpcy5oYXNIYXJkRXJyb3IoZXJyb3JzKTtcblx0fVxuXG5cdGhhc1NvZnRFcnJvcnMocmVzcG9uc2U6IGFueSk6IGJvb2xlYW4ge1xuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcblx0XHRyZXR1cm4gdGhpcy5oYXNTb2Z0RXJyb3IoZXJyb3JzKTtcblx0fVxuXG5cdHByaXZhdGUgaGFzRXJyb3JzKGVycm9yczogYW55KTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIGVycm9ycy5sZW5ndGggPiAwO1xuXHR9XG5cblx0cHJpdmF0ZSBoYXNJbnZhbGlkU2Vzc2lvbkVycm9yKGVycm9yczogYW55KTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XG5cdFx0XHRyZXR1cm4gZXJyb3IgJiYgZXJyb3JoYW5kbGVyLlNFVkVSSVRZX0VSUk9SX0hBUkQgPT0gZXJyb3Iuc2V2ZXJpdHkgJiZcblx0XHRcdChlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT05fVE9LRU4gPT0gZXJyb3IuY29kZSB8fFxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT04gPT0gZXJyb3IuY29kZSB8fFxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1VTRVJfU0VTU0lPTl9FWFBJUkVEID09IGVycm9yLmNvZGUgfHxcblx0XHRcdFx0ZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfVE9LRU5fRVhQSVJFRCA9PSBlcnJvci5jb2RlKTtcblx0XHR9KTtcblx0fVxuXG5cdHByaXZhdGUgaGFzTm9SZXN1bHRFcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiBfLnNvbWUoZXJyb3JzLCAoZXJyb3I6IGFueSkgPT4ge1xuXHRcdFx0cmV0dXJuIGVycm9yICYmIGVycm9yaGFuZGxlci5TRVZFUklUWV9FUlJPUl9IQVJEID09IGVycm9yLnNldmVyaXR5ICYmXG5cdFx0XHQoZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfTk9fUkVTVUxUID09IGVycm9yLmNvZGUgfHxcblx0XHRcdFx0ZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfTk9fUk9VVEUgPT0gZXJyb3IuY29kZSk7XG5cdFx0fSkgJiYgZXJyb3JzLmxlbmd0aCA9PSAxO1xuXHR9XG5cblx0cHJpdmF0ZSBoYXNIYXJkRXJyb3IoZXJyb3JzOiBhbnkpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gXy5zb21lKGVycm9ycywgKGVycm9yOiBhbnkpID0+IHtcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfSEFSRCA9PSBlcnJvci5zZXZlcml0eTtcblx0XHR9KTtcblx0fVxuXG5cdHByaXZhdGUgaGFzU29mdEVycm9yKGVycm9yczogYW55KTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XG5cdFx0XHRyZXR1cm4gZXJyb3IgJiYgZXJyb3JoYW5kbGVyLlNFVkVSSVRZX0VSUk9SX1NPRlQgPT0gZXJyb3Iuc2V2ZXJpdHk7XG5cdFx0fSk7XG5cdH1cbn0iLG51bGwsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOZXRTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJDb3Jkb3ZhU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiRXJyb3JIYW5kbGVyU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiSVNlc3Npb25IdHRwUHJvbWlzZS50c1wiIC8+XG5cbm1vZHVsZSBzZXNzaW9uc2VydmljZSB7XG5cdGV4cG9ydCBjb25zdCBIRUFERVJfUkVGUkVTSF9UT0tFTl9LRVk6IHN0cmluZyA9ICd4LXJlZnJlc2gtdG9rZW4nO1xuXHRleHBvcnQgY29uc3QgSEVBREVSX0FDQ0VTU19UT0tFTl9LRVk6IHN0cmluZyA9ICd4LWFjY2Vzcy10b2tlbic7XG5cdGV4cG9ydCBjb25zdCBSRUZSRVNIX1NFU1NJT05fSURfVVJMOiBzdHJpbmcgPSAnL3VzZXIvZ2V0QWNjZXNzVG9rZW4nO1xufVxuXG5jbGFzcyBTZXNzaW9uU2VydmljZSB7XG5cblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydOZXRTZXJ2aWNlJywgJ0Vycm9ySGFuZGxlclNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZScsICckaHR0cCddO1xuXG5cdHByaXZhdGUgYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXM6IElBY2Nlc3NUb2tlblJlZnJlc2hlZEhhbmRsZXJbXTtcblx0cHJpdmF0ZSBzZXNzaW9uSWQ6IHN0cmluZztcblx0cHJpdmF0ZSBjcmVkZW50aWFsSWQ6IHN0cmluZztcblx0cHJpdmF0ZSBpc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzOiBib29sZWFuID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IoXG5cdFx0cHJpdmF0ZSBuZXRTZXJ2aWNlOiBOZXRTZXJ2aWNlLCBwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcblx0XHRwcml2YXRlICRyb290U2NvcGU6IG5nLklTY29wZSwgcHJpdmF0ZSAkaHR0cDogbmcuSUh0dHBTZXJ2aWNlKSB7XG5cdFx0dGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcyA9IFtdO1xuXHRcdHRoaXMuc2Vzc2lvbklkID0gbnVsbDtcblx0XHR0aGlzLmNyZWRlbnRpYWxJZCA9IG51bGw7XG5cdH1cblxuXHRyZXNvbHZlUHJvbWlzZShwcm9taXNlOiBJU2Vzc2lvbkh0dHBQcm9taXNlKSB7XG5cdFx0cHJvbWlzZS5yZXNwb25zZS50aGVuKChyZXNwb25zZSkgPT4ge1xuXHRcdFx0aWYgKCF0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaGFzSGFyZEVycm9ycyhyZXNwb25zZSkgfHwgdGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmlzU2Vzc2lvbkludmFsaWQocmVzcG9uc2UpKSB7XG5cdFx0XHRcdGlmICghdGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmlzU2Vzc2lvbkludmFsaWQocmVzcG9uc2UpKSB7XG5cdFx0XHRcdFx0cHJvbWlzZS5kZWZmZXJlZC5yZXNvbHZlKHByb21pc2UucmVzcG9uc2UpO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdzZXNzaW9uIGlzIHZhbGlkJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5hZGRBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKHByb21pc2UpO1xuXHRcdFx0XHRcdGlmICghdGhpcy5pc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVmcmVzaGluZyBzZXNzaW9uIHRva2VuJyk7XG5cdFx0XHRcdFx0XHR0aGlzLnJlZnJlc2hTZXNzaW9uSWQoKS50aGVuKFxuXHRcdFx0XHRcdFx0XHQodG9rZW5SZXNwb25zZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGlmICh0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaGFzSGFyZEVycm9ycyh0b2tlblJlc3BvbnNlKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRTZXNzaW9uSWQobnVsbCk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciByZXNwb25zZUhlYWRlciA9IHRva2VuUmVzcG9uc2UuaGVhZGVycygpO1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIGFjY2Vzc1Rva2VuOiBzdHJpbmcgPSByZXNwb25zZUhlYWRlcltzZXNzaW9uc2VydmljZS5IRUFERVJfQUNDRVNTX1RPS0VOX0tFWV07XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnNldFNlc3Npb25JZChhY2Nlc3NUb2tlbik7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdGlmICghdGhpcy5nZXRTZXNzaW9uSWQoKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5hY2Nlc3NUb2tlbk5vdFJlZnJlc2hlZCgpO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHQoZXJyb3IpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZXJyb3Igb24gYWNjZXNzIHRva2VuIHJlZnJlc2gnKTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnNldFNlc3Npb25JZChudWxsKTtcblx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5nZXRDcmVkZW50aWFsSWQoKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5hY2Nlc3NUb2tlbk5vdFJlZnJlc2hlZCgpO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRwcm9taXNlLmRlZmZlcmVkLnJlamVjdCgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR0aGlzLmlzUmVmcmVzaFNlc3Npb25JZEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwcm9taXNlLmRlZmZlcmVkLnJlamVjdCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0YWRkQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lcjogSUFjY2Vzc1Rva2VuUmVmcmVzaGVkSGFuZGxlcikge1xuXHRcdHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMucHVzaChsaXN0ZW5lcik7XG5cdH1cblxuXHRyZW1vdmVBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKGxpc3RlbmVyVG9SZW1vdmU6IElBY2Nlc3NUb2tlblJlZnJlc2hlZEhhbmRsZXIpIHtcblx0XHRfLnJlbW92ZSh0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLCAobGlzdGVuZXIpID0+IHtcblx0XHRcdHJldHVybiBsaXN0ZW5lciA9PSBsaXN0ZW5lclRvUmVtb3ZlO1xuXHRcdH0pO1xuXHR9XG5cblx0c2V0Q3JlZGVudGlhbElkKGNyZWRJZDogc3RyaW5nKSB7XG5cdFx0dGhpcy5jcmVkZW50aWFsSWQgPSBjcmVkSWQ7XG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vbltzZXNzaW9uc2VydmljZS5IRUFERVJfUkVGUkVTSF9UT0tFTl9LRVldID0gY3JlZElkO1xuXHR9XG5cblx0c2V0U2Vzc2lvbklkKHNlc3Npb25JZDogc3RyaW5nKSB7XG5cdFx0dGhpcy5zZXNzaW9uSWQgPSBzZXNzaW9uSWQ7XG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vbltzZXNzaW9uc2VydmljZS5IRUFERVJfQUNDRVNTX1RPS0VOX0tFWV0gPSBzZXNzaW9uSWQ7XG5cdH1cblxuXHRnZXRTZXNzaW9uSWQoKTogc3RyaW5nIHtcblx0XHRyZXR1cm4gdGhpcy5zZXNzaW9uSWQgPyB0aGlzLnNlc3Npb25JZCA6IG51bGw7XG5cdH1cblxuXHRnZXRDcmVkZW50aWFsSWQoKTogc3RyaW5nIHtcblx0XHRyZXR1cm4gdGhpcy5jcmVkZW50aWFsSWQgPyB0aGlzLmNyZWRlbnRpYWxJZCA6IG51bGw7XG5cdH1cblxuXHRjbGVhckxpc3RlbmVycygpIHtcblx0XHR0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzID0gW107XG5cdH1cblxuXHRwcml2YXRlIHJlZnJlc2hTZXNzaW9uSWQoKTogbmcuSUh0dHBQcm9taXNlPGFueT4ge1xuXHRcdHRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcyA9IHRydWU7XG5cdFx0dmFyIGFjY2Vzc1Rva2VuUmVxdWVzdDogYW55ID0ge1xuXHRcdFx0cmVmcmVzaFRva2VuOiB0aGlzLmNyZWRlbnRpYWxJZFxuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5uZXRTZXJ2aWNlLnBvc3REYXRhKHNlc3Npb25zZXJ2aWNlLlJFRlJFU0hfU0VTU0lPTl9JRF9VUkwsIGFjY2Vzc1Rva2VuUmVxdWVzdCk7XG5cdH1cblxuXHRwcml2YXRlIGFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkKCkge1xuXHRcdF8uZm9yRWFjaCh0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLCAobGlzdGVuZXIpID0+IHtcblx0XHRcdGlmIChsaXN0ZW5lci5vblRva2VuRmFpbGVkKSB7XG5cdFx0XHRcdGxpc3RlbmVyLm9uVG9rZW5GYWlsZWQobGlzdGVuZXIpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5yZW1vdmVBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKGxpc3RlbmVyKTtcblx0XHR9KTtcblx0fVxuXG5cdHByaXZhdGUgYWNjZXNzVG9rZW5SZWZyZXNoZWQoKSB7XG5cdFx0Xy5mb3JFYWNoKHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMsIChsaXN0ZW5lcikgPT4ge1xuXHRcdFx0aWYgKGxpc3RlbmVyKSB7XG5cdFx0XHRcdGlmIChsaXN0ZW5lci5vblRva2VuUmVmcmVzaGVkKSB7XG5cdFx0XHRcdFx0bGlzdGVuZXIub25Ub2tlblJlZnJlc2hlZChsaXN0ZW5lcik7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkobGlzdGVuZXIpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0xlbmd0aCA9ICcsIHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMubGVuZ3RoKTtcblx0XHRcdH1cblx0XHRcdHRoaXMucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lcik7XG5cdFx0fSk7XG5cdH1cbn0iLG51bGwsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOZXRTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJDb3Jkb3ZhU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiU2Vzc2lvblNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkVycm9ySGFuZGxlclNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIklTZXNzaW9uSHR0cFByb21pc2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkdlbmVyaWNSZXNwb25zZS50c1wiIC8+XG5cbm1vZHVsZSBkYXRhcHJvdmlkZXIge1xuXHRleHBvcnQgY29uc3QgU0VSVklDRV9VUkxfTE9HT1VUID0gJy91c2VyL2xvZ291dCc7XG59XG5cbmNsYXNzIERhdGFQcm92aWRlclNlcnZpY2Uge1xuXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnTmV0U2VydmljZScsICdDb3Jkb3ZhU2VydmljZScsICckcScsICckcm9vdFNjb3BlJywgJ0Vycm9ySGFuZGxlclNlcnZpY2UnLCAnU2Vzc2lvblNlcnZpY2UnLCAnT1dORVJfQ0FSUklFUl9DT0RFJ107XG5cblx0cHJpdmF0ZSBpc0Nvbm5lY3RlZFRvTmV0d29yazogYm9vbGVhbiA9IHRydWU7XG5cdHByaXZhdGUgbmF2aWdhdG9yOiBOYXZpZ2F0b3I7XG5cblx0Y29uc3RydWN0b3IoXG5cdFx0cHJpdmF0ZSBuZXRTZXJ2aWNlOiBOZXRTZXJ2aWNlLCBwcml2YXRlIGNvcmRvdmFTZXJ2aWNlOiBDb3Jkb3ZhU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLFxuXHRcdHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVNjb3BlLCBwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UsXG5cdFx0cHJpdmF0ZSBzZXNzaW9uU2VydmljZTogU2Vzc2lvblNlcnZpY2UsIHByaXZhdGUgT1dORVJfQ0FSUklFUl9DT0RFOiBzdHJpbmcpIHtcblxuXHRcdHRoaXMuY29yZG92YVNlcnZpY2UuZXhlYygoKSA9PiB7XG5cdFx0XHRpZiAod2luZG93LmNvcmRvdmEgJiYgd2luZG93LmRvY3VtZW50KSB7IC8vIG9uIGRldmljZVxuXHRcdFx0XHRuYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xuXHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrID0gbmF2aWdhdG9yLm9uTGluZTtcblx0XHRcdFx0d2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG5cdFx0XHRcdFx0J29ubGluZScsXG5cdFx0XHRcdFx0KCkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3VzZXIgb25saW5lJyk7XG5cdFx0XHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrID0gdHJ1ZTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGZhbHNlKTtcblx0XHRcdFx0d2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG5cdFx0XHRcdFx0J29mZmxpbmUnLFxuXHRcdFx0XHRcdCgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCd1c2VyIG9mZmxpbmUnKTtcblx0XHRcdFx0XHRcdHRoaXMuaXNDb25uZWN0ZWRUb05ldHdvcmsgPSBmYWxzZTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGZhbHNlKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGdldERhdGEocmVxOiBzdHJpbmcpOiBuZy5JUHJvbWlzZTxhbnk+IHtcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblxuXHRcdGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcblx0XHRcdGRlZi5yZXNvbHZlKHRoaXMubmV0U2VydmljZS5nZXREYXRhKHJlcSkpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XG5cdFx0XHQvLyB0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnbm9OZXR3b3JrJyk7XG5cdFx0XHRkZWYucmVqZWN0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0cG9zdERhdGEocmVxOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyk6IG5nLklQcm9taXNlPGFueT4ge1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXG5cdFx0dmFyIHJlc3BvbnNlOiBuZy5JUHJvbWlzZTxhbnk+ID0gdGhpcy5uZXRTZXJ2aWNlLnBvc3REYXRhKHJlcSwgZGF0YSwgY29uZmlnKTtcblxuXHRcdGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcblx0XHRcdHJlc3BvbnNlLnRoZW4oXG5cdFx0XHQoaHR0cFJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdGRlZi5yZXNvbHZlKGh0dHBSZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdTZXJ2ZXIgdW5hdmFpbGFibGUnKTtcblx0XHRcdFx0Ly8gYnJvYWRjYXN0IHNlcnZlciBpcyB1bmF2YWlsYWJsZVxuXHRcdFx0XHR0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnc2VydmVyTm90QXZhaWxhYmxlJyk7XG5cdFx0XHRcdGRlZi5yZWplY3QoKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRkZWYucmVqZWN0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0ZGVsZXRlRGF0YShyZXE6IHN0cmluZyk6IG5nLklQcm9taXNlPGFueT4ge1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXG5cdFx0aWYgKHRoaXMuaGFzTmV0d29ya0Nvbm5lY3Rpb24oKSkge1xuXHRcdFx0ZGVmLnJlc29sdmUodGhpcy5uZXRTZXJ2aWNlLmRlbGV0ZURhdGEocmVxKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnNvbGUubG9nKCdTZXJ2ZXIgdW5hdmFpbGFibGUnKTtcblx0XHRcdGRlZi5yZWplY3QoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRoYXNOZXR3b3JrQ29ubmVjdGlvbigpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gKG5hdmlnYXRvci5vbkxpbmUgfHwgdGhpcy5pc0Nvbm5lY3RlZFRvTmV0d29yayk7XG5cdH1cblxuXG5cdC8vIFRPRE86IHJlbW92ZSB0aGlzIHRlbXAgbWV0aG9kIGFuZCB1c2UgZ2VuZXJpY3Ncblx0YWRkTWV0YUluZm8ocmVxdWVzdERhdGE6IGFueSk6IGFueSB7XG5cdFx0dmFyIGRldmljZTogSW9uaWMuSURldmljZSA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpXG5cdFx0dmFyIG1vZGVsOiBzdHJpbmcgPSAnJztcblx0XHR2YXIgb3NUeXBlOiBzdHJpbmcgPSAnJztcblx0XHR2YXIgb3NWZXJzaW9uOiBzdHJpbmcgPSAnJztcblx0XHR2YXIgZGV2aWNlVG9rZW46IHN0cmluZyA9ICcnO1xuXHRcdGlmIChkZXZpY2UpIHtcblx0XHRcdG1vZGVsID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkubW9kZWw7XG5cdFx0XHRvc1R5cGUgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5wbGF0Zm9ybTtcblx0XHRcdG9zVmVyc2lvbiA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLnZlcnNpb247XG5cdFx0fVxuXHRcdHZhciBtZXRhSW5mbyA9IHtcblx0XHRcdCdjaGFubmVsSWRlbnRpZmllcic6ICdNT0InLFxuXHRcdFx0J2RhdGVUaW1lU3RhbXAnOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcblx0XHRcdCdvd25lckNhcnJpZXJDb2RlJzogdGhpcy5PV05FUl9DQVJSSUVSX0NPREUsXG5cdFx0XHQnYWRkaXRpb25hbEluZm8nOiB7XG5cdFx0XHRcdCdkZXZpY2VUeXBlJzogd2luZG93LmlzVGFibGV0ID8gJ1RhYmxldCcgOiAnUGhvbmUnLFxuXHRcdFx0XHQnbW9kZWwnOiBtb2RlbCxcblx0XHRcdFx0J29zVHlwZSc6IG9zVHlwZSxcblx0XHRcdFx0J29zVmVyc2lvbic6IG9zVmVyc2lvbixcblx0XHRcdFx0J2RldmljZVRva2VuJzogZGV2aWNlVG9rZW4sXG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xuXHRcdFx0J21ldGFJbmZvJzogbWV0YUluZm8sXG5cdFx0XHQncmVxdWVzdERhdGEnOiByZXF1ZXN0RGF0YVxuXHRcdH07XG5cdFx0cmV0dXJuIHJlcXVlc3RPYmo7XG5cdH1cblxuXHRwcml2YXRlIGlzTG9nb3V0U2VydmljZShyZXF1ZXN0VXJsOiBzdHJpbmcpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gZGF0YXByb3ZpZGVyLlNFUlZJQ0VfVVJMX0xPR09VVCA9PSByZXF1ZXN0VXJsO1xuXHR9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdXRpbHMvVXRpbHMudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9Mb2NhbFN0b3JhZ2VTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tbW9uL3NlcnZpY2VzL0Vycm9ySGFuZGxlclNlcnZpY2UudHNcIiAvPlxuXG5jbGFzcyBBcHBDb250cm9sbGVyIHtcblxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzdGF0ZScsICckc2NvcGUnLCAnRGF0YVByb3ZpZGVyU2VydmljZScsICdVc2VyU2VydmljZScsXG5cdFx0JyRpb25pY1BsYXRmb3JtJywgJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCAnJGlvbmljUG9wdXAnLFxuXHRcdCckaW9uaWNMb2FkaW5nJywgJyRpb25pY0hpc3RvcnknLCAnRXJyb3JIYW5kbGVyU2VydmljZSddO1xuXG5cdGNvbnN0cnVjdG9yKFxuXHRcdHByb3RlY3RlZCAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSxcblx0XHRwcm90ZWN0ZWQgJHNjb3BlOiBuZy5JU2NvcGUsXG5cdFx0cHJvdGVjdGVkIGRhdGFQcm92aWRlclNlcnZpY2U6IERhdGFQcm92aWRlclNlcnZpY2UsXG5cdFx0cHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UsXG5cdFx0cHJpdmF0ZSAkaW9uaWNQbGF0Zm9ybTogSW9uaWMuSVBsYXRmb3JtLFxuXHRcdHByaXZhdGUgbG9jYWxTdG9yYWdlU2VydmljZTogTG9jYWxTdG9yYWdlU2VydmljZSxcblx0XHRwcml2YXRlICRpb25pY1BvcHVwOiBJb25pYy5JUG9wdXAsXG5cdFx0cHJpdmF0ZSAkaW9uaWNMb2FkaW5nOiBJb25pYy5JTG9hZGluZyxcblx0XHRwcml2YXRlICRpb25pY0hpc3Rvcnk6IGFueSxcblx0XHRwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UpIHtcblx0fVxuXG5cdGlzTm90RW1wdHkodmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiBVdGlscy5pc05vdEVtcHR5KHZhbHVlKTtcblx0fVxuXG5cdHB1YmxpYyBoYXNOZXR3b3JrQ29ubmVjdGlvbigpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gdGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLmhhc05ldHdvcmtDb25uZWN0aW9uKCk7XG5cdH1cblxuXHRsb2dvdXQoKSB7XG5cdFx0dGhpcy4kaW9uaWNIaXN0b3J5LmNsZWFyQ2FjaGUoKTtcblx0XHR0aGlzLnVzZXJTZXJ2aWNlLmxvZ291dCgpO1xuXHRcdHRoaXMuJHN0YXRlLmdvKFwibG9naW5cIik7XG5cdH1cblxuXHRnZXRVc2VyRGVmYXVsdFBhZ2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMudXNlclNlcnZpY2UudXNlclByb2ZpbGUudXNlckluZm8uZGVmYXVsdFBhZ2U7XG5cdH1cblxuXHRzaG93RGFzaGJvYXJkKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiB0aGlzLnVzZXJTZXJ2aWNlLnNob3dEYXNoYm9hcmQobmFtZSk7XG5cdH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9EYXRhUHJvdmlkZXJTZXJ2aWNlLnRzXCIgLz5cblxuY2xhc3MgTWlzU2VydmljZSB7XG5cblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJyRxJ107XG5cdFxuXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlKSB7IH1cblxuXHRnZXRNZXRyaWNTbmFwc2hvdCAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL21ldHJpY3NuYXBzaG90Jztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdH0sXG5cdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0Z2V0VGFyZ2V0VnNBY3R1YWwgKHJlcWRhdGEpe1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy90YXJnZXR2c2FjdHVhbCc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldFJldmVudWVBbmFseXNpcyAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3JldmVudWVhbmFseXNpcyc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldFJvdXRlUmV2ZW51ZSAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3JvdXRlcmV2ZW51ZSc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldFNlY3RvckNhcnJpZXJBbmFseXNpcyAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3NlY3RvcmNhcnJpZXJhbmFseXNpcyc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldFBheEZsb3duTWlzSGVhZGVyIChyZXFkYXRhKTogYW55IHtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvcGF4Zmxvd25taXNoZWFkZXInO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0fSxcblx0XHQoZXJyb3IpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRnZXRSb3V0ZVJldmVudWVEcmlsbERvd24gKHJlcWRhdGEpe1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9yb3V0ZXJldmVudWVkcmlsbCc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldEJhckRyaWxsRG93biAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL21zcGF4bmV0cmV2ZHJpbGwnO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0fSxcblx0XHQoZXJyb3IpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRnZXREcmlsbERvd24gKHJlcWRhdGEsIFVSTCl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9IFVSTDtcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdH0sXG5cdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxuXG5jbGFzcyBDaGFydG9wdGlvblNlcnZpY2Uge1xuXG4gICAgcHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckcm9vdFNjb3BlJ107XG5cbiAgICBjb25zdHJ1Y3Rvcigkcm9vdFNjb3BlOiBuZy5JU2NvcGUpIHsgfVxuXG4gICAgbGluZUNoYXJ0T3B0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNoYXJ0OiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2xpbmVDaGFydCcsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAyNTAsXG4gICAgICAgICAgICAgICAgbWFyZ2luIDoge1xuICAgICAgICAgICAgICAgICAgICB0b3A6IDUsXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiA1MCxcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiA1MCxcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogNTBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpeyByZXR1cm4gZC54dmFsOyB9LFxuICAgICAgICAgICAgICAgIHk6IGZ1bmN0aW9uKGQpeyByZXR1cm4gZC55dmFsOyB9LFxuICAgICAgICAgICAgICAgIHVzZUludGVyYWN0aXZlR3VpZGVsaW5lOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRpc3BhdGNoOiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlQ2hhbmdlOiBmdW5jdGlvbihlKXsgY29uc29sZS5sb2coXCJzdGF0ZUNoYW5nZVwiKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlU3RhdGU6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcImNoYW5nZVN0YXRlXCIpOyB9LFxuICAgICAgICAgICAgICAgICAgICB0b29sdGlwU2hvdzogZnVuY3Rpb24oZSl7IGNvbnNvbGUubG9nKFwidG9vbHRpcFNob3dcIik7IH0sXG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBIaWRlOiBmdW5jdGlvbihlKXsgY29uc29sZS5sb2coXCJ0b29sdGlwSGlkZVwiKTsgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgeEF4aXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdGlja0Zvcm1hdDogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLnRpbWUuZm9ybWF0KCclYicpKG5ldyBEYXRlKGQpKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB5QXhpczoge1xuICAgICAgICAgICAgICAgICAgICBheGlzTGFiZWw6ICcnLFxuICAgICAgICAgICAgICAgICAgICB0aWNrRm9ybWF0OiBmdW5jdGlvbihkKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJy4wMmYnKShkKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsRGlzdGFuY2U6IC0xMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTsgIFxuICAgIH1cblxuICAgIG11bHRpQmFyQ2hhcnRPcHRpb25zKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY2hhcnQ6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnbXVsdGlCYXJDaGFydCcsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAyNTAsXG4gICAgICAgICAgICAgICAgd2lkdGg6IDMwMCxcbiAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XG4gICAgICAgICAgICAgICAgICAgIHRvcDogMTAsXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiAyNSxcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiAzMCxcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMjVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNob3dMZWdlbmQgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXtyZXR1cm4gZC5sYWJlbDt9LFxuICAgICAgICAgICAgICAgIHk6IGZ1bmN0aW9uKGQpe3JldHVybiBkLnZhbHVlICsgKDFlLTEwKTt9LFxuICAgICAgICAgICAgICAgIHNob3dWYWx1ZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgcmVkdWNlWFRpY2tzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93Q29udHJvbHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHZhbHVlRm9ybWF0OiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJywuNGYnKShkKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgICAgICAgICAgIGF4aXNMYWJlbERpc3RhbmNlOiAzMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93WEF4aXM6IHRydWUsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDcwMFxuICAgICAgICAgICAgfVxuICAgICAgICB9OyAgXG4gICAgfVxuXG4gICAgbWV0cmljQmFyQ2hhcnRPcHRpb25zKG1pc0N0cmwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNoYXJ0OiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2Rpc2NyZXRlQmFyQ2hhcnQnLFxuICAgICAgICAgICAgICAgIGhlaWdodDogMjAwLFxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAyMCxcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDI1LFxuICAgICAgICAgICAgICAgICAgICBib3R0b206IDAsXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDI1XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXtyZXR1cm4gZC5sYWJlbDt9LFxuICAgICAgICAgICAgICAgIHk6IGZ1bmN0aW9uKGQpe3JldHVybiBkLnZhbHVlfSxcbiAgICAgICAgICAgICAgICB1c2VJbnRlcmFjdGl2ZUd1aWRlbGluZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93VmFsdWVzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhbHVlRm9ybWF0OiBmdW5jdGlvbihkKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLC4yZicpKGQpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdG9vbHRpcDoge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaG93WUF4aXM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dYQXhpczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDcwMFxuICAgICAgICAgICAgfVxuICAgICAgICB9OyAgXG4gICAgfVxuXG4gICAgdGFyZ2V0QmFyQ2hhcnRPcHRpb25zKG1pc0N0cmwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNoYXJ0OiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2Rpc2NyZXRlQmFyQ2hhcnQnLFxuICAgICAgICAgICAgICAgIGhlaWdodDogMjUwLFxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAyMCxcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDUwLFxuICAgICAgICAgICAgICAgICAgICBib3R0b206IDIwLFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiA3NVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgeDogZnVuY3Rpb24oZCl7cmV0dXJuIGQubGFiZWw7fSxcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXtyZXR1cm4gZC52YWx1ZSArICgxZS0xMCk7fSxcbiAgICAgICAgICAgICAgICBzaG93VmFsdWVzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dZQXhpczogZmFsc2UsXG4gICAgICAgICAgICAgICAgdmFsdWVGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuZm9ybWF0KCcsLjJmJykoZCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNzAwXG4gICAgICAgICAgICB9XG4gICAgICAgIH07ICBcbiAgICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxuXG5jbGFzcyBGaWx0ZXJlZExpc3RTZXJ2aWNlIHtcblxuICAgIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFtdO1xuXG4gICAgY29uc3RydWN0b3IoKSB7IH1cblxuICAgIHNlYXJjaGVkICh2YWxMaXN0cywgdG9TZWFyY2gsIGxldmVsLCBkcmlsbHR5cGUpIHtcbiAgICAgIHJldHVybiBfLmZpbHRlcih2YWxMaXN0cywgXG4gICAgICAgIGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgLyogU2VhcmNoIFRleHQgaW4gYWxsIDMgZmllbGRzICovXG4gICAgICAgICAgcmV0dXJuIHNlYXJjaFV0aWwoaSwgdG9TZWFyY2gsIGxldmVsLCBkcmlsbHR5cGUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwYWdlZCAodmFsTGlzdHMscGFnZVNpemUpIHtcbiAgICAgIHZhciByZXRWYWwgPSBbXTtcbiAgICAgIGlmKHZhbExpc3RzKXtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWxMaXN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChpICUgcGFnZVNpemUgPT09IDApIHtcbiAgICAgICAgICAgIHJldFZhbFtNYXRoLmZsb29yKGkgLyBwYWdlU2l6ZSldID0gW3ZhbExpc3RzW2ldXTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0VmFsW01hdGguZmxvb3IoaSAvIHBhZ2VTaXplKV0ucHVzaCh2YWxMaXN0c1tpXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmV0VmFsO1xuICAgIH1cblxuICAgXG59XG5mdW5jdGlvbiBzZWFyY2hVdGlsKGl0ZW0sIHRvU2VhcmNoLCBsZXZlbCwgZHJpbGx0eXBlKSB7XG4gICAgLyogU2VhcmNoIFRleHQgaW4gYWxsIDMgZmllbGRzICovXG4gIGlmKGRyaWxsdHlwZSA9PSAncm91dGUnKSB7XG4gICAgaWYoaXRlbS5jb3VudHJ5RnJvbSAmJiBpdGVtLmNvdW50cnlUbyAmJiBsZXZlbCA9PSAwKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uY291bnRyeUZyb20udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgfHwgaXRlbS5jb3VudHJ5VG8udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5mbG93blNlY3RvciAmJiBsZXZlbCA9PSAxKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAyKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbVsnZG9jdW1lbnQjJ10gJiYgbGV2ZWwgPT0gMykge1xuICAgICAgcmV0dXJuIChpdGVtWydkb2N1bWVudCMnXS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZihkcmlsbHR5cGUgPT0gJ3RhcmdldCcpIHtcbiAgICBpZihpdGVtLnJvdXRldHlwZSAmJiBsZXZlbCA9PSAwKSB7XG4gICAgICByZXR1cm4gKGl0ZW0ucm91dGV0eXBlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfWVsc2UgaWYoaXRlbS5yb3V0ZWNvZGUgJiYgbGV2ZWwgPT0gMSkge1xuICAgICAgcmV0dXJuIChpdGVtLnJvdXRlY29kZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYoZHJpbGx0eXBlID09ICdiYXInKSB7XG4gICAgaWYoaXRlbS5yb3V0ZUNvZGUgJiYgbGV2ZWwgPT0gMCkge1xuICAgICAgcmV0dXJuIChpdGVtLnJvdXRlQ29kZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1lbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMSkge1xuICAgICAgcmV0dXJuIChpdGVtLmZsb3duU2VjdG9yLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfWVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMikge1xuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYoZHJpbGx0eXBlID09ICdmbGlnaHQtcHJvY2VzcycpIHtcbiAgICBpZihpdGVtLmNvdW50cnlGcm9tICYmIGl0ZW0uY291bnRyeVRvICYmIGxldmVsID09IDApIHtcbiAgICAgIHJldHVybiAoaXRlbS5jb3VudHJ5RnJvbS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSB8fCBpdGVtLmNvdW50cnlUby50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1lbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMSkge1xuICAgICAgcmV0dXJuIChpdGVtLmZsb3duU2VjdG9yLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfWVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMikge1xuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1lbHNlIGlmKGl0ZW1bJ2NhcnJpZXJDb2RlIyddICYmIGxldmVsID09IDMpIHtcbiAgICAgIHJldHVybiAoaXRlbVsnY2FycmllckNvZGUjJ10udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmKGRyaWxsdHlwZSA9PSAnZmxpZ2h0LWNvdW50Jykge1xuICAgIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDApIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9ZWxzZSBpZihpdGVtWydjYXJyaWVyQ29kZSddICYmIGxldmVsID09IDEpIHtcbiAgICAgIHJldHVybiAoaXRlbVsnY2FycmllckNvZGUnXS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYoZHJpbGx0eXBlID09ICdjb3Vwb24tY291bnQnKSB7XG4gICAgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMCkge1xuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1lbHNlIGlmKGl0ZW1bJ2Zsb3duU2VjdG9yJ10gJiYgbGV2ZWwgPT0gMSkge1xuICAgICAgcmV0dXJuIChpdGVtWydmbG93blNlY3RvciddLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHNcIiAvPlxuXG5jbGFzcyBPcGVyYXRpb25hbFNlcnZpY2Uge1xuXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnRGF0YVByb3ZpZGVyU2VydmljZScsICckcSddO1xuXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlKSB7IH1cblxuXHRnZXRQYXhGbG93bk9wckhlYWRlcihyZXFkYXRhKTogYW55IHtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5vcHIvcGF4Zmxvd25vcHJoZWFkZXInO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0XHR9LFxuXHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG5cdFx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldE9wckZsaWdodFByb2NTdGF0dXMocmVxZGF0YSkge1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm9wci9mbGlnaHRwcm9jZXNzaW5nc3RhdHVzJztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdFx0fSk7XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRnZXRPcHJGbGlnaHRDb3VudEJ5UmVhc29uKHJlcWRhdGEpIHtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5vcHIvZmxpZ2h0Y291bnRieXJlYXNvbic7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcblx0XHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHRcdH0sXG5cdFx0XHQoZXJyb3IpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHRcdH0pO1xuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldE9wckNvdXBvbkNvdW50QnlFeGNlcHRpb24ocmVxZGF0YSkge1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm9wci9jb3Vwb25jb3VudGJ5ZXhjZXB0aW9uJztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdFx0fSk7XG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cdFxuXHRnZXREcmlsbERvd24gKHJlcWRhdGEsIFVSTCl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9IFVSTDtcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdH0sXG5cdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9Mb2NhbFN0b3JhZ2VTZXJ2aWNlLnRzXCIgLz5cblxuY2xhc3MgVXNlclNlcnZpY2Uge1xuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ0RhdGFQcm92aWRlclNlcnZpY2UnLCAnJHEnLCAnTG9jYWxTdG9yYWdlU2VydmljZScsICckd2luZG93J107XG5cdHB1YmxpYyB1c2VyUHJvZmlsZTogYW55O1xuXHRwdWJsaWMgX3VzZXI6IGJvb2xlYW4gPSBmYWxzZTtcblx0cHJpdmF0ZSBtZW51QWNjZXNzID0gW107XG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLCBwcml2YXRlIGxvY2FsU3RvcmFnZVNlcnZpY2U6IExvY2FsU3RvcmFnZVNlcnZpY2UsIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcblxuXHR9XG5cblx0c2V0VXNlcih1c2VyKSB7XG5cdFx0aWYgKHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UpIHtcblx0XHRcdHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicsIEpTT04uc3RyaW5naWZ5KHVzZXIpKTtcblx0XHR9XG5cdH1cblxuXHRsb2dvdXQoKSB7XG5cdFx0dGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldE9iamVjdCgncmFwaWRNb2JpbGUudXNlcicsIG51bGwpO1xuXHRcdHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5zZXRPYmplY3QoJ3VzZXJQZXJtaXNzaW9uTWVudScsIFtdKTtcblx0XHR0aGlzLl91c2VyID0gZmFsc2U7XG5cdH1cblxuXHRpc0xvZ2dlZEluKCkge1xuXHRcdHJldHVybiB0aGlzLl91c2VyID8gdHJ1ZSA6IGZhbHNlO1xuXHR9XG5cblx0aXNVc2VyTG9nZ2VkSW4oKTogYm9vbGVhbiB7XG5cdFx0aWYgKHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5nZXRPYmplY3QoJ3JhcGlkTW9iaWxlLnVzZXInLCAnJykgIT0gbnVsbCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRnZXRVc2VyKCkge1xuXHRcdHJldHVybiB0aGlzLl91c2VyO1xuXHR9XG5cblx0bG9naW4oX3VzZXJOYW1lOiBzdHJpbmcsIF9wYXNzd29yZDogc3RyaW5nKSB7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvdXNlci9sb2dpbic7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dmFyIHJlcXVlc3RPYmogPSB7XG5cdFx0XHR1c2VySWQ6IF91c2VyTmFtZSxcblx0XHRcdHBhc3N3b3JkOiBfcGFzc3dvcmRcblx0XHR9XG5cdFx0dGhpcy5zZXRVc2VyKHsgdXNlcm5hbWU6IFwiXCIgfSk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcXVlc3RPYmopLnRoZW4oXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdFx0aWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdHRoaXMuX3VzZXIgPSB0cnVlO1xuXHRcdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGRlZi5yZWplY3QocmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQoZXJyb3IpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQgb24gbG9nIGluJyk7XG5cdFx0XHRcdGRlZi5yZWplY3QoZXJyb3IpO1xuXHRcdFx0fSk7XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRnZXRVc2VyUHJvZmlsZShyZXFkYXRhKSB7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvdXNlci91c2VycHJvZmlsZSc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdFx0aWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdHRoaXMudXNlclByb2ZpbGUgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmRhdGE7XG5cdFx0XHRcdFx0dGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldE9iamVjdCgndXNlclBlcm1pc3Npb25NZW51JywgdGhpcy51c2VyUHJvZmlsZS5tZW51QWNjZXNzKTtcblx0XHRcdFx0XHRkZWYucmVzb2x2ZShyZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRkZWYucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkIG9uIFVzZXJQcm9maWxlJyk7XG5cdFx0XHRcdGRlZi5yZWplY3QoZXJyb3IpO1xuXHRcdFx0fSk7XG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0c2hvd0Rhc2hib2FyZChuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcblx0XHRpZiAodGhpcy5pc1VzZXJMb2dnZWRJbigpKSB7XG5cdFx0XHRpZiAodHlwZW9mIHRoaXMudXNlclByb2ZpbGUgPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0dmFyIGRhdGEgPSB0aGlzLmxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0T2JqZWN0KCd1c2VyUGVybWlzc2lvbk1lbnUnLCAnJyk7XG5cdFx0XHRcdHRoaXMubWVudUFjY2VzcyA9IGRhdGE7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLm1lbnVBY2Nlc3MgPSB0aGlzLnVzZXJQcm9maWxlLm1lbnVBY2Nlc3M7XG5cdFx0XHR9XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubWVudUFjY2Vzcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAodGhpcy5tZW51QWNjZXNzW2ldLm1lbnVOYW1lID09IG5hbWUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5tZW51QWNjZXNzW2ldLm1lbnVBY2Nlc3M7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuaXNVc2VyTG9nZ2VkSW4oKTtcblx0XHR9XG5cdH1cblxuXHRjaGVja01lbnVBY2Nlc3MobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG5cdFx0dmFyIGRhdGEgPSB0aGlzLmxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0T2JqZWN0KCd1c2VyUGVybWlzc2lvbk1lbnUnLCAnJyk7XG5cdFx0dGhpcy5tZW51QWNjZXNzID0gZGF0YTtcblx0XHRpZiAodGhpcy5tZW51QWNjZXNzKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubWVudUFjY2Vzcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAodGhpcy5tZW51QWNjZXNzW2ldLm1lbnVOYW1lID09IG5hbWUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5tZW51QWNjZXNzW2ldLm1lbnVBY2Nlc3M7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvTWlzU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL3VzZXIvc2VydmljZXMvVXNlclNlcnZpY2UudHNcIiAvPlxuXG5cblxuaW50ZXJmYWNlIHRhYk9iamVjdCB7XG4gICAgdGl0bGU6IHN0cmluZyxcbiAgICBuYW1lczogc3RyaW5nLFxuICAgIGljb246IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgdG9nZ2xlT2JqZWN0IHtcbiAgICBtb250aE9yWWVhcjogc3RyaW5nLFxuICAgIHRhcmdldFJldk9yUGF4OiBzdHJpbmcsXG4gICAgc2VjdG9yT3JkZXI6IHN0cmluZyxcbiAgICBzZWN0b3JSZXZPclBheDogc3RyaW5nLFxuICAgIGNoYXJ0T3JUYWJsZTogc3RyaW5nLFxuICAgIHRhcmdldFZpZXc6IHN0cmluZyxcbiAgICByZXZlbnVlVmlldzogc3RyaW5nLFxuICAgIHNlY3RvclZpZXc6IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgaGVhZGVyT2JqZWN0IHtcbiAgICBmbG93bk1vbnRoOiBzdHJpbmcsXG4gICAgc3VyY2hhcmdlOiBib29sZWFuLFxuICAgIHRhYkluZGV4OiBudW1iZXIsXG4gICAgaGVhZGVySW5kZXg6IG51bWJlcixcbiAgICB1c2VybmFtZTogc3RyaW5nXG59XG5cbmNsYXNzIE1pc0NvbnRyb2xsZXJ7XG5cbiAgICBwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzdGF0ZScsICckc2NvcGUnLCAnJGlvbmljTG9hZGluZycsICckdGltZW91dCcsICckd2luZG93JywgJyRpb25pY1BvcG92ZXInLFxuICAgICAgICAnJGZpbHRlcicsICdNaXNTZXJ2aWNlJywgJ0NoYXJ0b3B0aW9uU2VydmljZScsICdGaWx0ZXJlZExpc3RTZXJ2aWNlJywgJ1VzZXJTZXJ2aWNlJywgJyRpb25pY0hpc3RvcnknLCAnUmVwb3J0U3ZjJywgJyRpb25pY1BvcHVwJ107XG5cbiAgICBwcml2YXRlIHRhYnM6IFt0YWJPYmplY3RdO1xuICAgIHByaXZhdGUgdG9nZ2xlOiB0b2dnbGVPYmplY3Q7XG4gICAgcHJpdmF0ZSBoZWFkZXI6IGhlYWRlck9iamVjdDtcbiAgICBwcml2YXRlIHN1YkhlYWRlcjogYW55O1xuICAgIHByaXZhdGUgb3B0aW9uczogYW55O1xuICAgIHByaXZhdGUgZHJpbGx0YWJzOiBzdHJpbmdbXTtcbiAgICBcbiAgICBwcml2YXRlIHBhZ2VTaXplID0gNDtcbiAgICBwcml2YXRlIGN1cnJlbnRQYWdlID0gW107XG4gICAgcHJpdmF0ZSBzZWxlY3RlZERyaWxsID0gW107XG4gICAgcHJpdmF0ZSBncm91cHMgPSBbXTtcblxuICAgIHByaXZhdGUgaW5mb3BvcG92ZXI6IElvbmljLklQb3BvdmVyO1xuICAgIHByaXZhdGUgZHJpbGxwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcbiAgICBwcml2YXRlIGdyYXBocG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XG4gICAgcHJpdmF0ZSBkcmlsbEJhcnBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xuXG4gICAgcHJpdmF0ZSBpbmZvZGF0YTogc3RyaW5nO1xuICAgIHByaXZhdGUgcmVnaW9uTmFtZTogc3RyaW5nO1xuICAgIHByaXZhdGUgY2hhcnRUeXBlOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBncmFwaEluZGV4OiBudW1iZXI7XG4gICAgcHJpdmF0ZSBjb2x1bW5Ub09yZGVyOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBzaG93bkdyb3VwOiBudW1iZXI7XG5cbiAgICBwcml2YXRlIG1ldHJpY1Jlc3VsdDogYW55O1xuICAgIHByaXZhdGUgbWV0cmljTGVnZW5kczogYW55O1xuICAgIHByaXZhdGUgZmF2TWV0cmljUmVzdWx0OiBhbnk7XG5cbiAgICBwcml2YXRlIHRhcmdldEFjdHVhbERhdGE6IGFueTtcbiAgICBwcml2YXRlIGZhdlRhcmdldEJhclJlc3VsdDogYW55O1xuICAgIHByaXZhdGUgZmF2VGFyZ2V0TGluZVJlc3VsdDogYW55O1xuXG4gICAgcHJpdmF0ZSByb3V0ZVJldkRhdGE6IGFueTtcblxuICAgIHByaXZhdGUgcmV2ZW51ZURhdGE6IGFueTtcbiAgICBwcml2YXRlIFNlY3RvckNhcnJpZXJBbmFseXNpc0NoYXJ0czogYW55O1xuICAgIHByaXZhdGUgcG9wb3ZlcnNob3duOiBib29sZWFuO1xuICAgIHByaXZhdGUgZHJpbGxUeXBlOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBkcmlsbEJhckxhYmVsOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBkcmlsbE5hbWU6IHN0cmluZztcblxuICAgIHByaXZhdGUgdGhhdDogYW55O1xuXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSwgcHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSxcbiAgICAgICAgcHJpdmF0ZSAkaW9uaWNMb2FkaW5nOiBJb25pYy5JTG9hZGluZywgcHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLFxuICAgICAgICBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLCBwcml2YXRlICRpb25pY1BvcG92ZXI6IElvbmljLklQb3BvdmVyLFxuICAgICAgICBwcml2YXRlICRmaWx0ZXI6IG5nLklGaWx0ZXJTZXJ2aWNlLCBwcml2YXRlIG1pc1NlcnZpY2U6IE1pc1NlcnZpY2UsXG4gICAgICAgIHByaXZhdGUgY2hhcnRvcHRpb25TZXJ2aWNlOiBDaGFydG9wdGlvblNlcnZpY2UsIHByaXZhdGUgZmlsdGVyZWRMaXN0U2VydmljZTogRmlsdGVyZWRMaXN0U2VydmljZSxcbiAgICAgICAgcHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UsIHByaXZhdGUgJGlvbmljSGlzdG9yeTogYW55LCBwcml2YXRlIHJlcG9ydFN2YzogUmVwb3J0U3ZjLCBwcml2YXRlICRpb25pY1BvcHVwOiBJb25pYy5JUG9wdXApIHtcblxuICAgICAgIGlmICghdGhpcy51c2VyU2VydmljZS5jaGVja01lbnVBY2Nlc3MoJ01JUycpKSB7XG4gICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgc2VsZi4kaW9uaWNQb3B1cC5hbGVydCh7XG4gICAgICAgICAgICAgICAgdGl0bGU6ICdFcnJvcicsXG4gICAgICAgICAgICAgICAgY29udGVudDogJ1lvdSBkb250IGhhdmUgYWNjZXMgdG8gdGhpcyBQYWdlISEhJ1xuICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2RvbmUnKTtcbiAgICAgICAgICAgICAgICAgIHNlbGYuJHN0YXRlLmdvKCdhcHAubWlzLWZsb3duJyk7XG4gICAgICAgICAgICAgICAgICAvLyBzZWxmLiRpb25pY0hpc3RvcnkuY3VycmVudFZpZXcoc2VsZi4kaW9uaWNIaXN0b3J5LmJhY2tWaWV3KCkpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudGhhdCA9IHRoaXM7XG5cbiAgICAgICAgICAgIHRoaXMudGFicyA9IFtcbiAgICAgICAgICAgIHsgdGl0bGU6ICdNeSBEYXNoYm9hcmQnLCBuYW1lczogJ015RGFzaGJvYXJkJywgaWNvbiA6ICdpY29ub24taG9tZScgfSxcbiAgICAgICAgICAgIHsgdGl0bGU6ICdNZXRyaWMgU25hcHNob3QnLCBuYW1lczogJ01ldHJpY1NuYXBzaG90JywgaWNvbiA6ICdpb24taG9tZScgfSxcbiAgICAgICAgICAgIHsgdGl0bGU6ICdUYXJnZXQgVnMgQWN0dWFsJywgbmFtZXM6ICdUYXJnZXRWc0FjdHVhbCcsIGljb24gOiAnaW9uLWhvbWUnIH0sXG4gICAgICAgICAgICB7IHRpdGxlOiAnUmV2ZW51ZSBBbmFseXNpcycsIG5hbWVzOiAnUmV2ZW51ZUFuYWx5c2lzJywgaWNvbiA6ICdpb24taG9tZSd9LFxuICAgICAgICAgICAgeyB0aXRsZTogJ1NlY3RvciAmIENhcnJpZXIgQW5hbHlzaXMnLCBuYW1lczogJ1NlY3RvckFuZENhcnJpZXJBbmFseXNpcycsIGljb24gOiAnaW9uLWhvbWUnIH0sXG4gICAgICAgICAgICB7IHRpdGxlOiAnUm91dGUgUmV2ZW51ZScsIG5hbWVzOiAnUm91dGVSZXZlbnVlJywgaWNvbiA6ICdpb24taG9tZScgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgdGhpcy50b2dnbGUgPSB7XG4gICAgICAgICAgICAgICAgbW9udGhPclllYXIgOiAnbW9udGgnLFxuICAgICAgICAgICAgICAgIHRhcmdldFJldk9yUGF4OiAncmV2ZW51ZScsXG4gICAgICAgICAgICAgICAgc2VjdG9yT3JkZXI6ICd0b3A1JyxcbiAgICAgICAgICAgICAgICBzZWN0b3JSZXZPclBheDogJ3JldmVudWUnLFxuICAgICAgICAgICAgICAgIGNoYXJ0T3JUYWJsZTogJ2NoYXJ0JyxcbiAgICAgICAgICAgICAgICB0YXJnZXRWaWV3OiAnY2hhcnQnLFxuICAgICAgICAgICAgICAgIHJldmVudWVWaWV3OiAnY2hhcnQnLFxuICAgICAgICAgICAgICAgIHNlY3RvclZpZXc6ICdjaGFydCdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaGVhZGVyID0ge1xuICAgICAgICAgICAgICAgIGZsb3duTW9udGg6ICcnLFxuICAgICAgICAgICAgICAgIHN1cmNoYXJnZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgdGFiSW5kZXg6IDAsXG4gICAgICAgICAgICAgICAgaGVhZGVySW5kZXg6IDAsXG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6ICcnXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHdpbmRvdykuYmluZCgnb3JpZW50YXRpb25jaGFuZ2UnLCBmdW5jdGlvbiAoZSwgc2NvcGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXh9KTtcbiAgICAgICAgICAgIH0pOyAqL1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHdpbmRvdykuYmluZCgnb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLm9yaWVudGF0aW9uQ2hhbmdlKTsgXG4gICAgICAgIFxuICAgICAgICAgICAgLy90aGlzLiRzY29wZS4kd2F0Y2goJ01pc0N0cmwuaGVhZGVyLnN1cmNoYXJnZScsICgpID0+IHsgdGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6dGhpcy5oZWFkZXIudGFiSW5kZXh9KTsgfSwgdHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLmluaXREYXRhKCk7XG5cbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRvbignb25TbGlkZU1vdmUnLCAoZXZlbnQ6IGFueSwgcmVzcG9uc2U6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLk1pc0N0cmwub25TbGlkZU1vdmUocmVzcG9uc2UpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIC8vIHRoaXMuJHNjb3BlLiRvbignJGlvbmljVmlldy5lbnRlcicsICgpID0+IHtcbiAgICAgICAgICAgIC8vICAgICBpZiAoIXNlbGYudXNlclNlcnZpY2Uuc2hvd0Rhc2hib2FyZCgnTUlTJykpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgc2VsZi4kc3RhdGUuZ28oXCJsb2dpblwiKTtcbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyB9KTtcblxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCdvcGVuRHJpbGxQb3B1cCcsIChldmVudDogYW55LCByZXNwb25zZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ21ldHJpYycpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuTWlzQ3RybC5vcGVuQmFyRHJpbGxEb3duUG9wb3ZlcihyZXNwb25zZS5ldmVudCwgeyBcInBvaW50XCI6IHJlc3BvbnNlLmRhdGEgfSwgLTEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAndGFyZ2V0Jykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9wZW5UYXJnZXREcmlsbERvd25Qb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpbml0RGF0YSgpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9pbmZvdG9vbHRpcC5odG1sJywge1xuICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oaW5mb3BvcG92ZXIpIHtcbiAgICAgICAgICAgIHRoYXQuaW5mb3BvcG92ZXIgPSBpbmZvcG9wb3ZlcjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvZHJpbGRvd24uaHRtbCcsIHtcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGRyaWxscG9wb3Zlcikge1xuICAgICAgICAgICAgdGhhdC5kcmlsbHBvcG92ZXIgPSBkcmlsbHBvcG92ZXI7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvYmFyZHJpbGRvd24uaHRtbCcsIHtcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGRyaWxsQmFycG9wb3Zlcikge1xuICAgICAgICAgICAgdGhhdC5kcmlsbEJhcnBvcG92ZXIgPSBkcmlsbEJhcnBvcG92ZXI7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHtcbiAgICAgICAgICAgIG1ldHJpYzogdGhpcy5jaGFydG9wdGlvblNlcnZpY2UubWV0cmljQmFyQ2hhcnRPcHRpb25zKHRoaXMpLFxuICAgICAgICAgICAgdGFyZ2V0TGluZUNoYXJ0OiB0aGlzLmNoYXJ0b3B0aW9uU2VydmljZS5saW5lQ2hhcnRPcHRpb25zKCksXG4gICAgICAgICAgICB0YXJnZXRCYXJDaGFydDogdGhpcy5jaGFydG9wdGlvblNlcnZpY2UudGFyZ2V0QmFyQ2hhcnRPcHRpb25zKHRoaXMpLFxuICAgICAgICAgICAgcGFzc2VuZ2VyQ2hhcnQ6IHRoaXMuY2hhcnRvcHRpb25TZXJ2aWNlLm11bHRpQmFyQ2hhcnRPcHRpb25zKClcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcmVxID0ge1xuICAgICAgICAgICAgdXNlcklkOiB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYocmVxLnVzZXJJZCAhPSBcIm51bGxcIikge1xuICAgICAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFBheEZsb3duTWlzSGVhZGVyKHJlcSkudGhlbihcbiAgICAgICAgICAgICAgICAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnN1YkhlYWRlciA9IGRhdGEucmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5oZWFkZXIuZmxvd25Nb250aCA9IHRoYXQuc3ViSGVhZGVyLnBheEZsb3duTWlzTW9udGhzWzBdLmZsb3dNb250aDtcblxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm9uU2xpZGVNb3ZlKHsgaW5kZXg6IDAgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXHRcblx0XHR0aGF0LmhlYWRlci51c2VybmFtZSA9IHRoYXQuZ2V0UHJvZmlsZVVzZXJOYW1lKCk7XG4gICAgfVxuXG4gICAgZ2V0UHJvZmlsZVVzZXJOYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIGlmICh0aGlzLnVzZXJTZXJ2aWNlLmlzVXNlckxvZ2dlZEluKCkpIHtcbiAgICAgICAgICAgIHZhciBvYmogPSB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInKTtcbiAgICAgICAgICAgIGlmIChvYmogIT0gJ251bGwnKSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb2ZpbGVVc2VyTmFtZSA9IEpTT04ucGFyc2Uob2JqKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZmlsZVVzZXJOYW1lLnVzZXJuYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2VsZWN0ZWRGbG93bk1vbnRoKG1vbnRoOiBzdHJpbmcpe1xuICAgICAgICByZXR1cm4gKG1vbnRoID09IHRoaXMuaGVhZGVyLmZsb3duTW9udGgpO1xuICAgIH1cbiAgICBvcmllbnRhdGlvbkNoYW5nZSA9ICgpOiBib29sZWFuID0+IHtcbiAgICAgICAgdGhpcy5vblNsaWRlTW92ZSh7IGluZGV4OiB0aGlzLmhlYWRlci50YWJJbmRleCB9KTtcbiAgICB9IFxuICAgIG9wZW5pbmZvUG9wb3ZlciAoJGV2ZW50LCBpbmRleCkge1xuICAgICAgICBpZiAodHlwZW9mIGluZGV4ID09IFwidW5kZWZpbmVkXCIgfHwgaW5kZXggPT0gXCJcIikge1xuICAgICAgICAgICAgdGhpcy5pbmZvZGF0YSA9ICdObyBpbmZvIGF2YWlsYWJsZSc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHRoaXMuaW5mb2RhdGE9aW5kZXg7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coaW5kZXgpO1xuICAgICAgICB0aGlzLmluZm9wb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICB9O1xuXG4gICAgY2xvc2VQb3BvdmVyKCkge1xuICAgICAgICB0aGlzLmdyYXBocG9wb3Zlci5oaWRlKCk7XG4gICAgfTtcbiAgICBjbG9zZXNCYXJQb3BvdmVyKCl7XG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLmhpZGUoKTtcbiAgICB9XG4gICAgY2xvc2VJbmZvUG9wb3ZlcigpIHtcbiAgICAgICAgdGhpcy5pbmZvcG9wb3Zlci5oaWRlKCk7XG4gICAgfVxuXG4gICAgdXBkYXRlSGVhZGVyKCkge1xuXHRcdHZhciBmbG93bk1vbnRoID0gdGhpcy5oZWFkZXIuZmxvd25Nb250aDtcbiAgICAgICAgdGhpcy5oZWFkZXIuaGVhZGVySW5kZXggPSBfLmZpbmRJbmRleCh0aGlzLnN1YkhlYWRlci5wYXhGbG93bk1pc01vbnRocywgZnVuY3Rpb24oY2hyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiBjaHIuZmxvd01vbnRoID09IGZsb3duTW9udGg7XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmhlYWRlci5oZWFkZXJJbmRleCk7XG5cdFx0dGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6IHRoaXMuaGVhZGVyLmhlYWRlckluZGV4fSk7XG4gICAgfVxuXG4gICAgb25TbGlkZU1vdmUoZGF0YTogYW55KSB7XG4gICAgICAgIHRoaXMuaGVhZGVyLnRhYkluZGV4ID0gZGF0YS5pbmRleDtcblx0XHR0aGlzLnRvZ2dsZS5jaGFydE9yVGFibGUgPSBcImNoYXJ0XCI7XG4gICAgICAgIHN3aXRjaCh0aGlzLmhlYWRlci50YWJJbmRleCl7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICB0aGlzLmdldEZsb3duRmF2b3JpdGVzKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIHRoaXMuY2FsbE1ldHJpY1NuYXBzaG90KCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIHRoaXMuY2FsbFRhcmdldFZzQWN0dWFsKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIHRoaXMuY2FsbFJldmVudWVBbmFseXNpcygpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICB0aGlzLmNhbGxTZWN0b3JDYXJyaWVyQW5hbHlzaXMoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAgdGhpcy5jYWxsUm91dGVSZXZlbnVlKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0b2dnbGVNZXRyaWMgKHZhbCkge1xuICAgICAgICB0aGlzLnRvZ2dsZS5tb250aE9yWWVhciA9IHZhbDtcbiAgICAgICAgdGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4fSk7XG4gICAgfVxuICAgIHRvZ2dsZVN1cmNoYXJnZSgpIHtcbiAgICAgICAgdGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6dGhpcy5oZWFkZXIudGFiSW5kZXh9KTtcbiAgICB9XG4gICAgdG9nZ2xlVGFyZ2V0KHZhbCkge1xuICAgICAgICB0aGlzLnRvZ2dsZS50YXJnZXRSZXZPclBheCA9IHZhbDtcbiAgICB9XG5cbiAgICB0b2dnbGVTZWN0b3IodmFsKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLnNlY3RvclJldk9yUGF4ID0gdmFsO1xuICAgIH1cblxuICAgIGNhbGxNZXRyaWNTbmFwc2hvdCgpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcbiAgICAgICAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxuICAgICAgICAgICAgdG9nZ2xlMTogdGhpcy50b2dnbGUubW9udGhPclllYXIsXG4gICAgICAgICAgICBmdWxsRGF0YUZsYWc6ICdOJ1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcbiAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldE1ldHJpY1NuYXBzaG90KHJlcWRhdGEpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgICAgICAgLy8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXG4gICAgICAgICAgICB0aGF0Lm1ldHJpY1Jlc3VsdCAgPSBfLnNvcnRCeShkYXRhLnJlc3BvbnNlLmRhdGEubWV0cmljU25hcHNob3RDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xuICAgICAgICAgICAgICAgIGlmICh1KSByZXR1cm4gW3UuZmF2b3JpdGVDaGFydFBvc2l0aW9uXTsgXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgXy5mb3JFYWNoKHRoYXQubWV0cmljUmVzdWx0LCBmdW5jdGlvbiAobjogYW55LCB2YWx1ZTogYW55KSB7XG4gICAgICAgICAgICAgICAgbi52YWx1ZXNbMF0uY29sb3IgPSAnIzRBOTBFMic7XG4gICAgICAgICAgICAgICAgbi52YWx1ZXNbMV0uY29sb3IgPSAnIzUwRTNDMic7XG4gICAgICAgICAgICAgICAgaWYobi52YWx1ZXNbMl0pIG4udmFsdWVzWzJdLmNvbG9yID0gJyNCOEU5ODYnO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoYXQuZmF2TWV0cmljUmVzdWx0ID0gXy5maWx0ZXIodGhhdC5tZXRyaWNSZXN1bHQsIGZ1bmN0aW9uKHU6IGFueSkge1xuICAgICAgICAgICAgICAgIGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhhdC5tZXRyaWNMZWdlbmRzID0gZGF0YS5yZXNwb25zZS5kYXRhLmxlZ2VuZHM7XG4gICAgICAgICAgICBpZih0aGF0LmhlYWRlci50YWJJbmRleCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5tZXRyaWNSZXN1bHQgPSB0aGF0LmZhdk1ldHJpY1Jlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjYWxsVGFyZ2V0VnNBY3R1YWwoKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdmFyIHJlcWRhdGEgPSB7XG4gICAgICAgICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VybmFtZSxcbiAgICAgICAgICAgIHRvZ2dsZTE6ICcnLFxuICAgICAgICAgICAgZnVsbERhdGFGbGFnOiAnJ1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0VGFyZ2V0VnNBY3R1YWwocmVxZGF0YSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgLy8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXG4gICAgICAgICAgICB0aGF0LmZhdlRhcmdldExpbmVSZXN1bHQgPSBfLmZpbHRlcihkYXRhLnJlc3BvbnNlLmRhdGEubGluZUNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7IFxuICAgICAgICAgICAgICAgIGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhhdC5mYXZUYXJnZXRCYXJSZXN1bHQgPSBfLmZpbHRlcihkYXRhLnJlc3BvbnNlLmRhdGEudmVyQmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHsgXG4gICAgICAgICAgICAgICAgaWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBfLmZvckVhY2goZGF0YS5yZXNwb25zZS5kYXRhLnZlckJhckNoYXJ0cywgZnVuY3Rpb24gKG46IGFueSwgdmFsdWU6IGFueSkge1xuICAgICAgICAgICAgICAgIG4udmFsdWVzWzBdLmNvbG9yID0gJyM0QTkwRTInO1xuICAgICAgICAgICAgICAgIG4udmFsdWVzWzFdLmNvbG9yID0gJyM1MEUzQzInO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgbGluZUNvbG9ycyA9IFt7XCJjb2xvclwiOiBcIiM0QTkwRTJcIiwgXCJjbGFzc2VkXCI6IFwiZGFzaGVkXCIsXCJzdHJva2VXaWR0aFwiOiAyfSxcbiAgICAgICAgICAgIHtcImNvbG9yXCI6IFwiIzUwRTNDMlwifSx7XCJjb2xvclwiOiBcIiNCOEU5ODZcIiwgXCJhcmVhXCIgOiB0cnVlLCBcImRpc2FibGVkXCI6IHRydWV9XTtcblxuICAgICAgICAgICAgXy5mb3JFYWNoKGRhdGEucmVzcG9uc2UuZGF0YS5saW5lQ2hhcnRzLCBmdW5jdGlvbiAobjogYW55LCB2YWx1ZTogYW55KSB7XG4gICAgICAgICAgICAgICAgXy5tZXJnZShuLmxpbmVDaGFydEl0ZW1zLCBsaW5lQ29sb3JzKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhLnJlc3BvbnNlLmRhdGEubGluZUNoYXJ0cyk7XG5cbiAgICAgICAgICAgIHRoYXQudGFyZ2V0QWN0dWFsRGF0YSA9IHtcbiAgICAgICAgICAgICAgICBob3JCYXJDaGFydDogZGF0YS5yZXNwb25zZS5kYXRhLnZlckJhckNoYXJ0cyxcbiAgICAgICAgICAgICAgICBsaW5lQ2hhcnQ6IGRhdGEucmVzcG9uc2UuZGF0YS5saW5lQ2hhcnRzXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcbiAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjYWxsUm91dGVSZXZlbnVlKCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHZhciByb3V0ZVJldlJlcXVlc3QgPSB7XG4gICAgICAgICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VybmFtZVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlKHJvdXRlUmV2UmVxdWVzdClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgdGhhdC5yb3V0ZVJldkRhdGEgPSBkYXRhLnJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgY2FsbFJldmVudWVBbmFseXNpcygpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcbiAgICAgICAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxuICAgICAgICAgICAgdG9nZ2xlMTogJycsXG4gICAgICAgICAgICBmdWxsRGF0YUZsYWc6ICcnXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0UmV2ZW51ZUFuYWx5c2lzKHJlcWRhdGEpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxuICAgICAgICAgICAgdmFyIGpzb25PYmogPSBkYXRhLnJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICB2YXIgc29ydGVkRGF0YSA9IF8uc29ydEJ5KGpzb25PYmoubXVsdGliYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcbiAgICAgICAgICAgICAgICBpZiAodSkgcmV0dXJuIFt1LmZhdm9yaXRlQ2hhcnRQb3NpdGlvbl07IFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgZmF2UmV2ZW51ZUJhclJlc3VsdCA9IF8uZmlsdGVyKHNvcnRlZERhdGEsIGZ1bmN0aW9uKHU6IGFueSkgeyBcbiAgICAgICAgICAgICAgICBpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBzb3J0ZWREYXRhID0gXy5zb3J0QnkoanNvbk9iai5waWVDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcbiAgICAgICAgICAgICAgICBpZiAodSkgcmV0dXJuIFt1LmZhdm9yaXRlQ2hhcnRQb3NpdGlvbl07IFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgZmF2UmV2ZW51ZVBpZVJlc3VsdCA9IF8uZmlsdGVyKHNvcnRlZERhdGEsIGZ1bmN0aW9uKHU6IGFueSkgeyBcbiAgICAgICAgICAgICAgICBpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIGJhckNvbG9ycyA9IFsnIzRBOTBFMicsICcjNTBFM0MyJ107XG4gICAgICAgICAgICBfLm1lcmdlKGpzb25PYmoubXVsdGliYXJDaGFydHNbMV0sIGJhckNvbG9ycyk7XG4gICAgICAgICAgICBfLmZvckVhY2goanNvbk9iai5tdWx0aWJhckNoYXJ0cywgZnVuY3Rpb24objogYW55LCB2YWx1ZTogYW55KSB7XG4gICAgICAgICAgICAgICAgbi5jb2xvciA9IGJhckNvbG9yc1t2YWx1ZV07XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIHBpZUNvbG9ycyA9IFt7XCJjb2xvclwiOiBcIiMyOGI2ZjZcIn0se1wiY29sb3JcIjogXCIjN2JkNGZjXCJ9LHtcImNvbG9yXCI6IFwiI0M2RTVGQVwifV07XG4gICAgICAgICAgICBfLmZvckVhY2goanNvbk9iai5waWVDaGFydHNbMF0uZGF0YSwgZnVuY3Rpb24gKG46IGFueSwgdmFsdWU6IGFueSkge1xuICAgICAgICAgICAgICAgIG4ubGFiZWwgPSBuLnh2YWw7XG4gICAgICAgICAgICAgICAgbi52YWx1ZSA9IG4ueXZhbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBfLm1lcmdlKGpzb25PYmoucGllQ2hhcnRzWzBdLmRhdGEsIHBpZUNvbG9ycyk7XG5cbiAgICAgICAgICAgIHRoYXQucmV2ZW51ZURhdGEgPSB7XG4gICAgICAgICAgICAgICAgcmV2ZW51ZVBpZUNoYXJ0IDoganNvbk9iai5waWVDaGFydHNbMF0sXG4gICAgICAgICAgICAgICAgcmV2ZW51ZUJhckNoYXJ0IDoganNvbk9iai5tdWx0aWJhckNoYXJ0c1sxXS5tdWx0aWJhckNoYXJ0SXRlbXMsXG4gICAgICAgICAgICAgICAgcmV2ZW51ZUhvckJhckNoYXJ0IDoganNvbk9iai5tdWx0aWJhckNoYXJ0c1syXS5tdWx0aWJhckNoYXJ0SXRlbXNcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgb3BlbkRyaWxsRG93bihyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCkge1xuICAgICAgICBzZWxGaW5kTGV2ZWwgPSBOdW1iZXIoc2VsRmluZExldmVsKTtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsXSA9IHJlZ2lvbkRhdGE7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWwgKyAxXSA9ICcnO1xuICAgICAgICBpZihzZWxGaW5kTGV2ZWwgIT0gJzMnKSB7XG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgICAgICAgIHRoaXMucmVnaW9uTmFtZSA9IChyZWdpb25EYXRhLnJlZ2lvbk5hbWUpID8gcmVnaW9uRGF0YS5yZWdpb25OYW1lIDogcmVnaW9uRGF0YS5jaGFydE5hbWU7XG4gICAgICAgICAgICB2YXIgY291bnRyeUZyb21UbyA9IChyZWdpb25EYXRhLmNvdW50cnlGcm9tICYmIHJlZ2lvbkRhdGEuY291bnRyeVRvKSA/IHJlZ2lvbkRhdGEuY291bnRyeUZyb20gKyAnLScgKyByZWdpb25EYXRhLmNvdW50cnlUbyA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgc2VjdG9yRnJvbVRvID0gKHJlZ2lvbkRhdGEuZmxvd25TZWN0b3IgJiYgZHJpbGxMZXZlbCA+PSAzKSA/IHJlZ2lvbkRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xuICAgICAgICAgICAgdmFyIGZsaWdodE51bWJlciA9IChyZWdpb25EYXRhLmZsaWdodE51bWJlciAmJiBkcmlsbExldmVsID09IDQpID8gcmVnaW9uRGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG5cbiAgICAgICAgICAgIHZhciByZXFkYXRhID0ge1xuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJcIixcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcbiAgICAgICAgICAgICAgICBcInJlZ2lvbk5hbWVcIjogKHRoaXMucmVnaW9uTmFtZSk/IHRoaXMucmVnaW9uTmFtZSA6IFwiTm9ydGggQW1lcmljYVwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeUZyb21Ub1wiOiBjb3VudHJ5RnJvbVRvLFxuICAgICAgICAgICAgICAgIFwic2VjdG9yRnJvbVRvXCI6IHNlY3RvckZyb21UbyxcbiAgICAgICAgICAgICAgICBcImZsaWdodE51bWJlclwiOiBmbGlnaHROdW1iZXIsXG4gICAgICAgICAgICAgICAgXCJmbGlnaHREYXRlXCI6IDBcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRSb3V0ZVJldmVudWVEcmlsbERvd24ocmVxZGF0YSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGRhdGEucmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgdmFyIGZpbmRMZXZlbCA9IGRyaWxsTGV2ZWwgLSAxO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEuc3RhdHVzKTtcbiAgICAgICAgICAgICAgICBpZihkYXRhLnN0YXR1cyA9PSAnc3VjY2Vzcycpe1xuICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLml0ZW1zWzBdID0gZGF0YS5kYXRhLnJvd3M7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0ub3JnSXRlbXNbMF0gPSBkYXRhLmRhdGEucm93cztcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnNvcnQoJ3BheENvdW50JyxmaW5kTGV2ZWwsZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZHJpbGxMZXZlbCk7XG4gICAgICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuc2hvd25Hcm91cCA9IGZpbmRMZXZlbDtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGZpbmRMZXZlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgICAgICAgICAgdGhhdC5jbG9zZXNQb3BvdmVyKCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgIGFsZXJ0KCdTZXJ2ZXIgRXJyb3InKTtcbiAgICAgICAgICAgIH0pOyBcbiAgICAgICAgfSBcbiAgICB9XG4gICAgY2xlYXJEcmlsbChsZXZlbDogbnVtYmVyKSB7XG4gICAgICAgIHZhciBpOiBudW1iZXI7XG4gICAgICAgIGZvciAodmFyIGkgPSBsZXZlbDsgaSA8IHRoaXMuZ3JvdXBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmdyb3Vwc1tpXS5pdGVtcy5zcGxpY2UoMCwgMSk7XG4gICAgICAgICAgICB0aGlzLmdyb3Vwc1tpXS5vcmdJdGVtcy5zcGxpY2UoMCwgMSk7XG4gICAgICAgICAgICB0aGlzLnNvcnQoJ3BheENvdW50JyxpLGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBkcmlsbERvd25SZXF1ZXN0IChkcmlsbFR5cGUsIHNlbEZpbmRMZXZlbCwgZGF0YSl7XG4gICAgICAgIHZhciByZXFkYXRhO1xuICAgICAgICBpZihkcmlsbFR5cGUgPT0gJ2JhcicpIHtcbiAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xuICAgICAgICAgICAgaWYgKGRhdGEubGFiZWwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhLmxhYmVsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZHJpbGxCYXI6IHN0cmluZztcbiAgICAgICAgICAgIGRyaWxsQmFyID0gKGRhdGEubGFiZWwpID8gZGF0YS5sYWJlbCA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgcm91dGVDb2RlID0gKGRhdGEucm91dGVDb2RlKSA/IGRhdGEucm91dGVDb2RlIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBzZWN0b3IgPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBmbGlnaHROdW1iZXIgPSAoZGF0YS5mbGlnaHROdW1iZXIpID8gZGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xuXG4gICAgICAgICAgICBpZiAoIWRyaWxsQmFyKSB7XG4gICAgICAgICAgICAgICAgZHJpbGxCYXIgPSB0aGlzLmRyaWxsQmFyTGFiZWw7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZHJpbGxCYXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG5cbiAgICAgICAgICAgIHJlcWRhdGEgPSB7XG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxuICAgICAgICAgICAgICAgIFwidXNlcklkXCI6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxuICAgICAgICAgICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwiXCIsXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXG4gICAgICAgICAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXG4gICAgICAgICAgICAgICAgXCJkcmlsbEJhclwiOiBkcmlsbEJhcixcbiAgICAgICAgICAgICAgICBcInJvdXRlQ29kZVwiOiByb3V0ZUNvZGUsXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JcIjogc2VjdG9yLFxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlclxuICAgICAgICAgICAgfTsgIFxuICAgICAgICB9XG5cblxuICAgICAgICBpZihkcmlsbFR5cGUgPT0gJ3RhcmdldCcpIHtcbiAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xuICAgICAgICAgICAgaWYgKGRhdGEubGFiZWwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhLmxhYmVsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgcm91dGV0eXBlOiBzdHJpbmc7XG4gICAgICAgICAgICByb3V0ZXR5cGUgPSAoZGF0YS5yb3V0ZXR5cGUpID8gZGF0YS5yb3V0ZXR5cGUgOiBcIlwiO1xuXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWScgOiAnTicsXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcbiAgICAgICAgICAgICAgICBcInJvdXRldHlwZVwiOiByb3V0ZXR5cGVcbiAgICAgICAgICAgIH07ICBcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVxZGF0YTtcbiAgICB9XG4gICAgZ2V0RHJpbGxEb3duVVJMIChkcmlsRG93blR5cGUpIHtcbiAgICAgICAgdmFyIHVybFxuICAgICAgICBzd2l0Y2goZHJpbERvd25UeXBlKXtcbiAgICAgICAgICAgIGNhc2UgJ2Jhcic6XG4gICAgICAgICAgICAgICAgdXJsID0gXCIvcGF4ZmxubWlzL21zcGF4bmV0cmV2ZHJpbGxcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndGFyZ2V0JzpcbiAgICAgICAgICAgICAgICB1cmwgPSBcIi9wYXhmbG5taXMvdGd0dnNhY3RkcmlsbFwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH1cbiAgICBvcGVuQmFyRHJpbGxEb3duKGRhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgICAgICBzZWxGaW5kTGV2ZWwgPSBOdW1iZXIoc2VsRmluZExldmVsKTtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsXSA9IGRhdGE7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWwgKyAxXSA9ICcnO1xuICAgICAgICBcbiAgICAgICAgaWYgKHNlbEZpbmRMZXZlbCAhPSAodGhpcy5ncm91cHMubGVuZ3RoIC0gMSkpIHtcbiAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG4gICAgICAgICAgICB2YXIgcmVxZGF0YSA9IHRoaXMuZHJpbGxEb3duUmVxdWVzdCh0aGlzLmRyaWxsVHlwZSwgc2VsRmluZExldmVsLCBkYXRhKTtcbiAgICAgICAgICAgIHZhciBVUkwgPSB0aGlzLmdldERyaWxsRG93blVSTCh0aGlzLmRyaWxsVHlwZSk7XG4gICAgICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0RHJpbGxEb3duKHJlcWRhdGEsIFVSTClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGRhdGEucmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZmluZExldmVsID0gZHJpbGxMZXZlbCAtIDE7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEuc3RhdHVzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5pdGVtc1swXSA9IGRhdGEuZGF0YS5yb3dzO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5vcmdJdGVtc1swXSA9IGRhdGEuZGF0YS5yb3dzO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zb3J0KCdwYXhDb3VudCcsIGZpbmRMZXZlbCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGRyaWxsTGV2ZWwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGZpbmRMZXZlbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5jbG9zZXNQb3BvdmVyKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ1NlcnZlciBFcnJvcicpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGluaXRpYXRlQXJyYXkoZHJpbGx0YWJzKSB7XG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgaW4gZHJpbGx0YWJzKSB7XG4gICAgICAgICAgICB0aGlzLmdyb3Vwc1tpXSA9IHtcbiAgICAgICAgICAgICAgICBpZDogaSxcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLmRyaWxsdGFic1tpXSxcbiAgICAgICAgICAgICAgICBpdGVtczogW10sXG4gICAgICAgICAgICAgICAgb3JnSXRlbXM6IFtdLFxuICAgICAgICAgICAgICAgIEl0ZW1zQnlQYWdlOiBbXSxcbiAgICAgICAgICAgICAgICBmaXJzdENvbHVtbnM6IHRoaXMuZmlyc3RDb2x1bW5zW2ldXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIG9wZW5CYXJEcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XG4gICAgICAgIHRoaXMuZHJpbGxOYW1lID0gJ01FVFJJQyBTTkFQU0hPVCBSRVBPUlQgLSAnICsgc2VsRGF0YS5wb2ludC5sYWJlbDtcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAnYmFyJztcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcbiAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ1JvdXRlIExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdEYXRhIExldmVsJywgJ0ZsaWdodCBMZXZlbCddO1xuICAgICAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsncm91dGVDb2RlJywgJ2Zsb3duU2VjdG9yJywgJ2ZsaWdodE51bWJlcicsICdmbGlnaHREYXRlJ107XG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICAgICAgdGhpcy5vcGVuQmFyRHJpbGxEb3duKHNlbERhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XG4gICAgfTtcbiAgICBvcGVuVGFyZ2V0RHJpbGxEb3duUG9wb3ZlcigkZXZlbnQsIHNlbERhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgICAgICB0aGlzLmRyaWxsTmFtZSA9ICdUYXJnZXQgVnMgQWN0dWFsJztcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAndGFyZ2V0JztcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcbiAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ1JvdXRlIFR5cGUnLCAnUm91dGUgY29kZSddO1xuICAgICAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsncm91dGV0eXBlJywgJ3JvdXRlY29kZSddO1xuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xuICAgICAgICB0aGlzLmRyaWxsQmFycG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICAgIHRoaXMub3BlbkJhckRyaWxsRG93bihzZWxEYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xuICAgIH07XG5cbiAgICBvcGVuUG9wb3ZlciAoJGV2ZW50LCBpbmRleCwgY2hhcnR0eXBlKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMuY2hhcnRUeXBlID0gY2hhcnR0eXBlO1xuICAgICAgICB0aGlzLmdyYXBoSW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvZ3JhcGgtcG9wb3Zlci5odG1sJywge1xuICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xuICAgICAgICAgICAgdGhhdC5wb3BvdmVyc2hvd24gPSB0cnVlO1xuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIgPSBwb3BvdmVyO1xuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBvcGVuU2VjdG9yUG9wb3ZlciAoJGV2ZW50LGluZGV4LGNoYXJ0dHlwZSkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuY2hhcnRUeXBlID0gY2hhcnR0eXBlO1xuICAgICAgICB0aGlzLmdyYXBoSW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvc2VjdG9yLWdyYXBoLXBvcG92ZXIuaHRtbCcsIHtcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHBvcG92ZXIpIHtcbiAgICAgICAgICAgIHRoYXQucG9wb3ZlcnNob3duID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcbiAgICAgICAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY2FsbFNlY3RvckNhcnJpZXJBbmFseXNpcyAoKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdmFyIHJlcWRhdGEgPSB7XG4gICAgICAgICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VybmFtZSxcbiAgICAgICAgICAgIHRvZ2dsZTE6ICcnLFxuICAgICAgICAgICAgdG9nZ2xlMjogJycsXG4gICAgICAgICAgICBmdWxsRGF0YUZsYWc6ICdOJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRTZWN0b3JDYXJyaWVyQW5hbHlzaXMocmVxZGF0YSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgLy8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXG4gICAgICAgICAgICB2YXIganNvbk9iaiA9IGRhdGEucmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIF8uZm9yRWFjaChqc29uT2JqLlNlY3RvckNhcnJpZXJBbmFseXNpc0NoYXJ0cywgZnVuY3Rpb24odmFsOiBhbnksIGk6IG51bWJlcil7XG4gICAgICAgICAgICAgICAgdmFsWydvdGhlcnMnXSA9IHZhbC5pdGVtcy5zcGxpY2UoLTEsIDEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgc29ydGVkRGF0YSA9IF8uc29ydEJ5KGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHsgXG4gICAgICAgICAgICAgICAgaWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIGZhdlNlY3RvckNhcnJpZXJSZXN1bHQgPSBfLmZpbHRlcihzb3J0ZWREYXRhLCBmdW5jdGlvbih1OiBhbnkpIHsgXG4gICAgICAgICAgICAgICAgaWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoYXQuU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzID0ganNvbk9iai5TZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHM7XG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0YXJnZXRBY3R1YWxGaWx0ZXIodGhhdDogTWlzQ29udHJvbGxlcikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oaXRlbTogYW55KXtcbiAgICAgICAgICAgIHJldHVybiBpdGVtLnRvZ2dsZTEgPT0gdGhhdC50b2dnbGUudGFyZ2V0UmV2T3JQYXg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZWN0b3JDYXJyaWVyRmlsdGVyKHRoYXQ6IE1pc0NvbnRyb2xsZXIpIHtcbiAgICAgICB0aGF0ID0gdGhpcy50aGF0O1xuICAgICAgIHJldHVybiBmdW5jdGlvbihpdGVtOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVtLnRvZ2dsZTEgPT0gdGhhdC50b2dnbGUuc2VjdG9yT3JkZXIgJiYgaXRlbS50b2dnbGUyID09IHRoYXQudG9nZ2xlLnNlY3RvclJldk9yUGF4OyBcbiAgICAgIH1cbiAgICAgXG4gICAgfVxuXG4gICAgcmV2ZW51ZUFuYWx5c2lzRmlsdGVyKGl0ZW06IGFueSkge1xuICAgICAgICB2YXIgc3VyY2hhcmdlRmxhZyA9ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gXCJZXCIgOiBcIk5cIjtcbiAgICAgICAgLy8gY29uc29sZS5sb2coc3VyY2hhcmdlRmxhZysnIDogJytpdGVtKTtcbiAgICAgICAgaWYoIGl0ZW0uc3VyY2hhcmdlRmxhZyA9PSBzdXJjaGFyZ2VGbGFnKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTsgXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGdldEZsb3duRmF2b3JpdGVzKCkge1xuICAgICAgICB0aGlzLmNhbGxNZXRyaWNTbmFwc2hvdCgpO1xuICAgICAgICB0aGlzLmNhbGxUYXJnZXRWc0FjdHVhbCgpO1xuICAgICAgICB0aGlzLmNhbGxSZXZlbnVlQW5hbHlzaXMoKTtcbiAgICB9XG5cbiAgICBpb25pY0xvYWRpbmdTaG93KCkge1xuICAgICAgICB0aGlzLiRpb25pY0xvYWRpbmcuc2hvdyh7XG4gICAgICAgICAgICB0ZW1wbGF0ZTogJzxpb24tc3Bpbm5lciBjbGFzcz1cInNwaW5uZXItY2FsbVwiPjwvaW9uLXNwaW5uZXI+J1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgaW9uaWNMb2FkaW5nSGlkZSgpIHtcbiAgICAgICAgdGhpcy4kaW9uaWNMb2FkaW5nLmhpZGUoKTtcbiAgICB9O1xuXG4gICAgb3BlbkRyaWxsRG93blBvcG92ZXIoJGV2ZW50LHJlZ2lvbkRhdGEsc2VsRmluZExldmVsKSB7XG4gICAgICAgIHRoaXMuZHJpbGxUeXBlID0gJ3JvdXRlJztcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcbiAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ0NvdW50cnkgTGV2ZWwnLCAnU2VjdG9yIExldmVsJywgJ0ZsaWdodCBMZXZlbCcsICdEb2N1bWVudCBMZXZlbCddO1xuICAgICAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsnY291bnRyeUZyb20nLCdmbG93blNlY3RvcicsICdmbGlnaHROdW1iZXInLCAnZG9jdW1lbnQjJ107XG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgICAgIHRoaXMuZHJpbGxwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICAgICAgdGhpcy5vcGVuRHJpbGxEb3duKHJlZ2lvbkRhdGEsc2VsRmluZExldmVsKTtcbiAgICB9O1xuXG4gICAgY2xvc2VzUG9wb3ZlcigpIHtcbiAgICAgICAgdGhpcy5kcmlsbHBvcG92ZXIuaGlkZSgpO1xuICAgIH07XG5cbiAgICBpc0RyaWxsUm93U2VsZWN0ZWQobGV2ZWwsb2JqKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdGVkRHJpbGxbbGV2ZWxdID09IG9iajtcbiAgICB9XG4gICAgc2VhcmNoUmVzdWx0cyAobGV2ZWwsb2JqKSB7XG4gICAgICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuZmlsdGVyZWRMaXN0U2VydmljZS5zZWFyY2hlZCh0aGlzLmdyb3Vwc1tsZXZlbF0ub3JnSXRlbXNbMF0sIG9iai5zZWFyY2hUZXh0LCBsZXZlbCwgdGhpcy5kcmlsbFR5cGUpO1xuICAgICAgICBpZiAob2JqLnNlYXJjaFRleHQgPT0gJycpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXRBbGwobGV2ZWwpOyBcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuZ3JvdXBzW2xldmVsXS5vcmdJdGVtc1swXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IDA7XG4gICAgICAgIHRoaXMucGFnaW5hdGlvbihsZXZlbCk7IFxuICAgIH1cbiAgICBwYWdpbmF0aW9uIChsZXZlbCkge1xuICAgICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UgPSB0aGlzLmZpbHRlcmVkTGlzdFNlcnZpY2UucGFnZWQodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLnBhZ2VTaXplICk7XG4gICAgfTtcblxuICAgIHNldFBhZ2UgKGxldmVsLCBwYWdlbm8pIHtcbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSBwYWdlbm87XG4gICAgfTtcbiAgICBsYXN0UGFnZShsZXZlbCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IHRoaXMuZ3JvdXBzW2xldmVsXS5JdGVtc0J5UGFnZS5sZW5ndGggLSAxO1xuICAgIH07XG4gICAgcmVzZXRBbGwobGV2ZWwpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSAwO1xuICAgIH1cbiAgICBzb3J0KHNvcnRCeSxsZXZlbCxvcmRlcikge1xuICAgICAgICB0aGlzLnJlc2V0QWxsKGxldmVsKTtcbiAgICAgICAgdGhpcy5jb2x1bW5Ub09yZGVyID0gc29ydEJ5OyBcbiAgICAgICAgLy8kRmlsdGVyIC0gU3RhbmRhcmQgU2VydmljZVxuICAgICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLiRmaWx0ZXIoJ29yZGVyQnknKSh0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0sIHRoaXMuY29sdW1uVG9PcmRlciwgb3JkZXIpOyBcbiAgICAgICAgdGhpcy5wYWdpbmF0aW9uKGxldmVsKTsgICAgXG4gICAgfTtcbiAgICByYW5nZSh0b3RhbCwgbGV2ZWwpIHtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICB2YXIgc3RhcnQ6IG51bWJlcjtcbiAgICAgICAgc3RhcnQgPSBOdW1iZXIodGhpcy5jdXJyZW50UGFnZVtsZXZlbF0pIC0gMjtcbiAgICAgICAgaWYoc3RhcnQgPCAwKSB7XG4gICAgICAgICAgc3RhcnQgPSAwO1xuICAgICAgICB9XG4gICAgICAgIHZhciBrID0gMTtcbiAgICAgICAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgdG90YWw7IGkrKykge1xuICAgICAgICAgIHJldC5wdXNoKGkpO1xuICAgICAgICAgIGsrKztcbiAgICAgICAgICBpZiAoayA+IDYpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuICAgIHRvZ2dsZUdyb3VwIChncm91cCkge1xuICAgICAgICBpZiAodGhpcy5pc0dyb3VwU2hvd24oZ3JvdXApKSB7XG4gICAgICAgICAgICB0aGlzLnNob3duR3JvdXAgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zaG93bkdyb3VwID0gZ3JvdXA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaXNHcm91cFNob3duKGdyb3VwOiBudW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2hvd25Hcm91cCA9PSBncm91cDtcbiAgICB9XG5cdHRvZ2dsZUNoYXJ0T3JUYWJsZVZpZXcodmFsOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy50b2dnbGUuY2hhcnRPclRhYmxlID0gdmFsO1xuICAgIH1cbiAgICB0b2dnbGVUYXJnZXRWaWV3KHZhbDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLnRhcmdldFZpZXcgPSB2YWw7XG4gICAgfVxuICAgIHRvZ2dsZVJldmVudWVWaWV3KHZhbDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLnJldmVudWVWaWV3ID0gdmFsO1xuICAgIH1cbiAgICB0b2dnbGVTZWN0b3JWaWV3KHZhbDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLnNlY3RvclZpZXcgPSB2YWw7XG4gICAgfVxuXHRydW5SZXBvcnQoY2hhcnRUaXRsZTogc3RyaW5nLG1vbnRoT3JZZWFyOiBzdHJpbmcsZmxvd25Nb250aDogc3RyaW5nKXtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0Ly9pZiBubyBjb3Jkb3ZhLCB0aGVuIHJ1bm5pbmcgaW4gYnJvd3NlciBhbmQgbmVlZCB0byB1c2UgZGF0YVVSTCBhbmQgaWZyYW1lXG5cdFx0aWYgKCF3aW5kb3cuY29yZG92YSkge1xuXHRcdFx0dGhhdC5pb25pY0xvYWRpbmdTaG93KCk7XG5cdFx0XHR0aGlzLnJlcG9ydFN2Yy5ydW5SZXBvcnREYXRhVVJMKGNoYXJ0VGl0bGUsbW9udGhPclllYXIsZmxvd25Nb250aClcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZGF0YVVSTCkge1xuXHRcdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuXHRcdFx0XHRcdC8vc2V0IHRoZSBpZnJhbWUgc291cmNlIHRvIHRoZSBkYXRhVVJMIGNyZWF0ZWRcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKGRhdGFVUkwpO1xuXHRcdFx0XHRcdC8vZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BkZkltYWdlJykuc3JjID0gZGF0YVVSTDtcblx0XHRcdFx0XHR3aW5kb3cub3BlbihkYXRhVVJMLFwiX3N5c3RlbVwiKTtcblx0XHRcdFx0fSwgZnVuY3Rpb24oZXJyb3IpIHtcblx0XHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRXJyb3IgJyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdC8vaWYgY29kcm92YSwgdGhlbiBydW5uaW5nIGluIGRldmljZS9lbXVsYXRvciBhbmQgYWJsZSB0byBzYXZlIGZpbGUgYW5kIG9wZW4gdy8gSW5BcHBCcm93c2VyXG5cdFx0ZWxzZSB7XG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ1Nob3coKTtcblx0XHRcdHRoaXMucmVwb3J0U3ZjLnJ1blJlcG9ydEFzeW5jKGNoYXJ0VGl0bGUsbW9udGhPclllYXIsZmxvd25Nb250aClcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZmlsZVBhdGgpIHtcblx0XHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdFx0XHQvL2xvZyB0aGUgZmlsZSBsb2NhdGlvbiBmb3IgZGVidWdnaW5nIGFuZCBvb3BlbiB3aXRoIGluYXBwYnJvd3NlclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXBvcnQgcnVuIG9uIGRldmljZSB1c2luZyBGaWxlIHBsdWdpbicpO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdSZXBvcnRDdHJsOiBPcGVuaW5nIFBERiBGaWxlICgnICsgZmlsZVBhdGggKyAnKScpO1xuXHRcdFx0XHRcdHZhciBsYXN0UGFydCA9IGZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKTtcblx0XHRcdFx0XHR2YXIgZmlsZU5hbWUgPSBcIi9tbnQvc2RjYXJkL1wiK2xhc3RQYXJ0O1x0XHRcdFx0XHRcblx0XHRcdFx0XHRpZihkZXZpY2UucGxhdGZvcm0gIT1cIkFuZHJvaWRcIilcblx0XHRcdFx0XHRmaWxlTmFtZSA9IGZpbGVQYXRoO1xuXHRcdFx0XHRcdC8vd2luZG93Lm9wZW5QREYoZmlsZU5hbWUpO1xuXHRcdFx0XHRcdC8vZWxzZVxuXHRcdFx0XHRcdC8vd2luZG93Lm9wZW4oZmlsZVBhdGgsICdfYmxhbmsnLCAnbG9jYXRpb249bm8sY2xvc2VidXR0b25jYXB0aW9uPUNsb3NlLGVuYWJsZVZpZXdwb3J0U2NhbGU9eWVzJyk7Ki9cblx0XHRcdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29yZG92YS5wbHVnaW5zLmZpbGVPcGVuZXIyLm9wZW4oXG5cdFx0XHRcdFx0XHRmaWxlTmFtZSwgXG5cdFx0XHRcdFx0XHQnYXBwbGljYXRpb24vcGRmJywgXG5cdFx0XHRcdFx0XHR7IFxuXHRcdFx0XHRcdFx0XHRlcnJvciA6IGZ1bmN0aW9uKGUpIHsgXG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0Vycm9yIHN0YXR1czogJyArIGUuc3RhdHVzICsgJyAtIEVycm9yIG1lc3NhZ2U6ICcgKyBlLm1lc3NhZ2UpO1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRzdWNjZXNzIDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlIG9wZW5lZCBzdWNjZXNzZnVsbHknKTsgICAgICAgICAgICAgICAgXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9LCBmdW5jdGlvbihlcnJvcikge1xuXHRcdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdFcnJvciAnKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdH1cblx0XG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9zZXJ2aWNlcy9PcGVyYXRpb25hbFNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIgLz5cblxuaW50ZXJmYWNlIHRhYk9iamVjdCB7XG4gICAgdGl0bGU6IHN0cmluZyxcbiAgICBuYW1lczogc3RyaW5nLFxuICAgIGljb246IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgdG9nZ2xlT2JqZWN0IHtcbiAgICBtb250aE9yWWVhcjogc3RyaW5nLFxuICAgIG9wZW5PckNsb3NlZDogc3RyaW5nLFxuICAgIGZsaWdodFN0YXR1czogc3RyaW5nLFxuICAgIGZsaWdodFJlYXNvbjogc3RyaW5nLFxuICAgIGNjRXhjZXB0aW9uOiBzdHJpbmdcbn1cblxuaW50ZXJmYWNlIGhlYWRlck9iamVjdCB7XG4gICAgZmxvd25Nb250aDogc3RyaW5nLFxuICAgIHRhYkluZGV4OiBudW1iZXIsXG4gICAgdXNlck5hbWU6IHN0cmluZ1xufVxuXG5jbGFzcyBPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlciB7XG4gIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHN0YXRlJywgJyRzY29wZScsICckaW9uaWNMb2FkaW5nJywgJyRpb25pY1BvcG92ZXInLCAnJGZpbHRlcicsXG4gICAgJ09wZXJhdGlvbmFsU2VydmljZScsICckaW9uaWNTbGlkZUJveERlbGVnYXRlJywgJyR0aW1lb3V0JywgJyR3aW5kb3cnLCAnUmVwb3J0U3ZjJywgJ0ZpbHRlcmVkTGlzdFNlcnZpY2UnLCAnVXNlclNlcnZpY2UnLCAnJGlvbmljSGlzdG9yeScsICckaW9uaWNQb3B1cCddO1xuICBwcml2YXRlIHRhYnM6IFt0YWJPYmplY3RdO1xuICBwcml2YXRlIHRvZ2dsZTogdG9nZ2xlT2JqZWN0O1xuICBwcml2YXRlIGhlYWRlcjogaGVhZGVyT2JqZWN0O1xuICBwcml2YXRlIHN1YkhlYWRlcjogYW55O1xuICBwcml2YXRlIGZsaWdodFByb2NTdGF0dXM6IGFueTtcbiAgcHJpdmF0ZSBmYXZGbGlnaHRQcm9jUmVzdWx0OiBhbnk7XG4gIHByaXZhdGUgY2Fyb3VzZWxJbmRleDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBmbGlnaHRDb3VudFJlYXNvbjogYW55O1xuICBwcml2YXRlIGNvdXBvbkNvdW50RXhjZXB0aW9uOiBhbnk7XG4gIHByaXZhdGUgY2hhcnR0eXBlOiBzdHJpbmc7XG4gIHByaXZhdGUgZ3JhcGhUeXBlOiBzdHJpbmc7XG4gIHByaXZhdGUgZ3JhcGhwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcbiAgcHJpdmF0ZSBwb3BvdmVyc2hvd246IGJvb2xlYW47XG4gIHByaXZhdGUgdGhyZWVCYXJDaGFydENvbG9yczogW3N0cmluZ10gPSBbJyM0RUIyRjknLCAnI0ZGQzMwMCcsICcjNUM2QkMwJ107XG4gIHByaXZhdGUgZm91ckJhckNoYXJ0Q29sb3JzOiBbc3RyaW5nXSA9IFsnIzdFRDMyMScsICcjNEVCMkY5JywgJyNGRkMzMDAnLCAnIzVDNkJDMCddO1xuXG4gIHByaXZhdGUgaW5mb3BvcG92ZXI6IElvbmljLklQb3BvdmVyO1xuICBwcml2YXRlIGluZm9kYXRhOiBzdHJpbmc7XG4gIHByaXZhdGUgZmxpZ2h0UHJvY1NlY3Rpb246IHN0cmluZztcbiAgcHJpdmF0ZSBmbGlnaHRDb3VudFNlY3Rpb246IHN0cmluZztcbiAgcHJpdmF0ZSBjb3Vwb25Db3VudFNlY3Rpb246IHN0cmluZztcbiAgcHJpdmF0ZSBjdXJyZW50SW5kZXg6IG51bWJlcjtcblxuICBwcml2YXRlIHBhZ2VTaXplID0gNDtcbiAgcHJpdmF0ZSBjdXJyZW50UGFnZSA9IFtdO1xuICBwcml2YXRlIHNlbGVjdGVkRHJpbGwgPSBbXTtcbiAgcHJpdmF0ZSBncm91cHMgPSBbXTtcbiAgcHJpdmF0ZSBjb2x1bW5Ub09yZGVyOiBzdHJpbmc7XG4gIHByaXZhdGUgc2hvd25Hcm91cDogbnVtYmVyO1xuICBwcml2YXRlIGRyaWxsVHlwZTogc3RyaW5nO1xuICBwcml2YXRlIGRyaWxsQmFyTGFiZWw6IHN0cmluZztcbiAgcHJpdmF0ZSBleGNlcHRpb25DYXRlZ29yeTogc3RyaW5nO1xuICBwcml2YXRlIGRyaWxsdGFiczogc3RyaW5nW107XG4gIHByaXZhdGUgZHJpbGxOYW1lOiBzdHJpbmdbXTtcbiAgcHJpdmF0ZSBkcmlsbHBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgJHN0YXRlOiBhbmd1bGFyLnVpLklTdGF0ZVNlcnZpY2UsIHByaXZhdGUgJHNjb3BlOiBuZy5JU2NvcGUsXG4gICAgcHJpdmF0ZSAkaW9uaWNMb2FkaW5nOiBJb25pYy5JTG9hZGluZyxcbiAgICBwcml2YXRlICRpb25pY1BvcG92ZXI6IElvbmljLklQb3BvdmVyLCBwcml2YXRlICRmaWx0ZXI6IG5nLklGaWx0ZXJTZXJ2aWNlLFxuICAgIHByaXZhdGUgb3BlcmF0aW9uYWxTZXJ2aWNlOiBPcGVyYXRpb25hbFNlcnZpY2UsXG4gICAgcHJpdmF0ZSAkaW9uaWNTbGlkZUJveERlbGVnYXRlOiBJb25pYy5JU2xpZGVCb3hEZWxlZ2F0ZSxcbiAgICBwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsXG4gICAgcHJpdmF0ZSByZXBvcnRTdmM6IFJlcG9ydFN2YywgcHJpdmF0ZSBmaWx0ZXJlZExpc3RTZXJ2aWNlOiBGaWx0ZXJlZExpc3RTZXJ2aWNlLFxuICAgIHByaXZhdGUgdXNlclNlcnZpY2U6IFVzZXJTZXJ2aWNlLCBwcml2YXRlICRpb25pY0hpc3Rvcnk6IGFueSwgcHJpdmF0ZSAkaW9uaWNQb3B1cDogSW9uaWMuSVBvcHVwKSB7XG4gICAgXG4gICAgaWYgKCF0aGlzLnVzZXJTZXJ2aWNlLmNoZWNrTWVudUFjY2VzcygnT3BlcmF0aW9uYWwnKSkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLiRpb25pY1BvcHVwLmFsZXJ0KHtcbiAgICAgICAgICAgIHRpdGxlOiAnRXJyb3InLFxuICAgICAgICAgICAgY29udGVudDogJ1lvdSBkb250IGhhdmUgYWNjZXMgdG8gdGhpcyBQYWdlISEhJ1xuICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZG9uZScpO1xuICAgICAgICAgICAgc2VsZi4kc3RhdGUuZ28oJ2FwcC5taXMtZmxvd24nKTtcbiAgICAgICAgICAgIC8vIHNlbGYuJGlvbmljSGlzdG9yeS5jdXJyZW50VmlldyhzZWxmLiRpb25pY0hpc3RvcnkuYmFja1ZpZXcoKSk7XG4gICAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudGFicyA9IFtcbiAgICAgICAgeyB0aXRsZTogJ015IERhc2hib2FyZCcsIG5hbWVzOiAnTXlEYXNoYm9hcmQnLCBpY29uOiAnaWNvbm9uLWhvbWUnIH0sXG4gICAgICAgIHsgdGl0bGU6ICdGbGlnaHQgUHJvY2VzcyBTdGF0dXMnLCBuYW1lczogJ0ZsaWdodFByb2Nlc3NTdGF0dXMnLCBpY29uOiAnaW9uLWhvbWUnIH0sXG4gICAgICAgIHsgdGl0bGU6ICdGbGlnaHQgQ291bnQgYnkgUmVhc29uJywgbmFtZXM6ICdGbGlnaHRDb3VudGJ5UmVhc29uJywgaWNvbjogJ2lvbi1ob21lJyB9LFxuICAgICAgICB7IHRpdGxlOiAnQ291cG9uIENvdW50IGJ5IEV4Y2VwdGlvbiBDYXRlZ29yeScsIG5hbWVzOiAnQ291cG9uQ291bnRieUV4Y2VwdGlvbkNhdGVnb3J5JywgaWNvbjogJ2lvbi1ob21lJyB9XG4gICAgICBdO1xuXG4gICAgICB0aGlzLnRvZ2dsZSA9IHtcbiAgICAgICAgbW9udGhPclllYXI6ICdtb250aCcsXG4gICAgICAgIG9wZW5PckNsb3NlZDogJ09QRU4nLFxuICAgICAgICBmbGlnaHRTdGF0dXM6ICdjaGFydCcsXG4gICAgICAgIGZsaWdodFJlYXNvbjogJ2NoYXJ0JyxcbiAgICAgICAgY2NFeGNlcHRpb246ICdjaGFydCdcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuaGVhZGVyID0ge1xuICAgICAgICBmbG93bk1vbnRoOiAnJyxcbiAgICAgICAgdGFiSW5kZXg6IDAsXG4gICAgICAgIHVzZXJOYW1lOiAnJ1xuICAgICAgfTtcblxuICAgICAgdGhpcy5pbml0RGF0YSgpO1xuICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuXG5cbiAgICAgIC8vICAgdGhpcy4kc2NvcGUuJG9uKCckaW9uaWNWaWV3LmVudGVyJywgKCkgPT4ge1xuICAgICAgLy8gICAgICAgaWYgKCF0aGF0LnVzZXJTZXJ2aWNlLnNob3dEYXNoYm9hcmQoJ09wZXJhdGlvbmFsJykpIHtcbiAgICAgIC8vICAgICAgICAgICB0aGlzLiRpb25pY1BvcHVwLmFsZXJ0KHtcbiAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdFcnJvcicsXG4gICAgICAvLyAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6ICdZb3UgZG9udCBoYXZlIGFjY2VzIHRvIHRoaXMgUGFnZSEhISdcbiAgICAgIC8vICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgLy8gICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZG9uZScpO1xuICAgICAgLy8gICAgICAgICAgIH0pO1xuICAgICAgLy8gICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFxuICAgICAgLy8gICAgICAgfVxuICAgICAgLy8gfSk7XG5cbiAgICBcbiAgICAgIHRoaXMuJHNjb3BlLiRvbignb3BlbkRyaWxsUG9wdXAxJywgKGV2ZW50OiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UudHlwZSk7XG4gICAgICAgIGlmIChyZXNwb25zZS50eXBlID09ICdmbGlnaHQtcHJvY2VzcycpIHtcbiAgICAgICAgICB0aGlzLiRzY29wZS5PcHJDdHJsLm9wZW5GbGlnaHRQcm9jZXNzRHJpbGxQb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ2NvdXBvbi1jb3VudCcpIHtcbiAgICAgICAgICB0aGlzLiRzY29wZS5PcHJDdHJsLm9wZW5Db3VucG9uQ291bnREcmlsbFBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAnZmxpZ2h0LWNvdW50Jykge1xuICAgICAgICAgIHRoaXMuJHNjb3BlLk9wckN0cmwub3BlbkZsaWdodENvdW50RHJpbGxQb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGluaXREYXRhKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vZHJpbGRvd24uaHRtbCcsIHtcbiAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxuICAgIH0pLnRoZW4oZnVuY3Rpb24oZHJpbGxwb3BvdmVyKSB7XG4gICAgICB0aGF0LmRyaWxscG9wb3ZlciA9IGRyaWxscG9wb3ZlcjtcbiAgICB9KTtcblxuXG4gICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9pbmZvdG9vbHRpcC5odG1sJywge1xuICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXG4gICAgfSkudGhlbihmdW5jdGlvbihpbmZvcG9wb3Zlcikge1xuICAgICAgdGhhdC5pbmZvcG9wb3ZlciA9IGluZm9wb3BvdmVyO1xuICAgIH0pO1xuXG4gICAgdmFyIHJlcSA9IHtcbiAgICAgIHVzZXJJZDogdGhhdC4kd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdyYXBpZE1vYmlsZS51c2VyJylcbiAgICB9XG5cbiAgICBpZiAocmVxLnVzZXJJZCAhPSBcIm51bGxcIikge1xuICAgICAgdGhpcy5vcGVyYXRpb25hbFNlcnZpY2UuZ2V0UGF4Rmxvd25PcHJIZWFkZXIocmVxKS50aGVuKFxuICAgICAgICAoZGF0YSkgPT4ge1xuICAgICAgICAgIHRoYXQuc3ViSGVhZGVyID0gZGF0YS5yZXNwb25zZS5kYXRhO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoYXQuc3ViSGVhZGVyLnBheEZsb3duT3ByTW9udGhzKTtcbiAgICAgICAgICB0aGF0LmhlYWRlci5mbG93bk1vbnRoID0gdGhhdC5zdWJIZWFkZXIuZGVmYXVsdE1vbnRoO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoYXQuaGVhZGVyLmZsb3duTW9udGgpO1xuICAgICAgICAgIHRoYXQub25TbGlkZU1vdmUoeyBpbmRleDogMCB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgKGVycm9yKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHRoYXQuaGVhZGVyLnVzZXJOYW1lID0gdGhhdC5nZXRQcm9maWxlVXNlck5hbWUoKTtcbiAgfVxuXG5cbiAgc2VsZWN0ZWRGbG93bk1vbnRoKG1vbnRoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gKG1vbnRoID09IHRoaXMuaGVhZGVyLmZsb3duTW9udGgpO1xuICB9XG5cbiAgZ2V0UHJvZmlsZVVzZXJOYW1lKCk6IHN0cmluZyB7XG4gICAgaWYgKHRoaXMudXNlclNlcnZpY2UuaXNVc2VyTG9nZ2VkSW4oKSkge1xuICAgICAgdmFyIG9iaiA9IHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicpO1xuICAgICAgaWYgKG9iaiAhPSAnbnVsbCcpIHtcbiAgICAgICAgdmFyIHByb2ZpbGVVc2VyTmFtZSA9IEpTT04ucGFyc2Uob2JqKTtcbiAgICAgICAgcmV0dXJuIHByb2ZpbGVVc2VyTmFtZS51c2VybmFtZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG4gIG9uU2xpZGVNb3ZlKGRhdGE6IGFueSkge1xuICAgIHRoaXMuaGVhZGVyLnRhYkluZGV4ID0gZGF0YS5pbmRleDtcbiAgICB0aGlzLnRvZ2dsZS5jaGFydE9yVGFibGUgPSBcImNoYXJ0XCI7XG4gICAgc3dpdGNoICh0aGlzLmhlYWRlci50YWJJbmRleCkge1xuICAgICAgY2FzZSAwOlxuICAgICAgICB0aGlzLmNhbGxNeURhc2hib2FyZCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgdGhpcy5jYWxsRmxpZ2h0UHJvY1N0YXR1cygpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgdGhpcy5jYWxsRmxpZ2h0Q291bnRCeVJlYXNvbigpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgdGhpcy5jYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbigpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH07XG4gIGNhbGxNeURhc2hib2FyZCgpIHtcbiAgICAgICAgdGhpcy5jYWxsRmxpZ2h0UHJvY1N0YXR1cygpO1xuICAgICAgICB0aGlzLmNhbGxGbGlnaHRDb3VudEJ5UmVhc29uKCk7XG4gICAgICAgIHRoaXMuY2FsbENvdXBvbkNvdW50QnlFeGNlcHRpb24oKTtcbiAgfVxuICBjYWxsRmxpZ2h0UHJvY1N0YXR1cygpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHJlcWRhdGEgPSB7XG4gICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VyTmFtZSxcbiAgICAgIHRvZ2dsZTE6ICcnLFxuICAgICAgZnVsbERhdGFGbGFnOiAnTidcbiAgICB9O1xuXG4gICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG4gICAgdGhpcy5vcGVyYXRpb25hbFNlcnZpY2UuZ2V0T3ByRmxpZ2h0UHJvY1N0YXR1cyhyZXFkYXRhKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICB2YXIgb3RoZXJDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogXCIjN0VEMzIxXCIgfSwgeyBcImNvbG9yXCI6IFwiIzRFQjJGOVwiIH0sXG4gICAgICAgICAgeyBcImNvbG9yXCI6IFwiI0ZGQzMwMFwiIH0sIHsgXCJjb2xvclwiOiBcIiM1QzZCQzBcIiB9XTtcbiAgICAgICAgdmFyIHBpZUNoYXJ0Q29sb3JzID0gW3sgXCJjb2xvclwiOiBcIiM0RUIyRjlcIiB9LCB7IFwiY29sb3JcIjogXCIjRkZDMzAwXCIgfSwgeyBcImNvbG9yXCI6IFwiIzVDNkJDMFwiIH1dO1xuXG4gICAgICAgIHZhciBqc29uT2JqID0gdGhhdC5hcHBseUNoYXJ0Q29sb3JDb2RlcyhkYXRhLnJlc3BvbnNlLmRhdGEsIHBpZUNoYXJ0Q29sb3JzLCBvdGhlckNoYXJ0Q29sb3JzKTtcbiAgICAgICAgdGhhdC5mbGlnaHRQcm9jU2VjdGlvbiA9IGpzb25PYmouc2VjdGlvbk5hbWU7XG4gICAgICAgIHZhciBwaWVDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLnBpZUNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XG4gICAgICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBtdWx0aUNoYXJ0cyA9IF8uZmlsdGVyKGpzb25PYmoubXVsdGliYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xuICAgICAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgc3RhY2tDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLnN0YWNrZWRCYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xuICAgICAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG4gICAgICAgIH0pOyAgICAgICAgICBcbiAgICAgICAgLy8gY29uc29sZS5sb2coc3RhY2tDaGFydHMpO1xuICAgICAgICBpZiAodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xuICAgICAgICAgIHRoYXQuZmxpZ2h0UHJvY1N0YXR1cyA9IHtcbiAgICAgICAgICAgIHBpZUNoYXJ0OiBwaWVDaGFydHNbMF0sXG4gICAgICAgICAgICB3ZWVrRGF0YTogbXVsdGlDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxuICAgICAgICAgICAgc3RhY2tlZENoYXJ0OiAoc3RhY2tDaGFydHMubGVuZ3RoKSA/IHN0YWNrQ2hhcnRzWzBdIDogW11cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhhdC5mbGlnaHRQcm9jU3RhdHVzID0ge1xuICAgICAgICAgICAgcGllQ2hhcnQ6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxuICAgICAgICAgICAgd2Vla0RhdGE6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxuICAgICAgICAgICAgc3RhY2tlZENoYXJ0OiBqc29uT2JqLnN0YWNrZWRCYXJDaGFydHNbMF1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coc3RhY2tDaGFydHMpO1xuICAgICAgICB0aGF0LiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoYXQuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpLnVwZGF0ZSgpO1xuICAgICAgICB9LCA1MDApO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0aGF0LmZsaWdodFByb2NTdGF0dXMud2Vla0RhdGEpKTtcbiAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgfSk7XG4gIH1cbiAgY2FsbEZsaWdodENvdW50QnlSZWFzb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciByZXFkYXRhID0ge1xuICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlck5hbWUsXG4gICAgICB0b2dnbGUxOiAnb3BlbicsXG4gICAgICBmdWxsRGF0YUZsYWc6ICdOJ1xuICAgIH07XG4gICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG4gICAgdGhpcy5vcGVyYXRpb25hbFNlcnZpY2UuZ2V0T3ByRmxpZ2h0Q291bnRCeVJlYXNvbihyZXFkYXRhKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhqc29uT2JqLnBpZUNoYXJ0c1swXSk7XG4gICAgICAgIHZhciBvdGhlckNoYXJ0Q29sb3JzID0gW3sgXCJjb2xvclwiOiBcIiMyOEFFRkRcIiB9LCB7IFwiY29sb3JcIjogXCIjRkZDMzAwXCIgfSwgeyBcImNvbG9yXCI6IFwiIzVDNkJDMFwiIH1dO1xuICAgICAgICB2YXIgcGllQ2hhcnRDb2xvcnMgPSBbeyBcImNvbG9yXCI6IFwiIzRFQjJGOVwiIH0sIHsgXCJjb2xvclwiOiBcIiNGRkMzMDBcIiB9LCB7IFwiY29sb3JcIjogXCIjNUM2QkMwXCIgfV07XG5cbiAgICAgICAgdmFyIGpzb25PYmogPSB0aGF0LmFwcGx5Q2hhcnRDb2xvckNvZGVzKGRhdGEucmVzcG9uc2UuZGF0YSwgcGllQ2hhcnRDb2xvcnMsIG90aGVyQ2hhcnRDb2xvcnMpO1xuICAgICAgICB0aGF0LmZsaWdodENvdW50U2VjdGlvbiA9IGpzb25PYmouc2VjdGlvbk5hbWU7XG4gICAgICAgIGlmICh0aGF0LmhlYWRlci50YWJJbmRleCA9PSAwKSB7XG4gICAgICAgICAgdGhhdC5mbGlnaHRDb3VudFJlYXNvbiA9IHRoYXQuZ2V0RmF2b3JpdGVJdGVtcyhqc29uT2JqKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGF0LmZsaWdodENvdW50UmVhc29uID0ge1xuICAgICAgICAgICAgcGllQ2hhcnQ6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxuICAgICAgICAgICAgd2Vla0RhdGE6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxuICAgICAgICAgICAgc3RhY2tlZENoYXJ0OiBqc29uT2JqLnN0YWNrZWRCYXJDaGFydHNbMF1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGF0LiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoYXQuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpLnVwZGF0ZSgpO1xuICAgICAgICB9LCA3MDApO1xuICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgfSk7XG4gIH1cbiAgY2FsbENvdXBvbkNvdW50QnlFeGNlcHRpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciByZXFkYXRhID0ge1xuICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlck5hbWUsXG4gICAgICB0b2dnbGUxOiAnJyxcbiAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXG4gICAgfTtcbiAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcbiAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJDb3Vwb25Db3VudEJ5RXhjZXB0aW9uKHJlcWRhdGEpXG4gICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHZhciBvdGhlckNoYXJ0Q29sb3JzID0gW3sgXCJjb2xvclwiOiBcIiM0RUIyRjlcIiB9LCB7IFwiY29sb3JcIjogXCIjRkZDMzAwXCIgfSwgeyBcImNvbG9yXCI6IFwiIzVDNkJDMFwiIH1dO1xuICAgICAgICB2YXIgcGllQ2hhcnRDb2xvcnMgPSBbeyBcImNvbG9yXCI6IFwiIzRFQjJGOVwiIH0sIHsgXCJjb2xvclwiOiBcIiNGRkMzMDBcIiB9LCB7IFwiY29sb3JcIjogXCIjNUM2QkMwXCIgfV07XG5cbiAgICAgICAgdmFyIGpzb25PYmogPSB0aGF0LmFwcGx5Q2hhcnRDb2xvckNvZGVzKGRhdGEucmVzcG9uc2UuZGF0YSwgcGllQ2hhcnRDb2xvcnMsIG90aGVyQ2hhcnRDb2xvcnMpO1xuICAgICAgICB0aGF0LmNvdXBvbkNvdW50U2VjdGlvbiA9IGpzb25PYmouc2VjdGlvbk5hbWU7XG4gICAgICAgIGlmICh0aGF0LmhlYWRlci50YWJJbmRleCA9PSAwKSB7XG4gICAgICAgICAgdGhhdC5jb3Vwb25Db3VudEV4Y2VwdGlvbiA9IHRoYXQuZ2V0RmF2b3JpdGVJdGVtcyhqc29uT2JqKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGF0LmNvdXBvbkNvdW50RXhjZXB0aW9uID0ge1xuICAgICAgICAgICAgcGllQ2hhcnQ6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxuICAgICAgICAgICAgd2Vla0RhdGE6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxuICAgICAgICAgICAgc3RhY2tlZENoYXJ0OiBqc29uT2JqLnN0YWNrZWRCYXJDaGFydHNbMF1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhhdC4kdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGF0LiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGEnKS51cGRhdGUoKTtcbiAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgIH0pO1xuICB9XG4gIG9wZW5Qb3BvdmVyKCRldmVudCwgY2hhcnR0eXBlLCBpbmRleCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgdGVtcCA9IHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpO1xuICAgIHRoYXQuY3VycmVudEluZGV4ID0gdGVtcC5jdXJyZW50SW5kZXgoKTtcbiAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB0aGlzLmNoYXJ0dHlwZSA9IGNoYXJ0dHlwZTtcbiAgICB0aGlzLmdyYXBoVHlwZSA9IGluZGV4O1xuICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vZ3JhcGgtcG9wb3Zlci5odG1sJywge1xuICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXG4gICAgfSkudGhlbihmdW5jdGlvbihwb3BvdmVyKSB7XG4gICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XG4gICAgICB0aGF0LmdyYXBocG9wb3ZlciA9IHBvcG92ZXI7XG4gICAgICB0aGF0LmdyYXBocG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgfSk7XG4gIH1cblxuICBjbG9zZVBvcG92ZXIoKSB7XG4gICAgdGhpcy5ncmFwaHBvcG92ZXIuaGlkZSgpO1xuICB9O1xuICBpb25pY0xvYWRpbmdTaG93KCkge1xuICAgIHRoaXMuJGlvbmljTG9hZGluZy5zaG93KHtcbiAgICAgIHRlbXBsYXRlOiAnPGlvbi1zcGlubmVyIGNsYXNzPVwic3Bpbm5lci1jYWxtXCI+PC9pb24tc3Bpbm5lcj4nXG4gICAgfSk7XG4gIH07XG4gIGFwcGx5Q2hhcnRDb2xvckNvZGVzKGpzb25PYmo6IGFueSwgcGllQ2hhcnRDb2xvcnM6IGFueSwgb3RoZXJDaGFydENvbG9yczogYW55KSB7XG4gICAgXy5mb3JFYWNoKGpzb25PYmoucGllQ2hhcnRzWzBdLmRhdGEsIGZ1bmN0aW9uKG46IGFueSwgdmFsdWU6IGFueSkge1xuICAgICAgbi5sYWJlbCA9IG4ueHZhbDtcbiAgICAgIG4udmFsdWUgPSBuLnl2YWw7XG4gICAgfSk7XG4gICAgXy5tZXJnZShqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCBwaWVDaGFydENvbG9ycyk7XG4gICAgXy5tZXJnZShqc29uT2JqLnN0YWNrZWRCYXJDaGFydHNbMF0uc3RhY2tlZEJhcmNoYXJ0SXRlbXMsIG90aGVyQ2hhcnRDb2xvcnMpO1xuICAgIF8ubWVyZ2UoanNvbk9iai5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsIG90aGVyQ2hhcnRDb2xvcnMpO1xuICAgIHJldHVybiBqc29uT2JqO1xuXG4gIH1cbiAgZ2V0RmF2b3JpdGVJdGVtcyhqc29uT2JqOiBhbnkpIHtcbiAgICB2YXIgcGllQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5waWVDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xuICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcbiAgICB9KTtcbiAgICB2YXIgbXVsdGlDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLm11bHRpYmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcbiAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG4gICAgfSk7XG4gICAgdmFyIHN0YWNrQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcbiAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG4gICAgfSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBpZUNoYXJ0OiBwaWVDaGFydHNbMF0sXG4gICAgICB3ZWVrRGF0YTogKG11bHRpQ2hhcnRzLmxlbmd0aCkgPyBtdWx0aUNoYXJ0cy5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMgOiBbXSxcbiAgICAgIHN0YWNrZWRDaGFydDogKHN0YWNrQ2hhcnRzLmxlbmd0aCkgPyBzdGFja0NoYXJ0c1swXSA6IFtdXG4gICAgfVxuICB9XG5cbiAgY29sb3JGdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgIHJldHVybiB0aGF0LnRocmVlQmFyQ2hhcnRDb2xvcnNbaV07XG4gICAgfTtcbiAgfVxuICBmb3VyQmFyQ29sb3JGdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgIHJldHVybiB0aGF0LmZvdXJCYXJDaGFydENvbG9yc1tpXTtcbiAgICB9O1xuICB9XG4gIG9wZW5pbmZvUG9wb3ZlcigkZXZlbnQsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBpbmRleCA9PSBcInVuZGVmaW5lZFwiIHx8IGluZGV4ID09IFwiXCIpIHtcbiAgICAgIHRoaXMuaW5mb2RhdGEgPSAnTm8gaW5mbyBhdmFpbGFibGUnO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuaW5mb2RhdGEgPSBpbmRleDtcbiAgICB9XG4gICAgY29uc29sZS5sb2coaW5kZXgpO1xuICAgIHRoaXMuaW5mb3BvcG92ZXIuc2hvdygkZXZlbnQpO1xuICB9O1xuICBjbG9zZUluZm9Qb3BvdmVyKCkge1xuICAgIHRoaXMuaW5mb3BvcG92ZXIuaGlkZSgpO1xuICB9XG4gIHRvZ2dsZUNvdW50KHZhbCkge1xuICAgIHRoaXMudG9nZ2xlLm9wZW5PckNsb3NlZCA9IHZhbDtcbiAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xuICB9XG4gIGlvbmljTG9hZGluZ0hpZGUoKSB7XG4gICAgdGhpcy4kaW9uaWNMb2FkaW5nLmhpZGUoKTtcbiAgfTtcbiAgbG9ja1NsaWRlKCkge1xuICAgIGNvbnNvbGUubG9nKCdpbiBsb2NrU2xpZGUgbWVodG9kLi4nKTtcbiAgICB0aGlzLiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGEnKS5lbmFibGVTbGlkZShmYWxzZSk7XG4gIH07XG4gIHdlZWtEYXRhUHJldigpIHtcbiAgICB0aGlzLiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGEnKS5wcmV2aW91cygpO1xuICB9O1xuICB3ZWVrRGF0YU5leHQoKSB7XG4gICAgdGhpcy4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykubmV4dCgpO1xuICB9XG4gIHRvZ2dsZUZsaWdodFN0YXR1c1ZpZXcodmFsOiBzdHJpbmcpIHtcbiAgICB0aGlzLnRvZ2dsZS5mbGlnaHRTdGF0dXMgPSB2YWw7XG4gIH1cbiAgdG9nZ2xlRmxpZ2h0UmVhc29uVmlldyh2YWw6IHN0cmluZykge1xuICAgIHRoaXMudG9nZ2xlLmZsaWdodFJlYXNvbiA9IHZhbDtcbiAgfVxuICB0b2dnbGVDQ0V4Y2VwdGlvblZpZXcodmFsOiBzdHJpbmcpIHtcbiAgICB0aGlzLnRvZ2dsZS5jY0V4Y2VwdGlvbiA9IHZhbDtcbiAgfSAgIFxuICBydW5SZXBvcnQoY2hhcnRUaXRsZTogc3RyaW5nLCBtb250aE9yWWVhcjogc3RyaW5nLCBmbG93bk1vbnRoOiBzdHJpbmcpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgLy9pZiBubyBjb3Jkb3ZhLCB0aGVuIHJ1bm5pbmcgaW4gYnJvd3NlciBhbmQgbmVlZCB0byB1c2UgZGF0YVVSTCBhbmQgaWZyYW1lXG4gICAgaWYgKCF3aW5kb3cuY29yZG92YSkge1xuICAgICAgdGhhdC5pb25pY0xvYWRpbmdTaG93KCk7XG4gICAgICB0aGlzLnJlcG9ydFN2Yy5ydW5SZXBvcnREYXRhVVJMKGNoYXJ0VGl0bGUsIG1vbnRoT3JZZWFyLCBmbG93bk1vbnRoKVxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhVVJMKSB7XG4gICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgICAgLy9zZXQgdGhlIGlmcmFtZSBzb3VyY2UgdG8gdGhlIGRhdGFVUkwgY3JlYXRlZFxuICAgICAgICAgIC8vY29uc29sZS5sb2coZGF0YVVSTCk7XG4gICAgICAgICAgLy9kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGRmSW1hZ2UnKS5zcmMgPSBkYXRhVVJMO1xuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcbiAgICAgICAgfSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy9pZiBjb2Ryb3ZhLCB0aGVuIHJ1bm5pbmcgaW4gZGV2aWNlL2VtdWxhdG9yIGFuZCBhYmxlIHRvIHNhdmUgZmlsZSBhbmQgb3BlbiB3LyBJbkFwcEJyb3dzZXJcbiAgICBlbHNlIHtcbiAgICAgIHRoYXQuaW9uaWNMb2FkaW5nU2hvdygpO1xuICAgICAgdGhpcy5yZXBvcnRTdmMucnVuUmVwb3J0QXN5bmMoY2hhcnRUaXRsZSwgbW9udGhPclllYXIsIGZsb3duTW9udGgpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGZpbGVQYXRoKSB7XG4gICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgICAgLy9sb2cgdGhlIGZpbGUgbG9jYXRpb24gZm9yIGRlYnVnZ2luZyBhbmQgb29wZW4gd2l0aCBpbmFwcGJyb3dzZXJcbiAgICAgICAgICBjb25zb2xlLmxvZygncmVwb3J0IHJ1biBvbiBkZXZpY2UgdXNpbmcgRmlsZSBwbHVnaW4nKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnUmVwb3J0Q3RybDogT3BlbmluZyBQREYgRmlsZSAoJyArIGZpbGVQYXRoICsgJyknKTtcbiAgICAgICAgICB2YXIgbGFzdFBhcnQgPSBmaWxlUGF0aC5zcGxpdChcIi9cIikucG9wKCk7XG4gICAgICAgICAgdmFyIGZpbGVOYW1lID0gXCIvbW50L3NkY2FyZC9cIiArIGxhc3RQYXJ0O1xuICAgICAgICAgIGlmIChkZXZpY2UucGxhdGZvcm0gIT0gXCJBbmRyb2lkXCIpXG4gICAgICAgICAgICBmaWxlTmFtZSA9IGZpbGVQYXRoO1xuICAgICAgICAgIC8vd2luZG93Lm9wZW5QREYoZmlsZU5hbWUpO1xuICAgICAgICAgIC8vZWxzZVxuICAgICAgICAgIC8vd2luZG93Lm9wZW4oZmlsZVBhdGgsICdfYmxhbmsnLCAnbG9jYXRpb249bm8sY2xvc2VidXR0b25jYXB0aW9uPUNsb3NlLGVuYWJsZVZpZXdwb3J0U2NhbGU9eWVzJyk7Ki9cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgY29yZG92YS5wbHVnaW5zLmZpbGVPcGVuZXIyLm9wZW4oXG4gICAgICAgICAgICBmaWxlTmFtZSxcbiAgICAgICAgICAgICdhcHBsaWNhdGlvbi9wZGYnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciBzdGF0dXM6ICcgKyBlLnN0YXR1cyArICcgLSBFcnJvciBtZXNzYWdlOiAnICsgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2ZpbGUgb3BlbmVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XG4gICAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgb3BlbkZsaWdodFByb2Nlc3NEcmlsbFBvcG92ZXIoJGV2ZW50LCBkYXRhLCBzZWxGaW5kTGV2ZWwpIHtcbiAgICB0aGlzLmRyaWxsTmFtZSA9ICdGTElHSFQgUFJPQ0VTU0lORyBTVEFUVVMgLSAnICsgZGF0YS5wb2ludFswXSArICctJyArIHRoaXMuaGVhZGVyLmZsb3duTW9udGg7XG4gICAgdGhpcy5kcmlsbFR5cGUgPSAnZmxpZ2h0LXByb2Nlc3MnO1xuICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgdGhpcy5kcmlsbHRhYnMgPSBbJ0NvdW50cnkgTGV2ZWwnLCAnU2VjdG9yIExldmVsJywgJ0ZsaWdodCBMZXZlbCcsICdEb2N1bWVudCBMZXZlbCddO1xuICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydjb3VudHJ5RnJvbScsICdmbG93blNlY3RvcicsICdmbGlnaHROdW1iZXInLCAnY2FycmllckNvZGUjJ107XG4gICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcbiAgICB0aGlzLmRyaWxscG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgdGhpcy5zaG93bkdyb3VwID0gMDtcbiAgICB0aGlzLm9wZW5EcmlsbERvd24oZGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcbiAgfTtcblxuICBvcGVuQ291bnBvbkNvdW50RHJpbGxQb3BvdmVyKCRldmVudCwgZGF0YSwgc2VsRmluZExldmVsKSB7XG4gICAgdGhpcy5kcmlsbE5hbWUgPSAnQ09VUE9OIENPVU5UIEJZIEVYQ0VQVElPTiBDQVRFR09SWSAnO1xuICAgIHRoaXMuZHJpbGxUeXBlID0gJ2NvdXBvbi1jb3VudCc7XG4gICAgdGhpcy5ncm91cHMgPSBbXTtcbiAgICB0aGlzLmRyaWxsdGFicyA9IFsnQ291cG9uIENvdW50IEZsaWdodCBTdGF0dXMnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcbiAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsnZmxpZ2h0TnVtYmVyJywgJ2Zsb3duU2VjdG9yJ107XG4gICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcbiAgICB0aGlzLmRyaWxscG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgdGhpcy5zaG93bkdyb3VwID0gMDtcbiAgICB0aGlzLm9wZW5EcmlsbERvd24oZGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcbiAgfTtcblxuICBvcGVuRmxpZ2h0Q291bnREcmlsbFBvcG92ZXIoJGV2ZW50LCBkYXRhLCBzZWxGaW5kTGV2ZWwpIHtcbiAgICB0aGlzLmRyaWxsTmFtZSA9ICdMSVNUIE9GIE9QRU4gRkxJR0hUUyBGT1IgJyArIGRhdGEucG9pbnRbMF0gKyAnLScgKyB0aGlzLmhlYWRlci5mbG93bk1vbnRoICsgJyBCWSBSRUFTT04gJztcbiAgICB0aGlzLmRyaWxsVHlwZSA9ICdmbGlnaHQtY291bnQnO1xuICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgdGhpcy5kcmlsbHRhYnMgPSBbJ09wZW4gRmxpZ2h0IFN0YXR1cycsICdEb2N1bWVudCBMZXZlbCddO1xuICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydmbGlnaHROdW1iZXInLCAnY2FycmllckNvZGUnXTtcbiAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xuICAgIHRoaXMuZHJpbGxwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICB0aGlzLnNob3duR3JvdXAgPSAwO1xuICAgIHRoaXMub3BlbkRyaWxsRG93bihkYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xuICB9O1xuXG4gIGRyaWxsRG93blJlcXVlc3QoZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpIHtcbiAgICB2YXIgcmVxZGF0YTtcbiAgICBpZiAoZHJpbGxUeXBlID09ICdmbGlnaHQtcHJvY2VzcycpIHtcbiAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xuICAgICAgaWYgKGRhdGEubGFiZWwpIHtcbiAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YVswXTtcbiAgICAgIH1cblxuICAgICAgdmFyIGZsaWdodERhdGU7XG4gICAgICAvL2ZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IFN0cmluZyhkYXRhLmZsaWdodERhdGUpIDogU3RyaW5nKGRhdGFbMF0pO1xuICAgICAgZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gZGF0YS5mbGlnaHREYXRlIDogMTtcbiAgICAgIHZhciBjb3VudHJ5RnJvbVRvID0gKGRhdGEuY291bnRyeUZyb20gJiYgZGF0YS5jb3VudHJ5VG8pID8gZGF0YS5jb3VudHJ5RnJvbSArICctJyArIGRhdGEuY291bnRyeVRvIDogXCJcIjtcbiAgICAgIHZhciBzZWN0b3JGcm9tVG8gPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcbiAgICAgIHZhciBmbGlnaHROdW1iZXIgPSAoZGF0YS5mbGlnaHROdW1iZXIpID8gZGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xuXG5cblxuICAgICAgcmVxZGF0YSA9IHtcbiAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgIFwidXNlcklkXCI6IHRoaXMuZ2V0UHJvZmlsZVVzZXJOYW1lKCksXG4gICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwiXCIsXG4gICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxuICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcbiAgICAgICAgXCJmbGlnaHREYXRlXCI6IGZsaWdodERhdGUsXG4gICAgICAgIFwiY291bnRyeUZyb21Ub1wiOiBjb3VudHJ5RnJvbVRvLFxuICAgICAgICBcInNlY3RvckZyb21Ub1wiOiBzZWN0b3JGcm9tVG8sXG4gICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlclxuICAgICAgfTtcbiAgICB9XG5cblxuICAgIGlmIChkcmlsbFR5cGUgPT0gJ2NvdXBvbi1jb3VudCcpIHtcbiAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xuICAgICAgaWYgKGRhdGEubGFiZWwpIHtcbiAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YVswXTtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkpO1xuICAgICAgdmFyIGZsaWdodERhdGU7XG4gICAgICAvL2ZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IFN0cmluZyhkYXRhLmZsaWdodERhdGUpIDogU3RyaW5nKGRhdGFbMF0pO1xuICAgICAgZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gZGF0YS5mbGlnaHREYXRlIDogMTtcbiAgICAgIHZhciBleGNlcHRpb25DYXRlZ29yeSA9ICh0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5ICYmIGRyaWxsTGV2ZWwgPiAxKSA/IHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkgOiBcIlwiO1xuICAgICAgdmFyIGZsaWdodFNlY3RvciA9IChkYXRhLmZsb3duU2VjdG9yKSA/IGRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xuICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XG5cblxuXG4gICAgICByZXFkYXRhID0ge1xuICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5nZXRQcm9maWxlVXNlck5hbWUoKSxcbiAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJcIixcbiAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXG4gICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxuICAgICAgICBcImV4Y2VwdGlvbkNhdGVnb3J5XCI6IGV4Y2VwdGlvbkNhdGVnb3J5LFxuICAgICAgICBcImZsaWdodE51bWJlclwiOiBmbGlnaHROdW1iZXIsXG4gICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiBmbGlnaHREYXRlLFxuICAgICAgICBcImZsaWdodFNlY3RvclwiOiBmbGlnaHRTZWN0b3IsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmIChkcmlsbFR5cGUgPT0gJ2ZsaWdodC1jb3VudCcpIHtcbiAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xuICAgICAgaWYgKGRhdGEubGFiZWwpIHtcbiAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YVswXTtcbiAgICAgIH1cbiAgICAgIHZhciBmbGlnaHREYXRlO1xuICAgICAgLy9mbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBTdHJpbmcoZGF0YS5mbGlnaHREYXRlKSA6IFN0cmluZyhkYXRhWzBdKTtcbiAgICAgIGZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IGRhdGEuZmxpZ2h0RGF0ZSA6IDE7XG4gICAgICB2YXIgdG9nZ2xlMSA9IHRoaXMudG9nZ2xlLm9wZW5PckNsb3NlZC50b0xvd2VyQ2FzZSgpO1xuICAgICAgdmFyIGZsaWdodFNlY3RvciA9IChkYXRhLmZsb3duU2VjdG9yKSA/IGRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xuICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XG4gICAgICB2YXIgZmxpZ2h0U3RhdHVzID0gKHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkgJiYgZHJpbGxMZXZlbCA+IDEpID8gdGhpcy5leGNlcHRpb25DYXRlZ29yeSA6IFwiXCI7XG5cblxuICAgICAgcmVxZGF0YSA9IHtcbiAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgIFwidXNlcklkXCI6IHRoaXMuZ2V0UHJvZmlsZVVzZXJOYW1lKCksXG4gICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwiXCIsXG4gICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxuICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcbiAgICAgICAgXCJ0b2dnbGUxXCI6IHRvZ2dsZTEsXG4gICAgICAgIFwiZmxpZ2h0U3RhdHVzXCI6IGZsaWdodFN0YXR1cyxcbiAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxuICAgICAgICBcImZsaWdodERhdGVcIjogZmxpZ2h0RGF0ZSxcbiAgICAgICAgXCJmbGlnaHRTZWN0b3JcIjogZmxpZ2h0U2VjdG9yLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVxZGF0YTtcbiAgfVxuXG4gIGdldERyaWxsRG93blVSTChkcmlsRG93blR5cGUpIHtcbiAgICB2YXIgdXJsXG4gICAgc3dpdGNoIChkcmlsRG93blR5cGUpIHtcbiAgICAgIGNhc2UgJ2ZsaWdodC1wcm9jZXNzJzpcbiAgICAgICAgdXJsID0gXCIvcGF4Zmxub3ByL2ZsaWdodHByb2Nlc3NpbmdzdGF0dXNkcmlsbFwiO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2NvdXBvbi1jb3VudCc6XG4gICAgICAgIHVybCA9IFwiL3BheGZsbm9wci9jb3Vwb25jb3VudGJ5ZXhwZHJpbGxcIjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdmbGlnaHQtY291bnQnOlxuICAgICAgICB1cmwgPSBcIi9wYXhmbG5vcHIvZmxpZ2h0Y291bnRieXJlYXNvbmRyaWxsXCI7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gdXJsO1xuICB9XG4gIHRhYlNsaWRlSGFzQ2hhbmdlZChpbmRleCkge1xuICAgIHZhciBkYXRhID0gdGhpcy5ncm91cHNbMF0uY29tcGxldGVEYXRhWzBdO1xuICAgIHRoaXMuZ3JvdXBzWzBdLml0ZW1zWzBdID0gZGF0YVtpbmRleF0udmFsdWVzO1xuICAgIHRoaXMuZ3JvdXBzWzBdLm9yZ0l0ZW1zWzBdID0gZGF0YVtpbmRleF0udmFsdWVzO1xuICAgIHRoaXMuc29ydCgnJywgMCwgZmFsc2UpO1xuICAgIHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkgPSBkYXRhW2luZGV4XS5rZXk7XG4gIH1cblxuICBvcGVuRHJpbGxEb3duKGRhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgIHNlbEZpbmRMZXZlbCA9IE51bWJlcihzZWxGaW5kTGV2ZWwpO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsXSA9IGRhdGE7XG4gICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbCArIDFdID0gJyc7XG5cbiAgICBpZiAoc2VsRmluZExldmVsICE9ICh0aGlzLmdyb3Vwcy5sZW5ndGggLSAxKSkge1xuICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XG4gICAgICB2YXIgcmVxZGF0YSA9IHRoaXMuZHJpbGxEb3duUmVxdWVzdCh0aGlzLmRyaWxsVHlwZSwgc2VsRmluZExldmVsLCBkYXRhKTtcbiAgICAgIHZhciBVUkwgPSB0aGlzLmdldERyaWxsRG93blVSTCh0aGlzLmRyaWxsVHlwZSk7XG4gICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcbiAgICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldERyaWxsRG93bihyZXFkYXRhLCBVUkwpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICB2YXIgZGF0YSA9IGRhdGEucmVzcG9uc2U7XG4gICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgdmFyIGZpbmRMZXZlbCA9IGRyaWxsTGV2ZWwgLSAxO1xuICAgICAgICAgIGlmIChkYXRhLnN0YXR1cyA9PSAnc3VjY2VzcycpIHtcbiAgICAgICAgICAgIHZhciByZXNwUmVzdWx0O1xuICAgICAgICAgICAgaWYgKGRhdGEuZGF0YS5yb3dzKSB7XG4gICAgICAgICAgICAgIHJlc3BSZXN1bHQgPSBkYXRhLmRhdGEucm93cztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3BSZXN1bHQgPSBkYXRhLmRhdGE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICgodGhhdC5kcmlsbFR5cGUgPT0gJ2NvdXBvbi1jb3VudCcgfHwgdGhhdC5kcmlsbFR5cGUgPT0gJ2ZsaWdodC1jb3VudCcpICYmIGRhdGEuZGF0YS5yb3dzKSB7XG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSByZXNwUmVzdWx0WzBdLnZhbHVlcztcbiAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5vcmdJdGVtc1swXSA9IHJlc3BSZXN1bHRbMF0udmFsdWVzO1xuICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLmNvbXBsZXRlRGF0YVswXSA9IHJlc3BSZXN1bHQ7XG4gICAgICAgICAgICAgIHRoYXQuZXhjZXB0aW9uQ2F0ZWdvcnkgPSByZXNwUmVzdWx0WzBdLmtleTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSByZXNwUmVzdWx0O1xuICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gcmVzcFJlc3VsdDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xuICAgICAgICAgICAgdGhhdC5zb3J0KCcnLCBmaW5kTGV2ZWwsIGZhbHNlKTtcbiAgICAgICAgICAgIHRoYXQuY2xlYXJEcmlsbChkcmlsbExldmVsKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xuICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGZpbmRMZXZlbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgIHRoYXQuY2xvc2VzUG9wb3ZlcigpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICBhbGVydCgnU2VydmVyIEVycm9yJyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGNsb3NlRHJpbGxQb3BvdmVyKCkge1xuICAgIHRoaXMuZHJpbGxwb3BvdmVyLmhpZGUoKTtcbiAgfVxuXG4gIGNsZWFyRHJpbGwobGV2ZWw6IG51bWJlcikge1xuICAgIHZhciBpOiBudW1iZXI7XG4gICAgZm9yICh2YXIgaSA9IGxldmVsOyBpIDwgdGhpcy5kcmlsbHRhYnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuZ3JvdXBzW2ldLml0ZW1zLnNwbGljZSgwLCAxKTtcbiAgICAgIHRoaXMuZ3JvdXBzW2ldLm9yZ0l0ZW1zLnNwbGljZSgwLCAxKTtcbiAgICAgIHRoaXMuc29ydCgnJywgaSwgZmFsc2UpO1xuICAgIH1cbiAgfVxuICBpbml0aWF0ZUFycmF5KGRyaWxsdGFicykge1xuICAgIGZvciAodmFyIGkgaW4gZHJpbGx0YWJzKSB7XG4gICAgICB0aGlzLmdyb3Vwc1tpXSA9IHtcbiAgICAgICAgaWQ6IGksXG4gICAgICAgIG5hbWU6IHRoaXMuZHJpbGx0YWJzW2ldLFxuICAgICAgICBpdGVtczogW10sXG4gICAgICAgIG9yZ0l0ZW1zOiBbXSxcbiAgICAgICAgSXRlbXNCeVBhZ2U6IFtdLFxuICAgICAgICBjb21wbGV0ZURhdGE6IFtdLFxuICAgICAgICBmaXJzdENvbHVtbnM6IHRoaXMuZmlyc3RDb2x1bW5zW2ldXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGlzRHJpbGxSb3dTZWxlY3RlZChsZXZlbCwgb2JqKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0ZWREcmlsbFtsZXZlbF0gPT0gb2JqO1xuICB9XG4gIHNlYXJjaFJlc3VsdHMobGV2ZWwsIG9iaikge1xuICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuZmlsdGVyZWRMaXN0U2VydmljZS5zZWFyY2hlZCh0aGlzLmdyb3Vwc1tsZXZlbF0ub3JnSXRlbXNbMF0sIG9iai5zZWFyY2hUZXh0LCBsZXZlbCwgdGhpcy5kcmlsbFR5cGUpO1xuICAgIGlmIChvYmouc2VhcmNoVGV4dCA9PSAnJykge1xuICAgICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XG4gICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0ub3JnSXRlbXNbMF07XG4gICAgfVxuICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcbiAgICB0aGlzLnBhZ2luYXRpb24obGV2ZWwpO1xuICB9XG4gIHBhZ2luYXRpb24obGV2ZWwpIHtcbiAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UgPSB0aGlzLmZpbHRlcmVkTGlzdFNlcnZpY2UucGFnZWQodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLnBhZ2VTaXplKTtcbiAgfTtcbiAgc2V0UGFnZShsZXZlbCwgcGFnZW5vKSB7XG4gICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSBwYWdlbm87XG4gIH07XG4gIGxhc3RQYWdlKGxldmVsKSB7XG4gICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UubGVuZ3RoIC0gMTtcbiAgfTtcbiAgcmVzZXRBbGwobGV2ZWwpIHtcbiAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IDA7XG4gIH1cbiAgc29ydChzb3J0QnksIGxldmVsLCBvcmRlcikge1xuICAgIHRoaXMucmVzZXRBbGwobGV2ZWwpO1xuICAgIHRoaXMuY29sdW1uVG9PcmRlciA9IHNvcnRCeTsgXG4gICAgLy8kRmlsdGVyIC0gU3RhbmRhcmQgU2VydmljZVxuICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuJGZpbHRlcignb3JkZXJCeScpKHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSwgdGhpcy5jb2x1bW5Ub09yZGVyLCBvcmRlcik7XG4gICAgdGhpcy5wYWdpbmF0aW9uKGxldmVsKTtcbiAgfTtcbiAgcmFuZ2UodG90YWwsIGxldmVsKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIHZhciBzdGFydDogbnVtYmVyO1xuICAgIHN0YXJ0ID0gTnVtYmVyKHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdKSAtIDI7XG4gICAgaWYgKHN0YXJ0IDwgMCkge1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgICB2YXIgayA9IDE7XG4gICAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgdG90YWw7IGkrKykge1xuICAgICAgcmV0LnB1c2goaSk7XG4gICAgICBrKys7XG4gICAgICBpZiAoayA+IDYpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cbiAgdG9nZ2xlR3JvdXAoZ3JvdXApIHtcbiAgICBpZiAodGhpcy5pc0dyb3VwU2hvd24oZ3JvdXApKSB7XG4gICAgICB0aGlzLnNob3duR3JvdXAgPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3duR3JvdXAgPSBncm91cDtcbiAgICB9XG4gIH1cbiAgaXNHcm91cFNob3duKGdyb3VwOiBudW1iZXIpIHtcbiAgICByZXR1cm4gdGhpcy5zaG93bkdyb3VwID09IGdyb3VwO1xuICB9XG5cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG5cbmNsYXNzIExvZ2luQ29udHJvbGxlciB7XG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHNjb3BlJywgJyRzdGF0ZScsICdVc2VyU2VydmljZScsICckaW9uaWNIaXN0b3J5J107XG5cdHByaXZhdGUgaW52YWxpZE1lc3NhZ2U6IGJvb2xlYW4gPSBmYWxzZTtcblx0cHJpdmF0ZSB1c2VybmFtZTogc3RyaW5nO1xuXHRwcml2YXRlIHBhc3N3b3JkOiBzdHJpbmc7XG5cdHByaXZhdGUgaXBhZGRyZXNzOiBzdHJpbmc7XG5cdHByaXZhdGUgZXJvb3JtZXNzYWdlOiBzdHJpbmc7XG5cblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSwgcHJpdmF0ZSAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSxcblx0cHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UsIHByaXZhdGUgJGlvbmljSGlzdG9yeTogYW55KSB7XG5cdFx0aWYgKHRoaXMudXNlclNlcnZpY2UuaXNMb2dnZWRJbigpKSB7XG5cdFx0XHQkaW9uaWNIaXN0b3J5Lm5leHRWaWV3T3B0aW9ucyh7XG5cdFx0XHRcdGRpc2FibGVCYWNrOiB0cnVlXG5cdFx0XHR9KTtcblx0XHRcdGNvbnNvbGUubG9nKCduYXZnYXRpbmcgdG8gbWlzLWZsb3duLi4nKTtcblx0XHRcdHRoaXMuJHN0YXRlLmdvKCdhcHAubWlzLWZsb3duJyk7XG5cdFx0fVxuXHR9XG5cblx0Y2xlYXJFcnJvcigpIHtcblx0XHR0aGlzLmludmFsaWRNZXNzYWdlID0gZmFsc2U7XG5cdH1cblxuXHRkb0xvZ2luKGxvZ2luRm9ybTogYm9vbGVhbikge1xuXHRcdGlmICghbG9naW5Gb3JtKSB7XG5cdFx0XHRpZiAoIWFuZ3VsYXIuaXNEZWZpbmVkKHRoaXMudXNlcm5hbWUpIHx8ICFhbmd1bGFyLmlzRGVmaW5lZCh0aGlzLnBhc3N3b3JkKSB8fCAhYW5ndWxhci5pc0RlZmluZWQodGhpcy5pcGFkZHJlc3MpIHx8dGhpcy51c2VybmFtZS50cmltKCkgPT0gXCJcIiB8fCB0aGlzLnBhc3N3b3JkLnRyaW0oKSA9PSBcIlwiIHx8IHRoaXMuaXBhZGRyZXNzLnRyaW0oKSA9PSBcIlwiKSB7XG5cdFx0XHRcdHRoaXMuaW52YWxpZE1lc3NhZ2UgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0U0VSVkVSX1VSTCA9ICdodHRwOi8vJyArIHRoaXMuaXBhZGRyZXNzICsgJy8nICsgJ3JhcGlkLXdzL3NlcnZpY2VzL3Jlc3QnO1xuXHRcdFx0dGhpcy51c2VyU2VydmljZS5sb2dpbih0aGlzLnVzZXJuYW1lLHRoaXMucGFzc3dvcmQpLnRoZW4oXG5cdFx0XHRcdChyZXN1bHQpID0+IHtcblx0XHRcdFx0XHRpZiAocmVzdWx0LnJlc3BvbnNlLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1x0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0dmFyIHJlcSA9IHtcblx0XHRcdFx0XHRcdFx0dXNlcklkOiB0aGlzLnVzZXJuYW1lXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR0aGlzLnVzZXJTZXJ2aWNlLmdldFVzZXJQcm9maWxlKHJlcSkudGhlbihcblx0XHRcdFx0XHRcdFx0KHByb2ZpbGUpID0+IHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgdXNlck5hbWUgPSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR1c2VybmFtZTogcHJvZmlsZS5yZXNwb25zZS5kYXRhLnVzZXJJbmZvLnVzZXJOYW1lXG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudXNlclNlcnZpY2Uuc2V0VXNlcih1c2VyTmFtZSk7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy4kaW9uaWNIaXN0b3J5Lm5leHRWaWV3T3B0aW9ucyh7XG5cdFx0XHRcdFx0XHRcdFx0XHRkaXNhYmxlQmFjazogdHJ1ZVxuXHRcdFx0XHRcdFx0XHRcdH0pOyBcblx0XHRcdFx0XHRcdFx0XHR0aGlzLiRzdGF0ZS5nbyhcImFwcC5taXMtZmxvd25cIik7XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkIG9uIGxvYWRpbmcgdXNlciBwcm9maWxlJyk7XG5cdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0aGlzLmludmFsaWRNZXNzYWdlID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHRoaXMuZXJvb3JtZXNzYWdlID0gXCJQbGVhc2UgY2hlY2sgeW91ciBjcmVkZW50aWFsc1wiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy5pbnZhbGlkTWVzc2FnZSA9IHRydWU7XG5cdFx0XHRcdFx0dGhpcy5lcm9vcm1lc3NhZ2UgPSBcIlBsZWFzZSBjaGVjayB5b3VyIG5ldHdvcmsgY29ubmVjdGlvblwiO1xuXHRcdFx0XHR9KTtcblx0XHR9IFxuXHR9XG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cblxuY2xhc3MgQ2hhcnRFdmVudCBpbXBsZW1lbnRzIG5nLklEaXJlY3RpdmUge1xuXHRyZXN0cmljdCA9ICdFJztcblx0c2NvcGUgPSB7XG5cdFx0dHlwZTogXCI9XCJcblx0fTtcblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLCBwcml2YXRlICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlKSB7XG5cdH07XG5cblx0bGluayA9ICgkc2NvcGU6IG5nLklTY29wZSwgaUVsZW1lbnQ6IEpRdWVyeSwgYXR0cmlidXRlczogbmcuSUF0dHJpYnV0ZXMsICRzY2U6IG5nLklTQ0VTZXJ2aWNlKTogdm9pZCA9PiB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBudmQzXG5cdFx0aWYoYXR0cmlidXRlcy50eXBlID09ICdtZXRyaWMnIHx8IGF0dHJpYnV0ZXMudHlwZSA9PSAndGFyZ2V0Jyl7XG5cdFx0XHRudmQzID0gaUVsZW1lbnQuZmluZCgnbnZkMycpWzBdO1xuXHRcdH1cblx0XHRpZihhdHRyaWJ1dGVzLnR5cGUgPT0gJ2ZsaWdodC1wcm9jZXNzJyB8fCBhdHRyaWJ1dGVzLnR5cGUgPT0gJ2ZsaWdodC1jb3VudCcgfHwgYXR0cmlidXRlcy50eXBlID09ICdjb3Vwb24tY291bnQnKXtcblx0XHRcdG52ZDMgPSBpRWxlbWVudC5maW5kKCdudmQzLW11bHRpLWJhci1jaGFydCcpWzBdO1xuXHRcdH1cblx0XHRcblx0XHR2YXIgc2VsZWN0ZWRFbGVtID0gYW5ndWxhci5lbGVtZW50KG52ZDMpO1xuXG5cdFx0XG5cdFx0XHRcdFx0XG5cblx0XHRzZWxmLiR0aW1lb3V0KFxuXHRcdFx0KCkgPT4ge1xuXHRcdFx0XHRzZWxlY3RlZEVsZW0ucmVhZHkoZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdCRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7IHJldHVybiBzZWxlY3RlZEVsZW0uaHRtbCgpO1x0IH0sIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuXHRcdFx0XHRcdFx0aWYgKG5ld1ZhbHVlKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2cobmV3VmFsdWUpO1xuXHRcdFx0XHRcdFx0XHRzZWxmLmFwcGVuZENsaWNrKHNlbGVjdGVkRWxlbSwgYXR0cmlidXRlcywgc2VsZik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSwgdHJ1ZSk7XG5cdFx0XHRcdFx0Ly92YXIgY2hpbGRFbGVtOiBhbnkgPSBzZWxlY3RlZEVsZW0uZmluZCgncmVjdCcpLnBhcmVudCgnZycpO1xuXHRcdFx0XHRcdHNlbGYuYXBwZW5kQ2xpY2soc2VsZWN0ZWRFbGVtLCBhdHRyaWJ1dGVzLCBzZWxmKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdFx0MTApO1xuXHR9XG5cblx0c3RhdGljIGZhY3RvcnkoKTogbmcuSURpcmVjdGl2ZUZhY3Rvcnkge1xuXHRcdHZhciBkaXJlY3RpdmUgPSAoJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSwgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UpID0+IG5ldyBDaGFydEV2ZW50KCR0aW1lb3V0LCAkcm9vdFNjb3BlKVxuXHRcdGRpcmVjdGl2ZS4kaW5qZWN0ID0gWyckdGltZW91dCcsICckcm9vdFNjb3BlJ107XG5cdFx0cmV0dXJuIGRpcmVjdGl2ZTtcblx0fVxuXG5cdGFwcGVuZENsaWNrKHNlbGVjdGVkRWxlbSwgYXR0cmlidXRlcywgc2VsZikge1xuXHRcdHZhciBkYmxDbGlja0ludGVydmFsID0gMzAwO1xuXHRcdHZhciBmaXJzdENsaWNrVGltZTtcblx0XHR2YXIgd2FpdGluZ1NlY29uZENsaWNrID0gZmFsc2U7XG5cdFx0dmFyIGNoaWxkRWxlbTogYW55ID0gc2VsZWN0ZWRFbGVtLmZpbmQoJ3JlY3QnKTtcblx0XHRhbmd1bGFyLmZvckVhY2goY2hpbGRFbGVtLCBmdW5jdGlvbihlbGVtLCBrZXkpIHtcblx0XHRcdGlmIChlbGVtLnRhZ05hbWUgPT0gJ3JlY3QnKSB7XG5cdFx0XHRcdHZhciByZWN0RWxlbSA9IGFuZ3VsYXIuZWxlbWVudChlbGVtKTtcblx0XHRcdFx0cmVjdEVsZW0ub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0XHRpZiAoIXdhaXRpbmdTZWNvbmRDbGljaykge1xuXHRcdFx0XHRcdFx0Ly8gU2luZ2xlIGNsbGlja1xuXHRcdFx0XHRcdFx0Zmlyc3RDbGlja1RpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuXHRcdFx0XHRcdFx0d2FpdGluZ1NlY29uZENsaWNrID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHR3YWl0aW5nU2Vjb25kQ2xpY2sgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2cod2FpdGluZ1NlY29uZENsaWNrKTtcblx0XHRcdFx0XHRcdH0sIGRibENsaWNrSW50ZXJ2YWwpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdC8vIERvdWJsZSBjbGxpY2tcblx0XHRcdFx0XHRcdHdhaXRpbmdTZWNvbmRDbGljayA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0dmFyIHRpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuXHRcdFx0XHRcdFx0aWYgKHRpbWUgLSBmaXJzdENsaWNrVGltZSA8IGRibENsaWNrSW50ZXJ2YWwpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHR5cGUgPSBhdHRyaWJ1dGVzLnR5cGU7XG5cdFx0XHRcdFx0XHRcdGlmKGF0dHJpYnV0ZXMudHlwZSA9PSAnbWV0cmljJyB8fCBhdHRyaWJ1dGVzLnR5cGUgPT0gJ3RhcmdldCcpe1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdvcGVuRHJpbGxQb3B1cCcsIHtcImRhdGFcIiA6IHJlY3RFbGVtWzBdWydfX2RhdGFfXyddLCBcInR5cGVcIjogdHlwZSwgXCJldmVudFwiOiBldmVudH0pOyBcblx0XHRcdFx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2cocmVjdEVsZW0pO1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdvcGVuRHJpbGxQb3B1cDEnLCB7XCJkYXRhXCIgOiByZWN0RWxlbVswXVsnX19kYXRhX18nXSwgXCJ0eXBlXCI6IHR5cGUsIFwiZXZlbnRcIjogZXZlbnR9KTsgXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0fSk7IFxuXHR9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9fbGlicy50c1wiIC8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9hcHAvQXBwQ29udHJvbGxlci50c1wiIC8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9Db3Jkb3ZhU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vc2VydmljZXMvTG9jYWxTdG9yYWdlU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vc2VydmljZXMvU2Vzc2lvblNlcnZpY2UudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vc2VydmljZXMvRXJyb3JIYW5kbGVyU2VydmljZS50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbXBvbmVudHMvbWlzL3NlcnZpY2VzL01pc1NlcnZpY2UudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9DaGFydG9wdGlvblNlcnZpY2UudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9vcGVyYXRpb25hbC9zZXJ2aWNlcy9PcGVyYXRpb25hbFNlcnZpY2UudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL3VzZXIvc2VydmljZXMvVXNlclNlcnZpY2UudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9NaXNDb250cm9sbGVyLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9PcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbXBvbmVudHMvdXNlci9Mb2dpbkNvbnRyb2xsZXIudHNcIi8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9jaGFydC1ldmVudC9DaGFydEV2ZW50LnRzXCIgLz5cblxudmFyIFNFUlZFUl9VUkwgPSAnaHR0cDovLzEwLjkxLjE1Mi45OTo4MDgyL3JhcGlkLXdzL3NlcnZpY2VzL3Jlc3QnO1xuYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJywgWydpb25pYycsICdyYXBpZE1vYmlsZS5jb25maWcnLCAndGFiU2xpZGVCb3gnLCAnbnZkM0NoYXJ0RGlyZWN0aXZlcycsICdudmQzJ10pXG5cblx0LnJ1bigoJGlvbmljUGxhdGZvcm06IElvbmljLklQbGF0Zm9ybSwgJGh0dHA6IG5nLklIdHRwU2VydmljZSkgPT4ge1xuXHRcdCRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uLnRva2VuID0gJ3Rva2VuJztcbiAgXHRcdCRodHRwLmRlZmF1bHRzLmhlYWRlcnMucG9zdFtcIkNvbnRlbnQtVHlwZVwiXSA9IFwiYXBwbGljYXRpb24vanNvblwiO1xuXHRcdCRpb25pY1BsYXRmb3JtLnJlYWR5KCgpID0+IHtcblx0XHRcdGlmICh0eXBlb2YgbmF2aWdhdG9yLmdsb2JhbGl6YXRpb24gIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR9XG5cdFx0fSlcblx0fSlcbi5jb25maWcoKCRzdGF0ZVByb3ZpZGVyOiBhbmd1bGFyLnVpLklTdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXI6IGFuZ3VsYXIudWkuSVVybFJvdXRlclByb3ZpZGVyLFxuXHQkaW9uaWNDb25maWdQcm92aWRlcjogSW9uaWMuSUNvbmZpZ1Byb3ZpZGVyKSA9PiB7XG5cdCRpb25pY0NvbmZpZ1Byb3ZpZGVyLnZpZXdzLnN3aXBlQmFja0VuYWJsZWQoZmFsc2UpO1xuXG5cdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhcHAnLCB7XG5cdFx0dXJsOiAnL2FwcCcsXG5cdFx0YWJzdHJhY3Q6IHRydWUsXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3RlbXBsYXRlcy9tZW51Lmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6ICdBcHBDb250cm9sbGVyIGFzIGFwcEN0cmwnXG5cdH0pXG5cdC5zdGF0ZSgnbG9naW4nLCB7XG5cdFx0dXJsOiAnL2xvZ2luJyxcblx0XHR0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdXNlci9sb2dpbi5odG1sJyxcblx0XHRjb250cm9sbGVyOiAnTG9naW5Db250cm9sbGVyIGFzIExvZ2luQ3RybCdcblx0fSlcblx0LnN0YXRlKCdhcHAubWlzLWZsb3duJywge1xuXHRcdHVybDogJy9taXMvZmxvd24nLFxuXHRcdHZpZXdzOiB7XG5cdFx0XHQnbWVudUNvbnRlbnQnOiB7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9taXMvZmxvd24uaHRtbCcsXG5cdFx0XHRcdGNvbnRyb2xsZXI6ICdNaXNDb250cm9sbGVyIGFzIE1pc0N0cmwnXG5cdFx0XHR9XG5cdFx0fVxuXHR9KVxuXHQuc3RhdGUoJ2FwcC5vcGVyYXRpb25hbC1mbG93bicsIHtcblx0XHR1cmw6ICcvb3BlcmF0aW9uYWwvZmxvd24nLFxuXHRcdHZpZXdzOiB7XG5cdFx0XHQnbWVudUNvbnRlbnQnOiB7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9mbG93bi5odG1sJyxcblx0XHRcdFx0Y29udHJvbGxlcjogJ09wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyIGFzIE9wckN0cmwnXG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcblxuXHQkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvbG9naW4nKTtcbn0pXG5cbi5zZXJ2aWNlKCdEYXRhUHJvdmlkZXJTZXJ2aWNlJywgRGF0YVByb3ZpZGVyU2VydmljZSlcbi5zZXJ2aWNlKCdOZXRTZXJ2aWNlJywgTmV0U2VydmljZSlcbi5zZXJ2aWNlKCdFcnJvckhhbmRsZXJTZXJ2aWNlJywgRXJyb3JIYW5kbGVyU2VydmljZSlcbi5zZXJ2aWNlKCdTZXNzaW9uU2VydmljZScsIFNlc3Npb25TZXJ2aWNlKVxuLnNlcnZpY2UoJ0NvcmRvdmFTZXJ2aWNlJywgQ29yZG92YVNlcnZpY2UpXG4uc2VydmljZSgnTG9jYWxTdG9yYWdlU2VydmljZScsIExvY2FsU3RvcmFnZVNlcnZpY2UpXG4uc2VydmljZSgnVXNlclNlcnZpY2UnLCBVc2VyU2VydmljZSlcblxuLnNlcnZpY2UoJ01pc1NlcnZpY2UnLCBNaXNTZXJ2aWNlKVxuLnNlcnZpY2UoJ09wZXJhdGlvbmFsU2VydmljZScsIE9wZXJhdGlvbmFsU2VydmljZSlcbi5zZXJ2aWNlKCdGaWx0ZXJlZExpc3RTZXJ2aWNlJywgRmlsdGVyZWRMaXN0U2VydmljZSlcbi5zZXJ2aWNlKCdDaGFydG9wdGlvblNlcnZpY2UnLCBDaGFydG9wdGlvblNlcnZpY2UpXG5cbi5jb250cm9sbGVyKCdBcHBDb250cm9sbGVyJywgQXBwQ29udHJvbGxlcilcbi5jb250cm9sbGVyKCdNaXNDb250cm9sbGVyJywgTWlzQ29udHJvbGxlcilcbi5jb250cm9sbGVyKCdPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlcicsIE9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyKVxuLmNvbnRyb2xsZXIoJ0xvZ2luQ29udHJvbGxlcicsIExvZ2luQ29udHJvbGxlcilcblxuLmRpcmVjdGl2ZSgnY2hhcnRldmVudCcsIENoYXJ0RXZlbnQuZmFjdG9yeSgpKVxuLy8gLmRpcmVjdGl2ZSgnZmV0Y2hMaXN0JywgRmV0Y2hMaXN0LmZhY3RvcnkoKSlcblxuXG5pb25pYy5QbGF0Zm9ybS5yZWFkeSgoKSA9PiB7XG5cdGlmICh3aW5kb3cuY29yZG92YSAmJiB3aW5kb3cuY29yZG92YS5wbHVnaW5zLktleWJvYXJkKSB7XG5cdH1cblx0Ly8gU3RhdHVzQmFyLm92ZXJsYXlzV2ViVmlldyhmYWxzZSk7XG4gLy8gICAgU3RhdHVzQmFyLmJhY2tncm91bmRDb2xvckJ5SGV4U3RyaW5nKCcjMjA5ZGMyJyk7XG4gLy8gICAgU3RhdHVzQmFyLnN0eWxlTGlnaHRDb250ZW50KCk7XG5cdF8uZGVmZXIoKCkgPT4ge1xuXHRcdC8vIGFuZ3VsYXIuYm9vdHN0cmFwKGRvY3VtZW50LCBbJ3JhcGlkTW9iaWxlJ10pO1xuXHR9KTtcbn0pO1xuIixudWxsLCIoZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG4gIGFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScpXG4gIC5kaXJlY3RpdmUoJ2hlUHJvZ3Jlc3NCYXInLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRpcmVjdGl2ZURlZmluaXRpb25PYmplY3QgPSB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogZmFsc2UsXG4gICAgICBzY29wZToge2RhdGE6ICc9Y2hhcnREYXRhJywgc2hvd3Rvb2x0aXA6ICdAc2hvd1Rvb2x0aXAnfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgdmFyIHggPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgICAgICAgICAgLmRvbWFpbihbMCwgZDMubWF4KHNjb3BlLmRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuICtkLnByb2dyZXNzIH0pXSlcbiAgICAgICAgICAgICAgICAgIC5yYW5nZShbMCwgOTBdKTtcblxuICAgICAgICB2YXIgc2VnbWVudCA9IGQzLnNlbGVjdChlbGVtZW50WzBdKVxuICAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbChcIi5ob3Jpem9udGFsLWJhci1ncmFwaC1zZWdtZW50XCIpXG4gICAgICAgICAgICAgICAgICAgICAuZGF0YShzY29wZS5kYXRhKVxuICAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIilcbiAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtc2VnbWVudFwiLCB0cnVlKTtcblxuICAgICAgICBzZWdtZW50LmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtbGFiZWxcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQubmFtZSB9KTtcblxuICAgICAgICB2YXIgYmFyU2VnbWVudCA9IHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZVwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZS1zY2FsZVwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZS1iYXJcIiwgdHJ1ZSk7XG5cbiAgICAgICAgYmFyU2VnbWVudFxuICAgICAgICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmNvbG9yIH0pICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoK2QucHJvZ3Jlc3MpICsgXCIlXCIgfSk7XG5cbiAgICAgICAgdmFyIGJveFNlZ21lbnQgPSBiYXJTZWdtZW50LmFwcGVuZChcInNwYW5cIikuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXZhbHVlLWJveFwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnByb2dyZXNzID8gZC5wcm9ncmVzcyA6IFwiXCIgfSk7XG4gICAgICAgIGlmKHNjb3BlLnNob3d0b29sdGlwICE9PSAndHJ1ZScpIHJldHVybjsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgdmFyIGJ0blNlZ21lbnQgPSBzZWdtZW50LmFwcGVuZChcImJ1dHRvblwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLWljb24gaWNvbiBpb24tY2hldnJvbi1kb3duIG5vLWJvcmRlciBzZWN0b3JDdXN0b21DbGFzc1wiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImhpZGVcIiwgZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoZCkgcmV0dXJuIGQuZHJpbGxGbGFnID09ICdOJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7ICAgICAgICAgICAgXG4gICAgICAgIHZhciB0b29sdGlwU2VnbWVudCA9IHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcInRvb2x0aXBcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKCdoaWRlJywgdHJ1ZSk7XG4gICAgICAgIHRvb2x0aXBTZWdtZW50LmFwcGVuZChcInBcIikudGV4dChmdW5jdGlvbihkKXsgcmV0dXJuIGQubmFtZTsgfSk7XG4gICAgICAgIHZhciB0YWJsZSA9IHRvb2x0aXBTZWdtZW50LmFwcGVuZChcInRhYmxlXCIpO1xuICAgICAgICB2YXIgdGhlYWQgPSB0YWJsZS5hcHBlbmQoJ3RyJyk7XG4gICAgICAgIHRoZWFkLmFwcGVuZCgndGgnKS50ZXh0KCdTZWN0b3InKTtcbiAgICAgICAgdGhlYWQuYXBwZW5kKCd0aCcpLnRleHQoJ1JldmVudWUnKTtcblxuICAgICAgICB2YXIgdHIgID0gdGFibGVcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZCgndGJvZHknKVxuICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKFwidHJcIilcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEoZnVuY3Rpb24oZCl7cmV0dXJuIGQuc2NBbmFseXNpc0RyaWxsc30pXG4gICAgICAgICAgICAgICAgICAgIC5lbnRlcigpLmFwcGVuZChcInRyXCIpO1xuXG4gICAgICAgIHZhciBzZWN0b3JUZCA9IHRyLmFwcGVuZChcInRkXCIpXG4gICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnNlY3RvciB9KTtcblxuICAgICAgICB2YXIgcmV2ZW51ZVRkID0gdHIuYXBwZW5kKFwidGRcIilcbiAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQucmV2ZW51ZSB9KTtcblxuICAgICAgICBidG5TZWdtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7ICAgICAgICAgICAgICBcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0b29sdGlwU2VnbWVudCk7XG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQodGhpcykucmVtb3ZlQ2xhc3MoJ3NlY3RvckN1c3RvbUNsYXNzJyk7XG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5zZWN0b3JDdXN0b21DbGFzc1wiKSkucmVtb3ZlQ2xhc3MoJ2lvbi1jaGV2cm9uLXVwJyk7XG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5zZWN0b3JDdXN0b21DbGFzc1wiKSkuYWRkQ2xhc3MoJ2lvbi1jaGV2cm9uLWRvd24nKTtcblx0XHQgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlY3RvckN1c3RvbUNsYXNzXCIpKS5uZXh0KCkucmVtb3ZlQ2xhc3MoJ3Nob3cnKTtcblx0XHQgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlY3RvckN1c3RvbUNsYXNzXCIpKS5uZXh0KCkuYWRkQ2xhc3MoJ2hpZGUnKTtcblx0XHQgIFxuICAgICAgICAgIGlmKGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkuaGFzQ2xhc3MoJ3Nob3cnKSkge1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLnJlbW92ZUNsYXNzKCdpb24tY2hldnJvbi11cCcpO1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLmFkZENsYXNzKCdpb24tY2hldnJvbi1kb3duJyk7XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLnJlbW92ZUNsYXNzKCdzaG93Jyk7ICAgICAgICAgICAgXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLmFkZENsYXNzKCdoaWRlJyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5yZW1vdmVDbGFzcygnaW9uLWNoZXZyb24tZG93bicpO1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLmFkZENsYXNzKCdpb24tY2hldnJvbi11cCcpO1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5yZW1vdmVDbGFzcygnaGlkZScpO1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5hZGRDbGFzcygnc2hvdycpO1xuICAgICAgICAgIH1cblx0XHQgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5hZGRDbGFzcygnc2VjdG9yQ3VzdG9tQ2xhc3MnKTtcblx0XHQgIFxuXHRcdCAgXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIGRpcmVjdGl2ZURlZmluaXRpb25PYmplY3Q7XG4gIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG4gIGFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScpXG4gIC5kaXJlY3RpdmUoJ2hlUmV2ZW51ZVByb2dyZXNzQmFyJywgZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXZCYXJPYmplY3QgPSB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogZmFsc2UsXG4gICAgICBzY29wZToge2RhdGE6ICc9Y2hhcnREYXRhJ30sXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHNjb3BlLmRhdGEpO1xuICAgICAgICBzY29wZS4kd2F0Y2goJ2RhdGEnLCBmdW5jdGlvbihuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCduZXdWYWx1ZScsIG5ld1ZhbHVlKTtcbiAgICAgICAgICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAgICAgICAgICAgICAuZG9tYWluKFswLCBkMy5tYXgoc2NvcGUuZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZSB9KV0pXG4gICAgICAgICAgICAgICAgICAgICAgLnJhbmdlKFswLCA5MF0pO1xuXG4gICAgICAgICAgICB2YXIgc2VnbWVudCA9IGQzLnNlbGVjdChlbGVtZW50WzBdKVxuICAgICAgICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoXCIubmV0LXJldi1iYXItZ3JhcGgtc2VnbWVudFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgIC5kYXRhKHNjb3BlLmRhdGEpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC1zZWdtZW50XCIsIHRydWUpO1xuXG4gICAgICAgICAgICBzZWdtZW50LmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtbGFiZWxcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWUgfSk7XG5cbiAgICAgICAgICAgIHZhciBiYXJTZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlXCIsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC12YWx1ZS1zY2FsZVwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtdmFsdWUtYmFyXCIsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlLWJveFwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZTsgfSk7XG5cbiAgICAgICAgICAgIGJhclNlZ21lbnQgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmNvbG9yIH0pICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAgICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAgICAgICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoZC52YWx1ZSkgKyBcIiVcIiB9KTsgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgIH0gICAgICAgICAgICAgICBcbiAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gcmV2QmFyT2JqZWN0O1xuICB9KTtcbn0pKCk7IiwiXG4oZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIC8vIGF0dGFjaCB0aGUgZmFjdG9yaWVzIGFuZCBzZXJ2aWNlIHRvIHRoZSBbc3RhcnRlci5zZXJ2aWNlc10gbW9kdWxlIGluIGFuZ3VsYXJcbiAgICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKVxuICAgICAgICAuc2VydmljZSgnUmVwb3J0QnVpbGRlclN2YycsIHJlcG9ydEJ1aWxkZXJTZXJ2aWNlKTtcbiAgICBcblx0ZnVuY3Rpb24gcmVwb3J0QnVpbGRlclNlcnZpY2UoKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIHNlbGYuZ2VuZXJhdGVSZXBvcnQgPSBfZ2VuZXJhdGVSZXBvcnQ7ICAgICAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIF9nZW5lcmF0ZVJlcG9ydChwYXJhbSwgY2hhcnRUaXRsZSxmbG93bk1vbnRoKSB7XG5cdFx0XHR2YXIgdGl0bGUgPSBcIlwiO1xuXHRcdFx0aWYocGFyYW0gPT0gXCJtZXRyaWNTbmFwc2hvdFwiKVxuXHRcdFx0XHR0aXRsZSA9IFwiTUVUUklDIFNOQVBTSE9UIC1cIitmbG93bk1vbnRoK1wiIFwiK2NoYXJ0VGl0bGUudG9VcHBlckNhc2UoKStcIi0gVklFV1wiO1xuXHRcdFx0ZWxzZSBpZihwYXJhbSA9PSBcInRhcmdldEFjdHVhbFwiKVxuXHRcdFx0XHR0aXRsZSA9IFwiVEFSR0VUIFZTIEFDVFVBTCAtIFwiKygoY2hhcnRUaXRsZSA9PSBcInJldmVudWVcIik/XCJORVQgUkVWRU5VRVwiOlwiUEFYIENvdW50XCIpK1wiIFwiK2Zsb3duTW9udGgrIFwiIC0gVklFV1wiO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aXRsZSA9IGNoYXJ0VGl0bGUrXCIgXCIrZmxvd25Nb250aCtcIiAtIFZJRVdcIjtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHR2YXIgc3ZnTm9kZSA9IGQzLnNlbGVjdEFsbChcIi5cIitwYXJhbSkuc2VsZWN0QWxsKFwic3ZnXCIpO1xuXHRcdFx0dmFyIGNvbnRlbnQgPSBbXTtcblx0XHRcdHZhciBpbWFnZUNvbHVtbiA9IFtdO1xuXHRcdFx0dmFyIHRleHRDb2x1bW4gPSBbXTtcblx0XHRcdHZhciBpbWFnZXNPYmogPSB7fTtcblx0XHRcdHZhciB0ZXh0T2JqID0ge307XG5cdFx0XHRjb250ZW50LnB1c2godGl0bGUpO1xuXHRcdFx0dmFyIG5vZGVFeGlzdHMgPSBbXTtcblx0XHRcdGFuZ3VsYXIuZm9yRWFjaChzdmdOb2RlLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XHRcdFx0XHRcblx0XHRcdFx0Ly90ZXh0T2JqWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInXHRcdFx0XHRcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBodG1sID0gXCJcIjtcblx0XHRcdFx0aWYobm9kZUV4aXN0cy5pbmRleE9mKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1mbGFnXCIpKSA9PSAtMSAmJiBzdmdOb2RlW2tleV0ubGVuZ3RoID49IDEpe1xuXHRcdFx0XHRcblx0XHRcdFx0XHRodG1sID0gc3ZnTm9kZVtrZXldWzBdLm91dGVySFRNTDtcblx0XHRcdFx0XHRpZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tcGRmRmxhZ1wiKSA9PT0gXCJkeW5hbWljV0hcIil7XG5cdFx0XHRcdFx0XHRkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKS5hdHRyKFwid2lkdGhcIiwxNTAwKTtcblx0XHRcdFx0XHRcdGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpLmF0dHIoXCJoZWlnaHRcIiw2MDApO1xuXHRcdFx0XHRcdFx0dmFyIG5vZGUgPSBkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKTtcblx0XHRcdFx0XHRcdGh0bWwgPSBub2RlWzBdWzBdLm91dGVySFRNTDtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDUwMDtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnaGVpZ2h0J10gPSA1MDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1wZGZGbGFnXCIpID09PSBcInBkZkZsYWdcIilcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ3dpZHRoJ10gPSA3NTA7XG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ2hlaWdodCddID0gMzAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjYW52Zyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyksIGh0bWwpO1xuXHRcdFx0XHRcdHZhciB0ZXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xuXHRcdFx0XHRcdHZhciBpbWdzcmMgPSB0ZXN0LnRvRGF0YVVSTCgpO1xuXHRcdFx0XHRcdHZhciAgdGV4dCA9IFwiXFxuXCIrc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLXRpdGxlXCIpK1wiXFxuXCI7XG5cdFx0XHRcdFx0dGV4dE9ialsndGV4dCddID0gdGV4dDtcblx0XHRcdFx0XHR0ZXh0Q29sdW1uLnB1c2godGV4dE9iaik7XG5cdFx0XHRcdFx0aW1hZ2VzT2JqWydpbWFnZSddID0gaW1nc3JjO1xuXHRcdFx0XHRcdGltYWdlQ29sdW1uLnB1c2goaW1hZ2VzT2JqKTtcdFx0XHRcdFxuXHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxuXHRcdFx0XHRcdHR4dFRlbXBbJ2NvbHVtbnMnXSA9IHRleHRDb2x1bW47XG5cdFx0XHRcdFx0aW1nVGVtcFsnYWxpZ25tZW50J10gPSAnY2VudGVyJztcblx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcblx0XHRcdFx0XHRjb250ZW50LnB1c2godHh0VGVtcCk7XG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKGltZ1RlbXApO1x0XHRcdFx0XHRcblx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdHRleHRDb2x1bW4gPSBbXTtcblx0XHRcdFx0XHRpbWFnZXNPYmogPSB7fTtcblx0XHRcdFx0XHR0ZXh0T2JqID0ge307XG5cdFx0XHRcdFx0aW1nVGVtcCA9IHt9O1xuXHRcdFx0XHRcdHR4dFRlbXAgPXt9O1xuXHRcdFx0XHRcdG5vZGVFeGlzdHMucHVzaChzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tZmxhZ1wiKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjb250ZW50OiBjb250ZW50LFxuXHRcdFx0XHRzdHlsZXM6IHtcblx0XHRcdFx0XHRoZWFkZXI6IHtcblx0XHRcdFx0XHRcdGZvbnRTaXplOiAxOCxcblx0XHRcdFx0XHRcdGJvbGQ6IHRydWVcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGJpZ2dlcjoge1xuXHRcdFx0XHRcdFx0Zm9udFNpemU6IDE1LFxuXHRcdFx0XHRcdFx0aXRhbGljczogdHJ1ZSxcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGRlZmF1bHRTdHlsZToge1xuXHRcdFx0XHRcdGNvbHVtbkdhcDogMjAsXG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0fTtcbiAgICB9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgLy8gYXR0YWNoIHRoZSBzZXJ2aWNlIHRvIHRoZSBbcmFwaWRNb2JpbGVdIG1vZHVsZSBpbiBhbmd1bGFyXG4gICAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcblx0IFx0LnNlcnZpY2UoJ1JlcG9ydFN2YycsIFsnJHEnLCAnJHRpbWVvdXQnLCAnUmVwb3J0QnVpbGRlclN2YycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwb3J0U3ZjXSk7XG5cblx0Ly8gZ2VuUmVwb3J0RGVmIC0tPiBnZW5SZXBvcnREb2MgLS0+IGJ1ZmZlcltdIC0tPiBCbG9iKCkgLS0+IHNhdmVGaWxlIC0tPiByZXR1cm4gZmlsZVBhdGhcblxuXHQgZnVuY3Rpb24gcmVwb3J0U3ZjKCRxLCAkdGltZW91dCwgUmVwb3J0QnVpbGRlclN2Yykge1xuXHRcdCB0aGlzLnJ1blJlcG9ydEFzeW5jID0gX3J1blJlcG9ydEFzeW5jO1xuXHRcdCB0aGlzLnJ1blJlcG9ydERhdGFVUkwgPSBfcnVuUmVwb3J0RGF0YVVSTDtcblxuXHRcdC8vIFJVTiBBU1lOQzogcnVucyB0aGUgcmVwb3J0IGFzeW5jIG1vZGUgdy8gcHJvZ3Jlc3MgdXBkYXRlcyBhbmQgZGVsaXZlcnMgYSBsb2NhbCBmaWxlVXJsIGZvciB1c2VcblxuXHRcdCBmdW5jdGlvbiBfcnVuUmVwb3J0QXN5bmMoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKSB7XG4gICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblx0XHRcdCBcbiAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCcxLlByb2Nlc3NpbmcgVHJhbnNjcmlwdCcpO1xuICAgICAgICAgICAgIGdlbmVyYXRlUmVwb3J0RGVmKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkudGhlbihmdW5jdGlvbihkb2NEZWYpIHtcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMi4gR2VuZXJhdGluZyBSZXBvcnQnKTtcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0RG9jKGRvY0RlZik7XG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihwZGZEb2MpIHtcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMy4gQnVmZmVyaW5nIFJlcG9ydCcpO1xuICAgICAgICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVSZXBvcnRCdWZmZXIocGRmRG9jKTtcbiAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCc0LiBTYXZpbmcgUmVwb3J0IEZpbGUnKTtcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0QmxvYihidWZmZXIpO1xuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocGRmQmxvYikge1xuICAgICAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCc1LiBPcGVuaW5nIFJlcG9ydCBGaWxlJyk7XG4gICAgICAgICAgICAgICAgIHJldHVybiBzYXZlRmlsZShwZGZCbG9iLHN0YXR1c0ZsYWcpO1xuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oZmlsZVBhdGgpIHtcbiAgICAgICAgICAgICAgICAgLy9oaWRlTG9hZGluZygpO1xuICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGZpbGVQYXRoKTtcbiAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgICAgICAvL2hpZGVMb2FkaW5nKCk7XG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJyArIGVycm9yLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgfVxuXG5cdFx0Ly8gUlVOIERBVEFVUkw6IHJ1bnMgdGhlIHJlcG9ydCBhc3luYyBtb2RlIHcvIHByb2dyZXNzIHVwZGF0ZXMgYW5kIHN0b3BzIHcvIHBkZkRvYyAtPiBkYXRhVVJMIHN0cmluZyBjb252ZXJzaW9uXG5cblx0XHQgZnVuY3Rpb24gX3J1blJlcG9ydERhdGFVUkwoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKSB7XG4gICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblx0XHRcdCBcbiAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCcxLlByb2Nlc3NpbmcgVHJhbnNjcmlwdCcpO1xuICAgICAgICAgICAgIGdlbmVyYXRlUmVwb3J0RGVmKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkudGhlbihmdW5jdGlvbihkb2NEZWYpIHtcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMi4gR2VuZXJhdGluZyBSZXBvcnQnKTtcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0RG9jKGRvY0RlZik7XG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihwZGZEb2MpIHtcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMy4gQ29udmVydCB0byBEYXRhVVJMJyk7XG4gICAgICAgICAgICAgICAgIHJldHVybiBnZXREYXRhVVJMKHBkZkRvYyk7XG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihvdXREb2MpIHtcbiAgICAgICAgICAgICAgICAgLy9oaWRlTG9hZGluZygpO1xuICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKG91dERvYyk7XG4gICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgLy9oaWRlTG9hZGluZygpO1xuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcgKyBlcnJvci50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgIH1cblxuXHRcdC8vIDEuR2VuZXJhdGVSZXBvcnREZWY6IHVzZSBjdXJyZW50VHJhbnNjcmlwdCB0byBjcmFmdCByZXBvcnREZWYgSlNPTiBmb3IgcGRmTWFrZSB0byBnZW5lcmF0ZSByZXBvcnRcblxuXHRcdGZ1bmN0aW9uIGdlbmVyYXRlUmVwb3J0RGVmKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkge1xuICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblx0XHRcdFxuICAgICAgICAgICAgLy8gcmVtb3ZlZCBzcGVjaWZpY3Mgb2YgY29kZSB0byBwcm9jZXNzIGRhdGEgZm9yIGRyYWZ0aW5nIHRoZSBkb2NcbiAgICAgICAgICAgIC8vIGxheW91dCBiYXNlZCBvbiBwbGF5ZXIsIHRyYW5zY3JpcHQsIGNvdXJzZXMsIGV0Yy5cbiAgICAgICAgICAgIC8vIGN1cnJlbnRseSBtb2NraW5nIHRoaXMgYW5kIHJldHVybmluZyBhIHByZS1idWlsdCBKU09OIGRvYyBkZWZpbml0aW9uXG4gICAgICAgICAgICBcblx0XHRcdC8vdXNlIHJwdCBzZXJ2aWNlIHRvIGdlbmVyYXRlIHRoZSBKU09OIGRhdGEgbW9kZWwgZm9yIHByb2Nlc3NpbmcgUERGXG4gICAgICAgICAgICAvLyBoYWQgdG8gdXNlIHRoZSAkdGltZW91dCB0byBwdXQgYSBzaG9ydCBkZWxheSB0aGF0IHdhcyBuZWVkZWQgdG8gXG4gICAgICAgICAgICAvLyBwcm9wZXJseSBnZW5lcmF0ZSB0aGUgZG9jIGRlY2xhcmF0aW9uXG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGQgPSB7fTtcbiAgICAgICAgICAgICAgICBkZCA9IFJlcG9ydEJ1aWxkZXJTdmMuZ2VuZXJhdGVSZXBvcnQoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKVxuXHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKGRkKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHRcdH1cblxuXHRcdC8vIDIuR2VuZXJhdGVScHRGaWxlRG9jOiB0YWtlIEpTT04gZnJvbSBycHRTdmMsIGNyZWF0ZSBwZGZtZW1vcnkgYnVmZmVyLCBhbmQgc2F2ZSBhcyBhIGxvY2FsIGZpbGVcblxuXHRcdGZ1bmN0aW9uIGdlbmVyYXRlUmVwb3J0RG9jKGRvY0RlZmluaXRpb24pIHtcblx0XHRcdC8vdXNlIHRoZSBwZGZtYWtlIGxpYiB0byBjcmVhdGUgYSBwZGYgZnJvbSB0aGUgSlNPTiBjcmVhdGVkIGluIHRoZSBsYXN0IHN0ZXBcblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cdFx0XHR0cnkge1xuICAgICAgICAgICAgICAgIC8vdXNlIHRoZSBwZGZNYWtlIGxpYnJhcnkgdG8gY3JlYXRlIGluIG1lbW9yeSBwZGYgZnJvbSB0aGUgSlNPTlxuXHRcdFx0XHR2YXIgcGRmRG9jID0gcGRmTWFrZS5jcmVhdGVQZGYoIGRvY0RlZmluaXRpb24gKTtcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHBkZkRvYyk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHRcdH1cblxuXHRcdC8vIDMuR2VuZXJhdGVScHRCdWZmZXI6IHBkZktpdCBvYmplY3QgcGRmRG9jIC0tPiBidWZmZXIgYXJyYXkgb2YgcGRmRG9jXG5cblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydEJ1ZmZlcihwZGZEb2MpIHtcblx0XHRcdC8vdXNlIHRoZSBwZGZtYWtlIGxpYiB0byBnZXQgYSBidWZmZXIgYXJyYXkgb2YgdGhlIHBkZkRvYyBvYmplY3Rcblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cdFx0XHR0cnkge1xuICAgICAgICAgICAgICAgIC8vZ2V0IHRoZSBidWZmZXIgZnJvbSB0aGUgcGRmRG9jXG5cdFx0XHRcdHBkZkRvYy5nZXRCdWZmZXIoZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCAgIGRlZmVycmVkLnJlc29sdmUoYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHRcdH1cblxuXHRcdC8vIDNiLmdldERhdGFVUkw6IHBkZktpdCBvYmplY3QgcGRmRG9jIC0tPiBlbmNvZGVkIGRhdGFVcmxcblxuXHRcdCBmdW5jdGlvbiBnZXREYXRhVVJMKHBkZkRvYykge1xuXHRcdFx0Ly91c2UgdGhlIHBkZm1ha2UgbGliIHRvIGNyZWF0ZSBhIHBkZiBmcm9tIHRoZSBKU09OIGNyZWF0ZWQgaW4gdGhlIGxhc3Qgc3RlcFxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblx0XHRcdHRyeSB7XG4gICAgICAgICAgICAgICAgLy91c2UgdGhlIHBkZk1ha2UgbGlicmFyeSB0byBjcmVhdGUgaW4gbWVtb3J5IHBkZiBmcm9tIHRoZSBKU09OXG5cdFx0XHRcdHBkZkRvYy5nZXREYXRhVXJsKGZ1bmN0aW9uKG91dERvYykge1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUob3V0RG9jKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHRcdCB9XG5cblx0XHQvLyA0LkdlbmVyYXRlUmVwb3J0QmxvYjogYnVmZmVyIC0tPiBuZXcgQmxvYiBvYmplY3RcblxuXHRcdGZ1bmN0aW9uIGdlbmVyYXRlUmVwb3J0QmxvYihidWZmZXIpIHtcblx0XHRcdC8vdXNlIHRoZSBnbG9iYWwgQmxvYiBvYmplY3QgZnJvbSBwZGZtYWtlIGxpYiB0byBjcmVhdCBhIGJsb2IgZm9yIGZpbGUgcHJvY2Vzc2luZ1xuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblx0XHRcdHRyeSB7XG4gICAgICAgICAgICAgICAgLy9wcm9jZXNzIHRoZSBpbnB1dCBidWZmZXIgYXMgYW4gYXBwbGljYXRpb24vcGRmIEJsb2Igb2JqZWN0IGZvciBmaWxlIHByb2Nlc3NpbmdcbiAgICAgICAgICAgICAgICB2YXIgcGRmQmxvYiA9IG5ldyBCbG9iKFtidWZmZXJdLCB7dHlwZTogJ2FwcGxpY2F0aW9uL3BkZid9KTtcbiAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShwZGZCbG9iKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcblx0XHR9XG5cblx0XHQvLyA1LlNhdmVGaWxlOiB1c2UgdGhlIEZpbGUgcGx1Z2luIHRvIHNhdmUgdGhlIHBkZkJsb2IgYW5kIHJldHVybiBhIGZpbGVQYXRoIHRvIHRoZSBjbGllbnRcblxuXHRcdGZ1bmN0aW9uIHNhdmVGaWxlKHBkZkJsb2IsdGl0bGUpIHtcblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cdFx0XHR2YXIgZmlsZU5hbWUgPSB1bmlxdWVGaWxlTmFtZSh0aXRsZSkrXCIucGRmXCI7XG5cdFx0XHR2YXIgZmlsZVBhdGggPSBcIlwiO1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1NhdmVGaWxlOiByZXF1ZXN0RmlsZVN5c3RlbScpO1xuXHRcdFx0XHR3aW5kb3cucmVxdWVzdEZpbGVTeXN0ZW0oTG9jYWxGaWxlU3lzdGVtLlBFUlNJU1RFTlQsIDAsIGdvdEZTLCBmYWlsKTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ1NhdmVGaWxlX0VycjogJyArIGUubWVzc2FnZSk7XG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcblx0XHRcdFx0dGhyb3coe2NvZGU6LTE0MDEsbWVzc2FnZTondW5hYmxlIHRvIHNhdmUgcmVwb3J0IGZpbGUnfSk7XG5cdFx0XHR9XHRcdFx0XG5cblx0XHRcdGZ1bmN0aW9uIGdvdEZTKGZpbGVTeXN0ZW0pIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcignU2F2ZUZpbGU6IGdvdEZTIC0tPiBnZXRGaWxlJyk7XG5cdFx0XHRcdGZpbGVTeXN0ZW0ucm9vdC5nZXRGaWxlKGZpbGVOYW1lLCB7Y3JlYXRlOiB0cnVlLCBleGNsdXNpdmU6IGZhbHNlfSwgZ290RmlsZUVudHJ5LCBmYWlsKTtcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gZ290RmlsZUVudHJ5KGZpbGVFbnRyeSkge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdTYXZlRmlsZTogZ290RmlsZUVudHJ5IC0tPiAoZmlsZVBhdGgpIC0tPiBjcmVhdGVXcml0ZXInKTtcblx0XHRcdFx0ZmlsZVBhdGggPSBmaWxlRW50cnkudG9VUkwoKTtcblx0XHRcdFx0ZmlsZUVudHJ5LmNyZWF0ZVdyaXRlcihnb3RGaWxlV3JpdGVyLCBmYWlsKTtcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gZ290RmlsZVdyaXRlcih3cml0ZXIpIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcignU2F2ZUZpbGU6IGdvdEZpbGVXcml0ZXIgLS0+IHdyaXRlIC0tPiBvbldyaXRlRW5kKHJlc29sdmUpJyk7XG5cdFx0XHRcdHdyaXRlci5vbndyaXRlZW5kID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG5cdFx0XHRcdH07XG5cdFx0XHRcdHdyaXRlci5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnd3JpdGVyIGVycm9yOiAnICsgZS50b1N0cmluZygpKTtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XG5cdFx0XHRcdH07XG5cdFx0XHRcdHdyaXRlci53cml0ZShwZGZCbG9iKTtcblx0XHRcdH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gZmFpbChlcnJvcikge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhlcnJvci5jb2RlKTtcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdFx0fVxuXHRcdGZ1bmN0aW9uIHVuaXF1ZUZpbGVOYW1lKGZpbGVOYW1lKXtcblx0XHRcdHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0dmFyIHRpbWVzdGFtcCA9IG5vdy5nZXRGdWxsWWVhcigpLnRvU3RyaW5nKCk7XG5cdFx0XHR0aW1lc3RhbXAgKz0gKG5vdy5nZXRNb250aCgpIDwgOSA/ICcwJyA6ICcnKSArIG5vdy5nZXRNb250aCgpLnRvU3RyaW5nKCk7IFxuXHRcdFx0dGltZXN0YW1wICs9IChub3cuZ2V0RGF0ZSgpIDwgMTAgPyAnMCcgOiAnJykgKyBub3cuZ2V0RGF0ZSgpLnRvU3RyaW5nKCk7IFxuXHRcdFx0dGltZXN0YW1wICs9IChub3cuZ2V0SG91cnMoKSA8IDEwID8gJzAnIDogJycpICsgbm93LmdldEhvdXJzKCkudG9TdHJpbmcoKTsgXG5cdFx0XHR0aW1lc3RhbXAgKz0gKG5vdy5nZXRNaW51dGVzKCkgPCAxMCA/ICcwJyA6ICcnKSArIG5vdy5nZXRNaW51dGVzKCkudG9TdHJpbmcoKTsgXG5cdFx0XHR0aW1lc3RhbXAgKz0gKG5vdy5nZXRTZWNvbmRzKCkgPCAxMCA/ICcwJyA6ICcnKSArIG5vdy5nZXRTZWNvbmRzKCkudG9TdHJpbmcoKTtcblx0XHRcdHJldHVybiBmaWxlTmFtZS50b1VwcGVyQ2FzZSgpK1wiX1wiK3RpbWVzdGFtcDtcblx0XHRcblx0XHR9XG5cdCB9XG4gICAgXG59KSgpOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
