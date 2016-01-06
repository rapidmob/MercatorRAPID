(function(){
  angular.module('rapidMobile.controllers')

  .controller('LoginController', function($scope, $state, LoginService) {
    // Form data for the login modal
    $scope.loginData = {};
    $scope.invalidMessage = false;
    $scope.logout = function() {
      LoginService.logout();
      $state.go("login");
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
  })
})();