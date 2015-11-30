import React from 'react';
import $ from 'jquery';
import { Item, ITEM_TYPE } from '../models/event.js';

export default class MusicFinder extends React.Component {
  constructor(props) {
    super();

    this.state = {
      show: false,
      item: null,
    };
  }

  suggest(e) {
    if (e.which === 13) {
      if (this.state.item.get('url')) {
        $.ajax({
          method: 'POST',
          url: 'api/items',
          contentType: 'application/json',
          data: JSON.stringify(this.state.item.toJSON()),
        }).done(res => {
          console.log(res);
        });
      }
      return;
    }

    if (e.target.value.trim().startsWith('http')) {
      this.setState({
        show: true,
        item: new Item(ITEM_TYPE.YOUTUBE_MUSIC, {url: e.target.value}),
      });
    } 
  }

  onBlur() {
    this.setState({
      show: false,
    });
  }
  
  render() {
    return (
      <div id='musicfinder' className='fixed'>
        <div className='ui form attached fluid segment'>
          <div className='ui large fluid transparent input'>
            <input placeholder='Music' onFocus={this.suggest.bind(this)} onBlur={this.onBlur.bind(this)} onKeyUp={this.suggest.bind(this)} />
          </div>
        </div>
        {
          this.state.show
            ? <div className='ui attached yellow message'>
                <div className='content'>
                  <div className='header'>No Results</div>
                  <div className='description'>
                  </div>
                </div>
              </div>
           : ''
        }
      </div>
    );
  }
}
