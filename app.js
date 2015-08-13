var express = require('express'),
	superagent = require('superagent'),
	cheerio = require('cheerio'),
	Q = require('q');

var app = express();
Date.prototype.addHours= function(h){
    this.setHours(this.getHours()+h);
    return this;
}
var today = (new Date()).toISOString().slice(0, 10).replace(/-/g,''),
	reportDay = (new Date().addHours(-12)).toISOString().slice(0, 10).replace(/-/g,'');

var topLength = 20;
	topGaniersLink = 'http://finance.yahoo.com/_remote/?m_id=MediaRemoteInstance&instance_id=85ac7b2b-640f-323f-a1c1-00b2f4865d18&mode=xhr&ctab=tab2&nolz=1&count=topLength&start=0&category=percentagegainers&no_tabs=1',
	topLosersLink = 'http://finance.yahoo.com/_remote/?m_id=MediaRemoteInstance&instance_id=85ac7b2b-640f-323f-a1c1-00b2f4865d18&mode=xhr&ctab=tab3&nolz=1&count=topLength&start=0&category=percentagelosers&no_tabs=1',
	stockCenterLink = 'http://finance.yahoo.com/stock-center/',
	earningsCalendarLink = 'http://biz.yahoo.com/research/earncal/'+reportDay+'.html';

var filterSymbol = function(reportData, topData, finalList, res){
	return function(){
		console.log("...... filterSymbol start ")
		var defer = Q.defer();
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

		defer.resolve();
		return defer.promise;
	}
	
}
var getTopStock = function(req, res, next, topList, reportList, finalList){
	console.log('accessing topGaniersLink: ', topGaniersLink);
	return function(){
		var defer = Q.defer();
		superagent.get(topGaniersLink)
		.end(function(err,sres){
			if (err) {
				return next(err);
			};

			var $ = cheerio.load(sres.text);

			//第三个p标签的第一个table
			var tr = $('tbody tr');

			console.log('getTopStock each ..')
			//遍历行，提取公司名和股票代码
			tr.each(function(idx,element){
				// console.log('each tr ..', $(element).text() )
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

			filterSymbol(reportList, topList, finalList, res);

			console.log('getTopStock each done ..')
			// res.send(items);
			defer.resolve();
		});
		return defer.promise;
	}
}
//取出指定日期将发布财报的公司名称和其股票代码 （数据来源，yahoo finance)
var getReportCompanys = function(req, res, next, reportList){
	return function(){
		var defer = Q.defer();
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
				topLength = reportList.length;
				if (topLength> 50) {
					topLength  = 40;
				};
				console.log('.... topLength, ', topLength, 'reportList.length', reportList.length);
				topGaniersLink = topGaniersLink.replace('topLength', topLength);
				console.log('getReportCompanys each done ..')
				console.log('topGaniersLink', topGaniersLink)

				var topList =[], finalList = [];
				getTopStock(req, res, next, topList, reportList, finalList);

				defer.resolve();
				// res.send(items);
				return defer.promise;
			});
		return defer.promise;
	}
}


app.get("/", function(req, res, next){
	console.log('start ...')
	
	var reportList=[], 
		topList = [],
		finalList = [];

	getReportCompanys(req, res, next, reportList)()
		.then(
			getTopStock(req, res, next, topList)
		)
		.then(filterSymbol(reportList, topList, finalList))
		.then(function(){
			console.log('reportList.length', reportList.length);
			console.log('topList.length', topList.length);
			console.log('finalList.length', finalList.length);

			res.send(finalList);
		});
	


	// Q.allSettled([getReportCompanys(req, res, next, reportList),getTopStock(req, res, next, topList)])
	//     .then(function(){
	//     	console.log('reportList length:', reportList.length,'topList length:', topList.length )
	//         filterSymbol(reportList, topList, res);
	//     });

});

app.listen(3000, function(){
	console.log('app is listening at port 3000');
})



















