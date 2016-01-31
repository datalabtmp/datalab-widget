import React, { Component, PropTypes } from 'react';
import ReactWithAddons from 'react/addons';
import { Input, Button, ButtonToolbar} from 'react-bootstrap';
import d3 from 'd3';
import Chart1 from '../Chart1';
import Chart2 from '../Chart2';
import s from './Currencies.scss';
import withStyles from '../../decorators/withStyles';
import Colors from '../../constants/Colors';
import SupportedCurrencies from '../../constants/supported-currencies';
import {formatNumber} from '../../core/DOMUtils';
import moment from 'moment';
import fetch from '../../core/fetch';
import Modal from 'react-modal';
import _ from 'lodash';

/*
 * Further improvements:
 * document bar chart's "with interest" calculation
 * add loading when fetching async data
 * create a link to their "default" state
 * localize Y axis labels
 * fix UI for adding currency
 * match base selection drop down to the comp
 * */
@withStyles(s)
export default class Currencies extends Component {

  static propTypes = {
    saveState: PropTypes.bool.isRequired,
  };

  constructor() {
    super();

    //this.defaults = {
    //  modalIsOpen: false,
    //  data: [],
    //  country: 'RU',
    //  withInterest: false,
    //  base: '₽',
    //  currencies: ['₽', '$', '€', '¥'],
    //  savings: [250000, 10000, 8000, 6000],
    //  interest: [10, 4, 3, 2],
    //  rates: [1, 178.15, 84.39, 19],
    //  futureRates: [[0, 0, 0, 0],[0, 0, 0, 0],[0, 0, 0, 0],[0, 0, 0, 0]]
    //};

    this.defaults = {
      currencies: ['$'],
      savings: [100],
      interest: [10, 4, 3, 2],
      rates: [1],
      futureRates: [[0,0,0,0]], // relative increments
      modalIsOpen: false,
      data: [],
      country: SupportedCurrencies[0].country,
      withInterest: false,
      base: '$',
      loading: false,
    };

    // 1. Read share link
    if (typeof location !== 'undefined' && location.pathname.replace('/', '').length) {
      this.state = JSON.parse(decodeURIComponent(location.pathname.replace('/', '')));
    } else if (typeof localStorage != 'undefined' && localStorage.getItem('state')) {
      this.state = JSON.parse(localStorage.getItem('state'));
    } else {
      // 1.2 Guess country based on IP
      this.state = this.defaults;
      var that = this;

      this.setState({loading: true});
      fetch('https://freegeoip.net/json/')
        .then((response) => response.json()).then((json) =>
          this._onUpdate('base', SupportedCurrencies.byCountry(json.country_code).symbol, SupportedCurrencies.byCountry(json.country_code).symbol)
    ).catch((ex) => {
        this.setState({loading: false});

        console.log('parsing failed', ex);
      });
    }
  }

  _addCurrency(event) {

    this.fetchData(this.state.base, ReactWithAddons.addons.update(this.state.currencies, {$push: [event.target.dataset.currency]}), function(json){
      // FIXME: replace with combined single update() call
      this.setState({
        data: json,
        modalIsOpen: false,
        currencies: ReactWithAddons.addons.update(this.state.currencies, {$push: [event.target.dataset.currency]}),
        savings: ReactWithAddons.addons.update(this.state.savings, {$push: [0]}),
        interest: ReactWithAddons.addons.update(this.state.interest, {$push: [0]}),
        rates: ReactWithAddons.addons.update(this.state.rates, {$push: [1]}),
        futureRates: ReactWithAddons.addons.update(this.state.futureRates, {$push: [[0, 0, 0, 0]]})
      });

      this._setRates(json);
    }.bind(this));
  }

  _removeCurrency(index, event) {

    this.setState({
      currencies: ReactWithAddons.addons.update(this.state.currencies, {$splice: [[index, 1]]}),
      savings: ReactWithAddons.addons.update(this.state.savings, {$splice: [[index, 1]]}),
      interest: ReactWithAddons.addons.update(this.state.interest, {$splice: [[index, 1]]}),
      rates: ReactWithAddons.addons.update(this.state.rates, {$splice: [[index, 1]]}),
      futureRates: ReactWithAddons.addons.update(this.state.futureRates, {$splice: [[index, 1]]})
    });
  }

  /*
   * Save current state to url
   * */
  componentWillUpdate(nextProps, nextState) {
    if (this.props.saveState) {
      //history.pushState({}, '', '/' + encodeURIComponent(JSON.stringify(ReactWithAddons.addons.update(nextState, {data: {$set: {}}}))));
      localStorage.setItem('state', JSON.stringify(ReactWithAddons.addons.update(nextState, {data: {$set: {}}})));
    }
  }

