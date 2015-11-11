import React from 'react';
import { render } from 'react-dom';
import { Router, Route } from 'react-router';
import Menu from './components/menu.js';
import CalendarApp from './components/day.js';
import createHistory from 'history/lib/createBrowserHistory';
import $ from 'jquery';

$.fn.dropdown = require('semantic-ui-dropdown');
$.fn.transition = require('semantic-ui-transition');

class Feed extends React.Component {
  render() {
    return <div className='ui grid'>
      <Menu />
    </div>;
  }
}

render((
  <Router history={createHistory()}>
    <Route path='/' component={CalendarApp}></Route>
    <Route path='/calendar' component={Feed}></Route>
  </Router>
), document.getElementById('container'));
