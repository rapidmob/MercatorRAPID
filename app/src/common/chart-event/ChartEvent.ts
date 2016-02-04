/// <reference path="../../_libs.ts" />

class ChartEvent implements ng.IDirective {
	restrict = 'E';
	scope = {
		type: "="
	};
	constructor(private $timeout: ng.ITimeoutService, private $rootScope: ng.IRootScopeService) {
	};

	link = ($scope: ng.IScope, iElement: JQuery, attributes: ng.IAttributes, $sce: ng.ISCEService): void => {
		var self = this;
		
		var nvd3 = iElement.find('nvd3')[0];
		var selectedElem = angular.element(nvd3);
		self.$timeout(
			() => {
				selectedElem.ready(function(e) {
					var childElem: any = selectedElem.find('g');
					angular.forEach(childElem, function(elem, key) {
						if (elem.attributes['class']) {
							var className = elem.attributes['class'].value;
							if (className == 'nv-bar positive') {
								var rectElem = angular.element(elem);
								console.log(rectElem);
								rectElem.on('dblclick', function (event) {
									var type = attributes.type; 
									self.$rootScope.$broadcast('openDrillPopup', {"data" : rectElem[0]['__data__'], "type": type, "event": event});
								})
							}
						}
					});
				});
			},
			10);
	}

	static factory(): ng.IDirectiveFactory {
		var directive = ($timeout: ng.ITimeoutService, $rootScope: ng.IRootScopeService) => new ChartEvent($timeout, $rootScope)
		directive.$inject = ['$timeout', '$rootScope'];
		return directive;
	}
	
}
