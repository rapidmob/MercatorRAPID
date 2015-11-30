angular.module('rapidMobile.controllers')

.controller('LoginCtrl', function($scope, $state, Auth) {
  // Form data for the login modal
  $scope.loginData = {};  

  $scope.logout = function() {
    Auth.logout();
    $state.go("login");
  };

   // Perform the login action when the user submits the login form
  $scope.doLogin = function() {

    if(!angular.isDefined($scope.loginData.username) || !angular.isDefined($scope.loginData.password) || $scope.loginData.username.trim() == "" || $scope.loginData.password.trim() == ""){
       alert("Enter both user name and password");
       return;
    }  

    Auth.setUser({
      username: $scope.loginData.username
    });

    $state.go("app.playlists");
    
  };

})