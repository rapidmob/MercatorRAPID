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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9saWJzLnRzIiwiY29tbW9uL3V0aWxzL1V0aWxzLnRzIiwiY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvQ29yZG92YVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvTmV0U2VydmljZS50cyIsImNvbW1vbi9zZXJ2aWNlcy9FcnJvckhhbmRsZXJTZXJ2aWNlLnRzIiwiY29tbW9uL3NlcnZpY2VzL0lTZXNzaW9uSHR0cFByb21pc2UuanMiLCJjb21tb24vc2VydmljZXMvU2Vzc2lvblNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1Jlc3BvbnNlLmpzIiwiY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHMiLCJjb21tb24vYXBwL0FwcENvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvc2VydmljZXMvT3BlcmF0aW9uYWxTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvTWlzQ29udHJvbGxlci50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL3VzZXIvTG9naW5Db250cm9sbGVyLnRzIiwiY29tbW9uL2NoYXJ0LWV2ZW50L0NoYXJ0RXZlbnQudHMiLCJhcHAudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1JlcXVlc3QuanMiLCJjb21wb25lbnRzL21pcy9wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvcmV2ZW51ZS1wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvcmVwb3J0QnVpbGRlclN2Yy50cyIsImNvbXBvbmVudHMvbWlzL3NlcnZpY2VzL3JlcG9ydFNlcnZpY2UudHMiXSwibmFtZXMiOlsiVXRpbHMiLCJVdGlscy5jb25zdHJ1Y3RvciIsIlV0aWxzLmlzTm90RW1wdHkiLCJVdGlscy5pc0xhbmRzY2FwZSIsIlV0aWxzLmdldFRvZGF5RGF0ZSIsIlV0aWxzLmlzSW50ZWdlciIsIkxvY2FsU3RvcmFnZVNlcnZpY2UiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTG9jYWxTdG9yYWdlU2VydmljZS5zZXQiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldCIsIkxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0T2JqZWN0IiwiTG9jYWxTdG9yYWdlU2VydmljZS5nZXRPYmplY3QiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmlzUmVjZW50RW50cnlBdmFpbGFibGUiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmFkZFJlY2VudEVudHJ5IiwiQ29yZG92YVNlcnZpY2UiLCJDb3Jkb3ZhU2VydmljZS5jb25zdHJ1Y3RvciIsIkNvcmRvdmFTZXJ2aWNlLmV4ZWMiLCJDb3Jkb3ZhU2VydmljZS5leGVjdXRlUGVuZGluZyIsIk5ldFNlcnZpY2UiLCJOZXRTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTmV0U2VydmljZS5nZXREYXRhIiwiTmV0U2VydmljZS5wb3N0RGF0YSIsIk5ldFNlcnZpY2UuZGVsZXRlRGF0YSIsIk5ldFNlcnZpY2UudXBsb2FkRmlsZSIsIk5ldFNlcnZpY2UuY2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkiLCJOZXRTZXJ2aWNlLnNlcnZlcklzQXZhaWxhYmxlIiwiTmV0U2VydmljZS5jYW5jZWxBbGxVcGxvYWREb3dubG9hZCIsIk5ldFNlcnZpY2UuYWRkTWV0YUluZm8iLCJlcnJvcmhhbmRsZXIiLCJFcnJvckhhbmRsZXJTZXJ2aWNlIiwiRXJyb3JIYW5kbGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkVycm9ySGFuZGxlclNlcnZpY2UudmFsaWRhdGVSZXNwb25zZSIsIkVycm9ySGFuZGxlclNlcnZpY2UuaXNOb1Jlc3VsdEZvdW5kIiwiRXJyb3JIYW5kbGVyU2VydmljZS5pc1Nlc3Npb25JbnZhbGlkIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNIYXJkRXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNTb2Z0RXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNFcnJvcnMiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc05vUmVzdWx0RXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0hhcmRFcnJvciIsIkVycm9ySGFuZGxlclNlcnZpY2UuaGFzU29mdEVycm9yIiwic2Vzc2lvbnNlcnZpY2UiLCJTZXNzaW9uU2VydmljZSIsIlNlc3Npb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiU2Vzc2lvblNlcnZpY2UucmVzb2x2ZVByb21pc2UiLCJTZXNzaW9uU2VydmljZS5hZGRBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyIiwiU2Vzc2lvblNlcnZpY2UucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lciIsIlNlc3Npb25TZXJ2aWNlLnNldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLnNldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLmNsZWFyTGlzdGVuZXJzIiwiU2Vzc2lvblNlcnZpY2UucmVmcmVzaFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkIiwiU2Vzc2lvblNlcnZpY2UuYWNjZXNzVG9rZW5SZWZyZXNoZWQiLCJkYXRhcHJvdmlkZXIiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlIiwiRGF0YVByb3ZpZGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkRhdGFQcm92aWRlclNlcnZpY2UuZ2V0RGF0YSIsIkRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmRlbGV0ZURhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiRGF0YVByb3ZpZGVyU2VydmljZS5hZGRNZXRhSW5mbyIsIkRhdGFQcm92aWRlclNlcnZpY2UuaXNMb2dvdXRTZXJ2aWNlIiwiQXBwQ29udHJvbGxlciIsIkFwcENvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJBcHBDb250cm9sbGVyLmlzTm90RW1wdHkiLCJBcHBDb250cm9sbGVyLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiQXBwQ29udHJvbGxlci5sb2dvdXQiLCJBcHBDb250cm9sbGVyLmdldFVzZXJEZWZhdWx0UGFnZSIsIkFwcENvbnRyb2xsZXIuc2hvd0Rhc2hib2FyZCIsIk1pc1NlcnZpY2UiLCJNaXNTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTWlzU2VydmljZS5nZXRNZXRyaWNTbmFwc2hvdCIsIk1pc1NlcnZpY2UuZ2V0VGFyZ2V0VnNBY3R1YWwiLCJNaXNTZXJ2aWNlLmdldFJldmVudWVBbmFseXNpcyIsIk1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlIiwiTWlzU2VydmljZS5nZXRTZWN0b3JDYXJyaWVyQW5hbHlzaXMiLCJNaXNTZXJ2aWNlLmdldFBheEZsb3duTWlzSGVhZGVyIiwiTWlzU2VydmljZS5nZXRSb3V0ZVJldmVudWVEcmlsbERvd24iLCJNaXNTZXJ2aWNlLmdldEJhckRyaWxsRG93biIsIk1pc1NlcnZpY2UuZ2V0RHJpbGxEb3duIiwiQ2hhcnRvcHRpb25TZXJ2aWNlIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLmxpbmVDaGFydE9wdGlvbnMiLCJDaGFydG9wdGlvblNlcnZpY2UubXVsdGlCYXJDaGFydE9wdGlvbnMiLCJDaGFydG9wdGlvblNlcnZpY2UubWV0cmljQmFyQ2hhcnRPcHRpb25zIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLnRhcmdldEJhckNoYXJ0T3B0aW9ucyIsIkZpbHRlcmVkTGlzdFNlcnZpY2UiLCJGaWx0ZXJlZExpc3RTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiRmlsdGVyZWRMaXN0U2VydmljZS5zZWFyY2hlZCIsIkZpbHRlcmVkTGlzdFNlcnZpY2UucGFnZWQiLCJzZWFyY2hVdGlsIiwiT3BlcmF0aW9uYWxTZXJ2aWNlIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldFBheEZsb3duT3BySGVhZGVyIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckZsaWdodFByb2NTdGF0dXMiLCJPcGVyYXRpb25hbFNlcnZpY2UuZ2V0T3ByRmxpZ2h0Q291bnRCeVJlYXNvbiIsIk9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJDb3Vwb25Db3VudEJ5RXhjZXB0aW9uIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldERyaWxsRG93biIsIlVzZXJTZXJ2aWNlIiwiVXNlclNlcnZpY2UuY29uc3RydWN0b3IiLCJVc2VyU2VydmljZS5zZXRVc2VyIiwiVXNlclNlcnZpY2UubG9nb3V0IiwiVXNlclNlcnZpY2UuaXNMb2dnZWRJbiIsIlVzZXJTZXJ2aWNlLmlzVXNlckxvZ2dlZEluIiwiVXNlclNlcnZpY2UuZ2V0VXNlciIsIlVzZXJTZXJ2aWNlLmxvZ2luIiwiVXNlclNlcnZpY2UuZ2V0VXNlclByb2ZpbGUiLCJVc2VyU2VydmljZS5zaG93RGFzaGJvYXJkIiwiVXNlclNlcnZpY2UuZ2V0RGVmYXVsdFBhZ2UiLCJNaXNDb250cm9sbGVyIiwiTWlzQ29udHJvbGxlci5jb25zdHJ1Y3RvciIsIk1pc0NvbnRyb2xsZXIuaW5pdERhdGEiLCJNaXNDb250cm9sbGVyLmdldFByb2ZpbGVVc2VyTmFtZSIsIk1pc0NvbnRyb2xsZXIuc2VsZWN0ZWRGbG93bk1vbnRoIiwiTWlzQ29udHJvbGxlci5vcGVuaW5mb1BvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3NlUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIuY2xvc2VzQmFyUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIuY2xvc2VJbmZvUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIudXBkYXRlSGVhZGVyIiwiTWlzQ29udHJvbGxlci5vblNsaWRlTW92ZSIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlTWV0cmljIiwiTWlzQ29udHJvbGxlci50b2dnbGVTdXJjaGFyZ2UiLCJNaXNDb250cm9sbGVyLnRvZ2dsZVRhcmdldCIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlU2VjdG9yIiwiTWlzQ29udHJvbGxlci5jYWxsTWV0cmljU25hcHNob3QiLCJNaXNDb250cm9sbGVyLmNhbGxUYXJnZXRWc0FjdHVhbCIsIk1pc0NvbnRyb2xsZXIuY2FsbFJvdXRlUmV2ZW51ZSIsIk1pc0NvbnRyb2xsZXIuY2FsbFJldmVudWVBbmFseXNpcyIsIk1pc0NvbnRyb2xsZXIub3BlbkRyaWxsRG93biIsIk1pc0NvbnRyb2xsZXIuY2xlYXJEcmlsbCIsIk1pc0NvbnRyb2xsZXIuZHJpbGxEb3duUmVxdWVzdCIsIk1pc0NvbnRyb2xsZXIuZ2V0RHJpbGxEb3duVVJMIiwiTWlzQ29udHJvbGxlci5vcGVuQmFyRHJpbGxEb3duIiwiTWlzQ29udHJvbGxlci5pbml0aWF0ZUFycmF5IiwiTWlzQ29udHJvbGxlci5vcGVuQmFyRHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblRhcmdldERyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5SZXZlbnVlRHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblJldmVudWVQYXNzZW5nZXJEcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5vcGVuUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblNlY3RvclBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNhbGxTZWN0b3JDYXJyaWVyQW5hbHlzaXMiLCJNaXNDb250cm9sbGVyLnRhcmdldEFjdHVhbEZpbHRlciIsIk1pc0NvbnRyb2xsZXIuc2VjdG9yQ2FycmllckZpbHRlciIsIk1pc0NvbnRyb2xsZXIucmV2ZW51ZUFuYWx5c2lzRmlsdGVyIiwiTWlzQ29udHJvbGxlci5nZXRGbG93bkZhdm9yaXRlcyIsIk1pc0NvbnRyb2xsZXIuaW9uaWNMb2FkaW5nU2hvdyIsIk1pc0NvbnRyb2xsZXIuaW9uaWNMb2FkaW5nSGlkZSIsIk1pc0NvbnRyb2xsZXIub3BlbkRyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3Nlc1BvcG92ZXIiLCJNaXNDb250cm9sbGVyLmlzRHJpbGxSb3dTZWxlY3RlZCIsIk1pc0NvbnRyb2xsZXIuc2VhcmNoUmVzdWx0cyIsIk1pc0NvbnRyb2xsZXIucGFnaW5hdGlvbiIsIk1pc0NvbnRyb2xsZXIuc2V0UGFnZSIsIk1pc0NvbnRyb2xsZXIubGFzdFBhZ2UiLCJNaXNDb250cm9sbGVyLnJlc2V0QWxsIiwiTWlzQ29udHJvbGxlci5zb3J0IiwiTWlzQ29udHJvbGxlci5yYW5nZSIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlR3JvdXAiLCJNaXNDb250cm9sbGVyLmlzR3JvdXBTaG93biIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlQ2hhcnRPclRhYmxlVmlldyIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlVGFyZ2V0VmlldyIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlUmV2ZW51ZVZpZXciLCJNaXNDb250cm9sbGVyLnRvZ2dsZVNlY3RvclZpZXciLCJNaXNDb250cm9sbGVyLnJ1blJlcG9ydCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pbml0RGF0YSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnNlbGVjdGVkRmxvd25Nb250aCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmdldFByb2ZpbGVVc2VyTmFtZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnVwZGF0ZUhlYWRlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9uU2xpZGVNb3ZlIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2FsbE15RGFzaGJvYXJkIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2FsbEZsaWdodFByb2NTdGF0dXMiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jYWxsRmxpZ2h0Q291bnRCeVJlYXNvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNhbGxDb3Vwb25Db3VudEJ5RXhjZXB0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlblBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vcGVuUGllUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNsb3NlUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmlvbmljTG9hZGluZ1Nob3ciLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5hcHBseUNoYXJ0Q29sb3JDb2RlcyIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmdldEZhdm9yaXRlSXRlbXMiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jb2xvckZ1bmN0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuZm91ckJhckNvbG9yRnVuY3Rpb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vcGVuaW5mb1BvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jbG9zZUluZm9Qb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudG9nZ2xlQ291bnQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pb25pY0xvYWRpbmdIaWRlIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudGFiTG9ja1NsaWRlIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIud2Vla0RhdGFQcmV2IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIud2Vla0RhdGFOZXh0IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudG9nZ2xlRmxpZ2h0U3RhdHVzVmlldyIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUZsaWdodFJlYXNvblZpZXciLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50b2dnbGVDQ0V4Y2VwdGlvblZpZXciLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5ydW5SZXBvcnQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vcGVuRmxpZ2h0UHJvY2Vzc0RyaWxsUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5Db3VucG9uQ291bnREcmlsbFBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vcGVuRmxpZ2h0Q291bnREcmlsbFBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5kcmlsbERvd25SZXF1ZXN0IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuZ2V0RHJpbGxEb3duVVJMIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudGFiU2xpZGVIYXNDaGFuZ2VkIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbkRyaWxsRG93biIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNsb3NlRHJpbGxQb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2xlYXJEcmlsbCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmluaXRpYXRlQXJyYXkiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pc0RyaWxsUm93U2VsZWN0ZWQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5zZWFyY2hSZXN1bHRzIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIucGFnaW5hdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnNldFBhZ2UiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5sYXN0UGFnZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnJlc2V0QWxsIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuc29ydCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnJhbmdlIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudG9nZ2xlR3JvdXAiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pc0dyb3VwU2hvd24iLCJMb2dpbkNvbnRyb2xsZXIiLCJMb2dpbkNvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJMb2dpbkNvbnRyb2xsZXIuY2xlYXJFcnJvciIsIkxvZ2luQ29udHJvbGxlci5kb0xvZ2luIiwiQ2hhcnRFdmVudCIsIkNoYXJ0RXZlbnQuY29uc3RydWN0b3IiLCJDaGFydEV2ZW50LmZhY3RvcnkiLCJDaGFydEV2ZW50LmFwcGVuZENsaWNrIiwicmVwb3J0QnVpbGRlclNlcnZpY2UiLCJyZXBvcnRCdWlsZGVyU2VydmljZS5fZ2VuZXJhdGVSZXBvcnQiLCJyZXBvcnRTdmMiLCJyZXBvcnRTdmMuX3J1blJlcG9ydEFzeW5jIiwicmVwb3J0U3ZjLl9ydW5SZXBvcnREYXRhVVJMIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0RGVmIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0RG9jIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0QnVmZmVyIiwicmVwb3J0U3ZjLmdldERhdGFVUkwiLCJyZXBvcnRTdmMuZ2VuZXJhdGVSZXBvcnRCbG9iIiwicmVwb3J0U3ZjLnNhdmVGaWxlIiwicmVwb3J0U3ZjLnNhdmVGaWxlLmdvdEZTIiwicmVwb3J0U3ZjLnNhdmVGaWxlLmdvdEZpbGVFbnRyeSIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGaWxlV3JpdGVyIiwicmVwb3J0U3ZjLnNhdmVGaWxlLmZhaWwiLCJyZXBvcnRTdmMudW5pcXVlRmlsZU5hbWUiLCJyZXBvcnRTdmMuZ2VuZXJhdGVSZXBv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QUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ3BLQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN6Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDOUZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDMUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQy9GQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUN6QkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDaENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN0Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDN0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO1FBQ2ZBLENBQUNBO0lBQ0hBLENBQUNBO0lBRURBLEVBQUVBLENBQUFBLENBQUNBLFNBQVNBLElBQUlBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO1FBQ3RCQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNoQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDN0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3hDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ2hHQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxnQkFBZ0JBLENBQUNBLENBQUNBLENBQUNBO1FBQ2pDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxJQUFJQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNwREEsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDcEtBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3hDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ2hHQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxjQUFjQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUM1Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDbkdBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO1FBQ2ZBLENBQUNBO0lBQ0hBLENBQUNBO0lBRURBLEVBQUVBLENBQUFBLENBQUNBLFNBQVNBLElBQUlBLGNBQWNBLENBQUNBLENBQUNBLENBQUNBO1FBQy9CQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNuQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDaEdBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzNDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNsR0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsY0FBY0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDL0JBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ25DQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNoR0EsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDM0NBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ2xHQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxVQUFVQSxJQUFJQSxTQUFTQSxJQUFJQSxpQkFBaUJBLENBQUNBLENBQUNBLENBQUNBO1FBQzdEQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNqQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDN0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLElBQUlBLElBQUlBLENBQUNBLFNBQVNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzNEQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxJQUFJQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNwS0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENB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QSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxpQkFBaUJBLENBQUNBLENBQUNBLENBQUNBO1lBQ2hDQSxJQUFJQSxVQUFVQSxHQUFHQSxDQUFDQSxZQUFZQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUVwQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDbEJBLElBQUlBLFVBQVVBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLFVBQVVBLEdBQUdBLEVBQUVBLENBQUNBO1lBQzFEQSxJQUFJQSxhQUFhQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxHQUFHQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUN4R0EsSUFBSUEsVUFBVUEsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsVUFBVUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDMURBLElBQUlBLFlBQVlBLEdBQUlBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLEVBQUVBLENBQUNBO1lBQ2pFQSxJQUFJQSxZQUFZQSxHQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxZQUFZQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUVqRUEsSUFBSUEsQ0FBQ0EsZ0JBQWdCQSxFQUFFQSxDQUFDQTtZQUV4QkEsT0FBT0EsR0FBR0E7Z0JBQ05BLFlBQVlBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBO2dCQUNwQ0Esa0JBQWtCQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFH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S0FBS0EsRUFBQ0EsR0FBR0E7UUFDeEJ3QyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxHQUFHQSxDQUFDQTtJQUM1Q0EsQ0FBQ0E7SUFDRHhDLHFDQUFhQSxHQUFiQSxVQUFlQSxLQUFLQSxFQUFDQSxHQUFHQTtRQUNwQnlDLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsVUFBVUEsRUFBRUEsS0FBS0EsRUFBRUEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDdklBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLFVBQVVBLElBQUlBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO1lBQ3ZCQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtZQUNyQkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDakVBLENBQUNBO1FBQ0RBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQzVCQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtJQUMzQkEsQ0FBQ0E7SUFDRHpDLGtDQUFVQSxHQUFWQSxVQUFZQSxLQUFLQTtRQUNiMEMsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsV0FBV0Es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O1FBQ2JBLElBQUlBLEtBQWFBLENBQUNBO1FBQ2xCQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNWQSxFQUFFQSxDQUFBQSxDQUFDQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNiQSxLQUFLQSxHQUFHQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUM5Q0EsQ0FBQ0E7UUFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDZEEsS0FBS0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDWkEsQ0FBQ0E7UUFDREEsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDVkEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsS0FBS0EsRUFBRUEsQ0FBQ0EsR0FBR0EsS0FBS0EsRUFBRUEsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0E7WUFDbkNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ1pBLENBQUNBLEVBQUVBLENBQUNBO1lBQ0pBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUNWQSxLQUFLQSxDQUFDQTtZQUNSQSxDQUFDQTtRQUNIQSxDQUFDQTtRQUNEQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQTtJQUNiQSxDQUFDQTtJQUNEL0MsZ0RBQVdBLEdBQVhBLFVBQVlBLEtBQUtBO1FBQ2ZnRCxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUM3QkEsSUFBSUEsQ0FBQ0EsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDekJBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLElBQUlBLENBQUNBLFVBQVVBLEdB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QSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQTtZQUN6RUEsU0FBU0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsT0FBT0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsT0FBT0EsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0E7WUFDeEVBLFNBQVNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLFFBQVFBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLFFBQVFBLEVBQUVBLENBQUNBLFFBQVFBLEVBQUVBLENBQUNBO1lBQzFFQSxTQUFTQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFVQSxFQUFFQSxHQUFHQSxFQUFFQSxHQUFHQSxHQUFHQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxVQUFVQSxFQUFFQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQTtZQUM5RUEsU0FBU0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBVUEsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsVUFBVUEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0E7WUFDOUVBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLEdBQUNBLEdBQUdBLEdBQUNBLFNBQVNBLENBQUNBO1FBRTdDQSxDQUFDQTtRQUVEYix3QkFBd0JBLEtBQUtBLEVBQUVBLFVBQVVBLEVBQUNBLFVBQVVBO1lBQ25EYyxJQUFJQSxRQUFRQSxHQUFHQSxFQUFFQSxDQUFDQSxLQUFLQSxFQUFFQSxDQUFDQTtZQUUxQkEsSUFBSUEsS0FBS0EsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDZkEsRUFBRUEsQ0FBQUEsQ0FBQ0Es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QztvQkFDdEIsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDdEIsV0FBVyxHQUFHLEVBQUUsQ0FBQztvQkFDakIsVUFBVSxHQUFHLEVBQUUsQ0FBQztvQkFDaEIsU0FBUyxHQUFHLEVBQUUsQ0FBQztvQkFDZixPQUFPLEdBQUcsRUFBRSxDQUFDO29CQUNiLE9BQU8sR0FBRyxFQUFFLENBQUM7b0JBQ2IsT0FBTyxHQUFFLEVBQUUsQ0FBQztvQkFDWixRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUMsT0FBTyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUM7Z0JBQ3RDLENBQUMsQ0FBQ0EsQ0FBQ0E7WUFDSkEsQ0FBQ0E7WUFBQUEsSUFBSUEsQ0FBQUEsQ0FBQ0E7Z0JBQ0xBLFFBQVFBLENBQUNBLE9BQU9BLENBQUNBLEVBQUNBLE9BQU9BLEVBQUVBLE9BQU9BLEVBQUNBLENBQUNBLENBQUNBO1lBQ3RDQSxDQUFDQTtZQUVEQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxPQUFPQSxDQUFDQTtRQUN6QkEsQ0FBQ0E7UUFBQWQsQ0FBQ0E7SUFFRkEsQ0FBQ0E7QUFFSCxDQUFDLENBQUMsRUFBRSxDQUFDIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvaW9uaWMuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi90eXBpbmdzL1NjcmVlbi5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvSXNUYWJsZXQuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi90eXBpbmdzL0luQXBwQnJvd3Nlci5kLnRzXCIgLz4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuXG5jbGFzcyBVdGlscyB7XG5cdHB1YmxpYyBzdGF0aWMgaXNOb3RFbXB0eSguLi52YWx1ZXM6IE9iamVjdFtdKTogYm9vbGVhbiB7XG5cdFx0dmFyIGlzTm90RW1wdHkgPSB0cnVlO1xuXHRcdF8uZm9yRWFjaCh2YWx1ZXMsICh2YWx1ZSkgPT4ge1xuXHRcdFx0aXNOb3RFbXB0eSA9IGlzTm90RW1wdHkgJiYgKGFuZ3VsYXIuaXNEZWZpbmVkKHZhbHVlKSAmJiB2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gJydcblx0XHRcdFx0JiYgISgoXy5pc0FycmF5KHZhbHVlKSB8fCBfLmlzT2JqZWN0KHZhbHVlKSkgJiYgXy5pc0VtcHR5KHZhbHVlKSkgJiYgdmFsdWUgIT0gMCk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGlzTm90RW1wdHk7XG5cdH1cblxuXHRwdWJsaWMgc3RhdGljIGlzTGFuZHNjYXBlKCk6IGJvb2xlYW4ge1xuXHRcdHZhciBpc0xhbmRzY2FwZTogYm9vbGVhbiA9IGZhbHNlO1xuXHRcdGlmICh3aW5kb3cgJiYgd2luZG93LnNjcmVlbiAmJiB3aW5kb3cuc2NyZWVuLm9yaWVudGF0aW9uKSB7XG5cdFx0XHR2YXIgdHlwZTogc3RyaW5nID0gPHN0cmluZz4oXy5pc1N0cmluZyh3aW5kb3cuc2NyZWVuLm9yaWVudGF0aW9uKSA/IHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24gOiB3aW5kb3cuc2NyZWVuLm9yaWVudGF0aW9uLnR5cGUpO1xuXHRcdFx0aWYgKHR5cGUpIHtcblx0XHRcdFx0aXNMYW5kc2NhcGUgPSB0eXBlLmluZGV4T2YoJ2xhbmRzY2FwZScpID49IDA7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBpc0xhbmRzY2FwZTtcblx0fVxuXG5cdHB1YmxpYyBzdGF0aWMgZ2V0VG9kYXlEYXRlKCk6IERhdGUge1xuXHRcdHZhciB0b2RheURhdGUgPSBuZXcgRGF0ZSgpO1xuXHRcdHRvZGF5RGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcblx0XHRyZXR1cm4gdG9kYXlEYXRlO1xuXHR9XG5cdHByaXZhdGUgc3RhdGljIGlzSW50ZWdlcihudW1iZXI6IEJpZ0pzTGlicmFyeS5CaWdKUyk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiBwYXJzZUludChudW1iZXIudG9TdHJpbmcoKSkgPT0gK251bWJlcjtcblx0fVxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG5cbmludGVyZmFjZSBQb2ludE9iamVjdCB7XG5cdGNvZGU6IHN0cmluZyxcblx0ZGVzY3JpcHRpb246IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgSUxvY2FsU3RvcmFnZVNlcnZpY2Uge1xuXHRzZXQoa2V5SWQ6IHN0cmluZywga2V5dmFsdWU6IHN0cmluZyk6IHZvaWQ7XG5cdGdldChrZXlJZDogc3RyaW5nLCBkZWZhdWx0VmFsdWU6IHN0cmluZyk6IHN0cmluZztcblx0c2V0T2JqZWN0KGtleUlkOiBzdHJpbmcsIGtleXZhbHVlOiBhbnlbXSk6IHZvaWQ7XG5cdGdldE9iamVjdChrZXlJZDogc3RyaW5nKTogYW55O1xuXHRpc1JlY2VudEVudHJ5QXZhaWxhYmxlKG9yZ2luT2JqZWN0OiBQb2ludE9iamVjdCwgdHlwZTogc3RyaW5nKTogdm9pZDtcblx0YWRkUmVjZW50RW50cnkoZGF0YTogYW55LCB0eXBlOiBzdHJpbmcpOiB2b2lkO1xufVxuXG5jbGFzcyBMb2NhbFN0b3JhZ2VTZXJ2aWNlIGltcGxlbWVudHMgSUxvY2FsU3RvcmFnZVNlcnZpY2Uge1xuXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHdpbmRvdyddO1xuXHRwcml2YXRlIHJlY2VudEVudHJpZXM6IFtQb2ludE9iamVjdF07XG5cblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSkge1xuXHR9XG5cblx0c2V0KGtleUlkOiBzdHJpbmcsIGtleXZhbHVlOiBzdHJpbmcpOiB2b2lkIHtcblx0XHR0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSA9IGtleXZhbHVlO1xuXHR9XG5cdGdldChrZXlJZDogc3RyaW5nLCBkZWZhdWx0VmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG5cdFx0cmV0dXJuIHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdIHx8IGRlZmF1bHRWYWx1ZTtcblx0fVxuXHRzZXRPYmplY3Qoa2V5SWQ6IHN0cmluZywga2V5dmFsdWU6IGFueVtdKTogdm9pZCB7XG5cdFx0dGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gPSAgSlNPTi5zdHJpbmdpZnkoa2V5dmFsdWUpO1xuXHR9XG5cdGdldE9iamVjdChrZXlJZDogc3RyaW5nKTogYW55IHtcblx0XHRyZXR1cm4gdGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gPyBKU09OLnBhcnNlKHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdKSA6IHVuZGVmaW5lZDtcblx0fVxuXG5cdGlzUmVjZW50RW50cnlBdmFpbGFibGUob3JnaW5PYmplY3Q6IFBvaW50T2JqZWN0LCB0eXBlOiBzdHJpbmcpIHtcblx0XHR0aGlzLnJlY2VudEVudHJpZXMgPSB0aGlzLmdldE9iamVjdCh0eXBlKSA/IHRoaXMuZ2V0T2JqZWN0KHR5cGUpIDogW107XG5cdFx0cmV0dXJuIHRoaXMucmVjZW50RW50cmllcy5maWx0ZXIoZnVuY3Rpb24gKGVudHJ5KSB7IHJldHVybiBlbnRyeS5jb2RlID09PSBvcmdpbk9iamVjdC5jb2RlIH0pO1xuXHR9XG5cblx0YWRkUmVjZW50RW50cnkoZGF0YTogYW55LCB0eXBlOiBzdHJpbmcpIHtcblx0XHR2YXIgb3JnaW5PYmplY3Q6IFBvaW50T2JqZWN0XHQ9XHRkYXRhID8gZGF0YS5vcmlnaW5hbE9iamVjdCA6IHVuZGVmaW5lZDtcblxuXHRcdGlmIChvcmdpbk9iamVjdCkge1xuXHRcdFx0aWYgKHRoaXMuaXNSZWNlbnRFbnRyeUF2YWlsYWJsZShvcmdpbk9iamVjdCwgdHlwZSkubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHRoaXMucmVjZW50RW50cmllcyA9IHRoaXMuZ2V0T2JqZWN0KHR5cGUpID8gdGhpcy5nZXRPYmplY3QodHlwZSkgOiBbXTtcblx0XHRcdFx0KHRoaXMucmVjZW50RW50cmllcy5sZW5ndGggPT0gMykgPyB0aGlzLnJlY2VudEVudHJpZXMucG9wKCkgOiB0aGlzLnJlY2VudEVudHJpZXM7XG5cdFx0XHRcdHRoaXMucmVjZW50RW50cmllcy51bnNoaWZ0KG9yZ2luT2JqZWN0KTtcblx0XHRcdFx0dGhpcy5zZXRPYmplY3QodHlwZSwgdGhpcy5yZWNlbnRFbnRyaWVzKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG5cbmludGVyZmFjZSBJQ29yZG92YUNhbGwge1xuXHQoKTogdm9pZDtcbn1cblxuY2xhc3MgQ29yZG92YVNlcnZpY2Uge1xuXG5cdHByaXZhdGUgY29yZG92YVJlYWR5OiBib29sZWFuID0gZmFsc2U7XG5cdHByaXZhdGUgcGVuZGluZ0NhbGxzOiBJQ29yZG92YUNhbGxbXSA9IFtdO1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZXJlYWR5JywgKCkgPT4ge1xuXHRcdFx0dGhpcy5jb3Jkb3ZhUmVhZHkgPSB0cnVlO1xuXHRcdFx0dGhpcy5leGVjdXRlUGVuZGluZygpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZXhlYyhmbjogSUNvcmRvdmFDYWxsLCBhbHRlcm5hdGl2ZUZuPzogSUNvcmRvdmFDYWxsKSB7XG5cdFx0aWYgKHRoaXMuY29yZG92YVJlYWR5KSB7XG5cdFx0XHRmbigpO1xuXHRcdH0gZWxzZSBpZiAoIWFsdGVybmF0aXZlRm4pIHtcblx0XHRcdHRoaXMucGVuZGluZ0NhbGxzLnB1c2goZm4pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRhbHRlcm5hdGl2ZUZuKCk7XG5cdFx0fVxuXHR9XG5cblx0cHJpdmF0ZSBleGVjdXRlUGVuZGluZygpIHtcblx0XHR0aGlzLnBlbmRpbmdDYWxscy5mb3JFYWNoKChmbikgPT4ge1xuXHRcdFx0Zm4oKTtcblx0XHR9KTtcblxuXHRcdHRoaXMucGVuZGluZ0NhbGxzID0gW107XG5cdH1cblxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vdHlwaW5ncy9hbmd1bGFyanMvYW5ndWxhci5kLnRzXCIvPlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxuXG5pbnRlcmZhY2UgSU5ldFNlcnZpY2Uge1xuXHRnZXREYXRhKGZyb21Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xuXHRwb3N0RGF0YSh0b1VybDogc3RyaW5nLCBkYXRhOiBhbnkpOiBuZy5JSHR0cFByb21pc2U8YW55Pjtcblx0ZGVsZXRlRGF0YSh0b1VybDogc3RyaW5nKTogbmcuSUh0dHBQcm9taXNlPGFueT47XG5cdGNoZWNrU2VydmVyQXZhaWxhYmlsaXR5KCk6IG5nLklQcm9taXNlPGJvb2xlYW4+O1xufVxuXG5jbGFzcyBOZXRTZXJ2aWNlIGltcGxlbWVudHMgSU5ldFNlcnZpY2Uge1xuXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJGh0dHAnLCAnQ29yZG92YVNlcnZpY2UnLCAnJHEnLCAnVVJMX1dTJywgJ09XTkVSX0NBUlJJRVJfQ09ERSddO1xuXHRwcml2YXRlIGZpbGVUcmFuc2ZlcjogRmlsZVRyYW5zZmVyO1xuXHRwcml2YXRlIGlzU2VydmVyQXZhaWxhYmxlOiBib29sZWFuID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkaHR0cDogbmcuSUh0dHBTZXJ2aWNlLCBwcml2YXRlIGNvcmRvdmFTZXJ2aWNlOiBDb3Jkb3ZhU2VydmljZSwgcHJvdGVjdGVkICRxOiBuZy5JUVNlcnZpY2UsIHB1YmxpYyBVUkxfV1M6IHN0cmluZywgcHJpdmF0ZSBPV05FUl9DQVJSSUVSX0NPREU6IHN0cmluZykge1xuXHRcdHRoaXMuJGh0dHAuZGVmYXVsdHMudGltZW91dCA9IDYwMDAwO1xuXHRcdGNvcmRvdmFTZXJ2aWNlLmV4ZWMoKCkgPT4ge1xuXHRcdFx0Ly8gdGhpcy5maWxlVHJhbnNmZXIgPSBuZXcgRmlsZVRyYW5zZmVyKCk7XG5cdFx0fSk7XG5cdH1cblxuXHRnZXREYXRhKGZyb21Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcblx0XHR2YXIgdXJsOiBzdHJpbmcgPSBTRVJWRVJfVVJMICsgZnJvbVVybDtcblx0XHRyZXR1cm4gdGhpcy4kaHR0cC5nZXQodXJsKTtcblx0fVxuXG5cdHBvc3REYXRhKHRvVXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcblx0XHRyZXR1cm4gdGhpcy4kaHR0cC5wb3N0KFNFUlZFUl9VUkwgKyB0b1VybCwgdGhpcy5hZGRNZXRhSW5mbyhkYXRhKSk7XG5cdH1cblxuXHRkZWxldGVEYXRhKHRvVXJsOiBzdHJpbmcpOiBuZy5JSHR0cFByb21pc2U8YW55PiB7XG5cdFx0cmV0dXJuIHRoaXMuJGh0dHAuZGVsZXRlKFNFUlZFUl9VUkwgKyB0b1VybCk7XG5cdH1cblxuXHR1cGxvYWRGaWxlKFxuXHRcdHRvVXJsOiBzdHJpbmcsIHVybEZpbGU6IHN0cmluZyxcblx0XHRvcHRpb25zOiBGaWxlVXBsb2FkT3B0aW9ucywgc3VjY2Vzc0NhbGxiYWNrOiAocmVzdWx0OiBGaWxlVXBsb2FkUmVzdWx0KSA9PiB2b2lkLFxuXHRcdGVycm9yQ2FsbGJhY2s6IChlcnJvcjogRmlsZVRyYW5zZmVyRXJyb3IpID0+IHZvaWQsIHByb2dyZXNzQ2FsbGJhY2s/OiAocHJvZ3Jlc3NFdmVudDogUHJvZ3Jlc3NFdmVudCkgPT4gdm9pZCkge1xuXHRcdGlmICghdGhpcy5maWxlVHJhbnNmZXIpIHtcblx0XHRcdHRoaXMuZmlsZVRyYW5zZmVyID0gbmV3IEZpbGVUcmFuc2ZlcigpO1xuXHRcdH1cblx0XHRjb25zb2xlLmxvZyhvcHRpb25zLnBhcmFtcyk7XG5cdFx0dGhpcy5maWxlVHJhbnNmZXIub25wcm9ncmVzcyA9IHByb2dyZXNzQ2FsbGJhY2s7XG5cdFx0dmFyIHVybDogc3RyaW5nID0gU0VSVkVSX1VSTCArIHRvVXJsO1xuXHRcdHRoaXMuZmlsZVRyYW5zZmVyLnVwbG9hZCh1cmxGaWxlLCB1cmwsIHN1Y2Nlc3NDYWxsYmFjaywgZXJyb3JDYWxsYmFjaywgb3B0aW9ucyk7XG5cdH1cblxuXHRjaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpOiBuZy5JUHJvbWlzZTxib29sZWFuPiB7XG5cdFx0dmFyIGF2YWlsYWJpbGl0eTogYm9vbGVhbiA9IHRydWU7XG5cblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8Ym9vbGVhbj4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cblx0XHR0aGlzLmNvcmRvdmFTZXJ2aWNlLmV4ZWMoKCkgPT4ge1xuXHRcdFx0aWYgKHdpbmRvdy5uYXZpZ2F0b3IpIHsgLy8gb24gZGV2aWNlXG5cdFx0XHRcdHZhciBuYXZpZ2F0b3I6IE5hdmlnYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3I7XG5cdFx0XHRcdGlmIChuYXZpZ2F0b3IuY29ubmVjdGlvbiAmJiAoKG5hdmlnYXRvci5jb25uZWN0aW9uLnR5cGUgPT0gQ29ubmVjdGlvbi5OT05FKSB8fCAobmF2aWdhdG9yLmNvbm5lY3Rpb24udHlwZSA9PSBDb25uZWN0aW9uLlVOS05PV04pKSkge1xuXHRcdFx0XHRcdGF2YWlsYWJpbGl0eSA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRkZWYucmVzb2x2ZShhdmFpbGFiaWxpdHkpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0c2VydmVySXNBdmFpbGFibGUoKTogYm9vbGVhbiB7XG5cdFx0dmFyIHRoYXQ6IE5ldFNlcnZpY2UgPSB0aGlzO1xuXG5cdFx0dmFyIHNlcnZlcklzQXZhaWxhYmxlID0gdGhpcy5jaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpLnRoZW4oKHJlc3VsdDogYm9vbGVhbikgPT4ge1xuXHRcdFx0dGhhdC5pc1NlcnZlckF2YWlsYWJsZSA9IHJlc3VsdDtcblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzLmlzU2VydmVyQXZhaWxhYmxlO1xuXHR9XG5cblx0Y2FuY2VsQWxsVXBsb2FkRG93bmxvYWQoKSB7XG5cdFx0aWYgKHRoaXMuZmlsZVRyYW5zZmVyKSB7XG5cdFx0XHR0aGlzLmZpbGVUcmFuc2Zlci5hYm9ydCgpO1xuXHRcdH1cblx0fVxuXG5cdGFkZE1ldGFJbmZvKHJlcXVlc3REYXRhOiBhbnkpOiBhbnkge1xuXHRcdHZhciBkZXZpY2U6IElvbmljLklEZXZpY2UgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKVxuXHRcdHZhciBtb2RlbDogc3RyaW5nID0gJ2RldmljZSBJbmZvJztcblx0XHR2YXIgb3NUeXBlOiBzdHJpbmcgPSAnOC40Jztcblx0XHR2YXIgb3NWZXJzaW9uOiBzdHJpbmcgPSAnaW9zJztcblx0XHR2YXIgZGV2aWNlVG9rZW46IHN0cmluZyA9ICdzdHJpbmcnO1xuXHRcdGlmIChkZXZpY2UpIHtcblx0XHRcdG1vZGVsID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkubW9kZWw7XG5cdFx0XHRvc1R5cGUgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5wbGF0Zm9ybTtcblx0XHRcdG9zVmVyc2lvbiA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLnZlcnNpb247XG5cdFx0fVxuXHRcdGlmICghbW9kZWwpIHtcblx0XHRcdG1vZGVsID0gJ2RldmljZSBJbmZvJztcdFxuXHRcdH1cblx0XHRpZiAoIW9zVHlwZSkge1xuXHRcdFx0b3NUeXBlID0gJzguNCc7XHRcblx0XHR9XG5cdFx0aWYgKCFvc1ZlcnNpb24pIHtcblx0XHRcdG9zVmVyc2lvbiA9ICdpb3MnO1x0XG5cdFx0fVxuXHRcdFxuXHRcdHZhciBtZXRhSW5mbyA9IHtcblx0XHRcdCdjaGFubmVsSWRlbnRpZmllcic6ICdNT0InLFxuXHRcdFx0J2RhdGVUaW1lU3RhbXAnOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcblx0XHRcdCdvd25lckNhcnJpZXJDb2RlJzogdGhpcy5PV05FUl9DQVJSSUVSX0NPREUsXG5cdFx0XHQnYWRkaXRpb25hbEluZm8nOiB7XG5cdFx0XHRcdCdkZXZpY2VUeXBlJzogd2luZG93LmlzVGFibGV0ID8gJ1RhYmxldCcgOiAnUGhvbmUnLFxuXHRcdFx0XHQnbW9kZWwnOiBtb2RlbCxcblx0XHRcdFx0J29zVHlwZSc6IG9zVHlwZSxcblx0XHRcdFx0J29zVmVyc2lvbic6IG9zVmVyc2lvbixcblx0XHRcdFx0J2RldmljZVRva2VuJzogZGV2aWNlVG9rZW4sXG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xuXHRcdFx0J21ldGFJbmZvJzogbWV0YUluZm8sXG5cdFx0XHQncmVxdWVzdERhdGEnOiByZXF1ZXN0RGF0YVxuXHRcdH07XG5cdFx0cmV0dXJuIHJlcXVlc3RPYmo7XG5cdH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTmV0U2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxuXG5tb2R1bGUgZXJyb3JoYW5kbGVyIHtcblx0ZXhwb3J0IGNvbnN0IFNUQVRVU19GQUlMOiBzdHJpbmcgPSAnZmFpbCc7XG5cdGV4cG9ydCBjb25zdCBTRVZFUklUWV9FUlJPUl9IQVJEOiBzdHJpbmcgPSAnSEFSRCc7XG5cdGV4cG9ydCBjb25zdCBTRVZFUklUWV9FUlJPUl9TT0ZUOiBzdHJpbmcgPSAnU09GVCc7XG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX0lOVkFMSURfU0VTU0lPTl9UT0tFTiA9ICdTRUMuMDI1Jztcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OID0gJ1NFUy4wMDQnO1xuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9UT0tFTl9FWFBJUkVEID0gJ1NFQy4wMzgnO1xuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9JTlZBTElEX1VTRVJfU0VTU0lPTl9FWFBJUkVEID0gJ1NFUy4wMDMnO1xuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9OT19SRVNVTFQgPSAnQ09NLjExMSc7XG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX05PX1JPVVRFID0gJ0ZMVC4wMTAnO1xufVxuXG5jbGFzcyBFcnJvckhhbmRsZXJTZXJ2aWNlIHtcblxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ05ldFNlcnZpY2UnLCAnQ29yZG92YVNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZSddO1xuXG5cdGNvbnN0cnVjdG9yKFxuXHRcdHByaXZhdGUgbmV0U2VydmljZTogTmV0U2VydmljZSwgcHJpdmF0ZSBjb3Jkb3ZhU2VydmljZTogQ29yZG92YVNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcblx0XHRwcml2YXRlICRyb290U2NvcGU6IG5nLklTY29wZSkge1xuXHR9XG5cblx0dmFsaWRhdGVSZXNwb25zZShyZXNwb25zZTogYW55KSB7XG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xuXHRcdGlmICh0aGlzLmhhc0Vycm9ycyhlcnJvcnMpIHx8IGVycm9yaGFuZGxlci5TVEFUVVNfRkFJTCA9PSByZXNwb25zZS5zdGF0dXMpIHtcblx0XHRcdGlmICghdGhpcy5oYXNJbnZhbGlkU2Vzc2lvbkVycm9yKGVycm9ycykgJiYgIXRoaXMuaGFzTm9SZXN1bHRFcnJvcihlcnJvcnMpKSB7XG5cdFx0XHRcdC8vIGJyb2FkY2FzdCB0byBhcHBjb250cm9sbGVyIHNlcnZlciBlcnJvclxuXHRcdFx0XHR0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnc2VydmVyRXJyb3InLCByZXNwb25zZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aXNOb1Jlc3VsdEZvdW5kKHJlc3BvbnNlOiBhbnkpOiBib29sZWFuIHtcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XG5cdFx0cmV0dXJuIHRoaXMuaGFzTm9SZXN1bHRFcnJvcihlcnJvcnMpO1xuXHR9XG5cblx0aXNTZXNzaW9uSW52YWxpZChyZXNwb25zZTogYW55KTogYm9vbGVhbiB7XG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xuXHRcdHJldHVybiB0aGlzLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IoZXJyb3JzKTtcblx0fVxuXG5cdGhhc0hhcmRFcnJvcnMocmVzcG9uc2U6IGFueSk6IGJvb2xlYW4ge1xuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcblx0XHRyZXR1cm4gdGhpcy5oYXNIYXJkRXJyb3IoZXJyb3JzKTtcblx0fVxuXG5cdGhhc1NvZnRFcnJvcnMocmVzcG9uc2U6IGFueSk6IGJvb2xlYW4ge1xuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcblx0XHRyZXR1cm4gdGhpcy5oYXNTb2Z0RXJyb3IoZXJyb3JzKTtcblx0fVxuXG5cdHByaXZhdGUgaGFzRXJyb3JzKGVycm9yczogYW55KTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIGVycm9ycy5sZW5ndGggPiAwO1xuXHR9XG5cblx0cHJpdmF0ZSBoYXNJbnZhbGlkU2Vzc2lvbkVycm9yKGVycm9yczogYW55KTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XG5cdFx0XHRyZXR1cm4gZXJyb3IgJiYgZXJyb3JoYW5kbGVyLlNFVkVSSVRZX0VSUk9SX0hBUkQgPT0gZXJyb3Iuc2V2ZXJpdHkgJiZcblx0XHRcdChlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT05fVE9LRU4gPT0gZXJyb3IuY29kZSB8fFxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT04gPT0gZXJyb3IuY29kZSB8fFxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1VTRVJfU0VTU0lPTl9FWFBJUkVEID09IGVycm9yLmNvZGUgfHxcblx0XHRcdFx0ZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfVE9LRU5fRVhQSVJFRCA9PSBlcnJvci5jb2RlKTtcblx0XHR9KTtcblx0fVxuXG5cdHByaXZhdGUgaGFzTm9SZXN1bHRFcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiBfLnNvbWUoZXJyb3JzLCAoZXJyb3I6IGFueSkgPT4ge1xuXHRcdFx0cmV0dXJuIGVycm9yICYmIGVycm9yaGFuZGxlci5TRVZFUklUWV9FUlJPUl9IQVJEID09IGVycm9yLnNldmVyaXR5ICYmXG5cdFx0XHQoZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfTk9fUkVTVUxUID09IGVycm9yLmNvZGUgfHxcblx0XHRcdFx0ZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfTk9fUk9VVEUgPT0gZXJyb3IuY29kZSk7XG5cdFx0fSkgJiYgZXJyb3JzLmxlbmd0aCA9PSAxO1xuXHR9XG5cblx0cHJpdmF0ZSBoYXNIYXJkRXJyb3IoZXJyb3JzOiBhbnkpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gXy5zb21lKGVycm9ycywgKGVycm9yOiBhbnkpID0+IHtcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfSEFSRCA9PSBlcnJvci5zZXZlcml0eTtcblx0XHR9KTtcblx0fVxuXG5cdHByaXZhdGUgaGFzU29mdEVycm9yKGVycm9yczogYW55KTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XG5cdFx0XHRyZXR1cm4gZXJyb3IgJiYgZXJyb3JoYW5kbGVyLlNFVkVSSVRZX0VSUk9SX1NPRlQgPT0gZXJyb3Iuc2V2ZXJpdHk7XG5cdFx0fSk7XG5cdH1cbn0iLG51bGwsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOZXRTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJDb3Jkb3ZhU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiRXJyb3JIYW5kbGVyU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiSVNlc3Npb25IdHRwUHJvbWlzZS50c1wiIC8+XG5cbm1vZHVsZSBzZXNzaW9uc2VydmljZSB7XG5cdGV4cG9ydCBjb25zdCBIRUFERVJfUkVGUkVTSF9UT0tFTl9LRVk6IHN0cmluZyA9ICd4LXJlZnJlc2gtdG9rZW4nO1xuXHRleHBvcnQgY29uc3QgSEVBREVSX0FDQ0VTU19UT0tFTl9LRVk6IHN0cmluZyA9ICd4LWFjY2Vzcy10b2tlbic7XG5cdGV4cG9ydCBjb25zdCBSRUZSRVNIX1NFU1NJT05fSURfVVJMOiBzdHJpbmcgPSAnL3VzZXIvZ2V0QWNjZXNzVG9rZW4nO1xufVxuXG5jbGFzcyBTZXNzaW9uU2VydmljZSB7XG5cblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydOZXRTZXJ2aWNlJywgJ0Vycm9ySGFuZGxlclNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZScsICckaHR0cCddO1xuXG5cdHByaXZhdGUgYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXM6IElBY2Nlc3NUb2tlblJlZnJlc2hlZEhhbmRsZXJbXTtcblx0cHJpdmF0ZSBzZXNzaW9uSWQ6IHN0cmluZztcblx0cHJpdmF0ZSBjcmVkZW50aWFsSWQ6IHN0cmluZztcblx0cHJpdmF0ZSBpc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzOiBib29sZWFuID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IoXG5cdFx0cHJpdmF0ZSBuZXRTZXJ2aWNlOiBOZXRTZXJ2aWNlLCBwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcblx0XHRwcml2YXRlICRyb290U2NvcGU6IG5nLklTY29wZSwgcHJpdmF0ZSAkaHR0cDogbmcuSUh0dHBTZXJ2aWNlKSB7XG5cdFx0dGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcyA9IFtdO1xuXHRcdHRoaXMuc2Vzc2lvbklkID0gbnVsbDtcblx0XHR0aGlzLmNyZWRlbnRpYWxJZCA9IG51bGw7XG5cdH1cblxuXHRyZXNvbHZlUHJvbWlzZShwcm9taXNlOiBJU2Vzc2lvbkh0dHBQcm9taXNlKSB7XG5cdFx0cHJvbWlzZS5yZXNwb25zZS50aGVuKChyZXNwb25zZSkgPT4ge1xuXHRcdFx0aWYgKCF0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaGFzSGFyZEVycm9ycyhyZXNwb25zZSkgfHwgdGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmlzU2Vzc2lvbkludmFsaWQocmVzcG9uc2UpKSB7XG5cdFx0XHRcdGlmICghdGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmlzU2Vzc2lvbkludmFsaWQocmVzcG9uc2UpKSB7XG5cdFx0XHRcdFx0cHJvbWlzZS5kZWZmZXJlZC5yZXNvbHZlKHByb21pc2UucmVzcG9uc2UpO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdzZXNzaW9uIGlzIHZhbGlkJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5hZGRBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKHByb21pc2UpO1xuXHRcdFx0XHRcdGlmICghdGhpcy5pc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVmcmVzaGluZyBzZXNzaW9uIHRva2VuJyk7XG5cdFx0XHRcdFx0XHR0aGlzLnJlZnJlc2hTZXNzaW9uSWQoKS50aGVuKFxuXHRcdFx0XHRcdFx0XHQodG9rZW5SZXNwb25zZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGlmICh0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaGFzSGFyZEVycm9ycyh0b2tlblJlc3BvbnNlKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRTZXNzaW9uSWQobnVsbCk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciByZXNwb25zZUhlYWRlciA9IHRva2VuUmVzcG9uc2UuaGVhZGVycygpO1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIGFjY2Vzc1Rva2VuOiBzdHJpbmcgPSByZXNwb25zZUhlYWRlcltzZXNzaW9uc2VydmljZS5IRUFERVJfQUNDRVNTX1RPS0VOX0tFWV07XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnNldFNlc3Npb25JZChhY2Nlc3NUb2tlbik7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdGlmICghdGhpcy5nZXRTZXNzaW9uSWQoKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5hY2Nlc3NUb2tlbk5vdFJlZnJlc2hlZCgpO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHQoZXJyb3IpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZXJyb3Igb24gYWNjZXNzIHRva2VuIHJlZnJlc2gnKTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnNldFNlc3Npb25JZChudWxsKTtcblx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5nZXRDcmVkZW50aWFsSWQoKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5hY2Nlc3NUb2tlbk5vdFJlZnJlc2hlZCgpO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRwcm9taXNlLmRlZmZlcmVkLnJlamVjdCgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR0aGlzLmlzUmVmcmVzaFNlc3Npb25JZEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwcm9taXNlLmRlZmZlcmVkLnJlamVjdCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0YWRkQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lcjogSUFjY2Vzc1Rva2VuUmVmcmVzaGVkSGFuZGxlcikge1xuXHRcdHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMucHVzaChsaXN0ZW5lcik7XG5cdH1cblxuXHRyZW1vdmVBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKGxpc3RlbmVyVG9SZW1vdmU6IElBY2Nlc3NUb2tlblJlZnJlc2hlZEhhbmRsZXIpIHtcblx0XHRfLnJlbW92ZSh0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLCAobGlzdGVuZXIpID0+IHtcblx0XHRcdHJldHVybiBsaXN0ZW5lciA9PSBsaXN0ZW5lclRvUmVtb3ZlO1xuXHRcdH0pO1xuXHR9XG5cblx0c2V0Q3JlZGVudGlhbElkKGNyZWRJZDogc3RyaW5nKSB7XG5cdFx0dGhpcy5jcmVkZW50aWFsSWQgPSBjcmVkSWQ7XG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vbltzZXNzaW9uc2VydmljZS5IRUFERVJfUkVGUkVTSF9UT0tFTl9LRVldID0gY3JlZElkO1xuXHR9XG5cblx0c2V0U2Vzc2lvbklkKHNlc3Npb25JZDogc3RyaW5nKSB7XG5cdFx0dGhpcy5zZXNzaW9uSWQgPSBzZXNzaW9uSWQ7XG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vbltzZXNzaW9uc2VydmljZS5IRUFERVJfQUNDRVNTX1RPS0VOX0tFWV0gPSBzZXNzaW9uSWQ7XG5cdH1cblxuXHRnZXRTZXNzaW9uSWQoKTogc3RyaW5nIHtcblx0XHRyZXR1cm4gdGhpcy5zZXNzaW9uSWQgPyB0aGlzLnNlc3Npb25JZCA6IG51bGw7XG5cdH1cblxuXHRnZXRDcmVkZW50aWFsSWQoKTogc3RyaW5nIHtcblx0XHRyZXR1cm4gdGhpcy5jcmVkZW50aWFsSWQgPyB0aGlzLmNyZWRlbnRpYWxJZCA6IG51bGw7XG5cdH1cblxuXHRjbGVhckxpc3RlbmVycygpIHtcblx0XHR0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzID0gW107XG5cdH1cblxuXHRwcml2YXRlIHJlZnJlc2hTZXNzaW9uSWQoKTogbmcuSUh0dHBQcm9taXNlPGFueT4ge1xuXHRcdHRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcyA9IHRydWU7XG5cdFx0dmFyIGFjY2Vzc1Rva2VuUmVxdWVzdDogYW55ID0ge1xuXHRcdFx0cmVmcmVzaFRva2VuOiB0aGlzLmNyZWRlbnRpYWxJZFxuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5uZXRTZXJ2aWNlLnBvc3REYXRhKHNlc3Npb25zZXJ2aWNlLlJFRlJFU0hfU0VTU0lPTl9JRF9VUkwsIGFjY2Vzc1Rva2VuUmVxdWVzdCk7XG5cdH1cblxuXHRwcml2YXRlIGFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkKCkge1xuXHRcdF8uZm9yRWFjaCh0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLCAobGlzdGVuZXIpID0+IHtcblx0XHRcdGlmIChsaXN0ZW5lci5vblRva2VuRmFpbGVkKSB7XG5cdFx0XHRcdGxpc3RlbmVyLm9uVG9rZW5GYWlsZWQobGlzdGVuZXIpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5yZW1vdmVBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKGxpc3RlbmVyKTtcblx0XHR9KTtcblx0fVxuXG5cdHByaXZhdGUgYWNjZXNzVG9rZW5SZWZyZXNoZWQoKSB7XG5cdFx0Xy5mb3JFYWNoKHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMsIChsaXN0ZW5lcikgPT4ge1xuXHRcdFx0aWYgKGxpc3RlbmVyKSB7XG5cdFx0XHRcdGlmIChsaXN0ZW5lci5vblRva2VuUmVmcmVzaGVkKSB7XG5cdFx0XHRcdFx0bGlzdGVuZXIub25Ub2tlblJlZnJlc2hlZChsaXN0ZW5lcik7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkobGlzdGVuZXIpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0xlbmd0aCA9ICcsIHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMubGVuZ3RoKTtcblx0XHRcdH1cblx0XHRcdHRoaXMucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lcik7XG5cdFx0fSk7XG5cdH1cbn0iLG51bGwsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOZXRTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJDb3Jkb3ZhU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiU2Vzc2lvblNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkVycm9ySGFuZGxlclNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIklTZXNzaW9uSHR0cFByb21pc2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkdlbmVyaWNSZXNwb25zZS50c1wiIC8+XG5cbm1vZHVsZSBkYXRhcHJvdmlkZXIge1xuXHRleHBvcnQgY29uc3QgU0VSVklDRV9VUkxfTE9HT1VUID0gJy91c2VyL2xvZ291dCc7XG59XG5cbmNsYXNzIERhdGFQcm92aWRlclNlcnZpY2Uge1xuXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnTmV0U2VydmljZScsICdDb3Jkb3ZhU2VydmljZScsICckcScsICckcm9vdFNjb3BlJywgJ0Vycm9ySGFuZGxlclNlcnZpY2UnLCAnU2Vzc2lvblNlcnZpY2UnLCAnT1dORVJfQ0FSUklFUl9DT0RFJ107XG5cblx0cHJpdmF0ZSBpc0Nvbm5lY3RlZFRvTmV0d29yazogYm9vbGVhbiA9IHRydWU7XG5cdHByaXZhdGUgbmF2aWdhdG9yOiBOYXZpZ2F0b3I7XG5cblx0Y29uc3RydWN0b3IoXG5cdFx0cHJpdmF0ZSBuZXRTZXJ2aWNlOiBOZXRTZXJ2aWNlLCBwcml2YXRlIGNvcmRvdmFTZXJ2aWNlOiBDb3Jkb3ZhU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLFxuXHRcdHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVNjb3BlLCBwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UsXG5cdFx0cHJpdmF0ZSBzZXNzaW9uU2VydmljZTogU2Vzc2lvblNlcnZpY2UsIHByaXZhdGUgT1dORVJfQ0FSUklFUl9DT0RFOiBzdHJpbmcpIHtcblxuXHRcdHRoaXMuY29yZG92YVNlcnZpY2UuZXhlYygoKSA9PiB7XG5cdFx0XHRpZiAod2luZG93LmNvcmRvdmEgJiYgd2luZG93LmRvY3VtZW50KSB7IC8vIG9uIGRldmljZVxuXHRcdFx0XHRuYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xuXHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrID0gbmF2aWdhdG9yLm9uTGluZTtcblx0XHRcdFx0d2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG5cdFx0XHRcdFx0J29ubGluZScsXG5cdFx0XHRcdFx0KCkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3VzZXIgb25saW5lJyk7XG5cdFx0XHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrID0gdHJ1ZTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGZhbHNlKTtcblx0XHRcdFx0d2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG5cdFx0XHRcdFx0J29mZmxpbmUnLFxuXHRcdFx0XHRcdCgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCd1c2VyIG9mZmxpbmUnKTtcblx0XHRcdFx0XHRcdHRoaXMuaXNDb25uZWN0ZWRUb05ldHdvcmsgPSBmYWxzZTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGZhbHNlKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGdldERhdGEocmVxOiBzdHJpbmcpOiBuZy5JUHJvbWlzZTxhbnk+IHtcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblxuXHRcdGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcblx0XHRcdGRlZi5yZXNvbHZlKHRoaXMubmV0U2VydmljZS5nZXREYXRhKHJlcSkpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XG5cdFx0XHQvLyB0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnbm9OZXR3b3JrJyk7XG5cdFx0XHRkZWYucmVqZWN0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0cG9zdERhdGEocmVxOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyk6IG5nLklQcm9taXNlPGFueT4ge1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXG5cdFx0dmFyIHJlc3BvbnNlOiBuZy5JUHJvbWlzZTxhbnk+ID0gdGhpcy5uZXRTZXJ2aWNlLnBvc3REYXRhKHJlcSwgZGF0YSwgY29uZmlnKTtcblxuXHRcdGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcblx0XHRcdHJlc3BvbnNlLnRoZW4oXG5cdFx0XHQoaHR0cFJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdGRlZi5yZXNvbHZlKGh0dHBSZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdTZXJ2ZXIgdW5hdmFpbGFibGUnKTtcblx0XHRcdFx0Ly8gYnJvYWRjYXN0IHNlcnZlciBpcyB1bmF2YWlsYWJsZVxuXHRcdFx0XHR0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnc2VydmVyTm90QXZhaWxhYmxlJyk7XG5cdFx0XHRcdGRlZi5yZWplY3QoKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRkZWYucmVqZWN0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0ZGVsZXRlRGF0YShyZXE6IHN0cmluZyk6IG5nLklQcm9taXNlPGFueT4ge1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXG5cdFx0aWYgKHRoaXMuaGFzTmV0d29ya0Nvbm5lY3Rpb24oKSkge1xuXHRcdFx0ZGVmLnJlc29sdmUodGhpcy5uZXRTZXJ2aWNlLmRlbGV0ZURhdGEocmVxKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnNvbGUubG9nKCdTZXJ2ZXIgdW5hdmFpbGFibGUnKTtcblx0XHRcdGRlZi5yZWplY3QoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRoYXNOZXR3b3JrQ29ubmVjdGlvbigpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gKG5hdmlnYXRvci5vbkxpbmUgfHwgdGhpcy5pc0Nvbm5lY3RlZFRvTmV0d29yayk7XG5cdH1cblxuXG5cdC8vIFRPRE86IHJlbW92ZSB0aGlzIHRlbXAgbWV0aG9kIGFuZCB1c2UgZ2VuZXJpY3Ncblx0YWRkTWV0YUluZm8ocmVxdWVzdERhdGE6IGFueSk6IGFueSB7XG5cdFx0dmFyIGRldmljZTogSW9uaWMuSURldmljZSA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpXG5cdFx0dmFyIG1vZGVsOiBzdHJpbmcgPSAnJztcblx0XHR2YXIgb3NUeXBlOiBzdHJpbmcgPSAnJztcblx0XHR2YXIgb3NWZXJzaW9uOiBzdHJpbmcgPSAnJztcblx0XHR2YXIgZGV2aWNlVG9rZW46IHN0cmluZyA9ICcnO1xuXHRcdGlmIChkZXZpY2UpIHtcblx0XHRcdG1vZGVsID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkubW9kZWw7XG5cdFx0XHRvc1R5cGUgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5wbGF0Zm9ybTtcblx0XHRcdG9zVmVyc2lvbiA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLnZlcnNpb247XG5cdFx0fVxuXHRcdHZhciBtZXRhSW5mbyA9IHtcblx0XHRcdCdjaGFubmVsSWRlbnRpZmllcic6ICdNT0InLFxuXHRcdFx0J2RhdGVUaW1lU3RhbXAnOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcblx0XHRcdCdvd25lckNhcnJpZXJDb2RlJzogdGhpcy5PV05FUl9DQVJSSUVSX0NPREUsXG5cdFx0XHQnYWRkaXRpb25hbEluZm8nOiB7XG5cdFx0XHRcdCdkZXZpY2VUeXBlJzogd2luZG93LmlzVGFibGV0ID8gJ1RhYmxldCcgOiAnUGhvbmUnLFxuXHRcdFx0XHQnbW9kZWwnOiBtb2RlbCxcblx0XHRcdFx0J29zVHlwZSc6IG9zVHlwZSxcblx0XHRcdFx0J29zVmVyc2lvbic6IG9zVmVyc2lvbixcblx0XHRcdFx0J2RldmljZVRva2VuJzogZGV2aWNlVG9rZW4sXG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xuXHRcdFx0J21ldGFJbmZvJzogbWV0YUluZm8sXG5cdFx0XHQncmVxdWVzdERhdGEnOiByZXF1ZXN0RGF0YVxuXHRcdH07XG5cdFx0cmV0dXJuIHJlcXVlc3RPYmo7XG5cdH1cblxuXHRwcml2YXRlIGlzTG9nb3V0U2VydmljZShyZXF1ZXN0VXJsOiBzdHJpbmcpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gZGF0YXByb3ZpZGVyLlNFUlZJQ0VfVVJMX0xPR09VVCA9PSByZXF1ZXN0VXJsO1xuXHR9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdXRpbHMvVXRpbHMudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9Mb2NhbFN0b3JhZ2VTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tbW9uL3NlcnZpY2VzL0Vycm9ySGFuZGxlclNlcnZpY2UudHNcIiAvPlxuXG5jbGFzcyBBcHBDb250cm9sbGVyIHtcblxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzdGF0ZScsICckc2NvcGUnLCAnRGF0YVByb3ZpZGVyU2VydmljZScsICdVc2VyU2VydmljZScsXG5cdFx0JyRpb25pY1BsYXRmb3JtJywgJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCAnJGlvbmljUG9wdXAnLFxuXHRcdCckaW9uaWNMb2FkaW5nJywgJyRpb25pY0hpc3RvcnknLCAnRXJyb3JIYW5kbGVyU2VydmljZSddO1xuXG5cdGNvbnN0cnVjdG9yKFxuXHRcdHByb3RlY3RlZCAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSxcblx0XHRwcm90ZWN0ZWQgJHNjb3BlOiBuZy5JU2NvcGUsXG5cdFx0cHJvdGVjdGVkIGRhdGFQcm92aWRlclNlcnZpY2U6IERhdGFQcm92aWRlclNlcnZpY2UsXG5cdFx0cHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UsXG5cdFx0cHJpdmF0ZSAkaW9uaWNQbGF0Zm9ybTogSW9uaWMuSVBsYXRmb3JtLFxuXHRcdHByaXZhdGUgbG9jYWxTdG9yYWdlU2VydmljZTogTG9jYWxTdG9yYWdlU2VydmljZSxcblx0XHRwcml2YXRlICRpb25pY1BvcHVwOiBJb25pYy5JUG9wdXAsXG5cdFx0cHJpdmF0ZSAkaW9uaWNMb2FkaW5nOiBJb25pYy5JTG9hZGluZyxcblx0XHRwcml2YXRlICRpb25pY0hpc3Rvcnk6IGFueSxcblx0XHRwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UpIHtcblx0fVxuXG5cdGlzTm90RW1wdHkodmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiBVdGlscy5pc05vdEVtcHR5KHZhbHVlKTtcblx0fVxuXG5cdHB1YmxpYyBoYXNOZXR3b3JrQ29ubmVjdGlvbigpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gdGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLmhhc05ldHdvcmtDb25uZWN0aW9uKCk7XG5cdH1cblxuXHRsb2dvdXQoKSB7XG5cdFx0dGhpcy4kaW9uaWNIaXN0b3J5LmNsZWFyQ2FjaGUoKTtcblx0XHR0aGlzLnVzZXJTZXJ2aWNlLmxvZ291dCgpO1xuXHRcdHRoaXMuJHN0YXRlLmdvKFwibG9naW5cIik7XG5cdH1cblxuXHRnZXRVc2VyRGVmYXVsdFBhZ2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMudXNlclNlcnZpY2UudXNlclByb2ZpbGUudXNlckluZm8uZGVmYXVsdFBhZ2U7XG5cdH1cblxuXHRzaG93RGFzaGJvYXJkKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiB0aGlzLnVzZXJTZXJ2aWNlLnNob3dEYXNoYm9hcmQobmFtZSk7XG5cdH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9EYXRhUHJvdmlkZXJTZXJ2aWNlLnRzXCIgLz5cblxuY2xhc3MgTWlzU2VydmljZSB7XG5cblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJyRxJ107XG5cdHByaXZhdGUgc2VydmVyUmVxdWVzdDogbnVtYmVyO1xuXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlKSB7IH1cblxuXHRnZXRNZXRyaWNTbmFwc2hvdCAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL21ldHJpY3NuYXBzaG90Jztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdH0sXG5cdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0Z2V0VGFyZ2V0VnNBY3R1YWwgKHJlcWRhdGEpe1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy90YXJnZXR2c2FjdHVhbCc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldFJldmVudWVBbmFseXNpcyAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3JldmVudWVhbmFseXNpcyc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldFJvdXRlUmV2ZW51ZSAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3JvdXRlcmV2ZW51ZSc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldFNlY3RvckNhcnJpZXJBbmFseXNpcyAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3NlY3RvcmNhcnJpZXJhbmFseXNpcyc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldFBheEZsb3duTWlzSGVhZGVyIChyZXFkYXRhKTogYW55IHtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvcGF4Zmxvd25taXNoZWFkZXInO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0fSxcblx0XHQoZXJyb3IpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRnZXRSb3V0ZVJldmVudWVEcmlsbERvd24gKHJlcWRhdGEpe1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9yb3V0ZXJldmVudWVkcmlsbCc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldEJhckRyaWxsRG93biAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL21zcGF4bmV0cmV2ZHJpbGwnO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0fSxcblx0XHQoZXJyb3IpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRnZXREcmlsbERvd24gKHJlcWRhdGEsIFVSTCl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9IFVSTDtcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHRpZighdGhpcy5zZXJ2ZXJSZXF1ZXN0KXtcblx0XHRcdHRoaXMuc2VydmVyUmVxdWVzdCA9IDE7XG5cdFx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdFx0XHR0aGlzLnNlcnZlclJlcXVlc3QgPSAwO1xuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cblxuY2xhc3MgQ2hhcnRvcHRpb25TZXJ2aWNlIHtcblxuICAgIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHJvb3RTY29wZSddO1xuXG4gICAgY29uc3RydWN0b3IoJHJvb3RTY29wZTogbmcuSVNjb3BlKSB7IH1cblxuICAgIGxpbmVDaGFydE9wdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjaGFydDoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdsaW5lQ2hhcnQnLFxuICAgICAgICAgICAgICAgIGhlaWdodDogMjUwLFxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcbiAgICAgICAgICAgICAgICAgICAgdG9wOiA1LFxuICAgICAgICAgICAgICAgICAgICByaWdodDogNTAsXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogNTAsXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDUwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXsgcmV0dXJuIGQueHZhbDsgfSxcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXsgcmV0dXJuIGQueXZhbDsgfSxcbiAgICAgICAgICAgICAgICB1c2VJbnRlcmFjdGl2ZUd1aWRlbGluZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkaXNwYXRjaDoge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZUNoYW5nZTogZnVuY3Rpb24oZSl7IGNvbnNvbGUubG9nKFwic3RhdGVDaGFuZ2VcIik7IH0sXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZVN0YXRlOiBmdW5jdGlvbihlKXsgY29uc29sZS5sb2coXCJjaGFuZ2VTdGF0ZVwiKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgdG9vbHRpcFNob3c6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcInRvb2x0aXBTaG93XCIpOyB9LFxuICAgICAgICAgICAgICAgICAgICB0b29sdGlwSGlkZTogZnVuY3Rpb24oZSl7IGNvbnNvbGUubG9nKFwidG9vbHRpcEhpZGVcIik7IH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgICAgICAgICAgIHRpY2tGb3JtYXQ6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy50aW1lLmZvcm1hdCgnJWInKShuZXcgRGF0ZShkKSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgeUF4aXM6IHtcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgdGlja0Zvcm1hdDogZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuZm9ybWF0KCcuMDJmJykoZCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGF4aXNMYWJlbERpc3RhbmNlOiAtMTBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07ICBcbiAgICB9XG5cbiAgICBtdWx0aUJhckNoYXJ0T3B0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNoYXJ0OiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ211bHRpQmFyQ2hhcnQnLFxuICAgICAgICAgICAgICAgIGhlaWdodDogMjUwLFxuICAgICAgICAgICAgICAgIHdpZHRoOiAzMDAsXG4gICAgICAgICAgICAgICAgbWFyZ2luIDoge1xuICAgICAgICAgICAgICAgICAgICB0b3A6IDEwLFxuICAgICAgICAgICAgICAgICAgICByaWdodDogMjUsXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogMzAsXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDI1XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaG93TGVnZW5kIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgeDogZnVuY3Rpb24oZCl7cmV0dXJuIGQubGFiZWw7fSxcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXtyZXR1cm4gZC52YWx1ZSArICgxZS0xMCk7fSxcbiAgICAgICAgICAgICAgICBzaG93VmFsdWVzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJlZHVjZVhUaWNrczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd0NvbnRyb2xzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB2YWx1ZUZvcm1hdDogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuZm9ybWF0KCcsLjRmJykoZCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB4QXhpczoge1xuICAgICAgICAgICAgICAgICAgICBheGlzTGFiZWxEaXN0YW5jZTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNob3dZQXhpczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd1hBeGlzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA3MDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTsgIFxuICAgIH1cblxuICAgIG1ldHJpY0JhckNoYXJ0T3B0aW9ucyhtaXNDdHJsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjaGFydDoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdkaXNjcmV0ZUJhckNoYXJ0JyxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDIwMCxcbiAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XG4gICAgICAgICAgICAgICAgICAgIHRvcDogMjAsXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiAyNSxcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiAwLFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiAyNVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgeDogZnVuY3Rpb24oZCl7cmV0dXJuIGQubGFiZWw7fSxcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXtyZXR1cm4gZC52YWx1ZX0sXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1ZhbHVlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZUZvcm1hdDogZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJywuMmYnKShkKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHRvb2x0aXA6IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93WEF4aXM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA3MDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTsgIFxuICAgIH1cblxuICAgIHRhcmdldEJhckNoYXJ0T3B0aW9ucyhtaXNDdHJsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjaGFydDoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdkaXNjcmV0ZUJhckNoYXJ0JyxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcbiAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XG4gICAgICAgICAgICAgICAgICAgIHRvcDogMjAsXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiA1MCxcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiAyMCxcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogNzVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHVzZUludGVyYWN0aXZlR3VpZGVsaW5lOiB0cnVlLFxuICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpe3JldHVybiBkLmxhYmVsO30sXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWUgKyAoMWUtMTApO30sXG4gICAgICAgICAgICAgICAgc2hvd1ZhbHVlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93WUF4aXM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHZhbHVlRm9ybWF0OiBmdW5jdGlvbihkKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLC4yZicpKGQpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDcwMFxuICAgICAgICAgICAgfVxuICAgICAgICB9OyAgXG4gICAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cblxuY2xhc3MgRmlsdGVyZWRMaXN0U2VydmljZSB7XG5cbiAgICBwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbXTtcblxuICAgIGNvbnN0cnVjdG9yKCkgeyB9XG5cbiAgICBzZWFyY2hlZCAodmFsTGlzdHMsIHRvU2VhcmNoLCBsZXZlbCwgZHJpbGx0eXBlKSB7XG4gICAgICByZXR1cm4gXy5maWx0ZXIodmFsTGlzdHMsIFxuICAgICAgICBmdW5jdGlvbiAoaSkge1xuICAgICAgICAgIC8qIFNlYXJjaCBUZXh0IGluIGFsbCAzIGZpZWxkcyAqL1xuICAgICAgICAgIHJldHVybiBzZWFyY2hVdGlsKGksIHRvU2VhcmNoLCBsZXZlbCwgZHJpbGx0eXBlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcGFnZWQgKHZhbExpc3RzLHBhZ2VTaXplKSB7XG4gICAgICB2YXIgcmV0VmFsID0gW107XG4gICAgICBpZih2YWxMaXN0cyl7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsTGlzdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoaSAlIHBhZ2VTaXplID09PSAwKSB7XG4gICAgICAgICAgICByZXRWYWxbTWF0aC5mbG9vcihpIC8gcGFnZVNpemUpXSA9IFt2YWxMaXN0c1tpXV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldFZhbFtNYXRoLmZsb29yKGkgLyBwYWdlU2l6ZSldLnB1c2godmFsTGlzdHNbaV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJldFZhbDtcbiAgICB9XG5cbiAgIFxufVxuZnVuY3Rpb24gc2VhcmNoVXRpbChpdGVtLCB0b1NlYXJjaCwgbGV2ZWwsIGRyaWxsdHlwZSkge1xuICAgIC8qIFNlYXJjaCBUZXh0IGluIGFsbCAzIGZpZWxkcyAqL1xuICBpZihkcmlsbHR5cGUgPT0gJ3JvdXRlJykge1xuICAgIGlmKGl0ZW0uY291bnRyeUZyb20gJiYgaXRlbS5jb3VudHJ5VG8gJiYgbGV2ZWwgPT0gMCkge1xuICAgICAgcmV0dXJuIChpdGVtLmNvdW50cnlGcm9tLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xIHx8IGl0ZW0uY291bnRyeVRvLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMSkge1xuICAgICAgcmV0dXJuIChpdGVtLmZsb3duU2VjdG9yLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMikge1xuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmKGl0ZW1bJ2RvY3VtZW50IyddICYmIGxldmVsID09IDMpIHtcbiAgICAgIHJldHVybiAoaXRlbVsnZG9jdW1lbnQjJ10udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYoZHJpbGx0eXBlID09ICd0YXJnZXQnKSB7XG4gICAgaWYoaXRlbS5yb3V0ZXR5cGUgJiYgbGV2ZWwgPT0gMCkge1xuICAgICAgcmV0dXJuIChpdGVtLnJvdXRldHlwZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1lbHNlIGlmKGl0ZW0ucm91dGVjb2RlICYmIGxldmVsID09IDEpIHtcbiAgICAgIHJldHVybiAoaXRlbS5yb3V0ZWNvZGUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmKGRyaWxsdHlwZSA9PSAnYmFyJykge1xuICAgIGlmKGl0ZW0ucm91dGVDb2RlICYmIGxldmVsID09IDApIHtcbiAgICAgIHJldHVybiAoaXRlbS5yb3V0ZUNvZGUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9ZWxzZSBpZihpdGVtLmZsb3duU2VjdG9yICYmIGxldmVsID09IDEpIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbG93blNlY3Rvci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1lbHNlIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDIpIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmKGRyaWxsdHlwZSA9PSAnZmxpZ2h0LXByb2Nlc3MnKSB7XG4gICAgaWYoaXRlbS5jb3VudHJ5RnJvbSAmJiBpdGVtLmNvdW50cnlUbyAmJiBsZXZlbCA9PSAwKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uY291bnRyeUZyb20udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgfHwgaXRlbS5jb3VudHJ5VG8udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9ZWxzZSBpZihpdGVtLmZsb3duU2VjdG9yICYmIGxldmVsID09IDEpIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbG93blNlY3Rvci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1lbHNlIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDIpIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9ZWxzZSBpZihpdGVtWydjYXJyaWVyQ29kZSMnXSAmJiBsZXZlbCA9PSAzKSB7XG4gICAgICByZXR1cm4gKGl0ZW1bJ2NhcnJpZXJDb2RlIyddLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZihkcmlsbHR5cGUgPT0gJ2ZsaWdodC1jb3VudCcpIHtcbiAgICBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAwKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfWVsc2UgaWYoaXRlbVsnY2FycmllckNvZGUnXSAmJiBsZXZlbCA9PSAxKSB7XG4gICAgICByZXR1cm4gKGl0ZW1bJ2NhcnJpZXJDb2RlJ10udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmKGRyaWxsdHlwZSA9PSAnY291cG9uLWNvdW50Jykge1xuICAgIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDApIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9ZWxzZSBpZihpdGVtWydmbG93blNlY3RvciddICYmIGxldmVsID09IDEpIHtcbiAgICAgIHJldHVybiAoaXRlbVsnZmxvd25TZWN0b3InXS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYoZHJpbGx0eXBlID09ICdhbmFseXNpcycgfHwgZHJpbGx0eXBlID09ICdwYXNzZW5nZXItY291bnQnKSB7XG4gICAgaWYoaXRlbS5yZWdpb25OYW1lICYmIGxldmVsID09IDApIHtcbiAgICAgIHJldHVybiAoaXRlbS5yZWdpb25OYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5jb3VudHJ5RnJvbSAmJiBpdGVtLmNvdW50cnlUbyAmJiBsZXZlbCA9PSAxKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uY291bnRyeUZyb20udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgfHwgaXRlbS5jb3VudHJ5VG8udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5mbG93blNlY3RvciAmJiBsZXZlbCA9PSAyKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAzKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XG5cbmNsYXNzIE9wZXJhdGlvbmFsU2VydmljZSB7XG5cblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJyRxJ107XG5cdHByaXZhdGUgc2VydmVyUmVxdWVzdDogbnVtYmVyO1xuXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlKSB7IH1cblxuXHRnZXRQYXhGbG93bk9wckhlYWRlcihyZXFkYXRhKTogYW55IHtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5vcHIvcGF4Zmxvd25vcHJoZWFkZXInO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0XHR9LFxuXHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG5cdFx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldE9wckZsaWdodFByb2NTdGF0dXMocmVxZGF0YSkge1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm9wci9mbGlnaHRwcm9jZXNzaW5nc3RhdHVzJztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdFx0fSk7XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRnZXRPcHJGbGlnaHRDb3VudEJ5UmVhc29uKHJlcWRhdGEpIHtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5vcHIvZmxpZ2h0Y291bnRieXJlYXNvbic7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcblx0XHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHRcdH0sXG5cdFx0XHQoZXJyb3IpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHRcdH0pO1xuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldE9wckNvdXBvbkNvdW50QnlFeGNlcHRpb24ocmVxZGF0YSkge1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm9wci9jb3Vwb25jb3VudGJ5ZXhjZXB0aW9uJztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdFx0fSk7XG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cdFxuXHRnZXREcmlsbERvd24gKHJlcWRhdGEsIFVSTCl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9IFVSTDtcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHRpZighdGhpcy5zZXJ2ZXJSZXF1ZXN0KXtcblx0XHRcdHRoaXMuc2VydmVyUmVxdWVzdCA9IDE7XG5cdFx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdFx0XHR0aGlzLnNlcnZlclJlcXVlc3QgPSAwO1xuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9EYXRhUHJvdmlkZXJTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9jb21tb24vc2VydmljZXMvTG9jYWxTdG9yYWdlU2VydmljZS50c1wiIC8+XG5cbmNsYXNzIFVzZXJTZXJ2aWNlIHtcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJyRxJywgJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCAnJHdpbmRvdyddO1xuXHRwdWJsaWMgdXNlclByb2ZpbGU6IGFueTtcblx0cHVibGljIF91c2VyOiBib29sZWFuID0gZmFsc2U7XG5cdHByaXZhdGUgbWVudUFjY2VzcyA9IFtdO1xuXHRwcml2YXRlIGRlZmF1bHRQYWdlOiBzdHJpbmc7XG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLCBwcml2YXRlIGxvY2FsU3RvcmFnZVNlcnZpY2U6IExvY2FsU3RvcmFnZVNlcnZpY2UsIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcblxuXHR9XG5cblx0c2V0VXNlcih1c2VyKSB7XG5cdFx0aWYgKHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UpIHtcblx0XHRcdHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicsIEpTT04uc3RyaW5naWZ5KHVzZXIpKTtcblx0XHR9XG5cdH1cblxuXHRsb2dvdXQoKSB7XG5cdFx0dGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldE9iamVjdCgncmFwaWRNb2JpbGUudXNlcicsIG51bGwpO1xuXHRcdHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5zZXRPYmplY3QoJ3VzZXJQZXJtaXNzaW9uTWVudScsIFtdKTtcblx0XHR0aGlzLl91c2VyID0gZmFsc2U7XG5cdH1cblxuXHRpc0xvZ2dlZEluKCkge1xuXHRcdHJldHVybiB0aGlzLl91c2VyID8gdHJ1ZSA6IGZhbHNlO1xuXHR9XG5cblx0aXNVc2VyTG9nZ2VkSW4oKTogYm9vbGVhbiB7XG5cdFx0aWYgKHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5nZXRPYmplY3QoJ3JhcGlkTW9iaWxlLnVzZXInLCAnJykgIT0gbnVsbCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRnZXRVc2VyKCkge1xuXHRcdHJldHVybiB0aGlzLl91c2VyO1xuXHR9XG5cblx0bG9naW4oX3VzZXJOYW1lOiBzdHJpbmcsIF9wYXNzd29yZDogc3RyaW5nKSB7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvdXNlci9sb2dpbic7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dmFyIHJlcXVlc3RPYmogPSB7XG5cdFx0XHR1c2VySWQ6IF91c2VyTmFtZSxcblx0XHRcdHBhc3N3b3JkOiBfcGFzc3dvcmRcblx0XHR9XG5cdFx0dGhpcy5zZXRVc2VyKHsgdXNlcm5hbWU6IFwiXCIgfSk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcXVlc3RPYmopLnRoZW4oXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdFx0aWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdHRoaXMuX3VzZXIgPSB0cnVlO1xuXHRcdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGRlZi5yZWplY3QocmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQoZXJyb3IpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQgb24gbG9nIGluJyk7XG5cdFx0XHRcdGRlZi5yZWplY3QoZXJyb3IpO1xuXHRcdFx0fSk7XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRnZXRVc2VyUHJvZmlsZShyZXFkYXRhKSB7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvdXNlci91c2VycHJvZmlsZSc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdFx0aWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdHRoaXMudXNlclByb2ZpbGUgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmRhdGE7XG5cdFx0XHRcdFx0dGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldE9iamVjdCgndXNlclBlcm1pc3Npb25NZW51JywgdGhpcy51c2VyUHJvZmlsZS5tZW51QWNjZXNzKTtcblx0XHRcdFx0XHR0aGlzLmdldERlZmF1bHRQYWdlKCk7XG5cdFx0XHRcdFx0ZGVmLnJlc29sdmUocmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZGVmLnJlamVjdChyZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCBvbiBVc2VyUHJvZmlsZScpO1xuXHRcdFx0XHRkZWYucmVqZWN0KGVycm9yKTtcblx0XHRcdH0pO1xuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdHNob3dEYXNoYm9hcmQobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG5cdFx0aWYgKHRoaXMuaXNVc2VyTG9nZ2VkSW4oKSkge1xuXHRcdFx0aWYgKHR5cGVvZiB0aGlzLnVzZXJQcm9maWxlID09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdHZhciBkYXRhID0gdGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldE9iamVjdCgndXNlclBlcm1pc3Npb25NZW51JywgJycpO1xuXHRcdFx0XHR0aGlzLm1lbnVBY2Nlc3MgPSBkYXRhO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5tZW51QWNjZXNzID0gdGhpcy51c2VyUHJvZmlsZS5tZW51QWNjZXNzO1xuXHRcdFx0fVxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm1lbnVBY2Nlc3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKHRoaXMubWVudUFjY2Vzc1tpXS5tZW51TmFtZSA9PSBuYW1lKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMubWVudUFjY2Vzc1tpXS5tZW51QWNjZXNzO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLmlzVXNlckxvZ2dlZEluKCk7XG5cdFx0fVxuXHR9XG5cblx0Z2V0RGVmYXVsdFBhZ2UoKSB7XG5cdFx0c3dpdGNoKHRoaXMudXNlclByb2ZpbGUudXNlckluZm8uZGVmYXVsdFBhZ2Upe1xuXHRcdFx0Y2FzZSAnTUlTIC0gUGFzc2VuZ2VyIEZsb3duJzpcblx0XHRcdFx0dGhpcy5kZWZhdWx0UGFnZSA9ICdhcHAubWlzLWZsb3duJztcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdPcGVyYXRpb25hbCAtIFBhc3NlbmdlciBGbG93bic6XG5cdFx0XHRcdHRoaXMuZGVmYXVsdFBhZ2UgPSAnYXBwLm9wZXJhdGlvbmFsLWZsb3duJztcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHR0aGlzLmRlZmF1bHRQYWdlID0gJ2FwcC5taXMtZmxvd24nO1xuXHRcdH1cblx0fVxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvTWlzU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL3VzZXIvc2VydmljZXMvVXNlclNlcnZpY2UudHNcIiAvPlxuXG5cblxuaW50ZXJmYWNlIHRhYk9iamVjdCB7XG4gICAgdGl0bGU6IHN0cmluZyxcbiAgICBuYW1lczogc3RyaW5nLFxuICAgIGljb246IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgdG9nZ2xlT2JqZWN0IHtcbiAgICBtb250aE9yWWVhcjogc3RyaW5nLFxuICAgIHRhcmdldFJldk9yUGF4OiBzdHJpbmcsXG4gICAgc2VjdG9yT3JkZXI6IHN0cmluZyxcbiAgICBzZWN0b3JSZXZPclBheDogc3RyaW5nLFxuICAgIGNoYXJ0T3JUYWJsZTogc3RyaW5nLFxuICAgIHRhcmdldFZpZXc6IHN0cmluZyxcbiAgICByZXZlbnVlVmlldzogc3RyaW5nLFxuICAgIHNlY3RvclZpZXc6IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgaGVhZGVyT2JqZWN0IHtcbiAgICBmbG93bk1vbnRoOiBzdHJpbmcsXG4gICAgc3VyY2hhcmdlOiBib29sZWFuLFxuICAgIHRhYkluZGV4OiBudW1iZXIsXG4gICAgaGVhZGVySW5kZXg6IG51bWJlcixcbiAgICB1c2VybmFtZTogc3RyaW5nXG59XG5cbmNsYXNzIE1pc0NvbnRyb2xsZXJ7XG5cbiAgICBwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzdGF0ZScsICckc2NvcGUnLCAnJGlvbmljTG9hZGluZycsICckdGltZW91dCcsICckd2luZG93JywgJyRpb25pY1BvcG92ZXInLFxuICAgICAgICAnJGZpbHRlcicsICdNaXNTZXJ2aWNlJywgJ0NoYXJ0b3B0aW9uU2VydmljZScsICdGaWx0ZXJlZExpc3RTZXJ2aWNlJywgJ1VzZXJTZXJ2aWNlJywgJyRpb25pY0hpc3RvcnknLCAnUmVwb3J0U3ZjJywgJ0dSQVBIX0NPTE9SUycsICdUQUJTJywgJyRpb25pY1BvcHVwJ107XG5cbiAgICBwcml2YXRlIHRhYnM6IFt0YWJPYmplY3RdO1xuICAgIHByaXZhdGUgdG9nZ2xlOiB0b2dnbGVPYmplY3Q7XG4gICAgcHJpdmF0ZSBoZWFkZXI6IGhlYWRlck9iamVjdDtcbiAgICBwcml2YXRlIHN1YkhlYWRlcjogYW55O1xuICAgIHByaXZhdGUgb3B0aW9uczogYW55O1xuICAgIHByaXZhdGUgZHJpbGx0YWJzOiBzdHJpbmdbXTtcbiAgICBcbiAgICBwcml2YXRlIHBhZ2VTaXplID0gNDtcbiAgICBwcml2YXRlIGN1cnJlbnRQYWdlID0gW107XG4gICAgcHJpdmF0ZSBzZWxlY3RlZERyaWxsID0gW107XG4gICAgcHJpdmF0ZSBncm91cHMgPSBbXTtcblxuICAgIHByaXZhdGUgaW5mb3BvcG92ZXI6IElvbmljLklQb3BvdmVyO1xuICAgIHByaXZhdGUgZHJpbGxwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcbiAgICBwcml2YXRlIGdyYXBocG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XG4gICAgcHJpdmF0ZSBkcmlsbEJhcnBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xuXG4gICAgcHJpdmF0ZSBpbmZvZGF0YTogc3RyaW5nO1xuICAgIHByaXZhdGUgcmVnaW9uTmFtZTogc3RyaW5nO1xuICAgIHByaXZhdGUgY2hhcnRUeXBlOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBncmFwaEluZGV4OiBudW1iZXI7XG4gICAgcHJpdmF0ZSBjb2x1bW5Ub09yZGVyOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBzaG93bkdyb3VwOiBudW1iZXI7XG5cbiAgICBwcml2YXRlIG1ldHJpY1Jlc3VsdDogYW55O1xuICAgIHByaXZhdGUgbWV0cmljTGVnZW5kczogYW55O1xuICAgIHByaXZhdGUgZmF2TWV0cmljUmVzdWx0OiBhbnk7XG5cbiAgICBwcml2YXRlIHRhcmdldEFjdHVhbERhdGE6IGFueTtcbiAgICBwcml2YXRlIGZhdlRhcmdldEJhclJlc3VsdDogYW55O1xuICAgIHByaXZhdGUgZmF2VGFyZ2V0TGluZVJlc3VsdDogYW55O1xuXG4gICAgcHJpdmF0ZSByb3V0ZVJldkRhdGE6IGFueTtcblxuICAgIHByaXZhdGUgcmV2ZW51ZURhdGE6IGFueTtcbiAgICBwcml2YXRlIFNlY3RvckNhcnJpZXJBbmFseXNpc0NoYXJ0czogYW55O1xuICAgIHByaXZhdGUgcG9wb3ZlcnNob3duOiBib29sZWFuO1xuICAgIHByaXZhdGUgZHJpbGxUeXBlOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBkcmlsbEJhckxhYmVsOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBkcmlsbE5hbWU6IHN0cmluZztcbiAgICBwcml2YXRlIGZpcnN0Q29sdW1uczogc3RyaW5nW107XG4gICAgXG4gICAgcHJpdmF0ZSB0aGF0OiBhbnk7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlICRzdGF0ZTogYW5ndWxhci51aS5JU3RhdGVTZXJ2aWNlLCBwcml2YXRlICRzY29wZTogbmcuSVNjb3BlLFxuICAgICAgICBwcml2YXRlICRpb25pY0xvYWRpbmc6IElvbmljLklMb2FkaW5nLCBwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsXG4gICAgICAgIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsIHByaXZhdGUgJGlvbmljUG9wb3ZlcjogSW9uaWMuSVBvcG92ZXIsXG4gICAgICAgIHByaXZhdGUgJGZpbHRlcjogbmcuSUZpbHRlclNlcnZpY2UsIHByaXZhdGUgbWlzU2VydmljZTogTWlzU2VydmljZSxcbiAgICAgICAgcHJpdmF0ZSBjaGFydG9wdGlvblNlcnZpY2U6IENoYXJ0b3B0aW9uU2VydmljZSwgcHJpdmF0ZSBmaWx0ZXJlZExpc3RTZXJ2aWNlOiBGaWx0ZXJlZExpc3RTZXJ2aWNlLFxuICAgICAgICBwcml2YXRlIHVzZXJTZXJ2aWNlOiBVc2VyU2VydmljZSwgcHJpdmF0ZSAkaW9uaWNIaXN0b3J5OiBhbnksIHByaXZhdGUgcmVwb3J0U3ZjOiBSZXBvcnRTdmMsIHByaXZhdGUgR1JBUEhfQ09MT1JTOiBzdHJpbmcsIHByaXZhdGUgVEFCUzogc3RyaW5nLCBwcml2YXRlICRpb25pY1BvcHVwOiBJb25pYy5JUG9wdXApIHtcblxuICAgICAgICAgICAgdGhpcy50aGF0ID0gdGhpcztcblxuICAgICAgICAgICAgdGhpcy50YWJzID0gdGhpcy5UQUJTLkRCMV9UQUJTO1xuXG4gICAgICAgICAgICB0aGlzLnRvZ2dsZSA9IHtcbiAgICAgICAgICAgICAgICBtb250aE9yWWVhciA6ICdtb250aCcsXG4gICAgICAgICAgICAgICAgdGFyZ2V0UmV2T3JQYXg6ICdyZXZlbnVlJyxcbiAgICAgICAgICAgICAgICBzZWN0b3JPcmRlcjogJ3RvcDUnLFxuICAgICAgICAgICAgICAgIHNlY3RvclJldk9yUGF4OiAncmV2ZW51ZScsXG4gICAgICAgICAgICAgICAgY2hhcnRPclRhYmxlOiAnY2hhcnQnLFxuICAgICAgICAgICAgICAgIHRhcmdldFZpZXc6ICdjaGFydCcsXG4gICAgICAgICAgICAgICAgcmV2ZW51ZVZpZXc6ICdjaGFydCcsXG4gICAgICAgICAgICAgICAgc2VjdG9yVmlldzogJ2NoYXJ0J1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5oZWFkZXIgPSB7XG4gICAgICAgICAgICAgICAgZmxvd25Nb250aDogJycsXG4gICAgICAgICAgICAgICAgc3VyY2hhcmdlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB0YWJJbmRleDogMCxcbiAgICAgICAgICAgICAgICBoZWFkZXJJbmRleDogMCxcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogJydcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQod2luZG93KS5iaW5kKCdvcmllbnRhdGlvbmNoYW5nZScsIGZ1bmN0aW9uIChlLCBzY29wZSkge1xuICAgICAgICAgICAgICAgIHRoaXMub25TbGlkZU1vdmUoe2luZGV4OiB0aGlzLmhlYWRlci50YWJJbmRleH0pO1xuICAgICAgICAgICAgfSk7ICovXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQod2luZG93KS5iaW5kKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMub3JpZW50YXRpb25DaGFuZ2UpOyBcbiAgICAgICAgXG4gICAgICAgICAgICAvL3RoaXMuJHNjb3BlLiR3YXRjaCgnTWlzQ3RybC5oZWFkZXIuc3VyY2hhcmdlJywgKCkgPT4geyB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDp0aGlzLmhlYWRlci50YWJJbmRleH0pOyB9LCB0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuaW5pdERhdGEoKTtcblxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCdvblNsaWRlTW92ZScsIChldmVudDogYW55LCByZXNwb25zZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuTWlzQ3RybC5vblNsaWRlTW92ZShyZXNwb25zZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRvbignJGlvbmljVmlldy5lbnRlcicsICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXNlbGYudXNlclNlcnZpY2Uuc2hvd0Rhc2hib2FyZCgnTUlTJykpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kc3RhdGUuZ28oXCJsb2dpblwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCdvcGVuRHJpbGxQb3B1cCcsIChldmVudDogYW55LCByZXNwb25zZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ21ldHJpYycpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuTWlzQ3RybC5vcGVuQmFyRHJpbGxEb3duUG9wb3ZlcihyZXNwb25zZS5ldmVudCwgeyBcInBvaW50XCI6IHJlc3BvbnNlLmRhdGEgfSwgLTEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAndGFyZ2V0Jykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9wZW5UYXJnZXREcmlsbERvd25Qb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS50eXBlID09ICdwYXNzZW5nZXItY291bnQnKSB7XG4gICAgICAgICAgICAgICAgICAgLy8gdGhpcy4kc2NvcGUuTWlzQ3RybC5vcGVuUmV2ZW51ZVBhc3NlbmdlckRyaWxsRG93blBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpbml0RGF0YSgpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9pbmZvdG9vbHRpcC5odG1sJywge1xuICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oaW5mb3BvcG92ZXIpIHtcbiAgICAgICAgICAgIHRoYXQuaW5mb3BvcG92ZXIgPSBpbmZvcG9wb3ZlcjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvZHJpbGRvd24uaHRtbCcsIHtcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGRyaWxscG9wb3Zlcikge1xuICAgICAgICAgICAgdGhhdC5kcmlsbHBvcG92ZXIgPSBkcmlsbHBvcG92ZXI7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvYmFyZHJpbGRvd24uaHRtbCcsIHtcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGRyaWxsQmFycG9wb3Zlcikge1xuICAgICAgICAgICAgdGhhdC5kcmlsbEJhcnBvcG92ZXIgPSBkcmlsbEJhcnBvcG92ZXI7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHtcbiAgICAgICAgICAgIG1ldHJpYzogdGhpcy5jaGFydG9wdGlvblNlcnZpY2UubWV0cmljQmFyQ2hhcnRPcHRpb25zKHRoaXMpLFxuICAgICAgICAgICAgdGFyZ2V0TGluZUNoYXJ0OiB0aGlzLmNoYXJ0b3B0aW9uU2VydmljZS5saW5lQ2hhcnRPcHRpb25zKCksXG4gICAgICAgICAgICB0YXJnZXRCYXJDaGFydDogdGhpcy5jaGFydG9wdGlvblNlcnZpY2UudGFyZ2V0QmFyQ2hhcnRPcHRpb25zKHRoaXMpLFxuICAgICAgICAgICAgcGFzc2VuZ2VyQ2hhcnQ6IHRoaXMuY2hhcnRvcHRpb25TZXJ2aWNlLm11bHRpQmFyQ2hhcnRPcHRpb25zKClcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcmVxID0ge1xuICAgICAgICAgICAgdXNlcklkOiB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYocmVxLnVzZXJJZCAhPSBcIm51bGxcIikge1xuICAgICAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFBheEZsb3duTWlzSGVhZGVyKHJlcSkudGhlbihcbiAgICAgICAgICAgICAgICAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnN1YkhlYWRlciA9IGRhdGEucmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5oZWFkZXIuZmxvd25Nb250aCA9IHRoYXQuc3ViSGVhZGVyLnBheEZsb3duTWlzTW9udGhzWzBdLmZsb3dNb250aDtcblxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm9uU2xpZGVNb3ZlKHsgaW5kZXg6IDAgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXHRcblx0XHR0aGF0LmhlYWRlci51c2VybmFtZSA9IHRoYXQuZ2V0UHJvZmlsZVVzZXJOYW1lKCk7XG4gICAgfVxuXG4gICAgZ2V0UHJvZmlsZVVzZXJOYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIGlmICh0aGlzLnVzZXJTZXJ2aWNlLmlzVXNlckxvZ2dlZEluKCkpIHtcbiAgICAgICAgICAgIHZhciBvYmogPSB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInKTtcbiAgICAgICAgICAgIGlmIChvYmogIT0gJ251bGwnKSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb2ZpbGVVc2VyTmFtZSA9IEpTT04ucGFyc2Uob2JqKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZmlsZVVzZXJOYW1lLnVzZXJuYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2VsZWN0ZWRGbG93bk1vbnRoKG1vbnRoOiBzdHJpbmcpe1xuICAgICAgICByZXR1cm4gKG1vbnRoID09IHRoaXMuaGVhZGVyLmZsb3duTW9udGgpO1xuICAgIH1cbiAgICBvcmllbnRhdGlvbkNoYW5nZSA9ICgpOiBib29sZWFuID0+IHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGF0LiR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGF0Lm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoYXQuaGVhZGVyLnRhYkluZGV4IH0pO1xuICAgICAgICB9LDIwMClcbiAgICB9IFxuICAgIG9wZW5pbmZvUG9wb3ZlciAoJGV2ZW50LCBpbmRleCkge1xuICAgICAgICBpZiAodHlwZW9mIGluZGV4ID09IFwidW5kZWZpbmVkXCIgfHwgaW5kZXggPT0gXCJcIikge1xuICAgICAgICAgICAgdGhpcy5pbmZvZGF0YSA9ICdObyBpbmZvIGF2YWlsYWJsZSc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHRoaXMuaW5mb2RhdGE9aW5kZXg7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coaW5kZXgpO1xuICAgICAgICB0aGlzLmluZm9wb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICB9O1xuXG4gICAgY2xvc2VQb3BvdmVyKCkge1xuICAgICAgICB0aGlzLmdyYXBocG9wb3Zlci5oaWRlKCk7XG4gICAgfTtcbiAgICBjbG9zZXNCYXJQb3BvdmVyKCl7XG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLmhpZGUoKTtcbiAgICB9XG4gICAgY2xvc2VJbmZvUG9wb3ZlcigpIHtcbiAgICAgICAgdGhpcy5pbmZvcG9wb3Zlci5oaWRlKCk7XG4gICAgfVxuXG4gICAgdXBkYXRlSGVhZGVyKCkge1xuXHRcdHZhciBmbG93bk1vbnRoID0gdGhpcy5oZWFkZXIuZmxvd25Nb250aDtcbiAgICAgICAgdGhpcy5oZWFkZXIuaGVhZGVySW5kZXggPSBfLmZpbmRJbmRleCh0aGlzLnN1YkhlYWRlci5wYXhGbG93bk1pc01vbnRocywgZnVuY3Rpb24oY2hyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiBjaHIuZmxvd01vbnRoID09IGZsb3duTW9udGg7XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmhlYWRlci5oZWFkZXJJbmRleCk7XG5cdFx0dGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6IHRoaXMuaGVhZGVyLmhlYWRlckluZGV4fSk7XG4gICAgfVxuXG4gICAgb25TbGlkZU1vdmUoZGF0YTogYW55KSB7XG4gICAgICAgIHRoaXMuaGVhZGVyLnRhYkluZGV4ID0gZGF0YS5pbmRleDtcbiAgICAgICAgc3dpdGNoKHRoaXMuaGVhZGVyLnRhYkluZGV4KXtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIHRoaXMuZ2V0Rmxvd25GYXZvcml0ZXMoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgdGhpcy5jYWxsTWV0cmljU25hcHNob3QoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgdGhpcy5jYWxsVGFyZ2V0VnNBY3R1YWwoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgdGhpcy5jYWxsUmV2ZW51ZUFuYWx5c2lzKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgIHRoaXMuY2FsbFNlY3RvckNhcnJpZXJBbmFseXNpcygpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICB0aGlzLmNhbGxSb3V0ZVJldmVudWUoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRvZ2dsZU1ldHJpYyAodmFsKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLm1vbnRoT3JZZWFyID0gdmFsO1xuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXh9KTtcbiAgICB9XG4gICAgdG9nZ2xlU3VyY2hhcmdlKCkge1xuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDp0aGlzLmhlYWRlci50YWJJbmRleH0pO1xuICAgIH1cbiAgICB0b2dnbGVUYXJnZXQodmFsKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLnRhcmdldFJldk9yUGF4ID0gdmFsO1xuICAgIH1cblxuICAgIHRvZ2dsZVNlY3Rvcih2YWwpIHtcbiAgICAgICAgdGhpcy50b2dnbGUuc2VjdG9yUmV2T3JQYXggPSB2YWw7XG4gICAgfVxuXG4gICAgY2FsbE1ldHJpY1NuYXBzaG90KCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHZhciByZXFkYXRhID0ge1xuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICB0b2dnbGUxOiB0aGlzLnRvZ2dsZS5tb250aE9yWWVhcixcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0TWV0cmljU25hcHNob3QocmVxZGF0YSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcblx0XHRcdFx0Ly8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXG5cdFx0XHRcdHRoYXQubWV0cmljUmVzdWx0ICA9IF8uc29ydEJ5KGRhdGEucmVzcG9uc2UuZGF0YS5tZXRyaWNTbmFwc2hvdENoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XG5cdFx0XHRcdFx0aWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Xy5mb3JFYWNoKHRoYXQubWV0cmljUmVzdWx0LCBmdW5jdGlvbiAobjogYW55LCB2YWx1ZTogYW55KSB7XG5cdFx0XHRcdFx0bi52YWx1ZXNbMF0uY29sb3IgPSB0aGF0LkdSQVBIX0NPTE9SUy5NRVRSSUNbMF07XG5cdFx0XHRcdFx0bi52YWx1ZXNbMV0uY29sb3IgPSB0aGF0LkdSQVBIX0NPTE9SUy5NRVRSSUNbMV07XG5cdFx0XHRcdFx0aWYobi52YWx1ZXNbMl0pIG4udmFsdWVzWzJdLmNvbG9yID0gdGhhdC5HUkFQSF9DT0xPUlMuTUVUUklDWzJdO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHR0aGF0LmZhdk1ldHJpY1Jlc3VsdCA9IF8uZmlsdGVyKHRoYXQubWV0cmljUmVzdWx0LCBmdW5jdGlvbih1OiBhbnkpIHtcblx0XHRcdFx0XHRpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHR0aGF0Lm1ldHJpY0xlZ2VuZHMgPSBkYXRhLnJlc3BvbnNlLmRhdGEubGVnZW5kcztcblx0XHRcdFx0aWYodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xuXHRcdFx0XHRcdHRoYXQubWV0cmljUmVzdWx0ID0gdGhhdC5mYXZNZXRyaWNSZXN1bHQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHRcdCAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG5cdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQgZm9yIE1ldHJpY1NuYXBzaG90ISEhJ1xuXHRcdFx0XHQgIH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG5cdFx0XHRcdFx0ICBjb25zb2xlLmxvZygnZG9uZScpO1xuXHRcdFx0XHQgIH0pO1xuXHRcdFx0fVxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjYWxsVGFyZ2V0VnNBY3R1YWwoKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdmFyIHJlcWRhdGEgPSB7XG4gICAgICAgICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VybmFtZSxcbiAgICAgICAgICAgIHRvZ2dsZTE6ICcnLFxuICAgICAgICAgICAgZnVsbERhdGFGbGFnOiAnJ1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0VGFyZ2V0VnNBY3R1YWwocmVxZGF0YSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcblx0XHRcdFx0Ly8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXG5cdFx0XHRcdHRoYXQuZmF2VGFyZ2V0TGluZVJlc3VsdCA9IF8uZmlsdGVyKGRhdGEucmVzcG9uc2UuZGF0YS5saW5lQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHsgXG5cdFx0XHRcdFx0aWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0dGhhdC5mYXZUYXJnZXRCYXJSZXN1bHQgPSBfLmZpbHRlcihkYXRhLnJlc3BvbnNlLmRhdGEudmVyQmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHsgXG5cdFx0XHRcdFx0aWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0Xy5mb3JFYWNoKGRhdGEucmVzcG9uc2UuZGF0YS52ZXJCYXJDaGFydHMsIGZ1bmN0aW9uIChuOiBhbnksIHZhbHVlOiBhbnkpIHtcblx0XHRcdFx0XHRuLnZhbHVlc1swXS5jb2xvciA9IHRoYXQuR1JBUEhfQ09MT1JTLnZlckJhckNoYXJ0c1swXTtcblx0XHRcdFx0XHRuLnZhbHVlc1sxXS5jb2xvciA9IHRoYXQuR1JBUEhfQ09MT1JTLnZlckJhckNoYXJ0c1sxXTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0dmFyIGxpbmVDb2xvcnMgPSBbe1wiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuTElORVswXSwgXCJjbGFzc2VkXCI6IFwiZGFzaGVkXCIsXCJzdHJva2VXaWR0aFwiOiAyfSxcblx0XHRcdFx0e1wiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuTElORVsxXX0se1wiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuTElORVsyXSwgXCJhcmVhXCIgOiB0cnVlLCBcImRpc2FibGVkXCI6IHRydWV9XTtcblxuXHRcdFx0XHRfLmZvckVhY2goZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHMsIGZ1bmN0aW9uIChuOiBhbnksIHZhbHVlOiBhbnkpIHtcblx0XHRcdFx0XHRfLm1lcmdlKG4ubGluZUNoYXJ0SXRlbXMsIGxpbmVDb2xvcnMpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRjb25zb2xlLmxvZyhkYXRhLnJlc3BvbnNlLmRhdGEubGluZUNoYXJ0cyk7XG5cblx0XHRcdFx0dGhhdC50YXJnZXRBY3R1YWxEYXRhID0ge1xuXHRcdFx0XHRcdGhvckJhckNoYXJ0OiBkYXRhLnJlc3BvbnNlLmRhdGEudmVyQmFyQ2hhcnRzLFxuXHRcdFx0XHRcdGxpbmVDaGFydDogZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHNcblx0XHRcdFx0fTtcblxuXHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdFx0ICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcblx0XHRcdFx0XHRjb250ZW50OiAnTm8gRGF0YSBGb3VuZCBmb3IgVGFyZ2V0VnNBY3R1YWwhISEnXG5cdFx0XHRcdCAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcblx0XHRcdFx0XHQgIGNvbnNvbGUubG9nKCdkb25lJyk7XG5cdFx0XHRcdCAgfSk7XG5cdFx0XHR9XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY2FsbFJvdXRlUmV2ZW51ZSgpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB2YXIgcm91dGVSZXZSZXF1ZXN0ID0ge1xuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWVcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFJvdXRlUmV2ZW51ZShyb3V0ZVJldlJlcXVlc3QpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdGlmKGRhdGEucmVzcG9uc2Uuc3RhdHVzID09PSBcInN1Y2Nlc3NcIil7XG5cdFx0XHRcdHRoYXQucm91dGVSZXZEYXRhID0gZGF0YS5yZXNwb25zZS5kYXRhO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuXHRcdFx0XHQgIHRoYXQuJGlvbmljUG9wdXAuYWxlcnQoe1xuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxuXHRcdFx0XHRcdGNvbnRlbnQ6ICdObyBEYXRhIEZvdW5kIFJvdXRlUmV2ZW51ZSEhISdcblx0XHRcdFx0ICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuXHRcdFx0XHRcdCAgY29uc29sZS5sb2coJ2RvbmUnKTtcblx0XHRcdFx0ICB9KTtcblx0XHRcdH1cbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICBjYWxsUmV2ZW51ZUFuYWx5c2lzKCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHZhciByZXFkYXRhID0ge1xuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICB0b2dnbGUxOiAnJyxcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJydcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRSZXZlbnVlQW5hbHlzaXMocmVxZGF0YSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcblx0XHRcdFx0Ly8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXG5cdFx0XHRcdHZhciBqc29uT2JqID0gZGF0YS5yZXNwb25zZS5kYXRhO1xuXHRcdFx0XHR2YXIgc29ydGVkRGF0YSA9IF8uc29ydEJ5KGpzb25PYmoubXVsdGliYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcblx0XHRcdFx0XHRpZiAodSkgcmV0dXJuIFt1LmZhdm9yaXRlQ2hhcnRQb3NpdGlvbl07IFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0dmFyIGZhdlJldmVudWVCYXJSZXN1bHQgPSBfLmZpbHRlcihzb3J0ZWREYXRhLCBmdW5jdGlvbih1OiBhbnkpIHsgXG5cdFx0XHRcdFx0aWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0dmFyIHNvcnRlZERhdGEgPSBfLnNvcnRCeShqc29uT2JqLnBpZUNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7IFxuXHRcdFx0XHRcdGlmICh1KSByZXR1cm4gW3UuZmF2b3JpdGVDaGFydFBvc2l0aW9uXTsgXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHR2YXIgZmF2UmV2ZW51ZVBpZVJlc3VsdCA9IF8uZmlsdGVyKHNvcnRlZERhdGEsIGZ1bmN0aW9uKHU6IGFueSkgeyBcblx0XHRcdFx0XHRpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHZhciBiYXJDb2xvcnMgPSBbdGhhdC5HUkFQSF9DT0xPUlMuQkFSWzBdLCB0aGF0LkdSQVBIX0NPTE9SUy5CQVJbMV1dO1xuXHRcdFx0XHRfLm1lcmdlKGpzb25PYmoubXVsdGliYXJDaGFydHNbMV0sIGJhckNvbG9ycyk7XG5cdFx0XHRcdF8uZm9yRWFjaChqc29uT2JqLm11bHRpYmFyQ2hhcnRzLCBmdW5jdGlvbihuOiBhbnksIHZhbHVlOiBhbnkpIHtcblx0XHRcdFx0XHRuLmNvbG9yID0gYmFyQ29sb3JzW3ZhbHVlXTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0dmFyIHBpZUNvbG9ycyA9IFt7XCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5QSUVbMF19LHtcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLlBJRVsxXX0se1wiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuUElFWzJdfV07XG5cdFx0XHRcdF8uZm9yRWFjaChqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCBmdW5jdGlvbiAobjogYW55LCB2YWx1ZTogYW55KSB7XG5cdFx0XHRcdFx0bi5sYWJlbCA9IG4ueHZhbDtcblx0XHRcdFx0XHRuLnZhbHVlID0gbi55dmFsO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRfLm1lcmdlKGpzb25PYmoucGllQ2hhcnRzWzBdLmRhdGEsIHBpZUNvbG9ycyk7XG5cblx0XHRcdFx0dGhhdC5yZXZlbnVlRGF0YSA9IHtcblx0XHRcdFx0XHRyZXZlbnVlUGllQ2hhcnQgOiBqc29uT2JqLnBpZUNoYXJ0c1swXSxcblx0XHRcdFx0XHRyZXZlbnVlQmFyQ2hhcnQgOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzFdLm11bHRpYmFyQ2hhcnRJdGVtcyxcblx0XHRcdFx0XHRyZXZlbnVlSG9yQmFyQ2hhcnQgOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzJdLm11bHRpYmFyQ2hhcnRJdGVtc1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHRcdCAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG5cdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQgRm9yIFJldmVudWVBbmFseXNpcyEhISdcblx0XHRcdFx0ICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuXHRcdFx0XHRcdCAgY29uc29sZS5sb2coJ2RvbmUnKTtcblx0XHRcdFx0ICB9KTtcblx0XHRcdH1cbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBvcGVuRHJpbGxEb3duKHJlZ2lvbkRhdGEsc2VsRmluZExldmVsKSB7XG4gICAgICAgIHNlbEZpbmRMZXZlbCA9IE51bWJlcihzZWxGaW5kTGV2ZWwpO1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWxdID0gcmVnaW9uRGF0YTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbCArIDFdID0gJyc7XG4gICAgICAgIGlmKHNlbEZpbmRMZXZlbCAhPSAnMycpIHtcbiAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xuICAgICAgICAgICAgdGhpcy5yZWdpb25OYW1lID0gKHJlZ2lvbkRhdGEucmVnaW9uTmFtZSkgPyByZWdpb25EYXRhLnJlZ2lvbk5hbWUgOiByZWdpb25EYXRhLmNoYXJ0TmFtZTtcbiAgICAgICAgICAgIHZhciBjb3VudHJ5RnJvbVRvID0gKHJlZ2lvbkRhdGEuY291bnRyeUZyb20gJiYgcmVnaW9uRGF0YS5jb3VudHJ5VG8pID8gcmVnaW9uRGF0YS5jb3VudHJ5RnJvbSArICctJyArIHJlZ2lvbkRhdGEuY291bnRyeVRvIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBzZWN0b3JGcm9tVG8gPSAocmVnaW9uRGF0YS5mbG93blNlY3RvciAmJiBkcmlsbExldmVsID49IDMpID8gcmVnaW9uRGF0YS5mbG93blNlY3RvciA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKHJlZ2lvbkRhdGEuZmxpZ2h0TnVtYmVyICYmIGRyaWxsTGV2ZWwgPT0gNCkgPyByZWdpb25EYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICAgICAgdmFyIHJlcWRhdGEgPSB7XG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcbiAgICAgICAgICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmhlYWRlci51c2VybmFtZSxcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxuICAgICAgICAgICAgICAgIFwicmVnaW9uTmFtZVwiOiAodGhpcy5yZWdpb25OYW1lKT8gdGhpcy5yZWdpb25OYW1lIDogXCJOb3J0aCBBbWVyaWNhXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5RnJvbVRvXCI6IGNvdW50cnlGcm9tVG8sXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JGcm9tVG9cIjogc2VjdG9yRnJvbVRvLFxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcbiAgICAgICAgICAgICAgICBcImZsaWdodERhdGVcIjogMFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFJvdXRlUmV2ZW51ZURyaWxsRG93bihyZXFkYXRhKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gZGF0YS5yZXNwb25zZTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICB2YXIgZmluZExldmVsID0gZHJpbGxMZXZlbCAtIDE7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YS5zdGF0dXMpO1xuICAgICAgICAgICAgICAgIGlmKGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJyl7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSBkYXRhLmRhdGEucm93cztcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5vcmdJdGVtc1swXSA9IGRhdGEuZGF0YS5yb3dzO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuc29ydCgncGF4Q291bnQnLGZpbmRMZXZlbCxmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuY2xlYXJEcmlsbChkcmlsbExldmVsKTtcbiAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZmluZExldmVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICAgICAgICB0aGF0LmNsb3Nlc1BvcG92ZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgYWxlcnQoJ1NlcnZlciBFcnJvcicpO1xuICAgICAgICAgICAgfSk7IFxuICAgICAgICB9IFxuICAgIH1cbiAgICBjbGVhckRyaWxsKGxldmVsOiBudW1iZXIpIHtcbiAgICAgICAgdmFyIGk6IG51bWJlcjtcbiAgICAgICAgZm9yICh2YXIgaSA9IGxldmVsOyBpIDwgdGhpcy5ncm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldLml0ZW1zLnNwbGljZSgwLCAxKTtcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldLm9yZ0l0ZW1zLnNwbGljZSgwLCAxKTtcbiAgICAgICAgICAgIHRoaXMuc29ydCgncGF4Q291bnQnLGksZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW2ldID0gJyc7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZHJpbGxEb3duUmVxdWVzdCAoZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpe1xuICAgICAgICB2YXIgcmVxZGF0YTtcbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICdiYXInKSB7XG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgICAgICAgIGlmIChkYXRhLmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YS5sYWJlbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGRyaWxsQmFyOiBzdHJpbmc7XG4gICAgICAgICAgICBkcmlsbEJhciA9IChkYXRhLmxhYmVsKSA/IGRhdGEubGFiZWwgOiBcIlwiO1xuICAgICAgICAgICAgdmFyIHJvdXRlQ29kZSA9IChkYXRhLnJvdXRlQ29kZSkgPyBkYXRhLnJvdXRlQ29kZSA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgc2VjdG9yID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcblxuICAgICAgICAgICAgaWYgKCFkcmlsbEJhcikge1xuICAgICAgICAgICAgICAgIGRyaWxsQmFyID0gdGhpcy5kcmlsbEJhckxhYmVsO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRyaWxsQmFyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuXG4gICAgICAgICAgICByZXFkYXRhID0ge1xuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJyA6ICdOJyxcbiAgICAgICAgICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmhlYWRlci51c2VybmFtZSxcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxuICAgICAgICAgICAgICAgIFwiZHJpbGxCYXJcIjogZHJpbGxCYXIsXG4gICAgICAgICAgICAgICAgXCJyb3V0ZUNvZGVcIjogcm91dGVDb2RlLFxuICAgICAgICAgICAgICAgIFwic2VjdG9yXCI6IHNlY3RvcixcbiAgICAgICAgICAgICAgICBcImZsaWdodE51bWJlclwiOiBmbGlnaHROdW1iZXJcbiAgICAgICAgICAgIH07ICBcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICd0YXJnZXQnKSB7XG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgICAgICAgIGlmIChkYXRhLmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YS5sYWJlbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHJvdXRldHlwZTogc3RyaW5nO1xuICAgICAgICAgICAgcm91dGV0eXBlID0gKGRhdGEucm91dGV0eXBlKSA/IGRhdGEucm91dGV0eXBlIDogXCJcIjtcblxuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG5cbiAgICAgICAgICAgIHJlcWRhdGEgPSB7XG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxuICAgICAgICAgICAgICAgIFwidXNlcklkXCI6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxuICAgICAgICAgICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXG4gICAgICAgICAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXG4gICAgICAgICAgICAgICAgXCJyb3V0ZXR5cGVcIjogcm91dGV0eXBlXG4gICAgICAgICAgICB9OyAgXG4gICAgICAgIH1cblxuICAgICAgICBpZihkcmlsbFR5cGUgPT0gJ2FuYWx5c2lzJykge1xuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciByZWdpb25OYW1lO1xuICAgICAgICAgICAgdmFyIGNvdW50cnlGcm9tVG87XG4gICAgICAgICAgICB2YXIgb3duT2FsRmxhZztcbiAgICAgICAgICAgIHZhciBzZWN0b3JGcm9tVG87XG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyO1xuXG4gICAgICAgICAgICBpZiAoZHJpbGxMZXZlbCA+IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICByZWdpb25OYW1lID0gKGRhdGEucmVnaW9uTmFtZSkgPyBkYXRhLnJlZ2lvbk5hbWUgOiBcIlwiO1xuICAgICAgICAgICAgICAgIGNvdW50cnlGcm9tVG8gPSAoZGF0YS5jb3VudHJ5RnJvbSAmJiBkYXRhLmNvdW50cnlUbykgPyBkYXRhLmNvdW50cnlGcm9tICsgJy0nICsgZGF0YS5jb3VudHJ5VG8gOiBcIlwiO1xuICAgICAgICAgICAgICAgIG93bk9hbEZsYWcgPSAoZGF0YS5vd25PYWwpID8gZGF0YS5vd25PYWwgOiBcIlwiO1xuICAgICAgICAgICAgICAgIHNlY3RvckZyb21UbyA9IChkYXRhLmZsb3duU2VjdG9yKSA/IGRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xuICAgICAgICAgICAgICAgIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWScgOiAnTicsXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcbiAgICAgICAgICAgICAgICBcInJlZ2lvbk5hbWVcIjogcmVnaW9uTmFtZSxcbiAgICAgICAgICAgICAgICBcImNvdW50cnlGcm9tVG9cIjogY291bnRyeUZyb21UbyxcbiAgICAgICAgICAgICAgICBcIm93bk9hbEZsYWdcIjogb3duT2FsRmxhZyxcbiAgICAgICAgICAgICAgICBcInNlY3RvckZyb21Ub1wiOiBzZWN0b3JGcm9tVG8sXG4gICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiAwXG4gICAgICAgICAgICB9OyAgXG4gICAgICAgIH1cbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICdwYXNzZW5nZXItY291bnQnKSB7XG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICB2YXIgcmVnaW9uTmFtZSA9IChkYXRhLnJlZ2lvbk5hbWUpID8gZGF0YS5yZWdpb25OYW1lIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBjb3VudHJ5RnJvbVRvID0gKGRhdGEuY291bnRyeUZyb20gJiYgZGF0YS5jb3VudHJ5VG8pID8gZGF0YS5jb3VudHJ5RnJvbSArICctJyArIGRhdGEuY291bnRyeVRvIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBvd25PYWxGbGFnID0gKGRhdGEub3duT2FsRmxhZykgPyBkYXRhLm93bk9hbEZsYWcgOiBcIlwiO1xuICAgICAgICAgICAgdmFyIHNlY3RvckZyb21UbyAgPSAoZGF0YS5zZWN0b3JGcm9tVG8pID8gZGF0YS5zZWN0b3JGcm9tVG8gOiBcIlwiO1xuICAgICAgICAgICAgdmFyIGZsaWdodE51bWJlciAgPSAoZGF0YS5mbGlnaHROdW1iZXIpID8gZGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xuXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWScgOiAnTicsXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcbiAgICAgICAgICAgICAgICBcInJlZ2lvbk5hbWVcIjogcmVnaW9uTmFtZSxcbiAgICAgICAgICAgICAgICBcImNvdW50cnlGcm9tVG9cIjogY291bnRyeUZyb21UbyxcbiAgICAgICAgICAgICAgICBcIm93bk9hbEZsYWdcIjogb3duT2FsRmxhZyxcbiAgICAgICAgICAgICAgICBcInNlY3RvckZyb21Ub1wiOiBzZWN0b3JGcm9tVG8sXG4gICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiAwXG4gICAgICAgICAgICB9OyAgXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcWRhdGE7XG4gICAgfVxuICAgIGdldERyaWxsRG93blVSTCAoZHJpbERvd25UeXBlKSB7XG4gICAgICAgIHZhciB1cmxcbiAgICAgICAgc3dpdGNoKGRyaWxEb3duVHlwZSl7XG4gICAgICAgICAgICBjYXNlICdiYXInOlxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy9tc3BheG5ldHJldmRyaWxsXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3RhcmdldCc6XG4gICAgICAgICAgICAgICAgdXJsID0gXCIvcGF4ZmxubWlzL3RndHZzYWN0ZHJpbGxcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYW5hbHlzaXMnOlxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy9uZXRyZXZlbnVlb3dub2FsZHJpbGxcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncGFzc2VuZ2VyLWNvdW50JzpcbiAgICAgICAgICAgICAgICB1cmwgPSBcIi9wYXhmbG5taXMvbmV0cmV2ZW51ZW93bm9hbGRyaWxsXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuICAgIG9wZW5CYXJEcmlsbERvd24oZGF0YSwgc2VsRmluZExldmVsKSB7XG4gICAgICAgIHNlbEZpbmRMZXZlbCA9IE51bWJlcihzZWxGaW5kTGV2ZWwpO1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWxdID0gZGF0YTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbCArIDFdID0gJyc7XG4gICAgICAgIFxuICAgICAgICBpZiAoc2VsRmluZExldmVsICE9ICh0aGlzLmdyb3Vwcy5sZW5ndGggLSAxKSkge1xuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcbiAgICAgICAgICAgIHZhciByZXFkYXRhID0gdGhpcy5kcmlsbERvd25SZXF1ZXN0KHRoaXMuZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpO1xuICAgICAgICAgICAgdmFyIFVSTCA9IHRoaXMuZ2V0RHJpbGxEb3duVVJMKHRoaXMuZHJpbGxUeXBlKTtcbiAgICAgICAgICAgIHRoaXMubWlzU2VydmljZS5nZXREcmlsbERvd24ocmVxZGF0YSwgVVJMKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gZGF0YS5yZXNwb25zZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmaW5kTGV2ZWwgPSBkcmlsbExldmVsIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YS5zdGF0dXMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5zdGF0dXMgPT0gJ3N1Y2Nlc3MnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLml0ZW1zWzBdID0gZGF0YS5kYXRhLnJvd3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gZGF0YS5kYXRhLnJvd3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnNvcnQoJ3BheENvdW50JywgZmluZExldmVsLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZHJpbGxMZXZlbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZmluZExldmVsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LmNsb3Nlc1BvcG92ZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBhbGVydCgnU2VydmVyIEVycm9yJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaW5pdGlhdGVBcnJheShkcmlsbHRhYnMpIHtcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBkcmlsbHRhYnMpIHtcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldID0ge1xuICAgICAgICAgICAgICAgIGlkOiBpLFxuICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMuZHJpbGx0YWJzW2ldLFxuICAgICAgICAgICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgICAgICAgICBvcmdJdGVtczogW10sXG4gICAgICAgICAgICAgICAgSXRlbXNCeVBhZ2U6IFtdLFxuICAgICAgICAgICAgICAgIGZpcnN0Q29sdW1uczogdGhpcy5maXJzdENvbHVtbnNbaV1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgb3BlbkJhckRyaWxsRG93blBvcG92ZXIoJGV2ZW50LCBzZWxEYXRhLCBzZWxGaW5kTGV2ZWwpIHtcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnTUVUUklDIFNOQVBTSE9UIFJFUE9SVCAtICcgKyBzZWxEYXRhLnBvaW50LmxhYmVsO1xuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdiYXInO1xuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnUm91dGUgTGV2ZWwnLCAnU2VjdG9yIExldmVsJywgJ0RhdGEgTGV2ZWwnLCAnRmxpZ2h0IExldmVsJ107XG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydyb3V0ZUNvZGUnLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2ZsaWdodERhdGUnXTtcbiAgICAgICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoYXQuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICAgICAgfSwgNTApO1xuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcbiAgICB9O1xuICAgIG9wZW5UYXJnZXREcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XG4gICAgICAgIHRoaXMuZHJpbGxOYW1lID0gJ1RhcmdldCBWcyBBY3R1YWwnO1xuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICd0YXJnZXQnO1xuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnUm91dGUgVHlwZScsICdSb3V0ZSBjb2RlJ107XG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydyb3V0ZXR5cGUnLCAncm91dGVjb2RlJ107XG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhpcy4kdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGF0LmRyaWxsQmFycG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgICAgdGhpcy5vcGVuQmFyRHJpbGxEb3duKHNlbERhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XG4gICAgfTtcblxuICAgIG9wZW5SZXZlbnVlRHJpbGxEb3duUG9wb3ZlcigkZXZlbnQsIHNlbERhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgICAgICBjb25zb2xlLmxvZyhzZWxEYXRhKTtcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnTmV0IFJldmVudWUgYnkgT1dOIGFuZCBPQUwnO1xuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdhbmFseXNpcyc7XG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydDb3VudHJ5IExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdGbGlnaHQgTGV2ZWwnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2NvdW50cnlGcm9tJywgJ2Zsb3duU2VjdG9yJywgJ2ZsaWdodE51bWJlcicsICduZXRSZXZlbnVlJ107XG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICAgICAgdGhpcy5vcGVuQmFyRHJpbGxEb3duKHNlbERhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XG4gICAgfTtcblxuICAgIG9wZW5SZXZlbnVlUGFzc2VuZ2VyRHJpbGxEb3duUG9wb3ZlcigkZXZlbnQsIHNlbERhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgICAgICBjb25zb2xlLmxvZyhzZWxEYXRhKTtcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnUGFzc2VuZ2VyIENvdW50IGJ5IENsYXNzIG9mIFRyYXZlbCc7XG4gICAgICAgIHRoaXMuZHJpbGxUeXBlID0gJ3Bhc3Nlbmdlci1jb3VudCc7XG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydDb3VudHJ5IExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdGbGlnaHQgTGV2ZWwnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2NvdW50cnlGcm9tJywgJ2Zsb3duU2VjdG9yJywgJ2ZsaWdodE51bWJlcicsICduZXRSZXZlbnVlJ107XG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICAgICAgdGhpcy5vcGVuQmFyRHJpbGxEb3duKHNlbERhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XG4gICAgfTtcblxuICAgIG9wZW5Qb3BvdmVyICgkZXZlbnQsIGluZGV4LCBjaGFydHR5cGUpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5jaGFydFR5cGUgPSBjaGFydHR5cGU7XG4gICAgICAgIHRoaXMuZ3JhcGhJbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9ncmFwaC1wb3BvdmVyLmh0bWwnLCB7XG4gICAgICAgICAgICBzY29wZTogdGhhdC4kc2NvcGVcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbihwb3BvdmVyKSB7XG4gICAgICAgICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XG4gICAgICAgICAgICB0aGF0LmdyYXBocG9wb3ZlciA9IHBvcG92ZXI7XG4gICAgICAgICAgICB0aGF0LmdyYXBocG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9wZW5TZWN0b3JQb3BvdmVyICgkZXZlbnQsaW5kZXgsY2hhcnR0eXBlKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhpcy5jaGFydFR5cGUgPSBjaGFydHR5cGU7XG4gICAgICAgIHRoaXMuZ3JhcGhJbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9zZWN0b3ItZ3JhcGgtcG9wb3Zlci5odG1sJywge1xuICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xuICAgICAgICAgICAgdGhhdC5wb3BvdmVyc2hvd24gPSB0cnVlO1xuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIgPSBwb3BvdmVyO1xuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjYWxsU2VjdG9yQ2FycmllckFuYWx5c2lzICgpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcbiAgICAgICAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxuICAgICAgICAgICAgdG9nZ2xlMTogJycsXG4gICAgICAgICAgICB0b2dnbGUyOiAnJyxcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG5cbiAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFNlY3RvckNhcnJpZXJBbmFseXNpcyhyZXFkYXRhKVxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKSB7XG4gICAgICAgICAgICAgICAgLy8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXG4gICAgICAgICAgICAgICAgdmFyIGpzb25PYmogPSBkYXRhLnJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzLCBmdW5jdGlvbih2YWw6IGFueSwgaTogbnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbFsnb3RoZXJzJ10gPSB2YWwuaXRlbXMuc3BsaWNlKC0xLCAxKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2YXIgc29ydGVkRGF0YSA9IF8uc29ydEJ5KGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHZhciBmYXZTZWN0b3JDYXJyaWVyUmVzdWx0ID0gXy5maWx0ZXIoc29ydGVkRGF0YSwgZnVuY3Rpb24odTogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB0aGF0LlNlY3RvckNhcnJpZXJBbmFseXNpc0NoYXJ0cyA9IGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzO1xuICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgICAgICAgICAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnRXJyb3InLFxuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiAnTm8gRGF0YSBGb3VuZCBGb3IgU2VjdG9yQ2FycmllckFuYWx5c2lzISEhJ1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkb25lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGFyZ2V0QWN0dWFsRmlsdGVyKHRoYXQ6IE1pc0NvbnRyb2xsZXIpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGl0ZW06IGFueSl7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS50b2dnbGUxID09IHRoYXQudG9nZ2xlLnRhcmdldFJldk9yUGF4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2VjdG9yQ2FycmllckZpbHRlcih0aGF0OiBNaXNDb250cm9sbGVyKSB7XG4gICAgICAgdGhhdCA9IHRoaXMudGhhdDtcbiAgICAgICByZXR1cm4gZnVuY3Rpb24oaXRlbTogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS50b2dnbGUxID09IHRoYXQudG9nZ2xlLnNlY3Rvck9yZGVyICYmIGl0ZW0udG9nZ2xlMiA9PSB0aGF0LnRvZ2dsZS5zZWN0b3JSZXZPclBheDsgXG4gICAgICB9XG4gICAgIFxuICAgIH1cblxuICAgIHJldmVudWVBbmFseXNpc0ZpbHRlcihpdGVtOiBhbnkpIHtcbiAgICAgICAgdmFyIHN1cmNoYXJnZUZsYWcgPSAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/IFwiWVwiIDogXCJOXCI7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHN1cmNoYXJnZUZsYWcrJyA6ICcraXRlbSk7XG4gICAgICAgIGlmKCBpdGVtLnN1cmNoYXJnZUZsYWcgPT0gc3VyY2hhcmdlRmxhZykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7IFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBnZXRGbG93bkZhdm9yaXRlcygpIHtcbiAgICAgICAgdGhpcy5jYWxsTWV0cmljU25hcHNob3QoKTtcbiAgICAgICAgdGhpcy5jYWxsVGFyZ2V0VnNBY3R1YWwoKTtcbiAgICAgICAgdGhpcy5jYWxsUmV2ZW51ZUFuYWx5c2lzKCk7XG4gICAgfVxuXG4gICAgaW9uaWNMb2FkaW5nU2hvdygpIHtcbiAgICAgICAgdGhpcy4kaW9uaWNMb2FkaW5nLnNob3coe1xuICAgICAgICAgICAgdGVtcGxhdGU6ICc8aW9uLXNwaW5uZXIgY2xhc3M9XCJzcGlubmVyLWNhbG1cIj48L2lvbi1zcGlubmVyPidcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGlvbmljTG9hZGluZ0hpZGUoKSB7XG4gICAgICAgIHRoaXMuJGlvbmljTG9hZGluZy5oaWRlKCk7XG4gICAgfTtcblxuICAgIG9wZW5EcmlsbERvd25Qb3BvdmVyKCRldmVudCxyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCkge1xuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdyb3V0ZSc7XG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydDb3VudHJ5IExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdGbGlnaHQgTGV2ZWwnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2NvdW50cnlGcm9tJywnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2RvY3VtZW50IyddO1xuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xuICAgICAgICB0aGlzLmRyaWxscG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICAgIHRoaXMub3BlbkRyaWxsRG93bihyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCk7XG4gICAgfTtcblxuICAgIGNsb3Nlc1BvcG92ZXIoKSB7XG4gICAgICAgIHRoaXMuZHJpbGxwb3BvdmVyLmhpZGUoKTtcbiAgICB9O1xuXG4gICAgaXNEcmlsbFJvd1NlbGVjdGVkKGxldmVsLG9iaikge1xuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RlZERyaWxsW2xldmVsXSA9PSBvYmo7XG4gICAgfVxuICAgIHNlYXJjaFJlc3VsdHMgKGxldmVsLG9iaikge1xuICAgICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLmZpbHRlcmVkTGlzdFNlcnZpY2Uuc2VhcmNoZWQodGhpcy5ncm91cHNbbGV2ZWxdLm9yZ0l0ZW1zWzBdLCBvYmouc2VhcmNoVGV4dCwgbGV2ZWwsIHRoaXMuZHJpbGxUeXBlKTtcbiAgICAgICAgaWYgKG9iai5zZWFyY2hUZXh0ID09ICcnKSB7XG4gICAgICAgICAgICB0aGlzLnJlc2V0QWxsKGxldmVsKTsgXG4gICAgICAgICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0ub3JnSXRlbXNbMF07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSAwO1xuICAgICAgICB0aGlzLnBhZ2luYXRpb24obGV2ZWwpOyBcbiAgICB9XG4gICAgcGFnaW5hdGlvbiAobGV2ZWwpIHtcbiAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLkl0ZW1zQnlQYWdlID0gdGhpcy5maWx0ZXJlZExpc3RTZXJ2aWNlLnBhZ2VkKHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSwgdGhpcy5wYWdlU2l6ZSApO1xuICAgIH07XG5cbiAgICBzZXRQYWdlIChsZXZlbCwgcGFnZW5vKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gcGFnZW5vO1xuICAgIH07XG4gICAgbGFzdFBhZ2UobGV2ZWwpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UubGVuZ3RoIC0gMTtcbiAgICB9O1xuICAgIHJlc2V0QWxsKGxldmVsKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcbiAgICB9XG4gICAgc29ydChzb3J0QnksbGV2ZWwsb3JkZXIpIHtcbiAgICAgICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XG4gICAgICAgIHRoaXMuY29sdW1uVG9PcmRlciA9IHNvcnRCeTsgXG4gICAgICAgIC8vJEZpbHRlciAtIFN0YW5kYXJkIFNlcnZpY2VcbiAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy4kZmlsdGVyKCdvcmRlckJ5JykodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLmNvbHVtblRvT3JkZXIsIG9yZGVyKTsgXG4gICAgICAgIHRoaXMucGFnaW5hdGlvbihsZXZlbCk7ICAgIFxuICAgIH07XG4gICAgcmFuZ2UodG90YWwsIGxldmVsKSB7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgdmFyIHN0YXJ0OiBudW1iZXI7XG4gICAgICAgIHN0YXJ0ID0gMDtcbiAgICAgICAgaWYodG90YWwgPiA1KSB7XG4gICAgICAgICAgICBzdGFydCA9IE51bWJlcih0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSkgLSAyO1xuICAgICAgICB9XG4gICAgICAgIGlmKHN0YXJ0IDwgMCkge1xuICAgICAgICAgIHN0YXJ0ID0gMDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgayA9IDE7XG4gICAgICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IHRvdGFsOyBpKyspIHtcbiAgICAgICAgICByZXQucHVzaChpKTtcbiAgICAgICAgICBrKys7XG4gICAgICAgICAgaWYgKGsgPiA2KSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICB0b2dnbGVHcm91cCAoZ3JvdXApIHtcbiAgICAgICAgaWYgKHRoaXMuaXNHcm91cFNob3duKGdyb3VwKSkge1xuICAgICAgICAgICAgdGhpcy5zaG93bkdyb3VwID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2hvd25Hcm91cCA9IGdyb3VwO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlzR3JvdXBTaG93bihncm91cDogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNob3duR3JvdXAgPT0gZ3JvdXA7XG4gICAgfVxuICAgIHRvZ2dsZUNoYXJ0T3JUYWJsZVZpZXcodmFsOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy50b2dnbGUuY2hhcnRPclRhYmxlID0gdmFsO1xuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xuICAgIH1cbiAgICB0b2dnbGVUYXJnZXRWaWV3KHZhbDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLnRhcmdldFZpZXcgPSB2YWw7XG4gICAgICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XG4gICAgfVxuICAgIHRvZ2dsZVJldmVudWVWaWV3KHZhbDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLnJldmVudWVWaWV3ID0gdmFsO1xuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xuICAgIH1cbiAgICB0b2dnbGVTZWN0b3JWaWV3KHZhbDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLnNlY3RvclZpZXcgPSB2YWw7XG4gICAgICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XG4gICAgfVxuXHRydW5SZXBvcnQoY2hhcnRUaXRsZTogc3RyaW5nLG1vbnRoT3JZZWFyOiBzdHJpbmcsZmxvd25Nb250aDogc3RyaW5nKXtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0Ly9pZiBubyBjb3Jkb3ZhLCB0aGVuIHJ1bm5pbmcgaW4gYnJvd3NlciBhbmQgbmVlZCB0byB1c2UgZGF0YVVSTCBhbmQgaWZyYW1lXG5cdFx0aWYgKCF3aW5kb3cuY29yZG92YSkge1xuXHRcdFx0dGhhdC5pb25pY0xvYWRpbmdTaG93KCk7XG5cdFx0XHR0aGlzLnJlcG9ydFN2Yy5ydW5SZXBvcnREYXRhVVJMKGNoYXJ0VGl0bGUsbW9udGhPclllYXIsZmxvd25Nb250aClcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZGF0YVVSTCkge1xuXHRcdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuXHRcdFx0XHRcdC8vc2V0IHRoZSBpZnJhbWUgc291cmNlIHRvIHRoZSBkYXRhVVJMIGNyZWF0ZWRcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKGRhdGFVUkwpO1xuXHRcdFx0XHRcdC8vZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BkZkltYWdlJykuc3JjID0gZGF0YVVSTDtcblx0XHRcdFx0XHR3aW5kb3cub3BlbihkYXRhVVJMLFwiX3N5c3RlbVwiKTtcblx0XHRcdFx0fSwgZnVuY3Rpb24oZXJyb3IpIHtcblx0XHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRXJyb3IgJyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdC8vaWYgY29kcm92YSwgdGhlbiBydW5uaW5nIGluIGRldmljZS9lbXVsYXRvciBhbmQgYWJsZSB0byBzYXZlIGZpbGUgYW5kIG9wZW4gdy8gSW5BcHBCcm93c2VyXG5cdFx0ZWxzZSB7XG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ1Nob3coKTtcblx0XHRcdHRoaXMucmVwb3J0U3ZjLnJ1blJlcG9ydEFzeW5jKGNoYXJ0VGl0bGUsbW9udGhPclllYXIsZmxvd25Nb250aClcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZmlsZVBhdGgpIHtcblx0XHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdFx0XHQvL2xvZyB0aGUgZmlsZSBsb2NhdGlvbiBmb3IgZGVidWdnaW5nIGFuZCBvb3BlbiB3aXRoIGluYXBwYnJvd3NlclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXBvcnQgcnVuIG9uIGRldmljZSB1c2luZyBGaWxlIHBsdWdpbicpO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdSZXBvcnRDdHJsOiBPcGVuaW5nIFBERiBGaWxlICgnICsgZmlsZVBhdGggKyAnKScpO1xuXHRcdFx0XHRcdHZhciBsYXN0UGFydCA9IGZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKTtcblx0XHRcdFx0XHR2YXIgZmlsZU5hbWUgPSBcIi9tbnQvc2RjYXJkL1wiK2xhc3RQYXJ0O1x0XHRcdFx0XHRcblx0XHRcdFx0XHRpZihkZXZpY2UucGxhdGZvcm0gIT1cIkFuZHJvaWRcIilcblx0XHRcdFx0XHRmaWxlTmFtZSA9IGZpbGVQYXRoO1xuXHRcdFx0XHRcdC8vd2luZG93Lm9wZW5QREYoZmlsZU5hbWUpO1xuXHRcdFx0XHRcdC8vZWxzZVxuXHRcdFx0XHRcdC8vd2luZG93Lm9wZW4oZmlsZVBhdGgsICdfYmxhbmsnLCAnbG9jYXRpb249bm8sY2xvc2VidXR0b25jYXB0aW9uPUNsb3NlLGVuYWJsZVZpZXdwb3J0U2NhbGU9eWVzJyk7Ki9cblx0XHRcdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29yZG92YS5wbHVnaW5zLmZpbGVPcGVuZXIyLm9wZW4oXG5cdFx0XHRcdFx0XHRmaWxlTmFtZSwgXG5cdFx0XHRcdFx0XHQnYXBwbGljYXRpb24vcGRmJywgXG5cdFx0XHRcdFx0XHR7IFxuXHRcdFx0XHRcdFx0XHRlcnJvciA6IGZ1bmN0aW9uKGUpIHsgXG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0Vycm9yIHN0YXR1czogJyArIGUuc3RhdHVzICsgJyAtIEVycm9yIG1lc3NhZ2U6ICcgKyBlLm1lc3NhZ2UpO1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRzdWNjZXNzIDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlIG9wZW5lZCBzdWNjZXNzZnVsbHknKTsgICAgICAgICAgICAgICAgXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9LCBmdW5jdGlvbihlcnJvcikge1xuXHRcdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdFcnJvciAnKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdH1cblx0XG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9zZXJ2aWNlcy9PcGVyYXRpb25hbFNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIgLz5cblxuaW50ZXJmYWNlIHRhYk9iamVjdCB7XG4gICAgdGl0bGU6IHN0cmluZyxcbiAgICBuYW1lczogc3RyaW5nLFxuICAgIGljb246IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgdG9nZ2xlT2JqZWN0IHtcbiAgICBtb250aE9yWWVhcjogc3RyaW5nLFxuICAgIG9wZW5PckNsb3NlZDogc3RyaW5nLFxuICAgIGZsaWdodFN0YXR1czogc3RyaW5nLFxuICAgIGZsaWdodFJlYXNvbjogc3RyaW5nLFxuICAgIGNjRXhjZXB0aW9uOiBzdHJpbmdcbn1cblxuaW50ZXJmYWNlIGhlYWRlck9iamVjdCB7XG4gICAgZmxvd25Nb250aDogc3RyaW5nLFxuICAgIHRhYkluZGV4OiBudW1iZXIsXG4gICAgdXNlck5hbWU6IHN0cmluZ1xufVxuXG5jbGFzcyBPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlciB7XG4gIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHN0YXRlJywgJyRzY29wZScsICckaW9uaWNMb2FkaW5nJywgJyRpb25pY1BvcG92ZXInLCAnJGZpbHRlcicsXG4gICAgJ09wZXJhdGlvbmFsU2VydmljZScsICckaW9uaWNTbGlkZUJveERlbGVnYXRlJywgJyR0aW1lb3V0JywgJyR3aW5kb3cnLCAnUmVwb3J0U3ZjJywgJ0ZpbHRlcmVkTGlzdFNlcnZpY2UnLCAnVXNlclNlcnZpY2UnLCAnJGlvbmljSGlzdG9yeScsICdHUkFQSF9DT0xPUlMnLCAnVEFCUycsICckaW9uaWNQb3B1cCddO1xuICBwcml2YXRlIHRhYnM6IFt0YWJPYmplY3RdO1xuICBwcml2YXRlIHRvZ2dsZTogdG9nZ2xlT2JqZWN0O1xuICBwcml2YXRlIGhlYWRlcjogaGVhZGVyT2JqZWN0O1xuICBwcml2YXRlIHN1YkhlYWRlcjogYW55O1xuICBwcml2YXRlIGZsaWdodFByb2NTdGF0dXM6IGFueTtcbiAgcHJpdmF0ZSBmYXZGbGlnaHRQcm9jUmVzdWx0OiBhbnk7XG4gIHByaXZhdGUgY2Fyb3VzZWxJbmRleDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBmbGlnaHRDb3VudFJlYXNvbjogYW55O1xuICBwcml2YXRlIGNvdXBvbkNvdW50RXhjZXB0aW9uOiBhbnk7XG4gIHByaXZhdGUgY2hhcnR0eXBlOiBzdHJpbmc7XG4gIHByaXZhdGUgZ3JhcGhUeXBlOiBzdHJpbmc7XG4gIHByaXZhdGUgZ3JhcGhwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcbiAgcHJpdmF0ZSBwb3BvdmVyc2hvd246IGJvb2xlYW47XG4gIHByaXZhdGUgdGhyZWVCYXJDaGFydENvbG9yczogW3N0cmluZ10gPSB0aGlzLkdSQVBIX0NPTE9SUy5USFJFRV9CQVJTX0NIQVJUO1xuICBwcml2YXRlIGZvdXJCYXJDaGFydENvbG9yczogW3N0cmluZ10gPSB0aGlzLkdSQVBIX0NPTE9SUy5GT1VSX0JBUlNfQ0hBUlQ7XG5cbiAgcHJpdmF0ZSBpbmZvcG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XG4gIHByaXZhdGUgaW5mb2RhdGE6IHN0cmluZztcbiAgcHJpdmF0ZSBmbGlnaHRQcm9jU2VjdGlvbjogc3RyaW5nO1xuICBwcml2YXRlIGZsaWdodENvdW50U2VjdGlvbjogc3RyaW5nO1xuICBwcml2YXRlIGNvdXBvbkNvdW50U2VjdGlvbjogc3RyaW5nO1xuICBwcml2YXRlIGN1cnJlbnRJbmRleDogbnVtYmVyO1xuXG4gIHByaXZhdGUgcGFnZVNpemUgPSA0O1xuICBwcml2YXRlIGN1cnJlbnRQYWdlID0gW107XG4gIHByaXZhdGUgc2VsZWN0ZWREcmlsbCA9IFtdO1xuICBwcml2YXRlIGdyb3VwcyA9IFtdO1xuICBwcml2YXRlIGNvbHVtblRvT3JkZXI6IHN0cmluZztcbiAgcHJpdmF0ZSBzaG93bkdyb3VwOiBudW1iZXI7XG4gIHByaXZhdGUgZHJpbGxUeXBlOiBzdHJpbmc7XG4gIHByaXZhdGUgZHJpbGxCYXJMYWJlbDogc3RyaW5nO1xuICBwcml2YXRlIGV4Y2VwdGlvbkNhdGVnb3J5OiBzdHJpbmc7XG4gIHByaXZhdGUgZHJpbGx0YWJzOiBzdHJpbmdbXTtcbiAgcHJpdmF0ZSBkcmlsbE5hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSBmaXJzdENvbHVtbnM6IHN0cmluZ1tdO1xuICBwcml2YXRlIGRyaWxscG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XG5cbiAgcHJpdmF0ZSBmbGlnaHRDb3VudExlZ2VuZHM6IGFueTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlICRzdGF0ZTogYW5ndWxhci51aS5JU3RhdGVTZXJ2aWNlLCBwcml2YXRlICRzY29wZTogbmcuSVNjb3BlLFxuICAgIHByaXZhdGUgJGlvbmljTG9hZGluZzogSW9uaWMuSUxvYWRpbmcsXG4gICAgcHJpdmF0ZSAkaW9uaWNQb3BvdmVyOiBJb25pYy5JUG9wb3ZlciwgcHJpdmF0ZSAkZmlsdGVyOiBuZy5JRmlsdGVyU2VydmljZSxcbiAgICBwcml2YXRlIG9wZXJhdGlvbmFsU2VydmljZTogT3BlcmF0aW9uYWxTZXJ2aWNlLFxuICAgIHByaXZhdGUgJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZTogSW9uaWMuSVNsaWRlQm94RGVsZWdhdGUsXG4gICAgcHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLCBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxuICAgIHByaXZhdGUgcmVwb3J0U3ZjOiBSZXBvcnRTdmMsIHByaXZhdGUgZmlsdGVyZWRMaXN0U2VydmljZTogRmlsdGVyZWRMaXN0U2VydmljZSxcbiAgICBwcml2YXRlIHVzZXJTZXJ2aWNlOiBVc2VyU2VydmljZSwgcHJpdmF0ZSAkaW9uaWNIaXN0b3J5OiBhbnksIHByaXZhdGUgR1JBUEhfQ09MT1JTOiBzdHJpbmcsIHByaXZhdGUgVEFCUzogc3RyaW5nLCBwcml2YXRlICRpb25pY1BvcHVwOiBJb25pYy5JUG9wdXApIHtcbiAgICAgIFxuICAgIHRoaXMudGFicyA9IHRoaXMuVEFCUy5EQjJfVEFCUztcblxuICAgIHRoaXMudG9nZ2xlID0ge1xuICAgICAgbW9udGhPclllYXI6ICdtb250aCcsXG4gICAgICBvcGVuT3JDbG9zZWQ6ICdPUEVOJyxcbiAgICAgIGZsaWdodFN0YXR1czogJ2NoYXJ0JyxcbiAgICAgIGZsaWdodFJlYXNvbjogJ2NoYXJ0JyxcbiAgICAgIGNjRXhjZXB0aW9uOiAnY2hhcnQnXG4gICAgfTtcblxuICAgIHRoaXMuaGVhZGVyID0ge1xuICAgICAgZmxvd25Nb250aDogJycsXG4gICAgICB0YWJJbmRleDogMCxcbiAgICAgIHVzZXJOYW1lOiAnJ1xuICAgIH07XG4gIGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpLmJpbmQoJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5vcmllbnRhdGlvbkNoYW5nZSk7IFxuICAgIHRoaXMuaW5pdERhdGEoKTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAgIHRoaXMuJHNjb3BlLiRvbignb25TbGlkZU1vdmUnLCAoZXZlbnQ6IGFueSwgcmVzcG9uc2U6IGFueSkgPT4ge1xuICAgICAgICAgIHRoYXQuJHNjb3BlLk9wckN0cmwub25TbGlkZU1vdmUocmVzcG9uc2UpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuJHNjb3BlLiRvbignJGlvbmljVmlldy5lbnRlcicsICgpID0+IHtcbiAgICAgICAgaWYgKCF0aGF0LnVzZXJTZXJ2aWNlLnNob3dEYXNoYm9hcmQoJ09wZXJhdGlvbmFsJykpIHtcbiAgICAgICAgICB0aGF0LiRzdGF0ZS5nbyhcImxvZ2luXCIpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdGhpcy4kc2NvcGUuJG9uKCdvcGVuRHJpbGxQb3B1cDEnLCAoZXZlbnQ6IGFueSwgcmVzcG9uc2U6IGFueSkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZS50eXBlKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ2ZsaWdodC1wcm9jZXNzJykge1xuICAgICAgICAgIHRoaXMuJHNjb3BlLk9wckN0cmwub3BlbkZsaWdodFByb2Nlc3NEcmlsbFBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAnY291cG9uLWNvdW50Jykge1xuICAgICAgICAgIHRoaXMuJHNjb3BlLk9wckN0cmwub3BlbkNvdW5wb25Db3VudERyaWxsUG9wb3ZlcihyZXNwb25zZS5ldmVudCwgeyBcInBvaW50XCI6IHJlc3BvbnNlLmRhdGEgfSwgLTEpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXNwb25zZS50eXBlID09ICdmbGlnaHQtY291bnQnKSB7XG4gICAgICAgICAgdGhpcy4kc2NvcGUuT3ByQ3RybC5vcGVuRmxpZ2h0Q291bnREcmlsbFBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH1cblxuICBpbml0RGF0YSgpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL2RyaWxkb3duLmh0bWwnLCB7XG4gICAgICBzY29wZTogdGhhdC4kc2NvcGVcbiAgICB9KS50aGVuKGZ1bmN0aW9uKGRyaWxscG9wb3Zlcikge1xuICAgICAgdGhhdC5kcmlsbHBvcG92ZXIgPSBkcmlsbHBvcG92ZXI7XG4gICAgfSk7XG5cblxuICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vaW5mb3Rvb2x0aXAuaHRtbCcsIHtcbiAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxuICAgIH0pLnRoZW4oZnVuY3Rpb24oaW5mb3BvcG92ZXIpIHtcbiAgICAgIHRoYXQuaW5mb3BvcG92ZXIgPSBpbmZvcG9wb3ZlcjtcbiAgICB9KTtcblxuICAgIHZhciByZXEgPSB7XG4gICAgICB1c2VySWQ6IHRoYXQuJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicpXG4gICAgfVxuXG4gICAgaWYgKHJlcS51c2VySWQgIT0gXCJudWxsXCIpIHtcbiAgICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldFBheEZsb3duT3BySGVhZGVyKHJlcSkudGhlbihcbiAgICAgICAgKGRhdGEpID0+IHtcbiAgICAgICAgICB0aGF0LnN1YkhlYWRlciA9IGRhdGEucmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGF0LnN1YkhlYWRlci5wYXhGbG93bk9wck1vbnRocyk7XG4gICAgICAgICAgdGhhdC5oZWFkZXIuZmxvd25Nb250aCA9IHRoYXQuc3ViSGVhZGVyLmRlZmF1bHRNb250aDtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGF0LmhlYWRlci5mbG93bk1vbnRoKTtcbiAgICAgICAgICB0aGF0Lm9uU2xpZGVNb3ZlKHsgaW5kZXg6IDAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIChlcnJvcikgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB0aGF0LmhlYWRlci51c2VyTmFtZSA9IHRoYXQuZ2V0UHJvZmlsZVVzZXJOYW1lKCk7XG4gIH1cbiAgc2VsZWN0ZWRGbG93bk1vbnRoKG1vbnRoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gKG1vbnRoID09IHRoaXMuaGVhZGVyLmZsb3duTW9udGgpO1xuICB9XG5cbiAgZ2V0UHJvZmlsZVVzZXJOYW1lKCk6IHN0cmluZyB7XG4gICAgaWYgKHRoaXMudXNlclNlcnZpY2UuaXNVc2VyTG9nZ2VkSW4oKSkge1xuICAgICAgdmFyIG9iaiA9IHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicpO1xuICAgICAgaWYgKG9iaiAhPSAnbnVsbCcpIHtcbiAgICAgICAgdmFyIHByb2ZpbGVVc2VyTmFtZSA9IEpTT04ucGFyc2Uob2JqKTtcbiAgICAgICAgcmV0dXJuIHByb2ZpbGVVc2VyTmFtZS51c2VybmFtZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgXG4gIG9yaWVudGF0aW9uQ2hhbmdlID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGF0LiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgdGhhdC5vblNsaWRlTW92ZSh7IGluZGV4OiB0aGF0LmhlYWRlci50YWJJbmRleCB9KTtcbiAgICB9LCAyMDApXG4gIH1cblxuICB1cGRhdGVIZWFkZXIoKSB7XG4gICAgdmFyIGZsb3duTW9udGggPSB0aGlzLmhlYWRlci5mbG93bk1vbnRoO1xuICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XG4gIH1cblxuXG4gIG9uU2xpZGVNb3ZlKGRhdGE6IGFueSkge1xuICAgIHRoaXMuaGVhZGVyLnRhYkluZGV4ID0gZGF0YS5pbmRleDtcbiAgICBzd2l0Y2ggKHRoaXMuaGVhZGVyLnRhYkluZGV4KSB7XG4gICAgICBjYXNlIDA6XG4gICAgICAgIHRoaXMuY2FsbE15RGFzaGJvYXJkKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAxOlxuICAgICAgICB0aGlzLmNhbGxGbGlnaHRQcm9jU3RhdHVzKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICB0aGlzLmNhbGxGbGlnaHRDb3VudEJ5UmVhc29uKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICB0aGlzLmNhbGxDb3Vwb25Db3VudEJ5RXhjZXB0aW9uKCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfTtcbiAgY2FsbE15RGFzaGJvYXJkKCkge1xuICAgIHRoaXMuY2FsbEZsaWdodFByb2NTdGF0dXMoKTtcbiAgICB0aGlzLmNhbGxGbGlnaHRDb3VudEJ5UmVhc29uKCk7XG4gICAgdGhpcy5jYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbigpO1xuICB9XG4gIGNhbGxGbGlnaHRQcm9jU3RhdHVzKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcmVxZGF0YSA9IHtcbiAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJOYW1lLFxuICAgICAgdG9nZ2xlMTogJycsXG4gICAgICBmdWxsRGF0YUZsYWc6ICdOJ1xuICAgIH07XG5cbiAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcbiAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJGbGlnaHRQcm9jU3RhdHVzKHJlcWRhdGEpXG4gICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiICYmIGRhdGEucmVzcG9uc2UuZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc2VjdGlvbk5hbWUnKSl7XHRcdCAgXG5cdFx0XHR2YXIgb3RoZXJDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuRk9VUl9CQVJTX0NIQVJUWzBdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5GT1VSX0JBUlNfQ0hBUlRbMV0gfSxcblx0XHRcdCAgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkZPVVJfQkFSU19DSEFSVFsyXSB9LCB7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuRk9VUl9CQVJTX0NIQVJUWzNdIH1dO1xuXHRcdFx0dmFyIHBpZUNoYXJ0Q29sb3JzID0gW3sgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5USFJFRV9CQVJTX0NIQVJUWzBdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5USFJFRV9CQVJTX0NIQVJUWzFdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5USFJFRV9CQVJTX0NIQVJUWzJdIH1dO1xuXG5cdFx0XHR2YXIganNvbk9iaiA9IHRoYXQuYXBwbHlDaGFydENvbG9yQ29kZXMoZGF0YS5yZXNwb25zZS5kYXRhLCBwaWVDaGFydENvbG9ycywgb3RoZXJDaGFydENvbG9ycyk7XG5cdFx0XHR0aGF0LmZsaWdodFByb2NTZWN0aW9uID0ganNvbk9iai5zZWN0aW9uTmFtZTtcblx0XHRcdHZhciBwaWVDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLnBpZUNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XG5cdFx0XHQgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG5cdFx0XHR9KTtcblx0XHRcdHZhciBtdWx0aUNoYXJ0cyA9IF8uZmlsdGVyKGpzb25PYmoubXVsdGliYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xuXHRcdFx0ICBpZiAodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xuXHRcdFx0fSk7XG5cdFx0XHR2YXIgc3RhY2tDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLnN0YWNrZWRCYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xuXHRcdFx0ICBpZiAodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xuXHRcdFx0fSk7ICAgICAgICAgIFxuXHRcdFx0Ly8gY29uc29sZS5sb2coc3RhY2tDaGFydHMpO1xuXHRcdFx0aWYgKHRoYXQuaGVhZGVyLnRhYkluZGV4ID09IDApIHtcblx0XHRcdCAgdGhhdC5mbGlnaHRQcm9jU3RhdHVzID0ge1xuXHRcdFx0XHRwaWVDaGFydDogcGllQ2hhcnRzWzBdLFxuXHRcdFx0XHR3ZWVrRGF0YTogbXVsdGlDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxuXHRcdFx0XHRzdGFja2VkQ2hhcnQ6IChzdGFja0NoYXJ0cy5sZW5ndGgpID8gc3RhY2tDaGFydHNbMF0gOiBbXVxuXHRcdFx0ICB9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0ICB0aGF0LmZsaWdodFByb2NTdGF0dXMgPSB7XG5cdFx0XHRcdHBpZUNoYXJ0OiBqc29uT2JqLnBpZUNoYXJ0c1swXSxcblx0XHRcdFx0d2Vla0RhdGE6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxuXHRcdFx0XHRzdGFja2VkQ2hhcnQ6IGpzb25PYmouc3RhY2tlZEJhckNoYXJ0c1swXVxuXHRcdFx0ICB9XG5cdFx0XHR9XG5cdFx0XHQvLyBjb25zb2xlLmxvZyhzdGFja0NoYXJ0cyk7XG5cdFx0XHR0aGF0LiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0ICB0aGF0LiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGEnKS51cGRhdGUoKTtcblx0XHRcdH0sIDApO1xuXHRcdFx0Ly8gY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodGhhdC5mbGlnaHRQcm9jU3RhdHVzLndlZWtEYXRhKSk7XG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHR9ZWxzZXtcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuXHRcdFx0dGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG5cdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxuXHRcdFx0XHRjb250ZW50OiAnRGF0YSBub3QgZm91bmQgZm9yIEZsaWdodHMgUHJvY2Vzc2luZyBTdGF0dXMhISEnXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZG9uZScpO1xuXHRcdFx0fSk7XG5cblx0XHR9XG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgfSk7XG4gIH1cbiAgY2FsbEZsaWdodENvdW50QnlSZWFzb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciByZXFkYXRhID0ge1xuICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlck5hbWUsXG4gICAgICB0b2dnbGUxOiB0aGlzLnRvZ2dsZS5vcGVuT3JDbG9zZWQudG9Mb3dlckNhc2UoKSxcbiAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXG4gICAgfTtcbiAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcbiAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJGbGlnaHRDb3VudEJ5UmVhc29uKHJlcWRhdGEpXG4gICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICBpZiAoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiICYmIGRhdGEucmVzcG9uc2UuZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc2VjdGlvbk5hbWUnKSkge1x0XG5cdFx0XHQvLyBjb25zb2xlLmxvZyhqc29uT2JqLnBpZUNoYXJ0c1swXSk7XG5cdFx0XHR2YXIgb3RoZXJDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX09USF9DT0xPUlMxWzBdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fT1RIX0NPTE9SUzFbMV0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19PVEhfQ09MT1JTMVsyXSB9XTtcblx0XHRcdHZhciBwaWVDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxWzBdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMV0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVsyXSB9XTtcblxuXHRcdFx0dGhhdC5mbGlnaHRDb3VudExlZ2VuZHMgPSBkYXRhLnJlc3BvbnNlLmRhdGEubGVnZW5kcztcblxuXHRcdFx0dmFyIGpzb25PYmogPSB0aGF0LmFwcGx5Q2hhcnRDb2xvckNvZGVzKGRhdGEucmVzcG9uc2UuZGF0YSwgcGllQ2hhcnRDb2xvcnMsIG90aGVyQ2hhcnRDb2xvcnMpO1xuXHRcdFx0dGhhdC5mbGlnaHRDb3VudFNlY3Rpb24gPSBqc29uT2JqLnNlY3Rpb25OYW1lO1xuXHRcdFx0aWYgKHRoYXQuaGVhZGVyLnRhYkluZGV4ID09IDApIHtcblx0XHRcdCAgdGhhdC5mbGlnaHRDb3VudFJlYXNvbiA9IHRoYXQuZ2V0RmF2b3JpdGVJdGVtcyhqc29uT2JqKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHQgIHRoYXQuZmxpZ2h0Q291bnRSZWFzb24gPSB7XG5cdFx0XHRcdHBpZUNoYXJ0OiBqc29uT2JqLnBpZUNoYXJ0c1swXSxcblx0XHRcdFx0d2Vla0RhdGE6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxuXHRcdFx0XHRzdGFja2VkQ2hhcnQ6IGpzb25PYmouc3RhY2tlZEJhckNoYXJ0c1swXVxuXHRcdFx0ICB9XG5cdFx0XHR9XG5cblx0XHRcdHRoYXQuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHQgIHRoYXQuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpLnVwZGF0ZSgpO1xuXHRcdFx0fSwgMCk7XG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHR9ZWxzZXtcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG4gICAgICAgIHRpdGxlOiAnRXJyb3InLFxuICAgICAgICBjb250ZW50OiAnRGF0YSBub3QgZm91bmQgZm9yIEZsaWdodHMgQ291bnQgYnkgUmVhc29uISEhJ1xuICAgICAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZG9uZScpO1xuICAgICAgfSk7XG5cblx0XHR9XG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgY2FsbENvdXBvbkNvdW50QnlFeGNlcHRpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciByZXFkYXRhID0ge1xuICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlck5hbWUsXG4gICAgICB0b2dnbGUxOiAnJyxcbiAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXG4gICAgfTtcbiAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcbiAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJDb3Vwb25Db3VudEJ5RXhjZXB0aW9uKHJlcWRhdGEpXG4gICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICBpZiAoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiICYmIGRhdGEucmVzcG9uc2UuZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc2VjdGlvbk5hbWUnKSkge1xuXHRcdFx0dmFyIG90aGVyQ2hhcnRDb2xvcnMgPSBbeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVswXSB9LCB7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxWzFdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMl0gfV07XG5cdFx0XHR2YXIgcGllQ2hhcnRDb2xvcnMgPSBbeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVswXSB9LCB7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxWzFdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMl0gfV07XG5cblx0XHRcdHZhciBqc29uT2JqID0gdGhhdC5hcHBseUNoYXJ0Q29sb3JDb2RlcyhkYXRhLnJlc3BvbnNlLmRhdGEsIHBpZUNoYXJ0Q29sb3JzLCBvdGhlckNoYXJ0Q29sb3JzKTtcblx0XHRcdHRoYXQuY291cG9uQ291bnRTZWN0aW9uID0ganNvbk9iai5zZWN0aW9uTmFtZTtcblx0XHRcdGlmICh0aGF0LmhlYWRlci50YWJJbmRleCA9PSAwKSB7XG5cdFx0XHQgIHRoYXQuY291cG9uQ291bnRFeGNlcHRpb24gPSB0aGF0LmdldEZhdm9yaXRlSXRlbXMoanNvbk9iaik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0ICB0aGF0LmNvdXBvbkNvdW50RXhjZXB0aW9uID0ge1xuXHRcdFx0XHRwaWVDaGFydDoganNvbk9iai5waWVDaGFydHNbMF0sXG5cdFx0XHRcdHdlZWtEYXRhOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzBdLm11bHRpYmFyQ2hhcnRJdGVtcyxcblx0XHRcdFx0c3RhY2tlZENoYXJ0OiBqc29uT2JqLnN0YWNrZWRCYXJDaGFydHNbMF1cblx0XHRcdCAgfVxuXHRcdFx0fVxuXHRcdFx0dGhhdC4kdGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdCAgdGhhdC4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykudXBkYXRlKCk7XG5cdFx0XHR9LCAwKTtcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1x0XHRcblx0XHR9ZWxzZXtcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG4gICAgICAgIHRpdGxlOiAnRXJyb3InLFxuICAgICAgICBjb250ZW50OiAnRGF0YSBub3QgZm91bmQgZm9yIENvdXBvbiBDb3VudCBieSBFeGNlcHRpb24gQ2F0ZWdvcnkhISEnXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdkb25lJyk7XG4gICAgICB9KTtcblxuXHRcdH1cbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgfSk7XG4gIH1cbiAgb3BlblBvcG92ZXIoJGV2ZW50LCBjaGFydHR5cGUsIGluZGV4KSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciB0ZW1wID0gdGhpcy4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJyk7XG4gICAgdGhhdC5jdXJyZW50SW5kZXggPSB0ZW1wLmN1cnJlbnRJbmRleCgpO1xuICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHRoaXMuY2hhcnR0eXBlID0gY2hhcnR0eXBlO1xuICAgIHRoaXMuZ3JhcGhUeXBlID0gaW5kZXg7XG4gICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9ncmFwaC1wb3BvdmVyLmh0bWwnLCB7XG4gICAgICBzY29wZTogdGhhdC4kc2NvcGVcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHBvcG92ZXIpIHtcbiAgICAgIHRoYXQucG9wb3ZlcnNob3duID0gdHJ1ZTtcbiAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcbiAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICB9KTtcbiAgfVxuICBvcGVuUGllUG9wb3ZlcigkZXZlbnQsIGNoYXJ0dHlwZSwgaW5kZXgpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdGhpcy5jaGFydHR5cGUgPSBjaGFydHR5cGU7XG4gICAgdGhpcy5ncmFwaFR5cGUgPSBpbmRleDtcbiAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL3BpZS1wb3BvdmVyLmh0bWwnLCB7XG4gICAgICBzY29wZTogdGhhdC4kc2NvcGVcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHBvcG92ZXIpIHtcbiAgICAgIHRoYXQucG9wb3ZlcnNob3duID0gdHJ1ZTtcbiAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcbiAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNsb3NlUG9wb3ZlcigpIHtcbiAgICB0aGlzLmdyYXBocG9wb3Zlci5oaWRlKCk7XG4gIH07XG4gIGlvbmljTG9hZGluZ1Nob3coKSB7XG4gICAgdGhpcy4kaW9uaWNMb2FkaW5nLnNob3coe1xuICAgICAgdGVtcGxhdGU6ICc8aW9uLXNwaW5uZXIgY2xhc3M9XCJzcGlubmVyLWNhbG1cIj48L2lvbi1zcGlubmVyPidcbiAgICB9KTtcbiAgfTtcbiAgYXBwbHlDaGFydENvbG9yQ29kZXMoanNvbk9iajogYW55LCBwaWVDaGFydENvbG9yczogYW55LCBvdGhlckNoYXJ0Q29sb3JzOiBhbnkpIHtcbiAgICBfLmZvckVhY2goanNvbk9iai5waWVDaGFydHNbMF0uZGF0YSwgZnVuY3Rpb24objogYW55LCB2YWx1ZTogYW55KSB7XG4gICAgICBuLmxhYmVsID0gbi54dmFsO1xuICAgICAgbi52YWx1ZSA9IG4ueXZhbDtcbiAgICB9KTtcbiAgICBfLm1lcmdlKGpzb25PYmoucGllQ2hhcnRzWzBdLmRhdGEsIHBpZUNoYXJ0Q29sb3JzKTtcbiAgICBfLm1lcmdlKGpzb25PYmoubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLCBvdGhlckNoYXJ0Q29sb3JzKTtcdFxuXHRpZihqc29uT2JqLnN0YWNrZWRCYXJDaGFydHNbMF0uc3RhY2tlZEJhcmNoYXJ0SXRlbXMubGVuZ3RoID49IDMpe1xuXHRcdF8ubWVyZ2UoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdLnN0YWNrZWRCYXJjaGFydEl0ZW1zLCBvdGhlckNoYXJ0Q29sb3JzKTtcblx0fWVsc2V7XG5cdFx0dmFyIHRlbXBDb2xvcnMgPSBbeyBcImNvbG9yXCI6IHRoaXMuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVswXSB9LCB7IFwiY29sb3JcIjogdGhpcy5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxWzFdIH1dO1xuXHRcdF8ubWVyZ2UoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdLnN0YWNrZWRCYXJjaGFydEl0ZW1zLCB0ZW1wQ29sb3JzKTtcblx0fVxuICAgIHJldHVybiBqc29uT2JqO1xuXG4gIH1cbiAgZ2V0RmF2b3JpdGVJdGVtcyhqc29uT2JqOiBhbnkpIHtcbiAgICB2YXIgcGllQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5waWVDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xuICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcbiAgICB9KTtcbiAgICB2YXIgbXVsdGlDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLm11bHRpYmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcbiAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG4gICAgfSk7XG4gICAgdmFyIHN0YWNrQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcbiAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG4gICAgfSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBpZUNoYXJ0OiBwaWVDaGFydHNbMF0sXG4gICAgICB3ZWVrRGF0YTogKG11bHRpQ2hhcnRzLmxlbmd0aCkgPyBtdWx0aUNoYXJ0cy5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMgOiBbXSxcbiAgICAgIHN0YWNrZWRDaGFydDogKHN0YWNrQ2hhcnRzLmxlbmd0aCkgPyBzdGFja0NoYXJ0c1swXSA6IFtdXG4gICAgfVxuICB9XG5cbiAgY29sb3JGdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgIHJldHVybiB0aGF0LnRocmVlQmFyQ2hhcnRDb2xvcnNbaV07XG4gICAgfTtcbiAgfVxuICBmb3VyQmFyQ29sb3JGdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgIHJldHVybiB0aGF0LmZvdXJCYXJDaGFydENvbG9yc1tpXTtcbiAgICB9O1xuICB9XG4gIG9wZW5pbmZvUG9wb3ZlcigkZXZlbnQsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBpbmRleCA9PSBcInVuZGVmaW5lZFwiIHx8IGluZGV4ID09IFwiXCIpIHtcbiAgICAgIHRoaXMuaW5mb2RhdGEgPSAnTm8gaW5mbyBhdmFpbGFibGUnO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuaW5mb2RhdGEgPSBpbmRleDtcbiAgICB9XG4gICAgY29uc29sZS5sb2coaW5kZXgpO1xuICAgIHRoaXMuaW5mb3BvcG92ZXIuc2hvdygkZXZlbnQpO1xuICB9O1xuICBjbG9zZUluZm9Qb3BvdmVyKCkge1xuICAgIHRoaXMuaW5mb3BvcG92ZXIuaGlkZSgpO1xuICB9XG4gIHRvZ2dsZUNvdW50KHZhbCkge1xuICAgIHRoaXMudG9nZ2xlLm9wZW5PckNsb3NlZCA9IHZhbDtcbiAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xuICB9XG4gIGlvbmljTG9hZGluZ0hpZGUoKSB7XG4gICAgdGhpcy4kaW9uaWNMb2FkaW5nLmhpZGUoKTtcbiAgfTtcbiAgdGFiTG9ja1NsaWRlKHRhYm5hbWU6IHN0cmluZykge1xuICAgIHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUodGFibmFtZSkuZW5hYmxlU2xpZGUoZmFsc2UpO1xuICB9XG4gIHdlZWtEYXRhUHJldigpIHtcbiAgICB0aGlzLiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGEnKS5wcmV2aW91cygpO1xuICB9O1xuICB3ZWVrRGF0YU5leHQoKSB7XG4gICAgdGhpcy4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykubmV4dCgpO1xuICB9XG4gIHRvZ2dsZUZsaWdodFN0YXR1c1ZpZXcodmFsOiBzdHJpbmcpIHtcbiAgICB0aGlzLnRvZ2dsZS5mbGlnaHRTdGF0dXMgPSB2YWw7XG4gICAgdGhpcy5vblNsaWRlTW92ZSh7IGluZGV4OiB0aGlzLmhlYWRlci50YWJJbmRleCB9KTtcbiAgfVxuICB0b2dnbGVGbGlnaHRSZWFzb25WaWV3KHZhbDogc3RyaW5nKSB7XG4gICAgdGhpcy50b2dnbGUuZmxpZ2h0UmVhc29uID0gdmFsO1xuICAgIGlmICh0aGlzLnRvZ2dsZS5mbGlnaHRSZWFzb24gPT0gXCJjaGFydFwiKVxuICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XG4gIH1cbiAgdG9nZ2xlQ0NFeGNlcHRpb25WaWV3KHZhbDogc3RyaW5nKSB7XG4gICAgdGhpcy50b2dnbGUuY2NFeGNlcHRpb24gPSB2YWw7XG4gICAgdGhpcy5vblNsaWRlTW92ZSh7IGluZGV4OiB0aGlzLmhlYWRlci50YWJJbmRleCB9KTtcbiAgfSAgIFxuICBydW5SZXBvcnQoY2hhcnRUaXRsZTogc3RyaW5nLCBtb250aE9yWWVhcjogc3RyaW5nLCBmbG93bk1vbnRoOiBzdHJpbmcpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgLy9pZiBubyBjb3Jkb3ZhLCB0aGVuIHJ1bm5pbmcgaW4gYnJvd3NlciBhbmQgbmVlZCB0byB1c2UgZGF0YVVSTCBhbmQgaWZyYW1lXG4gICAgaWYgKCF3aW5kb3cuY29yZG92YSkge1xuICAgICAgdGhhdC5pb25pY0xvYWRpbmdTaG93KCk7XG4gICAgICB0aGlzLnJlcG9ydFN2Yy5ydW5SZXBvcnREYXRhVVJMKGNoYXJ0VGl0bGUsIG1vbnRoT3JZZWFyLCBmbG93bk1vbnRoKVxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhVVJMKSB7XG4gICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgICAgLy9zZXQgdGhlIGlmcmFtZSBzb3VyY2UgdG8gdGhlIGRhdGFVUkwgY3JlYXRlZFxuICAgICAgICAgIC8vY29uc29sZS5sb2coZGF0YVVSTCk7XG4gICAgICAgICAgLy9kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGRmSW1hZ2UnKS5zcmMgPSBkYXRhVVJMO1xuXHRcdCAgd2luZG93Lm9wZW4oZGF0YVVSTCxcIl9zeXN0ZW1cIik7XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xuICAgICAgICB9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvL2lmIGNvZHJvdmEsIHRoZW4gcnVubmluZyBpbiBkZXZpY2UvZW11bGF0b3IgYW5kIGFibGUgdG8gc2F2ZSBmaWxlIGFuZCBvcGVuIHcvIEluQXBwQnJvd3NlclxuICAgIGVsc2Uge1xuICAgICAgdGhhdC5pb25pY0xvYWRpbmdTaG93KCk7XG4gICAgICB0aGlzLnJlcG9ydFN2Yy5ydW5SZXBvcnRBc3luYyhjaGFydFRpdGxlLCBtb250aE9yWWVhciwgZmxvd25Nb250aClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZmlsZVBhdGgpIHtcbiAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICAvL2xvZyB0aGUgZmlsZSBsb2NhdGlvbiBmb3IgZGVidWdnaW5nIGFuZCBvb3BlbiB3aXRoIGluYXBwYnJvd3NlclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdyZXBvcnQgcnVuIG9uIGRldmljZSB1c2luZyBGaWxlIHBsdWdpbicpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdSZXBvcnRDdHJsOiBPcGVuaW5nIFBERiBGaWxlICgnICsgZmlsZVBhdGggKyAnKScpO1xuICAgICAgICAgIHZhciBsYXN0UGFydCA9IGZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKTtcbiAgICAgICAgICB2YXIgZmlsZU5hbWUgPSBcIi9tbnQvc2RjYXJkL1wiICsgbGFzdFBhcnQ7XG4gICAgICAgICAgaWYgKGRldmljZS5wbGF0Zm9ybSAhPSBcIkFuZHJvaWRcIilcbiAgICAgICAgICAgIGZpbGVOYW1lID0gZmlsZVBhdGg7XG4gICAgICAgICAgLy93aW5kb3cub3BlblBERihmaWxlTmFtZSk7XG4gICAgICAgICAgLy9lbHNlXG4gICAgICAgICAgLy93aW5kb3cub3BlbihmaWxlUGF0aCwgJ19ibGFuaycsICdsb2NhdGlvbj1ubyxjbG9zZWJ1dHRvbmNhcHRpb249Q2xvc2UsZW5hYmxlVmlld3BvcnRTY2FsZT15ZXMnKTsqL1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICBjb3Jkb3ZhLnBsdWdpbnMuZmlsZU9wZW5lcjIub3BlbihcbiAgICAgICAgICAgIGZpbGVOYW1lLFxuICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL3BkZicsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yIHN0YXR1czogJyArIGUuc3RhdHVzICsgJyAtIEVycm9yIG1lc3NhZ2U6ICcgKyBlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZmlsZSBvcGVuZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcbiAgICAgICAgfSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBvcGVuRmxpZ2h0UHJvY2Vzc0RyaWxsUG9wb3ZlcigkZXZlbnQsIGRhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgIHRoaXMuZHJpbGxOYW1lID0gJ0ZMSUdIVCBQUk9DRVNTSU5HIFNUQVRVUyAtICcgKyBkYXRhLnBvaW50WzBdICsgJy0nICsgdGhpcy5oZWFkZXIuZmxvd25Nb250aDtcbiAgICB0aGlzLmRyaWxsVHlwZSA9ICdmbGlnaHQtcHJvY2Vzcyc7XG4gICAgdGhpcy5ncm91cHMgPSBbXTtcbiAgICB0aGlzLmRyaWxsdGFicyA9IFsnQ291bnRyeSBMZXZlbCcsICdTZWN0b3IgTGV2ZWwnLCAnRmxpZ2h0IExldmVsJywgJ0RvY3VtZW50IExldmVsJ107XG4gICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2NvdW50cnlGcm9tJywgJ2Zsb3duU2VjdG9yJywgJ2ZsaWdodE51bWJlcicsICdjYXJyaWVyQ29kZSMnXTtcbiAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgdGhhdC5kcmlsbHBvcG92ZXIuc2hvdygkZXZlbnQpO1xuICAgICAgdGhhdC5zaG93bkdyb3VwID0gMDtcbiAgICB9LCA1MCk7XG4gICAgdGhpcy5vcGVuRHJpbGxEb3duKGRhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XG4gIH07XG5cbiAgb3BlbkNvdW5wb25Db3VudERyaWxsUG9wb3ZlcigkZXZlbnQsIGRhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgIHRoaXMuZHJpbGxOYW1lID0gJ0NPVVBPTiBDT1VOVCBCWSBFWENFUFRJT04gQ0FURUdPUlkgJztcbiAgICB0aGlzLmRyaWxsVHlwZSA9ICdjb3Vwb24tY291bnQnO1xuICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgdGhpcy5kcmlsbHRhYnMgPSBbJ0NvdXBvbiBDb3VudCBGbGlnaHQgU3RhdHVzJywgJ0RvY3VtZW50IExldmVsJ107XG4gICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2ZsaWdodE51bWJlcicsICdmbG93blNlY3RvciddO1xuICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICB0aGF0LmRyaWxscG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICB0aGF0LnNob3duR3JvdXAgPSAwO1xuICAgIH0sIDUwKTtcbiAgICB0aGlzLm9wZW5EcmlsbERvd24oZGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcbiAgfTtcblxuICBvcGVuRmxpZ2h0Q291bnREcmlsbFBvcG92ZXIoJGV2ZW50LCBkYXRhLCBzZWxGaW5kTGV2ZWwpIHtcbiAgICB0aGlzLmRyaWxsTmFtZSA9ICdMSVNUIE9GIE9QRU4gRkxJR0hUUyBGT1IgJyArIGRhdGEucG9pbnRbMF0gKyAnLScgKyB0aGlzLmhlYWRlci5mbG93bk1vbnRoICsgJyBCWSBSRUFTT04gJztcbiAgICB0aGlzLmRyaWxsVHlwZSA9ICdmbGlnaHQtY291bnQnO1xuICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgdGhpcy5kcmlsbHRhYnMgPSBbJ09wZW4gRmxpZ2h0IFN0YXR1cycsICdEb2N1bWVudCBMZXZlbCddO1xuICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydmbGlnaHROdW1iZXInLCAnY2FycmllckNvZGUnXTtcbiAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgdGhhdC5kcmlsbHBvcG92ZXIuc2hvdygkZXZlbnQpO1xuICAgICAgdGhhdC5zaG93bkdyb3VwID0gMDtcbiAgICB9LCA1MCk7XG4gICAgdGhpcy5vcGVuRHJpbGxEb3duKGRhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XG4gIH07XG5cbiAgZHJpbGxEb3duUmVxdWVzdChkcmlsbFR5cGUsIHNlbEZpbmRMZXZlbCwgZGF0YSkge1xuICAgIHZhciByZXFkYXRhO1xuICAgIGlmIChkcmlsbFR5cGUgPT0gJ2ZsaWdodC1wcm9jZXNzJykge1xuICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XG4gICAgICBpZiAoZGF0YS5sYWJlbCkge1xuICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhWzBdO1xuICAgICAgfVxuXG4gICAgICB2YXIgZmxpZ2h0RGF0ZTtcbiAgICAgIC8vZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gU3RyaW5nKGRhdGEuZmxpZ2h0RGF0ZSkgOiBTdHJpbmcoZGF0YVswXSk7XG4gICAgICBmbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBkYXRhLmZsaWdodERhdGUgOiBkYXRhWzBdO1xuICAgICAgdmFyIGNvdW50cnlGcm9tVG8gPSAoZGF0YS5jb3VudHJ5RnJvbSAmJiBkYXRhLmNvdW50cnlUbykgPyBkYXRhLmNvdW50cnlGcm9tICsgJy0nICsgZGF0YS5jb3VudHJ5VG8gOiBcIlwiO1xuICAgICAgdmFyIHNlY3RvckZyb21UbyA9IChkYXRhLmZsb3duU2VjdG9yKSA/IGRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xuICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XG5cblxuXG4gICAgICByZXFkYXRhID0ge1xuICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5nZXRQcm9maWxlVXNlck5hbWUoKSxcbiAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJcIixcbiAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXG4gICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxuICAgICAgICBcImZsaWdodERhdGVcIjogZmxpZ2h0RGF0ZSxcbiAgICAgICAgXCJjb3VudHJ5RnJvbVRvXCI6IGNvdW50cnlGcm9tVG8sXG4gICAgICAgIFwic2VjdG9yRnJvbVRvXCI6IHNlY3RvckZyb21UbyxcbiAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyXG4gICAgICB9O1xuICAgIH1cblxuXG4gICAgaWYgKGRyaWxsVHlwZSA9PSAnY291cG9uLWNvdW50Jykge1xuICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XG4gICAgICBpZiAoZGF0YS5sYWJlbCkge1xuICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhWzBdO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2codGhpcy5leGNlcHRpb25DYXRlZ29yeSk7XG4gICAgICB2YXIgZmxpZ2h0RGF0ZTtcbiAgICAgIC8vZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gU3RyaW5nKGRhdGEuZmxpZ2h0RGF0ZSkgOiBTdHJpbmcoZGF0YVswXSk7XG4gICAgICBmbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBkYXRhLmZsaWdodERhdGUgOiBkYXRhWzBdO1xuICAgICAgdmFyIGV4Y2VwdGlvbkNhdGVnb3J5ID0gKHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkgJiYgZHJpbGxMZXZlbCA+IDEpID8gdGhpcy5leGNlcHRpb25DYXRlZ29yeSA6IFwiXCI7XG4gICAgICB2YXIgZmxpZ2h0U2VjdG9yID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XG4gICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcblxuXG5cbiAgICAgIHJlcWRhdGEgPSB7XG4gICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmdldFByb2ZpbGVVc2VyTmFtZSgpLFxuICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxuICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcbiAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXG4gICAgICAgIFwiZXhjZXB0aW9uQ2F0ZWdvcnlcIjogZXhjZXB0aW9uQ2F0ZWdvcnksXG4gICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcbiAgICAgICAgXCJmbGlnaHREYXRlXCI6IGZsaWdodERhdGUsXG4gICAgICAgIFwiZmxpZ2h0U2VjdG9yXCI6IGZsaWdodFNlY3RvcixcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGRyaWxsVHlwZSA9PSAnZmxpZ2h0LWNvdW50Jykge1xuICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XG4gICAgICBpZiAoZGF0YS5sYWJlbCkge1xuICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhWzBdO1xuICAgICAgfVxuICAgICAgdmFyIGZsaWdodERhdGU7XG4gICAgICAvL2ZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IFN0cmluZyhkYXRhLmZsaWdodERhdGUpIDogU3RyaW5nKGRhdGFbMF0pO1xuICAgICAgZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gZGF0YS5mbGlnaHREYXRlIDogZGF0YVswXTtcbiAgICAgIHZhciB0b2dnbGUxID0gdGhpcy50b2dnbGUub3Blbk9yQ2xvc2VkLnRvTG93ZXJDYXNlKCk7XG4gICAgICB2YXIgZmxpZ2h0U2VjdG9yID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XG4gICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcbiAgICAgIHZhciBmbGlnaHRTdGF0dXMgPSAodGhpcy5leGNlcHRpb25DYXRlZ29yeSAmJiBkcmlsbExldmVsID4gMSkgPyB0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5IDogXCJcIjtcblxuXG4gICAgICByZXFkYXRhID0ge1xuICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5nZXRQcm9maWxlVXNlck5hbWUoKSxcbiAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJcIixcbiAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXG4gICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxuICAgICAgICBcInRvZ2dsZTFcIjogdG9nZ2xlMSxcbiAgICAgICAgXCJmbGlnaHRTdGF0dXNcIjogZmxpZ2h0U3RhdHVzLFxuICAgICAgICBcImZsaWdodE51bWJlclwiOiBmbGlnaHROdW1iZXIsXG4gICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiBmbGlnaHREYXRlLFxuICAgICAgICBcImZsaWdodFNlY3RvclwiOiBmbGlnaHRTZWN0b3IsXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiByZXFkYXRhO1xuICB9XG5cbiAgZ2V0RHJpbGxEb3duVVJMKGRyaWxEb3duVHlwZSkge1xuICAgIHZhciB1cmxcbiAgICBzd2l0Y2ggKGRyaWxEb3duVHlwZSkge1xuICAgICAgY2FzZSAnZmxpZ2h0LXByb2Nlc3MnOlxuICAgICAgICB1cmwgPSBcIi9wYXhmbG5vcHIvZmxpZ2h0cHJvY2Vzc2luZ3N0YXR1c2RyaWxsXCI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnY291cG9uLWNvdW50JzpcbiAgICAgICAgdXJsID0gXCIvcGF4Zmxub3ByL2NvdXBvbmNvdW50YnlleHBkcmlsbFwiO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2ZsaWdodC1jb3VudCc6XG4gICAgICAgIHVybCA9IFwiL3BheGZsbm9wci9mbGlnaHRjb3VudGJ5cmVhc29uZHJpbGxcIjtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiB1cmw7XG4gIH1cbiAgdGFiU2xpZGVIYXNDaGFuZ2VkKGluZGV4KSB7XG4gICAgdmFyIGRhdGEgPSB0aGlzLmdyb3Vwc1swXS5jb21wbGV0ZURhdGFbMF07XG4gICAgdGhpcy5ncm91cHNbMF0uaXRlbXNbMF0gPSBkYXRhW2luZGV4XS52YWx1ZXM7XG4gICAgdGhpcy5ncm91cHNbMF0ub3JnSXRlbXNbMF0gPSBkYXRhW2luZGV4XS52YWx1ZXM7XG4gICAgdGhpcy5zb3J0KCcnLCAwLCBmYWxzZSk7XG4gICAgdGhpcy5leGNlcHRpb25DYXRlZ29yeSA9IGRhdGFbaW5kZXhdLmtleTtcbiAgfVxuXG4gIG9wZW5EcmlsbERvd24oZGF0YSwgc2VsRmluZExldmVsKSB7XG4gICAgc2VsRmluZExldmVsID0gTnVtYmVyKHNlbEZpbmRMZXZlbCk7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWxdID0gZGF0YTtcbiAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsICsgMV0gPSAnJztcblxuICAgIGlmIChzZWxGaW5kTGV2ZWwgIT0gKHRoaXMuZ3JvdXBzLmxlbmd0aCAtIDEpKSB7XG4gICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgIHZhciByZXFkYXRhID0gdGhpcy5kcmlsbERvd25SZXF1ZXN0KHRoaXMuZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpO1xuICAgICAgdmFyIFVSTCA9IHRoaXMuZ2V0RHJpbGxEb3duVVJMKHRoaXMuZHJpbGxUeXBlKTtcbiAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuICAgICAgdGhpcy5vcGVyYXRpb25hbFNlcnZpY2UuZ2V0RHJpbGxEb3duKHJlcWRhdGEsIFVSTClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgIHZhciBkYXRhID0gZGF0YS5yZXNwb25zZTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICB2YXIgZmluZExldmVsID0gZHJpbGxMZXZlbCAtIDE7XG4gICAgICAgICAgaWYgKGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJykge1xuICAgICAgICAgICAgdmFyIHJlc3BSZXN1bHQ7XG4gICAgICAgICAgICBpZiAoZGF0YS5kYXRhLnJvd3MpIHtcbiAgICAgICAgICAgICAgcmVzcFJlc3VsdCA9IGRhdGEuZGF0YS5yb3dzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzcFJlc3VsdCA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCh0aGF0LmRyaWxsVHlwZSA9PSAnY291cG9uLWNvdW50JyB8fCB0aGF0LmRyaWxsVHlwZSA9PSAnZmxpZ2h0LWNvdW50JykgJiYgZGF0YS5kYXRhLnJvd3MpIHtcbiAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5pdGVtc1swXSA9IHJlc3BSZXN1bHRbMF0udmFsdWVzO1xuICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gcmVzcFJlc3VsdFswXS52YWx1ZXM7XG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uY29tcGxldGVEYXRhWzBdID0gcmVzcFJlc3VsdDtcbiAgICAgICAgICAgICAgdGhhdC5leGNlcHRpb25DYXRlZ29yeSA9IHJlc3BSZXN1bHRbMF0ua2V5O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5pdGVtc1swXSA9IHJlc3BSZXN1bHQ7XG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0ub3JnSXRlbXNbMF0gPSByZXNwUmVzdWx0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XG4gICAgICAgICAgICB0aGF0LnNvcnQoJycsIGZpbmRMZXZlbCwgZmFsc2UpO1xuICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGRyaWxsTGV2ZWwpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XG4gICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZmluZExldmVsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgICAgdGhhdC5jbG9zZXNQb3BvdmVyKCk7XG4gICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgIGFsZXJ0KCdTZXJ2ZXIgRXJyb3InKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgY2xvc2VEcmlsbFBvcG92ZXIoKSB7XG4gICAgdGhpcy5kcmlsbHBvcG92ZXIuaGlkZSgpO1xuICB9XG5cbiAgY2xlYXJEcmlsbChsZXZlbDogbnVtYmVyKSB7XG4gICAgdmFyIGk6IG51bWJlcjtcbiAgICBmb3IgKHZhciBpID0gbGV2ZWw7IGkgPCB0aGlzLmRyaWxsdGFicy5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5ncm91cHNbaV0uaXRlbXMuc3BsaWNlKDAsIDEpO1xuICAgICAgdGhpcy5ncm91cHNbaV0ub3JnSXRlbXMuc3BsaWNlKDAsIDEpO1xuICAgICAgdGhpcy5zb3J0KCcnLCBpLCBmYWxzZSk7XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLnNlbGVjdGVkRHJpbGwpO1xuICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW2ldID0gJyc7XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLnNlbGVjdGVkRHJpbGwpO1xuICAgIH1cbiAgfVxuICBpbml0aWF0ZUFycmF5KGRyaWxsdGFicykge1xuICAgIGZvciAodmFyIGkgaW4gZHJpbGx0YWJzKSB7XG4gICAgICB0aGlzLmdyb3Vwc1tpXSA9IHtcbiAgICAgICAgaWQ6IGksXG4gICAgICAgIG5hbWU6IHRoaXMuZHJpbGx0YWJzW2ldLFxuICAgICAgICBpdGVtczogW10sXG4gICAgICAgIG9yZ0l0ZW1zOiBbXSxcbiAgICAgICAgSXRlbXNCeVBhZ2U6IFtdLFxuICAgICAgICBjb21wbGV0ZURhdGE6IFtdLFxuICAgICAgICBmaXJzdENvbHVtbnM6IHRoaXMuZmlyc3RDb2x1bW5zW2ldXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGlzRHJpbGxSb3dTZWxlY3RlZChsZXZlbCwgb2JqKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0ZWREcmlsbFtsZXZlbF0gPT0gb2JqO1xuICB9XG4gIHNlYXJjaFJlc3VsdHMobGV2ZWwsIG9iaikge1xuICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuZmlsdGVyZWRMaXN0U2VydmljZS5zZWFyY2hlZCh0aGlzLmdyb3Vwc1tsZXZlbF0ub3JnSXRlbXNbMF0sIG9iai5zZWFyY2hUZXh0LCBsZXZlbCwgdGhpcy5kcmlsbFR5cGUpO1xuICAgIGlmIChvYmouc2VhcmNoVGV4dCA9PSAnJykge1xuICAgICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XG4gICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0ub3JnSXRlbXNbMF07XG4gICAgfVxuICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcbiAgICB0aGlzLnBhZ2luYXRpb24obGV2ZWwpO1xuICB9XG4gIHBhZ2luYXRpb24obGV2ZWwpIHtcbiAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UgPSB0aGlzLmZpbHRlcmVkTGlzdFNlcnZpY2UucGFnZWQodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLnBhZ2VTaXplKTtcbiAgfTtcbiAgc2V0UGFnZShsZXZlbCwgcGFnZW5vKSB7XG4gICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSBwYWdlbm87XG4gIH07XG4gIGxhc3RQYWdlKGxldmVsKSB7XG4gICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UubGVuZ3RoIC0gMTtcbiAgfTtcbiAgcmVzZXRBbGwobGV2ZWwpIHtcbiAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IDA7XG4gIH1cbiAgc29ydChzb3J0QnksIGxldmVsLCBvcmRlcikge1xuICAgIHRoaXMucmVzZXRBbGwobGV2ZWwpO1xuICAgIHRoaXMuY29sdW1uVG9PcmRlciA9IHNvcnRCeTsgXG4gICAgLy8kRmlsdGVyIC0gU3RhbmRhcmQgU2VydmljZVxuICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuJGZpbHRlcignb3JkZXJCeScpKHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSwgdGhpcy5jb2x1bW5Ub09yZGVyLCBvcmRlcik7XG4gICAgdGhpcy5wYWdpbmF0aW9uKGxldmVsKTtcbiAgfTtcbiAgcmFuZ2UodG90YWwsIGxldmVsKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIHZhciBzdGFydDogbnVtYmVyO1xuICAgIHN0YXJ0ID0gMDtcbiAgICBpZih0b3RhbCA+IDUpIHtcbiAgICAgIHN0YXJ0ID0gTnVtYmVyKHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdKSAtIDI7XG4gICAgfVxuICAgIGlmIChzdGFydCA8IDApIHtcbiAgICAgIHN0YXJ0ID0gMDtcbiAgICB9XG4gICAgdmFyIGsgPSAxO1xuICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IHRvdGFsOyBpKyspIHtcbiAgICAgIHJldC5wdXNoKGkpO1xuICAgICAgaysrO1xuICAgICAgaWYgKGsgPiA2KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG4gIHRvZ2dsZUdyb3VwKGdyb3VwKSB7XG4gICAgaWYgKHRoaXMuaXNHcm91cFNob3duKGdyb3VwKSkge1xuICAgICAgdGhpcy5zaG93bkdyb3VwID0gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93bkdyb3VwID0gZ3JvdXA7XG4gICAgfVxuICB9XG4gIGlzR3JvdXBTaG93bihncm91cDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuc2hvd25Hcm91cCA9PSBncm91cDtcbiAgfVxuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuXG5jbGFzcyBMb2dpbkNvbnRyb2xsZXIge1xuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzY29wZScsICckc3RhdGUnLCAnVXNlclNlcnZpY2UnLCAnJGlvbmljSGlzdG9yeSddO1xuXHRwcml2YXRlIGludmFsaWRNZXNzYWdlOiBib29sZWFuID0gZmFsc2U7XG5cdHByaXZhdGUgdXNlcm5hbWU6IHN0cmluZztcblx0cHJpdmF0ZSBwYXNzd29yZDogc3RyaW5nO1xuXHRwcml2YXRlIGlwYWRkcmVzczogc3RyaW5nO1xuXHRwcml2YXRlIGVyb29ybWVzc2FnZTogc3RyaW5nO1xuXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgJHNjb3BlOiBuZy5JU2NvcGUsIHByaXZhdGUgJHN0YXRlOiBhbmd1bGFyLnVpLklTdGF0ZVNlcnZpY2UsXG5cdHByaXZhdGUgdXNlclNlcnZpY2U6IFVzZXJTZXJ2aWNlLCBwcml2YXRlICRpb25pY0hpc3Rvcnk6IGFueSkge1xuXHRcdGlmICh0aGlzLnVzZXJTZXJ2aWNlLmlzTG9nZ2VkSW4oKSkge1xuXHRcdFx0JGlvbmljSGlzdG9yeS5uZXh0Vmlld09wdGlvbnMoe1xuXHRcdFx0XHRkaXNhYmxlQmFjazogdHJ1ZVxuXHRcdFx0fSk7XG5cdFx0XHRjb25zb2xlLmxvZygnbmF2Z2F0aW5nIHRvIG1pcy1mbG93bi4uJyk7XG5cdFx0XHR0aGlzLiRzdGF0ZS5nbyh0aGlzLnVzZXJTZXJ2aWNlLmRlZmF1bHRQYWdlKTtcblx0XHR9XG5cdH1cblxuXHRjbGVhckVycm9yKCkge1xuXHRcdHRoaXMuaW52YWxpZE1lc3NhZ2UgPSBmYWxzZTtcblx0fVxuXG5cdGRvTG9naW4obG9naW5Gb3JtOiBib29sZWFuKSB7XG5cdFx0aWYgKCFsb2dpbkZvcm0pIHtcblx0XHRcdGlmICghYW5ndWxhci5pc0RlZmluZWQodGhpcy51c2VybmFtZSkgfHwgIWFuZ3VsYXIuaXNEZWZpbmVkKHRoaXMucGFzc3dvcmQpIHx8ICFhbmd1bGFyLmlzRGVmaW5lZCh0aGlzLmlwYWRkcmVzcykgfHx0aGlzLnVzZXJuYW1lLnRyaW0oKSA9PSBcIlwiIHx8IHRoaXMucGFzc3dvcmQudHJpbSgpID09IFwiXCIgfHwgdGhpcy5pcGFkZHJlc3MudHJpbSgpID09IFwiXCIpIHtcblx0XHRcdFx0dGhpcy5pbnZhbGlkTWVzc2FnZSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRTRVJWRVJfVVJMID0gJ2h0dHA6Ly8nICsgdGhpcy5pcGFkZHJlc3MgKyAnLycgKyAncmFwaWQtd3Mvc2VydmljZXMvcmVzdCc7XG5cdFx0XHR0aGlzLnVzZXJTZXJ2aWNlLmxvZ2luKHRoaXMudXNlcm5hbWUsdGhpcy5wYXNzd29yZCkudGhlbihcblx0XHRcdFx0KHJlc3VsdCkgPT4ge1xuXHRcdFx0XHRcdGlmIChyZXN1bHQucmVzcG9uc2Uuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR2YXIgcmVxID0ge1xuXHRcdFx0XHRcdFx0XHR1c2VySWQ6IHRoaXMudXNlcm5hbWVcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRoaXMudXNlclNlcnZpY2UuZ2V0VXNlclByb2ZpbGUocmVxKS50aGVuKFxuXHRcdFx0XHRcdFx0XHQocHJvZmlsZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdHZhciB1c2VyTmFtZSA9IHtcblx0XHRcdFx0XHRcdFx0XHRcdHVzZXJuYW1lOiBwcm9maWxlLnJlc3BvbnNlLmRhdGEudXNlckluZm8udXNlck5hbWVcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy51c2VyU2VydmljZS5zZXRVc2VyKHVzZXJOYW1lKTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLiRpb25pY0hpc3RvcnkubmV4dFZpZXdPcHRpb25zKHtcblx0XHRcdFx0XHRcdFx0XHRcdGRpc2FibGVCYWNrOiB0cnVlXG5cdFx0XHRcdFx0XHRcdFx0fSk7IFxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuJHN0YXRlLmdvKHRoaXMudXNlclNlcnZpY2UuZGVmYXVsdFBhZ2UpO1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHQoZXJyb3IpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCBvbiBsb2FkaW5nIHVzZXIgcHJvZmlsZScpO1xuXHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dGhpcy5pbnZhbGlkTWVzc2FnZSA9IHRydWU7XG5cdFx0XHRcdFx0XHR0aGlzLmVyb29ybWVzc2FnZSA9IFwiUGxlYXNlIGNoZWNrIHlvdXIgY3JlZGVudGlhbHNcIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRcdHRoaXMuaW52YWxpZE1lc3NhZ2UgPSB0cnVlO1xuXHRcdFx0XHRcdHRoaXMuZXJvb3JtZXNzYWdlID0gXCJQbGVhc2UgY2hlY2sgeW91ciBuZXR3b3JrIGNvbm5lY3Rpb25cIjtcblx0XHRcdFx0fSk7XG5cdFx0fSBcblx0fVxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG5cbmNsYXNzIENoYXJ0RXZlbnQgaW1wbGVtZW50cyBuZy5JRGlyZWN0aXZlIHtcblx0cmVzdHJpY3QgPSAnRSc7XG5cdHNjb3BlID0ge1xuXHRcdHR5cGU6IFwiPVwiXG5cdH07XG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSwgcHJpdmF0ZSAkcm9vdFNjb3BlOiBuZy5JUm9vdFNjb3BlU2VydmljZSkge1xuXHR9O1xuXG5cdGxpbmsgPSAoJHNjb3BlOiBuZy5JU2NvcGUsIGlFbGVtZW50OiBKUXVlcnksIGF0dHJpYnV0ZXM6IG5nLklBdHRyaWJ1dGVzLCAkc2NlOiBuZy5JU0NFU2VydmljZSk6IHZvaWQgPT4ge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR2YXIgbnZkM1xuXHRcdGlmKGF0dHJpYnV0ZXMudHlwZSA9PSAnbWV0cmljJyB8fCBhdHRyaWJ1dGVzLnR5cGUgPT0gJ3RhcmdldCcgfHwgYXR0cmlidXRlcy50eXBlID09ICdwYXNzZW5nZXItY291bnQnKXtcblx0XHRcdG52ZDMgPSBpRWxlbWVudC5maW5kKCdudmQzJylbMF07XG5cdFx0fVxuXHRcdGlmKGF0dHJpYnV0ZXMudHlwZSA9PSAnZmxpZ2h0LXByb2Nlc3MnIHx8IGF0dHJpYnV0ZXMudHlwZSA9PSAnZmxpZ2h0LWNvdW50JyB8fCBhdHRyaWJ1dGVzLnR5cGUgPT0gJ2NvdXBvbi1jb3VudCcpe1xuXHRcdFx0bnZkMyA9IGlFbGVtZW50LmZpbmQoJ252ZDMtbXVsdGktYmFyLWNoYXJ0JylbMF07XG5cdFx0fVxuXHRcdFxuXHRcdHZhciBzZWxlY3RlZEVsZW0gPSBhbmd1bGFyLmVsZW1lbnQobnZkMyk7XG5cblx0XHRcblx0XHRcdFx0XHRcblxuXHRcdHNlbGYuJHRpbWVvdXQoXG5cdFx0XHQoKSA9PiB7XG5cdFx0XHRcdHNlbGVjdGVkRWxlbS5yZWFkeShmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0dmFyIGZpcnN0OiBudW1iZXI7XG5cdFx0XHRcdFx0c2VsZWN0ZWRFbGVtLm9uKCdtb3VzZW92ZXIgdG91Y2hlbmQnLCBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRcdFx0aWYoIWZpcnN0KXtcblx0XHRcdFx0XHRcdFx0c2VsZi5hcHBlbmRDbGljayhzZWxlY3RlZEVsZW0sIGF0dHJpYnV0ZXMsIHNlbGYpO1xuXHRcdFx0XHRcdFx0XHRmaXJzdCA9IDE7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0Lypcblx0XHRcdFx0XHQkc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gc2VsZWN0ZWRFbGVtLmh0bWwoKTtcdCB9LCBmdW5jdGlvbihuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcblx0XHRcdFx0XHRcdGlmIChuZXdWYWx1ZSkge1xuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKG5ld1ZhbHVlKTtcblx0XHRcdFx0XHRcdFx0c2VsZi5hcHBlbmRDbGljayhzZWxlY3RlZEVsZW0sIGF0dHJpYnV0ZXMsIHNlbGYpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0sIHRydWUpOyovXG5cdFx0XHRcdFx0c2VsZi5hcHBlbmRDbGljayhzZWxlY3RlZEVsZW0sIGF0dHJpYnV0ZXMsIHNlbGYpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHQxMCk7XG5cdH1cblxuXHRzdGF0aWMgZmFjdG9yeSgpOiBuZy5JRGlyZWN0aXZlRmFjdG9yeSB7XG5cdFx0dmFyIGRpcmVjdGl2ZSA9ICgkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLCAkcm9vdFNjb3BlOiBuZy5JUm9vdFNjb3BlU2VydmljZSkgPT4gbmV3IENoYXJ0RXZlbnQoJHRpbWVvdXQsICRyb290U2NvcGUpXG5cdFx0ZGlyZWN0aXZlLiRpbmplY3QgPSBbJyR0aW1lb3V0JywgJyRyb290U2NvcGUnXTtcblx0XHRyZXR1cm4gZGlyZWN0aXZlO1xuXHR9XG5cblx0YXBwZW5kQ2xpY2soc2VsZWN0ZWRFbGVtLCBhdHRyaWJ1dGVzLCBzZWxmKSB7XG5cdFx0dmFyIGRibENsaWNrSW50ZXJ2YWwgPSAzMDA7XG5cdFx0dmFyIGZpcnN0Q2xpY2tUaW1lO1xuXHRcdHZhciB3YWl0aW5nU2Vjb25kQ2xpY2sgPSBmYWxzZTtcblx0XHR2YXIgY2hpbGRFbGVtOiBhbnkgPSBzZWxlY3RlZEVsZW0uZmluZCgncmVjdCcpO1xuXHRcdGFuZ3VsYXIuZm9yRWFjaChjaGlsZEVsZW0sIGZ1bmN0aW9uKGVsZW0sIGtleSkge1xuXHRcdFx0aWYgKGVsZW0udGFnTmFtZSA9PSAncmVjdCcpIHtcblx0XHRcdFx0dmFyIHJlY3RFbGVtID0gYW5ndWxhci5lbGVtZW50KGVsZW0pO1xuXHRcdFx0XHRyZWN0RWxlbS5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRcdGlmICghd2FpdGluZ1NlY29uZENsaWNrKSB7XG5cdFx0XHRcdFx0XHQvLyBTaW5nbGUgY2xsaWNrXG5cdFx0XHRcdFx0XHRmaXJzdENsaWNrVGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XG5cdFx0XHRcdFx0XHR3YWl0aW5nU2Vjb25kQ2xpY2sgPSB0cnVlO1xuXHRcdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdHdhaXRpbmdTZWNvbmRDbGljayA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyh3YWl0aW5nU2Vjb25kQ2xpY2spO1xuXHRcdFx0XHRcdFx0fSwgZGJsQ2xpY2tJbnRlcnZhbCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gRG91YmxlIGNsbGlja1xuXHRcdFx0XHRcdFx0d2FpdGluZ1NlY29uZENsaWNrID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR2YXIgdGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XG5cdFx0XHRcdFx0XHRpZiAodGltZSAtIGZpcnN0Q2xpY2tUaW1lIDwgZGJsQ2xpY2tJbnRlcnZhbCkge1xuXHRcdFx0XHRcdFx0XHR2YXIgdHlwZSA9IGF0dHJpYnV0ZXMudHlwZTtcblx0XHRcdFx0XHRcdFx0aWYoYXR0cmlidXRlcy50eXBlID09ICdtZXRyaWMnIHx8IGF0dHJpYnV0ZXMudHlwZSA9PSAndGFyZ2V0JyB8fCBhdHRyaWJ1dGVzLnR5cGUgPT0gJ3Bhc3Nlbmdlci1jb3VudCcpe1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdvcGVuRHJpbGxQb3B1cCcsIHtcImRhdGFcIiA6IHJlY3RFbGVtWzBdWydfX2RhdGFfXyddLCBcInR5cGVcIjogdHlwZSwgXCJldmVudFwiOiBldmVudH0pOyBcblx0XHRcdFx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2cocmVjdEVsZW0pO1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdvcGVuRHJpbGxQb3B1cDEnLCB7XCJkYXRhXCIgOiByZWN0RWxlbVswXVsnX19kYXRhX18nXSwgXCJ0eXBlXCI6IHR5cGUsIFwiZXZlbnRcIjogZXZlbnR9KTsgXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0fSk7IFxuXHR9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9fbGlicy50c1wiIC8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9hcHAvQXBwQ29udHJvbGxlci50c1wiIC8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9Db3Jkb3ZhU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vc2VydmljZXMvTG9jYWxTdG9yYWdlU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vc2VydmljZXMvU2Vzc2lvblNlcnZpY2UudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vc2VydmljZXMvRXJyb3JIYW5kbGVyU2VydmljZS50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbXBvbmVudHMvbWlzL3NlcnZpY2VzL01pc1NlcnZpY2UudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9DaGFydG9wdGlvblNlcnZpY2UudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9vcGVyYXRpb25hbC9zZXJ2aWNlcy9PcGVyYXRpb25hbFNlcnZpY2UudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL3VzZXIvc2VydmljZXMvVXNlclNlcnZpY2UudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9NaXNDb250cm9sbGVyLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9PcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbXBvbmVudHMvdXNlci9Mb2dpbkNvbnRyb2xsZXIudHNcIi8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9jaGFydC1ldmVudC9DaGFydEV2ZW50LnRzXCIgLz5cblxudmFyIFNFUlZFUl9VUkwgPSAnaHR0cDovLzEwLjkxLjE1Mi45OTo4MDgyL3JhcGlkLXdzL3NlcnZpY2VzL3Jlc3QnO1xuYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJywgWydpb25pYycsICdyYXBpZE1vYmlsZS5jb25maWcnLCAndGFiU2xpZGVCb3gnLCAnbnZkM0NoYXJ0RGlyZWN0aXZlcycsICdudmQzJ10pXG5cblx0LnJ1bigoJGlvbmljUGxhdGZvcm06IElvbmljLklQbGF0Zm9ybSwgJGh0dHA6IG5nLklIdHRwU2VydmljZSkgPT4ge1xuXHRcdCRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uLnRva2VuID0gJ3Rva2VuJztcbiAgXHRcdCRodHRwLmRlZmF1bHRzLmhlYWRlcnMucG9zdFtcIkNvbnRlbnQtVHlwZVwiXSA9IFwiYXBwbGljYXRpb24vanNvblwiO1xuXHRcdCRpb25pY1BsYXRmb3JtLnJlYWR5KCgpID0+IHtcblx0XHRcdGlmICh0eXBlb2YgbmF2aWdhdG9yLmdsb2JhbGl6YXRpb24gIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR9XG5cdFx0fSlcblx0fSlcbi5jb25maWcoKCRzdGF0ZVByb3ZpZGVyOiBhbmd1bGFyLnVpLklTdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXI6IGFuZ3VsYXIudWkuSVVybFJvdXRlclByb3ZpZGVyLFxuXHQkaW9uaWNDb25maWdQcm92aWRlcjogSW9uaWMuSUNvbmZpZ1Byb3ZpZGVyKSA9PiB7XG5cdCRpb25pY0NvbmZpZ1Byb3ZpZGVyLnZpZXdzLnN3aXBlQmFja0VuYWJsZWQoZmFsc2UpO1xuXG5cdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhcHAnLCB7XG5cdFx0dXJsOiAnL2FwcCcsXG5cdFx0YWJzdHJhY3Q6IHRydWUsXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3RlbXBsYXRlcy9tZW51Lmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6ICdBcHBDb250cm9sbGVyIGFzIGFwcEN0cmwnXG5cdH0pXG5cdC5zdGF0ZSgnbG9naW4nLCB7XG5cdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdHVybDogJy9sb2dpbicsXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3VzZXIvbG9naW4uaHRtbCcsXG5cdFx0Y29udHJvbGxlcjogJ0xvZ2luQ29udHJvbGxlciBhcyBMb2dpbkN0cmwnXG5cdH0pXG5cdC5zdGF0ZSgnYXBwLm1pcy1mbG93bicsIHtcblx0XHRjYWNoZTogZmFsc2UsXG5cdFx0dXJsOiAnL21pcy9mbG93bicsXG5cdFx0dmlld3M6IHtcblx0XHRcdCdtZW51Q29udGVudCc6IHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL21pcy9mbG93bi5odG1sJyxcblx0XHRcdFx0Y29udHJvbGxlcjogJ01pc0NvbnRyb2xsZXIgYXMgTWlzQ3RybCdcblx0XHRcdH1cblx0XHR9XG5cdH0pXG5cdC5zdGF0ZSgnYXBwLm9wZXJhdGlvbmFsLWZsb3duJywge1xuXHRcdGNhY2hlOiBmYWxzZSxcblx0XHR1cmw6ICcvb3BlcmF0aW9uYWwvZmxvd24nLFxuXHRcdHZpZXdzOiB7XG5cdFx0XHQnbWVudUNvbnRlbnQnOiB7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9mbG93bi5odG1sJyxcblx0XHRcdFx0Y29udHJvbGxlcjogJ09wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyIGFzIE9wckN0cmwnXG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcblxuXHQkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvbG9naW4nKTtcbn0pXG5cbi5zZXJ2aWNlKCdEYXRhUHJvdmlkZXJTZXJ2aWNlJywgRGF0YVByb3ZpZGVyU2VydmljZSlcbi5zZXJ2aWNlKCdOZXRTZXJ2aWNlJywgTmV0U2VydmljZSlcbi5zZXJ2aWNlKCdFcnJvckhhbmRsZXJTZXJ2aWNlJywgRXJyb3JIYW5kbGVyU2VydmljZSlcbi5zZXJ2aWNlKCdTZXNzaW9uU2VydmljZScsIFNlc3Npb25TZXJ2aWNlKVxuLnNlcnZpY2UoJ0NvcmRvdmFTZXJ2aWNlJywgQ29yZG92YVNlcnZpY2UpXG4uc2VydmljZSgnTG9jYWxTdG9yYWdlU2VydmljZScsIExvY2FsU3RvcmFnZVNlcnZpY2UpXG4uc2VydmljZSgnVXNlclNlcnZpY2UnLCBVc2VyU2VydmljZSlcblxuLnNlcnZpY2UoJ01pc1NlcnZpY2UnLCBNaXNTZXJ2aWNlKVxuLnNlcnZpY2UoJ09wZXJhdGlvbmFsU2VydmljZScsIE9wZXJhdGlvbmFsU2VydmljZSlcbi5zZXJ2aWNlKCdGaWx0ZXJlZExpc3RTZXJ2aWNlJywgRmlsdGVyZWRMaXN0U2VydmljZSlcbi5zZXJ2aWNlKCdDaGFydG9wdGlvblNlcnZpY2UnLCBDaGFydG9wdGlvblNlcnZpY2UpXG5cbi5jb250cm9sbGVyKCdBcHBDb250cm9sbGVyJywgQXBwQ29udHJvbGxlcilcbi5jb250cm9sbGVyKCdNaXNDb250cm9sbGVyJywgTWlzQ29udHJvbGxlcilcbi5jb250cm9sbGVyKCdPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlcicsIE9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyKVxuLmNvbnRyb2xsZXIoJ0xvZ2luQ29udHJvbGxlcicsIExvZ2luQ29udHJvbGxlcilcblxuLmRpcmVjdGl2ZSgnY2hhcnRldmVudCcsIENoYXJ0RXZlbnQuZmFjdG9yeSgpKVxuLy8gLmRpcmVjdGl2ZSgnZmV0Y2hMaXN0JywgRmV0Y2hMaXN0LmZhY3RvcnkoKSlcblxuXG5pb25pYy5QbGF0Zm9ybS5yZWFkeSgoKSA9PiB7XG5cdGlmICh3aW5kb3cuY29yZG92YSAmJiB3aW5kb3cuY29yZG92YS5wbHVnaW5zLktleWJvYXJkKSB7XG5cdH1cblx0Ly8gU3RhdHVzQmFyLm92ZXJsYXlzV2ViVmlldyhmYWxzZSk7XG4gLy8gICAgU3RhdHVzQmFyLmJhY2tncm91bmRDb2xvckJ5SGV4U3RyaW5nKCcjMjA5ZGMyJyk7XG4gLy8gICAgU3RhdHVzQmFyLnN0eWxlTGlnaHRDb250ZW50KCk7XG5cdF8uZGVmZXIoKCkgPT4ge1xuXHRcdC8vIGFuZ3VsYXIuYm9vdHN0cmFwKGRvY3VtZW50LCBbJ3JhcGlkTW9iaWxlJ10pO1xuXHR9KTtcbn0pO1xuIixudWxsLCIoZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG4gIGFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScpXG4gIC5kaXJlY3RpdmUoJ2hlUHJvZ3Jlc3NCYXInLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRpcmVjdGl2ZURlZmluaXRpb25PYmplY3QgPSB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogZmFsc2UsXG4gICAgICBzY29wZToge2RhdGE6ICc9Y2hhcnREYXRhJywgc2hvd3Rvb2x0aXA6ICdAc2hvd1Rvb2x0aXAnfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgdmFyIHggPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgICAgICAgICAgLmRvbWFpbihbMCwgZDMubWF4KHNjb3BlLmRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuICtkLnByb2dyZXNzIH0pXSlcbiAgICAgICAgICAgICAgICAgIC5yYW5nZShbMCwgOTBdKTtcblxuICAgICAgICB2YXIgc2VnbWVudCA9IGQzLnNlbGVjdChlbGVtZW50WzBdKVxuICAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbChcIi5ob3Jpem9udGFsLWJhci1ncmFwaC1zZWdtZW50XCIpXG4gICAgICAgICAgICAgICAgICAgICAuZGF0YShzY29wZS5kYXRhKVxuICAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIilcbiAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtc2VnbWVudFwiLCB0cnVlKTtcblxuICAgICAgICBzZWdtZW50LmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtbGFiZWxcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQubmFtZSB9KTtcblxuICAgICAgICB2YXIgYmFyU2VnbWVudCA9IHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZVwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZS1zY2FsZVwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZS1iYXJcIiwgdHJ1ZSk7XG5cbiAgICAgICAgYmFyU2VnbWVudFxuICAgICAgICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmNvbG9yIH0pICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoK2QucHJvZ3Jlc3MpICsgXCIlXCIgfSk7XG5cbiAgICAgICAgdmFyIGJveFNlZ21lbnQgPSBiYXJTZWdtZW50LmFwcGVuZChcInNwYW5cIikuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXZhbHVlLWJveFwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnByb2dyZXNzID8gZC5wcm9ncmVzcyA6IFwiXCIgfSk7XG4gICAgICAgIGlmKHNjb3BlLnNob3d0b29sdGlwICE9PSAndHJ1ZScpIHJldHVybjsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgdmFyIGJ0blNlZ21lbnQgPSBzZWdtZW50LmFwcGVuZChcImJ1dHRvblwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLWljb24gaWNvbiBpb24tY2hldnJvbi1kb3duIG5vLWJvcmRlciBzZWN0b3JDdXN0b21DbGFzc1wiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImhpZGVcIiwgZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoZCkgcmV0dXJuIGQuZHJpbGxGbGFnID09ICdOJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7ICAgICAgICAgICAgXG4gICAgICAgIHZhciB0b29sdGlwU2VnbWVudCA9IHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcInRvb2x0aXBcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKCdoaWRlJywgdHJ1ZSk7XG4gICAgICAgIHRvb2x0aXBTZWdtZW50LmFwcGVuZChcInBcIikudGV4dChmdW5jdGlvbihkKXsgcmV0dXJuIGQubmFtZTsgfSk7XG4gICAgICAgIHZhciB0YWJsZSA9IHRvb2x0aXBTZWdtZW50LmFwcGVuZChcInRhYmxlXCIpO1xuICAgICAgICB2YXIgdGhlYWQgPSB0YWJsZS5hcHBlbmQoJ3RyJyk7XG4gICAgICAgIHRoZWFkLmFwcGVuZCgndGgnKS50ZXh0KCdTZWN0b3InKTtcbiAgICAgICAgdGhlYWQuYXBwZW5kKCd0aCcpLnRleHQoJ1JldmVudWUnKTtcblxuICAgICAgICB2YXIgdHIgID0gdGFibGVcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZCgndGJvZHknKVxuICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKFwidHJcIilcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEoZnVuY3Rpb24oZCl7cmV0dXJuIGQuc2NBbmFseXNpc0RyaWxsc30pXG4gICAgICAgICAgICAgICAgICAgIC5lbnRlcigpLmFwcGVuZChcInRyXCIpO1xuXG4gICAgICAgIHZhciBzZWN0b3JUZCA9IHRyLmFwcGVuZChcInRkXCIpXG4gICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnNlY3RvciB9KTtcblxuICAgICAgICB2YXIgcmV2ZW51ZVRkID0gdHIuYXBwZW5kKFwidGRcIilcbiAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQucmV2ZW51ZSB9KTtcblxuICAgICAgICBidG5TZWdtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7ICAgICAgICAgICAgICBcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0b29sdGlwU2VnbWVudCk7XG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQodGhpcykucmVtb3ZlQ2xhc3MoJ3NlY3RvckN1c3RvbUNsYXNzJyk7XG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5zZWN0b3JDdXN0b21DbGFzc1wiKSkucmVtb3ZlQ2xhc3MoJ2lvbi1jaGV2cm9uLXVwJyk7XG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5zZWN0b3JDdXN0b21DbGFzc1wiKSkuYWRkQ2xhc3MoJ2lvbi1jaGV2cm9uLWRvd24nKTtcblx0XHQgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlY3RvckN1c3RvbUNsYXNzXCIpKS5uZXh0KCkucmVtb3ZlQ2xhc3MoJ3Nob3cnKTtcblx0XHQgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlY3RvckN1c3RvbUNsYXNzXCIpKS5uZXh0KCkuYWRkQ2xhc3MoJ2hpZGUnKTtcblx0XHQgIFxuICAgICAgICAgIGlmKGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkuaGFzQ2xhc3MoJ3Nob3cnKSkge1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLnJlbW92ZUNsYXNzKCdpb24tY2hldnJvbi11cCcpO1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLmFkZENsYXNzKCdpb24tY2hldnJvbi1kb3duJyk7XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLnJlbW92ZUNsYXNzKCdzaG93Jyk7ICAgICAgICAgICAgXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLmFkZENsYXNzKCdoaWRlJyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5yZW1vdmVDbGFzcygnaW9uLWNoZXZyb24tZG93bicpO1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLmFkZENsYXNzKCdpb24tY2hldnJvbi11cCcpO1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5yZW1vdmVDbGFzcygnaGlkZScpO1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5hZGRDbGFzcygnc2hvdycpO1xuICAgICAgICAgIH1cblx0XHQgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5hZGRDbGFzcygnc2VjdG9yQ3VzdG9tQ2xhc3MnKTtcblx0XHQgIFxuXHRcdCAgXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIGRpcmVjdGl2ZURlZmluaXRpb25PYmplY3Q7XG4gIH0pO1xufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG4gIGFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScpXG4gIC5kaXJlY3RpdmUoJ2hlUmV2ZW51ZVByb2dyZXNzQmFyJywgZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXZCYXJPYmplY3QgPSB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogZmFsc2UsXG4gICAgICBzY29wZToge2RhdGE6ICc9Y2hhcnREYXRhJ30sXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHNjb3BlLmRhdGEpO1xuICAgICAgICBzY29wZS4kd2F0Y2goJ2RhdGEnLCBmdW5jdGlvbihuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCduZXdWYWx1ZScsIG5ld1ZhbHVlKTtcbiAgICAgICAgICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAgICAgICAgICAgICAuZG9tYWluKFswLCBkMy5tYXgoc2NvcGUuZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZSB9KV0pXG4gICAgICAgICAgICAgICAgICAgICAgLnJhbmdlKFswLCA5MF0pO1xuXG4gICAgICAgICAgICB2YXIgc2VnbWVudCA9IGQzLnNlbGVjdChlbGVtZW50WzBdKVxuICAgICAgICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoXCIubmV0LXJldi1iYXItZ3JhcGgtc2VnbWVudFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgIC5kYXRhKHNjb3BlLmRhdGEpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC1zZWdtZW50XCIsIHRydWUpO1xuXG4gICAgICAgICAgICBzZWdtZW50LmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtbGFiZWxcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWUgfSk7XG5cbiAgICAgICAgICAgIHZhciBiYXJTZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlXCIsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC12YWx1ZS1zY2FsZVwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtdmFsdWUtYmFyXCIsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlLWJveFwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZTsgfSk7XG5cbiAgICAgICAgICAgIGJhclNlZ21lbnQgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgLnN0eWxlKFwiYmFja2dyb3VuZC1jb2xvclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmNvbG9yIH0pICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAgICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAgICAgICAgICAgICAgLnN0eWxlKFwibWluLXdpZHRoXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoZC52YWx1ZSkgKyBcIiVcIiB9KTsgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgIH0gICAgICAgICAgICAgICBcbiAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gcmV2QmFyT2JqZWN0O1xuICB9KTtcbn0pKCk7IiwiXG4oZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIC8vIGF0dGFjaCB0aGUgZmFjdG9yaWVzIGFuZCBzZXJ2aWNlIHRvIHRoZSBbc3RhcnRlci5zZXJ2aWNlc10gbW9kdWxlIGluIGFuZ3VsYXJcbiAgICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKVxuICAgICAgICAuc2VydmljZSgnUmVwb3J0QnVpbGRlclN2YycsIHJlcG9ydEJ1aWxkZXJTZXJ2aWNlKTtcbiAgICBcblx0ZnVuY3Rpb24gcmVwb3J0QnVpbGRlclNlcnZpY2UoKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIHNlbGYuZ2VuZXJhdGVSZXBvcnQgPSBfZ2VuZXJhdGVSZXBvcnQ7ICAgICAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIF9nZW5lcmF0ZVJlcG9ydChwYXJhbSwgY2hhcnRUaXRsZSxmbG93bk1vbnRoKSB7XG5cdFx0XHR2YXIgdGl0bGUgPSBcIlwiO1xuXHRcdFx0aWYocGFyYW0gPT0gXCJtZXRyaWNTbmFwc2hvdFwiKVxuXHRcdFx0XHR0aXRsZSA9IFwiTUVUUklDIFNOQVBTSE9UIC1cIitmbG93bk1vbnRoK1wiIFwiK2NoYXJ0VGl0bGUudG9VcHBlckNhc2UoKStcIi0gVklFV1wiO1xuXHRcdFx0ZWxzZSBpZihwYXJhbSA9PSBcInRhcmdldEFjdHVhbFwiKVxuXHRcdFx0XHR0aXRsZSA9IFwiVEFSR0VUIFZTIEFDVFVBTCAtIFwiKygoY2hhcnRUaXRsZSA9PSBcInJldmVudWVcIik/XCJORVQgUkVWRU5VRVwiOlwiUEFYIENvdW50XCIpK1wiIFwiK2Zsb3duTW9udGgrIFwiIC0gVklFV1wiO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aXRsZSA9IGNoYXJ0VGl0bGUrXCIgXCIrZmxvd25Nb250aCtcIiAtIFZJRVdcIjtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHR2YXIgc3ZnTm9kZSA9IGQzLnNlbGVjdEFsbChcIi5cIitwYXJhbSkuc2VsZWN0QWxsKFwic3ZnXCIpO1xuXHRcdFx0dmFyIGNvbnRlbnQgPSBbXTtcblx0XHRcdHZhciBpbWFnZUNvbHVtbiA9IFtdO1xuXHRcdFx0dmFyIHRleHRDb2x1bW4gPSBbXTtcblx0XHRcdHZhciBpbWFnZXNPYmogPSB7fTtcblx0XHRcdHZhciB0ZXh0T2JqID0ge307XG5cdFx0XHRjb250ZW50LnB1c2godGl0bGUpO1xuXHRcdFx0dmFyIG5vZGVFeGlzdHMgPSBbXTtcblx0XHRcdGFuZ3VsYXIuZm9yRWFjaChzdmdOb2RlLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XHRcdFx0XHRcblx0XHRcdFx0Ly90ZXh0T2JqWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInXHRcdFx0XHRcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBodG1sID0gXCJcIjtcblx0XHRcdFx0aWYobm9kZUV4aXN0cy5pbmRleE9mKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1mbGFnXCIpKSA9PSAtMSAmJiBzdmdOb2RlW2tleV0ubGVuZ3RoID49IDEpe1xuXHRcdFx0XHRcblx0XHRcdFx0XHRodG1sID0gc3ZnTm9kZVtrZXldWzBdLm91dGVySFRNTDtcblx0XHRcdFx0XHRpZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tcGRmRmxhZ1wiKSA9PT0gXCJkeW5hbWljV0hcIil7XG5cdFx0XHRcdFx0XHRkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKS5hdHRyKFwid2lkdGhcIiwxNTAwKTtcblx0XHRcdFx0XHRcdGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpLmF0dHIoXCJoZWlnaHRcIiw2MDApO1xuXHRcdFx0XHRcdFx0dmFyIG5vZGUgPSBkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKTtcblx0XHRcdFx0XHRcdGh0bWwgPSBub2RlWzBdWzBdLm91dGVySFRNTDtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDUwMDtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnaGVpZ2h0J10gPSA1MDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1wZGZGbGFnXCIpID09PSBcInBkZkZsYWdcIilcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ3dpZHRoJ10gPSA3NTA7XG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ2hlaWdodCddID0gMzAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjYW52Zyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyksIGh0bWwpO1xuXHRcdFx0XHRcdHZhciB0ZXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xuXHRcdFx0XHRcdHZhciBpbWdzcmMgPSB0ZXN0LnRvRGF0YVVSTCgpO1xuXHRcdFx0XHRcdHZhciAgdGV4dCA9IFwiXFxuXCIrc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLXRpdGxlXCIpK1wiXFxuXCI7XG5cdFx0XHRcdFx0dGV4dE9ialsndGV4dCddID0gdGV4dDtcblx0XHRcdFx0XHR0ZXh0Q29sdW1uLnB1c2godGV4dE9iaik7XG5cdFx0XHRcdFx0aW1hZ2VzT2JqWydpbWFnZSddID0gaW1nc3JjO1xuXHRcdFx0XHRcdGltYWdlQ29sdW1uLnB1c2goaW1hZ2VzT2JqKTtcdFx0XHRcdFxuXHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxuXHRcdFx0XHRcdHR4dFRlbXBbJ2NvbHVtbnMnXSA9IHRleHRDb2x1bW47XG5cdFx0XHRcdFx0aW1nVGVtcFsnYWxpZ25tZW50J10gPSAnY2VudGVyJztcblx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcblx0XHRcdFx0XHRjb250ZW50LnB1c2godHh0VGVtcCk7XG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKGltZ1RlbXApO1x0XHRcdFx0XHRcblx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdHRleHRDb2x1bW4gPSBbXTtcblx0XHRcdFx0XHRpbWFnZXNPYmogPSB7fTtcblx0XHRcdFx0XHR0ZXh0T2JqID0ge307XG5cdFx0XHRcdFx0aW1nVGVtcCA9IHt9O1xuXHRcdFx0XHRcdHR4dFRlbXAgPXt9O1xuXHRcdFx0XHRcdG5vZGVFeGlzdHMucHVzaChzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tZmxhZ1wiKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjb250ZW50OiBjb250ZW50LFxuXHRcdFx0XHRzdHlsZXM6IHtcblx0XHRcdFx0XHRoZWFkZXI6IHtcblx0XHRcdFx0XHRcdGZvbnRTaXplOiAxOCxcblx0XHRcdFx0XHRcdGJvbGQ6IHRydWVcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGJpZ2dlcjoge1xuXHRcdFx0XHRcdFx0Zm9udFNpemU6IDE1LFxuXHRcdFx0XHRcdFx0aXRhbGljczogdHJ1ZSxcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGRlZmF1bHRTdHlsZToge1xuXHRcdFx0XHRcdGNvbHVtbkdhcDogMjAsXG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0fTtcbiAgICB9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgLy8gYXR0YWNoIHRoZSBzZXJ2aWNlIHRvIHRoZSBbcmFwaWRNb2JpbGVdIG1vZHVsZSBpbiBhbmd1bGFyXG4gICAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcblx0IFx0LnNlcnZpY2UoJ1JlcG9ydFN2YycsIFsnJHEnLCAnJHRpbWVvdXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG9ydFN2Y10pO1xuXG5cdC8vIGdlblJlcG9ydERlZiAtLT4gZ2VuUmVwb3J0RG9jIC0tPiBidWZmZXJbXSAtLT4gQmxvYigpIC0tPiBzYXZlRmlsZSAtLT4gcmV0dXJuIGZpbGVQYXRoXG5cblx0IGZ1bmN0aW9uIHJlcG9ydFN2YygkcSwgJHRpbWVvdXQpIHtcblx0XHQgdGhpcy5ydW5SZXBvcnRBc3luYyA9IF9ydW5SZXBvcnRBc3luYztcblx0XHQgdGhpcy5ydW5SZXBvcnREYXRhVVJMID0gX3J1blJlcG9ydERhdGFVUkw7XG5cblx0XHQvLyBSVU4gQVNZTkM6IHJ1bnMgdGhlIHJlcG9ydCBhc3luYyBtb2RlIHcvIHByb2dyZXNzIHVwZGF0ZXMgYW5kIGRlbGl2ZXJzIGEgbG9jYWwgZmlsZVVybCBmb3IgdXNlXG5cblx0XHQgZnVuY3Rpb24gX3J1blJlcG9ydEFzeW5jKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkge1xuICAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cdFx0XHQgXG4gICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMS5Qcm9jZXNzaW5nIFRyYW5zY3JpcHQnKTtcbiAgICAgICAgICAgICBnZW5lcmF0ZVJlcG9ydERlZihzdGF0dXNGbGFnLHRpdGxlLGZsb3duTW9udGgpLnRoZW4oZnVuY3Rpb24oZG9jRGVmKSB7XG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzIuIEdlbmVyYXRpbmcgUmVwb3J0Jyk7XG4gICAgICAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZVJlcG9ydERvYyhkb2NEZWYpO1xuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocGRmRG9jKSB7XG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzMuIEJ1ZmZlcmluZyBSZXBvcnQnKTtcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0QnVmZmVyKHBkZkRvYyk7XG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihidWZmZXIpIHtcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnNC4gU2F2aW5nIFJlcG9ydCBGaWxlJyk7XG4gICAgICAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZVJlcG9ydEJsb2IoYnVmZmVyKTtcbiAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHBkZkJsb2IpIHtcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnNS4gT3BlbmluZyBSZXBvcnQgRmlsZScpO1xuICAgICAgICAgICAgICAgICByZXR1cm4gc2F2ZUZpbGUocGRmQmxvYixzdGF0dXNGbGFnKTtcbiAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgIC8vaGlkZUxvYWRpbmcoKTtcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShmaWxlUGF0aCk7XG4gICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgLy9oaWRlTG9hZGluZygpO1xuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcgKyBlcnJvci50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgIH1cblxuXHRcdC8vIFJVTiBEQVRBVVJMOiBydW5zIHRoZSByZXBvcnQgYXN5bmMgbW9kZSB3LyBwcm9ncmVzcyB1cGRhdGVzIGFuZCBzdG9wcyB3LyBwZGZEb2MgLT4gZGF0YVVSTCBzdHJpbmcgY29udmVyc2lvblxuXG5cdFx0IGZ1bmN0aW9uIF9ydW5SZXBvcnREYXRhVVJMKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkge1xuICAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cdFx0XHQgXG4gICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMS5Qcm9jZXNzaW5nIFRyYW5zY3JpcHQnKTtcbiAgICAgICAgICAgICBnZW5lcmF0ZVJlcG9ydERlZihzdGF0dXNGbGFnLHRpdGxlLGZsb3duTW9udGgpLnRoZW4oZnVuY3Rpb24oZG9jRGVmKSB7XG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzIuIEdlbmVyYXRpbmcgUmVwb3J0Jyk7XG4gICAgICAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZVJlcG9ydERvYyhkb2NEZWYpO1xuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocGRmRG9jKSB7XG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzMuIENvbnZlcnQgdG8gRGF0YVVSTCcpO1xuICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0RGF0YVVSTChwZGZEb2MpO1xuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ob3V0RG9jKSB7XG4gICAgICAgICAgICAgICAgIC8vaGlkZUxvYWRpbmcoKTtcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShvdXREb2MpO1xuICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgIC8vaGlkZUxvYWRpbmcoKTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgZXJyb3IudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICB9XG5cblx0XHQvLyAxLkdlbmVyYXRlUmVwb3J0RGVmOiB1c2UgY3VycmVudFRyYW5zY3JpcHQgdG8gY3JhZnQgcmVwb3J0RGVmIEpTT04gZm9yIHBkZk1ha2UgdG8gZ2VuZXJhdGUgcmVwb3J0XG5cblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydERlZihzdGF0dXNGbGFnLHRpdGxlLGZsb3duTW9udGgpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cdFx0XHRcbiAgICAgICAgICAgIC8vIHJlbW92ZWQgc3BlY2lmaWNzIG9mIGNvZGUgdG8gcHJvY2VzcyBkYXRhIGZvciBkcmFmdGluZyB0aGUgZG9jXG4gICAgICAgICAgICAvLyBsYXlvdXQgYmFzZWQgb24gcGxheWVyLCB0cmFuc2NyaXB0LCBjb3Vyc2VzLCBldGMuXG4gICAgICAgICAgICAvLyBjdXJyZW50bHkgbW9ja2luZyB0aGlzIGFuZCByZXR1cm5pbmcgYSBwcmUtYnVpbHQgSlNPTiBkb2MgZGVmaW5pdGlvblxuICAgICAgICAgICAgXG5cdFx0XHQvL3VzZSBycHQgc2VydmljZSB0byBnZW5lcmF0ZSB0aGUgSlNPTiBkYXRhIG1vZGVsIGZvciBwcm9jZXNzaW5nIFBERlxuICAgICAgICAgICAgLy8gaGFkIHRvIHVzZSB0aGUgJHRpbWVvdXQgdG8gcHV0IGEgc2hvcnQgZGVsYXkgdGhhdCB3YXMgbmVlZGVkIHRvIFxuICAgICAgICAgICAgLy8gcHJvcGVybHkgZ2VuZXJhdGUgdGhlIGRvYyBkZWNsYXJhdGlvblxuICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRkID0ge307XG4gICAgICAgICAgICAgICAgZGQgPSBnZW5lcmF0ZVJlcG9ydChzdGF0dXNGbGFnLHRpdGxlLGZsb3duTW9udGgpXG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoZGQpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdFx0fVxuXG5cdFx0Ly8gMi5HZW5lcmF0ZVJwdEZpbGVEb2M6IHRha2UgSlNPTiBmcm9tIHJwdFN2YywgY3JlYXRlIHBkZm1lbW9yeSBidWZmZXIsIGFuZCBzYXZlIGFzIGEgbG9jYWwgZmlsZVxuXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnREb2MoZG9jRGVmaW5pdGlvbikge1xuXHRcdFx0Ly91c2UgdGhlIHBkZm1ha2UgbGliIHRvIGNyZWF0ZSBhIHBkZiBmcm9tIHRoZSBKU09OIGNyZWF0ZWQgaW4gdGhlIGxhc3Qgc3RlcFxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblx0XHRcdHRyeSB7XG4gICAgICAgICAgICAgICAgLy91c2UgdGhlIHBkZk1ha2UgbGlicmFyeSB0byBjcmVhdGUgaW4gbWVtb3J5IHBkZiBmcm9tIHRoZSBKU09OXG5cdFx0XHRcdHZhciBwZGZEb2MgPSBwZGZNYWtlLmNyZWF0ZVBkZiggZG9jRGVmaW5pdGlvbiApO1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocGRmRG9jKTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdFx0fVxuXG5cdFx0Ly8gMy5HZW5lcmF0ZVJwdEJ1ZmZlcjogcGRmS2l0IG9iamVjdCBwZGZEb2MgLS0+IGJ1ZmZlciBhcnJheSBvZiBwZGZEb2NcblxuXHRcdGZ1bmN0aW9uIGdlbmVyYXRlUmVwb3J0QnVmZmVyKHBkZkRvYykge1xuXHRcdFx0Ly91c2UgdGhlIHBkZm1ha2UgbGliIHRvIGdldCBhIGJ1ZmZlciBhcnJheSBvZiB0aGUgcGRmRG9jIG9iamVjdFxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblx0XHRcdHRyeSB7XG4gICAgICAgICAgICAgICAgLy9nZXQgdGhlIGJ1ZmZlciBmcm9tIHRoZSBwZGZEb2Ncblx0XHRcdFx0cGRmRG9jLmdldEJ1ZmZlcihmdW5jdGlvbihidWZmZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ICAgZGVmZXJyZWQucmVzb2x2ZShidWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdFx0fVxuXG5cdFx0Ly8gM2IuZ2V0RGF0YVVSTDogcGRmS2l0IG9iamVjdCBwZGZEb2MgLS0+IGVuY29kZWQgZGF0YVVybFxuXG5cdFx0IGZ1bmN0aW9uIGdldERhdGFVUkwocGRmRG9jKSB7XG5cdFx0XHQvL3VzZSB0aGUgcGRmbWFrZSBsaWIgdG8gY3JlYXRlIGEgcGRmIGZyb20gdGhlIEpTT04gY3JlYXRlZCBpbiB0aGUgbGFzdCBzdGVwXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXHRcdFx0dHJ5IHtcbiAgICAgICAgICAgICAgICAvL3VzZSB0aGUgcGRmTWFrZSBsaWJyYXJ5IHRvIGNyZWF0ZSBpbiBtZW1vcnkgcGRmIGZyb20gdGhlIEpTT05cblx0XHRcdFx0cGRmRG9jLmdldERhdGFVcmwoZnVuY3Rpb24ob3V0RG9jKSB7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShvdXREb2MpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdFx0IH1cblxuXHRcdC8vIDQuR2VuZXJhdGVSZXBvcnRCbG9iOiBidWZmZXIgLS0+IG5ldyBCbG9iIG9iamVjdFxuXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnRCbG9iKGJ1ZmZlcikge1xuXHRcdFx0Ly91c2UgdGhlIGdsb2JhbCBCbG9iIG9iamVjdCBmcm9tIHBkZm1ha2UgbGliIHRvIGNyZWF0IGEgYmxvYiBmb3IgZmlsZSBwcm9jZXNzaW5nXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXHRcdFx0dHJ5IHtcbiAgICAgICAgICAgICAgICAvL3Byb2Nlc3MgdGhlIGlucHV0IGJ1ZmZlciBhcyBhbiBhcHBsaWNhdGlvbi9wZGYgQmxvYiBvYmplY3QgZm9yIGZpbGUgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgICAgIHZhciBwZGZCbG9iID0gbmV3IEJsb2IoW2J1ZmZlcl0sIHt0eXBlOiAnYXBwbGljYXRpb24vcGRmJ30pO1xuICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHBkZkJsb2IpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHRcdH1cblxuXHRcdC8vIDUuU2F2ZUZpbGU6IHVzZSB0aGUgRmlsZSBwbHVnaW4gdG8gc2F2ZSB0aGUgcGRmQmxvYiBhbmQgcmV0dXJuIGEgZmlsZVBhdGggdG8gdGhlIGNsaWVudFxuXG5cdFx0ZnVuY3Rpb24gc2F2ZUZpbGUocGRmQmxvYix0aXRsZSkge1xuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblx0XHRcdHZhciBmaWxlTmFtZSA9IHVuaXF1ZUZpbGVOYW1lKHRpdGxlKStcIi5wZGZcIjtcblx0XHRcdHZhciBmaWxlUGF0aCA9IFwiXCI7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnU2F2ZUZpbGU6IHJlcXVlc3RGaWxlU3lzdGVtJyk7XG5cdFx0XHRcdHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbShMb2NhbEZpbGVTeXN0ZW0uUEVSU0lTVEVOVCwgMCwgZ290RlMsIGZhaWwpO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcignU2F2ZUZpbGVfRXJyOiAnICsgZS5tZXNzYWdlKTtcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xuXHRcdFx0XHR0aHJvdyh7Y29kZTotMTQwMSxtZXNzYWdlOid1bmFibGUgdG8gc2F2ZSByZXBvcnQgZmlsZSd9KTtcblx0XHRcdH1cdFx0XHRcblxuXHRcdFx0ZnVuY3Rpb24gZ290RlMoZmlsZVN5c3RlbSkge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdTYXZlRmlsZTogZ290RlMgLS0+IGdldEZpbGUnKTtcblx0XHRcdFx0ZmlsZVN5c3RlbS5yb290LmdldEZpbGUoZmlsZU5hbWUsIHtjcmVhdGU6IHRydWUsIGV4Y2x1c2l2ZTogZmFsc2V9LCBnb3RGaWxlRW50cnksIGZhaWwpO1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBnb3RGaWxlRW50cnkoZmlsZUVudHJ5KSB7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ1NhdmVGaWxlOiBnb3RGaWxlRW50cnkgLS0+IChmaWxlUGF0aCkgLS0+IGNyZWF0ZVdyaXRlcicpO1xuXHRcdFx0XHRmaWxlUGF0aCA9IGZpbGVFbnRyeS50b1VSTCgpO1xuXHRcdFx0XHRmaWxlRW50cnkuY3JlYXRlV3JpdGVyKGdvdEZpbGVXcml0ZXIsIGZhaWwpO1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBnb3RGaWxlV3JpdGVyKHdyaXRlcikge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdTYXZlRmlsZTogZ290RmlsZVdyaXRlciAtLT4gd3JpdGUgLS0+IG9uV3JpdGVFbmQocmVzb2x2ZSknKTtcblx0XHRcdFx0d3JpdGVyLm9ud3JpdGVlbmQgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0d3JpdGVyLm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZXIgZXJyb3I6ICcgKyBlLnRvU3RyaW5nKCkpO1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0d3JpdGVyLndyaXRlKHBkZkJsb2IpO1xuXHRcdFx0fVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBmYWlsKGVycm9yKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGVycm9yLmNvZGUpO1xuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZXJyb3IpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcblx0XHR9XG5cdFx0ZnVuY3Rpb24gdW5pcXVlRmlsZU5hbWUoZmlsZU5hbWUpe1xuXHRcdFx0dmFyIG5vdyA9IG5ldyBEYXRlKCk7XG5cdFx0XHR2YXIgdGltZXN0YW1wID0gbm93LmdldEZ1bGxZZWFyKCkudG9TdHJpbmcoKTtcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldE1vbnRoKCkgPCA5ID8gJzAnIDogJycpICsgbm93LmdldE1vbnRoKCkudG9TdHJpbmcoKTsgXG5cdFx0XHR0aW1lc3RhbXAgKz0gKG5vdy5nZXREYXRlKCkgPCAxMCA/ICcwJyA6ICcnKSArIG5vdy5nZXREYXRlKCkudG9TdHJpbmcoKTsgXG5cdFx0XHR0aW1lc3RhbXAgKz0gKG5vdy5nZXRIb3VycygpIDwgMTAgPyAnMCcgOiAnJykgKyBub3cuZ2V0SG91cnMoKS50b1N0cmluZygpOyBcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldE1pbnV0ZXMoKSA8IDEwID8gJzAnIDogJycpICsgbm93LmdldE1pbnV0ZXMoKS50b1N0cmluZygpOyBcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldFNlY29uZHMoKSA8IDEwID8gJzAnIDogJycpICsgbm93LmdldFNlY29uZHMoKS50b1N0cmluZygpO1xuXHRcdFx0cmV0dXJuIGZpbGVOYW1lLnRvVXBwZXJDYXNlKCkrXCJfXCIrdGltZXN0YW1wO1xuXHRcdFxuXHRcdH1cblx0XHRcblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydChwYXJhbSwgY2hhcnRUaXRsZSxmbG93bk1vbnRoKSB7XG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXHRcdFx0XG5cdFx0XHR2YXIgdGl0bGUgPSBcIlwiO1xuXHRcdFx0aWYocGFyYW0gPT0gXCJtZXRyaWNTbmFwc2hvdFwiKVxuXHRcdFx0XHR0aXRsZSA9IFwiTUVUUklDIFNOQVBTSE9UIC1cIitmbG93bk1vbnRoK1wiIFwiK2NoYXJ0VGl0bGUudG9VcHBlckNhc2UoKStcIi0gVklFV1wiO1xuXHRcdFx0ZWxzZSBpZihwYXJhbSA9PSBcInRhcmdldEFjdHVhbFwiKVxuXHRcdFx0XHR0aXRsZSA9IFwiVEFSR0VUIFZTIEFDVFVBTCAtIFwiKygoY2hhcnRUaXRsZSA9PSBcInJldmVudWVcIik/XCJORVQgUkVWRU5VRVwiOlwiUEFYIENvdW50XCIpK1wiIFwiK2Zsb3duTW9udGgrIFwiIC0gVklFV1wiO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aXRsZSA9IGNoYXJ0VGl0bGUrXCIgXCIrZmxvd25Nb250aCtcIiAtIFZJRVdcIjtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHR2YXIgc3ZnTm9kZSA9IGQzLnNlbGVjdEFsbChcIi5cIitwYXJhbSkuc2VsZWN0QWxsKFwic3ZnXCIpO1xuXHRcdFx0dmFyIGNvbnRlbnQgPSBbXTtcblx0XHRcdHZhciBpbWFnZUNvbHVtbiA9IFtdO1xuXHRcdFx0dmFyIHRleHRDb2x1bW4gPSBbXTtcblx0XHRcdHZhciBpbWFnZXNPYmogPSB7fTtcblx0XHRcdHZhciB0ZXh0T2JqID0ge307XG5cdFx0XHRjb250ZW50LnB1c2godGl0bGUpO1xuXHRcdFx0dmFyIG5vZGVFeGlzdHMgPSBbXTtcblx0XHRcdGFuZ3VsYXIuZm9yRWFjaChzdmdOb2RlLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XHRcdFx0XHRcblx0XHRcdFx0dmFyIGh0bWwgPSBcIlwiO1xuXHRcdFx0XHRpZihub2RlRXhpc3RzLmluZGV4T2Yoc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLWZsYWdcIikpID09IC0xICYmIHN2Z05vZGVba2V5XS5sZW5ndGggPj0gMSl7XG5cdFx0XHRcdFx0aHRtbCA9IHN2Z05vZGVba2V5XVswXS5vdXRlckhUTUw7XG5cdFx0XHRcdFx0aWYoc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLXBkZkZsYWdcIikgPT09IFwiZHluYW1pY1dIXCIpe1xuXHRcdFx0XHRcdFx0ZDMuc2VsZWN0KFwiLlwiK3BhcmFtK1wiRmxhZ1wiKS5zZWxlY3QoXCJzdmdcIikuYXR0cihcIndpZHRoXCIsMTUwMCk7XG5cdFx0XHRcdFx0XHRkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKS5hdHRyKFwiaGVpZ2h0XCIsNjAwKTtcblx0XHRcdFx0XHRcdHZhciBub2RlID0gZDMuc2VsZWN0KFwiLlwiK3BhcmFtK1wiRmxhZ1wiKS5zZWxlY3QoXCJzdmdcIik7XG5cdFx0XHRcdFx0XHRodG1sID0gbm9kZVswXVswXS5vdXRlckhUTUw7XG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ3dpZHRoJ10gPSA1MDA7XG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ2hlaWdodCddID0gNTAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tcGRmRmxhZ1wiKSA9PT0gXCJwZGZGbGFnXCIpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWyd3aWR0aCddID0gNzUwO1xuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWydoZWlnaHQnXSA9IDMwMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y2FudmcoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpLCBodG1sKTtcblx0XHRcdFx0XHR2YXIgY2FudmFzRWxtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xuXHRcdFx0XHRcdHZhciBpbWdzcmMgPSBjYW52YXNFbG0udG9EYXRhVVJMKCk7XG5cdFx0XHRcdFx0dmFyICB0ZXh0ID0gXCJcXG5cIitzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tdGl0bGVcIikrXCJcXG5cIjtcblx0XHRcdFx0XHR0ZXh0T2JqWyd0ZXh0J10gPSB0ZXh0O1xuXHRcdFx0XHRcdHRleHRDb2x1bW4ucHVzaCh0ZXh0T2JqKTtcblx0XHRcdFx0XHRpbWFnZXNPYmpbJ2ltYWdlJ10gPSBpbWdzcmM7XG5cdFx0XHRcdFx0aW1hZ2VDb2x1bW4ucHVzaChpbWFnZXNPYmopO1x0XHRcdFx0XG5cdFx0XHRcdFx0dmFyIGltZ1RlbXAgPXt9LCB0eHRUZW1wID17fTtcdFx0XG5cdFx0XHRcdFx0dHh0VGVtcFsnY29sdW1ucyddID0gdGV4dENvbHVtbjtcblx0XHRcdFx0XHRpbWdUZW1wWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInO1xuXHRcdFx0XHRcdGltZ1RlbXBbJ2NvbHVtbnMnXSA9IGltYWdlQ29sdW1uO1xuXHRcdFx0XHRcdGNvbnRlbnQucHVzaCh0eHRUZW1wKTtcblx0XHRcdFx0XHRjb250ZW50LnB1c2goaW1nVGVtcCk7XHRcdFx0XHRcdFxuXHRcdFx0XHRcdGltYWdlQ29sdW1uID0gW107XG5cdFx0XHRcdFx0dGV4dENvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdGltYWdlc09iaiA9IHt9O1xuXHRcdFx0XHRcdHRleHRPYmogPSB7fTtcblx0XHRcdFx0XHRpbWdUZW1wID0ge307XG5cdFx0XHRcdFx0dHh0VGVtcCA9e307XG5cdFx0XHRcdFx0bm9kZUV4aXN0cy5wdXNoKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1mbGFnXCIpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XHRcdFx0XG5cdFx0XHRpZihwYXJhbSA9PSBcInJldmVudWVBbmFseXNpc1wiKXtcblx0XHRcdFx0dmFyIG5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5ldC1yZXZlbnVlLWNoYXJ0XCIpO1xuXHRcdFx0XHR2YXIgcGRmUmVuZGVyID0gYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwZGYtcmVuZGVyJykpO1xuXHRcdFx0XHRwZGZSZW5kZXIuYXBwZW5kKG5vZGUuY2hpbGROb2Rlc1sxXSk7ICBcblx0XHRcdFx0aHRtbDJjYW52YXMoZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbmV0LXJldmVudWUtcGRmJykpLnRoZW4oZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0XHRcdFx0dmFyIGMgPSBjYW52YXMudG9EYXRhVVJMKCk7XG5cdFx0XHRcdFx0dmFyICB0ZXh0ID0gXCJcXG5cXG5cXG5cXG5cXG5cXG5cXG5cXG5cXG5cXG5cXG5cXG5cIitub2RlLmdldEF0dHJpYnV0ZSgnZGF0YS1pdGVtLXRpdGxlJykrXCJcXG5cXG5cIjtcblx0XHRcdFx0XHR0ZXh0T2JqWyd0ZXh0J10gPSB0ZXh0O1xuXHRcdFx0XHRcdHRleHRDb2x1bW4ucHVzaCh0ZXh0T2JqKTtcblx0XHRcdFx0XHRpbWFnZXNPYmpbJ2ltYWdlJ10gPSBjO1xuXHRcdFx0XHRcdGltYWdlQ29sdW1uLnB1c2goaW1hZ2VzT2JqKTtcdFx0XHRcdFxuXHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxuXHRcdFx0XHRcdHR4dFRlbXBbJ2NvbHVtbnMnXSA9IHRleHRDb2x1bW47XG5cdFx0XHRcdFx0aW1nVGVtcFsnYWxpZ25tZW50J10gPSAnY2VudGVyJztcblx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcblx0XHRcdFx0XHRjb250ZW50LnB1c2godHh0VGVtcCk7XG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKGltZ1RlbXApO1x0XHRcdFx0XHRcblx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdHRleHRDb2x1bW4gPSBbXTtcblx0XHRcdFx0XHRpbWFnZXNPYmogPSB7fTtcblx0XHRcdFx0XHR0ZXh0T2JqID0ge307XG5cdFx0XHRcdFx0aW1nVGVtcCA9IHt9O1xuXHRcdFx0XHRcdHR4dFRlbXAgPXt9O1x0XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7Y29udGVudDogY29udGVudH0pO1xuXHRcdFx0XHRcdHBkZlJlbmRlci5lbXB0eSgpO1xuXHRcdFx0XHR9KTtcdFx0XHRcdFxuXHRcdFx0fSBlbHNlIGlmKHBhcmFtID09IFwic2VjdG9yY2FycmllcmFuYWx5c2lzXCIpe1xuXHRcdFx0XHR2YXIgc3ZnTm9kZSA9IGQzLnNlbGVjdEFsbChcIi5cIitwYXJhbSk7XG5cdFx0XHRcdGFuZ3VsYXIuZm9yRWFjaChzdmdOb2RlWzBdLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG5cdFx0XHRcdFx0dmFyIG5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2VjdG9yLWNhcnJpZXItY2hhcnQnK2tleSk7XG5cdFx0XHRcdFx0dmFyIGVsZUlEID0gJ3NlY3Rvci1jYXJyaWVyLWNoYXJ0JytrZXk7XG5cdFx0XHRcdFx0aHRtbDJjYW52YXMoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlSUQpKS50aGVuKGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdFx0XHRcdFx0dmFyIGMgPSBjYW52YXMudG9EYXRhVVJMKCk7XG5cdFx0XHRcdFx0XHR2YXIgIHRleHQgPSBcIlxcblxcblwiK25vZGUuZ2V0QXR0cmlidXRlKCdkYXRhLWl0ZW0tdGl0bGUnKStcIlxcblxcblwiO1xuXHRcdFx0XHRcdFx0dGV4dE9ialsndGV4dCddID0gdGV4dDtcblx0XHRcdFx0XHRcdHRleHRDb2x1bW4ucHVzaCh0ZXh0T2JqKTtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDUwMDtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnaW1hZ2UnXSA9IGM7XG5cdFx0XHRcdFx0XHRpbWFnZUNvbHVtbi5wdXNoKGltYWdlc09iaik7XHRcdFx0XHRcblx0XHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxuXHRcdFx0XHRcdFx0dHh0VGVtcFsnY29sdW1ucyddID0gdGV4dENvbHVtbjtcblx0XHRcdFx0XHRcdGltZ1RlbXBbJ2FsaWdubWVudCddID0gJ2NlbnRlcic7XG5cdFx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcblx0XHRcdFx0XHRcdGNvbnRlbnQucHVzaCh0eHRUZW1wKTtcblx0XHRcdFx0XHRcdGNvbnRlbnQucHVzaChpbWdUZW1wKTtcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdFx0dGV4dENvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqID0ge307XG5cdFx0XHRcdFx0XHR0ZXh0T2JqID0ge307XG5cdFx0XHRcdFx0XHRpbWdUZW1wID0ge307XG5cdFx0XHRcdFx0XHR0eHRUZW1wID17fTtcdFxuXHRcdFx0XHRcdFx0aWYoa2V5ID09IHN2Z05vZGVbMF0ubGVuZ3RoLTEpe1xuXHRcdFx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHtjb250ZW50OiBjb250ZW50fSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XHRcdFx0XHRcdFxuXHRcdFx0XHR9KTtcdFx0XG5cdFx0XHR9ZWxzZSBpZihwYXJhbSA9PSBcInJvdXRlcmV2ZW51ZVwiKXtcdFx0XHRcdFxuXHRcdFx0XHR2YXIgZWxlSUQgPSAncm91dGUtcmV2ZW51ZS1wZGYnO1x0XHRcdFx0XHRcblx0XHRcdFx0aHRtbDJjYW52YXMoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlSUQpKS50aGVuKGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdFx0XHRcdHZhciBjID0gY2FudmFzLnRvRGF0YVVSTCgpO1xuXHRcdFx0XHRcdHZhciAgdGV4dCA9IFwiXCI7XG5cdFx0XHRcdFx0dGV4dE9ialsndGV4dCddID0gdGV4dDtcblx0XHRcdFx0XHR0ZXh0Q29sdW1uLnB1c2godGV4dE9iaik7XG5cdFx0XHRcdFx0aW1hZ2VzT2JqWyd3aWR0aCddID0gNTAwO1xuXHRcdFx0XHRcdGltYWdlc09ialsnaW1hZ2UnXSA9IGM7XG5cdFx0XHRcdFx0aW1hZ2VDb2x1bW4ucHVzaChpbWFnZXNPYmopO1x0XHRcdFx0XG5cdFx0XHRcdFx0dmFyIGltZ1RlbXAgPXt9LCB0eHRUZW1wID17fTtcdFx0XG5cdFx0XHRcdFx0dHh0VGVtcFsnY29sdW1ucyddID0gdGV4dENvbHVtbjtcblx0XHRcdFx0XHRpbWdUZW1wWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInO1xuXHRcdFx0XHRcdGltZ1RlbXBbJ2NvbHVtbnMnXSA9IGltYWdlQ29sdW1uO1xuXHRcdFx0XHRcdGNvbnRlbnQucHVzaCh0eHRUZW1wKTtcblx0XHRcdFx0XHRjb250ZW50LnB1c2goaW1nVGVtcCk7XHRcdFx0XHRcdFxuXHRcdFx0XHRcdGltYWdlQ29sdW1uID0gW107XG5cdFx0XHRcdFx0dGV4dENvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdGltYWdlc09iaiA9IHt9O1xuXHRcdFx0XHRcdHRleHRPYmogPSB7fTtcblx0XHRcdFx0XHRpbWdUZW1wID0ge307XG5cdFx0XHRcdFx0dHh0VGVtcCA9e307XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7Y29udGVudDogY29udGVudH0pO1xuXHRcdFx0XHR9KTtcdFxuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoe2NvbnRlbnQ6IGNvbnRlbnR9KTtcblx0XHRcdH1cblx0XHRcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHRcdH07XG5cdFx0XG5cdCB9XG4gICAgXG59KSgpOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
