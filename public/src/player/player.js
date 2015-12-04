'use strict';

import { ITEM_TYPE } from '../models/item.js';

SC.initialize({
  client_id: '',
});

class Player {
  constructor() {
    this._queue = [];
    this._current = {
      item: null,
      duration: null,
      progress: null,
    };
    this._loading = false;
    this._volume = 1;
    this._callbacks = {
      state: new Map(),
      time: new Map(),
      volume: new Map(),
    };
    this._player = null;
    this._htmlPlayer = document.createElement('audio');

    this._htmlPlayer.onplay = () => {
      this._playing = true;
      this._execCallbacks('state');
    };
    this._htmlPlayer.onpause = () => {
      this._playing = false;
      this._execCallbacks('state');
    };
    this._htmlPlayer.oncanplay = () => {
      this._playing = true;
      this._loading = false;
      this._current.duration = this._formatSec(this._htmlPlayer.duration);
      this._execCallbacks('state');
    };
    this._htmlPlayer.onwaiting = () => {
      this._playing = false;
      this._loading = true;
      this._execCallbacks('state');
    };
    this._htmlPlayer.ontimeupdate = time => {
      if (this._current) {
        this._current.progress = this._formatSec(this._htmlPlayer.currentTime);
        this._execCallbacks('time');
      }
    };
    this._htmlPlayer.onerror = e => {
      console.log('Player._htmlPlayer error: ');
      switch (e.target.error.code) {
        case e.target.error.MEDIA_ERR_ABORTED:
         console.log('MEDIA_ERR_ABORTED');
         break;
       case e.target.error.MEDIA_ERR_NETWORK:
         console.log('MEDIA_ERR_NETWORK');
         break;
       case e.target.error.MEDIA_ERR_DECODE:
         console.log('MEDIA_ERR_DECODE');
         break;
       case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
         console.log('MEDIA_ERR_SRC_NOT_SUPPORTED');
         break;
       default:
         console.log('An unknown error occurred.');
         break;
      };
      this._loading = false;
      this._player = null;
      this._current = null;
      this._execCallbacks('state');
    };
    this._htmlPlayer.onended = this.forward.bind(this);
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

  _execCallbacks(action) {
    this._callbacks[action].forEach(fn => fn());
  }

  play(item) {
    if (this.playing()) {
      this.pause();
      this._player = null;
    }

    this._playing = false;
    this._loading = true;
    this._current = {
      item,
    };
    this._execCallbacks('state');
    switch (item.type) {
      case ITEM_TYPE.SOUNDCLOUD:
        SC.stream(`/tracks/${item.srcId}`)
          .then(scPlayer => {
            scPlayer.on('play-resume', () => {
              this._playing = true;
              this._execCallbacks('state');
            });
            scPlayer.on('pause', () => {
              this._playing = false;
              this._execCallbacks('state');
            });
            scPlayer.on('play-start', () => {
              this._loading = false;
              this._playing = true;
              scPlayer.seek(0);
            });
            scPlayer.on('time', time => {
              if (this._current) {
                this._current.progress = this._formatMs(scPlayer.currentTime());
                this._execCallbacks('time');
              }
            });
            scPlayer.on('audio_error', err => {
              this._playing = false;
              console.log(err);
            });
            scPlayer.on('finish', () => {
              if (this._queue.length) {
                this.forward();
              } else {
                this._playing = false;
                this._loading = false;
                this._execCallbacks('state');
              }
            });

            this._current.duration = this._formatMs(scPlayer.options.duration);
            this._player = scPlayer;
            this._player.setVolume(this._volume);
            this._player.play();
          })
          .catch(err => {
            console.log('SC.stream error:');
            console.log(err)
          });
        break;

      case ITEM_TYPE.YOUTUBE_MUSIC:
        this._player = this._htmlPlayer;
        this._player.src = item.url;
        this._player.volume = this._volume;
        this._player.play();
        break;
    }
  }

  resume() {
    this._player && this._player.play();
  }

  current() {
    return this._current || {};
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
    return this._playing; 
  }

  loading() {
    return this._loading;
  }

  repeat(val) {
    if (typeof val === 'undefined') return this._repeat;
    this._repeat = !!val;
  }

  stop() {
    this.pause();
    this._loading = false;
    this._current = null;
    this._player = null;
    this._execCallbacks('state');
  }

  volume(val) {
    if (typeof val === 'undefined') return this._volume;
    if (this._player) {
      (this._player === this._htmlPlayer)
        ? this._player.volume = val
        : this._player.setVolume(val);
    }
    this._volume = val;
    this._execCallbacks('volume');
  }

  addCallback(action, key, fn) {
    this._callbacks[action].set(key, fn);
  }

  removeCallbacks(key) {
    this._callbacks.state.delete(key);
    this._callbacks.time.delete(key);
    this._callbacks.volume.delete(key);
  }
}

export default new Player();
