(function () {
  'use strict';
  angular.module('rapidMobile')
  .directive('heRevenueProgressBar', function () {
    var revBarObject = {
      restrict: 'E',
      replace: false,
      scope: {data: '=chartData'},
      link: function (scope, element, attrs) {
        // console.log(scope.data);
        scope.$watch('data', function(newValue, oldValue) {
          if (newValue) {
            // console.log('newValue', newValue);
            var x = d3.scale.linear()
                      .domain([0, d3.max(scope.data, function(d) { return d.value })])
                      .range([0, 90]);

            var segment = d3.select(element[0])
                         .selectAll(".net-rev-bar-graph-segment")
                         .data(scope.data)
                         .enter()
                         .append("div")
                         .classed("net-rev-bar-graph-segment", true);

            segment.append("div").classed("net-rev-bar-graph-label", true)
                   .text(function(d) { return d.name });

            var barSegment = segment.append("div").classed("net-rev-bar-graph-value", true)
                                    .append("div").classed("net-rev-bar-graph-value-scale", true)
                                    .append("div").classed("net-rev-bar-graph-value-bar", true)
                                    .classed("net-rev-bar-graph-value-box", true)
                                    .text(function(d) { return d.value; });

            barSegment                   
                   .style("background-color", function(d) { return d.color })              
                   .transition()
                   .duration(1000)
                   .style("width", function(d) { return x(d.value) + "%" });            
                                 
          }               
        }, true);
      }
    };
    return revBarObject;
  });
})();