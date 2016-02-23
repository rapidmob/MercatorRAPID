(function () {
	'use strict';
	angular.module('rapidMobile').directive('heCustomPieChart', function () {
		var d3pieDirectiveObj =  {
			restrict: 'E',
			replace: true,
			scope: {data: '=chartData',height:'@chartHeight',width:'@chartWidth',formatType:'@formatValue'},
			link: function (scope, element, attrs) {
				scope.$watch('data', function(newValue, oldValue) {
          			if (newValue) {
          				angular.element(element[0]).html('');
          				var pie = new d3pie(element[0], {
							"size": {
								"canvasHeight": scope.height,
								"canvasWidth": scope.width,
								"pieOuterRadius": "70%"
							},
							data: {content: scope.data},
							"labels": {
								"outer": {
									"format": scope.formatType,
									"pieDistance": 20
								},
								"inner": {
									"format": "percentage"
								},
								"mainLabel": {
									"fontSize": 15
								},
								"percentage": {
									"color": "#000",
									"decimalPlaces": 0,
									"fontSize": 14
								},
								"value": {
									"color": "#000",
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
								"string": "{label}: {value}%",
								"styles": {
									"backgroundColor": "#ffffff",
									"backgroundOpacity": 1,
									"color": "#000000",
									"fontSize": 12
								}
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