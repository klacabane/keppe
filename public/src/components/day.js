import React from 'react';
import $ from 'jquery';
import { Calendar } from './calendar.js';
import { QuickEvent } from './quickevent.js';

export class Day extends React.Component {
  constructor() {
    super();

    this.state = {
      month: null,
      event: null,
      events: [],
      date: new Date()
    }
  }

  setEvent(event) {
    this.setState({
      event: event
    });
  }

  setDay(events) {
    this.setState({
      events: events
    });
  }

  createEvent(event, done) {
    $.ajax({
      method: 'POST',
      url: 'api/events',
      contentType: 'application/json',
      data: {
        
      }
    }).done(done);
  }

  render() {
    return (
      <div className='thirteen wide column'>
        <div className='ui grid'>
          <div className='eight wide column'>
            <HourList 
              onEventClick={this.setEvent.bind(this)} 
              events={this.state.events} />
          </div>
          <div className='two wide column'></div>
          <div id='right-panel' className='six wide column'>
            <div style={{position: 'fixed', padding: '50px 80px', height: '100%'}}>
              <Calendar
                onDayClick={this.setDay.bind(this)}
                month={this.state.month} />
              <EventDetails 
                event={this.state.event} />
              <QuickEvent />
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
    return nextProps.events !== this.props.events 
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
      <div>
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
                    if (event.startDate.getDate() === this.props.date.getDate())
                      height = 100;
                    else
                      marginTop = 0;
                  } else {
                    const h = event.endDate.getHours() === 0
                      ? 24 - event.startDate.getHours()
                      : event.endDate.getHours() - event.startDate.getHours();
                    const m = event.endDate.getMinutes() - event.startDate.getMinutes();

                    let height = (h * 60 + m) * (46 / 60);
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
