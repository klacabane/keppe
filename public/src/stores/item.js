'use strict';

import $ from 'jquery';
import Immutable from 'immutable';
import merge from 'merge';
import { Store } from 'flux/utils';
import Dispatcher from '../dispatcher.js';
import { Item, ITEM_TYPE } from '../models/item.js';
import ACTIONS from '../constants.js';

let _items = [];
let _hasMore = false;
let _mixtapes = [];
let _downloadingItems = new Set();
let _removingItems = new Set();
let _filters = new Immutable.Set();

class ItemStore extends Store {
  constructor() {
    super(Dispatcher);
  }

  items() {
    return _items;
  }

  mixtapes() {
    return _mixtapes;
  }

  hasMore() {
    return _hasMore;
  }

  filters() {
    return _filters;
  }

  addFilter(filter) {
    _filters = _filters.add(filter);
    return _filters;
  }

  removeFilter(filter) {
    _filters = _filters.remove(filter);
    return _filters;
  }

  hasFilter(filter) {
    return _filters.has(filter);
  }

  isDownloading(id) {
    return _downloadingItems.has(id);
  }

  isRemoving(id) {
    return _removingItems.has(id);
  }

  _downloadReq(id) {
    const checkIfDone = res => {
      const rmDl = () => {
        Dispatcher.dispatch({
          action: ACTIONS.RM_DOWNLOAD,
          id,
        });
      };
      if (res.err) {
        rmDl();
        // stop
        return;
      }

      if (res.status !== 'done') {
        setTimeout(this._downloadReq.bind(this, id), 1500);
      } else {
        rmDl();
        this.getFeed();
        this.getMixtapes();
      }
    };

    $.ajax({
      method: 'GET',
      url: `api/items/${id}/download`,
    }).done(checkIfDone);
  }

  download(id) {
    Dispatcher.dispatch({
      id,
      action: ACTIONS.ADD_DOWNLOAD,
    });
    this._downloadReq(id);
  }

  addItem(item) {
    $.ajax({
      method: 'POST',
      url: 'api/items',
      contenType: 'application/json',
      data: item.toJSON(),
    }).done(res => {
      Dispatcher.dispatch({
        action: ACTIONS.ADD_ITEM,
        item: new Item(res),
      });

      this.download(res.id);
    });
  }

  getItem(id) {
    return $.ajax({
      method: 'GET',
      url: `api/items/${id}`,
    })
    .then(res => {
      return new Item(merge(res, {
        tracks: res.tracks.map(raw => new Item(raw)),
      }));
    });
  }

  removeItem(item, from) {
    Dispatcher.dispatch({
      action: ACTIONS.RM_ITEM,
      id: item.id,
    });

    $.ajax({
      method: 'DELETE',
      url: `api/items/${item.id}`,
    }).done(() => {
      this.getFeed(from || 0)
        .then(() => {
          _removingItems.delete(item.id);
        });
    });
  }

  getFeed(start) {
    start = start || 0;
    return $.ajax({
      method: 'GET',
      url: 'api/items/feed/' + start + '/' + _filters.join(','),
    })
    .then(res => {
      Dispatcher.dispatch({
        action: ACTIONS.GET_ITEMS,
        items: res.items.map(raw => new Item(raw)),
        hasMore: res.hasMore,
      });
    });
  }

  getMixtapes() {
    $.ajax({
      method: 'GET',
      url: `api/items/mixtapes`,
    })
    .then(res => {
      const items = res.map(mt => {
        return new Item(merge(mt, {
          tracks: mt.tracks.map(raw => new Item(raw)),
        }));
      });
      Dispatcher.dispatch({
        items,
        action: ACTIONS.GET_MIXTAPES,
      });
    })
    .fail(err => {
      console.log(err);
    });
  }

  __onDispatch(payload) {
    switch (payload.action) {
      case ACTIONS.ADD_ITEM: _items.unshift(payload.item); break;

      case ACTIONS.GET_ITEMS: _items = payload.items; _hasMore = payload.hasMore; break;

      case ACTIONS.GET_MIXTAPES: _mixtapes = payload.items; break;

      case ACTIONS.ADD_DOWNLOAD: _downloadingItems.add(payload.id); break;

      case ACTIONS.RM_DOWNLOAD: _downloadingItems.delete(payload.id); break;

      case ACTIONS.RM_ITEM: _removingItems.add(payload.id); break;

      default: return;
    }
    this.__emitChange();  
  }
}

export default new ItemStore();
