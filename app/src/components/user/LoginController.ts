/// <reference path="../../_libs.ts" />

class LoginController {
	public static $inject = ['$scope', '$state', 'UserService', '$ionicHistory'];
	private invalidMessage: boolean = false;
	private username: string;
	private password: string;
	private ipaddress: string;
	private eroormessage: string;

	constructor(private $scope: ng.IScope, private $state: angular.ui.IStateService,
	private userService: UserService, private $ionicHistory: any) {
		if (this.userService.isLoggedIn()) {
			$ionicHistory.nextViewOptions({
				disableBack: true
			});
			console.log('navgating to mis-flown..');
			this.$state.go(this.userService.defaultPage);
		}
	}

	clearError() {
		this.invalidMessage = false;
	}

	doLogin(loginForm: boolean) {
		if (!loginForm) {
			if (!angular.isDefined(this.username) || !angular.isDefined(this.password) || !angular.isDefined(this.ipaddress) ||this.username.trim() == "" || this.password.trim() == "" || this.ipaddress.trim() == "") {
				this.invalidMessage = true;
			}
			SERVER_URL = 'http://' + this.ipaddress + '/' + 'rapid-ws/services/rest';
			this.userService.login(this.username,this.password).then(
				(result) => {
					if (result.response.status == "success") {						
						var req = {
							userId: this.username
						}
						this.userService.getUserProfile(req).then(
							(profile) => {
								var userName = {
									username: profile.response.data.userInfo.userName
								}
								this.userService.setUser(userName);
								this.$ionicHistory.nextViewOptions({
									disableBack: true
								}); 
								this.$state.go(this.userService.defaultPage);
							},
							(error) => {
								console.log('an error occured on loading user profile');
								
						});
						
					} else {
						this.invalidMessage = true;
						this.eroormessage = "Please check your credentials";
					}
				},
				(error) => {
					this.invalidMessage = true;
					this.eroormessage = "Please check your network connection";
				});
		} 
	}
}