import React from 'react';
import { Link } from 'react-router';

export class Menu extends React.Component {
  constructor() {
    super();
  }

  render() {
    return (
      <div className='three wide column'>
        <div className='ui vertical labeled fixed icon menu'>
          <Link to='/' className='item'>
            <i className='feed icon'></i>
          </Link>
          <Link to='/calendar' className='item'>
            <i className='calendar outline icon'></i>
          </Link>
        </div>
      </div>
    );
  }
}
