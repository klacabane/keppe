import React from 'react';
import $ from 'jquery';
import classNames from 'classnames';
import { Item, ITEM_TYPE } from '../models/item.js';
import SearchStore from '../stores/search.js';

export default class MusicFinder extends React.Component {
  constructor(props) {
    super();

    this.state = {
      index: 0,
      len: 0,
      show: false,
    };
    this.lastTerm = '';
  }

  _handleKeyUp(e) {
    if (e.which === 13) {
      const results = SearchStore.results();
      const flat = [].concat
        .apply([], Object.keys(results).map(category => results[category].results));
      this.props.onSelect(flat[this.state.index]);
      this.setState({
        show: false,
      });
      SearchStore.clear();
      $('#musicfinder-input').val('');
    } else if (e.which === 40) {
      if (this.state.index === this.state.len-1) this.setState({index: 0});
      else this.setState({index: this.state.index+1});
    } else if (e.which === 38) {
      if (this.state.index === 0) this.setState({index: this.state.len-1});
      else this.setState({index: this.state.index-1});
    } else {
      const term = e.target.value.trim();
      if (!term.length || term.length < 3) {
        SearchStore.clear();
        this.setState({show: false});
      } else {
        this.setState({show: true});
      }

      if (term !== this.lastTerm && term.length > 2) {
        this.lastTerm = term;
        SearchStore.search(term);
      }
    }
  }

  _onBlur() {
    this.setState({show: false});
  }

  _onFocus(e) {
    if (e.target.value.length) this.setState({show: true});
  }

  _getResultList() {
    const results = SearchStore.results();
    let index = 0;
    return Object.keys(results)
      .map(key => {
        const category = results[key];
        return <div className='ui list'>
          <div className='item'>
            <div className='middle aligned content'>
              {category.name}
            </div>
          </div>
          {
            category.results.map((item, i) => {
              return <div className={
                classNames('item', {'selected': index++ === this.state.index})
              }>
                <div className='header'>{item.title}</div>
                {item.artist}
              </div>;
            })
          }
        </div>;
      });
  }

  componentDidMount() {
    this.sub = SearchStore.addListener(() => {
      const results = SearchStore.results();
      const keys = Object.keys(results);
      this.setState({
        results,
        index: 0,
        len: keys.length 
          ? keys.reduce((acc, next) => acc + results[next].results.length, 0)
          : 0,
      });
    });
  }

  componentWillUnmount() {
    this.sub.remove();
  }
  
  render() {
    return (
      <div id='musicfinder' className='fixed'>
          <div className='ui form attached fluid segment'>
            <div className={
              classNames('ui left icon large transparent input', {
                'loading': SearchStore.loading(),
              })
            }>
              <i className='search icon'></i>
              <input 
                id='musicfinder-input'
                placeholder='Music'
                onBlur={this._onBlur.bind(this)}
                onKeyUp={this._handleKeyUp.bind(this)}
                onFocus={this._onFocus.bind(this)} />
            </div>
          </div>
          {
            this.state.show ?
              <div className='ui attached yellow message'>
                <div className='content'>
                  {this._getResultList()}
                </div>
              </div>
              : ''
          }
      </div>
    );
  }
}
