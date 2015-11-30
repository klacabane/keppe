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
    this._loading = false;
    this._callbacks = {
      state: new Map(),
      time: new Map(),
    };
  }

  _formatMs(ms) {
    return {
      seconds: Math.floor((ms/1000)%60),
      minutes: Math.floor((ms/(1000*60))%60),
    };
  } 

  _formatSec(s) {
    return {
      seconds: Math.floor(s%60),
      minutes: Math.floor(s/60),
    };
  }

  play(item) {
    if (this.playing()) {
      this.pause();
      this._player = null;
    }

    this._loading = true;
    this._current = item;
    switch (item.type) {
      case ITEM_TYPE.SOUNDCLOUD:
        SC.stream(`/tracks/${item.srcId}`)
          .then(player => {
            player.on('state-change', (state) => {
              this._loading = player.isLoading() || player.isBuffering();
              this._callbacks.state.forEach(fn => fn(item));
            });
            player.on('play-start', () => {
              player.seek(0);
            });
            player.on('time', time => {
              const currentTime = this._formatMs(player.currentTime());
              this._callbacks.time.forEach(fn => fn(currentTime))
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

      case ITEM_TYPE.YOUTUBE_MUSIC:
        this._player = document.createElement('audio');
        this._player.src = item.url;
        this._player.play();
        this._player.onplay = this._player.onpause = () => {
          this._loading = false;
          this._callbacks.state.forEach(fn => fn(item));
        };
        this._player.onwaiting = () => {
          this._loading = true;
          this._callbacks.state.forEach(fn => fn(item));
        };
        this._player.ontimeupdate = time => {
          const currentTime = this._formatSec(this._player.currentTime);
          this._callbacks.time.forEach(fn => fn(currentTime));
        };
        break;
    }
  }

  addCallback(action, key, fn) {
    this._callbacks[action].set(key, fn);
  }

  removeCallback(action, key) {
    this._callbacks[action].delete(key);
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
    return this._player && (
      (this._player.isPlaying && this._player.isPlaying()) || 
        (typeof this._player.paused === 'boolean' && !this._player.paused)
    );
  }

  loading() {
    return this._loading;
  }

  repeat(val) {
    if (typeof val === 'undefined') return this._repeat;
    this._repeat = val;
  }
}

export default new Player();
