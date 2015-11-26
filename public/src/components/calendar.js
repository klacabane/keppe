import React from 'react';
import $ from 'jquery';
import moment from 'moment';
import { CalendarEvent } from '../models/event.js';

const monthstr = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

export default class Calendar extends React.Component {
  constructor(props) {
    super();

    this.state = {
      date: props.today,
      selectedDate: props.today,
    };
  }

  _weeks() {
    const ret = [];
    for (let i = 0; i < this.props.month.days.length; i += 7) {
      ret.push(this.props.month.days.slice(i, i+7));
    }
    return ret;
  }
  
  _onReset() {
    this.setState({
      selectedDate: this.props.today,
    });

    this.props.onReset();
  }

  _onDayClick(day) {
    this.setState({
      selectedDate: day.date,
    });
    
    this.props.onDayClick(day);
  }

  render() {
    const c = (this.state.date.isSame(this.props.date, 'month'))
      ? 'ui red basic button active-today'
      : 'ui basic button';

    return (
      <div id='calendar'>
        <div className='left'>
          {this.props.month ? monthstr[this.props.month.date.month()] + ' ' + this.props.month.date.year() : ''}
        </div>
        <div className='ui small right floated buttons'>
          <div className='ui basic button' onClick={this.props.onPrev}>
            <i className='angle left medium icon'></i>
          </div>
          <div className={c} onClick={this._onReset.bind(this)}>Today</div>
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
              ? this._weeks().map((week, i) => {
                  return <WeekRow 
                    key={i} 
                    week={week}
                    onDayClick={this._onDayClick.bind(this)} 
                    selectedDay={this.state.selectedDate} />
                })
              : <div className='row' style={{height: '175px'}}>
                  <div className='ui active loader'></div>
                </div>
 
          }
        </div>
      </div>
    );
  }
}
Calendar.defaultProps = { today: moment() };


class WeekRow extends React.Component {
  render() {
    return (
      <div className='row'>
        {
          this.props.week.map((day, i) => {
            if (!day) return <div key={i} className='column'></div>;

            const c = this.props.selectedDay && this.props.selectedDay.isSame(day.date, 'day')
              ? 'ui red circular label'
              : '';

            return (
              <div key={i} className='day column' onClick={() => this.props.onDayClick(day)}>
                <div className={c}>{day.date.date()}</div>
              </div>
            );
          })
        }
      </div>
    );
  }
}
