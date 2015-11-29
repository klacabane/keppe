'use strict';

import { ITEM_TYPE } from '../models/event.js';

SC.initialize({
  client_id: '',
});

class Player {
  constructor() {
    this._queue = [];
    this._current = null;
    this._player = null;
    this._callbacks = new Map();
  }

  play(item) {
    if (this.playing()) {
      this.pause();
      this._player = null;
    }

    this._current = item;
    switch (item.type) {
      case ITEM_TYPE.SOUNDCLOUD:
        SC.stream(`/tracks/${item.srcId}`)
          .then(player => {
            player.on('state-change', (state) => {
              this._callbacks
                .forEach(fn => fn(item));
            });
            player.on('finish', this.forward.bind(this));

            const seconds = (player.options.duration/1000)%60;
            const minutes = (player.options.duration/(1000*60))%60;
            console.log(`${Math.floor(minutes)}:${Math.floor(seconds)}`)
            this._player = player;
            this._player.play();
          })
          .catch(err => {
            console.log(`SC.stream error: ${err}`)
          });
          break;
    }
  }

  addCallback(key, fn) {
    this._callbacks.set(key, fn);
  }

  removeCallback(key) {
    this._callbacks.delete(key);
  }

  resume() {
    this._player && this._player.play();
  }

  current() {
    return this._current;
  }

  forward() {
    if (this._queue.length) this.play(this._queue.shift())
  }

  pause() {
    this._player && this._player.pause();
  }

  queue(track) {
    this._queue.push(track);
  }

  remove(pos) {
    this._queue.slice(pos, 1);
  }

  playing() {
    return this._player && this._player.isPlaying();
  }

  loading() {
    return this._player && (this._player.isLoading() || this._player.isBuffering());
  }

  repeat(val) {
    if (typeof val === 'undefined') return this._repeat;
    this._repeat = val;
  }
}

export default new Player();
