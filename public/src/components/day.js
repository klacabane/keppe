import React from 'react';
import $ from 'jquery';
import moment from 'moment';
import { Calendar } from './calendar.js';
import { QuickEvent } from './quickevent.js';
import { CalendarEvent } from '../models/event.js';
import EventForm from './eventform.js';

export class Day extends React.Component {
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
    this.getMonth();
  }

  getMonth() {
    const init = !!!arguments.length;
    const now = moment();
    const year = init ? now.year() : Number(arguments[0]);
    const month = init ? now.month() : Number(arguments[1]);

    $.ajax({
      method: 'GET',
      url: `api/calendar/${year}/${month}`
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
    }, this.getMonth.bind(this, prev.year(), prev.month()));
  }

  getNextMonth(e) {
    e.preventDefault();

    const next = this.state.month.date.add(1, 'month');
    this.setState({
      month: null,
    }, this.getMonth.bind(this, next.year(), next.month()));
  }

  onReset() {
    this.setState({
      month: null
    }, this.getMonth.bind(this));
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
      data: event.stringify()
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
          let day = this.state.month.days[i];
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
    );
  }
}
Day.defaultProps = { today: moment() };

class HourList extends React.Component {
  constructor() {
    super();

    const d = new Date();
    this.state = {
      hours: d.getHours(),
      minutes: d.getMinutes(),
    };
  }

  setTime() {
    const d = new Date();
    this.setState({
      hours: d.getHours(),
      minutes: d.getMinutes()
    });
  }

  componentWillMount() {
    this.interval = setInterval(this.setTime.bind(this), 10000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.events.length !== this.props.events.length 
      || nextState.hours !== this.state.hours 
      || nextState.minutes !== this.state.minutes;
  }

  getRows() {
    let ret = [];
    for (let i = 0; i <= 23; i++) {
      const events = this.props.events
        .filter(ev => {
          return ev.starts.hours() === i;
        });

      ret.push(<HourRow key={i} onEventClick={this.props.onEventClick} hour={i} events={events} />);
    }
    return ret;
  }

  getMarker() {
    const style = {
      marginTop: (this.state.hours * 46) + (this.state.minutes * (46 / 60))
    };
    return <div id='hour-marker' style={style}></div>;
  }

  render() {
    return (
      <div id='hours-list'>
        {this.getMarker()}
        <table id='hours-table' className='ui very basic celled table'>
          <tbody>
            {this.getRows()}
          </tbody>
        </table>
      </div>
    );
  }
}

class HourRow extends React.Component {
  constructor() {
    super();
  }

  label() {
    return (this.props.hour < 10) 
      ? '0' + this.props.hour + ':00' 
      : this.props.hour + ':00';
  }

  render() {
    return (
      <tr>
        <td className='two wide'>
          {this.label()}
        </td>
        <td className='fourteen wide'>
          <div className='ui equal width grid'>
            <div className='row'>
              {
                this.props.events.map((event, i) => {
                  let marginTop = -14 + (event.starts.minutes() * (46 / 60));
                  let height;

                  if (event.starts.date() < event.ends.date()) {

                  } else {
                    const h = event.ends.hours() === 0
                      ? 24 - event.starts.hours()
                      : event.ends.hours() - event.starts.hours();
                    const m = event.ends.minutes() - event.starts.minutes();

                    height = (h * 60 + m) * (46 / 60);
                    if (height < 26) {
                      height = 26;
                    }
                  }


                  const style = {
                    marginTop,
                    height: height + 'px'
                  };

                  return (
                    <div
                      key={i}
                      className='column' 
                      onClick={
                        () => this.props.onEventClick(event)
                      }>
                      <div style={style} className='ui teal small label event'>
                        {event.title}
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </td>
      </tr>
    );
  }
}
