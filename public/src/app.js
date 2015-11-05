import React from 'react';
import { render } from 'react-dom';
import { Router, Route } from 'react-router';
import { Menu } from './components/menu.js';
import { Day } from './components/day.js';
import createHistory from 'history/lib/createBrowserHistory';

class Calendar extends React.Component {
  render() {
   return <div className='ui grid'>
      <Menu />
      <Day />
    </div>;
  }
}

class Feed extends React.Component {
  render() {
   return <div className='ui grid'>
      <Menu />
      <Day />
    </div>;
  }
}

render((
  <Router history={createHistory()}>
    <Route path='/' component={Feed}></Route>
    <Route path='/calendar' component={Calendar}></Route>
  </Router>
), document.getElementById('container'));
