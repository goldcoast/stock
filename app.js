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

var topLength = 50,
	TIME_OUT = 5000, //5S
	topGaniersLink = 'http://finance.yahoo.com/_remote/?m_id=MediaRemoteInstance&instance_id=85ac7b2b-640f-323f-a1c1-00b2f4865d18&mode=xhr&ctab=tab2&nolz=1&count='+topLength+'&start=0&category=percentagegainers&no_tabs=1',
	topLosersLink  = 'http://finance.yahoo.com/_remote/?m_id=MediaRemoteInstance&instance_id=85ac7b2b-640f-323f-a1c1-00b2f4865d18&mode=xhr&ctab=tab3&nolz=1&count='+topLength+'&start=0&category=percentagelosers&no_tabs=1',
	stockCenterLink = 'http://finance.yahoo.com/stock-center/',
	earningsCalendarLink = 'http://biz.yahoo.com/research/earncal/'+reportDay+'.html';

var reportFile = 'earningsCalendar_'+reportDay+'.json',
	ganiersFile = '';
var fileType = {
		ganier: 'ganier',
		loser: 'loser'
	};

var topLink = {
		ganier: topGaniersLink,
		loser: topLosersLink
	}

var fileName = {
	reported: 'earningsCalendar_',
	ganier: 'topdata_ganier_',
	loser: 'topdata_loser_'
}


var createFolder = function(reportDate){
	if(!fs.existsSync('./'+reportDate)){
		fs.mkdirSync('./'+reportDay,'777'); 
	}
}
/**
* fileName : top loser, top ganier
*/
var writeData = function(fileName, data, reportDate){
	var fName = './'+reportDate+'/'+fileName;
	console.log('file name: ', fName);
	if (!fs.existsSync(fName)) {
		console.log('write')
		fs.writeFileSync(fName, JSON.stringify(data));
	}else{
		console.log('append..')

		fs.appendFileSync(fName, JSON.stringify(data));
	}
}

var readData = function(fileName, reportDate){
	var filePath = './'+reportDate+'/'+fileName;
	console.log('filePath', filePath);
	if (fs.existsSync(filePath)) {
		return JSON.parse(fs.readFileSync(filePath));
	}else{
		return undefined;
	}
}
//filter the symbol which we need 
var filterSymbol = function(){
	console.log("...... filterSymbol start ")
	var ganierList = readData(fileName.ganier+reportDay+'.json', reportDay),
		loserList = readData(fileName.loser+reportDay+'.json', reportDay),
		reportedList = readData(fileName.reported+reportDay+'.json', reportDay),
		finalList = [];

	// console.log('ganier list: ', ganierList);
	// console.log('------------------------------------------------------------');
	// console.log('reportedList list: ', reportedList);

	for (var i = reportedList.length - 1; i >= 0; i--) {
		var report = reportedList[i];
		for (var j = loserList.length - 1; j >= 0; j--) {
			var top = loserList[j];
			if (top.symbol === report.stock) {
				console.log('top.symbol', j, top.symbol);
				finalList.push(top);
			};
		};
	};
	console.log("...... done finalList is ", finalList)
	// res.send(finalList);
	writeData('result.json', finalList, reportDay);
}
// get the top symbol data
var fetchTopStock = function(req, res, next, dataLink, dataType){
	console.log('accessing topGaniersLink: ', topGaniersLink);
	superagent.get(dataLink)
		.timeout(TIME_OUT)
		.end(function(err,sres){
			if (err) {
				console.error(' excpetion occured.... ')
				return next(err);
			};

			var $ = cheerio.load(sres.text);
			//第三个p标签的第一个table
			var tr = $('tbody tr');

			// console.log('getTopStock each ..', tr);

			var topList = [];

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

			writeData('topdata_'+dataType+'_'+reportDay+'.json', topList,reportDay);

			// fs.writeFileSync('./topdata_'+reportDay+'.json',JSON.stringify(topList));


			console.info('top length', topList.length);
			console.info('getTopStock each done .. and write file done');

			// filterSymbol(reportList, topList, finalList, res);
			// res.send('top length: '+topList.length);
	});
}

//暂时只取top50的，等这个完成再加其它的。
/*var getTopData = function(){


	// var JsonObj=JSON.parse(fs.readFileSync('./output.json'));
}
*///取出指定日期将发布财报的公司名称和其股票代码 （数据来源，yahoo finance)
var getReportCompanys = function(req, res, next){
		console.log('accessing earningsCalendarLink: ', earningsCalendarLink);
		superagent.get(earningsCalendarLink)
			.timeout(TIME_OUT)
			.end(function(err,sres){
				if (err) {
					return next(err);
				};

				var $ = cheerio.load(sres.text);
				//第三个p标签的第一个table
				var table = $('p').eq(3).find('table').first().html();

				// console.log('getReportCompanys each start ..')
				var reportList = [];
				//遍历行，提取公司名和股票代码
				$(table).find('tr').each(function(idx,element){
					
					if (idx==0 || idx==1) return true;
					var td = $(element).find('td'),
					 	companyName = $(td).eq(0).text(),
					 	symbol = $(td).eq(1).text();

					if (companyName.trim()=='' || symbol.trim()=='') return true;

					reportList.push({
						company:companyName,
						symbol:symbol
					});
					
				});

				writeData('earningsCalendar_'+reportDay+'.json', reportList, reportDay);
				console.log( '****** reportList.length', reportList.length);
				// topGaniersLink = topGaniersLink.replace('topLength', topLength);
				// console.log('getReportCompanys each done ..')

				res.send( '****** reportList.length: '+ reportList.length);
			});
	}



app.get("/", function(req, res, next){
	console.info('..................................start .............................')
	createFolder(reportDay);

	// getReportCompanys(req,res, next);

	// fetchTopStock(req, res, next, topLink.loser, fileType.loser);

	filterSymbol();

	console.info('..................................finished .............................')
	console.info('')
	res.send('done!');
});

app.listen(3000, function(){
	console.log('app is listening at port 3000');
})



















