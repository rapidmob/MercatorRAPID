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
                    content: 'No Data Found!!!'
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
                    content: 'No Data Found!!!'
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
                    content: 'No Data Found!!!'
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
                    content: 'No Data Found!!!'
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9saWJzLnRzIiwiY29tbW9uL3V0aWxzL1V0aWxzLnRzIiwiY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvQ29yZG92YVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvTmV0U2VydmljZS50cyIsImNvbW1vbi9zZXJ2aWNlcy9FcnJvckhhbmRsZXJTZXJ2aWNlLnRzIiwiY29tbW9uL3NlcnZpY2VzL0lTZXNzaW9uSHR0cFByb21pc2UuanMiLCJjb21tb24vc2VydmljZXMvU2Vzc2lvblNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1Jlc3BvbnNlLmpzIiwiY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHMiLCJjb21tb24vYXBwL0FwcENvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvc2VydmljZXMvT3BlcmF0aW9uYWxTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvTWlzQ29udHJvbGxlci50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL3VzZXIvTG9naW5Db250cm9sbGVyLnRzIiwiY29tbW9uL2NoYXJ0LWV2ZW50L0NoYXJ0RXZlbnQudHMiLCJhcHAudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1JlcXVlc3QuanMiLCJjb21wb25lbnRzL21pcy9wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvcmV2ZW51ZS1wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvcmVwb3J0QnVpbGRlclN2Yy50cyIsImNvbXBvbmVudHMvbWlzL3NlcnZpY2VzL3JlcG9ydFNlcnZpY2UudHMiXSwibmFtZXMiOlsiVXRpbHMiLCJVdGlscy5jb25zdHJ1Y3RvciIsIlV0aWxzLmlzTm90RW1wdHkiLCJVdGlscy5pc0xhbmRzY2FwZSIsIlV0aWxzLmdldFRvZGF5RGF0ZSIsIlV0aWxzLmlzSW50ZWdlciIsIkxvY2FsU3RvcmFnZVNlcnZpY2UiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTG9jYWxTdG9yYWdlU2VydmljZS5zZXQiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldCIsIkxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0T2JqZWN0IiwiTG9jYWxTdG9yYWdlU2VydmljZS5nZXRPYmplY3QiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmlzUmVjZW50RW50cnlBdmFpbGFibGUiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmFkZFJlY2VudEVudHJ5IiwiQ29yZG92YVNlcnZpY2UiLCJDb3Jkb3ZhU2VydmljZS5jb25zdHJ1Y3RvciIsIkNvcmRvdmFTZXJ2aWNlLmV4ZWMiLCJDb3Jkb3ZhU2VydmljZS5leGVjdXRlUGVuZGluZyIsIk5ldFNlcnZpY2UiLCJOZXRTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTmV0U2VydmljZS5nZXREYXRhIiwiTmV0U2VydmljZS5wb3N0RGF0YSIsIk5ldFNlcnZpY2UuZGVsZXRlRGF0YSIsIk5ldFNlcnZpY2UudXBsb2FkRmlsZSIsIk5ldFNlcnZpY2UuY2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkiLCJOZXRTZXJ2aWNlLnNlcnZlcklzQXZhaWxhYmxlIiwiTmV0U2VydmljZS5jYW5jZWxBbGxVcGxvYWREb3dubG9hZCIsIk5ldFNlcnZpY2UuYWRkTWV0YUluZm8iLCJlcnJvcmhhbmRsZXIiLCJFcnJvckhhbmRsZXJTZXJ2aWNlIiwiRXJyb3JIYW5kbGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkVycm9ySGFuZGxlclNlcnZpY2UudmFsaWRhdGVSZXNwb25zZSIsIkVycm9ySGFuZGxlclNlcnZpY2UuaXNOb1Jlc3VsdEZvdW5kIiwiRXJyb3JIYW5kbGVyU2VydmljZS5pc1Nlc3Npb25JbnZhbGlkIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNIYXJkRXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNTb2Z0RXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNFcnJvcnMiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc05vUmVzdWx0RXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0hhcmRFcnJvciIsIkVycm9ySGFuZGxlclNlcnZpY2UuaGFzU29mdEVycm9yIiwic2Vzc2lvbnNlcnZpY2UiLCJTZXNzaW9uU2VydmljZSIsIlNlc3Npb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiU2Vzc2lvblNlcnZpY2UucmVzb2x2ZVByb21pc2UiLCJTZXNzaW9uU2VydmljZS5hZGRBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyIiwiU2Vzc2lvblNlcnZpY2UucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lciIsIlNlc3Npb25TZXJ2aWNlLnNldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLnNldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLmNsZWFyTGlzdGVuZXJzIiwiU2Vzc2lvblNlcnZpY2UucmVmcmVzaFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkIiwiU2Vzc2lvblNlcnZpY2UuYWNjZXNzVG9rZW5SZWZyZXNoZWQiLCJkYXRhcHJvdmlkZXIiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlIiwiRGF0YVByb3ZpZGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkRhdGFQcm92aWRlclNlcnZpY2UuZ2V0RGF0YSIsIkRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmRlbGV0ZURhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiRGF0YVByb3ZpZGVyU2VydmljZS5hZGRNZXRhSW5mbyIsIkRhdGFQcm92aWRlclNlcnZpY2UuaXNMb2dvdXRTZXJ2aWNlIiwiQXBwQ29udHJvbGxlciIsIkFwcENvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJBcHBDb250cm9sbGVyLmlzTm90RW1wdHkiLCJBcHBDb250cm9sbGVyLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiQXBwQ29udHJvbGxlci5sb2dvdXQiLCJBcHBDb250cm9sbGVyLmdldFVzZXJEZWZhdWx0UGFnZSIsIkFwcENvbnRyb2xsZXIuc2hvd0Rhc2hib2FyZCIsIk1pc1NlcnZpY2UiLCJNaXNTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTWlzU2VydmljZS5nZXRNZXRyaWNTbmFwc2hvdCIsIk1pc1NlcnZpY2UuZ2V0VGFyZ2V0VnNBY3R1YWwiLCJNaXNTZXJ2aWNlLmdldFJldmVudWVBbmFseXNpcyIsIk1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlIiwiTWlzU2VydmljZS5nZXRTZWN0b3JDYXJyaWVyQW5hbHlzaXMiLCJNaXNTZXJ2aWNlLmdldFBheEZsb3duTWlzSGVhZGVyIiwiTWlzU2VydmljZS5nZXRSb3V0ZVJldmVudWVEcmlsbERvd24iLCJNaXNTZXJ2aWNlLmdldEJhckRyaWxsRG93biIsIk1pc1NlcnZpY2UuZ2V0RHJpbGxEb3duIiwiQ2hhcnRvcHRpb25TZXJ2aWNlIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLmxpbmVDaGFydE9wdGlvbnMiLCJDaGFydG9wdGlvblNlcnZpY2UubXVsdGlCYXJDaGFydE9wdGlvbnMiLCJDaGFydG9wdGlvblNlcnZpY2UubWV0cmljQmFyQ2hhcnRPcHRpb25zIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLnRhcmdldEJhckNoYXJ0T3B0aW9ucyIsIkZpbHRlcmVkTGlzdFNlcnZpY2UiLCJGaWx0ZXJlZExpc3RTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiRmlsdGVyZWRMaXN0U2VydmljZS5zZWFyY2hlZCIsIkZpbHRlcmVkTGlzdFNlcnZpY2UucGFnZWQiLCJzZWFyY2hVdGlsIiwiT3BlcmF0aW9uYWxTZXJ2aWNlIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldFBheEZsb3duT3BySGVhZGVyIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckZsaWdodFByb2NTdGF0dXMiLCJPcGVyYXRpb25hbFNlcnZpY2UuZ2V0T3ByRmxpZ2h0Q291bnRCeVJlYXNvbiIsIk9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJDb3Vwb25Db3VudEJ5RXhjZXB0aW9uIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldERyaWxsRG93biIsIlVzZXJTZXJ2aWNlIiwiVXNlclNlcnZpY2UuY29uc3RydWN0b3IiLCJVc2VyU2VydmljZS5zZXRVc2VyIiwiVXNlclNlcnZpY2UubG9nb3V0IiwiVXNlclNlcnZpY2UuaXNMb2dnZWRJbiIsIlVzZXJTZXJ2aWNlLmlzVXNlckxvZ2dlZEluIiwiVXNlclNlcnZpY2UuZ2V0VXNlciIsIlVzZXJTZXJ2aWNlLmxvZ2luIiwiVXNlclNlcnZpY2UuZ2V0VXNlclByb2ZpbGUiLCJVc2VyU2VydmljZS5zaG93RGFzaGJvYXJkIiwiTWlzQ29udHJvbGxlciIsIk1pc0NvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJNaXNDb250cm9sbGVyLmluaXREYXRhIiwiTWlzQ29udHJvbGxlci5nZXRQcm9maWxlVXNlck5hbWUiLCJNaXNDb250cm9sbGVyLnNlbGVjdGVkRmxvd25Nb250aCIsIk1pc0NvbnRyb2xsZXIub3BlbmluZm9Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jbG9zZVBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3Nlc0JhclBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3NlSW5mb1BvcG92ZXIiLCJNaXNDb250cm9sbGVyLnVwZGF0ZUhlYWRlciIsIk1pc0NvbnRyb2xsZXIub25TbGlkZU1vdmUiLCJNaXNDb250cm9sbGVyLnRvZ2dsZU1ldHJpYyIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlU3VyY2hhcmdlIiwiTWlzQ29udHJvbGxlci50b2dnbGVUYXJnZXQiLCJNaXNDb250cm9sbGVyLnRvZ2dsZVNlY3RvciIsIk1pc0NvbnRyb2xsZXIuY2FsbE1ldHJpY1NuYXBzaG90IiwiTWlzQ29udHJvbGxlci5jYWxsVGFyZ2V0VnNBY3R1YWwiLCJNaXNDb250cm9sbGVyLmNhbGxSb3V0ZVJldmVudWUiLCJNaXNDb250cm9sbGVyLmNhbGxSZXZlbnVlQW5hbHlzaXMiLCJNaXNDb250cm9sbGVyLm9wZW5EcmlsbERvd24iLCJNaXNDb250cm9sbGVyLmNsZWFyRHJpbGwiLCJNaXNDb250cm9sbGVyLmRyaWxsRG93blJlcXVlc3QiLCJNaXNDb250cm9sbGVyLmdldERyaWxsRG93blVSTCIsIk1pc0NvbnRyb2xsZXIub3BlbkJhckRyaWxsRG93biIsIk1pc0NvbnRyb2xsZXIuaW5pdGlhdGVBcnJheSIsIk1pc0NvbnRyb2xsZXIub3BlbkJhckRyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5UYXJnZXREcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5vcGVuUmV2ZW51ZURyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5SZXZlbnVlUGFzc2VuZ2VyRHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5TZWN0b3JQb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jYWxsU2VjdG9yQ2FycmllckFuYWx5c2lzIiwiTWlzQ29udHJvbGxlci50YXJnZXRBY3R1YWxGaWx0ZXIiLCJNaXNDb250cm9sbGVyLnNlY3RvckNhcnJpZXJGaWx0ZXIiLCJNaXNDb250cm9sbGVyLnJldmVudWVBbmFseXNpc0ZpbHRlciIsIk1pc0NvbnRyb2xsZXIuZ2V0Rmxvd25GYXZvcml0ZXMiLCJNaXNDb250cm9sbGVyLmlvbmljTG9hZGluZ1Nob3ciLCJNaXNDb250cm9sbGVyLmlvbmljTG9hZGluZ0hpZGUiLCJNaXNDb250cm9sbGVyLm9wZW5EcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jbG9zZXNQb3BvdmVyIiwiTWlzQ29udHJvbGxlci5pc0RyaWxsUm93U2VsZWN0ZWQiLCJNaXNDb250cm9sbGVyLnNlYXJjaFJlc3VsdHMiLCJNaXNDb250cm9sbGVyLnBhZ2luYXRpb24iLCJNaXNDb250cm9sbGVyLnNldFBhZ2UiLCJNaXNDb250cm9sbGVyLmxhc3RQYWdlIiwiTWlzQ29udHJvbGxlci5yZXNldEFsbCIsIk1pc0NvbnRyb2xsZXIuc29ydCIsIk1pc0NvbnRyb2xsZXIucmFuZ2UiLCJNaXNDb250cm9sbGVyLnRvZ2dsZUdyb3VwIiwiTWlzQ29udHJvbGxlci5pc0dyb3VwU2hvd24iLCJNaXNDb250cm9sbGVyLnRvZ2dsZUNoYXJ0T3JUYWJsZVZpZXciLCJNaXNDb250cm9sbGVyLnRvZ2dsZVRhcmdldFZpZXciLCJNaXNDb250cm9sbGVyLnRvZ2dsZVJldmVudWVWaWV3IiwiTWlzQ29udHJvbGxlci50b2dnbGVTZWN0b3JWaWV3IiwiTWlzQ29udHJvbGxlci5ydW5SZXBvcnQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNvbnN0cnVjdG9yIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaW5pdERhdGEiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5zZWxlY3RlZEZsb3duTW9udGgiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5nZXRQcm9maWxlVXNlck5hbWUiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci51cGRhdGVIZWFkZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vblNsaWRlTW92ZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNhbGxNeURhc2hib2FyZCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNhbGxGbGlnaHRQcm9jU3RhdHVzIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2FsbEZsaWdodENvdW50QnlSZWFzb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5Qb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlblBpZVBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jbG9zZVBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pb25pY0xvYWRpbmdTaG93IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuYXBwbHlDaGFydENvbG9yQ29kZXMiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5nZXRGYXZvcml0ZUl0ZW1zIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY29sb3JGdW5jdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmZvdXJCYXJDb2xvckZ1bmN0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbmluZm9Qb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2xvc2VJbmZvUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUNvdW50IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaW9uaWNMb2FkaW5nSGlkZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmxvY2tTbGlkZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLndlZWtEYXRhUHJldiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLndlZWtEYXRhTmV4dCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUZsaWdodFN0YXR1c1ZpZXciLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50b2dnbGVGbGlnaHRSZWFzb25WaWV3IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudG9nZ2xlQ0NFeGNlcHRpb25WaWV3IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIucnVuUmVwb3J0IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbkZsaWdodFByb2Nlc3NEcmlsbFBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vcGVuQ291bnBvbkNvdW50RHJpbGxQb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbkZsaWdodENvdW50RHJpbGxQb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuZHJpbGxEb3duUmVxdWVzdCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmdldERyaWxsRG93blVSTCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRhYlNsaWRlSGFzQ2hhbmdlZCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5EcmlsbERvd24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jbG9zZURyaWxsUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNsZWFyRHJpbGwiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pbml0aWF0ZUFycmF5IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaXNEcmlsbFJvd1NlbGVjdGVkIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuc2VhcmNoUmVzdWx0cyIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnBhZ2luYXRpb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5zZXRQYWdlIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIubGFzdFBhZ2UiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5yZXNldEFsbCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnNvcnQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5yYW5nZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUdyb3VwIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaXNHcm91cFNob3duIiwiTG9naW5Db250cm9sbGVyIiwiTG9naW5Db250cm9sbGVyLmNvbnN0cnVjdG9yIiwiTG9naW5Db250cm9sbGVyLmNsZWFyRXJyb3IiLCJMb2dpbkNvbnRyb2xsZXIuZG9Mb2dpbiIsIkNoYXJ0RXZlbnQiLCJDaGFydEV2ZW50LmNvbnN0cnVjdG9yIiwiQ2hhcnRFdmVudC5mYWN0b3J5IiwiQ2hhcnRFdmVudC5hcHBlbmRDbGljayIsInJlcG9ydEJ1aWxkZXJTZXJ2aWNlIiwicmVwb3J0QnVpbGRlclNlcnZpY2UuX2dlbmVyYXRlUmVwb3J0IiwicmVwb3J0U3ZjIiwicmVwb3J0U3ZjLl9ydW5SZXBvcnRBc3luYyIsInJlcG9ydFN2Yy5fcnVuUmVwb3J0RGF0YVVSTCIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERlZiIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERvYyIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydEJ1ZmZlciIsInJlcG9ydFN2Yy5nZXREYXRhVVJMIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0QmxvYiIsInJlcG9ydFN2Yy5zYXZlRmlsZSIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGUyIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGaWxlRW50cnkiLCJyZXBvcnRTdmMuc2F2ZUZpbGUuZ290RmlsZVdyaXRlciIsInJlcG9ydFN2Yy5zYXZlRmlsZS5mYWlsIiwicmVwb3J0U3ZjLnVuaXF1ZUZpbGVOYW1lIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0Il0sIm1hcHBpbmdzIjoiQUFBQSw0Q0FBNEM7QUFD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QSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNwS0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzlGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMxQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDekJBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2hDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUM3RkEsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDdENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUN0QkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDaENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNoR0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsZ0JBQWdCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNqQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDcERBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ3BLQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNoR0EsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDNUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ25HQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxjQUFjQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUMvQkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDbkNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ2hHQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMzQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDbEdBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO1FBQ2ZBLENBQUNBO0lBQ0hBLENBQUNBO0lBRURBLEVBQUVBLENBQUFBLENBQUNBLFNBQVNBLElBQUlBLGNBQWNBLENBQUNBLENBQUNBLENBQUNBO1FBQy9CQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNuQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDaEdBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzNDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNsR0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsVUFBVUEsSUFBSUEsU0FBU0EsSUFBSUEsaUJBQWlCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUM3REEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDakNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxJQUFJQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMzREEsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDcEtBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFD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V0FBV0EsRUFBRUEsU0FBU0E7YUFDekJBLENBQUNBO1FBQ05BLENBQUNBO1FBRURBLEVBQUVBLENBQUFBLENBQUNBLFNBQVNBLElBQUlBLFVBQVVBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pCQSxJQUFJQSxVQUFVQSxHQUFHQSxDQUFDQSxZQUFZQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUVwQ0EsSUFBSUEsVUFBVUEsQ0FBQ0E7WUFDZkEsSUFBSUEsYUFBYUEsQ0FBQ0E7WUFDbEJBLElBQUlBLFVBQVVBLENBQUNBO1lBQ2ZBLElBQUlBLFlBQVlBLENBQUNBO1lBQ2pCQSxJQUFJQSxZQUFZQSxDQUFDQTtZQUVqQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsVUFBVUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2pCQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDbEJBLFVBQVVBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLFVBQVVBLEdBQUdBLEVBQUVBLENBQUNBO2dCQUN0REEsYUFBYUEsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsV0FBV0EsR0FBR0EsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsR0FBR0EsRUFBRUEsQ0FBQ0E7Z0JBQ3BHQSxVQUFVQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQTtnQkFDOUNBLFlBQVlBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLFdBQVdBLEdBQUdBLEVBQUVBLENBQUNBO2dCQUMxREEsWUFBWUEsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsWUFBWUEs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QSxDQUFDQTtRQUM1QkEsNEJBQTRCQTtRQUM1QkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsSUFBSUEsQ0FBQ0EsYUFBYUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7UUFDOUdBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO0lBQzNCQSxDQUFDQTs7SUFDRDlDLDZCQUFLQSxHQUFMQSxVQUFNQSxLQUFLQSxFQUFFQSxLQUFLQTtRQUNkK0MsSUFBSUEsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0E7UUFDYkEsSUFBSUEsS0FBYUEsQ0FBQ0E7UUFDbEJBLEtBQUtBLEdBQUdBLENBQUNBLENBQUNBO1FBQ1ZBLEVBQUVBLENBQUFBLENBQUNBLEtBQUtBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ1hBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQ2hEQSxDQUFDQTtRQUNEQSxFQUFFQSxDQUFBQSxDQUFDQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNiQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNaQSxDQUFDQTtRQUNEQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNWQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxLQUFLQSxFQUFFQSxDQUFDQSxHQUFHQSxLQUFLQSxFQUFFQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQTtZQUNuQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FB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QTtJQUM5QkEsQ0FBQ0E7SUFDRDdDLHlDQUFJQSxHQUFKQSxVQUFLQSxNQUFNQSxFQUFFQSxLQUFLQSxFQUFFQSxLQUFLQTtRQUN2QjhDLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO1FBQ3JCQSxJQUFJQSxDQUFDQSxhQUFhQSxHQUFHQSxNQUFNQSxDQUFDQTtRQUM1QkEsNEJBQTRCQTtRQUM1QkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsSUFBSUEsQ0FBQ0EsYUFBYUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7UUFDOUdBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO0lBQ3pCQSxDQUFDQTs7SUFDRDlDLDBDQUFLQSxHQUFMQSxVQUFNQSxLQUFLQSxFQUFFQSxLQUFLQTtRQUNoQitDLElBQUlBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBO1FBQ2JBLElBQUlBLEtBQWFBLENBQUNBO1FBQ2xCQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNWQSxFQUFFQSxDQUFBQSxDQUFDQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNiQSxLQUFLQSxHQUFHQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUM5Q0EsQ0FBQ0E7UUFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDZEEsS0FBS0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDWkEsQ0FBQ0E7UUFDREEsSUFBSUEsQ0FBQ0EsR0FB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LENBQUNBO1lBQ3RDQSxDQUFDQTtZQUVEQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxPQUFPQSxDQUFDQTtRQUN6QkEsQ0FBQ0E7UUFBQWQsQ0FBQ0E7SUFFRkEsQ0FBQ0E7QUFFSCxDQUFDLENBQUMsRUFBRSxDQUFDIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9pb25pYy5kLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9TY3JlZW4uZC50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvSXNUYWJsZXQuZC50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvSW5BcHBCcm93c2VyLmQudHNcIiAvPiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5jbGFzcyBVdGlscyB7XHJcblx0cHVibGljIHN0YXRpYyBpc05vdEVtcHR5KC4uLnZhbHVlczogT2JqZWN0W10pOiBib29sZWFuIHtcclxuXHRcdHZhciBpc05vdEVtcHR5ID0gdHJ1ZTtcclxuXHRcdF8uZm9yRWFjaCh2YWx1ZXMsICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRpc05vdEVtcHR5ID0gaXNOb3RFbXB0eSAmJiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpICYmIHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSAnJ1xyXG5cdFx0XHRcdCYmICEoKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc09iamVjdCh2YWx1ZSkpICYmIF8uaXNFbXB0eSh2YWx1ZSkpICYmIHZhbHVlICE9IDApO1xyXG5cdFx0fSk7XHJcblx0XHRyZXR1cm4gaXNOb3RFbXB0eTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgaXNMYW5kc2NhcGUoKTogYm9vbGVhbiB7XHJcblx0XHR2YXIgaXNMYW5kc2NhcGU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRcdGlmICh3aW5kb3cgJiYgd2luZG93LnNjcmVlbiAmJiB3aW5kb3cuc2NyZWVuLm9yaWVudGF0aW9uKSB7XHJcblx0XHRcdHZhciB0eXBlOiBzdHJpbmcgPSA8c3RyaW5nPihfLmlzU3RyaW5nKHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24pID8gd2luZG93LnNjcmVlbi5vcmllbnRhdGlvbiA6IHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24udHlwZSk7XHJcblx0XHRcdGlmICh0eXBlKSB7XHJcblx0XHRcdFx0aXNMYW5kc2NhcGUgPSB0eXBlLmluZGV4T2YoJ2xhbmRzY2FwZScpID49IDA7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBpc0xhbmRzY2FwZTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgZ2V0VG9kYXlEYXRlKCk6IERhdGUge1xyXG5cdFx0dmFyIHRvZGF5RGF0ZSA9IG5ldyBEYXRlKCk7XHJcblx0XHR0b2RheURhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblx0XHRyZXR1cm4gdG9kYXlEYXRlO1xyXG5cdH1cclxuXHRwcml2YXRlIHN0YXRpYyBpc0ludGVnZXIobnVtYmVyOiBCaWdKc0xpYnJhcnkuQmlnSlMpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBwYXJzZUludChudW1iZXIudG9TdHJpbmcoKSkgPT0gK251bWJlcjtcclxuXHR9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuaW50ZXJmYWNlIFBvaW50T2JqZWN0IHtcclxuXHRjb2RlOiBzdHJpbmcsXHJcblx0ZGVzY3JpcHRpb246IHN0cmluZ1xyXG59XHJcblxyXG5pbnRlcmZhY2UgSUxvY2FsU3RvcmFnZVNlcnZpY2Uge1xyXG5cdHNldChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogc3RyaW5nKTogdm9pZDtcclxuXHRnZXQoa2V5SWQ6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBzdHJpbmcpOiBzdHJpbmc7XHJcblx0c2V0T2JqZWN0KGtleUlkOiBzdHJpbmcsIGtleXZhbHVlOiBhbnlbXSk6IHZvaWQ7XHJcblx0Z2V0T2JqZWN0KGtleUlkOiBzdHJpbmcpOiBhbnk7XHJcblx0aXNSZWNlbnRFbnRyeUF2YWlsYWJsZShvcmdpbk9iamVjdDogUG9pbnRPYmplY3QsIHR5cGU6IHN0cmluZyk6IHZvaWQ7XHJcblx0YWRkUmVjZW50RW50cnkoZGF0YTogYW55LCB0eXBlOiBzdHJpbmcpOiB2b2lkO1xyXG59XHJcblxyXG5jbGFzcyBMb2NhbFN0b3JhZ2VTZXJ2aWNlIGltcGxlbWVudHMgSUxvY2FsU3RvcmFnZVNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyR3aW5kb3cnXTtcclxuXHRwcml2YXRlIHJlY2VudEVudHJpZXM6IFtQb2ludE9iamVjdF07XHJcblxyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcclxuXHR9XHJcblxyXG5cdHNldChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogc3RyaW5nKTogdm9pZCB7XHJcblx0XHR0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSA9IGtleXZhbHVlO1xyXG5cdH1cclxuXHRnZXQoa2V5SWQ6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdIHx8IGRlZmF1bHRWYWx1ZTtcclxuXHR9XHJcblx0c2V0T2JqZWN0KGtleUlkOiBzdHJpbmcsIGtleXZhbHVlOiBhbnlbXSk6IHZvaWQge1xyXG5cdFx0dGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gPSAgSlNPTi5zdHJpbmdpZnkoa2V5dmFsdWUpO1xyXG5cdH1cclxuXHRnZXRPYmplY3Qoa2V5SWQ6IHN0cmluZyk6IGFueSB7XHJcblx0XHRyZXR1cm4gdGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gPyBKU09OLnBhcnNlKHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdKSA6IHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdGlzUmVjZW50RW50cnlBdmFpbGFibGUob3JnaW5PYmplY3Q6IFBvaW50T2JqZWN0LCB0eXBlOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMucmVjZW50RW50cmllcyA9IHRoaXMuZ2V0T2JqZWN0KHR5cGUpID8gdGhpcy5nZXRPYmplY3QodHlwZSkgOiBbXTtcclxuXHRcdHJldHVybiB0aGlzLnJlY2VudEVudHJpZXMuZmlsdGVyKGZ1bmN0aW9uIChlbnRyeSkgeyByZXR1cm4gZW50cnkuY29kZSA9PT0gb3JnaW5PYmplY3QuY29kZSB9KTtcclxuXHR9XHJcblxyXG5cdGFkZFJlY2VudEVudHJ5KGRhdGE6IGFueSwgdHlwZTogc3RyaW5nKSB7XHJcblx0XHR2YXIgb3JnaW5PYmplY3Q6IFBvaW50T2JqZWN0XHQ9XHRkYXRhID8gZGF0YS5vcmlnaW5hbE9iamVjdCA6IHVuZGVmaW5lZDtcclxuXHJcblx0XHRpZiAob3JnaW5PYmplY3QpIHtcclxuXHRcdFx0aWYgKHRoaXMuaXNSZWNlbnRFbnRyeUF2YWlsYWJsZShvcmdpbk9iamVjdCwgdHlwZSkubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0dGhpcy5yZWNlbnRFbnRyaWVzID0gdGhpcy5nZXRPYmplY3QodHlwZSkgPyB0aGlzLmdldE9iamVjdCh0eXBlKSA6IFtdO1xyXG5cdFx0XHRcdCh0aGlzLnJlY2VudEVudHJpZXMubGVuZ3RoID09IDMpID8gdGhpcy5yZWNlbnRFbnRyaWVzLnBvcCgpIDogdGhpcy5yZWNlbnRFbnRyaWVzO1xyXG5cdFx0XHRcdHRoaXMucmVjZW50RW50cmllcy51bnNoaWZ0KG9yZ2luT2JqZWN0KTtcclxuXHRcdFx0XHR0aGlzLnNldE9iamVjdCh0eXBlLCB0aGlzLnJlY2VudEVudHJpZXMpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5pbnRlcmZhY2UgSUNvcmRvdmFDYWxsIHtcclxuXHQoKTogdm9pZDtcclxufVxyXG5cclxuY2xhc3MgQ29yZG92YVNlcnZpY2Uge1xyXG5cclxuXHRwcml2YXRlIGNvcmRvdmFSZWFkeTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHByaXZhdGUgcGVuZGluZ0NhbGxzOiBJQ29yZG92YUNhbGxbXSA9IFtdO1xyXG5cclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZXJlYWR5JywgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmNvcmRvdmFSZWFkeSA9IHRydWU7XHJcblx0XHRcdHRoaXMuZXhlY3V0ZVBlbmRpbmcoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0ZXhlYyhmbjogSUNvcmRvdmFDYWxsLCBhbHRlcm5hdGl2ZUZuPzogSUNvcmRvdmFDYWxsKSB7XHJcblx0XHRpZiAodGhpcy5jb3Jkb3ZhUmVhZHkpIHtcclxuXHRcdFx0Zm4oKTtcclxuXHRcdH0gZWxzZSBpZiAoIWFsdGVybmF0aXZlRm4pIHtcclxuXHRcdFx0dGhpcy5wZW5kaW5nQ2FsbHMucHVzaChmbik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRhbHRlcm5hdGl2ZUZuKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGV4ZWN1dGVQZW5kaW5nKCkge1xyXG5cdFx0dGhpcy5wZW5kaW5nQ2FsbHMuZm9yRWFjaCgoZm4pID0+IHtcclxuXHRcdFx0Zm4oKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucGVuZGluZ0NhbGxzID0gW107XHJcblx0fVxyXG5cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi90eXBpbmdzL2FuZ3VsYXJqcy9hbmd1bGFyLmQudHNcIi8+XHJcblxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxyXG5cclxuaW50ZXJmYWNlIElOZXRTZXJ2aWNlIHtcclxuXHRnZXREYXRhKGZyb21Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xyXG5cdHBvc3REYXRhKHRvVXJsOiBzdHJpbmcsIGRhdGE6IGFueSk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xyXG5cdGRlbGV0ZURhdGEodG9Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xyXG5cdGNoZWNrU2VydmVyQXZhaWxhYmlsaXR5KCk6IG5nLklQcm9taXNlPGJvb2xlYW4+O1xyXG59XHJcblxyXG5jbGFzcyBOZXRTZXJ2aWNlIGltcGxlbWVudHMgSU5ldFNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRodHRwJywgJ0NvcmRvdmFTZXJ2aWNlJywgJyRxJywgJ1VSTF9XUycsICdPV05FUl9DQVJSSUVSX0NPREUnXTtcclxuXHRwcml2YXRlIGZpbGVUcmFuc2ZlcjogRmlsZVRyYW5zZmVyO1xyXG5cdHByaXZhdGUgaXNTZXJ2ZXJBdmFpbGFibGU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkaHR0cDogbmcuSUh0dHBTZXJ2aWNlLCBwcml2YXRlIGNvcmRvdmFTZXJ2aWNlOiBDb3Jkb3ZhU2VydmljZSwgcHJvdGVjdGVkICRxOiBuZy5JUVNlcnZpY2UsIHB1YmxpYyBVUkxfV1M6IHN0cmluZywgcHJpdmF0ZSBPV05FUl9DQVJSSUVSX0NPREU6IHN0cmluZykge1xyXG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy50aW1lb3V0ID0gNjAwMDA7XHJcblx0XHRjb3Jkb3ZhU2VydmljZS5leGVjKCgpID0+IHtcclxuXHRcdFx0Ly8gdGhpcy5maWxlVHJhbnNmZXIgPSBuZXcgRmlsZVRyYW5zZmVyKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGdldERhdGEoZnJvbVVybDogc3RyaW5nKTogbmcuSUh0dHBQcm9taXNlPGFueT4ge1xyXG5cdFx0dmFyIHVybDogc3RyaW5nID0gU0VSVkVSX1VSTCArIGZyb21Vcmw7XHJcblx0XHRyZXR1cm4gdGhpcy4kaHR0cC5nZXQodXJsKTtcclxuXHR9XHJcblxyXG5cdHBvc3REYXRhKHRvVXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcclxuXHRcdHJldHVybiB0aGlzLiRodHRwLnBvc3QoU0VSVkVSX1VSTCArIHRvVXJsLCB0aGlzLmFkZE1ldGFJbmZvKGRhdGEpKTtcclxuXHR9XHJcblxyXG5cdGRlbGV0ZURhdGEodG9Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcclxuXHRcdHJldHVybiB0aGlzLiRodHRwLmRlbGV0ZShTRVJWRVJfVVJMICsgdG9VcmwpO1xyXG5cdH1cclxuXHJcblx0dXBsb2FkRmlsZShcclxuXHRcdHRvVXJsOiBzdHJpbmcsIHVybEZpbGU6IHN0cmluZyxcclxuXHRcdG9wdGlvbnM6IEZpbGVVcGxvYWRPcHRpb25zLCBzdWNjZXNzQ2FsbGJhY2s6IChyZXN1bHQ6IEZpbGVVcGxvYWRSZXN1bHQpID0+IHZvaWQsXHJcblx0XHRlcnJvckNhbGxiYWNrOiAoZXJyb3I6IEZpbGVUcmFuc2ZlckVycm9yKSA9PiB2b2lkLCBwcm9ncmVzc0NhbGxiYWNrPzogKHByb2dyZXNzRXZlbnQ6IFByb2dyZXNzRXZlbnQpID0+IHZvaWQpIHtcclxuXHRcdGlmICghdGhpcy5maWxlVHJhbnNmZXIpIHtcclxuXHRcdFx0dGhpcy5maWxlVHJhbnNmZXIgPSBuZXcgRmlsZVRyYW5zZmVyKCk7XHJcblx0XHR9XHJcblx0XHRjb25zb2xlLmxvZyhvcHRpb25zLnBhcmFtcyk7XHJcblx0XHR0aGlzLmZpbGVUcmFuc2Zlci5vbnByb2dyZXNzID0gcHJvZ3Jlc3NDYWxsYmFjaztcclxuXHRcdHZhciB1cmw6IHN0cmluZyA9IFNFUlZFUl9VUkwgKyB0b1VybDtcclxuXHRcdHRoaXMuZmlsZVRyYW5zZmVyLnVwbG9hZCh1cmxGaWxlLCB1cmwsIHN1Y2Nlc3NDYWxsYmFjaywgZXJyb3JDYWxsYmFjaywgb3B0aW9ucyk7XHJcblx0fVxyXG5cclxuXHRjaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpOiBuZy5JUHJvbWlzZTxib29sZWFuPiB7XHJcblx0XHR2YXIgYXZhaWxhYmlsaXR5OiBib29sZWFuID0gdHJ1ZTtcclxuXHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8Ym9vbGVhbj4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblxyXG5cdFx0dGhpcy5jb3Jkb3ZhU2VydmljZS5leGVjKCgpID0+IHtcclxuXHRcdFx0aWYgKHdpbmRvdy5uYXZpZ2F0b3IpIHsgLy8gb24gZGV2aWNlXHJcblx0XHRcdFx0dmFyIG5hdmlnYXRvcjogTmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcclxuXHRcdFx0XHRpZiAobmF2aWdhdG9yLmNvbm5lY3Rpb24gJiYgKChuYXZpZ2F0b3IuY29ubmVjdGlvbi50eXBlID09IENvbm5lY3Rpb24uTk9ORSkgfHwgKG5hdmlnYXRvci5jb25uZWN0aW9uLnR5cGUgPT0gQ29ubmVjdGlvbi5VTktOT1dOKSkpIHtcclxuXHRcdFx0XHRcdGF2YWlsYWJpbGl0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRkZWYucmVzb2x2ZShhdmFpbGFiaWxpdHkpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0c2VydmVySXNBdmFpbGFibGUoKTogYm9vbGVhbiB7XHJcblx0XHR2YXIgdGhhdDogTmV0U2VydmljZSA9IHRoaXM7XHJcblxyXG5cdFx0dmFyIHNlcnZlcklzQXZhaWxhYmxlID0gdGhpcy5jaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpLnRoZW4oKHJlc3VsdDogYm9vbGVhbikgPT4ge1xyXG5cdFx0XHR0aGF0LmlzU2VydmVyQXZhaWxhYmxlID0gcmVzdWx0O1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuaXNTZXJ2ZXJBdmFpbGFibGU7XHJcblx0fVxyXG5cclxuXHRjYW5jZWxBbGxVcGxvYWREb3dubG9hZCgpIHtcclxuXHRcdGlmICh0aGlzLmZpbGVUcmFuc2Zlcikge1xyXG5cdFx0XHR0aGlzLmZpbGVUcmFuc2Zlci5hYm9ydCgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0YWRkTWV0YUluZm8ocmVxdWVzdERhdGE6IGFueSk6IGFueSB7XHJcblx0XHR2YXIgZGV2aWNlOiBJb25pYy5JRGV2aWNlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKClcclxuXHRcdHZhciBtb2RlbDogc3RyaW5nID0gJ2RldmljZSBJbmZvJztcclxuXHRcdHZhciBvc1R5cGU6IHN0cmluZyA9ICc4LjQnO1xyXG5cdFx0dmFyIG9zVmVyc2lvbjogc3RyaW5nID0gJ2lvcyc7XHJcblx0XHR2YXIgZGV2aWNlVG9rZW46IHN0cmluZyA9ICdzdHJpbmcnO1xyXG5cdFx0aWYgKGRldmljZSkge1xyXG5cdFx0XHRtb2RlbCA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLm1vZGVsO1xyXG5cdFx0XHRvc1R5cGUgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5wbGF0Zm9ybTtcclxuXHRcdFx0b3NWZXJzaW9uID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkudmVyc2lvbjtcclxuXHRcdH1cclxuXHRcdGlmICghbW9kZWwpIHtcclxuXHRcdFx0bW9kZWwgPSAnZGV2aWNlIEluZm8nO1x0XHJcblx0XHR9XHJcblx0XHRpZiAoIW9zVHlwZSkge1xyXG5cdFx0XHRvc1R5cGUgPSAnOC40JztcdFxyXG5cdFx0fVxyXG5cdFx0aWYgKCFvc1ZlcnNpb24pIHtcclxuXHRcdFx0b3NWZXJzaW9uID0gJ2lvcyc7XHRcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIG1ldGFJbmZvID0ge1xyXG5cdFx0XHQnY2hhbm5lbElkZW50aWZpZXInOiAnTU9CJyxcclxuXHRcdFx0J2RhdGVUaW1lU3RhbXAnOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcclxuXHRcdFx0J293bmVyQ2FycmllckNvZGUnOiB0aGlzLk9XTkVSX0NBUlJJRVJfQ09ERSxcclxuXHRcdFx0J2FkZGl0aW9uYWxJbmZvJzoge1xyXG5cdFx0XHRcdCdkZXZpY2VUeXBlJzogd2luZG93LmlzVGFibGV0ID8gJ1RhYmxldCcgOiAnUGhvbmUnLFxyXG5cdFx0XHRcdCdtb2RlbCc6IG1vZGVsLFxyXG5cdFx0XHRcdCdvc1R5cGUnOiBvc1R5cGUsXHJcblx0XHRcdFx0J29zVmVyc2lvbic6IG9zVmVyc2lvbixcclxuXHRcdFx0XHQnZGV2aWNlVG9rZW4nOiBkZXZpY2VUb2tlbixcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR2YXIgcmVxdWVzdE9iaiA9IHtcclxuXHRcdFx0J21ldGFJbmZvJzogbWV0YUluZm8sXHJcblx0XHRcdCdyZXF1ZXN0RGF0YSc6IHJlcXVlc3REYXRhXHJcblx0XHR9O1xyXG5cdFx0cmV0dXJuIHJlcXVlc3RPYmo7XHJcblx0fVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOZXRTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkNvcmRvdmFTZXJ2aWNlLnRzXCIgLz5cclxuXHJcbm1vZHVsZSBlcnJvcmhhbmRsZXIge1xyXG5cdGV4cG9ydCBjb25zdCBTVEFUVVNfRkFJTDogc3RyaW5nID0gJ2ZhaWwnO1xyXG5cdGV4cG9ydCBjb25zdCBTRVZFUklUWV9FUlJPUl9IQVJEOiBzdHJpbmcgPSAnSEFSRCc7XHJcblx0ZXhwb3J0IGNvbnN0IFNFVkVSSVRZX0VSUk9SX1NPRlQ6IHN0cmluZyA9ICdTT0ZUJztcclxuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT05fVE9LRU4gPSAnU0VDLjAyNSc7XHJcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OID0gJ1NFUy4wMDQnO1xyXG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX1RPS0VOX0VYUElSRUQgPSAnU0VDLjAzOCc7XHJcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfSU5WQUxJRF9VU0VSX1NFU1NJT05fRVhQSVJFRCA9ICdTRVMuMDAzJztcclxuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9OT19SRVNVTFQgPSAnQ09NLjExMSc7XHJcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfTk9fUk9VVEUgPSAnRkxULjAxMCc7XHJcbn1cclxuXHJcbmNsYXNzIEVycm9ySGFuZGxlclNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ05ldFNlcnZpY2UnLCAnQ29yZG92YVNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZSddO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgbmV0U2VydmljZTogTmV0U2VydmljZSwgcHJpdmF0ZSBjb3Jkb3ZhU2VydmljZTogQ29yZG92YVNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcclxuXHRcdHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVNjb3BlKSB7XHJcblx0fVxyXG5cclxuXHR2YWxpZGF0ZVJlc3BvbnNlKHJlc3BvbnNlOiBhbnkpIHtcclxuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcclxuXHRcdGlmICh0aGlzLmhhc0Vycm9ycyhlcnJvcnMpIHx8IGVycm9yaGFuZGxlci5TVEFUVVNfRkFJTCA9PSByZXNwb25zZS5zdGF0dXMpIHtcclxuXHRcdFx0aWYgKCF0aGlzLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IoZXJyb3JzKSAmJiAhdGhpcy5oYXNOb1Jlc3VsdEVycm9yKGVycm9ycykpIHtcclxuXHRcdFx0XHQvLyBicm9hZGNhc3QgdG8gYXBwY29udHJvbGxlciBzZXJ2ZXIgZXJyb3JcclxuXHRcdFx0XHR0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnc2VydmVyRXJyb3InLCByZXNwb25zZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGlzTm9SZXN1bHRGb3VuZChyZXNwb25zZTogYW55KTogYm9vbGVhbiB7XHJcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XHJcblx0XHRyZXR1cm4gdGhpcy5oYXNOb1Jlc3VsdEVycm9yKGVycm9ycyk7XHJcblx0fVxyXG5cclxuXHRpc1Nlc3Npb25JbnZhbGlkKHJlc3BvbnNlOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcclxuXHRcdHJldHVybiB0aGlzLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IoZXJyb3JzKTtcclxuXHR9XHJcblxyXG5cdGhhc0hhcmRFcnJvcnMocmVzcG9uc2U6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xyXG5cdFx0cmV0dXJuIHRoaXMuaGFzSGFyZEVycm9yKGVycm9ycyk7XHJcblx0fVxyXG5cclxuXHRoYXNTb2Z0RXJyb3JzKHJlc3BvbnNlOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcclxuXHRcdHJldHVybiB0aGlzLmhhc1NvZnRFcnJvcihlcnJvcnMpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYXNFcnJvcnMoZXJyb3JzOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBlcnJvcnMubGVuZ3RoID4gMDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFzSW52YWxpZFNlc3Npb25FcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XHJcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfSEFSRCA9PSBlcnJvci5zZXZlcml0eSAmJlxyXG5cdFx0XHQoZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OX1RPS0VOID09IGVycm9yLmNvZGUgfHxcclxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT04gPT0gZXJyb3IuY29kZSB8fFxyXG5cdFx0XHRcdGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX0lOVkFMSURfVVNFUl9TRVNTSU9OX0VYUElSRUQgPT0gZXJyb3IuY29kZSB8fFxyXG5cdFx0XHRcdGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX1RPS0VOX0VYUElSRUQgPT0gZXJyb3IuY29kZSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFzTm9SZXN1bHRFcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XHJcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfSEFSRCA9PSBlcnJvci5zZXZlcml0eSAmJlxyXG5cdFx0XHQoZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfTk9fUkVTVUxUID09IGVycm9yLmNvZGUgfHxcclxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9OT19ST1VURSA9PSBlcnJvci5jb2RlKTtcclxuXHRcdH0pICYmIGVycm9ycy5sZW5ndGggPT0gMTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFzSGFyZEVycm9yKGVycm9yczogYW55KTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gXy5zb21lKGVycm9ycywgKGVycm9yOiBhbnkpID0+IHtcclxuXHRcdFx0cmV0dXJuIGVycm9yICYmIGVycm9yaGFuZGxlci5TRVZFUklUWV9FUlJPUl9IQVJEID09IGVycm9yLnNldmVyaXR5O1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhc1NvZnRFcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XHJcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfU09GVCA9PSBlcnJvci5zZXZlcml0eTtcclxuXHRcdH0pO1xyXG5cdH1cclxufSIsbnVsbCwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOZXRTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkNvcmRvdmFTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkVycm9ySGFuZGxlclNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiSVNlc3Npb25IdHRwUHJvbWlzZS50c1wiIC8+XHJcblxyXG5tb2R1bGUgc2Vzc2lvbnNlcnZpY2Uge1xyXG5cdGV4cG9ydCBjb25zdCBIRUFERVJfUkVGUkVTSF9UT0tFTl9LRVk6IHN0cmluZyA9ICd4LXJlZnJlc2gtdG9rZW4nO1xyXG5cdGV4cG9ydCBjb25zdCBIRUFERVJfQUNDRVNTX1RPS0VOX0tFWTogc3RyaW5nID0gJ3gtYWNjZXNzLXRva2VuJztcclxuXHRleHBvcnQgY29uc3QgUkVGUkVTSF9TRVNTSU9OX0lEX1VSTDogc3RyaW5nID0gJy91c2VyL2dldEFjY2Vzc1Rva2VuJztcclxufVxyXG5cclxuY2xhc3MgU2Vzc2lvblNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ05ldFNlcnZpY2UnLCAnRXJyb3JIYW5kbGVyU2VydmljZScsICckcScsICckcm9vdFNjb3BlJywgJyRodHRwJ107XHJcblxyXG5cdHByaXZhdGUgYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXM6IElBY2Nlc3NUb2tlblJlZnJlc2hlZEhhbmRsZXJbXTtcclxuXHRwcml2YXRlIHNlc3Npb25JZDogc3RyaW5nO1xyXG5cdHByaXZhdGUgY3JlZGVudGlhbElkOiBzdHJpbmc7XHJcblx0cHJpdmF0ZSBpc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBuZXRTZXJ2aWNlOiBOZXRTZXJ2aWNlLCBwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcclxuXHRcdHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVNjb3BlLCBwcml2YXRlICRodHRwOiBuZy5JSHR0cFNlcnZpY2UpIHtcclxuXHRcdHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMgPSBbXTtcclxuXHRcdHRoaXMuc2Vzc2lvbklkID0gbnVsbDtcclxuXHRcdHRoaXMuY3JlZGVudGlhbElkID0gbnVsbDtcclxuXHR9XHJcblxyXG5cdHJlc29sdmVQcm9taXNlKHByb21pc2U6IElTZXNzaW9uSHR0cFByb21pc2UpIHtcclxuXHRcdHByb21pc2UucmVzcG9uc2UudGhlbigocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0aWYgKCF0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaGFzSGFyZEVycm9ycyhyZXNwb25zZSkgfHwgdGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmlzU2Vzc2lvbkludmFsaWQocmVzcG9uc2UpKSB7XHJcblx0XHRcdFx0aWYgKCF0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaXNTZXNzaW9uSW52YWxpZChyZXNwb25zZSkpIHtcclxuXHRcdFx0XHRcdHByb21pc2UuZGVmZmVyZWQucmVzb2x2ZShwcm9taXNlLnJlc3BvbnNlKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdzZXNzaW9uIGlzIHZhbGlkJyk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMuYWRkQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihwcm9taXNlKTtcclxuXHRcdFx0XHRcdGlmICghdGhpcy5pc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZWZyZXNoaW5nIHNlc3Npb24gdG9rZW4nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5yZWZyZXNoU2Vzc2lvbklkKCkudGhlbihcclxuXHRcdFx0XHRcdFx0XHQodG9rZW5SZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuZXJyb3JIYW5kbGVyU2VydmljZS5oYXNIYXJkRXJyb3JzKHRva2VuUmVzcG9uc2UpKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuc2V0U2Vzc2lvbklkKG51bGwpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHJlc3BvbnNlSGVhZGVyID0gdG9rZW5SZXNwb25zZS5oZWFkZXJzKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHZhciBhY2Nlc3NUb2tlbjogc3RyaW5nID0gcmVzcG9uc2VIZWFkZXJbc2Vzc2lvbnNlcnZpY2UuSEVBREVSX0FDQ0VTU19UT0tFTl9LRVldO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnNldFNlc3Npb25JZChhY2Nlc3NUb2tlbik7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmlzUmVmcmVzaFNlc3Npb25JZEluUHJvZ3Jlc3MgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICghdGhpcy5nZXRTZXNzaW9uSWQoKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdlcnJvciBvbiBhY2Nlc3MgdG9rZW4gcmVmcmVzaCcpO1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRTZXNzaW9uSWQobnVsbCk7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5nZXRDcmVkZW50aWFsSWQoKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRwcm9taXNlLmRlZmZlcmVkLnJlamVjdCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5pc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHByb21pc2UuZGVmZmVyZWQucmVqZWN0KCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0YWRkQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lcjogSUFjY2Vzc1Rva2VuUmVmcmVzaGVkSGFuZGxlcikge1xyXG5cdFx0dGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcy5wdXNoKGxpc3RlbmVyKTtcclxuXHR9XHJcblxyXG5cdHJlbW92ZUFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzdGVuZXIobGlzdGVuZXJUb1JlbW92ZTogSUFjY2Vzc1Rva2VuUmVmcmVzaGVkSGFuZGxlcikge1xyXG5cdFx0Xy5yZW1vdmUodGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcywgKGxpc3RlbmVyKSA9PiB7XHJcblx0XHRcdHJldHVybiBsaXN0ZW5lciA9PSBsaXN0ZW5lclRvUmVtb3ZlO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRzZXRDcmVkZW50aWFsSWQoY3JlZElkOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMuY3JlZGVudGlhbElkID0gY3JlZElkO1xyXG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vbltzZXNzaW9uc2VydmljZS5IRUFERVJfUkVGUkVTSF9UT0tFTl9LRVldID0gY3JlZElkO1xyXG5cdH1cclxuXHJcblx0c2V0U2Vzc2lvbklkKHNlc3Npb25JZDogc3RyaW5nKSB7XHJcblx0XHR0aGlzLnNlc3Npb25JZCA9IHNlc3Npb25JZDtcclxuXHRcdHRoaXMuJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bc2Vzc2lvbnNlcnZpY2UuSEVBREVSX0FDQ0VTU19UT0tFTl9LRVldID0gc2Vzc2lvbklkO1xyXG5cdH1cclxuXHJcblx0Z2V0U2Vzc2lvbklkKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gdGhpcy5zZXNzaW9uSWQgPyB0aGlzLnNlc3Npb25JZCA6IG51bGw7XHJcblx0fVxyXG5cclxuXHRnZXRDcmVkZW50aWFsSWQoKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiB0aGlzLmNyZWRlbnRpYWxJZCA/IHRoaXMuY3JlZGVudGlhbElkIDogbnVsbDtcclxuXHR9XHJcblxyXG5cdGNsZWFyTGlzdGVuZXJzKCkge1xyXG5cdFx0dGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcyA9IFtdO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZWZyZXNoU2Vzc2lvbklkKCk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcclxuXHRcdHRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcyA9IHRydWU7XHJcblx0XHR2YXIgYWNjZXNzVG9rZW5SZXF1ZXN0OiBhbnkgPSB7XHJcblx0XHRcdHJlZnJlc2hUb2tlbjogdGhpcy5jcmVkZW50aWFsSWRcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLm5ldFNlcnZpY2UucG9zdERhdGEoc2Vzc2lvbnNlcnZpY2UuUkVGUkVTSF9TRVNTSU9OX0lEX1VSTCwgYWNjZXNzVG9rZW5SZXF1ZXN0KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYWNjZXNzVG9rZW5Ob3RSZWZyZXNoZWQoKSB7XHJcblx0XHRfLmZvckVhY2godGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcywgKGxpc3RlbmVyKSA9PiB7XHJcblx0XHRcdGlmIChsaXN0ZW5lci5vblRva2VuRmFpbGVkKSB7XHJcblx0XHRcdFx0bGlzdGVuZXIub25Ub2tlbkZhaWxlZChsaXN0ZW5lcik7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5yZW1vdmVBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKGxpc3RlbmVyKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhY2Nlc3NUb2tlblJlZnJlc2hlZCgpIHtcclxuXHRcdF8uZm9yRWFjaCh0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLCAobGlzdGVuZXIpID0+IHtcclxuXHRcdFx0aWYgKGxpc3RlbmVyKSB7XHJcblx0XHRcdFx0aWYgKGxpc3RlbmVyLm9uVG9rZW5SZWZyZXNoZWQpIHtcclxuXHRcdFx0XHRcdGxpc3RlbmVyLm9uVG9rZW5SZWZyZXNoZWQobGlzdGVuZXIpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkobGlzdGVuZXIpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ0xlbmd0aCA9ICcsIHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMubGVuZ3RoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLnJlbW92ZUFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzdGVuZXIobGlzdGVuZXIpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59IixudWxsLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk5ldFNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiU2Vzc2lvblNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiRXJyb3JIYW5kbGVyU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJJU2Vzc2lvbkh0dHBQcm9taXNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkdlbmVyaWNSZXNwb25zZS50c1wiIC8+XHJcblxyXG5tb2R1bGUgZGF0YXByb3ZpZGVyIHtcclxuXHRleHBvcnQgY29uc3QgU0VSVklDRV9VUkxfTE9HT1VUID0gJy91c2VyL2xvZ291dCc7XHJcbn1cclxuXHJcbmNsYXNzIERhdGFQcm92aWRlclNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ05ldFNlcnZpY2UnLCAnQ29yZG92YVNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZScsICdFcnJvckhhbmRsZXJTZXJ2aWNlJywgJ1Nlc3Npb25TZXJ2aWNlJywgJ09XTkVSX0NBUlJJRVJfQ09ERSddO1xyXG5cclxuXHRwcml2YXRlIGlzQ29ubmVjdGVkVG9OZXR3b3JrOiBib29sZWFuID0gdHJ1ZTtcclxuXHRwcml2YXRlIG5hdmlnYXRvcjogTmF2aWdhdG9yO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgbmV0U2VydmljZTogTmV0U2VydmljZSwgcHJpdmF0ZSBjb3Jkb3ZhU2VydmljZTogQ29yZG92YVNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcclxuXHRcdHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVNjb3BlLCBwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UsXHJcblx0XHRwcml2YXRlIHNlc3Npb25TZXJ2aWNlOiBTZXNzaW9uU2VydmljZSwgcHJpdmF0ZSBPV05FUl9DQVJSSUVSX0NPREU6IHN0cmluZykge1xyXG5cclxuXHRcdHRoaXMuY29yZG92YVNlcnZpY2UuZXhlYygoKSA9PiB7XHJcblx0XHRcdGlmICh3aW5kb3cuY29yZG92YSAmJiB3aW5kb3cuZG9jdW1lbnQpIHsgLy8gb24gZGV2aWNlXHJcblx0XHRcdFx0bmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcclxuXHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrID0gbmF2aWdhdG9yLm9uTGluZTtcclxuXHRcdFx0XHR3aW5kb3cuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcclxuXHRcdFx0XHRcdCdvbmxpbmUnLFxyXG5cdFx0XHRcdFx0KCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygndXNlciBvbmxpbmUnKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5pc0Nvbm5lY3RlZFRvTmV0d29yayA9IHRydWU7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0ZmFsc2UpO1xyXG5cdFx0XHRcdHdpbmRvdy5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFxyXG5cdFx0XHRcdFx0J29mZmxpbmUnLFxyXG5cdFx0XHRcdFx0KCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygndXNlciBvZmZsaW5lJyk7XHJcblx0XHRcdFx0XHRcdHRoaXMuaXNDb25uZWN0ZWRUb05ldHdvcmsgPSBmYWxzZTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRmYWxzZSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Z2V0RGF0YShyZXE6IHN0cmluZyk6IG5nLklQcm9taXNlPGFueT4ge1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblxyXG5cdFx0aWYgKHRoaXMuaGFzTmV0d29ya0Nvbm5lY3Rpb24oKSkge1xyXG5cdFx0XHRkZWYucmVzb2x2ZSh0aGlzLm5ldFNlcnZpY2UuZ2V0RGF0YShyZXEpKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdTZXJ2ZXIgdW5hdmFpbGFibGUnKTtcclxuXHRcdFx0Ly8gdGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ25vTmV0d29yaycpO1xyXG5cdFx0XHRkZWYucmVqZWN0KCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0cG9zdERhdGEocmVxOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyk6IG5nLklQcm9taXNlPGFueT4ge1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblxyXG5cdFx0dmFyIHJlc3BvbnNlOiBuZy5JUHJvbWlzZTxhbnk+ID0gdGhpcy5uZXRTZXJ2aWNlLnBvc3REYXRhKHJlcSwgZGF0YSwgY29uZmlnKTtcclxuXHJcblx0XHRpZiAodGhpcy5oYXNOZXR3b3JrQ29ubmVjdGlvbigpKSB7XHJcblx0XHRcdHJlc3BvbnNlLnRoZW4oXHJcblx0XHRcdChodHRwUmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHRkZWYucmVzb2x2ZShodHRwUmVzcG9uc2UpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XHJcblx0XHRcdFx0Ly8gYnJvYWRjYXN0IHNlcnZlciBpcyB1bmF2YWlsYWJsZVxyXG5cdFx0XHRcdHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdzZXJ2ZXJOb3RBdmFpbGFibGUnKTtcclxuXHRcdFx0XHRkZWYucmVqZWN0KCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0ZGVmLnJlamVjdCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGRlbGV0ZURhdGEocmVxOiBzdHJpbmcpOiBuZy5JUHJvbWlzZTxhbnk+IHtcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cclxuXHRcdGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcclxuXHRcdFx0ZGVmLnJlc29sdmUodGhpcy5uZXRTZXJ2aWNlLmRlbGV0ZURhdGEocmVxKSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XHJcblx0XHRcdGRlZi5yZWplY3QoKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRoYXNOZXR3b3JrQ29ubmVjdGlvbigpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiAobmF2aWdhdG9yLm9uTGluZSB8fCB0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrKTtcclxuXHR9XHJcblxyXG5cclxuXHQvLyBUT0RPOiByZW1vdmUgdGhpcyB0ZW1wIG1ldGhvZCBhbmQgdXNlIGdlbmVyaWNzXHJcblx0YWRkTWV0YUluZm8ocmVxdWVzdERhdGE6IGFueSk6IGFueSB7XHJcblx0XHR2YXIgZGV2aWNlOiBJb25pYy5JRGV2aWNlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKClcclxuXHRcdHZhciBtb2RlbDogc3RyaW5nID0gJyc7XHJcblx0XHR2YXIgb3NUeXBlOiBzdHJpbmcgPSAnJztcclxuXHRcdHZhciBvc1ZlcnNpb246IHN0cmluZyA9ICcnO1xyXG5cdFx0dmFyIGRldmljZVRva2VuOiBzdHJpbmcgPSAnJztcclxuXHRcdGlmIChkZXZpY2UpIHtcclxuXHRcdFx0bW9kZWwgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5tb2RlbDtcclxuXHRcdFx0b3NUeXBlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkucGxhdGZvcm07XHJcblx0XHRcdG9zVmVyc2lvbiA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLnZlcnNpb247XHJcblx0XHR9XHJcblx0XHR2YXIgbWV0YUluZm8gPSB7XHJcblx0XHRcdCdjaGFubmVsSWRlbnRpZmllcic6ICdNT0InLFxyXG5cdFx0XHQnZGF0ZVRpbWVTdGFtcCc6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG5cdFx0XHQnb3duZXJDYXJyaWVyQ29kZSc6IHRoaXMuT1dORVJfQ0FSUklFUl9DT0RFLFxyXG5cdFx0XHQnYWRkaXRpb25hbEluZm8nOiB7XHJcblx0XHRcdFx0J2RldmljZVR5cGUnOiB3aW5kb3cuaXNUYWJsZXQgPyAnVGFibGV0JyA6ICdQaG9uZScsXHJcblx0XHRcdFx0J21vZGVsJzogbW9kZWwsXHJcblx0XHRcdFx0J29zVHlwZSc6IG9zVHlwZSxcclxuXHRcdFx0XHQnb3NWZXJzaW9uJzogb3NWZXJzaW9uLFxyXG5cdFx0XHRcdCdkZXZpY2VUb2tlbic6IGRldmljZVRva2VuLFxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xyXG5cdFx0XHQnbWV0YUluZm8nOiBtZXRhSW5mbyxcclxuXHRcdFx0J3JlcXVlc3REYXRhJzogcmVxdWVzdERhdGFcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gcmVxdWVzdE9iajtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaXNMb2dvdXRTZXJ2aWNlKHJlcXVlc3RVcmw6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIGRhdGFwcm92aWRlci5TRVJWSUNFX1VSTF9MT0dPVVQgPT0gcmVxdWVzdFVybDtcclxuXHR9XHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi91dGlscy9VdGlscy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvTG9jYWxTdG9yYWdlU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvRXJyb3JIYW5kbGVyU2VydmljZS50c1wiIC8+XHJcblxyXG5jbGFzcyBBcHBDb250cm9sbGVyIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckc3RhdGUnLCAnJHNjb3BlJywgJ0RhdGFQcm92aWRlclNlcnZpY2UnLCAnVXNlclNlcnZpY2UnLFxyXG5cdFx0JyRpb25pY1BsYXRmb3JtJywgJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCAnJGlvbmljUG9wdXAnLFxyXG5cdFx0JyRpb25pY0xvYWRpbmcnLCAnJGlvbmljSGlzdG9yeScsICdFcnJvckhhbmRsZXJTZXJ2aWNlJ107XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJvdGVjdGVkICRzdGF0ZTogYW5ndWxhci51aS5JU3RhdGVTZXJ2aWNlLFxyXG5cdFx0cHJvdGVjdGVkICRzY29wZTogbmcuSVNjb3BlLFxyXG5cdFx0cHJvdGVjdGVkIGRhdGFQcm92aWRlclNlcnZpY2U6IERhdGFQcm92aWRlclNlcnZpY2UsXHJcblx0XHRwcml2YXRlIHVzZXJTZXJ2aWNlOiBVc2VyU2VydmljZSxcclxuXHRcdHByaXZhdGUgJGlvbmljUGxhdGZvcm06IElvbmljLklQbGF0Zm9ybSxcclxuXHRcdHByaXZhdGUgbG9jYWxTdG9yYWdlU2VydmljZTogTG9jYWxTdG9yYWdlU2VydmljZSxcclxuXHRcdHByaXZhdGUgJGlvbmljUG9wdXA6IElvbmljLklQb3B1cCxcclxuXHRcdHByaXZhdGUgJGlvbmljTG9hZGluZzogSW9uaWMuSUxvYWRpbmcsXHJcblx0XHRwcml2YXRlICRpb25pY0hpc3Rvcnk6IGFueSxcclxuXHRcdHByaXZhdGUgZXJyb3JIYW5kbGVyU2VydmljZTogRXJyb3JIYW5kbGVyU2VydmljZSkge1xyXG5cdH1cclxuXHJcblx0aXNOb3RFbXB0eSh2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gVXRpbHMuaXNOb3RFbXB0eSh2YWx1ZSk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgaGFzTmV0d29ya0Nvbm5lY3Rpb24oKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gdGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLmhhc05ldHdvcmtDb25uZWN0aW9uKCk7XHJcblx0fVxyXG5cclxuXHRsb2dvdXQoKSB7XHJcblx0XHR0aGlzLiRpb25pY0hpc3RvcnkuY2xlYXJDYWNoZSgpO1xyXG5cdFx0dGhpcy51c2VyU2VydmljZS5sb2dvdXQoKTtcclxuXHRcdHRoaXMuJHN0YXRlLmdvKFwibG9naW5cIik7XHJcblx0fVxyXG5cclxuXHRnZXRVc2VyRGVmYXVsdFBhZ2UoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy51c2VyU2VydmljZS51c2VyUHJvZmlsZS51c2VySW5mby5kZWZhdWx0UGFnZTtcclxuXHR9XHJcblxyXG5cdHNob3dEYXNoYm9hcmQobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gdGhpcy51c2VyU2VydmljZS5zaG93RGFzaGJvYXJkKG5hbWUpO1xyXG5cdH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XHJcblxyXG5jbGFzcyBNaXNTZXJ2aWNlIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJyRxJ107XHJcblx0cHJpdmF0ZSBzZXJ2ZXJSZXF1ZXN0OiBudW1iZXI7XHJcblxyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlKSB7IH1cclxuXHJcblx0Z2V0TWV0cmljU25hcHNob3QgKHJlcWRhdGEpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL21ldHJpY3NuYXBzaG90JztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdH0sXHJcblx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldFRhcmdldFZzQWN0dWFsIChyZXFkYXRhKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy90YXJnZXR2c2FjdHVhbCc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRSZXZlbnVlQW5hbHlzaXMgKHJlcWRhdGEpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3JldmVudWVhbmFseXNpcyc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRSb3V0ZVJldmVudWUgKHJlcWRhdGEpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3JvdXRlcmV2ZW51ZSc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRTZWN0b3JDYXJyaWVyQW5hbHlzaXMgKHJlcWRhdGEpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3NlY3RvcmNhcnJpZXJhbmFseXNpcyc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRQYXhGbG93bk1pc0hlYWRlciAocmVxZGF0YSk6IGFueSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvcGF4Zmxvd25taXNoZWFkZXInO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0Um91dGVSZXZlbnVlRHJpbGxEb3duIChyZXFkYXRhKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9yb3V0ZXJldmVudWVkcmlsbCc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRCYXJEcmlsbERvd24gKHJlcWRhdGEpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL21zcGF4bmV0cmV2ZHJpbGwnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0RHJpbGxEb3duIChyZXFkYXRhLCBVUkwpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9IFVSTDtcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0aWYoIXRoaXMuc2VydmVyUmVxdWVzdCl7XHJcblx0XHRcdHRoaXMuc2VydmVyUmVxdWVzdCA9IDE7XHJcblx0XHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHRcdFx0dGhpcy5zZXJ2ZXJSZXF1ZXN0ID0gMDtcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5jbGFzcyBDaGFydG9wdGlvblNlcnZpY2Uge1xyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHJvb3RTY29wZSddO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCRyb290U2NvcGU6IG5nLklTY29wZSkgeyB9XHJcblxyXG4gICAgbGluZUNoYXJ0T3B0aW9ucygpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjaGFydDoge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2xpbmVDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IDUsXHJcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDUwLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogNTBcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXsgcmV0dXJuIGQueHZhbDsgfSxcclxuICAgICAgICAgICAgICAgIHk6IGZ1bmN0aW9uKGQpeyByZXR1cm4gZC55dmFsOyB9LFxyXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkaXNwYXRjaDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlQ2hhbmdlOiBmdW5jdGlvbihlKXsgY29uc29sZS5sb2coXCJzdGF0ZUNoYW5nZVwiKTsgfSxcclxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VTdGF0ZTogZnVuY3Rpb24oZSl7IGNvbnNvbGUubG9nKFwiY2hhbmdlU3RhdGVcIik7IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbHRpcFNob3c6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcInRvb2x0aXBTaG93XCIpOyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBIaWRlOiBmdW5jdGlvbihlKXsgY29uc29sZS5sb2coXCJ0b29sdGlwSGlkZVwiKTsgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGlja0Zvcm1hdDogZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMudGltZS5mb3JtYXQoJyViJykobmV3IERhdGUoZCkpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHlBeGlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICB0aWNrRm9ybWF0OiBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLjAyZicpKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsRGlzdGFuY2U6IC0xMFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTsgIFxyXG4gICAgfVxyXG5cclxuICAgIG11bHRpQmFyQ2hhcnRPcHRpb25zKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnbXVsdGlCYXJDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgIHdpZHRoOiAzMDAsXHJcbiAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAxMCxcclxuICAgICAgICAgICAgICAgICAgICByaWdodDogMjUsXHJcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiAzMCxcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiAyNVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNob3dMZWdlbmQgOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpe3JldHVybiBkLmxhYmVsO30sXHJcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXtyZXR1cm4gZC52YWx1ZSArICgxZS0xMCk7fSxcclxuICAgICAgICAgICAgICAgIHNob3dWYWx1ZXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICByZWR1Y2VYVGlja3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc2hvd0NvbnRyb2xzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlRm9ybWF0OiBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLC40ZicpKGQpO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsRGlzdGFuY2U6IDMwXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHNob3dYQXhpczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA3MDBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07ICBcclxuICAgIH1cclxuXHJcbiAgICBtZXRyaWNCYXJDaGFydE9wdGlvbnMobWlzQ3RybCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY3JldGVCYXJDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDIwMCxcclxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IDIwLFxyXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiAyNSxcclxuICAgICAgICAgICAgICAgICAgICBib3R0b206IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMjVcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXtyZXR1cm4gZC5sYWJlbDt9LFxyXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWV9LFxyXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzaG93VmFsdWVzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdmFsdWVGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJywuMmYnKShkKTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB0b29sdGlwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNob3dZQXhpczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzaG93WEF4aXM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDcwMFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTsgIFxyXG4gICAgfVxyXG5cclxuICAgIHRhcmdldEJhckNoYXJ0T3B0aW9ucyhtaXNDdHJsKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgY2hhcnQ6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdkaXNjcmV0ZUJhckNoYXJ0JyxcclxuICAgICAgICAgICAgICAgIGhlaWdodDogMjUwLFxyXG4gICAgICAgICAgICAgICAgbWFyZ2luIDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvcDogMjAsXHJcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDUwLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogMjAsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogNzVcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB1c2VJbnRlcmFjdGl2ZUd1aWRlbGluZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpe3JldHVybiBkLmxhYmVsO30sXHJcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXtyZXR1cm4gZC52YWx1ZSArICgxZS0xMCk7fSxcclxuICAgICAgICAgICAgICAgIHNob3dWYWx1ZXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzaG93WUF4aXM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgdmFsdWVGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJywuMmYnKShkKTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNzAwXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9OyAgXHJcbiAgICB9XHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbmNsYXNzIEZpbHRlcmVkTGlzdFNlcnZpY2Uge1xyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFtdO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkgeyB9XHJcblxyXG4gICAgc2VhcmNoZWQgKHZhbExpc3RzLCB0b1NlYXJjaCwgbGV2ZWwsIGRyaWxsdHlwZSkge1xyXG4gICAgICByZXR1cm4gXy5maWx0ZXIodmFsTGlzdHMsIFxyXG4gICAgICAgIGZ1bmN0aW9uIChpKSB7XHJcbiAgICAgICAgICAvKiBTZWFyY2ggVGV4dCBpbiBhbGwgMyBmaWVsZHMgKi9cclxuICAgICAgICAgIHJldHVybiBzZWFyY2hVdGlsKGksIHRvU2VhcmNoLCBsZXZlbCwgZHJpbGx0eXBlKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwYWdlZCAodmFsTGlzdHMscGFnZVNpemUpIHtcclxuICAgICAgdmFyIHJldFZhbCA9IFtdO1xyXG4gICAgICBpZih2YWxMaXN0cyl7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWxMaXN0cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgaWYgKGkgJSBwYWdlU2l6ZSA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXRWYWxbTWF0aC5mbG9vcihpIC8gcGFnZVNpemUpXSA9IFt2YWxMaXN0c1tpXV07XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXRWYWxbTWF0aC5mbG9vcihpIC8gcGFnZVNpemUpXS5wdXNoKHZhbExpc3RzW2ldKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJldFZhbDtcclxuICAgIH1cclxuXHJcbiAgIFxyXG59XHJcbmZ1bmN0aW9uIHNlYXJjaFV0aWwoaXRlbSwgdG9TZWFyY2gsIGxldmVsLCBkcmlsbHR5cGUpIHtcclxuICAgIC8qIFNlYXJjaCBUZXh0IGluIGFsbCAzIGZpZWxkcyAqL1xyXG4gIGlmKGRyaWxsdHlwZSA9PSAncm91dGUnKSB7XHJcbiAgICBpZihpdGVtLmNvdW50cnlGcm9tICYmIGl0ZW0uY291bnRyeVRvICYmIGxldmVsID09IDApIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmNvdW50cnlGcm9tLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xIHx8IGl0ZW0uY291bnRyeVRvLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbS5mbG93blNlY3RvciAmJiBsZXZlbCA9PSAxKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbG93blNlY3Rvci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMikge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtWydkb2N1bWVudCMnXSAmJiBsZXZlbCA9PSAzKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbVsnZG9jdW1lbnQjJ10udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYoZHJpbGx0eXBlID09ICd0YXJnZXQnKSB7XHJcbiAgICBpZihpdGVtLnJvdXRldHlwZSAmJiBsZXZlbCA9PSAwKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5yb3V0ZXR5cGUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW0ucm91dGVjb2RlICYmIGxldmVsID09IDEpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLnJvdXRlY29kZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYoZHJpbGx0eXBlID09ICdiYXInKSB7XHJcbiAgICBpZihpdGVtLnJvdXRlQ29kZSAmJiBsZXZlbCA9PSAwKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5yb3V0ZUNvZGUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDIpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYoZHJpbGx0eXBlID09ICdmbGlnaHQtcHJvY2VzcycpIHtcclxuICAgIGlmKGl0ZW0uY291bnRyeUZyb20gJiYgaXRlbS5jb3VudHJ5VG8gJiYgbGV2ZWwgPT0gMCkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uY291bnRyeUZyb20udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgfHwgaXRlbS5jb3VudHJ5VG8udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDIpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfWVsc2UgaWYoaXRlbVsnY2FycmllckNvZGUjJ10gJiYgbGV2ZWwgPT0gMykge1xyXG4gICAgICByZXR1cm4gKGl0ZW1bJ2NhcnJpZXJDb2RlIyddLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZihkcmlsbHR5cGUgPT0gJ2ZsaWdodC1jb3VudCcpIHtcclxuICAgIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDApIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfWVsc2UgaWYoaXRlbVsnY2FycmllckNvZGUnXSAmJiBsZXZlbCA9PSAxKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbVsnY2FycmllckNvZGUnXS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYoZHJpbGx0eXBlID09ICdjb3Vwb24tY291bnQnKSB7XHJcbiAgICBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAwKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW1bJ2Zsb3duU2VjdG9yJ10gJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW1bJ2Zsb3duU2VjdG9yJ10udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmKGRyaWxsdHlwZSA9PSAnYW5hbHlzaXMnIHx8IGRyaWxsdHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jykge1xyXG4gICAgaWYoaXRlbS5yZWdpb25OYW1lICYmIGxldmVsID09IDApIHtcclxuICAgICAgcmV0dXJuIChpdGVtLnJlZ2lvbk5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmKGl0ZW0uY291bnRyeUZyb20gJiYgaXRlbS5jb3VudHJ5VG8gJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uY291bnRyeUZyb20udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgfHwgaXRlbS5jb3VudHJ5VG8udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtLmZsb3duU2VjdG9yICYmIGxldmVsID09IDIpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsb3duU2VjdG9yLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAzKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHNcIiAvPlxyXG5cclxuY2xhc3MgT3BlcmF0aW9uYWxTZXJ2aWNlIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJyRxJ107XHJcblx0cHJpdmF0ZSBzZXJ2ZXJSZXF1ZXN0OiBudW1iZXI7XHJcblxyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlKSB7IH1cclxuXHJcblx0Z2V0UGF4Rmxvd25PcHJIZWFkZXIocmVxZGF0YSk6IGFueSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5vcHIvcGF4Zmxvd25vcHJoZWFkZXInO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRPcHJGbGlnaHRQcm9jU3RhdHVzKHJlcWRhdGEpIHtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm9wci9mbGlnaHRwcm9jZXNzaW5nc3RhdHVzJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0T3ByRmxpZ2h0Q291bnRCeVJlYXNvbihyZXFkYXRhKSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5vcHIvZmxpZ2h0Y291bnRieXJlYXNvbic7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHRcdH0pO1xyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0T3ByQ291cG9uQ291bnRCeUV4Y2VwdGlvbihyZXFkYXRhKSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5vcHIvY291cG9uY291bnRieWV4Y2VwdGlvbic7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHRcdH0pO1xyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHRcclxuXHRnZXREcmlsbERvd24gKHJlcWRhdGEsIFVSTCl7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gVVJMO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHRpZighdGhpcy5zZXJ2ZXJSZXF1ZXN0KXtcclxuXHRcdFx0dGhpcy5zZXJ2ZXJSZXF1ZXN0ID0gMTtcclxuXHRcdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdFx0XHR0aGlzLnNlcnZlclJlcXVlc3QgPSAwO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9jb21tb24vc2VydmljZXMvTG9jYWxTdG9yYWdlU2VydmljZS50c1wiIC8+XHJcblxyXG5jbGFzcyBVc2VyU2VydmljZSB7XHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJyRxJywgJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCAnJHdpbmRvdyddO1xyXG5cdHB1YmxpYyB1c2VyUHJvZmlsZTogYW55O1xyXG5cdHB1YmxpYyBfdXNlcjogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHByaXZhdGUgbWVudUFjY2VzcyA9IFtdO1xyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLCBwcml2YXRlIGxvY2FsU3RvcmFnZVNlcnZpY2U6IExvY2FsU3RvcmFnZVNlcnZpY2UsIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcclxuXHJcblx0fVxyXG5cclxuXHRzZXRVc2VyKHVzZXIpIHtcclxuXHRcdGlmICh0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlKSB7XHJcblx0XHRcdHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicsIEpTT04uc3RyaW5naWZ5KHVzZXIpKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGxvZ291dCgpIHtcclxuXHRcdHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5zZXRPYmplY3QoJ3JhcGlkTW9iaWxlLnVzZXInLCBudWxsKTtcclxuXHRcdHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5zZXRPYmplY3QoJ3VzZXJQZXJtaXNzaW9uTWVudScsIFtdKTtcclxuXHRcdHRoaXMuX3VzZXIgPSBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGlzTG9nZ2VkSW4oKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fdXNlciA/IHRydWUgOiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGlzVXNlckxvZ2dlZEluKCk6IGJvb2xlYW4ge1xyXG5cdFx0aWYgKHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5nZXRPYmplY3QoJ3JhcGlkTW9iaWxlLnVzZXInLCAnJykgIT0gbnVsbCkge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGdldFVzZXIoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fdXNlcjtcclxuXHR9XHJcblxyXG5cdGxvZ2luKF91c2VyTmFtZTogc3RyaW5nLCBfcGFzc3dvcmQ6IHN0cmluZykge1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvdXNlci9sb2dpbic7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xyXG5cdFx0XHR1c2VySWQ6IF91c2VyTmFtZSxcclxuXHRcdFx0cGFzc3dvcmQ6IF9wYXNzd29yZFxyXG5cdFx0fVxyXG5cdFx0dGhpcy5zZXRVc2VyKHsgdXNlcm5hbWU6IFwiXCIgfSk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxdWVzdE9iaikudGhlbihcclxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xyXG5cdFx0XHRcdFx0dGhpcy5fdXNlciA9IHRydWU7XHJcblx0XHRcdFx0XHRkZWYucmVzb2x2ZShyZXNwb25zZS5kYXRhKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0ZGVmLnJlamVjdChyZXNwb25zZS5kYXRhKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkIG9uIGxvZyBpbicpO1xyXG5cdFx0XHRcdGRlZi5yZWplY3QoZXJyb3IpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRVc2VyUHJvZmlsZShyZXFkYXRhKSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy91c2VyL3VzZXJwcm9maWxlJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcclxuXHRcdFx0XHRcdHRoaXMudXNlclByb2ZpbGUgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdFx0XHR0aGlzLmxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0T2JqZWN0KCd1c2VyUGVybWlzc2lvbk1lbnUnLCB0aGlzLnVzZXJQcm9maWxlLm1lbnVBY2Nlc3MpO1xyXG5cdFx0XHRcdFx0ZGVmLnJlc29sdmUocmVzcG9uc2UuZGF0YSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGRlZi5yZWplY3QocmVzcG9uc2UuZGF0YSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCBvbiBVc2VyUHJvZmlsZScpO1xyXG5cdFx0XHRcdGRlZi5yZWplY3QoZXJyb3IpO1xyXG5cdFx0XHR9KTtcclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdHNob3dEYXNoYm9hcmQobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRpZiAodGhpcy5pc1VzZXJMb2dnZWRJbigpKSB7XHJcblx0XHRcdGlmICh0eXBlb2YgdGhpcy51c2VyUHJvZmlsZSA9PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdHZhciBkYXRhID0gdGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldE9iamVjdCgndXNlclBlcm1pc3Npb25NZW51JywgJycpO1xyXG5cdFx0XHRcdHRoaXMubWVudUFjY2VzcyA9IGRhdGE7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5tZW51QWNjZXNzID0gdGhpcy51c2VyUHJvZmlsZS5tZW51QWNjZXNzO1xyXG5cdFx0XHR9XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tZW51QWNjZXNzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKHRoaXMubWVudUFjY2Vzc1tpXS5tZW51TmFtZSA9PSBuYW1lKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5tZW51QWNjZXNzW2ldLm1lbnVBY2Nlc3M7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5pc1VzZXJMb2dnZWRJbigpO1xyXG5cdFx0fVxyXG5cdH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbXBvbmVudHMvbWlzL3NlcnZpY2VzL0ZpbHRlcmVkTGlzdFNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbXBvbmVudHMvdXNlci9zZXJ2aWNlcy9Vc2VyU2VydmljZS50c1wiIC8+XHJcblxyXG5cclxuXHJcbmludGVyZmFjZSB0YWJPYmplY3Qge1xyXG4gICAgdGl0bGU6IHN0cmluZyxcclxuICAgIG5hbWVzOiBzdHJpbmcsXHJcbiAgICBpY29uOiBzdHJpbmdcclxufVxyXG5cclxuaW50ZXJmYWNlIHRvZ2dsZU9iamVjdCB7XHJcbiAgICBtb250aE9yWWVhcjogc3RyaW5nLFxyXG4gICAgdGFyZ2V0UmV2T3JQYXg6IHN0cmluZyxcclxuICAgIHNlY3Rvck9yZGVyOiBzdHJpbmcsXHJcbiAgICBzZWN0b3JSZXZPclBheDogc3RyaW5nLFxyXG4gICAgY2hhcnRPclRhYmxlOiBzdHJpbmcsXHJcbiAgICB0YXJnZXRWaWV3OiBzdHJpbmcsXHJcbiAgICByZXZlbnVlVmlldzogc3RyaW5nLFxyXG4gICAgc2VjdG9yVmlldzogc3RyaW5nXHJcbn1cclxuXHJcbmludGVyZmFjZSBoZWFkZXJPYmplY3Qge1xyXG4gICAgZmxvd25Nb250aDogc3RyaW5nLFxyXG4gICAgc3VyY2hhcmdlOiBib29sZWFuLFxyXG4gICAgdGFiSW5kZXg6IG51bWJlcixcclxuICAgIGhlYWRlckluZGV4OiBudW1iZXIsXHJcbiAgICB1c2VybmFtZTogc3RyaW5nXHJcbn1cclxuXHJcbmNsYXNzIE1pc0NvbnRyb2xsZXJ7XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckc3RhdGUnLCAnJHNjb3BlJywgJyRpb25pY0xvYWRpbmcnLCAnJHRpbWVvdXQnLCAnJHdpbmRvdycsICckaW9uaWNQb3BvdmVyJyxcclxuICAgICAgICAnJGZpbHRlcicsICdNaXNTZXJ2aWNlJywgJ0NoYXJ0b3B0aW9uU2VydmljZScsICdGaWx0ZXJlZExpc3RTZXJ2aWNlJywgJ1VzZXJTZXJ2aWNlJywgJyRpb25pY0hpc3RvcnknLCAnUmVwb3J0U3ZjJywgJ0dSQVBIX0NPTE9SUycsICdUQUJTJywgJyRpb25pY1BvcHVwJ107XHJcblxyXG4gICAgcHJpdmF0ZSB0YWJzOiBbdGFiT2JqZWN0XTtcclxuICAgIHByaXZhdGUgdG9nZ2xlOiB0b2dnbGVPYmplY3Q7XHJcbiAgICBwcml2YXRlIGhlYWRlcjogaGVhZGVyT2JqZWN0O1xyXG4gICAgcHJpdmF0ZSBzdWJIZWFkZXI6IGFueTtcclxuICAgIHByaXZhdGUgb3B0aW9uczogYW55O1xyXG4gICAgcHJpdmF0ZSBkcmlsbHRhYnM6IHN0cmluZ1tdO1xyXG4gICAgXHJcbiAgICBwcml2YXRlIHBhZ2VTaXplID0gNDtcclxuICAgIHByaXZhdGUgY3VycmVudFBhZ2UgPSBbXTtcclxuICAgIHByaXZhdGUgc2VsZWN0ZWREcmlsbCA9IFtdO1xyXG4gICAgcHJpdmF0ZSBncm91cHMgPSBbXTtcclxuXHJcbiAgICBwcml2YXRlIGluZm9wb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcclxuICAgIHByaXZhdGUgZHJpbGxwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcclxuICAgIHByaXZhdGUgZ3JhcGhwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcclxuICAgIHByaXZhdGUgZHJpbGxCYXJwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcclxuXHJcbiAgICBwcml2YXRlIGluZm9kYXRhOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIHJlZ2lvbk5hbWU6IHN0cmluZztcclxuICAgIHByaXZhdGUgY2hhcnRUeXBlOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIGdyYXBoSW5kZXg6IG51bWJlcjtcclxuICAgIHByaXZhdGUgY29sdW1uVG9PcmRlcjogc3RyaW5nO1xyXG4gICAgcHJpdmF0ZSBzaG93bkdyb3VwOiBudW1iZXI7XHJcblxyXG4gICAgcHJpdmF0ZSBtZXRyaWNSZXN1bHQ6IGFueTtcclxuICAgIHByaXZhdGUgbWV0cmljTGVnZW5kczogYW55O1xyXG4gICAgcHJpdmF0ZSBmYXZNZXRyaWNSZXN1bHQ6IGFueTtcclxuXHJcbiAgICBwcml2YXRlIHRhcmdldEFjdHVhbERhdGE6IGFueTtcclxuICAgIHByaXZhdGUgZmF2VGFyZ2V0QmFyUmVzdWx0OiBhbnk7XHJcbiAgICBwcml2YXRlIGZhdlRhcmdldExpbmVSZXN1bHQ6IGFueTtcclxuXHJcbiAgICBwcml2YXRlIHJvdXRlUmV2RGF0YTogYW55O1xyXG5cclxuICAgIHByaXZhdGUgcmV2ZW51ZURhdGE6IGFueTtcclxuICAgIHByaXZhdGUgU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzOiBhbnk7XHJcbiAgICBwcml2YXRlIHBvcG92ZXJzaG93bjogYm9vbGVhbjtcclxuICAgIHByaXZhdGUgZHJpbGxUeXBlOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIGRyaWxsQmFyTGFiZWw6IHN0cmluZztcclxuICAgIHByaXZhdGUgZHJpbGxOYW1lOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIGZpcnN0Q29sdW1uczogc3RyaW5nW107XHJcbiAgICBcclxuICAgIHByaXZhdGUgdGhhdDogYW55O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgJHN0YXRlOiBhbmd1bGFyLnVpLklTdGF0ZVNlcnZpY2UsIHByaXZhdGUgJHNjb3BlOiBuZy5JU2NvcGUsXHJcbiAgICAgICAgcHJpdmF0ZSAkaW9uaWNMb2FkaW5nOiBJb25pYy5JTG9hZGluZywgcHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLFxyXG4gICAgICAgIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsIHByaXZhdGUgJGlvbmljUG9wb3ZlcjogSW9uaWMuSVBvcG92ZXIsXHJcbiAgICAgICAgcHJpdmF0ZSAkZmlsdGVyOiBuZy5JRmlsdGVyU2VydmljZSwgcHJpdmF0ZSBtaXNTZXJ2aWNlOiBNaXNTZXJ2aWNlLFxyXG4gICAgICAgIHByaXZhdGUgY2hhcnRvcHRpb25TZXJ2aWNlOiBDaGFydG9wdGlvblNlcnZpY2UsIHByaXZhdGUgZmlsdGVyZWRMaXN0U2VydmljZTogRmlsdGVyZWRMaXN0U2VydmljZSxcclxuICAgICAgICBwcml2YXRlIHVzZXJTZXJ2aWNlOiBVc2VyU2VydmljZSwgcHJpdmF0ZSAkaW9uaWNIaXN0b3J5OiBhbnksIHByaXZhdGUgcmVwb3J0U3ZjOiBSZXBvcnRTdmMsIHByaXZhdGUgR1JBUEhfQ09MT1JTOiBzdHJpbmcsIHByaXZhdGUgVEFCUzogc3RyaW5nLCBwcml2YXRlICRpb25pY1BvcHVwOiBJb25pYy5JUG9wdXApIHtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRhYnMgPSB0aGlzLlRBQlMuREIxX1RBQlM7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRvZ2dsZSA9IHtcclxuICAgICAgICAgICAgICAgIG1vbnRoT3JZZWFyIDogJ21vbnRoJyxcclxuICAgICAgICAgICAgICAgIHRhcmdldFJldk9yUGF4OiAncmV2ZW51ZScsXHJcbiAgICAgICAgICAgICAgICBzZWN0b3JPcmRlcjogJ3RvcDUnLFxyXG4gICAgICAgICAgICAgICAgc2VjdG9yUmV2T3JQYXg6ICdyZXZlbnVlJyxcclxuICAgICAgICAgICAgICAgIGNoYXJ0T3JUYWJsZTogJ2NoYXJ0JyxcclxuICAgICAgICAgICAgICAgIHRhcmdldFZpZXc6ICdjaGFydCcsXHJcbiAgICAgICAgICAgICAgICByZXZlbnVlVmlldzogJ2NoYXJ0JyxcclxuICAgICAgICAgICAgICAgIHNlY3RvclZpZXc6ICdjaGFydCdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmhlYWRlciA9IHtcclxuICAgICAgICAgICAgICAgIGZsb3duTW9udGg6ICcnLFxyXG4gICAgICAgICAgICAgICAgc3VyY2hhcmdlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHRhYkluZGV4OiAwLFxyXG4gICAgICAgICAgICAgICAgaGVhZGVySW5kZXg6IDAsXHJcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogJydcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIC8qXHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpLmJpbmQoJ29yaWVudGF0aW9uY2hhbmdlJywgZnVuY3Rpb24gKGUsIHNjb3BlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXh9KTtcclxuICAgICAgICAgICAgfSk7ICovXHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpLmJpbmQoJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5vcmllbnRhdGlvbkNoYW5nZSk7IFxyXG4gICAgICAgIFxyXG4gICAgICAgICAgICAvL3RoaXMuJHNjb3BlLiR3YXRjaCgnTWlzQ3RybC5oZWFkZXIuc3VyY2hhcmdlJywgKCkgPT4geyB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDp0aGlzLmhlYWRlci50YWJJbmRleH0pOyB9LCB0cnVlKTtcclxuICAgICAgICAgICAgdGhpcy5pbml0RGF0YSgpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCdvblNsaWRlTW92ZScsIChldmVudDogYW55LCByZXNwb25zZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9uU2xpZGVNb3ZlKHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCckaW9uaWNWaWV3LmVudGVyJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFzZWxmLnVzZXJTZXJ2aWNlLnNob3dEYXNoYm9hcmQoJ01JUycpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kc3RhdGUuZ28oXCJsb2dpblwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kb24oJ29wZW5EcmlsbFBvcHVwJywgKGV2ZW50OiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS50eXBlID09ICdtZXRyaWMnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuTWlzQ3RybC5vcGVuQmFyRHJpbGxEb3duUG9wb3ZlcihyZXNwb25zZS5ldmVudCwgeyBcInBvaW50XCI6IHJlc3BvbnNlLmRhdGEgfSwgLTEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ3RhcmdldCcpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9wZW5UYXJnZXREcmlsbERvd25Qb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jykge1xyXG4gICAgICAgICAgICAgICAgICAgLy8gdGhpcy4kc2NvcGUuTWlzQ3RybC5vcGVuUmV2ZW51ZVBhc3NlbmdlckRyaWxsRG93blBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpbml0RGF0YSgpIHtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvaW5mb3Rvb2x0aXAuaHRtbCcsIHtcclxuICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXHJcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbihpbmZvcG9wb3Zlcikge1xyXG4gICAgICAgICAgICB0aGF0LmluZm9wb3BvdmVyID0gaW5mb3BvcG92ZXI7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL2RyaWxkb3duLmh0bWwnLCB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oZHJpbGxwb3BvdmVyKSB7XHJcbiAgICAgICAgICAgIHRoYXQuZHJpbGxwb3BvdmVyID0gZHJpbGxwb3BvdmVyO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL2JhcmRyaWxkb3duLmh0bWwnLCB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oZHJpbGxCYXJwb3BvdmVyKSB7XHJcbiAgICAgICAgICAgIHRoYXQuZHJpbGxCYXJwb3BvdmVyID0gZHJpbGxCYXJwb3BvdmVyO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLm9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIG1ldHJpYzogdGhpcy5jaGFydG9wdGlvblNlcnZpY2UubWV0cmljQmFyQ2hhcnRPcHRpb25zKHRoaXMpLFxyXG4gICAgICAgICAgICB0YXJnZXRMaW5lQ2hhcnQ6IHRoaXMuY2hhcnRvcHRpb25TZXJ2aWNlLmxpbmVDaGFydE9wdGlvbnMoKSxcclxuICAgICAgICAgICAgdGFyZ2V0QmFyQ2hhcnQ6IHRoaXMuY2hhcnRvcHRpb25TZXJ2aWNlLnRhcmdldEJhckNoYXJ0T3B0aW9ucyh0aGlzKSxcclxuICAgICAgICAgICAgcGFzc2VuZ2VyQ2hhcnQ6IHRoaXMuY2hhcnRvcHRpb25TZXJ2aWNlLm11bHRpQmFyQ2hhcnRPcHRpb25zKClcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgcmVxID0ge1xyXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihyZXEudXNlcklkICE9IFwibnVsbFwiKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRQYXhGbG93bk1pc0hlYWRlcihyZXEpLnRoZW4oXHJcbiAgICAgICAgICAgICAgICAoZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuc3ViSGVhZGVyID0gZGF0YS5yZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuaGVhZGVyLmZsb3duTW9udGggPSB0aGF0LnN1YkhlYWRlci5wYXhGbG93bk1pc01vbnRoc1swXS5mbG93TW9udGg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQub25TbGlkZU1vdmUoeyBpbmRleDogMCB9KTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cdFxyXG5cdFx0dGhhdC5oZWFkZXIudXNlcm5hbWUgPSB0aGF0LmdldFByb2ZpbGVVc2VyTmFtZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFByb2ZpbGVVc2VyTmFtZSgpOiBzdHJpbmcge1xyXG4gICAgICAgIGlmICh0aGlzLnVzZXJTZXJ2aWNlLmlzVXNlckxvZ2dlZEluKCkpIHtcclxuICAgICAgICAgICAgdmFyIG9iaiA9IHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicpO1xyXG4gICAgICAgICAgICBpZiAob2JqICE9ICdudWxsJykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHByb2ZpbGVVc2VyTmFtZSA9IEpTT04ucGFyc2Uob2JqKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9maWxlVXNlck5hbWUudXNlcm5hbWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZWN0ZWRGbG93bk1vbnRoKG1vbnRoOiBzdHJpbmcpe1xyXG4gICAgICAgIHJldHVybiAobW9udGggPT0gdGhpcy5oZWFkZXIuZmxvd25Nb250aCk7XHJcbiAgICB9XHJcbiAgICBvcmllbnRhdGlvbkNoYW5nZSA9ICgpOiBib29sZWFuID0+IHtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdGhhdC4kdGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICB0aGF0Lm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoYXQuaGVhZGVyLnRhYkluZGV4IH0pO1xyXG4gICAgICAgIH0sMjAwKVxyXG4gICAgfSBcclxuICAgIG9wZW5pbmZvUG9wb3ZlciAoJGV2ZW50LCBpbmRleCkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgaW5kZXggPT0gXCJ1bmRlZmluZWRcIiB8fCBpbmRleCA9PSBcIlwiKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5mb2RhdGEgPSAnTm8gaW5mbyBhdmFpbGFibGUnO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICB0aGlzLmluZm9kYXRhPWluZGV4O1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zb2xlLmxvZyhpbmRleCk7XHJcbiAgICAgICAgdGhpcy5pbmZvcG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNsb3NlUG9wb3ZlcigpIHtcclxuICAgICAgICB0aGlzLmdyYXBocG9wb3Zlci5oaWRlKCk7XHJcbiAgICB9O1xyXG4gICAgY2xvc2VzQmFyUG9wb3Zlcigpe1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLmhpZGUoKTtcclxuICAgIH1cclxuICAgIGNsb3NlSW5mb1BvcG92ZXIoKSB7XHJcbiAgICAgICAgdGhpcy5pbmZvcG9wb3Zlci5oaWRlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlSGVhZGVyKCkge1xyXG5cdFx0dmFyIGZsb3duTW9udGggPSB0aGlzLmhlYWRlci5mbG93bk1vbnRoO1xyXG4gICAgICAgIHRoaXMuaGVhZGVyLmhlYWRlckluZGV4ID0gXy5maW5kSW5kZXgodGhpcy5zdWJIZWFkZXIucGF4Rmxvd25NaXNNb250aHMsIGZ1bmN0aW9uKGNocjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjaHIuZmxvd01vbnRoID09IGZsb3duTW9udGg7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc29sZS5sb2codGhpcy5oZWFkZXIuaGVhZGVySW5kZXgpO1xyXG5cdFx0dGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6IHRoaXMuaGVhZGVyLmhlYWRlckluZGV4fSk7XHJcbiAgICB9XHJcblxyXG4gICAgb25TbGlkZU1vdmUoZGF0YTogYW55KSB7XHJcbiAgICAgICAgdGhpcy5oZWFkZXIudGFiSW5kZXggPSBkYXRhLmluZGV4O1xyXG5cdFx0dGhpcy50b2dnbGUuY2hhcnRPclRhYmxlID0gXCJjaGFydFwiO1xyXG4gICAgICAgIHN3aXRjaCh0aGlzLmhlYWRlci50YWJJbmRleCl7XHJcbiAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgdGhpcy5nZXRGbG93bkZhdm9yaXRlcygpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICB0aGlzLmNhbGxNZXRyaWNTbmFwc2hvdCgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICB0aGlzLmNhbGxUYXJnZXRWc0FjdHVhbCgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICB0aGlzLmNhbGxSZXZlbnVlQW5hbHlzaXMoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgNDpcclxuICAgICAgICAgICAgdGhpcy5jYWxsU2VjdG9yQ2FycmllckFuYWx5c2lzKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDU6XHJcbiAgICAgICAgICAgIHRoaXMuY2FsbFJvdXRlUmV2ZW51ZSgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHRvZ2dsZU1ldHJpYyAodmFsKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUubW9udGhPclllYXIgPSB2YWw7XHJcbiAgICAgICAgdGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4fSk7XHJcbiAgICB9XHJcbiAgICB0b2dnbGVTdXJjaGFyZ2UoKSB7XHJcbiAgICAgICAgdGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6dGhpcy5oZWFkZXIudGFiSW5kZXh9KTtcclxuICAgIH1cclxuICAgIHRvZ2dsZVRhcmdldCh2YWwpIHtcclxuICAgICAgICB0aGlzLnRvZ2dsZS50YXJnZXRSZXZPclBheCA9IHZhbDtcclxuICAgIH1cclxuXHJcbiAgICB0b2dnbGVTZWN0b3IodmFsKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUuc2VjdG9yUmV2T3JQYXggPSB2YWw7XHJcbiAgICB9XHJcblxyXG4gICAgY2FsbE1ldHJpY1NuYXBzaG90KCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICB0b2dnbGUxOiB0aGlzLnRvZ2dsZS5tb250aE9yWWVhcixcclxuICAgICAgICAgICAgZnVsbERhdGFGbGFnOiAnTidcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRNZXRyaWNTbmFwc2hvdChyZXFkYXRhKVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcclxuXHRcdFx0XHQvLyBmYXYgSXRlbXMgdG8gZGlzcGxheSBpbiBkYXNoYm9hcmRcclxuXHRcdFx0XHR0aGF0Lm1ldHJpY1Jlc3VsdCAgPSBfLnNvcnRCeShkYXRhLnJlc3BvbnNlLmRhdGEubWV0cmljU25hcHNob3RDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xyXG5cdFx0XHRcdFx0aWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Xy5mb3JFYWNoKHRoYXQubWV0cmljUmVzdWx0LCBmdW5jdGlvbiAobjogYW55LCB2YWx1ZTogYW55KSB7XHJcblx0XHRcdFx0XHRuLnZhbHVlc1swXS5jb2xvciA9IHRoYXQuR1JBUEhfQ09MT1JTLk1FVFJJQ1swXTtcclxuXHRcdFx0XHRcdG4udmFsdWVzWzFdLmNvbG9yID0gdGhhdC5HUkFQSF9DT0xPUlMuTUVUUklDWzFdO1xyXG5cdFx0XHRcdFx0aWYobi52YWx1ZXNbMl0pIG4udmFsdWVzWzJdLmNvbG9yID0gdGhhdC5HUkFQSF9DT0xPUlMuTUVUUklDWzJdO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHR0aGF0LmZhdk1ldHJpY1Jlc3VsdCA9IF8uZmlsdGVyKHRoYXQubWV0cmljUmVzdWx0LCBmdW5jdGlvbih1OiBhbnkpIHtcclxuXHRcdFx0XHRcdGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0aGF0Lm1ldHJpY0xlZ2VuZHMgPSBkYXRhLnJlc3BvbnNlLmRhdGEubGVnZW5kcztcclxuXHRcdFx0XHRpZih0aGF0LmhlYWRlci50YWJJbmRleCA9PSAwKSB7XHJcblx0XHRcdFx0XHR0aGF0Lm1ldHJpY1Jlc3VsdCA9IHRoYXQuZmF2TWV0cmljUmVzdWx0O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuXHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0ICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcclxuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxyXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQhISEnXHJcblx0XHRcdFx0ICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xyXG5cdFx0XHRcdFx0ICBjb25zb2xlLmxvZygnZG9uZScpO1xyXG5cdFx0XHRcdCAgfSk7XHJcblx0XHRcdH1cclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxUYXJnZXRWc0FjdHVhbCgpIHtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcclxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VybmFtZSxcclxuICAgICAgICAgICAgdG9nZ2xlMTogJycsXHJcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJydcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cclxuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0VGFyZ2V0VnNBY3R1YWwocmVxZGF0YSlcclxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdGlmKGRhdGEucmVzcG9uc2Uuc3RhdHVzID09PSBcInN1Y2Nlc3NcIil7XHJcblx0XHRcdFx0Ly8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXHJcblx0XHRcdFx0dGhhdC5mYXZUYXJnZXRMaW5lUmVzdWx0ID0gXy5maWx0ZXIoZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuXHRcdFx0XHRcdGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0aGF0LmZhdlRhcmdldEJhclJlc3VsdCA9IF8uZmlsdGVyKGRhdGEucmVzcG9uc2UuZGF0YS52ZXJCYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuXHRcdFx0XHRcdGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRfLmZvckVhY2goZGF0YS5yZXNwb25zZS5kYXRhLnZlckJhckNoYXJ0cywgZnVuY3Rpb24gKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG5cdFx0XHRcdFx0bi52YWx1ZXNbMF0uY29sb3IgPSB0aGF0LkdSQVBIX0NPTE9SUy52ZXJCYXJDaGFydHNbMF07XHJcblx0XHRcdFx0XHRuLnZhbHVlc1sxXS5jb2xvciA9IHRoYXQuR1JBUEhfQ09MT1JTLnZlckJhckNoYXJ0c1sxXTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0dmFyIGxpbmVDb2xvcnMgPSBbe1wiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuTElORVswXSwgXCJjbGFzc2VkXCI6IFwiZGFzaGVkXCIsXCJzdHJva2VXaWR0aFwiOiAyfSxcclxuXHRcdFx0XHR7XCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5MSU5FWzFdfSx7XCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5MSU5FWzJdLCBcImFyZWFcIiA6IHRydWUsIFwiZGlzYWJsZWRcIjogdHJ1ZX1dO1xyXG5cclxuXHRcdFx0XHRfLmZvckVhY2goZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHMsIGZ1bmN0aW9uIChuOiBhbnksIHZhbHVlOiBhbnkpIHtcclxuXHRcdFx0XHRcdF8ubWVyZ2Uobi5saW5lQ2hhcnRJdGVtcywgbGluZUNvbG9ycyk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGRhdGEucmVzcG9uc2UuZGF0YS5saW5lQ2hhcnRzKTtcclxuXHJcblx0XHRcdFx0dGhhdC50YXJnZXRBY3R1YWxEYXRhID0ge1xyXG5cdFx0XHRcdFx0aG9yQmFyQ2hhcnQ6IGRhdGEucmVzcG9uc2UuZGF0YS52ZXJCYXJDaGFydHMsXHJcblx0XHRcdFx0XHRsaW5lQ2hhcnQ6IGRhdGEucmVzcG9uc2UuZGF0YS5saW5lQ2hhcnRzXHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdH1lbHNle1xyXG5cdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0XHRcdCAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XHJcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcclxuXHRcdFx0XHRcdGNvbnRlbnQ6ICdObyBEYXRhIEZvdW5kISEhJ1xyXG5cdFx0XHRcdCAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcclxuXHRcdFx0XHRcdCAgY29uc29sZS5sb2coJ2RvbmUnKTtcclxuXHRcdFx0XHQgIH0pO1xyXG5cdFx0XHR9XHJcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjYWxsUm91dGVSZXZlbnVlKCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB2YXIgcm91dGVSZXZSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXHJcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWVcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRSb3V0ZVJldmVudWUocm91dGVSZXZSZXF1ZXN0KVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcclxuXHRcdFx0XHR0aGF0LnJvdXRlUmV2RGF0YSA9IGRhdGEucmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0ICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcclxuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxyXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQhISEnXHJcblx0XHRcdFx0ICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xyXG5cdFx0XHRcdFx0ICBjb25zb2xlLmxvZygnZG9uZScpO1xyXG5cdFx0XHRcdCAgfSk7XHJcblx0XHRcdH1cclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGNhbGxSZXZlbnVlQW5hbHlzaXMoKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICAgICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXHJcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgIHRvZ2dsZTE6ICcnLFxyXG4gICAgICAgICAgICBmdWxsRGF0YUZsYWc6ICcnXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0UmV2ZW51ZUFuYWx5c2lzKHJlcWRhdGEpXHJcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0XHRpZihkYXRhLnJlc3BvbnNlLnN0YXR1cyA9PT0gXCJzdWNjZXNzXCIpe1xyXG5cdFx0XHRcdC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxyXG5cdFx0XHRcdHZhciBqc29uT2JqID0gZGF0YS5yZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRcdHZhciBzb3J0ZWREYXRhID0gXy5zb3J0QnkoanNvbk9iai5tdWx0aWJhckNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7IFxyXG5cdFx0XHRcdFx0aWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR2YXIgZmF2UmV2ZW51ZUJhclJlc3VsdCA9IF8uZmlsdGVyKHNvcnRlZERhdGEsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuXHRcdFx0XHRcdGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR2YXIgc29ydGVkRGF0YSA9IF8uc29ydEJ5KGpzb25PYmoucGllQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHsgXHJcblx0XHRcdFx0XHRpZiAodSkgcmV0dXJuIFt1LmZhdm9yaXRlQ2hhcnRQb3NpdGlvbl07IFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHZhciBmYXZSZXZlbnVlUGllUmVzdWx0ID0gXy5maWx0ZXIoc29ydGVkRGF0YSwgZnVuY3Rpb24odTogYW55KSB7IFxyXG5cdFx0XHRcdFx0aWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHR2YXIgYmFyQ29sb3JzID0gW3RoYXQuR1JBUEhfQ09MT1JTLkJBUlswXSwgdGhhdC5HUkFQSF9DT0xPUlMuQkFSWzFdXTtcclxuXHRcdFx0XHRfLm1lcmdlKGpzb25PYmoubXVsdGliYXJDaGFydHNbMV0sIGJhckNvbG9ycyk7XHJcblx0XHRcdFx0Xy5mb3JFYWNoKGpzb25PYmoubXVsdGliYXJDaGFydHMsIGZ1bmN0aW9uKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG5cdFx0XHRcdFx0bi5jb2xvciA9IGJhckNvbG9yc1t2YWx1ZV07XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHZhciBwaWVDb2xvcnMgPSBbe1wiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuUElFWzBdfSx7XCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5QSUVbMV19LHtcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLlBJRVsyXX1dO1xyXG5cdFx0XHRcdF8uZm9yRWFjaChqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCBmdW5jdGlvbiAobjogYW55LCB2YWx1ZTogYW55KSB7XHJcblx0XHRcdFx0XHRuLmxhYmVsID0gbi54dmFsO1xyXG5cdFx0XHRcdFx0bi52YWx1ZSA9IG4ueXZhbDtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Xy5tZXJnZShqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCBwaWVDb2xvcnMpO1xyXG5cclxuXHRcdFx0XHR0aGF0LnJldmVudWVEYXRhID0ge1xyXG5cdFx0XHRcdFx0cmV2ZW51ZVBpZUNoYXJ0IDoganNvbk9iai5waWVDaGFydHNbMF0sXHJcblx0XHRcdFx0XHRyZXZlbnVlQmFyQ2hhcnQgOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzFdLm11bHRpYmFyQ2hhcnRJdGVtcyxcclxuXHRcdFx0XHRcdHJldmVudWVIb3JCYXJDaGFydCA6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMl0ubXVsdGliYXJDaGFydEl0ZW1zXHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuXHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0ICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcclxuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxyXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQhISEnXHJcblx0XHRcdFx0ICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xyXG5cdFx0XHRcdFx0ICBjb25zb2xlLmxvZygnZG9uZScpO1xyXG5cdFx0XHRcdCAgfSk7XHJcblx0XHRcdH1cclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG9wZW5EcmlsbERvd24ocmVnaW9uRGF0YSxzZWxGaW5kTGV2ZWwpIHtcclxuICAgICAgICBzZWxGaW5kTGV2ZWwgPSBOdW1iZXIoc2VsRmluZExldmVsKTtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbF0gPSByZWdpb25EYXRhO1xyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWwgKyAxXSA9ICcnO1xyXG4gICAgICAgIGlmKHNlbEZpbmRMZXZlbCAhPSAnMycpIHtcclxuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgICAgICAgIHRoaXMucmVnaW9uTmFtZSA9IChyZWdpb25EYXRhLnJlZ2lvbk5hbWUpID8gcmVnaW9uRGF0YS5yZWdpb25OYW1lIDogcmVnaW9uRGF0YS5jaGFydE5hbWU7XHJcbiAgICAgICAgICAgIHZhciBjb3VudHJ5RnJvbVRvID0gKHJlZ2lvbkRhdGEuY291bnRyeUZyb20gJiYgcmVnaW9uRGF0YS5jb3VudHJ5VG8pID8gcmVnaW9uRGF0YS5jb3VudHJ5RnJvbSArICctJyArIHJlZ2lvbkRhdGEuY291bnRyeVRvIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIHNlY3RvckZyb21UbyA9IChyZWdpb25EYXRhLmZsb3duU2VjdG9yICYmIGRyaWxsTGV2ZWwgPj0gMykgPyByZWdpb25EYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIGZsaWdodE51bWJlciA9IChyZWdpb25EYXRhLmZsaWdodE51bWJlciAmJiBkcmlsbExldmVsID09IDQpID8gcmVnaW9uRGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xyXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHJcbiAgICAgICAgICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXHJcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICAgICAgICAgIFwicmVnaW9uTmFtZVwiOiAodGhpcy5yZWdpb25OYW1lKT8gdGhpcy5yZWdpb25OYW1lIDogXCJOb3J0aCBBbWVyaWNhXCIsXHJcbiAgICAgICAgICAgICAgICBcImNvdW50cnlGcm9tVG9cIjogY291bnRyeUZyb21UbyxcclxuICAgICAgICAgICAgICAgIFwic2VjdG9yRnJvbVRvXCI6IHNlY3RvckZyb21UbyxcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiAwXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlRHJpbGxEb3duKHJlcWRhdGEpXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBkYXRhLnJlc3BvbnNlO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgZmluZExldmVsID0gZHJpbGxMZXZlbCAtIDE7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhLnN0YXR1cyk7XHJcbiAgICAgICAgICAgICAgICBpZihkYXRhLnN0YXR1cyA9PSAnc3VjY2Vzcycpe1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSBkYXRhLmRhdGEucm93cztcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gZGF0YS5kYXRhLnJvd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuc29ydCgncGF4Q291bnQnLGZpbmRMZXZlbCxmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGRyaWxsTGV2ZWwpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuY2xlYXJEcmlsbChmaW5kTGV2ZWwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LGZ1bmN0aW9uKGVycm9yKXtcclxuICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhhdC5jbG9zZXNQb3BvdmVyKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgICAgICBhbGVydCgnU2VydmVyIEVycm9yJyk7XHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICB9IFxyXG4gICAgfVxyXG4gICAgY2xlYXJEcmlsbChsZXZlbDogbnVtYmVyKSB7XHJcbiAgICAgICAgdmFyIGk6IG51bWJlcjtcclxuICAgICAgICBmb3IgKHZhciBpID0gbGV2ZWw7IGkgPCB0aGlzLmdyb3Vwcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB0aGlzLmdyb3Vwc1tpXS5pdGVtcy5zcGxpY2UoMCwgMSk7XHJcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldLm9yZ0l0ZW1zLnNwbGljZSgwLCAxKTtcclxuICAgICAgICAgICAgdGhpcy5zb3J0KCdwYXhDb3VudCcsaSxmYWxzZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtpXSA9ICcnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGRyaWxsRG93blJlcXVlc3QgKGRyaWxsVHlwZSwgc2VsRmluZExldmVsLCBkYXRhKXtcclxuICAgICAgICB2YXIgcmVxZGF0YTtcclxuICAgICAgICBpZihkcmlsbFR5cGUgPT0gJ2JhcicpIHtcclxuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgICAgICAgIGlmIChkYXRhLmxhYmVsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhLmxhYmVsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgZHJpbGxCYXI6IHN0cmluZztcclxuICAgICAgICAgICAgZHJpbGxCYXIgPSAoZGF0YS5sYWJlbCkgPyBkYXRhLmxhYmVsIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIHJvdXRlQ29kZSA9IChkYXRhLnJvdXRlQ29kZSkgPyBkYXRhLnJvdXRlQ29kZSA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBzZWN0b3IgPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWRyaWxsQmFyKSB7XHJcbiAgICAgICAgICAgICAgICBkcmlsbEJhciA9IHRoaXMuZHJpbGxCYXJMYWJlbDtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRyaWxsQmFyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHJcbiAgICAgICAgICAgIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJyA6ICdOJyxcclxuICAgICAgICAgICAgICAgIFwidXNlcklkXCI6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJcIixcclxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxyXG4gICAgICAgICAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXHJcbiAgICAgICAgICAgICAgICBcImRyaWxsQmFyXCI6IGRyaWxsQmFyLFxyXG4gICAgICAgICAgICAgICAgXCJyb3V0ZUNvZGVcIjogcm91dGVDb2RlLFxyXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JcIjogc2VjdG9yLFxyXG4gICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyXHJcbiAgICAgICAgICAgIH07ICBcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBpZihkcmlsbFR5cGUgPT0gJ3RhcmdldCcpIHtcclxuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgICAgICAgIGlmIChkYXRhLmxhYmVsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhLmxhYmVsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgcm91dGV0eXBlOiBzdHJpbmc7XHJcbiAgICAgICAgICAgIHJvdXRldHlwZSA9IChkYXRhLnJvdXRldHlwZSkgPyBkYXRhLnJvdXRldHlwZSA6IFwiXCI7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHJcbiAgICAgICAgICAgIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJyA6ICdOJyxcclxuICAgICAgICAgICAgICAgIFwidXNlcklkXCI6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJzdHJpbmdcIixcclxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxyXG4gICAgICAgICAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXHJcbiAgICAgICAgICAgICAgICBcInJvdXRldHlwZVwiOiByb3V0ZXR5cGVcclxuICAgICAgICAgICAgfTsgIFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICdhbmFseXNpcycpIHtcclxuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB2YXIgcmVnaW9uTmFtZTtcclxuICAgICAgICAgICAgdmFyIGNvdW50cnlGcm9tVG87XHJcbiAgICAgICAgICAgIHZhciBvd25PYWxGbGFnO1xyXG4gICAgICAgICAgICB2YXIgc2VjdG9yRnJvbVRvO1xyXG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRyaWxsTGV2ZWwgPiAxKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgIHJlZ2lvbk5hbWUgPSAoZGF0YS5yZWdpb25OYW1lKSA/IGRhdGEucmVnaW9uTmFtZSA6IFwiXCI7XHJcbiAgICAgICAgICAgICAgICBjb3VudHJ5RnJvbVRvID0gKGRhdGEuY291bnRyeUZyb20gJiYgZGF0YS5jb3VudHJ5VG8pID8gZGF0YS5jb3VudHJ5RnJvbSArICctJyArIGRhdGEuY291bnRyeVRvIDogXCJcIjtcclxuICAgICAgICAgICAgICAgIG93bk9hbEZsYWcgPSAoZGF0YS5vd25PYWwpID8gZGF0YS5vd25PYWwgOiBcIlwiO1xyXG4gICAgICAgICAgICAgICAgc2VjdG9yRnJvbVRvID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XHJcbiAgICAgICAgICAgICAgICBmbGlnaHROdW1iZXIgPSAoZGF0YS5mbGlnaHROdW1iZXIpID8gZGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cclxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxyXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcInN0cmluZ1wiLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXHJcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICAgICAgICAgIFwicmVnaW9uTmFtZVwiOiByZWdpb25OYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5RnJvbVRvXCI6IGNvdW50cnlGcm9tVG8sXHJcbiAgICAgICAgICAgICAgICBcIm93bk9hbEZsYWdcIjogb3duT2FsRmxhZyxcclxuICAgICAgICAgICAgICAgIFwic2VjdG9yRnJvbVRvXCI6IHNlY3RvckZyb21UbyxcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiAwXHJcbiAgICAgICAgICAgIH07ICBcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICdwYXNzZW5nZXItY291bnQnKSB7XHJcbiAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgIHZhciByZWdpb25OYW1lID0gKGRhdGEucmVnaW9uTmFtZSkgPyBkYXRhLnJlZ2lvbk5hbWUgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgY291bnRyeUZyb21UbyA9IChkYXRhLmNvdW50cnlGcm9tICYmIGRhdGEuY291bnRyeVRvKSA/IGRhdGEuY291bnRyeUZyb20gKyAnLScgKyBkYXRhLmNvdW50cnlUbyA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBvd25PYWxGbGFnID0gKGRhdGEub3duT2FsRmxhZykgPyBkYXRhLm93bk9hbEZsYWcgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgc2VjdG9yRnJvbVRvICA9IChkYXRhLnNlY3RvckZyb21UbykgPyBkYXRhLnNlY3RvckZyb21UbyA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBmbGlnaHROdW1iZXIgID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cclxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxyXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcInN0cmluZ1wiLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXHJcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICAgICAgICAgIFwicmVnaW9uTmFtZVwiOiByZWdpb25OYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5RnJvbVRvXCI6IGNvdW50cnlGcm9tVG8sXHJcbiAgICAgICAgICAgICAgICBcIm93bk9hbEZsYWdcIjogb3duT2FsRmxhZyxcclxuICAgICAgICAgICAgICAgIFwic2VjdG9yRnJvbVRvXCI6IHNlY3RvckZyb21UbyxcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiAwXHJcbiAgICAgICAgICAgIH07ICBcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlcWRhdGE7XHJcbiAgICB9XHJcbiAgICBnZXREcmlsbERvd25VUkwgKGRyaWxEb3duVHlwZSkge1xyXG4gICAgICAgIHZhciB1cmxcclxuICAgICAgICBzd2l0Y2goZHJpbERvd25UeXBlKXtcclxuICAgICAgICAgICAgY2FzZSAnYmFyJzpcclxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy9tc3BheG5ldHJldmRyaWxsXCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICd0YXJnZXQnOlxyXG4gICAgICAgICAgICAgICAgdXJsID0gXCIvcGF4ZmxubWlzL3RndHZzYWN0ZHJpbGxcIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2FuYWx5c2lzJzpcclxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy9uZXRyZXZlbnVlb3dub2FsZHJpbGxcIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ3Bhc3Nlbmdlci1jb3VudCc6XHJcbiAgICAgICAgICAgICAgICB1cmwgPSBcIi9wYXhmbG5taXMvbmV0cmV2ZW51ZW93bm9hbGRyaWxsXCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHVybDtcclxuICAgIH1cclxuICAgIG9wZW5CYXJEcmlsbERvd24oZGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgc2VsRmluZExldmVsID0gTnVtYmVyKHNlbEZpbmRMZXZlbCk7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWxdID0gZGF0YTtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsICsgMV0gPSAnJztcclxuICAgICAgICBcclxuICAgICAgICBpZiAoc2VsRmluZExldmVsICE9ICh0aGlzLmdyb3Vwcy5sZW5ndGggLSAxKSkge1xyXG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICAgICAgICAgIHZhciByZXFkYXRhID0gdGhpcy5kcmlsbERvd25SZXF1ZXN0KHRoaXMuZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpO1xyXG4gICAgICAgICAgICB2YXIgVVJMID0gdGhpcy5nZXREcmlsbERvd25VUkwodGhpcy5kcmlsbFR5cGUpO1xyXG4gICAgICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0RHJpbGxEb3duKHJlcWRhdGEsIFVSTClcclxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGRhdGEucmVzcG9uc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpbmRMZXZlbCA9IGRyaWxsTGV2ZWwgLSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEuc3RhdHVzKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5zdGF0dXMgPT0gJ3N1Y2Nlc3MnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSBkYXRhLmRhdGEucm93cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5vcmdJdGVtc1swXSA9IGRhdGEuZGF0YS5yb3dzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuc29ydCgncGF4Q291bnQnLCBmaW5kTGV2ZWwsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGRyaWxsTGV2ZWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuc2hvd25Hcm91cCA9IGZpbmRMZXZlbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGZpbmRMZXZlbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmNsb3Nlc1BvcG92ZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ1NlcnZlciBFcnJvcicpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaW5pdGlhdGVBcnJheShkcmlsbHRhYnMpIHtcclxuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIGkgaW4gZHJpbGx0YWJzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IGksXHJcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLmRyaWxsdGFic1tpXSxcclxuICAgICAgICAgICAgICAgIGl0ZW1zOiBbXSxcclxuICAgICAgICAgICAgICAgIG9yZ0l0ZW1zOiBbXSxcclxuICAgICAgICAgICAgICAgIEl0ZW1zQnlQYWdlOiBbXSxcclxuICAgICAgICAgICAgICAgIGZpcnN0Q29sdW1uczogdGhpcy5maXJzdENvbHVtbnNbaV1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBvcGVuQmFyRHJpbGxEb3duUG9wb3ZlcigkZXZlbnQsIHNlbERhdGEsIHNlbEZpbmRMZXZlbCkge1xyXG4gICAgICAgIHRoaXMuZHJpbGxOYW1lID0gJ01FVFJJQyBTTkFQU0hPVCBSRVBPUlQgLSAnICsgc2VsRGF0YS5wb2ludC5sYWJlbDtcclxuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdiYXInO1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XHJcbiAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ1JvdXRlIExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdEYXRhIExldmVsJywgJ0ZsaWdodCBMZXZlbCddO1xyXG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydyb3V0ZUNvZGUnLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2ZsaWdodERhdGUnXTtcclxuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgdGhhdC5kcmlsbEJhcnBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIH0sIDUwKTtcclxuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcclxuICAgIH07XHJcbiAgICBvcGVuVGFyZ2V0RHJpbGxEb3duUG9wb3ZlcigkZXZlbnQsIHNlbERhdGEsIHNlbEZpbmRMZXZlbCkge1xyXG4gICAgICAgIHRoaXMuZHJpbGxOYW1lID0gJ1RhcmdldCBWcyBBY3R1YWwnO1xyXG4gICAgICAgIHRoaXMuZHJpbGxUeXBlID0gJ3RhcmdldCc7XHJcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcclxuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnUm91dGUgVHlwZScsICdSb3V0ZSBjb2RlJ107XHJcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ3JvdXRldHlwZScsICdyb3V0ZWNvZGUnXTtcclxuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgdGhhdC5kcmlsbEJhcnBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIH0sIDUwKTtcclxuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcclxuICAgIH07XHJcblxyXG4gICAgb3BlblJldmVudWVEcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coc2VsRGF0YSk7XHJcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnTmV0IFJldmVudWUgYnkgT1dOIGFuZCBPQUwnO1xyXG4gICAgICAgIHRoaXMuZHJpbGxUeXBlID0gJ2FuYWx5c2lzJztcclxuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydDb3VudHJ5IExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdGbGlnaHQgTGV2ZWwnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcclxuICAgICAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsnY291bnRyeUZyb20nLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ25ldFJldmVudWUnXTtcclxuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcclxuICAgIH07XHJcblxyXG4gICAgb3BlblJldmVudWVQYXNzZW5nZXJEcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coc2VsRGF0YSk7XHJcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnUGFzc2VuZ2VyIENvdW50IGJ5IENsYXNzIG9mIFRyYXZlbCc7XHJcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAncGFzc2VuZ2VyLWNvdW50JztcclxuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydDb3VudHJ5IExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdGbGlnaHQgTGV2ZWwnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcclxuICAgICAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsnY291bnRyeUZyb20nLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ25ldFJldmVudWUnXTtcclxuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcclxuICAgIH07XHJcblxyXG4gICAgb3BlblBvcG92ZXIgKCRldmVudCwgaW5kZXgsIGNoYXJ0dHlwZSkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB0aGlzLmNoYXJ0VHlwZSA9IGNoYXJ0dHlwZTtcclxuICAgICAgICB0aGlzLmdyYXBoSW5kZXggPSBpbmRleDtcclxuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9ncmFwaC1wb3BvdmVyLmh0bWwnLCB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xyXG4gICAgICAgICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcclxuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG9wZW5TZWN0b3JQb3BvdmVyICgkZXZlbnQsaW5kZXgsY2hhcnR0eXBlKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuY2hhcnRUeXBlID0gY2hhcnR0eXBlO1xyXG4gICAgICAgIHRoaXMuZ3JhcGhJbmRleCA9IGluZGV4O1xyXG4gICAgICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL3NlY3Rvci1ncmFwaC1wb3BvdmVyLmh0bWwnLCB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xyXG4gICAgICAgICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcclxuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxTZWN0b3JDYXJyaWVyQW5hbHlzaXMgKCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgICAgICAgdG9nZ2xlMjogJycsXHJcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcblxyXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRTZWN0b3JDYXJyaWVyQW5hbHlzaXMocmVxZGF0YSlcclxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxyXG4gICAgICAgICAgICB2YXIganNvbk9iaiA9IGRhdGEucmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAgICAgXy5mb3JFYWNoKGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzLCBmdW5jdGlvbih2YWw6IGFueSwgaTogbnVtYmVyKXtcclxuICAgICAgICAgICAgICAgIHZhbFsnb3RoZXJzJ10gPSB2YWwuaXRlbXMuc3BsaWNlKC0xLCAxKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHZhciBzb3J0ZWREYXRhID0gXy5zb3J0QnkoanNvbk9iai5TZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuICAgICAgICAgICAgICAgIGlmICh1KSByZXR1cm4gW3UuZmF2b3JpdGVDaGFydFBvc2l0aW9uXTsgXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB2YXIgZmF2U2VjdG9yQ2FycmllclJlc3VsdCA9IF8uZmlsdGVyKHNvcnRlZERhdGEsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuICAgICAgICAgICAgICAgIGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGF0LlNlY3RvckNhcnJpZXJBbmFseXNpc0NoYXJ0cyA9IGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzO1xyXG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHRhcmdldEFjdHVhbEZpbHRlcih0aGF0OiBNaXNDb250cm9sbGVyKSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGl0ZW06IGFueSl7XHJcbiAgICAgICAgICAgIHJldHVybiBpdGVtLnRvZ2dsZTEgPT0gdGhhdC50b2dnbGUudGFyZ2V0UmV2T3JQYXg7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNlY3RvckNhcnJpZXJGaWx0ZXIodGhhdDogTWlzQ29udHJvbGxlcikge1xyXG4gICAgICAgdGhhdCA9IHRoaXMudGhhdDtcclxuICAgICAgIHJldHVybiBmdW5jdGlvbihpdGVtOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGl0ZW0udG9nZ2xlMSA9PSB0aGF0LnRvZ2dsZS5zZWN0b3JPcmRlciAmJiBpdGVtLnRvZ2dsZTIgPT0gdGhhdC50b2dnbGUuc2VjdG9yUmV2T3JQYXg7IFxyXG4gICAgICB9XHJcbiAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgcmV2ZW51ZUFuYWx5c2lzRmlsdGVyKGl0ZW06IGFueSkge1xyXG4gICAgICAgIHZhciBzdXJjaGFyZ2VGbGFnID0gKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyBcIllcIiA6IFwiTlwiO1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHN1cmNoYXJnZUZsYWcrJyA6ICcraXRlbSk7XHJcbiAgICAgICAgaWYoIGl0ZW0uc3VyY2hhcmdlRmxhZyA9PSBzdXJjaGFyZ2VGbGFnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlOyBcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEZsb3duRmF2b3JpdGVzKCkge1xyXG4gICAgICAgIHRoaXMuY2FsbE1ldHJpY1NuYXBzaG90KCk7XHJcbiAgICAgICAgdGhpcy5jYWxsVGFyZ2V0VnNBY3R1YWwoKTtcclxuICAgICAgICB0aGlzLmNhbGxSZXZlbnVlQW5hbHlzaXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBpb25pY0xvYWRpbmdTaG93KCkge1xyXG4gICAgICAgIHRoaXMuJGlvbmljTG9hZGluZy5zaG93KHtcclxuICAgICAgICAgICAgdGVtcGxhdGU6ICc8aW9uLXNwaW5uZXIgY2xhc3M9XCJzcGlubmVyLWNhbG1cIj48L2lvbi1zcGlubmVyPidcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgaW9uaWNMb2FkaW5nSGlkZSgpIHtcclxuICAgICAgICB0aGlzLiRpb25pY0xvYWRpbmcuaGlkZSgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBvcGVuRHJpbGxEb3duUG9wb3ZlcigkZXZlbnQscmVnaW9uRGF0YSxzZWxGaW5kTGV2ZWwpIHtcclxuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdyb3V0ZSc7XHJcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcclxuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnQ291bnRyeSBMZXZlbCcsICdTZWN0b3IgTGV2ZWwnLCAnRmxpZ2h0IExldmVsJywgJ0RvY3VtZW50IExldmVsJ107XHJcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2NvdW50cnlGcm9tJywnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2RvY3VtZW50IyddO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XHJcbiAgICAgICAgdGhpcy5kcmlsbHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIHRoaXMub3BlbkRyaWxsRG93bihyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNsb3Nlc1BvcG92ZXIoKSB7XHJcbiAgICAgICAgdGhpcy5kcmlsbHBvcG92ZXIuaGlkZSgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBpc0RyaWxsUm93U2VsZWN0ZWQobGV2ZWwsb2JqKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0ZWREcmlsbFtsZXZlbF0gPT0gb2JqO1xyXG4gICAgfVxyXG4gICAgc2VhcmNoUmVzdWx0cyAobGV2ZWwsb2JqKSB7XHJcbiAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy5maWx0ZXJlZExpc3RTZXJ2aWNlLnNlYXJjaGVkKHRoaXMuZ3JvdXBzW2xldmVsXS5vcmdJdGVtc1swXSwgb2JqLnNlYXJjaFRleHQsIGxldmVsLCB0aGlzLmRyaWxsVHlwZSk7XHJcbiAgICAgICAgaWYgKG9iai5zZWFyY2hUZXh0ID09ICcnKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVzZXRBbGwobGV2ZWwpOyBcclxuICAgICAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy5ncm91cHNbbGV2ZWxdLm9yZ0l0ZW1zWzBdO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IDA7XHJcbiAgICAgICAgdGhpcy5wYWdpbmF0aW9uKGxldmVsKTsgXHJcbiAgICB9XHJcbiAgICBwYWdpbmF0aW9uIChsZXZlbCkge1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5JdGVtc0J5UGFnZSA9IHRoaXMuZmlsdGVyZWRMaXN0U2VydmljZS5wYWdlZCh0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0sIHRoaXMucGFnZVNpemUgKTtcclxuICAgIH07XHJcblxyXG4gICAgc2V0UGFnZSAobGV2ZWwsIHBhZ2Vubykge1xyXG4gICAgICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gcGFnZW5vO1xyXG4gICAgfTtcclxuICAgIGxhc3RQYWdlKGxldmVsKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UubGVuZ3RoIC0gMTtcclxuICAgIH07XHJcbiAgICByZXNldEFsbChsZXZlbCkge1xyXG4gICAgICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcclxuICAgIH1cclxuICAgIHNvcnQoc29ydEJ5LGxldmVsLG9yZGVyKSB7XHJcbiAgICAgICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XHJcbiAgICAgICAgdGhpcy5jb2x1bW5Ub09yZGVyID0gc29ydEJ5OyBcclxuICAgICAgICAvLyRGaWx0ZXIgLSBTdGFuZGFyZCBTZXJ2aWNlXHJcbiAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy4kZmlsdGVyKCdvcmRlckJ5JykodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLmNvbHVtblRvT3JkZXIsIG9yZGVyKTsgXHJcbiAgICAgICAgdGhpcy5wYWdpbmF0aW9uKGxldmVsKTsgICAgXHJcbiAgICB9O1xyXG4gICAgcmFuZ2UodG90YWwsIGxldmVsKSB7XHJcbiAgICAgICAgdmFyIHJldCA9IFtdO1xyXG4gICAgICAgIHZhciBzdGFydDogbnVtYmVyO1xyXG4gICAgICAgIHN0YXJ0ID0gMDtcclxuICAgICAgICBpZih0b3RhbCA+IDUpIHtcclxuICAgICAgICAgICAgc3RhcnQgPSBOdW1iZXIodGhpcy5jdXJyZW50UGFnZVtsZXZlbF0pIC0gMjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoc3RhcnQgPCAwKSB7XHJcbiAgICAgICAgICBzdGFydCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBrID0gMTtcclxuICAgICAgICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCB0b3RhbDsgaSsrKSB7XHJcbiAgICAgICAgICByZXQucHVzaChpKTtcclxuICAgICAgICAgIGsrKztcclxuICAgICAgICAgIGlmIChrID4gNikge1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJldDtcclxuICAgIH1cclxuXHJcbiAgICB0b2dnbGVHcm91cCAoZ3JvdXApIHtcclxuICAgICAgICBpZiAodGhpcy5pc0dyb3VwU2hvd24oZ3JvdXApKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvd25Hcm91cCA9IG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5zaG93bkdyb3VwID0gZ3JvdXA7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaXNHcm91cFNob3duKGdyb3VwOiBudW1iZXIpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zaG93bkdyb3VwID09IGdyb3VwO1xyXG4gICAgfVxyXG5cdHRvZ2dsZUNoYXJ0T3JUYWJsZVZpZXcodmFsOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLnRvZ2dsZS5jaGFydE9yVGFibGUgPSB2YWw7XHJcbiAgICB9XHJcbiAgICB0b2dnbGVUYXJnZXRWaWV3KHZhbDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUudGFyZ2V0VmlldyA9IHZhbDtcclxuICAgIH1cclxuICAgIHRvZ2dsZVJldmVudWVWaWV3KHZhbDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUucmV2ZW51ZVZpZXcgPSB2YWw7XHJcbiAgICB9XHJcbiAgICB0b2dnbGVTZWN0b3JWaWV3KHZhbDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUuc2VjdG9yVmlldyA9IHZhbDtcclxuICAgIH1cclxuXHRydW5SZXBvcnQoY2hhcnRUaXRsZTogc3RyaW5nLG1vbnRoT3JZZWFyOiBzdHJpbmcsZmxvd25Nb250aDogc3RyaW5nKXtcclxuXHRcdHZhciB0aGF0ID0gdGhpcztcclxuXHRcdC8vaWYgbm8gY29yZG92YSwgdGhlbiBydW5uaW5nIGluIGJyb3dzZXIgYW5kIG5lZWQgdG8gdXNlIGRhdGFVUkwgYW5kIGlmcmFtZVxyXG5cdFx0aWYgKCF3aW5kb3cuY29yZG92YSkge1xyXG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHRcdFx0dGhpcy5yZXBvcnRTdmMucnVuUmVwb3J0RGF0YVVSTChjaGFydFRpdGxlLG1vbnRoT3JZZWFyLGZsb3duTW9udGgpXHJcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZGF0YVVSTCkge1xyXG5cdFx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0XHQvL3NldCB0aGUgaWZyYW1lIHNvdXJjZSB0byB0aGUgZGF0YVVSTCBjcmVhdGVkXHJcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKGRhdGFVUkwpO1xyXG5cdFx0XHRcdFx0Ly9kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGRmSW1hZ2UnKS5zcmMgPSBkYXRhVVJMO1xyXG5cdFx0XHRcdFx0d2luZG93Lm9wZW4oZGF0YVVSTCxcIl9zeXN0ZW1cIik7XHJcblx0XHRcdFx0fSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuXHRcdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdC8vaWYgY29kcm92YSwgdGhlbiBydW5uaW5nIGluIGRldmljZS9lbXVsYXRvciBhbmQgYWJsZSB0byBzYXZlIGZpbGUgYW5kIG9wZW4gdy8gSW5BcHBCcm93c2VyXHJcblx0XHRlbHNlIHtcclxuXHRcdFx0dGhhdC5pb25pY0xvYWRpbmdTaG93KCk7XHJcblx0XHRcdHRoaXMucmVwb3J0U3ZjLnJ1blJlcG9ydEFzeW5jKGNoYXJ0VGl0bGUsbW9udGhPclllYXIsZmxvd25Nb250aClcclxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihmaWxlUGF0aCkge1xyXG5cdFx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0XHQvL2xvZyB0aGUgZmlsZSBsb2NhdGlvbiBmb3IgZGVidWdnaW5nIGFuZCBvb3BlbiB3aXRoIGluYXBwYnJvd3NlclxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3JlcG9ydCBydW4gb24gZGV2aWNlIHVzaW5nIEZpbGUgcGx1Z2luJyk7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnUmVwb3J0Q3RybDogT3BlbmluZyBQREYgRmlsZSAoJyArIGZpbGVQYXRoICsgJyknKTtcclxuXHRcdFx0XHRcdHZhciBsYXN0UGFydCA9IGZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKTtcclxuXHRcdFx0XHRcdHZhciBmaWxlTmFtZSA9IFwiL21udC9zZGNhcmQvXCIrbGFzdFBhcnQ7XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0aWYoZGV2aWNlLnBsYXRmb3JtICE9XCJBbmRyb2lkXCIpXHJcblx0XHRcdFx0XHRmaWxlTmFtZSA9IGZpbGVQYXRoO1xyXG5cdFx0XHRcdFx0Ly93aW5kb3cub3BlblBERihmaWxlTmFtZSk7XHJcblx0XHRcdFx0XHQvL2Vsc2VcclxuXHRcdFx0XHRcdC8vd2luZG93Lm9wZW4oZmlsZVBhdGgsICdfYmxhbmsnLCAnbG9jYXRpb249bm8sY2xvc2VidXR0b25jYXB0aW9uPUNsb3NlLGVuYWJsZVZpZXdwb3J0U2NhbGU9eWVzJyk7Ki9cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdGNvcmRvdmEucGx1Z2lucy5maWxlT3BlbmVyMi5vcGVuKFxyXG5cdFx0XHRcdFx0XHRmaWxlTmFtZSwgXHJcblx0XHRcdFx0XHRcdCdhcHBsaWNhdGlvbi9wZGYnLCBcclxuXHRcdFx0XHRcdFx0eyBcclxuXHRcdFx0XHRcdFx0XHRlcnJvciA6IGZ1bmN0aW9uKGUpIHsgXHJcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnRXJyb3Igc3RhdHVzOiAnICsgZS5zdGF0dXMgKyAnIC0gRXJyb3IgbWVzc2FnZTogJyArIGUubWVzc2FnZSk7XHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRzdWNjZXNzIDogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2ZpbGUgb3BlbmVkIHN1Y2Nlc3NmdWxseScpOyAgICAgICAgICAgICAgICBcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuXHRcdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vc2VydmljZXMvT3BlcmF0aW9uYWxTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIgLz5cclxuXHJcbmludGVyZmFjZSB0YWJPYmplY3Qge1xyXG4gICAgdGl0bGU6IHN0cmluZyxcclxuICAgIG5hbWVzOiBzdHJpbmcsXHJcbiAgICBpY29uOiBzdHJpbmdcclxufVxyXG5cclxuaW50ZXJmYWNlIHRvZ2dsZU9iamVjdCB7XHJcbiAgICBtb250aE9yWWVhcjogc3RyaW5nLFxyXG4gICAgb3Blbk9yQ2xvc2VkOiBzdHJpbmcsXHJcbiAgICBmbGlnaHRTdGF0dXM6IHN0cmluZyxcclxuICAgIGZsaWdodFJlYXNvbjogc3RyaW5nLFxyXG4gICAgY2NFeGNlcHRpb246IHN0cmluZ1xyXG59XHJcblxyXG5pbnRlcmZhY2UgaGVhZGVyT2JqZWN0IHtcclxuICAgIGZsb3duTW9udGg6IHN0cmluZyxcclxuICAgIHRhYkluZGV4OiBudW1iZXIsXHJcbiAgICB1c2VyTmFtZTogc3RyaW5nXHJcbn1cclxuXHJcbmNsYXNzIE9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyIHtcclxuICBwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzdGF0ZScsICckc2NvcGUnLCAnJGlvbmljTG9hZGluZycsICckaW9uaWNQb3BvdmVyJywgJyRmaWx0ZXInLFxyXG4gICAgJ09wZXJhdGlvbmFsU2VydmljZScsICckaW9uaWNTbGlkZUJveERlbGVnYXRlJywgJyR0aW1lb3V0JywgJyR3aW5kb3cnLCAnUmVwb3J0U3ZjJywgJ0ZpbHRlcmVkTGlzdFNlcnZpY2UnLCAnVXNlclNlcnZpY2UnLCAnJGlvbmljSGlzdG9yeScsICdHUkFQSF9DT0xPUlMnLCAnVEFCUycsICckaW9uaWNQb3B1cCddO1xyXG4gIHByaXZhdGUgdGFiczogW3RhYk9iamVjdF07XHJcbiAgcHJpdmF0ZSB0b2dnbGU6IHRvZ2dsZU9iamVjdDtcclxuICBwcml2YXRlIGhlYWRlcjogaGVhZGVyT2JqZWN0O1xyXG4gIHByaXZhdGUgc3ViSGVhZGVyOiBhbnk7XHJcbiAgcHJpdmF0ZSBmbGlnaHRQcm9jU3RhdHVzOiBhbnk7XHJcbiAgcHJpdmF0ZSBmYXZGbGlnaHRQcm9jUmVzdWx0OiBhbnk7XHJcbiAgcHJpdmF0ZSBjYXJvdXNlbEluZGV4OiBudW1iZXIgPSAwO1xyXG4gIHByaXZhdGUgZmxpZ2h0Q291bnRSZWFzb246IGFueTtcclxuICBwcml2YXRlIGNvdXBvbkNvdW50RXhjZXB0aW9uOiBhbnk7XHJcbiAgcHJpdmF0ZSBjaGFydHR5cGU6IHN0cmluZztcclxuICBwcml2YXRlIGdyYXBoVHlwZTogc3RyaW5nO1xyXG4gIHByaXZhdGUgZ3JhcGhwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcclxuICBwcml2YXRlIHBvcG92ZXJzaG93bjogYm9vbGVhbjtcclxuICBwcml2YXRlIHRocmVlQmFyQ2hhcnRDb2xvcnM6IFtzdHJpbmddID0gdGhpcy5HUkFQSF9DT0xPUlMuVEhSRUVfQkFSU19DSEFSVDtcclxuICBwcml2YXRlIGZvdXJCYXJDaGFydENvbG9yczogW3N0cmluZ10gPSB0aGlzLkdSQVBIX0NPTE9SUy5GT1VSX0JBUlNfQ0hBUlQ7XHJcblxyXG4gIHByaXZhdGUgaW5mb3BvcG92ZXI6IElvbmljLklQb3BvdmVyO1xyXG4gIHByaXZhdGUgaW5mb2RhdGE6IHN0cmluZztcclxuICBwcml2YXRlIGZsaWdodFByb2NTZWN0aW9uOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBmbGlnaHRDb3VudFNlY3Rpb246IHN0cmluZztcclxuICBwcml2YXRlIGNvdXBvbkNvdW50U2VjdGlvbjogc3RyaW5nO1xyXG4gIHByaXZhdGUgY3VycmVudEluZGV4OiBudW1iZXI7XHJcblxyXG4gIHByaXZhdGUgcGFnZVNpemUgPSA0O1xyXG4gIHByaXZhdGUgY3VycmVudFBhZ2UgPSBbXTtcclxuICBwcml2YXRlIHNlbGVjdGVkRHJpbGwgPSBbXTtcclxuICBwcml2YXRlIGdyb3VwcyA9IFtdO1xyXG4gIHByaXZhdGUgY29sdW1uVG9PcmRlcjogc3RyaW5nO1xyXG4gIHByaXZhdGUgc2hvd25Hcm91cDogbnVtYmVyO1xyXG4gIHByaXZhdGUgZHJpbGxUeXBlOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBkcmlsbEJhckxhYmVsOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBleGNlcHRpb25DYXRlZ29yeTogc3RyaW5nO1xyXG4gIHByaXZhdGUgZHJpbGx0YWJzOiBzdHJpbmdbXTtcclxuICBwcml2YXRlIGRyaWxsTmFtZTogc3RyaW5nO1xyXG4gIHByaXZhdGUgZmlyc3RDb2x1bW5zOiBzdHJpbmdbXTtcclxuICBwcml2YXRlIGRyaWxscG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XHJcblxyXG4gIHByaXZhdGUgZmxpZ2h0Q291bnRMZWdlbmRzOiBhbnk7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgJHN0YXRlOiBhbmd1bGFyLnVpLklTdGF0ZVNlcnZpY2UsIHByaXZhdGUgJHNjb3BlOiBuZy5JU2NvcGUsXHJcbiAgICBwcml2YXRlICRpb25pY0xvYWRpbmc6IElvbmljLklMb2FkaW5nLFxyXG4gICAgcHJpdmF0ZSAkaW9uaWNQb3BvdmVyOiBJb25pYy5JUG9wb3ZlciwgcHJpdmF0ZSAkZmlsdGVyOiBuZy5JRmlsdGVyU2VydmljZSxcclxuICAgIHByaXZhdGUgb3BlcmF0aW9uYWxTZXJ2aWNlOiBPcGVyYXRpb25hbFNlcnZpY2UsXHJcbiAgICBwcml2YXRlICRpb25pY1NsaWRlQm94RGVsZWdhdGU6IElvbmljLklTbGlkZUJveERlbGVnYXRlLFxyXG4gICAgcHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLCBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxyXG4gICAgcHJpdmF0ZSByZXBvcnRTdmM6IFJlcG9ydFN2YywgcHJpdmF0ZSBmaWx0ZXJlZExpc3RTZXJ2aWNlOiBGaWx0ZXJlZExpc3RTZXJ2aWNlLFxyXG4gICAgcHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UsIHByaXZhdGUgJGlvbmljSGlzdG9yeTogYW55LCBwcml2YXRlIEdSQVBIX0NPTE9SUzogc3RyaW5nLCBwcml2YXRlIFRBQlM6IHN0cmluZywgcHJpdmF0ZSAkaW9uaWNQb3B1cDogSW9uaWMuSVBvcHVwKSB7XHJcbiAgICAgIFxyXG4gICAgdGhpcy50YWJzID0gdGhpcy5UQUJTLkRCMl9UQUJTO1xyXG5cclxuICAgIHRoaXMudG9nZ2xlID0ge1xyXG4gICAgICBtb250aE9yWWVhcjogJ21vbnRoJyxcclxuICAgICAgb3Blbk9yQ2xvc2VkOiAnT1BFTicsXHJcbiAgICAgIGZsaWdodFN0YXR1czogJ2NoYXJ0JyxcclxuICAgICAgZmxpZ2h0UmVhc29uOiAnY2hhcnQnLFxyXG4gICAgICBjY0V4Y2VwdGlvbjogJ2NoYXJ0J1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmhlYWRlciA9IHtcclxuICAgICAgZmxvd25Nb250aDogJycsXHJcbiAgICAgIHRhYkluZGV4OiAwLFxyXG4gICAgICB1c2VyTmFtZTogJydcclxuICAgIH07XHJcbiAgYW5ndWxhci5lbGVtZW50KHdpbmRvdykuYmluZCgnb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLm9yaWVudGF0aW9uQ2hhbmdlKTsgXHJcbiAgICB0aGlzLmluaXREYXRhKCk7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICB0aGlzLiRzY29wZS4kb24oJ29uU2xpZGVNb3ZlJywgKGV2ZW50OiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcclxuICAgICAgICAgIHRoYXQuJHNjb3BlLk9wckN0cmwub25TbGlkZU1vdmUocmVzcG9uc2UpO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHRoaXMuJHNjb3BlLiRvbignJGlvbmljVmlldy5lbnRlcicsICgpID0+IHtcclxuICAgICAgICBpZiAoIXRoYXQudXNlclNlcnZpY2Uuc2hvd0Rhc2hib2FyZCgnT3BlcmF0aW9uYWwnKSkge1xyXG4gICAgICAgICAgdGhhdC4kc3RhdGUuZ28oXCJsb2dpblwiKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdGhpcy4kc2NvcGUuJG9uKCdvcGVuRHJpbGxQb3B1cDEnLCAoZXZlbnQ6IGFueSwgcmVzcG9uc2U6IGFueSkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlLnR5cGUpO1xyXG4gICAgICAgIGlmIChyZXNwb25zZS50eXBlID09ICdmbGlnaHQtcHJvY2VzcycpIHtcclxuICAgICAgICAgIHRoaXMuJHNjb3BlLk9wckN0cmwub3BlbkZsaWdodFByb2Nlc3NEcmlsbFBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ2NvdXBvbi1jb3VudCcpIHtcclxuICAgICAgICAgIHRoaXMuJHNjb3BlLk9wckN0cmwub3BlbkNvdW5wb25Db3VudERyaWxsUG9wb3ZlcihyZXNwb25zZS5ldmVudCwgeyBcInBvaW50XCI6IHJlc3BvbnNlLmRhdGEgfSwgLTEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAnZmxpZ2h0LWNvdW50Jykge1xyXG4gICAgICAgICAgdGhpcy4kc2NvcGUuT3ByQ3RybC5vcGVuRmxpZ2h0Q291bnREcmlsbFBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgaW5pdERhdGEoKSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9kcmlsZG93bi5odG1sJywge1xyXG4gICAgICBzY29wZTogdGhhdC4kc2NvcGVcclxuICAgIH0pLnRoZW4oZnVuY3Rpb24oZHJpbGxwb3BvdmVyKSB7XHJcbiAgICAgIHRoYXQuZHJpbGxwb3BvdmVyID0gZHJpbGxwb3BvdmVyO1xyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vaW5mb3Rvb2x0aXAuaHRtbCcsIHtcclxuICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXHJcbiAgICB9KS50aGVuKGZ1bmN0aW9uKGluZm9wb3BvdmVyKSB7XHJcbiAgICAgIHRoYXQuaW5mb3BvcG92ZXIgPSBpbmZvcG9wb3ZlcjtcclxuICAgIH0pO1xyXG5cclxuICAgIHZhciByZXEgPSB7XHJcbiAgICAgIHVzZXJJZDogdGhhdC4kd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdyYXBpZE1vYmlsZS51c2VyJylcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmVxLnVzZXJJZCAhPSBcIm51bGxcIikge1xyXG4gICAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRQYXhGbG93bk9wckhlYWRlcihyZXEpLnRoZW4oXHJcbiAgICAgICAgKGRhdGEpID0+IHtcclxuICAgICAgICAgIHRoYXQuc3ViSGVhZGVyID0gZGF0YS5yZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgLy8gY29uc29sZS5sb2codGhhdC5zdWJIZWFkZXIucGF4Rmxvd25PcHJNb250aHMpO1xyXG4gICAgICAgICAgdGhhdC5oZWFkZXIuZmxvd25Nb250aCA9IHRoYXQuc3ViSGVhZGVyLmRlZmF1bHRNb250aDtcclxuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoYXQuaGVhZGVyLmZsb3duTW9udGgpO1xyXG4gICAgICAgICAgdGhhdC5vblNsaWRlTW92ZSh7IGluZGV4OiAwIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgdGhhdC5oZWFkZXIudXNlck5hbWUgPSB0aGF0LmdldFByb2ZpbGVVc2VyTmFtZSgpO1xyXG4gIH1cclxuICBzZWxlY3RlZEZsb3duTW9udGgobW9udGg6IHN0cmluZykge1xyXG4gICAgcmV0dXJuIChtb250aCA9PSB0aGlzLmhlYWRlci5mbG93bk1vbnRoKTtcclxuICB9XHJcblxyXG4gIGdldFByb2ZpbGVVc2VyTmFtZSgpOiBzdHJpbmcge1xyXG4gICAgaWYgKHRoaXMudXNlclNlcnZpY2UuaXNVc2VyTG9nZ2VkSW4oKSkge1xyXG4gICAgICB2YXIgb2JqID0gdGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdyYXBpZE1vYmlsZS51c2VyJyk7XHJcbiAgICAgIGlmIChvYmogIT0gJ251bGwnKSB7XHJcbiAgICAgICAgdmFyIHByb2ZpbGVVc2VyTmFtZSA9IEpTT04ucGFyc2Uob2JqKTtcclxuICAgICAgICByZXR1cm4gcHJvZmlsZVVzZXJOYW1lLnVzZXJuYW1lO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG4gIFxyXG4gIG9yaWVudGF0aW9uQ2hhbmdlID0gKCk6IGJvb2xlYW4gPT4ge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdGhhdC4kdGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgdGhhdC5vblNsaWRlTW92ZSh7IGluZGV4OiB0aGF0LmhlYWRlci50YWJJbmRleCB9KTtcclxuICAgIH0sIDIwMClcclxuICB9XHJcblxyXG4gIHVwZGF0ZUhlYWRlcigpIHtcclxuICAgIHZhciBmbG93bk1vbnRoID0gdGhpcy5oZWFkZXIuZmxvd25Nb250aDtcclxuICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XHJcbiAgfVxyXG5cclxuXHJcbiAgb25TbGlkZU1vdmUoZGF0YTogYW55KSB7XHJcbiAgICB0aGlzLmhlYWRlci50YWJJbmRleCA9IGRhdGEuaW5kZXg7XHJcbiAgICB0aGlzLnRvZ2dsZS5jaGFydE9yVGFibGUgPSBcImNoYXJ0XCI7XHJcbiAgICBzd2l0Y2ggKHRoaXMuaGVhZGVyLnRhYkluZGV4KSB7XHJcbiAgICAgIGNhc2UgMDpcclxuICAgICAgICB0aGlzLmNhbGxNeURhc2hib2FyZCgpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDE6XHJcbiAgICAgICAgdGhpcy5jYWxsRmxpZ2h0UHJvY1N0YXR1cygpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDI6XHJcbiAgICAgICAgdGhpcy5jYWxsRmxpZ2h0Q291bnRCeVJlYXNvbigpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDM6XHJcbiAgICAgICAgdGhpcy5jYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbigpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH07XHJcbiAgY2FsbE15RGFzaGJvYXJkKCkge1xyXG4gICAgdGhpcy5jYWxsRmxpZ2h0UHJvY1N0YXR1cygpO1xyXG4gICAgdGhpcy5jYWxsRmxpZ2h0Q291bnRCeVJlYXNvbigpO1xyXG4gICAgdGhpcy5jYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbigpO1xyXG4gIH1cclxuICBjYWxsRmxpZ2h0UHJvY1N0YXR1cygpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJOYW1lLFxyXG4gICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgZnVsbERhdGFGbGFnOiAnTidcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJGbGlnaHRQcm9jU3RhdHVzKHJlcWRhdGEpXHJcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdGlmKGRhdGEucmVzcG9uc2Uuc3RhdHVzID09PSBcInN1Y2Nlc3NcIiAmJiBkYXRhLnJlc3BvbnNlLmRhdGEuaGFzT3duUHJvcGVydHkoJ3NlY3Rpb25OYW1lJykpe1x0XHQgIFxyXG5cdFx0XHR2YXIgb3RoZXJDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuRk9VUl9CQVJTX0NIQVJUWzBdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5GT1VSX0JBUlNfQ0hBUlRbMV0gfSxcclxuXHRcdFx0ICB7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuRk9VUl9CQVJTX0NIQVJUWzJdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5GT1VSX0JBUlNfQ0hBUlRbM10gfV07XHJcblx0XHRcdHZhciBwaWVDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuVEhSRUVfQkFSU19DSEFSVFswXSB9LCB7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuVEhSRUVfQkFSU19DSEFSVFsxXSB9LCB7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuVEhSRUVfQkFSU19DSEFSVFsyXSB9XTtcclxuXHJcblx0XHRcdHZhciBqc29uT2JqID0gdGhhdC5hcHBseUNoYXJ0Q29sb3JDb2RlcyhkYXRhLnJlc3BvbnNlLmRhdGEsIHBpZUNoYXJ0Q29sb3JzLCBvdGhlckNoYXJ0Q29sb3JzKTtcclxuXHRcdFx0dGhhdC5mbGlnaHRQcm9jU2VjdGlvbiA9IGpzb25PYmouc2VjdGlvbk5hbWU7XHJcblx0XHRcdHZhciBwaWVDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLnBpZUNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XHJcblx0XHRcdCAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuXHRcdFx0fSk7XHJcblx0XHRcdHZhciBtdWx0aUNoYXJ0cyA9IF8uZmlsdGVyKGpzb25PYmoubXVsdGliYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xyXG5cdFx0XHQgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHR2YXIgc3RhY2tDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLnN0YWNrZWRCYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xyXG5cdFx0XHQgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XHJcblx0XHRcdH0pOyAgICAgICAgICBcclxuXHRcdFx0Ly8gY29uc29sZS5sb2coc3RhY2tDaGFydHMpO1xyXG5cdFx0XHRpZiAodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xyXG5cdFx0XHQgIHRoYXQuZmxpZ2h0UHJvY1N0YXR1cyA9IHtcclxuXHRcdFx0XHRwaWVDaGFydDogcGllQ2hhcnRzWzBdLFxyXG5cdFx0XHRcdHdlZWtEYXRhOiBtdWx0aUNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsXHJcblx0XHRcdFx0c3RhY2tlZENoYXJ0OiAoc3RhY2tDaGFydHMubGVuZ3RoKSA/IHN0YWNrQ2hhcnRzWzBdIDogW11cclxuXHRcdFx0ICB9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdCAgdGhhdC5mbGlnaHRQcm9jU3RhdHVzID0ge1xyXG5cdFx0XHRcdHBpZUNoYXJ0OiBqc29uT2JqLnBpZUNoYXJ0c1swXSxcclxuXHRcdFx0XHR3ZWVrRGF0YToganNvbk9iai5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsXHJcblx0XHRcdFx0c3RhY2tlZENoYXJ0OiBqc29uT2JqLnN0YWNrZWRCYXJDaGFydHNbMF1cclxuXHRcdFx0ICB9XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gY29uc29sZS5sb2coc3RhY2tDaGFydHMpO1xyXG5cdFx0XHR0aGF0LiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHQgIHRoYXQuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpLnVwZGF0ZSgpO1xyXG5cdFx0XHR9LCAwKTtcclxuXHRcdFx0Ly8gY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodGhhdC5mbGlnaHRQcm9jU3RhdHVzLndlZWtEYXRhKSk7XHJcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0fWVsc2V7XHJcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0XHR0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcclxuXHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcclxuXHRcdFx0XHRjb250ZW50OiAnRGF0YSBub3QgZm91bmQgZm9yIEZsaWdodHMgUHJvY2Vzc2luZyBTdGF0dXMhISEnXHJcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2RvbmUnKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0fVxyXG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICB9KTtcclxuICB9XHJcbiAgY2FsbEZsaWdodENvdW50QnlSZWFzb24oKSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VyTmFtZSxcclxuICAgICAgdG9nZ2xlMTogdGhpcy50b2dnbGUub3Blbk9yQ2xvc2VkLnRvTG93ZXJDYXNlKCksXHJcbiAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXHJcbiAgICB9O1xyXG4gICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJGbGlnaHRDb3VudEJ5UmVhc29uKHJlcWRhdGEpXHJcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgaWYgKGRhdGEucmVzcG9uc2Uuc3RhdHVzID09PSBcInN1Y2Nlc3NcIiAmJiBkYXRhLnJlc3BvbnNlLmRhdGEuaGFzT3duUHJvcGVydHkoJ3NlY3Rpb25OYW1lJykpIHtcdFxyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhqc29uT2JqLnBpZUNoYXJ0c1swXSk7XHJcblx0XHRcdHZhciBvdGhlckNoYXJ0Q29sb3JzID0gW3sgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fT1RIX0NPTE9SUzFbMF0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19PVEhfQ09MT1JTMVsxXSB9LCB7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX09USF9DT0xPUlMxWzJdIH1dO1xyXG5cdFx0XHR2YXIgcGllQ2hhcnRDb2xvcnMgPSBbeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVswXSB9LCB7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxWzFdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMl0gfV07XHJcblxyXG5cdFx0XHR0aGF0LmZsaWdodENvdW50TGVnZW5kcyA9IGRhdGEucmVzcG9uc2UuZGF0YS5sZWdlbmRzO1xyXG5cclxuXHRcdFx0dmFyIGpzb25PYmogPSB0aGF0LmFwcGx5Q2hhcnRDb2xvckNvZGVzKGRhdGEucmVzcG9uc2UuZGF0YSwgcGllQ2hhcnRDb2xvcnMsIG90aGVyQ2hhcnRDb2xvcnMpO1xyXG5cdFx0XHR0aGF0LmZsaWdodENvdW50U2VjdGlvbiA9IGpzb25PYmouc2VjdGlvbk5hbWU7XHJcblx0XHRcdGlmICh0aGF0LmhlYWRlci50YWJJbmRleCA9PSAwKSB7XHJcblx0XHRcdCAgdGhhdC5mbGlnaHRDb3VudFJlYXNvbiA9IHRoYXQuZ2V0RmF2b3JpdGVJdGVtcyhqc29uT2JqKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0ICB0aGF0LmZsaWdodENvdW50UmVhc29uID0ge1xyXG5cdFx0XHRcdHBpZUNoYXJ0OiBqc29uT2JqLnBpZUNoYXJ0c1swXSxcclxuXHRcdFx0XHR3ZWVrRGF0YToganNvbk9iai5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsXHJcblx0XHRcdFx0c3RhY2tlZENoYXJ0OiBqc29uT2JqLnN0YWNrZWRCYXJDaGFydHNbMF1cclxuXHRcdFx0ICB9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoYXQuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdCAgdGhhdC4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykudXBkYXRlKCk7XHJcblx0XHRcdH0sIDApO1xyXG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuXHRcdH1lbHNle1xyXG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XHJcbiAgICAgICAgdGl0bGU6ICdFcnJvcicsXHJcbiAgICAgICAgY29udGVudDogJ0RhdGEgbm90IGZvdW5kIGZvciBGbGlnaHRzIENvdW50IGJ5IFJlYXNvbiEhISdcclxuICAgICAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdkb25lJyk7XHJcbiAgICAgIH0pO1xyXG5cclxuXHRcdH1cclxuICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICBjYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbigpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJOYW1lLFxyXG4gICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgZnVsbERhdGFGbGFnOiAnTidcclxuICAgIH07XHJcbiAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckNvdXBvbkNvdW50QnlFeGNlcHRpb24ocmVxZGF0YSlcclxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICBpZiAoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiICYmIGRhdGEucmVzcG9uc2UuZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc2VjdGlvbk5hbWUnKSkge1xyXG5cdFx0XHR2YXIgb3RoZXJDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxWzBdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMV0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVsyXSB9XTtcclxuXHRcdFx0dmFyIHBpZUNoYXJ0Q29sb3JzID0gW3sgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMF0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVsxXSB9LCB7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxWzJdIH1dO1xyXG5cclxuXHRcdFx0dmFyIGpzb25PYmogPSB0aGF0LmFwcGx5Q2hhcnRDb2xvckNvZGVzKGRhdGEucmVzcG9uc2UuZGF0YSwgcGllQ2hhcnRDb2xvcnMsIG90aGVyQ2hhcnRDb2xvcnMpO1xyXG5cdFx0XHR0aGF0LmNvdXBvbkNvdW50U2VjdGlvbiA9IGpzb25PYmouc2VjdGlvbk5hbWU7XHJcblx0XHRcdGlmICh0aGF0LmhlYWRlci50YWJJbmRleCA9PSAwKSB7XHJcblx0XHRcdCAgdGhhdC5jb3Vwb25Db3VudEV4Y2VwdGlvbiA9IHRoYXQuZ2V0RmF2b3JpdGVJdGVtcyhqc29uT2JqKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0ICB0aGF0LmNvdXBvbkNvdW50RXhjZXB0aW9uID0ge1xyXG5cdFx0XHRcdHBpZUNoYXJ0OiBqc29uT2JqLnBpZUNoYXJ0c1swXSxcclxuXHRcdFx0XHR3ZWVrRGF0YToganNvbk9iai5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsXHJcblx0XHRcdFx0c3RhY2tlZENoYXJ0OiBqc29uT2JqLnN0YWNrZWRCYXJDaGFydHNbMF1cclxuXHRcdFx0ICB9XHJcblx0XHRcdH1cclxuXHRcdFx0dGhhdC4kdGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0ICB0aGF0LiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGEnKS51cGRhdGUoKTtcclxuXHRcdFx0fSwgMCk7XHJcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1x0XHRcclxuXHRcdH1lbHNle1xyXG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XHJcbiAgICAgICAgdGl0bGU6ICdFcnJvcicsXHJcbiAgICAgICAgY29udGVudDogJ0RhdGEgbm90IGZvdW5kIGZvciBDb3Vwb24gQ291bnQgYnkgRXhjZXB0aW9uIENhdGVnb3J5ISEhJ1xyXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ2RvbmUnKTtcclxuICAgICAgfSk7XHJcblxyXG5cdFx0fVxyXG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICB9KTtcclxuICB9XHJcbiAgb3BlblBvcG92ZXIoJGV2ZW50LCBjaGFydHR5cGUsIGluZGV4KSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB2YXIgdGVtcCA9IHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpO1xyXG4gICAgdGhhdC5jdXJyZW50SW5kZXggPSB0ZW1wLmN1cnJlbnRJbmRleCgpO1xyXG4gICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB0aGlzLmNoYXJ0dHlwZSA9IGNoYXJ0dHlwZTtcclxuICAgIHRoaXMuZ3JhcGhUeXBlID0gaW5kZXg7XHJcbiAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL2dyYXBoLXBvcG92ZXIuaHRtbCcsIHtcclxuICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXHJcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHBvcG92ZXIpIHtcclxuICAgICAgdGhhdC5wb3BvdmVyc2hvd24gPSB0cnVlO1xyXG4gICAgICB0aGF0LmdyYXBocG9wb3ZlciA9IHBvcG92ZXI7XHJcbiAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgIH0pO1xyXG4gIH1cclxuICBvcGVuUGllUG9wb3ZlcigkZXZlbnQsIGNoYXJ0dHlwZSwgaW5kZXgpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgdGhpcy5jaGFydHR5cGUgPSBjaGFydHR5cGU7XHJcbiAgICB0aGlzLmdyYXBoVHlwZSA9IGluZGV4O1xyXG4gICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9waWUtcG9wb3Zlci5odG1sJywge1xyXG4gICAgICBzY29wZTogdGhhdC4kc2NvcGVcclxuICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xyXG4gICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XHJcbiAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcclxuICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBjbG9zZVBvcG92ZXIoKSB7XHJcbiAgICB0aGlzLmdyYXBocG9wb3Zlci5oaWRlKCk7XHJcbiAgfTtcclxuICBpb25pY0xvYWRpbmdTaG93KCkge1xyXG4gICAgdGhpcy4kaW9uaWNMb2FkaW5nLnNob3coe1xyXG4gICAgICB0ZW1wbGF0ZTogJzxpb24tc3Bpbm5lciBjbGFzcz1cInNwaW5uZXItY2FsbVwiPjwvaW9uLXNwaW5uZXI+J1xyXG4gICAgfSk7XHJcbiAgfTtcclxuICBhcHBseUNoYXJ0Q29sb3JDb2Rlcyhqc29uT2JqOiBhbnksIHBpZUNoYXJ0Q29sb3JzOiBhbnksIG90aGVyQ2hhcnRDb2xvcnM6IGFueSkge1xyXG4gICAgXy5mb3JFYWNoKGpzb25PYmoucGllQ2hhcnRzWzBdLmRhdGEsIGZ1bmN0aW9uKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG4gICAgICBuLmxhYmVsID0gbi54dmFsO1xyXG4gICAgICBuLnZhbHVlID0gbi55dmFsO1xyXG4gICAgfSk7XHJcbiAgICBfLm1lcmdlKGpzb25PYmoucGllQ2hhcnRzWzBdLmRhdGEsIHBpZUNoYXJ0Q29sb3JzKTtcclxuICAgIF8ubWVyZ2UoanNvbk9iai5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsIG90aGVyQ2hhcnRDb2xvcnMpO1x0XHJcblx0aWYoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdLnN0YWNrZWRCYXJjaGFydEl0ZW1zLmxlbmd0aCA+PSAzKXtcclxuXHRcdF8ubWVyZ2UoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdLnN0YWNrZWRCYXJjaGFydEl0ZW1zLCBvdGhlckNoYXJ0Q29sb3JzKTtcclxuXHR9ZWxzZXtcclxuXHRcdHZhciB0ZW1wQ29sb3JzID0gW3sgXCJjb2xvclwiOiB0aGlzLkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMF0gfSwgeyBcImNvbG9yXCI6IHRoaXMuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVsxXSB9XTtcclxuXHRcdF8ubWVyZ2UoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdLnN0YWNrZWRCYXJjaGFydEl0ZW1zLCB0ZW1wQ29sb3JzKTtcclxuXHR9XHJcbiAgICByZXR1cm4ganNvbk9iajtcclxuXHJcbiAgfVxyXG4gIGdldEZhdm9yaXRlSXRlbXMoanNvbk9iajogYW55KSB7XHJcbiAgICB2YXIgcGllQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5waWVDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xyXG4gICAgICBpZiAodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG4gICAgfSk7XHJcbiAgICB2YXIgbXVsdGlDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLm11bHRpYmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcclxuICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgIH0pO1xyXG4gICAgdmFyIHN0YWNrQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcclxuICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcGllQ2hhcnQ6IHBpZUNoYXJ0c1swXSxcclxuICAgICAgd2Vla0RhdGE6IChtdWx0aUNoYXJ0cy5sZW5ndGgpID8gbXVsdGlDaGFydHMubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zIDogW10sXHJcbiAgICAgIHN0YWNrZWRDaGFydDogKHN0YWNrQ2hhcnRzLmxlbmd0aCkgPyBzdGFja0NoYXJ0c1swXSA6IFtdXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjb2xvckZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQsIGkpIHtcclxuICAgICAgcmV0dXJuIHRoYXQudGhyZWVCYXJDaGFydENvbG9yc1tpXTtcclxuICAgIH07XHJcbiAgfVxyXG4gIGZvdXJCYXJDb2xvckZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQsIGkpIHtcclxuICAgICAgcmV0dXJuIHRoYXQuZm91ckJhckNoYXJ0Q29sb3JzW2ldO1xyXG4gICAgfTtcclxuICB9XHJcbiAgb3BlbmluZm9Qb3BvdmVyKCRldmVudCwgaW5kZXgpIHtcclxuICAgIGlmICh0eXBlb2YgaW5kZXggPT0gXCJ1bmRlZmluZWRcIiB8fCBpbmRleCA9PSBcIlwiKSB7XHJcbiAgICAgIHRoaXMuaW5mb2RhdGEgPSAnTm8gaW5mbyBhdmFpbGFibGUnO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHRoaXMuaW5mb2RhdGEgPSBpbmRleDtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKGluZGV4KTtcclxuICAgIHRoaXMuaW5mb3BvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gIH07XHJcbiAgY2xvc2VJbmZvUG9wb3ZlcigpIHtcclxuICAgIHRoaXMuaW5mb3BvcG92ZXIuaGlkZSgpO1xyXG4gIH1cclxuICB0b2dnbGVDb3VudCh2YWwpIHtcclxuICAgIHRoaXMudG9nZ2xlLm9wZW5PckNsb3NlZCA9IHZhbDtcclxuICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XHJcbiAgfVxyXG4gIGlvbmljTG9hZGluZ0hpZGUoKSB7XHJcbiAgICB0aGlzLiRpb25pY0xvYWRpbmcuaGlkZSgpO1xyXG4gIH07XHJcbiAgbG9ja1NsaWRlKCkge1xyXG4gICAgY29uc29sZS5sb2coJ2luIGxvY2tTbGlkZSBtZWh0b2QuLicpO1xyXG4gICAgdGhpcy4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykuZW5hYmxlU2xpZGUoZmFsc2UpO1xyXG4gIH07XHJcbiAgd2Vla0RhdGFQcmV2KCkge1xyXG4gICAgdGhpcy4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykucHJldmlvdXMoKTtcclxuICB9O1xyXG4gIHdlZWtEYXRhTmV4dCgpIHtcclxuICAgIHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpLm5leHQoKTtcclxuICB9XHJcbiAgdG9nZ2xlRmxpZ2h0U3RhdHVzVmlldyh2YWw6IHN0cmluZykge1xyXG4gICAgdGhpcy50b2dnbGUuZmxpZ2h0U3RhdHVzID0gdmFsO1xyXG4gIH1cclxuICB0b2dnbGVGbGlnaHRSZWFzb25WaWV3KHZhbDogc3RyaW5nKSB7XHJcbiAgICB0aGlzLnRvZ2dsZS5mbGlnaHRSZWFzb24gPSB2YWw7XHJcbiAgICBpZiAodGhpcy50b2dnbGUuZmxpZ2h0UmVhc29uID09IFwiY2hhcnRcIilcclxuICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XHJcbiAgfVxyXG4gIHRvZ2dsZUNDRXhjZXB0aW9uVmlldyh2YWw6IHN0cmluZykge1xyXG4gICAgdGhpcy50b2dnbGUuY2NFeGNlcHRpb24gPSB2YWw7XHJcbiAgfSAgIFxyXG4gIHJ1blJlcG9ydChjaGFydFRpdGxlOiBzdHJpbmcsIG1vbnRoT3JZZWFyOiBzdHJpbmcsIGZsb3duTW9udGg6IHN0cmluZykge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgLy9pZiBubyBjb3Jkb3ZhLCB0aGVuIHJ1bm5pbmcgaW4gYnJvd3NlciBhbmQgbmVlZCB0byB1c2UgZGF0YVVSTCBhbmQgaWZyYW1lXHJcbiAgICBpZiAoIXdpbmRvdy5jb3Jkb3ZhKSB7XHJcbiAgICAgIHRoYXQuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG4gICAgICB0aGlzLnJlcG9ydFN2Yy5ydW5SZXBvcnREYXRhVVJMKGNoYXJ0VGl0bGUsIG1vbnRoT3JZZWFyLCBmbG93bk1vbnRoKVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGFVUkwpIHtcclxuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgLy9zZXQgdGhlIGlmcmFtZSBzb3VyY2UgdG8gdGhlIGRhdGFVUkwgY3JlYXRlZFxyXG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhkYXRhVVJMKTtcclxuICAgICAgICAgIC8vZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BkZkltYWdlJykuc3JjID0gZGF0YVVSTDtcclxuXHRcdCAgd2luZG93Lm9wZW4oZGF0YVVSTCxcIl9zeXN0ZW1cIik7XHJcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIC8vaWYgY29kcm92YSwgdGhlbiBydW5uaW5nIGluIGRldmljZS9lbXVsYXRvciBhbmQgYWJsZSB0byBzYXZlIGZpbGUgYW5kIG9wZW4gdy8gSW5BcHBCcm93c2VyXHJcbiAgICBlbHNlIHtcclxuICAgICAgdGhhdC5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICAgIHRoaXMucmVwb3J0U3ZjLnJ1blJlcG9ydEFzeW5jKGNoYXJ0VGl0bGUsIG1vbnRoT3JZZWFyLCBmbG93bk1vbnRoKVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGZpbGVQYXRoKSB7XHJcbiAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgIC8vbG9nIHRoZSBmaWxlIGxvY2F0aW9uIGZvciBkZWJ1Z2dpbmcgYW5kIG9vcGVuIHdpdGggaW5hcHBicm93c2VyXHJcbiAgICAgICAgICBjb25zb2xlLmxvZygncmVwb3J0IHJ1biBvbiBkZXZpY2UgdXNpbmcgRmlsZSBwbHVnaW4nKTtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdSZXBvcnRDdHJsOiBPcGVuaW5nIFBERiBGaWxlICgnICsgZmlsZVBhdGggKyAnKScpO1xyXG4gICAgICAgICAgdmFyIGxhc3RQYXJ0ID0gZmlsZVBhdGguc3BsaXQoXCIvXCIpLnBvcCgpO1xyXG4gICAgICAgICAgdmFyIGZpbGVOYW1lID0gXCIvbW50L3NkY2FyZC9cIiArIGxhc3RQYXJ0O1xyXG4gICAgICAgICAgaWYgKGRldmljZS5wbGF0Zm9ybSAhPSBcIkFuZHJvaWRcIilcclxuICAgICAgICAgICAgZmlsZU5hbWUgPSBmaWxlUGF0aDtcclxuICAgICAgICAgIC8vd2luZG93Lm9wZW5QREYoZmlsZU5hbWUpO1xyXG4gICAgICAgICAgLy9lbHNlXHJcbiAgICAgICAgICAvL3dpbmRvdy5vcGVuKGZpbGVQYXRoLCAnX2JsYW5rJywgJ2xvY2F0aW9uPW5vLGNsb3NlYnV0dG9uY2FwdGlvbj1DbG9zZSxlbmFibGVWaWV3cG9ydFNjYWxlPXllcycpOyovXHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICBjb3Jkb3ZhLnBsdWdpbnMuZmlsZU9wZW5lcjIub3BlbihcclxuICAgICAgICAgICAgZmlsZU5hbWUsXHJcbiAgICAgICAgICAgICdhcHBsaWNhdGlvbi9wZGYnLFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciBzdGF0dXM6ICcgKyBlLnN0YXR1cyArICcgLSBFcnJvciBtZXNzYWdlOiAnICsgZS5tZXNzYWdlKTtcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2ZpbGUgb3BlbmVkIHN1Y2Nlc3NmdWxseScpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgb3BlbkZsaWdodFByb2Nlc3NEcmlsbFBvcG92ZXIoJGV2ZW50LCBkYXRhLCBzZWxGaW5kTGV2ZWwpIHtcclxuICAgIHRoaXMuZHJpbGxOYW1lID0gJ0ZMSUdIVCBQUk9DRVNTSU5HIFNUQVRVUyAtICcgKyBkYXRhLnBvaW50WzBdICsgJy0nICsgdGhpcy5oZWFkZXIuZmxvd25Nb250aDtcclxuICAgIHRoaXMuZHJpbGxUeXBlID0gJ2ZsaWdodC1wcm9jZXNzJztcclxuICAgIHRoaXMuZ3JvdXBzID0gW107XHJcbiAgICB0aGlzLmRyaWxsdGFicyA9IFsnQ291bnRyeSBMZXZlbCcsICdTZWN0b3IgTGV2ZWwnLCAnRmxpZ2h0IExldmVsJywgJ0RvY3VtZW50IExldmVsJ107XHJcbiAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsnY291bnRyeUZyb20nLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2NhcnJpZXJDb2RlIyddO1xyXG4gICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgIHRoYXQuZHJpbGxwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgICAgdGhhdC5zaG93bkdyb3VwID0gMDtcclxuICAgIH0sIDUwKTtcclxuICAgIHRoaXMub3BlbkRyaWxsRG93bihkYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xyXG4gIH07XHJcblxyXG4gIG9wZW5Db3VucG9uQ291bnREcmlsbFBvcG92ZXIoJGV2ZW50LCBkYXRhLCBzZWxGaW5kTGV2ZWwpIHtcclxuICAgIHRoaXMuZHJpbGxOYW1lID0gJ0NPVVBPTiBDT1VOVCBCWSBFWENFUFRJT04gQ0FURUdPUlkgJztcclxuICAgIHRoaXMuZHJpbGxUeXBlID0gJ2NvdXBvbi1jb3VudCc7XHJcbiAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgdGhpcy5kcmlsbHRhYnMgPSBbJ0NvdXBvbiBDb3VudCBGbGlnaHQgU3RhdHVzJywgJ0RvY3VtZW50IExldmVsJ107XHJcbiAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsnZmxpZ2h0TnVtYmVyJywgJ2Zsb3duU2VjdG9yJ107XHJcbiAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdGhpcy4kdGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgdGhhdC5kcmlsbHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICB0aGF0LnNob3duR3JvdXAgPSAwO1xyXG4gICAgfSwgNTApO1xyXG4gICAgdGhpcy5vcGVuRHJpbGxEb3duKGRhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XHJcbiAgfTtcclxuXHJcbiAgb3BlbkZsaWdodENvdW50RHJpbGxQb3BvdmVyKCRldmVudCwgZGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICB0aGlzLmRyaWxsTmFtZSA9ICdMSVNUIE9GIE9QRU4gRkxJR0hUUyBGT1IgJyArIGRhdGEucG9pbnRbMF0gKyAnLScgKyB0aGlzLmhlYWRlci5mbG93bk1vbnRoICsgJyBCWSBSRUFTT04gJztcclxuICAgIHRoaXMuZHJpbGxUeXBlID0gJ2ZsaWdodC1jb3VudCc7XHJcbiAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgdGhpcy5kcmlsbHRhYnMgPSBbJ09wZW4gRmxpZ2h0IFN0YXR1cycsICdEb2N1bWVudCBMZXZlbCddO1xyXG4gICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2ZsaWdodE51bWJlcicsICdjYXJyaWVyQ29kZSddO1xyXG4gICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgIHRoYXQuZHJpbGxwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgICAgdGhhdC5zaG93bkdyb3VwID0gMDtcclxuICAgIH0sIDUwKTtcclxuICAgIHRoaXMub3BlbkRyaWxsRG93bihkYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xyXG4gIH07XHJcblxyXG4gIGRyaWxsRG93blJlcXVlc3QoZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpIHtcclxuICAgIHZhciByZXFkYXRhO1xyXG4gICAgaWYgKGRyaWxsVHlwZSA9PSAnZmxpZ2h0LXByb2Nlc3MnKSB7XHJcbiAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xyXG4gICAgICBpZiAoZGF0YS5sYWJlbCkge1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGFbMF07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBmbGlnaHREYXRlO1xyXG4gICAgICAvL2ZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IFN0cmluZyhkYXRhLmZsaWdodERhdGUpIDogU3RyaW5nKGRhdGFbMF0pO1xyXG4gICAgICBmbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBkYXRhLmZsaWdodERhdGUgOiAxO1xyXG4gICAgICB2YXIgY291bnRyeUZyb21UbyA9IChkYXRhLmNvdW50cnlGcm9tICYmIGRhdGEuY291bnRyeVRvKSA/IGRhdGEuY291bnRyeUZyb20gKyAnLScgKyBkYXRhLmNvdW50cnlUbyA6IFwiXCI7XHJcbiAgICAgIHZhciBzZWN0b3JGcm9tVG8gPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcblxyXG5cclxuXHJcbiAgICAgIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5nZXRQcm9maWxlVXNlck5hbWUoKSxcclxuICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxyXG4gICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxyXG4gICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxyXG4gICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiBmbGlnaHREYXRlLFxyXG4gICAgICAgIFwiY291bnRyeUZyb21Ub1wiOiBjb3VudHJ5RnJvbVRvLFxyXG4gICAgICAgIFwic2VjdG9yRnJvbVRvXCI6IHNlY3RvckZyb21UbyxcclxuICAgICAgICBcImZsaWdodE51bWJlclwiOiBmbGlnaHROdW1iZXJcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgaWYgKGRyaWxsVHlwZSA9PSAnY291cG9uLWNvdW50Jykge1xyXG4gICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgaWYgKGRhdGEubGFiZWwpIHtcclxuICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhWzBdO1xyXG4gICAgICB9XHJcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkpO1xyXG4gICAgICB2YXIgZmxpZ2h0RGF0ZTtcclxuICAgICAgLy9mbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBTdHJpbmcoZGF0YS5mbGlnaHREYXRlKSA6IFN0cmluZyhkYXRhWzBdKTtcclxuICAgICAgZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gZGF0YS5mbGlnaHREYXRlIDogMTtcclxuICAgICAgdmFyIGV4Y2VwdGlvbkNhdGVnb3J5ID0gKHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkgJiYgZHJpbGxMZXZlbCA+IDEpID8gdGhpcy5leGNlcHRpb25DYXRlZ29yeSA6IFwiXCI7XHJcbiAgICAgIHZhciBmbGlnaHRTZWN0b3IgPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcblxyXG5cclxuXHJcbiAgICAgIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5nZXRQcm9maWxlVXNlck5hbWUoKSxcclxuICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxyXG4gICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxyXG4gICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxyXG4gICAgICAgIFwiZXhjZXB0aW9uQ2F0ZWdvcnlcIjogZXhjZXB0aW9uQ2F0ZWdvcnksXHJcbiAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxyXG4gICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiBmbGlnaHREYXRlLFxyXG4gICAgICAgIFwiZmxpZ2h0U2VjdG9yXCI6IGZsaWdodFNlY3RvcixcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZHJpbGxUeXBlID09ICdmbGlnaHQtY291bnQnKSB7XHJcbiAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xyXG4gICAgICBpZiAoZGF0YS5sYWJlbCkge1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGFbMF07XHJcbiAgICAgIH1cclxuICAgICAgdmFyIGZsaWdodERhdGU7XHJcbiAgICAgIC8vZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gU3RyaW5nKGRhdGEuZmxpZ2h0RGF0ZSkgOiBTdHJpbmcoZGF0YVswXSk7XHJcbiAgICAgIGZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IGRhdGEuZmxpZ2h0RGF0ZSA6IDE7XHJcbiAgICAgIHZhciB0b2dnbGUxID0gdGhpcy50b2dnbGUub3Blbk9yQ2xvc2VkLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgIHZhciBmbGlnaHRTZWN0b3IgPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcbiAgICAgIHZhciBmbGlnaHRTdGF0dXMgPSAodGhpcy5leGNlcHRpb25DYXRlZ29yeSAmJiBkcmlsbExldmVsID4gMSkgPyB0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5IDogXCJcIjtcclxuXHJcblxyXG4gICAgICByZXFkYXRhID0ge1xyXG4gICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgIFwidXNlcklkXCI6IHRoaXMuZ2V0UHJvZmlsZVVzZXJOYW1lKCksXHJcbiAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJcIixcclxuICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcclxuICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICBcInRvZ2dsZTFcIjogdG9nZ2xlMSxcclxuICAgICAgICBcImZsaWdodFN0YXR1c1wiOiBmbGlnaHRTdGF0dXMsXHJcbiAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxyXG4gICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiBmbGlnaHREYXRlLFxyXG4gICAgICAgIFwiZmxpZ2h0U2VjdG9yXCI6IGZsaWdodFNlY3RvcixcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVxZGF0YTtcclxuICB9XHJcblxyXG4gIGdldERyaWxsRG93blVSTChkcmlsRG93blR5cGUpIHtcclxuICAgIHZhciB1cmxcclxuICAgIHN3aXRjaCAoZHJpbERvd25UeXBlKSB7XHJcbiAgICAgIGNhc2UgJ2ZsaWdodC1wcm9jZXNzJzpcclxuICAgICAgICB1cmwgPSBcIi9wYXhmbG5vcHIvZmxpZ2h0cHJvY2Vzc2luZ3N0YXR1c2RyaWxsXCI7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgJ2NvdXBvbi1jb3VudCc6XHJcbiAgICAgICAgdXJsID0gXCIvcGF4Zmxub3ByL2NvdXBvbmNvdW50YnlleHBkcmlsbFwiO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdmbGlnaHQtY291bnQnOlxyXG4gICAgICAgIHVybCA9IFwiL3BheGZsbm9wci9mbGlnaHRjb3VudGJ5cmVhc29uZHJpbGxcIjtcclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuICAgIHJldHVybiB1cmw7XHJcbiAgfVxyXG4gIHRhYlNsaWRlSGFzQ2hhbmdlZChpbmRleCkge1xyXG4gICAgdmFyIGRhdGEgPSB0aGlzLmdyb3Vwc1swXS5jb21wbGV0ZURhdGFbMF07XHJcbiAgICB0aGlzLmdyb3Vwc1swXS5pdGVtc1swXSA9IGRhdGFbaW5kZXhdLnZhbHVlcztcclxuICAgIHRoaXMuZ3JvdXBzWzBdLm9yZ0l0ZW1zWzBdID0gZGF0YVtpbmRleF0udmFsdWVzO1xyXG4gICAgdGhpcy5zb3J0KCcnLCAwLCBmYWxzZSk7XHJcbiAgICB0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5ID0gZGF0YVtpbmRleF0ua2V5O1xyXG4gIH1cclxuXHJcbiAgb3BlbkRyaWxsRG93bihkYXRhLCBzZWxGaW5kTGV2ZWwpIHtcclxuICAgIHNlbEZpbmRMZXZlbCA9IE51bWJlcihzZWxGaW5kTGV2ZWwpO1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbF0gPSBkYXRhO1xyXG4gICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbCArIDFdID0gJyc7XHJcblxyXG4gICAgaWYgKHNlbEZpbmRMZXZlbCAhPSAodGhpcy5ncm91cHMubGVuZ3RoIC0gMSkpIHtcclxuICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgIHZhciByZXFkYXRhID0gdGhpcy5kcmlsbERvd25SZXF1ZXN0KHRoaXMuZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpO1xyXG4gICAgICB2YXIgVVJMID0gdGhpcy5nZXREcmlsbERvd25VUkwodGhpcy5kcmlsbFR5cGUpO1xyXG4gICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgICAgdGhpcy5vcGVyYXRpb25hbFNlcnZpY2UuZ2V0RHJpbGxEb3duKHJlcWRhdGEsIFVSTClcclxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgIHZhciBkYXRhID0gZGF0YS5yZXNwb25zZTtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgdmFyIGZpbmRMZXZlbCA9IGRyaWxsTGV2ZWwgLSAxO1xyXG4gICAgICAgICAgaWYgKGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJykge1xyXG4gICAgICAgICAgICB2YXIgcmVzcFJlc3VsdDtcclxuICAgICAgICAgICAgaWYgKGRhdGEuZGF0YS5yb3dzKSB7XHJcbiAgICAgICAgICAgICAgcmVzcFJlc3VsdCA9IGRhdGEuZGF0YS5yb3dzO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHJlc3BSZXN1bHQgPSBkYXRhLmRhdGE7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICgodGhhdC5kcmlsbFR5cGUgPT0gJ2NvdXBvbi1jb3VudCcgfHwgdGhhdC5kcmlsbFR5cGUgPT0gJ2ZsaWdodC1jb3VudCcpICYmIGRhdGEuZGF0YS5yb3dzKSB7XHJcbiAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5pdGVtc1swXSA9IHJlc3BSZXN1bHRbMF0udmFsdWVzO1xyXG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0ub3JnSXRlbXNbMF0gPSByZXNwUmVzdWx0WzBdLnZhbHVlcztcclxuICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLmNvbXBsZXRlRGF0YVswXSA9IHJlc3BSZXN1bHQ7XHJcbiAgICAgICAgICAgICAgdGhhdC5leGNlcHRpb25DYXRlZ29yeSA9IHJlc3BSZXN1bHRbMF0ua2V5O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSByZXNwUmVzdWx0O1xyXG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0ub3JnSXRlbXNbMF0gPSByZXNwUmVzdWx0O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XHJcbiAgICAgICAgICAgIHRoYXQuc29ydCgnJywgZmluZExldmVsLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIHRoYXQuY2xlYXJEcmlsbChkcmlsbExldmVsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoYXQuc2hvd25Hcm91cCA9IGZpbmRMZXZlbDtcclxuICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGZpbmRMZXZlbCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgdGhhdC5jbG9zZXNQb3BvdmVyKCk7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICBhbGVydCgnU2VydmVyIEVycm9yJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjbG9zZURyaWxsUG9wb3ZlcigpIHtcclxuICAgIHRoaXMuZHJpbGxwb3BvdmVyLmhpZGUoKTtcclxuICB9XHJcblxyXG4gIGNsZWFyRHJpbGwobGV2ZWw6IG51bWJlcikge1xyXG4gICAgdmFyIGk6IG51bWJlcjtcclxuICAgIGZvciAodmFyIGkgPSBsZXZlbDsgaSA8IHRoaXMuZHJpbGx0YWJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHRoaXMuZ3JvdXBzW2ldLml0ZW1zLnNwbGljZSgwLCAxKTtcclxuICAgICAgdGhpcy5ncm91cHNbaV0ub3JnSXRlbXMuc3BsaWNlKDAsIDEpO1xyXG4gICAgICB0aGlzLnNvcnQoJycsIGksIGZhbHNlKTtcclxuICAgICAgY29uc29sZS5sb2codGhpcy5zZWxlY3RlZERyaWxsKTtcclxuICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW2ldID0gJyc7XHJcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuc2VsZWN0ZWREcmlsbCk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGluaXRpYXRlQXJyYXkoZHJpbGx0YWJzKSB7XHJcbiAgICBmb3IgKHZhciBpIGluIGRyaWxsdGFicykge1xyXG4gICAgICB0aGlzLmdyb3Vwc1tpXSA9IHtcclxuICAgICAgICBpZDogaSxcclxuICAgICAgICBuYW1lOiB0aGlzLmRyaWxsdGFic1tpXSxcclxuICAgICAgICBpdGVtczogW10sXHJcbiAgICAgICAgb3JnSXRlbXM6IFtdLFxyXG4gICAgICAgIEl0ZW1zQnlQYWdlOiBbXSxcclxuICAgICAgICBjb21wbGV0ZURhdGE6IFtdLFxyXG4gICAgICAgIGZpcnN0Q29sdW1uczogdGhpcy5maXJzdENvbHVtbnNbaV1cclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlzRHJpbGxSb3dTZWxlY3RlZChsZXZlbCwgb2JqKSB7XHJcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RlZERyaWxsW2xldmVsXSA9PSBvYmo7XHJcbiAgfVxyXG4gIHNlYXJjaFJlc3VsdHMobGV2ZWwsIG9iaikge1xyXG4gICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy5maWx0ZXJlZExpc3RTZXJ2aWNlLnNlYXJjaGVkKHRoaXMuZ3JvdXBzW2xldmVsXS5vcmdJdGVtc1swXSwgb2JqLnNlYXJjaFRleHQsIGxldmVsLCB0aGlzLmRyaWxsVHlwZSk7XHJcbiAgICBpZiAob2JqLnNlYXJjaFRleHQgPT0gJycpIHtcclxuICAgICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XHJcbiAgICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuZ3JvdXBzW2xldmVsXS5vcmdJdGVtc1swXTtcclxuICAgIH1cclxuICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcclxuICAgIHRoaXMucGFnaW5hdGlvbihsZXZlbCk7XHJcbiAgfVxyXG4gIHBhZ2luYXRpb24obGV2ZWwpIHtcclxuICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5JdGVtc0J5UGFnZSA9IHRoaXMuZmlsdGVyZWRMaXN0U2VydmljZS5wYWdlZCh0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0sIHRoaXMucGFnZVNpemUpO1xyXG4gIH07XHJcbiAgc2V0UGFnZShsZXZlbCwgcGFnZW5vKSB7XHJcbiAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IHBhZ2VubztcclxuICB9O1xyXG4gIGxhc3RQYWdlKGxldmVsKSB7XHJcbiAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IHRoaXMuZ3JvdXBzW2xldmVsXS5JdGVtc0J5UGFnZS5sZW5ndGggLSAxO1xyXG4gIH07XHJcbiAgcmVzZXRBbGwobGV2ZWwpIHtcclxuICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcclxuICB9XHJcbiAgc29ydChzb3J0QnksIGxldmVsLCBvcmRlcikge1xyXG4gICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XHJcbiAgICB0aGlzLmNvbHVtblRvT3JkZXIgPSBzb3J0Qnk7IFxyXG4gICAgLy8kRmlsdGVyIC0gU3RhbmRhcmQgU2VydmljZVxyXG4gICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy4kZmlsdGVyKCdvcmRlckJ5JykodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLmNvbHVtblRvT3JkZXIsIG9yZGVyKTtcclxuICAgIHRoaXMucGFnaW5hdGlvbihsZXZlbCk7XHJcbiAgfTtcclxuICByYW5nZSh0b3RhbCwgbGV2ZWwpIHtcclxuICAgIHZhciByZXQgPSBbXTtcclxuICAgIHZhciBzdGFydDogbnVtYmVyO1xyXG4gICAgc3RhcnQgPSAwO1xyXG4gICAgaWYodG90YWwgPiA1KSB7XHJcbiAgICAgIHN0YXJ0ID0gTnVtYmVyKHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdKSAtIDI7XHJcbiAgICB9XHJcbiAgICBpZiAoc3RhcnQgPCAwKSB7XHJcbiAgICAgIHN0YXJ0ID0gMDtcclxuICAgIH1cclxuICAgIHZhciBrID0gMTtcclxuICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IHRvdGFsOyBpKyspIHtcclxuICAgICAgcmV0LnB1c2goaSk7XHJcbiAgICAgIGsrKztcclxuICAgICAgaWYgKGsgPiA2KSB7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiByZXQ7XHJcbiAgfVxyXG4gIHRvZ2dsZUdyb3VwKGdyb3VwKSB7XHJcbiAgICBpZiAodGhpcy5pc0dyb3VwU2hvd24oZ3JvdXApKSB7XHJcbiAgICAgIHRoaXMuc2hvd25Hcm91cCA9IG51bGw7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLnNob3duR3JvdXAgPSBncm91cDtcclxuICAgIH1cclxuICB9XHJcbiAgaXNHcm91cFNob3duKGdyb3VwOiBudW1iZXIpIHtcclxuICAgIHJldHVybiB0aGlzLnNob3duR3JvdXAgPT0gZ3JvdXA7XHJcbiAgfVxyXG5cclxufVxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuY2xhc3MgTG9naW5Db250cm9sbGVyIHtcclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzY29wZScsICckc3RhdGUnLCAnVXNlclNlcnZpY2UnLCAnJGlvbmljSGlzdG9yeSddO1xyXG5cdHByaXZhdGUgaW52YWxpZE1lc3NhZ2U6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRwcml2YXRlIHVzZXJuYW1lOiBzdHJpbmc7XHJcblx0cHJpdmF0ZSBwYXNzd29yZDogc3RyaW5nO1xyXG5cdHByaXZhdGUgaXBhZGRyZXNzOiBzdHJpbmc7XHJcblx0cHJpdmF0ZSBlcm9vcm1lc3NhZ2U6IHN0cmluZztcclxuXHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSwgcHJpdmF0ZSAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSxcclxuXHRwcml2YXRlIHVzZXJTZXJ2aWNlOiBVc2VyU2VydmljZSwgcHJpdmF0ZSAkaW9uaWNIaXN0b3J5OiBhbnkpIHtcclxuXHRcdGlmICh0aGlzLnVzZXJTZXJ2aWNlLmlzTG9nZ2VkSW4oKSkge1xyXG5cdFx0XHQkaW9uaWNIaXN0b3J5Lm5leHRWaWV3T3B0aW9ucyh7XHJcblx0XHRcdFx0ZGlzYWJsZUJhY2s6IHRydWVcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNvbnNvbGUubG9nKCduYXZnYXRpbmcgdG8gbWlzLWZsb3duLi4nKTtcclxuXHRcdFx0dGhpcy4kc3RhdGUuZ28oJ2FwcC5taXMtZmxvd24nKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGNsZWFyRXJyb3IoKSB7XHJcblx0XHR0aGlzLmludmFsaWRNZXNzYWdlID0gZmFsc2U7XHJcblx0fVxyXG5cclxuXHRkb0xvZ2luKGxvZ2luRm9ybTogYm9vbGVhbikge1xyXG5cdFx0aWYgKCFsb2dpbkZvcm0pIHtcclxuXHRcdFx0aWYgKCFhbmd1bGFyLmlzRGVmaW5lZCh0aGlzLnVzZXJuYW1lKSB8fCAhYW5ndWxhci5pc0RlZmluZWQodGhpcy5wYXNzd29yZCkgfHwgIWFuZ3VsYXIuaXNEZWZpbmVkKHRoaXMuaXBhZGRyZXNzKSB8fHRoaXMudXNlcm5hbWUudHJpbSgpID09IFwiXCIgfHwgdGhpcy5wYXNzd29yZC50cmltKCkgPT0gXCJcIiB8fCB0aGlzLmlwYWRkcmVzcy50cmltKCkgPT0gXCJcIikge1xyXG5cdFx0XHRcdHRoaXMuaW52YWxpZE1lc3NhZ2UgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdFNFUlZFUl9VUkwgPSAnaHR0cDovLycgKyB0aGlzLmlwYWRkcmVzcyArICcvJyArICdyYXBpZC13cy9zZXJ2aWNlcy9yZXN0JztcclxuXHRcdFx0dGhpcy51c2VyU2VydmljZS5sb2dpbih0aGlzLnVzZXJuYW1lLHRoaXMucGFzc3dvcmQpLnRoZW4oXHJcblx0XHRcdFx0KHJlc3VsdCkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHJlc3VsdC5yZXNwb25zZS5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0dmFyIHJlcSA9IHtcclxuXHRcdFx0XHRcdFx0XHR1c2VySWQ6IHRoaXMudXNlcm5hbWVcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR0aGlzLnVzZXJTZXJ2aWNlLmdldFVzZXJQcm9maWxlKHJlcSkudGhlbihcclxuXHRcdFx0XHRcdFx0XHQocHJvZmlsZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0dmFyIHVzZXJOYW1lID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR1c2VybmFtZTogcHJvZmlsZS5yZXNwb25zZS5kYXRhLnVzZXJJbmZvLnVzZXJOYW1lXHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnVzZXJTZXJ2aWNlLnNldFVzZXIodXNlck5hbWUpO1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy4kaW9uaWNIaXN0b3J5Lm5leHRWaWV3T3B0aW9ucyh7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGRpc2FibGVCYWNrOiB0cnVlXHJcblx0XHRcdFx0XHRcdFx0XHR9KTsgXHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLiRzdGF0ZS5nbyhcImFwcC5taXMtZmxvd25cIik7XHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkIG9uIGxvYWRpbmcgdXNlciBwcm9maWxlJyk7XHJcblx0XHRcdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5pbnZhbGlkTWVzc2FnZSA9IHRydWU7XHJcblx0XHRcdFx0XHRcdHRoaXMuZXJvb3JtZXNzYWdlID0gXCJQbGVhc2UgY2hlY2sgeW91ciBjcmVkZW50aWFsc1wiO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmludmFsaWRNZXNzYWdlID0gdHJ1ZTtcclxuXHRcdFx0XHRcdHRoaXMuZXJvb3JtZXNzYWdlID0gXCJQbGVhc2UgY2hlY2sgeW91ciBuZXR3b3JrIGNvbm5lY3Rpb25cIjtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0gXHJcblx0fVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbmNsYXNzIENoYXJ0RXZlbnQgaW1wbGVtZW50cyBuZy5JRGlyZWN0aXZlIHtcclxuXHRyZXN0cmljdCA9ICdFJztcclxuXHRzY29wZSA9IHtcclxuXHRcdHR5cGU6IFwiPVwiXHJcblx0fTtcclxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsIHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UpIHtcclxuXHR9O1xyXG5cclxuXHRsaW5rID0gKCRzY29wZTogbmcuSVNjb3BlLCBpRWxlbWVudDogSlF1ZXJ5LCBhdHRyaWJ1dGVzOiBuZy5JQXR0cmlidXRlcywgJHNjZTogbmcuSVNDRVNlcnZpY2UpOiB2b2lkID0+IHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciBudmQzXHJcblx0XHRpZihhdHRyaWJ1dGVzLnR5cGUgPT0gJ21ldHJpYycgfHwgYXR0cmlidXRlcy50eXBlID09ICd0YXJnZXQnIHx8IGF0dHJpYnV0ZXMudHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jyl7XHJcblx0XHRcdG52ZDMgPSBpRWxlbWVudC5maW5kKCdudmQzJylbMF07XHJcblx0XHR9XHJcblx0XHRpZihhdHRyaWJ1dGVzLnR5cGUgPT0gJ2ZsaWdodC1wcm9jZXNzJyB8fCBhdHRyaWJ1dGVzLnR5cGUgPT0gJ2ZsaWdodC1jb3VudCcgfHwgYXR0cmlidXRlcy50eXBlID09ICdjb3Vwb24tY291bnQnKXtcclxuXHRcdFx0bnZkMyA9IGlFbGVtZW50LmZpbmQoJ252ZDMtbXVsdGktYmFyLWNoYXJ0JylbMF07XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBzZWxlY3RlZEVsZW0gPSBhbmd1bGFyLmVsZW1lbnQobnZkMyk7XHJcblxyXG5cdFx0XHJcblx0XHRcdFx0XHRcclxuXHJcblx0XHRzZWxmLiR0aW1lb3V0KFxyXG5cdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0c2VsZWN0ZWRFbGVtLnJlYWR5KGZ1bmN0aW9uKGUpIHtcclxuXHRcdFx0XHRcdHZhciBmaXJzdDogbnVtYmVyO1xyXG5cdFx0XHRcdFx0c2VsZWN0ZWRFbGVtLm9uKCdtb3VzZW92ZXIgdG91Y2hlbmQnLCBmdW5jdGlvbihldmVudCkge1xyXG5cdFx0XHRcdFx0XHRpZighZmlyc3Qpe1xyXG5cdFx0XHRcdFx0XHRcdHNlbGYuYXBwZW5kQ2xpY2soc2VsZWN0ZWRFbGVtLCBhdHRyaWJ1dGVzLCBzZWxmKTtcclxuXHRcdFx0XHRcdFx0XHRmaXJzdCA9IDE7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0LypcclxuXHRcdFx0XHRcdCRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7IHJldHVybiBzZWxlY3RlZEVsZW0uaHRtbCgpO1x0IH0sIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG5cdFx0XHRcdFx0XHRpZiAobmV3VmFsdWUpIHtcclxuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKG5ld1ZhbHVlKTtcclxuXHRcdFx0XHRcdFx0XHRzZWxmLmFwcGVuZENsaWNrKHNlbGVjdGVkRWxlbSwgYXR0cmlidXRlcywgc2VsZik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sIHRydWUpOyovXHJcblx0XHRcdFx0XHRzZWxmLmFwcGVuZENsaWNrKHNlbGVjdGVkRWxlbSwgYXR0cmlidXRlcywgc2VsZik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0sXHJcblx0XHRcdDEwKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBmYWN0b3J5KCk6IG5nLklEaXJlY3RpdmVGYWN0b3J5IHtcclxuXHRcdHZhciBkaXJlY3RpdmUgPSAoJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSwgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UpID0+IG5ldyBDaGFydEV2ZW50KCR0aW1lb3V0LCAkcm9vdFNjb3BlKVxyXG5cdFx0ZGlyZWN0aXZlLiRpbmplY3QgPSBbJyR0aW1lb3V0JywgJyRyb290U2NvcGUnXTtcclxuXHRcdHJldHVybiBkaXJlY3RpdmU7XHJcblx0fVxyXG5cclxuXHRhcHBlbmRDbGljayhzZWxlY3RlZEVsZW0sIGF0dHJpYnV0ZXMsIHNlbGYpIHtcclxuXHRcdHZhciBkYmxDbGlja0ludGVydmFsID0gMzAwO1xyXG5cdFx0dmFyIGZpcnN0Q2xpY2tUaW1lO1xyXG5cdFx0dmFyIHdhaXRpbmdTZWNvbmRDbGljayA9IGZhbHNlO1xyXG5cdFx0dmFyIGNoaWxkRWxlbTogYW55ID0gc2VsZWN0ZWRFbGVtLmZpbmQoJ3JlY3QnKTtcclxuXHRcdGFuZ3VsYXIuZm9yRWFjaChjaGlsZEVsZW0sIGZ1bmN0aW9uKGVsZW0sIGtleSkge1xyXG5cdFx0XHRpZiAoZWxlbS50YWdOYW1lID09ICdyZWN0Jykge1xyXG5cdFx0XHRcdHZhciByZWN0RWxlbSA9IGFuZ3VsYXIuZWxlbWVudChlbGVtKTtcclxuXHRcdFx0XHRyZWN0RWxlbS5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xyXG5cdFx0XHRcdFx0aWYgKCF3YWl0aW5nU2Vjb25kQ2xpY2spIHtcclxuXHRcdFx0XHRcdFx0Ly8gU2luZ2xlIGNsbGlja1xyXG5cdFx0XHRcdFx0XHRmaXJzdENsaWNrVGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcblx0XHRcdFx0XHRcdHdhaXRpbmdTZWNvbmRDbGljayA9IHRydWU7XHJcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdHdhaXRpbmdTZWNvbmRDbGljayA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHdhaXRpbmdTZWNvbmRDbGljayk7XHJcblx0XHRcdFx0XHRcdH0sIGRibENsaWNrSW50ZXJ2YWwpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRcdC8vIERvdWJsZSBjbGxpY2tcclxuXHRcdFx0XHRcdFx0d2FpdGluZ1NlY29uZENsaWNrID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdHZhciB0aW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuXHRcdFx0XHRcdFx0aWYgKHRpbWUgLSBmaXJzdENsaWNrVGltZSA8IGRibENsaWNrSW50ZXJ2YWwpIHtcclxuXHRcdFx0XHRcdFx0XHR2YXIgdHlwZSA9IGF0dHJpYnV0ZXMudHlwZTtcclxuXHRcdFx0XHRcdFx0XHRpZihhdHRyaWJ1dGVzLnR5cGUgPT0gJ21ldHJpYycgfHwgYXR0cmlidXRlcy50eXBlID09ICd0YXJnZXQnIHx8IGF0dHJpYnV0ZXMudHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jyl7XHJcblx0XHRcdFx0XHRcdFx0XHRzZWxmLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnb3BlbkRyaWxsUG9wdXAnLCB7XCJkYXRhXCIgOiByZWN0RWxlbVswXVsnX19kYXRhX18nXSwgXCJ0eXBlXCI6IHR5cGUsIFwiZXZlbnRcIjogZXZlbnR9KTsgXHJcblx0XHRcdFx0XHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhyZWN0RWxlbSk7XHJcblx0XHRcdFx0XHRcdFx0XHRzZWxmLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnb3BlbkRyaWxsUG9wdXAxJywge1wiZGF0YVwiIDogcmVjdEVsZW1bMF1bJ19fZGF0YV9fJ10sIFwidHlwZVwiOiB0eXBlLCBcImV2ZW50XCI6IGV2ZW50fSk7IFxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdH1cclxuXHRcdH0pOyBcclxuXHR9XHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vX2xpYnMudHNcIiAvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL2FwcC9BcHBDb250cm9sbGVyLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9Db3Jkb3ZhU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9Mb2NhbFN0b3JhZ2VTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL3NlcnZpY2VzL1Nlc3Npb25TZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vc2VydmljZXMvRXJyb3JIYW5kbGVyU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvTWlzU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL29wZXJhdGlvbmFsL3NlcnZpY2VzL09wZXJhdGlvbmFsU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9NaXNDb250cm9sbGVyLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL09wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL3VzZXIvTG9naW5Db250cm9sbGVyLnRzXCIvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL2NoYXJ0LWV2ZW50L0NoYXJ0RXZlbnQudHNcIiAvPlxyXG5cclxudmFyIFNFUlZFUl9VUkwgPSAnaHR0cDovLzEwLjkxLjE1Mi45OTo4MDgyL3JhcGlkLXdzL3NlcnZpY2VzL3Jlc3QnO1xyXG5hbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnLCBbJ2lvbmljJywgJ3JhcGlkTW9iaWxlLmNvbmZpZycsICd0YWJTbGlkZUJveCcsICdudmQzQ2hhcnREaXJlY3RpdmVzJywgJ252ZDMnXSlcclxuXHJcblx0LnJ1bigoJGlvbmljUGxhdGZvcm06IElvbmljLklQbGF0Zm9ybSwgJGh0dHA6IG5nLklIdHRwU2VydmljZSkgPT4ge1xyXG5cdFx0JGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb24udG9rZW4gPSAndG9rZW4nO1xyXG4gIFx0XHQkaHR0cC5kZWZhdWx0cy5oZWFkZXJzLnBvc3RbXCJDb250ZW50LVR5cGVcIl0gPSBcImFwcGxpY2F0aW9uL2pzb25cIjtcclxuXHRcdCRpb25pY1BsYXRmb3JtLnJlYWR5KCgpID0+IHtcclxuXHRcdFx0aWYgKHR5cGVvZiBuYXZpZ2F0b3IuZ2xvYmFsaXphdGlvbiAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0fVxyXG5cdFx0fSlcclxuXHR9KVxyXG4uY29uZmlnKCgkc3RhdGVQcm92aWRlcjogYW5ndWxhci51aS5JU3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyOiBhbmd1bGFyLnVpLklVcmxSb3V0ZXJQcm92aWRlcixcclxuXHQkaW9uaWNDb25maWdQcm92aWRlcjogSW9uaWMuSUNvbmZpZ1Byb3ZpZGVyKSA9PiB7XHJcblx0JGlvbmljQ29uZmlnUHJvdmlkZXIudmlld3Muc3dpcGVCYWNrRW5hYmxlZChmYWxzZSk7XHJcblxyXG5cdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhcHAnLCB7XHJcblx0XHR1cmw6ICcvYXBwJyxcclxuXHRcdGFic3RyYWN0OiB0cnVlLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3RlbXBsYXRlcy9tZW51Lmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjogJ0FwcENvbnRyb2xsZXIgYXMgYXBwQ3RybCdcclxuXHR9KVxyXG5cdC5zdGF0ZSgnbG9naW4nLCB7XHJcblx0XHRjYWNoZTogZmFsc2UsXHJcblx0XHR1cmw6ICcvbG9naW4nLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3VzZXIvbG9naW4uaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOiAnTG9naW5Db250cm9sbGVyIGFzIExvZ2luQ3RybCdcclxuXHR9KVxyXG5cdC5zdGF0ZSgnYXBwLm1pcy1mbG93bicsIHtcclxuXHRcdGNhY2hlOiBmYWxzZSxcclxuXHRcdHVybDogJy9taXMvZmxvd24nLFxyXG5cdFx0dmlld3M6IHtcclxuXHRcdFx0J21lbnVDb250ZW50Jzoge1xyXG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9taXMvZmxvd24uaHRtbCcsXHJcblx0XHRcdFx0Y29udHJvbGxlcjogJ01pc0NvbnRyb2xsZXIgYXMgTWlzQ3RybCdcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pXHJcblx0LnN0YXRlKCdhcHAub3BlcmF0aW9uYWwtZmxvd24nLCB7XHJcblx0XHRjYWNoZTogZmFsc2UsXHJcblx0XHR1cmw6ICcvb3BlcmF0aW9uYWwvZmxvd24nLFxyXG5cdFx0dmlld3M6IHtcclxuXHRcdFx0J21lbnVDb250ZW50Jzoge1xyXG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9mbG93bi5odG1sJyxcclxuXHRcdFx0XHRjb250cm9sbGVyOiAnT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIgYXMgT3ByQ3RybCdcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHQkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvbG9naW4nKTtcclxufSlcclxuXHJcbi5zZXJ2aWNlKCdEYXRhUHJvdmlkZXJTZXJ2aWNlJywgRGF0YVByb3ZpZGVyU2VydmljZSlcclxuLnNlcnZpY2UoJ05ldFNlcnZpY2UnLCBOZXRTZXJ2aWNlKVxyXG4uc2VydmljZSgnRXJyb3JIYW5kbGVyU2VydmljZScsIEVycm9ySGFuZGxlclNlcnZpY2UpXHJcbi5zZXJ2aWNlKCdTZXNzaW9uU2VydmljZScsIFNlc3Npb25TZXJ2aWNlKVxyXG4uc2VydmljZSgnQ29yZG92YVNlcnZpY2UnLCBDb3Jkb3ZhU2VydmljZSlcclxuLnNlcnZpY2UoJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCBMb2NhbFN0b3JhZ2VTZXJ2aWNlKVxyXG4uc2VydmljZSgnVXNlclNlcnZpY2UnLCBVc2VyU2VydmljZSlcclxuXHJcbi5zZXJ2aWNlKCdNaXNTZXJ2aWNlJywgTWlzU2VydmljZSlcclxuLnNlcnZpY2UoJ09wZXJhdGlvbmFsU2VydmljZScsIE9wZXJhdGlvbmFsU2VydmljZSlcclxuLnNlcnZpY2UoJ0ZpbHRlcmVkTGlzdFNlcnZpY2UnLCBGaWx0ZXJlZExpc3RTZXJ2aWNlKVxyXG4uc2VydmljZSgnQ2hhcnRvcHRpb25TZXJ2aWNlJywgQ2hhcnRvcHRpb25TZXJ2aWNlKVxyXG5cclxuLmNvbnRyb2xsZXIoJ0FwcENvbnRyb2xsZXInLCBBcHBDb250cm9sbGVyKVxyXG4uY29udHJvbGxlcignTWlzQ29udHJvbGxlcicsIE1pc0NvbnRyb2xsZXIpXHJcbi5jb250cm9sbGVyKCdPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlcicsIE9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyKVxyXG4uY29udHJvbGxlcignTG9naW5Db250cm9sbGVyJywgTG9naW5Db250cm9sbGVyKVxyXG5cclxuLmRpcmVjdGl2ZSgnY2hhcnRldmVudCcsIENoYXJ0RXZlbnQuZmFjdG9yeSgpKVxyXG4vLyAuZGlyZWN0aXZlKCdmZXRjaExpc3QnLCBGZXRjaExpc3QuZmFjdG9yeSgpKVxyXG5cclxuXHJcbmlvbmljLlBsYXRmb3JtLnJlYWR5KCgpID0+IHtcclxuXHRpZiAod2luZG93LmNvcmRvdmEgJiYgd2luZG93LmNvcmRvdmEucGx1Z2lucy5LZXlib2FyZCkge1xyXG5cdH1cclxuXHQvLyBTdGF0dXNCYXIub3ZlcmxheXNXZWJWaWV3KGZhbHNlKTtcclxuIC8vICAgIFN0YXR1c0Jhci5iYWNrZ3JvdW5kQ29sb3JCeUhleFN0cmluZygnIzIwOWRjMicpO1xyXG4gLy8gICAgU3RhdHVzQmFyLnN0eWxlTGlnaHRDb250ZW50KCk7XHJcblx0Xy5kZWZlcigoKSA9PiB7XHJcblx0XHQvLyBhbmd1bGFyLmJvb3RzdHJhcChkb2N1bWVudCwgWydyYXBpZE1vYmlsZSddKTtcclxuXHR9KTtcclxufSk7XHJcbiIsbnVsbCwiKGZ1bmN0aW9uICgpIHtcclxuICAndXNlIHN0cmljdCc7XHJcbiAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcclxuICAuZGlyZWN0aXZlKCdoZVByb2dyZXNzQmFyJywgZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGRpcmVjdGl2ZURlZmluaXRpb25PYmplY3QgPSB7XHJcbiAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgIHJlcGxhY2U6IGZhbHNlLFxyXG4gICAgICBzY29wZToge2RhdGE6ICc9Y2hhcnREYXRhJywgc2hvd3Rvb2x0aXA6ICdAc2hvd1Rvb2x0aXAnfSxcclxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcclxuICAgICAgICAgICAgICAgICAgLmRvbWFpbihbMCwgZDMubWF4KHNjb3BlLmRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuICtkLnByb2dyZXNzIH0pXSlcclxuICAgICAgICAgICAgICAgICAgLnJhbmdlKFswLCA5MF0pO1xyXG5cclxuICAgICAgICB2YXIgc2VnbWVudCA9IGQzLnNlbGVjdChlbGVtZW50WzBdKVxyXG4gICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKFwiLmhvcml6b250YWwtYmFyLWdyYXBoLXNlZ21lbnRcIilcclxuICAgICAgICAgICAgICAgICAgICAgLmRhdGEoc2NvcGUuZGF0YSlcclxuICAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcclxuICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXNlZ21lbnRcIiwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC1sYWJlbFwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWUgfSk7XHJcblxyXG4gICAgICAgIHZhciBiYXJTZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXZhbHVlXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtdmFsdWUtc2NhbGVcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZS1iYXJcIiwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIGJhclNlZ21lbnRcclxuICAgICAgICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmNvbG9yIH0pICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxyXG4gICAgICAgICAgICAgICAuZHVyYXRpb24oMTAwMClcclxuICAgICAgICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoK2QucHJvZ3Jlc3MpICsgXCIlXCIgfSk7XHJcblxyXG4gICAgICAgIHZhciBib3hTZWdtZW50ID0gYmFyU2VnbWVudC5hcHBlbmQoXCJzcGFuXCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZS1ib3hcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnByb2dyZXNzID8gZC5wcm9ncmVzcyA6IFwiXCIgfSk7XHJcbiAgICAgICAgaWYoc2NvcGUuc2hvd3Rvb2x0aXAgIT09ICd0cnVlJykgcmV0dXJuOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgIHZhciBidG5TZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJidXR0b25cIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLWljb24gaWNvbiBpb24tY2hldnJvbi1kb3duIG5vLWJvcmRlciBzZWN0b3JDdXN0b21DbGFzc1wiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwiaGlkZVwiLCBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGQpIHJldHVybiBkLmRyaWxsRmxhZyA9PSAnTic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7ICAgICAgICAgICAgXHJcbiAgICAgICAgdmFyIHRvb2x0aXBTZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJkaXZcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJ0b29sdGlwXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKCdoaWRlJywgdHJ1ZSk7XHJcbiAgICAgICAgdG9vbHRpcFNlZ21lbnQuYXBwZW5kKFwicFwiKS50ZXh0KGZ1bmN0aW9uKGQpeyByZXR1cm4gZC5uYW1lOyB9KTtcclxuICAgICAgICB2YXIgdGFibGUgPSB0b29sdGlwU2VnbWVudC5hcHBlbmQoXCJ0YWJsZVwiKTtcclxuICAgICAgICB2YXIgdGhlYWQgPSB0YWJsZS5hcHBlbmQoJ3RyJyk7XHJcbiAgICAgICAgdGhlYWQuYXBwZW5kKCd0aCcpLnRleHQoJ1NlY3RvcicpO1xyXG4gICAgICAgIHRoZWFkLmFwcGVuZCgndGgnKS50ZXh0KCdSZXZlbnVlJyk7XHJcblxyXG4gICAgICAgIHZhciB0ciAgPSB0YWJsZVxyXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ3Rib2R5JylcclxuICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKFwidHJcIilcclxuICAgICAgICAgICAgICAgICAgICAuZGF0YShmdW5jdGlvbihkKXtyZXR1cm4gZC5zY0FuYWx5c2lzRHJpbGxzfSlcclxuICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKS5hcHBlbmQoXCJ0clwiKTtcclxuXHJcbiAgICAgICAgdmFyIHNlY3RvclRkID0gdHIuYXBwZW5kKFwidGRcIilcclxuICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5zZWN0b3IgfSk7XHJcblxyXG4gICAgICAgIHZhciByZXZlbnVlVGQgPSB0ci5hcHBlbmQoXCJ0ZFwiKVxyXG4gICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnJldmVudWUgfSk7XHJcblxyXG4gICAgICAgIGJ0blNlZ21lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKXsgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gY29uc29sZS5sb2codG9vbHRpcFNlZ21lbnQpO1xyXG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQodGhpcykucmVtb3ZlQ2xhc3MoJ3NlY3RvckN1c3RvbUNsYXNzJyk7XHJcblx0XHQgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlY3RvckN1c3RvbUNsYXNzXCIpKS5yZW1vdmVDbGFzcygnaW9uLWNoZXZyb24tdXAnKTtcclxuXHRcdCAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc2VjdG9yQ3VzdG9tQ2xhc3NcIikpLmFkZENsYXNzKCdpb24tY2hldnJvbi1kb3duJyk7XHJcblx0XHQgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlY3RvckN1c3RvbUNsYXNzXCIpKS5uZXh0KCkucmVtb3ZlQ2xhc3MoJ3Nob3cnKTtcclxuXHRcdCAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc2VjdG9yQ3VzdG9tQ2xhc3NcIikpLm5leHQoKS5hZGRDbGFzcygnaGlkZScpO1xyXG5cdFx0ICBcclxuICAgICAgICAgIGlmKGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkuaGFzQ2xhc3MoJ3Nob3cnKSkge1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykucmVtb3ZlQ2xhc3MoJ2lvbi1jaGV2cm9uLXVwJyk7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5hZGRDbGFzcygnaW9uLWNoZXZyb24tZG93bicpO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLnJlbW92ZUNsYXNzKCdzaG93Jyk7ICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkuYWRkQ2xhc3MoJ2hpZGUnKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5yZW1vdmVDbGFzcygnaW9uLWNoZXZyb24tZG93bicpO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykuYWRkQ2xhc3MoJ2lvbi1jaGV2cm9uLXVwJyk7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkucmVtb3ZlQ2xhc3MoJ2hpZGUnKTtcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5hZGRDbGFzcygnc2hvdycpO1xyXG4gICAgICAgICAgfVxyXG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQodGhpcykuYWRkQ2xhc3MoJ3NlY3RvckN1c3RvbUNsYXNzJyk7XHJcblx0XHQgIFxyXG5cdFx0ICBcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICAgIHJldHVybiBkaXJlY3RpdmVEZWZpbml0aW9uT2JqZWN0O1xyXG4gIH0pO1xyXG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG4gIGFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScpXHJcbiAgLmRpcmVjdGl2ZSgnaGVSZXZlbnVlUHJvZ3Jlc3NCYXInLCBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgcmV2QmFyT2JqZWN0ID0ge1xyXG4gICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICByZXBsYWNlOiBmYWxzZSxcclxuICAgICAgc2NvcGU6IHtkYXRhOiAnPWNoYXJ0RGF0YSd9LFxyXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coc2NvcGUuZGF0YSk7XHJcbiAgICAgICAgc2NvcGUuJHdhdGNoKCdkYXRhJywgZnVuY3Rpb24obmV3VmFsdWUsIG9sZFZhbHVlKSB7XHJcbiAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ25ld1ZhbHVlJywgbmV3VmFsdWUpO1xyXG4gICAgICAgICAgICB2YXIgeCA9IGQzLnNjYWxlLmxpbmVhcigpXHJcbiAgICAgICAgICAgICAgICAgICAgICAuZG9tYWluKFswLCBkMy5tYXgoc2NvcGUuZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZSB9KV0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAucmFuZ2UoWzAsIDkwXSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgc2VnbWVudCA9IGQzLnNlbGVjdChlbGVtZW50WzBdKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbChcIi5uZXQtcmV2LWJhci1ncmFwaC1zZWdtZW50XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZGF0YShzY29wZS5kYXRhKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtc2VnbWVudFwiLCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgIHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC1sYWJlbFwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5uYW1lIH0pO1xyXG5cclxuICAgICAgICAgICAgdmFyIGJhclNlZ21lbnQgPSBzZWdtZW50LmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtdmFsdWVcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtdmFsdWUtc2NhbGVcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtdmFsdWUtYmFyXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtdmFsdWUtYm94XCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudmFsdWU7IH0pO1xyXG5cclxuICAgICAgICAgICAgYmFyU2VnbWVudCAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jb2xvciB9KSAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbigpXHJcbiAgICAgICAgICAgICAgICAgICAuZHVyYXRpb24oMTAwMClcclxuICAgICAgICAgICAgICAgICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiB4KGQudmFsdWUpICsgXCIlXCIgfSk7ICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgfSAgICAgICAgICAgICAgIFxyXG4gICAgICAgIH0sIHRydWUpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIHJldkJhck9iamVjdDtcclxuICB9KTtcclxufSkoKTsiLCJcclxuKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG4gICAgLy8gYXR0YWNoIHRoZSBmYWN0b3JpZXMgYW5kIHNlcnZpY2UgdG8gdGhlIFtzdGFydGVyLnNlcnZpY2VzXSBtb2R1bGUgaW4gYW5ndWxhclxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcclxuICAgICAgICAuc2VydmljZSgnUmVwb3J0QnVpbGRlclN2YycsIHJlcG9ydEJ1aWxkZXJTZXJ2aWNlKTtcclxuICAgIFxyXG5cdGZ1bmN0aW9uIHJlcG9ydEJ1aWxkZXJTZXJ2aWNlKCkge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBcclxuICAgICAgICBzZWxmLmdlbmVyYXRlUmVwb3J0ID0gX2dlbmVyYXRlUmVwb3J0OyAgICAgICAgICAgIFxyXG4gICAgICAgIGZ1bmN0aW9uIF9nZW5lcmF0ZVJlcG9ydChwYXJhbSwgY2hhcnRUaXRsZSxmbG93bk1vbnRoKSB7XHJcblx0XHRcdHZhciB0aXRsZSA9IFwiXCI7XHJcblx0XHRcdGlmKHBhcmFtID09IFwibWV0cmljU25hcHNob3RcIilcclxuXHRcdFx0XHR0aXRsZSA9IFwiTUVUUklDIFNOQVBTSE9UIC1cIitmbG93bk1vbnRoK1wiIFwiK2NoYXJ0VGl0bGUudG9VcHBlckNhc2UoKStcIi0gVklFV1wiO1xyXG5cdFx0XHRlbHNlIGlmKHBhcmFtID09IFwidGFyZ2V0QWN0dWFsXCIpXHJcblx0XHRcdFx0dGl0bGUgPSBcIlRBUkdFVCBWUyBBQ1RVQUwgLSBcIisoKGNoYXJ0VGl0bGUgPT0gXCJyZXZlbnVlXCIpP1wiTkVUIFJFVkVOVUVcIjpcIlBBWCBDb3VudFwiKStcIiBcIitmbG93bk1vbnRoKyBcIiAtIFZJRVdcIjtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHRpdGxlID0gY2hhcnRUaXRsZStcIiBcIitmbG93bk1vbnRoK1wiIC0gVklFV1wiO1xyXG5cdFx0XHRcdFx0XHRcdFxyXG5cdFx0XHR2YXIgc3ZnTm9kZSA9IGQzLnNlbGVjdEFsbChcIi5cIitwYXJhbSkuc2VsZWN0QWxsKFwic3ZnXCIpO1xyXG5cdFx0XHR2YXIgY29udGVudCA9IFtdO1xyXG5cdFx0XHR2YXIgaW1hZ2VDb2x1bW4gPSBbXTtcclxuXHRcdFx0dmFyIHRleHRDb2x1bW4gPSBbXTtcclxuXHRcdFx0dmFyIGltYWdlc09iaiA9IHt9O1xyXG5cdFx0XHR2YXIgdGV4dE9iaiA9IHt9O1xyXG5cdFx0XHRjb250ZW50LnB1c2godGl0bGUpO1xyXG5cdFx0XHR2YXIgbm9kZUV4aXN0cyA9IFtdO1xyXG5cdFx0XHRhbmd1bGFyLmZvckVhY2goc3ZnTm9kZSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1x0XHRcdFx0XHJcblx0XHRcdFx0Ly90ZXh0T2JqWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInXHRcdFx0XHRcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgaHRtbCA9IFwiXCI7XHJcblx0XHRcdFx0aWYobm9kZUV4aXN0cy5pbmRleE9mKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1mbGFnXCIpKSA9PSAtMSAmJiBzdmdOb2RlW2tleV0ubGVuZ3RoID49IDEpe1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdFx0aHRtbCA9IHN2Z05vZGVba2V5XVswXS5vdXRlckhUTUw7XHJcblx0XHRcdFx0XHRpZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tcGRmRmxhZ1wiKSA9PT0gXCJkeW5hbWljV0hcIil7XHJcblx0XHRcdFx0XHRcdGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpLmF0dHIoXCJ3aWR0aFwiLDE1MDApO1xyXG5cdFx0XHRcdFx0XHRkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKS5hdHRyKFwiaGVpZ2h0XCIsNjAwKTtcclxuXHRcdFx0XHRcdFx0dmFyIG5vZGUgPSBkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKTtcclxuXHRcdFx0XHRcdFx0aHRtbCA9IG5vZGVbMF1bMF0ub3V0ZXJIVE1MO1xyXG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ3dpZHRoJ10gPSA1MDA7XHJcblx0XHRcdFx0XHRcdGltYWdlc09ialsnaGVpZ2h0J10gPSA1MDA7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tcGRmRmxhZ1wiKSA9PT0gXCJwZGZGbGFnXCIpXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDc1MDtcclxuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWydoZWlnaHQnXSA9IDMwMDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGNhbnZnKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKSwgaHRtbCk7XHJcblx0XHRcdFx0XHR2YXIgdGVzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKTtcclxuXHRcdFx0XHRcdHZhciBpbWdzcmMgPSB0ZXN0LnRvRGF0YVVSTCgpO1xyXG5cdFx0XHRcdFx0dmFyICB0ZXh0ID0gXCJcXG5cIitzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tdGl0bGVcIikrXCJcXG5cIjtcclxuXHRcdFx0XHRcdHRleHRPYmpbJ3RleHQnXSA9IHRleHQ7XHJcblx0XHRcdFx0XHR0ZXh0Q29sdW1uLnB1c2godGV4dE9iaik7XHJcblx0XHRcdFx0XHRpbWFnZXNPYmpbJ2ltYWdlJ10gPSBpbWdzcmM7XHJcblx0XHRcdFx0XHRpbWFnZUNvbHVtbi5wdXNoKGltYWdlc09iaik7XHRcdFx0XHRcclxuXHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxyXG5cdFx0XHRcdFx0dHh0VGVtcFsnY29sdW1ucyddID0gdGV4dENvbHVtbjtcclxuXHRcdFx0XHRcdGltZ1RlbXBbJ2FsaWdubWVudCddID0gJ2NlbnRlcic7XHJcblx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcclxuXHRcdFx0XHRcdGNvbnRlbnQucHVzaCh0eHRUZW1wKTtcclxuXHRcdFx0XHRcdGNvbnRlbnQucHVzaChpbWdUZW1wKTtcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xyXG5cdFx0XHRcdFx0dGV4dENvbHVtbiA9IFtdO1xyXG5cdFx0XHRcdFx0aW1hZ2VzT2JqID0ge307XHJcblx0XHRcdFx0XHR0ZXh0T2JqID0ge307XHJcblx0XHRcdFx0XHRpbWdUZW1wID0ge307XHJcblx0XHRcdFx0XHR0eHRUZW1wID17fTtcclxuXHRcdFx0XHRcdG5vZGVFeGlzdHMucHVzaChzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tZmxhZ1wiKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0Y29udGVudDogY29udGVudCxcclxuXHRcdFx0XHRzdHlsZXM6IHtcclxuXHRcdFx0XHRcdGhlYWRlcjoge1xyXG5cdFx0XHRcdFx0XHRmb250U2l6ZTogMTgsXHJcblx0XHRcdFx0XHRcdGJvbGQ6IHRydWVcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRiaWdnZXI6IHtcclxuXHRcdFx0XHRcdFx0Zm9udFNpemU6IDE1LFxyXG5cdFx0XHRcdFx0XHRpdGFsaWNzOiB0cnVlLFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0ZGVmYXVsdFN0eWxlOiB7XHJcblx0XHRcdFx0XHRjb2x1bW5HYXA6IDIwLFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdH07XHJcbiAgICB9XHJcbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG4gICAgLy8gYXR0YWNoIHRoZSBzZXJ2aWNlIHRvIHRoZSBbcmFwaWRNb2JpbGVdIG1vZHVsZSBpbiBhbmd1bGFyXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKVxyXG5cdCBcdC5zZXJ2aWNlKCdSZXBvcnRTdmMnLCBbJyRxJywgJyR0aW1lb3V0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG9ydFN2Y10pO1xyXG5cclxuXHQvLyBnZW5SZXBvcnREZWYgLS0+IGdlblJlcG9ydERvYyAtLT4gYnVmZmVyW10gLS0+IEJsb2IoKSAtLT4gc2F2ZUZpbGUgLS0+IHJldHVybiBmaWxlUGF0aFxyXG5cclxuXHQgZnVuY3Rpb24gcmVwb3J0U3ZjKCRxLCAkdGltZW91dCkge1xyXG5cdFx0IHRoaXMucnVuUmVwb3J0QXN5bmMgPSBfcnVuUmVwb3J0QXN5bmM7XHJcblx0XHQgdGhpcy5ydW5SZXBvcnREYXRhVVJMID0gX3J1blJlcG9ydERhdGFVUkw7XHJcblxyXG5cdFx0Ly8gUlVOIEFTWU5DOiBydW5zIHRoZSByZXBvcnQgYXN5bmMgbW9kZSB3LyBwcm9ncmVzcyB1cGRhdGVzIGFuZCBkZWxpdmVycyBhIGxvY2FsIGZpbGVVcmwgZm9yIHVzZVxyXG5cclxuXHRcdCBmdW5jdGlvbiBfcnVuUmVwb3J0QXN5bmMoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKSB7XHJcbiAgICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHQgXHJcbiAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCcxLlByb2Nlc3NpbmcgVHJhbnNjcmlwdCcpO1xyXG4gICAgICAgICAgICAgZ2VuZXJhdGVSZXBvcnREZWYoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKS50aGVuKGZ1bmN0aW9uKGRvY0RlZikge1xyXG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzIuIEdlbmVyYXRpbmcgUmVwb3J0Jyk7XHJcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0RG9jKGRvY0RlZik7XHJcbiAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHBkZkRvYykge1xyXG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzMuIEJ1ZmZlcmluZyBSZXBvcnQnKTtcclxuICAgICAgICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVSZXBvcnRCdWZmZXIocGRmRG9jKTtcclxuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oYnVmZmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnNC4gU2F2aW5nIFJlcG9ydCBGaWxlJyk7XHJcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0QmxvYihidWZmZXIpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihwZGZCbG9iKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnNS4gT3BlbmluZyBSZXBvcnQgRmlsZScpO1xyXG4gICAgICAgICAgICAgICAgIHJldHVybiBzYXZlRmlsZShwZGZCbG9iLHN0YXR1c0ZsYWcpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihmaWxlUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgIC8vaGlkZUxvYWRpbmcoKTtcclxuICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGZpbGVQYXRoKTtcclxuICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9oaWRlTG9hZGluZygpO1xyXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJyArIGVycm9yLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgICAgICB9XHJcblxyXG5cdFx0Ly8gUlVOIERBVEFVUkw6IHJ1bnMgdGhlIHJlcG9ydCBhc3luYyBtb2RlIHcvIHByb2dyZXNzIHVwZGF0ZXMgYW5kIHN0b3BzIHcvIHBkZkRvYyAtPiBkYXRhVVJMIHN0cmluZyBjb252ZXJzaW9uXHJcblxyXG5cdFx0IGZ1bmN0aW9uIF9ydW5SZXBvcnREYXRhVVJMKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkge1xyXG4gICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdFx0IFxyXG4gICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMS5Qcm9jZXNzaW5nIFRyYW5zY3JpcHQnKTtcclxuICAgICAgICAgICAgIGdlbmVyYXRlUmVwb3J0RGVmKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkudGhlbihmdW5jdGlvbihkb2NEZWYpIHtcclxuICAgICAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCcyLiBHZW5lcmF0aW5nIFJlcG9ydCcpO1xyXG4gICAgICAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZVJlcG9ydERvYyhkb2NEZWYpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihwZGZEb2MpIHtcclxuICAgICAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCczLiBDb252ZXJ0IHRvIERhdGFVUkwnKTtcclxuICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0RGF0YVVSTChwZGZEb2MpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihvdXREb2MpIHtcclxuICAgICAgICAgICAgICAgICAvL2hpZGVMb2FkaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShvdXREb2MpO1xyXG4gICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAvL2hpZGVMb2FkaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgZXJyb3IudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbiAgICAgICAgIH1cclxuXHJcblx0XHQvLyAxLkdlbmVyYXRlUmVwb3J0RGVmOiB1c2UgY3VycmVudFRyYW5zY3JpcHQgdG8gY3JhZnQgcmVwb3J0RGVmIEpTT04gZm9yIHBkZk1ha2UgdG8gZ2VuZXJhdGUgcmVwb3J0XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnREZWYoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKSB7XHJcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XHJcblx0XHRcdFxyXG4gICAgICAgICAgICAvLyByZW1vdmVkIHNwZWNpZmljcyBvZiBjb2RlIHRvIHByb2Nlc3MgZGF0YSBmb3IgZHJhZnRpbmcgdGhlIGRvY1xyXG4gICAgICAgICAgICAvLyBsYXlvdXQgYmFzZWQgb24gcGxheWVyLCB0cmFuc2NyaXB0LCBjb3Vyc2VzLCBldGMuXHJcbiAgICAgICAgICAgIC8vIGN1cnJlbnRseSBtb2NraW5nIHRoaXMgYW5kIHJldHVybmluZyBhIHByZS1idWlsdCBKU09OIGRvYyBkZWZpbml0aW9uXHJcbiAgICAgICAgICAgIFxyXG5cdFx0XHQvL3VzZSBycHQgc2VydmljZSB0byBnZW5lcmF0ZSB0aGUgSlNPTiBkYXRhIG1vZGVsIGZvciBwcm9jZXNzaW5nIFBERlxyXG4gICAgICAgICAgICAvLyBoYWQgdG8gdXNlIHRoZSAkdGltZW91dCB0byBwdXQgYSBzaG9ydCBkZWxheSB0aGF0IHdhcyBuZWVkZWQgdG8gXHJcbiAgICAgICAgICAgIC8vIHByb3Blcmx5IGdlbmVyYXRlIHRoZSBkb2MgZGVjbGFyYXRpb25cclxuICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGQgPSB7fTtcclxuICAgICAgICAgICAgICAgIGRkID0gZ2VuZXJhdGVSZXBvcnQoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKVxyXG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoZGQpO1xyXG4gICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gMi5HZW5lcmF0ZVJwdEZpbGVEb2M6IHRha2UgSlNPTiBmcm9tIHJwdFN2YywgY3JlYXRlIHBkZm1lbW9yeSBidWZmZXIsIGFuZCBzYXZlIGFzIGEgbG9jYWwgZmlsZVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdlbmVyYXRlUmVwb3J0RG9jKGRvY0RlZmluaXRpb24pIHtcclxuXHRcdFx0Ly91c2UgdGhlIHBkZm1ha2UgbGliIHRvIGNyZWF0ZSBhIHBkZiBmcm9tIHRoZSBKU09OIGNyZWF0ZWQgaW4gdGhlIGxhc3Qgc3RlcFxyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHR0cnkge1xyXG4gICAgICAgICAgICAgICAgLy91c2UgdGhlIHBkZk1ha2UgbGlicmFyeSB0byBjcmVhdGUgaW4gbWVtb3J5IHBkZiBmcm9tIHRoZSBKU09OXHJcblx0XHRcdFx0dmFyIHBkZkRvYyA9IHBkZk1ha2UuY3JlYXRlUGRmKCBkb2NEZWZpbml0aW9uICk7XHJcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHBkZkRvYyk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDMuR2VuZXJhdGVScHRCdWZmZXI6IHBkZktpdCBvYmplY3QgcGRmRG9jIC0tPiBidWZmZXIgYXJyYXkgb2YgcGRmRG9jXHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnRCdWZmZXIocGRmRG9jKSB7XHJcblx0XHRcdC8vdXNlIHRoZSBwZGZtYWtlIGxpYiB0byBnZXQgYSBidWZmZXIgYXJyYXkgb2YgdGhlIHBkZkRvYyBvYmplY3RcclxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdFx0dHJ5IHtcclxuICAgICAgICAgICAgICAgIC8vZ2V0IHRoZSBidWZmZXIgZnJvbSB0aGUgcGRmRG9jXHJcblx0XHRcdFx0cGRmRG9jLmdldEJ1ZmZlcihmdW5jdGlvbihidWZmZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdCAgIGRlZmVycmVkLnJlc29sdmUoYnVmZmVyKTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyAzYi5nZXREYXRhVVJMOiBwZGZLaXQgb2JqZWN0IHBkZkRvYyAtLT4gZW5jb2RlZCBkYXRhVXJsXHJcblxyXG5cdFx0IGZ1bmN0aW9uIGdldERhdGFVUkwocGRmRG9jKSB7XHJcblx0XHRcdC8vdXNlIHRoZSBwZGZtYWtlIGxpYiB0byBjcmVhdGUgYSBwZGYgZnJvbSB0aGUgSlNPTiBjcmVhdGVkIGluIHRoZSBsYXN0IHN0ZXBcclxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdFx0dHJ5IHtcclxuICAgICAgICAgICAgICAgIC8vdXNlIHRoZSBwZGZNYWtlIGxpYnJhcnkgdG8gY3JlYXRlIGluIG1lbW9yeSBwZGYgZnJvbSB0aGUgSlNPTlxyXG5cdFx0XHRcdHBkZkRvYy5nZXREYXRhVXJsKGZ1bmN0aW9uKG91dERvYykge1xyXG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShvdXREb2MpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHRcdCB9XHJcblxyXG5cdFx0Ly8gNC5HZW5lcmF0ZVJlcG9ydEJsb2I6IGJ1ZmZlciAtLT4gbmV3IEJsb2Igb2JqZWN0XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnRCbG9iKGJ1ZmZlcikge1xyXG5cdFx0XHQvL3VzZSB0aGUgZ2xvYmFsIEJsb2Igb2JqZWN0IGZyb20gcGRmbWFrZSBsaWIgdG8gY3JlYXQgYSBibG9iIGZvciBmaWxlIHByb2Nlc3NpbmdcclxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdFx0dHJ5IHtcclxuICAgICAgICAgICAgICAgIC8vcHJvY2VzcyB0aGUgaW5wdXQgYnVmZmVyIGFzIGFuIGFwcGxpY2F0aW9uL3BkZiBCbG9iIG9iamVjdCBmb3IgZmlsZSBwcm9jZXNzaW5nXHJcbiAgICAgICAgICAgICAgICB2YXIgcGRmQmxvYiA9IG5ldyBCbG9iKFtidWZmZXJdLCB7dHlwZTogJ2FwcGxpY2F0aW9uL3BkZid9KTtcclxuICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocGRmQmxvYik7XHJcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyA1LlNhdmVGaWxlOiB1c2UgdGhlIEZpbGUgcGx1Z2luIHRvIHNhdmUgdGhlIHBkZkJsb2IgYW5kIHJldHVybiBhIGZpbGVQYXRoIHRvIHRoZSBjbGllbnRcclxuXHJcblx0XHRmdW5jdGlvbiBzYXZlRmlsZShwZGZCbG9iLHRpdGxlKSB7XHJcblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XHJcblx0XHRcdHZhciBmaWxlTmFtZSA9IHVuaXF1ZUZpbGVOYW1lKHRpdGxlKStcIi5wZGZcIjtcclxuXHRcdFx0dmFyIGZpbGVQYXRoID0gXCJcIjtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnU2F2ZUZpbGU6IHJlcXVlc3RGaWxlU3lzdGVtJyk7XHJcblx0XHRcdFx0d2luZG93LnJlcXVlc3RGaWxlU3lzdGVtKExvY2FsRmlsZVN5c3RlbS5QRVJTSVNURU5ULCAwLCBnb3RGUywgZmFpbCk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdTYXZlRmlsZV9FcnI6ICcgKyBlLm1lc3NhZ2UpO1xyXG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcclxuXHRcdFx0XHR0aHJvdyh7Y29kZTotMTQwMSxtZXNzYWdlOid1bmFibGUgdG8gc2F2ZSByZXBvcnQgZmlsZSd9KTtcclxuXHRcdFx0fVx0XHRcdFxyXG5cclxuXHRcdFx0ZnVuY3Rpb24gZ290RlMoZmlsZVN5c3RlbSkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ1NhdmVGaWxlOiBnb3RGUyAtLT4gZ2V0RmlsZScpO1xyXG5cdFx0XHRcdGZpbGVTeXN0ZW0ucm9vdC5nZXRGaWxlKGZpbGVOYW1lLCB7Y3JlYXRlOiB0cnVlLCBleGNsdXNpdmU6IGZhbHNlfSwgZ290RmlsZUVudHJ5LCBmYWlsKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZnVuY3Rpb24gZ290RmlsZUVudHJ5KGZpbGVFbnRyeSkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ1NhdmVGaWxlOiBnb3RGaWxlRW50cnkgLS0+IChmaWxlUGF0aCkgLS0+IGNyZWF0ZVdyaXRlcicpO1xyXG5cdFx0XHRcdGZpbGVQYXRoID0gZmlsZUVudHJ5LnRvVVJMKCk7XHJcblx0XHRcdFx0ZmlsZUVudHJ5LmNyZWF0ZVdyaXRlcihnb3RGaWxlV3JpdGVyLCBmYWlsKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZnVuY3Rpb24gZ290RmlsZVdyaXRlcih3cml0ZXIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdTYXZlRmlsZTogZ290RmlsZVdyaXRlciAtLT4gd3JpdGUgLS0+IG9uV3JpdGVFbmQocmVzb2x2ZSknKTtcclxuXHRcdFx0XHR3cml0ZXIub253cml0ZWVuZCA9IGZ1bmN0aW9uKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0d3JpdGVyLm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRlciBlcnJvcjogJyArIGUudG9TdHJpbmcoKSk7XHJcblx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHR3cml0ZXIud3JpdGUocGRmQmxvYik7XHJcblx0XHRcdH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGZhaWwoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhlcnJvci5jb2RlKTtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZXJyb3IpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIHVuaXF1ZUZpbGVOYW1lKGZpbGVOYW1lKXtcclxuXHRcdFx0dmFyIG5vdyA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdHZhciB0aW1lc3RhbXAgPSBub3cuZ2V0RnVsbFllYXIoKS50b1N0cmluZygpO1xyXG5cdFx0XHR0aW1lc3RhbXAgKz0gKG5vdy5nZXRNb250aCgpIDwgOSA/ICcwJyA6ICcnKSArIG5vdy5nZXRNb250aCgpLnRvU3RyaW5nKCk7IFxyXG5cdFx0XHR0aW1lc3RhbXAgKz0gKG5vdy5nZXREYXRlKCkgPCAxMCA/ICcwJyA6ICcnKSArIG5vdy5nZXREYXRlKCkudG9TdHJpbmcoKTsgXHJcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldEhvdXJzKCkgPCAxMCA/ICcwJyA6ICcnKSArIG5vdy5nZXRIb3VycygpLnRvU3RyaW5nKCk7IFxyXG5cdFx0XHR0aW1lc3RhbXAgKz0gKG5vdy5nZXRNaW51dGVzKCkgPCAxMCA/ICcwJyA6ICcnKSArIG5vdy5nZXRNaW51dGVzKCkudG9TdHJpbmcoKTsgXHJcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldFNlY29uZHMoKSA8IDEwID8gJzAnIDogJycpICsgbm93LmdldFNlY29uZHMoKS50b1N0cmluZygpO1xyXG5cdFx0XHRyZXR1cm4gZmlsZU5hbWUudG9VcHBlckNhc2UoKStcIl9cIit0aW1lc3RhbXA7XHJcblx0XHRcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnQocGFyYW0sIGNoYXJ0VGl0bGUsZmxvd25Nb250aCkge1xyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIHRpdGxlID0gXCJcIjtcclxuXHRcdFx0aWYocGFyYW0gPT0gXCJtZXRyaWNTbmFwc2hvdFwiKVxyXG5cdFx0XHRcdHRpdGxlID0gXCJNRVRSSUMgU05BUFNIT1QgLVwiK2Zsb3duTW9udGgrXCIgXCIrY2hhcnRUaXRsZS50b1VwcGVyQ2FzZSgpK1wiLSBWSUVXXCI7XHJcblx0XHRcdGVsc2UgaWYocGFyYW0gPT0gXCJ0YXJnZXRBY3R1YWxcIilcclxuXHRcdFx0XHR0aXRsZSA9IFwiVEFSR0VUIFZTIEFDVFVBTCAtIFwiKygoY2hhcnRUaXRsZSA9PSBcInJldmVudWVcIik/XCJORVQgUkVWRU5VRVwiOlwiUEFYIENvdW50XCIpK1wiIFwiK2Zsb3duTW9udGgrIFwiIC0gVklFV1wiO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0dGl0bGUgPSBjaGFydFRpdGxlK1wiIFwiK2Zsb3duTW9udGgrXCIgLSBWSUVXXCI7XHJcblx0XHRcdFx0XHRcdFx0XHJcblx0XHRcdHZhciBzdmdOb2RlID0gZDMuc2VsZWN0QWxsKFwiLlwiK3BhcmFtKS5zZWxlY3RBbGwoXCJzdmdcIik7XHJcblx0XHRcdHZhciBjb250ZW50ID0gW107XHJcblx0XHRcdHZhciBpbWFnZUNvbHVtbiA9IFtdO1xyXG5cdFx0XHR2YXIgdGV4dENvbHVtbiA9IFtdO1xyXG5cdFx0XHR2YXIgaW1hZ2VzT2JqID0ge307XHJcblx0XHRcdHZhciB0ZXh0T2JqID0ge307XHJcblx0XHRcdGNvbnRlbnQucHVzaCh0aXRsZSk7XHJcblx0XHRcdHZhciBub2RlRXhpc3RzID0gW107XHJcblx0XHRcdGFuZ3VsYXIuZm9yRWFjaChzdmdOb2RlLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgaHRtbCA9IFwiXCI7XHJcblx0XHRcdFx0aWYobm9kZUV4aXN0cy5pbmRleE9mKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1mbGFnXCIpKSA9PSAtMSAmJiBzdmdOb2RlW2tleV0ubGVuZ3RoID49IDEpe1xyXG5cdFx0XHRcdFx0aHRtbCA9IHN2Z05vZGVba2V5XVswXS5vdXRlckhUTUw7XHJcblx0XHRcdFx0XHRpZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tcGRmRmxhZ1wiKSA9PT0gXCJkeW5hbWljV0hcIil7XHJcblx0XHRcdFx0XHRcdGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpLmF0dHIoXCJ3aWR0aFwiLDE1MDApO1xyXG5cdFx0XHRcdFx0XHRkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKS5hdHRyKFwiaGVpZ2h0XCIsNjAwKTtcclxuXHRcdFx0XHRcdFx0dmFyIG5vZGUgPSBkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKTtcclxuXHRcdFx0XHRcdFx0aHRtbCA9IG5vZGVbMF1bMF0ub3V0ZXJIVE1MO1xyXG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ3dpZHRoJ10gPSA1MDA7XHJcblx0XHRcdFx0XHRcdGltYWdlc09ialsnaGVpZ2h0J10gPSA1MDA7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tcGRmRmxhZ1wiKSA9PT0gXCJwZGZGbGFnXCIpXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDc1MDtcclxuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWydoZWlnaHQnXSA9IDMwMDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGNhbnZnKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKSwgaHRtbCk7XHJcblx0XHRcdFx0XHR2YXIgY2FudmFzRWxtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xyXG5cdFx0XHRcdFx0dmFyIGltZ3NyYyA9IGNhbnZhc0VsbS50b0RhdGFVUkwoKTtcclxuXHRcdFx0XHRcdHZhciAgdGV4dCA9IFwiXFxuXCIrc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLXRpdGxlXCIpK1wiXFxuXCI7XHJcblx0XHRcdFx0XHR0ZXh0T2JqWyd0ZXh0J10gPSB0ZXh0O1xyXG5cdFx0XHRcdFx0dGV4dENvbHVtbi5wdXNoKHRleHRPYmopO1xyXG5cdFx0XHRcdFx0aW1hZ2VzT2JqWydpbWFnZSddID0gaW1nc3JjO1xyXG5cdFx0XHRcdFx0aW1hZ2VDb2x1bW4ucHVzaChpbWFnZXNPYmopO1x0XHRcdFx0XHJcblx0XHRcdFx0XHR2YXIgaW1nVGVtcCA9e30sIHR4dFRlbXAgPXt9O1x0XHRcclxuXHRcdFx0XHRcdHR4dFRlbXBbJ2NvbHVtbnMnXSA9IHRleHRDb2x1bW47XHJcblx0XHRcdFx0XHRpbWdUZW1wWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInO1xyXG5cdFx0XHRcdFx0aW1nVGVtcFsnY29sdW1ucyddID0gaW1hZ2VDb2x1bW47XHJcblx0XHRcdFx0XHRjb250ZW50LnB1c2godHh0VGVtcCk7XHJcblx0XHRcdFx0XHRjb250ZW50LnB1c2goaW1nVGVtcCk7XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0aW1hZ2VDb2x1bW4gPSBbXTtcclxuXHRcdFx0XHRcdHRleHRDb2x1bW4gPSBbXTtcclxuXHRcdFx0XHRcdGltYWdlc09iaiA9IHt9O1xyXG5cdFx0XHRcdFx0dGV4dE9iaiA9IHt9O1xyXG5cdFx0XHRcdFx0aW1nVGVtcCA9IHt9O1xyXG5cdFx0XHRcdFx0dHh0VGVtcCA9e307XHJcblx0XHRcdFx0XHRub2RlRXhpc3RzLnB1c2goc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLWZsYWdcIikpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHRcdFx0XHJcblx0XHRcdGlmKHBhcmFtID09IFwicmV2ZW51ZUFuYWx5c2lzXCIpe1xyXG5cdFx0XHRcdHZhciBub2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuZXQtcmV2ZW51ZS1jaGFydFwiKTtcclxuXHRcdFx0XHR2YXIgcGRmUmVuZGVyID0gYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwZGYtcmVuZGVyJykpO1xyXG5cdFx0XHRcdHBkZlJlbmRlci5hcHBlbmQobm9kZS5jaGlsZE5vZGVzWzFdKTsgIFxyXG5cdFx0XHRcdGh0bWwyY2FudmFzKGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ25ldC1yZXZlbnVlLXBkZicpKS50aGVuKGZ1bmN0aW9uKGNhbnZhcykge1xyXG5cdFx0XHRcdFx0dmFyIGMgPSBjYW52YXMudG9EYXRhVVJMKCk7XHJcblx0XHRcdFx0XHR2YXIgIHRleHQgPSBcIlxcblxcblxcblxcblxcblxcblxcblxcblxcblxcblxcblxcblwiK25vZGUuZ2V0QXR0cmlidXRlKCdkYXRhLWl0ZW0tdGl0bGUnKStcIlxcblxcblwiO1xyXG5cdFx0XHRcdFx0dGV4dE9ialsndGV4dCddID0gdGV4dDtcclxuXHRcdFx0XHRcdHRleHRDb2x1bW4ucHVzaCh0ZXh0T2JqKTtcclxuXHRcdFx0XHRcdGltYWdlc09ialsnaW1hZ2UnXSA9IGM7XHJcblx0XHRcdFx0XHRpbWFnZUNvbHVtbi5wdXNoKGltYWdlc09iaik7XHRcdFx0XHRcclxuXHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxyXG5cdFx0XHRcdFx0dHh0VGVtcFsnY29sdW1ucyddID0gdGV4dENvbHVtbjtcclxuXHRcdFx0XHRcdGltZ1RlbXBbJ2FsaWdubWVudCddID0gJ2NlbnRlcic7XHJcblx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcclxuXHRcdFx0XHRcdGNvbnRlbnQucHVzaCh0eHRUZW1wKTtcclxuXHRcdFx0XHRcdGNvbnRlbnQucHVzaChpbWdUZW1wKTtcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xyXG5cdFx0XHRcdFx0dGV4dENvbHVtbiA9IFtdO1xyXG5cdFx0XHRcdFx0aW1hZ2VzT2JqID0ge307XHJcblx0XHRcdFx0XHR0ZXh0T2JqID0ge307XHJcblx0XHRcdFx0XHRpbWdUZW1wID0ge307XHJcblx0XHRcdFx0XHR0eHRUZW1wID17fTtcdFxyXG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7Y29udGVudDogY29udGVudH0pO1xyXG5cdFx0XHRcdFx0cGRmUmVuZGVyLmVtcHR5KCk7XHJcblx0XHRcdFx0fSk7XHRcdFx0XHRcclxuXHRcdFx0fSBlbHNlIGlmKHBhcmFtID09IFwic2VjdG9yY2FycmllcmFuYWx5c2lzXCIpe1xyXG5cdFx0XHRcdHZhciBzdmdOb2RlID0gZDMuc2VsZWN0QWxsKFwiLlwiK3BhcmFtKTtcclxuXHRcdFx0XHRhbmd1bGFyLmZvckVhY2goc3ZnTm9kZVswXSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xyXG5cdFx0XHRcdFx0dmFyIG5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2VjdG9yLWNhcnJpZXItY2hhcnQnK2tleSk7XHJcblx0XHRcdFx0XHR2YXIgZWxlSUQgPSAnc2VjdG9yLWNhcnJpZXItY2hhcnQnK2tleTtcclxuXHRcdFx0XHRcdGh0bWwyY2FudmFzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZUlEKSkudGhlbihmdW5jdGlvbihjYW52YXMpIHtcclxuXHRcdFx0XHRcdFx0dmFyIGMgPSBjYW52YXMudG9EYXRhVVJMKCk7XHJcblx0XHRcdFx0XHRcdHZhciAgdGV4dCA9IFwiXFxuXFxuXCIrbm9kZS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaXRlbS10aXRsZScpK1wiXFxuXFxuXCI7XHJcblx0XHRcdFx0XHRcdHRleHRPYmpbJ3RleHQnXSA9IHRleHQ7XHJcblx0XHRcdFx0XHRcdHRleHRDb2x1bW4ucHVzaCh0ZXh0T2JqKTtcclxuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWyd3aWR0aCddID0gNTAwO1xyXG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ2ltYWdlJ10gPSBjO1xyXG5cdFx0XHRcdFx0XHRpbWFnZUNvbHVtbi5wdXNoKGltYWdlc09iaik7XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0dmFyIGltZ1RlbXAgPXt9LCB0eHRUZW1wID17fTtcdFx0XHJcblx0XHRcdFx0XHRcdHR4dFRlbXBbJ2NvbHVtbnMnXSA9IHRleHRDb2x1bW47XHJcblx0XHRcdFx0XHRcdGltZ1RlbXBbJ2FsaWdubWVudCddID0gJ2NlbnRlcic7XHJcblx0XHRcdFx0XHRcdGltZ1RlbXBbJ2NvbHVtbnMnXSA9IGltYWdlQ29sdW1uO1xyXG5cdFx0XHRcdFx0XHRjb250ZW50LnB1c2godHh0VGVtcCk7XHJcblx0XHRcdFx0XHRcdGNvbnRlbnQucHVzaChpbWdUZW1wKTtcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdGltYWdlQ29sdW1uID0gW107XHJcblx0XHRcdFx0XHRcdHRleHRDb2x1bW4gPSBbXTtcclxuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqID0ge307XHJcblx0XHRcdFx0XHRcdHRleHRPYmogPSB7fTtcclxuXHRcdFx0XHRcdFx0aW1nVGVtcCA9IHt9O1xyXG5cdFx0XHRcdFx0XHR0eHRUZW1wID17fTtcdFxyXG5cdFx0XHRcdFx0XHRpZihrZXkgPT0gc3ZnTm9kZVswXS5sZW5ndGgtMSl7XHJcblx0XHRcdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7Y29udGVudDogY29udGVudH0pO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcdFx0XHRcdFx0XHJcblx0XHRcdFx0fSk7XHRcdFxyXG5cdFx0XHR9ZWxzZSBpZihwYXJhbSA9PSBcInJvdXRlcmV2ZW51ZVwiKXtcdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBlbGVJRCA9ICdyb3V0ZS1yZXZlbnVlLXBkZic7XHRcdFx0XHRcdFxyXG5cdFx0XHRcdGh0bWwyY2FudmFzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZUlEKSkudGhlbihmdW5jdGlvbihjYW52YXMpIHtcclxuXHRcdFx0XHRcdHZhciBjID0gY2FudmFzLnRvRGF0YVVSTCgpO1xyXG5cdFx0XHRcdFx0dmFyICB0ZXh0ID0gXCJcIjtcclxuXHRcdFx0XHRcdHRleHRPYmpbJ3RleHQnXSA9IHRleHQ7XHJcblx0XHRcdFx0XHR0ZXh0Q29sdW1uLnB1c2godGV4dE9iaik7XHJcblx0XHRcdFx0XHRpbWFnZXNPYmpbJ3dpZHRoJ10gPSA1MDA7XHJcblx0XHRcdFx0XHRpbWFnZXNPYmpbJ2ltYWdlJ10gPSBjO1xyXG5cdFx0XHRcdFx0aW1hZ2VDb2x1bW4ucHVzaChpbWFnZXNPYmopO1x0XHRcdFx0XHJcblx0XHRcdFx0XHR2YXIgaW1nVGVtcCA9e30sIHR4dFRlbXAgPXt9O1x0XHRcclxuXHRcdFx0XHRcdHR4dFRlbXBbJ2NvbHVtbnMnXSA9IHRleHRDb2x1bW47XHJcblx0XHRcdFx0XHRpbWdUZW1wWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInO1xyXG5cdFx0XHRcdFx0aW1nVGVtcFsnY29sdW1ucyddID0gaW1hZ2VDb2x1bW47XHJcblx0XHRcdFx0XHRjb250ZW50LnB1c2godHh0VGVtcCk7XHJcblx0XHRcdFx0XHRjb250ZW50LnB1c2goaW1nVGVtcCk7XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0aW1hZ2VDb2x1bW4gPSBbXTtcclxuXHRcdFx0XHRcdHRleHRDb2x1bW4gPSBbXTtcclxuXHRcdFx0XHRcdGltYWdlc09iaiA9IHt9O1xyXG5cdFx0XHRcdFx0dGV4dE9iaiA9IHt9O1xyXG5cdFx0XHRcdFx0aW1nVGVtcCA9IHt9O1xyXG5cdFx0XHRcdFx0dHh0VGVtcCA9e307XHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHtjb250ZW50OiBjb250ZW50fSk7XHJcblx0XHRcdFx0fSk7XHRcclxuXHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7Y29udGVudDogY29udGVudH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcclxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblx0XHR9O1xyXG5cdFx0XHJcblx0IH1cclxuICAgIFxyXG59KSgpOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
