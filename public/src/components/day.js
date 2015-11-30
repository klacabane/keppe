import React from 'react';
import $ from 'jquery';
import moment from 'moment';
import Calendar from './calendar.js';
import QuickEvent from './quickevent.js';
import { CalendarEvent } from '../models/event.js';
import Menu from './menu.js';
import EventForm from './eventform.js';
import HourList from './HourList.js';
import AudioPlayer from './audioplayer.js';

export default class CalendarApp extends React.Component {
  constructor() {
    super();

    this.state = {
      // Calendar
      month: null,
      // EventForm
      event: null,
      // HourList
      day: {},
    }
  }

  componentDidMount() {
    this._getMonth();
  }

  _getMonth() {
    const init = !!!arguments.length;
    const now = moment();
    const year = init ? now.year() : Number(arguments[0]);
    const month = init ? now.month() : Number(arguments[1]);

    $.ajax({
      method: 'GET',
      url: `api/calendar/${year}/${month}`,
    }).done((res) => {
      this.setState(
        {
          month: {
            name: res.name,
            date: moment(res.date),
            days: res.days.map(day => {
              if (!day) return null;

              return {
                date: moment(day.date),
                events: day.events.map(ev => new CalendarEvent(ev))
              };
            })
          },
        },
        () => {
          if (init) {
            this.setDay(
              this.state.month.days.find(d => d && d.date.isSame(now, 'day'))
            );
          }
        }
      );
    });
  }

  getPrevMonth(e) {
    e.preventDefault();

    const prev = this.state.month.date.subtract(1, 'month');
    this.setState({
      month: null,
    }, this._getMonth.bind(this, prev.year(), prev.month()));
  }

  getNextMonth(e) {
    e.preventDefault();

    const next = this.state.month.date.add(1, 'month');
    this.setState({
      month: null,
    }, this._getMonth.bind(this, next.year(), next.month()));
  }

  onReset() {
    this.setState({
      month: null
    }, this._getMonth.bind(this));
  }

  setEvent(event) {
    this.setState({
      event: event
    });
  }

  setDay(day) {
    this.setState({
      day: day
    });
  }

  createEvent(event, done) {
    $.ajax({
      method: 'POST',
      url: 'api/calendar/events',
      contentType: 'application/json',
      data: event.stringify(),
    }).done((res) => {
      const ev = new CalendarEvent(res);
      const same = date => {
        return date.isSame(ev.starts, 'day') || date.isSame(ev.ends, 'day');
      };

      if (same(this.state.day.date)) {

        this.state.day.events = this.state.day.events.concat(ev);
        this.setState({
          day: this.state.day
        });
      
      } else {
      
        for (let i = 0; i < this.state.month.days.length; i++) {
          const day = this.state.month.days[i];
          if (!day) continue;

          if (same(day.date)) {
            day.events.push(ev);
          }
        }

      }

      done && done();
    });
  }

  render() {
    return (
      <div className='ui grid'>
        <Menu />

        <div className='thirteen wide column'>
          <div className='ui grid'>
            <div className='seven wide column'>
              <QuickEvent
                createEvent={this.createEvent.bind(this)} />

              <HourList 
                onEventClick={this.setEvent.bind(this)} 
                events={this.state.day.events || []} />
            </div>
            <div className='six wide fixed column'>
              <div style={{padding: '60px 60px', height: '100%'}}>
                <Calendar
                  onDayClick={this.setDay.bind(this)}
                  onPrev={this.getPrevMonth.bind(this)}
                  onNext={this.getNextMonth.bind(this)}
                  onReset={this.onReset.bind(this)}
                  month={this.state.month} />

                <EventForm 
                  event={this.state.event} />
              </div>
            </div>
          </div>
        </div>

        <AudioPlayer />
      </div>
    );
  }
}
CalendarApp.defaultProps = { today: moment() };
