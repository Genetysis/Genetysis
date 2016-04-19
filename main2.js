// coded by Konstantin@Varik.ru



var loadData = function(filename, cb) {
	//console.log('loadData',filename)
	d3.csv(filename, function(error,data) {
		error && console.log(error);

		// transforming data to nodes array and links array
		//console.log('loadData',data);

		var links = [];
		var totalsX = [];
		var totalsY = [];
		var isFirst = false;

		if (!nodesX) {
			nodesX = [];
			nodesY = [];
			nodesMapX = {};
			nodesMapY = {};

			//console.log('lengthX',lengthX)
			for (key in data[0]) 
				if (key && key != 'Row Order' && key != 'column') {
					nodesX.push({ name: key.toLowerCase(), axis: 'x', index: lengthX });
					nodesMapX[key] = lengthX++;
				}
			data.forEach(function(d){
				if (d.column != 'Column Order') {
					nodesY.push({ name: d.column.toLowerCase(), axis: 'y', index: lengthY });
					nodesMapY[d.column] = lengthY++;
				}
			})
			isFirst = true;
		}
		lengthY = nodesY.length;
		var matrix = d3.range(lengthY).map(function(){return []});
		//console.log(matrix)
		var  k = 0
			,j = 0
			,iniOrders = { x: [], y: [] };

		data.forEach(function(d){
			if (d.column && d.column != 'Column Order') {
				var temp = {}
					,x, y, value;
				for (key in d) 
					if (key != 'column' && key != 'Row Order' && key) {
						value = parseFloat(d[key]) || 0;
						x = nodesMapX[key];
						y = nodesMapY[d.column];
						links.push({ source: y, target: x, value: value  });
						matrix[y][x] = { x: x, y: y, z: value };
						if (!totalsY[y]) totalsY[y] = 0;
						if (!totalsX[x]) totalsX[x] = 0;
						totalsY[y] += value;
						totalsX[x] += value;
						iniOrders.x.push(x);
						iniOrders.y.push(y);
					}
			}
		})
		if (isFirst) {
			alphaOrders = {
				 x: d3.range(lengthX).sort(function(a, b) { return d3.ascending(nodesX[a].name, nodesX[b].name); })
				,y: d3.range(lengthY).sort(function(a, b) { return d3.ascending(nodesY[a].name, nodesY[b].name); })
			}
		}

		 // precompute the orders.
		var orders = {
			 x: d3.range(lengthX).sort(function(a, b) { return totalsX[b] - totalsX[a]; })
			,y: d3.range(lengthY).sort(function(a, b) { return totalsY[b] - totalsY[a]; })
		};


		allData[filename] = { links: links, matrix: matrix, totalsX: totalsX, totalsY: totalsY, orders: orders, iniOrders: iniOrders };
		initList(filename);
		//console.log(allData[filename])
		cb();
	});
}

	//console.log(data, nodes, links, matrix);

var	x, y, z, v, width, height, fontSize, cellSize, margin, svg, orders, sort, order, row, column, nodesX, nodesMapX, nodesY, nodesMapY, alphaOrders
	,allData = {}, currentData
	,alpha = true
	,initial = false
	,inverse = false
	,duration = 1000
	,lengthX = 0
	,lengthY = 0
	,que=queue(1);
	// calc sizes based on div#chart size
var makeChart = function(data) {
	//console.log('makeChart',data)
	var links = data.links;
	var matrix = data.matrix;
	var totals = data.totals
	var orders = data.orders
	var iniOrders = data.iniOrders

	var widthMax = 960;
	var heightMax = 960;
	if (heightMax > 960 && heightMax < widthMax)
		widthMax = heightMax;
		//margin = {top: widthMax / 6, right: 0, bottom: 10, left: heightMax / 5};
	margin = {top: widthMax/6, right: 30, bottom: 10, left: widthMax/5}
		//cellSize = Math.min( widthMax / lengthX, heightMax / lengthY);
	cellSize = widthMax / lengthX;
	width = cellSize * lengthX - margin.left - margin.right;
	height = cellSize * lengthY - margin.top - margin.bottom;
	fontSize = 0.6 * cellSize;


	//console.log('lengthX, lengthY, widthMax,heightMax,width,height,fontSize,cellSize')
	//console.log(lengthX, lengthY, widthMax,heightMax,width,height,fontSize,cellSize)

	// scales
	x = d3.scale.ordinal().rangeBands([0, width]).domain(alphaOrders.x);
	y = d3.scale.ordinal().rangeBands([0, height]).domain(alphaOrders.y);
	z = d3.scale.linear()
			.range(['#ccc','#d42'])
			.clamp(true)
			.domain([ 0, d3.max(links, function(l){ return l.value; }) ]);
	v = d3.scale.linear()
			.range(['#888','#d42'])
			.clamp(true);

	// svg prepare

	//d3.selectAll("#chart svg").remove();

	svg = d3.select("#chart").append("svg");

	
	//svg.append('text').attr({ x: 40, y: 20, id: 'sortx', class: 'control' }).text('sort x').on('click', sort);
	//svg.append('text').attr({ x: 20, y: 40, id: 'sorty', class: 'control' }).text('sort y').on('click', sort);

	svg = svg.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// background
	svg.append("rect")
		.attr("class", "background")
		.attr("width", width)
		.attr("height", height );

	// adding rows
	var row = svg.selectAll(".row")
		.data(matrix)
		.enter().append("g")
		.attr("class", "row")
		//.attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; })
		.each(row);

	row.append("line")
		.attr("x2", width);

	row.append("text")
		.attr("x", -6)
		.attr("y", y.rangeBand() / 2)
		.attr("dy", ".32em")
		.attr("text-anchor", "end")
		.attr("font-size", fontSize)
		//.attr("fill", function(d,i) { return v(nodes[d[0].y+lengthX].total||0); })
		.text(function(d, i) { return nodesY[i].name; });

	// adding columns
	var column = svg.selectAll(".column")
		.data(matrix)
		.enter().append("g")
		.attr("class", "column")
		//.attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

	column.append("line")
		.attr("x1", -height);

	column.append("text")
		.attr("x", 6)
		.attr("y", x.rangeBand() / 2)
		.attr("dy", ".32em")
		.attr("text-anchor", "start")
		.attr("font-size", fontSize)
		//.attr("fill", function(d,i) { return v(totals[d[i].x]); })
		.text(function(d, i) { 
			//console.log(i,nodesX[i]); 
			return nodesX[i].name; 
		});

	// adding cells
	function row(row) {
		var cell = d3.select(this).selectAll(".cell")
			.data(row)
		.enter().append("rect")
			.attr("class", "cell")
			//.attr("x", function(d) { return x(d.x); })
			.attr("width", x.rangeBand())
			.attr("height", x.rangeBand())
			//.style("fill-opacity", function(d) { return d.z ? 1 : 0; })
			//.style("fill", function(d) { return z(d.z); })
	}
	return true;
}

