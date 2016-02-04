/// <reference path="../../../_libs.ts" />

class ChartoptionService {

    public static $inject = ['$rootScope'];

    constructor($rootScope: ng.IScope) { }

    lineChartOptions() {
        return {
            chart: {
                type: 'lineChart',
                height: 250,
                margin : {
                    top: 5,
                    right: 50,
                    bottom: 50,
                    left: 50
                },
                x: function(d){ return d.xval; },
                y: function(d){ return d.yval; },
                useInteractiveGuideline: true,
                dispatch: {
                    stateChange: function(e){ console.log("stateChange"); },
                    changeState: function(e){ console.log("changeState"); },
                    tooltipShow: function(e){ console.log("tooltipShow"); },
                    tooltipHide: function(e){ console.log("tooltipHide"); }
                },
                xAxis: {
                    tickFormat: function(d) {
                        return d3.time.format('%b')(new Date(d))
                    }
                },
                yAxis: {
                    axisLabel: '',
                    tickFormat: function(d){
                        return d3.format('.02f')(d);
                    },
                    axisLabelDistance: -10
                }
            }
        };  
    }

    multiBarChartOptions() {
        return {
            chart: {
                type: 'multiBarChart',
                height: 250,
                width: 300,
                margin : {
                    top: 10,
                    right: 25,
                    bottom: 30,
                    left: 25
                },
                showLegend : false,
                x: function(d){return d.label;},
                y: function(d){return d.value + (1e-10);},
                showValues: true,
                reduceXTicks: false,
                showControls: false,
                valueFormat: function(d) {
                    return d3.format(',.4f')(d);
                },
                xAxis: {
                    axisLabelDistance: 30
                },
                showYAxis: false,
                showXAxis: true,
                duration: 700
            }
        };  
    }

    metricBarChartOptions(misCtrl) {
        return {
            chart: {
                type: 'discreteBarChart',
                height: 200,
                margin : {
                    top: 20,
                    right: 25,
                    bottom: 0,
                    left: 25
                },
                x: function(d){return d.label;},
                y: function(d){return d.value},
                useInteractiveGuideline: true,
                showValues: true,
                valueFormat: function(d){
                    return d3.format(',.2f')(d);
                },
                discretebar: {
                    dispatch: {
                        elementDblClick: function(e) {
                            // misCtrl.openBarDrillDownPopover(d3.event, e, -1);
                        }
                    }
                },
                tooltip: {
                    enabled: true
                },
                showYAxis: false,
                showXAxis: false,
                duration: 700
            }
        };  
    }

    targetBarChartOptions(misCtrl) {
        return {
            chart: {
                type: 'discreteBarChart',
                height: 250,
                margin : {
                    top: 20,
                    right: 50,
                    bottom: 20,
                    left: 75
                },
                useInteractiveGuideline: true,
                x: function(d){return d.label;},
                y: function(d){return d.value + (1e-10);},
                showValues: true,
                showYAxis: false,
                valueFormat: function(d){
                    return d3.format(',.2f')(d);
                },
                discretebar: {
                    dispatch: {
                        elementDblClick: function(e) {
                            misCtrl.openTargetDrillDownPopover(d3.event, e, -1);
                        }
                    }
                },
                duration: 700
            }
        };  
    }
}
