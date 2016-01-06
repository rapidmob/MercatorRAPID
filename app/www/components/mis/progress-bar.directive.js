(function () {
  'use strict';
  angular.module('rapidMobile')
  .directive('heProgressBar', function () {
    var directiveDefinitionObject = {
      restrict: 'E',
      replace: false,
      scope: {data: '=chartData', showtooltip: '@showTooltip'},
      link: function (scope, element, attrs) {
        var x = d3.scale.linear()
                  .domain([0, d3.max(scope.data, function(d) { return +d.progress })])
                  .range([0, 90]);

        var segment = d3.select(element[0])
                     .selectAll(".horizontal-bar-graph-segment")
                     .data(scope.data)
                     .enter()
                     .append("div")
                     .classed("horizontal-bar-graph-segment", true)
                     .classed('hide', function(d){ if(d) return d.name == 'Others'});

        segment.append("div").classed("horizontal-bar-graph-label", true)
               .text(function(d) { return d.name })
               .classed('hide', function(d){ if(d) return d.name == 'Others'});

        var barSegment = segment.append("div").classed("horizontal-bar-graph-value", true)
                                .append("div").classed("horizontal-bar-graph-value-scale", true)
                                .append("div").classed("horizontal-bar-graph-value-bar", true);

        barSegment                   
               .style("background-color", function(d) { return d.color })              
               .transition()
               .duration(1000)
               .style("min-width", function(d) { return x(+d.progress) + "%" });

        var boxSegment = barSegment.append("span").classed("horizontal-bar-graph-value-box", true)
                                   .text(function(d) { return d.progress ? d.progress : "" });
        if(scope.showtooltip !== 'true') return;                                       
        var btnSegment = segment.append("button")
                                .classed("horizontal-bar-graph-icon icon ion-chevron-down no-border", true)
                                .classed("hide", function(d){
                                  if(d) return d.drillFlag == 'N';
                                });            
        var tooltipSegment = segment.append("div")
                                    .classed("tooltip", true)
                                    .classed('hide', true);
        tooltipSegment.append("p").text(function(d){ return d.name; });
        var table = tooltipSegment.append("table");
        var thead = table.append('tr');
        thead.append('th').text('Sector');
        thead.append('th').text('Revenue');

        var tr  = table
                    .append('tbody')
                    .selectAll("tr")
                    .data(function(d){return d.scAnalysisDrills})
                    .enter().append("tr");

        var sectorTd = tr.append("td")
                  .text(function(d) { return d.sector });

        var revenueTd = tr.append("td")
                  .text(function(d) { return d.revenue });

        btnSegment.on('click', function(){              
          // console.log($(this).next());
          if(angular.element(this).next().hasClass('show')) {
            angular.element(this).removeClass('ion-chevron-up');
            angular.element(this).addClass('ion-chevron-down');
            angular.element(this).next().removeClass('show');            
            angular.element(this).next().addClass('hide');
          } else {
            angular.element(this).removeClass('ion-chevron-down');
            angular.element(this).addClass('ion-chevron-up');
            angular.element(this).next().removeClass('hide');
            angular.element(this).next().addClass('show');
          }
        });
      }
    };
    return directiveDefinitionObject;
  });
})();