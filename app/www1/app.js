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

/// <reference path="../../_libs.ts" />
/// <reference path="../../../common/services/DataProviderService.ts" />
var SettingService = (function () {
    function SettingService(dataProviderService, $q) {
        this.dataProviderService = dataProviderService;
        this.$q = $q;
    }
    SettingService.prototype.updateFavoriteInd = function (reqdata) {
        var requestUrl = '/user/saveuserprofile';
        var def = this.$q.defer();
        this.dataProviderService.postData(requestUrl, reqdata).then(function (response) {
            var result = response.data;
            def.resolve(result);
        }, function (error) {
            console.log('an error occured');
        });
        return def.promise;
    };
    SettingService.$inject = ['DataProviderService', '$q'];
    return SettingService;
})();

/// <reference path="../../_libs.ts" />
/// <reference path="../utils/Utils.ts" />
/// <reference path="../../common/services/LocalStorageService.ts" />
/// <reference path="../../common/services/DataProviderService.ts" />
/// <reference path="../../common/services/ErrorHandlerService.ts" />
/// <reference path="../../components/user/services/UserService.ts" />
/// <reference path="../../components/operational/services/OperationalService.ts" />
/// <reference path="../../components/mis/services/MisService.ts" />
/// <reference path="../../components/setting/SettingService.ts" />
var AppController = (function () {
    function AppController($state, $scope, dataProviderService, userService, $ionicPlatform, localStorageService, $ionicPopup, $ionicLoading, $ionicHistory, errorHandlerService, $ionicPopover, misService, optService, settingService, $window, $timeout) {
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
        this.$ionicPopover = $ionicPopover;
        this.misService = misService;
        this.optService = optService;
        this.settingService = settingService;
        this.$window = $window;
        this.$timeout = $timeout;
        this.favItems = [];
        this.metricFavItems = [];
        this.targetBarFavItems = [];
        this.targetLineFavItems = [];
        this.routeRevFavItems = [];
        this.revenueFavItems = [];
        this.routeSectorFavItems = [];
        this.FlightProcessFavItems = [];
        this.FlightCntProcessFavItems = [];
        this.CouponCntFavItems = [];
    }
    AppController.prototype.openSettings = function ($event) {
        var that = this;
        this.$ionicPopover.fromTemplateUrl('components/setting/setting.html', {
            scope: that.$scope,
            animation: 'slide-in-up'
        }).then(function (settingpopover) {
            that.settingpopover = settingpopover;
        });
        this.$timeout(function () {
            that.settingpopover.show($event);
            if (that.showDashboard('MIS')) {
                that.selectSetting = 'd1';
            }
            else {
                that.selectSetting = 'd2';
            }
        }, 300);
        this.shownGroup = 0;
    };
    ;
    AppController.prototype.closeSettings = function () {
        this.settingpopover.hide();
    };
    ;
    AppController.prototype.storeFavourite = function (chartobj, favStatus) {
        var indexVal = _.findIndex(this.favItems, function (res) { return (res == chartobj); });
        console.log(chartobj);
        console.log(favStatus);
        if (favStatus) {
            this.favItems[indexVal].status = true;
        }
        else {
            this.favemetricall = false;
            this.favetargetall = false;
            this.faverevenueall = false;
            this.favesectorall = false;
            this.faveRouteRevall = false;
            this.favfltprcsall = false;
            this.favfltcntprcsall = false;
            this.favcouponcntprcsall = false;
            this.favItems[indexVal].status = false;
        }
    };
    AppController.prototype.selectFavourite = function (obj, type) {
        var that = this;
        angular.forEach(obj, function (value, key) {
            if (value) {
                if (value.chartId) {
                    var item = { 'chartID': value.chartId, 'chartName': value.chartName, 'status': (value.favoriteInd == 'Y') };
                    var available = _.some(that.favItems, function (res) { return (res.chartID == value.chartId && res.chartName == value.chartName); });
                    if (!available) {
                        that.favItems.push(item);
                        switch (type) {
                            case 'metric':
                                that.metricFavItems.push(item);
                                break;
                            case 'target1':
                                that.targetBarFavItems.push(item);
                                break;
                            case 'target2':
                                that.targetLineFavItems.push(item);
                                break;
                            case 'revenue':
                                that.revenueFavItems.push(item);
                                break;
                            case 'routerev':
                                that.routeRevFavItems.push(item);
                                break;
                            case 'sector':
                                that.routeSectorFavItems.push(item);
                                break;
                            case 'fltprcs':
                                that.FlightProcessFavItems.push(item);
                                break;
                            case 'fltcntprcs':
                                that.FlightCntProcessFavItems.push(item);
                                break;
                            case 'couponcntprcs':
                                that.CouponCntFavItems.push(item);
                                break;
                        }
                    }
                }
            }
        });
        var result;
        switch (type) {
            case 'metric':
                result = that.metricFavItems;
                break;
            case 'target1':
                result = that.targetBarFavItems;
                break;
            case 'target2':
                result = that.targetLineFavItems;
                break;
            case 'revenue':
                result = that.revenueFavItems;
                break;
            case 'routerev':
                result = that.routeRevFavItems;
                break;
            case 'sector':
                result = that.routeSectorFavItems;
                break;
            case 'fltprcs':
                result = that.FlightProcessFavItems;
                break;
            case 'fltcntprcs':
                result = that.FlightCntProcessFavItems;
                break;
            case 'couponcntprcs':
                result = that.CouponCntFavItems;
                break;
        }
        return result;
    };
    AppController.prototype.selectAll = function (obj, statusall) {
        var that = this;
        angular.forEach(obj, function (value, key) {
            var indexVal = _.findIndex(that.favItems, function (res) { return (res.chartID == value.chartId && res.chartName == value.chartName); });
            if (indexVal > 0) {
                if (statusall) {
                    that.favItems[indexVal].status = true;
                }
                else {
                    that.favItems[indexVal].status = false;
                }
            }
        });
    };
    AppController.prototype.changeSetting = function () {
        this.favItems = [];
        this.metricFavItems = [];
        this.targetBarFavItems = [];
        this.targetLineFavItems = [];
        this.revenueFavItems = [];
        this.routeRevFavItems = [];
        this.routeSectorFavItems = [];
        this.FlightProcessFavItems = [];
        this.FlightCntProcessFavItems = [];
        this.CouponCntFavItems = [];
    };
    AppController.prototype.saveFavourite = function () {
        console.log(this.favItems);
        var sectionAccess = [];
        angular.forEach(this.favItems, function (value, key) {
            var chartObj = {
                "chartId": value.chartID,
                "chartName": value.chartName,
                "chartPos": 0,
                "chartAccess": value.status
            };
            sectionAccess.push(chartObj);
        });
        var that = this;
        var requestObj = {
            "userId": that.getProfileUserName(),
            "userInfo": {
                "userName": that.getProfileUserName(),
                "amount": "",
                "theme": "",
                "language": "",
                "defaultPage": "",
                "rowsPerPage": 0
            },
            "userProfileSettings": [
                {
                    "dashBoardId": "",
                    "dashBoardAccess": [
                        {
                            "sectionId": "",
                            "sectionName": "",
                            "sectionPos": 0,
                            "selectAll": true,
                            "sectionAccessFlag": true,
                            "sectionAccess": sectionAccess
                        }
                    ]
                }
            ]
        };
        this.ionicLoadingShow();
        this.settingService.updateFavoriteInd(requestObj)
            .then(function (data) {
            if (data.response.status === "success") {
                // that.settingpopover.hide();
                that.$ionicPopup.alert({
                    title: 'Sucess',
                    content: 'Updated successfully!!!'
                }).then(function (res) { });
                that.ionicLoadingHide();
            }
            else {
                that.ionicLoadingHide();
            }
        }, function (error) {
            this.ionicLoadingHide();
            console.log('Error ');
        });
    };
    AppController.prototype.toggleGroup = function (group) {
        if (this.isGroupShown(group)) {
            this.shownGroup = null;
        }
        else {
            this.shownGroup = group;
        }
    };
    AppController.prototype.isGroupShown = function (group) {
        return this.shownGroup == group;
    };
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
    AppController.prototype.ionicLoadingShow = function () {
        this.$ionicLoading.show({
            template: '<ion-spinner class="spinner-calm"></ion-spinner>'
        });
    };
    ;
    AppController.prototype.ionicLoadingHide = function () {
        this.$ionicLoading.hide();
    };
    ;
    AppController.prototype.getProfileUserName = function () {
        if (this.userService.isUserLoggedIn()) {
            var obj = this.$window.localStorage.getItem('rapidMobile.user');
            if (obj != 'null') {
                var profileUserName = JSON.parse(obj);
                return profileUserName.username;
            }
        }
    };
    AppController.$inject = ['$state', '$scope', 'DataProviderService', 'UserService',
        '$ionicPlatform', 'LocalStorageService', '$ionicPopup',
        '$ionicLoading', '$ionicHistory', 'ErrorHandlerService', '$ionicPopover', 'MisService', 'OperationalService', 'SettingService', '$window', '$timeout'];
    return AppController;
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

/// <reference path="../../_libs.ts" />
/// <reference path="../../components/mis/services/MisService.ts" />
/// <reference path="../../components/mis/services/FilteredListService.ts" />
/// <reference path="../../components/mis/services/ChartoptionService.ts" />
/// <reference path="../../components/user/services/UserService.ts" />
var MisController = (function () {
    function MisController($state, $scope, $ionicLoading, $timeout, $window, $filter, misService, chartoptionService, filteredListService, userService, $ionicHistory, reportSvc, GRAPH_COLORS, TABS, $ionicPopup, $ionicPopover) {
        var _this = this;
        this.$state = $state;
        this.$scope = $scope;
        this.$ionicLoading = $ionicLoading;
        this.$timeout = $timeout;
        this.$window = $window;
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
        this.$ionicPopover = $ionicPopover;
        this.pageSize = 4;
        this.currentPage = [];
        this.selectedDrill = [];
        this.groups = [];
        this.orientationChange = function () {
            var that = _this;
            var obj = _this.$window.localStorage.getItem('controller');
            if (obj === 'MIS') {
                that.$timeout(function () {
                    that.onSlideMove({ index: that.header.tabIndex });
                }, 200);
            }
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
        if (this.$window.localStorage) {
            this.$window.localStorage.setItem('controller', 'MIS');
        }
        angular.element(window).bind('orientationchange', this.orientationChange);
        //this.$scope.$watch('MisCtrl.header.surcharge', () => { this.onSlideMove({index:this.header.tabIndex}); }, true);
        this.initData();
        this.$scope.$on('onMISSlideMove', function (event, response) {
            if (_this.$state.current.name == 'app.mis-flown') {
                _this.$scope.MisCtrl.onSlideMove(response);
            }
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
        if (this.$ionicPopover) {
            if (Object.keys(this.$ionicPopover).length) {
                this.$ionicPopover.fromTemplateUrl('components/mis/infotooltip.html', {
                    scope: that.$scope,
                    animation: 'none'
                }).then(function (infopopover) {
                    that.infopopover = infopopover;
                });
                this.$ionicPopover.fromTemplateUrl('components/mis/drildown.html', {
                    scope: that.$scope,
                    animation: 'none'
                }).then(function (drillpopover) {
                    that.drillpopover = drillpopover;
                });
                this.$ionicPopover.fromTemplateUrl('components/mis/bardrildown.html', {
                    scope: that.$scope,
                    animation: 'none'
                }).then(function (drillBarpopover) {
                    that.drillBarpopover = drillBarpopover;
                });
            }
        }
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
                that.metricOrgResult = that.metricResult;
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
                if (that.header.tabIndex == 0) {
                    that.targetActualData = {
                        horBarChart: that.favTargetBarResult,
                        lineChart: that.favTargetLineResult
                    };
                }
                else {
                    that.targetActualData = {
                        horBarChart: data.response.data.verBarCharts,
                        lineChart: data.response.data.lineCharts
                    };
                }
                that.selectTargetRevOrPax(that.targetActualData);
                that.targetOrgActualData = data.response.data.verBarCharts.concat(data.response.data.lineCharts);
                console.log(that.targetOrgActualData);
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
                // fav Items to display in dashboard
                var jsonObj = data.response.data;
                var sortedData = _.sortBy(jsonObj.RouteRevenueCharts, function (u) {
                    if (u)
                        return [u.favoriteChartPosition];
                });
                var favrouteRevData = _.filter(sortedData, function (u) {
                    if (u)
                        return u.favoriteInd == 'Y';
                });
                if (that.header.tabIndex == 0) {
                    that.routeRevData = { RouteRevenueCharts: favrouteRevData };
                }
                else {
                    that.routeRevData = jsonObj;
                }
                that.routeOrgRevData = jsonObj;
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
                that.orgRevenueData = {
                    revenuePieChart: jsonObj.pieCharts[0],
                    revenueBarChart: jsonObj.multibarCharts[1],
                    revenueHorBarChart: jsonObj.multibarCharts[2]
                };
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
                if (that.header.tabIndex == 0) {
                    that.SectorCarrierAnalysisCharts = favSectorCarrierResult;
                }
                else {
                    that.SectorCarrierAnalysisCharts = jsonObj.SectorCarrierAnalysisCharts;
                }
                that.SectorOrgCarrierAnalysisCharts = jsonObj.SectorCarrierAnalysisCharts;
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
        this.callRouteRevenue();
        this.callSectorCarrierAnalysis();
    };
    MisController.prototype.selectTargetRevOrPax = function (data) {
        if (data.horBarChart && data.lineChart) {
            var barRevData = _.filter(this.targetActualData.horBarChart, function (u) {
                if (u)
                    return u.toggle1 != 'paxcount';
            });
            var lineRevData = _.filter(this.targetActualData.lineChart, function (u) {
                if (u)
                    return u.toggle1 != 'paxcount';
            });
            if (!barRevData.length && !lineRevData.length && this.header.tabIndex == 0) {
                this.toggle.targetRevOrPax = 'paxcount';
            }
            else {
                this.toggle.targetRevOrPax = 'revenue';
            }
        }
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
        var newTab;
        var that = this;
        var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
        var chartOrTable = "";
        if (chartTitle === "targetActual")
            chartOrTable = that.toggle.targetView;
        else if (chartTitle === "revenueAnalysis")
            chartOrTable = that.toggle.revenueView;
        else if (chartTitle === "sectorcarrieranalysis")
            chartOrTable = that.toggle.sectorView;
        else
            chartOrTable = that.toggle.chartOrTable;
        if (chartOrTable === "chart") {
            if (isSafari)
                newTab = window.open("", "_system");
            //if no cordova, then running in browser and need to use dataURL and iframe
            if (!window.cordova) {
                that.ionicLoadingShow();
                this.reportSvc.runReportDataURL(chartTitle, monthOrYear, flownMonth, that.header.tabIndex)
                    .then(function (dataURL) {
                    that.ionicLoadingHide();
                    //set the iframe source to the dataURL created
                    //console.log(dataURL);
                    //document.getElementById('pdfImage').src = dataURL;
                    if (isSafari)
                        newTab.location = dataURL;
                    else
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
        }
        else {
            that.$ionicPopup.alert({
                title: 'Info',
                content: 'Download option not available for table view!!!'
            }).then(function (res) {
                console.log('done');
            });
        }
    };
    MisController.$inject = ['$state', '$scope', '$ionicLoading', '$timeout', '$window',
        '$filter', 'MisService', 'ChartoptionService', 'FilteredListService', 'UserService', '$ionicHistory', 'ReportSvc', 'GRAPH_COLORS', 'TABS', '$ionicPopup', '$ionicPopover'];
    return MisController;
})();

/// <reference path="../../../_libs.ts" />
/// <reference path="../services/OperationalService.ts" />
/// <reference path="../../mis/services/FilteredListService.ts" />
var OperationalFlownController = (function () {
    function OperationalFlownController($state, $scope, $ionicLoading, $filter, operationalService, $ionicSlideBoxDelegate, $timeout, $window, reportSvc, filteredListService, userService, $ionicHistory, GRAPH_COLORS, TABS, $ionicPopup, $ionicPopover) {
        var _this = this;
        this.$state = $state;
        this.$scope = $scope;
        this.$ionicLoading = $ionicLoading;
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
        this.$ionicPopover = $ionicPopover;
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
            var obj = _this.$window.localStorage.getItem('controller');
            if (obj === 'OFS') {
                that.$timeout(function () {
                    that.onSlideMove({ index: that.header.tabIndex });
                }, 200);
            }
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
        if (this.$window.localStorage) {
            this.$window.localStorage.setItem('controller', 'OFS');
        }
        angular.element(window).bind('orientationchange', this.orientationChange);
        this.initData();
        var that = this;
        this.$scope.$on('onOPRSlideMove', function (event, response) {
            if (_this.$state.current.name == 'app.operational-flown') {
                that.$scope.OprCtrl.onSlideMove(response);
            }
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
        if (this.$ionicPopover) {
            if (Object.keys(this.$ionicPopover).length) {
                this.$ionicPopover.fromTemplateUrl('components/operational/flown/drildown.html', {
                    scope: that.$scope,
                    animation: 'none'
                }).then(function (drillpopover) {
                    that.drillpopover = drillpopover;
                });
                this.$ionicPopover.fromTemplateUrl('components/operational/flown/infotooltip.html', {
                    scope: that.$scope,
                    animation: 'none'
                }).then(function (infopopover) {
                    that.infopopover = infopopover;
                });
            }
        }
        console.log(this.$window);
        var req = {
            userId: this.$window.localStorage.getItem('rapidMobile.user')
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
        if (this.graphpopover === undefined || this.graphpopover.isShown() == false) {
            this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataFS').slide(0);
            this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataFC').slide(0);
            this.$ionicSlideBoxDelegate.$getByHandle('oprfWeekDataCC').slide(0);
        }
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
                that.orgflightProcStatus = {
                    pieChart: jsonObj.pieCharts[0],
                    weekData: jsonObj.multibarCharts[0],
                    stackedChart: jsonObj.stackedBarCharts[0]
                };
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
                that.orgFlightCountReason = {
                    pieChart: jsonObj.pieCharts[0],
                    weekData: jsonObj.multibarCharts[0],
                    stackedChart: jsonObj.stackedBarCharts[0]
                };
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
                console.log(that.orgFlightCountReason);
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
                that.orgCouponCountException = {
                    pieChart: jsonObj.pieCharts[0],
                    weekData: jsonObj.multibarCharts[0],
                    stackedChart: jsonObj.stackedBarCharts[0]
                };
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
        var newTab;
        var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
        var chartOrTable = "";
        if (chartTitle === "fpStatus")
            chartOrTable = that.toggle.flightStatus;
        else if (chartTitle === "fcReason")
            chartOrTable = that.toggle.flightReason;
        else if (chartTitle === "ccException")
            chartOrTable = that.toggle.ccException;
        if (chartOrTable === "chart") {
            if (isSafari)
                newTab = window.open("", "_system");
            //if no cordova, then running in browser and need to use dataURL and iframe
            if (!window.cordova) {
                that.ionicLoadingShow();
                this.reportSvc.runReportDataURL(chartTitle, monthOrYear, flownMonth)
                    .then(function (dataURL) {
                    that.ionicLoadingHide();
                    //set the iframe source to the dataURL created
                    //console.log(dataURL);
                    //document.getElementById('pdfImage').src = dataURL;
                    if (isSafari)
                        newTab.location = dataURL;
                    else
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
        }
        else {
            that.$ionicPopup.alert({
                title: 'Info',
                content: 'Download option not available for table view!!!'
            }).then(function (res) {
                console.log('done');
            });
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
        var openclsTxt = (this.toggle.openOrClosed == 'OPEN') ? 'Open' : 'Closed';
        this.drillName = 'LIST OF ' + openclsTxt + ' FLIGHTS FOR ' + data.point[0] + '-' + this.header.flownMonth + ' BY REASON ';
        this.drillType = 'flight-count';
        this.groups = [];
        this.drilltabs = [openclsTxt + ' Flight Status', 'Document Level'];
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
    OperationalFlownController.$inject = ['$state', '$scope', '$ionicLoading', '$filter',
        'OperationalService', '$ionicSlideBoxDelegate', '$timeout', '$window', 'ReportSvc', 'FilteredListService', 'UserService', '$ionicHistory', 'GRAPH_COLORS', 'TABS', '$ionicPopup', '$ionicPopover'];
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
/// <reference path="../../components/mis/MisController.ts" />
/// <reference path="../../components/mis/services/MisService.ts" />
/// <reference path="../../components/mis/services/FilteredListService.ts" />
/// <reference path="../../components/mis/services/ChartoptionService.ts" />
/// <reference path="../../components/user/services/UserService.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var SettingMisController = (function (_super) {
    __extends(SettingMisController, _super);
    function SettingMisController($state, $scope, $ionicLoading, $timeout, $window, $ionicPopover, $filter, misService, chartoptionService, filteredListService, userService, $ionicHistory, reportSvc, GRAPH_COLORS, TABS, $ionicPopup) {
        _super.call(this, $state, $scope, $ionicLoading, $timeout, $window, $filter, misService, chartoptionService, filteredListService, userService, $ionicHistory, reportSvc, GRAPH_COLORS, TABS, $ionicPopup);
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
    }
    SettingMisController.$inject = ['$state', '$scope', '$ionicLoading', '$timeout', '$window', '$ionicPopover',
        '$filter', 'MisService', 'ChartoptionService', 'FilteredListService', 'UserService', '$ionicHistory', 'ReportSvc', 'GRAPH_COLORS', 'TABS', '$ionicPopup'];
    return SettingMisController;
})(MisController);

/// <reference path="../../_libs.ts" />
/// <reference path="../../components/operational/flown/OperationalFlownController.ts" />
/// <reference path="../../components/operational/services/OperationalService.ts" />
/// <reference path="../../components/mis/services/FilteredListService.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var SettingOptController = (function (_super) {
    __extends(SettingOptController, _super);
    function SettingOptController($state, $scope, $ionicLoading, $filter, operationalService, $ionicSlideBoxDelegate, $timeout, $window, reportSvc, filteredListService, userService, $ionicHistory, GRAPH_COLORS, TABS, $ionicPopup) {
        _super.call(this, $state, $scope, $ionicLoading, $filter, operationalService, $ionicSlideBoxDelegate, $timeout, $window, reportSvc, filteredListService, userService, $ionicHistory, GRAPH_COLORS, TABS, $ionicPopup);
        this.$state = $state;
        this.$scope = $scope;
        this.$ionicLoading = $ionicLoading;
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
    }
    SettingOptController.$inject = ['$state', '$scope', '$ionicLoading', '$filter',
        'OperationalService', '$ionicSlideBoxDelegate', '$timeout', '$window', 'ReportSvc', 'FilteredListService', 'UserService', '$ionicHistory', 'GRAPH_COLORS', 'TABS', '$ionicPopup'];
    return SettingOptController;
})(OperationalFlownController);

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
/// <reference path="./components/setting/SettingService.ts"/>
/// <reference path="./components/mis/MisController.ts"/>
/// <reference path="./components/operational/flown/OperationalFlownController.ts"/>
/// <reference path="./components/user/LoginController.ts"/>
/// <reference path="./components/setting/SettingMisController.ts"/>
/// <reference path="./components/setting/SettingOptController.ts"/>
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
    .service('SettingService', SettingService)
    .controller('AppController', AppController)
    .controller('MisController', MisController)
    .controller('OperationalFlownController', OperationalFlownController)
    .controller('LoginController', LoginController)
    .controller('SettingMisController', SettingMisController)
    .controller('SettingOptController', SettingOptController)
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
                    .style("width", function (d) { return x(+d.progress) + "%"; });
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
                            .style("width", function (d) { return x(d.value) + "%"; });
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
                    html = svgNode[key][0].parentElement.innerHTML;
                    if (svgNode[key].parentNode.getAttribute("data-item-pdfFlag") === "dynamicWH") {
                        d3.select("." + param + "Flag").select("svg").attr("width", 1500);
                        d3.select("." + param + "Flag").select("svg").attr("height", 600);
                        var node = d3.select("." + param + "Flag").select("svg");
                        html = node[0][0].parentElement.innerHTML;
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
                var nodeList = document.getElementsByClassName('sectorcarrieranalysis');
                var nodeFlag = [];
                if (tabIndex == 0 && nodeList.length == 2) {
                    nodeFlag.push(nodeList[0]);
                }
                else if (tabIndex == 0 && nodeList.length == 4) {
                    nodeFlag.push(nodeList[0]);
                    nodeFlag.push(nodeList[1]);
                }
                else if (tabIndex != 0 && nodeList.length == 2) {
                    nodeFlag.push(nodeList[1]);
                }
                else if (tabIndex != 0 && nodeList.length == 4) {
                    nodeFlag.push(nodeList[2]);
                    nodeFlag.push(nodeList[3]);
                }
                angular.forEach(nodeFlag, function (value, key) {
                    html2canvas(nodeFlag[key]).then(function (canvas) {
                        var c = canvas.toDataURL();
                        var text = "\n\n" + nodeFlag[key].getAttribute('data-item-title') + "\n\n";
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
                        if (key == nodeFlag.length - 1) {
                            deferred.resolve({ content: content });
                        }
                    });
                });
            }
            else if (param == "routerevenue") {
                var nodeList = document.getElementsByClassName('route-revenue-pdf');
                var nodeFlag;
                if (tabIndex === 0)
                    nodeFlag = nodeList[0];
                else
                    nodeFlag = nodeList[1];
                html2canvas(nodeFlag).then(function (canvas) {
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9saWJzLnRzIiwiY29tbW9uL3V0aWxzL1V0aWxzLnRzIiwiY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvQ29yZG92YVNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvTmV0U2VydmljZS50cyIsImNvbW1vbi9zZXJ2aWNlcy9FcnJvckhhbmRsZXJTZXJ2aWNlLnRzIiwiY29tbW9uL3NlcnZpY2VzL0lTZXNzaW9uSHR0cFByb21pc2UuanMiLCJjb21tb24vc2VydmljZXMvU2Vzc2lvblNlcnZpY2UudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1Jlc3BvbnNlLmpzIiwiY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHMiLCJjb21wb25lbnRzL3VzZXIvc2VydmljZXMvVXNlclNlcnZpY2UudHMiLCJjb21wb25lbnRzL29wZXJhdGlvbmFsL3NlcnZpY2VzL09wZXJhdGlvbmFsU2VydmljZS50cyIsImNvbXBvbmVudHMvbWlzL3NlcnZpY2VzL01pc1NlcnZpY2UudHMiLCJjb21wb25lbnRzL3NldHRpbmcvU2V0dGluZ1NlcnZpY2UudHMiLCJjb21tb24vYXBwL0FwcENvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL21pcy9zZXJ2aWNlcy9DaGFydG9wdGlvblNlcnZpY2UudHMiLCJjb21wb25lbnRzL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzIiwiY29tcG9uZW50cy9taXMvTWlzQ29udHJvbGxlci50cyIsImNvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudHMiLCJjb21wb25lbnRzL3VzZXIvTG9naW5Db250cm9sbGVyLnRzIiwiY29tcG9uZW50cy9zZXR0aW5nL1NldHRpbmdNaXNDb250cm9sbGVyLnRzIiwiY29tcG9uZW50cy9zZXR0aW5nL1NldHRpbmdPcHRDb250cm9sbGVyLnRzIiwiY29tbW9uL2NoYXJ0LWV2ZW50L0NoYXJ0RXZlbnQudHMiLCJhcHAudHMiLCJjb21tb24vc2VydmljZXMvR2VuZXJpY1JlcXVlc3QuanMiLCJjb21wb25lbnRzL21pcy9wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvcmV2ZW51ZS1wcm9ncmVzcy1iYXIuZGlyZWN0aXZlLnRzIiwiY29tcG9uZW50cy9taXMvc2VydmljZXMvcmVwb3J0QnVpbGRlclN2Yy50cyIsImNvbXBvbmVudHMvbWlzL3NlcnZpY2VzL3JlcG9ydFNlcnZpY2UudHMiXSwibmFtZXMiOlsiVXRpbHMiLCJVdGlscy5jb25zdHJ1Y3RvciIsIlV0aWxzLmlzTm90RW1wdHkiLCJVdGlscy5pc0xhbmRzY2FwZSIsIlV0aWxzLmdldFRvZGF5RGF0ZSIsIlV0aWxzLmlzSW50ZWdlciIsIkxvY2FsU3RvcmFnZVNlcnZpY2UiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTG9jYWxTdG9yYWdlU2VydmljZS5zZXQiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldCIsIkxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0T2JqZWN0IiwiTG9jYWxTdG9yYWdlU2VydmljZS5nZXRPYmplY3QiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmlzUmVjZW50RW50cnlBdmFpbGFibGUiLCJMb2NhbFN0b3JhZ2VTZXJ2aWNlLmFkZFJlY2VudEVudHJ5IiwiQ29yZG92YVNlcnZpY2UiLCJDb3Jkb3ZhU2VydmljZS5jb25zdHJ1Y3RvciIsIkNvcmRvdmFTZXJ2aWNlLmV4ZWMiLCJDb3Jkb3ZhU2VydmljZS5leGVjdXRlUGVuZGluZyIsIk5ldFNlcnZpY2UiLCJOZXRTZXJ2aWNlLmNvbnN0cnVjdG9yIiwiTmV0U2VydmljZS5nZXREYXRhIiwiTmV0U2VydmljZS5wb3N0RGF0YSIsIk5ldFNlcnZpY2UuZGVsZXRlRGF0YSIsIk5ldFNlcnZpY2UudXBsb2FkRmlsZSIsIk5ldFNlcnZpY2UuY2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkiLCJOZXRTZXJ2aWNlLnNlcnZlcklzQXZhaWxhYmxlIiwiTmV0U2VydmljZS5jYW5jZWxBbGxVcGxvYWREb3dubG9hZCIsIk5ldFNlcnZpY2UuYWRkTWV0YUluZm8iLCJlcnJvcmhhbmRsZXIiLCJFcnJvckhhbmRsZXJTZXJ2aWNlIiwiRXJyb3JIYW5kbGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkVycm9ySGFuZGxlclNlcnZpY2UudmFsaWRhdGVSZXNwb25zZSIsIkVycm9ySGFuZGxlclNlcnZpY2UuaXNOb1Jlc3VsdEZvdW5kIiwiRXJyb3JIYW5kbGVyU2VydmljZS5pc1Nlc3Npb25JbnZhbGlkIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNIYXJkRXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNTb2Z0RXJyb3JzIiwiRXJyb3JIYW5kbGVyU2VydmljZS5oYXNFcnJvcnMiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0ludmFsaWRTZXNzaW9uRXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc05vUmVzdWx0RXJyb3IiLCJFcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0hhcmRFcnJvciIsIkVycm9ySGFuZGxlclNlcnZpY2UuaGFzU29mdEVycm9yIiwic2Vzc2lvbnNlcnZpY2UiLCJTZXNzaW9uU2VydmljZSIsIlNlc3Npb25TZXJ2aWNlLmNvbnN0cnVjdG9yIiwiU2Vzc2lvblNlcnZpY2UucmVzb2x2ZVByb21pc2UiLCJTZXNzaW9uU2VydmljZS5hZGRBY2Nlc3NUb2tlblJlZnJlc2hlZExpc3RlbmVyIiwiU2Vzc2lvblNlcnZpY2UucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lciIsIlNlc3Npb25TZXJ2aWNlLnNldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLnNldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmdldENyZWRlbnRpYWxJZCIsIlNlc3Npb25TZXJ2aWNlLmNsZWFyTGlzdGVuZXJzIiwiU2Vzc2lvblNlcnZpY2UucmVmcmVzaFNlc3Npb25JZCIsIlNlc3Npb25TZXJ2aWNlLmFjY2Vzc1Rva2VuTm90UmVmcmVzaGVkIiwiU2Vzc2lvblNlcnZpY2UuYWNjZXNzVG9rZW5SZWZyZXNoZWQiLCJkYXRhcHJvdmlkZXIiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlIiwiRGF0YVByb3ZpZGVyU2VydmljZS5jb25zdHJ1Y3RvciIsIkRhdGFQcm92aWRlclNlcnZpY2UuZ2V0RGF0YSIsIkRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmRlbGV0ZURhdGEiLCJEYXRhUHJvdmlkZXJTZXJ2aWNlLmhhc05ldHdvcmtDb25uZWN0aW9uIiwiRGF0YVByb3ZpZGVyU2VydmljZS5hZGRNZXRhSW5mbyIsIkRhdGFQcm92aWRlclNlcnZpY2UuaXNMb2dvdXRTZXJ2aWNlIiwiVXNlclNlcnZpY2UiLCJVc2VyU2VydmljZS5jb25zdHJ1Y3RvciIsIlVzZXJTZXJ2aWNlLnNldFVzZXIiLCJVc2VyU2VydmljZS5sb2dvdXQiLCJVc2VyU2VydmljZS5pc0xvZ2dlZEluIiwiVXNlclNlcnZpY2UuaXNVc2VyTG9nZ2VkSW4iLCJVc2VyU2VydmljZS5nZXRVc2VyIiwiVXNlclNlcnZpY2UubG9naW4iLCJVc2VyU2VydmljZS5nZXRVc2VyUHJvZmlsZSIsIlVzZXJTZXJ2aWNlLnNob3dEYXNoYm9hcmQiLCJVc2VyU2VydmljZS5nZXREZWZhdWx0UGFnZSIsIk9wZXJhdGlvbmFsU2VydmljZSIsIk9wZXJhdGlvbmFsU2VydmljZS5jb25zdHJ1Y3RvciIsIk9wZXJhdGlvbmFsU2VydmljZS5nZXRQYXhGbG93bk9wckhlYWRlciIsIk9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJGbGlnaHRQcm9jU3RhdHVzIiwiT3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckZsaWdodENvdW50QnlSZWFzb24iLCJPcGVyYXRpb25hbFNlcnZpY2UuZ2V0T3ByQ291cG9uQ291bnRCeUV4Y2VwdGlvbiIsIk9wZXJhdGlvbmFsU2VydmljZS5nZXREcmlsbERvd24iLCJNaXNTZXJ2aWNlIiwiTWlzU2VydmljZS5jb25zdHJ1Y3RvciIsIk1pc1NlcnZpY2UuZ2V0TWV0cmljU25hcHNob3QiLCJNaXNTZXJ2aWNlLmdldFRhcmdldFZzQWN0dWFsIiwiTWlzU2VydmljZS5nZXRSZXZlbnVlQW5hbHlzaXMiLCJNaXNTZXJ2aWNlLmdldFJvdXRlUmV2ZW51ZSIsIk1pc1NlcnZpY2UuZ2V0U2VjdG9yQ2FycmllckFuYWx5c2lzIiwiTWlzU2VydmljZS5nZXRQYXhGbG93bk1pc0hlYWRlciIsIk1pc1NlcnZpY2UuZ2V0Um91dGVSZXZlbnVlRHJpbGxEb3duIiwiTWlzU2VydmljZS5nZXRCYXJEcmlsbERvd24iLCJNaXNTZXJ2aWNlLmdldERyaWxsRG93biIsIlNldHRpbmdTZXJ2aWNlIiwiU2V0dGluZ1NlcnZpY2UuY29uc3RydWN0b3IiLCJTZXR0aW5nU2VydmljZS51cGRhdGVGYXZvcml0ZUluZCIsIkFwcENvbnRyb2xsZXIiLCJBcHBDb250cm9sbGVyLmNvbnN0cnVjdG9yIiwiQXBwQ29udHJvbGxlci5vcGVuU2V0dGluZ3MiLCJBcHBDb250cm9sbGVyLmNsb3NlU2V0dGluZ3MiLCJBcHBDb250cm9sbGVyLnN0b3JlRmF2b3VyaXRlIiwiQXBwQ29udHJvbGxlci5zZWxlY3RGYXZvdXJpdGUiLCJBcHBDb250cm9sbGVyLnNlbGVjdEFsbCIsIkFwcENvbnRyb2xsZXIuY2hhbmdlU2V0dGluZyIsIkFwcENvbnRyb2xsZXIuc2F2ZUZhdm91cml0ZSIsIkFwcENvbnRyb2xsZXIudG9nZ2xlR3JvdXAiLCJBcHBDb250cm9sbGVyLmlzR3JvdXBTaG93biIsIkFwcENvbnRyb2xsZXIuaXNOb3RFbXB0eSIsIkFwcENvbnRyb2xsZXIuaGFzTmV0d29ya0Nvbm5lY3Rpb24iLCJBcHBDb250cm9sbGVyLmxvZ291dCIsIkFwcENvbnRyb2xsZXIuZ2V0VXNlckRlZmF1bHRQYWdlIiwiQXBwQ29udHJvbGxlci5zaG93RGFzaGJvYXJkIiwiQXBwQ29udHJvbGxlci5pb25pY0xvYWRpbmdTaG93IiwiQXBwQ29udHJvbGxlci5pb25pY0xvYWRpbmdIaWRlIiwiQXBwQ29udHJvbGxlci5nZXRQcm9maWxlVXNlck5hbWUiLCJDaGFydG9wdGlvblNlcnZpY2UiLCJDaGFydG9wdGlvblNlcnZpY2UuY29uc3RydWN0b3IiLCJDaGFydG9wdGlvblNlcnZpY2UubGluZUNoYXJ0T3B0aW9ucyIsIkNoYXJ0b3B0aW9uU2VydmljZS5tdWx0aUJhckNoYXJ0T3B0aW9ucyIsIkNoYXJ0b3B0aW9uU2VydmljZS5tZXRyaWNCYXJDaGFydE9wdGlvbnMiLCJDaGFydG9wdGlvblNlcnZpY2UudGFyZ2V0QmFyQ2hhcnRPcHRpb25zIiwiRmlsdGVyZWRMaXN0U2VydmljZSIsIkZpbHRlcmVkTGlzdFNlcnZpY2UuY29uc3RydWN0b3IiLCJGaWx0ZXJlZExpc3RTZXJ2aWNlLnNlYXJjaGVkIiwiRmlsdGVyZWRMaXN0U2VydmljZS5wYWdlZCIsInNlYXJjaFV0aWwiLCJNaXNDb250cm9sbGVyIiwiTWlzQ29udHJvbGxlci5jb25zdHJ1Y3RvciIsIk1pc0NvbnRyb2xsZXIuaW5pdERhdGEiLCJNaXNDb250cm9sbGVyLmdldFByb2ZpbGVVc2VyTmFtZSIsIk1pc0NvbnRyb2xsZXIuc2VsZWN0ZWRGbG93bk1vbnRoIiwiTWlzQ29udHJvbGxlci5vcGVuaW5mb1BvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNsb3NlUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIuY2xvc2VzQmFyUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIuY2xvc2VJbmZvUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIudXBkYXRlSGVhZGVyIiwiTWlzQ29udHJvbGxlci5vblNsaWRlTW92ZSIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlTWV0cmljIiwiTWlzQ29udHJvbGxlci50b2dnbGVTdXJjaGFyZ2UiLCJNaXNDb250cm9sbGVyLnRvZ2dsZVRhcmdldCIsIk1pc0NvbnRyb2xsZXIudG9nZ2xlU2VjdG9yIiwiTWlzQ29udHJvbGxlci5jYWxsTWV0cmljU25hcHNob3QiLCJNaXNDb250cm9sbGVyLmNhbGxUYXJnZXRWc0FjdHVhbCIsIk1pc0NvbnRyb2xsZXIuY2FsbFJvdXRlUmV2ZW51ZSIsIk1pc0NvbnRyb2xsZXIuY2FsbFJldmVudWVBbmFseXNpcyIsIk1pc0NvbnRyb2xsZXIub3BlbkRyaWxsRG93biIsIk1pc0NvbnRyb2xsZXIuY2xlYXJEcmlsbCIsIk1pc0NvbnRyb2xsZXIuZHJpbGxEb3duUmVxdWVzdCIsIk1pc0NvbnRyb2xsZXIuZ2V0RHJpbGxEb3duVVJMIiwiTWlzQ29udHJvbGxlci5vcGVuQmFyRHJpbGxEb3duIiwiTWlzQ29udHJvbGxlci5pbml0aWF0ZUFycmF5IiwiTWlzQ29udHJvbGxlci5vcGVuQmFyRHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblJQS01EcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5vcGVuQVNLTURyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5PQUxDb250RHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlbllpZWxkRHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3Blbk5ldHdvcmtSZXZlbnVlRHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblRhcmdldERyaWxsRG93blBvcG92ZXIiLCJNaXNDb250cm9sbGVyLm9wZW5SZXZlbnVlRHJpbGxEb3duUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblJldmVudWVQYXNzZW5nZXJEcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5vcGVuUG9wb3ZlciIsIk1pc0NvbnRyb2xsZXIub3BlblNlY3RvclBvcG92ZXIiLCJNaXNDb250cm9sbGVyLmNhbGxTZWN0b3JDYXJyaWVyQW5hbHlzaXMiLCJNaXNDb250cm9sbGVyLnRhcmdldEFjdHVhbEZpbHRlciIsIk1pc0NvbnRyb2xsZXIuc2VjdG9yQ2FycmllckZpbHRlciIsIk1pc0NvbnRyb2xsZXIucmV2ZW51ZUFuYWx5c2lzRmlsdGVyIiwiTWlzQ29udHJvbGxlci5nZXRGbG93bkZhdm9yaXRlcyIsIk1pc0NvbnRyb2xsZXIuc2VsZWN0VGFyZ2V0UmV2T3JQYXgiLCJNaXNDb250cm9sbGVyLmlvbmljTG9hZGluZ1Nob3ciLCJNaXNDb250cm9sbGVyLmlvbmljTG9hZGluZ0hpZGUiLCJNaXNDb250cm9sbGVyLm9wZW5EcmlsbERvd25Qb3BvdmVyIiwiTWlzQ29udHJvbGxlci5jbG9zZXNQb3BvdmVyIiwiTWlzQ29udHJvbGxlci5pc0RyaWxsUm93U2VsZWN0ZWQiLCJNaXNDb250cm9sbGVyLnNlYXJjaFJlc3VsdHMiLCJNaXNDb250cm9sbGVyLnBhZ2luYXRpb24iLCJNaXNDb250cm9sbGVyLnNldFBhZ2UiLCJNaXNDb250cm9sbGVyLmxhc3RQYWdlIiwiTWlzQ29udHJvbGxlci5yZXNldEFsbCIsIk1pc0NvbnRyb2xsZXIuc29ydCIsIk1pc0NvbnRyb2xsZXIucmFuZ2UiLCJNaXNDb250cm9sbGVyLnRvZ2dsZUdyb3VwIiwiTWlzQ29udHJvbGxlci5pc0dyb3VwU2hvd24iLCJNaXNDb250cm9sbGVyLnRvZ2dsZUNoYXJ0T3JUYWJsZVZpZXciLCJNaXNDb250cm9sbGVyLnRvZ2dsZVRhcmdldFZpZXciLCJNaXNDb250cm9sbGVyLnRvZ2dsZVJldmVudWVWaWV3IiwiTWlzQ29udHJvbGxlci50b2dnbGVTZWN0b3JWaWV3IiwiTWlzQ29udHJvbGxlci5ydW5SZXBvcnQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNvbnN0cnVjdG9yIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaW5pdERhdGEiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5zZWxlY3RlZEZsb3duTW9udGgiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5nZXRQcm9maWxlVXNlck5hbWUiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci51cGRhdGVIZWFkZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vblNsaWRlTW92ZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNhbGxNeURhc2hib2FyZCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNhbGxGbGlnaHRQcm9jU3RhdHVzIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2FsbEZsaWdodENvdW50QnlSZWFzb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jYWxsQ291cG9uQ291bnRCeUV4Y2VwdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5Qb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlblBpZVBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jbG9zZVBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5pb25pY0xvYWRpbmdTaG93IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuYXBwbHlDaGFydENvbG9yQ29kZXMiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5nZXRGYXZvcml0ZUl0ZW1zIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY29sb3JGdW5jdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmZvdXJCYXJDb2xvckZ1bmN0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudmFsdWVGb3JtYXRGdW5jdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvb2xUaXBDb250ZW50RnVuY3Rpb24iLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci55QXhpc1RpY2tGb3JtYXRGdW5jdGlvbiIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5pbmZvUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmNsb3NlSW5mb1BvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50b2dnbGVDb3VudCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmlvbmljTG9hZGluZ0hpZGUiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50YWJMb2NrU2xpZGUiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci53ZWVrRGF0YVByZXYiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci53ZWVrRGF0YU5leHQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50b2dnbGVGbGlnaHRTdGF0dXNWaWV3IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudG9nZ2xlRmxpZ2h0UmVhc29uVmlldyIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnRvZ2dsZUNDRXhjZXB0aW9uVmlldyIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnJ1blJlcG9ydCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5GbGlnaHRQcm9jZXNzRHJpbGxQb3BvdmVyIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIub3BlbkNvdW5wb25Db3VudERyaWxsUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLm9wZW5GbGlnaHRDb3VudERyaWxsUG9wb3ZlciIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmRyaWxsRG93blJlcXVlc3QiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5nZXREcmlsbERvd25VUkwiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50YWJTbGlkZUhhc0NoYW5nZWQiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5vcGVuRHJpbGxEb3duIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuY2xvc2VEcmlsbFBvcG92ZXIiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5jbGVhckRyaWxsIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuaW5pdGlhdGVBcnJheSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmlzRHJpbGxSb3dTZWxlY3RlZCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLnNlYXJjaFJlc3VsdHMiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5wYWdpbmF0aW9uIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIuc2V0UGFnZSIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmxhc3RQYWdlIiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIucmVzZXRBbGwiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci5zb3J0IiwiT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIucmFuZ2UiLCJPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50b2dnbGVHcm91cCIsIk9wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyLmlzR3JvdXBTaG93biIsIkxvZ2luQ29udHJvbGxlciIsIkxvZ2luQ29udHJvbGxlci5jb25zdHJ1Y3RvciIsIkxvZ2luQ29udHJvbGxlci5jbGVhckVycm9yIiwiTG9naW5Db250cm9sbGVyLmRvTG9naW4iLCJTZXR0aW5nTWlzQ29udHJvbGxlciIsIlNldHRpbmdNaXNDb250cm9sbGVyLmNvbnN0cnVjdG9yIiwiU2V0dGluZ09wdENvbnRyb2xsZXIiLCJTZXR0aW5nT3B0Q29udHJvbGxlci5jb25zdHJ1Y3RvciIsIkNoYXJ0RXZlbnQiLCJDaGFydEV2ZW50LmNvbnN0cnVjdG9yIiwiQ2hhcnRFdmVudC5mYWN0b3J5IiwiQ2hhcnRFdmVudC5hcHBlbmRDbGljayIsInJlcG9ydEJ1aWxkZXJTZXJ2aWNlIiwicmVwb3J0QnVpbGRlclNlcnZpY2UuX2dlbmVyYXRlUmVwb3J0IiwicmVwb3J0U3ZjIiwicmVwb3J0U3ZjLl9ydW5SZXBvcnRBc3luYyIsInJlcG9ydFN2Yy5fcnVuUmVwb3J0RGF0YVVSTCIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERlZiIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydERvYyIsInJlcG9ydFN2Yy5nZW5lcmF0ZVJlcG9ydEJ1ZmZlciIsInJlcG9ydFN2Yy5nZXREYXRhVVJMIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0QmxvYiIsInJlcG9ydFN2Yy5zYXZlRmlsZSIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGUyIsInJlcG9ydFN2Yy5zYXZlRmlsZS5nb3RGaWxlRW50cnkiLCJyZXBvcnRTdmMuc2F2ZUZpbGUuZ290RmlsZVdyaXRlciIsInJlcG9ydFN2Yy5zYXZlRmlsZS5mYWlsIiwicmVwb3J0U3ZjLnVuaXF1ZUZpbGVOYW1lIiwicmVwb3J0U3ZjLmdlbmVyYXRlUmVwb3J0Il0sIm1hcHBpbmdzIjoiQUFBQSw0Q0FBNEM7QUFDNUMsNkNBQTZDO0FBQzdDLDhDQUE4QztBQUM5QyxnREFBZ0Q7QUFDaEQsb0RBQW9EOztBQ0pwRCx1Q0FBdUM7QUFFdkM7SUFBQUE7SUE2QkFDLENBQUNBO0lBNUJjRCxnQkFBVUEsR0FBeEJBO1FBQXlCRSxnQkFBbUJBO2FBQW5CQSxXQUFtQkEsQ0FBbkJBLHNCQUFtQkEsQ0FBbkJBLElBQW1CQTtZQUFuQkEsK0JBQW1CQTs7UUFDM0NBLElBQUlBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBO1FBQ3RCQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxFQUFFQSxVQUFDQSxLQUFLQTtZQUN2QkEsVUFBVUEsR0FBR0EsVUFBVUEsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsS0FBS0EsS0FBS0EsSUFBSUEsSUFBSUEsS0FBS0EsS0FBS0EsRUFBRUE7bUJBQ2xGQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNuRkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDSEEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0E7SUFDbkJBLENBQUNBO0lBRWFGLGlC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LENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzlGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMxQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDekJBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2hDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUM3RkEsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDdENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUN0QkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDaENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzdGQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNoR0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsZ0JBQWdCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNqQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDcERBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ3BLQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNoR0EsQ0FBQ0E7UUFBQUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDNUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ25HQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtRQUNmQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFBQSxDQUFDQSxTQUFTQSxJQUFJQSxjQUFjQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUMvQkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDbkNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ2hHQSxDQUFDQTtRQUFBQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMzQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDbEdBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO1FBQ2ZBLENBQUNBO0lBQ0hBLENBQUNBO0lBRURBLEVBQUVBLENBQUFBLENBQUNBLFNBQVNBLElBQUlBLGNBQWNBLENBQUNBLENBQUNBLENBQUNBO1FBQy9CQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNuQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBRUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDaEdBLENBQUNBO1FBQUFBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzNDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFFQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUNsR0EsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsVUFBV0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDNUJBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2pDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUM3RkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDM0RBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUVBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ3BLQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN6Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDOUZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsaUJBQWlCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNsQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDaENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzVGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDN0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLE9BQU9BLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3JDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMxRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDMUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQy9GQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNwQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDekZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDeEJBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2hDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUM1RkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzlGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMxQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDL0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3hDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUM3RkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsTUFBTUEsSUFBSUEsU0FBU0EsSUFBSUEsTUFBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDL0NBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ25DQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsYUFBYUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDM0NBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQ2hHQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN6Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDOUZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsVUFBVUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDM0JBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzdCQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUN6RkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDMUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQy9GQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDN0ZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUMvRkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDZkEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUFFREEsRUFBRUEsQ0FBQUEsQ0FBQ0EsU0FBU0EsSUFBSUEsaUJBQWlCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNsQ0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDaENBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzVGQSxDQUFDQTtRQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFBQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN6Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDOUZBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUFBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFD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QSxDQUFDQSxDQUFDQTtZQUVwQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2JBLElBQUlBLENBQUNBLGFBQWFBLEdBQUdBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBO1lBQ3BDQSxDQUFDQTtZQUNEQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNsQkEsSUFBSUEsUUFBZ0JBLENBQUNBO1lBQ3JCQSxRQUFRQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxLQUFLQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUMxQ0EsSUFBSUEsT0FBT0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDakRBLElBQUlBLFVBQVVBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLFVBQVVBLEdBQUdBLEVBQUVBLENBQUNBO1lBQzFEQSxJQUFJQSxTQUFTQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUN2REEsSUFBSUEsT0FBT0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDakRBLElBQUlBLFlBQVlBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLEVBQUVBLENBQUNBO1lBQ2hFQSxJQUFJQSxNQUFNQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUU5Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1pBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBO2dCQUM5QkEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7WUFDMUJBLENBQUNBO1lBRURBLElBQUlBLENBQUNBLGdCQUFnQkEsRUFBRUEsQ0FBQ0E7WUFFeEJBLE9BQU9BLEdBQUdBO2dCQUNOQSxZQUFZQSxFQUFFQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQTtnQkFDcENBLGtCQUFrQkEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0E7Z0JBQ3ZEQSxRQUFRQSxFQUFFQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQTtnQkFDOUJBLGNBQWNBLEVBQUVBLFFBQVFBO2dCQUN4QkEsWUFBWUEsRUFBRUEsVUFBVUE7Z0JBQ3hCQSxVQUFVQSxFQUFFQSxRQUFRQTtnQkFDcEJBLFlBQVlBLEVBQUVBLENBQUNBO2dCQUNmQSxTQUFTQSxFQUFFQSxPQUFPQTtnQkFDbEJBLFdBQVdBLEVBQUVBLFNBQVNBO2dCQUN0QkEsWUFBWUEsRUFBRUEsVUFBVUE7Z0JBQ3hCQSxTQUFTQSxFQUFFQSxPQUFPQTtnQkFDbEJBLGNBQWNBLEVBQUVBLFlBQVlBO2dCQUM1QkEsUUFBUUEsRUFBRUEsTUFBTUE7YUFDbkJBLENBQUNBO1FBQ05BLENBQUNBO1FBRURBLEVBQUVBLENBQUFBLENBQUNBLFNBQVNBLElBQUlBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO1lBQ3RCQSxJQUFJQSxVQUFVQSxHQUFHQSxDQUFDQSxZQUFZQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUVwQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2JBLElBQUlBLENBQUNBLGFBQWFBLEdBQUdBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBO1lBQ3BDQSxDQUFDQTtZQUNEQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNsQkEsSUFBSUEsUUFBZ0JBLENBQUNBO1lBQ3JCQSxRQUFRQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxLQUFLQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUMxQ0EsSUFBSUEsT0FBT0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDakRBLElBQUlBLFNBQVNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLEdBQUdBLEVBQUVBLENBQUNBO1lBQ3ZEQSxJQUFJQSxNQUFNQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUN4REEsSUFBSUEsWUFBWUEsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFFaEVBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUNaQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQTtnQkFDOUJBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO1lBQzFCQSxDQUFDQTtZQUVEQSxJQUFJQSxDQUFDQSxnQkFBZ0JBLEVBQUVBLENBQUNBO1lBRXhCQSxPQUFPQSxHQUFHQTtnQkFDTkEsWUFBWUEsRUFBRUEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUE7Z0JBQ3BDQSxrQkFBa0JBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNB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LENBQUNBLENBQUNBLENBQUNBO1lBQ3JCQSxJQUFJQSxVQUFVQSxHQUFHQSxDQUFDQSxZQUFZQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUVwQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2JBLElBQUlBLENBQUNBLGFBQWFBLEdBQUdBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBO1lBQ3BDQSxDQUFDQTtZQUNEQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNsQkEsSUFBSUEsUUFBZ0JBLENBQUNBO1lBQ3JCQSxRQUFRQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxLQUFLQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUMxQ0EsSUFBSUEsT0FBT0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDakRBLElBQUlBLFlBQVlBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLEVBQUVBLENBQUNBO1lBQ2hFQSxJQUFJQSxhQUFhQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxhQUFhQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUNuRUEsSUFBSUEsV0FBV0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsV0FBV0EsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFFN0RBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUNaQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQTtnQkFDOUJBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFFBQVFBLENB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QUlBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLEVBQUVBLENBQUNBLENBQUNBO0lBQ3REQSxDQUFDQTtJQUNEeEQsd0NBQWdCQSxHQUFoQkEsVUFBaUJBLEdBQVdBO1FBQ3hCeUQsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsR0FBR0EsQ0FBQ0E7UUFDN0JBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEVBQUVBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLEVBQUVBLENBQUNBLENBQUNBO0lBQ3REQSxDQUFDQTtJQUNEekQseUNBQWlCQSxHQUFqQkEsVUFBa0JBLEdBQVdBO1FBQ3pCMEQsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0EsR0FBR0EsQ0FBQ0E7UUFDOUJBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEVBQUVBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLEVBQUVBLENBQUNBLENBQUNBO0lBQ3REQSxDQUFDQTtJQUNEMUQsd0NBQWdCQSxHQUFoQkEsVUFBaUJBLEdBQVdBO1FBQ3hCMkQsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsR0FBR0EsQ0FBQ0E7UUFDN0JBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEVBQUVBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLEVBQUVBLENBQUNBLENBQUNBO0lBQ3REQSxDQUFDQTtJQUNKM0QsaUNBQVNBLEdBQVRBLFVBQVVBLFVBQWtCQSxFQUFDQSxXQUFtQkEsRUFBQ0EsVUFBa0JBO1FBQzVENEQsSUFBSUEsTUFBTUEsQ0FBQ0E7UUFDWEEsSUFBS0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDakJBLElBQUlBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLGFB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LENBQUNBLEtBQUtBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2JBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQzlDQSxDQUFDQTtRQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNkQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNaQSxDQUFDQTtRQUNEQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNWQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxLQUFLQSxFQUFFQSxDQUFDQSxHQUFHQSxLQUFLQSxFQUFFQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQTtZQUNuQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDWkEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7WUFDSkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1ZBLEtBQUtBLENBQUNBO1lBQ1JBLENBQUNBO1FBQ0hBLENBQUNBO1FBQ0RBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBO0lBQ2JBLENBQUNBO0lBQ0RsRCxnREFBV0EsR0FBWEEsVUFBWUEsS0FBS0E7UUFDZm1ELEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzdCQSxJQUFJQSxDQUFDQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUN6QkEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsSUFBSUEsQ0FBQ0EsVUFBVUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDMUJBLENBQUNBO0lBQ0hBLENBQUNBO0lBQ0RuRCxpREFBWUEsR0FBWkEsVUFBYUEsS0FBYUE7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QUFPQSxFQUFFQSxPQUFPQSxFQUFDQSxDQUFDQSxDQUFDQTtZQUN0Q0EsQ0FBQ0E7WUFFREEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7UUFDekJBLENBQUNBO1FBQUFkLENBQUNBO0lBRUZBLENBQUNBO0FBRUgsQ0FBQyxDQUFDLEVBQUUsQ0FBQyIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwaW5ncy90c2QuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi90eXBpbmdzL2lvbmljLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9TY3JlZW4uZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi90eXBpbmdzL0lzVGFibGV0LmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdHlwaW5ncy9JbkFwcEJyb3dzZXIuZC50c1wiIC8+IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cblxuY2xhc3MgVXRpbHMge1xuXHRwdWJsaWMgc3RhdGljIGlzTm90RW1wdHkoLi4udmFsdWVzOiBPYmplY3RbXSk6IGJvb2xlYW4ge1xuXHRcdHZhciBpc05vdEVtcHR5ID0gdHJ1ZTtcblx0XHRfLmZvckVhY2godmFsdWVzLCAodmFsdWUpID0+IHtcblx0XHRcdGlzTm90RW1wdHkgPSBpc05vdEVtcHR5ICYmIChhbmd1bGFyLmlzRGVmaW5lZCh2YWx1ZSkgJiYgdmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09ICcnXG5cdFx0XHRcdCYmICEoKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc09iamVjdCh2YWx1ZSkpICYmIF8uaXNFbXB0eSh2YWx1ZSkpICYmIHZhbHVlICE9IDApO1xuXHRcdH0pO1xuXHRcdHJldHVybiBpc05vdEVtcHR5O1xuXHR9XG5cblx0cHVibGljIHN0YXRpYyBpc0xhbmRzY2FwZSgpOiBib29sZWFuIHtcblx0XHR2YXIgaXNMYW5kc2NhcGU6IGJvb2xlYW4gPSBmYWxzZTtcblx0XHRpZiAod2luZG93ICYmIHdpbmRvdy5zY3JlZW4gJiYgd2luZG93LnNjcmVlbi5vcmllbnRhdGlvbikge1xuXHRcdFx0dmFyIHR5cGU6IHN0cmluZyA9IDxzdHJpbmc+KF8uaXNTdHJpbmcod2luZG93LnNjcmVlbi5vcmllbnRhdGlvbikgPyB3aW5kb3cuc2NyZWVuLm9yaWVudGF0aW9uIDogd2luZG93LnNjcmVlbi5vcmllbnRhdGlvbi50eXBlKTtcblx0XHRcdGlmICh0eXBlKSB7XG5cdFx0XHRcdGlzTGFuZHNjYXBlID0gdHlwZS5pbmRleE9mKCdsYW5kc2NhcGUnKSA+PSAwO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gaXNMYW5kc2NhcGU7XG5cdH1cblxuXHRwdWJsaWMgc3RhdGljIGdldFRvZGF5RGF0ZSgpOiBEYXRlIHtcblx0XHR2YXIgdG9kYXlEYXRlID0gbmV3IERhdGUoKTtcblx0XHR0b2RheURhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG5cdFx0cmV0dXJuIHRvZGF5RGF0ZTtcblx0fVxuXHRwcml2YXRlIHN0YXRpYyBpc0ludGVnZXIobnVtYmVyOiBCaWdKc0xpYnJhcnkuQmlnSlMpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQobnVtYmVyLnRvU3RyaW5nKCkpID09ICtudW1iZXI7XG5cdH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuXG5pbnRlcmZhY2UgUG9pbnRPYmplY3Qge1xuXHRjb2RlOiBzdHJpbmcsXG5cdGRlc2NyaXB0aW9uOiBzdHJpbmdcbn1cblxuaW50ZXJmYWNlIElMb2NhbFN0b3JhZ2VTZXJ2aWNlIHtcblx0c2V0KGtleUlkOiBzdHJpbmcsIGtleXZhbHVlOiBzdHJpbmcpOiB2b2lkO1xuXHRnZXQoa2V5SWQ6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBzdHJpbmcpOiBzdHJpbmc7XG5cdHNldE9iamVjdChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogYW55W10pOiB2b2lkO1xuXHRnZXRPYmplY3Qoa2V5SWQ6IHN0cmluZyk6IGFueTtcblx0aXNSZWNlbnRFbnRyeUF2YWlsYWJsZShvcmdpbk9iamVjdDogUG9pbnRPYmplY3QsIHR5cGU6IHN0cmluZyk6IHZvaWQ7XG5cdGFkZFJlY2VudEVudHJ5KGRhdGE6IGFueSwgdHlwZTogc3RyaW5nKTogdm9pZDtcbn1cblxuY2xhc3MgTG9jYWxTdG9yYWdlU2VydmljZSBpbXBsZW1lbnRzIElMb2NhbFN0b3JhZ2VTZXJ2aWNlIHtcblxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyR3aW5kb3cnXTtcblx0cHJpdmF0ZSByZWNlbnRFbnRyaWVzOiBbUG9pbnRPYmplY3RdO1xuXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcblx0fVxuXG5cdHNldChrZXlJZDogc3RyaW5nLCBrZXl2YWx1ZTogc3RyaW5nKTogdm9pZCB7XG5cdFx0dGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZVtrZXlJZF0gPSBrZXl2YWx1ZTtcblx0fVxuXHRnZXQoa2V5SWQ6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRcdHJldHVybiB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSB8fCBkZWZhdWx0VmFsdWU7XG5cdH1cblx0c2V0T2JqZWN0KGtleUlkOiBzdHJpbmcsIGtleXZhbHVlOiBhbnlbXSk6IHZvaWQge1xuXHRcdHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdID0gIEpTT04uc3RyaW5naWZ5KGtleXZhbHVlKTtcblx0fVxuXHRnZXRPYmplY3Qoa2V5SWQ6IHN0cmluZyk6IGFueSB7XG5cdFx0cmV0dXJuIHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2Vba2V5SWRdID8gSlNPTi5wYXJzZSh0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlW2tleUlkXSkgOiB1bmRlZmluZWQ7XG5cdH1cblxuXHRpc1JlY2VudEVudHJ5QXZhaWxhYmxlKG9yZ2luT2JqZWN0OiBQb2ludE9iamVjdCwgdHlwZTogc3RyaW5nKSB7XG5cdFx0dGhpcy5yZWNlbnRFbnRyaWVzID0gdGhpcy5nZXRPYmplY3QodHlwZSkgPyB0aGlzLmdldE9iamVjdCh0eXBlKSA6IFtdO1xuXHRcdHJldHVybiB0aGlzLnJlY2VudEVudHJpZXMuZmlsdGVyKGZ1bmN0aW9uIChlbnRyeSkgeyByZXR1cm4gZW50cnkuY29kZSA9PT0gb3JnaW5PYmplY3QuY29kZSB9KTtcblx0fVxuXG5cdGFkZFJlY2VudEVudHJ5KGRhdGE6IGFueSwgdHlwZTogc3RyaW5nKSB7XG5cdFx0dmFyIG9yZ2luT2JqZWN0OiBQb2ludE9iamVjdFx0PVx0ZGF0YSA/IGRhdGEub3JpZ2luYWxPYmplY3QgOiB1bmRlZmluZWQ7XG5cblx0XHRpZiAob3JnaW5PYmplY3QpIHtcblx0XHRcdGlmICh0aGlzLmlzUmVjZW50RW50cnlBdmFpbGFibGUob3JnaW5PYmplY3QsIHR5cGUpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHR0aGlzLnJlY2VudEVudHJpZXMgPSB0aGlzLmdldE9iamVjdCh0eXBlKSA/IHRoaXMuZ2V0T2JqZWN0KHR5cGUpIDogW107XG5cdFx0XHRcdCh0aGlzLnJlY2VudEVudHJpZXMubGVuZ3RoID09IDMpID8gdGhpcy5yZWNlbnRFbnRyaWVzLnBvcCgpIDogdGhpcy5yZWNlbnRFbnRyaWVzO1xuXHRcdFx0XHR0aGlzLnJlY2VudEVudHJpZXMudW5zaGlmdChvcmdpbk9iamVjdCk7XG5cdFx0XHRcdHRoaXMuc2V0T2JqZWN0KHR5cGUsIHRoaXMucmVjZW50RW50cmllcyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuXG5pbnRlcmZhY2UgSUNvcmRvdmFDYWxsIHtcblx0KCk6IHZvaWQ7XG59XG5cbmNsYXNzIENvcmRvdmFTZXJ2aWNlIHtcblxuXHRwcml2YXRlIGNvcmRvdmFSZWFkeTogYm9vbGVhbiA9IGZhbHNlO1xuXHRwcml2YXRlIHBlbmRpbmdDYWxsczogSUNvcmRvdmFDYWxsW10gPSBbXTtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VyZWFkeScsICgpID0+IHtcblx0XHRcdHRoaXMuY29yZG92YVJlYWR5ID0gdHJ1ZTtcblx0XHRcdHRoaXMuZXhlY3V0ZVBlbmRpbmcoKTtcblx0XHR9KTtcblx0fVxuXG5cdGV4ZWMoZm46IElDb3Jkb3ZhQ2FsbCwgYWx0ZXJuYXRpdmVGbj86IElDb3Jkb3ZhQ2FsbCkge1xuXHRcdGlmICh0aGlzLmNvcmRvdmFSZWFkeSkge1xuXHRcdFx0Zm4oKTtcblx0XHR9IGVsc2UgaWYgKCFhbHRlcm5hdGl2ZUZuKSB7XG5cdFx0XHR0aGlzLnBlbmRpbmdDYWxscy5wdXNoKGZuKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0YWx0ZXJuYXRpdmVGbigpO1xuXHRcdH1cblx0fVxuXG5cdHByaXZhdGUgZXhlY3V0ZVBlbmRpbmcoKSB7XG5cdFx0dGhpcy5wZW5kaW5nQ2FsbHMuZm9yRWFjaCgoZm4pID0+IHtcblx0XHRcdGZuKCk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLnBlbmRpbmdDYWxscyA9IFtdO1xuXHR9XG5cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL3R5cGluZ3MvYW5ndWxhcmpzL2FuZ3VsYXIuZC50c1wiLz5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkNvcmRvdmFTZXJ2aWNlLnRzXCIgLz5cblxuaW50ZXJmYWNlIElOZXRTZXJ2aWNlIHtcblx0Z2V0RGF0YShmcm9tVXJsOiBzdHJpbmcpOiBuZy5JSHR0cFByb21pc2U8YW55Pjtcblx0cG9zdERhdGEodG9Vcmw6IHN0cmluZywgZGF0YTogYW55KTogbmcuSUh0dHBQcm9taXNlPGFueT47XG5cdGRlbGV0ZURhdGEodG9Vcmw6IHN0cmluZyk6IG5nLklIdHRwUHJvbWlzZTxhbnk+O1xuXHRjaGVja1NlcnZlckF2YWlsYWJpbGl0eSgpOiBuZy5JUHJvbWlzZTxib29sZWFuPjtcbn1cblxuY2xhc3MgTmV0U2VydmljZSBpbXBsZW1lbnRzIElOZXRTZXJ2aWNlIHtcblxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRodHRwJywgJ0NvcmRvdmFTZXJ2aWNlJywgJyRxJywgJ1VSTF9XUycsICdPV05FUl9DQVJSSUVSX0NPREUnXTtcblx0cHJpdmF0ZSBmaWxlVHJhbnNmZXI6IEZpbGVUcmFuc2Zlcjtcblx0cHJpdmF0ZSBpc1NlcnZlckF2YWlsYWJsZTogYm9vbGVhbiA9IGZhbHNlO1xuXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgJGh0dHA6IG5nLklIdHRwU2VydmljZSwgcHJpdmF0ZSBjb3Jkb3ZhU2VydmljZTogQ29yZG92YVNlcnZpY2UsIHByb3RlY3RlZCAkcTogbmcuSVFTZXJ2aWNlLCBwdWJsaWMgVVJMX1dTOiBzdHJpbmcsIHByaXZhdGUgT1dORVJfQ0FSUklFUl9DT0RFOiBzdHJpbmcpIHtcblx0XHR0aGlzLiRodHRwLmRlZmF1bHRzLnRpbWVvdXQgPSA2MDAwMDtcblx0XHRjb3Jkb3ZhU2VydmljZS5leGVjKCgpID0+IHtcblx0XHRcdC8vIHRoaXMuZmlsZVRyYW5zZmVyID0gbmV3IEZpbGVUcmFuc2ZlcigpO1xuXHRcdH0pO1xuXHR9XG5cblx0Z2V0RGF0YShmcm9tVXJsOiBzdHJpbmcpOiBuZy5JSHR0cFByb21pc2U8YW55PiB7XG5cdFx0dmFyIHVybDogc3RyaW5nID0gU0VSVkVSX1VSTCArIGZyb21Vcmw7XG5cdFx0cmV0dXJuIHRoaXMuJGh0dHAuZ2V0KHVybCk7XG5cdH1cblxuXHRwb3N0RGF0YSh0b1VybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IG5nLklSZXF1ZXN0U2hvcnRjdXRDb25maWcpOiBuZy5JSHR0cFByb21pc2U8YW55PiB7XG5cdFx0cmV0dXJuIHRoaXMuJGh0dHAucG9zdChTRVJWRVJfVVJMICsgdG9VcmwsIHRoaXMuYWRkTWV0YUluZm8oZGF0YSkpO1xuXHR9XG5cblx0ZGVsZXRlRGF0YSh0b1VybDogc3RyaW5nKTogbmcuSUh0dHBQcm9taXNlPGFueT4ge1xuXHRcdHJldHVybiB0aGlzLiRodHRwLmRlbGV0ZShTRVJWRVJfVVJMICsgdG9VcmwpO1xuXHR9XG5cblx0dXBsb2FkRmlsZShcblx0XHR0b1VybDogc3RyaW5nLCB1cmxGaWxlOiBzdHJpbmcsXG5cdFx0b3B0aW9uczogRmlsZVVwbG9hZE9wdGlvbnMsIHN1Y2Nlc3NDYWxsYmFjazogKHJlc3VsdDogRmlsZVVwbG9hZFJlc3VsdCkgPT4gdm9pZCxcblx0XHRlcnJvckNhbGxiYWNrOiAoZXJyb3I6IEZpbGVUcmFuc2ZlckVycm9yKSA9PiB2b2lkLCBwcm9ncmVzc0NhbGxiYWNrPzogKHByb2dyZXNzRXZlbnQ6IFByb2dyZXNzRXZlbnQpID0+IHZvaWQpIHtcblx0XHRpZiAoIXRoaXMuZmlsZVRyYW5zZmVyKSB7XG5cdFx0XHR0aGlzLmZpbGVUcmFuc2ZlciA9IG5ldyBGaWxlVHJhbnNmZXIoKTtcblx0XHR9XG5cdFx0Y29uc29sZS5sb2cob3B0aW9ucy5wYXJhbXMpO1xuXHRcdHRoaXMuZmlsZVRyYW5zZmVyLm9ucHJvZ3Jlc3MgPSBwcm9ncmVzc0NhbGxiYWNrO1xuXHRcdHZhciB1cmw6IHN0cmluZyA9IFNFUlZFUl9VUkwgKyB0b1VybDtcblx0XHR0aGlzLmZpbGVUcmFuc2Zlci51cGxvYWQodXJsRmlsZSwgdXJsLCBzdWNjZXNzQ2FsbGJhY2ssIGVycm9yQ2FsbGJhY2ssIG9wdGlvbnMpO1xuXHR9XG5cblx0Y2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkoKTogbmcuSVByb21pc2U8Ym9vbGVhbj4ge1xuXHRcdHZhciBhdmFpbGFiaWxpdHk6IGJvb2xlYW4gPSB0cnVlO1xuXG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGJvb2xlYW4+ID0gdGhpcy4kcS5kZWZlcigpO1xuXG5cdFx0dGhpcy5jb3Jkb3ZhU2VydmljZS5leGVjKCgpID0+IHtcblx0XHRcdGlmICh3aW5kb3cubmF2aWdhdG9yKSB7IC8vIG9uIGRldmljZVxuXHRcdFx0XHR2YXIgbmF2aWdhdG9yOiBOYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xuXHRcdFx0XHRpZiAobmF2aWdhdG9yLmNvbm5lY3Rpb24gJiYgKChuYXZpZ2F0b3IuY29ubmVjdGlvbi50eXBlID09IENvbm5lY3Rpb24uTk9ORSkgfHwgKG5hdmlnYXRvci5jb25uZWN0aW9uLnR5cGUgPT0gQ29ubmVjdGlvbi5VTktOT1dOKSkpIHtcblx0XHRcdFx0XHRhdmFpbGFiaWxpdHkgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZGVmLnJlc29sdmUoYXZhaWxhYmlsaXR5KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdHNlcnZlcklzQXZhaWxhYmxlKCk6IGJvb2xlYW4ge1xuXHRcdHZhciB0aGF0OiBOZXRTZXJ2aWNlID0gdGhpcztcblxuXHRcdHZhciBzZXJ2ZXJJc0F2YWlsYWJsZSA9IHRoaXMuY2hlY2tTZXJ2ZXJBdmFpbGFiaWxpdHkoKS50aGVuKChyZXN1bHQ6IGJvb2xlYW4pID0+IHtcblx0XHRcdHRoYXQuaXNTZXJ2ZXJBdmFpbGFibGUgPSByZXN1bHQ7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdGhpcy5pc1NlcnZlckF2YWlsYWJsZTtcblx0fVxuXG5cdGNhbmNlbEFsbFVwbG9hZERvd25sb2FkKCkge1xuXHRcdGlmICh0aGlzLmZpbGVUcmFuc2Zlcikge1xuXHRcdFx0dGhpcy5maWxlVHJhbnNmZXIuYWJvcnQoKTtcblx0XHR9XG5cdH1cblxuXHRhZGRNZXRhSW5mbyhyZXF1ZXN0RGF0YTogYW55KTogYW55IHtcblx0XHR2YXIgZGV2aWNlOiBJb25pYy5JRGV2aWNlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKClcblx0XHR2YXIgbW9kZWw6IHN0cmluZyA9ICdkZXZpY2UgSW5mbyc7XG5cdFx0dmFyIG9zVHlwZTogc3RyaW5nID0gJzguNCc7XG5cdFx0dmFyIG9zVmVyc2lvbjogc3RyaW5nID0gJ2lvcyc7XG5cdFx0dmFyIGRldmljZVRva2VuOiBzdHJpbmcgPSAnc3RyaW5nJztcblx0XHRpZiAoZGV2aWNlKSB7XG5cdFx0XHRtb2RlbCA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLm1vZGVsO1xuXHRcdFx0b3NUeXBlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkucGxhdGZvcm07XG5cdFx0XHRvc1ZlcnNpb24gPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS52ZXJzaW9uO1xuXHRcdH1cblx0XHRpZiAoIW1vZGVsKSB7XG5cdFx0XHRtb2RlbCA9ICdkZXZpY2UgSW5mbyc7XHRcblx0XHR9XG5cdFx0aWYgKCFvc1R5cGUpIHtcblx0XHRcdG9zVHlwZSA9ICc4LjQnO1x0XG5cdFx0fVxuXHRcdGlmICghb3NWZXJzaW9uKSB7XG5cdFx0XHRvc1ZlcnNpb24gPSAnaW9zJztcdFxuXHRcdH1cblx0XHRcblx0XHR2YXIgbWV0YUluZm8gPSB7XG5cdFx0XHQnY2hhbm5lbElkZW50aWZpZXInOiAnTU9CJyxcblx0XHRcdCdkYXRlVGltZVN0YW1wJzogbmV3IERhdGUoKS5nZXRUaW1lKCksXG5cdFx0XHQnb3duZXJDYXJyaWVyQ29kZSc6IHRoaXMuT1dORVJfQ0FSUklFUl9DT0RFLFxuXHRcdFx0J2FkZGl0aW9uYWxJbmZvJzoge1xuXHRcdFx0XHQnZGV2aWNlVHlwZSc6IHdpbmRvdy5pc1RhYmxldCA/ICdUYWJsZXQnIDogJ1Bob25lJyxcblx0XHRcdFx0J21vZGVsJzogbW9kZWwsXG5cdFx0XHRcdCdvc1R5cGUnOiBvc1R5cGUsXG5cdFx0XHRcdCdvc1ZlcnNpb24nOiBvc1ZlcnNpb24sXG5cdFx0XHRcdCdkZXZpY2VUb2tlbic6IGRldmljZVRva2VuLFxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHR2YXIgcmVxdWVzdE9iaiA9IHtcblx0XHRcdCdtZXRhSW5mbyc6IG1ldGFJbmZvLFxuXHRcdFx0J3JlcXVlc3REYXRhJzogcmVxdWVzdERhdGFcblx0XHR9O1xuXHRcdHJldHVybiByZXF1ZXN0T2JqO1xuXHR9XG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk5ldFNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkNvcmRvdmFTZXJ2aWNlLnRzXCIgLz5cblxubW9kdWxlIGVycm9yaGFuZGxlciB7XG5cdGV4cG9ydCBjb25zdCBTVEFUVVNfRkFJTDogc3RyaW5nID0gJ2ZhaWwnO1xuXHRleHBvcnQgY29uc3QgU0VWRVJJVFlfRVJST1JfSEFSRDogc3RyaW5nID0gJ0hBUkQnO1xuXHRleHBvcnQgY29uc3QgU0VWRVJJVFlfRVJST1JfU09GVDogc3RyaW5nID0gJ1NPRlQnO1xuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9JTlZBTElEX1NFU1NJT05fVE9LRU4gPSAnU0VDLjAyNSc7XG5cdGV4cG9ydCBjb25zdCBIQVJEX0VSUk9SX0lOVkFMSURfU0VTU0lPTiA9ICdTRVMuMDA0Jztcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfVE9LRU5fRVhQSVJFRCA9ICdTRUMuMDM4Jztcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfSU5WQUxJRF9VU0VSX1NFU1NJT05fRVhQSVJFRCA9ICdTRVMuMDAzJztcblx0ZXhwb3J0IGNvbnN0IEhBUkRfRVJST1JfTk9fUkVTVUxUID0gJ0NPTS4xMTEnO1xuXHRleHBvcnQgY29uc3QgSEFSRF9FUlJPUl9OT19ST1VURSA9ICdGTFQuMDEwJztcbn1cblxuY2xhc3MgRXJyb3JIYW5kbGVyU2VydmljZSB7XG5cblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWydOZXRTZXJ2aWNlJywgJ0NvcmRvdmFTZXJ2aWNlJywgJyRxJywgJyRyb290U2NvcGUnXTtcblxuXHRjb25zdHJ1Y3Rvcihcblx0XHRwcml2YXRlIG5ldFNlcnZpY2U6IE5ldFNlcnZpY2UsIHByaXZhdGUgY29yZG92YVNlcnZpY2U6IENvcmRvdmFTZXJ2aWNlLCBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UsXG5cdFx0cHJpdmF0ZSAkcm9vdFNjb3BlOiBuZy5JU2NvcGUpIHtcblx0fVxuXG5cdHZhbGlkYXRlUmVzcG9uc2UocmVzcG9uc2U6IGFueSkge1xuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcblx0XHRpZiAodGhpcy5oYXNFcnJvcnMoZXJyb3JzKSB8fCBlcnJvcmhhbmRsZXIuU1RBVFVTX0ZBSUwgPT0gcmVzcG9uc2Uuc3RhdHVzKSB7XG5cdFx0XHRpZiAoIXRoaXMuaGFzSW52YWxpZFNlc3Npb25FcnJvcihlcnJvcnMpICYmICF0aGlzLmhhc05vUmVzdWx0RXJyb3IoZXJyb3JzKSkge1xuXHRcdFx0XHQvLyBicm9hZGNhc3QgdG8gYXBwY29udHJvbGxlciBzZXJ2ZXIgZXJyb3Jcblx0XHRcdFx0dGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3NlcnZlckVycm9yJywgcmVzcG9uc2UpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGlzTm9SZXN1bHRGb3VuZChyZXNwb25zZTogYW55KTogYm9vbGVhbiB7XG5cdFx0dmFyIGVycm9ycyA9IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UgPyByZXNwb25zZS5kYXRhLnJlc3BvbnNlLmVycm9ycyA6IFtdO1xuXHRcdHJldHVybiB0aGlzLmhhc05vUmVzdWx0RXJyb3IoZXJyb3JzKTtcblx0fVxuXG5cdGlzU2Vzc2lvbkludmFsaWQocmVzcG9uc2U6IGFueSk6IGJvb2xlYW4ge1xuXHRcdHZhciBlcnJvcnMgPSByZXNwb25zZS5kYXRhLnJlc3BvbnNlID8gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5lcnJvcnMgOiBbXTtcblx0XHRyZXR1cm4gdGhpcy5oYXNJbnZhbGlkU2Vzc2lvbkVycm9yKGVycm9ycyk7XG5cdH1cblxuXHRoYXNIYXJkRXJyb3JzKHJlc3BvbnNlOiBhbnkpOiBib29sZWFuIHtcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XG5cdFx0cmV0dXJuIHRoaXMuaGFzSGFyZEVycm9yKGVycm9ycyk7XG5cdH1cblxuXHRoYXNTb2Z0RXJyb3JzKHJlc3BvbnNlOiBhbnkpOiBib29sZWFuIHtcblx0XHR2YXIgZXJyb3JzID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZSA/IHJlc3BvbnNlLmRhdGEucmVzcG9uc2UuZXJyb3JzIDogW107XG5cdFx0cmV0dXJuIHRoaXMuaGFzU29mdEVycm9yKGVycm9ycyk7XG5cdH1cblxuXHRwcml2YXRlIGhhc0Vycm9ycyhlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiBlcnJvcnMubGVuZ3RoID4gMDtcblx0fVxuXG5cdHByaXZhdGUgaGFzSW52YWxpZFNlc3Npb25FcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiBfLnNvbWUoZXJyb3JzLCAoZXJyb3I6IGFueSkgPT4ge1xuXHRcdFx0cmV0dXJuIGVycm9yICYmIGVycm9yaGFuZGxlci5TRVZFUklUWV9FUlJPUl9IQVJEID09IGVycm9yLnNldmVyaXR5ICYmXG5cdFx0XHQoZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OX1RPS0VOID09IGVycm9yLmNvZGUgfHxcblx0XHRcdFx0ZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfSU5WQUxJRF9TRVNTSU9OID09IGVycm9yLmNvZGUgfHxcblx0XHRcdFx0ZXJyb3JoYW5kbGVyLkhBUkRfRVJST1JfSU5WQUxJRF9VU0VSX1NFU1NJT05fRVhQSVJFRCA9PSBlcnJvci5jb2RlIHx8XG5cdFx0XHRcdGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX1RPS0VOX0VYUElSRUQgPT0gZXJyb3IuY29kZSk7XG5cdFx0fSk7XG5cdH1cblxuXHRwcml2YXRlIGhhc05vUmVzdWx0RXJyb3IoZXJyb3JzOiBhbnkpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gXy5zb21lKGVycm9ycywgKGVycm9yOiBhbnkpID0+IHtcblx0XHRcdHJldHVybiBlcnJvciAmJiBlcnJvcmhhbmRsZXIuU0VWRVJJVFlfRVJST1JfSEFSRCA9PSBlcnJvci5zZXZlcml0eSAmJlxuXHRcdFx0KGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX05PX1JFU1VMVCA9PSBlcnJvci5jb2RlIHx8XG5cdFx0XHRcdGVycm9yaGFuZGxlci5IQVJEX0VSUk9SX05PX1JPVVRFID09IGVycm9yLmNvZGUpO1xuXHRcdH0pICYmIGVycm9ycy5sZW5ndGggPT0gMTtcblx0fVxuXG5cdHByaXZhdGUgaGFzSGFyZEVycm9yKGVycm9yczogYW55KTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIF8uc29tZShlcnJvcnMsIChlcnJvcjogYW55KSA9PiB7XG5cdFx0XHRyZXR1cm4gZXJyb3IgJiYgZXJyb3JoYW5kbGVyLlNFVkVSSVRZX0VSUk9SX0hBUkQgPT0gZXJyb3Iuc2V2ZXJpdHk7XG5cdFx0fSk7XG5cdH1cblxuXHRwcml2YXRlIGhhc1NvZnRFcnJvcihlcnJvcnM6IGFueSk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiBfLnNvbWUoZXJyb3JzLCAoZXJyb3I6IGFueSkgPT4ge1xuXHRcdFx0cmV0dXJuIGVycm9yICYmIGVycm9yaGFuZGxlci5TRVZFUklUWV9FUlJPUl9TT0ZUID09IGVycm9yLnNldmVyaXR5O1xuXHRcdH0pO1xuXHR9XG59IixudWxsLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTmV0U2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkVycm9ySGFuZGxlclNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIklTZXNzaW9uSHR0cFByb21pc2UudHNcIiAvPlxuXG5tb2R1bGUgc2Vzc2lvbnNlcnZpY2Uge1xuXHRleHBvcnQgY29uc3QgSEVBREVSX1JFRlJFU0hfVE9LRU5fS0VZOiBzdHJpbmcgPSAneC1yZWZyZXNoLXRva2VuJztcblx0ZXhwb3J0IGNvbnN0IEhFQURFUl9BQ0NFU1NfVE9LRU5fS0VZOiBzdHJpbmcgPSAneC1hY2Nlc3MtdG9rZW4nO1xuXHRleHBvcnQgY29uc3QgUkVGUkVTSF9TRVNTSU9OX0lEX1VSTDogc3RyaW5nID0gJy91c2VyL2dldEFjY2Vzc1Rva2VuJztcbn1cblxuY2xhc3MgU2Vzc2lvblNlcnZpY2Uge1xuXG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnTmV0U2VydmljZScsICdFcnJvckhhbmRsZXJTZXJ2aWNlJywgJyRxJywgJyRyb290U2NvcGUnLCAnJGh0dHAnXTtcblxuXHRwcml2YXRlIGFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzOiBJQWNjZXNzVG9rZW5SZWZyZXNoZWRIYW5kbGVyW107XG5cdHByaXZhdGUgc2Vzc2lvbklkOiBzdHJpbmc7XG5cdHByaXZhdGUgY3JlZGVudGlhbElkOiBzdHJpbmc7XG5cdHByaXZhdGUgaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzczogYm9vbGVhbiA9IGZhbHNlO1xuXG5cdGNvbnN0cnVjdG9yKFxuXHRcdHByaXZhdGUgbmV0U2VydmljZTogTmV0U2VydmljZSwgcHJpdmF0ZSBlcnJvckhhbmRsZXJTZXJ2aWNlOiBFcnJvckhhbmRsZXJTZXJ2aWNlLCBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UsXG5cdFx0cHJpdmF0ZSAkcm9vdFNjb3BlOiBuZy5JU2NvcGUsIHByaXZhdGUgJGh0dHA6IG5nLklIdHRwU2VydmljZSkge1xuXHRcdHRoaXMuYWNjZXNzVG9rZW5SZWZyZXNoZWRMaXNudGVyZXMgPSBbXTtcblx0XHR0aGlzLnNlc3Npb25JZCA9IG51bGw7XG5cdFx0dGhpcy5jcmVkZW50aWFsSWQgPSBudWxsO1xuXHR9XG5cblx0cmVzb2x2ZVByb21pc2UocHJvbWlzZTogSVNlc3Npb25IdHRwUHJvbWlzZSkge1xuXHRcdHByb21pc2UucmVzcG9uc2UudGhlbigocmVzcG9uc2UpID0+IHtcblx0XHRcdGlmICghdGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0hhcmRFcnJvcnMocmVzcG9uc2UpIHx8IHRoaXMuZXJyb3JIYW5kbGVyU2VydmljZS5pc1Nlc3Npb25JbnZhbGlkKHJlc3BvbnNlKSkge1xuXHRcdFx0XHRpZiAoIXRoaXMuZXJyb3JIYW5kbGVyU2VydmljZS5pc1Nlc3Npb25JbnZhbGlkKHJlc3BvbnNlKSkge1xuXHRcdFx0XHRcdHByb21pc2UuZGVmZmVyZWQucmVzb2x2ZShwcm9taXNlLnJlc3BvbnNlKTtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnc2Vzc2lvbiBpcyB2YWxpZCcpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuYWRkQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihwcm9taXNlKTtcblx0XHRcdFx0XHRpZiAoIXRoaXMuaXNSZWZyZXNoU2Vzc2lvbklkSW5Qcm9ncmVzcykge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3JlZnJlc2hpbmcgc2Vzc2lvbiB0b2tlbicpO1xuXHRcdFx0XHRcdFx0dGhpcy5yZWZyZXNoU2Vzc2lvbklkKCkudGhlbihcblx0XHRcdFx0XHRcdFx0KHRva2VuUmVzcG9uc2UpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5lcnJvckhhbmRsZXJTZXJ2aWNlLmhhc0hhcmRFcnJvcnModG9rZW5SZXNwb25zZSkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuc2V0U2Vzc2lvbklkKG51bGwpO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgcmVzcG9uc2VIZWFkZXIgPSB0b2tlblJlc3BvbnNlLmhlYWRlcnMoKTtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciBhY2Nlc3NUb2tlbjogc3RyaW5nID0gcmVzcG9uc2VIZWFkZXJbc2Vzc2lvbnNlcnZpY2UuSEVBREVSX0FDQ0VTU19UT0tFTl9LRVldO1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRTZXNzaW9uSWQoYWNjZXNzVG9rZW4pO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR0aGlzLmlzUmVmcmVzaFNlc3Npb25JZEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0XHRpZiAoIXRoaXMuZ2V0U2Vzc2lvbklkKCkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuYWNjZXNzVG9rZW5Ob3RSZWZyZXNoZWQoKTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZCgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2Vycm9yIG9uIGFjY2VzcyB0b2tlbiByZWZyZXNoJyk7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRTZXNzaW9uSWQobnVsbCk7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuZ2V0Q3JlZGVudGlhbElkKCkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuYWNjZXNzVG9rZW5Ob3RSZWZyZXNoZWQoKTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0cHJvbWlzZS5kZWZmZXJlZC5yZWplY3QoKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5pc1JlZnJlc2hTZXNzaW9uSWRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cHJvbWlzZS5kZWZmZXJlZC5yZWplY3QoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGFkZEFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzdGVuZXIobGlzdGVuZXI6IElBY2Nlc3NUb2tlblJlZnJlc2hlZEhhbmRsZXIpIHtcblx0XHR0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLnB1c2gobGlzdGVuZXIpO1xuXHR9XG5cblx0cmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lclRvUmVtb3ZlOiBJQWNjZXNzVG9rZW5SZWZyZXNoZWRIYW5kbGVyKSB7XG5cdFx0Xy5yZW1vdmUodGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcywgKGxpc3RlbmVyKSA9PiB7XG5cdFx0XHRyZXR1cm4gbGlzdGVuZXIgPT0gbGlzdGVuZXJUb1JlbW92ZTtcblx0XHR9KTtcblx0fVxuXG5cdHNldENyZWRlbnRpYWxJZChjcmVkSWQ6IHN0cmluZykge1xuXHRcdHRoaXMuY3JlZGVudGlhbElkID0gY3JlZElkO1xuXHRcdHRoaXMuJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bc2Vzc2lvbnNlcnZpY2UuSEVBREVSX1JFRlJFU0hfVE9LRU5fS0VZXSA9IGNyZWRJZDtcblx0fVxuXG5cdHNldFNlc3Npb25JZChzZXNzaW9uSWQ6IHN0cmluZykge1xuXHRcdHRoaXMuc2Vzc2lvbklkID0gc2Vzc2lvbklkO1xuXHRcdHRoaXMuJGh0dHAuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bc2Vzc2lvbnNlcnZpY2UuSEVBREVSX0FDQ0VTU19UT0tFTl9LRVldID0gc2Vzc2lvbklkO1xuXHR9XG5cblx0Z2V0U2Vzc2lvbklkKCk6IHN0cmluZyB7XG5cdFx0cmV0dXJuIHRoaXMuc2Vzc2lvbklkID8gdGhpcy5zZXNzaW9uSWQgOiBudWxsO1xuXHR9XG5cblx0Z2V0Q3JlZGVudGlhbElkKCk6IHN0cmluZyB7XG5cdFx0cmV0dXJuIHRoaXMuY3JlZGVudGlhbElkID8gdGhpcy5jcmVkZW50aWFsSWQgOiBudWxsO1xuXHR9XG5cblx0Y2xlYXJMaXN0ZW5lcnMoKSB7XG5cdFx0dGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcyA9IFtdO1xuXHR9XG5cblx0cHJpdmF0ZSByZWZyZXNoU2Vzc2lvbklkKCk6IG5nLklIdHRwUHJvbWlzZTxhbnk+IHtcblx0XHR0aGlzLmlzUmVmcmVzaFNlc3Npb25JZEluUHJvZ3Jlc3MgPSB0cnVlO1xuXHRcdHZhciBhY2Nlc3NUb2tlblJlcXVlc3Q6IGFueSA9IHtcblx0XHRcdHJlZnJlc2hUb2tlbjogdGhpcy5jcmVkZW50aWFsSWRcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMubmV0U2VydmljZS5wb3N0RGF0YShzZXNzaW9uc2VydmljZS5SRUZSRVNIX1NFU1NJT05fSURfVVJMLCBhY2Nlc3NUb2tlblJlcXVlc3QpO1xuXHR9XG5cblx0cHJpdmF0ZSBhY2Nlc3NUb2tlbk5vdFJlZnJlc2hlZCgpIHtcblx0XHRfLmZvckVhY2godGhpcy5hY2Nlc3NUb2tlblJlZnJlc2hlZExpc250ZXJlcywgKGxpc3RlbmVyKSA9PiB7XG5cdFx0XHRpZiAobGlzdGVuZXIub25Ub2tlbkZhaWxlZCkge1xuXHRcdFx0XHRsaXN0ZW5lci5vblRva2VuRmFpbGVkKGxpc3RlbmVyKTtcblx0XHRcdH1cblx0XHRcdHRoaXMucmVtb3ZlQWNjZXNzVG9rZW5SZWZyZXNoZWRMaXN0ZW5lcihsaXN0ZW5lcik7XG5cdFx0fSk7XG5cdH1cblxuXHRwcml2YXRlIGFjY2Vzc1Rva2VuUmVmcmVzaGVkKCkge1xuXHRcdF8uZm9yRWFjaCh0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLCAobGlzdGVuZXIpID0+IHtcblx0XHRcdGlmIChsaXN0ZW5lcikge1xuXHRcdFx0XHRpZiAobGlzdGVuZXIub25Ub2tlblJlZnJlc2hlZCkge1xuXHRcdFx0XHRcdGxpc3RlbmVyLm9uVG9rZW5SZWZyZXNoZWQobGlzdGVuZXIpO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGxpc3RlbmVyKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdMZW5ndGggPSAnLCB0aGlzLmFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzbnRlcmVzLmxlbmd0aCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnJlbW92ZUFjY2Vzc1Rva2VuUmVmcmVzaGVkTGlzdGVuZXIobGlzdGVuZXIpO1xuXHRcdH0pO1xuXHR9XG59IixudWxsLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTmV0U2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29yZG92YVNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIlNlc3Npb25TZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJFcnJvckhhbmRsZXJTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJJU2Vzc2lvbkh0dHBQcm9taXNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJHZW5lcmljUmVzcG9uc2UudHNcIiAvPlxuXG5tb2R1bGUgZGF0YXByb3ZpZGVyIHtcblx0ZXhwb3J0IGNvbnN0IFNFUlZJQ0VfVVJMX0xPR09VVCA9ICcvdXNlci9sb2dvdXQnO1xufVxuXG5jbGFzcyBEYXRhUHJvdmlkZXJTZXJ2aWNlIHtcblxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ05ldFNlcnZpY2UnLCAnQ29yZG92YVNlcnZpY2UnLCAnJHEnLCAnJHJvb3RTY29wZScsICdFcnJvckhhbmRsZXJTZXJ2aWNlJywgJ1Nlc3Npb25TZXJ2aWNlJywgJ09XTkVSX0NBUlJJRVJfQ09ERSddO1xuXG5cdHByaXZhdGUgaXNDb25uZWN0ZWRUb05ldHdvcms6IGJvb2xlYW4gPSB0cnVlO1xuXHRwcml2YXRlIG5hdmlnYXRvcjogTmF2aWdhdG9yO1xuXG5cdGNvbnN0cnVjdG9yKFxuXHRcdHByaXZhdGUgbmV0U2VydmljZTogTmV0U2VydmljZSwgcHJpdmF0ZSBjb3Jkb3ZhU2VydmljZTogQ29yZG92YVNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcblx0XHRwcml2YXRlICRyb290U2NvcGU6IG5nLklTY29wZSwgcHJpdmF0ZSBlcnJvckhhbmRsZXJTZXJ2aWNlOiBFcnJvckhhbmRsZXJTZXJ2aWNlLFxuXHRcdHByaXZhdGUgc2Vzc2lvblNlcnZpY2U6IFNlc3Npb25TZXJ2aWNlLCBwcml2YXRlIE9XTkVSX0NBUlJJRVJfQ09ERTogc3RyaW5nKSB7XG5cblx0XHR0aGlzLmNvcmRvdmFTZXJ2aWNlLmV4ZWMoKCkgPT4ge1xuXHRcdFx0aWYgKHdpbmRvdy5jb3Jkb3ZhICYmIHdpbmRvdy5kb2N1bWVudCkgeyAvLyBvbiBkZXZpY2Vcblx0XHRcdFx0bmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcblx0XHRcdFx0dGhpcy5pc0Nvbm5lY3RlZFRvTmV0d29yayA9IG5hdmlnYXRvci5vbkxpbmU7XG5cdFx0XHRcdHdpbmRvdy5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFxuXHRcdFx0XHRcdCdvbmxpbmUnLFxuXHRcdFx0XHRcdCgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCd1c2VyIG9ubGluZScpO1xuXHRcdFx0XHRcdFx0dGhpcy5pc0Nvbm5lY3RlZFRvTmV0d29yayA9IHRydWU7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRmYWxzZSk7XG5cdFx0XHRcdHdpbmRvdy5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFxuXHRcdFx0XHRcdCdvZmZsaW5lJyxcblx0XHRcdFx0XHQoKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygndXNlciBvZmZsaW5lJyk7XG5cdFx0XHRcdFx0XHR0aGlzLmlzQ29ubmVjdGVkVG9OZXR3b3JrID0gZmFsc2U7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRmYWxzZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRnZXREYXRhKHJlcTogc3RyaW5nKTogbmcuSVByb21pc2U8YW55PiB7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cblx0XHRpZiAodGhpcy5oYXNOZXR3b3JrQ29ubmVjdGlvbigpKSB7XG5cdFx0XHRkZWYucmVzb2x2ZSh0aGlzLm5ldFNlcnZpY2UuZ2V0RGF0YShyZXEpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc29sZS5sb2coJ1NlcnZlciB1bmF2YWlsYWJsZScpO1xuXHRcdFx0Ly8gdGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ25vTmV0d29yaycpO1xuXHRcdFx0ZGVmLnJlamVjdCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdHBvc3REYXRhKHJlcTogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IG5nLklSZXF1ZXN0U2hvcnRjdXRDb25maWcpOiBuZy5JUHJvbWlzZTxhbnk+IHtcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblxuXHRcdHZhciByZXNwb25zZTogbmcuSVByb21pc2U8YW55PiA9IHRoaXMubmV0U2VydmljZS5wb3N0RGF0YShyZXEsIGRhdGEsIGNvbmZpZyk7XG5cblx0XHRpZiAodGhpcy5oYXNOZXR3b3JrQ29ubmVjdGlvbigpKSB7XG5cdFx0XHRyZXNwb25zZS50aGVuKFxuXHRcdFx0KGh0dHBSZXNwb25zZSkgPT4ge1xuXHRcdFx0XHRkZWYucmVzb2x2ZShodHRwUmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XG5cdFx0XHRcdC8vIGJyb2FkY2FzdCBzZXJ2ZXIgaXMgdW5hdmFpbGFibGVcblx0XHRcdFx0dGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3NlcnZlck5vdEF2YWlsYWJsZScpO1xuXHRcdFx0XHRkZWYucmVqZWN0KCk7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZGVmLnJlamVjdCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGRlbGV0ZURhdGEocmVxOiBzdHJpbmcpOiBuZy5JUHJvbWlzZTxhbnk+IHtcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblxuXHRcdGlmICh0aGlzLmhhc05ldHdvcmtDb25uZWN0aW9uKCkpIHtcblx0XHRcdGRlZi5yZXNvbHZlKHRoaXMubmV0U2VydmljZS5kZWxldGVEYXRhKHJlcSkpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zb2xlLmxvZygnU2VydmVyIHVuYXZhaWxhYmxlJyk7XG5cdFx0XHRkZWYucmVqZWN0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0aGFzTmV0d29ya0Nvbm5lY3Rpb24oKTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIChuYXZpZ2F0b3Iub25MaW5lIHx8IHRoaXMuaXNDb25uZWN0ZWRUb05ldHdvcmspO1xuXHR9XG5cblxuXHQvLyBUT0RPOiByZW1vdmUgdGhpcyB0ZW1wIG1ldGhvZCBhbmQgdXNlIGdlbmVyaWNzXG5cdGFkZE1ldGFJbmZvKHJlcXVlc3REYXRhOiBhbnkpOiBhbnkge1xuXHRcdHZhciBkZXZpY2U6IElvbmljLklEZXZpY2UgPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKVxuXHRcdHZhciBtb2RlbDogc3RyaW5nID0gJyc7XG5cdFx0dmFyIG9zVHlwZTogc3RyaW5nID0gJyc7XG5cdFx0dmFyIG9zVmVyc2lvbjogc3RyaW5nID0gJyc7XG5cdFx0dmFyIGRldmljZVRva2VuOiBzdHJpbmcgPSAnJztcblx0XHRpZiAoZGV2aWNlKSB7XG5cdFx0XHRtb2RlbCA9IGlvbmljLlBsYXRmb3JtLmRldmljZSgpLm1vZGVsO1xuXHRcdFx0b3NUeXBlID0gaW9uaWMuUGxhdGZvcm0uZGV2aWNlKCkucGxhdGZvcm07XG5cdFx0XHRvc1ZlcnNpb24gPSBpb25pYy5QbGF0Zm9ybS5kZXZpY2UoKS52ZXJzaW9uO1xuXHRcdH1cblx0XHR2YXIgbWV0YUluZm8gPSB7XG5cdFx0XHQnY2hhbm5lbElkZW50aWZpZXInOiAnTU9CJyxcblx0XHRcdCdkYXRlVGltZVN0YW1wJzogbmV3IERhdGUoKS5nZXRUaW1lKCksXG5cdFx0XHQnb3duZXJDYXJyaWVyQ29kZSc6IHRoaXMuT1dORVJfQ0FSUklFUl9DT0RFLFxuXHRcdFx0J2FkZGl0aW9uYWxJbmZvJzoge1xuXHRcdFx0XHQnZGV2aWNlVHlwZSc6IHdpbmRvdy5pc1RhYmxldCA/ICdUYWJsZXQnIDogJ1Bob25lJyxcblx0XHRcdFx0J21vZGVsJzogbW9kZWwsXG5cdFx0XHRcdCdvc1R5cGUnOiBvc1R5cGUsXG5cdFx0XHRcdCdvc1ZlcnNpb24nOiBvc1ZlcnNpb24sXG5cdFx0XHRcdCdkZXZpY2VUb2tlbic6IGRldmljZVRva2VuLFxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHR2YXIgcmVxdWVzdE9iaiA9IHtcblx0XHRcdCdtZXRhSW5mbyc6IG1ldGFJbmZvLFxuXHRcdFx0J3JlcXVlc3REYXRhJzogcmVxdWVzdERhdGFcblx0XHR9O1xuXHRcdHJldHVybiByZXF1ZXN0T2JqO1xuXHR9XG5cblx0cHJpdmF0ZSBpc0xvZ291dFNlcnZpY2UocmVxdWVzdFVybDogc3RyaW5nKTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIGRhdGFwcm92aWRlci5TRVJWSUNFX1VSTF9MT0dPVVQgPT0gcmVxdWVzdFVybDtcblx0fVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9jb21tb24vc2VydmljZXMvRGF0YVByb3ZpZGVyU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHNcIiAvPlxuXG5jbGFzcyBVc2VyU2VydmljZSB7XG5cdHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnRGF0YVByb3ZpZGVyU2VydmljZScsICckcScsICdMb2NhbFN0b3JhZ2VTZXJ2aWNlJywgJyR3aW5kb3cnXTtcblx0cHVibGljIHVzZXJQcm9maWxlOiBhbnk7XG5cdHB1YmxpYyBfdXNlcjogYm9vbGVhbiA9IGZhbHNlO1xuXHRwcml2YXRlIG1lbnVBY2Nlc3MgPSBbXTtcblx0cHJpdmF0ZSBkZWZhdWx0UGFnZTogc3RyaW5nO1xuXHRjb25zdHJ1Y3Rvcihwcml2YXRlIGRhdGFQcm92aWRlclNlcnZpY2U6IERhdGFQcm92aWRlclNlcnZpY2UsIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSwgcHJpdmF0ZSBsb2NhbFN0b3JhZ2VTZXJ2aWNlOiBMb2NhbFN0b3JhZ2VTZXJ2aWNlLCBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlKSB7XG5cblx0fVxuXG5cdHNldFVzZXIodXNlcikge1xuXHRcdGlmICh0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlKSB7XG5cdFx0XHR0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInLCBKU09OLnN0cmluZ2lmeSh1c2VyKSk7XG5cdFx0fVxuXHR9XG5cblx0bG9nb3V0KCkge1xuXHRcdHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5zZXRPYmplY3QoJ3JhcGlkTW9iaWxlLnVzZXInLCBudWxsKTtcblx0XHR0aGlzLmxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0T2JqZWN0KCd1c2VyUGVybWlzc2lvbk1lbnUnLCBbXSk7XG5cdFx0dGhpcy5fdXNlciA9IGZhbHNlO1xuXHR9XG5cblx0aXNMb2dnZWRJbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fdXNlciA/IHRydWUgOiBmYWxzZTtcblx0fVxuXG5cdGlzVXNlckxvZ2dlZEluKCk6IGJvb2xlYW4ge1xuXHRcdGlmICh0aGlzLmxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0T2JqZWN0KCdyYXBpZE1vYmlsZS51c2VyJywgJycpICE9IG51bGwpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG5cblx0Z2V0VXNlcigpIHtcblx0XHRyZXR1cm4gdGhpcy5fdXNlcjtcblx0fVxuXG5cdGxvZ2luKF91c2VyTmFtZTogc3RyaW5nLCBfcGFzc3dvcmQ6IHN0cmluZykge1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3VzZXIvbG9naW4nO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHZhciByZXF1ZXN0T2JqID0ge1xuXHRcdFx0dXNlcklkOiBfdXNlck5hbWUsXG5cdFx0XHRwYXNzd29yZDogX3Bhc3N3b3JkXG5cdFx0fVxuXHRcdHRoaXMuc2V0VXNlcih7IHVzZXJuYW1lOiBcIlwiIH0pO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXF1ZXN0T2JqKS50aGVuKFxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHR0aGlzLl91c2VyID0gdHJ1ZTtcblx0XHRcdFx0XHRkZWYucmVzb2x2ZShyZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRkZWYucmVqZWN0KHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkIG9uIGxvZyBpbicpO1xuXHRcdFx0XHRkZWYucmVqZWN0KGVycm9yKTtcblx0XHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0Z2V0VXNlclByb2ZpbGUocmVxZGF0YSkge1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3VzZXIvdXNlcnByb2ZpbGUnO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHR0aGlzLnVzZXJQcm9maWxlID0gcmVzcG9uc2UuZGF0YS5yZXNwb25zZS5kYXRhO1xuXHRcdFx0XHRcdHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5zZXRPYmplY3QoJ3VzZXJQZXJtaXNzaW9uTWVudScsIHRoaXMudXNlclByb2ZpbGUubWVudUFjY2Vzcyk7XG5cdFx0XHRcdFx0dGhpcy5nZXREZWZhdWx0UGFnZSgpO1xuXHRcdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGRlZi5yZWplY3QocmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQoZXJyb3IpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQgb24gVXNlclByb2ZpbGUnKTtcblx0XHRcdFx0ZGVmLnJlamVjdChlcnJvcik7XG5cdFx0XHR9KTtcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRzaG93RGFzaGJvYXJkKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRcdGlmICh0aGlzLmlzVXNlckxvZ2dlZEluKCkpIHtcblx0XHRcdGlmICh0eXBlb2YgdGhpcy51c2VyUHJvZmlsZSA9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHR2YXIgZGF0YSA9IHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5nZXRPYmplY3QoJ3VzZXJQZXJtaXNzaW9uTWVudScsICcnKTtcblx0XHRcdFx0dGhpcy5tZW51QWNjZXNzID0gZGF0YTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMubWVudUFjY2VzcyA9IHRoaXMudXNlclByb2ZpbGUubWVudUFjY2Vzcztcblx0XHRcdH1cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tZW51QWNjZXNzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmICh0aGlzLm1lbnVBY2Nlc3NbaV0ubWVudU5hbWUgPT0gbmFtZSkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLm1lbnVBY2Nlc3NbaV0ubWVudUFjY2Vzcztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5pc1VzZXJMb2dnZWRJbigpO1xuXHRcdH1cblx0fVxuXG5cdGdldERlZmF1bHRQYWdlKCkge1xuXHRcdHN3aXRjaCh0aGlzLnVzZXJQcm9maWxlLnVzZXJJbmZvLmRlZmF1bHRQYWdlKXtcblx0XHRcdGNhc2UgJ01JUyAtIFBhc3NlbmdlciBGbG93bic6XG5cdFx0XHRcdHRoaXMuZGVmYXVsdFBhZ2UgPSAnYXBwLm1pcy1mbG93bic7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnT3BlcmF0aW9uYWwgLSBQYXNzZW5nZXIgRmxvd24nOlxuXHRcdFx0XHR0aGlzLmRlZmF1bHRQYWdlID0gJ2FwcC5vcGVyYXRpb25hbC1mbG93bic7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0dGhpcy5kZWZhdWx0UGFnZSA9ICdhcHAubWlzLWZsb3duJztcblx0XHR9XG5cdH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vX2xpYnMudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9EYXRhUHJvdmlkZXJTZXJ2aWNlLnRzXCIgLz5cblxuY2xhc3MgT3BlcmF0aW9uYWxTZXJ2aWNlIHtcblxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ0RhdGFQcm92aWRlclNlcnZpY2UnLCAnJHEnXTtcblx0cHJpdmF0ZSBzZXJ2ZXJSZXF1ZXN0OiBudW1iZXI7XG5cblx0Y29uc3RydWN0b3IocHJpdmF0ZSBkYXRhUHJvdmlkZXJTZXJ2aWNlOiBEYXRhUHJvdmlkZXJTZXJ2aWNlLCBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UpIHsgfVxuXG5cdGdldFBheEZsb3duT3BySGVhZGVyKHJlcWRhdGEpOiBhbnkge1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm9wci9wYXhmbG93bm9wcmhlYWRlcic7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcblx0XHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHRcdH0sXG5cdFx0XHQoZXJyb3IpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0Z2V0T3ByRmxpZ2h0UHJvY1N0YXR1cyhyZXFkYXRhKSB7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4Zmxub3ByL2ZsaWdodHByb2Nlc3NpbmdzdGF0dXMnO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0XHR9LFxuXHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG5cdFx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldE9wckZsaWdodENvdW50QnlSZWFzb24ocmVxZGF0YSkge1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm9wci9mbGlnaHRjb3VudGJ5cmVhc29uJztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdFx0fSk7XG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0Z2V0T3ByQ291cG9uQ291bnRCeUV4Y2VwdGlvbihyZXFkYXRhKSB7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4Zmxub3ByL2NvdXBvbmNvdW50YnlleGNlcHRpb24nO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0XHR9LFxuXHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG5cdFx0XHR9KTtcblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblx0XG5cdGdldERyaWxsRG93biAocmVxZGF0YSwgVVJMKXtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gVVJMO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdGlmKCF0aGlzLnNlcnZlclJlcXVlc3Qpe1xuXHRcdFx0dGhpcy5zZXJ2ZXJSZXF1ZXN0ID0gMTtcblx0XHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0XHRcdHRoaXMuc2VydmVyUmVxdWVzdCA9IDA7XG5cdFx0XHR9LFxuXHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHNcIiAvPlxuXG5jbGFzcyBNaXNTZXJ2aWNlIHtcblxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ0RhdGFQcm92aWRlclNlcnZpY2UnLCAnJHEnXTtcblx0cHJpdmF0ZSBzZXJ2ZXJSZXF1ZXN0OiBudW1iZXI7XG5cblx0Y29uc3RydWN0b3IocHJpdmF0ZSBkYXRhUHJvdmlkZXJTZXJ2aWNlOiBEYXRhUHJvdmlkZXJTZXJ2aWNlLCBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UpIHsgfVxuXG5cdGdldE1ldHJpY1NuYXBzaG90IChyZXFkYXRhKXtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvbWV0cmljc25hcHNob3QnO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0dmFyIHJlc3VsdDogYW55ID0gcmVzcG9uc2UuZGF0YTtcblx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0fSxcblx0XHQoZXJyb3IpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXHRnZXRUYXJnZXRWc0FjdHVhbCAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3RhcmdldHZzYWN0dWFsJztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdH0sXG5cdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0Z2V0UmV2ZW51ZUFuYWx5c2lzIChyZXFkYXRhKXtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvcmV2ZW51ZWFuYWx5c2lzJztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdH0sXG5cdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0Z2V0Um91dGVSZXZlbnVlIChyZXFkYXRhKXtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvcm91dGVyZXZlbnVlJztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdH0sXG5cdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0Z2V0U2VjdG9yQ2FycmllckFuYWx5c2lzIChyZXFkYXRhKXtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvc2VjdG9yY2FycmllcmFuYWx5c2lzJztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdH0sXG5cdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0Z2V0UGF4Rmxvd25NaXNIZWFkZXIgKHJlcWRhdGEpOiBhbnkge1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3BheGZsbm1pcy9wYXhmbG93bm1pc2hlYWRlcic7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldFJvdXRlUmV2ZW51ZURyaWxsRG93biAocmVxZGF0YSl7XG5cdFx0dmFyIHJlcXVlc3RVcmw6IHN0cmluZyA9ICcvcGF4ZmxubWlzL3JvdXRlcmV2ZW51ZWRyaWxsJztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHQocmVzcG9uc2UpID0+IHtcblx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdH0sXG5cdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG5cblx0Z2V0QmFyRHJpbGxEb3duIChyZXFkYXRhKXtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gJy9wYXhmbG5taXMvbXNwYXhuZXRyZXZkcmlsbCc7XG5cdFx0dmFyIGRlZjogbmcuSURlZmVycmVkPGFueT4gPSB0aGlzLiRxLmRlZmVyKCk7XG5cdFx0dGhpcy5kYXRhUHJvdmlkZXJTZXJ2aWNlLnBvc3REYXRhKHJlcXVlc3RVcmwsIHJlcWRhdGEpLnRoZW4oXG5cdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0ZGVmLnJlc29sdmUocmVzdWx0KTtcblx0XHR9LFxuXHRcdChlcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBkZWYucHJvbWlzZTtcblx0fVxuXG5cdGdldERyaWxsRG93biAocmVxZGF0YSwgVVJMKXtcblx0XHR2YXIgcmVxdWVzdFVybDogc3RyaW5nID0gVVJMO1xuXHRcdHZhciBkZWY6IG5nLklEZWZlcnJlZDxhbnk+ID0gdGhpcy4kcS5kZWZlcigpO1xuXHRcdGlmKCF0aGlzLnNlcnZlclJlcXVlc3Qpe1xuXHRcdFx0dGhpcy5zZXJ2ZXJSZXF1ZXN0ID0gMTtcblx0XHRcdHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5wb3N0RGF0YShyZXF1ZXN0VXJsLCByZXFkYXRhKS50aGVuKFxuXHRcdFx0KHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdHZhciByZXN1bHQ6IGFueSA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRcdGRlZi5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0XHRcdHRoaXMuc2VydmVyUmVxdWVzdCA9IDA7XG5cdFx0XHR9LFxuXHRcdFx0KGVycm9yKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhbiBlcnJvciBvY2N1cmVkJyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHR9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9EYXRhUHJvdmlkZXJTZXJ2aWNlLnRzXCIgLz5cblxuY2xhc3MgU2V0dGluZ1NlcnZpY2Uge1xuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJ0RhdGFQcm92aWRlclNlcnZpY2UnLCAnJHEnXTtcblx0XG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YVByb3ZpZGVyU2VydmljZTogRGF0YVByb3ZpZGVyU2VydmljZSwgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlKSB7IH1cblx0XG5cdHVwZGF0ZUZhdm9yaXRlSW5kKHJlcWRhdGEpOiBhbnkge1xuXHRcdHZhciByZXF1ZXN0VXJsOiBzdHJpbmcgPSAnL3VzZXIvc2F2ZXVzZXJwcm9maWxlJztcblx0XHR2YXIgZGVmOiBuZy5JRGVmZXJyZWQ8YW55PiA9IHRoaXMuJHEuZGVmZXIoKTtcblx0XHR0aGlzLmRhdGFQcm92aWRlclNlcnZpY2UucG9zdERhdGEocmVxdWVzdFVybCwgcmVxZGF0YSkudGhlbihcblx0XHRcdChyZXNwb25zZSkgPT4ge1xuXHRcdFx0XHR2YXIgcmVzdWx0OiBhbnkgPSByZXNwb25zZS5kYXRhO1xuXHRcdFx0XHRkZWYucmVzb2x2ZShyZXN1bHQpO1xuXHRcdFx0fSxcblx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCcpO1xuXHRcdFx0fSk7XG5cblx0XHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdH1cblxuXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3V0aWxzL1V0aWxzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21tb24vc2VydmljZXMvTG9jYWxTdG9yYWdlU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tbW9uL3NlcnZpY2VzL0RhdGFQcm92aWRlclNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbW1vbi9zZXJ2aWNlcy9FcnJvckhhbmRsZXJTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL3VzZXIvc2VydmljZXMvVXNlclNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbXBvbmVudHMvb3BlcmF0aW9uYWwvc2VydmljZXMvT3BlcmF0aW9uYWxTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL3NldHRpbmcvU2V0dGluZ1NlcnZpY2UudHNcIiAvPlxuXG5jbGFzcyBBcHBDb250cm9sbGVyIHtcblxuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzdGF0ZScsICckc2NvcGUnLCAnRGF0YVByb3ZpZGVyU2VydmljZScsICdVc2VyU2VydmljZScsXG5cdFx0JyRpb25pY1BsYXRmb3JtJywgJ0xvY2FsU3RvcmFnZVNlcnZpY2UnLCAnJGlvbmljUG9wdXAnLFxuXHRcdCckaW9uaWNMb2FkaW5nJywgJyRpb25pY0hpc3RvcnknLCAnRXJyb3JIYW5kbGVyU2VydmljZScsICckaW9uaWNQb3BvdmVyJywgJ01pc1NlcnZpY2UnLCAnT3BlcmF0aW9uYWxTZXJ2aWNlJywnU2V0dGluZ1NlcnZpY2UnLCAnJHdpbmRvdycsICckdGltZW91dCddO1xuXG5cdHByaXZhdGUgc2V0dGluZ3BvcG92ZXI6IElvbmljLklQb3BvdmVyO1xuXHRwcml2YXRlIHNob3duR3JvdXA6IG51bWJlcjtcblx0cHJpdmF0ZSBmYXZJdGVtczogYW55ID0gW107XG5cdHByaXZhdGUgbWV0cmljRmF2SXRlbXM6IGFueSA9IFtdO1xuXHRwcml2YXRlIHRhcmdldEJhckZhdkl0ZW1zOiBhbnkgPSBbXTtcblx0cHJpdmF0ZSB0YXJnZXRMaW5lRmF2SXRlbXM6IGFueSA9IFtdO1xuXHRwcml2YXRlIHJvdXRlUmV2RmF2SXRlbXM6IGFueSA9IFtdO1xuXHRwcml2YXRlIHJldmVudWVGYXZJdGVtczogYW55ID0gW107XG5cdHByaXZhdGUgcm91dGVTZWN0b3JGYXZJdGVtczogYW55ID0gW107XG5cblx0cHJpdmF0ZSBGbGlnaHRQcm9jZXNzRmF2SXRlbXM6IGFueSA9IFtdO1xuXHRwcml2YXRlIEZsaWdodENudFByb2Nlc3NGYXZJdGVtczogYW55ID0gW107XG5cdHByaXZhdGUgQ291cG9uQ250RmF2SXRlbXM6IGFueSA9IFtdO1xuXG5cdHByaXZhdGUgZmF2ZW1ldHJpY2FsbDogYm9vbGVhbjtcblx0cHJpdmF0ZSBmYXZldGFyZ2V0YWxsOiBib29sZWFuO1xuXHRwcml2YXRlIGZhdmVyZXZlbnVlYWxsOiBib29sZWFuO1xuXHRwcml2YXRlIGZhdmVzZWN0b3JhbGw6IGJvb2xlYW47XG5cdHByaXZhdGUgZmF2ZVJvdXRlUmV2YWxsOiBib29sZWFuO1xuXHRwcml2YXRlIHNlbGVjdFNldHRpbmc6IHN0cmluZztcblxuXHRwcml2YXRlIGZhdmZsdHByY3NhbGw6IGJvb2xlYW47XG5cdHByaXZhdGUgZmF2Zmx0Y250cHJjc2FsbDogYm9vbGVhbjtcblx0cHJpdmF0ZSBmYXZjb3Vwb25jbnRwcmNzYWxsOiBib29sZWFuO1xuXG5cdGNvbnN0cnVjdG9yKFxuXHRcdHByb3RlY3RlZCAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSxcblx0XHRwcm90ZWN0ZWQgJHNjb3BlOiBuZy5JU2NvcGUsXG5cdFx0cHJvdGVjdGVkIGRhdGFQcm92aWRlclNlcnZpY2U6IERhdGFQcm92aWRlclNlcnZpY2UsXG5cdFx0cHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UsXG5cdFx0cHJpdmF0ZSAkaW9uaWNQbGF0Zm9ybTogSW9uaWMuSVBsYXRmb3JtLFxuXHRcdHByaXZhdGUgbG9jYWxTdG9yYWdlU2VydmljZTogTG9jYWxTdG9yYWdlU2VydmljZSxcblx0XHRwcml2YXRlICRpb25pY1BvcHVwOiBJb25pYy5JUG9wdXAsXG5cdFx0cHJpdmF0ZSAkaW9uaWNMb2FkaW5nOiBJb25pYy5JTG9hZGluZyxcblx0XHRwcml2YXRlICRpb25pY0hpc3Rvcnk6IGFueSxcblx0XHRwcml2YXRlIGVycm9ySGFuZGxlclNlcnZpY2U6IEVycm9ySGFuZGxlclNlcnZpY2UsIFxuXHRcdHByaXZhdGUgJGlvbmljUG9wb3ZlcjogSW9uaWMuSVBvcG92ZXIsXG5cdFx0cHJpdmF0ZSBtaXNTZXJ2aWNlOiBNaXNTZXJ2aWNlLFxuXHRcdHByaXZhdGUgb3B0U2VydmljZTogT3BlcmF0aW9uYWxTZXJ2aWNlLFxuXHRcdHByaXZhdGUgc2V0dGluZ1NlcnZpY2U6IFNldHRpbmdTZXJ2aWNlLFxuXHRcdHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsIFxuXHRcdHByaXZhdGUgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSkge1xuXHRcdFx0XG5cdH1cblx0b3BlblNldHRpbmdzICgkZXZlbnQpIHtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9zZXR0aW5nL3NldHRpbmcuaHRtbCcsIHtcblx0XHRcdHNjb3BlOiB0aGF0LiRzY29wZSxcblx0XHRcdGFuaW1hdGlvbjogJ3NsaWRlLWluLXVwJ1xuXHRcdH0pLnRoZW4oZnVuY3Rpb24oc2V0dGluZ3BvcG92ZXIpIHtcblx0XHRcdHRoYXQuc2V0dGluZ3BvcG92ZXIgPSBzZXR0aW5ncG9wb3Zlcjtcblx0XHR9KTtcblx0XHR0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHR0aGF0LnNldHRpbmdwb3BvdmVyLnNob3coJGV2ZW50KTtcblx0XHRcdGlmKHRoYXQuc2hvd0Rhc2hib2FyZCgnTUlTJykpe1xuXHRcdFx0XHR0aGF0LnNlbGVjdFNldHRpbmcgPSAnZDEnO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHRoYXQuc2VsZWN0U2V0dGluZyA9ICdkMic7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHR9LDMwMClcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2hvd25Hcm91cCA9IDA7XG4gICAgfTtcbiAgICBjbG9zZVNldHRpbmdzKCkge1xuICAgICAgICB0aGlzLnNldHRpbmdwb3BvdmVyLmhpZGUoKTtcbiAgICB9O1xuICAgIHN0b3JlRmF2b3VyaXRlKGNoYXJ0b2JqLCBmYXZTdGF0dXMpe1xuXHRcdHZhciBpbmRleFZhbCA9IF8uZmluZEluZGV4KHRoaXMuZmF2SXRlbXMsIGZ1bmN0aW9uKHJlczogYW55KSB7IHJldHVybiAocmVzID09IGNoYXJ0b2JqKTsgfSk7XG5cdFx0Y29uc29sZS5sb2coY2hhcnRvYmopO1xuXHRcdGNvbnNvbGUubG9nKGZhdlN0YXR1cyk7XG5cdFx0aWYgKGZhdlN0YXR1cykge1xuXHRcdFx0dGhpcy5mYXZJdGVtc1tpbmRleFZhbF0uc3RhdHVzID0gdHJ1ZTtcblx0XHR9ZWxzZXtcblx0XHRcdHRoaXMuZmF2ZW1ldHJpY2FsbCA9IGZhbHNlO1xuXHRcdFx0dGhpcy5mYXZldGFyZ2V0YWxsID0gZmFsc2U7XG5cdFx0XHR0aGlzLmZhdmVyZXZlbnVlYWxsID0gZmFsc2U7XG5cdFx0XHR0aGlzLmZhdmVzZWN0b3JhbGwgPSBmYWxzZTtcblx0XHRcdHRoaXMuZmF2ZVJvdXRlUmV2YWxsID0gZmFsc2U7XG5cblx0XHRcdHRoaXMuZmF2Zmx0cHJjc2FsbCA9IGZhbHNlO1xuXHRcdFx0dGhpcy5mYXZmbHRjbnRwcmNzYWxsID0gZmFsc2U7XG5cdFx0XHR0aGlzLmZhdmNvdXBvbmNudHByY3NhbGwgPSBmYWxzZTtcblx0XHRcdHRoaXMuZmF2SXRlbXNbaW5kZXhWYWxdLnN0YXR1cyA9IGZhbHNlO1xuXHRcdH1cblx0XHRcbiAgICB9XG4gICAgc2VsZWN0RmF2b3VyaXRlKG9iaiwgdHlwZSkge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcbiAgICBcdGFuZ3VsYXIuZm9yRWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICBcdFx0aWYodmFsdWUpe1xuXHQgICAgXHRcdGlmKHZhbHVlLmNoYXJ0SWQpe1xuXHQgICAgXHRcdFx0dmFyIGl0ZW0gPSB7J2NoYXJ0SUQnOiB2YWx1ZS5jaGFydElkLCdjaGFydE5hbWUnOiB2YWx1ZS5jaGFydE5hbWUsICdzdGF0dXMnOiAodmFsdWUuZmF2b3JpdGVJbmQgPT0gJ1knKX07XG5cdFx0ICAgIFx0XHR2YXIgYXZhaWxhYmxlID0gXy5zb21lKHRoYXQuZmF2SXRlbXMsIGZ1bmN0aW9uKHJlczogYW55KSB7IHJldHVybiAocmVzLmNoYXJ0SUQgPT0gdmFsdWUuY2hhcnRJZCAmJiByZXMuY2hhcnROYW1lID09IHZhbHVlLmNoYXJ0TmFtZSk7fSk7XG5cdFx0XHRcdFx0aWYgKCFhdmFpbGFibGUpIHtcblx0XHQgICAgXHRcdFx0dGhhdC5mYXZJdGVtcy5wdXNoKGl0ZW0pO1xuXHRcdCAgICBcdFx0XHRcblx0XHQgICAgXHRcdFx0c3dpdGNoKHR5cGUpe1xuXHRcdFx0XHQgICAgICAgICAgICBjYXNlICdtZXRyaWMnOlxuXHRcdFx0XHQgICAgICAgICAgICAgICAgdGhhdC5tZXRyaWNGYXZJdGVtcy5wdXNoKGl0ZW0pO1xuXHRcdFx0XHQgICAgICAgICAgICBicmVhaztcblx0XHRcdFx0ICAgICAgICAgICAgY2FzZSAndGFyZ2V0MSc6XG5cdFx0XHRcdCAgICAgICAgICAgICAgICB0aGF0LnRhcmdldEJhckZhdkl0ZW1zLnB1c2goaXRlbSk7XG5cdFx0XHRcdCAgICAgICAgICAgIGJyZWFrO1xuXHRcdFx0XHQgICAgICAgICAgICBjYXNlICd0YXJnZXQyJzpcblx0XHRcdFx0ICAgICAgICAgICAgICAgIHRoYXQudGFyZ2V0TGluZUZhdkl0ZW1zLnB1c2goaXRlbSk7XG5cdFx0XHRcdCAgICAgICAgICAgIGJyZWFrO1xuXHRcdFx0XHQgICAgICAgICAgICBjYXNlICdyZXZlbnVlJzpcblx0XHRcdFx0ICAgICAgICAgICAgICAgIHRoYXQucmV2ZW51ZUZhdkl0ZW1zLnB1c2goaXRlbSk7XG5cdFx0XHRcdCAgICAgICAgICAgIGJyZWFrO1xuXHRcdFx0XHQgICAgICAgICAgICBjYXNlICdyb3V0ZXJldic6XG5cdFx0XHRcdCAgICAgICAgICAgICAgIHRoYXQucm91dGVSZXZGYXZJdGVtcy5wdXNoKGl0ZW0pO1xuXHRcdFx0XHQgICAgICAgICAgICBicmVhaztcblx0XHRcdFx0ICAgICAgICAgICAgY2FzZSAnc2VjdG9yJzpcblx0XHRcdFx0ICAgICAgICAgICAgXHR0aGF0LnJvdXRlU2VjdG9yRmF2SXRlbXMucHVzaChpdGVtKTtcblx0XHRcdFx0ICAgICAgICAgICAgYnJlYWs7XG5cdFx0XHRcdCAgICAgICAgICAgIGNhc2UgJ2ZsdHByY3MnOlxuXHRcdFx0XHQgICAgICAgICAgICBcdHRoYXQuRmxpZ2h0UHJvY2Vzc0Zhdkl0ZW1zLnB1c2goaXRlbSk7XG5cdFx0XHRcdCAgICAgICAgICAgIGJyZWFrO1xuXHRcdFx0XHQgICAgICAgICAgICBjYXNlICdmbHRjbnRwcmNzJzpcblx0XHRcdFx0ICAgICAgICAgICAgXHR0aGF0LkZsaWdodENudFByb2Nlc3NGYXZJdGVtcy5wdXNoKGl0ZW0pO1xuXHRcdFx0XHQgICAgICAgICAgICBicmVhaztcblx0XHRcdFx0ICAgICAgICAgICAgY2FzZSAnY291cG9uY250cHJjcyc6XG5cdFx0XHRcdCAgICAgICAgICAgIFx0dGhhdC5Db3Vwb25DbnRGYXZJdGVtcy5wdXNoKGl0ZW0pO1xuXHRcdFx0XHQgICAgICAgICAgICBicmVhaztcblx0XHRcdFx0ICAgICAgICB9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG4gICAgXHR9KTtcblx0XHR2YXIgcmVzdWx0O1xuXHRcdHN3aXRjaCh0eXBlKXtcblx0XHRcdGNhc2UgJ21ldHJpYyc6XG5cdFx0XHRyZXN1bHQgPSB0aGF0Lm1ldHJpY0Zhdkl0ZW1zO1xuXHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd0YXJnZXQxJzpcblx0XHRcdHJlc3VsdCA9IHRoYXQudGFyZ2V0QmFyRmF2SXRlbXM7XG5cdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3RhcmdldDInOlxuXHRcdFx0cmVzdWx0ID0gdGhhdC50YXJnZXRMaW5lRmF2SXRlbXM7XG5cdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3JldmVudWUnOlxuXHRcdFx0cmVzdWx0ID0gdGhhdC5yZXZlbnVlRmF2SXRlbXM7XG5cdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3JvdXRlcmV2Jzpcblx0XHRcdHJlc3VsdCA9IHRoYXQucm91dGVSZXZGYXZJdGVtcztcblx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnc2VjdG9yJzpcblx0XHRcdHJlc3VsdCA9IHRoYXQucm91dGVTZWN0b3JGYXZJdGVtcztcblx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnZmx0cHJjcyc6XG5cdFx0XHRyZXN1bHQgPSB0aGF0LkZsaWdodFByb2Nlc3NGYXZJdGVtcztcblx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnZmx0Y250cHJjcyc6XG5cdFx0XHRyZXN1bHQgPSB0aGF0LkZsaWdodENudFByb2Nlc3NGYXZJdGVtcztcblx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnY291cG9uY250cHJjcyc6XG5cdFx0XHRyZXN1bHQgPSB0aGF0LkNvdXBvbkNudEZhdkl0ZW1zO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgc2VsZWN0QWxsKG9iaiwgc3RhdHVzYWxsKSB7XG4gICAgXHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0YW5ndWxhci5mb3JFYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuXHRcdFx0dmFyIGluZGV4VmFsID0gXy5maW5kSW5kZXgodGhhdC5mYXZJdGVtcywgZnVuY3Rpb24ocmVzOiBhbnkpIHsgcmV0dXJuIChyZXMuY2hhcnRJRCA9PSB2YWx1ZS5jaGFydElkICYmIHJlcy5jaGFydE5hbWUgPT0gdmFsdWUuY2hhcnROYW1lKTsgfSk7XG5cdFx0XHRpZiAoaW5kZXhWYWwgPiAwKSB7XG5cdFx0XHRcdGlmIChzdGF0dXNhbGwpIHtcblx0XHRcdFx0XHR0aGF0LmZhdkl0ZW1zW2luZGV4VmFsXS5zdGF0dXMgPSB0cnVlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoYXQuZmF2SXRlbXNbaW5kZXhWYWxdLnN0YXR1cyA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG4gICAgXHR9KTtcbiAgICB9XG4gICAgY2hhbmdlU2V0dGluZyAoKXtcbiAgICBcdHRoaXMuZmF2SXRlbXMgPSBbXTtcblx0XHR0aGlzLm1ldHJpY0Zhdkl0ZW1zID0gW107XG5cdFx0dGhpcy50YXJnZXRCYXJGYXZJdGVtcyA9IFtdO1xuXHRcdHRoaXMudGFyZ2V0TGluZUZhdkl0ZW1zID0gW107XG5cdFx0dGhpcy5yZXZlbnVlRmF2SXRlbXMgPSBbXTtcblx0XHR0aGlzLnJvdXRlUmV2RmF2SXRlbXMgPSBbXTtcblx0XHR0aGlzLnJvdXRlU2VjdG9yRmF2SXRlbXMgPSBbXTtcblx0XHR0aGlzLkZsaWdodFByb2Nlc3NGYXZJdGVtcyA9IFtdO1xuXHRcdHRoaXMuRmxpZ2h0Q250UHJvY2Vzc0Zhdkl0ZW1zID0gW107XG5cdFx0dGhpcy5Db3Vwb25DbnRGYXZJdGVtcyA9IFtdO1xuICAgIH1cbiAgICBzYXZlRmF2b3VyaXRlKCl7XG5cdFx0Y29uc29sZS5sb2codGhpcy5mYXZJdGVtcyk7XG5cdFx0dmFyIHNlY3Rpb25BY2Nlc3MgPSBbXTtcblx0XHRhbmd1bGFyLmZvckVhY2godGhpcy5mYXZJdGVtcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuXHRcdFx0dmFyIGNoYXJ0T2JqID0ge1xuXHRcdFx0XCJjaGFydElkXCI6IHZhbHVlLmNoYXJ0SUQsXG5cdFx0XHRcImNoYXJ0TmFtZVwiOiB2YWx1ZS5jaGFydE5hbWUsXG5cdFx0XHRcImNoYXJ0UG9zXCI6IDAsXG5cdFx0XHRcImNoYXJ0QWNjZXNzXCI6IHZhbHVlLnN0YXR1c1xuXHRcdFx0fVxuXHRcdFx0c2VjdGlvbkFjY2Vzcy5wdXNoKGNoYXJ0T2JqKTtcbiAgICBcdH0pO1xuXHRcdFxuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR2YXIgcmVxdWVzdE9iaiA9IHtcblx0XHRcdFwidXNlcklkXCI6IHRoYXQuZ2V0UHJvZmlsZVVzZXJOYW1lKCksXG5cdFx0XHRcInVzZXJJbmZvXCI6IHtcblx0XHRcdCAgXCJ1c2VyTmFtZVwiOiB0aGF0LmdldFByb2ZpbGVVc2VyTmFtZSgpLFxuXHRcdFx0ICBcImFtb3VudFwiOiBcIlwiLFxuXHRcdFx0ICBcInRoZW1lXCI6IFwiXCIsXG5cdFx0XHQgIFwibGFuZ3VhZ2VcIjogXCJcIixcblx0XHRcdCAgXCJkZWZhdWx0UGFnZVwiOiBcIlwiLFxuXHRcdFx0ICBcInJvd3NQZXJQYWdlXCI6IDBcblx0XHRcdH0sXG5cdFx0XHRcInVzZXJQcm9maWxlU2V0dGluZ3NcIjogW1xuXHRcdFx0ICB7XG5cdFx0XHRcdFwiZGFzaEJvYXJkSWRcIjogXCJcIixcblx0XHRcdFx0XCJkYXNoQm9hcmRBY2Nlc3NcIjogW1xuXHRcdFx0XHQgIHtcblx0XHRcdFx0XHRcInNlY3Rpb25JZFwiOiBcIlwiLFxuXHRcdFx0XHRcdFwic2VjdGlvbk5hbWVcIjogXCJcIixcblx0XHRcdFx0XHRcInNlY3Rpb25Qb3NcIjogMCxcblx0XHRcdFx0XHRcInNlbGVjdEFsbFwiOiB0cnVlLFxuXHRcdFx0XHRcdFwic2VjdGlvbkFjY2Vzc0ZsYWdcIjogdHJ1ZSxcblx0XHRcdFx0XHRcInNlY3Rpb25BY2Nlc3NcIjogc2VjdGlvbkFjY2Vzc1xuXHRcdFx0XHQgIH1cblx0XHRcdFx0XVxuXHRcdFx0ICB9XG5cdFx0XHRdXG5cdFx0ICB9O1xuXHRcdHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuICAgICAgICB0aGlzLnNldHRpbmdTZXJ2aWNlLnVwZGF0ZUZhdm9yaXRlSW5kKHJlcXVlc3RPYmopXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdGlmKGRhdGEucmVzcG9uc2Uuc3RhdHVzID09PSBcInN1Y2Nlc3NcIil7XG5cdFx0XHRcdC8vIHRoYXQuc2V0dGluZ3BvcG92ZXIuaGlkZSgpO1xuXHRcdFx0XHR0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcblx0XHRcdFx0XHR0aXRsZTogJ1N1Y2VzcycsXG5cdFx0XHRcdFx0Y29udGVudDogJ1VwZGF0ZWQgc3VjY2Vzc2Z1bGx5ISEhJ1xuXHRcdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlcykge1x0fSk7XG5cdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1x0XHRcdFx0ICBcblx0XHRcdH1cbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgdG9nZ2xlR3JvdXAgKGdyb3VwKSB7XG4gICAgICAgIGlmICh0aGlzLmlzR3JvdXBTaG93bihncm91cCkpIHtcbiAgICAgICAgICAgIHRoaXMuc2hvd25Hcm91cCA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNob3duR3JvdXAgPSBncm91cDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpc0dyb3VwU2hvd24oZ3JvdXA6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gdGhpcy5zaG93bkdyb3VwID09IGdyb3VwO1xuICAgIH1cblxuXHRpc05vdEVtcHR5KHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gVXRpbHMuaXNOb3RFbXB0eSh2YWx1ZSk7XG5cdH1cblxuXHRwdWJsaWMgaGFzTmV0d29ya0Nvbm5lY3Rpb24oKTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIHRoaXMuZGF0YVByb3ZpZGVyU2VydmljZS5oYXNOZXR3b3JrQ29ubmVjdGlvbigpO1xuXHR9XG5cblx0bG9nb3V0KCkge1xuXHRcdHRoaXMuJGlvbmljSGlzdG9yeS5jbGVhckNhY2hlKCk7XG5cdFx0dGhpcy51c2VyU2VydmljZS5sb2dvdXQoKTtcblx0XHR0aGlzLiRzdGF0ZS5nbyhcImxvZ2luXCIpO1xuXHR9XG5cblx0Z2V0VXNlckRlZmF1bHRQYWdlKCkge1xuXHRcdHJldHVybiB0aGlzLnVzZXJTZXJ2aWNlLnVzZXJQcm9maWxlLnVzZXJJbmZvLmRlZmF1bHRQYWdlO1xuXHR9XG5cblx0c2hvd0Rhc2hib2FyZChuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gdGhpcy51c2VyU2VydmljZS5zaG93RGFzaGJvYXJkKG5hbWUpO1xuXHR9XG5cdFxuXHRpb25pY0xvYWRpbmdTaG93KCkge1xuICAgICAgICB0aGlzLiRpb25pY0xvYWRpbmcuc2hvdyh7XG4gICAgICAgICAgICB0ZW1wbGF0ZTogJzxpb24tc3Bpbm5lciBjbGFzcz1cInNwaW5uZXItY2FsbVwiPjwvaW9uLXNwaW5uZXI+J1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgaW9uaWNMb2FkaW5nSGlkZSgpIHtcbiAgICAgICAgdGhpcy4kaW9uaWNMb2FkaW5nLmhpZGUoKTtcbiAgICB9O1xuXHRcblx0Z2V0UHJvZmlsZVVzZXJOYW1lKCk6IHN0cmluZyB7XG5cdFx0aWYgKHRoaXMudXNlclNlcnZpY2UuaXNVc2VyTG9nZ2VkSW4oKSkge1xuXHRcdCAgdmFyIG9iaiA9IHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicpO1xuXHRcdCAgaWYgKG9iaiAhPSAnbnVsbCcpIHtcblx0XHRcdHZhciBwcm9maWxlVXNlck5hbWUgPSBKU09OLnBhcnNlKG9iaik7XG5cdFx0XHRyZXR1cm4gcHJvZmlsZVVzZXJOYW1lLnVzZXJuYW1lO1xuXHRcdCAgfVxuXHRcdH1cblx0fVxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XG5cbmNsYXNzIENoYXJ0b3B0aW9uU2VydmljZSB7XG5cbiAgICBwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRyb290U2NvcGUnXTtcblxuICAgIGNvbnN0cnVjdG9yKCRyb290U2NvcGU6IG5nLklTY29wZSkgeyB9XG5cbiAgICBsaW5lQ2hhcnRPcHRpb25zKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY2hhcnQ6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnbGluZUNoYXJ0JyxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcbiAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XG4gICAgICAgICAgICAgICAgICAgIHRvcDogNSxcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDUwLFxuICAgICAgICAgICAgICAgICAgICBib3R0b206IDUwLFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiA1MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgeDogZnVuY3Rpb24oZCl7IHJldHVybiBkLnh2YWw7IH0sXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7IHJldHVybiBkLnl2YWw7IH0sXG4gICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgZGlzcGF0Y2g6IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVDaGFuZ2U6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcInN0YXRlQ2hhbmdlXCIpOyB9LFxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VTdGF0ZTogZnVuY3Rpb24oZSl7IGNvbnNvbGUubG9nKFwiY2hhbmdlU3RhdGVcIik7IH0sXG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBTaG93OiBmdW5jdGlvbihlKXsgY29uc29sZS5sb2coXCJ0b29sdGlwU2hvd1wiKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgdG9vbHRpcEhpZGU6IGZ1bmN0aW9uKGUpeyBjb25zb2xlLmxvZyhcInRvb2x0aXBIaWRlXCIpOyB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB4QXhpczoge1xuICAgICAgICAgICAgICAgICAgICB0aWNrRm9ybWF0OiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMudGltZS5mb3JtYXQoJyViJykobmV3IERhdGUoZCkpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHlBeGlzOiB7XG4gICAgICAgICAgICAgICAgICAgIGF4aXNMYWJlbDogJycsXG4gICAgICAgICAgICAgICAgICAgIHRpY2tGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLjAyZicpKGQpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBheGlzTGFiZWxEaXN0YW5jZTogLTEwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9OyAgXG4gICAgfVxuXG4gICAgbXVsdGlCYXJDaGFydE9wdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjaGFydDoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdtdWx0aUJhckNoYXJ0JyxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI1MCxcbiAgICAgICAgICAgICAgICB3aWR0aDogMzAwLFxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAxMCxcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDI1LFxuICAgICAgICAgICAgICAgICAgICBib3R0b206IDMwLFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiAyNVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2hvd0xlZ2VuZCA6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpe3JldHVybiBkLmxhYmVsO30sXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWUgKyAoMWUtMTApO30sXG4gICAgICAgICAgICAgICAgc2hvd1ZhbHVlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICByZWR1Y2VYVGlja3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dDb250cm9sczogZmFsc2UsXG4gICAgICAgICAgICAgICAgdmFsdWVGb3JtYXQ6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLC40ZicpKGQpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgeEF4aXM6IHtcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsRGlzdGFuY2U6IDMwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaG93WUF4aXM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dYQXhpczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNzAwXG4gICAgICAgICAgICB9XG4gICAgICAgIH07ICBcbiAgICB9XG5cbiAgICBtZXRyaWNCYXJDaGFydE9wdGlvbnMobWlzQ3RybCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY2hhcnQ6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY3JldGVCYXJDaGFydCcsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAyMDAsXG4gICAgICAgICAgICAgICAgbWFyZ2luIDoge1xuICAgICAgICAgICAgICAgICAgICB0b3A6IDIwLFxuICAgICAgICAgICAgICAgICAgICByaWdodDogMjUsXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogMCxcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMjVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpe3JldHVybiBkLmxhYmVsO30sXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQudmFsdWV9LFxuICAgICAgICAgICAgICAgIHVzZUludGVyYWN0aXZlR3VpZGVsaW5lOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dWYWx1ZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsdWVGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuZm9ybWF0KCcsLjJmJykoZCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB0b29sdGlwOiB7XG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNob3dZQXhpczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd1hBeGlzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNzAwXG4gICAgICAgICAgICB9XG4gICAgICAgIH07ICBcbiAgICB9XG5cbiAgICB0YXJnZXRCYXJDaGFydE9wdGlvbnMobWlzQ3RybCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY2hhcnQ6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY3JldGVCYXJDaGFydCcsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAyNTAsXG4gICAgICAgICAgICAgICAgbWFyZ2luIDoge1xuICAgICAgICAgICAgICAgICAgICB0b3A6IDIwLFxuICAgICAgICAgICAgICAgICAgICByaWdodDogNTAsXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogMjAsXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDc1XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB1c2VJbnRlcmFjdGl2ZUd1aWRlbGluZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXtyZXR1cm4gZC5sYWJlbDt9LFxuICAgICAgICAgICAgICAgIHk6IGZ1bmN0aW9uKGQpe3JldHVybiBkLnZhbHVlICsgKDFlLTEwKTt9LFxuICAgICAgICAgICAgICAgIHNob3dWYWx1ZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1lBeGlzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB2YWx1ZUZvcm1hdDogZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJywuMmYnKShkKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA3MDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTsgIFxuICAgIH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9fbGlicy50c1wiIC8+XG5cbmNsYXNzIEZpbHRlcmVkTGlzdFNlcnZpY2Uge1xuXG4gICAgcHVibGljIHN0YXRpYyAkaW5qZWN0ID0gW107XG5cbiAgICBjb25zdHJ1Y3RvcigpIHsgfVxuXG4gICAgc2VhcmNoZWQgKHZhbExpc3RzLCB0b1NlYXJjaCwgbGV2ZWwsIGRyaWxsdHlwZSkge1xuICAgICAgcmV0dXJuIF8uZmlsdGVyKHZhbExpc3RzLCBcbiAgICAgICAgZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgICAvKiBTZWFyY2ggVGV4dCBpbiBhbGwgMyBmaWVsZHMgKi9cbiAgICAgICAgICByZXR1cm4gc2VhcmNoVXRpbChpLCB0b1NlYXJjaCwgbGV2ZWwsIGRyaWxsdHlwZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHBhZ2VkICh2YWxMaXN0cyxwYWdlU2l6ZSkge1xuICAgICAgdmFyIHJldFZhbCA9IFtdO1xuICAgICAgaWYodmFsTGlzdHMpe1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbExpc3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGkgJSBwYWdlU2l6ZSA9PT0gMCkge1xuICAgICAgICAgICAgcmV0VmFsW01hdGguZmxvb3IoaSAvIHBhZ2VTaXplKV0gPSBbdmFsTGlzdHNbaV1dO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXRWYWxbTWF0aC5mbG9vcihpIC8gcGFnZVNpemUpXS5wdXNoKHZhbExpc3RzW2ldKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXRWYWw7XG4gICAgfVxuXG4gICBcbn1cbmZ1bmN0aW9uIHNlYXJjaFV0aWwoaXRlbSwgdG9TZWFyY2gsIGxldmVsLCBkcmlsbHR5cGUpIHtcbiAgICAvKiBTZWFyY2ggVGV4dCBpbiBhbGwgMyBmaWVsZHMgKi9cbiAgaWYoZHJpbGx0eXBlID09ICdyb3V0ZScpIHtcbiAgICBpZihpdGVtLmNvdW50cnlGcm9tICYmIGl0ZW0uY291bnRyeVRvICYmIGxldmVsID09IDApIHtcbiAgICAgIHJldHVybiAoaXRlbS5jb3VudHJ5RnJvbS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSB8fCBpdGVtLmNvdW50cnlUby50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSBpZihpdGVtLmZsb3duU2VjdG9yICYmIGxldmVsID09IDEpIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbG93blNlY3Rvci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmKGl0ZW0uZmxpZ2h0TnVtYmVyICYmIGxldmVsID09IDIpIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHROdW1iZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSBpZihpdGVtWydkb2N1bWVudCMnXSAmJiBsZXZlbCA9PSAzKSB7XG4gICAgICByZXR1cm4gKGl0ZW1bJ2RvY3VtZW50IyddLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmKGRyaWxsdHlwZSA9PSAndGFyZ2V0Jykge1xuICAgIGlmKGl0ZW0ucm91dGV0eXBlICYmIGxldmVsID09IDApIHtcbiAgICAgIHJldHVybiAoaXRlbS5yb3V0ZXR5cGUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9ZWxzZSBpZihpdGVtLnJvdXRlY29kZSAmJiBsZXZlbCA9PSAxKSB7XG4gICAgICByZXR1cm4gKGl0ZW0ucm91dGVjb2RlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZihkcmlsbHR5cGUgPT0gJ2JhcicpIHtcbiAgICBpZihpdGVtLnJvdXRlQ29kZSAmJiBsZXZlbCA9PSAwKSB7XG4gICAgICByZXR1cm4gKGl0ZW0ucm91dGVDb2RlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfWVsc2UgaWYoaXRlbS5mbG93blNlY3RvciAmJiBsZXZlbCA9PSAxKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9ZWxzZSBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAyKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZihkcmlsbHR5cGUgPT0gJ2ZsaWdodC1wcm9jZXNzJykge1xuICAgIGlmKGl0ZW0uY291bnRyeUZyb20gJiYgaXRlbS5jb3VudHJ5VG8gJiYgbGV2ZWwgPT0gMCkge1xuICAgICAgcmV0dXJuIChpdGVtLmNvdW50cnlGcm9tLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xIHx8IGl0ZW0uY291bnRyeVRvLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfWVsc2UgaWYoaXRlbS5mbG93blNlY3RvciAmJiBsZXZlbCA9PSAxKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9ZWxzZSBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAyKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfWVsc2UgaWYoaXRlbVsnY2FycmllckNvZGUjJ10gJiYgbGV2ZWwgPT0gMykge1xuICAgICAgcmV0dXJuIChpdGVtWydjYXJyaWVyQ29kZSMnXS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYoZHJpbGx0eXBlID09ICdmbGlnaHQtY291bnQnKSB7XG4gICAgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMCkge1xuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSApID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1lbHNlIGlmKGl0ZW1bJ2NhcnJpZXJDb2RlJ10gJiYgbGV2ZWwgPT0gMSkge1xuICAgICAgcmV0dXJuIChpdGVtWydjYXJyaWVyQ29kZSddLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZihkcmlsbHR5cGUgPT0gJ2NvdXBvbi1jb3VudCcpIHtcbiAgICBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAwKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfWVsc2UgaWYoaXRlbVsnZmxvd25TZWN0b3InXSAmJiBsZXZlbCA9PSAxKSB7XG4gICAgICByZXR1cm4gKGl0ZW1bJ2Zsb3duU2VjdG9yJ10udG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEgKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmKGRyaWxsdHlwZSA9PSAnYW5hbHlzaXMnICkge1xuICAgIGlmKGl0ZW0ucmVnaW9uTmFtZSAmJiBsZXZlbCA9PSAwKSB7XG4gICAgICByZXR1cm4gKGl0ZW0ucmVnaW9uTmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmKGl0ZW0uY291bnRyeUZyb20gJiYgaXRlbS5jb3VudHJ5VG8gJiYgbGV2ZWwgPT0gMSkge1xuICAgICAgcmV0dXJuIChpdGVtLmNvdW50cnlGcm9tLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xIHx8IGl0ZW0uY291bnRyeVRvLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xICkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMikge1xuICAgICAgcmV0dXJuIChpdGVtLmZsb3duU2VjdG9yLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMykge1xuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZihkcmlsbHR5cGUgPT0gJ25ldHdvcmstUmV2ZW51ZScpIHtcbiAgICBpZihpdGVtLlBPU3JlZ2lvbiAmJiBsZXZlbCA9PSAwKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uUE9TcmVnaW9uLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5QT1Njb3VudHJ5ICYmIGxldmVsID09IDEpIHtcbiAgICAgIHJldHVybiAoaXRlbS5QT1Njb3VudHJ5LnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5QT1NjaXR5ICYmIGxldmVsID09IDIpIHtcbiAgICAgIHJldHVybiAoaXRlbS5QT1NjaXR5LnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5kb2N1bWVudFR5cGUgJiYgbGV2ZWwgPT0gMykge1xuICAgICAgcmV0dXJuIChpdGVtLmRvY3VtZW50VHlwZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmKGl0ZW0uc2VjdG9yICYmIGxldmVsID09IDQpIHtcbiAgICAgIHJldHVybiAoaXRlbS5zZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSBpZihpdGVtLmZsaWdodG51bWJlciAmJiBsZXZlbCA9PSA1KSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0bnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmKGRyaWxsdHlwZSA9PSAneWllbGQnKSB7XG4gICAgaWYoaXRlbS5yb3V0ZUNvZGUgJiYgbGV2ZWwgPT0gMCkge1xuICAgICAgcmV0dXJuIChpdGVtLnJvdXRlQ29kZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmKGl0ZW0uZmxvd25TZWN0b3IgJiYgbGV2ZWwgPT0gMSkge1xuICAgICAgcmV0dXJuIChpdGVtLmZsb3duU2VjdG9yLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMikge1xuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmKGl0ZW0uZmxpZ2h0RGF0ZSAmJiBsZXZlbCA9PSAzKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0RGF0ZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZihkcmlsbHR5cGUgPT0gJ3Jwa20nIHx8IGRyaWxsdHlwZSA9PSAnYXNrbScgKSB7XG4gICAgaWYoaXRlbS5haXJjcmFmdHR5cGUgJiYgbGV2ZWwgPT0gMCkge1xuICAgICAgcmV0dXJuIChpdGVtLmFpcmNyYWZ0dHlwZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmKGl0ZW0uYWlyY3JhZnRyZWdubyAmJiBsZXZlbCA9PSAxKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uYWlyY3JhZnRyZWduby50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmKGl0ZW0uYWlyY3JhZnRsZWcgJiYgbGV2ZWwgPT0gMikge1xuICAgICAgcmV0dXJuIChpdGVtLmFpcmNyYWZ0bGVnLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5mbGlnaHROdW1iZXIgJiYgbGV2ZWwgPT0gMykge1xuICAgICAgcmV0dXJuIChpdGVtLmZsaWdodE51bWJlci50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZihkcmlsbHR5cGUgPT0gJ29hbC1jb250Jykge1xuICAgIGlmKGl0ZW0uc2VjdG9yICYmIGxldmVsID09IDApIHtcbiAgICAgIHJldHVybiAoaXRlbS5zZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAxKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5mbGlnaHREYXRlICYmIGxldmVsID09IDIpIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHREYXRlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5kb2N1bWVudFR5cGUgJiYgbGV2ZWwgPT0gMykge1xuICAgICAgcmV0dXJuIChpdGVtLmRvY3VtZW50VHlwZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodG9TZWFyY2gudG9Mb3dlckNhc2UoKSkgPiAtMSkgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZihkcmlsbHR5cGUgPT0gJ3Bhc3Nlbmdlci1jb3VudCcpIHtcbiAgICBpZihpdGVtLnJvdXRlQ29kZSAmJiBsZXZlbCA9PSAwKSB7XG4gICAgICByZXR1cm4gKGl0ZW0ucm91dGVDb2RlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5mbG93blNlY3RvciAmJiBsZXZlbCA9PSAxKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxvd25TZWN0b3IudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRvU2VhcmNoLnRvTG93ZXJDYXNlKCkpID4gLTEpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0gZWxzZSBpZihpdGVtLmZsaWdodE51bWJlciAmJiBsZXZlbCA9PSAyKSB7XG4gICAgICByZXR1cm4gKGl0ZW0uZmxpZ2h0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYoaXRlbS5mbGlnaHREYXRlICYmIGxldmVsID09IDMpIHtcbiAgICAgIHJldHVybiAoaXRlbS5mbGlnaHREYXRlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0b1NlYXJjaC50b0xvd2VyQ2FzZSgpKSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL19saWJzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9DaGFydG9wdGlvblNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbXBvbmVudHMvdXNlci9zZXJ2aWNlcy9Vc2VyU2VydmljZS50c1wiIC8+XG5cblxuXG5pbnRlcmZhY2UgdGFiT2JqZWN0IHtcbiAgICB0aXRsZTogc3RyaW5nLFxuICAgIG5hbWVzOiBzdHJpbmcsXG4gICAgaWNvbjogc3RyaW5nXG59XG5cbmludGVyZmFjZSB0b2dnbGVPYmplY3Qge1xuICAgIG1vbnRoT3JZZWFyOiBzdHJpbmcsXG4gICAgdGFyZ2V0UmV2T3JQYXg6IHN0cmluZyxcbiAgICBzZWN0b3JPcmRlcjogc3RyaW5nLFxuICAgIHNlY3RvclJldk9yUGF4OiBzdHJpbmcsXG4gICAgY2hhcnRPclRhYmxlOiBzdHJpbmcsXG4gICAgdGFyZ2V0Vmlldzogc3RyaW5nLFxuICAgIHJldmVudWVWaWV3OiBzdHJpbmcsXG4gICAgc2VjdG9yVmlldzogc3RyaW5nXG59XG5cbmludGVyZmFjZSBoZWFkZXJPYmplY3Qge1xuICAgIGZsb3duTW9udGg6IHN0cmluZyxcbiAgICBzdXJjaGFyZ2U6IGJvb2xlYW4sXG4gICAgdGFiSW5kZXg6IG51bWJlcixcbiAgICBoZWFkZXJJbmRleDogbnVtYmVyLFxuICAgIHVzZXJuYW1lOiBzdHJpbmdcbn1cblxuY2xhc3MgTWlzQ29udHJvbGxlcntcblxuICAgIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHN0YXRlJywgJyRzY29wZScsICckaW9uaWNMb2FkaW5nJywgJyR0aW1lb3V0JywgJyR3aW5kb3cnLFxuICAgICAgICAnJGZpbHRlcicsICdNaXNTZXJ2aWNlJywgJ0NoYXJ0b3B0aW9uU2VydmljZScsICdGaWx0ZXJlZExpc3RTZXJ2aWNlJywgJ1VzZXJTZXJ2aWNlJywgJyRpb25pY0hpc3RvcnknLCAnUmVwb3J0U3ZjJywgJ0dSQVBIX0NPTE9SUycsICdUQUJTJywgJyRpb25pY1BvcHVwJywgJyRpb25pY1BvcG92ZXInXTtcblxuICAgIHByaXZhdGUgdGFiczogW3RhYk9iamVjdF07XG4gICAgcHJpdmF0ZSB0b2dnbGU6IHRvZ2dsZU9iamVjdDtcbiAgICBwcml2YXRlIGhlYWRlcjogaGVhZGVyT2JqZWN0O1xuICAgIHByaXZhdGUgc3ViSGVhZGVyOiBhbnk7XG4gICAgcHJpdmF0ZSBvcHRpb25zOiBhbnk7XG4gICAgcHJpdmF0ZSBkcmlsbHRhYnM6IHN0cmluZ1tdO1xuICAgIFxuICAgIHByaXZhdGUgcGFnZVNpemUgPSA0O1xuICAgIHByaXZhdGUgY3VycmVudFBhZ2UgPSBbXTtcbiAgICBwcml2YXRlIHNlbGVjdGVkRHJpbGwgPSBbXTtcbiAgICBwcml2YXRlIGdyb3VwcyA9IFtdO1xuXG4gICAgcHJpdmF0ZSBpbmZvcG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XG4gICAgcHJpdmF0ZSBkcmlsbHBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xuICAgIHByaXZhdGUgZ3JhcGhwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcbiAgICBwcml2YXRlIGRyaWxsQmFycG9wb3ZlcjogSW9uaWMuSVBvcG92ZXI7XG5cbiAgICBwcml2YXRlIGluZm9kYXRhOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSByZWdpb25OYW1lOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBjaGFydFR5cGU6IHN0cmluZztcbiAgICBwcml2YXRlIGdyYXBoSW5kZXg6IG51bWJlcjtcbiAgICBwcml2YXRlIGNvbHVtblRvT3JkZXI6IHN0cmluZztcbiAgICBwcml2YXRlIHNob3duR3JvdXA6IG51bWJlcjtcblxuICAgIHByaXZhdGUgbWV0cmljUmVzdWx0OiBhbnk7XG4gICAgcHJpdmF0ZSBtZXRyaWNPcmdSZXN1bHQ6IGFueTtcbiAgICBwcml2YXRlIG1ldHJpY0xlZ2VuZHM6IGFueTtcbiAgICBwcml2YXRlIGZhdk1ldHJpY1Jlc3VsdDogYW55O1xuXG4gICAgcHJpdmF0ZSB0YXJnZXRBY3R1YWxEYXRhOiBhbnk7XG4gICAgcHJpdmF0ZSBmYXZUYXJnZXRCYXJSZXN1bHQ6IGFueTtcbiAgICBwcml2YXRlIGZhdlRhcmdldExpbmVSZXN1bHQ6IGFueTtcblxuICAgIHByaXZhdGUgcm91dGVSZXZEYXRhOiBhbnk7XG5cbiAgICBwcml2YXRlIHJldmVudWVEYXRhOiBhbnk7XG4gICAgcHJpdmF0ZSBTZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHM6IGFueTtcbiAgICBwcml2YXRlIHBvcG92ZXJzaG93bjogYm9vbGVhbjtcbiAgICBwcml2YXRlIGRyaWxsVHlwZTogc3RyaW5nO1xuICAgIHByaXZhdGUgZHJpbGxCYXJMYWJlbDogc3RyaW5nO1xuICAgIHByaXZhdGUgZHJpbGxOYW1lOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBmaXJzdENvbHVtbnM6IHN0cmluZ1tdO1xuICAgIFxuICAgIHByaXZhdGUgdGhhdDogYW55O1xuXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSwgcHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSxcbiAgICAgICAgcHJpdmF0ZSAkaW9uaWNMb2FkaW5nOiBJb25pYy5JTG9hZGluZywgcHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLFxuICAgICAgICBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxuICAgICAgICBwcml2YXRlICRmaWx0ZXI6IG5nLklGaWx0ZXJTZXJ2aWNlLCBwcml2YXRlIG1pc1NlcnZpY2U6IE1pc1NlcnZpY2UsXG4gICAgICAgIHByaXZhdGUgY2hhcnRvcHRpb25TZXJ2aWNlOiBDaGFydG9wdGlvblNlcnZpY2UsIHByaXZhdGUgZmlsdGVyZWRMaXN0U2VydmljZTogRmlsdGVyZWRMaXN0U2VydmljZSxcbiAgICAgICAgcHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UsIHByaXZhdGUgJGlvbmljSGlzdG9yeTogYW55LCBwcml2YXRlIHJlcG9ydFN2YzogUmVwb3J0U3ZjLCBwcml2YXRlIEdSQVBIX0NPTE9SUzogc3RyaW5nLCBwcml2YXRlIFRBQlM6IHN0cmluZywgcHJpdmF0ZSAkaW9uaWNQb3B1cDogSW9uaWMuSVBvcHVwLCBwcml2YXRlICRpb25pY1BvcG92ZXI6IElvbmljLklQb3BvdmVyKSB7XG5cbiAgICAgICAgICAgIHRoaXMudGhhdCA9IHRoaXM7XG5cbiAgICAgICAgICAgIHRoaXMudGFicyA9IHRoaXMuVEFCUy5EQjFfVEFCUztcblxuICAgICAgICAgICAgdGhpcy50b2dnbGUgPSB7XG4gICAgICAgICAgICAgICAgbW9udGhPclllYXIgOiAnbW9udGgnLFxuICAgICAgICAgICAgICAgIHRhcmdldFJldk9yUGF4OiAncmV2ZW51ZScsXG4gICAgICAgICAgICAgICAgc2VjdG9yT3JkZXI6ICd0b3A1JyxcbiAgICAgICAgICAgICAgICBzZWN0b3JSZXZPclBheDogJ3JldmVudWUnLFxuICAgICAgICAgICAgICAgIGNoYXJ0T3JUYWJsZTogJ2NoYXJ0JyxcbiAgICAgICAgICAgICAgICB0YXJnZXRWaWV3OiAnY2hhcnQnLFxuICAgICAgICAgICAgICAgIHJldmVudWVWaWV3OiAnY2hhcnQnLFxuICAgICAgICAgICAgICAgIHNlY3RvclZpZXc6ICdjaGFydCdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaGVhZGVyID0ge1xuICAgICAgICAgICAgICAgIGZsb3duTW9udGg6ICcnLFxuICAgICAgICAgICAgICAgIHN1cmNoYXJnZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgdGFiSW5kZXg6IDAsXG4gICAgICAgICAgICAgICAgaGVhZGVySW5kZXg6IDAsXG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6ICcnXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZSkgeyBcblx0XHRcdFx0dGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjb250cm9sbGVyJywgJ01JUycpO1xuXHRcdFx0fVxuXHRcdFx0XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQod2luZG93KS5iaW5kKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMub3JpZW50YXRpb25DaGFuZ2UpOyBcbiAgICAgICAgXG4gICAgICAgICAgICAvL3RoaXMuJHNjb3BlLiR3YXRjaCgnTWlzQ3RybC5oZWFkZXIuc3VyY2hhcmdlJywgKCkgPT4geyB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDp0aGlzLmhlYWRlci50YWJJbmRleH0pOyB9LCB0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuaW5pdERhdGEoKTtcblxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCdvbk1JU1NsaWRlTW92ZScsIChldmVudDogYW55LCByZXNwb25zZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYodGhpcy4kc3RhdGUuY3VycmVudC5uYW1lID09ICdhcHAubWlzLWZsb3duJyl7XG4gICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9uU2xpZGVNb3ZlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRvbignJGlvbmljVmlldy5lbnRlcicsICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXNlbGYudXNlclNlcnZpY2Uuc2hvd0Rhc2hib2FyZCgnTUlTJykpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kc3RhdGUuZ28oXCJsb2dpblwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCdvcGVuRHJpbGxQb3B1cCcsIChldmVudDogYW55LCByZXNwb25zZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ21ldHJpYycpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICBpZihyZXNwb25zZS5uYW1lPT1cIk5ldHdvcmsgUmV2ZW51ZVwiKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdJbiBuZXR3b3JrIHJldmVuZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuTWlzQ3RybC5vcGVuTmV0d29ya1JldmVudWVEcmlsbERvd25Qb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XG4gICAgICAgICAgICAgICAgICAgIH1lbHNlIGlmKHJlc3BvbnNlLm5hbWU9PVwiWWllbGRcIil7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9wZW5ZaWVsZERyaWxsRG93blBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcbiAgICAgICAgICAgICAgICAgICAgfWVsc2UgaWYocmVzcG9uc2UubmFtZT09XCJSUEtNXCIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuTWlzQ3RybC5vcGVuUlBLTURyaWxsRG93blBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcbiAgICAgICAgICAgICAgICAgICAgfWVsc2UgaWYocmVzcG9uc2UubmFtZT09XCJBU0tNXCIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuTWlzQ3RybC5vcGVuQVNLTURyaWxsRG93blBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcbiAgICAgICAgICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9wZW5CYXJEcmlsbERvd25Qb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ3RhcmdldCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuTWlzQ3RybC5vcGVuVGFyZ2V0RHJpbGxEb3duUG9wb3ZlcihyZXNwb25zZS5ldmVudCwgeyBcInBvaW50XCI6IHJlc3BvbnNlLmRhdGEgfSwgLTEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5NaXNDdHJsLm9wZW5SZXZlbnVlUGFzc2VuZ2VyRHJpbGxEb3duUG9wb3ZlcihyZXNwb25zZS5ldmVudCwgeyBcInBvaW50XCI6IHJlc3BvbnNlLmRhdGEgfSwgLTEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAnb2FsJykge1xuICAgICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLk1pc0N0cmwub3Blbk9BTENvbnREcmlsbERvd25Qb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaW5pdERhdGEoKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgaWYgKHRoaXMuJGlvbmljUG9wb3Zlcikge1xuICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMuJGlvbmljUG9wb3ZlcikubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvaW5mb3Rvb2x0aXAuaHRtbCcsIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICBhbmltYXRpb246ICdub25lJ1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oaW5mb3BvcG92ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5pbmZvcG9wb3ZlciA9IGluZm9wb3BvdmVyO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvZHJpbGRvd24uaHRtbCcsIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICBhbmltYXRpb246ICdub25lJ1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oZHJpbGxwb3BvdmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZHJpbGxwb3BvdmVyID0gZHJpbGxwb3BvdmVyO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9taXMvYmFyZHJpbGRvd24uaHRtbCcsIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICBhbmltYXRpb246ICdub25lJ1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oZHJpbGxCYXJwb3BvdmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZHJpbGxCYXJwb3BvdmVyID0gZHJpbGxCYXJwb3BvdmVyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHtcbiAgICAgICAgICAgIG1ldHJpYzogdGhpcy5jaGFydG9wdGlvblNlcnZpY2UubWV0cmljQmFyQ2hhcnRPcHRpb25zKHRoaXMpLFxuICAgICAgICAgICAgdGFyZ2V0TGluZUNoYXJ0OiB0aGlzLmNoYXJ0b3B0aW9uU2VydmljZS5saW5lQ2hhcnRPcHRpb25zKCksXG4gICAgICAgICAgICB0YXJnZXRCYXJDaGFydDogdGhpcy5jaGFydG9wdGlvblNlcnZpY2UudGFyZ2V0QmFyQ2hhcnRPcHRpb25zKHRoaXMpLFxuICAgICAgICAgICAgcGFzc2VuZ2VyQ2hhcnQ6IHRoaXMuY2hhcnRvcHRpb25TZXJ2aWNlLm11bHRpQmFyQ2hhcnRPcHRpb25zKClcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcmVxID0ge1xuICAgICAgICAgICAgdXNlcklkOiB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYocmVxLnVzZXJJZCAhPSBcIm51bGxcIikge1xuICAgICAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFBheEZsb3duTWlzSGVhZGVyKHJlcSkudGhlbihcbiAgICAgICAgICAgICAgICAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnN1YkhlYWRlciA9IGRhdGEucmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5oZWFkZXIuZmxvd25Nb250aCA9IHRoYXQuc3ViSGVhZGVyLnBheEZsb3duTWlzTW9udGhzWzBdLmZsb3dNb250aDtcblxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm9uU2xpZGVNb3ZlKHsgaW5kZXg6IDAgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXHRcblx0XHR0aGF0LmhlYWRlci51c2VybmFtZSA9IHRoYXQuZ2V0UHJvZmlsZVVzZXJOYW1lKCk7XG4gICAgfVxuXG4gICAgZ2V0UHJvZmlsZVVzZXJOYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIGlmICh0aGlzLnVzZXJTZXJ2aWNlLmlzVXNlckxvZ2dlZEluKCkpIHtcbiAgICAgICAgICAgIHZhciBvYmogPSB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JhcGlkTW9iaWxlLnVzZXInKTtcbiAgICAgICAgICAgIGlmIChvYmogIT0gJ251bGwnKSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb2ZpbGVVc2VyTmFtZSA9IEpTT04ucGFyc2Uob2JqKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZmlsZVVzZXJOYW1lLnVzZXJuYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2VsZWN0ZWRGbG93bk1vbnRoKG1vbnRoOiBzdHJpbmcpe1xuICAgICAgICByZXR1cm4gKG1vbnRoID09IHRoaXMuaGVhZGVyLmZsb3duTW9udGgpO1xuICAgIH1cbiAgICBvcmllbnRhdGlvbkNoYW5nZSA9ICgpOiBib29sZWFuID0+IHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB2YXIgb2JqID0gdGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjb250cm9sbGVyJyk7XG5cdFx0aWYgKG9iaiA9PT0gJ01JUycpIHtcblx0XHRcdHRoYXQuJHRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0dGhhdC5vblNsaWRlTW92ZSh7IGluZGV4OiB0aGF0LmhlYWRlci50YWJJbmRleCB9KTtcblx0XHRcdH0sMjAwKVxuXHRcdH1cbiAgICB9IFxuICAgIG9wZW5pbmZvUG9wb3ZlciAoJGV2ZW50LCBpbmRleCkge1xuICAgICAgICBpZiAodHlwZW9mIGluZGV4ID09IFwidW5kZWZpbmVkXCIgfHwgaW5kZXggPT0gXCJcIikge1xuICAgICAgICAgICAgdGhpcy5pbmZvZGF0YSA9ICdObyBpbmZvIGF2YWlsYWJsZSc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHRoaXMuaW5mb2RhdGE9aW5kZXg7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coaW5kZXgpO1xuICAgICAgICB0aGlzLmluZm9wb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICB9O1xuXG4gICAgY2xvc2VQb3BvdmVyKCkge1xuICAgICAgICB0aGlzLmdyYXBocG9wb3Zlci5oaWRlKCk7XG4gICAgfTtcbiAgICBjbG9zZXNCYXJQb3BvdmVyKCl7XG4gICAgICAgIHRoaXMuZHJpbGxCYXJwb3BvdmVyLmhpZGUoKTtcbiAgICB9XG4gICAgY2xvc2VJbmZvUG9wb3ZlcigpIHtcbiAgICAgICAgdGhpcy5pbmZvcG9wb3Zlci5oaWRlKCk7XG4gICAgfVxuXG4gICAgdXBkYXRlSGVhZGVyKCkge1xuXHRcdHZhciBmbG93bk1vbnRoID0gdGhpcy5oZWFkZXIuZmxvd25Nb250aDtcbiAgICAgICAgdGhpcy5oZWFkZXIuaGVhZGVySW5kZXggPSBfLmZpbmRJbmRleCh0aGlzLnN1YkhlYWRlci5wYXhGbG93bk1pc01vbnRocywgZnVuY3Rpb24oY2hyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiBjaHIuZmxvd01vbnRoID09IGZsb3duTW9udGg7XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmhlYWRlci5oZWFkZXJJbmRleCk7XG5cdFx0dGhpcy5vblNsaWRlTW92ZSh7aW5kZXg6IHRoaXMuaGVhZGVyLmhlYWRlckluZGV4fSk7XG4gICAgfVxuXG4gICAgb25TbGlkZU1vdmUoZGF0YTogYW55KSB7XG4gICAgICAgIHRoaXMuaGVhZGVyLnRhYkluZGV4ID0gZGF0YS5pbmRleDtcbiAgICAgICAgc3dpdGNoKHRoaXMuaGVhZGVyLnRhYkluZGV4KXtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIHRoaXMuZ2V0Rmxvd25GYXZvcml0ZXMoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgdGhpcy5jYWxsTWV0cmljU25hcHNob3QoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgdGhpcy5jYWxsVGFyZ2V0VnNBY3R1YWwoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgdGhpcy5jYWxsUmV2ZW51ZUFuYWx5c2lzKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgIHRoaXMuY2FsbFNlY3RvckNhcnJpZXJBbmFseXNpcygpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICB0aGlzLmNhbGxSb3V0ZVJldmVudWUoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRvZ2dsZU1ldHJpYyAodmFsKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLm1vbnRoT3JZZWFyID0gdmFsO1xuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXh9KTtcbiAgICB9XG4gICAgdG9nZ2xlU3VyY2hhcmdlKCkge1xuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHtpbmRleDp0aGlzLmhlYWRlci50YWJJbmRleH0pO1xuICAgIH1cbiAgICB0b2dnbGVUYXJnZXQodmFsKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLnRhcmdldFJldk9yUGF4ID0gdmFsO1xuICAgIH1cblxuICAgIHRvZ2dsZVNlY3Rvcih2YWwpIHtcbiAgICAgICAgdGhpcy50b2dnbGUuc2VjdG9yUmV2T3JQYXggPSB2YWw7XG4gICAgfVxuXG4gICAgY2FsbE1ldHJpY1NuYXBzaG90KCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHZhciByZXFkYXRhID0ge1xuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICB0b2dnbGUxOiB0aGlzLnRvZ2dsZS5tb250aE9yWWVhcixcbiAgICAgICAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0TWV0cmljU25hcHNob3QocmVxZGF0YSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0aWYoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiKXtcblx0XHRcdFx0Ly8gZmF2IEl0ZW1zIHRvIGRpc3BsYXkgaW4gZGFzaGJvYXJkXG5cdFx0XHRcdHRoYXQubWV0cmljUmVzdWx0ICA9IF8uc29ydEJ5KGRhdGEucmVzcG9uc2UuZGF0YS5tZXRyaWNTbmFwc2hvdENoYXJ0cywgZnVuY3Rpb24odTogYW55KSB7XG5cdFx0XHRcdFx0aWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcblx0XHRcdFx0fSk7XG4gICAgICAgICAgICAgICAgdGhhdC5tZXRyaWNPcmdSZXN1bHQgPSB0aGF0Lm1ldHJpY1Jlc3VsdDtcblxuXHRcdFx0XHRfLmZvckVhY2godGhhdC5tZXRyaWNSZXN1bHQsIGZ1bmN0aW9uIChuOiBhbnksIHZhbHVlOiBhbnkpIHtcblx0XHRcdFx0XHRuLnZhbHVlc1swXS5jb2xvciA9IHRoYXQuR1JBUEhfQ09MT1JTLk1FVFJJQ1swXTtcblx0XHRcdFx0XHRuLnZhbHVlc1sxXS5jb2xvciA9IHRoYXQuR1JBUEhfQ09MT1JTLk1FVFJJQ1sxXTtcblx0XHRcdFx0XHRpZihuLnZhbHVlc1syXSkgbi52YWx1ZXNbMl0uY29sb3IgPSB0aGF0LkdSQVBIX0NPTE9SUy5NRVRSSUNbMl07XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHRoYXQuZmF2TWV0cmljUmVzdWx0ID0gXy5maWx0ZXIodGhhdC5tZXRyaWNSZXN1bHQsIGZ1bmN0aW9uKHU6IGFueSkge1xuXHRcdFx0XHRcdGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHRoYXQubWV0cmljTGVnZW5kcyA9IGRhdGEucmVzcG9uc2UuZGF0YS5sZWdlbmRzO1xuXHRcdFx0XHRpZih0aGF0LmhlYWRlci50YWJJbmRleCA9PSAwKSB7XG5cdFx0XHRcdFx0dGhhdC5tZXRyaWNSZXN1bHQgPSB0aGF0LmZhdk1ldHJpY1Jlc3VsdDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdFx0ICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcblx0XHRcdFx0XHRjb250ZW50OiAnTm8gRGF0YSBGb3VuZCBmb3IgTWV0cmljU25hcHNob3QhISEnXG5cdFx0XHRcdCAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcblx0XHRcdFx0XHQgIGNvbnNvbGUubG9nKCdkb25lJyk7XG5cdFx0XHRcdCAgfSk7XG5cdFx0XHR9XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNhbGxUYXJnZXRWc0FjdHVhbCgpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcbiAgICAgICAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxuICAgICAgICAgICAgdG9nZ2xlMTogJycsXG4gICAgICAgICAgICBmdWxsRGF0YUZsYWc6ICcnXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuXG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRUYXJnZXRWc0FjdHVhbChyZXFkYXRhKVxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRpZihkYXRhLnJlc3BvbnNlLnN0YXR1cyA9PT0gXCJzdWNjZXNzXCIpe1xuXHRcdFx0XHQvLyBmYXYgSXRlbXMgdG8gZGlzcGxheSBpbiBkYXNoYm9hcmRcblx0XHRcdFx0dGhhdC5mYXZUYXJnZXRMaW5lUmVzdWx0ID0gXy5maWx0ZXIoZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcblx0XHRcdFx0XHRpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHR0aGF0LmZhdlRhcmdldEJhclJlc3VsdCA9IF8uZmlsdGVyKGRhdGEucmVzcG9uc2UuZGF0YS52ZXJCYXJDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcblx0XHRcdFx0XHRpZih1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRfLmZvckVhY2goZGF0YS5yZXNwb25zZS5kYXRhLnZlckJhckNoYXJ0cywgZnVuY3Rpb24gKG46IGFueSwgdmFsdWU6IGFueSkge1xuXHRcdFx0XHRcdG4udmFsdWVzWzBdLmNvbG9yID0gdGhhdC5HUkFQSF9DT0xPUlMudmVyQmFyQ2hhcnRzWzBdO1xuXHRcdFx0XHRcdG4udmFsdWVzWzFdLmNvbG9yID0gdGhhdC5HUkFQSF9DT0xPUlMudmVyQmFyQ2hhcnRzWzFdO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHR2YXIgbGluZUNvbG9ycyA9IFt7XCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5MSU5FWzBdLCBcImNsYXNzZWRcIjogXCJkYXNoZWRcIixcInN0cm9rZVdpZHRoXCI6IDJ9LFxuXHRcdFx0XHR7XCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5MSU5FWzFdfSx7XCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5MSU5FWzJdLCBcImFyZWFcIiA6IHRydWUsIFwiZGlzYWJsZWRcIjogdHJ1ZX1dO1xuXG5cdFx0XHRcdF8uZm9yRWFjaChkYXRhLnJlc3BvbnNlLmRhdGEubGluZUNoYXJ0cywgZnVuY3Rpb24gKG46IGFueSwgdmFsdWU6IGFueSkge1xuXHRcdFx0XHRcdF8ubWVyZ2Uobi5saW5lQ2hhcnRJdGVtcywgbGluZUNvbG9ycyk7XG5cdFx0XHRcdH0pO1xuXG5cblx0XHRcdFx0aWYodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xuXHRcdFx0XHRcdHRoYXQudGFyZ2V0QWN0dWFsRGF0YSA9IHtcblx0XHRcdFx0XHRcdGhvckJhckNoYXJ0OiB0aGF0LmZhdlRhcmdldEJhclJlc3VsdCxcblx0XHRcdFx0XHRcdGxpbmVDaGFydDogdGhhdC5mYXZUYXJnZXRMaW5lUmVzdWx0XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0dGhhdC50YXJnZXRBY3R1YWxEYXRhID0ge1xuXHRcdFx0XHRcdFx0aG9yQmFyQ2hhcnQ6IGRhdGEucmVzcG9uc2UuZGF0YS52ZXJCYXJDaGFydHMsXG5cdFx0XHRcdFx0XHRsaW5lQ2hhcnQ6IGRhdGEucmVzcG9uc2UuZGF0YS5saW5lQ2hhcnRzXG5cdFx0XHRcdFx0fTtcdFx0XHRcdFxuXHRcdFx0XHR9XG4gICAgICAgICAgICAgICAgdGhhdC5zZWxlY3RUYXJnZXRSZXZPclBheCh0aGF0LnRhcmdldEFjdHVhbERhdGEpO1xuXG4gICAgICAgICAgICAgICAgdGhhdC50YXJnZXRPcmdBY3R1YWxEYXRhID0gZGF0YS5yZXNwb25zZS5kYXRhLnZlckJhckNoYXJ0cy5jb25jYXQoZGF0YS5yZXNwb25zZS5kYXRhLmxpbmVDaGFydHMpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoYXQudGFyZ2V0T3JnQWN0dWFsRGF0YSk7XG5cblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHRcdCAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG5cdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQgZm9yIFRhcmdldFZzQWN0dWFsISEhJ1xuXHRcdFx0XHQgIH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG5cdFx0XHRcdFx0ICBjb25zb2xlLmxvZygnZG9uZScpO1xuXHRcdFx0XHQgIH0pO1xuXHRcdFx0fVxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xuICAgICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNhbGxSb3V0ZVJldmVudWUoKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdmFyIHJvdXRlUmV2UmVxdWVzdCA9IHtcbiAgICAgICAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMubWlzU2VydmljZS5nZXRSb3V0ZVJldmVudWUocm91dGVSZXZSZXF1ZXN0KVxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRpZihkYXRhLnJlc3BvbnNlLnN0YXR1cyA9PT0gXCJzdWNjZXNzXCIpe1xuICAgICAgICAgICAgICAgIC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxuICAgICAgICAgICAgICAgIHZhciBqc29uT2JqID0gZGF0YS5yZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIHZhciBzb3J0ZWREYXRhID0gXy5zb3J0QnkoanNvbk9iai5Sb3V0ZVJldmVudWVDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodSkgcmV0dXJuIFt1LmZhdm9yaXRlQ2hhcnRQb3NpdGlvbl07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdmFyIGZhdnJvdXRlUmV2RGF0YSA9IF8uZmlsdGVyKHNvcnRlZERhdGEsIGZ1bmN0aW9uKHU6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnJvdXRlUmV2RGF0YSA9IHsgUm91dGVSZXZlbnVlQ2hhcnRzOiBmYXZyb3V0ZVJldkRhdGEgfTtcbiAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5yb3V0ZVJldkRhdGEgPSBqc29uT2JqO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoYXQucm91dGVPcmdSZXZEYXRhID0ganNvbk9iajtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdFx0ICB0aGF0LiRpb25pY1BvcHVwLmFsZXJ0KHtcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcblx0XHRcdFx0XHRjb250ZW50OiAnTm8gRGF0YSBGb3VuZCBSb3V0ZVJldmVudWUhISEnXG5cdFx0XHRcdCAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcblx0XHRcdFx0XHQgIGNvbnNvbGUubG9nKCdkb25lJyk7XG5cdFx0XHRcdCAgfSk7XG5cdFx0XHR9XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgY2FsbFJldmVudWVBbmFseXNpcygpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB2YXIgcmVxZGF0YSA9IHtcbiAgICAgICAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICBpbmNsdWRlU3VyY2hhcmdlOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJzonTicsXG4gICAgICAgICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxuICAgICAgICAgICAgdG9nZ2xlMTogJycsXG4gICAgICAgICAgICBmdWxsRGF0YUZsYWc6ICcnXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0UmV2ZW51ZUFuYWx5c2lzKHJlcWRhdGEpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdGlmKGRhdGEucmVzcG9uc2Uuc3RhdHVzID09PSBcInN1Y2Nlc3NcIil7XG5cdFx0XHRcdC8vIGZhdiBJdGVtcyB0byBkaXNwbGF5IGluIGRhc2hib2FyZFxuXHRcdFx0XHR2YXIganNvbk9iaiA9IGRhdGEucmVzcG9uc2UuZGF0YTtcblx0XHRcdFx0dmFyIHNvcnRlZERhdGEgPSBfLnNvcnRCeShqc29uT2JqLm11bHRpYmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHsgXG5cdFx0XHRcdFx0aWYgKHUpIHJldHVybiBbdS5mYXZvcml0ZUNoYXJ0UG9zaXRpb25dOyBcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHZhciBmYXZSZXZlbnVlQmFyUmVzdWx0ID0gXy5maWx0ZXIoc29ydGVkRGF0YSwgZnVuY3Rpb24odTogYW55KSB7IFxuXHRcdFx0XHRcdGlmKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHZhciBzb3J0ZWREYXRhID0gXy5zb3J0QnkoanNvbk9iai5waWVDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkgeyBcblx0XHRcdFx0XHRpZiAodSkgcmV0dXJuIFt1LmZhdm9yaXRlQ2hhcnRQb3NpdGlvbl07IFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0dmFyIGZhdlJldmVudWVQaWVSZXN1bHQgPSBfLmZpbHRlcihzb3J0ZWREYXRhLCBmdW5jdGlvbih1OiBhbnkpIHsgXG5cdFx0XHRcdFx0aWYodSkgcmV0dXJuIHUuZmF2b3JpdGVJbmQgPT0gJ1knO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHR2YXIgYmFyQ29sb3JzID0gW3RoYXQuR1JBUEhfQ09MT1JTLkJBUlswXSwgdGhhdC5HUkFQSF9DT0xPUlMuQkFSWzFdXTtcblx0XHRcdFx0Xy5tZXJnZShqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzFdLCBiYXJDb2xvcnMpO1xuXHRcdFx0XHRfLmZvckVhY2goanNvbk9iai5tdWx0aWJhckNoYXJ0cywgZnVuY3Rpb24objogYW55LCB2YWx1ZTogYW55KSB7XG5cdFx0XHRcdFx0bi5jb2xvciA9IGJhckNvbG9yc1t2YWx1ZV07XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHZhciBwaWVDb2xvcnMgPSBbe1wiY29sb3JcIjogdGhhdC5HUkFQSF9DT0xPUlMuUElFWzBdfSx7XCJjb2xvclwiOiB0aGF0LkdSQVBIX0NPTE9SUy5QSUVbMV19LHtcImNvbG9yXCI6IHRoYXQuR1JBUEhfQ09MT1JTLlBJRVsyXX1dO1xuXHRcdFx0XHRfLmZvckVhY2goanNvbk9iai5waWVDaGFydHNbMF0uZGF0YSwgZnVuY3Rpb24gKG46IGFueSwgdmFsdWU6IGFueSkge1xuXHRcdFx0XHRcdG4ubGFiZWwgPSBuLnh2YWw7XG5cdFx0XHRcdFx0bi52YWx1ZSA9IG4ueXZhbDtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Xy5tZXJnZShqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCBwaWVDb2xvcnMpO1xuXG4gICAgICAgICAgICAgICAgdGhhdC5vcmdSZXZlbnVlRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgcmV2ZW51ZVBpZUNoYXJ0IDoganNvbk9iai5waWVDaGFydHNbMF0sXG4gICAgICAgICAgICAgICAgICAgIHJldmVudWVCYXJDaGFydCA6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMV0sXG4gICAgICAgICAgICAgICAgICAgIHJldmVudWVIb3JCYXJDaGFydCA6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMl1cbiAgICAgICAgICAgICAgICB9XG5cblx0XHRcdFx0dGhhdC5yZXZlbnVlRGF0YSA9IHtcblx0XHRcdFx0XHRyZXZlbnVlUGllQ2hhcnQgOiBqc29uT2JqLnBpZUNoYXJ0c1swXSxcblx0XHRcdFx0XHRyZXZlbnVlQmFyQ2hhcnQgOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzFdLFxuXHRcdFx0XHRcdHJldmVudWVIb3JCYXJDaGFydCA6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMl0ubXVsdGliYXJDaGFydEl0ZW1zXG5cdFx0XHRcdH1cblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHRcdCAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG5cdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsXG5cdFx0XHRcdFx0Y29udGVudDogJ05vIERhdGEgRm91bmQgRm9yIFJldmVudWVBbmFseXNpcyEhISdcblx0XHRcdFx0ICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuXHRcdFx0XHRcdCAgY29uc29sZS5sb2coJ2RvbmUnKTtcblx0XHRcdFx0ICB9KTtcblx0XHRcdH1cbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yICcpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBvcGVuRHJpbGxEb3duKHJlZ2lvbkRhdGEsc2VsRmluZExldmVsKSB7XG4gICAgICAgIHNlbEZpbmRMZXZlbCA9IE51bWJlcihzZWxGaW5kTGV2ZWwpO1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWxdID0gcmVnaW9uRGF0YTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW3NlbEZpbmRMZXZlbCArIDFdID0gJyc7XG4gICAgICAgIGlmKHNlbEZpbmRMZXZlbCAhPSAnMycpIHtcbiAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xuICAgICAgICAgICAgdGhpcy5yZWdpb25OYW1lID0gKHJlZ2lvbkRhdGEucmVnaW9uTmFtZSkgPyByZWdpb25EYXRhLnJlZ2lvbk5hbWUgOiByZWdpb25EYXRhLmNoYXJ0TmFtZTtcbiAgICAgICAgICAgIHZhciBjb3VudHJ5RnJvbVRvID0gKHJlZ2lvbkRhdGEuY291bnRyeUZyb20gJiYgcmVnaW9uRGF0YS5jb3VudHJ5VG8pID8gcmVnaW9uRGF0YS5jb3VudHJ5RnJvbSArICctJyArIHJlZ2lvbkRhdGEuY291bnRyeVRvIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBzZWN0b3JGcm9tVG8gPSAocmVnaW9uRGF0YS5mbG93blNlY3RvciAmJiBkcmlsbExldmVsID49IDMpID8gcmVnaW9uRGF0YS5mbG93blNlY3RvciA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKHJlZ2lvbkRhdGEuZmxpZ2h0TnVtYmVyICYmIGRyaWxsTGV2ZWwgPT0gNCkgPyByZWdpb25EYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICAgICAgdmFyIHJlcWRhdGEgPSB7XG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcbiAgICAgICAgICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmhlYWRlci51c2VybmFtZSxcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxuICAgICAgICAgICAgICAgIFwicmVnaW9uTmFtZVwiOiAodGhpcy5yZWdpb25OYW1lKT8gdGhpcy5yZWdpb25OYW1lIDogXCJOb3J0aCBBbWVyaWNhXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5RnJvbVRvXCI6IGNvdW50cnlGcm9tVG8sXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JGcm9tVG9cIjogc2VjdG9yRnJvbVRvLFxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcbiAgICAgICAgICAgICAgICBcImZsaWdodERhdGVcIjogMFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5taXNTZXJ2aWNlLmdldFJvdXRlUmV2ZW51ZURyaWxsRG93bihyZXFkYXRhKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gZGF0YS5yZXNwb25zZTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICB2YXIgZmluZExldmVsID0gZHJpbGxMZXZlbCAtIDE7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YS5zdGF0dXMpO1xuICAgICAgICAgICAgICAgIGlmKGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJyl7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uaXRlbXNbMF0gPSBkYXRhLmRhdGEucm93cztcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5vcmdJdGVtc1swXSA9IGRhdGEuZGF0YS5yb3dzO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuc29ydCgncGF4Q291bnQnLGZpbmRMZXZlbCxmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuY2xlYXJEcmlsbChkcmlsbExldmVsKTtcbiAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZmluZExldmVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICAgICAgICB0aGF0LmNsb3Nlc1BvcG92ZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgICAgYWxlcnQoJ1NlcnZlciBFcnJvcicpO1xuICAgICAgICAgICAgfSk7IFxuICAgICAgICB9IFxuICAgIH1cbiAgICBjbGVhckRyaWxsKGxldmVsOiBudW1iZXIpIHtcbiAgICAgICAgdmFyIGk6IG51bWJlcjtcbiAgICAgICAgZm9yICh2YXIgaSA9IGxldmVsOyBpIDwgdGhpcy5ncm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldLml0ZW1zLnNwbGljZSgwLCAxKTtcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBzW2ldLm9yZ0l0ZW1zLnNwbGljZSgwLCAxKTtcbiAgICAgICAgICAgIHRoaXMuc29ydCgncGF4Q291bnQnLGksZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW2ldID0gJyc7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZHJpbGxEb3duUmVxdWVzdCAoZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpe1xuICAgICAgICB2YXIgcmVxZGF0YTtcbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICdiYXInKSB7XG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgICAgICAgIGlmIChkYXRhLmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YS5sYWJlbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGRyaWxsQmFyOiBzdHJpbmc7XG4gICAgICAgICAgICBkcmlsbEJhciA9IChkYXRhLmxhYmVsKSA/IGRhdGEubGFiZWwgOiBcIlwiO1xuICAgICAgICAgICAgdmFyIHJvdXRlQ29kZSA9IChkYXRhLnJvdXRlQ29kZSkgPyBkYXRhLnJvdXRlQ29kZSA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgc2VjdG9yID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcblxuICAgICAgICAgICAgaWYgKCFkcmlsbEJhcikge1xuICAgICAgICAgICAgICAgIGRyaWxsQmFyID0gdGhpcy5kcmlsbEJhckxhYmVsO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRyaWxsQmFyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuXG4gICAgICAgICAgICByZXFkYXRhID0ge1xuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJyA6ICdOJyxcbiAgICAgICAgICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmhlYWRlci51c2VybmFtZSxcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxuICAgICAgICAgICAgICAgIFwiZHJpbGxCYXJcIjogZHJpbGxCYXIsXG4gICAgICAgICAgICAgICAgXCJyb3V0ZUNvZGVcIjogcm91dGVDb2RlLFxuICAgICAgICAgICAgICAgIFwic2VjdG9yXCI6IHNlY3RvcixcbiAgICAgICAgICAgICAgICBcImZsaWdodE51bWJlclwiOiBmbGlnaHROdW1iZXJcbiAgICAgICAgICAgIH07ICBcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICd0YXJnZXQnKSB7XG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgICAgICAgIGlmIChkYXRhLmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YS5sYWJlbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHJvdXRldHlwZTogc3RyaW5nO1xuICAgICAgICAgICAgcm91dGV0eXBlID0gKGRhdGEucm91dGV0eXBlKSA/IGRhdGEucm91dGV0eXBlIDogXCJcIjtcblxuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG5cbiAgICAgICAgICAgIHJlcWRhdGEgPSB7XG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxuICAgICAgICAgICAgICAgIFwidXNlcklkXCI6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxuICAgICAgICAgICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXG4gICAgICAgICAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXG4gICAgICAgICAgICAgICAgXCJyb3V0ZXR5cGVcIjogcm91dGV0eXBlXG4gICAgICAgICAgICB9OyAgXG4gICAgICAgIH1cblxuICAgICAgICBpZihkcmlsbFR5cGUgPT0gJ2FuYWx5c2lzJykge1xuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciByZWdpb25OYW1lO1xuICAgICAgICAgICAgdmFyIGNvdW50cnlGcm9tVG87XG4gICAgICAgICAgICB2YXIgb3duT2FsRmxhZztcbiAgICAgICAgICAgIHZhciBzZWN0b3JGcm9tVG87XG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyO1xuXG4gICAgICAgICAgICBpZiAoZHJpbGxMZXZlbCA+IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICByZWdpb25OYW1lID0gKGRhdGEucmVnaW9uTmFtZSkgPyBkYXRhLnJlZ2lvbk5hbWUgOiBcIlwiO1xuICAgICAgICAgICAgICAgIGNvdW50cnlGcm9tVG8gPSAoZGF0YS5jb3VudHJ5RnJvbSAmJiBkYXRhLmNvdW50cnlUbykgPyBkYXRhLmNvdW50cnlGcm9tICsgJy0nICsgZGF0YS5jb3VudHJ5VG8gOiBcIlwiO1xuICAgICAgICAgICAgICAgIG93bk9hbEZsYWcgPSAoZGF0YS5vd25PYWwpID8gZGF0YS5vd25PYWwgOiBcIlwiO1xuICAgICAgICAgICAgICAgIHNlY3RvckZyb21UbyA9IChkYXRhLmZsb3duU2VjdG9yKSA/IGRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xuICAgICAgICAgICAgICAgIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWScgOiAnTicsXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcbiAgICAgICAgICAgICAgICBcInJlZ2lvbk5hbWVcIjogcmVnaW9uTmFtZSxcbiAgICAgICAgICAgICAgICBcImNvdW50cnlGcm9tVG9cIjogY291bnRyeUZyb21UbyxcbiAgICAgICAgICAgICAgICBcIm93bk9hbEZsYWdcIjogb3duT2FsRmxhZyxcbiAgICAgICAgICAgICAgICBcInNlY3RvckZyb21Ub1wiOiBzZWN0b3JGcm9tVG8sXG4gICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyLFxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiAwXG4gICAgICAgICAgICB9OyAgXG4gICAgICAgIH1cbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICdwYXNzZW5nZXItY291bnQnKSB7XG4gICAgICAgICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgdG9nZ2xlMSA9IChkYXRhLnRvZ2dsZTEpID8gZGF0YS50b2dnbGUxIDogXCJcIjtcbiAgICAgICAgICAgIHZhciB0b2dnbGUyOiBhbnkgPSAoZGF0YS50b2dnbGUyKSA/IGRhdGEudG9nZ2xlMiA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgcm91dGVDb2RlID0gKGRhdGEucm91dGVDb2RlKSA/IGRhdGEucm91dGVDb2RlIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBzZWN0b3IgID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyICA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XG5cbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO2NvbnNvbGUubG9nKGRhdGEpO1xuXG4gICAgICAgICAgICByZXFkYXRhID0ge1xuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJyA6ICdOJyxcbiAgICAgICAgICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmhlYWRlci51c2VybmFtZSxcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcInN0cmluZ1wiLFxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxuICAgICAgICAgICAgICAgIFwidG9nZ2xlMVwiOiB0b2dnbGUxLFxuICAgICAgICAgICAgICAgIFwidG9nZ2xlMlwiOiB0b2dnbGUyLFxuICAgICAgICAgICAgICAgIFwicm91dGVDb2RlXCI6IHJvdXRlQ29kZSxcbiAgICAgICAgICAgICAgICBcInNlY3RvclwiOiBzZWN0b3IsXG4gICAgICAgICAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyXG4gICAgICAgICAgICB9OyAgXG4gICAgICAgIH1cblxuICAgICAgICBpZihkcmlsbFR5cGUgPT0gJ25ldHdvcmstUmV2ZW51ZScpIHtcbiAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZGF0YS5sYWJlbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGEubGFiZWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgIHZhciBkcmlsbEJhcjogc3RyaW5nO1xuICAgICAgICAgICAgZHJpbGxCYXIgPSAoZGF0YS5sYWJlbCkgPyBkYXRhLmxhYmVsIDogXCJcIjtcbiAgICAgICAgICAgIHZhciB0b2dnbGUxID0gKGRhdGEudG9nZ2xlMSkgPyBkYXRhLnRvZ2dsZTEgOiBcIlwiO1xuICAgICAgICAgICAgdmFyIFBPU0NvdW50cnkgPSAoZGF0YS5QT1Njb3VudHJ5KSA/IGRhdGEuUE9TY291bnRyeSA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgUE9TUmVnaW9uID0gKGRhdGEuUE9TcmVnaW9uKSA/IGRhdGEuUE9TcmVnaW9uIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBQT1NDaXR5ID0gKGRhdGEuUE9TY2l0eSkgPyBkYXRhLlBPU2NpdHkgOiBcIlwiO1xuICAgICAgICAgICAgdmFyIGRvY3VtZW50VHlwZSA9IChkYXRhLmRvY3VtZW50VHlwZSkgPyBkYXRhLmRvY3VtZW50VHlwZSA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgc2VjdG9yID0gKGRhdGEuc2VjdG9yKSA/IGRhdGEuc2VjdG9yIDogXCJcIjtcblxuICAgICAgICAgICAgaWYgKCFkcmlsbEJhcikge1xuICAgICAgICAgICAgICAgIGRyaWxsQmFyID0gdGhpcy5kcmlsbEJhckxhYmVsO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRyaWxsQmFyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG5cbiAgICAgICAgICAgIHJlcWRhdGEgPSB7XG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxuICAgICAgICAgICAgICAgIFwidXNlcklkXCI6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxuICAgICAgICAgICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXG4gICAgICAgICAgICAgICAgXCJkcmlsbEJhclwiOiBkcmlsbEJhcixcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcbiAgICAgICAgICAgICAgICBcInRvZ2dsZTFcIjogdG9nZ2xlMSxcbiAgICAgICAgICAgICAgICBcIlBPU1JlZ2lvblwiOiBQT1NSZWdpb24sXG4gICAgICAgICAgICAgICAgXCJQT1NDb3VudHJ5XCI6IFBPU0NvdW50cnksXG4gICAgICAgICAgICAgICAgXCJQT1NDaXR5XCI6IFBPU0NpdHksXG4gICAgICAgICAgICAgICAgXCJkb2N1bWVudFR5cGVcIjogZG9jdW1lbnRUeXBlLFxuICAgICAgICAgICAgICAgIFwic2VjdG9yXCI6IHNlY3RvclxuICAgICAgICAgICAgfTsgIFxuICAgICAgICB9XG5cbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICd5aWVsZCcpIHtcbiAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZGF0YS5sYWJlbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGEubGFiZWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgIHZhciBkcmlsbEJhcjogc3RyaW5nO1xuICAgICAgICAgICAgZHJpbGxCYXIgPSAoZGF0YS5sYWJlbCkgPyBkYXRhLmxhYmVsIDogXCJcIjtcbiAgICAgICAgICAgIHZhciB0b2dnbGUxID0gKGRhdGEudG9nZ2xlMSkgPyBkYXRhLnRvZ2dsZTEgOiBcIlwiO1xuICAgICAgICAgICAgdmFyIHJvdXRlQ29kZSA9IChkYXRhLnJvdXRlQ29kZSkgPyBkYXRhLnJvdXRlQ29kZSA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgc2VjdG9yID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcblxuICAgICAgICAgICAgaWYgKCFkcmlsbEJhcikge1xuICAgICAgICAgICAgICAgIGRyaWxsQmFyID0gdGhpcy5kcmlsbEJhckxhYmVsO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRyaWxsQmFyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG5cbiAgICAgICAgICAgIHJlcWRhdGEgPSB7XG4gICAgICAgICAgICAgICAgXCJmbG93bk1vbnRoXCI6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICAgICAgICAgICAgXCJpbmNsdWRlU3VyY2hhcmdlXCI6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knIDogJ04nLFxuICAgICAgICAgICAgICAgIFwidXNlcklkXCI6IHRoaXMuaGVhZGVyLnVzZXJuYW1lLFxuICAgICAgICAgICAgICAgIFwiZnVsbERhdGFGbGFnXCI6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXG4gICAgICAgICAgICAgICAgXCJkcmlsbEJhclwiOiBkcmlsbEJhcixcbiAgICAgICAgICAgICAgICBcInBhZ2VOdW1iZXJcIjogMCxcbiAgICAgICAgICAgICAgICBcInRvZ2dsZTFcIjogdG9nZ2xlMSxcbiAgICAgICAgICAgICAgICBcInJvdXRlQ29kZVwiOiByb3V0ZUNvZGUsXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JcIjogc2VjdG9yLFxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlclxuICAgICAgICAgICAgfTsgIFxuICAgICAgICB9XG5cbiAgICAgICAgaWYoZHJpbGxUeXBlID09ICdycGttJykge1xuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChkYXRhLmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YS5sYWJlbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgdmFyIGRyaWxsQmFyOiBzdHJpbmc7XG4gICAgICAgICAgICBkcmlsbEJhciA9IChkYXRhLmxhYmVsKSA/IGRhdGEubGFiZWwgOiBcIlwiO1xuICAgICAgICAgICAgdmFyIHRvZ2dsZTEgPSAoZGF0YS50b2dnbGUxKSA/IGRhdGEudG9nZ2xlMSA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgYWlyY3JhZnR0eXBlID0gKGRhdGEuYWlyY3JhZnR0eXBlKSA/IGRhdGEuYWlyY3JhZnR0eXBlIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBhaXJjcmFmdHJlZ25vID0gKGRhdGEuYWlyY3JhZnRyZWdubykgPyBkYXRhLmFpcmNyYWZ0cmVnbm8gOiBcIlwiO1xuICAgICAgICAgICAgdmFyIGFpcmNyYWZ0bGVnID0gKGRhdGEuYWlyY3JhZnRsZWcpID8gZGF0YS5haXJjcmFmdGxlZyA6IFwiXCI7XG5cbiAgICAgICAgICAgIGlmICghZHJpbGxCYXIpIHtcbiAgICAgICAgICAgICAgICBkcmlsbEJhciA9IHRoaXMuZHJpbGxCYXJMYWJlbDtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkcmlsbEJhcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuXG4gICAgICAgICAgICByZXFkYXRhID0ge1xuICAgICAgICAgICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICAgICAgICAgIFwiaW5jbHVkZVN1cmNoYXJnZVwiOiAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/ICdZJyA6ICdOJyxcbiAgICAgICAgICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmhlYWRlci51c2VybmFtZSxcbiAgICAgICAgICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcInN0cmluZ1wiLFxuICAgICAgICAgICAgICAgIFwiZHJpbGxMZXZlbFwiOiBkcmlsbExldmVsLFxuICAgICAgICAgICAgICAgIFwiZHJpbGxCYXJcIjogZHJpbGxCYXIsXG4gICAgICAgICAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXG4gICAgICAgICAgICAgICAgXCJ0b2dnbGUxXCI6IHRvZ2dsZTEsXG4gICAgICAgICAgICAgICAgXCJhaXJjcmFmdHR5cGVcIjogYWlyY3JhZnR0eXBlLFxuICAgICAgICAgICAgICAgIFwiYWlyY3JhZnRyZWdub1wiOiBhaXJjcmFmdHJlZ25vLFxuICAgICAgICAgICAgICAgIFwiYWlyY3JhZnRsZWdcIjogYWlyY3JhZnRsZWdcbiAgICAgICAgICAgIH07ICBcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKGRyaWxsVHlwZSA9PSAnYXNrbScpIHtcbiAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZGF0YS5sYWJlbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZHJpbGxCYXJMYWJlbCA9IGRhdGEubGFiZWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgIHZhciBkcmlsbEJhcjogc3RyaW5nO1xuICAgICAgICAgICAgZHJpbGxCYXIgPSAoZGF0YS5sYWJlbCkgPyBkYXRhLmxhYmVsIDogXCJcIjtcbiAgICAgICAgICAgIHZhciB0b2dnbGUxID0gKGRhdGEudG9nZ2xlMSkgPyBkYXRhLnRvZ2dsZTEgOiBcIlwiO1xuICAgICAgICAgICAgdmFyIGFpcmNyYWZ0dHlwZSA9IChkYXRhLmFpcmNyYWZ0dHlwZSkgPyBkYXRhLmFpcmNyYWZ0dHlwZSA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgYWlyY3JhZnRyZWdubyA9IChkYXRhLmFpcmNyYWZ0cmVnbm8pID8gZGF0YS5haXJjcmFmdHJlZ25vIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBhaXJjcmFmdGxlZyA9IChkYXRhLmFpcmNyYWZ0bGVnKSA/IGRhdGEuYWlyY3JhZnRsZWcgOiBcIlwiO1xuXG4gICAgICAgICAgICBpZiAoIWRyaWxsQmFyKSB7XG4gICAgICAgICAgICAgICAgZHJpbGxCYXIgPSB0aGlzLmRyaWxsQmFyTGFiZWw7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZHJpbGxCYXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWScgOiAnTicsXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcbiAgICAgICAgICAgICAgICBcImRyaWxsQmFyXCI6IGRyaWxsQmFyLFxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxuICAgICAgICAgICAgICAgIFwidG9nZ2xlMVwiOiB0b2dnbGUxLFxuICAgICAgICAgICAgICAgIFwiYWlyY3JhZnR0eXBlXCI6IGFpcmNyYWZ0dHlwZSxcbiAgICAgICAgICAgICAgICBcImFpcmNyYWZ0cmVnbm9cIjogYWlyY3JhZnRyZWdubyxcbiAgICAgICAgICAgICAgICBcImFpcmNyYWZ0bGVnXCI6IGFpcmNyYWZ0bGVnXG4gICAgICAgICAgICB9OyAgXG4gICAgICAgIH1cblxuICAgICAgICBpZihkcmlsbFR5cGUgPT0gJ29hbC1jb250Jykge1xuICAgICAgICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChkYXRhLmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kcmlsbEJhckxhYmVsID0gZGF0YS5sYWJlbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgdmFyIGRyaWxsQmFyOiBzdHJpbmc7XG4gICAgICAgICAgICBkcmlsbEJhciA9IChkYXRhLmxhYmVsKSA/IGRhdGEubGFiZWwgOiBcIlwiO1xuICAgICAgICAgICAgdmFyIHRvZ2dsZTEgPSAoZGF0YS50b2dnbGUxKSA/IGRhdGEudG9nZ2xlMSA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgdG9nZ2xlMiA9IChkYXRhLnRvZ2dsZTIpID8gZGF0YS50b2dnbGUyIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBjYXJyaWVyQ29kZSA9IChkYXRhLmNhcnJpZXJDb2RlKSA/IGRhdGEuY2FycmllckNvZGUgOiBcIlwiO1xuICAgICAgICAgICAgdmFyIHNlY3RvciA9IChkYXRhLnNlY3RvcikgPyBkYXRhLnNlY3RvciA6IFwiXCI7XG4gICAgICAgICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcbiAgICAgICAgICAgIHZhciBmbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSkgPyBkYXRhLmZsaWdodERhdGUgOiBcIlwiO1xuXG4gICAgICAgICAgICBpZiAoIWRyaWxsQmFyKSB7XG4gICAgICAgICAgICAgICAgZHJpbGxCYXIgPSB0aGlzLmRyaWxsQmFyTGFiZWw7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZHJpbGxCYXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICAgICAgcmVxZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgICAgICBcImluY2x1ZGVTdXJjaGFyZ2VcIjogKHRoaXMuaGVhZGVyLnN1cmNoYXJnZSkgPyAnWScgOiAnTicsXG4gICAgICAgICAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcbiAgICAgICAgICAgICAgICBcImRyaWxsQmFyXCI6IGRyaWxsQmFyLFxuICAgICAgICAgICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxuICAgICAgICAgICAgICAgIFwidG9nZ2xlMVwiOiB0b2dnbGUxLFxuICAgICAgICAgICAgICAgIFwidG9nZ2xlMlwiOiB0b2dnbGUyLFxuICAgICAgICAgICAgICAgIFwiY2FycmllckNvZGVcIjogY2FycmllckNvZGUsXG4gICAgICAgICAgICAgICAgXCJzZWN0b3JcIjogc2VjdG9yLFxuICAgICAgICAgICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcbiAgICAgICAgICAgICAgICBcImZsaWdodERhdGVcIjogZmxpZ2h0RGF0ZVxuICAgICAgICAgICAgfTsgIFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXFkYXRhO1xuICAgIH1cbiAgICBnZXREcmlsbERvd25VUkwgKGRyaWxEb3duVHlwZSkge1xuICAgICAgICB2YXIgdXJsXG4gICAgICAgIHN3aXRjaChkcmlsRG93blR5cGUpe1xuICAgICAgICAgICAgY2FzZSAnYmFyJzpcbiAgICAgICAgICAgICAgICB1cmwgPSBcIi9wYXhmbG5taXMvbXNwYXhuZXRyZXZkcmlsbFwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd0YXJnZXQnOlxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy90Z3R2c2FjdGRyaWxsXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FuYWx5c2lzJzpcbiAgICAgICAgICAgICAgICB1cmwgPSBcIi9wYXhmbG5taXMvbmV0cmV2ZW51ZW93bm9hbGRyaWxsXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3Bhc3Nlbmdlci1jb3VudCc6XG4gICAgICAgICAgICAgICAgdXJsID0gXCIvcGF4ZmxubWlzL21zcGF4Y250Y3RhZHJpbGxcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbmV0d29yay1SZXZlbnVlJzpcbiAgICAgICAgICAgICAgICB1cmwgPSBcIi9wYXhmbG5taXMvbXNuZXRyZXZkcmlsbFwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd5aWVsZCc6XG4gICAgICAgICAgICAgICAgdXJsID0gXCIvcGF4ZmxubWlzL21zcGF4bmV0eWxkZHJpbGxcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncnBrbSc6XG4gICAgICAgICAgICAgICAgdXJsID0gXCIvcGF4ZmxubWlzL21zcGF4cnBrbXJldmRyaWxsXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2Fza20nOlxuICAgICAgICAgICAgICAgIHVybCA9IFwiL3BheGZsbm1pcy9tc3BheGFza21yZXZkcmlsbFwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvYWwtY29udCc6XG4gICAgICAgICAgICAgICAgdXJsID0gXCIvcGF4ZmxubWlzL29hbGNhcnJpZXJhbmFseXNpc2RyaWxsXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH1cbiAgICBvcGVuQmFyRHJpbGxEb3duKGRhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgICAgICBzZWxGaW5kTGV2ZWwgPSBOdW1iZXIoc2VsRmluZExldmVsKTtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsXSA9IGRhdGE7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWwgKyAxXSA9ICcnO1xuICAgICAgICBcbiAgICAgICAgaWYgKHNlbEZpbmRMZXZlbCAhPSAodGhpcy5ncm91cHMubGVuZ3RoIC0gMSkpIHtcbiAgICAgICAgICAgIHZhciBkcmlsbExldmVsID0gKHNlbEZpbmRMZXZlbCArIDIpO1xuICAgICAgICAgICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG4gICAgICAgICAgICB2YXIgcmVxZGF0YSA9IHRoaXMuZHJpbGxEb3duUmVxdWVzdCh0aGlzLmRyaWxsVHlwZSwgc2VsRmluZExldmVsLCBkYXRhKTtcbiAgICAgICAgICAgIHZhciBVUkwgPSB0aGlzLmdldERyaWxsRG93blVSTCh0aGlzLmRyaWxsVHlwZSk7XG4gICAgICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0RHJpbGxEb3duKHJlcWRhdGEsIFVSTClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGRhdGEucmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZmluZExldmVsID0gZHJpbGxMZXZlbCAtIDE7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodGhhdC5kcmlsbFR5cGUgPT0gJ29hbC1jb250Jyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodGhhdC50b2dnbGUuc2VjdG9yUmV2T3JQYXggPT0gXCJwYXhjb3VudFwiKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5pdGVtc1swXSA9IGRhdGEuZGF0YS5wYXhjb3VudHJvd3M7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0ub3JnSXRlbXNbMF0gPSBkYXRhLmRhdGEucGF4Y291bnRyb3dzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLml0ZW1zWzBdID0gZGF0YS5kYXRhLnJldmVudWVyb3dzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gZGF0YS5kYXRhLnJldmVudWVyb3dzOyAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLml0ZW1zWzBdID0gZGF0YS5kYXRhLnJvd3M7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5vcmdJdGVtc1swXSA9IGRhdGEuZGF0YS5yb3dzOyAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zb3J0KCdwYXhDb3VudCcsIGZpbmRMZXZlbCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGRyaWxsTGV2ZWwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zaG93bkdyb3VwID0gZmluZExldmVsO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGZpbmRMZXZlbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5jbG9zZXNQb3BvdmVyKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ1NlcnZlciBFcnJvcicpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGluaXRpYXRlQXJyYXkoZHJpbGx0YWJzKSB7XG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgaW4gZHJpbGx0YWJzKSB7XG4gICAgICAgICAgICB0aGlzLmdyb3Vwc1tpXSA9IHtcbiAgICAgICAgICAgICAgICBpZDogaSxcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLmRyaWxsdGFic1tpXSxcbiAgICAgICAgICAgICAgICBpdGVtczogW10sXG4gICAgICAgICAgICAgICAgb3JnSXRlbXM6IFtdLFxuICAgICAgICAgICAgICAgIEl0ZW1zQnlQYWdlOiBbXSxcbiAgICAgICAgICAgICAgICBmaXJzdENvbHVtbnM6IHRoaXMuZmlyc3RDb2x1bW5zW2ldXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIG9wZW5CYXJEcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XG4gICAgICAgIHRoaXMuZHJpbGxOYW1lID0gJ01FVFJJQyBTTkFQU0hPVCBSRVBPUlQgLSAnICsgc2VsRGF0YS5wb2ludC5sYWJlbDtcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAnYmFyJztcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcbiAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ1JvdXRlIExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdEYXRhIExldmVsJywgJ0ZsaWdodCBMZXZlbCddO1xuICAgICAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsncm91dGVDb2RlJywgJ2Zsb3duU2VjdG9yJywgJ2ZsaWdodE51bWJlcicsICdmbGlnaHREYXRlJ107XG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhpcy4kdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGF0LmRyaWxsQmFycG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgICAgdGhpcy5vcGVuQmFyRHJpbGxEb3duKHNlbERhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XG4gICAgfTtcblxuICAgIG9wZW5SUEtNRHJpbGxEb3duUG9wb3ZlcigkZXZlbnQsIHNlbERhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgICAgICB0aGlzLmRyaWxsTmFtZSA9ICdSUEtNJztcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAncnBrbSc7XG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydSUEtNIGF0IEFpcmNyYWZ0IFR5cGUgTGV2ZWwnLCAnUlBLTSBhdCBBaXJjcmFmdCAgUmVnaXN0cmF0aW9uIE51bWJlciBMZXZlbCcsICdSUEtNIGF0IEFpcmNyYWZ0IExlZyBMZXZlbCcsICdSUEtNIGF0IEZsaWdodCBOdW1iZXIgYW5kIERhdGUgTGV2ZWwnXTtcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2FpcmNyYWZ0dHlwZScsICdhaXJjcmFmdHJlZ25vJywgJ2FpcmNyYWZ0bGVnJywgJ2ZsaWdodE51bWJlciddO1xuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdGhhdC5kcmlsbEJhcnBvcG92ZXIuc2hvdygkZXZlbnQpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICAgIHRoaXMub3BlbkJhckRyaWxsRG93bihzZWxEYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xuICAgIH1cbiAgICBvcGVuQVNLTURyaWxsRG93blBvcG92ZXIoJGV2ZW50LCBzZWxEYXRhLCBzZWxGaW5kTGV2ZWwpIHtcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnQVNLTSc7XG4gICAgICAgIHRoaXMuZHJpbGxUeXBlID0gJ2Fza20nO1xuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnQVNLTSBhdCBBaXJjcmFmdCBUeXBlIExldmVsJywgJ0FTS00gYXQgQWlyY3JhZnQgIFJlZ2lzdHJhdGlvbiBOdW1iZXIgTGV2ZWwnLCAnQVNLTSBhdCBBaXJjcmFmdCBMZWcgTGV2ZWwnLCAnQVNLTSBhdCBGbGlnaHQgTnVtYmVyIGFuZCBEYXRlIExldmVsJ107XG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydhaXJjcmFmdHR5cGUnLCAnYWlyY3JhZnRyZWdubycsICdhaXJjcmFmdGxlZycsICdmbGlnaHROdW1iZXInXTtcbiAgICAgICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoYXQuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICAgICAgfSwgNTApO1xuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcbiAgICB9XG4gICAgb3Blbk9BTENvbnREcmlsbERvd25Qb3BvdmVyKCRldmVudCwgc2VsRGF0YSwgc2VsRmluZExldmVsKSB7XG4gICAgICAgIHRoaXMuZHJpbGxOYW1lID0gJ1RvcCA1IE9BTCBDb250cmlidXRpb24nO1xuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdvYWwtY29udCc7XG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgICAgIGlmKHRoaXMudG9nZ2xlLnNlY3RvclJldk9yUGF4ID09IFwicGF4Y291bnRcIikgeyBcbiAgICAgICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydQYXggQ291bnQgYXQgU2VjdG9yIExldmVsIC0gRnJvbSBDYXJyaWVyIEVLJywgJ1BheCBDb3VudCBhdCBGbGlnaHQgTnVtYmVyIExldmVsIC0gRnJvbSBDYXJyaWVyIEVLJywgJ1BheCBDb3VudCBhdCBGbGlnaHQgRGF0ZSBMZXZlbCAtIEZyb20gQ2FycmllciBFSycsICdQYXggQ291bnQgYXQgRG9jdW1lbnQgdHlwZSBMZXZlbCAtIEZyb20gQ2FycmllciBFSyddO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ1JldmVudWUgYXQgU2VjdG9yIExldmVsJywgJ1JldmVudWUgYXQgRmxpZ2h0IE51bWJlciBMZXZlbCAtIEZyb20gQ2FycmllciBFSycsICdSZXZlbnVlIGF0IEZsaWdodCBEYXRlIExldmVsIC0gRnJvbSBDYXJyaWVyIEVLJywgJ1JldmVudWUgYXQgRG9jdHlwZSBMZXZlbCAtIEZyb20gQ2FycmllciBFSyddOyAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydzZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2ZsaWdodERhdGUnLCAnZG9jdW1lbnRUeXBlJ107XG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhpcy4kdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGF0LmRyaWxsQmFycG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgICAgdGhpcy5vcGVuQmFyRHJpbGxEb3duKHNlbERhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XG4gICAgfVxuICAgIG9wZW5ZaWVsZERyaWxsRG93blBvcG92ZXIoJGV2ZW50LCBzZWxEYXRhLCBzZWxGaW5kTGV2ZWwpIHtcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnWWllbGQnO1xuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICd5aWVsZCc7XG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydZaWVsZCBhdCBSb3V0ZSBMZXZlbCcsICdZaWVsZCBhdCBTZWN0b3IgTGV2ZWwnLCAnWWllbGQgYXQgRmxpZ2h0IExldmVsJywgJ1lpZWxkIGF0IEZsaWdodCBEYXRlIExldmVsJ107XG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydyb3V0ZUNvZGUnLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2ZsaWdodERhdGUnXTtcbiAgICAgICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoYXQuZHJpbGxCYXJwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICAgICAgfSwgNTApO1xuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcbiAgICB9O1xuICAgIG9wZW5OZXR3b3JrUmV2ZW51ZURyaWxsRG93blBvcG92ZXIoJGV2ZW50LCBzZWxEYXRhLCBzZWxGaW5kTGV2ZWwpIHtcbiAgICAgICAgdGhpcy5kcmlsbE5hbWUgPSAnTmV0d29yayBSZXZlbnVlJztcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAnbmV0d29yay1SZXZlbnVlJztcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcbiAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ05ldHdvcmsgUmV2ZW51ZSBhdCBSZWdpb24gUE9TIExldmVsJywgJ05ldHdvcmsgUmV2ZW51ZSBieSBDb3VudHJ5IG9mIFBPUycsICdOZXR3b3JrIFJldmVudWUgYnkgQ2l0eSBvZiBQT1MnLCAnTmV0d29yayBSZXZlbnVlIGJ5IERvY3VtZW50IFR5cGUnLCAnTmV0d29yayBSZXZlbnVlIGJ5IFNlY3RvcicsJ05ldHdvcmsgUmV2ZW51ZSBieSBGbGlnaHQgTnVtYmVyJ107XG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydQT1NyZWdpb24nLCAnUE9TY291bnRyeScsICdQT1NjaXR5JywgJ2RvY3VtZW50VHlwZScsICdzZWN0b3InLCAnZmxpZ2h0bnVtYmVyJ107XG4gICAgICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhpcy4kdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGF0LmRyaWxsQmFycG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgICAgdGhpcy5vcGVuQmFyRHJpbGxEb3duKHNlbERhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XG4gICAgfTtcbiAgICBvcGVuVGFyZ2V0RHJpbGxEb3duUG9wb3ZlcigkZXZlbnQsIHNlbERhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgICAgICB0aGlzLmRyaWxsTmFtZSA9ICdUYXJnZXQgVnMgQWN0dWFsJztcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAndGFyZ2V0JztcbiAgICAgICAgdGhpcy5ncm91cHMgPSBbXTtcbiAgICAgICAgdGhpcy5kcmlsbHRhYnMgPSBbJ1JvdXRlIFR5cGUnLCAnUm91dGUgY29kZSddO1xuICAgICAgICB0aGlzLmZpcnN0Q29sdW1ucyA9IFsncm91dGV0eXBlJywgJ3JvdXRlY29kZSddO1xuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdGhhdC5kcmlsbEJhcnBvcG92ZXIuc2hvdygkZXZlbnQpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICAgIHRoaXMub3BlbkJhckRyaWxsRG93bihzZWxEYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xuICAgIH07XG5cbiAgICBvcGVuUmV2ZW51ZURyaWxsRG93blBvcG92ZXIoJGV2ZW50LCBzZWxEYXRhLCBzZWxGaW5kTGV2ZWwpIHtcbiAgICAgICAgY29uc29sZS5sb2coc2VsRGF0YSk7XG4gICAgICAgIHRoaXMuZHJpbGxOYW1lID0gJ05ldCBSZXZlbnVlIGJ5IE9XTiBhbmQgT0FMJztcbiAgICAgICAgdGhpcy5kcmlsbFR5cGUgPSAnYW5hbHlzaXMnO1xuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnQ291bnRyeSBMZXZlbCcsICdTZWN0b3IgTGV2ZWwnLCAnRmxpZ2h0IExldmVsJywgJ0RvY3VtZW50IExldmVsJ107XG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydjb3VudHJ5RnJvbScsICdmbG93blNlY3RvcicsICdmbGlnaHROdW1iZXInLCAnbmV0UmV2ZW51ZSddO1xuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xuICAgICAgICB0aGlzLmRyaWxsQmFycG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICAgIHRoaXMub3BlbkJhckRyaWxsRG93bihzZWxEYXRhLnBvaW50LCBzZWxGaW5kTGV2ZWwpO1xuICAgIH07XG5cbiAgICBvcGVuUmV2ZW51ZVBhc3NlbmdlckRyaWxsRG93blBvcG92ZXIoJGV2ZW50LCBzZWxEYXRhLCBzZWxGaW5kTGV2ZWwpIHtcbiAgICAgICAgY29uc29sZS5sb2coc2VsRGF0YSk7XG4gICAgICAgIHRoaXMuZHJpbGxOYW1lID0gJ1Bhc3NlbmdlciBDb3VudCBieSBDbGFzcyBvZiBUcmF2ZWwnO1xuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdwYXNzZW5nZXItY291bnQnO1xuICAgICAgICB0aGlzLmdyb3VwcyA9IFtdO1xuICAgICAgICB0aGlzLmRyaWxsdGFicyA9IFsnUGF4IENvdW50IGF0IFJvdXRlIExldmVsJywgJ1BheCBDb3VudCBhdCBTZWN0b3IgTGV2ZWwnLCAnUGF4IENvdW50IGF0IEZsaWdodCBOdW1iZXIgTGV2ZWwnLCAnUGF4IENvdW50IGF0IEZsaWdodCBEYXRlIExldmVsJ107XG4gICAgICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydyb3V0ZUNvZGUnLCAnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2ZsaWdodERhdGUnXTtcbiAgICAgICAgdGhpcy5pbml0aWF0ZUFycmF5KHRoaXMuZHJpbGx0YWJzKTtcbiAgICAgICAgdGhpcy5kcmlsbEJhcnBvcG92ZXIuc2hvdygkZXZlbnQpO1xuICAgICAgICB0aGlzLm9wZW5CYXJEcmlsbERvd24oc2VsRGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcbiAgICB9O1xuXG4gICAgb3BlblBvcG92ZXIgKCRldmVudCwgaW5kZXgsIGNoYXJ0dHlwZSkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLmNoYXJ0VHlwZSA9IGNoYXJ0dHlwZTtcbiAgICAgICAgdGhpcy5ncmFwaEluZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL2dyYXBoLXBvcG92ZXIuaHRtbCcsIHtcbiAgICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZVxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHBvcG92ZXIpIHtcbiAgICAgICAgICAgIHRoYXQucG9wb3ZlcnNob3duID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcbiAgICAgICAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgb3BlblNlY3RvclBvcG92ZXIgKCRldmVudCxpbmRleCxjaGFydHR5cGUpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLmNoYXJ0VHlwZSA9IGNoYXJ0dHlwZTtcbiAgICAgICAgdGhpcy5ncmFwaEluZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMuJGlvbmljUG9wb3Zlci5mcm9tVGVtcGxhdGVVcmwoJ2NvbXBvbmVudHMvbWlzL3NlY3Rvci1ncmFwaC1wb3BvdmVyLmh0bWwnLCB7XG4gICAgICAgICAgICBzY29wZTogdGhhdC4kc2NvcGVcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbihwb3BvdmVyKSB7XG4gICAgICAgICAgICB0aGF0LnBvcG92ZXJzaG93biA9IHRydWU7XG4gICAgICAgICAgICB0aGF0LmdyYXBocG9wb3ZlciA9IHBvcG92ZXI7XG4gICAgICAgICAgICB0aGF0LmdyYXBocG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNhbGxTZWN0b3JDYXJyaWVyQW5hbHlzaXMgKCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHZhciByZXFkYXRhID0ge1xuICAgICAgICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgICAgIGluY2x1ZGVTdXJjaGFyZ2U6ICh0aGlzLmhlYWRlci5zdXJjaGFyZ2UpID8gJ1knOidOJyxcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlcm5hbWUsXG4gICAgICAgICAgICB0b2dnbGUxOiAnJyxcbiAgICAgICAgICAgIHRvZ2dsZTI6ICcnLFxuICAgICAgICAgICAgZnVsbERhdGFGbGFnOiAnTidcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcblxuICAgICAgICB0aGlzLm1pc1NlcnZpY2UuZ2V0U2VjdG9yQ2FycmllckFuYWx5c2lzKHJlcWRhdGEpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChkYXRhLnJlc3BvbnNlLnN0YXR1cyA9PT0gXCJzdWNjZXNzXCIpIHtcbiAgICAgICAgICAgICAgICAvLyBmYXYgSXRlbXMgdG8gZGlzcGxheSBpbiBkYXNoYm9hcmRcbiAgICAgICAgICAgICAgICB2YXIganNvbk9iaiA9IGRhdGEucmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goanNvbk9iai5TZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHMsIGZ1bmN0aW9uKHZhbDogYW55LCBpOiBudW1iZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsWydvdGhlcnMnXSA9IHZhbC5pdGVtcy5zcGxpY2UoLTEsIDEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHZhciBzb3J0ZWREYXRhID0gXy5zb3J0QnkoanNvbk9iai5TZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodSkgcmV0dXJuIFt1LmZhdm9yaXRlQ2hhcnRQb3NpdGlvbl07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdmFyIGZhdlNlY3RvckNhcnJpZXJSZXN1bHQgPSBfLmZpbHRlcihzb3J0ZWREYXRhLCBmdW5jdGlvbih1OiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmKHRoYXQuaGVhZGVyLnRhYkluZGV4ID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5TZWN0b3JDYXJyaWVyQW5hbHlzaXNDaGFydHMgPSBmYXZTZWN0b3JDYXJyaWVyUmVzdWx0O1xuICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICB0aGF0LlNlY3RvckNhcnJpZXJBbmFseXNpc0NoYXJ0cyA9IGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzOyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGF0LlNlY3Rvck9yZ0NhcnJpZXJBbmFseXNpc0NoYXJ0cyA9IGpzb25PYmouU2VjdG9yQ2FycmllckFuYWx5c2lzQ2hhcnRzO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgICAgICAgICAgdGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnRXJyb3InLFxuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiAnTm8gRGF0YSBGb3VuZCBGb3IgU2VjdG9yQ2FycmllckFuYWx5c2lzISEhJ1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkb25lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGFyZ2V0QWN0dWFsRmlsdGVyKHRoYXQ6IE1pc0NvbnRyb2xsZXIpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGl0ZW06IGFueSl7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS50b2dnbGUxID09IHRoYXQudG9nZ2xlLnRhcmdldFJldk9yUGF4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2VjdG9yQ2FycmllckZpbHRlcih0aGF0OiBNaXNDb250cm9sbGVyKSB7XG4gICAgICAgdGhhdCA9IHRoaXMudGhhdDtcbiAgICAgICByZXR1cm4gZnVuY3Rpb24oaXRlbTogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS50b2dnbGUxID09IHRoYXQudG9nZ2xlLnNlY3Rvck9yZGVyICYmIGl0ZW0udG9nZ2xlMiA9PSB0aGF0LnRvZ2dsZS5zZWN0b3JSZXZPclBheDsgXG4gICAgICB9XG4gICAgIFxuICAgIH1cblxuICAgIHJldmVudWVBbmFseXNpc0ZpbHRlcihpdGVtOiBhbnkpIHtcbiAgICAgICAgdmFyIHN1cmNoYXJnZUZsYWcgPSAodGhpcy5oZWFkZXIuc3VyY2hhcmdlKSA/IFwiWVwiIDogXCJOXCI7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHN1cmNoYXJnZUZsYWcrJyA6ICcraXRlbSk7XG4gICAgICAgIGlmKCBpdGVtLnN1cmNoYXJnZUZsYWcgPT0gc3VyY2hhcmdlRmxhZykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7IFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBnZXRGbG93bkZhdm9yaXRlcygpIHtcbiAgICAgICAgdGhpcy5jYWxsTWV0cmljU25hcHNob3QoKTtcbiAgICAgICAgdGhpcy5jYWxsVGFyZ2V0VnNBY3R1YWwoKTtcbiAgICAgICAgdGhpcy5jYWxsUmV2ZW51ZUFuYWx5c2lzKCk7XG4gICAgICAgIHRoaXMuY2FsbFJvdXRlUmV2ZW51ZSgpO1xuICAgICAgICB0aGlzLmNhbGxTZWN0b3JDYXJyaWVyQW5hbHlzaXMoKTtcbiAgICB9XG4gICAgc2VsZWN0VGFyZ2V0UmV2T3JQYXgoZGF0YSl7XG4gICAgICAgIGlmKGRhdGEuaG9yQmFyQ2hhcnQgJiYgZGF0YS5saW5lQ2hhcnQpIHtcbiAgICAgICAgICAgIHZhciBiYXJSZXZEYXRhID0gXy5maWx0ZXIodGhpcy50YXJnZXRBY3R1YWxEYXRhLmhvckJhckNoYXJ0LCBmdW5jdGlvbih1OiBhbnkpIHsgXG4gICAgICAgICAgICAgICAgaWYodSkgcmV0dXJuIHUudG9nZ2xlMSAhPSAncGF4Y291bnQnO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgbGluZVJldkRhdGEgPSBfLmZpbHRlcih0aGlzLnRhcmdldEFjdHVhbERhdGEubGluZUNoYXJ0LCBmdW5jdGlvbih1OiBhbnkpIHsgXG4gICAgICAgICAgICAgICAgaWYodSkgcmV0dXJuIHUudG9nZ2xlMSAhPSAncGF4Y291bnQnO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZighYmFyUmV2RGF0YS5sZW5ndGggJiYgIWxpbmVSZXZEYXRhLmxlbmd0aCAmJiB0aGlzLmhlYWRlci50YWJJbmRleCA9PSAwKXtcbiAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZS50YXJnZXRSZXZPclBheCA9ICdwYXhjb3VudCc7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlLnRhcmdldFJldk9yUGF4ID0gJ3JldmVudWUnOyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG4gICAgaW9uaWNMb2FkaW5nU2hvdygpIHtcbiAgICAgICAgdGhpcy4kaW9uaWNMb2FkaW5nLnNob3coe1xuICAgICAgICAgICAgdGVtcGxhdGU6ICc8aW9uLXNwaW5uZXIgY2xhc3M9XCJzcGlubmVyLWNhbG1cIj48L2lvbi1zcGlubmVyPidcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGlvbmljTG9hZGluZ0hpZGUoKSB7XG4gICAgICAgIHRoaXMuJGlvbmljTG9hZGluZy5oaWRlKCk7XG4gICAgfTtcblxuICAgIG9wZW5EcmlsbERvd25Qb3BvdmVyKCRldmVudCxyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCkge1xuICAgICAgICB0aGlzLmRyaWxsVHlwZSA9ICdyb3V0ZSc7XG4gICAgICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgICAgIHRoaXMuZHJpbGx0YWJzID0gWydDb3VudHJ5IExldmVsJywgJ1NlY3RvciBMZXZlbCcsICdGbGlnaHQgTGV2ZWwnLCAnRG9jdW1lbnQgTGV2ZWwnXTtcbiAgICAgICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2NvdW50cnlGcm9tJywnZmxvd25TZWN0b3InLCAnZmxpZ2h0TnVtYmVyJywgJ2RvY3VtZW50IyddO1xuICAgICAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xuICAgICAgICB0aGlzLmRyaWxscG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICAgIHRoaXMub3BlbkRyaWxsRG93bihyZWdpb25EYXRhLHNlbEZpbmRMZXZlbCk7XG4gICAgfTtcblxuICAgIGNsb3Nlc1BvcG92ZXIoKSB7XG4gICAgICAgIHRoaXMuZHJpbGxwb3BvdmVyLmhpZGUoKTtcbiAgICB9O1xuXG4gICAgaXNEcmlsbFJvd1NlbGVjdGVkKGxldmVsLG9iaikge1xuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RlZERyaWxsW2xldmVsXSA9PSBvYmo7XG4gICAgfVxuICAgIHNlYXJjaFJlc3VsdHMgKGxldmVsLG9iaikge1xuICAgICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLmZpbHRlcmVkTGlzdFNlcnZpY2Uuc2VhcmNoZWQodGhpcy5ncm91cHNbbGV2ZWxdLm9yZ0l0ZW1zWzBdLCBvYmouc2VhcmNoVGV4dCwgbGV2ZWwsIHRoaXMuZHJpbGxUeXBlKTtcbiAgICAgICAgaWYgKG9iai5zZWFyY2hUZXh0ID09ICcnKSB7XG4gICAgICAgICAgICB0aGlzLnJlc2V0QWxsKGxldmVsKTsgXG4gICAgICAgICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0ub3JnSXRlbXNbMF07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSAwO1xuICAgICAgICB0aGlzLnBhZ2luYXRpb24obGV2ZWwpOyBcbiAgICB9XG4gICAgcGFnaW5hdGlvbiAobGV2ZWwpIHtcbiAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLkl0ZW1zQnlQYWdlID0gdGhpcy5maWx0ZXJlZExpc3RTZXJ2aWNlLnBhZ2VkKHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSwgdGhpcy5wYWdlU2l6ZSApO1xuICAgIH07XG5cbiAgICBzZXRQYWdlIChsZXZlbCwgcGFnZW5vKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gcGFnZW5vO1xuICAgIH07XG4gICAgbGFzdFBhZ2UobGV2ZWwpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UubGVuZ3RoIC0gMTtcbiAgICB9O1xuICAgIHJlc2V0QWxsKGxldmVsKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcbiAgICB9XG4gICAgc29ydChzb3J0QnksbGV2ZWwsb3JkZXIpIHtcbiAgICAgICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XG4gICAgICAgIHRoaXMuY29sdW1uVG9PcmRlciA9IHNvcnRCeTsgXG4gICAgICAgIC8vJEZpbHRlciAtIFN0YW5kYXJkIFNlcnZpY2VcbiAgICAgICAgdGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdID0gdGhpcy4kZmlsdGVyKCdvcmRlckJ5JykodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLmNvbHVtblRvT3JkZXIsIG9yZGVyKTsgXG4gICAgICAgIHRoaXMucGFnaW5hdGlvbihsZXZlbCk7ICAgIFxuICAgIH07XG4gICAgcmFuZ2UodG90YWwsIGxldmVsKSB7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgdmFyIHN0YXJ0OiBudW1iZXI7XG4gICAgICAgIHN0YXJ0ID0gMDtcbiAgICAgICAgaWYodG90YWwgPiA1KSB7XG4gICAgICAgICAgICBzdGFydCA9IE51bWJlcih0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSkgLSAyO1xuICAgICAgICB9XG4gICAgICAgIGlmKHN0YXJ0IDwgMCkge1xuICAgICAgICAgIHN0YXJ0ID0gMDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgayA9IDE7XG4gICAgICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IHRvdGFsOyBpKyspIHtcbiAgICAgICAgICByZXQucHVzaChpKTtcbiAgICAgICAgICBrKys7XG4gICAgICAgICAgaWYgKGsgPiA2KSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICB0b2dnbGVHcm91cCAoZ3JvdXApIHtcbiAgICAgICAgaWYgKHRoaXMuaXNHcm91cFNob3duKGdyb3VwKSkge1xuICAgICAgICAgICAgdGhpcy5zaG93bkdyb3VwID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2hvd25Hcm91cCA9IGdyb3VwO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlzR3JvdXBTaG93bihncm91cDogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNob3duR3JvdXAgPT0gZ3JvdXA7XG4gICAgfVxuICAgIHRvZ2dsZUNoYXJ0T3JUYWJsZVZpZXcodmFsOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy50b2dnbGUuY2hhcnRPclRhYmxlID0gdmFsO1xuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xuICAgIH1cbiAgICB0b2dnbGVUYXJnZXRWaWV3KHZhbDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLnRhcmdldFZpZXcgPSB2YWw7XG4gICAgICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XG4gICAgfVxuICAgIHRvZ2dsZVJldmVudWVWaWV3KHZhbDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLnJldmVudWVWaWV3ID0gdmFsO1xuICAgICAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xuICAgIH1cbiAgICB0b2dnbGVTZWN0b3JWaWV3KHZhbDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlLnNlY3RvclZpZXcgPSB2YWw7XG4gICAgICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XG4gICAgfVxuXHRydW5SZXBvcnQoY2hhcnRUaXRsZTogc3RyaW5nLG1vbnRoT3JZZWFyOiBzdHJpbmcsZmxvd25Nb250aDogc3RyaW5nKXtcbiAgICAgICAgdmFyIG5ld1RhYjtcbiAgICAgICAgdmFyICB0aGF0ID0gdGhpcztcbiAgICAgICAgdmFyIGlzU2FmYXJpID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdpbmRvdy5IVE1MRWxlbWVudCkuaW5kZXhPZignQ29uc3RydWN0b3InKSA+IDA7XG4gICAgICAgIHZhciBjaGFydE9yVGFibGUgPSBcIlwiO1xuXHRcdGlmKGNoYXJ0VGl0bGUgPT09IFwidGFyZ2V0QWN0dWFsXCIpXG5cdFx0XHRjaGFydE9yVGFibGUgPSB0aGF0LnRvZ2dsZS50YXJnZXRWaWV3O1xuXHRcdGVsc2UgaWYoY2hhcnRUaXRsZSA9PT0gXCJyZXZlbnVlQW5hbHlzaXNcIilcblx0XHRcdGNoYXJ0T3JUYWJsZSA9IHRoYXQudG9nZ2xlLnJldmVudWVWaWV3O1xuXHRcdGVsc2UgaWYoY2hhcnRUaXRsZSA9PT0gXCJzZWN0b3JjYXJyaWVyYW5hbHlzaXNcIilcblx0XHRcdGNoYXJ0T3JUYWJsZSA9IHRoYXQudG9nZ2xlLnNlY3RvclZpZXc7XG5cdFx0ZWxzZVxuXHRcdFx0Y2hhcnRPclRhYmxlID0gdGhhdC50b2dnbGUuY2hhcnRPclRhYmxlO1xuXHRcdFx0XG5cdFx0aWYoY2hhcnRPclRhYmxlID09PSBcImNoYXJ0XCIpe1xuXHRcdFx0IGlmKGlzU2FmYXJpKSBuZXdUYWIgPSB3aW5kb3cub3BlbihcIlwiLCBcIl9zeXN0ZW1cIik7XG5cdFx0XHQvL2lmIG5vIGNvcmRvdmEsIHRoZW4gcnVubmluZyBpbiBicm93c2VyIGFuZCBuZWVkIHRvIHVzZSBkYXRhVVJMIGFuZCBpZnJhbWVcblx0XHRcdGlmICghd2luZG93LmNvcmRvdmEpIHtcblx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdTaG93KCk7XG5cdFx0XHRcdHRoaXMucmVwb3J0U3ZjLnJ1blJlcG9ydERhdGFVUkwoY2hhcnRUaXRsZSxtb250aE9yWWVhcixmbG93bk1vbnRoLHRoYXQuaGVhZGVyLnRhYkluZGV4KVxuXHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKGRhdGFVUkwpIHtcblx0XHRcdFx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuXHRcdFx0XHRcdFx0Ly9zZXQgdGhlIGlmcmFtZSBzb3VyY2UgdG8gdGhlIGRhdGFVUkwgY3JlYXRlZFxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyhkYXRhVVJMKTtcblx0XHRcdFx0XHRcdC8vZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BkZkltYWdlJykuc3JjID0gZGF0YVVSTDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzU2FmYXJpKSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUYWIubG9jYXRpb24gPSBkYXRhVVJMOyAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBcblx0XHRcdFx0XHRcdCB3aW5kb3cub3BlbihkYXRhVVJMLFwiX3N5c3RlbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgXG5cblx0XHRcdFx0XHR9LCBmdW5jdGlvbihlcnJvcikge1xuXHRcdFx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnRXJyb3IgJyk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0Ly9pZiBjb2Ryb3ZhLCB0aGVuIHJ1bm5pbmcgaW4gZGV2aWNlL2VtdWxhdG9yIGFuZCBhYmxlIHRvIHNhdmUgZmlsZSBhbmQgb3BlbiB3LyBJbkFwcEJyb3dzZXJcblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ1Nob3coKTtcblx0XHRcdFx0dGhpcy5yZXBvcnRTdmMucnVuUmVwb3J0QXN5bmMoY2hhcnRUaXRsZSxtb250aE9yWWVhcixmbG93bk1vbnRoLHRoYXQuaGVhZGVyLnRhYkluZGV4KVxuXHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKGZpbGVQYXRoKSB7XG5cdFx0XHRcdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdFx0XHRcdC8vbG9nIHRoZSBmaWxlIGxvY2F0aW9uIGZvciBkZWJ1Z2dpbmcgYW5kIG9vcGVuIHdpdGggaW5hcHBicm93c2VyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVwb3J0IHJ1biBvbiBkZXZpY2UgdXNpbmcgRmlsZSBwbHVnaW4nKTtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdSZXBvcnRDdHJsOiBPcGVuaW5nIFBERiBGaWxlICgnICsgZmlsZVBhdGggKyAnKScpO1xuXHRcdFx0XHRcdFx0dmFyIGxhc3RQYXJ0ID0gZmlsZVBhdGguc3BsaXQoXCIvXCIpLnBvcCgpO1xuXHRcdFx0XHRcdFx0dmFyIGZpbGVOYW1lID0gXCIvbW50L3NkY2FyZC9cIitsYXN0UGFydDtcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRpZihkZXZpY2UucGxhdGZvcm0gIT1cIkFuZHJvaWRcIilcblx0XHRcdFx0XHRcdGZpbGVOYW1lID0gZmlsZVBhdGg7XG5cdFx0XHRcdFx0XHQvL3dpbmRvdy5vcGVuUERGKGZpbGVOYW1lKTtcblx0XHRcdFx0XHRcdC8vZWxzZVxuXHRcdFx0XHRcdFx0Ly93aW5kb3cub3BlbihmaWxlUGF0aCwgJ19ibGFuaycsICdsb2NhdGlvbj1ubyxjbG9zZWJ1dHRvbmNhcHRpb249Q2xvc2UsZW5hYmxlVmlld3BvcnRTY2FsZT15ZXMnKTsqL1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0Y29yZG92YS5wbHVnaW5zLmZpbGVPcGVuZXIyLm9wZW4oXG5cdFx0XHRcdFx0XHRcdGZpbGVOYW1lLCBcblx0XHRcdFx0XHRcdFx0J2FwcGxpY2F0aW9uL3BkZicsIFxuXHRcdFx0XHRcdFx0XHR7IFxuXHRcdFx0XHRcdFx0XHRcdGVycm9yIDogZnVuY3Rpb24oZSkgeyBcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdFcnJvciBzdGF0dXM6ICcgKyBlLnN0YXR1cyArICcgLSBFcnJvciBtZXNzYWdlOiAnICsgZS5tZXNzYWdlKTtcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdHN1Y2Nlc3MgOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZmlsZSBvcGVuZWQgc3VjY2Vzc2Z1bGx5Jyk7ICAgICAgICAgICAgICAgIFxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9LCBmdW5jdGlvbihlcnJvcikge1xuXHRcdFx0XHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnRXJyb3IgJyk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdH1lbHNle1xuXHRcdFx0dGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG5cdFx0XHRcdHRpdGxlOiAnSW5mbycsXG5cdFx0XHRcdGNvbnRlbnQ6ICdEb3dubG9hZCBvcHRpb24gbm90IGF2YWlsYWJsZSBmb3IgdGFibGUgdmlldyEhISdcblx0XHRcdCAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcblx0XHRcdFx0ICBjb25zb2xlLmxvZygnZG9uZScpO1xuXHRcdFx0ICB9KTtcblx0XHR9XG5cdH1cblx0XG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uLy4uL19saWJzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9zZXJ2aWNlcy9PcGVyYXRpb25hbFNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIgLz5cblxuaW50ZXJmYWNlIHRhYk9iamVjdCB7XG4gICAgdGl0bGU6IHN0cmluZyxcbiAgICBuYW1lczogc3RyaW5nLFxuICAgIGljb246IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgdG9nZ2xlT2JqZWN0IHtcbiAgICBtb250aE9yWWVhcjogc3RyaW5nLFxuICAgIG9wZW5PckNsb3NlZDogc3RyaW5nLFxuICAgIGZsaWdodFN0YXR1czogc3RyaW5nLFxuICAgIGZsaWdodFJlYXNvbjogc3RyaW5nLFxuICAgIGNjRXhjZXB0aW9uOiBzdHJpbmdcbn1cblxuaW50ZXJmYWNlIGhlYWRlck9iamVjdCB7XG4gICAgZmxvd25Nb250aDogc3RyaW5nLFxuICAgIHRhYkluZGV4OiBudW1iZXIsXG4gICAgdXNlck5hbWU6IHN0cmluZ1xufVxuXG5jbGFzcyBPcGVyYXRpb25hbEZsb3duQ29udHJvbGxlciB7XG4gIHB1YmxpYyBzdGF0aWMgJGluamVjdCA9IFsnJHN0YXRlJywgJyRzY29wZScsICckaW9uaWNMb2FkaW5nJywgJyRmaWx0ZXInLFxuICAgICdPcGVyYXRpb25hbFNlcnZpY2UnLCAnJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZScsICckdGltZW91dCcsICckd2luZG93JywgJ1JlcG9ydFN2YycsICdGaWx0ZXJlZExpc3RTZXJ2aWNlJywgJ1VzZXJTZXJ2aWNlJywgJyRpb25pY0hpc3RvcnknLCAnR1JBUEhfQ09MT1JTJywgJ1RBQlMnLCAnJGlvbmljUG9wdXAnLCAnJGlvbmljUG9wb3ZlciddO1xuICBwcml2YXRlIHRhYnM6IFt0YWJPYmplY3RdO1xuICBwcml2YXRlIHRvZ2dsZTogdG9nZ2xlT2JqZWN0O1xuICBwcml2YXRlIGhlYWRlcjogaGVhZGVyT2JqZWN0O1xuICBwcml2YXRlIHN1YkhlYWRlcjogYW55O1xuICBwcml2YXRlIGZsaWdodFByb2NTdGF0dXM6IGFueTtcbiAgcHJpdmF0ZSBvcmdmbGlnaHRQcm9jU3RhdHVzOiBhbnk7XG4gIHByaXZhdGUgZmF2RmxpZ2h0UHJvY1Jlc3VsdDogYW55O1xuICBwcml2YXRlIGNhcm91c2VsSW5kZXg6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgZmxpZ2h0Q291bnRSZWFzb246IGFueTtcbiAgcHJpdmF0ZSBvcmdGbGlnaHRDb3VudFJlYXNvbjogYW55O1xuICBwcml2YXRlIGNvdXBvbkNvdW50RXhjZXB0aW9uOiBhbnk7XG4gIHByaXZhdGUgb3JnQ291cG9uQ291bnRFeGNlcHRpb246IGFueTtcbiAgcHJpdmF0ZSBjaGFydHR5cGU6IHN0cmluZztcbiAgcHJpdmF0ZSBncmFwaFR5cGU6IHN0cmluZztcbiAgcHJpdmF0ZSBncmFwaHBvcG92ZXI6IElvbmljLklQb3BvdmVyO1xuICBwcml2YXRlIHBvcG92ZXJzaG93bjogYm9vbGVhbjtcbiAgcHJpdmF0ZSB0aHJlZUJhckNoYXJ0Q29sb3JzOiBbc3RyaW5nXSA9IHRoaXMuR1JBUEhfQ09MT1JTLlRIUkVFX0JBUlNfQ0hBUlQ7XG4gIHByaXZhdGUgZm91ckJhckNoYXJ0Q29sb3JzOiBbc3RyaW5nXSA9IHRoaXMuR1JBUEhfQ09MT1JTLkZPVVJfQkFSU19DSEFSVDtcblxuICBwcml2YXRlIGluZm9wb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcbiAgcHJpdmF0ZSBpbmZvZGF0YTogc3RyaW5nO1xuICBwcml2YXRlIGZsaWdodFByb2NTZWN0aW9uOiBzdHJpbmc7XG4gIHByaXZhdGUgZmxpZ2h0Q291bnRTZWN0aW9uOiBzdHJpbmc7XG4gIHByaXZhdGUgY291cG9uQ291bnRTZWN0aW9uOiBzdHJpbmc7XG4gIHByaXZhdGUgY3VycmVudEluZGV4OiBudW1iZXI7XG5cbiAgcHJpdmF0ZSBwYWdlU2l6ZSA9IDQ7XG4gIHByaXZhdGUgY3VycmVudFBhZ2UgPSBbXTtcbiAgcHJpdmF0ZSBzZWxlY3RlZERyaWxsID0gW107XG4gIHByaXZhdGUgZ3JvdXBzID0gW107XG4gIHByaXZhdGUgY29sdW1uVG9PcmRlcjogc3RyaW5nO1xuICBwcml2YXRlIHNob3duR3JvdXA6IG51bWJlcjtcbiAgcHJpdmF0ZSBkcmlsbFR5cGU6IHN0cmluZztcbiAgcHJpdmF0ZSBkcmlsbEJhckxhYmVsOiBzdHJpbmc7XG4gIHByaXZhdGUgZXhjZXB0aW9uQ2F0ZWdvcnk6IHN0cmluZztcbiAgcHJpdmF0ZSBkcmlsbHRhYnM6IHN0cmluZ1tdO1xuICBwcml2YXRlIGRyaWxsTmFtZTogc3RyaW5nO1xuICBwcml2YXRlIGZpcnN0Q29sdW1uczogc3RyaW5nW107XG4gIHByaXZhdGUgZHJpbGxwb3BvdmVyOiBJb25pYy5JUG9wb3ZlcjtcbiAgXG4gIHByaXZhdGUgZmxpZ2h0UHJvY0xlZ2VuZHM6IGFueTtcbiAgcHJpdmF0ZSBmbGlnaHRSZWFzb25MZWdlbmRzOiBhbnk7XG4gIHByaXZhdGUgZmxpZ2h0Q291cG9uTGVnZW5kczogYW55O1xuICBwcml2YXRlIGZvcm1hdDogYW55ID0gZDMuZm9ybWF0KCcsLjBmJyk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSwgcHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSxcbiAgICBwcml2YXRlICRpb25pY0xvYWRpbmc6IElvbmljLklMb2FkaW5nLCBwcml2YXRlICRmaWx0ZXI6IG5nLklGaWx0ZXJTZXJ2aWNlLFxuICAgIHByaXZhdGUgb3BlcmF0aW9uYWxTZXJ2aWNlOiBPcGVyYXRpb25hbFNlcnZpY2UsXG4gICAgcHJpdmF0ZSAkaW9uaWNTbGlkZUJveERlbGVnYXRlOiBJb25pYy5JU2xpZGVCb3hEZWxlZ2F0ZSxcbiAgICBwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsXG4gICAgcHJpdmF0ZSByZXBvcnRTdmM6IFJlcG9ydFN2YywgcHJpdmF0ZSBmaWx0ZXJlZExpc3RTZXJ2aWNlOiBGaWx0ZXJlZExpc3RTZXJ2aWNlLFxuICAgIHByaXZhdGUgdXNlclNlcnZpY2U6IFVzZXJTZXJ2aWNlLCBwcml2YXRlICRpb25pY0hpc3Rvcnk6IGFueSwgcHJpdmF0ZSBHUkFQSF9DT0xPUlM6IHN0cmluZywgcHJpdmF0ZSBUQUJTOiBzdHJpbmcsIHByaXZhdGUgJGlvbmljUG9wdXA6IElvbmljLklQb3B1cCxcbiAgICBwcml2YXRlICRpb25pY1BvcG92ZXI6IElvbmljLklQb3BvdmVyKSB7XG4gICAgICBcbiAgICB0aGlzLnRhYnMgPSB0aGlzLlRBQlMuREIyX1RBQlM7XG5cbiAgICB0aGlzLnRvZ2dsZSA9IHtcbiAgICAgIG1vbnRoT3JZZWFyOiAnbW9udGgnLFxuICAgICAgb3Blbk9yQ2xvc2VkOiAnT1BFTicsXG4gICAgICBmbGlnaHRTdGF0dXM6ICdjaGFydCcsXG4gICAgICBmbGlnaHRSZWFzb246ICdjaGFydCcsXG4gICAgICBjY0V4Y2VwdGlvbjogJ2NoYXJ0J1xuICAgIH07XG5cbiAgICB0aGlzLmhlYWRlciA9IHtcbiAgICAgIGZsb3duTW9udGg6ICcnLFxuICAgICAgdGFiSW5kZXg6IDAsXG4gICAgICB1c2VyTmFtZTogJydcbiAgICB9O1xuXHRpZiAodGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZSkgeyBcblx0XHR0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NvbnRyb2xsZXInLCAnT0ZTJyk7XG5cdH1cbiAgYW5ndWxhci5lbGVtZW50KHdpbmRvdykuYmluZCgnb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLm9yaWVudGF0aW9uQ2hhbmdlKTsgXG4gICAgdGhpcy5pbml0RGF0YSgpO1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgICAgdGhpcy4kc2NvcGUuJG9uKCdvbk9QUlNsaWRlTW92ZScsIChldmVudDogYW55LCByZXNwb25zZTogYW55KSA9PiB7XG4gICAgICAgIGlmKHRoaXMuJHN0YXRlLmN1cnJlbnQubmFtZSA9PSAnYXBwLm9wZXJhdGlvbmFsLWZsb3duJyl7XG4gICAgICAgICAgdGhhdC4kc2NvcGUuT3ByQ3RybC5vblNsaWRlTW92ZShyZXNwb25zZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLiRzY29wZS4kb24oJyRpb25pY1ZpZXcuZW50ZXInLCAoKSA9PiB7XG4gICAgICAgIGlmICghdGhhdC51c2VyU2VydmljZS5zaG93RGFzaGJvYXJkKCdPcGVyYXRpb25hbCcpKSB7XG4gICAgICAgICAgdGhhdC4kc3RhdGUuZ28oXCJsb2dpblwiKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuJHNjb3BlLiRvbignb3BlbkRyaWxsUG9wdXAxJywgKGV2ZW50OiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UudHlwZSk7XG4gICAgICAgIGlmIChyZXNwb25zZS50eXBlID09ICdmbGlnaHQtcHJvY2VzcycpIHtcbiAgICAgICAgICB0aGlzLiRzY29wZS5PcHJDdHJsLm9wZW5GbGlnaHRQcm9jZXNzRHJpbGxQb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT0gJ2NvdXBvbi1jb3VudCcpIHtcbiAgICAgICAgICB0aGlzLiRzY29wZS5PcHJDdHJsLm9wZW5Db3VucG9uQ291bnREcmlsbFBvcG92ZXIocmVzcG9uc2UuZXZlbnQsIHsgXCJwb2ludFwiOiByZXNwb25zZS5kYXRhIH0sIC0xKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzcG9uc2UudHlwZSA9PSAnZmxpZ2h0LWNvdW50Jykge1xuICAgICAgICAgIHRoaXMuJHNjb3BlLk9wckN0cmwub3BlbkZsaWdodENvdW50RHJpbGxQb3BvdmVyKHJlc3BvbnNlLmV2ZW50LCB7IFwicG9pbnRcIjogcmVzcG9uc2UuZGF0YSB9LCAtMSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cbiAgaW5pdERhdGEoKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGlmICh0aGlzLiRpb25pY1BvcG92ZXIpIHtcbiAgICAgIGlmIChPYmplY3Qua2V5cyh0aGlzLiRpb25pY1BvcG92ZXIpLmxlbmd0aCkge1xuICAgICAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL2RyaWxkb3duLmh0bWwnLCB7XG4gICAgICAgICAgc2NvcGU6IHRoYXQuJHNjb3BlLFxuICAgICAgICAgIGFuaW1hdGlvbjogJ25vbmUnXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oZHJpbGxwb3BvdmVyKSB7XG4gICAgICAgICAgdGhhdC5kcmlsbHBvcG92ZXIgPSBkcmlsbHBvcG92ZXI7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9pbmZvdG9vbHRpcC5odG1sJywge1xuICAgICAgICAgIHNjb3BlOiB0aGF0LiRzY29wZSxcbiAgICAgICAgICBhbmltYXRpb246ICdub25lJ1xuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGluZm9wb3BvdmVyKSB7XG4gICAgICAgICAgdGhhdC5pbmZvcG9wb3ZlciA9IGluZm9wb3BvdmVyO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyh0aGlzLiR3aW5kb3cpO1xuICAgIHZhciByZXEgPSB7XG4gICAgICB1c2VySWQ6IHRoaXMuJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmFwaWRNb2JpbGUudXNlcicpXG4gICAgfVxuXG4gICAgaWYgKHJlcS51c2VySWQgIT0gXCJudWxsXCIpIHtcbiAgICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldFBheEZsb3duT3BySGVhZGVyKHJlcSkudGhlbihcbiAgICAgICAgKGRhdGEpID0+IHtcbiAgICAgICAgICB0aGF0LnN1YkhlYWRlciA9IGRhdGEucmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICB0aGF0LmhlYWRlci5mbG93bk1vbnRoID0gdGhhdC5zdWJIZWFkZXIuZGVmYXVsdE1vbnRoO1xuICAgICAgICAgIHRoYXQub25TbGlkZU1vdmUoeyBpbmRleDogMCB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgKGVycm9yKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VyZWQnKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHRoYXQuaGVhZGVyLnVzZXJOYW1lID0gdGhhdC5nZXRQcm9maWxlVXNlck5hbWUoKTtcbiAgfVxuICBzZWxlY3RlZEZsb3duTW9udGgobW9udGg6IHN0cmluZykge1xuICAgIHJldHVybiAobW9udGggPT0gdGhpcy5oZWFkZXIuZmxvd25Nb250aCk7XG4gIH1cblxuICBnZXRQcm9maWxlVXNlck5hbWUoKTogc3RyaW5nIHtcbiAgICBpZiAodGhpcy51c2VyU2VydmljZS5pc1VzZXJMb2dnZWRJbigpKSB7XG4gICAgICB2YXIgb2JqID0gdGhpcy4kd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdyYXBpZE1vYmlsZS51c2VyJyk7XG4gICAgICBpZiAob2JqICE9ICdudWxsJykge1xuICAgICAgICB2YXIgcHJvZmlsZVVzZXJOYW1lID0gSlNPTi5wYXJzZShvYmopO1xuICAgICAgICByZXR1cm4gcHJvZmlsZVVzZXJOYW1lLnVzZXJuYW1lO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBcbiAgb3JpZW50YXRpb25DaGFuZ2UgPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBvYmogPSB0aGlzLiR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NvbnRyb2xsZXInKTtcbiAgICAgIGlmIChvYmogPT09ICdPRlMnKSB7XG5cdFx0dGhhdC4kdGltZW91dChmdW5jdGlvbigpIHtcblx0XHQgIHRoYXQub25TbGlkZU1vdmUoeyBpbmRleDogdGhhdC5oZWFkZXIudGFiSW5kZXggfSk7XG5cdFx0fSwgMjAwKVxuXHR9XG4gIH1cblxuICB1cGRhdGVIZWFkZXIoKSB7XG4gICAgdmFyIGZsb3duTW9udGggPSB0aGlzLmhlYWRlci5mbG93bk1vbnRoO1xuICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XG4gIH1cblxuICBvblNsaWRlTW92ZShkYXRhOiBhbnkpIHtcbiAgICB0aGlzLmhlYWRlci50YWJJbmRleCA9IGRhdGEuaW5kZXg7XG4gICAgaWYodGhpcy5ncmFwaHBvcG92ZXIgPT09IHVuZGVmaW5lZCB8fCB0aGlzLmdyYXBocG9wb3Zlci5pc1Nob3duKCkgPT0gZmFsc2Upe1xuICAgICAgdGhpcy4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhRlMnKS5zbGlkZSgwKTtcbiAgXHQgIHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUoJ29wcmZXZWVrRGF0YUZDJykuc2xpZGUoMCk7XG4gIFx0ICB0aGlzLiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGFDQycpLnNsaWRlKDApO1xuICAgfVxuICAgIHN3aXRjaCAodGhpcy5oZWFkZXIudGFiSW5kZXgpIHtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgdGhpcy5jYWxsTXlEYXNoYm9hcmQoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHRoaXMuY2FsbEZsaWdodFByb2NTdGF0dXMoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHRoaXMuY2FsbEZsaWdodENvdW50QnlSZWFzb24oKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHRoaXMuY2FsbENvdXBvbkNvdW50QnlFeGNlcHRpb24oKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9O1xuICBjYWxsTXlEYXNoYm9hcmQoKSB7XG4gICAgdGhpcy5jYWxsRmxpZ2h0UHJvY1N0YXR1cygpO1xuICAgIHRoaXMuY2FsbEZsaWdodENvdW50QnlSZWFzb24oKTtcbiAgICB0aGlzLmNhbGxDb3Vwb25Db3VudEJ5RXhjZXB0aW9uKCk7XG4gIH1cbiAgY2FsbEZsaWdodFByb2NTdGF0dXMoKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciByZXFkYXRhID0ge1xuICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlck5hbWUsXG4gICAgICB0b2dnbGUxOiAnJyxcbiAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXG4gICAgfTtcblxuICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuICAgIHRoaXMub3BlcmF0aW9uYWxTZXJ2aWNlLmdldE9wckZsaWdodFByb2NTdGF0dXMocmVxZGF0YSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRpZihkYXRhLnJlc3BvbnNlLnN0YXR1cyA9PT0gXCJzdWNjZXNzXCIgJiYgZGF0YS5yZXNwb25zZS5kYXRhLmhhc093blByb3BlcnR5KCdzZWN0aW9uTmFtZScpKXtcdFx0ICBcblx0XHRcdHZhciBqc29uT2JqID0gdGhhdC5hcHBseUNoYXJ0Q29sb3JDb2RlcyhkYXRhLnJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0dGhhdC5mbGlnaHRQcm9jU2VjdGlvbiA9IGpzb25PYmouc2VjdGlvbk5hbWU7XG4gICAgICB0aGF0LmZsaWdodFByb2NMZWdlbmRzID0gZGF0YS5yZXNwb25zZS5kYXRhLmxlZ2VuZHMudmFsdWVzO1xuICAgICAgY29uc29sZS5sb2codGhhdC5mbGlnaHRQcm9jTGVnZW5kcyk7XG5cbiAgICAgIHRoYXQub3JnZmxpZ2h0UHJvY1N0YXR1cyA9IHtcbiAgICAgICAgcGllQ2hhcnQ6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxuICAgICAgICB3ZWVrRGF0YToganNvbk9iai5tdWx0aWJhckNoYXJ0c1swXSxcbiAgICAgICAgc3RhY2tlZENoYXJ0OiBqc29uT2JqLnN0YWNrZWRCYXJDaGFydHNbMF1cbiAgICAgICAgfVxuXG4gICAgICBpZiAodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xuICAgICAgICB0aGF0LmZsaWdodFByb2NTdGF0dXMgPSB0aGF0LmdldEZhdm9yaXRlSXRlbXMoanNvbk9iaik7XG5cdFx0XHR9IGVsc2Uge1xuICAgICAgICB0aGF0LmZsaWdodFByb2NTdGF0dXMgPSB7XG4gICAgICAgIHBpZUNoYXJ0OiBqc29uT2JqLnBpZUNoYXJ0c1swXSxcbiAgICAgICAgd2Vla0RhdGE6IGpzb25PYmoubXVsdGliYXJDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zLFxuICAgICAgICBzdGFja2VkQ2hhcnQ6IGpzb25PYmouc3RhY2tlZEJhckNoYXJ0c1swXS5zdGFja2VkQmFyY2hhcnRJdGVtc1xuICAgICAgICB9O1xuXHRcdFx0fVxuICAgICAgXG5cdFx0XHR0aGF0LiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0ICB0aGF0LiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGFGUycpLnVwZGF0ZSgpO1xuXHRcdFx0fSwgMCk7XG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHR9ZWxzZXtcblx0XHRcdHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuXHRcdFx0dGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG5cdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxuXHRcdFx0XHRjb250ZW50OiAnRGF0YSBub3QgZm91bmQgZm9yIEZsaWdodHMgUHJvY2Vzc2luZyBTdGF0dXMhISEnXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZG9uZScpO1xuXHRcdFx0fSk7XG5cblx0XHR9XG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgfSk7XG4gIH1cbiAgY2FsbEZsaWdodENvdW50QnlSZWFzb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciByZXFkYXRhID0ge1xuICAgICAgZmxvd25Nb250aDogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgIHVzZXJJZDogdGhpcy5oZWFkZXIudXNlck5hbWUsXG4gICAgICB0b2dnbGUxOiB0aGlzLnRvZ2dsZS5vcGVuT3JDbG9zZWQudG9Mb3dlckNhc2UoKSxcbiAgICAgIGZ1bGxEYXRhRmxhZzogJ04nXG4gICAgfTtcbiAgICB0aGlzLmlvbmljTG9hZGluZ1Nob3coKTtcbiAgICB0aGlzLm9wZXJhdGlvbmFsU2VydmljZS5nZXRPcHJGbGlnaHRDb3VudEJ5UmVhc29uKHJlcWRhdGEpXG4gICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICBpZiAoZGF0YS5yZXNwb25zZS5zdGF0dXMgPT09IFwic3VjY2Vzc1wiICYmIGRhdGEucmVzcG9uc2UuZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc2VjdGlvbk5hbWUnKSkge1x0XG5cdFx0XHQvLyBjb25zb2xlLmxvZyhqc29uT2JqLnBpZUNoYXJ0c1swXSk7XG4gICAgICB0aGF0LmZsaWdodFJlYXNvbkxlZ2VuZHMgPSBkYXRhLnJlc3BvbnNlLmRhdGEubGVnZW5kcztcbiAgICAgIHZhciBqc29uT2JqID0gdGhhdC5hcHBseUNoYXJ0Q29sb3JDb2RlcyhkYXRhLnJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0dGhhdC5mbGlnaHRDb3VudFNlY3Rpb24gPSBqc29uT2JqLnNlY3Rpb25OYW1lO1xuXG4gICAgICB0aGF0Lm9yZ0ZsaWdodENvdW50UmVhc29uID0ge1xuICAgICAgICBwaWVDaGFydDoganNvbk9iai5waWVDaGFydHNbMF0sXG4gICAgICAgIHdlZWtEYXRhOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzBdLFxuICAgICAgICBzdGFja2VkQ2hhcnQ6IGpzb25PYmouc3RhY2tlZEJhckNoYXJ0c1swXVxuICAgICAgICB9XG5cblx0XHRcdGlmICh0aGF0LmhlYWRlci50YWJJbmRleCA9PSAwKSB7XG5cdFx0XHQgIHRoYXQuZmxpZ2h0Q291bnRSZWFzb24gPSB0aGF0LmdldEZhdm9yaXRlSXRlbXMoanNvbk9iaik7XG5cdFx0XHR9IGVsc2Uge1xuICAgICAgICB0aGF0LmZsaWdodENvdW50UmVhc29uID0ge1xuICAgICAgICBwaWVDaGFydDoganNvbk9iai5waWVDaGFydHNbMF0sXG4gICAgICAgIHdlZWtEYXRhOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzBdLm11bHRpYmFyQ2hhcnRJdGVtcyxcbiAgICAgICAgc3RhY2tlZENoYXJ0OiBqc29uT2JqLnN0YWNrZWRCYXJDaGFydHNbMF0uc3RhY2tlZEJhcmNoYXJ0SXRlbXNcbiAgICAgICAgfTtcblx0XHRcdH1cbmNvbnNvbGUubG9nKHRoYXQub3JnRmxpZ2h0Q291bnRSZWFzb24pO1xuXHRcdFx0dGhhdC4kdGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdCAgdGhhdC4kaW9uaWNTbGlkZUJveERlbGVnYXRlLiRnZXRCeUhhbmRsZSgnb3ByZldlZWtEYXRhRkMnKS51cGRhdGUoKTtcblx0XHRcdH0sIDApO1xuXHRcdFx0dGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0fWVsc2V7XG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgIHRoYXQuJGlvbmljUG9wdXAuYWxlcnQoe1xuICAgICAgICB0aXRsZTogJ0Vycm9yJyxcbiAgICAgICAgY29udGVudDogJ0RhdGEgbm90IGZvdW5kIGZvciBGbGlnaHRzIENvdW50IGJ5IFJlYXNvbiEhISdcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2RvbmUnKTtcbiAgICAgIH0pO1xuXG5cdFx0fVxuICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICB9KTtcbiAgfVxuXG4gIGNhbGxDb3Vwb25Db3VudEJ5RXhjZXB0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcmVxZGF0YSA9IHtcbiAgICAgIGZsb3duTW9udGg6IHRoaXMuaGVhZGVyLmZsb3duTW9udGgsXG4gICAgICB1c2VySWQ6IHRoaXMuaGVhZGVyLnVzZXJOYW1lLFxuICAgICAgdG9nZ2xlMTogJycsXG4gICAgICBmdWxsRGF0YUZsYWc6ICdOJ1xuICAgIH07XG4gICAgdGhpcy5pb25pY0xvYWRpbmdTaG93KCk7XG4gICAgdGhpcy5vcGVyYXRpb25hbFNlcnZpY2UuZ2V0T3ByQ291cG9uQ291bnRCeUV4Y2VwdGlvbihyZXFkYXRhKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgaWYgKGRhdGEucmVzcG9uc2Uuc3RhdHVzID09PSBcInN1Y2Nlc3NcIiAmJiBkYXRhLnJlc3BvbnNlLmRhdGEuaGFzT3duUHJvcGVydHkoJ3NlY3Rpb25OYW1lJykpIHtcblx0XHRcdHZhciBqc29uT2JqID0gdGhhdC5hcHBseUNoYXJ0Q29sb3JDb2RlcyhkYXRhLnJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0dGhhdC5jb3Vwb25Db3VudFNlY3Rpb24gPSBqc29uT2JqLnNlY3Rpb25OYW1lO1xuICAgICAgICAgdGhhdC5mbGlnaHRDb3Vwb25MZWdlbmRzID0gZGF0YS5yZXNwb25zZS5kYXRhLmxlZ2VuZHMudmFsdWVzO1xuXG4gICAgIHRoYXQub3JnQ291cG9uQ291bnRFeGNlcHRpb24gPSB7XG4gICAgICAgcGllQ2hhcnQ6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxuICAgICAgIHdlZWtEYXRhOiBqc29uT2JqLm11bHRpYmFyQ2hhcnRzWzBdLFxuICAgICAgIHN0YWNrZWRDaGFydDoganNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdXG4gICAgIH07XG5cbiAgICAgICAgXHRpZiAodGhhdC5oZWFkZXIudGFiSW5kZXggPT0gMCkge1xuXHRcdFx0ICB0aGF0LmNvdXBvbkNvdW50RXhjZXB0aW9uID0gdGhhdC5nZXRGYXZvcml0ZUl0ZW1zKGpzb25PYmopO1xuXHRcdFx0fSBlbHNlIHtcbiAgICAgICAgdGhhdC5jb3Vwb25Db3VudEV4Y2VwdGlvbiA9IHtcbiAgICAgICAgcGllQ2hhcnQ6IGpzb25PYmoucGllQ2hhcnRzWzBdLFxuICAgICAgICB3ZWVrRGF0YToganNvbk9iai5tdWx0aWJhckNoYXJ0c1swXS5tdWx0aWJhckNoYXJ0SXRlbXMsXG4gICAgICAgIHN0YWNrZWRDaGFydDoganNvbk9iai5zdGFja2VkQmFyQ2hhcnRzWzBdLnN0YWNrZWRCYXJjaGFydEl0ZW1zXG4gICAgICAgIH07XG5cdFx0XHR9XG5cdFx0XHR0aGF0LiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0ICB0aGF0LiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKCdvcHJmV2Vla0RhdGFDQycpLnVwZGF0ZSgpO1xuXHRcdFx0fSwgMCk7XG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcdFx0XG5cdFx0fWVsc2V7XG5cdFx0XHR0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgIHRoYXQuJGlvbmljUG9wdXAuYWxlcnQoe1xuICAgICAgICB0aXRsZTogJ0Vycm9yJyxcbiAgICAgICAgY29udGVudDogJ0RhdGEgbm90IGZvdW5kIGZvciBDb3Vwb24gQ291bnQgYnkgRXhjZXB0aW9uIENhdGVnb3J5ISEhJ1xuICAgICAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZG9uZScpO1xuICAgICAgfSk7XG5cblx0XHR9XG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcbiAgICAgIH0pO1xuICB9XG4gIG9wZW5Qb3BvdmVyKCRldmVudCwgY2hhcnR0eXBlLCBpbmRleCxvcHJmV2Vla0RhdGEpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHRlbXAgPSB0aGlzLiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKG9wcmZXZWVrRGF0YSk7XG4gICAgdGhhdC5jdXJyZW50SW5kZXggPSB0ZW1wLmN1cnJlbnRJbmRleCgpO1xuICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHRoaXMuY2hhcnR0eXBlID0gY2hhcnR0eXBlO1xuICAgIHRoaXMuZ3JhcGhUeXBlID0gaW5kZXg7XG4gICAgdGhpcy4kaW9uaWNQb3BvdmVyLmZyb21UZW1wbGF0ZVVybCgnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9ncmFwaC1wb3BvdmVyLmh0bWwnLCB7XG4gICAgICBzY29wZTogdGhhdC4kc2NvcGVcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHBvcG92ZXIpIHtcbiAgICAgIHRoYXQucG9wb3ZlcnNob3duID0gdHJ1ZTtcbiAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcbiAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICB9KTtcbiAgfVxuICBvcGVuUGllUG9wb3ZlcigkZXZlbnQsIGNoYXJ0dHlwZSwgaW5kZXgpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdGhpcy5jaGFydHR5cGUgPSBjaGFydHR5cGU7XG4gICAgdGhpcy5ncmFwaFR5cGUgPSBpbmRleDtcbiAgICB0aGlzLiRpb25pY1BvcG92ZXIuZnJvbVRlbXBsYXRlVXJsKCdjb21wb25lbnRzL29wZXJhdGlvbmFsL2Zsb3duL3BpZS1wb3BvdmVyLmh0bWwnLCB7XG4gICAgICBzY29wZTogdGhhdC4kc2NvcGVcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHBvcG92ZXIpIHtcbiAgICAgIHRoYXQucG9wb3ZlcnNob3duID0gdHJ1ZTtcbiAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyID0gcG9wb3ZlcjtcbiAgICAgIHRoYXQuZ3JhcGhwb3BvdmVyLnNob3coJGV2ZW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNsb3NlUG9wb3ZlcigpIHtcbiAgICB0aGlzLmdyYXBocG9wb3Zlci5oaWRlKCk7XG4gIH07XG4gIGlvbmljTG9hZGluZ1Nob3coKSB7XG4gICAgdGhpcy4kaW9uaWNMb2FkaW5nLnNob3coe1xuICAgICAgdGVtcGxhdGU6ICc8aW9uLXNwaW5uZXIgY2xhc3M9XCJzcGlubmVyLWNhbG1cIj48L2lvbi1zcGlubmVyPidcbiAgICB9KTtcbiAgfTtcbiAgYXBwbHlDaGFydENvbG9yQ29kZXMoanNvbk9iajogYW55KSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIF8uZm9yRWFjaChqc29uT2JqLnBpZUNoYXJ0c1swXS5kYXRhLCBmdW5jdGlvbihuOiBhbnksIHZhbHVlOiBhbnkpIHtcbiAgICAgIG4ubGFiZWwgPSBuLnh2YWw7XG4gICAgICBuLnZhbHVlID0gbi55dmFsO1xuICAgICAgbi5jb2xvciA9IHRoYXQuR1JBUEhfQ09MT1JTLkRCX1RXT19QSUVfQ09MT1JTMVt2YWx1ZV1cbiAgICAgIGNvbnNvbGUubG9nKHZhbHVlKTtcbiAgICB9KTtcbiAgIC8vIF8ubWVyZ2UoanNvbk9iai5waWVDaGFydHNbMF0uZGF0YSwgdGhpcy5HUkFQSF9DT0xPUlMuREJfVFdPX1BJRV9DT0xPUlMxKTsgXG4gICAgcmV0dXJuIGpzb25PYmo7XG4gIH1cbiAgZ2V0RmF2b3JpdGVJdGVtcyhqc29uT2JqOiBhbnkpIHtcbiAgICB2YXIgcGllQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5waWVDaGFydHMsIGZ1bmN0aW9uKHU6IGFueSkge1xuICAgICAgaWYgKHUpIHJldHVybiB1LmZhdm9yaXRlSW5kID09ICdZJztcbiAgICB9KTtcbiAgICB2YXIgbXVsdGlDaGFydHMgPSBfLmZpbHRlcihqc29uT2JqLm11bHRpYmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcbiAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG4gICAgfSk7XG4gICAgdmFyIHN0YWNrQ2hhcnRzID0gXy5maWx0ZXIoanNvbk9iai5zdGFja2VkQmFyQ2hhcnRzLCBmdW5jdGlvbih1OiBhbnkpIHtcbiAgICAgIGlmICh1KSByZXR1cm4gdS5mYXZvcml0ZUluZCA9PSAnWSc7XG4gICAgfSk7XG4gICAgLy8gY29uc29sZS5sb2coanNvbk9iaik7XG4gICAgLy8gY29uc29sZS5sb2cobXVsdGlDaGFydHNbMF0pO1xuICAgIHJldHVybiB7XG4gICAgICBwaWVDaGFydDogcGllQ2hhcnRzWzBdLFxuICAgICAgd2Vla0RhdGE6IChtdWx0aUNoYXJ0cy5sZW5ndGgpID8gbXVsdGlDaGFydHNbMF0ubXVsdGliYXJDaGFydEl0ZW1zIDogW10sXG4gICAgICBzdGFja2VkQ2hhcnQ6IChzdGFja0NoYXJ0cy5sZW5ndGgpID8gc3RhY2tDaGFydHNbMF0uc3RhY2tlZEJhcmNoYXJ0SXRlbXMgOiBbXVxuICAgIH1cbiAgfVxuXG4gIGNvbG9yRnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHJldHVybiBmdW5jdGlvbihkLCBpKSB7XG4gICAgICByZXR1cm4gdGhhdC50aHJlZUJhckNoYXJ0Q29sb3JzW2ldO1xuICAgIH07XG4gIH1cbiAgZm91ckJhckNvbG9yRnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHJldHVybiBmdW5jdGlvbihkLCBpKSB7XG4gICAgICByZXR1cm4gdGhhdC5mb3VyQmFyQ2hhcnRDb2xvcnNbaV07XG4gICAgfTtcbiAgfVxuICB2YWx1ZUZvcm1hdEZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24oZCkge1xuICAgICAgcmV0dXJuIGQzLmZvcm1hdChcIixcIikoZCk7XG4gICAgfVxuICB9XG4gIHRvb2xUaXBDb250ZW50RnVuY3Rpb24oKXtcbiAgICByZXR1cm4gZnVuY3Rpb24oa2V5LCB4LCB5LCBlLCBncmFwaCkge1xuICAgICAgcmV0dXJuIGtleSArJyAnKyBNYXRoLmNlaWwoeSkgKyAnIGF0ICcgKyB4XG4gICAgfVxuICB9XG4gIHlBeGlzVGlja0Zvcm1hdEZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQpe1xuICAgICAgcmV0dXJuIGQzLmZvcm1hdChcIixcIikoZCk7XG4gICAgfVxuICB9XG4gIG9wZW5pbmZvUG9wb3ZlcigkZXZlbnQsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBpbmRleCA9PSBcInVuZGVmaW5lZFwiIHx8IGluZGV4ID09IFwiXCIpIHtcbiAgICAgIHRoaXMuaW5mb2RhdGEgPSAnTm8gaW5mbyBhdmFpbGFibGUnO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuaW5mb2RhdGEgPSBpbmRleDtcbiAgICB9XG4gICAgY29uc29sZS5sb2coaW5kZXgpO1xuICAgIHRoaXMuaW5mb3BvcG92ZXIuc2hvdygkZXZlbnQpO1xuICB9O1xuICBjbG9zZUluZm9Qb3BvdmVyKCkge1xuICAgIHRoaXMuaW5mb3BvcG92ZXIuaGlkZSgpO1xuICB9XG4gIHRvZ2dsZUNvdW50KHZhbCkge1xuICAgIHRoaXMudG9nZ2xlLm9wZW5PckNsb3NlZCA9IHZhbDtcbiAgICB0aGlzLm9uU2xpZGVNb3ZlKHsgaW5kZXg6IHRoaXMuaGVhZGVyLnRhYkluZGV4IH0pO1xuICB9XG4gIGlvbmljTG9hZGluZ0hpZGUoKSB7XG4gICAgdGhpcy4kaW9uaWNMb2FkaW5nLmhpZGUoKTtcbiAgfTtcbiAgdGFiTG9ja1NsaWRlKHRhYm5hbWU6IHN0cmluZykge1xuICAgIHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUodGFibmFtZSkuZW5hYmxlU2xpZGUoZmFsc2UpO1xuICB9XG4gIHdlZWtEYXRhUHJldihvcHJmV2Vla0RhdGE6IGFueSkge1xuICAgIHRoaXMuJGlvbmljU2xpZGVCb3hEZWxlZ2F0ZS4kZ2V0QnlIYW5kbGUob3ByZldlZWtEYXRhKS5wcmV2aW91cygpO1xuICB9O1xuICB3ZWVrRGF0YU5leHQob3ByZldlZWtEYXRhOiBhbnkpIHtcbiAgICB0aGlzLiRpb25pY1NsaWRlQm94RGVsZWdhdGUuJGdldEJ5SGFuZGxlKG9wcmZXZWVrRGF0YSkubmV4dCgpO1xuICB9XG4gIHRvZ2dsZUZsaWdodFN0YXR1c1ZpZXcodmFsOiBzdHJpbmcpIHtcbiAgICB0aGlzLnRvZ2dsZS5mbGlnaHRTdGF0dXMgPSB2YWw7XG4gICAgdGhpcy5vblNsaWRlTW92ZSh7IGluZGV4OiB0aGlzLmhlYWRlci50YWJJbmRleCB9KTtcbiAgfVxuICB0b2dnbGVGbGlnaHRSZWFzb25WaWV3KHZhbDogc3RyaW5nKSB7XG4gICAgdGhpcy50b2dnbGUuZmxpZ2h0UmVhc29uID0gdmFsO1xuICAgIGlmICh0aGlzLnRvZ2dsZS5mbGlnaHRSZWFzb24gPT0gXCJjaGFydFwiKVxuICAgIHRoaXMub25TbGlkZU1vdmUoeyBpbmRleDogdGhpcy5oZWFkZXIudGFiSW5kZXggfSk7XG4gIH1cbiAgdG9nZ2xlQ0NFeGNlcHRpb25WaWV3KHZhbDogc3RyaW5nKSB7XG4gICAgdGhpcy50b2dnbGUuY2NFeGNlcHRpb24gPSB2YWw7XG4gICAgdGhpcy5vblNsaWRlTW92ZSh7IGluZGV4OiB0aGlzLmhlYWRlci50YWJJbmRleCB9KTtcbiAgfSAgIFxuICBydW5SZXBvcnQoY2hhcnRUaXRsZTogc3RyaW5nLCBtb250aE9yWWVhcjogc3RyaW5nLCBmbG93bk1vbnRoOiBzdHJpbmcpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7IHZhciBuZXdUYWI7XG4gICAgdmFyIGlzU2FmYXJpID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdpbmRvdy5IVE1MRWxlbWVudCkuaW5kZXhPZignQ29uc3RydWN0b3InKSA+IDA7XG5cdHZhciBjaGFydE9yVGFibGUgPSBcIlwiO1xuXHRcdGlmKGNoYXJ0VGl0bGUgPT09IFwiZnBTdGF0dXNcIilcblx0XHRcdGNoYXJ0T3JUYWJsZSA9IHRoYXQudG9nZ2xlLmZsaWdodFN0YXR1cztcblx0XHRlbHNlIGlmKGNoYXJ0VGl0bGUgPT09IFwiZmNSZWFzb25cIilcblx0XHRcdGNoYXJ0T3JUYWJsZSA9IHRoYXQudG9nZ2xlLmZsaWdodFJlYXNvbjtcblx0XHRlbHNlIGlmKGNoYXJ0VGl0bGUgPT09IFwiY2NFeGNlcHRpb25cIilcblx0XHRcdGNoYXJ0T3JUYWJsZSA9IHRoYXQudG9nZ2xlLmNjRXhjZXB0aW9uO1xuXHRcblx0XHRpZihjaGFydE9yVGFibGUgPT09IFwiY2hhcnRcIil7XG5cdFx0aWYgKGlzU2FmYXJpKSBuZXdUYWIgPSB3aW5kb3cub3BlbihcIlwiLCBcIl9zeXN0ZW1cIik7XG5cdFx0Ly9pZiBubyBjb3Jkb3ZhLCB0aGVuIHJ1bm5pbmcgaW4gYnJvd3NlciBhbmQgbmVlZCB0byB1c2UgZGF0YVVSTCBhbmQgaWZyYW1lXG5cdFx0aWYgKCF3aW5kb3cuY29yZG92YSkge1xuXHRcdCAgdGhhdC5pb25pY0xvYWRpbmdTaG93KCk7XG5cdFx0ICB0aGlzLnJlcG9ydFN2Yy5ydW5SZXBvcnREYXRhVVJMKGNoYXJ0VGl0bGUsIG1vbnRoT3JZZWFyLCBmbG93bk1vbnRoKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24oZGF0YVVSTCkge1xuXHRcdFx0ICB0aGF0LmlvbmljTG9hZGluZ0hpZGUoKTtcblx0XHRcdCAgLy9zZXQgdGhlIGlmcmFtZSBzb3VyY2UgdG8gdGhlIGRhdGFVUkwgY3JlYXRlZFxuXHRcdFx0ICAvL2NvbnNvbGUubG9nKGRhdGFVUkwpO1xuXHRcdFx0ICAvL2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwZGZJbWFnZScpLnNyYyA9IGRhdGFVUkw7XG4gICAgICAgIGlmIChpc1NhZmFyaSlcbiAgICAgICAgICBuZXdUYWIubG9jYXRpb24gPSBkYXRhVVJMO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgd2luZG93Lm9wZW4oZGF0YVVSTCwgXCJfc3lzdGVtXCIpO1xuXHRcdFx0fSwgZnVuY3Rpb24oZXJyb3IpIHtcblx0XHRcdCAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHQgIGNvbnNvbGUubG9nKCdFcnJvciAnKTtcblx0XHRcdH0pO1xuXHRcdCAgcmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdC8vaWYgY29kcm92YSwgdGhlbiBydW5uaW5nIGluIGRldmljZS9lbXVsYXRvciBhbmQgYWJsZSB0byBzYXZlIGZpbGUgYW5kIG9wZW4gdy8gSW5BcHBCcm93c2VyXG5cdFx0ZWxzZSB7XG5cdFx0ICB0aGF0LmlvbmljTG9hZGluZ1Nob3coKTtcblx0XHQgIHRoaXMucmVwb3J0U3ZjLnJ1blJlcG9ydEFzeW5jKGNoYXJ0VGl0bGUsIG1vbnRoT3JZZWFyLCBmbG93bk1vbnRoKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24oZmlsZVBhdGgpIHtcblx0XHRcdCAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG5cdFx0XHQgIC8vbG9nIHRoZSBmaWxlIGxvY2F0aW9uIGZvciBkZWJ1Z2dpbmcgYW5kIG9vcGVuIHdpdGggaW5hcHBicm93c2VyXG5cdFx0XHQgIGNvbnNvbGUubG9nKCdyZXBvcnQgcnVuIG9uIGRldmljZSB1c2luZyBGaWxlIHBsdWdpbicpO1xuXHRcdFx0ICBjb25zb2xlLmxvZygnUmVwb3J0Q3RybDogT3BlbmluZyBQREYgRmlsZSAoJyArIGZpbGVQYXRoICsgJyknKTtcblx0XHRcdCAgdmFyIGxhc3RQYXJ0ID0gZmlsZVBhdGguc3BsaXQoXCIvXCIpLnBvcCgpO1xuXHRcdFx0ICB2YXIgZmlsZU5hbWUgPSBcIi9tbnQvc2RjYXJkL1wiICsgbGFzdFBhcnQ7XG5cdFx0XHQgIGlmIChkZXZpY2UucGxhdGZvcm0gIT0gXCJBbmRyb2lkXCIpXG5cdFx0XHRcdGZpbGVOYW1lID0gZmlsZVBhdGg7XG5cdFx0XHQgIC8vd2luZG93Lm9wZW5QREYoZmlsZU5hbWUpO1xuXHRcdFx0ICAvL2Vsc2Vcblx0XHRcdCAgLy93aW5kb3cub3BlbihmaWxlUGF0aCwgJ19ibGFuaycsICdsb2NhdGlvbj1ubyxjbG9zZWJ1dHRvbmNhcHRpb249Q2xvc2UsZW5hYmxlVmlld3BvcnRTY2FsZT15ZXMnKTsqL1xuXHRcdFx0XHRcdFx0XG5cdFx0XHQgIGNvcmRvdmEucGx1Z2lucy5maWxlT3BlbmVyMi5vcGVuKFxuXHRcdFx0XHRmaWxlTmFtZSxcblx0XHRcdFx0J2FwcGxpY2F0aW9uL3BkZicsXG5cdFx0XHRcdHtcblx0XHRcdFx0ICBlcnJvcjogZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdFcnJvciBzdGF0dXM6ICcgKyBlLnN0YXR1cyArICcgLSBFcnJvciBtZXNzYWdlOiAnICsgZS5tZXNzYWdlKTtcblx0XHRcdFx0ICB9LFxuXHRcdFx0XHQgIHN1Y2Nlc3M6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlIG9wZW5lZCBzdWNjZXNzZnVsbHknKTtcblx0XHRcdFx0ICB9XG5cdFx0XHRcdH1cblx0XHRcdCAgKTtcblx0XHRcdH0sIGZ1bmN0aW9uKGVycm9yKSB7XG5cdFx0XHQgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuXHRcdFx0ICBjb25zb2xlLmxvZygnRXJyb3IgJyk7XG5cdFx0XHR9KTtcblx0XHQgIHJldHVybiB0cnVlO1xuXHRcdH1cblx0fWVsc2V7XG5cdFx0dGhhdC4kaW9uaWNQb3B1cC5hbGVydCh7XG5cdFx0XHR0aXRsZTogJ0luZm8nLFxuXHRcdFx0Y29udGVudDogJ0Rvd25sb2FkIG9wdGlvbiBub3QgYXZhaWxhYmxlIGZvciB0YWJsZSB2aWV3ISEhJ1xuXHRcdCAgfSkudGhlbihmdW5jdGlvbihyZXMpIHtcblx0XHRcdCAgY29uc29sZS5sb2coJ2RvbmUnKTtcblx0XHQgIH0pO1xuXHR9XG4gIH1cblxuICBvcGVuRmxpZ2h0UHJvY2Vzc0RyaWxsUG9wb3ZlcigkZXZlbnQsIGRhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgIHRoaXMuZHJpbGxOYW1lID0gJ0ZMSUdIVCBQUk9DRVNTSU5HIFNUQVRVUyAtICcgKyBkYXRhLnBvaW50WzBdICsgJy0nICsgdGhpcy5oZWFkZXIuZmxvd25Nb250aDtcbiAgICB0aGlzLmRyaWxsVHlwZSA9ICdmbGlnaHQtcHJvY2Vzcyc7XG4gICAgdGhpcy5ncm91cHMgPSBbXTtcbiAgICB0aGlzLmRyaWxsdGFicyA9IFsnQ291bnRyeSBMZXZlbCcsICdTZWN0b3IgTGV2ZWwnLCAnRmxpZ2h0IExldmVsJywgJ0RvY3VtZW50IExldmVsJ107XG4gICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2NvdW50cnlGcm9tJywgJ2Zsb3duU2VjdG9yJywgJ2ZsaWdodE51bWJlcicsICdjYXJyaWVyQ29kZSMnXTtcbiAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgdGhhdC5kcmlsbHBvcG92ZXIuc2hvdygkZXZlbnQpO1xuICAgICAgdGhhdC5zaG93bkdyb3VwID0gMDtcbiAgICB9LCA1MCk7XG4gICAgdGhpcy5vcGVuRHJpbGxEb3duKGRhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XG4gIH07XG5cbiAgb3BlbkNvdW5wb25Db3VudERyaWxsUG9wb3ZlcigkZXZlbnQsIGRhdGEsIHNlbEZpbmRMZXZlbCkge1xuICAgIHRoaXMuZHJpbGxOYW1lID0gJ0NPVVBPTiBDT1VOVCBCWSBFWENFUFRJT04gQ0FURUdPUlkgJztcbiAgICB0aGlzLmRyaWxsVHlwZSA9ICdjb3Vwb24tY291bnQnO1xuICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgdGhpcy5kcmlsbHRhYnMgPSBbJ0NvdXBvbiBDb3VudCBGbGlnaHQgU3RhdHVzJywgJ0RvY3VtZW50IExldmVsJ107XG4gICAgdGhpcy5maXJzdENvbHVtbnMgPSBbJ2ZsaWdodE51bWJlcicsICdmbG93blNlY3RvciddO1xuICAgIHRoaXMuaW5pdGlhdGVBcnJheSh0aGlzLmRyaWxsdGFicyk7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICB0aGF0LmRyaWxscG9wb3Zlci5zaG93KCRldmVudCk7XG4gICAgICB0aGF0LnNob3duR3JvdXAgPSAwO1xuICAgIH0sIDUwKTtcbiAgICB0aGlzLm9wZW5EcmlsbERvd24oZGF0YS5wb2ludCwgc2VsRmluZExldmVsKTtcbiAgfTtcblxuICBvcGVuRmxpZ2h0Q291bnREcmlsbFBvcG92ZXIoJGV2ZW50LCBkYXRhLCBzZWxGaW5kTGV2ZWwpIHtcbiAgICB2YXIgb3BlbmNsc1R4dCA9ICh0aGlzLnRvZ2dsZS5vcGVuT3JDbG9zZWQgPT0gJ09QRU4nKT8gJ09wZW4nIDogJ0Nsb3NlZCc7XG4gICAgdGhpcy5kcmlsbE5hbWUgPSAnTElTVCBPRiAnICsgb3BlbmNsc1R4dCArICcgRkxJR0hUUyBGT1IgJyArIGRhdGEucG9pbnRbMF0gKyAnLScgKyB0aGlzLmhlYWRlci5mbG93bk1vbnRoICsgJyBCWSBSRUFTT04gJztcbiAgICB0aGlzLmRyaWxsVHlwZSA9ICdmbGlnaHQtY291bnQnO1xuICAgIHRoaXMuZ3JvdXBzID0gW107XG4gICAgdGhpcy5kcmlsbHRhYnMgPSBbb3BlbmNsc1R4dCArICcgRmxpZ2h0IFN0YXR1cycsICdEb2N1bWVudCBMZXZlbCddO1xuICAgIHRoaXMuZmlyc3RDb2x1bW5zID0gWydmbGlnaHROdW1iZXInLCAnY2FycmllckNvZGUnXTtcbiAgICB0aGlzLmluaXRpYXRlQXJyYXkodGhpcy5kcmlsbHRhYnMpO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLiR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgdGhhdC5kcmlsbHBvcG92ZXIuc2hvdygkZXZlbnQpO1xuICAgICAgdGhhdC5zaG93bkdyb3VwID0gMDtcbiAgICB9LCA1MCk7XG4gICAgdGhpcy5vcGVuRHJpbGxEb3duKGRhdGEucG9pbnQsIHNlbEZpbmRMZXZlbCk7XG4gIH07XG5cbiAgZHJpbGxEb3duUmVxdWVzdChkcmlsbFR5cGUsIHNlbEZpbmRMZXZlbCwgZGF0YSkge1xuICAgIHZhciByZXFkYXRhO1xuICAgIGlmIChkcmlsbFR5cGUgPT0gJ2ZsaWdodC1wcm9jZXNzJykge1xuICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XG4gICAgICBpZiAoZGF0YS5sYWJlbCkge1xuICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhWzBdO1xuICAgICAgfVxuXG4gICAgICB2YXIgZmxpZ2h0RGF0ZTtcbiAgICAgIC8vZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gU3RyaW5nKGRhdGEuZmxpZ2h0RGF0ZSkgOiBTdHJpbmcoZGF0YVswXSk7XG4gICAgICBmbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBkYXRhLmZsaWdodERhdGUgOiBkYXRhWzBdO1xuICAgICAgdmFyIGNvdW50cnlGcm9tVG8gPSAoZGF0YS5jb3VudHJ5RnJvbSAmJiBkYXRhLmNvdW50cnlUbykgPyBkYXRhLmNvdW50cnlGcm9tICsgJy0nICsgZGF0YS5jb3VudHJ5VG8gOiBcIlwiO1xuICAgICAgdmFyIHNlY3RvckZyb21UbyA9IChkYXRhLmZsb3duU2VjdG9yKSA/IGRhdGEuZmxvd25TZWN0b3IgOiBcIlwiO1xuICAgICAgdmFyIGZsaWdodE51bWJlciA9IChkYXRhLmZsaWdodE51bWJlcikgPyBkYXRhLmZsaWdodE51bWJlciA6IFwiXCI7XG5cblxuXG4gICAgICByZXFkYXRhID0ge1xuICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5nZXRQcm9maWxlVXNlck5hbWUoKSxcbiAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJcIixcbiAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXG4gICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxuICAgICAgICBcImZsaWdodERhdGVcIjogZmxpZ2h0RGF0ZSxcbiAgICAgICAgXCJjb3VudHJ5RnJvbVRvXCI6IGNvdW50cnlGcm9tVG8sXG4gICAgICAgIFwic2VjdG9yRnJvbVRvXCI6IHNlY3RvckZyb21UbyxcbiAgICAgICAgXCJmbGlnaHROdW1iZXJcIjogZmxpZ2h0TnVtYmVyXG4gICAgICB9O1xuICAgIH1cblxuXG4gICAgaWYgKGRyaWxsVHlwZSA9PSAnY291cG9uLWNvdW50Jykge1xuICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XG4gICAgICBpZiAoZGF0YS5sYWJlbCkge1xuICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhWzBdO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2codGhpcy5leGNlcHRpb25DYXRlZ29yeSk7XG4gICAgICB2YXIgZmxpZ2h0RGF0ZTtcbiAgICAgIC8vZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gU3RyaW5nKGRhdGEuZmxpZ2h0RGF0ZSkgOiBTdHJpbmcoZGF0YVswXSk7XG4gICAgICBmbGlnaHREYXRlID0gKGRhdGEuZmxpZ2h0RGF0ZSAmJiBkcmlsbExldmVsID4gMSkgPyBkYXRhLmZsaWdodERhdGUgOiBkYXRhWzBdO1xuICAgICAgdmFyIGV4Y2VwdGlvbkNhdGVnb3J5ID0gKHRoaXMuZXhjZXB0aW9uQ2F0ZWdvcnkgJiYgZHJpbGxMZXZlbCA+IDEpID8gdGhpcy5leGNlcHRpb25DYXRlZ29yeSA6IFwiXCI7XG4gICAgICB2YXIgZmxpZ2h0U2VjdG9yID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XG4gICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcblxuXG5cbiAgICAgIHJlcWRhdGEgPSB7XG4gICAgICAgIFwiZmxvd25Nb250aFwiOiB0aGlzLmhlYWRlci5mbG93bk1vbnRoLFxuICAgICAgICBcInVzZXJJZFwiOiB0aGlzLmdldFByb2ZpbGVVc2VyTmFtZSgpLFxuICAgICAgICBcImZ1bGxEYXRhRmxhZ1wiOiBcIlwiLFxuICAgICAgICBcImRyaWxsTGV2ZWxcIjogZHJpbGxMZXZlbCxcbiAgICAgICAgXCJwYWdlTnVtYmVyXCI6IDAsXG4gICAgICAgIFwiZXhjZXB0aW9uQ2F0ZWdvcnlcIjogZXhjZXB0aW9uQ2F0ZWdvcnksXG4gICAgICAgIFwiZmxpZ2h0TnVtYmVyXCI6IGZsaWdodE51bWJlcixcbiAgICAgICAgXCJmbGlnaHREYXRlXCI6IGZsaWdodERhdGUsXG4gICAgICAgIFwiZmxpZ2h0U2VjdG9yXCI6IGZsaWdodFNlY3RvcixcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGRyaWxsVHlwZSA9PSAnZmxpZ2h0LWNvdW50Jykge1xuICAgICAgdmFyIGRyaWxsTGV2ZWwgPSAoc2VsRmluZExldmVsICsgMik7XG4gICAgICBpZiAoZGF0YS5sYWJlbCkge1xuICAgICAgICB0aGlzLmRyaWxsQmFyTGFiZWwgPSBkYXRhWzBdO1xuICAgICAgfVxuICAgICAgdmFyIGZsaWdodERhdGU7XG4gICAgICAvL2ZsaWdodERhdGUgPSAoZGF0YS5mbGlnaHREYXRlICYmIGRyaWxsTGV2ZWwgPiAxKSA/IFN0cmluZyhkYXRhLmZsaWdodERhdGUpIDogU3RyaW5nKGRhdGFbMF0pO1xuICAgICAgZmxpZ2h0RGF0ZSA9IChkYXRhLmZsaWdodERhdGUgJiYgZHJpbGxMZXZlbCA+IDEpID8gZGF0YS5mbGlnaHREYXRlIDogZGF0YVswXTtcbiAgICAgIHZhciB0b2dnbGUxID0gdGhpcy50b2dnbGUub3Blbk9yQ2xvc2VkLnRvTG93ZXJDYXNlKCk7XG4gICAgICB2YXIgZmxpZ2h0U2VjdG9yID0gKGRhdGEuZmxvd25TZWN0b3IpID8gZGF0YS5mbG93blNlY3RvciA6IFwiXCI7XG4gICAgICB2YXIgZmxpZ2h0TnVtYmVyID0gKGRhdGEuZmxpZ2h0TnVtYmVyKSA/IGRhdGEuZmxpZ2h0TnVtYmVyIDogXCJcIjtcbiAgICAgIHZhciBmbGlnaHRTdGF0dXMgPSAodGhpcy5leGNlcHRpb25DYXRlZ29yeSAmJiBkcmlsbExldmVsID4gMSkgPyB0aGlzLmV4Y2VwdGlvbkNhdGVnb3J5IDogXCJcIjtcblxuXG4gICAgICByZXFkYXRhID0ge1xuICAgICAgICBcImZsb3duTW9udGhcIjogdGhpcy5oZWFkZXIuZmxvd25Nb250aCxcbiAgICAgICAgXCJ1c2VySWRcIjogdGhpcy5nZXRQcm9maWxlVXNlck5hbWUoKSxcbiAgICAgICAgXCJmdWxsRGF0YUZsYWdcIjogXCJcIixcbiAgICAgICAgXCJkcmlsbExldmVsXCI6IGRyaWxsTGV2ZWwsXG4gICAgICAgIFwicGFnZU51bWJlclwiOiAwLFxuICAgICAgICBcInRvZ2dsZTFcIjogdG9nZ2xlMSxcbiAgICAgICAgXCJmbGlnaHRTdGF0dXNcIjogZmxpZ2h0U3RhdHVzLFxuICAgICAgICBcImZsaWdodE51bWJlclwiOiBmbGlnaHROdW1iZXIsXG4gICAgICAgIFwiZmxpZ2h0RGF0ZVwiOiBmbGlnaHREYXRlLFxuICAgICAgICBcImZsaWdodFNlY3RvclwiOiBmbGlnaHRTZWN0b3IsXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiByZXFkYXRhO1xuICB9XG5cbiAgZ2V0RHJpbGxEb3duVVJMKGRyaWxEb3duVHlwZSkge1xuICAgIHZhciB1cmxcbiAgICBzd2l0Y2ggKGRyaWxEb3duVHlwZSkge1xuICAgICAgY2FzZSAnZmxpZ2h0LXByb2Nlc3MnOlxuICAgICAgICB1cmwgPSBcIi9wYXhmbG5vcHIvZmxpZ2h0cHJvY2Vzc2luZ3N0YXR1c2RyaWxsXCI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnY291cG9uLWNvdW50JzpcbiAgICAgICAgdXJsID0gXCIvcGF4Zmxub3ByL2NvdXBvbmNvdW50YnlleHBkcmlsbFwiO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2ZsaWdodC1jb3VudCc6XG4gICAgICAgIHVybCA9IFwiL3BheGZsbm9wci9mbGlnaHRjb3VudGJ5cmVhc29uZHJpbGxcIjtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiB1cmw7XG4gIH1cbiAgdGFiU2xpZGVIYXNDaGFuZ2VkKGluZGV4KSB7XG4gICAgdmFyIGRhdGEgPSB0aGlzLmdyb3Vwc1swXS5jb21wbGV0ZURhdGFbMF07XG4gICAgdGhpcy5ncm91cHNbMF0uaXRlbXNbMF0gPSBkYXRhW2luZGV4XS52YWx1ZXM7XG4gICAgdGhpcy5ncm91cHNbMF0ub3JnSXRlbXNbMF0gPSBkYXRhW2luZGV4XS52YWx1ZXM7XG4gICAgdGhpcy5zb3J0KCcnLCAwLCBmYWxzZSk7XG4gICAgdGhpcy5leGNlcHRpb25DYXRlZ29yeSA9IGRhdGFbaW5kZXhdLmtleTtcbiAgfVxuXG4gIG9wZW5EcmlsbERvd24oZGF0YSwgc2VsRmluZExldmVsKSB7XG4gICAgc2VsRmluZExldmVsID0gTnVtYmVyKHNlbEZpbmRMZXZlbCk7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuc2VsZWN0ZWREcmlsbFtzZWxGaW5kTGV2ZWxdID0gZGF0YTtcbiAgICB0aGlzLnNlbGVjdGVkRHJpbGxbc2VsRmluZExldmVsICsgMV0gPSAnJztcblxuICAgIGlmIChzZWxGaW5kTGV2ZWwgIT0gKHRoaXMuZ3JvdXBzLmxlbmd0aCAtIDEpKSB7XG4gICAgICB2YXIgZHJpbGxMZXZlbCA9IChzZWxGaW5kTGV2ZWwgKyAyKTtcbiAgICAgIHZhciByZXFkYXRhID0gdGhpcy5kcmlsbERvd25SZXF1ZXN0KHRoaXMuZHJpbGxUeXBlLCBzZWxGaW5kTGV2ZWwsIGRhdGEpO1xuICAgICAgdmFyIFVSTCA9IHRoaXMuZ2V0RHJpbGxEb3duVVJMKHRoaXMuZHJpbGxUeXBlKTtcbiAgICAgIHRoaXMuaW9uaWNMb2FkaW5nU2hvdygpO1xuICAgICAgdGhpcy5vcGVyYXRpb25hbFNlcnZpY2UuZ2V0RHJpbGxEb3duKHJlcWRhdGEsIFVSTClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgIHRoYXQuaW9uaWNMb2FkaW5nSGlkZSgpO1xuICAgICAgICAgIHZhciBkYXRhID0gZGF0YS5yZXNwb25zZTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICB2YXIgZmluZExldmVsID0gZHJpbGxMZXZlbCAtIDE7XG4gICAgICAgICAgaWYgKGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJykge1xuICAgICAgICAgICAgdmFyIHJlc3BSZXN1bHQ7XG4gICAgICAgICAgICBpZiAoZGF0YS5kYXRhLnJvd3MpIHtcbiAgICAgICAgICAgICAgcmVzcFJlc3VsdCA9IGRhdGEuZGF0YS5yb3dzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzcFJlc3VsdCA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCh0aGF0LmRyaWxsVHlwZSA9PSAnY291cG9uLWNvdW50JyB8fCB0aGF0LmRyaWxsVHlwZSA9PSAnZmxpZ2h0LWNvdW50JykgJiYgZGF0YS5kYXRhLnJvd3MpIHtcbiAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5pdGVtc1swXSA9IHJlc3BSZXN1bHRbMF0udmFsdWVzO1xuICAgICAgICAgICAgICB0aGF0Lmdyb3Vwc1tmaW5kTGV2ZWxdLm9yZ0l0ZW1zWzBdID0gcmVzcFJlc3VsdFswXS52YWx1ZXM7XG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0uY29tcGxldGVEYXRhWzBdID0gcmVzcFJlc3VsdDtcbiAgICAgICAgICAgICAgdGhhdC5leGNlcHRpb25DYXRlZ29yeSA9IHJlc3BSZXN1bHRbMF0ua2V5O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhhdC5ncm91cHNbZmluZExldmVsXS5pdGVtc1swXSA9IHJlc3BSZXN1bHQ7XG4gICAgICAgICAgICAgIHRoYXQuZ3JvdXBzW2ZpbmRMZXZlbF0ub3JnSXRlbXNbMF0gPSByZXNwUmVzdWx0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XG4gICAgICAgICAgICB0aGF0LnNvcnQoJycsIGZpbmRMZXZlbCwgZmFsc2UpO1xuICAgICAgICAgICAgdGhhdC5jbGVhckRyaWxsKGRyaWxsTGV2ZWwpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGF0LnNob3duR3JvdXAgPSBmaW5kTGV2ZWw7XG4gICAgICAgICAgICB0aGF0LmNsZWFyRHJpbGwoZmluZExldmVsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgdGhhdC5pb25pY0xvYWRpbmdIaWRlKCk7XG4gICAgICAgICAgdGhhdC5jbG9zZXNQb3BvdmVyKCk7XG4gICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgIGFsZXJ0KCdTZXJ2ZXIgRXJyb3InKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgY2xvc2VEcmlsbFBvcG92ZXIoKSB7XG4gICAgdGhpcy5kcmlsbHBvcG92ZXIuaGlkZSgpO1xuICB9XG5cbiAgY2xlYXJEcmlsbChsZXZlbDogbnVtYmVyKSB7XG4gICAgdmFyIGk6IG51bWJlcjtcbiAgICBmb3IgKHZhciBpID0gbGV2ZWw7IGkgPCB0aGlzLmRyaWxsdGFicy5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5ncm91cHNbaV0uaXRlbXMuc3BsaWNlKDAsIDEpO1xuICAgICAgdGhpcy5ncm91cHNbaV0ub3JnSXRlbXMuc3BsaWNlKDAsIDEpO1xuICAgICAgdGhpcy5zb3J0KCcnLCBpLCBmYWxzZSk7XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLnNlbGVjdGVkRHJpbGwpO1xuICAgICAgdGhpcy5zZWxlY3RlZERyaWxsW2ldID0gJyc7XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLnNlbGVjdGVkRHJpbGwpO1xuICAgIH1cbiAgfVxuICBpbml0aWF0ZUFycmF5KGRyaWxsdGFicykge1xuICAgIGZvciAodmFyIGkgaW4gZHJpbGx0YWJzKSB7XG4gICAgICB0aGlzLmdyb3Vwc1tpXSA9IHtcbiAgICAgICAgaWQ6IGksXG4gICAgICAgIG5hbWU6IHRoaXMuZHJpbGx0YWJzW2ldLFxuICAgICAgICBpdGVtczogW10sXG4gICAgICAgIG9yZ0l0ZW1zOiBbXSxcbiAgICAgICAgSXRlbXNCeVBhZ2U6IFtdLFxuICAgICAgICBjb21wbGV0ZURhdGE6IFtdLFxuICAgICAgICBmaXJzdENvbHVtbnM6IHRoaXMuZmlyc3RDb2x1bW5zW2ldXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGlzRHJpbGxSb3dTZWxlY3RlZChsZXZlbCwgb2JqKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0ZWREcmlsbFtsZXZlbF0gPT0gb2JqO1xuICB9XG4gIHNlYXJjaFJlc3VsdHMobGV2ZWwsIG9iaikge1xuICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuZmlsdGVyZWRMaXN0U2VydmljZS5zZWFyY2hlZCh0aGlzLmdyb3Vwc1tsZXZlbF0ub3JnSXRlbXNbMF0sIG9iai5zZWFyY2hUZXh0LCBsZXZlbCwgdGhpcy5kcmlsbFR5cGUpO1xuICAgIGlmIChvYmouc2VhcmNoVGV4dCA9PSAnJykge1xuICAgICAgdGhpcy5yZXNldEFsbChsZXZlbCk7XG4gICAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uaXRlbXNbMF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0ub3JnSXRlbXNbMF07XG4gICAgfVxuICAgIHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdID0gMDtcbiAgICB0aGlzLnBhZ2luYXRpb24obGV2ZWwpO1xuICB9XG4gIHBhZ2luYXRpb24obGV2ZWwpIHtcbiAgICB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UgPSB0aGlzLmZpbHRlcmVkTGlzdFNlcnZpY2UucGFnZWQodGhpcy5ncm91cHNbbGV2ZWxdLml0ZW1zWzBdLCB0aGlzLnBhZ2VTaXplKTtcbiAgfTtcbiAgc2V0UGFnZShsZXZlbCwgcGFnZW5vKSB7XG4gICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSBwYWdlbm87XG4gIH07XG4gIGxhc3RQYWdlKGxldmVsKSB7XG4gICAgdGhpcy5jdXJyZW50UGFnZVtsZXZlbF0gPSB0aGlzLmdyb3Vwc1tsZXZlbF0uSXRlbXNCeVBhZ2UubGVuZ3RoIC0gMTtcbiAgfTtcbiAgcmVzZXRBbGwobGV2ZWwpIHtcbiAgICB0aGlzLmN1cnJlbnRQYWdlW2xldmVsXSA9IDA7XG4gIH1cbiAgc29ydChzb3J0QnksIGxldmVsLCBvcmRlcikge1xuICAgIHRoaXMucmVzZXRBbGwobGV2ZWwpO1xuICAgIHRoaXMuY29sdW1uVG9PcmRlciA9IHNvcnRCeTsgXG4gICAgLy8kRmlsdGVyIC0gU3RhbmRhcmQgU2VydmljZVxuICAgIHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSA9IHRoaXMuJGZpbHRlcignb3JkZXJCeScpKHRoaXMuZ3JvdXBzW2xldmVsXS5pdGVtc1swXSwgdGhpcy5jb2x1bW5Ub09yZGVyLCBvcmRlcik7XG4gICAgdGhpcy5wYWdpbmF0aW9uKGxldmVsKTtcbiAgfTtcbiAgcmFuZ2UodG90YWwsIGxldmVsKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIHZhciBzdGFydDogbnVtYmVyO1xuICAgIHN0YXJ0ID0gMDtcbiAgICBpZih0b3RhbCA+IDUpIHtcbiAgICAgIHN0YXJ0ID0gTnVtYmVyKHRoaXMuY3VycmVudFBhZ2VbbGV2ZWxdKSAtIDI7XG4gICAgfVxuICAgIGlmIChzdGFydCA8IDApIHtcbiAgICAgIHN0YXJ0ID0gMDtcbiAgICB9XG4gICAgdmFyIGsgPSAxO1xuICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IHRvdGFsOyBpKyspIHtcbiAgICAgIHJldC5wdXNoKGkpO1xuICAgICAgaysrO1xuICAgICAgaWYgKGsgPiA2KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG4gIHRvZ2dsZUdyb3VwKGdyb3VwKSB7XG4gICAgaWYgKHRoaXMuaXNHcm91cFNob3duKGdyb3VwKSkge1xuICAgICAgdGhpcy5zaG93bkdyb3VwID0gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93bkdyb3VwID0gZ3JvdXA7XG4gICAgfVxuICB9XG4gIGlzR3JvdXBTaG93bihncm91cDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuc2hvd25Hcm91cCA9PSBncm91cDtcbiAgfVxuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuXG5jbGFzcyBMb2dpbkNvbnRyb2xsZXIge1xuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzY29wZScsICckc3RhdGUnLCAnVXNlclNlcnZpY2UnLCAnJGlvbmljSGlzdG9yeSddO1xuXHRwcml2YXRlIGludmFsaWRNZXNzYWdlOiBib29sZWFuID0gZmFsc2U7XG5cdHByaXZhdGUgdXNlcm5hbWU6IHN0cmluZztcblx0cHJpdmF0ZSBwYXNzd29yZDogc3RyaW5nO1xuXHRwcml2YXRlIGlwYWRkcmVzczogc3RyaW5nO1xuXHRwcml2YXRlIGVyb29ybWVzc2FnZTogc3RyaW5nO1xuXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgJHNjb3BlOiBuZy5JU2NvcGUsIHByaXZhdGUgJHN0YXRlOiBhbmd1bGFyLnVpLklTdGF0ZVNlcnZpY2UsXG5cdHByaXZhdGUgdXNlclNlcnZpY2U6IFVzZXJTZXJ2aWNlLCBwcml2YXRlICRpb25pY0hpc3Rvcnk6IGFueSkge1xuXHRcdGlmICh0aGlzLnVzZXJTZXJ2aWNlLmlzTG9nZ2VkSW4oKSkge1xuXHRcdFx0JGlvbmljSGlzdG9yeS5uZXh0Vmlld09wdGlvbnMoe1xuXHRcdFx0XHRkaXNhYmxlQmFjazogdHJ1ZVxuXHRcdFx0fSk7XG5cdFx0XHRjb25zb2xlLmxvZygnbmF2Z2F0aW5nIHRvIG1pcy1mbG93bi4uJyk7XG5cdFx0XHR0aGlzLiRzdGF0ZS5nbyh0aGlzLnVzZXJTZXJ2aWNlLmRlZmF1bHRQYWdlKTtcblx0XHR9XG5cdH1cblxuXHRjbGVhckVycm9yKCkge1xuXHRcdHRoaXMuaW52YWxpZE1lc3NhZ2UgPSBmYWxzZTtcblx0fVxuXG5cdGRvTG9naW4obG9naW5Gb3JtOiBib29sZWFuKSB7XG5cdFx0aWYgKCFsb2dpbkZvcm0pIHtcblx0XHRcdGlmICghYW5ndWxhci5pc0RlZmluZWQodGhpcy51c2VybmFtZSkgfHwgIWFuZ3VsYXIuaXNEZWZpbmVkKHRoaXMucGFzc3dvcmQpIHx8ICFhbmd1bGFyLmlzRGVmaW5lZCh0aGlzLmlwYWRkcmVzcykgfHx0aGlzLnVzZXJuYW1lLnRyaW0oKSA9PSBcIlwiIHx8IHRoaXMucGFzc3dvcmQudHJpbSgpID09IFwiXCIgfHwgdGhpcy5pcGFkZHJlc3MudHJpbSgpID09IFwiXCIpIHtcblx0XHRcdFx0dGhpcy5pbnZhbGlkTWVzc2FnZSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRTRVJWRVJfVVJMID0gJ2h0dHA6Ly8nICsgdGhpcy5pcGFkZHJlc3MgKyAnLycgKyAncmFwaWQtd3Mvc2VydmljZXMvcmVzdCc7XG5cdFx0XHR0aGlzLnVzZXJTZXJ2aWNlLmxvZ2luKHRoaXMudXNlcm5hbWUsdGhpcy5wYXNzd29yZCkudGhlbihcblx0XHRcdFx0KHJlc3VsdCkgPT4ge1xuXHRcdFx0XHRcdGlmIChyZXN1bHQucmVzcG9uc2Uuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR2YXIgcmVxID0ge1xuXHRcdFx0XHRcdFx0XHR1c2VySWQ6IHRoaXMudXNlcm5hbWVcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRoaXMudXNlclNlcnZpY2UuZ2V0VXNlclByb2ZpbGUocmVxKS50aGVuKFxuXHRcdFx0XHRcdFx0XHQocHJvZmlsZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdHZhciB1c2VyTmFtZSA9IHtcblx0XHRcdFx0XHRcdFx0XHRcdHVzZXJuYW1lOiBwcm9maWxlLnJlc3BvbnNlLmRhdGEudXNlckluZm8udXNlck5hbWVcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy51c2VyU2VydmljZS5zZXRVc2VyKHVzZXJOYW1lKTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLiRpb25pY0hpc3RvcnkubmV4dFZpZXdPcHRpb25zKHtcblx0XHRcdFx0XHRcdFx0XHRcdGRpc2FibGVCYWNrOiB0cnVlXG5cdFx0XHRcdFx0XHRcdFx0fSk7IFxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuJHN0YXRlLmdvKHRoaXMudXNlclNlcnZpY2UuZGVmYXVsdFBhZ2UpO1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHQoZXJyb3IpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJlZCBvbiBsb2FkaW5nIHVzZXIgcHJvZmlsZScpO1xuXHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dGhpcy5pbnZhbGlkTWVzc2FnZSA9IHRydWU7XG5cdFx0XHRcdFx0XHR0aGlzLmVyb29ybWVzc2FnZSA9IFwiUGxlYXNlIGNoZWNrIHlvdXIgY3JlZGVudGlhbHNcIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdChlcnJvcikgPT4ge1xuXHRcdFx0XHRcdHRoaXMuaW52YWxpZE1lc3NhZ2UgPSB0cnVlO1xuXHRcdFx0XHRcdHRoaXMuZXJvb3JtZXNzYWdlID0gXCJQbGVhc2UgY2hlY2sgeW91ciBuZXR3b3JrIGNvbm5lY3Rpb25cIjtcblx0XHRcdFx0fSk7XG5cdFx0fSBcblx0fVxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9fbGlicy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvTWlzQ29udHJvbGxlci50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvTWlzU2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL3VzZXIvc2VydmljZXMvVXNlclNlcnZpY2UudHNcIiAvPlxuXG5cblxuY2xhc3MgU2V0dGluZ01pc0NvbnRyb2xsZXIgZXh0ZW5kcyBNaXNDb250cm9sbGVyIHtcblx0cHVibGljIHN0YXRpYyAkaW5qZWN0ID0gWyckc3RhdGUnLCAnJHNjb3BlJywgJyRpb25pY0xvYWRpbmcnLCAnJHRpbWVvdXQnLCAnJHdpbmRvdycsICckaW9uaWNQb3BvdmVyJyxcbiAgICAgICAgJyRmaWx0ZXInLCAnTWlzU2VydmljZScsICdDaGFydG9wdGlvblNlcnZpY2UnLCAnRmlsdGVyZWRMaXN0U2VydmljZScsICdVc2VyU2VydmljZScsICckaW9uaWNIaXN0b3J5JywgJ1JlcG9ydFN2YycsICdHUkFQSF9DT0xPUlMnLCAnVEFCUycsICckaW9uaWNQb3B1cCddO1xuXG5cdGNvbnN0cnVjdG9yKHB1YmxpYyAkc3RhdGU6IGFuZ3VsYXIudWkuSVN0YXRlU2VydmljZSwgcHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSxcbiAgICAgICAgcHJpdmF0ZSAkaW9uaWNMb2FkaW5nOiBJb25pYy5JTG9hZGluZywgcHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLFxuICAgICAgICBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLCBwcml2YXRlICRpb25pY1BvcG92ZXI6IElvbmljLklQb3BvdmVyLFxuICAgICAgICBwcml2YXRlICRmaWx0ZXI6IG5nLklGaWx0ZXJTZXJ2aWNlLCBwcml2YXRlIG1pc1NlcnZpY2U6IE1pc1NlcnZpY2UsXG4gICAgICAgIHByaXZhdGUgY2hhcnRvcHRpb25TZXJ2aWNlOiBDaGFydG9wdGlvblNlcnZpY2UsIHByaXZhdGUgZmlsdGVyZWRMaXN0U2VydmljZTogRmlsdGVyZWRMaXN0U2VydmljZSxcbiAgICAgICAgcHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2UsIHByaXZhdGUgJGlvbmljSGlzdG9yeTogYW55LCBwcml2YXRlIHJlcG9ydFN2YzogUmVwb3J0U3ZjLCBwcml2YXRlIEdSQVBIX0NPTE9SUzogc3RyaW5nLCBwcml2YXRlIFRBQlM6IHN0cmluZywgcHJpdmF0ZSAkaW9uaWNQb3B1cDogSW9uaWMuSVBvcHVwKSB7XG4gICAgICAgICAgICAgICAgIHN1cGVyKCRzdGF0ZSwgJHNjb3BlLCAkaW9uaWNMb2FkaW5nLCAkdGltZW91dCwgJHdpbmRvdywgJGZpbHRlciwgbWlzU2VydmljZSwgY2hhcnRvcHRpb25TZXJ2aWNlLCBmaWx0ZXJlZExpc3RTZXJ2aWNlLCB1c2VyU2VydmljZSwgJGlvbmljSGlzdG9yeSwgcmVwb3J0U3ZjLCBHUkFQSF9DT0xPUlMsIFRBQlMsICRpb25pY1BvcHVwKTtcbiAgICAgICAgIH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbXBvbmVudHMvb3BlcmF0aW9uYWwvZmxvd24vT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2NvbXBvbmVudHMvb3BlcmF0aW9uYWwvc2VydmljZXMvT3BlcmF0aW9uYWxTZXJ2aWNlLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9GaWx0ZXJlZExpc3RTZXJ2aWNlLnRzXCIgLz5cblxuXG5cbmNsYXNzIFNldHRpbmdPcHRDb250cm9sbGVyIGV4dGVuZHMgT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIge1xuXHRwdWJsaWMgc3RhdGljICRpbmplY3QgPSBbJyRzdGF0ZScsICckc2NvcGUnLCAnJGlvbmljTG9hZGluZycsICckZmlsdGVyJyxcbiAgICAnT3BlcmF0aW9uYWxTZXJ2aWNlJywgJyRpb25pY1NsaWRlQm94RGVsZWdhdGUnLCAnJHRpbWVvdXQnLCAnJHdpbmRvdycsICdSZXBvcnRTdmMnLCAnRmlsdGVyZWRMaXN0U2VydmljZScsICdVc2VyU2VydmljZScsICckaW9uaWNIaXN0b3J5JywgJ0dSQVBIX0NPTE9SUycsICdUQUJTJywgJyRpb25pY1BvcHVwJ107XG5cblx0Y29uc3RydWN0b3IgKHByaXZhdGUgJHN0YXRlOiBhbmd1bGFyLnVpLklTdGF0ZVNlcnZpY2UsIHByaXZhdGUgJHNjb3BlOiBuZy5JU2NvcGUsXG4gICAgICAgICAgICBwcml2YXRlICRpb25pY0xvYWRpbmc6IElvbmljLklMb2FkaW5nLFxuICAgICAgICAgICAgIHByaXZhdGUgJGZpbHRlcjogbmcuSUZpbHRlclNlcnZpY2UsXG4gICAgICAgICAgICBwcml2YXRlIG9wZXJhdGlvbmFsU2VydmljZTogT3BlcmF0aW9uYWxTZXJ2aWNlLFxuICAgICAgICAgICAgcHJpdmF0ZSAkaW9uaWNTbGlkZUJveERlbGVnYXRlOiBJb25pYy5JU2xpZGVCb3hEZWxlZ2F0ZSxcbiAgICAgICAgICAgIHByaXZhdGUgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSwgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcbiAgICAgICAgICAgIHByaXZhdGUgcmVwb3J0U3ZjOiBSZXBvcnRTdmMsIHByaXZhdGUgZmlsdGVyZWRMaXN0U2VydmljZTogRmlsdGVyZWRMaXN0U2VydmljZSxcbiAgICAgICAgICAgIHByaXZhdGUgdXNlclNlcnZpY2U6IFVzZXJTZXJ2aWNlLCBwcml2YXRlICRpb25pY0hpc3Rvcnk6IGFueSwgcHJpdmF0ZSBHUkFQSF9DT0xPUlM6IHN0cmluZywgcHJpdmF0ZSBUQUJTOiBzdHJpbmcsIHByaXZhdGUgJGlvbmljUG9wdXA6IElvbmljLklQb3B1cCkge1xuICAgICAgICAgICAgICAgICBzdXBlcigkc3RhdGUsICRzY29wZSwgJGlvbmljTG9hZGluZywgJGZpbHRlciwgb3BlcmF0aW9uYWxTZXJ2aWNlLCAkaW9uaWNTbGlkZUJveERlbGVnYXRlLCAkdGltZW91dCwgJHdpbmRvdywgcmVwb3J0U3ZjLCBmaWx0ZXJlZExpc3RTZXJ2aWNlLCB1c2VyU2VydmljZSwgJGlvbmljSGlzdG9yeSwgR1JBUEhfQ09MT1JTLCBUQUJTLCAkaW9uaWNQb3B1cCk7XG5cdCAgICAgICAgfVxuXHRcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vX2xpYnMudHNcIiAvPlxuXG5jbGFzcyBDaGFydEV2ZW50IGltcGxlbWVudHMgbmcuSURpcmVjdGl2ZSB7XG5cdHJlc3RyaWN0ID0gJ0UnO1xuXHRzY29wZSA9IHtcblx0XHR0eXBlOiBcIj1cIixcblx0XHRuYW1lOiBcIkBcIlxuXHR9O1xuXHRjb25zdHJ1Y3Rvcihwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsIHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UpIHtcblx0fTtcblxuXHRsaW5rID0gKCRzY29wZTogbmcuSVNjb3BlLCBpRWxlbWVudDogSlF1ZXJ5LCBhdHRyaWJ1dGVzOiBuZy5JQXR0cmlidXRlcywgJHNjZTogbmcuSVNDRVNlcnZpY2UpOiB2b2lkID0+IHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIG52ZDNcblx0XHRpZihhdHRyaWJ1dGVzLnR5cGUgPT0gJ21ldHJpYycgfHwgYXR0cmlidXRlcy50eXBlID09ICd0YXJnZXQnIHx8IGF0dHJpYnV0ZXMudHlwZSA9PSAncGFzc2VuZ2VyLWNvdW50Jyl7XG5cdFx0XHRudmQzID0gaUVsZW1lbnQuZmluZCgnbnZkMycpWzBdO1xuXHRcdH1cblx0XHRpZihhdHRyaWJ1dGVzLnR5cGUgPT0gJ2ZsaWdodC1wcm9jZXNzJyB8fCBhdHRyaWJ1dGVzLnR5cGUgPT0gJ2ZsaWdodC1jb3VudCcgfHwgYXR0cmlidXRlcy50eXBlID09ICdjb3Vwb24tY291bnQnKXtcblx0XHRcdG52ZDMgPSBpRWxlbWVudC5maW5kKCdudmQzLW11bHRpLWJhci1jaGFydCcpWzBdO1xuXHRcdH1cblx0XHRcblx0XHR2YXIgc2VsZWN0ZWRFbGVtID0gYW5ndWxhci5lbGVtZW50KG52ZDMpO1xuXG5cdFx0XG5cdFx0XHRcdFx0XG5cblx0XHRzZWxmLiR0aW1lb3V0KFxuXHRcdFx0KCkgPT4ge1xuXHRcdFx0XHRzZWxlY3RlZEVsZW0ucmVhZHkoZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHZhciBmaXJzdDogbnVtYmVyO1xuXHRcdFx0XHRcdHNlbGVjdGVkRWxlbS5vbignbW91c2VvdmVyIHRvdWNoZW5kJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0XHRcdGlmKCFmaXJzdCl7XG5cdFx0XHRcdFx0XHRcdHNlbGYuYXBwZW5kQ2xpY2soc2VsZWN0ZWRFbGVtLCBhdHRyaWJ1dGVzLCBzZWxmKTtcblx0XHRcdFx0XHRcdFx0Zmlyc3QgPSAxO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdC8qXG5cdFx0XHRcdFx0JHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHsgcmV0dXJuIHNlbGVjdGVkRWxlbS5odG1sKCk7XHQgfSwgZnVuY3Rpb24obmV3VmFsdWUsIG9sZFZhbHVlKSB7XG5cdFx0XHRcdFx0XHRpZiAobmV3VmFsdWUpIHtcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyhuZXdWYWx1ZSk7XG5cdFx0XHRcdFx0XHRcdHNlbGYuYXBwZW5kQ2xpY2soc2VsZWN0ZWRFbGVtLCBhdHRyaWJ1dGVzLCBzZWxmKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9LCB0cnVlKTsqL1xuXHRcdFx0XHRcdHNlbGYuYXBwZW5kQ2xpY2soc2VsZWN0ZWRFbGVtLCBhdHRyaWJ1dGVzLCBzZWxmKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdFx0MTApO1xuXHR9XG5cblx0c3RhdGljIGZhY3RvcnkoKTogbmcuSURpcmVjdGl2ZUZhY3Rvcnkge1xuXHRcdHZhciBkaXJlY3RpdmUgPSAoJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSwgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UpID0+IG5ldyBDaGFydEV2ZW50KCR0aW1lb3V0LCAkcm9vdFNjb3BlKVxuXHRcdGRpcmVjdGl2ZS4kaW5qZWN0ID0gWyckdGltZW91dCcsICckcm9vdFNjb3BlJ107XG5cdFx0cmV0dXJuIGRpcmVjdGl2ZTtcblx0fVxuXG5cdGFwcGVuZENsaWNrKHNlbGVjdGVkRWxlbSwgYXR0cmlidXRlcywgc2VsZikge1xuXHRcdHZhciBkYmxDbGlja0ludGVydmFsID0gMzAwO1xuXHRcdHZhciBmaXJzdENsaWNrVGltZTtcblx0XHR2YXIgd2FpdGluZ1NlY29uZENsaWNrID0gZmFsc2U7XG5cdFx0dmFyIGNoaWxkRWxlbTogYW55ID0gc2VsZWN0ZWRFbGVtLmZpbmQoJ3JlY3QnKTtcblx0XHRhbmd1bGFyLmZvckVhY2goY2hpbGRFbGVtLCBmdW5jdGlvbihlbGVtLCBrZXkpIHtcblx0XHRcdGlmIChlbGVtLnRhZ05hbWUgPT0gJ3JlY3QnKSB7XG5cdFx0XHRcdHZhciByZWN0RWxlbSA9IGFuZ3VsYXIuZWxlbWVudChlbGVtKTtcblx0XHRcdFx0cmVjdEVsZW0ub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0XHRpZiAoIXdhaXRpbmdTZWNvbmRDbGljaykge1xuXHRcdFx0XHRcdFx0Ly8gU2luZ2xlIGNsbGlja1xuXHRcdFx0XHRcdFx0Zmlyc3RDbGlja1RpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuXHRcdFx0XHRcdFx0d2FpdGluZ1NlY29uZENsaWNrID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHR3YWl0aW5nU2Vjb25kQ2xpY2sgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2cod2FpdGluZ1NlY29uZENsaWNrKTtcblx0XHRcdFx0XHRcdH0sIGRibENsaWNrSW50ZXJ2YWwpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdC8vIERvdWJsZSBjbGxpY2tcblx0XHRcdFx0XHRcdHdhaXRpbmdTZWNvbmRDbGljayA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0dmFyIHRpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuXHRcdFx0XHRcdFx0aWYgKHRpbWUgLSBmaXJzdENsaWNrVGltZSA8IGRibENsaWNrSW50ZXJ2YWwpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHR5cGUgPSBhdHRyaWJ1dGVzLnR5cGU7XG5cdFx0XHRcdFx0XHRcdGlmKGF0dHJpYnV0ZXMudHlwZSA9PSAnbWV0cmljJyB8fCBhdHRyaWJ1dGVzLnR5cGUgPT0gJ3RhcmdldCcgfHwgYXR0cmlidXRlcy50eXBlID09ICdwYXNzZW5nZXItY291bnQnKXtcblx0XHRcdFx0XHRcdFx0XHRzZWxmLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnb3BlbkRyaWxsUG9wdXAnLCB7XCJkYXRhXCIgOiByZWN0RWxlbVswXVsnX19kYXRhX18nXSwgXCJ0eXBlXCI6IHR5cGUsIFwiZXZlbnRcIjogZXZlbnQsIFwibmFtZVwiOiBhdHRyaWJ1dGVzLm5hbWV9KTsgXG5cdFx0XHRcdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHJlY3RFbGVtKTtcblx0XHRcdFx0XHRcdFx0XHRzZWxmLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnb3BlbkRyaWxsUG9wdXAxJywge1wiZGF0YVwiIDogcmVjdEVsZW1bMF1bJ19fZGF0YV9fJ10sIFwidHlwZVwiOiB0eXBlLCBcImV2ZW50XCI6IGV2ZW50fSk7IFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdH0pOyBcblx0fVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vX2xpYnMudHNcIiAvPlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vYXBwL0FwcENvbnRyb2xsZXIudHNcIiAvPlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21tb24vc2VydmljZXMvQ29yZG92YVNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL3NlcnZpY2VzL0xvY2FsU3RvcmFnZVNlcnZpY2UudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL3NlcnZpY2VzL1Nlc3Npb25TZXJ2aWNlLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tbW9uL3NlcnZpY2VzL0Vycm9ySGFuZGxlclNlcnZpY2UudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9zZXJ2aWNlcy9NaXNTZXJ2aWNlLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvQ2hhcnRvcHRpb25TZXJ2aWNlLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9taXMvc2VydmljZXMvRmlsdGVyZWRMaXN0U2VydmljZS50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbXBvbmVudHMvb3BlcmF0aW9uYWwvc2VydmljZXMvT3BlcmF0aW9uYWxTZXJ2aWNlLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy91c2VyL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9zZXR0aW5nL1NldHRpbmdTZXJ2aWNlLnRzXCIvPlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL21pcy9NaXNDb250cm9sbGVyLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9PcGVyYXRpb25hbEZsb3duQ29udHJvbGxlci50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbXBvbmVudHMvdXNlci9Mb2dpbkNvbnRyb2xsZXIudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL3NldHRpbmcvU2V0dGluZ01pc0NvbnRyb2xsZXIudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jb21wb25lbnRzL3NldHRpbmcvU2V0dGluZ09wdENvbnRyb2xsZXIudHNcIi8+XG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2NvbW1vbi9jaGFydC1ldmVudC9DaGFydEV2ZW50LnRzXCIgLz5cblxudmFyIFNFUlZFUl9VUkwgPSAnaHR0cDovLzEwLjkxLjE1Mi45OTo4MDgyL3JhcGlkLXdzL3NlcnZpY2VzL3Jlc3QnO1xuYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJywgWydpb25pYycsICdyYXBpZE1vYmlsZS5jb25maWcnLCAndGFiU2xpZGVCb3gnLCAnbnZkM0NoYXJ0RGlyZWN0aXZlcycsICdudmQzJ10pXG5cblx0LnJ1bigoJGlvbmljUGxhdGZvcm06IElvbmljLklQbGF0Zm9ybSwgJGh0dHA6IG5nLklIdHRwU2VydmljZSkgPT4ge1xuXHRcdCRodHRwLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uLnRva2VuID0gJ3Rva2VuJztcbiAgXHRcdCRodHRwLmRlZmF1bHRzLmhlYWRlcnMucG9zdFtcIkNvbnRlbnQtVHlwZVwiXSA9IFwiYXBwbGljYXRpb24vanNvblwiO1xuXHRcdCRpb25pY1BsYXRmb3JtLnJlYWR5KCgpID0+IHtcblx0XHRcdGlmICh0eXBlb2YgbmF2aWdhdG9yLmdsb2JhbGl6YXRpb24gIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR9XG5cdFx0fSlcblx0fSlcbi5jb25maWcoKCRzdGF0ZVByb3ZpZGVyOiBhbmd1bGFyLnVpLklTdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXI6IGFuZ3VsYXIudWkuSVVybFJvdXRlclByb3ZpZGVyLFxuXHQkaW9uaWNDb25maWdQcm92aWRlcjogSW9uaWMuSUNvbmZpZ1Byb3ZpZGVyKSA9PiB7XG5cdCRpb25pY0NvbmZpZ1Byb3ZpZGVyLnZpZXdzLnN3aXBlQmFja0VuYWJsZWQoZmFsc2UpO1xuXG5cdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhcHAnLCB7XG5cdFx0dXJsOiAnL2FwcCcsXG5cdFx0YWJzdHJhY3Q6IHRydWUsXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3RlbXBsYXRlcy9tZW51Lmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6ICdBcHBDb250cm9sbGVyIGFzIGFwcEN0cmwnXG5cdH0pXG5cdC5zdGF0ZSgnbG9naW4nLCB7XG5cdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdHVybDogJy9sb2dpbicsXG5cdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3VzZXIvbG9naW4uaHRtbCcsXG5cdFx0Y29udHJvbGxlcjogJ0xvZ2luQ29udHJvbGxlciBhcyBMb2dpbkN0cmwnXG5cdH0pXG5cdC5zdGF0ZSgnYXBwLm1pcy1mbG93bicsIHtcblx0XHRjYWNoZTogZmFsc2UsXG5cdFx0dXJsOiAnL21pcy9mbG93bicsXG5cdFx0dmlld3M6IHtcblx0XHRcdCdtZW51Q29udGVudCc6IHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL21pcy9mbG93bi5odG1sJyxcblx0XHRcdFx0Y29udHJvbGxlcjogJ01pc0NvbnRyb2xsZXIgYXMgTWlzQ3RybCdcblx0XHRcdH1cblx0XHR9XG5cdH0pXG5cdC5zdGF0ZSgnYXBwLm9wZXJhdGlvbmFsLWZsb3duJywge1xuXHRcdGNhY2hlOiBmYWxzZSxcblx0XHR1cmw6ICcvb3BlcmF0aW9uYWwvZmxvd24nLFxuXHRcdHZpZXdzOiB7XG5cdFx0XHQnbWVudUNvbnRlbnQnOiB7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9vcGVyYXRpb25hbC9mbG93bi9mbG93bi5odG1sJyxcblx0XHRcdFx0Y29udHJvbGxlcjogJ09wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyIGFzIE9wckN0cmwnXG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcblxuXHQkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvbG9naW4nKTtcbn0pXG5cbi5zZXJ2aWNlKCdEYXRhUHJvdmlkZXJTZXJ2aWNlJywgRGF0YVByb3ZpZGVyU2VydmljZSlcbi5zZXJ2aWNlKCdOZXRTZXJ2aWNlJywgTmV0U2VydmljZSlcbi5zZXJ2aWNlKCdFcnJvckhhbmRsZXJTZXJ2aWNlJywgRXJyb3JIYW5kbGVyU2VydmljZSlcbi5zZXJ2aWNlKCdTZXNzaW9uU2VydmljZScsIFNlc3Npb25TZXJ2aWNlKVxuLnNlcnZpY2UoJ0NvcmRvdmFTZXJ2aWNlJywgQ29yZG92YVNlcnZpY2UpXG4uc2VydmljZSgnTG9jYWxTdG9yYWdlU2VydmljZScsIExvY2FsU3RvcmFnZVNlcnZpY2UpXG4uc2VydmljZSgnVXNlclNlcnZpY2UnLCBVc2VyU2VydmljZSlcblxuLnNlcnZpY2UoJ01pc1NlcnZpY2UnLCBNaXNTZXJ2aWNlKVxuLnNlcnZpY2UoJ09wZXJhdGlvbmFsU2VydmljZScsIE9wZXJhdGlvbmFsU2VydmljZSlcbi5zZXJ2aWNlKCdGaWx0ZXJlZExpc3RTZXJ2aWNlJywgRmlsdGVyZWRMaXN0U2VydmljZSlcbi5zZXJ2aWNlKCdDaGFydG9wdGlvblNlcnZpY2UnLCBDaGFydG9wdGlvblNlcnZpY2UpXG4uc2VydmljZSgnU2V0dGluZ1NlcnZpY2UnLCBTZXR0aW5nU2VydmljZSlcblxuLmNvbnRyb2xsZXIoJ0FwcENvbnRyb2xsZXInLCBBcHBDb250cm9sbGVyKVxuLmNvbnRyb2xsZXIoJ01pc0NvbnRyb2xsZXInLCBNaXNDb250cm9sbGVyKVxuLmNvbnRyb2xsZXIoJ09wZXJhdGlvbmFsRmxvd25Db250cm9sbGVyJywgT3BlcmF0aW9uYWxGbG93bkNvbnRyb2xsZXIpXG4uY29udHJvbGxlcignTG9naW5Db250cm9sbGVyJywgTG9naW5Db250cm9sbGVyKVxuLmNvbnRyb2xsZXIoJ1NldHRpbmdNaXNDb250cm9sbGVyJywgU2V0dGluZ01pc0NvbnRyb2xsZXIpXG4uY29udHJvbGxlcignU2V0dGluZ09wdENvbnRyb2xsZXInLCBTZXR0aW5nT3B0Q29udHJvbGxlcilcblxuLmRpcmVjdGl2ZSgnY2hhcnRldmVudCcsIENoYXJ0RXZlbnQuZmFjdG9yeSgpKVxuLy8gLmRpcmVjdGl2ZSgnZmV0Y2hMaXN0JywgRmV0Y2hMaXN0LmZhY3RvcnkoKSlcblxuXG5pb25pYy5QbGF0Zm9ybS5yZWFkeSgoKSA9PiB7XG5cdGlmICh3aW5kb3cuY29yZG92YSAmJiB3aW5kb3cuY29yZG92YS5wbHVnaW5zLktleWJvYXJkKSB7XG5cdH1cblx0Ly8gU3RhdHVzQmFyLm92ZXJsYXlzV2ViVmlldyhmYWxzZSk7XG4gLy8gICAgU3RhdHVzQmFyLmJhY2tncm91bmRDb2xvckJ5SGV4U3RyaW5nKCcjMjA5ZGMyJyk7XG4gLy8gICAgU3RhdHVzQmFyLnN0eWxlTGlnaHRDb250ZW50KCk7XG5cdF8uZGVmZXIoKCkgPT4ge1xuXHRcdC8vIGFuZ3VsYXIuYm9vdHN0cmFwKGRvY3VtZW50LCBbJ3JhcGlkTW9iaWxlJ10pO1xuXHR9KTtcbn0pO1xuIixudWxsLCIoZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG4gIGFuZ3VsYXIubW9kdWxlKCdyYXBpZE1vYmlsZScpXG4gIC5kaXJlY3RpdmUoJ2hlUHJvZ3Jlc3NCYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSkge1xuICAgIHZhciByb290U2NvcGUgPSAkcm9vdFNjb3BlO1xuICAgIHZhciBkaXJlY3RpdmVEZWZpbml0aW9uT2JqZWN0ID0ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IGZhbHNlLFxuICAgICAgc2NvcGU6IHtkYXRhOiAnPWNoYXJ0RGF0YScsIHNob3d0b29sdGlwOiAnQHNob3dUb29sdGlwJ30sXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAgICAgICAgIC5kb21haW4oWzAsIGQzLm1heChzY29wZS5kYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiArZC5wcm9ncmVzcyB9KV0pXG4gICAgICAgICAgICAgICAgICAucmFuZ2UoWzAsIDkwXSk7XG5cbiAgICAgICAgdmFyIHNlZ21lbnQgPSBkMy5zZWxlY3QoZWxlbWVudFswXSlcbiAgICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoXCIuaG9yaXpvbnRhbC1iYXItZ3JhcGgtc2VnbWVudFwiKVxuICAgICAgICAgICAgICAgICAgICAgLmRhdGEoc2NvcGUuZGF0YSlcbiAgICAgICAgICAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpXG4gICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLXNlZ21lbnRcIiwgdHJ1ZSk7XG5cbiAgICAgICAgc2VnbWVudC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcImhvcml6b250YWwtYmFyLWdyYXBoLWxhYmVsXCIsIHRydWUpXG4gICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWUgfSk7XG5cbiAgICAgICAgdmFyIGJhclNlZ21lbnQgPSBzZWdtZW50LmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtdmFsdWVcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtdmFsdWUtc2NhbGVcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwiaG9yaXpvbnRhbC1iYXItZ3JhcGgtdmFsdWUtYmFyXCIsIHRydWUpLm9uKCdjbGljaycsIGZ1bmN0aW9uKG9iail7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoYXR0cnMubmFtZSA9PSBcIlRvcCA1IE9BTCBDb250cmlidXRpb25cIil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb290U2NvcGUuJGJyb2FkY2FzdCgnb3BlbkRyaWxsUG9wdXAnLCB7XCJkYXRhXCIgOiBvYmosIFwidHlwZVwiOiAnb2FsJywgXCJldmVudFwiOiB3aW5kb3cuZXZlbnQsIFwibmFtZVwiOiBhdHRycy5uYW1lfSk7ICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICBiYXJTZWdtZW50XG4gICAgICAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuY29sb3IgfSkgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiB4KCtkLnByb2dyZXNzKSArIFwiJVwiIH0pO1xuXG4gICAgICAgIHZhciBib3hTZWdtZW50ID0gYmFyU2VnbWVudC5hcHBlbmQoXCJzcGFuXCIpLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC12YWx1ZS1ib3hcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5wcm9ncmVzcyA/IGQucHJvZ3Jlc3MgOiBcIlwiIH0pO1xuICAgICAgICBpZihzY29wZS5zaG93dG9vbHRpcCAhPT0gJ3RydWUnKSByZXR1cm47ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIHZhciBidG5TZWdtZW50ID0gc2VnbWVudC5hcHBlbmQoXCJidXR0b25cIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJob3Jpem9udGFsLWJhci1ncmFwaC1pY29uIGljb24gaW9uLWNoZXZyb24tZG93biBuby1ib3JkZXIgc2VjdG9yQ3VzdG9tQ2xhc3NcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJoaWRlXCIsIGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGQpIHJldHVybiBkLmRyaWxsRmxhZyA9PSAnTic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pOyAgICAgICAgICAgIFxuICAgICAgICB2YXIgdG9vbHRpcFNlZ21lbnQgPSBzZWdtZW50LmFwcGVuZChcImRpdlwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJ0b29sdGlwXCIsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZCgnaGlkZScsIHRydWUpO1xuICAgICAgICB0b29sdGlwU2VnbWVudC5hcHBlbmQoXCJwXCIpLnRleHQoZnVuY3Rpb24oZCl7IHJldHVybiBkLm5hbWU7IH0pO1xuICAgICAgICB2YXIgdGFibGUgPSB0b29sdGlwU2VnbWVudC5hcHBlbmQoXCJ0YWJsZVwiKTtcbiAgICAgICAgdmFyIHRoZWFkID0gdGFibGUuYXBwZW5kKCd0cicpO1xuICAgICAgICB0aGVhZC5hcHBlbmQoJ3RoJykudGV4dCgnU2VjdG9yJyk7XG4gICAgICAgIHRoZWFkLmFwcGVuZCgndGgnKS50ZXh0KCdSZXZlbnVlJyk7XG5cbiAgICAgICAgdmFyIHRyICA9IHRhYmxlXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ3Rib2R5JylcbiAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbChcInRyXCIpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKGZ1bmN0aW9uKGQpe3JldHVybiBkLnNjQW5hbHlzaXNEcmlsbHN9KVxuICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKS5hcHBlbmQoXCJ0clwiKTtcblxuICAgICAgICB2YXIgc2VjdG9yVGQgPSB0ci5hcHBlbmQoXCJ0ZFwiKVxuICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5zZWN0b3IgfSk7XG5cbiAgICAgICAgdmFyIHJldmVudWVUZCA9IHRyLmFwcGVuZChcInRkXCIpXG4gICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnJldmVudWUgfSk7XG5cbiAgICAgICAgYnRuU2VnbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpeyAgICAgICAgICAgICAgXG4gICAgICAgICAgLy8gY29uc29sZS5sb2codG9vbHRpcFNlZ21lbnQpO1xuXHRcdCAgYW5ndWxhci5lbGVtZW50KHRoaXMpLnJlbW92ZUNsYXNzKCdzZWN0b3JDdXN0b21DbGFzcycpO1xuXHRcdCAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc2VjdG9yQ3VzdG9tQ2xhc3NcIikpLnJlbW92ZUNsYXNzKCdpb24tY2hldnJvbi11cCcpO1xuXHRcdCAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc2VjdG9yQ3VzdG9tQ2xhc3NcIikpLmFkZENsYXNzKCdpb24tY2hldnJvbi1kb3duJyk7XG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5zZWN0b3JDdXN0b21DbGFzc1wiKSkubmV4dCgpLnJlbW92ZUNsYXNzKCdzaG93Jyk7XG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5zZWN0b3JDdXN0b21DbGFzc1wiKSkubmV4dCgpLmFkZENsYXNzKCdoaWRlJyk7XG5cdFx0ICBcbiAgICAgICAgICBpZihhbmd1bGFyLmVsZW1lbnQodGhpcykubmV4dCgpLmhhc0NsYXNzKCdzaG93JykpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5yZW1vdmVDbGFzcygnaW9uLWNoZXZyb24tdXAnKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5hZGRDbGFzcygnaW9uLWNoZXZyb24tZG93bicpO1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5yZW1vdmVDbGFzcygnc2hvdycpOyAgICAgICAgICAgIFxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHRoaXMpLm5leHQoKS5hZGRDbGFzcygnaGlkZScpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQodGhpcykucmVtb3ZlQ2xhc3MoJ2lvbi1jaGV2cm9uLWRvd24nKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5hZGRDbGFzcygnaW9uLWNoZXZyb24tdXAnKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkucmVtb3ZlQ2xhc3MoJ2hpZGUnKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh0aGlzKS5uZXh0KCkuYWRkQ2xhc3MoJ3Nob3cnKTtcbiAgICAgICAgICB9XG5cdFx0ICBhbmd1bGFyLmVsZW1lbnQodGhpcykuYWRkQ2xhc3MoJ3NlY3RvckN1c3RvbUNsYXNzJyk7XG5cdFx0ICBcblx0XHQgIFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBkaXJlY3RpdmVEZWZpbml0aW9uT2JqZWN0O1xuICB9KTtcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKVxuICAuZGlyZWN0aXZlKCdoZVJldmVudWVQcm9ncmVzc0JhcicsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmV2QmFyT2JqZWN0ID0ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IGZhbHNlLFxuICAgICAgc2NvcGU6IHtkYXRhOiAnPWNoYXJ0RGF0YSd9LFxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhzY29wZS5kYXRhKTtcbiAgICAgICAgc2NvcGUuJHdhdGNoKCdkYXRhJywgZnVuY3Rpb24obmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnbmV3VmFsdWUnLCBuZXdWYWx1ZSk7XG4gICAgICAgICAgICB2YXIgeCA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgICAgICAgICAgICAgICAgLmRvbWFpbihbMCwgZDMubWF4KHNjb3BlLmRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudmFsdWUgfSldKVxuICAgICAgICAgICAgICAgICAgICAgIC5yYW5nZShbMCwgOTBdKTtcblxuICAgICAgICAgICAgdmFyIHNlZ21lbnQgPSBkMy5zZWxlY3QoZWxlbWVudFswXSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKFwiLm5ldC1yZXYtYmFyLWdyYXBoLXNlZ21lbnRcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZGF0YShzY29wZS5kYXRhKVxuICAgICAgICAgICAgICAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtc2VnbWVudFwiLCB0cnVlKTtcblxuICAgICAgICAgICAgc2VnbWVudC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLWxhYmVsXCIsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5uYW1lIH0pO1xuXG4gICAgICAgICAgICB2YXIgYmFyU2VnbWVudCA9IHNlZ21lbnQuYXBwZW5kKFwiZGl2XCIpLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC12YWx1ZVwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKS5jbGFzc2VkKFwibmV0LXJldi1iYXItZ3JhcGgtdmFsdWUtc2NhbGVcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIikuY2xhc3NlZChcIm5ldC1yZXYtYmFyLWdyYXBoLXZhbHVlLWJhclwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJuZXQtcmV2LWJhci1ncmFwaC12YWx1ZS1ib3hcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudmFsdWU7IH0pO1xuXG4gICAgICAgICAgICBiYXJTZWdtZW50ICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgIC5zdHlsZShcImJhY2tncm91bmQtY29sb3JcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jb2xvciB9KSAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgICAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoZC52YWx1ZSkgKyBcIiVcIiB9KTsgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgIH0gICAgICAgICAgICAgICBcbiAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gcmV2QmFyT2JqZWN0O1xuICB9KTtcbn0pKCk7IiwiXG4oZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIC8vIGF0dGFjaCB0aGUgZmFjdG9yaWVzIGFuZCBzZXJ2aWNlIHRvIHRoZSBbc3RhcnRlci5zZXJ2aWNlc10gbW9kdWxlIGluIGFuZ3VsYXJcbiAgICBhbmd1bGFyLm1vZHVsZSgncmFwaWRNb2JpbGUnKVxuICAgICAgICAuc2VydmljZSgnUmVwb3J0QnVpbGRlclN2YycsIHJlcG9ydEJ1aWxkZXJTZXJ2aWNlKTtcbiAgICBcblx0ZnVuY3Rpb24gcmVwb3J0QnVpbGRlclNlcnZpY2UoKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIHNlbGYuZ2VuZXJhdGVSZXBvcnQgPSBfZ2VuZXJhdGVSZXBvcnQ7ICAgICAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIF9nZW5lcmF0ZVJlcG9ydChwYXJhbSwgY2hhcnRUaXRsZSxmbG93bk1vbnRoKSB7XG5cdFx0XHR2YXIgdGl0bGUgPSBcIlwiO1xuXHRcdFx0aWYocGFyYW0gPT0gXCJtZXRyaWNTbmFwc2hvdFwiKVxuXHRcdFx0XHR0aXRsZSA9IFwiTUVUUklDIFNOQVBTSE9UIC1cIitmbG93bk1vbnRoK1wiIFwiK2NoYXJ0VGl0bGUudG9VcHBlckNhc2UoKStcIi0gVklFV1wiO1xuXHRcdFx0ZWxzZSBpZihwYXJhbSA9PSBcInRhcmdldEFjdHVhbFwiKVxuXHRcdFx0XHR0aXRsZSA9IFwiVEFSR0VUIFZTIEFDVFVBTCAtIFwiKygoY2hhcnRUaXRsZSA9PSBcInJldmVudWVcIik/XCJORVQgUkVWRU5VRVwiOlwiUEFYIENvdW50XCIpK1wiIFwiK2Zsb3duTW9udGgrIFwiIC0gVklFV1wiO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aXRsZSA9IGNoYXJ0VGl0bGUrXCIgXCIrZmxvd25Nb250aCtcIiAtIFZJRVdcIjtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHR2YXIgc3ZnTm9kZSA9IGQzLnNlbGVjdEFsbChcIi5cIitwYXJhbSkuc2VsZWN0QWxsKFwic3ZnXCIpO1xuXHRcdFx0dmFyIGNvbnRlbnQgPSBbXTtcblx0XHRcdHZhciBpbWFnZUNvbHVtbiA9IFtdO1xuXHRcdFx0dmFyIHRleHRDb2x1bW4gPSBbXTtcblx0XHRcdHZhciBpbWFnZXNPYmogPSB7fTtcblx0XHRcdHZhciB0ZXh0T2JqID0ge307XG5cdFx0XHRjb250ZW50LnB1c2godGl0bGUpO1xuXHRcdFx0dmFyIG5vZGVFeGlzdHMgPSBbXTtcblx0XHRcdGFuZ3VsYXIuZm9yRWFjaChzdmdOb2RlLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XHRcdFx0XHRcblx0XHRcdFx0Ly90ZXh0T2JqWydhbGlnbm1lbnQnXSA9ICdjZW50ZXInXHRcdFx0XHRcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBodG1sID0gXCJcIjtcblx0XHRcdFx0aWYobm9kZUV4aXN0cy5pbmRleE9mKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1mbGFnXCIpKSA9PSAtMSAmJiBzdmdOb2RlW2tleV0ubGVuZ3RoID49IDEpe1xuXHRcdFx0XHRcblx0XHRcdFx0XHRodG1sID0gc3ZnTm9kZVtrZXldWzBdLm91dGVySFRNTDtcblx0XHRcdFx0XHRpZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tcGRmRmxhZ1wiKSA9PT0gXCJkeW5hbWljV0hcIil7XG5cdFx0XHRcdFx0XHRkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKS5hdHRyKFwid2lkdGhcIiwxNTAwKTtcblx0XHRcdFx0XHRcdGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpLmF0dHIoXCJoZWlnaHRcIiw2MDApO1xuXHRcdFx0XHRcdFx0dmFyIG5vZGUgPSBkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKTtcblx0XHRcdFx0XHRcdGh0bWwgPSBub2RlWzBdWzBdLm91dGVySFRNTDtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDUwMDtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnaGVpZ2h0J10gPSA1MDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmKHN2Z05vZGVba2V5XS5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZShcImRhdGEtaXRlbS1wZGZGbGFnXCIpID09PSBcInBkZkZsYWdcIilcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ3dpZHRoJ10gPSA3NTA7XG5cdFx0XHRcdFx0XHRpbWFnZXNPYmpbJ2hlaWdodCddID0gMzAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjYW52Zyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyksIGh0bWwpO1xuXHRcdFx0XHRcdHZhciB0ZXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xuXHRcdFx0XHRcdHZhciBpbWdzcmMgPSB0ZXN0LnRvRGF0YVVSTCgpO1xuXHRcdFx0XHRcdHZhciAgdGV4dCA9IFwiXFxuXCIrc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLXRpdGxlXCIpK1wiXFxuXCI7XG5cdFx0XHRcdFx0dGV4dE9ialsndGV4dCddID0gdGV4dDtcblx0XHRcdFx0XHR0ZXh0Q29sdW1uLnB1c2godGV4dE9iaik7XG5cdFx0XHRcdFx0aW1hZ2VzT2JqWydpbWFnZSddID0gaW1nc3JjO1xuXHRcdFx0XHRcdGltYWdlQ29sdW1uLnB1c2goaW1hZ2VzT2JqKTtcdFx0XHRcdFxuXHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxuXHRcdFx0XHRcdHR4dFRlbXBbJ2NvbHVtbnMnXSA9IHRleHRDb2x1bW47XG5cdFx0XHRcdFx0aW1nVGVtcFsnYWxpZ25tZW50J10gPSAnY2VudGVyJztcblx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcblx0XHRcdFx0XHRjb250ZW50LnB1c2godHh0VGVtcCk7XG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKGltZ1RlbXApO1x0XHRcdFx0XHRcblx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdHRleHRDb2x1bW4gPSBbXTtcblx0XHRcdFx0XHRpbWFnZXNPYmogPSB7fTtcblx0XHRcdFx0XHR0ZXh0T2JqID0ge307XG5cdFx0XHRcdFx0aW1nVGVtcCA9IHt9O1xuXHRcdFx0XHRcdHR4dFRlbXAgPXt9O1xuXHRcdFx0XHRcdG5vZGVFeGlzdHMucHVzaChzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tZmxhZ1wiKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjb250ZW50OiBjb250ZW50LFxuXHRcdFx0XHRzdHlsZXM6IHtcblx0XHRcdFx0XHRoZWFkZXI6IHtcblx0XHRcdFx0XHRcdGZvbnRTaXplOiAxOCxcblx0XHRcdFx0XHRcdGJvbGQ6IHRydWVcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGJpZ2dlcjoge1xuXHRcdFx0XHRcdFx0Zm9udFNpemU6IDE1LFxuXHRcdFx0XHRcdFx0aXRhbGljczogdHJ1ZSxcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGRlZmF1bHRTdHlsZToge1xuXHRcdFx0XHRcdGNvbHVtbkdhcDogMjAsXG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0fTtcbiAgICB9XG59KSgpOyIsIihmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgLy8gYXR0YWNoIHRoZSBzZXJ2aWNlIHRvIHRoZSBbcmFwaWRNb2JpbGVdIG1vZHVsZSBpbiBhbmd1bGFyXG4gICAgYW5ndWxhci5tb2R1bGUoJ3JhcGlkTW9iaWxlJylcblx0IFx0LnNlcnZpY2UoJ1JlcG9ydFN2YycsIFsnJHEnLCAnJHRpbWVvdXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG9ydFN2Y10pO1xuXG5cdC8vIGdlblJlcG9ydERlZiAtLT4gZ2VuUmVwb3J0RG9jIC0tPiBidWZmZXJbXSAtLT4gQmxvYigpIC0tPiBzYXZlRmlsZSAtLT4gcmV0dXJuIGZpbGVQYXRoXG5cblx0IGZ1bmN0aW9uIHJlcG9ydFN2YygkcSwgJHRpbWVvdXQpIHtcblx0XHQgdGhpcy5ydW5SZXBvcnRBc3luYyA9IF9ydW5SZXBvcnRBc3luYztcblx0XHQgdGhpcy5ydW5SZXBvcnREYXRhVVJMID0gX3J1blJlcG9ydERhdGFVUkw7XG5cblx0XHQvLyBSVU4gQVNZTkM6IHJ1bnMgdGhlIHJlcG9ydCBhc3luYyBtb2RlIHcvIHByb2dyZXNzIHVwZGF0ZXMgYW5kIGRlbGl2ZXJzIGEgbG9jYWwgZmlsZVVybCBmb3IgdXNlXG5cblx0XHQgZnVuY3Rpb24gX3J1blJlcG9ydEFzeW5jKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCx0YWJJbmRleCkge1xuICAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cdFx0XHQgXG4gICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMS5Qcm9jZXNzaW5nIFRyYW5zY3JpcHQnKTtcbiAgICAgICAgICAgICBnZW5lcmF0ZVJlcG9ydERlZihzdGF0dXNGbGFnLHRpdGxlLGZsb3duTW9udGgsdGFiSW5kZXgpLnRoZW4oZnVuY3Rpb24oZG9jRGVmKSB7XG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzIuIEdlbmVyYXRpbmcgUmVwb3J0Jyk7XG4gICAgICAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZVJlcG9ydERvYyhkb2NEZWYpO1xuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocGRmRG9jKSB7XG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzMuIEJ1ZmZlcmluZyBSZXBvcnQnKTtcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlUmVwb3J0QnVmZmVyKHBkZkRvYyk7XG4gICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihidWZmZXIpIHtcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnNC4gU2F2aW5nIFJlcG9ydCBGaWxlJyk7XG4gICAgICAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZVJlcG9ydEJsb2IoYnVmZmVyKTtcbiAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHBkZkJsb2IpIHtcbiAgICAgICAgICAgICAgICAgLy9zaG93TG9hZGluZygnNS4gT3BlbmluZyBSZXBvcnQgRmlsZScpO1xuICAgICAgICAgICAgICAgICByZXR1cm4gc2F2ZUZpbGUocGRmQmxvYixzdGF0dXNGbGFnKTtcbiAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgIC8vaGlkZUxvYWRpbmcoKTtcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShmaWxlUGF0aCk7XG4gICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgLy9oaWRlTG9hZGluZygpO1xuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcgKyBlcnJvci50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgIH1cblxuXHRcdC8vIFJVTiBEQVRBVVJMOiBydW5zIHRoZSByZXBvcnQgYXN5bmMgbW9kZSB3LyBwcm9ncmVzcyB1cGRhdGVzIGFuZCBzdG9wcyB3LyBwZGZEb2MgLT4gZGF0YVVSTCBzdHJpbmcgY29udmVyc2lvblxuXG5cdFx0IGZ1bmN0aW9uIF9ydW5SZXBvcnREYXRhVVJMKHN0YXR1c0ZsYWcsdGl0bGUsZmxvd25Nb250aCx0YWJJbmRleCkge1xuICAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cdFx0XHQgXG4gICAgICAgICAgICAgLy9zaG93TG9hZGluZygnMS5Qcm9jZXNzaW5nIFRyYW5zY3JpcHQnKTtcbiAgICAgICAgICAgICBnZW5lcmF0ZVJlcG9ydERlZihzdGF0dXNGbGFnLHRpdGxlLGZsb3duTW9udGgsdGFiSW5kZXgpLnRoZW4oZnVuY3Rpb24oZG9jRGVmKSB7XG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzIuIEdlbmVyYXRpbmcgUmVwb3J0Jyk7XG4gICAgICAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZVJlcG9ydERvYyhkb2NEZWYpO1xuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocGRmRG9jKSB7XG4gICAgICAgICAgICAgICAgIC8vc2hvd0xvYWRpbmcoJzMuIENvbnZlcnQgdG8gRGF0YVVSTCcpO1xuICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0RGF0YVVSTChwZGZEb2MpO1xuICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ob3V0RG9jKSB7XG4gICAgICAgICAgICAgICAgIC8vaGlkZUxvYWRpbmcoKTtcbiAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShvdXREb2MpO1xuICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgIC8vaGlkZUxvYWRpbmcoKTtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgZXJyb3IudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICB9XG5cblx0XHQvLyAxLkdlbmVyYXRlUmVwb3J0RGVmOiB1c2UgY3VycmVudFRyYW5zY3JpcHQgdG8gY3JhZnQgcmVwb3J0RGVmIEpTT04gZm9yIHBkZk1ha2UgdG8gZ2VuZXJhdGUgcmVwb3J0XG5cblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydERlZihzdGF0dXNGbGFnLHRpdGxlLGZsb3duTW9udGgsdGFiSW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cdFx0XHRcbiAgICAgICAgICAgIC8vIHJlbW92ZWQgc3BlY2lmaWNzIG9mIGNvZGUgdG8gcHJvY2VzcyBkYXRhIGZvciBkcmFmdGluZyB0aGUgZG9jXG4gICAgICAgICAgICAvLyBsYXlvdXQgYmFzZWQgb24gcGxheWVyLCB0cmFuc2NyaXB0LCBjb3Vyc2VzLCBldGMuXG4gICAgICAgICAgICAvLyBjdXJyZW50bHkgbW9ja2luZyB0aGlzIGFuZCByZXR1cm5pbmcgYSBwcmUtYnVpbHQgSlNPTiBkb2MgZGVmaW5pdGlvblxuICAgICAgICAgICAgXG5cdFx0XHQvL3VzZSBycHQgc2VydmljZSB0byBnZW5lcmF0ZSB0aGUgSlNPTiBkYXRhIG1vZGVsIGZvciBwcm9jZXNzaW5nIFBERlxuICAgICAgICAgICAgLy8gaGFkIHRvIHVzZSB0aGUgJHRpbWVvdXQgdG8gcHV0IGEgc2hvcnQgZGVsYXkgdGhhdCB3YXMgbmVlZGVkIHRvIFxuICAgICAgICAgICAgLy8gcHJvcGVybHkgZ2VuZXJhdGUgdGhlIGRvYyBkZWNsYXJhdGlvblxuICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRkID0ge307XG4gICAgICAgICAgICAgICAgZGQgPSBnZW5lcmF0ZVJlcG9ydChzdGF0dXNGbGFnLHRpdGxlLGZsb3duTW9udGgsdGFiSW5kZXgpXG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoZGQpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdFx0fVxuXG5cdFx0Ly8gMi5HZW5lcmF0ZVJwdEZpbGVEb2M6IHRha2UgSlNPTiBmcm9tIHJwdFN2YywgY3JlYXRlIHBkZm1lbW9yeSBidWZmZXIsIGFuZCBzYXZlIGFzIGEgbG9jYWwgZmlsZVxuXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnREb2MoZG9jRGVmaW5pdGlvbikge1xuXHRcdFx0Ly91c2UgdGhlIHBkZm1ha2UgbGliIHRvIGNyZWF0ZSBhIHBkZiBmcm9tIHRoZSBKU09OIGNyZWF0ZWQgaW4gdGhlIGxhc3Qgc3RlcFxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblx0XHRcdHRyeSB7XG4gICAgICAgICAgICAgICAgLy91c2UgdGhlIHBkZk1ha2UgbGlicmFyeSB0byBjcmVhdGUgaW4gbWVtb3J5IHBkZiBmcm9tIHRoZSBKU09OXG5cdFx0XHRcdHZhciBwZGZEb2MgPSBwZGZNYWtlLmNyZWF0ZVBkZiggZG9jRGVmaW5pdGlvbiApO1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocGRmRG9jKTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdFx0fVxuXG5cdFx0Ly8gMy5HZW5lcmF0ZVJwdEJ1ZmZlcjogcGRmS2l0IG9iamVjdCBwZGZEb2MgLS0+IGJ1ZmZlciBhcnJheSBvZiBwZGZEb2NcblxuXHRcdGZ1bmN0aW9uIGdlbmVyYXRlUmVwb3J0QnVmZmVyKHBkZkRvYykge1xuXHRcdFx0Ly91c2UgdGhlIHBkZm1ha2UgbGliIHRvIGdldCBhIGJ1ZmZlciBhcnJheSBvZiB0aGUgcGRmRG9jIG9iamVjdFxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblx0XHRcdHRyeSB7XG4gICAgICAgICAgICAgICAgLy9nZXQgdGhlIGJ1ZmZlciBmcm9tIHRoZSBwZGZEb2Ncblx0XHRcdFx0cGRmRG9jLmdldEJ1ZmZlcihmdW5jdGlvbihidWZmZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ICAgZGVmZXJyZWQucmVzb2x2ZShidWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdFx0fVxuXG5cdFx0Ly8gM2IuZ2V0RGF0YVVSTDogcGRmS2l0IG9iamVjdCBwZGZEb2MgLS0+IGVuY29kZWQgZGF0YVVybFxuXG5cdFx0IGZ1bmN0aW9uIGdldERhdGFVUkwocGRmRG9jKSB7XG5cdFx0XHQvL3VzZSB0aGUgcGRmbWFrZSBsaWIgdG8gY3JlYXRlIGEgcGRmIGZyb20gdGhlIEpTT04gY3JlYXRlZCBpbiB0aGUgbGFzdCBzdGVwXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXHRcdFx0dHJ5IHtcbiAgICAgICAgICAgICAgICAvL3VzZSB0aGUgcGRmTWFrZSBsaWJyYXJ5IHRvIGNyZWF0ZSBpbiBtZW1vcnkgcGRmIGZyb20gdGhlIEpTT05cblx0XHRcdFx0cGRmRG9jLmdldERhdGFVcmwoZnVuY3Rpb24ob3V0RG9jKSB7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShvdXREb2MpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdFx0IH1cblxuXHRcdC8vIDQuR2VuZXJhdGVSZXBvcnRCbG9iOiBidWZmZXIgLS0+IG5ldyBCbG9iIG9iamVjdFxuXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVSZXBvcnRCbG9iKGJ1ZmZlcikge1xuXHRcdFx0Ly91c2UgdGhlIGdsb2JhbCBCbG9iIG9iamVjdCBmcm9tIHBkZm1ha2UgbGliIHRvIGNyZWF0IGEgYmxvYiBmb3IgZmlsZSBwcm9jZXNzaW5nXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXHRcdFx0dHJ5IHtcbiAgICAgICAgICAgICAgICAvL3Byb2Nlc3MgdGhlIGlucHV0IGJ1ZmZlciBhcyBhbiBhcHBsaWNhdGlvbi9wZGYgQmxvYiBvYmplY3QgZm9yIGZpbGUgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgICAgIHZhciBwZGZCbG9iID0gbmV3IEJsb2IoW2J1ZmZlcl0sIHt0eXBlOiAnYXBwbGljYXRpb24vcGRmJ30pO1xuICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHBkZkJsb2IpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHRcdH1cblxuXHRcdC8vIDUuU2F2ZUZpbGU6IHVzZSB0aGUgRmlsZSBwbHVnaW4gdG8gc2F2ZSB0aGUgcGRmQmxvYiBhbmQgcmV0dXJuIGEgZmlsZVBhdGggdG8gdGhlIGNsaWVudFxuXG5cdFx0ZnVuY3Rpb24gc2F2ZUZpbGUocGRmQmxvYix0aXRsZSkge1xuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblx0XHRcdHZhciBmaWxlTmFtZSA9IHVuaXF1ZUZpbGVOYW1lKHRpdGxlKStcIi5wZGZcIjtcblx0XHRcdHZhciBmaWxlUGF0aCA9IFwiXCI7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnU2F2ZUZpbGU6IHJlcXVlc3RGaWxlU3lzdGVtJyk7XG5cdFx0XHRcdHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbShMb2NhbEZpbGVTeXN0ZW0uUEVSU0lTVEVOVCwgMCwgZ290RlMsIGZhaWwpO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcignU2F2ZUZpbGVfRXJyOiAnICsgZS5tZXNzYWdlKTtcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xuXHRcdFx0XHR0aHJvdyh7Y29kZTotMTQwMSxtZXNzYWdlOid1bmFibGUgdG8gc2F2ZSByZXBvcnQgZmlsZSd9KTtcblx0XHRcdH1cdFx0XHRcblxuXHRcdFx0ZnVuY3Rpb24gZ290RlMoZmlsZVN5c3RlbSkge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdTYXZlRmlsZTogZ290RlMgLS0+IGdldEZpbGUnKTtcblx0XHRcdFx0ZmlsZVN5c3RlbS5yb290LmdldEZpbGUoZmlsZU5hbWUsIHtjcmVhdGU6IHRydWUsIGV4Y2x1c2l2ZTogZmFsc2V9LCBnb3RGaWxlRW50cnksIGZhaWwpO1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBnb3RGaWxlRW50cnkoZmlsZUVudHJ5KSB7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ1NhdmVGaWxlOiBnb3RGaWxlRW50cnkgLS0+IChmaWxlUGF0aCkgLS0+IGNyZWF0ZVdyaXRlcicpO1xuXHRcdFx0XHRmaWxlUGF0aCA9IGZpbGVFbnRyeS50b1VSTCgpO1xuXHRcdFx0XHRmaWxlRW50cnkuY3JlYXRlV3JpdGVyKGdvdEZpbGVXcml0ZXIsIGZhaWwpO1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBnb3RGaWxlV3JpdGVyKHdyaXRlcikge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdTYXZlRmlsZTogZ290RmlsZVdyaXRlciAtLT4gd3JpdGUgLS0+IG9uV3JpdGVFbmQocmVzb2x2ZSknKTtcblx0XHRcdFx0d3JpdGVyLm9ud3JpdGVlbmQgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0d3JpdGVyLm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZXIgZXJyb3I6ICcgKyBlLnRvU3RyaW5nKCkpO1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0d3JpdGVyLndyaXRlKHBkZkJsb2IpO1xuXHRcdFx0fVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBmYWlsKGVycm9yKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGVycm9yLmNvZGUpO1xuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZXJyb3IpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcblx0XHR9XG5cdFx0ZnVuY3Rpb24gdW5pcXVlRmlsZU5hbWUoZmlsZU5hbWUpe1xuXHRcdFx0dmFyIG5vdyA9IG5ldyBEYXRlKCk7XG5cdFx0XHR2YXIgdGltZXN0YW1wID0gbm93LmdldEZ1bGxZZWFyKCkudG9TdHJpbmcoKTtcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldE1vbnRoKCkgPCA5ID8gJzAnIDogJycpICsgbm93LmdldE1vbnRoKCkudG9TdHJpbmcoKTsgXG5cdFx0XHR0aW1lc3RhbXAgKz0gKG5vdy5nZXREYXRlKCkgPCAxMCA/ICcwJyA6ICcnKSArIG5vdy5nZXREYXRlKCkudG9TdHJpbmcoKTsgXG5cdFx0XHR0aW1lc3RhbXAgKz0gKG5vdy5nZXRIb3VycygpIDwgMTAgPyAnMCcgOiAnJykgKyBub3cuZ2V0SG91cnMoKS50b1N0cmluZygpOyBcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldE1pbnV0ZXMoKSA8IDEwID8gJzAnIDogJycpICsgbm93LmdldE1pbnV0ZXMoKS50b1N0cmluZygpOyBcblx0XHRcdHRpbWVzdGFtcCArPSAobm93LmdldFNlY29uZHMoKSA8IDEwID8gJzAnIDogJycpICsgbm93LmdldFNlY29uZHMoKS50b1N0cmluZygpO1xuXHRcdFx0cmV0dXJuIGZpbGVOYW1lLnRvVXBwZXJDYXNlKCkrXCJfXCIrdGltZXN0YW1wO1xuXHRcdFxuXHRcdH1cblx0XHRcblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVJlcG9ydChwYXJhbSwgY2hhcnRUaXRsZSxmbG93bk1vbnRoLHRhYkluZGV4KSB7XG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXHRcdFx0XG5cdFx0XHR2YXIgdGl0bGUgPSBcIlwiO1xuXHRcdFx0aWYocGFyYW0gPT0gXCJtZXRyaWNTbmFwc2hvdFwiKVxuXHRcdFx0XHR0aXRsZSA9IFwiTUVUUklDIFNOQVBTSE9UIC1cIitmbG93bk1vbnRoK1wiIFwiK2NoYXJ0VGl0bGUudG9VcHBlckNhc2UoKStcIi0gVklFV1wiO1xuXHRcdFx0ZWxzZSBpZihwYXJhbSA9PSBcInRhcmdldEFjdHVhbFwiKVxuXHRcdFx0XHR0aXRsZSA9IFwiVEFSR0VUIFZTIEFDVFVBTCAtIFwiKygoY2hhcnRUaXRsZSA9PSBcInJldmVudWVcIik/XCJORVQgUkVWRU5VRVwiOlwiUEFYIENvdW50XCIpK1wiIFwiK2Zsb3duTW9udGgrIFwiIC0gVklFV1wiO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aXRsZSA9IGNoYXJ0VGl0bGUrXCIgXCIrZmxvd25Nb250aCtcIiAtIFZJRVdcIjtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHR2YXIgc3ZnTm9kZSA9IGQzLnNlbGVjdEFsbChcIi5cIitwYXJhbSkuc2VsZWN0QWxsKFwic3ZnXCIpO1xuXHRcdFx0dmFyIGNvbnRlbnQgPSBbXTtcblx0XHRcdHZhciBpbWFnZUNvbHVtbiA9IFtdO1xuXHRcdFx0dmFyIHRleHRDb2x1bW4gPSBbXTtcblx0XHRcdHZhciBpbWFnZXNPYmogPSB7fTtcblx0XHRcdHZhciB0ZXh0T2JqID0ge307XG5cdFx0XHRjb250ZW50LnB1c2godGl0bGUpO1xuXHRcdFx0dmFyIG5vZGVFeGlzdHMgPSBbXTtcblx0XHRcdGFuZ3VsYXIuZm9yRWFjaChzdmdOb2RlLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XHRcdFx0XHRcblx0XHRcdFx0dmFyIGh0bWwgPSBcIlwiO1xuXHRcdFx0XHRpZihub2RlRXhpc3RzLmluZGV4T2Yoc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLWZsYWdcIikpID09IC0xICYmIHN2Z05vZGVba2V5XS5sZW5ndGggPj0gMSl7XG5cdFx0XHRcdFx0aHRtbCA9IHN2Z05vZGVba2V5XVswXS5wYXJlbnRFbGVtZW50LmlubmVySFRNTDtcblx0XHRcdFx0XHRpZihzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tcGRmRmxhZ1wiKSA9PT0gXCJkeW5hbWljV0hcIil7XG5cdFx0XHRcdFx0XHRkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKS5hdHRyKFwid2lkdGhcIiwxNTAwKTtcblx0XHRcdFx0XHRcdGQzLnNlbGVjdChcIi5cIitwYXJhbStcIkZsYWdcIikuc2VsZWN0KFwic3ZnXCIpLmF0dHIoXCJoZWlnaHRcIiw2MDApO1xuXHRcdFx0XHRcdFx0dmFyIG5vZGUgPSBkMy5zZWxlY3QoXCIuXCIrcGFyYW0rXCJGbGFnXCIpLnNlbGVjdChcInN2Z1wiKTtcblx0XHRcdFx0XHRcdGh0bWwgPSBub2RlWzBdWzBdLnBhcmVudEVsZW1lbnQuaW5uZXJIVE1MO1xuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWyd3aWR0aCddID0gNTAwO1xuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqWydoZWlnaHQnXSA9IDUwMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYoc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLXBkZkZsYWdcIikgPT09IFwicGRmRmxhZ1wiKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDc1MDtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnaGVpZ2h0J10gPSAzMDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhbnZnKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKSwgaHRtbCk7XG5cdFx0XHRcdFx0dmFyIGNhbnZhc0VsbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKTtcblx0XHRcdFx0XHR2YXIgaW1nc3JjID0gY2FudmFzRWxtLnRvRGF0YVVSTCgpO1xuXHRcdFx0XHRcdHZhciAgdGV4dCA9IFwiXFxuXCIrc3ZnTm9kZVtrZXldLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKFwiZGF0YS1pdGVtLXRpdGxlXCIpK1wiXFxuXCI7XG5cdFx0XHRcdFx0dGV4dE9ialsndGV4dCddID0gdGV4dDtcblx0XHRcdFx0XHR0ZXh0Q29sdW1uLnB1c2godGV4dE9iaik7XG5cdFx0XHRcdFx0aW1hZ2VzT2JqWydpbWFnZSddID0gaW1nc3JjO1xuXHRcdFx0XHRcdGltYWdlQ29sdW1uLnB1c2goaW1hZ2VzT2JqKTtcdFx0XHRcdFxuXHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxuXHRcdFx0XHRcdHR4dFRlbXBbJ2NvbHVtbnMnXSA9IHRleHRDb2x1bW47XG5cdFx0XHRcdFx0aW1nVGVtcFsnYWxpZ25tZW50J10gPSAnY2VudGVyJztcblx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcblx0XHRcdFx0XHRjb250ZW50LnB1c2godHh0VGVtcCk7XG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKGltZ1RlbXApO1x0XHRcdFx0XHRcblx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdHRleHRDb2x1bW4gPSBbXTtcblx0XHRcdFx0XHRpbWFnZXNPYmogPSB7fTtcblx0XHRcdFx0XHR0ZXh0T2JqID0ge307XG5cdFx0XHRcdFx0aW1nVGVtcCA9IHt9O1xuXHRcdFx0XHRcdHR4dFRlbXAgPXt9O1xuXHRcdFx0XHRcdG5vZGVFeGlzdHMucHVzaChzdmdOb2RlW2tleV0ucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWl0ZW0tZmxhZ1wiKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1x0XHRcdFxuXHRcdFx0aWYocGFyYW0gPT0gXCJyZXZlbnVlQW5hbHlzaXNcIil7XG5cdFx0XHRcdHZhciBub2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuZXQtcmV2ZW51ZS1jaGFydFwiKTtcblx0XHRcdFx0dmFyIG5vZGVMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbmV0LXJldmVudWUtcGRmJyk7XG5cdFx0XHRcdHZhciBub2RlRmxhZztcblx0XHRcdFx0aWYodGFiSW5kZXggPT09IDApXG5cdFx0XHRcdG5vZGVGbGFnID0gbm9kZUxpc3RbMF07XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0bm9kZUZsYWcgPSBub2RlTGlzdFsxXTtcblx0XHRcdFx0aHRtbDJjYW52YXMobm9kZUZsYWcpLnRoZW4oZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0XHRcdFx0dmFyIGMgPSBjYW52YXMudG9EYXRhVVJMKCk7XG5cdFx0XHRcdFx0dmFyICB0ZXh0ID0gXCJcXG5cXG5cXG5cXG5cXG5cXG5cXG5cXG5cXG5cXG5cXG5cXG5cIitub2RlLmdldEF0dHJpYnV0ZSgnZGF0YS1pdGVtLXRpdGxlJykrXCJcXG5cXG5cIjtcblx0XHRcdFx0XHR0ZXh0T2JqWyd0ZXh0J10gPSB0ZXh0O1xuXHRcdFx0XHRcdHRleHRDb2x1bW4ucHVzaCh0ZXh0T2JqKTtcblx0XHRcdFx0XHRpbWFnZXNPYmpbJ2ltYWdlJ10gPSBjO1xuXHRcdFx0XHRcdGltYWdlQ29sdW1uLnB1c2goaW1hZ2VzT2JqKTtcdFx0XHRcdFxuXHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxuXHRcdFx0XHRcdHR4dFRlbXBbJ2NvbHVtbnMnXSA9IHRleHRDb2x1bW47XG5cdFx0XHRcdFx0aW1nVGVtcFsnYWxpZ25tZW50J10gPSAnY2VudGVyJztcblx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcblx0XHRcdFx0XHRjb250ZW50LnB1c2godHh0VGVtcCk7XG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKGltZ1RlbXApO1x0XHRcdFx0XHRcblx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdHRleHRDb2x1bW4gPSBbXTtcblx0XHRcdFx0XHRpbWFnZXNPYmogPSB7fTtcblx0XHRcdFx0XHR0ZXh0T2JqID0ge307XG5cdFx0XHRcdFx0aW1nVGVtcCA9IHt9O1xuXHRcdFx0XHRcdHR4dFRlbXAgPXt9O1x0XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7Y29udGVudDogY29udGVudH0pO1xuXHRcdFx0XHR9KTtcdFx0XHRcdFxuXHRcdFx0fSBlbHNlIGlmKHBhcmFtID09IFwic2VjdG9yY2FycmllcmFuYWx5c2lzXCIpe1xuXHRcdFx0XHR2YXIgbm9kZUxpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdzZWN0b3JjYXJyaWVyYW5hbHlzaXMnKTtcdFx0XHRcdFxuXHRcdFx0XHR2YXIgbm9kZUZsYWcgPSBbXTtcblx0XHRcdFx0aWYodGFiSW5kZXggPT0gMCAmJiBub2RlTGlzdC5sZW5ndGggPT0gMil7XG5cdFx0XHRcdFx0bm9kZUZsYWcucHVzaChub2RlTGlzdFswXSk7XG5cdFx0XHRcdH1lbHNlIGlmKHRhYkluZGV4ID09IDAgJiYgbm9kZUxpc3QubGVuZ3RoID09IDQpe1xuXHRcdFx0XHRcdG5vZGVGbGFnLnB1c2gobm9kZUxpc3RbMF0pO25vZGVGbGFnLnB1c2gobm9kZUxpc3RbMV0pO1xuXHRcdFx0XHR9ZWxzZSBpZih0YWJJbmRleCAhPSAwICYmIG5vZGVMaXN0Lmxlbmd0aCA9PSAyKXtcblx0XHRcdFx0XHRub2RlRmxhZy5wdXNoKG5vZGVMaXN0WzFdKTtcblx0XHRcdFx0fWVsc2UgaWYodGFiSW5kZXggIT0gMCAmJiBub2RlTGlzdC5sZW5ndGggPT0gNCl7XG5cdFx0XHRcdFx0bm9kZUZsYWcucHVzaChub2RlTGlzdFsyXSk7bm9kZUZsYWcucHVzaChub2RlTGlzdFszXSk7XG5cdFx0XHRcdH1cblx0XHRcdFxuXHRcdFx0XG5cdFx0XHRcdFxuXHRcdFx0XHRhbmd1bGFyLmZvckVhY2gobm9kZUZsYWcsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcdFx0XHRcblx0XHRcdFx0XHRodG1sMmNhbnZhcyhub2RlRmxhZ1trZXldKS50aGVuKGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdFx0XHRcdFx0dmFyIGMgPSBjYW52YXMudG9EYXRhVVJMKCk7XG5cdFx0XHRcdFx0XHR2YXIgIHRleHQgPSBcIlxcblxcblwiK25vZGVGbGFnW2tleV0uZ2V0QXR0cmlidXRlKCdkYXRhLWl0ZW0tdGl0bGUnKStcIlxcblxcblwiO1xuXHRcdFx0XHRcdFx0dGV4dE9ialsndGV4dCddID0gdGV4dDtcblx0XHRcdFx0XHRcdHRleHRDb2x1bW4ucHVzaCh0ZXh0T2JqKTtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDUwMDtcblx0XHRcdFx0XHRcdGltYWdlc09ialsnaW1hZ2UnXSA9IGM7XG5cdFx0XHRcdFx0XHRpbWFnZUNvbHVtbi5wdXNoKGltYWdlc09iaik7XHRcdFx0XHRcblx0XHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxuXHRcdFx0XHRcdFx0dHh0VGVtcFsnY29sdW1ucyddID0gdGV4dENvbHVtbjtcblx0XHRcdFx0XHRcdGltZ1RlbXBbJ2FsaWdubWVudCddID0gJ2NlbnRlcic7XG5cdFx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcblx0XHRcdFx0XHRcdGNvbnRlbnQucHVzaCh0eHRUZW1wKTtcblx0XHRcdFx0XHRcdGNvbnRlbnQucHVzaChpbWdUZW1wKTtcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdFx0dGV4dENvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdFx0aW1hZ2VzT2JqID0ge307XG5cdFx0XHRcdFx0XHR0ZXh0T2JqID0ge307XG5cdFx0XHRcdFx0XHRpbWdUZW1wID0ge307XG5cdFx0XHRcdFx0XHR0eHRUZW1wID17fTtcdFxuXHRcdFx0XHRcdFx0aWYoa2V5ID09IG5vZGVGbGFnLmxlbmd0aC0xKXtcblx0XHRcdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh7Y29udGVudDogY29udGVudH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1x0XHRcdFx0XHRcblx0XHRcdFx0fSk7XHRcdFxuXHRcdFx0fWVsc2UgaWYocGFyYW0gPT0gXCJyb3V0ZXJldmVudWVcIil7XHRcdFx0XHRcblx0XHRcdFx0dmFyIG5vZGVMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgncm91dGUtcmV2ZW51ZS1wZGYnKTtcblx0XHRcdFx0dmFyIG5vZGVGbGFnO1xuXHRcdFx0XHRpZih0YWJJbmRleCA9PT0gMClcblx0XHRcdFx0bm9kZUZsYWcgPSBub2RlTGlzdFswXTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRub2RlRmxhZyA9IG5vZGVMaXN0WzFdO1xuXHRcdFx0XHRodG1sMmNhbnZhcyhub2RlRmxhZykudGhlbihmdW5jdGlvbihjYW52YXMpIHtcblx0XHRcdFx0XHR2YXIgYyA9IGNhbnZhcy50b0RhdGFVUkwoKTtcblx0XHRcdFx0XHR2YXIgIHRleHQgPSBcIlwiO1xuXHRcdFx0XHRcdHRleHRPYmpbJ3RleHQnXSA9IHRleHQ7XG5cdFx0XHRcdFx0dGV4dENvbHVtbi5wdXNoKHRleHRPYmopO1xuXHRcdFx0XHRcdGltYWdlc09ialsnd2lkdGgnXSA9IDUwMDtcblx0XHRcdFx0XHRpbWFnZXNPYmpbJ2ltYWdlJ10gPSBjO1xuXHRcdFx0XHRcdGltYWdlQ29sdW1uLnB1c2goaW1hZ2VzT2JqKTtcdFx0XHRcdFxuXHRcdFx0XHRcdHZhciBpbWdUZW1wID17fSwgdHh0VGVtcCA9e307XHRcdFxuXHRcdFx0XHRcdHR4dFRlbXBbJ2NvbHVtbnMnXSA9IHRleHRDb2x1bW47XG5cdFx0XHRcdFx0aW1nVGVtcFsnYWxpZ25tZW50J10gPSAnY2VudGVyJztcblx0XHRcdFx0XHRpbWdUZW1wWydjb2x1bW5zJ10gPSBpbWFnZUNvbHVtbjtcblx0XHRcdFx0XHRjb250ZW50LnB1c2godHh0VGVtcCk7XG5cdFx0XHRcdFx0Y29udGVudC5wdXNoKGltZ1RlbXApO1x0XHRcdFx0XHRcblx0XHRcdFx0XHRpbWFnZUNvbHVtbiA9IFtdO1xuXHRcdFx0XHRcdHRleHRDb2x1bW4gPSBbXTtcblx0XHRcdFx0XHRpbWFnZXNPYmogPSB7fTtcblx0XHRcdFx0XHR0ZXh0T2JqID0ge307XG5cdFx0XHRcdFx0aW1nVGVtcCA9IHt9O1xuXHRcdFx0XHRcdHR4dFRlbXAgPXt9O1x0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoe2NvbnRlbnQ6IGNvbnRlbnR9KTtcblx0XHRcdFx0fSk7XHRcblx0XHRcdH1lbHNle1xuXHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHtjb250ZW50OiBjb250ZW50fSk7XG5cdFx0XHR9XG5cdFx0XG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcblx0XHR9O1xuXHRcdFxuXHQgfVxuICAgIFxufSkoKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
