import React from 'react';

const re = /(from|to) ([1-9]|1[0-2])(:[0-5]?[0-9])?(am|pm)/g;
const reDay = /(today|tomorrow|monday|tues(day)?|wedn(esday)?|thurs(day)?|friday|satur(day)?|sunday)/

const literalToDayNum = {
  today: 0,
  tomorrow: 1,

  monday: 0,
  tuesday: 1,
  tues: 1,
  wednesday: 2,
  wedn: 2,
  thursday: 3,
  thurs: 3,
  friday: 4,
  saturday: 5,
  satur: 5,
  sunday: 6
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
      event: {}
    };
  }

  suggest(val) {
    let event = new CalendarEvent(this.props.date.getTime());

    if (reDay.test(val)) {
      const when = reDay.exec(val)[1];
      const todayId = this.props.date.getDay();
      const nextId = literalToDayNum[when];
      const delta = (when === 'today' || when === 'tomorrow')
        ? nextId
        : (nextId > todayId)
          ? nextId - todayId
          : 7 - todayId + nextId;

      const start = this.props.date.getDate() + delta + 1;
      event.startDate.setDate(start);
      event.endDate.setDate(start);

      val = val.replace(when, '').trim();
    }

    let result;
    while (result = re.exec(val)) {
      let hours = parseInt(result[2], 10);
      const minutes = result[3] 
        ? parseInt(result[3].substring(1), 10)
        : 0;
      
      if (result[4] === 'pm')
        hours += 12;

      let d = (result[1] === 'from')
        ? event.startDate
        : event.endDate;

      d.setHours(hours);
      d.setMinutes(minutes);
    }

    if (event.endDate < event.startDate) {
      event.endDate.setDate(event.endDate.getDate() + 1);
    }
    event.title = val.replace(re, '').trim() || event.title;

    console.log(event);
    this.setState({
      event: event
    });
  }
  
  render() {
    return (
      <div>
        <input onKeyUp={(e) => this.suggest(e.target.value)} />
        {
          this.state.event.title
            ? <div id='suggestion'>
                {this.state.event.title}
                <div>{this.state.event.startDate.getHours()}:{this.state.event.startDate.getMinutes()}</div>
                <div>{this.state.event.endDate.getHours()}:{this.state.event.endDate.getMinutes()}</div>
              </div>
           : ''
        }
      </div>
    );
  }
}
QuickEvent.defaultProps = { date: new Date() };
