# Practise Node.JS

##1.说明
### 功能  
1. 对比昨天的涨跌top50的数据，有多少是前一天发季报的。 （top50 是yahoo最多只提供当天前50）  
2. 遍历股票列表，取出当前价格离52weeklow高20%内的股票，52weekhigh需比low高50%  

#### 以后增加  
1. 有哪些是最近几天发布报表的。   
2. 抓取 估值 数据，判断哪些买入评级。  
__3. 重点关注价格在5块到40块之间的股票（跌）__
   
### todo  
1. 周末发布报表的公司不需要对比涨跌幅的数据。   
2. 周一的对比需要将周末的数据加进去。
3. 改为保存到数据库中。  
4. 建立数据库，页面显示最近进入涨停榜次数最多的股票。  


### 写上需要做的功能  
1. superagent promise 写法， 改为用connect。
2. 增加分时段保存数据

  
### bug  
1. http抓取时经常timeout. fixed 需要翻墙， 国内速度太慢。  

##2.安装及运行  
*1. 安装  
`npm install`  
*2. 运行  
`node app.js`  
*3. 在浏览器中打开 http://localhost:2013/

#资源
### [所有美股列表](http://www.nasdaq.com/screening/company-list.aspx)

### [数据获取](http://xueqiu.com/v4/stock/quote.json?code=morn&_=1451384621774)
