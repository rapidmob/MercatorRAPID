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
        var _this = this;
        var requestUrl = URL;
        var def = this.$q.defer();
        if (!this.serverRequest) {
            this.serverRequest = 1;
            this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
                var result = response.data;
                def.resolve(result);
                _this.serverRequest = 0;
            }, function (error) {
                console.log('an error occured');
            });
        }
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
    if (drilltype == 'analysis' || drilltype == 'passenger-count') {
        if (item.regionName && level == 0) {
            return (item.regionName.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.countryFrom && item.countryTo && level == 1) {
            return (item.countryFrom.toLowerCase().indexOf(toSearch.toLowerCase()) > -1 || item.countryTo.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flownSector && level == 2) {
            return (item.flownSector.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flightNumber && level == 3) {
            return (item.flightNumber.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
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
        var _this = this;
        var requestUrl = URL;
        var def = this.$q.defer();
        if (!this.serverRequest) {
            this.serverRequest = 1;
            this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
                var result = response.data;
                def.resolve(result);
                _this.serverRequest = 0;
            }, function (error) {
                console.log('an error occured');
            });
        }
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
    UserService.$inject = ['DataProviderService', '$q', 'LocalStorageService', '$window'];
    return UserService;
})();

/// <reference path="../../_libs.ts" />
/// <reference path="../../components/mis/services/MisService.ts" />
/// <reference path="../../components/mis/services/FilteredListService.ts" />
/// <reference path="../../components/mis/services/ChartoptionService.ts" />
/// <reference path="../../components/user/services/UserService.ts" />
var MisController = (function () {
    function MisController($state, $scope, $ionicLoading, $timeout, $window, $ionicPopover, $filter, misService, chartoptionService, filteredListService, userService, $ionicHistory, reportSvc, GRAPH_COLORS, TABS, $ionicPopup) {
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
        this.GRAPH_COLORS = GRAPH_COLORS;
        this.TABS = TABS;
        this.$ionicPopup = $ionicPopup;
        this.pageSize = 4;
        this.currentPage = [];
        this.selectedDrill = [];
        this.groups = [];
        this.orientationChange = function () {
            var that = _this;
            that.$timeout(function () {
                that.onSlideMove({ index: that.header.tabIndex });
            }, 200);
        };
        this.that = this;
        this.tabs = this.TABS.DB1_TABS;
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
        var self = this;
        this.$scope.$on('$ionicView.enter', function () {
            if (!self.userService.showDashboard('MIS')) {
                self.$state.go("login");
            }
        });
        this.$scope.$on('openDrillPopup', function (event, response) {
            if (response.type == 'metric') {
                _this.$scope.MisCtrl.openBarDrillDownPopover(response.event, { "point": response.data }, -1);
            }
            if (response.type == 'target') {
                _this.$scope.MisCtrl.openTargetDrillDownPopover(response.event, { "point": response.data }, -1);
            }
            if (response.type == 'passenger-count') {
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
            if (data.response.status === "success") {
                // fav Items to display in dashboard
                that.metricResult = _.sortBy(data.response.data.metricSnapshotCharts, function (u) {
                    if (u)
                        return [u.favoriteChartPosition];
                });
                _.forEach(that.metricResult, function (n, value) {
                    n.values[0].color = that.GRAPH_COLORS.METRIC[0];
                    n.values[1].color = that.GRAPH_COLORS.METRIC[1];
                    if (n.values[2])
                        n.values[2].color = that.GRAPH_COLORS.METRIC[2];
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
            }
            else {
                that.ionicLoadingHide();
                that.$ionicPopup.alert({
                    title: 'Error',
                    content: 'No Data Found for MetricSnapshot!!!'
                }).then(function (res) {
                    console.log('done');
                });
            }
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
            if (data.response.status === "success") {
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
                    n.values[0].color = that.GRAPH_COLORS.verBarCharts[0];
                    n.values[1].color = that.GRAPH_COLORS.verBarCharts[1];
                });
                var lineColors = [{ "color": that.GRAPH_COLORS.LINE[0], "classed": "dashed", "strokeWidth": 2 },
                    { "color": that.GRAPH_COLORS.LINE[1] }, { "color": that.GRAPH_COLORS.LINE[2], "area": true, "disabled": true }];
                _.forEach(data.response.data.lineCharts, function (n, value) {
                    _.merge(n.lineChartItems, lineColors);
                });
                console.log(data.response.data.lineCharts);
                that.targetActualData = {
                    horBarChart: data.response.data.verBarCharts,
                    lineChart: data.response.data.lineCharts
                };
                that.ionicLoadingHide();
            }
            else {
                that.ionicLoadingHide();
                that.$ionicPopup.alert({
                    title: 'Error',
                    content: 'No Data Found for TargetVsActual!!!'
                }).then(function (res) {
                    console.log('done');
                });
            }
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
            if (data.response.status === "success") {
                that.routeRevData = data.response.data;
            }
            else {
                that.ionicLoadingHide();
                that.$ionicPopup.alert({
                    title: 'Error',
                    content: 'No Data Found RouteRevenue!!!'
                }).then(function (res) {
                    console.log('done');
                });
            }
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
            if (data.response.status === "success") {
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
                var barColors = [that.GRAPH_COLORS.BAR[0], that.GRAPH_COLORS.BAR[1]];
                _.merge(jsonObj.multibarCharts[1], barColors);
                _.forEach(jsonObj.multibarCharts, function (n, value) {
                    n.color = barColors[value];
                });
                var pieColors = [{ "color": that.GRAPH_COLORS.PIE[0] }, { "color": that.GRAPH_COLORS.PIE[1] }, { "color": that.GRAPH_COLORS.PIE[2] }];
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
            }
            else {
                that.ionicLoadingHide();
                that.$ionicPopup.alert({
                    title: 'Error',
                    content: 'No Data Found For RevenueAnalysis!!!'
                }).then(function (res) {
                    console.log('done');
                });
            }
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
            this.selectedDrill[i] = '';
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
        if (drillType == 'analysis') {
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
        if (drillType == 'passenger-count') {
            var drillLevel = (selFindLevel + 2);
            console.log(data);
            var regionName = (data.regionName) ? data.regionName : "";
            var countryFromTo = (data.countryFrom && data.countryTo) ? data.countryFrom + '-' + data.countryTo : "";
            var ownOalFlag = (data.ownOalFlag) ? data.ownOalFlag : "";
            var sectorFromTo = (data.sectorFromTo) ? data.sectorFromTo : "";
            var flightNumber = (data.flightNumber) ? data.flightNumber : "";
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
            case 'analysis':
                url = "/paxflnmis/netrevenueownoaldrill";
                break;
            case 'passenger-count':
                url = "/paxflnmis/netrevenueownoaldrill";
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
        var that = this;
        this.$timeout(function () {
            that.drillBarpopover.show($event);
        }, 50);
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
        var that = this;
        this.$timeout(function () {
            that.drillBarpopover.show($event);
        }, 50);
        this.openBarDrillDown(selData.point, selFindLevel);
    };
    ;
    MisController.prototype.openRevenueDrillDownPopover = function ($event, selData, selFindLevel) {
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
    ;
    MisController.prototype.openRevenuePassengerDrillDownPopover = function ($event, selData, selFindLevel) {
        console.log(selData);
        this.drillName = 'Passenger Count by Class of Travel';
        this.drillType = 'passenger-count';
        this.groups = [];
        this.drilltabs = ['Country Level', 'Sector Level', 'Flight Level', 'Document Level'];
        this.firstColumns = ['countryFrom', 'flownSector', 'flightNumber', 'netRevenue'];
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
            if (data.response.status === "success") {
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
            }
            else {
                that.ionicLoadingHide();
                that.$ionicPopup.alert({
                    title: 'Error',
                    content: 'No Data Found For SectorCarrierAnalysis!!!'
                }).then(function (res) {
                    console.log('done');
                });
            }
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
        start = 0;
        if (total > 5) {
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
        '$filter', 'MisService', 'ChartoptionService', 'FilteredListService', 'UserService', '$ionicHistory', 'ReportSvc', 'GRAPH_COLORS', 'TABS', '$ionicPopup'];
    return MisController;
})();

/// <reference path="../../../_libs.ts" />
/// <reference path="../services/OperationalService.ts" />
/// <reference path="../../mis/services/FilteredListService.ts" />
var OperationalFlownController = (function () {
    function OperationalFlownController($state, $scope, $ionicLoading, $ionicPopover, $filter, operationalService, $ionicSlideBoxDelegate, $timeout, $window, reportSvc, filteredListService, userService, $ionicHistory, GRAPH_COLORS, TABS, $ionicPopup) {
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
        this.GRAPH_COLORS = GRAPH_COLORS;
        this.TABS = TABS;
        this.$ionicPopup = $ionicPopup;
        this.carouselIndex = 0;
        this.threeBarChartColors = this.GRAPH_COLORS.THREE_BARS_CHART;
        this.fourBarChartColors = this.GRAPH_COLORS.FOUR_BARS_CHART;
        this.pageSize = 4;
        this.currentPage = [];
        this.selectedDrill = [];
        this.groups = [];
        this.orientationChange = function () {
            var that = _this;
            that.$timeout(function () {
                that.onSlideMove({ index: that.header.tabIndex });
            }, 200);
        };
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
        angular.element(window).bind('orientationchange', this.orientationChange);
        this.initData();
        var that = this;
        this.$scope.$on('onSlideMove', function (event, response) {
            that.$scope.OprCtrl.onSlideMove(response);
        });
        this.$scope.$on('$ionicView.enter', function () {
            if (!that.userService.showDashboard('Operational')) {
                that.$state.go("login");
            }
        });
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
    OperationalFlownController.prototype.updateHeader = function () {
        var flownMonth = this.header.flownMonth;
        this.onSlideMove({ index: this.header.tabIndex });
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
            if (data.response.status === "success" && data.response.data.hasOwnProperty('sectionName')) {
                var otherChartColors = [{ "color": that.GRAPH_COLORS.FOUR_BARS_CHART[0] }, { "color": that.GRAPH_COLORS.FOUR_BARS_CHART[1] },
                    { "color": that.GRAPH_COLORS.FOUR_BARS_CHART[2] }, { "color": that.GRAPH_COLORS.FOUR_BARS_CHART[3] }];
                var pieChartColors = [{ "color": that.GRAPH_COLORS.THREE_BARS_CHART[0] }, { "color": that.GRAPH_COLORS.THREE_BARS_CHART[1] }, { "color": that.GRAPH_COLORS.THREE_BARS_CHART[2] }];
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
                }, 0);
                // console.log(JSON.stringify(that.flightProcStatus.weekData));
                that.ionicLoadingHide();
            }
            else {
                that.ionicLoadingHide();
                that.$ionicPopup.alert({
                    title: 'Error',
                    content: 'Data not found for Flights Processing Status!!!'
                }).then(function (res) {
                    console.log('done');
                });
            }
        }, function (error) {
        });
    };
    OperationalFlownController.prototype.callFlightCountByReason = function () {
        var that = this;
        var reqdata = {
            flownMonth: this.header.flownMonth,
            userId: this.header.userName,
            toggle1: this.toggle.openOrClosed.toLowerCase(),
            fullDataFlag: 'N'
        };
        this.ionicLoadingShow();
        this.operationalService.getOprFlightCountByReason(reqdata)
            .then(function (data) {
            if (data.response.status === "success" && data.response.data.hasOwnProperty('sectionName')) {
                // console.log(jsonObj.pieCharts[0]);
                var otherChartColors = [{ "color": that.GRAPH_COLORS.DB_TWO_OTH_COLORS1[0] }, { "color": that.GRAPH_COLORS.DB_TWO_OTH_COLORS1[1] }, { "color": that.GRAPH_COLORS.DB_TWO_OTH_COLORS1[2] }];
                var pieChartColors = [{ "color": that.GRAPH_COLORS.DB_TWO_PIE_COLORS1[0] }, { "color": that.GRAPH_COLORS.DB_TWO_PIE_COLORS1[1] }, { "color": that.GRAPH_COLORS.DB_TWO_PIE_COLORS1[2] }];
                that.flightCountLegends = data.response.data.legends;
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
                }, 0);
                that.ionicLoadingHide();
            }
            else {
                that.ionicLoadingHide();
                that.$ionicPopup.alert({
                    title: 'Error',
                    content: 'Data not found for Flights Count by Reason!!!'
                }).then(function (res) {
                    console.log('done');
                });
            }
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
            if (data.response.status === "success" && data.response.data.hasOwnProperty('sectionName')) {
                var otherChartColors = [{ "color": that.GRAPH_COLORS.DB_TWO_PIE_COLORS1[0] }, { "color": that.GRAPH_COLORS.DB_TWO_PIE_COLORS1[1] }, { "color": that.GRAPH_COLORS.DB_TWO_PIE_COLORS1[2] }];
                var pieChartColors = [{ "color": that.GRAPH_COLORS.DB_TWO_PIE_COLORS1[0] }, { "color": that.GRAPH_COLORS.DB_TWO_PIE_COLORS1[1] }, { "color": that.GRAPH_COLORS.DB_TWO_PIE_COLORS1[2] }];
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
                }, 0);
                that.ionicLoadingHide();
            }
            else {
                that.ionicLoadingHide();
                that.$ionicPopup.alert({
                    title: 'Error',
                    content: 'Data not found for Coupon Count by Exception Category!!!'
                }).then(function (res) {
                    console.log('done');
                });
            }
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
    OperationalFlownController.prototype.openPiePopover = function ($event, charttype, index) {
        var that = this;
        $event.preventDefault();
        this.charttype = charttype;
        this.graphType = index;
        this.$ionicPopover.fromTemplateUrl('components/operational/flown/pie-popover.html', {
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
        _.merge(jsonObj.multibarCharts[0].multibarChartItems, otherChartColors);
        if (jsonObj.stackedBarCharts[0].stackedBarchartItems.length >= 3) {
            _.merge(jsonObj.stackedBarCharts[0].stackedBarchartItems, otherChartColors);
        }
        else {
            var tempColors = [{ "color": this.GRAPH_COLORS.DB_TWO_PIE_COLORS1[0] }, { "color": this.GRAPH_COLORS.DB_TWO_PIE_COLORS1[1] }];
            _.merge(jsonObj.stackedBarCharts[0].stackedBarchartItems, tempColors);
        }
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
    OperationalFlownController.prototype.tabLockSlide = function (tabname) {
        this.$ionicSlideBoxDelegate.$getByHandle(tabname).enableSlide(false);
    };
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
        if (this.toggle.flightReason == "chart")
            this.onSlideMove({ index: this.header.tabIndex });
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
    OperationalFlownController.prototype.openFlightProcessDrillPopover = function ($event, data, selFindLevel) {
        this.drillName = 'FLIGHT PROCESSING STATUS - ' + data.point[0] + '-' + this.header.flownMonth;
        this.drillType = 'flight-process';
        this.groups = [];
        this.drilltabs = ['Country Level', 'Sector Level', 'Flight Level', 'Document Level'];
        this.firstColumns = ['countryFrom', 'flownSector', 'flightNumber', 'carrierCode#'];
        this.initiateArray(this.drilltabs);
        var that = this;
        this.$timeout(function () {
            that.drillpopover.show($event);
            that.shownGroup = 0;
        }, 50);
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
        var that = this;
        this.$timeout(function () {
            that.drillpopover.show($event);
            that.shownGroup = 0;
        }, 50);
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
        var that = this;
        this.$timeout(function () {
            that.drillpopover.show($event);
            that.shownGroup = 0;
        }, 50);
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
            console.log(this.selectedDrill);
            this.selectedDrill[i] = '';
            console.log(this.selectedDrill);
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
        start = 0;
        if (total > 5) {
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
        'OperationalService', '$ionicSlideBoxDelegate', '$timeout', '$window', 'ReportSvc', 'FilteredListService', 'UserService', '$ionicHistory', 'GRAPH_COLORS', 'TABS', '$ionicPopup'];
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
            if (attributes.type == 'metric' || attributes.type == 'target' || attributes.type == 'passenger-count') {
                nvd3 = iElement.find('nvd3')[0];
            }
            if (attributes.type == 'flight-process' || attributes.type == 'flight-count' || attributes.type == 'coupon-count') {
                nvd3 = iElement.find('nvd3-multi-bar-chart')[0];
            }
            var selectedElem = angular.element(nvd3);
            self.$timeout(function () {
                selectedElem.ready(function (e) {
                    var first;
                    selectedElem.on('mouseover touchend', function (event) {
                        if (!first) {
                            self.appendClick(selectedElem, attributes, self);
                            first = 1;
                        }
                    });
                    /*
                    $scope.$watch(function() { return selectedElem.html();	 }, function(newValue, oldValue) {
                        if (newValue) {
                            //console.log(newValue);
                            self.appendClick(selectedElem, attributes, self);
                        }
                    }, true);*/
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
                            if (attributes.type == 'metric' || attributes.type == 'target' || attributes.type == 'passenger-count') {
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
        cache: false,
        url: '/login',
        templateUrl: 'components/user/login.html',
        controller: 'LoginController as LoginCtrl'
    })
        .state('app.mis-flown', {
        cache: false,
        url: '/mis/flown',
        views: {
            'menuContent': {
                templateUrl: 'components/mis/flown.html',
                controller: 'MisController as MisCtrl'
            }
        }
    })
        .state('app.operational-flown', {
        cache: false,
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
        .service('ReportSvc', ['$q', '$timeout',
        reportSvc]);
    // genReportDef --> genReportDoc --> buffer[] --> Blob() --> saveFile --> return filePath
    function reportSvc($q, $timeout) {
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
                dd = generateReport(statusFlag, title, flownMonth);
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
        function generateReport(param, chartTitle, flownMonth) {
            var deferred = $q.defer();
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
                    var canvasElm = document.getElementById('canvas');
                    var imgsrc = canvasElm.toDataURL();
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
            if (param == "revenueAnalysis") {
                var node = document.getElementById("net-revenue-chart");
                var pdfRender = angular.element(document.querySelector('#pdf-render'));
                pdfRender.append(node.childNodes[1]);
                html2canvas(document.getElementsByClassName('net-revenue-pdf')).then(function (canvas) {
                    var c = canvas.toDataURL();
                    var text = "\n\n\n\n\n\n\n\n\n\n\n\n" + node.getAttribute('data-item-title') + "\n\n";
                    textObj['text'] = text;
                    textColumn.push(textObj);
                    imagesObj['image'] = c;
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
                    deferred.resolve({ content: content });
                    pdfRender.empty();
                });
            }
            else if (param == "sectorcarrieranalysis") {
                var svgNode = d3.selectAll("." + param);
                angular.forEach(svgNode[0], function (value, key) {
                    var node = document.getElementById('sector-carrier-chart' + key);
                    var eleID = 'sector-carrier-chart' + key;
                    html2canvas(document.getElementById(eleID)).then(function (canvas) {
                        var c = canvas.toDataURL();
                        var text = "\n\n" + node.getAttribute('data-item-title') + "\n\n";
                        textObj['text'] = text;
                        textColumn.push(textObj);
                        imagesObj['width'] = 500;
                        imagesObj['image'] = c;
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
                        if (key == svgNode[0].length - 1) {
                            deferred.resolve({ content: content });
                        }
                    });
                });
            }
            else if (param == "routerevenue") {
                var eleID = 'route-revenue-pdf';
                html2canvas(document.getElementById(eleID)).then(function (canvas) {
                    var c = canvas.toDataURL();
                    var text = "";
                    textObj['text'] = text;
                    textColumn.push(textObj);
                    imagesObj['width'] = 500;
                    imagesObj['image'] = c;
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
                    deferred.resolve({ content: content });
                });
            }
            else {
                deferred.resolve({ content: content });
            }
            return deferred.promise;
        }
        ;
    }
})();

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9saWJzLnRzIiwiY29tbW9uL3V0aWxzL1V0aWxzLnRzIiwiY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvQ29yZG92YVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvTmV0U2VydmljZS50cyIsImNvbW1vbi9zZXJ2aWNlcy9FcnJvckhhbmRsZXJTZXJ2aWNlLnRzIiwiY29tbW9uL3NlcnZpY2VzL0lTZXNzaW9uSHR0cFByb21pc2UuanMiLCJjb21tb24vc2VydmljZXMvU2Vzc2lvblNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1Jlc3BvbnNlLmpzIiwiY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHMiLCJjb21tb24vYXBwL0FwcENvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvc2VydmljZXMvT3BlcmF0aW9uYWxTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvTWlzQ29udHJvbGxlci50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL3VzZXIvTG9naW5Db250cm9sbGVyLnRzIiwiY29tbW9uL2NoYXJ0LWV2ZW50L0NoYXJ0RXZlbnQudHMiLCJhcHAudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1JlcXVlc3QuanMiLCJjb21wb25lbnRzL21pcy9wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvcmV2ZW51ZS1wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvcmVwb3J0QnVpbGRlclN2Yy50cyIsImNvbXBvbmVudHMvbWlzL3NlcnZpY2VzL3JlcG9ydFNlcnZpY2UudHMiXSwibmFtZXMiOlsiVXRpbHMiLCJVdGlscy5jb25zdHJ1Y3RvciIsIlV0aWxzLmlzTm90RW1wdHkiLCJVdGlscy5pc0xhbmRzY2FwZSIsIlV0aWxzLmdldFRvZGF5RGF0ZSIsIlV0aWxzLmlzSW50ZWdlciIsIkxvY2FsU3RvcmFnZVNlcnZpY2UiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTG9jYWxTdG9yYWdlU2VydmljZS5zZXQiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldCIsIkxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0T2JqZWN0IiwiTG9jYWxTdG9yYWdlU2VydmljZS5nZXRPYmplY3QiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmlzUmVjZW50RW50cnlBdmFpbGFibGUiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmFkZFJlY2VudEVudHJ5IiwiQ29yZG92YVNlcnZpY2UiLCJDb3Jkb3ZhU2VydmljZS5jb25zdHJ1Y3RvciIsIkNvcmRvdmFTZXJ2aWNlLmV4ZWMiLCJDb3Jkb3ZhU2VydmljZS5leGVjdXRlUGVuZGluZyIsIk5ldFNlcnZpY2UiLCJOZXRTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTmV0U2VydmljZS5nZXREYXRhIiwiTmV0U2VydmljZS5wb3N0RGF0YSIsIk5ldFNlcnZpY2UuZGVsZXRlRGF0YSIsIk5ldFNlcnZpY2UudXBsb2FkRmlsZSIsIk5ldFNlcnZpY2UuY2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkiLCJOZXRTZXJ2aWNlLnNlcnZlcklzQXZhaWxhYmxlIiwiTmV0U2VydmljZS5jYW5jZWxBbGxVcGxvYWREb3dubG9hZCIsIk5ldFNlcnZpY2UuYWRkTWV0YUluZm8iLCJlcnJvcmhhbmRsZXIiLCJFcnJvckhhbmRsZXJTZXJ2aWNlIiwiRXJyb3JIYW5kbGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkVycm9ySGFuZGxlclNlcnZpY2UudmFsaWRhdGVSZXNwb25zZSIsIkVycm9ySGFuZGxlclNlcnZpY2UuaXNOb1Jlc3VsdEZvdW5kIiwiRXJyb3JIYW5kbGVyU2VydmljZS5pc1Nlc3Npb25JbnZhbGlkIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNIYXJkRXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNTb2Z0RXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNFcnJvcnMiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc05vUmVzdWx0RXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0hhcmRFcnJvciIsIkVycm9ySGFuZGxlclNlcnZpY2UuaGFzU29mdEVycm9yIiwic2Vzc2lvbnNlcnZpY2UiLCJTZXNzaW9uU2VydmljZSIsIlNlc3Npb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiU2Vzc2lvblNlcnZpY2UucmVzb2x2ZVByb21pc2UiLCJTZXNzaW9uU2VydmljZS5hZGRBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyIiwiU2Vzc2lvblNlcnZpY2UucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lciIsIlNlc3Npb25TZXJ2aWNlLnNldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLnNldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLmNsZWFyTGlzdGVuZXJzIiwiU2Vzc2lvblNlcnZpY2UucmVmcmVzaFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkIiwiU2Vzc2lvblNlcnZpY2UuYWNjZXNzVG9rZW5SZWZyZXNoZWQiLCJkYXRhcHJvdmlkZXIiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlIiwiRGF0YVByb3ZpZGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkRhdGFQcm92aWRlclNlcnZpY2UuZ2V0RGF0YSIsIkRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmRlbGV0ZURhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiRGF0YVByb3ZpZGVyU2VydmljZS5hZGRNZXRhSW5mbyIsIkRhdGFQcm92aWRlclNlcnZpY2UuaXNMb2dvdXRTZXJ2aWNlIiwiQXBwQ29udHJvbGxlciIsIkFwcENvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJBcHBDb250cm9sbGVyLmlzTm90RW1wdHkiLCJBcHBDb250cm9sbGVyLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiQXBwQ29udHJvbGxlci5sb2dvdXQiLCJBcHBDb250cm9sbGVyLmdldFVzZXJEZWZhdWx0UGFnZSIsIkFwcENvbnRyb2xsZXIuc2hvd0Rhc2hib2FyZCIsIk1pc1NlcnZpY2UiLCJNaXNTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTWlzU2VydmljZS5nZXRNZXRyaWNTbmFwc2hvdCIsIk1pc1NlcnZpY2UuZ2V0VGFyZ2V0VnNBY3R1YWwiLCJNaXNTZXJ2aWNlLmdldFJldmVudWVBbmFseXNpcyIsIk1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlIiwiTWlzU2VydmljZS5nZXRTZWN0b3JDYXJyaWVyQW5hbHlzaXMiLCJNaXNTZXJ2aWNlLmdldFBheEZsb3duTWlzSGVhZGVyIiwiTWlzU2VydmljZS5nZXRSb3V0ZVJldmVudWVEcmlsbERvd24iLCJNaXNTZXJ2aWNlLmdldEJhckRyaWxsRG93biIsIk1pc1NlcnZpY2UuZ2V0RHJpbGxEb3duIiwiQ2hhcnRvcHRpb25TZXJ2aWNlIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLmxpbmVDaGFydE9wdGlvbnMiLCJDaGFydG9wdGlvblNlcnZpY2UubXVsdGlCYXJDaGFydE9wdGlvbnMiLCJDaGFydG9wdGlvblNlcnZpY2UubWV0cmljQmFyQ2hhcnRPcHRpb25zIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLnRhcmdldEJhckNoYXJ0T3B0aW9ucyIsIkZpbHRlcmVkTGlzdFNlcnZpY2UiLCJGaWx0ZXJlZExpc3RTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiRmlsdGVyZWRMaXN0U2VydmljZS5zZWFyY2hlZCIsIkZpbHRlcmVkTGlzdFNlcnZpY2UucGFnZWQiLCJzZWFyY2hVdGlsIiwiT3BlcmF0aW9uYWxTZXJ2aWNlIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldFBheEZsb3duT3BySGVhZGVyIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckZsaWdodFByb2NTdGF0dXMiLCJPcGVyYXRpb25hbFNlcnZpY2UuZ2V0T3ByRmxpZ2h0Q291bnRCeVJlYXNvbiIsIk9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJDb3Vwb25Db3VudEJ5RXhjZXB0aW9uIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldERyaWxsRG93biIsIlVzZXJTZXJ2aWNlIiwiVXNlclNlcnZpY2UuY29uc3RydWN0b3IiLCJVc2VyU2VydmljZS5zZXRVc2VyIiwiVXNlclNlcnZpY2UubG9nb3V0IiwiVXNlclNlcnZpY2UuaXNMb2dnZWRJbiIsIlVzZXJTZXJ2aWNlLmlzVXNlckxvZ2dlZEluIiwiVXNlclNlcnZpY2UuZ2V0VXNlciIsIlVzZXJTZXJ2aWNlLmxvZ2luIiwiVXNlclNlcnZpY2UuZ2V0VXNlclByb2ZpbGUiLCJVc2VyU2VydmljZS5zaG93RGFzaGJvYXJkIiwiTWlzQ29udHJvbGxlciIsIk1pc0NvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJNaXNDb250cm9sbGVyLmluaXREYXRhIiwiTWlzQ29udHJvbGxlci5nZXRQcm9maWxlVXNlck5hbWUiLCJNaXNDb250cm9sbGVyLnNlbGVjdGVkRmxvd25Nb250aCIsIk1pc0NvbnRyb2xsZXIub3BlbmluZm9Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jbG9zZVBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3Nlc0JhclBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3NlSW5mb1BvcG92ZXIiLCJNaXNDb250cm9sbGVyLnVwZGF0ZUhlYWRlciIsIk1pc0NvbnRyb2xsZXIub25TbGlkZU1vdmUiLCJNaXNDb250cm9sbGVyLnRvZ2dsZU1ldHJpYyIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlU3VyY2hhcmdlIiwiTWlzQ29udHJvbGxlci50b2dnbGVUYXJnZXQiLCJNaXNDb250cm9sbGVyLnRvZ2dsZVNlY3RvciIsIk1pc0NvbnRyb2xsZXIuY2FsbE1ldHJpY1NuYXBzaG90IiwiTWlzQ29udHJvbGxlci5jYWxsVGFyZ2V0VnNBY3R1YWwiLCJNaXNDb250cm9sbGVyLmNhbGxSb3V0ZVJldmVudWUiLCJNaXNDb250cm9sbGVyLmNhbGxSZXZlbnVlQW5hbHlzaXMiLCJNaXNDb250cm9sbGVyLm9wZW5EcmlsbERvd24iLCJNaXNDb250cm9sbGVyLmNsZWFyRHJpbGwiLCJNaXNDb250cm9sbGVyLmRyaWxsRG93blJlcXVlc3QiLCJNaXNDb250cm9sbGVyLmdldERyaWxsRG93blVSTCIsIk1pc0NvbnRyb2xsZXIub3BlbkJhckRyaWxsRG93biIsIk1pc0NvbnRyb2xsZXIuaW5pdGlhdGVBcnJheSIsIk1pc0NvbnRyb2xsZXIub3BlbkJhckRyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5UYXJnZXREcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5vcGVuUmV2ZW51ZURyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5SZXZlbnVlUGFzc2VuZ2VyRHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5TZWN0b3JQb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jYWxsU2VjdG9yQ2FycmllckFuYWx5c2lzIiwiTWlzQ29udHJvbGxlci50YXJnZXRBY3R1YWxGaWx0ZXIiLCJNaXNDb250cm9sbGVyLnNlY3RvckNhcnJpZXJGaWx0ZXIiLCJNaXNDb250cm9sbGVyLnJldmVudWVBbmFseXNpc0ZpbHRlciIsIk1pc0NvbnRyb2xsZXIuZ2V0Rmxvd25GYXZvcml0ZXMiLCJNaXNDb250cm9sbGVyLmlvbmljTG9hZGluZ1Nob3ciLCJNaXNDb250cm9sbGVyLmlvbmljTG9hZGluZ0hpZGUiLCJNaXNDb250cm9sbGVyLm9wZW5EcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jbG9zZXNQb3BvdmVyIiwiTWlzQ29udHJvbGxlci5pc0RyaWxsUm93U2VsZWN0ZWQiLCJNaXNDb250cm9sbGVyLnNlYXJjaFJlc3VsdHMiLCJNaXNDb250cm9sbGVyLnBhZ2luYXRpb24iLCJNaXNDb250cm9sbGVyLnNldFBhZ2UiLCJNaXNDb250cm9sbGVyLmxhc3RQYWdlIiwiTWlzQ29udHJvbGxlci5yZXNldEFsbCIsIk1pc0NvbnRyb2xsZXIuc29ydCIsIk1pc0NvbnRyb2xsZXIucmFuZ2UiLCJNaXNDb250cm9sbGVyLnRvZ2dsZUdyb3VwIiwiTWlzQ29udHJvbGxlci5pc0dyb3VwU2hvd24iLCJNaXNDb250cm9sbGVyLnRvZ2dsZUNoYXJ0T3JUYWJsZVZpZXciLCJNaXNDb250cm9sbGVyLnRvZ2dsZVRhcmdldFZpZXciLCJNaXNDb250cm9sbGVyLnRvZ2dsZVJldmVudWVWaWV3IiwiTWlzQ29udHJvbGxlci50b2dnbGVTZWN0b3JWaWV3IiwiTWlzQ29udHJvbGxlci5ydW5SZXBvcnQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNvbnN0cnVjdG9yIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaW5pdERhdGEiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5zZWxlY3RlZEZsb3duTW9udGgiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5nZXRQcm9maWxlVXNlck5hbWUiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci51cGRhdGVIZWFkZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vblNsaWRlTW92ZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNhbGxNeURhc2hib2FyZCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNhbGxGbGlnaHRQcm9jU3RhdHVzIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2FsbEZsaWdodENvdW50QnlSZWFzb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5Qb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlblBpZVBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jbG9zZVBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pb25pY0xvYWRpbmdTaG93IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuYXBwbHlDaGFydENvbG9yQ29kZXMiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5nZXRGYXZvcml0ZUl0ZW1zIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY29sb3JGdW5jdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmZvdXJCYXJDb2xvckZ1bmN0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbmluZm9Qb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2xvc2VJbmZvUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUNvdW50IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaW9uaWNMb2FkaW5nSGlkZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmxvY2tTbGlkZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRhYkxvY2tTbGlkZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLndlZWtEYXRhUHJldiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLndlZWtEYXRhTmV4dCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUZsaWdodFN0YXR1c1ZpZXciLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50b2dnbGVGbGlnaHRSZWFzb25WaWV3IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudG9nZ2xlQ0NFeGNlcHRpb25WaWV3IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIucnVuUmVwb3J0IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbkZsaWdodFByb2Nlc3NEcmlsbFBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vcGVuQ291bnBvbkNvdW50RHJpbGxQb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbkZsaWdodENvdW50RHJpbGxQb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuZHJpbGxEb3duUmVxdWVzdCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmdldERyaWxsRG93blVSTCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRhYlNsaWRlSGFzQ2hhbmdlZCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5EcmlsbERvd24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jbG9zZURyaWxsUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNsZWFyRHJpbGwiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pbml0aWF0ZUFycmF5IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaXNEcmlsbFJvd1NlbGVjdGVkIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuc2VhcmNoUmVzdWx0cyIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnBhZ2luYXRpb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5zZXRQYWdlIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIubGFzdFBhZ2UiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5yZXNldEFsbCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnNvcnQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5yYW5nZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUdyb3VwIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaXNHcm91cFNob3duIiwiTG9naW5Db250cm9sbGVyIiwiTG9naW5Db250cm9sbGVyLmNvbnN0cnVjdG9yIiwiTG9naW5Db250cm9sbGVyLmNsZWFyRXJyb3IiLCJMb2dpbkNvbnRyb2xsZXIuZG9Mb2dpbiIsIkNoYXJ0RXZlbnQiLCJDaGFydEV2ZW50LmNvbnN0cnVjdG9yIiwiQ2hhcnRFdmVudC5mYWN0b3J5IiwiQ2hhcnRFdmVudC5hcHBlbmRDbGljayIsInJlcG9ydEJ1aWxkZXJTZXJ2aWNlIiwicmVwb3J0QnVpbGRlclNlcnZpY2UuX2dlbmVyYXRlUmVwb3J0IiwicmVwb3J0U3ZjIiwicmVwb3J0U3ZjLl9ydW5SZXBvcnRBc3luYyIsInJlcG9ydFN2Yy5fcnVuUmVwb3J0RGF0YVVSTCIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERlZiIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERvYyIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydEJ1ZmZlciIsInJlcG9ydFN2Yy5nZXREYXRhVVJMIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0QmxvYiIsInJlcG9ydFN2Yy5zYXZlRmlsZSIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGUyIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGaWxlRW50cnkiLCJyZXBvcnRTdmMuc2F2ZUZpbGUuZ290RmlsZVdyaXRlciIsInJlcG9ydFN2Yy5zYXZlRmlsZS5mYWlsIiwicmVwb3J0U3ZjLnVuaXF1ZUZpbGVOYW1lIiwicmVwb3J0U3ZjLmdl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QSxHQUFHQSxDQUFDQSxDQUFDQSxJQUFJQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNwS0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzlGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMxQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDekJBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2hDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUM3RkEsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDdENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUN0QkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDaENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNoR0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsZ0JBQWdCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNqQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDcERBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ3BLQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxR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UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsVUFBVUEsSUFBSUEsU0FBU0EsSUFBSUEsaUJBQWlCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUM3REEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDakNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxJQUFJQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMzREEsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDcEtBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJ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QSxTQUFTQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxFQUFFQSxJQUFJQSxDQUFDQSxhQUFhQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQTtRQUM5R0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7SUFDekJBLENBQUNBOztJQUNEL0MsMENBQUtBLEdBQUxBLFVBQU1BLEtBQUtBLEVBQUVBLEtBQUtBO1FBQ2hCZ0QsSUFBSUEsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0E7UUFDYkEsSUFBSUEsS0FBYUEsQ0FBQ0E7UUFDbEJBLEtBQUtBLEdBQUdBLENBQUNBLENBQUNBO1FBQ1ZBLEVBQUVBLENBQUFBLENBQUNBLEtBQUtBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2JBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQzlDQSxDQUFDQTtRQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNkQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNaQSxDQUFDQTtRQUNEQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNWQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxLQUFLQSxFQUFFQSxDQUFDQSxHQUFHQSxLQUFLQSxFQUFFQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQTtZQUNuQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDWkEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7WUFDSkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1ZBLEtBQUtBLENBQUNBO1lBQ1JB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QUNBO1FBQ3pCQSxDQUFDQTtRQUNEUix3QkFBd0JBLFFBQVFBO1lBQy9CYSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxJQUFJQSxFQUFFQSxDQUFDQTtZQUNyQkEsSUFBSUEsU0FBU0EsR0FBR0EsR0FBR0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0E7WUFDN0NBLFNBQVNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLFFBQVFBLEVBQUVBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLFFBQVFBLEVBQUVBLENBQUNBLFFBQVFBLEVBQUVBLENBQUNBO1lBQ3pFQSxTQUFTQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxPQUFPQSxFQUFFQSxHQUFHQSxFQUFFQSxHQUFHQSxHQUFHQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxPQUFPQSxFQUFFQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQTtZQUN4RUEsU0FBU0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsUUFBUUEsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0E7WUFDMUVBLFNBQVNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLFVBQVVBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLFVBQVVBLEVBQUVBLENBQUNBLFFBQVFBLEVBQUVBLENBQUNBO1lBQzlFQSxTQUFTQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFVQSxFQUFFQSxHQUFHQSxFQUFFQSxHQUFHQSxHQUFHQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxVQUFVQSxFQUFFQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQTtZQUM5RUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsR0FBQ0EsR0FBR0EsR0FBQ0EsU0FBU0EsQ0FBQ0E7UUFFN0NBLENBQUNBO1FBRURiLHdCQUF3QkEsS0FBS0EsRUFBRUEsVUFBVUEsRUFBQ0EsVUFBVUE7WUFDbkRjLElBQUlBLFFBQVFBLEdBQUdBLEVBQUVBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO1lBRTFCQSxJQUFJQSxLQUFLQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUNmQSxFQUFFQSxDQUFBQSxDQUFDQSxLQUFLQSxJQUFJQSxnQkFBZ0JBLENBQUNBO2dCQUM1QkEsS0FBS0EsR0FBR0EsbUJBQW1CQSxHQUFDQSxVQUFVQSxHQUFDQSxHQUFHQSxHQUFDQSxVQUFVQSxDQUFDQSxXQUFXQSxFQUFFQSxHQUFDQSxRQUFRQSxDQUFDQTtZQUM5RUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsS0FBS0EsSUFBSUEsY0FBY0EsQ0FBQ0E7Z0JBQy9CQSxLQUFLQSxHQUFHQSxxQkFBcUJBLEdBQUNBLENBQUNBLENBQUNBLFVBQVVBLElBQUlBLFNBQVNBLENBQUNBLEdBQUNBLGFBQWFBLEdBQUNBLFdBQVdBLENBQUNBLEdBQUNBLEdBQUdBLEdBQUNBLFVBQVVBLEdBQUVBLFNBQVNBLENBQUNBO1lBQy9HQSxJQUFJQTtnQkFDSEEsS0FBS0EsR0FBR0EsVUFBVUEsR0FBQ0EsR0FBR0EsR0FBQ0EsVUFBVUEsR0FBQ0EsU0FBU0EsQ0FBQ0E7WUFFN0NBLElBQUlBLE9BQU9BLEdBQUdBLEVBQUVBLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLEdBQUNBLEtBQUtBLENBQUNBLENBQUNBLFNBQVNBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO1lBQ3ZEQSxJQUFJQSxPQUFPQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUNqQkEsSUFBSUEsV0FBV0EsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDckJBLElBQUlBLFVBQVVBLEdBQUdBLEVBQUVBLENBQUNBO1lBQ3BCQSxJQUFJQSxTQUFTQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUNuQkEsSUFBSUEsT0FBT0EsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDakJBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO1lBQ3BCQSxJQUFJQSxVQUFVQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUNwQkEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsT0FBT0EsRUFBRUEsVUFBU0EsS0FBS0EsRUFBRUEsR0FBR0E7Z0JBQzNDLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDZCxFQUFFLENBQUEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFBLENBQUM7b0JBQ2hILElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO29CQUNqQyxFQUFFLENBQUEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLFdBQVcsQ0FBQyxDQUFBLENBQUM7d0JBQzdFLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFDLEtBQUssR0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDN0QsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUMsS0FBSyxHQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUM3RCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBQyxLQUFLLEdBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUNyRCxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQzt3QkFDNUIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQzt3QkFDekIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQztvQkFDM0IsQ0FBQztvQkFDRCxFQUFFLENBQUEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUMzRSxDQUFDO3dCQUNBLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUM7d0JBQ3pCLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUM7b0JBQzNCLENBQUM7b0JBQ0QsS0FBSyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQy9DLElBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ2xELElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDbkMsSUFBSyxJQUFJLEdBQUcsSUFBSSxHQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEdBQUMsSUFBSSxDQUFDO29CQUM5RSxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDO29CQUN2QixVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUN6QixTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDO29CQUM1QixXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUM1QixJQUFJLE9BQU8sR0FBRSxFQUFFLEVBQUUsT0FBTyxHQUFFLEVBQUUsQ0FBQztvQkFDN0IsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLFVBQVUsQ0FBQztvQkFDaEMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLFFBQVEsQ0FBQztvQkFDaEMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLFdBQVcsQ0FBQztvQkFDakMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDdEIsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDdEIsV0FBVyxHQUFHLEVBQUUsQ0FBQztvQkFDakIsVUFBVSxHQUFHLEVBQUUsQ0FBQztvQkFDaEIsU0FBUyxHQUFHLEVBQUUsQ0FBQztvQkFDZixPQUFPLEdBQUcsRUFBRSxDQUFDO29CQUNiLE9BQU8sR0FBRyxFQUFFLENBQUM7b0JBQ2IsT0FBTyxHQUFFLEVBQUUsQ0FBQztvQkFDWixVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztnQkFDekUsQ0FBQztZQUNGLENBQUMsQ0FBQ0EsQ0FBQ0E7WUFDSEEsRUFBRUEsQ0FBQUEsQ0FBQ0EsS0FBS0EsSUFBSUEsaUJBQWlCQSxDQUFDQSxDQUFBQSxDQUFDQTtnQkFDOUJBLElBQUlBLElBQUlBLEdBQUdBLFFBQVFBLENBQUNBLGNBQWNBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3hEQSxJQUFJQSxTQUFTQSxHQUFHQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxhQUFhQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDdkVBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUNyQ0EsV0FBV0EsQ0FBQ0EsUUFBUUEsQ0FBQ0Esc0JBQXNCQSxDQUFDQSxpQkFBaUJBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFVBQVNBLE1BQU1BO29CQUNuRixJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQzNCLElBQUssSUFBSSxHQUFHLDBCQUEwQixHQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsR0FBQyxNQUFNLENBQUM7b0JBQ25GLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUM7b0JBQ3ZCLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ3pCLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3ZCLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQzVCLElBQUksT0FBTyxHQUFFLEVBQUUsRUFBRSxPQUFPLEdBQUUsRUFBRSxDQUFDO29CQUM3QixPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsVUFBVSxDQUFDO29CQUNoQyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsUUFBUSxDQUFDO29CQUNoQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsV0FBVyxDQUFDO29CQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUN0QixPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUN0QixXQUFXLEdBQUcsRUFBRSxDQUFDO29CQUNqQixVQUFVLEdBQUcsRUFBRSxDQUFDO29CQUNoQixTQUFTLEdBQUcsRUFBRSxDQUFDO29CQUNmLE9BQU8sR0FBRyxFQUFFLENBQUM7b0JBQ2IsT0FBTyxHQUFHLEVBQUUsQ0FBQztvQkFDYixPQUFPLEdBQUUsRUFBRSxDQUFDO29CQUNaLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQztvQkFDckMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNuQixDQUFDLENBQUNBLENBQUNBO1lBQ0pBLENBQUNBO1lBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLEtBQUtBLElBQUlBLHVCQUF1QkEsQ0FBQ0EsQ0FBQUEsQ0FBQ0E7Z0JBQzNDQSxJQUFJQSxPQUFPQSxHQUFHQSxFQUFFQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxHQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtnQkFDdENBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBLEVBQUVBLFVBQVNBLEtBQUtBLEVBQUVBLEdBQUdBO29CQUM5QyxJQUFJLElBQUksR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLHNCQUFzQixHQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUMvRCxJQUFJLEtBQUssR0FBRyxzQkFBc0IsR0FBQyxHQUFHLENBQUM7b0JBQ3ZDLFdBQVcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsTUFBTTt3QkFDL0QsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO3dCQUMzQixJQUFLLElBQUksR0FBRyxNQUFNLEdBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFDLE1BQU0sQ0FBQzt3QkFDL0QsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQzt3QkFDdkIsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDekIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQzt3QkFDekIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDdkIsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzt3QkFDNUIsSUFBSSxPQUFPLEdBQUUsRUFBRSxFQUFFLE9BQU8sR0FBRSxFQUFFLENBQUM7d0JBQzdCLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxVQUFVLENBQUM7d0JBQ2hDLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxRQUFRLENBQUM7d0JBQ2hDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxXQUFXLENBQUM7d0JBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ3RCLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ3RCLFdBQVcsR0FBRyxFQUFFLENBQUM7d0JBQ2pCLFVBQVUsR0FBRyxFQUFFLENBQUM7d0JBQ2hCLFNBQVMsR0FBRyxFQUFFLENBQUM7d0JBQ2YsT0FBTyxHQUFHLEVBQUUsQ0FBQzt3QkFDYixPQUFPLEdBQUcsRUFBRSxDQUFDO3dCQUNiLE9BQU8sR0FBRSxFQUFFLENBQUM7d0JBQ1osRUFBRSxDQUFBLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQzs0QkFDOUIsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUMsQ0FBQyxDQUFDO3dCQUN0QyxDQUFDO29CQUNGLENBQUMsQ0FBQyxDQUFDO2dCQUNKLENBQUMsQ0FBQ0EsQ0FBQ0E7WUFDSkEsQ0FBQ0E7WUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsS0FBS0EsSUFBSUEsY0FBY0EsQ0FBQ0EsQ0FBQUEsQ0FBQ0E7Z0JBQ2pDQSxJQUFJQSxLQUFLQSxHQUFHQSxtQkFBbUJBLENBQUNBO2dCQUNoQ0EsV0FBV0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBU0EsTUFBTUE7b0JBQy9ELElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDM0IsSUFBSyxJQUFJLEdBQUcsRUFBRSxDQUFDO29CQUNmLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUM7b0JBQ3ZCLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ3pCLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUM7b0JBQ3pCLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3ZCLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQzVCLElBQUksT0FBTyxHQUFFLEVBQUUsRUFBRSxPQUFPLEdBQUUsRUFBRSxDQUFDO29CQUM3QixPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsVUFBVSxDQUFDO29CQUNoQyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsUUFBUSxDQUFDO29CQUNoQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsV0FBVyxDQUFDO29CQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUN0QixPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUN0QixXQUFXLEdBQUcsRUFBRSxDQUFDO29CQUNqQixVQUFVLEdBQUcsRUFBRSxDQUFDO29CQUNoQixTQUFTLEdBQUcsRUFBRSxDQUFDO29CQUNmLE9BQU8sR0FBRyxFQUFFLENBQUM7b0JBQ2IsT0FBTyxHQUFHLEVBQUUsQ0FBQztvQkFDYixPQUFPLEdBQUUsRUFBRSxDQUFDO29CQUNaLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQztnQkFDdEMsQ0FBQyxDQUFDQSxDQUFDQTtZQUNKQSxDQUFDQTtZQUFBQSxJQUFJQSxDQUFBQSxDQUFDQTtnQkFDTEEsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsRUFBQ0EsT0FBT0EsRUFBRUEsT0FBT0EsRUFBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDdENBLENBQUNBO1lBRURBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLE9BQU9BLENBQUNBO1FBQ3pCQSxDQUFDQTtRQUFBZCxDQUFDQTtJQUVGQSxDQUFDQTtBQUVILENBQUMsQ0FBQyxFQUFFLENBQUMiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9pb25pYy5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvU2NyZWVuLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9Jc1RhYmxldC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvSW5BcHBCcm93c2VyLmQudHNcIiAvPiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG5cbmNsYXNzIFV0aWxzIHtcblx0cHVibGljIHN0YXRpYyBpc05vdEVtcHR5KC4uLnZhbHVlczogT2JqZWN0W10pOiBib29sZWFuIHtcblx0XHR2YXIgaXNOb3RFbXB0eSA9IHRydWU7XG5cdFx0Xy5mb3JFYWNoKHZhbHVlcywgKHZhbHVlKSA9PiB7XG5cdFx0XHRpc05vdEVtcHR5ID0gaXNOb3RFbXB0eSAmJiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpICYmIHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSAnJ1xuXHRcdFx0XHQmJiAhKChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNPYmplY3QodmFsdWUpKSAmJiBfLmlzRW1wdHkodmFsdWUpKSAmJiB2YWx1ZSAhPSAwKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gaXNOb3RFbXB0eTtcblx0fVxuXG5cdHB1YmxpYyBzdGF0aWMgaXNMYW5kc2NhcGUoKTogYm9vbGVhbiB7XG5cdFx0dmFyIGlzTGFuZHNjYXBlOiBib29sZWFuID0gZmFsc2U7XG5cdFx0aWYgKHdpbmRvdyAmJiB3aW5kb3cuc2NyZWVuICYmIHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24pIHtcblx0XHRcdHZhciB0eXBlOiBzdHJpbmcgPSA8c3RyaW5nPihfLmlzU3RyaW5nKHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24pID8gd2luZG93LnNjcmVlbi5vcmllbnRhdGlvbiA6IHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24udHlwZSk7XG5cdFx0XHRpZiAodHlwZSkge1xuXHRcdFx0XHRpc0xhbmRzY2FwZSA9IHR5cGUuaW5kZXhPZignbGFuZHNjYXBlJykgPj0gMDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGlzTGFuZHNjYXBlO1xuXHR9XG5cblx0cHVibGljIHN0YXRpYyBnZXRUb2RheURhdGUoKTogRGF0ZSB7XG5cdFx0dmFyIHRvZGF5RGF0ZSA9IG5ldyBEYXRlKCk7XG5cdFx0dG9kYXlEYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuXHRcdHJldHVybiB0b2RheURhdGU7XG5cdH1cblx0cHJpdmF0ZSBzdGF0aWMgaXNJbnRlZ2VyKG51bWJlcjogQmlnSnNMaWJyYXJ5LkJpZ0pTKTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIHBhcnNlSW50KG51bWJlci50b1N0cmluZygpKSA9PSArbnVtYmVyO1xuXHR9XG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cblxuaW50ZXJmYWNlIFBvaW50T2JqZWN0IHtcblx0Y29kZTogc3RyaW5nLFxuXHRkZXNjcmlwdGlvbjogc3RyaW5nXG59XG5cbmludGVyZmFjZSBJTG9jYWxTdG9yYWdlU2VydmljZSB7XG5cdHNldChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogc3RyaW5nKTogdm9pZDtcblx0Z2V0KGtleUlkOiBzdHJpbmcsIGRlZmF1bHRWYWx1ZTogc3RyaW5nKTogc3RyaW5nO1xuXHRzZXRPYmplY3Qoa2V5SWQ6IHN0cmluZywga2V5dmFsdWU6IGFueVtdKTogdm9pZDtcblx0Z2V0T2JqZWN0KGtleUlkOiBzdHJpbmcpOiBhbnk7XG5cdGlzUmVjZW50RW50cnlBdmFpbGFibGUob3JnaW5PYmplY3Q6IFBvaW50T2JqZWN0LCB0eXBlOiBzdHJpbmcpOiB2b2lkO1xuXHRhZGRSZWNlbnRFbnRyeShkYXRhOiBhbnksIHR5cGU6IHN0cmluZyk6IHZvaWQ7XG59XG5cbmNsYXNzIExvY2FsU3RvcmFnZVNlcnZpY2UgaW1wbGVtZW50cyBJTG9jYWxTdG9yYWdlU2VydmljZSB7XG5cblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckd2luZG93J107XG5cdHByaXZhdGUgcmVjZW50RW50cmllczogW1BvaW50T2JqZWN0XTtcblxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlKSB7XG5cdH1cblxuXHRzZXQoa2V5SWQ6IHN0cmluZywga2V5dmFsdWU6IHN0cmluZyk6IHZvaWQge1xuXHRcdHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdID0ga2V5dmFsdWU7XG5cdH1cblx0Z2V0KGtleUlkOiBzdHJpbmcsIGRlZmF1bHRWYWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcblx0XHRyZXR1cm4gdGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gfHwgZGVmYXVsdFZhbHVlO1xuXHR9XG5cdHNldE9iamVjdChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogYW55W10pOiB2b2lkIHtcblx0XHR0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSA9ICBKU09OLnN0cmluZ2lmeShrZXl2YWx1ZSk7XG5cdH1cblx0Z2V0T2JqZWN0KGtleUlkOiBzdHJpbmcpOiBhbnkge1xuXHRcdHJldHVybiB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSA/IEpTT04ucGFyc2UodGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0pIDogdW5kZWZpbmVkO1xuXHR9XG5cblx0aXNSZWNlbnRFbnRyeUF2YWlsYWJsZShvcmdpbk9iamVjdDogUG9pbnRPYmplY3QsIHR5cGU6IHN0cmluZykge1xuXHRcdHRoaXMucmVjZW50RW50cmllcyA9IHRoaXMuZ2V0T2JqZWN0KHR5cGUpID8gdGhpcy5nZXRPYmplY3QodHlwZSkgOiBbXTtcblx0XHRyZXR1cm4gdGhpcy5yZWNlbnRFbnRyaWVzLmZpbHRlcihmdW5jdGlvbiAoZW50cnkpIHsgcmV0dXJuIGVudHJ5LmNvZGUgPT09IG9yZ2luT2JqZWN0LmNvZGUgfSk7XG5cdH1cblxuXHRhZGRSZWNlbnRFbnRyeShkYXRhOiBhbnksIHR5cGU6IHN0cmluZykge1xuXHRcdHZhciBvcmdpbk9iamVjdDogUG9pbnRPYmplY3RcdD1cdGRhdGEgPyBkYXRhLm9yaWdpbmFsT2JqZWN0IDogdW5kZWZpbmVkO1xuXG5cdFx0aWYgKG9yZ2luT2JqZWN0KSB7XG5cdFx0XHRpZiAodGhpcy5pc1JlY2VudEVudHJ5QXZhaWxhYmxlKG9yZ2luT2JqZWN0LCB0eXBlKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0dGhpcy5yZWNlbnRFbnRyaWVzID0gdGhpcy5nZXRPYmplY3QodHlwZSkgPyB0aGlzLmdldE9iamVjdCh0eXBlKSA6IFtdO1xuXHRcdFx0XHQodGhpcy5yZWNlbnRFbnRyaWVzLmxlbmd0aCA9PSAzKSA/IHRoaXMucmVjZW50RW50cmllcy5wb3AoKSA6IHRoaXMucmVjZW50RW50cmllcztcblx0XHRcdFx0dGhpcy5yZWNlbnRFbnRyaWVzLnVuc2hpZnQob3JnaW5PYmplY3QpO1xuXHRcdFx0XHR0aGlzLnNldE9iamVjdCh0eXBlLCB0aGlzLnJlY2VudEVudHJpZXMpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cblxuaW50ZXJmYWNlIElDb3Jkb3ZhQ2FsbCB7XG5cdCgpOiB2b2lkO1xufVxuXG5jbGFzcyBDb3Jkb3ZhU2VydmljZSB7XG5cblx0cHJpdmF0ZSBjb3Jkb3ZhUmVhZHk6IGJvb2xlYW4gPSBmYWxzZTtcblx0cHJpdmF0ZSBwZW5kaW5nQ2FsbHM6IElDb3Jkb3ZhQ2FsbFtdID0gW107XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlcmVhZHknLCAoKSA9PiB7XG5cdFx0XHR0aGlzLmNvcmRvdmFSZWFkeSA9IHRydWU7XG5cdFx0XHR0aGlzLmV4ZWN1dGVQZW5kaW5nKCk7XG5cdFx0fSk7XG5cdH1cblxuXHRleGVjKGZuOiBJQ29yZG92YUNhbGwsIGFsdGVybmF0aXZlRm4/OiBJQ29yZG92YUNhbGwpIHtcblx0XHRpZiAodGhpcy5jb3Jkb3ZhUmVhZHkpIHtcblx0XHRcdGZuKCk7XG5cdFx0fSBlbHNlIGlmICghYWx0ZXJuYXRpdmVGbikge1xuXHRcdFx0dGhpcy5wZW5kaW5nQ2FsbHMucHVzaChmbik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGFsdGVybmF0aXZlRm4oKTtcblx0XHR9XG5cdH1cblxuXHRwcml2YXRlIGV4ZWN1dGVQZW5kaW5nKCkge1xuXHRcdHRoaXMucGVuZGluZ0NhbGxzLmZvckVhY2goKGZuKSA9PiB7XG5cdFx0XHRmbigpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5wZW5kaW5nQ2FsbHMgPSBbXTtcblx0fVxuXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi90eXBpbmdzL2FuZ3VsYXJqcy9hbmd1bGFyLmQudHNcIi8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJDb3Jkb3ZhU2VydmljZS50c1wiIC8+XG5cbmludGVyZmFjZSBJTmV0U2VydmljZSB7XG5cdGdldERhdGEoZnJvbVVybDogc3RyaW5nKTogbmcuSUh0dHBQcm9taXNlPGFueT47XG5cdHBvc3REYXRhKHRvVXJsOiBzdHJpbmcsIGRhdGE6IGFueSk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xuXHRkZWxldGVEYXRhKHRvVXJsOiBzdHJpbmcpOiBuZy5JSHR0cFByb21pc2U8YW55Pjtcblx0Y2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkoKTogbmcuSVByb21pc2U8Ym9vbGVhbj47XG59XG5cbmNsYXNzIE5ldFNlcnZpY2UgaW1wbGVtZW50cyBJTmV0U2VydmljZSB7XG5cblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckaHR0cCcsICdDb3Jkb3ZhU2VydmljZScsICckcScsICdVUkxfV1MnLCAnT1dORVJfQ0FSUklFUl9DT0RFJ107XG5cdHByaXZhdGUgZmlsZVRyYW5zZmVyOiBGaWxlVHJhbnNmZXI7XG5cdHByaXZhdGUgaXNTZXJ2ZXJBdmFpbGFibGU6IGJvb2xlYW4gPSBmYWxzZTtcblxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlICRodHRwOiBuZy5JSHR0cFNlcnZpY2UsIHByaXZhdGUgY29yZG92YVNlcnZpY2U6IENvcmRvdmFTZXJ2aWNlLCBwcm90ZWN0ZWQgJHE6IG5nLklRU2VydmljZSwgcHVibGljIFVSTF9XUzogc3RyaW5nLCBwcml2YXRlIE9XTkVSX0NBUlJJRVJfQ09ERTogc3RyaW5nKSB7XG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy50aW1lb3V0ID0gNjAwMDA7XG5cdFx0Y29yZG92YVNlcnZpY2UuZXhlYygoKSA9PiB7XG5cdFx0XHQvLyB0aGlzLmZpbGVUcmFuc2ZlciA9IG5ldyBGaWxlVHJhbnNmZXIoKTtcblx0XHR9KTtcblx0fVxuXG5cdGdldERhdGEoZnJvbVVybDogc3RyaW5nKTogbmcuSUh0dHBQcm9taXNlPGFueT4ge1xuXHRcdHZhciB1cmw6IHN0cmluZyA9IHRoaXMuVVJMX1dTICsgZnJvbVVybDtcblx0XHRyZXR1cm4gdGhpcy4kaHR0cC5nZXQodXJsKTtcblx0fVxuXG5cdHBvc3REYXRhKHRvVXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcblx0XHRyZXR1cm4gdGhpcy4kaHR0cC5wb3N0KHRoaXMuVVJMX1dTICsgdG9VcmwsIHRoaXMuYWRkTWV0YUluZm8oZGF0YSkpO1xuXHR9XG5cblx0ZGVsZXRlRGF0YSh0b1VybDogc3RyaW5nKTogbmcuSUh0dHBQcm9taXNlPGFueT4ge1xuXHRcdHJldHVybiB0aGlzLiRodHRwLmRlbGV0ZSh0aGlzLlVSTF9XUyArIHRvVXJsKTtcblx0fVxuXG5cdHVwbG9hZEZpbGUoXG5cdFx0dG9Vcmw6IHN0cmluZywgdXJsRmlsZTogc3RyaW5nLFxuXHRcdG9wdGlvbnM6IEZpbGVVcGxvYWRPcHRpb25zLCBzdWNjZXNzQ2FsbGJhY2s6IChyZXN1bHQ6IEZpbGVVcGxvYWRSZXN1bHQpID0+IHZvaWQsXG5cdFx0ZXJyb3JDYWxsYmFjazogKGVycm9yOiBGaWxlVHJhbnNmZXJFcnJvcikgPT4gdm9pZCwgcHJvZ3Jlc3NDYWxsYmFjaz86IChwcm9ncmVzc0V2ZW50OiBQcm9ncmVzc0V2ZW50KSA9PiB2b2lkKSB7XG5cdFx0aWYgKCF0aGlzLmZpbGVUcmFuc2Zlcikge1xuXHRcdFx0dGhpcy5maWxlVHJhbnNmZXIgPSBuZXcgRmlsZVRyYW5zZmVyKCk7XG5cdFx0fVxuXHRcdGNvbnNvbGUubG9nKG9wdGlvbnMucGFyYW1zKTtcblx0XHR0aGlzLmZpbGVUcmFuc2Zlci5vbnByb2dyZXNzID0gcHJvZ3Jlc3NDYWxsYmFjaztcblx0XHR2YXIgdXJsOiBzdHJpbmcgPSB0aGlzLlVSTF9XUyArIHRvVXJsO1xuXHRcdHRoaXMuZmlsZVRyYW5zZmVyLnVwbG9hZCh1cmxGaWxlLCB1cmwsIHN1Y2Nlc3NDYWxsYmFjaywgZXJyb3JDYWxsYmFjaywgb3B0aW9ucyk7XG5cdH1cblxuXHRjaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpOiBuZy5JUHJvbWlzZTxib29sZWFuPiB7XG5cdFx0dmFyIGF2YWlsYWJpbGl0eTogYm9vbGVhbiA9IHRydWU7XG5cblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8Ym9vbGVhbj4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cblx0XHR0aGlzLmNvcmRvdmFTZXJ2aWNlLmV4ZWMoKCkgPT4ge1xuXHRcdFx0aWYgKHdpbmRvdy5uYXZpZ2F0b3IpIHsgLy8gb24gZGV2aWNlXG5cdFx0XHRcdHZhciBuYXZpZ2F0b3I6IE5hdmlnYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3I7XG5cdFx0XHRcdGlmIChuYXZpZ2F0b3IuY29ubmVjdGlvbiAmJiAoKG5hdmlnYXRvci5jb25uZWN0aW9uLnR5cGUgPT0gQ29ubmVjdGlvbi5OT05FKSB8fCAobmF2aWdhdG9yLmNvbm5lY3Rpb24udHlwZSA9PSBDb25uZWN0aW9uLlVOS05PV04pKSkge1xuXHRcdFx0XHRcdGF2YWlsYWJpbGl0eSA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRkZWYucmVzb2x2ZShhdmFpbGFiaWxpdHkpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0c2VydmVySXNBdmFpbGFibGUoKTogYm9vbGVhbiB7XG5cdFx0dmFyIHRoYXQ6IE5ldFNlcnZpY2UgPSB0aGlzO1xuXG5cdFx0dmFyIHNlcnZlcklzQXZhaWxhYmxlID0gdGhpcy5jaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpLnRoZW4oKHJlc3VsdDogYm9vbGVhbikgPT4ge1xuXHRcdFx0dGhhdC5pc1NlcnZlckF2YWlsYWJsZSA9IHJlc3VsdDtcblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzLmlzU2VydmVyQXZhaWxhYmxlO1xuXHR9XG5cblx0Y2FuY2VsQWxsVXBsb2FkRG93bmxvYWQoKSB7XG5cdFx0aWYgKHRoaXMuZmlsZVRyYW5zZmVyKSB7XG5cdFx0XHR0aGlzLmZpbGVUcmFuc2Zlci5hYm9ydCgpO1xuXHRcdH1cblx0fVxuXG5cdGFkZE1ldGFJbmZvKHJlcXVlc3REYXRhOiBhbnkpOiBhbnkge1xuXHRcdHZhciBkZXZpY2U6IElvbmljLklEZXZpY2UgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKVxuXHRcdHZhciBtb2RlbDogc3RyaW5nID0gJ2RldmljZSBJbmZvJztcblx0XHR2YXIgb3NUeXBlOiBzdHJpbmcgPSAnOC40Jztcblx0XHR2YXIgb3NWZXJzaW9uOiBzdHJpbmcgPSAnaW9zJztcblx0XHR2YXIgZGV2aWNlVG9rZW46IHN0cmluZyA9ICdzdHJpbmcnO1xuXHRcdGlmIChkZXZpY2UpIHtcblx0XHRcdG1vZGVsID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkubW9kZWw7XG5cdFx0XHRvc1R5cGUgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5wbGF0Zm9ybTtcblx0XHRcdG9zVmVyc2lvbiA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLnZlcnNpb247XG5cdFx0fVxuXHRcdGlmICghbW9kZWwpIHtcblx0XHRcdG1vZGVsID0gJ2RldmljZSBJbmZvJztcdFxuXHRcdH1cblx0XHRpZiAoIW9zVHlwZSkge1xuXHRcdFx0b3NUeXBlID0gJzguNCc7XHRcblx0XHR9XG5cdFx0aWYgKCFvc1ZlcnNpb24pIHtcblx0XHRcdG9zVmVyc2lvbiA9ICdpb3MnO1x0XG5cdFx0fVxuXHRcdFxuXHRcdHZhciBtZXRhSW5mbyA9IHtcblx0XHRcdCdjaGFubmVsSWRlbnRpZmllcic6ICdNT0InLFxuXHRcdFx0J2RhdGVUaW1lU3RhbXAnOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcblx0XHRcdCdvd25lckNhcnJpZXJDb2RlJzogdGhpcy5PV05FUl9DQVJSSUVSX0NPREUsXG5cdFx0XHQnYWRkaXRpb25hbEluZm8nOiB7XG5cdFx0XHRcdCdkZXZpY2VUeXBlJzogd2luZG93LmlzVGFibGV0ID8gJ1RhYmxldCcgOiAnUGhvbmUnLFxuXHRcdFx0XHQnbW9kZWwnOiBtb2RlbCxcblx0XHRcdFx0J29zVHlwZSc6IG9zVHlwZSxcblx0XHRcdFx0J29zVmVyc2lvbic6IG9zVmVyc2lvbixcblx0XHRcdFx0J2RldmljZVRva2VuJzogZGV2aWNlVG9rZW4sXG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xuXHRcdFx0J21ldGFJbmZvJzogbWV0YUluZm8sXG5cdFx0XHQncmVxdWVzdERhdGEnOiByZXF1ZXN0RGF0YVxuXHRcdH07XG5cdFx0cmV0dXJuIHJlcXVlc3RPYmo7XG5cdH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTmV0U2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxuXG5tb2R1bGUgZXJyb3JoYW5kbGVyIHtcblx0ZXhwb3J0IGNvbnN0IFNUQVRVU19GQUlMOiBzdHJpbmcgPSAnZmFpbCc7XG5cdGV4cG9ydCBjb25zdCBTRVZFUklUWV9FUlJPUl9IQVJEOiBzdHJpbmcgPSAnSEFSRCc7XG5cdGV4cG9ydCBjb25zdCBTRVZFUklUWV9FUlJPUl9TT0ZUOiBzdHJpbmcgPSAnU09GVCc7XG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX0lOVkFMSURfU0VTU0lPTl9UT0tFTiA9ICdTRUMuMDI1Jztcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OID0gJ1NFUy4wMDQnO1xuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9UT0tFTl9FWFBJUkVEID0gJ1NFQy4wMzgnO1xuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9JTlZBTElEX1VTRVJfU0VTU0lPTl9FWFBJUkVEID0gJ1NFUy4wMDMnO1xuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9OT19SRVNVTFQgPSAnQ09NLjExMSc7XG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX05PX1JPVVRFID0gJ0ZMVC4wMTAnO1xufVxuXG5jbGFzcyBFcnJvckhhbmRsZXJTZXJ2aWNlIHtcblxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ05ldFNlcnZpY2UnLCAnQ29yZG92YVNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZSddO1xuXG5cdGNvbnN0cnVjdG9yKFxuXHRcdHByaXZhdGUgbmV0U2VydmljZTogTmV0U2VydmljZSwgcHJpdmF0ZSBjb3Jkb3ZhU2VydmljZTogQ29yZG92YVNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcblx0XHRwcml2YXRlICRyb290U2NvcGU6IG5nLklTY29wZSkge1xuXHR9XG5cblx0dmFsaWRhdGVSZXNwb25zZShyZXNwb25zZTogYW55KSB7XG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xuXHRcdGlmICh0aGlzLmhhc0Vycm9ycyhlcnJvcnMpIHx8IGVycm9yaGFuZGxlci5TVEFUVVNfRkFJTCA9PSByZXNwb25zZS5zdGF0dXMpIHtcblx0XHRcdGlmICghdGhpcy5oYXNJbnZhbGlkU2Vzc2lvbkVycm9yKGVycm9ycykgJiYgIXRoaXMuaGFzTm9SZXN1bHRFcnJvcihlcnJvcnMpKSB7XG5cdFx0XHRcdC8vIGJyb2FkY2FzdCB0byBhcHBjb250cm9sbGVyIHNlcnZlciBlcnJvclxuXHRcdFx0XHR0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnc2VydmVyRXJyb3InLCByZXNwb25zZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aXNOb1Jlc3VsdEZvdW5kKHJlc3BvbnNlOiBhbnkpOiBib29sZWFuIHtcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XG5cdFx0cmV0dXJuIHRoaXMuaGFzTm9SZXN1bHRFcnJvcihlcnJvcnMpO1xuXHR9XG5cblx0aXNTZXNzaW9uSW52YWxpZChyZXNwb25zZTogYW55KTogYm9vbGVhbiB7XG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xuXHRcdHJldHVybiB0aGlzLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IoZXJyb3JzKTtcblx0fVxuXG5cdGhhc0hhcmRFcnJvcnMocmVzcG9uc2U6IGFueSk6IGJvb2xlYW4ge1xuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcblx0XHRyZXR1cm4gdGhpcy5oYXNIYXJkRXJyb3IoZXJyb3JzKTtcblx0fVxuXG5cdGhhc1NvZnRFcnJvcnMocmVzcG9uc2U6IGFueSk6IGJvb2xlYW4ge1xuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcblx0XHRyZXR1cm4gdGhpcy5oYXNTb2Z0RXJyb3IoZXJyb3JzKTtcblx0fVxuXG5cdHByaXZhdGUgaGFzRXJyb3JzKGVycm9yczogYW55KTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIGVycm9ycy5sZW5ndGggPiAwO1xuXHR9XG5cblx0cHJpdmF0ZSBoYXNJbnZhbGlkU2Vzc2lvbkVycm9yKGVycm9yczogYW55KTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XG5cdFx0XHRyZXR1cm4gZXJyb3IgJiYgZXJyb3JoYW5kbGVyLlNFVkVSSVRZX0VSUk9SX0hBUkQgPT0gZXJyb3Iuc2V2ZXJpdHkgJiZcblx0XHRcdChlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT05fVE9LRU4gPT0gZXJyb3IuY29kZSB8fFxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT04gPT0gZXJyb3IuY29kZSB8fFxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1VTRVJfU0VTU0lPTl9FWFBJUkVEID09IGVycm9yLmNvZGUgfHxcblx0XHRcdFx0ZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfVE9LRU5fRVhQSVJFRCA9PSBlcnJvci5jb2RlKTtcblx0XHR9KTtcblx0fVxuXG5cdHByaXZhdGUgaGFzTm9SZXN1bHRFcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiBfLnNvbWUoZXJyb3JzLCAoZXJyb3I6IGFueSkgPT4ge1xuXHRcdFx0cmV0dXJuIGVycm9yICYmIGVycm9yaGFuZGxlci5TRVZFUklUWV9FUlJPUl9IQVJEID09IGVycm9yLnNldmVyaXR5ICYmXG5cdFx0XHQoZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfTk9fUkVTVUxUID09IGVycm9yLmNvZGUgfHxcblx0XHRcdFx0ZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfTk9fUk9VVEUgPT0gZXJyb3IuY29kZSk7XG5cdFx0fSkgJiYgZXJyb3JzLmxlbmd0aCA9PSAxO1xuXHR9XG5cblx0cHJpdmF0ZSBoYXNIYXJkRXJyb3IoZXJyb3JzOiBhbnkpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gXy5zb21lKGVycm9ycywgKGVycm9yOiBhbnkpID0+IHtcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfSEFSRCA9PSBlcnJvci5zZXZlcml0eTtcblx0XHR9KTtcblx0fVxuXG5cdHByaXZhdGUgaGFzU29mdEVycm9yKGVycm9yczogYW55KTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XG5cdFx0XHRyZXR1cm4gZXJyb3IgJiYgZXJyb3JoYW5kbGVyLlNFVkVSSVRZX0VSUk9SX1NPRlQgPT0gZXJyb3Iuc2V2ZXJpdHk7XG5cdFx0fSk7XG5cdH1cbn0iLG51bGwsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOZXRTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJDb3Jkb3ZhU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiRXJyb3JIYW5kbGVyU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiSVNlc3Npb25IdHRwUHJvbWlzZS50c1wiIC8+XG5cbm1vZHVsZSBzZXNzaW9uc2VydmljZSB7XG5cdGV4cG9ydCBjb25zdCBIRUFERVJfUkVGUkVTSF9UT0tFTl9LRVk6IHN0cmluZyA9ICd4LXJlZnJlc2gtdG9rZW4nO1xuXHRleHBvcnQgY29uc3QgSEVBREVSX0FDQ0VTU19UT0tFTl9LRVk6IHN0cmluZyA9ICd4LWFjY2Vzcy10b2tlbic7XG5cdGV4cG9ydCBjb25zdCBSRUZSRVNIX1NFU1NJT05fSURfVVJMOiBzdHJpbmcgPSAnL3VzZXIvZ2V0QWNjZXNzVG9rZW4nO1xufVxuXG5jbGFzcyBTZXNzaW9uU2VydmljZSB7XG5cblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydOZXRTZXJ2aWNlJywgJ0Vycm9ySGFuZGxlclNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZScsICckaHR0cCddO1xuXG5cdHByaXZhdGUgYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXM6IElBY2Nlc3NUb2tlblJlZnJlc2hlZEhhbmRsZXJbXTtcblx0cHJpdmF0ZSBzZXNzaW9uSWQ6IHN0cmluZztcblx0cHJpdmF0ZSBjcmVkZW50aWFsSWQ6IHN0cmluZztcblx0cHJpdmF0ZSBpc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzOiBib29sZWFuID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IoXG5cdFx0cHJpdmF0ZSBuZXRTZXJ2aWNlOiBOZXRTZXJ2aWNlLCBwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcblx0XHRwcml2YXRlICRyb290U2NvcGU6IG5nLklTY29wZSwgcHJpdmF0ZSAkaHR0cDogbmcuSUh0dHBTZXJ2aWNlKSB7XG5cdFx0dGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcyA9IFtdO1xuXHRcdHRoaXMuc2Vzc2lvbklkID0gbnVsbDtcblx0XHR0aGlzLmNyZWRlbnRpYWxJZCA9IG51bGw7XG5cdH1cblxuXHRyZXNvbHZlUHJvbWlzZShwcm9taXNlOiBJU2Vzc2lvbkh0dHBQcm9taXNlKSB7XG5cdFx0cHJvbWlzZS5yZXNwb25zZS50aGVuKChyZXNwb25zZSkgPT4ge1xuXHRcdFx0aWYgKCF0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaGFzSGFyZEVycm9ycyhyZXNwb25zZSkgfHwgdGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmlzU2Vzc2lvbkludmFsaWQocmVzcG9uc2UpKSB7XG5cdFx0XHRcdGlmICghdGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmlzU2Vzc2lvbkludmFsaWQocmVzcG9uc2UpKSB7XG5cdFx0XHRcdFx0cHJvbWlzZS5kZWZmZXJlZC5yZXNvbHZlKHByb21pc2UucmVzcG9uc2UpO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdzZXNzaW9uIGlzIHZhbGlkJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5hZGRBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKHByb21pc2UpO1xuXHRcdFx0XHRcdGlmICghdGhpcy5pc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVmcmVzaGluZyBzZXNzaW9uIHRva2VuJyk7XG5cdFx0XHRcdFx0XHR0aGlzLnJlZnJlc2hTZXNzaW9uSWQoKS50aGVuKFxuXHRcdFx0XHRcdFx0XHQodG9rZW5SZXNwb25zZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGlmICh0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaGFzSGFyZEVycm9ycyh0b2tlblJlc3BvbnNlKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRTZXNzaW9uSWQobnVsbCk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciByZXNwb25zZUhlYWRlciA9IHRva2VuUmVzcG9uc2UuaGVhZGVycygpO1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIGFjY2Vzc1Rva2VuOiBzdHJpbmcgPSByZXNwb25zZUhlYWRlcltzZXNzaW9uc2VydmljZS5IRUFERVJfQUNDRVNTX1RPS0VOX0tFWV07XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnNldFNlc3Npb25JZChhY2Nlc3NUb2tlbik7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdGlmICghdGhpcy5nZXRTZXNzaW9uSWQoKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5hY2Nlc3NUb2tlbk5vdFJlZnJlc2hlZCgpO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHQoZXJyb3IpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZXJyb3Igb24gYWNjZXNzIHRva2VuIHJlZnJlc2gnKTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnNldFNlc3Npb25JZChudWxsKTtcblx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5nZXRDcmVkZW50aWFsSWQoKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5hY2Nlc3NUb2tlbk5vdFJlZnJlc2hlZCgpO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRwcm9taXNlLmRlZmZlcmVkLnJlamVjdCgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR0aGlzLmlzUmVmcmVzaFNlc3Npb25JZEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwcm9taXNlLmRlZmZlcmVkLnJlamVjdCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0YWRkQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lcjogSUFjY2Vzc1Rva2VuUmVmcmVzaGVkSGFuZGxlcikge1xuXHRcdHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMucHVzaChsaXN0ZW5lcik7XG5cdH1cblxuXHRyZW1vdmVBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKGxpc3RlbmVyVG9SZW1vdmU6IElBY2Nlc3NUb2tlblJlZnJlc2hlZEhhbmRsZXIpIHtcblx0XHRfLnJlbW92ZSh0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLCAobGlzdGVuZXIpID0+IHtcblx0XHRcdHJldHVybiBsaXN0ZW5lciA9PSBsaXN0ZW5lclRvUmVtb3ZlO1xuXHRcdH0pO1xuXHR9XG5cblx0c2V0Q3JlZGVudGlhbElkKGNyZWRJZDogc3RyaW5nKSB7XG5cdFx0dGhpcy5jcmVkZW50aWFsSWQgPSBjcmVkSWQ7XG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vbltzZXNzaW9uc2VydmljZS5IRUFERVJfUkVGUkVTSF9UT0tFTl9LRVldID0gY3JlZElkO1xuXHR9XG5cblx0c2V0U2Vzc2lvbklkKHNlc3Npb25JZDogc3RyaW5nKSB7XG5cdFx0dGhpcy5zZXNzaW9uSWQgPSBzZXNzaW9uSWQ7XG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vbltzZXNzaW9uc2VydmljZS5IRUFERVJfQUNDRVNTX1RPS0VOX0tFWV0gPSBzZXNzaW9uSWQ7XG5cdH1cblxuXHRnZXRTZXNzaW9uSWQoKTogc3RyaW5nIHtcblx0XHRyZXR1cm4gdGhpcy5zZXNzaW9uSWQgPyB0aGlzLnNlc3Npb25JZCA6IG51bGw7XG5cdH1cblxuXHRnZXRDcmVkZW50aWFsSWQoKTogc3RyaW5nIHtcblx0XHRyZXR1cm4gdGhpcy5jcmVkZW50aWFsSWQgPyB0aGlzLmNyZWRlbnRpYWxJZCA6IG51bGw7XG5cdH1cblxuXHRjbGVhckxpc3RlbmVycygpIHtcblx0XHR0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzID0gW107XG5cdH1cblxuXHRwcml2YXRlIHJlZnJlc2hTZXNzaW9uSWQoKTogbmcuSUh0dHBQcm9taXNlPGFueT4ge1xuXHRcdHRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcyA9IHRydWU7XG5cdFx0dmFyIGFjY2Vzc1Rva2VuUmVxdWVzdDogYW55ID0ge1xuXHRcdFx0cmVmcmVzaFRva2VuOiB0aGlzLmNyZWRlbnRpYWxJZFxuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5uZXRTZXJ2aWNlLnBvc3REYXRhKHNlc3Npb25zZXJ2aWNlLlJFRlJFU0hfU0VTU0lPTl9JRF9VUkwsIGFjY2Vzc1Rva2VuUmVxdWVzdCk7XG5cdH1cblxuXHRwcml2YXRlIGFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkKCkge1xuXHRcdF8uZm9yRWFjaCh0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLCAobGlzdGVuZXIpID0+IHtcblx0XHRcdGlmIChsaXN0ZW5lci5vblRva2VuRmFpbGVkKSB7XG5cdFx0XHRcdGxpc3RlbmVyLm9uVG9rZW5GYWlsZWQobGlzdGVuZXIpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5yZW1vdmVBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKGxpc3RlbmVyKTtcblx0XHR9KTtcblx0fVxuXG5cdHByaXZhdGUgYWNjZXNzVG9rZW5SZWZyZXNoZWQoKSB7XG5cdFx0Xy5mb3JFYWNoKHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMsIChsaXN0ZW5lcikgPT4ge1xuXHRcdFx0aWYgKGxpc3RlbmVyKSB7XG5cdFx0XHRcdGlmIChsaXN0ZW5lci5vblRva2VuUmVmcmVzaGVkKSB7XG5cdFx0XHRcdFx0bGlzdGVuZXIub25Ub2tlblJlZnJlc2hlZChsaXN0ZW5lcik7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkobGlzdGVuZXIpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0xlbmd0aCA9ICcsIHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMubGVuZ3RoKTtcblx0XHRcdH1cblx0XHRcdHRoaXMucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lcik7XG5cdFx0fSk7XG5cdH1cbn0iLG51bGwsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOZXRTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJDb3Jkb3ZhU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiU2Vzc2lvblNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkVycm9ySGFuZGxlclNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIklTZXNzaW9uSHR0cFByb21pc2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkdlbmVyaWNSZXNwb25zZS50c1wiIC8+XG5cbm1vZHVsZSBkYXRhcHJvdmlkZXIge1xuXHRleHBvcnQgY29uc3QgU0VSVklDRV9VUkxfTE9HT1VUID0gJy91c2VyL2xvZ291dCc7XG59XG5cbmNsYXNzIERhdGFQcm92aWRlclNlcnZpY2Uge1xuXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnTmV0U2VydmljZScsICdDb3Jkb3ZhU2VydmljZScsICckcScsICckcm9vdFNjb3BlJywgJ0Vycm9ySGFuZGxlclNlcnZpY2UnLCAnU2Vzc2lvblNlcnZpY2UnLCAnT1dORVJfQ0FSUklFUl9DT0RFJ107XG5cblx0cHJpdmF0ZSBpc0Nvbm5lY3RlZFRvTmV0d29yazogYm9vbGVhbiA9IHRydWU7XG5cdHByaXZhdGUgbmF2aWdhdG9yOiBOYXZpZ2F0b3I7XG5cblx0Y29uc3RydWN0b3IoXG5cdFx0cHJpdmF0ZSBuZXRTZXJ2aWNlOiBOZXRTZXJ2aWNlLCBwcml2YXRlIGNvcmRvdmFTZXJ2aWNlOiBDb3Jkb3ZhU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLFxuXHRcdHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVNjb3BlLCBwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UsXG5cdFx0cHJpdmF0ZSBzZXNzaW9uU2VydmljZTogU2Vzc2lvblNlcnZpY2UsIHByaXZhdGUgT1dORVJfQ0FSUklFUl9DT0RFOiBzdHJpbmcpIHtcblxuXHRcdHRoaXMuY29yZG92YVNlcnZpY2UuZXhlYygoKSA9PiB7XG5cdFx0XHRpZiAod2luZG93LmNvcmRvdmEgJiYgd2luZG93LmRvY3VtZW50KSB7IC8vIG9uIGRldmljZVxuXHRcdFx0XHRuYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xuXHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrID0gbmF2aWdhdG9yLm9uTGluZTtcblx0XHRcdFx0d2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG5cdFx0XHRcdFx0J29ubGluZScsXG5cdFx0XHRcdFx0KCkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3VzZXIgb25saW5lJyk7XG5cdFx0XHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrID0gdHJ1ZTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGZhbHNlKTtcblx0XHRcdFx0d2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG5cdFx0XHRcdFx0J29mZmxpbmUnLFxuXHRcdFx0XHRcdCgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCd1c2VyIG9mZmxpbmUnKTtcblx0XHRcdFx0XHRcdHRoaXMuaXNDb25uZWN0ZWRUb05ldHdvcmsgPSBmYWxzZTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGZhbHNlKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGdldERhdGEocmVxOiBzdHJpbmcpOiBuZy5JUHJvbWlzZTxhbnk+IHtcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblxuXHRcdGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcblx0XHRcdGRlZi5yZXNvbHZlKHRoaXMubmV0U2VydmljZS5nZXREYXRhKHJlcSkpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XG5cdFx0XHQvLyB0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnbm9OZXR3b3JrJyk7XG5cdFx0XHRkZWYucmVqZWN0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0cG9zdERhdGEocmVxOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyk6IG5nLklQcm9taXNlPGFueT4ge1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXG5cdFx0dmFyIHJlc3BvbnNlOiBuZy5JUHJvbWlzZTxhbnk+ID0gdGhpcy5uZXRTZXJ2aWNlLnBvc3REYXRhKHJlcSwgZGF0YSwgY29uZmlnKTtcblxuXHRcdGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcblx0XHRcdHJlc3BvbnNlLnRoZW4oXG5cdFx0XHQoaHR0cFJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdGRlZi5yZXNvbHZlKGh0dHBSZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdTZXJ2ZXIgdW5hdmFpbGFibGUnKTtcblx0XHRcdFx0Ly8gYnJvYWRjYXN0IHNlcnZlciBpcyB1bmF2YWlsYWJsZVxuXHRcdFx0XHR0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnc2VydmVyTm90QXZhaWxhYmxlJyk7XG5cdFx0XHRcdGRlZi5yZWplY3QoKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRkZWYucmVqZWN0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0ZGVsZXRlRGF0YShyZXE6IHN0cmluZyk6IG5nLklQcm9taXNlPGFueT4ge1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXG5cdFx0aWYgKHRoaXMuaGFzTmV0d29ya0Nvbm5lY3Rpb24oKSkge1xuXHRcdFx0ZGVmLnJlc29sdmUodGhpcy5uZXRTZXJ2aWNlLmRlbGV0ZURhdGEocmVxKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnNvbGUubG9nKCdTZXJ2ZXIgdW5hdmFpbGFibGUnKTtcblx0XHRcdGRlZi5yZWplY3QoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRoYXNOZXR3b3JrQ29ubmVjdGlvbigpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gKG5hdmlnYXRvci5vbkxpbmUgfHwgdGhpcy5pc0Nvbm5lY3RlZFRvTmV0d29yayk7XG5cdH1cblxuXG5cdC8vIFRPRE86IHJlbW92ZSB0aGlzIHRlbXAgbWV0aG9kIGFuZCB1c2UgZ2VuZXJpY3Ncblx0YWRkTWV0YUluZm8ocmVxdWVzdERhdGE6IGFueSk6IGFueSB7XG5cdFx0dmFyIGRldmljZTogSW9uaWMuSURldmljZSA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpXG5cdFx0dmFyIG1vZGVsOiBzdHJpbmcgPSAnJztcblx0XHR2YXIgb3NUeXBlOiBzdHJpbmcgPSAnJztcblx0XHR2YXIgb3NWZXJzaW9uOiBzdHJpbmcgPSAnJztcblx0XHR2YXIgZGV2aWNlVG9rZW46IHN0cmluZyA9ICcnO1xuXHRcdGlmIChkZXZpY2UpIHtcblx0XHRcdG1vZGVsID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkubW9kZWw7XG5cdFx0XHRvc1R5cGUgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5wbGF0Zm9ybTtcblx0XHRcdG9zVmVyc2lvbiA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLnZlcnNpb247XG5cdFx0fVxuXHRcdHZhciBtZXRhSW5mbyA9IHtcblx0XHRcdCdjaGFubmVsSWRlbnRpZmllcic6ICdNT0InLFxuXHRcdFx0J2RhdGVUaW1lU3RhbXAnOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcblx0XHRcdCdvd25lckNhcnJpZXJDb2RlJzogdGhpcy5PV05FUl9DQVJSSUVSX0NPREUsXG5cdFx0XHQnYWRkaXRpb25hbEluZm8nOiB7XG5cdFx0XHRcdCdkZXZpY2VUeXBlJzogd2luZG93LmlzVGFibGV0ID8gJ1RhYmxldCcgOiAnUGhvbmUnLFxuXHRcdFx0XHQnbW9kZWwnOiBtb2RlbCxcblx0XHRcdFx0J29zVHlwZSc6IG9zVHlwZSxcblx0XHRcdFx0J29zVmVyc2lvbic6IG9zVmVyc2lvbixcblx0XHRcdFx0J2RldmljZVRva2VuJzogZGV2aWNlVG9rZW4sXG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xuXHRcdFx0J21ldGFJbmZvJzogbWV0YUluZm8sXG5cdFx0XHQncmVxdWVzdERhdGEnOiByZXF1ZXN0RGF0YVxuXHRcdH07XG5cdFx0cmV0dXJuIHJlcXVlc3RPYmo7XG5cdH1cblxuXHRwcml2YXRlIGlzTG9nb3V0U2VydmljZShyZXF1ZXN0VXJsOiBzdHJpbmcpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gZGF0YXByb3ZpZGVyLlNFUlZJQ0VfVVJMX0xPR09VVCA9PSByZXF1ZXN0VXJsO1xuXHR9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdXRpbHMvVXRpbHMudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9Mb2NhbFN0b3JhZ2VTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tbW9uL3NlcnZpY2VzL0Vycm9ySGFuZGxlclNlcnZpY2UudHNcIiAvPlxuXG5jbGFzcyBBcHBDb250cm9sbGVyIHtcblxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzdGF0ZScsICckc2NvcGUnLCAnRGF0YVByb3ZpZGVyU2VydmljZScsICdVc2VyU2VydmljZScsXG5cdFx0JyRpb25pY1BsYXRmb3JtJywgJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCAnJGlvbmljUG9wdXAnLFxuXHRcdCckaW9uaWNMb2FkaW5nJywgJyRpb25pY0hpc3RvcnknLCAnRXJyb3JIYW5kbGVyU2VydmljZSddO1xuXG5cdGNvbnN0cnVjdG9yKFxuXHRcdHByb3RlY3RlZCAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSxcblx0XHRwcm90ZWN0ZWQgJHNjb3BlOiBuZy5JU2NvcGUsXG5cdFx0cHJvdGVjdGVkIGRhdGFQcm92aWRlclNlcnZpY2U6IERhdGFQcm92aWRlclNlcnZpY2UsXG5cdFx0cHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UsXG5cdFx0cHJpdmF0ZSAkaW9uaWNQbGF0Zm9ybTogSW9uaWMuSVBsYXRmb3JtLFxuXHRcdHByaXZhdGUgbG9jYWxTdG9yYWdlU2VydmljZTogTG9jYWxTdG9yYWdlU2VydmljZSxcblx0XHRwcml2YXRlICRpb25pY1BvcHVwOiBJb25pYy5JUG9wdXAsXG5cdFx0cHJpdmF0ZSAkaW9uaWNMb2FkaW5nOiBJb25pYy5JTG9hZGluZyxcblx0XHRwcml2YXRlICRpb25pY0hpc3Rvcnk6IGFueSxcblx0XHRwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UpIHtcblx0fVxuXG5cdGlzTm90RW1wdHkodmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiBVdGlscy5pc05vdEVtcHR5KHZhbHVlKTtcblx0fVxuXG5cdHB1YmxpYyBoYXNOZXR3b3JrQ29ubmVjdGlvbigpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gdGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLmhhc05ldHdvcmtDb25uZWN0aW9uKCk7XG5cdH1cblxuXHRsb2dvdXQoKSB7XG5cdFx0dGhpcy4kaW9uaWNIaXN0b3J5LmNsZWFyQ2FjaGUoKTtcblx0XHR0aGlzLnVzZXJTZXJ2aWNlLmxvZ291dCgpO1xuXHRcdHRoaXMuJHN0YXRlLmdvKFwibG9naW5cIik7XG5cdH1cblxuXHRnZXRVc2VyRGVmYXVsdFBhZ2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMudXNlclNlcnZpY2UudXNlclByb2ZpbGUudXNlckluZm8uZGVmYXVsdFBhZ2U7XG5cdH1cblxuXHRzaG93RGFzaGJvYXJkKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiB0aGlzLnVzZXJTZXJ2aWNlLnNob3dEYXNoYm9hcmQobmFtZSk7XG5cdH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9EYXRhUHJvdmlkZXJTZXJ2aWNlLnRzXCIgLz5cblxuY2xhc3MgTWlzU2VydmljZSB7XG5cblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJyRxJ107XG5cdHByaXZhdGUgc2VydmVyUmVxdWVzdDogbnVtYmVyO1xuXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlKSB7IH1cblxuXHRnZXRNZXRyaWNTbmFwc2hvdCAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL21ldHJpY3NuYXBzaG90Jztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdH0sXG5cdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0Z2V0VGFyZ2V0VnNBY3R1YWwgKHJlcWRhdGEpe1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy90YXJnZXR2c2FjdHVhbCc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldFJldmVudWVBbmFseXNpcyAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3JldmVudWVhbmFseXNpcyc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldFJvdXRlUmV2ZW51ZSAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3JvdXRlcmV2ZW51ZSc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldFNlY3RvckNhcnJpZXJBbmFseXNpcyAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3NlY3RvcmNhcnJpZXJhbmFseXNpcyc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldFBheEZsb3duTWlzSGVhZGVyIChyZXFkYXRhKTogYW55IHtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvcGF4Zmxvd25taXNoZWFkZXInO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0fSxcblx0XHQoZXJyb3IpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRnZXRSb3V0ZVJldmVudWVEcmlsbERvd24gKHJlcWRhdGEpe1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9yb3V0ZXJldmVudWVkcmlsbCc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldEJhckRyaWxsRG93biAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL21zcGF4bmV0cmV2ZHJpbGwnO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0fSxcblx0XHQoZXJyb3IpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRnZXREcmlsbERvd24gKHJlcWRhdGEsIFVSTCl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9IFVSTDtcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHRpZighdGhpcy5zZXJ2ZXJSZXF1ZXN0KXtcblx0XHRcdHRoaXMuc2VydmVyUmVxdWVzdCA9IDE7XG5cdFx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdFx0XHR0aGlzLnNlcnZlclJlcXVlc3QgPSAwO1xuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cblxuY2xhc3MgQ2hhcnRvcHRpb25TZXJ2aWNlIHtcblxuICAgIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHJvb3RTY29wZSddO1xuXG4gICAgY29uc3RydWN0b3IoJHJvb3RTY29wZTogbmcuSVNjb3BlKSB7IH1cblxuICAgIGxpbmVDaGFydE9wdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjaGFydDoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdsaW5lQ2hhcnQnLFxuICAgICAgICAgICAgICAgIGhlaWdodDogMjUwLFxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcbiAgICAgICAgICAgICAgICAgICAgdG9wOiA1LFxuICAgICAgICAgICAgICAgICAgICByaWdodDogNTAsXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogNTAsXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDUwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXsgcmV0dXJuIGQueHZhbDsgfSxcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXsgcmV0dXJuIGQueXZhbDsgfSxcbiAgICAgICAgICAgICAgICB1c2VJbnRlcmFjdGl2ZUd1aWRlbGluZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkaXNwYXRjaDoge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZUNoYW5nZTogZnVuY3Rpb24oZSl7IGNvbnNvbGUubG9nKFwic3RhdGVDaGFuZ2VcIik7IH0sXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZVN0YXRlOiBmdW5jdGlvbihlKXsgY29uc29sZS5sb2coXCJjaGFuZ2VTdGF0ZVwiKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgdG9vbHRpcFNob3c6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcInRvb2x0aXBTaG93XCIpOyB9LFxuICAgICAgICAgICAgICAgICAgICB0b29sdGlwSGlkZTogZnVuY3Rpb24oZSl7IGNvbnNvbGUubG9nKFwidG9vbHRpcEhpZGVcIik7IH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgICAgICAgICAgIHRpY2tGb3JtYXQ6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy50aW1lLmZvcm1hdCgnJWInKShuZXcgRGF0ZShkKSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgeUF4aXM6IHtcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgdGlja0Zvcm1hdDogZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuZm9ybWF0KCcuMDJmJykoZCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGF4aXNMYWJlbERpc3RhbmNlOiAtMTBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07ICBcbiAgICB9XG5cbiAgICBtdWx0aUJhckNoYXJ0T3B0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNoYXJ0OiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ211bHRpQmFyQ2hhcnQnLFxuICAgICAgICAgICAgICAgIGhlaWdodDogMjUwLFxuICAgICAgICAgICAgICAgIHdpZHRoOiAzMDAsXG4gICAgICAgICAgICAgICAgbWFyZ2luIDoge1xuICAgICAgICAgICAgICAgICAgICB0b3A6IDEwLFxuICAgICAgICAgICAgICAgICAgICByaWdodDogMjUsXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogMzAsXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDI1XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaG93TGVnZW5kIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgeDogZnVuY3Rpb24oZCl7cmV0dXJuIGQubGFiZWw7fSxcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXtyZXR1cm4gZC52YWx1ZSArICgxZS0xMCk7fSxcbiAgICAgICAgICAgICAgICBzaG93VmFsdWVzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJlZHVjZVhUaWNrczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd0NvbnRyb2xzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB2YWx1ZUZvcm1hdDogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuZm9ybWF0KCcsLjRmJykoZCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB4QXhpczoge1xuICAgICAgICAgICAgICAgICAgICBheGlzTGFiZWxEaXN0YW5jZTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNob3dZQXhpczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd1hBeGlzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA3MDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTsgIFxuICAgIH1cblxuICAgIG1ldHJpY0JhckNoYXJ0T3B0aW9ucyhtaXNDdHJsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjaGFydDoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdkaXNjcmV0ZUJhckNoYXJ0JyxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDIwMCxcbiAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XG4gICAgICAgICAgICAgICAgICAgIHRvcDogMjAsXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiAyNSxcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiAwLFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiAyNVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgeDogZnVuY3Rpb24oZCl7cmV0dXJuIGQubGFiZWw7fSxcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXtyZXR1cm4gZC52YWx1ZX0sXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1ZhbHVlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZUZvcm1hdDogZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJywuMmYnKShkKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHRvb2x0aXA6IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93WEF4aXM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA3MDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTsgIFxuICAgIH1cblxuICAgIHRhcmdldEJhckNoYXJ0T3B0aW9ucyhtaXNDdHJsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjaGFydDoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdkaXNjcmV0ZUJhckNoYXJ0JyxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcbiAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XG4gICAgICAgICAgICAgICAgICAgIHRvcDogMjAsXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiA1MCxcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiAyMCxcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogNzVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHVzZUludGVyYWN0aXZlR3VpZGVsaW5lOiB0cnVlLFxuICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpe3JldHVybiBkLmxhYmVsO30sXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWUgKyAoMWUtMTApO30sXG4gICAgICAgICAgICAgICAgc2hvd1ZhbHVlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93WUF4aXM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHZhbHVlRm9ybWF0OiBmdW5jdGlvbihkKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLC4yZicpKGQpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDcwMFxuICAgICAgICAgICAgfVxuICAgICAgICB9OyAgXG4gICAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cblxuY2xhc3MgRmlsdGVyZWRMaXN0U2VydmljZSB7XG5cbiAgICBwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbXTtcblxuICAgIGNvbnN0cnVjdG9yKCkgeyB9XG5cbiAgICBzZWFyY2hlZCAodmFsTGlzdHMsIHRvU2VhcmNoLCBsZXZlbCwgZHJpbGx0eXBlKSB7XG4gICAgICByZXR1cm4gXy5maWx0ZXIodmFsTGlzdHMsIFxuICAgICAgICBmdW5jdGlvbiAoaSkge1xuICAgICAgICAgIC8qIFNlYXJjaCBUZXh0IGluIGFsbCAzIGZpZWxkcyAqL1xuICAgICAgICAgIHJldHVybiBzZWFyY2hVdGlsKGksIHRvU2VhcmNoLCBsZXZlbCwgZHJpbGx0eXBlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcGFnZWQgKHZhbExpc3RzLHBhZ2VTaXplKSB7XG4gICAgICB2YXIgcmV0VmFsID0gW107XG4gICAgICBpZih2YWxMaXN0cyl7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsTGlzdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoaSAlIHBhZ2VTaXplID09PSAwKSB7XG4gICAgICAgICAgICByZXRWYWxbTWF0aC5mbG9vcihpIC8gcGFnZVNpemUpXSA9IFt2YWxMaXN0c1tpXV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldFZhbFtNYXRoLmZsb29yKGkgLyBwYWdlU2l6ZSldLnB1c2godmFsTGlzdHNbaV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJldFZhbDtcbiAgICB9XG5cbiAgIFxufVxuZnVuY3Rpb24gc2VhcmNoVXRpbChpdGVtLCB0b1NlYXJjaCwgbGV2ZWwsIGRyaWxsdHlwZSkge1xuICAgIC8qIFNlYXJjaCBUZXh0IGluIGFsbCAzIGZpZWxkcyAqL1xuICBpZihkcmlsbHR5cGUgPT0gJ3JvdXRlJykge1xuICAgIGlmKGl0ZW0uY291bnRyeUZyb20gJiYgaXRlbS5jb3VudHJ5VG8gJiYgbGV2ZWwgPT0gMCkge1xuICAgICAgcmV0dXJuIChpdGVtLmNvdW50cnlGcm9tLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xIHx8IGl0ZW0uY291bnRyeVRvLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMSkge1xuICAgICAgcmV0dXJuIChpdGVtLmZsb3duU2VjdG9yLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMikge1xuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmKGl0ZW1bJ2RvY3VtZW50IyddICYmIGxldmVsID09IDMpIHtcbiAgICAgIHJldHVybiAoaXRlbVsnZG9jdW1lbnQjJ10udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYoZHJpbGx0eXBlID09ICd0YXJnZXQnKSB7XG4gICAgaWYoaXRlbS5yb3V0ZXR5cGUgJiYgbGV2ZWwgPT0gMCkge1xuICAgICAgcmV0dXJuIChpdGVtLnJvdXRldHlwZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1lbHNlIGlmKGl0ZW0ucm91dGVjb2RlICYmIGxldmVsID09IDEpIHtcbiAgICAgIHJldHVybiAoaXRlbS5yb3V0ZWNvZGUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmKGRyaWxsdHlwZSA9PSAnYmFyJykge1xuICAgIGlmKGl0ZW0ucm91dGVDb2RlICYmIGxldmVsID09IDApIHtcbiAgICAgIHJldHVybiAoaXRlbS5yb3V0ZUNvZGUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9ZWxzZSBpZihpdGVtLmZsb3duU2VjdG9yICYmIGxldmVsID09IDEpIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbG93blNlY3Rvci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1lbHNlIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDIpIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmKGRyaWxsdHlwZSA9PSAnZmxpZ2h0LXByb2Nlc3MnKSB7XG4gICAgaWYoaXRlbS5jb3VudHJ5RnJvbSAmJiBpdGVtLmNvdW50cnlUbyAmJiBsZXZlbCA9PSAwKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uY291bnRyeUZyb20udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgfHwgaXRlbS5jb3VudHJ5VG8udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9ZWxzZSBpZihpdGVtLmZsb3duU2VjdG9yICYmIGxldmVsID09IDEpIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbG93blNlY3Rvci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1lbHNlIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDIpIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9ZWxzZSBpZihpdGVtWydjYXJyaWVyQ29kZSMnXSAmJiBsZXZlbCA9PSAzKSB7XG4gICAgICByZXR1cm4gKGl0ZW1bJ2NhcnJpZXJDb2RlIyddLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZihkcmlsbHR5cGUgPT0gJ2ZsaWdodC1jb3VudCcpIHtcbiAgICBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAwKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfWVsc2UgaWYoaXRlbVsnY2FycmllckNvZGUnXSAmJiBsZXZlbCA9PSAxKSB7XG4gICAgICByZXR1cm4gKGl0ZW1bJ2NhcnJpZXJDb2RlJ10udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmKGRyaWxsdHlwZSA9PSAnY291cG9uLWNvdW50Jykge1xuICAgIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDApIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9ZWxzZSBpZihpdGVtWydmbG93blNlY3RvciddICYmIGxldmVsID09IDEpIHtcbiAgICAgIHJldHVybiAoaXRlbVsnZmxvd25TZWN0b3InXS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYoZHJpbGx0eXBlID09ICdhbmFseXNpcycgfHwgZHJpbGx0eXBlID09ICdwYXNzZW5nZXItY291bnQnKSB7XG4gICAgaWYoaXRlbS5yZWdpb25OYW1lICYmIGxldmVsID09IDApIHtcbiAgICAgIHJldHVybiAoaXRlbS5yZWdpb25OYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5jb3VudHJ5RnJvbSAmJiBpdGVtLmNvdW50cnlUbyAmJiBsZXZlbCA9PSAxKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uY291bnRyeUZyb20udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgfHwgaXRlbS5jb3VudHJ5VG8udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5mbG93blNlY3RvciAmJiBsZXZlbCA9PSAyKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAzKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XG5cbmNsYXNzIE9wZXJhdGlvbmFsU2VydmljZSB7XG5cblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJyRxJ107XG5cdHByaXZhdGUgc2VydmVyUmVxdWVzdDogbnVtYmVyO1xuXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlKSB7IH1cblxuXHRnZXRQYXhGbG93bk9wckhlYWRlcihyZXFkYXRhKTogYW55IHtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5vcHIvcGF4Zmxvd25vcHJoZWFkZXInO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0XHR9LFxuXHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG5cdFx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldE9wckZsaWdodFByb2NTdGF0dXMocmVxZGF0YSkge1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm9wci9mbGlnaHRwcm9jZXNzaW5nc3RhdHVzJztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdFx0fSk7XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRnZXRPcHJGbGlnaHRDb3VudEJ5UmVhc29uKHJlcWRhdGEpIHtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5vcHIvZmxpZ2h0Y291bnRieXJlYXNvbic7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcblx0XHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHRcdH0sXG5cdFx0XHQoZXJyb3IpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHRcdH0pO1xuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldE9wckNvdXBvbkNvdW50QnlFeGNlcHRpb24ocmVxZGF0YSkge1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm9wci9jb3Vwb25jb3VudGJ5ZXhjZXB0aW9uJztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdFx0fSk7XG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cdFxuXHRnZXREcmlsbERvd24gKHJlcWRhdGEsIFVSTCl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9IFVSTDtcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHRpZighdGhpcy5zZXJ2ZXJSZXF1ZXN0KXtcblx0XHRcdHRoaXMuc2VydmVyUmVxdWVzdCA9IDE7XG5cdFx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdFx0XHR0aGlzLnNlcnZlclJlcXVlc3QgPSAwO1xuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9EYXRhUHJvdmlkZXJTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9jb21tb24vc2VydmljZXMvTG9jYWxTdG9yYWdlU2VydmljZS50c1wiIC8+XG5cbmNsYXNzIFVzZXJTZXJ2aWNlIHtcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJyRxJywgJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCAnJHdpbmRvdyddO1xuXHRwdWJsaWMgdXNlclByb2ZpbGU6IGFueTtcblx0cHVibGljIF91c2VyOiBib29sZWFuID0gZmFsc2U7XG5cdHByaXZhdGUgbWVudUFjY2VzcyA9IFtdO1xuXHRjb25zdHJ1Y3Rvcihwcml2YXRlIGRhdGFQcm92aWRlclNlcnZpY2U6IERhdGFQcm92aWRlclNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSwgcHJpdmF0ZSBsb2NhbFN0b3JhZ2VTZXJ2aWNlOiBMb2NhbFN0b3JhZ2VTZXJ2aWNlLCBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlKSB7XG5cblx0fVxuXG5cdHNldFVzZXIodXNlcikge1xuXHRcdGlmICh0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlKSB7XG5cdFx0XHR0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInLCBKU09OLnN0cmluZ2lmeSh1c2VyKSk7XG5cdFx0fVxuXHR9XG5cblx0bG9nb3V0KCkge1xuXHRcdHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5zZXRPYmplY3QoJ3JhcGlkTW9iaWxlLnVzZXInLCBudWxsKTtcblx0XHR0aGlzLmxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0T2JqZWN0KCd1c2VyUGVybWlzc2lvbk1lbnUnLCBbXSk7XG5cdFx0dGhpcy5fdXNlciA9IGZhbHNlO1xuXHR9XG5cblx0aXNMb2dnZWRJbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fdXNlciA/IHRydWUgOiBmYWxzZTtcblx0fVxuXG5cdGlzVXNlckxvZ2dlZEluKCk6IGJvb2xlYW4ge1xuXHRcdGlmICh0aGlzLmxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0T2JqZWN0KCdyYXBpZE1vYmlsZS51c2VyJywgJycpICE9IG51bGwpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG5cblx0Z2V0VXNlcigpIHtcblx0XHRyZXR1cm4gdGhpcy5fdXNlcjtcblx0fVxuXG5cdGxvZ2luKF91c2VyTmFtZTogc3RyaW5nLCBfcGFzc3dvcmQ6IHN0cmluZykge1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3VzZXIvbG9naW4nO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xuXHRcdFx0dXNlcklkOiBfdXNlck5hbWUsXG5cdFx0XHRwYXNzd29yZDogX3Bhc3N3b3JkXG5cdFx0fVxuXHRcdHRoaXMuc2V0VXNlcih7IHVzZXJuYW1lOiBcIlwiIH0pO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXF1ZXN0T2JqKS50aGVuKFxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHR0aGlzLl91c2VyID0gdHJ1ZTtcblx0XHRcdFx0XHRkZWYucmVzb2x2ZShyZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRkZWYucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkIG9uIGxvZyBpbicpO1xuXHRcdFx0XHRkZWYucmVqZWN0KGVycm9yKTtcblx0XHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0Z2V0VXNlclByb2ZpbGUocmVxZGF0YSkge1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3VzZXIvdXNlcnByb2ZpbGUnO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHR0aGlzLnVzZXJQcm9maWxlID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5kYXRhO1xuXHRcdFx0XHRcdHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5zZXRPYmplY3QoJ3VzZXJQZXJtaXNzaW9uTWVudScsIHRoaXMudXNlclByb2ZpbGUubWVudUFjY2Vzcyk7XG5cdFx0XHRcdFx0ZGVmLnJlc29sdmUocmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZGVmLnJlamVjdChyZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCBvbiBVc2VyUHJvZmlsZScpO1xuXHRcdFx0XHRkZWYucmVqZWN0KGVycm9yKTtcblx0XHRcdH0pO1xuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdHNob3dEYXNoYm9hcmQobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG5cdFx0aWYgKHRoaXMuaXNVc2VyTG9nZ2VkSW4oKSkge1xuXHRcdFx0aWYgKHR5cGVvZiB0aGlzLnVzZXJQcm9maWxlID09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdHZhciBkYXRhID0gdGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldE9iamVjdCgndXNlclBlcm1pc3Npb25NZW51JywgJycpO1xuXHRcdFx0XHR0aGlzLm1lbnVBY2Nlc3MgPSBkYXRhO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5tZW51QWNjZXNzID0gdGhpcy51c2VyUHJvZmlsZS5tZW51QWNjZXNzO1xuXHRcdFx0fVxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm1lbnVBY2Nlc3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKHRoaXMubWVudUFjY2Vzc1tpXS5tZW51TmFtZSA9PSBuYW1lKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMubWVudUFjY2Vzc1tpXS5tZW51QWNjZXNzO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLmlzVXNlckxvZ2dlZEluKCk7XG5cdFx0fVxuXHR9XG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9DaGFydG9wdGlvblNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbXBvbmVudHMvdXNlci9zZXJ2aWNlcy9Vc2VyU2VydmljZS50c1wiIC8+XG5cblxuXG5pbnRlcmZhY2UgdGFiT2JqZWN0IHtcbiAgICB0aXRsZTogc3RyaW5nLFxuICAgIG5hbWVzOiBzdHJpbmcsXG4gICAgaWNvbjogc3RyaW5nXG59XG5cbmludGVyZmFjZSB0b2dnbGVPYmplY3Qge1xuICAgIG1vbnRoT3JZZWFyOiBzdHJpbmcsXG4gICAgdGFyZ2V0UmV2T3JQYXg6IHN0cmluZyxcbiAgICBzZWN0b3JPcmRlcjogc3RyaW5nLFxuICAgIHNlY3RvclJldk9yUGF4OiBzdHJpbmcsXG4gICAgY2hhcnRPclRhYmxlOiBzdHJpbmcsXG4gICAgdGFyZ2V0Vmlldzogc3RyaW5nLFxuICAgIHJldmVudWVWaWV3OiBzdHJpbmcsXG4gICAgc2VjdG9yVmlldzogc3RyaW5nXG59XG5cbmludGVyZmFjZSBoZWFkZXJPYmplY3Qge1xuICAgIGZsb3duTW9udGg6IHN0cmluZyxcbiAgICBzdXJjaGFyZ2U6IGJvb2xlYW4sXG4gICAgdGFiSW5kZXg6IG51bWJlcixcbiAgICBoZWFkZXJJbmRleDogbnVtYmVyLFxuICAgIHVzZXJuYW1lOiBzdHJpbmdcbn1cblxuY2xhc3MgTWlzQ29udHJvbGxlcntcblxuICAgIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHN0YXRlJywgJyRzY29wZScsICckaW9uaWNMb2FkaW5nJywgJyR0aW1lb3V0JywgJyR3aW5kb3cnLCAnJGlvbmljUG9wb3ZlcicsXG4gICAgICAgICckZmlsdGVyJywgJ01pc1NlcnZpY2UnLCAnQ2hhcnRvcHRpb25TZXJ2aWNlJywgJ0ZpbHRlcmVkTGlzdFNlcnZpY2UnLCAnVXNlclNlcnZpY2UnLCAnJGlvbmljSGlzdG9yeScsICdSZXBvcnRTdmMnLCAnR1JBUEhfQ09MT1JTJywgJ1RBQlMnLCAnJGlvbmljUG9wdXAnXTtcblxuICAgIHByaXZhdGUgdGFiczogW3RhYk9iamVjdF07XG4gICAgcHJpdmF0ZSB0b2dnbGU6IHRvZ2dsZU9iamVjdDtcbiAgICBwcml2YXRlIGhlYWRlcjogaGVhZGVyT2JqZWN0O1xuICAgIHByaXZhdGUgc3ViSGVhZGVyOiBhbnk7XG4gICAgcHJpdmF0ZSBvcHRpb25zOiBhbnk7XG4gICAgcHJpdmF0ZSBkcmlsbHRhYnM6IHN0cmluZ1tdO1xuICAgIFxuICAgIHByaXZhdGUgcGFnZVNpemUgPSA0O1xuICAgIHByaXZhdGUgY3VycmVudFBhZ2UgPSBbXTtcbiAgICBwcml2YXRlIHNlbGVjdGVkRHJpbGwgPSBbXTtcbiAgICBwcml2YXRlIGdyb3VwcyA9IFtdO1xuXG4gICAgcHJpdmF0ZSBpbmZvcG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XG4gICAgcHJpdmF0ZSBkcmlsbHBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xuICAgIHByaXZhdGUgZ3JhcGhwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcbiAgICBwcml2YXRlIGRyaWxsQmFycG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XG5cbiAgICBwcml2YXRlIGluZm9kYXRhOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSByZWdpb25OYW1lOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBjaGFydFR5cGU6IHN0cmluZztcbiAgICBwcml2YXRlIGdyYXBoSW5kZXg6IG51bWJlcjtcbiAgICBwcml2YXRlIGNvbHVtblRvT3JkZXI6IHN0cmluZztcbiAgICBwcml2YXRlIHNob3duR3JvdXA6IG51bWJlcjtcblxuICAgIHByaXZhdGUgbWV0cmljUmVzdWx0OiBhbnk7XG4gICAgcHJpdmF0ZSBtZXRyaWNMZWdlbmRzOiBhbnk7XG4gICAgcHJpdmF0ZSBmYXZNZXRyaWNSZXN1bHQ6IGFueTtcblxuICAgIHByaXZhdGUgdGFyZ2V0QWN0dWFsRGF0YTogYW55O1xuICAgIHByaXZhdGUgZmF2VGFyZ2V0QmFyUmVzdWx0OiBhbnk7XG4gICAgcHJpdmF0ZSBmYXZUYXJnZXRMaW5lUmVzdWx0OiBhbnk7XG5cbiAgICBwcml2YXRlIHJvdXRlUmV2RGF0YTogYW55O1xuXG4gICAgcHJpdmF0ZSByZXZlbnVlRGF0YTogYW55O1xuICAgIHByaXZhdGUgU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzOiBhbnk7XG4gICAgcHJpdmF0ZSBwb3BvdmVyc2hvd246IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBkcmlsbFR5cGU6IHN0cmluZztcbiAgICBwcml2YXRlIGRyaWxsQmFyTGFiZWw6IHN0cmluZztcbiAgICBwcml2YXRlIGRyaWxsTmFtZTogc3RyaW5nO1xuICAgIHByaXZhdGUgZmlyc3RDb2x1bW5zOiBzdHJpbmdbXTtcbiAgICBcbiAgICBwcml2YXRlIHRoYXQ6IGFueTtcblxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgJHN0YXRlOiBhbmd1bGFyLnVpLklTdGF0ZVNlcnZpY2UsIHByaXZhdGUgJHNjb3BlOiBuZy5JU2NvcGUsXG4gICAgICAgIHByaXZhdGUgJGlvbmljTG9hZGluZzogSW9uaWMuSUxvYWRpbmcsIHByaXZhdGUgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSxcbiAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSwgcHJpdmF0ZSAkaW9uaWNQb3BvdmVyOiBJb25pYy5JUG9wb3ZlcixcbiAgICAgICAgcHJpdmF0ZSAkZmlsdGVyOiBuZy5JRmlsdGVyU2VydmljZSwgcHJpdmF0ZSBtaXNTZXJ2aWNlOiBNaXNTZXJ2aWNlLFxuICAgICAgICBwcml2YXRlIGNoYXJ0b3B0aW9uU2VydmljZTogQ2hhcnRvcHRpb25TZXJ2aWNlLCBwcml2YXRlIGZpbHRlcmVkTGlzdFNlcnZpY2U6IEZpbHRlcmVkTGlzdFNlcnZpY2UsXG4gICAgICAgIHByaXZhdGUgdXNlclNlcnZpY2U6IFVzZXJTZXJ2aWNlLCBwcml2YXRlICRpb25pY0hpc3Rvcnk6IGFueSwgcHJpdmF0ZSByZXBvcnRTdmM6IFJlcG9ydFN2YywgcHJpdmF0ZSBHUkFQSF9DT0xPUlM6IHN0cmluZywgcHJpdmF0ZSBUQUJTOiBzdHJpbmcsIHByaXZhdGUgJGlvbmljUG9wdXA6IElvbmljLklQb3B1cCkge1xuXG4gICAgICAgICAgICB0aGlzLnRoYXQgPSB0aGlzO1xuXG4gICAgICAgICAgICB0aGlzLnRhYnMgPSB0aGlzLlRBQlMuREIxX1RBQlM7XG5cbiAgICAgICAgICAgIHRoaXMudG9nZ2xlID0ge1xuICAgICAgICAgICAgICAgIG1vbnRoT3JZZWFyIDogJ21vbnRoJyxcbiAgICAgICAgICAgICAgICB0YXJnZXRSZXZPclBheDogJ3JldmVudWUnLFxuICAgICAgICAgICAgICAgIHNlY3Rvck9yZGVyOiAndG9wNScsXG4gICAgICAgICAgICAgICAgc2VjdG9yUmV2T3JQYXg6ICdyZXZlbnVlJyxcbiAgICAgICAgICAgICAgICBjaGFydE9yVGFibGU6ICdjaGFydCcsXG4gICAgICAgICAgICAgICAgdGFyZ2V0VmlldzogJ2NoYXJ0JyxcbiAgICAgICAgICAgICAgICByZXZlbnVlVmlldzogJ2NoYXJ0JyxcbiAgICAgICAgICAgICAgICBzZWN0b3JWaWV3OiAnY2hhcnQnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmhlYWRlciA9IHtcbiAgICAgICAgICAgICAgICBmbG93bk1vbnRoOiAnJyxcbiAgICAgICAgICAgICAgICBzdXJjaGFyZ2U6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHRhYkluZGV4OiAwLFxuICAgICAgICAgICAgICAgIGhlYWRlckluZGV4OiAwLFxuICAgICAgICAgICAgICAgIHVzZXJuYW1lOiAnJ1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpLmJpbmQoJ29yaWVudGF0aW9uY2hhbmdlJywgZnVuY3Rpb24gKGUsIHNjb3BlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4fSk7XG4gICAgICAgICAgICB9KTsgKi9cbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpLmJpbmQoJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5vcmllbnRhdGlvbkNoYW5nZSk7IFxuICAgICAgICBcbiAgICAgICAgICAgIC8vdGhpcy4kc2NvcGUuJHdhdGNoKCdNaXNDdHJsLmhlYWRlci5zdXJjaGFyZ2UnLCAoKSA9PiB7IHRoaXMub25TbGlkZU1vdmUoe2luZGV4OnRoaXMuaGVhZGVyLnRhYkluZGV4fSk7IH0sIHRydWUpO1xuICAgICAgICAgICAgdGhpcy5pbml0RGF0YSgpO1xuXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kb24oJ29uU2xpZGVNb3ZlJywgKGV2ZW50OiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9uU2xpZGVNb3ZlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCckaW9uaWNWaWV3LmVudGVyJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghc2VsZi51c2VyU2VydmljZS5zaG93RGFzaGJvYXJkKCdNSVMnKSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRzdGF0ZS5nbyhcImxvZ2luXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kb24oJ29wZW5EcmlsbFBvcHVwJywgKGV2ZW50OiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAnbWV0cmljJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9wZW5CYXJEcmlsbERvd25Qb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS50eXBlID09ICd0YXJnZXQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLk1pc0N0cmwub3BlblRhcmdldERyaWxsRG93blBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ3Bhc3Nlbmdlci1jb3VudCcpIHtcbiAgICAgICAgICAgICAgICAgICAvLyB0aGlzLiRzY29wZS5NaXNDdHJsLm9wZW5SZXZlbnVlUGFzc2VuZ2VyRHJpbGxEb3duUG9wb3ZlcihyZXNwb25zZS5ldmVudCwgeyBcInBvaW50XCI6IHJlc3BvbnNlLmRhdGEgfSwgLTEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIGluaXREYXRhKCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL2luZm90b29sdGlwLmh0bWwnLCB7XG4gICAgICAgICAgICBzY29wZTogdGhhdC4kc2NvcGVcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbihpbmZvcG9wb3Zlcikge1xuICAgICAgICAgICAgdGhhdC5pbmZvcG9wb3ZlciA9IGluZm9wb3BvdmVyO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9kcmlsZG93bi5odG1sJywge1xuICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oZHJpbGxwb3BvdmVyKSB7XG4gICAgICAgICAgICB0aGF0LmRyaWxscG9wb3ZlciA9IGRyaWxscG9wb3ZlcjtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9iYXJkcmlsZG93bi5odG1sJywge1xuICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oZHJpbGxCYXJwb3BvdmVyKSB7XG4gICAgICAgICAgICB0aGF0LmRyaWxsQmFycG9wb3ZlciA9IGRyaWxsQmFycG9wb3ZlcjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5vcHRpb25zID0ge1xuICAgICAgICAgICAgbWV0cmljOiB0aGlzLmNoYXJ0b3B0aW9uU2VydmljZS5tZXRyaWNCYXJDaGFydE9wdGlvbnModGhpcyksXG4gICAgICAgICAgICB0YXJnZXRMaW5lQ2hhcnQ6IHRoaXMuY2hhcnRvcHRpb25TZXJ2aWNlLmxpbmVDaGFydE9wdGlvbnMoKSxcbiAgICAgICAgICAgIHRhcmdldEJhckNoYXJ0OiB0aGlzLmNoYXJ0b3B0aW9uU2VydmljZS50YXJnZXRCYXJDaGFydE9wdGlvbnModGhpcyksXG4gICAgICAgICAgICBwYXNzZW5nZXJDaGFydDogdGhpcy5jaGFydG9wdGlvblNlcnZpY2UubXVsdGlCYXJDaGFydE9wdGlvbnMoKVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciByZXEgPSB7XG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicpXG4gICAgICAgIH1cblxuICAgICAgICBpZihyZXEudXNlcklkICE9IFwibnVsbFwiKSB7XG4gICAgICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0UGF4Rmxvd25NaXNIZWFkZXIocmVxKS50aGVuKFxuICAgICAgICAgICAgICAgIChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuc3ViSGVhZGVyID0gZGF0YS5yZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LmhlYWRlci5mbG93bk1vbnRoID0gdGhhdC5zdWJIZWFkZXIucGF4Rmxvd25NaXNNb250aHNbMF0uZmxvd01vbnRoO1xuXG4gICAgICAgICAgICAgICAgICAgIHRoYXQub25TbGlkZU1vdmUoeyBpbmRleDogMCB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cdFxuXHRcdHRoYXQuaGVhZGVyLnVzZXJuYW1lID0gdGhhdC5nZXRQcm9maWxlVXNlck5hbWUoKTtcbiAgICB9XG5cbiAgICBnZXRQcm9maWxlVXNlck5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgaWYgKHRoaXMudXNlclNlcnZpY2UuaXNVc2VyTG9nZ2VkSW4oKSkge1xuICAgICAgICAgICAgdmFyIG9iaiA9IHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicpO1xuICAgICAgICAgICAgaWYgKG9iaiAhPSAnbnVsbCcpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvZmlsZVVzZXJOYW1lID0gSlNPTi5wYXJzZShvYmopO1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9maWxlVXNlck5hbWUudXNlcm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZWxlY3RlZEZsb3duTW9udGgobW9udGg6IHN0cmluZyl7XG4gICAgICAgIHJldHVybiAobW9udGggPT0gdGhpcy5oZWFkZXIuZmxvd25Nb250aCk7XG4gICAgfVxuICAgIG9yaWVudGF0aW9uQ2hhbmdlID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoYXQuJHRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoYXQub25TbGlkZU1vdmUoeyBpbmRleDogdGhhdC5oZWFkZXIudGFiSW5kZXggfSk7XG4gICAgICAgIH0sMjAwKVxuICAgIH0gXG4gICAgb3BlbmluZm9Qb3BvdmVyICgkZXZlbnQsIGluZGV4KSB7XG4gICAgICAgIGlmICh0eXBlb2YgaW5kZXggPT0gXCJ1bmRlZmluZWRcIiB8fCBpbmRleCA9PSBcIlwiKSB7XG4gICAgICAgICAgICB0aGlzLmluZm9kYXRhID0gJ05vIGluZm8gYXZhaWxhYmxlJztcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdGhpcy5pbmZvZGF0YT1pbmRleDtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhpbmRleCk7XG4gICAgICAgIHRoaXMuaW5mb3BvcG92ZXIuc2hvdygkZXZlbnQpO1xuICAgIH07XG5cbiAgICBjbG9zZVBvcG92ZXIoKSB7XG4gICAgICAgIHRoaXMuZ3JhcGhwb3BvdmVyLmhpZGUoKTtcbiAgICB9O1xuICAgIGNsb3Nlc0JhclBvcG92ZXIoKXtcbiAgICAgICAgdGhpcy5kcmlsbEJhcnBvcG92ZXIuaGlkZSgpO1xuICAgIH1cbiAgICBjbG9zZUluZm9Qb3BvdmVyKCkge1xuICAgICAgICB0aGlzLmluZm9wb3BvdmVyLmhpZGUoKTtcbiAgICB9XG5cbiAgICB1cGRhdGVIZWFkZXIoKSB7XG5cdFx0dmFyIGZsb3duTW9udGggPSB0aGlzLmhlYWRlci5mbG93bk1vbnRoO1xuICAgICAgICB0aGlzLmhlYWRlci5oZWFkZXJJbmRleCA9IF8uZmluZEluZGV4KHRoaXMuc3ViSGVhZGVyLnBheEZsb3duTWlzTW9udGhzLCBmdW5jdGlvbihjaHI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIGNoci5mbG93TW9udGggPT0gZmxvd25Nb250aDtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuaGVhZGVyLmhlYWRlckluZGV4KTtcblx0XHR0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDogdGhpcy5oZWFkZXIuaGVhZGVySW5kZXh9KTtcbiAgICB9XG5cbiAgICBvblNsaWRlTW92ZShkYXRhOiBhbnkpIHtcbiAgICAgICAgdGhpcy5oZWFkZXIudGFiSW5kZXggPSBkYXRhLmluZGV4O1xuXHRcdHRoaXMudG9nZ2xlLmNoYXJ0T3JUYWJsZSA9IFwiY2hhcnRcIjtcbiAgICAgICAgc3dpdGNoKHRoaXMuaGVhZGVyLnRhYkluZGV4KXtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIHRoaXMuZ2V0Rmxvd25GYXZvcml0ZXMoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgdGhpcy5jYWxsTWV0cmljU25hcHNob3QoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgdGhpcy5jYWxsVGFyZ2V0VnNBY3R1YWwoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgdGhpcy5jYWxsUmV2ZW51ZUFuYWx5c2lzKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgIHRoaXMuY2FsbFNlY3RvckNhcnJpZXJBbmFseXNpcygpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICB0aGlzLmNhbGxSb3V0ZVJldmVudWUoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRvZ2dsZU1ldHJpYyAodmFsKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLm1vbnRoT3JZZWFyID0gdmFsO1xuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXh9KTtcbiAgICB9XG4gICAgdG9nZ2xlU3VyY2hhcmdlKCkge1xuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDp0aGlzLmhlYWRlci50YWJJbmRleH0pO1xuICAgIH1cbiAgICB0b2dnbGVUYXJnZXQodmFsKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLnRhcmdldFJldk9yUGF4ID0gdmFsO1xuICAgIH1cblxuICAgIHRvZ2dsZVNlY3Rvcih2YWwpIHtcbiAgICAgICAgdGhpcy50b2dnbGUuc2VjdG9yUmV2T3JQYXggPSB2YWw7XG4gICAgfVxuXG4gICAgY2FsbE1ldHJpY1NuYXBzaG90KCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHZhciByZXFkYXRhID0ge1xuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICB0b2dnbGUxOiB0aGlzLnRvZ2dsZS5tb250aE9yWWVhcixcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0TWV0cmljU25hcHNob3QocmVxZGF0YSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcblx0XHRcdFx0Ly8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXG5cdFx0XHRcdHRoYXQubWV0cmljUmVzdWx0ICA9IF8uc29ydEJ5KGRhdGEucmVzcG9uc2UuZGF0YS5tZXRyaWNTbmFwc2hvdENoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XG5cdFx0XHRcdFx0aWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Xy5mb3JFYWNoKHRoYXQubWV0cmljUmVzdWx0LCBmdW5jdGlvbiAobjogYW55LCB2YWx1ZTogYW55KSB7XG5cdFx0XHRcdFx0bi52YWx1ZXNbMF0uY29sb3IgPSB0aGF0LkdSQVBIX0NPTE9SUy5NRVRSSUNbMF07XG5cdFx0XHRcdFx0bi52YWx1ZXNbMV0uY29sb3IgPSB0aGF0LkdSQVBIX0NPTE9SUy5NRVRSSUNbMV07XG5cdFx0XHRcdFx0aWYobi52YWx1ZXNbMl0pIG4udmFsdWVzWzJdLmNvbG9yID0gdGhhdC5HUkFQSF9DT0xPUlMuTUVUUklDWzJdO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHR0aGF0LmZhdk1ldHJpY1Jlc3VsdCA9IF8uZmlsdGVyKHRoYXQubWV0cmljUmVzdWx0LCBmdW5jdGlvbih1OiBhbnkpIHtcblx0XHRcdFx0XHRpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHR0aGF0Lm1ldHJpY0xlZ2VuZHMgPSBkYXRhLnJlc3BvbnNlLmRhdGEubGVnZW5kcztcblx0XHRcdFx0aWYodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xuXHRcdFx0XHRcdHRoYXQubWV0cmljUmVzdWx0ID0gdGhhdC5mYXZNZXRyaWNSZXN1bHQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHRcdCAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG5cdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQgZm9yIE1ldHJpY1NuYXBzaG90ISEhJ1xuXHRcdFx0XHQgIH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG5cdFx0XHRcdFx0ICBjb25zb2xlLmxvZygnZG9uZScpO1xuXHRcdFx0XHQgIH0pO1xuXHRcdFx0fVxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjYWxsVGFyZ2V0VnNBY3R1YWwoKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdmFyIHJlcWRhdGEgPSB7XG4gICAgICAgICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VybmFtZSxcbiAgICAgICAgICAgIHRvZ2dsZTE6ICcnLFxuICAgICAgICAgICAgZnVsbERhdGFGbGFnOiAnJ1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0VGFyZ2V0VnNBY3R1YWwocmVxZGF0YSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcblx0XHRcdFx0Ly8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXG5cdFx0XHRcdHRoYXQuZmF2VGFyZ2V0TGluZVJlc3VsdCA9IF8uZmlsdGVyKGRhdGEucmVzcG9uc2UuZGF0YS5saW5lQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHsgXG5cdFx0XHRcdFx0aWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0dGhhdC5mYXZUYXJnZXRCYXJSZXN1bHQgPSBfLmZpbHRlcihkYXRhLnJlc3BvbnNlLmRhdGEudmVyQmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHsgXG5cdFx0XHRcdFx0aWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0Xy5mb3JFYWNoKGRhdGEucmVzcG9uc2UuZGF0YS52ZXJCYXJDaGFydHMsIGZ1bmN0aW9uIChuOiBhbnksIHZhbHVlOiBhbnkpIHtcblx0XHRcdFx0XHRuLnZhbHVlc1swXS5jb2xvciA9IHRoYXQuR1JBUEhfQ09MT1JTLnZlckJhckNoYXJ0c1swXTtcblx0XHRcdFx0XHRuLnZhbHVlc1sxXS5jb2xvciA9IHRoYXQuR1JBUEhfQ09MT1JTLnZlckJhckNoYXJ0c1sxXTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0dmFyIGxpbmVDb2xvcnMgPSBbe1wiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuTElORVswXSwgXCJjbGFzc2VkXCI6IFwiZGFzaGVkXCIsXCJzdHJva2VXaWR0aFwiOiAyfSxcblx0XHRcdFx0e1wiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuTElORVsxXX0se1wiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuTElORVsyXSwgXCJhcmVhXCIgOiB0cnVlLCBcImRpc2FibGVkXCI6IHRydWV9XTtcblxuXHRcdFx0XHRfLmZvckVhY2goZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHMsIGZ1bmN0aW9uIChuOiBhbnksIHZhbHVlOiBhbnkpIHtcblx0XHRcdFx0XHRfLm1lcmdlKG4ubGluZUNoYXJ0SXRlbXMsIGxpbmVDb2xvcnMpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRjb25zb2xlLmxvZyhkYXRhLnJlc3BvbnNlLmRhdGEubGluZUNoYXJ0cyk7XG5cblx0XHRcdFx0dGhhdC50YXJnZXRBY3R1YWxEYXRhID0ge1xuXHRcdFx0XHRcdGhvckJhckNoYXJ0OiBkYXRhLnJlc3BvbnNlLmRhdGEudmVyQmFyQ2hhcnRzLFxuXHRcdFx0XHRcdGxpbmVDaGFydDogZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHNcblx0XHRcdFx0fTtcblxuXHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdFx0ICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcblx0XHRcdFx0XHRjb250ZW50OiAnTm8gRGF0YSBGb3VuZCBmb3IgVGFyZ2V0VnNBY3R1YWwhISEnXG5cdFx0XHRcdCAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcblx0XHRcdFx0XHQgIGNvbnNvbGUubG9nKCdkb25lJyk7XG5cdFx0XHRcdCAgfSk7XG5cdFx0XHR9XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY2FsbFJvdXRlUmV2ZW51ZSgpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB2YXIgcm91dGVSZXZSZXF1ZXN0ID0ge1xuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWVcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFJvdXRlUmV2ZW51ZShyb3V0ZVJldlJlcXVlc3QpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdGlmKGRhdGEucmVzcG9uc2Uuc3RhdHVzID09PSBcInN1Y2Nlc3NcIil7XG5cdFx0XHRcdHRoYXQucm91dGVSZXZEYXRhID0gZGF0YS5yZXNwb25zZS5kYXRhO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuXHRcdFx0XHQgIHRoYXQuJGlvbmljUG9wdXAuYWxlcnQoe1xuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxuXHRcdFx0XHRcdGNvbnRlbnQ6ICdObyBEYXRhIEZvdW5kIFJvdXRlUmV2ZW51ZSEhISdcblx0XHRcdFx0ICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuXHRcdFx0XHRcdCAgY29uc29sZS5sb2coJ2RvbmUnKTtcblx0XHRcdFx0ICB9KTtcblx0XHRcdH1cbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICBjYWxsUmV2ZW51ZUFuYWx5c2lzKCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHZhciByZXFkYXRhID0ge1xuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICB0b2dnbGUxOiAnJyxcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJydcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRSZXZlbnVlQW5hbHlzaXMocmVxZGF0YSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcblx0XHRcdFx0Ly8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXG5cdFx0XHRcdHZhciBqc29uT2JqID0gZGF0YS5yZXNwb25zZS5kYXRhO1xuXHRcdFx0XHR2YXIgc29ydGVkRGF0YSA9IF8uc29ydEJ5KGpzb25PYmoubXVsdGliYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcblx0XHRcdFx0XHRpZiAodSkgcmV0dXJuIFt1LmZhdm9yaXRlQ2hhcnRQb3NpdGlvbl07IFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0dmFyIGZhdlJldmVudWVCYXJSZXN1bHQgPSBfLmZpbHRlcihzb3J0ZWREYXRhLCBmdW5jdGlvbih1OiBhbnkpIHsgXG5cdFx0XHRcdFx0aWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0dmFyIHNvcnRlZERhdGEgPSBfLnNvcnRCeShqc29uT2JqLnBpZUNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7IFxuXHRcdFx0XHRcdGlmICh1KSByZXR1cm4gW3UuZmF2b3JpdGVDaGFydFBvc2l0aW9uXTsgXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHR2YXIgZmF2UmV2ZW51ZVBpZVJlc3VsdCA9IF8uZmlsdGVyKHNvcnRlZERhdGEsIGZ1bmN0aW9uKHU6IGFueSkgeyBcblx0XHRcdFx0XHRpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHZhciBiYXJDb2xvcnMgPSBbdGhhdC5HUkFQSF9DT0xPUlMuQkFSWzBdLCB0aGF0LkdSQVBIX0NPTE9SUy5CQVJbMV1dO1xuXHRcdFx0XHRfLm1lcmdlKGpzb25PYmoubXVsdGliYXJDaGFydHNbMV0sIGJhckNvbG9ycyk7XG5cdFx0XHRcdF8uZm9yRWFjaChqc29uT2JqLm11bHRpYmFyQ2hhcnRzLCBmdW5jdGlvbihuOiBhbnksIHZhbHVlOiBhbnkpIHtcblx0XHRcdFx0XHRuLmNvbG9yID0gYmFyQ29sb3JzW3ZhbHVlXTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0dmFyIHBpZUNvbG9ycyA9IFt7XCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5QSUVbMF19LHtcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLlBJRVsxXX0se1wiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuUElFWzJdfV07XG5cdFx0XHRcdF8uZm9yRWFjaChqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCBmdW5jdGlvbiAobjogYW55LCB2YWx1ZTogYW55KSB7XG5cdFx0XHRcdFx0bi5sYWJlbCA9IG4ueHZhbDtcblx0XHRcdFx0XHRuLnZhbHVlID0gbi55dmFsO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRfLm1lcmdlKGpzb25PYmoucGllQ2hhcnRzWzBdLmRhdGEsIHBpZUNvbG9ycyk7XG5cblx0XHRcdFx0dGhhdC5yZXZlbnVlRGF0YSA9IHtcblx0XHRcdFx0XHRyZXZlbnVlUGllQ2hhcnQgOiBqc29uT2JqLnBpZUNoYXJ0c1swXSxcblx0XHRcdFx0XHRyZXZlbnVlQmFyQ2hhcnQgOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzFdLm11bHRpYmFyQ2hhcnRJdGVtcyxcblx0XHRcdFx0XHRyZXZlbnVlSG9yQmFyQ2hhcnQgOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzJdLm11bHRpYmFyQ2hhcnRJdGVtc1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHRcdCAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG5cdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQgRm9yIFJldmVudWVBbmFseXNpcyEhISdcblx0XHRcdFx0ICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuXHRcdFx0XHRcdCAgY29uc29sZS5sb2coJ2RvbmUnKTtcblx0XHRcdFx0ICB9KTtcblx0XHRcdH1cbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBvcGVuRHJpbGxEb3duKHJlZ2lvbkRhdGEsc2VsRmluZExldmVsKSB7XG4gICAgICAgIHNlbEZpbmRMZXZlbCA9IE51bWJlcihzZWxGaW5kTGV2ZWwpO1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWxdID0gcmVnaW9uRGF0YTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbCArIDFdID0gJyc7XG4gICAgICAgIGlmKHNlbEZpbmRMZXZlbCAhPSAnMycpIHtcbiAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xuICAgICAgICAgICAgdGhpcy5yZWdpb25OYW1lID0gKHJlZ2lvbkRhdGEucmVnaW9uTmFtZSkgPyByZWdpb25EYXRhLnJlZ2lvbk5hbWUgOiByZWdpb25EYXRhLmNoYXJ0TmFtZTtcbiAgICAgICAgICAgIHZhciBjb3VudHJ5RnJvbVRvID0gKHJlZ2lvbkRhdGEuY291bnRyeUZyb20gJiYgcmVnaW9uRGF0YS5jb3VudHJ5VG8pID8gcmVnaW9uRGF0YS5jb3VudHJ5RnJvbSArICctJyArIHJlZ2lvbkRhdGEuY291bnRyeVRvIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBzZWN0b3JGcm9tVG8gPSAocmVnaW9uRGF0YS5mbG93blNlY3RvciAmJiBkcmlsbExldmVsID49IDMpID8gcmVnaW9uRGF0YS5mbG93blNlY3RvciA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKHJlZ2lvbkRhdGEuZmxpZ2h0TnVtYmVyICYmIGRyaWxsTGV2ZWwgPT0gNCkgPyByZWdpb25EYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICAgICAgdmFyIHJlcWRhdGEgPSB7XG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcbiAgICAgICAgICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmhlYWRlci51c2VybmFtZSxcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxuICAgICAgICAgICAgICAgIFwicmVnaW9uTmFtZVwiOiAodGhpcy5yZWdpb25OYW1lKT8gdGhpcy5yZWdpb25OYW1lIDogXCJOb3J0aCBBbWVyaWNhXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5RnJvbVRvXCI6IGNvdW50cnlGcm9tVG8sXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JGcm9tVG9cIjogc2VjdG9yRnJvbVRvLFxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcbiAgICAgICAgICAgICAgICBcImZsaWdodERhdGVcIjogMFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFJvdXRlUmV2ZW51ZURyaWxsRG93bihyZXFkYXRhKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gZGF0YS5yZXNwb25zZTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICB2YXIgZmluZExldmVsID0gZHJpbGxMZXZlbCAtIDE7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YS5zdGF0dXMpO1xuICAgICAgICAgICAgICAgIGlmKGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJyl7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSBkYXRhLmRhdGEucm93cztcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5vcmdJdGVtc1swXSA9IGRhdGEuZGF0YS5yb3dzO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuc29ydCgncGF4Q291bnQnLGZpbmRMZXZlbCxmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuY2xlYXJEcmlsbChkcmlsbExldmVsKTtcbiAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZmluZExldmVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICAgICAgICB0aGF0LmNsb3Nlc1BvcG92ZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgYWxlcnQoJ1NlcnZlciBFcnJvcicpO1xuICAgICAgICAgICAgfSk7IFxuICAgICAgICB9IFxuICAgIH1cbiAgICBjbGVhckRyaWxsKGxldmVsOiBudW1iZXIpIHtcbiAgICAgICAgdmFyIGk6IG51bWJlcjtcbiAgICAgICAgZm9yICh2YXIgaSA9IGxldmVsOyBpIDwgdGhpcy5ncm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldLml0ZW1zLnNwbGljZSgwLCAxKTtcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldLm9yZ0l0ZW1zLnNwbGljZSgwLCAxKTtcbiAgICAgICAgICAgIHRoaXMuc29ydCgncGF4Q291bnQnLGksZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW2ldID0gJyc7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZHJpbGxEb3duUmVxdWVzdCAoZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpe1xuICAgICAgICB2YXIgcmVxZGF0YTtcbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICdiYXInKSB7XG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgICAgICAgIGlmIChkYXRhLmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YS5sYWJlbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGRyaWxsQmFyOiBzdHJpbmc7XG4gICAgICAgICAgICBkcmlsbEJhciA9IChkYXRhLmxhYmVsKSA/IGRhdGEubGFiZWwgOiBcIlwiO1xuICAgICAgICAgICAgdmFyIHJvdXRlQ29kZSA9IChkYXRhLnJvdXRlQ29kZSkgPyBkYXRhLnJvdXRlQ29kZSA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgc2VjdG9yID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcblxuICAgICAgICAgICAgaWYgKCFkcmlsbEJhcikge1xuICAgICAgICAgICAgICAgIGRyaWxsQmFyID0gdGhpcy5kcmlsbEJhckxhYmVsO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRyaWxsQmFyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuXG4gICAgICAgICAgICByZXFkYXRhID0ge1xuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJyA6ICdOJyxcbiAgICAgICAgICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmhlYWRlci51c2VybmFtZSxcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxuICAgICAgICAgICAgICAgIFwiZHJpbGxCYXJcIjogZHJpbGxCYXIsXG4gICAgICAgICAgICAgICAgXCJyb3V0ZUNvZGVcIjogcm91dGVDb2RlLFxuICAgICAgICAgICAgICAgIFwic2VjdG9yXCI6IHNlY3RvcixcbiAgICAgICAgICAgICAgICBcImZsaWdodE51bWJlclwiOiBmbGlnaHROdW1iZXJcbiAgICAgICAgICAgIH07ICBcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICd0YXJnZXQnKSB7XG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgICAgICAgIGlmIChkYXRhLmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YS5sYWJlbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHJvdXRldHlwZTogc3RyaW5nO1xuICAgICAgICAgICAgcm91dGV0eXBlID0gKGRhdGEucm91dGV0eXBlKSA/IGRhdGEucm91dGV0eXBlIDogXCJcIjtcblxuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG5cbiAgICAgICAgICAgIHJlcWRhdGEgPSB7XG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxuICAgICAgICAgICAgICAgIFwidXNlcklkXCI6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxuICAgICAgICAgICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXG4gICAgICAgICAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXG4gICAgICAgICAgICAgICAgXCJyb3V0ZXR5cGVcIjogcm91dGV0eXBlXG4gICAgICAgICAgICB9OyAgXG4gICAgICAgIH1cblxuICAgICAgICBpZihkcmlsbFR5cGUgPT0gJ2FuYWx5c2lzJykge1xuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciByZWdpb25OYW1lO1xuICAgICAgICAgICAgdmFyIGNvdW50cnlGcm9tVG87XG4gICAgICAgICAgICB2YXIgb3duT2FsRmxhZztcbiAgICAgICAgICAgIHZhciBzZWN0b3JGcm9tVG87XG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyO1xuXG4gICAgICAgICAgICBpZiAoZHJpbGxMZXZlbCA+IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICByZWdpb25OYW1lID0gKGRhdGEucmVnaW9uTmFtZSkgPyBkYXRhLnJlZ2lvbk5hbWUgOiBcIlwiO1xuICAgICAgICAgICAgICAgIGNvdW50cnlGcm9tVG8gPSAoZGF0YS5jb3VudHJ5RnJvbSAmJiBkYXRhLmNvdW50cnlUbykgPyBkYXRhLmNvdW50cnlGcm9tICsgJy0nICsgZGF0YS5jb3VudHJ5VG8gOiBcIlwiO1xuICAgICAgICAgICAgICAgIG93bk9hbEZsYWcgPSAoZGF0YS5vd25PYWwpID8gZGF0YS5vd25PYWwgOiBcIlwiO1xuICAgICAgICAgICAgICAgIHNlY3RvckZyb21UbyA9IChkYXRhLmZsb3duU2VjdG9yKSA/IGRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xuICAgICAgICAgICAgICAgIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWScgOiAnTicsXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcbiAgICAgICAgICAgICAgICBcInJlZ2lvbk5hbWVcIjogcmVnaW9uTmFtZSxcbiAgICAgICAgICAgICAgICBcImNvdW50cnlGcm9tVG9cIjogY291bnRyeUZyb21UbyxcbiAgICAgICAgICAgICAgICBcIm93bk9hbEZsYWdcIjogb3duT2FsRmxhZyxcbiAgICAgICAgICAgICAgICBcInNlY3RvckZyb21Ub1wiOiBzZWN0b3JGcm9tVG8sXG4gICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiAwXG4gICAgICAgICAgICB9OyAgXG4gICAgICAgIH1cbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICdwYXNzZW5nZXItY291bnQnKSB7XG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICB2YXIgcmVnaW9uTmFtZSA9IChkYXRhLnJlZ2lvbk5hbWUpID8gZGF0YS5yZWdpb25OYW1lIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBjb3VudHJ5RnJvbVRvID0gKGRhdGEuY291bnRyeUZyb20gJiYgZGF0YS5jb3VudHJ5VG8pID8gZGF0YS5jb3VudHJ5RnJvbSArICctJyArIGRhdGEuY291bnRyeVRvIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBvd25PYWxGbGFnID0gKGRhdGEub3duT2FsRmxhZykgPyBkYXRhLm93bk9hbEZsYWcgOiBcIlwiO1xuICAgICAgICAgICAgdmFyIHNlY3RvckZyb21UbyAgPSAoZGF0YS5zZWN0b3JGcm9tVG8pID8gZGF0YS5zZWN0b3JGcm9tVG8gOiBcIlwiO1xuICAgICAgICAgICAgdmFyIGZsaWdodE51bWJlciAgPSAoZGF0YS5mbGlnaHROdW1iZXIpID8gZGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xuXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWScgOiAnTicsXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcbiAgICAgICAgICAgICAgICBcInJlZ2lvbk5hbWVcIjogcmVnaW9uTmFtZSxcbiAgICAgICAgICAgICAgICBcImNvdW50cnlGcm9tVG9cIjogY291bnRyeUZyb21UbyxcbiAgICAgICAgICAgICAgICBcIm93bk9hbEZsYWdcIjogb3duT2FsRmxhZyxcbiAgICAgICAgICAgICAgICBcInNlY3RvckZyb21Ub1wiOiBzZWN0b3JGcm9tVG8sXG4gICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiAwXG4gICAgICAgICAgICB9OyAgXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcWRhdGE7XG4gICAgfVxuICAgIGdldERyaWxsRG93blVSTCAoZHJpbERvd25UeXBlKSB7XG4gICAgICAgIHZhciB1cmxcbiAgICAgICAgc3dpdGNoKGRyaWxEb3duVHlwZSl7XG4gICAgICAgICAgICBjYXNlICdiYXInOlxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy9tc3BheG5ldHJldmRyaWxsXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3RhcmdldCc6XG4gICAgICAgICAgICAgICAgdXJsID0gXCIvcGF4ZmxubWlzL3RndHZzYWN0ZHJpbGxcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYW5hbHlzaXMnOlxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy9uZXRyZXZlbnVlb3dub2FsZHJpbGxcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncGFzc2VuZ2VyLWNvdW50JzpcbiAgICAgICAgICAgICAgICB1cmwgPSBcIi9wYXhmbG5taXMvbmV0cmV2ZW51ZW93bm9hbGRyaWxsXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuICAgIG9wZW5CYXJEcmlsbERvd24oZGF0YSwgc2VsRmluZExldmVsKSB7XG4gICAgICAgIHNlbEZpbmRMZXZlbCA9IE51bWJlcihzZWxGaW5kTGV2ZWwpO1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWxdID0gZGF0YTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbCArIDFdID0gJyc7XG4gICAgICAgIFxuICAgICAgICBpZiAoc2VsRmluZExldmVsICE9ICh0aGlzLmdyb3Vwcy5sZW5ndGggLSAxKSkge1xuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcbiAgICAgICAgICAgIHZhciByZXFkYXRhID0gdGhpcy5kcmlsbERvd25SZXF1ZXN0KHRoaXMuZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpO1xuICAgICAgICAgICAgdmFyIFVSTCA9IHRoaXMuZ2V0RHJpbGxEb3duVVJMKHRoaXMuZHJpbGxUeXBlKTtcbiAgICAgICAgICAgIHRoaXMubWlzU2VydmljZS5nZXREcmlsbERvd24ocmVxZGF0YSwgVVJMKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gZGF0YS5yZXNwb25zZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmaW5kTGV2ZWwgPSBkcmlsbExldmVsIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YS5zdGF0dXMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5zdGF0dXMgPT0gJ3N1Y2Nlc3MnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLml0ZW1zWzBdID0gZGF0YS5kYXRhLnJvd3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gZGF0YS5kYXRhLnJvd3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnNvcnQoJ3BheENvdW50JywgZmluZExldmVsLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZHJpbGxMZXZlbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZmluZExldmVsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LmNsb3Nlc1BvcG92ZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBhbGVydCgnU2VydmVyIEVycm9yJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaW5pdGlhdGVBcnJheShkcmlsbHRhYnMpIHtcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBkcmlsbHRhYnMpIHtcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldID0ge1xuICAgICAgICAgICAgICAgIGlkOiBpLFxuICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMuZHJpbGx0YWJzW2ldLFxuICAgICAgICAgICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgICAgICAgICBvcmdJdGVtczogW10sXG4gICAgICAgICAgICAgICAgSXRlbXNCeVBhZ2U6IFtdLFxuICAgICAgICAgICAgICAgIGZpcnN0Q29sdW1uczogdGhpcy5maXJzdENvbHVtbnNbaV1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgb3BlbkJhckRyaWxsRG93blBvcG92ZXIoJGV2ZW50LCBzZWxEYXRhLCBzZWxGaW5kTGV2ZWwpIHtcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnTUVUUklDIFNOQVBTSE9UIFJFUE9SVCAtICcgKyBzZWxEYXRhLnBvaW50LmxhYmVsO1xuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdiYXInO1xuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnUm91dGUgTGV2ZWwnLCAnU2VjdG9yIExldmVsJywgJ0RhdGEgTGV2ZWwnLCAnRmxpZ2h0IExldmVsJ107XG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydyb3V0ZUNvZGUnLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2ZsaWdodERhdGUnXTtcbiAgICAgICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoYXQuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICAgICAgfSwgNTApO1xuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcbiAgICB9O1xuICAgIG9wZW5UYXJnZXREcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XG4gICAgICAgIHRoaXMuZHJpbGxOYW1lID0gJ1RhcmdldCBWcyBBY3R1YWwnO1xuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICd0YXJnZXQnO1xuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnUm91dGUgVHlwZScsICdSb3V0ZSBjb2RlJ107XG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydyb3V0ZXR5cGUnLCAncm91dGVjb2RlJ107XG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhpcy4kdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGF0LmRyaWxsQmFycG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgICAgdGhpcy5vcGVuQmFyRHJpbGxEb3duKHNlbERhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XG4gICAgfTtcblxuICAgIG9wZW5SZXZlbnVlRHJpbGxEb3duUG9wb3ZlcigkZXZlbnQsIHNlbERhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgICAgICBjb25zb2xlLmxvZyhzZWxEYXRhKTtcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnTmV0IFJldmVudWUgYnkgT1dOIGFuZCBPQUwnO1xuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdhbmFseXNpcyc7XG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydDb3VudHJ5IExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdGbGlnaHQgTGV2ZWwnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2NvdW50cnlGcm9tJywgJ2Zsb3duU2VjdG9yJywgJ2ZsaWdodE51bWJlcicsICduZXRSZXZlbnVlJ107XG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICAgICAgdGhpcy5vcGVuQmFyRHJpbGxEb3duKHNlbERhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XG4gICAgfTtcblxuICAgIG9wZW5SZXZlbnVlUGFzc2VuZ2VyRHJpbGxEb3duUG9wb3ZlcigkZXZlbnQsIHNlbERhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgICAgICBjb25zb2xlLmxvZyhzZWxEYXRhKTtcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnUGFzc2VuZ2VyIENvdW50IGJ5IENsYXNzIG9mIFRyYXZlbCc7XG4gICAgICAgIHRoaXMuZHJpbGxUeXBlID0gJ3Bhc3Nlbmdlci1jb3VudCc7XG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydDb3VudHJ5IExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdGbGlnaHQgTGV2ZWwnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2NvdW50cnlGcm9tJywgJ2Zsb3duU2VjdG9yJywgJ2ZsaWdodE51bWJlcicsICduZXRSZXZlbnVlJ107XG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICAgICAgdGhpcy5vcGVuQmFyRHJpbGxEb3duKHNlbERhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XG4gICAgfTtcblxuICAgIG9wZW5Qb3BvdmVyICgkZXZlbnQsIGluZGV4LCBjaGFydHR5cGUpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5jaGFydFR5cGUgPSBjaGFydHR5cGU7XG4gICAgICAgIHRoaXMuZ3JhcGhJbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9ncmFwaC1wb3BvdmVyLmh0bWwnLCB7XG4gICAgICAgICAgICBzY29wZTogdGhhdC4kc2NvcGVcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbihwb3BvdmVyKSB7XG4gICAgICAgICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XG4gICAgICAgICAgICB0aGF0LmdyYXBocG9wb3ZlciA9IHBvcG92ZXI7XG4gICAgICAgICAgICB0aGF0LmdyYXBocG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9wZW5TZWN0b3JQb3BvdmVyICgkZXZlbnQsaW5kZXgsY2hhcnR0eXBlKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhpcy5jaGFydFR5cGUgPSBjaGFydHR5cGU7XG4gICAgICAgIHRoaXMuZ3JhcGhJbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9zZWN0b3ItZ3JhcGgtcG9wb3Zlci5odG1sJywge1xuICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xuICAgICAgICAgICAgdGhhdC5wb3BvdmVyc2hvd24gPSB0cnVlO1xuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIgPSBwb3BvdmVyO1xuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjYWxsU2VjdG9yQ2FycmllckFuYWx5c2lzICgpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcbiAgICAgICAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxuICAgICAgICAgICAgdG9nZ2xlMTogJycsXG4gICAgICAgICAgICB0b2dnbGUyOiAnJyxcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG5cbiAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFNlY3RvckNhcnJpZXJBbmFseXNpcyhyZXFkYXRhKVxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKSB7XG4gICAgICAgICAgICAgICAgLy8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXG4gICAgICAgICAgICAgICAgdmFyIGpzb25PYmogPSBkYXRhLnJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzLCBmdW5jdGlvbih2YWw6IGFueSwgaTogbnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbFsnb3RoZXJzJ10gPSB2YWwuaXRlbXMuc3BsaWNlKC0xLCAxKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2YXIgc29ydGVkRGF0YSA9IF8uc29ydEJ5KGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHZhciBmYXZTZWN0b3JDYXJyaWVyUmVzdWx0ID0gXy5maWx0ZXIoc29ydGVkRGF0YSwgZnVuY3Rpb24odTogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB0aGF0LlNlY3RvckNhcnJpZXJBbmFseXNpc0NoYXJ0cyA9IGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzO1xuICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgICAgICAgICAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnRXJyb3InLFxuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiAnTm8gRGF0YSBGb3VuZCBGb3IgU2VjdG9yQ2FycmllckFuYWx5c2lzISEhJ1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkb25lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGFyZ2V0QWN0dWFsRmlsdGVyKHRoYXQ6IE1pc0NvbnRyb2xsZXIpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGl0ZW06IGFueSl7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS50b2dnbGUxID09IHRoYXQudG9nZ2xlLnRhcmdldFJldk9yUGF4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2VjdG9yQ2FycmllckZpbHRlcih0aGF0OiBNaXNDb250cm9sbGVyKSB7XG4gICAgICAgdGhhdCA9IHRoaXMudGhhdDtcbiAgICAgICByZXR1cm4gZnVuY3Rpb24oaXRlbTogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS50b2dnbGUxID09IHRoYXQudG9nZ2xlLnNlY3Rvck9yZGVyICYmIGl0ZW0udG9nZ2xlMiA9PSB0aGF0LnRvZ2dsZS5zZWN0b3JSZXZPclBheDsgXG4gICAgICB9XG4gICAgIFxuICAgIH1cblxuICAgIHJldmVudWVBbmFseXNpc0ZpbHRlcihpdGVtOiBhbnkpIHtcbiAgICAgICAgdmFyIHN1cmNoYXJnZUZsYWcgPSAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/IFwiWVwiIDogXCJOXCI7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHN1cmNoYXJnZUZsYWcrJyA6ICcraXRlbSk7XG4gICAgICAgIGlmKCBpdGVtLnN1cmNoYXJnZUZsYWcgPT0gc3VyY2hhcmdlRmxhZykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7IFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBnZXRGbG93bkZhdm9yaXRlcygpIHtcbiAgICAgICAgdGhpcy5jYWxsTWV0cmljU25hcHNob3QoKTtcbiAgICAgICAgdGhpcy5jYWxsVGFyZ2V0VnNBY3R1YWwoKTtcbiAgICAgICAgdGhpcy5jYWxsUmV2ZW51ZUFuYWx5c2lzKCk7XG4gICAgfVxuXG4gICAgaW9uaWNMb2FkaW5nU2hvdygpIHtcbiAgICAgICAgdGhpcy4kaW9uaWNMb2FkaW5nLnNob3coe1xuICAgICAgICAgICAgdGVtcGxhdGU6ICc8aW9uLXNwaW5uZXIgY2xhc3M9XCJzcGlubmVyLWNhbG1cIj48L2lvbi1zcGlubmVyPidcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGlvbmljTG9hZGluZ0hpZGUoKSB7XG4gICAgICAgIHRoaXMuJGlvbmljTG9hZGluZy5oaWRlKCk7XG4gICAgfTtcblxuICAgIG9wZW5EcmlsbERvd25Qb3BvdmVyKCRldmVudCxyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCkge1xuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdyb3V0ZSc7XG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydDb3VudHJ5IExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdGbGlnaHQgTGV2ZWwnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2NvdW50cnlGcm9tJywnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2RvY3VtZW50IyddO1xuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xuICAgICAgICB0aGlzLmRyaWxscG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICAgIHRoaXMub3BlbkRyaWxsRG93bihyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCk7XG4gICAgfTtcblxuICAgIGNsb3Nlc1BvcG92ZXIoKSB7XG4gICAgICAgIHRoaXMuZHJpbGxwb3BvdmVyLmhpZGUoKTtcbiAgICB9O1xuXG4gICAgaXNEcmlsbFJvd1NlbGVjdGVkKGxldmVsLG9iaikge1xuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RlZERyaWxsW2xldmVsXSA9PSBvYmo7XG4gICAgfVxuICAgIHNlYXJjaFJlc3VsdHMgKGxldmVsLG9iaikge1xuICAgICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLmZpbHRlcmVkTGlzdFNlcnZpY2Uuc2VhcmNoZWQodGhpcy5ncm91cHNbbGV2ZWxdLm9yZ0l0ZW1zWzBdLCBvYmouc2VhcmNoVGV4dCwgbGV2ZWwsIHRoaXMuZHJpbGxUeXBlKTtcbiAgICAgICAgaWYgKG9iai5zZWFyY2hUZXh0ID09ICcnKSB7XG4gICAgICAgICAgICB0aGlzLnJlc2V0QWxsKGxldmVsKTsgXG4gICAgICAgICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0ub3JnSXRlbXNbMF07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSAwO1xuICAgICAgICB0aGlzLnBhZ2luYXRpb24obGV2ZWwpOyBcbiAgICB9XG4gICAgcGFnaW5hdGlvbiAobGV2ZWwpIHtcbiAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLkl0ZW1zQnlQYWdlID0gdGhpcy5maWx0ZXJlZExpc3RTZXJ2aWNlLnBhZ2VkKHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSwgdGhpcy5wYWdlU2l6ZSApO1xuICAgIH07XG5cbiAgICBzZXRQYWdlIChsZXZlbCwgcGFnZW5vKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gcGFnZW5vO1xuICAgIH07XG4gICAgbGFzdFBhZ2UobGV2ZWwpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UubGVuZ3RoIC0gMTtcbiAgICB9O1xuICAgIHJlc2V0QWxsKGxldmVsKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcbiAgICB9XG4gICAgc29ydChzb3J0QnksbGV2ZWwsb3JkZXIpIHtcbiAgICAgICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XG4gICAgICAgIHRoaXMuY29sdW1uVG9PcmRlciA9IHNvcnRCeTsgXG4gICAgICAgIC8vJEZpbHRlciAtIFN0YW5kYXJkIFNlcnZpY2VcbiAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy4kZmlsdGVyKCdvcmRlckJ5JykodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLmNvbHVtblRvT3JkZXIsIG9yZGVyKTsgXG4gICAgICAgIHRoaXMucGFnaW5hdGlvbihsZXZlbCk7ICAgIFxuICAgIH07XG4gICAgcmFuZ2UodG90YWwsIGxldmVsKSB7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgdmFyIHN0YXJ0OiBudW1iZXI7XG4gICAgICAgIHN0YXJ0ID0gMDtcbiAgICAgICAgaWYodG90YWwgPiA1KSB7XG4gICAgICAgICAgICBzdGFydCA9IE51bWJlcih0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSkgLSAyO1xuICAgICAgICB9XG4gICAgICAgIGlmKHN0YXJ0IDwgMCkge1xuICAgICAgICAgIHN0YXJ0ID0gMDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgayA9IDE7XG4gICAgICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IHRvdGFsOyBpKyspIHtcbiAgICAgICAgICByZXQucHVzaChpKTtcbiAgICAgICAgICBrKys7XG4gICAgICAgICAgaWYgKGsgPiA2KSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICB0b2dnbGVHcm91cCAoZ3JvdXApIHtcbiAgICAgICAgaWYgKHRoaXMuaXNHcm91cFNob3duKGdyb3VwKSkge1xuICAgICAgICAgICAgdGhpcy5zaG93bkdyb3VwID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2hvd25Hcm91cCA9IGdyb3VwO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlzR3JvdXBTaG93bihncm91cDogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNob3duR3JvdXAgPT0gZ3JvdXA7XG4gICAgfVxuXHR0b2dnbGVDaGFydE9yVGFibGVWaWV3KHZhbDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLmNoYXJ0T3JUYWJsZSA9IHZhbDtcbiAgICB9XG4gICAgdG9nZ2xlVGFyZ2V0Vmlldyh2YWw6IHN0cmluZykge1xuICAgICAgICB0aGlzLnRvZ2dsZS50YXJnZXRWaWV3ID0gdmFsO1xuICAgIH1cbiAgICB0b2dnbGVSZXZlbnVlVmlldyh2YWw6IHN0cmluZykge1xuICAgICAgICB0aGlzLnRvZ2dsZS5yZXZlbnVlVmlldyA9IHZhbDtcbiAgICB9XG4gICAgdG9nZ2xlU2VjdG9yVmlldyh2YWw6IHN0cmluZykge1xuICAgICAgICB0aGlzLnRvZ2dsZS5zZWN0b3JWaWV3ID0gdmFsO1xuICAgIH1cblx0cnVuUmVwb3J0KGNoYXJ0VGl0bGU6IHN0cmluZyxtb250aE9yWWVhcjogc3RyaW5nLGZsb3duTW9udGg6IHN0cmluZyl7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdC8vaWYgbm8gY29yZG92YSwgdGhlbiBydW5uaW5nIGluIGJyb3dzZXIgYW5kIG5lZWQgdG8gdXNlIGRhdGFVUkwgYW5kIGlmcmFtZVxuXHRcdGlmICghd2luZG93LmNvcmRvdmEpIHtcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nU2hvdygpO1xuXHRcdFx0dGhpcy5yZXBvcnRTdmMucnVuUmVwb3J0RGF0YVVSTChjaGFydFRpdGxlLG1vbnRoT3JZZWFyLGZsb3duTW9udGgpXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKGRhdGFVUkwpIHtcblx0XHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdFx0XHQvL3NldCB0aGUgaWZyYW1lIHNvdXJjZSB0byB0aGUgZGF0YVVSTCBjcmVhdGVkXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyhkYXRhVVJMKTtcblx0XHRcdFx0XHQvL2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwZGZJbWFnZScpLnNyYyA9IGRhdGFVUkw7XG5cdFx0XHRcdFx0d2luZG93Lm9wZW4oZGF0YVVSTCxcIl9zeXN0ZW1cIik7XG5cdFx0XHRcdH0sIGZ1bmN0aW9uKGVycm9yKSB7XG5cdFx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0Vycm9yICcpO1xuXHRcdFx0XHR9KTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHQvL2lmIGNvZHJvdmEsIHRoZW4gcnVubmluZyBpbiBkZXZpY2UvZW11bGF0b3IgYW5kIGFibGUgdG8gc2F2ZSBmaWxlIGFuZCBvcGVuIHcvIEluQXBwQnJvd3NlclxuXHRcdGVsc2Uge1xuXHRcdFx0dGhhdC5pb25pY0xvYWRpbmdTaG93KCk7XG5cdFx0XHR0aGlzLnJlcG9ydFN2Yy5ydW5SZXBvcnRBc3luYyhjaGFydFRpdGxlLG1vbnRoT3JZZWFyLGZsb3duTW9udGgpXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKGZpbGVQYXRoKSB7XG5cdFx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHRcdFx0Ly9sb2cgdGhlIGZpbGUgbG9jYXRpb24gZm9yIGRlYnVnZ2luZyBhbmQgb29wZW4gd2l0aCBpbmFwcGJyb3dzZXJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVwb3J0IHJ1biBvbiBkZXZpY2UgdXNpbmcgRmlsZSBwbHVnaW4nKTtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnUmVwb3J0Q3RybDogT3BlbmluZyBQREYgRmlsZSAoJyArIGZpbGVQYXRoICsgJyknKTtcblx0XHRcdFx0XHR2YXIgbGFzdFBhcnQgPSBmaWxlUGF0aC5zcGxpdChcIi9cIikucG9wKCk7XG5cdFx0XHRcdFx0dmFyIGZpbGVOYW1lID0gXCIvbW50L3NkY2FyZC9cIitsYXN0UGFydDtcdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYoZGV2aWNlLnBsYXRmb3JtICE9XCJBbmRyb2lkXCIpXG5cdFx0XHRcdFx0ZmlsZU5hbWUgPSBmaWxlUGF0aDtcblx0XHRcdFx0XHQvL3dpbmRvdy5vcGVuUERGKGZpbGVOYW1lKTtcblx0XHRcdFx0XHQvL2Vsc2Vcblx0XHRcdFx0XHQvL3dpbmRvdy5vcGVuKGZpbGVQYXRoLCAnX2JsYW5rJywgJ2xvY2F0aW9uPW5vLGNsb3NlYnV0dG9uY2FwdGlvbj1DbG9zZSxlbmFibGVWaWV3cG9ydFNjYWxlPXllcycpOyovXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvcmRvdmEucGx1Z2lucy5maWxlT3BlbmVyMi5vcGVuKFxuXHRcdFx0XHRcdFx0ZmlsZU5hbWUsIFxuXHRcdFx0XHRcdFx0J2FwcGxpY2F0aW9uL3BkZicsIFxuXHRcdFx0XHRcdFx0eyBcblx0XHRcdFx0XHRcdFx0ZXJyb3IgOiBmdW5jdGlvbihlKSB7IFxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdFcnJvciBzdGF0dXM6ICcgKyBlLnN0YXR1cyArICcgLSBFcnJvciBtZXNzYWdlOiAnICsgZS5tZXNzYWdlKTtcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0c3VjY2VzcyA6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZmlsZSBvcGVuZWQgc3VjY2Vzc2Z1bGx5Jyk7ICAgICAgICAgICAgICAgIFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fSwgZnVuY3Rpb24oZXJyb3IpIHtcblx0XHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRXJyb3IgJyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHR9XG5cdFxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vc2VydmljZXMvT3BlcmF0aW9uYWxTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50c1wiIC8+XG5cbmludGVyZmFjZSB0YWJPYmplY3Qge1xuICAgIHRpdGxlOiBzdHJpbmcsXG4gICAgbmFtZXM6IHN0cmluZyxcbiAgICBpY29uOiBzdHJpbmdcbn1cblxuaW50ZXJmYWNlIHRvZ2dsZU9iamVjdCB7XG4gICAgbW9udGhPclllYXI6IHN0cmluZyxcbiAgICBvcGVuT3JDbG9zZWQ6IHN0cmluZyxcbiAgICBmbGlnaHRTdGF0dXM6IHN0cmluZyxcbiAgICBmbGlnaHRSZWFzb246IHN0cmluZyxcbiAgICBjY0V4Y2VwdGlvbjogc3RyaW5nXG59XG5cbmludGVyZmFjZSBoZWFkZXJPYmplY3Qge1xuICAgIGZsb3duTW9udGg6IHN0cmluZyxcbiAgICB0YWJJbmRleDogbnVtYmVyLFxuICAgIHVzZXJOYW1lOiBzdHJpbmdcbn1cblxuY2xhc3MgT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIge1xuICBwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzdGF0ZScsICckc2NvcGUnLCAnJGlvbmljTG9hZGluZycsICckaW9uaWNQb3BvdmVyJywgJyRmaWx0ZXInLFxuICAgICdPcGVyYXRpb25hbFNlcnZpY2UnLCAnJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZScsICckdGltZW91dCcsICckd2luZG93JywgJ1JlcG9ydFN2YycsICdGaWx0ZXJlZExpc3RTZXJ2aWNlJywgJ1VzZXJTZXJ2aWNlJywgJyRpb25pY0hpc3RvcnknLCAnR1JBUEhfQ09MT1JTJywgJ1RBQlMnLCAnJGlvbmljUG9wdXAnXTtcbiAgcHJpdmF0ZSB0YWJzOiBbdGFiT2JqZWN0XTtcbiAgcHJpdmF0ZSB0b2dnbGU6IHRvZ2dsZU9iamVjdDtcbiAgcHJpdmF0ZSBoZWFkZXI6IGhlYWRlck9iamVjdDtcbiAgcHJpdmF0ZSBzdWJIZWFkZXI6IGFueTtcbiAgcHJpdmF0ZSBmbGlnaHRQcm9jU3RhdHVzOiBhbnk7XG4gIHByaXZhdGUgZmF2RmxpZ2h0UHJvY1Jlc3VsdDogYW55O1xuICBwcml2YXRlIGNhcm91c2VsSW5kZXg6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgZmxpZ2h0Q291bnRSZWFzb246IGFueTtcbiAgcHJpdmF0ZSBjb3Vwb25Db3VudEV4Y2VwdGlvbjogYW55O1xuICBwcml2YXRlIGNoYXJ0dHlwZTogc3RyaW5nO1xuICBwcml2YXRlIGdyYXBoVHlwZTogc3RyaW5nO1xuICBwcml2YXRlIGdyYXBocG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XG4gIHByaXZhdGUgcG9wb3ZlcnNob3duOiBib29sZWFuO1xuICBwcml2YXRlIHRocmVlQmFyQ2hhcnRDb2xvcnM6IFtzdHJpbmddID0gdGhpcy5HUkFQSF9DT0xPUlMuVEhSRUVfQkFSU19DSEFSVDtcbiAgcHJpdmF0ZSBmb3VyQmFyQ2hhcnRDb2xvcnM6IFtzdHJpbmddID0gdGhpcy5HUkFQSF9DT0xPUlMuRk9VUl9CQVJTX0NIQVJUO1xuXG4gIHByaXZhdGUgaW5mb3BvcG92ZXI6IElvbmljLklQb3BvdmVyO1xuICBwcml2YXRlIGluZm9kYXRhOiBzdHJpbmc7XG4gIHByaXZhdGUgZmxpZ2h0UHJvY1NlY3Rpb246IHN0cmluZztcbiAgcHJpdmF0ZSBmbGlnaHRDb3VudFNlY3Rpb246IHN0cmluZztcbiAgcHJpdmF0ZSBjb3Vwb25Db3VudFNlY3Rpb246IHN0cmluZztcbiAgcHJpdmF0ZSBjdXJyZW50SW5kZXg6IG51bWJlcjtcblxuICBwcml2YXRlIHBhZ2VTaXplID0gNDtcbiAgcHJpdmF0ZSBjdXJyZW50UGFnZSA9IFtdO1xuICBwcml2YXRlIHNlbGVjdGVkRHJpbGwgPSBbXTtcbiAgcHJpdmF0ZSBncm91cHMgPSBbXTtcbiAgcHJpdmF0ZSBjb2x1bW5Ub09yZGVyOiBzdHJpbmc7XG4gIHByaXZhdGUgc2hvd25Hcm91cDogbnVtYmVyO1xuICBwcml2YXRlIGRyaWxsVHlwZTogc3RyaW5nO1xuICBwcml2YXRlIGRyaWxsQmFyTGFiZWw6IHN0cmluZztcbiAgcHJpdmF0ZSBleGNlcHRpb25DYXRlZ29yeTogc3RyaW5nO1xuICBwcml2YXRlIGRyaWxsdGFiczogc3RyaW5nW107XG4gIHByaXZhdGUgZHJpbGxOYW1lOiBzdHJpbmc7XG4gIHByaXZhdGUgZmlyc3RDb2x1bW5zOiBzdHJpbmdbXTtcbiAgcHJpdmF0ZSBkcmlsbHBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xuXG4gIHByaXZhdGUgZmxpZ2h0Q291bnRMZWdlbmRzOiBhbnk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSwgcHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSxcbiAgICBwcml2YXRlICRpb25pY0xvYWRpbmc6IElvbmljLklMb2FkaW5nLFxuICAgIHByaXZhdGUgJGlvbmljUG9wb3ZlcjogSW9uaWMuSVBvcG92ZXIsIHByaXZhdGUgJGZpbHRlcjogbmcuSUZpbHRlclNlcnZpY2UsXG4gICAgcHJpdmF0ZSBvcGVyYXRpb25hbFNlcnZpY2U6IE9wZXJhdGlvbmFsU2VydmljZSxcbiAgICBwcml2YXRlICRpb25pY1NsaWRlQm94RGVsZWdhdGU6IElvbmljLklTbGlkZUJveERlbGVnYXRlLFxuICAgIHByaXZhdGUgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSwgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcbiAgICBwcml2YXRlIHJlcG9ydFN2YzogUmVwb3J0U3ZjLCBwcml2YXRlIGZpbHRlcmVkTGlzdFNlcnZpY2U6IEZpbHRlcmVkTGlzdFNlcnZpY2UsXG4gICAgcHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UsIHByaXZhdGUgJGlvbmljSGlzdG9yeTogYW55LCBwcml2YXRlIEdSQVBIX0NPTE9SUzogc3RyaW5nLCBwcml2YXRlIFRBQlM6IHN0cmluZywgcHJpdmF0ZSAkaW9uaWNQb3B1cDogSW9uaWMuSVBvcHVwKSB7XG4gICAgICBcbiAgICB0aGlzLnRhYnMgPSB0aGlzLlRBQlMuREIyX1RBQlM7XG5cbiAgICB0aGlzLnRvZ2dsZSA9IHtcbiAgICAgIG1vbnRoT3JZZWFyOiAnbW9udGgnLFxuICAgICAgb3Blbk9yQ2xvc2VkOiAnT1BFTicsXG4gICAgICBmbGlnaHRTdGF0dXM6ICdjaGFydCcsXG4gICAgICBmbGlnaHRSZWFzb246ICdjaGFydCcsXG4gICAgICBjY0V4Y2VwdGlvbjogJ2NoYXJ0J1xuICAgIH07XG5cbiAgICB0aGlzLmhlYWRlciA9IHtcbiAgICAgIGZsb3duTW9udGg6ICcnLFxuICAgICAgdGFiSW5kZXg6IDAsXG4gICAgICB1c2VyTmFtZTogJydcbiAgICB9O1xuICBhbmd1bGFyLmVsZW1lbnQod2luZG93KS5iaW5kKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMub3JpZW50YXRpb25DaGFuZ2UpOyBcbiAgICB0aGlzLmluaXREYXRhKCk7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgICB0aGlzLiRzY29wZS4kb24oJ29uU2xpZGVNb3ZlJywgKGV2ZW50OiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcbiAgICAgICAgICB0aGF0LiRzY29wZS5PcHJDdHJsLm9uU2xpZGVNb3ZlKHJlc3BvbnNlKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLiRzY29wZS4kb24oJyRpb25pY1ZpZXcuZW50ZXInLCAoKSA9PiB7XG4gICAgICAgIGlmICghdGhhdC51c2VyU2VydmljZS5zaG93RGFzaGJvYXJkKCdPcGVyYXRpb25hbCcpKSB7XG4gICAgICAgICAgdGhhdC4kc3RhdGUuZ28oXCJsb2dpblwiKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuJHNjb3BlLiRvbignb3BlbkRyaWxsUG9wdXAxJywgKGV2ZW50OiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UudHlwZSk7XG4gICAgICAgIGlmIChyZXNwb25zZS50eXBlID09ICdmbGlnaHQtcHJvY2VzcycpIHtcbiAgICAgICAgICB0aGlzLiRzY29wZS5PcHJDdHJsLm9wZW5GbGlnaHRQcm9jZXNzRHJpbGxQb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ2NvdXBvbi1jb3VudCcpIHtcbiAgICAgICAgICB0aGlzLiRzY29wZS5PcHJDdHJsLm9wZW5Db3VucG9uQ291bnREcmlsbFBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAnZmxpZ2h0LWNvdW50Jykge1xuICAgICAgICAgIHRoaXMuJHNjb3BlLk9wckN0cmwub3BlbkZsaWdodENvdW50RHJpbGxQb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cbiAgaW5pdERhdGEoKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9kcmlsZG93bi5odG1sJywge1xuICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXG4gICAgfSkudGhlbihmdW5jdGlvbihkcmlsbHBvcG92ZXIpIHtcbiAgICAgIHRoYXQuZHJpbGxwb3BvdmVyID0gZHJpbGxwb3BvdmVyO1xuICAgIH0pO1xuXG5cbiAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL2luZm90b29sdGlwLmh0bWwnLCB7XG4gICAgICBzY29wZTogdGhhdC4kc2NvcGVcbiAgICB9KS50aGVuKGZ1bmN0aW9uKGluZm9wb3BvdmVyKSB7XG4gICAgICB0aGF0LmluZm9wb3BvdmVyID0gaW5mb3BvcG92ZXI7XG4gICAgfSk7XG5cbiAgICB2YXIgcmVxID0ge1xuICAgICAgdXNlcklkOiB0aGF0LiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInKVxuICAgIH1cblxuICAgIGlmIChyZXEudXNlcklkICE9IFwibnVsbFwiKSB7XG4gICAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRQYXhGbG93bk9wckhlYWRlcihyZXEpLnRoZW4oXG4gICAgICAgIChkYXRhKSA9PiB7XG4gICAgICAgICAgdGhhdC5zdWJIZWFkZXIgPSBkYXRhLnJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2codGhhdC5zdWJIZWFkZXIucGF4Rmxvd25PcHJNb250aHMpO1xuICAgICAgICAgIHRoYXQuaGVhZGVyLmZsb3duTW9udGggPSB0aGF0LnN1YkhlYWRlci5kZWZhdWx0TW9udGg7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2codGhhdC5oZWFkZXIuZmxvd25Nb250aCk7XG4gICAgICAgICAgdGhhdC5vblNsaWRlTW92ZSh7IGluZGV4OiAwIH0pO1xuICAgICAgICB9LFxuICAgICAgICAoZXJyb3IpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgdGhhdC5oZWFkZXIudXNlck5hbWUgPSB0aGF0LmdldFByb2ZpbGVVc2VyTmFtZSgpO1xuICB9XG4gIHNlbGVjdGVkRmxvd25Nb250aChtb250aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIChtb250aCA9PSB0aGlzLmhlYWRlci5mbG93bk1vbnRoKTtcbiAgfVxuXG4gIGdldFByb2ZpbGVVc2VyTmFtZSgpOiBzdHJpbmcge1xuICAgIGlmICh0aGlzLnVzZXJTZXJ2aWNlLmlzVXNlckxvZ2dlZEluKCkpIHtcbiAgICAgIHZhciBvYmogPSB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInKTtcbiAgICAgIGlmIChvYmogIT0gJ251bGwnKSB7XG4gICAgICAgIHZhciBwcm9maWxlVXNlck5hbWUgPSBKU09OLnBhcnNlKG9iaik7XG4gICAgICAgIHJldHVybiBwcm9maWxlVXNlck5hbWUudXNlcm5hbWU7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuICBvcmllbnRhdGlvbkNoYW5nZSA9ICgpOiBib29sZWFuID0+IHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhhdC4kdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHRoYXQub25TbGlkZU1vdmUoeyBpbmRleDogdGhhdC5oZWFkZXIudGFiSW5kZXggfSk7XG4gICAgfSwgMjAwKVxuICB9XG5cbiAgdXBkYXRlSGVhZGVyKCkge1xuICAgIHZhciBmbG93bk1vbnRoID0gdGhpcy5oZWFkZXIuZmxvd25Nb250aDtcbiAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xuICB9XG5cblxuICBvblNsaWRlTW92ZShkYXRhOiBhbnkpIHtcbiAgICB0aGlzLmhlYWRlci50YWJJbmRleCA9IGRhdGEuaW5kZXg7XG4gICAgdGhpcy50b2dnbGUuY2hhcnRPclRhYmxlID0gXCJjaGFydFwiO1xuICAgIHN3aXRjaCAodGhpcy5oZWFkZXIudGFiSW5kZXgpIHtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgdGhpcy5jYWxsTXlEYXNoYm9hcmQoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHRoaXMuY2FsbEZsaWdodFByb2NTdGF0dXMoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHRoaXMuY2FsbEZsaWdodENvdW50QnlSZWFzb24oKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHRoaXMuY2FsbENvdXBvbkNvdW50QnlFeGNlcHRpb24oKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9O1xuICBjYWxsTXlEYXNoYm9hcmQoKSB7XG4gICAgdGhpcy5jYWxsRmxpZ2h0UHJvY1N0YXR1cygpO1xuICAgIHRoaXMuY2FsbEZsaWdodENvdW50QnlSZWFzb24oKTtcbiAgICB0aGlzLmNhbGxDb3Vwb25Db3VudEJ5RXhjZXB0aW9uKCk7XG4gIH1cbiAgY2FsbEZsaWdodFByb2NTdGF0dXMoKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciByZXFkYXRhID0ge1xuICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlck5hbWUsXG4gICAgICB0b2dnbGUxOiAnJyxcbiAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXG4gICAgfTtcblxuICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckZsaWdodFByb2NTdGF0dXMocmVxZGF0YSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRpZihkYXRhLnJlc3BvbnNlLnN0YXR1cyA9PT0gXCJzdWNjZXNzXCIgJiYgZGF0YS5yZXNwb25zZS5kYXRhLmhhc093blByb3BlcnR5KCdzZWN0aW9uTmFtZScpKXtcdFx0ICBcblx0XHRcdHZhciBvdGhlckNoYXJ0Q29sb3JzID0gW3sgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5GT1VSX0JBUlNfQ0hBUlRbMF0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkZPVVJfQkFSU19DSEFSVFsxXSB9LFxuXHRcdFx0ICB7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuRk9VUl9CQVJTX0NIQVJUWzJdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5GT1VSX0JBUlNfQ0hBUlRbM10gfV07XG5cdFx0XHR2YXIgcGllQ2hhcnRDb2xvcnMgPSBbeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLlRIUkVFX0JBUlNfQ0hBUlRbMF0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLlRIUkVFX0JBUlNfQ0hBUlRbMV0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLlRIUkVFX0JBUlNfQ0hBUlRbMl0gfV07XG5cblx0XHRcdHZhciBqc29uT2JqID0gdGhhdC5hcHBseUNoYXJ0Q29sb3JDb2RlcyhkYXRhLnJlc3BvbnNlLmRhdGEsIHBpZUNoYXJ0Q29sb3JzLCBvdGhlckNoYXJ0Q29sb3JzKTtcblx0XHRcdHRoYXQuZmxpZ2h0UHJvY1NlY3Rpb24gPSBqc29uT2JqLnNlY3Rpb25OYW1lO1xuXHRcdFx0dmFyIHBpZUNoYXJ0cyA9IF8uZmlsdGVyKGpzb25PYmoucGllQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcblx0XHRcdCAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcblx0XHRcdH0pO1xuXHRcdFx0dmFyIG11bHRpQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5tdWx0aWJhckNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XG5cdFx0XHQgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG5cdFx0XHR9KTtcblx0XHRcdHZhciBzdGFja0NoYXJ0cyA9IF8uZmlsdGVyKGpzb25PYmouc3RhY2tlZEJhckNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XG5cdFx0XHQgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG5cdFx0XHR9KTsgICAgICAgICAgXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhzdGFja0NoYXJ0cyk7XG5cdFx0XHRpZiAodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xuXHRcdFx0ICB0aGF0LmZsaWdodFByb2NTdGF0dXMgPSB7XG5cdFx0XHRcdHBpZUNoYXJ0OiBwaWVDaGFydHNbMF0sXG5cdFx0XHRcdHdlZWtEYXRhOiBtdWx0aUNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsXG5cdFx0XHRcdHN0YWNrZWRDaGFydDogKHN0YWNrQ2hhcnRzLmxlbmd0aCkgPyBzdGFja0NoYXJ0c1swXSA6IFtdXG5cdFx0XHQgIH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHQgIHRoYXQuZmxpZ2h0UHJvY1N0YXR1cyA9IHtcblx0XHRcdFx0cGllQ2hhcnQ6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxuXHRcdFx0XHR3ZWVrRGF0YToganNvbk9iai5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsXG5cdFx0XHRcdHN0YWNrZWRDaGFydDoganNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdXG5cdFx0XHQgIH1cblx0XHRcdH1cblx0XHRcdC8vIGNvbnNvbGUubG9nKHN0YWNrQ2hhcnRzKTtcblx0XHRcdHRoYXQuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHQgIHRoYXQuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpLnVwZGF0ZSgpO1xuXHRcdFx0fSwgMCk7XG5cdFx0XHQvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0aGF0LmZsaWdodFByb2NTdGF0dXMud2Vla0RhdGEpKTtcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuXHRcdH1lbHNle1xuXHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHR0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcblx0XHRcdFx0dGl0bGU6ICdFcnJvcicsXG5cdFx0XHRcdGNvbnRlbnQ6ICdEYXRhIG5vdCBmb3VuZCBmb3IgRmxpZ2h0cyBQcm9jZXNzaW5nIFN0YXR1cyEhISdcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdkb25lJyk7XG5cdFx0XHR9KTtcblxuXHRcdH1cbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICB9KTtcbiAgfVxuICBjYWxsRmxpZ2h0Q291bnRCeVJlYXNvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHJlcWRhdGEgPSB7XG4gICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VyTmFtZSxcbiAgICAgIHRvZ2dsZTE6IHRoaXMudG9nZ2xlLm9wZW5PckNsb3NlZC50b0xvd2VyQ2FzZSgpLFxuICAgICAgZnVsbERhdGFGbGFnOiAnTidcbiAgICB9O1xuICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckZsaWdodENvdW50QnlSZWFzb24ocmVxZGF0YSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIGlmIChkYXRhLnJlc3BvbnNlLnN0YXR1cyA9PT0gXCJzdWNjZXNzXCIgJiYgZGF0YS5yZXNwb25zZS5kYXRhLmhhc093blByb3BlcnR5KCdzZWN0aW9uTmFtZScpKSB7XHRcblx0XHRcdC8vIGNvbnNvbGUubG9nKGpzb25PYmoucGllQ2hhcnRzWzBdKTtcblx0XHRcdHZhciBvdGhlckNoYXJ0Q29sb3JzID0gW3sgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fT1RIX0NPTE9SUzFbMF0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19PVEhfQ09MT1JTMVsxXSB9LCB7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX09USF9DT0xPUlMxWzJdIH1dO1xuXHRcdFx0dmFyIHBpZUNoYXJ0Q29sb3JzID0gW3sgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMF0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVsxXSB9LCB7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxWzJdIH1dO1xuXG5cdFx0XHR0aGF0LmZsaWdodENvdW50TGVnZW5kcyA9IGRhdGEucmVzcG9uc2UuZGF0YS5sZWdlbmRzO1xuXG5cdFx0XHR2YXIganNvbk9iaiA9IHRoYXQuYXBwbHlDaGFydENvbG9yQ29kZXMoZGF0YS5yZXNwb25zZS5kYXRhLCBwaWVDaGFydENvbG9ycywgb3RoZXJDaGFydENvbG9ycyk7XG5cdFx0XHR0aGF0LmZsaWdodENvdW50U2VjdGlvbiA9IGpzb25PYmouc2VjdGlvbk5hbWU7XG5cdFx0XHRpZiAodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xuXHRcdFx0ICB0aGF0LmZsaWdodENvdW50UmVhc29uID0gdGhhdC5nZXRGYXZvcml0ZUl0ZW1zKGpzb25PYmopO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdCAgdGhhdC5mbGlnaHRDb3VudFJlYXNvbiA9IHtcblx0XHRcdFx0cGllQ2hhcnQ6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxuXHRcdFx0XHR3ZWVrRGF0YToganNvbk9iai5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsXG5cdFx0XHRcdHN0YWNrZWRDaGFydDoganNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdXG5cdFx0XHQgIH1cblx0XHRcdH1cblxuXHRcdFx0dGhhdC4kdGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdCAgdGhhdC4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykudXBkYXRlKCk7XG5cdFx0XHR9LCAwKTtcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuXHRcdH1lbHNle1xuXHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcbiAgICAgICAgdGl0bGU6ICdFcnJvcicsXG4gICAgICAgIGNvbnRlbnQ6ICdEYXRhIG5vdCBmb3VuZCBmb3IgRmxpZ2h0cyBDb3VudCBieSBSZWFzb24hISEnXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdkb25lJyk7XG4gICAgICB9KTtcblxuXHRcdH1cbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgfSk7XG4gIH1cblxuICBjYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHJlcWRhdGEgPSB7XG4gICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VyTmFtZSxcbiAgICAgIHRvZ2dsZTE6ICcnLFxuICAgICAgZnVsbERhdGFGbGFnOiAnTidcbiAgICB9O1xuICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckNvdXBvbkNvdW50QnlFeGNlcHRpb24ocmVxZGF0YSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIGlmIChkYXRhLnJlc3BvbnNlLnN0YXR1cyA9PT0gXCJzdWNjZXNzXCIgJiYgZGF0YS5yZXNwb25zZS5kYXRhLmhhc093blByb3BlcnR5KCdzZWN0aW9uTmFtZScpKSB7XG5cdFx0XHR2YXIgb3RoZXJDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxWzBdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMV0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVsyXSB9XTtcblx0XHRcdHZhciBwaWVDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxWzBdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMV0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVsyXSB9XTtcblxuXHRcdFx0dmFyIGpzb25PYmogPSB0aGF0LmFwcGx5Q2hhcnRDb2xvckNvZGVzKGRhdGEucmVzcG9uc2UuZGF0YSwgcGllQ2hhcnRDb2xvcnMsIG90aGVyQ2hhcnRDb2xvcnMpO1xuXHRcdFx0dGhhdC5jb3Vwb25Db3VudFNlY3Rpb24gPSBqc29uT2JqLnNlY3Rpb25OYW1lO1xuXHRcdFx0aWYgKHRoYXQuaGVhZGVyLnRhYkluZGV4ID09IDApIHtcblx0XHRcdCAgdGhhdC5jb3Vwb25Db3VudEV4Y2VwdGlvbiA9IHRoYXQuZ2V0RmF2b3JpdGVJdGVtcyhqc29uT2JqKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHQgIHRoYXQuY291cG9uQ291bnRFeGNlcHRpb24gPSB7XG5cdFx0XHRcdHBpZUNoYXJ0OiBqc29uT2JqLnBpZUNoYXJ0c1swXSxcblx0XHRcdFx0d2Vla0RhdGE6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxuXHRcdFx0XHRzdGFja2VkQ2hhcnQ6IGpzb25PYmouc3RhY2tlZEJhckNoYXJ0c1swXVxuXHRcdFx0ICB9XG5cdFx0XHR9XG5cdFx0XHR0aGF0LiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0ICB0aGF0LiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGEnKS51cGRhdGUoKTtcblx0XHRcdH0sIDApO1xuXHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHRcdFxuXHRcdH1lbHNle1xuXHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcbiAgICAgICAgdGl0bGU6ICdFcnJvcicsXG4gICAgICAgIGNvbnRlbnQ6ICdEYXRhIG5vdCBmb3VuZCBmb3IgQ291cG9uIENvdW50IGJ5IEV4Y2VwdGlvbiBDYXRlZ29yeSEhISdcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2RvbmUnKTtcbiAgICAgIH0pO1xuXG5cdFx0fVxuICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICB9KTtcbiAgfVxuICBvcGVuUG9wb3ZlcigkZXZlbnQsIGNoYXJ0dHlwZSwgaW5kZXgpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHRlbXAgPSB0aGlzLiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGEnKTtcbiAgICB0aGF0LmN1cnJlbnRJbmRleCA9IHRlbXAuY3VycmVudEluZGV4KCk7XG4gICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdGhpcy5jaGFydHR5cGUgPSBjaGFydHR5cGU7XG4gICAgdGhpcy5ncmFwaFR5cGUgPSBpbmRleDtcbiAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL2dyYXBoLXBvcG92ZXIuaHRtbCcsIHtcbiAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxuICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xuICAgICAgdGhhdC5wb3BvdmVyc2hvd24gPSB0cnVlO1xuICAgICAgdGhhdC5ncmFwaHBvcG92ZXIgPSBwb3BvdmVyO1xuICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xuICAgIH0pO1xuICB9XG4gIG9wZW5QaWVQb3BvdmVyKCRldmVudCwgY2hhcnR0eXBlLCBpbmRleCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB0aGlzLmNoYXJ0dHlwZSA9IGNoYXJ0dHlwZTtcbiAgICB0aGlzLmdyYXBoVHlwZSA9IGluZGV4O1xuICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vcGllLXBvcG92ZXIuaHRtbCcsIHtcbiAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxuICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xuICAgICAgdGhhdC5wb3BvdmVyc2hvd24gPSB0cnVlO1xuICAgICAgdGhhdC5ncmFwaHBvcG92ZXIgPSBwb3BvdmVyO1xuICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xuICAgIH0pO1xuICB9XG5cbiAgY2xvc2VQb3BvdmVyKCkge1xuICAgIHRoaXMuZ3JhcGhwb3BvdmVyLmhpZGUoKTtcbiAgfTtcbiAgaW9uaWNMb2FkaW5nU2hvdygpIHtcbiAgICB0aGlzLiRpb25pY0xvYWRpbmcuc2hvdyh7XG4gICAgICB0ZW1wbGF0ZTogJzxpb24tc3Bpbm5lciBjbGFzcz1cInNwaW5uZXItY2FsbVwiPjwvaW9uLXNwaW5uZXI+J1xuICAgIH0pO1xuICB9O1xuICBhcHBseUNoYXJ0Q29sb3JDb2Rlcyhqc29uT2JqOiBhbnksIHBpZUNoYXJ0Q29sb3JzOiBhbnksIG90aGVyQ2hhcnRDb2xvcnM6IGFueSkge1xuICAgIF8uZm9yRWFjaChqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCBmdW5jdGlvbihuOiBhbnksIHZhbHVlOiBhbnkpIHtcbiAgICAgIG4ubGFiZWwgPSBuLnh2YWw7XG4gICAgICBuLnZhbHVlID0gbi55dmFsO1xuICAgIH0pO1xuICAgIF8ubWVyZ2UoanNvbk9iai5waWVDaGFydHNbMF0uZGF0YSwgcGllQ2hhcnRDb2xvcnMpO1xuICAgIF8ubWVyZ2UoanNvbk9iai5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsIG90aGVyQ2hhcnRDb2xvcnMpO1x0XG5cdGlmKGpzb25PYmouc3RhY2tlZEJhckNoYXJ0c1swXS5zdGFja2VkQmFyY2hhcnRJdGVtcy5sZW5ndGggPj0gMyl7XG5cdFx0Xy5tZXJnZShqc29uT2JqLnN0YWNrZWRCYXJDaGFydHNbMF0uc3RhY2tlZEJhcmNoYXJ0SXRlbXMsIG90aGVyQ2hhcnRDb2xvcnMpO1xuXHR9ZWxzZXtcblx0XHR2YXIgdGVtcENvbG9ycyA9IFt7IFwiY29sb3JcIjogdGhpcy5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxWzBdIH0sIHsgXCJjb2xvclwiOiB0aGlzLkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMV0gfV07XG5cdFx0Xy5tZXJnZShqc29uT2JqLnN0YWNrZWRCYXJDaGFydHNbMF0uc3RhY2tlZEJhcmNoYXJ0SXRlbXMsIHRlbXBDb2xvcnMpO1xuXHR9XG4gICAgcmV0dXJuIGpzb25PYmo7XG5cbiAgfVxuICBnZXRGYXZvcml0ZUl0ZW1zKGpzb25PYmo6IGFueSkge1xuICAgIHZhciBwaWVDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLnBpZUNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XG4gICAgICBpZiAodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xuICAgIH0pO1xuICAgIHZhciBtdWx0aUNoYXJ0cyA9IF8uZmlsdGVyKGpzb25PYmoubXVsdGliYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xuICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcbiAgICB9KTtcbiAgICB2YXIgc3RhY2tDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLnN0YWNrZWRCYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xuICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcbiAgICB9KTtcbiAgICByZXR1cm4ge1xuICAgICAgcGllQ2hhcnQ6IHBpZUNoYXJ0c1swXSxcbiAgICAgIHdlZWtEYXRhOiAobXVsdGlDaGFydHMubGVuZ3RoKSA/IG11bHRpQ2hhcnRzLm11bHRpYmFyQ2hhcnRzWzBdLm11bHRpYmFyQ2hhcnRJdGVtcyA6IFtdLFxuICAgICAgc3RhY2tlZENoYXJ0OiAoc3RhY2tDaGFydHMubGVuZ3RoKSA/IHN0YWNrQ2hhcnRzWzBdIDogW11cbiAgICB9XG4gIH1cblxuICBjb2xvckZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24oZCwgaSkge1xuICAgICAgcmV0dXJuIHRoYXQudGhyZWVCYXJDaGFydENvbG9yc1tpXTtcbiAgICB9O1xuICB9XG4gIGZvdXJCYXJDb2xvckZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24oZCwgaSkge1xuICAgICAgcmV0dXJuIHRoYXQuZm91ckJhckNoYXJ0Q29sb3JzW2ldO1xuICAgIH07XG4gIH1cbiAgb3BlbmluZm9Qb3BvdmVyKCRldmVudCwgaW5kZXgpIHtcbiAgICBpZiAodHlwZW9mIGluZGV4ID09IFwidW5kZWZpbmVkXCIgfHwgaW5kZXggPT0gXCJcIikge1xuICAgICAgdGhpcy5pbmZvZGF0YSA9ICdObyBpbmZvIGF2YWlsYWJsZSc7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5pbmZvZGF0YSA9IGluZGV4O1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyhpbmRleCk7XG4gICAgdGhpcy5pbmZvcG9wb3Zlci5zaG93KCRldmVudCk7XG4gIH07XG4gIGNsb3NlSW5mb1BvcG92ZXIoKSB7XG4gICAgdGhpcy5pbmZvcG9wb3Zlci5oaWRlKCk7XG4gIH1cbiAgdG9nZ2xlQ291bnQodmFsKSB7XG4gICAgdGhpcy50b2dnbGUub3Blbk9yQ2xvc2VkID0gdmFsO1xuICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XG4gIH1cbiAgaW9uaWNMb2FkaW5nSGlkZSgpIHtcbiAgICB0aGlzLiRpb25pY0xvYWRpbmcuaGlkZSgpO1xuICB9O1xuICBsb2NrU2xpZGUoKSB7XG4gICAgY29uc29sZS5sb2coJ2luIGxvY2tTbGlkZSBtZWh0b2QuLicpO1xuICAgIHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpLmVuYWJsZVNsaWRlKGZhbHNlKTtcbiAgfTtcbiAgdGFiTG9ja1NsaWRlKHRhYm5hbWU6IHN0cmluZykge1xuICAgIHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUodGFibmFtZSkuZW5hYmxlU2xpZGUoZmFsc2UpO1xuICB9XG4gIHdlZWtEYXRhUHJldigpIHtcbiAgICB0aGlzLiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGEnKS5wcmV2aW91cygpO1xuICB9O1xuICB3ZWVrRGF0YU5leHQoKSB7XG4gICAgdGhpcy4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykubmV4dCgpO1xuICB9XG4gIHRvZ2dsZUZsaWdodFN0YXR1c1ZpZXcodmFsOiBzdHJpbmcpIHtcbiAgICB0aGlzLnRvZ2dsZS5mbGlnaHRTdGF0dXMgPSB2YWw7XG4gIH1cbiAgdG9nZ2xlRmxpZ2h0UmVhc29uVmlldyh2YWw6IHN0cmluZykge1xuICAgIHRoaXMudG9nZ2xlLmZsaWdodFJlYXNvbiA9IHZhbDtcbiAgICBpZiAodGhpcy50b2dnbGUuZmxpZ2h0UmVhc29uID09IFwiY2hhcnRcIilcbiAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xuICB9XG4gIHRvZ2dsZUNDRXhjZXB0aW9uVmlldyh2YWw6IHN0cmluZykge1xuICAgIHRoaXMudG9nZ2xlLmNjRXhjZXB0aW9uID0gdmFsO1xuICB9ICAgXG4gIHJ1blJlcG9ydChjaGFydFRpdGxlOiBzdHJpbmcsIG1vbnRoT3JZZWFyOiBzdHJpbmcsIGZsb3duTW9udGg6IHN0cmluZykge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAvL2lmIG5vIGNvcmRvdmEsIHRoZW4gcnVubmluZyBpbiBicm93c2VyIGFuZCBuZWVkIHRvIHVzZSBkYXRhVVJMIGFuZCBpZnJhbWVcbiAgICBpZiAoIXdpbmRvdy5jb3Jkb3ZhKSB7XG4gICAgICB0aGF0LmlvbmljTG9hZGluZ1Nob3coKTtcbiAgICAgIHRoaXMucmVwb3J0U3ZjLnJ1blJlcG9ydERhdGFVUkwoY2hhcnRUaXRsZSwgbW9udGhPclllYXIsIGZsb3duTW9udGgpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGFVUkwpIHtcbiAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICAvL3NldCB0aGUgaWZyYW1lIHNvdXJjZSB0byB0aGUgZGF0YVVSTCBjcmVhdGVkXG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhkYXRhVVJMKTtcbiAgICAgICAgICAvL2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwZGZJbWFnZScpLnNyYyA9IGRhdGFVUkw7XG5cdFx0ICB3aW5kb3cub3BlbihkYXRhVVJMLFwiX3N5c3RlbVwiKTtcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XG4gICAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vaWYgY29kcm92YSwgdGhlbiBydW5uaW5nIGluIGRldmljZS9lbXVsYXRvciBhbmQgYWJsZSB0byBzYXZlIGZpbGUgYW5kIG9wZW4gdy8gSW5BcHBCcm93c2VyXG4gICAgZWxzZSB7XG4gICAgICB0aGF0LmlvbmljTG9hZGluZ1Nob3coKTtcbiAgICAgIHRoaXMucmVwb3J0U3ZjLnJ1blJlcG9ydEFzeW5jKGNoYXJ0VGl0bGUsIG1vbnRoT3JZZWFyLCBmbG93bk1vbnRoKVxuICAgICAgICAudGhlbihmdW5jdGlvbihmaWxlUGF0aCkge1xuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgIC8vbG9nIHRoZSBmaWxlIGxvY2F0aW9uIGZvciBkZWJ1Z2dpbmcgYW5kIG9vcGVuIHdpdGggaW5hcHBicm93c2VyXG4gICAgICAgICAgY29uc29sZS5sb2coJ3JlcG9ydCBydW4gb24gZGV2aWNlIHVzaW5nIEZpbGUgcGx1Z2luJyk7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1JlcG9ydEN0cmw6IE9wZW5pbmcgUERGIEZpbGUgKCcgKyBmaWxlUGF0aCArICcpJyk7XG4gICAgICAgICAgdmFyIGxhc3RQYXJ0ID0gZmlsZVBhdGguc3BsaXQoXCIvXCIpLnBvcCgpO1xuICAgICAgICAgIHZhciBmaWxlTmFtZSA9IFwiL21udC9zZGNhcmQvXCIgKyBsYXN0UGFydDtcbiAgICAgICAgICBpZiAoZGV2aWNlLnBsYXRmb3JtICE9IFwiQW5kcm9pZFwiKVxuICAgICAgICAgICAgZmlsZU5hbWUgPSBmaWxlUGF0aDtcbiAgICAgICAgICAvL3dpbmRvdy5vcGVuUERGKGZpbGVOYW1lKTtcbiAgICAgICAgICAvL2Vsc2VcbiAgICAgICAgICAvL3dpbmRvdy5vcGVuKGZpbGVQYXRoLCAnX2JsYW5rJywgJ2xvY2F0aW9uPW5vLGNsb3NlYnV0dG9uY2FwdGlvbj1DbG9zZSxlbmFibGVWaWV3cG9ydFNjYWxlPXllcycpOyovXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgIGNvcmRvdmEucGx1Z2lucy5maWxlT3BlbmVyMi5vcGVuKFxuICAgICAgICAgICAgZmlsZU5hbWUsXG4gICAgICAgICAgICAnYXBwbGljYXRpb24vcGRmJyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3Igc3RhdHVzOiAnICsgZS5zdGF0dXMgKyAnIC0gRXJyb3IgbWVzc2FnZTogJyArIGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmaWxlIG9wZW5lZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xuICAgICAgICB9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIG9wZW5GbGlnaHRQcm9jZXNzRHJpbGxQb3BvdmVyKCRldmVudCwgZGF0YSwgc2VsRmluZExldmVsKSB7XG4gICAgdGhpcy5kcmlsbE5hbWUgPSAnRkxJR0hUIFBST0NFU1NJTkcgU1RBVFVTIC0gJyArIGRhdGEucG9pbnRbMF0gKyAnLScgKyB0aGlzLmhlYWRlci5mbG93bk1vbnRoO1xuICAgIHRoaXMuZHJpbGxUeXBlID0gJ2ZsaWdodC1wcm9jZXNzJztcbiAgICB0aGlzLmdyb3VwcyA9IFtdO1xuICAgIHRoaXMuZHJpbGx0YWJzID0gWydDb3VudHJ5IExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdGbGlnaHQgTGV2ZWwnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcbiAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsnY291bnRyeUZyb20nLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2NhcnJpZXJDb2RlIyddO1xuICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICB0aGF0LmRyaWxscG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICB0aGF0LnNob3duR3JvdXAgPSAwO1xuICAgIH0sIDUwKTtcbiAgICB0aGlzLm9wZW5EcmlsbERvd24oZGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcbiAgfTtcblxuICBvcGVuQ291bnBvbkNvdW50RHJpbGxQb3BvdmVyKCRldmVudCwgZGF0YSwgc2VsRmluZExldmVsKSB7XG4gICAgdGhpcy5kcmlsbE5hbWUgPSAnQ09VUE9OIENPVU5UIEJZIEVYQ0VQVElPTiBDQVRFR09SWSAnO1xuICAgIHRoaXMuZHJpbGxUeXBlID0gJ2NvdXBvbi1jb3VudCc7XG4gICAgdGhpcy5ncm91cHMgPSBbXTtcbiAgICB0aGlzLmRyaWxsdGFicyA9IFsnQ291cG9uIENvdW50IEZsaWdodCBTdGF0dXMnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcbiAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsnZmxpZ2h0TnVtYmVyJywgJ2Zsb3duU2VjdG9yJ107XG4gICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy4kdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHRoYXQuZHJpbGxwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICAgIHRoYXQuc2hvd25Hcm91cCA9IDA7XG4gICAgfSwgNTApO1xuICAgIHRoaXMub3BlbkRyaWxsRG93bihkYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xuICB9O1xuXG4gIG9wZW5GbGlnaHRDb3VudERyaWxsUG9wb3ZlcigkZXZlbnQsIGRhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgIHRoaXMuZHJpbGxOYW1lID0gJ0xJU1QgT0YgT1BFTiBGTElHSFRTIEZPUiAnICsgZGF0YS5wb2ludFswXSArICctJyArIHRoaXMuaGVhZGVyLmZsb3duTW9udGggKyAnIEJZIFJFQVNPTiAnO1xuICAgIHRoaXMuZHJpbGxUeXBlID0gJ2ZsaWdodC1jb3VudCc7XG4gICAgdGhpcy5ncm91cHMgPSBbXTtcbiAgICB0aGlzLmRyaWxsdGFicyA9IFsnT3BlbiBGbGlnaHQgU3RhdHVzJywgJ0RvY3VtZW50IExldmVsJ107XG4gICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2ZsaWdodE51bWJlcicsICdjYXJyaWVyQ29kZSddO1xuICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICB0aGF0LmRyaWxscG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICB0aGF0LnNob3duR3JvdXAgPSAwO1xuICAgIH0sIDUwKTtcbiAgICB0aGlzLm9wZW5EcmlsbERvd24oZGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcbiAgfTtcblxuICBkcmlsbERvd25SZXF1ZXN0KGRyaWxsVHlwZSwgc2VsRmluZExldmVsLCBkYXRhKSB7XG4gICAgdmFyIHJlcWRhdGE7XG4gICAgaWYgKGRyaWxsVHlwZSA9PSAnZmxpZ2h0LXByb2Nlc3MnKSB7XG4gICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgIGlmIChkYXRhLmxhYmVsKSB7XG4gICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGFbMF07XG4gICAgICB9XG5cbiAgICAgIHZhciBmbGlnaHREYXRlO1xuICAgICAgLy9mbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBTdHJpbmcoZGF0YS5mbGlnaHREYXRlKSA6IFN0cmluZyhkYXRhWzBdKTtcbiAgICAgIGZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IGRhdGEuZmxpZ2h0RGF0ZSA6IGRhdGFbMF07XG4gICAgICB2YXIgY291bnRyeUZyb21UbyA9IChkYXRhLmNvdW50cnlGcm9tICYmIGRhdGEuY291bnRyeVRvKSA/IGRhdGEuY291bnRyeUZyb20gKyAnLScgKyBkYXRhLmNvdW50cnlUbyA6IFwiXCI7XG4gICAgICB2YXIgc2VjdG9yRnJvbVRvID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XG4gICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcblxuXG5cbiAgICAgIHJlcWRhdGEgPSB7XG4gICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmdldFByb2ZpbGVVc2VyTmFtZSgpLFxuICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxuICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcbiAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXG4gICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiBmbGlnaHREYXRlLFxuICAgICAgICBcImNvdW50cnlGcm9tVG9cIjogY291bnRyeUZyb21UbyxcbiAgICAgICAgXCJzZWN0b3JGcm9tVG9cIjogc2VjdG9yRnJvbVRvLFxuICAgICAgICBcImZsaWdodE51bWJlclwiOiBmbGlnaHROdW1iZXJcbiAgICAgIH07XG4gICAgfVxuXG5cbiAgICBpZiAoZHJpbGxUeXBlID09ICdjb3Vwb24tY291bnQnKSB7XG4gICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgIGlmIChkYXRhLmxhYmVsKSB7XG4gICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGFbMF07XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5KTtcbiAgICAgIHZhciBmbGlnaHREYXRlO1xuICAgICAgLy9mbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBTdHJpbmcoZGF0YS5mbGlnaHREYXRlKSA6IFN0cmluZyhkYXRhWzBdKTtcbiAgICAgIGZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IGRhdGEuZmxpZ2h0RGF0ZSA6IGRhdGFbMF07XG4gICAgICB2YXIgZXhjZXB0aW9uQ2F0ZWdvcnkgPSAodGhpcy5leGNlcHRpb25DYXRlZ29yeSAmJiBkcmlsbExldmVsID4gMSkgPyB0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5IDogXCJcIjtcbiAgICAgIHZhciBmbGlnaHRTZWN0b3IgPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcbiAgICAgIHZhciBmbGlnaHROdW1iZXIgPSAoZGF0YS5mbGlnaHROdW1iZXIpID8gZGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xuXG5cblxuICAgICAgcmVxZGF0YSA9IHtcbiAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgIFwidXNlcklkXCI6IHRoaXMuZ2V0UHJvZmlsZVVzZXJOYW1lKCksXG4gICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwiXCIsXG4gICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxuICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcbiAgICAgICAgXCJleGNlcHRpb25DYXRlZ29yeVwiOiBleGNlcHRpb25DYXRlZ29yeSxcbiAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxuICAgICAgICBcImZsaWdodERhdGVcIjogZmxpZ2h0RGF0ZSxcbiAgICAgICAgXCJmbGlnaHRTZWN0b3JcIjogZmxpZ2h0U2VjdG9yLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoZHJpbGxUeXBlID09ICdmbGlnaHQtY291bnQnKSB7XG4gICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgIGlmIChkYXRhLmxhYmVsKSB7XG4gICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGFbMF07XG4gICAgICB9XG4gICAgICB2YXIgZmxpZ2h0RGF0ZTtcbiAgICAgIC8vZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gU3RyaW5nKGRhdGEuZmxpZ2h0RGF0ZSkgOiBTdHJpbmcoZGF0YVswXSk7XG4gICAgICBmbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBkYXRhLmZsaWdodERhdGUgOiBkYXRhWzBdO1xuICAgICAgdmFyIHRvZ2dsZTEgPSB0aGlzLnRvZ2dsZS5vcGVuT3JDbG9zZWQudG9Mb3dlckNhc2UoKTtcbiAgICAgIHZhciBmbGlnaHRTZWN0b3IgPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcbiAgICAgIHZhciBmbGlnaHROdW1iZXIgPSAoZGF0YS5mbGlnaHROdW1iZXIpID8gZGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xuICAgICAgdmFyIGZsaWdodFN0YXR1cyA9ICh0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5ICYmIGRyaWxsTGV2ZWwgPiAxKSA/IHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkgOiBcIlwiO1xuXG5cbiAgICAgIHJlcWRhdGEgPSB7XG4gICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmdldFByb2ZpbGVVc2VyTmFtZSgpLFxuICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxuICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcbiAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXG4gICAgICAgIFwidG9nZ2xlMVwiOiB0b2dnbGUxLFxuICAgICAgICBcImZsaWdodFN0YXR1c1wiOiBmbGlnaHRTdGF0dXMsXG4gICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcbiAgICAgICAgXCJmbGlnaHREYXRlXCI6IGZsaWdodERhdGUsXG4gICAgICAgIFwiZmxpZ2h0U2VjdG9yXCI6IGZsaWdodFNlY3RvcixcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcWRhdGE7XG4gIH1cblxuICBnZXREcmlsbERvd25VUkwoZHJpbERvd25UeXBlKSB7XG4gICAgdmFyIHVybFxuICAgIHN3aXRjaCAoZHJpbERvd25UeXBlKSB7XG4gICAgICBjYXNlICdmbGlnaHQtcHJvY2Vzcyc6XG4gICAgICAgIHVybCA9IFwiL3BheGZsbm9wci9mbGlnaHRwcm9jZXNzaW5nc3RhdHVzZHJpbGxcIjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdjb3Vwb24tY291bnQnOlxuICAgICAgICB1cmwgPSBcIi9wYXhmbG5vcHIvY291cG9uY291bnRieWV4cGRyaWxsXCI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZmxpZ2h0LWNvdW50JzpcbiAgICAgICAgdXJsID0gXCIvcGF4Zmxub3ByL2ZsaWdodGNvdW50YnlyZWFzb25kcmlsbFwiO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuICB0YWJTbGlkZUhhc0NoYW5nZWQoaW5kZXgpIHtcbiAgICB2YXIgZGF0YSA9IHRoaXMuZ3JvdXBzWzBdLmNvbXBsZXRlRGF0YVswXTtcbiAgICB0aGlzLmdyb3Vwc1swXS5pdGVtc1swXSA9IGRhdGFbaW5kZXhdLnZhbHVlcztcbiAgICB0aGlzLmdyb3Vwc1swXS5vcmdJdGVtc1swXSA9IGRhdGFbaW5kZXhdLnZhbHVlcztcbiAgICB0aGlzLnNvcnQoJycsIDAsIGZhbHNlKTtcbiAgICB0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5ID0gZGF0YVtpbmRleF0ua2V5O1xuICB9XG5cbiAgb3BlbkRyaWxsRG93bihkYXRhLCBzZWxGaW5kTGV2ZWwpIHtcbiAgICBzZWxGaW5kTGV2ZWwgPSBOdW1iZXIoc2VsRmluZExldmVsKTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbF0gPSBkYXRhO1xuICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWwgKyAxXSA9ICcnO1xuXG4gICAgaWYgKHNlbEZpbmRMZXZlbCAhPSAodGhpcy5ncm91cHMubGVuZ3RoIC0gMSkpIHtcbiAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xuICAgICAgdmFyIHJlcWRhdGEgPSB0aGlzLmRyaWxsRG93blJlcXVlc3QodGhpcy5kcmlsbFR5cGUsIHNlbEZpbmRMZXZlbCwgZGF0YSk7XG4gICAgICB2YXIgVVJMID0gdGhpcy5nZXREcmlsbERvd25VUkwodGhpcy5kcmlsbFR5cGUpO1xuICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG4gICAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXREcmlsbERvd24ocmVxZGF0YSwgVVJMKVxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgICAgdmFyIGRhdGEgPSBkYXRhLnJlc3BvbnNlO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgIHZhciBmaW5kTGV2ZWwgPSBkcmlsbExldmVsIC0gMTtcbiAgICAgICAgICBpZiAoZGF0YS5zdGF0dXMgPT0gJ3N1Y2Nlc3MnKSB7XG4gICAgICAgICAgICB2YXIgcmVzcFJlc3VsdDtcbiAgICAgICAgICAgIGlmIChkYXRhLmRhdGEucm93cykge1xuICAgICAgICAgICAgICByZXNwUmVzdWx0ID0gZGF0YS5kYXRhLnJvd3M7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXNwUmVzdWx0ID0gZGF0YS5kYXRhO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoKHRoYXQuZHJpbGxUeXBlID09ICdjb3Vwb24tY291bnQnIHx8IHRoYXQuZHJpbGxUeXBlID09ICdmbGlnaHQtY291bnQnKSAmJiBkYXRhLmRhdGEucm93cykge1xuICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLml0ZW1zWzBdID0gcmVzcFJlc3VsdFswXS52YWx1ZXM7XG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0ub3JnSXRlbXNbMF0gPSByZXNwUmVzdWx0WzBdLnZhbHVlcztcbiAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5jb21wbGV0ZURhdGFbMF0gPSByZXNwUmVzdWx0O1xuICAgICAgICAgICAgICB0aGF0LmV4Y2VwdGlvbkNhdGVnb3J5ID0gcmVzcFJlc3VsdFswXS5rZXk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLml0ZW1zWzBdID0gcmVzcFJlc3VsdDtcbiAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5vcmdJdGVtc1swXSA9IHJlc3BSZXN1bHQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoYXQuc2hvd25Hcm91cCA9IGZpbmRMZXZlbDtcbiAgICAgICAgICAgIHRoYXQuc29ydCgnJywgZmluZExldmVsLCBmYWxzZSk7XG4gICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZHJpbGxMZXZlbCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoYXQuc2hvd25Hcm91cCA9IGZpbmRMZXZlbDtcbiAgICAgICAgICAgIHRoYXQuY2xlYXJEcmlsbChmaW5kTGV2ZWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICB0aGF0LmNsb3Nlc1BvcG92ZXIoKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgYWxlcnQoJ1NlcnZlciBFcnJvcicpO1xuICAgICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBjbG9zZURyaWxsUG9wb3ZlcigpIHtcbiAgICB0aGlzLmRyaWxscG9wb3Zlci5oaWRlKCk7XG4gIH1cblxuICBjbGVhckRyaWxsKGxldmVsOiBudW1iZXIpIHtcbiAgICB2YXIgaTogbnVtYmVyO1xuICAgIGZvciAodmFyIGkgPSBsZXZlbDsgaSA8IHRoaXMuZHJpbGx0YWJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLmdyb3Vwc1tpXS5pdGVtcy5zcGxpY2UoMCwgMSk7XG4gICAgICB0aGlzLmdyb3Vwc1tpXS5vcmdJdGVtcy5zcGxpY2UoMCwgMSk7XG4gICAgICB0aGlzLnNvcnQoJycsIGksIGZhbHNlKTtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuc2VsZWN0ZWREcmlsbCk7XG4gICAgICB0aGlzLnNlbGVjdGVkRHJpbGxbaV0gPSAnJztcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuc2VsZWN0ZWREcmlsbCk7XG4gICAgfVxuICB9XG4gIGluaXRpYXRlQXJyYXkoZHJpbGx0YWJzKSB7XG4gICAgZm9yICh2YXIgaSBpbiBkcmlsbHRhYnMpIHtcbiAgICAgIHRoaXMuZ3JvdXBzW2ldID0ge1xuICAgICAgICBpZDogaSxcbiAgICAgICAgbmFtZTogdGhpcy5kcmlsbHRhYnNbaV0sXG4gICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgb3JnSXRlbXM6IFtdLFxuICAgICAgICBJdGVtc0J5UGFnZTogW10sXG4gICAgICAgIGNvbXBsZXRlRGF0YTogW10sXG4gICAgICAgIGZpcnN0Q29sdW1uczogdGhpcy5maXJzdENvbHVtbnNbaV1cbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgaXNEcmlsbFJvd1NlbGVjdGVkKGxldmVsLCBvYmopIHtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RlZERyaWxsW2xldmVsXSA9PSBvYmo7XG4gIH1cbiAgc2VhcmNoUmVzdWx0cyhsZXZlbCwgb2JqKSB7XG4gICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy5maWx0ZXJlZExpc3RTZXJ2aWNlLnNlYXJjaGVkKHRoaXMuZ3JvdXBzW2xldmVsXS5vcmdJdGVtc1swXSwgb2JqLnNlYXJjaFRleHQsIGxldmVsLCB0aGlzLmRyaWxsVHlwZSk7XG4gICAgaWYgKG9iai5zZWFyY2hUZXh0ID09ICcnKSB7XG4gICAgICB0aGlzLnJlc2V0QWxsKGxldmVsKTtcbiAgICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuZ3JvdXBzW2xldmVsXS5vcmdJdGVtc1swXTtcbiAgICB9XG4gICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSAwO1xuICAgIHRoaXMucGFnaW5hdGlvbihsZXZlbCk7XG4gIH1cbiAgcGFnaW5hdGlvbihsZXZlbCkge1xuICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5JdGVtc0J5UGFnZSA9IHRoaXMuZmlsdGVyZWRMaXN0U2VydmljZS5wYWdlZCh0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0sIHRoaXMucGFnZVNpemUpO1xuICB9O1xuICBzZXRQYWdlKGxldmVsLCBwYWdlbm8pIHtcbiAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IHBhZ2VubztcbiAgfTtcbiAgbGFzdFBhZ2UobGV2ZWwpIHtcbiAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IHRoaXMuZ3JvdXBzW2xldmVsXS5JdGVtc0J5UGFnZS5sZW5ndGggLSAxO1xuICB9O1xuICByZXNldEFsbChsZXZlbCkge1xuICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcbiAgfVxuICBzb3J0KHNvcnRCeSwgbGV2ZWwsIG9yZGVyKSB7XG4gICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XG4gICAgdGhpcy5jb2x1bW5Ub09yZGVyID0gc29ydEJ5OyBcbiAgICAvLyRGaWx0ZXIgLSBTdGFuZGFyZCBTZXJ2aWNlXG4gICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy4kZmlsdGVyKCdvcmRlckJ5JykodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLmNvbHVtblRvT3JkZXIsIG9yZGVyKTtcbiAgICB0aGlzLnBhZ2luYXRpb24obGV2ZWwpO1xuICB9O1xuICByYW5nZSh0b3RhbCwgbGV2ZWwpIHtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgdmFyIHN0YXJ0OiBudW1iZXI7XG4gICAgc3RhcnQgPSAwO1xuICAgIGlmKHRvdGFsID4gNSkge1xuICAgICAgc3RhcnQgPSBOdW1iZXIodGhpcy5jdXJyZW50UGFnZVtsZXZlbF0pIC0gMjtcbiAgICB9XG4gICAgaWYgKHN0YXJ0IDwgMCkge1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgICB2YXIgayA9IDE7XG4gICAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgdG90YWw7IGkrKykge1xuICAgICAgcmV0LnB1c2goaSk7XG4gICAgICBrKys7XG4gICAgICBpZiAoayA+IDYpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cbiAgdG9nZ2xlR3JvdXAoZ3JvdXApIHtcbiAgICBpZiAodGhpcy5pc0dyb3VwU2hvd24oZ3JvdXApKSB7XG4gICAgICB0aGlzLnNob3duR3JvdXAgPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3duR3JvdXAgPSBncm91cDtcbiAgICB9XG4gIH1cbiAgaXNHcm91cFNob3duKGdyb3VwOiBudW1iZXIpIHtcbiAgICByZXR1cm4gdGhpcy5zaG93bkdyb3VwID09IGdyb3VwO1xuICB9XG5cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG5cbmNsYXNzIExvZ2luQ29udHJvbGxlciB7XG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHNjb3BlJywgJyRzdGF0ZScsICdVc2VyU2VydmljZScsICckaW9uaWNIaXN0b3J5J107XG5cdHByaXZhdGUgaW52YWxpZE1lc3NhZ2U6IGJvb2xlYW4gPSBmYWxzZTtcblx0cHJpdmF0ZSB1c2VybmFtZTogc3RyaW5nO1xuXHRwcml2YXRlIHBhc3N3b3JkOiBzdHJpbmc7XG5cdHByaXZhdGUgaXBhZGRyZXNzOiBzdHJpbmc7XG5cdHByaXZhdGUgZXJvb3JtZXNzYWdlOiBzdHJpbmc7XG5cblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSwgcHJpdmF0ZSAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSxcblx0cHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UsIHByaXZhdGUgJGlvbmljSGlzdG9yeTogYW55KSB7XG5cdFx0aWYgKHRoaXMudXNlclNlcnZpY2UuaXNMb2dnZWRJbigpKSB7XG5cdFx0XHQkaW9uaWNIaXN0b3J5Lm5leHRWaWV3T3B0aW9ucyh7XG5cdFx0XHRcdGRpc2FibGVCYWNrOiB0cnVlXG5cdFx0XHR9KTtcblx0XHRcdGNvbnNvbGUubG9nKCduYXZnYXRpbmcgdG8gbWlzLWZsb3duLi4nKTtcblx0XHRcdHRoaXMuJHN0YXRlLmdvKCdhcHAubWlzLWZsb3duJyk7XG5cdFx0fVxuXHR9XG5cblx0Y2xlYXJFcnJvcigpIHtcblx0XHR0aGlzLmludmFsaWRNZXNzYWdlID0gZmFsc2U7XG5cdH1cblxuXHRkb0xvZ2luKGxvZ2luRm9ybTogYm9vbGVhbikge1xuXHRcdGlmICghbG9naW5Gb3JtKSB7XG5cdFx0XHRpZiAoIWFuZ3VsYXIuaXNEZWZpbmVkKHRoaXMudXNlcm5hbWUpIHx8ICFhbmd1bGFyLmlzRGVmaW5lZCh0aGlzLnBhc3N3b3JkKSB8fCAhYW5ndWxhci5pc0RlZmluZWQodGhpcy5pcGFkZHJlc3MpIHx8dGhpcy51c2VybmFtZS50cmltKCkgPT0gXCJcIiB8fCB0aGlzLnBhc3N3b3JkLnRyaW0oKSA9PSBcIlwiIHx8IHRoaXMuaXBhZGRyZXNzLnRyaW0oKSA9PSBcIlwiKSB7XG5cdFx0XHRcdHRoaXMuaW52YWxpZE1lc3NhZ2UgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0U0VSVkVSX1VSTCA9ICdodHRwOi8vJyArIHRoaXMuaXBhZGRyZXNzICsgJy8nICsgJ3JhcGlkLXdzL3NlcnZpY2VzL3Jlc3QnO1xuXHRcdFx0dGhpcy51c2VyU2VydmljZS5sb2dpbih0aGlzLnVzZXJuYW1lLHRoaXMucGFzc3dvcmQpLnRoZW4oXG5cdFx0XHRcdChyZXN1bHQpID0+IHtcblx0XHRcdFx0XHRpZiAocmVzdWx0LnJlc3BvbnNlLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1x0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0dmFyIHJlcSA9IHtcblx0XHRcdFx0XHRcdFx0dXNlcklkOiB0aGlzLnVzZXJuYW1lXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR0aGlzLnVzZXJTZXJ2aWNlLmdldFVzZXJQcm9maWxlKHJlcSkudGhlbihcblx0XHRcdFx0XHRcdFx0KHByb2ZpbGUpID0+IHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgdXNlck5hbWUgPSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR1c2VybmFtZTogcHJvZmlsZS5yZXNwb25zZS5kYXRhLnVzZXJJbmZvLnVzZXJOYW1lXG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudXNlclNlcnZpY2Uuc2V0VXNlcih1c2VyTmFtZSk7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy4kaW9uaWNIaXN0b3J5Lm5leHRWaWV3T3B0aW9ucyh7XG5cdFx0XHRcdFx0XHRcdFx0XHRkaXNhYmxlQmFjazogdHJ1ZVxuXHRcdFx0XHRcdFx0XHRcdH0pOyBcblx0XHRcdFx0XHRcdFx0XHR0aGlzLiRzdGF0ZS5nbyhcImFwcC5taXMtZmxvd25cIik7XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkIG9uIGxvYWRpbmcgdXNlciBwcm9maWxlJyk7XG5cdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0aGlzLmludmFsaWRNZXNzYWdlID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHRoaXMuZXJvb3JtZXNzYWdlID0gXCJQbGVhc2UgY2hlY2sgeW91ciBjcmVkZW50aWFsc1wiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy5pbnZhbGlkTWVzc2FnZSA9IHRydWU7XG5cdFx0XHRcdFx0dGhpcy5lcm9vcm1lc3NhZ2UgPSBcIlBsZWFzZSBjaGVjayB5b3VyIG5ldHdvcmsgY29ubmVjdGlvblwiO1xuXHRcdFx0XHR9KTtcblx0XHR9IFxuXHR9XG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cblxuY2xhc3MgQ2hhcnRFdmVudCBpbXBsZW1lbnRzIG5nLklEaXJlY3RpdmUge1xuXHRyZXN0cmljdCA9ICdFJztcblx0c2NvcGUgPSB7XG5cdFx0dHlwZTogXCI9XCJcblx0fTtcblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLCBwcml2YXRlICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlKSB7XG5cdH07XG5cblx0bGluayA9ICgkc2NvcGU6IG5nLklTY29wZSwgaUVsZW1lbnQ6IEpRdWVyeSwgYXR0cmlidXRlczogbmcuSUF0dHJpYnV0ZXMsICRzY2U6IG5nLklTQ0VTZXJ2aWNlKTogdm9pZCA9PiB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBudmQzXG5cdFx0aWYoYXR0cmlidXRlcy50eXBlID09ICdtZXRyaWMnIHx8IGF0dHJpYnV0ZXMudHlwZSA9PSAndGFyZ2V0JyB8fCBhdHRyaWJ1dGVzLnR5cGUgPT0gJ3Bhc3Nlbmdlci1jb3VudCcpe1xuXHRcdFx0bnZkMyA9IGlFbGVtZW50LmZpbmQoJ252ZDMnKVswXTtcblx0XHR9XG5cdFx0aWYoYXR0cmlidXRlcy50eXBlID09ICdmbGlnaHQtcHJvY2VzcycgfHwgYXR0cmlidXRlcy50eXBlID09ICdmbGlnaHQtY291bnQnIHx8IGF0dHJpYnV0ZXMudHlwZSA9PSAnY291cG9uLWNvdW50Jyl7XG5cdFx0XHRudmQzID0gaUVsZW1lbnQuZmluZCgnbnZkMy1tdWx0aS1iYXItY2hhcnQnKVswXTtcblx0XHR9XG5cdFx0XG5cdFx0dmFyIHNlbGVjdGVkRWxlbSA9IGFuZ3VsYXIuZWxlbWVudChudmQzKTtcblxuXHRcdFxuXHRcdFx0XHRcdFxuXG5cdFx0c2VsZi4kdGltZW91dChcblx0XHRcdCgpID0+IHtcblx0XHRcdFx0c2VsZWN0ZWRFbGVtLnJlYWR5KGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHR2YXIgZmlyc3Q6IG51bWJlcjtcblx0XHRcdFx0XHRzZWxlY3RlZEVsZW0ub24oJ21vdXNlb3ZlciB0b3VjaGVuZCcsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRcdFx0XHRpZighZmlyc3Qpe1xuXHRcdFx0XHRcdFx0XHRzZWxmLmFwcGVuZENsaWNrKHNlbGVjdGVkRWxlbSwgYXR0cmlidXRlcywgc2VsZik7XG5cdFx0XHRcdFx0XHRcdGZpcnN0ID0gMTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHQvKlxuXHRcdFx0XHRcdCRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7IHJldHVybiBzZWxlY3RlZEVsZW0uaHRtbCgpO1x0IH0sIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuXHRcdFx0XHRcdFx0aWYgKG5ld1ZhbHVlKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2cobmV3VmFsdWUpO1xuXHRcdFx0XHRcdFx0XHRzZWxmLmFwcGVuZENsaWNrKHNlbGVjdGVkRWxlbSwgYXR0cmlidXRlcywgc2VsZik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSwgdHJ1ZSk7Ki9cblx0XHRcdFx0XHRzZWxmLmFwcGVuZENsaWNrKHNlbGVjdGVkRWxlbSwgYXR0cmlidXRlcywgc2VsZik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdDEwKTtcblx0fVxuXG5cdHN0YXRpYyBmYWN0b3J5KCk6IG5nLklEaXJlY3RpdmVGYWN0b3J5IHtcblx0XHR2YXIgZGlyZWN0aXZlID0gKCR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlKSA9PiBuZXcgQ2hhcnRFdmVudCgkdGltZW91dCwgJHJvb3RTY29wZSlcblx0XHRkaXJlY3RpdmUuJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJHJvb3RTY29wZSddO1xuXHRcdHJldHVybiBkaXJlY3RpdmU7XG5cdH1cblxuXHRhcHBlbmRDbGljayhzZWxlY3RlZEVsZW0sIGF0dHJpYnV0ZXMsIHNlbGYpIHtcblx0XHR2YXIgZGJsQ2xpY2tJbnRlcnZhbCA9IDMwMDtcblx0XHR2YXIgZmlyc3RDbGlja1RpbWU7XG5cdFx0dmFyIHdhaXRpbmdTZWNvbmRDbGljayA9IGZhbHNlO1xuXHRcdHZhciBjaGlsZEVsZW06IGFueSA9IHNlbGVjdGVkRWxlbS5maW5kKCdyZWN0Jyk7XG5cdFx0YW5ndWxhci5mb3JFYWNoKGNoaWxkRWxlbSwgZnVuY3Rpb24oZWxlbSwga2V5KSB7XG5cdFx0XHRpZiAoZWxlbS50YWdOYW1lID09ICdyZWN0Jykge1xuXHRcdFx0XHR2YXIgcmVjdEVsZW0gPSBhbmd1bGFyLmVsZW1lbnQoZWxlbSk7XG5cdFx0XHRcdHJlY3RFbGVtLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRcdFx0aWYgKCF3YWl0aW5nU2Vjb25kQ2xpY2spIHtcblx0XHRcdFx0XHRcdC8vIFNpbmdsZSBjbGxpY2tcblx0XHRcdFx0XHRcdGZpcnN0Q2xpY2tUaW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcblx0XHRcdFx0XHRcdHdhaXRpbmdTZWNvbmRDbGljayA9IHRydWU7XG5cdFx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0d2FpdGluZ1NlY29uZENsaWNrID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHdhaXRpbmdTZWNvbmRDbGljayk7XG5cdFx0XHRcdFx0XHR9LCBkYmxDbGlja0ludGVydmFsKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBEb3VibGUgY2xsaWNrXG5cdFx0XHRcdFx0XHR3YWl0aW5nU2Vjb25kQ2xpY2sgPSBmYWxzZTtcblx0XHRcdFx0XHRcdHZhciB0aW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcblx0XHRcdFx0XHRcdGlmICh0aW1lIC0gZmlyc3RDbGlja1RpbWUgPCBkYmxDbGlja0ludGVydmFsKSB7XG5cdFx0XHRcdFx0XHRcdHZhciB0eXBlID0gYXR0cmlidXRlcy50eXBlO1xuXHRcdFx0XHRcdFx0XHRpZihhdHRyaWJ1dGVzLnR5cGUgPT0gJ21ldHJpYycgfHwgYXR0cmlidXRlcy50eXBlID09ICd0YXJnZXQnIHx8IGF0dHJpYnV0ZXMudHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jyl7XG5cdFx0XHRcdFx0XHRcdFx0c2VsZi4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ29wZW5EcmlsbFBvcHVwJywge1wiZGF0YVwiIDogcmVjdEVsZW1bMF1bJ19fZGF0YV9fJ10sIFwidHlwZVwiOiB0eXBlLCBcImV2ZW50XCI6IGV2ZW50fSk7IFxuXHRcdFx0XHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhyZWN0RWxlbSk7XG5cdFx0XHRcdFx0XHRcdFx0c2VsZi4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ29wZW5EcmlsbFBvcHVwMScsIHtcImRhdGFcIiA6IHJlY3RFbGVtWzBdWydfX2RhdGFfXyddLCBcInR5cGVcIjogdHlwZSwgXCJldmVudFwiOiBldmVudH0pOyBcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcblx0XHRcdH1cblx0XHR9KTsgXG5cdH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL19saWJzLnRzXCIgLz5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL2FwcC9BcHBDb250cm9sbGVyLnRzXCIgLz5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL3NlcnZpY2VzL0NvcmRvdmFTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9Mb2NhbFN0b3JhZ2VTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9TZXNzaW9uU2VydmljZS50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9FcnJvckhhbmRsZXJTZXJ2aWNlLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvTWlzU2VydmljZS50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbXBvbmVudHMvbWlzL3NlcnZpY2VzL0NoYXJ0b3B0aW9uU2VydmljZS50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbXBvbmVudHMvbWlzL3NlcnZpY2VzL0ZpbHRlcmVkTGlzdFNlcnZpY2UudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL29wZXJhdGlvbmFsL3NlcnZpY2VzL09wZXJhdGlvbmFsU2VydmljZS50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbXBvbmVudHMvdXNlci9zZXJ2aWNlcy9Vc2VyU2VydmljZS50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbXBvbmVudHMvbWlzL01pc0NvbnRyb2xsZXIudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL09wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy91c2VyL0xvZ2luQ29udHJvbGxlci50c1wiLz5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL2NoYXJ0LWV2ZW50L0NoYXJ0RXZlbnQudHNcIiAvPlxuXG52YXIgU0VSVkVSX1VSTCA9ICdodHRwOi8vMTAuOTEuMTUyLjk5OjgwODIvcmFwaWQtd3Mvc2VydmljZXMvcmVzdCc7XG5hbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnLCBbJ2lvbmljJywgJ3JhcGlkTW9iaWxlLmNvbmZpZycsICd0YWJTbGlkZUJveCcsICdudmQzQ2hhcnREaXJlY3RpdmVzJywgJ252ZDMnXSlcblxuXHQucnVuKCgkaW9uaWNQbGF0Zm9ybTogSW9uaWMuSVBsYXRmb3JtLCAkaHR0cDogbmcuSUh0dHBTZXJ2aWNlKSA9PiB7XG5cdFx0JGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb24udG9rZW4gPSAndG9rZW4nO1xuICBcdFx0JGh0dHAuZGVmYXVsdHMuaGVhZGVycy5wb3N0W1wiQ29udGVudC1UeXBlXCJdID0gXCJhcHBsaWNhdGlvbi9qc29uXCI7XG5cdFx0JGlvbmljUGxhdGZvcm0ucmVhZHkoKCkgPT4ge1xuXHRcdFx0aWYgKHR5cGVvZiBuYXZpZ2F0b3IuZ2xvYmFsaXphdGlvbiAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdH1cblx0XHR9KVxuXHR9KVxuLmNvbmZpZygoJHN0YXRlUHJvdmlkZXI6IGFuZ3VsYXIudWkuSVN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlcjogYW5ndWxhci51aS5JVXJsUm91dGVyUHJvdmlkZXIsXG5cdCRpb25pY0NvbmZpZ1Byb3ZpZGVyOiBJb25pYy5JQ29uZmlnUHJvdmlkZXIpID0+IHtcblx0JGlvbmljQ29uZmlnUHJvdmlkZXIudmlld3Muc3dpcGVCYWNrRW5hYmxlZChmYWxzZSk7XG5cblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2FwcCcsIHtcblx0XHR1cmw6ICcvYXBwJyxcblx0XHRhYnN0cmFjdDogdHJ1ZSxcblx0XHR0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdGVtcGxhdGVzL21lbnUuaHRtbCcsXG5cdFx0Y29udHJvbGxlcjogJ0FwcENvbnRyb2xsZXIgYXMgYXBwQ3RybCdcblx0fSlcblx0LnN0YXRlKCdsb2dpbicsIHtcblx0XHRjYWNoZTogZmFsc2UsXG5cdFx0dXJsOiAnL2xvZ2luJyxcblx0XHR0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdXNlci9sb2dpbi5odG1sJyxcblx0XHRjb250cm9sbGVyOiAnTG9naW5Db250cm9sbGVyIGFzIExvZ2luQ3RybCdcblx0fSlcblx0LnN0YXRlKCdhcHAubWlzLWZsb3duJywge1xuXHRcdGNhY2hlOiBmYWxzZSxcblx0XHR1cmw6ICcvbWlzL2Zsb3duJyxcblx0XHR2aWV3czoge1xuXHRcdFx0J21lbnVDb250ZW50Jzoge1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvbWlzL2Zsb3duLmh0bWwnLFxuXHRcdFx0XHRjb250cm9sbGVyOiAnTWlzQ29udHJvbGxlciBhcyBNaXNDdHJsJ1xuXHRcdFx0fVxuXHRcdH1cblx0fSlcblx0LnN0YXRlKCdhcHAub3BlcmF0aW9uYWwtZmxvd24nLCB7XG5cdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdHVybDogJy9vcGVyYXRpb25hbC9mbG93bicsXG5cdFx0dmlld3M6IHtcblx0XHRcdCdtZW51Q29udGVudCc6IHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL2Zsb3duLmh0bWwnLFxuXHRcdFx0XHRjb250cm9sbGVyOiAnT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIgYXMgT3ByQ3RybCdcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xuXG5cdCR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy9sb2dpbicpO1xufSlcblxuLnNlcnZpY2UoJ0RhdGFQcm92aWRlclNlcnZpY2UnLCBEYXRhUHJvdmlkZXJTZXJ2aWNlKVxuLnNlcnZpY2UoJ05ldFNlcnZpY2UnLCBOZXRTZXJ2aWNlKVxuLnNlcnZpY2UoJ0Vycm9ySGFuZGxlclNlcnZpY2UnLCBFcnJvckhhbmRsZXJTZXJ2aWNlKVxuLnNlcnZpY2UoJ1Nlc3Npb25TZXJ2aWNlJywgU2Vzc2lvblNlcnZpY2UpXG4uc2VydmljZSgnQ29yZG92YVNlcnZpY2UnLCBDb3Jkb3ZhU2VydmljZSlcbi5zZXJ2aWNlKCdMb2NhbFN0b3JhZ2VTZXJ2aWNlJywgTG9jYWxTdG9yYWdlU2VydmljZSlcbi5zZXJ2aWNlKCdVc2VyU2VydmljZScsIFVzZXJTZXJ2aWNlKVxuXG4uc2VydmljZSgnTWlzU2VydmljZScsIE1pc1NlcnZpY2UpXG4uc2VydmljZSgnT3BlcmF0aW9uYWxTZXJ2aWNlJywgT3BlcmF0aW9uYWxTZXJ2aWNlKVxuLnNlcnZpY2UoJ0ZpbHRlcmVkTGlzdFNlcnZpY2UnLCBGaWx0ZXJlZExpc3RTZXJ2aWNlKVxuLnNlcnZpY2UoJ0NoYXJ0b3B0aW9uU2VydmljZScsIENoYXJ0b3B0aW9uU2VydmljZSlcblxuLmNvbnRyb2xsZXIoJ0FwcENvbnRyb2xsZXInLCBBcHBDb250cm9sbGVyKVxuLmNvbnRyb2xsZXIoJ01pc0NvbnRyb2xsZXInLCBNaXNDb250cm9sbGVyKVxuLmNvbnRyb2xsZXIoJ09wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyJywgT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIpXG4uY29udHJvbGxlcignTG9naW5Db250cm9sbGVyJywgTG9naW5Db250cm9sbGVyKVxuXG4uZGlyZWN0aXZlKCdjaGFydGV2ZW50JywgQ2hhcnRFdmVudC5mYWN0b3J5KCkpXG4vLyAuZGlyZWN0aXZlKCdmZXRjaExpc3QnLCBGZXRjaExpc3QuZmFjdG9yeSgpKVxuXG5cbmlvbmljLlBsYXRmb3JtLnJlYWR5KCgpID0+IHtcblx0aWYgKHdpbmRvdy5jb3Jkb3ZhICYmIHdpbmRvdy5jb3Jkb3ZhLnBsdWdpbnMuS2V5Ym9hcmQpIHtcblx0fVxuXHQvLyBTdGF0dXNCYXIub3ZlcmxheXNXZWJWaWV3KGZhbHNlKTtcbiAvLyAgICBTdGF0dXNCYXIuYmFja2dyb3VuZENvbG9yQnlIZXhTdHJpbmcoJyMyMDlkYzInKTtcbiAvLyAgICBTdGF0dXNCYXIuc3R5bGVMaWdodENvbnRlbnQoKTtcblx0Xy5kZWZlcigoKSA9PiB7XG5cdFx0Ly8gYW5ndWxhci5ib290c3RyYXAoZG9jdW1lbnQsIFsncmFwaWRNb2JpbGUnXSk7XG5cdH0pO1xufSk7XG4iLG51bGwsIihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcbiAgLmRpcmVjdGl2ZSgnaGVQcm9ncmVzc0JhcicsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZGlyZWN0aXZlRGVmaW5pdGlvbk9iamVjdCA9IHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiBmYWxzZSxcbiAgICAgIHNjb3BlOiB7ZGF0YTogJz1jaGFydERhdGEnLCBzaG93dG9vbHRpcDogJ0BzaG93VG9vbHRpcCd9LFxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICB2YXIgeCA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgICAgICAgICAgICAuZG9tYWluKFswLCBkMy5tYXgoc2NvcGUuZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gK2QucHJvZ3Jlc3MgfSldKVxuICAgICAgICAgICAgICAgICAgLnJhbmdlKFswLCA5MF0pO1xuXG4gICAgICAgIHZhciBzZWdtZW50ID0gZDMuc2VsZWN0KGVsZW1lbnRbMF0pXG4gICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKFwiLmhvcml6b250YWwtYmFyLWdyYXBoLXNlZ21lbnRcIilcbiAgICAgICAgICAgICAgICAgICAgIC5kYXRhKHNjb3BlLmRhdGEpXG4gICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKVxuICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC1zZWdtZW50XCIsIHRydWUpO1xuXG4gICAgICAgIHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC1sYWJlbFwiLCB0cnVlKVxuICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5uYW1lIH0pO1xuXG4gICAgICAgIHZhciBiYXJTZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXZhbHVlXCIsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXZhbHVlLXNjYWxlXCIsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXZhbHVlLWJhclwiLCB0cnVlKTtcblxuICAgICAgICBiYXJTZWdtZW50XG4gICAgICAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuY29sb3IgfSkgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAgICAgICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4geCgrZC5wcm9ncmVzcykgKyBcIiVcIiB9KTtcblxuICAgICAgICB2YXIgYm94U2VnbWVudCA9IGJhclNlZ21lbnQuYXBwZW5kKFwic3BhblwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtdmFsdWUtYm94XCIsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQucHJvZ3Jlc3MgPyBkLnByb2dyZXNzIDogXCJcIiB9KTtcbiAgICAgICAgaWYoc2NvcGUuc2hvd3Rvb2x0aXAgIT09ICd0cnVlJykgcmV0dXJuOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB2YXIgYnRuU2VnbWVudCA9IHNlZ21lbnQuYXBwZW5kKFwiYnV0dG9uXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtaWNvbiBpY29uIGlvbi1jaGV2cm9uLWRvd24gbm8tYm9yZGVyIHNlY3RvckN1c3RvbUNsYXNzXCIsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwiaGlkZVwiLCBmdW5jdGlvbihkKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihkKSByZXR1cm4gZC5kcmlsbEZsYWcgPT0gJ04nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTsgICAgICAgICAgICBcbiAgICAgICAgdmFyIHRvb2x0aXBTZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJkaXZcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwidG9vbHRpcFwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoJ2hpZGUnLCB0cnVlKTtcbiAgICAgICAgdG9vbHRpcFNlZ21lbnQuYXBwZW5kKFwicFwiKS50ZXh0KGZ1bmN0aW9uKGQpeyByZXR1cm4gZC5uYW1lOyB9KTtcbiAgICAgICAgdmFyIHRhYmxlID0gdG9vbHRpcFNlZ21lbnQuYXBwZW5kKFwidGFibGVcIik7XG4gICAgICAgIHZhciB0aGVhZCA9IHRhYmxlLmFwcGVuZCgndHInKTtcbiAgICAgICAgdGhlYWQuYXBwZW5kKCd0aCcpLnRleHQoJ1NlY3RvcicpO1xuICAgICAgICB0aGVhZC5hcHBlbmQoJ3RoJykudGV4dCgnUmV2ZW51ZScpO1xuXG4gICAgICAgIHZhciB0ciAgPSB0YWJsZVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKCd0Ym9keScpXG4gICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoXCJ0clwiKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YShmdW5jdGlvbihkKXtyZXR1cm4gZC5zY0FuYWx5c2lzRHJpbGxzfSlcbiAgICAgICAgICAgICAgICAgICAgLmVudGVyKCkuYXBwZW5kKFwidHJcIik7XG5cbiAgICAgICAgdmFyIHNlY3RvclRkID0gdHIuYXBwZW5kKFwidGRcIilcbiAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc2VjdG9yIH0pO1xuXG4gICAgICAgIHZhciByZXZlbnVlVGQgPSB0ci5hcHBlbmQoXCJ0ZFwiKVxuICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5yZXZlbnVlIH0pO1xuXG4gICAgICAgIGJ0blNlZ21lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKXsgICAgICAgICAgICAgIFxuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRvb2x0aXBTZWdtZW50KTtcblx0XHQgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5yZW1vdmVDbGFzcygnc2VjdG9yQ3VzdG9tQ2xhc3MnKTtcblx0XHQgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlY3RvckN1c3RvbUNsYXNzXCIpKS5yZW1vdmVDbGFzcygnaW9uLWNoZXZyb24tdXAnKTtcblx0XHQgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlY3RvckN1c3RvbUNsYXNzXCIpKS5hZGRDbGFzcygnaW9uLWNoZXZyb24tZG93bicpO1xuXHRcdCAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc2VjdG9yQ3VzdG9tQ2xhc3NcIikpLm5leHQoKS5yZW1vdmVDbGFzcygnc2hvdycpO1xuXHRcdCAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc2VjdG9yQ3VzdG9tQ2xhc3NcIikpLm5leHQoKS5hZGRDbGFzcygnaGlkZScpO1xuXHRcdCAgXG4gICAgICAgICAgaWYoYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5oYXNDbGFzcygnc2hvdycpKSB7XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykucmVtb3ZlQ2xhc3MoJ2lvbi1jaGV2cm9uLXVwJyk7XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykuYWRkQ2xhc3MoJ2lvbi1jaGV2cm9uLWRvd24nKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkucmVtb3ZlQ2xhc3MoJ3Nob3cnKTsgICAgICAgICAgICBcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkuYWRkQ2xhc3MoJ2hpZGUnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLnJlbW92ZUNsYXNzKCdpb24tY2hldnJvbi1kb3duJyk7XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykuYWRkQ2xhc3MoJ2lvbi1jaGV2cm9uLXVwJyk7XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLnJlbW92ZUNsYXNzKCdoaWRlJyk7XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLmFkZENsYXNzKCdzaG93Jyk7XG4gICAgICAgICAgfVxuXHRcdCAgYW5ndWxhci5lbGVtZW50KHRoaXMpLmFkZENsYXNzKCdzZWN0b3JDdXN0b21DbGFzcycpO1xuXHRcdCAgXG5cdFx0ICBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gZGlyZWN0aXZlRGVmaW5pdGlvbk9iamVjdDtcbiAgfSk7XG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcbiAgLmRpcmVjdGl2ZSgnaGVSZXZlbnVlUHJvZ3Jlc3NCYXInLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJldkJhck9iamVjdCA9IHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiBmYWxzZSxcbiAgICAgIHNjb3BlOiB7ZGF0YTogJz1jaGFydERhdGEnfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coc2NvcGUuZGF0YSk7XG4gICAgICAgIHNjb3BlLiR3YXRjaCgnZGF0YScsIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ25ld1ZhbHVlJywgbmV3VmFsdWUpO1xuICAgICAgICAgICAgdmFyIHggPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgICAgICAgICAgICAgIC5kb21haW4oWzAsIGQzLm1heChzY29wZS5kYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlIH0pXSlcbiAgICAgICAgICAgICAgICAgICAgICAucmFuZ2UoWzAsIDkwXSk7XG5cbiAgICAgICAgICAgIHZhciBzZWdtZW50ID0gZDMuc2VsZWN0KGVsZW1lbnRbMF0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbChcIi5uZXQtcmV2LWJhci1ncmFwaC1zZWdtZW50XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmRhdGEoc2NvcGUuZGF0YSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXNlZ21lbnRcIiwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC1sYWJlbFwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQubmFtZSB9KTtcblxuICAgICAgICAgICAgdmFyIGJhclNlZ21lbnQgPSBzZWdtZW50LmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtdmFsdWVcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlLXNjYWxlXCIsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC12YWx1ZS1iYXJcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtdmFsdWUtYm94XCIsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlOyB9KTtcblxuICAgICAgICAgICAgYmFyU2VnbWVudCAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuY29sb3IgfSkgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgICAgICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLnZhbHVlKSArIFwiJVwiIH0pOyAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgfSAgICAgICAgICAgICAgIFxuICAgICAgICB9LCB0cnVlKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiByZXZCYXJPYmplY3Q7XG4gIH0pO1xufSkoKTsiLCJcbihmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgLy8gYXR0YWNoIHRoZSBmYWN0b3JpZXMgYW5kIHNlcnZpY2UgdG8gdGhlIFtzdGFydGVyLnNlcnZpY2VzXSBtb2R1bGUgaW4gYW5ndWxhclxuICAgIGFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScpXG4gICAgICAgIC5zZXJ2aWNlKCdSZXBvcnRCdWlsZGVyU3ZjJywgcmVwb3J0QnVpbGRlclNlcnZpY2UpO1xuICAgIFxuXHRmdW5jdGlvbiByZXBvcnRCdWlsZGVyU2VydmljZSgpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgc2VsZi5nZW5lcmF0ZVJlcG9ydCA9IF9nZW5lcmF0ZVJlcG9ydDsgICAgICAgICAgICBcbiAgICAgICAgZnVuY3Rpb24gX2dlbmVyYXRlUmVwb3J0KHBhcmFtLCBjaGFydFRpdGxlLGZsb3duTW9udGgpIHtcblx0XHRcdHZhciB0aXRsZSA9IFwiXCI7XG5cdFx0XHRpZihwYXJhbSA9PSBcIm1ldHJpY1NuYXBzaG90XCIpXG5cdFx0XHRcdHRpdGxlID0gXCJNRVRSSUMgU05BUFNIT1QgLVwiK2Zsb3duTW9udGgrXCIgXCIrY2hhcnRUaXRsZS50b1VwcGVyQ2FzZSgpK1wiLSBWSUVXXCI7XG5cdFx0XHRlbHNlIGlmKHBhcmFtID09IFwidGFyZ2V0QWN0dWFsXCIpXG5cdFx0XHRcdHRpdGxlID0gXCJUQVJHRVQgVlMgQUNUVUFMIC0gXCIrKChjaGFydFRpdGxlID09IFwicmV2ZW51ZVwiKT9cIk5FVCBSRVZFTlVFXCI6XCJQQVggQ291bnRcIikrXCIgXCIrZmxvd25Nb250aCsgXCIgLSBWSUVXXCI7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHRpdGxlID0gY2hhcnRUaXRsZStcIiBcIitmbG93bk1vbnRoK1wiIC0gVklFV1wiO1xuXHRcdFx0XHRcdFx0XHRcblx0XHRcdHZhciBzdmdOb2RlID0gZDMuc2VsZWN0QWxsKFwiLlwiK3BhcmFtKS5zZWxlY3RBbGwoXCJzdmdcIik7XG5cdFx0XHR2YXIgY29udGVudCA9IFtdO1xuXHRcdFx0dmFyIGltYWdlQ29sdW1uID0gW107XG5cdFx0XHR2YXIgdGV4dENvbHVtbiA9IFtdO1xuXHRcdFx0dmFyIGltYWdlc09iaiA9IHt9O1xuXHRcdFx0dmFyIHRleHRPYmogPSB7fTtcblx0XHRcdGNvbnRlbnQucHVzaCh0aXRsZSk7XG5cdFx0XHR2YXIgbm9kZUV4aXN0cyA9IFtdO1xuXHRcdFx0YW5ndWxhci5mb3JFYWNoKHN2Z05vZGUsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcdFx0XHRcdFxuXHRcdFx0XHQvL3RleHRPYmpbJ2FsaWdubWVudCddID0gJ2NlbnRlcidcdFx0XHRcdFxuXHRcdFx0XHRcblx0XHRcdFx0dmFyIGh0bWwgPSBcIlwiO1xuXHRcdFx0XHRpZihub2RlRXhpc3RzLmluZGV4T2Yoc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLWZsYWdcIikpID09IC0xICYmIHN2Z05vZGVba2V5XS5sZW5ndGggPj0gMSl7XG5cdFx0XHRcdFxuXHRcdFx0XHRcdGh0bWwgPSBzdmdOb2RlW2tleV1bMF0ub3V0ZXJIVE1MO1xuXHRcdFx0XHRcdGlmKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1wZGZGbGFnXCIpID09PSBcImR5bmFtaWNXSFwiKXtcblx0XHRcdFx0XHRcdGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpLmF0dHIoXCJ3aWR0aFwiLDE1MDApO1xuXHRcdFx0XHRcdFx0ZDMuc2VsZWN0KFwiLlwiK3BhcmFtK1wiRmxhZ1wiKS5zZWxlY3QoXCJzdmdcIikuYXR0cihcImhlaWdodFwiLDYwMCk7XG5cdFx0XHRcdFx0XHR2YXIgbm9kZSA9IGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpO1xuXHRcdFx0XHRcdFx0aHRtbCA9IG5vZGVbMF1bMF0ub3V0ZXJIVE1MO1xuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWyd3aWR0aCddID0gNTAwO1xuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWydoZWlnaHQnXSA9IDUwMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYoc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLXBkZkZsYWdcIikgPT09IFwicGRmRmxhZ1wiKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDc1MDtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnaGVpZ2h0J10gPSAzMDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhbnZnKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKSwgaHRtbCk7XG5cdFx0XHRcdFx0dmFyIHRlc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XG5cdFx0XHRcdFx0dmFyIGltZ3NyYyA9IHRlc3QudG9EYXRhVVJMKCk7XG5cdFx0XHRcdFx0dmFyICB0ZXh0ID0gXCJcXG5cIitzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tdGl0bGVcIikrXCJcXG5cIjtcblx0XHRcdFx0XHR0ZXh0T2JqWyd0ZXh0J10gPSB0ZXh0O1xuXHRcdFx0XHRcdHRleHRDb2x1bW4ucHVzaCh0ZXh0T2JqKTtcblx0XHRcdFx0XHRpbWFnZXNPYmpbJ2ltYWdlJ10gPSBpbWdzcmM7XG5cdFx0XHRcdFx0aW1hZ2VDb2x1bW4ucHVzaChpbWFnZXNPYmopO1x0XHRcdFx0XG5cdFx0XHRcdFx0dmFyIGltZ1RlbXAgPXt9LCB0eHRUZW1wID17fTtcdFx0XG5cdFx0XHRcdFx0dHh0VGVtcFsnY29sdW1ucyddID0gdGV4dENvbHVtbjtcblx0XHRcdFx0XHRpbWdUZW1wWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInO1xuXHRcdFx0XHRcdGltZ1RlbXBbJ2NvbHVtbnMnXSA9IGltYWdlQ29sdW1uO1xuXHRcdFx0XHRcdGNvbnRlbnQucHVzaCh0eHRUZW1wKTtcblx0XHRcdFx0XHRjb250ZW50LnB1c2goaW1nVGVtcCk7XHRcdFx0XHRcdFxuXHRcdFx0XHRcdGltYWdlQ29sdW1uID0gW107XG5cdFx0XHRcdFx0dGV4dENvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdGltYWdlc09iaiA9IHt9O1xuXHRcdFx0XHRcdHRleHRPYmogPSB7fTtcblx0XHRcdFx0XHRpbWdUZW1wID0ge307XG5cdFx0XHRcdFx0dHh0VGVtcCA9e307XG5cdFx0XHRcdFx0bm9kZUV4aXN0cy5wdXNoKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1mbGFnXCIpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGNvbnRlbnQ6IGNvbnRlbnQsXG5cdFx0XHRcdHN0eWxlczoge1xuXHRcdFx0XHRcdGhlYWRlcjoge1xuXHRcdFx0XHRcdFx0Zm9udFNpemU6IDE4LFxuXHRcdFx0XHRcdFx0Ym9sZDogdHJ1ZVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0YmlnZ2VyOiB7XG5cdFx0XHRcdFx0XHRmb250U2l6ZTogMTUsXG5cdFx0XHRcdFx0XHRpdGFsaWNzOiB0cnVlLFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0ZGVmYXVsdFN0eWxlOiB7XG5cdFx0XHRcdFx0Y29sdW1uR2FwOiAyMCxcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHR9O1xuICAgIH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICAvLyBhdHRhY2ggdGhlIHNlcnZpY2UgdG8gdGhlIFtyYXBpZE1vYmlsZV0gbW9kdWxlIGluIGFuZ3VsYXJcbiAgICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKVxuXHQgXHQuc2VydmljZSgnUmVwb3J0U3ZjJywgWyckcScsICckdGltZW91dCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwb3J0U3ZjXSk7XG5cblx0Ly8gZ2VuUmVwb3J0RGVmIC0tPiBnZW5SZXBvcnREb2MgLS0+IGJ1ZmZlcltdIC0tPiBCbG9iKCkgLS0+IHNhdmVGaWxlIC0tPiByZXR1cm4gZmlsZVBhdGhcblxuXHQgZnVuY3Rpb24gcmVwb3J0U3ZjKCRxLCAkdGltZW91dCkge1xuXHRcdCB0aGlzLnJ1blJlcG9ydEFzeW5jID0gX3J1blJlcG9ydEFzeW5jO1xuXHRcdCB0aGlzLnJ1blJlcG9ydERhdGFVUkwgPSBfcnVuUmVwb3J0RGF0YVVSTDtcblxuXHRcdC8vIFJVTiBBU1lOQzogcnVucyB0aGUgcmVwb3J0IGFzeW5jIG1vZGUgdy8gcHJvZ3Jlc3MgdXBkYXRlcyBhbmQgZGVsaXZlcnMgYSBsb2NhbCBmaWxlVXJsIGZvciB1c2VcblxuXHRcdCBmdW5jdGlvbiBfcnVuUmVwb3J0QXN5bmMoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKSB7XG4gICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblx0XHRcdCBcbiAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCcxLlByb2Nlc3NpbmcgVHJhbnNjcmlwdCcpO1xuICAgICAgICAgICAgIGdlbmVyYXRlUmVwb3J0RGVmKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkudGhlbihmdW5jdGlvbihkb2NEZWYpIHtcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMi4gR2VuZXJhdGluZyBSZXBvcnQnKTtcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0RG9jKGRvY0RlZik7XG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihwZGZEb2MpIHtcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMy4gQnVmZmVyaW5nIFJlcG9ydCcpO1xuICAgICAgICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVSZXBvcnRCdWZmZXIocGRmRG9jKTtcbiAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCc0LiBTYXZpbmcgUmVwb3J0IEZpbGUnKTtcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0QmxvYihidWZmZXIpO1xuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocGRmQmxvYikge1xuICAgICAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCc1LiBPcGVuaW5nIFJlcG9ydCBGaWxlJyk7XG4gICAgICAgICAgICAgICAgIHJldHVybiBzYXZlRmlsZShwZGZCbG9iLHN0YXR1c0ZsYWcpO1xuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oZmlsZVBhdGgpIHtcbiAgICAgICAgICAgICAgICAgLy9oaWRlTG9hZGluZygpO1xuICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGZpbGVQYXRoKTtcbiAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgICAgICAvL2hpZGVMb2FkaW5nKCk7XG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJyArIGVycm9yLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgfVxuXG5cdFx0Ly8gUlVOIERBVEFVUkw6IHJ1bnMgdGhlIHJlcG9ydCBhc3luYyBtb2RlIHcvIHByb2dyZXNzIHVwZGF0ZXMgYW5kIHN0b3BzIHcvIHBkZkRvYyAtPiBkYXRhVVJMIHN0cmluZyBjb252ZXJzaW9uXG5cblx0XHQgZnVuY3Rpb24gX3J1blJlcG9ydERhdGFVUkwoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKSB7XG4gICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblx0XHRcdCBcbiAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCcxLlByb2Nlc3NpbmcgVHJhbnNjcmlwdCcpO1xuICAgICAgICAgICAgIGdlbmVyYXRlUmVwb3J0RGVmKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkudGhlbihmdW5jdGlvbihkb2NEZWYpIHtcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMi4gR2VuZXJhdGluZyBSZXBvcnQnKTtcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0RG9jKGRvY0RlZik7XG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihwZGZEb2MpIHtcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMy4gQ29udmVydCB0byBEYXRhVVJMJyk7XG4gICAgICAgICAgICAgICAgIHJldHVybiBnZXREYXRhVVJMKHBkZkRvYyk7XG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihvdXREb2MpIHtcbiAgICAgICAgICAgICAgICAgLy9oaWRlTG9hZGluZygpO1xuICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKG91dERvYyk7XG4gICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgLy9oaWRlTG9hZGluZygpO1xuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcgKyBlcnJvci50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgIH1cblxuXHRcdC8vIDEuR2VuZXJhdGVSZXBvcnREZWY6IHVzZSBjdXJyZW50VHJhbnNjcmlwdCB0byBjcmFmdCByZXBvcnREZWYgSlNPTiBmb3IgcGRmTWFrZSB0byBnZW5lcmF0ZSByZXBvcnRcblxuXHRcdGZ1bmN0aW9uIGdlbmVyYXRlUmVwb3J0RGVmKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkge1xuICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblx0XHRcdFxuICAgICAgICAgICAgLy8gcmVtb3ZlZCBzcGVjaWZpY3Mgb2YgY29kZSB0byBwcm9jZXNzIGRhdGEgZm9yIGRyYWZ0aW5nIHRoZSBkb2NcbiAgICAgICAgICAgIC8vIGxheW91dCBiYXNlZCBvbiBwbGF5ZXIsIHRyYW5zY3JpcHQsIGNvdXJzZXMsIGV0Yy5cbiAgICAgICAgICAgIC8vIGN1cnJlbnRseSBtb2NraW5nIHRoaXMgYW5kIHJldHVybmluZyBhIHByZS1idWlsdCBKU09OIGRvYyBkZWZpbml0aW9uXG4gICAgICAgICAgICBcblx0XHRcdC8vdXNlIHJwdCBzZXJ2aWNlIHRvIGdlbmVyYXRlIHRoZSBKU09OIGRhdGEgbW9kZWwgZm9yIHByb2Nlc3NpbmcgUERGXG4gICAgICAgICAgICAvLyBoYWQgdG8gdXNlIHRoZSAkdGltZW91dCB0byBwdXQgYSBzaG9ydCBkZWxheSB0aGF0IHdhcyBuZWVkZWQgdG8gXG4gICAgICAgICAgICAvLyBwcm9wZXJseSBnZW5lcmF0ZSB0aGUgZG9jIGRlY2xhcmF0aW9uXG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGQgPSB7fTtcbiAgICAgICAgICAgICAgICBkZCA9IGdlbmVyYXRlUmVwb3J0KHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aClcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShkZCk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcblx0XHR9XG5cblx0XHQvLyAyLkdlbmVyYXRlUnB0RmlsZURvYzogdGFrZSBKU09OIGZyb20gcnB0U3ZjLCBjcmVhdGUgcGRmbWVtb3J5IGJ1ZmZlciwgYW5kIHNhdmUgYXMgYSBsb2NhbCBmaWxlXG5cblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydERvYyhkb2NEZWZpbml0aW9uKSB7XG5cdFx0XHQvL3VzZSB0aGUgcGRmbWFrZSBsaWIgdG8gY3JlYXRlIGEgcGRmIGZyb20gdGhlIEpTT04gY3JlYXRlZCBpbiB0aGUgbGFzdCBzdGVwXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXHRcdFx0dHJ5IHtcbiAgICAgICAgICAgICAgICAvL3VzZSB0aGUgcGRmTWFrZSBsaWJyYXJ5IHRvIGNyZWF0ZSBpbiBtZW1vcnkgcGRmIGZyb20gdGhlIEpTT05cblx0XHRcdFx0dmFyIHBkZkRvYyA9IHBkZk1ha2UuY3JlYXRlUGRmKCBkb2NEZWZpbml0aW9uICk7XG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShwZGZEb2MpO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcblx0XHR9XG5cblx0XHQvLyAzLkdlbmVyYXRlUnB0QnVmZmVyOiBwZGZLaXQgb2JqZWN0IHBkZkRvYyAtLT4gYnVmZmVyIGFycmF5IG9mIHBkZkRvY1xuXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnRCdWZmZXIocGRmRG9jKSB7XG5cdFx0XHQvL3VzZSB0aGUgcGRmbWFrZSBsaWIgdG8gZ2V0IGEgYnVmZmVyIGFycmF5IG9mIHRoZSBwZGZEb2Mgb2JqZWN0XG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXHRcdFx0dHJ5IHtcbiAgICAgICAgICAgICAgICAvL2dldCB0aGUgYnVmZmVyIGZyb20gdGhlIHBkZkRvY1xuXHRcdFx0XHRwZGZEb2MuZ2V0QnVmZmVyKGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQgICBkZWZlcnJlZC5yZXNvbHZlKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcblx0XHR9XG5cblx0XHQvLyAzYi5nZXREYXRhVVJMOiBwZGZLaXQgb2JqZWN0IHBkZkRvYyAtLT4gZW5jb2RlZCBkYXRhVXJsXG5cblx0XHQgZnVuY3Rpb24gZ2V0RGF0YVVSTChwZGZEb2MpIHtcblx0XHRcdC8vdXNlIHRoZSBwZGZtYWtlIGxpYiB0byBjcmVhdGUgYSBwZGYgZnJvbSB0aGUgSlNPTiBjcmVhdGVkIGluIHRoZSBsYXN0IHN0ZXBcblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cdFx0XHR0cnkge1xuICAgICAgICAgICAgICAgIC8vdXNlIHRoZSBwZGZNYWtlIGxpYnJhcnkgdG8gY3JlYXRlIGluIG1lbW9yeSBwZGYgZnJvbSB0aGUgSlNPTlxuXHRcdFx0XHRwZGZEb2MuZ2V0RGF0YVVybChmdW5jdGlvbihvdXREb2MpIHtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKG91dERvYyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcblx0XHQgfVxuXG5cdFx0Ly8gNC5HZW5lcmF0ZVJlcG9ydEJsb2I6IGJ1ZmZlciAtLT4gbmV3IEJsb2Igb2JqZWN0XG5cblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydEJsb2IoYnVmZmVyKSB7XG5cdFx0XHQvL3VzZSB0aGUgZ2xvYmFsIEJsb2Igb2JqZWN0IGZyb20gcGRmbWFrZSBsaWIgdG8gY3JlYXQgYSBibG9iIGZvciBmaWxlIHByb2Nlc3Npbmdcblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cdFx0XHR0cnkge1xuICAgICAgICAgICAgICAgIC8vcHJvY2VzcyB0aGUgaW5wdXQgYnVmZmVyIGFzIGFuIGFwcGxpY2F0aW9uL3BkZiBCbG9iIG9iamVjdCBmb3IgZmlsZSBwcm9jZXNzaW5nXG4gICAgICAgICAgICAgICAgdmFyIHBkZkJsb2IgPSBuZXcgQmxvYihbYnVmZmVyXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9wZGYnfSk7XG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocGRmQmxvYik7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdFx0fVxuXG5cdFx0Ly8gNS5TYXZlRmlsZTogdXNlIHRoZSBGaWxlIHBsdWdpbiB0byBzYXZlIHRoZSBwZGZCbG9iIGFuZCByZXR1cm4gYSBmaWxlUGF0aCB0byB0aGUgY2xpZW50XG5cblx0XHRmdW5jdGlvbiBzYXZlRmlsZShwZGZCbG9iLHRpdGxlKSB7XG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXHRcdFx0dmFyIGZpbGVOYW1lID0gdW5pcXVlRmlsZU5hbWUodGl0bGUpK1wiLnBkZlwiO1xuXHRcdFx0dmFyIGZpbGVQYXRoID0gXCJcIjtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdTYXZlRmlsZTogcmVxdWVzdEZpbGVTeXN0ZW0nKTtcblx0XHRcdFx0d2luZG93LnJlcXVlc3RGaWxlU3lzdGVtKExvY2FsRmlsZVN5c3RlbS5QRVJTSVNURU5ULCAwLCBnb3RGUywgZmFpbCk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdTYXZlRmlsZV9FcnI6ICcgKyBlLm1lc3NhZ2UpO1xuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XG5cdFx0XHRcdHRocm93KHtjb2RlOi0xNDAxLG1lc3NhZ2U6J3VuYWJsZSB0byBzYXZlIHJlcG9ydCBmaWxlJ30pO1xuXHRcdFx0fVx0XHRcdFxuXG5cdFx0XHRmdW5jdGlvbiBnb3RGUyhmaWxlU3lzdGVtKSB7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ1NhdmVGaWxlOiBnb3RGUyAtLT4gZ2V0RmlsZScpO1xuXHRcdFx0XHRmaWxlU3lzdGVtLnJvb3QuZ2V0RmlsZShmaWxlTmFtZSwge2NyZWF0ZTogdHJ1ZSwgZXhjbHVzaXZlOiBmYWxzZX0sIGdvdEZpbGVFbnRyeSwgZmFpbCk7XG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGdvdEZpbGVFbnRyeShmaWxlRW50cnkpIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcignU2F2ZUZpbGU6IGdvdEZpbGVFbnRyeSAtLT4gKGZpbGVQYXRoKSAtLT4gY3JlYXRlV3JpdGVyJyk7XG5cdFx0XHRcdGZpbGVQYXRoID0gZmlsZUVudHJ5LnRvVVJMKCk7XG5cdFx0XHRcdGZpbGVFbnRyeS5jcmVhdGVXcml0ZXIoZ290RmlsZVdyaXRlciwgZmFpbCk7XG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGdvdEZpbGVXcml0ZXIod3JpdGVyKSB7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ1NhdmVGaWxlOiBnb3RGaWxlV3JpdGVyIC0tPiB3cml0ZSAtLT4gb25Xcml0ZUVuZChyZXNvbHZlKScpO1xuXHRcdFx0XHR3cml0ZXIub253cml0ZWVuZCA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHR3cml0ZXIub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRlciBlcnJvcjogJyArIGUudG9TdHJpbmcoKSk7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHR3cml0ZXIud3JpdGUocGRmQmxvYik7XG5cdFx0XHR9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGZhaWwoZXJyb3IpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coZXJyb3IuY29kZSk7XG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlcnJvcik7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHRcdH1cblx0XHRmdW5jdGlvbiB1bmlxdWVGaWxlTmFtZShmaWxlTmFtZSl7XG5cdFx0XHR2YXIgbm93ID0gbmV3IERhdGUoKTtcblx0XHRcdHZhciB0aW1lc3RhbXAgPSBub3cuZ2V0RnVsbFllYXIoKS50b1N0cmluZygpO1xuXHRcdFx0dGltZXN0YW1wICs9IChub3cuZ2V0TW9udGgoKSA8IDkgPyAnMCcgOiAnJykgKyBub3cuZ2V0TW9udGgoKS50b1N0cmluZygpOyBcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldERhdGUoKSA8IDEwID8gJzAnIDogJycpICsgbm93LmdldERhdGUoKS50b1N0cmluZygpOyBcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldEhvdXJzKCkgPCAxMCA/ICcwJyA6ICcnKSArIG5vdy5nZXRIb3VycygpLnRvU3RyaW5nKCk7IFxuXHRcdFx0dGltZXN0YW1wICs9IChub3cuZ2V0TWludXRlcygpIDwgMTAgPyAnMCcgOiAnJykgKyBub3cuZ2V0TWludXRlcygpLnRvU3RyaW5nKCk7IFxuXHRcdFx0dGltZXN0YW1wICs9IChub3cuZ2V0U2Vjb25kcygpIDwgMTAgPyAnMCcgOiAnJykgKyBub3cuZ2V0U2Vjb25kcygpLnRvU3RyaW5nKCk7XG5cdFx0XHRyZXR1cm4gZmlsZU5hbWUudG9VcHBlckNhc2UoKStcIl9cIit0aW1lc3RhbXA7XG5cdFx0XG5cdFx0fVxuXHRcdFxuXHRcdGZ1bmN0aW9uIGdlbmVyYXRlUmVwb3J0KHBhcmFtLCBjaGFydFRpdGxlLGZsb3duTW9udGgpIHtcblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cdFx0XHRcblx0XHRcdHZhciB0aXRsZSA9IFwiXCI7XG5cdFx0XHRpZihwYXJhbSA9PSBcIm1ldHJpY1NuYXBzaG90XCIpXG5cdFx0XHRcdHRpdGxlID0gXCJNRVRSSUMgU05BUFNIT1QgLVwiK2Zsb3duTW9udGgrXCIgXCIrY2hhcnRUaXRsZS50b1VwcGVyQ2FzZSgpK1wiLSBWSUVXXCI7XG5cdFx0XHRlbHNlIGlmKHBhcmFtID09IFwidGFyZ2V0QWN0dWFsXCIpXG5cdFx0XHRcdHRpdGxlID0gXCJUQVJHRVQgVlMgQUNUVUFMIC0gXCIrKChjaGFydFRpdGxlID09IFwicmV2ZW51ZVwiKT9cIk5FVCBSRVZFTlVFXCI6XCJQQVggQ291bnRcIikrXCIgXCIrZmxvd25Nb250aCsgXCIgLSBWSUVXXCI7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHRpdGxlID0gY2hhcnRUaXRsZStcIiBcIitmbG93bk1vbnRoK1wiIC0gVklFV1wiO1xuXHRcdFx0XHRcdFx0XHRcblx0XHRcdHZhciBzdmdOb2RlID0gZDMuc2VsZWN0QWxsKFwiLlwiK3BhcmFtKS5zZWxlY3RBbGwoXCJzdmdcIik7XG5cdFx0XHR2YXIgY29udGVudCA9IFtdO1xuXHRcdFx0dmFyIGltYWdlQ29sdW1uID0gW107XG5cdFx0XHR2YXIgdGV4dENvbHVtbiA9IFtdO1xuXHRcdFx0dmFyIGltYWdlc09iaiA9IHt9O1xuXHRcdFx0dmFyIHRleHRPYmogPSB7fTtcblx0XHRcdGNvbnRlbnQucHVzaCh0aXRsZSk7XG5cdFx0XHR2YXIgbm9kZUV4aXN0cyA9IFtdO1xuXHRcdFx0YW5ndWxhci5mb3JFYWNoKHN2Z05vZGUsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcdFx0XHRcdFxuXHRcdFx0XHR2YXIgaHRtbCA9IFwiXCI7XG5cdFx0XHRcdGlmKG5vZGVFeGlzdHMuaW5kZXhPZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tZmxhZ1wiKSkgPT0gLTEgJiYgc3ZnTm9kZVtrZXldLmxlbmd0aCA+PSAxKXtcblx0XHRcdFx0XHRodG1sID0gc3ZnTm9kZVtrZXldWzBdLm91dGVySFRNTDtcblx0XHRcdFx0XHRpZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tcGRmRmxhZ1wiKSA9PT0gXCJkeW5hbWljV0hcIil7XG5cdFx0XHRcdFx0XHRkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKS5hdHRyKFwid2lkdGhcIiwxNTAwKTtcblx0XHRcdFx0XHRcdGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpLmF0dHIoXCJoZWlnaHRcIiw2MDApO1xuXHRcdFx0XHRcdFx0dmFyIG5vZGUgPSBkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKTtcblx0XHRcdFx0XHRcdGh0bWwgPSBub2RlWzBdWzBdLm91dGVySFRNTDtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDUwMDtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnaGVpZ2h0J10gPSA1MDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1wZGZGbGFnXCIpID09PSBcInBkZkZsYWdcIilcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ3dpZHRoJ10gPSA3NTA7XG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ2hlaWdodCddID0gMzAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjYW52Zyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyksIGh0bWwpO1xuXHRcdFx0XHRcdHZhciBjYW52YXNFbG0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XG5cdFx0XHRcdFx0dmFyIGltZ3NyYyA9IGNhbnZhc0VsbS50b0RhdGFVUkwoKTtcblx0XHRcdFx0XHR2YXIgIHRleHQgPSBcIlxcblwiK3N2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS10aXRsZVwiKStcIlxcblwiO1xuXHRcdFx0XHRcdHRleHRPYmpbJ3RleHQnXSA9IHRleHQ7XG5cdFx0XHRcdFx0dGV4dENvbHVtbi5wdXNoKHRleHRPYmopO1xuXHRcdFx0XHRcdGltYWdlc09ialsnaW1hZ2UnXSA9IGltZ3NyYztcblx0XHRcdFx0XHRpbWFnZUNvbHVtbi5wdXNoKGltYWdlc09iaik7XHRcdFx0XHRcblx0XHRcdFx0XHR2YXIgaW1nVGVtcCA9e30sIHR4dFRlbXAgPXt9O1x0XHRcblx0XHRcdFx0XHR0eHRUZW1wWydjb2x1bW5zJ10gPSB0ZXh0Q29sdW1uO1xuXHRcdFx0XHRcdGltZ1RlbXBbJ2FsaWdubWVudCddID0gJ2NlbnRlcic7XG5cdFx0XHRcdFx0aW1nVGVtcFsnY29sdW1ucyddID0gaW1hZ2VDb2x1bW47XG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKHR4dFRlbXApO1xuXHRcdFx0XHRcdGNvbnRlbnQucHVzaChpbWdUZW1wKTtcdFx0XHRcdFx0XG5cdFx0XHRcdFx0aW1hZ2VDb2x1bW4gPSBbXTtcblx0XHRcdFx0XHR0ZXh0Q29sdW1uID0gW107XG5cdFx0XHRcdFx0aW1hZ2VzT2JqID0ge307XG5cdFx0XHRcdFx0dGV4dE9iaiA9IHt9O1xuXHRcdFx0XHRcdGltZ1RlbXAgPSB7fTtcblx0XHRcdFx0XHR0eHRUZW1wID17fTtcblx0XHRcdFx0XHRub2RlRXhpc3RzLnB1c2goc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLWZsYWdcIikpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcdFx0XHRcblx0XHRcdGlmKHBhcmFtID09IFwicmV2ZW51ZUFuYWx5c2lzXCIpe1xuXHRcdFx0XHR2YXIgbm9kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmV0LXJldmVudWUtY2hhcnRcIik7XG5cdFx0XHRcdHZhciBwZGZSZW5kZXIgPSBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3BkZi1yZW5kZXInKSk7XG5cdFx0XHRcdHBkZlJlbmRlci5hcHBlbmQobm9kZS5jaGlsZE5vZGVzWzFdKTsgIFxuXHRcdFx0XHRodG1sMmNhbnZhcyhkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCduZXQtcmV2ZW51ZS1wZGYnKSkudGhlbihmdW5jdGlvbihjYW52YXMpIHtcblx0XHRcdFx0XHR2YXIgYyA9IGNhbnZhcy50b0RhdGFVUkwoKTtcblx0XHRcdFx0XHR2YXIgIHRleHQgPSBcIlxcblxcblxcblxcblxcblxcblxcblxcblxcblxcblxcblxcblwiK25vZGUuZ2V0QXR0cmlidXRlKCdkYXRhLWl0ZW0tdGl0bGUnKStcIlxcblxcblwiO1xuXHRcdFx0XHRcdHRleHRPYmpbJ3RleHQnXSA9IHRleHQ7XG5cdFx0XHRcdFx0dGV4dENvbHVtbi5wdXNoKHRleHRPYmopO1xuXHRcdFx0XHRcdGltYWdlc09ialsnaW1hZ2UnXSA9IGM7XG5cdFx0XHRcdFx0aW1hZ2VDb2x1bW4ucHVzaChpbWFnZXNPYmopO1x0XHRcdFx0XG5cdFx0XHRcdFx0dmFyIGltZ1RlbXAgPXt9LCB0eHRUZW1wID17fTtcdFx0XG5cdFx0XHRcdFx0dHh0VGVtcFsnY29sdW1ucyddID0gdGV4dENvbHVtbjtcblx0XHRcdFx0XHRpbWdUZW1wWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInO1xuXHRcdFx0XHRcdGltZ1RlbXBbJ2NvbHVtbnMnXSA9IGltYWdlQ29sdW1uO1xuXHRcdFx0XHRcdGNvbnRlbnQucHVzaCh0eHRUZW1wKTtcblx0XHRcdFx0XHRjb250ZW50LnB1c2goaW1nVGVtcCk7XHRcdFx0XHRcdFxuXHRcdFx0XHRcdGltYWdlQ29sdW1uID0gW107XG5cdFx0XHRcdFx0dGV4dENvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdGltYWdlc09iaiA9IHt9O1xuXHRcdFx0XHRcdHRleHRPYmogPSB7fTtcblx0XHRcdFx0XHRpbWdUZW1wID0ge307XG5cdFx0XHRcdFx0dHh0VGVtcCA9e307XHRcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHtjb250ZW50OiBjb250ZW50fSk7XG5cdFx0XHRcdFx0cGRmUmVuZGVyLmVtcHR5KCk7XG5cdFx0XHRcdH0pO1x0XHRcdFx0XG5cdFx0XHR9IGVsc2UgaWYocGFyYW0gPT0gXCJzZWN0b3JjYXJyaWVyYW5hbHlzaXNcIil7XG5cdFx0XHRcdHZhciBzdmdOb2RlID0gZDMuc2VsZWN0QWxsKFwiLlwiK3BhcmFtKTtcblx0XHRcdFx0YW5ndWxhci5mb3JFYWNoKHN2Z05vZGVbMF0sIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcblx0XHRcdFx0XHR2YXIgbm9kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZWN0b3ItY2Fycmllci1jaGFydCcra2V5KTtcblx0XHRcdFx0XHR2YXIgZWxlSUQgPSAnc2VjdG9yLWNhcnJpZXItY2hhcnQnK2tleTtcblx0XHRcdFx0XHRodG1sMmNhbnZhcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVJRCkpLnRoZW4oZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0XHRcdFx0XHR2YXIgYyA9IGNhbnZhcy50b0RhdGFVUkwoKTtcblx0XHRcdFx0XHRcdHZhciAgdGV4dCA9IFwiXFxuXFxuXCIrbm9kZS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaXRlbS10aXRsZScpK1wiXFxuXFxuXCI7XG5cdFx0XHRcdFx0XHR0ZXh0T2JqWyd0ZXh0J10gPSB0ZXh0O1xuXHRcdFx0XHRcdFx0dGV4dENvbHVtbi5wdXNoKHRleHRPYmopO1xuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWyd3aWR0aCddID0gNTAwO1xuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWydpbWFnZSddID0gYztcblx0XHRcdFx0XHRcdGltYWdlQ29sdW1uLnB1c2goaW1hZ2VzT2JqKTtcdFx0XHRcdFxuXHRcdFx0XHRcdFx0dmFyIGltZ1RlbXAgPXt9LCB0eHRUZW1wID17fTtcdFx0XG5cdFx0XHRcdFx0XHR0eHRUZW1wWydjb2x1bW5zJ10gPSB0ZXh0Q29sdW1uO1xuXHRcdFx0XHRcdFx0aW1nVGVtcFsnYWxpZ25tZW50J10gPSAnY2VudGVyJztcblx0XHRcdFx0XHRcdGltZ1RlbXBbJ2NvbHVtbnMnXSA9IGltYWdlQ29sdW1uO1xuXHRcdFx0XHRcdFx0Y29udGVudC5wdXNoKHR4dFRlbXApO1xuXHRcdFx0XHRcdFx0Y29udGVudC5wdXNoKGltZ1RlbXApO1x0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGltYWdlQ29sdW1uID0gW107XG5cdFx0XHRcdFx0XHR0ZXh0Q29sdW1uID0gW107XG5cdFx0XHRcdFx0XHRpbWFnZXNPYmogPSB7fTtcblx0XHRcdFx0XHRcdHRleHRPYmogPSB7fTtcblx0XHRcdFx0XHRcdGltZ1RlbXAgPSB7fTtcblx0XHRcdFx0XHRcdHR4dFRlbXAgPXt9O1x0XG5cdFx0XHRcdFx0XHRpZihrZXkgPT0gc3ZnTm9kZVswXS5sZW5ndGgtMSl7XG5cdFx0XHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoe2NvbnRlbnQ6IGNvbnRlbnR9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcdFx0XHRcdFx0XG5cdFx0XHRcdH0pO1x0XHRcblx0XHRcdH1lbHNlIGlmKHBhcmFtID09IFwicm91dGVyZXZlbnVlXCIpe1x0XHRcdFx0XG5cdFx0XHRcdHZhciBlbGVJRCA9ICdyb3V0ZS1yZXZlbnVlLXBkZic7XHRcdFx0XHRcdFxuXHRcdFx0XHRodG1sMmNhbnZhcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVJRCkpLnRoZW4oZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0XHRcdFx0dmFyIGMgPSBjYW52YXMudG9EYXRhVVJMKCk7XG5cdFx0XHRcdFx0dmFyICB0ZXh0ID0gXCJcIjtcblx0XHRcdFx0XHR0ZXh0T2JqWyd0ZXh0J10gPSB0ZXh0O1xuXHRcdFx0XHRcdHRleHRDb2x1bW4ucHVzaCh0ZXh0T2JqKTtcblx0XHRcdFx0XHRpbWFnZXNPYmpbJ3dpZHRoJ10gPSA1MDA7XG5cdFx0XHRcdFx0aW1hZ2VzT2JqWydpbWFnZSddID0gYztcblx0XHRcdFx0XHRpbWFnZUNvbHVtbi5wdXNoKGltYWdlc09iaik7XHRcdFx0XHRcblx0XHRcdFx0XHR2YXIgaW1nVGVtcCA9e30sIHR4dFRlbXAgPXt9O1x0XHRcblx0XHRcdFx0XHR0eHRUZW1wWydjb2x1bW5zJ10gPSB0ZXh0Q29sdW1uO1xuXHRcdFx0XHRcdGltZ1RlbXBbJ2FsaWdubWVudCddID0gJ2NlbnRlcic7XG5cdFx0XHRcdFx0aW1nVGVtcFsnY29sdW1ucyddID0gaW1hZ2VDb2x1bW47XG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKHR4dFRlbXApO1xuXHRcdFx0XHRcdGNvbnRlbnQucHVzaChpbWdUZW1wKTtcdFx0XHRcdFx0XG5cdFx0XHRcdFx0aW1hZ2VDb2x1bW4gPSBbXTtcblx0XHRcdFx0XHR0ZXh0Q29sdW1uID0gW107XG5cdFx0XHRcdFx0aW1hZ2VzT2JqID0ge307XG5cdFx0XHRcdFx0dGV4dE9iaiA9IHt9O1xuXHRcdFx0XHRcdGltZ1RlbXAgPSB7fTtcblx0XHRcdFx0XHR0eHRUZW1wID17fTtcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHtjb250ZW50OiBjb250ZW50fSk7XG5cdFx0XHRcdH0pO1x0XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7Y29udGVudDogY29udGVudH0pO1xuXHRcdFx0fVxuXHRcdFxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdFx0fTtcblx0XHRcblx0IH1cbiAgICBcbn0pKCk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
