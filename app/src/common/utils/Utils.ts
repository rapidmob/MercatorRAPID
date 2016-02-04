/// <reference path="../../_libs.ts" />

class Utils {
	public static isNotEmpty(...values: Object[]): boolean {
		var isNotEmpty = true;
		_.forEach(values, (value) => {
			isNotEmpty = isNotEmpty && (angular.isDefined(value) && value !== null && value !== ''
				&& !((_.isArray(value) || _.isObject(value)) && _.isEmpty(value)) && value != 0);
		});
		return isNotEmpty;
	}

	public static isLandscape(): boolean {
		var isLandscape: boolean = false;
		if (window && window.screen && window.screen.orientation) {
			var type: string = <string>(_.isString(window.screen.orientation) ? window.screen.orientation : window.screen.orientation.type);
			if (type) {
				isLandscape = type.indexOf('landscape') >= 0;
			}
		}
		return isLandscape;
	}

	public static getTodayDate(): Date {
		var todayDate = new Date();
		todayDate.setHours(0, 0, 0, 0);
		return todayDate;
	}
	private static isInteger(number: BigJsLibrary.BigJS): boolean {
		return parseInt(number.toString()) == +number;
	}
}