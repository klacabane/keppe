import React from 'react';
import $ from 'jquery';

export default class EventForm extends React.Component {
  constructor() {
    super();
  }

  componentDidMount() {
    $('.ui.dropdown').dropdown({
      transition: 'fade'
    });
  }

  render() {
    return (
      <form className='ui form'>
        <div className='field'>
          <div className="ui action input">
            <input placeholder="Search..." type="text" />
            <select className="ui compact selection dropdown">
              <option value="all">All</option>
              <option selected="" value="articles">Articles</option>
              <option value="products">Products</option>
            </select>
          </div>
        </div>
      </form>
    );
  }
}
