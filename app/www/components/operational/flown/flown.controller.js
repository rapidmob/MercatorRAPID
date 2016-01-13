(function () {
    'use strict';
    angular.module('rapidMobile').controller('OperationalFlownController', ['$scope', 
                                                         'ChartOptions',
                                                         '$ionicLoading', '$timeout', '$window',
                                                         '$ionicPopover', 'FilteredListService', 
                                                         '$filter', 'LoginService',
                                                          OperationalFlownController]);

    function OperationalFlownController($scope, ChartOptions,
                          $ionicLoading, $timeout, $window,
                          $ionicPopover, FilteredListService, 
                          $filter, LoginService) {
    };
})();