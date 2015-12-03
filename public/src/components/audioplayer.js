'use strict';

import React from 'react';
import $ from 'jquery';
import Player from '../player/player.js';
import { Item } from '../models/event.js';

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
            {current.progress ? this._format(current.progress) : '00:00'}
          </div>
          <div className='ten wide column'>
            <div className='ui tiny progress' ref='progress'>
              <div className='bar'></div>
            </div>
          </div>
          <div className='three wide column'>
            <div className='ui slider range'>
              <input type='range' min='0' max='1' step='0.1' 
                value={this.state.volume} 
                onChange={e => Player.volume(e.target.value)} />
            </div>
            {current.duration ? this._format(current.duration) : '00:00'}
            {current.item ? current.item.get('title') : 'No track'}
          </div>
        </div>
      </div>
    );
  }
}
