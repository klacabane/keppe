import Immutable from 'immutable';
import Moment from 'moment';

const REPEAT = {
  NEVER: 0,
  DAY: 1,
  WEEK: 2,
  MONTH: 3,
  YEAR: 4
}

export class Event extends Immutable.Record({
  starts: Moment(),
  ends: Moment().add(15, 'minutes'),
  title: 'Event',
  repeat: REPEAT.NEVER
}) {

  constructor(values) {
    super(values);
  }
}
