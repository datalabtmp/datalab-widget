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
 * 1 fetch settings from query params or defaults
 *   1.1 if default, determine default base based on country //free geo ip
 * 2 fetch rates // via /api/currencies
 * 3 pushstate with json hash: //history.pushState({}, '', '/' + encodeURIComponent(JSON.stringify(that.props.futureRates)));
 *  3.1 localStorage Сохраните данные расчёта в браузере
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
    //  country: SupportedCurrencies[0].country,
    //  withInterest: false,
    //  base: SupportedCurrencies[0].symbol,
    //  currencies: ['₽', '$', '€', '¥'],
    //  savings: [250000, 10000, 8000, 6000],
    //  interest: [10, 4, 3, 2],
    //  rates: [1, 178.15, 84.39, 19],
    //  futureRates: [[1, 1, 1, 1], [178.15, 179, 181, 185.12], [84.39, 85, 90, 95], [19, 20, 21, 22]]
    //};

    this.defaults = {
      modalIsOpen: false,
      data: [],
      country: SupportedCurrencies[0].country,
      withInterest: false,
      base: '$',
      currencies: ['$'],
      savings: [100],
      interest: [10, 4, 3, 2],
      rates: [1],
      futureRates: [[1, 1, 1, 1]]
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

      fetch('https://freegeoip.net/json/')
        .then((response) => response.json()).then((json) =>
          this._onUpdate('base', SupportedCurrencies.byCountry(json.country_code).symbol, SupportedCurrencies.byCountry(json.country_code).symbol)

        ).catch((ex) => {
        console.log('parsing failed', ex);


      });
    }
  }

  _addCurrency(event) {

    this.fetchData(this.state.base, ReactWithAddons.addons.update(this.state.currencies, {$push: [event.target.dataset.currency]}), function(json){
      this.setState({
        data: json,
        modalIsOpen: false,
        currencies: ReactWithAddons.addons.update(this.state.currencies, {$push: [event.target.dataset.currency]}),
        savings: ReactWithAddons.addons.update(this.state.savings, {$push: [0]}),
        interest: ReactWithAddons.addons.update(this.state.interest, {$push: [0]}),
        rates: ReactWithAddons.addons.update(this.state.rates, {$push: [1]}),
        futureRates: ReactWithAddons.addons.update(this.state.futureRates, {$push: [[1, 1, 1, 1]]})
      });

      this._setRates(json);
    }.bind(this));



  }

  /*
   * Save current state to url
   * */
  componentWillUpdate(nextProps, nextState) {
    if (this.props.saveState) {
      history.pushState({}, '', '/' + encodeURIComponent(JSON.stringify(ReactWithAddons.addons.update(nextState, {data: {$set: {}}}))));
      localStorage.setItem('state', JSON.stringify(ReactWithAddons.addons.update(nextState, {data: {$set: {}}})));
    }
  }

  /*
   * Process state updates
   * */
  _onUpdate(type, currency, value, quarter) {


    if (type === 'base') {
      console.log('_onUpdate base ', currency);
      this.fetchData(currency, this.state.currencies, function(json){
        this._setRates(json);
        this.setState({base: currency, data: json});

      }.bind(this))
      return;
    }

    var index = this.state.currencies.indexOf(currency);

    if (type === 'futureRates') {
      value = ReactWithAddons.addons.update(this.state.futureRates[index], {$splice: [[quarter, 1, value]]});
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
    //rates.map((f, i) => console.log([]));//[data[this.state.currencies[i]].data.length - 1][1]);

    function rateByCurrency(c, data) {
      return 1 / data[c].data[data[c].data.length - 1][1];
    }

    var newRates = this.state.rates.map((f,i) => rateByCurrency(this.state.currencies[i], data));
    var newFutureRates = newRates.map(r => [r, r, r, r]);
    this.setState({rates: newRates, futureRates: newFutureRates});
  }

  fetchData(base, list, callback) {
    fetch('/api/currency?base=' + base + '&currencies=' + list.join(','))
      .then(function (response) {
        return response.json()
      })
      .then(callback)
      .catch(function (ex) {
      console.log('unable to fetch currency data', ex)
    });
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
      total +=  (1 * this.state.savings[i] + (this.state.withInterest ? this.state.savings[i] * (1 * this.state.interest[i] / 100) : '')) * this.state.futureRates[i][3];
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
                 onChange={this._onInterestChange.bind(this)}/>
        </div>
      </li>);
    }

    // Base drop down
    SupportedCurrencies.symbols().map(function (s) {
      options.push(<option>{s}</option>);
    });

    var buttons = [];

    _.difference(SupportedCurrencies.symbols(), this.state.currencies).map(i => buttons.push(<button className="add" onClick={this._addCurrency.bind(this)} data-currency={i} click={this._addCurrency.bind(this)}>{i}</button>))

    return (
      <div className={s.widget}>


        <Modal
          isOpen={this.state.modalIsOpen}
          onRequestClose={this.closeModal.bind(this)}
           >

          <button onClick={this.closeModal.bind(this)}>close</button>
          <p>Выберите валюту из&nbsp;

            {buttons}

          </p>

        </Modal>
        <div className={s.header}>
          <h2>Прогноз сбережений</h2>
          <label>
            <input type="checkbox" onClick={this._onWithInterestClick.bind(this)}/>
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
          <button className="add" onClick={this.openModal.bind(this)}>+ Валюта</button>
        </div>

        <div className="col">
          <h4>
            История и прогноз курсов
            <em>Перетащите точку, чтобы изменить прогноз</em>
          </h4>
          <Chart1 data={this.state.data}
                  base={this.state.base}
                  currencies={this.state.currencies}
                  futureRates={this.state.futureRates}
                  updateFutureRates={this._updateFutureRates.bind(this)} />
        </div>
        <div className="col bar">
          <Chart2 base={this.state.base}
                  currencies={this.state.currencies}
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
      </div>
    )
  }
}
