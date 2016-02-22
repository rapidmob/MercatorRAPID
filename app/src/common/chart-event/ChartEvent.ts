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
		var nvd3
		if(attributes.type == 'metric' || attributes.type == 'target' || attributes.type == 'passenger-count'){
			nvd3 = iElement.find('nvd3')[0];
		}
		if(attributes.type == 'flight-process' || attributes.type == 'flight-count' || attributes.type == 'coupon-count'){
			nvd3 = iElement.find('nvd3-multi-bar-chart')[0];
		}
		
		var selectedElem = angular.element(nvd3);

		
					

		self.$timeout(
			() => {
				selectedElem.ready(function(e) {
					var first: number;
					selectedElem.on('mouseover touchend', function(event) {
						if(!first){
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
			},
			10);
	}

	static factory(): ng.IDirectiveFactory {
		var directive = ($timeout: ng.ITimeoutService, $rootScope: ng.IRootScopeService) => new ChartEvent($timeout, $rootScope)
		directive.$inject = ['$timeout', '$rootScope'];
		return directive;
	}

	appendClick(selectedElem, attributes, self) {
		var dblClickInterval = 300;
		var firstClickTime;
		var waitingSecondClick = false;
		var childElem: any = selectedElem.find('rect');
		angular.forEach(childElem, function(elem, key) {
			if (elem.tagName == 'rect') {
				var rectElem = angular.element(elem);
				rectElem.on('click', function(event) {
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
							if(attributes.type == 'metric' || attributes.type == 'target' || attributes.type == 'passenger-count'){
								self.$rootScope.$broadcast('openDrillPopup', {"data" : rectElem[0]['__data__'], "type": type, "event": event}); 
							}else{
								console.log(rectElem);
								self.$rootScope.$broadcast('openDrillPopup1', {"data" : rectElem[0]['__data__'], "type": type, "event": event}); 
							}
						}
					}
				})
			}
		}); 
	}
}
