import React from 'react';
import $ from 'jquery';
import { Calendar } from './calendar.js';
import { QuickEvent } from './quickevent.js';
import { Event } from '../models/event.js';

export class Day extends React.Component {
  constructor() {
    super();

    this.state = {
      // Calendar month
      month: null,
      // Detailed event
      event: null,
      // Event list day
      day: {}
    }
  }

  setEvent(event) {
    this.setState({
      event: event
    });
  }

  setDay(day) {
    for (let i = 0; i < day.events.length; i++) {
      day.events[i].startDate = new Date(day.events[i].startDate);
      day.events[i].endDate = new Date(day.events[i].endDate);
    }

    this.setState({
      day: day
    });
  }

  createEvent(event) {
    $.ajax({
      method: 'POST',
      url: 'api/calendar/events',
      contentType: 'application/json',
      data: JSON.stringify(event)
    }).done((res) => {
      res.startDate = new Date(res.startDate);
      res.endDate = new Date(res.endDate);

      if (res.startDate.getDate() === this.state.day.date.getDate()
            && res.startDate.getMonth() === this.state.day.date.getMonth() 
              && res.startDate.getYear() === this.state.day.date.getYear())
        {
          this.state.day.events = this.state.day.events.concat(res);
          this.setState({
            day: this.state.day
          });
        }
    });
  }

  render() {
    return (
      <div className='thirteen wide column'>
        <div className='ui grid'>
          <div className='six wide column'>
            <QuickEvent
              createEvent={this.createEvent.bind(this)} />

            <HourList 
              onEventClick={this.setEvent.bind(this)} 
              events={this.state.day.events || []} />
          </div>
          <div id='right-panel' className='six wide column'>
            <div style={{padding: '50px 50px', height: '100%'}}>
              <Calendar
                onDayClick={this.setDay.bind(this)}
                month={this.state.month} />
              <EventDetails 
                event={this.state.event} />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class EventDetails extends React.Component {
  constructor(props) {
    super();
  }

  render() {
    if (!this.props.event)
      return <div>No Event Selected</div>

    return <div>{this.props.event.title}</div>
  }
}

class HourList extends React.Component {
  constructor() {
    super();

    const d = new Date();
    this.state = {
      hours: d.getHours(),
      minutes: d.getMinutes()
    };
  }

  componentWillMount() {
    this.interval = setInterval(() => {
      const d = new Date();
      this.setState({
        hours: d.getHours(),
        minutes: d.getMinutes()
      });
    }, 10000);
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
        .filter(event => {
          return event.startDate.getHours() === i;
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
                  let marginTop = -14 + (event.startDate.getMinutes() * (46 / 60));
                  let height;

                  if (event.startDate.getDate() < event.endDate.getDate()) {

                  } else {
                    const h = event.endDate.getHours() === 0
                      ? 24 - event.startDate.getHours()
                      : event.endDate.getHours() - event.startDate.getHours();
                    const m = event.endDate.getMinutes() - event.startDate.getMinutes();

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
                      <div style={style} className='ui teal small basic label event'>
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
