import React from 'react';
import $ from 'jquery';
import Menu from './menu.js';
import AudioPlayer from './audioplayer.js';
import Player from '../player/player.js';
import ItemStore from '../stores/item.js';

export default class MusicLibrary extends React.Component {
  constructor() {
    super();
    this.state = {
      mixtapes: ItemStore.mixtapes(),
      mixtape: null,
    };
    ItemStore.getMixtapes();
  }

  componentDidMount() {
    Player.addCallback('state', 'MusicLibrary', () => {
      this.forceUpdate();
    });

    this.sub = ItemStore.addListener(() => {
      this.setState({
        mixtapes: ItemStore.mixtapes(),
      });
    });
  }

  componentWillUnmount() {
    Player.removeCallbacks('MusicLibrary');
    this.sub.remove();
  }

  _setMixtape(item) {
    if (!this.state.mixtape) {
      this.setState({
        mixtape: item,
      });
    } else {
      this.setState({
        mixtape: item === this.state.mixtape ? null : item,
      });
    }
  }

  _rows() {
    const mixtapes = [];
    let lastRow = [];
    this.state.mixtapes.forEach((mixtape, i) => {
      mixtapes.push(
        <div key={i} className='column'>
          <div className='mixtape item' onClick={this._setMixtape.bind(this, mixtape)}>
            <div className='image'>
              <img src={mixtape.img} />
            </div>
            <div className='content'>{mixtape.title}</div>
            <div className='extra'>{mixtape.artist}</div>
          </div>
        </div>
      );
      lastRow.push(mixtape);
      if ((i % 4 === 0 && i > 0) || i === this.state.mixtapes.length-1) {
        if (this.state.mixtape && lastRow.find(item => item.id === this.state.mixtape.id)) {
          mixtapes.push(
            <MixtapeDetails mixtape={this.state.mixtape} />
          );
        }
        lastRow = [];
      }
    });
    return mixtapes;
  }

  render() {
    return (
      <div className='ui grid'>
        <Menu />

        <div className='twelve wide column'>
          <div id='mixtapes-list' className='ui five column grid'>
            {this._rows()}
          </div>
        </div>

        <AudioPlayer />
      </div>
    );
  }
}

class MixtapeDetails extends React.Component {
  constructor() {
    super();
  }

  _track(item) {
    return ( 
      <div className='column'>
        <div className='mixtape-track' onClick={() => Player.play(item)}>
          <div className='ui grid'>
            <div className='two wide right aligned column'>
              {Player.current().item && Player.current().item.srcId === item.srcId ? <i className='volume down icon'></i> : item.number}
            </div>
            <div className='fourteen wide column title'>
              {item.title}
            </div>
          </div>
        </div>
      </div>
    );
  }

  _trackList() {
    const len = this.props.mixtape.tracks.length;
    const tracks = this.props.mixtape.tracks;
    const maxIndex = Math.round(len / 2);
    const rows = [];
    for (let i = 0; i < maxIndex; i++) {
      rows.push(this._track(tracks[i]));
      if (i+maxIndex < len) rows.push(this._track(tracks[i+maxIndex]));
    }
    return rows;
  }

  render() {
    return (
      <div className="five column row">
        <div className='ui twelve wide column'>
          <div id='mixtape-track-list' className='ui two column grid'>
            {this._trackList()}
          </div>
        </div>
        <div className='ui four wide column'>
          <img src={this.props.mixtape.img} />
          {this.props.mixtape.title}
          {this.props.mixtape.artist}
        </div>
      </div>
    );
  }
}
