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
    if (drilltype == 'analysis') {
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
    if (drilltype == 'network-Revenue') {
        if (item.POSregion && level == 0) {
            return (item.POSregion.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.POScountry && level == 1) {
            return (item.POScountry.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.POScity && level == 2) {
            return (item.POScity.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.documentType && level == 3) {
            return (item.documentType.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.sector && level == 4) {
            return (item.sector.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flightnumber && level == 5) {
            return (item.flightnumber.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else {
            return false;
        }
    }
    if (drilltype == 'yield') {
        if (item.routeCode && level == 0) {
            return (item.routeCode.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flownSector && level == 1) {
            return (item.flownSector.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flightNumber && level == 2) {
            return (item.flightNumber.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flightDate && level == 3) {
            return (item.flightDate.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else {
            return false;
        }
    }
    if (drilltype == 'rpkm' || drilltype == 'askm') {
        if (item.aircrafttype && level == 0) {
            return (item.aircrafttype.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.aircraftregno && level == 1) {
            return (item.aircraftregno.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.aircraftleg && level == 2) {
            return (item.aircraftleg.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flightNumber && level == 3) {
            return (item.flightNumber.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else {
            return false;
        }
    }
    if (drilltype == 'oal-cont') {
        if (item.sector && level == 0) {
            return (item.sector.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flightNumber && level == 1) {
            return (item.flightNumber.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flightDate && level == 2) {
            return (item.flightDate.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.documentType && level == 3) {
            return (item.documentType.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else {
            return false;
        }
    }
    if (drilltype == 'passenger-count') {
        if (item.routeCode && level == 0) {
            return (item.routeCode.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flownSector && level == 1) {
            return (item.flownSector.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flightNumber && level == 2) {
            return (item.flightNumber.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
        }
        else if (item.flightDate && level == 3) {
            return (item.flightDate.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
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
                _this.getDefaultPage();
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
    UserService.prototype.getDefaultPage = function () {
        switch (this.userProfile.userInfo.defaultPage) {
            case 'MIS - Passenger Flown':
                this.defaultPage = 'app.mis-flown';
                break;
            case 'Operational - Passenger Flown':
                this.defaultPage = 'app.operational-flown';
                break;
            default:
                this.defaultPage = 'app.mis-flown';
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
                console.log(response);
                if (response.name == "Network Revenue") {
                    console.log('In network revene');
                    _this.$scope.MisCtrl.openNetworkRevenueDrillDownPopover(response.event, { "point": response.data }, -1);
                }
                else if (response.name == "Yield") {
                    _this.$scope.MisCtrl.openYieldDrillDownPopover(response.event, { "point": response.data }, -1);
                }
                else if (response.name == "RPKM") {
                    _this.$scope.MisCtrl.openRPKMDrillDownPopover(response.event, { "point": response.data }, -1);
                }
                else if (response.name == "ASKM") {
                    _this.$scope.MisCtrl.openASKMDrillDownPopover(response.event, { "point": response.data }, -1);
                }
                else {
                    _this.$scope.MisCtrl.openBarDrillDownPopover(response.event, { "point": response.data }, -1);
                }
            }
            if (response.type == 'target') {
                _this.$scope.MisCtrl.openTargetDrillDownPopover(response.event, { "point": response.data }, -1);
            }
            if (response.type == 'passenger-count') {
                _this.$scope.MisCtrl.openRevenuePassengerDrillDownPopover(response.event, { "point": response.data }, -1);
            }
            if (response.type == 'oal') {
                _this.$scope.MisCtrl.openOALContDrillDownPopover(response.event, { "point": response.data }, -1);
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
                    revenueBarChart: jsonObj.multibarCharts[1],
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
            var toggle1 = (data.toggle1) ? data.toggle1 : "";
            var toggle2 = (data.toggle2) ? data.toggle2 : "";
            var routeCode = (data.routeCode) ? data.routeCode : "";
            var sector = (data.flownSector) ? data.flownSector : "";
            var flightNumber = (data.flightNumber) ? data.flightNumber : "";
            this.ionicLoadingShow();
            console.log(data);
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
        if (drillType == 'network-Revenue') {
            var drillLevel = (selFindLevel + 2);
            if (data.label) {
                this.drillBarLabel = data.label;
            }
            console.log(data);
            var drillBar;
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
        if (drillType == 'yield') {
            var drillLevel = (selFindLevel + 2);
            if (data.label) {
                this.drillBarLabel = data.label;
            }
            console.log(data);
            var drillBar;
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
        if (drillType == 'rpkm') {
            var drillLevel = (selFindLevel + 2);
            if (data.label) {
                this.drillBarLabel = data.label;
            }
            console.log(data);
            var drillBar;
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
        if (drillType == 'askm') {
            var drillLevel = (selFindLevel + 2);
            if (data.label) {
                this.drillBarLabel = data.label;
            }
            console.log(data);
            var drillBar;
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
        if (drillType == 'oal-cont') {
            var drillLevel = (selFindLevel + 2);
            if (data.label) {
                this.drillBarLabel = data.label;
            }
            console.log(data);
            var drillBar;
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
                if (data.status == 'success') {
                    if (that.drillType == 'oal-cont') {
                        if (that.toggle.sectorRevOrPax == "paxcount") {
                            that.groups[findLevel].items[0] = data.data.paxcountrows;
                            that.groups[findLevel].orgItems[0] = data.data.paxcountrows;
                        }
                        else {
                            that.groups[findLevel].items[0] = data.data.revenuerows;
                            that.groups[findLevel].orgItems[0] = data.data.revenuerows;
                        }
                    }
                    else {
                        that.groups[findLevel].items[0] = data.data.rows;
                        that.groups[findLevel].orgItems[0] = data.data.rows;
                    }
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
    MisController.prototype.openRPKMDrillDownPopover = function ($event, selData, selFindLevel) {
        this.drillName = 'RPKM';
        this.drillType = 'rpkm';
        this.groups = [];
        this.drilltabs = ['RPKM at Aircraft Type Level', 'RPKM at Aircraft  Registration Number Level', 'RPKM at Aircraft Leg Level', 'RPKM at Flight Number and Date Level'];
        this.firstColumns = ['aircrafttype', 'aircraftregno', 'aircraftleg', 'flightNumber'];
        this.initiateArray(this.drilltabs);
        var that = this;
        this.$timeout(function () {
            that.drillBarpopover.show($event);
        }, 50);
        this.openBarDrillDown(selData.point, selFindLevel);
    };
    MisController.prototype.openASKMDrillDownPopover = function ($event, selData, selFindLevel) {
        this.drillName = 'ASKM';
        this.drillType = 'askm';
        this.groups = [];
        this.drilltabs = ['ASKM at Aircraft Type Level', 'ASKM at Aircraft  Registration Number Level', 'ASKM at Aircraft Leg Level', 'ASKM at Flight Number and Date Level'];
        this.firstColumns = ['aircrafttype', 'aircraftregno', 'aircraftleg', 'flightNumber'];
        this.initiateArray(this.drilltabs);
        var that = this;
        this.$timeout(function () {
            that.drillBarpopover.show($event);
        }, 50);
        this.openBarDrillDown(selData.point, selFindLevel);
    };
    MisController.prototype.openOALContDrillDownPopover = function ($event, selData, selFindLevel) {
        this.drillName = 'Top 5 OAL Contribution';
        this.drillType = 'oal-cont';
        this.groups = [];
        if (this.toggle.sectorRevOrPax == "paxcount") {
            this.drilltabs = ['Pax Count at Sector Level - From Carrier EK', 'Pax Count at Flight Number Level - From Carrier EK', 'Pax Count at Flight Date Level - From Carrier EK', 'Pax Count at Document type Level - From Carrier EK'];
        }
        else {
            this.drilltabs = ['Revenue at Sector Level', 'Revenue at Flight Number Level - From Carrier EK', 'Revenue at Flight Date Level - From Carrier EK', 'Revenue at Doctype Level - From Carrier EK'];
        }
        this.firstColumns = ['sector', 'flightNumber', 'flightDate', 'documentType'];
        this.initiateArray(this.drilltabs);
        var that = this;
        this.$timeout(function () {
            that.drillBarpopover.show($event);
        }, 50);
        this.openBarDrillDown(selData.point, selFindLevel);
    };
    MisController.prototype.openYieldDrillDownPopover = function ($event, selData, selFindLevel) {
        this.drillName = 'Yield';
        this.drillType = 'yield';
        this.groups = [];
        this.drilltabs = ['Yield at Route Level', 'Yield at Sector Level', 'Yield at Flight Level', 'Yield at Flight Date Level'];
        this.firstColumns = ['routeCode', 'flownSector', 'flightNumber', 'flightDate'];
        this.initiateArray(this.drilltabs);
        var that = this;
        this.$timeout(function () {
            that.drillBarpopover.show($event);
        }, 50);
        this.openBarDrillDown(selData.point, selFindLevel);
    };
    ;
    MisController.prototype.openNetworkRevenueDrillDownPopover = function ($event, selData, selFindLevel) {
        this.drillName = 'Network Revenue';
        this.drillType = 'network-Revenue';
        this.groups = [];
        this.drilltabs = ['Network Revenue at Region POS Level', 'Network Revenue by Country of POS', 'Network Revenue by City of POS', 'Network Revenue by Document Type', 'Network Revenue by Sector', 'Network Revenue by Flight Number'];
        this.firstColumns = ['POSregion', 'POScountry', 'POScity', 'documentType', 'sector', 'flightnumber'];
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
        this.drilltabs = ['Pax Count at Route Level', 'Pax Count at Sector Level', 'Pax Count at Flight Number Level', 'Pax Count at Flight Date Level'];
        this.firstColumns = ['routeCode', 'flownSector', 'flightNumber', 'flightDate'];
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
        this.onSlideMove({ index: this.header.tabIndex });
    };
    MisController.prototype.toggleTargetView = function (val) {
        this.toggle.targetView = val;
        this.onSlideMove({ index: this.header.tabIndex });
    };
    MisController.prototype.toggleRevenueView = function (val) {
        this.toggle.revenueView = val;
        this.onSlideMove({ index: this.header.tabIndex });
    };
    MisController.prototype.toggleSectorView = function (val) {
        this.toggle.sectorView = val;
        this.onSlideMove({ index: this.header.tabIndex });
    };
    MisController.prototype.runReport = function (chartTitle, monthOrYear, flownMonth) {
        var that = this;
        //if no cordova, then running in browser and need to use dataURL and iframe
        if (!window.cordova) {
            that.ionicLoadingShow();
            this.reportSvc.runReportDataURL(chartTitle, monthOrYear, flownMonth, that.header.tabIndex)
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
            this.reportSvc.runReportAsync(chartTitle, monthOrYear, flownMonth, that.header.tabIndex)
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
        this.format = d3.format(',.0f');
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
                that.header.flownMonth = that.subHeader.defaultMonth;
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
        this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataFS').slide(0);
        this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataFC').slide(0);
        this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataCC').slide(0);
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
                var jsonObj = that.applyChartColorCodes(data.response.data);
                that.flightProcSection = jsonObj.sectionName;
                that.flightProcLegends = data.response.data.legends.values;
                console.log(that.flightProcLegends);
                if (that.header.tabIndex == 0) {
                    that.flightProcStatus = that.getFavoriteItems(jsonObj);
                }
                else {
                    that.flightProcStatus = {
                        pieChart: jsonObj.pieCharts[0],
                        weekData: jsonObj.multibarCharts[0].multibarChartItems,
                        stackedChart: jsonObj.stackedBarCharts[0].stackedBarchartItems
                    };
                }
                that.$timeout(function () {
                    that.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataFS').update();
                }, 0);
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
                that.flightReasonLegends = data.response.data.legends;
                var jsonObj = that.applyChartColorCodes(data.response.data);
                that.flightCountSection = jsonObj.sectionName;
                if (that.header.tabIndex == 0) {
                    that.flightCountReason = that.getFavoriteItems(jsonObj);
                }
                else {
                    that.flightCountReason = {
                        pieChart: jsonObj.pieCharts[0],
                        weekData: jsonObj.multibarCharts[0].multibarChartItems,
                        stackedChart: jsonObj.stackedBarCharts[0].stackedBarchartItems
                    };
                }
                that.$timeout(function () {
                    that.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataFC').update();
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
                var jsonObj = that.applyChartColorCodes(data.response.data);
                that.couponCountSection = jsonObj.sectionName;
                that.flightCouponLegends = data.response.data.legends.values;
                if (that.header.tabIndex == 0) {
                    that.couponCountException = that.getFavoriteItems(jsonObj);
                }
                else {
                    that.couponCountException = {
                        pieChart: jsonObj.pieCharts[0],
                        weekData: jsonObj.multibarCharts[0].multibarChartItems,
                        stackedChart: jsonObj.stackedBarCharts[0].stackedBarchartItems
                    };
                }
                that.$timeout(function () {
                    that.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataCC').update();
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
    OperationalFlownController.prototype.openPopover = function ($event, charttype, index, oprfWeekData) {
        var that = this;
        var temp = this.$ionicSlideBoxDelegate.$getByHandle(oprfWeekData);
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
    OperationalFlownController.prototype.applyChartColorCodes = function (jsonObj) {
        var that = this;
        _.forEach(jsonObj.pieCharts[0].data, function (n, value) {
            n.label = n.xval;
            n.value = n.yval;
            n.color = that.GRAPH_COLORS.DB_TWO_PIE_COLORS1[value];
            console.log(value);
        });
        // _.merge(jsonObj.pieCharts[0].data, this.GRAPH_COLORS.DB_TWO_PIE_COLORS1); 
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
        // console.log(jsonObj);
        // console.log(multiCharts[0]);
        return {
            pieChart: pieCharts[0],
            weekData: (multiCharts.length) ? multiCharts[0].multibarChartItems : [],
            stackedChart: (stackCharts.length) ? stackCharts[0].stackedBarchartItems : []
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
    OperationalFlownController.prototype.valueFormatFunction = function () {
        var that = this;
        return function (d) {
            return d3.format(",")(d);
        };
    };
    OperationalFlownController.prototype.toolTipContentFunction = function () {
        return function (key, x, y, e, graph) {
            return key + ' ' + Math.ceil(y) + ' at ' + x;
        };
    };
    OperationalFlownController.prototype.yAxisTickFormatFunction = function () {
        return function (d) {
            return d3.format(",")(d);
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
    OperationalFlownController.prototype.tabLockSlide = function (tabname) {
        this.$ionicSlideBoxDelegate.$getByHandle(tabname).enableSlide(false);
    };
    OperationalFlownController.prototype.weekDataPrev = function (oprfWeekData) {
        this.$ionicSlideBoxDelegate.$getByHandle(oprfWeekData).previous();
    };
    ;
    OperationalFlownController.prototype.weekDataNext = function (oprfWeekData) {
        this.$ionicSlideBoxDelegate.$getByHandle(oprfWeekData).next();
    };
    OperationalFlownController.prototype.toggleFlightStatusView = function (val) {
        this.toggle.flightStatus = val;
        this.onSlideMove({ index: this.header.tabIndex });
    };
    OperationalFlownController.prototype.toggleFlightReasonView = function (val) {
        this.toggle.flightReason = val;
        if (this.toggle.flightReason == "chart")
            this.onSlideMove({ index: this.header.tabIndex });
    };
    OperationalFlownController.prototype.toggleCCExceptionView = function (val) {
        this.toggle.ccException = val;
        this.onSlideMove({ index: this.header.tabIndex });
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
            this.$state.go(this.userService.defaultPage);
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
                        _this.$state.go(_this.userService.defaultPage);
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
            type: "=",
            name: "@"
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
                                self.$rootScope.$broadcast('openDrillPopup', { "data": rectElem[0]['__data__'], "type": type, "event": event, "name": attributes.name });
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
        .directive('heProgressBar', function ($rootScope) {
        var rootScope = $rootScope;
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
                    .append("div").classed("horizontal-bar-graph-value-bar", true).on('click', function (obj) {
                    if (attrs.name == "Top 5 OAL Contribution") {
                        rootScope.$broadcast('openDrillPopup', { "data": obj, "type": 'oal', "event": window.event, "name": attrs.name });
                    }
                });
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
        function _runReportAsync(statusFlag, title, flownMonth, tabIndex) {
            var deferred = $q.defer();
            //showLoading('1.Processing Transcript');
            generateReportDef(statusFlag, title, flownMonth, tabIndex).then(function (docDef) {
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
        function _runReportDataURL(statusFlag, title, flownMonth, tabIndex) {
            var deferred = $q.defer();
            //showLoading('1.Processing Transcript');
            generateReportDef(statusFlag, title, flownMonth, tabIndex).then(function (docDef) {
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
        function generateReportDef(statusFlag, title, flownMonth, tabIndex) {
            var deferred = $q.defer();
            // removed specifics of code to process data for drafting the doc
            // layout based on player, transcript, courses, etc.
            // currently mocking this and returning a pre-built JSON doc definition
            //use rpt service to generate the JSON data model for processing PDF
            // had to use the $timeout to put a short delay that was needed to 
            // properly generate the doc declaration
            $timeout(function () {
                var dd = {};
                dd = generateReport(statusFlag, title, flownMonth, tabIndex);
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
        function generateReport(param, chartTitle, flownMonth, tabIndex) {
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
                var nodeList = document.getElementsByClassName('net-revenue-pdf');
                var nodeFlag;
                if (tabIndex === 0)
                    nodeFlag = nodeList[0];
                else
                    nodeFlag = nodeList[1];
                html2canvas(nodeFlag).then(function (canvas) {
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9saWJzLnRzIiwiY29tbW9uL3V0aWxzL1V0aWxzLnRzIiwiY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvQ29yZG92YVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvTmV0U2VydmljZS50cyIsImNvbW1vbi9zZXJ2aWNlcy9FcnJvckhhbmRsZXJTZXJ2aWNlLnRzIiwiY29tbW9uL3NlcnZpY2VzL0lTZXNzaW9uSHR0cFByb21pc2UuanMiLCJjb21tb24vc2VydmljZXMvU2Vzc2lvblNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1Jlc3BvbnNlLmpzIiwiY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHMiLCJjb21tb24vYXBwL0FwcENvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvc2VydmljZXMvT3BlcmF0aW9uYWxTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvTWlzQ29udHJvbGxlci50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL3VzZXIvTG9naW5Db250cm9sbGVyLnRzIiwiY29tbW9uL2NoYXJ0LWV2ZW50L0NoYXJ0RXZlbnQudHMiLCJhcHAudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1JlcXVlc3QuanMiLCJjb21wb25lbnRzL21pcy9wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvcmV2ZW51ZS1wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvcmVwb3J0QnVpbGRlclN2Yy50cyIsImNvbXBvbmVudHMvbWlzL3NlcnZpY2VzL3JlcG9ydFNlcnZpY2UudHMiXSwibmFtZXMiOlsiVXRpbHMiLCJVdGlscy5jb25zdHJ1Y3RvciIsIlV0aWxzLmlzTm90RW1wdHkiLCJVdGlscy5pc0xhbmRzY2FwZSIsIlV0aWxzLmdldFRvZGF5RGF0ZSIsIlV0aWxzLmlzSW50ZWdlciIsIkxvY2FsU3RvcmFnZVNlcnZpY2UiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTG9jYWxTdG9yYWdlU2VydmljZS5zZXQiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldCIsIkxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0T2JqZWN0IiwiTG9jYWxTdG9yYWdlU2VydmljZS5nZXRPYmplY3QiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmlzUmVjZW50RW50cnlBdmFpbGFibGUiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmFkZFJlY2VudEVudHJ5IiwiQ29yZG92YVNlcnZpY2UiLCJDb3Jkb3ZhU2VydmljZS5jb25zdHJ1Y3RvciIsIkNvcmRvdmFTZXJ2aWNlLmV4ZWMiLCJDb3Jkb3ZhU2VydmljZS5leGVjdXRlUGVuZGluZyIsIk5ldFNlcnZpY2UiLCJOZXRTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTmV0U2VydmljZS5nZXREYXRhIiwiTmV0U2VydmljZS5wb3N0RGF0YSIsIk5ldFNlcnZpY2UuZGVsZXRlRGF0YSIsIk5ldFNlcnZpY2UudXBsb2FkRmlsZSIsIk5ldFNlcnZpY2UuY2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkiLCJOZXRTZXJ2aWNlLnNlcnZlcklzQXZhaWxhYmxlIiwiTmV0U2VydmljZS5jYW5jZWxBbGxVcGxvYWREb3dubG9hZCIsIk5ldFNlcnZpY2UuYWRkTWV0YUluZm8iLCJlcnJvcmhhbmRsZXIiLCJFcnJvckhhbmRsZXJTZXJ2aWNlIiwiRXJyb3JIYW5kbGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkVycm9ySGFuZGxlclNlcnZpY2UudmFsaWRhdGVSZXNwb25zZSIsIkVycm9ySGFuZGxlclNlcnZpY2UuaXNOb1Jlc3VsdEZvdW5kIiwiRXJyb3JIYW5kbGVyU2VydmljZS5pc1Nlc3Npb25JbnZhbGlkIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNIYXJkRXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNTb2Z0RXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNFcnJvcnMiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc05vUmVzdWx0RXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0hhcmRFcnJvciIsIkVycm9ySGFuZGxlclNlcnZpY2UuaGFzU29mdEVycm9yIiwic2Vzc2lvbnNlcnZpY2UiLCJTZXNzaW9uU2VydmljZSIsIlNlc3Npb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiU2Vzc2lvblNlcnZpY2UucmVzb2x2ZVByb21pc2UiLCJTZXNzaW9uU2VydmljZS5hZGRBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyIiwiU2Vzc2lvblNlcnZpY2UucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lciIsIlNlc3Npb25TZXJ2aWNlLnNldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLnNldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLmNsZWFyTGlzdGVuZXJzIiwiU2Vzc2lvblNlcnZpY2UucmVmcmVzaFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkIiwiU2Vzc2lvblNlcnZpY2UuYWNjZXNzVG9rZW5SZWZyZXNoZWQiLCJkYXRhcHJvdmlkZXIiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlIiwiRGF0YVByb3ZpZGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkRhdGFQcm92aWRlclNlcnZpY2UuZ2V0RGF0YSIsIkRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmRlbGV0ZURhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiRGF0YVByb3ZpZGVyU2VydmljZS5hZGRNZXRhSW5mbyIsIkRhdGFQcm92aWRlclNlcnZpY2UuaXNMb2dvdXRTZXJ2aWNlIiwiQXBwQ29udHJvbGxlciIsIkFwcENvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJBcHBDb250cm9sbGVyLmlzTm90RW1wdHkiLCJBcHBDb250cm9sbGVyLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiQXBwQ29udHJvbGxlci5sb2dvdXQiLCJBcHBDb250cm9sbGVyLmdldFVzZXJEZWZhdWx0UGFnZSIsIkFwcENvbnRyb2xsZXIuc2hvd0Rhc2hib2FyZCIsIk1pc1NlcnZpY2UiLCJNaXNTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTWlzU2VydmljZS5nZXRNZXRyaWNTbmFwc2hvdCIsIk1pc1NlcnZpY2UuZ2V0VGFyZ2V0VnNBY3R1YWwiLCJNaXNTZXJ2aWNlLmdldFJldmVudWVBbmFseXNpcyIsIk1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlIiwiTWlzU2VydmljZS5nZXRTZWN0b3JDYXJyaWVyQW5hbHlzaXMiLCJNaXNTZXJ2aWNlLmdldFBheEZsb3duTWlzSGVhZGVyIiwiTWlzU2VydmljZS5nZXRSb3V0ZVJldmVudWVEcmlsbERvd24iLCJNaXNTZXJ2aWNlLmdldEJhckRyaWxsRG93biIsIk1pc1NlcnZpY2UuZ2V0RHJpbGxEb3duIiwiQ2hhcnRvcHRpb25TZXJ2aWNlIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLmxpbmVDaGFydE9wdGlvbnMiLCJDaGFydG9wdGlvblNlcnZpY2UubXVsdGlCYXJDaGFydE9wdGlvbnMiLCJDaGFydG9wdGlvblNlcnZpY2UubWV0cmljQmFyQ2hhcnRPcHRpb25zIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLnRhcmdldEJhckNoYXJ0T3B0aW9ucyIsIkZpbHRlcmVkTGlzdFNlcnZpY2UiLCJGaWx0ZXJlZExpc3RTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiRmlsdGVyZWRMaXN0U2VydmljZS5zZWFyY2hlZCIsIkZpbHRlcmVkTGlzdFNlcnZpY2UucGFnZWQiLCJzZWFyY2hVdGlsIiwiT3BlcmF0aW9uYWxTZXJ2aWNlIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldFBheEZsb3duT3BySGVhZGVyIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckZsaWdodFByb2NTdGF0dXMiLCJPcGVyYXRpb25hbFNlcnZpY2UuZ2V0T3ByRmxpZ2h0Q291bnRCeVJlYXNvbiIsIk9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJDb3Vwb25Db3VudEJ5RXhjZXB0aW9uIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldERyaWxsRG93biIsIlVzZXJTZXJ2aWNlIiwiVXNlclNlcnZpY2UuY29uc3RydWN0b3IiLCJVc2VyU2VydmljZS5zZXRVc2VyIiwiVXNlclNlcnZpY2UubG9nb3V0IiwiVXNlclNlcnZpY2UuaXNMb2dnZWRJbiIsIlVzZXJTZXJ2aWNlLmlzVXNlckxvZ2dlZEluIiwiVXNlclNlcnZpY2UuZ2V0VXNlciIsIlVzZXJTZXJ2aWNlLmxvZ2luIiwiVXNlclNlcnZpY2UuZ2V0VXNlclByb2ZpbGUiLCJVc2VyU2VydmljZS5zaG93RGFzaGJvYXJkIiwiVXNlclNlcnZpY2UuZ2V0RGVmYXVsdFBhZ2UiLCJNaXNDb250cm9sbGVyIiwiTWlzQ29udHJvbGxlci5jb25zdHJ1Y3RvciIsIk1pc0NvbnRyb2xsZXIuaW5pdERhdGEiLCJNaXNDb250cm9sbGVyLmdldFByb2ZpbGVVc2VyTmFtZSIsIk1pc0NvbnRyb2xsZXIuc2VsZWN0ZWRGbG93bk1vbnRoIiwiTWlzQ29udHJvbGxlci5vcGVuaW5mb1BvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3NlUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIuY2xvc2VzQmFyUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIuY2xvc2VJbmZvUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIudXBkYXRlSGVhZGVyIiwiTWlzQ29udHJvbGxlci5vblNsaWRlTW92ZSIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlTWV0cmljIiwiTWlzQ29udHJvbGxlci50b2dnbGVTdXJjaGFyZ2UiLCJNaXNDb250cm9sbGVyLnRvZ2dsZVRhcmdldCIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlU2VjdG9yIiwiTWlzQ29udHJvbGxlci5jYWxsTWV0cmljU25hcHNob3QiLCJNaXNDb250cm9sbGVyLmNhbGxUYXJnZXRWc0FjdHVhbCIsIk1pc0NvbnRyb2xsZXIuY2FsbFJvdXRlUmV2ZW51ZSIsIk1pc0NvbnRyb2xsZXIuY2FsbFJldmVudWVBbmFseXNpcyIsIk1pc0NvbnRyb2xsZXIub3BlbkRyaWxsRG93biIsIk1pc0NvbnRyb2xsZXIuY2xlYXJEcmlsbCIsIk1pc0NvbnRyb2xsZXIuZHJpbGxEb3duUmVxdWVzdCIsIk1pc0NvbnRyb2xsZXIuZ2V0RHJpbGxEb3duVVJMIiwiTWlzQ29udHJvbGxlci5vcGVuQmFyRHJpbGxEb3duIiwiTWlzQ29udHJvbGxlci5pbml0aWF0ZUFycmF5IiwiTWlzQ29udHJvbGxlci5vcGVuQmFyRHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblJQS01EcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5vcGVuQVNLTURyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5PQUxDb250RHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlbllpZWxkRHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3Blbk5ldHdvcmtSZXZlbnVlRHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblRhcmdldERyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5SZXZlbnVlRHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblJldmVudWVQYXNzZW5nZXJEcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5vcGVuUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblNlY3RvclBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNhbGxTZWN0b3JDYXJyaWVyQW5hbHlzaXMiLCJNaXNDb250cm9sbGVyLnRhcmdldEFjdHVhbEZpbHRlciIsIk1pc0NvbnRyb2xsZXIuc2VjdG9yQ2FycmllckZpbHRlciIsIk1pc0NvbnRyb2xsZXIucmV2ZW51ZUFuYWx5c2lzRmlsdGVyIiwiTWlzQ29udHJvbGxlci5nZXRGbG93bkZhdm9yaXRlcyIsIk1pc0NvbnRyb2xsZXIuaW9uaWNMb2FkaW5nU2hvdyIsIk1pc0NvbnRyb2xsZXIuaW9uaWNMb2FkaW5nSGlkZSIsIk1pc0NvbnRyb2xsZXIub3BlbkRyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3Nlc1BvcG92ZXIiLCJNaXNDb250cm9sbGVyLmlzRHJpbGxSb3dTZWxlY3RlZCIsIk1pc0NvbnRyb2xsZXIuc2VhcmNoUmVzdWx0cyIsIk1pc0NvbnRyb2xsZXIucGFnaW5hdGlvbiIsIk1pc0NvbnRyb2xsZXIuc2V0UGFnZSIsIk1pc0NvbnRyb2xsZXIubGFzdFBhZ2UiLCJNaXNDb250cm9sbGVyLnJlc2V0QWxsIiwiTWlzQ29udHJvbGxlci5zb3J0IiwiTWlzQ29udHJvbGxlci5yYW5nZSIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlR3JvdXAiLCJNaXNDb250cm9sbGVyLmlzR3JvdXBTaG93biIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlQ2hhcnRPclRhYmxlVmlldyIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlVGFyZ2V0VmlldyIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlUmV2ZW51ZVZpZXciLCJNaXNDb250cm9sbGVyLnRvZ2dsZVNlY3RvclZpZXciLCJNaXNDb250cm9sbGVyLnJ1blJlcG9ydCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pbml0RGF0YSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnNlbGVjdGVkRmxvd25Nb250aCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmdldFByb2ZpbGVVc2VyTmFtZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnVwZGF0ZUhlYWRlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9uU2xpZGVNb3ZlIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2FsbE15RGFzaGJvYXJkIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2FsbEZsaWdodFByb2NTdGF0dXMiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jYWxsRmxpZ2h0Q291bnRCeVJlYXNvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNhbGxDb3Vwb25Db3VudEJ5RXhjZXB0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlblBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vcGVuUGllUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNsb3NlUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmlvbmljTG9hZGluZ1Nob3ciLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5hcHBseUNoYXJ0Q29sb3JDb2RlcyIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmdldEZhdm9yaXRlSXRlbXMiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jb2xvckZ1bmN0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuZm91ckJhckNvbG9yRnVuY3Rpb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci52YWx1ZUZvcm1hdEZ1bmN0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudG9vbFRpcENvbnRlbnRGdW5jdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnlBeGlzVGlja0Zvcm1hdEZ1bmN0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbmluZm9Qb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2xvc2VJbmZvUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUNvdW50IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaW9uaWNMb2FkaW5nSGlkZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRhYkxvY2tTbGlkZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLndlZWtEYXRhUHJldiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLndlZWtEYXRhTmV4dCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUZsaWdodFN0YXR1c1ZpZXciLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50b2dnbGVGbGlnaHRSZWFzb25WaWV3IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudG9nZ2xlQ0NFeGNlcHRpb25WaWV3IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIucnVuUmVwb3J0IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbkZsaWdodFByb2Nlc3NEcmlsbFBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vcGVuQ291bnBvbkNvdW50RHJpbGxQb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbkZsaWdodENvdW50RHJpbGxQb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuZHJpbGxEb3duUmVxdWVzdCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmdldERyaWxsRG93blVSTCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRhYlNsaWRlSGFzQ2hhbmdlZCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5EcmlsbERvd24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jbG9zZURyaWxsUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNsZWFyRHJpbGwiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pbml0aWF0ZUFycmF5IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaXNEcmlsbFJvd1NlbGVjdGVkIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuc2VhcmNoUmVzdWx0cyIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnBhZ2luYXRpb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5zZXRQYWdlIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIubGFzdFBhZ2UiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5yZXNldEFsbCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnNvcnQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5yYW5nZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUdyb3VwIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaXNHcm91cFNob3duIiwiTG9naW5Db250cm9sbGVyIiwiTG9naW5Db250cm9sbGVyLmNvbnN0cnVjdG9yIiwiTG9naW5Db250cm9sbGVyLmNsZWFyRXJyb3IiLCJMb2dpbkNvbnRyb2xsZXIuZG9Mb2dpbiIsIkNoYXJ0RXZlbnQiLCJDaGFydEV2ZW50LmNvbnN0cnVjdG9yIiwiQ2hhcnRFdmVudC5mYWN0b3J5IiwiQ2hhcnRFdmVudC5hcHBlbmRDbGljayIsInJlcG9ydEJ1aWxkZXJTZXJ2aWNlIiwicmVwb3J0QnVpbGRlclNlcnZpY2UuX2dlbmVyYXRlUmVwb3J0IiwicmVwb3J0U3ZjIiwicmVwb3J0U3ZjLl9ydW5SZXBvcnRBc3luYyIsInJlcG9ydFN2Yy5fcnVuUmVwb3J0RGF0YVVSTCIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERlZiIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERvYyIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydEJ1ZmZlciIsInJlcG9ydFN2Yy5nZXREYXRhVVJMIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0QmxvYiIsInJlcG9ydFN2Yy5zYXZlRmlsZSIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGUyIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGaWxlRW50cnkiLCJyZXBvcnRTdmMuc2F2ZUZpbGUuZ290RmlsZVdyaXRlciIsInJlcG9ydFN2Yy5zYXZlRmlsZS5mYWlsIiwicmVwb3J0U3ZjLnVuaXF1ZUZpbGVOYW1lIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0Il0sIm1hcHBpbmdzIjoiQUFBQSw0Q0FBNEM7QUFDNUMsNkNBQTZDO0FBQzdDLDhDQUE4QztBQUM5QyxnREFBZ0Q7QUFDaEQsb0RBQW9EOztBQ0pwRCx1Q0FBdUM7QUFFdkM7SUFBQUE7SUE2QkFDLENBQUNBO0lBNUJjRCxnQkFBVUEsR0FBeEJBO1FBQXlCRSxnQkFBbUJBO2FBQW5CQSxXQUFtQkEsQ0FBbkJBLHNCQUFtQkEsQ0FBbkJBLElBQW1CQTtZQUFuQkEsK0JBQW1CQTs7UUFDM0NBLElBQUlBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBO1FBQ3RCQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxFQUFFQSxVQUFDQSxLQUFLQTtZQUN2QkEsVUFBVUEsR0FBR0EsVUFBVUEsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsS0FBS0EsS0FBS0EsSUFBSUEsSUFBSUEsS0FBS0EsS0FBS0EsRUFBRUE7bUJBQ2xGQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxLQUFLQSxD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QVEsRUFBRSxLQUFLLEVBQUUsU0FBUztJQUNoREksaUNBQWlDQTtJQUNuQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDeEJBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLElBQUlBLElBQUlBLENBQUNBLFNBQVNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3BEQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxJQUFJQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNwS0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzlGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMxQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDekJBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2hDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUM3RkEsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDdENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUN0QkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDaENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNoR0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsZ0JBQWdCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNqQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDcERBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ3BLQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNoR0EsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDNUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ25HQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxjQUFjQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUMvQkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDbkNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ2hHQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMzQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDbEdBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO1FBQ2ZBLENBQUNBO0lBQ0hBLENBQUNBO0lBRURBLEVBQUVBLENBQUFBLENBQUNBLFNBQVNBLElBQUlBLGNBQWNBLENBQUNBLENBQUNBLENBQUNBO1FBQy9CQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNuQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDaEdBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzNDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNsR0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsVUFBV0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDNUJBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUM3RkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDM0RBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ3BLQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN6Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDOUZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsaUJBQWlCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNsQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDaENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzVGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDN0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLE9BQU9BLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3JDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMxRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDMUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQy9GQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNwQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDekZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDeEJBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2hDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUM1RkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzlGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMxQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3hDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUM3RkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsTUFBTUEsSUFBSUEsU0FBU0EsSUFBSUEsTUFBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDL0NBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ25DQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsYUFBYUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDM0NBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ2hHQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN6Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDOUZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsVUFBVUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDM0JBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzdCQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUN6RkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDMUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQy9GQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDN0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsaUJBQWlCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNsQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDaENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzVGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN6Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDOUZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDeENBLE1BQU1BLENBQUNBLENB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QUFDQSxPQUFPQSxDQUFDQSx3QkFBd0JBLENBQUNBLFFBQVFBLENBQUNBLEtBQUtBLEVBQUVBLEVBQUVBLE9BQU9BLEVBQUVBLFFBQVFBLENBQUNBLElBQUlBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUNqR0EsQ0FBQ0E7Z0JBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLElBQUVBLE1BQU1BLENBQUNBLENBQUFBLENBQUNBO29CQUM1QkEsS0FBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0Esd0JBQXdCQSxDQUFDQSxRQUFRQSxDQUFDQSxLQUFLQSxFQUFFQSxFQUFFQSxPQUFPQSxFQUFFQSxRQUFRQSxDQUFDQSxJQUFJQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDakdBLENBQUNBO2dCQUFBQSxJQUFJQSxDQUFBQSxDQUFDQTtvQkFDRkEsS0FBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsdUJBQXVCQSxDQUFDQSxRQUFRQSxDQUFDQSxLQUFLQSxFQUFFQSxFQUFFQSxPQUFPQSxFQUFFQSxRQUFRQSxDQUFDQSxJQUFJQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDaEdBLENBQUNBO1lBQ0xBLENBQUNBO1lBQ0RBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLElBQUlBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUM1QkEsS0FBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsMEJBQTBCQSxDQUFDQSxRQUFRQSxDQUFDQSxLQUFLQSxFQUFFQSxFQUFFQSxPQUFPQSxFQUFFQSxRQUFRQSxDQUFDQSxJQUFJQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNuR0EsQ0FBQ0E7WUFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsSUFBSUEsaUJBQWlCQSxDQUFDQSxD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Q0RBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ2xCQSxJQUFJQSxRQUFnQkEsQ0FBQ0E7WUFDckJBLFFBQVFBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLEtBQUtBLEdBQUdBLEVBQUVBLENBQUNBO1lBQzFDQSxJQUFJQSxPQUFPQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUNqREEsSUFBSUEsVUFBVUEsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsVUFBVUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDMURBLElBQUlBLFNBQVNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLEdBQUdBLEVBQUVBLENBQUNBO1lBQ3ZEQSxJQUFJQSxPQUFPQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUNqREEsSUFBSUEsWUFBWUEsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDaEVBLElBQUlBLE1BQU1BLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLE1BQU1BLEdBQUdBLEVBQUVBLENBQUNBO1lBRTlDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWkEsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0E7Z0JBQzlCQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtZQUMxQkEs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SUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDakRBLElBQUlBLFdBQVdBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLFdBQVdBLEdBQUdBLEVBQUVBLENBQUNBO1lBQzdEQSxJQUFJQSxNQUFNQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUM5Q0EsSUFBSUEsWUFBWUEsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDaEVBLElBQUlBLFVBQVVBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLFVBQVVBLEdBQUdBLEVBQUVBLENBQUNBO1lBRTFEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWkEsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0E7Z0JBQzlCQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtZQUMxQkEsQ0FBQ0E7WUFFREEsSUFBSUEsQ0FBQ0EsZ0JBQWdCQSxFQUFFQSxDQUFDQTtZQUV4QkEsT0FBT0EsR0FBR0E7Z0JBQ05BLFlBQVlBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBO2dCQUNwQ0Esa0JBQWtCQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFHQTtnQkFDdkRBLFFBQVFBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBO2dCQUM5QkEsY0FBY0EsRUFBRUEsUUFBUUE7Z0JBQ3hCQSxZQUFZQSxFQUFF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b0JBQ1osUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUMsQ0FBQyxDQUFDO2dCQUN0QyxDQUFDLENBQUNBLENBQUNBO1lBQ0pBLENBQUNBO1lBQUFBLElBQUlBLENBQUFBLENBQUNBO2dCQUNMQSxRQUFRQSxDQUFDQSxPQUFPQSxDQUFDQSxFQUFDQSxPQUFPQSxFQUFFQSxPQUFPQSxFQUFDQSxDQUFDQSxDQUFDQTtZQUN0Q0EsQ0FBQ0E7WUFFREEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7UUFDekJBLENBQUNBO1FBQUFkLENBQUNBO0lBRUZBLENBQUNBO0FBRUgsQ0FBQyxDQUFDLEVBQUUsQ0FBQyIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwaW5ncy90c2QuZC50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvaW9uaWMuZC50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvU2NyZWVuLmQudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi90eXBpbmdzL0lzVGFibGV0LmQudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi90eXBpbmdzL0luQXBwQnJvd3Nlci5kLnRzXCIgLz4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuY2xhc3MgVXRpbHMge1xyXG5cdHB1YmxpYyBzdGF0aWMgaXNOb3RFbXB0eSguLi52YWx1ZXM6IE9iamVjdFtdKTogYm9vbGVhbiB7XHJcblx0XHR2YXIgaXNOb3RFbXB0eSA9IHRydWU7XHJcblx0XHRfLmZvckVhY2godmFsdWVzLCAodmFsdWUpID0+IHtcclxuXHRcdFx0aXNOb3RFbXB0eSA9IGlzTm90RW1wdHkgJiYgKGFuZ3VsYXIuaXNEZWZpbmVkKHZhbHVlKSAmJiB2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gJydcclxuXHRcdFx0XHQmJiAhKChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNPYmplY3QodmFsdWUpKSAmJiBfLmlzRW1wdHkodmFsdWUpKSAmJiB2YWx1ZSAhPSAwKTtcclxuXHRcdH0pO1xyXG5cdFx0cmV0dXJuIGlzTm90RW1wdHk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc3RhdGljIGlzTGFuZHNjYXBlKCk6IGJvb2xlYW4ge1xyXG5cdFx0dmFyIGlzTGFuZHNjYXBlOiBib29sZWFuID0gZmFsc2U7XHJcblx0XHRpZiAod2luZG93ICYmIHdpbmRvdy5zY3JlZW4gJiYgd2luZG93LnNjcmVlbi5vcmllbnRhdGlvbikge1xyXG5cdFx0XHR2YXIgdHlwZTogc3RyaW5nID0gPHN0cmluZz4oXy5pc1N0cmluZyh3aW5kb3cuc2NyZWVuLm9yaWVudGF0aW9uKSA/IHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24gOiB3aW5kb3cuc2NyZWVuLm9yaWVudGF0aW9uLnR5cGUpO1xyXG5cdFx0XHRpZiAodHlwZSkge1xyXG5cdFx0XHRcdGlzTGFuZHNjYXBlID0gdHlwZS5pbmRleE9mKCdsYW5kc2NhcGUnKSA+PSAwO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gaXNMYW5kc2NhcGU7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc3RhdGljIGdldFRvZGF5RGF0ZSgpOiBEYXRlIHtcclxuXHRcdHZhciB0b2RheURhdGUgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0dG9kYXlEYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cdFx0cmV0dXJuIHRvZGF5RGF0ZTtcclxuXHR9XHJcblx0cHJpdmF0ZSBzdGF0aWMgaXNJbnRlZ2VyKG51bWJlcjogQmlnSnNMaWJyYXJ5LkJpZ0pTKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gcGFyc2VJbnQobnVtYmVyLnRvU3RyaW5nKCkpID09ICtudW1iZXI7XHJcblx0fVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbmludGVyZmFjZSBQb2ludE9iamVjdCB7XHJcblx0Y29kZTogc3RyaW5nLFxyXG5cdGRlc2NyaXB0aW9uOiBzdHJpbmdcclxufVxyXG5cclxuaW50ZXJmYWNlIElMb2NhbFN0b3JhZ2VTZXJ2aWNlIHtcclxuXHRzZXQoa2V5SWQ6IHN0cmluZywga2V5dmFsdWU6IHN0cmluZyk6IHZvaWQ7XHJcblx0Z2V0KGtleUlkOiBzdHJpbmcsIGRlZmF1bHRWYWx1ZTogc3RyaW5nKTogc3RyaW5nO1xyXG5cdHNldE9iamVjdChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogYW55W10pOiB2b2lkO1xyXG5cdGdldE9iamVjdChrZXlJZDogc3RyaW5nKTogYW55O1xyXG5cdGlzUmVjZW50RW50cnlBdmFpbGFibGUob3JnaW5PYmplY3Q6IFBvaW50T2JqZWN0LCB0eXBlOiBzdHJpbmcpOiB2b2lkO1xyXG5cdGFkZFJlY2VudEVudHJ5KGRhdGE6IGFueSwgdHlwZTogc3RyaW5nKTogdm9pZDtcclxufVxyXG5cclxuY2xhc3MgTG9jYWxTdG9yYWdlU2VydmljZSBpbXBsZW1lbnRzIElMb2NhbFN0b3JhZ2VTZXJ2aWNlIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckd2luZG93J107XHJcblx0cHJpdmF0ZSByZWNlbnRFbnRyaWVzOiBbUG9pbnRPYmplY3RdO1xyXG5cclxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlKSB7XHJcblx0fVxyXG5cclxuXHRzZXQoa2V5SWQ6IHN0cmluZywga2V5dmFsdWU6IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0dGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gPSBrZXl2YWx1ZTtcclxuXHR9XHJcblx0Z2V0KGtleUlkOiBzdHJpbmcsIGRlZmF1bHRWYWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSB8fCBkZWZhdWx0VmFsdWU7XHJcblx0fVxyXG5cdHNldE9iamVjdChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogYW55W10pOiB2b2lkIHtcclxuXHRcdHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdID0gIEpTT04uc3RyaW5naWZ5KGtleXZhbHVlKTtcclxuXHR9XHJcblx0Z2V0T2JqZWN0KGtleUlkOiBzdHJpbmcpOiBhbnkge1xyXG5cdFx0cmV0dXJuIHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdID8gSlNPTi5wYXJzZSh0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSkgOiB1bmRlZmluZWQ7XHJcblx0fVxyXG5cclxuXHRpc1JlY2VudEVudHJ5QXZhaWxhYmxlKG9yZ2luT2JqZWN0OiBQb2ludE9iamVjdCwgdHlwZTogc3RyaW5nKSB7XHJcblx0XHR0aGlzLnJlY2VudEVudHJpZXMgPSB0aGlzLmdldE9iamVjdCh0eXBlKSA/IHRoaXMuZ2V0T2JqZWN0KHR5cGUpIDogW107XHJcblx0XHRyZXR1cm4gdGhpcy5yZWNlbnRFbnRyaWVzLmZpbHRlcihmdW5jdGlvbiAoZW50cnkpIHsgcmV0dXJuIGVudHJ5LmNvZGUgPT09IG9yZ2luT2JqZWN0LmNvZGUgfSk7XHJcblx0fVxyXG5cclxuXHRhZGRSZWNlbnRFbnRyeShkYXRhOiBhbnksIHR5cGU6IHN0cmluZykge1xyXG5cdFx0dmFyIG9yZ2luT2JqZWN0OiBQb2ludE9iamVjdFx0PVx0ZGF0YSA/IGRhdGEub3JpZ2luYWxPYmplY3QgOiB1bmRlZmluZWQ7XHJcblxyXG5cdFx0aWYgKG9yZ2luT2JqZWN0KSB7XHJcblx0XHRcdGlmICh0aGlzLmlzUmVjZW50RW50cnlBdmFpbGFibGUob3JnaW5PYmplY3QsIHR5cGUpLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdHRoaXMucmVjZW50RW50cmllcyA9IHRoaXMuZ2V0T2JqZWN0KHR5cGUpID8gdGhpcy5nZXRPYmplY3QodHlwZSkgOiBbXTtcclxuXHRcdFx0XHQodGhpcy5yZWNlbnRFbnRyaWVzLmxlbmd0aCA9PSAzKSA/IHRoaXMucmVjZW50RW50cmllcy5wb3AoKSA6IHRoaXMucmVjZW50RW50cmllcztcclxuXHRcdFx0XHR0aGlzLnJlY2VudEVudHJpZXMudW5zaGlmdChvcmdpbk9iamVjdCk7XHJcblx0XHRcdFx0dGhpcy5zZXRPYmplY3QodHlwZSwgdGhpcy5yZWNlbnRFbnRyaWVzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuaW50ZXJmYWNlIElDb3Jkb3ZhQ2FsbCB7XHJcblx0KCk6IHZvaWQ7XHJcbn1cclxuXHJcbmNsYXNzIENvcmRvdmFTZXJ2aWNlIHtcclxuXHJcblx0cHJpdmF0ZSBjb3Jkb3ZhUmVhZHk6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRwcml2YXRlIHBlbmRpbmdDYWxsczogSUNvcmRvdmFDYWxsW10gPSBbXTtcclxuXHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VyZWFkeScsICgpID0+IHtcclxuXHRcdFx0dGhpcy5jb3Jkb3ZhUmVhZHkgPSB0cnVlO1xyXG5cdFx0XHR0aGlzLmV4ZWN1dGVQZW5kaW5nKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGV4ZWMoZm46IElDb3Jkb3ZhQ2FsbCwgYWx0ZXJuYXRpdmVGbj86IElDb3Jkb3ZhQ2FsbCkge1xyXG5cdFx0aWYgKHRoaXMuY29yZG92YVJlYWR5KSB7XHJcblx0XHRcdGZuKCk7XHJcblx0XHR9IGVsc2UgaWYgKCFhbHRlcm5hdGl2ZUZuKSB7XHJcblx0XHRcdHRoaXMucGVuZGluZ0NhbGxzLnB1c2goZm4pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0YWx0ZXJuYXRpdmVGbigpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBleGVjdXRlUGVuZGluZygpIHtcclxuXHRcdHRoaXMucGVuZGluZ0NhbGxzLmZvckVhY2goKGZuKSA9PiB7XHJcblx0XHRcdGZuKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnBlbmRpbmdDYWxscyA9IFtdO1xyXG5cdH1cclxuXHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vdHlwaW5ncy9hbmd1bGFyanMvYW5ndWxhci5kLnRzXCIvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkNvcmRvdmFTZXJ2aWNlLnRzXCIgLz5cclxuXHJcbmludGVyZmFjZSBJTmV0U2VydmljZSB7XHJcblx0Z2V0RGF0YShmcm9tVXJsOiBzdHJpbmcpOiBuZy5JSHR0cFByb21pc2U8YW55PjtcclxuXHRwb3N0RGF0YSh0b1VybDogc3RyaW5nLCBkYXRhOiBhbnkpOiBuZy5JSHR0cFByb21pc2U8YW55PjtcclxuXHRkZWxldGVEYXRhKHRvVXJsOiBzdHJpbmcpOiBuZy5JSHR0cFByb21pc2U8YW55PjtcclxuXHRjaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpOiBuZy5JUHJvbWlzZTxib29sZWFuPjtcclxufVxyXG5cclxuY2xhc3MgTmV0U2VydmljZSBpbXBsZW1lbnRzIElOZXRTZXJ2aWNlIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckaHR0cCcsICdDb3Jkb3ZhU2VydmljZScsICckcScsICdVUkxfV1MnLCAnT1dORVJfQ0FSUklFUl9DT0RFJ107XHJcblx0cHJpdmF0ZSBmaWxlVHJhbnNmZXI6IEZpbGVUcmFuc2ZlcjtcclxuXHRwcml2YXRlIGlzU2VydmVyQXZhaWxhYmxlOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgJGh0dHA6IG5nLklIdHRwU2VydmljZSwgcHJpdmF0ZSBjb3Jkb3ZhU2VydmljZTogQ29yZG92YVNlcnZpY2UsIHByb3RlY3RlZCAkcTogbmcuSVFTZXJ2aWNlLCBwdWJsaWMgVVJMX1dTOiBzdHJpbmcsIHByaXZhdGUgT1dORVJfQ0FSUklFUl9DT0RFOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMuJGh0dHAuZGVmYXVsdHMudGltZW91dCA9IDYwMDAwO1xyXG5cdFx0Y29yZG92YVNlcnZpY2UuZXhlYygoKSA9PiB7XHJcblx0XHRcdC8vIHRoaXMuZmlsZVRyYW5zZmVyID0gbmV3IEZpbGVUcmFuc2ZlcigpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRnZXREYXRhKGZyb21Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcclxuXHRcdHZhciB1cmw6IHN0cmluZyA9IFNFUlZFUl9VUkwgKyBmcm9tVXJsO1xyXG5cdFx0cmV0dXJuIHRoaXMuJGh0dHAuZ2V0KHVybCk7XHJcblx0fVxyXG5cclxuXHRwb3N0RGF0YSh0b1VybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IG5nLklSZXF1ZXN0U2hvcnRjdXRDb25maWcpOiBuZy5JSHR0cFByb21pc2U8YW55PiB7XHJcblx0XHRyZXR1cm4gdGhpcy4kaHR0cC5wb3N0KFNFUlZFUl9VUkwgKyB0b1VybCwgdGhpcy5hZGRNZXRhSW5mbyhkYXRhKSk7XHJcblx0fVxyXG5cclxuXHRkZWxldGVEYXRhKHRvVXJsOiBzdHJpbmcpOiBuZy5JSHR0cFByb21pc2U8YW55PiB7XHJcblx0XHRyZXR1cm4gdGhpcy4kaHR0cC5kZWxldGUoU0VSVkVSX1VSTCArIHRvVXJsKTtcclxuXHR9XHJcblxyXG5cdHVwbG9hZEZpbGUoXHJcblx0XHR0b1VybDogc3RyaW5nLCB1cmxGaWxlOiBzdHJpbmcsXHJcblx0XHRvcHRpb25zOiBGaWxlVXBsb2FkT3B0aW9ucywgc3VjY2Vzc0NhbGxiYWNrOiAocmVzdWx0OiBGaWxlVXBsb2FkUmVzdWx0KSA9PiB2b2lkLFxyXG5cdFx0ZXJyb3JDYWxsYmFjazogKGVycm9yOiBGaWxlVHJhbnNmZXJFcnJvcikgPT4gdm9pZCwgcHJvZ3Jlc3NDYWxsYmFjaz86IChwcm9ncmVzc0V2ZW50OiBQcm9ncmVzc0V2ZW50KSA9PiB2b2lkKSB7XHJcblx0XHRpZiAoIXRoaXMuZmlsZVRyYW5zZmVyKSB7XHJcblx0XHRcdHRoaXMuZmlsZVRyYW5zZmVyID0gbmV3IEZpbGVUcmFuc2ZlcigpO1xyXG5cdFx0fVxyXG5cdFx0Y29uc29sZS5sb2cob3B0aW9ucy5wYXJhbXMpO1xyXG5cdFx0dGhpcy5maWxlVHJhbnNmZXIub25wcm9ncmVzcyA9IHByb2dyZXNzQ2FsbGJhY2s7XHJcblx0XHR2YXIgdXJsOiBzdHJpbmcgPSBTRVJWRVJfVVJMICsgdG9Vcmw7XHJcblx0XHR0aGlzLmZpbGVUcmFuc2Zlci51cGxvYWQodXJsRmlsZSwgdXJsLCBzdWNjZXNzQ2FsbGJhY2ssIGVycm9yQ2FsbGJhY2ssIG9wdGlvbnMpO1xyXG5cdH1cclxuXHJcblx0Y2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkoKTogbmcuSVByb21pc2U8Ym9vbGVhbj4ge1xyXG5cdFx0dmFyIGF2YWlsYWJpbGl0eTogYm9vbGVhbiA9IHRydWU7XHJcblxyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGJvb2xlYW4+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cclxuXHRcdHRoaXMuY29yZG92YVNlcnZpY2UuZXhlYygoKSA9PiB7XHJcblx0XHRcdGlmICh3aW5kb3cubmF2aWdhdG9yKSB7IC8vIG9uIGRldmljZVxyXG5cdFx0XHRcdHZhciBuYXZpZ2F0b3I6IE5hdmlnYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3I7XHJcblx0XHRcdFx0aWYgKG5hdmlnYXRvci5jb25uZWN0aW9uICYmICgobmF2aWdhdG9yLmNvbm5lY3Rpb24udHlwZSA9PSBDb25uZWN0aW9uLk5PTkUpIHx8IChuYXZpZ2F0b3IuY29ubmVjdGlvbi50eXBlID09IENvbm5lY3Rpb24uVU5LTk9XTikpKSB7XHJcblx0XHRcdFx0XHRhdmFpbGFiaWxpdHkgPSBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0ZGVmLnJlc29sdmUoYXZhaWxhYmlsaXR5KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdHNlcnZlcklzQXZhaWxhYmxlKCk6IGJvb2xlYW4ge1xyXG5cdFx0dmFyIHRoYXQ6IE5ldFNlcnZpY2UgPSB0aGlzO1xyXG5cclxuXHRcdHZhciBzZXJ2ZXJJc0F2YWlsYWJsZSA9IHRoaXMuY2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkoKS50aGVuKChyZXN1bHQ6IGJvb2xlYW4pID0+IHtcclxuXHRcdFx0dGhhdC5pc1NlcnZlckF2YWlsYWJsZSA9IHJlc3VsdDtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLmlzU2VydmVyQXZhaWxhYmxlO1xyXG5cdH1cclxuXHJcblx0Y2FuY2VsQWxsVXBsb2FkRG93bmxvYWQoKSB7XHJcblx0XHRpZiAodGhpcy5maWxlVHJhbnNmZXIpIHtcclxuXHRcdFx0dGhpcy5maWxlVHJhbnNmZXIuYWJvcnQoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGFkZE1ldGFJbmZvKHJlcXVlc3REYXRhOiBhbnkpOiBhbnkge1xyXG5cdFx0dmFyIGRldmljZTogSW9uaWMuSURldmljZSA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpXHJcblx0XHR2YXIgbW9kZWw6IHN0cmluZyA9ICdkZXZpY2UgSW5mbyc7XHJcblx0XHR2YXIgb3NUeXBlOiBzdHJpbmcgPSAnOC40JztcclxuXHRcdHZhciBvc1ZlcnNpb246IHN0cmluZyA9ICdpb3MnO1xyXG5cdFx0dmFyIGRldmljZVRva2VuOiBzdHJpbmcgPSAnc3RyaW5nJztcclxuXHRcdGlmIChkZXZpY2UpIHtcclxuXHRcdFx0bW9kZWwgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5tb2RlbDtcclxuXHRcdFx0b3NUeXBlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkucGxhdGZvcm07XHJcblx0XHRcdG9zVmVyc2lvbiA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLnZlcnNpb247XHJcblx0XHR9XHJcblx0XHRpZiAoIW1vZGVsKSB7XHJcblx0XHRcdG1vZGVsID0gJ2RldmljZSBJbmZvJztcdFxyXG5cdFx0fVxyXG5cdFx0aWYgKCFvc1R5cGUpIHtcclxuXHRcdFx0b3NUeXBlID0gJzguNCc7XHRcclxuXHRcdH1cclxuXHRcdGlmICghb3NWZXJzaW9uKSB7XHJcblx0XHRcdG9zVmVyc2lvbiA9ICdpb3MnO1x0XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBtZXRhSW5mbyA9IHtcclxuXHRcdFx0J2NoYW5uZWxJZGVudGlmaWVyJzogJ01PQicsXHJcblx0XHRcdCdkYXRlVGltZVN0YW1wJzogbmV3IERhdGUoKS5nZXRUaW1lKCksXHJcblx0XHRcdCdvd25lckNhcnJpZXJDb2RlJzogdGhpcy5PV05FUl9DQVJSSUVSX0NPREUsXHJcblx0XHRcdCdhZGRpdGlvbmFsSW5mbyc6IHtcclxuXHRcdFx0XHQnZGV2aWNlVHlwZSc6IHdpbmRvdy5pc1RhYmxldCA/ICdUYWJsZXQnIDogJ1Bob25lJyxcclxuXHRcdFx0XHQnbW9kZWwnOiBtb2RlbCxcclxuXHRcdFx0XHQnb3NUeXBlJzogb3NUeXBlLFxyXG5cdFx0XHRcdCdvc1ZlcnNpb24nOiBvc1ZlcnNpb24sXHJcblx0XHRcdFx0J2RldmljZVRva2VuJzogZGV2aWNlVG9rZW4sXHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dmFyIHJlcXVlc3RPYmogPSB7XHJcblx0XHRcdCdtZXRhSW5mbyc6IG1ldGFJbmZvLFxyXG5cdFx0XHQncmVxdWVzdERhdGEnOiByZXF1ZXN0RGF0YVxyXG5cdFx0fTtcclxuXHRcdHJldHVybiByZXF1ZXN0T2JqO1xyXG5cdH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTmV0U2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJDb3Jkb3ZhU2VydmljZS50c1wiIC8+XHJcblxyXG5tb2R1bGUgZXJyb3JoYW5kbGVyIHtcclxuXHRleHBvcnQgY29uc3QgU1RBVFVTX0ZBSUw6IHN0cmluZyA9ICdmYWlsJztcclxuXHRleHBvcnQgY29uc3QgU0VWRVJJVFlfRVJST1JfSEFSRDogc3RyaW5nID0gJ0hBUkQnO1xyXG5cdGV4cG9ydCBjb25zdCBTRVZFUklUWV9FUlJPUl9TT0ZUOiBzdHJpbmcgPSAnU09GVCc7XHJcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OX1RPS0VOID0gJ1NFQy4wMjUnO1xyXG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX0lOVkFMSURfU0VTU0lPTiA9ICdTRVMuMDA0JztcclxuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9UT0tFTl9FWFBJUkVEID0gJ1NFQy4wMzgnO1xyXG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX0lOVkFMSURfVVNFUl9TRVNTSU9OX0VYUElSRUQgPSAnU0VTLjAwMyc7XHJcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfTk9fUkVTVUxUID0gJ0NPTS4xMTEnO1xyXG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX05PX1JPVVRFID0gJ0ZMVC4wMTAnO1xyXG59XHJcblxyXG5jbGFzcyBFcnJvckhhbmRsZXJTZXJ2aWNlIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydOZXRTZXJ2aWNlJywgJ0NvcmRvdmFTZXJ2aWNlJywgJyRxJywgJyRyb290U2NvcGUnXTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIG5ldFNlcnZpY2U6IE5ldFNlcnZpY2UsIHByaXZhdGUgY29yZG92YVNlcnZpY2U6IENvcmRvdmFTZXJ2aWNlLCBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UsXHJcblx0XHRwcml2YXRlICRyb290U2NvcGU6IG5nLklTY29wZSkge1xyXG5cdH1cclxuXHJcblx0dmFsaWRhdGVSZXNwb25zZShyZXNwb25zZTogYW55KSB7XHJcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XHJcblx0XHRpZiAodGhpcy5oYXNFcnJvcnMoZXJyb3JzKSB8fCBlcnJvcmhhbmRsZXIuU1RBVFVTX0ZBSUwgPT0gcmVzcG9uc2Uuc3RhdHVzKSB7XHJcblx0XHRcdGlmICghdGhpcy5oYXNJbnZhbGlkU2Vzc2lvbkVycm9yKGVycm9ycykgJiYgIXRoaXMuaGFzTm9SZXN1bHRFcnJvcihlcnJvcnMpKSB7XHJcblx0XHRcdFx0Ly8gYnJvYWRjYXN0IHRvIGFwcGNvbnRyb2xsZXIgc2VydmVyIGVycm9yXHJcblx0XHRcdFx0dGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3NlcnZlckVycm9yJywgcmVzcG9uc2UpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRpc05vUmVzdWx0Rm91bmQocmVzcG9uc2U6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xyXG5cdFx0cmV0dXJuIHRoaXMuaGFzTm9SZXN1bHRFcnJvcihlcnJvcnMpO1xyXG5cdH1cclxuXHJcblx0aXNTZXNzaW9uSW52YWxpZChyZXNwb25zZTogYW55KTogYm9vbGVhbiB7XHJcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XHJcblx0XHRyZXR1cm4gdGhpcy5oYXNJbnZhbGlkU2Vzc2lvbkVycm9yKGVycm9ycyk7XHJcblx0fVxyXG5cclxuXHRoYXNIYXJkRXJyb3JzKHJlc3BvbnNlOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcclxuXHRcdHJldHVybiB0aGlzLmhhc0hhcmRFcnJvcihlcnJvcnMpO1xyXG5cdH1cclxuXHJcblx0aGFzU29mdEVycm9ycyhyZXNwb25zZTogYW55KTogYm9vbGVhbiB7XHJcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XHJcblx0XHRyZXR1cm4gdGhpcy5oYXNTb2Z0RXJyb3IoZXJyb3JzKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFzRXJyb3JzKGVycm9yczogYW55KTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gZXJyb3JzLmxlbmd0aCA+IDA7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhc0ludmFsaWRTZXNzaW9uRXJyb3IoZXJyb3JzOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBfLnNvbWUoZXJyb3JzLCAoZXJyb3I6IGFueSkgPT4ge1xyXG5cdFx0XHRyZXR1cm4gZXJyb3IgJiYgZXJyb3JoYW5kbGVyLlNFVkVSSVRZX0VSUk9SX0hBUkQgPT0gZXJyb3Iuc2V2ZXJpdHkgJiZcclxuXHRcdFx0KGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX0lOVkFMSURfU0VTU0lPTl9UT0tFTiA9PSBlcnJvci5jb2RlIHx8XHJcblx0XHRcdFx0ZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OID09IGVycm9yLmNvZGUgfHxcclxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1VTRVJfU0VTU0lPTl9FWFBJUkVEID09IGVycm9yLmNvZGUgfHxcclxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9UT0tFTl9FWFBJUkVEID09IGVycm9yLmNvZGUpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhc05vUmVzdWx0RXJyb3IoZXJyb3JzOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBfLnNvbWUoZXJyb3JzLCAoZXJyb3I6IGFueSkgPT4ge1xyXG5cdFx0XHRyZXR1cm4gZXJyb3IgJiYgZXJyb3JoYW5kbGVyLlNFVkVSSVRZX0VSUk9SX0hBUkQgPT0gZXJyb3Iuc2V2ZXJpdHkgJiZcclxuXHRcdFx0KGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX05PX1JFU1VMVCA9PSBlcnJvci5jb2RlIHx8XHJcblx0XHRcdFx0ZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfTk9fUk9VVEUgPT0gZXJyb3IuY29kZSk7XHJcblx0XHR9KSAmJiBlcnJvcnMubGVuZ3RoID09IDE7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhc0hhcmRFcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XHJcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfSEFSRCA9PSBlcnJvci5zZXZlcml0eTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYXNTb2Z0RXJyb3IoZXJyb3JzOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBfLnNvbWUoZXJyb3JzLCAoZXJyb3I6IGFueSkgPT4ge1xyXG5cdFx0XHRyZXR1cm4gZXJyb3IgJiYgZXJyb3JoYW5kbGVyLlNFVkVSSVRZX0VSUk9SX1NPRlQgPT0gZXJyb3Iuc2V2ZXJpdHk7XHJcblx0XHR9KTtcclxuXHR9XHJcbn0iLG51bGwsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTmV0U2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJDb3Jkb3ZhU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJFcnJvckhhbmRsZXJTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIklTZXNzaW9uSHR0cFByb21pc2UudHNcIiAvPlxyXG5cclxubW9kdWxlIHNlc3Npb25zZXJ2aWNlIHtcclxuXHRleHBvcnQgY29uc3QgSEVBREVSX1JFRlJFU0hfVE9LRU5fS0VZOiBzdHJpbmcgPSAneC1yZWZyZXNoLXRva2VuJztcclxuXHRleHBvcnQgY29uc3QgSEVBREVSX0FDQ0VTU19UT0tFTl9LRVk6IHN0cmluZyA9ICd4LWFjY2Vzcy10b2tlbic7XHJcblx0ZXhwb3J0IGNvbnN0IFJFRlJFU0hfU0VTU0lPTl9JRF9VUkw6IHN0cmluZyA9ICcvdXNlci9nZXRBY2Nlc3NUb2tlbic7XHJcbn1cclxuXHJcbmNsYXNzIFNlc3Npb25TZXJ2aWNlIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydOZXRTZXJ2aWNlJywgJ0Vycm9ySGFuZGxlclNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZScsICckaHR0cCddO1xyXG5cclxuXHRwcml2YXRlIGFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzOiBJQWNjZXNzVG9rZW5SZWZyZXNoZWRIYW5kbGVyW107XHJcblx0cHJpdmF0ZSBzZXNzaW9uSWQ6IHN0cmluZztcclxuXHRwcml2YXRlIGNyZWRlbnRpYWxJZDogc3RyaW5nO1xyXG5cdHByaXZhdGUgaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzczogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgbmV0U2VydmljZTogTmV0U2VydmljZSwgcHJpdmF0ZSBlcnJvckhhbmRsZXJTZXJ2aWNlOiBFcnJvckhhbmRsZXJTZXJ2aWNlLCBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UsXHJcblx0XHRwcml2YXRlICRyb290U2NvcGU6IG5nLklTY29wZSwgcHJpdmF0ZSAkaHR0cDogbmcuSUh0dHBTZXJ2aWNlKSB7XHJcblx0XHR0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzID0gW107XHJcblx0XHR0aGlzLnNlc3Npb25JZCA9IG51bGw7XHJcblx0XHR0aGlzLmNyZWRlbnRpYWxJZCA9IG51bGw7XHJcblx0fVxyXG5cclxuXHRyZXNvbHZlUHJvbWlzZShwcm9taXNlOiBJU2Vzc2lvbkh0dHBQcm9taXNlKSB7XHJcblx0XHRwcm9taXNlLnJlc3BvbnNlLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdGlmICghdGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0hhcmRFcnJvcnMocmVzcG9uc2UpIHx8IHRoaXMuZXJyb3JIYW5kbGVyU2VydmljZS5pc1Nlc3Npb25JbnZhbGlkKHJlc3BvbnNlKSkge1xyXG5cdFx0XHRcdGlmICghdGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmlzU2Vzc2lvbkludmFsaWQocmVzcG9uc2UpKSB7XHJcblx0XHRcdFx0XHRwcm9taXNlLmRlZmZlcmVkLnJlc29sdmUocHJvbWlzZS5yZXNwb25zZSk7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnc2Vzc2lvbiBpcyB2YWxpZCcpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0aGlzLmFkZEFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzdGVuZXIocHJvbWlzZSk7XHJcblx0XHRcdFx0XHRpZiAoIXRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcykge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVmcmVzaGluZyBzZXNzaW9uIHRva2VuJyk7XHJcblx0XHRcdFx0XHRcdHRoaXMucmVmcmVzaFNlc3Npb25JZCgpLnRoZW4oXHJcblx0XHRcdFx0XHRcdFx0KHRva2VuUmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICh0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaGFzSGFyZEVycm9ycyh0b2tlblJlc3BvbnNlKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnNldFNlc3Npb25JZChudWxsKTtcclxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHZhciByZXNwb25zZUhlYWRlciA9IHRva2VuUmVzcG9uc2UuaGVhZGVycygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgYWNjZXNzVG9rZW46IHN0cmluZyA9IHJlc3BvbnNlSGVhZGVyW3Nlc3Npb25zZXJ2aWNlLkhFQURFUl9BQ0NFU1NfVE9LRU5fS0VZXTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRTZXNzaW9uSWQoYWNjZXNzVG9rZW4pO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5pc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoIXRoaXMuZ2V0U2Vzc2lvbklkKCkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5hY2Nlc3NUb2tlbk5vdFJlZnJlc2hlZCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZXJyb3Igb24gYWNjZXNzIHRva2VuIHJlZnJlc2gnKTtcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuc2V0U2Vzc2lvbklkKG51bGwpO1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuZ2V0Q3JlZGVudGlhbElkKCkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5hY2Nlc3NUb2tlbk5vdFJlZnJlc2hlZCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cHJvbWlzZS5kZWZmZXJlZC5yZWplY3QoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRwcm9taXNlLmRlZmZlcmVkLnJlamVjdCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGFkZEFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzdGVuZXIobGlzdGVuZXI6IElBY2Nlc3NUb2tlblJlZnJlc2hlZEhhbmRsZXIpIHtcclxuXHRcdHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMucHVzaChsaXN0ZW5lcik7XHJcblx0fVxyXG5cclxuXHRyZW1vdmVBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKGxpc3RlbmVyVG9SZW1vdmU6IElBY2Nlc3NUb2tlblJlZnJlc2hlZEhhbmRsZXIpIHtcclxuXHRcdF8ucmVtb3ZlKHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMsIChsaXN0ZW5lcikgPT4ge1xyXG5cdFx0XHRyZXR1cm4gbGlzdGVuZXIgPT0gbGlzdGVuZXJUb1JlbW92ZTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0c2V0Q3JlZGVudGlhbElkKGNyZWRJZDogc3RyaW5nKSB7XHJcblx0XHR0aGlzLmNyZWRlbnRpYWxJZCA9IGNyZWRJZDtcclxuXHRcdHRoaXMuJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bc2Vzc2lvbnNlcnZpY2UuSEVBREVSX1JFRlJFU0hfVE9LRU5fS0VZXSA9IGNyZWRJZDtcclxuXHR9XHJcblxyXG5cdHNldFNlc3Npb25JZChzZXNzaW9uSWQ6IHN0cmluZykge1xyXG5cdFx0dGhpcy5zZXNzaW9uSWQgPSBzZXNzaW9uSWQ7XHJcblx0XHR0aGlzLiRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uW3Nlc3Npb25zZXJ2aWNlLkhFQURFUl9BQ0NFU1NfVE9LRU5fS0VZXSA9IHNlc3Npb25JZDtcclxuXHR9XHJcblxyXG5cdGdldFNlc3Npb25JZCgpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHRoaXMuc2Vzc2lvbklkID8gdGhpcy5zZXNzaW9uSWQgOiBudWxsO1xyXG5cdH1cclxuXHJcblx0Z2V0Q3JlZGVudGlhbElkKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gdGhpcy5jcmVkZW50aWFsSWQgPyB0aGlzLmNyZWRlbnRpYWxJZCA6IG51bGw7XHJcblx0fVxyXG5cclxuXHRjbGVhckxpc3RlbmVycygpIHtcclxuXHRcdHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMgPSBbXTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVmcmVzaFNlc3Npb25JZCgpOiBuZy5JSHR0cFByb21pc2U8YW55PiB7XHJcblx0XHR0aGlzLmlzUmVmcmVzaFNlc3Npb25JZEluUHJvZ3Jlc3MgPSB0cnVlO1xyXG5cdFx0dmFyIGFjY2Vzc1Rva2VuUmVxdWVzdDogYW55ID0ge1xyXG5cdFx0XHRyZWZyZXNoVG9rZW46IHRoaXMuY3JlZGVudGlhbElkXHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5uZXRTZXJ2aWNlLnBvc3REYXRhKHNlc3Npb25zZXJ2aWNlLlJFRlJFU0hfU0VTU0lPTl9JRF9VUkwsIGFjY2Vzc1Rva2VuUmVxdWVzdCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkKCkge1xyXG5cdFx0Xy5mb3JFYWNoKHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMsIChsaXN0ZW5lcikgPT4ge1xyXG5cdFx0XHRpZiAobGlzdGVuZXIub25Ub2tlbkZhaWxlZCkge1xyXG5cdFx0XHRcdGxpc3RlbmVyLm9uVG9rZW5GYWlsZWQobGlzdGVuZXIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lcik7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYWNjZXNzVG9rZW5SZWZyZXNoZWQoKSB7XHJcblx0XHRfLmZvckVhY2godGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcywgKGxpc3RlbmVyKSA9PiB7XHJcblx0XHRcdGlmIChsaXN0ZW5lcikge1xyXG5cdFx0XHRcdGlmIChsaXN0ZW5lci5vblRva2VuUmVmcmVzaGVkKSB7XHJcblx0XHRcdFx0XHRsaXN0ZW5lci5vblRva2VuUmVmcmVzaGVkKGxpc3RlbmVyKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGxpc3RlbmVyKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdMZW5ndGggPSAnLCB0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLmxlbmd0aCk7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5yZW1vdmVBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKGxpc3RlbmVyKTtcclxuXHRcdH0pO1xyXG5cdH1cclxufSIsbnVsbCwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOZXRTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkNvcmRvdmFTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIlNlc3Npb25TZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkVycm9ySGFuZGxlclNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiSVNlc3Npb25IdHRwUHJvbWlzZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJHZW5lcmljUmVzcG9uc2UudHNcIiAvPlxyXG5cclxubW9kdWxlIGRhdGFwcm92aWRlciB7XHJcblx0ZXhwb3J0IGNvbnN0IFNFUlZJQ0VfVVJMX0xPR09VVCA9ICcvdXNlci9sb2dvdXQnO1xyXG59XHJcblxyXG5jbGFzcyBEYXRhUHJvdmlkZXJTZXJ2aWNlIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydOZXRTZXJ2aWNlJywgJ0NvcmRvdmFTZXJ2aWNlJywgJyRxJywgJyRyb290U2NvcGUnLCAnRXJyb3JIYW5kbGVyU2VydmljZScsICdTZXNzaW9uU2VydmljZScsICdPV05FUl9DQVJSSUVSX0NPREUnXTtcclxuXHJcblx0cHJpdmF0ZSBpc0Nvbm5lY3RlZFRvTmV0d29yazogYm9vbGVhbiA9IHRydWU7XHJcblx0cHJpdmF0ZSBuYXZpZ2F0b3I6IE5hdmlnYXRvcjtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIG5ldFNlcnZpY2U6IE5ldFNlcnZpY2UsIHByaXZhdGUgY29yZG92YVNlcnZpY2U6IENvcmRvdmFTZXJ2aWNlLCBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UsXHJcblx0XHRwcml2YXRlICRyb290U2NvcGU6IG5nLklTY29wZSwgcHJpdmF0ZSBlcnJvckhhbmRsZXJTZXJ2aWNlOiBFcnJvckhhbmRsZXJTZXJ2aWNlLFxyXG5cdFx0cHJpdmF0ZSBzZXNzaW9uU2VydmljZTogU2Vzc2lvblNlcnZpY2UsIHByaXZhdGUgT1dORVJfQ0FSUklFUl9DT0RFOiBzdHJpbmcpIHtcclxuXHJcblx0XHR0aGlzLmNvcmRvdmFTZXJ2aWNlLmV4ZWMoKCkgPT4ge1xyXG5cdFx0XHRpZiAod2luZG93LmNvcmRvdmEgJiYgd2luZG93LmRvY3VtZW50KSB7IC8vIG9uIGRldmljZVxyXG5cdFx0XHRcdG5hdmlnYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3I7XHJcblx0XHRcdFx0dGhpcy5pc0Nvbm5lY3RlZFRvTmV0d29yayA9IG5hdmlnYXRvci5vbkxpbmU7XHJcblx0XHRcdFx0d2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXHJcblx0XHRcdFx0XHQnb25saW5lJyxcclxuXHRcdFx0XHRcdCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3VzZXIgb25saW5lJyk7XHJcblx0XHRcdFx0XHRcdHRoaXMuaXNDb25uZWN0ZWRUb05ldHdvcmsgPSB0cnVlO1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdGZhbHNlKTtcclxuXHRcdFx0XHR3aW5kb3cuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcclxuXHRcdFx0XHRcdCdvZmZsaW5lJyxcclxuXHRcdFx0XHRcdCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3VzZXIgb2ZmbGluZScpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrID0gZmFsc2U7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0ZmFsc2UpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGdldERhdGEocmVxOiBzdHJpbmcpOiBuZy5JUHJvbWlzZTxhbnk+IHtcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cclxuXHRcdGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcclxuXHRcdFx0ZGVmLnJlc29sdmUodGhpcy5uZXRTZXJ2aWNlLmdldERhdGEocmVxKSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XHJcblx0XHRcdC8vIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdub05ldHdvcmsnKTtcclxuXHRcdFx0ZGVmLnJlamVjdCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdHBvc3REYXRhKHJlcTogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IG5nLklSZXF1ZXN0U2hvcnRjdXRDb25maWcpOiBuZy5JUHJvbWlzZTxhbnk+IHtcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cclxuXHRcdHZhciByZXNwb25zZTogbmcuSVByb21pc2U8YW55PiA9IHRoaXMubmV0U2VydmljZS5wb3N0RGF0YShyZXEsIGRhdGEsIGNvbmZpZyk7XHJcblxyXG5cdFx0aWYgKHRoaXMuaGFzTmV0d29ya0Nvbm5lY3Rpb24oKSkge1xyXG5cdFx0XHRyZXNwb25zZS50aGVuKFxyXG5cdFx0XHQoaHR0cFJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdFx0ZGVmLnJlc29sdmUoaHR0cFJlc3BvbnNlKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ1NlcnZlciB1bmF2YWlsYWJsZScpO1xyXG5cdFx0XHRcdC8vIGJyb2FkY2FzdCBzZXJ2ZXIgaXMgdW5hdmFpbGFibGVcclxuXHRcdFx0XHR0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnc2VydmVyTm90QXZhaWxhYmxlJyk7XHJcblx0XHRcdFx0ZGVmLnJlamVjdCgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGRlZi5yZWplY3QoKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRkZWxldGVEYXRhKHJlcTogc3RyaW5nKTogbmcuSVByb21pc2U8YW55PiB7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHJcblx0XHRpZiAodGhpcy5oYXNOZXR3b3JrQ29ubmVjdGlvbigpKSB7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHRoaXMubmV0U2VydmljZS5kZWxldGVEYXRhKHJlcSkpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ1NlcnZlciB1bmF2YWlsYWJsZScpO1xyXG5cdFx0XHRkZWYucmVqZWN0KCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0aGFzTmV0d29ya0Nvbm5lY3Rpb24oKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gKG5hdmlnYXRvci5vbkxpbmUgfHwgdGhpcy5pc0Nvbm5lY3RlZFRvTmV0d29yayk7XHJcblx0fVxyXG5cclxuXHJcblx0Ly8gVE9ETzogcmVtb3ZlIHRoaXMgdGVtcCBtZXRob2QgYW5kIHVzZSBnZW5lcmljc1xyXG5cdGFkZE1ldGFJbmZvKHJlcXVlc3REYXRhOiBhbnkpOiBhbnkge1xyXG5cdFx0dmFyIGRldmljZTogSW9uaWMuSURldmljZSA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpXHJcblx0XHR2YXIgbW9kZWw6IHN0cmluZyA9ICcnO1xyXG5cdFx0dmFyIG9zVHlwZTogc3RyaW5nID0gJyc7XHJcblx0XHR2YXIgb3NWZXJzaW9uOiBzdHJpbmcgPSAnJztcclxuXHRcdHZhciBkZXZpY2VUb2tlbjogc3RyaW5nID0gJyc7XHJcblx0XHRpZiAoZGV2aWNlKSB7XHJcblx0XHRcdG1vZGVsID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkubW9kZWw7XHJcblx0XHRcdG9zVHlwZSA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLnBsYXRmb3JtO1xyXG5cdFx0XHRvc1ZlcnNpb24gPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS52ZXJzaW9uO1xyXG5cdFx0fVxyXG5cdFx0dmFyIG1ldGFJbmZvID0ge1xyXG5cdFx0XHQnY2hhbm5lbElkZW50aWZpZXInOiAnTU9CJyxcclxuXHRcdFx0J2RhdGVUaW1lU3RhbXAnOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcclxuXHRcdFx0J293bmVyQ2FycmllckNvZGUnOiB0aGlzLk9XTkVSX0NBUlJJRVJfQ09ERSxcclxuXHRcdFx0J2FkZGl0aW9uYWxJbmZvJzoge1xyXG5cdFx0XHRcdCdkZXZpY2VUeXBlJzogd2luZG93LmlzVGFibGV0ID8gJ1RhYmxldCcgOiAnUGhvbmUnLFxyXG5cdFx0XHRcdCdtb2RlbCc6IG1vZGVsLFxyXG5cdFx0XHRcdCdvc1R5cGUnOiBvc1R5cGUsXHJcblx0XHRcdFx0J29zVmVyc2lvbic6IG9zVmVyc2lvbixcclxuXHRcdFx0XHQnZGV2aWNlVG9rZW4nOiBkZXZpY2VUb2tlbixcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR2YXIgcmVxdWVzdE9iaiA9IHtcclxuXHRcdFx0J21ldGFJbmZvJzogbWV0YUluZm8sXHJcblx0XHRcdCdyZXF1ZXN0RGF0YSc6IHJlcXVlc3REYXRhXHJcblx0XHR9O1xyXG5cdFx0cmV0dXJuIHJlcXVlc3RPYmo7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGlzTG9nb3V0U2VydmljZShyZXF1ZXN0VXJsOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBkYXRhcHJvdmlkZXIuU0VSVklDRV9VUkxfTE9HT1VUID09IHJlcXVlc3RVcmw7XHJcblx0fVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdXRpbHMvVXRpbHMudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tbW9uL3NlcnZpY2VzL0Vycm9ySGFuZGxlclNlcnZpY2UudHNcIiAvPlxyXG5cclxuY2xhc3MgQXBwQ29udHJvbGxlciB7XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHN0YXRlJywgJyRzY29wZScsICdEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJ1VzZXJTZXJ2aWNlJyxcclxuXHRcdCckaW9uaWNQbGF0Zm9ybScsICdMb2NhbFN0b3JhZ2VTZXJ2aWNlJywgJyRpb25pY1BvcHVwJyxcclxuXHRcdCckaW9uaWNMb2FkaW5nJywgJyRpb25pY0hpc3RvcnknLCAnRXJyb3JIYW5kbGVyU2VydmljZSddO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByb3RlY3RlZCAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSxcclxuXHRcdHByb3RlY3RlZCAkc2NvcGU6IG5nLklTY29wZSxcclxuXHRcdHByb3RlY3RlZCBkYXRhUHJvdmlkZXJTZXJ2aWNlOiBEYXRhUHJvdmlkZXJTZXJ2aWNlLFxyXG5cdFx0cHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UsXHJcblx0XHRwcml2YXRlICRpb25pY1BsYXRmb3JtOiBJb25pYy5JUGxhdGZvcm0sXHJcblx0XHRwcml2YXRlIGxvY2FsU3RvcmFnZVNlcnZpY2U6IExvY2FsU3RvcmFnZVNlcnZpY2UsXHJcblx0XHRwcml2YXRlICRpb25pY1BvcHVwOiBJb25pYy5JUG9wdXAsXHJcblx0XHRwcml2YXRlICRpb25pY0xvYWRpbmc6IElvbmljLklMb2FkaW5nLFxyXG5cdFx0cHJpdmF0ZSAkaW9uaWNIaXN0b3J5OiBhbnksXHJcblx0XHRwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UpIHtcclxuXHR9XHJcblxyXG5cdGlzTm90RW1wdHkodmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIFV0aWxzLmlzTm90RW1wdHkodmFsdWUpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGhhc05ldHdvcmtDb25uZWN0aW9uKCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5oYXNOZXR3b3JrQ29ubmVjdGlvbigpO1xyXG5cdH1cclxuXHJcblx0bG9nb3V0KCkge1xyXG5cdFx0dGhpcy4kaW9uaWNIaXN0b3J5LmNsZWFyQ2FjaGUoKTtcclxuXHRcdHRoaXMudXNlclNlcnZpY2UubG9nb3V0KCk7XHJcblx0XHR0aGlzLiRzdGF0ZS5nbyhcImxvZ2luXCIpO1xyXG5cdH1cclxuXHJcblx0Z2V0VXNlckRlZmF1bHRQYWdlKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMudXNlclNlcnZpY2UudXNlclByb2ZpbGUudXNlckluZm8uZGVmYXVsdFBhZ2U7XHJcblx0fVxyXG5cclxuXHRzaG93RGFzaGJvYXJkKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHRoaXMudXNlclNlcnZpY2Uuc2hvd0Rhc2hib2FyZChuYW1lKTtcclxuXHR9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHNcIiAvPlxyXG5cclxuY2xhc3MgTWlzU2VydmljZSB7XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnRGF0YVByb3ZpZGVyU2VydmljZScsICckcSddO1xyXG5cdHByaXZhdGUgc2VydmVyUmVxdWVzdDogbnVtYmVyO1xyXG5cclxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlIGRhdGFQcm92aWRlclNlcnZpY2U6IERhdGFQcm92aWRlclNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSkgeyB9XHJcblxyXG5cdGdldE1ldHJpY1NuYXBzaG90IChyZXFkYXRhKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9tZXRyaWNzbmFwc2hvdCc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRUYXJnZXRWc0FjdHVhbCAocmVxZGF0YSl7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvdGFyZ2V0dnNhY3R1YWwnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0UmV2ZW51ZUFuYWx5c2lzIChyZXFkYXRhKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9yZXZlbnVlYW5hbHlzaXMnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0Um91dGVSZXZlbnVlIChyZXFkYXRhKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9yb3V0ZXJldmVudWUnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0U2VjdG9yQ2FycmllckFuYWx5c2lzIChyZXFkYXRhKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9zZWN0b3JjYXJyaWVyYW5hbHlzaXMnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0UGF4Rmxvd25NaXNIZWFkZXIgKHJlcWRhdGEpOiBhbnkge1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3BheGZsb3dubWlzaGVhZGVyJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdH0sXHJcblx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldFJvdXRlUmV2ZW51ZURyaWxsRG93biAocmVxZGF0YSl7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvcm91dGVyZXZlbnVlZHJpbGwnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0QmFyRHJpbGxEb3duIChyZXFkYXRhKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9tc3BheG5ldHJldmRyaWxsJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdH0sXHJcblx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldERyaWxsRG93biAocmVxZGF0YSwgVVJMKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSBVUkw7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdGlmKCF0aGlzLnNlcnZlclJlcXVlc3Qpe1xyXG5cdFx0XHR0aGlzLnNlcnZlclJlcXVlc3QgPSAxO1xyXG5cdFx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0XHRcdHRoaXMuc2VydmVyUmVxdWVzdCA9IDA7XHJcblx0XHRcdH0sXHJcblx0XHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxufVxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuY2xhc3MgQ2hhcnRvcHRpb25TZXJ2aWNlIHtcclxuXHJcbiAgICBwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRyb290U2NvcGUnXTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcigkcm9vdFNjb3BlOiBuZy5JU2NvcGUpIHsgfVxyXG5cclxuICAgIGxpbmVDaGFydE9wdGlvbnMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgY2hhcnQ6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdsaW5lQ2hhcnQnLFxyXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAyNTAsXHJcbiAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9wOiA1LFxyXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiA1MCxcclxuICAgICAgICAgICAgICAgICAgICBib3R0b206IDUwLFxyXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDUwXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgeDogZnVuY3Rpb24oZCl7IHJldHVybiBkLnh2YWw7IH0sXHJcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXsgcmV0dXJuIGQueXZhbDsgfSxcclxuICAgICAgICAgICAgICAgIHVzZUludGVyYWN0aXZlR3VpZGVsaW5lOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGlzcGF0Y2g6IHtcclxuICAgICAgICAgICAgICAgICAgICBzdGF0ZUNoYW5nZTogZnVuY3Rpb24oZSl7IGNvbnNvbGUubG9nKFwic3RhdGVDaGFuZ2VcIik7IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlU3RhdGU6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcImNoYW5nZVN0YXRlXCIpOyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBTaG93OiBmdW5jdGlvbihlKXsgY29uc29sZS5sb2coXCJ0b29sdGlwU2hvd1wiKTsgfSxcclxuICAgICAgICAgICAgICAgICAgICB0b29sdGlwSGlkZTogZnVuY3Rpb24oZSl7IGNvbnNvbGUubG9nKFwidG9vbHRpcEhpZGVcIik7IH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB4QXhpczoge1xyXG4gICAgICAgICAgICAgICAgICAgIHRpY2tGb3JtYXQ6IGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLnRpbWUuZm9ybWF0KCclYicpKG5ldyBEYXRlKGQpKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB5QXhpczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGF4aXNMYWJlbDogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgdGlja0Zvcm1hdDogZnVuY3Rpb24oZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJy4wMmYnKShkKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGF4aXNMYWJlbERpc3RhbmNlOiAtMTBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07ICBcclxuICAgIH1cclxuXHJcbiAgICBtdWx0aUJhckNoYXJ0T3B0aW9ucygpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjaGFydDoge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ211bHRpQmFyQ2hhcnQnLFxyXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAyNTAsXHJcbiAgICAgICAgICAgICAgICB3aWR0aDogMzAwLFxyXG4gICAgICAgICAgICAgICAgbWFyZ2luIDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvcDogMTAsXHJcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDI1LFxyXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogMzAsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMjVcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzaG93TGVnZW5kIDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXtyZXR1cm4gZC5sYWJlbDt9LFxyXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWUgKyAoMWUtMTApO30sXHJcbiAgICAgICAgICAgICAgICBzaG93VmFsdWVzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgcmVkdWNlWFRpY2tzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHNob3dDb250cm9sczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZUZvcm1hdDogZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJywuNGYnKShkKTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB4QXhpczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGF4aXNMYWJlbERpc3RhbmNlOiAzMFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNob3dZQXhpczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzaG93WEF4aXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNzAwXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9OyAgXHJcbiAgICB9XHJcblxyXG4gICAgbWV0cmljQmFyQ2hhcnRPcHRpb25zKG1pc0N0cmwpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjaGFydDoge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2Rpc2NyZXRlQmFyQ2hhcnQnLFxyXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAyMDAsXHJcbiAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAyMCxcclxuICAgICAgICAgICAgICAgICAgICByaWdodDogMjUsXHJcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDI1XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgeDogZnVuY3Rpb24oZCl7cmV0dXJuIGQubGFiZWw7fSxcclxuICAgICAgICAgICAgICAgIHk6IGZ1bmN0aW9uKGQpe3JldHVybiBkLnZhbHVlfSxcclxuICAgICAgICAgICAgICAgIHVzZUludGVyYWN0aXZlR3VpZGVsaW5lOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc2hvd1ZhbHVlczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlRm9ybWF0OiBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuZm9ybWF0KCcsLjJmJykoZCk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgdG9vbHRpcDoge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzaG93WUF4aXM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc2hvd1hBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA3MDBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07ICBcclxuICAgIH1cclxuXHJcbiAgICB0YXJnZXRCYXJDaGFydE9wdGlvbnMobWlzQ3RybCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY3JldGVCYXJDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IDIwLFxyXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiA1MCxcclxuICAgICAgICAgICAgICAgICAgICBib3R0b206IDIwLFxyXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDc1XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXtyZXR1cm4gZC5sYWJlbDt9LFxyXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWUgKyAoMWUtMTApO30sXHJcbiAgICAgICAgICAgICAgICBzaG93VmFsdWVzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlRm9ybWF0OiBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuZm9ybWF0KCcsLjJmJykoZCk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDcwMFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTsgIFxyXG4gICAgfVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5jbGFzcyBGaWx0ZXJlZExpc3RTZXJ2aWNlIHtcclxuXHJcbiAgICBwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHsgfVxyXG5cclxuICAgIHNlYXJjaGVkICh2YWxMaXN0cywgdG9TZWFyY2gsIGxldmVsLCBkcmlsbHR5cGUpIHtcclxuICAgICAgcmV0dXJuIF8uZmlsdGVyKHZhbExpc3RzLCBcclxuICAgICAgICBmdW5jdGlvbiAoaSkge1xyXG4gICAgICAgICAgLyogU2VhcmNoIFRleHQgaW4gYWxsIDMgZmllbGRzICovXHJcbiAgICAgICAgICByZXR1cm4gc2VhcmNoVXRpbChpLCB0b1NlYXJjaCwgbGV2ZWwsIGRyaWxsdHlwZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcGFnZWQgKHZhbExpc3RzLHBhZ2VTaXplKSB7XHJcbiAgICAgIHZhciByZXRWYWwgPSBbXTtcclxuICAgICAgaWYodmFsTGlzdHMpe1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsTGlzdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgIGlmIChpICUgcGFnZVNpemUgPT09IDApIHtcclxuICAgICAgICAgICAgcmV0VmFsW01hdGguZmxvb3IoaSAvIHBhZ2VTaXplKV0gPSBbdmFsTGlzdHNbaV1dO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0VmFsW01hdGguZmxvb3IoaSAvIHBhZ2VTaXplKV0ucHVzaCh2YWxMaXN0c1tpXSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiByZXRWYWw7XHJcbiAgICB9XHJcblxyXG4gICBcclxufVxyXG5mdW5jdGlvbiBzZWFyY2hVdGlsKGl0ZW0sIHRvU2VhcmNoLCBsZXZlbCwgZHJpbGx0eXBlKSB7XHJcbiAgICAvKiBTZWFyY2ggVGV4dCBpbiBhbGwgMyBmaWVsZHMgKi9cclxuICBpZihkcmlsbHR5cGUgPT0gJ3JvdXRlJykge1xyXG4gICAgaWYoaXRlbS5jb3VudHJ5RnJvbSAmJiBpdGVtLmNvdW50cnlUbyAmJiBsZXZlbCA9PSAwKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5jb3VudHJ5RnJvbS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSB8fCBpdGVtLmNvdW50cnlUby50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDIpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbVsnZG9jdW1lbnQjJ10gJiYgbGV2ZWwgPT0gMykge1xyXG4gICAgICByZXR1cm4gKGl0ZW1bJ2RvY3VtZW50IyddLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmKGRyaWxsdHlwZSA9PSAndGFyZ2V0Jykge1xyXG4gICAgaWYoaXRlbS5yb3V0ZXR5cGUgJiYgbGV2ZWwgPT0gMCkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0ucm91dGV0eXBlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9ZWxzZSBpZihpdGVtLnJvdXRlY29kZSAmJiBsZXZlbCA9PSAxKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5yb3V0ZWNvZGUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmKGRyaWxsdHlwZSA9PSAnYmFyJykge1xyXG4gICAgaWYoaXRlbS5yb3V0ZUNvZGUgJiYgbGV2ZWwgPT0gMCkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0ucm91dGVDb2RlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9ZWxzZSBpZihpdGVtLmZsb3duU2VjdG9yICYmIGxldmVsID09IDEpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsb3duU2VjdG9yLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9ZWxzZSBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAyKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmKGRyaWxsdHlwZSA9PSAnZmxpZ2h0LXByb2Nlc3MnKSB7XHJcbiAgICBpZihpdGVtLmNvdW50cnlGcm9tICYmIGl0ZW0uY291bnRyeVRvICYmIGxldmVsID09IDApIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmNvdW50cnlGcm9tLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xIHx8IGl0ZW0uY291bnRyeVRvLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9ZWxzZSBpZihpdGVtLmZsb3duU2VjdG9yICYmIGxldmVsID09IDEpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsb3duU2VjdG9yLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9ZWxzZSBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAyKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW1bJ2NhcnJpZXJDb2RlIyddICYmIGxldmVsID09IDMpIHtcclxuICAgICAgcmV0dXJuIChpdGVtWydjYXJyaWVyQ29kZSMnXS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYoZHJpbGx0eXBlID09ICdmbGlnaHQtY291bnQnKSB7XHJcbiAgICBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAwKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW1bJ2NhcnJpZXJDb2RlJ10gJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW1bJ2NhcnJpZXJDb2RlJ10udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmKGRyaWxsdHlwZSA9PSAnY291cG9uLWNvdW50Jykge1xyXG4gICAgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMCkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9ZWxzZSBpZihpdGVtWydmbG93blNlY3RvciddICYmIGxldmVsID09IDEpIHtcclxuICAgICAgcmV0dXJuIChpdGVtWydmbG93blNlY3RvciddLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZihkcmlsbHR5cGUgPT0gJ2FuYWx5c2lzJyApIHtcclxuICAgIGlmKGl0ZW0ucmVnaW9uTmFtZSAmJiBsZXZlbCA9PSAwKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5yZWdpb25OYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtLmNvdW50cnlGcm9tICYmIGl0ZW0uY291bnRyeVRvICYmIGxldmVsID09IDEpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmNvdW50cnlGcm9tLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xIHx8IGl0ZW0uY291bnRyeVRvLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbS5mbG93blNlY3RvciAmJiBsZXZlbCA9PSAyKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbG93blNlY3Rvci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMykge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmKGRyaWxsdHlwZSA9PSAnbmV0d29yay1SZXZlbnVlJykge1xyXG4gICAgaWYoaXRlbS5QT1NyZWdpb24gJiYgbGV2ZWwgPT0gMCkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uUE9TcmVnaW9uLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtLlBPU2NvdW50cnkgJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uUE9TY291bnRyeS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbS5QT1NjaXR5ICYmIGxldmVsID09IDIpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLlBPU2NpdHkudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmKGl0ZW0uZG9jdW1lbnRUeXBlICYmIGxldmVsID09IDMpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmRvY3VtZW50VHlwZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbS5zZWN0b3IgJiYgbGV2ZWwgPT0gNCkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uc2VjdG9yLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtLmZsaWdodG51bWJlciAmJiBsZXZlbCA9PSA1KSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHRudW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYoZHJpbGx0eXBlID09ICd5aWVsZCcpIHtcclxuICAgIGlmKGl0ZW0ucm91dGVDb2RlICYmIGxldmVsID09IDApIHtcclxuICAgICAgcmV0dXJuIChpdGVtLnJvdXRlQ29kZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbS5mbG93blNlY3RvciAmJiBsZXZlbCA9PSAxKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbG93blNlY3Rvci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMikge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtLmZsaWdodERhdGUgJiYgbGV2ZWwgPT0gMykge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0RGF0ZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZihkcmlsbHR5cGUgPT0gJ3Jwa20nIHx8IGRyaWxsdHlwZSA9PSAnYXNrbScgKSB7XHJcbiAgICBpZihpdGVtLmFpcmNyYWZ0dHlwZSAmJiBsZXZlbCA9PSAwKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5haXJjcmFmdHR5cGUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmKGl0ZW0uYWlyY3JhZnRyZWdubyAmJiBsZXZlbCA9PSAxKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5haXJjcmFmdHJlZ25vLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtLmFpcmNyYWZ0bGVnICYmIGxldmVsID09IDIpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmFpcmNyYWZ0bGVnLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAzKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYoZHJpbGx0eXBlID09ICdvYWwtY29udCcpIHtcclxuICAgIGlmKGl0ZW0uc2VjdG9yICYmIGxldmVsID09IDApIHtcclxuICAgICAgcmV0dXJuIChpdGVtLnNlY3Rvci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtLmZsaWdodERhdGUgJiYgbGV2ZWwgPT0gMikge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0RGF0ZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbS5kb2N1bWVudFR5cGUgJiYgbGV2ZWwgPT0gMykge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZG9jdW1lbnRUeXBlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmKGRyaWxsdHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jykge1xyXG4gICAgaWYoaXRlbS5yb3V0ZUNvZGUgJiYgbGV2ZWwgPT0gMCkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0ucm91dGVDb2RlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtLmZsb3duU2VjdG9yICYmIGxldmVsID09IDEpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsb3duU2VjdG9yLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAyKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmKGl0ZW0uZmxpZ2h0RGF0ZSAmJiBsZXZlbCA9PSAzKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHREYXRlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9EYXRhUHJvdmlkZXJTZXJ2aWNlLnRzXCIgLz5cclxuXHJcbmNsYXNzIE9wZXJhdGlvbmFsU2VydmljZSB7XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnRGF0YVByb3ZpZGVyU2VydmljZScsICckcSddO1xyXG5cdHByaXZhdGUgc2VydmVyUmVxdWVzdDogbnVtYmVyO1xyXG5cclxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlIGRhdGFQcm92aWRlclNlcnZpY2U6IERhdGFQcm92aWRlclNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSkgeyB9XHJcblxyXG5cdGdldFBheEZsb3duT3BySGVhZGVyKHJlcWRhdGEpOiBhbnkge1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4Zmxub3ByL3BheGZsb3dub3ByaGVhZGVyJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0T3ByRmxpZ2h0UHJvY1N0YXR1cyhyZXFkYXRhKSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5vcHIvZmxpZ2h0cHJvY2Vzc2luZ3N0YXR1cyc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldE9wckZsaWdodENvdW50QnlSZWFzb24ocmVxZGF0YSkge1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4Zmxub3ByL2ZsaWdodGNvdW50YnlyZWFzb24nO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0XHR9KTtcclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldE9wckNvdXBvbkNvdW50QnlFeGNlcHRpb24ocmVxZGF0YSkge1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4Zmxub3ByL2NvdXBvbmNvdW50YnlleGNlcHRpb24nO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0XHR9KTtcclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblx0XHJcblx0Z2V0RHJpbGxEb3duIChyZXFkYXRhLCBVUkwpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9IFVSTDtcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0aWYoIXRoaXMuc2VydmVyUmVxdWVzdCl7XHJcblx0XHRcdHRoaXMuc2VydmVyUmVxdWVzdCA9IDE7XHJcblx0XHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHRcdFx0dGhpcy5zZXJ2ZXJSZXF1ZXN0ID0gMDtcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxufVxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHNcIiAvPlxyXG5cclxuY2xhc3MgVXNlclNlcnZpY2Uge1xyXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnRGF0YVByb3ZpZGVyU2VydmljZScsICckcScsICdMb2NhbFN0b3JhZ2VTZXJ2aWNlJywgJyR3aW5kb3cnXTtcclxuXHRwdWJsaWMgdXNlclByb2ZpbGU6IGFueTtcclxuXHRwdWJsaWMgX3VzZXI6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRwcml2YXRlIG1lbnVBY2Nlc3MgPSBbXTtcclxuXHRwcml2YXRlIGRlZmF1bHRQYWdlOiBzdHJpbmc7XHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSBkYXRhUHJvdmlkZXJTZXJ2aWNlOiBEYXRhUHJvdmlkZXJTZXJ2aWNlLCBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UsIHByaXZhdGUgbG9jYWxTdG9yYWdlU2VydmljZTogTG9jYWxTdG9yYWdlU2VydmljZSwgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSkge1xyXG5cclxuXHR9XHJcblxyXG5cdHNldFVzZXIodXNlcikge1xyXG5cdFx0aWYgKHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UpIHtcclxuXHRcdFx0dGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdyYXBpZE1vYmlsZS51c2VyJywgSlNPTi5zdHJpbmdpZnkodXNlcikpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0bG9nb3V0KCkge1xyXG5cdFx0dGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldE9iamVjdCgncmFwaWRNb2JpbGUudXNlcicsIG51bGwpO1xyXG5cdFx0dGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldE9iamVjdCgndXNlclBlcm1pc3Npb25NZW51JywgW10pO1xyXG5cdFx0dGhpcy5fdXNlciA9IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0aXNMb2dnZWRJbigpIHtcclxuXHRcdHJldHVybiB0aGlzLl91c2VyID8gdHJ1ZSA6IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0aXNVc2VyTG9nZ2VkSW4oKTogYm9vbGVhbiB7XHJcblx0XHRpZiAodGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldE9iamVjdCgncmFwaWRNb2JpbGUudXNlcicsICcnKSAhPSBudWxsKSB7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Z2V0VXNlcigpIHtcclxuXHRcdHJldHVybiB0aGlzLl91c2VyO1xyXG5cdH1cclxuXHJcblx0bG9naW4oX3VzZXJOYW1lOiBzdHJpbmcsIF9wYXNzd29yZDogc3RyaW5nKSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy91c2VyL2xvZ2luJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dmFyIHJlcXVlc3RPYmogPSB7XHJcblx0XHRcdHVzZXJJZDogX3VzZXJOYW1lLFxyXG5cdFx0XHRwYXNzd29yZDogX3Bhc3N3b3JkXHJcblx0XHR9XHJcblx0XHR0aGlzLnNldFVzZXIoeyB1c2VybmFtZTogXCJcIiB9KTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXF1ZXN0T2JqKS50aGVuKFxyXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHRpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdvYmplY3QnKSB7XHJcblx0XHRcdFx0XHR0aGlzLl91c2VyID0gdHJ1ZTtcclxuXHRcdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3BvbnNlLmRhdGEpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRkZWYucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQgb24gbG9nIGluJyk7XHJcblx0XHRcdFx0ZGVmLnJlamVjdChlcnJvcik7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldFVzZXJQcm9maWxlKHJlcWRhdGEpIHtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3VzZXIvdXNlcnByb2ZpbGUnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xyXG5cdFx0XHRcdFx0dGhpcy51c2VyUHJvZmlsZSA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0XHRcdHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5zZXRPYmplY3QoJ3VzZXJQZXJtaXNzaW9uTWVudScsIHRoaXMudXNlclByb2ZpbGUubWVudUFjY2Vzcyk7XHJcblx0XHRcdFx0XHR0aGlzLmdldERlZmF1bHRQYWdlKCk7XHJcblx0XHRcdFx0XHRkZWYucmVzb2x2ZShyZXNwb25zZS5kYXRhKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0ZGVmLnJlamVjdChyZXNwb25zZS5kYXRhKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkIG9uIFVzZXJQcm9maWxlJyk7XHJcblx0XHRcdFx0ZGVmLnJlamVjdChlcnJvcik7XHJcblx0XHRcdH0pO1xyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0c2hvd0Rhc2hib2FyZChuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdGlmICh0aGlzLmlzVXNlckxvZ2dlZEluKCkpIHtcclxuXHRcdFx0aWYgKHR5cGVvZiB0aGlzLnVzZXJQcm9maWxlID09ICd1bmRlZmluZWQnKSB7XHJcblx0XHRcdFx0dmFyIGRhdGEgPSB0aGlzLmxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0T2JqZWN0KCd1c2VyUGVybWlzc2lvbk1lbnUnLCAnJyk7XHJcblx0XHRcdFx0dGhpcy5tZW51QWNjZXNzID0gZGF0YTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLm1lbnVBY2Nlc3MgPSB0aGlzLnVzZXJQcm9maWxlLm1lbnVBY2Nlc3M7XHJcblx0XHRcdH1cclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm1lbnVBY2Nlc3MubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAodGhpcy5tZW51QWNjZXNzW2ldLm1lbnVOYW1lID09IG5hbWUpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0aGlzLm1lbnVBY2Nlc3NbaV0ubWVudUFjY2VzcztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmlzVXNlckxvZ2dlZEluKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRnZXREZWZhdWx0UGFnZSgpIHtcclxuXHRcdHN3aXRjaCh0aGlzLnVzZXJQcm9maWxlLnVzZXJJbmZvLmRlZmF1bHRQYWdlKXtcclxuXHRcdFx0Y2FzZSAnTUlTIC0gUGFzc2VuZ2VyIEZsb3duJzpcclxuXHRcdFx0XHR0aGlzLmRlZmF1bHRQYWdlID0gJ2FwcC5taXMtZmxvd24nO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlICdPcGVyYXRpb25hbCAtIFBhc3NlbmdlciBGbG93bic6XHJcblx0XHRcdFx0dGhpcy5kZWZhdWx0UGFnZSA9ICdhcHAub3BlcmF0aW9uYWwtZmxvd24nO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHRoaXMuZGVmYXVsdFBhZ2UgPSAnYXBwLm1pcy1mbG93bic7XHJcblx0XHR9XHJcblx0fVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbXBvbmVudHMvbWlzL3NlcnZpY2VzL01pc1NlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9DaGFydG9wdGlvblNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzXCIgLz5cclxuXHJcblxyXG5cclxuaW50ZXJmYWNlIHRhYk9iamVjdCB7XHJcbiAgICB0aXRsZTogc3RyaW5nLFxyXG4gICAgbmFtZXM6IHN0cmluZyxcclxuICAgIGljb246IHN0cmluZ1xyXG59XHJcblxyXG5pbnRlcmZhY2UgdG9nZ2xlT2JqZWN0IHtcclxuICAgIG1vbnRoT3JZZWFyOiBzdHJpbmcsXHJcbiAgICB0YXJnZXRSZXZPclBheDogc3RyaW5nLFxyXG4gICAgc2VjdG9yT3JkZXI6IHN0cmluZyxcclxuICAgIHNlY3RvclJldk9yUGF4OiBzdHJpbmcsXHJcbiAgICBjaGFydE9yVGFibGU6IHN0cmluZyxcclxuICAgIHRhcmdldFZpZXc6IHN0cmluZyxcclxuICAgIHJldmVudWVWaWV3OiBzdHJpbmcsXHJcbiAgICBzZWN0b3JWaWV3OiBzdHJpbmdcclxufVxyXG5cclxuaW50ZXJmYWNlIGhlYWRlck9iamVjdCB7XHJcbiAgICBmbG93bk1vbnRoOiBzdHJpbmcsXHJcbiAgICBzdXJjaGFyZ2U6IGJvb2xlYW4sXHJcbiAgICB0YWJJbmRleDogbnVtYmVyLFxyXG4gICAgaGVhZGVySW5kZXg6IG51bWJlcixcclxuICAgIHVzZXJuYW1lOiBzdHJpbmdcclxufVxyXG5cclxuY2xhc3MgTWlzQ29udHJvbGxlcntcclxuXHJcbiAgICBwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzdGF0ZScsICckc2NvcGUnLCAnJGlvbmljTG9hZGluZycsICckdGltZW91dCcsICckd2luZG93JywgJyRpb25pY1BvcG92ZXInLFxyXG4gICAgICAgICckZmlsdGVyJywgJ01pc1NlcnZpY2UnLCAnQ2hhcnRvcHRpb25TZXJ2aWNlJywgJ0ZpbHRlcmVkTGlzdFNlcnZpY2UnLCAnVXNlclNlcnZpY2UnLCAnJGlvbmljSGlzdG9yeScsICdSZXBvcnRTdmMnLCAnR1JBUEhfQ09MT1JTJywgJ1RBQlMnLCAnJGlvbmljUG9wdXAnXTtcclxuXHJcbiAgICBwcml2YXRlIHRhYnM6IFt0YWJPYmplY3RdO1xyXG4gICAgcHJpdmF0ZSB0b2dnbGU6IHRvZ2dsZU9iamVjdDtcclxuICAgIHByaXZhdGUgaGVhZGVyOiBoZWFkZXJPYmplY3Q7XHJcbiAgICBwcml2YXRlIHN1YkhlYWRlcjogYW55O1xyXG4gICAgcHJpdmF0ZSBvcHRpb25zOiBhbnk7XHJcbiAgICBwcml2YXRlIGRyaWxsdGFiczogc3RyaW5nW107XHJcbiAgICBcclxuICAgIHByaXZhdGUgcGFnZVNpemUgPSA0O1xyXG4gICAgcHJpdmF0ZSBjdXJyZW50UGFnZSA9IFtdO1xyXG4gICAgcHJpdmF0ZSBzZWxlY3RlZERyaWxsID0gW107XHJcbiAgICBwcml2YXRlIGdyb3VwcyA9IFtdO1xyXG5cclxuICAgIHByaXZhdGUgaW5mb3BvcG92ZXI6IElvbmljLklQb3BvdmVyO1xyXG4gICAgcHJpdmF0ZSBkcmlsbHBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xyXG4gICAgcHJpdmF0ZSBncmFwaHBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xyXG4gICAgcHJpdmF0ZSBkcmlsbEJhcnBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xyXG5cclxuICAgIHByaXZhdGUgaW5mb2RhdGE6IHN0cmluZztcclxuICAgIHByaXZhdGUgcmVnaW9uTmFtZTogc3RyaW5nO1xyXG4gICAgcHJpdmF0ZSBjaGFydFR5cGU6IHN0cmluZztcclxuICAgIHByaXZhdGUgZ3JhcGhJbmRleDogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSBjb2x1bW5Ub09yZGVyOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIHNob3duR3JvdXA6IG51bWJlcjtcclxuXHJcbiAgICBwcml2YXRlIG1ldHJpY1Jlc3VsdDogYW55O1xyXG4gICAgcHJpdmF0ZSBtZXRyaWNMZWdlbmRzOiBhbnk7XHJcbiAgICBwcml2YXRlIGZhdk1ldHJpY1Jlc3VsdDogYW55O1xyXG5cclxuICAgIHByaXZhdGUgdGFyZ2V0QWN0dWFsRGF0YTogYW55O1xyXG4gICAgcHJpdmF0ZSBmYXZUYXJnZXRCYXJSZXN1bHQ6IGFueTtcclxuICAgIHByaXZhdGUgZmF2VGFyZ2V0TGluZVJlc3VsdDogYW55O1xyXG5cclxuICAgIHByaXZhdGUgcm91dGVSZXZEYXRhOiBhbnk7XHJcblxyXG4gICAgcHJpdmF0ZSByZXZlbnVlRGF0YTogYW55O1xyXG4gICAgcHJpdmF0ZSBTZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHM6IGFueTtcclxuICAgIHByaXZhdGUgcG9wb3ZlcnNob3duOiBib29sZWFuO1xyXG4gICAgcHJpdmF0ZSBkcmlsbFR5cGU6IHN0cmluZztcclxuICAgIHByaXZhdGUgZHJpbGxCYXJMYWJlbDogc3RyaW5nO1xyXG4gICAgcHJpdmF0ZSBkcmlsbE5hbWU6IHN0cmluZztcclxuICAgIHByaXZhdGUgZmlyc3RDb2x1bW5zOiBzdHJpbmdbXTtcclxuICAgIFxyXG4gICAgcHJpdmF0ZSB0aGF0OiBhbnk7XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSwgcHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSxcclxuICAgICAgICBwcml2YXRlICRpb25pY0xvYWRpbmc6IElvbmljLklMb2FkaW5nLCBwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsXHJcbiAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSwgcHJpdmF0ZSAkaW9uaWNQb3BvdmVyOiBJb25pYy5JUG9wb3ZlcixcclxuICAgICAgICBwcml2YXRlICRmaWx0ZXI6IG5nLklGaWx0ZXJTZXJ2aWNlLCBwcml2YXRlIG1pc1NlcnZpY2U6IE1pc1NlcnZpY2UsXHJcbiAgICAgICAgcHJpdmF0ZSBjaGFydG9wdGlvblNlcnZpY2U6IENoYXJ0b3B0aW9uU2VydmljZSwgcHJpdmF0ZSBmaWx0ZXJlZExpc3RTZXJ2aWNlOiBGaWx0ZXJlZExpc3RTZXJ2aWNlLFxyXG4gICAgICAgIHByaXZhdGUgdXNlclNlcnZpY2U6IFVzZXJTZXJ2aWNlLCBwcml2YXRlICRpb25pY0hpc3Rvcnk6IGFueSwgcHJpdmF0ZSByZXBvcnRTdmM6IFJlcG9ydFN2YywgcHJpdmF0ZSBHUkFQSF9DT0xPUlM6IHN0cmluZywgcHJpdmF0ZSBUQUJTOiBzdHJpbmcsIHByaXZhdGUgJGlvbmljUG9wdXA6IElvbmljLklQb3B1cCkge1xyXG5cclxuICAgICAgICAgICAgdGhpcy50aGF0ID0gdGhpcztcclxuXHJcbiAgICAgICAgICAgIHRoaXMudGFicyA9IHRoaXMuVEFCUy5EQjFfVEFCUztcclxuXHJcbiAgICAgICAgICAgIHRoaXMudG9nZ2xlID0ge1xyXG4gICAgICAgICAgICAgICAgbW9udGhPclllYXIgOiAnbW9udGgnLFxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0UmV2T3JQYXg6ICdyZXZlbnVlJyxcclxuICAgICAgICAgICAgICAgIHNlY3Rvck9yZGVyOiAndG9wNScsXHJcbiAgICAgICAgICAgICAgICBzZWN0b3JSZXZPclBheDogJ3JldmVudWUnLFxyXG4gICAgICAgICAgICAgICAgY2hhcnRPclRhYmxlOiAnY2hhcnQnLFxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0VmlldzogJ2NoYXJ0JyxcclxuICAgICAgICAgICAgICAgIHJldmVudWVWaWV3OiAnY2hhcnQnLFxyXG4gICAgICAgICAgICAgICAgc2VjdG9yVmlldzogJ2NoYXJ0J1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuaGVhZGVyID0ge1xyXG4gICAgICAgICAgICAgICAgZmxvd25Nb250aDogJycsXHJcbiAgICAgICAgICAgICAgICBzdXJjaGFyZ2U6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgdGFiSW5kZXg6IDAsXHJcbiAgICAgICAgICAgICAgICBoZWFkZXJJbmRleDogMCxcclxuICAgICAgICAgICAgICAgIHVzZXJuYW1lOiAnJ1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgLypcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHdpbmRvdykuYmluZCgnb3JpZW50YXRpb25jaGFuZ2UnLCBmdW5jdGlvbiAoZSwgc2NvcGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25TbGlkZU1vdmUoe2luZGV4OiB0aGlzLmhlYWRlci50YWJJbmRleH0pO1xyXG4gICAgICAgICAgICB9KTsgKi9cclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHdpbmRvdykuYmluZCgnb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLm9yaWVudGF0aW9uQ2hhbmdlKTsgXHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgIC8vdGhpcy4kc2NvcGUuJHdhdGNoKCdNaXNDdHJsLmhlYWRlci5zdXJjaGFyZ2UnLCAoKSA9PiB7IHRoaXMub25TbGlkZU1vdmUoe2luZGV4OnRoaXMuaGVhZGVyLnRhYkluZGV4fSk7IH0sIHRydWUpO1xyXG4gICAgICAgICAgICB0aGlzLmluaXREYXRhKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kb24oJ29uU2xpZGVNb3ZlJywgKGV2ZW50OiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLk1pc0N0cmwub25TbGlkZU1vdmUocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kb24oJyRpb25pY1ZpZXcuZW50ZXInLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXNlbGYudXNlclNlcnZpY2Uuc2hvd0Rhc2hib2FyZCgnTUlTJykpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLiRzdGF0ZS5nbyhcImxvZ2luXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRvbignb3BlbkRyaWxsUG9wdXAnLCAoZXZlbnQ6IGFueSwgcmVzcG9uc2U6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ21ldHJpYycpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYocmVzcG9uc2UubmFtZT09XCJOZXR3b3JrIFJldmVudWVcIil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdJbiBuZXR3b3JrIHJldmVuZScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9wZW5OZXR3b3JrUmV2ZW51ZURyaWxsRG93blBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcclxuICAgICAgICAgICAgICAgICAgICB9ZWxzZSBpZihyZXNwb25zZS5uYW1lPT1cIllpZWxkXCIpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9wZW5ZaWVsZERyaWxsRG93blBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcclxuICAgICAgICAgICAgICAgICAgICB9ZWxzZSBpZihyZXNwb25zZS5uYW1lPT1cIlJQS01cIil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLk1pc0N0cmwub3BlblJQS01EcmlsbERvd25Qb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfWVsc2UgaWYocmVzcG9uc2UubmFtZT09XCJBU0tNXCIpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9wZW5BU0tNRHJpbGxEb3duUG9wb3ZlcihyZXNwb25zZS5ldmVudCwgeyBcInBvaW50XCI6IHJlc3BvbnNlLmRhdGEgfSwgLTEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9wZW5CYXJEcmlsbERvd25Qb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ3RhcmdldCcpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9wZW5UYXJnZXREcmlsbERvd25Qb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLk1pc0N0cmwub3BlblJldmVudWVQYXNzZW5nZXJEcmlsbERvd25Qb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAnb2FsJykge1xyXG4gICAgICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuTWlzQ3RybC5vcGVuT0FMQ29udERyaWxsRG93blBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdERhdGEoKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL2luZm90b29sdGlwLmh0bWwnLCB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oaW5mb3BvcG92ZXIpIHtcclxuICAgICAgICAgICAgdGhhdC5pbmZvcG9wb3ZlciA9IGluZm9wb3BvdmVyO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9kcmlsZG93bi5odG1sJywge1xyXG4gICAgICAgICAgICBzY29wZTogdGhhdC4kc2NvcGVcclxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGRyaWxscG9wb3Zlcikge1xyXG4gICAgICAgICAgICB0aGF0LmRyaWxscG9wb3ZlciA9IGRyaWxscG9wb3ZlcjtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9iYXJkcmlsZG93bi5odG1sJywge1xyXG4gICAgICAgICAgICBzY29wZTogdGhhdC4kc2NvcGVcclxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGRyaWxsQmFycG9wb3Zlcikge1xyXG4gICAgICAgICAgICB0aGF0LmRyaWxsQmFycG9wb3ZlciA9IGRyaWxsQmFycG9wb3ZlcjtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5vcHRpb25zID0ge1xyXG4gICAgICAgICAgICBtZXRyaWM6IHRoaXMuY2hhcnRvcHRpb25TZXJ2aWNlLm1ldHJpY0JhckNoYXJ0T3B0aW9ucyh0aGlzKSxcclxuICAgICAgICAgICAgdGFyZ2V0TGluZUNoYXJ0OiB0aGlzLmNoYXJ0b3B0aW9uU2VydmljZS5saW5lQ2hhcnRPcHRpb25zKCksXHJcbiAgICAgICAgICAgIHRhcmdldEJhckNoYXJ0OiB0aGlzLmNoYXJ0b3B0aW9uU2VydmljZS50YXJnZXRCYXJDaGFydE9wdGlvbnModGhpcyksXHJcbiAgICAgICAgICAgIHBhc3NlbmdlckNoYXJ0OiB0aGlzLmNoYXJ0b3B0aW9uU2VydmljZS5tdWx0aUJhckNoYXJ0T3B0aW9ucygpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHJlcSA9IHtcclxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYocmVxLnVzZXJJZCAhPSBcIm51bGxcIikge1xyXG4gICAgICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0UGF4Rmxvd25NaXNIZWFkZXIocmVxKS50aGVuKFxyXG4gICAgICAgICAgICAgICAgKGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LnN1YkhlYWRlciA9IGRhdGEucmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmhlYWRlci5mbG93bk1vbnRoID0gdGhhdC5zdWJIZWFkZXIucGF4Rmxvd25NaXNNb250aHNbMF0uZmxvd01vbnRoO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm9uU2xpZGVNb3ZlKHsgaW5kZXg6IDAgfSk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHRcclxuXHRcdHRoYXQuaGVhZGVyLnVzZXJuYW1lID0gdGhhdC5nZXRQcm9maWxlVXNlck5hbWUoKTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRQcm9maWxlVXNlck5hbWUoKTogc3RyaW5nIHtcclxuICAgICAgICBpZiAodGhpcy51c2VyU2VydmljZS5pc1VzZXJMb2dnZWRJbigpKSB7XHJcbiAgICAgICAgICAgIHZhciBvYmogPSB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInKTtcclxuICAgICAgICAgICAgaWYgKG9iaiAhPSAnbnVsbCcpIHtcclxuICAgICAgICAgICAgICAgIHZhciBwcm9maWxlVXNlck5hbWUgPSBKU09OLnBhcnNlKG9iaik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZmlsZVVzZXJOYW1lLnVzZXJuYW1lO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNlbGVjdGVkRmxvd25Nb250aChtb250aDogc3RyaW5nKXtcclxuICAgICAgICByZXR1cm4gKG1vbnRoID09IHRoaXMuaGVhZGVyLmZsb3duTW9udGgpO1xyXG4gICAgfVxyXG4gICAgb3JpZW50YXRpb25DaGFuZ2UgPSAoKTogYm9vbGVhbiA9PiB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoYXQuJHRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgdGhhdC5vblNsaWRlTW92ZSh7IGluZGV4OiB0aGF0LmhlYWRlci50YWJJbmRleCB9KTtcclxuICAgICAgICB9LDIwMClcclxuICAgIH0gXHJcbiAgICBvcGVuaW5mb1BvcG92ZXIgKCRldmVudCwgaW5kZXgpIHtcclxuICAgICAgICBpZiAodHlwZW9mIGluZGV4ID09IFwidW5kZWZpbmVkXCIgfHwgaW5kZXggPT0gXCJcIikge1xyXG4gICAgICAgICAgICB0aGlzLmluZm9kYXRhID0gJ05vIGluZm8gYXZhaWxhYmxlJztcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgdGhpcy5pbmZvZGF0YT1pbmRleDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc29sZS5sb2coaW5kZXgpO1xyXG4gICAgICAgIHRoaXMuaW5mb3BvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjbG9zZVBvcG92ZXIoKSB7XHJcbiAgICAgICAgdGhpcy5ncmFwaHBvcG92ZXIuaGlkZSgpO1xyXG4gICAgfTtcclxuICAgIGNsb3Nlc0JhclBvcG92ZXIoKXtcclxuICAgICAgICB0aGlzLmRyaWxsQmFycG9wb3Zlci5oaWRlKCk7XHJcbiAgICB9XHJcbiAgICBjbG9zZUluZm9Qb3BvdmVyKCkge1xyXG4gICAgICAgIHRoaXMuaW5mb3BvcG92ZXIuaGlkZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZUhlYWRlcigpIHtcclxuXHRcdHZhciBmbG93bk1vbnRoID0gdGhpcy5oZWFkZXIuZmxvd25Nb250aDtcclxuICAgICAgICB0aGlzLmhlYWRlci5oZWFkZXJJbmRleCA9IF8uZmluZEluZGV4KHRoaXMuc3ViSGVhZGVyLnBheEZsb3duTWlzTW9udGhzLCBmdW5jdGlvbihjaHI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4gY2hyLmZsb3dNb250aCA9PSBmbG93bk1vbnRoO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuaGVhZGVyLmhlYWRlckluZGV4KTtcclxuXHRcdHRoaXMub25TbGlkZU1vdmUoe2luZGV4OiB0aGlzLmhlYWRlci5oZWFkZXJJbmRleH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG9uU2xpZGVNb3ZlKGRhdGE6IGFueSkge1xyXG4gICAgICAgIHRoaXMuaGVhZGVyLnRhYkluZGV4ID0gZGF0YS5pbmRleDtcclxuICAgICAgICBzd2l0Y2godGhpcy5oZWFkZXIudGFiSW5kZXgpe1xyXG4gICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Rmxvd25GYXZvcml0ZXMoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgdGhpcy5jYWxsTWV0cmljU25hcHNob3QoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgdGhpcy5jYWxsVGFyZ2V0VnNBY3R1YWwoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgdGhpcy5jYWxsUmV2ZW51ZUFuYWx5c2lzKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDQ6XHJcbiAgICAgICAgICAgIHRoaXMuY2FsbFNlY3RvckNhcnJpZXJBbmFseXNpcygpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSA1OlxyXG4gICAgICAgICAgICB0aGlzLmNhbGxSb3V0ZVJldmVudWUoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICB0b2dnbGVNZXRyaWMgKHZhbCkge1xyXG4gICAgICAgIHRoaXMudG9nZ2xlLm1vbnRoT3JZZWFyID0gdmFsO1xyXG4gICAgICAgIHRoaXMub25TbGlkZU1vdmUoe2luZGV4OiB0aGlzLmhlYWRlci50YWJJbmRleH0pO1xyXG4gICAgfVxyXG4gICAgdG9nZ2xlU3VyY2hhcmdlKCkge1xyXG4gICAgICAgIHRoaXMub25TbGlkZU1vdmUoe2luZGV4OnRoaXMuaGVhZGVyLnRhYkluZGV4fSk7XHJcbiAgICB9XHJcbiAgICB0b2dnbGVUYXJnZXQodmFsKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUudGFyZ2V0UmV2T3JQYXggPSB2YWw7XHJcbiAgICB9XHJcblxyXG4gICAgdG9nZ2xlU2VjdG9yKHZhbCkge1xyXG4gICAgICAgIHRoaXMudG9nZ2xlLnNlY3RvclJldk9yUGF4ID0gdmFsO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxNZXRyaWNTbmFwc2hvdCgpIHtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcclxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VybmFtZSxcclxuICAgICAgICAgICAgdG9nZ2xlMTogdGhpcy50b2dnbGUubW9udGhPclllYXIsXHJcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0TWV0cmljU25hcHNob3QocmVxZGF0YSlcclxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdGlmKGRhdGEucmVzcG9uc2Uuc3RhdHVzID09PSBcInN1Y2Nlc3NcIil7XHJcblx0XHRcdFx0Ly8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXHJcblx0XHRcdFx0dGhhdC5tZXRyaWNSZXN1bHQgID0gXy5zb3J0QnkoZGF0YS5yZXNwb25zZS5kYXRhLm1ldHJpY1NuYXBzaG90Q2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcclxuXHRcdFx0XHRcdGlmICh1KSByZXR1cm4gW3UuZmF2b3JpdGVDaGFydFBvc2l0aW9uXTsgXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdF8uZm9yRWFjaCh0aGF0Lm1ldHJpY1Jlc3VsdCwgZnVuY3Rpb24gKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG5cdFx0XHRcdFx0bi52YWx1ZXNbMF0uY29sb3IgPSB0aGF0LkdSQVBIX0NPTE9SUy5NRVRSSUNbMF07XHJcblx0XHRcdFx0XHRuLnZhbHVlc1sxXS5jb2xvciA9IHRoYXQuR1JBUEhfQ09MT1JTLk1FVFJJQ1sxXTtcclxuXHRcdFx0XHRcdGlmKG4udmFsdWVzWzJdKSBuLnZhbHVlc1syXS5jb2xvciA9IHRoYXQuR1JBUEhfQ09MT1JTLk1FVFJJQ1syXTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0dGhhdC5mYXZNZXRyaWNSZXN1bHQgPSBfLmZpbHRlcih0aGF0Lm1ldHJpY1Jlc3VsdCwgZnVuY3Rpb24odTogYW55KSB7XHJcblx0XHRcdFx0XHRpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0dGhhdC5tZXRyaWNMZWdlbmRzID0gZGF0YS5yZXNwb25zZS5kYXRhLmxlZ2VuZHM7XHJcblx0XHRcdFx0aWYodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xyXG5cdFx0XHRcdFx0dGhhdC5tZXRyaWNSZXN1bHQgPSB0aGF0LmZhdk1ldHJpY1Jlc3VsdDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdH1lbHNle1xyXG5cdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0XHRcdCAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XHJcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcclxuXHRcdFx0XHRcdGNvbnRlbnQ6ICdObyBEYXRhIEZvdW5kIGZvciBNZXRyaWNTbmFwc2hvdCEhISdcclxuXHRcdFx0XHQgIH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XHJcblx0XHRcdFx0XHQgIGNvbnNvbGUubG9nKCdkb25lJyk7XHJcblx0XHRcdFx0ICB9KTtcclxuXHRcdFx0fVxyXG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY2FsbFRhcmdldFZzQWN0dWFsKCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgICAgICAgZnVsbERhdGFGbGFnOiAnJ1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcblxyXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRUYXJnZXRWc0FjdHVhbChyZXFkYXRhKVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcclxuXHRcdFx0XHQvLyBmYXYgSXRlbXMgdG8gZGlzcGxheSBpbiBkYXNoYm9hcmRcclxuXHRcdFx0XHR0aGF0LmZhdlRhcmdldExpbmVSZXN1bHQgPSBfLmZpbHRlcihkYXRhLnJlc3BvbnNlLmRhdGEubGluZUNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7IFxyXG5cdFx0XHRcdFx0aWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHRoYXQuZmF2VGFyZ2V0QmFyUmVzdWx0ID0gXy5maWx0ZXIoZGF0YS5yZXNwb25zZS5kYXRhLnZlckJhckNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7IFxyXG5cdFx0XHRcdFx0aWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdF8uZm9yRWFjaChkYXRhLnJlc3BvbnNlLmRhdGEudmVyQmFyQ2hhcnRzLCBmdW5jdGlvbiAobjogYW55LCB2YWx1ZTogYW55KSB7XHJcblx0XHRcdFx0XHRuLnZhbHVlc1swXS5jb2xvciA9IHRoYXQuR1JBUEhfQ09MT1JTLnZlckJhckNoYXJ0c1swXTtcclxuXHRcdFx0XHRcdG4udmFsdWVzWzFdLmNvbG9yID0gdGhhdC5HUkFQSF9DT0xPUlMudmVyQmFyQ2hhcnRzWzFdO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHR2YXIgbGluZUNvbG9ycyA9IFt7XCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5MSU5FWzBdLCBcImNsYXNzZWRcIjogXCJkYXNoZWRcIixcInN0cm9rZVdpZHRoXCI6IDJ9LFxyXG5cdFx0XHRcdHtcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkxJTkVbMV19LHtcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkxJTkVbMl0sIFwiYXJlYVwiIDogdHJ1ZSwgXCJkaXNhYmxlZFwiOiB0cnVlfV07XHJcblxyXG5cdFx0XHRcdF8uZm9yRWFjaChkYXRhLnJlc3BvbnNlLmRhdGEubGluZUNoYXJ0cywgZnVuY3Rpb24gKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG5cdFx0XHRcdFx0Xy5tZXJnZShuLmxpbmVDaGFydEl0ZW1zLCBsaW5lQ29sb3JzKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Y29uc29sZS5sb2coZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHMpO1xyXG5cclxuXHRcdFx0XHR0aGF0LnRhcmdldEFjdHVhbERhdGEgPSB7XHJcblx0XHRcdFx0XHRob3JCYXJDaGFydDogZGF0YS5yZXNwb25zZS5kYXRhLnZlckJhckNoYXJ0cyxcclxuXHRcdFx0XHRcdGxpbmVDaGFydDogZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHNcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuXHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0ICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcclxuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxyXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQgZm9yIFRhcmdldFZzQWN0dWFsISEhJ1xyXG5cdFx0XHRcdCAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcclxuXHRcdFx0XHRcdCAgY29uc29sZS5sb2coJ2RvbmUnKTtcclxuXHRcdFx0XHQgIH0pO1xyXG5cdFx0XHR9XHJcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjYWxsUm91dGVSZXZlbnVlKCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB2YXIgcm91dGVSZXZSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXHJcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWVcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRSb3V0ZVJldmVudWUocm91dGVSZXZSZXF1ZXN0KVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcclxuXHRcdFx0XHR0aGF0LnJvdXRlUmV2RGF0YSA9IGRhdGEucmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0ICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcclxuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxyXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQgUm91dGVSZXZlbnVlISEhJ1xyXG5cdFx0XHRcdCAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcclxuXHRcdFx0XHRcdCAgY29uc29sZS5sb2coJ2RvbmUnKTtcclxuXHRcdFx0XHQgIH0pO1xyXG5cdFx0XHR9XHJcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBjYWxsUmV2ZW51ZUFuYWx5c2lzKCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgICAgICAgZnVsbERhdGFGbGFnOiAnJ1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFJldmVudWVBbmFseXNpcyhyZXFkYXRhKVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcclxuXHRcdFx0XHQvLyBmYXYgSXRlbXMgdG8gZGlzcGxheSBpbiBkYXNoYm9hcmRcclxuXHRcdFx0XHR2YXIganNvbk9iaiA9IGRhdGEucmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0XHR2YXIgc29ydGVkRGF0YSA9IF8uc29ydEJ5KGpzb25PYmoubXVsdGliYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuXHRcdFx0XHRcdGlmICh1KSByZXR1cm4gW3UuZmF2b3JpdGVDaGFydFBvc2l0aW9uXTsgXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0dmFyIGZhdlJldmVudWVCYXJSZXN1bHQgPSBfLmZpbHRlcihzb3J0ZWREYXRhLCBmdW5jdGlvbih1OiBhbnkpIHsgXHJcblx0XHRcdFx0XHRpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0dmFyIHNvcnRlZERhdGEgPSBfLnNvcnRCeShqc29uT2JqLnBpZUNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7IFxyXG5cdFx0XHRcdFx0aWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR2YXIgZmF2UmV2ZW51ZVBpZVJlc3VsdCA9IF8uZmlsdGVyKHNvcnRlZERhdGEsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuXHRcdFx0XHRcdGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0dmFyIGJhckNvbG9ycyA9IFt0aGF0LkdSQVBIX0NPTE9SUy5CQVJbMF0sIHRoYXQuR1JBUEhfQ09MT1JTLkJBUlsxXV07XHJcblx0XHRcdFx0Xy5tZXJnZShqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzFdLCBiYXJDb2xvcnMpO1xyXG5cdFx0XHRcdF8uZm9yRWFjaChqc29uT2JqLm11bHRpYmFyQ2hhcnRzLCBmdW5jdGlvbihuOiBhbnksIHZhbHVlOiBhbnkpIHtcclxuXHRcdFx0XHRcdG4uY29sb3IgPSBiYXJDb2xvcnNbdmFsdWVdO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHR2YXIgcGllQ29sb3JzID0gW3tcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLlBJRVswXX0se1wiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuUElFWzFdfSx7XCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5QSUVbMl19XTtcclxuXHRcdFx0XHRfLmZvckVhY2goanNvbk9iai5waWVDaGFydHNbMF0uZGF0YSwgZnVuY3Rpb24gKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG5cdFx0XHRcdFx0bi5sYWJlbCA9IG4ueHZhbDtcclxuXHRcdFx0XHRcdG4udmFsdWUgPSBuLnl2YWw7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdF8ubWVyZ2UoanNvbk9iai5waWVDaGFydHNbMF0uZGF0YSwgcGllQ29sb3JzKTtcclxuXHJcblx0XHRcdFx0dGhhdC5yZXZlbnVlRGF0YSA9IHtcclxuXHRcdFx0XHRcdHJldmVudWVQaWVDaGFydCA6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxyXG5cdFx0XHRcdFx0cmV2ZW51ZUJhckNoYXJ0IDoganNvbk9iai5tdWx0aWJhckNoYXJ0c1sxXSxcclxuXHRcdFx0XHRcdHJldmVudWVIb3JCYXJDaGFydCA6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMl0ubXVsdGliYXJDaGFydEl0ZW1zXHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuXHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0ICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcclxuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxyXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQgRm9yIFJldmVudWVBbmFseXNpcyEhISdcclxuXHRcdFx0XHQgIH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XHJcblx0XHRcdFx0XHQgIGNvbnNvbGUubG9nKCdkb25lJyk7XHJcblx0XHRcdFx0ICB9KTtcclxuXHRcdFx0fVxyXG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgb3BlbkRyaWxsRG93bihyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCkge1xyXG4gICAgICAgIHNlbEZpbmRMZXZlbCA9IE51bWJlcihzZWxGaW5kTGV2ZWwpO1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsXSA9IHJlZ2lvbkRhdGE7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbCArIDFdID0gJyc7XHJcbiAgICAgICAgaWYoc2VsRmluZExldmVsICE9ICczJykge1xyXG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgICAgICAgdGhpcy5yZWdpb25OYW1lID0gKHJlZ2lvbkRhdGEucmVnaW9uTmFtZSkgPyByZWdpb25EYXRhLnJlZ2lvbk5hbWUgOiByZWdpb25EYXRhLmNoYXJ0TmFtZTtcclxuICAgICAgICAgICAgdmFyIGNvdW50cnlGcm9tVG8gPSAocmVnaW9uRGF0YS5jb3VudHJ5RnJvbSAmJiByZWdpb25EYXRhLmNvdW50cnlUbykgPyByZWdpb25EYXRhLmNvdW50cnlGcm9tICsgJy0nICsgcmVnaW9uRGF0YS5jb3VudHJ5VG8gOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgc2VjdG9yRnJvbVRvID0gKHJlZ2lvbkRhdGEuZmxvd25TZWN0b3IgJiYgZHJpbGxMZXZlbCA+PSAzKSA/IHJlZ2lvbkRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKHJlZ2lvbkRhdGEuZmxpZ2h0TnVtYmVyICYmIGRyaWxsTGV2ZWwgPT0gNCkgPyByZWdpb25EYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXHJcbiAgICAgICAgICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmhlYWRlci51c2VybmFtZSxcclxuICAgICAgICAgICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcclxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxyXG4gICAgICAgICAgICAgICAgXCJyZWdpb25OYW1lXCI6ICh0aGlzLnJlZ2lvbk5hbWUpPyB0aGlzLnJlZ2lvbk5hbWUgOiBcIk5vcnRoIEFtZXJpY2FcIixcclxuICAgICAgICAgICAgICAgIFwiY291bnRyeUZyb21Ub1wiOiBjb3VudHJ5RnJvbVRvLFxyXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JGcm9tVG9cIjogc2VjdG9yRnJvbVRvLFxyXG4gICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgXCJmbGlnaHREYXRlXCI6IDBcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRSb3V0ZVJldmVudWVEcmlsbERvd24ocmVxZGF0YSlcclxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGRhdGEucmVzcG9uc2U7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgIHZhciBmaW5kTGV2ZWwgPSBkcmlsbExldmVsIC0gMTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEuc3RhdHVzKTtcclxuICAgICAgICAgICAgICAgIGlmKGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJyl7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5pdGVtc1swXSA9IGRhdGEuZGF0YS5yb3dzO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0ub3JnSXRlbXNbMF0gPSBkYXRhLmRhdGEucm93cztcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zb3J0KCdwYXhDb3VudCcsZmluZExldmVsLGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZHJpbGxMZXZlbCk7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGZpbmRMZXZlbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sZnVuY3Rpb24oZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgICAgICAgICAgICB0aGF0LmNsb3Nlc1BvcG92ZXIoKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgICAgICAgICAgICAgIGFsZXJ0KCdTZXJ2ZXIgRXJyb3InKTtcclxuICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgIH0gXHJcbiAgICB9XHJcbiAgICBjbGVhckRyaWxsKGxldmVsOiBudW1iZXIpIHtcclxuICAgICAgICB2YXIgaTogbnVtYmVyO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSBsZXZlbDsgaSA8IHRoaXMuZ3JvdXBzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldLml0ZW1zLnNwbGljZSgwLCAxKTtcclxuICAgICAgICAgICAgdGhpcy5ncm91cHNbaV0ub3JnSXRlbXMuc3BsaWNlKDAsIDEpO1xyXG4gICAgICAgICAgICB0aGlzLnNvcnQoJ3BheENvdW50JyxpLGZhbHNlKTtcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW2ldID0gJyc7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZHJpbGxEb3duUmVxdWVzdCAoZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpe1xyXG4gICAgICAgIHZhciByZXFkYXRhO1xyXG4gICAgICAgIGlmKGRyaWxsVHlwZSA9PSAnYmFyJykge1xyXG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgICAgICAgaWYgKGRhdGEubGFiZWwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGEubGFiZWw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBkcmlsbEJhcjogc3RyaW5nO1xyXG4gICAgICAgICAgICBkcmlsbEJhciA9IChkYXRhLmxhYmVsKSA/IGRhdGEubGFiZWwgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgcm91dGVDb2RlID0gKGRhdGEucm91dGVDb2RlKSA/IGRhdGEucm91dGVDb2RlIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIHNlY3RvciA9IChkYXRhLmZsb3duU2VjdG9yKSA/IGRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcclxuXHJcbiAgICAgICAgICAgIGlmICghZHJpbGxCYXIpIHtcclxuICAgICAgICAgICAgICAgIGRyaWxsQmFyID0gdGhpcy5kcmlsbEJhckxhYmVsO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZHJpbGxCYXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cclxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxyXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXHJcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICAgICAgICAgIFwiZHJpbGxCYXJcIjogZHJpbGxCYXIsXHJcbiAgICAgICAgICAgICAgICBcInJvdXRlQ29kZVwiOiByb3V0ZUNvZGUsXHJcbiAgICAgICAgICAgICAgICBcInNlY3RvclwiOiBzZWN0b3IsXHJcbiAgICAgICAgICAgICAgICBcImZsaWdodE51bWJlclwiOiBmbGlnaHROdW1iZXJcclxuICAgICAgICAgICAgfTsgIFxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGlmKGRyaWxsVHlwZSA9PSAndGFyZ2V0Jykge1xyXG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgICAgICAgaWYgKGRhdGEubGFiZWwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGEubGFiZWw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciByb3V0ZXR5cGU6IHN0cmluZztcclxuICAgICAgICAgICAgcm91dGV0eXBlID0gKGRhdGEucm91dGV0eXBlKSA/IGRhdGEucm91dGV0eXBlIDogXCJcIjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cclxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxyXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcInN0cmluZ1wiLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXHJcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICAgICAgICAgIFwicm91dGV0eXBlXCI6IHJvdXRldHlwZVxyXG4gICAgICAgICAgICB9OyAgXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihkcmlsbFR5cGUgPT0gJ2FuYWx5c2lzJykge1xyXG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHZhciByZWdpb25OYW1lO1xyXG4gICAgICAgICAgICB2YXIgY291bnRyeUZyb21UbztcclxuICAgICAgICAgICAgdmFyIG93bk9hbEZsYWc7XHJcbiAgICAgICAgICAgIHZhciBzZWN0b3JGcm9tVG87XHJcbiAgICAgICAgICAgIHZhciBmbGlnaHROdW1iZXI7XHJcblxyXG4gICAgICAgICAgICBpZiAoZHJpbGxMZXZlbCA+IDEpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgcmVnaW9uTmFtZSA9IChkYXRhLnJlZ2lvbk5hbWUpID8gZGF0YS5yZWdpb25OYW1lIDogXCJcIjtcclxuICAgICAgICAgICAgICAgIGNvdW50cnlGcm9tVG8gPSAoZGF0YS5jb3VudHJ5RnJvbSAmJiBkYXRhLmNvdW50cnlUbykgPyBkYXRhLmNvdW50cnlGcm9tICsgJy0nICsgZGF0YS5jb3VudHJ5VG8gOiBcIlwiO1xyXG4gICAgICAgICAgICAgICAgb3duT2FsRmxhZyA9IChkYXRhLm93bk9hbCkgPyBkYXRhLm93bk9hbCA6IFwiXCI7XHJcbiAgICAgICAgICAgICAgICBzZWN0b3JGcm9tVG8gPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgICAgICAgICAgIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcblxyXG4gICAgICAgICAgICByZXFkYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWScgOiAnTicsXHJcbiAgICAgICAgICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmhlYWRlci51c2VybmFtZSxcclxuICAgICAgICAgICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwic3RyaW5nXCIsXHJcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcclxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxyXG4gICAgICAgICAgICAgICAgXCJyZWdpb25OYW1lXCI6IHJlZ2lvbk5hbWUsXHJcbiAgICAgICAgICAgICAgICBcImNvdW50cnlGcm9tVG9cIjogY291bnRyeUZyb21UbyxcclxuICAgICAgICAgICAgICAgIFwib3duT2FsRmxhZ1wiOiBvd25PYWxGbGFnLFxyXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JGcm9tVG9cIjogc2VjdG9yRnJvbVRvLFxyXG4gICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgXCJmbGlnaHREYXRlXCI6IDBcclxuICAgICAgICAgICAgfTsgIFxyXG4gICAgICAgIH1cclxuICAgICAgICBpZihkcmlsbFR5cGUgPT0gJ3Bhc3Nlbmdlci1jb3VudCcpIHtcclxuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdmFyIHRvZ2dsZTEgPSAoZGF0YS50b2dnbGUxKSA/IGRhdGEudG9nZ2xlMSA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciB0b2dnbGUyOiBhbnkgPSAoZGF0YS50b2dnbGUyKSA/IGRhdGEudG9nZ2xlMiA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciByb3V0ZUNvZGUgPSAoZGF0YS5yb3V0ZUNvZGUpID8gZGF0YS5yb3V0ZUNvZGUgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgc2VjdG9yICA9IChkYXRhLmZsb3duU2VjdG9yKSA/IGRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyICA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtjb25zb2xlLmxvZyhkYXRhKTtcclxuXHJcbiAgICAgICAgICAgIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJyA6ICdOJyxcclxuICAgICAgICAgICAgICAgIFwidXNlcklkXCI6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJzdHJpbmdcIixcclxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxyXG4gICAgICAgICAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXHJcbiAgICAgICAgICAgICAgICBcInRvZ2dsZTFcIjogdG9nZ2xlMSxcclxuICAgICAgICAgICAgICAgIFwidG9nZ2xlMlwiOiB0b2dnbGUyLFxyXG4gICAgICAgICAgICAgICAgXCJyb3V0ZUNvZGVcIjogcm91dGVDb2RlLFxyXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JcIjogc2VjdG9yLFxyXG4gICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyXHJcbiAgICAgICAgICAgIH07ICBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKGRyaWxsVHlwZSA9PSAnbmV0d29yay1SZXZlbnVlJykge1xyXG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChkYXRhLmxhYmVsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhLmxhYmVsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICB2YXIgZHJpbGxCYXI6IHN0cmluZztcclxuICAgICAgICAgICAgZHJpbGxCYXIgPSAoZGF0YS5sYWJlbCkgPyBkYXRhLmxhYmVsIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIHRvZ2dsZTEgPSAoZGF0YS50b2dnbGUxKSA/IGRhdGEudG9nZ2xlMSA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBQT1NDb3VudHJ5ID0gKGRhdGEuUE9TY291bnRyeSkgPyBkYXRhLlBPU2NvdW50cnkgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgUE9TUmVnaW9uID0gKGRhdGEuUE9TcmVnaW9uKSA/IGRhdGEuUE9TcmVnaW9uIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIFBPU0NpdHkgPSAoZGF0YS5QT1NjaXR5KSA/IGRhdGEuUE9TY2l0eSA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBkb2N1bWVudFR5cGUgPSAoZGF0YS5kb2N1bWVudFR5cGUpID8gZGF0YS5kb2N1bWVudFR5cGUgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgc2VjdG9yID0gKGRhdGEuc2VjdG9yKSA/IGRhdGEuc2VjdG9yIDogXCJcIjtcclxuXHJcbiAgICAgICAgICAgIGlmICghZHJpbGxCYXIpIHtcclxuICAgICAgICAgICAgICAgIGRyaWxsQmFyID0gdGhpcy5kcmlsbEJhckxhYmVsO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZHJpbGxCYXIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHJcbiAgICAgICAgICAgIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJyA6ICdOJyxcclxuICAgICAgICAgICAgICAgIFwidXNlcklkXCI6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJzdHJpbmdcIixcclxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbEJhclwiOiBkcmlsbEJhcixcclxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxyXG4gICAgICAgICAgICAgICAgXCJ0b2dnbGUxXCI6IHRvZ2dsZTEsXHJcbiAgICAgICAgICAgICAgICBcIlBPU1JlZ2lvblwiOiBQT1NSZWdpb24sXHJcbiAgICAgICAgICAgICAgICBcIlBPU0NvdW50cnlcIjogUE9TQ291bnRyeSxcclxuICAgICAgICAgICAgICAgIFwiUE9TQ2l0eVwiOiBQT1NDaXR5LFxyXG4gICAgICAgICAgICAgICAgXCJkb2N1bWVudFR5cGVcIjogZG9jdW1lbnRUeXBlLFxyXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JcIjogc2VjdG9yXHJcbiAgICAgICAgICAgIH07ICBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKGRyaWxsVHlwZSA9PSAneWllbGQnKSB7XHJcbiAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGRhdGEubGFiZWwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGEubGFiZWw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgIHZhciBkcmlsbEJhcjogc3RyaW5nO1xyXG4gICAgICAgICAgICBkcmlsbEJhciA9IChkYXRhLmxhYmVsKSA/IGRhdGEubGFiZWwgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgdG9nZ2xlMSA9IChkYXRhLnRvZ2dsZTEpID8gZGF0YS50b2dnbGUxIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIHJvdXRlQ29kZSA9IChkYXRhLnJvdXRlQ29kZSkgPyBkYXRhLnJvdXRlQ29kZSA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBzZWN0b3IgPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWRyaWxsQmFyKSB7XHJcbiAgICAgICAgICAgICAgICBkcmlsbEJhciA9IHRoaXMuZHJpbGxCYXJMYWJlbDtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRyaWxsQmFyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcblxyXG4gICAgICAgICAgICByZXFkYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWScgOiAnTicsXHJcbiAgICAgICAgICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmhlYWRlci51c2VybmFtZSxcclxuICAgICAgICAgICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwic3RyaW5nXCIsXHJcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcclxuICAgICAgICAgICAgICAgIFwiZHJpbGxCYXJcIjogZHJpbGxCYXIsXHJcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICAgICAgICAgIFwidG9nZ2xlMVwiOiB0b2dnbGUxLFxyXG4gICAgICAgICAgICAgICAgXCJyb3V0ZUNvZGVcIjogcm91dGVDb2RlLFxyXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JcIjogc2VjdG9yLFxyXG4gICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyXHJcbiAgICAgICAgICAgIH07ICBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKGRyaWxsVHlwZSA9PSAncnBrbScpIHtcclxuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoZGF0YS5sYWJlbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YS5sYWJlbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgdmFyIGRyaWxsQmFyOiBzdHJpbmc7XHJcbiAgICAgICAgICAgIGRyaWxsQmFyID0gKGRhdGEubGFiZWwpID8gZGF0YS5sYWJlbCA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciB0b2dnbGUxID0gKGRhdGEudG9nZ2xlMSkgPyBkYXRhLnRvZ2dsZTEgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgYWlyY3JhZnR0eXBlID0gKGRhdGEuYWlyY3JhZnR0eXBlKSA/IGRhdGEuYWlyY3JhZnR0eXBlIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIGFpcmNyYWZ0cmVnbm8gPSAoZGF0YS5haXJjcmFmdHJlZ25vKSA/IGRhdGEuYWlyY3JhZnRyZWdubyA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBhaXJjcmFmdGxlZyA9IChkYXRhLmFpcmNyYWZ0bGVnKSA/IGRhdGEuYWlyY3JhZnRsZWcgOiBcIlwiO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFkcmlsbEJhcikge1xyXG4gICAgICAgICAgICAgICAgZHJpbGxCYXIgPSB0aGlzLmRyaWxsQmFyTGFiZWw7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkcmlsbEJhcik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cclxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxyXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcInN0cmluZ1wiLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXHJcbiAgICAgICAgICAgICAgICBcImRyaWxsQmFyXCI6IGRyaWxsQmFyLFxyXG4gICAgICAgICAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXHJcbiAgICAgICAgICAgICAgICBcInRvZ2dsZTFcIjogdG9nZ2xlMSxcclxuICAgICAgICAgICAgICAgIFwiYWlyY3JhZnR0eXBlXCI6IGFpcmNyYWZ0dHlwZSxcclxuICAgICAgICAgICAgICAgIFwiYWlyY3JhZnRyZWdub1wiOiBhaXJjcmFmdHJlZ25vLFxyXG4gICAgICAgICAgICAgICAgXCJhaXJjcmFmdGxlZ1wiOiBhaXJjcmFmdGxlZ1xyXG4gICAgICAgICAgICB9OyAgXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihkcmlsbFR5cGUgPT0gJ2Fza20nKSB7XHJcbiAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGRhdGEubGFiZWwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGEubGFiZWw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgIHZhciBkcmlsbEJhcjogc3RyaW5nO1xyXG4gICAgICAgICAgICBkcmlsbEJhciA9IChkYXRhLmxhYmVsKSA/IGRhdGEubGFiZWwgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgdG9nZ2xlMSA9IChkYXRhLnRvZ2dsZTEpID8gZGF0YS50b2dnbGUxIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIGFpcmNyYWZ0dHlwZSA9IChkYXRhLmFpcmNyYWZ0dHlwZSkgPyBkYXRhLmFpcmNyYWZ0dHlwZSA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBhaXJjcmFmdHJlZ25vID0gKGRhdGEuYWlyY3JhZnRyZWdubykgPyBkYXRhLmFpcmNyYWZ0cmVnbm8gOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgYWlyY3JhZnRsZWcgPSAoZGF0YS5haXJjcmFmdGxlZykgPyBkYXRhLmFpcmNyYWZ0bGVnIDogXCJcIjtcclxuXHJcbiAgICAgICAgICAgIGlmICghZHJpbGxCYXIpIHtcclxuICAgICAgICAgICAgICAgIGRyaWxsQmFyID0gdGhpcy5kcmlsbEJhckxhYmVsO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZHJpbGxCYXIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHJcbiAgICAgICAgICAgIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJyA6ICdOJyxcclxuICAgICAgICAgICAgICAgIFwidXNlcklkXCI6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJzdHJpbmdcIixcclxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbEJhclwiOiBkcmlsbEJhcixcclxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxyXG4gICAgICAgICAgICAgICAgXCJ0b2dnbGUxXCI6IHRvZ2dsZTEsXHJcbiAgICAgICAgICAgICAgICBcImFpcmNyYWZ0dHlwZVwiOiBhaXJjcmFmdHR5cGUsXHJcbiAgICAgICAgICAgICAgICBcImFpcmNyYWZ0cmVnbm9cIjogYWlyY3JhZnRyZWdubyxcclxuICAgICAgICAgICAgICAgIFwiYWlyY3JhZnRsZWdcIjogYWlyY3JhZnRsZWdcclxuICAgICAgICAgICAgfTsgIFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICdvYWwtY29udCcpIHtcclxuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoZGF0YS5sYWJlbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YS5sYWJlbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgdmFyIGRyaWxsQmFyOiBzdHJpbmc7XHJcbiAgICAgICAgICAgIGRyaWxsQmFyID0gKGRhdGEubGFiZWwpID8gZGF0YS5sYWJlbCA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciB0b2dnbGUxID0gKGRhdGEudG9nZ2xlMSkgPyBkYXRhLnRvZ2dsZTEgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgdG9nZ2xlMiA9IChkYXRhLnRvZ2dsZTIpID8gZGF0YS50b2dnbGUyIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIGNhcnJpZXJDb2RlID0gKGRhdGEuY2FycmllckNvZGUpID8gZGF0YS5jYXJyaWVyQ29kZSA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBzZWN0b3IgPSAoZGF0YS5zZWN0b3IpID8gZGF0YS5zZWN0b3IgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIGZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlKSA/IGRhdGEuZmxpZ2h0RGF0ZSA6IFwiXCI7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWRyaWxsQmFyKSB7XHJcbiAgICAgICAgICAgICAgICBkcmlsbEJhciA9IHRoaXMuZHJpbGxCYXJMYWJlbDtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRyaWxsQmFyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcblxyXG4gICAgICAgICAgICByZXFkYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWScgOiAnTicsXHJcbiAgICAgICAgICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmhlYWRlci51c2VybmFtZSxcclxuICAgICAgICAgICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwic3RyaW5nXCIsXHJcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcclxuICAgICAgICAgICAgICAgIFwiZHJpbGxCYXJcIjogZHJpbGxCYXIsXHJcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICAgICAgICAgIFwidG9nZ2xlMVwiOiB0b2dnbGUxLFxyXG4gICAgICAgICAgICAgICAgXCJ0b2dnbGUyXCI6IHRvZ2dsZTIsXHJcbiAgICAgICAgICAgICAgICBcImNhcnJpZXJDb2RlXCI6IGNhcnJpZXJDb2RlLFxyXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JcIjogc2VjdG9yLFxyXG4gICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgXCJmbGlnaHREYXRlXCI6IGZsaWdodERhdGVcclxuICAgICAgICAgICAgfTsgIFxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVxZGF0YTtcclxuICAgIH1cclxuICAgIGdldERyaWxsRG93blVSTCAoZHJpbERvd25UeXBlKSB7XHJcbiAgICAgICAgdmFyIHVybFxyXG4gICAgICAgIHN3aXRjaChkcmlsRG93blR5cGUpe1xyXG4gICAgICAgICAgICBjYXNlICdiYXInOlxyXG4gICAgICAgICAgICAgICAgdXJsID0gXCIvcGF4ZmxubWlzL21zcGF4bmV0cmV2ZHJpbGxcIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ3RhcmdldCc6XHJcbiAgICAgICAgICAgICAgICB1cmwgPSBcIi9wYXhmbG5taXMvdGd0dnNhY3RkcmlsbFwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnYW5hbHlzaXMnOlxyXG4gICAgICAgICAgICAgICAgdXJsID0gXCIvcGF4ZmxubWlzL25ldHJldmVudWVvd25vYWxkcmlsbFwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAncGFzc2VuZ2VyLWNvdW50JzpcclxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy9tc3BheGNudGN0YWRyaWxsXCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICduZXR3b3JrLVJldmVudWUnOlxyXG4gICAgICAgICAgICAgICAgdXJsID0gXCIvcGF4ZmxubWlzL21zbmV0cmV2ZHJpbGxcIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ3lpZWxkJzpcclxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy9tc3BheG5ldHlsZGRyaWxsXCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdycGttJzpcclxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy9tc3BheHJwa21yZXZkcmlsbFwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnYXNrbSc6XHJcbiAgICAgICAgICAgICAgICB1cmwgPSBcIi9wYXhmbG5taXMvbXNwYXhhc2ttcmV2ZHJpbGxcIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ29hbC1jb250JzpcclxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy9vYWxjYXJyaWVyYW5hbHlzaXNkcmlsbFwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHVybDtcclxuICAgIH1cclxuICAgIG9wZW5CYXJEcmlsbERvd24oZGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgc2VsRmluZExldmVsID0gTnVtYmVyKHNlbEZpbmRMZXZlbCk7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWxdID0gZGF0YTtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsICsgMV0gPSAnJztcclxuICAgICAgICBcclxuICAgICAgICBpZiAoc2VsRmluZExldmVsICE9ICh0aGlzLmdyb3Vwcy5sZW5ndGggLSAxKSkge1xyXG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICAgICAgICAgIHZhciByZXFkYXRhID0gdGhpcy5kcmlsbERvd25SZXF1ZXN0KHRoaXMuZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpO1xyXG4gICAgICAgICAgICB2YXIgVVJMID0gdGhpcy5nZXREcmlsbERvd25VUkwodGhpcy5kcmlsbFR5cGUpO1xyXG4gICAgICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0RHJpbGxEb3duKHJlcWRhdGEsIFVSTClcclxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGRhdGEucmVzcG9uc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpbmRMZXZlbCA9IGRyaWxsTGV2ZWwgLSAxO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5zdGF0dXMgPT0gJ3N1Y2Nlc3MnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHRoYXQuZHJpbGxUeXBlID09ICdvYWwtY29udCcpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodGhhdC50b2dnbGUuc2VjdG9yUmV2T3JQYXggPT0gXCJwYXhjb3VudFwiKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLml0ZW1zWzBdID0gZGF0YS5kYXRhLnBheGNvdW50cm93cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gZGF0YS5kYXRhLnBheGNvdW50cm93cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSBkYXRhLmRhdGEucmV2ZW51ZXJvd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5vcmdJdGVtc1swXSA9IGRhdGEuZGF0YS5yZXZlbnVlcm93czsgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLml0ZW1zWzBdID0gZGF0YS5kYXRhLnJvd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gZGF0YS5kYXRhLnJvd3M7ICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuc29ydCgncGF4Q291bnQnLCBmaW5kTGV2ZWwsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGRyaWxsTGV2ZWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuc2hvd25Hcm91cCA9IGZpbmRMZXZlbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGZpbmRMZXZlbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmNsb3Nlc1BvcG92ZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ1NlcnZlciBFcnJvcicpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaW5pdGlhdGVBcnJheShkcmlsbHRhYnMpIHtcclxuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIGkgaW4gZHJpbGx0YWJzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IGksXHJcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLmRyaWxsdGFic1tpXSxcclxuICAgICAgICAgICAgICAgIGl0ZW1zOiBbXSxcclxuICAgICAgICAgICAgICAgIG9yZ0l0ZW1zOiBbXSxcclxuICAgICAgICAgICAgICAgIEl0ZW1zQnlQYWdlOiBbXSxcclxuICAgICAgICAgICAgICAgIGZpcnN0Q29sdW1uczogdGhpcy5maXJzdENvbHVtbnNbaV1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBvcGVuQmFyRHJpbGxEb3duUG9wb3ZlcigkZXZlbnQsIHNlbERhdGEsIHNlbEZpbmRMZXZlbCkge1xyXG4gICAgICAgIHRoaXMuZHJpbGxOYW1lID0gJ01FVFJJQyBTTkFQU0hPVCBSRVBPUlQgLSAnICsgc2VsRGF0YS5wb2ludC5sYWJlbDtcclxuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdiYXInO1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XHJcbiAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ1JvdXRlIExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdEYXRhIExldmVsJywgJ0ZsaWdodCBMZXZlbCddO1xyXG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydyb3V0ZUNvZGUnLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2ZsaWdodERhdGUnXTtcclxuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgdGhhdC5kcmlsbEJhcnBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIH0sIDUwKTtcclxuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcclxuICAgIH07XHJcblxyXG4gICAgb3BlblJQS01EcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnUlBLTSc7XHJcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAncnBrbSc7XHJcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcclxuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnUlBLTSBhdCBBaXJjcmFmdCBUeXBlIExldmVsJywgJ1JQS00gYXQgQWlyY3JhZnQgIFJlZ2lzdHJhdGlvbiBOdW1iZXIgTGV2ZWwnLCAnUlBLTSBhdCBBaXJjcmFmdCBMZWcgTGV2ZWwnLCAnUlBLTSBhdCBGbGlnaHQgTnVtYmVyIGFuZCBEYXRlIExldmVsJ107XHJcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2FpcmNyYWZ0dHlwZScsICdhaXJjcmFmdHJlZ25vJywgJ2FpcmNyYWZ0bGVnJywgJ2ZsaWdodE51bWJlciddO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICB0aGF0LmRyaWxsQmFycG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICAgICAgfSwgNTApO1xyXG4gICAgICAgIHRoaXMub3BlbkJhckRyaWxsRG93bihzZWxEYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xyXG4gICAgfVxyXG4gICAgb3BlbkFTS01EcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnQVNLTSc7XHJcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAnYXNrbSc7XHJcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcclxuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnQVNLTSBhdCBBaXJjcmFmdCBUeXBlIExldmVsJywgJ0FTS00gYXQgQWlyY3JhZnQgIFJlZ2lzdHJhdGlvbiBOdW1iZXIgTGV2ZWwnLCAnQVNLTSBhdCBBaXJjcmFmdCBMZWcgTGV2ZWwnLCAnQVNLTSBhdCBGbGlnaHQgTnVtYmVyIGFuZCBEYXRlIExldmVsJ107XHJcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2FpcmNyYWZ0dHlwZScsICdhaXJjcmFmdHJlZ25vJywgJ2FpcmNyYWZ0bGVnJywgJ2ZsaWdodE51bWJlciddO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICB0aGF0LmRyaWxsQmFycG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICAgICAgfSwgNTApO1xyXG4gICAgICAgIHRoaXMub3BlbkJhckRyaWxsRG93bihzZWxEYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xyXG4gICAgfVxyXG4gICAgb3Blbk9BTENvbnREcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnVG9wIDUgT0FMIENvbnRyaWJ1dGlvbic7XHJcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAnb2FsLWNvbnQnO1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XHJcbiAgICAgICAgaWYodGhpcy50b2dnbGUuc2VjdG9yUmV2T3JQYXggPT0gXCJwYXhjb3VudFwiKSB7IFxyXG4gICAgICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnUGF4IENvdW50IGF0IFNlY3RvciBMZXZlbCAtIEZyb20gQ2FycmllciBFSycsICdQYXggQ291bnQgYXQgRmxpZ2h0IE51bWJlciBMZXZlbCAtIEZyb20gQ2FycmllciBFSycsICdQYXggQ291bnQgYXQgRmxpZ2h0IERhdGUgTGV2ZWwgLSBGcm9tIENhcnJpZXIgRUsnLCAnUGF4IENvdW50IGF0IERvY3VtZW50IHR5cGUgTGV2ZWwgLSBGcm9tIENhcnJpZXIgRUsnXTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnUmV2ZW51ZSBhdCBTZWN0b3IgTGV2ZWwnLCAnUmV2ZW51ZSBhdCBGbGlnaHQgTnVtYmVyIExldmVsIC0gRnJvbSBDYXJyaWVyIEVLJywgJ1JldmVudWUgYXQgRmxpZ2h0IERhdGUgTGV2ZWwgLSBGcm9tIENhcnJpZXIgRUsnLCAnUmV2ZW51ZSBhdCBEb2N0eXBlIExldmVsIC0gRnJvbSBDYXJyaWVyIEVLJ107ICAgICAgICAgICAgXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydzZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2ZsaWdodERhdGUnLCAnZG9jdW1lbnRUeXBlJ107XHJcbiAgICAgICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy4kdGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgIHRoYXQuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgICAgICB9LCA1MCk7XHJcbiAgICAgICAgdGhpcy5vcGVuQmFyRHJpbGxEb3duKHNlbERhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XHJcbiAgICB9XHJcbiAgICBvcGVuWWllbGREcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnWWllbGQnO1xyXG4gICAgICAgIHRoaXMuZHJpbGxUeXBlID0gJ3lpZWxkJztcclxuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydZaWVsZCBhdCBSb3V0ZSBMZXZlbCcsICdZaWVsZCBhdCBTZWN0b3IgTGV2ZWwnLCAnWWllbGQgYXQgRmxpZ2h0IExldmVsJywgJ1lpZWxkIGF0IEZsaWdodCBEYXRlIExldmVsJ107XHJcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ3JvdXRlQ29kZScsICdmbG93blNlY3RvcicsICdmbGlnaHROdW1iZXInLCAnZmxpZ2h0RGF0ZSddO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICB0aGF0LmRyaWxsQmFycG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICAgICAgfSwgNTApO1xyXG4gICAgICAgIHRoaXMub3BlbkJhckRyaWxsRG93bihzZWxEYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xyXG4gICAgfTtcclxuICAgIG9wZW5OZXR3b3JrUmV2ZW51ZURyaWxsRG93blBvcG92ZXIoJGV2ZW50LCBzZWxEYXRhLCBzZWxGaW5kTGV2ZWwpIHtcclxuICAgICAgICB0aGlzLmRyaWxsTmFtZSA9ICdOZXR3b3JrIFJldmVudWUnO1xyXG4gICAgICAgIHRoaXMuZHJpbGxUeXBlID0gJ25ldHdvcmstUmV2ZW51ZSc7XHJcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcclxuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnTmV0d29yayBSZXZlbnVlIGF0IFJlZ2lvbiBQT1MgTGV2ZWwnLCAnTmV0d29yayBSZXZlbnVlIGJ5IENvdW50cnkgb2YgUE9TJywgJ05ldHdvcmsgUmV2ZW51ZSBieSBDaXR5IG9mIFBPUycsICdOZXR3b3JrIFJldmVudWUgYnkgRG9jdW1lbnQgVHlwZScsICdOZXR3b3JrIFJldmVudWUgYnkgU2VjdG9yJywnTmV0d29yayBSZXZlbnVlIGJ5IEZsaWdodCBOdW1iZXInXTtcclxuICAgICAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsnUE9TcmVnaW9uJywgJ1BPU2NvdW50cnknLCAnUE9TY2l0eScsICdkb2N1bWVudFR5cGUnLCAnc2VjdG9yJywgJ2ZsaWdodG51bWJlciddO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICB0aGF0LmRyaWxsQmFycG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICAgICAgfSwgNTApO1xyXG4gICAgICAgIHRoaXMub3BlbkJhckRyaWxsRG93bihzZWxEYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xyXG4gICAgfTtcclxuICAgIG9wZW5UYXJnZXREcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnVGFyZ2V0IFZzIEFjdHVhbCc7XHJcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAndGFyZ2V0JztcclxuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydSb3V0ZSBUeXBlJywgJ1JvdXRlIGNvZGUnXTtcclxuICAgICAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsncm91dGV0eXBlJywgJ3JvdXRlY29kZSddO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICB0aGF0LmRyaWxsQmFycG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICAgICAgfSwgNTApO1xyXG4gICAgICAgIHRoaXMub3BlbkJhckRyaWxsRG93bihzZWxEYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xyXG4gICAgfTtcclxuXHJcbiAgICBvcGVuUmV2ZW51ZURyaWxsRG93blBvcG92ZXIoJGV2ZW50LCBzZWxEYXRhLCBzZWxGaW5kTGV2ZWwpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhzZWxEYXRhKTtcclxuICAgICAgICB0aGlzLmRyaWxsTmFtZSA9ICdOZXQgUmV2ZW51ZSBieSBPV04gYW5kIE9BTCc7XHJcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAnYW5hbHlzaXMnO1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XHJcbiAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ0NvdW50cnkgTGV2ZWwnLCAnU2VjdG9yIExldmVsJywgJ0ZsaWdodCBMZXZlbCcsICdEb2N1bWVudCBMZXZlbCddO1xyXG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydjb3VudHJ5RnJvbScsICdmbG93blNlY3RvcicsICdmbGlnaHROdW1iZXInLCAnbmV0UmV2ZW51ZSddO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XHJcbiAgICAgICAgdGhpcy5kcmlsbEJhcnBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIHRoaXMub3BlbkJhckRyaWxsRG93bihzZWxEYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xyXG4gICAgfTtcclxuXHJcbiAgICBvcGVuUmV2ZW51ZVBhc3NlbmdlckRyaWxsRG93blBvcG92ZXIoJGV2ZW50LCBzZWxEYXRhLCBzZWxGaW5kTGV2ZWwpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhzZWxEYXRhKTtcclxuICAgICAgICB0aGlzLmRyaWxsTmFtZSA9ICdQYXNzZW5nZXIgQ291bnQgYnkgQ2xhc3Mgb2YgVHJhdmVsJztcclxuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdwYXNzZW5nZXItY291bnQnO1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XHJcbiAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ1BheCBDb3VudCBhdCBSb3V0ZSBMZXZlbCcsICdQYXggQ291bnQgYXQgU2VjdG9yIExldmVsJywgJ1BheCBDb3VudCBhdCBGbGlnaHQgTnVtYmVyIExldmVsJywgJ1BheCBDb3VudCBhdCBGbGlnaHQgRGF0ZSBMZXZlbCddO1xyXG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydyb3V0ZUNvZGUnLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2ZsaWdodERhdGUnXTtcclxuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcclxuICAgIH07XHJcblxyXG4gICAgb3BlblBvcG92ZXIgKCRldmVudCwgaW5kZXgsIGNoYXJ0dHlwZSkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB0aGlzLmNoYXJ0VHlwZSA9IGNoYXJ0dHlwZTtcclxuICAgICAgICB0aGlzLmdyYXBoSW5kZXggPSBpbmRleDtcclxuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9ncmFwaC1wb3BvdmVyLmh0bWwnLCB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xyXG4gICAgICAgICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcclxuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG9wZW5TZWN0b3JQb3BvdmVyICgkZXZlbnQsaW5kZXgsY2hhcnR0eXBlKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuY2hhcnRUeXBlID0gY2hhcnR0eXBlO1xyXG4gICAgICAgIHRoaXMuZ3JhcGhJbmRleCA9IGluZGV4O1xyXG4gICAgICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL3NlY3Rvci1ncmFwaC1wb3BvdmVyLmh0bWwnLCB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xyXG4gICAgICAgICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcclxuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxTZWN0b3JDYXJyaWVyQW5hbHlzaXMgKCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgICAgICAgdG9nZ2xlMjogJycsXHJcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcblxyXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRTZWN0b3JDYXJyaWVyQW5hbHlzaXMocmVxZGF0YSlcclxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIGlmIChkYXRhLnJlc3BvbnNlLnN0YXR1cyA9PT0gXCJzdWNjZXNzXCIpIHtcclxuICAgICAgICAgICAgICAgIC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxyXG4gICAgICAgICAgICAgICAgdmFyIGpzb25PYmogPSBkYXRhLnJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goanNvbk9iai5TZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHMsIGZ1bmN0aW9uKHZhbDogYW55LCBpOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWxbJ290aGVycyddID0gdmFsLml0ZW1zLnNwbGljZSgtMSwgMSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHZhciBzb3J0ZWREYXRhID0gXy5zb3J0QnkoanNvbk9iai5TZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh1KSByZXR1cm4gW3UuZmF2b3JpdGVDaGFydFBvc2l0aW9uXTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgdmFyIGZhdlNlY3RvckNhcnJpZXJSZXN1bHQgPSBfLmZpbHRlcihzb3J0ZWREYXRhLCBmdW5jdGlvbih1OiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhhdC5TZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHMgPSBqc29uT2JqLlNlY3RvckNhcnJpZXJBbmFseXNpc0NoYXJ0cztcclxuICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgICAgICAgICAgICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcclxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0Vycm9yJyxcclxuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiAnTm8gRGF0YSBGb3VuZCBGb3IgU2VjdG9yQ2FycmllckFuYWx5c2lzISEhJ1xyXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZG9uZScpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHRhcmdldEFjdHVhbEZpbHRlcih0aGF0OiBNaXNDb250cm9sbGVyKSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGl0ZW06IGFueSl7XHJcbiAgICAgICAgICAgIHJldHVybiBpdGVtLnRvZ2dsZTEgPT0gdGhhdC50b2dnbGUudGFyZ2V0UmV2T3JQYXg7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNlY3RvckNhcnJpZXJGaWx0ZXIodGhhdDogTWlzQ29udHJvbGxlcikge1xyXG4gICAgICAgdGhhdCA9IHRoaXMudGhhdDtcclxuICAgICAgIHJldHVybiBmdW5jdGlvbihpdGVtOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGl0ZW0udG9nZ2xlMSA9PSB0aGF0LnRvZ2dsZS5zZWN0b3JPcmRlciAmJiBpdGVtLnRvZ2dsZTIgPT0gdGhhdC50b2dnbGUuc2VjdG9yUmV2T3JQYXg7IFxyXG4gICAgICB9XHJcbiAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgcmV2ZW51ZUFuYWx5c2lzRmlsdGVyKGl0ZW06IGFueSkge1xyXG4gICAgICAgIHZhciBzdXJjaGFyZ2VGbGFnID0gKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyBcIllcIiA6IFwiTlwiO1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHN1cmNoYXJnZUZsYWcrJyA6ICcraXRlbSk7XHJcbiAgICAgICAgaWYoIGl0ZW0uc3VyY2hhcmdlRmxhZyA9PSBzdXJjaGFyZ2VGbGFnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlOyBcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEZsb3duRmF2b3JpdGVzKCkge1xyXG4gICAgICAgIHRoaXMuY2FsbE1ldHJpY1NuYXBzaG90KCk7XHJcbiAgICAgICAgdGhpcy5jYWxsVGFyZ2V0VnNBY3R1YWwoKTtcclxuICAgICAgICB0aGlzLmNhbGxSZXZlbnVlQW5hbHlzaXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBpb25pY0xvYWRpbmdTaG93KCkge1xyXG4gICAgICAgIHRoaXMuJGlvbmljTG9hZGluZy5zaG93KHtcclxuICAgICAgICAgICAgdGVtcGxhdGU6ICc8aW9uLXNwaW5uZXIgY2xhc3M9XCJzcGlubmVyLWNhbG1cIj48L2lvbi1zcGlubmVyPidcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgaW9uaWNMb2FkaW5nSGlkZSgpIHtcclxuICAgICAgICB0aGlzLiRpb25pY0xvYWRpbmcuaGlkZSgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBvcGVuRHJpbGxEb3duUG9wb3ZlcigkZXZlbnQscmVnaW9uRGF0YSxzZWxGaW5kTGV2ZWwpIHtcclxuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdyb3V0ZSc7XHJcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcclxuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnQ291bnRyeSBMZXZlbCcsICdTZWN0b3IgTGV2ZWwnLCAnRmxpZ2h0IExldmVsJywgJ0RvY3VtZW50IExldmVsJ107XHJcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2NvdW50cnlGcm9tJywnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2RvY3VtZW50IyddO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XHJcbiAgICAgICAgdGhpcy5kcmlsbHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIHRoaXMub3BlbkRyaWxsRG93bihyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNsb3Nlc1BvcG92ZXIoKSB7XHJcbiAgICAgICAgdGhpcy5kcmlsbHBvcG92ZXIuaGlkZSgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBpc0RyaWxsUm93U2VsZWN0ZWQobGV2ZWwsb2JqKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0ZWREcmlsbFtsZXZlbF0gPT0gb2JqO1xyXG4gICAgfVxyXG4gICAgc2VhcmNoUmVzdWx0cyAobGV2ZWwsb2JqKSB7XHJcbiAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy5maWx0ZXJlZExpc3RTZXJ2aWNlLnNlYXJjaGVkKHRoaXMuZ3JvdXBzW2xldmVsXS5vcmdJdGVtc1swXSwgb2JqLnNlYXJjaFRleHQsIGxldmVsLCB0aGlzLmRyaWxsVHlwZSk7XHJcbiAgICAgICAgaWYgKG9iai5zZWFyY2hUZXh0ID09ICcnKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVzZXRBbGwobGV2ZWwpOyBcclxuICAgICAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy5ncm91cHNbbGV2ZWxdLm9yZ0l0ZW1zWzBdO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IDA7XHJcbiAgICAgICAgdGhpcy5wYWdpbmF0aW9uKGxldmVsKTsgXHJcbiAgICB9XHJcbiAgICBwYWdpbmF0aW9uIChsZXZlbCkge1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5JdGVtc0J5UGFnZSA9IHRoaXMuZmlsdGVyZWRMaXN0U2VydmljZS5wYWdlZCh0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0sIHRoaXMucGFnZVNpemUgKTtcclxuICAgIH07XHJcblxyXG4gICAgc2V0UGFnZSAobGV2ZWwsIHBhZ2Vubykge1xyXG4gICAgICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gcGFnZW5vO1xyXG4gICAgfTtcclxuICAgIGxhc3RQYWdlKGxldmVsKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UubGVuZ3RoIC0gMTtcclxuICAgIH07XHJcbiAgICByZXNldEFsbChsZXZlbCkge1xyXG4gICAgICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcclxuICAgIH1cclxuICAgIHNvcnQoc29ydEJ5LGxldmVsLG9yZGVyKSB7XHJcbiAgICAgICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XHJcbiAgICAgICAgdGhpcy5jb2x1bW5Ub09yZGVyID0gc29ydEJ5OyBcclxuICAgICAgICAvLyRGaWx0ZXIgLSBTdGFuZGFyZCBTZXJ2aWNlXHJcbiAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy4kZmlsdGVyKCdvcmRlckJ5JykodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLmNvbHVtblRvT3JkZXIsIG9yZGVyKTsgXHJcbiAgICAgICAgdGhpcy5wYWdpbmF0aW9uKGxldmVsKTsgICAgXHJcbiAgICB9O1xyXG4gICAgcmFuZ2UodG90YWwsIGxldmVsKSB7XHJcbiAgICAgICAgdmFyIHJldCA9IFtdO1xyXG4gICAgICAgIHZhciBzdGFydDogbnVtYmVyO1xyXG4gICAgICAgIHN0YXJ0ID0gMDtcclxuICAgICAgICBpZih0b3RhbCA+IDUpIHtcclxuICAgICAgICAgICAgc3RhcnQgPSBOdW1iZXIodGhpcy5jdXJyZW50UGFnZVtsZXZlbF0pIC0gMjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoc3RhcnQgPCAwKSB7XHJcbiAgICAgICAgICBzdGFydCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBrID0gMTtcclxuICAgICAgICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCB0b3RhbDsgaSsrKSB7XHJcbiAgICAgICAgICByZXQucHVzaChpKTtcclxuICAgICAgICAgIGsrKztcclxuICAgICAgICAgIGlmIChrID4gNikge1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJldDtcclxuICAgIH1cclxuXHJcbiAgICB0b2dnbGVHcm91cCAoZ3JvdXApIHtcclxuICAgICAgICBpZiAodGhpcy5pc0dyb3VwU2hvd24oZ3JvdXApKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvd25Hcm91cCA9IG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5zaG93bkdyb3VwID0gZ3JvdXA7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaXNHcm91cFNob3duKGdyb3VwOiBudW1iZXIpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zaG93bkdyb3VwID09IGdyb3VwO1xyXG4gICAgfVxyXG4gICAgdG9nZ2xlQ2hhcnRPclRhYmxlVmlldyh2YWw6IHN0cmluZykge1xyXG4gICAgICAgIHRoaXMudG9nZ2xlLmNoYXJ0T3JUYWJsZSA9IHZhbDtcclxuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xyXG4gICAgfVxyXG4gICAgdG9nZ2xlVGFyZ2V0Vmlldyh2YWw6IHN0cmluZykge1xyXG4gICAgICAgIHRoaXMudG9nZ2xlLnRhcmdldFZpZXcgPSB2YWw7XHJcbiAgICAgICAgdGhpcy5vblNsaWRlTW92ZSh7IGluZGV4OiB0aGlzLmhlYWRlci50YWJJbmRleCB9KTtcclxuICAgIH1cclxuICAgIHRvZ2dsZVJldmVudWVWaWV3KHZhbDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUucmV2ZW51ZVZpZXcgPSB2YWw7XHJcbiAgICAgICAgdGhpcy5vblNsaWRlTW92ZSh7IGluZGV4OiB0aGlzLmhlYWRlci50YWJJbmRleCB9KTtcclxuICAgIH1cclxuICAgIHRvZ2dsZVNlY3RvclZpZXcodmFsOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLnRvZ2dsZS5zZWN0b3JWaWV3ID0gdmFsO1xyXG4gICAgICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XHJcbiAgICB9XHJcblx0cnVuUmVwb3J0KGNoYXJ0VGl0bGU6IHN0cmluZyxtb250aE9yWWVhcjogc3RyaW5nLGZsb3duTW9udGg6IHN0cmluZyl7XHJcblx0XHR2YXIgdGhhdCA9IHRoaXM7XHJcblx0XHQvL2lmIG5vIGNvcmRvdmEsIHRoZW4gcnVubmluZyBpbiBicm93c2VyIGFuZCBuZWVkIHRvIHVzZSBkYXRhVVJMIGFuZCBpZnJhbWVcclxuXHRcdGlmICghd2luZG93LmNvcmRvdmEpIHtcclxuXHRcdFx0dGhhdC5pb25pY0xvYWRpbmdTaG93KCk7XHJcblx0XHRcdHRoaXMucmVwb3J0U3ZjLnJ1blJlcG9ydERhdGFVUkwoY2hhcnRUaXRsZSxtb250aE9yWWVhcixmbG93bk1vbnRoLHRoYXQuaGVhZGVyLnRhYkluZGV4KVxyXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKGRhdGFVUkwpIHtcclxuXHRcdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0XHRcdFx0Ly9zZXQgdGhlIGlmcmFtZSBzb3VyY2UgdG8gdGhlIGRhdGFVUkwgY3JlYXRlZFxyXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyhkYXRhVVJMKTtcclxuXHRcdFx0XHRcdC8vZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BkZkltYWdlJykuc3JjID0gZGF0YVVSTDtcclxuXHRcdFx0XHRcdHdpbmRvdy5vcGVuKGRhdGFVUkwsXCJfc3lzdGVtXCIpO1xyXG5cdFx0XHRcdH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcblx0XHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdFcnJvciAnKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblx0XHQvL2lmIGNvZHJvdmEsIHRoZW4gcnVubmluZyBpbiBkZXZpY2UvZW11bGF0b3IgYW5kIGFibGUgdG8gc2F2ZSBmaWxlIGFuZCBvcGVuIHcvIEluQXBwQnJvd3NlclxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cdFx0XHR0aGlzLnJlcG9ydFN2Yy5ydW5SZXBvcnRBc3luYyhjaGFydFRpdGxlLG1vbnRoT3JZZWFyLGZsb3duTW9udGgsdGhhdC5oZWFkZXIudGFiSW5kZXgpXHJcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZmlsZVBhdGgpIHtcclxuXHRcdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0XHRcdFx0Ly9sb2cgdGhlIGZpbGUgbG9jYXRpb24gZm9yIGRlYnVnZ2luZyBhbmQgb29wZW4gd2l0aCBpbmFwcGJyb3dzZXJcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXBvcnQgcnVuIG9uIGRldmljZSB1c2luZyBGaWxlIHBsdWdpbicpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ1JlcG9ydEN0cmw6IE9wZW5pbmcgUERGIEZpbGUgKCcgKyBmaWxlUGF0aCArICcpJyk7XHJcblx0XHRcdFx0XHR2YXIgbGFzdFBhcnQgPSBmaWxlUGF0aC5zcGxpdChcIi9cIikucG9wKCk7XHJcblx0XHRcdFx0XHR2YXIgZmlsZU5hbWUgPSBcIi9tbnQvc2RjYXJkL1wiK2xhc3RQYXJ0O1x0XHRcdFx0XHRcclxuXHRcdFx0XHRcdGlmKGRldmljZS5wbGF0Zm9ybSAhPVwiQW5kcm9pZFwiKVxyXG5cdFx0XHRcdFx0ZmlsZU5hbWUgPSBmaWxlUGF0aDtcclxuXHRcdFx0XHRcdC8vd2luZG93Lm9wZW5QREYoZmlsZU5hbWUpO1xyXG5cdFx0XHRcdFx0Ly9lbHNlXHJcblx0XHRcdFx0XHQvL3dpbmRvdy5vcGVuKGZpbGVQYXRoLCAnX2JsYW5rJywgJ2xvY2F0aW9uPW5vLGNsb3NlYnV0dG9uY2FwdGlvbj1DbG9zZSxlbmFibGVWaWV3cG9ydFNjYWxlPXllcycpOyovXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRjb3Jkb3ZhLnBsdWdpbnMuZmlsZU9wZW5lcjIub3BlbihcclxuXHRcdFx0XHRcdFx0ZmlsZU5hbWUsIFxyXG5cdFx0XHRcdFx0XHQnYXBwbGljYXRpb24vcGRmJywgXHJcblx0XHRcdFx0XHRcdHsgXHJcblx0XHRcdFx0XHRcdFx0ZXJyb3IgOiBmdW5jdGlvbihlKSB7IFxyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0Vycm9yIHN0YXR1czogJyArIGUuc3RhdHVzICsgJyAtIEVycm9yIG1lc3NhZ2U6ICcgKyBlLm1lc3NhZ2UpO1xyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0c3VjY2VzcyA6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlIG9wZW5lZCBzdWNjZXNzZnVsbHknKTsgICAgICAgICAgICAgICAgXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcblx0XHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdFcnJvciAnKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3NlcnZpY2VzL09wZXJhdGlvbmFsU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50c1wiIC8+XHJcblxyXG5pbnRlcmZhY2UgdGFiT2JqZWN0IHtcclxuICAgIHRpdGxlOiBzdHJpbmcsXHJcbiAgICBuYW1lczogc3RyaW5nLFxyXG4gICAgaWNvbjogc3RyaW5nXHJcbn1cclxuXHJcbmludGVyZmFjZSB0b2dnbGVPYmplY3Qge1xyXG4gICAgbW9udGhPclllYXI6IHN0cmluZyxcclxuICAgIG9wZW5PckNsb3NlZDogc3RyaW5nLFxyXG4gICAgZmxpZ2h0U3RhdHVzOiBzdHJpbmcsXHJcbiAgICBmbGlnaHRSZWFzb246IHN0cmluZyxcclxuICAgIGNjRXhjZXB0aW9uOiBzdHJpbmdcclxufVxyXG5cclxuaW50ZXJmYWNlIGhlYWRlck9iamVjdCB7XHJcbiAgICBmbG93bk1vbnRoOiBzdHJpbmcsXHJcbiAgICB0YWJJbmRleDogbnVtYmVyLFxyXG4gICAgdXNlck5hbWU6IHN0cmluZ1xyXG59XHJcblxyXG5jbGFzcyBPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlciB7XHJcbiAgcHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckc3RhdGUnLCAnJHNjb3BlJywgJyRpb25pY0xvYWRpbmcnLCAnJGlvbmljUG9wb3ZlcicsICckZmlsdGVyJyxcclxuICAgICdPcGVyYXRpb25hbFNlcnZpY2UnLCAnJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZScsICckdGltZW91dCcsICckd2luZG93JywgJ1JlcG9ydFN2YycsICdGaWx0ZXJlZExpc3RTZXJ2aWNlJywgJ1VzZXJTZXJ2aWNlJywgJyRpb25pY0hpc3RvcnknLCAnR1JBUEhfQ09MT1JTJywgJ1RBQlMnLCAnJGlvbmljUG9wdXAnXTtcclxuICBwcml2YXRlIHRhYnM6IFt0YWJPYmplY3RdO1xyXG4gIHByaXZhdGUgdG9nZ2xlOiB0b2dnbGVPYmplY3Q7XHJcbiAgcHJpdmF0ZSBoZWFkZXI6IGhlYWRlck9iamVjdDtcclxuICBwcml2YXRlIHN1YkhlYWRlcjogYW55O1xyXG4gIHByaXZhdGUgZmxpZ2h0UHJvY1N0YXR1czogYW55O1xyXG4gIHByaXZhdGUgZmF2RmxpZ2h0UHJvY1Jlc3VsdDogYW55O1xyXG4gIHByaXZhdGUgY2Fyb3VzZWxJbmRleDogbnVtYmVyID0gMDtcclxuICBwcml2YXRlIGZsaWdodENvdW50UmVhc29uOiBhbnk7XHJcbiAgcHJpdmF0ZSBjb3Vwb25Db3VudEV4Y2VwdGlvbjogYW55O1xyXG4gIHByaXZhdGUgY2hhcnR0eXBlOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBncmFwaFR5cGU6IHN0cmluZztcclxuICBwcml2YXRlIGdyYXBocG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XHJcbiAgcHJpdmF0ZSBwb3BvdmVyc2hvd246IGJvb2xlYW47XHJcbiAgcHJpdmF0ZSB0aHJlZUJhckNoYXJ0Q29sb3JzOiBbc3RyaW5nXSA9IHRoaXMuR1JBUEhfQ09MT1JTLlRIUkVFX0JBUlNfQ0hBUlQ7XHJcbiAgcHJpdmF0ZSBmb3VyQmFyQ2hhcnRDb2xvcnM6IFtzdHJpbmddID0gdGhpcy5HUkFQSF9DT0xPUlMuRk9VUl9CQVJTX0NIQVJUO1xyXG5cclxuICBwcml2YXRlIGluZm9wb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcclxuICBwcml2YXRlIGluZm9kYXRhOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBmbGlnaHRQcm9jU2VjdGlvbjogc3RyaW5nO1xyXG4gIHByaXZhdGUgZmxpZ2h0Q291bnRTZWN0aW9uOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBjb3Vwb25Db3VudFNlY3Rpb246IHN0cmluZztcclxuICBwcml2YXRlIGN1cnJlbnRJbmRleDogbnVtYmVyO1xyXG5cclxuICBwcml2YXRlIHBhZ2VTaXplID0gNDtcclxuICBwcml2YXRlIGN1cnJlbnRQYWdlID0gW107XHJcbiAgcHJpdmF0ZSBzZWxlY3RlZERyaWxsID0gW107XHJcbiAgcHJpdmF0ZSBncm91cHMgPSBbXTtcclxuICBwcml2YXRlIGNvbHVtblRvT3JkZXI6IHN0cmluZztcclxuICBwcml2YXRlIHNob3duR3JvdXA6IG51bWJlcjtcclxuICBwcml2YXRlIGRyaWxsVHlwZTogc3RyaW5nO1xyXG4gIHByaXZhdGUgZHJpbGxCYXJMYWJlbDogc3RyaW5nO1xyXG4gIHByaXZhdGUgZXhjZXB0aW9uQ2F0ZWdvcnk6IHN0cmluZztcclxuICBwcml2YXRlIGRyaWxsdGFiczogc3RyaW5nW107XHJcbiAgcHJpdmF0ZSBkcmlsbE5hbWU6IHN0cmluZztcclxuICBwcml2YXRlIGZpcnN0Q29sdW1uczogc3RyaW5nW107XHJcbiAgcHJpdmF0ZSBkcmlsbHBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xyXG4gIFxyXG4gIHByaXZhdGUgZmxpZ2h0UHJvY0xlZ2VuZHM6IGFueTtcclxuICBwcml2YXRlIGZsaWdodFJlYXNvbkxlZ2VuZHM6IGFueTtcclxuICBwcml2YXRlIGZsaWdodENvdXBvbkxlZ2VuZHM6IGFueTtcclxuICBwcml2YXRlIGZvcm1hdDogYW55ID0gZDMuZm9ybWF0KCcsLjBmJyk7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgJHN0YXRlOiBhbmd1bGFyLnVpLklTdGF0ZVNlcnZpY2UsIHByaXZhdGUgJHNjb3BlOiBuZy5JU2NvcGUsXHJcbiAgICBwcml2YXRlICRpb25pY0xvYWRpbmc6IElvbmljLklMb2FkaW5nLFxyXG4gICAgcHJpdmF0ZSAkaW9uaWNQb3BvdmVyOiBJb25pYy5JUG9wb3ZlciwgcHJpdmF0ZSAkZmlsdGVyOiBuZy5JRmlsdGVyU2VydmljZSxcclxuICAgIHByaXZhdGUgb3BlcmF0aW9uYWxTZXJ2aWNlOiBPcGVyYXRpb25hbFNlcnZpY2UsXHJcbiAgICBwcml2YXRlICRpb25pY1NsaWRlQm94RGVsZWdhdGU6IElvbmljLklTbGlkZUJveERlbGVnYXRlLFxyXG4gICAgcHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLCBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxyXG4gICAgcHJpdmF0ZSByZXBvcnRTdmM6IFJlcG9ydFN2YywgcHJpdmF0ZSBmaWx0ZXJlZExpc3RTZXJ2aWNlOiBGaWx0ZXJlZExpc3RTZXJ2aWNlLFxyXG4gICAgcHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UsIHByaXZhdGUgJGlvbmljSGlzdG9yeTogYW55LCBwcml2YXRlIEdSQVBIX0NPTE9SUzogc3RyaW5nLCBwcml2YXRlIFRBQlM6IHN0cmluZywgcHJpdmF0ZSAkaW9uaWNQb3B1cDogSW9uaWMuSVBvcHVwKSB7XHJcbiAgICAgIFxyXG4gICAgdGhpcy50YWJzID0gdGhpcy5UQUJTLkRCMl9UQUJTO1xyXG5cclxuICAgIHRoaXMudG9nZ2xlID0ge1xyXG4gICAgICBtb250aE9yWWVhcjogJ21vbnRoJyxcclxuICAgICAgb3Blbk9yQ2xvc2VkOiAnT1BFTicsXHJcbiAgICAgIGZsaWdodFN0YXR1czogJ2NoYXJ0JyxcclxuICAgICAgZmxpZ2h0UmVhc29uOiAnY2hhcnQnLFxyXG4gICAgICBjY0V4Y2VwdGlvbjogJ2NoYXJ0J1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmhlYWRlciA9IHtcclxuICAgICAgZmxvd25Nb250aDogJycsXHJcbiAgICAgIHRhYkluZGV4OiAwLFxyXG4gICAgICB1c2VyTmFtZTogJydcclxuICAgIH07XHJcbiAgYW5ndWxhci5lbGVtZW50KHdpbmRvdykuYmluZCgnb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLm9yaWVudGF0aW9uQ2hhbmdlKTsgXHJcbiAgICB0aGlzLmluaXREYXRhKCk7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICB0aGlzLiRzY29wZS4kb24oJ29uU2xpZGVNb3ZlJywgKGV2ZW50OiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcclxuICAgICAgICAgIHRoYXQuJHNjb3BlLk9wckN0cmwub25TbGlkZU1vdmUocmVzcG9uc2UpO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHRoaXMuJHNjb3BlLiRvbignJGlvbmljVmlldy5lbnRlcicsICgpID0+IHtcclxuICAgICAgICBpZiAoIXRoYXQudXNlclNlcnZpY2Uuc2hvd0Rhc2hib2FyZCgnT3BlcmF0aW9uYWwnKSkge1xyXG4gICAgICAgICAgdGhhdC4kc3RhdGUuZ28oXCJsb2dpblwiKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdGhpcy4kc2NvcGUuJG9uKCdvcGVuRHJpbGxQb3B1cDEnLCAoZXZlbnQ6IGFueSwgcmVzcG9uc2U6IGFueSkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlLnR5cGUpO1xyXG4gICAgICAgIGlmIChyZXNwb25zZS50eXBlID09ICdmbGlnaHQtcHJvY2VzcycpIHtcclxuICAgICAgICAgIHRoaXMuJHNjb3BlLk9wckN0cmwub3BlbkZsaWdodFByb2Nlc3NEcmlsbFBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ2NvdXBvbi1jb3VudCcpIHtcclxuICAgICAgICAgIHRoaXMuJHNjb3BlLk9wckN0cmwub3BlbkNvdW5wb25Db3VudERyaWxsUG9wb3ZlcihyZXNwb25zZS5ldmVudCwgeyBcInBvaW50XCI6IHJlc3BvbnNlLmRhdGEgfSwgLTEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAnZmxpZ2h0LWNvdW50Jykge1xyXG4gICAgICAgICAgdGhpcy4kc2NvcGUuT3ByQ3RybC5vcGVuRmxpZ2h0Q291bnREcmlsbFBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgaW5pdERhdGEoKSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9kcmlsZG93bi5odG1sJywge1xyXG4gICAgICBzY29wZTogdGhhdC4kc2NvcGVcclxuICAgIH0pLnRoZW4oZnVuY3Rpb24oZHJpbGxwb3BvdmVyKSB7XHJcbiAgICAgIHRoYXQuZHJpbGxwb3BvdmVyID0gZHJpbGxwb3BvdmVyO1xyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vaW5mb3Rvb2x0aXAuaHRtbCcsIHtcclxuICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXHJcbiAgICB9KS50aGVuKGZ1bmN0aW9uKGluZm9wb3BvdmVyKSB7XHJcbiAgICAgIHRoYXQuaW5mb3BvcG92ZXIgPSBpbmZvcG9wb3ZlcjtcclxuICAgIH0pO1xyXG5cclxuICAgIHZhciByZXEgPSB7XHJcbiAgICAgIHVzZXJJZDogdGhhdC4kd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdyYXBpZE1vYmlsZS51c2VyJylcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmVxLnVzZXJJZCAhPSBcIm51bGxcIikge1xyXG4gICAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRQYXhGbG93bk9wckhlYWRlcihyZXEpLnRoZW4oXHJcbiAgICAgICAgKGRhdGEpID0+IHtcclxuICAgICAgICAgIHRoYXQuc3ViSGVhZGVyID0gZGF0YS5yZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgdGhhdC5oZWFkZXIuZmxvd25Nb250aCA9IHRoYXQuc3ViSGVhZGVyLmRlZmF1bHRNb250aDtcclxuICAgICAgICAgIHRoYXQub25TbGlkZU1vdmUoeyBpbmRleDogMCB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIChlcnJvcikgPT4ge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHRoYXQuaGVhZGVyLnVzZXJOYW1lID0gdGhhdC5nZXRQcm9maWxlVXNlck5hbWUoKTtcclxuICB9XHJcbiAgc2VsZWN0ZWRGbG93bk1vbnRoKG1vbnRoOiBzdHJpbmcpIHtcclxuICAgIHJldHVybiAobW9udGggPT0gdGhpcy5oZWFkZXIuZmxvd25Nb250aCk7XHJcbiAgfVxyXG5cclxuICBnZXRQcm9maWxlVXNlck5hbWUoKTogc3RyaW5nIHtcclxuICAgIGlmICh0aGlzLnVzZXJTZXJ2aWNlLmlzVXNlckxvZ2dlZEluKCkpIHtcclxuICAgICAgdmFyIG9iaiA9IHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicpO1xyXG4gICAgICBpZiAob2JqICE9ICdudWxsJykge1xyXG4gICAgICAgIHZhciBwcm9maWxlVXNlck5hbWUgPSBKU09OLnBhcnNlKG9iaik7XHJcbiAgICAgICAgcmV0dXJuIHByb2ZpbGVVc2VyTmFtZS51c2VybmFtZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICBcclxuICBvcmllbnRhdGlvbkNoYW5nZSA9ICgpOiBib29sZWFuID0+IHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHRoYXQuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgIHRoYXQub25TbGlkZU1vdmUoeyBpbmRleDogdGhhdC5oZWFkZXIudGFiSW5kZXggfSk7XHJcbiAgICB9LCAyMDApXHJcbiAgfVxyXG5cclxuICB1cGRhdGVIZWFkZXIoKSB7XHJcbiAgICB2YXIgZmxvd25Nb250aCA9IHRoaXMuaGVhZGVyLmZsb3duTW9udGg7XHJcbiAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xyXG4gIH1cclxuXHJcbiAgb25TbGlkZU1vdmUoZGF0YTogYW55KSB7XHJcbiAgICB0aGlzLmhlYWRlci50YWJJbmRleCA9IGRhdGEuaW5kZXg7XHJcbiAgICB0aGlzLiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGFGUycpLnNsaWRlKDApO1xyXG5cdHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YUZDJykuc2xpZGUoMCk7XHJcblx0dGhpcy4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhQ0MnKS5zbGlkZSgwKTtcclxuICAgIHN3aXRjaCAodGhpcy5oZWFkZXIudGFiSW5kZXgpIHtcclxuICAgICAgY2FzZSAwOlxyXG4gICAgICAgIHRoaXMuY2FsbE15RGFzaGJvYXJkKCk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgMTpcclxuICAgICAgICB0aGlzLmNhbGxGbGlnaHRQcm9jU3RhdHVzKCk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgMjpcclxuICAgICAgICB0aGlzLmNhbGxGbGlnaHRDb3VudEJ5UmVhc29uKCk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgMzpcclxuICAgICAgICB0aGlzLmNhbGxDb3Vwb25Db3VudEJ5RXhjZXB0aW9uKCk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfTtcclxuICBjYWxsTXlEYXNoYm9hcmQoKSB7XHJcbiAgICB0aGlzLmNhbGxGbGlnaHRQcm9jU3RhdHVzKCk7XHJcbiAgICB0aGlzLmNhbGxGbGlnaHRDb3VudEJ5UmVhc29uKCk7XHJcbiAgICB0aGlzLmNhbGxDb3Vwb25Db3VudEJ5RXhjZXB0aW9uKCk7XHJcbiAgfVxyXG4gIGNhbGxGbGlnaHRQcm9jU3RhdHVzKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdmFyIHJlcWRhdGEgPSB7XHJcbiAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlck5hbWUsXHJcbiAgICAgIHRvZ2dsZTE6ICcnLFxyXG4gICAgICBmdWxsRGF0YUZsYWc6ICdOJ1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckZsaWdodFByb2NTdGF0dXMocmVxZGF0YSlcclxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiICYmIGRhdGEucmVzcG9uc2UuZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc2VjdGlvbk5hbWUnKSl7XHRcdCAgXHJcblx0XHRcdHZhciBqc29uT2JqID0gdGhhdC5hcHBseUNoYXJ0Q29sb3JDb2RlcyhkYXRhLnJlc3BvbnNlLmRhdGEpO1xyXG5cdFx0XHR0aGF0LmZsaWdodFByb2NTZWN0aW9uID0ganNvbk9iai5zZWN0aW9uTmFtZTtcclxuICAgICAgdGhhdC5mbGlnaHRQcm9jTGVnZW5kcyA9IGRhdGEucmVzcG9uc2UuZGF0YS5sZWdlbmRzLnZhbHVlcztcclxuICAgICAgY29uc29sZS5sb2codGhhdC5mbGlnaHRQcm9jTGVnZW5kcyk7XHJcbiAgICAgIGlmICh0aGF0LmhlYWRlci50YWJJbmRleCA9PSAwKSB7XHJcbiAgICAgICAgdGhhdC5mbGlnaHRQcm9jU3RhdHVzID0gdGhhdC5nZXRGYXZvcml0ZUl0ZW1zKGpzb25PYmopO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG4gICAgICAgIHRoYXQuZmxpZ2h0UHJvY1N0YXR1cyA9IHtcclxuICAgICAgICAgIHBpZUNoYXJ0OiBqc29uT2JqLnBpZUNoYXJ0c1swXSxcclxuICAgICAgICAgIHdlZWtEYXRhOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzBdLm11bHRpYmFyQ2hhcnRJdGVtcyxcclxuICAgICAgICAgIHN0YWNrZWRDaGFydDoganNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdLnN0YWNrZWRCYXJjaGFydEl0ZW1zXHJcbiAgICAgICAgfVxyXG5cdFx0XHR9XHJcblx0XHRcdHRoYXQuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdCAgdGhhdC4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhRlMnKS51cGRhdGUoKTtcclxuXHRcdFx0fSwgMCk7XHJcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0fWVsc2V7XHJcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0XHR0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcclxuXHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcclxuXHRcdFx0XHRjb250ZW50OiAnRGF0YSBub3QgZm91bmQgZm9yIEZsaWdodHMgUHJvY2Vzc2luZyBTdGF0dXMhISEnXHJcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2RvbmUnKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0fVxyXG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICB9KTtcclxuICB9XHJcbiAgY2FsbEZsaWdodENvdW50QnlSZWFzb24oKSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VyTmFtZSxcclxuICAgICAgdG9nZ2xlMTogdGhpcy50b2dnbGUub3Blbk9yQ2xvc2VkLnRvTG93ZXJDYXNlKCksXHJcbiAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXHJcbiAgICB9O1xyXG4gICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJGbGlnaHRDb3VudEJ5UmVhc29uKHJlcWRhdGEpXHJcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgaWYgKGRhdGEucmVzcG9uc2Uuc3RhdHVzID09PSBcInN1Y2Nlc3NcIiAmJiBkYXRhLnJlc3BvbnNlLmRhdGEuaGFzT3duUHJvcGVydHkoJ3NlY3Rpb25OYW1lJykpIHtcdFxyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhqc29uT2JqLnBpZUNoYXJ0c1swXSk7XHJcbiAgICAgIHRoYXQuZmxpZ2h0UmVhc29uTGVnZW5kcyA9IGRhdGEucmVzcG9uc2UuZGF0YS5sZWdlbmRzO1xyXG4gICAgICB2YXIganNvbk9iaiA9IHRoYXQuYXBwbHlDaGFydENvbG9yQ29kZXMoZGF0YS5yZXNwb25zZS5kYXRhKTtcclxuXHRcdFx0dGhhdC5mbGlnaHRDb3VudFNlY3Rpb24gPSBqc29uT2JqLnNlY3Rpb25OYW1lO1xyXG5cdFx0XHRpZiAodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xyXG5cdFx0XHQgIHRoYXQuZmxpZ2h0Q291bnRSZWFzb24gPSB0aGF0LmdldEZhdm9yaXRlSXRlbXMoanNvbk9iaik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdCAgdGhhdC5mbGlnaHRDb3VudFJlYXNvbiA9IHtcclxuXHRcdFx0XHRwaWVDaGFydDoganNvbk9iai5waWVDaGFydHNbMF0sXHJcblx0XHRcdFx0d2Vla0RhdGE6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxyXG4gICAgICAgIHN0YWNrZWRDaGFydDoganNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdLnN0YWNrZWRCYXJjaGFydEl0ZW1zXHJcblx0XHRcdCAgfVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGF0LiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHQgIHRoYXQuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YUZDJykudXBkYXRlKCk7XHJcblx0XHRcdH0sIDApO1xyXG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuXHRcdH1lbHNle1xyXG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XHJcbiAgICAgICAgdGl0bGU6ICdFcnJvcicsXHJcbiAgICAgICAgY29udGVudDogJ0RhdGEgbm90IGZvdW5kIGZvciBGbGlnaHRzIENvdW50IGJ5IFJlYXNvbiEhISdcclxuICAgICAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdkb25lJyk7XHJcbiAgICAgIH0pO1xyXG5cclxuXHRcdH1cclxuICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICBjYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbigpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJOYW1lLFxyXG4gICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgZnVsbERhdGFGbGFnOiAnTidcclxuICAgIH07XHJcbiAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckNvdXBvbkNvdW50QnlFeGNlcHRpb24ocmVxZGF0YSlcclxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICBpZiAoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiICYmIGRhdGEucmVzcG9uc2UuZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc2VjdGlvbk5hbWUnKSkge1xyXG5cdFx0XHR2YXIganNvbk9iaiA9IHRoYXQuYXBwbHlDaGFydENvbG9yQ29kZXMoZGF0YS5yZXNwb25zZS5kYXRhKTtcclxuXHRcdFx0dGhhdC5jb3Vwb25Db3VudFNlY3Rpb24gPSBqc29uT2JqLnNlY3Rpb25OYW1lO1xyXG4gICAgICAgICB0aGF0LmZsaWdodENvdXBvbkxlZ2VuZHMgPSBkYXRhLnJlc3BvbnNlLmRhdGEubGVnZW5kcy52YWx1ZXM7XHJcbiAgICAgICAgXHRpZiAodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xyXG5cdFx0XHQgIHRoYXQuY291cG9uQ291bnRFeGNlcHRpb24gPSB0aGF0LmdldEZhdm9yaXRlSXRlbXMoanNvbk9iaik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdCAgdGhhdC5jb3Vwb25Db3VudEV4Y2VwdGlvbiA9IHtcclxuXHRcdFx0XHRwaWVDaGFydDoganNvbk9iai5waWVDaGFydHNbMF0sXHJcblx0XHRcdFx0d2Vla0RhdGE6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxyXG4gICAgICAgIHN0YWNrZWRDaGFydDoganNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdLnN0YWNrZWRCYXJjaGFydEl0ZW1zXHJcblx0XHRcdCAgfVxyXG5cdFx0XHR9XHJcblx0XHRcdHRoYXQuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdCAgdGhhdC4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhQ0MnKS51cGRhdGUoKTtcclxuXHRcdFx0fSwgMCk7XHJcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1x0XHRcclxuXHRcdH1lbHNle1xyXG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XHJcbiAgICAgICAgdGl0bGU6ICdFcnJvcicsXHJcbiAgICAgICAgY29udGVudDogJ0RhdGEgbm90IGZvdW5kIGZvciBDb3Vwb24gQ291bnQgYnkgRXhjZXB0aW9uIENhdGVnb3J5ISEhJ1xyXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ2RvbmUnKTtcclxuICAgICAgfSk7XHJcblxyXG5cdFx0fVxyXG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICB9KTtcclxuICB9XHJcbiAgb3BlblBvcG92ZXIoJGV2ZW50LCBjaGFydHR5cGUsIGluZGV4LG9wcmZXZWVrRGF0YSkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdmFyIHRlbXAgPSB0aGlzLiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKG9wcmZXZWVrRGF0YSk7XHJcbiAgICB0aGF0LmN1cnJlbnRJbmRleCA9IHRlbXAuY3VycmVudEluZGV4KCk7XHJcbiAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIHRoaXMuY2hhcnR0eXBlID0gY2hhcnR0eXBlO1xyXG4gICAgdGhpcy5ncmFwaFR5cGUgPSBpbmRleDtcclxuICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vZ3JhcGgtcG9wb3Zlci5odG1sJywge1xyXG4gICAgICBzY29wZTogdGhhdC4kc2NvcGVcclxuICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xyXG4gICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XHJcbiAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcclxuICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG4gIG9wZW5QaWVQb3BvdmVyKCRldmVudCwgY2hhcnR0eXBlLCBpbmRleCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB0aGlzLmNoYXJ0dHlwZSA9IGNoYXJ0dHlwZTtcclxuICAgIHRoaXMuZ3JhcGhUeXBlID0gaW5kZXg7XHJcbiAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL3BpZS1wb3BvdmVyLmh0bWwnLCB7XHJcbiAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgfSkudGhlbihmdW5jdGlvbihwb3BvdmVyKSB7XHJcbiAgICAgIHRoYXQucG9wb3ZlcnNob3duID0gdHJ1ZTtcclxuICAgICAgdGhhdC5ncmFwaHBvcG92ZXIgPSBwb3BvdmVyO1xyXG4gICAgICB0aGF0LmdyYXBocG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGNsb3NlUG9wb3ZlcigpIHtcclxuICAgIHRoaXMuZ3JhcGhwb3BvdmVyLmhpZGUoKTtcclxuICB9O1xyXG4gIGlvbmljTG9hZGluZ1Nob3coKSB7XHJcbiAgICB0aGlzLiRpb25pY0xvYWRpbmcuc2hvdyh7XHJcbiAgICAgIHRlbXBsYXRlOiAnPGlvbi1zcGlubmVyIGNsYXNzPVwic3Bpbm5lci1jYWxtXCI+PC9pb24tc3Bpbm5lcj4nXHJcbiAgICB9KTtcclxuICB9O1xyXG4gIGFwcGx5Q2hhcnRDb2xvckNvZGVzKGpzb25PYmo6IGFueSkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgXy5mb3JFYWNoKGpzb25PYmoucGllQ2hhcnRzWzBdLmRhdGEsIGZ1bmN0aW9uKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG4gICAgICBuLmxhYmVsID0gbi54dmFsO1xyXG4gICAgICBuLnZhbHVlID0gbi55dmFsO1xyXG4gICAgICBuLmNvbG9yID0gdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxW3ZhbHVlXVxyXG4gICAgICBjb25zb2xlLmxvZyh2YWx1ZSk7XHJcbiAgICB9KTtcclxuICAgLy8gXy5tZXJnZShqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCB0aGlzLkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzEpOyBcclxuICAgIHJldHVybiBqc29uT2JqO1xyXG4gIH1cclxuICBnZXRGYXZvcml0ZUl0ZW1zKGpzb25PYmo6IGFueSkge1xyXG4gICAgdmFyIHBpZUNoYXJ0cyA9IF8uZmlsdGVyKGpzb25PYmoucGllQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcclxuICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgIH0pO1xyXG4gICAgdmFyIG11bHRpQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5tdWx0aWJhckNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XHJcbiAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcbiAgICB9KTtcclxuICAgIHZhciBzdGFja0NoYXJ0cyA9IF8uZmlsdGVyKGpzb25PYmouc3RhY2tlZEJhckNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XHJcbiAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcbiAgICB9KTtcclxuICAgIC8vIGNvbnNvbGUubG9nKGpzb25PYmopO1xyXG4gICAgLy8gY29uc29sZS5sb2cobXVsdGlDaGFydHNbMF0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcGllQ2hhcnQ6IHBpZUNoYXJ0c1swXSxcclxuICAgICAgd2Vla0RhdGE6IChtdWx0aUNoYXJ0cy5sZW5ndGgpID8gbXVsdGlDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zIDogW10sXHJcbiAgICAgIHN0YWNrZWRDaGFydDogKHN0YWNrQ2hhcnRzLmxlbmd0aCkgPyBzdGFja0NoYXJ0c1swXS5zdGFja2VkQmFyY2hhcnRJdGVtcyA6IFtdXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjb2xvckZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQsIGkpIHtcclxuICAgICAgcmV0dXJuIHRoYXQudGhyZWVCYXJDaGFydENvbG9yc1tpXTtcclxuICAgIH07XHJcbiAgfVxyXG4gIGZvdXJCYXJDb2xvckZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQsIGkpIHtcclxuICAgICAgcmV0dXJuIHRoYXQuZm91ckJhckNoYXJ0Q29sb3JzW2ldO1xyXG4gICAgfTtcclxuICB9XHJcbiAgdmFsdWVGb3JtYXRGdW5jdGlvbigpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHJldHVybiBmdW5jdGlvbihkKSB7XHJcbiAgICAgIHJldHVybiBkMy5mb3JtYXQoXCIsXCIpKGQpO1xyXG4gICAgfVxyXG4gIH1cclxuICB0b29sVGlwQ29udGVudEZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24oa2V5LCB4LCB5LCBlLCBncmFwaCkge1xyXG4gICAgICByZXR1cm4ga2V5ICsnICcrIE1hdGguY2VpbCh5KSArICcgYXQgJyArIHhcclxuICAgIH1cclxuICB9XHJcbiAgeUF4aXNUaWNrRm9ybWF0RnVuY3Rpb24oKXtcclxuICAgIHJldHVybiBmdW5jdGlvbihkKXtcclxuICAgICAgcmV0dXJuIGQzLmZvcm1hdChcIixcIikoZCk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIG9wZW5pbmZvUG9wb3ZlcigkZXZlbnQsIGluZGV4KSB7XHJcbiAgICBpZiAodHlwZW9mIGluZGV4ID09IFwidW5kZWZpbmVkXCIgfHwgaW5kZXggPT0gXCJcIikge1xyXG4gICAgICB0aGlzLmluZm9kYXRhID0gJ05vIGluZm8gYXZhaWxhYmxlJztcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB0aGlzLmluZm9kYXRhID0gaW5kZXg7XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZyhpbmRleCk7XHJcbiAgICB0aGlzLmluZm9wb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICB9O1xyXG4gIGNsb3NlSW5mb1BvcG92ZXIoKSB7XHJcbiAgICB0aGlzLmluZm9wb3BvdmVyLmhpZGUoKTtcclxuICB9XHJcbiAgdG9nZ2xlQ291bnQodmFsKSB7XHJcbiAgICB0aGlzLnRvZ2dsZS5vcGVuT3JDbG9zZWQgPSB2YWw7XHJcbiAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xyXG4gIH1cclxuICBpb25pY0xvYWRpbmdIaWRlKCkge1xyXG4gICAgdGhpcy4kaW9uaWNMb2FkaW5nLmhpZGUoKTtcclxuICB9O1xyXG4gIHRhYkxvY2tTbGlkZSh0YWJuYW1lOiBzdHJpbmcpIHtcclxuICAgIHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUodGFibmFtZSkuZW5hYmxlU2xpZGUoZmFsc2UpO1xyXG4gIH1cclxuICB3ZWVrRGF0YVByZXYob3ByZldlZWtEYXRhOiBhbnkpIHtcclxuICAgIHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUob3ByZldlZWtEYXRhKS5wcmV2aW91cygpO1xyXG4gIH07XHJcbiAgd2Vla0RhdGFOZXh0KG9wcmZXZWVrRGF0YTogYW55KSB7XHJcbiAgICB0aGlzLiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKG9wcmZXZWVrRGF0YSkubmV4dCgpO1xyXG4gIH1cclxuICB0b2dnbGVGbGlnaHRTdGF0dXNWaWV3KHZhbDogc3RyaW5nKSB7XHJcbiAgICB0aGlzLnRvZ2dsZS5mbGlnaHRTdGF0dXMgPSB2YWw7XHJcbiAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xyXG4gIH1cclxuICB0b2dnbGVGbGlnaHRSZWFzb25WaWV3KHZhbDogc3RyaW5nKSB7XHJcbiAgICB0aGlzLnRvZ2dsZS5mbGlnaHRSZWFzb24gPSB2YWw7XHJcbiAgICBpZiAodGhpcy50b2dnbGUuZmxpZ2h0UmVhc29uID09IFwiY2hhcnRcIilcclxuICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XHJcbiAgfVxyXG4gIHRvZ2dsZUNDRXhjZXB0aW9uVmlldyh2YWw6IHN0cmluZykge1xyXG4gICAgdGhpcy50b2dnbGUuY2NFeGNlcHRpb24gPSB2YWw7XHJcbiAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xyXG4gIH0gICBcclxuICBydW5SZXBvcnQoY2hhcnRUaXRsZTogc3RyaW5nLCBtb250aE9yWWVhcjogc3RyaW5nLCBmbG93bk1vbnRoOiBzdHJpbmcpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIC8vaWYgbm8gY29yZG92YSwgdGhlbiBydW5uaW5nIGluIGJyb3dzZXIgYW5kIG5lZWQgdG8gdXNlIGRhdGFVUkwgYW5kIGlmcmFtZVxyXG4gICAgaWYgKCF3aW5kb3cuY29yZG92YSkge1xyXG4gICAgICB0aGF0LmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgICAgdGhpcy5yZXBvcnRTdmMucnVuUmVwb3J0RGF0YVVSTChjaGFydFRpdGxlLCBtb250aE9yWWVhciwgZmxvd25Nb250aClcclxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhVVJMKSB7XHJcbiAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgIC8vc2V0IHRoZSBpZnJhbWUgc291cmNlIHRvIHRoZSBkYXRhVVJMIGNyZWF0ZWRcclxuICAgICAgICAgIC8vY29uc29sZS5sb2coZGF0YVVSTCk7XHJcbiAgICAgICAgICAvL2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwZGZJbWFnZScpLnNyYyA9IGRhdGFVUkw7XHJcblx0XHQgIHdpbmRvdy5vcGVuKGRhdGFVUkwsXCJfc3lzdGVtXCIpO1xyXG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcclxuICAgICAgICB9KTtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICAvL2lmIGNvZHJvdmEsIHRoZW4gcnVubmluZyBpbiBkZXZpY2UvZW11bGF0b3IgYW5kIGFibGUgdG8gc2F2ZSBmaWxlIGFuZCBvcGVuIHcvIEluQXBwQnJvd3NlclxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHRoYXQuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG4gICAgICB0aGlzLnJlcG9ydFN2Yy5ydW5SZXBvcnRBc3luYyhjaGFydFRpdGxlLCBtb250aE9yWWVhciwgZmxvd25Nb250aClcclxuICAgICAgICAudGhlbihmdW5jdGlvbihmaWxlUGF0aCkge1xyXG4gICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgICAgICAvL2xvZyB0aGUgZmlsZSBsb2NhdGlvbiBmb3IgZGVidWdnaW5nIGFuZCBvb3BlbiB3aXRoIGluYXBwYnJvd3NlclxyXG4gICAgICAgICAgY29uc29sZS5sb2coJ3JlcG9ydCBydW4gb24gZGV2aWNlIHVzaW5nIEZpbGUgcGx1Z2luJyk7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygnUmVwb3J0Q3RybDogT3BlbmluZyBQREYgRmlsZSAoJyArIGZpbGVQYXRoICsgJyknKTtcclxuICAgICAgICAgIHZhciBsYXN0UGFydCA9IGZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKTtcclxuICAgICAgICAgIHZhciBmaWxlTmFtZSA9IFwiL21udC9zZGNhcmQvXCIgKyBsYXN0UGFydDtcclxuICAgICAgICAgIGlmIChkZXZpY2UucGxhdGZvcm0gIT0gXCJBbmRyb2lkXCIpXHJcbiAgICAgICAgICAgIGZpbGVOYW1lID0gZmlsZVBhdGg7XHJcbiAgICAgICAgICAvL3dpbmRvdy5vcGVuUERGKGZpbGVOYW1lKTtcclxuICAgICAgICAgIC8vZWxzZVxyXG4gICAgICAgICAgLy93aW5kb3cub3BlbihmaWxlUGF0aCwgJ19ibGFuaycsICdsb2NhdGlvbj1ubyxjbG9zZWJ1dHRvbmNhcHRpb249Q2xvc2UsZW5hYmxlVmlld3BvcnRTY2FsZT15ZXMnKTsqL1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgY29yZG92YS5wbHVnaW5zLmZpbGVPcGVuZXIyLm9wZW4oXHJcbiAgICAgICAgICAgIGZpbGVOYW1lLFxyXG4gICAgICAgICAgICAnYXBwbGljYXRpb24vcGRmJyxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3Igc3RhdHVzOiAnICsgZS5zdGF0dXMgKyAnIC0gRXJyb3IgbWVzc2FnZTogJyArIGUubWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmaWxlIG9wZW5lZCBzdWNjZXNzZnVsbHknKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIG9wZW5GbGlnaHRQcm9jZXNzRHJpbGxQb3BvdmVyKCRldmVudCwgZGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICB0aGlzLmRyaWxsTmFtZSA9ICdGTElHSFQgUFJPQ0VTU0lORyBTVEFUVVMgLSAnICsgZGF0YS5wb2ludFswXSArICctJyArIHRoaXMuaGVhZGVyLmZsb3duTW9udGg7XHJcbiAgICB0aGlzLmRyaWxsVHlwZSA9ICdmbGlnaHQtcHJvY2Vzcyc7XHJcbiAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgdGhpcy5kcmlsbHRhYnMgPSBbJ0NvdW50cnkgTGV2ZWwnLCAnU2VjdG9yIExldmVsJywgJ0ZsaWdodCBMZXZlbCcsICdEb2N1bWVudCBMZXZlbCddO1xyXG4gICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2NvdW50cnlGcm9tJywgJ2Zsb3duU2VjdG9yJywgJ2ZsaWdodE51bWJlcicsICdjYXJyaWVyQ29kZSMnXTtcclxuICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGF0LmRyaWxscG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICAgIHRoYXQuc2hvd25Hcm91cCA9IDA7XHJcbiAgICB9LCA1MCk7XHJcbiAgICB0aGlzLm9wZW5EcmlsbERvd24oZGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcclxuICB9O1xyXG5cclxuICBvcGVuQ291bnBvbkNvdW50RHJpbGxQb3BvdmVyKCRldmVudCwgZGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICB0aGlzLmRyaWxsTmFtZSA9ICdDT1VQT04gQ09VTlQgQlkgRVhDRVBUSU9OIENBVEVHT1JZICc7XHJcbiAgICB0aGlzLmRyaWxsVHlwZSA9ICdjb3Vwb24tY291bnQnO1xyXG4gICAgdGhpcy5ncm91cHMgPSBbXTtcclxuICAgIHRoaXMuZHJpbGx0YWJzID0gWydDb3Vwb24gQ291bnQgRmxpZ2h0IFN0YXR1cycsICdEb2N1bWVudCBMZXZlbCddO1xyXG4gICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2ZsaWdodE51bWJlcicsICdmbG93blNlY3RvciddO1xyXG4gICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgIHRoYXQuZHJpbGxwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgICAgdGhhdC5zaG93bkdyb3VwID0gMDtcclxuICAgIH0sIDUwKTtcclxuICAgIHRoaXMub3BlbkRyaWxsRG93bihkYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xyXG4gIH07XHJcblxyXG4gIG9wZW5GbGlnaHRDb3VudERyaWxsUG9wb3ZlcigkZXZlbnQsIGRhdGEsIHNlbEZpbmRMZXZlbCkge1xyXG4gICAgdGhpcy5kcmlsbE5hbWUgPSAnTElTVCBPRiBPUEVOIEZMSUdIVFMgRk9SICcgKyBkYXRhLnBvaW50WzBdICsgJy0nICsgdGhpcy5oZWFkZXIuZmxvd25Nb250aCArICcgQlkgUkVBU09OICc7XHJcbiAgICB0aGlzLmRyaWxsVHlwZSA9ICdmbGlnaHQtY291bnQnO1xyXG4gICAgdGhpcy5ncm91cHMgPSBbXTtcclxuICAgIHRoaXMuZHJpbGx0YWJzID0gWydPcGVuIEZsaWdodCBTdGF0dXMnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcclxuICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydmbGlnaHROdW1iZXInLCAnY2FycmllckNvZGUnXTtcclxuICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGF0LmRyaWxscG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICAgIHRoYXQuc2hvd25Hcm91cCA9IDA7XHJcbiAgICB9LCA1MCk7XHJcbiAgICB0aGlzLm9wZW5EcmlsbERvd24oZGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcclxuICB9O1xyXG5cclxuICBkcmlsbERvd25SZXF1ZXN0KGRyaWxsVHlwZSwgc2VsRmluZExldmVsLCBkYXRhKSB7XHJcbiAgICB2YXIgcmVxZGF0YTtcclxuICAgIGlmIChkcmlsbFR5cGUgPT0gJ2ZsaWdodC1wcm9jZXNzJykge1xyXG4gICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgaWYgKGRhdGEubGFiZWwpIHtcclxuICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhWzBdO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgZmxpZ2h0RGF0ZTtcclxuICAgICAgLy9mbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBTdHJpbmcoZGF0YS5mbGlnaHREYXRlKSA6IFN0cmluZyhkYXRhWzBdKTtcclxuICAgICAgZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gZGF0YS5mbGlnaHREYXRlIDogZGF0YVswXTtcclxuICAgICAgdmFyIGNvdW50cnlGcm9tVG8gPSAoZGF0YS5jb3VudHJ5RnJvbSAmJiBkYXRhLmNvdW50cnlUbykgPyBkYXRhLmNvdW50cnlGcm9tICsgJy0nICsgZGF0YS5jb3VudHJ5VG8gOiBcIlwiO1xyXG4gICAgICB2YXIgc2VjdG9yRnJvbVRvID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XHJcbiAgICAgIHZhciBmbGlnaHROdW1iZXIgPSAoZGF0YS5mbGlnaHROdW1iZXIpID8gZGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xyXG5cclxuXHJcblxyXG4gICAgICByZXFkYXRhID0ge1xyXG4gICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgIFwidXNlcklkXCI6IHRoaXMuZ2V0UHJvZmlsZVVzZXJOYW1lKCksXHJcbiAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJcIixcclxuICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcclxuICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICBcImZsaWdodERhdGVcIjogZmxpZ2h0RGF0ZSxcclxuICAgICAgICBcImNvdW50cnlGcm9tVG9cIjogY291bnRyeUZyb21UbyxcclxuICAgICAgICBcInNlY3RvckZyb21Ub1wiOiBzZWN0b3JGcm9tVG8sXHJcbiAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGlmIChkcmlsbFR5cGUgPT0gJ2NvdXBvbi1jb3VudCcpIHtcclxuICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgIGlmIChkYXRhLmxhYmVsKSB7XHJcbiAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YVswXTtcclxuICAgICAgfVxyXG4gICAgICBjb25zb2xlLmxvZyh0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5KTtcclxuICAgICAgdmFyIGZsaWdodERhdGU7XHJcbiAgICAgIC8vZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gU3RyaW5nKGRhdGEuZmxpZ2h0RGF0ZSkgOiBTdHJpbmcoZGF0YVswXSk7XHJcbiAgICAgIGZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IGRhdGEuZmxpZ2h0RGF0ZSA6IGRhdGFbMF07XHJcbiAgICAgIHZhciBleGNlcHRpb25DYXRlZ29yeSA9ICh0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5ICYmIGRyaWxsTGV2ZWwgPiAxKSA/IHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkgOiBcIlwiO1xyXG4gICAgICB2YXIgZmxpZ2h0U2VjdG9yID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XHJcbiAgICAgIHZhciBmbGlnaHROdW1iZXIgPSAoZGF0YS5mbGlnaHROdW1iZXIpID8gZGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xyXG5cclxuXHJcblxyXG4gICAgICByZXFkYXRhID0ge1xyXG4gICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgIFwidXNlcklkXCI6IHRoaXMuZ2V0UHJvZmlsZVVzZXJOYW1lKCksXHJcbiAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJcIixcclxuICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcclxuICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICBcImV4Y2VwdGlvbkNhdGVnb3J5XCI6IGV4Y2VwdGlvbkNhdGVnb3J5LFxyXG4gICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcclxuICAgICAgICBcImZsaWdodERhdGVcIjogZmxpZ2h0RGF0ZSxcclxuICAgICAgICBcImZsaWdodFNlY3RvclwiOiBmbGlnaHRTZWN0b3IsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGRyaWxsVHlwZSA9PSAnZmxpZ2h0LWNvdW50Jykge1xyXG4gICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgaWYgKGRhdGEubGFiZWwpIHtcclxuICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhWzBdO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciBmbGlnaHREYXRlO1xyXG4gICAgICAvL2ZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IFN0cmluZyhkYXRhLmZsaWdodERhdGUpIDogU3RyaW5nKGRhdGFbMF0pO1xyXG4gICAgICBmbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBkYXRhLmZsaWdodERhdGUgOiBkYXRhWzBdO1xyXG4gICAgICB2YXIgdG9nZ2xlMSA9IHRoaXMudG9nZ2xlLm9wZW5PckNsb3NlZC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICB2YXIgZmxpZ2h0U2VjdG9yID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XHJcbiAgICAgIHZhciBmbGlnaHROdW1iZXIgPSAoZGF0YS5mbGlnaHROdW1iZXIpID8gZGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xyXG4gICAgICB2YXIgZmxpZ2h0U3RhdHVzID0gKHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkgJiYgZHJpbGxMZXZlbCA+IDEpID8gdGhpcy5leGNlcHRpb25DYXRlZ29yeSA6IFwiXCI7XHJcblxyXG5cclxuICAgICAgcmVxZGF0YSA9IHtcclxuICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmdldFByb2ZpbGVVc2VyTmFtZSgpLFxyXG4gICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwiXCIsXHJcbiAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXHJcbiAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXHJcbiAgICAgICAgXCJ0b2dnbGUxXCI6IHRvZ2dsZTEsXHJcbiAgICAgICAgXCJmbGlnaHRTdGF0dXNcIjogZmxpZ2h0U3RhdHVzLFxyXG4gICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcclxuICAgICAgICBcImZsaWdodERhdGVcIjogZmxpZ2h0RGF0ZSxcclxuICAgICAgICBcImZsaWdodFNlY3RvclwiOiBmbGlnaHRTZWN0b3IsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlcWRhdGE7XHJcbiAgfVxyXG5cclxuICBnZXREcmlsbERvd25VUkwoZHJpbERvd25UeXBlKSB7XHJcbiAgICB2YXIgdXJsXHJcbiAgICBzd2l0Y2ggKGRyaWxEb3duVHlwZSkge1xyXG4gICAgICBjYXNlICdmbGlnaHQtcHJvY2Vzcyc6XHJcbiAgICAgICAgdXJsID0gXCIvcGF4Zmxub3ByL2ZsaWdodHByb2Nlc3NpbmdzdGF0dXNkcmlsbFwiO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdjb3Vwb24tY291bnQnOlxyXG4gICAgICAgIHVybCA9IFwiL3BheGZsbm9wci9jb3Vwb25jb3VudGJ5ZXhwZHJpbGxcIjtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAnZmxpZ2h0LWNvdW50JzpcclxuICAgICAgICB1cmwgPSBcIi9wYXhmbG5vcHIvZmxpZ2h0Y291bnRieXJlYXNvbmRyaWxsXCI7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdXJsO1xyXG4gIH1cclxuICB0YWJTbGlkZUhhc0NoYW5nZWQoaW5kZXgpIHtcclxuICAgIHZhciBkYXRhID0gdGhpcy5ncm91cHNbMF0uY29tcGxldGVEYXRhWzBdO1xyXG4gICAgdGhpcy5ncm91cHNbMF0uaXRlbXNbMF0gPSBkYXRhW2luZGV4XS52YWx1ZXM7XHJcbiAgICB0aGlzLmdyb3Vwc1swXS5vcmdJdGVtc1swXSA9IGRhdGFbaW5kZXhdLnZhbHVlcztcclxuICAgIHRoaXMuc29ydCgnJywgMCwgZmFsc2UpO1xyXG4gICAgdGhpcy5leGNlcHRpb25DYXRlZ29yeSA9IGRhdGFbaW5kZXhdLmtleTtcclxuICB9XHJcblxyXG4gIG9wZW5EcmlsbERvd24oZGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICBzZWxGaW5kTGV2ZWwgPSBOdW1iZXIoc2VsRmluZExldmVsKTtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWxdID0gZGF0YTtcclxuICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWwgKyAxXSA9ICcnO1xyXG5cclxuICAgIGlmIChzZWxGaW5kTGV2ZWwgIT0gKHRoaXMuZ3JvdXBzLmxlbmd0aCAtIDEpKSB7XHJcbiAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xyXG4gICAgICB2YXIgcmVxZGF0YSA9IHRoaXMuZHJpbGxEb3duUmVxdWVzdCh0aGlzLmRyaWxsVHlwZSwgc2VsRmluZExldmVsLCBkYXRhKTtcclxuICAgICAgdmFyIFVSTCA9IHRoaXMuZ2V0RHJpbGxEb3duVVJMKHRoaXMuZHJpbGxUeXBlKTtcclxuICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldERyaWxsRG93bihyZXFkYXRhLCBVUkwpXHJcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgICAgICB2YXIgZGF0YSA9IGRhdGEucmVzcG9uc2U7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgIHZhciBmaW5kTGV2ZWwgPSBkcmlsbExldmVsIC0gMTtcclxuICAgICAgICAgIGlmIChkYXRhLnN0YXR1cyA9PSAnc3VjY2VzcycpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3BSZXN1bHQ7XHJcbiAgICAgICAgICAgIGlmIChkYXRhLmRhdGEucm93cykge1xyXG4gICAgICAgICAgICAgIHJlc3BSZXN1bHQgPSBkYXRhLmRhdGEucm93cztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICByZXNwUmVzdWx0ID0gZGF0YS5kYXRhO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoKHRoYXQuZHJpbGxUeXBlID09ICdjb3Vwb24tY291bnQnIHx8IHRoYXQuZHJpbGxUeXBlID09ICdmbGlnaHQtY291bnQnKSAmJiBkYXRhLmRhdGEucm93cykge1xyXG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSByZXNwUmVzdWx0WzBdLnZhbHVlcztcclxuICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gcmVzcFJlc3VsdFswXS52YWx1ZXM7XHJcbiAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5jb21wbGV0ZURhdGFbMF0gPSByZXNwUmVzdWx0O1xyXG4gICAgICAgICAgICAgIHRoYXQuZXhjZXB0aW9uQ2F0ZWdvcnkgPSByZXNwUmVzdWx0WzBdLmtleTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLml0ZW1zWzBdID0gcmVzcFJlc3VsdDtcclxuICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gcmVzcFJlc3VsdDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xyXG4gICAgICAgICAgICB0aGF0LnNvcnQoJycsIGZpbmRMZXZlbCwgZmFsc2UpO1xyXG4gICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZHJpbGxMZXZlbCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XHJcbiAgICAgICAgICAgIHRoYXQuY2xlYXJEcmlsbChmaW5kTGV2ZWwpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgIHRoYXQuY2xvc2VzUG9wb3ZlcigpO1xyXG4gICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgICAgYWxlcnQoJ1NlcnZlciBFcnJvcicpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgY2xvc2VEcmlsbFBvcG92ZXIoKSB7XHJcbiAgICB0aGlzLmRyaWxscG9wb3Zlci5oaWRlKCk7XHJcbiAgfVxyXG5cclxuICBjbGVhckRyaWxsKGxldmVsOiBudW1iZXIpIHtcclxuICAgIHZhciBpOiBudW1iZXI7XHJcbiAgICBmb3IgKHZhciBpID0gbGV2ZWw7IGkgPCB0aGlzLmRyaWxsdGFicy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB0aGlzLmdyb3Vwc1tpXS5pdGVtcy5zcGxpY2UoMCwgMSk7XHJcbiAgICAgIHRoaXMuZ3JvdXBzW2ldLm9yZ0l0ZW1zLnNwbGljZSgwLCAxKTtcclxuICAgICAgdGhpcy5zb3J0KCcnLCBpLCBmYWxzZSk7XHJcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuc2VsZWN0ZWREcmlsbCk7XHJcbiAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtpXSA9ICcnO1xyXG4gICAgICBjb25zb2xlLmxvZyh0aGlzLnNlbGVjdGVkRHJpbGwpO1xyXG4gICAgfVxyXG4gIH1cclxuICBpbml0aWF0ZUFycmF5KGRyaWxsdGFicykge1xyXG4gICAgZm9yICh2YXIgaSBpbiBkcmlsbHRhYnMpIHtcclxuICAgICAgdGhpcy5ncm91cHNbaV0gPSB7XHJcbiAgICAgICAgaWQ6IGksXHJcbiAgICAgICAgbmFtZTogdGhpcy5kcmlsbHRhYnNbaV0sXHJcbiAgICAgICAgaXRlbXM6IFtdLFxyXG4gICAgICAgIG9yZ0l0ZW1zOiBbXSxcclxuICAgICAgICBJdGVtc0J5UGFnZTogW10sXHJcbiAgICAgICAgY29tcGxldGVEYXRhOiBbXSxcclxuICAgICAgICBmaXJzdENvbHVtbnM6IHRoaXMuZmlyc3RDb2x1bW5zW2ldXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpc0RyaWxsUm93U2VsZWN0ZWQobGV2ZWwsIG9iaikge1xyXG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0ZWREcmlsbFtsZXZlbF0gPT0gb2JqO1xyXG4gIH1cclxuICBzZWFyY2hSZXN1bHRzKGxldmVsLCBvYmopIHtcclxuICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuZmlsdGVyZWRMaXN0U2VydmljZS5zZWFyY2hlZCh0aGlzLmdyb3Vwc1tsZXZlbF0ub3JnSXRlbXNbMF0sIG9iai5zZWFyY2hUZXh0LCBsZXZlbCwgdGhpcy5kcmlsbFR5cGUpO1xyXG4gICAgaWYgKG9iai5zZWFyY2hUZXh0ID09ICcnKSB7XHJcbiAgICAgIHRoaXMucmVzZXRBbGwobGV2ZWwpO1xyXG4gICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0ub3JnSXRlbXNbMF07XHJcbiAgICB9XHJcbiAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IDA7XHJcbiAgICB0aGlzLnBhZ2luYXRpb24obGV2ZWwpO1xyXG4gIH1cclxuICBwYWdpbmF0aW9uKGxldmVsKSB7XHJcbiAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UgPSB0aGlzLmZpbHRlcmVkTGlzdFNlcnZpY2UucGFnZWQodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLnBhZ2VTaXplKTtcclxuICB9O1xyXG4gIHNldFBhZ2UobGV2ZWwsIHBhZ2Vubykge1xyXG4gICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSBwYWdlbm87XHJcbiAgfTtcclxuICBsYXN0UGFnZShsZXZlbCkge1xyXG4gICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UubGVuZ3RoIC0gMTtcclxuICB9O1xyXG4gIHJlc2V0QWxsKGxldmVsKSB7XHJcbiAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IDA7XHJcbiAgfVxyXG4gIHNvcnQoc29ydEJ5LCBsZXZlbCwgb3JkZXIpIHtcclxuICAgIHRoaXMucmVzZXRBbGwobGV2ZWwpO1xyXG4gICAgdGhpcy5jb2x1bW5Ub09yZGVyID0gc29ydEJ5OyBcclxuICAgIC8vJEZpbHRlciAtIFN0YW5kYXJkIFNlcnZpY2VcclxuICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuJGZpbHRlcignb3JkZXJCeScpKHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSwgdGhpcy5jb2x1bW5Ub09yZGVyLCBvcmRlcik7XHJcbiAgICB0aGlzLnBhZ2luYXRpb24obGV2ZWwpO1xyXG4gIH07XHJcbiAgcmFuZ2UodG90YWwsIGxldmVsKSB7XHJcbiAgICB2YXIgcmV0ID0gW107XHJcbiAgICB2YXIgc3RhcnQ6IG51bWJlcjtcclxuICAgIHN0YXJ0ID0gMDtcclxuICAgIGlmKHRvdGFsID4gNSkge1xyXG4gICAgICBzdGFydCA9IE51bWJlcih0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSkgLSAyO1xyXG4gICAgfVxyXG4gICAgaWYgKHN0YXJ0IDwgMCkge1xyXG4gICAgICBzdGFydCA9IDA7XHJcbiAgICB9XHJcbiAgICB2YXIgayA9IDE7XHJcbiAgICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCB0b3RhbDsgaSsrKSB7XHJcbiAgICAgIHJldC5wdXNoKGkpO1xyXG4gICAgICBrKys7XHJcbiAgICAgIGlmIChrID4gNikge1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0O1xyXG4gIH1cclxuICB0b2dnbGVHcm91cChncm91cCkge1xyXG4gICAgaWYgKHRoaXMuaXNHcm91cFNob3duKGdyb3VwKSkge1xyXG4gICAgICB0aGlzLnNob3duR3JvdXAgPSBudWxsO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5zaG93bkdyb3VwID0gZ3JvdXA7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGlzR3JvdXBTaG93bihncm91cDogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gdGhpcy5zaG93bkdyb3VwID09IGdyb3VwO1xyXG4gIH1cclxuXHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbmNsYXNzIExvZ2luQ29udHJvbGxlciB7XHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckc2NvcGUnLCAnJHN0YXRlJywgJ1VzZXJTZXJ2aWNlJywgJyRpb25pY0hpc3RvcnknXTtcclxuXHRwcml2YXRlIGludmFsaWRNZXNzYWdlOiBib29sZWFuID0gZmFsc2U7XHJcblx0cHJpdmF0ZSB1c2VybmFtZTogc3RyaW5nO1xyXG5cdHByaXZhdGUgcGFzc3dvcmQ6IHN0cmluZztcclxuXHRwcml2YXRlIGlwYWRkcmVzczogc3RyaW5nO1xyXG5cdHByaXZhdGUgZXJvb3JtZXNzYWdlOiBzdHJpbmc7XHJcblxyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgJHNjb3BlOiBuZy5JU2NvcGUsIHByaXZhdGUgJHN0YXRlOiBhbmd1bGFyLnVpLklTdGF0ZVNlcnZpY2UsXHJcblx0cHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UsIHByaXZhdGUgJGlvbmljSGlzdG9yeTogYW55KSB7XHJcblx0XHRpZiAodGhpcy51c2VyU2VydmljZS5pc0xvZ2dlZEluKCkpIHtcclxuXHRcdFx0JGlvbmljSGlzdG9yeS5uZXh0Vmlld09wdGlvbnMoe1xyXG5cdFx0XHRcdGRpc2FibGVCYWNrOiB0cnVlXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjb25zb2xlLmxvZygnbmF2Z2F0aW5nIHRvIG1pcy1mbG93bi4uJyk7XHJcblx0XHRcdHRoaXMuJHN0YXRlLmdvKHRoaXMudXNlclNlcnZpY2UuZGVmYXVsdFBhZ2UpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Y2xlYXJFcnJvcigpIHtcclxuXHRcdHRoaXMuaW52YWxpZE1lc3NhZ2UgPSBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGRvTG9naW4obG9naW5Gb3JtOiBib29sZWFuKSB7XHJcblx0XHRpZiAoIWxvZ2luRm9ybSkge1xyXG5cdFx0XHRpZiAoIWFuZ3VsYXIuaXNEZWZpbmVkKHRoaXMudXNlcm5hbWUpIHx8ICFhbmd1bGFyLmlzRGVmaW5lZCh0aGlzLnBhc3N3b3JkKSB8fCAhYW5ndWxhci5pc0RlZmluZWQodGhpcy5pcGFkZHJlc3MpIHx8dGhpcy51c2VybmFtZS50cmltKCkgPT0gXCJcIiB8fCB0aGlzLnBhc3N3b3JkLnRyaW0oKSA9PSBcIlwiIHx8IHRoaXMuaXBhZGRyZXNzLnRyaW0oKSA9PSBcIlwiKSB7XHJcblx0XHRcdFx0dGhpcy5pbnZhbGlkTWVzc2FnZSA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0U0VSVkVSX1VSTCA9ICdodHRwOi8vJyArIHRoaXMuaXBhZGRyZXNzICsgJy8nICsgJ3JhcGlkLXdzL3NlcnZpY2VzL3Jlc3QnO1xyXG5cdFx0XHR0aGlzLnVzZXJTZXJ2aWNlLmxvZ2luKHRoaXMudXNlcm5hbWUsdGhpcy5wYXNzd29yZCkudGhlbihcclxuXHRcdFx0XHQocmVzdWx0KSA9PiB7XHJcblx0XHRcdFx0XHRpZiAocmVzdWx0LnJlc3BvbnNlLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1x0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR2YXIgcmVxID0ge1xyXG5cdFx0XHRcdFx0XHRcdHVzZXJJZDogdGhpcy51c2VybmFtZVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHRoaXMudXNlclNlcnZpY2UuZ2V0VXNlclByb2ZpbGUocmVxKS50aGVuKFxyXG5cdFx0XHRcdFx0XHRcdChwcm9maWxlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHR2YXIgdXNlck5hbWUgPSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHVzZXJuYW1lOiBwcm9maWxlLnJlc3BvbnNlLmRhdGEudXNlckluZm8udXNlck5hbWVcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudXNlclNlcnZpY2Uuc2V0VXNlcih1c2VyTmFtZSk7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLiRpb25pY0hpc3RvcnkubmV4dFZpZXdPcHRpb25zKHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZGlzYWJsZUJhY2s6IHRydWVcclxuXHRcdFx0XHRcdFx0XHRcdH0pOyBcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuJHN0YXRlLmdvKHRoaXMudXNlclNlcnZpY2UuZGVmYXVsdFBhZ2UpO1xyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCBvbiBsb2FkaW5nIHVzZXIgcHJvZmlsZScpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuaW52YWxpZE1lc3NhZ2UgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVyb29ybWVzc2FnZSA9IFwiUGxlYXNlIGNoZWNrIHlvdXIgY3JlZGVudGlhbHNcIjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5pbnZhbGlkTWVzc2FnZSA9IHRydWU7XHJcblx0XHRcdFx0XHR0aGlzLmVyb29ybWVzc2FnZSA9IFwiUGxlYXNlIGNoZWNrIHlvdXIgbmV0d29yayBjb25uZWN0aW9uXCI7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9IFxyXG5cdH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5jbGFzcyBDaGFydEV2ZW50IGltcGxlbWVudHMgbmcuSURpcmVjdGl2ZSB7XHJcblx0cmVzdHJpY3QgPSAnRSc7XHJcblx0c2NvcGUgPSB7XHJcblx0XHR0eXBlOiBcIj1cIixcclxuXHRcdG5hbWU6IFwiQFwiXHJcblx0fTtcclxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsIHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UpIHtcclxuXHR9O1xyXG5cclxuXHRsaW5rID0gKCRzY29wZTogbmcuSVNjb3BlLCBpRWxlbWVudDogSlF1ZXJ5LCBhdHRyaWJ1dGVzOiBuZy5JQXR0cmlidXRlcywgJHNjZTogbmcuSVNDRVNlcnZpY2UpOiB2b2lkID0+IHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciBudmQzXHJcblx0XHRpZihhdHRyaWJ1dGVzLnR5cGUgPT0gJ21ldHJpYycgfHwgYXR0cmlidXRlcy50eXBlID09ICd0YXJnZXQnIHx8IGF0dHJpYnV0ZXMudHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jyl7XHJcblx0XHRcdG52ZDMgPSBpRWxlbWVudC5maW5kKCdudmQzJylbMF07XHJcblx0XHR9XHJcblx0XHRpZihhdHRyaWJ1dGVzLnR5cGUgPT0gJ2ZsaWdodC1wcm9jZXNzJyB8fCBhdHRyaWJ1dGVzLnR5cGUgPT0gJ2ZsaWdodC1jb3VudCcgfHwgYXR0cmlidXRlcy50eXBlID09ICdjb3Vwb24tY291bnQnKXtcclxuXHRcdFx0bnZkMyA9IGlFbGVtZW50LmZpbmQoJ252ZDMtbXVsdGktYmFyLWNoYXJ0JylbMF07XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBzZWxlY3RlZEVsZW0gPSBhbmd1bGFyLmVsZW1lbnQobnZkMyk7XHJcblxyXG5cdFx0XHJcblx0XHRcdFx0XHRcclxuXHJcblx0XHRzZWxmLiR0aW1lb3V0KFxyXG5cdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0c2VsZWN0ZWRFbGVtLnJlYWR5KGZ1bmN0aW9uKGUpIHtcclxuXHRcdFx0XHRcdHZhciBmaXJzdDogbnVtYmVyO1xyXG5cdFx0XHRcdFx0c2VsZWN0ZWRFbGVtLm9uKCdtb3VzZW92ZXIgdG91Y2hlbmQnLCBmdW5jdGlvbihldmVudCkge1xyXG5cdFx0XHRcdFx0XHRpZighZmlyc3Qpe1xyXG5cdFx0XHRcdFx0XHRcdHNlbGYuYXBwZW5kQ2xpY2soc2VsZWN0ZWRFbGVtLCBhdHRyaWJ1dGVzLCBzZWxmKTtcclxuXHRcdFx0XHRcdFx0XHRmaXJzdCA9IDE7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0LypcclxuXHRcdFx0XHRcdCRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7IHJldHVybiBzZWxlY3RlZEVsZW0uaHRtbCgpO1x0IH0sIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG5cdFx0XHRcdFx0XHRpZiAobmV3VmFsdWUpIHtcclxuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKG5ld1ZhbHVlKTtcclxuXHRcdFx0XHRcdFx0XHRzZWxmLmFwcGVuZENsaWNrKHNlbGVjdGVkRWxlbSwgYXR0cmlidXRlcywgc2VsZik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sIHRydWUpOyovXHJcblx0XHRcdFx0XHRzZWxmLmFwcGVuZENsaWNrKHNlbGVjdGVkRWxlbSwgYXR0cmlidXRlcywgc2VsZik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0sXHJcblx0XHRcdDEwKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBmYWN0b3J5KCk6IG5nLklEaXJlY3RpdmVGYWN0b3J5IHtcclxuXHRcdHZhciBkaXJlY3RpdmUgPSAoJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSwgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UpID0+IG5ldyBDaGFydEV2ZW50KCR0aW1lb3V0LCAkcm9vdFNjb3BlKVxyXG5cdFx0ZGlyZWN0aXZlLiRpbmplY3QgPSBbJyR0aW1lb3V0JywgJyRyb290U2NvcGUnXTtcclxuXHRcdHJldHVybiBkaXJlY3RpdmU7XHJcblx0fVxyXG5cclxuXHRhcHBlbmRDbGljayhzZWxlY3RlZEVsZW0sIGF0dHJpYnV0ZXMsIHNlbGYpIHtcclxuXHRcdHZhciBkYmxDbGlja0ludGVydmFsID0gMzAwO1xyXG5cdFx0dmFyIGZpcnN0Q2xpY2tUaW1lO1xyXG5cdFx0dmFyIHdhaXRpbmdTZWNvbmRDbGljayA9IGZhbHNlO1xyXG5cdFx0dmFyIGNoaWxkRWxlbTogYW55ID0gc2VsZWN0ZWRFbGVtLmZpbmQoJ3JlY3QnKTtcclxuXHRcdGFuZ3VsYXIuZm9yRWFjaChjaGlsZEVsZW0sIGZ1bmN0aW9uKGVsZW0sIGtleSkge1xyXG5cdFx0XHRpZiAoZWxlbS50YWdOYW1lID09ICdyZWN0Jykge1xyXG5cdFx0XHRcdHZhciByZWN0RWxlbSA9IGFuZ3VsYXIuZWxlbWVudChlbGVtKTtcclxuXHRcdFx0XHRyZWN0RWxlbS5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xyXG5cdFx0XHRcdFx0aWYgKCF3YWl0aW5nU2Vjb25kQ2xpY2spIHtcclxuXHRcdFx0XHRcdFx0Ly8gU2luZ2xlIGNsbGlja1xyXG5cdFx0XHRcdFx0XHRmaXJzdENsaWNrVGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcblx0XHRcdFx0XHRcdHdhaXRpbmdTZWNvbmRDbGljayA9IHRydWU7XHJcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdHdhaXRpbmdTZWNvbmRDbGljayA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHdhaXRpbmdTZWNvbmRDbGljayk7XHJcblx0XHRcdFx0XHRcdH0sIGRibENsaWNrSW50ZXJ2YWwpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRcdC8vIERvdWJsZSBjbGxpY2tcclxuXHRcdFx0XHRcdFx0d2FpdGluZ1NlY29uZENsaWNrID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdHZhciB0aW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuXHRcdFx0XHRcdFx0aWYgKHRpbWUgLSBmaXJzdENsaWNrVGltZSA8IGRibENsaWNrSW50ZXJ2YWwpIHtcclxuXHRcdFx0XHRcdFx0XHR2YXIgdHlwZSA9IGF0dHJpYnV0ZXMudHlwZTtcclxuXHRcdFx0XHRcdFx0XHRpZihhdHRyaWJ1dGVzLnR5cGUgPT0gJ21ldHJpYycgfHwgYXR0cmlidXRlcy50eXBlID09ICd0YXJnZXQnIHx8IGF0dHJpYnV0ZXMudHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jyl7XHJcblx0XHRcdFx0XHRcdFx0XHRzZWxmLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnb3BlbkRyaWxsUG9wdXAnLCB7XCJkYXRhXCIgOiByZWN0RWxlbVswXVsnX19kYXRhX18nXSwgXCJ0eXBlXCI6IHR5cGUsIFwiZXZlbnRcIjogZXZlbnQsIFwibmFtZVwiOiBhdHRyaWJ1dGVzLm5hbWV9KTsgXHJcblx0XHRcdFx0XHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhyZWN0RWxlbSk7XHJcblx0XHRcdFx0XHRcdFx0XHRzZWxmLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnb3BlbkRyaWxsUG9wdXAxJywge1wiZGF0YVwiIDogcmVjdEVsZW1bMF1bJ19fZGF0YV9fJ10sIFwidHlwZVwiOiB0eXBlLCBcImV2ZW50XCI6IGV2ZW50fSk7IFxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdH1cclxuXHRcdH0pOyBcclxuXHR9XHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vX2xpYnMudHNcIiAvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL2FwcC9BcHBDb250cm9sbGVyLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9Db3Jkb3ZhU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9Mb2NhbFN0b3JhZ2VTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL3NlcnZpY2VzL1Nlc3Npb25TZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vc2VydmljZXMvRXJyb3JIYW5kbGVyU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvTWlzU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL29wZXJhdGlvbmFsL3NlcnZpY2VzL09wZXJhdGlvbmFsU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9NaXNDb250cm9sbGVyLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL09wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL3VzZXIvTG9naW5Db250cm9sbGVyLnRzXCIvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL2NoYXJ0LWV2ZW50L0NoYXJ0RXZlbnQudHNcIiAvPlxyXG5cclxudmFyIFNFUlZFUl9VUkwgPSAnaHR0cDovLzEwLjkxLjE1Mi45OTo4MDgyL3JhcGlkLXdzL3NlcnZpY2VzL3Jlc3QnO1xyXG5hbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnLCBbJ2lvbmljJywgJ3JhcGlkTW9iaWxlLmNvbmZpZycsICd0YWJTbGlkZUJveCcsICdudmQzQ2hhcnREaXJlY3RpdmVzJywgJ252ZDMnXSlcclxuXHJcblx0LnJ1bigoJGlvbmljUGxhdGZvcm06IElvbmljLklQbGF0Zm9ybSwgJGh0dHA6IG5nLklIdHRwU2VydmljZSkgPT4ge1xyXG5cdFx0JGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb24udG9rZW4gPSAndG9rZW4nO1xyXG4gIFx0XHQkaHR0cC5kZWZhdWx0cy5oZWFkZXJzLnBvc3RbXCJDb250ZW50LVR5cGVcIl0gPSBcImFwcGxpY2F0aW9uL2pzb25cIjtcclxuXHRcdCRpb25pY1BsYXRmb3JtLnJlYWR5KCgpID0+IHtcclxuXHRcdFx0aWYgKHR5cGVvZiBuYXZpZ2F0b3IuZ2xvYmFsaXphdGlvbiAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0fVxyXG5cdFx0fSlcclxuXHR9KVxyXG4uY29uZmlnKCgkc3RhdGVQcm92aWRlcjogYW5ndWxhci51aS5JU3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyOiBhbmd1bGFyLnVpLklVcmxSb3V0ZXJQcm92aWRlcixcclxuXHQkaW9uaWNDb25maWdQcm92aWRlcjogSW9uaWMuSUNvbmZpZ1Byb3ZpZGVyKSA9PiB7XHJcblx0JGlvbmljQ29uZmlnUHJvdmlkZXIudmlld3Muc3dpcGVCYWNrRW5hYmxlZChmYWxzZSk7XHJcblxyXG5cdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhcHAnLCB7XHJcblx0XHR1cmw6ICcvYXBwJyxcclxuXHRcdGFic3RyYWN0OiB0cnVlLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3RlbXBsYXRlcy9tZW51Lmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjogJ0FwcENvbnRyb2xsZXIgYXMgYXBwQ3RybCdcclxuXHR9KVxyXG5cdC5zdGF0ZSgnbG9naW4nLCB7XHJcblx0XHRjYWNoZTogZmFsc2UsXHJcblx0XHR1cmw6ICcvbG9naW4nLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3VzZXIvbG9naW4uaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOiAnTG9naW5Db250cm9sbGVyIGFzIExvZ2luQ3RybCdcclxuXHR9KVxyXG5cdC5zdGF0ZSgnYXBwLm1pcy1mbG93bicsIHtcclxuXHRcdGNhY2hlOiBmYWxzZSxcclxuXHRcdHVybDogJy9taXMvZmxvd24nLFxyXG5cdFx0dmlld3M6IHtcclxuXHRcdFx0J21lbnVDb250ZW50Jzoge1xyXG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9taXMvZmxvd24uaHRtbCcsXHJcblx0XHRcdFx0Y29udHJvbGxlcjogJ01pc0NvbnRyb2xsZXIgYXMgTWlzQ3RybCdcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pXHJcblx0LnN0YXRlKCdhcHAub3BlcmF0aW9uYWwtZmxvd24nLCB7XHJcblx0XHRjYWNoZTogZmFsc2UsXHJcblx0XHR1cmw6ICcvb3BlcmF0aW9uYWwvZmxvd24nLFxyXG5cdFx0dmlld3M6IHtcclxuXHRcdFx0J21lbnVDb250ZW50Jzoge1xyXG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9mbG93bi5odG1sJyxcclxuXHRcdFx0XHRjb250cm9sbGVyOiAnT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIgYXMgT3ByQ3RybCdcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHQkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvbG9naW4nKTtcclxufSlcclxuXHJcbi5zZXJ2aWNlKCdEYXRhUHJvdmlkZXJTZXJ2aWNlJywgRGF0YVByb3ZpZGVyU2VydmljZSlcclxuLnNlcnZpY2UoJ05ldFNlcnZpY2UnLCBOZXRTZXJ2aWNlKVxyXG4uc2VydmljZSgnRXJyb3JIYW5kbGVyU2VydmljZScsIEVycm9ySGFuZGxlclNlcnZpY2UpXHJcbi5zZXJ2aWNlKCdTZXNzaW9uU2VydmljZScsIFNlc3Npb25TZXJ2aWNlKVxyXG4uc2VydmljZSgnQ29yZG92YVNlcnZpY2UnLCBDb3Jkb3ZhU2VydmljZSlcclxuLnNlcnZpY2UoJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCBMb2NhbFN0b3JhZ2VTZXJ2aWNlKVxyXG4uc2VydmljZSgnVXNlclNlcnZpY2UnLCBVc2VyU2VydmljZSlcclxuXHJcbi5zZXJ2aWNlKCdNaXNTZXJ2aWNlJywgTWlzU2VydmljZSlcclxuLnNlcnZpY2UoJ09wZXJhdGlvbmFsU2VydmljZScsIE9wZXJhdGlvbmFsU2VydmljZSlcclxuLnNlcnZpY2UoJ0ZpbHRlcmVkTGlzdFNlcnZpY2UnLCBGaWx0ZXJlZExpc3RTZXJ2aWNlKVxyXG4uc2VydmljZSgnQ2hhcnRvcHRpb25TZXJ2aWNlJywgQ2hhcnRvcHRpb25TZXJ2aWNlKVxyXG5cclxuLmNvbnRyb2xsZXIoJ0FwcENvbnRyb2xsZXInLCBBcHBDb250cm9sbGVyKVxyXG4uY29udHJvbGxlcignTWlzQ29udHJvbGxlcicsIE1pc0NvbnRyb2xsZXIpXHJcbi5jb250cm9sbGVyKCdPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlcicsIE9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyKVxyXG4uY29udHJvbGxlcignTG9naW5Db250cm9sbGVyJywgTG9naW5Db250cm9sbGVyKVxyXG5cclxuLmRpcmVjdGl2ZSgnY2hhcnRldmVudCcsIENoYXJ0RXZlbnQuZmFjdG9yeSgpKVxyXG4vLyAuZGlyZWN0aXZlKCdmZXRjaExpc3QnLCBGZXRjaExpc3QuZmFjdG9yeSgpKVxyXG5cclxuXHJcbmlvbmljLlBsYXRmb3JtLnJlYWR5KCgpID0+IHtcclxuXHRpZiAod2luZG93LmNvcmRvdmEgJiYgd2luZG93LmNvcmRvdmEucGx1Z2lucy5LZXlib2FyZCkge1xyXG5cdH1cclxuXHQvLyBTdGF0dXNCYXIub3ZlcmxheXNXZWJWaWV3KGZhbHNlKTtcclxuIC8vICAgIFN0YXR1c0Jhci5iYWNrZ3JvdW5kQ29sb3JCeUhleFN0cmluZygnIzIwOWRjMicpO1xyXG4gLy8gICAgU3RhdHVzQmFyLnN0eWxlTGlnaHRDb250ZW50KCk7XHJcblx0Xy5kZWZlcigoKSA9PiB7XHJcblx0XHQvLyBhbmd1bGFyLmJvb3RzdHJhcChkb2N1bWVudCwgWydyYXBpZE1vYmlsZSddKTtcclxuXHR9KTtcclxufSk7XHJcbiIsbnVsbCwiKGZ1bmN0aW9uICgpIHtcclxuICAndXNlIHN0cmljdCc7XHJcbiAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcclxuICAuZGlyZWN0aXZlKCdoZVByb2dyZXNzQmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUpIHtcclxuICAgIHZhciByb290U2NvcGUgPSAkcm9vdFNjb3BlO1xyXG4gICAgdmFyIGRpcmVjdGl2ZURlZmluaXRpb25PYmplY3QgPSB7XHJcbiAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgIHJlcGxhY2U6IGZhbHNlLFxyXG4gICAgICBzY29wZToge2RhdGE6ICc9Y2hhcnREYXRhJywgc2hvd3Rvb2x0aXA6ICdAc2hvd1Rvb2x0aXAnfSxcclxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcclxuICAgICAgICAgICAgICAgICAgLmRvbWFpbihbMCwgZDMubWF4KHNjb3BlLmRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuICtkLnByb2dyZXNzIH0pXSlcclxuICAgICAgICAgICAgICAgICAgLnJhbmdlKFswLCA5MF0pO1xyXG5cclxuICAgICAgICB2YXIgc2VnbWVudCA9IGQzLnNlbGVjdChlbGVtZW50WzBdKVxyXG4gICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKFwiLmhvcml6b250YWwtYmFyLWdyYXBoLXNlZ21lbnRcIilcclxuICAgICAgICAgICAgICAgICAgICAgLmRhdGEoc2NvcGUuZGF0YSlcclxuICAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcclxuICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXNlZ21lbnRcIiwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC1sYWJlbFwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWUgfSk7XHJcblxyXG4gICAgICAgIHZhciBiYXJTZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXZhbHVlXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtdmFsdWUtc2NhbGVcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZS1iYXJcIiwgdHJ1ZSkub24oJ2NsaWNrJywgZnVuY3Rpb24ob2JqKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGF0dHJzLm5hbWUgPT0gXCJUb3AgNSBPQUwgQ29udHJpYnV0aW9uXCIpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb290U2NvcGUuJGJyb2FkY2FzdCgnb3BlbkRyaWxsUG9wdXAnLCB7XCJkYXRhXCIgOiBvYmosIFwidHlwZVwiOiAnb2FsJywgXCJldmVudFwiOiB3aW5kb3cuZXZlbnQsIFwibmFtZVwiOiBhdHRycy5uYW1lfSk7ICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgYmFyU2VnbWVudFxyXG4gICAgICAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuY29sb3IgfSkgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAudHJhbnNpdGlvbigpXHJcbiAgICAgICAgICAgICAgIC5kdXJhdGlvbigxMDAwKVxyXG4gICAgICAgICAgICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4geCgrZC5wcm9ncmVzcykgKyBcIiVcIiB9KTtcclxuXHJcbiAgICAgICAgdmFyIGJveFNlZ21lbnQgPSBiYXJTZWdtZW50LmFwcGVuZChcInNwYW5cIikuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXZhbHVlLWJveFwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQucHJvZ3Jlc3MgPyBkLnByb2dyZXNzIDogXCJcIiB9KTtcclxuICAgICAgICBpZihzY29wZS5zaG93dG9vbHRpcCAhPT0gJ3RydWUnKSByZXR1cm47ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgdmFyIGJ0blNlZ21lbnQgPSBzZWdtZW50LmFwcGVuZChcImJ1dHRvblwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtaWNvbiBpY29uIGlvbi1jaGV2cm9uLWRvd24gbm8tYm9yZGVyIHNlY3RvckN1c3RvbUNsYXNzXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJoaWRlXCIsIGZ1bmN0aW9uKGQpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoZCkgcmV0dXJuIGQuZHJpbGxGbGFnID09ICdOJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTsgICAgICAgICAgICBcclxuICAgICAgICB2YXIgdG9vbHRpcFNlZ21lbnQgPSBzZWdtZW50LmFwcGVuZChcImRpdlwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcInRvb2x0aXBcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoJ2hpZGUnLCB0cnVlKTtcclxuICAgICAgICB0b29sdGlwU2VnbWVudC5hcHBlbmQoXCJwXCIpLnRleHQoZnVuY3Rpb24oZCl7IHJldHVybiBkLm5hbWU7IH0pO1xyXG4gICAgICAgIHZhciB0YWJsZSA9IHRvb2x0aXBTZWdtZW50LmFwcGVuZChcInRhYmxlXCIpO1xyXG4gICAgICAgIHZhciB0aGVhZCA9IHRhYmxlLmFwcGVuZCgndHInKTtcclxuICAgICAgICB0aGVhZC5hcHBlbmQoJ3RoJykudGV4dCgnU2VjdG9yJyk7XHJcbiAgICAgICAgdGhlYWQuYXBwZW5kKCd0aCcpLnRleHQoJ1JldmVudWUnKTtcclxuXHJcbiAgICAgICAgdmFyIHRyICA9IHRhYmxlXHJcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZCgndGJvZHknKVxyXG4gICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoXCJ0clwiKVxyXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKGZ1bmN0aW9uKGQpe3JldHVybiBkLnNjQW5hbHlzaXNEcmlsbHN9KVxyXG4gICAgICAgICAgICAgICAgICAgIC5lbnRlcigpLmFwcGVuZChcInRyXCIpO1xyXG5cclxuICAgICAgICB2YXIgc2VjdG9yVGQgPSB0ci5hcHBlbmQoXCJ0ZFwiKVxyXG4gICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnNlY3RvciB9KTtcclxuXHJcbiAgICAgICAgdmFyIHJldmVudWVUZCA9IHRyLmFwcGVuZChcInRkXCIpXHJcbiAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQucmV2ZW51ZSB9KTtcclxuXHJcbiAgICAgICAgYnRuU2VnbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpeyAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0b29sdGlwU2VnbWVudCk7XHJcblx0XHQgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5yZW1vdmVDbGFzcygnc2VjdG9yQ3VzdG9tQ2xhc3MnKTtcclxuXHRcdCAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc2VjdG9yQ3VzdG9tQ2xhc3NcIikpLnJlbW92ZUNsYXNzKCdpb24tY2hldnJvbi11cCcpO1xyXG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5zZWN0b3JDdXN0b21DbGFzc1wiKSkuYWRkQ2xhc3MoJ2lvbi1jaGV2cm9uLWRvd24nKTtcclxuXHRcdCAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc2VjdG9yQ3VzdG9tQ2xhc3NcIikpLm5leHQoKS5yZW1vdmVDbGFzcygnc2hvdycpO1xyXG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5zZWN0b3JDdXN0b21DbGFzc1wiKSkubmV4dCgpLmFkZENsYXNzKCdoaWRlJyk7XHJcblx0XHQgIFxyXG4gICAgICAgICAgaWYoYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5oYXNDbGFzcygnc2hvdycpKSB7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5yZW1vdmVDbGFzcygnaW9uLWNoZXZyb24tdXAnKTtcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLmFkZENsYXNzKCdpb24tY2hldnJvbi1kb3duJyk7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkucmVtb3ZlQ2xhc3MoJ3Nob3cnKTsgICAgICAgICAgICBcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5hZGRDbGFzcygnaGlkZScpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLnJlbW92ZUNsYXNzKCdpb24tY2hldnJvbi1kb3duJyk7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5hZGRDbGFzcygnaW9uLWNoZXZyb24tdXAnKTtcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5yZW1vdmVDbGFzcygnaGlkZScpO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLmFkZENsYXNzKCdzaG93Jyk7XHJcbiAgICAgICAgICB9XHJcblx0XHQgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5hZGRDbGFzcygnc2VjdG9yQ3VzdG9tQ2xhc3MnKTtcclxuXHRcdCAgXHJcblx0XHQgIFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIGRpcmVjdGl2ZURlZmluaXRpb25PYmplY3Q7XHJcbiAgfSk7XHJcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcclxuICAndXNlIHN0cmljdCc7XHJcbiAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcclxuICAuZGlyZWN0aXZlKCdoZVJldmVudWVQcm9ncmVzc0JhcicsIGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciByZXZCYXJPYmplY3QgPSB7XHJcbiAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgIHJlcGxhY2U6IGZhbHNlLFxyXG4gICAgICBzY29wZToge2RhdGE6ICc9Y2hhcnREYXRhJ30sXHJcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhzY29wZS5kYXRhKTtcclxuICAgICAgICBzY29wZS4kd2F0Y2goJ2RhdGEnLCBmdW5jdGlvbihuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcclxuICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnbmV3VmFsdWUnLCBuZXdWYWx1ZSk7XHJcbiAgICAgICAgICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcclxuICAgICAgICAgICAgICAgICAgICAgIC5kb21haW4oWzAsIGQzLm1heChzY29wZS5kYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlIH0pXSlcclxuICAgICAgICAgICAgICAgICAgICAgIC5yYW5nZShbMCwgOTBdKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBzZWdtZW50ID0gZDMuc2VsZWN0KGVsZW1lbnRbMF0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKFwiLm5ldC1yZXYtYmFyLWdyYXBoLXNlZ21lbnRcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgIC5kYXRhKHNjb3BlLmRhdGEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC1zZWdtZW50XCIsIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgc2VnbWVudC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLWxhYmVsXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWUgfSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgYmFyU2VnbWVudCA9IHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC12YWx1ZVwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC12YWx1ZS1zY2FsZVwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC12YWx1ZS1iYXJcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC12YWx1ZS1ib3hcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZTsgfSk7XHJcblxyXG4gICAgICAgICAgICBiYXJTZWdtZW50ICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmNvbG9yIH0pICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKClcclxuICAgICAgICAgICAgICAgICAgIC5kdXJhdGlvbigxMDAwKVxyXG4gICAgICAgICAgICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoZC52YWx1ZSkgKyBcIiVcIiB9KTsgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICB9ICAgICAgICAgICAgICAgXHJcbiAgICAgICAgfSwgdHJ1ZSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgICByZXR1cm4gcmV2QmFyT2JqZWN0O1xyXG4gIH0pO1xyXG59KSgpOyIsIlxyXG4oZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcbiAgICAvLyBhdHRhY2ggdGhlIGZhY3RvcmllcyBhbmQgc2VydmljZSB0byB0aGUgW3N0YXJ0ZXIuc2VydmljZXNdIG1vZHVsZSBpbiBhbmd1bGFyXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKVxyXG4gICAgICAgIC5zZXJ2aWNlKCdSZXBvcnRCdWlsZGVyU3ZjJywgcmVwb3J0QnVpbGRlclNlcnZpY2UpO1xyXG4gICAgXHJcblx0ZnVuY3Rpb24gcmVwb3J0QnVpbGRlclNlcnZpY2UoKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHNlbGYuZ2VuZXJhdGVSZXBvcnQgPSBfZ2VuZXJhdGVSZXBvcnQ7ICAgICAgICAgICAgXHJcbiAgICAgICAgZnVuY3Rpb24gX2dlbmVyYXRlUmVwb3J0KHBhcmFtLCBjaGFydFRpdGxlLGZsb3duTW9udGgpIHtcclxuXHRcdFx0dmFyIHRpdGxlID0gXCJcIjtcclxuXHRcdFx0aWYocGFyYW0gPT0gXCJtZXRyaWNTbmFwc2hvdFwiKVxyXG5cdFx0XHRcdHRpdGxlID0gXCJNRVRSSUMgU05BUFNIT1QgLVwiK2Zsb3duTW9udGgrXCIgXCIrY2hhcnRUaXRsZS50b1VwcGVyQ2FzZSgpK1wiLSBWSUVXXCI7XHJcblx0XHRcdGVsc2UgaWYocGFyYW0gPT0gXCJ0YXJnZXRBY3R1YWxcIilcclxuXHRcdFx0XHR0aXRsZSA9IFwiVEFSR0VUIFZTIEFDVFVBTCAtIFwiKygoY2hhcnRUaXRsZSA9PSBcInJldmVudWVcIik/XCJORVQgUkVWRU5VRVwiOlwiUEFYIENvdW50XCIpK1wiIFwiK2Zsb3duTW9udGgrIFwiIC0gVklFV1wiO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0dGl0bGUgPSBjaGFydFRpdGxlK1wiIFwiK2Zsb3duTW9udGgrXCIgLSBWSUVXXCI7XHJcblx0XHRcdFx0XHRcdFx0XHJcblx0XHRcdHZhciBzdmdOb2RlID0gZDMuc2VsZWN0QWxsKFwiLlwiK3BhcmFtKS5zZWxlY3RBbGwoXCJzdmdcIik7XHJcblx0XHRcdHZhciBjb250ZW50ID0gW107XHJcblx0XHRcdHZhciBpbWFnZUNvbHVtbiA9IFtdO1xyXG5cdFx0XHR2YXIgdGV4dENvbHVtbiA9IFtdO1xyXG5cdFx0XHR2YXIgaW1hZ2VzT2JqID0ge307XHJcblx0XHRcdHZhciB0ZXh0T2JqID0ge307XHJcblx0XHRcdGNvbnRlbnQucHVzaCh0aXRsZSk7XHJcblx0XHRcdHZhciBub2RlRXhpc3RzID0gW107XHJcblx0XHRcdGFuZ3VsYXIuZm9yRWFjaChzdmdOb2RlLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XHRcdFx0XHRcclxuXHRcdFx0XHQvL3RleHRPYmpbJ2FsaWdubWVudCddID0gJ2NlbnRlcidcdFx0XHRcdFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBodG1sID0gXCJcIjtcclxuXHRcdFx0XHRpZihub2RlRXhpc3RzLmluZGV4T2Yoc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLWZsYWdcIikpID09IC0xICYmIHN2Z05vZGVba2V5XS5sZW5ndGggPj0gMSl7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0XHRodG1sID0gc3ZnTm9kZVtrZXldWzBdLm91dGVySFRNTDtcclxuXHRcdFx0XHRcdGlmKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1wZGZGbGFnXCIpID09PSBcImR5bmFtaWNXSFwiKXtcclxuXHRcdFx0XHRcdFx0ZDMuc2VsZWN0KFwiLlwiK3BhcmFtK1wiRmxhZ1wiKS5zZWxlY3QoXCJzdmdcIikuYXR0cihcIndpZHRoXCIsMTUwMCk7XHJcblx0XHRcdFx0XHRcdGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpLmF0dHIoXCJoZWlnaHRcIiw2MDApO1xyXG5cdFx0XHRcdFx0XHR2YXIgbm9kZSA9IGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpO1xyXG5cdFx0XHRcdFx0XHRodG1sID0gbm9kZVswXVswXS5vdXRlckhUTUw7XHJcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDUwMDtcclxuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWydoZWlnaHQnXSA9IDUwMDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1wZGZGbGFnXCIpID09PSBcInBkZkZsYWdcIilcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWyd3aWR0aCddID0gNzUwO1xyXG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ2hlaWdodCddID0gMzAwO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Y2FudmcoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpLCBodG1sKTtcclxuXHRcdFx0XHRcdHZhciB0ZXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xyXG5cdFx0XHRcdFx0dmFyIGltZ3NyYyA9IHRlc3QudG9EYXRhVVJMKCk7XHJcblx0XHRcdFx0XHR2YXIgIHRleHQgPSBcIlxcblwiK3N2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS10aXRsZVwiKStcIlxcblwiO1xyXG5cdFx0XHRcdFx0dGV4dE9ialsndGV4dCddID0gdGV4dDtcclxuXHRcdFx0XHRcdHRleHRDb2x1bW4ucHVzaCh0ZXh0T2JqKTtcclxuXHRcdFx0XHRcdGltYWdlc09ialsnaW1hZ2UnXSA9IGltZ3NyYztcclxuXHRcdFx0XHRcdGltYWdlQ29sdW1uLnB1c2goaW1hZ2VzT2JqKTtcdFx0XHRcdFxyXG5cdFx0XHRcdFx0dmFyIGltZ1RlbXAgPXt9LCB0eHRUZW1wID17fTtcdFx0XHJcblx0XHRcdFx0XHR0eHRUZW1wWydjb2x1bW5zJ10gPSB0ZXh0Q29sdW1uO1xyXG5cdFx0XHRcdFx0aW1nVGVtcFsnYWxpZ25tZW50J10gPSAnY2VudGVyJztcclxuXHRcdFx0XHRcdGltZ1RlbXBbJ2NvbHVtbnMnXSA9IGltYWdlQ29sdW1uO1xyXG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKHR4dFRlbXApO1xyXG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKGltZ1RlbXApO1x0XHRcdFx0XHRcclxuXHRcdFx0XHRcdGltYWdlQ29sdW1uID0gW107XHJcblx0XHRcdFx0XHR0ZXh0Q29sdW1uID0gW107XHJcblx0XHRcdFx0XHRpbWFnZXNPYmogPSB7fTtcclxuXHRcdFx0XHRcdHRleHRPYmogPSB7fTtcclxuXHRcdFx0XHRcdGltZ1RlbXAgPSB7fTtcclxuXHRcdFx0XHRcdHR4dFRlbXAgPXt9O1xyXG5cdFx0XHRcdFx0bm9kZUV4aXN0cy5wdXNoKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1mbGFnXCIpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRjb250ZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdHN0eWxlczoge1xyXG5cdFx0XHRcdFx0aGVhZGVyOiB7XHJcblx0XHRcdFx0XHRcdGZvbnRTaXplOiAxOCxcclxuXHRcdFx0XHRcdFx0Ym9sZDogdHJ1ZVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdGJpZ2dlcjoge1xyXG5cdFx0XHRcdFx0XHRmb250U2l6ZTogMTUsXHJcblx0XHRcdFx0XHRcdGl0YWxpY3M6IHRydWUsXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRkZWZhdWx0U3R5bGU6IHtcclxuXHRcdFx0XHRcdGNvbHVtbkdhcDogMjAsXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cdFx0fTtcclxuICAgIH1cclxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcbiAgICAvLyBhdHRhY2ggdGhlIHNlcnZpY2UgdG8gdGhlIFtyYXBpZE1vYmlsZV0gbW9kdWxlIGluIGFuZ3VsYXJcclxuICAgIGFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScpXHJcblx0IFx0LnNlcnZpY2UoJ1JlcG9ydFN2YycsIFsnJHEnLCAnJHRpbWVvdXQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwb3J0U3ZjXSk7XHJcblxyXG5cdC8vIGdlblJlcG9ydERlZiAtLT4gZ2VuUmVwb3J0RG9jIC0tPiBidWZmZXJbXSAtLT4gQmxvYigpIC0tPiBzYXZlRmlsZSAtLT4gcmV0dXJuIGZpbGVQYXRoXHJcblxyXG5cdCBmdW5jdGlvbiByZXBvcnRTdmMoJHEsICR0aW1lb3V0KSB7XHJcblx0XHQgdGhpcy5ydW5SZXBvcnRBc3luYyA9IF9ydW5SZXBvcnRBc3luYztcclxuXHRcdCB0aGlzLnJ1blJlcG9ydERhdGFVUkwgPSBfcnVuUmVwb3J0RGF0YVVSTDtcclxuXHJcblx0XHQvLyBSVU4gQVNZTkM6IHJ1bnMgdGhlIHJlcG9ydCBhc3luYyBtb2RlIHcvIHByb2dyZXNzIHVwZGF0ZXMgYW5kIGRlbGl2ZXJzIGEgbG9jYWwgZmlsZVVybCBmb3IgdXNlXHJcblxyXG5cdFx0IGZ1bmN0aW9uIF9ydW5SZXBvcnRBc3luYyhzdGF0dXNGbGFnLHRpdGxlLGZsb3duTW9udGgsdGFiSW5kZXgpIHtcclxuICAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XHJcblx0XHRcdCBcclxuICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzEuUHJvY2Vzc2luZyBUcmFuc2NyaXB0Jyk7XHJcbiAgICAgICAgICAgICBnZW5lcmF0ZVJlcG9ydERlZihzdGF0dXNGbGFnLHRpdGxlLGZsb3duTW9udGgsdGFiSW5kZXgpLnRoZW4oZnVuY3Rpb24oZG9jRGVmKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMi4gR2VuZXJhdGluZyBSZXBvcnQnKTtcclxuICAgICAgICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVSZXBvcnREb2MoZG9jRGVmKTtcclxuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocGRmRG9jKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMy4gQnVmZmVyaW5nIFJlcG9ydCcpO1xyXG4gICAgICAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZVJlcG9ydEJ1ZmZlcihwZGZEb2MpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihidWZmZXIpIHtcclxuICAgICAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCc0LiBTYXZpbmcgUmVwb3J0IEZpbGUnKTtcclxuICAgICAgICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVSZXBvcnRCbG9iKGJ1ZmZlcik7XHJcbiAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHBkZkJsb2IpIHtcclxuICAgICAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCc1LiBPcGVuaW5nIFJlcG9ydCBGaWxlJyk7XHJcbiAgICAgICAgICAgICAgICAgcmV0dXJuIHNhdmVGaWxlKHBkZkJsb2Isc3RhdHVzRmxhZyk7XHJcbiAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGZpbGVQYXRoKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9oaWRlTG9hZGluZygpO1xyXG4gICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAvL2hpZGVMb2FkaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgZXJyb3IudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbiAgICAgICAgIH1cclxuXHJcblx0XHQvLyBSVU4gREFUQVVSTDogcnVucyB0aGUgcmVwb3J0IGFzeW5jIG1vZGUgdy8gcHJvZ3Jlc3MgdXBkYXRlcyBhbmQgc3RvcHMgdy8gcGRmRG9jIC0+IGRhdGFVUkwgc3RyaW5nIGNvbnZlcnNpb25cclxuXHJcblx0XHQgZnVuY3Rpb24gX3J1blJlcG9ydERhdGFVUkwoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoLHRhYkluZGV4KSB7XHJcbiAgICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHQgXHJcbiAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCcxLlByb2Nlc3NpbmcgVHJhbnNjcmlwdCcpO1xyXG4gICAgICAgICAgICAgZ2VuZXJhdGVSZXBvcnREZWYoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoLHRhYkluZGV4KS50aGVuKGZ1bmN0aW9uKGRvY0RlZikge1xyXG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzIuIEdlbmVyYXRpbmcgUmVwb3J0Jyk7XHJcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0RG9jKGRvY0RlZik7XHJcbiAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHBkZkRvYykge1xyXG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzMuIENvbnZlcnQgdG8gRGF0YVVSTCcpO1xyXG4gICAgICAgICAgICAgICAgIHJldHVybiBnZXREYXRhVVJMKHBkZkRvYyk7XHJcbiAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKG91dERvYykge1xyXG4gICAgICAgICAgICAgICAgIC8vaGlkZUxvYWRpbmcoKTtcclxuICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKG91dERvYyk7XHJcbiAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgIC8vaGlkZUxvYWRpbmcoKTtcclxuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcgKyBlcnJvci50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICAgICAgICAgfVxyXG5cclxuXHRcdC8vIDEuR2VuZXJhdGVSZXBvcnREZWY6IHVzZSBjdXJyZW50VHJhbnNjcmlwdCB0byBjcmFmdCByZXBvcnREZWYgSlNPTiBmb3IgcGRmTWFrZSB0byBnZW5lcmF0ZSByZXBvcnRcclxuXHJcblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydERlZihzdGF0dXNGbGFnLHRpdGxlLGZsb3duTW9udGgsdGFiSW5kZXgpIHtcclxuICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdFx0XHJcbiAgICAgICAgICAgIC8vIHJlbW92ZWQgc3BlY2lmaWNzIG9mIGNvZGUgdG8gcHJvY2VzcyBkYXRhIGZvciBkcmFmdGluZyB0aGUgZG9jXHJcbiAgICAgICAgICAgIC8vIGxheW91dCBiYXNlZCBvbiBwbGF5ZXIsIHRyYW5zY3JpcHQsIGNvdXJzZXMsIGV0Yy5cclxuICAgICAgICAgICAgLy8gY3VycmVudGx5IG1vY2tpbmcgdGhpcyBhbmQgcmV0dXJuaW5nIGEgcHJlLWJ1aWx0IEpTT04gZG9jIGRlZmluaXRpb25cclxuICAgICAgICAgICAgXHJcblx0XHRcdC8vdXNlIHJwdCBzZXJ2aWNlIHRvIGdlbmVyYXRlIHRoZSBKU09OIGRhdGEgbW9kZWwgZm9yIHByb2Nlc3NpbmcgUERGXHJcbiAgICAgICAgICAgIC8vIGhhZCB0byB1c2UgdGhlICR0aW1lb3V0IHRvIHB1dCBhIHNob3J0IGRlbGF5IHRoYXQgd2FzIG5lZWRlZCB0byBcclxuICAgICAgICAgICAgLy8gcHJvcGVybHkgZ2VuZXJhdGUgdGhlIGRvYyBkZWNsYXJhdGlvblxyXG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkZCA9IHt9O1xyXG4gICAgICAgICAgICAgICAgZGQgPSBnZW5lcmF0ZVJlcG9ydChzdGF0dXNGbGFnLHRpdGxlLGZsb3duTW9udGgsdGFiSW5kZXgpXHJcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShkZCk7XHJcbiAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyAyLkdlbmVyYXRlUnB0RmlsZURvYzogdGFrZSBKU09OIGZyb20gcnB0U3ZjLCBjcmVhdGUgcGRmbWVtb3J5IGJ1ZmZlciwgYW5kIHNhdmUgYXMgYSBsb2NhbCBmaWxlXHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnREb2MoZG9jRGVmaW5pdGlvbikge1xyXG5cdFx0XHQvL3VzZSB0aGUgcGRmbWFrZSBsaWIgdG8gY3JlYXRlIGEgcGRmIGZyb20gdGhlIEpTT04gY3JlYXRlZCBpbiB0aGUgbGFzdCBzdGVwXHJcblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XHJcblx0XHRcdHRyeSB7XHJcbiAgICAgICAgICAgICAgICAvL3VzZSB0aGUgcGRmTWFrZSBsaWJyYXJ5IHRvIGNyZWF0ZSBpbiBtZW1vcnkgcGRmIGZyb20gdGhlIEpTT05cclxuXHRcdFx0XHR2YXIgcGRmRG9jID0gcGRmTWFrZS5jcmVhdGVQZGYoIGRvY0RlZmluaXRpb24gKTtcclxuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocGRmRG9jKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXRjaCAoZSkge1xyXG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gMy5HZW5lcmF0ZVJwdEJ1ZmZlcjogcGRmS2l0IG9iamVjdCBwZGZEb2MgLS0+IGJ1ZmZlciBhcnJheSBvZiBwZGZEb2NcclxuXHJcblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydEJ1ZmZlcihwZGZEb2MpIHtcclxuXHRcdFx0Ly91c2UgdGhlIHBkZm1ha2UgbGliIHRvIGdldCBhIGJ1ZmZlciBhcnJheSBvZiB0aGUgcGRmRG9jIG9iamVjdFxyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHR0cnkge1xyXG4gICAgICAgICAgICAgICAgLy9nZXQgdGhlIGJ1ZmZlciBmcm9tIHRoZSBwZGZEb2NcclxuXHRcdFx0XHRwZGZEb2MuZ2V0QnVmZmVyKGZ1bmN0aW9uKGJ1ZmZlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdFx0ICAgZGVmZXJyZWQucmVzb2x2ZShidWZmZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDNiLmdldERhdGFVUkw6IHBkZktpdCBvYmplY3QgcGRmRG9jIC0tPiBlbmNvZGVkIGRhdGFVcmxcclxuXHJcblx0XHQgZnVuY3Rpb24gZ2V0RGF0YVVSTChwZGZEb2MpIHtcclxuXHRcdFx0Ly91c2UgdGhlIHBkZm1ha2UgbGliIHRvIGNyZWF0ZSBhIHBkZiBmcm9tIHRoZSBKU09OIGNyZWF0ZWQgaW4gdGhlIGxhc3Qgc3RlcFxyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHR0cnkge1xyXG4gICAgICAgICAgICAgICAgLy91c2UgdGhlIHBkZk1ha2UgbGlicmFyeSB0byBjcmVhdGUgaW4gbWVtb3J5IHBkZiBmcm9tIHRoZSBKU09OXHJcblx0XHRcdFx0cGRmRG9jLmdldERhdGFVcmwoZnVuY3Rpb24ob3V0RG9jKSB7XHJcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKG91dERvYyk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdFx0IH1cclxuXHJcblx0XHQvLyA0LkdlbmVyYXRlUmVwb3J0QmxvYjogYnVmZmVyIC0tPiBuZXcgQmxvYiBvYmplY3RcclxuXHJcblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydEJsb2IoYnVmZmVyKSB7XHJcblx0XHRcdC8vdXNlIHRoZSBnbG9iYWwgQmxvYiBvYmplY3QgZnJvbSBwZGZtYWtlIGxpYiB0byBjcmVhdCBhIGJsb2IgZm9yIGZpbGUgcHJvY2Vzc2luZ1xyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHR0cnkge1xyXG4gICAgICAgICAgICAgICAgLy9wcm9jZXNzIHRoZSBpbnB1dCBidWZmZXIgYXMgYW4gYXBwbGljYXRpb24vcGRmIEJsb2Igb2JqZWN0IGZvciBmaWxlIHByb2Nlc3NpbmdcclxuICAgICAgICAgICAgICAgIHZhciBwZGZCbG9iID0gbmV3IEJsb2IoW2J1ZmZlcl0sIHt0eXBlOiAnYXBwbGljYXRpb24vcGRmJ30pO1xyXG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShwZGZCbG9iKTtcclxuICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDUuU2F2ZUZpbGU6IHVzZSB0aGUgRmlsZSBwbHVnaW4gdG8gc2F2ZSB0aGUgcGRmQmxvYiBhbmQgcmV0dXJuIGEgZmlsZVBhdGggdG8gdGhlIGNsaWVudFxyXG5cclxuXHRcdGZ1bmN0aW9uIHNhdmVGaWxlKHBkZkJsb2IsdGl0bGUpIHtcclxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdFx0dmFyIGZpbGVOYW1lID0gdW5pcXVlRmlsZU5hbWUodGl0bGUpK1wiLnBkZlwiO1xyXG5cdFx0XHR2YXIgZmlsZVBhdGggPSBcIlwiO1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdTYXZlRmlsZTogcmVxdWVzdEZpbGVTeXN0ZW0nKTtcclxuXHRcdFx0XHR3aW5kb3cucmVxdWVzdEZpbGVTeXN0ZW0oTG9jYWxGaWxlU3lzdGVtLlBFUlNJU1RFTlQsIDAsIGdvdEZTLCBmYWlsKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXRjaCAoZSkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ1NhdmVGaWxlX0VycjogJyArIGUubWVzc2FnZSk7XHJcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xyXG5cdFx0XHRcdHRocm93KHtjb2RlOi0xNDAxLG1lc3NhZ2U6J3VuYWJsZSB0byBzYXZlIHJlcG9ydCBmaWxlJ30pO1xyXG5cdFx0XHR9XHRcdFx0XHJcblxyXG5cdFx0XHRmdW5jdGlvbiBnb3RGUyhmaWxlU3lzdGVtKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcignU2F2ZUZpbGU6IGdvdEZTIC0tPiBnZXRGaWxlJyk7XHJcblx0XHRcdFx0ZmlsZVN5c3RlbS5yb290LmdldEZpbGUoZmlsZU5hbWUsIHtjcmVhdGU6IHRydWUsIGV4Y2x1c2l2ZTogZmFsc2V9LCBnb3RGaWxlRW50cnksIGZhaWwpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmdW5jdGlvbiBnb3RGaWxlRW50cnkoZmlsZUVudHJ5KSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcignU2F2ZUZpbGU6IGdvdEZpbGVFbnRyeSAtLT4gKGZpbGVQYXRoKSAtLT4gY3JlYXRlV3JpdGVyJyk7XHJcblx0XHRcdFx0ZmlsZVBhdGggPSBmaWxlRW50cnkudG9VUkwoKTtcclxuXHRcdFx0XHRmaWxlRW50cnkuY3JlYXRlV3JpdGVyKGdvdEZpbGVXcml0ZXIsIGZhaWwpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmdW5jdGlvbiBnb3RGaWxlV3JpdGVyKHdyaXRlcikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ1NhdmVGaWxlOiBnb3RGaWxlV3JpdGVyIC0tPiB3cml0ZSAtLT4gb25Xcml0ZUVuZChyZXNvbHZlKScpO1xyXG5cdFx0XHRcdHdyaXRlci5vbndyaXRlZW5kID0gZnVuY3Rpb24oZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHR3cml0ZXIub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnd3JpdGVyIGVycm9yOiAnICsgZS50b1N0cmluZygpKTtcclxuXHRcdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdHdyaXRlci53cml0ZShwZGZCbG9iKTtcclxuXHRcdFx0fVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gZmFpbChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGVycm9yLmNvZGUpO1xyXG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlcnJvcik7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gdW5pcXVlRmlsZU5hbWUoZmlsZU5hbWUpe1xyXG5cdFx0XHR2YXIgbm93ID0gbmV3IERhdGUoKTtcclxuXHRcdFx0dmFyIHRpbWVzdGFtcCA9IG5vdy5nZXRGdWxsWWVhcigpLnRvU3RyaW5nKCk7XHJcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldE1vbnRoKCkgPCA5ID8gJzAnIDogJycpICsgbm93LmdldE1vbnRoKCkudG9TdHJpbmcoKTsgXHJcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldERhdGUoKSA8IDEwID8gJzAnIDogJycpICsgbm93LmdldERhdGUoKS50b1N0cmluZygpOyBcclxuXHRcdFx0dGltZXN0YW1wICs9IChub3cuZ2V0SG91cnMoKSA8IDEwID8gJzAnIDogJycpICsgbm93LmdldEhvdXJzKCkudG9TdHJpbmcoKTsgXHJcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldE1pbnV0ZXMoKSA8IDEwID8gJzAnIDogJycpICsgbm93LmdldE1pbnV0ZXMoKS50b1N0cmluZygpOyBcclxuXHRcdFx0dGltZXN0YW1wICs9IChub3cuZ2V0U2Vjb25kcygpIDwgMTAgPyAnMCcgOiAnJykgKyBub3cuZ2V0U2Vjb25kcygpLnRvU3RyaW5nKCk7XHJcblx0XHRcdHJldHVybiBmaWxlTmFtZS50b1VwcGVyQ2FzZSgpK1wiX1wiK3RpbWVzdGFtcDtcclxuXHRcdFxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydChwYXJhbSwgY2hhcnRUaXRsZSxmbG93bk1vbnRoLHRhYkluZGV4KSB7XHJcblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgdGl0bGUgPSBcIlwiO1xyXG5cdFx0XHRpZihwYXJhbSA9PSBcIm1ldHJpY1NuYXBzaG90XCIpXHJcblx0XHRcdFx0dGl0bGUgPSBcIk1FVFJJQyBTTkFQU0hPVCAtXCIrZmxvd25Nb250aCtcIiBcIitjaGFydFRpdGxlLnRvVXBwZXJDYXNlKCkrXCItIFZJRVdcIjtcclxuXHRcdFx0ZWxzZSBpZihwYXJhbSA9PSBcInRhcmdldEFjdHVhbFwiKVxyXG5cdFx0XHRcdHRpdGxlID0gXCJUQVJHRVQgVlMgQUNUVUFMIC0gXCIrKChjaGFydFRpdGxlID09IFwicmV2ZW51ZVwiKT9cIk5FVCBSRVZFTlVFXCI6XCJQQVggQ291bnRcIikrXCIgXCIrZmxvd25Nb250aCsgXCIgLSBWSUVXXCI7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHR0aXRsZSA9IGNoYXJ0VGl0bGUrXCIgXCIrZmxvd25Nb250aCtcIiAtIFZJRVdcIjtcclxuXHRcdFx0XHRcdFx0XHRcclxuXHRcdFx0dmFyIHN2Z05vZGUgPSBkMy5zZWxlY3RBbGwoXCIuXCIrcGFyYW0pLnNlbGVjdEFsbChcInN2Z1wiKTtcclxuXHRcdFx0dmFyIGNvbnRlbnQgPSBbXTtcclxuXHRcdFx0dmFyIGltYWdlQ29sdW1uID0gW107XHJcblx0XHRcdHZhciB0ZXh0Q29sdW1uID0gW107XHJcblx0XHRcdHZhciBpbWFnZXNPYmogPSB7fTtcclxuXHRcdFx0dmFyIHRleHRPYmogPSB7fTtcclxuXHRcdFx0Y29udGVudC5wdXNoKHRpdGxlKTtcclxuXHRcdFx0dmFyIG5vZGVFeGlzdHMgPSBbXTtcclxuXHRcdFx0YW5ndWxhci5mb3JFYWNoKHN2Z05vZGUsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBodG1sID0gXCJcIjtcclxuXHRcdFx0XHRpZihub2RlRXhpc3RzLmluZGV4T2Yoc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLWZsYWdcIikpID09IC0xICYmIHN2Z05vZGVba2V5XS5sZW5ndGggPj0gMSl7XHJcblx0XHRcdFx0XHRodG1sID0gc3ZnTm9kZVtrZXldWzBdLm91dGVySFRNTDtcclxuXHRcdFx0XHRcdGlmKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1wZGZGbGFnXCIpID09PSBcImR5bmFtaWNXSFwiKXtcclxuXHRcdFx0XHRcdFx0ZDMuc2VsZWN0KFwiLlwiK3BhcmFtK1wiRmxhZ1wiKS5zZWxlY3QoXCJzdmdcIikuYXR0cihcIndpZHRoXCIsMTUwMCk7XHJcblx0XHRcdFx0XHRcdGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpLmF0dHIoXCJoZWlnaHRcIiw2MDApO1xyXG5cdFx0XHRcdFx0XHR2YXIgbm9kZSA9IGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpO1xyXG5cdFx0XHRcdFx0XHRodG1sID0gbm9kZVswXVswXS5vdXRlckhUTUw7XHJcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDUwMDtcclxuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWydoZWlnaHQnXSA9IDUwMDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1wZGZGbGFnXCIpID09PSBcInBkZkZsYWdcIilcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWyd3aWR0aCddID0gNzUwO1xyXG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ2hlaWdodCddID0gMzAwO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Y2FudmcoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpLCBodG1sKTtcclxuXHRcdFx0XHRcdHZhciBjYW52YXNFbG0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XHJcblx0XHRcdFx0XHR2YXIgaW1nc3JjID0gY2FudmFzRWxtLnRvRGF0YVVSTCgpO1xyXG5cdFx0XHRcdFx0dmFyICB0ZXh0ID0gXCJcXG5cIitzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tdGl0bGVcIikrXCJcXG5cIjtcclxuXHRcdFx0XHRcdHRleHRPYmpbJ3RleHQnXSA9IHRleHQ7XHJcblx0XHRcdFx0XHR0ZXh0Q29sdW1uLnB1c2godGV4dE9iaik7XHJcblx0XHRcdFx0XHRpbWFnZXNPYmpbJ2ltYWdlJ10gPSBpbWdzcmM7XHJcblx0XHRcdFx0XHRpbWFnZUNvbHVtbi5wdXNoKGltYWdlc09iaik7XHRcdFx0XHRcclxuXHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxyXG5cdFx0XHRcdFx0dHh0VGVtcFsnY29sdW1ucyddID0gdGV4dENvbHVtbjtcclxuXHRcdFx0XHRcdGltZ1RlbXBbJ2FsaWdubWVudCddID0gJ2NlbnRlcic7XHJcblx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcclxuXHRcdFx0XHRcdGNvbnRlbnQucHVzaCh0eHRUZW1wKTtcclxuXHRcdFx0XHRcdGNvbnRlbnQucHVzaChpbWdUZW1wKTtcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xyXG5cdFx0XHRcdFx0dGV4dENvbHVtbiA9IFtdO1xyXG5cdFx0XHRcdFx0aW1hZ2VzT2JqID0ge307XHJcblx0XHRcdFx0XHR0ZXh0T2JqID0ge307XHJcblx0XHRcdFx0XHRpbWdUZW1wID0ge307XHJcblx0XHRcdFx0XHR0eHRUZW1wID17fTtcclxuXHRcdFx0XHRcdG5vZGVFeGlzdHMucHVzaChzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tZmxhZ1wiKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcdFx0XHRcclxuXHRcdFx0aWYocGFyYW0gPT0gXCJyZXZlbnVlQW5hbHlzaXNcIil7XHJcblx0XHRcdFx0dmFyIG5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5ldC1yZXZlbnVlLWNoYXJ0XCIpO1xyXG5cdFx0XHRcdHZhciBub2RlTGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ25ldC1yZXZlbnVlLXBkZicpO1xyXG5cdFx0XHRcdHZhciBub2RlRmxhZztcclxuXHRcdFx0XHRpZih0YWJJbmRleCA9PT0gMClcclxuXHRcdFx0XHRub2RlRmxhZyA9IG5vZGVMaXN0WzBdO1xyXG5cdFx0XHRcdGVsc2VcclxuXHRcdFx0XHRub2RlRmxhZyA9IG5vZGVMaXN0WzFdO1xyXG5cdFx0XHRcdGh0bWwyY2FudmFzKG5vZGVGbGFnKS50aGVuKGZ1bmN0aW9uKGNhbnZhcykge1xyXG5cdFx0XHRcdFx0dmFyIGMgPSBjYW52YXMudG9EYXRhVVJMKCk7XHJcblx0XHRcdFx0XHR2YXIgIHRleHQgPSBcIlxcblxcblxcblxcblxcblxcblxcblxcblxcblxcblxcblxcblwiK25vZGUuZ2V0QXR0cmlidXRlKCdkYXRhLWl0ZW0tdGl0bGUnKStcIlxcblxcblwiO1xyXG5cdFx0XHRcdFx0dGV4dE9ialsndGV4dCddID0gdGV4dDtcclxuXHRcdFx0XHRcdHRleHRDb2x1bW4ucHVzaCh0ZXh0T2JqKTtcclxuXHRcdFx0XHRcdGltYWdlc09ialsnaW1hZ2UnXSA9IGM7XHJcblx0XHRcdFx0XHRpbWFnZUNvbHVtbi5wdXNoKGltYWdlc09iaik7XHRcdFx0XHRcclxuXHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxyXG5cdFx0XHRcdFx0dHh0VGVtcFsnY29sdW1ucyddID0gdGV4dENvbHVtbjtcclxuXHRcdFx0XHRcdGltZ1RlbXBbJ2FsaWdubWVudCddID0gJ2NlbnRlcic7XHJcblx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcclxuXHRcdFx0XHRcdGNvbnRlbnQucHVzaCh0eHRUZW1wKTtcclxuXHRcdFx0XHRcdGNvbnRlbnQucHVzaChpbWdUZW1wKTtcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xyXG5cdFx0XHRcdFx0dGV4dENvbHVtbiA9IFtdO1xyXG5cdFx0XHRcdFx0aW1hZ2VzT2JqID0ge307XHJcblx0XHRcdFx0XHR0ZXh0T2JqID0ge307XHJcblx0XHRcdFx0XHRpbWdUZW1wID0ge307XHJcblx0XHRcdFx0XHR0eHRUZW1wID17fTtcdFxyXG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7Y29udGVudDogY29udGVudH0pO1xyXG5cdFx0XHRcdH0pO1x0XHRcdFx0XHJcblx0XHRcdH0gZWxzZSBpZihwYXJhbSA9PSBcInNlY3RvcmNhcnJpZXJhbmFseXNpc1wiKXtcclxuXHRcdFx0XHR2YXIgc3ZnTm9kZSA9IGQzLnNlbGVjdEFsbChcIi5cIitwYXJhbSk7XHJcblx0XHRcdFx0YW5ndWxhci5mb3JFYWNoKHN2Z05vZGVbMF0sIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcclxuXHRcdFx0XHRcdHZhciBub2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NlY3Rvci1jYXJyaWVyLWNoYXJ0JytrZXkpO1xyXG5cdFx0XHRcdFx0dmFyIGVsZUlEID0gJ3NlY3Rvci1jYXJyaWVyLWNoYXJ0JytrZXk7XHJcblx0XHRcdFx0XHRodG1sMmNhbnZhcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVJRCkpLnRoZW4oZnVuY3Rpb24oY2FudmFzKSB7XHJcblx0XHRcdFx0XHRcdHZhciBjID0gY2FudmFzLnRvRGF0YVVSTCgpO1xyXG5cdFx0XHRcdFx0XHR2YXIgIHRleHQgPSBcIlxcblxcblwiK25vZGUuZ2V0QXR0cmlidXRlKCdkYXRhLWl0ZW0tdGl0bGUnKStcIlxcblxcblwiO1xyXG5cdFx0XHRcdFx0XHR0ZXh0T2JqWyd0ZXh0J10gPSB0ZXh0O1xyXG5cdFx0XHRcdFx0XHR0ZXh0Q29sdW1uLnB1c2godGV4dE9iaik7XHJcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDUwMDtcclxuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWydpbWFnZSddID0gYztcclxuXHRcdFx0XHRcdFx0aW1hZ2VDb2x1bW4ucHVzaChpbWFnZXNPYmopO1x0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxyXG5cdFx0XHRcdFx0XHR0eHRUZW1wWydjb2x1bW5zJ10gPSB0ZXh0Q29sdW1uO1xyXG5cdFx0XHRcdFx0XHRpbWdUZW1wWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInO1xyXG5cdFx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcclxuXHRcdFx0XHRcdFx0Y29udGVudC5wdXNoKHR4dFRlbXApO1xyXG5cdFx0XHRcdFx0XHRjb250ZW50LnB1c2goaW1nVGVtcCk7XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xyXG5cdFx0XHRcdFx0XHR0ZXh0Q29sdW1uID0gW107XHJcblx0XHRcdFx0XHRcdGltYWdlc09iaiA9IHt9O1xyXG5cdFx0XHRcdFx0XHR0ZXh0T2JqID0ge307XHJcblx0XHRcdFx0XHRcdGltZ1RlbXAgPSB7fTtcclxuXHRcdFx0XHRcdFx0dHh0VGVtcCA9e307XHRcclxuXHRcdFx0XHRcdFx0aWYoa2V5ID09IHN2Z05vZGVbMF0ubGVuZ3RoLTEpe1xyXG5cdFx0XHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoe2NvbnRlbnQ6IGNvbnRlbnR9KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHRcdFx0XHRcdFxyXG5cdFx0XHRcdH0pO1x0XHRcclxuXHRcdFx0fWVsc2UgaWYocGFyYW0gPT0gXCJyb3V0ZXJldmVudWVcIil7XHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgZWxlSUQgPSAncm91dGUtcmV2ZW51ZS1wZGYnO1x0XHRcdFx0XHRcclxuXHRcdFx0XHRodG1sMmNhbnZhcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVJRCkpLnRoZW4oZnVuY3Rpb24oY2FudmFzKSB7XHJcblx0XHRcdFx0XHR2YXIgYyA9IGNhbnZhcy50b0RhdGFVUkwoKTtcclxuXHRcdFx0XHRcdHZhciAgdGV4dCA9IFwiXCI7XHJcblx0XHRcdFx0XHR0ZXh0T2JqWyd0ZXh0J10gPSB0ZXh0O1xyXG5cdFx0XHRcdFx0dGV4dENvbHVtbi5wdXNoKHRleHRPYmopO1xyXG5cdFx0XHRcdFx0aW1hZ2VzT2JqWyd3aWR0aCddID0gNTAwO1xyXG5cdFx0XHRcdFx0aW1hZ2VzT2JqWydpbWFnZSddID0gYztcclxuXHRcdFx0XHRcdGltYWdlQ29sdW1uLnB1c2goaW1hZ2VzT2JqKTtcdFx0XHRcdFxyXG5cdFx0XHRcdFx0dmFyIGltZ1RlbXAgPXt9LCB0eHRUZW1wID17fTtcdFx0XHJcblx0XHRcdFx0XHR0eHRUZW1wWydjb2x1bW5zJ10gPSB0ZXh0Q29sdW1uO1xyXG5cdFx0XHRcdFx0aW1nVGVtcFsnYWxpZ25tZW50J10gPSAnY2VudGVyJztcclxuXHRcdFx0XHRcdGltZ1RlbXBbJ2NvbHVtbnMnXSA9IGltYWdlQ29sdW1uO1xyXG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKHR4dFRlbXApO1xyXG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKGltZ1RlbXApO1x0XHRcdFx0XHRcclxuXHRcdFx0XHRcdGltYWdlQ29sdW1uID0gW107XHJcblx0XHRcdFx0XHR0ZXh0Q29sdW1uID0gW107XHJcblx0XHRcdFx0XHRpbWFnZXNPYmogPSB7fTtcclxuXHRcdFx0XHRcdHRleHRPYmogPSB7fTtcclxuXHRcdFx0XHRcdGltZ1RlbXAgPSB7fTtcclxuXHRcdFx0XHRcdHR4dFRlbXAgPXt9O1x0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7Y29udGVudDogY29udGVudH0pO1xyXG5cdFx0XHRcdH0pO1x0XHJcblx0XHRcdH1lbHNle1xyXG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoe2NvbnRlbnQ6IGNvbnRlbnR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdFx0fTtcclxuXHRcdFxyXG5cdCB9XHJcbiAgICBcclxufSkoKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
