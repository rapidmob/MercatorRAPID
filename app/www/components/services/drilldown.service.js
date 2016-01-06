(function () {
  angular.module('rapidMobile.services').factory('FilteredListService', function (DataProviderService, $q) {
     return {
      searched: function (valLists,toSearch) {
        return _.filter(valLists, 
          function (i) {
            /* Search Text in all 3 fields */
            return searchUtil(i, toSearch);
          });        
      },
      paged: function (valLists,pageSize) {
        retVal = [];
        for (var i = 0; i < valLists.length; i++) {
          if (i % pageSize === 0) {
            retVal[Math.floor(i / pageSize)] = [valLists[i]];
          } else {
            retVal[Math.floor(i / pageSize)].push(valLists[i]);
          }
        }
        return retVal;
      }
    };
  });
})();

function searchUtil(item, toSearch) {
    /* Search Text in all 3 fields */
  if(item.countryFrom && item.countryTo) {
    return (item.countryFrom.toLowerCase().indexOf(toSearch.toLowerCase()) > -1 || item.countryTo.toLowerCase().indexOf(toSearch.toLowerCase()) > -1 ) ? true : false;
  } else {
    return false;
  }

}