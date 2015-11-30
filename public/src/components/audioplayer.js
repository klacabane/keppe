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
      currentTime: {},
    };
  }

  componentDidMount() {
    Player.addCallback('state', 'AudioPlayer', () => {
      this.setState({
        loading: Player.loading(),
        playing: Player.playing(),
      });
    });

    Player.addCallback('time', 'AudioPlayer', currentTime => {
      console.log(currentTime)
      this.setState({
        currentTime,
      });
    });
  }

  componentWillUnmount() {
    Player.removeCallback('AudioPlayer');
  }

  render() {
    const btnclass = this.state.loading
      ? 'ui loading button'
      : 'ui button';
    const iconclass = this.state.playing
      ? 'pause large icon'
      : 'play large icon';
    return (
      <div className='row audioplayer'>
        <div className='ui grid'>
          <div className='two wide column'>
            <div className='ui small basic icon buttons'>
              <button 
                className={btnclass} 
                onClick={Player.playing() 
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
          <div className='ten wide column'>
            <div className='ui tiny progress' ref='progress'>
              <div className='bar'></div>
            </div>
          </div>
          <div className='three wide column'>
            {Player.current() ? `${this.state.currentTime.minutes}:${this.state.currentTime.seconds}` : '00:00'}
            {Player.current() ? Player.current().get('name') : 'No track'}
          </div>
        </div>
      </div>
    );
  }
}