  /*
   * Process state updates
   * */
  _onUpdate(type, currency, value, quarter) {



    if (type === 'base') {
      this.setState({
        base: currency,
        loading: false,
      });


      if(this.state.currencies.indexOf(currency) !== -1){
        this.setState({
          futureRates: ReactWithAddons.addons.update(this.state.futureRates, {$splice: [[this.state.currencies.indexOf(currency),1,[0,0,0,0]]]})
        });
      }

      this.fetchData(currency, this.state.currencies, function(json){
        this._setRates(json);
        this.setState({base: currency, data: json});

      }.bind(this))
      return;
    }

    var index = this.state.currencies.indexOf(currency);

    if (type === 'futureRates') {
      value = ReactWithAddons.addons.update(this.state.futureRates[index], {$splice: [[quarter, 1, value - this.state.rates[index]]]});
    } else {
      value = value.toString().replace(/[^\d]/g, '');
    }

    var obj = {};

    obj[type] = {
      $splice: [[index, 1, value]]
    };

    var newState = ReactWithAddons.addons.update(this.state, obj);

    if (index !== -1) {
      this.setState(newState);
    }
  }

  _onChangeBase(event) {
    this._onUpdate('base', event.target.value, event.target.value);
  }

  _onInterestChange(event) {
    this._onUpdate('interest', event.target.dataset.currency, event.target.value);
  }

  _onSavingsChange(event) {
    this._onUpdate('savings', event.target.dataset.currency, event.target.value);
  }

  _updateFutureRates(currency, quarter, newRate) {
    this._onUpdate('futureRates', currency, newRate, quarter);
  }

  _onWithInterestClick(event) {
    this.setState({withInterest: event.target.checked});
  }

  _setRates(data) {

    function rateByCurrency(c, data) {
      return 1 / data[c].data[data[c].data.length - 1][1];
    }

    var newRates = this.state.rates.map((f,i) => rateByCurrency(this.state.currencies[i], data));
    this.setState({rates: newRates});
  }

  fetchData(base, list, callback) {

    this.setState({loading: true});

    fetch('/api/currency?base=' + base + '&currencies=' + list.join(','))
      .then(function (response) {
        this.setState({loading: false});

        return response.json()
      }.bind(this))
      .then(callback)
      .catch(function (ex) {
        this.setState({loading: false});

        console.log('unable to fetch currency data', ex)
    }.bind(this));
  }

  /*
   * Fetch currency data from our proxy API
   * */
  componentDidMount() {
    var that = this;

    this.fetchData(this.state.base, this.state.currencies, function(json){
        that._setRates(json);

        that.setState({
          data: json
        });
    });
  }

  /*
   * Calculate total savings in base as of today
   * */
  _totalToday() {
    var total = 0;

    for (var i = 0; i < this.state.currencies.length; i++) {
      total += this.state.savings[i] * this.state.rates[i];
    }

    return total;
  }

  /*
   * Calculate total savings in base as of q4 of next year
   * */
  _futureTotal() {
    var total = 0;

    for (var i = 0; i < this.state.currencies.length; i++) {

      if (this.state.withInterest) {

        var quarterlyInterest = (1 * this.state.interest[i]) / 100 / 4;

        var baseAmount = 1 * this.state.savings[i];

        for (var q = 0; q < 4; q++) {
          baseAmount += quarterlyInterest * baseAmount;
        }

        total += baseAmount * (1 * this.state.rates[i] + 1 * this.state.futureRates[i][3]);
      }

      else total += 1 * this.state.savings[i] * (this.state.rates[i] + this.state.futureRates[i][3]);
    }

    return total;
  }

  openModal() {
    this.setState({modalIsOpen: true});
  }

  closeModal() {
    this.setState({modalIsOpen: false});
  }

  shouldComponentUpdate(nextProps, nextState){
    return true;
  }

  /*
  * Reformat values e.g. 10000 -> 10 000 on blur
  * */
  _onSavingsBlur(event) {
    event.target.value = formatNumber(parseInt(event.target.value.replace(/[^\d]/g, ''), 10));
  }

