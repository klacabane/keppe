import React from 'react';
import $ from 'jquery';
import moment from 'moment';
import { CalendarEvent } from '../models/event.js';

const monthstr = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

export class Calendar extends React.Component {
  constructor(props) {
    super();

    this.state = {
      date: props.today,
      selectedDate: props.today,
    };
  }

  weeks() {
    let ret = [];
    for (let i = 0; i < this.props.month.days.length; i += 7) {
      ret.push(this.props.month.days.slice(i, i+7));
    }
    return ret;
  }
  
  reset(e) {
    this.setState({
      selectedDate: this.props.today,
    });

    this.props.onReset();
  }

  onDayClick(day) {
    this.setState({
      selectedDate: day.date,
    });
    
    this.props.onDayClick(day);
  }

  render() {
    const c = (this.state.date.isSame(this.props.date, 'month'))
      ? 'ui red basic button'
      : 'ui basic button';

    return (
      <div id='calendar'>
        <div>
          {this.props.month ? monthstr[this.props.month.date.month()] + this.props.month.date.year() : ''}
        </div>
        <div className='ui small right floated buttons'>
          <div className='ui basic button' onClick={this.props.onPrev}>
            <i className='angle left medium icon'></i>
          </div>
          <div className={c} onClick={this.reset.bind(this)}>Today</div>
          <div className='ui basic button' onClick={this.props.onNext}>
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
            this.props.month 
              ? this.weeks().map((week, i) => {
                  return <WeekRow 
                    onDayClick={this.onDayClick.bind(this)} 
                    key={i} 
                    week={week}
                    selectedDay={this.state.selectedDate} />
                })
              : <div id='loader'></div>
          }
        </div>
      </div>
    );
  }
}
Calendar.defaultProps = { today: moment() };


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

            const selected = this.props.selectedDay && this.props.selectedDay.isSame(day.date, 'day');
            return <DayColumn 
              onClick={this.props.onDayClick}
              key={i}
              date={day.date}
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
        <div className={c}>{this.props.date.date()}</div>
      </div>
    );
  }
}