var updateChart = function(data){
	currentData = data;
	//console.log('updateChart',data);
	 // precompute the orders.
	var links = data.links;
	var matrix = data.matrix;
	var orders = data.orders;
	var iniOrders = data.iniOrders;
	var totalsX = data.totalsX;
	var totalsY = data.totalsY;

	x.domain(initial ? (iniOrders.x) : (alpha ? alphaOrders.x : orders.x));
	y.domain(initial ? (iniOrders.y) : (alpha ? alphaOrders.y : orders.y));
	if (inverse) {
		y.domain(iniOrders.y.reverse());
		iniOrders.y.reverse()
	}

	z.domain([ 0, d3.max(links, function(l){ return l.value; }) ]);
	v.domain([0, d3.max(totalsX.concat(totalsY), function(t) { return t; })]);

	// adding rows
	row = svg.selectAll(".row")
		.data(matrix)
		//.transition().duration(duration)
		//.attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; })
		.each(row);

	row.select("text")
		.transition().duration(duration)
		.attr("fill", function(d,i) { return v(totalsY[d[0].y]||0); });

	// adding columns
	column = svg.selectAll(".column")
		.data(matrix)
		//.transition().duration(duration)
		//.attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

	column.select("text")
		.transition().duration(duration)
		.attr("fill", function(d,i) { return v(totalsX[d[i].x]); });

	// adding cells
	function row(row) {
		var cell = d3.select(this).selectAll(".cell")
			.data(row)
			.on("mouseover", mouseover)
			.on("mouseout", mouseout)
				//.style("fill-opacity", function(d) { return z(d.z); })
			.attr('opacity', function(d){ return d.z ? 1 : 0; })
			.attr("fill", function(d) { return z(d.z || 0); })
			.transition().duration(duration || 500)
			.attr("x", function(d) { return x(d.x); })
	}
	function mouseover(p) {
		d3.selectAll(".row text").classed("active", function(d, i) { return i == p.y; });
		d3.selectAll(".column text").classed("active", function(d, i) { return i == p.x; });
		//d3.select('div.value').html('<br>' + nodesX[p.x].name + '<br>' + nodesY[p.y].name  + '<br>y: ' + p.y + '  x: ' + p.x  + '  z: ' + p.z)
	}

	function mouseout() {
		d3.selectAll("text").classed("active", false);
	}	
	
	var t = svg.transition().duration(duration);

	t.selectAll(".row")
		.delay(function(d, i) { return y(i) * 2; })
		.attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; })
	.selectAll(".cell")
		.delay(function(d) { return x(d.x) * 2; })
		.attr("x", function(d) { return x(d.x); });

	t.selectAll(".column")
		.delay(function(d, i) { return x(i) * 2; })
		.attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });
}

var initChart = function(filename, cb){
	data = allData[filename];
	//console.log('initChart',data)
	makeChart(data);
	updateChart(data);

	d3.selectAll('span.sort').on('click',function(){
		if (this.id == 'initial'){
			initial = true;
			inverse = false;
		} else if (this.id == 'alphabet') {
			initial = false;
			alpha = true;
			inverse = false;
		} else if (this.id == 'inverse'){
			initial = true;
			inverse = true;
		} else {
			initial = false;
			alpha = false;
			inverse = false;
		}
		d3.selectAll('span.sort').classed('active', 0);
		d3.select(this).classed('active', 1);
		updateChart(currentData);
	});
	cb();
}
var initList = function(filename){
	var li = d3.select('ul').append('li')
		.attr('id',filename)
		.text(filename.replace('.csv',''))
		.on('click', function(){
			console.log(this.id);
			d3.selectAll('li').classed('active',0);
			d3.select(this).classed('active',1);
			
			updateChart(allData[this.id]);
		});
	d3.select('ul').select('li').classed('active',1)
}
d3.csv('files.csv', function(error,files) {
	error && console.error(error);
	var i = 0;
	files.forEach(function(f){
		var filename = f.filename;
		que.defer(loadData, filename);
		!(i++) && que.defer(initChart,filename);
	})
});
