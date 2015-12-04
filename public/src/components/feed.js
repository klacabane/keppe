'use strict';

import React from 'react';
import $ from 'jquery';
import Immutable from 'immutable';
import classNames from 'classnames';
import Menu from './menu.js';
import Player from '../player/player.js';
import MusicFinder from './musicfinder.js';
import { Item, ITEM_TYPE } from '../models/event.js';

export default class Feed extends React.Component {
  constructor() {
    super();
    this.state = {
      items: [],
      removingItems: new Immutable.Set(),
      downloadingItems: new Immutable.Set(),
    };

    this._getItems();
  }

  _getItems(done) {
    $.ajax({
      method: 'GET',
      url: 'api/items',
    }).done(res => {
      this.setState({
        items: res.map(item => new Item(item)),
      });
      done && done();
    });
  }

  _downloadReq(item) {
    this.setState({
      downloadingItems: this.state.downloadingItems.add(item.id),
    });

    const checkIfDone = res => {
      console.log(res);
      if (res.err) {
        this.setState({
          downloadingItems: this.state.downloadingItems.delete(item.id),
        });
        // stop
        return;
      }

      if (res.state !== 'done') {
        setTimeout(this._downloadReq.bind(this, item), 1000);
      } else {
        // refresh the items to render the updated item
        this._getItems(() => {
          this.setState({
            downloadingItems: this.state.downloadingItems.delete(item.id),
          });
        });
      }
    };

    $.ajax({
      method: 'GET',
      url: `api/items/${item.id}/download`,
    }).done(checkIfDone);
  }

  onItemRemove(item) {
    this.setState({
      removingItems: this.state.removingItems.add(item.id),
    });
    // wait until the items state is set to remove the item
    // from the Set
    const refresh = this._getItems.bind(this, () => {
      this.setState({
        removingItems: this.state.removingItems.delete(item.id),
      });
    });

    $.ajax({
      method: 'DELETE',
      url: `api/items/${item.id}`,
    }).done(refresh);
  }

  onItemDownload(item) {
    this._downloadReq(item);
  }

  onCreateItem(item) {
    const download = res => this._getItems(this._downloadReq.bind(this, new Item(res)));
    $.ajax({
      method: 'POST',
      url: 'api/items',
      contenType: 'application/json',
      data: item.toJSON(),
    }).done(download);
  } 

  componentDidMount() {
    Player.addCallback('state', 'Feed', () => {
      this.setState({});
    });
  }

  componentWillUnmount() {
    Player.removeCallbacks('Feed');
  }

  _rows() {
    const currentTrack = Player.current().item;
    return this.state.items.map((item, i) => {
      const isCurrentTrack = currentTrack && currentTrack.srcId === item.srcId;
      return <ItemRow 
        key={i} 
        item={item} 
        isCurrentTrack={isCurrentTrack}
        isPlaying={isCurrentTrack && Player.playing()}
        isLoading={isCurrentTrack && Player.loading()}
        isDownloading={this.state.downloadingItems.has(item.id)}
        isRemoving={this.state.removingItems.has(item.id)}
        onRemove={this.onItemRemove.bind(this)}
        onDownload={this.onItemDownload.bind(this)}
      />
    });
  }

  render() {
    return <div className='ui grid'>
      <Menu />

      <div className='eight wide column'>
        <MusicFinder
          onCreateItem={this.onCreateItem.bind(this)} />

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
      if (Player.playing())
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
              this.props.onDownload.bind(null, this.props.item)));
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
      this.props.onRemove.bind(null, this.props.item));
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
