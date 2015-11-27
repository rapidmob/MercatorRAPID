angular.module('rapidMobile.services', ['ngCookies'])

// .service('loginService', function($q) {
//     return {
//         loginUser: function(name, pw) {
//             var deferred = $q.defer();
//             var promise = deferred.promise;
 
//             if (name == 'user' && pw == 'secret') {
//                 deferred.resolve('Welcome ' + name + '!');
//             } else {
//                 deferred.reject('Wrong credentials.');
//             }
//             promise.success = function(fn) {
//                 promise.then(fn);
//                 return promise;
//             }
//             promise.error = function(fn) {
//                 promise.then(null, fn);
//                 return promise;
//             }
//             return promise;
//         }
//     }
// })


.factory('Auth', function ($cookieStore) {
   var _user = $cookieStore.get('rapidMobile.user');
   var setUser = function (user) {
      _user = user;
      $cookieStore.put('rapidMobile.user', _user);
   }
 
   return {
      setUser: setUser,
      isLoggedIn: function () {
         return _user ? true : false;
      },
      getUser: function () {
         return _user;
      },
      logout: function () {
         $cookieStore.remove('rapidMobile.user');
         _user = null;
      }
   }
});