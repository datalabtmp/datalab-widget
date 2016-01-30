import React, { Component, PropTypes } from 'react';
import Colors from '../../constants/colors';

export default class Chart2 extends Component {
  static propTypes = {
    currencies: PropTypes.array.isRequired,
    savings: PropTypes.array.isRequired,
    interest: PropTypes.array.isRequired,
  };

  constructor() {
    super();
    this.margin = {top: 10, right: 0, bottom: 30, left: 30};
    this.width = 255 - this.margin.left - this.margin.right;
    this.height = 210 - this.margin.top - this.margin.bottom;
  }

  _createChart(data) {
    var svg = d3.select("#bar")
      .attr("width", this.width + this.margin.left)
      .attr("height", this.height + this.margin.top + this.margin.bottom);

    svg = svg.append("g")
      .attr("transform", "translate(" + this.margin.left + ", " + (this.margin.bottom + this.margin.top) + ")");

    this._updateChart(svg, data);
  }

  _updateChart(svg, data) {
    svg.selectAll('g').remove();

    var that = this;
    var color = d3.scale.ordinal().range(Colors.colors).domain(this.props.currencies);

    var x = d3.scale.ordinal()
      .rangeRoundBands([0, this.width], .01)
      .domain([0,1,2,3]);

    var y = d3.scale.linear()
      .rangeRound([this.height, 0])
      .domain([0, d3.max(data, function(d){return d.total;})*1.1])
      .nice(3)

    var yAxis = d3.svg.axis()
      .scale(y)
      .ticks(5)
      .tickFormat(function(d) {
          return Math.abs(d - y.domain()[1]) < 0.00001
            ? d3.format('s')(d) + " " + that.props.base
            : d3.format('s')(d)
        })
      .orient("left");

    d3.selection.prototype.last = function() {
      var last = this.size() - 1;
      return d3.select(this[0][last]);
    };

    var state = svg.selectAll(".state")
      .data(data)
      .enter()
      .append("g")
      .attr("class", ".state")
      .attr("transform", function(d, i) { return "translate(" + x(i) + ",0)"; });

    state.selectAll("rect")
      .data(function(d) { return d.quarter; })
      .enter().append("rect")
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.y1); })
      .attr("height", function(d) { return y(d.y0) - y(d.y1); })
      .style("fill", function(d) { return color(d.name); })
      .style("fill-opacity", function(d) {return d.projected ? '0.59' : '1'});

    // Y Axis
    svg.append("g")
      .attr("class", "y axis")
      .attr('text-anchor', 'start')
      .attr('text-color', 'black')
      .attr("transform", "translate(" + 7 + "," + 10 + ")")
      .call(yAxis)
      .selectAll('text')
      .last()
      .attr('transform','translate(10,0)');
  }

  _getData() {

    function calculateInterest(quarter, savings, quarterRate, yearlyInterest) {
      return savings * quarterRate * yearlyInterest / ((4 - quarter) * (100/4));
    }

    var data = [];

    for (var q = 0; q < 4; q++) {
      var quarter = {
        quarter: [],
        total: 0
      };

      var y0 = 0;

      for (var i = 0; i < this.props.currencies.length; i++) {
        quarter.quarter.push(
          {
            "name": this.props.currencies[i],
            "projected": false,
            "y0": y0,
            "y1": (y0 + this.props.savings[i] * (this.props.rates[i] + this.props.futureRates[i][q]))
          });

        y0 += this.props.savings[i] * (this.props.rates[i] + this.props.futureRates[i][q]);

        if (this.props.interest.length) {

          quarter.quarter.push(
            {
              "name": this.props.currencies[i],
              "projected": true,
              "y0": y0,
              "y1": (y0 + calculateInterest(q, this.props.savings[i], (this.props.rates[i] + this.props.futureRates[i][q]), this.props.interest[i]))
            });

          y0 += calculateInterest(q, this.props.savings[i], (this.props.rates[i] + this.props.futureRates[i][q]), this.props.interest[i]);
        }

      }

      quarter.total = y0;
      data.push(quarter);
    }

    return data;
  }

  componentDidUpdate(){
      this._updateChart(d3.select("#bar").select('g'), this._getData());
  }
  componentDidMount(){
      this._createChart(this._getData());
  }

  render() {
    return (
      <svg id="bar"></svg>
    )
  }
}
