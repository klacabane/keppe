import React from 'react';
import $ from 'jquery';
import { Item, ITEM_TYPE } from '../models/item.js';

export default class MusicFinder extends React.Component {
  constructor(props) {
    super();
  }

  componentDidMount() {
    $('.ui.search').search({
      type: 'category',
      minCharacters: 5,
      apiSettings: {
        url: '/api/search/{query}',
      },
      onSelect: result => {
        this.props.onSelect(new Item(result));
        return false;
      },
    });
  }
  
  render() {
    return (
      <div id='musicfinder' className='fixed'>
        <div className='ui form attached fluid segment'>
          <div className='ui large fluid transparent icon input category search'>
            <input className='prompt' placeholder='Music' />
              <i className="search icon"></i>
            <div className='results'></div>
          </div>
        </div>
      </div>
    );
  }
}
