'use strict';

import $ from 'jquery';
import { Store } from 'flux/utils';
import Dispatcher from '../dispatcher.js';
import { Item, ITEM_TYPE } from '../models/item.js';
import ACTIONS from '../constants.js';

let _items = [];
let _downloadingItems = new Set();
let _removingItems = new Set();

class ItemStore extends Store {
  constructor() {
    super(Dispatcher);
    this.getItems();
  }

  items() {
    return _items;
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
      console.log(res);
      if (res.err) {
        rmDl();
        // stop
        return;
      }

      if (res.status !== 'done') {
        setTimeout(this._downloadReq.bind(this, id), 1500);
      } else {
        rmDl();
        this.getItems();
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

  removeItem(item) {
    Dispatcher.dispatch({
      action: ACTIONS.RM_ITEM,
      id: item.id,
    });

    $.ajax({
      method: 'DELETE',
      url: `api/items/${item.id}`,
    }).done(() => {
      this.getItems(() => {
        _removingItems.delete(item.id);
      });
    });
  }

  getItems(done) {
    $.ajax({
      method: 'GET',
      url: 'api/items',
    })
    .done(res => {
      Dispatcher.dispatch({
        action: ACTIONS.GET_ITEMS,
        items: res.map(raw => new Item(raw)),
      });
      done && done();
    });
  }

  __onDispatch(payload) {
    switch (payload.action) {
      case ACTIONS.ADD_ITEM: _items.unshift(payload.item); break;

      case ACTIONS.GET_ITEMS: _items = payload.items; break;

      case ACTIONS.ADD_DOWNLOAD: _downloadingItems.add(payload.id); break;

      case ACTIONS.RM_DOWNLOAD: _downloadingItems.delete(payload.id); break;

      case ACTIONS.RM_ITEM: _removingItems.add(payload.id); break;

      default: return;
    }
    this.__emitChange();  
  }
}

export default new ItemStore();
