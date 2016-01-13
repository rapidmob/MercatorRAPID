(function(){
  angular.module('rapidMobile')

  .controller('LoginController', function($scope, $state, LoginService, $timeout, $ionicLoading) {
    // Form data for the login modal
    $scope.loginData = {};
    $scope.invalidMessage = false;
    $scope.logout = function() {
      $scope.ionicLoadingShow();
      LoginService.logout();
      location.reload();
      $timeout(function() {  
      $state.go("login");
      $scope.ionicLoadingHide(); 
      },100,false); 
    };
     
    $scope.clearError = function() {
      $scope.invalidMessage = false;
    }
    // Perform the login action when the user submits the login form
    $scope.doLogin = function(loginForm) {
      if(loginForm.$valid) {
      // LoginService.setUser({username: ""});
      if(!angular.isDefined($scope.loginData.username) || !angular.isDefined($scope.loginData.password) || $scope.loginData.username.trim() == "" || $scope.loginData.password.trim() == ""){
        $scope.invalidMessage = true;
      }  
      reqdata = {
          userId : $scope.loginData.username,
          password : $scope.loginData.password
      }
      SERVER_URL = 'http://'+$scope.loginData.ipaddress+'/v1/api';
      console.log(SERVER_URL);
      LoginService.getLoginUser(reqdata)
        .then(function(data) {
             if(data.response.status == "success") {
              var req = {
                  userId : $scope.loginData.username
              }
              LoginService.getUserProfile(req)
                .then(function(data){
                  LoginService.setUser({
                     username: data.response.data.userInfo.userName
                  });

                  $state.go("app.mis-flown");
                } ,function(error){
                    console.log(error);
                });
                        
            }
            else {
              $scope.invalidMessage= true;
              $scope.eroormessage = "Please check your credentials";
            }
          }, function(error) {
              $scope.invalidMessage= true;
              $scope.eroormessage = "Please check your network connection";
        });
      }
      else {
        $scope.invalidMessage= true;
        $scope.eroormessage = "Please check your credentials";
      }      
    }

    $scope.ionicLoadingShow = function() {
            $ionicLoading.show({
                template: '<ion-spinner class="spinner-calm"></ion-spinner>'
            });
    };
    $scope.ionicLoadingHide = function() {
            $ionicLoading.hide();
    };   
  })
})();