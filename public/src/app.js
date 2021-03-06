import React from 'react';
import { render } from 'react-dom';
import { Router, Route } from 'react-router';
import $ from 'jquery';
import Feed from './components/feed.js';
import MusicLibrary from './components/musiclibrary.js';
import CalendarApp from './components/day.js';
import createHistory from 'history/lib/createBrowserHistory';

$.fn.dropdown = require('semantic-ui-dropdown');
$.fn.transition = require('semantic-ui-transition');
$.fn.search = require('semantic-ui-search');
$.fn.api = require('semantic-ui-api');
$.fn.checkbox = require('semantic-ui-checkbox');

render((
  <Router history={createHistory()}>
    <Route path='/' component={Feed}></Route>
    <Route path='/music' component={MusicLibrary}></Route>
    <Route path='/calendar' component={CalendarApp}></Route>
  </Router>
), document.getElementById('container'));
