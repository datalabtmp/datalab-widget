import React, {Component} from 'react';
import Colors from '../../constants/Colors';
import _ from 'lodash';

export default class Chart1 extends Component {

  componentDidMount(){
    this._draw();
  }

  componentDidUpdate(){
    d3.select("#vis").select('svg').remove();
    this._draw();
  }

  _draw() {
    const _this = this;
    const margin = 30;
    const w = 220 + margin;
    const h = 175 + margin;
    const startAge = 0;
    const endAge = 100;

    const x = d3.scale.linear().domain([0, 51 * 2]).range([margin, w]);
    const y = d3.scale.linear().domain([endAge, startAge]).range([0, h-margin]).clamp(true);

    var vis = d3.select("#vis").append("svg:svg").attr("width", w+100).attr("height", h).append("svg:g");

    var line = d3.svg.line()
      .x(function(d) {return x(d.x);})
      .y(function(d) {return y(d.y);});

    var drag = d3.behavior.drag().on("drag", dragmove).on("dragstart", dragstart).on("dragend", dragend);

    function drawLines(vis, data, color, currency) {

      const rate = [];
      const classSuffix = _.snakeCase(color);

      var week = 0;

      data.data.forEach(function(j){
        rate.push({ x: week++, y: 1/j[1] });
      });

     // console.log('data', data);


      // Draw historical rate
      vis.append("svg:path").data([rate]).attr("d", line).attr('stroke', color);


      // most recent rate
      var val = rate[rate.length-1];

      var offset = 0;
      var stepSize = 12.75; // or 90

      var futureRates = _this.props.futureRates[_this.props.currencies.indexOf(currency)];

      // Draw future rates
      for(var i = 0; i < 4; i++) {

        vis.append("svg:line")
          .attr('stroke', color)
          .attr('class', `line-${i}-${classSuffix}`)
          .attr("x1", x(val.x + offset))
          .attr("y1", y(i == 0 ? val.y : futureRates[i - 1]))
          .attr("x2", x(val.x + offset + stepSize))
          .attr("y2", y(futureRates[i]));

        vis.append("svg:circle")
          .attr('fill', color)
          .attr('leftLineClass', `line-${i}-${classSuffix}`)
          .attr('rightLineClass', `line-${i + 1}-${classSuffix}`)
          .attr('leftLabelClass', `label-${i - 1}-${classSuffix}`)
          .attr('rightLabelClass', `label-${i + 1}-${classSuffix}`)
          .attr('labelClass', `label-${i}-${classSuffix}`)
          .attr('data-currency', currency)
          .attr('data-quarter', i)
          .attr('cx', x(val.x + offset + stepSize))
          .attr('cy', y(futureRates[i]))
          .attr('r', 3.5)
          .call(drag);
        offset += stepSize;
      }

      offset = 0;

      for(var i = 0; i < 4; i++) {
        vis.append("svg:text")
          .attr("class", `label-${i}-${classSuffix}`)
          .text(y.invert(y(futureRates[i])).toFixed(1))
          .attr('display', 'none')
          .attr('x', x(val.x + offset + stepSize))
          .attr('y', y(futureRates[i] + 5))
          .attr("text-anchor", "middle");

        offset += stepSize;
      }
    }


    function moveNeighboringLines(handle, dy) {
      vis.select('.' + handle.attr('leftLineClass')).attr('y2', dy);
      vis.select('.' + handle.attr('rightLineClass')).attr('y1', dy);
    }

    function dragend(){
      var that = d3.select(this);

      var _label = d3.select("." + that.attr("leftLabelClass"));
      _label.attr('display', 'none');

      _label = d3.select("." + that.attr("rightLabelClass"));
      _label.attr('display', 'none');


      _this.props.updateFutureRates(that.attr('data-currency'), that.attr('data-quarter'), y.invert(that.attr('cy')));
    }

    function dragstart(){
      var that = d3.select(this);

      var _label = d3.select("." + that.attr("leftLabelClass"));
      _label.attr('display', 'block');

      _label = d3.select("." + that.attr("rightLabelClass"));
      _label.attr('display', 'block');
    }


    function dragmove() {
      var newY = y(y.invert(d3.event.y)); // clamp

      var that = d3.select(this);
      that.attr("cy", newY);

      var _label = d3.select("." + that.attr("labelClass"));
      _label.attr('y', newY - 8);
      _label.text(y.invert(newY).toFixed(2));

      moveNeighboringLines(that, newY);
    }

    // Draw frame
    vis.append("svg:line")
      .attr("x1", x(1960))
      .attr("y1", y(startAge))
      .attr("x2", x(2009))
      .attr("y2", y(startAge))
      .attr("class", "axis");

    vis.append("svg:line")
      .attr("x1", x(0))
      .attr("y1", y(startAge))
      .attr("x2", x(0))
      .attr("y2", y(endAge))
      .attr("class", "axis");

    // Draw labels
    vis.append("svg:text")
      .attr("class", "xLabel")
      .text("год назад")
      .attr("x", 0 + margin)
      .attr("y", h - margin / 2)
      .attr("text-anchor", "start")

    vis.append("svg:text")
      .attr("class", "xLabel")
      .text("сегодня")
      .attr("x", w / 2)
      .attr("y", h - margin / 2)
      .attr("text-anchor", "start")

    vis.append("svg:text")
      .attr("class", "xLabel")
      .text("через год")
      .attr("x", w)
      .attr("y", h - margin / 2)
      .attr("text-anchor", "end")

    vis.selectAll(".yLabel")
      .data([20,40,60,80,100])
      .enter()
      .append("svg:text")
      .attr("class", "yLabel")
      .text(String)
      .attr("x", margin - 5)
      .attr("y", function(d) { return y(d)})
      .attr("text-anchor", "end")
      .attr("dy", 10);

    const ww = w - margin;

    // Draw grid
    vis.selectAll(".xTicks")
      .data([margin, margin + ww/4, margin + ww/2, margin + ww/4 + ww/2, margin + ww])
      .enter()
      .append("svg:line")
      .attr("class", "xTicks")
      .attr("x1", function (d) {return d;})
      .attr("y1", y(0))
      .attr("x2", function (d) {return d;})
      .attr("y2", y(100));

    vis.selectAll(".yTicks")
      .data(y.ticks(4))
      .enter()
      .append("svg:line")
      .attr("class", "yTicks")
      .attr("y1", function(d) {return y(d); })
      .attr("x1", margin)
      .attr("y2", function(d) {return y(d); })
      .attr("x2", w);

    var that = this;

    this.props.currencies.forEach(function(cur, i) {
      if (cur !== that.props.base && typeof that.props.data[cur] !== 'undefined') {
        console.log('drawlines', that.props.currencies[i], that.props.data[cur], cur);
        drawLines(vis, that.props.data[cur], Colors.colors[i], that.props.currencies[i]);
      }
    });
  }

  render() {
    return (
      <div id="vis"></div>
    )
  }
}


