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
            _this.onSlideMove({ index: _this.header.tabIndex });
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
        this.popupStatus = false;
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
        this.popupStatus = false;
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
            if (data.response.status === "success") {
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
                if (!that.popupStatus) {
                    that.popupStatus = true;
                    that.$ionicPopup.alert({
                        title: 'Error',
                        content: 'No Data Found!!!'
                    }).then(function (res) {
                        console.log('done');
                    });
                }
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
            if (data.response.status === "success") {
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
                if (!that.popupStatus) {
                    that.popupStatus = true;
                    that.$ionicPopup.alert({
                        title: 'Error',
                        content: 'No Data Found!!!'
                    }).then(function (res) {
                        console.log('done');
                    });
                }
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
            if (data.response.status === "success") {
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
                if (!that.popupStatus) {
                    that.popupStatus = true;
                    that.$ionicPopup.alert({
                        title: 'Error',
                        content: 'No Data Found!!!'
                    }).then(function (res) {
                        console.log('done');
                    });
                }
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
            if (param == "revenueAnalysis") {
                var node = document.getElementById('net-revenue-chart');
                domtoimage.toPng(node).then(function (dataUrl) {
                    var text = "\n\n\n\n\n" + node.getAttribute('data-item-title') + "\n\n";
                    textObj['text'] = text;
                    textColumn.push(textObj);
                    imagesObj['image'] = dataUrl;
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
                    domtoimage.toPng(node).then(function (dataUrl) {
                        //var  text = "\n"+node.getAttribute('data-item-title')+"\n\n";
                        textObj['text'] = "\n\n";
                        textColumn.push(textObj);
                        imagesObj['width'] = 500;
                        imagesObj['image'] = dataUrl;
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
                        if (key == svgNode[0].length - 1)
                            deferred.resolve({ content: content });
                    });
                });
            }
            else if (param == "routerevenue") {
                var svgNode = d3.selectAll("." + param);
                angular.forEach(svgNode[0], function (value, key) {
                    var node = document.getElementById('route-revenue-chart' + key);
                    domtoimage.toPng(node).then(function (dataUrl) {
                        //var  text = "\n"+node.getAttribute('data-item-title')+"\n\n";
                        textObj['text'] = "\n\n";
                        textColumn.push(textObj);
                        imagesObj['width'] = 500;
                        imagesObj['image'] = dataUrl;
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
                        if (key == svgNode[0].length - 1)
                            deferred.resolve({ content: content });
                    });
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9saWJzLnRzIiwiY29tbW9uL3V0aWxzL1V0aWxzLnRzIiwiY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvQ29yZG92YVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvTmV0U2VydmljZS50cyIsImNvbW1vbi9zZXJ2aWNlcy9FcnJvckhhbmRsZXJTZXJ2aWNlLnRzIiwiY29tbW9uL3NlcnZpY2VzL0lTZXNzaW9uSHR0cFByb21pc2UuanMiLCJjb21tb24vc2VydmljZXMvU2Vzc2lvblNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1Jlc3BvbnNlLmpzIiwiY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHMiLCJjb21tb24vYXBwL0FwcENvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvc2VydmljZXMvT3BlcmF0aW9uYWxTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvTWlzQ29udHJvbGxlci50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL3VzZXIvTG9naW5Db250cm9sbGVyLnRzIiwiY29tbW9uL2NoYXJ0LWV2ZW50L0NoYXJ0RXZlbnQudHMiLCJhcHAudHMiLCJjb21wb25lbnRzL21pcy9wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvcmV2ZW51ZS1wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tbW9uL3NlcnZpY2VzL0dlbmVyaWNSZXF1ZXN0LmpzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvcmVwb3J0QnVpbGRlclN2Yy50cyIsImNvbXBvbmVudHMvbWlzL3NlcnZpY2VzL3JlcG9ydFNlcnZpY2UudHMiXSwibmFtZXMiOlsiVXRpbHMiLCJVdGlscy5jb25zdHJ1Y3RvciIsIlV0aWxzLmlzTm90RW1wdHkiLCJVdGlscy5pc0xhbmRzY2FwZSIsIlV0aWxzLmdldFRvZGF5RGF0ZSIsIlV0aWxzLmlzSW50ZWdlciIsIkxvY2FsU3RvcmFnZVNlcnZpY2UiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTG9jYWxTdG9yYWdlU2VydmljZS5zZXQiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldCIsIkxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0T2JqZWN0IiwiTG9jYWxTdG9yYWdlU2VydmljZS5nZXRPYmplY3QiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmlzUmVjZW50RW50cnlBdmFpbGFibGUiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmFkZFJlY2VudEVudHJ5IiwiQ29yZG92YVNlcnZpY2UiLCJDb3Jkb3ZhU2VydmljZS5jb25zdHJ1Y3RvciIsIkNvcmRvdmFTZXJ2aWNlLmV4ZWMiLCJDb3Jkb3ZhU2VydmljZS5leGVjdXRlUGVuZGluZyIsIk5ldFNlcnZpY2UiLCJOZXRTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTmV0U2VydmljZS5nZXREYXRhIiwiTmV0U2VydmljZS5wb3N0RGF0YSIsIk5ldFNlcnZpY2UuZGVsZXRlRGF0YSIsIk5ldFNlcnZpY2UudXBsb2FkRmlsZSIsIk5ldFNlcnZpY2UuY2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkiLCJOZXRTZXJ2aWNlLnNlcnZlcklzQXZhaWxhYmxlIiwiTmV0U2VydmljZS5jYW5jZWxBbGxVcGxvYWREb3dubG9hZCIsIk5ldFNlcnZpY2UuYWRkTWV0YUluZm8iLCJlcnJvcmhhbmRsZXIiLCJFcnJvckhhbmRsZXJTZXJ2aWNlIiwiRXJyb3JIYW5kbGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkVycm9ySGFuZGxlclNlcnZpY2UudmFsaWRhdGVSZXNwb25zZSIsIkVycm9ySGFuZGxlclNlcnZpY2UuaXNOb1Jlc3VsdEZvdW5kIiwiRXJyb3JIYW5kbGVyU2VydmljZS5pc1Nlc3Npb25JbnZhbGlkIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNIYXJkRXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNTb2Z0RXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNFcnJvcnMiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc05vUmVzdWx0RXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0hhcmRFcnJvciIsIkVycm9ySGFuZGxlclNlcnZpY2UuaGFzU29mdEVycm9yIiwic2Vzc2lvbnNlcnZpY2UiLCJTZXNzaW9uU2VydmljZSIsIlNlc3Npb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiU2Vzc2lvblNlcnZpY2UucmVzb2x2ZVByb21pc2UiLCJTZXNzaW9uU2VydmljZS5hZGRBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyIiwiU2Vzc2lvblNlcnZpY2UucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lciIsIlNlc3Npb25TZXJ2aWNlLnNldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLnNldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLmNsZWFyTGlzdGVuZXJzIiwiU2Vzc2lvblNlcnZpY2UucmVmcmVzaFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkIiwiU2Vzc2lvblNlcnZpY2UuYWNjZXNzVG9rZW5SZWZyZXNoZWQiLCJkYXRhcHJvdmlkZXIiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlIiwiRGF0YVByb3ZpZGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkRhdGFQcm92aWRlclNlcnZpY2UuZ2V0RGF0YSIsIkRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmRlbGV0ZURhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiRGF0YVByb3ZpZGVyU2VydmljZS5hZGRNZXRhSW5mbyIsIkRhdGFQcm92aWRlclNlcnZpY2UuaXNMb2dvdXRTZXJ2aWNlIiwiQXBwQ29udHJvbGxlciIsIkFwcENvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJBcHBDb250cm9sbGVyLmlzTm90RW1wdHkiLCJBcHBDb250cm9sbGVyLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiQXBwQ29udHJvbGxlci5sb2dvdXQiLCJBcHBDb250cm9sbGVyLmdldFVzZXJEZWZhdWx0UGFnZSIsIkFwcENvbnRyb2xsZXIuc2hvd0Rhc2hib2FyZCIsIk1pc1NlcnZpY2UiLCJNaXNTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTWlzU2VydmljZS5nZXRNZXRyaWNTbmFwc2hvdCIsIk1pc1NlcnZpY2UuZ2V0VGFyZ2V0VnNBY3R1YWwiLCJNaXNTZXJ2aWNlLmdldFJldmVudWVBbmFseXNpcyIsIk1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlIiwiTWlzU2VydmljZS5nZXRTZWN0b3JDYXJyaWVyQW5hbHlzaXMiLCJNaXNTZXJ2aWNlLmdldFBheEZsb3duTWlzSGVhZGVyIiwiTWlzU2VydmljZS5nZXRSb3V0ZVJldmVudWVEcmlsbERvd24iLCJNaXNTZXJ2aWNlLmdldEJhckRyaWxsRG93biIsIk1pc1NlcnZpY2UuZ2V0RHJpbGxEb3duIiwiQ2hhcnRvcHRpb25TZXJ2aWNlIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLmxpbmVDaGFydE9wdGlvbnMiLCJDaGFydG9wdGlvblNlcnZpY2UubXVsdGlCYXJDaGFydE9wdGlvbnMiLCJDaGFydG9wdGlvblNlcnZpY2UubWV0cmljQmFyQ2hhcnRPcHRpb25zIiwiQ2hhcnRvcHRpb25TZXJ2aWNlLnRhcmdldEJhckNoYXJ0T3B0aW9ucyIsIkZpbHRlcmVkTGlzdFNlcnZpY2UiLCJGaWx0ZXJlZExpc3RTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiRmlsdGVyZWRMaXN0U2VydmljZS5zZWFyY2hlZCIsIkZpbHRlcmVkTGlzdFNlcnZpY2UucGFnZWQiLCJzZWFyY2hVdGlsIiwiT3BlcmF0aW9uYWxTZXJ2aWNlIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldFBheEZsb3duT3BySGVhZGVyIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckZsaWdodFByb2NTdGF0dXMiLCJPcGVyYXRpb25hbFNlcnZpY2UuZ2V0T3ByRmxpZ2h0Q291bnRCeVJlYXNvbiIsIk9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJDb3Vwb25Db3VudEJ5RXhjZXB0aW9uIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldERyaWxsRG93biIsIlVzZXJTZXJ2aWNlIiwiVXNlclNlcnZpY2UuY29uc3RydWN0b3IiLCJVc2VyU2VydmljZS5zZXRVc2VyIiwiVXNlclNlcnZpY2UubG9nb3V0IiwiVXNlclNlcnZpY2UuaXNMb2dnZWRJbiIsIlVzZXJTZXJ2aWNlLmlzVXNlckxvZ2dlZEluIiwiVXNlclNlcnZpY2UuZ2V0VXNlciIsIlVzZXJTZXJ2aWNlLmxvZ2luIiwiVXNlclNlcnZpY2UuZ2V0VXNlclByb2ZpbGUiLCJVc2VyU2VydmljZS5zaG93RGFzaGJvYXJkIiwiTWlzQ29udHJvbGxlciIsIk1pc0NvbnRyb2xsZXIuY29uc3RydWN0b3IiLCJNaXNDb250cm9sbGVyLmluaXREYXRhIiwiTWlzQ29udHJvbGxlci5nZXRQcm9maWxlVXNlck5hbWUiLCJNaXNDb250cm9sbGVyLnNlbGVjdGVkRmxvd25Nb250aCIsIk1pc0NvbnRyb2xsZXIub3BlbmluZm9Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jbG9zZVBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3Nlc0JhclBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3NlSW5mb1BvcG92ZXIiLCJNaXNDb250cm9sbGVyLnVwZGF0ZUhlYWRlciIsIk1pc0NvbnRyb2xsZXIub25TbGlkZU1vdmUiLCJNaXNDb250cm9sbGVyLnRvZ2dsZU1ldHJpYyIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlU3VyY2hhcmdlIiwiTWlzQ29udHJvbGxlci50b2dnbGVUYXJnZXQiLCJNaXNDb250cm9sbGVyLnRvZ2dsZVNlY3RvciIsIk1pc0NvbnRyb2xsZXIuY2FsbE1ldHJpY1NuYXBzaG90IiwiTWlzQ29udHJvbGxlci5jYWxsVGFyZ2V0VnNBY3R1YWwiLCJNaXNDb250cm9sbGVyLmNhbGxSb3V0ZVJldmVudWUiLCJNaXNDb250cm9sbGVyLmNhbGxSZXZlbnVlQW5hbHlzaXMiLCJNaXNDb250cm9sbGVyLm9wZW5EcmlsbERvd24iLCJNaXNDb250cm9sbGVyLmNsZWFyRHJpbGwiLCJNaXNDb250cm9sbGVyLmRyaWxsRG93blJlcXVlc3QiLCJNaXNDb250cm9sbGVyLmdldERyaWxsRG93blVSTCIsIk1pc0NvbnRyb2xsZXIub3BlbkJhckRyaWxsRG93biIsIk1pc0NvbnRyb2xsZXIuaW5pdGlhdGVBcnJheSIsIk1pc0NvbnRyb2xsZXIub3BlbkJhckRyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5UYXJnZXREcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5vcGVuUmV2ZW51ZURyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5SZXZlbnVlUGFzc2VuZ2VyRHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5TZWN0b3JQb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jYWxsU2VjdG9yQ2FycmllckFuYWx5c2lzIiwiTWlzQ29udHJvbGxlci50YXJnZXRBY3R1YWxGaWx0ZXIiLCJNaXNDb250cm9sbGVyLnNlY3RvckNhcnJpZXJGaWx0ZXIiLCJNaXNDb250cm9sbGVyLnJldmVudWVBbmFseXNpc0ZpbHRlciIsIk1pc0NvbnRyb2xsZXIuZ2V0Rmxvd25GYXZvcml0ZXMiLCJNaXNDb250cm9sbGVyLmlvbmljTG9hZGluZ1Nob3ciLCJNaXNDb250cm9sbGVyLmlvbmljTG9hZGluZ0hpZGUiLCJNaXNDb250cm9sbGVyLm9wZW5EcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jbG9zZXNQb3BvdmVyIiwiTWlzQ29udHJvbGxlci5pc0RyaWxsUm93U2VsZWN0ZWQiLCJNaXNDb250cm9sbGVyLnNlYXJjaFJlc3VsdHMiLCJNaXNDb250cm9sbGVyLnBhZ2luYXRpb24iLCJNaXNDb250cm9sbGVyLnNldFBhZ2UiLCJNaXNDb250cm9sbGVyLmxhc3RQYWdlIiwiTWlzQ29udHJvbGxlci5yZXNldEFsbCIsIk1pc0NvbnRyb2xsZXIuc29ydCIsIk1pc0NvbnRyb2xsZXIucmFuZ2UiLCJNaXNDb250cm9sbGVyLnRvZ2dsZUdyb3VwIiwiTWlzQ29udHJvbGxlci5pc0dyb3VwU2hvd24iLCJNaXNDb250cm9sbGVyLnRvZ2dsZUNoYXJ0T3JUYWJsZVZpZXciLCJNaXNDb250cm9sbGVyLnRvZ2dsZVRhcmdldFZpZXciLCJNaXNDb250cm9sbGVyLnRvZ2dsZVJldmVudWVWaWV3IiwiTWlzQ29udHJvbGxlci50b2dnbGVTZWN0b3JWaWV3IiwiTWlzQ29udHJvbGxlci5ydW5SZXBvcnQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNvbnN0cnVjdG9yIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaW5pdERhdGEiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5zZWxlY3RlZEZsb3duTW9udGgiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5nZXRQcm9maWxlVXNlck5hbWUiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci51cGRhdGVIZWFkZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vblNsaWRlTW92ZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNhbGxNeURhc2hib2FyZCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNhbGxGbGlnaHRQcm9jU3RhdHVzIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2FsbEZsaWdodENvdW50QnlSZWFzb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5Qb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlblBpZVBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jbG9zZVBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pb25pY0xvYWRpbmdTaG93IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuYXBwbHlDaGFydENvbG9yQ29kZXMiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5nZXRGYXZvcml0ZUl0ZW1zIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY29sb3JGdW5jdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmZvdXJCYXJDb2xvckZ1bmN0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbmluZm9Qb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2xvc2VJbmZvUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUNvdW50IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaW9uaWNMb2FkaW5nSGlkZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmxvY2tTbGlkZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLndlZWtEYXRhUHJldiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLndlZWtEYXRhTmV4dCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUZsaWdodFN0YXR1c1ZpZXciLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50b2dnbGVGbGlnaHRSZWFzb25WaWV3IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudG9nZ2xlQ0NFeGNlcHRpb25WaWV3IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIucnVuUmVwb3J0IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbkZsaWdodFByb2Nlc3NEcmlsbFBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vcGVuQ291bnBvbkNvdW50RHJpbGxQb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbkZsaWdodENvdW50RHJpbGxQb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuZHJpbGxEb3duUmVxdWVzdCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmdldERyaWxsRG93blVSTCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRhYlNsaWRlSGFzQ2hhbmdlZCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5EcmlsbERvd24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jbG9zZURyaWxsUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNsZWFyRHJpbGwiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pbml0aWF0ZUFycmF5IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaXNEcmlsbFJvd1NlbGVjdGVkIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuc2VhcmNoUmVzdWx0cyIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnBhZ2luYXRpb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5zZXRQYWdlIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIubGFzdFBhZ2UiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5yZXNldEFsbCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnNvcnQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5yYW5nZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUdyb3VwIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaXNHcm91cFNob3duIiwiTG9naW5Db250cm9sbGVyIiwiTG9naW5Db250cm9sbGVyLmNvbnN0cnVjdG9yIiwiTG9naW5Db250cm9sbGVyLmNsZWFyRXJyb3IiLCJMb2dpbkNvbnRyb2xsZXIuZG9Mb2dpbiIsIkNoYXJ0RXZlbnQiLCJDaGFydEV2ZW50LmNvbnN0cnVjdG9yIiwiQ2hhcnRFdmVudC5mYWN0b3J5IiwiQ2hhcnRFdmVudC5hcHBlbmRDbGljayIsInJlcG9ydEJ1aWxkZXJTZXJ2aWNlIiwicmVwb3J0QnVpbGRlclNlcnZpY2UuX2dlbmVyYXRlUmVwb3J0IiwicmVwb3J0U3ZjIiwicmVwb3J0U3ZjLl9ydW5SZXBvcnRBc3luYyIsInJlcG9ydFN2Yy5fcnVuUmVwb3J0RGF0YVVSTCIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERlZiIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERvYyIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydEJ1ZmZlciIsInJlcG9ydFN2Yy5nZXREYXRhVVJMIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0QmxvYiIsInJlcG9ydFN2Yy5zYXZlRmlsZSIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGUyIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGaWxlRW50cnkiLCJyZXBvcnRTdmMuc2F2ZUZpbGUuZ290RmlsZVdyaXRlciIsInJlcG9ydFN2Yy5zYXZlRmlsZS5mYWlsIiwicmVwb3J0U3ZjLnVuaXF1ZUZpbGVOYW1lIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0Il0sIm1hcHBpbmdzIjoiQUFBQSw0Q0FBNEM7QUFD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QSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNwS0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzlGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMxQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDekJBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2hDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUM3RkEsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDdENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUN0QkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDaENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNoR0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsZ0JBQWdCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNqQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDcERBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ3BLQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNoR0EsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDNUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ25HQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxjQUFjQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUMvQkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDbkNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ2hHQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMzQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDbEdBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO1FBQ2ZBLENBQUNBO0lBQ0hBLENBQUNBO0lBRURBLEVBQUVBLENBQUFBLENBQUNBLFNBQVNBLElBQUlBLGNBQWNBLENBQUNBLENBQUNBLENBQUNBO1FBQy9CQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNuQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDaEdBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzNDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNsR0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsVUFBVUEsSUFBSUEsU0FBU0EsSUFBSUEsaUJBQWlCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUM3REEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDakNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxJQUFJQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMzREEsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDcEtBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFD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Q3hCQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtZQUN4QkEsQ0FBQ0E7WUFFREosTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7UUFDekJBLENBQUNBO1FBQ0RSLHdCQUF3QkEsUUFBUUE7WUFDL0JhLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLElBQUlBLEVBQUVBLENBQUNBO1lBQ3JCQSxJQUFJQSxTQUFTQSxHQUFHQSxHQUFHQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQTtZQUM3Q0EsU0FBU0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsUUFBUUEsRUFBRUEsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0E7WUFDekVBLFNBQVNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLE9BQU9BLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLE9BQU9BLEVBQUVBLENBQUNBLFFBQVFBLEVBQUVBLENBQUNBO1lBQ3hFQSxTQUFTQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxRQUFRQSxFQUFFQSxHQUFHQSxFQUFFQSxHQUFHQSxHQUFHQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQTtZQUMxRUEsU0FBU0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBVUEsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsVUFBVUEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0E7WUFDOUVBLFNBQVNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLFVBQVVBLEVBQUVBLEdBQUdBLEVBQUVBLEdB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d0JBQ3RCLFdBQVcsR0FBRyxFQUFFLENBQUM7d0JBQ2pCLFVBQVUsR0FBRyxFQUFFLENBQUM7d0JBQ2hCLFNBQVMsR0FBRyxFQUFFLENBQUM7d0JBQ2YsT0FBTyxHQUFHLEVBQUUsQ0FBQzt3QkFDYixPQUFPLEdBQUcsRUFBRSxDQUFDO3dCQUNiLE9BQU8sR0FBRSxFQUFFLENBQUM7d0JBQ1osRUFBRSxDQUFBLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDOzRCQUM5QixRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUMsT0FBTyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUM7b0JBQ3RDLENBQUMsQ0FBQyxDQUFDO2dCQUNKLENBQUMsQ0FBQ0EsQ0FBQ0E7WUFDSkEsQ0FBQ0E7WUFBQUEsSUFBSUEsQ0FBQUEsQ0FBQ0E7Z0JBQ0xBLFFBQVFBLENBQUNBLE9BQU9BLENBQUNBLEVBQUNBLE9BQU9BLEVBQUVBLE9BQU9BLEVBQUNBLENBQUNBLENBQUNBO1lBQ3RDQSxDQUFDQTtZQUVEQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxPQUFPQSxDQUFDQTtRQUN6QkEsQ0FBQ0E7UUFBQWQsQ0FBQ0E7SUFFRkEsQ0FBQ0E7QUFFSCxDQUFDLENBQUMsRUFBRSxDQUFDIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9pb25pYy5kLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9TY3JlZW4uZC50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvSXNUYWJsZXQuZC50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3R5cGluZ3MvSW5BcHBCcm93c2VyLmQudHNcIiAvPiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5jbGFzcyBVdGlscyB7XHJcblx0cHVibGljIHN0YXRpYyBpc05vdEVtcHR5KC4uLnZhbHVlczogT2JqZWN0W10pOiBib29sZWFuIHtcclxuXHRcdHZhciBpc05vdEVtcHR5ID0gdHJ1ZTtcclxuXHRcdF8uZm9yRWFjaCh2YWx1ZXMsICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRpc05vdEVtcHR5ID0gaXNOb3RFbXB0eSAmJiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpICYmIHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSAnJ1xyXG5cdFx0XHRcdCYmICEoKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc09iamVjdCh2YWx1ZSkpICYmIF8uaXNFbXB0eSh2YWx1ZSkpICYmIHZhbHVlICE9IDApO1xyXG5cdFx0fSk7XHJcblx0XHRyZXR1cm4gaXNOb3RFbXB0eTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgaXNMYW5kc2NhcGUoKTogYm9vbGVhbiB7XHJcblx0XHR2YXIgaXNMYW5kc2NhcGU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRcdGlmICh3aW5kb3cgJiYgd2luZG93LnNjcmVlbiAmJiB3aW5kb3cuc2NyZWVuLm9yaWVudGF0aW9uKSB7XHJcblx0XHRcdHZhciB0eXBlOiBzdHJpbmcgPSA8c3RyaW5nPihfLmlzU3RyaW5nKHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24pID8gd2luZG93LnNjcmVlbi5vcmllbnRhdGlvbiA6IHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24udHlwZSk7XHJcblx0XHRcdGlmICh0eXBlKSB7XHJcblx0XHRcdFx0aXNMYW5kc2NhcGUgPSB0eXBlLmluZGV4T2YoJ2xhbmRzY2FwZScpID49IDA7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBpc0xhbmRzY2FwZTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgZ2V0VG9kYXlEYXRlKCk6IERhdGUge1xyXG5cdFx0dmFyIHRvZGF5RGF0ZSA9IG5ldyBEYXRlKCk7XHJcblx0XHR0b2RheURhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblx0XHRyZXR1cm4gdG9kYXlEYXRlO1xyXG5cdH1cclxuXHRwcml2YXRlIHN0YXRpYyBpc0ludGVnZXIobnVtYmVyOiBCaWdKc0xpYnJhcnkuQmlnSlMpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBwYXJzZUludChudW1iZXIudG9TdHJpbmcoKSkgPT0gK251bWJlcjtcclxuXHR9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuaW50ZXJmYWNlIFBvaW50T2JqZWN0IHtcclxuXHRjb2RlOiBzdHJpbmcsXHJcblx0ZGVzY3JpcHRpb246IHN0cmluZ1xyXG59XHJcblxyXG5pbnRlcmZhY2UgSUxvY2FsU3RvcmFnZVNlcnZpY2Uge1xyXG5cdHNldChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogc3RyaW5nKTogdm9pZDtcclxuXHRnZXQoa2V5SWQ6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBzdHJpbmcpOiBzdHJpbmc7XHJcblx0c2V0T2JqZWN0KGtleUlkOiBzdHJpbmcsIGtleXZhbHVlOiBhbnlbXSk6IHZvaWQ7XHJcblx0Z2V0T2JqZWN0KGtleUlkOiBzdHJpbmcpOiBhbnk7XHJcblx0aXNSZWNlbnRFbnRyeUF2YWlsYWJsZShvcmdpbk9iamVjdDogUG9pbnRPYmplY3QsIHR5cGU6IHN0cmluZyk6IHZvaWQ7XHJcblx0YWRkUmVjZW50RW50cnkoZGF0YTogYW55LCB0eXBlOiBzdHJpbmcpOiB2b2lkO1xyXG59XHJcblxyXG5jbGFzcyBMb2NhbFN0b3JhZ2VTZXJ2aWNlIGltcGxlbWVudHMgSUxvY2FsU3RvcmFnZVNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyR3aW5kb3cnXTtcclxuXHRwcml2YXRlIHJlY2VudEVudHJpZXM6IFtQb2ludE9iamVjdF07XHJcblxyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcclxuXHR9XHJcblxyXG5cdHNldChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogc3RyaW5nKTogdm9pZCB7XHJcblx0XHR0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSA9IGtleXZhbHVlO1xyXG5cdH1cclxuXHRnZXQoa2V5SWQ6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdIHx8IGRlZmF1bHRWYWx1ZTtcclxuXHR9XHJcblx0c2V0T2JqZWN0KGtleUlkOiBzdHJpbmcsIGtleXZhbHVlOiBhbnlbXSk6IHZvaWQge1xyXG5cdFx0dGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gPSAgSlNPTi5zdHJpbmdpZnkoa2V5dmFsdWUpO1xyXG5cdH1cclxuXHRnZXRPYmplY3Qoa2V5SWQ6IHN0cmluZyk6IGFueSB7XHJcblx0XHRyZXR1cm4gdGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gPyBKU09OLnBhcnNlKHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdKSA6IHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdGlzUmVjZW50RW50cnlBdmFpbGFibGUob3JnaW5PYmplY3Q6IFBvaW50T2JqZWN0LCB0eXBlOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMucmVjZW50RW50cmllcyA9IHRoaXMuZ2V0T2JqZWN0KHR5cGUpID8gdGhpcy5nZXRPYmplY3QodHlwZSkgOiBbXTtcclxuXHRcdHJldHVybiB0aGlzLnJlY2VudEVudHJpZXMuZmlsdGVyKGZ1bmN0aW9uIChlbnRyeSkgeyByZXR1cm4gZW50cnkuY29kZSA9PT0gb3JnaW5PYmplY3QuY29kZSB9KTtcclxuXHR9XHJcblxyXG5cdGFkZFJlY2VudEVudHJ5KGRhdGE6IGFueSwgdHlwZTogc3RyaW5nKSB7XHJcblx0XHR2YXIgb3JnaW5PYmplY3Q6IFBvaW50T2JqZWN0XHQ9XHRkYXRhID8gZGF0YS5vcmlnaW5hbE9iamVjdCA6IHVuZGVmaW5lZDtcclxuXHJcblx0XHRpZiAob3JnaW5PYmplY3QpIHtcclxuXHRcdFx0aWYgKHRoaXMuaXNSZWNlbnRFbnRyeUF2YWlsYWJsZShvcmdpbk9iamVjdCwgdHlwZSkubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0dGhpcy5yZWNlbnRFbnRyaWVzID0gdGhpcy5nZXRPYmplY3QodHlwZSkgPyB0aGlzLmdldE9iamVjdCh0eXBlKSA6IFtdO1xyXG5cdFx0XHRcdCh0aGlzLnJlY2VudEVudHJpZXMubGVuZ3RoID09IDMpID8gdGhpcy5yZWNlbnRFbnRyaWVzLnBvcCgpIDogdGhpcy5yZWNlbnRFbnRyaWVzO1xyXG5cdFx0XHRcdHRoaXMucmVjZW50RW50cmllcy51bnNoaWZ0KG9yZ2luT2JqZWN0KTtcclxuXHRcdFx0XHR0aGlzLnNldE9iamVjdCh0eXBlLCB0aGlzLnJlY2VudEVudHJpZXMpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5pbnRlcmZhY2UgSUNvcmRvdmFDYWxsIHtcclxuXHQoKTogdm9pZDtcclxufVxyXG5cclxuY2xhc3MgQ29yZG92YVNlcnZpY2Uge1xyXG5cclxuXHRwcml2YXRlIGNvcmRvdmFSZWFkeTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHByaXZhdGUgcGVuZGluZ0NhbGxzOiBJQ29yZG92YUNhbGxbXSA9IFtdO1xyXG5cclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZXJlYWR5JywgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmNvcmRvdmFSZWFkeSA9IHRydWU7XHJcblx0XHRcdHRoaXMuZXhlY3V0ZVBlbmRpbmcoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0ZXhlYyhmbjogSUNvcmRvdmFDYWxsLCBhbHRlcm5hdGl2ZUZuPzogSUNvcmRvdmFDYWxsKSB7XHJcblx0XHRpZiAodGhpcy5jb3Jkb3ZhUmVhZHkpIHtcclxuXHRcdFx0Zm4oKTtcclxuXHRcdH0gZWxzZSBpZiAoIWFsdGVybmF0aXZlRm4pIHtcclxuXHRcdFx0dGhpcy5wZW5kaW5nQ2FsbHMucHVzaChmbik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRhbHRlcm5hdGl2ZUZuKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGV4ZWN1dGVQZW5kaW5nKCkge1xyXG5cdFx0dGhpcy5wZW5kaW5nQ2FsbHMuZm9yRWFjaCgoZm4pID0+IHtcclxuXHRcdFx0Zm4oKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucGVuZGluZ0NhbGxzID0gW107XHJcblx0fVxyXG5cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi90eXBpbmdzL2FuZ3VsYXJqcy9hbmd1bGFyLmQudHNcIi8+XHJcblxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxyXG5cclxuaW50ZXJmYWNlIElOZXRTZXJ2aWNlIHtcclxuXHRnZXREYXRhKGZyb21Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xyXG5cdHBvc3REYXRhKHRvVXJsOiBzdHJpbmcsIGRhdGE6IGFueSk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xyXG5cdGRlbGV0ZURhdGEodG9Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xyXG5cdGNoZWNrU2VydmVyQXZhaWxhYmlsaXR5KCk6IG5nLklQcm9taXNlPGJvb2xlYW4+O1xyXG59XHJcblxyXG5jbGFzcyBOZXRTZXJ2aWNlIGltcGxlbWVudHMgSU5ldFNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRodHRwJywgJ0NvcmRvdmFTZXJ2aWNlJywgJyRxJywgJ1VSTF9XUycsICdPV05FUl9DQVJSSUVSX0NPREUnXTtcclxuXHRwcml2YXRlIGZpbGVUcmFuc2ZlcjogRmlsZVRyYW5zZmVyO1xyXG5cdHByaXZhdGUgaXNTZXJ2ZXJBdmFpbGFibGU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkaHR0cDogbmcuSUh0dHBTZXJ2aWNlLCBwcml2YXRlIGNvcmRvdmFTZXJ2aWNlOiBDb3Jkb3ZhU2VydmljZSwgcHJvdGVjdGVkICRxOiBuZy5JUVNlcnZpY2UsIHB1YmxpYyBVUkxfV1M6IHN0cmluZywgcHJpdmF0ZSBPV05FUl9DQVJSSUVSX0NPREU6IHN0cmluZykge1xyXG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy50aW1lb3V0ID0gNjAwMDA7XHJcblx0XHRjb3Jkb3ZhU2VydmljZS5leGVjKCgpID0+IHtcclxuXHRcdFx0Ly8gdGhpcy5maWxlVHJhbnNmZXIgPSBuZXcgRmlsZVRyYW5zZmVyKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGdldERhdGEoZnJvbVVybDogc3RyaW5nKTogbmcuSUh0dHBQcm9taXNlPGFueT4ge1xyXG5cdFx0dmFyIHVybDogc3RyaW5nID0gU0VSVkVSX1VSTCArIGZyb21Vcmw7XHJcblx0XHRyZXR1cm4gdGhpcy4kaHR0cC5nZXQodXJsKTtcclxuXHR9XHJcblxyXG5cdHBvc3REYXRhKHRvVXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcclxuXHRcdHJldHVybiB0aGlzLiRodHRwLnBvc3QoU0VSVkVSX1VSTCArIHRvVXJsLCB0aGlzLmFkZE1ldGFJbmZvKGRhdGEpKTtcclxuXHR9XHJcblxyXG5cdGRlbGV0ZURhdGEodG9Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcclxuXHRcdHJldHVybiB0aGlzLiRodHRwLmRlbGV0ZShTRVJWRVJfVVJMICsgdG9VcmwpO1xyXG5cdH1cclxuXHJcblx0dXBsb2FkRmlsZShcclxuXHRcdHRvVXJsOiBzdHJpbmcsIHVybEZpbGU6IHN0cmluZyxcclxuXHRcdG9wdGlvbnM6IEZpbGVVcGxvYWRPcHRpb25zLCBzdWNjZXNzQ2FsbGJhY2s6IChyZXN1bHQ6IEZpbGVVcGxvYWRSZXN1bHQpID0+IHZvaWQsXHJcblx0XHRlcnJvckNhbGxiYWNrOiAoZXJyb3I6IEZpbGVUcmFuc2ZlckVycm9yKSA9PiB2b2lkLCBwcm9ncmVzc0NhbGxiYWNrPzogKHByb2dyZXNzRXZlbnQ6IFByb2dyZXNzRXZlbnQpID0+IHZvaWQpIHtcclxuXHRcdGlmICghdGhpcy5maWxlVHJhbnNmZXIpIHtcclxuXHRcdFx0dGhpcy5maWxlVHJhbnNmZXIgPSBuZXcgRmlsZVRyYW5zZmVyKCk7XHJcblx0XHR9XHJcblx0XHRjb25zb2xlLmxvZyhvcHRpb25zLnBhcmFtcyk7XHJcblx0XHR0aGlzLmZpbGVUcmFuc2Zlci5vbnByb2dyZXNzID0gcHJvZ3Jlc3NDYWxsYmFjaztcclxuXHRcdHZhciB1cmw6IHN0cmluZyA9IFNFUlZFUl9VUkwgKyB0b1VybDtcclxuXHRcdHRoaXMuZmlsZVRyYW5zZmVyLnVwbG9hZCh1cmxGaWxlLCB1cmwsIHN1Y2Nlc3NDYWxsYmFjaywgZXJyb3JDYWxsYmFjaywgb3B0aW9ucyk7XHJcblx0fVxyXG5cclxuXHRjaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpOiBuZy5JUHJvbWlzZTxib29sZWFuPiB7XHJcblx0XHR2YXIgYXZhaWxhYmlsaXR5OiBib29sZWFuID0gdHJ1ZTtcclxuXHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8Ym9vbGVhbj4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblxyXG5cdFx0dGhpcy5jb3Jkb3ZhU2VydmljZS5leGVjKCgpID0+IHtcclxuXHRcdFx0aWYgKHdpbmRvdy5uYXZpZ2F0b3IpIHsgLy8gb24gZGV2aWNlXHJcblx0XHRcdFx0dmFyIG5hdmlnYXRvcjogTmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcclxuXHRcdFx0XHRpZiAobmF2aWdhdG9yLmNvbm5lY3Rpb24gJiYgKChuYXZpZ2F0b3IuY29ubmVjdGlvbi50eXBlID09IENvbm5lY3Rpb24uTk9ORSkgfHwgKG5hdmlnYXRvci5jb25uZWN0aW9uLnR5cGUgPT0gQ29ubmVjdGlvbi5VTktOT1dOKSkpIHtcclxuXHRcdFx0XHRcdGF2YWlsYWJpbGl0eSA9IGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRkZWYucmVzb2x2ZShhdmFpbGFiaWxpdHkpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0c2VydmVySXNBdmFpbGFibGUoKTogYm9vbGVhbiB7XHJcblx0XHR2YXIgdGhhdDogTmV0U2VydmljZSA9IHRoaXM7XHJcblxyXG5cdFx0dmFyIHNlcnZlcklzQXZhaWxhYmxlID0gdGhpcy5jaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpLnRoZW4oKHJlc3VsdDogYm9vbGVhbikgPT4ge1xyXG5cdFx0XHR0aGF0LmlzU2VydmVyQXZhaWxhYmxlID0gcmVzdWx0O1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuaXNTZXJ2ZXJBdmFpbGFibGU7XHJcblx0fVxyXG5cclxuXHRjYW5jZWxBbGxVcGxvYWREb3dubG9hZCgpIHtcclxuXHRcdGlmICh0aGlzLmZpbGVUcmFuc2Zlcikge1xyXG5cdFx0XHR0aGlzLmZpbGVUcmFuc2Zlci5hYm9ydCgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0YWRkTWV0YUluZm8ocmVxdWVzdERhdGE6IGFueSk6IGFueSB7XHJcblx0XHR2YXIgZGV2aWNlOiBJb25pYy5JRGV2aWNlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKClcclxuXHRcdHZhciBtb2RlbDogc3RyaW5nID0gJ2RldmljZSBJbmZvJztcclxuXHRcdHZhciBvc1R5cGU6IHN0cmluZyA9ICc4LjQnO1xyXG5cdFx0dmFyIG9zVmVyc2lvbjogc3RyaW5nID0gJ2lvcyc7XHJcblx0XHR2YXIgZGV2aWNlVG9rZW46IHN0cmluZyA9ICdzdHJpbmcnO1xyXG5cdFx0aWYgKGRldmljZSkge1xyXG5cdFx0XHRtb2RlbCA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLm1vZGVsO1xyXG5cdFx0XHRvc1R5cGUgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5wbGF0Zm9ybTtcclxuXHRcdFx0b3NWZXJzaW9uID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkudmVyc2lvbjtcclxuXHRcdH1cclxuXHRcdGlmICghbW9kZWwpIHtcclxuXHRcdFx0bW9kZWwgPSAnZGV2aWNlIEluZm8nO1x0XHJcblx0XHR9XHJcblx0XHRpZiAoIW9zVHlwZSkge1xyXG5cdFx0XHRvc1R5cGUgPSAnOC40JztcdFxyXG5cdFx0fVxyXG5cdFx0aWYgKCFvc1ZlcnNpb24pIHtcclxuXHRcdFx0b3NWZXJzaW9uID0gJ2lvcyc7XHRcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0dmFyIG1ldGFJbmZvID0ge1xyXG5cdFx0XHQnY2hhbm5lbElkZW50aWZpZXInOiAnTU9CJyxcclxuXHRcdFx0J2RhdGVUaW1lU3RhbXAnOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcclxuXHRcdFx0J293bmVyQ2FycmllckNvZGUnOiB0aGlzLk9XTkVSX0NBUlJJRVJfQ09ERSxcclxuXHRcdFx0J2FkZGl0aW9uYWxJbmZvJzoge1xyXG5cdFx0XHRcdCdkZXZpY2VUeXBlJzogd2luZG93LmlzVGFibGV0ID8gJ1RhYmxldCcgOiAnUGhvbmUnLFxyXG5cdFx0XHRcdCdtb2RlbCc6IG1vZGVsLFxyXG5cdFx0XHRcdCdvc1R5cGUnOiBvc1R5cGUsXHJcblx0XHRcdFx0J29zVmVyc2lvbic6IG9zVmVyc2lvbixcclxuXHRcdFx0XHQnZGV2aWNlVG9rZW4nOiBkZXZpY2VUb2tlbixcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR2YXIgcmVxdWVzdE9iaiA9IHtcclxuXHRcdFx0J21ldGFJbmZvJzogbWV0YUluZm8sXHJcblx0XHRcdCdyZXF1ZXN0RGF0YSc6IHJlcXVlc3REYXRhXHJcblx0XHR9O1xyXG5cdFx0cmV0dXJuIHJlcXVlc3RPYmo7XHJcblx0fVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOZXRTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkNvcmRvdmFTZXJ2aWNlLnRzXCIgLz5cclxuXHJcbm1vZHVsZSBlcnJvcmhhbmRsZXIge1xyXG5cdGV4cG9ydCBjb25zdCBTVEFUVVNfRkFJTDogc3RyaW5nID0gJ2ZhaWwnO1xyXG5cdGV4cG9ydCBjb25zdCBTRVZFUklUWV9FUlJPUl9IQVJEOiBzdHJpbmcgPSAnSEFSRCc7XHJcblx0ZXhwb3J0IGNvbnN0IFNFVkVSSVRZX0VSUk9SX1NPRlQ6IHN0cmluZyA9ICdTT0ZUJztcclxuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT05fVE9LRU4gPSAnU0VDLjAyNSc7XHJcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OID0gJ1NFUy4wMDQnO1xyXG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX1RPS0VOX0VYUElSRUQgPSAnU0VDLjAzOCc7XHJcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfSU5WQUxJRF9VU0VSX1NFU1NJT05fRVhQSVJFRCA9ICdTRVMuMDAzJztcclxuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9OT19SRVNVTFQgPSAnQ09NLjExMSc7XHJcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfTk9fUk9VVEUgPSAnRkxULjAxMCc7XHJcbn1cclxuXHJcbmNsYXNzIEVycm9ySGFuZGxlclNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ05ldFNlcnZpY2UnLCAnQ29yZG92YVNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZSddO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgbmV0U2VydmljZTogTmV0U2VydmljZSwgcHJpdmF0ZSBjb3Jkb3ZhU2VydmljZTogQ29yZG92YVNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcclxuXHRcdHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVNjb3BlKSB7XHJcblx0fVxyXG5cclxuXHR2YWxpZGF0ZVJlc3BvbnNlKHJlc3BvbnNlOiBhbnkpIHtcclxuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcclxuXHRcdGlmICh0aGlzLmhhc0Vycm9ycyhlcnJvcnMpIHx8IGVycm9yaGFuZGxlci5TVEFUVVNfRkFJTCA9PSByZXNwb25zZS5zdGF0dXMpIHtcclxuXHRcdFx0aWYgKCF0aGlzLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IoZXJyb3JzKSAmJiAhdGhpcy5oYXNOb1Jlc3VsdEVycm9yKGVycm9ycykpIHtcclxuXHRcdFx0XHQvLyBicm9hZGNhc3QgdG8gYXBwY29udHJvbGxlciBzZXJ2ZXIgZXJyb3JcclxuXHRcdFx0XHR0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnc2VydmVyRXJyb3InLCByZXNwb25zZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGlzTm9SZXN1bHRGb3VuZChyZXNwb25zZTogYW55KTogYm9vbGVhbiB7XHJcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XHJcblx0XHRyZXR1cm4gdGhpcy5oYXNOb1Jlc3VsdEVycm9yKGVycm9ycyk7XHJcblx0fVxyXG5cclxuXHRpc1Nlc3Npb25JbnZhbGlkKHJlc3BvbnNlOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcclxuXHRcdHJldHVybiB0aGlzLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IoZXJyb3JzKTtcclxuXHR9XHJcblxyXG5cdGhhc0hhcmRFcnJvcnMocmVzcG9uc2U6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xyXG5cdFx0cmV0dXJuIHRoaXMuaGFzSGFyZEVycm9yKGVycm9ycyk7XHJcblx0fVxyXG5cclxuXHRoYXNTb2Z0RXJyb3JzKHJlc3BvbnNlOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcclxuXHRcdHJldHVybiB0aGlzLmhhc1NvZnRFcnJvcihlcnJvcnMpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYXNFcnJvcnMoZXJyb3JzOiBhbnkpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBlcnJvcnMubGVuZ3RoID4gMDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFzSW52YWxpZFNlc3Npb25FcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XHJcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfSEFSRCA9PSBlcnJvci5zZXZlcml0eSAmJlxyXG5cdFx0XHQoZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OX1RPS0VOID09IGVycm9yLmNvZGUgfHxcclxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT04gPT0gZXJyb3IuY29kZSB8fFxyXG5cdFx0XHRcdGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX0lOVkFMSURfVVNFUl9TRVNTSU9OX0VYUElSRUQgPT0gZXJyb3IuY29kZSB8fFxyXG5cdFx0XHRcdGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX1RPS0VOX0VYUElSRUQgPT0gZXJyb3IuY29kZSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFzTm9SZXN1bHRFcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XHJcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfSEFSRCA9PSBlcnJvci5zZXZlcml0eSAmJlxyXG5cdFx0XHQoZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfTk9fUkVTVUxUID09IGVycm9yLmNvZGUgfHxcclxuXHRcdFx0XHRlcnJvcmhhbmRsZXIuSEFSRF9FUlJPUl9OT19ST1VURSA9PSBlcnJvci5jb2RlKTtcclxuXHRcdH0pICYmIGVycm9ycy5sZW5ndGggPT0gMTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFzSGFyZEVycm9yKGVycm9yczogYW55KTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gXy5zb21lKGVycm9ycywgKGVycm9yOiBhbnkpID0+IHtcclxuXHRcdFx0cmV0dXJuIGVycm9yICYmIGVycm9yaGFuZGxlci5TRVZFUklUWV9FUlJPUl9IQVJEID09IGVycm9yLnNldmVyaXR5O1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhc1NvZnRFcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XHJcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfU09GVCA9PSBlcnJvci5zZXZlcml0eTtcclxuXHRcdH0pO1xyXG5cdH1cclxufSIsbnVsbCwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOZXRTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkNvcmRvdmFTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkVycm9ySGFuZGxlclNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiSVNlc3Npb25IdHRwUHJvbWlzZS50c1wiIC8+XHJcblxyXG5tb2R1bGUgc2Vzc2lvbnNlcnZpY2Uge1xyXG5cdGV4cG9ydCBjb25zdCBIRUFERVJfUkVGUkVTSF9UT0tFTl9LRVk6IHN0cmluZyA9ICd4LXJlZnJlc2gtdG9rZW4nO1xyXG5cdGV4cG9ydCBjb25zdCBIRUFERVJfQUNDRVNTX1RPS0VOX0tFWTogc3RyaW5nID0gJ3gtYWNjZXNzLXRva2VuJztcclxuXHRleHBvcnQgY29uc3QgUkVGUkVTSF9TRVNTSU9OX0lEX1VSTDogc3RyaW5nID0gJy91c2VyL2dldEFjY2Vzc1Rva2VuJztcclxufVxyXG5cclxuY2xhc3MgU2Vzc2lvblNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ05ldFNlcnZpY2UnLCAnRXJyb3JIYW5kbGVyU2VydmljZScsICckcScsICckcm9vdFNjb3BlJywgJyRodHRwJ107XHJcblxyXG5cdHByaXZhdGUgYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXM6IElBY2Nlc3NUb2tlblJlZnJlc2hlZEhhbmRsZXJbXTtcclxuXHRwcml2YXRlIHNlc3Npb25JZDogc3RyaW5nO1xyXG5cdHByaXZhdGUgY3JlZGVudGlhbElkOiBzdHJpbmc7XHJcblx0cHJpdmF0ZSBpc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBuZXRTZXJ2aWNlOiBOZXRTZXJ2aWNlLCBwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcclxuXHRcdHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVNjb3BlLCBwcml2YXRlICRodHRwOiBuZy5JSHR0cFNlcnZpY2UpIHtcclxuXHRcdHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMgPSBbXTtcclxuXHRcdHRoaXMuc2Vzc2lvbklkID0gbnVsbDtcclxuXHRcdHRoaXMuY3JlZGVudGlhbElkID0gbnVsbDtcclxuXHR9XHJcblxyXG5cdHJlc29sdmVQcm9taXNlKHByb21pc2U6IElTZXNzaW9uSHR0cFByb21pc2UpIHtcclxuXHRcdHByb21pc2UucmVzcG9uc2UudGhlbigocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0aWYgKCF0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaGFzSGFyZEVycm9ycyhyZXNwb25zZSkgfHwgdGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmlzU2Vzc2lvbkludmFsaWQocmVzcG9uc2UpKSB7XHJcblx0XHRcdFx0aWYgKCF0aGlzLmVycm9ySGFuZGxlclNlcnZpY2UuaXNTZXNzaW9uSW52YWxpZChyZXNwb25zZSkpIHtcclxuXHRcdFx0XHRcdHByb21pc2UuZGVmZmVyZWQucmVzb2x2ZShwcm9taXNlLnJlc3BvbnNlKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdzZXNzaW9uIGlzIHZhbGlkJyk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMuYWRkQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihwcm9taXNlKTtcclxuXHRcdFx0XHRcdGlmICghdGhpcy5pc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZWZyZXNoaW5nIHNlc3Npb24gdG9rZW4nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5yZWZyZXNoU2Vzc2lvbklkKCkudGhlbihcclxuXHRcdFx0XHRcdFx0XHQodG9rZW5SZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuZXJyb3JIYW5kbGVyU2VydmljZS5oYXNIYXJkRXJyb3JzKHRva2VuUmVzcG9uc2UpKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuc2V0U2Vzc2lvbklkKG51bGwpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHJlc3BvbnNlSGVhZGVyID0gdG9rZW5SZXNwb25zZS5oZWFkZXJzKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHZhciBhY2Nlc3NUb2tlbjogc3RyaW5nID0gcmVzcG9uc2VIZWFkZXJbc2Vzc2lvbnNlcnZpY2UuSEVBREVSX0FDQ0VTU19UT0tFTl9LRVldO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnNldFNlc3Npb25JZChhY2Nlc3NUb2tlbik7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmlzUmVmcmVzaFNlc3Npb25JZEluUHJvZ3Jlc3MgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICghdGhpcy5nZXRTZXNzaW9uSWQoKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdlcnJvciBvbiBhY2Nlc3MgdG9rZW4gcmVmcmVzaCcpO1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRTZXNzaW9uSWQobnVsbCk7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5nZXRDcmVkZW50aWFsSWQoKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRwcm9taXNlLmRlZmZlcmVkLnJlamVjdCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5pc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHByb21pc2UuZGVmZmVyZWQucmVqZWN0KCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0YWRkQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lcjogSUFjY2Vzc1Rva2VuUmVmcmVzaGVkSGFuZGxlcikge1xyXG5cdFx0dGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcy5wdXNoKGxpc3RlbmVyKTtcclxuXHR9XHJcblxyXG5cdHJlbW92ZUFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzdGVuZXIobGlzdGVuZXJUb1JlbW92ZTogSUFjY2Vzc1Rva2VuUmVmcmVzaGVkSGFuZGxlcikge1xyXG5cdFx0Xy5yZW1vdmUodGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcywgKGxpc3RlbmVyKSA9PiB7XHJcblx0XHRcdHJldHVybiBsaXN0ZW5lciA9PSBsaXN0ZW5lclRvUmVtb3ZlO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRzZXRDcmVkZW50aWFsSWQoY3JlZElkOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMuY3JlZGVudGlhbElkID0gY3JlZElkO1xyXG5cdFx0dGhpcy4kaHR0cC5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vbltzZXNzaW9uc2VydmljZS5IRUFERVJfUkVGUkVTSF9UT0tFTl9LRVldID0gY3JlZElkO1xyXG5cdH1cclxuXHJcblx0c2V0U2Vzc2lvbklkKHNlc3Npb25JZDogc3RyaW5nKSB7XHJcblx0XHR0aGlzLnNlc3Npb25JZCA9IHNlc3Npb25JZDtcclxuXHRcdHRoaXMuJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bc2Vzc2lvbnNlcnZpY2UuSEVBREVSX0FDQ0VTU19UT0tFTl9LRVldID0gc2Vzc2lvbklkO1xyXG5cdH1cclxuXHJcblx0Z2V0U2Vzc2lvbklkKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gdGhpcy5zZXNzaW9uSWQgPyB0aGlzLnNlc3Npb25JZCA6IG51bGw7XHJcblx0fVxyXG5cclxuXHRnZXRDcmVkZW50aWFsSWQoKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiB0aGlzLmNyZWRlbnRpYWxJZCA/IHRoaXMuY3JlZGVudGlhbElkIDogbnVsbDtcclxuXHR9XHJcblxyXG5cdGNsZWFyTGlzdGVuZXJzKCkge1xyXG5cdFx0dGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcyA9IFtdO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZWZyZXNoU2Vzc2lvbklkKCk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcclxuXHRcdHRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcyA9IHRydWU7XHJcblx0XHR2YXIgYWNjZXNzVG9rZW5SZXF1ZXN0OiBhbnkgPSB7XHJcblx0XHRcdHJlZnJlc2hUb2tlbjogdGhpcy5jcmVkZW50aWFsSWRcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzLm5ldFNlcnZpY2UucG9zdERhdGEoc2Vzc2lvbnNlcnZpY2UuUkVGUkVTSF9TRVNTSU9OX0lEX1VSTCwgYWNjZXNzVG9rZW5SZXF1ZXN0KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYWNjZXNzVG9rZW5Ob3RSZWZyZXNoZWQoKSB7XHJcblx0XHRfLmZvckVhY2godGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcywgKGxpc3RlbmVyKSA9PiB7XHJcblx0XHRcdGlmIChsaXN0ZW5lci5vblRva2VuRmFpbGVkKSB7XHJcblx0XHRcdFx0bGlzdGVuZXIub25Ub2tlbkZhaWxlZChsaXN0ZW5lcik7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5yZW1vdmVBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyKGxpc3RlbmVyKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhY2Nlc3NUb2tlblJlZnJlc2hlZCgpIHtcclxuXHRcdF8uZm9yRWFjaCh0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLCAobGlzdGVuZXIpID0+IHtcclxuXHRcdFx0aWYgKGxpc3RlbmVyKSB7XHJcblx0XHRcdFx0aWYgKGxpc3RlbmVyLm9uVG9rZW5SZWZyZXNoZWQpIHtcclxuXHRcdFx0XHRcdGxpc3RlbmVyLm9uVG9rZW5SZWZyZXNoZWQobGlzdGVuZXIpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkobGlzdGVuZXIpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ0xlbmd0aCA9ICcsIHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMubGVuZ3RoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLnJlbW92ZUFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzdGVuZXIobGlzdGVuZXIpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59IixudWxsLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk5ldFNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiU2Vzc2lvblNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiRXJyb3JIYW5kbGVyU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJJU2Vzc2lvbkh0dHBQcm9taXNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkdlbmVyaWNSZXNwb25zZS50c1wiIC8+XHJcblxyXG5tb2R1bGUgZGF0YXByb3ZpZGVyIHtcclxuXHRleHBvcnQgY29uc3QgU0VSVklDRV9VUkxfTE9HT1VUID0gJy91c2VyL2xvZ291dCc7XHJcbn1cclxuXHJcbmNsYXNzIERhdGFQcm92aWRlclNlcnZpY2Uge1xyXG5cclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ05ldFNlcnZpY2UnLCAnQ29yZG92YVNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZScsICdFcnJvckhhbmRsZXJTZXJ2aWNlJywgJ1Nlc3Npb25TZXJ2aWNlJywgJ09XTkVSX0NBUlJJRVJfQ09ERSddO1xyXG5cclxuXHRwcml2YXRlIGlzQ29ubmVjdGVkVG9OZXR3b3JrOiBib29sZWFuID0gdHJ1ZTtcclxuXHRwcml2YXRlIG5hdmlnYXRvcjogTmF2aWdhdG9yO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgbmV0U2VydmljZTogTmV0U2VydmljZSwgcHJpdmF0ZSBjb3Jkb3ZhU2VydmljZTogQ29yZG92YVNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcclxuXHRcdHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVNjb3BlLCBwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UsXHJcblx0XHRwcml2YXRlIHNlc3Npb25TZXJ2aWNlOiBTZXNzaW9uU2VydmljZSwgcHJpdmF0ZSBPV05FUl9DQVJSSUVSX0NPREU6IHN0cmluZykge1xyXG5cclxuXHRcdHRoaXMuY29yZG92YVNlcnZpY2UuZXhlYygoKSA9PiB7XHJcblx0XHRcdGlmICh3aW5kb3cuY29yZG92YSAmJiB3aW5kb3cuZG9jdW1lbnQpIHsgLy8gb24gZGV2aWNlXHJcblx0XHRcdFx0bmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcclxuXHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrID0gbmF2aWdhdG9yLm9uTGluZTtcclxuXHRcdFx0XHR3aW5kb3cuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcclxuXHRcdFx0XHRcdCdvbmxpbmUnLFxyXG5cdFx0XHRcdFx0KCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygndXNlciBvbmxpbmUnKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5pc0Nvbm5lY3RlZFRvTmV0d29yayA9IHRydWU7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0ZmFsc2UpO1xyXG5cdFx0XHRcdHdpbmRvdy5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFxyXG5cdFx0XHRcdFx0J29mZmxpbmUnLFxyXG5cdFx0XHRcdFx0KCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygndXNlciBvZmZsaW5lJyk7XHJcblx0XHRcdFx0XHRcdHRoaXMuaXNDb25uZWN0ZWRUb05ldHdvcmsgPSBmYWxzZTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRmYWxzZSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Z2V0RGF0YShyZXE6IHN0cmluZyk6IG5nLklQcm9taXNlPGFueT4ge1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblxyXG5cdFx0aWYgKHRoaXMuaGFzTmV0d29ya0Nvbm5lY3Rpb24oKSkge1xyXG5cdFx0XHRkZWYucmVzb2x2ZSh0aGlzLm5ldFNlcnZpY2UuZ2V0RGF0YShyZXEpKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdTZXJ2ZXIgdW5hdmFpbGFibGUnKTtcclxuXHRcdFx0Ly8gdGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ25vTmV0d29yaycpO1xyXG5cdFx0XHRkZWYucmVqZWN0KCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0cG9zdERhdGEocmVxOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyk6IG5nLklQcm9taXNlPGFueT4ge1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblxyXG5cdFx0dmFyIHJlc3BvbnNlOiBuZy5JUHJvbWlzZTxhbnk+ID0gdGhpcy5uZXRTZXJ2aWNlLnBvc3REYXRhKHJlcSwgZGF0YSwgY29uZmlnKTtcclxuXHJcblx0XHRpZiAodGhpcy5oYXNOZXR3b3JrQ29ubmVjdGlvbigpKSB7XHJcblx0XHRcdHJlc3BvbnNlLnRoZW4oXHJcblx0XHRcdChodHRwUmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHRkZWYucmVzb2x2ZShodHRwUmVzcG9uc2UpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XHJcblx0XHRcdFx0Ly8gYnJvYWRjYXN0IHNlcnZlciBpcyB1bmF2YWlsYWJsZVxyXG5cdFx0XHRcdHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdzZXJ2ZXJOb3RBdmFpbGFibGUnKTtcclxuXHRcdFx0XHRkZWYucmVqZWN0KCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0ZGVmLnJlamVjdCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGRlbGV0ZURhdGEocmVxOiBzdHJpbmcpOiBuZy5JUHJvbWlzZTxhbnk+IHtcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cclxuXHRcdGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcclxuXHRcdFx0ZGVmLnJlc29sdmUodGhpcy5uZXRTZXJ2aWNlLmRlbGV0ZURhdGEocmVxKSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XHJcblx0XHRcdGRlZi5yZWplY3QoKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRoYXNOZXR3b3JrQ29ubmVjdGlvbigpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiAobmF2aWdhdG9yLm9uTGluZSB8fCB0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrKTtcclxuXHR9XHJcblxyXG5cclxuXHQvLyBUT0RPOiByZW1vdmUgdGhpcyB0ZW1wIG1ldGhvZCBhbmQgdXNlIGdlbmVyaWNzXHJcblx0YWRkTWV0YUluZm8ocmVxdWVzdERhdGE6IGFueSk6IGFueSB7XHJcblx0XHR2YXIgZGV2aWNlOiBJb25pYy5JRGV2aWNlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKClcclxuXHRcdHZhciBtb2RlbDogc3RyaW5nID0gJyc7XHJcblx0XHR2YXIgb3NUeXBlOiBzdHJpbmcgPSAnJztcclxuXHRcdHZhciBvc1ZlcnNpb246IHN0cmluZyA9ICcnO1xyXG5cdFx0dmFyIGRldmljZVRva2VuOiBzdHJpbmcgPSAnJztcclxuXHRcdGlmIChkZXZpY2UpIHtcclxuXHRcdFx0bW9kZWwgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS5tb2RlbDtcclxuXHRcdFx0b3NUeXBlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkucGxhdGZvcm07XHJcblx0XHRcdG9zVmVyc2lvbiA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLnZlcnNpb247XHJcblx0XHR9XHJcblx0XHR2YXIgbWV0YUluZm8gPSB7XHJcblx0XHRcdCdjaGFubmVsSWRlbnRpZmllcic6ICdNT0InLFxyXG5cdFx0XHQnZGF0ZVRpbWVTdGFtcCc6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG5cdFx0XHQnb3duZXJDYXJyaWVyQ29kZSc6IHRoaXMuT1dORVJfQ0FSUklFUl9DT0RFLFxyXG5cdFx0XHQnYWRkaXRpb25hbEluZm8nOiB7XHJcblx0XHRcdFx0J2RldmljZVR5cGUnOiB3aW5kb3cuaXNUYWJsZXQgPyAnVGFibGV0JyA6ICdQaG9uZScsXHJcblx0XHRcdFx0J21vZGVsJzogbW9kZWwsXHJcblx0XHRcdFx0J29zVHlwZSc6IG9zVHlwZSxcclxuXHRcdFx0XHQnb3NWZXJzaW9uJzogb3NWZXJzaW9uLFxyXG5cdFx0XHRcdCdkZXZpY2VUb2tlbic6IGRldmljZVRva2VuLFxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xyXG5cdFx0XHQnbWV0YUluZm8nOiBtZXRhSW5mbyxcclxuXHRcdFx0J3JlcXVlc3REYXRhJzogcmVxdWVzdERhdGFcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gcmVxdWVzdE9iajtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaXNMb2dvdXRTZXJ2aWNlKHJlcXVlc3RVcmw6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIGRhdGFwcm92aWRlci5TRVJWSUNFX1VSTF9MT0dPVVQgPT0gcmVxdWVzdFVybDtcclxuXHR9XHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi91dGlscy9VdGlscy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvTG9jYWxTdG9yYWdlU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvRXJyb3JIYW5kbGVyU2VydmljZS50c1wiIC8+XHJcblxyXG5jbGFzcyBBcHBDb250cm9sbGVyIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckc3RhdGUnLCAnJHNjb3BlJywgJ0RhdGFQcm92aWRlclNlcnZpY2UnLCAnVXNlclNlcnZpY2UnLFxyXG5cdFx0JyRpb25pY1BsYXRmb3JtJywgJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCAnJGlvbmljUG9wdXAnLFxyXG5cdFx0JyRpb25pY0xvYWRpbmcnLCAnJGlvbmljSGlzdG9yeScsICdFcnJvckhhbmRsZXJTZXJ2aWNlJ107XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJvdGVjdGVkICRzdGF0ZTogYW5ndWxhci51aS5JU3RhdGVTZXJ2aWNlLFxyXG5cdFx0cHJvdGVjdGVkICRzY29wZTogbmcuSVNjb3BlLFxyXG5cdFx0cHJvdGVjdGVkIGRhdGFQcm92aWRlclNlcnZpY2U6IERhdGFQcm92aWRlclNlcnZpY2UsXHJcblx0XHRwcml2YXRlIHVzZXJTZXJ2aWNlOiBVc2VyU2VydmljZSxcclxuXHRcdHByaXZhdGUgJGlvbmljUGxhdGZvcm06IElvbmljLklQbGF0Zm9ybSxcclxuXHRcdHByaXZhdGUgbG9jYWxTdG9yYWdlU2VydmljZTogTG9jYWxTdG9yYWdlU2VydmljZSxcclxuXHRcdHByaXZhdGUgJGlvbmljUG9wdXA6IElvbmljLklQb3B1cCxcclxuXHRcdHByaXZhdGUgJGlvbmljTG9hZGluZzogSW9uaWMuSUxvYWRpbmcsXHJcblx0XHRwcml2YXRlICRpb25pY0hpc3Rvcnk6IGFueSxcclxuXHRcdHByaXZhdGUgZXJyb3JIYW5kbGVyU2VydmljZTogRXJyb3JIYW5kbGVyU2VydmljZSkge1xyXG5cdH1cclxuXHJcblx0aXNOb3RFbXB0eSh2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gVXRpbHMuaXNOb3RFbXB0eSh2YWx1ZSk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgaGFzTmV0d29ya0Nvbm5lY3Rpb24oKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gdGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLmhhc05ldHdvcmtDb25uZWN0aW9uKCk7XHJcblx0fVxyXG5cclxuXHRsb2dvdXQoKSB7XHJcblx0XHR0aGlzLiRpb25pY0hpc3RvcnkuY2xlYXJDYWNoZSgpO1xyXG5cdFx0dGhpcy51c2VyU2VydmljZS5sb2dvdXQoKTtcclxuXHRcdHRoaXMuJHN0YXRlLmdvKFwibG9naW5cIik7XHJcblx0fVxyXG5cclxuXHRnZXRVc2VyRGVmYXVsdFBhZ2UoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy51c2VyU2VydmljZS51c2VyUHJvZmlsZS51c2VySW5mby5kZWZhdWx0UGFnZTtcclxuXHR9XHJcblxyXG5cdHNob3dEYXNoYm9hcmQobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gdGhpcy51c2VyU2VydmljZS5zaG93RGFzaGJvYXJkKG5hbWUpO1xyXG5cdH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XHJcblxyXG5jbGFzcyBNaXNTZXJ2aWNlIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJyRxJ107XHJcblx0cHJpdmF0ZSBzZXJ2ZXJSZXF1ZXN0OiBudW1iZXI7XHJcblxyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlKSB7IH1cclxuXHJcblx0Z2V0TWV0cmljU25hcHNob3QgKHJlcWRhdGEpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL21ldHJpY3NuYXBzaG90JztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdH0sXHJcblx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdGdldFRhcmdldFZzQWN0dWFsIChyZXFkYXRhKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy90YXJnZXR2c2FjdHVhbCc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRSZXZlbnVlQW5hbHlzaXMgKHJlcWRhdGEpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3JldmVudWVhbmFseXNpcyc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRSb3V0ZVJldmVudWUgKHJlcWRhdGEpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3JvdXRlcmV2ZW51ZSc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRTZWN0b3JDYXJyaWVyQW5hbHlzaXMgKHJlcWRhdGEpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3NlY3RvcmNhcnJpZXJhbmFseXNpcyc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRQYXhGbG93bk1pc0hlYWRlciAocmVxZGF0YSk6IGFueSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvcGF4Zmxvd25taXNoZWFkZXInO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0Um91dGVSZXZlbnVlRHJpbGxEb3duIChyZXFkYXRhKXtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9yb3V0ZXJldmVudWVkcmlsbCc7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHR9LFxyXG5cdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRCYXJEcmlsbERvd24gKHJlcWRhdGEpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL21zcGF4bmV0cmV2ZHJpbGwnO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0fSxcclxuXHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0RHJpbGxEb3duIChyZXFkYXRhLCBVUkwpe1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9IFVSTDtcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0aWYoIXRoaXMuc2VydmVyUmVxdWVzdCl7XHJcblx0XHRcdHRoaXMuc2VydmVyUmVxdWVzdCA9IDE7XHJcblx0XHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHRcdFx0dGhpcy5zZXJ2ZXJSZXF1ZXN0ID0gMDtcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XHJcblxyXG5jbGFzcyBDaGFydG9wdGlvblNlcnZpY2Uge1xyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHJvb3RTY29wZSddO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCRyb290U2NvcGU6IG5nLklTY29wZSkgeyB9XHJcblxyXG4gICAgbGluZUNoYXJ0T3B0aW9ucygpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjaGFydDoge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2xpbmVDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IDUsXHJcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDUwLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogNTBcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXsgcmV0dXJuIGQueHZhbDsgfSxcclxuICAgICAgICAgICAgICAgIHk6IGZ1bmN0aW9uKGQpeyByZXR1cm4gZC55dmFsOyB9LFxyXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkaXNwYXRjaDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlQ2hhbmdlOiBmdW5jdGlvbihlKXsgY29uc29sZS5sb2coXCJzdGF0ZUNoYW5nZVwiKTsgfSxcclxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VTdGF0ZTogZnVuY3Rpb24oZSl7IGNvbnNvbGUubG9nKFwiY2hhbmdlU3RhdGVcIik7IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbHRpcFNob3c6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcInRvb2x0aXBTaG93XCIpOyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBIaWRlOiBmdW5jdGlvbihlKXsgY29uc29sZS5sb2coXCJ0b29sdGlwSGlkZVwiKTsgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGlja0Zvcm1hdDogZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMudGltZS5mb3JtYXQoJyViJykobmV3IERhdGUoZCkpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHlBeGlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICB0aWNrRm9ybWF0OiBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLjAyZicpKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsRGlzdGFuY2U6IC0xMFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTsgIFxyXG4gICAgfVxyXG5cclxuICAgIG11bHRpQmFyQ2hhcnRPcHRpb25zKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnbXVsdGlCYXJDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcclxuICAgICAgICAgICAgICAgIHdpZHRoOiAzMDAsXHJcbiAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAxMCxcclxuICAgICAgICAgICAgICAgICAgICByaWdodDogMjUsXHJcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiAzMCxcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiAyNVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNob3dMZWdlbmQgOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpe3JldHVybiBkLmxhYmVsO30sXHJcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXtyZXR1cm4gZC52YWx1ZSArICgxZS0xMCk7fSxcclxuICAgICAgICAgICAgICAgIHNob3dWYWx1ZXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICByZWR1Y2VYVGlja3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc2hvd0NvbnRyb2xzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHZhbHVlRm9ybWF0OiBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLC40ZicpKGQpO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsRGlzdGFuY2U6IDMwXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHNob3dYQXhpczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA3MDBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07ICBcclxuICAgIH1cclxuXHJcbiAgICBtZXRyaWNCYXJDaGFydE9wdGlvbnMobWlzQ3RybCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY3JldGVCYXJDaGFydCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDIwMCxcclxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IDIwLFxyXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiAyNSxcclxuICAgICAgICAgICAgICAgICAgICBib3R0b206IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMjVcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXtyZXR1cm4gZC5sYWJlbDt9LFxyXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWV9LFxyXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzaG93VmFsdWVzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdmFsdWVGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJywuMmYnKShkKTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB0b29sdGlwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNob3dZQXhpczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzaG93WEF4aXM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDcwMFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTsgIFxyXG4gICAgfVxyXG5cclxuICAgIHRhcmdldEJhckNoYXJ0T3B0aW9ucyhtaXNDdHJsKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgY2hhcnQ6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdkaXNjcmV0ZUJhckNoYXJ0JyxcclxuICAgICAgICAgICAgICAgIGhlaWdodDogMjUwLFxyXG4gICAgICAgICAgICAgICAgbWFyZ2luIDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvcDogMjAsXHJcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDUwLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogMjAsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogNzVcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB1c2VJbnRlcmFjdGl2ZUd1aWRlbGluZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpe3JldHVybiBkLmxhYmVsO30sXHJcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXtyZXR1cm4gZC52YWx1ZSArICgxZS0xMCk7fSxcclxuICAgICAgICAgICAgICAgIHNob3dWYWx1ZXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzaG93WUF4aXM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgdmFsdWVGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJywuMmYnKShkKTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNzAwXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9OyAgXHJcbiAgICB9XHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbmNsYXNzIEZpbHRlcmVkTGlzdFNlcnZpY2Uge1xyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFtdO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkgeyB9XHJcblxyXG4gICAgc2VhcmNoZWQgKHZhbExpc3RzLCB0b1NlYXJjaCwgbGV2ZWwsIGRyaWxsdHlwZSkge1xyXG4gICAgICByZXR1cm4gXy5maWx0ZXIodmFsTGlzdHMsIFxyXG4gICAgICAgIGZ1bmN0aW9uIChpKSB7XHJcbiAgICAgICAgICAvKiBTZWFyY2ggVGV4dCBpbiBhbGwgMyBmaWVsZHMgKi9cclxuICAgICAgICAgIHJldHVybiBzZWFyY2hVdGlsKGksIHRvU2VhcmNoLCBsZXZlbCwgZHJpbGx0eXBlKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwYWdlZCAodmFsTGlzdHMscGFnZVNpemUpIHtcclxuICAgICAgdmFyIHJldFZhbCA9IFtdO1xyXG4gICAgICBpZih2YWxMaXN0cyl7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWxMaXN0cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgaWYgKGkgJSBwYWdlU2l6ZSA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXRWYWxbTWF0aC5mbG9vcihpIC8gcGFnZVNpemUpXSA9IFt2YWxMaXN0c1tpXV07XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXRWYWxbTWF0aC5mbG9vcihpIC8gcGFnZVNpemUpXS5wdXNoKHZhbExpc3RzW2ldKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJldFZhbDtcclxuICAgIH1cclxuXHJcbiAgIFxyXG59XHJcbmZ1bmN0aW9uIHNlYXJjaFV0aWwoaXRlbSwgdG9TZWFyY2gsIGxldmVsLCBkcmlsbHR5cGUpIHtcclxuICAgIC8qIFNlYXJjaCBUZXh0IGluIGFsbCAzIGZpZWxkcyAqL1xyXG4gIGlmKGRyaWxsdHlwZSA9PSAncm91dGUnKSB7XHJcbiAgICBpZihpdGVtLmNvdW50cnlGcm9tICYmIGl0ZW0uY291bnRyeVRvICYmIGxldmVsID09IDApIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmNvdW50cnlGcm9tLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xIHx8IGl0ZW0uY291bnRyeVRvLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbS5mbG93blNlY3RvciAmJiBsZXZlbCA9PSAxKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbG93blNlY3Rvci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMikge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtWydkb2N1bWVudCMnXSAmJiBsZXZlbCA9PSAzKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbVsnZG9jdW1lbnQjJ10udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYoZHJpbGx0eXBlID09ICd0YXJnZXQnKSB7XHJcbiAgICBpZihpdGVtLnJvdXRldHlwZSAmJiBsZXZlbCA9PSAwKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5yb3V0ZXR5cGUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW0ucm91dGVjb2RlICYmIGxldmVsID09IDEpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLnJvdXRlY29kZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYoZHJpbGx0eXBlID09ICdiYXInKSB7XHJcbiAgICBpZihpdGVtLnJvdXRlQ29kZSAmJiBsZXZlbCA9PSAwKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5yb3V0ZUNvZGUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDIpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYoZHJpbGx0eXBlID09ICdmbGlnaHQtcHJvY2VzcycpIHtcclxuICAgIGlmKGl0ZW0uY291bnRyeUZyb20gJiYgaXRlbS5jb3VudHJ5VG8gJiYgbGV2ZWwgPT0gMCkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uY291bnRyeUZyb20udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgfHwgaXRlbS5jb3VudHJ5VG8udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDIpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfWVsc2UgaWYoaXRlbVsnY2FycmllckNvZGUjJ10gJiYgbGV2ZWwgPT0gMykge1xyXG4gICAgICByZXR1cm4gKGl0ZW1bJ2NhcnJpZXJDb2RlIyddLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZihkcmlsbHR5cGUgPT0gJ2ZsaWdodC1jb3VudCcpIHtcclxuICAgIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDApIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfWVsc2UgaWYoaXRlbVsnY2FycmllckNvZGUnXSAmJiBsZXZlbCA9PSAxKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbVsnY2FycmllckNvZGUnXS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYoZHJpbGx0eXBlID09ICdjb3Vwb24tY291bnQnKSB7XHJcbiAgICBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAwKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1lbHNlIGlmKGl0ZW1bJ2Zsb3duU2VjdG9yJ10gJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW1bJ2Zsb3duU2VjdG9yJ10udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmKGRyaWxsdHlwZSA9PSAnYW5hbHlzaXMnIHx8IGRyaWxsdHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jykge1xyXG4gICAgaWYoaXRlbS5yZWdpb25OYW1lICYmIGxldmVsID09IDApIHtcclxuICAgICAgcmV0dXJuIChpdGVtLnJlZ2lvbk5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmKGl0ZW0uY291bnRyeUZyb20gJiYgaXRlbS5jb3VudHJ5VG8gJiYgbGV2ZWwgPT0gMSkge1xyXG4gICAgICByZXR1cm4gKGl0ZW0uY291bnRyeUZyb20udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgfHwgaXRlbS5jb3VudHJ5VG8udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtLmZsb3duU2VjdG9yICYmIGxldmVsID09IDIpIHtcclxuICAgICAgcmV0dXJuIChpdGVtLmZsb3duU2VjdG9yLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAzKSB7XHJcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHNcIiAvPlxyXG5cclxuY2xhc3MgT3BlcmF0aW9uYWxTZXJ2aWNlIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJyRxJ107XHJcblx0cHJpdmF0ZSBzZXJ2ZXJSZXF1ZXN0OiBudW1iZXI7XHJcblxyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlKSB7IH1cclxuXHJcblx0Z2V0UGF4Rmxvd25PcHJIZWFkZXIocmVxZGF0YSk6IGFueSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5vcHIvcGF4Zmxvd25vcHJoZWFkZXInO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcclxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRPcHJGbGlnaHRQcm9jU3RhdHVzKHJlcWRhdGEpIHtcclxuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm9wci9mbGlnaHRwcm9jZXNzaW5nc3RhdHVzJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0T3ByRmxpZ2h0Q291bnRCeVJlYXNvbihyZXFkYXRhKSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5vcHIvZmxpZ2h0Y291bnRieXJlYXNvbic7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHRcdH0pO1xyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0Z2V0T3ByQ291cG9uQ291bnRCeUV4Y2VwdGlvbihyZXFkYXRhKSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5vcHIvY291cG9uY291bnRieWV4Y2VwdGlvbic7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxyXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcclxuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcblx0XHRcdH0pO1xyXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xyXG5cdH1cclxuXHRcclxuXHRnZXREcmlsbERvd24gKHJlcWRhdGEsIFVSTCl7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gVVJMO1xyXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XHJcblx0XHRpZighdGhpcy5zZXJ2ZXJSZXF1ZXN0KXtcclxuXHRcdFx0dGhpcy5zZXJ2ZXJSZXF1ZXN0ID0gMTtcclxuXHRcdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcclxuXHRcdFx0XHR0aGlzLnNlcnZlclJlcXVlc3QgPSAwO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9jb21tb24vc2VydmljZXMvTG9jYWxTdG9yYWdlU2VydmljZS50c1wiIC8+XHJcblxyXG5jbGFzcyBVc2VyU2VydmljZSB7XHJcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydEYXRhUHJvdmlkZXJTZXJ2aWNlJywgJyRxJywgJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCAnJHdpbmRvdyddO1xyXG5cdHB1YmxpYyB1c2VyUHJvZmlsZTogYW55O1xyXG5cdHB1YmxpYyBfdXNlcjogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHByaXZhdGUgbWVudUFjY2VzcyA9IFtdO1xyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLCBwcml2YXRlIGxvY2FsU3RvcmFnZVNlcnZpY2U6IExvY2FsU3RvcmFnZVNlcnZpY2UsIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcclxuXHJcblx0fVxyXG5cclxuXHRzZXRVc2VyKHVzZXIpIHtcclxuXHRcdGlmICh0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlKSB7XHJcblx0XHRcdHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicsIEpTT04uc3RyaW5naWZ5KHVzZXIpKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGxvZ291dCgpIHtcclxuXHRcdHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5zZXRPYmplY3QoJ3JhcGlkTW9iaWxlLnVzZXInLCBudWxsKTtcclxuXHRcdHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5zZXRPYmplY3QoJ3VzZXJQZXJtaXNzaW9uTWVudScsIFtdKTtcclxuXHRcdHRoaXMuX3VzZXIgPSBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGlzTG9nZ2VkSW4oKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fdXNlciA/IHRydWUgOiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGlzVXNlckxvZ2dlZEluKCk6IGJvb2xlYW4ge1xyXG5cdFx0aWYgKHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5nZXRPYmplY3QoJ3JhcGlkTW9iaWxlLnVzZXInLCAnJykgIT0gbnVsbCkge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGdldFVzZXIoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fdXNlcjtcclxuXHR9XHJcblxyXG5cdGxvZ2luKF91c2VyTmFtZTogc3RyaW5nLCBfcGFzc3dvcmQ6IHN0cmluZykge1xyXG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvdXNlci9sb2dpbic7XHJcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcclxuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xyXG5cdFx0XHR1c2VySWQ6IF91c2VyTmFtZSxcclxuXHRcdFx0cGFzc3dvcmQ6IF9wYXNzd29yZFxyXG5cdFx0fVxyXG5cdFx0dGhpcy5zZXRVc2VyKHsgdXNlcm5hbWU6IFwiXCIgfSk7XHJcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxdWVzdE9iaikudGhlbihcclxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnb2JqZWN0Jykge1xyXG5cdFx0XHRcdFx0dGhpcy5fdXNlciA9IHRydWU7XHJcblx0XHRcdFx0XHRkZWYucmVzb2x2ZShyZXNwb25zZS5kYXRhKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0ZGVmLnJlamVjdChyZXNwb25zZS5kYXRhKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHRcdChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkIG9uIGxvZyBpbicpO1xyXG5cdFx0XHRcdGRlZi5yZWplY3QoZXJyb3IpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRnZXRVc2VyUHJvZmlsZShyZXFkYXRhKSB7XHJcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy91c2VyL3VzZXJwcm9maWxlJztcclxuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xyXG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXHJcblx0XHRcdChyZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcclxuXHRcdFx0XHRcdHRoaXMudXNlclByb2ZpbGUgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmRhdGE7XHJcblx0XHRcdFx0XHR0aGlzLmxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0T2JqZWN0KCd1c2VyUGVybWlzc2lvbk1lbnUnLCB0aGlzLnVzZXJQcm9maWxlLm1lbnVBY2Nlc3MpO1xyXG5cdFx0XHRcdFx0ZGVmLnJlc29sdmUocmVzcG9uc2UuZGF0YSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGRlZi5yZWplY3QocmVzcG9uc2UuZGF0YSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCBvbiBVc2VyUHJvZmlsZScpO1xyXG5cdFx0XHRcdGRlZi5yZWplY3QoZXJyb3IpO1xyXG5cdFx0XHR9KTtcclxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcclxuXHR9XHJcblxyXG5cdHNob3dEYXNoYm9hcmQobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRpZiAodGhpcy5pc1VzZXJMb2dnZWRJbigpKSB7XHJcblx0XHRcdGlmICh0eXBlb2YgdGhpcy51c2VyUHJvZmlsZSA9PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdHZhciBkYXRhID0gdGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldE9iamVjdCgndXNlclBlcm1pc3Npb25NZW51JywgJycpO1xyXG5cdFx0XHRcdHRoaXMubWVudUFjY2VzcyA9IGRhdGE7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5tZW51QWNjZXNzID0gdGhpcy51c2VyUHJvZmlsZS5tZW51QWNjZXNzO1xyXG5cdFx0XHR9XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tZW51QWNjZXNzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKHRoaXMubWVudUFjY2Vzc1tpXS5tZW51TmFtZSA9PSBuYW1lKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5tZW51QWNjZXNzW2ldLm1lbnVBY2Nlc3M7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5pc1VzZXJMb2dnZWRJbigpO1xyXG5cdFx0fVxyXG5cdH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbXBvbmVudHMvbWlzL3NlcnZpY2VzL0ZpbHRlcmVkTGlzdFNlcnZpY2UudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbXBvbmVudHMvdXNlci9zZXJ2aWNlcy9Vc2VyU2VydmljZS50c1wiIC8+XHJcblxyXG5cclxuXHJcbmludGVyZmFjZSB0YWJPYmplY3Qge1xyXG4gICAgdGl0bGU6IHN0cmluZyxcclxuICAgIG5hbWVzOiBzdHJpbmcsXHJcbiAgICBpY29uOiBzdHJpbmdcclxufVxyXG5cclxuaW50ZXJmYWNlIHRvZ2dsZU9iamVjdCB7XHJcbiAgICBtb250aE9yWWVhcjogc3RyaW5nLFxyXG4gICAgdGFyZ2V0UmV2T3JQYXg6IHN0cmluZyxcclxuICAgIHNlY3Rvck9yZGVyOiBzdHJpbmcsXHJcbiAgICBzZWN0b3JSZXZPclBheDogc3RyaW5nLFxyXG4gICAgY2hhcnRPclRhYmxlOiBzdHJpbmcsXHJcbiAgICB0YXJnZXRWaWV3OiBzdHJpbmcsXHJcbiAgICByZXZlbnVlVmlldzogc3RyaW5nLFxyXG4gICAgc2VjdG9yVmlldzogc3RyaW5nXHJcbn1cclxuXHJcbmludGVyZmFjZSBoZWFkZXJPYmplY3Qge1xyXG4gICAgZmxvd25Nb250aDogc3RyaW5nLFxyXG4gICAgc3VyY2hhcmdlOiBib29sZWFuLFxyXG4gICAgdGFiSW5kZXg6IG51bWJlcixcclxuICAgIGhlYWRlckluZGV4OiBudW1iZXIsXHJcbiAgICB1c2VybmFtZTogc3RyaW5nXHJcbn1cclxuXHJcbmNsYXNzIE1pc0NvbnRyb2xsZXJ7XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckc3RhdGUnLCAnJHNjb3BlJywgJyRpb25pY0xvYWRpbmcnLCAnJHRpbWVvdXQnLCAnJHdpbmRvdycsICckaW9uaWNQb3BvdmVyJyxcclxuICAgICAgICAnJGZpbHRlcicsICdNaXNTZXJ2aWNlJywgJ0NoYXJ0b3B0aW9uU2VydmljZScsICdGaWx0ZXJlZExpc3RTZXJ2aWNlJywgJ1VzZXJTZXJ2aWNlJywgJyRpb25pY0hpc3RvcnknLCAnUmVwb3J0U3ZjJywgJ0dSQVBIX0NPTE9SUycsICdUQUJTJywgJyRpb25pY1BvcHVwJ107XHJcblxyXG4gICAgcHJpdmF0ZSB0YWJzOiBbdGFiT2JqZWN0XTtcclxuICAgIHByaXZhdGUgdG9nZ2xlOiB0b2dnbGVPYmplY3Q7XHJcbiAgICBwcml2YXRlIGhlYWRlcjogaGVhZGVyT2JqZWN0O1xyXG4gICAgcHJpdmF0ZSBzdWJIZWFkZXI6IGFueTtcclxuICAgIHByaXZhdGUgb3B0aW9uczogYW55O1xyXG4gICAgcHJpdmF0ZSBkcmlsbHRhYnM6IHN0cmluZ1tdO1xyXG4gICAgXHJcbiAgICBwcml2YXRlIHBhZ2VTaXplID0gNDtcclxuICAgIHByaXZhdGUgY3VycmVudFBhZ2UgPSBbXTtcclxuICAgIHByaXZhdGUgc2VsZWN0ZWREcmlsbCA9IFtdO1xyXG4gICAgcHJpdmF0ZSBncm91cHMgPSBbXTtcclxuXHJcbiAgICBwcml2YXRlIGluZm9wb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcclxuICAgIHByaXZhdGUgZHJpbGxwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcclxuICAgIHByaXZhdGUgZ3JhcGhwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcclxuICAgIHByaXZhdGUgZHJpbGxCYXJwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcclxuXHJcbiAgICBwcml2YXRlIGluZm9kYXRhOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIHJlZ2lvbk5hbWU6IHN0cmluZztcclxuICAgIHByaXZhdGUgY2hhcnRUeXBlOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIGdyYXBoSW5kZXg6IG51bWJlcjtcclxuICAgIHByaXZhdGUgY29sdW1uVG9PcmRlcjogc3RyaW5nO1xyXG4gICAgcHJpdmF0ZSBzaG93bkdyb3VwOiBudW1iZXI7XHJcblxyXG4gICAgcHJpdmF0ZSBtZXRyaWNSZXN1bHQ6IGFueTtcclxuICAgIHByaXZhdGUgbWV0cmljTGVnZW5kczogYW55O1xyXG4gICAgcHJpdmF0ZSBmYXZNZXRyaWNSZXN1bHQ6IGFueTtcclxuXHJcbiAgICBwcml2YXRlIHRhcmdldEFjdHVhbERhdGE6IGFueTtcclxuICAgIHByaXZhdGUgZmF2VGFyZ2V0QmFyUmVzdWx0OiBhbnk7XHJcbiAgICBwcml2YXRlIGZhdlRhcmdldExpbmVSZXN1bHQ6IGFueTtcclxuXHJcbiAgICBwcml2YXRlIHJvdXRlUmV2RGF0YTogYW55O1xyXG5cclxuICAgIHByaXZhdGUgcmV2ZW51ZURhdGE6IGFueTtcclxuICAgIHByaXZhdGUgU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzOiBhbnk7XHJcbiAgICBwcml2YXRlIHBvcG92ZXJzaG93bjogYm9vbGVhbjtcclxuICAgIHByaXZhdGUgZHJpbGxUeXBlOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIGRyaWxsQmFyTGFiZWw6IHN0cmluZztcclxuICAgIHByaXZhdGUgZHJpbGxOYW1lOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIGZpcnN0Q29sdW1uczogc3RyaW5nW107XHJcbiAgICBcclxuICAgIHByaXZhdGUgdGhhdDogYW55O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgJHN0YXRlOiBhbmd1bGFyLnVpLklTdGF0ZVNlcnZpY2UsIHByaXZhdGUgJHNjb3BlOiBuZy5JU2NvcGUsXHJcbiAgICAgICAgcHJpdmF0ZSAkaW9uaWNMb2FkaW5nOiBJb25pYy5JTG9hZGluZywgcHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLFxyXG4gICAgICAgIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsIHByaXZhdGUgJGlvbmljUG9wb3ZlcjogSW9uaWMuSVBvcG92ZXIsXHJcbiAgICAgICAgcHJpdmF0ZSAkZmlsdGVyOiBuZy5JRmlsdGVyU2VydmljZSwgcHJpdmF0ZSBtaXNTZXJ2aWNlOiBNaXNTZXJ2aWNlLFxyXG4gICAgICAgIHByaXZhdGUgY2hhcnRvcHRpb25TZXJ2aWNlOiBDaGFydG9wdGlvblNlcnZpY2UsIHByaXZhdGUgZmlsdGVyZWRMaXN0U2VydmljZTogRmlsdGVyZWRMaXN0U2VydmljZSxcclxuICAgICAgICBwcml2YXRlIHVzZXJTZXJ2aWNlOiBVc2VyU2VydmljZSwgcHJpdmF0ZSAkaW9uaWNIaXN0b3J5OiBhbnksIHByaXZhdGUgcmVwb3J0U3ZjOiBSZXBvcnRTdmMsIHByaXZhdGUgR1JBUEhfQ09MT1JTOiBzdHJpbmcsIHByaXZhdGUgVEFCUzogc3RyaW5nLCBwcml2YXRlICRpb25pY1BvcHVwOiBJb25pYy5JUG9wdXApIHtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRhYnMgPSB0aGlzLlRBQlMuREIxX1RBQlM7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRvZ2dsZSA9IHtcclxuICAgICAgICAgICAgICAgIG1vbnRoT3JZZWFyIDogJ21vbnRoJyxcclxuICAgICAgICAgICAgICAgIHRhcmdldFJldk9yUGF4OiAncmV2ZW51ZScsXHJcbiAgICAgICAgICAgICAgICBzZWN0b3JPcmRlcjogJ3RvcDUnLFxyXG4gICAgICAgICAgICAgICAgc2VjdG9yUmV2T3JQYXg6ICdyZXZlbnVlJyxcclxuICAgICAgICAgICAgICAgIGNoYXJ0T3JUYWJsZTogJ2NoYXJ0JyxcclxuICAgICAgICAgICAgICAgIHRhcmdldFZpZXc6ICdjaGFydCcsXHJcbiAgICAgICAgICAgICAgICByZXZlbnVlVmlldzogJ2NoYXJ0JyxcclxuICAgICAgICAgICAgICAgIHNlY3RvclZpZXc6ICdjaGFydCdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmhlYWRlciA9IHtcclxuICAgICAgICAgICAgICAgIGZsb3duTW9udGg6ICcnLFxyXG4gICAgICAgICAgICAgICAgc3VyY2hhcmdlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHRhYkluZGV4OiAwLFxyXG4gICAgICAgICAgICAgICAgaGVhZGVySW5kZXg6IDAsXHJcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogJydcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIC8qXHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpLmJpbmQoJ29yaWVudGF0aW9uY2hhbmdlJywgZnVuY3Rpb24gKGUsIHNjb3BlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXh9KTtcclxuICAgICAgICAgICAgfSk7ICovXHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpLmJpbmQoJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5vcmllbnRhdGlvbkNoYW5nZSk7IFxyXG4gICAgICAgIFxyXG4gICAgICAgICAgICAvL3RoaXMuJHNjb3BlLiR3YXRjaCgnTWlzQ3RybC5oZWFkZXIuc3VyY2hhcmdlJywgKCkgPT4geyB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDp0aGlzLmhlYWRlci50YWJJbmRleH0pOyB9LCB0cnVlKTtcclxuICAgICAgICAgICAgdGhpcy5pbml0RGF0YSgpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCdvblNsaWRlTW92ZScsIChldmVudDogYW55LCByZXNwb25zZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9uU2xpZGVNb3ZlKHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCckaW9uaWNWaWV3LmVudGVyJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFzZWxmLnVzZXJTZXJ2aWNlLnNob3dEYXNoYm9hcmQoJ01JUycpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kc3RhdGUuZ28oXCJsb2dpblwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kb24oJ29wZW5EcmlsbFBvcHVwJywgKGV2ZW50OiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS50eXBlID09ICdtZXRyaWMnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuTWlzQ3RybC5vcGVuQmFyRHJpbGxEb3duUG9wb3ZlcihyZXNwb25zZS5ldmVudCwgeyBcInBvaW50XCI6IHJlc3BvbnNlLmRhdGEgfSwgLTEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ3RhcmdldCcpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9wZW5UYXJnZXREcmlsbERvd25Qb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jykge1xyXG4gICAgICAgICAgICAgICAgICAgLy8gdGhpcy4kc2NvcGUuTWlzQ3RybC5vcGVuUmV2ZW51ZVBhc3NlbmdlckRyaWxsRG93blBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpbml0RGF0YSgpIHtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvaW5mb3Rvb2x0aXAuaHRtbCcsIHtcclxuICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXHJcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbihpbmZvcG9wb3Zlcikge1xyXG4gICAgICAgICAgICB0aGF0LmluZm9wb3BvdmVyID0gaW5mb3BvcG92ZXI7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL2RyaWxkb3duLmh0bWwnLCB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oZHJpbGxwb3BvdmVyKSB7XHJcbiAgICAgICAgICAgIHRoYXQuZHJpbGxwb3BvdmVyID0gZHJpbGxwb3BvdmVyO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL2JhcmRyaWxkb3duLmh0bWwnLCB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oZHJpbGxCYXJwb3BvdmVyKSB7XHJcbiAgICAgICAgICAgIHRoYXQuZHJpbGxCYXJwb3BvdmVyID0gZHJpbGxCYXJwb3BvdmVyO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLm9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIG1ldHJpYzogdGhpcy5jaGFydG9wdGlvblNlcnZpY2UubWV0cmljQmFyQ2hhcnRPcHRpb25zKHRoaXMpLFxyXG4gICAgICAgICAgICB0YXJnZXRMaW5lQ2hhcnQ6IHRoaXMuY2hhcnRvcHRpb25TZXJ2aWNlLmxpbmVDaGFydE9wdGlvbnMoKSxcclxuICAgICAgICAgICAgdGFyZ2V0QmFyQ2hhcnQ6IHRoaXMuY2hhcnRvcHRpb25TZXJ2aWNlLnRhcmdldEJhckNoYXJ0T3B0aW9ucyh0aGlzKSxcclxuICAgICAgICAgICAgcGFzc2VuZ2VyQ2hhcnQ6IHRoaXMuY2hhcnRvcHRpb25TZXJ2aWNlLm11bHRpQmFyQ2hhcnRPcHRpb25zKClcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgcmVxID0ge1xyXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihyZXEudXNlcklkICE9IFwibnVsbFwiKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRQYXhGbG93bk1pc0hlYWRlcihyZXEpLnRoZW4oXHJcbiAgICAgICAgICAgICAgICAoZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuc3ViSGVhZGVyID0gZGF0YS5yZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuaGVhZGVyLmZsb3duTW9udGggPSB0aGF0LnN1YkhlYWRlci5wYXhGbG93bk1pc01vbnRoc1swXS5mbG93TW9udGg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQub25TbGlkZU1vdmUoeyBpbmRleDogMCB9KTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cdFxyXG5cdFx0dGhhdC5oZWFkZXIudXNlcm5hbWUgPSB0aGF0LmdldFByb2ZpbGVVc2VyTmFtZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFByb2ZpbGVVc2VyTmFtZSgpOiBzdHJpbmcge1xyXG4gICAgICAgIGlmICh0aGlzLnVzZXJTZXJ2aWNlLmlzVXNlckxvZ2dlZEluKCkpIHtcclxuICAgICAgICAgICAgdmFyIG9iaiA9IHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicpO1xyXG4gICAgICAgICAgICBpZiAob2JqICE9ICdudWxsJykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHByb2ZpbGVVc2VyTmFtZSA9IEpTT04ucGFyc2Uob2JqKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9maWxlVXNlck5hbWUudXNlcm5hbWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZWN0ZWRGbG93bk1vbnRoKG1vbnRoOiBzdHJpbmcpe1xyXG4gICAgICAgIHJldHVybiAobW9udGggPT0gdGhpcy5oZWFkZXIuZmxvd25Nb250aCk7XHJcbiAgICB9XHJcbiAgICBvcmllbnRhdGlvbkNoYW5nZSA9ICgpOiBib29sZWFuID0+IHtcclxuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xyXG4gICAgfSBcclxuICAgIG9wZW5pbmZvUG9wb3ZlciAoJGV2ZW50LCBpbmRleCkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgaW5kZXggPT0gXCJ1bmRlZmluZWRcIiB8fCBpbmRleCA9PSBcIlwiKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5mb2RhdGEgPSAnTm8gaW5mbyBhdmFpbGFibGUnO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICB0aGlzLmluZm9kYXRhPWluZGV4O1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zb2xlLmxvZyhpbmRleCk7XHJcbiAgICAgICAgdGhpcy5pbmZvcG9wb3Zlci5zaG93KCRldmVudCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNsb3NlUG9wb3ZlcigpIHtcclxuICAgICAgICB0aGlzLmdyYXBocG9wb3Zlci5oaWRlKCk7XHJcbiAgICB9O1xyXG4gICAgY2xvc2VzQmFyUG9wb3Zlcigpe1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLmhpZGUoKTtcclxuICAgIH1cclxuICAgIGNsb3NlSW5mb1BvcG92ZXIoKSB7XHJcbiAgICAgICAgdGhpcy5pbmZvcG9wb3Zlci5oaWRlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlSGVhZGVyKCkge1xyXG5cdFx0dmFyIGZsb3duTW9udGggPSB0aGlzLmhlYWRlci5mbG93bk1vbnRoO1xyXG4gICAgICAgIHRoaXMuaGVhZGVyLmhlYWRlckluZGV4ID0gXy5maW5kSW5kZXgodGhpcy5zdWJIZWFkZXIucGF4Rmxvd25NaXNNb250aHMsIGZ1bmN0aW9uKGNocjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjaHIuZmxvd01vbnRoID09IGZsb3duTW9udGg7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc29sZS5sb2codGhpcy5oZWFkZXIuaGVhZGVySW5kZXgpO1xyXG5cdFx0dGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6IHRoaXMuaGVhZGVyLmhlYWRlckluZGV4fSk7XHJcbiAgICB9XHJcblxyXG4gICAgb25TbGlkZU1vdmUoZGF0YTogYW55KSB7XHJcbiAgICAgICAgdGhpcy5oZWFkZXIudGFiSW5kZXggPSBkYXRhLmluZGV4O1xyXG5cdFx0dGhpcy50b2dnbGUuY2hhcnRPclRhYmxlID0gXCJjaGFydFwiO1xyXG4gICAgICAgIHN3aXRjaCh0aGlzLmhlYWRlci50YWJJbmRleCl7XHJcbiAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgdGhpcy5nZXRGbG93bkZhdm9yaXRlcygpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICB0aGlzLmNhbGxNZXRyaWNTbmFwc2hvdCgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICB0aGlzLmNhbGxUYXJnZXRWc0FjdHVhbCgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICB0aGlzLmNhbGxSZXZlbnVlQW5hbHlzaXMoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgNDpcclxuICAgICAgICAgICAgdGhpcy5jYWxsU2VjdG9yQ2FycmllckFuYWx5c2lzKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDU6XHJcbiAgICAgICAgICAgIHRoaXMuY2FsbFJvdXRlUmV2ZW51ZSgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHRvZ2dsZU1ldHJpYyAodmFsKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUubW9udGhPclllYXIgPSB2YWw7XHJcbiAgICAgICAgdGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4fSk7XHJcbiAgICB9XHJcbiAgICB0b2dnbGVTdXJjaGFyZ2UoKSB7XHJcbiAgICAgICAgdGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6dGhpcy5oZWFkZXIudGFiSW5kZXh9KTtcclxuICAgIH1cclxuICAgIHRvZ2dsZVRhcmdldCh2YWwpIHtcclxuICAgICAgICB0aGlzLnRvZ2dsZS50YXJnZXRSZXZPclBheCA9IHZhbDtcclxuICAgIH1cclxuXHJcbiAgICB0b2dnbGVTZWN0b3IodmFsKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUuc2VjdG9yUmV2T3JQYXggPSB2YWw7XHJcbiAgICB9XHJcblxyXG4gICAgY2FsbE1ldHJpY1NuYXBzaG90KCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICB0b2dnbGUxOiB0aGlzLnRvZ2dsZS5tb250aE9yWWVhcixcclxuICAgICAgICAgICAgZnVsbERhdGFGbGFnOiAnTidcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRNZXRyaWNTbmFwc2hvdChyZXFkYXRhKVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcclxuXHRcdFx0XHQvLyBmYXYgSXRlbXMgdG8gZGlzcGxheSBpbiBkYXNoYm9hcmRcclxuXHRcdFx0XHR0aGF0Lm1ldHJpY1Jlc3VsdCAgPSBfLnNvcnRCeShkYXRhLnJlc3BvbnNlLmRhdGEubWV0cmljU25hcHNob3RDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xyXG5cdFx0XHRcdFx0aWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Xy5mb3JFYWNoKHRoYXQubWV0cmljUmVzdWx0LCBmdW5jdGlvbiAobjogYW55LCB2YWx1ZTogYW55KSB7XHJcblx0XHRcdFx0XHRuLnZhbHVlc1swXS5jb2xvciA9IHRoYXQuR1JBUEhfQ09MT1JTLk1FVFJJQ1swXTtcclxuXHRcdFx0XHRcdG4udmFsdWVzWzFdLmNvbG9yID0gdGhhdC5HUkFQSF9DT0xPUlMuTUVUUklDWzFdO1xyXG5cdFx0XHRcdFx0aWYobi52YWx1ZXNbMl0pIG4udmFsdWVzWzJdLmNvbG9yID0gdGhhdC5HUkFQSF9DT0xPUlMuTUVUUklDWzJdO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHR0aGF0LmZhdk1ldHJpY1Jlc3VsdCA9IF8uZmlsdGVyKHRoYXQubWV0cmljUmVzdWx0LCBmdW5jdGlvbih1OiBhbnkpIHtcclxuXHRcdFx0XHRcdGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0aGF0Lm1ldHJpY0xlZ2VuZHMgPSBkYXRhLnJlc3BvbnNlLmRhdGEubGVnZW5kcztcclxuXHRcdFx0XHRpZih0aGF0LmhlYWRlci50YWJJbmRleCA9PSAwKSB7XHJcblx0XHRcdFx0XHR0aGF0Lm1ldHJpY1Jlc3VsdCA9IHRoYXQuZmF2TWV0cmljUmVzdWx0O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuXHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0ICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcclxuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxyXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQhISEnXHJcblx0XHRcdFx0ICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xyXG5cdFx0XHRcdFx0ICBjb25zb2xlLmxvZygnZG9uZScpO1xyXG5cdFx0XHRcdCAgfSk7XHJcblx0XHRcdH1cclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxUYXJnZXRWc0FjdHVhbCgpIHtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcclxuICAgICAgICAgICAgdXNlcklkOiB0aGlzLmhlYWRlci51c2VybmFtZSxcclxuICAgICAgICAgICAgdG9nZ2xlMTogJycsXHJcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJydcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cclxuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0VGFyZ2V0VnNBY3R1YWwocmVxZGF0YSlcclxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdGlmKGRhdGEucmVzcG9uc2Uuc3RhdHVzID09PSBcInN1Y2Nlc3NcIil7XHJcblx0XHRcdFx0Ly8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXHJcblx0XHRcdFx0dGhhdC5mYXZUYXJnZXRMaW5lUmVzdWx0ID0gXy5maWx0ZXIoZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuXHRcdFx0XHRcdGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0aGF0LmZhdlRhcmdldEJhclJlc3VsdCA9IF8uZmlsdGVyKGRhdGEucmVzcG9uc2UuZGF0YS52ZXJCYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuXHRcdFx0XHRcdGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRfLmZvckVhY2goZGF0YS5yZXNwb25zZS5kYXRhLnZlckJhckNoYXJ0cywgZnVuY3Rpb24gKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG5cdFx0XHRcdFx0bi52YWx1ZXNbMF0uY29sb3IgPSB0aGF0LkdSQVBIX0NPTE9SUy52ZXJCYXJDaGFydHNbMF07XHJcblx0XHRcdFx0XHRuLnZhbHVlc1sxXS5jb2xvciA9IHRoYXQuR1JBUEhfQ09MT1JTLnZlckJhckNoYXJ0c1sxXTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0dmFyIGxpbmVDb2xvcnMgPSBbe1wiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuTElORVswXSwgXCJjbGFzc2VkXCI6IFwiZGFzaGVkXCIsXCJzdHJva2VXaWR0aFwiOiAyfSxcclxuXHRcdFx0XHR7XCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5MSU5FWzFdfSx7XCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5MSU5FWzJdLCBcImFyZWFcIiA6IHRydWUsIFwiZGlzYWJsZWRcIjogdHJ1ZX1dO1xyXG5cclxuXHRcdFx0XHRfLmZvckVhY2goZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHMsIGZ1bmN0aW9uIChuOiBhbnksIHZhbHVlOiBhbnkpIHtcclxuXHRcdFx0XHRcdF8ubWVyZ2Uobi5saW5lQ2hhcnRJdGVtcywgbGluZUNvbG9ycyk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGRhdGEucmVzcG9uc2UuZGF0YS5saW5lQ2hhcnRzKTtcclxuXHJcblx0XHRcdFx0dGhhdC50YXJnZXRBY3R1YWxEYXRhID0ge1xyXG5cdFx0XHRcdFx0aG9yQmFyQ2hhcnQ6IGRhdGEucmVzcG9uc2UuZGF0YS52ZXJCYXJDaGFydHMsXHJcblx0XHRcdFx0XHRsaW5lQ2hhcnQ6IGRhdGEucmVzcG9uc2UuZGF0YS5saW5lQ2hhcnRzXHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdH1lbHNle1xyXG5cdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0XHRcdCAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XHJcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcclxuXHRcdFx0XHRcdGNvbnRlbnQ6ICdObyBEYXRhIEZvdW5kISEhJ1xyXG5cdFx0XHRcdCAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcclxuXHRcdFx0XHRcdCAgY29uc29sZS5sb2coJ2RvbmUnKTtcclxuXHRcdFx0XHQgIH0pO1xyXG5cdFx0XHR9XHJcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjYWxsUm91dGVSZXZlbnVlKCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB2YXIgcm91dGVSZXZSZXF1ZXN0ID0ge1xyXG4gICAgICAgICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXHJcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWVcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRSb3V0ZVJldmVudWUocm91dGVSZXZSZXF1ZXN0KVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcclxuXHRcdFx0XHR0aGF0LnJvdXRlUmV2RGF0YSA9IGRhdGEucmVzcG9uc2UuZGF0YTtcclxuXHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0ICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcclxuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxyXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQhISEnXHJcblx0XHRcdFx0ICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xyXG5cdFx0XHRcdFx0ICBjb25zb2xlLmxvZygnZG9uZScpO1xyXG5cdFx0XHRcdCAgfSk7XHJcblx0XHRcdH1cclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGNhbGxSZXZlbnVlQW5hbHlzaXMoKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICAgICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXHJcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgIHRvZ2dsZTE6ICcnLFxyXG4gICAgICAgICAgICBmdWxsRGF0YUZsYWc6ICcnXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0UmV2ZW51ZUFuYWx5c2lzKHJlcWRhdGEpXHJcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0XHRpZihkYXRhLnJlc3BvbnNlLnN0YXR1cyA9PT0gXCJzdWNjZXNzXCIpe1xyXG5cdFx0XHRcdC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxyXG5cdFx0XHRcdHZhciBqc29uT2JqID0gZGF0YS5yZXNwb25zZS5kYXRhO1xyXG5cdFx0XHRcdHZhciBzb3J0ZWREYXRhID0gXy5zb3J0QnkoanNvbk9iai5tdWx0aWJhckNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7IFxyXG5cdFx0XHRcdFx0aWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR2YXIgZmF2UmV2ZW51ZUJhclJlc3VsdCA9IF8uZmlsdGVyKHNvcnRlZERhdGEsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuXHRcdFx0XHRcdGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR2YXIgc29ydGVkRGF0YSA9IF8uc29ydEJ5KGpzb25PYmoucGllQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHsgXHJcblx0XHRcdFx0XHRpZiAodSkgcmV0dXJuIFt1LmZhdm9yaXRlQ2hhcnRQb3NpdGlvbl07IFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHZhciBmYXZSZXZlbnVlUGllUmVzdWx0ID0gXy5maWx0ZXIoc29ydGVkRGF0YSwgZnVuY3Rpb24odTogYW55KSB7IFxyXG5cdFx0XHRcdFx0aWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHR2YXIgYmFyQ29sb3JzID0gW3RoYXQuR1JBUEhfQ09MT1JTLkJBUlswXSwgdGhhdC5HUkFQSF9DT0xPUlMuQkFSWzFdXTtcclxuXHRcdFx0XHRfLm1lcmdlKGpzb25PYmoubXVsdGliYXJDaGFydHNbMV0sIGJhckNvbG9ycyk7XHJcblx0XHRcdFx0Xy5mb3JFYWNoKGpzb25PYmoubXVsdGliYXJDaGFydHMsIGZ1bmN0aW9uKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG5cdFx0XHRcdFx0bi5jb2xvciA9IGJhckNvbG9yc1t2YWx1ZV07XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHZhciBwaWVDb2xvcnMgPSBbe1wiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuUElFWzBdfSx7XCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5QSUVbMV19LHtcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLlBJRVsyXX1dO1xyXG5cdFx0XHRcdF8uZm9yRWFjaChqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCBmdW5jdGlvbiAobjogYW55LCB2YWx1ZTogYW55KSB7XHJcblx0XHRcdFx0XHRuLmxhYmVsID0gbi54dmFsO1xyXG5cdFx0XHRcdFx0bi52YWx1ZSA9IG4ueXZhbDtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Xy5tZXJnZShqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCBwaWVDb2xvcnMpO1xyXG5cclxuXHRcdFx0XHR0aGF0LnJldmVudWVEYXRhID0ge1xyXG5cdFx0XHRcdFx0cmV2ZW51ZVBpZUNoYXJ0IDoganNvbk9iai5waWVDaGFydHNbMF0sXHJcblx0XHRcdFx0XHRyZXZlbnVlQmFyQ2hhcnQgOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzFdLm11bHRpYmFyQ2hhcnRJdGVtcyxcclxuXHRcdFx0XHRcdHJldmVudWVIb3JCYXJDaGFydCA6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMl0ubXVsdGliYXJDaGFydEl0ZW1zXHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuXHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0ICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcclxuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxyXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQhISEnXHJcblx0XHRcdFx0ICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xyXG5cdFx0XHRcdFx0ICBjb25zb2xlLmxvZygnZG9uZScpO1xyXG5cdFx0XHRcdCAgfSk7XHJcblx0XHRcdH1cclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG9wZW5EcmlsbERvd24ocmVnaW9uRGF0YSxzZWxGaW5kTGV2ZWwpIHtcclxuICAgICAgICBzZWxGaW5kTGV2ZWwgPSBOdW1iZXIoc2VsRmluZExldmVsKTtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbF0gPSByZWdpb25EYXRhO1xyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWwgKyAxXSA9ICcnO1xyXG4gICAgICAgIGlmKHNlbEZpbmRMZXZlbCAhPSAnMycpIHtcclxuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgICAgICAgIHRoaXMucmVnaW9uTmFtZSA9IChyZWdpb25EYXRhLnJlZ2lvbk5hbWUpID8gcmVnaW9uRGF0YS5yZWdpb25OYW1lIDogcmVnaW9uRGF0YS5jaGFydE5hbWU7XHJcbiAgICAgICAgICAgIHZhciBjb3VudHJ5RnJvbVRvID0gKHJlZ2lvbkRhdGEuY291bnRyeUZyb20gJiYgcmVnaW9uRGF0YS5jb3VudHJ5VG8pID8gcmVnaW9uRGF0YS5jb3VudHJ5RnJvbSArICctJyArIHJlZ2lvbkRhdGEuY291bnRyeVRvIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIHNlY3RvckZyb21UbyA9IChyZWdpb25EYXRhLmZsb3duU2VjdG9yICYmIGRyaWxsTGV2ZWwgPj0gMykgPyByZWdpb25EYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIGZsaWdodE51bWJlciA9IChyZWdpb25EYXRhLmZsaWdodE51bWJlciAmJiBkcmlsbExldmVsID09IDQpID8gcmVnaW9uRGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xyXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHJcbiAgICAgICAgICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXHJcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICAgICAgICAgIFwicmVnaW9uTmFtZVwiOiAodGhpcy5yZWdpb25OYW1lKT8gdGhpcy5yZWdpb25OYW1lIDogXCJOb3J0aCBBbWVyaWNhXCIsXHJcbiAgICAgICAgICAgICAgICBcImNvdW50cnlGcm9tVG9cIjogY291bnRyeUZyb21UbyxcclxuICAgICAgICAgICAgICAgIFwic2VjdG9yRnJvbVRvXCI6IHNlY3RvckZyb21UbyxcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiAwXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlRHJpbGxEb3duKHJlcWRhdGEpXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBkYXRhLnJlc3BvbnNlO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgZmluZExldmVsID0gZHJpbGxMZXZlbCAtIDE7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhLnN0YXR1cyk7XHJcbiAgICAgICAgICAgICAgICBpZihkYXRhLnN0YXR1cyA9PSAnc3VjY2Vzcycpe1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSBkYXRhLmRhdGEucm93cztcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gZGF0YS5kYXRhLnJvd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuc29ydCgncGF4Q291bnQnLGZpbmRMZXZlbCxmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGRyaWxsTGV2ZWwpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuY2xlYXJEcmlsbChmaW5kTGV2ZWwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LGZ1bmN0aW9uKGVycm9yKXtcclxuICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhhdC5jbG9zZXNQb3BvdmVyKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgICAgICBhbGVydCgnU2VydmVyIEVycm9yJyk7XHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICB9IFxyXG4gICAgfVxyXG4gICAgY2xlYXJEcmlsbChsZXZlbDogbnVtYmVyKSB7XHJcbiAgICAgICAgdmFyIGk6IG51bWJlcjtcclxuICAgICAgICBmb3IgKHZhciBpID0gbGV2ZWw7IGkgPCB0aGlzLmdyb3Vwcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB0aGlzLmdyb3Vwc1tpXS5pdGVtcy5zcGxpY2UoMCwgMSk7XHJcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldLm9yZ0l0ZW1zLnNwbGljZSgwLCAxKTtcclxuICAgICAgICAgICAgdGhpcy5zb3J0KCdwYXhDb3VudCcsaSxmYWxzZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtpXSA9ICcnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGRyaWxsRG93blJlcXVlc3QgKGRyaWxsVHlwZSwgc2VsRmluZExldmVsLCBkYXRhKXtcclxuICAgICAgICB2YXIgcmVxZGF0YTtcclxuICAgICAgICBpZihkcmlsbFR5cGUgPT0gJ2JhcicpIHtcclxuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgICAgICAgIGlmIChkYXRhLmxhYmVsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhLmxhYmVsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgZHJpbGxCYXI6IHN0cmluZztcclxuICAgICAgICAgICAgZHJpbGxCYXIgPSAoZGF0YS5sYWJlbCkgPyBkYXRhLmxhYmVsIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIHJvdXRlQ29kZSA9IChkYXRhLnJvdXRlQ29kZSkgPyBkYXRhLnJvdXRlQ29kZSA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBzZWN0b3IgPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWRyaWxsQmFyKSB7XHJcbiAgICAgICAgICAgICAgICBkcmlsbEJhciA9IHRoaXMuZHJpbGxCYXJMYWJlbDtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRyaWxsQmFyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHJcbiAgICAgICAgICAgIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJyA6ICdOJyxcclxuICAgICAgICAgICAgICAgIFwidXNlcklkXCI6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJcIixcclxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxyXG4gICAgICAgICAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXHJcbiAgICAgICAgICAgICAgICBcImRyaWxsQmFyXCI6IGRyaWxsQmFyLFxyXG4gICAgICAgICAgICAgICAgXCJyb3V0ZUNvZGVcIjogcm91dGVDb2RlLFxyXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JcIjogc2VjdG9yLFxyXG4gICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyXHJcbiAgICAgICAgICAgIH07ICBcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBpZihkcmlsbFR5cGUgPT0gJ3RhcmdldCcpIHtcclxuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgICAgICAgIGlmIChkYXRhLmxhYmVsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhLmxhYmVsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgcm91dGV0eXBlOiBzdHJpbmc7XHJcbiAgICAgICAgICAgIHJvdXRldHlwZSA9IChkYXRhLnJvdXRldHlwZSkgPyBkYXRhLnJvdXRldHlwZSA6IFwiXCI7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHJcbiAgICAgICAgICAgIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJyA6ICdOJyxcclxuICAgICAgICAgICAgICAgIFwidXNlcklkXCI6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJzdHJpbmdcIixcclxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxyXG4gICAgICAgICAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXHJcbiAgICAgICAgICAgICAgICBcInJvdXRldHlwZVwiOiByb3V0ZXR5cGVcclxuICAgICAgICAgICAgfTsgIFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICdhbmFseXNpcycpIHtcclxuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB2YXIgcmVnaW9uTmFtZTtcclxuICAgICAgICAgICAgdmFyIGNvdW50cnlGcm9tVG87XHJcbiAgICAgICAgICAgIHZhciBvd25PYWxGbGFnO1xyXG4gICAgICAgICAgICB2YXIgc2VjdG9yRnJvbVRvO1xyXG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRyaWxsTGV2ZWwgPiAxKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgIHJlZ2lvbk5hbWUgPSAoZGF0YS5yZWdpb25OYW1lKSA/IGRhdGEucmVnaW9uTmFtZSA6IFwiXCI7XHJcbiAgICAgICAgICAgICAgICBjb3VudHJ5RnJvbVRvID0gKGRhdGEuY291bnRyeUZyb20gJiYgZGF0YS5jb3VudHJ5VG8pID8gZGF0YS5jb3VudHJ5RnJvbSArICctJyArIGRhdGEuY291bnRyeVRvIDogXCJcIjtcclxuICAgICAgICAgICAgICAgIG93bk9hbEZsYWcgPSAoZGF0YS5vd25PYWwpID8gZGF0YS5vd25PYWwgOiBcIlwiO1xyXG4gICAgICAgICAgICAgICAgc2VjdG9yRnJvbVRvID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XHJcbiAgICAgICAgICAgICAgICBmbGlnaHROdW1iZXIgPSAoZGF0YS5mbGlnaHROdW1iZXIpID8gZGF0YS5mbGlnaHROdW1iZXIgOiBcIlwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cclxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxyXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcInN0cmluZ1wiLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXHJcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICAgICAgICAgIFwicmVnaW9uTmFtZVwiOiByZWdpb25OYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5RnJvbVRvXCI6IGNvdW50cnlGcm9tVG8sXHJcbiAgICAgICAgICAgICAgICBcIm93bk9hbEZsYWdcIjogb3duT2FsRmxhZyxcclxuICAgICAgICAgICAgICAgIFwic2VjdG9yRnJvbVRvXCI6IHNlY3RvckZyb21UbyxcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiAwXHJcbiAgICAgICAgICAgIH07ICBcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICdwYXNzZW5nZXItY291bnQnKSB7XHJcbiAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgIHZhciByZWdpb25OYW1lID0gKGRhdGEucmVnaW9uTmFtZSkgPyBkYXRhLnJlZ2lvbk5hbWUgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgY291bnRyeUZyb21UbyA9IChkYXRhLmNvdW50cnlGcm9tICYmIGRhdGEuY291bnRyeVRvKSA/IGRhdGEuY291bnRyeUZyb20gKyAnLScgKyBkYXRhLmNvdW50cnlUbyA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBvd25PYWxGbGFnID0gKGRhdGEub3duT2FsRmxhZykgPyBkYXRhLm93bk9hbEZsYWcgOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgc2VjdG9yRnJvbVRvICA9IChkYXRhLnNlY3RvckZyb21UbykgPyBkYXRhLnNlY3RvckZyb21UbyA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBmbGlnaHROdW1iZXIgID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG5cclxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxyXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXHJcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcInN0cmluZ1wiLFxyXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXHJcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICAgICAgICAgIFwicmVnaW9uTmFtZVwiOiByZWdpb25OYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5RnJvbVRvXCI6IGNvdW50cnlGcm9tVG8sXHJcbiAgICAgICAgICAgICAgICBcIm93bk9hbEZsYWdcIjogb3duT2FsRmxhZyxcclxuICAgICAgICAgICAgICAgIFwic2VjdG9yRnJvbVRvXCI6IHNlY3RvckZyb21UbyxcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcclxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiAwXHJcbiAgICAgICAgICAgIH07ICBcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlcWRhdGE7XHJcbiAgICB9XHJcbiAgICBnZXREcmlsbERvd25VUkwgKGRyaWxEb3duVHlwZSkge1xyXG4gICAgICAgIHZhciB1cmxcclxuICAgICAgICBzd2l0Y2goZHJpbERvd25UeXBlKXtcclxuICAgICAgICAgICAgY2FzZSAnYmFyJzpcclxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy9tc3BheG5ldHJldmRyaWxsXCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICd0YXJnZXQnOlxyXG4gICAgICAgICAgICAgICAgdXJsID0gXCIvcGF4ZmxubWlzL3RndHZzYWN0ZHJpbGxcIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2FuYWx5c2lzJzpcclxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy9uZXRyZXZlbnVlb3dub2FsZHJpbGxcIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ3Bhc3Nlbmdlci1jb3VudCc6XHJcbiAgICAgICAgICAgICAgICB1cmwgPSBcIi9wYXhmbG5taXMvbmV0cmV2ZW51ZW93bm9hbGRyaWxsXCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHVybDtcclxuICAgIH1cclxuICAgIG9wZW5CYXJEcmlsbERvd24oZGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgc2VsRmluZExldmVsID0gTnVtYmVyKHNlbEZpbmRMZXZlbCk7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWxdID0gZGF0YTtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsICsgMV0gPSAnJztcclxuICAgICAgICBcclxuICAgICAgICBpZiAoc2VsRmluZExldmVsICE9ICh0aGlzLmdyb3Vwcy5sZW5ndGggLSAxKSkge1xyXG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICAgICAgICAgIHZhciByZXFkYXRhID0gdGhpcy5kcmlsbERvd25SZXF1ZXN0KHRoaXMuZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpO1xyXG4gICAgICAgICAgICB2YXIgVVJMID0gdGhpcy5nZXREcmlsbERvd25VUkwodGhpcy5kcmlsbFR5cGUpO1xyXG4gICAgICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0RHJpbGxEb3duKHJlcWRhdGEsIFVSTClcclxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGRhdGEucmVzcG9uc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpbmRMZXZlbCA9IGRyaWxsTGV2ZWwgLSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEuc3RhdHVzKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5zdGF0dXMgPT0gJ3N1Y2Nlc3MnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSBkYXRhLmRhdGEucm93cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5vcmdJdGVtc1swXSA9IGRhdGEuZGF0YS5yb3dzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuc29ydCgncGF4Q291bnQnLCBmaW5kTGV2ZWwsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGRyaWxsTGV2ZWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuc2hvd25Hcm91cCA9IGZpbmRMZXZlbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGZpbmRMZXZlbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0LmNsb3Nlc1BvcG92ZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ1NlcnZlciBFcnJvcicpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaW5pdGlhdGVBcnJheShkcmlsbHRhYnMpIHtcclxuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIGkgaW4gZHJpbGx0YWJzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IGksXHJcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLmRyaWxsdGFic1tpXSxcclxuICAgICAgICAgICAgICAgIGl0ZW1zOiBbXSxcclxuICAgICAgICAgICAgICAgIG9yZ0l0ZW1zOiBbXSxcclxuICAgICAgICAgICAgICAgIEl0ZW1zQnlQYWdlOiBbXSxcclxuICAgICAgICAgICAgICAgIGZpcnN0Q29sdW1uczogdGhpcy5maXJzdENvbHVtbnNbaV1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBvcGVuQmFyRHJpbGxEb3duUG9wb3ZlcigkZXZlbnQsIHNlbERhdGEsIHNlbEZpbmRMZXZlbCkge1xyXG4gICAgICAgIHRoaXMuZHJpbGxOYW1lID0gJ01FVFJJQyBTTkFQU0hPVCBSRVBPUlQgLSAnICsgc2VsRGF0YS5wb2ludC5sYWJlbDtcclxuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdiYXInO1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XHJcbiAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ1JvdXRlIExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdEYXRhIExldmVsJywgJ0ZsaWdodCBMZXZlbCddO1xyXG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydyb3V0ZUNvZGUnLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2ZsaWdodERhdGUnXTtcclxuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgdGhhdC5kcmlsbEJhcnBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIH0sIDUwKTtcclxuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcclxuICAgIH07XHJcbiAgICBvcGVuVGFyZ2V0RHJpbGxEb3duUG9wb3ZlcigkZXZlbnQsIHNlbERhdGEsIHNlbEZpbmRMZXZlbCkge1xyXG4gICAgICAgIHRoaXMuZHJpbGxOYW1lID0gJ1RhcmdldCBWcyBBY3R1YWwnO1xyXG4gICAgICAgIHRoaXMuZHJpbGxUeXBlID0gJ3RhcmdldCc7XHJcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcclxuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnUm91dGUgVHlwZScsICdSb3V0ZSBjb2RlJ107XHJcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ3JvdXRldHlwZScsICdyb3V0ZWNvZGUnXTtcclxuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgdGhhdC5kcmlsbEJhcnBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIH0sIDUwKTtcclxuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcclxuICAgIH07XHJcblxyXG4gICAgb3BlblJldmVudWVEcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coc2VsRGF0YSk7XHJcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnTmV0IFJldmVudWUgYnkgT1dOIGFuZCBPQUwnO1xyXG4gICAgICAgIHRoaXMuZHJpbGxUeXBlID0gJ2FuYWx5c2lzJztcclxuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydDb3VudHJ5IExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdGbGlnaHQgTGV2ZWwnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcclxuICAgICAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsnY291bnRyeUZyb20nLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ25ldFJldmVudWUnXTtcclxuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcclxuICAgIH07XHJcblxyXG4gICAgb3BlblJldmVudWVQYXNzZW5nZXJEcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coc2VsRGF0YSk7XHJcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnUGFzc2VuZ2VyIENvdW50IGJ5IENsYXNzIG9mIFRyYXZlbCc7XHJcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAncGFzc2VuZ2VyLWNvdW50JztcclxuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydDb3VudHJ5IExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdGbGlnaHQgTGV2ZWwnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcclxuICAgICAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsnY291bnRyeUZyb20nLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ25ldFJldmVudWUnXTtcclxuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcclxuICAgIH07XHJcblxyXG4gICAgb3BlblBvcG92ZXIgKCRldmVudCwgaW5kZXgsIGNoYXJ0dHlwZSkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB0aGlzLmNoYXJ0VHlwZSA9IGNoYXJ0dHlwZTtcclxuICAgICAgICB0aGlzLmdyYXBoSW5kZXggPSBpbmRleDtcclxuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL21pcy9ncmFwaC1wb3BvdmVyLmh0bWwnLCB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xyXG4gICAgICAgICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcclxuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG9wZW5TZWN0b3JQb3BvdmVyICgkZXZlbnQsaW5kZXgsY2hhcnR0eXBlKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuY2hhcnRUeXBlID0gY2hhcnR0eXBlO1xyXG4gICAgICAgIHRoaXMuZ3JhcGhJbmRleCA9IGluZGV4O1xyXG4gICAgICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL3NlY3Rvci1ncmFwaC1wb3BvdmVyLmh0bWwnLCB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xyXG4gICAgICAgICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcclxuICAgICAgICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGxTZWN0b3JDYXJyaWVyQW5hbHlzaXMgKCkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcclxuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcclxuICAgICAgICAgICAgaW5jbHVkZVN1cmNoYXJnZTogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWSc6J04nLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgICAgICAgdG9nZ2xlMjogJycsXHJcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcblxyXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRTZWN0b3JDYXJyaWVyQW5hbHlzaXMocmVxZGF0YSlcclxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxyXG4gICAgICAgICAgICB2YXIganNvbk9iaiA9IGRhdGEucmVzcG9uc2UuZGF0YTtcclxuICAgICAgICAgICAgXy5mb3JFYWNoKGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzLCBmdW5jdGlvbih2YWw6IGFueSwgaTogbnVtYmVyKXtcclxuICAgICAgICAgICAgICAgIHZhbFsnb3RoZXJzJ10gPSB2YWwuaXRlbXMuc3BsaWNlKC0xLCAxKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHZhciBzb3J0ZWREYXRhID0gXy5zb3J0QnkoanNvbk9iai5TZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuICAgICAgICAgICAgICAgIGlmICh1KSByZXR1cm4gW3UuZmF2b3JpdGVDaGFydFBvc2l0aW9uXTsgXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB2YXIgZmF2U2VjdG9yQ2FycmllclJlc3VsdCA9IF8uZmlsdGVyKHNvcnRlZERhdGEsIGZ1bmN0aW9uKHU6IGFueSkgeyBcclxuICAgICAgICAgICAgICAgIGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGF0LlNlY3RvckNhcnJpZXJBbmFseXNpc0NoYXJ0cyA9IGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzO1xyXG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHRhcmdldEFjdHVhbEZpbHRlcih0aGF0OiBNaXNDb250cm9sbGVyKSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGl0ZW06IGFueSl7XHJcbiAgICAgICAgICAgIHJldHVybiBpdGVtLnRvZ2dsZTEgPT0gdGhhdC50b2dnbGUudGFyZ2V0UmV2T3JQYXg7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNlY3RvckNhcnJpZXJGaWx0ZXIodGhhdDogTWlzQ29udHJvbGxlcikge1xyXG4gICAgICAgdGhhdCA9IHRoaXMudGhhdDtcclxuICAgICAgIHJldHVybiBmdW5jdGlvbihpdGVtOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGl0ZW0udG9nZ2xlMSA9PSB0aGF0LnRvZ2dsZS5zZWN0b3JPcmRlciAmJiBpdGVtLnRvZ2dsZTIgPT0gdGhhdC50b2dnbGUuc2VjdG9yUmV2T3JQYXg7IFxyXG4gICAgICB9XHJcbiAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgcmV2ZW51ZUFuYWx5c2lzRmlsdGVyKGl0ZW06IGFueSkge1xyXG4gICAgICAgIHZhciBzdXJjaGFyZ2VGbGFnID0gKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyBcIllcIiA6IFwiTlwiO1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHN1cmNoYXJnZUZsYWcrJyA6ICcraXRlbSk7XHJcbiAgICAgICAgaWYoIGl0ZW0uc3VyY2hhcmdlRmxhZyA9PSBzdXJjaGFyZ2VGbGFnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlOyBcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEZsb3duRmF2b3JpdGVzKCkge1xyXG4gICAgICAgIHRoaXMuY2FsbE1ldHJpY1NuYXBzaG90KCk7XHJcbiAgICAgICAgdGhpcy5jYWxsVGFyZ2V0VnNBY3R1YWwoKTtcclxuICAgICAgICB0aGlzLmNhbGxSZXZlbnVlQW5hbHlzaXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBpb25pY0xvYWRpbmdTaG93KCkge1xyXG4gICAgICAgIHRoaXMuJGlvbmljTG9hZGluZy5zaG93KHtcclxuICAgICAgICAgICAgdGVtcGxhdGU6ICc8aW9uLXNwaW5uZXIgY2xhc3M9XCJzcGlubmVyLWNhbG1cIj48L2lvbi1zcGlubmVyPidcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgaW9uaWNMb2FkaW5nSGlkZSgpIHtcclxuICAgICAgICB0aGlzLiRpb25pY0xvYWRpbmcuaGlkZSgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBvcGVuRHJpbGxEb3duUG9wb3ZlcigkZXZlbnQscmVnaW9uRGF0YSxzZWxGaW5kTGV2ZWwpIHtcclxuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdyb3V0ZSc7XHJcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcclxuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnQ291bnRyeSBMZXZlbCcsICdTZWN0b3IgTGV2ZWwnLCAnRmxpZ2h0IExldmVsJywgJ0RvY3VtZW50IExldmVsJ107XHJcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2NvdW50cnlGcm9tJywnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2RvY3VtZW50IyddO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XHJcbiAgICAgICAgdGhpcy5kcmlsbHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICAgIHRoaXMub3BlbkRyaWxsRG93bihyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNsb3Nlc1BvcG92ZXIoKSB7XHJcbiAgICAgICAgdGhpcy5kcmlsbHBvcG92ZXIuaGlkZSgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBpc0RyaWxsUm93U2VsZWN0ZWQobGV2ZWwsb2JqKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0ZWREcmlsbFtsZXZlbF0gPT0gb2JqO1xyXG4gICAgfVxyXG4gICAgc2VhcmNoUmVzdWx0cyAobGV2ZWwsb2JqKSB7XHJcbiAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy5maWx0ZXJlZExpc3RTZXJ2aWNlLnNlYXJjaGVkKHRoaXMuZ3JvdXBzW2xldmVsXS5vcmdJdGVtc1swXSwgb2JqLnNlYXJjaFRleHQsIGxldmVsLCB0aGlzLmRyaWxsVHlwZSk7XHJcbiAgICAgICAgaWYgKG9iai5zZWFyY2hUZXh0ID09ICcnKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVzZXRBbGwobGV2ZWwpOyBcclxuICAgICAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy5ncm91cHNbbGV2ZWxdLm9yZ0l0ZW1zWzBdO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IDA7XHJcbiAgICAgICAgdGhpcy5wYWdpbmF0aW9uKGxldmVsKTsgXHJcbiAgICB9XHJcbiAgICBwYWdpbmF0aW9uIChsZXZlbCkge1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5JdGVtc0J5UGFnZSA9IHRoaXMuZmlsdGVyZWRMaXN0U2VydmljZS5wYWdlZCh0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0sIHRoaXMucGFnZVNpemUgKTtcclxuICAgIH07XHJcblxyXG4gICAgc2V0UGFnZSAobGV2ZWwsIHBhZ2Vubykge1xyXG4gICAgICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gcGFnZW5vO1xyXG4gICAgfTtcclxuICAgIGxhc3RQYWdlKGxldmVsKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UubGVuZ3RoIC0gMTtcclxuICAgIH07XHJcbiAgICByZXNldEFsbChsZXZlbCkge1xyXG4gICAgICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcclxuICAgIH1cclxuICAgIHNvcnQoc29ydEJ5LGxldmVsLG9yZGVyKSB7XHJcbiAgICAgICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XHJcbiAgICAgICAgdGhpcy5jb2x1bW5Ub09yZGVyID0gc29ydEJ5OyBcclxuICAgICAgICAvLyRGaWx0ZXIgLSBTdGFuZGFyZCBTZXJ2aWNlXHJcbiAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy4kZmlsdGVyKCdvcmRlckJ5JykodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLmNvbHVtblRvT3JkZXIsIG9yZGVyKTsgXHJcbiAgICAgICAgdGhpcy5wYWdpbmF0aW9uKGxldmVsKTsgICAgXHJcbiAgICB9O1xyXG4gICAgcmFuZ2UodG90YWwsIGxldmVsKSB7XHJcbiAgICAgICAgdmFyIHJldCA9IFtdO1xyXG4gICAgICAgIHZhciBzdGFydDogbnVtYmVyO1xyXG4gICAgICAgIHN0YXJ0ID0gMDtcclxuICAgICAgICBpZih0b3RhbCA+IDUpIHtcclxuICAgICAgICAgICAgc3RhcnQgPSBOdW1iZXIodGhpcy5jdXJyZW50UGFnZVtsZXZlbF0pIC0gMjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoc3RhcnQgPCAwKSB7XHJcbiAgICAgICAgICBzdGFydCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBrID0gMTtcclxuICAgICAgICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCB0b3RhbDsgaSsrKSB7XHJcbiAgICAgICAgICByZXQucHVzaChpKTtcclxuICAgICAgICAgIGsrKztcclxuICAgICAgICAgIGlmIChrID4gNikge1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJldDtcclxuICAgIH1cclxuXHJcbiAgICB0b2dnbGVHcm91cCAoZ3JvdXApIHtcclxuICAgICAgICBpZiAodGhpcy5pc0dyb3VwU2hvd24oZ3JvdXApKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvd25Hcm91cCA9IG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5zaG93bkdyb3VwID0gZ3JvdXA7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaXNHcm91cFNob3duKGdyb3VwOiBudW1iZXIpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zaG93bkdyb3VwID09IGdyb3VwO1xyXG4gICAgfVxyXG5cdHRvZ2dsZUNoYXJ0T3JUYWJsZVZpZXcodmFsOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLnRvZ2dsZS5jaGFydE9yVGFibGUgPSB2YWw7XHJcbiAgICB9XHJcbiAgICB0b2dnbGVUYXJnZXRWaWV3KHZhbDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUudGFyZ2V0VmlldyA9IHZhbDtcclxuICAgIH1cclxuICAgIHRvZ2dsZVJldmVudWVWaWV3KHZhbDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUucmV2ZW51ZVZpZXcgPSB2YWw7XHJcbiAgICB9XHJcbiAgICB0b2dnbGVTZWN0b3JWaWV3KHZhbDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy50b2dnbGUuc2VjdG9yVmlldyA9IHZhbDtcclxuICAgIH1cclxuXHRydW5SZXBvcnQoY2hhcnRUaXRsZTogc3RyaW5nLG1vbnRoT3JZZWFyOiBzdHJpbmcsZmxvd25Nb250aDogc3RyaW5nKXtcclxuXHRcdHZhciB0aGF0ID0gdGhpcztcclxuXHRcdC8vaWYgbm8gY29yZG92YSwgdGhlbiBydW5uaW5nIGluIGJyb3dzZXIgYW5kIG5lZWQgdG8gdXNlIGRhdGFVUkwgYW5kIGlmcmFtZVxyXG5cdFx0aWYgKCF3aW5kb3cuY29yZG92YSkge1xyXG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ1Nob3coKTtcclxuXHRcdFx0dGhpcy5yZXBvcnRTdmMucnVuUmVwb3J0RGF0YVVSTChjaGFydFRpdGxlLG1vbnRoT3JZZWFyLGZsb3duTW9udGgpXHJcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZGF0YVVSTCkge1xyXG5cdFx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0XHQvL3NldCB0aGUgaWZyYW1lIHNvdXJjZSB0byB0aGUgZGF0YVVSTCBjcmVhdGVkXHJcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKGRhdGFVUkwpO1xyXG5cdFx0XHRcdFx0Ly9kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGRmSW1hZ2UnKS5zcmMgPSBkYXRhVVJMO1xyXG5cdFx0XHRcdFx0d2luZG93Lm9wZW4oZGF0YVVSTCxcIl9zeXN0ZW1cIik7XHJcblx0XHRcdFx0fSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuXHRcdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdC8vaWYgY29kcm92YSwgdGhlbiBydW5uaW5nIGluIGRldmljZS9lbXVsYXRvciBhbmQgYWJsZSB0byBzYXZlIGZpbGUgYW5kIG9wZW4gdy8gSW5BcHBCcm93c2VyXHJcblx0XHRlbHNlIHtcclxuXHRcdFx0dGhhdC5pb25pY0xvYWRpbmdTaG93KCk7XHJcblx0XHRcdHRoaXMucmVwb3J0U3ZjLnJ1blJlcG9ydEFzeW5jKGNoYXJ0VGl0bGUsbW9udGhPclllYXIsZmxvd25Nb250aClcclxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihmaWxlUGF0aCkge1xyXG5cdFx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdFx0XHQvL2xvZyB0aGUgZmlsZSBsb2NhdGlvbiBmb3IgZGVidWdnaW5nIGFuZCBvb3BlbiB3aXRoIGluYXBwYnJvd3NlclxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3JlcG9ydCBydW4gb24gZGV2aWNlIHVzaW5nIEZpbGUgcGx1Z2luJyk7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnUmVwb3J0Q3RybDogT3BlbmluZyBQREYgRmlsZSAoJyArIGZpbGVQYXRoICsgJyknKTtcclxuXHRcdFx0XHRcdHZhciBsYXN0UGFydCA9IGZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKTtcclxuXHRcdFx0XHRcdHZhciBmaWxlTmFtZSA9IFwiL21udC9zZGNhcmQvXCIrbGFzdFBhcnQ7XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0aWYoZGV2aWNlLnBsYXRmb3JtICE9XCJBbmRyb2lkXCIpXHJcblx0XHRcdFx0XHRmaWxlTmFtZSA9IGZpbGVQYXRoO1xyXG5cdFx0XHRcdFx0Ly93aW5kb3cub3BlblBERihmaWxlTmFtZSk7XHJcblx0XHRcdFx0XHQvL2Vsc2VcclxuXHRcdFx0XHRcdC8vd2luZG93Lm9wZW4oZmlsZVBhdGgsICdfYmxhbmsnLCAnbG9jYXRpb249bm8sY2xvc2VidXR0b25jYXB0aW9uPUNsb3NlLGVuYWJsZVZpZXdwb3J0U2NhbGU9eWVzJyk7Ki9cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdGNvcmRvdmEucGx1Z2lucy5maWxlT3BlbmVyMi5vcGVuKFxyXG5cdFx0XHRcdFx0XHRmaWxlTmFtZSwgXHJcblx0XHRcdFx0XHRcdCdhcHBsaWNhdGlvbi9wZGYnLCBcclxuXHRcdFx0XHRcdFx0eyBcclxuXHRcdFx0XHRcdFx0XHRlcnJvciA6IGZ1bmN0aW9uKGUpIHsgXHJcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnRXJyb3Igc3RhdHVzOiAnICsgZS5zdGF0dXMgKyAnIC0gRXJyb3IgbWVzc2FnZTogJyArIGUubWVzc2FnZSk7XHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRzdWNjZXNzIDogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2ZpbGUgb3BlbmVkIHN1Y2Nlc3NmdWxseScpOyAgICAgICAgICAgICAgICBcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuXHRcdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vc2VydmljZXMvT3BlcmF0aW9uYWxTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIgLz5cclxuXHJcbmludGVyZmFjZSB0YWJPYmplY3Qge1xyXG4gICAgdGl0bGU6IHN0cmluZyxcclxuICAgIG5hbWVzOiBzdHJpbmcsXHJcbiAgICBpY29uOiBzdHJpbmdcclxufVxyXG5cclxuaW50ZXJmYWNlIHRvZ2dsZU9iamVjdCB7XHJcbiAgICBtb250aE9yWWVhcjogc3RyaW5nLFxyXG4gICAgb3Blbk9yQ2xvc2VkOiBzdHJpbmcsXHJcbiAgICBmbGlnaHRTdGF0dXM6IHN0cmluZyxcclxuICAgIGZsaWdodFJlYXNvbjogc3RyaW5nLFxyXG4gICAgY2NFeGNlcHRpb246IHN0cmluZ1xyXG59XHJcblxyXG5pbnRlcmZhY2UgaGVhZGVyT2JqZWN0IHtcclxuICAgIGZsb3duTW9udGg6IHN0cmluZyxcclxuICAgIHRhYkluZGV4OiBudW1iZXIsXHJcbiAgICB1c2VyTmFtZTogc3RyaW5nXHJcbn1cclxuXHJcbmNsYXNzIE9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyIHtcclxuICBwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzdGF0ZScsICckc2NvcGUnLCAnJGlvbmljTG9hZGluZycsICckaW9uaWNQb3BvdmVyJywgJyRmaWx0ZXInLFxyXG4gICAgJ09wZXJhdGlvbmFsU2VydmljZScsICckaW9uaWNTbGlkZUJveERlbGVnYXRlJywgJyR0aW1lb3V0JywgJyR3aW5kb3cnLCAnUmVwb3J0U3ZjJywgJ0ZpbHRlcmVkTGlzdFNlcnZpY2UnLCAnVXNlclNlcnZpY2UnLCAnJGlvbmljSGlzdG9yeScsICdHUkFQSF9DT0xPUlMnLCAnVEFCUycsICckaW9uaWNQb3B1cCddO1xyXG4gIHByaXZhdGUgdGFiczogW3RhYk9iamVjdF07XHJcbiAgcHJpdmF0ZSB0b2dnbGU6IHRvZ2dsZU9iamVjdDtcclxuICBwcml2YXRlIGhlYWRlcjogaGVhZGVyT2JqZWN0O1xyXG4gIHByaXZhdGUgc3ViSGVhZGVyOiBhbnk7XHJcbiAgcHJpdmF0ZSBmbGlnaHRQcm9jU3RhdHVzOiBhbnk7XHJcbiAgcHJpdmF0ZSBmYXZGbGlnaHRQcm9jUmVzdWx0OiBhbnk7XHJcbiAgcHJpdmF0ZSBjYXJvdXNlbEluZGV4OiBudW1iZXIgPSAwO1xyXG4gIHByaXZhdGUgZmxpZ2h0Q291bnRSZWFzb246IGFueTtcclxuICBwcml2YXRlIGNvdXBvbkNvdW50RXhjZXB0aW9uOiBhbnk7XHJcbiAgcHJpdmF0ZSBjaGFydHR5cGU6IHN0cmluZztcclxuICBwcml2YXRlIGdyYXBoVHlwZTogc3RyaW5nO1xyXG4gIHByaXZhdGUgZ3JhcGhwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcclxuICBwcml2YXRlIHBvcG92ZXJzaG93bjogYm9vbGVhbjtcclxuICBwcml2YXRlIHRocmVlQmFyQ2hhcnRDb2xvcnM6IFtzdHJpbmddID0gdGhpcy5HUkFQSF9DT0xPUlMuVEhSRUVfQkFSU19DSEFSVDtcclxuICBwcml2YXRlIGZvdXJCYXJDaGFydENvbG9yczogW3N0cmluZ10gPSB0aGlzLkdSQVBIX0NPTE9SUy5GT1VSX0JBUlNfQ0hBUlQ7XHJcblxyXG4gIHByaXZhdGUgaW5mb3BvcG92ZXI6IElvbmljLklQb3BvdmVyO1xyXG4gIHByaXZhdGUgaW5mb2RhdGE6IHN0cmluZztcclxuICBwcml2YXRlIGZsaWdodFByb2NTZWN0aW9uOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBmbGlnaHRDb3VudFNlY3Rpb246IHN0cmluZztcclxuICBwcml2YXRlIGNvdXBvbkNvdW50U2VjdGlvbjogc3RyaW5nO1xyXG4gIHByaXZhdGUgY3VycmVudEluZGV4OiBudW1iZXI7XHJcblxyXG4gIHByaXZhdGUgcGFnZVNpemUgPSA0O1xyXG4gIHByaXZhdGUgY3VycmVudFBhZ2UgPSBbXTtcclxuICBwcml2YXRlIHNlbGVjdGVkRHJpbGwgPSBbXTtcclxuICBwcml2YXRlIGdyb3VwcyA9IFtdO1xyXG4gIHByaXZhdGUgY29sdW1uVG9PcmRlcjogc3RyaW5nO1xyXG4gIHByaXZhdGUgc2hvd25Hcm91cDogbnVtYmVyO1xyXG4gIHByaXZhdGUgZHJpbGxUeXBlOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBkcmlsbEJhckxhYmVsOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBleGNlcHRpb25DYXRlZ29yeTogc3RyaW5nO1xyXG4gIHByaXZhdGUgZHJpbGx0YWJzOiBzdHJpbmdbXTtcclxuICBwcml2YXRlIGRyaWxsTmFtZTogc3RyaW5nO1xyXG4gIHByaXZhdGUgZmlyc3RDb2x1bW5zOiBzdHJpbmdbXTtcclxuICBwcml2YXRlIGRyaWxscG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XHJcblxyXG4gIHByaXZhdGUgZmxpZ2h0Q291bnRMZWdlbmRzOiBhbnk7XHJcbiAgcHJpdmF0ZSBwb3B1cFN0YXR1czogYW55O1xyXG5cclxuICBjb25zdHJ1Y3Rvcihwcml2YXRlICRzdGF0ZTogYW5ndWxhci51aS5JU3RhdGVTZXJ2aWNlLCBwcml2YXRlICRzY29wZTogbmcuSVNjb3BlLFxyXG4gICAgcHJpdmF0ZSAkaW9uaWNMb2FkaW5nOiBJb25pYy5JTG9hZGluZyxcclxuICAgIHByaXZhdGUgJGlvbmljUG9wb3ZlcjogSW9uaWMuSVBvcG92ZXIsIHByaXZhdGUgJGZpbHRlcjogbmcuSUZpbHRlclNlcnZpY2UsXHJcbiAgICBwcml2YXRlIG9wZXJhdGlvbmFsU2VydmljZTogT3BlcmF0aW9uYWxTZXJ2aWNlLFxyXG4gICAgcHJpdmF0ZSAkaW9uaWNTbGlkZUJveERlbGVnYXRlOiBJb25pYy5JU2xpZGVCb3hEZWxlZ2F0ZSxcclxuICAgIHByaXZhdGUgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSwgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcclxuICAgIHByaXZhdGUgcmVwb3J0U3ZjOiBSZXBvcnRTdmMsIHByaXZhdGUgZmlsdGVyZWRMaXN0U2VydmljZTogRmlsdGVyZWRMaXN0U2VydmljZSxcclxuICAgIHByaXZhdGUgdXNlclNlcnZpY2U6IFVzZXJTZXJ2aWNlLCBwcml2YXRlICRpb25pY0hpc3Rvcnk6IGFueSwgcHJpdmF0ZSBHUkFQSF9DT0xPUlM6IHN0cmluZywgcHJpdmF0ZSBUQUJTOiBzdHJpbmcsIHByaXZhdGUgJGlvbmljUG9wdXA6IElvbmljLklQb3B1cCkge1xyXG4gICAgICBcclxuICAgIHRoaXMudGFicyA9IHRoaXMuVEFCUy5EQjJfVEFCUztcclxuXHJcbiAgICB0aGlzLnRvZ2dsZSA9IHtcclxuICAgICAgbW9udGhPclllYXI6ICdtb250aCcsXHJcbiAgICAgIG9wZW5PckNsb3NlZDogJ09QRU4nLFxyXG4gICAgICBmbGlnaHRTdGF0dXM6ICdjaGFydCcsXHJcbiAgICAgIGZsaWdodFJlYXNvbjogJ2NoYXJ0JyxcclxuICAgICAgY2NFeGNlcHRpb246ICdjaGFydCdcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5oZWFkZXIgPSB7XHJcbiAgICAgIGZsb3duTW9udGg6ICcnLFxyXG4gICAgICB0YWJJbmRleDogMCxcclxuICAgICAgdXNlck5hbWU6ICcnXHJcbiAgICB9O1xyXG5cdHRoaXMucG9wdXBTdGF0dXMgPSBmYWxzZTtcclxuICAgIHRoaXMuaW5pdERhdGEoKTtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuXHJcbiAgICAgIHRoaXMuJHNjb3BlLiRvbignb25TbGlkZU1vdmUnLCAoZXZlbnQ6IGFueSwgcmVzcG9uc2U6IGFueSkgPT4ge1xyXG4gICAgICAgICAgdGhhdC4kc2NvcGUuT3ByQ3RybC5vblNsaWRlTW92ZShyZXNwb25zZSk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdGhpcy4kc2NvcGUuJG9uKCckaW9uaWNWaWV3LmVudGVyJywgKCkgPT4ge1xyXG4gICAgICAgIGlmICghdGhhdC51c2VyU2VydmljZS5zaG93RGFzaGJvYXJkKCdPcGVyYXRpb25hbCcpKSB7XHJcbiAgICAgICAgICB0aGF0LiRzdGF0ZS5nbyhcImxvZ2luXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICB0aGlzLiRzY29wZS4kb24oJ29wZW5EcmlsbFBvcHVwMScsIChldmVudDogYW55LCByZXNwb25zZTogYW55KSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UudHlwZSk7XHJcbiAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ2ZsaWdodC1wcm9jZXNzJykge1xyXG4gICAgICAgICAgdGhpcy4kc2NvcGUuT3ByQ3RybC5vcGVuRmxpZ2h0UHJvY2Vzc0RyaWxsUG9wb3ZlcihyZXNwb25zZS5ldmVudCwgeyBcInBvaW50XCI6IHJlc3BvbnNlLmRhdGEgfSwgLTEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAnY291cG9uLWNvdW50Jykge1xyXG4gICAgICAgICAgdGhpcy4kc2NvcGUuT3ByQ3RybC5vcGVuQ291bnBvbkNvdW50RHJpbGxQb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChyZXNwb25zZS50eXBlID09ICdmbGlnaHQtY291bnQnKSB7XHJcbiAgICAgICAgICB0aGlzLiRzY29wZS5PcHJDdHJsLm9wZW5GbGlnaHRDb3VudERyaWxsUG9wb3ZlcihyZXNwb25zZS5ldmVudCwgeyBcInBvaW50XCI6IHJlc3BvbnNlLmRhdGEgfSwgLTEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICBpbml0RGF0YSgpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuXHJcbiAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL2RyaWxkb3duLmh0bWwnLCB7XHJcbiAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxyXG4gICAgfSkudGhlbihmdW5jdGlvbihkcmlsbHBvcG92ZXIpIHtcclxuICAgICAgdGhhdC5kcmlsbHBvcG92ZXIgPSBkcmlsbHBvcG92ZXI7XHJcbiAgICB9KTtcclxuXHJcblxyXG4gICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9pbmZvdG9vbHRpcC5odG1sJywge1xyXG4gICAgICBzY29wZTogdGhhdC4kc2NvcGVcclxuICAgIH0pLnRoZW4oZnVuY3Rpb24oaW5mb3BvcG92ZXIpIHtcclxuICAgICAgdGhhdC5pbmZvcG9wb3ZlciA9IGluZm9wb3BvdmVyO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdmFyIHJlcSA9IHtcclxuICAgICAgdXNlcklkOiB0aGF0LiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInKVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZXEudXNlcklkICE9IFwibnVsbFwiKSB7XHJcbiAgICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldFBheEZsb3duT3BySGVhZGVyKHJlcSkudGhlbihcclxuICAgICAgICAoZGF0YSkgPT4ge1xyXG4gICAgICAgICAgdGhhdC5zdWJIZWFkZXIgPSBkYXRhLnJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGF0LnN1YkhlYWRlci5wYXhGbG93bk9wck1vbnRocyk7XHJcbiAgICAgICAgICB0aGF0LmhlYWRlci5mbG93bk1vbnRoID0gdGhhdC5zdWJIZWFkZXIuZGVmYXVsdE1vbnRoO1xyXG4gICAgICAgICAgLy8gY29uc29sZS5sb2codGhhdC5oZWFkZXIuZmxvd25Nb250aCk7XHJcbiAgICAgICAgICB0aGF0Lm9uU2xpZGVNb3ZlKHsgaW5kZXg6IDAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAoZXJyb3IpID0+IHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICB0aGF0LmhlYWRlci51c2VyTmFtZSA9IHRoYXQuZ2V0UHJvZmlsZVVzZXJOYW1lKCk7XHJcbiAgfVxyXG4gIHNlbGVjdGVkRmxvd25Nb250aChtb250aDogc3RyaW5nKSB7XHJcbiAgICByZXR1cm4gKG1vbnRoID09IHRoaXMuaGVhZGVyLmZsb3duTW9udGgpO1xyXG4gIH1cclxuXHJcbiAgZ2V0UHJvZmlsZVVzZXJOYW1lKCk6IHN0cmluZyB7XHJcbiAgICBpZiAodGhpcy51c2VyU2VydmljZS5pc1VzZXJMb2dnZWRJbigpKSB7XHJcbiAgICAgIHZhciBvYmogPSB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInKTtcclxuICAgICAgaWYgKG9iaiAhPSAnbnVsbCcpIHtcclxuICAgICAgICB2YXIgcHJvZmlsZVVzZXJOYW1lID0gSlNPTi5wYXJzZShvYmopO1xyXG4gICAgICAgIHJldHVybiBwcm9maWxlVXNlck5hbWUudXNlcm5hbWU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHVwZGF0ZUhlYWRlcigpIHtcclxuICAgIHZhciBmbG93bk1vbnRoID0gdGhpcy5oZWFkZXIuZmxvd25Nb250aDtcclxuICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XHJcbiAgfVxyXG5cclxuXHJcbiAgb25TbGlkZU1vdmUoZGF0YTogYW55KSB7XHJcbiAgICB0aGlzLmhlYWRlci50YWJJbmRleCA9IGRhdGEuaW5kZXg7XHJcbiAgICB0aGlzLnRvZ2dsZS5jaGFydE9yVGFibGUgPSBcImNoYXJ0XCI7XHJcbiAgICBzd2l0Y2ggKHRoaXMuaGVhZGVyLnRhYkluZGV4KSB7XHJcbiAgICAgIGNhc2UgMDpcclxuICAgICAgICB0aGlzLmNhbGxNeURhc2hib2FyZCgpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDE6XHJcbiAgICAgICAgdGhpcy5jYWxsRmxpZ2h0UHJvY1N0YXR1cygpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDI6XHJcbiAgICAgICAgdGhpcy5jYWxsRmxpZ2h0Q291bnRCeVJlYXNvbigpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDM6XHJcbiAgICAgICAgdGhpcy5jYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbigpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH07XHJcbiAgY2FsbE15RGFzaGJvYXJkKCkge1xyXG5cdFx0dGhpcy5wb3B1cFN0YXR1cyA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuY2FsbEZsaWdodFByb2NTdGF0dXMoKTtcclxuICAgICAgICB0aGlzLmNhbGxGbGlnaHRDb3VudEJ5UmVhc29uKCk7XHJcbiAgICAgICAgdGhpcy5jYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbigpO1xyXG4gIH1cclxuICBjYWxsRmxpZ2h0UHJvY1N0YXR1cygpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJOYW1lLFxyXG4gICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgZnVsbERhdGFGbGFnOiAnTidcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJGbGlnaHRQcm9jU3RhdHVzKHJlcWRhdGEpXHJcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdGlmKGRhdGEucmVzcG9uc2Uuc3RhdHVzID09PSBcInN1Y2Nlc3NcIil7XHRcdCAgXHJcblx0XHRcdHZhciBvdGhlckNoYXJ0Q29sb3JzID0gW3sgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5GT1VSX0JBUlNfQ0hBUlRbMF0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkZPVVJfQkFSU19DSEFSVFsxXSB9LFxyXG5cdFx0XHQgIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5GT1VSX0JBUlNfQ0hBUlRbMl0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkZPVVJfQkFSU19DSEFSVFszXSB9XTtcclxuXHRcdFx0dmFyIHBpZUNoYXJ0Q29sb3JzID0gW3sgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5USFJFRV9CQVJTX0NIQVJUWzBdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5USFJFRV9CQVJTX0NIQVJUWzFdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5USFJFRV9CQVJTX0NIQVJUWzJdIH1dO1xyXG5cclxuXHRcdFx0dmFyIGpzb25PYmogPSB0aGF0LmFwcGx5Q2hhcnRDb2xvckNvZGVzKGRhdGEucmVzcG9uc2UuZGF0YSwgcGllQ2hhcnRDb2xvcnMsIG90aGVyQ2hhcnRDb2xvcnMpO1xyXG5cdFx0XHR0aGF0LmZsaWdodFByb2NTZWN0aW9uID0ganNvbk9iai5zZWN0aW9uTmFtZTtcclxuXHRcdFx0dmFyIHBpZUNoYXJ0cyA9IF8uZmlsdGVyKGpzb25PYmoucGllQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcclxuXHRcdFx0ICBpZiAodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0dmFyIG11bHRpQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5tdWx0aWJhckNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XHJcblx0XHRcdCAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuXHRcdFx0fSk7XHJcblx0XHRcdHZhciBzdGFja0NoYXJ0cyA9IF8uZmlsdGVyKGpzb25PYmouc3RhY2tlZEJhckNoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XHJcblx0XHRcdCAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuXHRcdFx0fSk7ICAgICAgICAgIFxyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhzdGFja0NoYXJ0cyk7XHJcblx0XHRcdGlmICh0aGF0LmhlYWRlci50YWJJbmRleCA9PSAwKSB7XHJcblx0XHRcdCAgdGhhdC5mbGlnaHRQcm9jU3RhdHVzID0ge1xyXG5cdFx0XHRcdHBpZUNoYXJ0OiBwaWVDaGFydHNbMF0sXHJcblx0XHRcdFx0d2Vla0RhdGE6IG11bHRpQ2hhcnRzWzBdLm11bHRpYmFyQ2hhcnRJdGVtcyxcclxuXHRcdFx0XHRzdGFja2VkQ2hhcnQ6IChzdGFja0NoYXJ0cy5sZW5ndGgpID8gc3RhY2tDaGFydHNbMF0gOiBbXVxyXG5cdFx0XHQgIH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0ICB0aGF0LmZsaWdodFByb2NTdGF0dXMgPSB7XHJcblx0XHRcdFx0cGllQ2hhcnQ6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxyXG5cdFx0XHRcdHdlZWtEYXRhOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzBdLm11bHRpYmFyQ2hhcnRJdGVtcyxcclxuXHRcdFx0XHRzdGFja2VkQ2hhcnQ6IGpzb25PYmouc3RhY2tlZEJhckNoYXJ0c1swXVxyXG5cdFx0XHQgIH1cclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhzdGFja0NoYXJ0cyk7XHJcblx0XHRcdHRoYXQuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdCAgdGhhdC4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykudXBkYXRlKCk7XHJcblx0XHRcdH0sIDApO1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0aGF0LmZsaWdodFByb2NTdGF0dXMud2Vla0RhdGEpKTtcclxuXHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHR9ZWxzZXtcclxuXHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdGlmKCF0aGF0LnBvcHVwU3RhdHVzKXtcclxuXHRcdFx0XHR0aGF0LnBvcHVwU3RhdHVzID0gdHJ1ZTtcclxuXHRcdFx0XHR0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcclxuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxyXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQhISEnXHJcblx0XHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXMpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdkb25lJyk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgfSk7XHJcbiAgfVxyXG4gIGNhbGxGbGlnaHRDb3VudEJ5UmVhc29uKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdmFyIHJlcWRhdGEgPSB7XHJcbiAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlck5hbWUsXHJcbiAgICAgIHRvZ2dsZTE6IHRoaXMudG9nZ2xlLm9wZW5PckNsb3NlZC50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICBmdWxsRGF0YUZsYWc6ICdOJ1xyXG4gICAgfTtcclxuICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG4gICAgdGhpcy5vcGVyYXRpb25hbFNlcnZpY2UuZ2V0T3ByRmxpZ2h0Q291bnRCeVJlYXNvbihyZXFkYXRhKVxyXG4gICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRpZihkYXRhLnJlc3BvbnNlLnN0YXR1cyA9PT0gXCJzdWNjZXNzXCIpe1x0XHJcblx0XHRcdC8vIGNvbnNvbGUubG9nKGpzb25PYmoucGllQ2hhcnRzWzBdKTtcclxuXHRcdFx0dmFyIG90aGVyQ2hhcnRDb2xvcnMgPSBbeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19PVEhfQ09MT1JTMVswXSB9LCB7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX09USF9DT0xPUlMxWzFdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fT1RIX0NPTE9SUzFbMl0gfV07XHJcblx0XHRcdHZhciBwaWVDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxWzBdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMV0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVsyXSB9XTtcclxuXHJcblx0XHRcdHRoYXQuZmxpZ2h0Q291bnRMZWdlbmRzID0gZGF0YS5yZXNwb25zZS5kYXRhLmxlZ2VuZHM7XHJcblxyXG5cdFx0XHR2YXIganNvbk9iaiA9IHRoYXQuYXBwbHlDaGFydENvbG9yQ29kZXMoZGF0YS5yZXNwb25zZS5kYXRhLCBwaWVDaGFydENvbG9ycywgb3RoZXJDaGFydENvbG9ycyk7XHJcblx0XHRcdHRoYXQuZmxpZ2h0Q291bnRTZWN0aW9uID0ganNvbk9iai5zZWN0aW9uTmFtZTtcclxuXHRcdFx0aWYgKHRoYXQuaGVhZGVyLnRhYkluZGV4ID09IDApIHtcclxuXHRcdFx0ICB0aGF0LmZsaWdodENvdW50UmVhc29uID0gdGhhdC5nZXRGYXZvcml0ZUl0ZW1zKGpzb25PYmopO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHQgIHRoYXQuZmxpZ2h0Q291bnRSZWFzb24gPSB7XHJcblx0XHRcdFx0cGllQ2hhcnQ6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxyXG5cdFx0XHRcdHdlZWtEYXRhOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzBdLm11bHRpYmFyQ2hhcnRJdGVtcyxcclxuXHRcdFx0XHRzdGFja2VkQ2hhcnQ6IGpzb25PYmouc3RhY2tlZEJhckNoYXJ0c1swXVxyXG5cdFx0XHQgIH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhhdC4kdGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0ICB0aGF0LiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGEnKS51cGRhdGUoKTtcclxuXHRcdFx0fSwgMCk7XHJcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0fWVsc2V7XHJcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG5cdFx0XHRpZighdGhhdC5wb3B1cFN0YXR1cyl7XHJcblx0XHRcdFx0dGhhdC5wb3B1cFN0YXR1cyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XHJcbiAgICAgICAgICAgICAgICB0aXRsZTogJ0Vycm9yJyxcclxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6ICdObyBEYXRhIEZvdW5kISEhJ1xyXG4gICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkb25lJyk7XHJcbiAgICAgICAgICAgICAgfSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICBjYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbigpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHZhciByZXFkYXRhID0ge1xyXG4gICAgICBmbG93bk1vbnRoOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJOYW1lLFxyXG4gICAgICB0b2dnbGUxOiAnJyxcclxuICAgICAgZnVsbERhdGFGbGFnOiAnTidcclxuICAgIH07XHJcbiAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckNvdXBvbkNvdW50QnlFeGNlcHRpb24ocmVxZGF0YSlcclxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcclxuXHRcdFx0dmFyIG90aGVyQ2hhcnRDb2xvcnMgPSBbeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVswXSB9LCB7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxWzFdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMl0gfV07XHJcblx0XHRcdHZhciBwaWVDaGFydENvbG9ycyA9IFt7IFwiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxWzBdIH0sIHsgXCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMV0gfSwgeyBcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVsyXSB9XTtcclxuXHJcblx0XHRcdHZhciBqc29uT2JqID0gdGhhdC5hcHBseUNoYXJ0Q29sb3JDb2RlcyhkYXRhLnJlc3BvbnNlLmRhdGEsIHBpZUNoYXJ0Q29sb3JzLCBvdGhlckNoYXJ0Q29sb3JzKTtcclxuXHRcdFx0dGhhdC5jb3Vwb25Db3VudFNlY3Rpb24gPSBqc29uT2JqLnNlY3Rpb25OYW1lO1xyXG5cdFx0XHRpZiAodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xyXG5cdFx0XHQgIHRoYXQuY291cG9uQ291bnRFeGNlcHRpb24gPSB0aGF0LmdldEZhdm9yaXRlSXRlbXMoanNvbk9iaik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdCAgdGhhdC5jb3Vwb25Db3VudEV4Y2VwdGlvbiA9IHtcclxuXHRcdFx0XHRwaWVDaGFydDoganNvbk9iai5waWVDaGFydHNbMF0sXHJcblx0XHRcdFx0d2Vla0RhdGE6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxyXG5cdFx0XHRcdHN0YWNrZWRDaGFydDoganNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdXHJcblx0XHRcdCAgfVxyXG5cdFx0XHR9XHJcblx0XHRcdHRoYXQuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdCAgdGhhdC4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykudXBkYXRlKCk7XHJcblx0XHRcdH0sIDApO1xyXG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcdFx0XHJcblx0XHR9ZWxzZXtcclxuXHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcblx0XHRcdGlmKCF0aGF0LnBvcHVwU3RhdHVzKXtcclxuXHRcdFx0XHR0aGF0LnBvcHVwU3RhdHVzID0gdHJ1ZTtcclxuICAgICAgICAgICAgICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcclxuICAgICAgICAgICAgICAgIHRpdGxlOiAnRXJyb3InLFxyXG4gICAgICAgICAgICAgICAgY29udGVudDogJ05vIERhdGEgRm91bmQhISEnXHJcbiAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcclxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2RvbmUnKTtcclxuICAgICAgICAgICAgICB9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICB9KTtcclxuICB9XHJcbiAgb3BlblBvcG92ZXIoJGV2ZW50LCBjaGFydHR5cGUsIGluZGV4KSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB2YXIgdGVtcCA9IHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpO1xyXG4gICAgdGhhdC5jdXJyZW50SW5kZXggPSB0ZW1wLmN1cnJlbnRJbmRleCgpO1xyXG4gICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB0aGlzLmNoYXJ0dHlwZSA9IGNoYXJ0dHlwZTtcclxuICAgIHRoaXMuZ3JhcGhUeXBlID0gaW5kZXg7XHJcbiAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL2dyYXBoLXBvcG92ZXIuaHRtbCcsIHtcclxuICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlXHJcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHBvcG92ZXIpIHtcclxuICAgICAgdGhhdC5wb3BvdmVyc2hvd24gPSB0cnVlO1xyXG4gICAgICB0aGF0LmdyYXBocG9wb3ZlciA9IHBvcG92ZXI7XHJcbiAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgIH0pO1xyXG4gIH1cclxuICBvcGVuUGllUG9wb3ZlcigkZXZlbnQsIGNoYXJ0dHlwZSwgaW5kZXgpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgdGhpcy5jaGFydHR5cGUgPSBjaGFydHR5cGU7XHJcbiAgICB0aGlzLmdyYXBoVHlwZSA9IGluZGV4O1xyXG4gICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9waWUtcG9wb3Zlci5odG1sJywge1xyXG4gICAgICBzY29wZTogdGhhdC4kc2NvcGVcclxuICAgIH0pLnRoZW4oZnVuY3Rpb24ocG9wb3Zlcikge1xyXG4gICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XHJcbiAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcclxuICAgICAgdGhhdC5ncmFwaHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBjbG9zZVBvcG92ZXIoKSB7XHJcbiAgICB0aGlzLmdyYXBocG9wb3Zlci5oaWRlKCk7XHJcbiAgfTtcclxuICBpb25pY0xvYWRpbmdTaG93KCkge1xyXG4gICAgdGhpcy4kaW9uaWNMb2FkaW5nLnNob3coe1xyXG4gICAgICB0ZW1wbGF0ZTogJzxpb24tc3Bpbm5lciBjbGFzcz1cInNwaW5uZXItY2FsbVwiPjwvaW9uLXNwaW5uZXI+J1xyXG4gICAgfSk7XHJcbiAgfTtcclxuICBhcHBseUNoYXJ0Q29sb3JDb2Rlcyhqc29uT2JqOiBhbnksIHBpZUNoYXJ0Q29sb3JzOiBhbnksIG90aGVyQ2hhcnRDb2xvcnM6IGFueSkge1xyXG4gICAgXy5mb3JFYWNoKGpzb25PYmoucGllQ2hhcnRzWzBdLmRhdGEsIGZ1bmN0aW9uKG46IGFueSwgdmFsdWU6IGFueSkge1xyXG4gICAgICBuLmxhYmVsID0gbi54dmFsO1xyXG4gICAgICBuLnZhbHVlID0gbi55dmFsO1xyXG4gICAgfSk7XHJcbiAgICBfLm1lcmdlKGpzb25PYmoucGllQ2hhcnRzWzBdLmRhdGEsIHBpZUNoYXJ0Q29sb3JzKTtcclxuICAgIF8ubWVyZ2UoanNvbk9iai5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsIG90aGVyQ2hhcnRDb2xvcnMpO1x0XHJcblx0aWYoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdLnN0YWNrZWRCYXJjaGFydEl0ZW1zLmxlbmd0aCA+PSAzKXtcclxuXHRcdF8ubWVyZ2UoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdLnN0YWNrZWRCYXJjaGFydEl0ZW1zLCBvdGhlckNoYXJ0Q29sb3JzKTtcclxuXHR9ZWxzZXtcclxuXHRcdHZhciB0ZW1wQ29sb3JzID0gW3sgXCJjb2xvclwiOiB0aGlzLkdSQVBIX0NPTE9SUy5EQl9UV09fUElFX0NPTE9SUzFbMF0gfSwgeyBcImNvbG9yXCI6IHRoaXMuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVsxXSB9XTtcclxuXHRcdF8ubWVyZ2UoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdLnN0YWNrZWRCYXJjaGFydEl0ZW1zLCB0ZW1wQ29sb3JzKTtcclxuXHR9XHJcbiAgICByZXR1cm4ganNvbk9iajtcclxuXHJcbiAgfVxyXG4gIGdldEZhdm9yaXRlSXRlbXMoanNvbk9iajogYW55KSB7XHJcbiAgICB2YXIgcGllQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5waWVDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xyXG4gICAgICBpZiAodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xyXG4gICAgfSk7XHJcbiAgICB2YXIgbXVsdGlDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLm11bHRpYmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcclxuICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgIH0pO1xyXG4gICAgdmFyIHN0YWNrQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcclxuICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcGllQ2hhcnQ6IHBpZUNoYXJ0c1swXSxcclxuICAgICAgd2Vla0RhdGE6IChtdWx0aUNoYXJ0cy5sZW5ndGgpID8gbXVsdGlDaGFydHMubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zIDogW10sXHJcbiAgICAgIHN0YWNrZWRDaGFydDogKHN0YWNrQ2hhcnRzLmxlbmd0aCkgPyBzdGFja0NoYXJ0c1swXSA6IFtdXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjb2xvckZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQsIGkpIHtcclxuICAgICAgcmV0dXJuIHRoYXQudGhyZWVCYXJDaGFydENvbG9yc1tpXTtcclxuICAgIH07XHJcbiAgfVxyXG4gIGZvdXJCYXJDb2xvckZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQsIGkpIHtcclxuICAgICAgcmV0dXJuIHRoYXQuZm91ckJhckNoYXJ0Q29sb3JzW2ldO1xyXG4gICAgfTtcclxuICB9XHJcbiAgb3BlbmluZm9Qb3BvdmVyKCRldmVudCwgaW5kZXgpIHtcclxuICAgIGlmICh0eXBlb2YgaW5kZXggPT0gXCJ1bmRlZmluZWRcIiB8fCBpbmRleCA9PSBcIlwiKSB7XHJcbiAgICAgIHRoaXMuaW5mb2RhdGEgPSAnTm8gaW5mbyBhdmFpbGFibGUnO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHRoaXMuaW5mb2RhdGEgPSBpbmRleDtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKGluZGV4KTtcclxuICAgIHRoaXMuaW5mb3BvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gIH07XHJcbiAgY2xvc2VJbmZvUG9wb3ZlcigpIHtcclxuICAgIHRoaXMuaW5mb3BvcG92ZXIuaGlkZSgpO1xyXG4gIH1cclxuICB0b2dnbGVDb3VudCh2YWwpIHtcclxuICAgIHRoaXMudG9nZ2xlLm9wZW5PckNsb3NlZCA9IHZhbDtcclxuICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XHJcbiAgfVxyXG4gIGlvbmljTG9hZGluZ0hpZGUoKSB7XHJcbiAgICB0aGlzLiRpb25pY0xvYWRpbmcuaGlkZSgpO1xyXG4gIH07XHJcbiAgbG9ja1NsaWRlKCkge1xyXG4gICAgY29uc29sZS5sb2coJ2luIGxvY2tTbGlkZSBtZWh0b2QuLicpO1xyXG4gICAgdGhpcy4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykuZW5hYmxlU2xpZGUoZmFsc2UpO1xyXG4gIH07XHJcbiAgd2Vla0RhdGFQcmV2KCkge1xyXG4gICAgdGhpcy4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhJykucHJldmlvdXMoKTtcclxuICB9O1xyXG4gIHdlZWtEYXRhTmV4dCgpIHtcclxuICAgIHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YScpLm5leHQoKTtcclxuICB9XHJcbiAgdG9nZ2xlRmxpZ2h0U3RhdHVzVmlldyh2YWw6IHN0cmluZykge1xyXG4gICAgdGhpcy50b2dnbGUuZmxpZ2h0U3RhdHVzID0gdmFsO1xyXG4gIH1cclxuICB0b2dnbGVGbGlnaHRSZWFzb25WaWV3KHZhbDogc3RyaW5nKSB7XHJcbiAgICB0aGlzLnRvZ2dsZS5mbGlnaHRSZWFzb24gPSB2YWw7XHJcbiAgICBpZiAodGhpcy50b2dnbGUuZmxpZ2h0UmVhc29uID09IFwiY2hhcnRcIilcclxuICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XHJcbiAgfVxyXG4gIHRvZ2dsZUNDRXhjZXB0aW9uVmlldyh2YWw6IHN0cmluZykge1xyXG4gICAgdGhpcy50b2dnbGUuY2NFeGNlcHRpb24gPSB2YWw7XHJcbiAgfSAgIFxyXG4gIHJ1blJlcG9ydChjaGFydFRpdGxlOiBzdHJpbmcsIG1vbnRoT3JZZWFyOiBzdHJpbmcsIGZsb3duTW9udGg6IHN0cmluZykge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgLy9pZiBubyBjb3Jkb3ZhLCB0aGVuIHJ1bm5pbmcgaW4gYnJvd3NlciBhbmQgbmVlZCB0byB1c2UgZGF0YVVSTCBhbmQgaWZyYW1lXHJcbiAgICBpZiAoIXdpbmRvdy5jb3Jkb3ZhKSB7XHJcbiAgICAgIHRoYXQuaW9uaWNMb2FkaW5nU2hvdygpO1xyXG4gICAgICB0aGlzLnJlcG9ydFN2Yy5ydW5SZXBvcnREYXRhVVJMKGNoYXJ0VGl0bGUsIG1vbnRoT3JZZWFyLCBmbG93bk1vbnRoKVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGFVUkwpIHtcclxuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgLy9zZXQgdGhlIGlmcmFtZSBzb3VyY2UgdG8gdGhlIGRhdGFVUkwgY3JlYXRlZFxyXG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhkYXRhVVJMKTtcclxuICAgICAgICAgIC8vZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BkZkltYWdlJykuc3JjID0gZGF0YVVSTDtcclxuXHRcdCAgd2luZG93Lm9wZW4oZGF0YVVSTCxcIl9zeXN0ZW1cIik7XHJcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIC8vaWYgY29kcm92YSwgdGhlbiBydW5uaW5nIGluIGRldmljZS9lbXVsYXRvciBhbmQgYWJsZSB0byBzYXZlIGZpbGUgYW5kIG9wZW4gdy8gSW5BcHBCcm93c2VyXHJcbiAgICBlbHNlIHtcclxuICAgICAgdGhhdC5pb25pY0xvYWRpbmdTaG93KCk7XHJcbiAgICAgIHRoaXMucmVwb3J0U3ZjLnJ1blJlcG9ydEFzeW5jKGNoYXJ0VGl0bGUsIG1vbnRoT3JZZWFyLCBmbG93bk1vbnRoKVxyXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGZpbGVQYXRoKSB7XHJcbiAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgIC8vbG9nIHRoZSBmaWxlIGxvY2F0aW9uIGZvciBkZWJ1Z2dpbmcgYW5kIG9vcGVuIHdpdGggaW5hcHBicm93c2VyXHJcbiAgICAgICAgICBjb25zb2xlLmxvZygncmVwb3J0IHJ1biBvbiBkZXZpY2UgdXNpbmcgRmlsZSBwbHVnaW4nKTtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdSZXBvcnRDdHJsOiBPcGVuaW5nIFBERiBGaWxlICgnICsgZmlsZVBhdGggKyAnKScpO1xyXG4gICAgICAgICAgdmFyIGxhc3RQYXJ0ID0gZmlsZVBhdGguc3BsaXQoXCIvXCIpLnBvcCgpO1xyXG4gICAgICAgICAgdmFyIGZpbGVOYW1lID0gXCIvbW50L3NkY2FyZC9cIiArIGxhc3RQYXJ0O1xyXG4gICAgICAgICAgaWYgKGRldmljZS5wbGF0Zm9ybSAhPSBcIkFuZHJvaWRcIilcclxuICAgICAgICAgICAgZmlsZU5hbWUgPSBmaWxlUGF0aDtcclxuICAgICAgICAgIC8vd2luZG93Lm9wZW5QREYoZmlsZU5hbWUpO1xyXG4gICAgICAgICAgLy9lbHNlXHJcbiAgICAgICAgICAvL3dpbmRvdy5vcGVuKGZpbGVQYXRoLCAnX2JsYW5rJywgJ2xvY2F0aW9uPW5vLGNsb3NlYnV0dG9uY2FwdGlvbj1DbG9zZSxlbmFibGVWaWV3cG9ydFNjYWxlPXllcycpOyovXHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICBjb3Jkb3ZhLnBsdWdpbnMuZmlsZU9wZW5lcjIub3BlbihcclxuICAgICAgICAgICAgZmlsZU5hbWUsXHJcbiAgICAgICAgICAgICdhcHBsaWNhdGlvbi9wZGYnLFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciBzdGF0dXM6ICcgKyBlLnN0YXR1cyArICcgLSBFcnJvciBtZXNzYWdlOiAnICsgZS5tZXNzYWdlKTtcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2ZpbGUgb3BlbmVkIHN1Y2Nlc3NmdWxseScpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgb3BlbkZsaWdodFByb2Nlc3NEcmlsbFBvcG92ZXIoJGV2ZW50LCBkYXRhLCBzZWxGaW5kTGV2ZWwpIHtcclxuICAgIHRoaXMuZHJpbGxOYW1lID0gJ0ZMSUdIVCBQUk9DRVNTSU5HIFNUQVRVUyAtICcgKyBkYXRhLnBvaW50WzBdICsgJy0nICsgdGhpcy5oZWFkZXIuZmxvd25Nb250aDtcclxuICAgIHRoaXMuZHJpbGxUeXBlID0gJ2ZsaWdodC1wcm9jZXNzJztcclxuICAgIHRoaXMuZ3JvdXBzID0gW107XHJcbiAgICB0aGlzLmRyaWxsdGFicyA9IFsnQ291bnRyeSBMZXZlbCcsICdTZWN0b3IgTGV2ZWwnLCAnRmxpZ2h0IExldmVsJywgJ0RvY3VtZW50IExldmVsJ107XHJcbiAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsnY291bnRyeUZyb20nLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2NhcnJpZXJDb2RlIyddO1xyXG4gICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgIHRoYXQuZHJpbGxwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgICAgdGhhdC5zaG93bkdyb3VwID0gMDtcclxuICAgIH0sIDUwKTtcclxuICAgIHRoaXMub3BlbkRyaWxsRG93bihkYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xyXG4gIH07XHJcblxyXG4gIG9wZW5Db3VucG9uQ291bnREcmlsbFBvcG92ZXIoJGV2ZW50LCBkYXRhLCBzZWxGaW5kTGV2ZWwpIHtcclxuICAgIHRoaXMuZHJpbGxOYW1lID0gJ0NPVVBPTiBDT1VOVCBCWSBFWENFUFRJT04gQ0FURUdPUlkgJztcclxuICAgIHRoaXMuZHJpbGxUeXBlID0gJ2NvdXBvbi1jb3VudCc7XHJcbiAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgdGhpcy5kcmlsbHRhYnMgPSBbJ0NvdXBvbiBDb3VudCBGbGlnaHQgU3RhdHVzJywgJ0RvY3VtZW50IExldmVsJ107XHJcbiAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsnZmxpZ2h0TnVtYmVyJywgJ2Zsb3duU2VjdG9yJ107XHJcbiAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdGhpcy4kdGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgdGhhdC5kcmlsbHBvcG92ZXIuc2hvdygkZXZlbnQpO1xyXG4gICAgICB0aGF0LnNob3duR3JvdXAgPSAwO1xyXG4gICAgfSwgNTApO1xyXG4gICAgdGhpcy5vcGVuRHJpbGxEb3duKGRhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XHJcbiAgfTtcclxuXHJcbiAgb3BlbkZsaWdodENvdW50RHJpbGxQb3BvdmVyKCRldmVudCwgZGF0YSwgc2VsRmluZExldmVsKSB7XHJcbiAgICB0aGlzLmRyaWxsTmFtZSA9ICdMSVNUIE9GIE9QRU4gRkxJR0hUUyBGT1IgJyArIGRhdGEucG9pbnRbMF0gKyAnLScgKyB0aGlzLmhlYWRlci5mbG93bk1vbnRoICsgJyBCWSBSRUFTT04gJztcclxuICAgIHRoaXMuZHJpbGxUeXBlID0gJ2ZsaWdodC1jb3VudCc7XHJcbiAgICB0aGlzLmdyb3VwcyA9IFtdO1xyXG4gICAgdGhpcy5kcmlsbHRhYnMgPSBbJ09wZW4gRmxpZ2h0IFN0YXR1cycsICdEb2N1bWVudCBMZXZlbCddO1xyXG4gICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2ZsaWdodE51bWJlcicsICdjYXJyaWVyQ29kZSddO1xyXG4gICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgIHRoYXQuZHJpbGxwb3BvdmVyLnNob3coJGV2ZW50KTtcclxuICAgICAgdGhhdC5zaG93bkdyb3VwID0gMDtcclxuICAgIH0sIDUwKTtcclxuICAgIHRoaXMub3BlbkRyaWxsRG93bihkYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xyXG4gIH07XHJcblxyXG4gIGRyaWxsRG93blJlcXVlc3QoZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpIHtcclxuICAgIHZhciByZXFkYXRhO1xyXG4gICAgaWYgKGRyaWxsVHlwZSA9PSAnZmxpZ2h0LXByb2Nlc3MnKSB7XHJcbiAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xyXG4gICAgICBpZiAoZGF0YS5sYWJlbCkge1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGFbMF07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBmbGlnaHREYXRlO1xyXG4gICAgICAvL2ZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IFN0cmluZyhkYXRhLmZsaWdodERhdGUpIDogU3RyaW5nKGRhdGFbMF0pO1xyXG4gICAgICBmbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBkYXRhLmZsaWdodERhdGUgOiAxO1xyXG4gICAgICB2YXIgY291bnRyeUZyb21UbyA9IChkYXRhLmNvdW50cnlGcm9tICYmIGRhdGEuY291bnRyeVRvKSA/IGRhdGEuY291bnRyeUZyb20gKyAnLScgKyBkYXRhLmNvdW50cnlUbyA6IFwiXCI7XHJcbiAgICAgIHZhciBzZWN0b3JGcm9tVG8gPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcblxyXG5cclxuXHJcbiAgICAgIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5nZXRQcm9maWxlVXNlck5hbWUoKSxcclxuICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxyXG4gICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxyXG4gICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxyXG4gICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiBmbGlnaHREYXRlLFxyXG4gICAgICAgIFwiY291bnRyeUZyb21Ub1wiOiBjb3VudHJ5RnJvbVRvLFxyXG4gICAgICAgIFwic2VjdG9yRnJvbVRvXCI6IHNlY3RvckZyb21UbyxcclxuICAgICAgICBcImZsaWdodE51bWJlclwiOiBmbGlnaHROdW1iZXJcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgaWYgKGRyaWxsVHlwZSA9PSAnY291cG9uLWNvdW50Jykge1xyXG4gICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcclxuICAgICAgaWYgKGRhdGEubGFiZWwpIHtcclxuICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhWzBdO1xyXG4gICAgICB9XHJcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkpO1xyXG4gICAgICB2YXIgZmxpZ2h0RGF0ZTtcclxuICAgICAgLy9mbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBTdHJpbmcoZGF0YS5mbGlnaHREYXRlKSA6IFN0cmluZyhkYXRhWzBdKTtcclxuICAgICAgZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gZGF0YS5mbGlnaHREYXRlIDogMTtcclxuICAgICAgdmFyIGV4Y2VwdGlvbkNhdGVnb3J5ID0gKHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkgJiYgZHJpbGxMZXZlbCA+IDEpID8gdGhpcy5leGNlcHRpb25DYXRlZ29yeSA6IFwiXCI7XHJcbiAgICAgIHZhciBmbGlnaHRTZWN0b3IgPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcblxyXG5cclxuXHJcbiAgICAgIHJlcWRhdGEgPSB7XHJcbiAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXHJcbiAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5nZXRQcm9maWxlVXNlck5hbWUoKSxcclxuICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxyXG4gICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxyXG4gICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxyXG4gICAgICAgIFwiZXhjZXB0aW9uQ2F0ZWdvcnlcIjogZXhjZXB0aW9uQ2F0ZWdvcnksXHJcbiAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxyXG4gICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiBmbGlnaHREYXRlLFxyXG4gICAgICAgIFwiZmxpZ2h0U2VjdG9yXCI6IGZsaWdodFNlY3RvcixcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZHJpbGxUeXBlID09ICdmbGlnaHQtY291bnQnKSB7XHJcbiAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xyXG4gICAgICBpZiAoZGF0YS5sYWJlbCkge1xyXG4gICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGFbMF07XHJcbiAgICAgIH1cclxuICAgICAgdmFyIGZsaWdodERhdGU7XHJcbiAgICAgIC8vZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gU3RyaW5nKGRhdGEuZmxpZ2h0RGF0ZSkgOiBTdHJpbmcoZGF0YVswXSk7XHJcbiAgICAgIGZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IGRhdGEuZmxpZ2h0RGF0ZSA6IDE7XHJcbiAgICAgIHZhciB0b2dnbGUxID0gdGhpcy50b2dnbGUub3Blbk9yQ2xvc2VkLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgIHZhciBmbGlnaHRTZWN0b3IgPSAoZGF0YS5mbG93blNlY3RvcikgPyBkYXRhLmZsb3duU2VjdG9yIDogXCJcIjtcclxuICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XHJcbiAgICAgIHZhciBmbGlnaHRTdGF0dXMgPSAodGhpcy5leGNlcHRpb25DYXRlZ29yeSAmJiBkcmlsbExldmVsID4gMSkgPyB0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5IDogXCJcIjtcclxuXHJcblxyXG4gICAgICByZXFkYXRhID0ge1xyXG4gICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxyXG4gICAgICAgIFwidXNlcklkXCI6IHRoaXMuZ2V0UHJvZmlsZVVzZXJOYW1lKCksXHJcbiAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJcIixcclxuICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcclxuICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcclxuICAgICAgICBcInRvZ2dsZTFcIjogdG9nZ2xlMSxcclxuICAgICAgICBcImZsaWdodFN0YXR1c1wiOiBmbGlnaHRTdGF0dXMsXHJcbiAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxyXG4gICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiBmbGlnaHREYXRlLFxyXG4gICAgICAgIFwiZmxpZ2h0U2VjdG9yXCI6IGZsaWdodFNlY3RvcixcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVxZGF0YTtcclxuICB9XHJcblxyXG4gIGdldERyaWxsRG93blVSTChkcmlsRG93blR5cGUpIHtcclxuICAgIHZhciB1cmxcclxuICAgIHN3aXRjaCAoZHJpbERvd25UeXBlKSB7XHJcbiAgICAgIGNhc2UgJ2ZsaWdodC1wcm9jZXNzJzpcclxuICAgICAgICB1cmwgPSBcIi9wYXhmbG5vcHIvZmxpZ2h0cHJvY2Vzc2luZ3N0YXR1c2RyaWxsXCI7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgJ2NvdXBvbi1jb3VudCc6XHJcbiAgICAgICAgdXJsID0gXCIvcGF4Zmxub3ByL2NvdXBvbmNvdW50YnlleHBkcmlsbFwiO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdmbGlnaHQtY291bnQnOlxyXG4gICAgICAgIHVybCA9IFwiL3BheGZsbm9wci9mbGlnaHRjb3VudGJ5cmVhc29uZHJpbGxcIjtcclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuICAgIHJldHVybiB1cmw7XHJcbiAgfVxyXG4gIHRhYlNsaWRlSGFzQ2hhbmdlZChpbmRleCkge1xyXG4gICAgdmFyIGRhdGEgPSB0aGlzLmdyb3Vwc1swXS5jb21wbGV0ZURhdGFbMF07XHJcbiAgICB0aGlzLmdyb3Vwc1swXS5pdGVtc1swXSA9IGRhdGFbaW5kZXhdLnZhbHVlcztcclxuICAgIHRoaXMuZ3JvdXBzWzBdLm9yZ0l0ZW1zWzBdID0gZGF0YVtpbmRleF0udmFsdWVzO1xyXG4gICAgdGhpcy5zb3J0KCcnLCAwLCBmYWxzZSk7XHJcbiAgICB0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5ID0gZGF0YVtpbmRleF0ua2V5O1xyXG4gIH1cclxuXHJcbiAgb3BlbkRyaWxsRG93bihkYXRhLCBzZWxGaW5kTGV2ZWwpIHtcclxuICAgIHNlbEZpbmRMZXZlbCA9IE51bWJlcihzZWxGaW5kTGV2ZWwpO1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbF0gPSBkYXRhO1xyXG4gICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbCArIDFdID0gJyc7XHJcblxyXG4gICAgaWYgKHNlbEZpbmRMZXZlbCAhPSAodGhpcy5ncm91cHMubGVuZ3RoIC0gMSkpIHtcclxuICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XHJcbiAgICAgIHZhciByZXFkYXRhID0gdGhpcy5kcmlsbERvd25SZXF1ZXN0KHRoaXMuZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpO1xyXG4gICAgICB2YXIgVVJMID0gdGhpcy5nZXREcmlsbERvd25VUkwodGhpcy5kcmlsbFR5cGUpO1xyXG4gICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcclxuICAgICAgdGhpcy5vcGVyYXRpb25hbFNlcnZpY2UuZ2V0RHJpbGxEb3duKHJlcWRhdGEsIFVSTClcclxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcclxuICAgICAgICAgIHZhciBkYXRhID0gZGF0YS5yZXNwb25zZTtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgdmFyIGZpbmRMZXZlbCA9IGRyaWxsTGV2ZWwgLSAxO1xyXG4gICAgICAgICAgaWYgKGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJykge1xyXG4gICAgICAgICAgICB2YXIgcmVzcFJlc3VsdDtcclxuICAgICAgICAgICAgaWYgKGRhdGEuZGF0YS5yb3dzKSB7XHJcbiAgICAgICAgICAgICAgcmVzcFJlc3VsdCA9IGRhdGEuZGF0YS5yb3dzO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHJlc3BSZXN1bHQgPSBkYXRhLmRhdGE7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICgodGhhdC5kcmlsbFR5cGUgPT0gJ2NvdXBvbi1jb3VudCcgfHwgdGhhdC5kcmlsbFR5cGUgPT0gJ2ZsaWdodC1jb3VudCcpICYmIGRhdGEuZGF0YS5yb3dzKSB7XHJcbiAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5pdGVtc1swXSA9IHJlc3BSZXN1bHRbMF0udmFsdWVzO1xyXG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0ub3JnSXRlbXNbMF0gPSByZXNwUmVzdWx0WzBdLnZhbHVlcztcclxuICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLmNvbXBsZXRlRGF0YVswXSA9IHJlc3BSZXN1bHQ7XHJcbiAgICAgICAgICAgICAgdGhhdC5leGNlcHRpb25DYXRlZ29yeSA9IHJlc3BSZXN1bHRbMF0ua2V5O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSByZXNwUmVzdWx0O1xyXG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0ub3JnSXRlbXNbMF0gPSByZXNwUmVzdWx0O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XHJcbiAgICAgICAgICAgIHRoYXQuc29ydCgnJywgZmluZExldmVsLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIHRoYXQuY2xlYXJEcmlsbChkcmlsbExldmVsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoYXQuc2hvd25Hcm91cCA9IGZpbmRMZXZlbDtcclxuICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGZpbmRMZXZlbCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xyXG4gICAgICAgICAgdGhhdC5jbG9zZXNQb3BvdmVyKCk7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICBhbGVydCgnU2VydmVyIEVycm9yJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjbG9zZURyaWxsUG9wb3ZlcigpIHtcclxuICAgIHRoaXMuZHJpbGxwb3BvdmVyLmhpZGUoKTtcclxuICB9XHJcblxyXG4gIGNsZWFyRHJpbGwobGV2ZWw6IG51bWJlcikge1xyXG4gICAgdmFyIGk6IG51bWJlcjtcclxuICAgIGZvciAodmFyIGkgPSBsZXZlbDsgaSA8IHRoaXMuZHJpbGx0YWJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHRoaXMuZ3JvdXBzW2ldLml0ZW1zLnNwbGljZSgwLCAxKTtcclxuICAgICAgdGhpcy5ncm91cHNbaV0ub3JnSXRlbXMuc3BsaWNlKDAsIDEpO1xyXG4gICAgICB0aGlzLnNvcnQoJycsIGksIGZhbHNlKTtcclxuICAgICAgY29uc29sZS5sb2codGhpcy5zZWxlY3RlZERyaWxsKTtcclxuICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW2ldID0gJyc7XHJcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuc2VsZWN0ZWREcmlsbCk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGluaXRpYXRlQXJyYXkoZHJpbGx0YWJzKSB7XHJcbiAgICBmb3IgKHZhciBpIGluIGRyaWxsdGFicykge1xyXG4gICAgICB0aGlzLmdyb3Vwc1tpXSA9IHtcclxuICAgICAgICBpZDogaSxcclxuICAgICAgICBuYW1lOiB0aGlzLmRyaWxsdGFic1tpXSxcclxuICAgICAgICBpdGVtczogW10sXHJcbiAgICAgICAgb3JnSXRlbXM6IFtdLFxyXG4gICAgICAgIEl0ZW1zQnlQYWdlOiBbXSxcclxuICAgICAgICBjb21wbGV0ZURhdGE6IFtdLFxyXG4gICAgICAgIGZpcnN0Q29sdW1uczogdGhpcy5maXJzdENvbHVtbnNbaV1cclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlzRHJpbGxSb3dTZWxlY3RlZChsZXZlbCwgb2JqKSB7XHJcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RlZERyaWxsW2xldmVsXSA9PSBvYmo7XHJcbiAgfVxyXG4gIHNlYXJjaFJlc3VsdHMobGV2ZWwsIG9iaikge1xyXG4gICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy5maWx0ZXJlZExpc3RTZXJ2aWNlLnNlYXJjaGVkKHRoaXMuZ3JvdXBzW2xldmVsXS5vcmdJdGVtc1swXSwgb2JqLnNlYXJjaFRleHQsIGxldmVsLCB0aGlzLmRyaWxsVHlwZSk7XHJcbiAgICBpZiAob2JqLnNlYXJjaFRleHQgPT0gJycpIHtcclxuICAgICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XHJcbiAgICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuZ3JvdXBzW2xldmVsXS5vcmdJdGVtc1swXTtcclxuICAgIH1cclxuICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcclxuICAgIHRoaXMucGFnaW5hdGlvbihsZXZlbCk7XHJcbiAgfVxyXG4gIHBhZ2luYXRpb24obGV2ZWwpIHtcclxuICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5JdGVtc0J5UGFnZSA9IHRoaXMuZmlsdGVyZWRMaXN0U2VydmljZS5wYWdlZCh0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0sIHRoaXMucGFnZVNpemUpO1xyXG4gIH07XHJcbiAgc2V0UGFnZShsZXZlbCwgcGFnZW5vKSB7XHJcbiAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IHBhZ2VubztcclxuICB9O1xyXG4gIGxhc3RQYWdlKGxldmVsKSB7XHJcbiAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IHRoaXMuZ3JvdXBzW2xldmVsXS5JdGVtc0J5UGFnZS5sZW5ndGggLSAxO1xyXG4gIH07XHJcbiAgcmVzZXRBbGwobGV2ZWwpIHtcclxuICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcclxuICB9XHJcbiAgc29ydChzb3J0QnksIGxldmVsLCBvcmRlcikge1xyXG4gICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XHJcbiAgICB0aGlzLmNvbHVtblRvT3JkZXIgPSBzb3J0Qnk7IFxyXG4gICAgLy8kRmlsdGVyIC0gU3RhbmRhcmQgU2VydmljZVxyXG4gICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy4kZmlsdGVyKCdvcmRlckJ5JykodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLmNvbHVtblRvT3JkZXIsIG9yZGVyKTtcclxuICAgIHRoaXMucGFnaW5hdGlvbihsZXZlbCk7XHJcbiAgfTtcclxuICByYW5nZSh0b3RhbCwgbGV2ZWwpIHtcclxuICAgIHZhciByZXQgPSBbXTtcclxuICAgIHZhciBzdGFydDogbnVtYmVyO1xyXG4gICAgc3RhcnQgPSAwO1xyXG4gICAgaWYodG90YWwgPiA1KSB7XHJcbiAgICAgIHN0YXJ0ID0gTnVtYmVyKHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdKSAtIDI7XHJcbiAgICB9XHJcbiAgICBpZiAoc3RhcnQgPCAwKSB7XHJcbiAgICAgIHN0YXJ0ID0gMDtcclxuICAgIH1cclxuICAgIHZhciBrID0gMTtcclxuICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IHRvdGFsOyBpKyspIHtcclxuICAgICAgcmV0LnB1c2goaSk7XHJcbiAgICAgIGsrKztcclxuICAgICAgaWYgKGsgPiA2KSB7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiByZXQ7XHJcbiAgfVxyXG4gIHRvZ2dsZUdyb3VwKGdyb3VwKSB7XHJcbiAgICBpZiAodGhpcy5pc0dyb3VwU2hvd24oZ3JvdXApKSB7XHJcbiAgICAgIHRoaXMuc2hvd25Hcm91cCA9IG51bGw7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLnNob3duR3JvdXAgPSBncm91cDtcclxuICAgIH1cclxuICB9XHJcbiAgaXNHcm91cFNob3duKGdyb3VwOiBudW1iZXIpIHtcclxuICAgIHJldHVybiB0aGlzLnNob3duR3JvdXAgPT0gZ3JvdXA7XHJcbiAgfVxyXG5cclxufVxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxyXG5cclxuY2xhc3MgTG9naW5Db250cm9sbGVyIHtcclxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzY29wZScsICckc3RhdGUnLCAnVXNlclNlcnZpY2UnLCAnJGlvbmljSGlzdG9yeSddO1xyXG5cdHByaXZhdGUgaW52YWxpZE1lc3NhZ2U6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRwcml2YXRlIHVzZXJuYW1lOiBzdHJpbmc7XHJcblx0cHJpdmF0ZSBwYXNzd29yZDogc3RyaW5nO1xyXG5cdHByaXZhdGUgaXBhZGRyZXNzOiBzdHJpbmc7XHJcblx0cHJpdmF0ZSBlcm9vcm1lc3NhZ2U6IHN0cmluZztcclxuXHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSwgcHJpdmF0ZSAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSxcclxuXHRwcml2YXRlIHVzZXJTZXJ2aWNlOiBVc2VyU2VydmljZSwgcHJpdmF0ZSAkaW9uaWNIaXN0b3J5OiBhbnkpIHtcclxuXHRcdGlmICh0aGlzLnVzZXJTZXJ2aWNlLmlzTG9nZ2VkSW4oKSkge1xyXG5cdFx0XHQkaW9uaWNIaXN0b3J5Lm5leHRWaWV3T3B0aW9ucyh7XHJcblx0XHRcdFx0ZGlzYWJsZUJhY2s6IHRydWVcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNvbnNvbGUubG9nKCduYXZnYXRpbmcgdG8gbWlzLWZsb3duLi4nKTtcclxuXHRcdFx0dGhpcy4kc3RhdGUuZ28oJ2FwcC5taXMtZmxvd24nKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGNsZWFyRXJyb3IoKSB7XHJcblx0XHR0aGlzLmludmFsaWRNZXNzYWdlID0gZmFsc2U7XHJcblx0fVxyXG5cclxuXHRkb0xvZ2luKGxvZ2luRm9ybTogYm9vbGVhbikge1xyXG5cdFx0aWYgKCFsb2dpbkZvcm0pIHtcclxuXHRcdFx0aWYgKCFhbmd1bGFyLmlzRGVmaW5lZCh0aGlzLnVzZXJuYW1lKSB8fCAhYW5ndWxhci5pc0RlZmluZWQodGhpcy5wYXNzd29yZCkgfHwgIWFuZ3VsYXIuaXNEZWZpbmVkKHRoaXMuaXBhZGRyZXNzKSB8fHRoaXMudXNlcm5hbWUudHJpbSgpID09IFwiXCIgfHwgdGhpcy5wYXNzd29yZC50cmltKCkgPT0gXCJcIiB8fCB0aGlzLmlwYWRkcmVzcy50cmltKCkgPT0gXCJcIikge1xyXG5cdFx0XHRcdHRoaXMuaW52YWxpZE1lc3NhZ2UgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdFNFUlZFUl9VUkwgPSAnaHR0cDovLycgKyB0aGlzLmlwYWRkcmVzcyArICcvJyArICdyYXBpZC13cy9zZXJ2aWNlcy9yZXN0JztcclxuXHRcdFx0dGhpcy51c2VyU2VydmljZS5sb2dpbih0aGlzLnVzZXJuYW1lLHRoaXMucGFzc3dvcmQpLnRoZW4oXHJcblx0XHRcdFx0KHJlc3VsdCkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHJlc3VsdC5yZXNwb25zZS5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0dmFyIHJlcSA9IHtcclxuXHRcdFx0XHRcdFx0XHR1c2VySWQ6IHRoaXMudXNlcm5hbWVcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR0aGlzLnVzZXJTZXJ2aWNlLmdldFVzZXJQcm9maWxlKHJlcSkudGhlbihcclxuXHRcdFx0XHRcdFx0XHQocHJvZmlsZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0dmFyIHVzZXJOYW1lID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR1c2VybmFtZTogcHJvZmlsZS5yZXNwb25zZS5kYXRhLnVzZXJJbmZvLnVzZXJOYW1lXHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnVzZXJTZXJ2aWNlLnNldFVzZXIodXNlck5hbWUpO1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy4kaW9uaWNIaXN0b3J5Lm5leHRWaWV3T3B0aW9ucyh7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGRpc2FibGVCYWNrOiB0cnVlXHJcblx0XHRcdFx0XHRcdFx0XHR9KTsgXHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLiRzdGF0ZS5nbyhcImFwcC5taXMtZmxvd25cIik7XHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHQoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkIG9uIGxvYWRpbmcgdXNlciBwcm9maWxlJyk7XHJcblx0XHRcdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5pbnZhbGlkTWVzc2FnZSA9IHRydWU7XHJcblx0XHRcdFx0XHRcdHRoaXMuZXJvb3JtZXNzYWdlID0gXCJQbGVhc2UgY2hlY2sgeW91ciBjcmVkZW50aWFsc1wiO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0KGVycm9yKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmludmFsaWRNZXNzYWdlID0gdHJ1ZTtcclxuXHRcdFx0XHRcdHRoaXMuZXJvb3JtZXNzYWdlID0gXCJQbGVhc2UgY2hlY2sgeW91ciBuZXR3b3JrIGNvbm5lY3Rpb25cIjtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0gXHJcblx0fVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cclxuXHJcbmNsYXNzIENoYXJ0RXZlbnQgaW1wbGVtZW50cyBuZy5JRGlyZWN0aXZlIHtcclxuXHRyZXN0cmljdCA9ICdFJztcclxuXHRzY29wZSA9IHtcclxuXHRcdHR5cGU6IFwiPVwiXHJcblx0fTtcclxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsIHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UpIHtcclxuXHR9O1xyXG5cclxuXHRsaW5rID0gKCRzY29wZTogbmcuSVNjb3BlLCBpRWxlbWVudDogSlF1ZXJ5LCBhdHRyaWJ1dGVzOiBuZy5JQXR0cmlidXRlcywgJHNjZTogbmcuSVNDRVNlcnZpY2UpOiB2b2lkID0+IHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciBudmQzXHJcblx0XHRpZihhdHRyaWJ1dGVzLnR5cGUgPT0gJ21ldHJpYycgfHwgYXR0cmlidXRlcy50eXBlID09ICd0YXJnZXQnIHx8IGF0dHJpYnV0ZXMudHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jyl7XHJcblx0XHRcdG52ZDMgPSBpRWxlbWVudC5maW5kKCdudmQzJylbMF07XHJcblx0XHR9XHJcblx0XHRpZihhdHRyaWJ1dGVzLnR5cGUgPT0gJ2ZsaWdodC1wcm9jZXNzJyB8fCBhdHRyaWJ1dGVzLnR5cGUgPT0gJ2ZsaWdodC1jb3VudCcgfHwgYXR0cmlidXRlcy50eXBlID09ICdjb3Vwb24tY291bnQnKXtcclxuXHRcdFx0bnZkMyA9IGlFbGVtZW50LmZpbmQoJ252ZDMtbXVsdGktYmFyLWNoYXJ0JylbMF07XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHZhciBzZWxlY3RlZEVsZW0gPSBhbmd1bGFyLmVsZW1lbnQobnZkMyk7XHJcblxyXG5cdFx0XHJcblx0XHRcdFx0XHRcclxuXHJcblx0XHRzZWxmLiR0aW1lb3V0KFxyXG5cdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0c2VsZWN0ZWRFbGVtLnJlYWR5KGZ1bmN0aW9uKGUpIHtcclxuXHRcdFx0XHRcdHZhciBmaXJzdDogbnVtYmVyO1xyXG5cdFx0XHRcdFx0c2VsZWN0ZWRFbGVtLm9uKCdtb3VzZW92ZXIgdG91Y2hlbmQnLCBmdW5jdGlvbihldmVudCkge1xyXG5cdFx0XHRcdFx0XHRpZighZmlyc3Qpe1xyXG5cdFx0XHRcdFx0XHRcdHNlbGYuYXBwZW5kQ2xpY2soc2VsZWN0ZWRFbGVtLCBhdHRyaWJ1dGVzLCBzZWxmKTtcclxuXHRcdFx0XHRcdFx0XHRmaXJzdCA9IDE7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0LypcclxuXHRcdFx0XHRcdCRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7IHJldHVybiBzZWxlY3RlZEVsZW0uaHRtbCgpO1x0IH0sIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG5cdFx0XHRcdFx0XHRpZiAobmV3VmFsdWUpIHtcclxuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKG5ld1ZhbHVlKTtcclxuXHRcdFx0XHRcdFx0XHRzZWxmLmFwcGVuZENsaWNrKHNlbGVjdGVkRWxlbSwgYXR0cmlidXRlcywgc2VsZik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sIHRydWUpOyovXHJcblx0XHRcdFx0XHRzZWxmLmFwcGVuZENsaWNrKHNlbGVjdGVkRWxlbSwgYXR0cmlidXRlcywgc2VsZik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0sXHJcblx0XHRcdDEwKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBmYWN0b3J5KCk6IG5nLklEaXJlY3RpdmVGYWN0b3J5IHtcclxuXHRcdHZhciBkaXJlY3RpdmUgPSAoJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSwgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UpID0+IG5ldyBDaGFydEV2ZW50KCR0aW1lb3V0LCAkcm9vdFNjb3BlKVxyXG5cdFx0ZGlyZWN0aXZlLiRpbmplY3QgPSBbJyR0aW1lb3V0JywgJyRyb290U2NvcGUnXTtcclxuXHRcdHJldHVybiBkaXJlY3RpdmU7XHJcblx0fVxyXG5cclxuXHRhcHBlbmRDbGljayhzZWxlY3RlZEVsZW0sIGF0dHJpYnV0ZXMsIHNlbGYpIHtcclxuXHRcdHZhciBkYmxDbGlja0ludGVydmFsID0gMzAwO1xyXG5cdFx0dmFyIGZpcnN0Q2xpY2tUaW1lO1xyXG5cdFx0dmFyIHdhaXRpbmdTZWNvbmRDbGljayA9IGZhbHNlO1xyXG5cdFx0dmFyIGNoaWxkRWxlbTogYW55ID0gc2VsZWN0ZWRFbGVtLmZpbmQoJ3JlY3QnKTtcclxuXHRcdGFuZ3VsYXIuZm9yRWFjaChjaGlsZEVsZW0sIGZ1bmN0aW9uKGVsZW0sIGtleSkge1xyXG5cdFx0XHRpZiAoZWxlbS50YWdOYW1lID09ICdyZWN0Jykge1xyXG5cdFx0XHRcdHZhciByZWN0RWxlbSA9IGFuZ3VsYXIuZWxlbWVudChlbGVtKTtcclxuXHRcdFx0XHRyZWN0RWxlbS5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xyXG5cdFx0XHRcdFx0aWYgKCF3YWl0aW5nU2Vjb25kQ2xpY2spIHtcclxuXHRcdFx0XHRcdFx0Ly8gU2luZ2xlIGNsbGlja1xyXG5cdFx0XHRcdFx0XHRmaXJzdENsaWNrVGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcblx0XHRcdFx0XHRcdHdhaXRpbmdTZWNvbmRDbGljayA9IHRydWU7XHJcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdHdhaXRpbmdTZWNvbmRDbGljayA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHdhaXRpbmdTZWNvbmRDbGljayk7XHJcblx0XHRcdFx0XHRcdH0sIGRibENsaWNrSW50ZXJ2YWwpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRcdC8vIERvdWJsZSBjbGxpY2tcclxuXHRcdFx0XHRcdFx0d2FpdGluZ1NlY29uZENsaWNrID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdHZhciB0aW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuXHRcdFx0XHRcdFx0aWYgKHRpbWUgLSBmaXJzdENsaWNrVGltZSA8IGRibENsaWNrSW50ZXJ2YWwpIHtcclxuXHRcdFx0XHRcdFx0XHR2YXIgdHlwZSA9IGF0dHJpYnV0ZXMudHlwZTtcclxuXHRcdFx0XHRcdFx0XHRpZihhdHRyaWJ1dGVzLnR5cGUgPT0gJ21ldHJpYycgfHwgYXR0cmlidXRlcy50eXBlID09ICd0YXJnZXQnIHx8IGF0dHJpYnV0ZXMudHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jyl7XHJcblx0XHRcdFx0XHRcdFx0XHRzZWxmLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnb3BlbkRyaWxsUG9wdXAnLCB7XCJkYXRhXCIgOiByZWN0RWxlbVswXVsnX19kYXRhX18nXSwgXCJ0eXBlXCI6IHR5cGUsIFwiZXZlbnRcIjogZXZlbnR9KTsgXHJcblx0XHRcdFx0XHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhyZWN0RWxlbSk7XHJcblx0XHRcdFx0XHRcdFx0XHRzZWxmLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnb3BlbkRyaWxsUG9wdXAxJywge1wiZGF0YVwiIDogcmVjdEVsZW1bMF1bJ19fZGF0YV9fJ10sIFwidHlwZVwiOiB0eXBlLCBcImV2ZW50XCI6IGV2ZW50fSk7IFxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdH1cclxuXHRcdH0pOyBcclxuXHR9XHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vX2xpYnMudHNcIiAvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL2FwcC9BcHBDb250cm9sbGVyLnRzXCIgLz5cclxuXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9Db3Jkb3ZhU2VydmljZS50c1wiIC8+XHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9zZXJ2aWNlcy9Mb2NhbFN0b3JhZ2VTZXJ2aWNlLnRzXCIgLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL3NlcnZpY2VzL1Nlc3Npb25TZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vc2VydmljZXMvRXJyb3JIYW5kbGVyU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvTWlzU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL29wZXJhdGlvbmFsL3NlcnZpY2VzL09wZXJhdGlvbmFsU2VydmljZS50c1wiLz5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9NaXNDb250cm9sbGVyLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL09wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRzXCIvPlxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL3VzZXIvTG9naW5Db250cm9sbGVyLnRzXCIvPlxyXG5cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL2NoYXJ0LWV2ZW50L0NoYXJ0RXZlbnQudHNcIiAvPlxyXG5cclxudmFyIFNFUlZFUl9VUkwgPSAnaHR0cDovLzEwLjkxLjE1Mi45OTo4MDgyL3JhcGlkLXdzL3NlcnZpY2VzL3Jlc3QnO1xyXG5hbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnLCBbJ2lvbmljJywgJ3JhcGlkTW9iaWxlLmNvbmZpZycsICd0YWJTbGlkZUJveCcsICdudmQzQ2hhcnREaXJlY3RpdmVzJywgJ252ZDMnXSlcclxuXHJcblx0LnJ1bigoJGlvbmljUGxhdGZvcm06IElvbmljLklQbGF0Zm9ybSwgJGh0dHA6IG5nLklIdHRwU2VydmljZSkgPT4ge1xyXG5cdFx0JGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb24udG9rZW4gPSAndG9rZW4nO1xyXG4gIFx0XHQkaHR0cC5kZWZhdWx0cy5oZWFkZXJzLnBvc3RbXCJDb250ZW50LVR5cGVcIl0gPSBcImFwcGxpY2F0aW9uL2pzb25cIjtcclxuXHRcdCRpb25pY1BsYXRmb3JtLnJlYWR5KCgpID0+IHtcclxuXHRcdFx0aWYgKHR5cGVvZiBuYXZpZ2F0b3IuZ2xvYmFsaXphdGlvbiAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0fVxyXG5cdFx0fSlcclxuXHR9KVxyXG4uY29uZmlnKCgkc3RhdGVQcm92aWRlcjogYW5ndWxhci51aS5JU3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyOiBhbmd1bGFyLnVpLklVcmxSb3V0ZXJQcm92aWRlcixcclxuXHQkaW9uaWNDb25maWdQcm92aWRlcjogSW9uaWMuSUNvbmZpZ1Byb3ZpZGVyKSA9PiB7XHJcblx0JGlvbmljQ29uZmlnUHJvdmlkZXIudmlld3Muc3dpcGVCYWNrRW5hYmxlZChmYWxzZSk7XHJcblxyXG5cdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhcHAnLCB7XHJcblx0XHR1cmw6ICcvYXBwJyxcclxuXHRcdGFic3RyYWN0OiB0cnVlLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3RlbXBsYXRlcy9tZW51Lmh0bWwnLFxyXG5cdFx0Y29udHJvbGxlcjogJ0FwcENvbnRyb2xsZXIgYXMgYXBwQ3RybCdcclxuXHR9KVxyXG5cdC5zdGF0ZSgnbG9naW4nLCB7XHJcblx0XHRjYWNoZTogZmFsc2UsXHJcblx0XHR1cmw6ICcvbG9naW4nLFxyXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3VzZXIvbG9naW4uaHRtbCcsXHJcblx0XHRjb250cm9sbGVyOiAnTG9naW5Db250cm9sbGVyIGFzIExvZ2luQ3RybCdcclxuXHR9KVxyXG5cdC5zdGF0ZSgnYXBwLm1pcy1mbG93bicsIHtcclxuXHRcdGNhY2hlOiBmYWxzZSxcclxuXHRcdHVybDogJy9taXMvZmxvd24nLFxyXG5cdFx0dmlld3M6IHtcclxuXHRcdFx0J21lbnVDb250ZW50Jzoge1xyXG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9taXMvZmxvd24uaHRtbCcsXHJcblx0XHRcdFx0Y29udHJvbGxlcjogJ01pc0NvbnRyb2xsZXIgYXMgTWlzQ3RybCdcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pXHJcblx0LnN0YXRlKCdhcHAub3BlcmF0aW9uYWwtZmxvd24nLCB7XHJcblx0XHRjYWNoZTogZmFsc2UsXHJcblx0XHR1cmw6ICcvb3BlcmF0aW9uYWwvZmxvd24nLFxyXG5cdFx0dmlld3M6IHtcclxuXHRcdFx0J21lbnVDb250ZW50Jzoge1xyXG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9mbG93bi5odG1sJyxcclxuXHRcdFx0XHRjb250cm9sbGVyOiAnT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIgYXMgT3ByQ3RybCdcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHQkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvbG9naW4nKTtcclxufSlcclxuXHJcbi5zZXJ2aWNlKCdEYXRhUHJvdmlkZXJTZXJ2aWNlJywgRGF0YVByb3ZpZGVyU2VydmljZSlcclxuLnNlcnZpY2UoJ05ldFNlcnZpY2UnLCBOZXRTZXJ2aWNlKVxyXG4uc2VydmljZSgnRXJyb3JIYW5kbGVyU2VydmljZScsIEVycm9ySGFuZGxlclNlcnZpY2UpXHJcbi5zZXJ2aWNlKCdTZXNzaW9uU2VydmljZScsIFNlc3Npb25TZXJ2aWNlKVxyXG4uc2VydmljZSgnQ29yZG92YVNlcnZpY2UnLCBDb3Jkb3ZhU2VydmljZSlcclxuLnNlcnZpY2UoJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCBMb2NhbFN0b3JhZ2VTZXJ2aWNlKVxyXG4uc2VydmljZSgnVXNlclNlcnZpY2UnLCBVc2VyU2VydmljZSlcclxuXHJcbi5zZXJ2aWNlKCdNaXNTZXJ2aWNlJywgTWlzU2VydmljZSlcclxuLnNlcnZpY2UoJ09wZXJhdGlvbmFsU2VydmljZScsIE9wZXJhdGlvbmFsU2VydmljZSlcclxuLnNlcnZpY2UoJ0ZpbHRlcmVkTGlzdFNlcnZpY2UnLCBGaWx0ZXJlZExpc3RTZXJ2aWNlKVxyXG4uc2VydmljZSgnQ2hhcnRvcHRpb25TZXJ2aWNlJywgQ2hhcnRvcHRpb25TZXJ2aWNlKVxyXG5cclxuLmNvbnRyb2xsZXIoJ0FwcENvbnRyb2xsZXInLCBBcHBDb250cm9sbGVyKVxyXG4uY29udHJvbGxlcignTWlzQ29udHJvbGxlcicsIE1pc0NvbnRyb2xsZXIpXHJcbi5jb250cm9sbGVyKCdPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlcicsIE9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyKVxyXG4uY29udHJvbGxlcignTG9naW5Db250cm9sbGVyJywgTG9naW5Db250cm9sbGVyKVxyXG5cclxuLmRpcmVjdGl2ZSgnY2hhcnRldmVudCcsIENoYXJ0RXZlbnQuZmFjdG9yeSgpKVxyXG4vLyAuZGlyZWN0aXZlKCdmZXRjaExpc3QnLCBGZXRjaExpc3QuZmFjdG9yeSgpKVxyXG5cclxuXHJcbmlvbmljLlBsYXRmb3JtLnJlYWR5KCgpID0+IHtcclxuXHRpZiAod2luZG93LmNvcmRvdmEgJiYgd2luZG93LmNvcmRvdmEucGx1Z2lucy5LZXlib2FyZCkge1xyXG5cdH1cclxuXHQvLyBTdGF0dXNCYXIub3ZlcmxheXNXZWJWaWV3KGZhbHNlKTtcclxuIC8vICAgIFN0YXR1c0Jhci5iYWNrZ3JvdW5kQ29sb3JCeUhleFN0cmluZygnIzIwOWRjMicpO1xyXG4gLy8gICAgU3RhdHVzQmFyLnN0eWxlTGlnaHRDb250ZW50KCk7XHJcblx0Xy5kZWZlcigoKSA9PiB7XHJcblx0XHQvLyBhbmd1bGFyLmJvb3RzdHJhcChkb2N1bWVudCwgWydyYXBpZE1vYmlsZSddKTtcclxuXHR9KTtcclxufSk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG4gIGFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScpXHJcbiAgLmRpcmVjdGl2ZSgnaGVQcm9ncmVzc0JhcicsIGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBkaXJlY3RpdmVEZWZpbml0aW9uT2JqZWN0ID0ge1xyXG4gICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICByZXBsYWNlOiBmYWxzZSxcclxuICAgICAgc2NvcGU6IHtkYXRhOiAnPWNoYXJ0RGF0YScsIHNob3d0b29sdGlwOiAnQHNob3dUb29sdGlwJ30sXHJcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICB2YXIgeCA9IGQzLnNjYWxlLmxpbmVhcigpXHJcbiAgICAgICAgICAgICAgICAgIC5kb21haW4oWzAsIGQzLm1heChzY29wZS5kYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiArZC5wcm9ncmVzcyB9KV0pXHJcbiAgICAgICAgICAgICAgICAgIC5yYW5nZShbMCwgOTBdKTtcclxuXHJcbiAgICAgICAgdmFyIHNlZ21lbnQgPSBkMy5zZWxlY3QoZWxlbWVudFswXSlcclxuICAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbChcIi5ob3Jpem9udGFsLWJhci1ncmFwaC1zZWdtZW50XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5kYXRhKHNjb3BlLmRhdGEpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5lbnRlcigpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIilcclxuICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC1zZWdtZW50XCIsIHRydWUpO1xyXG5cclxuICAgICAgICBzZWdtZW50LmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtbGFiZWxcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5uYW1lIH0pO1xyXG5cclxuICAgICAgICB2YXIgYmFyU2VnbWVudCA9IHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZVwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXZhbHVlLXNjYWxlXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtdmFsdWUtYmFyXCIsIHRydWUpO1xyXG5cclxuICAgICAgICBiYXJTZWdtZW50XHJcbiAgICAgICAgICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jb2xvciB9KSAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKClcclxuICAgICAgICAgICAgICAgLmR1cmF0aW9uKDEwMDApXHJcbiAgICAgICAgICAgICAgIC5zdHlsZShcIm1pbi13aWR0aFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiB4KCtkLnByb2dyZXNzKSArIFwiJVwiIH0pO1xyXG5cclxuICAgICAgICB2YXIgYm94U2VnbWVudCA9IGJhclNlZ21lbnQuYXBwZW5kKFwic3BhblwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtdmFsdWUtYm94XCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5wcm9ncmVzcyA/IGQucHJvZ3Jlc3MgOiBcIlwiIH0pO1xyXG4gICAgICAgIGlmKHNjb3BlLnNob3d0b29sdGlwICE9PSAndHJ1ZScpIHJldHVybjsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICB2YXIgYnRuU2VnbWVudCA9IHNlZ21lbnQuYXBwZW5kKFwiYnV0dG9uXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC1pY29uIGljb24gaW9uLWNoZXZyb24tZG93biBuby1ib3JkZXIgc2VjdG9yQ3VzdG9tQ2xhc3NcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImhpZGVcIiwgZnVuY3Rpb24oZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihkKSByZXR1cm4gZC5kcmlsbEZsYWcgPT0gJ04nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pOyAgICAgICAgICAgIFxyXG4gICAgICAgIHZhciB0b29sdGlwU2VnbWVudCA9IHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwidG9vbHRpcFwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZCgnaGlkZScsIHRydWUpO1xyXG4gICAgICAgIHRvb2x0aXBTZWdtZW50LmFwcGVuZChcInBcIikudGV4dChmdW5jdGlvbihkKXsgcmV0dXJuIGQubmFtZTsgfSk7XHJcbiAgICAgICAgdmFyIHRhYmxlID0gdG9vbHRpcFNlZ21lbnQuYXBwZW5kKFwidGFibGVcIik7XHJcbiAgICAgICAgdmFyIHRoZWFkID0gdGFibGUuYXBwZW5kKCd0cicpO1xyXG4gICAgICAgIHRoZWFkLmFwcGVuZCgndGgnKS50ZXh0KCdTZWN0b3InKTtcclxuICAgICAgICB0aGVhZC5hcHBlbmQoJ3RoJykudGV4dCgnUmV2ZW51ZScpO1xyXG5cclxuICAgICAgICB2YXIgdHIgID0gdGFibGVcclxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKCd0Ym9keScpXHJcbiAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbChcInRyXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEoZnVuY3Rpb24oZCl7cmV0dXJuIGQuc2NBbmFseXNpc0RyaWxsc30pXHJcbiAgICAgICAgICAgICAgICAgICAgLmVudGVyKCkuYXBwZW5kKFwidHJcIik7XHJcblxyXG4gICAgICAgIHZhciBzZWN0b3JUZCA9IHRyLmFwcGVuZChcInRkXCIpXHJcbiAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc2VjdG9yIH0pO1xyXG5cclxuICAgICAgICB2YXIgcmV2ZW51ZVRkID0gdHIuYXBwZW5kKFwidGRcIilcclxuICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5yZXZlbnVlIH0pO1xyXG5cclxuICAgICAgICBidG5TZWdtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7ICAgICAgICAgICAgICBcclxuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRvb2x0aXBTZWdtZW50KTtcclxuXHRcdCAgYW5ndWxhci5lbGVtZW50KHRoaXMpLnJlbW92ZUNsYXNzKCdzZWN0b3JDdXN0b21DbGFzcycpO1xyXG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5zZWN0b3JDdXN0b21DbGFzc1wiKSkucmVtb3ZlQ2xhc3MoJ2lvbi1jaGV2cm9uLXVwJyk7XHJcblx0XHQgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlY3RvckN1c3RvbUNsYXNzXCIpKS5hZGRDbGFzcygnaW9uLWNoZXZyb24tZG93bicpO1xyXG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5zZWN0b3JDdXN0b21DbGFzc1wiKSkubmV4dCgpLnJlbW92ZUNsYXNzKCdzaG93Jyk7XHJcblx0XHQgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlY3RvckN1c3RvbUNsYXNzXCIpKS5uZXh0KCkuYWRkQ2xhc3MoJ2hpZGUnKTtcclxuXHRcdCAgXHJcbiAgICAgICAgICBpZihhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLmhhc0NsYXNzKCdzaG93JykpIHtcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLnJlbW92ZUNsYXNzKCdpb24tY2hldnJvbi11cCcpO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykuYWRkQ2xhc3MoJ2lvbi1jaGV2cm9uLWRvd24nKTtcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5yZW1vdmVDbGFzcygnc2hvdycpOyAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLmFkZENsYXNzKCdoaWRlJyk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykucmVtb3ZlQ2xhc3MoJ2lvbi1jaGV2cm9uLWRvd24nKTtcclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLmFkZENsYXNzKCdpb24tY2hldnJvbi11cCcpO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLnJlbW92ZUNsYXNzKCdoaWRlJyk7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkuYWRkQ2xhc3MoJ3Nob3cnKTtcclxuICAgICAgICAgIH1cclxuXHRcdCAgYW5ndWxhci5lbGVtZW50KHRoaXMpLmFkZENsYXNzKCdzZWN0b3JDdXN0b21DbGFzcycpO1xyXG5cdFx0ICBcclxuXHRcdCAgXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgICByZXR1cm4gZGlyZWN0aXZlRGVmaW5pdGlvbk9iamVjdDtcclxuICB9KTtcclxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKVxyXG4gIC5kaXJlY3RpdmUoJ2hlUmV2ZW51ZVByb2dyZXNzQmFyJywgZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHJldkJhck9iamVjdCA9IHtcclxuICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgcmVwbGFjZTogZmFsc2UsXHJcbiAgICAgIHNjb3BlOiB7ZGF0YTogJz1jaGFydERhdGEnfSxcclxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHNjb3BlLmRhdGEpO1xyXG4gICAgICAgIHNjb3BlLiR3YXRjaCgnZGF0YScsIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xyXG4gICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCduZXdWYWx1ZScsIG5ld1ZhbHVlKTtcclxuICAgICAgICAgICAgdmFyIHggPSBkMy5zY2FsZS5saW5lYXIoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgLmRvbWFpbihbMCwgZDMubWF4KHNjb3BlLmRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudmFsdWUgfSldKVxyXG4gICAgICAgICAgICAgICAgICAgICAgLnJhbmdlKFswLCA5MF0pO1xyXG5cclxuICAgICAgICAgICAgdmFyIHNlZ21lbnQgPSBkMy5zZWxlY3QoZWxlbWVudFswXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoXCIubmV0LXJldi1iYXItZ3JhcGgtc2VnbWVudFwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmRhdGEoc2NvcGUuZGF0YSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgIC5lbnRlcigpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXNlZ21lbnRcIiwgdHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICBzZWdtZW50LmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtbGFiZWxcIiwgdHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQubmFtZSB9KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXJTZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlLXNjYWxlXCIsIHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlLWJhclwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlLWJveFwiLCB0cnVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlOyB9KTtcclxuXHJcbiAgICAgICAgICAgIGJhclNlZ21lbnQgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuY29sb3IgfSkgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxyXG4gICAgICAgICAgICAgICAgICAgLmR1cmF0aW9uKDEwMDApXHJcbiAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJtaW4td2lkdGhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLnZhbHVlKSArIFwiJVwiIH0pOyAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgIH0gICAgICAgICAgICAgICBcclxuICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICAgIHJldHVybiByZXZCYXJPYmplY3Q7XHJcbiAgfSk7XHJcbn0pKCk7IixudWxsLCJcclxuKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG4gICAgLy8gYXR0YWNoIHRoZSBmYWN0b3JpZXMgYW5kIHNlcnZpY2UgdG8gdGhlIFtzdGFydGVyLnNlcnZpY2VzXSBtb2R1bGUgaW4gYW5ndWxhclxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcclxuICAgICAgICAuc2VydmljZSgnUmVwb3J0QnVpbGRlclN2YycsIHJlcG9ydEJ1aWxkZXJTZXJ2aWNlKTtcclxuICAgIFxyXG5cdGZ1bmN0aW9uIHJlcG9ydEJ1aWxkZXJTZXJ2aWNlKCkge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBcclxuICAgICAgICBzZWxmLmdlbmVyYXRlUmVwb3J0ID0gX2dlbmVyYXRlUmVwb3J0OyAgICAgICAgICAgIFxyXG4gICAgICAgIGZ1bmN0aW9uIF9nZW5lcmF0ZVJlcG9ydChwYXJhbSwgY2hhcnRUaXRsZSxmbG93bk1vbnRoKSB7XHJcblx0XHRcdHZhciB0aXRsZSA9IFwiXCI7XHJcblx0XHRcdGlmKHBhcmFtID09IFwibWV0cmljU25hcHNob3RcIilcclxuXHRcdFx0XHR0aXRsZSA9IFwiTUVUUklDIFNOQVBTSE9UIC1cIitmbG93bk1vbnRoK1wiIFwiK2NoYXJ0VGl0bGUudG9VcHBlckNhc2UoKStcIi0gVklFV1wiO1xyXG5cdFx0XHRlbHNlIGlmKHBhcmFtID09IFwidGFyZ2V0QWN0dWFsXCIpXHJcblx0XHRcdFx0dGl0bGUgPSBcIlRBUkdFVCBWUyBBQ1RVQUwgLSBcIisoKGNoYXJ0VGl0bGUgPT0gXCJyZXZlbnVlXCIpP1wiTkVUIFJFVkVOVUVcIjpcIlBBWCBDb3VudFwiKStcIiBcIitmbG93bk1vbnRoKyBcIiAtIFZJRVdcIjtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHRpdGxlID0gY2hhcnRUaXRsZStcIiBcIitmbG93bk1vbnRoK1wiIC0gVklFV1wiO1xyXG5cdFx0XHRcdFx0XHRcdFxyXG5cdFx0XHR2YXIgc3ZnTm9kZSA9IGQzLnNlbGVjdEFsbChcIi5cIitwYXJhbSkuc2VsZWN0QWxsKFwic3ZnXCIpO1xyXG5cdFx0XHR2YXIgY29udGVudCA9IFtdO1xyXG5cdFx0XHR2YXIgaW1hZ2VDb2x1bW4gPSBbXTtcclxuXHRcdFx0dmFyIHRleHRDb2x1bW4gPSBbXTtcclxuXHRcdFx0dmFyIGltYWdlc09iaiA9IHt9O1xyXG5cdFx0XHR2YXIgdGV4dE9iaiA9IHt9O1xyXG5cdFx0XHRjb250ZW50LnB1c2godGl0bGUpO1xyXG5cdFx0XHR2YXIgbm9kZUV4aXN0cyA9IFtdO1xyXG5cdFx0XHRhbmd1bGFyLmZvckVhY2goc3ZnTm9kZSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1x0XHRcdFx0XHJcblx0XHRcdFx0Ly90ZXh0T2JqWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInXHRcdFx0XHRcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgaHRtbCA9IFwiXCI7XHJcblx0XHRcdFx0aWYobm9kZUV4aXN0cy5pbmRleE9mKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1mbGFnXCIpKSA9PSAtMSAmJiBzdmdOb2RlW2tleV0ubGVuZ3RoID49IDEpe1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdFx0aHRtbCA9IHN2Z05vZGVba2V5XVswXS5vdXRlckhUTUw7XHJcblx0XHRcdFx0XHRpZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tcGRmRmxhZ1wiKSA9PT0gXCJkeW5hbWljV0hcIil7XHJcblx0XHRcdFx0XHRcdGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpLmF0dHIoXCJ3aWR0aFwiLDE1MDApO1xyXG5cdFx0XHRcdFx0XHRkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKS5hdHRyKFwiaGVpZ2h0XCIsNjAwKTtcclxuXHRcdFx0XHRcdFx0dmFyIG5vZGUgPSBkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKTtcclxuXHRcdFx0XHRcdFx0aHRtbCA9IG5vZGVbMF1bMF0ub3V0ZXJIVE1MO1xyXG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ3dpZHRoJ10gPSA1MDA7XHJcblx0XHRcdFx0XHRcdGltYWdlc09ialsnaGVpZ2h0J10gPSA1MDA7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tcGRmRmxhZ1wiKSA9PT0gXCJwZGZGbGFnXCIpXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDc1MDtcclxuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWydoZWlnaHQnXSA9IDMwMDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGNhbnZnKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKSwgaHRtbCk7XHJcblx0XHRcdFx0XHR2YXIgdGVzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKTtcclxuXHRcdFx0XHRcdHZhciBpbWdzcmMgPSB0ZXN0LnRvRGF0YVVSTCgpO1xyXG5cdFx0XHRcdFx0dmFyICB0ZXh0ID0gXCJcXG5cIitzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tdGl0bGVcIikrXCJcXG5cIjtcclxuXHRcdFx0XHRcdHRleHRPYmpbJ3RleHQnXSA9IHRleHQ7XHJcblx0XHRcdFx0XHR0ZXh0Q29sdW1uLnB1c2godGV4dE9iaik7XHJcblx0XHRcdFx0XHRpbWFnZXNPYmpbJ2ltYWdlJ10gPSBpbWdzcmM7XHJcblx0XHRcdFx0XHRpbWFnZUNvbHVtbi5wdXNoKGltYWdlc09iaik7XHRcdFx0XHRcclxuXHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxyXG5cdFx0XHRcdFx0dHh0VGVtcFsnY29sdW1ucyddID0gdGV4dENvbHVtbjtcclxuXHRcdFx0XHRcdGltZ1RlbXBbJ2FsaWdubWVudCddID0gJ2NlbnRlcic7XHJcblx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcclxuXHRcdFx0XHRcdGNvbnRlbnQucHVzaCh0eHRUZW1wKTtcclxuXHRcdFx0XHRcdGNvbnRlbnQucHVzaChpbWdUZW1wKTtcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xyXG5cdFx0XHRcdFx0dGV4dENvbHVtbiA9IFtdO1xyXG5cdFx0XHRcdFx0aW1hZ2VzT2JqID0ge307XHJcblx0XHRcdFx0XHR0ZXh0T2JqID0ge307XHJcblx0XHRcdFx0XHRpbWdUZW1wID0ge307XHJcblx0XHRcdFx0XHR0eHRUZW1wID17fTtcclxuXHRcdFx0XHRcdG5vZGVFeGlzdHMucHVzaChzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tZmxhZ1wiKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0Y29udGVudDogY29udGVudCxcclxuXHRcdFx0XHRzdHlsZXM6IHtcclxuXHRcdFx0XHRcdGhlYWRlcjoge1xyXG5cdFx0XHRcdFx0XHRmb250U2l6ZTogMTgsXHJcblx0XHRcdFx0XHRcdGJvbGQ6IHRydWVcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRiaWdnZXI6IHtcclxuXHRcdFx0XHRcdFx0Zm9udFNpemU6IDE1LFxyXG5cdFx0XHRcdFx0XHRpdGFsaWNzOiB0cnVlLFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0ZGVmYXVsdFN0eWxlOiB7XHJcblx0XHRcdFx0XHRjb2x1bW5HYXA6IDIwLFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdH07XHJcbiAgICB9XHJcbn0pKCk7IiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG4gICAgLy8gYXR0YWNoIHRoZSBzZXJ2aWNlIHRvIHRoZSBbcmFwaWRNb2JpbGVdIG1vZHVsZSBpbiBhbmd1bGFyXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKVxyXG5cdCBcdC5zZXJ2aWNlKCdSZXBvcnRTdmMnLCBbJyRxJywgJyR0aW1lb3V0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG9ydFN2Y10pO1xyXG5cclxuXHQvLyBnZW5SZXBvcnREZWYgLS0+IGdlblJlcG9ydERvYyAtLT4gYnVmZmVyW10gLS0+IEJsb2IoKSAtLT4gc2F2ZUZpbGUgLS0+IHJldHVybiBmaWxlUGF0aFxyXG5cclxuXHQgZnVuY3Rpb24gcmVwb3J0U3ZjKCRxLCAkdGltZW91dCkge1xyXG5cdFx0IHRoaXMucnVuUmVwb3J0QXN5bmMgPSBfcnVuUmVwb3J0QXN5bmM7XHJcblx0XHQgdGhpcy5ydW5SZXBvcnREYXRhVVJMID0gX3J1blJlcG9ydERhdGFVUkw7XHJcblxyXG5cdFx0Ly8gUlVOIEFTWU5DOiBydW5zIHRoZSByZXBvcnQgYXN5bmMgbW9kZSB3LyBwcm9ncmVzcyB1cGRhdGVzIGFuZCBkZWxpdmVycyBhIGxvY2FsIGZpbGVVcmwgZm9yIHVzZVxyXG5cclxuXHRcdCBmdW5jdGlvbiBfcnVuUmVwb3J0QXN5bmMoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKSB7XHJcbiAgICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHQgXHJcbiAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCcxLlByb2Nlc3NpbmcgVHJhbnNjcmlwdCcpO1xyXG4gICAgICAgICAgICAgZ2VuZXJhdGVSZXBvcnREZWYoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKS50aGVuKGZ1bmN0aW9uKGRvY0RlZikge1xyXG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzIuIEdlbmVyYXRpbmcgUmVwb3J0Jyk7XHJcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0RG9jKGRvY0RlZik7XHJcbiAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHBkZkRvYykge1xyXG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzMuIEJ1ZmZlcmluZyBSZXBvcnQnKTtcclxuICAgICAgICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVSZXBvcnRCdWZmZXIocGRmRG9jKTtcclxuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oYnVmZmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnNC4gU2F2aW5nIFJlcG9ydCBGaWxlJyk7XHJcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0QmxvYihidWZmZXIpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihwZGZCbG9iKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnNS4gT3BlbmluZyBSZXBvcnQgRmlsZScpO1xyXG4gICAgICAgICAgICAgICAgIHJldHVybiBzYXZlRmlsZShwZGZCbG9iLHN0YXR1c0ZsYWcpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihmaWxlUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgIC8vaGlkZUxvYWRpbmcoKTtcclxuICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGZpbGVQYXRoKTtcclxuICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgLy9oaWRlTG9hZGluZygpO1xyXG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJyArIGVycm9yLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgICAgICB9XHJcblxyXG5cdFx0Ly8gUlVOIERBVEFVUkw6IHJ1bnMgdGhlIHJlcG9ydCBhc3luYyBtb2RlIHcvIHByb2dyZXNzIHVwZGF0ZXMgYW5kIHN0b3BzIHcvIHBkZkRvYyAtPiBkYXRhVVJMIHN0cmluZyBjb252ZXJzaW9uXHJcblxyXG5cdFx0IGZ1bmN0aW9uIF9ydW5SZXBvcnREYXRhVVJMKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkge1xyXG4gICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdFx0IFxyXG4gICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMS5Qcm9jZXNzaW5nIFRyYW5zY3JpcHQnKTtcclxuICAgICAgICAgICAgIGdlbmVyYXRlUmVwb3J0RGVmKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCkudGhlbihmdW5jdGlvbihkb2NEZWYpIHtcclxuICAgICAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCcyLiBHZW5lcmF0aW5nIFJlcG9ydCcpO1xyXG4gICAgICAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZVJlcG9ydERvYyhkb2NEZWYpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihwZGZEb2MpIHtcclxuICAgICAgICAgICAgICAgICAvL3Nob3dMb2FkaW5nKCczLiBDb252ZXJ0IHRvIERhdGFVUkwnKTtcclxuICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0RGF0YVVSTChwZGZEb2MpO1xyXG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihvdXREb2MpIHtcclxuICAgICAgICAgICAgICAgICAvL2hpZGVMb2FkaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShvdXREb2MpO1xyXG4gICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAvL2hpZGVMb2FkaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgZXJyb3IudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbiAgICAgICAgIH1cclxuXHJcblx0XHQvLyAxLkdlbmVyYXRlUmVwb3J0RGVmOiB1c2UgY3VycmVudFRyYW5zY3JpcHQgdG8gY3JhZnQgcmVwb3J0RGVmIEpTT04gZm9yIHBkZk1ha2UgdG8gZ2VuZXJhdGUgcmVwb3J0XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnREZWYoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKSB7XHJcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XHJcblx0XHRcdFxyXG4gICAgICAgICAgICAvLyByZW1vdmVkIHNwZWNpZmljcyBvZiBjb2RlIHRvIHByb2Nlc3MgZGF0YSBmb3IgZHJhZnRpbmcgdGhlIGRvY1xyXG4gICAgICAgICAgICAvLyBsYXlvdXQgYmFzZWQgb24gcGxheWVyLCB0cmFuc2NyaXB0LCBjb3Vyc2VzLCBldGMuXHJcbiAgICAgICAgICAgIC8vIGN1cnJlbnRseSBtb2NraW5nIHRoaXMgYW5kIHJldHVybmluZyBhIHByZS1idWlsdCBKU09OIGRvYyBkZWZpbml0aW9uXHJcbiAgICAgICAgICAgIFxyXG5cdFx0XHQvL3VzZSBycHQgc2VydmljZSB0byBnZW5lcmF0ZSB0aGUgSlNPTiBkYXRhIG1vZGVsIGZvciBwcm9jZXNzaW5nIFBERlxyXG4gICAgICAgICAgICAvLyBoYWQgdG8gdXNlIHRoZSAkdGltZW91dCB0byBwdXQgYSBzaG9ydCBkZWxheSB0aGF0IHdhcyBuZWVkZWQgdG8gXHJcbiAgICAgICAgICAgIC8vIHByb3Blcmx5IGdlbmVyYXRlIHRoZSBkb2MgZGVjbGFyYXRpb25cclxuICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGQgPSB7fTtcclxuICAgICAgICAgICAgICAgIGRkID0gZ2VuZXJhdGVSZXBvcnQoc3RhdHVzRmxhZyx0aXRsZSxmbG93bk1vbnRoKVxyXG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoZGQpO1xyXG4gICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gMi5HZW5lcmF0ZVJwdEZpbGVEb2M6IHRha2UgSlNPTiBmcm9tIHJwdFN2YywgY3JlYXRlIHBkZm1lbW9yeSBidWZmZXIsIGFuZCBzYXZlIGFzIGEgbG9jYWwgZmlsZVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdlbmVyYXRlUmVwb3J0RG9jKGRvY0RlZmluaXRpb24pIHtcclxuXHRcdFx0Ly91c2UgdGhlIHBkZm1ha2UgbGliIHRvIGNyZWF0ZSBhIHBkZiBmcm9tIHRoZSBKU09OIGNyZWF0ZWQgaW4gdGhlIGxhc3Qgc3RlcFxyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHR0cnkge1xyXG4gICAgICAgICAgICAgICAgLy91c2UgdGhlIHBkZk1ha2UgbGlicmFyeSB0byBjcmVhdGUgaW4gbWVtb3J5IHBkZiBmcm9tIHRoZSBKU09OXHJcblx0XHRcdFx0dmFyIHBkZkRvYyA9IHBkZk1ha2UuY3JlYXRlUGRmKCBkb2NEZWZpbml0aW9uICk7XHJcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHBkZkRvYyk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDMuR2VuZXJhdGVScHRCdWZmZXI6IHBkZktpdCBvYmplY3QgcGRmRG9jIC0tPiBidWZmZXIgYXJyYXkgb2YgcGRmRG9jXHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnRCdWZmZXIocGRmRG9jKSB7XHJcblx0XHRcdC8vdXNlIHRoZSBwZGZtYWtlIGxpYiB0byBnZXQgYSBidWZmZXIgYXJyYXkgb2YgdGhlIHBkZkRvYyBvYmplY3RcclxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdFx0dHJ5IHtcclxuICAgICAgICAgICAgICAgIC8vZ2V0IHRoZSBidWZmZXIgZnJvbSB0aGUgcGRmRG9jXHJcblx0XHRcdFx0cGRmRG9jLmdldEJ1ZmZlcihmdW5jdGlvbihidWZmZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdCAgIGRlZmVycmVkLnJlc29sdmUoYnVmZmVyKTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyAzYi5nZXREYXRhVVJMOiBwZGZLaXQgb2JqZWN0IHBkZkRvYyAtLT4gZW5jb2RlZCBkYXRhVXJsXHJcblxyXG5cdFx0IGZ1bmN0aW9uIGdldERhdGFVUkwocGRmRG9jKSB7XHJcblx0XHRcdC8vdXNlIHRoZSBwZGZtYWtlIGxpYiB0byBjcmVhdGUgYSBwZGYgZnJvbSB0aGUgSlNPTiBjcmVhdGVkIGluIHRoZSBsYXN0IHN0ZXBcclxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdFx0dHJ5IHtcclxuICAgICAgICAgICAgICAgIC8vdXNlIHRoZSBwZGZNYWtlIGxpYnJhcnkgdG8gY3JlYXRlIGluIG1lbW9yeSBwZGYgZnJvbSB0aGUgSlNPTlxyXG5cdFx0XHRcdHBkZkRvYy5nZXREYXRhVXJsKGZ1bmN0aW9uKG91dERvYykge1xyXG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShvdXREb2MpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHRcdCB9XHJcblxyXG5cdFx0Ly8gNC5HZW5lcmF0ZVJlcG9ydEJsb2I6IGJ1ZmZlciAtLT4gbmV3IEJsb2Igb2JqZWN0XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnRCbG9iKGJ1ZmZlcikge1xyXG5cdFx0XHQvL3VzZSB0aGUgZ2xvYmFsIEJsb2Igb2JqZWN0IGZyb20gcGRmbWFrZSBsaWIgdG8gY3JlYXQgYSBibG9iIGZvciBmaWxlIHByb2Nlc3NpbmdcclxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdFx0dHJ5IHtcclxuICAgICAgICAgICAgICAgIC8vcHJvY2VzcyB0aGUgaW5wdXQgYnVmZmVyIGFzIGFuIGFwcGxpY2F0aW9uL3BkZiBCbG9iIG9iamVjdCBmb3IgZmlsZSBwcm9jZXNzaW5nXHJcbiAgICAgICAgICAgICAgICB2YXIgcGRmQmxvYiA9IG5ldyBCbG9iKFtidWZmZXJdLCB7dHlwZTogJ2FwcGxpY2F0aW9uL3BkZid9KTtcclxuICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocGRmQmxvYik7XHJcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyA1LlNhdmVGaWxlOiB1c2UgdGhlIEZpbGUgcGx1Z2luIHRvIHNhdmUgdGhlIHBkZkJsb2IgYW5kIHJldHVybiBhIGZpbGVQYXRoIHRvIHRoZSBjbGllbnRcclxuXHJcblx0XHRmdW5jdGlvbiBzYXZlRmlsZShwZGZCbG9iLHRpdGxlKSB7XHJcblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XHJcblx0XHRcdHZhciBmaWxlTmFtZSA9IHVuaXF1ZUZpbGVOYW1lKHRpdGxlKStcIi5wZGZcIjtcclxuXHRcdFx0dmFyIGZpbGVQYXRoID0gXCJcIjtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnU2F2ZUZpbGU6IHJlcXVlc3RGaWxlU3lzdGVtJyk7XHJcblx0XHRcdFx0d2luZG93LnJlcXVlc3RGaWxlU3lzdGVtKExvY2FsRmlsZVN5c3RlbS5QRVJTSVNURU5ULCAwLCBnb3RGUywgZmFpbCk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdTYXZlRmlsZV9FcnI6ICcgKyBlLm1lc3NhZ2UpO1xyXG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcclxuXHRcdFx0XHR0aHJvdyh7Y29kZTotMTQwMSxtZXNzYWdlOid1bmFibGUgdG8gc2F2ZSByZXBvcnQgZmlsZSd9KTtcclxuXHRcdFx0fVx0XHRcdFxyXG5cclxuXHRcdFx0ZnVuY3Rpb24gZ290RlMoZmlsZVN5c3RlbSkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ1NhdmVGaWxlOiBnb3RGUyAtLT4gZ2V0RmlsZScpO1xyXG5cdFx0XHRcdGZpbGVTeXN0ZW0ucm9vdC5nZXRGaWxlKGZpbGVOYW1lLCB7Y3JlYXRlOiB0cnVlLCBleGNsdXNpdmU6IGZhbHNlfSwgZ290RmlsZUVudHJ5LCBmYWlsKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZnVuY3Rpb24gZ290RmlsZUVudHJ5KGZpbGVFbnRyeSkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ1NhdmVGaWxlOiBnb3RGaWxlRW50cnkgLS0+IChmaWxlUGF0aCkgLS0+IGNyZWF0ZVdyaXRlcicpO1xyXG5cdFx0XHRcdGZpbGVQYXRoID0gZmlsZUVudHJ5LnRvVVJMKCk7XHJcblx0XHRcdFx0ZmlsZUVudHJ5LmNyZWF0ZVdyaXRlcihnb3RGaWxlV3JpdGVyLCBmYWlsKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZnVuY3Rpb24gZ290RmlsZVdyaXRlcih3cml0ZXIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdTYXZlRmlsZTogZ290RmlsZVdyaXRlciAtLT4gd3JpdGUgLS0+IG9uV3JpdGVFbmQocmVzb2x2ZSknKTtcclxuXHRcdFx0XHR3cml0ZXIub253cml0ZWVuZCA9IGZ1bmN0aW9uKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0d3JpdGVyLm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRlciBlcnJvcjogJyArIGUudG9TdHJpbmcoKSk7XHJcblx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHR3cml0ZXIud3JpdGUocGRmQmxvYik7XHJcblx0XHRcdH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGZhaWwoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhlcnJvci5jb2RlKTtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZXJyb3IpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIHVuaXF1ZUZpbGVOYW1lKGZpbGVOYW1lKXtcclxuXHRcdFx0dmFyIG5vdyA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdHZhciB0aW1lc3RhbXAgPSBub3cuZ2V0RnVsbFllYXIoKS50b1N0cmluZygpO1xyXG5cdFx0XHR0aW1lc3RhbXAgKz0gKG5vdy5nZXRNb250aCgpIDwgOSA/ICcwJyA6ICcnKSArIG5vdy5nZXRNb250aCgpLnRvU3RyaW5nKCk7IFxyXG5cdFx0XHR0aW1lc3RhbXAgKz0gKG5vdy5nZXREYXRlKCkgPCAxMCA/ICcwJyA6ICcnKSArIG5vdy5nZXREYXRlKCkudG9TdHJpbmcoKTsgXHJcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldEhvdXJzKCkgPCAxMCA/ICcwJyA6ICcnKSArIG5vdy5nZXRIb3VycygpLnRvU3RyaW5nKCk7IFxyXG5cdFx0XHR0aW1lc3RhbXAgKz0gKG5vdy5nZXRNaW51dGVzKCkgPCAxMCA/ICcwJyA6ICcnKSArIG5vdy5nZXRNaW51dGVzKCkudG9TdHJpbmcoKTsgXHJcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldFNlY29uZHMoKSA8IDEwID8gJzAnIDogJycpICsgbm93LmdldFNlY29uZHMoKS50b1N0cmluZygpO1xyXG5cdFx0XHRyZXR1cm4gZmlsZU5hbWUudG9VcHBlckNhc2UoKStcIl9cIit0aW1lc3RhbXA7XHJcblx0XHRcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnQocGFyYW0sIGNoYXJ0VGl0bGUsZmxvd25Nb250aCkge1xyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIHRpdGxlID0gXCJcIjtcclxuXHRcdFx0aWYocGFyYW0gPT0gXCJtZXRyaWNTbmFwc2hvdFwiKVxyXG5cdFx0XHRcdHRpdGxlID0gXCJNRVRSSUMgU05BUFNIT1QgLVwiK2Zsb3duTW9udGgrXCIgXCIrY2hhcnRUaXRsZS50b1VwcGVyQ2FzZSgpK1wiLSBWSUVXXCI7XHJcblx0XHRcdGVsc2UgaWYocGFyYW0gPT0gXCJ0YXJnZXRBY3R1YWxcIilcclxuXHRcdFx0XHR0aXRsZSA9IFwiVEFSR0VUIFZTIEFDVFVBTCAtIFwiKygoY2hhcnRUaXRsZSA9PSBcInJldmVudWVcIik/XCJORVQgUkVWRU5VRVwiOlwiUEFYIENvdW50XCIpK1wiIFwiK2Zsb3duTW9udGgrIFwiIC0gVklFV1wiO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0dGl0bGUgPSBjaGFydFRpdGxlK1wiIFwiK2Zsb3duTW9udGgrXCIgLSBWSUVXXCI7XHJcblx0XHRcdFx0XHRcdFx0XHJcblx0XHRcdHZhciBzdmdOb2RlID0gZDMuc2VsZWN0QWxsKFwiLlwiK3BhcmFtKS5zZWxlY3RBbGwoXCJzdmdcIik7XHJcblx0XHRcdHZhciBjb250ZW50ID0gW107XHJcblx0XHRcdHZhciBpbWFnZUNvbHVtbiA9IFtdO1xyXG5cdFx0XHR2YXIgdGV4dENvbHVtbiA9IFtdO1xyXG5cdFx0XHR2YXIgaW1hZ2VzT2JqID0ge307XHJcblx0XHRcdHZhciB0ZXh0T2JqID0ge307XHJcblx0XHRcdGNvbnRlbnQucHVzaCh0aXRsZSk7XHJcblx0XHRcdHZhciBub2RlRXhpc3RzID0gW107XHJcblx0XHRcdGFuZ3VsYXIuZm9yRWFjaChzdmdOb2RlLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgaHRtbCA9IFwiXCI7XHJcblx0XHRcdFx0aWYobm9kZUV4aXN0cy5pbmRleE9mKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1mbGFnXCIpKSA9PSAtMSAmJiBzdmdOb2RlW2tleV0ubGVuZ3RoID49IDEpe1xyXG5cdFx0XHRcdFx0aHRtbCA9IHN2Z05vZGVba2V5XVswXS5vdXRlckhUTUw7XHJcblx0XHRcdFx0XHRpZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tcGRmRmxhZ1wiKSA9PT0gXCJkeW5hbWljV0hcIil7XHJcblx0XHRcdFx0XHRcdGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpLmF0dHIoXCJ3aWR0aFwiLDE1MDApO1xyXG5cdFx0XHRcdFx0XHRkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKS5hdHRyKFwiaGVpZ2h0XCIsNjAwKTtcclxuXHRcdFx0XHRcdFx0dmFyIG5vZGUgPSBkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKTtcclxuXHRcdFx0XHRcdFx0aHRtbCA9IG5vZGVbMF1bMF0ub3V0ZXJIVE1MO1xyXG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ3dpZHRoJ10gPSA1MDA7XHJcblx0XHRcdFx0XHRcdGltYWdlc09ialsnaGVpZ2h0J10gPSA1MDA7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tcGRmRmxhZ1wiKSA9PT0gXCJwZGZGbGFnXCIpXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDc1MDtcclxuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWydoZWlnaHQnXSA9IDMwMDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGNhbnZnKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKSwgaHRtbCk7XHJcblx0XHRcdFx0XHR2YXIgdGVzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKTtcclxuXHRcdFx0XHRcdHZhciBpbWdzcmMgPSB0ZXN0LnRvRGF0YVVSTCgpO1xyXG5cdFx0XHRcdFx0dmFyICB0ZXh0ID0gXCJcXG5cIitzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tdGl0bGVcIikrXCJcXG5cIjtcclxuXHRcdFx0XHRcdHRleHRPYmpbJ3RleHQnXSA9IHRleHQ7XHJcblx0XHRcdFx0XHR0ZXh0Q29sdW1uLnB1c2godGV4dE9iaik7XHJcblx0XHRcdFx0XHRpbWFnZXNPYmpbJ2ltYWdlJ10gPSBpbWdzcmM7XHJcblx0XHRcdFx0XHRpbWFnZUNvbHVtbi5wdXNoKGltYWdlc09iaik7XHRcdFx0XHRcclxuXHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxyXG5cdFx0XHRcdFx0dHh0VGVtcFsnY29sdW1ucyddID0gdGV4dENvbHVtbjtcclxuXHRcdFx0XHRcdGltZ1RlbXBbJ2FsaWdubWVudCddID0gJ2NlbnRlcic7XHJcblx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcclxuXHRcdFx0XHRcdGNvbnRlbnQucHVzaCh0eHRUZW1wKTtcclxuXHRcdFx0XHRcdGNvbnRlbnQucHVzaChpbWdUZW1wKTtcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xyXG5cdFx0XHRcdFx0dGV4dENvbHVtbiA9IFtdO1xyXG5cdFx0XHRcdFx0aW1hZ2VzT2JqID0ge307XHJcblx0XHRcdFx0XHR0ZXh0T2JqID0ge307XHJcblx0XHRcdFx0XHRpbWdUZW1wID0ge307XHJcblx0XHRcdFx0XHR0eHRUZW1wID17fTtcclxuXHRcdFx0XHRcdG5vZGVFeGlzdHMucHVzaChzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tZmxhZ1wiKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcdFx0XHRcclxuXHRcdFx0aWYocGFyYW0gPT0gXCJyZXZlbnVlQW5hbHlzaXNcIil7XHJcblx0XHRcdFx0dmFyIG5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmV0LXJldmVudWUtY2hhcnQnKTtcclxuXHRcdFx0XHRkb210b2ltYWdlLnRvUG5nKG5vZGUpLnRoZW4oZnVuY3Rpb24gKGRhdGFVcmwpIHtcclxuXHRcdFx0XHRcdHZhciAgdGV4dCA9IFwiXFxuXFxuXFxuXFxuXFxuXCIrbm9kZS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaXRlbS10aXRsZScpK1wiXFxuXFxuXCI7XHJcblx0XHRcdFx0XHR0ZXh0T2JqWyd0ZXh0J10gPSB0ZXh0O1xyXG5cdFx0XHRcdFx0dGV4dENvbHVtbi5wdXNoKHRleHRPYmopO1xyXG5cdFx0XHRcdFx0aW1hZ2VzT2JqWydpbWFnZSddID0gZGF0YVVybDtcclxuXHRcdFx0XHRcdGltYWdlQ29sdW1uLnB1c2goaW1hZ2VzT2JqKTtcdFx0XHRcdFxyXG5cdFx0XHRcdFx0dmFyIGltZ1RlbXAgPXt9LCB0eHRUZW1wID17fTtcdFx0XHJcblx0XHRcdFx0XHR0eHRUZW1wWydjb2x1bW5zJ10gPSB0ZXh0Q29sdW1uO1xyXG5cdFx0XHRcdFx0aW1nVGVtcFsnYWxpZ25tZW50J10gPSAnY2VudGVyJztcclxuXHRcdFx0XHRcdGltZ1RlbXBbJ2NvbHVtbnMnXSA9IGltYWdlQ29sdW1uO1xyXG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKHR4dFRlbXApO1xyXG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKGltZ1RlbXApO1x0XHRcdFx0XHRcclxuXHRcdFx0XHRcdGltYWdlQ29sdW1uID0gW107XHJcblx0XHRcdFx0XHR0ZXh0Q29sdW1uID0gW107XHJcblx0XHRcdFx0XHRpbWFnZXNPYmogPSB7fTtcclxuXHRcdFx0XHRcdHRleHRPYmogPSB7fTtcclxuXHRcdFx0XHRcdGltZ1RlbXAgPSB7fTtcclxuXHRcdFx0XHRcdHR4dFRlbXAgPXt9O1x0XHJcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHtjb250ZW50OiBjb250ZW50fSk7XHRcdFx0XHRcclxuXHRcdFx0XHR9KTtcdFx0XHRcclxuXHRcdFx0fSBlbHNlIGlmKHBhcmFtID09IFwic2VjdG9yY2FycmllcmFuYWx5c2lzXCIpe1x0XHRcdFxyXG5cdFx0XHRcdHZhciBzdmdOb2RlID0gZDMuc2VsZWN0QWxsKFwiLlwiK3BhcmFtKTtcclxuXHRcdFx0XHRhbmd1bGFyLmZvckVhY2goc3ZnTm9kZVswXSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xyXG5cdFx0XHRcdFx0dmFyIG5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2VjdG9yLWNhcnJpZXItY2hhcnQnK2tleSk7XHJcblx0XHRcdFx0XHRkb210b2ltYWdlLnRvUG5nKG5vZGUpLnRoZW4oZnVuY3Rpb24gKGRhdGFVcmwpIHtcclxuXHRcdFx0XHRcdFx0Ly92YXIgIHRleHQgPSBcIlxcblwiK25vZGUuZ2V0QXR0cmlidXRlKCdkYXRhLWl0ZW0tdGl0bGUnKStcIlxcblxcblwiO1xyXG5cdFx0XHRcdFx0XHR0ZXh0T2JqWyd0ZXh0J10gPSBcIlxcblxcblwiO1xyXG5cdFx0XHRcdFx0XHR0ZXh0Q29sdW1uLnB1c2godGV4dE9iaik7XHJcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDUwMDtcclxuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWydpbWFnZSddID0gZGF0YVVybDtcclxuXHRcdFx0XHRcdFx0aW1hZ2VDb2x1bW4ucHVzaChpbWFnZXNPYmopO1x0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxyXG5cdFx0XHRcdFx0XHR0eHRUZW1wWydjb2x1bW5zJ10gPSB0ZXh0Q29sdW1uO1xyXG5cdFx0XHRcdFx0XHRpbWdUZW1wWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInO1xyXG5cdFx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcclxuXHRcdFx0XHRcdFx0Y29udGVudC5wdXNoKHR4dFRlbXApO1xyXG5cdFx0XHRcdFx0XHRjb250ZW50LnB1c2goaW1nVGVtcCk7XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xyXG5cdFx0XHRcdFx0XHR0ZXh0Q29sdW1uID0gW107XHJcblx0XHRcdFx0XHRcdGltYWdlc09iaiA9IHt9O1xyXG5cdFx0XHRcdFx0XHR0ZXh0T2JqID0ge307XHJcblx0XHRcdFx0XHRcdGltZ1RlbXAgPSB7fTtcclxuXHRcdFx0XHRcdFx0dHh0VGVtcCA9e307XHJcblx0XHRcdFx0XHRcdGlmKGtleSA9PSBzdmdOb2RlWzBdLmxlbmd0aC0xKVxyXG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHtjb250ZW50OiBjb250ZW50fSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcdFx0XHRcdFxyXG5cdFx0XHR9ZWxzZSBpZihwYXJhbSA9PSBcInJvdXRlcmV2ZW51ZVwiKXtcdFx0XHRcdFxyXG5cdFx0XHRcdHZhciBzdmdOb2RlID0gZDMuc2VsZWN0QWxsKFwiLlwiK3BhcmFtKTtcclxuXHRcdFx0XHRhbmd1bGFyLmZvckVhY2goc3ZnTm9kZVswXSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xyXG5cdFx0XHRcdFx0dmFyIG5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm91dGUtcmV2ZW51ZS1jaGFydCcra2V5KTtcclxuXHRcdFx0XHRcdGRvbXRvaW1hZ2UudG9Qbmcobm9kZSkudGhlbihmdW5jdGlvbiAoZGF0YVVybCkge1xyXG5cdFx0XHRcdFx0XHQvL3ZhciAgdGV4dCA9IFwiXFxuXCIrbm9kZS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaXRlbS10aXRsZScpK1wiXFxuXFxuXCI7XHJcblx0XHRcdFx0XHRcdHRleHRPYmpbJ3RleHQnXSA9IFwiXFxuXFxuXCI7XHJcblx0XHRcdFx0XHRcdHRleHRDb2x1bW4ucHVzaCh0ZXh0T2JqKTtcclxuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWyd3aWR0aCddID0gNTAwO1xyXG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ2ltYWdlJ10gPSBkYXRhVXJsO1xyXG5cdFx0XHRcdFx0XHRpbWFnZUNvbHVtbi5wdXNoKGltYWdlc09iaik7XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0dmFyIGltZ1RlbXAgPXt9LCB0eHRUZW1wID17fTtcdFx0XHJcblx0XHRcdFx0XHRcdHR4dFRlbXBbJ2NvbHVtbnMnXSA9IHRleHRDb2x1bW47XHJcblx0XHRcdFx0XHRcdGltZ1RlbXBbJ2FsaWdubWVudCddID0gJ2NlbnRlcic7XHJcblx0XHRcdFx0XHRcdGltZ1RlbXBbJ2NvbHVtbnMnXSA9IGltYWdlQ29sdW1uO1xyXG5cdFx0XHRcdFx0XHRjb250ZW50LnB1c2godHh0VGVtcCk7XHJcblx0XHRcdFx0XHRcdGNvbnRlbnQucHVzaChpbWdUZW1wKTtcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdGltYWdlQ29sdW1uID0gW107XHJcblx0XHRcdFx0XHRcdHRleHRDb2x1bW4gPSBbXTtcclxuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqID0ge307XHJcblx0XHRcdFx0XHRcdHRleHRPYmogPSB7fTtcclxuXHRcdFx0XHRcdFx0aW1nVGVtcCA9IHt9O1xyXG5cdFx0XHRcdFx0XHR0eHRUZW1wID17fTtcclxuXHRcdFx0XHRcdFx0aWYoa2V5ID09IHN2Z05vZGVbMF0ubGVuZ3RoLTEpXHJcblx0XHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoe2NvbnRlbnQ6IGNvbnRlbnR9KTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9ZWxzZXtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHtjb250ZW50OiBjb250ZW50fSk7XHJcblx0XHRcdH1cclxuXHRcdFxyXG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHRcdH07XHJcblx0XHRcclxuXHQgfVxyXG4gICAgXHJcbn0pKCk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
