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
          <div className='ui action input'>
            <input placeholder='Title' type="text" />
            <select defaultValue='movie' className="ui compact selection dropdown">
              <option value="music">Music</option>
              <option value="movie">Movie</option>
            </select>
          </div>
        </div>
      </form>
    );
  }
}
