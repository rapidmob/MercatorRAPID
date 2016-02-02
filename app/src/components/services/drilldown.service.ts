(function () {
  angular.module('rapidMobile').factory('FilteredListService', function (DataProviderService, $q) {
     return {
      searched: function (valLists,toSearch,level, drilltype) {
        return _.filter(valLists, 
          function (i) {
            /* Search Text in all 3 fields */
            return searchUtil(i, toSearch, level, drilltype);
          });        
      },
      paged: function (valLists,pageSize) {
        retVal = [];
        if(valLists){
        for (var i = 0; i < valLists.length; i++) {
          if (i % pageSize === 0) {
            retVal[Math.floor(i / pageSize)] = [valLists[i]];
          } else {
            retVal[Math.floor(i / pageSize)].push(valLists[i]);
          }
        }
      }
        return retVal;
      }
    };
  });
})();

function searchUtil(item, toSearch, level, drilltype) {
    /* Search Text in all 3 fields */
  if(drilltype == 'route') {
    if(item.countryFrom && item.countryTo && level == 0) {
      return (item.countryFrom.toLowerCase().indexOf(toSearch.toLowerCase()) > -1 || item.countryTo.toLowerCase().indexOf(toSearch.toLowerCase()) > -1 ) ? true : false;
    } else if(item.flownSector && level == 1) {
      return (item.flownSector.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
    } else if(item.flightNumber && level == 2) {
      return (item.flightNumber.toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
    } else if(item['document#'] && level == 2) {
      return (item['document#'].toLowerCase().indexOf(toSearch.toLowerCase()) > -1) ? true : false;
    } else {
      return false;
    }
  }
  if(drilltype == 'bar') {
    if(item.routeCode && level == 0) {
      return (item.routeCode.toLowerCase().indexOf(toSearch.toLowerCase()) > -1 ) ? true : false;
    }else if(item.flownSector && level == 1) {
      return (item.flownSector.toLowerCase().indexOf(toSearch.toLowerCase()) > -1 ) ? true : false;
    }else if(item.flightNumber && level == 2) {
      return (item.flightNumber.toLowerCase().indexOf(toSearch.toLowerCase()) > -1 ) ? true : false;
    } else {
      return false;
    }
  }

}