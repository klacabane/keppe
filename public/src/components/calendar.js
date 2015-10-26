var monthstr = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

class Calendar extends React.Component {
  constructor() {
    super();

    this.state = {
      month: null,
      date: new Date()
    };

    this.getMonth();
  }

  weeks() {
    var ret = [];
    for (var i = 0; i < this.state.month.days.length; i += 7) {
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

  render() {
    return (
      <div className='ten wide column'>
        <div className='row'>
          {this.state.date.getFullYear()}
          {monthstr[this.state.date.getMonth()]}
        </div>
        <button className='ui button' onClick={this.getPrevMonth.bind(this)}>Prev</button>
        <button className='ui button' onClick={this.getNextMonth.bind(this)}>Next</button>
        <div className='ui equal width center aligned celled grid'>
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

class WeekRow extends React.Component {
  constructor() {
    super();
  }

  render() {
    return (
      <div className='row'>
        {
          this.props.week.map((day) => {
            return day 
              ? <Day day={day} />
              : <EmptyDay />;
          })
        }
      </div>
    );
  }
}

class Day extends React.Component {
  constructor() {
    super();
  }

  render() {
    var c = this.props.day.num === new Date().getDate()
      ? 'ui red circular label'
      : 'ui circular label';

    return (
      <div className='column'>
        <a className={c}>{this.props.day.num}</a>
        <div className="ui middle aligned divided list">
          <div className="item">
            <div className="content">
              Event 1
            </div>
          </div>
          <div className="item">
            <div className="content">
              Event 2
            </div>
          </div>
          <div className="item">
            <div className="content">
              Event 3
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class EmptyDay extends React.Component {
  constructor() {
    super();
  }

  render() {
    return (
      <div className='column'></div>
    );
  }
}
