import React from 'react';
import $ from 'jquery';
import moment from 'moment';
import Calendar from './calendar.js';
import QuickEvent from './quickevent.js';
import { CalendarEvent } from '../models/event.js';
import Menu from './menu.js';
import EventForm from './eventform.js';
import HourList from './hourlist.js';
import AudioPlayer from './audioplayer.js';
import MonthStore from '../stores/month.js';

export default class CalendarApp extends React.Component {
  constructor() {
    super();

    this.state = {
      // Calendar
      month: MonthStore.month(),
      // EventForm
      event: null,
      // HourList
      day: null,
    }
    MonthStore.get();
  }

  componentDidMount() {
    this.sub = MonthStore.addListener(() => {
      const month = MonthStore.month();
      this.setState({
        month,
        day: this.state.day === null 
          ? month.days.find(day => day && day.date.isSame(moment(), 'day'))
          : this.state.day,
      });
    });
  }

  componentWillUnmount() {
    this.sub.remove();
  }

  onReset() {
    this.setState({
      day: null,
    });
    MonthStore.get();
  }

  setEvent(event) {
    this.setState({
      event: event,
    });
  }

  setDay(day) {
    this.setState({
      day: day,
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
                createEvent={MonthStore.addEvent.bind(MonthStore)} />

              <HourList 
                onEventClick={this.setEvent.bind(this)} 
                events={this.state.day ? this.state.day.events : []} />
            </div>
            <div className='six wide fixed column'>
              <div style={{padding: '60px 60px', height: '100%'}}>
                <Calendar
                  onDayClick={this.setDay.bind(this)}
                  onPrev={MonthStore.getPrev.bind(MonthStore)}
                  onNext={MonthStore.getNext.bind(MonthStore)}
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
