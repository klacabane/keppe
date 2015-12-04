'use strict';

import React from 'react';
import Immutable from 'immutable';
import classNames from 'classnames';
import Menu from './menu.js';
import Player from '../player/player.js';
import MusicFinder from './musicfinder.js';
import { Item, ITEM_TYPE } from '../models/item.js';
import ItemStore from '../stores/item.js';
import { dispatch } from '../dispatcher.js';

export default class Feed extends React.Component {
  constructor() {
    super();
    this.state = {
      items: ItemStore.items(),
      currentTrack: Player.current(),
    };
    // Store subscriptions
    this.subs = [];
  }

  onItemRemove(item) {
    if (this.state.currentTrack.item &&
          this.state.currentTrack.item.srcId === item.srcId) {
      Player.stop();
    }

    ItemStore.removeItem(item);
  }

  onItemDownload(item) {
    ItemStore.download(item.id);
  }

  onCreateItem(item) {
    ItemStore.addItem(item);
  } 

  componentDidMount() {
    Player.addCallback('state', 'Feed', () => {
      this.setState({
        currentTrack: Player.current(),
      });
    });

    const subItem = ItemStore.addListener(() => {
      this.setState({
        items: ItemStore.items(),
      });
    })
    
    this.subs.push(subItem);
  }

  componentWillUnmount() {
    Player.removeCallbacks('Feed');
    this.subs.forEach(sub => sub.remove());
  }

  _rows() {
    const currentTrack = this.state.currentTrack.item;
    return this.state.items.map(item => {
      const isCurrentTrack = currentTrack && currentTrack.srcId === item.srcId;
      return <ItemRow 
        key={item.id} 
        item={item} 
        isCurrentTrack={isCurrentTrack}
        isPlaying={isCurrentTrack && Player.playing()}
        isLoading={isCurrentTrack && Player.loading()}
        isDownloading={ItemStore.isDownloading(item.id)}
        isRemoving={ItemStore.isRemoving(item.id)}
        onRemove={this.onItemRemove.bind(this, item)}
        onDownload={this.onItemDownload.bind(this, item)}
      />
    });
  }

  render() {
    return <div className='ui grid'>
      <Menu />

      <div className='eight wide column'>
        <MusicFinder
          onSelect={this.onCreateItem.bind(this)} />

        <div id='feed-list' className='ui middle aligned very relaxed divided list'>
          {this._rows()}
        </div>
      </div>
    </div>;
  }
}

class ItemRow extends React.Component {
  _toggle() {
    if (this.props.isCurrentTrack) {
      if (this.props.isPlaying)
        Player.pause();
      else
        Player.resume();
    } else {
      Player.play(this.props.item);
    }
  }

  _buttons() {
    const btn = (() => {
      let i = 0;
      return (btnclass, iconclass, click) => <button key={i++} className={btnclass} onClick={click}><i className={iconclass}></i></button>;
    })();

    let ret = [];
    switch (this.props.item.type) {
      case ITEM_TYPE.YOUTUBE_LINK:
        ret = [
          btn('ui button', 'youtube play icon', () => window.open(this.props.item.url)),
        ];
        if (!this.props.item.uploaded) {
          ret.push(
            btn(
              classNames('ui button', {'loading': this.props.isDownloading}),
              'download icon',
              this.props.onDownload));
        }
        break;

      case ITEM_TYPE.SOUNDCLOUD:
      case ITEM_TYPE.YOUTUBE_MUSIC:
        ret = [
          btn(
            classNames('ui button', {
              'loading': this.props.isLoading,
              'disabled': this.props.isRemoving || 
                (this.props.item.type === ITEM_TYPE.YOUTUBE_MUSIC && !this.props.item.uploaded)
            }),
            classNames(this.props.isPlaying ? 'pause' : 'play', 'icon'),
            this._toggle.bind(this)),
          btn(
            classNames('ui button', {'disabled': this.props.isRemoving || this.props.isDownloading}),
            'plus icon',
            Player.queue.bind(Player, this.props.item)),
        ];
        break;

      case ITEM_TYPE.DATPIFF:
        ret = [
          btn('ui button', 'calendar outline icon', () => {}),
        ];
        break;
    }

    const rmbtn = btn(
       classNames('ui button', {
         'loading': this.props.isRemoving, 
         'disabled': this.props.isRemoving || this.props.isDownloading}),
      'remove icon',
      this.props.onRemove);
    return ret.concat(rmbtn);
  }

  render() {
    return <div className='item'>
      <img className='ui mini image' src={this.props.item.src.img} />
      <div className='content item-content'>
        <div className='header'>{this.props.item.title}</div>
        <div className='description'>{this.props.item.artist}</div>
      </div>
      <div className='right floated content item-actions'>
        <div className='ui small icon basic buttons'>
          {this._buttons()}
        </div>
      </div>
    </div>;
  }
}
