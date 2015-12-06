'use strict';

import $ from 'jquery';
import moment from 'moment';
import { Store } from 'flux/utils';
import Dispatcher from '../dispatcher.js';
import { Item, ITEM_TYPE } from '../models/item.js';
import { CalendarEvent } from '../models/event.js';
import ACTIONS from '../constants.js';

let _month = null;

class MonthStore extends Store {
  constructor() {
    super(Dispatcher);
  }

  month() {
    return _month;
  }

  addEvent(ev) {
    $.ajax({
      method: 'POST',
      url: 'api/calendar/events',
      contenType: 'application/json',
      data: ev.toJSON(),
    }).done((res) => {
      Dispatcher.dispatch({
        action: ACTIONS.ADD_EVENT,
        event: new CalendarEvent(res),
      });
    });
  }

  getPrev() {
    const prev = _month.date.subtract(1, 'month');
    this.get(prev.year(), prev.month());
  }

  getNext() {
    const next = _month.date.add(1, 'month');
    this.get(next.year(), next.month());
  }

  get() {
    const init = !!!arguments.length;
    const now = moment();
    const year = init ? now.year() : Number(arguments[0]);
    const month = init ? now.month() : Number(arguments[1]);

    $.ajax({
      method: 'GET',
      url: `api/calendar/${year}/${month}`,
    }).done((res) => {
      Dispatcher.dispatch({
        action: ACTIONS.GET_MONTH,
        month: {
          name: res.name,
          date: moment(res.date),
          days: res.days.map(day => {
            if (!day) return null;
            return {
              date: moment(day.date),
              events: day.events.map(ev => new CalendarEvent(ev))
            };
          }),
        }
      });
    });
  }

  __onDispatch(payload) {
    switch (payload.action) {
      case ACTIONS.ADD_EVENT: 
        const addEvent = day => {
          if (!day) return;

          if (day.date.isSame(payload.event.starts, 'day') || 
              day.date.isSame(payload.event.ends, 'day')) {
            day.events.push(payload.event);
          }
        };
        _month.days.forEach(addEvent);
        break;

      case ACTIONS.GET_MONTH: _month = payload.month; break;

      default: return;
    }
    this.__emitChange();  
  }
}

export default new MonthStore();
