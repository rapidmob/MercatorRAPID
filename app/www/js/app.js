// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'rapidMobile' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'rapidMobile.controllers' is found in controllers.js

var SERVER_URL = 'http://10.91.152.99:8082/v1/api';

angular.module('rapidMobile', ['ionic', 'rapidMobile.controllers', 'rapidMobile.services', 'tabSlideBox', 'nvd3'])

.run(function($ionicPlatform, $http) {
  $http.defaults.headers.common.token = 'token';
  $http.defaults.headers.post["Content-Type"] = "application/json";
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider 

    .state('app', {
    url: '/app',
    abstract: true,
    templateUrl: 'templates/menu.html',
    controller: 'LoginController',
    onEnter: function($state, LoginService,$window){
      if(!LoginService.isLoggedIn()){
        $state.go('login');     
      }
    }
  })  

  .state('login', {
    url: "/login",
    templateUrl: "components/user/login.html",
    controller: 'LoginController'
  })
  
  .state('app.mis-flown', {
    url: '/mis/flown',
    views: {
      'menuContent': {
        templateUrl: 'components/mis/flown.html',
        controller: 'MisController'
      }
    }
  })
  .state('app.mis-sales', {
    url: '/mis/sales',
    views: {
      'menuContent': {
        templateUrl: 'components/mis/sales.html',
        controller: 'MisController'
      }
    }
  });
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/login');
});
