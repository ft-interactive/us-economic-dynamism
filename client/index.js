const config = {
  sdiLine: {
    dateFormat: '%Y',
    selectorId: '#sdi-historical-graphic',
    data: 'data/sdi.tsv',
    yDomain: [0, 100],
  },
  sdiMap: {
    selectorId: '#sdi-map',
    data: 'data/sdiMap.tsv',
  },
  sdiScatter: {
    selectorId: '#sdi-scatter',
    data: 'data/sdiScatter.tsv',
  },
};

import * as d3 from 'd3';
import debounce from 'lodash.debounce';

let windowWidth = null;


const options = {};

function drawCharts() {
  if (window.innerWidth !== windowWidth || windowWidth === null){
    drawLineChart (config.sdiLine);
    drawMap (config.sdiMap);
    drawScatter (config.sdiScatter);   
    windowWidth = window.innerWidth;
  }
}

drawCharts();

window.addEventListener('resize', debounce(drawCharts, 100));

function drawLineChart(config) {
  let days,
      dateKeys,
      dateParse = d3.timeParse(config.dateFormat),
      dateLabelParse = d3.timeParse('%m %Y'),
      lineMargin = {top: 20, right: 40, bottom: 30, left: 20},
      lineWidth = d3.select(config.selectorId).node().offsetWidth - lineMargin.left - lineMargin.right,
      lineHeight = 350 - lineMargin.top - lineMargin.bottom;

  document.querySelector(config.selectorId).innerHTML = '';

  const approvalSvg = d3.select(config.selectorId).append('svg')
      .attr('width', lineWidth + lineMargin.left + lineMargin.right)
      .attr('height', lineHeight + lineMargin.top + lineMargin.bottom)

  const g = approvalSvg.append('g').attr('transform', 'translate(' + lineMargin.left + ',' + lineMargin.top + ')');

  const xApproval = d3.scaleTime()
      .range([0, lineWidth]);

  const yApproval = d3.scaleLinear()
      .range([lineHeight, 0]);

  const approvalVoronoi = d3.voronoi()
      .x(function(d) { return xApproval(d.date); })
      .y(function(d) { return yApproval(d.value); })
      .extent([[-lineMargin.left, -lineMargin.top], [lineWidth + lineMargin.right, lineHeight + lineMargin.bottom]]);

  const approvalLine = d3.line()
    .defined(d => d.value)
      .x(function(d) {
        return xApproval(d.date);
      })
      .y(function(d) {
        if (d.value && d.value !== '') {
          return yApproval(+d.value);
        }
      });

  d3.tsv(config.data, type, function(error, configData) {
    if (error) throw error;

    xApproval.domain(d3.extent(days));
    yApproval.domain(config.yDomain)

    g.append("g")
        .attr("class", "x-axis axis")
        .attr("transform", "translate(0," + lineHeight + ")")
        .call(d3.axisBottom(xApproval).ticks(5));

    g.append("g")
        .attr("class", "y-axis axis")
        .attr("transform", "translate(" + lineWidth + ",0)")
        .call(d3.axisRight(yApproval).ticks(3));

    g.append("g")
        .attr("class", "voronoi-lines")
      .selectAll("path")
      .data(configData)
      .enter().append("path")
        .attr("d", function(d) {
          d.line = this;
          return approvalLine(d.values.filter(d => d.value));
        })
        .attr("stroke", function(d){if(d.name == "US"){return "#a5526a"}
        })
        .attr("stroke-width", function(d){if(d.name == "US"){return 3}
        });
        // .attr('class',function(d){return d.name} + '-line');

  // const staticNevada = g.append('text')
  //     .attr('class', 'static-label')
  //      .attr('x', (xApproval(dateParse(2010))))
  //      .attr('y', yApproval(60))
  //     .text("Nevada");

  // const staticWestVirginia = g.append('text')
  //     .attr('class', 'static-label')
  //      .attr('x', (xApproval(dateParse(2014))))
  //      .attr('y', yApproval(12))
  //       .style('text-anchor','end')
  //     .text("West Virginia");

  // const staticNevadaLine = g.append('path')
  //     .data(configData)
  //     .enter().append('path')
  //     .attr("d", function(d) {
  //         if (d.name == "Nevada") {
  //           d.line = this;
  //           return approvalLine(d.values.filter(d => d.value));
  //         }
  //       })
  //     .attr("stroke", "black")
  //     .attr("stroke-width",3)
  //     .attr("class", "Nevada")


  const legend = g.append('g')

    legend.append('text')
      .attr('id','legend-text')
      .attr('x', xApproval(dateLabelParse('3 1994')))
      .attr('y', yApproval(91.5))
      .text('US average');

    legend.append('line')
      .attr('id', 'legend-line')
      .attr('x1', xApproval(dateParse(1993)))
      .attr('x2', xApproval(dateParse(1994)))
      .attr('y1', yApproval(93))
      .attr('y2', yApproval(93));

    legend.append('line')
      .attr('id', 'recession-line')
      .attr('x1', xApproval(dateLabelParse('12 2007')))
      .attr('x2', xApproval(dateLabelParse('12 2007')))
      .attr('y1', yApproval(0))
      .attr('y2', yApproval(83));

    legend.append('text')
      .attr('id', 'recession-text')
      .attr('x', xApproval(dateLabelParse('12 2007')))
      .attr('y', yApproval(85))
      .style('text-anchor', 'middle')
      .text('Recession begins');

    const approvalFocus = g.append("g")
        .attr("transform", "translate(-100,-100)")
        .attr("class", "focus");

    approvalFocus.append("circle")
        .attr("r", 3.5);

    approvalFocus.append("text")
        .attr("y", -10);

    const approvalVoronoiGroup = g.append("g")
        .attr("class", "voronoi");

    approvalVoronoiGroup.selectAll("path")
      .data(approvalVoronoi.polygons(d3.merge(configData.map(function(d) { return d.values; }))))
      .enter().append("path")
        .attr("d", function(d) { return d ? "M" + d.join("L") + "Z" : null; })
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);

    function mouseover(d) {
      d3.select(d.data.president.line).classed("voronoi-hover", true);
      d.data.president.line.parentNode.appendChild(d.data.president.line);
      approvalFocus.attr("transform", "translate(" + xApproval(d.data.date) + "," + yApproval(d.data.value) + ")");
      approvalFocus.select("text").text(d.data.president.name);
      // staticNevada.style('visibility','hidden');
      // staticWestVirginia.style('visibility','hidden');
    }

    function mouseout(d) {
      d3.select(d.data.president.line).classed("voronoi-hover", false);
      approvalFocus.attr("transform", "translate(-100,-100)");
      // staticNevada.style('visibility','visible');
      // staticWestVirginia.style('visibility','visible');
    }

  });

  function type(d, i, columns) {
    if (!days) {
      dateKeys = columns.slice(1);
      days = dateKeys.map(dateParse);
    }

    var c = {
      name: d.date.replace(/ $/i, ''),
      name: d.date,
      values: null,
    };

    c.values = dateKeys.map(function(k, i) {
      if (d[k] != null){
        return { president: c, date: days[i], value: d[k] || null};
      }
    });
    return c;
  }

}

