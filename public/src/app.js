import React from 'react';
import { render } from 'react-dom';
import { Router, Route } from 'react-router';
import { Menu } from './components/menu.js';
import { Day } from './components/day.js';
import createHistory from 'history/lib/createBrowserHistory';

class App extends React.Component {
  render() {
   return <div className='ui grid'>
      <Menu />
      <Day />
    </div>;
  }
}

render((
  <Router history={createHistory()}>
    <Route path='/' component={App}></Route>
  </Router>
), document.getElementById('container'));
