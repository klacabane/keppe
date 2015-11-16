import React from 'react';

export default class HourList extends React.Component {
  constructor() {
    super();

    const d = new Date();
    this.state = {
      hours: d.getHours(),
      minutes: d.getMinutes(),
    };
  }

  componentDidMount() {
    this.interval = setInterval(this._setTime.bind(this), 10000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.events.length !== this.props.events.length 
      || nextState.hours !== this.state.hours 
      || nextState.minutes !== this.state.minutes;
  }

  _getMarker() {
    const style = {
      marginTop: (this.state.hours * 46) + (this.state.minutes * (46 / 60))
    };
    return <div id='hour-marker' style={style}></div>;
  }

  _getRows() {
    let ret = [];
    for (let i = 0; i <= 23; i++) {
      const events = this.props.events
        .filter(ev => ev.starts.hours() === i);

      ret.push(<HourRow key={i} onEventClick={this.props.onEventClick} hour={i} events={events} />);
    }
    return ret;
  }

  _setTime() {
    const d = new Date();
    this.setState({
      hours: d.getHours(),
      minutes: d.getMinutes()
    });
  }

  render() {
    return (
      <div id='hours-list'>
        {this._getMarker()}
        <table id='hours-table' className='ui very basic celled table'>
          <tbody>
            {this._getRows()}
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

  _label() {
    return (this.props.hour < 10) 
      ? '0' + this.props.hour + ':00' 
      : this.props.hour + ':00';
  }

  render() {
    return (
      <tr>
        <td className='two wide'>
          {this._label()}
        </td>
        <td className='fourteen wide'>
          <div className='ui equal width grid'>
            <div className='row'>
              {
                this.props.events.map((event, i) => {
                  let marginTop = -14 + (event.starts.minutes() * (46 / 60));
                  let height;

                  const h = event.ends.hours() === 0
                    ? 24 - event.starts.hours()
                    : event.ends.hours() - event.starts.hours();
                  const m = event.ends.minutes() - event.starts.minutes();

                  height = (h * 60 + m) * (46 / 60);
                  if (height < 26) {
                    height = 26;
                  }

                  const style = {
                    marginTop,
                    height: height + 'px',
                  };

                  return (
                    <div
                      key={i}
                      className='column' 
                      onClick={() => this.props.onEventClick(event)}>

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
