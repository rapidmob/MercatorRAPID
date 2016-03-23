(function() {
    'use strict';
    // attach the service to the [rapidMobile] module in angular
    angular.module('rapidMobile')
	 	.service('ReportSvc', ['$q', '$timeout',
                               reportSvc]);

	// genReportDef --> genReportDoc --> buffer[] --> Blob() --> saveFile --> return filePath

	 function reportSvc($q, $timeout) {
		 this.runReportAsync = _runReportAsync;
		 this.runReportDataURL = _runReportDataURL;

		// RUN ASYNC: runs the report async mode w/ progress updates and delivers a local fileUrl for use

		 function _runReportAsync(statusFlag,title,flownMonth,tabIndex) {
             var deferred = $q.defer();
			 
             //showLoading('1.Processing Transcript');
             generateReportDef(statusFlag,title,flownMonth,tabIndex).then(function(docDef) {
                 //showLoading('2. Generating Report');
                 return generateReportDoc(docDef);
             }).then(function(pdfDoc) {
                 //showLoading('3. Buffering Report');
                 return generateReportBuffer(pdfDoc);
             }).then(function(buffer) {
                 //showLoading('4. Saving Report File');
                 return generateReportBlob(buffer);
             }).then(function(pdfBlob) {
                 //showLoading('5. Opening Report File');
                 return saveFile(pdfBlob,statusFlag);
             }).then(function(filePath) {
                 //hideLoading();
                 deferred.resolve(filePath);
             }, function(error) {
                 //hideLoading();
                 console.log('Error: ' + error.toString());
                 deferred.reject(error);
             });
             return deferred.promise;
         }

		// RUN DATAURL: runs the report async mode w/ progress updates and stops w/ pdfDoc -> dataURL string conversion

		 function _runReportDataURL(statusFlag,title,flownMonth,tabIndex) {
             var deferred = $q.defer();
			 
             //showLoading('1.Processing Transcript');
             generateReportDef(statusFlag,title,flownMonth,tabIndex).then(function(docDef) {
                 //showLoading('2. Generating Report');
                 return generateReportDoc(docDef);
             }).then(function(pdfDoc) {
                 //showLoading('3. Convert to DataURL');
                 return getDataURL(pdfDoc);
             }).then(function(outDoc) {
                 //hideLoading();
                 deferred.resolve(outDoc);
             }, function(error) {
                 //hideLoading();
                 console.log('Error: ' + error.toString());
                 deferred.reject(error);
             });
             return deferred.promise;
         }

		// 1.GenerateReportDef: use currentTranscript to craft reportDef JSON for pdfMake to generate report

		function generateReportDef(statusFlag,title,flownMonth,tabIndex) {
            var deferred = $q.defer();
			
            // removed specifics of code to process data for drafting the doc
            // layout based on player, transcript, courses, etc.
            // currently mocking this and returning a pre-built JSON doc definition
            
			//use rpt service to generate the JSON data model for processing PDF
            // had to use the $timeout to put a short delay that was needed to 
            // properly generate the doc declaration
            $timeout(function() {
                var dd = {};
                dd = generateReport(statusFlag,title,flownMonth,tabIndex)
				deferred.resolve(dd);
            }, 100);
            
            return deferred.promise;
		}

		// 2.GenerateRptFileDoc: take JSON from rptSvc, create pdfmemory buffer, and save as a local file

		function generateReportDoc(docDefinition) {
			//use the pdfmake lib to create a pdf from the JSON created in the last step
			var deferred = $q.defer();
			try {
                //use the pdfMake library to create in memory pdf from the JSON
				var pdfDoc = pdfMake.createPdf( docDefinition );
                deferred.resolve(pdfDoc);
			}
			catch (e) {
				deferred.reject(e);
			}
			
			return deferred.promise;
		}

		// 3.GenerateRptBuffer: pdfKit object pdfDoc --> buffer array of pdfDoc

		function generateReportBuffer(pdfDoc) {
			//use the pdfmake lib to get a buffer array of the pdfDoc object
			var deferred = $q.defer();
			try {
                //get the buffer from the pdfDoc
				pdfDoc.getBuffer(function(buffer) {
                    $timeout(function() {
					   deferred.resolve(buffer);
                    }, 100);
				});
			}
			catch (e) {
				deferred.reject(e);
			}
			
			return deferred.promise;
		}

		// 3b.getDataURL: pdfKit object pdfDoc --> encoded dataUrl

		 function getDataURL(pdfDoc) {
			//use the pdfmake lib to create a pdf from the JSON created in the last step
			var deferred = $q.defer();
			try {
                //use the pdfMake library to create in memory pdf from the JSON
				pdfDoc.getDataUrl(function(outDoc) {
					deferred.resolve(outDoc);
				});
			}
			catch (e) {
				deferred.reject(e);
			}
			
			return deferred.promise;
		 }

		// 4.GenerateReportBlob: buffer --> new Blob object

		function generateReportBlob(buffer) {
			//use the global Blob object from pdfmake lib to creat a blob for file processing
			var deferred = $q.defer();
			try {
                //process the input buffer as an application/pdf Blob object for file processing
                var pdfBlob = new Blob([buffer], {type: 'application/pdf'});
                $timeout(function() {
                    deferred.resolve(pdfBlob);
                }, 100);
			}
			catch (e) {
				deferred.reject(e);
			}
			
			return deferred.promise;
		}

		// 5.SaveFile: use the File plugin to save the pdfBlob and return a filePath to the client

		function saveFile(pdfBlob,title) {
			var deferred = $q.defer();
			var fileName = uniqueFileName(title)+".pdf";
			var filePath = "";
			try {
				console.log('SaveFile: requestFileSystem');
				window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, fail);
			}
			catch (e) {
				console.error('SaveFile_Err: ' + e.message);
				deferred.reject(e);
				throw({code:-1401,message:'unable to save report file'});
			}			

			function gotFS(fileSystem) {
				console.error('SaveFile: gotFS --> getFile');
				fileSystem.root.getFile(fileName, {create: true, exclusive: false}, gotFileEntry, fail);
			}

			function gotFileEntry(fileEntry) {
				console.error('SaveFile: gotFileEntry --> (filePath) --> createWriter');
				filePath = fileEntry.toURL();
				fileEntry.createWriter(gotFileWriter, fail);
			}

			function gotFileWriter(writer) {
				console.error('SaveFile: gotFileWriter --> write --> onWriteEnd(resolve)');
				writer.onwriteend = function(evt) {
                    $timeout(function() {
                        deferred.resolve(filePath);
                    }, 100);
				};
				writer.onerror = function(e) {
                    console.log('writer error: ' + e.toString());
					deferred.reject(e);
				};
				writer.write(pdfBlob);
			}

            function fail(error) {
				console.log(error.code);
				deferred.reject(error);
			}
			
			return deferred.promise;
		}
		function uniqueFileName(fileName){
			var now = new Date();
			var timestamp = now.getFullYear().toString();
			timestamp += (now.getMonth() < 9 ? '0' : '') + now.getMonth().toString(); 
			timestamp += (now.getDate() < 10 ? '0' : '') + now.getDate().toString(); 
			timestamp += (now.getHours() < 10 ? '0' : '') + now.getHours().toString(); 
			timestamp += (now.getMinutes() < 10 ? '0' : '') + now.getMinutes().toString(); 
			timestamp += (now.getSeconds() < 10 ? '0' : '') + now.getSeconds().toString();
			return fileName.toUpperCase()+"_"+timestamp;
		
		}
		
		function generateReport(param, chartTitle,flownMonth,tabIndex) {
			var deferred = $q.defer();
			
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
				var html = "";
				if(nodeExists.indexOf(svgNode[key].parentNode.getAttribute("data-item-flag")) == -1 && svgNode[key].length >= 1){
					html = svgNode[key][0].parentElement.innerHTML;
					if(svgNode[key].parentNode.getAttribute("data-item-pdfFlag") === "dynamicWH"){
						d3.select("."+param+"Flag").select("svg").attr("width",1500);
						d3.select("."+param+"Flag").select("svg").attr("height",600);
						var node = d3.select("."+param+"Flag").select("svg");
						html = node[0][0].parentElement.innerHTML;
						imagesObj['width'] = 500;
						imagesObj['height'] = 500;
					}
					if(svgNode[key].parentNode.getAttribute("data-item-pdfFlag") === "pdfFlag")
					{
						imagesObj['width'] = 750;
						imagesObj['height'] = 300;
					}
					canvg(document.getElementById('canvas'), html);
					var canvasElm = document.getElementById('canvas');
					var imgsrc = canvasElm.toDataURL();
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
			if(param == "revenueAnalysis"){
				var node = document.getElementById("net-revenue-chart");
				var nodeList = document.getElementsByClassName('net-revenue-pdf');
				var nodeFlag;
				if(tabIndex === 0)
				nodeFlag = nodeList[0];
				else
				nodeFlag = nodeList[1];
				html2canvas(nodeFlag).then(function(canvas) {
					var c = canvas.toDataURL();
					var  text = "\n\n\n\n\n\n\n\n\n\n\n\n"+node.getAttribute('data-item-title')+"\n\n";
					textObj['text'] = text;
					textColumn.push(textObj);
					imagesObj['image'] = c;
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
					deferred.resolve({content: content});
				});				
			} else if(param == "sectorcarrieranalysis"){
				var nodeList = document.getElementsByClassName('sectorcarrieranalysis');				
				var nodeFlag = [];
				if(tabIndex == 0 && nodeList.length == 2){
					nodeFlag.push(nodeList[0]);
				}else if(tabIndex == 0 && nodeList.length == 4){
					nodeFlag.push(nodeList[0]);nodeFlag.push(nodeList[1]);
				}else if(tabIndex != 0 && nodeList.length == 2){
					nodeFlag.push(nodeList[1]);
				}else if(tabIndex != 0 && nodeList.length == 4){
					nodeFlag.push(nodeList[2]);nodeFlag.push(nodeList[3]);
				}
			
			
				
				angular.forEach(nodeFlag, function(value, key) {			
					html2canvas(nodeFlag[key]).then(function(canvas) {
						var c = canvas.toDataURL();
						var  text = "\n\n"+nodeFlag[key].getAttribute('data-item-title')+"\n\n";
						textObj['text'] = text;
						textColumn.push(textObj);
						imagesObj['width'] = 500;
						imagesObj['image'] = c;
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
						if(key == nodeFlag.length-1){
							deferred.resolve({content: content});
						}
					});					
				});		
			}else if(param == "routerevenue"){				
				var nodeList = document.getElementsByClassName('route-revenue-pdf');
				var nodeFlag;
				if(tabIndex === 0)
				nodeFlag = nodeList[0];
				else
				nodeFlag = nodeList[1];
				html2canvas(nodeFlag).then(function(canvas) {
					var c = canvas.toDataURL();
					var  text = "";
					textObj['text'] = text;
					textColumn.push(textObj);
					imagesObj['width'] = 500;
					imagesObj['image'] = c;
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
					deferred.resolve({content: content});
				});	
			}else{
				deferred.resolve({content: content});
			}
		
			return deferred.promise;
		};
		
	 }
    
})();