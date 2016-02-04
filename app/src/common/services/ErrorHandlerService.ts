/// <reference path="../../_libs.ts" />

/// <reference path="NetService.ts" />
/// <reference path="CordovaService.ts" />

module errorhandler {
	export const STATUS_FAIL: string = 'fail';
	export const SEVERITY_ERROR_HARD: string = 'HARD';
	export const SEVERITY_ERROR_SOFT: string = 'SOFT';
	export const HARD_ERROR_INVALID_SESSION_TOKEN = 'SEC.025';
	export const HARD_ERROR_INVALID_SESSION = 'SES.004';
	export const HARD_ERROR_TOKEN_EXPIRED = 'SEC.038';
	export const HARD_ERROR_INVALID_USER_SESSION_EXPIRED = 'SES.003';
	export const HARD_ERROR_NO_RESULT = 'COM.111';
	export const HARD_ERROR_NO_ROUTE = 'FLT.010';
}

class ErrorHandlerService {

	public static $inject = ['NetService', 'CordovaService', '$q', '$rootScope'];

	constructor(
		private netService: NetService, private cordovaService: CordovaService, private $q: ng.IQService,
		private $rootScope: ng.IScope) {
	}

	validateResponse(response: any) {
		var errors = response.data.response ? response.data.response.errors : [];
		if (this.hasErrors(errors) || errorhandler.STATUS_FAIL == response.status) {
			if (!this.hasInvalidSessionError(errors) && !this.hasNoResultError(errors)) {
				// broadcast to appcontroller server error
				this.$rootScope.$broadcast('serverError', response);
			}
		}
	}

	isNoResultFound(response: any): boolean {
		var errors = response.data.response ? response.data.response.errors : [];
		return this.hasNoResultError(errors);
	}

	isSessionInvalid(response: any): boolean {
		var errors = response.data.response ? response.data.response.errors : [];
		return this.hasInvalidSessionError(errors);
	}

	hasHardErrors(response: any): boolean {
		var errors = response.data.response ? response.data.response.errors : [];
		return this.hasHardError(errors);
	}

	hasSoftErrors(response: any): boolean {
		var errors = response.data.response ? response.data.response.errors : [];
		return this.hasSoftError(errors);
	}

	private hasErrors(errors: any): boolean {
		return errors.length > 0;
	}

	private hasInvalidSessionError(errors: any): boolean {
		return _.some(errors, (error: any) => {
			return error && errorhandler.SEVERITY_ERROR_HARD == error.severity &&
			(errorhandler.HARD_ERROR_INVALID_SESSION_TOKEN == error.code ||
				errorhandler.HARD_ERROR_INVALID_SESSION == error.code ||
				errorhandler.HARD_ERROR_INVALID_USER_SESSION_EXPIRED == error.code ||
				errorhandler.HARD_ERROR_TOKEN_EXPIRED == error.code);
		});
	}

	private hasNoResultError(errors: any): boolean {
		return _.some(errors, (error: any) => {
			return error && errorhandler.SEVERITY_ERROR_HARD == error.severity &&
			(errorhandler.HARD_ERROR_NO_RESULT == error.code ||
				errorhandler.HARD_ERROR_NO_ROUTE == error.code);
		}) && errors.length == 1;
	}

	private hasHardError(errors: any): boolean {
		return _.some(errors, (error: any) => {
			return error && errorhandler.SEVERITY_ERROR_HARD == error.severity;
		});
	}

	private hasSoftError(errors: any): boolean {
		return _.some(errors, (error: any) => {
			return error && errorhandler.SEVERITY_ERROR_SOFT == error.severity;
		});
	}
}