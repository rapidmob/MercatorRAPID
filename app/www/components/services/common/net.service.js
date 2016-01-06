(function(){
    angular.module('rapidMobile.services').factory('NetService', function ($http, $q, $rootScope) {
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