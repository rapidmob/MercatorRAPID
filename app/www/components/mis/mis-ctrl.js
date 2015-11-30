(function () {
    'use strict';
    angular.module('rapidMobile.controllers').controller('MisCtrl', ['$stateParams', MisCtrl]);

    function MisCtrl($stateParams) {
        $scope.tabs = [
						{"text" : "MyDashboard"},
						{"text" : "Metric Snapshot"},
						{"text" : "Target Vs Actual"},
						{"text" : "Revenue Analysis"},
						{"text" : "Sector & Carrier Analysis"},
						{"text" : "Route Revenue"}
					];
    };
})();