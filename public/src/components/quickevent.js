import React from 'react';
import Moment from 'moment';
import { Event } from '../models/event.js';

const re = /(from|to) ([1-9]|1[0-2])(:[0-5]?[0-9])?(am|pm)/gi;
const reDay = /(today|tomorrow|monday|tues(day)?|wedn(esday)?|thurs(day)?|friday|satur(day)?|sunday)/i;

const literalToDayNum = {
  today: 0,
  tomorrow: 1,

  monday: 1,
  tuesday: 2,
  tues: 2,
  wednesday: 3,
  wedn: 3,
  thursday: 4,
  thurs: 4,
  friday: 5,
  saturday: 6,
  satur: 6,
  sunday: 0
};

class CalendarEvent {
  constructor(time) {
    this.startDate = new Date(time);
    this.endDate = new Date(time);
    this.title = 'Event';
  }
}

export class QuickEvent extends React.Component {
  constructor(props) {
    super();

    this.state = {
      event: null,
      show: false
    };
  }

  suggest(e) {
    if (e.which === 13) {
      this.props.createEvent(this.state.event);
      return;
    }

    let startDate = new Date();
    let endDate = new Date();
    let val = e.target.value;

    if (reDay.test(val)) {
      const when = reDay.exec(val)[1];
      const todayId = startDate.getDay();
      const nextId = literalToDayNum[when.toLowerCase()];
      const delta = (when === 'today' || when === 'tomorrow')
        ? nextId
        : (nextId === 0)
          ? todayId + 1
          : (nextId > todayId)
            ? nextId - todayId
            : 6 - todayId + nextId + 1;

      const start = startDate.getDate() + delta;
      startDate.setDate(start);
      endDate.setDate(start);

      val = val.replace(when, '').trim();
    }

    for (let result; result = re.exec(val); ) {
      // 24hr format
      const hours = (result[4] === 'pm')
        ? parseInt(result[2], 10) + 12
        : parseInt(result[2], 10);
      const minutes = result[3] 
        ? parseInt(result[3].substring(1), 10)
        : 0;

      const d = (result[1].toLowerCase() === 'from')
        ? startDate
        : endDate;

      d.setHours(hours);
      d.setMinutes(minutes);
    }

    if (endDate < startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    const event = new Event({
      title: val.replace(re, '').trim(),
      startDate,
      endDate: endDate
    });

    console.log(event);
    this.setState({
      event: event,
      show: true
    });
  }

  onBlur() {
    this.setState({
      show: false
    });
  }
  
  render() {
    return (
      <div id='quickevent'>
        <div className='ui form attached fluid segment'>
          <div className='ui large fluid transparent input'>
            <input placeholder='Quick event' onFocus={this.suggest.bind(this)} onBlur={this.onBlur.bind(this)} onKeyUp={this.suggest.bind(this)} />
          </div>
        </div>
        {
          this.state.show
            ? <div className='ui attached yellow message'>
                <div className='content'>
                  <div className='header'>{this.state.event.title}</div>
                  <div className='description'>
                    <div>{Moment(this.state.event.get('startDate')).format('LLL')}</div>
                    <div>{Moment(this.state.event.get('endDate')).format('LLL')}</div>
                  </div>
                </div>
              </div>
           : ''
        }
      </div>
    );
  }
}
