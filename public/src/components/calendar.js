import React from 'react';
import $ from 'jquery';

const monthstr = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

export class Calendar extends React.Component {
  constructor(props) {
    super();

    this.state = {
      month: props.month,
      date: props.date
    };

    this.getMonth(true);
  }

  weeks() {
    let ret = [];
    for (let i = 0; i < this.state.month.days.length; i += 7) {
      ret.push(this.state.month.days.slice(i, i+7));
    }
    return ret;
  }
  
  init() {
    for (let i = 0; i < this.state.month.days.length; i++) {
      const day = this.state.month.days[i];
      if (!day) continue;

      day.date = new Date(day.date);
      if (day.date.getDate() === this.state.date.getDate() &&
          day.date.getMonth() === this.state.date.getMonth() &&
          day.date.getFullYear() === this.state.date.getFullYear())
      {
        this.props.onDayClick(day);
        break;
      }
    }

    this.setState({
      day: this.props.date
    });
  }

  getMonth(init) {
    $.ajax({
      method: 'GET',
      url: 'api/calendar/' + this.state.date.getFullYear() + '/' + this.state.date.getMonth()
    }).done((res) => {
      this.setState({
        month: res
      }, () => {
        init && this.init();
      });
    });
  }

  getPrevMonth(e) {
    e.preventDefault();

    this.setState({
      date: new Date(this.state.date.getFullYear(), this.state.date.getMonth() - 1, 1),
      month: null
    }, this.getMonth);
  }

  getNextMonth(e) {
    e.preventDefault();

    this.setState({
      date: new Date(this.state.date.getFullYear(), this.state.date.getMonth() + 1, 1),
      month: null
    }, this.getMonth);
  }

  reset(e) {
    e.preventDefault();

    if (this.state.date.getFullYear() === this.props.date.getFullYear() &&
        this.state.date.getMonth() === this.props.date.getMonth())
    {

      this.init();

    } else {

      this.setState({
        date: this.props.date,
        month: null
      }, () => {
        this.getMonth(true);
      });

    }
  }

  onDayClick(day) {
    this.setState({
      day: day.date
    });
    
    this.props.onDayClick(day);
  }

  render() {
    const c = ((this.state.date.getFullYear() === this.props.date.getFullYear())
      && (this.state.date.getMonth() === this.props.date.getMonth()))
      ? 'ui red basic button'
      : 'ui basic button';

    return (
      <div id='calendar'>
        <div>
          {monthstr[this.state.date.getMonth()]} {this.state.date.getFullYear()}
        </div>
        <div className='ui small right floated buttons'>
          <div className='ui basic button' onClick={this.getPrevMonth.bind(this)}>
            <i className='angle left medium icon'></i>
          </div>
          <div className={c} onClick={this.reset.bind(this)}>Today</div>
          <div className='ui basic button' onClick={this.getNextMonth.bind(this)}>
            <i className='angle right medium icon'></i>
          </div>
        </div>
        <div id='calendar-grid' className='ui equal width celled grid'>
          <div className='dayofweek row'>
            <div className='column'>M</div>
            <div className='column'>T</div>
            <div className='column'>W</div>
            <div className='column'>T</div>
            <div className='column'>F</div>
            <div className='column'>S</div>
            <div className='column'>S</div>
          </div>
          {
            this.state.month 
              ? this.weeks().map((week, i) => {
                return <WeekRow 
                  onDayClick={this.onDayClick.bind(this)} 
                  key={i} 
                  week={week}
                  day={this.state.day} />
                })
              : <div id='loader'></div>
          }
        </div>
      </div>
    );
  }
}

Calendar.defaultProps = { date: new Date() };


class WeekRow extends React.Component {
  constructor() {
    super();
  }

  render() {
    return (
      <div className='row'>
        {
          this.props.week.map((day, i) => {
            if (!day) return <div key={i} className='column'></div>;

            const date = new Date(day.date);
            const selected = this.props.day &&
              this.props.day.getDate() === date.getDate() &&
              this.props.day.getMonth() === date.getMonth() &&
              this.props.day.getFullYear() === date.getFullYear();
            return <DayColumn 
              onClick={this.props.onDayClick}
              key={i}
              date={date}
              selected={selected}
              events={day.events} />;
          })
        }
      </div>
    );
  }
}

class DayColumn extends React.Component {
  constructor() {
    super();
  }

  getEvents() {
    const len = this.props.events.length > 2 
      ? 2 
      : this.props.events.length;
    let ret = [];

    for (let i = 0; i < len; i++) {
      ret.push(<div className='item'>
        <div className='content'>
          {this.props.events[i].title}
        </div>
      </div>);
    }
    return ret;
  }

  render() {
    const c = this.props.selected
      ? 'ui red circular label'
      : '';

    return (
      <div className='day column' onClick={() => this.props.onClick({date: this.props.date, events: this.props.events})}>
        <div className={c}>{this.props.date.getDate()}</div>
      </div>
    );
  }
}
