(function () {
  angular.module('rapidMobile').factory('MisService', function (DataProviderService, $q) {
     return {
        getMetricSnapshot: function(reqdata) {
          // the $http API is based on the deferred/promise APIs exposed by the $q service
          // so it returns a promise for us by default

          return DataProviderService.postData('/paxflnmis/metricsnapshot',reqdata)
          .then(function(response) {
            if (typeof response.data === 'object') {
              return response.data;
            } else {
              // invalid response
              return $q.reject(response.data);
            }
          }, function(response) {
            // something went wrong
            return $q.reject(response.data);
          });
        },

        getTargetVsActual: function(reqdata) {
          return DataProviderService.postData('/paxflnmis/targetvsactual',reqdata)
          .then(function(response) {
            if (typeof response.data === 'object') {
              return response.data;
            } else {
              // invalid response
              return $q.reject(response.data);
            }
          }, function(response) {
            // something went wrong
            return $q.reject(response.data);
          });
        },

        getRevenueAnalysis: function(reqdata) {
          return DataProviderService.postData('/paxflnmis/revenueanalysis',reqdata)
          .then(function(response) {
            if (typeof response.data === 'object') {
              return response.data;
            } else {
              // invalid response
              return $q.reject(response.data);
            }
          }, function(response) {
            // something went wrong
            return $q.reject(response.data);
          });
        },

        getRouteRevenue: function(reqdata) {
          return DataProviderService.postData('/paxflnmis/routerevenue',reqdata)
          .then(function(response) {
            if (typeof response.data === 'object') {
              return response.data;
            } else {
              // invalid response
              return $q.reject(response.data);
            }
          }, function(response) {
            // something went wrong
            return $q.reject(response.data);
          });
        },

        getSectorCarrierAnalysis: function(reqdata) {
          return DataProviderService.postData('/paxflnmis/sectorcarrieranalysis',reqdata)
          .then(function(response) {
            if (typeof response.data === 'object') {
              return response.data;
            } else {
              // invalid response
              return $q.reject(response.data);
            }
          }, function(response) {
            // something went wrong
            return $q.reject(response.data);
          });
        },

        getPaxFlownMisHeader: function(reqdata) {
          return DataProviderService.postData('/paxflnmis/paxflownmisheader',reqdata)
          .then(function(response) {
            if (typeof response.data === 'object') {
              return response.data;
            } else {
              // invalid response
              return $q.reject(response.data);
            }
          }, function(response) {
            // something went wrong
            return $q.reject(response.data);
          });
        },

        getRouteRevenueDrillDown: function(reqdata) {
          return DataProviderService.postData('/paxflnmis/routerevenuedrill',reqdata)
          .then(function(response) {
            if (typeof response.data === 'object') {
              return response.data;
            } else {
              // invalid response
              return $q.reject(response.data);
            }
          }, function(response) {
            // something went wrong
            return $q.reject(response.data);
          });
        }

      };
    });
})();