'use strict';

const search = require('../search.js');

exports.setup = (router, db) => {
  router.get('/search/:term', (req, res) => {
    search.youtube(req.params.term)
      .then(items => {
        const ret = {
          results: {
            youtube: {
              name: 'YouTube',
              results: items,
            }
          }
        };

        res.json(ret);
      })
      .catch(err => {
        console.log(err);
        res.status(500).end();
      });
  });
};
