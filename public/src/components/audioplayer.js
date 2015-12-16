'use strict';

import React from 'react';
import $ from 'jquery';
import Player from '../player/player.js';

export default class AudioPlayer extends React.Component {
  constructor() {
    super();
    this.state = {
      loading: Player.loading(),
      playing: Player.playing(),
      current: Player.current(),
      volume: Player.volume(),
    };
  }

  _format(time) {
    const f = n => (n < 10 ? '0' : '') + n;
    return f(time.minutes) + ':' + f(time.seconds);
  }

  componentDidMount() {
    Player.addCallback('state', 'AudioPlayer', () => {
      this.setState({
        loading: Player.loading(),
        playing: Player.playing(),
        current: Player.current(),
      });
    });

    Player.addCallback('time', 'AudioPlayer', () => {
      this.setState({
        current: Player.current(),
      });
    });

    Player.addCallback('volume', 'AudioPlayer', () => {
      this.setState({
        volume: Player.volume(),
      });
    });
  }

  componentWillUnmount() {
    Player.removeCallbacks('AudioPlayer');
  }

  render() {
    const btnclass = this.state.loading
      ? 'ui loading button'
      : 'ui button';
    const iconclass = this.state.playing
      ? 'pause large icon'
      : 'play large icon';
    const current = this.state.current;
    return (
      <div className='row audioplayer'>

        <div className='ui grid'>
          <div className='two wide column'>
            <div className='ui small basic icon buttons'>
              <button 
                className={btnclass} 
                onClick={this.state.playing 
                  ? Player.pause.bind(Player)
                  : Player.resume.bind(Player)
                }>
                <i className={iconclass}></i>
              </button>
              <button className='ui button' onClick={Player.forward.bind(Player)}>
                <i className='step forward large icon'></i>
              </button>
            </div>
          </div>

          <div className='fourteen wide column'>
            <div id='audio-list' className='ui horizontal list'>

              <div className='item'>
                <div className='middle aligned content'>
                  {current.progress ? this._format(current.progress) : '00:00'}
                </div>
              </div>
              <ProgressBar />
              <div className='item'>
                {current.duration ? this._format(current.duration) : '00:00'}
              </div>
              <div className='item'>
                <div className='ui slider range'>
                  <input type='range' min='0' max='1' step='0.1' 
                    value={this.state.volume} 
                    onChange={e => Player.volume(e.target.value)} />
                </div>
              </div>
              {
                current.item
                  ? <div className='item'>
                      <img className='ui mini image' src={current.item.img} />
                      <div className='content'>
                        <div className='track-title header'>
                          {current.item.title}
                        </div>
                        {current.item.artist}
                      </div>
                    </div>
                  : ''
                }
            </div>

          </div>
        </div>

      </div>
    );
  }
}

class ProgressBar extends React.Component {
  constructor() {
    super();
  }

  _seek(e) {
    const parentPosition = this.getPosition(e.currentTarget);
    const offset = e.clientX - parentPosition;
    const percent = (offset / 300) * 100;
    const seconds = Player.current().duration.minutes * 60 + Player.current().duration.seconds;
    const actual = (percent / 100) * seconds;
    Player.seek(actual);
  }

  _progressWidth() {
    if (Player.current().progress) {
      const progressSeconds = Player.current().progress.minutes * 60 + Player.current().progress.seconds;
      const durationSeconds = Player.current().duration.minutes * 60 + Player.current().duration.seconds;
      const percent = (progressSeconds / durationSeconds) * 100;
      return (percent / 100) * 300;
    }
  }

  getPosition(element) {
      let x = 0;
      while (element) {
          x += (element.offsetLeft - element.scrollLeft + element.clientLeft);
          element = element.offsetParent;
      }
      return x;
  }

  render() {
    return (
      <div className='item' onClick={this._seek.bind(this)} style={{width: '300px'}}>
        <div id='audio-duration'></div>
        <div id='audio-progress' style={{width: this._progressWidth()}}></div>
      </div>
    );
  }
}
