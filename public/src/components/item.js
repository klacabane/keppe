class Item extends React.Component {
  constructor() {
    super();
  }

  render() {
    return (
      <div className='ui card movie'>
        <div className='image'>
          <img src='' />
        </div>
        <div className='content'>
          <div className='header'>{this.props.item.title}</div>
        </div>
        <div className="extra content">
          <a className="right floated">
            <i className="comment icon"></i>
            3 comments
          </a>
        </div>
      </div>
    );
  }
}

class YoutubeItem extends React.Component {
  constructor() {
    super();
  }

  attachPlayer() {
    this.setState({
      player: new YT.Player(this.refs.player.id, {
          videoId: 'mmWOCDbSv9c',
          width: 250,
          height: 150
        })
    });
  }

  componentWillReceiveProps(nextProps) {
    nextProps.ready && !this.props.ready && this.attachPlayer()
  }

  render() {
    return (
      <div className='ui card youtube'>
        <div id={this.props.item.id} ref="player"></div>
        <div className="extra content">
          <a className="right floated">
            <i className="comment icon"></i>
          </a>
        </div>
      </div>
    );
  }
}
