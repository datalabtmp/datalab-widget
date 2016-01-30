/**
 * React Starter Kit (https://www.reactstarterkit.com/)
 *
 * Copyright © 2014-2016 Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import fs from 'fs';
import { join } from 'path';
import { Router } from 'express';
import Promise from 'bluebird';
import ip2country from 'ip2country';
import {countries} from 'country-data';
import _ from 'lodash';
import SupportedCurrencies from '../constants/supported-currencies';
import fetch from '../core/fetch';


// A folder with Jade/Markdown/HTML content pages
const CONTENT_DIR = join(__dirname, './content');

const router = new Router();

router.get('/', async (req, res, next) => {
  try {

    let currencies = req.query.currencies.split(',');
    const base = req.query.base || '$';

      var url = 'http://www.oanda.com/currency/historical-rates/update?' +
        'quote_currency=' + SupportedCurrencies.bySymbol(base).name +
        '&end_date=2016-1-24' +
        '&start_date=2015-1-24' +
        '&period=weekly' +
        '&display=absolute' +
        '&rate=0' +
        '&data_range=y1' +
        '&price=bid' +
        '&view=graph' +
        '&base_currency_0=' + SupportedCurrencies.bySymbol(currencies[0]).name +
        '&base_currency_1=' + SupportedCurrencies.bySymbol(currencies[1]).name +
        '&base_currency_2=' + SupportedCurrencies.bySymbol(currencies[2]).name +
        '&base_currency_3=' + SupportedCurrencies.bySymbol(currencies[3]).name +
        '&base_currency_4=GBP&';

      var list = [];

    list.push(SupportedCurrencies.bySymbol(base).name);

    currencies.forEach(c  => {SupportedCurrencies.bySymbol(c).name !== SupportedCurrencies.bySymbol(base) ? list.push(SupportedCurrencies.bySymbol(c).name) : null});

    list = _.uniq(list);


      var params = {
        method: 'get',
        headers: {
          'Pragma': 'no-cache',
          'Accept-Encoding': 'gzip, deflate, sdch',
          'Accept-Language': 'en-US,en;q=0.8,ru;q=0.6',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
          'Accept': 'text/javascript, text/html, application/xml, text/xml, */*',
          'X-Prototype-Version': '1.7',
          'X-Requested-With': 'XMLHttpRequest',
          'Connection': 'keep-alive',
          'Referer': 'http://www.oanda.com/currency/historical-rates/',
          'Cache-Control': 'no-cache',
          'Cookie': 'data_range=y1; ' +
          'period=weekly; ' +
          'mru_base0=EUR%2CUSD%2CGBP%2CCAD%2CAUD; ' +
          'mru_base1=USD%2CRUB%2CEUR%2CGBP%2CCAD; ' +
          'mru_base2=CNY%2CJPY%2CUAH%2CEUR%2CUSD; ' +
          'mru_base3=RUB%2CEUR%2CUSD%2CGBP%2CCAD; ' +
          'mru_base4=GBP%2CEUR%2CUSD%2CCAD%2CAUD; ' +
          'base_currency_1=' + SupportedCurrencies.bySymbol(currencies[0]).name + '; ' +
          'base_currency_2=' + SupportedCurrencies.bySymbol(currencies[1]).name + '; ' +
          'base_currency_3=' + SupportedCurrencies.bySymbol(currencies[2]).name + '; ' +
          'base_currency_4=' + SupportedCurrencies.bySymbol(currencies[3]).name + '; ' +
          'base_currency_5=' + SupportedCurrencies.bySymbol(currencies[4]).name + '; ' +
          'mru_quote=' + list.join('%2C') + '; ' +
          'quote_currency='+SupportedCurrencies.bySymbol(base).name+'; ' +
          'opc_id=C94BAF48-C19A-11E5-8601-C68095E5CABC; ' +
          'optimizelySegments=%7B%22221979937%22%3A%22direct%22%2C%22222712964%22%3A%22false%22%2C%22222748480%22%3A%22gc%22%7D; ' +
          'optimizelyEndUserId=oeu1453530740687r0.5542895204853266; ' +
          'optimizelyBuckets=%7B%7D; ' +
          'tc=1; ' +
          'BIGipServersj10web_app_http=3876192266.20480.0000; ' +
          'hcc_session=1453969938'
        }
      };

      const response = await fetch(url, params);

      const json = await response.json();

    var ret = {};

      currencies = currencies.map(c => SupportedCurrencies.bySymbol(c).name);

      for (var i = 0; i < json.widget.length; i++) {
        if (currencies.indexOf(json.widget[i].quoteCurrency) !== -1) ret[SupportedCurrencies.byName(json.widget[i].quoteCurrency).symbol] = json.widget[i];
      }

    res.status(200).send(ret);
  }

  catch (err) {
    next(err);
  }
});

export default router;
