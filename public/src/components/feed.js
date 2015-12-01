'use strict';

import React from 'react';
import $ from 'jquery';
import AudioPlayer from './audioplayer.js';
import Menu from './menu.js';
import Player from '../player/player.js';
import MusicFinder from './musicfinder.js';
import { Item, ITEM_TYPE } from '../models/event.js';

export default class Feed extends React.Component {
  constructor() {
    super();
    this.state = {
      items: [],
      selected: null,
    };
  }

  onItemFocus(item) {
    this.setState({
      selected: item,
    });
  }

  componentDidMount() {
    $.ajax({
      method: 'GET',
      url: 'api/items',
    }).done(res => {
      this.setState({
        items: res.map(item => new Item(item)),
      });

      Player.addCallback('state', 'Feed', this.onItemFocus.bind(this));
    });
  }

  componentWillUnmount() {
    Player.removeCallbacks('Feed');
  }

  render() {
    return <div className='ui grid'>
      <Menu />

      <div className='eight wide column'>
        <MusicFinder />

        <div id='feed-list' className='ui middle aligned very relaxed divided list'>
          {
            this.state.items.map((item, i) => {
              return <ItemRow 
                key={i} 
                item={item} 
                selected={Player.current().item && Player.current().item.get('srcId') === item.get('srcId')} />
            })
          }
        </div>
      </div>

      <AudioPlayer />
    </div>;
  }
}

class ItemRow extends React.Component {
  _toggle() {
    if (this.props.item.type === ITEM_TYPE.YOUTUBE_LINK) {
      window.open(this.props.item.url);
    } else {
      if (this.props.selected) {
        if (Player.playing())
          Player.pause();
        else
          Player.resume();
      } else {
        Player.play(this.props.item);
      }
    }
  }

  render() {
    const btnclass = this.props.selected && Player.loading() 
      ? 'ui loading button'
      : 'ui button';
    const iconclass = this.props.selected && Player.playing()
      ? 'pause icon'
      : 'play icon';
    return <div className='item'>
      <img className='ui mini image' src={this.props.item.src.img} />
      <div className='content item-content'>
        <div className='header'>{this.props.item.title}</div>
        <div className='description'>{this.props.item.artist}</div>
      </div>
      <div className='right floated content item-actions'>
        <div className='ui small icon buttons'>
          <button className={btnclass} onClick={this._toggle.bind(this)}><i className={iconclass}></i></button>
          <button className='ui button' onClick={() => Player.queue(this.props.item)}><i className='plus icon'></i></button>
          {/*<button className='ui button'><i className='remove icon'></i></button>*/}
        </div>
      </div>
    </div>;
  }
}
