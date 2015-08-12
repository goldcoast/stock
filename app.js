var express = require('express'),
	superagent = require('superagent'),
	cheerio = require('cheerio');

var app = express();

var topGaniersLink = 'http://finance.yahoo.com/_remote/?m_id=MediaRemoteInstance&instance_id=85ac7b2b-640f-323f-a1c1-00b2f4865d18&mode=xhr&ctab=tab3&nolz=1&count=20&start=0&category=percentagelosers&no_tabs=1',
	topLosersLink = '',
	stockCenterLink = 'http://finance.yahoo.com/stock-center/',
	earningsCalendarLink = 'http://biz.yahoo.com/research/earncal/20150831.html';

var getReportCompanys = function(req, res, next){
	superagent.get(earningsCalendarLink)
		.end(function(err,sres){
			if (err) {
				return next(err);
			};

			var $ = cheerio.load(sres.text);
			//第三个p标签的第一个table
			var table = $('p').eq(3).find('table').first().html();

			var items = [];

			//遍历行，提取公司名和股票代码
			$(table).find('tr').each(function(idx,element){
				// console.log('........................行内容:', $(element).text());
				if (idx==0 || idx==1) return true;
				var td = $(element).find('td'),
				 	companyName = $(td).eq(0).text(),
				 	stockCode = $(td).eq(1).text();

				if (companyName.trim()=='') return true;
				items.push({
					company:companyName,
					stock:stockCode
				});
				
			});
			res.send(items);
		});
}

var getTopStock = function(req, res, next){
	
	superagent.get(stockCenterLink)
	.end(function(err,sres){
		console.log('in end method...')
		if (err) {
			return next(err);
		};

		var $ = cheerio.load(sres.text);
		console.log('sres.text loaded...')
		//第三个p标签的第一个table
		var table = $('.yom-data .col-8 .phatable').html();


		/*var items = [];

		//遍历行，提取公司名和股票代码
		$(table).find('tr').each(function(idx,element){
			// console.log('........................行内容:', $(element).text());
			if (idx==0 || idx==1) return true;
			var td = $(element).find('td'),
			 	companyName = $(td).eq(0).text(),
			 	stockCode = $(td).eq(1).text();

			if (companyName.trim()=='') return true;
			items.push({
				company:companyName,
				stock:stockCode
			});
			
		});*/
		res.send(table);
	});
}
app.get("/", function(req, res, next){
	//取出指定日期将发布财报的公司名称和其股票代码 （数据来源，yahoo finance)
	// var reportList = getReportCompanys(req, res, next);
	getTopStock(req, res, next);
});

app.listen(3000, function(){
	console.log('app is listening at port 3000');
})



















