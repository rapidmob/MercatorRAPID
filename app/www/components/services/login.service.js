(function () {
  angular.module('rapidMobile.services',[]).factory('LoginService', function (DataProviderService, $q,$window) {
    var _user = JSON.parse($window.localStorage.getItem('rapidMobile.user'));
    var setUser = function (user) {
      _user = user;
      if($window.localStorage) {
        $window.localStorage.setItem('rapidMobile.user', JSON.stringify(_user));
      }
      // console.log(_user);
    }
     return {
        getLoginUser: function(reqdata) {
            return DataProviderService.postData('/rest/radar-dashboard/user/Login',reqdata)
                .then(function(response) {
                  if (typeof response.data === 'object') {
                        return response.data;
                    } else {
                        // invalid response
                        return $q.reject(response.data);
                    }

                }, function(response) {
                    // something went wrong
                    console.log('an error occured on log in');
                    return $q.reject(response.data);
                });
        },
        setUser: setUser,
        isLoggedIn: function () {
         return _user ? true : false;
        },
        getUser: function () {
         return _user;
        },
        logout: function () {
         $window.localStorage.setItem('rapidMobile.user', null);
         _user = null;
        },
        getUserProfile: function(reqdata) {
            return DataProviderService.postData('/rest/radar-dashboard/user/UserProfile',reqdata)
                .then(function(response) {
                  if (typeof response.data === 'object') {
                        return response.data;
                    } else {
                        // invalid response
                        return $q.reject(response.data);
                    }

                }, function(response) {
                    // something went wrong
                    return $q.reject(response.data);
                });
        }
     };
  });
})();