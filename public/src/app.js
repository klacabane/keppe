import React from 'react';
import { render } from 'react-dom';
import { Router, Route } from 'react-router';
import $ from 'jquery';
import Feed from './components/feed.js';
import CalendarApp from './components/day.js';
import createHistory from 'history/lib/createBrowserHistory';

$.fn.dropdown = require('semantic-ui-dropdown');
$.fn.transition = require('semantic-ui-transition');

render((
  <Router history={createHistory()}>
    <Route path='/' component={Feed}></Route>
    <Route path='/calendar' component={CalendarApp}></Route>
  </Router>
), document.getElementById('container'));
