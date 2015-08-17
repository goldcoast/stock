var express = require('express'),
	superagent = require('superagent'),
	cheerio = require('cheerio'),
	fs = require('fs'),
	Q = require('q');

var app = express();
Date.prototype.addHours= function(h){
    this.setHours(this.getHours()+h);
    return this;
}
var today = (new Date()).toISOString().slice(0, 10).replace(/-/g,''),
	reportDay = (new Date().addHours(-12)).toISOString().slice(0, 10).replace(/-/g,'');

var topLength = 10;
	topGaniersLink = 'http://finance.yahoo.com/_remote/?m_id=MediaRemoteInstance&instance_id=85ac7b2b-640f-323f-a1c1-00b2f4865d18&mode=xhr&ctab=tab2&nolz=1&count='+topLength+'&start=0&category=percentagegainers&no_tabs=1',
	topLosersLink  = 'http://finance.yahoo.com/_remote/?m_id=MediaRemoteInstance&instance_id=85ac7b2b-640f-323f-a1c1-00b2f4865d18&mode=xhr&ctab=tab3&nolz=1&count='+topLength+'&start=0&category=percentagelosers&no_tabs=1',
	stockCenterLink = 'http://finance.yahoo.com/stock-center/',
	earningsCalendarLink = 'http://biz.yahoo.com/research/earncal/'+reportDay+'.html';

var reportFile = 'earningsCalendar_'+reportDay+'.json',
	ganiersFile = ''


var createFolder = function(reportDate){
	if(!fs.existsSync('./'+reportDate)){
		fs.mkdirSync('./'+reportDay,'777'); 
	}
}
/**
* fileName : top loser, top ganier
*/
var writeData = function(fileName, reportDate, data){
	var fName = './'+reportDate+'/'+fileName+'.json';
	console.log('file name: ', fName);
	if (!fs.existsSync(fName)) {
		console.log('write')
		fs.writeFileSync(fName, JSON.stringify(data));
	}else{
		console.log('append..')

		fs.appendFileSync(fName, JSON.stringify(data));
	}
}

//filter the symbol which we need 
var filterSymbol = function(reportData, topData, finalList, res){
		console.log("...... filterSymbol start ")
		for (var i = reportData.length - 1; i >= 0; i--) {
			report = reportData[i];
			for (var j = topData.length - 1; j >= 0; j--) {
				top = topData[j];
				if (top.symbol === report.symbol) {
					console.log('top.symbol', j, top.symbol);
					finalList.push(top);
				};
			};
		};
		console.log("...... done finalList is ", finalList)
		res.send(finalList);
}
// get the top symbol data
var fetchTopStock = function(req, res, next){
	console.log('accessing topGaniersLink: ', topGaniersLink);
	superagent.get(topGaniersLink)
		.end(function(err,sres){
			if (err) {
				return next(err);
			};

			var $ = cheerio.load(sres.text);
			//第三个p标签的第一个table
			var tr = $('tbody tr');

			console.log('getTopStock each ..', tr);

			var topList = [];

			//遍历行，提取公司名和股票代码
			tr.each(function(idx,element){
				console.log('each tr ..', $(element).text() )
				var td = $(element).find('td'),
				 	symbol = $(td).eq(0).children('a').text();
				 	companyName = $(td).eq(1).text(),
				 	price = $(td).eq(2).text(),
				 	change = $(td).eq(3).text(),
				 	percentage = $(td).eq(4).text(),
				 	lastTrade = $(td).eq(5).text(),
				 	volume = $(td).eq(6).text();
			
				topList.push({
					company:companyName,
					symbol:symbol,
					price: price,
					change: change,
					percentage: percentage,
					lastTrade: lastTrade,
					volume: volume
				});
				
			});

			fs.writeFileSync('./topdata_'+reportDay+'.json',JSON.stringify(topList));


			console.log('getTopStock each done .. and write file done')

			// filterSymbol(reportList, topList, finalList, res);
			res.send(topList);
	});
}

var getTopData = function(){
	var topArray = [topGaniersLink, topLosersLink];
	var JsonObj=JSON.parse(fs.readFileSync('./output.json'));
}
//取出指定日期将发布财报的公司名称和其股票代码 （数据来源，yahoo finance)
var getReportCompanys = function(req, res, next, reportList){
		console.log('accessing earningsCalendarLink: ', earningsCalendarLink);
		superagent.get(earningsCalendarLink)
			.end(function(err,sres){
				if (err) {
					return next(err);
				};

				var $ = cheerio.load(sres.text);
				//第三个p标签的第一个table
				var table = $('p').eq(3).find('table').first().html();

				console.log('getReportCompanys each start ..')
				
				//遍历行，提取公司名和股票代码
				$(table).find('tr').each(function(idx,element){
					
					if (idx==0 || idx==1) return true;
					var td = $(element).find('td'),
					 	companyName = $(td).eq(0).text(),
					 	symbol = $(td).eq(1).text();

					if (companyName.trim()=='' || symbol.trim()=='') return true;

					reportList.push({
						company:companyName,
						stock:symbol
					});
					
				});

				writeData('./earningsCalendar_'+reportDay+'.json',reportDay, reportList);
				// topLength = reportList.length;
				// if (topLength> 50) {
				// 	topLength  = 30;
				// };
				console.log(' done .... topLength, ', topLength, 'reportList.length', reportList.length);
				// topGaniersLink = topGaniersLink.replace('topLength', topLength);
				// console.log('getReportCompanys each done ..')

				// res.send(items);
			});
	}



app.get("/", function(req, res, next){
	console.log('..................................start .............................')
	createFolder(reportDay);
	var reportList = [];
	// getTopStock(req, res, next);
	getReportCompanys(req,res, next, reportList);

	if (reportList.length>20) {
		//todo 如果长度为 38 将长度分解为数组 [10,20,30, 38]类似的
		//再遍历
	};

	// fs.mkdirSync('./test_'+reportDay,'777');   
	console.log('..................................finished .............................')
	console.log('')
});

app.listen(3000, function(){
	console.log('app is listening at port 3000');
})



















