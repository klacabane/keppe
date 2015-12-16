'use strict';

import $ from 'jquery';
import Immutable from 'immutable';
import merge from 'merge';
import { Store } from 'flux/utils';
import Dispatcher from '../dispatcher.js';
import { Item, ITEM_TYPE } from '../models/item.js';
import ACTIONS from '../constants.js';

let _results = {};
let _loading = false;

class SearchStore extends Store {
  constructor() {
    super(Dispatcher);
  }

  clear() {
    _results = {};
  }

  results() {
    return _results;
  }

  loading() {
    return _loading;
  }

  search(term) {
    _loading = true;
    Dispatcher.dispatch({action: ACTIONS.SEARCH_LOADING});

    $.ajax({
      method: 'GET',
      url: 'api/search/' + term,
    }).done(categories => {
      for (let key in categories) {
        categories[key].results = categories[key].results.map(raw => new Item(raw));
      }

      Dispatcher.dispatch({
        categories,
        action: ACTIONS.SEARCH_RESULTS,
      });
    });
  }

  __onDispatch(payload) {
    switch (payload.action) {
      case ACTIONS.SEARCH_RESULTS: 
        _results = payload.categories;
        _loading = false;
        break;

      case ACTIONS.SEARCH_LOADING: _loading = true; break;

      default: return;
    }
    this.__emitChange();
  }
}

export default new SearchStore();
