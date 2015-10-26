class ItemPanel extends React.Component {
  constructor() {
    super();

    this.state = {
      items: [],
      ready: false
    };

    document.addEventListener('ytAPIReady', () => {
      this.setState({
        ready: true
      });
    });

    $.ajax({
      type: 'GET',
      url: 'api/items'
    }).done((res) => {
      this.setState({
        items: res
      });
    });
  }

  render() {
    return (
      <div id='item-container' className='thirteen wide column'>
        <div className='ui five cards'>
          {
            this.state.items.map((item) => {
              if (item.type === 'Movie')
                return <Item key={item.id} item={item} />
              else if (item.type === 'Music')
                return <YoutubeItem key={item.id} ready={this.state.ready} item={item} />
            })
          }
        </div>
      </div>
    );
  }
}

ReactDOM.render(<div className='ui grid'>
  <Menu />
  <Day />
</div>, document.getElementById('container'));
