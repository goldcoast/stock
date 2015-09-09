var express = require('express'),
	superagent = require('superagent'),
	cheerio = require('cheerio'),
	fs = require('fs'),
	later = require('later'),
	Q = require('q'),
	Promise = this.Promise || require('promise'),
	agent = require('superagent-promise')(require('superagent'), Promise);


var sched = later.parse.recur().every(2).second(),
      t = later.setInterval(test, sched);

function test() {
	console.log('....', (new Date().toLocaleString()));
}


var app = express();
Date.prototype.addHours= function(h){
    this.setHours(this.getHours()+h);
    return this;
}
var today = (new Date()).toISOString().slice(0, 10).replace(/-/g,''),
//toISOString The timezone is always zero UTC offset, as denoted by the suffix "Z".
//所以需要再加上8个小时，才是当前本地北京时间
	reportDay = (new Date().addHours(8-12)).toISOString().slice(0, 10).replace(/-/g,'');
	

//文件名带上时间戳,文件名为本地时间
var getTimestamp = function(){
	return (new Date().addHours(8)).toISOString().slice(0, 16).replace(/-/g,'').replace(/:/g,'');
}

console.log('today is:', today, 'report day:', reportDay);
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
	console.log('write data to file: ', fName);
	// if (!fs.existsSync(fName)) {
	// 	console.log('write')
		fs.writeFileSync(fName, JSON.stringify(data));
	// }else{
	// 	console.log('append..')

	// 	fs.appendFileSync(fName, "\n appended content: \n");

	// 	fs.appendFileSync(fName, JSON.stringify(data));
	// }
}

var readData = function(fileName, reportDate){
	var filePath = './'+reportDate+'/'+fileName;
	if (fs.existsSync(filePath)) {
		var data = JSON.parse(fs.readFileSync(filePath));
		return data;
	}else{
		return undefined;
	}
}
//filter the symbol which we need 
var filterSymbol = function(){

	var ganierList = readData(fileName.ganier+reportDay+'.json', reportDay);
	var loserList = readData(fileName.loser+reportDay+'.json', reportDay);
	var reportedList = readData(fileName.reported+reportDay+'.json', reportDay);

	var result = {ganier:[], loser:[]};

	for (var i = reportedList.length - 1; i >= 0; i--) {
		var report = reportedList[i];
		for (var j = ganierList.length - 1; j >= 0; j--) {
			var top = ganierList[j];
			if (top.symbol === report.symbol) {
				result.ganier.push(top);
			};
		};
		for (var n = loserList.length - 1; n >= 0; n--) {
			var top = loserList[n];
			if (top.symbol === report.symbol) {
				// console.log('top.symbol', j, top.symbol);
				result.loser.push(top);
			};
		};

	};

	writeData('result_'+getTimestamp()+'.json', result, reportDay);
	console.info('..................................finished .............................')

}
// get the top symbol data
var fetchTopStock = function(req, res, next, dataLink, dataType){
	agent.get(dataLink)
		.timeout(TIME_OUT)
		.end(function(err,sres){
			if (err) {
				console.error('occured excpetion in fetchTopStock()...')
				return next(err);
			};

			var $ = cheerio.load(sres.text);
			//第三个p标签的第一个table
			var tr = $('tbody tr');

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

	})
	.then(function(){
		filterSymbol();
	});
}

//暂时只取top50的，等这个完成再加其它的。
/*var getTopData = function(){


	// var JsonObj=JSON.parse(fs.readFileSync('./output.json'));
}
*///取出指定日期将发布财报的公司名称和其股票代码 （数据来源，yahoo finance)
var getReportCompanys = function(req, res, next){
		console.log('accessing earningsCalendarLink: ', earningsCalendarLink);
		agent.get(earningsCalendarLink)
			.timeout(TIME_OUT)
			.end(function(err,sres){
				if (err) {
					console.error('occured excpetion in getReportCompanys()...')
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

				// res.send( '****** reportList.length: '+ reportList.length);
			})
			.then(function(){

				fetchTopStock(req, res, next, topLink.ganier, fileType.ganier);

				setTimeout(function(){
					fetchTopStock(req, res, next, topLink.loser, fileType.loser);
				}, 3000)
			});
	}



app.get("/", function(req, res, next){
	var resultStr = 'done !';
	resultStr += "\n run with supervisor..."
	console.info('..................................start .............................')
	createFolder(reportDay);


	getReportCompanys(req,res, next);

	// fetchTopStock(req, res, next, topLink.loser, fileType.loser);

	// filterSymbol();

	console.info('');
	res.send(resultStr);
});

app.listen(2013, function(){
	console.log('app is listening at port 2013');
})



















