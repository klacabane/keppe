import React from 'react';
import Menu from './menu.js';
import AudioPlayer from './audioplayer.js';
import Player from '../player/player.js';

export default class MusicLibrary extends React.Component {
  componentDidMount() {
    Player.addCallback('state', 'MusicLibrary', () => {
      this.setState({
      });
    });
  }

  componentWillUnmount() {
    Player.removeCallbacks('MusicLibrary');
  }

  render() {
    return (
      <div className='ui grid'>
        <Menu />

        <AudioPlayer />
      </div>
    );
  }
}
