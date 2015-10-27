import React from 'react';
import ReactDOM from 'react-dom';
import { Menu } from './components/menu.js';
import { Day } from './components/day.js';

ReactDOM.render(<div className='ui grid'>
  <Menu />
  <Day />
</div>, document.getElementById('container'));