function drawMap(config){
 let  mapMargin = {top: 20, right: 10, bottom: 30, left: 50},
      mapWidth = d3.select(config.selectorId).node().offsetWidth - mapMargin.left - mapMargin.right,
      mapHeight = (mapWidth*.75) - mapMargin.top - mapMargin.bottom;

  document.querySelector(config.selectorId).innerHTML = '';

  const tooltip = d3.select('body').append('div')
    .attr("class", "tooltip")               
    .style("opacity", 0);

  const mapSvg = d3.select(config.selectorId).append('svg')
      .attr('width', mapWidth + mapMargin.left + mapMargin.right)
      .attr('height', mapHeight + mapMargin.top + mapMargin.bottom);

  const stateData = d3.map();
  const stateNames = d3.map();

  const projection = d3.geoAlbersUsa()
    .translate([mapWidth / 1.8, (mapHeight / 1.8) + 30]) 
    .scale([(mapWidth*1.15)]);

  const path = d3.geoPath()
    .projection(projection);

  const x = d3.scaleLinear()
    .domain([10, 60])
    .rangeRound([(mapWidth * .25), (mapWidth * .75)]);

  const color = d3.scaleThreshold()
      .range(["#b31147","#d44d41","#e67f64","#f1ae92","#f3dec8","#95c8d4"])
      .domain([10, 20, 30, 40, 50, 60]);

  const g = mapSvg.append("g")
      .attr("class", "key")
      .attr("transform","translate(0," + (mapWidth/30) + ")")

  g.selectAll("rect")
    .data(color.range().map(function(d) {
        d = color.invertExtent(d);
        if (d[0] == null) d[0] = x.domain()[0];
        if (d[1] == null) d[1] = x.domain()[1];
        return d;
      }))
    .enter().append("rect")
      .attr("height", 8)
      .attr("x", function(d) { return x(d[0]); })
      .attr("width", function(d) { return x(d[1]) - x(d[0]); })
      .attr("fill", function(d) { return color(d[0]); });

  g.append("text")
      .attr("class", "caption")
      .attr("x", x.range()[0])
      .attr("y", -6)
      .attr("fill", "#000")
      .attr("text-anchor", "start")
      .attr("font-weight", "bold")

  g.call(d3.axisBottom(x)
      .tickSize(13)
      .tickFormat(function(x, i) { return i ? x : x; })
      .tickValues(color.domain()))
    .select(".domain")
      .remove();

  d3.queue()
      .defer(d3.json, 'data/us.json')
      .defer(d3.tsv, 'data/stateData.tsv', function(d) { 
        stateData.set(d.id, +d.dynamism);
        stateNames.set(d.id, d.State);
      })
      .await(ready);

  function ready(error, us) {
    if (error) throw error;

    mapSvg.append("g")
        .attr("class", "state-fill")
      .selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
      .enter().append("path")
        .attr("fill", function(d) { return color(d.dynamism = stateData.get(d.id)); })
        .attr("d", path)
        .attr("height", mapHeight/1.2)
         .on("mouseover", function(d) {
            d3.select(this).transition().duration(300).style("opacity", 0.8);
            tooltip.transition().duration(300)
              .style("opacity", 1)
            tooltip.html(d.State = stateNames.get(d.id) + "<br/>" + "Dynamism score of " + d.dynamism)
              .style("left", (d3.event.pageX - 75) + "px")
              .style("top", (d3.event.pageY - 60) + "px");
          })
      .on("mouseout", function() {
          d3.select(this)
            .transition().duration(300)
            .style("opacity", 1);
          tooltip.transition().duration(300)
            .style("opacity", 0);
        });

    mapSvg.append("path")
        .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
        .attr("class", "states")
        .attr("d", path);
  }
}