  render() {
    var rows = [];
    var options = [];

    // Currency rows
    for (var i = 0; i < this.state.currencies.length; i++) {
      var styles = {'background-color': Colors.colors[i]};
      rows.push(<li>
        <div className="field">
          <button style={styles}>{this.state.currencies[i]}</button>
          <input type="text"
                 onChange={this._onSavingsChange.bind(this)}
                 data-currency={this.state.currencies[i]}
                 defaultValue={formatNumber(this.state.savings[i])}
                 onBlur={this._onSavingsBlur.bind(this)} />
        </div>
        <div className="field">
          <span>{formatNumber(this.state.savings[i] * this.state.rates[i])}</span>
        </div>
        <div className="field">
          <input type="text"
                 data-currency={this.state.currencies[i]}
                 disabled={!this.state.withInterest}
                 defaultValue={this.state.interest[i]}
                 onChange={this._onInterestChange.bind(this)} />
        </div>
        <a className="remove" href="#" data-currencyIndex={i} onClick={this._removeCurrency.bind(this, i)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8">
            <path d="M1.41 0l-1.41 1.41.72.72 1.78 1.81-1.78 1.78-.72.69 1.41 1.44.72-.72 1.81-1.81 1.78 1.81.69.72 1.44-1.44-.72-.69-1.81-1.78 1.81-1.81.72-.72-1.44-1.41-.69.72-1.78 1.78-1.81-1.78-.72-.72z" />
          </svg>
        </a>
      </li>);
    }

    // Base drop down
    SupportedCurrencies.symbols().map(function (s) {
      options.push(<option value={s}>{s}</option>);
    });

    var buttons = [];

    _.difference(SupportedCurrencies.symbols(), this.state.currencies).map(i => buttons.push(<button className="add" onClick={this._addCurrency.bind(this)} data-currency={i} click={this._addCurrency.bind(this)}>{i}</button>))

    return (
      <div className={s.widget}>
        <Modal isOpen={this.state.modalIsOpen} onRequestClose={this.closeModal.bind(this)}>
          <button onClick={this.closeModal.bind(this)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8">
              <path d="M1.41 0l-1.41 1.41.72.72 1.78 1.81-1.78 1.78-.72.69 1.41 1.44.72-.72 1.81-1.81 1.78 1.81.69.72 1.44-1.44-.72-.69-1.81-1.78 1.81-1.81.72-.72-1.44-1.41-.69.72-1.78 1.78-1.81-1.78-.72-.72z" />
            </svg>
          </button>
          <p>Выберите валюту &nbsp;
            {buttons}
          </p>
        </Modal>
        <div className={s.header}>
          <h2>Прогноз сбережений</h2>
          <label>
            <input checked={this.state.withInterest} type="checkbox" onClick={this._onWithInterestClick.bind(this)}/>
            &nbsp;С вкладами
          </label>
          <span className={s.right}>Моя валюта&nbsp;
            <select value={this.state.base} onChange={this._onChangeBase.bind(this)}>{options}</select>
          </span>
        </div>
        <div className="col">
          <fieldset>
            <legend>
              <strong>Сбережения</strong>
              <strong>В моей валюте,&nbsp;{this.state.base}</strong>
              <strong className={this.state.withInterest ? '' : 'disabled'}>Ставки вкладов, %</strong>
            </legend>
            <ul>
              {rows}
            </ul>
          </fieldset>
          { _.difference(SupportedCurrencies.symbols(), this.state.currencies).length ? <button className="add" onClick={this.openModal.bind(this)}>+ Валюта</button> : null}
        </div>

        <div className="col">
          <h4>
            История и прогноз курсов
            <em>Перетащите точку, чтобы изменить прогноз</em>
          </h4>

          <Chart1 data={this.state.data}
                  base={this.state.base}
                  currencies={this.state.currencies}
                  rates={this.state.rates}
                  futureRates={this.state.futureRates}
                  updateFutureRates={this._updateFutureRates.bind(this)} />
        </div>
        <div className="col bar">
          <Chart2 base={this.state.base}
                  currencies={this.state.currencies}
                  rates={this.state.rates}
                  savings={this.state.savings}
                  interest={this.state.withInterest? this.state.interest : []}
                  futureRates={this.state.futureRates}/>
          <span className="left">
            сегодня
            <strong>{formatNumber(this._totalToday.bind(this)())} {this.state.base}</strong>
          </span>
          <span className="right">
            через год
            <strong>{formatNumber(this._futureTotal.bind(this)())} {this.state.base}</strong>
          </span>
        </div>
        <p>
          <a className="share" href={'/'+ encodeURIComponent(JSON.stringify(ReactWithAddons.addons.update(this.state, {data: {$set: {}}})))}>
            Ссылка на расчёт
          </a>
        </p>
      </div>
    )
  }
}
