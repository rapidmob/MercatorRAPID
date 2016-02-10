
(function() {
    'use strict';
    // attach the factories and service to the [starter.services] module in angular
    angular.module('rapidMobile')
        .service('ReportBuilderSvc', reportBuilderService);
    
	function reportBuilderService() {
        var self = this;
        
        self.generateReport = _generateReport;            
        function _generateReport(param, chartTitle,flownMonth) {
			var title = "";
			if(param == "metricSnapshot")
				title = "METRIC SNAPSHOT -"+flownMonth+" "+chartTitle.toUpperCase()+"- VIEW";
			else if(param == "targetActual")
				title = "TARGET VS ACTUAL - "+((chartTitle == "revenue")?"NET REVENUE":"PAX Count")+" "+flownMonth+ " - VIEW";
			else
				title = chartTitle+" "+flownMonth+" - VIEW";
							
			var svgNode = d3.selectAll("."+param).selectAll("svg");
			var content = [];
			var imageColumn = [];
			var textColumn = [];
			var imagesObj = {};
			var textObj = {};
			content.push(title);
			var nodeExists = [];
			angular.forEach(svgNode, function(value, key) {				
				//textObj['alignment'] = 'center'				
				
				var html = "";
				if(nodeExists.indexOf(svgNode[key].parentNode.getAttribute("data-item-flag")) == -1 && svgNode[key].length >= 1){
				
					html = svgNode[key][0].outerHTML;
					if(svgNode[key].parentNode.getAttribute("data-item-pdfFlag") === "dynamicWH"){
						d3.select("."+param+"Flag").select("svg").attr("width",1500);
						d3.select("."+param+"Flag").select("svg").attr("height",600);
						var node = d3.select("."+param+"Flag").select("svg");
						html = node[0][0].outerHTML;
						imagesObj['width'] = 500;
						imagesObj['height'] = 500;
					}
					if(svgNode[key].parentNode.getAttribute("data-item-pdfFlag") === "pdfFlag")
					{
						imagesObj['width'] = 750;
						imagesObj['height'] = 300;
					}
					canvg(document.getElementById('canvas'), html);
					var test = document.getElementById('canvas');
					var imgsrc = test.toDataURL();
					var  text = "\n"+svgNode[key].parentNode.getAttribute("data-item-title")+"\n";
					textObj['text'] = text;
					textColumn.push(textObj);
					imagesObj['image'] = imgsrc;
					imageColumn.push(imagesObj);				
					var imgTemp ={}, txtTemp ={};		
					txtTemp['columns'] = textColumn;
					imgTemp['alignment'] = 'center';
					imgTemp['columns'] = imageColumn;
					content.push(txtTemp);
					content.push(imgTemp);					
					imageColumn = [];
					textColumn = [];
					imagesObj = {};
					textObj = {};
					imgTemp = {};
					txtTemp ={};
					nodeExists.push(svgNode[key].parentNode.getAttribute("data-item-flag"));
				}
			});
						
			return {
				content: content,
				styles: {
					header: {
						fontSize: 18,
						bold: true
					},
					bigger: {
						fontSize: 15,
						italics: true,
					}
				},
				defaultStyle: {
					columnGap: 20,
				}
			};
		};
    }
})();