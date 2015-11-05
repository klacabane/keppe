import Immutable from 'immutable';

export class Event extends Immutable.Record({startDate: new Date(), endDate: new Date(), title: 'Event'}) {
  constructor(values) {
    super(values);
  }
}
