(function () {
	'use strict';
	angular.module('rapidMobile').directive('heCustomPieChart', function () {
		var d3pieDirectiveObj =  {
			restrict: 'E',
			replace: true,
			scope: {data: '=chartData'},
			link: function (scope, element, attrs) {
				scope.$watch('data', function(newValue, oldValue) {
          			if (newValue) {
          				angular.element(element[0]).html('');
          				var pie = new d3pie(element[0], {
							"size": {
								"canvasHeight": 300,
								"canvasWidth": 300,
								"pieOuterRadius": "68%"
							},
							data: {content: scope.data},
							"labels": {
								"outer": {
									"format": "label-value2",
									"pieDistance": 20
								},
								"inner": {
									"format": "percentage"
								},
								"mainLabel": {
									"font": "verdana",
									"fontSize": 16
								},
								"percentage": {
									"color": "#000",
									"font": "verdana",
									"decimalPlaces": 0,
									"fontSize": 14
								},
								"value": {
									"color": "#000",
									"font": "verdana",
									"fontSize": 14
								},
								"lines": {
									"enabled": true,
									"color": ""
								},
								"truncation": {
									"enabled": true
								}
							},
							"tooltips": {
								"enabled": true,
								"type": "placeholder",
								"string": "{label}: {value}%"
							},
							"effects": {
								"pullOutSegmentOnClick": {
									"effect": "linear",
									"speed": 400,
									"size": 8
								}
							}
						});
						
          			}
          		});
			}
		};
		return d3pieDirectiveObj;
  	});
})();