function drawScatter(config) {
  let lineMargin = {top: 30, right: 20, bottom: 30, left: 50},
      lineWidth = d3.select(config.selectorId).node().offsetWidth - lineMargin.left - lineMargin.right,
      lineHeight = 300 - lineMargin.top - lineMargin.bottom;

  const xScale = d3.scaleLinear()
    .range([0, lineWidth]);

  const yScale = d3.scaleLinear()
    .range([lineHeight, 0]);

  document.querySelector(config.selectorId).innerHTML = '';

  const scatterSvg = d3.select(config.selectorId).append('svg')
      .attr('width', lineWidth + lineMargin.left + lineMargin.right)
      .attr('height', lineHeight + lineMargin.top + lineMargin.bottom);

  const tooltip = d3.select('body').append('div')
    .attr("class", "tooltip")
    .style("opacity", 0);

  d3.tsv(config.data, function(error, configData) {
      if (error) throw error;

      configData.forEach(function(d){
        d.foreignBorn = +d.foreignBorn;
        d.dynamism = +d.dynamism;
      });

    xScale.domain([0,60]);
    yScale.domain([0,30]);

   scatterSvg.append("g")
        .attr("class", "x-axis axis")
        .attr("transform", "translate(" + lineMargin.left + "," + (lineHeight + lineMargin.top) + ")")
        .call(d3.axisBottom(xScale).ticks(5))
        .append('text')
          .attr("transform", "translate(" + (lineWidth + 10) + "," + -5 + ")")
          .attr("text-anchor", "end")
        .text('Dynamism score');

   scatterSvg.append("g")
        .attr("class", "y-axis axis")
        .attr("transform", "translate(" + lineMargin.left + "," + lineMargin.top + ")")
        .call(d3.axisLeft(yScale).ticks(3))
        .append('text')
        // .attr("transform", "rotate(-90)")
        .attr("y", -10)
        // .attr("dy",".71em")
        // .attr("text-anchor", "end")
        .attr("transform", "translate(" + lineMargin.left + ",0)")
        .text('% foreign born');

    const nevadaScatterLabel = scatterSvg.append('text')
        .attr('class','scatter-label')
        .attr("transform", "translate(" + lineMargin.left + "," + lineMargin.top + ")")
        .attr('x',xScale(50.5))
        .attr('y',yScale(20.9))
        .attr('text-anchor','middle')
        .text('Nevada');

    const californiaScatterLabel = scatterSvg.append('text')
        .attr('class','scatter-label')
        .attr("transform", "translate(" + lineMargin.left + "," + lineMargin.top + ")")
        .attr('x',xScale(40.9))
        .attr('y',yScale(28.6))
        .attr('text-anchor','middle')
        .text('California');

    const wvScatterLabel = scatterSvg.append('text')
        .attr('class','scatter-label')
        .attr("transform", "translate(" + lineMargin.left + "," + lineMargin.top + ")")
        .attr('x',xScale(19))
        .attr('y',yScale(3))
        .attr('text-anchor','end')
        .text('West Virginia');

    scatterSvg.selectAll(".dot")
        .data(configData)
      .enter().append("circle")
        .attr("transform", "translate(" + lineMargin.left + "," + lineMargin.top + ")")
        .attr("class", "dot")
        .attr("r", 5)
        .attr("cx", function(d) { return xScale(d.dynamism); })
        .attr("cy", function(d) { return yScale(d.foreignBorn); })
        .style('fill', '#a5526a')
        .style('opacity',.7)
        .style('stroke', function(d){if(d.State == 'California')
          {return 'black'}
          else if(d.State == 'Nevada')
          {return 'black'}
          else if(d.State == 'West Virginia')
          {return 'black'}
        })
      .on("mouseover", function(d) {
          d3.select(this).transition()
            .duration(300)
            .style("opacity", 1)
            .style("stroke","black")
            .style("stroke-width",1);
          tooltip.transition()
               .duration(200)
               .style("opacity", .9)
          tooltip.html(d.State + "<br/>" + "Dynamism score of " + d.dynamism
          + "<br/>" + d.foreignBorn + "% foreign-born")
               .style("left", (d3.event.pageX - 75) + "px")
               .style("top", (d3.event.pageY - 60) + "px");
          // nevadaScatterLabel.style('visibility','hidden');
          // californiaScatterLabel.style('visibility','hidden');
      })
      .on("mouseout", function(d) {
          d3.select(this).transition().duration(300).style("opacity", .8).style("stroke-width",0);
          tooltip.transition()
               .duration(500)
               .style("opacity", 0);
          // nevadaScatterLabel.style('visibility','visible');
          // californiaScatterLabel.style('visibility','visible');
      });

      // scatterSvg.on('mouseover', function(d){
      //    nevadaScatterLabel.style('visibility','hidden');
      //     californiaScatterLabel.style('visibility','hidden');
      //     wvScatterLabel.style('visibility','hidden');
      // })
      //   .on('mouseout', function(d){
      //     nevadaScatterLabel.style('visibility','visible');
      //     californiaScatterLabel.style('visibility','visible');
      //      wvScatterLabel.style('visibility','visible');
      //   })

  })
}