import React from 'react';

export class Day extends React.Component {
  constructor() {
    super();
  }

  render() {
    return (
      <HourList />
    );
  }
}

class HourList extends React.Component {
  constructor() {
    super();

    let d = new Date();
    this.state = {
      hours: d.getHours(),
      minutes: d.getMinutes()
    };
  }

  componentWillMount() {
    this.interval = setInterval(() => {
      let d = new Date();
      this.setState({
        hours: d.getHours(),
        minutes: d.getMinutes()
      });
    }, 10000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  getRows() {
    let ret = [];
    for (let i = 0; i <= 23; i++) {
      ret.push(<HourRow hour={i} events={[]} />);
    }
    return ret;
  }

  getMarker() {
    let m = (this.state.hours * 46) + (this.state.minutes / 1.5) + 16;
    let style = {
      marginTop: m,
      height: '2px',
      width: '80%',
      background: 'red',
      position: 'absolute'
    };
    return <div className='hour-marker' style={style}></div>;
  }

  render() {
    return (
      <div className='seven wide column'>
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
                this.props.events.map((event) => {
                  return (
                    <div className='column'>
                      <div className='ui teal small basic label event'>
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
