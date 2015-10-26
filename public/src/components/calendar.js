let monthstr = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

class Calendar extends React.Component {
  constructor(props) {
    super();

    this.state = {
      month: null,
      date: props.date
    };

    this.getMonth();
  }

  weeks() {
    let ret = [];
    for (let i = 0; i < this.state.month.days.length; i += 7) {
      ret.push(this.state.month.days.slice(i, i+7));
    }
    return ret;
  }

  getMonth() {
    $.ajax({
      method: 'GET',
      url: 'api/calendar/' + this.state.date.getFullYear() + '/' + this.state.date.getMonth()
    }).done((res) => {
      this.setState({
        month: res
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

    this.setState({
      date: this.props.date,
      month: null
    }, this.getMonth);
  }

  render() {
    let c = ((this.state.date.getFullYear() === this.props.date.getFullYear())
      && (this.state.date.getMonth() === this.props.date.getMonth()))
      ? 'ui red basic button'
      : 'ui basic button';
    return (
      <div className='ten wide column'>
        <div className='row'>
          {this.state.date.getFullYear()}
          {monthstr[this.state.date.getMonth()]}
        </div>
        <div className='ui right floated buttons'>
          <div className='ui basic button' onClick={this.getPrevMonth.bind(this)}>
            <i className='angle left medium icon'></i>
          </div>
          <div className={c} onClick={this.reset.bind(this)}>Today</div>
          <div className='ui basic button' onClick={this.getNextMonth.bind(this)}>
            <i className='angle right medium icon'></i>
          </div>
        </div>
        <div className='ui equal width celled grid'>
          <div className='row'>
            <div className='column'>Mon</div>
            <div className='column'>Tue</div>
            <div className='column'>Wed</div>
            <div className='column'>Thu</div>
            <div className='column'>Fri</div>
            <div className='column'>Sat</div>
            <div className='column'>Sun</div>
          </div>
          {
            this.state.month 
              ? this.weeks().map((week) => {
                  return <WeekRow week={week} />
                })
              : ''
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
          this.props.week.map((day) => {
            if (!day) return <div className='column'></div>;
            
            return <DayColumn 
              date={new Date(day.date)}
              events={day.events}
            />;
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
    let ret = [];
    let len = this.props.events.length > 2 
      ? 2 
      : this.props.events.length;

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
    let c = ((this.props.date.getDate() === new Date().getDate())
           && (this.props.date.getMonth() === new Date().getMonth())
            && (this.props.date.getFullYear() === new Date().getFullYear()))
      ? 'ui right floated red circular label'
      : 'ui right floated circular label';

    return (
      <div className='column'>
        <a className={c}>{this.props.date.getDate()}</a>
        <div className="ui middle aligned divided list">
          {this.getEvents()}
        </div>
      </div>
    );
  }
}
