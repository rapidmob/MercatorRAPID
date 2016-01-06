(function (){
   angular.module('rapidMobile.services').factory('DataProviderService', function ($http, $q, $rootScope, NetService) {
      return {
         netService: NetService,
         $q: $q,
         $rootScope: $rootScope,
         isConnectedToNetwork: true,

         getData: function(req) {
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