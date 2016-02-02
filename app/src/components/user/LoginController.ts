/// <reference path="../../_libs.ts" />

class LoginController {
	public static $inject = ['$scope', '$state', 'UserService'];
	private invalidMessage: boolean = false;
	private username: string;
	private password: string;
	private ipaddress: string;
	private eroormessage: string;

	constructor(private $scope: ng.IScope, private $state: angular.ui.IStateService, 
		private userService: UserService) {

	}

	clearError() {
		this.invalidMessage = false;
	}

	logout() {
		this.$state.go("app.login");
	}

	doLogin(loginForm: boolean) {
		if (!loginForm) {
			if (!angular.isDefined(this.username) || !angular.isDefined(this.password) || !angular.isDefined(this.ipaddress) ||this.username.trim() == "" || this.password.trim() == "" || this.ipaddress.trim() == "") {
				this.invalidMessage = true;
			}
			//SERVER_URL = 'http://' + this.ipaddress + '/' + 'rapid-ws/services/rest';
			this.userService.login(this.username,this.password).then(
				(result) => {
					if (result.response.status == "success") {
						this.$state.go("app.mis-flown");
					} else {
						this.invalidMessage = true;
						this.eroormessage = "Please check your credentials";
					}
				},
				(error) => {
					this.invalidMessage = true;
					this.eroormessage = "Please check your network connection";
				});
		}else {
			this.invalidMessage = true;
			this.eroormessage = "Please check your credentials";
		}   
	}
}